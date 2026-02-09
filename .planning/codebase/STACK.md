# Technology Stack

## Overview
Scout is a static Progressive Web App (PWA) built with vanilla web technologies. No build tools, frameworks, or bundlers are used—just pure HTML, CSS, and JavaScript.

## Core Technologies

### Frontend
- **HTML5** — Semantic markup, PWA meta tags
- **CSS3** — Custom properties (CSS variables), modern layout (Flexbox), mobile-first responsive design
- **JavaScript (ES6+)** — Vanilla JS, no transpilation, IIFE pattern for scoping
- **Service Workers API** — Offline support, caching strategy
- **Web App Manifest** — PWA installation, theme configuration

### Backend Services
- **Supabase** — Backend-as-a-Service
  - Authentication (OAuth with Google)
  - PostgreSQL database (invited_users table)
  - Row Level Security (RLS) policies
  - REST API via Supabase JS client

### Third-Party Libraries
- **@supabase/supabase-js v2** — Loaded via CDN (jsdelivr)
  - UMD build for browser compatibility
  - No npm/package.json dependency

### Hosting & Deployment
- **Vercel** — Static site hosting
  - Live URL: `smsd-login-page.vercel.app`
- **Google Cloud Platform** — OAuth 2.0 credentials
  - OAuth client ID/secret management

## Development Tools
- **Local Development** — Simple HTTP server
  - `python3 -m http.server 8000` or `npx serve .`
  - No build step required

## Browser Support
- Modern browsers with:
  - Service Worker support
  - ES6+ JavaScript
  - CSS Custom Properties
  - Fetch API

## Dependencies
**None** — This is a zero-dependency project. All external code is loaded via CDN:
- Supabase JS client: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`

## Build System
**None** — Static files are deployed as-is. No compilation, bundling, or minification step.

