# Directory Structure

## Root Directory

```
SMSD System/
├── index.html              # Main HTML file (all screens)
├── app.js                  # Application logic (182 lines)
├── styles.css              # All styles (652 lines)
├── service-worker.js       # PWA service worker (91 lines)
├── manifest.webmanifest    # PWA manifest configuration
├── offline.html            # Offline fallback page
├── README.md               # Project documentation
└── assets/
    └── scout-logo.svg      # Brand logo (SVG)
```

## File Descriptions

### Core Application Files

#### `index.html`
- **Purpose**: Single HTML file containing all application screens
- **Structure**:
  - Head section: Meta tags, PWA configuration, Supabase CDN link
  - Body: Three screen sections (splash, login, logged-in)
  - Toast notification element
  - Script tag for `app.js`
- **Lines**: 201
- **Key Sections**:
  - Splash screen with SMSD logo SVG
  - Login screen with Google Sign-In button
  - Logged-in welcome screen

#### `app.js`
- **Purpose**: All application logic and state management
- **Pattern**: IIFE (Immediately Invoked Function Expression)
- **Lines**: 182
- **Key Components**:
  - Supabase client initialization
  - Screen transition logic
  - Authentication handlers
  - Allowlist checking
  - Service Worker registration
  - Toast notifications

#### `styles.css`
- **Purpose**: All styling and layout
- **Approach**: Mobile-first, CSS custom properties
- **Lines**: 652
- **Key Sections**:
  - CSS custom properties (design tokens)
  - Reset/base styles
  - Screen container styles
  - Component styles (buttons, cards, inputs)
  - Animation/transition styles

#### `service-worker.js`
- **Purpose**: PWA caching and offline support
- **Strategy**: Cache-first for static assets
- **Lines**: 91
- **Key Features**:
  - App shell pre-caching
  - Cache versioning (`scout-v4`)
  - Offline fallback
  - Supabase API bypass

#### `manifest.webmanifest`
- **Purpose**: PWA installation configuration
- **Format**: JSON
- **Configuration**:
  - App name: "Scout"
  - Theme color: `#169B62` (brand green)
  - Display mode: `standalone`
  - Icons: SVG logo (any size, maskable)

#### `offline.html`
- **Purpose**: Fallback page when offline
- **Content**: Simple offline message with retry button
- **Usage**: Served by Service Worker when navigation fails

### Assets Directory

#### `assets/scout-logo.svg`
- **Purpose**: Brand logo/icon
- **Usage**: 
  - Favicon
  - Apple touch icon
  - PWA icon
  - Splash screen logo

### Documentation

#### `README.md`
- **Purpose**: Project documentation
- **Content**:
  - How it works
  - Security details
  - User management instructions
  - Setup guide
  - Local testing instructions

## File Organization Patterns

### Flat Structure
- All core files in root directory
- No subdirectories for code organization
- Simple, flat hierarchy

### Separation of Concerns
- **HTML**: Structure only
- **CSS**: Presentation only
- **JavaScript**: Behavior only
- **Service Worker**: Caching/offline only

### No Build Artifacts
- No `dist/`, `build/`, or `public/` directories
- Source files are production files
- No compilation or bundling step

## Planning Directory (Created by GSD)

```
.planning/
└── codebase/
    ├── STACK.md           # Technology stack
    ├── INTEGRATIONS.md    # External services
    ├── ARCHITECTURE.md    # System architecture
    ├── STRUCTURE.md       # This file
    ├── CONVENTIONS.md     # Coding standards
    ├── TESTING.md         # Testing approach
    └── CONCERNS.md        # Technical debt
```

## File Size Summary

- `index.html`: ~201 lines
- `app.js`: ~182 lines
- `styles.css`: ~652 lines
- `service-worker.js`: ~91 lines
- `manifest.webmanifest`: ~24 lines
- `offline.html`: ~71 lines
- **Total**: ~1,221 lines of code

## Dependencies

### External (CDN)
- `@supabase/supabase-js@2` (loaded from jsdelivr)

### Internal
- No internal dependencies
- No module system
- No import/export statements

## Configuration Files

### None Present
- No `package.json` (no npm dependencies)
- No `tsconfig.json` (not TypeScript)
- No `webpack.config.js` (no bundler)
- No `.env` files (configuration hardcoded)
- No `vercel.json` (Vercel auto-detects static site)

## Future Structure Considerations

If the project grows, consider:
- `src/` directory for source files
- `public/` or `assets/` for static assets (already partially done)
- `config/` for configuration files
- `docs/` for documentation
- Module-based organization if codebase expands

