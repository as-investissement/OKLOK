/*
  # Create employee record only after account activation

  1. New Function
    - `create_employee_on_activation()` - Creates employee record when user activates account
    
  2. Trigger Update
    - Modify existing trigger to call new function when user_agreements are created
    
  3. Changes
    - Employee records are now created only when user accepts terms during activation
    - Status automatically set to 'active' when all required agreements are accepted
    
  4. Security
    - Function uses proper security context
    - Only creates employee if user has accepted required agreements
*/

-- Function to create employee record when user activates account
CREATE OR REPLACE FUNCTION create_employee_on_activation()
RETURNS TRIGGER AS $$
DECLARE
  user_record RECORD;
  has_terms BOOLEAN := FALSE;
  has_privacy BOOLEAN := FALSE;
BEGIN
  -- Only proceed if this is a terms_of_service or privacy_policy agreement
  IF NEW.agreement_type NOT IN ('terms_of_service', 'privacy_policy') THEN
    RETURN NEW;
  END IF;

  -- Get user information
  SELECT * INTO user_record
  FROM users 
  WHERE id = NEW.user_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Check if user has accepted both required agreements
  SELECT EXISTS(
    SELECT 1 FROM user_agreements 
    WHERE user_id = NEW.user_id 
    AND agreement_type = 'terms_of_service'
  ) INTO has_terms;
  
  SELECT EXISTS(
    SELECT 1 FROM user_agreements 
    WHERE user_id = NEW.user_id 
    AND agreement_type = 'privacy_policy'
  ) INTO has_privacy;

  -- If user has accepted both agreements, create employee record
  IF has_terms AND has_privacy THEN
    -- Split name into first_name and last_name
    DECLARE
      name_parts TEXT[];
      first_name TEXT;
      last_name TEXT;
    BEGIN
      name_parts := string_to_array(user_record.name, ' ');
      first_name := COALESCE(name_parts[1], '');
      last_name := COALESCE(array_to_string(name_parts[2:], ' '), '');
      
      -- Create or update employee record
      INSERT INTO employees (
        user_id,
        first_name,
        last_name,
        birth_date,
        hire_date,
        position,
        status
      ) VALUES (
        user_record.id,
        first_name,
        last_name,
        user_record.birth_date,
        user_record.hire_date,
        user_record.department,
        'active'
      )
      ON CONFLICT (user_id) 
      DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        birth_date = EXCLUDED.birth_date,
        hire_date = EXCLUDED.hire_date,
        position = EXCLUDED.position,
        status = 'active',
        updated_at = now();
        
      RAISE LOG 'Employee record created/updated for user %', user_record.id;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the existing trigger to use the new function
DROP TRIGGER IF EXISTS update_employee_status_trigger ON user_agreements;

CREATE TRIGGER create_employee_on_activation_trigger
  AFTER INSERT ON user_agreements
  FOR EACH ROW
  EXECUTE FUNCTION create_employee_on_activation();

-- Also update the sync function to handle activation properly
CREATE OR REPLACE FUNCTION sync_user_to_employee()
RETURNS TRIGGER AS $$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
  has_terms BOOLEAN := FALSE;
  has_privacy BOOLEAN := FALSE;
BEGIN
  -- Only sync if user has activated account (accepted agreements)
  SELECT EXISTS(
    SELECT 1 FROM user_agreements 
    WHERE user_id = NEW.id 
    AND agreement_type = 'terms_of_service'
  ) INTO has_terms;
  
  SELECT EXISTS(
    SELECT 1 FROM user_agreements 
    WHERE user_id = NEW.id 
    AND agreement_type = 'privacy_policy'
  ) INTO has_privacy;

  -- Only create employee record if user has accepted both agreements
  IF has_terms AND has_privacy THEN
    -- Split name into first_name and last_name
    name_parts := string_to_array(NEW.name, ' ');
    first_name := COALESCE(name_parts[1], '');
    last_name := COALESCE(array_to_string(name_parts[2:], ' '), '');
    
    -- Create or update employee record
    INSERT INTO employees (
      user_id,
      first_name,
      last_name,
      birth_date,
      hire_date,
      position,
      status
    ) VALUES (
      NEW.id,
      first_name,
      last_name,
      NEW.birth_date,
      NEW.hire_date,
      NEW.department,
      'active'
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      birth_date = EXCLUDED.birth_date,
      hire_date = EXCLUDED.hire_date,
      position = EXCLUDED.position,
      status = 'active',
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;