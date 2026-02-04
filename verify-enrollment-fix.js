// Simulate the frontend enrollment process to verify the fix
const { createClient } = require('@supabase/supabase-js');

// This simulates the enrollment service behavior
const supabase = createClient(
  'https://lqamcfvzsvkgiwjtllcc.supabase.co', 
  'sb_publishable_zdghzs78HI9HaDOGCaylBQ_xRzSHc1X'
);

const ENROLLED_TABLE = 'enrolled_participants';

// Simulate what happens when the EnrollmentService saves data
async function simulateEnrollmentServiceSave() {
  console.log('=== SIMULATING ENROLLMENT SERVICE SAVE ===\n');
  
  // Step 1: Get current state (what the service would load)
  console.log('1. Loading current state from database...');
  const { data: currentEnrolled, error: loadError } = await supabase
    .from(ENROLLED_TABLE)
    .select('*')
    .order('enrolled_at', { ascending: true });
    
  if (loadError) {
    console.error('Error loading current state:', loadError);
    return;
  }
  
  console.log(`Loaded ${currentEnrolled.length} existing participants`);
  
  // Step 2: Simulate adding a new participant to the in-memory state
  console.log('\n2. Adding new participant to in-memory state...');
  const newParticipant = {
    id: `enrolled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'New Test Participant',
    needs_diversity_quota: false,
    participation_type: 'local',
    enrolled_at: new Date().toISOString(),
    session_id: 'session-1'
  };
  
  // This represents the in-memory state after adding the new participant
  const allParticipants = [...currentEnrolled, newParticipant];
  console.log(`In-memory state now has ${allParticipants.length} participants`);
  
  // Step 3: Save ALL participants using upsert (the fixed method)
  console.log('\n3. Saving ALL participants using upsert...');
  const { data: upsertResult, error: upsertError } = await supabase
    .from(ENROLLED_TABLE)
    .upsert(allParticipants, { onConflict: 'id' })
    .select();
    
  if (upsertError) {
    console.error('❌ Upsert failed:', upsertError);
    return;
  }
  
  console.log(`✅ Upsert successful! ${upsertResult.length} records affected`);
  
  // Step 4: Verify the database state
  console.log('\n4. Verifying final database state...');
  const { data: finalState, error: verifyError } = await supabase
    .from(ENROLLED_TABLE)
    .select('*')
    .order('enrolled_at', { ascending: true });
    
  if (verifyError) {
    console.error('Error verifying final state:', verifyError);
    return;
  }
  
  console.log(`\n🎉 FINAL DATABASE STATE (${finalState.length} participants):`);
  finalState.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} (${p.participation_type}, ${p.enrolled_at.substring(0, 19)})`);
  });
  
  // Step 5: Test the old problematic scenario
  console.log('\n=== TESTING OLD PROBLEMATIC INSERT METHOD ===');
  console.log('5. Trying to insert ALL participants again (old method)...');
  
  const { error: insertError } = await supabase
    .from(ENROLLED_TABLE)
    .insert(allParticipants);
    
  if (insertError) {
    console.log(`❌ INSERT failed as expected: ${insertError.message}`);
    console.log(`   Error code: ${insertError.code}`);
    console.log(`   This is why the old method failed - it would try to insert`);
    console.log(`   existing participants again and fail on duplicates!`);
  } else {
    console.log('❓ INSERT succeeded unexpectedly');
  }
  
  console.log('\n✅ CONCLUSION:');
  console.log('   - UPSERT handles duplicates correctly');
  console.log('   - INSERT fails on duplicates (old problematic behavior)');
  console.log('   - The fix ensures new participants are saved even when existing ones are present');
}

simulateEnrollmentServiceSave().catch(console.error);