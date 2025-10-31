/*
  # Ajouter les informations du projet dans timesheet_entries

  1. Nouvelles colonnes
    - `project_company_id` (uuid) - Entreprise principale du chantier
    - `project_secondary_companies` (text[]) - Entreprises secondaires du chantier  
    - `project_name` (text) - Nom du chantier pour affichage rapide

  2. Avantages
    - Performance améliorée (plus besoin de chercher dans tous les projets)
    - Fiabilité (infos stockées au moment de l'enregistrement)
    - Historique préservé (si un projet change, l'historique reste correct)
    - Simplicité d'affichage (accès direct au nom du chantier)

  3. Migration des données existantes
    - Mise à jour automatique des entrées existantes avec les infos des projets
*/

-- Ajouter les nouvelles colonnes
ALTER TABLE timesheet_entries 
ADD COLUMN IF NOT EXISTS project_company_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS project_secondary_companies TEXT[],
ADD COLUMN IF NOT EXISTS project_name TEXT;

-- Mettre à jour les entrées existantes avec les informations des projets
UPDATE timesheet_entries 
SET 
  project_company_id = projects.company_id,
  project_secondary_companies = projects.secondary_companies,
  project_name = projects.name
FROM projects 
WHERE timesheet_entries.project_id = projects.id
  AND timesheet_entries.project_company_id IS NULL;

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project_company_id 
ON timesheet_entries(project_company_id);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_project_name 
ON timesheet_entries(project_name);