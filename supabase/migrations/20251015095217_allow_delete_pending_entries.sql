/*
  # Autoriser la suppression des entrées draft ET pending

  1. Problème identifié
    - Actuellement, seules les entrées en statut 'draft' peuvent être supprimées
    - Quand le salarié soumet sa journée, le statut passe à 'pending'
    - Il ne peut alors plus supprimer ses entrées, même si l'admin ne les a pas encore validées
    
  2. Solution
    - Autoriser la suppression pour les statuts 'draft' ET 'pending'
    - Une fois validé/rejeté par l'admin, l'entrée ne peut plus être supprimée
    
  3. Sécurité
    - L'utilisateur doit être authentifié
    - L'entrée doit appartenir à l'utilisateur (user_id = auth.uid())
    - L'entrée doit être en statut 'draft' ou 'pending' uniquement
    - Les entrées 'approved' ou 'rejected' ne peuvent pas être supprimées
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;

-- Créer la nouvelle politique qui autorise draft ET pending
CREATE POLICY "timesheet_entries_delete_own_draft_or_pending"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND status IN ('draft', 'pending')
  );
