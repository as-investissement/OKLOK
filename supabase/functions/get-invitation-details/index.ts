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

    // Use SERVICE_ROLE_KEY to bypass RLS - no auth check needed for public invitation retrieval
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get inviteId and token from URL parameters
    const url = new URL(req.url);
    const inviteId = url.searchParams.get('inviteId');
    const token = url.searchParams.get('token');

    if (!inviteId || !token) {
      return new Response(
        JSON.stringify({ 
          error: 'Paramètres manquants',
          details: 'inviteId et token sont requis'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Recherche invitation:', { inviteId, token });

    // Get specific invitation by ID and token (bypasses RLS automatically with SERVICE_ROLE_KEY)
    const { data: invitation, error } = await supabase
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
        companies(name)
      `)
      .eq('id', inviteId)
      .eq('token', token)
      .single();

    if (error) {
      console.error('❌ Erreur recherche invitation:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Invitation non trouvée',
          details: 'Aucune invitation trouvée avec ces paramètres'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!invitation) {
      return new Response(
        JSON.stringify({ 
          error: 'Invitation non trouvée',
          details: 'Aucune invitation trouvée avec ces paramètres'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Invitation trouvée:', invitation.id);

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          error: 'Invitation expirée',
          details: 'Cette invitation a expiré'
        }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation is already accepted
    if (invitation.status === 'accepted') {
      return new Response(
        JSON.stringify({ 
          error: 'Invitation déjà acceptée',
          details: 'Cette invitation a déjà été utilisée'
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        invitation: invitation
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Exception dans get-invitation-details:', error);
    
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