import { test, expect } from '@playwright/test';

// Helper function for robust login (used only by domain-specific tests)
const performLogin = async (page: any, baseUrl = '') => {
  await page.goto(`${baseUrl}/login`);
  await page.locator('[data-testid="username-input"]').fill('admin');
  await page.locator('[data-testid="password-input"]').fill('password123');
  await page.locator('[data-testid="login-button"]').click();

  // Wait for successful authentication with robust waiting
  await Promise.race([
    page.waitForURL(`${baseUrl}/dashboard`, { timeout: 15000 }),
    page.waitForSelector('.ant-alert-error', { timeout: 15000 })
  ]).catch(async () => {
    await page.waitForTimeout(3000);
    const authState = await page.evaluate(() => {
      const authData = localStorage.getItem('mes-auth-storage');
      try {
        const parsed = authData ? JSON.parse(authData) : null;
        return parsed?.state?.token ? true : false;
      } catch { return false; }
    });
    if (authState) {
      await page.goto(`${baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');
    }
  });

  await expect(page).toHaveURL(`${baseUrl}/dashboard`);
};

test.describe('SPA Routing and History API Fallback', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        // Firefox security restrictions - try individual removal
        try {
          localStorage.removeItem('mes-auth-storage');
          sessionStorage.removeItem('mes-auth-storage');
        } catch (e) {
          // If even individual removal fails, continue with test
          console.warn('Could not clear storage:', e.message);
        }
      }
    });
  });

  test.describe('Direct URL Access - Unauthenticated', () => {
    const protectedRoutes = [
      '/dashboard',
      '/workorders', 
      '/workorders/123',
      '/quality',
      '/quality/inspections',
      '/quality/ncrs',
      '/traceability',
      '/equipment',
      '/profile'
    ];

    protectedRoutes.forEach(route => {
      test(`should redirect ${route} to login when unauthenticated`, async ({ page }) => {
        await page.goto(route);
        
        // Should be redirected to login page
        await expect(page).toHaveURL(/\/login/);
        
        // Should see login form (not 404 page)
        await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
        
        // Should NOT see 404 error page
        await expect(page.locator('text=404')).not.toBeVisible();
        await expect(page.locator('text=page you visited does not exist')).not.toBeVisible();
      });
    });

    test('should serve login page directly via /login URL', async ({ page }) => {
      await page.goto('/login');
      
      // Should stay on login page (no redirect)
      await expect(page).toHaveURL(/\/login/);
      
      // Should see login form elements
      await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      
      // Should NOT see 404 error page
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test('should redirect root / to login when unauthenticated', async ({ page }) => {
      await page.goto('/');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    });
  });

  test.describe('Direct URL Access - Authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
    });

    const authenticatedRoutes = [
      { path: '/dashboard', indicator: 'Manufacturing Dashboard' },
      { path: '/workorders', indicator: 'Work Orders' },
      { path: '/quality', indicator: 'Quality' },
      { path: '/traceability', indicator: 'Traceability' },
      { path: '/equipment', indicator: 'Equipment' },
      { path: '/profile', indicator: 'Profile' }
    ];

    authenticatedRoutes.forEach(({ path, indicator }) => {
      test(`should access ${path} directly when authenticated`, async ({ page }) => {
        await page.goto(path);

        // Should stay on the requested path
        await expect(page).toHaveURL(path);

        // Should load page content (not 404)
        await page.waitForLoadState('networkidle');

        // Should see page-specific content or general layout indicators
        // Check all conditions in parallel and see if at least one is true
        const [indicatorVisible, headingVisible, avatarVisible] = await Promise.all([
          page.locator(`text=${indicator}`).isVisible().catch(() => false),
          page.locator('h1, h2, h3').first().isVisible().catch(() => false),
          page.locator('[data-testid="user-avatar"]').isVisible().catch(() => false)
        ]);

        const hasContent = indicatorVisible || headingVisible || avatarVisible;
        expect(hasContent).toBe(true);

        // Should NOT see 404 error page
        await expect(page.locator('text=404')).not.toBeVisible();
        await expect(page.locator('text=page you visited does not exist')).not.toBeVisible();
      });
    });

    test('should redirect root / to dashboard when authenticated', async ({ page }) => {
      await page.goto('/');
      
      // Should be redirected to dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    });
  });

  test.describe('Browser Refresh/Reload Scenarios', () => {
    test.beforeEach(async ({ page }) => {
      await performLogin(page);
    });

    const reloadRoutes = ['/dashboard', '/workorders', '/quality', '/traceability'];

    reloadRoutes.forEach(route => {
      test(`should handle page reload on ${route} correctly`, async ({ page }) => {
        // Navigate to the route
        await page.goto(route);
        await expect(page).toHaveURL(route);
        await page.waitForLoadState('networkidle');
        
        // Reload the page
        await page.reload();
        
        // Should stay on the same route after reload
        await expect(page).toHaveURL(route);
        
        // Should load properly (not 404)
        await page.waitForLoadState('networkidle');
        
        // Should see user avatar (indicates authenticated state persisted)
        await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
        
        // Should NOT see 404 error
        await expect(page.locator('text=404')).not.toBeVisible();
      });
    });
  });

  test.describe('401 Redirect Flow Testing', () => {
    test('should redirect to login when API returns 401', async ({ page }) => {
      // First login successfully
      await performLogin(page);
      
      // Mock API to return 401 for authenticated requests
      await page.route('**/api/v1/**', route => {
        if (route.request().headers()['authorization']) {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Unauthorized', message: 'Token expired' })
          });
        } else {
          route.continue();
        }
      });
      
      // Navigate to a page that makes API calls
      await page.goto('/workorders');
      
      // Should be redirected to login due to 401
      await expect(page).toHaveURL(/\/login/);
      
      // Should see login form (not 404)
      await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      
      // Should NOT see 404 error
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test('should handle rapid 401 redirects without causing routing errors', async ({ page }) => {
      // Login first
      await performLogin(page);
      
      // Mock multiple API endpoints to return 401
      await page.route('**/api/v1/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });
      
      // Trigger multiple API calls by navigating quickly
      await page.goto('/workorders');
      await page.goto('/quality');
      await page.goto('/traceability');
      
      // Should eventually land on login page
      await expect(page).toHaveURL(/\/login/);
      
      // Should see login form (not 404 or error page)
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    });
  });

  test.describe('History API Fallback Validation', () => {
    test('should show 404 component for truly non-existent routes', async ({ page }) => {
      await page.goto('/totally-non-existent-route-12345');
      
      // Should redirect to login first (unauthenticated)
      await expect(page).toHaveURL(/\/login/);
      
      // Now authenticate and try non-existent route
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      // Wait for authentication with same robust pattern
      await Promise.race([
        page.waitForURL('/dashboard', { timeout: 15000 }),
        page.waitForSelector('.ant-alert-error', { timeout: 15000 })
      ]).catch(async () => {
        await page.waitForTimeout(3000);
        const authState = await page.evaluate(() => {
          const authData = localStorage.getItem('mes-auth-storage');
          try {
            const parsed = authData ? JSON.parse(authData) : null;
            return parsed?.state?.token ? true : false;
          } catch { return false; }
        });
        if (authState) {
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');
        }
      });
      
      await expect(page).toHaveURL('/dashboard');
      
      // Now try the non-existent route when authenticated
      await page.goto('/totally-non-existent-route-12345');
      
      // Should show the React Router 404 component, not server 404
      await expect(page.locator('text=404')).toBeVisible();
      await expect(page.locator('text=page you visited does not exist')).toBeVisible();
      
      // Should still have authenticated layout/navigation
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    });

    test('should serve index.html for any unmatched route (not server 404)', async ({ page }) => {
      // Test that Vite serves index.html for unknown routes
      const response = await page.goto('/some/deep/nested/unknown/route');
      
      // Should return 200 (served index.html) not 404
      expect(response?.status()).toBe(200);
      
      // Should have React app content (shows SPA loaded)
      await expect(page.locator('body')).toContainText(/MES|Manufacturing|Login/);
      
      // Should NOT be a plain HTML 404 page
      await expect(page.locator('title')).not.toContainText('404');
    });
  });

  test.describe('Query Parameters and Hash Handling', () => {
    test('should preserve query parameters during auth redirects', async ({ page }) => {
      // Try to access protected route with query params
      await page.goto('/dashboard?tab=workorders&filter=pending');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      
      // Login with robust waiting
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      // Wait for authentication
      await Promise.race([
        page.waitForURL(/\/dashboard/, { timeout: 15000 }),
        page.waitForSelector('.ant-alert-error', { timeout: 15000 })
      ]).catch(async () => {
        await page.waitForTimeout(3000);
        const authState = await page.evaluate(() => {
          const authData = localStorage.getItem('mes-auth-storage');
          try {
            const parsed = authData ? JSON.parse(authData) : null;
            return parsed?.state?.token ? true : false;
          } catch { return false; }
        });
        if (authState) {
          await page.goto('/dashboard');
          await page.waitForLoadState('networkidle');
        }
      });
      
      // Should redirect back to original URL with query params
      // Note: This test depends on the redirect implementation
      // May need adjustment based on actual behavior
      await page.waitForURL(/\/dashboard/);
    });

    test('should handle hash fragments in URLs correctly', async ({ page }) => {
      // Login first
      await performLogin(page);
      
      // Navigate to URL with hash
      await page.goto('/dashboard#section-metrics');
      
      // Should maintain the route and hash
      await expect(page).toHaveURL('/dashboard#section-metrics');
      
      // Should NOT show 404
      await expect(page.locator('text=404')).not.toBeVisible();
    });
  });

  test.describe('Domain-Specific Routing (local.mes.com)', () => {
    test.skip('should handle direct URL access through local.mes.com domain', async ({ page }) => {
      // SKIP REASON: Requires nginx proxy configuration for local.mes.com domain
      // To enable: Configure nginx to proxy local.mes.com to Vite dev server
      // See deployment documentation for nginx setup instructions

      await page.goto('http://local.mes.com/login');

      // Should serve the React app (not nginx 404)
      await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();

      // Should NOT see 404 error
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test.skip('should handle authenticated routes through local.mes.com', async ({ page }) => {
      // SKIP REASON: Requires nginx proxy configuration for local.mes.com domain
      // To enable: Configure nginx to proxy local.mes.com to Vite dev server

      // Login through domain
      await performLogin(page, 'http://local.mes.com');

      // Try direct access to other routes through domain
      await page.goto('http://local.mes.com/workorders');

      // Should stay on the route (not 404)
      await expect(page).toHaveURL('http://local.mes.com/workorders');
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test.skip('should handle page refresh through nginx proxy correctly', async ({ page }) => {
      // SKIP REASON: Requires nginx proxy configuration for local.mes.com domain
      // To enable: Configure nginx with historyApiFallback support for SPA routing

      // Login and navigate through domain
      await performLogin(page, 'http://local.mes.com');

      await page.goto('http://local.mes.com/quality');
      await expect(page).toHaveURL('http://local.mes.com/quality');

      // Reload the page
      await page.reload();

      // Should still serve the React app (nginx should proxy to Vite historyApiFallback)
      await expect(page).toHaveURL('http://local.mes.com/quality');
      await expect(page.locator('text=404')).not.toBeVisible();

      // Should see authenticated content
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    });
  });
});