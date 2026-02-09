# Requirements — SMSD Scout Portal

## Overview
Requirements for v1 attendance tracking system. All requirements are user-centric, specific, testable, and atomic.

## v1 Requirements

### Permission System

- [x] **PERM-01**: System supports four role types: Admin, Admin Leader, Leader, Viewer — Phase 1
- [x] **PERM-02**: User role stored in Supabase (extend auth.users table or separate roles table) — Phase 1
- [x] **PERM-03**: Admin has full system access (all features) — Phase 2
- [x] **PERM-04**: Admin Leaders (2-3 people) can create meetings and take attendance — Phase 2
- [ ] **PERM-05**: Leaders can take attendance for scouts and other leaders
- [ ] **PERM-06**: Viewers have read-only access (can view but not edit)
- [x] **PERM-07**: Permission checks enforced server-side via Supabase RLS policies — Phase 1
- [x] **PERM-08**: UI hides features user doesn't have permission to access — Phase 2

### Participant Management

- [x] **PART-01**: Admin/Admin Leader can add new scout to system (name, email required) — Phase 2
- [x] **PART-02**: Admin/Admin Leader can edit scout information (name, email) — Phase 2
- [x] **PART-03**: Admin/Admin Leader can view list of all scouts — Phase 2
- [x] **PART-04**: Admin/Admin Leader can search/filter scouts by name — Phase 2
- [x] **PART-05**: System displays scout's total points alongside name in lists — Phase 2
- [x] **PART-06**: Admin/Admin Leader can add new leader to system (name, email, role) — Phase 2
- [x] **PART-07**: Admin/Admin Leader can view list of all leaders — Phase 2
- [x] **PART-08**: System prevents duplicate scouts (same email) — Phase 2

### Meeting Management

- [ ] **MEET-01**: Admin/Admin Leader can create new meeting (date, location required)
- [ ] **MEET-02**: Admin/Admin Leader can edit meeting details (before attendance taken)
- [ ] **MEET-03**: Admin/Admin Leader can view list of all meetings (past and future)
- [ ] **MEET-04**: System displays meetings in chronological order (newest first)
- [ ] **MEET-05**: System prevents creating meetings with duplicate dates
- [ ] **MEET-06**: Admin/Admin Leader can assign leaders to meeting (optional)

### Attendance Taking

- [ ] **ATTEND-01**: Leader can mark scout as Present for a meeting
- [ ] **ATTEND-02**: Leader can mark scout as Absent for a meeting
- [ ] **ATTEND-03**: Leader can mark other leader as Present for a meeting
- [ ] **ATTEND-04**: Leader can mark other leader as Absent for a meeting
- [ ] **ATTEND-05**: System saves attendance immediately on change (no submit button)
- [ ] **ATTEND-06**: System provides visual feedback (checkmark/color) for marked attendance
- [ ] **ATTEND-07**: System displays all scouts for selected meeting in attendance screen
- [ ] **ATTEND-08**: System displays all leaders for selected meeting in attendance screen
- [ ] **ATTEND-09**: System prevents duplicate attendance records (one record per scout per meeting)
- [ ] **ATTEND-10**: System handles errors gracefully (shows message, allows retry)

### Points System

- [ ] **POINT-01**: System automatically awards 1 point when scout marked Present
- [ ] **POINT-02**: System automatically awards 1 point when leader marked Present
- [ ] **POINT-03**: Admin/Admin Leader can award additional activity points during meeting
- [ ] **POINT-04**: System calculates total points per scout (meeting points + activity points)
- [ ] **POINT-05**: System tracks points cumulatively (total increases over time)
- [ ] **POINT-06**: System displays scout's total points in participant list
- [ ] **POINT-07**: System recalculates points when attendance status changes
- [ ] **POINT-08**: Points are tracking-only (not redeemable in v1)

### Reporting & Export

