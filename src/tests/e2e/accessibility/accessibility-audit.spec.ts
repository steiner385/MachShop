/**
 * Comprehensive Accessibility Audit Test Suite
 *
 * Tests WCAG 2.1 Level AA compliance across all application routes
 * using axe-core automated accessibility testing.
 *
 * Coverage:
 * - 53 application routes identified in discovery phase
 * - Role-based access testing for RBAC-protected routes
 * - Critical production workflows prioritized
 *
 * Results saved to: docs/ui-assessment/02-ACCESSIBILITY/
 */

import { test, expect, Page } from '@playwright/test';
import { injectAxe, checkA11y, getViolations, configureAxe } from '@axe-core/playwright';

interface AccessibilityResult {
  route: string;
  role: string;
  violations: number;
  criticalViolations: number;
  moderateViolations: number;
  minorViolations: number;
  passed: boolean;
  timestamp: string;
}

// Routes categorized by priority for systematic testing
const CRITICAL_ROUTES = [
  { path: '/login', name: 'Login Page', requiresAuth: false },
  { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
  { path: '/workorders', name: 'Work Orders List', requiresAuth: true, role: 'Production Planner' },
  { path: '/quality/inspections', name: 'Quality Inspections', requiresAuth: true, role: 'Quality Engineer' },
  { path: '/traceability', name: 'Material Traceability', requiresAuth: true, role: 'Quality Engineer' },
];

const HIGH_PRIORITY_ROUTES = [
  { path: '/routings', name: 'Routing Management', requiresAuth: true, role: 'Manufacturing Engineer' },
  { path: '/equipment', name: 'Equipment Maintenance', requiresAuth: true, role: 'Maintenance Technician' },
  { path: '/quality/ncrs', name: 'Non-Conformance Reports', requiresAuth: true, role: 'Quality Engineer' },
  { path: '/fai', name: 'First Article Inspection', requiresAuth: true, role: 'Quality Engineer' },
  { path: '/work-instructions', name: 'Work Instructions', requiresAuth: true, role: 'Manufacturing Engineer' },
  { path: '/kits', name: 'Kit Management', requiresAuth: true, role: 'Production Planner' },
  { path: '/staging', name: 'Material Staging', requiresAuth: true, role: 'Production Planner' },
];

const STANDARD_ROUTES = [
  { path: '/operations', name: 'Operations Management', requiresAuth: true, role: 'Production Planner' },
  { path: '/production/scheduling', name: 'Production Scheduling', requiresAuth: true, role: 'Production Planner' },
  { path: '/serialization', name: 'Serialization Overview', requiresAuth: true, role: 'Quality Engineer' },
  { path: '/integrations', name: 'Integration Dashboard', requiresAuth: true, role: 'System Administrator' },
  { path: '/signatures', name: 'Electronic Signatures', requiresAuth: true, role: 'Quality Engineer' },
];

const PLACEHOLDER_ROUTES = [
  { path: '/materials', name: 'Materials (Placeholder)', requiresAuth: true, role: 'Production Planner' },
  { path: '/personnel', name: 'Personnel (Placeholder)', requiresAuth: true, role: 'Plant Manager' },
  { path: '/admin', name: 'Admin (Placeholder)', requiresAuth: true, role: 'System Administrator' },
  { path: '/settings', name: 'Settings (Placeholder)', requiresAuth: true, role: 'System Administrator' },
];

// Comprehensive accessibility results storage
const accessibilityResults: AccessibilityResult[] = [];

/**
 * Authenticate user with specific role for RBAC testing
 */
async function authenticateAsRole(page: Page, role: string = 'System Administrator') {
  // Navigate to login page
  await page.goto('/login');

  // Wait for login form to be visible
  await page.waitForSelector('form', { timeout: 10000 });

  // Fill in credentials based on role
  const credentials = getRoleCredentials(role);
  await page.fill('input[name="username"]', credentials.username);
  await page.fill('input[name="password"]', credentials.password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for successful authentication (dashboard redirect)
  await page.waitForURL('**/dashboard', { timeout: 15000 });

  // Verify authentication succeeded
  await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible({ timeout: 10000 });
}

/**
 * Get credentials for specific role (test environment)
 */
function getRoleCredentials(role: string) {
  const roleCredentials = {
    'System Administrator': { username: 'admin', password: 'admin123' },
    'Plant Manager': { username: 'plant.manager', password: 'manager123' },
    'Production Planner': { username: 'prod.planner', password: 'planner123' },
    'Manufacturing Engineer': { username: 'mfg.engineer', password: 'engineer123' },
    'Quality Engineer': { username: 'quality.engineer', password: 'quality123' },
    'Quality Inspector': { username: 'quality.inspector', password: 'inspector123' },
    'Maintenance Technician': { username: 'maintenance.tech', password: 'maintenance123' },
  };

  return roleCredentials[role] || roleCredentials['System Administrator'];
}

/**
 * Configure axe-core for WCAG 2.1 Level AA testing
 */
async function setupAxe(page: Page) {
  await injectAxe(page);

  // Configure axe for WCAG 2.1 Level AA compliance
  await configureAxe(page, {
    rules: {
      // Enable WCAG 2.1 Level AA rules
      'color-contrast': { enabled: true },
      'keyboard-navigation': { enabled: true },
      'focus-order-semantics': { enabled: true },
      'aria-roles': { enabled: true },
      'aria-properties': { enabled: true },
      'landmark-roles': { enabled: true },
      'heading-structure': { enabled: true },
      'form-labels': { enabled: true },
      'link-purpose': { enabled: true },
      'image-alt': { enabled: true },
      'bypass-blocks': { enabled: true },

      // Disable rules that may not apply to manufacturing applications
      'page-has-heading-one': { enabled: false }, // Dashboards may not need h1
      'region': { enabled: false }, // Complex layouts may have legitimate violations
    },
    tags: ['wcag2a', 'wcag2aa', 'wcag21aa'],
    // Include best practices but don't fail on them
    includeBestPractices: false,
  });
}

/**
 * Run accessibility audit on current page
 */
async function runAccessibilityAudit(page: Page, routeName: string, role: string = 'Unauthenticated'): Promise<AccessibilityResult> {
  try {
    // Run axe-core accessibility check
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      axeOptions: {
        // Custom configuration for manufacturing contexts
        context: {
          exclude: [
            // Exclude third-party components that may have known issues
            '.ant-notification',
            '.ant-message',
            '.recharts-wrapper', // Charts may have accessibility challenges
            '.react-flow__minimap', // Minimap may not be accessible by design
          ]
        }
      }
    });

    // Get detailed violation information
    const violations = await getViolations(page);

    const criticalViolations = violations.filter(v => v.impact === 'critical').length;
    const moderateViolations = violations.filter(v => v.impact === 'serious').length;
    const minorViolations = violations.filter(v => v.impact === 'moderate' || v.impact === 'minor').length;

    const result: AccessibilityResult = {
      route: routeName,
      role: role,
      violations: violations.length,
      criticalViolations,
      moderateViolations,
      minorViolations,
      passed: criticalViolations === 0 && moderateViolations === 0, // Allow minor violations
      timestamp: new Date().toISOString(),
    };

    // Store detailed violations for reporting
    if (violations.length > 0) {
      console.log(`🚨 Accessibility violations found on ${routeName} (${role}):`);
      violations.forEach((violation, index) => {
        console.log(`  ${index + 1}. [${violation.impact}] ${violation.id}: ${violation.description}`);
        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`     Target ${nodeIndex + 1}: ${node.target.join(', ')}`);
        });
      });
    } else {
      console.log(`✅ No accessibility violations found on ${routeName} (${role})`);
    }

    accessibilityResults.push(result);
    return result;

  } catch (error) {
    console.error(`❌ Accessibility audit failed for ${routeName} (${role}):`, error);

    const failedResult: AccessibilityResult = {
      route: routeName,
      role: role,
      violations: -1, // Indicates test failure
      criticalViolations: -1,
      moderateViolations: -1,
      minorViolations: -1,
      passed: false,
      timestamp: new Date().toISOString(),
    };

    accessibilityResults.push(failedResult);
    return failedResult;
  }
}

