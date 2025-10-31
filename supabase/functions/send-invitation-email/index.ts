import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  console.log('🚀 === FONCTION SEND-INVITATION-EMAIL APPELÉE ===');
  console.log('📍 Méthode:', req.method);
  console.log('📍 URL:', req.url);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const body = await req.json();
    console.log('📦 BODY REÇU:', body);

    const { email, companyName, employeeName, invitedBy, token, inviteId } = body;
    
    console.log('📧 DÉBUT D\'ENVOI D\'INVITATION:', {
      email,
      companyName,
      employeeName,
      invitedBy,
      token_received: token,
      invite_id_received: inviteId
    });

    if (!email || !companyName || !employeeName || !invitedBy) {
      console.error('🚨 Données manquantes:', { email, companyName, employeeName, invitedBy });
      return new Response(
        JSON.stringify({ error: 'Données manquantes' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!token || !inviteId) {
      console.error('🚨 Token ou inviteId manquant:', { token, inviteId });
      return new Response(
        JSON.stringify({ 
          error: 'Token ou inviteId manquant',
          token_received: token,
          invite_id_received: inviteId
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      console.error('🚨 Clé API Resend manquante');
      return new Response(
        JSON.stringify({ error: 'Clé API Resend manquante' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL')!;
    const activationUrl = `${PUBLIC_APP_URL}/activate-account?token=${encodeURIComponent(token)}&inviteId=${encodeURIComponent(inviteId)}`;

    console.log('🔗 URL finale vers activate-account:', activationUrl);

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@as-numelec.fr',
        to: [email],
        subject: `Activation - ${companyName} - Créez votre compte`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation - ${companyName}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎯 Invitation</h1>
                <h2 style="color: #bfdbfe; margin: 10px 0 0 0; font-weight: normal; font-size: 18px;">${companyName}</h2>
              </div>
              
              <div style="padding: 30px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>${employeeName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 25px;">
                  <strong>${invitedBy}</strong> vous invite à rejoindre l'équipe de <strong>${companyName}</strong> 
                  pour créer votre espace personnel de gestion des feuilles de temps.
                </p>
                
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 35px 0;">
                  <tr>
                    <td align="center">
                      <a href="${activationUrl}"
                         style="background-color: #2563eb;
                                color: #ffffff !important;
                                padding: 18px 35px;
                                text-decoration: none;
                                border-radius: 8px;
                                font-weight: bold;
                                font-size: 16px;
                                display: inline-block;
                                mso-padding-alt: 0;
                                text-align: center;">
                        ✅ Activer mon compte maintenant
                      </a>
                    </td>
                  </tr>
                </table>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⏰ Important :</strong> Ce lien expire dans <strong>7 jours</strong>.
                  </p>
                </div>
                
                <p style="font-size: 14px; color: #64748b; margin-top: 30px;">
                  Si le bouton ne fonctionne pas, copiez ce lien :
                </p>
                <p style="font-size: 12px; color: #94a3b8; word-break: break-all; background: #f8fafc; padding: 15px; border-radius: 6px;">
                  ${activationUrl}
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('🚨 Erreur Resend:', errorData);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de l\'envoi de l\'email',
          details: errorData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await emailResponse.json();
    console.log('✅ Email envoyé avec succès:', result);
    console.log('🔗 Lien d\'activation inclus:', activationUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email d\'invitation envoyé avec succès',
        emailId: result.id,
        activationUrl: activationUrl
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('🚨 Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur serveur',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});