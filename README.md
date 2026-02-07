# Scout — SMSD Login Page

A static PWA-style login page with Google Sign-In and a **server-side** invite-only email allowlist powered by Supabase.  
**Live at:** [smsd-login-page.vercel.app](https://smsd-login-page.vercel.app)

## How It Works

1. User clicks **"Sign in with Google"** → redirected to Google consent screen.
2. After Google sign-in, Supabase processes the OAuth and redirects back.
3. The app queries the `invited_users` table in Supabase to check if the email is allowed.
4. **If invited** → shown the Welcome screen.
5. **If NOT invited** → signed out immediately with an error message.

### Security

- The invited emails list is stored **server-side** in a Supabase Postgres table — not exposed in any client-side file.
- **Row Level Security (RLS)** ensures a signed-in user can only check if **their own** email exists — they cannot see or enumerate other users.
- Non-invited users are signed out immediately after the allowlist check fails.

## How to Add or Remove Invited Users

Go to the [Supabase Dashboard → Table Editor → `invited_users`](https://supabase.com/dashboard/project/yhnjsvzfkoeqcgzlqvnj/editor) and:

**Add a user:**
1. Click **"Insert row"**
2. Enter the email address
3. Click **Save**

**Or via SQL** in the [SQL Editor](https://supabase.com/dashboard/project/yhnjsvzfkoeqcgzlqvnj/sql/new):

```sql
-- Add a user
INSERT INTO invited_users (email) VALUES ('new.user@gmail.com');

-- Remove a user
DELETE FROM invited_users WHERE email = 'old.user@gmail.com';

-- See all invited users
SELECT * FROM invited_users;
```

No code changes or redeployment needed — changes take effect instantly.

## Setup (One-Time)

### 1. Google Cloud — Create OAuth Credentials

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create a **Web application** OAuth client ID.
3. **Authorized JavaScript origins**: `https://smsd-login-page.vercel.app`
4. **Authorized redirect URIs**: `https://yhnjsvzfkoeqcgzlqvnj.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**.

### 2. Supabase — Enable Google Provider

1. Go to [Auth → Providers](https://supabase.com/dashboard/project/yhnjsvzfkoeqcgzlqvnj/auth/providers).
2. Toggle **Google** ON → paste Client ID & Secret → Save.

### 3. Supabase — Set Redirect URL

1. Go to [Auth → URL Configuration](https://supabase.com/dashboard/project/yhnjsvzfkoeqcgzlqvnj/auth/url-configuration).
2. **Site URL**: `https://smsd-login-page.vercel.app`
3. **Redirect URLs**: `https://smsd-login-page.vercel.app/**`
4. Save.

## How to Test Locally

```bash
python3 -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000` and sign in with Google.
