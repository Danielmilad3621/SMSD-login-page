# Testing

## Current Testing State

### Test Coverage
**None** — No automated tests present in the codebase.

### Test Files
- No test files (`*.test.js`, `*.spec.js`)
- No test directory
- No testing framework configuration

## Manual Testing

### Local Testing
Documented in `README.md`:
```bash
python3 -m http.server 8000
# or
npx serve .
```
Open `http://localhost:8000` and sign in with Google.

### Testing Scenarios
Based on README and code analysis, manual testing would cover:

1. **Authentication Flow**
   - Google OAuth sign-in
   - OAuth redirect handling
   - Session persistence (refresh page)

2. **Authorization Flow**
   - Invited user → Welcome screen
   - Non-invited user → Sign out + error message
   - Email case insensitivity

3. **UI/UX**
   - Splash screen auto-transition
   - Screen transitions (smooth animations)
   - Toast notifications
   - Error message display
   - Logout functionality

4. **PWA Features**
   - Service Worker registration
   - Offline functionality
   - App installation
   - Cache behavior

5. **Edge Cases**
   - Network errors
   - Supabase API failures
   - Invalid session states
   - Browser compatibility

## Testing Gaps

### Unit Tests
**Missing** — No unit tests for:
- `showScreen()` function
- `isEmailInvited()` function
- `handleAuthUser()` function
- `showToast()` function
- Screen transition logic

### Integration Tests
**Missing** — No integration tests for:
- Supabase authentication flow
- Database query logic
- OAuth callback handling
- Service Worker caching

### E2E Tests
**Missing** — No end-to-end tests for:
- Complete user authentication flow
- Allowlist checking
- Error scenarios
- Offline behavior

### Visual Regression Tests
**Missing** — No visual testing for:
- Screen layouts
- Responsive design
- Animation correctness
- Cross-browser rendering

## Recommended Testing Approach

### For Current Codebase

#### 1. Unit Tests (Jest or Vitest)
```javascript
// Example: app.test.js
describe('showScreen', () => {
  it('should transition between screens', () => {
    // Test screen transitions
  });
});

describe('isEmailInvited', () => {
  it('should return true for invited emails', () => {
    // Mock Supabase response
  });
});
```

#### 2. Integration Tests
- Mock Supabase client
- Test authentication flow
- Test database queries
- Test error handling

#### 3. E2E Tests (Playwright or Cypress)
```javascript
// Example: auth.spec.js
test('user can sign in with Google', async ({ page }) => {
  // Navigate to app
  // Click sign in
  // Complete OAuth flow
  // Verify welcome screen
});
```

#### 4. Service Worker Tests
- Test cache installation
- Test offline fallback
- Test cache invalidation

### Testing Infrastructure

#### Recommended Stack
- **Jest** or **Vitest**: Unit testing
- **Playwright** or **Cypress**: E2E testing
- **MSW (Mock Service Worker)**: API mocking
- **Testing Library**: DOM testing utilities

#### Setup Requirements
1. Add `package.json` with test dependencies
2. Create `tests/` directory
3. Configure test runner
4. Add test scripts to package.json

## Testability Considerations

### Current Code Structure
- **IIFE Pattern**: Makes unit testing difficult (no exports)
- **Global Dependencies**: `window.supabase` hard to mock
- **DOM Coupling**: Functions tightly coupled to DOM elements
- **No Dependency Injection**: Hardcoded Supabase client

### Refactoring for Testability
To make code more testable:

1. **Extract Functions**: Move logic out of IIFE, export functions
2. **Dependency Injection**: Pass Supabase client as parameter
3. **Separate Concerns**: Split DOM manipulation from business logic
4. **Mock-Friendly**: Design functions to accept mocks

Example refactor:
```javascript
// Instead of:
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// Use:
function createSupabaseClient(url, key) {
  return window.supabase.createClient(url, key);
}

// Testable:
function isEmailInvited(email, supabaseClient) {
  return supabaseClient.from('invited_users')...
}
```

## Manual Testing Checklist

### Pre-Deployment
- [ ] Google OAuth sign-in works
- [ ] Invited users see welcome screen
- [ ] Non-invited users are signed out
- [ ] Session persists on page refresh
- [ ] Logout works correctly
- [ ] Error messages display properly
- [ ] Screen transitions are smooth
- [ ] Service Worker registers
- [ ] Offline fallback works
- [ ] PWA installs correctly
- [ ] Works on mobile devices
- [ ] Works in Chrome, Safari, Firefox

## Testing Priorities

### High Priority
1. **Authentication Flow**: Critical user path
2. **Allowlist Logic**: Security-critical
3. **Error Handling**: User experience

### Medium Priority
1. **Screen Transitions**: UX polish
2. **Service Worker**: Offline support
3. **PWA Features**: Installation

### Low Priority
1. **Edge Cases**: Rare scenarios
2. **Browser Compatibility**: If needed
3. **Performance**: If issues arise

## Conclusion

The codebase is currently **untested** and relies entirely on manual testing. For production readiness, consider:

1. **Start Small**: Add unit tests for critical functions
2. **E2E Coverage**: Test complete user flows
3. **Refactor for Testability**: Make code more testable
4. **CI/CD Integration**: Run tests on every commit

Given the simplicity of the current codebase, manual testing may be sufficient for now, but automated tests would provide confidence as the project grows.

