/*
  # Fix user_invitations RLS policies

  1. Security Updates
    - Remove conflicting RLS policies on user_invitations table
    - Add simplified policy for authenticated users to insert invitations
    - Add policy for users to view their own invitations

  2. Changes
    - Drop existing conflicting policies
    - Create new simplified policies that work correctly
*/

-- Drop all existing policies on user_invitations to start fresh
DROP POLICY IF EXISTS "Admins can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Allow admin to create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Allow global admin to create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Test insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can view invitations" ON user_invitations;

-- Create simplified policies that work
CREATE POLICY "Authenticated users can insert invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their own invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid() OR email = auth.email());

CREATE POLICY "Users can update their own invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Users can delete their own invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (invited_by = auth.uid());