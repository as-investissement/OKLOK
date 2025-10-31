/*
  # Ajouter colonne absence_hours

  1. Modifications
    - Ajouter la colonne `absence_hours` (numeric) à la table `timesheet_entries`
    - Permet de stocker les heures d'absence séparément
    - Par défaut à 0
    - Valeur nullable pour compatibilité avec les entrées existantes

  2. Notes
    - Les entrées existantes avec `is_absence = true` devront être mises à jour manuellement
    - La colonne `normal_hours` continuera d'exister pour les heures de travail normales
*/

-- Ajouter la colonne absence_hours
ALTER TABLE timesheet_entries 
ADD COLUMN IF NOT EXISTS absence_hours numeric DEFAULT 0;

-- Mettre à jour les entrées d'absence existantes pour copier normal_hours dans absence_hours
UPDATE timesheet_entries 
SET absence_hours = normal_hours 
WHERE is_absence = true AND absence_hours = 0;
