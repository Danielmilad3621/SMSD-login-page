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
    scouts:   $('#scouts-screen'),
    leaders:  $('#leaders-screen'),
    meetings: $('#meetings-screen'),
    attendance: $('#attendance-screen'),
    users:    $('#users-screen'),
  };
  
  // Validate critical screens exist
  if (!screens.splash || !screens.login) {
    console.error('[Scout] Critical: Required screen elements not found');
    // Try to show login screen if it exists
    if (screens.login) {
      screens.login.classList.add('active');
    }
  }

  const toast         = $('#toast');
  const btnGoogle     = $('#btn-google');
  const loginError    = $('#login-error');
  const welcomeEmail  = $('#welcome-email');
  const btnLogout     = $('#btn-logout');

  /* ── Current screen tracking ──────────────────────────────── */
  let currentScreen = 'splash';
  
  /* ── User role cache ───────────────────────────────────────── */
  let userRole = null;
  let userRolePromise = null;

  /* ── Screen transition ────────────────────────────────────── */
  function showScreen(target, direction = 'left') {
    if (target === currentScreen) return;
    
    // Safety check: ensure target screen exists
    if (!screens[target]) {
      console.error(`[Scout] Screen "${target}" not found`);
      // Try to show login as fallback
      if (screens.login) {
        target = 'login';
      } else {
        return;
      }
    }

    const outgoing = screens[currentScreen];
    const incoming = screens[target];
    
    // Additional safety checks
    if (!incoming) {
      console.error(`[Scout] Cannot transition to screen "${target}"`);
      return;
    }

    incoming.classList.remove('slide-left', 'slide-right');
    incoming.classList.add(direction === 'left' ? 'slide-right' : 'slide-left');

    void incoming.offsetWidth;

    if (outgoing) {
      outgoing.classList.remove('active');
      outgoing.classList.add(direction === 'left' ? 'slide-left' : 'slide-right');
    }

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
  async function showLoggedIn(email) {
    welcomeEmail.textContent = email;
    loginError.classList.remove('visible');
    
    // Check user role and show navigation if applicable
    await checkUserRole();
    setupNavigation();
    
    showScreen('loggedIn', 'left');
    showToast('✅ Logged in successfully');
  }
  
  /* ── Get user role from Supabase ───────────────────────────── */
  async function getUserRole() {
    if (userRole !== null) return userRole;
    if (userRolePromise) return userRolePromise;
    
    userRolePromise = (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[Scout] Error fetching role:', error);
        return null;
      }
      
      userRole = data?.role || null;
      return userRole;
    })();
    
    return userRolePromise;
  }
  
  /* ── Check and cache user role ─────────────────────────────── */
  async function checkUserRole() {
    userRole = await getUserRole();
    return userRole;
  }
  
  /* ── Permission checks ──────────────────────────────────────── */
  async function isAdmin() {
    const role = await getUserRole();
    return role === 'Admin';
  }
  
  async function isAdminLeader() {
    const role = await getUserRole();
    return role === 'Admin Leader';
  }
  
  async function canManageParticipants() {
    const role = await getUserRole();
    return role === 'Admin' || role === 'Admin Leader';
  }
  
  async function canTakeAttendance() {
    const role = await getUserRole();
    return role === 'Admin' || role === 'Admin Leader' || role === 'Leader';
  }
  
  /* ── Setup navigation menu ─────────────────────────────────── */
  async function setupNavigation() {
    const navMenu = $('#nav-menu');
    const dashboardHelper = $('#dashboard-helper');
    const navUsers = $('#nav-users');
    
    if (await canManageParticipants()) {
      navMenu.style.display = 'flex';
      dashboardHelper.style.display = 'none';
    } else {
      navMenu.style.display = 'none';
      dashboardHelper.style.display = 'block';
    }
    
    // Show Users button only for Admin
    const isAdminUser = await isAdmin();
    if (isAdminUser) {
      navUsers.style.display = 'block';
    } else {
      navUsers.style.display = 'none';
    }
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
    // Safety check: if splash screen doesn't exist, go straight to login
    if (!screens.splash) {
      console.warn('[Scout] Splash screen not found, showing login');
      showScreen('login', 'left');
      return;
    }
    
    const logo = screens.splash.querySelector('.splash-logo');
    
    // If logo doesn't exist, skip animation and go straight to session check
    if (logo) {
      setTimeout(() => {
        if (logo) {
          logo.classList.add('idle');
        }
      }, 2200);
    }

    // Use timeout wrapper to prevent hanging on slow connections
    const sessionCheck = async () => {
      try {
        // Check for an existing Supabase session with timeout
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session check timeout')), 5000)
        );
        
        let sessionResult;
        try {
          sessionResult = await Promise.race([
            sessionPromise,
            timeoutPromise
          ]);
        } catch (raceErr) {
          // Timeout or other race error - show login
          console.warn('[Scout] Session check timeout or error:', raceErr.message);
          showScreen('login', 'left');
          return;
        }

        const { data: { session }, error } = sessionResult || {};

        if (error) {
          console.error('[Scout] Error checking session:', error);
          showScreen('login', 'left');
          return;
        }

        if (session && session.user) {
          await handleAuthUser(session.user);
        } else {
          showScreen('login', 'left');
        }
      } catch (err) {
        console.error('[Scout] Error in initSplash:', err);
        // Fallback to login screen on any error
        showScreen('login', 'left');
      }
    };

    // Start session check immediately, but delay screen transition
    const animationDelay = logo ? 3200 : 100;
    setTimeout(sessionCheck, animationDelay);
    
    // Safety timeout: if nothing happens after 10 seconds, show login
    setTimeout(() => {
      if (currentScreen === 'splash') {
        console.warn('[Scout] Splash screen timeout, forcing login');
        showScreen('login', 'left');
      }
    }, 10000);
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

  /* ── Navigation handlers ───────────────────────────────────── */
  $('#nav-scouts')?.addEventListener('click', () => {
    showScreen('scouts', 'left');
    loadScouts();
  });
  
  $('#nav-leaders')?.addEventListener('click', () => {
    showScreen('leaders', 'left');
    loadLeaders();
  });
  
  $('#scouts-back')?.addEventListener('click', () => {
    showScreen('loggedIn', 'right');
  });
  
  $('#leaders-back')?.addEventListener('click', () => {
    showScreen('loggedIn', 'right');
  });
  
  $('#nav-meetings')?.addEventListener('click', () => {
    showScreen('meetings', 'left');
    loadMeetings();
  });
  
  $('#meetings-back')?.addEventListener('click', () => {
    showScreen('loggedIn', 'right');
  });
  
  $('#attendance-back')?.addEventListener('click', () => {
    showScreen('meetings', 'right');
  });
  
  $('#nav-users')?.addEventListener('click', () => {
    showScreen('users', 'left');
    loadInvitedUsers();
  });
  
  $('#users-back')?.addEventListener('click', () => {
    showScreen('loggedIn', 'right');
  });
  
  /* ── Scouts Management ─────────────────────────────────────── */
  let scoutsData = [];
  let scoutsSearchTerm = '';
  let scoutsFilterGroups = ['Group 1', 'Group 2'];
  
  async function loadScouts() {
    const loadingEl = $('#scouts-loading');
    const errorEl = $('#scouts-error');
    const listEl = $('#scouts-list');
    const emptyEl = $('#scouts-empty');
    const actionBar = $('#scouts-action-bar');
    
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    
    // Check permissions and cache
    await checkCanManage();
    
    // Show/hide add button based on permissions
    if (canManageCache) {
      actionBar.style.display = 'block';
    } else {
      actionBar.style.display = 'none';
    }
    
    // Show/hide recalculate points button (Admin only)
    const recalculateBtn = $('#btn-recalculate-points');
    if (recalculateBtn) {
      const isAdminUser = await isAdmin();
      recalculateBtn.style.display = isAdminUser ? 'block' : 'none';
    }
    
    try {
      const { data, error } = await supabase
        .from('scouts')
        .select('*')
        .order('scout_group')
        .order('name');
      
      if (error) throw error;
      
      scoutsData = data || [];
      renderScouts();
      
      loadingEl.style.display = 'none';
    } catch (err) {
      console.error('[Scout] Error loading scouts:', err);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Failed to load scouts. Please try again.';
    }
  }
  
  function renderScouts() {
    const listEl = $('#scouts-list');
    const emptyEl = $('#scouts-empty');
    
    // Filter scouts
    let filtered = scoutsData.filter(scout => {
      // Search filter
      if (scoutsSearchTerm) {
        const searchLower = scoutsSearchTerm.toLowerCase();
        if (!scout.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Group filter
      if (!scoutsFilterGroups.includes(scout.scout_group)) {
        return false;
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    
    emptyEl.style.display = 'none';
    
    // Group by scout_group
    const grouped = {};
    filtered.forEach(scout => {
      if (!grouped[scout.scout_group]) {
        grouped[scout.scout_group] = [];
      }
      grouped[scout.scout_group].push(scout);
    });
    
    // Render groups
    let html = '';
    ['Group 1', 'Group 2'].forEach(groupName => {
      if (!grouped[groupName] || grouped[groupName].length === 0) return;
      
      html += `<div class="group-section">`;
      html += `<h2 class="group-header">${groupName}</h2>`;
      html += `<div class="cards-grid">`;
      
      grouped[groupName].forEach(scout => {
        html += renderScoutCard(scout);
      });
      
      html += `</div></div>`;
    });
    
    listEl.innerHTML = html;
    
    // Attach event listeners
    attachScoutEventListeners();
  }
  
  let canManageCache = false;
  
  async function checkCanManage() {
    canManageCache = await canManageParticipants();
    return canManageCache;
  }
  
  function renderScoutCard(scout) {
    return `
      <div class="participant-card" data-scout-id="${scout.id}">
        <div class="card-header">
          <h3 class="card-name">${escapeHtml(scout.name)}</h3>
          <div class="card-actions" style="display: ${canManageCache ? 'flex' : 'none'}">
            <button class="btn-icon btn-edit-scout" data-scout-id="${scout.id}" aria-label="Edit scout">
              ✏️
            </button>
          </div>
        </div>
        <div class="card-details">
          <div class="card-detail">
            <strong>Group:</strong> ${escapeHtml(scout.scout_group)}
          </div>
          <div class="card-detail">
            <strong>Email:</strong> ${escapeHtml(scout.email)}
          </div>
          <div class="card-points">${scout.points_total || 0} points</div>
        </div>
      </div>
    `;
  }
  
  function attachScoutEventListeners() {
    document.querySelectorAll('.btn-edit-scout').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const scoutId = e.target.closest('.btn-edit-scout').dataset.scoutId;
        const scout = scoutsData.find(s => s.id === scoutId);
        if (scout) {
          editScout(scout);
        }
      });
    });
  }
  
  /* ── Leaders Management ─────────────────────────────────────── */
  let leadersData = [];
  let leadersSearchTerm = '';
  let leadersFilterGroups = ['Group 1', 'Group 2'];
  
  async function loadLeaders() {
    const loadingEl = $('#leaders-loading');
    const errorEl = $('#leaders-error');
    const listEl = $('#leaders-list');
    const emptyEl = $('#leaders-empty');
    const actionBar = $('#leaders-action-bar');
    
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    
    // Check permissions and cache
    await checkCanManage();
    
    // Show/hide add button based on permissions
    if (canManageCache) {
      actionBar.style.display = 'block';
    } else {
      actionBar.style.display = 'none';
    }
    
    try {
      // Get leaders
      const { data: leaders, error: leadersError } = await supabase
        .from('leaders')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (leadersError) throw leadersError;
      
      // Get roles for all leaders
      const leaderUserIds = (leaders || []).map(l => l.user_id).filter(Boolean);
      let rolesMap = {};
      
      if (leaderUserIds.length > 0) {
        const { data: roles, error: rolesError } = await supabase
          .from('roles')
          .select('user_id, role')
          .in('user_id', leaderUserIds);
        
        if (!rolesError && roles) {
          roles.forEach(r => {
            rolesMap[r.user_id] = r.role;
          });
        }
      }
      
      leadersData = (leaders || []).map(leader => ({
        ...leader,
        role: leader.user_id ? (rolesMap[leader.user_id] || null) : null
      }));
      
      renderLeaders();
      
      loadingEl.style.display = 'none';
    } catch (err) {
      console.error('[Scout] Error loading leaders:', err);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Failed to load leaders. Please try again.';
    }
  }
  
  function renderLeaders() {
    const listEl = $('#leaders-list');
    const emptyEl = $('#leaders-empty');
    
    // Filter leaders
    let filtered = leadersData.filter(leader => {
      // Search filter
      if (leadersSearchTerm) {
        const searchLower = leadersSearchTerm.toLowerCase();
        if (!leader.name.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      // Group filter - check if leader belongs to any selected group
      const leaderGroups = leader.scout_groups || [];
      const hasSelectedGroup = leadersFilterGroups.some(group => leaderGroups.includes(group));
      if (!hasSelectedGroup) {
        return false;
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    
    emptyEl.style.display = 'none';
    
    // Group by scout_group (leaders appear in each group they belong to)
    const grouped = {};
    filtered.forEach(leader => {
      const leaderGroups = leader.scout_groups || [];
      leaderGroups.forEach(groupName => {
        if (leadersFilterGroups.includes(groupName)) {
          if (!grouped[groupName]) {
            grouped[groupName] = [];
          }
          // Avoid duplicates by checking if leader already in this group
          if (!grouped[groupName].find(l => l.id === leader.id)) {
            grouped[groupName].push(leader);
          }
        }
      });
    });
    
    // Sort each group alphabetically
    Object.keys(grouped).forEach(groupName => {
      grouped[groupName].sort((a, b) => a.name.localeCompare(b.name));
    });
    
    // Render groups
    let html = '';
    ['Group 1', 'Group 2'].forEach(groupName => {
      if (!grouped[groupName] || grouped[groupName].length === 0) return;
      
      html += `<div class="group-section">`;
      html += `<h2 class="group-header">${groupName}</h2>`;
      html += `<div class="cards-grid">`;
      
      grouped[groupName].forEach(leader => {
        html += renderLeaderCard(leader);
      });
      
      html += `</div></div>`;
    });
    
    listEl.innerHTML = html;
    
    // Attach event listeners
    attachLeaderEventListeners();
  }
  
  function renderLeaderCard(leader) {
    const groups = (leader.scout_groups || []).join(', ');
    return `
      <div class="participant-card" data-leader-id="${leader.id}">
        <div class="card-header">
          <h3 class="card-name">${escapeHtml(leader.name)}</h3>
          <div class="card-actions" style="display: ${canManageCache ? 'flex' : 'none'}">
            <button class="btn-icon btn-edit-leader" data-leader-id="${leader.id}" aria-label="Edit leader">
              ✏️
            </button>
            <button class="btn-icon btn-delete-leader" data-leader-id="${leader.id}" aria-label="Delete leader" style="color: var(--color-error, #dc3545);">
              🗑️
            </button>
          </div>
        </div>
        <div class="card-details">
          <div class="card-detail">
            <strong>Group(s):</strong> ${escapeHtml(groups || 'None')}
          </div>
          <div class="card-detail">
            <strong>Email:</strong> ${escapeHtml(leader.email)}
          </div>
          <div class="card-detail">
            <strong>Role:</strong> ${escapeHtml(leader.role || 'Not assigned')}
          </div>
        </div>
      </div>
    `;
  }
  
  function attachLeaderEventListeners() {
    document.querySelectorAll('.btn-edit-leader').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const leaderId = e.target.closest('.btn-edit-leader').dataset.leaderId;
        const leader = leadersData.find(l => l.id === leaderId);
        if (leader) {
          editLeader(leader);
        }
      });
    });
    
    document.querySelectorAll('.btn-delete-leader').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const leaderId = e.target.closest('.btn-delete-leader').dataset.leaderId;
        const leader = leadersData.find(l => l.id === leaderId);
        if (leader) {
          deleteLeader(leader);
        }
      });
    });
  }
  
  /* ── Search and Filter Handlers ───────────────────────────── */
  $('#scouts-search')?.addEventListener('input', (e) => {
    scoutsSearchTerm = e.target.value;
    renderScouts();
  });
  
  $('#leaders-search')?.addEventListener('input', (e) => {
    leadersSearchTerm = e.target.value;
    renderLeaders();
  });
  
  $('#filter-group1')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      scoutsFilterGroups.push('Group 1');
    } else {
      scoutsFilterGroups = scoutsFilterGroups.filter(g => g !== 'Group 1');
    }
    renderScouts();
  });
  
  $('#filter-group2')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      scoutsFilterGroups.push('Group 2');
    } else {
      scoutsFilterGroups = scoutsFilterGroups.filter(g => g !== 'Group 2');
    }
    renderScouts();
  });
  
  $('#leaders-filter-group1')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      leadersFilterGroups.push('Group 1');
    } else {
      leadersFilterGroups = leadersFilterGroups.filter(g => g !== 'Group 1');
    }
    renderLeaders();
  });
  
  $('#leaders-filter-group2')?.addEventListener('change', (e) => {
    if (e.target.checked) {
      leadersFilterGroups.push('Group 2');
    } else {
      leadersFilterGroups = leadersFilterGroups.filter(g => g !== 'Group 2');
    }
    renderLeaders();
  });
  
  /* ── Utility Functions ─────────────────────────────────────── */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  /* ── Modal Helpers ─────────────────────────────────────────── */
  function showModal(modalId) {
    const modal = $(modalId);
    if (modal) {
      modal.classList.add('active');
    }
  }
  
  function hideModal(modalId) {
    const modal = $(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  }
  
  /* ── Add Scout Form ─────────────────────────────────────────── */
  $('#btn-add-scout')?.addEventListener('click', () => {
    showModal('#modal-add-scout');
    resetAddScoutForm();
  });
  
  $('#btn-recalculate-points')?.addEventListener('click', async () => {
    if (!confirm('This will recalculate all scout points from attendance records. Continue?')) {
      return;
    }
    
    await recalculateAllPoints();
  });
  
  $('#close-add-scout')?.addEventListener('click', () => {
    hideModal('#modal-add-scout');
  });
  
  $('#cancel-add-scout')?.addEventListener('click', () => {
    hideModal('#modal-add-scout');
  });
  
  $('#modal-add-scout')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-add-scout') {
      hideModal('#modal-add-scout');
    }
  });
  
  function resetAddScoutForm() {
    $('#form-add-scout').reset();
    clearFormErrors('add-scout');
    $('#add-scout-error-banner').style.display = 'none';
  }
  
  $('#form-add-scout')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('add-scout');
    
    const name = $('#add-scout-name').value.trim();
    const email = $('#add-scout-email').value.trim().toLowerCase();
    const scoutGroup = $('#add-scout-group').value;
    const notes = $('#add-scout-notes').value.trim();
    const parentContact = $('#add-scout-parent-contact').value.trim();
    
    // Validation
    let hasErrors = false;
    
    if (!name) {
      showFieldError('add-scout-name', 'Name is required');
      hasErrors = true;
    }
    
    if (!email) {
      showFieldError('add-scout-email', 'Email is required');
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('add-scout-email', 'Please enter a valid email address');
      hasErrors = true;
    } else {
      // Check for duplicate email
      const existing = scoutsData.find(s => s.email.toLowerCase() === email);
      if (existing) {
        showFieldError('add-scout-email', 'This email is already registered');
        hasErrors = true;
      }
    }
    
    if (!scoutGroup) {
      showFieldError('add-scout-group', 'Please select a scout group');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Submit
    try {
      const { data, error } = await supabase
        .from('scouts')
        .insert({
          name,
          email,
          scout_group: scoutGroup,
          notes: notes || null,
          parent_contact: parentContact || null,
          points_total: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      
      hideModal('#modal-add-scout');
      showToast('✅ Scout added successfully');
      await loadScouts();
    } catch (err) {
      console.error('[Scout] Error adding scout:', err);
      $('#add-scout-error-banner').textContent = err.message || 'Failed to add scout. Please try again.';
      $('#add-scout-error-banner').style.display = 'block';
    }
  });
  
  /* ── Add Leader Form ───────────────────────────────────────── */
  $('#btn-add-leader')?.addEventListener('click', async () => {
    const isAdminUser = await isAdmin();
    const roleSelect = $('#add-leader-role');
    const roleHelp = $('#add-leader-role-help');
    
    if (isAdminUser) {
      roleSelect.disabled = false;
      roleHelp.style.display = 'none';
    } else {
      roleSelect.disabled = true;
      roleSelect.value = 'Leader';
      roleHelp.style.display = 'block';
    }
    
    showModal('#modal-add-leader');
    resetAddLeaderForm();
  });
  
  $('#close-add-leader')?.addEventListener('click', () => {
    hideModal('#modal-add-leader');
  });
  
  $('#cancel-add-leader')?.addEventListener('click', () => {
    hideModal('#modal-add-leader');
  });
  
  $('#modal-add-leader')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-add-leader') {
      hideModal('#modal-add-leader');
    }
  });
  
  function resetAddLeaderForm() {
    $('#form-add-leader').reset();
    clearFormErrors('add-leader');
    $('#add-leader-error-banner').style.display = 'none';
  }
  
  $('#form-add-leader')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('add-leader');
    
    const name = $('#add-leader-name').value.trim();
    const email = $('#add-leader-email').value.trim().toLowerCase();
    const group1 = $('#add-leader-group1').checked;
    const group2 = $('#add-leader-group2').checked;
    const role = $('#add-leader-role').value;
    const notes = $('#add-leader-notes').value.trim();
    
    const scoutGroups = [];
    if (group1) scoutGroups.push('Group 1');
    if (group2) scoutGroups.push('Group 2');
    
    // Validation
    let hasErrors = false;
    
    if (!name) {
      showFieldError('add-leader-name', 'Name is required');
      hasErrors = true;
    }
    
    if (!email) {
      showFieldError('add-leader-email', 'Email is required');
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('add-leader-email', 'Please enter a valid email address');
      hasErrors = true;
    } else {
      // Check for duplicate email
      const existing = leadersData.find(l => l.email.toLowerCase() === email);
      if (existing) {
        showFieldError('add-leader-email', 'This email is already registered');
        hasErrors = true;
      }
    }
    
    if (scoutGroups.length === 0) {
      showFieldError('add-leader-groups', 'Please select at least one scout group');
      hasErrors = true;
    }
    
    if (!role) {
      showFieldError('add-leader-role', 'Please select a role');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Submit
    try {
      // Check if current user is admin (only admin can assign roles)
      const currentUserIsAdmin = await isAdmin();
      
      // Create leader first
      const { data: leaderData, error: leaderError } = await supabase
        .from('leaders')
        .insert({
          name,
          email,
          scout_groups: scoutGroups,
          notes: notes || null,
          active: true
        })
        .select()
        .single();
      
      if (leaderError) {
        hideModal('#modal-add-leader');
        throw leaderError;
      }
      
      // Auto-invite leader by adding to invited_users table
      try {
        const { error: inviteError } = await supabase
          .from('invited_users')
          .insert({ email: email })
          .select()
          .maybeSingle();
        
        if (inviteError) {
          // If user already invited, that's fine - just log it
          if (inviteError.code !== '23505') { // Not a duplicate key error
            console.warn('[Scout] Could not auto-invite leader:', inviteError);
          }
        }
      } catch (inviteErr) {
        // Don't fail leader creation if invite fails
        console.warn('[Scout] Error auto-inviting leader:', inviteErr);
      }
      
      // Create role if specified and user is admin
      // Note: Roles require user_id from auth.users
      // The new function will link the leader to the user AND create the role
      if (currentUserIsAdmin && role) {
        // Use the improved function that links leader to user and creates role
        try {
          const { data: roleData, error: roleError } = await supabase.rpc('create_leader_with_role', {
            leader_id: leaderData.id,
            leader_email: email,
            role_name: role
          });
          
          if (roleError) {
            // Check error type
            if (roleError.message && roleError.message.includes('does not exist')) {
              // User doesn't exist in auth.users
              console.warn('[Scout] Could not create role - user not found:', roleError.message);
              // Hide modal first so toast is visible
              hideModal('#modal-add-leader');
              await loadLeaders();
              showToast('✅ Leader added. Role requires user to sign in first. Please assign role manually after they sign in.', 7000);
            } else {
              // Other error
              console.warn('[Scout] Could not create role:', roleError.message);
              // Hide modal first so toast is visible
              hideModal('#modal-add-leader');
              await loadLeaders();
              showToast('✅ Leader added. Role assignment failed. Please assign role manually after user signs in.', 6000);
            }
          } else {
            // Role created and leader linked successfully
            hideModal('#modal-add-leader');
            await loadLeaders();
            showToast('✅ Leader and role added successfully', 4000);
          }
        } catch (roleErr) {
          console.error('[Scout] Error creating role:', roleErr);
          // Leader was created, but role wasn't - show helpful message
          hideModal('#modal-add-leader');
          await loadLeaders();
          showToast('✅ Leader added. Role will be assigned when user signs in.', 6000);
        }
      } else {
        // No role specified or not admin - just create leader
        hideModal('#modal-add-leader');
        await loadLeaders();
        showToast('✅ Leader added successfully', 4000);
      }
    } catch (err) {
      console.error('[Scout] Error adding leader:', err);
      // Don't hide modal on error - show error in form
      $('#add-leader-error-banner').textContent = err.message || 'Failed to add leader. Please try again.';
      $('#add-leader-error-banner').style.display = 'block';
    }
  });
  
  /* ── Form Error Helpers ─────────────────────────────────────── */
  function showFieldError(fieldId, message) {
    const errorEl = $(`#${fieldId}-error`);
    const inputEl = $(`#${fieldId}`);
    
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
    
    if (inputEl) {
      inputEl.classList.add('error');
    }
  }
  
  function clearFormErrors(formPrefix) {
    document.querySelectorAll(`[id^="${formPrefix}-"][id$="-error"]`).forEach(el => {
      el.textContent = '';
      el.style.display = 'none';
    });
    
    document.querySelectorAll(`[id^="${formPrefix}-"]:not([id$="-error"])`).forEach(el => {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
        el.classList.remove('error');
      }
    });
  }
  
  /* ── Meetings Management ─────────────────────────────────────── */
  let meetingsData = [];
  
  async function loadMeetings() {
    const loadingEl = $('#meetings-loading');
    const errorEl = $('#meetings-error');
    const listEl = $('#meetings-list');
    const emptyEl = $('#meetings-empty');
    const actionBar = $('#meetings-action-bar');
    
    // Clear cache first to ensure fresh data
    meetingsData = [];
    
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    
    // Check permissions and cache
    await checkCanManage();
    
    // Show/hide add button based on permissions
    if (canManageCache) {
      actionBar.style.display = 'block';
    } else {
      actionBar.style.display = 'none';
    }
    
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      
      // Update cache with fresh data
      meetingsData = data || [];
      renderMeetings();
      
      loadingEl.style.display = 'none';
    } catch (err) {
      console.error('[Scout] Error loading meetings:', err);
      // Clear cache on error
      meetingsData = [];
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Failed to load meetings. Please try again.';
    }
  }
  
  function groupMeetingsByWeek(meetings) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = [];
    const past = [];
    
    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      
      if (meetingDate >= today) {
        upcoming.push(meeting);
      } else {
        past.push(meeting);
      }
    });
    
    // Sort upcoming ascending (earliest first), past descending (most recent first)
    upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
    past.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const grouped = {
      upcoming: groupByWeek(upcoming),
      past: groupByWeek(past)
    };
    
    return grouped;
  }
  
  function groupByWeek(meetings) {
    const weeks = {};
    
    meetings.forEach(meeting => {
      const date = new Date(meeting.date);
      const weekStart = getWeekStart(date);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = {
          start: weekStart,
          meetings: []
        };
      }
      
      weeks[weekKey].meetings.push(meeting);
    });
    
    return weeks;
  }
  
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    return new Date(d.setDate(diff));
  }
  
  function getWeekLabel(weekStart, isPast = false) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const thisWeekStart = getWeekStart(today);
    const nextWeekStart = new Date(thisWeekStart);
    nextWeekStart.setDate(nextWeekStart.getDate() + 7);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    
    if (!isPast) {
      if (weekStart.getTime() === thisWeekStart.getTime()) {
        return 'This Week';
      } else if (weekStart.getTime() === nextWeekStart.getTime()) {
        return 'Next Week';
      }
    } else {
      if (weekStart.getTime() === lastWeekStart.getTime()) {
        return 'Last Week';
      }
    }
    
    // Format: "Week of Jan 15, 2025"
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[weekStart.getMonth()];
    const day = weekStart.getDate();
    const year = weekStart.getFullYear();
    return `Week of ${month} ${day}, ${year}`;
  }
  
  function renderMeetings() {
    const listEl = $('#meetings-list');
    const emptyEl = $('#meetings-empty');
    
    if (meetingsData.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    
    emptyEl.style.display = 'none';
    
    const grouped = groupMeetingsByWeek(meetingsData);
    let html = '';
    
    // Render upcoming meetings
    const upcomingWeeks = Object.keys(grouped.upcoming).sort();
    if (upcomingWeeks.length > 0) {
      upcomingWeeks.forEach(weekKey => {
        const week = grouped.upcoming[weekKey];
        html += `<div class="group-section">`;
        html += `<h2 class="group-header">${getWeekLabel(week.start, false)}</h2>`;
        html += `<div class="cards-grid">`;
        
        week.meetings.forEach(meeting => {
          html += renderMeetingCard(meeting);
        });
        
        html += `</div></div>`;
      });
    }
    
    // Render past meetings
    const pastWeeks = Object.keys(grouped.past).sort().reverse();
    if (pastWeeks.length > 0) {
      pastWeeks.forEach(weekKey => {
        const week = grouped.past[weekKey];
        html += `<div class="group-section">`;
        html += `<h2 class="group-header">${getWeekLabel(week.start, true)}</h2>`;
        html += `<div class="cards-grid">`;
        
        week.meetings.forEach(meeting => {
          html += renderMeetingCard(meeting);
        });
        
        html += `</div></div>`;
      });
    }
    
    listEl.innerHTML = html;
    
    // Attach event listeners and load details
    attachMeetingEventListeners();
  }
  
  function renderMeetingCard(meeting) {
    // Format date
    const date = new Date(meeting.date);
    const dateFormatted = formatMeetingDate(date);
    
    // Format scout groups
    const groups = (meeting.scout_groups || []).join(', ') || 'Not assigned';
    
    // Will be populated with leader names and attendance count
    const leaderNames = 'Loading...';
    const attendanceCount = 'Loading...';
    
    // Check if meeting date is today or future (can take attendance)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetingDate = new Date(meeting.date);
    meetingDate.setHours(0, 0, 0, 0);
    const canTakeAttendanceForThisMeeting = meetingDate >= today;
    
    return `
      <div class="participant-card meeting-card" data-meeting-id="${meeting.id}">
        <div class="card-header">
          <h3 class="card-name">${dateFormatted}</h3>
          <div class="card-actions" style="display: ${canManageCache ? 'flex' : 'none'}">
            <button class="btn-icon btn-edit-meeting" data-meeting-id="${meeting.id}" aria-label="Edit meeting">
              ✏️
            </button>
          </div>
        </div>
        <div class="card-details">
          <div class="card-detail">
            <strong>Location:</strong> ${escapeHtml(meeting.location || 'Not specified')}
          </div>
          <div class="card-detail">
            <strong>Groups:</strong> ${escapeHtml(groups)}
          </div>
          <div class="card-detail" id="meeting-${meeting.id}-leaders">
            <strong>Assigned Leaders:</strong> ${leaderNames}
          </div>
          <div class="card-detail" id="meeting-${meeting.id}-attendance">
            <strong>Attendance:</strong> ${attendanceCount}
          </div>
          ${canTakeAttendanceForThisMeeting ? `
          <div class="card-actions-inline">
            <button class="btn btn-secondary btn-sm btn-take-attendance" data-meeting-id="${meeting.id}">
              Take Attendance
            </button>
          </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  function formatMeetingDate(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${dayName}, ${month} ${day}, ${year}`;
  }
  
  async function attachMeetingEventListeners() {
    // Load leader names and attendance counts for each meeting
    for (const meeting of meetingsData) {
      await loadMeetingDetails(meeting);
    }
    
    // Attach edit button listeners
    document.querySelectorAll('.btn-edit-meeting').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const meetingId = e.target.closest('.btn-edit-meeting').dataset.meetingId;
        const meeting = meetingsData.find(m => m.id === meetingId);
        if (meeting) {
          editMeeting(meeting);
        }
      });
    });
    
    // Attach "Take Attendance" button listeners
    document.querySelectorAll('.btn-take-attendance').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const meetingId = e.target.closest('.btn-take-attendance').dataset.meetingId;
        const meeting = meetingsData.find(m => m.id === meetingId);
        if (meeting) {
          openAttendanceScreen(meeting);
        }
      });
    });
  }
  
  async function loadMeetingDetails(meeting) {
    // Load assigned leaders
    if (meeting.assigned_leaders && meeting.assigned_leaders.length > 0) {
      const { data: leaders } = await supabase
        .from('leaders')
        .select('name, email')
        .in('id', meeting.assigned_leaders);
      
      if (leaders && leaders.length > 0) {
        const leaderText = leaders.map(l => `${escapeHtml(l.name)} (${escapeHtml(l.email)})`).join(', ');
        const leadersEl = $(`#meeting-${meeting.id}-leaders`);
        if (leadersEl) {
          leadersEl.innerHTML = `<strong>Assigned Leaders:</strong> ${leaderText}`;
        }
      } else {
        const leadersEl = $(`#meeting-${meeting.id}-leaders`);
        if (leadersEl) {
          leadersEl.innerHTML = `<strong>Assigned Leaders:</strong> None assigned`;
        }
      }
    } else {
      const leadersEl = $(`#meeting-${meeting.id}-leaders`);
      if (leadersEl) {
        leadersEl.innerHTML = `<strong>Assigned Leaders:</strong> None assigned`;
      }
    }
    
    // Load attendance count
    const { data: attendance } = await supabase
      .from('attendance')
      .select('status')
      .eq('meeting_id', meeting.id);
    
    if (attendance) {
      const present = attendance.filter(a => a.status === 'Present').length;
      const absent = attendance.filter(a => a.status === 'Absent').length;
      const total = attendance.length;
      
      let attendanceText;
      if (total === 0) {
        attendanceText = 'No attendance taken';
      } else {
        attendanceText = `${present} present, ${absent} absent (${total} total)`;
      }
      
      const attendanceEl = $(`#meeting-${meeting.id}-attendance`);
      if (attendanceEl) {
        attendanceEl.innerHTML = `<strong>Attendance:</strong> ${attendanceText}`;
      }
    }
  }
  
  /* ── Add Meeting Form ──────────────────────────────────────── */
  $('#btn-add-meeting')?.addEventListener('click', async () => {
    // Load leaders for multi-select
    await loadLeadersForMeetingForm();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    $('#add-meeting-date').setAttribute('min', today);
    
    showModal('#modal-add-meeting');
    resetAddMeetingForm();
  });
  
  $('#close-add-meeting')?.addEventListener('click', () => {
    hideModal('#modal-add-meeting');
  });
  
  $('#cancel-add-meeting')?.addEventListener('click', () => {
    hideModal('#modal-add-meeting');
  });
  
  $('#modal-add-meeting')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-add-meeting') {
      hideModal('#modal-add-meeting');
    }
  });
  
  async function loadLeadersForMeetingForm() {
    try {
      const { data: leaders } = await supabase
        .from('leaders')
        .select('id, name, email')
        .eq('active', true)
        .order('name');
      
      const selectEl = $('#add-meeting-leaders');
      if (selectEl && leaders) {
        selectEl.innerHTML = leaders.map(leader => 
          `<option value="${leader.id}">${escapeHtml(leader.name)} (${escapeHtml(leader.email)})</option>`
        ).join('');
      }
    } catch (err) {
      console.error('[Scout] Error loading leaders for meeting form:', err);
    }
  }
  
  function resetAddMeetingForm() {
    $('#form-add-meeting').reset();
    clearFormErrors('add-meeting');
    $('#add-meeting-error-banner').style.display = 'none';
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    $('#add-meeting-date').setAttribute('min', today);
  }
  
  $('#form-add-meeting')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('add-meeting');
    
    const date = $('#add-meeting-date').value;
    const location = $('#add-meeting-location').value.trim();
    const group1 = $('#add-meeting-group1').checked;
    const group2 = $('#add-meeting-group2').checked;
    const leadersSelect = $('#add-meeting-leaders');
    const notes = $('#add-meeting-notes').value.trim();
    
    const scoutGroups = [];
    if (group1) scoutGroups.push('Group 1');
    if (group2) scoutGroups.push('Group 2');
    
    const selectedLeaders = Array.from(leadersSelect.selectedOptions).map(opt => opt.value);
    
    // Validation
    let hasErrors = false;
    
    if (!date) {
      showFieldError('add-meeting-date', 'Date is required');
      hasErrors = true;
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        showFieldError('add-meeting-date', 'Date must be in the future');
        hasErrors = true;
      } else {
        // Check for duplicate date with timeout to prevent hanging
        try {
          const duplicateCheckPromise = supabase
            .from('meetings')
            .select('id')
            .eq('date', date)
            .maybeSingle();
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Duplicate check timeout')), 5000)
          );
          
          const { data: existing } = await Promise.race([
            duplicateCheckPromise,
            timeoutPromise
          ]);
          
          if (existing) {
            showFieldError('add-meeting-date', 'A meeting already exists on this date');
            hasErrors = true;
          }
        } catch (dupErr) {
          console.warn('[Scout] Error checking duplicate date:', dupErr);
          // Continue with submission - duplicate check failed but don't block
          // Database constraint will catch duplicates anyway
        }
      }
    }
    
    if (!location) {
      showFieldError('add-meeting-location', 'Location is required');
      hasErrors = true;
    }
    
    if (scoutGroups.length === 0) {
      showFieldError('add-meeting-groups', 'Please select at least one scout group');
      hasErrors = true;
    }
    
    if (selectedLeaders.length === 0) {
      showFieldError('add-meeting-leaders', 'Please select at least one leader');
      hasErrors = true;
    }
    
    if (hasErrors) return;
    
    // Submit
    try {
      // Clear cache before insert to ensure fresh data
      meetingsData = [];
      
      const { data, error } = await supabase
        .from('meetings')
        .insert({
          date,
          location,
          scout_groups: scoutGroups,
          assigned_leaders: selectedLeaders,
          notes: notes || null
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Reset form and hide modal first so toast is visible
      resetAddMeetingForm();
      hideModal('#modal-add-meeting');
      
      // Reload meetings to refresh the list (this will repopulate meetingsData)
      await loadMeetings();
      
      showToast('✅ Meeting added successfully', 4000);
    } catch (err) {
      console.error('[Scout] Error adding meeting:', err);
      // Clear cache on error too to prevent stale data
      meetingsData = [];
      
      // Show error message - ensure it's visible
      const errorBanner = $('#add-meeting-error-banner');
      if (errorBanner) {
        errorBanner.textContent = err.message || 'Failed to add meeting. Please try again.';
        errorBanner.style.display = 'block';
        // Scroll to top of form to show error
        errorBanner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      
      // Also show toast for visibility
      showToast(`❌ ${err.message || 'Failed to add meeting'}`, 5000);
    }
  });
  
  /* ── Edit Scout (Inline) ───────────────────────────────────── */
  async function editScout(scout) {
    const card = document.querySelector(`[data-scout-id="${scout.id}"]`);
    if (!card) return;
    
    card.classList.add('editing');
    
    const currentHtml = card.innerHTML;
    card.innerHTML = `
      <form class="card-form" data-scout-id="${scout.id}">
        <div class="form-row">
          <label>Name *</label>
          <input type="text" name="name" value="${escapeHtml(scout.name)}" required />
          <div class="form-error" id="edit-scout-${scout.id}-name-error"></div>
        </div>
        <div class="form-row">
          <label>Email *</label>
          <input type="email" name="email" value="${escapeHtml(scout.email)}" required />
          <div class="form-error" id="edit-scout-${scout.id}-email-error"></div>
        </div>
        <div class="form-row">
          <label>Scout Group *</label>
          <select name="scout_group" required>
            <option value="Group 1" ${scout.scout_group === 'Group 1' ? 'selected' : ''}>Group 1</option>
            <option value="Group 2" ${scout.scout_group === 'Group 2' ? 'selected' : ''}>Group 2</option>
          </select>
          <div class="form-error" id="edit-scout-${scout.id}-group-error"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-cancel-edit" data-scout-id="${scout.id}">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
        </div>
      </form>
    `;
    
    // Cancel handler
    card.querySelector('.btn-cancel-edit')?.addEventListener('click', () => {
      card.classList.remove('editing');
      renderScouts();
    });
    
    // Submit handler
    card.querySelector('form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      
      const name = formData.get('name').trim();
      const email = formData.get('email').trim().toLowerCase();
      const scoutGroup = formData.get('scout_group');
      
      // Validation
      let hasErrors = false;
      clearEditScoutErrors(scout.id);
      
      if (!name) {
        showEditScoutError(scout.id, 'name', 'Name is required');
        hasErrors = true;
      }
      
      if (!email) {
        showEditScoutError(scout.id, 'email', 'Email is required');
        hasErrors = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showEditScoutError(scout.id, 'email', 'Please enter a valid email address');
        hasErrors = true;
      } else {
        const existing = scoutsData.find(s => s.id !== scout.id && s.email.toLowerCase() === email);
        if (existing) {
          showEditScoutError(scout.id, 'email', 'This email is already registered');
          hasErrors = true;
        }
      }
      
      if (!scoutGroup) {
        showEditScoutError(scout.id, 'group', 'Please select a scout group');
        hasErrors = true;
      }
      
      if (hasErrors) return;
      
      // Update
      try {
        const { error } = await supabase
          .from('scouts')
          .update({ name, email, scout_group: scoutGroup })
          .eq('id', scout.id);
        
        if (error) throw error;
        
        showToast('✅ Scout updated successfully');
        await loadScouts();
      } catch (err) {
        console.error('[Scout] Error updating scout:', err);
        showToast('Failed to update scout. Please try again.', 4000);
      }
    });
  }
  
  function showEditScoutError(scoutId, field, message) {
    const errorEl = $(`#edit-scout-${scoutId}-${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  function clearEditScoutErrors(scoutId) {
    ['name', 'email', 'group'].forEach(field => {
      const errorEl = $(`#edit-scout-${scoutId}-${field}-error`);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    });
  }
  
  /* ── Edit Leader (Inline) ──────────────────────────────────── */
  async function editLeader(leader) {
    const card = document.querySelector(`[data-leader-id="${leader.id}"]`);
    if (!card) return;
    
    const isAdminUser = await isAdmin();
    card.classList.add('editing');
    
    const groups = leader.scout_groups || [];
    const group1Checked = groups.includes('Group 1');
    const group2Checked = groups.includes('Group 2');
    
    card.innerHTML = `
      <form class="card-form" data-leader-id="${leader.id}">
        <div class="form-row">
          <label>Name *</label>
          <input type="text" name="name" value="${escapeHtml(leader.name)}" required />
          <div class="form-error" id="edit-leader-${leader.id}-name-error"></div>
        </div>
        <div class="form-row">
          <label>Email *</label>
          <input type="email" name="email" value="${escapeHtml(leader.email)}" required />
          <div class="form-error" id="edit-leader-${leader.id}-email-error"></div>
        </div>
        <div class="form-row">
          <label>Scout Groups *</label>
          <div class="checkbox-group-inline">
            <label class="checkbox-inline">
              <input type="checkbox" name="group1" value="Group 1" ${group1Checked ? 'checked' : ''} />
              <span>Group 1</span>
            </label>
            <label class="checkbox-inline">
              <input type="checkbox" name="group2" value="Group 2" ${group2Checked ? 'checked' : ''} />
              <span>Group 2</span>
            </label>
          </div>
          <div class="form-error" id="edit-leader-${leader.id}-groups-error"></div>
        </div>
        <div class="form-row">
          <label>Role *</label>
          <select name="role" ${isAdminUser ? '' : 'disabled'} required>
            <option value="">Select a role</option>
            <option value="Admin Leader" ${leader.role === 'Admin Leader' ? 'selected' : ''}>Admin Leader</option>
            <option value="Leader" ${leader.role === 'Leader' ? 'selected' : ''}>Leader</option>
            <option value="Viewer" ${leader.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
          </select>
          <div class="form-error" id="edit-leader-${leader.id}-role-error"></div>
          ${!isAdminUser ? '<p class="helper-text">Only Admin can change roles.</p>' : ''}
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-cancel-edit-leader" data-leader-id="${leader.id}">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
        </div>
      </form>
    `;
    
    // Cancel handler
    card.querySelector('.btn-cancel-edit-leader')?.addEventListener('click', () => {
      card.classList.remove('editing');
      renderLeaders();
    });
    
    // Submit handler
    card.querySelector('form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      
      const name = formData.get('name').trim();
      const email = formData.get('email').trim().toLowerCase();
      const group1 = formData.get('group1') === 'Group 1';
      const group2 = formData.get('group2') === 'Group 2';
      const role = formData.get('role');
      
      const scoutGroups = [];
      if (group1) scoutGroups.push('Group 1');
      if (group2) scoutGroups.push('Group 2');
      
      // Validation
      let hasErrors = false;
      clearEditLeaderErrors(leader.id);
      
      if (!name) {
        showEditLeaderError(leader.id, 'name', 'Name is required');
        hasErrors = true;
      }
      
      if (!email) {
        showEditLeaderError(leader.id, 'email', 'Email is required');
        hasErrors = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showEditLeaderError(leader.id, 'email', 'Please enter a valid email address');
        hasErrors = true;
      } else {
        const existing = leadersData.find(l => l.id !== leader.id && l.email.toLowerCase() === email);
        if (existing) {
          showEditLeaderError(leader.id, 'email', 'This email is already registered');
          hasErrors = true;
        }
      }
      
      if (scoutGroups.length === 0) {
        showEditLeaderError(leader.id, 'groups', 'Please select at least one scout group');
        hasErrors = true;
      }
      
      if (!role && isAdminUser) {
        showEditLeaderError(leader.id, 'role', 'Please select a role');
        hasErrors = true;
      }
      
      if (hasErrors) return;
      
      // Update
      try {
        const { error: leaderError } = await supabase
          .from('leaders')
          .update({ name, email, scout_groups: scoutGroups })
          .eq('id', leader.id);
        
        if (leaderError) throw leaderError;
        
        // Update role if changed and user is Admin
        // Use create_leader_with_role function to link user and assign role
        if (isAdminUser && role) {
          try {
            // Use the function that links leader to user AND assigns role
            const { data: roleData, error: roleError } = await supabase.rpc('create_leader_with_role', {
              leader_id: leader.id,
              leader_email: email,  // Use the updated email from form
              role_name: role
            });
            
            if (roleError) {
              // If user doesn't exist, show helpful message but don't fail
              if (roleError.message && roleError.message.includes('does not exist')) {
                console.warn('[Scout] Could not assign role - user not found:', roleError.message);
                showToast('✅ Leader updated. Role requires user to sign in first.', 6000);
              } else {
                console.error('[Scout] Error assigning role:', roleError);
                showToast('✅ Leader updated. Role assignment failed. Please try again.', 6000);
              }
            } else {
              // Role assigned successfully
              showToast('✅ Leader and role updated successfully', 4000);
            }
          } catch (roleErr) {
            console.error('[Scout] Error assigning role:', roleErr);
            showToast('✅ Leader updated. Role assignment failed. Please try again.', 6000);
          }
        } else {
          // No role change or not admin
          showToast('✅ Leader updated successfully', 4000);
        }
        
        await loadLeaders();
      } catch (err) {
        console.error('[Scout] Error updating leader:', err);
        showToast('Failed to update leader. Please try again.', 4000);
      }
    });
  }
  
  function showEditLeaderError(leaderId, field, message) {
    const errorEl = $(`#edit-leader-${leaderId}-${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  function clearEditLeaderErrors(leaderId) {
    ['name', 'email', 'groups', 'role'].forEach(field => {
      const errorEl = $(`#edit-leader-${leaderId}-${field}-error`);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    });
  }
  
  /* ── Delete Leader ───────────────────────────────────────── */
  async function deleteLeader(leader) {
    // Check if leader is assigned to any meetings
    // Query all meetings and filter in JavaScript since Supabase doesn't support array contains directly
    const { data: allMeetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, date, location, assigned_leaders');
    
    const meetings = allMeetings?.filter(m => 
      m.assigned_leaders && m.assigned_leaders.includes(leader.id)
    ) || [];
    
    let warningMessage = `Are you sure you want to remove "${leader.name}" from the leaders list?`;
    
    if (meetings && meetings.length > 0) {
      const meetingList = meetings.map(m => {
        const date = new Date(m.date).toLocaleDateString();
        return `- ${date} at ${m.location || 'TBD'}`;
      }).join('\n');
      
      warningMessage += `\n\n⚠️ This leader is assigned to ${meetings.length} meeting(s):\n${meetingList}\n\nThey will be removed from these meetings.`;
    }
    
    // Confirm deletion
    if (!confirm(warningMessage)) {
      return;
    }
    
    try {
      // Soft delete: set active = false
      const { error } = await supabase
        .from('leaders')
        .update({ active: false })
        .eq('id', leader.id);
      
      if (error) throw error;
      
      // Remove leader from assigned_leaders in meetings
      if (meetings && meetings.length > 0) {
        for (const meeting of meetings) {
          const currentLeaders = meeting.assigned_leaders || [];
          const updatedLeaders = currentLeaders.filter(id => id !== leader.id);
          
          await supabase
            .from('meetings')
            .update({ assigned_leaders: updatedLeaders })
            .eq('id', meeting.id);
        }
      }
      
      showToast(`✅ ${leader.name} removed from leaders list`, 4000);
      await loadLeaders();
    } catch (err) {
      console.error('[Scout] Error deleting leader:', err);
      showToast(`Failed to remove leader. Please try again.`, 4000);
    }
  }
  
  /* ── Users Management (Admin Only) ───────────────────────── */
  let invitedUsersData = [];
  
  async function loadInvitedUsers() {
    const loadingEl = $('#users-loading');
    const errorEl = $('#users-error');
    const listEl = $('#users-list');
    const emptyEl = $('#users-empty');
    const actionBar = $('#users-action-bar');
    
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    
    // Check if user is Admin
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Access denied. Admin only.';
      return;
    }
    
    // Show add button for Admin
    actionBar.style.display = 'block';
    
    try {
      const { data, error } = await supabase
        .from('invited_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      invitedUsersData = data || [];
      renderInvitedUsers();
      
      loadingEl.style.display = 'none';
    } catch (err) {
      console.error('[Scout] Error loading invited users:', err);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Failed to load users. Please try again.';
    }
  }
  
  function renderInvitedUsers() {
    const listEl = $('#users-list');
    const emptyEl = $('#users-empty');
    
    if (invitedUsersData.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    
    emptyEl.style.display = 'none';
    
    let html = '<div class="cards-grid">';
    invitedUsersData.forEach(user => {
      const date = new Date(user.created_at).toLocaleDateString();
      html += `
        <div class="participant-card" data-user-email="${escapeHtml(user.email)}">
          <div class="card-header">
            <h3 class="card-name">${escapeHtml(user.email)}</h3>
            <div class="card-actions">
              <button class="btn-icon btn-delete-user" data-user-email="${escapeHtml(user.email)}" aria-label="Remove user" style="color: var(--color-error, #dc3545);">
                🗑️
              </button>
            </div>
          </div>
          <div class="card-details">
            <div class="card-detail">
              <strong>Invited:</strong> ${date}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    listEl.innerHTML = html;
    
    // Attach event listeners
    attachUserEventListeners();
  }
  
  function attachUserEventListeners() {
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.target.closest('.btn-delete-user').dataset.userEmail;
        const user = invitedUsersData.find(u => u.email === email);
        if (user) {
          removeInvitedUser(user);
        }
      });
    });
  }
  
  /* ── Add User Form ───────────────────────────────────────── */
  $('#btn-add-user')?.addEventListener('click', () => {
    showModal('#modal-add-user');
    resetAddUserForm();
  });
  
  $('#close-add-user')?.addEventListener('click', () => {
    hideModal('#modal-add-user');
  });
  
  $('#cancel-add-user')?.addEventListener('click', () => {
    hideModal('#modal-add-user');
  });
  
  $('#modal-add-user')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-add-user') {
      hideModal('#modal-add-user');
    }
  });
  
  function resetAddUserForm() {
    $('#form-add-user').reset();
    clearFormErrors('add-user');
    $('#add-user-error-banner').style.display = 'none';
  }
  
  $('#form-add-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('add-user');
    
    const email = $('#add-user-email').value.trim().toLowerCase();
    
    // Validation
    let hasErrors = false;
    
    if (!email) {
      showFieldError('add-user-email', 'Email is required');
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('add-user-email', 'Please enter a valid email address');
      hasErrors = true;
    } else {
      // Check for duplicate email
      const existing = invitedUsersData.find(u => u.email.toLowerCase() === email);
      if (existing) {
        showFieldError('add-user-email', 'This email is already invited');
        hasErrors = true;
      }
    }
    
    if (hasErrors) return;
    
    // Submit
    try {
      const { error } = await supabase
        .from('invited_users')
        .insert({ email })
        .select()
        .single();
      
      if (error) throw error;
      
      hideModal('#modal-add-user');
      await loadInvitedUsers();
      showToast('✅ User invited successfully', 4000);
    } catch (err) {
      console.error('[Scout] Error adding user:', err);
      $('#add-user-error-banner').textContent = err.message || 'Failed to add user. Please try again.';
      $('#add-user-error-banner').style.display = 'block';
    }
  });
  
  /* ── Remove Invited User ─────────────────────────────────── */
  async function removeInvitedUser(user) {
    if (!confirm(`Are you sure you want to remove "${user.email}" from the invited users list?\n\nThey will no longer be able to sign in to the portal.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('invited_users')
        .delete()
        .eq('email', user.email);
      
      if (error) throw error;
      
      showToast(`✅ ${user.email} removed from invited users`, 4000);
      await loadInvitedUsers();
    } catch (err) {
      console.error('[Scout] Error removing user:', err);
      showToast('Failed to remove user. Please try again.', 4000);
    }
  }
  
  /* ── Users Management (Admin Only) ───────────────────────── */
  let invitedUsersData = [];
  
  async function loadInvitedUsers() {
    const loadingEl = $('#users-loading');
    const errorEl = $('#users-error');
    const listEl = $('#users-list');
    const emptyEl = $('#users-empty');
    const actionBar = $('#users-action-bar');
    
    loadingEl.style.display = 'flex';
    errorEl.style.display = 'none';
    listEl.innerHTML = '';
    emptyEl.style.display = 'none';
    
    // Check if user is Admin
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Access denied. Admin only.';
      return;
    }
    
    // Show add button for Admin
    actionBar.style.display = 'block';
    
    try {
      const { data, error } = await supabase
        .from('invited_users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      invitedUsersData = data || [];
      renderInvitedUsers();
      
      loadingEl.style.display = 'none';
    } catch (err) {
      console.error('[Scout] Error loading invited users:', err);
      loadingEl.style.display = 'none';
      errorEl.style.display = 'flex';
      errorEl.querySelector('.error-text').textContent = 'Failed to load users. Please try again.';
    }
  }
  
  function renderInvitedUsers() {
    const listEl = $('#users-list');
    const emptyEl = $('#users-empty');
    
    if (invitedUsersData.length === 0) {
      listEl.innerHTML = '';
      emptyEl.style.display = 'flex';
      return;
    }
    
    emptyEl.style.display = 'none';
    
    let html = '<div class="cards-grid">';
    invitedUsersData.forEach(user => {
      const date = new Date(user.created_at).toLocaleDateString();
      html += `
        <div class="participant-card" data-user-email="${escapeHtml(user.email)}">
          <div class="card-header">
            <h3 class="card-name">${escapeHtml(user.email)}</h3>
            <div class="card-actions">
              <button class="btn-icon btn-delete-user" data-user-email="${escapeHtml(user.email)}" aria-label="Remove user" style="color: var(--color-error, #dc3545);">
                🗑️
              </button>
            </div>
          </div>
          <div class="card-details">
            <div class="card-detail">
              <strong>Invited:</strong> ${date}
            </div>
          </div>
        </div>
      `;
    });
    html += '</div>';
    
    listEl.innerHTML = html;
    
    // Attach event listeners
    attachUserEventListeners();
  }
  
  function attachUserEventListeners() {
    document.querySelectorAll('.btn-delete-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const email = e.target.closest('.btn-delete-user').dataset.userEmail;
        const user = invitedUsersData.find(u => u.email === email);
        if (user) {
          removeInvitedUser(user);
        }
      });
    });
  }
  
  /* ── Add User Form ───────────────────────────────────────── */
  $('#btn-add-user')?.addEventListener('click', () => {
    showModal('#modal-add-user');
    resetAddUserForm();
  });
  
  $('#close-add-user')?.addEventListener('click', () => {
    hideModal('#modal-add-user');
  });
  
  $('#cancel-add-user')?.addEventListener('click', () => {
    hideModal('#modal-add-user');
  });
  
  $('#modal-add-user')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-add-user') {
      hideModal('#modal-add-user');
    }
  });
  
  function resetAddUserForm() {
    $('#form-add-user').reset();
    clearFormErrors('add-user');
    $('#add-user-error-banner').style.display = 'none';
  }
  
  $('#form-add-user')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors('add-user');
    
    const email = $('#add-user-email').value.trim().toLowerCase();
    
    // Validation
    let hasErrors = false;
    
    if (!email) {
      showFieldError('add-user-email', 'Email is required');
      hasErrors = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('add-user-email', 'Please enter a valid email address');
      hasErrors = true;
    } else {
      // Check for duplicate email
      const existing = invitedUsersData.find(u => u.email.toLowerCase() === email);
      if (existing) {
        showFieldError('add-user-email', 'This email is already invited');
        hasErrors = true;
      }
    }
    
    if (hasErrors) return;
    
    // Submit
    try {
      const { error } = await supabase
        .from('invited_users')
        .insert({ email })
        .select()
        .single();
      
      if (error) throw error;
      
      hideModal('#modal-add-user');
      await loadInvitedUsers();
      showToast('✅ User invited successfully', 4000);
    } catch (err) {
      console.error('[Scout] Error adding user:', err);
      $('#add-user-error-banner').textContent = err.message || 'Failed to add user. Please try again.';
      $('#add-user-error-banner').style.display = 'block';
    }
  });
  
  /* ── Remove Invited User ─────────────────────────────────── */
  async function removeInvitedUser(user) {
    if (!confirm(`Are you sure you want to remove "${user.email}" from the invited users list?\n\nThey will no longer be able to sign in to the portal.`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('invited_users')
        .delete()
        .eq('email', user.email);
      
      if (error) throw error;
      
      showToast(`✅ ${user.email} removed from invited users`, 4000);
      await loadInvitedUsers();
    } catch (err) {
      console.error('[Scout] Error removing user:', err);
      showToast('Failed to remove user. Please try again.', 4000);
    }
  }
  
  // Retry handler for users screen
  $('#users-retry')?.addEventListener('click', () => {
    loadInvitedUsers();
  });
  
  /* ── Edit Meeting (Inline) ────────────────────────────────── */
  async function editMeeting(meeting) {
    // Check if attendance has been taken
    const { data: attendance } = await supabase
      .from('attendance')
      .select('id')
      .eq('meeting_id', meeting.id)
      .limit(1);
    
    if (attendance && attendance.length > 0) {
      showToast('Cannot edit meeting - attendance has already been taken', 4000);
      return;
    }
    
    const card = document.querySelector(`[data-meeting-id="${meeting.id}"]`);
    if (!card) return;
    
    card.classList.add('editing');
    
    // Load leaders for multi-select
    const { data: leaders } = await supabase
      .from('leaders')
      .select('id, name, email')
      .eq('active', true)
      .order('name');
    
    const groups = meeting.scout_groups || [];
    const group1Checked = groups.includes('Group 1');
    const group2Checked = groups.includes('Group 2');
    const assignedLeaders = meeting.assigned_leaders || [];
    
    card.innerHTML = `
      <form class="card-form" data-meeting-id="${meeting.id}">
        <div class="form-row">
          <label>Date *</label>
          <input type="date" name="date" value="${meeting.date}" required />
          <div class="form-error" id="edit-meeting-${meeting.id}-date-error"></div>
        </div>
        <div class="form-row">
          <label>Location *</label>
          <input type="text" name="location" value="${escapeHtml(meeting.location || '')}" required />
          <div class="form-error" id="edit-meeting-${meeting.id}-location-error"></div>
        </div>
        <div class="form-row">
          <label>Scout Groups *</label>
          <div class="checkbox-group-inline">
            <label class="checkbox-inline">
              <input type="checkbox" name="group1" value="Group 1" ${group1Checked ? 'checked' : ''} />
              <span>Group 1</span>
            </label>
            <label class="checkbox-inline">
              <input type="checkbox" name="group2" value="Group 2" ${group2Checked ? 'checked' : ''} />
              <span>Group 2</span>
            </label>
          </div>
          <div class="form-error" id="edit-meeting-${meeting.id}-groups-error"></div>
        </div>
        <div class="form-row">
          <label>Assigned Leaders *</label>
          <select name="leaders" multiple size="5" required id="edit-meeting-${meeting.id}-leaders">
            ${leaders ? leaders.map(leader => 
              `<option value="${leader.id}" ${assignedLeaders.includes(leader.id) ? 'selected' : ''}>${escapeHtml(leader.name)} (${escapeHtml(leader.email)})</option>`
            ).join('') : ''}
          </select>
          <div class="form-error" id="edit-meeting-${meeting.id}-leaders-error"></div>
          <p class="helper-text">Hold Ctrl/Cmd to select multiple leaders</p>
        </div>
        <div class="form-row">
          <label>Notes (optional)</label>
          <textarea name="notes" rows="3">${escapeHtml(meeting.notes || '')}</textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary btn-sm btn-cancel-edit-meeting" data-meeting-id="${meeting.id}">Cancel</button>
          <button type="submit" class="btn btn-primary btn-sm">Save</button>
        </div>
      </form>
    `;
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    card.querySelector('input[type="date"]').setAttribute('min', today);
    
    // Cancel handler
    card.querySelector('.btn-cancel-edit-meeting')?.addEventListener('click', () => {
      card.classList.remove('editing');
      renderMeetings();
    });
    
    // Submit handler
    card.querySelector('form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = new FormData(form);
      
      const date = formData.get('date');
      const location = formData.get('location').trim();
      const group1 = formData.get('group1') === 'Group 1';
      const group2 = formData.get('group2') === 'Group 2';
      const leadersSelect = form.querySelector('select[name="leaders"]');
      const notes = formData.get('notes').trim();
      
      const scoutGroups = [];
      if (group1) scoutGroups.push('Group 1');
      if (group2) scoutGroups.push('Group 2');
      
      const selectedLeaders = Array.from(leadersSelect.selectedOptions).map(opt => opt.value);
      
      // Validation
      let hasErrors = false;
      clearEditMeetingErrors(meeting.id);
      
      if (!date) {
        showEditMeetingError(meeting.id, 'date', 'Date is required');
        hasErrors = true;
      } else {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
          showEditMeetingError(meeting.id, 'date', 'Date must be in the future');
          hasErrors = true;
        } else {
          // Check for duplicate date (exclude current meeting)
          const { data: existing } = await supabase
            .from('meetings')
            .select('id')
            .eq('date', date)
            .neq('id', meeting.id)
            .maybeSingle();
          
          if (existing) {
            showEditMeetingError(meeting.id, 'date', 'A meeting already exists on this date');
            hasErrors = true;
          }
        }
      }
      
      if (!location) {
        showEditMeetingError(meeting.id, 'location', 'Location is required');
        hasErrors = true;
      }
      
      if (scoutGroups.length === 0) {
        showEditMeetingError(meeting.id, 'groups', 'Please select at least one scout group');
        hasErrors = true;
      }
      
      if (selectedLeaders.length === 0) {
        showEditMeetingError(meeting.id, 'leaders', 'Please select at least one leader');
        hasErrors = true;
      }
      
      if (hasErrors) return;
      
      // Update
      try {
        const { error } = await supabase
          .from('meetings')
          .update({
            date,
            location,
            scout_groups: scoutGroups,
            assigned_leaders: selectedLeaders,
            notes: notes || null
          })
          .eq('id', meeting.id);
        
        if (error) throw error;
        
        showToast('✅ Meeting updated successfully');
        await loadMeetings();
      } catch (err) {
        console.error('[Scout] Error updating meeting:', err);
        showToast('Failed to update meeting. Please try again.', 4000);
      }
    });
  }
  
  function showEditMeetingError(meetingId, field, message) {
    const errorEl = $(`#edit-meeting-${meetingId}-${field}-error`);
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }
  
  function clearEditMeetingErrors(meetingId) {
    ['date', 'location', 'groups', 'leaders'].forEach(field => {
      const errorEl = $(`#edit-meeting-${meetingId}-${field}-error`);
      if (errorEl) {
        errorEl.textContent = '';
        errorEl.style.display = 'none';
      }
    });
  }
  
  /* ── Attendance Taking ──────────────────────────────────────── */
  let selectedMeeting = null;
  let attendanceData = {
    scouts: [],
    leaders: [],
    existingAttendance: {} // Map of { scout_id: { status, points_earned }, leader_id: { status, points_earned } }
  };
  
  async function openAttendanceScreen(meeting) {
    // Check permission
    if (!(await canTakeAttendance())) {
      showToast('You do not have permission to take attendance.', 3000);
      return;
    }
    
    // Check if meeting date is today or future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const meetingDate = new Date(meeting.date);
    meetingDate.setHours(0, 0, 0, 0);
    
    if (meetingDate < today) {
      showToast('Cannot take attendance for past meetings.', 3000);
      return;
    }
    
    selectedMeeting = meeting;
    showScreen('attendance', 'left');
    
    // Load meetings for calendar/list
    await loadAttendanceMeetings();
    
    // Load attendance data for selected meeting
    await loadAttendanceData();
  }
  
  async function loadAttendanceMeetings() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Get user's groups if Leader
      const role = await getUserRole();
      let groupsFilter = null;
      
      if (role === 'Leader') {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: leader } = await supabase
            .from('leaders')
            .select('scout_groups')
            .eq('user_id', user.id)
            .eq('active', true)
            .maybeSingle();
          
          if (leader && leader.scout_groups && leader.scout_groups.length > 0) {
            groupsFilter = leader.scout_groups;
          }
        }
      }
      
      // Build query
      let query = supabase
        .from('meetings')
        .select('*')
        .gte('date', today.toISOString().split('T')[0])
        .order('date', { ascending: true });
      
      if (groupsFilter) {
        query = query.overlaps('scout_groups', groupsFilter);
      }
      
      const { data: meetings, error } = await query;
      
      if (error) throw error;
      
      // Render calendar and list
      renderAttendanceCalendar(meetings || []);
      renderAttendanceMeetingsList(meetings || []);
    } catch (err) {
      console.error('[Scout] Error loading attendance meetings:', err);
      showToast('Failed to load meetings. Please try again.', 3000);
    }
  }
  
  function renderAttendanceCalendar(meetings) {
    const calendarEl = $('#attendance-calendar');
    if (!calendarEl) return;
    
    // Simple calendar - just show current month
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Get first day of month and number of days
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    
    // Create calendar HTML
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let html = `<div class="calendar-header">`;
    html += `<button class="btn-icon btn-calendar-prev" id="btn-calendar-prev">←</button>`;
    html += `<h3>${monthNames[currentMonth]} ${currentYear}</h3>`;
    html += `<button class="btn-icon btn-calendar-next" id="btn-calendar-next">→</button>`;
    html += `</div>`;
    
    html += `<div class="calendar-grid">`;
    // Day headers
    dayNames.forEach(day => {
      html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      html += `<div class="calendar-day empty"></div>`;
    }
    
    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Check if this date has a meeting
      const hasMeeting = meetings.some(m => {
        const meetingDate = new Date(m.date);
        return meetingDate.toISOString().split('T')[0] === dateStr;
      });
      
      // Check if this date is today or future
      const isToday = dateStr === today.toISOString().split('T')[0];
      const isFuture = date > today;
      const isSelectable = isToday || isFuture;
      
      // Check if this is the selected meeting date
      const isSelected = selectedMeeting && 
        new Date(selectedMeeting.date).toISOString().split('T')[0] === dateStr;
      
      html += `<div class="calendar-day ${hasMeeting ? 'has-meeting' : ''} ${isSelectable ? 'selectable' : ''} ${isSelected ? 'selected' : ''}" 
                     data-date="${dateStr}" 
                     ${isSelectable ? '' : 'style="opacity: 0.3; cursor: not-allowed;"'}>`;
      html += `<span class="day-number">${day}</span>`;
      if (hasMeeting) {
        html += `<span class="meeting-indicator">●</span>`;
      }
      html += `</div>`;
    }
    
    html += `</div>`;
    
    calendarEl.innerHTML = html;
    
    // Attach click handlers
    document.querySelectorAll('.calendar-day.selectable').forEach(dayEl => {
      dayEl.addEventListener('click', () => {
        const dateStr = dayEl.dataset.date;
        const meeting = meetings.find(m => {
          const meetingDate = new Date(m.date);
          return meetingDate.toISOString().split('T')[0] === dateStr;
        });
        
        if (meeting) {
          selectedMeeting = meeting;
          loadAttendanceData();
          updateSelectedMeetingDisplay();
        }
      });
    });
  }
  
  function renderAttendanceMeetingsList(meetings) {
    const listEl = $('#attendance-meetings-list');
    if (!listEl) return;
    
    if (meetings.length === 0) {
      listEl.innerHTML = '<p class="empty-text">No upcoming meetings</p>';
      return;
    }
    
    let html = '';
    meetings.forEach(meeting => {
      const date = new Date(meeting.date);
      const dateFormatted = formatMeetingDate(date);
      const groups = (meeting.scout_groups || []).join(', ') || 'Not assigned';
      const isSelected = selectedMeeting && selectedMeeting.id === meeting.id;
      
      html += `
        <div class="meeting-list-item ${isSelected ? 'selected' : ''}" 
             data-meeting-id="${meeting.id}">
          <div class="meeting-item-date">${dateFormatted}</div>
          <div class="meeting-item-details">
            <div>${escapeHtml(meeting.location || 'No location')}</div>
            <div class="meeting-item-groups">${escapeHtml(groups)}</div>
          </div>
        </div>
      `;
    });
    
    listEl.innerHTML = html;
    
    // Attach click handlers
    document.querySelectorAll('.meeting-list-item').forEach(item => {
      item.addEventListener('click', () => {
        const meetingId = item.dataset.meetingId;
        const meeting = meetings.find(m => m.id === meetingId);
        if (meeting) {
          selectedMeeting = meeting;
          loadAttendanceData();
          updateSelectedMeetingDisplay();
        }
      });
    });
  }
  
  function updateSelectedMeetingDisplay() {
    if (!selectedMeeting) return;
    
    const infoEl = $('#selected-meeting-info');
    const titleEl = $('#selected-meeting-title');
    const dateEl = $('#selected-meeting-date');
    const locationEl = $('#selected-meeting-location');
    const groupsEl = $('#selected-meeting-groups');
    
    if (infoEl) infoEl.style.display = 'block';
    if (titleEl) titleEl.textContent = formatMeetingDate(new Date(selectedMeeting.date));
    if (dateEl) dateEl.textContent = formatMeetingDate(new Date(selectedMeeting.date));
    if (locationEl) locationEl.textContent = selectedMeeting.location || 'Not specified';
    if (groupsEl) groupsEl.textContent = (selectedMeeting.scout_groups || []).join(', ') || 'Not assigned';
    
    // Update selected state in list
    document.querySelectorAll('.meeting-list-item').forEach(item => {
      if (item.dataset.meetingId === selectedMeeting.id) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }
  
  async function loadAttendanceData() {
    if (!selectedMeeting) return;
    
    const loadingEl = $('#attendance-loading');
    if (loadingEl) loadingEl.style.display = 'block';
    
    try {
      // Load scouts for meeting's groups
      const scoutGroups = selectedMeeting.scout_groups || [];
      if (scoutGroups.length === 0) {
        showToast('Meeting has no scout groups assigned.', 3000);
        return;
      }
      
      const { data: scouts, error: scoutsError } = await supabase
        .from('scouts')
        .select('*')
        .in('scout_group', scoutGroups)
        .order('name', { ascending: true });
      
      if (scoutsError) throw scoutsError;
      
      // Load leaders for meeting's groups
      const { data: leaders, error: leadersError } = await supabase
        .from('leaders')
        .select('*')
        .eq('active', true)
        .overlaps('scout_groups', scoutGroups)
        .order('name', { ascending: true });
      
      if (leadersError) throw leadersError;
      
      // Load existing attendance records (scouts only for now)
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .eq('meeting_id', selectedMeeting.id);
      
      if (attendanceError) throw attendanceError;
      
      // Map attendance by scout_id
      const attendanceMap = {};
      (attendance || []).forEach(record => {
        if (record.scout_id) {
          attendanceMap[`scout_${record.scout_id}`] = {
            status: record.status,
            points_earned: record.points_earned || 0
          };
        }
        // Leader attendance not stored in database for v1
      });
      
      attendanceData.scouts = scouts || [];
      attendanceData.leaders = leaders || [];
      attendanceData.existingAttendance = attendanceMap;
      
      // Render attendance lists
      renderScoutsAttendanceList();
      renderLeadersAttendanceList();
      
      updateSelectedMeetingDisplay();
    } catch (err) {
      console.error('[Scout] Error loading attendance data:', err);
      showToast('Failed to load attendance data. Please try again.', 3000);
    } finally {
      if (loadingEl) loadingEl.style.display = 'none';
    }
  }
  
  function renderScoutsAttendanceList() {
    const listEl = $('#scouts-attendance-list');
    const sectionEl = $('#scouts-attendance-section');
    
    if (!listEl || !sectionEl) return;
    
    if (attendanceData.scouts.length === 0) {
      sectionEl.style.display = 'none';
      return;
    }
    
    sectionEl.style.display = 'block';
    
    // Group scouts by scout_group
    const grouped = {};
    attendanceData.scouts.forEach(scout => {
      const group = scout.scout_group || 'Unknown';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(scout);
    });
    
    let html = '';
    
    Object.keys(grouped).sort().forEach(group => {
      html += `<div class="attendance-group">`;
      html += `<h3 class="group-header">${escapeHtml(group)}</h3>`;
      html += `<div class="attendance-group-list">`;
      
      grouped[group].forEach(scout => {
        const existing = attendanceData.existingAttendance[`scout_${scout.id}`];
        const isSaved = !!existing;
        const status = existing ? existing.status : null;
        const pointsEarned = existing ? existing.points_earned : 0;
        
        html += renderAttendanceItem('scout', scout.id, scout.name, status, pointsEarned, isSaved);
      });
      
      html += `</div></div>`;
    });
    
    listEl.innerHTML = html;
    
    // Attach event listeners
    attachAttendanceEventListeners('scout');
  }
  
  function renderLeadersAttendanceList() {
    const listEl = $('#leaders-attendance-list');
    const sectionEl = $('#leaders-attendance-section');
    
    if (!listEl || !sectionEl) return;
    
    if (attendanceData.leaders.length === 0) {
      sectionEl.style.display = 'none';
      return;
    }
    
    sectionEl.style.display = 'block';
    
    let html = '';
    
    attendanceData.leaders.forEach(leader => {
      // For leaders, we'll use a different key pattern
      const existing = attendanceData.existingAttendance[`leader_${leader.id}`];
      const isSaved = !!existing;
      const status = existing ? existing.status : null;
      const pointsEarned = existing ? existing.points_earned : 0;
      
      html += renderAttendanceItem('leader', leader.id, leader.name, status, pointsEarned, isSaved);
    });
    
    listEl.innerHTML = html;
    
    // Attach event listeners
    attachAttendanceEventListeners('leader');
  }
  
  function renderAttendanceItem(type, id, name, status, pointsEarned, isSaved) {
    const statusClass = status === 'Present' ? 'present' : status === 'Absent' ? 'absent' : '';
    const disabledAttr = isSaved ? 'disabled' : '';
    const savedIndicator = isSaved ? '<span class="saved-indicator">✓ Saved</span>' : '';
    
    return `
      <div class="attendance-item" data-type="${type}" data-id="${id}">
        <div class="attendance-item-name">${escapeHtml(name)}${savedIndicator}</div>
        <div class="attendance-item-controls">
          <div class="attendance-toggle ${statusClass}" data-status="${status || 'unmarked'}" ${disabledAttr}>
            <button class="toggle-btn toggle-present ${status === 'Present' ? 'active' : ''}" 
                    ${disabledAttr} 
                    aria-label="Mark as present">
              ✓ Present
            </button>
            <button class="toggle-btn toggle-absent ${status === 'Absent' ? 'active' : ''}" 
                    ${disabledAttr} 
                    aria-label="Mark as absent">
              ✗ Absent
            </button>
          </div>
          <div class="activity-points-input">
            <label>Activity Points:</label>
            <input type="number" 
                   class="points-input" 
                   data-type="${type}" 
                   data-id="${id}" 
                   value="${pointsEarned > 0 ? pointsEarned - (status === 'Present' ? 1 : 0) : ''}" 
                   min="0" 
                   step="1" 
                   placeholder="0"
                   ${disabledAttr}>
          </div>
          <div class="attendance-feedback" data-feedback-id="${type}-${id}"></div>
        </div>
      </div>
    `;
  }
  
  function attachAttendanceEventListeners(type) {
    // Toggle buttons
    document.querySelectorAll(`.attendance-item[data-type="${type}"] .toggle-btn`).forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (btn.disabled) return;
        
        const item = btn.closest('.attendance-item');
        const id = item.dataset.id;
        const isPresent = btn.classList.contains('toggle-present');
        const status = isPresent ? 'Present' : 'Absent';
        
        await saveAttendance(type, id, status);
      });
    });
    
    // Activity points input
    document.querySelectorAll(`.attendance-item[data-type="${type}"] .points-input`).forEach(input => {
      input.addEventListener('blur', async (e) => {
        if (input.disabled) return;
        
        const item = input.closest('.attendance-item');
        const id = item.dataset.id;
        const statusEl = item.querySelector('.attendance-toggle');
        const currentStatus = statusEl.dataset.status;
        
        if (currentStatus && currentStatus !== 'unmarked') {
          // Re-save with updated activity points
          await saveAttendance(type, id, currentStatus, parseInt(input.value) || 0);
        }
      });
    });
  }
  
  async function saveAttendance(type, id, status, activityPoints = 0) {
    if (!selectedMeeting) return;
    
    const item = $(`.attendance-item[data-type="${type}"][data-id="${id}"]`);
    if (!item) return;
    
    const feedbackEl = item.querySelector('.attendance-feedback');
    const toggleEl = item.querySelector('.attendance-toggle');
    const presentBtn = item.querySelector('.toggle-present');
    const absentBtn = item.querySelector('.toggle-absent');
    const pointsInput = item.querySelector('.points-input');
    
    // Show loading state
    if (feedbackEl) {
      feedbackEl.innerHTML = '<span class="loading-indicator">Saving...</span>';
      feedbackEl.style.display = 'block';
    }
    
    if (presentBtn) presentBtn.disabled = true;
    if (absentBtn) absentBtn.disabled = true;
    if (pointsInput) pointsInput.disabled = true;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Calculate points_earned
      const basePoints = status === 'Present' ? 1 : 0;
      const pointsEarned = basePoints + activityPoints;
      
      // Get the leader record for the current user (for leader_id field)
      const { data: leaderRecord } = await supabase
        .from('leaders')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      // For leaders, we can't store attendance in the current schema
      // The attendance table only supports scout attendance
      // Leader attendance tracking would require a schema change
      if (type === 'leader') {
        // For v1, leader attendance is UI-only (not persisted)
        // Show success feedback but don't save to database
        const item = $(`.attendance-item[data-type="${type}"][data-id="${id}"]`);
        if (item) {
          const feedbackEl = item.querySelector('.attendance-feedback');
          const toggleEl = item.querySelector('.attendance-toggle');
          const presentBtn = item.querySelector('.toggle-present');
          const absentBtn = item.querySelector('.toggle-absent');
          
          toggleEl.dataset.status = status;
          toggleEl.classList.remove('present', 'absent');
          toggleEl.classList.add(status.toLowerCase());
          
          if (presentBtn) {
            presentBtn.classList.toggle('active', status === 'Present');
            presentBtn.disabled = false;
          }
          if (absentBtn) {
            absentBtn.classList.toggle('active', status === 'Absent');
            absentBtn.disabled = false;
          }
          
          if (feedbackEl) {
            feedbackEl.innerHTML = '<span class="success-indicator">✓ Saved (UI only)</span>';
            setTimeout(() => {
              feedbackEl.style.display = 'none';
            }, 2000);
          }
        }
        return; // Don't save leader attendance to database in v1
      }
      
      // Upsert attendance record (scouts only)
      const attendanceRecord = {
        scout_id: id,
        meeting_id: selectedMeeting.id,
        status: status,
        points_earned: pointsEarned,
        recorded_by: user.id,
        leader_id: leaderRecord ? leaderRecord.id : null // Leader who took attendance
      };
      
      // Use upsert with conflict resolution on unique constraint
      const { error: attendanceError } = await supabase
        .from('attendance')
        .upsert(attendanceRecord, {
          onConflict: 'scout_id,meeting_id'
        });
      
      if (attendanceError) throw attendanceError;
      
      // Update scout's points_total
      // Get current scout points and existing attendance points
      const { data: scout } = await supabase
        .from('scouts')
        .select('points_total')
        .eq('id', id)
        .single();
      
      if (scout) {
        // Calculate points difference
        const existing = attendanceData.existingAttendance[`scout_${id}`];
        const previousPoints = existing ? existing.points_earned : 0;
        const pointsDifference = pointsEarned - previousPoints;
        
        // Update points_total (add difference, can be negative if changing from Present to Absent)
        const newTotal = Math.max(0, (scout.points_total || 0) + pointsDifference);
        
        const { error: updateError } = await supabase
          .from('scouts')
          .update({ points_total: newTotal })
          .eq('id', id);
        
        if (updateError) throw updateError;
      }
      
      // Update UI
      toggleEl.dataset.status = status;
      toggleEl.classList.remove('present', 'absent');
      toggleEl.classList.add(status.toLowerCase());
      
      if (presentBtn) {
        presentBtn.classList.toggle('active', status === 'Present');
        presentBtn.disabled = false;
      }
      if (absentBtn) {
        absentBtn.classList.toggle('active', status === 'Absent');
        absentBtn.disabled = false;
      }
      if (pointsInput) pointsInput.disabled = false;
      
      // Show success feedback
      if (feedbackEl) {
        feedbackEl.innerHTML = '<span class="success-indicator">✓ Saved</span>';
        setTimeout(() => {
          feedbackEl.style.display = 'none';
        }, 2000);
      }
      
      // Update existing attendance map
      attendanceData.existingAttendance[`${type}_${id}`] = {
        status: status,
        points_earned: pointsEarned
      };
      
    } catch (err) {
      console.error('[Scout] Error saving attendance:', err);
      
      // Show error feedback
      if (feedbackEl) {
        feedbackEl.innerHTML = `<span class="error-indicator">✗ Failed. <button class="retry-btn" onclick="window.retrySaveAttendance('${type}', '${id}', '${status}', ${activityPoints})">Retry</button></span>`;
        feedbackEl.style.display = 'block';
      }
      
      if (presentBtn) presentBtn.disabled = false;
      if (absentBtn) absentBtn.disabled = false;
      if (pointsInput) pointsInput.disabled = false;
    }
  }
  
  // Make retry function available globally
  window.retrySaveAttendance = saveAttendance;
  
  /* ── Points Recalculation ──────────────────────────────────── */
  async function recalculateAllPoints() {
    const btn = $('#btn-recalculate-points');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '🔄 Recalculating...';
    }
    
    try {
      // Check if user is admin
      if (!(await isAdmin())) {
        throw new Error('Only admins can recalculate points');
      }
      
      // Get all attendance records grouped by scout_id
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from('attendance')
        .select('scout_id, points_earned');
      
      if (attendanceError) throw attendanceError;
      
      // Calculate total points for each scout
      const pointsByScout = {};
      (attendanceRecords || []).forEach(record => {
        if (record.scout_id) {
          if (!pointsByScout[record.scout_id]) {
            pointsByScout[record.scout_id] = 0;
          }
          pointsByScout[record.scout_id] += (record.points_earned || 0);
        }
      });
      
      // Get all scouts
      const { data: scouts, error: scoutsError } = await supabase
        .from('scouts')
        .select('id');
      
      if (scoutsError) throw scoutsError;
      
      // Update points_total for each scout
      let updated = 0;
      let errors = 0;
      
      for (const scout of scouts || []) {
        const calculatedTotal = pointsByScout[scout.id] || 0;
        
        const { error: updateError } = await supabase
          .from('scouts')
          .update({ points_total: calculatedTotal })
          .eq('id', scout.id);
        
        if (updateError) {
          console.error(`[Scout] Error updating points for scout ${scout.id}:`, updateError);
          errors++;
        } else {
          updated++;
        }
      }
      
      // Reload scouts list to show updated points
      await loadScouts();
      
      showToast(`✅ Points recalculated: ${updated} scouts updated${errors > 0 ? `, ${errors} errors` : ''}`, 4000);
      
    } catch (err) {
      console.error('[Scout] Error recalculating points:', err);
      showToast('Failed to recalculate points. Please try again.', 4000);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🔄 Recalculate Points';
      }
    }
  }
  
  /* ── Kick off ─────────────────────────────────────────────── */
  initSplash();

})();
