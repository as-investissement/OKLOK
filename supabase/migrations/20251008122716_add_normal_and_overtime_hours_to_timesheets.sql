/*
  # Add normal and overtime hours columns to timesheets table

  1. Changes
    - Add `normal_hours_total` column (numeric, default 0) to timesheets table
    - Add `overtime_hours_total` column (numeric, default 0) to timesheets table
  
  2. Notes
    - Uses IF NOT EXISTS to prevent errors if columns already exist
    - Default values set to 0 for both columns
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'timesheets' 
    AND column_name = 'normal_hours_total'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN normal_hours_total numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'timesheets' 
    AND column_name = 'overtime_hours_total'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN overtime_hours_total numeric DEFAULT 0;
  END IF;
END $$;