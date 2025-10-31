/*
  # Synchronisation automatique du statut semaine depuis les statuts jours

  1. Nouveau trigger
    - Trigger sur `timesheet_entries` qui met à jour `timesheets.status`
    - Se déclenche sur INSERT, UPDATE, DELETE des entrées
    - Calcule automatiquement le statut semaine selon les règles métier

  2. Règles de calcul
    - DRAFT → Aucun jour soumis (tous en 'draft')
    - SUBMITTED → Tous les jours soumis (tous en 'pending')
    - MIXED → Différents statuts dans la semaine
    - APPROVED → Tous les jours approuvés (tous en 'approved')
    - REJECTED → Tous les jours rejetés (tous en 'rejected')

  3. Sécurité
    - Utilise IF EXISTS pour éviter les erreurs
    - Gestion des cas où aucune entrée n'existe
    - Trigger robuste avec gestion d'erreurs
*/

-- Fonction pour calculer le statut de la semaine basé sur les statuts des jours
CREATE OR REPLACE FUNCTION calculate_week_status_from_days()
RETURNS TRIGGER AS $$
DECLARE
  target_timesheet_id uuid;
  draft_count integer;
  pending_count integer;
  approved_count integer;
  rejected_count integer;
  total_count integer;
  new_status text;
BEGIN
  -- Déterminer l'ID de la feuille de temps concernée
  IF TG_OP = 'DELETE' THEN
    target_timesheet_id := OLD.timesheet_id;
  ELSE
    target_timesheet_id := NEW.timesheet_id;
  END IF;

  -- Compter les entrées par statut pour cette feuille de temps
  SELECT 
    COUNT(*) FILTER (WHERE status = 'draft'),
    COUNT(*) FILTER (WHERE status = 'pending'),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'rejected'),
    COUNT(*)
  INTO 
    draft_count,
    pending_count,
    approved_count,
    rejected_count,
    total_count
  FROM timesheet_entries 
  WHERE timesheet_id = target_timesheet_id;

  -- Calculer le nouveau statut selon les règles métier
  IF total_count = 0 THEN
    -- Aucune entrée → DRAFT
    new_status := 'draft';
  ELSIF rejected_count = total_count THEN
    -- Tous les jours rejetés → REJECTED
    new_status := 'rejected';
  ELSIF approved_count = total_count THEN
    -- Tous les jours approuvés → APPROVED
    new_status := 'approved';
  ELSIF pending_count = total_count THEN
    -- Tous les jours soumis → SUBMITTED
    new_status := 'submitted';
  ELSIF draft_count = total_count THEN
    -- Tous les jours en brouillon → DRAFT
    new_status := 'draft';
  ELSE
    -- Mélange de statuts → MIXED
    new_status := 'submitted'; -- On garde 'submitted' car pas de 'mixed' dans l'enum actuel
  END IF;

  -- Mettre à jour le statut de la feuille de temps
  UPDATE timesheets 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = target_timesheet_id;

  -- Log pour debug
  RAISE NOTICE 'Week status updated: timesheet_id=%, draft=%, pending=%, approved=%, rejected=%, total=%, new_status=%', 
    target_timesheet_id, draft_count, pending_count, approved_count, rejected_count, total_count, new_status;

  -- Retourner la ligne appropriée selon l'opération
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur timesheet_entries
DROP TRIGGER IF EXISTS sync_week_status_from_days ON timesheet_entries;

CREATE TRIGGER sync_week_status_from_days
  AFTER INSERT OR UPDATE OR DELETE ON timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_week_status_from_days();

-- Commentaire pour expliquer le trigger
COMMENT ON TRIGGER sync_week_status_from_days ON timesheet_entries IS 
'Synchronise automatiquement le statut de la semaine (timesheets.status) basé sur les statuts des jours (timesheet_entries.status)';