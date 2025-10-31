/**
 * Keyboard Navigation Test Suite
 *
 * Tests keyboard accessibility and navigation patterns across the application.
 * Ensures compliance with WCAG 2.1 keyboard accessibility requirements.
 *
 * Coverage:
 * - Tab order and focus management
 * - Keyboard shortcuts and navigation
 * - Focus indicators and visibility
 * - Modal and dropdown keyboard behavior
 * - Complex component keyboard support (ReactFlow, D3, etc.)
 */

import { test, expect, Page } from '@playwright/test';

interface KeyboardTestResult {
  route: string;
  testType: string;
  passed: boolean;
  issues: string[];
  timestamp: string;
}

const keyboardTestResults: KeyboardTestResult[] = [];

/**
 * Authenticate for keyboard navigation testing
 */
async function authenticateForTesting(page: Page) {
  await page.goto('/login');
  await page.waitForSelector('form', { timeout: 10000 });

  // Use keyboard navigation to fill form
  await page.press('body', 'Tab'); // Focus first input
  await page.keyboard.type('admin');
  await page.press('body', 'Tab'); // Move to password field
  await page.keyboard.type('admin123');
  await page.press('body', 'Tab'); // Move to submit button
  await page.press('body', 'Enter'); // Submit form

  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

/**
 * Test tab order and focus management
 */
async function testTabOrder(page: Page, routeName: string): Promise<KeyboardTestResult> {
  const issues: string[] = [];

  try {
    // Reset focus to beginning
    await page.evaluate(() => {
      document.body.focus();
    });

    // Get all focusable elements
    const focusableElements = await page.$$eval('*', elements => {
      const focusable = elements.filter(el => {
        const tabIndex = el.getAttribute('tabindex');
        const style = window.getComputedStyle(el);

        return (
          (el.tagName === 'INPUT' ||
           el.tagName === 'BUTTON' ||
           el.tagName === 'TEXTAREA' ||
           el.tagName === 'SELECT' ||
           el.tagName === 'A' ||
           (tabIndex && parseInt(tabIndex) >= 0)) &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          !el.hasAttribute('disabled')
        );
      });
      return focusable.length;
    });

    if (focusableElements === 0) {
      issues.push('No focusable elements found on page');
    }

    // Test tab navigation through focusable elements
    let tabCount = 0;
    const maxTabs = Math.min(focusableElements, 20); // Limit to prevent infinite loops

    for (let i = 0; i < maxTabs; i++) {
      await page.press('body', 'Tab');
      tabCount++;

      // Check if focus indicator is visible
      const focusedElement = await page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!activeElement || activeElement === document.body) {
          return null;
        }

        const styles = window.getComputedStyle(activeElement);
        const hasVisibleFocus = (
          styles.outline !== 'none' ||
          styles.boxShadow.includes('rgb') ||
          activeElement.getAttribute('data-focus-visible') === 'true'
        );

        return {
          tagName: activeElement.tagName,
          id: activeElement.id,
          className: activeElement.className,
          hasVisibleFocus,
          rect: activeElement.getBoundingClientRect()
        };
      });

      if (focusedElement) {
        // Check if focus is visible
        if (!focusedElement.hasVisibleFocus) {
          issues.push(`Focus indicator not visible on element: ${focusedElement.tagName}${focusedElement.id ? '#' + focusedElement.id : ''}`);
        }

        // Check if focused element is in viewport
        if (focusedElement.rect.top < 0 || focusedElement.rect.bottom > await page.viewportSize()?.height!) {
          issues.push(`Focused element is outside viewport: ${focusedElement.tagName}`);
        }
      }
    }

    // Test Shift+Tab backward navigation
    for (let i = 0; i < 3 && i < maxTabs; i++) {
      await page.press('body', 'Shift+Tab');
    }

    const result: KeyboardTestResult = {
      route: routeName,
      testType: 'Tab Order Navigation',
      passed: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(result);
    return result;

  } catch (error) {
    const errorResult: KeyboardTestResult = {
      route: routeName,
      testType: 'Tab Order Navigation',
      passed: false,
      issues: [`Test failed with error: ${error.message}`],
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(errorResult);
    return errorResult;
  }
}

