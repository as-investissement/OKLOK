import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aaayxughfmacudasrwqp.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhYXl4dWdoZm1hY3VkYXNyd3FwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTI5MTI3MSwiZXhwIjoyMDY2ODY3MjcxfQ.9y_eONAz6sI1JOARe9R33punc_nrbCqLAB_WZz92Fzk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixAllHours() {
  console.log('🔧 Correction de tous les total_hours...\n');

  // Récupérer tous les timesheets
  const { data: timesheets, error } = await supabase
    .from('timesheets')
    .select('id');

  if (error) {
    console.error('❌ Erreur:', error);
    return;
  }

  console.log(`📊 ${timesheets.length} timesheets à traiter\n`);

  let fixed = 0;
  let unchanged = 0;

  for (const ts of timesheets) {
    // Calculer les heures depuis les entries
    const { data: entries } = await supabase
      .from('timesheet_entries')
      .select('normal_hours, overtime_hours')
      .eq('timesheet_id', ts.id);

    const calculatedHours = entries.reduce((sum, e) =>
      sum + (e.normal_hours || 0) + (e.overtime_hours || 0), 0
    );

    // Récupérer total_hours actuel
    const { data: current } = await supabase
      .from('timesheets')
      .select('total_hours')
      .eq('id', ts.id)
      .single();

    if (Math.abs((current.total_hours || 0) - calculatedHours) > 0.01) {
      // Mettre à jour
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({ total_hours: calculatedHours })
        .eq('id', ts.id);

      if (updateError) {
        console.error(`❌ Erreur update ${ts.id}:`, updateError);
      } else {
        fixed++;
        console.log(`✅ ${ts.id}: ${current.total_hours}h → ${calculatedHours}h`);
      }
    } else {
      unchanged++;
    }
  }

  console.log('\n📈 RÉSULTAT:');
  console.log(`✅ Corrigés: ${fixed}`);
  console.log(`⏭️  Déjà corrects: ${unchanged}`);
}

fixAllHours().catch(console.error);