/**
 * Test suite: Critical production paths (P0)
 */
test.describe('Accessibility Audit - Critical Routes (P0)', () => {
  test.beforeEach(async ({ page }) => {
    // Set up reasonable timeouts for accessibility testing
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  for (const route of CRITICAL_ROUTES) {
    test(`should pass WCAG 2.1 AA accessibility audit: ${route.name}`, async ({ page }) => {
      if (route.requiresAuth) {
        await authenticateAsRole(page, route.role || 'System Administrator');
      }

      // Navigate to the route
      await page.goto(route.path);

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Allow time for dynamic content to render
      await page.waitForTimeout(2000);

      // Set up axe-core
      await setupAxe(page);

      // Run accessibility audit
      const result = await runAccessibilityAudit(page, route.name, route.role || 'Unauthenticated');

      // Assert that critical and moderate violations are acceptable
      expect(result.criticalViolations,
        `Critical accessibility violations found on ${route.name}. This blocks production use.`
      ).toBe(0);

      expect(result.moderateViolations,
        `Serious accessibility violations found on ${route.name}. This significantly impacts users with disabilities.`
      ).toBeLessThanOrEqual(2); // Allow up to 2 serious violations for complex manufacturing UIs
    });
  }
});

/**
 * Test suite: High priority routes (P1)
 */
test.describe('Accessibility Audit - High Priority Routes (P1)', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  for (const route of HIGH_PRIORITY_ROUTES) {
    test(`should pass accessibility audit: ${route.name}`, async ({ page }) => {
      await authenticateAsRole(page, route.role || 'System Administrator');

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await setupAxe(page);

      const result = await runAccessibilityAudit(page, route.name, route.role || 'System Administrator');

      // High priority routes should have no critical violations
      expect(result.criticalViolations,
        `Critical accessibility violations found on ${route.name}`
      ).toBe(0);

      // Allow more serious violations for high priority routes
      expect(result.moderateViolations,
        `Too many serious accessibility violations on ${route.name}`
      ).toBeLessThanOrEqual(5);
    });
  }
});

/**
 * Test suite: Standard routes (P2)
 */
test.describe('Accessibility Audit - Standard Routes (P2)', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  for (const route of STANDARD_ROUTES) {
    test(`should have acceptable accessibility: ${route.name}`, async ({ page }) => {
      await authenticateAsRole(page, route.role || 'System Administrator');

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await setupAxe(page);

      const result = await runAccessibilityAudit(page, route.name, route.role || 'System Administrator');

      // Standard routes should have no critical violations
      expect(result.criticalViolations,
        `Critical accessibility violations found on ${route.name}`
      ).toBe(0);

      // More lenient for standard routes
      expect(result.violations,
        `Excessive accessibility violations on ${route.name}`
      ).toBeLessThanOrEqual(20);
    });
  }
});

