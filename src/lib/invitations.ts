import { supabase } from './supabaseClient';

export async function sendInvitationAlt(
  email: string,
  companyId: string, 
  employeeData: { name: string; department?: string; role: string },
  companyName: string,
  invitedByName: string
) {
  try {
    console.log('🎯 === CRÉATION INVITATION VIA EDGE FUNCTION ===');
    console.log('📧 Email:', email);
    console.log('🏢 Entreprise:', companyName);
    console.log('👤 Employé:', employeeData.name);

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`Erreur de session: ${sessionError.message}`);
    }
    
    if (!session?.access_token) {
      throw new Error('Session utilisateur expirée. Veuillez vous reconnecter.');
    }

    // Use the invite-user-auth Edge Function which handles RLS properly
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user-auth`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email.toLowerCase(),
        employeeData: {
          ...employeeData,
          position: employeeData.role, // Map role to position as expected by Edge Function
        },
        companyId,
        companyName,
        invitedBy: invitedByName
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      throw new Error(errorData.error || `Erreur HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ === INVITATION CRÉÉE AVEC SUCCÈS ===');
    console.log('📋 Résultat:', result);

    return result;
  } catch (error) {
    console.error('❌ Erreur sendInvitationAlt:', error);
    console.error('❌ Stack trace:', error.stack);
    throw error;
  }
}