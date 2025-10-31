/*
  # Update employees table structure

  1. Changes:
    - Preserve existing data
    - Add missing columns if needed
    - Update constraints and policies
*/

-- Vérifier si la table existe, sinon la créer
CREATE TABLE IF NOT EXISTS employees (
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- S'assurer que RLS est activé
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Mettre à jour ou créer les politiques de sécurité
DROP POLICY IF EXISTS "Employees viewable by self and admins" ON employees;
DROP POLICY IF EXISTS "Employees modifiable by admins only" ON employees;

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

-- S'assurer que le trigger existe
DROP TRIGGER IF EXISTS handle_employees_updated_at ON employees;
CREATE TRIGGER handle_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- S'assurer que les index existent
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);