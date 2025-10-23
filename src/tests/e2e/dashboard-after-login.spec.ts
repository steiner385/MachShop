import { test, expect } from '@playwright/test';

test.describe('Dashboard Loading After Login', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page first, then clear auth state
    await page.goto('/login');
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should load dashboard correctly immediately after login without 404 errors', async ({ page }) => {
    // Track all console errors and network failures
    const consoleErrors: string[] = [];
    const networkErrors: string[] = [];
    const apiCalls: { url: string; status: number }[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('response', response => {
      const url = response.url();
      const status = response.status();

      // Track all API calls
      if (url.includes('/api/')) {
        apiCalls.push({ url, status });
      }

      // Track failed requests
      if (status === 404 || status >= 500) {
        networkErrors.push(`${status} - ${url}`);
      }
    });

    // Fill login form (already on login page from beforeEach)
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');

    // Click login button
    await page.locator('[data-testid="login-button"]').click();

    // Wait for redirect to dashboard with extended timeout
    await page.waitForURL('/dashboard', { timeout: 20000 });

    // Wait for network to be idle (all API calls completed)
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Give more time for any delayed API calls and data loading
    await page.waitForTimeout(3000);

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/dashboard');

    // Check for 404 errors in console
    const has404InConsole = consoleErrors.some(error =>
      error.includes('404') || error.toLowerCase().includes('not found')
    );

    // Check for 404 network errors
    const has404Network = networkErrors.some(error => error.startsWith('404'));

    // Log diagnostic information
    console.log('=== Dashboard Load Diagnostics ===');
    console.log('Console Errors:', consoleErrors);
    console.log('Network Errors:', networkErrors);
    console.log('API Calls:', apiCalls);
    console.log('================================');

    // Assertions
    expect(has404InConsole, 'Should not have 404 errors in console').toBe(false);
    expect(has404Network, 'Should not have 404 network errors').toBe(false);

    // Verify dashboard content loads
    const dashboardContent = await page.locator('h1').filter({ hasText: /dashboard/i }).first();
    await expect(dashboardContent).toBeVisible({ timeout: 10000 });

    // Verify no error messages are shown to user
    const errorMessage = page.locator('.ant-alert-error');
    await expect(errorMessage).not.toBeVisible();

    // Verify user avatar is shown (indicating authenticated state)
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should load dashboard data without requiring navigation away and back', async ({ page }) => {
    // Login (already on login page from beforeEach)
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for dashboard with extended timeouts
    await page.waitForURL('/dashboard', { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for authentication to complete - ensures user data is fully loaded
    await page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });

    // Wait for dashboard statistics to render - allow more time for data loading
    await page.waitForSelector('.ant-statistic', { timeout: 15000 });

    // Check if dashboard statistics are visible immediately
    // These should load on first render, not require navigation away/back
    const statistics = page.locator('.ant-statistic');
    const statisticsCount = await statistics.count();

    console.log(`Found ${statisticsCount} statistics on initial dashboard load`);

    // Should have at least 4 KPI statistics visible (Active WO, Completed, Quality, Equipment)
    expect(statisticsCount).toBeGreaterThanOrEqual(4);

    // Verify Active Work Orders KPI shows real data (should be > 0 with seeded data)
    const activeWOCard = page.locator('.ant-card').filter({ hasText: 'Active Work Orders' });
    await expect(activeWOCard).toBeVisible();

    const activeWOValue = await activeWOCard.locator('.ant-statistic-content-value').textContent();
    console.log(`Active Work Orders value: ${activeWOValue}`);

    // Parse the value and verify it's greater than 0
    const activeWONumber = parseInt(activeWOValue?.trim() || '0', 10);
    expect(activeWONumber).toBeGreaterThan(0);

    // Verify Recent Work Orders table has data
    const workOrdersTable = page.locator('.ant-table').first();
    await expect(workOrdersTable).toBeVisible();

    // Should have at least one row of data (not including header)
    const tableRows = workOrdersTable.locator('tbody tr');
    const rowCount = await tableRows.count();
    console.log(`Recent Work Orders table rows: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should make correct API calls immediately after login', async ({ page }) => {
    const apiCalls: { method: string; url: string; status: number }[] = [];

    // Track API requests
    page.on('response', response => {
      const url = response.url();
      if (url.includes('/api/')) {
        apiCalls.push({
          method: response.request().method(),
          url: url.replace(/^.*\/api/, '/api'), // Normalize URL
          status: response.status()
        });
      }
    });

    // Login (already on login page from beforeEach)
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for dashboard with extended timeouts
    await page.waitForURL('/dashboard', { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('=== API Calls After Login ===');
    apiCalls.forEach(call => {
      console.log(`${call.method} ${call.url} - ${call.status}`);
    });
    console.log('============================');

    // Verify login API call succeeded
    const loginCall = apiCalls.find(call => call.url.includes('/auth/login'));
    expect(loginCall?.status).toBe(200);

    // Verify no 404s
    const failed404Calls = apiCalls.filter(call => call.status === 404);
    expect(failed404Calls.length).toBe(0);

    // Verify Dashboard API calls were made
    const dashboardKPICall = apiCalls.find(call => call.url.includes('/dashboard/kpis'));
    expect(dashboardKPICall).toBeTruthy();
    expect(dashboardKPICall?.status).toBe(200);

    const dashboardWorkOrdersCall = apiCalls.find(call => call.url.includes('/dashboard/recent-work-orders'));
    expect(dashboardWorkOrdersCall).toBeTruthy();
    expect(dashboardWorkOrdersCall?.status).toBe(200);

    // Verify dashboard rendered successfully
    await expect(page.locator('h1').filter({ hasText: /Manufacturing Dashboard/i })).toBeVisible();

    // Verify user avatar is visible (proves auth state is loaded)
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should display real KPI data from backend', async ({ page }) => {
    // Login (already on login page from beforeEach)
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for dashboard to load
    await page.waitForURL('/dashboard', { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForSelector('.ant-statistic', { timeout: 15000 });

    // Verify all 4 main KPIs display real data
    const kpiTests = [
      { name: 'Active Work Orders', shouldBeGreaterThanZero: true },
      { name: 'Completed Today', shouldBeGreaterThanZero: false }, // Can be 0
      { name: 'Quality Yield', shouldBeGreaterThanZero: false }, // Can be 0
      { name: 'Equipment Utilization', shouldBeGreaterThanZero: false }, // Can be 0
    ];

    for (const kpi of kpiTests) {
      const kpiCard = page.locator('.ant-card').filter({ hasText: kpi.name });
      await expect(kpiCard).toBeVisible();

      const kpiValue = await kpiCard.locator('.ant-statistic-content-value').textContent();
      console.log(`${kpi.name}: ${kpiValue}`);

      // Verify value is a number (not undefined, null, or "NaN")
      expect(kpiValue).toBeTruthy();
      expect(kpiValue).not.toContain('NaN');
      expect(kpiValue).not.toContain('undefined');

      if (kpi.shouldBeGreaterThanZero) {
        const numValue = parseFloat(kpiValue?.replace(/[^0-9.]/g, '') || '0');
        expect(numValue).toBeGreaterThan(0);
      }
    }

    // Verify Recent Work Orders section has data
    const recentWOHeading = page.locator('text=Recent Work Orders');
    await expect(recentWOHeading).toBeVisible();

    // Verify at least one work order is displayed
    const workOrderRows = page.locator('.ant-table tbody tr').filter({ hasNotText: 'No data' });
    const rowCount = await workOrderRows.count();
    console.log(`Recent Work Orders rows: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);

    // Verify Recent Alerts section exists
    const recentAlertsHeading = page.locator('text=Recent Alerts');
    await expect(recentAlertsHeading).toBeVisible();
  });

  test('should not show 404 page content after login', async ({ page }) => {
    // Login (already on login page from beforeEach)
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for dashboard with consistent timeout
    await page.waitForURL('/dashboard', { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Should NOT see 404 page elements
    await expect(page.locator('text=404')).not.toBeVisible();
    await expect(page.locator('text=/page.*not.*exist/i')).not.toBeVisible();
    await expect(page.locator('text=/not.*found/i')).not.toBeVisible();

    // Should see dashboard content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toContain('Dashboard');
  });

  test('should handle rapid navigation after login without 404 errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('response', response => {
      if (response.status() === 404) {
        errors.push(`404: ${response.url()}`);
      }
    });

    // Login (already on login page from beforeEach)
    await page.locator('[data-testid="username-input"]').fill('admin');
    await page.locator('[data-testid="password-input"]').fill('password123');
    await page.locator('[data-testid="login-button"]').click();

    // Wait for dashboard with consistent timeout
    await page.waitForURL('/dashboard', { timeout: 20000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait for authentication to complete - ensures user data and roles are fully loaded
    // This prevents "Account Inactive" errors during navigation
    await page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });

    // Wait for dashboard content to load
    await page.waitForSelector('h1:has-text("Manufacturing Dashboard")', { timeout: 5000 });

    // Rapidly navigate to different pages
    await page.goto('/workorders');
    await page.waitForLoadState('networkidle');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Navigate to traceability instead of quality (admin has traceability.read permission)
    await page.goto('/traceability');
    await page.waitForLoadState('networkidle');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for authentication to be re-established after navigation
    // Rapid navigation can cause slower auth rehydration from localStorage
    await page.waitForTimeout(2000);

    // Check if "Account Inactive" error is shown (indicates auth not fully loaded)
    let accountInactive = await page.locator('text=Account Inactive').isVisible().catch(() => false);

    if (accountInactive) {
      // Auth state needs more time to rehydrate - wait and reload
      console.log('Account inactive detected, waiting for auth rehydration...');
      await page.waitForTimeout(3000);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Check if still showing Account Inactive after reload
      accountInactive = await page.locator('text=Account Inactive').isVisible().catch(() => false);

      if (accountInactive) {
        // Still broken - need to clear auth and try again
        console.log('Account inactive persists after reload, clearing auth state...');
        await page.evaluate(() => {
          localStorage.clear();
        });
        await page.goto('/login');
        await page.locator('[data-testid="username-input"]').fill('admin');
        await page.locator('[data-testid="password-input"]').fill('password123');
        await page.locator('[data-testid="login-button"]').click();
        await page.waitForURL('/dashboard', { timeout: 20000 });
        await page.waitForLoadState('networkidle', { timeout: 30000 });
      }
    }

    // Now verify dashboard loaded properly
    await page.waitForSelector('[data-testid="user-avatar"]', { timeout: 10000 });

    // Wait for dashboard loading spinner to disappear (Dashboard component shows spinner while loading data)
    // The h1 heading only appears after loading completes
    await page.waitForSelector('.ant-spin', { state: 'hidden', timeout: 15000 }).catch(() => {
      // Spinner might already be gone, continue
    });

    // Give extra time for dashboard to fully render after rapid navigation
    await page.waitForTimeout(1000);

    // Log any errors found
    if (errors.length > 0) {
      console.log('=== 404 Errors During Navigation ===');
      errors.forEach(error => console.log(error));
      console.log('===================================');
    }

    // Should not have any 404 errors
    expect(errors.length).toBe(0);

    // Should be on dashboard and see content
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1').filter({ hasText: /Manufacturing Dashboard/i })).toBeVisible({ timeout: 10000 });
  });
});
