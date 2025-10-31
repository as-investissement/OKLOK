/*
  # Ajouter la politique DELETE pour timesheet_entries
  
  1. Problème identifié
    - Les salariés ne peuvent pas supprimer leurs propres entrées
    - La politique DELETE manque pour timesheet_entries
  
  2. Solution
    - Ajouter une politique DELETE pour permettre aux utilisateurs de supprimer leurs propres entrées en brouillon
    - Seules les entrées avec status = 'draft' peuvent être supprimées
  
  3. Sécurité
    - L'utilisateur doit être authentifié
    - L'utilisateur doit être le propriétaire de l'entrée (user_id = auth.uid())
    - L'entrée doit être en statut 'draft' (non soumise)
*/

-- Supprimer l'ancienne politique si elle existe
DROP POLICY IF EXISTS "timesheet_entries_delete_dual_system" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;

-- Créer la nouvelle politique DELETE
CREATE POLICY "timesheet_entries_delete_own_draft"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  );