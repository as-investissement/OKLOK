/*
  # Correction des policies RLS pour système dual (user_id + auth_id)

  1. Problème identifié
    - Les policies actuelles exigent SEULEMENT auth_id = uid()
    - Mais le code frontend utilise encore user_id
    - Résultat : "row violates row-level security policy"

  2. Solution
    - Modifier toutes les policies pour accepter les DEUX systèmes
    - Permettre auth_id = uid() OU user_id = uid() (pour compatibilité)
    - Transition en douceur sans casser l'existant

  3. Tables concernées
    - timesheets (INSERT, UPDATE, SELECT)
    - timesheet_entries (INSERT, UPDATE, SELECT)
    - messages (INSERT, UPDATE, SELECT)
    - user_agreements (INSERT, UPDATE, SELECT)
    - activation_log (INSERT, SELECT)

  4. Sécurité
    - Maintenir le même niveau de sécurité
    - Permettre la transition progressive vers auth_id
*/

-- =====================================================
-- TIMESHEETS - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "timesheets_insert_own_using_auth_id" ON timesheets;
DROP POLICY IF EXISTS "timesheets_update_own_or_admin_using_auth_id" ON timesheets;
DROP POLICY IF EXISTS "timesheets_select_own_using_auth_id" ON timesheets;

-- CREATE nouvelles policies duales
CREATE POLICY "timesheets_insert_dual_system"
  ON timesheets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheets.user_id))
  );

CREATE POLICY "timesheets_update_dual_system"
  ON timesheets
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheets.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheets.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

CREATE POLICY "timesheets_select_dual_system"
  ON timesheets
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheets.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

-- =====================================================
-- TIMESHEET_ENTRIES - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "timesheet_entries_insert_own_using_auth_id" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_update_own_using_auth_id" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_update_admin_using_auth_id" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_select_own_using_auth_id" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_select_admin_using_auth_id" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_delete_own_draft_using_auth_id" ON timesheet_entries;

-- CREATE nouvelles policies duales
CREATE POLICY "timesheet_entries_insert_dual_system"
  ON timesheet_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheet_entries.user_id))
  );

CREATE POLICY "timesheet_entries_update_dual_system"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheet_entries.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheet_entries.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

CREATE POLICY "timesheet_entries_select_dual_system"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheet_entries.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

CREATE POLICY "timesheet_entries_delete_dual_system"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (
    ((auth_id = auth.uid()) OR (user_id = auth.uid()) OR 
     (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = timesheet_entries.user_id))) 
    AND (status = 'draft')
  );

-- =====================================================
-- MESSAGES - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "Users can view their own messages using auth_id" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages read status using auth_id" ON messages;

-- CREATE nouvelles policies duales
CREATE POLICY "messages_select_dual_system"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = messages.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

CREATE POLICY "messages_update_dual_system"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = messages.user_id))
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = messages.user_id))
  );

-- =====================================================
-- USER_AGREEMENTS - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "Users can manage their own agreements using auth_id" ON user_agreements;

-- CREATE nouvelles policies duales
CREATE POLICY "user_agreements_dual_system"
  ON user_agreements
  FOR ALL
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = user_agreements.user_id))
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = user_agreements.user_id))
  );

-- =====================================================
-- ACTIVATION_LOG - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "Users can view their own activation log using auth_id" ON activation_log;

-- CREATE nouvelles policies duales
CREATE POLICY "activation_log_select_dual_system"
  ON activation_log
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = activation_log.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

-- =====================================================
-- EMPLOYEES - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "Employees viewable by self and admins using auth_id" ON employees;
DROP POLICY IF EXISTS "Employees modifiable by admins only using auth_id" ON employees;

-- CREATE nouvelles policies duales
CREATE POLICY "employees_select_dual_system"
  ON employees
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (user_id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.id = employees.user_id)) OR
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin'))
  );

CREATE POLICY "employees_modify_dual_system"
  ON employees
  FOR ALL
  TO authenticated
  USING (
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin')) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  )
  WITH CHECK (
    (EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role = 'admin')) OR
    (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))
  );

-- =====================================================
-- USERS - Policies duales
-- =====================================================

-- DROP les anciennes policies
DROP POLICY IF EXISTS "Users can insert their own data using auth_id" ON users;
DROP POLICY IF EXISTS "Users can update their own data using auth_id" ON users;
DROP POLICY IF EXISTS "Users can view their own data using auth_id" ON users;

-- CREATE nouvelles policies duales
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
    (id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'))
  )
  WITH CHECK (
    (auth_id = auth.uid()) OR 
    (id = auth.uid()) OR
    (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'))
  );

CREATE POLICY "users_select_dual_system"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    (auth_id = auth.uid()) OR 
    (id = auth.uid()) OR
    (role = 'admin') OR
    (EXISTS (SELECT 1 FROM users u WHERE u.auth_id = auth.uid() AND u.role = 'admin'))
  );

-- =====================================================
-- COMMENTAIRE FINAL
-- =====================================================

-- Cette migration permet la coexistence des deux systèmes :
-- 1. Ancien système : user_id = auth.uid()
-- 2. Nouveau système : auth_id = auth.uid()
-- 
-- Les salariés peuvent maintenant enregistrer leurs heures
-- même si le code frontend n'utilise pas encore auth_id partout