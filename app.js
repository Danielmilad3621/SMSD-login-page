/* ============================================================
   Scout PWA — app.js
   Handles screen transitions, toasts, Google OAuth via Supabase,
   and invite-only email allowlist (server-side via Supabase DB).
   ============================================================ */

(function () {
  'use strict';

  /* ── Supabase configuration ──────────────────────────────── */
  const SUPABASE_URL  = 'https://yhnjsvzfkoeqcgzlqvnj.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlobmpzdnpma29lcWNnemxxdm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NDMsImV4cCI6MjA4NjAzNDQ0M30.eNZXFZ7vTQJfyWmULSoaN3pXKmDbl6e6YV2c_AlwMk4';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  /* ── DOM references ───────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);

  const screens = {
    splash:   $('#splash'),
    login:    $('#login'),
    loggedIn: $('#logged-in'),
  };

  const toast         = $('#toast');
  const btnGoogle     = $('#btn-google');
  const loginError    = $('#login-error');
  const welcomeEmail  = $('#welcome-email');
  const btnLogout     = $('#btn-logout');

  /* ── Current screen tracking ──────────────────────────────── */
  let currentScreen = 'splash';

  /* ── Screen transition ────────────────────────────────────── */
  function showScreen(target, direction = 'left') {
    if (target === currentScreen) return;

    const outgoing = screens[currentScreen];
    const incoming = screens[target];

    incoming.classList.remove('slide-left', 'slide-right');
    incoming.classList.add(direction === 'left' ? 'slide-right' : 'slide-left');

    void incoming.offsetWidth;

    outgoing.classList.remove('active');
    outgoing.classList.add(direction === 'left' ? 'slide-left' : 'slide-right');

    incoming.classList.remove('slide-left', 'slide-right');
    incoming.classList.add('active');

    currentScreen = target;
  }

  /* ── Toast helper ─────────────────────────────────────────── */
  let toastTimeout;
  function showToast(message, duration = 2500) {
    clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  /* ── Show logged-in state ─────────────────────────────────── */
  function showLoggedIn(email) {
    welcomeEmail.textContent = email;
    loginError.classList.remove('visible');
    showScreen('loggedIn', 'left');
    showToast('✅ Logged in successfully');
  }

  /* ── Check allowlist via Supabase DB (server-side) ─────────── */
  async function isEmailInvited(email) {
    // Query the invited_users table.
    // RLS ensures the user can ONLY see their own row (if it exists).
    const { data, error } = await supabase
      .from('invited_users')
      .select('email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[Scout] Error checking allowlist:', error);
      return false;
    }

    return data !== null;
  }

  /* ── Handle authenticated user ─────────────────────────────── */
  async function handleAuthUser(user) {
    const email = (user.email || '').trim().toLowerCase();

    const invited = await isEmailInvited(email);

    if (invited) {
      showLoggedIn(email);
    } else {
      // Not on the allowlist — sign them out immediately
      await supabase.auth.signOut();
      loginError.textContent = "Access not granted — you're not on the invited list yet.";
      loginError.classList.add('visible');
      showScreen('login', 'right');
    }
  }

  /* ── Google Sign-In button ─────────────────────────────────── */
  btnGoogle.addEventListener('click', async () => {
    loginError.classList.remove('visible');
    btnGoogle.disabled = true;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (error) {
      loginError.textContent = 'Sign-in failed. Please try again.';
      loginError.classList.add('visible');
      console.error('[Scout] Google sign-in error:', error);
    }

    btnGoogle.disabled = false;
  });

  /* ── Logout ────────────────────────────────────────────────── */
  btnLogout.addEventListener('click', async () => {
    await supabase.auth.signOut();
    showScreen('login', 'right');
    showToast('Logged out');
  });

  /* ── Splash → next screen auto-transition ──────────────────── */
  function initSplash() {
    const logo = screens.splash.querySelector('.splash-logo');

    setTimeout(() => {
      logo.classList.add('idle');
    }, 2200);

    setTimeout(async () => {
      // Check for an existing Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user) {
        await handleAuthUser(session.user);
      } else {
        showScreen('login', 'left');
      }
    }, 3200);
  }

  /* ── Listen for auth state changes (handles OAuth redirect) ── */
  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session && session.user) {
      await handleAuthUser(session.user);
    }
  });

  /* ── Service Worker registration ──────────────────────────── */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./service-worker.js')
        .then((reg) => {
          console.log('[Scout] Service Worker registered:', reg.scope);
        })
        .catch((err) => {
          console.warn('[Scout] SW registration failed:', err);
        });
    });
  }

  /* ── Kick off ─────────────────────────────────────────────── */
  initSplash();

})();
