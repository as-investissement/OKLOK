/*
  # Désactiver le trigger calculate_timesheet_hours

  Ce trigger force la mise à jour de toutes les entrées d'une journée quand une seule entrée change.
  Cela empêche l'approbation/refus par entrée individuelle.

  1. Désactivation temporaire
    - Désactive le trigger sur timesheet_entries
    - Permet l'approbation par entrée individuelle
  
  2. Note importante
    - Le trigger sera réactivé plus tard avec une logique corrigée
    - Pour l'instant, on privilégie l'approbation granulaire
*/

-- Désactiver le trigger calculate_timesheet_hours sur timesheet_entries
DROP TRIGGER IF EXISTS calculate_timesheet_hours ON timesheet_entries;

-- Ajouter un commentaire pour expliquer pourquoi
COMMENT ON TABLE timesheet_entries IS 'Timesheet entries with flexible day-level status management. Trigger calculate_timesheet_hours temporarily disabled to allow individual entry approval/rejection.';