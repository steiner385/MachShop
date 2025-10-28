import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { databaseAllocator } from '../helpers/databaseAllocator';

// Get project-specific database URL for isolation
const projectName = process.env.PLAYWRIGHT_PROJECT || 'auth-tests';
const allocation = databaseAllocator.getDatabaseForProject(projectName);
const databaseUrl = allocation?.databaseUrl || process.env.DATABASE_URL || 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

// Dedicated test user for account status testing
const TEST_USER = {
  username: 'account.status.test',
  password: 'password123',
  email: 'account.status.test@mes.com'
};

/**
 * Creates or ensures the dedicated test user exists and is active
 */
async function ensureTestUserExists(): Promise<void> {
  try {
    console.log(`[GITHUB ISSUE #16 DEBUG] Starting test user creation/verification for: ${TEST_USER.username}`);

    // Try to find existing user with enhanced error handling
    let user;
    try {
      console.log(`[GITHUB ISSUE #16 DEBUG] Attempting findUnique query...`);
      user = await prisma.user.findUnique({
        where: { username: TEST_USER.username }
      });
      console.log(`[GITHUB ISSUE #16 DEBUG] findUnique query completed. User found: ${!!user}`);
    } catch (findError: any) {
      console.error(`[GITHUB ISSUE #16 DEBUG] findUnique failed:`, {
        error: findError,
        errorType: typeof findError,
        hasMessage: findError?.message !== undefined,
        hasKind: findError?.kind !== undefined,
        errorString: String(findError),
        errorKeys: findError && typeof findError === 'object' ? Object.keys(findError) : 'Not an object'
      });
      throw findError;
    }

    if (!user) {
      // Create the test user if it doesn't exist
      console.log(`[GITHUB ISSUE #16 DEBUG] Creating dedicated test user: ${TEST_USER.username}`);
      try {
        user = await prisma.user.create({
          data: {
            username: TEST_USER.username,
            email: TEST_USER.email,
            passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LQs47BPFmHBSf4H1O', // hashed 'password123'
            firstName: 'Account',
            lastName: 'Test',
            isActive: true
            // ✅ GITHUB ISSUE #16 FIX: Remove role connection that might not exist
            // This avoids potential undefined error when referencing non-existent roles
          }
        });
        console.log(`[GITHUB ISSUE #16 DEBUG] User creation completed successfully`);
      } catch (createError: any) {
        console.error(`[GITHUB ISSUE #16 DEBUG] User creation failed:`, {
          error: createError,
          errorType: typeof createError,
          hasMessage: createError?.message !== undefined,
          hasKind: createError?.kind !== undefined,
          errorString: String(createError),
          errorKeys: createError && typeof createError === 'object' ? Object.keys(createError) : 'Not an object'
        });
        throw createError;
      }
    } else {
      // Ensure the user is active
      console.log(`[GITHUB ISSUE #16 DEBUG] Updating existing user to active state`);
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: true }
        });
        console.log(`[GITHUB ISSUE #16 DEBUG] User update completed successfully`);
      } catch (updateError: any) {
        console.error(`[GITHUB ISSUE #16 DEBUG] User update failed:`, {
          error: updateError,
          errorType: typeof updateError,
          hasMessage: updateError?.message !== undefined,
          hasKind: updateError?.kind !== undefined,
          errorString: String(updateError),
          errorKeys: updateError && typeof updateError === 'object' ? Object.keys(updateError) : 'Not an object'
        });
        throw updateError;
      }
    }

    console.log(`✅ Test user ${TEST_USER.username} is ready for account status testing`);
  } catch (error: any) {
    // ✅ GITHUB ISSUE #16 FIX: Enhanced error handling for undefined error objects
    const errorMessage = error?.message || error?.toString?.() || String(error) || 'Unknown error occurred';
    console.error(`❌ Failed to create/ensure test user:`, errorMessage);

    // Additional debugging in test mode with comprehensive undefined handling
    if (process.env.NODE_ENV === 'test') {
      console.error(`[GITHUB ISSUE #16] Error details:`, {
        message: errorMessage,
        errorType: typeof error,
        hasMessage: error?.message !== undefined,
        hasCode: error?.code !== undefined,
        hasName: error?.name !== undefined,
        hasStack: error?.stack !== undefined,
        hasKind: error?.kind !== undefined,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : 'error is not an object',
        errorString: String(error),
        isPrismaError: error?.name && (error.name.includes('Prisma') || error.name.includes('Client')),
        isDatabaseError: error?.code && typeof error.code === 'string'
      });
    }

    // Create a safe error to re-throw with better information
    const safeError = new Error(`Test user creation failed: ${errorMessage}`);
    throw safeError;
  }
}

/**
 * Cleanup function to reset the test user to active state
 */
