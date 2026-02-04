const { createClient } = require('@supabase/supabase-js');

// Test the Supabase connection
const supabaseUrl = 'https://lqamcfvzsvkgiwjtllcc.supabase.co';
const supabaseAnonKey = 'sb_publishable_zdghzs78HI9HaDOGCaylBQ_xRzSHc1X';

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 10) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    // Test connection by trying to read from the enrolled_participants table
    console.log('Attempting to read from enrolled_participants table...');
    const { data, error } = await supabase.from('enrolled_participants').select('*').limit(1);
    
    if (error) {
      console.error('Supabase error:', error);
      return;
    }
    
    console.log('Success! Connection works.');
    console.log('Retrieved data:', data);
    
    // Test if we can insert data
    console.log('Testing insert...');
    const testParticipant = {
      id: 'test-' + Date.now(),
      name: 'Test User',
      needs_diversity_quota: false,
      participation_type: 'local',
      enrolled_at: new Date().toISOString(),
      session_id: 'session-1'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('enrolled_participants')
      .insert([testParticipant])
      .select();
    
    if (insertError) {
      console.error('Insert error:', insertError);
      return;
    }
    
    console.log('Insert successful:', insertData);
    
    // Clean up - delete the test record
    const { error: deleteError } = await supabase
      .from('enrolled_participants')
      .delete()
      .eq('id', testParticipant.id);
    
    if (deleteError) {
      console.error('Delete error (cleanup):', deleteError);
    } else {
      console.log('Cleanup successful');
    }
    
  } catch (err) {
    console.error('Network or other error:', err);
  }
}

testConnection();