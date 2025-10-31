/*
  # Fix RLS policies for user_invitations table

  1. Security Updates
    - Add policy to allow anonymous users to read invitations by token for activation
    - Keep existing admin policies
    - Allow public access for activation process only

  2. Changes
    - Add public read policy for activation process
    - Ensure token-based lookup works for anonymous users
*/

-- Drop existing restrictive policies that block activation
DROP POLICY IF EXISTS "invites_select_admin_only" ON user_invitations;
DROP POLICY IF EXISTS "invites_insert_admin_only" ON user_invitations;
DROP POLICY IF EXISTS "invites_update_admin_only" ON user_invitations;
DROP POLICY IF EXISTS "invites_delete_admin_only" ON user_invitations;

-- Create new policies that allow activation process
CREATE POLICY "Allow public read for activation by token"
  ON user_invitations
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow admin full access"
  ON user_invitations
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Ensure RLS is enabled
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;