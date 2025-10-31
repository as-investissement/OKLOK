-- Script de vérification des heures totales dans timesheets vs timesheet_entries
-- À exécuter dans le SQL Editor de Supabase (aaayxughfmacudasrwqp)

-- 1. Comparer les heures stockées vs calculées
SELECT
    t.id,
    t.week_starting,
    t.week_ending,
    t.status,
    t.total_hours as stored_total,
    COALESCE(SUM(te.normal_hours + te.overtime_hours), 0) as calculated_total,
    COUNT(te.id) as entry_count,
    CASE
        WHEN t.total_hours = COALESCE(SUM(te.normal_hours + te.overtime_hours), 0) THEN '✅ OK'
        ELSE '❌ DIFFÉRENT'
    END as status_check
FROM timesheets t
LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
GROUP BY t.id, t.week_starting, t.week_ending, t.status, t.total_hours
ORDER BY t.created_at DESC
LIMIT 20;

-- 2. Trouver les timesheets avec des écarts
SELECT
    t.id,
    t.week_starting,
    t.total_hours as stored,
    COALESCE(SUM(te.normal_hours + te.overtime_hours), 0) as calculated,
    (t.total_hours - COALESCE(SUM(te.normal_hours + te.overtime_hours), 0)) as difference
FROM timesheets t
LEFT JOIN timesheet_entries te ON te.timesheet_id = t.id
GROUP BY t.id, t.week_starting, t.total_hours
HAVING t.total_hours != COALESCE(SUM(te.normal_hours + te.overtime_hours), 0)
ORDER BY ABS(t.total_hours - COALESCE(SUM(te.normal_hours + te.overtime_hours), 0)) DESC;

-- 3. Vérifier les triggers existants
SELECT
    t.trigger_name,
    t.event_object_table,
    t.event_manipulation,
    t.action_timing,
    t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_table IN ('timesheets', 'timesheet_entries')
ORDER BY t.event_object_table, t.trigger_name;

-- 4. Si tu veux CORRIGER les heures (à décommenter si nécessaire)
/*
UPDATE timesheets t
SET total_hours = (
    SELECT COALESCE(SUM(te.normal_hours + te.overtime_hours), 0)
    FROM timesheet_entries te
    WHERE te.timesheet_id = t.id
),
updated_at = now()
WHERE t.total_hours != (
    SELECT COALESCE(SUM(te.normal_hours + te.overtime_hours), 0)
    FROM timesheet_entries te
    WHERE te.timesheet_id = t.id
);
*/
