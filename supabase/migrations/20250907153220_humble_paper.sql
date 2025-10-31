/*
  # Ajouter les colonnes manquantes pour les informations complètes des entreprises

  1. Nouvelles colonnes
    - `siret` (text) - Numéro SIRET de l'entreprise
    - `ape_code` (text) - Code APE (Activité Principale Exercée)
    - `phone` (text) - Numéro de téléphone principal
    - `address` (jsonb) - Adresse complète au format JSON
    - `convention_collective` (text) - Convention collective applicable

  2. Index
    - Index sur SIRET pour les recherches
    - Index sur téléphone pour les recherches
    - Index sur logo_url pour les performances

  3. Commentaires
    - Documentation des colonnes pour clarifier leur usage
*/

-- Ajouter la colonne SIRET si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'siret'
  ) THEN
    ALTER TABLE companies ADD COLUMN siret text;
    COMMENT ON COLUMN companies.siret IS 'Numéro SIRET de l''entreprise';
  END IF;
END $$;

-- Ajouter la colonne code APE si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'ape_code'
  ) THEN
    ALTER TABLE companies ADD COLUMN ape_code text;
    COMMENT ON COLUMN companies.ape_code IS 'Code APE (Activité Principale Exercée)';
  END IF;
END $$;

-- Ajouter la colonne téléphone si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'phone'
  ) THEN
    ALTER TABLE companies ADD COLUMN phone text;
    COMMENT ON COLUMN companies.phone IS 'Numéro de téléphone principal';
  END IF;
END $$;

-- Ajouter la colonne adresse si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'address'
  ) THEN
    ALTER TABLE companies ADD COLUMN address jsonb;
    COMMENT ON COLUMN companies.address IS 'Adresse complète au format JSON';
  END IF;
END $$;

-- Ajouter la colonne convention collective si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'convention_collective'
  ) THEN
    ALTER TABLE companies ADD COLUMN convention_collective text;
    COMMENT ON COLUMN companies.convention_collective IS 'Convention collective applicable';
  END IF;
END $$;

-- Créer les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_companies_siret ON companies USING btree (siret);
CREATE INDEX IF NOT EXISTS idx_companies_phone ON companies USING btree (phone);
CREATE INDEX IF NOT EXISTS idx_companies_logo_url ON companies USING btree (logo_url);