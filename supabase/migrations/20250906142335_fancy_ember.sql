/*
  # Add status column to users table

  1. New Columns
    - `status` (text) - Status of the user account (pending, active, inactive, suspended)
      - Default value: 'pending'
      - Check constraint to ensure valid values

  2. Changes
    - Add status column to users table with proper constraints
    - Set default value to 'pending' for new users
    - Add check constraint for valid status values
*/

-- Add status column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status text DEFAULT 'pending';
    
    -- Add check constraint for valid status values
    ALTER TABLE users ADD CONSTRAINT users_status_check 
    CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'inactive'::text, 'suspended'::text]));
    
    -- Update existing users to have 'active' status if they don't have archived = true
    UPDATE users 
    SET status = CASE 
      WHEN archived = true THEN 'inactive'
      ELSE 'active'
    END
    WHERE status IS NULL;
  END IF;
END $$;