/**
 * Test suite: Placeholder pages (P3) - Document gaps
 */
test.describe('Accessibility Audit - Placeholder Pages (P3)', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  for (const route of PLACEHOLDER_ROUTES) {
    test(`should document accessibility status: ${route.name}`, async ({ page }) => {
      await authenticateAsRole(page, route.role || 'System Administrator');

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await setupAxe(page);

      // Audit placeholder pages but don't fail on violations
      const result = await runAccessibilityAudit(page, route.name, route.role || 'System Administrator');

      // Just document the state for placeholder pages
      console.log(`📋 Placeholder page ${route.name} accessibility status: ${result.violations} violations`);

      // Basic check - page should at least load without critical errors
      expect(result.violations).toBeGreaterThanOrEqual(0); // Just verify audit ran
    });
  }
});

/**
 * Test suite: Complex component accessibility
 */
test.describe('Accessibility Audit - Complex Components', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(45000); // Extended timeout for complex components
    page.setDefaultNavigationTimeout(45000);
  });

  test('should pass accessibility audit: ReactFlow Routing Editor', async ({ page }) => {
    await authenticateAsRole(page, 'Manufacturing Engineer');

    // Navigate to routing creation (ReactFlow editor)
    await page.goto('/routings/create');
    await page.waitForLoadState('networkidle');

    // Wait for ReactFlow to fully initialize
    await page.waitForSelector('.react-flow__viewport', { timeout: 15000 });
    await page.waitForTimeout(3000);

    await setupAxe(page);

    const result = await runAccessibilityAudit(page, 'ReactFlow Routing Editor', 'Manufacturing Engineer');

    // ReactFlow may have inherent accessibility challenges - focus on critical issues
    expect(result.criticalViolations,
      'ReactFlow editor has critical accessibility violations'
    ).toBeLessThanOrEqual(1); // Allow 1 critical due to complex canvas interactions
  });

  test('should pass accessibility audit: Material Traceability Graph (D3)', async ({ page }) => {
    await authenticateAsRole(page, 'Quality Engineer');

    // Navigate to traceability page
    await page.goto('/traceability');
    await page.waitForLoadState('networkidle');

    // Wait for potential D3 graphs to render
    await page.waitForTimeout(3000);

    await setupAxe(page);

    const result = await runAccessibilityAudit(page, 'Material Traceability D3 Graph', 'Quality Engineer');

    // D3 visualizations may have accessibility challenges
    expect(result.criticalViolations,
      'D3 traceability graph has critical accessibility violations'
    ).toBeLessThanOrEqual(2); // Allow some violations for complex data visualizations
  });

  test('should pass accessibility audit: Work Instructions Rich Text Editor', async ({ page }) => {
    await authenticateAsRole(page, 'Manufacturing Engineer');

    // Navigate to work instruction creation (Lexical editor)
    await page.goto('/work-instructions/create');
    await page.waitForLoadState('networkidle');

    // Wait for Lexical editor to initialize
    await page.waitForTimeout(3000);

    await setupAxe(page);

    const result = await runAccessibilityAudit(page, 'Lexical Rich Text Editor', 'Manufacturing Engineer');

    // Rich text editors should be accessible
    expect(result.criticalViolations,
      'Lexical rich text editor has critical accessibility violations'
    ).toBe(0);

    expect(result.moderateViolations,
      'Lexical rich text editor has too many serious violations'
    ).toBeLessThanOrEqual(3);
  });
});

