import { test, expect } from '@playwright/test';

test.describe('CSP API Violations Detection', () => {
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

  test('should not have CSP violations when making API calls', async ({ page }) => {
    // Set up CSP violation tracking
    const cspViolations: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    // Track security policy violations
    page.on('response', response => {
      if (response.status() === 200 && response.headers()['content-security-policy-report-only']) {
        // Check for CSP violation reports
        console.log('CSP Report Only header detected:', response.headers()['content-security-policy-report-only']);
      }
    });

    // Login first to establish auth state
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for authentication with robust waiting
    try {
      await page.waitForURL('/dashboard', { timeout: 20000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch (error) {
      console.warn('Dashboard navigation timeout, checking auth state...');
      // Check if authentication succeeded even if navigation is slow
      const authState = await page.evaluate(() => {
        const authData = localStorage.getItem('mes-auth-storage');
        try {
          const parsed = authData ? JSON.parse(authData) : null;
          return parsed?.state?.token ? true : false;
        } catch { return false; }
      });
      if (authState) {
        console.log('Auth state valid, manually navigating to dashboard...');
        await page.goto('/dashboard');
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      } else {
        throw error;
      }
    }

    // Navigate to pages that make API calls and check for CSP violations
    const apiHeavyPages = ['/workorders', '/quality', '/traceability', '/equipment'];
    
    for (const pageUrl of apiHeavyPages) {
      console.log(`Testing CSP violations on ${pageUrl}`);
      await page.goto(pageUrl);
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Wait for potential API calls to complete and CSP to be evaluated
      await page.waitForTimeout(5000);
      
      // Check for CSP violations related to API calls
      const apiCspViolations = cspViolations.filter(violation => 
        violation.includes('connect-src') || 
        violation.includes('localhost:3001') ||
        violation.includes('api')
      );
      
      if (apiCspViolations.length > 0) {
        console.error(`CSP violations on ${pageUrl}:`, apiCspViolations);
      }
      
      expect(apiCspViolations).toHaveLength(0);
    }
    
    // Final check - should not have any CSP violations
    const totalApiViolations = cspViolations.filter(violation => 
      violation.includes('connect-src') || 
      violation.includes('localhost:3001') ||
      violation.includes('api')
    );
    
    expect(totalApiViolations).toHaveLength(0);
  });

  test('should handle failed API calls gracefully without CSP blocking', async ({ page }) => {
    // Track network failures and CSP violations
    const networkFailures: string[] = [];
    const cspViolations: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        if (msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text());
        } else if (msg.text().includes('Network Error') || msg.text().includes('ERR_NETWORK')) {
          networkFailures.push(msg.text());
        }
      }
    });

    // Track failed requests
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('api')) {
        console.log(`API request failed: ${response.status()} ${response.url()}`);
      }
    });

    // Login
    await page.goto('/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    await Promise.race([
      page.waitForURL('/dashboard', { timeout: 15000 }),
      page.waitForTimeout(10000)
    ]);

    // Navigate to Work Orders page which makes API calls
    await page.goto('/workorders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    // Check that if there are network failures, they're not due to CSP blocking
    if (networkFailures.length > 0) {
      console.log('Network failures detected:', networkFailures);
      
      // Network failures should NOT be caused by CSP violations
      const cspCausedFailures = networkFailures.filter(failure => 
        cspViolations.some(violation => 
          violation.includes('connect-src') && 
          (violation.includes('localhost:3001') || violation.includes('api'))
        )
      );
      
      expect(cspCausedFailures).toHaveLength(0);
    }

    // Should not have CSP violations blocking API calls
    const apiCspViolations = cspViolations.filter(violation => 
      violation.includes('connect-src') && 
      (violation.includes('localhost:3001') || violation.includes('api'))
    );
    
    expect(apiCspViolations).toHaveLength(0);
  });

  test('should allow WebSocket connections for HMR without CSP violations', async ({ page }) => {
    const cspViolations: string[] = [];
    const websocketErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        if (msg.text().includes('Content Security Policy')) {
          cspViolations.push(msg.text());
        } else if (msg.text().includes('WebSocket') || msg.text().includes('ws:')) {
          websocketErrors.push(msg.text());
        }
      }
    });

    // Navigate to any page to trigger HMR connections
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Wait for WebSocket connections to establish
    await page.waitForTimeout(5000);

    // Check for WebSocket-related CSP violations
    const websocketCspViolations = cspViolations.filter(violation => 
      violation.includes('connect-src') && 
      (violation.includes('ws:') || violation.includes('wss:') || violation.includes('localhost:5178'))
    );
    
    expect(websocketCspViolations).toHaveLength(0);
    
    // Should not have WebSocket connection errors due to CSP
    const cspCausedWebsocketErrors = websocketErrors.filter(error => 
      cspViolations.some(violation => violation.includes('ws:') || violation.includes('wss:'))
    );
    
    expect(cspCausedWebsocketErrors).toHaveLength(0);
  });

  test('should work correctly with domain-based access', async ({ page }) => {
    const cspViolations: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    // Test with domain-based access (local.mes.com)
    await page.goto('http://local.mes.com/login');
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    await Promise.race([
      page.waitForURL('http://local.mes.com/dashboard', { timeout: 15000 }),
      page.waitForTimeout(10000)
    ]);

    // Navigate to API-heavy page
    await page.goto('http://local.mes.com/workorders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Should not have CSP violations when accessing via domain
    const domainCspViolations = cspViolations.filter(violation => 
      violation.includes('connect-src') && 
      (violation.includes('localhost:3001') || violation.includes('local.mes.com:3001'))
    );
    
    expect(domainCspViolations).toHaveLength(0);
  });
});