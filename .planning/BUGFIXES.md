# Bug Fixes Plan

**Date:** 2025-02-09  
**Issues:** 3 critical bugs reported

## Issues Identified

### Issue 1: Website Frozen on Landing Page After Refresh
**Symptoms:** Page freezes on splash screen after refresh  
**Root Cause:** 
- `screens` object may contain null values if DOM elements don't exist
- `initSplash()` accesses `screens.splash.querySelector()` without null check
- If async session check fails, no error handling to transition to login

**Fix:**
1. Add null checks for all screen elements
2. Add error handling in `initSplash()` async function
3. Add fallback to show login screen if splash fails
4. Ensure screens are properly initialized before use

### Issue 2: Leader Role Assignment Not Working
**Symptoms:** Adding leader with role (e.g., "Admin Leader") fails to save  
**Root Cause:**
- Code creates leader record but **doesn't create role record** in `roles` table
- Comment in code says "we'll need to handle this differently"
- Role assignment logic is incomplete (lines 912-915)

**Fix:**
1. Complete role assignment logic in leader creation
2. Insert role into `roles` table after leader is created
3. Handle case where leader doesn't have user_id (role still needs to be created)
4. Add proper error handling for role creation

### Issue 3: Meeting Creation Failing with Cache Issue
**Symptoms:** Cannot add meetings, cache-related error  
**Root Cause:**
- `meetingsData` global variable may be stale
- `loadMeetings()` may not be called properly after add
- Form may be using cached/old data
- Error handling may not clear cache properly

**Fix:**
1. Clear `meetingsData` before reloading
2. Ensure `loadMeetings()` is called after successful add
3. Reset form state after add
4. Add proper error handling that clears cache on failure
5. Check for duplicate date validation issues

## Implementation Plan

### Task 1: Fix Splash Screen Freeze

**Files:** `app.js`

**Changes:**
1. Add null checks for screen elements
2. Wrap `initSplash()` in try-catch
3. Add fallback to login screen on error
4. Ensure screens object is safe to use

**Code:**
```javascript
// Add null checks
const screens = {
  splash: $('#splash'),
  login: $('#login'),
  // ... etc
};

// Validate screens exist
if (!screens.splash || !screens.login) {
  console.error('[Scout] Critical: Screen elements not found');
  return;
}

// In initSplash, add error handling
function initSplash() {
  if (!screens.splash) {
    showScreen('login', 'left');
    return;
  }
  
  const logo = screens.splash.querySelector('.splash-logo');
  if (!logo) {
    showScreen('login', 'left');
    return;
  }
  
  // ... rest of function with try-catch
}
```

### Task 2: Fix Leader Role Assignment

**Files:** `app.js`

**Changes:**
1. Complete role creation logic after leader creation
2. Insert into `roles` table with proper user_id handling
3. Add error handling for role creation
4. Handle case where user doesn't exist yet

**Code:**
```javascript
// After leader creation (line 910)
if (leaderError) throw leaderError;

// Create role record
// Note: If leader doesn't have user_id, we need to handle this
// For now, we'll create role with null user_id and link later
// OR: Only allow role assignment if user exists

const isAdmin = await isAdmin(); // Check if current user is admin
if (isAdmin && role) {
  // Try to find user by email first
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  // Or use a different approach - check if user exists in auth.users
  
  // For v1: Create role with leader's email as reference
  // User can link account later
  // OR: Require user to exist first
  
  // Insert role (if user_id exists, use it; otherwise, we'll need to link later)
  // This is a limitation - roles table requires user_id
  // Solution: Only allow role assignment if user account exists
}
```

**Better Solution:**
- Check if user exists in auth.users by email
- If exists, create role with user_id
- If not, show message: "User must sign in first to assign role"
- OR: Create role with placeholder and link later

### Task 3: Fix Meeting Creation Cache Issue

**Files:** `app.js`

**Changes:**
1. Clear `meetingsData` before reload
2. Ensure proper error handling
3. Reset form state
4. Check duplicate date validation

**Code:**
```javascript
// In add meeting form submit
try {
  // ... validation ...
  
  // Clear cache before insert
  meetingsData = [];
  
  const { data, error } = await supabase
    .from('meetings')
    .insert({...})
    .select()
    .single();
  
  if (error) throw error;
  
  // Clear form
  resetAddMeetingForm();
  hideModal('#modal-add-meeting');
  
  // Reload meetings (this will repopulate meetingsData)
  await loadMeetings();
  
  showToast('✅ Meeting added successfully');
} catch (err) {
  // Clear cache on error too
  meetingsData = [];
  // ... error handling
}
```

## Testing Checklist

- [ ] Page loads correctly after refresh (no freeze)
- [ ] Splash screen transitions properly
- [ ] Error handling works if screens missing
- [ ] Leader creation with role works
- [ ] Role is saved to roles table
- [ ] Meeting creation works
- [ ] Meetings list updates after add
- [ ] No cache-related errors
- [ ] Form resets properly

## Priority

1. **High:** Issue 1 (Website freeze) - Blocks all usage
2. **High:** Issue 2 (Leader role) - Core functionality broken
3. **Medium:** Issue 3 (Meeting cache) - Affects meeting creation

---
*Plan created: 2025-02-09*

