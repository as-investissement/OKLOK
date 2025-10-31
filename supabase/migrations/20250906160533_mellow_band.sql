/*
  # Fix user_name field reference in handle_user_activation function

  1. Problem
    - Function is trying to access NEW.user_name but column is called 'name'
    - This causes "record 'new' has no field 'user_name'" error

  2. Solution
    - Replace all references to user_name with name in the function
    - Ensure function matches actual table schema
*/

-- Drop and recreate the function with correct field references
DROP FUNCTION IF EXISTS handle_user_activation(uuid, text, text, text, uuid, text, date, date);

CREATE OR REPLACE FUNCTION handle_user_activation(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text,
  p_company_id uuid,
  p_department text,
  p_birth_date date DEFAULT NULL,
  p_hire_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{"success": false}'::jsonb;
  v_first_name text;
  v_last_name text;
  v_name_parts text[];
BEGIN
  RAISE NOTICE 'Starting user activation for user_id: %, email: %', p_user_id, p_email;
  
  -- Split name into first and last name
  v_name_parts := string_to_array(p_name, ' ');
  v_first_name := COALESCE(v_name_parts[1], '');
  v_last_name := COALESCE(array_to_string(v_name_parts[2:], ' '), '');
  
  RAISE NOTICE 'Name parts - First: %, Last: %', v_first_name, v_last_name;
  
  BEGIN
    -- Insert/Update user in users table
    RAISE NOTICE 'Inserting/updating user in users table';
    INSERT INTO users (
      id, email, name, role, company_id, department, 
      birth_date, hire_date, status, archived
    ) VALUES (
      p_user_id, p_email, p_name, p_role, p_company_id, p_department,
      p_birth_date, p_hire_date, 'active', false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      name = EXCLUDED.name,  -- Using 'name' not 'user_name'
      role = EXCLUDED.role,
      company_id = EXCLUDED.company_id,
      department = EXCLUDED.department,
      birth_date = EXCLUDED.birth_date,
      hire_date = EXCLUDED.hire_date,
      status = 'active',
      archived = false,
      updated_at = now();
    
    RAISE NOTICE 'User inserted/updated successfully';
    
    -- Insert/Update employee in employees table
    RAISE NOTICE 'Inserting/updating employee in employees table';
    INSERT INTO employees (
      user_id, first_name, last_name, birth_date, hire_date,
      position, status
    ) VALUES (
      p_user_id, v_first_name, v_last_name, p_birth_date, p_hire_date,
      p_department, 'active'
    )
    ON CONFLICT (user_id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      birth_date = EXCLUDED.birth_date,
      hire_date = EXCLUDED.hire_date,
      position = EXCLUDED.position,
      status = 'active',
      updated_at = now();
    
    RAISE NOTICE 'Employee inserted/updated successfully';
    
    -- Insert user agreements
    RAISE NOTICE 'Inserting user agreements';
    INSERT INTO user_agreements (user_id, agreement_type, accepted_at)
    VALUES 
      (p_user_id, 'terms_of_service', now()),
      (p_user_id, 'privacy_policy', now()),
      (p_user_id, 'data_processing', now())
    ON CONFLICT (user_id, agreement_type) DO UPDATE SET
      accepted_at = now(),
      updated_at = now();
    
    RAISE NOTICE 'User agreements inserted successfully';
    
    -- Insert activation log
    RAISE NOTICE 'Inserting activation log';
    INSERT INTO activation_log (user_id, activated_at, activation_type)
    VALUES (p_user_id, now(), 'account_activation')
    ON CONFLICT (user_id, activation_type) DO UPDATE SET
      activated_at = now();
    
    RAISE NOTICE 'Activation log inserted successfully';
    
    v_result := '{"success": true, "message": "User activation completed successfully"}'::jsonb;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in user activation: % %', SQLERRM, SQLSTATE;
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
  END;
  
  RETURN v_result;
END;
$$;