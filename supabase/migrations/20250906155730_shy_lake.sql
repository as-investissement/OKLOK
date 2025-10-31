/*
  # Fix not-null constraints for activation

  1. Tables Updates
    - Make hire_date nullable in employees table
    - Add default values where needed
  2. Function Updates
    - Update handle_user_activation function with proper defaults
    - Ensure all required fields have fallback values
  3. Security
    - Maintain RLS policies
    - Keep SECURITY DEFINER for function
*/

-- Make hire_date nullable in employees table if it's not already
DO $$
BEGIN
  -- Check if hire_date column allows NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'employees' 
    AND column_name = 'hire_date' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE employees ALTER COLUMN hire_date DROP NOT NULL;
    RAISE NOTICE 'hire_date column made nullable in employees table';
  END IF;
END $$;

-- Update the activation function with better defaults
CREATE OR REPLACE FUNCTION handle_user_activation(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT DEFAULT 'employee',
  p_company_id UUID DEFAULT NULL,
  p_department TEXT DEFAULT 'Ouvrier',
  p_birth_date DATE DEFAULT NULL,
  p_hire_date DATE DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  final_hire_date DATE;
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
BEGIN
  RAISE NOTICE 'Starting activation for user: % (email: %)', p_user_id, p_email;
  
  -- Set default hire_date if not provided
  final_hire_date := COALESCE(p_hire_date, CURRENT_DATE);
  RAISE NOTICE 'Using hire_date: %', final_hire_date;
  
  -- Split name into first and last name
  name_parts := string_to_array(p_name, ' ');
  first_name := COALESCE(name_parts[1], '');
  last_name := COALESCE(array_to_string(name_parts[2:], ' '), '');
  
  RAISE NOTICE 'Name parts - First: %, Last: %', first_name, last_name;
  
  -- Insert/Update user in users table
  INSERT INTO users (
    id, email, name, role, company_id, department, 
    birth_date, hire_date, status, archived, created_at, updated_at
  ) VALUES (
    p_user_id, p_email, p_name, p_role, p_company_id, p_department,
    p_birth_date, final_hire_date, 'active', false, NOW(), NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    department = EXCLUDED.department,
    birth_date = EXCLUDED.birth_date,
    hire_date = EXCLUDED.hire_date,
    status = 'active',
    archived = false,
    updated_at = NOW();
  
  RAISE NOTICE 'User upserted successfully in users table';
  
  -- Insert/Update employee in employees table
  INSERT INTO employees (
    user_id, first_name, last_name, birth_date, hire_date, 
    position, status, created_at, updated_at
  ) VALUES (
    p_user_id, first_name, last_name, p_birth_date, final_hire_date,
    p_department, 'active', NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    birth_date = EXCLUDED.birth_date,
    hire_date = EXCLUDED.hire_date,
    position = EXCLUDED.position,
    status = 'active',
    updated_at = NOW();
  
  RAISE NOTICE 'Employee upserted successfully in employees table';
  
  -- Create user agreements (all 3 types)
  INSERT INTO user_agreements (user_id, agreement_type, accepted_at, ip_address, user_agent)
  VALUES 
    (p_user_id, 'terms_of_service', NOW(), 'activation-function', 'activation-function'),
    (p_user_id, 'privacy_policy', NOW(), 'activation-function', 'activation-function'),
    (p_user_id, 'data_processing', NOW(), 'activation-function', 'activation-function')
  ON CONFLICT (user_id, agreement_type) DO UPDATE SET
    accepted_at = NOW(),
    updated_at = NOW();
  
  RAISE NOTICE 'User agreements created successfully';
  
  -- Create activation log
  INSERT INTO activation_log (user_id, activated_at, activation_type)
  VALUES (p_user_id, NOW(), 'account_activation')
  ON CONFLICT (user_id, activation_type) DO UPDATE SET
    activated_at = NOW(),
    updated_at = NOW();
  
  RAISE NOTICE 'Activation log created successfully';
  
  -- Return success
  result := json_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'User activated successfully in all tables'
  );
  
  RAISE NOTICE 'Activation completed successfully for user: %', p_user_id;
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in activation function: % %', SQLSTATE, SQLERRM;
  
  result := json_build_object(
    'success', false,
    'error', SQLERRM,
    'sqlstate', SQLSTATE
  );
  
  RETURN result;
END;
$$;