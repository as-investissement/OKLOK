/*
  # Suppression de la colonne total_hours et des triggers associés

  1. Suppression des triggers
    - Supprime le trigger `update_timesheet_hours_on_entry_change`
    - Supprime la fonction `update_timesheet_total_hours()`
    - Supprime la fonction `calculate_timesheet_hours()`

  2. Suppression de la colonne
    - Supprime la colonne `total_hours` de la table `timesheets`
    - Les heures seront désormais calculées en temps réel depuis `timesheet_entries`

  3. Avantages
    - Plus de désynchronisation entre total_hours et les entrées
    - Calcul toujours exact en temps réel
    - Simplification de la logique
*/

-- Supprimer les triggers s'ils existent
DROP TRIGGER IF EXISTS update_timesheet_hours_on_entry_change ON timesheet_entries;
DROP TRIGGER IF EXISTS calculate_timesheet_hours ON timesheet_entries;

-- Supprimer les fonctions associées
DROP FUNCTION IF EXISTS update_timesheet_total_hours();
DROP FUNCTION IF EXISTS calculate_timesheet_hours();

-- Supprimer la colonne total_hours de la table timesheets
ALTER TABLE timesheets DROP COLUMN IF EXISTS total_hours;
