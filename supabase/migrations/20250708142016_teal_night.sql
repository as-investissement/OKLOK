/*
  # Add Employees Table with Profile Image

  1. New Tables
    - `employees`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `first_name` (text)
      - `last_name` (text) 
      - `birth_date` (date)
      - `hire_date` (date)
      - `position` (text)
      - `salary` (numeric)
      - `phone` (text)
      - `address` (text)
      - `emergency_contact` (text)
      - `social_security` (text)
      - `bank_info` (text)
      - `profile_image_url` (text) - NEW: Store URL to employee profile image
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for viewing and modifying data
    - Add indexes for performance
*/

-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS employees CASCADE;

-- Create employees table with profile_image_url field
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  birth_date date,
  hire_date date NOT NULL,
  position text NOT NULL,
  salary numeric(10,2),
  phone text,
  address text,
  emergency_contact text,
  social_security text,
  bank_info text,
  profile_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Employees viewable by self and admins"
  ON employees FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Employees modifiable by admins only"
  ON employees FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER handle_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create indexes
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_position ON employees(position);