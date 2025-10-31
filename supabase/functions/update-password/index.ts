import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    console.log('🔐 === DÉBUT UPDATE PASSWORD ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { token, resetId, newPassword } = await req.json();

    if (!token || !resetId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants (token, resetId, newPassword)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Validation du token:', { token, resetId });

    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .select('id, email, token, user_id, status, expires_at')
      .eq('id', resetId)
      .eq('token', token)
      .eq('status', 'pending')
      .maybeSingle();

    if (resetError || !resetData) {
      console.error('❌ Token invalide:', resetError?.message);
      return new Response(
        JSON.stringify({ error: 'Token de réinitialisation invalide ou expiré' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(resetData.expires_at) < new Date()) {
      console.error('❌ Token expiré');
      return new Response(
        JSON.stringify({ error: 'Ce lien de réinitialisation a expiré' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Token valide pour:', resetData.email);

    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Erreur listUsers:', listError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la recherche de l\'utilisateur' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUser = authUsers.users.find(u => u.email === resetData.email);

    if (!authUser) {
      console.error('❌ Utilisateur non trouvé dans auth.users');
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Utilisateur trouvé:', authUser.id);

    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('❌ Erreur updateUserById:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour du mot de passe' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Mot de passe mis à jour avec succès');

    await supabase
      .from('password_resets')
      .update({
        status: 'used',
        used_at: new Date().toISOString()
      })
      .eq('id', resetData.id);

    console.log('✅ Token marqué comme utilisé');
    console.log('✅ === UPDATE PASSWORD RÉUSSI ===');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Mot de passe réinitialisé avec succès',
        email: resetData.email
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erreur générale:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});