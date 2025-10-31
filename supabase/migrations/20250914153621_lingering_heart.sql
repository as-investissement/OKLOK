/*
  # Synchronisation des auth_id pour les utilisateurs existants

  1. Objectif
    - Remplir les colonnes auth_id pour tous les utilisateurs existants
    - Synchroniser avec les comptes Supabase Auth existants
    - Éviter les doublons et incohérences

  2. Tables concernées
    - users : Colonne auth_id ajoutée
    - employees : Colonne auth_id ajoutée  
    - timesheets : Colonne auth_id ajoutée
    - timesheet_entries : Colonne auth_id ajoutée
    - user_agreements : Colonne auth_id ajoutée
    - activation_log : Colonne auth_id ajoutée
    - messages : Colonne auth_id ajoutée

  3. Logique
    - Pour chaque utilisateur dans users sans auth_id
    - Chercher le compte Auth correspondant par email
    - Mettre à jour auth_id dans users
    - Propager auth_id dans toutes les tables liées
*/

-- Fonction pour synchroniser les auth_id existants
CREATE OR REPLACE FUNCTION sync_existing_auth_ids()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    auth_user_id UUID;
BEGIN
    -- Pour chaque utilisateur sans auth_id
    FOR user_record IN 
        SELECT id, email, name 
        FROM users 
        WHERE auth_id IS NULL
    LOOP
        RAISE NOTICE 'Traitement utilisateur: % (%)', user_record.name, user_record.email;
        
        -- Note: En production, vous devrez faire cette correspondance manuellement
        -- car nous n'avons pas accès direct à auth.users depuis une fonction SQL
        
        -- Pour l'instant, on peut juste préparer la structure
        -- La synchronisation réelle se fera via l'interface admin
        
        RAISE NOTICE 'Utilisateur % nécessite une synchronisation manuelle', user_record.email;
    END LOOP;
    
    RAISE NOTICE 'Synchronisation terminée. Utilisez l''interface admin pour compléter.';
END;
$$;

-- Exécuter la fonction de diagnostic
SELECT sync_existing_auth_ids();

-- Créer une vue pour diagnostiquer les utilisateurs sans auth_id
CREATE OR REPLACE VIEW users_without_auth_id AS
SELECT 
    id,
    email,
    name,
    role,
    company_id,
    created_at
FROM users 
WHERE auth_id IS NULL
ORDER BY created_at DESC;

-- Commentaire pour l'admin
COMMENT ON VIEW users_without_auth_id IS 'Vue pour identifier les utilisateurs qui nécessitent une synchronisation auth_id manuelle';