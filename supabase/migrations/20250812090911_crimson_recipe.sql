/*
  # Fix RLS policy for user_invitations INSERT operations

  1. Security Changes
    - Drop existing problematic INSERT policy for user_invitations
    - Create new INSERT policy that properly allows admins to create invitations
    - Ensure policy checks both user role and company association

  This fixes the "new row violates row-level security policy" error when admins try to invite employees.
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;

-- Create a new INSERT policy that properly allows admins to create invitations
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