# Phase 5 Context — Points System

## Phase Overview
**Goal:** Verify, complete, and refine the points system to ensure all requirements are met

**Scope:** Points calculation verification, display consistency, edge case handling, data integrity

## Current Status

### Already Implemented (Phase 4)

✅ **POINT-01**: System automatically awards 1 point when scout marked Present
- Implemented in `saveAttendance()` function
- Base points: 1 if Present, 0 if Absent

✅ **POINT-03**: Admin/Admin Leader can award additional activity points during meeting
- Activity points input field in attendance screen
- Auto-saves on blur/Enter

✅ **POINT-04**: System calculates total points per scout (meeting points + activity points)
- Formula: `points_earned = (Present ? 1 : 0) + activity_points`
- Stored in `attendance.points_earned`

✅ **POINT-05**: System tracks points cumulatively (total increases over time)
- `scouts.points_total` updated immediately
- Handles updates correctly (calculates difference)

✅ **POINT-06**: System displays scout's total points in participant list
- Points shown in scouts list (Phase 2)

✅ **POINT-07**: System recalculates points when attendance status changes
- Calculates difference when updating existing attendance
- Handles Present → Absent (subtracts points)

✅ **POINT-08**: Points are tracking-only (not redeemable in v1)
- No redemption functionality (as designed)

### Needs Verification/Completion

⚠️ **POINT-02**: System automatically awards 1 point when leader marked Present
- Leader attendance is UI-only in v1 (not persisted)
- Need to decide: Should we track leader points in UI only, or skip this requirement?

## Key Decisions Needed

### 1. Leader Points Tracking

**Question:** Should we track leader points even though leader attendance isn't persisted?

**Options:**
- **Option A**: Track leader points in UI only (localStorage or in-memory)
  - Pros: Meets requirement, shows points in UI
  - Cons: Not persisted, lost on refresh
  
- **Option B**: Skip leader points for v1 (defer to v2 when leader attendance is persisted)
  - Pros: Consistent with leader attendance limitation
  - Cons: Doesn't fully meet POINT-02 requirement

**Decision:** Option B - Skip leader points for v1, note as limitation

### 2. Points Recalculation/Audit

**Question:** Should we add functionality to recalculate points if data gets out of sync?

**Options:**
- **Option A**: Add admin function to recalculate all points from attendance records
  - Pros: Data integrity, can fix issues
  - Cons: Additional complexity, might not be needed
  
- **Option B**: Trust the system (points update correctly on each save)
  - Pros: Simpler, less code
  - Cons: No way to fix if data gets corrupted

**Decision:** Option A - Add simple recalculation function for data integrity

### 3. Points Display Enhancement

**Question:** Should we enhance points display beyond what's already shown?

**Current:**
- Points shown in scouts list
- Points shown in attendance screen (activity points input)

**Options:**
- **Option A**: Add points summary/leaderboard view
  - Pros: Better visibility, motivation
  - Cons: Not in v1 requirements
  
- **Option B**: Keep current display (points in lists)
  - Pros: Meets requirements, simpler
  - Cons: Less visibility

**Decision:** Option B - Keep current display, points summary is v2

### 4. Edge Cases

**Edge Cases to Handle:**
- What if attendance record is deleted? (Points should be recalculated)
- What if scout is deleted? (Points should be handled via CASCADE)
- What if points_total becomes negative? (Already handled: Math.max(0, ...))
- What if multiple attendance records exist for same scout/meeting? (Prevented by unique constraint)

**Decision:** Add validation and handle edge cases

## Implementation Plan

### Task 1: Verify Points Requirements
- Review all POINT-* requirements
- Test each requirement
- Document any gaps or limitations

### Task 2: Points Recalculation Function
- Add admin function to recalculate points_total from attendance records
- Sum all points_earned for each scout
- Update scouts.points_total
- Add UI button (Admin only)

### Task 3: Points Display Verification
- Verify points display in scouts list
- Verify points display in attendance screen
- Ensure points update correctly in UI after save

### Task 4: Edge Case Handling
- Handle negative points (already done)
- Add validation for points calculations
- Document edge cases

### Task 5: Leader Points Limitation
- Document that leader points are not tracked in v1
- Note in UI if needed
- Update requirements status

## Out of Scope (Deferred)

- Points leaderboard (v2)
- Points history/audit log (v2)
- Points redemption (v2+)
- Leader points tracking (v2, when leader attendance is persisted)

## Questions Resolved

- ✅ Leader points: Not tracked in v1 (consistent with leader attendance limitation)
- ✅ Points recalculation: Add admin function for data integrity
- ✅ Points display: Keep current (meets requirements)
- ✅ Edge cases: Handle validation and negative points

## Open Questions

None - all decisions made.

---
*Context created: 2025-02-09*  
*Ready for planning Phase 5*

