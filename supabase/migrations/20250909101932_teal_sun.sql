/*
  # Fix RLS policies on timesheets table for trigger operations

  1. Problem
    - Trigger `calculate_week_status_from_days` tries to update `timesheets` table
    - Current RLS policies block this operation
    - Error: "new row violates row-level security policy for table timesheets"

  2. Solution
    - Add policy to allow users to update their own timesheets
    - Ensure triggers can execute properly
    - Maintain security while allowing necessary operations

  3. Security
    - Users can only update their own timesheets
    - Admins can update any timesheet in their company
    - Triggers can execute without RLS conflicts
*/

-- Drop existing conflicting policies on timesheets
DROP POLICY IF EXISTS "Users can insert their own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can update their own draft timesheets" ON timesheets;
DROP POLICY IF EXISTS "Users can view their own timesheets" ON timesheets;
DROP POLICY IF EXISTS "Admins can update any company timesheets" ON timesheets;
DROP POLICY IF EXISTS "Admins can view company timesheets" ON timesheets;

-- Create comprehensive policies for timesheets table
CREATE POLICY "timesheets_insert_own"
  ON timesheets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "timesheets_select_own_or_admin"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  );

CREATE POLICY "timesheets_update_own_or_admin"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  );

CREATE POLICY "timesheets_delete_admin_only"
  ON timesheets
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin' 
      AND users.company_id = timesheets.company_id
    )
  );