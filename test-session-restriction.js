/**
 * Test script for second session enrollment restriction feature
 */

const { SESSIONS } = require('./types/index.ts');

// Mock Date to test different scenarios
const originalDate = Date;

function mockDate(isoString) {
  global.Date = class extends originalDate {
    constructor(...args) {
      if (args.length === 0) {
        return new originalDate(isoString);
      }
      return new originalDate(...args);
    }
    
    static now() {
      return new originalDate(isoString).getTime();
    }
  };
}

function restoreDate() {
  global.Date = originalDate;
}

// Test scenarios
const testScenarios = [
  {
    name: 'Before cutoff - Feb 5, 2026 10:00 AM',
    mockDate: '2026-02-05T10:00:00+02:00',
    shouldBeRestricted: true
  },
  {
    name: 'At cutoff - Feb 10, 2026 8:00 AM',
    mockDate: '2026-02-10T08:00:00+02:00',
    shouldBeRestricted: false
  },
  {
    name: 'After cutoff - Feb 10, 2026 9:00 AM',
    mockDate: '2026-02-10T09:00:00+02:00',
    shouldBeRestricted: false
  }
];

// Mock enrollment service state with more participants in waiting queue to test position limits
const mockState = {
  sessions: {
    'session-1': {
      enrolled: [
        { name: 'Alice Johnson', sessionId: 'session-1' },
        { name: 'Bob Smith', sessionId: 'session-1' }
      ],
      waitingQueue: [
        { name: 'Charlie Brown', sessionId: 'session-1' }, // Position 1
        { name: 'Dana White', sessionId: 'session-1' },   // Position 2
        { name: 'Eva Green', sessionId: 'session-1' },    // Position 3
        ...Array.from({length: 14}, (_, i) => ({ name: `Person ${i + 4}`, sessionId: 'session-1' })), // Positions 4-17
        { name: 'Position 18', sessionId: 'session-1' },  // Position 18 - beyond limit
        { name: 'Position 19', sessionId: 'session-1' },  // Position 19 - beyond limit
      ]
    },
    'session-2': {
      enrolled: [],
      waitingQueue: []
    }
  }
};

// Helper functions from enrollment.ts
const SECOND_SESSION_RESTRICTION = {
  cutoffDate: new Date('2026-02-10T08:00:00+02:00'),
  restrictedSessionId: 'session-2',
  maxWaitingQueuePosition: 17
};

function isSecondSessionRestricted() {
  const now = new Date();
  return now < SECOND_SESSION_RESTRICTION.cutoffDate;
}

function getParticipantPositionInFirstWaitingQueue(participantName, state) {
  const firstSessionState = state.sessions['session-1'];
  if (!firstSessionState) return 0;
  
  const normalizedName = participantName.toLowerCase().trim();
  
  const position = firstSessionState.waitingQueue.findIndex(p => 
    p.name.toLowerCase().trim() === normalizedName
  );
  
  return position >= 0 ? position + 1 : 0;
}

function canParticipantEnrollToSecondSession(participantName, state) {
  const position = getParticipantPositionInFirstWaitingQueue(participantName, state);
  
  if (position === 0) {
    return { canEnroll: false, position: 0, reason: 'not in first session waiting queue' };
  }
  
  if (position > SECOND_SESSION_RESTRICTION.maxWaitingQueuePosition) {
    return { canEnroll: false, position, reason: 'beyond eligible position in waiting queue' };
  }
  
  return { canEnroll: true, position };
}

// Test participants
const testParticipants = [
  { name: 'Alice Johnson', expectedPosition: 0, canEnroll: false, status: 'enrolled in session 1' },
  { name: 'Charlie Brown', expectedPosition: 1, canEnroll: true, status: 'position 1 in waiting queue' },
  { name: 'Dana White', expectedPosition: 2, canEnroll: true, status: 'position 2 in waiting queue' },
  { name: 'Person 17', expectedPosition: 17, canEnroll: true, status: 'position 17 in waiting queue (last eligible)' },
  { name: 'Position 18', expectedPosition: 18, canEnroll: false, status: 'position 18 in waiting queue (beyond limit)' },
  { name: 'Position 19', expectedPosition: 19, canEnroll: false, status: 'position 19 in waiting queue (beyond limit)' },
  { name: 'David Wilson', expectedPosition: 0, canEnroll: false, status: 'not in session 1 at all' }
];

console.log('🧪 Testing Second Session Enrollment Restriction\n');

testScenarios.forEach(scenario => {
  console.log(`📅 Scenario: ${scenario.name}`);
  console.log(`Expected restriction: ${scenario.shouldBeRestricted}`);
  
  mockDate(scenario.mockDate);
  
  const actualRestriction = isSecondSessionRestricted();
  console.log(`Actual restriction: ${actualRestriction}`);
  console.log(`✅ Restriction check: ${actualRestriction === scenario.shouldBeRestricted ? 'PASS' : 'FAIL'}`);
  
  // Test participant position and eligibility checks
  console.log('\n👥 Testing participant position and eligibility:');
  testParticipants.forEach(participant => {
    const position = getParticipantPositionInFirstWaitingQueue(participant.name, mockState);
    const eligibility = canParticipantEnrollToSecondSession(participant.name, mockState);
    
    console.log(`  ${participant.name} (${participant.status}):`);
    console.log(`    Position: ${position} (expected: ${participant.expectedPosition}) ${position === participant.expectedPosition ? '✅' : '❌'}`);
    console.log(`    Can enroll: ${eligibility.canEnroll} (expected: ${participant.canEnroll}) ${eligibility.canEnroll === participant.canEnroll ? '✅' : '❌'}`);
    if (eligibility.reason) {
      console.log(`    Reason: ${eligibility.reason}`);
    }
  });
  
  console.log('\n🎯 Enrollment behavior during restriction:');
  testParticipants.forEach(participant => {
    const eligibility = canParticipantEnrollToSecondSession(participant.name, mockState);
    if (actualRestriction) {
      if (eligibility.canEnroll) {
        console.log(`  ${participant.name}: Can enroll normally to session-2`);
      } else if (eligibility.position === 0) {
        console.log(`  ${participant.name}: Would be added to session-2 waiting queue`);
      } else {
        console.log(`  ${participant.name}: Would receive message about being in queue already (position ${eligibility.position})`);
      }
    } else {
      console.log(`  ${participant.name}: Can enroll normally to session-2 (no restriction)`);
    }
  });
  
  restoreDate();
  console.log('\n' + '='.repeat(50) + '\n');
});

console.log('Test completed! 🎉');