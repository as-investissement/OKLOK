/*
  # Nettoyage complet des policies RLS pour timesheet_entries

  1. Suppression de toutes les policies existantes
  2. Création de policies claires et non-conflictuelles
  3. Permissions simplifiées et fonctionnelles

  ## Nouvelles policies
  - Utilisateurs : peuvent modifier leurs propres entrées (tous statuts)
  - Admins : peuvent modifier toutes les entrées de leur entreprise
*/

-- 🧹 ÉTAPE 1: SUPPRIMER TOUTES LES POLICIES EXISTANTES
DROP POLICY IF EXISTS "Users can insert their own timesheet entries" ON timesheet_entries;
DROP POLICY IF EXISTS "Users can update their own pending entries" ON timesheet_entries;
DROP POLICY IF EXISTS "Users can update their own draft entries" ON timesheet_entries;
DROP POLICY IF EXISTS "Users can view their own timesheet entries" ON timesheet_entries;
DROP POLICY IF EXISTS "Admins can view company timesheets" ON timesheet_entries;
DROP POLICY IF EXISTS "Admins can update any company timesheets" ON timesheet_entries;

-- 🔧 ÉTAPE 2: CRÉER DES POLICIES CLAIRES ET SIMPLES

-- Policy 1: Insertion (utilisateurs peuvent créer leurs propres entrées)
CREATE POLICY "timesheet_entries_insert_own"
  ON timesheet_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Lecture (utilisateurs voient leurs entrées + admins voient tout)
CREATE POLICY "timesheet_entries_select"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = (
        SELECT timesheets.company_id 
        FROM timesheets 
        WHERE timesheets.id = timesheet_entries.timesheet_id
      )
    )
  );

-- Policy 3: Mise à jour (SIMPLE ET PERMISSIVE)
CREATE POLICY "timesheet_entries_update_own"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Mise à jour admin (admins peuvent tout modifier)
CREATE POLICY "timesheet_entries_update_admin"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = (
        SELECT timesheets.company_id 
        FROM timesheets 
        WHERE timesheets.id = timesheet_entries.timesheet_id
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = (
        SELECT timesheets.company_id 
        FROM timesheets 
        WHERE timesheets.id = timesheet_entries.timesheet_id
      )
    )
  );

-- Policy 5: Suppression (utilisateurs peuvent supprimer leurs propres entrées en draft)
CREATE POLICY "timesheet_entries_delete_own_draft"
  ON timesheet_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'draft');