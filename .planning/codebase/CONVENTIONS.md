# Coding Conventions

## JavaScript

### Code Style
- **IIFE Pattern**: All code wrapped in `(function () { 'use strict'; ... })();`
- **Strict Mode**: `'use strict'` enabled
- **No Global Variables**: All code scoped within IIFE
- **Camel Case**: Variable and function names use camelCase
  - Examples: `currentScreen`, `showScreen()`, `isEmailInvited()`

### Naming Conventions
- **Functions**: Verb-based, descriptive
  - `showScreen()`, `showToast()`, `handleAuthUser()`, `isEmailInvited()`
- **Variables**: Descriptive, no abbreviations
  - `btnGoogle`, `loginError`, `welcomeEmail`, `toastTimeout`
- **Constants**: UPPER_SNAKE_CASE
  - `SUPABASE_URL`, `SUPABASE_ANON`
- **DOM References**: Prefixed with `$` for querySelector results
  - `$('#splash')`, `$('#login')`

### Code Organization
- **Section Comments**: Visual separators with `──` characters
  ```javascript
  /* ── Supabase configuration ──────────────────────────────── */
  /* ── DOM references ───────────────────────────────────────── */
  /* ── Screen transition ────────────────────────────────────── */
  ```
- **Logical Grouping**: Related code grouped together
- **Top-to-Bottom Flow**: 
  1. Configuration
  2. DOM references
  3. State variables
  4. Helper functions
  5. Event handlers
  6. Initialization

### Async/Await
- **Preferred**: `async/await` over promises
- **Error Handling**: Try-catch not used (errors handled inline)
  ```javascript
  const { data, error } = await supabase.from('table').select();
  if (error) { /* handle */ }
  ```

### DOM Manipulation
- **Query Selector Helper**: `const $ = (sel) => document.querySelector(sel);`
- **Direct Property Access**: `textContent`, `classList` used directly
- **No jQuery**: Vanilla JavaScript only

## CSS

### Organization
- **File Header**: Descriptive comment block
  ```css
  /* ============================================================
     Scout PWA — styles.css
     Mobile-first, single-page auth UI
     Primary brand colour: #169B62
     ============================================================ */
  ```
- **Section Comments**: Visual separators
  ```css
  /* ── CSS Custom Properties ────────────────────────────────── */
  /* ── Reset / Base ─────────────────────────────────────────── */
  /* ── App Shell ────────────────────────────────────────────── */
  ```

### CSS Custom Properties
- **Naming**: Kebab-case with descriptive prefixes
  - `--color-primary`, `--space-md`, `--radius-lg`, `--transition-base`
- **Organization**: Grouped by category
  - Brand colors
  - Neutrals
  - Spacing
  - Radii
  - Shadows
  - Typography
  - Transitions
- **Usage**: All values reference custom properties (no magic numbers)

### Selector Naming
- **BEM-like**: Descriptive class names
  - `.btn`, `.btn-primary`, `.btn-google`, `.btn-outline`
  - `.screen`, `.screen.active`, `.screen.slide-left`
  - `.hero`, `.hero-logo`, `.card`, `.card-title`

### Mobile-First
- **Base Styles**: Mobile (smallest viewport)
- **Media Queries**: None present (single-column design)
- **Responsive Units**: `dvh` (dynamic viewport height) used

### Spacing System
- **Consistent Scale**: 4px base unit
  - `--space-xs: 4px`
  - `--space-sm: 8px`
  - `--space-md: 16px`
  - `--space-lg: 24px`
  - `--space-xl: 32px`
  - `--space-2xl: 48px`

## HTML

### Structure
- **Semantic HTML**: Proper use of `<section>`, `<button>`, etc.
- **ARIA Labels**: Screen sections have `aria-label` attributes
- **Accessibility**: Toast has `role="alert"` and `aria-live="polite"`

### Comments
- **Section Markers**: Visual separators for screen sections
  ```html
  <!-- ═══════════════════════════════════════════════════════
       SCREEN 1 — Splash
       ═══════════════════════════════════════════════════════ -->
  ```

### Inline Styles
- **Minimal Use**: Only for dynamic values or one-off adjustments
  - Example: `style="text-align:center; margin-top:var(--space-md);"`

## Service Worker

### Code Style
- **Comments**: Section-based organization
  ```javascript
  /* ── Install: pre-cache the app shell ─────────────────────── */
  /* ── Activate: clean up old caches ────────────────────────── */
  /* ── Fetch: cache-first for static, offline fallback for nav */
  ```

### Cache Naming
- **Versioned**: `scout-v4` (increment on updates)
- **Purpose**: Enables cache invalidation

## General Conventions

### Comments
- **Purpose**: Explain "why" not "what"
- **Style**: Block comments with visual separators
- **Language**: English, clear and concise

### Error Handling
- **User-Facing**: Friendly error messages
- **Developer-Facing**: Console logging with `[Scout]` prefix
  ```javascript
  console.error('[Scout] Google sign-in error:', error);
  ```

### Code Formatting
- **Indentation**: 2 spaces
- **Line Length**: No strict limit, but readable
- **Semicolons**: Used consistently
- **Quotes**: Single quotes in JavaScript, double in HTML

### File Naming
- **Lowercase**: All files lowercase with hyphens
  - `index.html`, `app.js`, `styles.css`, `service-worker.js`
- **Descriptive**: Names clearly indicate purpose

## Consistency Notes

### Brand Color
- **Primary**: `#169B62` (used consistently throughout)
- **Variations**: Light/dark variants defined as custom properties

### Typography
- **Font Stack**: System fonts (no external font loading)
  ```css
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', ...
  ```

### Transitions
- **Consistent Timing**: Three speeds defined
  - Fast: 200ms
  - Base: 350ms
  - Slow: 600ms

## Areas for Improvement

1. **No Linting**: No ESLint or style guide enforcement
2. **No Formatting Tool**: No Prettier or similar
3. **Hardcoded Values**: Some magic numbers in CSS (could use custom properties)
4. **No Type Checking**: No TypeScript or JSDoc types
5. **Inconsistent Error Handling**: Some errors logged, some silently handled

