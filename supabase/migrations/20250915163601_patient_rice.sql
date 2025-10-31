/*
  # Ajout des colonnes de date d'archivage

  1. Nouvelles colonnes
    - `users.archived_at` (timestamptz) - Date d'archivage du salarié
    - `users.archived_by` (uuid) - Qui a archivé le salarié
    - `employees.archived_at` (timestamptz) - Date d'archivage dans employees
    - `employees.archived_by` (uuid) - Qui a archivé dans employees

  2. Sécurité
    - Colonnes optionnelles (NULL autorisé)
    - Contraintes de clés étrangères
    - Pas de modification des données existantes

  3. Compatibilité
    - Aucun impact sur les données existantes
    - Colonnes NULL par défaut
    - Pas de contrainte NOT NULL
*/

-- Ajouter les colonnes dans la table users
DO $$
BEGIN
  -- Ajouter archived_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE users ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;

  -- Ajouter archived_by si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'archived_by'
  ) THEN
    ALTER TABLE users ADD COLUMN archived_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Ajouter les colonnes dans la table employees
DO $$
BEGIN
  -- Ajouter archived_at si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE employees ADD COLUMN archived_at TIMESTAMPTZ;
  END IF;

  -- Ajouter archived_by si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'archived_by'
  ) THEN
    ALTER TABLE employees ADD COLUMN archived_by UUID REFERENCES users(id);
  END IF;
END $$;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_archived_by ON users(archived_by) WHERE archived_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_archived_at ON employees(archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_employees_archived_by ON employees(archived_by) WHERE archived_by IS NOT NULL;