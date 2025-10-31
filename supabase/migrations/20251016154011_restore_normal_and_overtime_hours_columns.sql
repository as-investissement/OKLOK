/*
  # Restore normal_hours and overtime_hours columns to timesheets table

  1. Changes
    - Add `normal_hours` column back to `timesheets` table
    - Add `overtime_hours` column back to `timesheets` table
    
  2. Notes
    - These columns will be restored with default value of 0
    - Data will need to be recalculated from timesheet_entries if needed
*/

-- Restore columns to timesheets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'timesheets' 
    AND column_name = 'normal_hours'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN normal_hours numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'timesheets' 
    AND column_name = 'overtime_hours'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN overtime_hours numeric DEFAULT 0;
  END IF;
END $$;

-- Update values from existing data if normal_hours_total and overtime_hours_total exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'timesheets' 
    AND column_name = 'normal_hours_total'
  ) THEN
    UPDATE timesheets SET normal_hours = normal_hours_total WHERE normal_hours_total IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'timesheets' 
    AND column_name = 'overtime_hours_total'
  ) THEN
    UPDATE timesheets SET overtime_hours = overtime_hours_total WHERE overtime_hours_total IS NOT NULL;
  END IF;
END $$;
