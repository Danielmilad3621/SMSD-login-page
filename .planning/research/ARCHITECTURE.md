# Architecture Research — Attendance Tracking System

## Research Question
How should attendance tracking integrate with existing PWA architecture? What are major components and data flow?

## Context
**Existing System:** Vanilla JS PWA with Supabase auth
**New Features:** Attendance tracking, participant management, points system
**Integration Point:** Extend existing app, not rebuild

## Component Architecture

### High-Level Components

```
┌─────────────────────────────────────────┐
│         Browser (PWA Client)            │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐           │
│  │   Auth   │  │   UI     │           │
│  │  Screen  │  │ Screens  │           │
│  └────┬─────┘  └────┬─────┘           │
│       │             │                  │
│  ┌────▼─────────────▼─────┐           │
│  │   State Management      │           │
│  │   (Vanilla JS Object)   │           │
│  └────┬────────────────────┘           │
│       │                                  │
│  ┌────▼─────────────┐                  │
│  │  Supabase Client │                  │
│  │  (API Layer)     │                  │
│  └────┬─────────────┘                  │
└───────┼─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│      Supabase (Backend)                 │
├─────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐            │
│  │   Auth   │  │ Database │            │
│  │ (Google) │  │(Postgres)│            │
│  └──────────┘  └──────────┘            │
│       │             │                   │
│       └─────┬───────┘                   │
│             │                           │
│      ┌──────▼──────┐                    │
│      │  RLS Policies│                   │
│      │ (Permissions)│                   │
│      └─────────────┘                    │
└─────────────────────────────────────────┘
```

### Component Boundaries

#### 1. UI Layer (Screens)
**Location:** `index.html` + `app.js` + `styles.css`

**Components:**
- Login screen (existing)
- Dashboard screen (new)
- Participants screen (new)
- Meetings screen (new)
- Attendance screen (new)
- Reports screen (new)

**Responsibilities:**
- Display data
- Capture user input
- Handle user interactions
- Screen transitions

**Communication:**
- Reads from state object
- Calls API functions
- Updates state on user actions

#### 2. State Management Layer
**Location:** `app.js` (state object)

**Components:**
```javascript
const state = {
  user: null,              // Current user + role
  scouts: [],              // All scouts
  leaders: [],             // All leaders
  meetings: [],             // All meetings
  currentMeeting: null,     // Meeting being viewed
  attendance: {},           // Attendance records (keyed by meeting_id)
  loading: false,          // Loading state
  error: null              // Error state
};
```

**Responsibilities:**
- Hold application state
- Single source of truth
- Trigger UI updates on change

**Communication:**
- Updated by API functions
- Read by UI rendering functions

#### 3. API Layer
**Location:** `app.js` (API functions)

**Components:**
- `fetchScouts()` — Get all scouts
- `createScout()` — Add new scout
- `fetchMeetings()` — Get all meetings
- `createMeeting()` — Add new meeting
- `takeAttendance()` — Record attendance
- `exportCSV()` — Generate CSV

**Responsibilities:**
- Communicate with Supabase
- Handle errors
- Update state
- Transform data

**Communication:**
- Calls Supabase client
- Updates state object
- Returns promises

#### 4. Database Layer
**Location:** Supabase PostgreSQL

**Tables:**
- `scouts` — Participant data
- `meetings` — Meeting records
- `attendance` — Attendance records
- `auth.users` — Extended with role

**Responsibilities:**
- Store data persistently
- Enforce RLS policies
- Maintain data integrity

**Communication:**
- Accessed via Supabase client
- Protected by RLS policies

## Data Flow Patterns

### 1. Taking Attendance Flow

```
User Action (tap Present/Absent)
  ↓
UI Handler (updateAttendance())
  ↓
API Function (takeAttendance())
  ↓
Supabase Insert (attendance table)
  ↓
RLS Policy Check (permission)
  ↓
Database Insert
  ↓
State Update (local state)
  ↓
UI Update (visual feedback)
```

### 2. Loading Participants Flow

```
App Initialization
  ↓
API Function (fetchScouts())
  ↓
Supabase Query (scouts table)
  ↓
RLS Policy Check (can read scouts?)
  ↓
Database Query
  ↓
State Update (state.scouts = data)
  ↓
UI Render (display scout list)
```

### 3. Creating Meeting Flow

```
User Action (create meeting form)
  ↓
UI Handler (handleCreateMeeting())
  ↓
API Function (createMeeting())
  ↓
Supabase Insert (meetings table)
  ↓
RLS Policy Check (Admin/Admin Leader only)
  ↓
Database Insert
  ↓
State Update (add to state.meetings)
  ↓
UI Update (show new meeting)
```

### 4. Export CSV Flow

```
User Action (click Export)
  ↓
UI Handler (handleExport())
  ↓
API Function (exportCSV())
  ↓
Read State (state.attendance, state.scouts)
  ↓
Transform Data (format as CSV)
  ↓
Create Blob (browser API)
  ↓
Trigger Download (browser API)
```

