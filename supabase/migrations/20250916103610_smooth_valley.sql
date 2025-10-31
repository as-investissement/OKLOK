/*
  # Fix auth_id column in employees table

  1. Problem
    - Migration trying to add auth_id column that already exists
    - Causing "column already exists" error

  2. Solution
    - Check if column exists before adding it
    - Use conditional logic to avoid duplicate column creation

  3. Safety
    - Use IF NOT EXISTS logic
    - No data loss risk
*/

-- Check if auth_id column exists in employees table, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' 
    AND column_name = 'auth_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_id uuid;
    
    -- Add index for auth_id if column was created
    CREATE INDEX IF NOT EXISTS idx_employees_auth_id ON employees(auth_id);
    
    -- Add comment
    COMMENT ON COLUMN employees.auth_id IS 'ID du compte d''authentification Supabase Auth (même valeur que users.auth_id)';
  END IF;
END $$;

-- Ensure the index exists regardless
CREATE INDEX IF NOT EXISTS idx_employees_auth_id ON employees(auth_id);

-- Ensure the comment exists
COMMENT ON COLUMN employees.auth_id IS 'ID du compte d''authentification Supabase Auth (même valeur que users.auth_id)';