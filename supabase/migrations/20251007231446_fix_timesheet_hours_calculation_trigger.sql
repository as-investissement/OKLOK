/*
  # Fix Timesheet Hours Calculation Trigger
  
  1. Problème
    - Le trigger actuel ne fonctionne pas pour les DELETE car il utilise NEW.timesheet_id
    - NEW n'existe pas dans un DELETE, seulement OLD existe
  
  2. Solution
    - Modifier la fonction pour gérer NEW et OLD selon l'opération
    - Utiliser COALESCE pour prendre NEW ou OLD selon la disponibilité
*/

-- Recréer la fonction avec la correction
CREATE OR REPLACE FUNCTION public.calculate_timesheet_hours()
RETURNS TRIGGER AS $$
DECLARE
  target_timesheet_id uuid;
BEGIN
  -- Déterminer l'ID de la feuille de temps selon l'opération
  IF TG_OP = 'DELETE' THEN
    target_timesheet_id := OLD.timesheet_id;
  ELSE
    target_timesheet_id := NEW.timesheet_id;
  END IF;
  
  -- Mettre à jour le total des heures
  UPDATE timesheets
  SET total_hours = (
    SELECT COALESCE(SUM(normal_hours + overtime_hours), 0)
    FROM timesheet_entries
    WHERE timesheet_id = target_timesheet_id
  )
  WHERE id = target_timesheet_id;
  
  -- Retourner selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Le trigger existe déjà, pas besoin de le recréer
-- CREATE TRIGGER calculate_timesheet_hours
--   AFTER INSERT OR UPDATE OR DELETE ON timesheet_entries
--   FOR EACH ROW
--   EXECUTE FUNCTION calculate_timesheet_hours();
