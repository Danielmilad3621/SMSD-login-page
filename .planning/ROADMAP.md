# Roadmap — SMSD Scout Portal

## Overview
Roadmap for v1 attendance tracking system. Phases organized by dependencies and logical build order.

**Total Phases:** 6  
**Total Requirements:** 48  
**All v1 requirements mapped:** ✓

## Phase 1: Database & Permissions Foundation ✅

**Goal:** Establish database schema and permission system as security foundation

**Status:** Complete (2025-02-09)

**Requirements:**
- ✅ DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07
- ✅ PERM-01, PERM-02, PERM-07

**Success Criteria:**
1. ✅ All database tables created in Supabase (scouts, meetings, attendance, roles, leaders)
2. ✅ RLS policies enforce role-based access (Admin, Admin Leader, Leader, Viewer)
3. ✅ User roles can be assigned and stored in Supabase
4. ✅ Database constraints prevent invalid data (unique attendance, foreign keys)
5. ✅ Permission system tested (users can only access features for their role)

**Dependencies:** None (foundation phase)

**Estimated Complexity:** Medium (database design, RLS policies)

---

## Phase 2: Participant Management

**Goal:** Enable leaders to add and manage scouts and leaders in the system

**Requirements:**
- PART-01, PART-02, PART-03, PART-04, PART-05, PART-06, PART-07, PART-08
- PERM-03, PERM-04 (Admin/Admin Leader permissions)

**Success Criteria:**
1. Admin/Admin Leader can add new scout (name, email)
2. Admin/Admin Leader can edit scout information
3. Admin/Admin Leader can view list of all scouts with total points
4. Admin/Admin Leader can search/filter scouts by name
5. Admin/Admin Leader can add new leader with role assignment
6. Admin/Admin Leader can view list of all leaders
7. System prevents duplicate scouts (same email)
8. UI shows appropriate screens based on user role

**Dependencies:** Phase 1 (database schema, permissions)

**Estimated Complexity:** Low-Medium (CRUD operations, search)

---

## Phase 3: Meeting Management

**Goal:** Enable leaders to create and manage meeting records

**Requirements:**
- MEET-01, MEET-02, MEET-03, MEET-04, MEET-05, MEET-06
- PERM-04 (Admin Leader permissions)

**Success Criteria:**
1. Admin/Admin Leader can create new meeting (date, location)
2. Admin/Admin Leader can edit meeting details (before attendance taken)
3. Admin/Admin Leader can view list of all meetings (chronological)
4. System prevents creating meetings with duplicate dates
5. Admin/Admin Leader can assign leaders to meeting (optional)
6. Meetings display with date, location, assigned leaders

**Dependencies:** Phase 1 (database schema), Phase 2 (leaders exist)

**Estimated Complexity:** Low (CRUD operations)

---

## Phase 4: Attendance Taking

**Goal:** Enable leaders to mark attendance (Present/Absent) for scouts and leaders

**Requirements:**
- ATTEND-01, ATTEND-02, ATTEND-03, ATTEND-04, ATTEND-05, ATTEND-06, ATTEND-07, ATTEND-08, ATTEND-09, ATTEND-10
- PERM-05 (Leader permissions)

**Success Criteria:**
1. Leader can mark scout as Present/Absent for selected meeting
2. Leader can mark other leader as Present/Absent for selected meeting
3. System saves attendance immediately on change (no submit button)
4. System provides clear visual feedback (checkmark/color) for marked attendance
5. System displays all scouts and leaders for selected meeting
6. System prevents duplicate attendance records (one per scout per meeting)
7. System handles errors gracefully (shows message, allows retry)
8. Attendance screen is mobile-friendly (large tap targets, fast loading)
9. Attendance data persists in Supabase
10. System works reliably (no data loss)

**Dependencies:** Phase 1 (database, permissions), Phase 2 (scouts exist), Phase 3 (meetings exist)

