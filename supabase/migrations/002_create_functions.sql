-- Migration: Create helper functions for RLS policies
-- Phase 1, Task 2: PostgreSQL functions to support RLS

-- ============================================================
-- 1. GET_USER_ROLE function
-- Returns the role of a user from the roles table
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_role(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM roles WHERE user_id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_role IS 'Returns user role from roles table, NULL if no role found';

-- ============================================================
-- 2. GET_USER_GROUPS function
-- Returns array of scout groups for a leader
-- Uses SECURITY DEFINER to access leaders table
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_groups(user_uuid UUID)
RETURNS TEXT[] AS $$
  SELECT COALESCE(scout_groups, ARRAY[]::TEXT[])
  FROM leaders
  WHERE user_id = user_uuid AND active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_groups IS 'Returns array of scout groups for a leader, empty array if not a leader or inactive';

-- ============================================================
-- 3. IS_ADMIN function
-- Convenience function to check if user is Admin
-- ============================================================
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
  SELECT get_user_role(user_uuid) = 'Admin';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_admin IS 'Returns true if user is Admin, false otherwise';