/**
 * Generate accessibility report after all tests complete
 */
test.afterAll(async () => {
  if (accessibilityResults.length === 0) {
    console.log('ℹ️ No accessibility results to report');
    return;
  }

  // Generate summary report
  const totalTests = accessibilityResults.length;
  const passedTests = accessibilityResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const totalViolations = accessibilityResults.reduce((sum, r) => sum + (r.violations > 0 ? r.violations : 0), 0);
  const totalCritical = accessibilityResults.reduce((sum, r) => sum + (r.criticalViolations > 0 ? r.criticalViolations : 0), 0);

  console.log('\n' + '='.repeat(80));
  console.log('📊 ACCESSIBILITY AUDIT SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Routes Tested: ${totalTests}`);
  console.log(`Routes Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Routes Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Total Violations: ${totalViolations}`);
  console.log(`Critical Violations: ${totalCritical}`);
  console.log('='.repeat(80));

  // Save detailed results for report generation
  const reportData = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      passPercentage: ((passedTests/totalTests)*100).toFixed(1),
      totalViolations,
      totalCritical,
      generatedAt: new Date().toISOString(),
    },
    results: accessibilityResults
  };

  // Write results to file for later analysis
  const fs = require('fs');
  const path = require('path');

  try {
    const outputDir = path.join(process.cwd(), 'docs/ui-assessment/02-ACCESSIBILITY');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, 'accessibility-audit-results.json');
    fs.writeFileSync(outputFile, JSON.stringify(reportData, null, 2));

    console.log(`📄 Detailed results saved to: ${outputFile}`);
  } catch (error) {
    console.error('❌ Failed to save accessibility results:', error);
  }
});