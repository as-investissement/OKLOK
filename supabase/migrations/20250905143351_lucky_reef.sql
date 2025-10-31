/*
  # Add status column to employees table

  1. New Columns
    - `status` (text) - Status of the employee that syncs with user_agreements
      - Possible values: 'pending', 'active', 'inactive', 'suspended'
      - Default: 'pending'

  2. Triggers
    - Create trigger to automatically update employee status based on user_agreements
    - Update status when user_agreements are added/modified

  3. Functions
    - Create function to calculate employee status from user_agreements
    - Sync status when agreements change
*/

-- Add status column to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'status'
  ) THEN
    ALTER TABLE employees ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Add check constraint for valid status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'employees_status_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_status_check 
    CHECK (status IN ('pending', 'active', 'inactive', 'suspended'));
  END IF;
END $$;

-- Create function to update employee status based on user_agreements
CREATE OR REPLACE FUNCTION update_employee_status_from_agreements()
RETURNS TRIGGER AS $$
BEGIN
  -- Update employee status based on user_agreements
  UPDATE employees 
  SET status = CASE
    WHEN EXISTS (
      SELECT 1 FROM user_agreements 
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND agreement_type = 'terms_of_service'
    ) AND EXISTS (
      SELECT 1 FROM user_agreements 
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND agreement_type = 'privacy_policy'
    ) THEN 'active'
    ELSE 'pending'
  END,
  updated_at = now()
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update employee status when user_agreements change
DROP TRIGGER IF EXISTS update_employee_status_trigger ON user_agreements;
CREATE TRIGGER update_employee_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_agreements
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_status_from_agreements();

-- Update existing employees status based on current user_agreements
UPDATE employees 
SET status = CASE
  WHEN EXISTS (
    SELECT 1 FROM user_agreements 
    WHERE user_id = employees.user_id
    AND agreement_type = 'terms_of_service'
  ) AND EXISTS (
    SELECT 1 FROM user_agreements 
    WHERE user_id = employees.user_id
    AND agreement_type = 'privacy_policy'
  ) THEN 'active'
  ELSE 'pending'
END,
updated_at = now()
WHERE status IS NULL OR status = 'pending';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);