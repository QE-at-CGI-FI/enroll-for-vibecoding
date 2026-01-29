import { Participant, EnrollmentState, MAX_CAPACITY, MEN_QUOTA, WOMEN_NON_BINARY_SPOTS } from '@/types';
import { supabase } from './supabase';

// Supabase table names
const ENROLLED_TABLE = 'enrolled_participants';
const WAITING_QUEUE_TABLE = 'waiting_queue_participants';

// Fallback to localStorage for offline support
const STORAGE_KEY = 'vibe-coding-enrollment';

interface StorageData {
  state: EnrollmentState;
  lastUpdated: string;
}

export class EnrollmentService {
  private state: EnrollmentState;
  private isLoading = false;

  constructor(initialState?: EnrollmentState) {
    this.state = initialState || {
      enrolled: [],
      waitingQueue: [],
    };
    this.loadFromSupabase();
  }

  // Load data from Supabase with localStorage fallback
  private async loadFromSupabase(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // First try to load from Supabase
      const [enrolledResponse, waitingResponse] = await Promise.all([
        supabase.from(ENROLLED_TABLE).select('*').order('enrolled_at', { ascending: true }),
        supabase.from(WAITING_QUEUE_TABLE).select('*').order('enrolled_at', { ascending: true })
      ]);

      if (enrolledResponse.error || waitingResponse.error) {
        console.warn('Supabase error, falling back to localStorage:', 
                    enrolledResponse.error || waitingResponse.error);
        this.loadFromLocalStorage();
      } else {
        // Successfully loaded from Supabase
        this.state = {
          enrolled: (enrolledResponse.data || []).map(this.mapSupabaseToParticipant),
          waitingQueue: (waitingResponse.data || []).map(this.mapSupabaseToParticipant)
        };
        
        // Update localStorage with latest data
        this.saveToLocalStorage();
        console.log('Data loaded from Supabase');
      }
    } catch (error) {
      console.warn('Failed to load from Supabase, using localStorage:', error);
      this.loadFromLocalStorage();
    } finally {
      this.isLoading = false;
    }
  }

  // Fallback to localStorage
  private loadFromLocalStorage(): void {
    try {
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed: StorageData = JSON.parse(localData);
        this.state = {
          enrolled: parsed.state.enrolled.map(p => ({...p, enrolledAt: new Date(p.enrolledAt)})),
          waitingQueue: parsed.state.waitingQueue.map(p => ({...p, enrolledAt: new Date(p.enrolledAt)}))
        };
        console.log('Data loaded from localStorage');
      }
    } catch (error) {
      console.warn('Failed to load from localStorage:', error);
    }
  }

  // Convert Supabase row to Participant object
  private mapSupabaseToParticipant(row: any): Participant {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      needsDiversityQuota: row.needs_diversity_quota,
      participationType: row.participation_type,
      enrolledAt: new Date(row.enrolled_at)
    };
  }

  // Convert Participant to Supabase row
  private mapParticipantToSupabase(participant: Participant) {
    return {
      id: participant.id,
      name: participant.name,
      email: participant.email,
      needs_diversity_quota: participant.needsDiversityQuota,
      participation_type: participant.participationType,
      enrolled_at: participant.enrolledAt.toISOString()
    };
  }
  // Save to localStorage as backup
  private saveToLocalStorage(): void {
    try {
      const storageData: StorageData = {
        state: this.state,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  // Save data to Supabase
  private async saveToSupabase(): Promise<void> {
    try {
      // Clear existing data and insert new data
      await Promise.all([
        supabase.from(ENROLLED_TABLE).delete().neq('id', 'dummy'),
        supabase.from(WAITING_QUEUE_TABLE).delete().neq('id', 'dummy')
      ]);

      // Insert enrolled participants
      if (this.state.enrolled.length > 0) {
        const enrolledData = this.state.enrolled.map(this.mapParticipantToSupabase);
        const { error: enrolledError } = await supabase
          .from(ENROLLED_TABLE)
          .insert(enrolledData);

        if (enrolledError) {
          throw enrolledError;
        }
      }

      // Insert waiting queue participants
      if (this.state.waitingQueue.length > 0) {
        const waitingData = this.state.waitingQueue.map(this.mapParticipantToSupabase);
        const { error: waitingError } = await supabase
          .from(WAITING_QUEUE_TABLE)
          .insert(waitingData);

        if (waitingError) {
          throw waitingError;
        }
      }

      console.log('Data saved to Supabase');
    } catch (error) {
      console.warn('Failed to save to Supabase:', error);
      throw error;
    }
  }

  // Save data to both Supabase and localStorage
  private async saveData(): Promise<void> {
    // Always save to localStorage first (for immediate backup)
    this.saveToLocalStorage();
    
    try {
      // Then save to Supabase
      await this.saveToSupabase();
    } catch (error) {
      console.warn('Supabase save failed, data saved locally only:', error);
    }
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

  async enroll(participant: Omit<Participant, 'id' | 'enrolledAt'>): Promise<{ success: boolean; message: string; addedToQueue?: boolean }> {
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
        await this.saveData();
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
    await this.saveData();

    return { success: true, message: 'Successfully enrolled!' };
  }

  // Set state and save to storage
  async setState(state: EnrollmentState): Promise<void> {
    this.state = state;
    await this.saveData();
  }

  // Manually refresh data from Supabase
  async refresh(): Promise<void> {
    await this.loadFromSupabase();
  }

  // Clear all enrollment data (for admin/testing purposes)
  async clearData(): Promise<void> {
    this.state = {
      enrolled: [],
      waitingQueue: []
    };
    await this.saveData();
  }
}

// Singleton instance for the app
let enrollmentService: EnrollmentService | null = null;
let serviceInitialized = false;

export function getEnrollmentService(): EnrollmentService {
  if (!enrollmentService) {
    enrollmentService = new EnrollmentService();
  }
  return enrollmentService;
}

// Initialize service (load data)
export async function initializeEnrollmentService(): Promise<EnrollmentService> {
  if (!enrollmentService) {
    enrollmentService = new EnrollmentService();
  }
  
  if (!serviceInitialized) {
    // Give it a moment to load from storage
    await new Promise(resolve => setTimeout(resolve, 500));
    serviceInitialized = true;
  }
  
  return enrollmentService;
}
