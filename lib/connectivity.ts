// Utility to test network connectivity and Supabase connection
import { supabase } from './supabase';

export interface ConnectivityTestResult {
  supabaseConnected: boolean;
  internetConnected: boolean;
  latency?: number;
  error?: string;
}

export async function testConnectivity(): Promise<ConnectivityTestResult> {
  const result: ConnectivityTestResult = {
    supabaseConnected: false,
    internetConnected: false,
  };

  try {
    // Test internet connectivity first
    const startTime = Date.now();
    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
      },
      // Add timeout
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      result.internetConnected = true;
      result.latency = Date.now() - startTime;
    }
  } catch (error) {
    console.warn('Internet connectivity test failed:', error);
    result.error = error instanceof Error ? error.message : 'Internet connection failed';
  }

  // Test Supabase connectivity if internet is available
  if (result.internetConnected && supabase) {
    try {
      // Simple query to test Supabase connection
      const { data, error } = await supabase
        .from('enrolled_participants')
        .select('count', { count: 'exact', head: true });

      if (!error) {
        result.supabaseConnected = true;
      } else {
        result.error = `Supabase error: ${error.message}`;
      }
    } catch (error) {
      console.warn('Supabase connectivity test failed:', error);
      result.error = `Supabase connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  } else if (!supabase) {
    result.error = 'Supabase client not configured';
  }

  return result;
}

// Test connectivity and log results
export async function logConnectivityStatus(): Promise<void> {
  console.log('🔍 Testing connectivity...');
  const result = await testConnectivity();
  
  console.log('🌐 Connectivity Test Results:', {
    internetConnected: result.internetConnected ? '✅' : '❌',
    supabaseConnected: result.supabaseConnected ? '✅' : '❌',
    latency: result.latency ? `${result.latency}ms` : 'N/A',
    error: result.error || 'None'
  });
  
  if (!result.internetConnected) {
    console.warn('⚠️ No internet connection detected');
  } else if (!result.supabaseConnected) {
    console.warn('⚠️ Supabase connection failed');
  } else {
    console.log('✅ All connectivity tests passed');
  }
}

// Monitor connectivity changes
export function startConnectivityMonitoring(): void {
  // Listen for online/offline events
  window.addEventListener('online', () => {
    console.log('🌐 Network connection restored');
    logConnectivityStatus();
  });
  
  window.addEventListener('offline', () => {
    console.warn('🚫 Network connection lost');
  });
  
  // Initial connectivity test
  logConnectivityStatus();
}