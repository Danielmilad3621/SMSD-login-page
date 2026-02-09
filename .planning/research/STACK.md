# Stack Research — Attendance Tracking System

## Research Question
What's the standard 2025 stack for adding attendance tracking to an existing PWA with Supabase?

## Context
**Milestone Type:** Subsequent (adding features to existing app)
**Existing Stack:** Vanilla HTML/CSS/JS, Supabase (auth + database), PWA, Vercel hosting
**Target:** Attendance tracking system with role-based permissions

## Recommended Stack

### Database Layer (Supabase PostgreSQL)
**Confidence: High**

**Core Tables:**
- `scouts` — Scout profiles (name, email, points_total, created_at)
- `meetings` — Meeting records (date, location, type, assigned_leaders)
- `attendance` — Attendance records (scout_id, meeting_id, status, points_earned, recorded_by, recorded_at)
- `users` — Extend Supabase auth.users with `role` field (Admin, Admin Leader, Leader, Viewer)

**Why:**
- Supabase already in use, no new dependencies
- PostgreSQL handles relational data well
- Row Level Security (RLS) for permission enforcement
- Real-time subscriptions possible for future features

**Schema Patterns:**
- Use UUIDs for all primary keys (Supabase default)
- Foreign keys with CASCADE deletes where appropriate
- Timestamps (created_at, updated_at) on all tables
- Indexes on frequently queried fields (scout_id, meeting_id, date)

### Frontend Framework Decision
**Confidence: Medium**

**Option 1: Continue Vanilla JS**
- **Pros:** Matches existing code, no build step, simpler deployment
- **Cons:** Harder to scale, no component reusability, manual state management
- **Recommendation:** Use for v1 (quick delivery), migrate later if complexity grows

**Option 2: Migrate to Framework (React/Vue)**
- **Pros:** Better organization, component system, state management libraries
- **Cons:** Build step required, larger bundle, learning curve
- **Recommendation:** Consider for v2 if adding many features

**Decision:** Start vanilla, evaluate after v1

### State Management
**Confidence: High**

**For Vanilla JS:**
- Simple object-based state (no library needed)
- Local storage for offline support
- Supabase real-time for multi-user sync (future)

**Pattern:**
```javascript
const state = {
  currentMeeting: null,
  scouts: [],
  attendance: {},
  user: null
};
```

### UI Libraries
**Confidence: Medium**

**Keep Existing:**
- No UI framework needed (vanilla CSS works)
- CSS Custom Properties already in use
- Mobile-first responsive design pattern

**Consider Adding:**
- Date picker library (for meeting date selection)
  - Recommendation: Native HTML5 `<input type="date">` for simplicity
- CSV export: Use browser-native `Blob` API (no library needed)

### Data Validation
**Confidence: High**

**Client-Side:**
- HTML5 form validation
- JavaScript validation before API calls
- No library needed for v1

**Server-Side:**
- Supabase RLS policies (enforce at database level)
- PostgreSQL constraints (NOT NULL, CHECK constraints)

### CSV Export
**Confidence: High**

**Approach:** Browser-native implementation
- Use `Blob` API to create CSV file
- Trigger download via `<a>` element with `download` attribute
- No external library needed

**Pattern:**
```javascript
function exportToCSV(data, filename) {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}
```

### Offline Support
**Confidence: Medium**

**Current:** Service Worker already in place
**Enhancement:** Store attendance in IndexedDB when offline, sync when online

**Library Consideration:**
- Workbox (Google's service worker library) — too heavy for v1
- Manual IndexedDB — sufficient for v1, add Workbox later if needed

**Recommendation:** Manual IndexedDB for v1, Workbox for v2

## What NOT to Use

### Avoid Heavy Frameworks
- **React/Vue/Angular** — Overkill for v1, adds complexity
- **State management libraries (Redux, Zustand)** — Not needed with vanilla JS
- **UI component libraries (Material-UI, Bootstrap)** — Existing CSS is sufficient

### Avoid Over-Engineering
- **GraphQL** — REST API (Supabase) is sufficient
- **Microservices** — Monolithic PWA is fine
- **Complex build tools** — No build step needed for vanilla JS

## Version Recommendations

**Supabase JS Client:** v2 (already in use via CDN)
- Stable, well-documented
- UMD build works in vanilla JS

**No Additional Dependencies:** Keep it simple for v1

## Migration Path

**If Migrating to Framework Later:**
1. Start with Vite (fast, simple)
2. Choose React (most popular) or Vue (simpler learning curve)
3. Migrate incrementally (one screen at a time)
4. Keep Supabase client integration

## Confidence Levels

- **High (90%+):** Database schema, CSV export, vanilla JS approach
- **Medium (70-90%):** State management pattern, offline strategy
- **Low (<70%):** Framework migration timing (depends on v1 success)

## Rationale Summary

**Why This Stack:**
1. **Leverages existing:** Supabase, vanilla JS, PWA infrastructure
2. **Minimal dependencies:** Faster development, easier maintenance
3. **Scalable foundation:** Can migrate to framework later if needed
4. **Proven patterns:** Standard web APIs, no experimental tech

**Key Principle:** Ship v1 fast, optimize later

