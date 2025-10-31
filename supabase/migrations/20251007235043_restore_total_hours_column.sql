/*
  # Restauration de la colonne total_hours et des triggers

  1. Restauration de la colonne
    - Recrée la colonne `total_hours` dans `timesheets`
    - Initialise les valeurs à partir des entrées existantes

  2. Restauration des fonctions et triggers
    - Recrée la fonction `update_timesheet_total_hours()`
    - Recrée le trigger pour maintenir les heures à jour
*/

-- Recréer la colonne total_hours si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'timesheets' AND column_name = 'total_hours'
  ) THEN
    ALTER TABLE timesheets ADD COLUMN total_hours numeric DEFAULT 0;
  END IF;
END $$;

-- Recalculer toutes les heures depuis les entrées
UPDATE timesheets
SET total_hours = (
  SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
  FROM timesheet_entries
  WHERE timesheet_id = timesheets.id
);

-- Recréer la fonction
CREATE OR REPLACE FUNCTION update_timesheet_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT and UPDATE, update the timesheet referenced in NEW
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE timesheets
    SET total_hours = (
      SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
      FROM timesheet_entries
      WHERE timesheet_id = NEW.timesheet_id
    ),
    updated_at = now()
    WHERE id = NEW.timesheet_id;
  END IF;

  -- For DELETE, update the timesheet referenced in OLD
  IF (TG_OP = 'DELETE') THEN
    UPDATE timesheets
    SET total_hours = (
      SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
      FROM timesheet_entries
      WHERE timesheet_id = OLD.timesheet_id
    ),
    updated_at = now()
    WHERE id = OLD.timesheet_id;
  END IF;

  -- For UPDATE, if timesheet_id changed, update both old and new timesheets
  IF (TG_OP = 'UPDATE' AND OLD.timesheet_id IS DISTINCT FROM NEW.timesheet_id) THEN
    UPDATE timesheets
    SET total_hours = (
      SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
      FROM timesheet_entries
      WHERE timesheet_id = OLD.timesheet_id
    ),
    updated_at = now()
    WHERE id = OLD.timesheet_id;
  END IF;

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger
DROP TRIGGER IF EXISTS update_timesheet_hours_on_entry_change ON timesheet_entries;

CREATE TRIGGER update_timesheet_hours_on_entry_change
  AFTER INSERT OR UPDATE OR DELETE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_total_hours();
