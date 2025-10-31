/*
  # Fix user invitations INSERT policy

  1. Security Changes
    - Drop existing problematic INSERT policy for user_invitations
    - Create new INSERT policy that properly checks for admin role
    - Ensure admins can create invitations for their company

  The issue is that the current policy is not properly allowing admin users to insert invitations.
*/

-- Drop the existing problematic INSERT policy
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

-- Create a new INSERT policy that properly checks for admin role
CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = company_id
    )
  );