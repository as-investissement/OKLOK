/*
  # Corriger les politiques RLS pour user_invitations - Admin seulement

  1. Fonction utilitaire
    - Créer fonction is_admin() pour vérifier le rôle administrateur
    
  2. Politiques RLS strictes
    - Seuls les administrateurs peuvent gérer les invitations
    - INSERT, SELECT, UPDATE, DELETE réservés aux admins
    
  3. Sécurité
    - Enable RLS sur user_invitations
    - Supprimer toutes les anciennes politiques
    - Créer nouvelles politiques basées sur is_admin()
*/

-- Fonction utilitaire pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public 
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  );
$$;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- Activer RLS sur user_invitations
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "invites_insert_admin_only" ON public.user_invitations;
DROP POLICY IF EXISTS "invites_select_admin_only" ON public.user_invitations;
DROP POLICY IF EXISTS "invites_update_admin_only" ON public.user_invitations;
DROP POLICY IF EXISTS "invites_delete_admin_only" ON public.user_invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "users_can_delete_their_sent_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "users_can_update_their_sent_invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "users_can_view_their_invitations" ON public.user_invitations;

-- Créer nouvelles politiques strictes pour admins seulement
CREATE POLICY "invites_insert_admin_only"
ON public.user_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "invites_select_admin_only"
ON public.user_invitations
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "invites_update_admin_only"
ON public.user_invitations
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "invites_delete_admin_only"
ON public.user_invitations
FOR DELETE
TO authenticated
USING (public.is_admin());