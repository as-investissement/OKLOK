import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

// Re-export from supabaseClient for backward compatibility
export { supabase, isSupabaseConfigured } from './supabaseClient';