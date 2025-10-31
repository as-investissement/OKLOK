/*
  # Analyse des contraintes de clé étrangère

  1. Diagnostic des contraintes
    - Identifier toutes les FK qui référencent users.id
    - Analyser l'ordre de dépendance
    - Proposer une solution de synchronisation

  2. Contraintes identifiées
    - employees.user_id → users.id (BLOQUE la modification de users.id)
    - timesheet_entries.user_id → users.id
    - timesheets.user_id → users.id
    - user_agreements.user_id → users.id
    - activation_log.user_id → users.id
    - messages.user_id → users.id

  3. Solution proposée
    - Désactiver temporairement les contraintes FK
    - Synchroniser tous les IDs
    - Réactiver les contraintes FK
*/

-- 🔍 DIAGNOSTIC COMPLET DES CONTRAINTES FK
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'users'
    AND ccu.column_name = 'id'
ORDER BY tc.table_name;

-- 🎯 FONCTION POUR SYNCHRONISER LES IDS SANS CASSER LES FK
CREATE OR REPLACE FUNCTION sync_user_auth_id(
  old_user_id UUID,
  new_auth_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Log de début
  RAISE NOTICE '🔄 === DÉBUT SYNCHRONISATION ID ===';
  RAISE NOTICE '🆔 Ancien ID: %', old_user_id;
  RAISE NOTICE '🆔 Nouvel ID Auth: %', new_auth_id;
  
  -- 1. DÉSACTIVER TEMPORAIREMENT LES CONTRAINTES FK
  RAISE NOTICE '🔓 Désactivation des contraintes FK...';
  
  ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;
  ALTER TABLE timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_user_id_fkey;
  ALTER TABLE timesheets DROP CONSTRAINT IF EXISTS timesheets_user_id_fkey;
  ALTER TABLE user_agreements DROP CONSTRAINT IF EXISTS user_agreements_user_id_fkey;
  ALTER TABLE activation_log DROP CONSTRAINT IF EXISTS activation_log_user_id_fkey;
  ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_user_id_fkey;
  ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_from_user_id_fkey;
  ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_invited_by_fkey;
  
  -- 2. METTRE À JOUR TOUS LES user_id DANS L'ORDRE
  RAISE NOTICE '🔄 Mise à jour des user_id dans toutes les tables...';
  
  -- Mettre à jour employees
  UPDATE employees SET user_id = new_auth_id WHERE user_id = old_user_id;
  RAISE NOTICE '✅ employees mis à jour: % lignes', ROW_COUNT;
  
  -- Mettre à jour timesheet_entries
  UPDATE timesheet_entries SET user_id = new_auth_id WHERE user_id = old_user_id;
  RAISE NOTICE '✅ timesheet_entries mis à jour: % lignes', ROW_COUNT;
  
  -- Mettre à jour timesheets
  UPDATE timesheets SET user_id = new_auth_id WHERE user_id = old_user_id;
  RAISE NOTICE '✅ timesheets mis à jour: % lignes', ROW_COUNT;
  
  -- Mettre à jour user_agreements
  UPDATE user_agreements SET user_id = new_auth_id WHERE user_id = old_user_id;
  RAISE NOTICE '✅ user_agreements mis à jour: % lignes', ROW_COUNT;
  
  -- Mettre à jour activation_log
  UPDATE activation_log SET user_id = new_auth_id WHERE user_id = old_user_id;
  RAISE NOTICE '✅ activation_log mis à jour: % lignes', ROW_COUNT;
  
  -- Mettre à jour messages
  UPDATE messages SET user_id = new_auth_id WHERE user_id = old_user_id;
  UPDATE messages SET from_user_id = new_auth_id WHERE from_user_id = old_user_id;
  RAISE NOTICE '✅ messages mis à jour';
  
  -- Mettre à jour user_invitations
  UPDATE user_invitations SET invited_by = new_auth_id WHERE invited_by = old_user_id;
  RAISE NOTICE '✅ user_invitations mis à jour';
  
  -- 3. METTRE À JOUR LA TABLE USERS EN DERNIER
  RAISE NOTICE '🔄 Mise à jour finale de la table users...';
  UPDATE users SET id = new_auth_id WHERE id = old_user_id;
  RAISE NOTICE '✅ users mis à jour: % lignes', ROW_COUNT;
  
  -- 4. RÉACTIVER LES CONTRAINTES FK
  RAISE NOTICE '🔒 Réactivation des contraintes FK...';
  
  ALTER TABLE employees ADD CONSTRAINT employees_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);
    
  ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);
    
  ALTER TABLE timesheets ADD CONSTRAINT timesheets_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);
    
  ALTER TABLE user_agreements ADD CONSTRAINT user_agreements_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id);
    
  ALTER TABLE activation_log ADD CONSTRAINT activation_log_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
  ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    
  ALTER TABLE messages ADD CONSTRAINT messages_from_user_id_fkey 
    FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL;
    
  ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES users(id);
  
  RAISE NOTICE '✅ === SYNCHRONISATION TERMINÉE AVEC SUCCÈS ===';
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Erreur synchronisation: %', SQLERRM;
  
  -- En cas d'erreur, essayer de réactiver les contraintes
  BEGIN
    ALTER TABLE employees ADD CONSTRAINT employees_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id);
    ALTER TABLE timesheet_entries ADD CONSTRAINT timesheet_entries_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id);
    ALTER TABLE timesheets ADD CONSTRAINT timesheets_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id);
    ALTER TABLE user_agreements ADD CONSTRAINT user_agreements_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id);
    ALTER TABLE activation_log ADD CONSTRAINT activation_log_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE messages ADD CONSTRAINT messages_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE messages ADD CONSTRAINT messages_from_user_id_fkey 
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE SET NULL;
    ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_invited_by_fkey 
      FOREIGN KEY (invited_by) REFERENCES users(id);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Erreur réactivation contraintes: %', SQLERRM;
  END;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;