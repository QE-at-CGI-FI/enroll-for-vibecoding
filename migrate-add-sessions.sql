-- Migration to add session support to existing tables
-- Add session_id column to enrolled_participants table
ALTER TABLE enrolled_participants ADD COLUMN IF NOT EXISTS session_id VARCHAR(50) DEFAULT 'session-1';

-- Add session_id column to waiting_queue_participants table  
ALTER TABLE waiting_queue_participants ADD COLUMN IF NOT EXISTS session_id VARCHAR(50) DEFAULT 'session-1';

-- Update existing records to use session-1 (for backward compatibility)
UPDATE enrolled_participants SET session_id = 'session-1' WHERE session_id IS NULL;
UPDATE waiting_queue_participants SET session_id = 'session-1' WHERE session_id IS NULL;

-- Make session_id NOT NULL after setting defaults
ALTER TABLE enrolled_participants ALTER COLUMN session_id SET NOT NULL;
ALTER TABLE waiting_queue_participants ALTER COLUMN session_id SET NOT NULL;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrolled_participants_session_id ON enrolled_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_participants_session_id ON waiting_queue_participants(session_id);