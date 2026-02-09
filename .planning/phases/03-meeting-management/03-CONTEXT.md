# Phase 3 Context — Meeting Management

## Phase Overview
**Goal:** Enable leaders to create and manage meeting records

**Scope:** Meeting creation, editing, list display, leader assignment

## Key Decisions

### Meeting Creation Form

**Required Fields:**
- **Date:** Date picker, future dates only (past dates not allowed)
- **Location:** Text field (free text, any location)
- **Scout Group(s):** Can be for both groups (checkboxes: Group 1, Group 2) - at least one required

**Optional Fields:**
- **Notes:** Text area for meeting notes/description
- **Type:** Removed (always weekly meetings in v1)

**Location Field:**
- Text input (free text) for v1
- **Future:** Google Maps integration (map picker/autocomplete) - deferred to v2
- Users can enter any location description

**Date Validation:**
- Future dates only (cannot create meetings in the past)
- Date picker should disable past dates
- Real-time validation on form

**Scout Group Assignment:**
- Checkboxes for Group 1 and Group 2
- At least one group must be selected
- Meeting can be for both groups (combined meeting) or one group
- Stored as array in database (scout_groups field on meetings table - to be added)

### Meeting List Display

**Sort Order:**
- Upcoming meetings first (future dates at top)
- Then past meetings (most recent past first)
- Chronological within each section

**Grouping:**
- Grouped by week (e.g., "This Week", "Next Week", "Week of [date]")
- Past meetings grouped by week (e.g., "Last Week", "Week of [date]")
- Week boundaries: Monday to Sunday (or configurable)

**Display Format:**
- Card-based display (not table, not calendar)
- Each meeting as a card

**Card Information:**
- Date (formatted: "Monday, Jan 15, 2025" or similar)
- Location
- Assigned leaders (names and emails, or just names if space is tight)
- Attendance count (e.g., "12 present, 3 absent" or "15/18 attended")
- Scout groups (Group 1, Group 2, or Both)
- Edit button (if user can edit)

**Empty States:**
- "No upcoming meetings" if no future meetings
- "No past meetings" if no past meetings

### Edit Meeting Rules

**Who Can Edit:**
- Only Admin and Admin Leader can edit meetings
- Leaders and Viewers: Read-only (no edit button)

**When Can Meetings Be Edited:**
- **If attendance has been taken:** Editing is BLOCKED (no edits allowed)
- **If no attendance yet:** Can edit all fields
- Check: Query attendance table to see if any records exist for this meeting

**What Can Be Edited:**
- All fields can be edited (date, location, scout groups, notes, assigned leaders)
- **Restriction:** Only if no attendance records exist
- If attendance exists, show message: "Cannot edit meeting - attendance has already been taken"

**Edit UI:**
- Inline edit (convert card to form, similar to scout/leader edit)
- Or modal form (consistent with add form)
- Show warning if attempting to edit meeting with attendance

### Leader Assignment

**Assignment Method:**
- Multi-select dropdown (or checkboxes if simpler)
- Show all active leaders
- Display: Leader name and email (both visible in dropdown)

**Required/Optional:**
- At least one leader must be assigned (required)
- Validation: Show error if no leaders selected

**Display in List:**
- Show leader names and emails on meeting card
- Format: "John Doe (john@example.com), Jane Smith (jane@example.com)"
- Or: "Assigned: John Doe, Jane Smith" with emails on hover/tooltip

**Leader Removal:**
- Leaders can be removed after assignment (if no attendance taken)
- Must always have at least one leader assigned
- Update assigned_leaders array in database

