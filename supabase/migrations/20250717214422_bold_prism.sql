/*
  # Fix RLS policies for timesheets table

  1. Security Changes
    - Drop existing restrictive policies
    - Add comprehensive policies for authenticated users
    - Allow users to insert their own timesheets
    - Allow users to update their own draft timesheets
    - Allow admins to view all company timesheets

  2. Policy Details
    - INSERT: Users can insert timesheets for themselves
    - UPDATE: Users can update their own draft timesheets, admins can update any
    - SELECT: Users can view their own timesheets, admins can view company timesheets
*/

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can update their own draft timesheets" ON timesheets;
DROP POLICY IF EXISTS "Authenticated users can insert timesheets" ON timesheets;

-- Create comprehensive RLS policies for timesheets
CREATE POLICY "Users can insert their own timesheets"
  ON timesheets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft timesheets"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id AND status = 'draft'
  )
  WITH CHECK (
    auth.uid() = user_id AND status = 'draft'
  );

CREATE POLICY "Admins can update any company timesheets"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  );

CREATE POLICY "Users can view their own timesheets"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view company timesheets"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  );