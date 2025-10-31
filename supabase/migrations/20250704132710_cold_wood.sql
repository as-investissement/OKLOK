/*
  # Add secondary_companies column to projects table

  1. Changes
    - Add `secondary_companies` column as text array to store multiple company IDs
    - Update `address` column type from text to jsonb for structured address data

  2. Security
    - Maintain existing RLS policies
*/

-- Add secondary_companies column to projects table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'secondary_companies'
  ) THEN
    ALTER TABLE projects ADD COLUMN secondary_companies text[];
  END IF;
END $$;

-- Update address column type to jsonb if it's currently text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' 
    AND column_name = 'address' 
    AND data_type = 'text'
  ) THEN
    ALTER TABLE projects ALTER COLUMN address TYPE jsonb USING address::jsonb;
  END IF;
END $$;