## Integration with Existing System

### Screen-Based Navigation (Keep)
**Existing Pattern:** CSS class toggling for screen visibility
**Extension:** Add new screens using same pattern

```javascript
// Existing
screens = { splash, login, loggedIn }
// New
screens = { splash, login, dashboard, participants, meetings, attendance, reports }
```

### Authentication (Extend)
**Existing:** Google OAuth → Supabase auth → Welcome screen
**Extension:** After auth, check user role → route to appropriate screen

```javascript
// Existing
if (invited) { showLoggedIn(email); }
// New
if (invited) {
  const role = await getUserRole();
  if (role === 'Admin' || role === 'Admin Leader') {
    showDashboard();
  } else {
    showAttendance(); // Leaders/Viewers
  }
}
```

### State Management (Extend)
**Existing:** Simple variables (currentScreen, user session)
**Extension:** Add state object for attendance data

```javascript
// Existing
let currentScreen = 'splash';
// New
const state = { /* attendance data */ };
```

## Build Order (Dependencies)

### Phase 1: Foundation
1. **Database Schema** — Create tables, RLS policies
2. **Permission System** — Role checking, RLS enforcement
3. **State Management** — State object, update functions

### Phase 2: Core Features
4. **Participant Management** — Add/edit scouts
5. **Meeting Management** — Create/edit meetings
6. **Attendance Taking** — Mark Present/Absent

### Phase 3: Enhancement
7. **Points System** — Calculate and track points
8. **Reporting** — View attendance, export CSV

## Component Communication Patterns

### Unidirectional Data Flow
```
User Action → API Function → Supabase → State Update → UI Render
```

**Why:** Predictable, easier to debug, no circular dependencies

### Event-Driven Updates
```javascript
// When attendance taken
takeAttendance(scoutId, meetingId, status)
  .then(() => {
    updateState();
    renderAttendanceScreen();
  });
```

**Why:** Async operations need callbacks, UI updates after data changes

### State as Single Source of Truth
```javascript
// Don't query Supabase directly in UI
// Always go through state
function renderScouts() {
  state.scouts.forEach(scout => {
    // render scout
  });
}
```

**Why:** Consistent data, easier to add caching/offline support

## Scalability Considerations

### Current Architecture (v1)
- **Monolithic:** All code in app.js
- **Simple:** Easy to understand, quick to build
- **Limitation:** Hard to scale beyond ~1000 lines

### Future Architecture (v2+)
- **Modular:** Split into files (auth.js, attendance.js, etc.)
- **Framework:** Consider React/Vue for component system
- **State Library:** Add state management if complexity grows

### Migration Path
1. **v1:** Keep monolithic, ship fast
2. **v2:** Split into modules (still vanilla JS)
3. **v3:** Migrate to framework if needed

## Performance Patterns

### Data Loading
- **Lazy Load:** Load scouts/meetings on demand
- **Cache:** Store in state, don't re-fetch unnecessarily
- **Pagination:** If >100 items, paginate (v2)

### UI Updates
- **Debounce:** Don't update UI on every keystroke
- **Batch:** Update multiple UI elements in one render cycle
- **Optimistic:** Update UI immediately, sync with server async

### Offline Support (v2)
- **IndexedDB:** Store attendance locally when offline
- **Sync Queue:** Queue writes, sync when online
- **Conflict Resolution:** Last-write-wins (simple for v1)

## Security Architecture

### Client-Side (UI)
- **Input Validation:** Check data before sending
- **Permission Checks:** Hide UI elements based on role
- **Not Trusted:** Client-side checks can be bypassed

### Server-Side (Supabase RLS)
- **RLS Policies:** Enforce permissions at database level
- **Role Checking:** Verify user role before allowing actions
- **Data Filtering:** Users only see data they're allowed to see

### Authentication Flow
```
User → Google OAuth → Supabase Auth → JWT Token → API Calls → RLS Check → Data
```

**Security Layers:**
1. Google OAuth (identity)
2. Supabase Auth (session)
3. RLS Policies (permissions)
4. Database Constraints (data integrity)

## Recommendations

### v1 Architecture
- **Keep it simple:** Monolithic app.js, state object
- **Follow existing patterns:** Screen-based navigation, Supabase client
- **Focus on core:** Attendance taking, basic management

### v2 Architecture
- **Modularize:** Split into logical files
- **Add offline:** IndexedDB + sync
- **Optimize:** Lazy loading, pagination

### v3 Architecture (if needed)
- **Framework migration:** React/Vue for better organization
- **State library:** Redux/Zustand if state becomes complex
- **Build system:** Vite for faster development

## Confidence Levels

- **High (90%+):** Component boundaries, data flow, integration points
- **Medium (70-90%):** Build order, performance patterns
- **Low (<70%):** v2+ architecture (depends on v1 success)

