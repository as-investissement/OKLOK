import { supabase } from './supabaseClient';

export async function getUsersWithoutAuthId() {
  const {
    data: { session },
    error: sessionErr,
  } = await supabase.auth.getSession();

  if (sessionErr) throw new Error(sessionErr.message);
  if (!session?.access_token) throw new Error("Utilisateur non authentifié");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(
    `${supabaseUrl}/functions/v1/dynamic-action`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    }
  );

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || `Erreur serveur (${res.status})`);
  }

  return payload.data ?? [];
}
