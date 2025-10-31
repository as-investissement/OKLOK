/*
  # Ajouter la politique DELETE pour projects
  
  1. Problème identifié
    - Les chantiers ne peuvent pas être supprimés
    - La politique DELETE manque pour la table projects
  
  2. Solution
    - Ajouter une politique DELETE pour permettre aux utilisateurs authentifiés de supprimer les projets
    - Seuls les admins ou les utilisateurs de l'entreprise propriétaire peuvent supprimer
  
  3. Sécurité
    - L'utilisateur doit être authentifié
    - L'utilisateur doit être admin OU appartenir à l'entreprise du projet
*/

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "Users can delete projects" ON projects;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON projects;
DROP POLICY IF EXISTS "Authenticated users can delete projects" ON projects;

-- Créer la nouvelle politique DELETE
CREATE POLICY "Users can delete projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (
    -- Vérifier que l'utilisateur est admin ou appartient à l'entreprise du projet
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'admin'
        OR users.company_id = projects.company_id
      )
    )
  );