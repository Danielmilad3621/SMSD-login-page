# Architecture

## Application Type
Single-Page Application (SPA) with Progressive Web App (PWA) capabilities. No routing—uses screen-based navigation with CSS transitions.

## Architecture Pattern
**Monolithic Client-Side Application** with external BaaS (Backend-as-a-Service) integration.

## High-Level Flow

```
User → Splash Screen → Login Screen → Google OAuth → Supabase Auth → 
Allowlist Check → Welcome Screen (if invited) OR Sign Out (if not invited)
```

## Component Structure

### Screen-Based Navigation
Three distinct screens managed via CSS classes and JavaScript:
1. **Splash Screen** (`#splash`)
   - Initial loading state
   - Auto-transitions after 3.2 seconds
   - Checks for existing session
2. **Login Screen** (`#login`)
   - Google Sign-In button
   - Error message display
   - Entry point for authentication
3. **Logged-In Screen** (`#logged-in`)
   - Welcome message with user email
   - Logout button
   - Placeholder for future features

### State Management
- **Current Screen**: Tracked via `currentScreen` variable
- **Auth State**: Managed by Supabase client (session-based)
- **No global state store**: Simple variable-based state management

## Data Flow

### Authentication Flow
1. User clicks "Sign in with Google"
2. `supabase.auth.signInWithOAuth()` called
3. Browser redirects to Google OAuth consent
4. Google redirects to Supabase callback
5. Supabase processes OAuth and redirects to app
6. `onAuthStateChange` listener fires with `SIGNED_IN` event
7. `handleAuthUser()` function called with user object

### Authorization Flow (Allowlist Check)
1. After authentication, `isEmailInvited()` called
2. Queries Supabase `invited_users` table
3. Filters by user's email (lowercase, trimmed)
4. Returns boolean: `true` if email exists, `false` otherwise
5. If `true`: Show welcome screen
6. If `false`: Sign out immediately, show error message

### Screen Transition Flow
1. `showScreen(target, direction)` function called
2. Outgoing screen: Removes `active` class, adds slide animation
3. Incoming screen: Adds slide animation, then `active` class
4. CSS transitions handle visual animation
5. `currentScreen` variable updated

## Service Worker Architecture

### Caching Strategy
- **Cache-First** for static assets
- **Network-First** for Supabase API calls (explicitly bypassed)
- **Offline Fallback** for navigation requests

### Cache Lifecycle
1. **Install**: Pre-caches app shell (HTML, CSS, JS, manifest, assets)
2. **Activate**: Cleans up old cache versions
3. **Fetch**: Serves from cache if available, falls back to network

### Cache Name
- `scout-v4` (versioned for cache invalidation)

## Code Organization

### File Structure
- **index.html**: Structure, all screens in one file
- **app.js**: All application logic (IIFE pattern)
- **styles.css**: All styles (CSS custom properties)
- **service-worker.js**: PWA caching logic
- **manifest.webmanifest**: PWA configuration

### Code Patterns

#### IIFE Pattern
```javascript
(function () {
  'use strict';
  // All code here
})();
```
Prevents global namespace pollution.

#### DOM Query Pattern
```javascript
const $ = (sel) => document.querySelector(sel);
```
Simple jQuery-like selector helper.

#### Screen Management
- All screens defined in HTML
- JavaScript toggles `active` class
- CSS handles transitions and visibility

## Security Architecture

### Client-Side Security
- **No sensitive data**: All auth handled by Supabase
- **RLS enforcement**: Database queries protected server-side
- **Immediate sign-out**: Non-invited users signed out before access

### Server-Side Security (Supabase)
- **Row Level Security**: Users can only query their own email
- **OAuth validation**: Google OAuth handled by Supabase
- **Session management**: JWT tokens managed by Supabase

## Performance Considerations

### Loading Strategy
- **No code splitting**: Single JS file
- **CDN for library**: Supabase loaded from jsdelivr
- **Inline SVG**: Logo embedded in HTML (no extra requests)

### Caching Strategy
- **Service Worker**: Caches app shell for offline support
- **Browser cache**: Standard HTTP caching for static assets
- **No API caching**: Supabase calls always go to network

## Scalability

### Current Limitations
- **Single file architecture**: All code in one JS file
- **No module system**: No code organization beyond functions
- **Hardcoded configuration**: Supabase URL/key in code

### Future Considerations
- Could benefit from:
  - Environment variable configuration
  - Code splitting if app grows
  - Module system (ES modules or bundler)
  - State management library if complexity increases

## Error Handling

### Auth Errors
- Displayed in `#login-error` element
- User-friendly messages
- Console logging for debugging

### Network Errors
- Service Worker handles offline scenarios
- Supabase client handles API errors
- Graceful degradation (offline.html fallback)

## Accessibility

### ARIA Labels
- Screen sections have `aria-label` attributes
- Toast has `role="alert"` and `aria-live="polite"`

### Semantic HTML
- Proper heading hierarchy
- Button elements (not divs)
- Form-like structure for login

