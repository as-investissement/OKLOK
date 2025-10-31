import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface UpdateNotificationsRequest {
  userId: string;
  enabled: boolean;
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
    if (!['POST', 'GET'].includes(req.method)) {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`⚙️ === ${req.method} /api/users/notifications ===`);

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

    // Handle GET request - récupérer les préférences
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId requis en paramètre' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      console.log('📊 Récupération préférences pour:', userId);
      
      // Récupérer les préférences utilisateur
      const { data: settings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (settingsError) {
        console.error('❌ Erreur récupération préférences:', settingsError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur récupération préférences',
            details: settingsError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      // Compter les tokens actifs
      const { data: activeTokens, error: countError } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('enabled', true)
        .eq('revoked', false);
      
      const defaultSettings = {
        enabled: true,
        weekly_reminders_enabled: true,
        push_notifications_enabled: true,
        email_notifications_enabled: false
      };
      
      return new Response(
        JSON.stringify({ 
          success: true,
          settings: settings ? {
            enabled: settings.notifications_enabled,
            weekly_reminders_enabled: settings.weekly_reminders_enabled,
            push_notifications_enabled: settings.push_notifications_enabled,
            email_notifications_enabled: settings.email_notifications_enabled
          } : defaultSettings,
          active_tokens_count: activeTokens?.length || 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Handle POST request - mettre à jour les préférences
    const { userId, enabled }: UpdateNotificationsRequest = await req.json();

    if (!userId || typeof enabled !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'userId (string) et enabled (boolean) sont requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('⚙️ Mise à jour préférences notifications:', { userId, enabled });

    // 1. Mettre à jour user_settings.notifications_enabled
    const { data: settingsData, error: settingsError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        notifications_enabled: enabled,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (settingsError) {
      console.error('❌ Erreur mise à jour user_settings:', settingsError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la mise à jour des préférences',
          details: settingsError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ user_settings mis à jour:', settingsData);

    // 2. Si enabled=false → désactiver TOUS les tokens de ce user
    if (!enabled) {
      console.log('🚫 Désactivation de tous les tokens push pour:', userId);
      
      const { data: disabledTokens, error: disableError } = await supabase
        .from('push_tokens')
        .update({
          enabled: false,
          last_seen_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select('id, token');

      if (disableError) {
        console.error('⚠️ Erreur désactivation tokens (non critique):', disableError);
      } else {
        console.log('✅ Tokens désactivés:', disabledTokens?.length || 0);
      }
    }

    // 3. Récupérer l'état courant complet
    const { data: currentSettings, error: getCurrentError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (getCurrentError) {
      console.error('⚠️ Erreur récupération état courant:', getCurrentError);
    }

    // 4. Compter les tokens actifs
    const { data: activeTokens, error: countError } = await supabase
      .from('push_tokens')
      .select('id')
      .eq('user_id', userId)
      .eq('enabled', true)
      .eq('revoked', false);

    if (countError) {
      console.error('⚠️ Erreur comptage tokens actifs:', countError);
    }

    console.log('🎉 === PRÉFÉRENCES NOTIFICATIONS MISES À JOUR ===');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Préférences de notifications mises à jour',
        settings: {
          enabled: currentSettings?.notifications_enabled ?? enabled,
          weekly_reminders_enabled: currentSettings?.weekly_reminders_enabled ?? true,
          push_notifications_enabled: currentSettings?.push_notifications_enabled ?? true,
          email_notifications_enabled: currentSettings?.email_notifications_enabled ?? false
        },
        active_tokens_count: activeTokens?.length || 0
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