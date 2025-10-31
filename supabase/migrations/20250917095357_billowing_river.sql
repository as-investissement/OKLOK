/*
  # Correction des fonctions manquantes

  1. Fonctions utilitaires
    - `is_admin()` : Vérifier si l'utilisateur connecté est admin
    - `handle_push_tokens_updated_at()` : Mise à jour automatique des timestamps

  2. Sécurité
    - Fonctions sécurisées avec vérification des permissions
    - Support du dual system (auth_id et user_id)
*/

-- 1. Créer la fonction is_admin() si elle n'existe pas
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
  -- Vérifier si l'utilisateur connecté est admin (dual system)
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE ((auth_id = auth.uid()) OR (id = auth.uid())) 
    AND role = 'admin'
    AND NOT archived
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer la fonction handle_push_tokens_updated_at() si elle n'existe pas
CREATE OR REPLACE FUNCTION handle_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour automatiquement last_seen_at lors des modifications
  IF TG_OP = 'UPDATE' THEN
    NEW.last_seen_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Créer le trigger pour push_tokens si il n'existe pas
DROP TRIGGER IF EXISTS handle_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER handle_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION handle_push_tokens_updated_at();

-- 4. Vérifier que la fonction handle_updated_at() existe pour les autres tables
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Fonction pour nettoyer les tokens expirés (optionnel)
CREATE OR REPLACE FUNCTION cleanup_expired_push_tokens()
RETURNS void AS $$
BEGIN
  -- Marquer comme révoqués les tokens non vus depuis 30 jours
  UPDATE push_tokens 
  SET revoked = true, enabled = false
  WHERE last_seen_at < now() - interval '30 days'
  AND NOT revoked;
  
  -- Log du nettoyage
  INSERT INTO push_notifications_log (user_id, kind, week_start, message)
  SELECT 
    user_id,
    'system_alert',
    CURRENT_DATE,
    'Token automatiquement révoqué (inactif depuis 30 jours)'
  FROM push_tokens 
  WHERE revoked = true 
  AND last_seen_at < now() - interval '30 days'
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;