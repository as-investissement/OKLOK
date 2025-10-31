/*
  # Add Database Functions and Triggers

  1. Functions
    - update_updated_at: Updates timestamps automatically
    - calculate_timesheet_hours: Calculates total hours for timesheets
    - validate_timesheet_dates: Validates timesheet date ranges
    - validate_timesheet_hours: Validates daily hours limits

  2. Triggers
    - Automatic timestamp updates
    - Automatic total hours calculation
    - Date range validation
    - Hours limit validation
*/

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate timesheet hours
CREATE OR REPLACE FUNCTION public.calculate_timesheet_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE timesheets
  SET total_hours = (
    SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
    FROM timesheet_entries
    WHERE timesheet_id = NEW.timesheet_id
  )
  WHERE id = NEW.timesheet_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate timesheet dates
CREATE OR REPLACE FUNCTION public.validate_timesheet_dates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.week_ending <= NEW.week_starting THEN
    RAISE EXCEPTION 'Week ending date must be after week starting date';
  END IF;
  
  IF NEW.week_ending - NEW.week_starting != 6 THEN
    RAISE EXCEPTION 'Timesheet must cover exactly 7 days';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate daily hours
CREATE OR REPLACE FUNCTION public.validate_timesheet_hours()
RETURNS TRIGGER AS $$
DECLARE
  daily_normal_hours NUMERIC;
  daily_overtime_hours NUMERIC;
BEGIN
  -- Calculate total normal hours for the day
  SELECT COALESCE(SUM(normal_hours), 0)
  INTO daily_normal_hours
  FROM timesheet_entries
  WHERE user_id = NEW.user_id
    AND date = NEW.date
    AND id != NEW.id;
    
  -- Calculate total overtime hours for the day
  SELECT COALESCE(SUM(overtime_hours), 0)
  INTO daily_overtime_hours
  FROM timesheet_entries
  WHERE user_id = NEW.user_id
    AND date = NEW.date
    AND id != NEW.id;
    
  -- Check limits
  IF (daily_normal_hours + NEW.normal_hours) > 8 THEN
    RAISE EXCEPTION 'Total normal hours per day cannot exceed 8 hours';
  END IF;
  
  IF (daily_overtime_hours + NEW.overtime_hours) > 10 THEN
    RAISE EXCEPTION 'Total overtime hours per day cannot exceed 10 hours';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE TRIGGER handle_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_timesheets_updated_at
  BEFORE UPDATE ON timesheets
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_timesheet_entries_updated_at
  BEFORE UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- Create trigger for timesheet hours calculation
CREATE TRIGGER calculate_timesheet_hours
  AFTER INSERT OR UPDATE OR DELETE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_timesheet_hours();

-- Create trigger for timesheet date validation
CREATE TRIGGER validate_timesheet_dates
  BEFORE INSERT OR UPDATE ON timesheets
  FOR EACH ROW
  EXECUTE FUNCTION validate_timesheet_dates();

-- Create trigger for timesheet hours validation
CREATE TRIGGER validate_timesheet_hours
  BEFORE INSERT OR UPDATE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_timesheet_hours();