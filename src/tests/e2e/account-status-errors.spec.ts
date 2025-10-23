import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      // Use E2E test database
      url: process.env.DATABASE_URL || 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public'
    }
  }
});

test.describe('Account Status Error Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure user is active before each test
    try {
      await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { isActive: true }
      });
    } catch (error) {
      console.warn('Could not reactivate test user before test:', error);
    }

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
    // Reactivate user after each test to ensure clean state for next iteration
    try {
      await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { isActive: true }
      });
    } catch (error) {
      console.warn('Could not reactivate test user after test:', error);
    }
  });

  test.afterAll(async () => {
    // Final cleanup: ensure test user is reactivated and disconnect
    try {
      await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { isActive: true }
      });
    } catch (error) {
      console.warn('Could not reactivate test user in afterAll:', error);
    } finally {
      await prisma.$disconnect();
    }
  });

  test('should handle inactive user login attempts gracefully', async ({ page }) => {
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

    // Deactivate the test user
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isActive: false }
    });

    // Attempt to login with inactive user
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
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

    // Reactivate user for subsequent tests
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isActive: true }
    });
  });

  test('should handle user deactivation during active session', async ({ page }) => {
    const authErrors: string[] = [];
    const jsErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      } else if (msg.type() === 'warn' && msg.text().includes('auth')) {
        authErrors.push(msg.text());
      }
    });

    // First, login normally
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for successful authentication - sequential waits for reliability
    await page.waitForURL('/dashboard', { timeout: 35000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Wait for SiteContext to fully initialize
    await page.waitForTimeout(3000);

    // Verify we're logged in
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible({ timeout: 10000 });

    // Deactivate the user while they have an active session
    await prisma.user.update({
      where: { username: 'admin' },
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

    // Reactivate user
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isActive: true }
    });
  });

  test('should handle token refresh with inactive user', async ({ page }) => {
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

    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for login to complete - sequential waits for reliability
    await page.waitForURL('/dashboard', { timeout: 35000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Wait for SiteContext initialization
    await page.waitForTimeout(3000);

    // Deactivate user
    await prisma.user.update({
      where: { username: 'admin' },
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

    // Reactivate user
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isActive: true }
    });
  });

  test('should properly log inactive user scenarios for debugging', async ({ page }) => {
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

    // Deactivate user
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isActive: false }
    });

    // Try to login
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    await page.waitForTimeout(5000);

    // Should have received appropriate 401 response with clear error message
    const authResponses = serverLogs.filter(log => 
      log.includes('deactivated') || log.includes('inactive')
    );
    
    // At least one response should indicate the account status issue
    expect(authResponses.length).toBeGreaterThan(0);

    // Reactivate user
    await prisma.user.update({
      where: { username: 'admin' },
      data: { isActive: true }
    });
  });

  test('should maintain consistent user active status across operations', async ({ page }) => {
    // This test ensures isActive field doesn't get corrupted

    // Verify user starts as active
    const userBefore = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: { isActive: true, id: true, username: true }
    });

    expect(userBefore?.isActive).toBe(true);

    // Login normally
    await page.goto('/login');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for login to complete - removed Promise.race for reliability
    await page.waitForURL('/dashboard', { timeout: 35000 });

    // Wait for authentication to fully complete
    await page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });

    // Additional wait for SiteContext to fully initialize
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Navigate to different pages that admin has access to
    // Removed /quality as admin may not have quality.read permission
    const pages = ['/workorders', '/traceability', '/dashboard'];
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

      // Verify user is still active after operations
      const userDuring = await prisma.user.findUnique({
        where: { username: 'admin' },
        select: { isActive: true }
      });

      expect(userDuring?.isActive).toBe(true);
    }

    // Final verification
    const userAfter = await prisma.user.findUnique({
      where: { username: 'admin' },
      select: { isActive: true }
    });

    expect(userAfter?.isActive).toBe(true);
  });
});