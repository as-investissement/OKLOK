/*
  # Corriger la politique DELETE pour timesheet_entries
  
  1. Problème identifié
    - Les politiques actuelles vérifient `auth.uid() = user_id`
    - Mais `user_id` pointe vers `public.users.id`, pas `auth.users.id`
    - Il faut faire une jointure avec la table users pour vérifier que l'utilisateur connecté est propriétaire
    
  2. Solution
    - Supprimer les anciennes politiques DELETE
    - Créer une nouvelle politique qui vérifie correctement via la table users
    - Autoriser la suppression pour les statuts 'draft', 'pending' et 'rejected'
    
  3. Sécurité
    - L'utilisateur doit être authentifié
    - L'entrée doit appartenir à l'utilisateur (via jointure avec users)
    - Seules les entrées non approuvées peuvent être supprimées
*/

-- Supprimer les anciennes politiques DELETE
DROP POLICY IF EXISTS "Users can delete own non-approved entries" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft_or_pending" ON timesheet_entries;

-- Créer la nouvelle politique DELETE corrigée
CREATE POLICY "Users can delete own non-approved entries"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = timesheet_entries.user_id
      AND users.id = auth.uid()
    )
    AND status IN ('draft', 'pending', 'rejected')
  );
