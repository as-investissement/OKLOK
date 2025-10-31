/*
  # Corriger la politique DELETE pour timesheet_entries
  
  1. Problème identifié
    - Les entrées ne peuvent pas être supprimées
    - La politique DELETE doit vérifier que user_id = auth.uid()
  
  2. Solution
    - Créer une politique simple qui vérifie user_id = auth.uid()
    - Permettre la suppression uniquement si status = 'draft'
  
  3. Sécurité
    - L'utilisateur doit être authentifié
    - user_id doit correspondre à auth.uid()
    - L'entrée doit être en statut 'draft'
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;

-- Créer la nouvelle politique DELETE simple
CREATE POLICY "timesheet_entries_delete_own_draft"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'draft'
  );