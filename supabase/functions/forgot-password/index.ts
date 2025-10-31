import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    console.log('🔐 === DÉBUT FORGOT PASSWORD ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    console.log('🔍 Vérification des variables d\'environnement...');
    console.log('SUPABASE_URL présent:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY présent:', !!supabaseServiceKey);
    console.log('RESEND_API_KEY présent:', !!resendApiKey);

    if (!supabaseUrl || !supabaseServiceKey || !resendApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Configuration manquante',
          details: 'Variables d\'environnement Supabase ou Resend manquantes'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    interface ResetPasswordRequest {
      email: string;
    }

    const { email }: ResetPasswordRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📧 Email reçu pour reset:', email);

    console.log('🔍 Recherche utilisateur dans la table users...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, company_id, auth_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userError || !userData) {
      console.error('❌ Utilisateur non trouvé:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Aucun compte trouvé avec cet email' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Utilisateur trouvé:', userData.name);
    console.log('🔑 Auth ID présent:', !!userData.auth_id);

    if (!userData.auth_id) {
      console.error('❌ Compte non activé - pas d\'auth_id');
      return new Response(
        JSON.stringify({
          error: 'Compte non activé',
          details: 'Vous devez d\'abord activer votre compte en cliquant sur le lien d\'invitation reçu par email.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: companyData } = await supabase
      .from('companies')
      .select('name')
      .eq('id', userData.company_id)
      .maybeSingle();

    const companyName = companyData?.name || 'AS INVESTISSEMENT';

    const resetToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    console.log('🔑 Token généré:', resetToken);

    console.log('🗑️ Invalidation des anciens tokens de reset pour cet utilisateur...');
    const { error: invalidateError } = await supabase
      .from('password_resets')
      .update({ status: 'expired' })
      .eq('user_id', userData.id)
      .eq('status', 'pending');

    if (invalidateError) {
      console.warn('⚠️ Erreur invalidation anciens tokens (non-bloquant):', invalidateError.message);
    } else {
      console.log('✅ Anciens tokens invalidés');
    }

    console.log('💾 Insertion du nouveau token dans password_resets...');
    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .insert({
        user_id: userData.id,
        email: email.toLowerCase(),
        token: resetToken,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .maybeSingle();

    if (resetError || !resetData) {
      console.error('❌ Erreur création token reset:', resetError);
      return new Response(
        JSON.stringify({
          error: 'Erreur lors de la création du lien de réinitialisation',
          details: resetError?.message || 'Erreur inconnue'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('✅ Token stocké avec ID:', resetData.id);

    const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL');
    const resetUrl = `${PUBLIC_APP_URL}/reset-password?token=${encodeURIComponent(resetToken)}&resetId=${encodeURIComponent(resetData.id)}`;

    console.log('🔗 URL de reset construite:', resetUrl);

    if (!resetToken || !resetData.id || resetToken === 'null' || resetData.id === 'null') {
      console.error('🚨 PARAMÈTRES INVALIDES DÉTECTÉS:');
      console.error('🔑 Token:', resetToken);
      console.error('📋 ResetId:', resetData.id);
      return new Response(JSON.stringify({
        error: 'Paramètres de réinitialisation invalides',
        details: 'Token ou ResetId manquant ou null'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('📧 === ENVOI EMAIL RESET PASSWORD ===');
    
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Feuilles de Temps <noreply@as-numelec.fr>',
        to: [email],
        subject: `🔐 Réinitialisation de votre mot de passe - ${companyName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Réinitialisation de mot de passe - ${companyName}</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
            
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
              
              <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%); padding: 40px 30px; text-align: center; position: relative;">
                <div style="background: rgba(255, 255, 255, 0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                  <span style="font-size: 40px;">🔐</span>
                </div>
                
                <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  Réinitialisation de mot de passe
                </h1>
                <h2 style="color: #fecaca; margin: 15px 0 0 0; font-weight: 400; font-size: 20px; opacity: 0.9;">
                  ${companyName}
                </h2>
                
                <div style="position: absolute; top: 20px; right: 20px; width: 60px; height: 60px; border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; opacity: 0.3;"></div>
                <div style="position: absolute; bottom: 20px; left: 20px; width: 40px; height: 40px; border: 2px solid rgba(255,255,255,0.2); border-radius: 50%; opacity: 0.2;"></div>
              </div>
              
              <div style="padding: 40px 30px;">
                
                <div style="text-align: center; margin-bottom: 30px;">
                  <h3 style="font-size: 24px; color: #1f2937; margin: 0 0 10px 0; font-weight: 600;">
                    Bonjour ${userData.name} 👋
                  </h3>
                  <p style="font-size: 16px; color: #6b7280; margin: 0;">
                    Nous avons reçu une demande de réinitialisation de votre mot de passe
                  </p>
                </div>
                
                <div style="background: #f8fafc; padding: 25px; border-radius: 10px; margin: 30px 0; border-left: 4px solid #dc2626;">
                  <p style="font-size: 16px; margin: 0; color: #374151; line-height: 1.6;">
                    Pour sécuriser votre compte <strong>${companyName}</strong>, nous vous proposons de créer un nouveau mot de passe 
                    pour accéder à votre espace de gestion des feuilles de temps.
                  </p>
                </div>
                
                <div style="text-align: center; margin: 40px 0;">
                  <a href="${resetUrl}" 
                     style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%); 
                            color: white; 
                            padding: 18px 40px; 
                            text-decoration: none; 
                            border-radius: 50px; 
                            font-weight: 700; 
                            font-size: 18px; 
                            display: inline-block;
                            box-shadow: 0 8px 25px rgba(220, 38, 38, 0.3);
                            transition: all 0.3s ease;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            border: 2px solid transparent;">
                    🔑 Créer mon nouveau mot de passe
                  </a>
                </div>
                
                <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; border-radius: 10px; margin: 30px 0;">
                  <div style="display: flex; align-items: flex-start;">
                    <span style="font-size: 24px; margin-right: 15px;">⏰</span>
                    <div>
                      <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">
                        Attention - Lien temporaire
                      </h4>
                      <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                        Ce lien de réinitialisation expire dans <strong>1 heure</strong> pour votre sécurité. 
                        Utilisez-le rapidement pour créer votre nouveau mot de passe.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <p style="margin: 0; color: #991b1b; font-size: 14px; text-align: center;">
                    <strong>🔒 Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation, 
                    ignorez cet email. Votre mot de passe actuel reste inchangé.
                  </p>
                </div>
                
              </div>
              
              <div style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
                  Email envoyé automatiquement par la plateforme <strong>Feuilles de Temps</strong> de ${companyName}
                  <br>
                  <span style="color: #94a3b8;">
                    Cet email a été généré suite à votre demande de réinitialisation de mot de passe
                  </span>
                </p>
              </div>
              
            </div>
            
          </body>
          </html>
        `,
      }),
    });

    console.log('📧 Réponse Resend - Status:', emailResponse.status);

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('❌ === ERREUR RESEND DÉTAILLÉE ===');
      console.error('❌ Status HTTP:', emailResponse.status);
      console.error('❌ Response Body:', errorData);
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'envoi de l\'email de réinitialisation',
          details: `Erreur Resend (${emailResponse.status}): ${errorData}`
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('✅ === EMAIL RESET PASSWORD ENVOYÉ ===');
    console.log('📧 Email ID Resend:', emailResult.id);
    console.log('📧 Destinataire:', email);
    console.log('🔗 URL de reset:', resetUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email de réinitialisation envoyé avec succès',
        emailId: emailResult.id,
        resetUrl: resetUrl,
        expiresAt: expiresAt.toISOString()
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('💥 Erreur générale:', error);
    console.error('💥 Stack trace:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});