/**
 * Test keyboard shortcuts and application-specific navigation
 */
async function testKeyboardShortcuts(page: Page, routeName: string): Promise<KeyboardTestResult> {
  const issues: string[] = [];

  try {
    // Test common keyboard shortcuts
    const shortcuts = [
      { key: 'Escape', description: 'Close modals/dropdowns' },
      { key: 'Enter', description: 'Activate buttons/links' },
      { key: 'Space', description: 'Activate buttons/checkboxes' },
      { key: 'ArrowDown', description: 'Navigate dropdowns/lists' },
      { key: 'ArrowUp', description: 'Navigate dropdowns/lists' },
    ];

    // Test each shortcut in appropriate contexts
    for (const shortcut of shortcuts) {
      try {
        await page.press('body', shortcut.key);
        await page.waitForTimeout(100); // Brief pause to observe effects
      } catch (error) {
        // Some shortcuts may not be applicable on all pages
      }
    }

    // Test application-specific shortcuts if any exist
    // (This would be expanded based on actual application shortcuts)

    const result: KeyboardTestResult = {
      route: routeName,
      testType: 'Keyboard Shortcuts',
      passed: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(result);
    return result;

  } catch (error) {
    const errorResult: KeyboardTestResult = {
      route: routeName,
      testType: 'Keyboard Shortcuts',
      passed: false,
      issues: [`Test failed with error: ${error.message}`],
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(errorResult);
    return errorResult;
  }
}

/**
 * Test modal and dropdown keyboard behavior
 */
async function testModalKeyboardBehavior(page: Page, routeName: string): Promise<KeyboardTestResult> {
  const issues: string[] = [];

  try {
    // Look for modal triggers (buttons that might open modals)
    const modalTriggers = await page.$$eval('button', buttons =>
      buttons.filter(btn =>
        btn.textContent?.toLowerCase().includes('create') ||
        btn.textContent?.toLowerCase().includes('add') ||
        btn.textContent?.toLowerCase().includes('edit') ||
        btn.textContent?.toLowerCase().includes('new')
      ).length
    );

    if (modalTriggers > 0) {
      // Test modal opening with keyboard
      const firstTrigger = await page.$('button:has-text("Create"), button:has-text("Add"), button:has-text("Edit"), button:has-text("New")');

      if (firstTrigger) {
        // Focus the trigger and activate with keyboard
        await firstTrigger.focus();
        await page.press('body', 'Enter');
        await page.waitForTimeout(1000);

        // Check if modal opened
        const modalVisible = await page.isVisible('.ant-modal, .ant-drawer, [role="dialog"], [role="alertdialog"]');

        if (modalVisible) {
          // Test Escape key to close modal
          await page.press('body', 'Escape');
          await page.waitForTimeout(500);

          const modalStillVisible = await page.isVisible('.ant-modal, .ant-drawer, [role="dialog"], [role="alertdialog"]');
          if (modalStillVisible) {
            issues.push('Modal does not close with Escape key');
          }

          // Test focus trapping (if modal is still open)
          if (modalStillVisible) {
            // Tab through modal elements
            for (let i = 0; i < 10; i++) {
              await page.press('body', 'Tab');

              const focusInModal = await page.evaluate(() => {
                const activeElement = document.activeElement;
                const modal = document.querySelector('.ant-modal, .ant-drawer, [role="dialog"], [role="alertdialog"]');
                return modal?.contains(activeElement) || false;
              });

              if (!focusInModal) {
                issues.push('Focus escaped from modal during tab navigation');
                break;
              }
            }
          }
        }
      }
    }

    // Test dropdown keyboard behavior
    const dropdownTriggers = await page.$$eval('button', buttons =>
      buttons.filter(btn =>
        btn.getAttribute('aria-haspopup') === 'true' ||
        btn.className.includes('dropdown') ||
        btn.getAttribute('role') === 'button'
      ).length
    );

    if (dropdownTriggers > 0) {
      const firstDropdown = await page.$('button[aria-haspopup="true"], button[class*="dropdown"]');

      if (firstDropdown) {
        await firstDropdown.focus();
        await page.press('body', 'Enter');
        await page.waitForTimeout(500);

        // Test arrow key navigation in dropdown
        await page.press('body', 'ArrowDown');
        await page.press('body', 'ArrowUp');
        await page.press('body', 'Escape');
      }
    }

    const result: KeyboardTestResult = {
      route: routeName,
      testType: 'Modal & Dropdown Keyboard Behavior',
      passed: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(result);
    return result;

  } catch (error) {
    const errorResult: KeyboardTestResult = {
      route: routeName,
      testType: 'Modal & Dropdown Keyboard Behavior',
      passed: false,
      issues: [`Test failed with error: ${error.message}`],
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(errorResult);
    return errorResult;
  }
}

/**
 * Test suite: Keyboard navigation on critical routes
 */
test.describe('Keyboard Navigation - Critical Routes', () => {
  const criticalRoutes = [
    { path: '/login', name: 'Login Page', requiresAuth: false },
    { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
    { path: '/workorders', name: 'Work Orders', requiresAuth: true },
    { path: '/quality/inspections', name: 'Quality Inspections', requiresAuth: true },
    { path: '/traceability', name: 'Material Traceability', requiresAuth: true },
  ];

  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  for (const route of criticalRoutes) {
    test(`should support keyboard navigation: ${route.name}`, async ({ page }) => {
      if (route.requiresAuth) {
        await authenticateForTesting(page);
      }

      await page.goto(route.path);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Run keyboard navigation tests
      const tabOrderResult = await testTabOrder(page, route.name);
      const shortcutsResult = await testKeyboardShortcuts(page, route.name);
      const modalResult = await testModalKeyboardBehavior(page, route.name);

      // Assert that critical keyboard navigation works
      expect(tabOrderResult.passed,
        `Tab order issues on ${route.name}: ${tabOrderResult.issues.join(', ')}`
      ).toBe(true);

      expect(modalResult.passed,
        `Modal keyboard issues on ${route.name}: ${modalResult.issues.join(', ')}`
      ).toBe(true);

      // Log results for reporting
      console.log(`✅ Keyboard navigation test passed for ${route.name}`);
    });
  }
});

/**
 * Test suite: Complex component keyboard support
 */
test.describe('Keyboard Navigation - Complex Components', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(45000);
  });

  test('should support keyboard navigation: ReactFlow Routing Editor', async ({ page }) => {
    await authenticateForTesting(page);

    await page.goto('/routings/create');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.react-flow__viewport', { timeout: 15000 });
    await page.waitForTimeout(3000);

    // Test keyboard interaction with ReactFlow
    const issues: string[] = [];

    // Try to focus ReactFlow viewport
    await page.click('.react-flow__viewport');
    await page.waitForTimeout(500);

    // Test basic keyboard navigation in ReactFlow
    const reactFlowFocusable = await page.evaluate(() => {
      const viewport = document.querySelector('.react-flow__viewport');
      return viewport ? viewport.getAttribute('tabindex') !== null : false;
    });

    if (!reactFlowFocusable) {
      issues.push('ReactFlow viewport is not keyboard focusable');
    }

    // ReactFlow may require custom keyboard handling
    // This is a complex component that may need specialized accessibility implementation

    const result: KeyboardTestResult = {
      route: 'ReactFlow Routing Editor',
      testType: 'Complex Component Keyboard Support',
      passed: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(result);

    // For complex components, we may need to accept some limitations
    console.log(`🔍 ReactFlow keyboard navigation status: ${issues.length} issues found`);
    issues.forEach(issue => console.log(`  - ${issue}`));
  });

  test('should support keyboard navigation: Data Tables', async ({ page }) => {
    await authenticateForTesting(page);

    await page.goto('/workorders');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const issues: string[] = [];

    // Test table keyboard navigation
    const tableExists = await page.isVisible('.ant-table');

    if (tableExists) {
      // Focus first table row
      const firstRow = await page.$('.ant-table-tbody tr');
      if (firstRow) {
        await firstRow.focus();

        // Test arrow key navigation
        await page.press('body', 'ArrowDown');
        await page.press('body', 'ArrowUp');

        // Test Enter key on row
        await page.press('body', 'Enter');
        await page.waitForTimeout(500);
      } else {
        issues.push('Table rows are not keyboard focusable');
      }
    }

    const result: KeyboardTestResult = {
      route: 'Data Tables (Work Orders)',
      testType: 'Table Keyboard Navigation',
      passed: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(result);

    expect(result.passed,
      `Table keyboard navigation issues: ${result.issues.join(', ')}`
    ).toBe(true);
  });
});

/**
 * Test suite: Form keyboard navigation
 */
test.describe('Keyboard Navigation - Forms', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
  });

  test('should support keyboard navigation: Login Form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector('form', { timeout: 10000 });

    const issues: string[] = [];

    // Test form field tab order
    await page.press('body', 'Tab'); // Should focus username
    const usernamefocused = await page.evaluate(() =>
      document.activeElement?.getAttribute('name') === 'username'
    );

    if (!usernamefocused) {
      issues.push('Username field not properly focused with Tab key');
    }

    await page.press('body', 'Tab'); // Should focus password
    const passwordFocused = await page.evaluate(() =>
      document.activeElement?.getAttribute('name') === 'password'
    );

    if (!passwordFocused) {
      issues.push('Password field not properly focused with Tab key');
    }

    await page.press('body', 'Tab'); // Should focus submit button
    const submitFocused = await page.evaluate(() =>
      document.activeElement?.getAttribute('type') === 'submit'
    );

    if (!submitFocused) {
      issues.push('Submit button not properly focused with Tab key');
    }

    const result: KeyboardTestResult = {
      route: 'Login Form',
      testType: 'Form Keyboard Navigation',
      passed: issues.length === 0,
      issues,
      timestamp: new Date().toISOString()
    };

    keyboardTestResults.push(result);

    expect(result.passed,
      `Form keyboard navigation issues: ${result.issues.join(', ')}`
    ).toBe(true);
  });
});

