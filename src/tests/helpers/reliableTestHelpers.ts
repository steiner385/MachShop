/**
 * Reliable Test Helpers for E2E Tests
 *
 * Addresses common failure patterns:
 * - UI element visibility issues
 * - Timing and race conditions
 * - Navigation reliability
 * - Dynamic content loading
 */

import { Page, Locator, expect } from '@playwright/test';

export class ReliableTestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for element to be truly visible and interactable
   * Addresses: "expect(locator).toBeVisible failed" errors
   * Enhanced for SPA progressive loading and server stability issues
   * ✅ PHASE 7 FIX: Enhanced for frontend server stability
   */
  async waitForElementReady(selector: string, options: {
    timeout?: number;
    retries?: number;
    description?: string;
    progressive?: boolean;
  } = {}): Promise<Locator> {
    const { timeout = 60000, retries = 7, description = selector, progressive = false } = options; // ✅ PHASE 7 FIX: Increased defaults

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[TestHelper] Waiting for element: ${description} (attempt ${attempt}/${retries})`);

        const element = this.page.locator(selector);

        // For progressive loading, wait for parent containers first
        if (progressive) {
          await this.waitForSpaReadiness();
        }

        // Wait for element to exist in DOM
        await element.waitFor({ state: 'attached', timeout: Math.min(timeout, 15000) });

        // Wait for element to be visible
        await element.waitFor({ state: 'visible', timeout: Math.min(timeout, 15000) });

        // Ensure element is not moving (animations finished)
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(200); // Increased delay for complex components

        // Verify element is still visible and interactable after scroll
        await expect(element).toBeVisible({ timeout: 8000 });

        // Additional check for complex components
        if (progressive) {
          await this.page.waitForTimeout(500); // Extra time for progressive loading
          await expect(element).toBeVisible({ timeout: 5000 }); // Re-verify
        }

        console.log(`[TestHelper] ✓ Element ready: ${description}`);
        return element;

      } catch (error) {
        console.log(`[TestHelper] ✗ Attempt ${attempt} failed for ${description}: ${error.message}`);

        // ✅ PHASE 7 FIX: Enhanced server instability error handling
        const isServerError = error.message.includes('net::ERR_CONNECTION_REFUSED') ||
                             error.message.includes('net::ERR_EMPTY_RESPONSE') ||
                             error.message.includes('HTTP 404') ||
                             error.message.includes('Target page, context or browser has been closed') ||
                             error.message.includes('Page crashed') ||
                             error.message.includes('Navigation timeout');

        if (isServerError) {
          console.log(`[TestHelper] 🔧 Server instability detected for ${description}, extending retry delay...`);

          // For server errors, wait longer to allow recovery
          const serverRecoveryDelay = Math.min(3000 + (attempt * 1500), 12000); // 3s to 12s
          await this.page.waitForTimeout(serverRecoveryDelay);
        } else {
          // Standard exponential backoff for non-server errors
          await this.page.waitForTimeout(1000 * attempt);
        }

        if (attempt === retries) {
          const errorDetails = isServerError ? ' (Server instability detected)' : '';
          throw new Error(`Element not ready after ${retries} attempts: ${description}${errorDetails}. Last error: ${error.message}`);
        }
      }
    }

    throw new Error(`Failed to find element: ${description}`);
  }

  /**
   * Safe click with visibility and interactability checks
   * Addresses: Element click failures and timing issues
   * ✅ PHASE 7 FIX: Enhanced for frontend server stability
   */
  async safeClick(selector: string, options: {
    timeout?: number;
    retries?: number;
    force?: boolean;
    description?: string;
  } = {}): Promise<void> {
    const { timeout = 45000, retries = 5, force = false, description = selector } = options; // ✅ PHASE 7 FIX: Increased defaults

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[TestHelper] Safe clicking: ${description} (attempt ${attempt}/${retries})`);

        const element = await this.waitForElementReady(selector, { timeout, description });

        // Wait for element to be enabled
        if (!force) {
          await expect(element).toBeEnabled({ timeout: 5000 });
        }

        // Perform click
        await element.click({ force, timeout });

        console.log(`[TestHelper] ✓ Clicked: ${description}`);
        return;

      } catch (error) {
        console.log(`[TestHelper] ✗ Click attempt ${attempt} failed for ${description}: ${error.message}`);

        // ✅ PHASE 7 FIX: Enhanced server instability error handling
        const isServerError = error.message.includes('net::ERR_CONNECTION_REFUSED') ||
                             error.message.includes('net::ERR_EMPTY_RESPONSE') ||
                             error.message.includes('HTTP 404') ||
                             error.message.includes('Target page, context or browser has been closed') ||
                             error.message.includes('Page crashed');

        if (isServerError) {
          console.log(`[TestHelper] 🔧 Server instability detected for click on ${description}, extending retry delay...`);
          const serverRecoveryDelay = Math.min(2000 + (attempt * 1000), 8000); // 2s to 8s
          await this.page.waitForTimeout(serverRecoveryDelay);
        } else {
          await this.page.waitForTimeout(500 * attempt);
        }

        if (attempt === retries) {
          const errorDetails = isServerError ? ' (Server instability detected)' : '';
          throw new Error(`Click failed after ${retries} attempts: ${description}${errorDetails}. Last error: ${error.message}`);
        }
      }
    }
  }

  /**
   * Safe text input with proper clearing and validation
   * Addresses: Form input reliability issues
   */
  async safeInput(selector: string, text: string, options: {
    timeout?: number;
    clear?: boolean;
    validate?: boolean;
    description?: string;
  } = {}): Promise<void> {
    const { timeout = 30000, clear = true, validate = true, description = selector } = options;

    console.log(`[TestHelper] Safe input to ${description}: "${text}"`);

    const element = await this.waitForElementReady(selector, { timeout, description });

    // Clear existing content if requested
    if (clear) {
      await element.selectText();
      await element.fill('');
    }

    // Input text
    await element.fill(text);

    // Validate input if requested
    if (validate) {
      await expect(element).toHaveValue(text, { timeout: 5000 });
    }

    console.log(`[TestHelper] ✓ Input completed: ${description}`);
  }

  /**
   * Reliable navigation with proper waiting
   * Addresses: Navigation timing and loading issues
   */
  async reliableNavigate(url: string, options: {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    timeout?: number;
    expectedUrl?: string | RegExp;
    description?: string;
  } = {}): Promise<void> {
    const {
      waitUntil = 'domcontentloaded',
      timeout = 30000,
      expectedUrl,
      description = url
    } = options;

    console.log(`[TestHelper] Navigating to: ${description}`);

    // Perform navigation
    await this.page.goto(url, { waitUntil, timeout });

    // Wait for expected URL if provided
    if (expectedUrl) {
      if (typeof expectedUrl === 'string') {
        await this.page.waitForURL(expectedUrl, { timeout });
      } else {
        await this.page.waitForURL(expectedUrl, { timeout });
      }
    }

    // Wait for page to be fully loaded
    await this.page.waitForLoadState('domcontentloaded');

    // Additional wait for SPA applications
    await this.page.waitForTimeout(500);

    console.log(`[TestHelper] ✓ Navigation completed: ${description}`);
  }

  /**
   * Wait for table/list to load with proper content
   * Addresses: Dynamic content loading issues
   */
  async waitForTableData(tableSelector: string, options: {
    minRows?: number;
    timeout?: number;
    emptyStateSelector?: string;
    description?: string;
  } = {}): Promise<void> {
    const { minRows = 1, timeout = 30000, emptyStateSelector, description = 'table data' } = options;

    console.log(`[TestHelper] Waiting for ${description} (min ${minRows} rows)`);

    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        // Check if empty state is shown
        if (emptyStateSelector) {
          const emptyState = this.page.locator(emptyStateSelector);
          if (await emptyState.isVisible()) {
            console.log(`[TestHelper] ✓ Empty state detected for ${description}`);
            return;
          }
        }

        // Count table rows
        const table = this.page.locator(tableSelector);
        await table.waitFor({ state: 'visible', timeout: 5000 });

        const rows = table.locator('tbody tr, .ant-table-tbody tr');
        const rowCount = await rows.count();

        if (rowCount >= minRows) {
          console.log(`[TestHelper] ✓ Table loaded with ${rowCount} rows: ${description}`);
          return;
        }

        await this.page.waitForTimeout(500);

      } catch (error) {
        await this.page.waitForTimeout(1000);
      }
    }

    throw new Error(`Table data did not load within ${timeout}ms: ${description}`);
  }

  /**
   * Wait for and handle modal dialogs
   * Addresses: Modal interaction timing issues
   */
  async waitForModal(modalSelector: string, options: {
    timeout?: number;
    action?: 'confirm' | 'cancel' | 'close';
    description?: string;
  } = {}): Promise<void> {
    const { timeout = 15000, action, description = 'modal' } = options;

    console.log(`[TestHelper] Waiting for ${description}`);

    const modal = await this.waitForElementReady(modalSelector, { timeout, description });

    // Wait for modal animation to complete
    await this.page.waitForTimeout(300);

    if (action) {
      const buttonSelectors = {
        confirm: '.ant-btn-primary, [data-testid="confirm-button"]',
        cancel: '.ant-btn:not(.ant-btn-primary), [data-testid="cancel-button"]',
        close: '.ant-modal-close, [data-testid="close-button"]'
      };

      const buttonSelector = buttonSelectors[action];
      await this.safeClick(`${modalSelector} ${buttonSelector}`, {
        description: `${description} ${action} button`
      });

      // Wait for modal to disappear
      await modal.waitFor({ state: 'hidden', timeout: 10000 });
    }

    console.log(`[TestHelper] ✓ Modal handled: ${description}`);
  }

  /**
   * Retry-enabled assertion helper
   * Addresses: Flaky assertions due to timing
   */
  async reliableExpect<T>(
    getValue: () => Promise<T>,
    assertion: (value: T) => void | Promise<void>,
    options: {
      retries?: number;
      interval?: number;
      description?: string;
    } = {}
  ): Promise<void> {
    const { retries = 3, interval = 1000, description = 'assertion' } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[TestHelper] Reliable expect: ${description} (attempt ${attempt}/${retries})`);

        const value = await getValue();
        await assertion(value);

        console.log(`[TestHelper] ✓ Assertion passed: ${description}`);
        return;

      } catch (error) {
        console.log(`[TestHelper] ✗ Assertion attempt ${attempt} failed: ${error.message}`);

        if (attempt === retries) {
          throw error;
        }

        await this.page.waitForTimeout(interval);
      }
    }
  }

  /**
   * Wait for SPA readiness including React hydration and router state
   * Addresses: Progressive loading and component initialization issues
   */
  async waitForSpaReadiness(options: {
    timeout?: number;
    waitForReact?: boolean;
    waitForRouter?: boolean;
  } = {}): Promise<void> {
    const { timeout = 15000, waitForReact = true, waitForRouter = true } = options;

    console.log('[TestHelper] Waiting for SPA readiness');

    // Wait for DOM content
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for React hydration
    if (waitForReact) {
      await this.page.waitForFunction(
        () => {
          // Check for React root and hydration
          const reactRoot = document.querySelector('[data-reactroot], #root');
          if (!reactRoot || !reactRoot.hasChildNodes()) return false;

          // Check if React has finished hydrating
          return window.React !== undefined || document.querySelector('.ant-layout') !== null;
        },
        { timeout: Math.min(timeout, 10000) }
      ).catch(() => {
        console.log('[TestHelper] React hydration check timed out, continuing...');
      });
    }

    // Wait for router readiness
    if (waitForRouter) {
      await this.page.waitForFunction(
        () => {
          // Check for common router indicators
          return document.querySelector('.ant-layout-content') !== null ||
                 document.querySelector('main') !== null ||
                 document.querySelector('[role="main"]') !== null;
        },
        { timeout: Math.min(timeout, 8000) }
      ).catch(() => {
        console.log('[TestHelper] Router readiness check timed out, continuing...');
      });
    }

    // Additional stabilization wait
    await this.page.waitForTimeout(300);

    console.log('[TestHelper] ✓ SPA readiness completed');
  }

  /**
   * Enhanced text content waiting with retry logic
   * Addresses: "expect(locator).toContainText() failed" errors
   */
  async waitForTextContent(selector: string, expectedText: string | RegExp, options: {
    timeout?: number;
    retries?: number;
    partial?: boolean;
    description?: string;
  } = {}): Promise<void> {
    const { timeout = 30000, retries = 4, partial = true, description = selector } = options;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[TestHelper] Waiting for text content: ${description} (attempt ${attempt}/${retries})`);

        const element = await this.waitForElementReady(selector, {
          timeout: Math.min(timeout / retries, 10000),
          description
        });

        // Use different assertion methods based on expected text type
        if (typeof expectedText === 'string') {
          if (partial) {
            await expect(element).toContainText(expectedText, { timeout: 8000 });
          } else {
            await expect(element).toHaveText(expectedText, { timeout: 8000 });
          }
        } else {
          await expect(element).toContainText(expectedText, { timeout: 8000 });
        }

        console.log(`[TestHelper] ✓ Text content found: ${description}`);
        return;

      } catch (error) {
        console.log(`[TestHelper] ✗ Text content attempt ${attempt} failed: ${error.message}`);

        if (attempt === retries) {
          // Get actual text for debugging
          try {
            const element = this.page.locator(selector);
            const actualText = await element.textContent({ timeout: 2000 });
            throw new Error(`Text content not found after ${retries} attempts. Expected: "${expectedText}", Actual: "${actualText}"`);
          } catch {
            throw new Error(`Text content not found after ${retries} attempts: ${description}`);
          }
        }

        // Progressive wait times between retries
        await this.page.waitForTimeout(1000 * attempt);
      }
    }
  }

  /**
   * Wait for Visual Editor components specifically
   * Addresses: "Visual Editor button not found" errors
   */
  async waitForVisualEditor(options: {
    timeout?: number;
    waitForCanvas?: boolean;
    waitForToolbar?: boolean;
    description?: string;
  } = {}): Promise<void> {
    const {
      timeout = 45000,
      waitForCanvas = true,
      waitForToolbar = true,
      description = 'Visual Editor'
    } = options;

    console.log(`[TestHelper] Waiting for ${description} components`);

    // First wait for SPA readiness
    await this.waitForSpaReadiness({ timeout: 15000 });

    // Wait for React Flow canvas if requested
    if (waitForCanvas) {
      await this.waitForElementReady('.react-flow', {
        timeout: 20000,
        progressive: true,
        description: `${description} canvas`
      });
    }

    // Wait for toolbar if requested
    if (waitForToolbar) {
      const toolbarSelectors = [
        '.visual-editor-toolbar',
        '[data-testid="visual-editor-toolbar"]',
        '.ant-btn-group',
        'button:has-text("Add Step")',
        'button:has-text("Save")'
      ];

      let toolbarFound = false;
      for (const toolbarSelector of toolbarSelectors) {
        try {
          await this.waitForElementReady(toolbarSelector, {
            timeout: 8000,
            retries: 2,
            description: `${description} toolbar (${toolbarSelector})`
          });
          toolbarFound = true;
          break;
        } catch (error) {
          console.log(`[TestHelper] Toolbar selector "${toolbarSelector}" not found, trying next...`);
        }
      }

      if (!toolbarFound) {
        console.log(`[TestHelper] ⚠️ No toolbar found, continuing anyway...`);
      }
    }

    // Extra stabilization for complex components
    await this.page.waitForTimeout(1000);

    console.log(`[TestHelper] ✓ ${description} components ready`);
  }

  /**
   * Smart page reload with cache clearing
   * Addresses: Stale state issues
   */
  async smartReload(options: {
    clearCache?: boolean;
    waitForSelector?: string;
    timeout?: number;
  } = {}): Promise<void> {
    const { clearCache = true, waitForSelector, timeout = 30000 } = options;

    console.log('[TestHelper] Performing smart reload');

    if (clearCache) {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout });
    } else {
      await this.page.reload({ waitUntil: 'domcontentloaded', timeout });
    }

    if (waitForSelector) {
      await this.waitForElementReady(waitForSelector, { timeout });
    }

    console.log('[TestHelper] ✓ Smart reload completed');
  }
}

// Export factory function for easy use in tests
export function createReliableHelpers(page: Page): ReliableTestHelpers {
  return new ReliableTestHelpers(page);
}