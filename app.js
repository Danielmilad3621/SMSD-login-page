/* ============================================================
   Scout PWA — app.js
   Handles screen transitions, form validation, toasts,
   and invite-only email gate (no password auth).
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ──────────────────────────────────────────── */
  const SESSION_KEY  = 'scout_session';
  const SESSION_TTL  = 24 * 60 * 60 * 1000; // 24 hours in ms
  const MAX_INVITED  = 10;                   // guard: warn if list > 10

  /* ── DOM references ───────────────────────────────────────── */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    splash:   $('#splash'),
    login:    $('#login'),
    loggedIn: $('#logged-in'),
  };

  const toast = $('#toast');

  // Login form elements
  const emailInput   = $('#email');
  const btnLogin     = $('#btn-login');
  const loginForm    = $('#login-form');
  const loginError   = $('#login-error');

  // Logged-in screen elements
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
      // Offline fallback: list stays empty; cached page will still
      // load from the SW cache which includes invited-users.json
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

  /* ── Splash → next screen auto-transition ──────────────────── */
  function initSplash() {
    const logo = screens.splash.querySelector('.splash-logo');

    setTimeout(() => {
      logo.classList.add('idle');
    }, 2200);

    setTimeout(() => {
      const session = getSession();
      if (session) {
        showLoggedIn(session.email);
      } else {
        showScreen('login', 'left');
      }
    }, 3200);
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

  /* ── Login validation ─────────────────────────────────────── */
  function validateLoginFields() {
    const email = emailInput.value.trim();
    btnLogin.disabled = !(email.length > 0);
  }

  /* ── Session helpers (localStorage) ───────────────────────── */
  function saveSession(email) {
    const session = {
      email: email,
      expiresAt: Date.now() + SESSION_TTL,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  /* ── Show logged-in state ─────────────────────────────────── */
  function showLoggedIn(email) {
    welcomeEmail.textContent = email;
    showScreen('loggedIn', 'left');
    showToast('✅ Logged in successfully');
  }

  /* ── Event listeners ──────────────────────────────────────── */
  emailInput.addEventListener('input', () => {
    loginError.classList.remove('visible');
    validateLoginFields();
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim().toLowerCase();

    // Disable button and show loading state
    btnLogin.disabled = true;
    btnLogin.textContent = 'Checking…';

    // Small delay to feel intentional
    await new Promise((r) => setTimeout(r, 400));

    if (invitedEmails.includes(email)) {
      loginError.classList.remove('visible');
      saveSession(email);
      showLoggedIn(email);
    } else {
      loginError.textContent = "Access not granted — you're not on the invited list yet.";
      loginError.classList.add('visible');
    }

    btnLogin.textContent = 'Log In';
    btnLogin.disabled = false;
    validateLoginFields();
  });

  btnLogout.addEventListener('click', () => {
    clearSession();
    emailInput.value = '';
    btnLogin.disabled = true;
    showScreen('login', 'right');
    showToast('Logged out');
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
  loadInvitedUsers();
  initSplash();

})();
