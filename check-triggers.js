import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayxughfmacudasrwqp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl4dWdoZm1hY3VkYXNyd3FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI5MTI3MSwiZXhwIjoyMDY2ODY3MjcxfQ.9y_eONAz6sI1JOARe9R33punc_nrbCqLAB_WZz92Fzk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTriggers() {
  console.log('🔍 Vérification des triggers pour total_hours...\n');

  // Vérifier les triggers existants
  const { data: triggers, error: triggerError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        t.trigger_name,
        t.event_object_table,
        t.event_manipulation,
        t.action_timing,
        t.action_statement
      FROM information_schema.triggers t
      WHERE t.event_object_table IN ('timesheets', 'timesheet_entries')
      ORDER BY t.event_object_table, t.trigger_name;
    `
  });

  if (triggerError) {
    console.log('❌ Erreur (méthode RPC):', triggerError.message);
    console.log('\n📋 Essai avec requête directe...\n');

    // Essai alternatif
    const { data: rawData, error: rawError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .in('event_object_table', ['timesheets', 'timesheet_entries']);

    if (rawError) {
      console.log('❌ Impossible de lire les triggers:', rawError.message);
      console.log('\n💡 Solution: Exécute cette requête dans le SQL Editor:');
      console.log(`
SELECT
  trigger_name,
  event_object_table,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('timesheets', 'timesheet_entries')
ORDER BY event_object_table, trigger_name;
      `);
      return;
    }
  }

  if (triggers && triggers.length > 0) {
    console.log(`✅ ${triggers.length} trigger(s) trouvé(s):\n`);
    triggers.forEach(t => {
      console.log(`📌 ${t.trigger_name}`);
      console.log(`   Table: ${t.event_object_table}`);
      console.log(`   Event: ${t.action_timing} ${t.event_manipulation}`);
      console.log(`   Action: ${t.action_statement.substring(0, 100)}...`);
      console.log('');
    });
  } else {
    console.log('❌ AUCUN trigger trouvé sur timesheets ou timesheet_entries!\n');
    console.log('💡 C\'est pour ça que total_hours n\'est jamais calculé!\n');
  }

  // Vérifier les fonctions existantes
  console.log('🔍 Vérification des fonctions de calcul...\n');

  const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT
        routine_name,
        routine_type
      FROM information_schema.routines
      WHERE routine_name LIKE '%total_hours%'
         OR routine_name LIKE '%timesheet%'
      ORDER BY routine_name;
    `
  });

  if (!funcError && functions && functions.length > 0) {
    console.log(`✅ ${functions.length} fonction(s) trouvée(s):\n`);
    functions.forEach(f => {
      console.log(`   - ${f.routine_name} (${f.routine_type})`);
    });
  } else {
    console.log('❌ Aucune fonction de calcul trouvée\n');
  }
}

checkTriggers().catch(console.error);
