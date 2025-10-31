/*
  # Créer une table dédiée pour les réinitialisations de mot de passe

  1. Nouvelle Table
    - `password_resets`
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence vers users)
      - `email` (text, email de l'utilisateur)
      - `token` (uuid, token unique de réinitialisation)
      - `status` (text, statut: 'pending', 'used', 'expired')
      - `expires_at` (timestamptz, date d'expiration)
      - `created_at` (timestamptz, date de création)
      - `used_at` (timestamptz, date d'utilisation)

  2. Sécurité
    - Enable RLS sur `password_resets`
    - Pas de policies publiques (accès via Edge Functions uniquement)

  3. Index
    - Index sur email pour recherche rapide
    - Index sur token pour validation rapide
    - Index sur status pour nettoyage

  Note: Cette table est séparée de user_invitations pour éviter les conflits
  et mieux gérer le cycle de vie des tokens de réinitialisation.
*/

-- Créer la table password_resets
CREATE TABLE IF NOT EXISTS password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  token uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  used_at timestamptz
);

-- Créer les index pour performance
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_status ON password_resets(status);
CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);

-- Enable RLS
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Pas de policies publiques - accès uniquement via service role (Edge Functions)
-- Les Edge Functions utilisent le service_role_key qui bypass RLS

-- Fonction pour nettoyer automatiquement les tokens expirés (optionnel)
CREATE OR REPLACE FUNCTION cleanup_expired_password_resets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE password_resets
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;