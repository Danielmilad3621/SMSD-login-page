/* ============================================================
   Scout PWA — app.js
   Handles screen transitions, form validation, toasts,
   and service-worker registration.
   ============================================================ */

(function () {
  'use strict';

  /* ── DOM references ───────────────────────────────────────── */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    splash: $('#splash'),
    login:  $('#login'),
  };

  const toast = $('#toast');

  // Login form elements
  const usernameInput  = $('#username');
  const passwordInput  = $('#password');
  const btnLogin       = $('#btn-login');
  const loginForm      = $('#login-form');
  const loginError     = $('#login-error');
  const togglePassword = $('#toggle-password');

  /* ── Hardcoded users (internal project) ────────────────────── */
  const USERS = {
    admin:   'scout2026',
    daniel:  'scout2026',
    manager: 'scout2026',
  };

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

  /* ── Splash → Login auto-transition ───────────────────────── */
  function initSplash() {
    const logo = screens.splash.querySelector('.splash-logo');

    setTimeout(() => {
      logo.classList.add('idle');
    }, 2200);

    setTimeout(() => {
      showScreen('login', 'left');
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
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;
    btnLogin.disabled = !(user.length > 0 && pass.length > 0);
  }

  function authenticate(username, password) {
    const user = username.toLowerCase();
    return USERS.hasOwnProperty(user) && USERS[user] === password;
  }

  /* ── Toggle password visibility ───────────────────────────── */
  togglePassword.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';

    const eyeIcon    = togglePassword.querySelector('.eye-icon');
    const eyeOffIcon = togglePassword.querySelector('.eye-off-icon');
    eyeIcon.style.display    = isPassword ? 'none'  : 'block';
    eyeOffIcon.style.display = isPassword ? 'block' : 'none';
  });

  /* ── Event listeners ──────────────────────────────────────── */
  usernameInput.addEventListener('input', () => {
    loginError.classList.remove('visible');
    validateLoginFields();
  });

  passwordInput.addEventListener('input', () => {
    loginError.classList.remove('visible');
    validateLoginFields();
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (authenticate(username, password)) {
      loginError.classList.remove('visible');
      showToast('✅ Logged in successfully');
      // TODO: Navigate to your main app screen here
    } else {
      loginError.classList.add('visible');
      passwordInput.value = '';
      btnLogin.disabled = true;
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
