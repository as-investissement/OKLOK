/*
  # Ajouter colonnes auth_id dans toutes les tables utilisateur

  1. Nouvelles colonnes
    - `users.auth_id` (uuid) - ID du compte Supabase Auth
    - `employees.auth_id` (uuid) - ID du compte Supabase Auth
    - `timesheets.auth_id` (uuid) - ID du compte Supabase Auth
    - `timesheet_entries.auth_id` (uuid) - ID du compte Supabase Auth
    - `user_agreements.auth_id` (uuid) - ID du compte Supabase Auth
    - `activation_log.auth_id` (uuid) - ID du compte Supabase Auth
    - `messages.auth_id` (uuid) - ID du compte Supabase Auth

  2. Index
    - Index sur chaque colonne auth_id pour les performances

  3. Objectif
    - Permettre la traçabilité complète via l'ID Auth
    - Éviter les duplications lors de l'activation
    - Faciliter la synchronisation Auth ↔ Tables
*/

-- Ajouter auth_id dans la table users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE users ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN users.auth_id IS 'ID du compte d''authentification Supabase Auth';
  END IF;
END $$;

-- Ajouter auth_id dans la table employees
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employees' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE employees ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN employees.auth_id IS 'ID du compte d''authentification Supabase Auth (même valeur que users.auth_id)';
  END IF;
END $$;

-- Ajouter auth_id dans la table timesheets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheets' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN timesheets.auth_id IS 'ID du compte d''authentification Supabase Auth';
  END IF;
END $$;

-- Ajouter auth_id dans la table timesheet_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_entries' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE timesheet_entries ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN timesheet_entries.auth_id IS 'ID du compte d''authentification Supabase Auth';
  END IF;
END $$;

-- Ajouter auth_id dans la table user_agreements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_agreements' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE user_agreements ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN user_agreements.auth_id IS 'ID du compte d''authentification Supabase Auth';
  END IF;
END $$;

-- Ajouter auth_id dans la table activation_log
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activation_log' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE activation_log ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN activation_log.auth_id IS 'ID du compte d''authentification Supabase Auth';
  END IF;
END $$;

-- Ajouter auth_id dans la table messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'auth_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN auth_id uuid;
    COMMENT ON COLUMN messages.auth_id IS 'ID du compte d''authentification Supabase Auth';
  END IF;
END $$;

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_employees_auth_id ON employees(auth_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_auth_id ON timesheets(auth_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_auth_id ON timesheet_entries(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_agreements_auth_id ON user_agreements(auth_id);
CREATE INDEX IF NOT EXISTS idx_activation_log_auth_id ON activation_log(auth_id);
CREATE INDEX IF NOT EXISTS idx_messages_auth_id ON messages(auth_id);