/*
  # Validation par jour - Nouvelle structure

  1. Nouvelle table
    - `timesheet_days`
      - `id` (uuid, primary key)
      - `timesheet_id` (uuid, foreign key)
      - `date` (date)
      - `total_hours` (numeric)
      - `normal_hours` (numeric)
      - `overtime_hours` (numeric)
      - `status` (text: PENDING|APPROVED|REJECTED)
      - `decision_by` (uuid, foreign key vers users)
      - `decision_at` (timestamp)
      - `decision_comment` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `timesheet_days`
    - Politiques pour lecture/écriture selon les rôles

  3. Fonctions
    - Fonction pour calculer automatiquement le statut de la semaine
    - Trigger pour recalculer le statut semaine quand un jour change
*/

-- Créer la table timesheet_days
CREATE TABLE IF NOT EXISTS timesheet_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timesheet_id uuid NOT NULL REFERENCES timesheets(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_hours numeric(4,2) DEFAULT 0,
  normal_hours numeric(4,2) DEFAULT 0,
  overtime_hours numeric(4,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decision_by uuid REFERENCES users(id),
  decision_at timestamptz,
  decision_comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(timesheet_id, date)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_timesheet_days_timesheet_id ON timesheet_days(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_timesheet_days_date ON timesheet_days(date);
CREATE INDEX IF NOT EXISTS idx_timesheet_days_status ON timesheet_days(status);

-- Enable RLS
ALTER TABLE timesheet_days ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour timesheet_days
CREATE POLICY "Users can view their own timesheet days"
  ON timesheet_days
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM timesheets 
      WHERE timesheets.id = timesheet_days.timesheet_id 
      AND timesheets.user_id = auth.uid()
    )
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update timesheet days"
  ON timesheet_days
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can insert their own timesheet days"
  ON timesheet_days
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM timesheets 
      WHERE timesheets.id = timesheet_days.timesheet_id 
      AND timesheets.user_id = auth.uid()
    )
  );

-- Fonction pour calculer le statut de la semaine basé sur les jours
CREATE OR REPLACE FUNCTION calculate_timesheet_status(timesheet_id_param uuid)
RETURNS text AS $$
DECLARE
  total_days integer;
  approved_days integer;
  rejected_days integer;
  pending_days integer;
BEGIN
  -- Compter les jours par statut
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
    COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending
  INTO total_days, approved_days, rejected_days, pending_days
  FROM timesheet_days 
  WHERE timesheet_id = timesheet_id_param;

  -- Si aucun jour, retourner PENDING
  IF total_days = 0 THEN
    RETURN 'PENDING';
  END IF;

  -- Si tous les jours sont approuvés
  IF approved_days = total_days THEN
    RETURN 'APPROVED';
  END IF;

  -- Si au moins un jour est rejeté et aucun en attente
  IF rejected_days > 0 AND pending_days = 0 THEN
    RETURN 'REJECTED';
  END IF;

  -- Sinon, il reste des jours en attente
  RETURN 'PENDING';
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer automatiquement le statut de la semaine
CREATE OR REPLACE FUNCTION update_timesheet_status_from_days()
RETURNS trigger AS $$
BEGIN
  -- Recalculer le statut de la semaine
  UPDATE timesheets 
  SET 
    status = calculate_timesheet_status(COALESCE(NEW.timesheet_id, OLD.timesheet_id)),
    updated_at = now()
  WHERE id = COALESCE(NEW.timesheet_id, OLD.timesheet_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS update_timesheet_status_trigger ON timesheet_days;
CREATE TRIGGER update_timesheet_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON timesheet_days
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_status_from_days();

-- Trigger pour updated_at
CREATE TRIGGER handle_timesheet_days_updated_at
  BEFORE UPDATE ON timesheet_days
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Migrer les données existantes vers timesheet_days
INSERT INTO timesheet_days (timesheet_id, date, total_hours, normal_hours, overtime_hours, status)
SELECT DISTINCT
  te.timesheet_id,
  te.date,
  SUM(te.normal_hours + te.overtime_hours) as total_hours,
  SUM(te.normal_hours) as normal_hours,
  SUM(te.overtime_hours) as overtime_hours,
  CASE 
    WHEN te.status = 'approved' THEN 'APPROVED'
    WHEN te.status = 'rejected' THEN 'REJECTED'
    WHEN te.status = 'pending' THEN 'PENDING'
    ELSE 'PENDING'
  END as status
FROM timesheet_entries te
GROUP BY te.timesheet_id, te.date, te.status
ON CONFLICT (timesheet_id, date) DO NOTHING;

-- Recalculer tous les statuts de semaine
UPDATE timesheets 
SET status = calculate_timesheet_status(id)
WHERE id IN (SELECT DISTINCT timesheet_id FROM timesheet_days);