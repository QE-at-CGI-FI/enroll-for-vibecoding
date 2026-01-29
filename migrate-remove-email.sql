-- Migration script to remove email field from existing tables
-- Run this in your Supabase SQL editor AFTER applying the updated supabase-setup.sql

-- Remove email column from enrolled_participants
ALTER TABLE enrolled_participants DROP COLUMN IF EXISTS email;

-- Remove email column from waiting_queue_participants  
ALTER TABLE waiting_queue_participants DROP COLUMN IF EXISTS email;

-- Drop email-related indexes (if they exist)
DROP INDEX IF EXISTS idx_enrolled_participants_email;
DROP INDEX IF EXISTS idx_waiting_queue_participants_email;