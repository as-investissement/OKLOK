import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with SERVICE_ROLE_KEY to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use SERVICE_ROLE_KEY to bypass RLS - no auth check needed
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔍 Chargement des invitations avec SERVICE_ROLE_KEY...');

    // Get all invitations (bypasses RLS automatically with SERVICE_ROLE_KEY)
    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select(`
        id,
        email,
        token,
        employee_data,
        company_id,
        status,
        expires_at,
        created_at,
        updated_at,
        companies(name)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('❌ Erreur chargement invitations:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur chargement invitations',
          details: error.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Invitations trouvées:', invitations?.length || 0);

    return new Response(
      JSON.stringify({ 
        success: true,
        invitations: invitations || [],
        count: invitations?.length || 0
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Exception dans list-invitations:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});