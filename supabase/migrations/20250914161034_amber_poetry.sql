/*
  # Correction des policies RLS pour utiliser auth_id

  1. Mise à jour des policies
    - Remplacer toutes les références à `id = uid()` par `auth_id = uid()`
    - Assurer la cohérence dans toutes les tables
  
  2. Tables concernées
    - users
    - employees  
    - timesheets
    - timesheet_entries
    - user_agreements
    - activation_log
    - messages
*/

-- ===== TABLE USERS =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "users_select_self" ON users;
DROP POLICY IF EXISTS "users_update_self" ON users;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "Users can insert their own data using auth_id"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "Users can view their own data using auth_id"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid() OR role = 'admin'::text);

CREATE POLICY "Users can update their own data using auth_id"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ===== TABLE EMPLOYEES =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Employees viewable by self and admins" ON employees;
DROP POLICY IF EXISTS "Employees modifiable by admins only" ON employees;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "Employees viewable by self and admins using auth_id"
  ON employees
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text
  ));

CREATE POLICY "Employees modifiable by admins only using auth_id"
  ON employees
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text
  ));

-- ===== TABLE TIMESHEETS =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "timesheets_select_own" ON timesheets;
DROP POLICY IF EXISTS "timesheets_insert_own" ON timesheets;
DROP POLICY IF EXISTS "timesheets_update_own_or_admin" ON timesheets;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "timesheets_select_own_using_auth_id"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "timesheets_insert_own_using_auth_id"
  ON timesheets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "timesheets_update_own_or_admin_using_auth_id"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text AND users.company_id = timesheets.company_id
  ))
  WITH CHECK (auth_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text AND users.company_id = timesheets.company_id
  ));

-- ===== TABLE TIMESHEET_ENTRIES =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "timesheet_entries_select_own" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_insert_own" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_update_own" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_select_own_or_company_admin" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_update_own_or_company_admin" ON timesheet_entries;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "timesheet_entries_select_own_using_auth_id"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "timesheet_entries_select_admin_using_auth_id"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text
  ));

CREATE POLICY "timesheet_entries_insert_own_using_auth_id"
  ON timesheet_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "timesheet_entries_update_own_using_auth_id"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

CREATE POLICY "timesheet_entries_update_admin_using_auth_id"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_id = auth.uid() AND users.role = 'admin'::text
  ));

CREATE POLICY "timesheet_entries_delete_own_draft_using_auth_id"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (auth_id = auth.uid() AND status = 'draft'::text);

-- ===== TABLE USER_AGREEMENTS =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can manage their own agreements" ON user_agreements;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "Users can manage their own agreements using auth_id"
  ON user_agreements
  FOR ALL
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ===== TABLE ACTIVATION_LOG =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own activation log" ON activation_log;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "Users can view their own activation log using auth_id"
  ON activation_log
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

-- ===== TABLE MESSAGES =====
-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages read status" ON messages;

-- Créer les nouvelles policies avec auth_id
CREATE POLICY "Users can view their own messages using auth_id"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Users can update their own messages read status using auth_id"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ===== FONCTION IS_ADMIN MISE À JOUR =====
-- Recréer la fonction is_admin pour utiliser auth_id
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE auth_id = auth.uid() 
    AND role = 'admin'
  );
END;
$$;