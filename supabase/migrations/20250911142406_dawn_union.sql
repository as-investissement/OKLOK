/*
  # Fix RLS policies for password reset functionality

  1. Security Updates
    - Add policy to allow public read access for password reset tokens
    - Allow public insert for password reset requests
    - Ensure reset-password Edge Function can work without authentication

  2. Changes
    - Add policy for public access to user_invitations for password reset
    - Maintain security by only allowing specific operations
*/

-- Allow public read access for password reset validation
CREATE POLICY "Allow public read for password reset validation"
  ON user_invitations
  FOR SELECT
  TO public
  USING (
    employee_data->>'type' = 'password_reset' AND
    status = 'pending' AND
    expires_at > now()
  );

-- Allow public insert for password reset requests
CREATE POLICY "Allow public insert for password reset"
  ON user_invitations
  FOR INSERT
  TO public
  WITH CHECK (
    employee_data->>'type' = 'password_reset' AND
    status = 'pending'
  );

-- Allow public update for password reset completion
CREATE POLICY "Allow public update for password reset completion"
  ON user_invitations
  FOR UPDATE
  TO public
  USING (
    employee_data->>'type' = 'password_reset' AND
    status = 'pending'
  )
  WITH CHECK (
    status IN ('accepted', 'expired')
  );