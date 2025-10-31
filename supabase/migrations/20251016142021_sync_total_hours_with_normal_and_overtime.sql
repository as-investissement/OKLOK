/*
  # Synchroniser total_hours avec normal_hours_total et overtime_hours_total

  1. Objectif
    - Faire en sorte que `total_hours` soit toujours égal à `normal_hours_total + overtime_hours_total`
    - Mettre à jour le trigger existant pour maintenir cette synchronisation

  2. Modifications
    - Modifier la fonction `update_timesheet_total_hours()` pour calculer les 3 colonnes :
      * `total_hours` = somme de (normal_hours + overtime_hours) des entrées
      * `normal_hours_total` = somme de normal_hours des entrées
      * `overtime_hours_total` = somme de overtime_hours des entrées
    - Recalculer toutes les valeurs actuelles pour corriger les incohérences

  3. Sécurité
    - Les triggers se déclenchent automatiquement sur INSERT/UPDATE/DELETE d'entrées
    - Garantit la cohérence des données en permanence
*/

-- Mettre à jour la fonction pour synchroniser les 3 colonnes
CREATE OR REPLACE FUNCTION update_timesheet_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  -- For INSERT and UPDATE, update the timesheet referenced in NEW
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE timesheets
    SET 
      normal_hours_total = (
        SELECT COALESCE(SUM(normal_hours), 0)
        FROM timesheet_entries
        WHERE timesheet_id = NEW.timesheet_id
      ),
      overtime_hours_total = (
        SELECT COALESCE(SUM(overtime_hours), 0)
        FROM timesheet_entries
        WHERE timesheet_id = NEW.timesheet_id
      ),
      total_hours = (
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
    SET 
      normal_hours_total = (
        SELECT COALESCE(SUM(normal_hours), 0)
        FROM timesheet_entries
        WHERE timesheet_id = OLD.timesheet_id
      ),
      overtime_hours_total = (
        SELECT COALESCE(SUM(overtime_hours), 0)
        FROM timesheet_entries
        WHERE timesheet_id = OLD.timesheet_id
      ),
      total_hours = (
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
    SET 
      normal_hours_total = (
        SELECT COALESCE(SUM(normal_hours), 0)
        FROM timesheet_entries
        WHERE timesheet_id = OLD.timesheet_id
      ),
      overtime_hours_total = (
        SELECT COALESCE(SUM(overtime_hours), 0)
        FROM timesheet_entries
        WHERE timesheet_id = OLD.timesheet_id
      ),
      total_hours = (
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

-- Recalculer toutes les valeurs actuelles pour corriger les incohérences
UPDATE timesheets
SET 
  normal_hours_total = (
    SELECT COALESCE(SUM(normal_hours), 0)
    FROM timesheet_entries
    WHERE timesheet_id = timesheets.id
  ),
  overtime_hours_total = (
    SELECT COALESCE(SUM(overtime_hours), 0)
    FROM timesheet_entries
    WHERE timesheet_id = timesheets.id
  ),
  total_hours = (
    SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
    FROM timesheet_entries
    WHERE timesheet_id = timesheets.id
  ),
  updated_at = now();
