# Phase 1 Context — Database & Permissions Foundation

## Phase Overview
**Goal:** Establish database schema and permission system as security foundation

**Scope:** Database tables, RLS policies, role storage, initial admin setup

## Key Decisions

### Role Storage & Initial Setup

**Role Storage:**
- Roles stored in separate `roles` table in Supabase (not as field in auth.users)
- Table structure: `user_id` (references auth.users), `role` (Admin, Admin Leader, Leader, Viewer)

**Initial Admin:**
- First admin created manually in database
- Admin email: `danielmilad3621@gmail.com`
- Only one Admin role exists (single admin system)

**Role Assignment:**
- Admin assigns/changes roles via admin portal (UI feature in later phase)
- Admin can assign Admin Leader, Leader, or Viewer roles
- Admin cannot create another Admin (only one admin exists)

### Database Field Details

**Scouts Table:**
- **Required fields:** name, email, scout_group (text field with group name)
- **Optional fields:** notes (for leaders only, not scouts)
- **Additional fields:** points_total, created_at, updated_at

**Leaders Table:**
- **Required fields:** name, email, scout_group (text field - can have 2 groups)
- **Optional fields:** notes (text field for leader-specific notes)
- **Additional fields:** role (stored in separate roles table), created_at, updated_at, active (boolean for inactive leaders)

**Scout Groups:**
- Store as text field (group names), not separate table
- Two groups exist initially
- Group names stored directly on scouts and leaders

**Data Validation:**
- Email must be unique for scouts
- Email must be unique for leaders
- Scout group must be one of the valid group names
- Leaders can be assigned to up to 2 groups (stored as text, comma-separated or array)

### Permission Edge Cases

**Role Capabilities:**

**Admin (danielmilad3621@gmail.com):**
- Can see everything (all scout groups, all scouts, all leaders, all meetings, all attendance)
- Can assign/change any role (except cannot create another Admin)
- Full system access

**Admin Leaders:**
- Can see all scout groups (not limited to assigned group)
- Can create meetings and take attendance
- Can manage scouts and leaders in their assigned groups
- Cannot assign roles (only Admin can)

**Leaders:**
- Can see only scouts in their assigned scout group(s)
- Can take attendance for scouts and leaders in their assigned group(s)
- Cannot create meetings (Admin Leaders only)
- Cannot manage participants (Admin/Admin Leaders only)

**Viewers:**
- Can see only their assigned scout group (read-only)
- Can view attendance, points, meetings for their group
- Cannot edit anything (read-only access)

**Role Changes:**
- Only Admin can change roles
- Admin cannot create another Admin (single admin system)
- When leader role changes, their access updates immediately

### Data Relationships & Constraints

**Deletion Policy:**
- No deletion option in v1 (soft delete via `active` flag)
- Leaders marked as `active: false` when removed (not deleted)
- Scouts cannot be deleted (no deletion feature in v1)

**Orphaned Data Handling:**
- When leader is removed (marked inactive), their attendance records are kept
- Attendance records reference leader by ID (foreign key preserved)
- System shows "Inactive Leader" or similar indicator for removed leaders
- Historical attendance data remains intact

**Foreign Key Constraints:**
- Attendance records reference scouts (CASCADE not needed - no deletion)
- Attendance records reference meetings (CASCADE not needed - no deletion)
- Attendance records reference leaders (keep even if leader inactive)
- Roles table references auth.users (handle user deletion via Supabase auth)

**Unique Constraints:**
- Scouts: email must be unique
- Leaders: email must be unique
- Attendance: (scout_id, meeting_id) must be unique (one record per scout per meeting)
- Roles: user_id must be unique (one role per user)

### Scout Group Structure

**Groups:**
- Two scout groups exist
- Group names stored as text fields (not separate table)
- Leaders can be assigned to up to 2 groups
- Scouts assigned to exactly one group

**Group Assignment:**
- Leaders: Can belong to 2 groups (stored as text field - comma-separated or array)
- Scouts: Assigned to exactly one group
- Admin: Sees all groups
- Admin Leaders: See all groups
- Leaders: See only their assigned group(s)
- Viewers: See only their assigned group

### Notes Field

**Usage:**
- Notes field only for leaders (not scouts)
- Text field, no specific length limit (use reasonable database text type)
- Used for leader-specific notes/information
- Optional field (can be empty)

## Implementation Guidance

### Database Schema Priorities
1. Create `scout_groups` concept (text fields, not table)
2. Create `scouts` table with scout_group field
3. Create `leaders` table with scout_group field (supports 2 groups)
4. Create `meetings` table
5. Create `attendance` table with unique constraint
6. Create `roles` table (separate from auth.users)

### RLS Policy Priorities
1. Admin can see everything (bypass RLS or allow all)
2. Admin Leaders can see all groups but only edit their assigned groups
3. Leaders can only see their assigned scout group(s)
4. Viewers can only read their assigned scout group

### Initial Setup
1. Create database tables
2. Manually insert Admin role for danielmilad3621@gmail.com
3. Test RLS policies with different role types
4. Verify permission enforcement

## Out of Scope (Deferred)
- Scout group management UI (groups are fixed for v1)
- Role assignment UI (Admin portal for later phase)
- Leader deletion (soft delete only)
- Scout deletion (not in v1)

## Questions Resolved
- ✅ Role storage: Separate table
- ✅ Initial admin: Manual setup, danielmilad3621@gmail.com
- ✅ Scout groups: Text fields, 2 groups, leaders can have 2 groups
- ✅ Permission scope: Group-based visibility, Admin sees all
- ✅ Data deletion: No deletion, soft delete via active flag
- ✅ Notes: Leaders only

---
*Context created: 2025-02-09*  
*Ready for planning Phase 1*

