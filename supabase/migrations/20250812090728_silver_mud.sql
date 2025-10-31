/*
  # Fix user_invitations INSERT policy

  1. Security Changes
    - Drop existing problematic INSERT policy for user_invitations
    - Create new INSERT policy that allows admins to create invitations
    - Ensure proper company_id matching for security

  The policy allows authenticated users with admin role to insert invitations
  for their own company only.
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

-- Create new INSERT policy for admins
CREATE POLICY "Admins can create invitations"
  ON user_invitations
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