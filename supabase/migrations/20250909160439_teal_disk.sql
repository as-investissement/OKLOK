/*
  # Ajouter company_id à timesheet_entries

  1. Modifications de structure
    - Ajouter colonne `company_id` à `timesheet_entries`
    - Peupler avec l'entreprise du salarié (`users.company_id`)
    - Ajouter contrainte FK vers `companies`

  2. Sécurité
    - Supprimer les anciennes policies qui référencent `timesheets`
    - Créer nouvelles policies basées sur `company_id`
    - Permettre aux admins de voir les entrées de leur entreprise

  3. Performance
    - Ajouter index sur `company_id`
*/

-- ÉTAPE 1: Ajouter la colonne company_id si elle n'existe pas
DO $$
BEGIN
  -- Vérifier si la colonne existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timesheet_entries' 
    AND column_name = 'company_id'
    AND table_schema = 'public'
  ) THEN
    -- Ajouter la colonne
    ALTER TABLE timesheet_entries ADD COLUMN company_id uuid;
    RAISE NOTICE 'Colonne company_id ajoutée à timesheet_entries';
  ELSE
    RAISE NOTICE 'Colonne company_id existe déjà dans timesheet_entries';
  END IF;
END $$;

-- ÉTAPE 2: Peupler la colonne avec l'entreprise du salarié
UPDATE timesheet_entries 
SET company_id = users.company_id
FROM users 
WHERE users.id = timesheet_entries.user_id 
AND timesheet_entries.company_id IS NULL;

-- ÉTAPE 3: Ajouter la contrainte de clé étrangère si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'timesheet_entries_company_id_fkey'
    AND table_name = 'timesheet_entries'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE timesheet_entries 
    ADD CONSTRAINT timesheet_entries_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES companies(id);
    RAISE NOTICE 'Contrainte FK company_id ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte FK company_id existe déjà';
  END IF;
END $$;

-- ÉTAPE 4: Ajouter un index pour les performances
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_company_id 
ON timesheet_entries(company_id);

-- ÉTAPE 5: Supprimer les anciennes policies qui référencent 'timesheets'
DROP POLICY IF EXISTS "timesheet_entries_select_own_or_admin" ON timesheet_entries;
DROP POLICY IF EXISTS "timesheet_entries_update_admin" ON timesheet_entries;

-- ÉTAPE 6: Créer les nouvelles policies basées sur company_id
CREATE POLICY "timesheet_entries_select_own_or_company_admin"
  ON timesheet_entries
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = timesheet_entries.company_id
    ))
  );

CREATE POLICY "timesheet_entries_update_own_or_company_admin"
  ON timesheet_entries
  FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR 
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = timesheet_entries.company_id
    ))
  )
  WITH CHECK (
    (auth.uid() = user_id) OR 
    (EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
      AND users.company_id = timesheet_entries.company_id
    ))
  );

-- ÉTAPE 7: Vérification finale
DO $$
DECLARE
  column_exists boolean;
  entries_count integer;
  populated_count integer;
BEGIN
  -- Vérifier que la colonne existe
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'timesheet_entries' 
    AND column_name = 'company_id'
    AND table_schema = 'public'
  ) INTO column_exists;
  
  -- Compter les entrées
  SELECT COUNT(*) FROM timesheet_entries INTO entries_count;
  SELECT COUNT(*) FROM timesheet_entries WHERE company_id IS NOT NULL INTO populated_count;
  
  RAISE NOTICE '=== VÉRIFICATION FINALE ===';
  RAISE NOTICE 'Colonne company_id existe: %', column_exists;
  RAISE NOTICE 'Total entrées: %', entries_count;
  RAISE NOTICE 'Entrées avec company_id: %', populated_count;
  
  IF column_exists AND entries_count = populated_count THEN
    RAISE NOTICE '✅ MIGRATION RÉUSSIE !';
  ELSE
    RAISE NOTICE '❌ PROBLÈME DÉTECTÉ !';
  END IF;
END $$;