import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ActivateUserRequest {
  inviteId: string;
  token: string;
  password: string;
}

Deno.serve(async (req) => {
  try {
    // Handle CORS preflight request
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    console.log('🚀 === DÉBUT ACTIVATION AVEC AUTH_ID ===');

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Configuration Supabase manquante');
      return new Response(
        JSON.stringify({ error: 'Configuration Supabase manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Utiliser SERVICE_ROLE_KEY pour bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('✅ Client Supabase créé avec SERVICE_ROLE_KEY');

    // Parse request body
    let requestBody;
    try {
      const bodyText = await req.text();
      if (!bodyText || bodyText.trim() === '') {
        console.error('❌ Corps de requête vide');
        return new Response(
          JSON.stringify({ error: 'Corps de requête vide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Format JSON invalide',
          details: parseError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { inviteId, token, password }: ActivateUserRequest = requestBody;

    if (!inviteId || !token || !password) {
      console.error('❌ Paramètres manquants');
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: inviteId, token, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 === RECHERCHE INVITATION ===');
    
    // Find the invitation by ID
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('id', inviteId)
      .eq('token', token)
      .single();

    if (inviteError || !invitation) {
      console.error('❌ Invitation non trouvée:', inviteError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Invitation non trouvée ou invalide',
          details: inviteError?.message 
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Invitation trouvée:', invitation.email);

    // Check if invitation has already been accepted
    if (invitation.status === 'accepted') {
      console.error('❌ Invitation déjà utilisée');
      return new Response(
        JSON.stringify({
          error: 'Cette invitation a déjà été utilisée',
          details: 'Le compte a déjà été activé avec ce lien'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if invitation is expired
    if (new Date(invitation.expires_at) < new Date()) {
      console.error('❌ Invitation expirée');
      return new Response(
        JSON.stringify({ error: 'Invitation expirée' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const employeeData = invitation.employee_data;
    console.log('👤 Données employé:', employeeData);

    // 🎯 ÉTAPE 1 : CRÉER LE COMPTE AUTH D'ABORD
    console.log('🔐 === CRÉATION COMPTE AUTH ===');
    
    // Vérifier si l'utilisateur Auth existe déjà
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erreur listage auth users:', listError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur accès système auth',
          details: listError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const existingAuthUser = authUsers.users.find(u => u.email === invitation.email.toLowerCase());
    let authUserId: string;
    
    if (existingAuthUser) {
      console.log('🔐 Compte Auth existant trouvé, mise à jour mot de passe...');
      authUserId = existingAuthUser.id;
      
      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { 
          password: password,
          email_confirm: true
        }
      );
      
      if (updateError) {
        console.error('❌ Erreur mise à jour mot de passe:', updateError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur mise à jour mot de passe',
            details: updateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('✅ Mot de passe mis à jour pour compte existant');
      
    } else {
      console.log('🔐 Création nouveau compte Auth...');
      
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invitation.email.toLowerCase(),
        password: password,
        email_confirm: true
      });
      
      if (authError) {
        console.error('❌ Erreur création auth:', authError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur création compte auth',
            details: authError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      authUserId = authData.user!.id;
      console.log('✅ Nouveau compte Auth créé avec ID:', authUserId);
    }

    // 🎯 ÉTAPE 2 : GÉRER L'UTILISATEUR DANS LA TABLE USERS (AVEC AUTH_ID)
    console.log('👤 === GESTION UTILISATEUR AVEC AUTH_ID ===');
    
    // Vérifier si l'utilisateur existe déjà dans users (par email)
    const { data: existingUser, error: existingUserError } = await supabase
      .from('users')
      .select('id, email, name, auth_id')
      .eq('email', invitation.email.toLowerCase())
      .maybeSingle();

    if (existingUserError) {
      console.error('❌ Erreur recherche utilisateur existant:', existingUserError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur recherche utilisateur',
          details: existingUserError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let finalUserId: string;

    if (existingUser) {
      console.log('👤 Utilisateur existant trouvé, mise à jour auth_id...');
      finalUserId = existingUser.id;
      
      // Mettre à jour seulement l'auth_id
      const { data: userUpdateData, error: userUpdateError } = await supabase
        .from('users')
        .update({
          auth_id: authUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (userUpdateError) {
        console.error('❌ Erreur mise à jour auth_id users:', userUpdateError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur mise à jour auth_id',
            details: userUpdateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ auth_id mis à jour dans users:', userUpdateData);
      
    } else {
      console.log('👤 Création nouvel utilisateur avec auth_id...');
      
      // Créer un nouvel utilisateur avec un ID interne ET l'auth_id
      finalUserId = crypto.randomUUID(); // ID interne
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: finalUserId, // ID interne
          auth_id: authUserId, // ID Auth
          email: invitation.email.toLowerCase(),
          name: employeeData.name,
          role: employeeData.position === 'admin' ? 'admin' : 'employee',
          department: employeeData.department || 'Employé',
          company_id: invitation.company_id,
          birth_date: employeeData.birth_date || null,
          hire_date: employeeData.hire_date || new Date().toISOString().split('T')[0],
          status: 'active',
          archived: false
        })
        .select()
        .single();

      if (userError) {
        console.error('❌ Erreur création users:', userError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur création utilisateur',
            details: userError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Utilisateur créé avec auth_id:', userData);
    }

    // 🎯 ÉTAPE 3 : GÉRER L'EMPLOYÉ AVEC AUTH_ID (ANTI-DUPLICATION)
    console.log('📝 === GESTION EMPLOYÉ AVEC AUTH_ID ===');
    
    // Vérifier si l'employé existe déjà (par user_id OU par auth_id)
    const { data: existingEmployee, error: existingEmpError } = await supabase
      .from('employees')
      .select('user_id, auth_id')
      .or(`user_id.eq.${finalUserId},auth_id.eq.${authUserId}`)
      .maybeSingle();

    if (existingEmpError) {
      console.error('❌ Erreur recherche employé existant:', existingEmpError);
    }

    const nameParts = employeeData.name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    if (existingEmployee) {
      console.log('👤 Employé existe déjà, mise à jour avec auth_id...');
      
      const { data: employeeUpdateResult, error: employeeUpdateError } = await supabase
        .from('employees')
        .update({
          user_id: finalUserId, // ID interne users
          auth_id: authUserId, // ID Auth
          first_name: firstName,
          last_name: lastName,
          birth_date: employeeData.birth_date || null,
          hire_date: employeeData.hire_date || new Date().toISOString().split('T')[0],
          position: employeeData.position === 'employee' ? 'Employé' : (employeeData.position || employeeData.department || 'Employé'),
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingEmployee.user_id)
        .select()
        .single();

      if (employeeUpdateError) {
        console.error('❌ Erreur mise à jour employé:', employeeUpdateError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur mise à jour employé',
            details: employeeUpdateError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Employé mis à jour avec auth_id:', employeeUpdateResult);
      
    } else {
      console.log('👤 Création nouvel employé avec auth_id...');
      
      const { data: employeeResult, error: employeeError } = await supabase
        .from('employees')
        .insert({
          user_id: finalUserId, // ID interne users
          auth_id: authUserId, // ID Auth
          first_name: firstName,
          last_name: lastName,
          birth_date: employeeData.birth_date || null,
          hire_date: employeeData.hire_date || new Date().toISOString().split('T')[0],
          position: employeeData.position === 'employee' ? 'Employé' : (employeeData.position || employeeData.department || 'Employé'),
          status: 'active'
        })
        .select()
        .single();

      if (employeeError) {
        console.error('❌ Erreur insertion employees:', employeeError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur création employé',
            details: employeeError.message 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Employé créé avec auth_id:', employeeResult);
    }

    // 🎯 ÉTAPE 4 : CRÉER LES ACCORDS UTILISATEUR (ANTI-DUPLICATION)
    console.log('📝 === INSERTION USER_AGREEMENTS (ANTI-DUPLICATION) ===');
    const agreementTypes = ['terms_of_service', 'privacy_policy', 'data_processing'];
    const agreementResults = [];
    
    for (const agreementType of agreementTypes) {
      console.log(`📝 Vérification accord: ${agreementType}`);
      
      // Vérifier si l'accord existe déjà
      const { data: existingAgreement, error: existingAgreementError } = await supabase
        .from('user_agreements')
        .select('id')
        .or(`user_id.eq.${finalUserId},auth_id.eq.${authUserId}`)
        .eq('agreement_type', agreementType)
        .maybeSingle();

      if (existingAgreementError) {
        console.error(`❌ Erreur recherche accord ${agreementType}:`, existingAgreementError);
        continue;
      }

      if (existingAgreement) {
        console.log(`✅ Accord ${agreementType} existe déjà, pas de duplication`);
        agreementResults.push({ type: agreementType, status: 'already_exists' });
        continue;
      }

      // Créer l'accord seulement s'il n'existe pas
      const { data: agreementData, error: agreementError } = await supabase
        .from('user_agreements')
        .insert({
          user_id: finalUserId,
          auth_id: authUserId,
          agreement_type: agreementType,
          accepted_at: new Date().toISOString(),
          ip_address: req.headers.get('x-forwarded-for') || 'activation-function',
          user_agent: req.headers.get('user-agent') || 'activation-function'
        })
        .select()
        .single();

      if (agreementError) {
        console.error(`❌ Erreur accord ${agreementType}:`, agreementError);
        agreementResults.push({ type: agreementType, status: 'error', error: agreementError.message });
      } else {
        console.log(`✅ Accord ${agreementType} créé:`, agreementData);
        agreementResults.push({ type: agreementType, status: 'created', data: agreementData });
      }
    }

    // 🎯 ÉTAPE 5 : CRÉER LE LOG D'ACTIVATION (ANTI-DUPLICATION)
    console.log('📝 === INSERTION ACTIVATION_LOG (ANTI-DUPLICATION) ===');
    
    // Vérifier si le log existe déjà
    const { data: existingLog, error: existingLogError } = await supabase
      .from('activation_log')
      .select('id')
      .or(`user_id.eq.${finalUserId},auth_id.eq.${authUserId}`)
      .eq('activation_type', 'account_activation')
      .maybeSingle();

    if (existingLogError) {
      console.error('❌ Erreur recherche log existant:', existingLogError);
    }

    if (existingLog) {
      console.log('✅ Log d\'activation existe déjà, pas de duplication');
    } else {
      const { data: logData, error: logError } = await supabase
        .from('activation_log')
        .insert({
          user_id: finalUserId,
          auth_id: authUserId,
          activated_at: new Date().toISOString(),
          activation_type: 'account_activation'
        })
        .select()
        .single();

      if (logError) {
        console.error('❌ Erreur log activation:', logError);
      } else {
        console.log('✅ LOG ACTIVATION CRÉÉ:', logData);
      }
    }

    // 🎯 ÉTAPE 6 : MARQUER L'INVITATION COMME ACCEPTÉE
    console.log('✉️ === MISE À JOUR INVITATION ===');
    const { data: invitationUpdateData, error: updateError } = await supabase
      .from('user_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString()
      })
      .eq('id', inviteId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour invitation:', updateError.message);
    } else {
      console.log('✅ Invitation marquée comme acceptée:', invitationUpdateData);
    }

    console.log('🎉 === ACTIVATION TERMINÉE AVEC AUTH_ID ===');
    console.log('📊 Résumé:');
    console.log('- ID interne users:', finalUserId);
    console.log('- ID Auth:', authUserId);
    console.log('- Accords créés:', agreementResults.filter(a => a.status === 'created').length);
    console.log('- Accords existants:', agreementResults.filter(a => a.status === 'already_exists').length);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Activation réussie avec auth_id',
        userId: finalUserId,
        authId: authUserId,
        agreementsCreated: agreementResults.filter(a => a.status === 'created').length,
        agreementsExisting: agreementResults.filter(a => a.status === 'already_exists').length,
        testMode: existingAuthUser ? true : false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});