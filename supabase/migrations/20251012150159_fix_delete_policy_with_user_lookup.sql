/*
  # Corriger la politique DELETE pour timesheet_entries avec lookup utilisateur
  
  1. Problème identifié
    - La politique DELETE vérifie user_id = auth.uid()
    - Mais user_id dans timesheet_entries contient l'ID de la table public.users
    - Alors que auth.uid() retourne l'ID de la table auth.users
    - Ces deux IDs ne correspondent pas toujours
  
  2. Solution
    - Modifier la politique DELETE pour faire une jointure avec la table users
    - Vérifier que l'utilisateur connecté (auth.uid()) correspond à l'utilisateur de l'entrée
    - En utilisant l'email comme clé de correspondance
  
  3. Sécurité
    - L'utilisateur doit être authentifié
    - L'entrée doit appartenir à l'utilisateur (via email)
    - L'entrée doit être en statut 'draft'
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;

-- Créer la nouvelle politique DELETE avec lookup
CREATE POLICY "timesheet_entries_delete_own_draft"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = timesheet_entries.user_id 
        AND users.email = auth.email()
    )
    AND status = 'draft'
  );
