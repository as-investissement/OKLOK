import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🔧 === RÉPARATION SYNCHRONISATION AUTH ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email }: { email: string } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📧 Email à synchroniser:', email);

    // 1. Trouver l'utilisateur dans la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, auth_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ 
          error: 'Utilisateur non trouvé dans table users',
          details: userError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Utilisateur trouvé dans users:', userData);

    // 2. Trouver le compte Auth correspondant
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erreur listage auth users',
          details: listError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authUser = authUsers.users.find(u => u.email === email.toLowerCase());
    
    if (!authUser) {
      return new Response(
        JSON.stringify({ 
          error: 'Compte Auth non trouvé',
          details: 'Aucun compte d\'authentification trouvé pour cet email'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Compte Auth trouvé:', authUser.id);

    // 3. Synchroniser l'auth_id dans la table users
    const { data: syncResult, error: syncError } = await supabase
      .from('users')
      .update({
        auth_id: authUser.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', userData.id)
      .select()
      .single();

    if (syncError) {
      return new Response(
        JSON.stringify({ 
          error: 'Erreur synchronisation auth_id',
          details: syncError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ auth_id synchronisé:', syncResult);

    // 4. Synchroniser aussi dans employees si nécessaire
    const { data: employeeSync, error: employeeSyncError } = await supabase
      .from('employees')
      .update({
        auth_id: authUser.id,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userData.id)
      .select();

    if (employeeSyncError) {
      console.error('⚠️ Erreur sync employees (non critique):', employeeSyncError);
    } else {
      console.log('✅ auth_id synchronisé dans employees aussi');
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Synchronisation auth_id réussie',
        user_id: userData.id,
        auth_id: authUser.id,
        email: email,
        employee_synced: !employeeSyncError
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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