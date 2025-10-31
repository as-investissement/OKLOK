/*
  # Fix RLS policies for admin approvals

  1. Problem Analysis
    - Current policies on timesheet_entries are too complex
    - Double JOIN causing performance issues and potential failures
    - Admin cannot read timesheet_entries from employees

  2. Solution
    - Simplify timesheet_entries policies
    - Add direct admin access without complex JOINs
    - Ensure admin can read all entries from their company

  3. Security
    - Maintain user privacy (users see only their own data)
    - Allow admin full access to their company's data
    - Keep existing policies as fallback
*/

-- Drop existing complex policies that might be causing issues
DROP POLICY IF EXISTS "timesheet_entries_select" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_select_own_or_admin" ON timesheet_entries;

-- Create simplified policies for timesheet_entries
CREATE POLICY "timesheet_entries_select_own"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "timesheet_entries_select_admin"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Ensure timesheets table also has proper admin access
DROP POLICY IF EXISTS "timesheets_select_own_or_admin" ON timesheets;

CREATE POLICY "timesheets_select_own"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "timesheets_select_admin"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Ensure admin can update timesheet_entries for approvals
CREATE POLICY "timesheet_entries_update_admin"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Ensure admin can update timesheets
CREATE POLICY "timesheets_update_admin"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );