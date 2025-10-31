/*
  # Correction RLS user_invitations - Admin seulement

  1. Fonction utilitaire
    - `is_admin()` : Vérifie si l'utilisateur connecté est admin

  2. Politiques RLS strictes
    - Seuls les administrateurs peuvent gérer les invitations
    - INSERT, SELECT, UPDATE, DELETE : admin uniquement

  3. Sécurité
    - Nettoyage de toutes les anciennes politiques
    - Fonction sécurisée avec SECURITY DEFINER
*/

-- Helper pour savoir si l'utilisateur courant est admin
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'admin'
  );
$$;
grant execute on function public.is_admin() to anon, authenticated;

-- RLS: admin seulement sur les invitations
alter table public.user_invitations enable row level security;

drop policy if exists "invites_insert_admin_only" on public.user_invitations;
drop policy if exists "invites_select_admin_only" on public.user_invitations;
drop policy if exists "invites_update_admin_only" on public.user_invitations;
drop policy if exists "invites_delete_admin_only" on public.user_invitations;

create policy "invites_insert_admin_only"
on public.user_invitations
for insert
to authenticated
with check (public.is_admin());

create policy "invites_select_admin_only"
on public.user_invitations
for select
to authenticated
using (public.is_admin());

create policy "invites_update_admin_only"
on public.user_invitations
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "invites_delete_admin_only"
on public.user_invitations
for delete
to authenticated
using (public.is_admin());