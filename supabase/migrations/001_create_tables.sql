-- Migration: Create database tables for SMSD Scout Portal
-- Phase 1, Task 1: Create all required tables

-- ============================================================
-- 1. ROLES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Admin Leader', 'Leader', 'Viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_user_id ON roles(user_id);

COMMENT ON TABLE roles IS 'User roles for RBAC - separate table for flexibility';
COMMENT ON COLUMN roles.role IS 'Role type: Admin, Admin Leader, Leader, or Viewer';

-- ============================================================
-- 2. SCOUTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS scouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  scout_group TEXT NOT NULL CHECK (scout_group IN ('Group 1', 'Group 2')),
  points_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scouts_group ON scouts(scout_group);
CREATE INDEX IF NOT EXISTS idx_scouts_email ON scouts(email);

COMMENT ON TABLE scouts IS 'Scout participants - assigned to one scout group';
COMMENT ON COLUMN scouts.scout_group IS 'Scout group name: Group 1 or Group 2';
COMMENT ON COLUMN scouts.points_total IS 'Cumulative points from attendance and activities';

-- ============================================================
-- 3. LEADERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS leaders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  scout_groups TEXT[] DEFAULT ARRAY[]::TEXT[],
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaders_user_id ON leaders(user_id);
CREATE INDEX IF NOT EXISTS idx_leaders_email ON leaders(email);
CREATE INDEX IF NOT EXISTS idx_leaders_groups ON leaders USING GIN(scout_groups);
CREATE INDEX IF NOT EXISTS idx_leaders_active ON leaders(active) WHERE active = TRUE;

COMMENT ON TABLE leaders IS 'Scout group leaders - can belong to up to 2 groups';
COMMENT ON COLUMN leaders.scout_groups IS 'Array of scout group names (max 2 groups)';
COMMENT ON COLUMN leaders.active IS 'Soft delete flag - false when leader removed';
COMMENT ON COLUMN leaders.notes IS 'Optional notes about the leader';

-- ============================================================
-- 4. MEETINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  location TEXT,
  type TEXT,
  assigned_leaders UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_leaders ON meetings USING GIN(assigned_leaders);

COMMENT ON TABLE meetings IS 'Scout meetings and events';
COMMENT ON COLUMN meetings.assigned_leaders IS 'Array of leader IDs assigned to this meeting';

-- ============================================================
-- 5. ATTENDANCE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scout_id UUID REFERENCES scouts(id) NOT NULL,
  meeting_id UUID REFERENCES meetings(id) NOT NULL,
  leader_id UUID REFERENCES leaders(id),
  status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
  points_earned INTEGER DEFAULT 0,
  recorded_by UUID REFERENCES auth.users(id) NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scout_id, meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON attendance(meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendance_scout ON attendance(scout_id);
CREATE INDEX IF NOT EXISTS idx_attendance_leader ON attendance(leader_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON attendance(recorded_by);

COMMENT ON TABLE attendance IS 'Attendance records - one per scout per meeting';
COMMENT ON COLUMN attendance.leader_id IS 'Optional - leader who took attendance (can be inactive)';
COMMENT ON COLUMN attendance.points_earned IS 'Points earned for this attendance record';

-- ============================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_scouts_updated_at
  BEFORE UPDATE ON scouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaders_updated_at
  BEFORE UPDATE ON leaders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

