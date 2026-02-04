import { 
  Participant, 
  EnrollmentState, 
  MultiSessionEnrollmentState,
  MAX_CAPACITY, 
  MEN_QUOTA, 
  WOMEN_NON_BINARY_SPOTS,
  SESSIONS,
  DEFAULT_SESSION_ID 
} from '@/types';
import { supabase } from './supabase';

// Supabase table names
const ENROLLED_TABLE = 'enrolled_participants';
const WAITING_QUEUE_TABLE = 'waiting_queue_participants';

// Fallback to localStorage for offline support
const STORAGE_KEY = 'vibe-coding-enrollment';

interface StorageData {
  state: MultiSessionEnrollmentState;
  lastUpdated: string;
}

export class EnrollmentService {
  private state: MultiSessionEnrollmentState;
  private isLoading = false;
  private currentSessionId = DEFAULT_SESSION_ID;

  constructor(initialState?: MultiSessionEnrollmentState) {
    // Initialize with empty states for all sessions
    const sessionsState: { [sessionId: string]: EnrollmentState } = {};
    SESSIONS.forEach(session => {
      sessionsState[session.id] = {
        enrolled: [],
        waitingQueue: [],
      };
    });

    this.state = initialState || { sessions: sessionsState };
    this.loadFromSupabase();
  }

  // Set current session for operations
  setCurrentSession(sessionId: string): void {
    if (this.state.sessions[sessionId]) {
      this.currentSessionId = sessionId;
    }
  }

  // Get current session state
  private getCurrentSessionState(): EnrollmentState {
    return this.state.sessions[this.currentSessionId] || { enrolled: [], waitingQueue: [] };
  }

  // Get session state by ID
  getSessionState(sessionId: string): EnrollmentState {
    return this.state.sessions[sessionId] || { enrolled: [], waitingQueue: [] };
  }

