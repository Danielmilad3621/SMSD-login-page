# External Integrations

## Supabase

### Authentication
- **Provider**: Google OAuth 2.0
- **Configuration**: 
  - Project URL: `https://yhnjsvzfkoeqcgzlqvnj.supabase.co`
  - Anon key: Hardcoded in `app.js` (JWT token)
  - Redirect URI: `https://yhnjsvzfkoeqcgzlqvnj.supabase.co/auth/v1/callback`
- **Flow**: 
  1. User clicks "Sign in with Google"
  2. Redirects to Google consent screen
  3. Supabase processes OAuth callback
  4. Redirects back to app with session

### Database
- **Table**: `invited_users`
  - Schema: `email` column (primary identifier)
  - Purpose: Server-side allowlist for access control
- **Row Level Security (RLS)**:
  - Users can only query their own email
  - Prevents enumeration of other users
  - Enforced at database level

### API Usage
- **Auth Methods**:
  - `supabase.auth.signInWithOAuth({ provider: 'google' })`
  - `supabase.auth.signOut()`
  - `supabase.auth.getSession()`
  - `supabase.auth.onAuthStateChange()`
- **Database Methods**:
  - `supabase.from('invited_users').select('email').eq('email', email).maybeSingle()`

## Google Cloud Platform

### OAuth Configuration
- **Service**: Google Cloud Console → Credentials
- **OAuth Client Type**: Web application
- **Authorized JavaScript Origins**: `https://smsd-login-page.vercel.app`
- **Authorized Redirect URIs**: `https://yhnjsvzfkoeqcgzlqvnj.supabase.co/auth/v1/callback`
- **Credentials**: Client ID and Client Secret (stored in Supabase dashboard, not in code)

## Vercel

### Hosting
- **Platform**: Vercel (static site hosting)
- **Domain**: `smsd-login-page.vercel.app`
- **Deployment**: Direct file upload (no build process)
- **Configuration**: None required (static files)

## CDN Services

### jsdelivr
- **Purpose**: Serves Supabase JS client library
- **URL**: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js`
- **Version**: v2 (latest stable at time of implementation)

## Integration Points

### Authentication Flow
1. **Client** → Google OAuth consent screen
2. **Google** → Supabase auth callback
3. **Supabase** → Redirects to app with session
4. **App** → Checks `invited_users` table
5. **App** → Shows welcome screen or signs out

### Data Flow
- **Read-only** database access
- **No write operations** from client
- **Admin operations** (add/remove users) done via Supabase dashboard or SQL editor

## Security Considerations
- **Anon key exposed**: Supabase anon key is hardcoded in client-side code (expected for public apps)
- **RLS protection**: Database queries protected by Row Level Security
- **No secrets in code**: OAuth client secret stored only in Supabase dashboard
- **HTTPS only**: All external calls use HTTPS

## Configuration Requirements
1. **Supabase Project**: Must have Google provider enabled
2. **Google Cloud**: OAuth credentials must be configured
3. **Supabase RLS**: Policies must allow users to query their own email only
4. **Vercel**: Site URL must match Google OAuth authorized origins

