# Debug Session: Vercel Mobile Issues

**Created:** 2025-02-09  
**Status:** investigating  
**Slug:** vercel-mobile-issues

## Issue Summary

Three critical bugs reported when accessing app on phone via Vercel:
1. Website freezes when refreshed
2. Leader role assignment fails (shows success but can't see it)
3. Meeting creation fails

## Symptoms

### Issue 1: Website Freezes on Refresh
**Expected:** Page should load normally after refresh, transition from splash to login or logged-in screen  
**Actual:** Entire website freezes when refreshed on phone via Vercel  
**Errors:** None reported  
**Timeline:** Happening now on Vercel deployment  
**Reproduction:** Refresh page on mobile device via Vercel URL

### Issue 2: Leader Role Assignment Fails
**Expected:** When adding a leader with a role (e.g., "Admin Leader"), the role should be saved and visible  
**Actual:** Success message displays but role is not actually saved/visible  
**Errors:** None visible to user  
**Timeline:** Current issue  
**Reproduction:** 
1. Go to leader page
2. Add new leader with role (e.g., "Admin Leader")
3. Submit form
4. Success message shows but role not visible

### Issue 3: Meeting Creation Fails
**Expected:** Should be able to add meeting to meeting list  
**Actual:** Cannot add meeting to meeting list  
**Errors:** Not specified  
**Timeline:** Current issue  
**Reproduction:** Try to add a meeting via the meeting form

## Investigation Notes

### Code Analysis

**Issue 1 - Freeze:**
- `initSplash()` has error handling but might have issues on mobile
- Screen initialization happens early in code
- Mobile browsers might handle async differently

**Issue 2 - Leader Role:**
- Code at line 973 tries to call `supabase.rpc('create_leader_role', ...)`
- If RPC function doesn't exist, shows warning and toast message
- Role creation logic depends on user existing in auth.users
- Toast messages might not be visible on mobile

**Issue 3 - Meeting Creation:**
- Code at line 1509 inserts meeting
- Has cache clearing logic (line 1507)
- Validation includes duplicate date check (line 1474)
- Error handling exists but might not surface properly

## Root Cause Found

### Issue 1: Website Freezes on Refresh
**Root Cause:** 
- `initSplash()` async session check could hang indefinitely on slow mobile connections
- No timeout protection for network requests
- No fallback if session check takes too long

**Fix Applied:**
- Added `Promise.race()` with 5-second timeout for session check
- Added 10-second safety timeout to force login screen if splash hangs
- Improved error handling to always fallback to login screen

### Issue 2: Leader Role Assignment - Toast Not Visible
**Root Cause:**
- Toast has `z-index: 100` which is lower than modal z-index
- Toast shown while modal is still open, so it's hidden behind modal
- Toast duration might be too short on mobile

**Fix Applied:**
- Increased toast `z-index` to 10000 (above modals)
- Hide modal BEFORE showing toast so it's visible
- Increased toast duration for role assignment messages (6000-7000ms)
- Added better error messages explaining why role assignment might fail
- Reload leaders list after role assignment so changes are visible

### Issue 3: Meeting Creation Fails
**Root Cause:**
- Duplicate date check is async and could hang on slow connections
- Error messages shown in modal banner might be hidden
- No timeout protection for validation queries

**Fix Applied:**
- Added `Promise.race()` with 5-second timeout for duplicate date check
- Hide modal BEFORE showing success toast
- Show error in both banner AND toast for visibility
- Scroll to error banner on failure
- Improved error handling with fallback (database constraint will catch duplicates)

## Fixes Applied

### Files Modified:
1. `app.js` - Fixed initSplash timeout, leader role toast visibility, meeting creation validation
2. `styles.css` - Increased toast z-index to 10000, added max-width and text-align

### Changes:
- Added timeout protection for all async operations
- Improved toast visibility (z-index, modal hiding)
- Better error messaging and visibility
- Safety fallbacks to prevent freezing

## Testing Checklist

- [ ] Test page refresh on mobile - should not freeze
- [ ] Test leader role assignment - toast should be visible
- [ ] Test meeting creation - should work and show errors clearly
- [ ] Verify toast appears above modals
- [ ] Check timeout behavior on slow connections

