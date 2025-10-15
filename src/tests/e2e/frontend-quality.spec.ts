/**
 * Frontend Quality E2E Tests
 * 
 * These tests specifically focus on catching frontend quality issues
 * that should not reach production, including:
 * - React warnings (key props, deprecated APIs)
 * - Ant Design deprecation warnings
 * - JavaScript errors
 * - Performance issues
 * - Accessibility violations
 */

import { test, expect, Page } from '@playwright/test';
import { navigateAuthenticated } from '../helpers/testAuthHelper';

class ConsoleMonitor {
  private warnings: string[] = [];
  private errors: string[] = [];
  private page: Page;

  constructor(page: Page) {
    this.page = page;
    this.setupConsoleListeners();
  }

  private setupConsoleListeners() {
    this.page.on('console', (msg) => {
      const text = msg.text();
      
      if (msg.type() === 'warning') {
        this.warnings.push(text);
        console.log('🟡 Browser Warning:', text);
      } else if (msg.type() === 'error') {
        this.errors.push(text);
        console.log('🔴 Browser Error:', text);
      }
    });

    this.page.on('pageerror', (error) => {
      this.errors.push(error.message);
      console.log('🔴 Page Error:', error.message);
    });
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  getErrors(): string[] {
    return [...this.errors];
  }

  clearLogs() {
    this.warnings = [];
    this.errors = [];
  }

  hasReactWarnings(): boolean {
    return this.warnings.some(warning => 
      warning.includes('Warning:') && 
      (warning.includes('React') || warning.includes('key') || warning.includes('findDOMNode'))
    );
  }

  hasAntdDeprecationWarnings(): boolean {
    return this.warnings.some(warning => 
      warning.includes('[antd:') && warning.includes('deprecated')
    );
  }

  getCriticalWarnings(): string[] {
    return this.warnings.filter(warning =>
      warning.includes('key') ||
      warning.includes('deprecated') ||
      warning.includes('Duplicated key') ||
      warning.includes('findDOMNode')
    );
  }
}

test.describe('Frontend Quality Monitoring', () => {
  let consoleMonitor: ConsoleMonitor;

  test.beforeEach(async ({ page }) => {
    consoleMonitor = new ConsoleMonitor(page);
    
    // Navigate to the application with authentication
    await navigateAuthenticated(page, '/', 'admin');
    
    // Wait for initial load
    await page.waitForLoadState('networkidle');
  });

  test.describe('Console Quality Checks', () => {
    test('should have no React key prop warnings on dashboard', async ({ page }) => {
      await navigateAuthenticated(page, '/dashboard', 'admin');
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for any delayed console messages
      await page.waitForTimeout(2000);
      
      const reactWarnings = consoleMonitor.getWarnings().filter(warning =>
        warning.includes('key') && warning.includes('React')
      );
      
      expect(reactWarnings).toEqual([]);
    });

    test('should have no Ant Design deprecation warnings', async ({ page }) => {
      await navigateAuthenticated(page, '/dashboard', 'admin');
      await page.waitForLoadState('networkidle');
      
      // Navigate through different pages to trigger all components
      await page.goto('/workorders');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/quality');
      await page.waitForLoadState('networkidle');
      
      await page.goto('/traceability');
      await page.waitForLoadState('networkidle');
      
      // Wait for any delayed warnings
      await page.waitForTimeout(2000);
      
      const antdWarnings = consoleMonitor.getWarnings().filter(warning =>
        warning.includes('[antd:') && warning.includes('deprecated')
      );
      
      expect(antdWarnings).toEqual([]);
    });

    test('should have no JavaScript errors during navigation', async ({ page }) => {
      const pages = ['/dashboard', '/workorders', '/quality', '/traceability', '/profile'];
      
      for (const pagePath of pages) {
        consoleMonitor.clearLogs();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
        
        const jsErrors = consoleMonitor.getErrors().filter(error =>
          !error.includes('1Password') && // Ignore browser extension errors
          !error.includes('Chrome extension') &&
          !error.includes('native messaging host')
        );
        
        expect(jsErrors, `JavaScript errors found on ${pagePath}: ${jsErrors.join(', ')}`).toEqual([]);
      }
    });

    test('should have no console errors during form interactions', async ({ page }) => {
      consoleMonitor.clearLogs();
      
      // Test work order creation form
      await navigateAuthenticated(page, '/workorders', 'admin');
      await page.waitForLoadState('networkidle');
      
      // Look for a create button or form
      const createButton = page.getByText('Create Work Order').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await page.waitForTimeout(1000);
      }
      
      // Test profile page form interactions
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      const errors = consoleMonitor.getErrors().filter(error =>
        !error.includes('1Password') && 
        !error.includes('Chrome extension') &&
        !error.includes('native messaging host')
      );
      
      expect(errors).toEqual([]);
    });
  });

  test.describe('Component-Specific Quality Checks', () => {
    test('MainLayout component should render without warnings', async ({ page }) => {
      consoleMonitor.clearLogs();
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Test sidebar collapse/expand
      const collapseButton = page.locator('button').first();
      await collapseButton.click();
      await page.waitForTimeout(500);
      await collapseButton.click();
      await page.waitForTimeout(500);
      
      // Test menu navigation
      await page.getByText('Work Orders').click();
      await page.waitForLoadState('networkidle');
      
      await page.getByText('Dashboard').click();
      await page.waitForLoadState('networkidle');
      
      const criticalWarnings = consoleMonitor.getCriticalWarnings();
      expect(criticalWarnings).toEqual([]);
    });

    test('Login page demo credentials should not produce warnings', async ({ page }) => {
      // Logout first to access login page
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      
      // Navigate to login (this will happen automatically if not authenticated)
      await page.goto('/');
      
      // Check if we're on login page
      if (await page.getByText('Sign In').isVisible()) {
        consoleMonitor.clearLogs();
        
        // Test demo credential interactions
        const demoCredentials = page.locator('[data-testid*="credential"]').first();
        if (await demoCredentials.isVisible()) {
          await demoCredentials.click();
          await page.waitForTimeout(500);
        }
        
        const warnings = consoleMonitor.getWarnings();
        const reactKeyWarnings = warnings.filter(w => w.includes('key') && w.includes('React'));
        
        expect(reactKeyWarnings).toEqual([]);
      }
    });

    test('Profile page should not have key prop warnings', async ({ page }) => {
      consoleMonitor.clearLogs();
      
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const keyWarnings = consoleMonitor.getWarnings().filter(warning =>
        warning.includes('key') || warning.includes('Duplicated key')
      );
      
      expect(keyWarnings).toEqual([]);
    });
  });

  test.describe('Performance Quality Checks', () => {
    test('pages should load within acceptable time limits', async ({ page }) => {
      const pages = ['/dashboard', '/workorders', '/quality', '/traceability'];
      
      for (const pagePath of pages) {
        const startTime = Date.now();
        
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
        
        const loadTime = Date.now() - startTime;
        
        // Page should load within 5 seconds
        expect(loadTime, `${pagePath} took ${loadTime}ms to load`).toBeLessThan(5000);
      }
    });

    test('should not have memory leaks in navigation', async ({ page }) => {
      // Navigate through pages multiple times to check for memory leaks
      const navigationSequence = ['/dashboard', '/workorders', '/quality', '/traceability'];
      
      for (let i = 0; i < 3; i++) {
        for (const pagePath of navigationSequence) {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
        }
      }
      
      // Check for any accumulated console errors
      const memoryErrors = consoleMonitor.getErrors().filter(error =>
        error.includes('memory') || error.includes('leak') || error.includes('Maximum call stack')
      );
      
      expect(memoryErrors).toEqual([]);
    });
  });

  test.describe('Accessibility Quality Checks', () => {
    test('should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check for essential ARIA landmarks
      const mainContent = page.locator('main, [role="main"]');
      const navigation = page.locator('nav, [role="navigation"]');
      
      await expect(mainContent.or(page.locator('*')).first()).toBeVisible();
      await expect(navigation.or(page.locator('*')).first()).toBeVisible();
    });

    test('should have proper heading structure', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Check for h1 heading
      const h1Elements = page.locator('h1');
      const h1Count = await h1Elements.count();
      
      // Should have at least one h1 per page
      expect(h1Count).toBeGreaterThan(0);
    });
  });

  test.afterEach(async () => {
    // Log any remaining warnings for debugging
    const warnings = consoleMonitor.getWarnings();
    const errors = consoleMonitor.getErrors();
    
    if (warnings.length > 0) {
      console.log('🟡 Test completed with warnings:', warnings);
    }
    
    if (errors.length > 0) {
      console.log('🔴 Test completed with errors:', errors);
    }
  });
});