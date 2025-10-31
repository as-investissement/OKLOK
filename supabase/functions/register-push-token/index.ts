import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RegisterPushTokenRequest {
  token: string;
  platform: 'android' | 'ios';
  userAgent?: string;
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

    console.log('📱 === DÉBUT ENREGISTREMENT TOKEN PUSH ===');

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
    const { token, platform, userAgent }: RegisterPushTokenRequest = await req.json();

    if (!token || !platform) {
      return new Response(
        JSON.stringify({ error: 'Token et platform sont requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate platform
    if (!['android', 'ios'].includes(platform)) {
      return new Response(
        JSON.stringify({ error: 'Platform doit être "android" ou "ios"' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📱 Token reçu:', token);
    console.log('📱 Platform:', platform);

    // Get user from auth header (optional)
    let userId = null;
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const authToken = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(authToken);
        
        if (!userError && user) {
          // Find user in users table to get internal user_id
          const { data: userData, error: userDataError } = await supabase
            .from('users')
            .select('id')
            .eq('auth_id', user.id)
            .maybeSingle();
          
          if (!userDataError && userData) {
            userId = userData.id;
            console.log('👤 Utilisateur identifié:', userId);
          }
        }
      } catch (error) {
        console.log('⚠️ Erreur identification utilisateur (non critique):', error.message);
      }
    }

    // Check if token already exists
    console.log('🔍 Vérification token existant...');
    const { data: existingToken, error: checkError } = await supabase
      .from('push_tokens')
      .select('id, user_id, revoked')
      .eq('token', token)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Erreur vérification token:', checkError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la vérification du token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (existingToken) {
      console.log('🔄 Token existant trouvé, mise à jour...');
      
      // Update existing token (refresh last_seen_at and revoked status)
      const { data: updatedToken, error: updateError } = await supabase
        .from('push_tokens')
        .update({
          user_id: userId,
          platform: platform,
          user_agent: userAgent || null,
          revoked: false,
          last_seen_at: new Date().toISOString()
        })
        .eq('token', token)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Erreur mise à jour token:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la mise à jour du token' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log('✅ Token mis à jour avec succès:', updatedToken.id);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Token mis à jour avec succès',
          tokenId: updatedToken.id
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create new token entry
    console.log('🆕 Création nouveau token...');
    const { data: newToken, error: insertError } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token: token,
        platform: platform,
        user_agent: userAgent || null,
        revoked: false,
        last_seen_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur création token:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de l\'enregistrement du token' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ === TOKEN PUSH ENREGISTRÉ AVEC SUCCÈS ===');
    console.log('📱 Token ID:', newToken.id);
    console.log('👤 User ID:', userId || 'Non connecté');
    console.log('📱 Platform:', platform);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Token enregistré avec succès',
        tokenId: newToken.id
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