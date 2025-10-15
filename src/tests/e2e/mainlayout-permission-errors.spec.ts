import { test, expect } from '@playwright/test';

test.describe('MainLayout Permission Error Detection', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state to test fresh navigation
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        // Handle Firefox security restrictions
        try {
          localStorage.removeItem('mes-auth-storage');
          sessionStorage.removeItem('mes-auth-storage');
        } catch (e) {
          console.warn('Could not clear storage:', e.message);
        }
      }
    });
  });

  test('should not have JavaScript errors when navigating to dashboard after auth', async ({ page }) => {
    // Set up error tracking
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(`Page Error: ${error.message}`);
    });

    // First, login to establish auth state
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for authentication but allow for timing issues
    await Promise.race([
      page.waitForURL('/dashboard', { timeout: 10000 }),
      page.waitForTimeout(5000)
    ]);

    // Now simulate a fresh navigation (like typing URL in browser)
    // This recreates the race condition where MainLayout renders before user data loads
    await page.goto('/dashboard');
    
    // Wait for the page to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for permission-related JavaScript errors
    const permissionErrors = jsErrors.filter(error => 
      error.includes('Cannot read properties of undefined') && 
      (error.includes('includes') || error.includes('permissions') || error.includes('roles') || error.includes("'0'"))
    );

    // Should not have permission-related errors
    expect(permissionErrors).toHaveLength(0);

    // Verify the page actually loaded successfully
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    
    // Log any other errors for debugging
    if (jsErrors.length > 0) {
      console.log('JavaScript errors detected:', jsErrors);
    }
  });

  test('should handle direct navigation to protected routes without errors', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(`Page Error: ${error.message}`);
    });

    // First establish auth
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    await Promise.race([
      page.waitForURL('/dashboard', { timeout: 10000 }),
      page.waitForTimeout(5000)
    ]);

    // Test direct navigation to various protected routes
    const protectedRoutes = ['/workorders', '/quality', '/traceability', '/equipment'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Check for permission errors on each route
      const routePermissionErrors = jsErrors.filter(error => 
        error.includes('Cannot read properties of undefined') && 
        (error.includes('includes') || error.includes('permissions') || error.includes('roles') || error.includes("'0'"))
      );

      expect(routePermissionErrors).toHaveLength(0);
    }
  });

  test('should handle user data loading states gracefully', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(`Page Error: ${error.message}`);
    });

    // Simulate slow network conditions to test race conditions
    await page.route('**/api/v1/auth/me', async route => {
      // Add delay to simulate slow API response
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.continue();
    });

    // Login
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Navigate to dashboard while API is slow
    await page.goto('/dashboard');
    
    // Wait for everything to settle
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should not have permission errors even with slow API
    const permissionErrors = jsErrors.filter(error => 
      error.includes('Cannot read properties of undefined') && 
      (error.includes('includes') || error.includes('permissions') || error.includes('roles') || error.includes("'0'"))
    );

    expect(permissionErrors).toHaveLength(0);
  });

  test('should handle malformed user data gracefully', async ({ page }) => {
    const jsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      jsErrors.push(`Page Error: ${error.message}`);
    });

    // Mock API to return user data without permissions/roles arrays
    await page.route('**/api/v1/auth/me', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            username: 'admin',
            email: 'admin@test.com',
            firstName: 'Test',
            lastName: 'User',
            // Missing permissions and roles arrays - this causes the error
            isActive: true,
            lastLogin: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        })
      });
    });

    // Login with malformed user data
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should handle malformed data gracefully without crashing
    const permissionErrors = jsErrors.filter(error => 
      error.includes('Cannot read properties of undefined') && 
      (error.includes('includes') || error.includes('permissions') || error.includes('roles') || error.includes("'0'"))
    );

    expect(permissionErrors).toHaveLength(0);
    
    // Page should still render even with incomplete user data
    const hasErrorBoundary = await page.locator('text=Something went wrong').isVisible();
    expect(hasErrorBoundary).toBe(false);
  });
});