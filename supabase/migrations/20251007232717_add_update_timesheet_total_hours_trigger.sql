/*
  # Add trigger to update timesheet total_hours

  1. New Function
    - `update_timesheet_total_hours()` - Calculates and updates the total_hours in timesheets table
      when timesheet_entries are inserted, updated, or deleted
  
  2. New Trigger
    - `update_timesheet_hours_on_entry_change` - Trigger on timesheet_entries table that fires
      after INSERT, UPDATE, or DELETE operations to recalculate timesheet total hours
  
  3. Purpose
    - Automatically keeps the total_hours in timesheets synchronized with the sum of
      (normal_hours + overtime_hours) from all related timesheet_entries
*/

-- Function to update timesheet total hours
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

-- Create trigger on timesheet_entries
DROP TRIGGER IF EXISTS update_timesheet_hours_on_entry_change ON timesheet_entries;

CREATE TRIGGER update_timesheet_hours_on_entry_change
  AFTER INSERT OR UPDATE OR DELETE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_timesheet_total_hours();
