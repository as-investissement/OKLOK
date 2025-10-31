/*
  # Fix employees table constraints for activation

  1. Constraints
    - Add unique constraint on user_id column for ON CONFLICT operations
    - Set default value for hire_date to prevent null constraint violations
  
  2. Security
    - Ensure proper constraints exist for upsert operations
*/

-- Add unique constraint on user_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'employees_user_id_unique' 
    AND table_name = 'employees'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- Set default value for hire_date column to prevent null violations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'hire_date'
    AND is_nullable = 'NO'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE employees ALTER COLUMN hire_date SET DEFAULT CURRENT_DATE;
  END IF;
END $$;