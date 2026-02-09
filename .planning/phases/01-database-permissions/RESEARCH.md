# Phase 1 Research — Database & Permissions Foundation

## Research Focus
How to design database schema and RLS policies for attendance tracking system with:
- Multi-tenant scout groups (2 groups, group-based visibility)
- Role-based access control (Admin, Admin Leader, Leader, Viewer)
- Separate roles table (not user metadata)
- Soft delete pattern (active flag, no hard deletion)

## Key Findings

### Database Schema Design

**Separate Roles Table Pattern:**
- **Best Practice:** Separate `roles` table is preferred for complex RBAC
- **Rationale:** 
  - Easier to query and manage
  - Can add role metadata (permissions, descriptions)
  - Cleaner separation from auth.users
  - Supports role history/audit trail (future)
- **Structure:**
  ```sql
  CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Admin Leader', 'Leader', 'Viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
  );
  ```

**Scout Groups as Text Fields:**
- **Decision:** Store as text (not separate table) for v1
- **Rationale:** 
  - Only 2 groups, fixed for v1
  - Simpler queries (no joins needed)
  - Can migrate to table later if groups grow
- **Pattern:** Use CHECK constraint to validate group names
  ```sql
  scout_group TEXT CHECK (scout_group IN ('Group 1', 'Group 2'))
  ```

**Multi-Group Leaders:**
- **Pattern:** Store as TEXT array or comma-separated
- **Recommendation:** Use PostgreSQL ARRAY type for cleaner queries
  ```sql
  scout_groups TEXT[] -- Array: ['Group 1', 'Group 2']
  ```
- **Alternative:** Comma-separated TEXT (simpler, less query-friendly)
  ```sql
  scout_groups TEXT -- 'Group 1,Group 2'
  ```

**Soft Delete Pattern:**
- **Best Practice:** Use `active` boolean flag, never hard delete
- **Rationale:**
  - Preserves historical data
  - Attendance records remain valid
  - Can reactivate if needed
- **Implementation:**
  ```sql
  active BOOLEAN DEFAULT TRUE,
  deactivated_at TIMESTAMPTZ
  ```

### RLS Policy Patterns

**Admin Bypass Pattern:**
- **Challenge:** Admin needs to see everything, bypass group restrictions
- **Solution:** Check role in RLS policy, allow all for Admin
  ```sql
  CREATE POLICY "Admin sees all"
  ON scouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM roles 
      WHERE user_id = auth.uid() 
      AND role = 'Admin'
    )
    OR
    -- Group-based access for other roles
    scout_group = ANY(get_user_groups(auth.uid()))
  );
  ```

**Group-Based Visibility:**
- **Pattern:** Function to get user's groups, use in RLS
  ```sql
  CREATE FUNCTION get_user_groups(user_uuid UUID)
  RETURNS TEXT[] AS $$
    SELECT scout_groups FROM leaders 
    WHERE user_id = user_uuid AND active = TRUE;
  $$ LANGUAGE sql SECURITY DEFINER;
  ```
- **Usage:** Use in RLS policies for Leaders/Viewers

**Role-Based Write Access:**
- **Pattern:** Separate policies for INSERT/UPDATE/DELETE
- **Admin:** Can do everything
- **Admin Leaders:** Can create meetings, edit their groups
- **Leaders:** Can only take attendance
- **Viewers:** No write access

**Example Policy Structure:**
```sql
-- Admin can do everything
CREATE POLICY "Admin full access"
ON scouts FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND role = 'Admin')
);

-- Leaders can see their groups
CREATE POLICY "Leaders see their groups"
ON scouts FOR SELECT
TO authenticated
USING (
  scout_group = ANY(get_user_groups(auth.uid()))
);
```

### Foreign Key Constraints

**Attendance Records:**
- **Pattern:** Reference scouts, meetings, leaders
- **CASCADE:** Not needed (no deletion)
- **NULL handling:** Keep references even if leader inactive
  ```sql
  CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scout_id UUID REFERENCES scouts(id),
    meeting_id UUID REFERENCES meetings(id),
    leader_id UUID REFERENCES leaders(id), -- Can be inactive
    status TEXT CHECK (status IN ('Present', 'Absent')),
    points_earned INTEGER DEFAULT 0,
    recorded_by UUID REFERENCES auth.users(id),
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(scout_id, meeting_id)
  );
  ```

**Unique Constraints:**
- **Critical:** Prevent duplicate attendance
  ```sql
  UNIQUE(scout_id, meeting_id)
  ```
- **Rationale:** One record per scout per meeting

### Index Strategy

**Performance Indexes:**
- **Roles:** Index on user_id (frequent lookups)
  ```sql
  CREATE INDEX idx_roles_user_id ON roles(user_id);
  ```
- **Scouts:** Index on scout_group (group filtering)
  ```sql
  CREATE INDEX idx_scouts_group ON scouts(scout_group);
  ```
