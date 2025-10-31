/*
  # Ajouter colonnes pour congés, absences et noms de projets

  1. Nouvelles colonnes
    - `project_name` (text) - Nom du chantier pour affichage rapide
    - `is_paid_leave` (boolean) - Indique si c'est un congé payé
    - `is_absence` (boolean) - Indique si c'est une absence
    - `leave_type` (text) - Type de congé/absence pour plus de détails

  2. Modifications
    - Permettre project_id NULL quand c'est un congé/absence
    - Ajouter contrainte pour éviter congé ET absence simultanément

  3. Migration des données existantes
    - Mise à jour automatique des entrées existantes avec les noms des projets
    - Traduction des anciens noms anglais en français
*/

-- Ajouter les colonnes pour les informations du projet
ALTER TABLE timesheet_entries 
ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Ajouter les colonnes pour gérer congés et absences
ALTER TABLE timesheet_entries 
ADD COLUMN IF NOT EXISTS is_paid_leave boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_absence boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS leave_type text;

-- Mettre à jour les entrées existantes avec les noms des projets
UPDATE timesheet_entries 
SET project_name = projects.name
FROM projects 
WHERE timesheet_entries.project_id = projects.id
  AND timesheet_entries.project_name IS NULL;

-- Traduire les anciens noms anglais en français pour les congés
UPDATE timesheet_entries 
SET 
  project_name = 'CONGÉS PAYÉS',
  is_paid_leave = true
WHERE (project_name ILIKE '%PAID%LEAVE%' OR project_name ILIKE '%LEAVE%PAID%')
  AND is_paid_leave = false;

-- Traduire les anciens noms anglais en français pour les absences
UPDATE timesheet_entries 
SET 
  project_name = 'ABSENT',
  is_absence = true
WHERE (project_name ILIKE '%ABSENT%' OR project_name ILIKE '%ABSENCE%')
  AND is_absence = false;

-- Ajouter une contrainte pour s'assurer de la cohérence des données
DO $$
BEGIN
  -- Contrainte : ne peut pas être à la fois congé ET absence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'timesheet_entries' 
    AND constraint_name = 'timesheet_entries_not_both_leave_absence'
  ) THEN
    ALTER TABLE timesheet_entries 
    ADD CONSTRAINT timesheet_entries_not_both_leave_absence 
    CHECK (NOT (is_paid_leave = true AND is_absence = true));
  END IF;
END $$;

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project_name 
ON timesheet_entries(project_name);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_paid_leave 
ON timesheet_entries (is_paid_leave) WHERE is_paid_leave = true;

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_absence 
ON timesheet_entries (is_absence) WHERE is_absence = true;

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_leave_type 
ON timesheet_entries (leave_type) WHERE leave_type IS NOT NULL;
