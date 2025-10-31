/*
  # Remove duplicate hours columns from timesheets table

  1. Changes
    - Drop `normal_hours` column from `timesheets` table
    - Drop `overtime_hours` column from `timesheets` table
    
  2. Notes
    - These columns are duplicates of `normal_hours_total` and `overtime_hours_total`
    - Data has been verified to be consistent between old and new columns
    - The `timesheet_entries` table still retains its `normal_hours` and `overtime_hours` columns
    - All frontend code references to these columns are for `timesheet_entries`, not `timesheets`
*/

-- Remove duplicate columns from timesheets table
ALTER TABLE timesheets 
  DROP COLUMN IF EXISTS normal_hours,
  DROP COLUMN IF EXISTS overtime_hours;
