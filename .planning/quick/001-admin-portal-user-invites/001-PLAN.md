# Quick Task Plan: Admin Portal for User Invitations

**Task:** Admin portal to invite and remove users - auto-invite when adding leaders

## Overview

Create an admin interface for managing the `invited_users` table, allowing admins to:
1. View all invited users
2. Add users to the invite list
3. Remove users from the invite list
4. Automatically add leaders to the invite list when they're added

## Tasks

### Task 1: Create Admin Users Management Screen
- Add new screen `#users-screen` to index.html
- Add navigation button "Users" (Admin only)
- Display list of invited users with email and created date
- Add "Add User" button
- Add delete button for each user

### Task 2: Auto-invite Leaders When Added
- Modify `addLeader` function to automatically add leader's email to `invited_users` table
- Handle duplicate email gracefully (if already invited, skip)
- Show success message indicating user was invited

### Task 3: Implement User Management Functions
- `loadInvitedUsers()` - Fetch all invited users
- `addInvitedUser(email)` - Add user to invited_users table
- `removeInvitedUser(email)` - Remove user from invited_users table
- `renderInvitedUsers()` - Display users list

### Task 4: Add UI for Manual User Management
- Add User form (email input)
- Delete confirmation dialog
- Error handling and validation

## Success Criteria

- [ ] Admin can view all invited users
- [ ] Admin can manually add users to invite list
- [ ] Admin can remove users from invite list
- [ ] Leaders are automatically invited when added
- [ ] UI is mobile-friendly
- [ ] Permission checks (Admin only)

