import { Participant, EnrollmentState, MAX_CAPACITY, MEN_QUOTA, WOMEN_NON_BINARY_SPOTS } from '@/types';

export class EnrollmentService {
  private state: EnrollmentState;

  constructor(initialState?: EnrollmentState) {
    this.state = initialState || {
      enrolled: [],
      waitingQueue: [],
    };
  }

  getState(): EnrollmentState {
    return {
      enrolled: [...this.state.enrolled],
      waitingQueue: [...this.state.waitingQueue],
    };
  }

  getEnrollmentStats() {
    const enrolled = this.state.enrolled;
    const menCount = enrolled.filter(p => p.needsDiversityQuota).length;
    const womenCount = enrolled.filter(p => !p.needsDiversityQuota).length;
    const localCount = enrolled.filter(p => p.participationType === 'local').length;
    const remoteCount = enrolled.filter(p => p.participationType === 'remote').length;

    const menQuotaUsed = enrolled.filter(p => p.needsDiversityQuota).length;
    const womenNonBinaryCount = enrolled.filter(p => !p.needsDiversityQuota).length;

    return {
      total: enrolled.length,
      men: menCount,
      women: womenCount,
      local: localCount,
      remote: remoteCount,
      availableSpots: MAX_CAPACITY - enrolled.length,
      waitingQueueLength: this.state.waitingQueue.length,
      menQuotaRemaining: MEN_QUOTA - menQuotaUsed,
      womenNonBinarySpotsRemaining: WOMEN_NON_BINARY_SPOTS - womenNonBinaryCount,
      menQuotaUsed: menQuotaUsed,
    };
  }

  canEnroll(needsDiversityQuota: boolean): { canEnroll: boolean; reason?: string } {
    const stats = this.getEnrollmentStats();

    // Check if already at capacity
    if (stats.total >= MAX_CAPACITY) {
      return { canEnroll: false, reason: 'Diversity quota full' };
    }

    // For those needing diversity quota (men)
    if (needsDiversityQuota) {
      // Check if men quota spots are available (first 3 men)
      if (stats.menQuotaRemaining > 0) {
        return { canEnroll: true };
      }
      // Men quota is full (3 men enrolled)
      // After women/non-binary spots are full, remaining spots become available for men
      if (stats.womenNonBinarySpotsRemaining <= 0) {
        // Check if there are remaining spots after women/non-binary spots are filled
        const remainingSpots = MAX_CAPACITY - stats.total;
        if (remainingSpots > 0) {
          return { canEnroll: true };
        }
        return { canEnroll: false, reason: 'Diversity quota full' };
      }
      // If quota is full and women spots aren't full yet, don't allow more men
      // This covers the "more than 4 men try to enroll" case - the 4th+ man gets this message
      return { 
        canEnroll: false, 
        reason: 'The diversity quota spots have been filled.' 
      };
    }

    // For those not needing diversity quota (women/non-binary)
    if (stats.womenNonBinarySpotsRemaining > 0) {
      return { canEnroll: true };
    }
    // When women/non-binary spots are full, they go to waiting queue
    return { 
      canEnroll: false, 
      reason: 'Women/non-binary spots are full. You will be added to the waiting queue.' 
    };
  }

  enroll(participant: Omit<Participant, 'id' | 'enrolledAt'>): { success: boolean; message: string; addedToQueue?: boolean } {
    const canEnrollResult = this.canEnroll(participant.needsDiversityQuota);

    if (!canEnrollResult.canEnroll) {
      // If it's a woman/non-binary and spots are full, add to waiting queue
      if (!participant.needsDiversityQuota && 
          this.getEnrollmentStats().womenNonBinarySpotsRemaining <= 0) {
        const newParticipant: Participant = {
          ...participant,
          id: `waiting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          enrolledAt: new Date(),
        };
        this.state.waitingQueue.push(newParticipant);
        return { 
          success: true, 
          message: 'Added to waiting queue', 
          addedToQueue: true 
        };
      }
      return { success: false, message: canEnrollResult.reason || 'Cannot enroll' };
    }

    // Enroll the participant
    const newParticipant: Participant = {
      ...participant,
      id: `enrolled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      enrolledAt: new Date(),
    };
    this.state.enrolled.push(newParticipant);

    return { success: true, message: 'Successfully enrolled!' };
  }

  // For demo purposes - in production, this would be stored in a database
  setState(state: EnrollmentState) {
    this.state = state;
  }
}

// Singleton instance for the app
let enrollmentService: EnrollmentService | null = null;

export function getEnrollmentService(): EnrollmentService {
  if (!enrollmentService) {
    enrollmentService = new EnrollmentService();
  }
  return enrollmentService;
}
