// Debug script to test the enrollment service directly
import { getEnrollmentService } from './lib/enrollment.js';

async function testEnrollment() {
    console.log('=== ENROLLMENT SERVICE DEBUG TEST ===');
    
    const service = getEnrollmentService();
    
    // Test 1: Get current state
    console.log('\n1. Getting current state...');
    const initialState = service.getState('session-1');
    console.log('Initial enrolled count:', initialState.enrolled.length);
    console.log('Initial waiting queue count:', initialState.waitingQueue.length);
    
    // Test 2: Get enrollment stats
    console.log('\n2. Getting enrollment stats...');
    const stats = service.getEnrollmentStats('session-1');
    console.log('Stats:', stats);
    
    // Test 3: Test enrollment
    console.log('\n3. Testing enrollment...');
    const testParticipant = {
        name: 'Debug Test User',
        needsDiversityQuota: false,
        participationType: 'local',
        sessionId: 'session-1'
    };
    
    try {
        const result = await service.enroll(testParticipant);
        console.log('Enrollment result:', result);
        
        // Test 4: Check state after enrollment
        console.log('\n4. Getting state after enrollment...');
        const newState = service.getState('session-1');
        console.log('New enrolled count:', newState.enrolled.length);
        console.log('New waiting queue count:', newState.waitingQueue.length);
        
        // Test 5: Check if data was saved
        console.log('\n5. Refreshing from database...');
        await service.refresh();
        const refreshedState = service.getState('session-1');
        console.log('Refreshed enrolled count:', refreshedState.enrolled.length);
        console.log('Refreshed waiting queue count:', refreshedState.waitingQueue.length);
        
        // Show all participants
        console.log('\n6. All enrolled participants:');
        refreshedState.enrolled.forEach((p, i) => {
            console.log(`${i + 1}. ${p.name} (${p.participationType}, ${p.needsDiversityQuota ? 'quota' : 'women'}, ${p.enrolledAt})`);
        });
        
    } catch (error) {
        console.error('Enrollment failed:', error);
    }
}

testEnrollment().catch(console.error);