**Estimated Complexity:** Medium (core feature, mobile UX, error handling)

---

## Phase 5: Points System

**Goal:** Automatically calculate and track reward points for attendance

**Requirements:**
- POINT-01, POINT-02, POINT-03, POINT-04, POINT-05, POINT-06, POINT-07, POINT-08

**Success Criteria:**
1. System automatically awards 1 point when scout marked Present
2. System automatically awards 1 point when leader marked Present
3. Admin/Admin Leader can award additional activity points during meeting
4. System calculates total points per scout (meeting + activity points)
5. System tracks points cumulatively (total increases over time)
6. System displays scout's total points in participant list
7. System recalculates points when attendance status changes
8. Points are displayed but not redeemable (tracking-only)

**Dependencies:** Phase 4 (attendance taking)

**Estimated Complexity:** Low-Medium (calculation logic, UI updates)

---

## Phase 6: Reporting & Export

**Goal:** Enable leaders to view and export attendance data

**Requirements:**
- REPORT-01, REPORT-02, REPORT-03, REPORT-04, REPORT-05, REPORT-06, REPORT-07, REPORT-08, REPORT-09
- PERM-03, PERM-04 (Admin/Admin Leader permissions)

**Success Criteria:**
1. Admin/Admin Leader can view attendance for specific meeting
2. System displays who was Present for selected meeting
3. System displays who was Absent for selected meeting
4. System displays points earned per person for selected meeting
5. Admin/Admin Leader can export meeting attendance to CSV
6. CSV export includes participant name, status, points earned
7. CSV export uses UTF-8 encoding with BOM (Excel compatible)
8. CSV export includes column headers
9. CSV file downloads successfully and opens in Excel
10. All attendance data stored in Supabase for future reference

**Dependencies:** Phase 4 (attendance data), Phase 5 (points data)

**Estimated Complexity:** Low (data display, CSV generation)

---

## Phase Summary

| Phase | Name | Requirements | Success Criteria | Complexity |
|-------|------|--------------|------------------|------------|
| 1 | Database & Permissions | 10 | 5 | Medium |
| 2 | Participant Management | 10 | 8 | Low-Medium |
| 3 | Meeting Management | 6 | 6 | Low |
| 4 | Attendance Taking | 10 | 10 | Medium |
| 5 | Points System | 8 | 8 | Low-Medium |
| 6 | Reporting & Export | 9 | 10 | Low |
| **Total** | **6 phases** | **48** | **47** | — |

## Build Order Rationale

1. **Phase 1 (Foundation):** Must come first — database and permissions are prerequisites
2. **Phase 2 (Participants):** Need scouts/leaders before taking attendance
3. **Phase 3 (Meetings):** Need meetings before taking attendance
4. **Phase 4 (Attendance):** Core feature — depends on phases 1-3
5. **Phase 5 (Points):** Calculated from attendance — depends on phase 4
6. **Phase 6 (Reporting):** Uses attendance and points data — depends on phases 4-5

## Coverage Verification

**All 48 v1 requirements mapped:**
- ✅ Permission System: 8/8 requirements (Phases 1, 2, 6)
- ✅ Participant Management: 8/8 requirements (Phase 2)
- ✅ Meeting Management: 6/6 requirements (Phase 3)
- ✅ Attendance Taking: 10/10 requirements (Phase 4)
- ✅ Points System: 8/8 requirements (Phase 5)
- ✅ Reporting & Export: 9/9 requirements (Phase 6)
- ✅ Data Management: 7/7 requirements (Phase 1)

## Next Steps

1. **Phase 1 Planning:** `/gsd-plan-phase 1` — Create detailed plan for database & permissions
2. **Phase 1 Execution:** `/gsd-execute-phase 1` — Build foundation
3. **Continue sequentially** through phases 2-6

---
*Roadmap created: 2025-02-09*  
*All v1 requirements mapped to phases ✓*

