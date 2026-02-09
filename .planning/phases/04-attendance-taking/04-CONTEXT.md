# Phase 4 Context — Attendance Taking

## Phase Overview
**Goal:** Enable leaders to mark attendance (Present/Absent) for scouts and leaders

**Scope:** Attendance marking UI, auto-save, points calculation, error handling

## Key Decisions

### Meeting Selection

**Selection Method:**
- Calendar view with list below
- Calendar shows meetings (clickable dates)
- List below shows meetings for selected date or all upcoming meetings
- Leaders can select meeting from either calendar or list

**Meeting Eligibility:**
- Only present (current) and future meetings
- Past meetings: Cannot take attendance (read-only view if needed)
- Date validation: Meeting date must be today or in the future

**Edit After Save:**
- Attendance cannot be edited after it's been saved
- Once marked, it's final (no edit button, no changes allowed)
- This prevents data inconsistencies

### Attendance Screen Layout

**Display Structure:**
- Separate sections for scouts and leaders
- Scouts section first, then leaders section
- Each section has a header ("Scouts", "Leaders")

**Display Format:**
- List format (not cards, not table)
- Each row: Name, Present checkbox, Absent checkbox (or toggle)
- Grouped by scout group (if meeting has multiple groups)

**Filtering:**
- Show only scouts/leaders in the meeting's scout groups
- If meeting is for "Group 1", show only Group 1 scouts/leaders
- If meeting is for both groups, show all scouts/leaders from both groups
- Filter based on meeting's scout_groups field

**List Order:**
- Alphabetical by name within each scout group
- Scouts grouped by scout_group
- Leaders grouped by scout_group (if applicable)

### Marking Attendance

**Interaction Method:**
- Single toggle/switch (Present ↔ Absent)
- Default state: Unmarked (neither Present nor Absent)
- Three states: Unmarked, Present, Absent
- Toggle between Present and Absent (clicking Present when already Present = Absent, and vice versa)

**Alternative (if toggle is complex):**
- Two checkboxes: "Present" and "Absent" (mutually exclusive)
- Checking Present unchecks Absent, and vice versa
- Both unchecked = unmarked

**Auto-Save:**
- Save immediately on change (no submit button)
- Each toggle/checkbox change triggers API call
- No batch saving - individual saves per person

**Default State:**
- All attendees start as unmarked
- Leader must explicitly mark each person
- No assumptions about attendance

### Visual Feedback

**Present vs Absent Indication:**
- Checkmarks for visual feedback
- Present: Green checkmark (✓) or colored indicator
- Absent: Red X (✗) or different colored indicator
- Unmarked: No indicator (or gray/neutral state)

**Loading State:**
- Show loading spinner/indicator while saving
- Per-row loading state (not full page)
- Disable toggle/checkbox while saving

**Success Confirmation:**
- Inline message (not toast)
- Show "Saved" or checkmark next to the person's name
- Fade out after 2-3 seconds
- Per-row success feedback

**Error Feedback:**
- Inline error message if save fails
- Show "Failed to save" or error icon
- Allow retry (retry button or click to retry)

### Points Calculation

**Calculation Timing:**
- Calculate and update immediately as each attendance is marked
- When Present is marked: Add 1 point to scout's points_total
- When Absent is marked: No points added
- Update points_total in scouts table immediately

**Activity Points:**
- Add input field next to each scout/leader for activity points
- Number input (integer, 0 or positive)
- Optional field (can be 0 or empty)
- Save activity points along with attendance record
- Update points_total: 1 point (attendance) + activity points

**Points Update Flow:**
1. Mark attendance (Present/Absent)
2. Enter activity points (if any)
3. Save attendance record (with points_earned = 1 + activity_points)
4. Update scout's points_total immediately
5. Show success feedback

**Points Calculation:**
- Base attendance: 1 point if Present, 0 if Absent
- Activity points: Additional points entered by leader
- Total points_earned = (Present ? 1 : 0) + activity_points
- Update points_total = points_total + points_earned

### Error Handling

**Save Failure:**
- Show error message inline
- Allow retry (retry button or click to retry)
- Keep the toggle/checkbox in the attempted state
- Don't lose user's input

**Retry Mechanism:**
- Retry button next to error message
- Or click the toggle/checkbox again to retry
- Show loading state during retry
- Clear error on successful retry

**Offline Handling:**
- Show error if offline
- Don't queue for later (show error immediately)
- User can retry when connection is restored
- Clear error message when connection restored

**Error Display:**
- Inline error message below the person's name
- Or error icon next to the toggle
- Red color for errors
- Dismissible or auto-clear on success

### Mobile UX

