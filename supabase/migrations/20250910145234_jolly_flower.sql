/*
  # Forcer les statuts timesheets à NULL pour éviter les conflits

  1. Problème identifié
    - Les statuts au niveau `timesheets` créent des conflits avec les statuts `timesheet_entries`
    - Quand un jour est approuvé/refusé, toute la semaine hérite du statut
    - Solution : Utiliser UNIQUEMENT les statuts au niveau `timesheet_entries`

  2. Actions
    - Mettre TOUS les statuts `timesheets.status` à NULL
    - Supprimer la contrainte de validation sur le statut
    - Modifier la colonne pour accepter NULL par défaut
    - Désactiver le trigger qui synchronise les statuts

  3. Résultat
    - Statuts gérés UNIQUEMENT au niveau jour par jour
    - Plus de conflit entre statut semaine vs jour
    - Interface cohérente pour les salariés
*/

-- ÉTAPE 1: Supprimer la contrainte de validation sur le statut
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'timesheets_status_check' 
    AND table_name = 'timesheets'
  ) THEN
    ALTER TABLE timesheets DROP CONSTRAINT timesheets_status_check;
    RAISE NOTICE 'Contrainte timesheets_status_check supprimée';
  ELSE
    RAISE NOTICE 'Contrainte timesheets_status_check déjà absente';
  END IF;
END $$;

-- ÉTAPE 2: Modifier la colonne pour accepter NULL et avoir NULL comme défaut
ALTER TABLE timesheets 
ALTER COLUMN status DROP NOT NULL,
ALTER COLUMN status SET DEFAULT NULL;

-- ÉTAPE 3: Mettre TOUS les statuts existants à NULL
UPDATE timesheets 
SET status = NULL, 
    updated_at = now()
WHERE status IS NOT NULL;

-- ÉTAPE 4: Désactiver le trigger qui synchronise les statuts (s'il existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'sync_week_status_from_days' 
    AND event_object_table = 'timesheet_entries'
  ) THEN
    DROP TRIGGER sync_week_status_from_days ON timesheet_entries;
    RAISE NOTICE 'Trigger sync_week_status_from_days supprimé';
  ELSE
    RAISE NOTICE 'Trigger sync_week_status_from_days déjà absent';
  END IF;
END $$;

-- ÉTAPE 5: Ajouter un commentaire pour documenter le changement
COMMENT ON COLUMN timesheets.status IS 'Statut désactivé - Utiliser timesheet_entries.status pour la gestion jour par jour';

-- ÉTAPE 6: Vérification finale
DO $$
DECLARE
  null_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM timesheets;
  SELECT COUNT(*) INTO null_count FROM timesheets WHERE status IS NULL;
  
  RAISE NOTICE 'VÉRIFICATION: % timesheets sur % ont maintenant status = NULL', null_count, total_count;
  
  IF null_count = total_count THEN
    RAISE NOTICE '✅ SUCCÈS: Tous les statuts timesheets sont maintenant NULL';
  ELSE
    RAISE WARNING '❌ PROBLÈME: % timesheets ont encore un statut non-NULL', (total_count - null_count);
  END IF;
END $$;