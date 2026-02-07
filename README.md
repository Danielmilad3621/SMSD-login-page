# Scout — SMSD Login Page

A static PWA-style login page with an invite-only email gate for testing.

## Invite-Only Gate

Only emails listed in `invited-users.json` can log in. No password is required — this is a testing-phase allowlist.

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
4. If using the PWA offline, bump the `CACHE_NAME` version in `service-worker.js` (e.g. `scout-v3`) so the updated list propagates to cached clients.

### How to Test Locally

1. Serve the project with any static file server. For example:

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx, no install needed)
npx serve .
```

2. Open `http://localhost:8000` (or the port shown) in your browser.
3. Enter an invited email → you should see the "Welcome" screen.
4. Enter a non-invited email → you should see "Access not granted" error.
5. Close and re-open the tab → session persists for 24 hours.
6. Click "Log Out" → returns to the login screen.

### Session Behaviour

- Login session is stored in `localStorage` with a 24-hour expiry.
- On page load, if a valid session exists the login screen is skipped.
- Logging out clears the session immediately.