- **Attendance:** Index on meeting_id, scout_id (common queries)
  ```sql
  CREATE INDEX idx_attendance_meeting ON attendance(meeting_id);
  CREATE INDEX idx_attendance_scout ON attendance(scout_id);
  ```

### Initial Admin Setup

**Manual Creation Pattern:**
- **Step 1:** Find user_id from auth.users by email
  ```sql
  SELECT id FROM auth.users WHERE email = 'danielmilad3621@gmail.com';
  ```
- **Step 2:** Insert Admin role
  ```sql
  INSERT INTO roles (user_id, role)
  VALUES ('<user_id>', 'Admin');
  ```
- **Security:** Run as migration or one-time SQL script

### Common Pitfalls to Avoid

**1. RLS Policy Order:**
- **Issue:** Policies evaluated in order, first match wins
- **Solution:** Put most restrictive policies first, Admin bypass last

**2. Function Security:**
- **Issue:** RLS functions need SECURITY DEFINER to access other tables
- **Solution:** Use SECURITY DEFINER for helper functions, be careful with permissions

**3. Array Queries:**
- **Issue:** Querying array fields can be slow
- **Solution:** Use GIN index for array columns
  ```sql
  CREATE INDEX idx_leaders_groups ON leaders USING GIN(scout_groups);
  ```

**4. Role Caching:**
- **Issue:** Checking role in every RLS policy is expensive
- **Solution:** Consider materialized view or caching (v2 optimization)

**5. Group Validation:**
- **Issue:** Invalid group names can break queries
- **Solution:** Use CHECK constraint or ENUM type
  ```sql
  CREATE TYPE scout_group_type AS ENUM ('Group 1', 'Group 2');
  scout_group scout_group_type
  ```

## Recommended Schema

### Tables Structure

**roles:**
- id (UUID, PK)
- user_id (UUID, FK to auth.users, UNIQUE)
- role (TEXT, CHECK constraint)
- created_at (TIMESTAMPTZ)

**scouts:**
- id (UUID, PK)
- name (TEXT, NOT NULL)
- email (TEXT, UNIQUE, NOT NULL)
- scout_group (TEXT, CHECK constraint)
- points_total (INTEGER, DEFAULT 0)
- created_at, updated_at (TIMESTAMPTZ)

**leaders:**
- id (UUID, PK)
- user_id (UUID, FK to auth.users, UNIQUE)
- name (TEXT, NOT NULL)
- email (TEXT, UNIQUE, NOT NULL)
- scout_groups (TEXT[], array of group names)
- notes (TEXT, optional)
- active (BOOLEAN, DEFAULT TRUE)
- created_at, updated_at (TIMESTAMPTZ)

**meetings:**
- id (UUID, PK)
- date (DATE, NOT NULL)
- location (TEXT)
- type (TEXT, optional)
- assigned_leaders (UUID[], array of leader IDs)
- created_at, updated_at (TIMESTAMPTZ)

**attendance:**
- id (UUID, PK)
- scout_id (UUID, FK to scouts)
- meeting_id (UUID, FK to meetings)
- leader_id (UUID, FK to leaders, optional)
- status (TEXT, CHECK: 'Present' or 'Absent')
- points_earned (INTEGER, DEFAULT 0)
- recorded_by (UUID, FK to auth.users)
- recorded_at (TIMESTAMPTZ)
- UNIQUE(scout_id, meeting_id)

## RLS Policy Strategy

### Policy Hierarchy
1. **Admin policies** (bypass all restrictions)
2. **Admin Leader policies** (see all, edit assigned groups)
3. **Leader policies** (see/edit assigned groups)
4. **Viewer policies** (read-only, assigned groups)

### Policy Naming Convention
- `{role}_{action}_{resource}` e.g., `admin_all_scouts`, `leader_select_scouts`

### Testing Strategy
- Test each role independently
- Verify group isolation (Leader can't see other groups)
- Verify Admin sees everything
- Test inactive leaders (records preserved)

## Migration Strategy

**Phase 1 Implementation:**
1. Create tables (no RLS initially)
2. Insert test data
3. Create RLS policies
4. Test policies with different roles
5. Insert Admin role manually
6. Verify access control

**Future Enhancements (v2+):**
- Migrate scout_groups to separate table if groups grow
- Add role history/audit trail
- Optimize with materialized views
- Add role caching layer

## Confidence Levels

- **High (90%+):** Separate roles table, RLS policy patterns, unique constraints
- **Medium (70-90%):** Array storage for multi-group leaders, function security
- **Low (<70%):** Performance optimizations (depends on data volume)

## Key Takeaways

1. **Separate roles table** is the right choice for this use case
2. **RLS policies** must check role first, then group membership
3. **Array fields** work well for multi-group leaders (with proper indexing)
4. **Soft delete** preserves data integrity
5. **Admin bypass** pattern essential for full access
6. **Unique constraints** prevent duplicate attendance records

---
*Research completed: 2025-02-09*  
*Ready for Phase 1 planning*

