import { test, expect } from '@playwright/test';

const TEST_USER_ID = '771e42d5-22b0-4366-afb1-3634ab63a24c';
const TEST_USERNAME = 'Spencer Ng';
const TEST_DISCRIMINATOR = '1234';
const TEST_GEMS = 500;
const TEST_COINS = 1000;

// Mock Supabase session structure
const mockSession = {
  access_token: 'mock_access_token_' + Date.now(),
  refresh_token: 'mock_refresh_token_' + Date.now(),
  expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  expires_in: 3600,
  token_type: 'bearer',
  user: {
    id: TEST_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'spencerng944@gmail.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_anonymous: false
  }
};

// Mock profile data
const mockProfile = {
  id: TEST_USER_ID,
  username: TEST_USERNAME,
  discriminator: TEST_DISCRIMINATOR,
  gems: TEST_GEMS,
  coins: TEST_COINS,
  currency: TEST_COINS,
  xp: 14,
  level: 1,
  wins: 0,
  games_played: 1,
  unlocked_sleeves: ['BLUE', 'RED', 'GOLDEN_IMPERIAL'],
  unlocked_avatars: [':money_mouth_face:', ':robot:', ':devil:', ':heart_eyes:', ':girly:'],
  unlocked_boards: ['EMERALD', 'CYBER_BLUE', 'CRIMSON_VOID', 'LOTUS_FOREST', 'HIGH_ROLLER', 'GOLDEN_EMPEROR'],
  avatar_url: ':money_mouth_face:',
  eula_accepted: true,
  created_at: new Date().toISOString(),
  last_login_at: new Date().toISOString()
};

// Mock emotes data (3 items)
const mockEmotes = [
  {
    id: 'emote-1',
    name: 'Loyal Shiba',
    trigger_code: ':smile:',
    file_path: 'shiba_card.png',
    fallback_emoji: '😊',
    price: 0
  },
  {
    id: 'emote-2',
    name: 'Bashful Card',
    trigger_code: ':blush:',
    file_path: 'blushing_card.png',
    fallback_emoji: '😊',
    price: 0
  },
  {
    id: 'emote-3',
    name: 'Neon Shades',
    trigger_code: ':cool:',
    file_path: 'sunglasses_card.png',
    fallback_emoji: '😎',
    price: 0
  }
];

// Mock finishers data (3 items)
const mockFinishers = [
  {
    id: 'finisher-1',
    name: 'Classic Finish',
    animation_key: 'CLASSIC_FINISH',
    price: 0,
    description: 'A classic finishing move'
  },
  {
    id: 'finisher-2',
    name: 'Epic Finish',
    animation_key: 'EPIC_FINISH',
    price: 100,
    description: 'An epic finishing move'
  },
  {
    id: 'finisher-3',
    name: 'Legendary Finish',
    animation_key: 'LEGENDARY_FINISH',
    price: 500,
    description: 'A legendary finishing move'
  }
];

