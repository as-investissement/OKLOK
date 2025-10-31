/*
  # Système d'invitation et validation des employés

  1. Nouvelles Tables
    - `user_invitations`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `token` (text, unique)
      - `invited_by` (uuid, référence vers users)
      - `company_id` (uuid, référence vers companies)
      - `employee_data` (jsonb, données de l'employé)
      - `status` (text, pending/accepted/expired)
      - `expires_at` (timestamp)
      - `accepted_at` (timestamp)
      - `created_at` (timestamp)

    - `user_agreements`
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence vers users)
      - `agreement_type` (text, 'terms_of_service')
      - `accepted_at` (timestamp)
      - `ip_address` (text)
      - `user_agent` (text)

  2. Sécurité
    - Enable RLS sur les deux tables
    - Policies pour les admins et utilisateurs concernés

  3. Fonctions
    - Fonction pour nettoyer les invitations expirées
    - Trigger pour mise à jour automatique
*/

-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des invitations d'employés
CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES users(id) NOT NULL,
  company_id uuid REFERENCES companies(id) NOT NULL,
  employee_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Contrainte pour le statut
ALTER TABLE user_invitations 
ADD CONSTRAINT user_invitations_status_check 
CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled'));

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Table des acceptations de conditions générales
CREATE TABLE IF NOT EXISTS user_agreements (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) NOT NULL,
  agreement_type text NOT NULL DEFAULT 'terms_of_service',
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Contrainte pour le type d'accord
ALTER TABLE user_agreements 
ADD CONSTRAINT user_agreements_type_check 
CHECK (agreement_type IN ('terms_of_service', 'privacy_policy', 'data_processing'));

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agreements_type ON user_agreements(agreement_type);

-- Enable RLS
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agreements ENABLE ROW LEVEL SECURITY;

-- Policies pour user_invitations
CREATE POLICY "Admins can manage invitations"
  ON user_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (email = auth.email());

-- Policies pour user_agreements
CREATE POLICY "Users can manage their own agreements"
  ON user_agreements
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all agreements"
  ON user_agreements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Fonction pour nettoyer les invitations expirées
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE user_invitations 
  SET status = 'expired', updated_at = now()
  WHERE status = 'pending' 
  AND expires_at < now();
END;
$$;

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers pour updated_at
CREATE TRIGGER handle_user_invitations_updated_at
  BEFORE UPDATE ON user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Fonction pour générer un token sécurisé
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;