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

// Retry configuration for network operations
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
};

// Utility function for retry with exponential backoff
async function retryOperation<T>(
  operation: () => Promise<T>,
  operationName: string,
  retries = RETRY_CONFIG.maxRetries
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await operation();
      if (attempt > 0) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt + 1}`);
      }
      return result;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ ${operationName} failed on attempt ${attempt + 1}:`, error);
      
      if (attempt < retries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(2, attempt),
          RETRY_CONFIG.maxDelay
        );
        console.log(`⏳ Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ ${operationName} failed after ${retries + 1} attempts`);
  throw lastError;
}

// Supabase table names
const ENROLLED_TABLE = 'enrolled_participants';
const WAITING_QUEUE_TABLE = 'waiting_queue_participants';

// Second session restriction configuration
const SECOND_SESSION_RESTRICTION = {
  cutoffDate: new Date('2026-02-10T08:00:00+02:00'), // Feb 10, 2026, 8 AM Finnish time (UTC+2)
  restrictedSessionId: 'session-2',
  maxWaitingQueuePosition: 17 // Only first 17 in waiting queue can enroll to second session
};

// Helper function to check if we're still in the restriction period
function isSecondSessionRestricted(): boolean {
  const now = new Date();
  return now < SECOND_SESSION_RESTRICTION.cutoffDate;
}

// Helper function to get participant's position in first session waiting queue (1-based, 0 if not found)
function getParticipantPositionInFirstWaitingQueue(participantName: string, state: MultiSessionEnrollmentState): number {
  const firstSessionState = state.sessions['session-1'];
  if (!firstSessionState) return 0;
  
  const normalizedName = participantName.toLowerCase().trim();
  
  // Find position in first session waiting queue (1-based index)
  const position = firstSessionState.waitingQueue.findIndex(p => 
    p.name.toLowerCase().trim() === normalizedName
  );
  
  return position >= 0 ? position + 1 : 0; // Convert to 1-based, return 0 if not found
}

