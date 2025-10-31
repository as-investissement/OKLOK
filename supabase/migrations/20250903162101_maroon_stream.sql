/*
  # Ensure hire_date synchronization between users and employees tables

  1. Verification
    - Check if hire_date column exists in both tables
    - Ensure proper data types and constraints

  2. Synchronization Function
    - Update the sync function to handle hire_date properly
    - Ensure all user data flows to employees table

  3. Data Integrity
    - Sync existing data with hire_date values
    - Handle null values appropriately
*/

-- Ensure hire_date column exists in users table (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'hire_date'
  ) THEN
    ALTER TABLE users ADD COLUMN hire_date date;
    COMMENT ON COLUMN users.hire_date IS 'Date d''embauche de l''utilisateur';
    CREATE INDEX IF NOT EXISTS idx_users_hire_date ON users(hire_date);
  END IF;
END $$;

-- Ensure hire_date column exists in employees table (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'hire_date'
  ) THEN
    ALTER TABLE employees ADD COLUMN hire_date date NOT NULL DEFAULT CURRENT_DATE;
    COMMENT ON COLUMN employees.hire_date IS 'Date d''embauche de l''employé';
    CREATE INDEX IF NOT EXISTS idx_employees_hire_date ON employees(hire_date);
  END IF;
END $$;

-- Create or replace the synchronization function
CREATE OR REPLACE FUNCTION sync_user_to_employee()
RETURNS TRIGGER AS $$
DECLARE
  name_parts text[];
  first_name_part text;
  last_name_part text;
BEGIN
  -- Split the full name into first and last name
  name_parts := string_to_array(NEW.name, ' ');
  first_name_part := COALESCE(name_parts[1], '');
  last_name_part := COALESCE(array_to_string(name_parts[2:], ' '), '');

  -- Insert or update in employees table
  INSERT INTO employees (
    user_id,
    first_name,
    last_name,
    birth_date,
    hire_date,
    position,
    salary,
    phone,
    address,
    emergency_contact,
    social_security,
    bank_info,
    profile_image_url
  ) VALUES (
    NEW.id,
    first_name_part,
    last_name_part,
    NEW.birth_date,
    COALESCE(NEW.hire_date, CURRENT_DATE), -- Use hire_date from users or default to today
    COALESCE(NEW.department, 'Employee'),
    NULL, -- salary
    NULL, -- phone
    NULL, -- address
    NULL, -- emergency_contact
    NULL, -- social_security
    NULL, -- bank_info
    NULL  -- profile_image_url
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    first_name = first_name_part,
    last_name = last_name_part,
    birth_date = NEW.birth_date,
    hire_date = COALESCE(NEW.hire_date, employees.hire_date, CURRENT_DATE),
    position = COALESCE(NEW.department, employees.position),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS sync_user_to_employee_trigger ON users;
CREATE TRIGGER sync_user_to_employee_trigger
  AFTER INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_to_employee();

-- Sync existing users to employees table with hire_date
INSERT INTO employees (
  user_id,
  first_name,
  last_name,
  birth_date,
  hire_date,
  position,
  salary,
  phone,
  address,
  emergency_contact,
  social_security,
  bank_info,
  profile_image_url
)
SELECT 
  u.id,
  COALESCE(split_part(u.name, ' ', 1), ''),
  COALESCE(substring(u.name from position(' ' in u.name) + 1), ''),
  u.birth_date,
  COALESCE(u.hire_date, CURRENT_DATE), -- Use hire_date from users or default to today
  COALESCE(u.department, 'Employee'),
  NULL, -- salary
  NULL, -- phone
  NULL, -- address
  NULL, -- emergency_contact
  NULL, -- social_security
  NULL, -- bank_info
  NULL  -- profile_image_url
FROM users u
WHERE u.role = 'employee'
ON CONFLICT (user_id) 
DO UPDATE SET
  first_name = COALESCE(split_part(EXCLUDED.first_name || ' ' || EXCLUDED.last_name, ' ', 1), employees.first_name),
  last_name = COALESCE(substring(EXCLUDED.first_name || ' ' || EXCLUDED.last_name from position(' ' in EXCLUDED.first_name || ' ' || EXCLUDED.last_name) + 1), employees.last_name),
  birth_date = COALESCE(EXCLUDED.birth_date, employees.birth_date),
  hire_date = COALESCE(EXCLUDED.hire_date, employees.hire_date, CURRENT_DATE),
  position = COALESCE(EXCLUDED.position, employees.position),
  updated_at = NOW();