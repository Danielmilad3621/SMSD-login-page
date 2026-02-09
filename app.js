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
  };

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
  
  /* ── Setup navigation menu ─────────────────────────────────── */
  async function setupNavigation() {
    const navMenu = $('#nav-menu');
    const dashboardHelper = $('#dashboard-helper');
    
    if (await canManageParticipants()) {
      navMenu.style.display = 'flex';
      dashboardHelper.style.display = 'none';
    } else {
      navMenu.style.display = 'none';
      dashboardHelper.style.display = 'block';
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
      // First, we need to get or create the user in auth.users
      // For now, we'll create the leader without user_id (can be linked later)
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
      
      if (leaderError) throw leaderError;
      
      // If we have a user_id (from email lookup), create role
      // For now, we'll need to handle this differently
      // The leader needs to be linked to a user account first
      // This is a limitation - we'll need to handle user creation separately
      
      hideModal('#modal-add-leader');
      showToast('✅ Leader added successfully');
      await loadLeaders();
    } catch (err) {
      console.error('[Scout] Error adding leader:', err);
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
        if (isAdminUser && role && leader.user_id) {
          const { error: roleError } = await supabase
            .from('roles')
            .upsert({ user_id: leader.user_id, role }, { onConflict: 'user_id' });
          
          if (roleError) {
            console.error('[Scout] Error updating role:', roleError);
            // Don't fail the whole update if role update fails
          }
        }
        
        showToast('✅ Leader updated successfully');
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
  
  /* ── Kick off ─────────────────────────────────────────────── */
  initSplash();

})();
