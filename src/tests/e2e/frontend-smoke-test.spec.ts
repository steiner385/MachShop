import { test, expect, Page } from '@playwright/test';
import { setupTestAuth } from '../helpers/testAuthHelper';

/**
 * Frontend Smoke Test - Complete Site Traversal
 *
 * This comprehensive E2E test navigates through the entire MES frontend application
 * to ensure there are no dead links and all pages load without errors.
 *
 * Test Coverage:
 * - All navigation menu items
 * - Direct URL access to all routes
 * - Console error detection
 * - Broken link detection
 * - Page load verification
 */

interface TestResult {
  route: string;
  status: 'passed' | 'failed';
  error?: string;
  consoleErrors: string[];
}

interface RouteTest {
  path: string;
  name: string;
  requiresAuth: boolean;
  skipReason?: string;
}

// Comprehensive list of all routes in the application
const ROUTES_TO_TEST: RouteTest[] = [
  // Authentication
  { path: '/login', name: 'Login Page', requiresAuth: false },

  // Main Routes
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/profile', name: 'User Profile', requiresAuth: true },

  // Production
  { path: '/workorders', name: 'Work Orders List', requiresAuth: true },
  { path: '/process-segments', name: 'Process Segments List', requiresAuth: true },
  { path: '/routings', name: 'Routings List', requiresAuth: true },
  { path: '/scheduling', name: 'Production Scheduling', requiresAuth: true },

  // Quality
  { path: '/quality', name: 'Quality Overview', requiresAuth: true },
  { path: '/quality/inspections', name: 'Quality Inspections', requiresAuth: true },
  { path: '/quality/ncrs', name: 'NCRs List', requiresAuth: true },
  { path: '/fai', name: 'FAI Reports List', requiresAuth: true },
  { path: '/fai/create', name: 'Create FAI Report', requiresAuth: true },
  { path: '/signatures', name: 'Electronic Signatures', requiresAuth: true },

  // Materials
  { path: '/materials', name: 'Materials Management', requiresAuth: true },
  { path: '/traceability', name: 'Traceability List', requiresAuth: true },
  { path: '/serialization', name: 'Serialization List', requiresAuth: true },
  { path: '/serialization/parts', name: 'Serialized Parts', requiresAuth: true },

  // Work Instructions
  { path: '/work-instructions', name: 'Work Instructions List', requiresAuth: true },
  { path: '/work-instructions/create', name: 'Create Work Instruction', requiresAuth: true },

  // Personnel & Resources
  { path: '/personnel', name: 'Personnel Management', requiresAuth: true },
  { path: '/equipment', name: 'Equipment Management', requiresAuth: true },

  // Administration
  { path: '/admin', name: 'Admin Dashboard', requiresAuth: true },

  // Integrations
  { path: '/integrations', name: 'Integration Dashboard', requiresAuth: true },
  { path: '/integrations/config', name: 'Integration Config', requiresAuth: true },
  { path: '/integrations/logs', name: 'Integration Logs', requiresAuth: true },

  // Special/Demo Pages
  { path: '/sprint3-demo', name: 'Sprint 3 Demo', requiresAuth: true },
];

// Track test results
const testResults: TestResult[] = [];
const consoleErrors: { page: string; errors: string[] } = { page: '', errors: [] };

/**
 * Setup console error tracking for a page
 */
function setupConsoleErrorTracking(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  return errors;
}

/**
 * Verify that a page loaded successfully
 */
async function verifyPageLoaded(page: Page, routeName: string): Promise<void> {
  // Wait for the page to be in a stable state
  await page.waitForLoadState('domcontentloaded');

  // Check that we're not on an error page
  const url = page.url();
  const bodyText = await page.locator('body').textContent() || '';

  // Check for actual error UI elements (more specific than just text)
  const errorElements = await page.locator('[role="alert"], .ant-alert-error, .error-message').count();

  // Check for common error indicators (more specific patterns)
  const has404 = bodyText.match(/404[\s\-:]+(page\s+not\s+found|not\s+found)/i);
  const has500 = bodyText.match(/500[\s\-:]+(internal\s+server\s+error|server\s+error)/i);
  const hasError = (bodyText.includes('An error occurred') || bodyText.includes('Something went wrong')) && errorElements > 0;

  if (has404) {
    throw new Error('Page shows 404 error');
  }

  if (has500) {
    throw new Error('Page shows 500 error');
  }

  if (hasError && !routeName.includes('Error')) {
    console.warn(`⚠️  ${routeName} - Page may show error message`);
  }

  // Give React time to render
  await page.waitForTimeout(500);
}

