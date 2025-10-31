/*
  # Fix user insert policy for authenticated users

  1. Security Changes
    - Add INSERT policy for authenticated users to create their own user record
    - Allow users to insert their own data when auth.uid() matches the user id
  
  2. Notes
    - This fixes the RLS violation when creating user records after Supabase auth
    - Users can only insert records with their own authentication ID
*/

-- Add INSERT policy for authenticated users to create their own user record
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);