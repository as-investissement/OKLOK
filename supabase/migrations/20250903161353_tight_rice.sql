/*
  # Ajouter la colonne date d'embauche à la table users

  1. Modifications de la table
    - Ajouter la colonne `hire_date` (date) à la table `users`
    - Colonne optionnelle pour permettre la migration des données existantes
    - Index pour optimiser les requêtes sur la date d'embauche

  2. Sécurité
    - Aucune modification des politiques RLS nécessaire
    - La colonne hérite des politiques existantes de la table users
*/

-- Ajouter la colonne hire_date à la table users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'hire_date'
  ) THEN
    ALTER TABLE users ADD COLUMN hire_date date;
    
    -- Ajouter un commentaire pour documenter la colonne
    COMMENT ON COLUMN users.hire_date IS 'Date d''embauche de l''utilisateur';
    
    -- Créer un index pour optimiser les requêtes sur la date d'embauche
    CREATE INDEX IF NOT EXISTS idx_users_hire_date ON users(hire_date);
    
    -- Log de confirmation
    RAISE NOTICE 'Colonne hire_date ajoutée à la table users avec succès';
  ELSE
    RAISE NOTICE 'La colonne hire_date existe déjà dans la table users';
  END IF;
END $$;