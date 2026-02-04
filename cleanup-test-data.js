const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lqamcfvzsvkgiwjtllcc.supabase.co', 
  'sb_publishable_zdghzs78HI9HaDOGCaylBQ_xRzSHc1X'
);

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  // Remove all test participants but keep the original enrollment
  const { data: toDelete, error: fetchError } = await supabase
    .from('enrolled_participants')
    .select('*')
    .or('name.ilike.*test*,id.ilike.*test*');
    
  if (fetchError) {
    console.error('Error fetching test data:', fetchError);
    return;
  }
  
  console.log(`Found ${toDelete.length} test records to delete`);
  
  if (toDelete.length > 0) {
    const idsToDelete = toDelete.map(p => p.id);
    const { error: deleteError } = await supabase
      .from('enrolled_participants')
      .delete()
      .in('id', idsToDelete);
      
    if (deleteError) {
      console.error('Error deleting test data:', deleteError);
      return;
    }
    
    console.log(`Deleted ${toDelete.length} test records`);
  }
  
  // Show remaining participants
  const { data: remaining, error: remainingError } = await supabase
    .from('enrolled_participants')
    .select('*')
    .order('enrolled_at', { ascending: true });
    
  if (remainingError) {
    console.error('Error fetching remaining data:', remainingError);
    return;
  }
  
  console.log(`\nRemaining participants (${remaining.length}):`);
  remaining.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.participation_type}, ${p.enrolled_at})`);
  });
}

cleanupTestData().catch(console.error);