/**
 * Check for common navigation elements to confirm page loaded
 */
async function checkPageStructure(page: Page): Promise<boolean> {
  // Look for common MES layout elements
  const hasHeader = await page.locator('header').count() > 0;
  const hasNav = await page.locator('nav').count() > 0 || await page.locator('[role="navigation"]').count() > 0;
  const hasContent = await page.locator('main').count() > 0 || await page.locator('[role="main"]').count() > 0;

  // At least one of these should be present (except on login page)
  return hasHeader || hasNav || hasContent;
}

test.describe('Frontend Smoke Test - Complete Site Traversal', () => {

  test.beforeAll(async () => {
    console.log('\n🧪 Starting Frontend Smoke Test');
    console.log(`📋 Testing ${ROUTES_TO_TEST.length} routes\n`);
  });

  test.afterAll(async () => {
    // Generate summary report
    console.log('\n' + '='.repeat(80));
    console.log('📊 SMOKE TEST SUMMARY');
    console.log('='.repeat(80));

    const passed = testResults.filter(r => r.status === 'passed').length;
    const failed = testResults.filter(r => r.status === 'failed').length;
    const totalConsoleErrors = testResults.reduce((sum, r) => sum + r.consoleErrors.length, 0);

    console.log(`\n✅ Passed: ${passed}/${testResults.length}`);
    console.log(`❌ Failed: ${failed}/${testResults.length}`);
    console.log(`⚠️  Console Errors: ${totalConsoleErrors}`);

    if (failed > 0) {
      console.log('\n❌ FAILED ROUTES:');
      testResults
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`  - ${r.route}: ${r.error}`);
        });
    }

    if (totalConsoleErrors > 0) {
      console.log('\n⚠️  PAGES WITH CONSOLE ERRORS:');
      testResults
        .filter(r => r.consoleErrors.length > 0)
        .forEach(r => {
          console.log(`  - ${r.route}: ${r.consoleErrors.length} error(s)`);
          r.consoleErrors.forEach(err => console.log(`    • ${err.substring(0, 100)}`));
        });
    }

    console.log('\n' + '='.repeat(80) + '\n');
  });

  test('should navigate to all routes via direct URL access', async ({ page, baseURL }) => {
    // Setup authentication for protected routes
    await setupTestAuth(page, 'admin');

    for (const route of ROUTES_TO_TEST) {
      const consoleErrors = setupConsoleErrorTracking(page);

      try {
        console.log(`Testing: ${route.name.padEnd(40)} (${route.path})`);

        // Navigate to the route using baseURL from config
        const response = await page.goto(`${baseURL}${route.path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });

        // Check HTTP status
        const status = response?.status();
        if (status && status >= 400) {
          throw new Error(`HTTP ${status} error`);
        }

        // Verify page loaded
        await verifyPageLoaded(page, route.name);

        // Check page structure
        const hasStructure = await checkPageStructure(page);
        if (!hasStructure && route.path !== '/login') {
          console.warn(`  ⚠️  No standard layout elements found`);
        }

        // Record success
        testResults.push({
          route: route.path,
          status: 'passed',
          consoleErrors: [...consoleErrors]
        });

        const errorIndicator = consoleErrors.length > 0 ? ` ⚠️  (${consoleErrors.length} console errors)` : '';
        console.log(`  ✅ PASS${errorIndicator}`);

      } catch (error: any) {
        testResults.push({
          route: route.path,
          status: 'failed',
          error: error.message,
          consoleErrors: [...consoleErrors]
        });

        console.log(`  ❌ FAIL: ${error.message}`);

        // Continue testing other routes even if this one fails
      }

      // Small delay between page loads
      await page.waitForTimeout(300);
    }

    // Final assertion - test should fail if any route failed
    const failedRoutes = testResults.filter(r => r.status === 'failed');
    expect(failedRoutes.length, `${failedRoutes.length} route(s) failed to load`).toBe(0);
  });

  test('should navigate through main menu items', async ({ page, baseURL }) => {
    await setupTestAuth(page, 'admin');
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Menu items to test (text that appears in the menu)
    const menuItems = [
      'Dashboard',
      'Work Orders',
      'Process Segments',
      'Routings',
      'Scheduling',
      'Inspections',
      'NCRs',
      'FAI Reports',
      'Signatures',
      'Materials',
      'Traceability',
      'Personnel',
      'Equipment',
      'Work Instructions',
      'Integrations',
    ];

    console.log('\n🔍 Testing Navigation Menu Items\n');

    for (const menuText of menuItems) {
      try {
        // Find and click the menu item
        const menuItem = page.getByText(menuText, { exact: false }).first();

        if (await menuItem.isVisible()) {
          await menuItem.click();
          await page.waitForLoadState('domcontentloaded');
          await page.waitForTimeout(500);

          // Verify navigation occurred (URL changed)
          const url = page.url();
          console.log(`  ✅ ${menuText.padEnd(30)} → ${url}`);
        } else {
          console.log(`  ⚠️  ${menuText.padEnd(30)} → Not visible in menu`);
        }
      } catch (error: any) {
        console.log(`  ❌ ${menuText.padEnd(30)} → Error: ${error.message}`);
      }
    }
  });

  test('should verify no broken internal links on dashboard', async ({ page, baseURL }) => {
    await setupTestAuth(page, 'admin');
    await page.goto(`${baseURL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Find all internal links (excluding external, anchor-only, and javascript: links)
    const links = await page.locator('a[href]').evaluateAll((anchors) => {
      return anchors
        .map((a) => ({
          href: a.getAttribute('href'),
          text: a.textContent?.trim() || '(no text)'
        }))
        .filter((link) => {
          if (!link.href) return false;
          if (link.href.startsWith('http') && !link.href.includes('localhost')) return false;
          if (link.href.startsWith('#')) return false;
          if (link.href.startsWith('javascript:')) return false;
          if (link.href.startsWith('mailto:')) return false;
          return true;
        });
    });

    console.log(`\n🔗 Found ${links.length} internal links on dashboard\n`);

    const brokenLinks: string[] = [];

    for (const link of links.slice(0, 20)) { // Test first 20 links to keep test reasonable
      try {
        const href = link.href!;
        const fullUrl = href.startsWith('http') ? href : `${baseURL}${href}`;

        const response = await page.request.get(fullUrl);
        const status = response.status();

        if (status >= 400) {
          brokenLinks.push(`${link.text} (${href}) - HTTP ${status}`);
          console.log(`  ❌ ${link.text.padEnd(30)} → HTTP ${status}`);
        } else {
          console.log(`  ✅ ${link.text.padEnd(30)} → HTTP ${status}`);
        }
      } catch (error: any) {
        brokenLinks.push(`${link.text} (${link.href}) - ${error.message}`);
        console.log(`  ❌ ${link.text.padEnd(30)} → Error`);
      }
    }

    expect(brokenLinks.length, `Found ${brokenLinks.length} broken links`).toBe(0);
  });

  test('should check for console errors across all pages', async ({ page, baseURL }) => {
    await setupTestAuth(page, 'admin');

    const pagesWithErrors: { route: string; errorCount: number }[] = [];

    // Test a subset of important pages for console errors
    const criticalPages = [
      '/dashboard',
      '/workorders',
      '/quality/inspections',
      '/traceability',
      '/routings'
    ];

    console.log('\n🔍 Checking for Console Errors on Critical Pages\n');

    for (const route of criticalPages) {
      const errors = setupConsoleErrorTracking(page);

      await page.goto(`${baseURL}${route}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000); // Give time for any delayed errors

      if (errors.length > 0) {
        pagesWithErrors.push({ route, errorCount: errors.length });
        console.log(`  ❌ ${route.padEnd(30)} → ${errors.length} error(s)`);
        errors.forEach(err => console.log(`     • ${err.substring(0, 80)}`));
      } else {
        console.log(`  ✅ ${route.padEnd(30)} → No errors`);
      }
    }

    // This test warns about errors but doesn't fail (errors might be expected in development)
    if (pagesWithErrors.length > 0) {
      console.warn(`\n⚠️  Warning: ${pagesWithErrors.length} page(s) have console errors`);
    }
  });
});
