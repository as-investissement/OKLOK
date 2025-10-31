/*
  # Suppression de la table timesheet_days

  1. Suppression
    - Supprimer la table `timesheet_days` qui fait doublon avec `timesheet_entries`
    - Supprimer les triggers et fonctions associées

  2. Simplification
    - Utiliser uniquement `timesheet_entries` pour la gestion des approbations
    - Calculer les statuts par jour depuis les entrées
*/

-- Supprimer les triggers liés à timesheet_days
DROP TRIGGER IF EXISTS handle_timesheet_days_updated_at ON timesheet_days;
DROP TRIGGER IF EXISTS update_timesheet_status_trigger ON timesheet_days;

-- Supprimer la table timesheet_days
DROP TABLE IF EXISTS timesheet_days CASCADE;

-- Supprimer la fonction update_timesheet_status_from_days si elle existe
DROP FUNCTION IF EXISTS update_timesheet_status_from_days() CASCADE;