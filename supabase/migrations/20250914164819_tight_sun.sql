/*
  # Corriger la récursion infinie dans les policies RLS

  1. Problème identifié
    - Les policies utilisent des EXISTS qui référencent la table users
    - Cela crée une récursion infinie quand la policy users essaie de se requêter elle-même

  2. Solution
    - Simplifier les policies pour éviter les références circulaires
    - Utiliser des conditions directes sans EXISTS sur la même table
    - Garder le système dual (auth_id OU user_id) mais sans récursion

  3. Tables concernées
    - users (récursion infinie)
    - timesheets, timesheet_entries, employees, etc.
*/

-- =============================================
-- CORRIGER LES POLICIES USERS (RÉCURSION INFINIE)
-- =============================================

-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "users_select_dual_system" ON users;
DROP POLICY IF EXISTS "users_insert_dual_system" ON users;
DROP POLICY IF EXISTS "users_update_dual_system" ON users;

-- Recréer les policies SANS récursion
CREATE POLICY "users_select_dual_system"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (id = auth.uid()) OR 
    (role = 'admin'::text)
  );

CREATE POLICY "users_insert_dual_system"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (id = auth.uid())
  );

CREATE POLICY "users_update_dual_system"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (id = auth.uid())
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (id = auth.uid())
  );

-- =============================================
-- CORRIGER LES AUTRES POLICIES (SIMPLIFIER)
-- =============================================

-- TIMESHEETS
DROP POLICY IF EXISTS "timesheets_select_dual_system" ON timesheets;
DROP POLICY IF EXISTS "timesheets_insert_dual_system" ON timesheets;
DROP POLICY IF EXISTS "timesheets_update_dual_system" ON timesheets;

CREATE POLICY "timesheets_select_dual_system"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

CREATE POLICY "timesheets_insert_dual_system"
  ON timesheets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

CREATE POLICY "timesheets_update_dual_system"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

-- TIMESHEET_ENTRIES
DROP POLICY IF EXISTS "timesheet_entries_select_dual_system" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_insert_dual_system" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_update_dual_system" ON timesheet_entries;

CREATE POLICY "timesheet_entries_select_dual_system"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

CREATE POLICY "timesheet_entries_insert_dual_system"
  ON timesheet_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

CREATE POLICY "timesheet_entries_update_dual_system"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

-- EMPLOYEES
DROP POLICY IF EXISTS "employees_select_dual_system" ON employees;

CREATE POLICY "employees_select_dual_system"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

-- MESSAGES
DROP POLICY IF EXISTS "messages_select_dual_system" ON messages;
DROP POLICY IF EXISTS "messages_update_dual_system" ON messages;

CREATE POLICY "messages_select_dual_system"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

CREATE POLICY "messages_update_dual_system"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

-- USER_AGREEMENTS
DROP POLICY IF EXISTS "user_agreements_dual_system" ON user_agreements;

CREATE POLICY "user_agreements_dual_system"
  ON user_agreements
  FOR ALL
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );

-- ACTIVATION_LOG
DROP POLICY IF EXISTS "activation_log_select_dual_system" ON activation_log;

CREATE POLICY "activation_log_select_dual_system"
  ON activation_log
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid())
  );