**Mobile Considerations:**
- Large tap targets (toggle/checkbox should be easy to tap)
- Fast loading (optimize queries, show loading states)
- Responsive layout (list works well on mobile)
- No specific swipe actions or gestures
- Standard mobile interactions

**Touch Targets:**
- Toggle/checkbox: Minimum 44x44px (iOS guideline)
- Input fields: Large enough for easy typing
- Buttons: Standard button size

### Attendance Screen Structure

**Screen Layout:**
1. Meeting selector (calendar + list)
2. Selected meeting info (date, location, groups)
3. Scouts section
   - Header: "Scouts"
   - List of scouts (name, Present/Absent toggle, activity points input)
4. Leaders section
   - Header: "Leaders"
   - List of leaders (name, Present/Absent toggle, activity points input)
5. Save status indicator (if needed)

**Meeting Info Display:**
- Show meeting date (formatted)
- Show meeting location
- Show scout groups
- Show assigned leaders
- Read-only information at top of screen

**Attendee List Item:**
- Name (scout or leader name)
- Present/Absent toggle (or checkboxes)
- Activity points input (number field, optional)
- Loading indicator (while saving)
- Success/error feedback (inline)

### Data Flow

**Marking Attendance:**
1. Leader selects meeting (from calendar or list)
2. System loads scouts and leaders for that meeting (filtered by scout groups)
3. Leader toggles Present/Absent for a person
4. System immediately saves to attendance table
5. System updates points_total (if Present)
6. System shows success feedback
7. Repeat for each person

**Activity Points:**
1. Leader enters activity points in input field
2. On blur or Enter key, save activity points
3. Update attendance record with points_earned
4. Update scout's points_total
5. Show success feedback

**Points Update:**
- When Present marked: points_earned = 1 + activity_points
- Update attendance record: INSERT or UPDATE with points_earned
- Update scout: UPDATE scouts SET points_total = points_total + points_earned
- Handle race conditions (use database transactions if possible)

### Permission Enforcement

**Who Can Take Attendance:**
- Admin: Can take attendance for any meeting
- Admin Leader: Can take attendance for any meeting
- Leader: Can take attendance for meetings in their assigned groups
- Viewer: Cannot take attendance (read-only)

**RLS Enforcement:**
- Database-level permissions already enforced (Phase 1)
- UI hides attendance controls for Viewers
- Leaders see only meetings for their groups

### Implementation Notes

**Attendance Record:**
- INSERT if doesn't exist, UPDATE if exists
- Use UPSERT pattern: INSERT ... ON CONFLICT (scout_id, meeting_id) DO UPDATE
- Store: scout_id, meeting_id, status, points_earned, recorded_by, recorded_at
- Unique constraint prevents duplicates

**Points Update:**
- Use SQL: UPDATE scouts SET points_total = points_total + ? WHERE id = ?
- Atomic operation (prevents race conditions)
- Calculate points_earned before updating

**Activity Points:**
- Store in attendance.points_earned field
- Separate from base attendance point
- Can be 0 (no activity points)
- Integer field (no decimals)

**Loading States:**
- Per-row loading indicator
- Disable toggle while saving
- Show spinner or "Saving..." text

**Error States:**
- Per-row error message
- Retry button or click to retry
- Clear error on success

## Out of Scope (Deferred)

- Editing attendance after save (v2)
- Bulk attendance marking (mark all present/absent)
- Attendance templates (pre-fill common patterns)
- Offline queue (v2)
- Attendance history view (separate screen)
- Attendance analytics (v2)

## Questions Resolved

- ✅ Meeting selection: Calendar view with list below
- ✅ Meeting eligibility: Present and future only
- ✅ Edit after save: No editing allowed
- ✅ Display: Separate sections, list format
- ✅ Filtering: Only meeting's scout groups
- ✅ Interaction: Toggle/switch (Present ↔ Absent)
- ✅ Default state: Unmarked
- ✅ Auto-save: Immediate save on change
- ✅ Visual feedback: Checkmarks, loading, inline messages
- ✅ Points: Calculate and update immediately
- ✅ Activity points: Input field per person
- ✅ Error handling: Retry on failure, show error if offline
- ✅ Mobile: Large tap targets, fast loading

## Open Questions

- **Toggle vs Checkboxes:** Single toggle (Present ↔ Absent) or two checkboxes (mutually exclusive)? (Decision: Single toggle for cleaner UX)
- **Activity points for leaders:** Do leaders get activity points, or only scouts? (Decision: Only scouts get activity points, leaders don't have points_total)
- **Meeting date validation:** Can attendance be taken for today's meeting, or only future? (Decision: Today and future - "present" means today or later)

---
*Context created: 2025-02-09*  
*Ready for planning Phase 4*

