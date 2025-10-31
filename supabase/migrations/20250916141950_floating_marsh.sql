/*
  # Amélioration système de notifications push

  1. Colonnes ajoutées à push_tokens
    - `enabled` (boolean, default true) - Token activé/désactivé
    - `revoked` (boolean, default false) - Token révoqué (existe déjà)
    - `last_seen_at` (timestamptz) - Dernière activité (existe déjà)

  2. Nouvelle table user_settings
    - `user_id` (uuid, primary key, foreign key vers users)
    - `notifications_enabled` (boolean, default true) - Préférences notifications
    - `created_at` et `updated_at` pour l'audit

  3. Sécurité
    - Enable RLS sur user_settings
    - Policies pour que les utilisateurs gèrent leurs propres paramètres
    - Index pour optimiser les requêtes
*/

-- Vérifier et ajouter la colonne enabled dans push_tokens si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN enabled boolean DEFAULT true NOT NULL;
    COMMENT ON COLUMN push_tokens.enabled IS 'Token activé ou désactivé par l''utilisateur';
  END IF;
END $$;

-- Vérifier que revoked existe déjà (normalement oui)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'revoked'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN revoked boolean DEFAULT false NOT NULL;
    COMMENT ON COLUMN push_tokens.revoked IS 'Token révoqué (déconnexion, désinstallation app, etc.)';
  END IF;
END $$;

-- Vérifier que last_seen_at existe déjà (normalement oui)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'push_tokens' AND column_name = 'last_seen_at'
  ) THEN
    ALTER TABLE push_tokens ADD COLUMN last_seen_at timestamptz DEFAULT now() NOT NULL;
    COMMENT ON COLUMN push_tokens.last_seen_at IS 'Dernière fois que ce token a été vu/utilisé';
  END IF;
END $$;

-- Créer la table user_settings si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notifications_enabled boolean DEFAULT true NOT NULL,
  weekly_reminders_enabled boolean DEFAULT true NOT NULL,
  email_notifications_enabled boolean DEFAULT false NOT NULL,
  push_notifications_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Commentaires pour la documentation
COMMENT ON TABLE user_settings IS 'Paramètres et préférences utilisateur pour les notifications';
COMMENT ON COLUMN user_settings.user_id IS 'Référence vers l''utilisateur (clé primaire)';
COMMENT ON COLUMN user_settings.notifications_enabled IS 'Notifications générales activées/désactivées';
COMMENT ON COLUMN user_settings.weekly_reminders_enabled IS 'Rappels hebdomadaires de saisie des heures';
COMMENT ON COLUMN user_settings.email_notifications_enabled IS 'Notifications par email';
COMMENT ON COLUMN user_settings.push_notifications_enabled IS 'Notifications push mobiles';

-- Activer RLS sur user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Policies pour user_settings : les utilisateurs gèrent leurs propres paramètres
CREATE POLICY "Users can manage their own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy pour les admins (lecture seule des paramètres)
CREATE POLICY "Admins can view all user settings"
  ON user_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Trigger pour updated_at sur user_settings
CREATE OR REPLACE FUNCTION handle_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_settings_updated_at();

-- Index pour optimiser les requêtes sur user_settings
CREATE INDEX IF NOT EXISTS idx_user_settings_notifications_enabled 
  ON user_settings (notifications_enabled) 
  WHERE notifications_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_settings_push_enabled 
  ON user_settings (push_notifications_enabled) 
  WHERE push_notifications_enabled = true;

-- Index pour optimiser les requêtes sur push_tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_enabled 
  ON push_tokens (enabled) 
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_enabled 
  ON push_tokens (user_id, enabled) 
  WHERE enabled = true AND revoked = false;

-- Créer des paramètres par défaut pour tous les utilisateurs existants
INSERT INTO user_settings (user_id, notifications_enabled, weekly_reminders_enabled)
SELECT id, true, true
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_settings WHERE user_settings.user_id = users.id
)
AND archived = false;