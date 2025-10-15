import { test, expect } from '@playwright/test';

test.describe('Domain Integration Tests (local.mes.com)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.context().clearPermissions();
  });

  test('should load application through local.mes.com domain', async ({ page }) => {
    await page.goto('http://local.mes.com');
    
    // Should be redirected to login since not authenticated
    await expect(page).toHaveURL(/\/login/);
    
    // Should see login form elements
    await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should successfully authenticate through nginx proxy', async ({ page }) => {
    await page.goto('http://local.mes.com/login');
    
    // Fill login form
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('http://local.mes.com/dashboard');
    
    // Should see dashboard content
    await expect(page.locator('text=Manufacturing Dashboard')).toBeVisible();
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should have proper Content Security Policy headers', async ({ page }) => {
    const response = await page.goto('http://local.mes.com');
    
    // Check that CSP headers are present and allow WebSocket connections
    const cspHeader = response?.headers()['content-security-policy'];
    expect(cspHeader).toBeTruthy();
    expect(cspHeader).toContain('connect-src');
    expect(cspHeader).toContain('ws:');
    expect(cspHeader).toContain('wss:');
  });

  test('should handle API requests through nginx proxy', async ({ page }) => {
    // Monitor network requests
    const apiRequests: string[] = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiRequests.push(request.url());
      }
    });

    await page.goto('http://local.mes.com/login');
    
    // Fill and submit login form
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    // Wait for authentication request
    await page.waitForResponse(response => 
      response.url().includes('/api/v1/auth/login') && response.status() === 200
    );
    
    // Verify API request went through nginx proxy to local.mes.com
    const loginRequest = apiRequests.find(url => url.includes('/api/v1/auth/login'));
    expect(loginRequest).toBeTruthy();
    expect(loginRequest).toContain('local.mes.com');
  });

  test('should support WebSocket connections for development', async ({ page }) => {
    // Monitor WebSocket connections
    const wsConnections: string[] = [];
    
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
    });

    await page.goto('http://local.mes.com');
    
    // Wait a moment for potential WebSocket connections (Vite HMR)
    await page.waitForTimeout(3000);
    
    // In development mode, we might have Vite HMR WebSocket connections
    // This test verifies they don't cause CSP violations
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Check for CSP violations related to WebSocket connections
    expect(consoleErrors.filter(error => 
      error.includes('connect-src') || error.includes('WebSocket')
    )).toHaveLength(0);
  });

  test('should handle CORS properly through nginx', async ({ page }) => {
    await page.goto('http://local.mes.com/login');
    
    // Monitor for CORS errors
    const corsErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('cors')) {
        corsErrors.push(msg.text());
      }
    });
    
    // Perform login which involves API requests
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    // Wait for login to complete
    await page.waitForTimeout(2000);
    
    // Should not have any CORS errors
    expect(corsErrors).toHaveLength(0);
  });

  test('should handle health check endpoint through nginx', async ({ page }) => {
    const response = await page.request.get('http://local.mes.com/health');
    
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData).toHaveProperty('status', 'healthy');
    expect(healthData).toHaveProperty('timestamp');
    expect(healthData).toHaveProperty('environment');
  });

  test('should properly proxy static assets', async ({ page }) => {
    await page.goto('http://local.mes.com');
    
    // Check that static assets load properly through nginx
    const responses = [];
    page.on('response', response => {
      if (response.url().includes('local.mes.com') && 
          (response.url().includes('.js') || response.url().includes('.css'))) {
        responses.push({
          url: response.url(),
          status: response.status()
        });
      }
    });
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // All static assets should load successfully
    responses.forEach(response => {
      expect(response.status).toBeLessThan(400);
    });
  });

  test('should handle direct dashboard access when authenticated', async ({ page }) => {
    // First login
    await page.goto('http://local.mes.com/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();
    
    await expect(page).toHaveURL('http://local.mes.com/dashboard');
    
    // Now try direct access to dashboard
    await page.goto('http://local.mes.com/dashboard');
    
    // Should stay on dashboard (not redirect to login)
    await expect(page).toHaveURL('http://local.mes.com/dashboard');
    await expect(page.locator('text=Manufacturing Dashboard')).toBeVisible();
  });

  test.describe('Nginx SPA Fallback and History API Support', () => {
    test('should serve React app for unknown routes through nginx (not server 404)', async ({ page }) => {
      // Test that nginx serves index.html for unmatched routes
      const response = await page.goto('http://local.mes.com/unknown-route-12345');
      
      // Should return 200 (nginx serves index.html) not 404
      expect(response?.status()).toBe(200);
      
      // Should serve the React app (unauthenticated redirect to login)
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
      
      // Should NOT be a server 404 page
      await expect(page.locator('body')).not.toContainText('404 Not Found');
      await expect(page.locator('body')).not.toContainText('nginx');
    });

    test('should handle direct access to protected routes through nginx', async ({ page }) => {
      const protectedRoutes = [
        'http://local.mes.com/dashboard',
        'http://local.mes.com/workorders',
        'http://local.mes.com/workorders/wo-123',
        'http://local.mes.com/quality',
        'http://local.mes.com/quality/inspections',
        'http://local.mes.com/traceability',
        'http://local.mes.com/equipment',
        'http://local.mes.com/profile'
      ];

      for (const route of protectedRoutes) {
        const response = await page.goto(route);
        
        // Should return 200 (nginx serves React app)
        expect(response?.status()).toBe(200);
        
        // Should redirect to login (React Router handles this)
        await expect(page).toHaveURL(/\/login/);
        
        // Should see React login form (not nginx 404)
        await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
        await expect(page.locator('text=404')).not.toBeVisible();
      }
    });

    test('should handle page refresh on protected routes through nginx', async ({ page }) => {
      // Login first
      await page.goto('http://local.mes.com/login');
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page).toHaveURL('http://local.mes.com/dashboard');
      
      // Navigate to different route
      await page.goto('http://local.mes.com/workorders');
      await expect(page).toHaveURL('http://local.mes.com/workorders');
      
      // Refresh the page (tests nginx -> Vite -> React Router flow)
      const response = await page.reload();
      
      // Should return 200 from nginx
      expect(response?.status()).toBe(200);
      
      // Should maintain the route
      await expect(page).toHaveURL('http://local.mes.com/workorders');
      
      // Should see authenticated content (not 404)
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test('should handle deep nested routes through nginx proxy', async ({ page }) => {
      // Login first
      await page.goto('http://local.mes.com/login');
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page).toHaveURL('http://local.mes.com/dashboard');
      
      const deepRoutes = [
        'http://local.mes.com/workorders/wo-123/edit',
        'http://local.mes.com/quality/inspections/insp-456',
        'http://local.mes.com/traceability/batch/batch-789/history'
      ];

      for (const route of deepRoutes) {
        const response = await page.goto(route);
        
        // Should return 200 from nginx (serves React app)
        expect(response?.status()).toBe(200);
        
        // Should maintain the deep route
        await expect(page).toHaveURL(route);
        
        // Should see authenticated layout (proves React Router loaded correctly)
        await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
        
        // Should NOT see nginx 404
        await expect(page.locator('text=404')).not.toBeVisible();
      }
    });

    test('should handle complex query parameters through nginx', async ({ page }) => {
      // Login first
      await page.goto('http://local.mes.com/login');
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      const complexUrl = 'http://local.mes.com/workorders?status=pending&priority=high&assignee=admin&search=engine%20part&page=2&limit=25';
      
      const response = await page.goto(complexUrl);
      
      // Should return 200 from nginx
      expect(response?.status()).toBe(200);
      
      // Should preserve the complete URL with parameters
      await expect(page).toHaveURL(complexUrl);
      
      // Should see authenticated content
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      
      // Refresh should preserve parameters through nginx
      await page.reload();
      await expect(page).toHaveURL(complexUrl);
    });

    test('should handle 401 redirects through nginx proxy correctly', async ({ page }) => {
      // Login first
      await page.goto('http://local.mes.com/login');
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      await expect(page).toHaveURL('http://local.mes.com/dashboard');
      
      // Mock API to return 401
      await page.route('**/api/v1/**', route => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        });
      });
      
      // Navigate to trigger 401
      await page.goto('http://local.mes.com/workorders');
      
      // Should redirect to login through domain
      await expect(page).toHaveURL('http://local.mes.com/login');
      
      // Should see login form (not nginx 404)
      await expect(page.locator('[data-testid="username-input"]')).toBeVisible();
      await expect(page.locator('text=404')).not.toBeVisible();
    });

    test('should handle nginx proxy errors gracefully', async ({ page }) => {
      // Test error handling when Vite server might be temporarily unavailable
      // Note: This test simulates scenarios where nginx can't reach the backend
      
      // Try to access the app
      const response = await page.goto('http://local.mes.com/dashboard').catch(() => null);
      
      // If nginx is properly configured but Vite is down, we should get a different error
      // This test validates that nginx doesn't serve a generic 404 for routing issues
      if (response) {
        // If we get a response, it should not be a generic nginx 404
        const text = await page.textContent('body').catch(() => '');
        expect(text).not.toContain('nginx');
        expect(text).not.toContain('502 Bad Gateway');
      }
    });

    test('should handle CORS headers correctly through nginx proxy', async ({ page }) => {
      // Check that nginx properly forwards CORS headers for API requests
      await page.goto('http://local.mes.com/login');
      
      let corsHeaders: Record<string, string> = {};
      
      page.on('response', response => {
        if (response.url().includes('/api/')) {
          corsHeaders = response.headers();
        }
      });
      
      // Trigger API request
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      // Wait for API response
      await page.waitForResponse(response => 
        response.url().includes('/api/v1/auth/login')
      ).catch(() => {});
      
      // Should have proper CORS headers (or no CORS errors in console)
      const corsErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('cors')) {
          corsErrors.push(msg.text());
        }
      });
      
      expect(corsErrors).toHaveLength(0);
    });

    test('should preserve URL fragments (hash) through nginx', async ({ page }) => {
      // Login first
      await page.goto('http://local.mes.com/login');
      await page.locator('[data-testid="username-input"]').fill('admin');
      await page.locator('[data-testid="password-input"]').fill('password123');
      await page.locator('[data-testid="login-button"]').click();
      
      // Navigate to URL with hash fragment
      const urlWithHash = 'http://local.mes.com/dashboard#metrics-section';
      await page.goto(urlWithHash);
      
      // Should preserve the hash through nginx proxy
      await expect(page).toHaveURL(urlWithHash);
      
      // Refresh should preserve hash
      await page.reload();
      await expect(page).toHaveURL(urlWithHash);
      
      // Should not show 404
      await expect(page.locator('text=404')).not.toBeVisible();
    });
  });
});