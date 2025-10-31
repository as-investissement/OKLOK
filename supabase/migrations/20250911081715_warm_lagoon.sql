-- Script pour investiguer les triggers et policies qui affectent timesheet_entries

-- 1. Lister tous les triggers sur timesheet_entries
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'timesheet_entries'
ORDER BY trigger_name;

-- 2. Lister toutes les fonctions trigger
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND routine_name LIKE '%timesheet%'
ORDER BY routine_name;

-- 3. Vérifier les policies RLS sur timesheet_entries
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'timesheet_entries'
ORDER BY policyname;

-- 4. Chercher des fonctions qui pourraient affecter le statut
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION' 
  AND (routine_definition ILIKE '%status%' OR routine_definition ILIKE '%timesheet_entries%')
ORDER BY routine_name;

-- 5. Vérifier s'il y a des contraintes CHECK sur le statut
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%timesheet%'
ORDER BY constraint_name;