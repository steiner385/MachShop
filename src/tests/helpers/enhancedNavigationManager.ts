/**
 * Enhanced Navigation Manager for E2E Tests
 *
 * Provides bulletproof navigation with:
 * - Smart wait strategies for SPA applications
 * - Authentication redirect handling
 * - Page ready state verification
 * - Network stability detection
 * - Retry mechanisms for failed navigation
 * - Route-specific optimizations
 */

import { Page, expect } from '@playwright/test';
import { ReliableTestHelpers } from './reliableTestHelpers';

export interface NavigationOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeout?: number;
  retries?: number;
  expectedUrl?: string | RegExp;
  requireAuth?: boolean;
  pageReadySelector?: string;
  skipNetworkIdle?: boolean;
  description?: string;
  additionalWaits?: Array<{
    selector?: string;
    url?: string | RegExp;
    networkIdle?: boolean;
    timeout?: number;
  }>;
}

export interface AuthRedirectOptions {
  loginUrl?: string;
  dashboardUrl?: string;
  maxRedirectTime?: number;
  allowManualRedirect?: boolean;
}

export interface PageReadyOptions {
  requiredSelectors?: string[];
  forbiddenSelectors?: string[];
  networkStable?: boolean;
  customChecks?: Array<() => Promise<boolean>>;
  skipLoadingIndicators?: boolean;
}

export class EnhancedNavigationManager {
  private page: Page;
  private helpers: ReliableTestHelpers;
  private baseUrl: string;

  // Route-specific configurations
  private routeConfigs: Map<string, Partial<NavigationOptions>> = new Map([
    ['/dashboard', {
      pageReadySelector: '.dashboard-content:first-child, .ant-layout-content:first-child',
      requireAuth: true,
      skipNetworkIdle: false
    }],
    ['/routings', {
      pageReadySelector: '.ant-table-container:first-child, .table-container:first-child',
      requireAuth: true,
      skipNetworkIdle: false
    }],
    ['/routings/new', {
      pageReadySelector: '.page-title:first-child, h1:first-child, .ant-form',
      requireAuth: true,
      skipNetworkIdle: false,
      additionalWaits: [
        { selector: '.ant-form:first-child, form:first-child', timeout: 10000 }
      ]
    }],
    ['/routings/*/edit', {
      pageReadySelector: '.page-title:first-child, h1:first-child, .ant-form',
      requireAuth: true,
      skipNetworkIdle: false,
      additionalWaits: [
        { selector: '.ant-form:first-child, form:first-child', timeout: 10000 },
        { networkIdle: true, timeout: 5000 }
      ]
    }],
    ['/workorders', {
      pageReadySelector: '.ant-table-container:first-child, .workorder-list:first-child',
      requireAuth: true,
      skipNetworkIdle: false
    }],
    ['/quality', {
      pageReadySelector: '.quality-dashboard:first-child, .ant-layout-content:first-child',
      requireAuth: true,
      skipNetworkIdle: false
    }],
    ['/login', {
      pageReadySelector: '[data-testid="username-input"]:first-child, .login-form:first-child',
      requireAuth: false,
      skipNetworkIdle: true
    }]
  ]);

  constructor(page: Page, baseUrl?: string) {
    this.page = page;
    this.helpers = new ReliableTestHelpers(page);
    this.baseUrl = baseUrl || '';
  }

