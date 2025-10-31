import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Helper pour calculer la plage de semaine en timezone Europe/Paris
function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  const parisDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  const dayOfWeek = parisDate.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(parisDate);
  monday.setDate(parisDate.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString(),
    end: sunday.toISOString()
  };
}

// Garde interne pour vérifier les créneaux autorisés
function isAuthorizedTimeSlot(): boolean {
  const now = new Date();
  const parisTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  
  const dayOfWeek = parisTime.getDay();
  const hour = parisTime.getHours();
  
  console.log('🕐 Vérification créneau autorisé:', {
    dayOfWeek,
    hour,
    parisTime: parisTime.toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  });
  
  // Samedi (6) à 18h
  if (dayOfWeek === 6 && hour === 18) {
    console.log('✅ Créneau autorisé : Samedi 18h');
    return true;
  }
  
  // Dimanche (0) à 9h, 14h, 19h, 23h
  if (dayOfWeek === 0 && [9, 14, 19, 23].includes(hour)) {
    console.log('✅ Créneau autorisé : Dimanche', hour + 'h');
    return true;
  }
  
  console.log('❌ Créneau NON autorisé - fonction ignorée');
  return false;
}

// Fonction pour envoyer une notification via la nouvelle Edge Function
async function sendPushNotification(supabaseUrl: string, supabaseKey: string, token: string, title: string, body: string): Promise<boolean> {
  try {
    console.log('📱 === ENVOI NOTIFICATION VIA EDGE FUNCTION ===');

    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        title,
        body,
        data: {
          type: 'timesheet_reminder',
          timestamp: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur envoi notification:', errorData);
      return false;
    }

    const result = await response.json();
    console.log('✅ Notification envoyée:', result);
    return true;

  } catch (error) {
    console.error('❌ Exception envoi notification:', error);
    return false;
  }
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
    console.log('🔔 === DÉBUT NOTIFY MISSING TIMESHEETS (FIREBASE MODERNE) ===');
    console.log('🕐 Heure UTC:', new Date().toISOString());
    console.log('🕐 Heure Paris:', new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }));

    // 🛡️ GARDE INTERNE : Vérifier le créneau autorisé
    if (!isAuthorizedTimeSlot()) {
      console.log('⏭️ Créneau non autorisé, fonction ignorée');
      return new Response(null, {
        status: 204, // No Content
        headers: corsHeaders,
      });
    }

    console.log('✅ Créneau autorisé, poursuite de l\'exécution...');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuration Supabase manquante');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Supabase manquante',
          details: 'Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Calculer la plage de semaine en cours avec getWeekRange
    const { start, end } = getWeekRange();
    
    console.log('📅 Période calculée (Europe/Paris):', { start, end });

    // Appeler find-missing-submissions pour analyser timesheet_entries
    console.log('📡 Appel de find-missing-submissions...');
    
    const response = await fetch(`${supabaseUrl}/functions/v1/find-missing-submissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ start, end })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Erreur appel find-missing-submissions:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'analyse des soumissions manquantes',
          details: errorData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await response.json();
    const employeesWithMissing = result.employees || [];
    
    console.log('📊 Employés avec soumissions manquantes (timesheet_entries):', employeesWithMissing.length);

    if (employeesWithMissing.length === 0) {
      console.log('✅ Aucune soumission manquante, pas de notification à envoyer');
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Aucune soumission manquante trouvée',
          employees_checked: 0,
          notifications_sent: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Récupérer les informations des employés avec leurs préférences
    const userIds = employeesWithMissing.map(emp => emp.user_id);
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select(`
        id, 
        name, 
        email, 
        company_id,
        user_settings(notifications_enabled, push_notifications_enabled, weekly_reminders_enabled)
      `)
      .in('id', userIds)
      .eq('archived', false);

    if (usersError) {
      console.error('❌ Erreur récupération utilisateurs:', usersError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur récupération utilisateurs',
          details: usersError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('👥 Utilisateurs trouvés:', users?.length || 0);

    // Récupérer les tokens push actifs et non révoqués
    const { data: pushTokens, error: tokensError } = await supabase
      .from('push_tokens')
      .select('user_id, token, platform, enabled, revoked')
      .in('user_id', userIds)
      .eq('enabled', true)
      .eq('revoked', false);

    if (tokensError) {
      console.error('⚠️ Erreur récupération tokens push (non critique):', tokensError);
    }

    console.log('📱 Tokens push actifs trouvés:', pushTokens?.length || 0);

    // Vérifier l'anti-spam : pas de notification si une a été envoyée < 5h
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString();
    const weekStartDate = start.split('T')[0];
    
    const { data: recentNotifications, error: recentError } = await supabase
      .from('push_notifications_log')
      .select('user_id')
      .eq('kind', 'timesheet_reminder')
      .eq('week_start', weekStartDate)
      .gte('sent_at', fiveHoursAgo);

    if (recentError) {
      console.error('⚠️ Erreur vérification anti-spam (non critique):', recentError);
    }

    const recentUserIds = new Set(recentNotifications?.map(n => n.user_id) || []);
    console.log('🚫 Utilisateurs avec notification récente (< 5h):', recentUserIds.size);

    // Envoyer les notifications FCM modernes
    let notificationsSent = 0;
    let notificationsSkipped = 0;
    
    for (const employeeData of employeesWithMissing) {
      const user = users?.find(u => u.id === employeeData.user_id);
      if (!user) {
        console.log('⚠️ Utilisateur non trouvé:', employeeData.user_id);
        continue;
      }

      // Vérifier les préférences utilisateur
      const userSettings = user.user_settings?.[0];
      const notificationsEnabled = userSettings?.notifications_enabled !== false;
      const pushEnabled = userSettings?.push_notifications_enabled !== false;
      const weeklyRemindersEnabled = userSettings?.weekly_reminders_enabled !== false;

      if (!notificationsEnabled || !pushEnabled || !weeklyRemindersEnabled) {
        console.log(`🔕 Notifications désactivées pour ${user.name}:`, {
          notifications_enabled: notificationsEnabled,
          push_notifications_enabled: pushEnabled,
          weekly_reminders_enabled: weeklyRemindersEnabled
        });
        notificationsSkipped++;
        continue;
      }

      // Vérifier l'anti-spam
      if (recentUserIds.has(user.id)) {
        console.log(`🚫 Notification ignorée (anti-spam) pour ${user.name}`);
        notificationsSkipped++;
        continue;
      }

      const userTokens = pushTokens?.filter(token => 
        token.user_id === user.id && 
        token.enabled && 
        !token.revoked
      ) || [];
      
      if (userTokens.length === 0) {
        console.log(`📱 Aucun token push actif pour ${user.name}`);
        continue;
      }

      // Préparer le message
      const title = "Rappel : heures non soumises";
      const body = `Il reste à soumettre : ${employeeData.missingDays.join(', ')}. Soumission auto dimanche 23:59.`;
      
      console.log(`📱 Envoi notification à ${user.name}:`, {
        missingDays: employeeData.missingDays,
        tokensCount: userTokens.length,
        message: body
      });

      // Envoyer à tous les tokens actifs de cet utilisateur
      let userNotificationsSent = 0;

      for (const tokenData of userTokens) {
        const success = await sendPushNotification(
          supabaseUrl,
          supabaseServiceKey,
          tokenData.token,
          title,
          body
        );

        if (success) {
          userNotificationsSent++;

          // Mettre à jour last_seen_at du token
          await supabase
            .from('push_tokens')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('token', tokenData.token);
        }
      }

      if (userNotificationsSent > 0) {
        // Logger la notification dans push_notifications_log
        try {
          await supabase
            .from('push_notifications_log')
            .insert({
              user_id: user.id,
              kind: 'timesheet_reminder',
              week_start: weekStartDate,
              sent_at: new Date().toISOString(),
              tokens_count: userNotificationsSent,
              message: body
            });
          
          console.log(`✅ Notification envoyée à ${user.name} (${userNotificationsSent} token(s))`);
          notificationsSent++;
        } catch (logError) {
          console.error('⚠️ Erreur log notification (non critique):', logError);
        }
      } else {
        // Marquer les tokens comme révoqués si FCM retourne NotRegistered
        for (const tokenData of userTokens) {
          try {
            console.log(`⚠️ Aucune notification envoyée pour token ${tokenData.token.substring(0, 20)}... - vérification statut`);
          } catch (tokenError) {
            console.error('⚠️ Erreur vérification token (non critique):', tokenError);
          }
        }
      }
    }

    console.log('🎉 === NOTIFICATIONS TERMINÉES ===');
    console.log('📊 Notifications envoyées:', notificationsSent);
    console.log('🚫 Notifications ignorées (anti-spam + préférences):', notificationsSkipped);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications de rappel envoyées',
        period: { start, end },
        timezone: 'Europe/Paris',
        employees_with_missing: employeesWithMissing.length,
        notifications_sent: notificationsSent,
        notifications_skipped: notificationsSkipped,
        method: 'firebase_fcm_v1_via_edge_function'
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