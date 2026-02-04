-- Create tables for the Vibe Coding Workshop Enrollment System
-- Run this SQL in your Supabase SQL editor

-- Table for enrolled participants
CREATE TABLE IF NOT EXISTS enrolled_participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    needs_diversity_quota BOOLEAN NOT NULL,
    participation_type TEXT NOT NULL CHECK (participation_type IN ('local', 'remote')),
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for waiting queue participants
CREATE TABLE IF NOT EXISTS waiting_queue_participants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    needs_diversity_quota BOOLEAN NOT NULL,
    participation_type TEXT NOT NULL CHECK (participation_type IN ('local', 'remote')),
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE enrolled_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_queue_participants ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public read and write access
-- (For a production app, you might want more restrictive policies)
CREATE POLICY "Allow public read access on enrolled_participants" ON enrolled_participants
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on enrolled_participants" ON enrolled_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on enrolled_participants" ON enrolled_participants
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on waiting_queue_participants" ON waiting_queue_participants
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert on waiting_queue_participants" ON waiting_queue_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on waiting_queue_participants" ON waiting_queue_participants
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete on waiting_queue_participants" ON waiting_queue_participants
    FOR DELETE USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrolled_participants_enrolled_at ON enrolled_participants (enrolled_at);
CREATE INDEX IF NOT EXISTS idx_waiting_queue_participants_enrolled_at ON waiting_queue_participants (enrolled_at);