// Helper function to check if participant can enroll to second session during restriction
function canParticipantEnrollToSecondSession(participantName: string, state: MultiSessionEnrollmentState): { canEnroll: boolean; position: number; reason?: string } {
  const position = getParticipantPositionInFirstWaitingQueue(participantName, state);
  
  if (position === 0) {
    return { canEnroll: false, position: 0, reason: 'not in first session waiting queue' };
  }
  
  if (position > SECOND_SESSION_RESTRICTION.maxWaitingQueuePosition) {
    return { canEnroll: false, position, reason: 'beyond eligible position in waiting queue' };
  }
  
  return { canEnroll: true, position };
}

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

  // Save data to Supabase using upsert to handle duplicates properly with retry logic
  private async saveToSupabase(): Promise<void> {
    if (!supabase) {
      console.log('Supabase not configured, skipping sync');
      return;
    }
    
    // Capture supabase reference for use inside retry callback
    const supabaseClient = supabase;
    
    await retryOperation(async () => {
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
        const { error: enrolledError } = await supabaseClient
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
        const { error: waitingError } = await supabaseClient
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
    }, 'Supabase upsert operation');
  }

  // Save data to both Supabase and localStorage
  private async saveData(): Promise<{ success: boolean; error?: any; savedLocally: boolean }> {
    // Always save to localStorage first (for immediate backup)
    this.saveToLocalStorage();
    const savedLocally = true;
    
    try {
      // Then save to Supabase with retry logic
      await this.saveToSupabase();
      return { success: true, savedLocally };
    } catch (error) {
      console.error('❌ Supabase save failed after retries:', error);
      // Don't just warn - throw the error so the user knows about the failure
      return { success: false, error, savedLocally };
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
    
    // Check second session restriction
    if (sessionId === SECOND_SESSION_RESTRICTION.restrictedSessionId && isSecondSessionRestricted()) {
      const eligibilityCheck = canParticipantEnrollToSecondSession(participant.name, this.state);
      console.log('🔒 Second session restricted. Eligibility check:', eligibilityCheck);
      
      if (!eligibilityCheck.canEnroll) {
        // Handle different restriction scenarios
        if (eligibilityCheck.position === 0) {
          // Not in first session waiting queue - add to second session waiting queue
          const newParticipant: Participant = {
            ...participant,
            sessionId,
            id: `waiting-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            enrolledAt: new Date(),
          };
          
          console.log('⏳ Adding to second session waiting queue (not in first queue):', newParticipant);
          this.state.sessions[sessionId].waitingQueue.push(newParticipant);
          
          const saveResult = await this.saveData();
          console.log('💾 Waiting queue save result:', saveResult);
          
          if (saveResult.success) {
            const cutoffDateFormatted = SECOND_SESSION_RESTRICTION.cutoffDate.toLocaleDateString('en-GB', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            });
            
            return { 
              success: true, 
              message: `Until ${cutoffDateFormatted}, only the first ${SECOND_SESSION_RESTRICTION.maxWaitingQueuePosition} participants from the first session waiting queue can enroll directly to the second session. You have been added to the second session waiting queue.`, 
              addedToQueue: true 
            };
          } else {
            // Remove from local state if database save failed
            this.state.sessions[sessionId].waitingQueue.pop();
            
            const isNetworkError = saveResult.error?.message?.includes('fetch') || 
                                   saveResult.error?.message?.includes('network') ||
                                   saveResult.error?.code === 'PGRST301' ||
                                   saveResult.error?.message?.includes('timeout');
            
            if (isNetworkError) {
              return { 
                success: false, 
                message: 'Network error - please check your connection and try again. You were not added to the waiting queue.' 
              };
            } else {
              return { 
                success: false, 
                message: 'Database error - please try again or contact support if the problem persists.' 
              };
            }
          }
        } else {
          // Participant is in waiting queue but beyond position 17 - don't add to second session queue
          return {
            success: true,
            message: `You are at position ${eligibilityCheck.position} in the first session waiting queue. Only the first ${SECOND_SESSION_RESTRICTION.maxWaitingQueuePosition} participants can enroll to the second session during the restriction period. You are already in the queue system.`
          };
        }
      }
    }
    
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
        
        const saveResult = await this.saveData();
        console.log('💾 Waiting queue save result:', saveResult);
        
        if (saveResult.success) {
          return { 
            success: true, 
            message: 'Added to waiting queue', 
            addedToQueue: true 
          };
        } else {
          // Remove from local state if database save failed
          this.state.sessions[sessionId].waitingQueue.pop();
          
          const isNetworkError = saveResult.error?.message?.includes('fetch') || 
                                 saveResult.error?.message?.includes('network') ||
                                 saveResult.error?.code === 'PGRST301' ||
                                 saveResult.error?.message?.includes('timeout');
          
          if (isNetworkError) {
            return { 
              success: false, 
              message: 'Network error - please check your connection and try again. You were not added to the waiting queue.' 
            };
          } else {
            return { 
              success: false, 
              message: 'Database error - please try again or contact support if the problem persists.' 
            };
          }
        }
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
    
    const saveResult = await this.saveData();
    console.log('💾 Save result:', saveResult);
    
    const finalStats = this.getEnrollmentStats(sessionId);
    console.log('📊 Final stats:', finalStats);

    // Handle different save scenarios
    if (saveResult.success) {
      return { success: true, message: 'Successfully enrolled!' };
    } else {
      // Database save failed, but data is saved locally
      console.error('🚨 Database save failed for enrollment:', saveResult.error);
      
      // Remove from local state since we couldn't save to database
      // This prevents inconsistency between local and database state
      this.state.sessions[sessionId].enrolled.pop();
      
      // Return appropriate error message
      const isNetworkError = saveResult.error?.message?.includes('fetch') || 
                             saveResult.error?.message?.includes('network') ||
                             saveResult.error?.code === 'PGRST301' ||
                             saveResult.error?.message?.includes('timeout');
      
      if (isNetworkError) {
        return { 
          success: false, 
          message: 'Network error - please check your connection and try again. Your enrollment was not saved.' 
        };
      } else {
        return { 
          success: false, 
          message: 'Database error - please try again or contact support if the problem persists.' 
        };
      }
    }
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
