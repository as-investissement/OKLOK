-- 🔧 SCRIPT SQL MANUEL À EXÉCUTER DANS SUPABASE
-- Copiez-collez ce script dans le SQL Editor de Supabase

-- ===== ÉTAPE 1: AJOUTER LES COLONNES =====
ALTER TABLE timesheet_entries 
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS approval_comment text,
ADD COLUMN IF NOT EXISTS decision_by uuid,
ADD COLUMN IF NOT EXISTS decision_at timestamptz;

-- ===== ÉTAPE 2: AJOUTER LES INDEX =====
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_decision_by 
ON timesheet_entries(decision_by);

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_decision_at 
ON timesheet_entries(decision_at);

-- ===== ÉTAPE 3: AJOUTER LA FOREIGN KEY =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'timesheet_entries_decision_by_fkey'
  ) THEN
    ALTER TABLE timesheet_entries 
    ADD CONSTRAINT timesheet_entries_decision_by_fkey 
    FOREIGN KEY (decision_by) REFERENCES users(id);
  END IF;
END $$;

-- ===== ÉTAPE 4: VÉRIFICATION =====
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'timesheet_entries' 
AND column_name IN ('rejection_reason', 'approval_comment', 'decision_by', 'decision_at')
ORDER BY column_name;