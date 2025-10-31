/*
  # Création table messages pour centraliser les communications

  1. Nouvelle table
    - `messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key vers users)
      - `type` (text, type de message: rejection, approval, info)
      - `title` (text, titre du message)
      - `content` (text, contenu du message)
      - `timesheet_id` (uuid, référence à la feuille de temps)
      - `entry_date` (date, date de l'entrée concernée)
      - `read` (boolean, message lu ou non)
      - `from_user_id` (uuid, qui a envoyé le message)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur `messages` table
    - Politique pour que les utilisateurs voient seulement leurs messages
    - Politique pour que les admins puissent créer des messages

  3. Index
    - Index sur user_id pour performance
    - Index sur read pour filtrer rapidement
    - Index sur created_at pour tri chronologique
*/

-- Créer la table messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('rejection', 'approval', 'info')),
  title text NOT NULL,
  content text NOT NULL,
  timesheet_id uuid REFERENCES timesheets(id) ON DELETE SET NULL,
  entry_date date,
  read boolean DEFAULT false,
  from_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Politique pour que les utilisateurs voient seulement leurs messages
CREATE POLICY "Users can view their own messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Politique pour que les utilisateurs puissent marquer leurs messages comme lus
CREATE POLICY "Users can update their own messages read status"
  ON messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Politique pour que les admins puissent créer des messages
CREATE POLICY "Admins can create messages"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Politique pour que les admins puissent voir tous les messages
CREATE POLICY "Admins can view all messages"
  ON messages
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(type);

-- Trigger pour updated_at
CREATE TRIGGER handle_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();