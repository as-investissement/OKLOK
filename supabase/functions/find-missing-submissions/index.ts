import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

interface FindMissingSubmissionsRequest {
  start: string; // ISO date string (lundi 00:00)
  end: string;   // ISO date string (dimanche 23:59)
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

    console.log('📊 === DÉBUT FIND MISSING SUBMISSIONS ===');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

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

    // Parse request body
    const { start, end }: FindMissingSubmissionsRequest = await req.json();

    if (!start || !end) {
      return new Response(
        JSON.stringify({ error: 'Paramètres start et end requis (format ISO date)' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('📅 Période analysée:', { start, end });

    // Requête SQL PostgreSQL optimisée pour analyser les soumissions manquantes
    const sqlQuery = `
      WITH jours AS (
        SELECT gs::date AS d
        FROM generate_series($1::date, $2::date, interval '1 day') gs
        WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 5
      ),
      users AS (
        SELECT DISTINCT user_id
        FROM timesheet_entries
        WHERE date BETWEEN $1 AND $2
      )
      SELECT
        u.user_id,
        ARRAY_REMOVE(ARRAY_AGG(
          CASE
            WHEN t.status IN ('pending', 'submitted', 'approved') THEN NULL
            ELSE EXTRACT(ISODOW FROM j.d)::int
          END
        ), NULL) AS missing_ids
      FROM users u
      CROSS JOIN jours j
      LEFT JOIN timesheet_entries t
        ON t.user_id = u.user_id
       AND t.date::date = j.d
      GROUP BY u.user_id
      HAVING COUNT(*) FILTER (WHERE t.status IS NULL OR t.status NOT IN ('pending', 'submitted', 'approved')) > 0;
    `;

    console.log('🔍 Exécution requête SQL PostgreSQL...');

    try {
      // Requête SQL PostgreSQL optimisée pour timesheet_entries
      const sqlQuery = `
        WITH jours AS (
          SELECT gs::date AS d
          FROM generate_series($1::date, $2::date, interval '1 day') gs
          WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 5
        ),
        users AS (
          SELECT DISTINCT user_id
          FROM timesheet_entries
          WHERE date BETWEEN $1 AND $2
        )
        SELECT
          u.user_id,
          ARRAY_REMOVE(ARRAY_AGG(
            CASE
              WHEN t.status IN ('pending', 'submitted', 'approved', 'partially_approved') THEN NULL
              ELSE EXTRACT(ISODOW FROM j.d)::int
            END
          ), NULL) AS missing_ids
        FROM users u
        CROSS JOIN jours j
        LEFT JOIN timesheet_entries t
          ON t.user_id = u.user_id
         AND t.date::date = j.d
        GROUP BY u.user_id
        HAVING COUNT(*) FILTER (WHERE t.status IS NULL OR t.status NOT IN ('pending', 'submitted', 'approved', 'partially_approved')) > 0;
      `;

      // Essayer d'exécuter la requête SQL directement via RPC
      const { data: sqlResults, error: sqlError } = await supabase
        .rpc('exec_sql', {
          query: sqlQuery,
          params: [start.split('T')[0], end.split('T')[0]]
        });

      if (sqlError) {
        console.log('⚠️ Requête SQL échouée, fallback vers TypeScript:', sqlError.message);
        throw new Error('SQL fallback needed');
      }

      console.log('✅ Requête SQL réussie, traitement des résultats...');
      
      const results: MissingSubmissionsResponse[] = [];
      
      if (sqlResults && Array.isArray(sqlResults)) {
        // Mapper les numéros de jours ISO vers les noms français
        const dayNames = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        
        sqlResults.forEach((row: any) => {
          if (row.missing_ids && Array.isArray(row.missing_ids) && row.missing_ids.length > 0) {
            const missingDays = row.missing_ids.map((dayNum: number) => dayNames[dayNum]);
            
            results.push({
              user_id: row.user_id,
              missingDays: missingDays
            });
          }
        });
      }

      console.log('✅ === ANALYSE SQL TERMINÉE ===');
      console.log('📊 Employés avec soumissions manquantes:', results.length);

      return new Response(
        JSON.stringify({ 
          success: true,
          employees: results,
          method: 'sql_query'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (sqlError) {
      console.log('🔄 === FALLBACK VERS APPROCHE TYPESCRIPT ===');
      
      // Fallback: utiliser timesheet_entries directement
      
      // Générer les jours ouvrés de la période (lundi à vendredi)
      const startDate = new Date(start);
      const endDate = new Date(end);
      const workingDays: Date[] = [];
      
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dayOfWeek = d.getDay(); // 0 = dimanche, 1 = lundi, ..., 6 = samedi
        const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; // Convertir en ISO (1 = lundi, 7 = dimanche)
        
        if (isoDayOfWeek >= 1 && isoDayOfWeek <= 5) { // Lundi à vendredi
          workingDays.push(new Date(d));
        }
      }
      
      console.log('📅 Jours ouvrés générés (lundi-vendredi):', workingDays.length);
      
      // Récupérer toutes les entrées de timesheet_entries pour la période
      const { data: entries, error: entriesError } = await supabase
        .from('timesheet_entries')
        .select('user_id, date, status')
        .gte('date', start.split('T')[0])
        .lte('date', end.split('T')[0]);
      
      if (entriesError) {
        console.error('❌ Erreur récupération timesheet_entries:', entriesError);
        return new Response(
          JSON.stringify({ 
            error: 'Erreur récupération timesheet_entries',
            details: entriesError.message
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      console.log('📋 Entrées trouvées:', entries?.length || 0);
      
      // Grouper par utilisateur
      const userEntries: Record<string, any[]> = {};
      entries?.forEach(entry => {
        if (!userEntries[entry.user_id]) {
          userEntries[entry.user_id] = [];
        }
        userEntries[entry.user_id].push(entry);
      });
      
      // Analyser les soumissions manquantes
      const results: MissingSubmissionsResponse[] = [];
      const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
      
      Object.keys(userEntries).forEach(userId => {
        const userEntriesData = userEntries[userId];
        const missingDayNames: string[] = [];
        
        workingDays.forEach(workingDay => {
          const dateStr = workingDay.toISOString().split('T')[0];
          const dayEntries = userEntriesData.filter(entry => entry.date === dateStr);
          
          // Vérifier si au moins une entrée est soumise/approuvée
          const hasSubmittedEntry = dayEntries.some(entry =>
            ['pending', 'submitted', 'approved', 'partially_approved'].includes(entry.status)
          );
          
          if (!hasSubmittedEntry) {
            const dayOfWeek = workingDay.getDay(); // 0-6
            missingDayNames.push(dayNames[dayOfWeek]);
          }
        });
        
        if (missingDayNames.length > 0) {
          results.push({
            user_id: userId,
            missingDays: missingDayNames
          });
        }
      });
      
      console.log('✅ === ANALYSE TYPESCRIPT TERMINÉE ===');
      console.log('📊 Employés avec soumissions manquantes:', results.length);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          employees: results,
          method: 'typescript_fallback'
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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