# Playwright E2E Testing Setup

## Installation

First, install Playwright and its dependencies:

```bash
npm install --save-dev @playwright/test
npx playwright install
```

This will install:
- The Playwright test runner
- Chromium, Firefox, and WebKit browsers (for cross-browser testing)

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in debug mode (step through)
```bash
npm run test:e2e:debug
```

### Run a specific test file
```bash
npx playwright test tests/auth-sync.spec.ts
```

## Test Suite: Auth Sync (`auth-sync.spec.ts`)

This test suite verifies the full data loading flow without AbortErrors:

### Test: "should load profile, gems, coins, emotes, and finishers without AbortError"

**Mocks:**
- Injects a mock Supabase session into LocalStorage for user `771e42d5-22b0-4366-afb1-3634ab63a24c`
- Intercepts profile API call and returns:
  - `username: 'Spencer Ng'`
  - `discriminator: '1234'`
  - `gems: 500`
  - `coins: 1000`
- Intercepts emotes/finishers API calls and returns 3 items each

**Assertions:**
1. ✅ Verify the text 'Spencer Ng#1234' appears in the UI
2. ✅ Verify Gem count (500) is displayed
3. ✅ Verify Coin count (1000) is displayed
4. ✅ Verify the Emote gallery shows 3 items
5. ✅ Verify that the console does NOT contain any AbortError messages

### Test: "should handle profile loading with retries gracefully"

**Scenario:**
- Profile API initially returns 500 error
- Profile API succeeds on retry
- Verifies graceful retry handling without AbortErrors

## Configuration

The Playwright configuration (`playwright.config.ts`) is set to:
- Run tests in parallel (can be adjusted)
- Retry failed tests on CI (2 retries)
- Capture screenshots and videos on failure
- Start the local dev server automatically before tests
- Run tests on Chromium, Firefox, and WebKit browsers

## CI/CD Integration

The configuration automatically:
- Fails the build if `test.only` is left in code
- Retries tests 2x on CI
- Captures traces on retry for debugging

## Debugging Failed Tests

1. **View HTML Report:**
   ```bash
   npx playwright show-report
   ```

2. **View Traces:**
   ```bash
   npx playwright show-trace trace.zip
   ```

3. **Run with Headed Browser:**
   ```bash
   npx playwright test --headed
   ```

4. **Slow Down Tests:**
   ```bash
   npx playwright test --slow-mo=1000
   ```
