/*
  # Création table audit_log pour l'historique des actions

  1. Nouvelle table
    - `audit_log`
      - `id` (uuid, primary key)
      - `entity_type` (text) - Type d'entité : 'employee', 'project', 'company'
      - `entity_id` (uuid) - ID de l'entité concernée
      - `action` (text) - Action effectuée : 'archived', 'restored', 'created', 'updated', 'deleted'
      - `performed_by` (uuid) - Qui a effectué l'action
      - `performed_at` (timestamp) - Quand l'action a été effectuée
      - `details` (jsonb) - Détails supplémentaires (optionnel)
      - `reason` (text) - Raison de l'action (optionnel)

  2. Sécurité
    - Enable RLS sur `audit_log`
    - Policy pour les admins seulement

  3. Index
    - Index sur entity_type et entity_id pour les performances
    - Index sur performed_at pour l'historique chronologique
*/

-- Créer la table audit_log
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('employee', 'project', 'company', 'timesheet')),
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'archived', 'restored', 'deleted')),
  performed_by uuid REFERENCES users(id),
  performed_at timestamptz DEFAULT now(),
  details jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy pour les admins seulement
CREATE POLICY "Admins can view all audit logs"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert audit logs"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_at ON audit_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Fonction pour créer automatiquement des logs d'audit
CREATE OR REPLACE FUNCTION create_audit_log(
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_performed_by uuid DEFAULT auth.uid(),
  p_details jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO audit_log (
    entity_type,
    entity_id,
    action,
    performed_by,
    details,
    reason
  ) VALUES (
    p_entity_type,
    p_entity_id,
    p_action,
    p_performed_by,
    p_details,
    p_reason
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;