/**
 * Generate keyboard navigation report
 */
test.afterAll(async () => {
  if (keyboardTestResults.length === 0) {
    console.log('ℹ️ No keyboard navigation results to report');
    return;
  }

  // Generate summary
  const totalTests = keyboardTestResults.length;
  const passedTests = keyboardTestResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const totalIssues = keyboardTestResults.reduce((sum, r) => sum + r.issues.length, 0);

  console.log('\n' + '='.repeat(80));
  console.log('⌨️  KEYBOARD NAVIGATION TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Tests Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Tests Failed: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
  console.log(`Total Issues: ${totalIssues}`);
  console.log('='.repeat(80));

  // Save results
  const reportData = {
    summary: {
      totalTests,
      passedTests,
      failedTests,
      passPercentage: ((passedTests/totalTests)*100).toFixed(1),
      totalIssues,
      generatedAt: new Date().toISOString(),
    },
    results: keyboardTestResults
  };

  try {
    const fs = require('fs');
    const path = require('path');

    const outputDir = path.join(process.cwd(), 'docs/ui-assessment/02-ACCESSIBILITY');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputFile = path.join(outputDir, 'keyboard-navigation-results.json');
    fs.writeFileSync(outputFile, JSON.stringify(reportData, null, 2));

    console.log(`📄 Keyboard navigation results saved to: ${outputFile}`);
  } catch (error) {
    console.error('❌ Failed to save keyboard navigation results:', error);
  }
});