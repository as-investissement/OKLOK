/*
  # Mise à jour du schéma de la base de données

  1. Tables
    - Mise à jour de la table employees
    - Ajout des contraintes et index nécessaires
    - Configuration de la sécurité RLS
*/

-- Suppression de la table existante si elle existe
DROP TABLE IF EXISTS employees CASCADE;

-- Création de la table employees
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Activation de RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Création des politiques de sécurité
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

-- Ajout du trigger pour updated_at
CREATE TRIGGER handle_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Création des index
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_position ON employees(position);