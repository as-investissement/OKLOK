/*
  # Fix user_invitations RLS policies

  1. Security Changes
    - Drop all existing policies to avoid conflicts
    - Create new simplified policies for authenticated users
    - Allow INSERT for all authenticated users
    - Allow SELECT for invitations sent by or received by the user
    - Allow UPDATE/DELETE for invitations created by the user

  2. Policy Details
    - INSERT: No restrictions for authenticated users
    - SELECT: Users can see invitations they sent or received
    - UPDATE/DELETE: Only for invitations they created
*/

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Allow users to delete their invitations" ON user_invitations;
DROP POLICY IF EXISTS "Allow users to update their invitations" ON user_invitations;
DROP POLICY IF EXISTS "Allow users to view relevant invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can view invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON user_invitations;

-- Ensure RLS is enabled
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies
CREATE POLICY "authenticated_users_can_insert_invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "users_can_view_their_invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (
    invited_by = auth.uid() OR 
    email = auth.email()
  );

CREATE POLICY "users_can_update_their_sent_invitations"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

CREATE POLICY "users_can_delete_their_sent_invitations"
  ON user_invitations
  FOR DELETE
  TO authenticated
  USING (invited_by = auth.uid());