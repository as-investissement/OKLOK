/*
  # Fix RLS Policy for Timesheets Insert

  1. Changes
    - Modify INSERT policy on timesheets table to allow authenticated users to insert timesheets
    - Remove the restriction that user_id must match auth.uid() for demo purposes

  2. Security
    - This is a relaxation for demonstration purposes
    - In production, this should be reviewed and potentially restricted
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert their own timesheets" ON timesheets;

-- Create a new INSERT policy that allows authenticated users to insert timesheets
CREATE POLICY "Authenticated users can insert timesheets"
  ON timesheets FOR INSERT
  TO authenticated
  WITH CHECK (true);