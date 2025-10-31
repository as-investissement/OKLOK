import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Helper pour calculer la plage de semaine en timezone Europe/Paris
function getWeekRange(date: Date = new Date()): { start: string; end: string } {
  // Créer une date en timezone Europe/Paris
  const parisDate = new Date(date.toLocaleString("en-US", { timeZone: "Europe/Paris" }));
  
  // Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
  const dayOfWeek = parisDate.getDay();
  
  // Calculer le nombre de jours depuis lundi (1 = lundi)
  // Si dimanche (0), c'est 6 jours depuis lundi
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Calculer le lundi de cette semaine à 00:00:00
  const monday = new Date(parisDate);
  monday.setDate(parisDate.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  
  // Calculer le dimanche de cette semaine à 23:59:59
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // Dimanche = lundi + 6 jours
  sunday.setHours(23, 59, 59, 999);
  
  return {
    start: monday.toISOString(),
    end: sunday.toISOString()
  };
}

interface MissingSubmissionsResponse {
  user_id: string;
  missingDays: string[];
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
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('🔍 === DÉBUT DEBUG MISSING TIMESHEETS ===');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('CUSTOM_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('CUSTOM_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
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

    // Calculer la plage de semaine avec getWeekRange()
    const { start, end } = getWeekRange();
    
    console.log('📅 Période calculée (Europe/Paris):', { start, end });

    // Appeler la fonction findEmployeesMissingSubmissions
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
          error: 'Erreur lors de l\'appel à find-missing-submissions',
          details: errorData
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const result = await response.json();
    
    console.log('✅ === RÉSULTAT DEBUG MISSING TIMESHEETS ===');
    console.log('📊 Employés avec soumissions manquantes:', result.employees?.length || 0);
    console.log('📋 Détail:', result.employees);

    return new Response(
      JSON.stringify({ 
        success: true,
        period: { start, end },
        timezone: 'Europe/Paris',
        items: result.employees || [],
        method: result.method || 'unknown'
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