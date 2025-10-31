/*
  # Fix RLS policy for user_invitations INSERT operations

  1. Security Changes
    - Drop existing problematic INSERT policy
    - Create new INSERT policy allowing admins to create invitations
    - Ensure only authenticated admin users can insert invitations
    - Verify admin belongs to same company as invitation

  2. Policy Details
    - Uses auth.uid() to get current authenticated user
    - Checks user role is 'admin' in users table
    - Validates company_id matches admin's company
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Allow authenticated users to create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

-- Create new INSERT policy for admins only
CREATE POLICY "Admins can insert invitations" ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = user_invitations.company_id
    )
  );

-- Ensure RLS is enabled
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;