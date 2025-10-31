/*
  # Migrer les données d'absence vers absence_hours
  
  1. Objectif
    - Déplacer les heures d'absence de `normal_hours` vers `absence_hours`
    - Remettre `normal_hours` à 0 pour les entrées avec `is_absence = true`
    
  2. Logique
    - Pour toutes les entrées où `is_absence = true`
    - Copier `normal_hours` vers `absence_hours` (si pas déjà fait)
    - Remettre `normal_hours` à 0
    - Conserver `overtime_hours` à 0 (logique: pas de heures sup avec absence)
    
  3. Sécurité
    - Vérifier que les données sont cohérentes avant et après migration
    - Ne pas toucher aux entrées où `is_absence = false`
*/

-- Migrer les heures d'absence de normal_hours vers absence_hours
UPDATE timesheet_entries 
SET 
  absence_hours = COALESCE(NULLIF(absence_hours, 0), normal_hours),
  normal_hours = 0
WHERE is_absence = true 
  AND normal_hours > 0;

-- S'assurer que overtime_hours = 0 pour toutes les absences
UPDATE timesheet_entries 
SET overtime_hours = 0
WHERE is_absence = true 
  AND overtime_hours > 0;