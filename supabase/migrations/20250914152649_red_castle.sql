/*
  # Ajout colonnes auth_id pour synchronisation Auth/Users/Employees

  1. Nouvelles colonnes
    - `users.auth_id` (uuid, nullable) - ID du compte d'authentification Supabase
    - `employees.auth_id` (uuid, nullable) - ID du compte d'authentification Supabase
  
  2. Index pour performance
    - Index sur `users.auth_id` pour recherche rapide
    - Index sur `employees.auth_id` pour recherche rapide
  
  3. Logique
    - `users.id` reste l'ID interne (UUID généré)
    - `users.auth_id` = ID du compte Supabase Auth
    - `employees.user_id` → `users.id` (contrainte FK préservée)
    - `employees.auth_id` = même valeur que `users.auth_id`
*/

-- Ajouter la colonne auth_id à la table users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_id uuid;
  END IF;
END $$;

-- Ajouter la colonne auth_id à la table employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_id uuid;
  END IF;
END $$;

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_employees_auth_id ON employees(auth_id);

-- Ajouter des commentaires pour documenter
COMMENT ON COLUMN users.auth_id IS 'ID du compte d''authentification Supabase Auth';
COMMENT ON COLUMN employees.auth_id IS 'ID du compte d''authentification Supabase Auth (même valeur que users.auth_id)';