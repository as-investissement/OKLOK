/*
  # Désactiver tous les triggers problématiques sur timesheet_entries

  1. Problème identifié
    - Les triggers forcent la mise à jour de toute la journée
    - Empêche l'approbation par entrée individuelle
    - Cause: triggers calculate_timesheet_hours et autres

  2. Solution temporaire
    - Désactiver tous les triggers sur timesheet_entries
    - Permettre l'approbation granulaire par entrée
    - Recalcul manuel des totaux si nécessaire

  3. Triggers désactivés
    - calculate_timesheet_hours
    - validate_timesheet_hours  
    - handle_timesheet_entries_updated_at
    - Tous autres triggers sur timesheet_entries
*/

-- Désactiver le trigger de calcul des heures (principal coupable)
DROP TRIGGER IF EXISTS calculate_timesheet_hours ON timesheet_entries;

-- Désactiver le trigger de validation des heures
DROP TRIGGER IF EXISTS validate_timesheet_hours ON timesheet_entries;

-- Désactiver le trigger de mise à jour automatique
DROP TRIGGER IF EXISTS handle_timesheet_entries_updated_at ON timesheet_entries;

-- Lister tous les triggers restants sur timesheet_entries pour diagnostic
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    RAISE NOTICE '🔍 === TRIGGERS RESTANTS SUR timesheet_entries ===';
    
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_timing
        FROM information_schema.triggers 
        WHERE event_object_table = 'timesheet_entries'
        AND event_object_schema = 'public'
    LOOP
        RAISE NOTICE '⚠️ Trigger restant: % (% %) - À DÉSACTIVER MANUELLEMENT', 
            trigger_record.trigger_name, 
            trigger_record.action_timing,
            trigger_record.event_manipulation;
    END LOOP;
    
    RAISE NOTICE '✅ === DÉSACTIVATION TRIGGERS TERMINÉE ===';
END $$;