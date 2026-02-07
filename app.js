/* ============================================================
   Scout PWA — app.js
   Handles screen transitions, toasts, Google OAuth via Supabase,
   and invite-only email allowlist gate.
   ============================================================ */

(function () {
  'use strict';

  /* ── Supabase configuration ──────────────────────────────── */
  const SUPABASE_URL  = 'https://yhnjsvzfkoeqcgzlqvnj.supabase.co';
  const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlobmpzdnpma29lcWNnemxxdm5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0NTg0NDMsImV4cCI6MjA4NjAzNDQ0M30.eNZXFZ7vTQJfyWmULSoaN3pXKmDbl6e6YV2c_AlwMk4';

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

  /* ── Constants ──────────────────────────────────────────── */
  const MAX_INVITED = 10; // guard: warn if list > 10

  /* ── DOM references ───────────────────────────────────────── */
  const $ = (sel) => document.querySelector(sel);

  const screens = {
    splash:   $('#splash'),
    login:    $('#login'),
    loggedIn: $('#logged-in'),
  };

  const toast      = $('#toast');
  const btnGoogle   = $('#btn-google');
  const loginError  = $('#login-error');
  const welcomeEmail = $('#welcome-email');
  const btnLogout    = $('#btn-logout');

  /* ── Invited-users list (loaded from JSON) ────────────────── */
  let invitedEmails = [];

  async function loadInvitedUsers() {
    try {
      const res = await fetch('./invited-users.json');
      if (!res.ok) throw new Error('Failed to fetch invited-users.json');
      const data = await res.json();
      invitedEmails = (data.invitedEmails || []).map(e => e.trim().toLowerCase());

      if (invitedEmails.length > MAX_INVITED) {
        console.warn(
          `[Scout] ⚠️  Invited list has ${invitedEmails.length} users — ` +
          `exceeds the recommended max of ${MAX_INVITED}. ` +
          `Consider migrating to a database-backed solution.`
        );
      }
    } catch (err) {
      console.error('[Scout] Could not load invited-users list:', err);
    }
  }

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

  /* ── Check allowlist and handle auth result ────────────────── */
  async function handleAuthUser(user) {
    const email = (user.email || '').trim().toLowerCase();

    // Wait for invited list to be loaded
    if (invitedEmails.length === 0) {
      await loadInvitedUsers();
    }

    if (invitedEmails.includes(email)) {
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
    btnGoogle.querySelector('span')?.remove(); // clean up if any

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
  async function initSplash() {
    const logo = screens.splash.querySelector('.splash-logo');

    // Load invited list in background
    await loadInvitedUsers();

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
