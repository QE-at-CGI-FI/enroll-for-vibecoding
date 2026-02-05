export type ParticipationType = 'local' | 'remote';

export interface Participant {
  id: string;
  name: string;
  needsDiversityQuota: boolean; // true if they need the men's diversity quota
  participationType: ParticipationType;
  enrolledAt: Date;
  sessionId: string;
}

export interface Session {
  id: string;
  date: Date;
  timeSlot: string;
  description?: string;
}

export interface EnrollmentState {
  enrolled: Participant[];
  waitingQueue: Participant[];
}

export interface MultiSessionEnrollmentState {
  sessions: { [sessionId: string]: EnrollmentState };
}

export const MAX_CAPACITY = 20;
export const MEN_QUOTA = 3;
export const WOMEN_NON_BINARY_SPOTS = 17;

export const SESSIONS: Session[] = [
  {
    id: 'session-1',
    date: new Date('2026-03-17'),
    timeSlot: '11-14',
    description: 'First Vibe Coding Workshop'
  }, 
  {
    id: 'session-2',
    date: new Date('2026-04-07'),
    timeSlot: '11-14',
    description: 'Second Vibe Coding Workshop'
  }
];

export const DEFAULT_SESSION_ID = 'session-1';

// Second session enrollment restriction
export const SECOND_SESSION_CUTOFF = new Date('2026-02-10T08:00:00+02:00'); // Feb 10, 2026, 8 AM Finnish time

// Backward compatibility
export const EVENT_DATE = SESSIONS[0].date;
