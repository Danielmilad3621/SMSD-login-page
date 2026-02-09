# Phase 2 Context — Participant Management

## Phase Overview
**Goal:** Enable leaders to add and manage scouts and leaders in the system

**Scope:** UI screens, forms, lists, search/filter, validation

## Key Decisions

### UI Layout & Organization

**Screen Structure:**
- Separate screens for scouts vs leaders (not combined)
- Navigation between add/edit/view screens
- Card-based display (not table)

**List Display:**
- Scouts: Cards grouped by scout group, then alphabetical within group
- Leaders: Cards grouped by scout group, then alphabetical within group
- Each card shows: Name, Group, Role (for leaders), Points (for scouts only)

**Navigation:**
- Separate navigation/sections for Scouts and Leaders
- Add button on list screen
- Edit via inline edit (not separate screen)

### Add/Edit Forms

**Scout Form Fields:**
- **Required:** name, email, scout_group
- **Optional:** notes, parent_contact
- **Display:** points_total (read-only, shown in lists)

**Leader Form Fields:**
- **Required:** name, email, scout_groups (at least one), role
- **Optional:** notes (from database schema)
- **No optional fields beyond notes**

**Form Flow:**
- After adding: Redirect to list (see new entry in context)
- Edit: Inline edit on list screen (not separate edit screen)
- Form validation: Both inline errors under fields AND error banner at top

**Error Messages:**
- Inline errors under each field (field-specific validation)
- Error banner at top of form (general errors, API errors)
- Both approaches used together

### Search & Filtering

**Search Behavior:**
- Real-time search (as user types, no search button)
- Separate search for scouts and leaders (not combined)
- Search by name (primary)

**Filtering:**
- Filter by scout group (checkbox or dropdown)
- Filter applies to list display
- Search and filter work together (search within filtered results)

**Search Scope:**
- Scouts: Search by name
- Leaders: Search by name
- Separate search inputs for each screen

### Leader Creation Workflow

**Role Assignment:**
- Only Admin can assign roles (Admin Leaders cannot assign roles)
- When Admin Leaders create a leader: Role field is disabled, defaults to "Leader"
- Admin can change role after creation
- Role assignment requires Admin permission (enforced by RLS)

**Scout Group Assignment:**
- Checkboxes for scout groups (Group 1, Group 2)
- Leaders can be assigned to up to 2 groups
- At least one group must be selected (validation)
- Groups can be changed after creation (via admin request/approval)

**Leader Management:**
- Admin/Admin Leader can create leaders
- Only Admin can assign/change roles
- Groups can be updated (requires admin approval per user request)

### List Display Details

**Scout Cards:**
- Display: Name, Group, Points (points_total)
- Sort: Alphabetical within each scout group
- Grouping: Grouped by scout group (Group 1, then Group 2)
- Points shown prominently (requirement PART-05)

**Leader Cards:**
- Display: Name, Group(s), Role
- Sort: Alphabetical within each scout group
- Grouping: Grouped by scout group (leaders appear in each group they belong to, or separate section)
- No points displayed (leaders don't have points)

**Sorting:**
- Primary: By scout group (Group 1 first, then Group 2)
- Secondary: Alphabetical by name within each group
- No sorting by points (alphabetical only)

**Grouping Strategy:**
- Scouts: Grouped by scout_group (each scout in exactly one group)
- Leaders: Show in each group they belong to (if leader belongs to 2 groups, appears in both sections)
- Alternative: Separate "Multi-Group Leaders" section (to be decided during implementation)

### Validation & Error Handling

**Duplicate Prevention:**
- System prevents duplicate scouts (same email) - PART-08
- System prevents duplicate leaders (same email)
- Error message: "Email already exists" (inline + banner)

**Required Field Validation:**
- Name: Required, non-empty
- Email: Required, valid email format
- Scout Group: Required (for scouts, exactly one)
- Scout Groups: Required (for leaders, at least one)
- Role: Required (for leaders, but only Admin can set)

**Email Validation:**
- Valid email format
- Unique within scouts table
- Unique within leaders table
- Real-time validation (check on blur or after typing)

**Error Display:**
- Inline errors: Red text under field, field border highlighted
- Error banner: Top of form, dismissible
- Success message: Green banner after successful add/edit

### Permission Enforcement

**Who Can Add/Edit:**
- Scouts: Admin and Admin Leaders can add/edit
- Leaders: Admin and Admin Leaders can add (role assignment: Admin only)

**UI Permission Hiding:**
- Add/Edit buttons only visible to Admin/Admin Leaders
- Role field only editable by Admin
- Viewers: Read-only access (no add/edit buttons)

**RLS Enforcement:**
- Database-level permissions already enforced (Phase 1)
- UI hides features user doesn't have permission for (PERM-08, future phase)

### Data Flow

**Adding Scout:**
1. User clicks "Add Scout" button
2. Form appears (inline or modal)
3. User fills: name, email, scout_group, optional notes/parent_contact
4. Validation on submit
5. Insert into scouts table via Supabase
6. Redirect to list (see new scout in context)

**Adding Leader:**
1. User clicks "Add Leader" button
2. Form appears (inline or modal)
3. User fills: name, email, scout_groups (checkboxes), role (if Admin) or disabled (if Admin Leader)
4. Validation on submit
5. Insert into leaders table AND roles table via Supabase
6. Redirect to list (see new leader in context)

**Editing:**
1. User clicks edit on card (inline edit)
2. Form fields become editable
3. User modifies fields
4. Validation on save
5. Update via Supabase
6. Card updates in place (no redirect)

### Implementation Notes

**Form Components:**
- Reusable form component for scouts and leaders
- Inline validation (real-time feedback)
- Loading states during API calls
- Success/error messaging

**List Components:**
- Card component for scouts
- Card component for leaders
- Group header component (Group 1, Group 2)
- Search input component
- Filter dropdown/checkboxes

**State Management:**
- Track form state (editing, adding, viewing)
- Track search/filter state
- Track loading/error states
- Sync with Supabase in real-time (if using realtime subscriptions)

**API Calls:**
- `supabase.from('scouts').insert()` - Add scout
- `supabase.from('scouts').update()` - Edit scout
- `supabase.from('scouts').select()` - List scouts (with RLS filtering)
- `supabase.from('leaders').insert()` - Add leader
- `supabase.from('leaders').update()` - Edit leader
- `supabase.from('leaders').select()` - List leaders (with RLS filtering)
- `supabase.from('roles').insert()` - Assign role (Admin only)

## Out of Scope (Deferred)

- Self-registration for scouts (v2)
- Bulk import (CSV upload)
- Delete functionality (soft delete only, no UI in v1)
- Advanced filtering (by points, by date added, etc.)
- Export functionality (Phase 6)

## Questions Resolved

- ✅ Separate screens for scouts vs leaders
- ✅ Card-based display
- ✅ Grouped by scout group, alphabetical within group
- ✅ Real-time search with filter by group
- ✅ Inline edit (not separate screen)
- ✅ Checkboxes for scout groups, dropdown for role
- ✅ Admin only for role assignment
- ✅ Required vs optional fields defined
- ✅ Error display: Both inline and banner
- ✅ Form flow: Redirect to list after add

## Open Questions

- **Leader grouping:** Should leaders appear in each group they belong to, or in a separate "Multi-Group Leaders" section? (Decision: Show in each group for now, can refine later)

---
*Context created: 2025-02-09*  
*Ready for planning Phase 2*

