/*
  # Fix user_invitations RLS policies

  1. Security Changes
    - Drop all existing policies for user_invitations table
    - Create new simplified policies that allow proper access
    - Allow authenticated users to insert invitations
    - Allow users to view invitations they sent or received
    - Allow users to update/delete their own invitations

  2. Policy Details
    - INSERT: Any authenticated user can create invitations
    - SELECT: Users can see invitations they sent or received
    - UPDATE: Users can update invitations they created
    - DELETE: Users can delete invitations they created
*/

-- Drop all existing policies for user_invitations
DROP POLICY IF EXISTS "Authenticated users can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON user_invitations;

-- Create new simplified policies
CREATE POLICY "Allow authenticated users to insert invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow users to view relevant invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid() OR 
    email = auth.email()
  );

CREATE POLICY "Allow users to update their invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "Allow users to delete their invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (invited_by = auth.uid());