# Scout — SMSD Login Page

A static PWA-style login page with Google Sign-In and an invite-only email allowlist.  
**Live at:** [smsd-login-page.vercel.app](https://smsd-login-page.vercel.app)

## How It Works

1. User clicks **"Sign in with Google"** → redirected to Google consent screen.
2. After Google sign-in, Supabase processes the OAuth and redirects back to the Vercel app.
3. The app checks if the user's Google email is in `invited-users.json`.
4. **If invited** → shown the Welcome screen.
5. **If NOT invited** → signed out immediately with an error message.

## Setup (One-Time)

### 1. Google Cloud — Create OAuth Credentials

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Create a new project (or use an existing one).
3. Click **"Create Credentials"** → **"OAuth client ID"**.
4. Choose **Web application** as the application type.
5. Under **Authorized JavaScript origins**, add:
   - `https://smsd-login-page.vercel.app`
6. Under **Authorized redirect URIs**, add:
   - `https://yhnjsvzfkoeqcgzlqvnj.supabase.co/auth/v1/callback`
7. Click **Create** and copy the **Client ID** and **Client Secret**.

> If the consent screen says "App not verified", go to **OAuth consent screen** → set it to **External** and add your test emails.

### 2. Supabase — Enable Google Provider

1. Go to [Supabase Dashboard → Authentication → Providers](https://supabase.com/dashboard/project/yhnjsvzfkoeqcgzlqvnj/auth/providers).
2. Find **Google** in the list and toggle it **ON**.
3. Paste your **Client ID** and **Client Secret** from step 1.
4. Click **Save**.

### 3. Supabase — Set Redirect URL

1. Go to [Supabase Dashboard → Authentication → URL Configuration](https://supabase.com/dashboard/project/yhnjsvzfkoeqcgzlqvnj/auth/url-configuration).
2. Set **Site URL** to:
   - `https://smsd-login-page.vercel.app`
3. Under **Redirect URLs**, add:
   - `https://smsd-login-page.vercel.app/**`
4. Click **Save**.

## Invite-Only Allowlist

Only emails listed in `invited-users.json` can access the app.

### How to Add More Invited Emails (up to 10)

1. Open `invited-users.json`.
2. Add the new email address to the `invitedEmails` array:

```json
{
  "invitedEmails": [
    "danielmilad3621@gmail.com",
    "danielemil.c3@gmail.com",
    "steven.agayby@gmail.com",
    "new.user@example.com"
  ]
}
```

3. Save the file. A console warning will appear if the list exceeds 10 emails.
4. Bump the `CACHE_NAME` version in `service-worker.js` (e.g. `scout-v4`) so the updated list propagates to cached PWA clients.
5. Commit and push to GitHub — Vercel auto-deploys on push.

## How to Test Locally

1. Serve the project with any static file server:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx, no install needed)
npx serve .
```

2. Open `http://localhost:8000` in your browser.
3. Click "Sign in with Google" → sign in with an invited email → see the Welcome screen.
4. Sign in with a non-invited email → see "Access not granted" error.
5. Click "Log Out" → returns to login screen.
