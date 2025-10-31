/*
  # Fix activation constraints and logic

  1. Changes
    - Remove unique constraint on email in users table to allow reactivation
    - Add proper handling for duplicate activations
    - Ensure activation process works smoothly

  2. Security
    - Maintain RLS policies
    - Keep audit trail in activation_log
*/

-- Remove the unique constraint on email to allow reactivation
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'users_email_key' 
    AND table_name = 'users'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_email_key;
  END IF;
END $$;

-- Add a function to handle user activation safely
CREATE OR REPLACE FUNCTION handle_user_activation(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text DEFAULT 'employee',
  p_company_id uuid DEFAULT NULL,
  p_department text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_hire_date date DEFAULT NULL
) RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Insert or update user
  INSERT INTO users (
    id, email, name, role, company_id, department, birth_date, hire_date, archived, status
  ) VALUES (
    p_user_id, p_email, p_name, p_role, p_company_id, p_department, p_birth_date, p_hire_date, false, 'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    department = EXCLUDED.department,
    birth_date = EXCLUDED.birth_date,
    hire_date = EXCLUDED.hire_date,
    archived = false,
    status = 'active',
    updated_at = now();

  -- Insert or update employee
  INSERT INTO employees (
    user_id, first_name, last_name, birth_date, hire_date, position, status
  ) VALUES (
    p_user_id, 
    split_part(p_name, ' ', 1),
    trim(substring(p_name from position(' ' in p_name) + 1)),
    p_birth_date,
    COALESCE(p_hire_date, CURRENT_DATE),
    p_department,
    'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = split_part(p_name, ' ', 1),
    last_name = trim(substring(p_name from position(' ' in p_name) + 1)),
    birth_date = EXCLUDED.birth_date,
    hire_date = COALESCE(EXCLUDED.hire_date, CURRENT_DATE),
    position = EXCLUDED.position,
    status = 'active',
    updated_at = now();

  result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User activated successfully'
  );

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    result := json_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;