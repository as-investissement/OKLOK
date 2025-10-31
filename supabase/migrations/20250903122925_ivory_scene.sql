/*
  # Add birth_date column to users table

  1. Schema Changes
    - Add `birth_date` column to `users` table
    - Column type: date (nullable)
    - Default value: null

  2. Data Migration
    - Copy existing birth_date data from employees table to users table where applicable

  3. Security
    - No RLS changes needed (existing policies will apply)

  This migration ensures that birth dates are stored in the users table for proper access
  in the employee management interface.
*/

-- Add birth_date column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'birth_date'
  ) THEN
    ALTER TABLE users ADD COLUMN birth_date date;
    COMMENT ON COLUMN users.birth_date IS 'Date de naissance de l''utilisateur';
  END IF;
END $$;

-- Migrate existing birth_date data from employees table to users table
UPDATE users 
SET birth_date = employees.birth_date
FROM employees 
WHERE users.id = employees.user_id 
  AND employees.birth_date IS NOT NULL 
  AND users.birth_date IS NULL;

-- Add index for birth_date queries (optional, for performance)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'users' AND indexname = 'idx_users_birth_date'
  ) THEN
    CREATE INDEX idx_users_birth_date ON users(birth_date);
  END IF;
END $$;