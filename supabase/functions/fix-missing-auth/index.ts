import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔧 === RÉPARATION COMPTE AUTH MANQUANT ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, password }: { email: string; password: string } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email et mot de passe requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email à réparer:', email);

    // 1. Vérifier que l'utilisateur existe dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ 
          error: 'Utilisateur non trouvé dans la table users',
          details: userError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Utilisateur trouvé dans users:', userData.name);

    // 2. Vérifier s'il existe dans auth.users
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erreur listage utilisateurs auth',
          details: listError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const existingAuthUser = authUsers.users.find(u => u.email === email.toLowerCase());

    if (existingAuthUser) {
      console.log('👤 Utilisateur existe déjà dans auth, mise à jour mot de passe...');
      
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { 
          password: password,
          email_confirm: true
        }
      );

      if (updateError) {
        return new Response(
          JSON.stringify({ 
            error: 'Erreur mise à jour mot de passe',
            details: updateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Synchroniser l'auth_id dans la table users
      const { error: syncError } = await supabase
        .from('users')
        .update({ auth_id: existingAuthUser.id })
        .eq('email', email.toLowerCase());

      if (syncError) {
        console.error('⚠️ Erreur sync auth_id:', syncError.message);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Mot de passe mis à jour',
          userId: existingAuthUser.id,
          action: 'password_updated'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      console.log('🚨 COMPTE AUTH MANQUANT - CRÉATION...');
      
      // Créer le compte d'authentification manquant
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password: password,
        email_confirm: true
      });

      if (authError) {
        return new Response(
          JSON.stringify({ 
            error: 'Erreur création compte auth',
            details: authError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Compte auth créé:', authData.user?.id);

      // Synchroniser l'auth_id dans la table users
      const { error: syncError } = await supabase
        .from('users')
        .update({ auth_id: authData.user!.id })
        .eq('email', email.toLowerCase());

      if (syncError) {
        console.error('⚠️ Erreur sync auth_id:', syncError.message);
      }

      // Synchroniser aussi dans employees
      const { error: empSyncError } = await supabase
        .from('employees')
        .update({ auth_id: authData.user!.id })
        .eq('user_id', userData.id);

      if (empSyncError) {
        console.error('⚠️ Erreur sync employees:', empSyncError.message);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Compte auth créé et synchronisé',
          userId: authData.user?.id,
          action: 'auth_user_created'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('💥 Erreur générale:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erreur interne du serveur',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});