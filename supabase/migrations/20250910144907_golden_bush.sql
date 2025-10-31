/*
  # Corriger les statuts des timesheets pour éviter les conflits

  1. Problème identifié
    - Les statuts au niveau timesheet créent des conflits avec les statuts par jour
    - Quand un jour est approuvé/refusé, toute la semaine hérite du statut
    - Les autres jours de la semaine affichent incorrectement le même statut

  2. Solution
    - Mettre tous les statuts de timesheets à NULL
    - Gérer les statuts UNIQUEMENT au niveau timesheet_entries (par jour)
    - Supprimer la logique de statut au niveau semaine

  3. Impact
    - Les statuts seront calculés dynamiquement jour par jour
    - Plus de conflit entre statut semaine vs statut jour
    - Interface plus cohérente pour les salariés
*/

-- Mettre tous les statuts de timesheets à NULL pour éviter les conflits
UPDATE timesheets 
SET status = NULL 
WHERE status IS NOT NULL;

-- Ajouter un commentaire pour expliquer pourquoi NULL
COMMENT ON COLUMN timesheets.status IS 'Statut désactivé - géré uniquement au niveau timesheet_entries pour éviter les conflits';

-- Optionnel : Modifier la contrainte pour permettre NULL
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'timesheets' 
    AND constraint_name = 'timesheets_status_check'
  ) THEN
    ALTER TABLE timesheets DROP CONSTRAINT timesheets_status_check;
  END IF;
  
  -- Ajouter une nouvelle contrainte qui permet NULL
  ALTER TABLE timesheets ADD CONSTRAINT timesheets_status_check 
  CHECK (status IS NULL OR status = ANY (ARRAY['draft'::text, 'submitted'::text, 'approved'::text, 'rejected'::text]));
END $$;