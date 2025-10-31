/*
  # Add notification preference to users table

  1. Changes
    - Add `notification_preference` column to `users` table
      - Type: boolean
      - Default: null (not set yet)
      - Nullable: true (allows us to know if user has made a choice)
    - Add `notification_preference_set_at` column to track when preference was set
  
  2. Purpose
    - Store user's choice about receiving push notifications
    - null = user hasn't made a choice yet
    - true = user accepted notifications
    - false = user refused notifications
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_preference'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_preference boolean DEFAULT null;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'notification_preference_set_at'
  ) THEN
    ALTER TABLE users ADD COLUMN notification_preference_set_at timestamptz;
  END IF;
END $$;