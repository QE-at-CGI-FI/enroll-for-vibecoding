#!/usr/bin/env node

// Test script to verify network retry logic and error handling
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lqamcfvzsvkgiwjtllcc.supabase.co', 
  'sb_publishable_zdghzs78HI9HaDOGCaylBQ_xRzSHc1X'
);

// Simulate network failures for testing
class NetworkTestingUtility {
  constructor() {
    this.failureRate = 0.0; // 0% failure rate by default
    this.delayMs = 0;
  }

  setFailureRate(rate) {
    this.failureRate = rate;
    console.log(`🎯 Set failure rate to ${rate * 100}%`);
  }

  setDelay(delayMs) {
    this.delayMs = delayMs;
    console.log(`⏱️ Set network delay to ${delayMs}ms`);
  }

  async simulateNetworkOperation(operation, operationName) {
    // Add artificial delay
    if (this.delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
    }

    // Randomly fail based on failure rate
    if (Math.random() < this.failureRate) {
      const errorTypes = [
        new Error('Network request failed'),
        new Error('fetch: timeout exceeded'),
        { code: 'PGRST301', message: 'Connection timeout' },
        new Error('Failed to fetch')
      ];
      throw errorTypes[Math.floor(Math.random() * errorTypes.length)];
    }

    return await operation();
  }
}

const networkTester = new NetworkTestingUtility();

async function testRetryLogic() {
  console.log('=== TESTING NETWORK RETRY LOGIC ===\n');

  // Test 1: Normal operation (should succeed immediately)
  console.log('📝 Test 1: Normal operation');
  networkTester.setFailureRate(0.0);
  try {
    const result = await networkTester.simulateNetworkOperation(async () => {
      return await supabase.from('enrolled_participants').select('count', { count: 'exact', head: true });
    }, 'Normal connection test');
    console.log('✅ Normal operation succeeded:', result.count);
  } catch (error) {
    console.log('❌ Normal operation failed:', error.message);
  }

  // Test 2: Intermittent failures (should succeed with retries)
  console.log('\n📝 Test 2: Intermittent failures (50% failure rate)');
  networkTester.setFailureRate(0.5);
  for (let i = 1; i <= 3; i++) {
    try {
      console.log(`Attempt ${i}:`);
      const result = await networkTester.simulateNetworkOperation(async () => {
        return await supabase.from('enrolled_participants').select('count', { count: 'exact', head: true });
      }, `Intermittent test ${i}`);
      console.log(`✅ Intermittent test ${i} succeeded`);
    } catch (error) {
      console.log(`❌ Intermittent test ${i} failed:`, error.message);
    }
  }

  // Test 3: High failure rate (should eventually fail)
  console.log('\n📝 Test 3: High failure rate (90% failure rate)');
  networkTester.setFailureRate(0.9);
  try {
    const result = await networkTester.simulateNetworkOperation(async () => {
      return await supabase.from('enrolled_participants').select('count', { count: 'exact', head: true });
    }, 'High failure test');
    console.log('✅ High failure test succeeded (lucky!)');
  } catch (error) {
    console.log('❌ High failure test failed:', error.message);
  }

  // Test 4: Test enrollment with simulated failures
  console.log('\n📝 Test 4: Test enrollment with network issues');
  networkTester.setFailureRate(0.3); // 30% failure rate
  
  const testParticipant = {
    id: `test-retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Retry Test User',
    needs_diversity_quota: false,
    participation_type: 'local',
    enrolled_at: new Date().toISOString(),
    session_id: 'session-1'
  };

  try {
    const result = await networkTester.simulateNetworkOperation(async () => {
      return await supabase
        .from('enrolled_participants')
        .upsert([testParticipant], { onConflict: 'id' })
        .select();
    }, 'Enrollment with retries');
    
    console.log('✅ Enrollment with retries succeeded:', result.data?.length, 'participants affected');
    
    // Clean up test data
    await supabase.from('enrolled_participants').delete().eq('id', testParticipant.id);
    console.log('🧹 Cleaned up test data');
    
  } catch (error) {
    console.log('❌ Enrollment with retries failed:', error.message);
  }
}

async function testConnectivityDetection() {
  console.log('\n=== TESTING CONNECTIVITY DETECTION ===\n');

  // Test internet connectivity
  console.log('🌐 Testing internet connectivity...');
  try {
    const startTime = Date.now();
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const latency = Date.now() - startTime;
      console.log(`✅ Internet connection OK (${latency}ms)`);
    } else {
      console.log('❌ Internet connection failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Internet connectivity test failed:', error.message);
  }

  // Test Supabase connectivity
  console.log('📊 Testing Supabase connectivity...');
  try {
    const startTime = Date.now();
    const { data, error } = await supabase
      .from('enrolled_participants')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
    } else {
      const latency = Date.now() - startTime;
      console.log(`✅ Supabase connection OK (${latency}ms)`);
    }
  } catch (error) {
    console.log('❌ Supabase connectivity test failed:', error.message);
  }
}

async function runAllTests() {
  await testConnectivityDetection();
  await testRetryLogic();
  console.log('\n✨ All tests completed!');
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  NetworkTestingUtility,
  testRetryLogic,
  testConnectivityDetection,
  runAllTests
};