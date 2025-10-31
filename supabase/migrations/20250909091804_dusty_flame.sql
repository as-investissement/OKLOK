/*
  # Remove validation trigger for flexible day submissions

  1. Problem Resolution
    - Remove `validate_timesheet_hours` trigger that blocks day-level submissions
    - Allow timesheet entries to have 'pending' status while parent timesheet is 'draft'
    - Enable independent day-by-day submission workflow

  2. Impact
    - Employees can submit individual days without submitting entire week
    - Admins can approve/reject days as they come in
    - Maintains data integrity through application logic instead of database constraints

  3. Safety
    - Only removes validation trigger, keeps calculation and timestamp triggers
    - No data loss or schema changes
    - Reversible if needed
*/

-- Remove the validation trigger that prevents flexible day submissions
DROP TRIGGER IF EXISTS validate_timesheet_hours ON public.timesheet_entries;

-- Keep the other useful triggers:
-- - calculate_timesheet_hours (recalculates totals)
-- - handle_timesheet_entries_updated_at (updates timestamps)

-- Add a comment for future reference
COMMENT ON TABLE public.timesheet_entries IS 'Timesheet entries with flexible day-level status management. Validation trigger removed to allow independent day submissions.';