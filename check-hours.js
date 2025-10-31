import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayxughfmacudasrwqp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl4dWdoZm1hY3VkYXNyd3FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI5MTI3MSwiZXhwIjoyMDY2ODY3MjcxfQ.9y_eONAz6sI1JOARe9R33punc_nrbCqLAB_WZz92Fzk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkTimesheetHours() {
  console.log('🔍 Vérification des heures dans les timesheets...\n');

  // 1. Récupérer tous les timesheets avec leurs entries
  const { data: timesheets, error: tsError } = await supabase
    .from('timesheets')
    .select('id, week_starting, week_ending, total_hours, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (tsError) {
    console.error('❌ Erreur timesheets:', tsError);
    return;
  }

  console.log(`📊 ${timesheets.length} timesheets trouvés\n`);

  let issuesFound = 0;
  let correctCount = 0;

  for (const ts of timesheets) {
    // Calculer les heures réelles depuis timesheet_entries
    const { data: entries, error: entriesError } = await supabase
      .from('timesheet_entries')
      .select('normal_hours, overtime_hours')
      .eq('timesheet_id', ts.id);

    if (entriesError) {
      console.error(`❌ Erreur entries pour ${ts.id}:`, entriesError);
      continue;
    }

    const calculatedHours = entries.reduce((sum, e) =>
      sum + (e.normal_hours || 0) + (e.overtime_hours || 0), 0
    );

    const storedHours = ts.total_hours || 0;
    const difference = Math.abs(storedHours - calculatedHours);

    if (difference > 0.01) {
      issuesFound++;
      console.log(`❌ PROBLÈME - Timesheet ${ts.id}`);
      console.log(`   Semaine: ${ts.week_starting} → ${ts.week_ending}`);
      console.log(`   Stocké: ${storedHours}h`);
      console.log(`   Calculé: ${calculatedHours}h`);
      console.log(`   Écart: ${difference.toFixed(2)}h`);
      console.log(`   Entries: ${entries.length}`);
      console.log('');
    } else {
      correctCount++;
    }
  }

  console.log('\n📈 RÉSUMÉ:');
  console.log(`✅ Correct: ${correctCount}`);
  console.log(`❌ Problèmes: ${issuesFound}`);

  if (issuesFound > 0) {
    console.log('\n💡 Tu veux que je corrige les heures incorrectes ? (y/n)');
  }
}

checkTimesheetHours().catch(console.error);
