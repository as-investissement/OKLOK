import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RegisterPushRequest {
  token: string;
  platform: 'android' | 'ios';
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

    console.log('📱 === POST /api/push/register ===');

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
    const { token, platform, userId }: RegisterPushRequest = await req.json();

    if (!token || !platform || !userId) {
      return new Response(
        JSON.stringify({ error: 'Token, platform et userId sont requis' }),
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

    console.log('📱 Enregistrement token:', { userId, platform, tokenPreview: token.substring(0, 20) + '...' });

    // 1. Upsert dans push_tokens (unique par token)
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token: token,
        platform: platform,
        enabled: true,
        revoked: false,
        last_seen_at: new Date().toISOString(),
        user_agent: req.headers.get('user-agent') || null
      }, { 
        onConflict: 'token',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (tokenError) {
      console.error('❌ Erreur upsert push_tokens:', tokenError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'enregistrement du token',
          details: tokenError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Token enregistré:', tokenData.id);

    // 2. Vérifier/créer user_settings si notifications_enabled est NULL
    const { data: existingSettings, error: settingsError } = await supabase
      .from('user_settings')
      .select('notifications_enabled')
      .eq('user_id', userId)
      .maybeSingle();

    if (settingsError) {
      console.error('⚠️ Erreur vérification user_settings (non critique):', settingsError);
    }

    if (!existingSettings) {
      // Créer les paramètres par défaut
      console.log('🆕 Création user_settings par défaut pour:', userId);
      
      const { error: createSettingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId,
          notifications_enabled: true,
          weekly_reminders_enabled: true,
          push_notifications_enabled: true,
          email_notifications_enabled: false
        });

      if (createSettingsError) {
        console.error('⚠️ Erreur création user_settings (non critique):', createSettingsError);
      } else {
        console.log('✅ user_settings créé avec notifications_enabled=true');
      }
    } else if (existingSettings.notifications_enabled === null) {
      // Mettre à jour notifications_enabled à true si NULL
      console.log('🔄 Mise à jour notifications_enabled=true pour:', userId);
      
      const { error: updateSettingsError } = await supabase
        .from('user_settings')
        .update({ notifications_enabled: true })
        .eq('user_id', userId);

      if (updateSettingsError) {
        console.error('⚠️ Erreur mise à jour user_settings (non critique):', updateSettingsError);
      } else {
        console.log('✅ notifications_enabled mis à jour à true');
      }
    }

    console.log('🎉 === ENREGISTREMENT TOKEN TERMINÉ ===');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Token push enregistré avec succès',
        tokenId: tokenData.id,
        platform: platform,
        enabled: true,
        revoked: false
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