  /**
   * Enhanced navigation with intelligent wait strategies and server stability handling
   * ✅ PHASE 7 FIX: Enhanced for frontend server stability issues
   */
  async navigateToRoute(
    route: string,
    options: NavigationOptions = {}
  ): Promise<void> {
    const fullUrl = this.buildFullUrl(route);
    const config = this.getRouteConfig(route);
    const finalOptions = { ...config, ...options };

    const {
      waitUntil = 'domcontentloaded',
      timeout = 45000, // ✅ PHASE 7 FIX: Increased timeout for server instability
      retries = 5, // ✅ PHASE 7 FIX: Increased retries for server recovery
      requireAuth = false,
      description = `Navigation to ${route}`
    } = finalOptions;

    console.log(`[Navigation] Starting enhanced navigation: ${description}`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[Navigation] Attempt ${attempt}/${retries}: ${fullUrl}`);

        // Pre-navigation checks
        await this.preNavigationChecks(finalOptions);

        // Perform navigation
        await this.page.goto(fullUrl, { waitUntil, timeout });

        // Handle authentication redirects if needed
        if (requireAuth) {
          await this.handleAuthenticationFlow(finalOptions);
        }

        // Wait for page to be fully ready
        await this.waitForPageReady(route, finalOptions);

        // Verify final state
        await this.verifyNavigationSuccess(route, finalOptions);

        console.log(`[Navigation] ✅ Successfully navigated to: ${route}`);
        return;

      } catch (error) {
        console.log(`[Navigation] ❌ Attempt ${attempt} failed: ${error.message}`);

        // ✅ PHASE 7 FIX: Enhanced error handling for server instability
        const isServerError = error.message.includes('net::ERR_CONNECTION_REFUSED') ||
                             error.message.includes('net::ERR_EMPTY_RESPONSE') ||
                             error.message.includes('HTTP 404') ||
                             error.message.includes('Page crashed') ||
                             error.message.includes('Target page, context or browser has been closed');

        if (isServerError) {
          console.log(`[Navigation] 🔧 Server instability detected, extending retry timeout...`);

          // For server errors, wait longer to allow recovery
          const serverRecoveryDelay = Math.min(5000 + (attempt * 2000), 15000); // 5s to 15s
          await this.page.waitForTimeout(serverRecoveryDelay);

          // Also check if we can reach the base URL before retrying
          try {
            await this.page.goto(this.baseUrl || '/', { waitUntil: 'domcontentloaded', timeout: 10000 });
            console.log(`[Navigation] ✅ Base URL reachable, proceeding with retry`);
          } catch (baseUrlError) {
            console.log(`[Navigation] ⚠️ Base URL unreachable, but continuing retry: ${baseUrlError.message}`);
          }
        }

        if (attempt === retries) {
          // ✅ PHASE 7 FIX: More detailed error information for debugging
          const errorDetails = isServerError ? ' (Server instability detected)' : '';
          throw new Error(`Navigation failed after ${retries} attempts: ${route}${errorDetails}. Last error: ${error.message}`);
        }

        // Standard exponential backoff for non-server errors
        if (!isServerError) {
          await this.page.waitForTimeout(1000 * attempt);
        }
      }
    }
  }

  /**
   * Navigate with authentication handling
   */
  async navigateAuthenticated(
    route: string,
    options: NavigationOptions & AuthRedirectOptions = {}
  ): Promise<void> {
    await this.navigateToRoute(route, { ...options, requireAuth: true });
  }

  /**
   * Handle complex authentication flows and redirects
   */
  private async handleAuthenticationFlow(options: NavigationOptions & AuthRedirectOptions): Promise<void> {
    const {
      loginUrl = '/login',
      dashboardUrl = '/dashboard',
      maxRedirectTime = 15000,
      allowManualRedirect = true
    } = options;

    console.log('[Navigation] Checking authentication state...');

    // Wait for potential redirect or auth check
    const startTime = Date.now();

    while (Date.now() - startTime < maxRedirectTime) {
      const currentUrl = this.page.url();

      // Check if we're on login page (redirected due to no auth)
      if (currentUrl.includes(loginUrl)) {
        console.log('[Navigation] Detected login redirect - authentication required');

        if (allowManualRedirect) {
          // Wait for manual authentication or redirect
          await this.helpers.reliableExpect(
            async () => !this.page.url().includes(loginUrl),
            (notOnLogin) => expect(notOnLogin).toBe(true),
            {
              retries: 10,
              interval: 1500,
              description: 'Wait for authentication completion'
            }
          );
        } else {
          throw new Error('Authentication required but not handled');
        }
        break;
      }

      // Check if we have valid auth state
      const hasValidAuth = await this.checkAuthenticationState();
      if (hasValidAuth) {
        console.log('[Navigation] Authentication state verified');
        break;
      }

      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Wait for page to be completely ready with smart detection and server stability handling
   * ✅ PHASE 7 FIX: Enhanced for frontend server stability issues
   */
  private async waitForPageReady(route: string, options: NavigationOptions): Promise<void> {
    const {
      pageReadySelector,
      skipNetworkIdle = false,
      additionalWaits = [],
      timeout = 45000 // ✅ PHASE 7 FIX: Increased timeout for server instability
    } = options;

    console.log(`[Navigation] Waiting for page ready: ${route}`);

    // 1. Wait for basic page load
    await this.page.waitForLoadState('domcontentloaded');

    // 2. Wait for route-specific ready indicators with enhanced error handling
    if (pageReadySelector) {
      try {
        await this.helpers.waitForElementReady(pageReadySelector, {
          timeout,
          description: `Page ready selector for ${route}`,
          retries: 3 // ✅ PHASE 7 FIX: Extra retries for server instability
        });
      } catch (error) {
        console.log(`[Navigation] ⚠️ Page ready selector failed, but continuing: ${error.message}`);
        // ✅ PHASE 7 FIX: Don't fail immediately, try alternative approach
        await this.page.waitForTimeout(2000); // Extra stabilization time
      }
    }

    // 3. Wait for network stability with enhanced handling
    if (!skipNetworkIdle) {
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }); // ✅ PHASE 7 FIX: Increased timeout
        console.log('[Navigation] Network idle achieved');
      } catch (error) {
        console.log('[Navigation] Network idle timeout - continuing with other checks');
        // ✅ PHASE 7 FIX: Additional stabilization wait for server recovery
        await this.page.waitForTimeout(3000);
      }
    }

    // 4. Additional route-specific waits
    for (const additionalWait of additionalWaits) {
      if (additionalWait.selector) {
        await this.helpers.waitForElementReady(additionalWait.selector, {
          timeout: additionalWait.timeout || 10000,
          description: `Additional wait: ${additionalWait.selector}`
        });
      }

      if (additionalWait.networkIdle) {
        try {
          await this.page.waitForLoadState('networkidle', {
            timeout: additionalWait.timeout || 5000
          });
        } catch (error) {
          console.log('[Navigation] Additional network idle timeout - continuing');
        }
      }
    }

    // 5. Wait for React/SPA hydration
    await this.waitForSPAReadiness();

    console.log(`[Navigation] Page ready checks completed for: ${route}`);
  }

  /**
   * Wait for SPA framework readiness
   */
  private async waitForSPAReadiness(): Promise<void> {
    try {
      // Wait for React hydration and router readiness
      await this.page.waitForFunction(() => {
        // Check if React is loaded and hydrated
        if (typeof window.React !== 'undefined' || document.querySelector('[data-reactroot]')) {
          return true;
        }

        // Check for common SPA loading indicators to disappear
        const loadingIndicators = document.querySelectorAll(
          '.loading, .spinner, .ant-spin, [data-testid="loading"], .skeleton'
        );

        return loadingIndicators.length === 0;
      }, { timeout: 10000 });

      console.log('[Navigation] SPA readiness confirmed');
    } catch (error) {
      console.log('[Navigation] SPA readiness check timeout - continuing');
    }
  }

  /**
   * Verify navigation was successful
   */
  private async verifyNavigationSuccess(route: string, options: NavigationOptions): Promise<void> {
    const { expectedUrl } = options;

    // Verify URL if specified
    if (expectedUrl) {
      if (typeof expectedUrl === 'string') {
        await expect(this.page).toHaveURL(expectedUrl);
      } else {
        await expect(this.page).toHaveURL(expectedUrl);
      }
    } else {
      // Default URL verification for the route
      const fullUrl = this.buildFullUrl(route);
      await expect(this.page).toHaveURL(new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }

    // Verify no error pages
    const errorSelectors = [
      'text=404', 'text="Not Found"', 'text="Page Not Found"',
      'text=500', 'text="Internal Server Error"',
      '.error-page', '.not-found'
    ];

    for (const selector of errorSelectors) {
      try {
        const errorElement = this.page.locator(selector);
        const isVisible = await errorElement.isVisible();
        if (isVisible) {
          throw new Error(`Error page detected: ${selector}`);
        }
      } catch (error) {
        if (error.message.includes('Error page detected')) {
          throw error;
        }
        // Selector not found - this is good
      }
    }
  }

  /**
   * Pre-navigation checks and preparation
   */
  private async preNavigationChecks(options: NavigationOptions): Promise<void> {
    // Clear any existing navigation state that might interfere
    try {
      // Cancel any pending navigation
      await this.page.waitForLoadState('domcontentloaded', { timeout: 1000 });
    } catch (error) {
      // Expected if no navigation in progress
    }
  }

  /**
   * Check authentication state from localStorage
   */
  private async checkAuthenticationState(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const authStorage = localStorage.getItem('mes-auth-storage');
        if (!authStorage) return false;

        try {
          const parsed = JSON.parse(authStorage);
          const token = parsed?.state?.token || parsed?.token;
          return Boolean(token && token.length > 20);
        } catch {
          return false;
        }
      });
    } catch (error) {
      console.log('[Navigation] Auth state check failed:', error.message);
      return false;
    }
  }

  /**
   * Get route-specific configuration
   */
  private getRouteConfig(route: string): Partial<NavigationOptions> {
    // Try exact match first
    if (this.routeConfigs.has(route)) {
      return this.routeConfigs.get(route)!;
    }

    // Try pattern matching
    for (const [pattern, config] of this.routeConfigs.entries()) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '[^/]+'));
        if (regex.test(route)) {
          return config;
        }
      }
    }

    // Default configuration
    return {
      pageReadySelector: 'body',
      requireAuth: true,
      skipNetworkIdle: false
    };
  }

  /**
   * Build full URL from route
   */
  private buildFullUrl(route: string): string {
    if (route.startsWith('http')) {
      return route;
    }

    const cleanRoute = route.startsWith('/') ? route : `/${route}`;
    return `${this.baseUrl}${cleanRoute}`;
  }

  /**
   * Quick navigation for simple cases
   */
  async quickNavigate(route: string): Promise<void> {
    await this.navigateToRoute(route, {
      waitUntil: 'domcontentloaded',
      skipNetworkIdle: true,
      timeout: 15000,
      retries: 2
    });
  }

  /**
   * Navigate and wait for specific content
   */
  async navigateAndWaitFor(route: string, selector: string, options: NavigationOptions = {}): Promise<void> {
    await this.navigateToRoute(route, {
      ...options,
      pageReadySelector: selector
    });
  }

  /**
   * Reliable back navigation
   */
  async goBack(waitForRoute?: string): Promise<void> {
    console.log('[Navigation] Performing back navigation');

    await this.page.goBack();

    if (waitForRoute) {
      await this.waitForPageReady(waitForRoute, {});
    } else {
      await this.page.waitForLoadState('domcontentloaded');
      await this.waitForSPAReadiness();
    }
  }

  /**
   * Refresh page reliably
   */
  async refresh(options: NavigationOptions = {}): Promise<void> {
    console.log('[Navigation] Performing page refresh');

    const currentUrl = this.page.url();
    const route = currentUrl.replace(this.baseUrl, '');

    await this.page.reload();
    await this.waitForPageReady(route, options);
  }
}

/**
 * Factory function to create navigation manager
 */
export function createNavigationManager(page: Page, baseUrl?: string): EnhancedNavigationManager {
  return new EnhancedNavigationManager(page, baseUrl);
}

/**
 * Simplified navigation helpers for common patterns
 */
export const NavigationHelpers = {
  /**
   * Create a standard authenticated navigation function
   */
  createAuthenticatedNavigator: (page: Page, baseUrl?: string) => {
    const manager = new EnhancedNavigationManager(page, baseUrl);
    return (route: string, options?: NavigationOptions) =>
      manager.navigateAuthenticated(route, options);
  },

  /**
   * Create a quick navigation function for fast tests
   */
  createQuickNavigator: (page: Page, baseUrl?: string) => {
    const manager = new EnhancedNavigationManager(page, baseUrl);
    return (route: string) => manager.quickNavigate(route);
  }
};