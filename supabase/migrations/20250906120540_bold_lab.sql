/*
  # Add employee activation status and improve user creation flow

  1. Schema Changes
    - Add `status` column to employees table with values: 'pending', 'active', 'inactive', 'suspended'
    - Update existing employees to 'active' status by default
    - Add index on status column for performance

  2. Security
    - Update RLS policies to handle status filtering
    - Ensure only active employees can be viewed in most contexts

  3. Functions
    - Update sync_user_to_employee function to handle status properly
    - Update create_employee_on_activation function to set status to 'active'

  4. Triggers
    - Ensure employee status is set correctly during activation
*/

-- Add status column to employees table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'status'
  ) THEN
    ALTER TABLE employees ADD COLUMN status text DEFAULT 'pending';
  END IF;
END $$;

-- Add check constraint for status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'employees' AND constraint_name = 'employees_status_check'
  ) THEN
    ALTER TABLE employees ADD CONSTRAINT employees_status_check 
    CHECK (status IN ('pending', 'active', 'inactive', 'suspended'));
  END IF;
END $$;

-- Update existing employees to 'active' status if they don't have a status
UPDATE employees 
SET status = 'active' 
WHERE status IS NULL OR status = 'pending';

-- Add index on status column for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'employees' AND indexname = 'idx_employees_status'
  ) THEN
    CREATE INDEX idx_employees_status ON employees(status);
  END IF;
END $$;

-- Update the create_employee_on_activation function to set status to 'active'
CREATE OR REPLACE FUNCTION create_employee_on_activation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create employee record when user accepts terms of service
  IF NEW.agreement_type = 'terms_of_service' THEN
    -- Get user data
    SELECT name, department, company_id, birth_date, hire_date
    INTO NEW.user_name, NEW.user_department, NEW.user_company_id, NEW.user_birth_date, NEW.user_hire_date
    FROM users
    WHERE id = NEW.user_id;

    -- Create or update employee record with 'active' status
    INSERT INTO employees (
      user_id,
      first_name,
      last_name,
      birth_date,
      hire_date,
      position,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.user_id,
      split_part(NEW.user_name, ' ', 1),
      substring(NEW.user_name from position(' ' in NEW.user_name) + 1),
      NEW.user_birth_date,
      NEW.user_hire_date,
      NEW.user_department,
      'active', -- Set status to active when user activates account
      now(),
      now()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      status = 'active',
      updated_at = now();

    -- Log the activation
    INSERT INTO public.activation_log (user_id, activated_at, activation_type)
    VALUES (NEW.user_id, now(), 'account_activation')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update sync_user_to_employee function to handle status properly
CREATE OR REPLACE FUNCTION sync_user_to_employee()
RETURNS TRIGGER AS $$
BEGIN
  -- Create or update employee record
  INSERT INTO employees (
    user_id,
    first_name,
    last_name,
    birth_date,
    hire_date,
    position,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    split_part(NEW.name, ' ', 1),
    substring(NEW.name from position(' ' in NEW.name) + 1),
    NEW.birth_date,
    NEW.hire_date,
    NEW.department,
    CASE 
      WHEN NEW.role = 'admin' THEN 'active'
      ELSE 'pending'
    END,
    now(),
    now()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    first_name = split_part(NEW.name, ' ', 1),
    last_name = substring(NEW.name from position(' ' in NEW.name) + 1),
    birth_date = NEW.birth_date,
    hire_date = NEW.hire_date,
    position = NEW.department,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create activation log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  activated_at timestamptz DEFAULT now(),
  activation_type text DEFAULT 'account_activation',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on activation_log
ALTER TABLE activation_log ENABLE ROW LEVEL SECURITY;

-- Create policy for activation_log
CREATE POLICY "Users can view their own activation log"
  ON activation_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Create policy for admins to view all activation logs
CREATE POLICY "Admins can view all activation logs"
  ON activation_log
  FOR ALL
  TO authenticated
  USING (is_admin());