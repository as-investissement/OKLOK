/*
  # Fix RLS policy for user_invitations table

  1. Security Changes
    - Drop existing INSERT policy that may be too restrictive
    - Create new INSERT policy allowing admins to create invitations
    - Policy checks if user is admin in the users table

  2. Policy Details
    - Target: authenticated users
    - Action: INSERT
    - Condition: User must be admin role
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can insert their own invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "authenticated_users_can_insert_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can insert invitations they send" ON public.user_invitations;

-- Create new INSERT policy for admins
CREATE POLICY "Admins can insert invitations"
  ON public.user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.users 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );