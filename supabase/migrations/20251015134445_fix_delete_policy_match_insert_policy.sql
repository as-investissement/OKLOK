/*
  # Correction politique DELETE pour correspondre à INSERT

  1. Changements
    - Supprime l'ancienne politique DELETE complexe avec `users.email = auth.email()`
    - Crée une nouvelle politique DELETE simple avec `auth.uid() = user_id` (identique à INSERT)
  
  2. Sécurité
    - Permet la suppression seulement pour les entrées de l'utilisateur connecté
    - Autorise la suppression seulement pour statuts 'draft', 'pending', 'rejected'
    - Utilise la même logique que INSERT pour cohérence
*/

-- Supprimer l'ancienne politique DELETE
DROP POLICY IF EXISTS "Users can delete own non-approved entries" ON timesheet_entries;

-- Créer la nouvelle politique DELETE (identique à INSERT)
CREATE POLICY "Users can delete own non-approved entries"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status IN ('draft', 'pending', 'rejected')
  );
