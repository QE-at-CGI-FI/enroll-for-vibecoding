export type ParticipationType = 'local' | 'remote';

export interface Participant {
  id: string;
  name: string;
  email: string;
  needsDiversityQuota: boolean; // true if they need the men's diversity quota
  participationType: ParticipationType;
  enrolledAt: Date;
}

export interface EnrollmentState {
  enrolled: Participant[];
  waitingQueue: Participant[];
}

export const MAX_CAPACITY = 20;
export const MEN_QUOTA = 3;
export const WOMEN_NON_BINARY_SPOTS = 17;