- [ ] **REPORT-01**: Admin/Admin Leader can view attendance for specific meeting
- [ ] **REPORT-02**: System displays who was Present for selected meeting
- [ ] **REPORT-03**: System displays who was Absent for selected meeting
- [ ] **REPORT-04**: System displays points earned per person for selected meeting
- [ ] **REPORT-05**: Admin/Admin Leader can export meeting attendance to CSV
- [ ] **REPORT-06**: CSV export includes participant name, status (Present/Absent), points earned
- [ ] **REPORT-07**: CSV export uses UTF-8 encoding with BOM (Excel compatible)
- [ ] **REPORT-08**: CSV export includes column headers
- [ ] **REPORT-09**: All attendance data stored in Supabase for future reference

### Data Management

- [x] **DATA-01**: Scouts table in Supabase (id, name, email, points_total, created_at, updated_at) — Phase 1
- [x] **DATA-02**: Meetings table in Supabase (id, date, location, type, assigned_leaders, created_at, updated_at) — Phase 1
- [x] **DATA-03**: Attendance table in Supabase (id, scout_id, meeting_id, status, points_earned, recorded_by, recorded_at) — Phase 1
- [x] **DATA-04**: Roles table or field in Supabase (user_id, role) — Phase 1
- [x] **DATA-05**: Database enforces unique constraint on (scout_id, meeting_id) in attendance table — Phase 1
- [x] **DATA-06**: Database uses foreign keys with appropriate CASCADE rules — Phase 1
- [x] **DATA-07**: All tables have created_at and updated_at timestamps — Phase 1

## v2 Requirements (Deferred)

### Schedule Management
- [ ] Weekly recurring meeting templates
- [ ] Event creation (hiking, camping, etc.)
- [ ] Event scheduling with dates/times
- [ ] Location management

### Enhanced Features
- [ ] Self-registration for scouts
- [ ] Points leaderboard
- [ ] Advanced reporting (trends, analytics)
- [ ] Offline sync (IndexedDB + queue)
- [ ] Real-time updates (multi-user collaboration)
- [ ] Meeting reminders/notifications

### Additional Status Types
- [ ] Late arrival status
- [ ] Excused absence status
- [ ] Partial attendance

## Out of Scope

- **Payment Processing** — Dues collection, payment tracking (different domain)
- **Communication Features** — Messaging, notifications (separate concern)
- **Calendar Integration** — Google Calendar sync, iCal export (nice-to-have)
- **Points Redemption** — Using points for rewards (v2+ consideration)
- **Family Portal** — Scouts/families viewing their own data (v2+)

## Requirement Traceability

| REQ-ID | Category | Phase | Status |
|--------|----------|-------|--------|
| DATA-01 to DATA-07 | Data Management | Phase 1 | Pending |
| PERM-01, PERM-02, PERM-07 | Permission System | Phase 1 | Pending |
| PERM-03, PERM-04, PERM-08 | Permission System | Phase 2 | Pending |
| PART-01 to PART-08 | Participant Management | Phase 2 | Pending |
| MEET-01 to MEET-06 | Meeting Management | Phase 3 | Pending |
| ATTEND-01 to ATTEND-10 | Attendance Taking | Phase 4 | Pending |
| PERM-05 | Permission System | Phase 4 | Pending |
| POINT-01 to POINT-08 | Points System | Phase 5 | Pending |
| REPORT-01 to REPORT-09 | Reporting & Export | Phase 6 | Pending |
| PERM-03, PERM-04 | Permission System | Phase 6 | Pending |

**All 48 requirements mapped to phases ✓**

## Requirement Quality

All requirements follow these principles:
- **User-centric:** "User can X" not "System does Y"
- **Specific and testable:** Clear acceptance criteria
- **Atomic:** One capability per requirement
- **Independent:** Minimal dependencies

## Notes

- **Total v1 Requirements:** 48 requirements across 7 categories
- **Focus:** Attendance tracking with basic management and reporting
- **Success Metric:** Leaders can reliably take attendance and export data
- **Timeline:** Quick depth (3-5 phases, 1-3 plans each)

---
*Last updated: 2025-02-09 after requirements definition*

