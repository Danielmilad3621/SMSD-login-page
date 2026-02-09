-- Migration: Create RLS policies for role-based and group-based access
-- Phase 1, Task 3: Enforce permissions at database level

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- ROLES TABLE POLICIES
-- ============================================================

-- Admin can see all roles and manage them (except create another Admin)
CREATE POLICY "admin_all_roles"
ON roles FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid())
  AND (role != 'Admin' OR EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND role = 'Admin'))
);

-- Others can only see their own role
CREATE POLICY "users_own_role"
ON roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- SCOUTS TABLE POLICIES
-- ============================================================

-- Admin: Full access (see all, edit all)
CREATE POLICY "admin_all_scouts"
ON scouts FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin Leader: See all, edit scouts in their assigned groups
CREATE POLICY "admin_leader_select_scouts"
ON scouts FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Admin Leader'
  OR is_admin(auth.uid())
);

CREATE POLICY "admin_leader_edit_scouts"
ON scouts FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'Admin Leader'
  AND scout_group = ANY(get_user_groups(auth.uid()))
);

CREATE POLICY "admin_leader_update_scouts"
ON scouts FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Admin Leader'
  AND scout_group = ANY(get_user_groups(auth.uid()))
)
WITH CHECK (
  get_user_role(auth.uid()) = 'Admin Leader'
  AND scout_group = ANY(get_user_groups(auth.uid()))
);

-- Leader: See scouts in their assigned group(s) only
CREATE POLICY "leader_select_scouts"
ON scouts FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Leader'
  AND scout_group = ANY(get_user_groups(auth.uid()))
);

-- Viewer: See scouts in their assigned group (read-only)
CREATE POLICY "viewer_select_scouts"
ON scouts FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Viewer'
  AND scout_group = ANY(get_user_groups(auth.uid()))
);

-- ============================================================
-- LEADERS TABLE POLICIES
-- ============================================================

-- Admin: Full access
CREATE POLICY "admin_all_leaders"
ON leaders FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin Leader: See all, edit leaders in their assigned groups
CREATE POLICY "admin_leader_select_leaders"
ON leaders FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Admin Leader'
  OR is_admin(auth.uid())
);

CREATE POLICY "admin_leader_edit_leaders"
ON leaders FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'Admin Leader'
  AND (scout_groups && get_user_groups(auth.uid()))
);

CREATE POLICY "admin_leader_update_leaders"
ON leaders FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Admin Leader'
  AND (scout_groups && get_user_groups(auth.uid()))
)
WITH CHECK (
  get_user_role(auth.uid()) = 'Admin Leader'
  AND (scout_groups && get_user_groups(auth.uid()))
);

-- Leader: See leaders in their assigned group(s) (read-only)
CREATE POLICY "leader_select_leaders"
ON leaders FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Leader'
  AND (scout_groups && get_user_groups(auth.uid()))
);

-- Viewer: See leaders in their assigned group (read-only)
CREATE POLICY "viewer_select_leaders"
ON leaders FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Viewer'
  AND (scout_groups && get_user_groups(auth.uid()))
);

-- ============================================================
-- MEETINGS TABLE POLICIES
-- ============================================================

-- Admin: Full access
CREATE POLICY "admin_all_meetings"
ON meetings FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin Leader: See all, create/edit meetings
CREATE POLICY "admin_leader_all_meetings"
ON meetings FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'Admin Leader')
WITH CHECK (get_user_role(auth.uid()) = 'Admin Leader');

-- Leader: See meetings (read-only)
CREATE POLICY "leader_select_meetings"
ON meetings FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'Leader');

-- Viewer: See meetings (read-only)
CREATE POLICY "viewer_select_meetings"
ON meetings FOR SELECT
TO authenticated
USING (get_user_role(auth.uid()) = 'Viewer');

-- ============================================================
-- ATTENDANCE TABLE POLICIES
-- ============================================================

-- Admin: Full access
CREATE POLICY "admin_all_attendance"
ON attendance FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Admin Leader: See all, create/edit attendance
CREATE POLICY "admin_leader_all_attendance"
ON attendance FOR ALL
TO authenticated
USING (get_user_role(auth.uid()) = 'Admin Leader')
WITH CHECK (get_user_role(auth.uid()) = 'Admin Leader');

-- Leader: See/create/edit attendance for their assigned group(s)
CREATE POLICY "leader_select_attendance"
ON attendance FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Leader'
  AND EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = attendance.scout_id
    AND scouts.scout_group = ANY(get_user_groups(auth.uid()))
  )
);

CREATE POLICY "leader_insert_attendance"
ON attendance FOR INSERT
TO authenticated
WITH CHECK (
  get_user_role(auth.uid()) = 'Leader'
  AND EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = attendance.scout_id
    AND scouts.scout_group = ANY(get_user_groups(auth.uid()))
  )
  AND recorded_by = auth.uid()
);

CREATE POLICY "leader_update_attendance"
ON attendance FOR UPDATE
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Leader'
  AND EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = attendance.scout_id
    AND scouts.scout_group = ANY(get_user_groups(auth.uid()))
  )
)
WITH CHECK (
  get_user_role(auth.uid()) = 'Leader'
  AND EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = attendance.scout_id
    AND scouts.scout_group = ANY(get_user_groups(auth.uid()))
  )
);

-- Viewer: See attendance in their assigned group (read-only)
CREATE POLICY "viewer_select_attendance"
ON attendance FOR SELECT
TO authenticated
USING (
  get_user_role(auth.uid()) = 'Viewer'
  AND EXISTS (
    SELECT 1 FROM scouts
    WHERE scouts.id = attendance.scout_id
    AND scouts.scout_group = ANY(get_user_groups(auth.uid()))
  )
);