**Leader Selection:**
- Show all active leaders (from leaders table where active = true)
- Filter by scout group? (Only show leaders assigned to meeting's scout groups)
- Decision: Show all leaders (simpler for v1)

### Duplicate Date Prevention

**Duplicate Definition:**
- Same date = duplicate (one meeting per day maximum)
- Date comparison: Compare by date only (ignore time)
- Error message: "A meeting already exists on this date"

**Error Handling:**
- Show error message (inline under date field + error banner)
- Prevent form submission
- Do not allow override
- Suggest: "Please choose a different date"

**Validation:**
- Check on form submit
- Real-time check on date change (optional, but good UX)
- Query meetings table: `SELECT * FROM meetings WHERE date = selected_date`

### Meeting Types

**Decision:**
- Remove type field (always weekly meetings in v1)
- No type dropdown or field in form
- All meetings are treated as weekly meetings
- **Future:** Can add meeting types in v2 if needed (Event, Special Activity, etc.)

### Data Model Updates

**Meetings Table:**
- Current fields: id, date, location, type, assigned_leaders, created_at, updated_at
- **Add:** scout_groups (TEXT[] array, like leaders table)
- **Remove or ignore:** type field (not used in v1)

**Scout Groups on Meetings:**
- Store as TEXT[] array: ['Group 1'] or ['Group 2'] or ['Group 1', 'Group 2']
- Use for filtering and display
- RLS policies may need to consider scout groups

### Permission Enforcement

**Create Meeting:**
- Admin and Admin Leader can create meetings
- Leaders and Viewers: Cannot create (no "Add Meeting" button)

**Edit Meeting:**
- Admin and Admin Leader can edit (if no attendance taken)
- Leaders and Viewers: Read-only

**View Meetings:**
- All authenticated users can view meetings
- RLS policies filter by scout group (if applicable)
- Admin/Admin Leader see all meetings
- Leaders see meetings for their assigned groups
- Viewers see meetings for their assigned group (read-only)

### UI/UX Details

**Add Meeting Form:**
- Modal form (consistent with add scout/leader)
- Date picker (future dates only)
- Location text input
- Scout group checkboxes
- Leader multi-select
- Notes textarea
- Validation and error display

**Meeting Card:**
- Card layout with all information
- Edit button (if user can edit and no attendance taken)
- "Attendance taken" indicator (if attendance exists)
- Click to view details? (Future: expand to show attendance list)

**List View:**
- Week headers: "This Week", "Next Week", "Week of Jan 15, 2025"
- Cards grouped under each week header
- Scrollable list
- Search/filter? (Deferred to v2 if needed)

### Implementation Notes

**Date Handling:**
- Use HTML5 date input or date picker library
- Store as DATE type in database (no time)
- Format for display: "Monday, January 15, 2025" or "Jan 15, 2025"
- Compare dates using date-only comparison (ignore time)

**Week Grouping:**
- Calculate week boundaries (Monday to Sunday)
- Group meetings by week
- Show week label: "This Week", "Next Week", "Week of [Monday date]"
- Past weeks: "Last Week", "Week of [Monday date]"

**Attendance Check:**
- Before allowing edit, query: `SELECT COUNT(*) FROM attendance WHERE meeting_id = ?`
- If count > 0, block editing
- Show message: "Cannot edit - attendance has been taken"

**Leader Assignment:**
- Fetch all active leaders on form load
- Display in multi-select or checkboxes
- Store as UUID[] array in assigned_leaders field
- Validate: At least one leader required

## Out of Scope (Deferred)

- Google Maps integration (v2)
- Meeting types (v2)
- Calendar view (v2)
- Meeting search/filter (v2)
- Recurring meetings (v2)
- Meeting reminders (v2)
- Meeting templates (v2)

## Questions Resolved

- ✅ Required fields: date, location, scout groups (at least one)
- ✅ Optional fields: notes
- ✅ Date validation: future dates only
- ✅ Location: text field (Google Maps deferred)
- ✅ Sort order: upcoming first, grouped by week
- ✅ Display: cards with date, location, leaders, attendance count
- ✅ Edit rules: Admin/Admin Leader only, blocked if attendance taken
- ✅ Leader assignment: multi-select, at least one required
- ✅ Duplicate prevention: same date = duplicate
- ✅ Meeting type: removed (always weekly)

## Open Questions

- **Scout group assignment:** Should meetings have scout_groups field, or use a different approach? (Decision: Add scout_groups TEXT[] array to meetings table)
- **Week boundaries:** Monday-Sunday or Sunday-Saturday? (Decision: Monday-Sunday for now)
- **Leader filtering:** Show all leaders or filter by meeting's scout groups? (Decision: Show all leaders for v1)

---
*Context created: 2025-02-09*  
*Ready for planning Phase 3*

