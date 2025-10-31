/*
  # Add unique constraints for UPSERT operations

  1. Constraints Added
    - `user_agreements`: unique constraint on (user_id, agreement_type)
    - `activation_log`: unique constraint on (user_id, activation_type)

  2. Purpose
    - Enable ON CONFLICT operations in activate-user Edge Function
    - Prevent duplicate agreements and activation logs per user
    - Allow safe UPSERT operations

  3. Safety
    - Uses IF NOT EXISTS to prevent errors if constraints already exist
    - Handles existing data gracefully
*/

-- Add unique constraint to user_agreements table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_agreement_type'
  ) THEN
    ALTER TABLE user_agreements 
    ADD CONSTRAINT unique_user_agreement_type 
    UNIQUE (user_id, agreement_type);
    
    RAISE NOTICE 'Added unique constraint unique_user_agreement_type to user_agreements';
  ELSE
    RAISE NOTICE 'Constraint unique_user_agreement_type already exists on user_agreements';
  END IF;
END $$;

-- Add unique constraint to activation_log table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_activation_type'
  ) THEN
    ALTER TABLE activation_log 
    ADD CONSTRAINT unique_user_activation_type 
    UNIQUE (user_id, activation_type);
    
    RAISE NOTICE 'Added unique constraint unique_user_activation_type to activation_log';
  ELSE
    RAISE NOTICE 'Constraint unique_user_activation_type already exists on activation_log';
  END IF;
END $$;