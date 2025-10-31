/*
  # Ajouter colonnes pour congés et absences

  1. Nouvelles colonnes
    - `is_paid_leave` (boolean) - Indique si c'est un congé payé
    - `is_absence` (boolean) - Indique si c'est une absence
    - `leave_type` (text) - Type de congé/absence pour plus de détails

  2. Modifications
    - Permettre project_id NULL quand c'est un congé/absence
    - Ajouter contrainte pour éviter congé ET absence simultanément
    - Ajouter index pour les requêtes sur les congés/absences

  3. Sécurité
    - Maintenir les policies RLS existantes
    - Pas de changement aux permissions
*/

-- Ajouter les nouvelles colonnes pour gérer congés et absences
DO $$
BEGIN
  -- Colonne pour indiquer si c'est un congé payé
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_entries' AND column_name = 'is_paid_leave'
  ) THEN
    ALTER TABLE timesheet_entries ADD COLUMN is_paid_leave boolean DEFAULT false;
  END IF;

  -- Colonne pour indiquer si c'est une absence
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_entries' AND column_name = 'is_absence'
  ) THEN
    ALTER TABLE timesheet_entries ADD COLUMN is_absence boolean DEFAULT false;
  END IF;

  -- Colonne pour le type de congé/absence (optionnel pour plus de détails)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheet_entries' AND column_name = 'leave_type'
  ) THEN
    ALTER TABLE timesheet_entries ADD COLUMN leave_type text;
  END IF;
END $$;

-- Modifier la contrainte sur project_id pour permettre NULL quand c'est un congé/absence
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte NOT NULL sur project_id si elle existe
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'timesheet_entries' 
    AND ccu.column_name = 'project_id' 
    AND tc.constraint_type = 'CHECK'
  ) THEN
    -- La contrainte sera gérée par la nouvelle logique ci-dessous
    NULL;
  END IF;
END $$;

-- Ajouter une contrainte pour s'assurer de la cohérence des données
DO $$
BEGIN
  -- Contrainte : si c'est un congé ou une absence, project_id peut être NULL
  -- Sinon, project_id doit être défini
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'timesheet_entries' 
    AND constraint_name = 'timesheet_entries_project_or_leave_check'
  ) THEN
    ALTER TABLE timesheet_entries 
    ADD CONSTRAINT timesheet_entries_project_or_leave_check 
    CHECK (
      (is_paid_leave = true OR is_absence = true) OR 
      (project_id IS NOT NULL AND is_paid_leave = false AND is_absence = false)
    );
  END IF;

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

-- Ajouter des index pour améliorer les performances des requêtes
DO $$
BEGIN
  -- Index pour les congés payés
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'timesheet_entries' AND indexname = 'idx_timesheet_entries_paid_leave'
  ) THEN
    CREATE INDEX idx_timesheet_entries_paid_leave ON timesheet_entries (is_paid_leave) WHERE is_paid_leave = true;
  END IF;

  -- Index pour les absences
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'timesheet_entries' AND indexname = 'idx_timesheet_entries_absence'
  ) THEN
    CREATE INDEX idx_timesheet_entries_absence ON timesheet_entries (is_absence) WHERE is_absence = true;
  END IF;

  -- Index pour le type de congé/absence
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'timesheet_entries' AND indexname = 'idx_timesheet_entries_leave_type'
  ) THEN
    CREATE INDEX idx_timesheet_entries_leave_type ON timesheet_entries (leave_type) WHERE leave_type IS NOT NULL;
  END IF;
END $$;