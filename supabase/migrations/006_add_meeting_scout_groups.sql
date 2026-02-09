-- Migration: Add scout_groups field to meetings table
-- Phase 3, Task 1: Update database schema for meeting management

-- Add scout_groups column to meetings table
ALTER TABLE meetings
ADD COLUMN IF NOT EXISTS scout_groups TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add GIN index for performance on array queries
CREATE INDEX IF NOT EXISTS idx_meetings_scout_groups ON meetings USING GIN(scout_groups);

-- Add comment explaining the field
COMMENT ON COLUMN meetings.scout_groups IS 'Array of scout group names (Group 1, Group 2) - meeting can be for one or both groups';

