/*
  # Fix user_agreements trigger error

  1. Problem
    - A trigger on user_agreements table is trying to access NEW.user_name
    - The user_agreements table doesn't have a user_name field
    - This causes "record new has no field user_name" error

  2. Solution
    - Drop any problematic triggers on user_agreements table
    - Recreate proper triggers that use correct field names
    - Ensure triggers reference existing columns only

  3. Changes
    - Remove triggers that reference non-existent user_name field
    - Clean up any orphaned trigger functions
*/

-- Drop any existing problematic triggers on user_agreements
DROP TRIGGER IF EXISTS handle_user_activation ON user_agreements;
DROP TRIGGER IF EXISTS user_agreements_activation_trigger ON user_agreements;
DROP TRIGGER IF EXISTS sync_user_name_trigger ON user_agreements;

-- Drop any problematic trigger functions that reference user_name
DROP FUNCTION IF EXISTS handle_user_activation();
DROP FUNCTION IF EXISTS sync_user_name_from_agreements();

-- Ensure the create_employee_on_activation function doesn't reference user_name
CREATE OR REPLACE FUNCTION create_employee_on_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if this is a terms_of_service agreement
  IF NEW.agreement_type = 'terms_of_service' THEN
    -- Check if user has all required agreements
    IF (
      SELECT COUNT(*) 
      FROM user_agreements 
      WHERE user_id = NEW.user_id 
      AND agreement_type IN ('terms_of_service', 'privacy_policy', 'data_processing')
    ) >= 3 THEN
      -- Update user status to active
      UPDATE users 
      SET status = 'active', updated_at = now()
      WHERE id = NEW.user_id;
      
      -- Update employee status to active if exists
      UPDATE employees 
      SET status = 'active', updated_at = now()
      WHERE user_id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;