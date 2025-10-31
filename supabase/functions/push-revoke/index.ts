import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RevokePushRequest {
  token: string;
  userId: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🚫 === POST /api/push/revoke ===');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { token, userId }: RevokePushRequest = await req.json();

    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: 'Token et userId sont requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🚫 Révocation token pour utilisateur:', userId);

    // Vérifier que le token appartient bien à cet utilisateur
    const { data: existingToken, error: checkError } = await supabase
      .from('push_tokens')
      .select('id, user_id, enabled, revoked')
      .eq('token', token)
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erreur vérification token:', checkError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la vérification du token',
          details: checkError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!existingToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Token non trouvé ou n\'appartient pas à cet utilisateur'
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Révoquer le token : enabled=false, revoked=true
    const { data: revokedToken, error: revokeError } = await supabase
      .from('push_tokens')
      .update({
        enabled: false,
        revoked: true,
        last_seen_at: new Date().toISOString()
      })
      .eq('token', token)
      .eq('user_id', userId)
      .select()
      .single();

    if (revokeError) {
      console.error('❌ Erreur révocation token:', revokeError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la révocation du token',
          details: revokeError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ === TOKEN RÉVOQUÉ AVEC SUCCÈS ===');
    console.log('📱 Token ID:', revokedToken.id);
    console.log('👤 User ID:', userId);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Token révoqué avec succès',
        tokenId: revokedToken.id,
        enabled: false,
        revoked: true
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('💥 Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});