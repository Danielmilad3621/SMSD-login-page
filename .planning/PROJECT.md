# SMSD Scout Portal

## What This Is

A web portal for Church Scout group leaders to track attendance, manage schedules, and coordinate events. Built as a Progressive Web App (PWA) with Supabase backend.

**Core Value:** Enable leaders to efficiently track attendance at weekly Scout meetings and events, with a reward points system to encourage participation.

## The Problem

Currently, attendance tracking for Scout meetings is manual and disorganized. Leaders need:
- A simple way to mark who attended each meeting
- Visibility into attendance patterns
- A points system to reward consistent participation
- Ability to manage schedules and events
- Different permission levels for different leader roles

## The Solution

A PWA portal where:
- Leaders can quickly take attendance (Present/Absent) for scouts and other leaders
- Attendance data is stored in Supabase and exportable to CSV
- Points are automatically calculated (1 point per meeting + activity points)
- Permission system supports Admin, Admin Leader, Leader, and Viewer roles
- Future: Schedule management, event creation, reminders

## Target Users

**Primary:** Scout group leaders (various permission levels)
- **Admin** (1 person): Full system access
- **Admin Leaders** (2-3 people): Can create events, take attendance
- **Leaders**: Can take attendance
- **Viewers**: Read-only access

**Future:** Scouts/families (self-registration, view their own attendance/points)

## Constraints

- **Technology:** Must use existing Supabase setup (auth, database)
- **Platform:** PWA (mobile-first, works offline)
- **Architecture:** Continue vanilla JS approach (no build tools) OR migrate to framework (decision pending)
- **Timeline:** Focus on attendance system first (v1)
- **Data:** All data stored in Supabase PostgreSQL
- **Authentication:** Existing invite-only Google OAuth system (keep as-is)

## Requirements

### Validated

- ✓ **AUTH-01**: User can sign in with Google OAuth — existing
- ✓ **AUTH-02**: Invite-only access control (server-side allowlist) — existing
- ✓ **AUTH-03**: User session persists across page refreshes — existing
- ✓ **AUTH-04**: User can log out — existing
- ✓ **UI-01**: Mobile-first responsive design — existing
- ✓ **UI-02**: PWA installation support — existing
- ✓ **UI-03**: Offline fallback page — existing

### Active

#### Attendance System (v1 Priority)
- [ ] **ATTEND-01**: Admin/Admin Leader can manually add scouts to the system
- [ ] **ATTEND-02**: Leader can mark scout as Present or Absent for a meeting
- [ ] **ATTEND-03**: Leader can mark other leaders as Present or Absent for a meeting
- [ ] **ATTEND-04**: System calculates reward points (1 point per meeting attendance)
- [ ] **ATTEND-05**: System awards additional activity points during meetings
- [ ] **ATTEND-06**: Points are tracked per scout (cumulative total)
- [ ] **ATTEND-07**: Admin/Admin Leader can view attendance for a specific meeting
- [ ] **ATTEND-08**: Admin/Admin Leader can export meeting attendance to CSV
- [ ] **ATTEND-09**: Attendance data stored in Supabase for reference

#### Permission System (v1)
- [ ] **PERM-01**: System supports role-based access (Admin, Admin Leader, Leader, Viewer)
- [ ] **PERM-02**: User role stored in Supabase (role field/table)
- [ ] **PERM-03**: Admin has full system access
- [ ] **PERM-04**: Admin Leaders (2-3 people) can create events and take attendance
- [ ] **PERM-05**: Leaders can take attendance
- [ ] **PERM-06**: Viewers have read-only access

#### Data Management (v1)
- [ ] **DATA-01**: Scouts table in Supabase (name, email, points, etc.)
- [ ] **DATA-02**: Meetings table in Supabase (date, location, assigned leaders)
- [ ] **DATA-03**: Attendance records table (scout_id, meeting_id, status, points_earned)
- [ ] **DATA-04**: Leaders table/role system in Supabase

### Out of Scope

- **Schedule Management** — Deferred to v2 (weekly recurring meetings, event creation)
- **Event Management** — Deferred to v2 (create/edit/delete events, assign leaders, set locations)
- **Reminders** — Deferred to v2 (send notifications for upcoming meetings/events)
- **Self-Registration** — Deferred to v2 (scouts register themselves)
- **Points Redemption** — Deferred to v2 (points are tracking-only in v1)
- **Family Portal** — Deferred to v2 (scouts/families view their own data)
- **Late/Excused Status** — Deferred to v2 (v1 is Present/Absent only)
- **Activity Point Details** — Deferred to v2 (v1 tracks activity points but not detailed breakdown)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Focus on attendance system first | Core value is tracking attendance; other features can wait | v1 scope limited to attendance |
| Manual scout addition (not self-registration) | Simpler v1, control over who's in system | Leaders add scouts manually |
| Points tracking only (not redeemable) | Simpler v1, focus on attendance | Points calculated and displayed but not used for rewards yet |
| Present/Absent only (no Late/Excused) | Simpler v1, covers 90% of use cases | Two statuses only |
| Role-based permissions | Different leaders need different access | Admin, Admin Leader, Leader, Viewer roles |
| Keep existing login/auth | Already working, no need to rebuild | Continue using invite-only Supabase auth |
| CSV export + Supabase storage | Leaders need reports, data needs persistence | Both export and database storage |

## Technical Context

**Existing Stack:**
- Vanilla HTML/CSS/JavaScript (no build tools)
- Supabase (auth, database)
- PWA with Service Worker
- Vercel hosting

**Architecture Decision Pending:**
- Continue vanilla JS approach (simpler, matches existing code)
- OR migrate to framework (React/Vue) for better organization as app grows

**Database Schema (to be designed):**
- `scouts` table
- `meetings` table
- `attendance` table
- `users` table (extend existing auth.users with role field)
- `points` table or calculated field

## Success Criteria

**v1 Complete When:**
- Leaders can add scouts to the system
- Any leader can take attendance (Present/Absent) for scouts and leaders
- Points are automatically calculated and tracked
- Admin/Admin Leaders can view per-meeting attendance
- Attendance data exports to CSV
- All data persists in Supabase
- Permission system enforces role-based access

---
*Last updated: 2025-02-09 after initialization*