  // Load data from Supabase with localStorage fallback
  private async loadFromSupabase(): Promise<void> {
    if (this.isLoading) {
      console.log('⏳ Already loading, skipping...');
      return;
    }
    this.isLoading = true;
    
    console.log('🔄 Starting loadFromSupabase...');

    try {
      // Check if Supabase is available
      if (!supabase) {
        console.log('Supabase not configured, using localStorage only');
        this.loadFromLocalStorage();
        this.isLoading = false;
        return;
      }

      // First try to load from Supabase
      console.log('📡 Fetching data from Supabase...');
      const [enrolledResponse, waitingResponse] = await Promise.all([
        supabase.from(ENROLLED_TABLE).select('*').order('enrolled_at', { ascending: true }),
        supabase.from(WAITING_QUEUE_TABLE).select('*').order('enrolled_at', { ascending: true })
      ]);

      if (enrolledResponse.error || waitingResponse.error) {
        console.warn('Supabase error, falling back to localStorage:', 
                    enrolledResponse.error || waitingResponse.error);
        this.loadFromLocalStorage();
      } else {
        console.log(`📊 Loaded ${(enrolledResponse.data || []).length} enrolled and ${(waitingResponse.data || []).length} waiting from Supabase`);
        
        // Successfully loaded from Supabase - group by session
        const enrolledParticipants = (enrolledResponse.data || []).map(this.mapSupabaseToParticipant);
        const waitingParticipants = (waitingResponse.data || []).map(this.mapSupabaseToParticipant);

        console.log('👥 Mapped participants:', {
          enrolled: enrolledParticipants.length,
          waiting: waitingParticipants.length,
          enrolledBySession: enrolledParticipants.reduce((acc, p) => {
            acc[p.sessionId] = (acc[p.sessionId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        });

        // Reset session states
        const sessionsState: { [sessionId: string]: EnrollmentState } = {};
        SESSIONS.forEach(session => {
          sessionsState[session.id] = {
            enrolled: enrolledParticipants.filter(p => p.sessionId === session.id),
            waitingQueue: waitingParticipants.filter(p => p.sessionId === session.id),
          };
        });
        
        this.state = { sessions: sessionsState };
        
        console.log('🏠 Updated state with session breakdown:', 
          Object.entries(this.state.sessions).map(([id, state]) => 
            `${id}: ${state.enrolled.length} enrolled, ${state.waitingQueue.length} waiting`
          )
        );
        
        // Update localStorage with latest data
        this.saveToLocalStorage();
        console.log('✅ Data loaded from Supabase successfully');
      }
    } catch (error) {
      console.warn('❌ Failed to load from Supabase, using localStorage:', error);
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
        
        // Handle both old single-session format and new multi-session format
        if ('sessions' in parsed.state) {
          // New multi-session format
          this.state = {
            sessions: Object.fromEntries(
              Object.entries(parsed.state.sessions).map(([sessionId, sessionState]) => [
                sessionId,
                {
                  enrolled: sessionState.enrolled.map(p => ({...p, enrolledAt: new Date(p.enrolledAt)})),
                  waitingQueue: sessionState.waitingQueue.map(p => ({...p, enrolledAt: new Date(p.enrolledAt)}))
                }
              ])
            )
          };
        } else {
          // Legacy single-session format - migrate to first session
          const legacyState = parsed.state as any;
          const sessionsState: { [sessionId: string]: EnrollmentState } = {};
          SESSIONS.forEach((session, index) => {
            if (index === 0) {
              // First session gets the legacy data
              sessionsState[session.id] = {
                enrolled: (legacyState.enrolled || []).map((p: any) => ({
                  ...p, 
                  enrolledAt: new Date(p.enrolledAt),
                  sessionId: session.id
                })),
                waitingQueue: (legacyState.waitingQueue || []).map((p: any) => ({
                  ...p, 
                  enrolledAt: new Date(p.enrolledAt),
                  sessionId: session.id
                }))
              };
            } else {
              // Other sessions start empty
              sessionsState[session.id] = { enrolled: [], waitingQueue: [] };
            }
          });
          this.state = { sessions: sessionsState };
        }
        
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
      needsDiversityQuota: row.needs_diversity_quota,
      participationType: row.participation_type,
      enrolledAt: new Date(row.enrolled_at),
      sessionId: row.session_id || DEFAULT_SESSION_ID // Handle legacy data without session_id
    };
  }

  // Convert Participant to Supabase row
  private mapParticipantToSupabase(participant: Participant) {
    return {
      id: participant.id,
      name: participant.name,
      needs_diversity_quota: participant.needsDiversityQuota,
      participation_type: participant.participationType,
      enrolled_at: participant.enrolledAt.toISOString(),
      session_id: participant.sessionId
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

  // Save data to Supabase using upsert to handle duplicates properly
  private async saveToSupabase(): Promise<void> {
    if (!supabase) {
      console.log('Supabase not configured, skipping sync');
      return;
    }
    
    try {
      console.log('🗄️ Starting Supabase upsert operation...');

      // Collect all participants from all sessions
      const allEnrolled: Participant[] = [];
      const allWaiting: Participant[] = [];

      Object.values(this.state.sessions).forEach(sessionState => {
        allEnrolled.push(...sessionState.enrolled);
        allWaiting.push(...sessionState.waitingQueue);
      });
      
      console.log(`📊 Preparing to upsert ${allEnrolled.length} enrolled and ${allWaiting.length} waiting participants`);

      // Upsert enrolled participants (insert new, update existing)
      if (allEnrolled.length > 0) {
        const enrolledData = allEnrolled.map(this.mapParticipantToSupabase);
        console.log('💾 Upserting enrolled participants:', enrolledData);
        const { error: enrolledError } = await supabase
          .from(ENROLLED_TABLE)
          .upsert(enrolledData, { onConflict: 'id' })
          .select();

        if (enrolledError) {
          console.error('❌ Error upserting enrolled participants:', enrolledError);
          throw enrolledError;
        } else {
          console.log('✅ Enrolled participants upserted successfully');
        }
      }

      // Upsert waiting queue participants (insert new, update existing)
      if (allWaiting.length > 0) {
        const waitingData = allWaiting.map(this.mapParticipantToSupabase);
        console.log('💾 Upserting waiting participants:', waitingData);
        const { error: waitingError } = await supabase
          .from(WAITING_QUEUE_TABLE)
          .upsert(waitingData, { onConflict: 'id' })
          .select();

        if (waitingError) {
          console.error('❌ Error upserting waiting participants:', waitingError);
          throw waitingError;
        } else {
          console.log('✅ Waiting participants upserted successfully');
        }
      }

      console.log('✅ Data upserted to Supabase successfully');
    } catch (error) {
      console.error('❌ Failed to upsert to Supabase:', error);
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

  getState(sessionId?: string): EnrollmentState {
    const targetSessionId = sessionId || this.currentSessionId;
    const sessionState = this.getSessionState(targetSessionId);
    return {
      enrolled: [...sessionState.enrolled],
      waitingQueue: [...sessionState.waitingQueue],
    };
  }

  getEnrollmentStats(sessionId?: string) {
    const targetSessionId = sessionId || this.currentSessionId;
    const sessionState = this.getSessionState(targetSessionId);
    const enrolled = sessionState.enrolled;
    
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
      waitingQueueLength: sessionState.waitingQueue.length,
      menQuotaRemaining: MEN_QUOTA - menQuotaUsed,
      womenNonBinarySpotsRemaining: WOMEN_NON_BINARY_SPOTS - womenNonBinaryCount,
      menQuotaUsed: menQuotaUsed,
    };
  }

  canEnroll(needsDiversityQuota: boolean, sessionId?: string): { canEnroll: boolean; reason?: string } {
    const targetSessionId = sessionId || this.currentSessionId;
    const stats = this.getEnrollmentStats(targetSessionId);

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
    console.log('🚀 Starting enrollment for:', participant);
    const sessionId = participant.sessionId || DEFAULT_SESSION_ID;
    console.log('📋 Using session ID:', sessionId);
    
    const initialStats = this.getEnrollmentStats(sessionId);
    console.log('📊 Initial stats:', initialStats);
    
    const canEnrollResult = this.canEnroll(participant.needsDiversityQuota, sessionId);
    console.log('✅ Can enroll result:', canEnrollResult);

    if (!canEnrollResult.canEnroll) {
      // If it's a woman/non-binary and spots are full, add to waiting queue
      if (!participant.needsDiversityQuota && 
          this.getEnrollmentStats(sessionId).womenNonBinarySpotsRemaining <= 0) {
        const newParticipant: Participant = {
          ...participant,
          sessionId,
          id: `waiting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          enrolledAt: new Date(),
        };
        console.log('⏳ Adding to waiting queue:', newParticipant);
        this.state.sessions[sessionId].waitingQueue.push(newParticipant);
        await this.saveData();
        console.log('💾 Saved to waiting queue');
        return { 
          success: true, 
          message: 'Added to waiting queue', 
          addedToQueue: true 
        };
      }
      console.log('❌ Cannot enroll:', canEnrollResult.reason);
      return { success: false, message: canEnrollResult.reason || 'Cannot enroll' };
    }

    // Enroll the participant
    const newParticipant: Participant = {
      ...participant,
      sessionId,
      id: `enrolled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      enrolledAt: new Date(),
    };
    console.log('🎉 Enrolling participant:', newParticipant);
    
    this.state.sessions[sessionId].enrolled.push(newParticipant);
    console.log('📝 Added to local state. New count:', this.state.sessions[sessionId].enrolled.length);
    
    await this.saveData();
    console.log('💾 Saved data to storage');
    
    const finalStats = this.getEnrollmentStats(sessionId);
    console.log('📊 Final stats:', finalStats);

    return { success: true, message: 'Successfully enrolled!' };
  }
  // Set state and save to storage (for a specific session)
  async setState(state: EnrollmentState, sessionId?: string): Promise<void> {
    const targetSessionId = sessionId || this.currentSessionId;
    this.state.sessions[targetSessionId] = state;
    await this.saveData();
  }

  // Manually refresh data from Supabase
  async refresh(): Promise<void> {
    console.log('🔄 Manual refresh requested');
    await this.loadFromSupabase();
    console.log('✅ Manual refresh completed');
  }

  // Clear all enrollment data (for admin/testing purposes)
  async clearData(sessionId?: string): Promise<void> {
    if (sessionId) {
      // Clear specific session
      this.state.sessions[sessionId] = {
        enrolled: [],
        waitingQueue: []
      };
    } else {
      // Clear all sessions
      const sessionsState: { [sessionId: string]: EnrollmentState } = {};
      SESSIONS.forEach(session => {
        sessionsState[session.id] = {
          enrolled: [],
          waitingQueue: [],
        };
      });
      this.state = { sessions: sessionsState };
    }
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
