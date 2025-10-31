/*
  # Table push_notifications_log

  1. New Tables
    - `push_notifications_log`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `kind` (text, type de notification)
      - `week_start` (date, début de semaine)
      - `sent_at` (timestamp)
      - `tokens_count` (integer, nombre de tokens)
      - `message` (text, contenu du message)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `push_notifications_log` table
    - Add policy for admins to read all logs
    - Add policy for users to read their own logs

  3. Indexes
    - Index on user_id for performance
    - Index on kind and week_start for anti-spam queries
    - Index on sent_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS push_notifications_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('timesheet_reminder', 'approval_notification', 'system_alert')),
  week_start date NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  tokens_count integer DEFAULT 1,
  message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE push_notifications_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all notification logs"
  ON push_notifications_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own notification logs"
  ON push_notifications_log
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.auth_id = auth.uid() 
      AND users.id = push_notifications_log.user_id
    )
  );

CREATE POLICY "System can insert notification logs"
  ON push_notifications_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Indexes pour performance
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_user_id 
  ON push_notifications_log(user_id);

CREATE INDEX IF NOT EXISTS idx_push_notifications_log_kind_week 
  ON push_notifications_log(kind, week_start);

CREATE INDEX IF NOT EXISTS idx_push_notifications_log_sent_at 
  ON push_notifications_log(sent_at DESC);

-- Index composite pour l'anti-spam
CREATE INDEX IF NOT EXISTS idx_push_notifications_log_anti_spam 
  ON push_notifications_log(user_id, kind, week_start, sent_at);