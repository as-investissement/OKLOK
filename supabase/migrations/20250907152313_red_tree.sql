/*
  # Support complet des logos d'entreprise

  1. Colonnes ajoutées/vérifiées
    - `logo_url` (text) - URL du logo de l'entreprise
    - `siret` (text) - Numéro SIRET de l'entreprise
    - `ape_code` (text) - Code APE de l'entreprise
    - `phone` (text) - Téléphone de l'entreprise
    - `address` (jsonb) - Adresse complète de l'entreprise
    - `convention_collective` (text) - Convention collective applicable

  2. Sécurité
    - Maintien des politiques RLS existantes
    - Aucune modification des permissions

  3. Fonctionnalités
    - Support complet des logos avec persistance
    - Informations légales complètes pour chaque entreprise
*/

-- Ajouter les colonnes manquantes si elles n'existent pas déjà
DO $$
BEGIN
  -- Vérifier et ajouter logo_url si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE companies ADD COLUMN logo_url text;
  END IF;

  -- Vérifier et ajouter siret si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'siret'
  ) THEN
    ALTER TABLE companies ADD COLUMN siret text;
  END IF;

  -- Vérifier et ajouter ape_code si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'ape_code'
  ) THEN
    ALTER TABLE companies ADD COLUMN ape_code text;
  END IF;

  -- Vérifier et ajouter phone si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'phone'
  ) THEN
    ALTER TABLE companies ADD COLUMN phone text;
  END IF;

  -- Vérifier et ajouter address si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'address'
  ) THEN
    ALTER TABLE companies ADD COLUMN address jsonb;
  END IF;

  -- Vérifier et ajouter convention_collective si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'convention_collective'
  ) THEN
    ALTER TABLE companies ADD COLUMN convention_collective text;
  END IF;
END $$;

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_companies_logo_url ON companies(logo_url);
CREATE INDEX IF NOT EXISTS idx_companies_siret ON companies(siret);
CREATE INDEX IF NOT EXISTS idx_companies_phone ON companies(phone);

-- Commentaires pour documenter les colonnes
COMMENT ON COLUMN companies.logo_url IS 'URL du logo de l''entreprise (ex: /logos/mon-logo.png)';
COMMENT ON COLUMN companies.siret IS 'Numéro SIRET de l''entreprise';
COMMENT ON COLUMN companies.ape_code IS 'Code APE (Activité Principale Exercée)';
COMMENT ON COLUMN companies.phone IS 'Numéro de téléphone principal';
COMMENT ON COLUMN companies.address IS 'Adresse complète au format JSON';
COMMENT ON COLUMN companies.convention_collective IS 'Convention collective applicable';