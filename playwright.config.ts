import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for MES System
 *
 * Environment Variables for Microservices Testing:
 * - E2E_BASE_URL: Frontend URL (default: http://localhost:5278)
 * - AUTH_SERVICE_URL: Auth Service URL (default: uses frontend proxy)
 *   Set to http://localhost:3008 to test Auth Service directly
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry failed tests to handle transient failures */
  retries: process.env.CI ? 2 : 1,
  /* Limit workers to reduce API rate limiting and improve stability */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5278',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshots on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'retain-on-failure',

    /* Global timeout for each action */
    actionTimeout: 10000,

    /* Global timeout for navigation */
    navigationTimeout: 30000,

    /* Add test mode marker for auth store detection */
    extraHTTPHeaders: {
      'X-Test-Mode': 'playwright-e2e'
    }
  },

  /* Configure projects - organized by authentication requirements */
  projects: [
    // ==========================================
    // AUTHENTICATED TESTS (use storageState)
    // ==========================================

    /* Authenticated feature tests with standard timeouts */
    {
      name: 'authenticated',
      testMatch: [
        '**/frontend-quality.spec.ts',
        '**/material-traceability.spec.ts',
        '**/work-order-management.spec.ts',
        '**/performance.spec.ts',
        '**/product-definition.spec.ts',
        '**/production-scheduling.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        storageState: '.auth/user.json',
      },
    },

    /* Quality management tests - authenticated with extended timeouts */
    {
      name: 'quality-tests',
      testMatch: '**/quality-management.spec.ts',
      timeout: 120000, // 2 minutes per test (quality tests are slow)
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
        actionTimeout: 120000, // Increased from 60s to 120s for slow quality dashboard renders
        navigationTimeout: 90000,
      },
    },

    /* Collaborative routing tests - manage own auth, extended timeouts */
    {
      name: 'collaborative-routing-tests',
      testMatch: '**/collaborative-routing.spec.ts',
      timeout: 120000, // 2 minutes per test (includes 30s+ polling intervals)
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests manage their own authentication
        actionTimeout: 60000,
        navigationTimeout: 30000,
      },
    },

    /* Routing feature tests - manage own auth, standard timeouts */
    {
      name: 'routing-feature-tests',
      testMatch: [
        '**/routing-management.spec.ts',
        '**/routing-advanced-patterns.spec.ts',
        '**/routing-templates.spec.ts',
        '**/routing-visual-editor.spec.ts',
      ],
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests manage their own authentication
        actionTimeout: 30000,
        navigationTimeout: 30000,
      },
    },

    /* Traceability workflow tests - authenticated with extended timeouts */
    {
      name: 'traceability-tests',
      testMatch: '**/traceability-workflow.spec.ts',
      timeout: 120000, // 2 minutes per test (D3.js rendering can be slow)
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
        actionTimeout: 120000, // Increased from 60s to 120s for D3.js graph interactions
        navigationTimeout: 90000,
      },
    },

    /* Equipment hierarchy tests - API tests with own request context */
    {
      name: 'equipment-hierarchy-tests',
      testMatch: '**/equipment-hierarchy.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
      },
    },

    /* Material hierarchy tests - API tests with own request context */
    {
      name: 'material-hierarchy-tests',
      testMatch: '**/material-hierarchy.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
      },
    },

    /* Process segment hierarchy tests - API tests with own request context */
    {
      name: 'process-segment-hierarchy-tests',
      testMatch: '**/process-segment-hierarchy.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
      },
    },

    /* FAI workflow tests - authenticated with extended timeouts */
    {
      name: 'fai-tests',
      testMatch: '**/fai-workflow.spec.ts',
      timeout: 120000, // 2 minutes per test (CMM data import can be slow)
      use: {
        ...devices['Desktop Chrome'],
        storageState: '.auth/user.json',
        actionTimeout: 120000, // Increased from 60s to 120s for CMM XML file processing
        navigationTimeout: 90000,
      },
    },

    // ==========================================
    // UNAUTHENTICATED TESTS (no storageState)
    // ==========================================

    /* Authentication flow tests - manage their own auth */
    {
      name: 'auth-tests',
      testMatch: [
        '**/authentication.spec.ts',
        '**/account-status-errors.spec.ts',
        '**/dashboard-after-login.spec.ts',
        '**/csp-api-violations.spec.ts',
        '**/mainlayout-permission-errors.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        // No storageState - these tests handle auth themselves
      },
    },

    /* API integration tests - use their own API context */
    {
      name: 'api-tests',
      testMatch: [
        '**/api-integration.spec.ts',
        '**/work-order-execution.spec.ts',
        '**/b2m-integration.spec.ts',
        '**/l2-equipment-integration.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
      },
    },

    /* Parameter management tests - API tests with own request context */
    {
      name: 'parameter-management-tests',
      testMatch: [
        '**/parameter-limits.spec.ts',
        '**/parameter-groups.spec.ts',
        '**/parameter-formulas.spec.ts',
      ],
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
      },
    },

    /* SPC (Statistical Process Control) tests - API tests with own request context */
    {
      name: 'spc-tests',
      testMatch: [
        '**/spc-configuration.spec.ts',
        '**/spc-control-charts.spec.ts',
        '**/spc-rule-violations.spec.ts',
        '**/spc-capability.spec.ts',
        '**/spc-workflow.spec.ts',
      ],
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
      },
    },

    /* Routing edge case tests - manage auth during test */
    {
      name: 'routing-edge-cases',
      testMatch: '**/routing-edge-cases.spec.ts',
      retries: 3,
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests intentionally clear and re-auth
        actionTimeout: 20000,
        navigationTimeout: 60000,
      },
    },

    /* SPA routing tests - localhost */
    {
      name: 'routing-localhost',
      testMatch: '**/spa-routing.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5278',
        // No storageState - tests manage auth for different scenarios
        // Authenticated tests use navigateAuthenticated helper
      },
    },

    /* Frontend smoke tests - comprehensive site traversal */
    {
      name: 'smoke-tests',
      testMatch: '**/frontend-smoke-test.spec.ts',
      timeout: 300000, // 5 minutes total for all routes
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - test manages its own auth
        actionTimeout: 15000,
        navigationTimeout: 10000,
      },
    },

    /* Role-based E2E tests - comprehensive role validation */
    {
      name: 'role-tests',
      testMatch: '**/roles/*.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests manage their own role-specific auth
        actionTimeout: 15000,
        navigationTimeout: 30000,
      },
    },

    // NOTE: Domain integration tests (routing-domain and domain-integration)
    // have been removed because they require Nginx and /etc/hosts configuration.
    // To re-enable, add projects with baseURL: 'http://local.mes.com'
  ],


  /* Global setup */
  globalSetup: require.resolve('./src/tests/e2e/global-setup.ts'),
  
  /* Global teardown */
  globalTeardown: require.resolve('./src/tests/e2e/global-teardown.ts'),
  
  /* Test timeout */
  timeout: 90000, // Increased from 60s to 90s for slow UI rendering tests
  
  /* Expect timeout */
  expect: {
    timeout: 10000
  },
  
  /* Output directory */
  outputDir: 'test-results/',
});