async function resetTestUser(context: string = 'unknown'): Promise<void> {
  try {
    console.log(`[${context}] Resetting test user ${TEST_USER.username} to active state`);

    await prisma.user.updateMany({
      where: { username: TEST_USER.username },
      data: { isActive: true }
    });

    console.log(`[${context}] ✅ Test user reset successfully`);
  } catch (error: any) {
    // ✅ GITHUB ISSUE #16 FIX: Enhanced error handling for user reset
    const safeErrorMessage = error?.message || error?.toString?.() || String(error) || 'Unknown reset error';
    console.error(`[${context}] ❌ Failed to reset test user:`, {
      message: safeErrorMessage,
      errorType: typeof error,
      hasMessage: error?.message !== undefined,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : 'error is not an object'
    });
    // Don't throw - this shouldn't block other tests
  }
}

test.describe('Account Status Error Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure dedicated test user exists and is active before EVERY test
    await ensureTestUserExists();

    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        try {
          localStorage.removeItem('mes-auth-storage');
          sessionStorage.removeItem('mes-auth-storage');
        } catch (e) {
          console.warn('Could not clear storage:', e.message);
        }
      }
    });
  });

  test.afterEach(async () => {
    // Reset test user after EVERY test (even if test failed)
    await resetTestUser('afterEach');
  });

  test.afterAll(async () => {
    // Final cleanup
    try {
      await resetTestUser('afterAll');
    } catch (error) {
      console.error('Warning: Failed to reset test user:', error);
    } finally {
      try {
        await prisma.$disconnect();
      } catch (error) {
        console.warn('Warning: Failed to disconnect Prisma:', error);
      }
    }
  });

  test('should handle inactive user login attempts gracefully', async ({ page }) => {
    try {
      // Track authentication errors
      const authErrors: string[] = [];
      const jsErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        } else if (msg.type() === 'warn' && msg.text().includes('auth')) {
          authErrors.push(msg.text());
        }
      });

      // Deactivate the dedicated test user
      await prisma.user.update({
        where: { username: TEST_USER.username },
        data: { isActive: false }
      });

      // Attempt to login with inactive user
      await page.goto('/login');
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
      await page.locator('[data-testid="password-input"]').fill(TEST_USER.password);
      await page.locator('[data-testid="login-button"]').click();

      // Wait for login response with increased timeout
      await page.waitForTimeout(5000);

      // Should show appropriate error message
      const errorAlert = page.locator('.ant-alert-error');
      await expect(errorAlert).toBeVisible({ timeout: 15000 });

      const errorText = await errorAlert.textContent();
      expect(errorText).toContain('deactivated');

      // Should not have JavaScript errors (filter out expected auth errors)
      const criticalJsErrors = jsErrors.filter(error =>
        !error.includes('Warning') &&
        !error.includes('React DevTools') &&
        !error.includes('Download the React DevTools') &&
        !error.includes('401') &&
        !error.includes('Unauthorized') &&
        !error.includes('deactivated') &&
        !error.includes('API call failed')
      );
      expect(criticalJsErrors).toHaveLength(0);

      // Should remain on login page
      expect(page.url()).toContain('/login');

    } finally {
      // Reset test user, even if test fails
      await resetTestUser('test-cleanup-1');
    }
  });

  test('should handle user deactivation during active session', async ({ page }) => {
    try {
      const authErrors: string[] = [];
      const jsErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        } else if (msg.type() === 'warn' && msg.text().includes('auth')) {
          authErrors.push(msg.text());
        }
      });

      // First, login normally with the test user
      await page.goto('/login');
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
      await page.locator('[data-testid="password-input"]').fill(TEST_USER.password);
      await page.locator('[data-testid="login-button"]').click();

      // Wait for successful authentication - sequential waits for reliability
      await page.waitForURL('/dashboard', { timeout: 35000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Wait for SiteContext to fully initialize
      await page.waitForTimeout(3000);

      // Verify we're logged in
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible({ timeout: 10000 });

      // Deactivate the test user while they have an active session
      await prisma.user.update({
        where: { username: TEST_USER.username },
        data: { isActive: false }
      });

      // Try to navigate to a protected page that requires API calls
      await page.goto('/workorders');
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Wait for any authentication checks to occur
      await page.waitForTimeout(7000);

      // Should handle the inactive user gracefully - either redirect to login or show error
      const currentUrl = page.url();
      const hasErrorAlert = await page.locator('.ant-alert-error').isVisible();

      // Should either be redirected to login or show an error, but not crash
      const isHandledGracefully = currentUrl.includes('/login') || hasErrorAlert;
      expect(isHandledGracefully).toBe(true);

      // Should not have unhandled JavaScript errors (filter out expected auth errors)
      const criticalJsErrors = jsErrors.filter(error =>
        !error.includes('Warning') &&
        !error.includes('React DevTools') &&
        !error.includes('Download the React DevTools') &&
        !error.includes('401') &&
        !error.includes('Unauthorized') &&
        !error.includes('deactivated') &&
        !error.includes('inactive') &&
        !error.includes('API call failed') // Expected API failures are OK
      );
      expect(criticalJsErrors).toHaveLength(0);

    } finally {
      // Reset test user, even if test fails
      await resetTestUser('test-cleanup-2');
    }
  });

  test('should handle token refresh with inactive user', async ({ page }) => {
    try {
      const authErrors: string[] = [];
      const networkErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          if (msg.text().includes('auth') || msg.text().includes('token')) {
            authErrors.push(msg.text());
          } else if (msg.text().includes('Network') || msg.text().includes('401')) {
            networkErrors.push(msg.text());
          }
        }
      });

      // Login first with test user
      await page.goto('/login');
      await page.waitForLoadState('networkidle', { timeout: 10000 });

      await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
      await page.locator('[data-testid="password-input"]').fill(TEST_USER.password);
      await page.locator('[data-testid="login-button"]').click();

      // Wait for login to complete - sequential waits for reliability
      await page.waitForURL('/dashboard', { timeout: 35000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      // Wait for SiteContext initialization
      await page.waitForTimeout(3000);

      // Deactivate test user
      await prisma.user.update({
        where: { username: TEST_USER.username },
        data: { isActive: false }
      });

      // Clear token to force re-authentication (simpler than malformed token)
      await page.evaluate(() => {
        const authData = localStorage.getItem('mes-auth-storage');
        if (authData) {
          const parsed = JSON.parse(authData);
          // Remove token to force re-authentication
          delete parsed.state.token;
          localStorage.setItem('mes-auth-storage', JSON.stringify(parsed));
        }
      });

      // Trigger a page that would cause authentication check
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      await page.waitForTimeout(7000);

      // Should handle inactive user during token refresh gracefully
      const currentUrl = page.url();
      const hasErrorMessage = await page.locator('.ant-alert-error').isVisible().catch(() => false);

      // Should redirect to login or show error message
      const isHandledGracefully = currentUrl.includes('/login') || hasErrorMessage;
      expect(isHandledGracefully).toBe(true);

    } finally {
      // Reset test user, even if test fails
      await resetTestUser('test-cleanup-3');
    }
  });

  test('should properly log inactive user scenarios for debugging', async ({ page }) => {
    try {
      const serverLogs: string[] = [];

      // Intercept API calls to check for proper error responses
      page.on('response', async response => {
        if (response.url().includes('/api/') && response.status() === 401) {
          try {
            const responseBody = await response.text();
            serverLogs.push(`401 Response: ${response.url()} - ${responseBody}`);
          } catch (error) {
            serverLogs.push(`401 Response: ${response.url()} - Could not read body`);
          }
        }
      });

      // Deactivate test user
      await prisma.user.update({
        where: { username: TEST_USER.username },
        data: { isActive: false }
      });

      // Try to login with test user
      await page.goto('/login');
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
      await page.locator('[data-testid="password-input"]').fill(TEST_USER.password);
      await page.locator('[data-testid="login-button"]').click();

      await page.waitForTimeout(5000);

      // Should have received appropriate 401 response with clear error message
      const authResponses = serverLogs.filter(log =>
        log.includes('deactivated') || log.includes('inactive')
      );

      // At least one response should indicate the account status issue
      expect(authResponses.length).toBeGreaterThan(0);

    } finally {
      // Reset test user, even if test fails
      await resetTestUser('test-cleanup-4');
    }
  });

  test('should maintain consistent user active status across operations', async ({ page }) => {
    // This test ensures isActive field doesn't get corrupted for the test user

    // Verify test user starts as active
    const userBefore = await prisma.user.findUnique({
      where: { username: TEST_USER.username },
      select: { isActive: true, id: true, username: true }
    });

    expect(userBefore?.isActive).toBe(true);

    // Login normally with test user
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.locator('[data-testid="username-input"]').fill(TEST_USER.username);
    await page.locator('[data-testid="password-input"]').fill(TEST_USER.password);
    await page.locator('[data-testid="login-button"]').click();

    // Wait for login to complete - removed Promise.race for reliability
    await page.waitForURL('/dashboard', { timeout: 35000 });

    // Wait for authentication to fully complete
    await page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });

    // Additional wait for SiteContext to fully initialize
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Navigate to different pages that the test user has access to
    // Test user has Production Operator role, so limit to accessible pages
    const pages = ['/workorders', '/dashboard'];
    for (const pageUrl of pages) {
      await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for navigation to complete
      await page.waitForLoadState('domcontentloaded', { timeout: 20000 });

      // Wait for auth to rehydrate after navigation (with retry)
      try {
        await page.waitForSelector('[data-testid="user-avatar"]', { timeout: 15000 });
      } catch (e) {
        // Avatar might not be visible yet, wait a bit more
        await page.waitForTimeout(2000);
      }

      // Additional wait to ensure all async operations complete
      await page.waitForTimeout(3000);

      // Verify test user is still active after operations
      const userDuring = await prisma.user.findUnique({
        where: { username: TEST_USER.username },
        select: { isActive: true }
      });

      expect(userDuring?.isActive).toBe(true);
    }

    // Final verification
    const userAfter = await prisma.user.findUnique({
      where: { username: TEST_USER.username },
      select: { isActive: true }
    });

    expect(userAfter?.isActive).toBe(true);
  });
});