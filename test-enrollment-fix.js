const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  'https://lqamcfvzsvkgiwjtllcc.supabase.co', 
  'sb_publishable_zdghzs78HI9HaDOGCaylBQ_xRzSHc1X'
);

async function testEnrollmentFix() {
  console.log('=== TESTING ENROLLMENT FIX ===\n');
  
  // First, check current state
  console.log('1. Checking current database state...');
  const { data: currentEnrolled, error: currentError } = await supabase
    .from('enrolled_participants')
    .select('*')
    .order('enrolled_at', { ascending: true });
    
  if (currentError) {
    console.error('Error fetching current enrolled:', currentError);
    return;
  }
  
  console.log(`Found ${currentEnrolled.length} currently enrolled participants:`);
  currentEnrolled.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.participation_type}, ${p.enrolled_at})`);
  });
  
  // Test the upsert functionality directly
  console.log('\n2. Testing direct upsert with new participant...');
  const testParticipant = {
    id: `enrolled-${Date.now()}-test`,
    name: 'Test Participant 2',
    needs_diversity_quota: false,
    participation_type: 'local',
    enrolled_at: new Date().toISOString(),
    session_id: 'session-1'
  };
  
  // Try upserting the new participant
  const { data: upsertData, error: upsertError } = await supabase
    .from('enrolled_participants')
    .upsert([testParticipant], { onConflict: 'id' })
    .select();
    
  if (upsertError) {
    console.error('❌ Error during upsert:', upsertError);
    return;
  }
  
  console.log('✅ Upsert successful:', upsertData);
  
  // Check state after upsert
  console.log('\n3. Checking database state after upsert...');
  const { data: afterEnrolled, error: afterError } = await supabase
    .from('enrolled_participants')
    .select('*')
    .order('enrolled_at', { ascending: true });
    
  if (afterError) {
    console.error('Error fetching after enrolled:', afterError);
    return;
  }
  
  console.log(`Found ${afterEnrolled.length} participants after upsert:`);
  afterEnrolled.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.participation_type}, ${p.enrolled_at})`);
  });
  
  // Test upserting existing + new participant (the real scenario)
  console.log('\n4. Testing upsert with both existing and new participant...');
  const existingParticipant = currentEnrolled[0]; // The original participant
  const newParticipant = {
    id: `enrolled-${Date.now()}-test2`,
    name: 'Test Participant 3',
    needs_diversity_quota: true,  // Try with diversity quota
    participation_type: 'remote',
    enrolled_at: new Date().toISOString(),
    session_id: 'session-1'
  };
  
  const bothParticipants = [
    {
      id: existingParticipant.id,
      name: existingParticipant.name,
      needs_diversity_quota: existingParticipant.needs_diversity_quota,
      participation_type: existingParticipant.participation_type,
      enrolled_at: existingParticipant.enrolled_at,
      session_id: existingParticipant.session_id
    },
    newParticipant
  ];
  
  const { data: batchUpsertData, error: batchUpsertError } = await supabase
    .from('enrolled_participants')
    .upsert(bothParticipants, { onConflict: 'id' })
    .select();
    
  if (batchUpsertError) {
    console.error('❌ Error during batch upsert:', batchUpsertError);
    return;
  }
  
  console.log('✅ Batch upsert successful, records affected:', batchUpsertData.length);
  
  // Final state check
  console.log('\n5. Final database state check...');
  const { data: finalEnrolled, error: finalError } = await supabase
    .from('enrolled_participants')
    .select('*')
    .order('enrolled_at', { ascending: true });
    
  if (finalError) {
    console.error('Error fetching final enrolled:', finalError);
    return;
  }
  
  console.log(`\n🎉 FINAL RESULT: ${finalEnrolled.length} participants enrolled:`);
  finalEnrolled.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.participation_type}, quota: ${p.needs_diversity_quota}, ${p.enrolled_at})`);
  });
  
  if (finalEnrolled.length > 1) {
    console.log('\n✅ SUCCESS: Multiple participants are now properly stored in the database!');
  } else {
    console.log('\n❌ FAILED: Still only one participant in database.');
  }
}

testEnrollmentFix().catch(console.error);