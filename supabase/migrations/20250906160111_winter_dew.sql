/*
  # Add missing updated_at column to user_agreements table

  1. Changes
    - Add `updated_at` column to `user_agreements` table
    - Set default value to `now()`
    - Add trigger to automatically update the timestamp on row updates

  2. Security
    - No changes to RLS policies needed
*/

-- Add the missing updated_at column
ALTER TABLE user_agreements 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to user_agreements table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'handle_user_agreements_updated_at'
  ) THEN
    CREATE TRIGGER handle_user_agreements_updated_at
      BEFORE UPDATE ON user_agreements
      FOR EACH ROW
      EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;