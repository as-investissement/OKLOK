/*
  # Corriger la politique DELETE pour timesheet_entries

  1. Problème identifié
    - La politique DELETE actuelle utilise une jointure complexe avec auth.email()
    - Elle vérifie: EXISTS (SELECT 1 FROM users WHERE users.id = user_id AND users.email = auth.email())
    - Cette vérification est trop complexe et incorrecte
    
  2. Solution
    - Utiliser la même logique simple que les politiques INSERT/UPDATE/SELECT qui fonctionnent
    - Vérifier directement: auth.uid() = user_id AND status = 'draft'
    - Le user_id contient déjà l'UUID correct de l'utilisateur authentifié
    
  3. Sécurité
    - L'utilisateur doit être authentifié
    - L'entrée doit appartenir à l'utilisateur (user_id = auth.uid())
    - L'entrée doit être en statut 'draft' uniquement
*/

-- Supprimer la politique complexe qui ne fonctionne pas
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;

-- Créer la politique DELETE simple qui fonctionne
CREATE POLICY "timesheet_entries_delete_own_draft"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status = 'draft'
  );
