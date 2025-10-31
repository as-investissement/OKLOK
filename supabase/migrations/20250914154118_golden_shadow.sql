/*
  # Ajouter auth_id dans toutes les tables utilisateur

  1. Nouvelles colonnes
    - `timesheets.auth_id` (uuid) - ID du compte d'authentification Supabase Auth
    - `timesheet_entries.auth_id` (uuid) - ID du compte d'authentification Supabase Auth  
    - `user_agreements.auth_id` (uuid) - ID du compte d'authentification Supabase Auth
    - `activation_log.auth_id` (uuid) - ID du compte d'authentification Supabase Auth
    - `messages.auth_id` (uuid) - ID du compte d'authentification Supabase Auth

  2. Index pour performance
    - Index sur chaque colonne auth_id pour des requêtes rapides

  3. Commentaires explicatifs
    - Chaque colonne est documentée pour clarifier son usage
</*/

-- Ajouter auth_id dans timesheets
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

-- Ajouter auth_id dans timesheet_entries
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

-- Ajouter auth_id dans user_agreements
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

-- Ajouter auth_id dans activation_log
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

-- Ajouter auth_id dans messages
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

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheets_auth_id ON timesheets(auth_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_auth_id ON timesheet_entries(auth_id);
CREATE INDEX IF NOT EXISTS idx_user_agreements_auth_id ON user_agreements(auth_id);
CREATE INDEX IF NOT EXISTS idx_activation_log_auth_id ON activation_log(auth_id);
CREATE INDEX IF NOT EXISTS idx_messages_auth_id ON messages(auth_id);

-- Créer des index sur users et employees aussi
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_employees_auth_id ON employees(auth_id);