/*
  # Correction des politiques RLS pour user_invitations

  1. Suppression des anciennes politiques défectueuses
  2. Création de nouvelles politiques correctes
  3. Vérification que RLS est activé

  ## Nouvelles politiques :
  - Admins peuvent créer des invitations (INSERT)
  - Admins peuvent gérer toutes les invitations (ALL)
  - Utilisateurs peuvent voir leurs propres invitations (SELECT)
*/

-- Supprimer toutes les anciennes politiques pour repartir à zéro
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON user_invitations;

-- S'assurer que RLS est activé
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux admins de créer des invitations
CREATE POLICY "Admins can create invitations"
  ON user_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Politique pour permettre aux admins de gérer toutes les invitations
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

-- Politique pour permettre aux utilisateurs de voir leurs propres invitations
CREATE POLICY "Users can view their own invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (email = auth.email());