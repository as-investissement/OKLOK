import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface InviteRequest {
  email: string;
  companyName: string;
  invitedBy: string;
  employeeData: {
    name: string;
    department: string;
    position: string;
    hire_date: string;
    birth_date?: string;
    salary?: number;
    phone?: string;
    address?: string;
    emergency_contact?: string;
    social_security?: string;
    bank_info?: string;
  };
  companyId: string;
}

Deno.serve(async (req: Request) => {
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { email, employeeData, companyId, companyName, invitedBy }: InviteRequest = await req.json();

    if (!email || !employeeData || !companyId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Configuration Resend manquante',
          details: 'Veuillez configurer RESEND_API_KEY dans les variables d\'environnement Supabase',
          setup_instructions: 'Allez dans votre dashboard Supabase → Settings → Edge Functions → Environment Variables → Ajoutez RESEND_API_KEY'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const inviteToken = crypto.randomUUID();

    const { data: invitationData, error: insertError } = await supabase
      .from('user_invitations')
      .insert({
        email,
        token: inviteToken,
        invited_by: user.id,
        company_id: companyId,
        employee_data: employeeData,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create invitation:', insertError);
      
      if (insertError.code === '23505' && insertError.message.includes('user_invitations_email_key')) {
        return new Response(
          JSON.stringify({ 
            error: 'Une invitation existe déjà pour cet email.',
            details: 'Duplicate invitation'
          }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur création invitation',
          details: insertError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const PUBLIC_APP_URL = Deno.env.get('PUBLIC_APP_URL');
    if (!PUBLIC_APP_URL) {
      console.error('PUBLIC_APP_URL not configured in environment variables');
      return new Response(
        JSON.stringify({
          error: 'Configuration manquante',
          details: 'PUBLIC_APP_URL doit être configuré dans les variables d\'environnement Supabase'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const activationUrl = `${PUBLIC_APP_URL}/email-redirect?token=${inviteToken}&inviteId=${invitationData.id}`;
    

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@as-numelec.fr',
        to: [email],
        subject: `Invitation à rejoindre ${companyName || 'AS INVESTISSEMENT'} - Feuilles de Temps`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invitation - ${companyName || 'AS INVESTISSEMENT'}</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
            <div style="background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">🎯 Invitation</h1>
                <h2 style="color: #bfdbfe; margin: 10px 0 0 0; font-weight: normal; font-size: 18px;">${companyName || 'AS INVESTISSEMENT'}</h2>
              </div>
              
              <div style="padding: 30px;">
                <p style="font-size: 16px; margin-bottom: 20px;">Bonjour <strong>${employeeData.name}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 25px;">
                  <strong>${invitedBy}</strong> vous invite à rejoindre l'équipe de <strong>${companyName || 'AS INVESTISSEMENT'}</strong> 
                  pour créer votre espace personnel de gestion des feuilles de temps.
                </p>
                
                <div style="background: #f8fafc; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                  <h3 style="color: #1e40af; margin-top: 0; font-size: 18px;">🎯 Créez votre espace pour :</h3>
                  <ul style="color: #475569; padding-left: 20px; margin: 15px 0;">
                    <li style="margin-bottom: 8px;">⏰ Saisir vos heures de travail quotidiennes</li>
                    <li style="margin-bottom: 8px;">🏗️ Suivre vos projets et chantiers</li>
                    <li style="margin-bottom: 8px;">📤 Soumettre vos feuilles de temps pour validation</li>
                    <li style="margin-bottom: 8px;">📊 Consulter l'historique de vos heures</li>
                    <li style="margin-bottom: 8px;">📱 Accéder depuis mobile ou ordinateur</li>
                  </ul>
                </div>
                
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
                        🚀 Créer mon espace maintenant
                      </a>
                    </td>
                  </tr>
                </table>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <p style="margin: 0; color: #92400e; font-size: 14px;">
                    <strong>⏰ Important :</strong> Ce lien expire dans <strong>7 jours</strong>. 
                    Créez votre espace rapidement pour accéder à l'application.
                  </p>
                </div>
                
                <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 25px 0;">
                  <h4 style="color: #0369a1; margin-top: 0;">💬 Besoin d'aide ?</h4>
                  <p style="margin: 0; color: #0369a1; font-size: 14px;">
                    Contactez <strong>${invitedBy}</strong> ou l'équipe de ${companyName || 'AS INVESTISSEMENT'} pour toute question.
                  </p>
                </div>
              </div>
              
              <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #64748b; margin: 0;">
                  Email envoyé automatiquement par la plateforme Feuilles de Temps de <strong>${companyName || 'AS INVESTISSEMENT'}</strong>
                  <br>Si vous n'êtes pas concerné par cette invitation, vous pouvez ignorer cet email.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error('Failed to send email via Resend:', errorData);
      
      let errorDetails = errorData;
      try {
        const parsedError = JSON.parse(errorData);
        if (parsedError.message === 'API key is invalid') {
          return new Response(
            JSON.stringify({ 
              error: 'Clé API Resend invalide ou expirée',
              details: 'La clé API Resend configurée dans Supabase n\'est pas valide ou a expiré',
              setup_instructions: '1. Vérifiez dans Resend Dashboard (resend.com) que votre clé API est active\n2. Créez une nouvelle clé API si nécessaire\n3. Mettez à jour RESEND_API_KEY dans Supabase → Settings → Edge Functions → Environment Variables\n4. Format attendu: re_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx'
            }),
            {
              status: 401,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        errorDetails = parsedError.message || errorData;
      } catch {
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erreur envoi email',
          details: 'Échec de l\'envoi de l\'email d\'invitation via Resend',
          technical_details: errorDetails
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const emailResult = await emailResponse.json();
    console.log('Email sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Invitation envoyée avec succès',
        email_id: emailResult.id
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in invite-user-auth function:', error);
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