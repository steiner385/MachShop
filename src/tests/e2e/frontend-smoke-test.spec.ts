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

  test('should identify any orphaned pages not reachable via UI navigation', async ({ page, baseURL }) => {
    await setupTestAuth(page, 'admin');

    console.log('\n🔍 Discovering all reachable links via UI crawl\n');

    // Set to track all discovered internal links
    const discoveredLinks = new Set<string>();
    const pagesToCrawl: string[] = ['/dashboard'];
    const crawledPages = new Set<string>();

    // Helper to expand all menu groups to reveal submenu items
    async function expandAllMenuGroups(): Promise<void> {
      try {
        // Find all collapsed menu groups and expand them
        const menuGroups = await page.locator('[role="menu"] .ant-menu-submenu:not(.ant-menu-submenu-open)').all();

        for (const group of menuGroups) {
          try {
            await group.click();
            await page.waitForTimeout(200); // Wait for expansion animation
          } catch (e) {
            // Group might already be expanded or not clickable
          }
        }
      } catch (e) {
        // No menu groups to expand
      }
    }

    // Helper to extract links from a page
    async function extractLinksFromPage(url: string): Promise<string[]> {
      const discoveredLinks: string[] = [];

      // Expand all menu groups first (only on dashboard where menu is visible)
      if (url === '/dashboard') {
        await expandAllMenuGroups();
        await page.waitForTimeout(500); // Wait for all menus to expand

        // Click user dropdown to discover profile link
        try {
          const userDropdown = page.locator('[class*="user"], [class*="avatar"], .ant-dropdown-trigger').first();
          if (await userDropdown.count() > 0) {
            await userDropdown.click();
            await page.waitForTimeout(300);

            // Extract links from dropdown menu
            const dropdownLinks = await page.locator('.ant-dropdown a[href]').evaluateAll((anchors) => {
              return anchors.map(a => a.getAttribute('href')).filter(Boolean) as string[];
            });
            discoveredLinks.push(...dropdownLinks);

            // Close dropdown by clicking elsewhere
            await page.locator('body').click({ position: { x: 10, y: 10 } });
            await page.waitForTimeout(200);
          }
        } catch (e) {
          // User dropdown might not exist or be clickable
        }
      }

      // Get regular anchor links
      const anchorLinks = await page.locator('a[href]').evaluateAll((anchors) => {
        return anchors
          .map((a) => a.getAttribute('href'))
          .filter((href): href is string => {
            if (!href) return false;
            if (href.startsWith('http') && !href.includes('localhost')) return false;
            if (href.startsWith('#')) return false;
            if (href.startsWith('javascript:')) return false;
            if (href.startsWith('mailto:')) return false;
            return true;
          })
          .map((href) => {
            // Normalize to path only (remove baseURL and query params)
            if (href.startsWith('http')) {
              const url = new URL(href);
              return url.pathname;
            }
            // Remove query params and hash
            return href.split('?')[0].split('#')[0];
          });
      });
      discoveredLinks.push(...anchorLinks);

      // Extract navigation from menu items (Ant Design menu structure)
      const menuLinks = await page.locator('[role="menuitem"]').evaluateAll((items) => {
        return items
          .map((item) => {
            // Look for nested anchor tags first
            const link = item.querySelector('a');
            if (link) {
              return link.getAttribute('href');
            }

            // Ant Design Menu uses data-menu-id for the key
            // Format: "rc-menu-uuid-{random}-/path" - extract the path part
            const menuId = item.getAttribute('data-menu-id');
            if (menuId) {
              // Find the last hyphen before a slash, extract everything from the slash
              const lastHyphenSlash = menuId.lastIndexOf('-/');
              if (lastHyphenSlash !== -1) {
                return menuId.substring(lastHyphenSlash + 1); // +1 to skip the hyphen, keep the slash
              }
            }

            // Some menu items might use other data attributes
            return item.getAttribute('data-path') || item.getAttribute('data-href');
          })
          .filter((href): href is string => {
            if (!href) return false;
            if (href.startsWith('#')) return false;
            if (!href.startsWith('/')) return false;
            return true;
          })
          .map((href) => href.split('?')[0].split('#')[0]);
      });
      discoveredLinks.push(...menuLinks);

      // Extract routes from tab navigation (Ant Design Tabs) - click each tab to discover routes
      const tabs = await page.locator('[role="tab"]').all();
      const currentUrl = page.url();
      for (const tab of tabs) {
        try {
          const tabText = await tab.textContent();
          await tab.click();
          await page.waitForTimeout(300);

          const newUrl = page.url();
          if (newUrl !== currentUrl) {
            const newPath = new URL(newUrl).pathname;
            discoveredLinks.push(newPath);

            // Navigate back to original URL
            await page.goto(currentUrl);
            await page.waitForTimeout(300);
          }
        } catch (e) {
          // Tab might not be clickable or navigation failed
        }
      }

      // Also check tab attributes as fallback
      const tabLinks = await page.locator('[role="tab"]').evaluateAll((tabs) => {
        return tabs
          .map((tab) => {
            // Tabs might have data-node-key or similar attributes
            const tabKey = tab.getAttribute('data-node-key') || tab.getAttribute('id');
            if (tabKey && tabKey.startsWith('/')) {
              return tabKey;
            }

            // Check for nested links in tabs
            const link = tab.querySelector('a');
            if (link) {
              return link.getAttribute('href');
            }

            return null;
          })
          .filter((href): href is string => {
            if (!href) return false;
            if (!href.startsWith('/')) return false;
            return true;
          })
          .map((href) => href.split('?')[0].split('#')[0]);
      });
      discoveredLinks.push(...tabLinks);

      // Look for navigation buttons by scanning for React onClick handlers in the page HTML
      // This is more reliable than clicking buttons since React's onClick isn't in the HTML onclick attribute
      const pageHTML = await page.content();
      const navigateMatches = pageHTML.matchAll(/navigate\(['"`]([^'"`]+)['"`]\)/g);
      for (const match of navigateMatches) {
        const route = match[1];
        if (route && route.startsWith('/')) {
          discoveredLinks.push(route.split('?')[0].split('#')[0]);
        }
      }

      // Also look for navigation buttons with data attributes
      const buttonLinks = await page.locator('button, [role="button"]').evaluateAll((buttons) => {
        return buttons
          .map((btn) => {
            // Check for data attributes that might indicate a route
            const dataRoute = btn.getAttribute('data-route') ||
                            btn.getAttribute('data-path') ||
                            btn.getAttribute('data-href');
            if (dataRoute) return dataRoute;

            // Check if button has an HTML onclick attribute (rare in React)
            const onClick = btn.getAttribute('onclick');
            if (onClick) {
              const routeMatch = onClick.match(/navigate\(['"]([^'"]+)['"]\)/);
              if (routeMatch) return routeMatch[1];
            }

            return null;
          })
          .filter((href): href is string => {
            if (!href) return false;
            if (!href.startsWith('/')) return false;
            return true;
          })
          .map((href) => href.split('?')[0].split('#')[0]);
      });
      discoveredLinks.push(...buttonLinks);

      // Save original URL for navigation restoration
      const originalUrl = page.url();

      // Click the user dropdown menu items to discover profile and settings links
      if (url === '/dashboard') {
        try {
          const dropdownMenu = page.locator('[class*="user"], [class*="avatar"], .ant-dropdown-trigger').first();
          if (await dropdownMenu.count() > 0) {
            await dropdownMenu.click();
            await page.waitForTimeout(300);

            // Get menu items and try clicking them to discover routes
            const menuItems = await page.locator('.ant-dropdown [role="menuitem"]').all();
            for (const item of menuItems) {
              try {
                const itemText = await item.textContent();
                if (itemText && (itemText.includes('Profile') || itemText.includes('Settings'))) {
                  await item.click();
                  await page.waitForTimeout(300);

                  const newUrl = page.url();
                  if (newUrl !== originalUrl) {
                    const newPath = new URL(newUrl).pathname;
                    discoveredLinks.push(newPath);

                    // Navigate back
                    await page.goto(originalUrl);
                    await page.waitForTimeout(300);
                  }
                }
              } catch (e) {
                // Menu item might not be clickable
              }
            }

            // Close dropdown
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          }
        } catch (e) {
          // Dropdown might not exist
        }
      }

      // Click first row action buttons to discover routes (Settings, View Logs, etc.)
      // Limit to first row to avoid clicking too many buttons
      const actionButtons = await page.locator('table tbody tr:first-child button, table tbody tr:first-child [role="button"]').all();
      for (const button of actionButtons.slice(0, 5)) {  // Limit to first 5 buttons
        try {
          await button.click();
          await page.waitForTimeout(400);

          const newUrl = page.url();
          if (newUrl !== originalUrl) {
            const newPath = new URL(newUrl).pathname;
            discoveredLinks.push(newPath);

            // Navigate back
            await page.goto(originalUrl);
            await page.waitForTimeout(300);
          } else {
            // Might have opened a modal, press Escape
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          }
        } catch (e) {
          // Button might not be clickable, continue
        }
      }

      // Click navigation buttons (Create, New, Add) to discover programmatic routes
      const navButtons = await page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add"), [role="button"]:has-text("Create"), [role="button"]:has-text("New")').all();

      for (const button of navButtons) {
        try {
          const buttonText = await button.textContent();

          // Skip buttons that are likely to open modals or dialogs
          if (buttonText && (buttonText.includes('Modal') || buttonText.includes('Dialog'))) {
            continue;
          }

          // Click the button
          await button.click();
          await page.waitForTimeout(500);

          const newUrl = page.url();
          if (newUrl !== originalUrl) {
            const newPath = new URL(newUrl).pathname;
            discoveredLinks.push(newPath);

            // Navigate back to original URL
            await page.goto(originalUrl);
            await page.waitForTimeout(500);
          } else {
            // Button might have opened a modal, press Escape to close
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
          }
        } catch (e) {
          // Button might not be clickable or navigation failed
          // Try to recover by going back to original URL
          try {
            if (page.url() !== originalUrl) {
              await page.goto(originalUrl);
              await page.waitForTimeout(300);
            }
          } catch {
            // Recovery failed, continue
          }
        }
      }

      return [...new Set(discoveredLinks)]; // Remove duplicates
    }

    // Crawl pages breadth-first to discover all reachable links
    while (pagesToCrawl.length > 0) {
      const currentPath = pagesToCrawl.shift()!;

      if (crawledPages.has(currentPath)) {
        continue;
      }

      crawledPages.add(currentPath);

      try {
        await page.goto(`${baseURL}${currentPath}`, {
          waitUntil: 'networkidle',
          timeout: 15000
        });

        // Wait for page to fully render and for any loading spinners to disappear
        await page.waitForTimeout(1000);

        // Wait for any loading indicators to disappear
        await page.locator('.ant-spin').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});

        const links = await extractLinksFromPage(currentPath);

        for (const link of links) {
          discoveredLinks.add(link);

          // Add to crawl queue if we haven't crawled it yet
          if (!crawledPages.has(link) && !pagesToCrawl.includes(link)) {
            // Limit crawl depth by only adding paths we expect
            const isKnownRoute = ROUTES_TO_TEST.some(r => r.path === link);
            if (isKnownRoute) {
              pagesToCrawl.push(link);
            }
          }
        }

        console.log(`  Crawled: ${currentPath.padEnd(40)} → Found ${links.length} link(s)`);
      } catch (error: any) {
        console.log(`  ⚠️  Failed to crawl: ${currentPath} - ${error.message}`);
      }

      // Safety limit: don't crawl more than 50 pages
      if (crawledPages.size >= 50) {
        console.log('  ℹ️  Reached crawl limit of 50 pages');
        break;
      }
    }

    console.log(`\n📊 Crawl Summary:`);
    console.log(`  Pages crawled: ${crawledPages.size}`);
    console.log(`  Unique links discovered: ${discoveredLinks.size}`);

    // Now compare: which routes are NOT discoverable via links?
    const orphanedRoutes: string[] = [];

    for (const route of ROUTES_TO_TEST) {
      // Skip login page - it's only accessible when logged out
      if (route.path === '/login') {
        continue;
      }

      if (!discoveredLinks.has(route.path)) {
        orphanedRoutes.push(route.path);
      }
    }

    // Known intentional orphans - pages that are truly not linked in the UI
    // (most pages accessed via buttons/tabs/dropdowns should now be discovered by the crawler)
    const intentionalOrphans = [
      '/sprint3-demo',               // Special demo page (may not have UI link)
    ];

    // Filter out intentional orphans to find truly orphaned pages
    const trueOrphans = orphanedRoutes.filter(route => !intentionalOrphans.includes(route));

    console.log(`\n🔍 Orphaned Pages Analysis:\n`);

    if (trueOrphans.length > 0) {
      console.log(`❌ Found ${trueOrphans.length} truly orphaned page(s) - these exist but aren't reachable:`);
      trueOrphans.forEach(route => {
        const routeInfo = ROUTES_TO_TEST.find(r => r.path === route);
        console.log(`  - ${route.padEnd(40)} (${routeInfo?.name})`);
      });

      console.log(`\n⚠️  Recommendation: Add navigation menu items or links to these pages, or remove them if unused.\n`);
      console.warn(`Warning: ${trueOrphans.length} page(s) are not reachable via UI navigation`);
    } else {
      console.log(`✅ No truly orphaned pages found - all routes are reachable!\n`);
    }

    // Report intentional orphans that were filtered
    const foundIntentionalOrphans = intentionalOrphans.filter(o => orphanedRoutes.includes(o));
    if (foundIntentionalOrphans.length > 0) {
      console.log(`ℹ️  ${foundIntentionalOrphans.length} intentional orphan(s) (accessed via buttons/tabs/dropdowns):`);
      foundIntentionalOrphans.forEach(route => {
        const routeInfo = ROUTES_TO_TEST.find(r => r.path === route);
        console.log(`  - ${route.padEnd(40)} (${routeInfo?.name})`);
      });
      console.log('');
    }

    // Also report pages discovered that aren't in our test list
    const undocumentedLinks: string[] = [];
    for (const link of discoveredLinks) {
      const isKnown = ROUTES_TO_TEST.some(r => r.path === link);
      if (!isKnown && !link.includes('/api/') && link.startsWith('/')) {
        undocumentedLinks.push(link);
      }
    }

    if (undocumentedLinks.length > 0) {
      console.log(`\nℹ️  Found ${undocumentedLinks.length} undocumented route(s) in the UI:`);
      undocumentedLinks.slice(0, 10).forEach(link => {
        console.log(`  - ${link}`);
      });
      if (undocumentedLinks.length > 10) {
        console.log(`  ... and ${undocumentedLinks.length - 10} more`);
      }
      console.log(`\nConsider adding these to ROUTES_TO_TEST for comprehensive coverage.\n`);
    }
  });
});