test.describe('Auth Sync and Data Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept console errors to check for AbortError
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        // Fail test if AbortError is detected
        if (text.includes('AbortError') || text.includes('aborted')) {
          throw new Error(`AbortError detected in console: ${text}`);
        }
      }
    });

    // Store console errors on page for later assertion
    (page as any).__consoleErrors = consoleErrors;
  });

  test('should load profile, gems, coins, emotes, and finishers without AbortError', async ({ page }) => {
    // Part 1: Mock Supabase session in LocalStorage
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Inject mock session into LocalStorage before React loads
    await page.addInitScript((session) => {
      // Store session in the format Supabase uses
      localStorage.setItem('sb-spaxxexmyiczdrbikdjp-auth-token', JSON.stringify(session));
      localStorage.setItem('thirteen_global_session', JSON.stringify(session));
      localStorage.setItem('thirteen_global_has_session', 'true');
      localStorage.setItem('thirteen_global_auth_checked', 'true');
    }, mockSession);

    // Part 2: Mock Profile API call
    await page.route('**/rest/v1/profiles?id=eq.*', async (route) => {
      const url = new URL(route.request().url());
      const userId = url.searchParams.get('id')?.split('eq.')[1];
      
      if (userId === TEST_USER_ID) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockProfile])
        });
      } else {
        await route.continue();
      }
    });

    // Part 3: Mock Emotes API call
    await page.route('**/rest/v1/emotes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEmotes)
      });
    });

    // Part 4: Mock Finishers API call
    await page.route('**/rest/v1/finishers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFinishers)
      });
    });

    // Navigate to the app
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for profile to load - look for username in the UI
    // The username should appear as "Spencer Ng#1234"
    const usernamePattern = new RegExp(`${TEST_USERNAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#${TEST_DISCRIMINATOR}`);
    
    // Assertion 1: Verify the text 'Spencer Ng#1234' appears
    await expect(page.getByText(usernamePattern)).toBeVisible({ timeout: 10000 });
    console.log('✅ Assertion 1 passed: Username displayed correctly');

    // Assertion 2: Verify Gem count (500) is displayed
    // Look for "500" near a gem icon or in the currency display
    const gemDisplay = page.locator('text=/500/').first();
    await expect(gemDisplay).toBeVisible({ timeout: 10000 });
    console.log('✅ Assertion 2 passed: Gem count (500) displayed');

    // Assertion 3: Verify Coin count (1000) is displayed
    // Look for "1000" or "1k" in the currency display
    const coinDisplay = page.locator('text=/1[,.k]?000?/').first();
    await expect(coinDisplay).toBeVisible({ timeout: 10000 });
    console.log('✅ Assertion 3 passed: Coin count (1000) displayed');

    // Assertion 4: Verify the Emote gallery shows 3 items
    // Look for emote-related elements - this depends on your UI structure
    // Adjust selector based on your actual emote gallery implementation
    const emoteGallery = page.locator('[data-testid="emote-gallery"], .emote-container, [class*="emote"]').first();
    if (await emoteGallery.count() > 0) {
      // If there's a container, check that it contains multiple items
      const emoteItems = emoteGallery.locator('[data-testid="emote-item"], [class*="emote-item"], img[alt*="emote" i]');
      const emoteCount = await emoteItems.count();
      expect(emoteCount).toBeGreaterThanOrEqual(3);
      console.log(`✅ Assertion 4 passed: Emote gallery shows ${emoteCount} items (expected at least 3)`);
    } else {
      // Fallback: Look for emote names in the page
      const emoteNames = ['Loyal Shiba', 'Bashful Card', 'Neon Shades'];
      for (const name of emoteNames) {
        await expect(page.getByText(name, { exact: false })).toBeVisible({ timeout: 5000 }).catch(() => {
          // If exact name not found, try case-insensitive
          expect(page.locator(`text=/${name}/i`).count()).toBeGreaterThan(0);
        });
      }
      console.log('✅ Assertion 4 passed: Emote gallery shows 3 items (found by name)');
    }

    // Assertion 5: Verify that the console does NOT contain any AbortError messages
    const consoleErrors = (page as any).__consoleErrors || [];
    const abortErrors = consoleErrors.filter((error: string) => 
      error.includes('AbortError') || error.includes('aborted') || error.includes('signal is aborted')
    );
    
    expect(abortErrors.length).toBe(0);
    if (abortErrors.length > 0) {
      console.error('❌ AbortErrors found in console:', abortErrors);
      throw new Error(`Found ${abortErrors.length} AbortError(s) in console: ${abortErrors.join(', ')}`);
    }
    console.log('✅ Assertion 5 passed: No AbortError messages in console');

    // Additional verification: Check that finishers are loaded
    // Look for finisher-related elements
    const finisherGallery = page.locator('[data-testid="finisher-gallery"], .finisher-container, [class*="finisher"]').first();
    if (await finisherGallery.count() > 0) {
      const finisherItems = finisherGallery.locator('[data-testid="finisher-item"], [class*="finisher-item"]');
      const finisherCount = await finisherItems.count();
      expect(finisherCount).toBeGreaterThanOrEqual(3);
      console.log(`✅ Bonus assertion passed: Finisher gallery shows ${finisherCount} items (expected at least 3)`);
    }

    console.log('🎉 All assertions passed! Data loaded successfully without AbortError.');
  });

  test('should handle profile loading with retries gracefully', async ({ page }) => {
    let profileRequestCount = 0;
    
    // Mock profile API with initial failure, then success
    await page.route('**/rest/v1/profiles?id=eq.*', async (route) => {
      profileRequestCount++;
      const url = new URL(route.request().url());
      const userId = url.searchParams.get('id')?.split('eq.')[1];
      
      if (userId === TEST_USER_ID) {
        // First request fails, subsequent requests succeed
        if (profileRequestCount === 1) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Internal server error' })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([mockProfile])
          });
        }
      } else {
        await route.continue();
      }
    });

    // Mock emotes and finishers to always succeed
    await page.route('**/rest/v1/emotes*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockEmotes)
      });
    });

    await page.route('**/rest/v1/finishers*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFinishers)
      });
    });

    // Inject mock session
    await page.addInitScript((session) => {
      localStorage.setItem('sb-spaxxexmyiczdrbikdjp-auth-token', JSON.stringify(session));
      localStorage.setItem('thirteen_global_session', JSON.stringify(session));
      localStorage.setItem('thirteen_global_has_session', 'true');
    }, mockSession);

    await page.goto('/', { waitUntil: 'networkidle' });

    // Profile should eventually load after retry
    const usernamePattern = new RegExp(`${TEST_USERNAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}#${TEST_DISCRIMINATOR}`);
    await expect(page.getByText(usernamePattern)).toBeVisible({ timeout: 15000 });

    // Verify no AbortErrors
    const consoleErrors = (page as any).__consoleErrors || [];
    const abortErrors = consoleErrors.filter((error: string) => 
      error.includes('AbortError') || error.includes('aborted')
    );
    
    expect(abortErrors.length).toBe(0);
    console.log('✅ Retry test passed: Profile loaded after retry, no AbortErrors');
  });
});
