/*
  # Création table push_tokens pour notifications mobiles

  1. Nouvelle table
    - `push_tokens`
      - `id` (bigint, clé primaire auto-incrémentée)
      - `user_id` (uuid, référence vers users.id)
      - `token` (text, unique, non nul - token FCM)
      - `platform` (text, 'android' ou 'ios' uniquement)
      - `user_agent` (text, optionnel - informations navigateur/app)
      - `revoked` (boolean, false par défaut - token révoqué ou non)
      - `last_seen_at` (timestamptz, par défaut NOW() - dernière utilisation)
      - `created_at` (timestamptz, par défaut NOW())

  2. Sécurité
    - Enable RLS sur `push_tokens`
    - Policy pour que les utilisateurs puissent gérer leurs propres tokens
    - Policy pour que les admins puissent voir tous les tokens

  3. Index
    - Index sur user_id pour les requêtes par utilisateur
    - Index composite sur (user_id, revoked) pour les requêtes de tokens actifs
    - Contrainte UNIQUE sur token pour éviter les doublons

  4. Contraintes
    - Platform limité à 'android' ou 'ios'
    - Token obligatoire et unique
    - Référence vers users.id
*/

-- Créer la table push_tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL CHECK (platform IN ('android', 'ios')),
  user_agent text,
  revoked boolean DEFAULT false NOT NULL,
  last_seen_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Activer RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_revoked ON push_tokens(user_id, revoked);
CREATE INDEX IF NOT EXISTS idx_push_tokens_platform ON push_tokens(platform);
CREATE INDEX IF NOT EXISTS idx_push_tokens_last_seen ON push_tokens(last_seen_at);

-- Policies RLS
CREATE POLICY "Users can manage their own push tokens"
  ON push_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.id = push_tokens.user_id
  ))
  WITH CHECK (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.id = push_tokens.user_id
  ));

CREATE POLICY "Admins can view all push tokens"
  ON push_tokens
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE (users.auth_id = auth.uid() OR users.id = auth.uid()) 
    AND users.role = 'admin'
  ));

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION handle_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_push_tokens_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE push_tokens IS 'Tokens FCM pour les notifications push mobiles (Android/iOS uniquement)';
COMMENT ON COLUMN push_tokens.token IS 'Token FCM unique fourni par Firebase Cloud Messaging';
COMMENT ON COLUMN push_tokens.platform IS 'Plateforme mobile : android ou ios uniquement';
COMMENT ON COLUMN push_tokens.user_agent IS 'Informations sur l''application/navigateur mobile';
COMMENT ON COLUMN push_tokens.revoked IS 'Token révoqué (déconnexion, désinstallation app, etc.)';
COMMENT ON COLUMN push_tokens.last_seen_at IS 'Dernière fois que ce token a été vu/utilisé';