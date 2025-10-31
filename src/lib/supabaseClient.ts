import { createClient } from '@supabase/supabase-js';

// Fonction pour vérifier si Supabase est configuré
export const isSupabaseConfigured = !!(
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Log pour déboguer la configuration
console.log('🔍 Configuration Supabase:', {
  url: import.meta.env.VITE_SUPABASE_URL ? 'Définie' : 'Manquante',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Définie' : 'Manquante',
  isConfigured: isSupabaseConfigured
});

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage, // important pour l'aperçu
    },
  }
);