/*
  # Corriger la politique DELETE avec email lookup
  
  1. Problème identifié
    - users.id (public.users) != auth.uid() (auth.users.id)
    - La correspondance doit se faire via l'email
    - Utiliser auth.email() pour matcher avec users.email
    
  2. Solution
    - Supprimer les politiques DELETE existantes
    - Créer une politique qui utilise email pour matcher
    - Autoriser 'draft', 'pending' et 'rejected'
    
  3. Sécurité
    - Utilisateur authentifié requis
    - Match via email entre auth.users et public.users
    - Seules entrées non approuvées supprimables
*/

-- Supprimer TOUTES les anciennes politiques DELETE
DROP POLICY IF EXISTS "Users can delete own non-approved entries" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft_or_pending" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;

-- Créer la politique DELETE avec email matching
CREATE POLICY "Users can delete own non-approved entries"
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
    AND status IN ('draft', 'pending', 'rejected')
  );
