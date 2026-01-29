import { Participant, EnrollmentState, MAX_CAPACITY, MEN_QUOTA, WOMEN_NON_BINARY_SPOTS } from '@/types';

// Simple persistence using localStorage + JSONBin.io for cross-device sync
const STORAGE_KEY = 'vibe-coding-enrollment';

// Using a simpler approach - localStorage with periodic sync via a free service
// For production, consider Firebase, Supabase, or similar services
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
    this.loadFromStorage();
  }

  // Load data from localStorage first, then sync with cloud
  private async loadFromStorage(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      // Try localStorage first for immediate load
      const localData = localStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed: StorageData = JSON.parse(localData);
        this.state = {
          enrolled: parsed.state.enrolled.map(p => ({...p, enrolledAt: new Date(p.enrolledAt)})),
          waitingQueue: parsed.state.waitingQueue.map(p => ({...p, enrolledAt: new Date(p.enrolledAt)}))
        };
      }

      // Then try to sync with cloud storage
      await this.syncFromCloud();
    } catch (error) {
      console.warn('Failed to load from storage:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Sync from cloud storage using GitHub JSON server
  private async syncFromCloud(): Promise<void> {
    try {
      // Using My JSON Server (free GitHub-based JSON API)
      // URL format: https://my-json-server.typicode.com/{username}/{repo}
      const response = await fetch('https://my-json-server.typicode.com/qe-at-cgi-fi/enroll-for-vibecoding/enrollment');
      
      if (response.ok) {
        const cloudData = await response.json();
        if (cloudData && cloudData.enrolled && cloudData.waitingQueue) {
          const localData = localStorage.getItem(STORAGE_KEY);
          
          // Use cloud data if it's newer than local data
          if (!localData || new Date(cloudData.lastUpdated || 0) > new Date(JSON.parse(localData).lastUpdated || 0)) {
            this.state = {
              enrolled: cloudData.enrolled.map((p: any) => ({...p, enrolledAt: new Date(p.enrolledAt)})),
              waitingQueue: cloudData.waitingQueue.map((p: any) => ({...p, enrolledAt: new Date(p.enrolledAt)}))
            };
            this.saveToLocalStorage();
            console.log('Synced data from cloud storage');
          }
        }
      }
    } catch (error) {
      console.warn('Cloud sync not available - using local storage only:', error);
    }
  }

  // Save to localStorage
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

  // Save to cloud storage (simplified version)
  private async saveToCloud(): Promise<void> {
    try {
      // For simplicity, we'll just log this operation
      // In a real implementation, this would sync to a cloud service
      console.log('Data saved locally (cloud sync not implemented)');
    } catch (error) {
      console.warn('Cloud save not available:', error);
    }
  }

  // Save data to localStorage (and optionally cloud)
  private async saveData(): Promise<void> {
    this.saveToLocalStorage();
    // Cloud sync disabled for simplicity - using only localStorage
    // await this.saveToCloud();
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

  // Manually refresh data from cloud storage
  async refresh(): Promise<void> {
    await this.syncFromCloud();
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
