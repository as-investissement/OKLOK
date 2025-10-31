/*
  # Add draft status support to timesheet entries

  1. Database Changes
    - Update timesheet_entries status constraint to include 'draft'
    - Update timesheets status constraint to include 'draft' 
    - Update timesheet_days status constraint to include 'DRAFT'

  2. Security
    - No changes to existing RLS policies
    - All existing permissions remain the same

  3. Notes
    - This allows entries to be saved as drafts before submission
    - Maintains backward compatibility with existing statuses
*/

-- Update timesheet_entries status constraint to include 'draft'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'timesheet_entries_status_check' 
    AND table_name = 'timesheet_entries'
  ) THEN
    ALTER TABLE timesheet_entries DROP CONSTRAINT timesheet_entries_status_check;
  END IF;
  
  -- Add new constraint with 'draft' status
  ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_status_check 
    CHECK (status = ANY (ARRAY['draft'::text, 'pending'::text, 'approved'::text, 'rejected'::text]));
END $$;

-- Update timesheets status constraint to include 'draft'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'timesheets_status_check' 
    AND table_name = 'timesheets'
  ) THEN
    ALTER TABLE timesheets DROP CONSTRAINT timesheets_status_check;
  END IF;
  
  -- Add new constraint with 'draft' status
  ALTER TABLE timesheets ADD CONSTRAINT timesheets_status_check 
    CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text]));
END $$;

-- Update timesheet_days status constraint to include 'DRAFT'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'timesheet_days_status_check' 
    AND table_name = 'timesheet_days'
  ) THEN
    ALTER TABLE timesheet_days DROP CONSTRAINT timesheet_days_status_check;
  END IF;
  
  -- Add new constraint with 'DRAFT' status
  ALTER TABLE timesheet_days ADD CONSTRAINT timesheet_days_status_check 
    CHECK (status = ANY (ARRAY['DRAFT'::text, 'PENDING'::text, 'APPROVED'::text, 'REJECTED'::text]));
END $$;