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
  /* Enhanced retry settings for improved reliability */
  retries: process.env.CI ? 3 : 2, // Increased retries (CI: 3, local: 2)
  /* Limit workers to reduce API rate limiting and improve stability */
  workers: process.env.CI ? 1 : 3, // Reduced workers for better stability
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

    /* Enhanced timeout settings for improved reliability */
    actionTimeout: 30000, // Increased from 10s to 30s for slow UI elements
    navigationTimeout: 30000,

    /* Add test mode marker for auth store detection */
    extraHTTPHeaders: {
      'X-Test-Mode': 'playwright-e2e'
    },

    /* Enhanced browser settings for stability */
    launchOptions: {
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ]
    }
  },

  /* Configure projects - organized by authentication requirements */
  projects: [
    // ==========================================
    // AUTHENTICATED TESTS (self-managing auth)
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
        // No storageState - tests manage their own authentication for dynamic allocation
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'authenticated'
        }
      },
      // Set project name for port allocation
      metadata: { projectName: 'authenticated' }
    },

    /* Quality management tests - authenticated with extended timeouts */
    {
      name: 'quality-tests',
      testMatch: '**/quality-management.spec.ts',
      timeout: 120000, // 2 minutes per test (quality tests are slow)
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests manage their own authentication for dynamic allocation
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
        // No storageState - tests manage their own authentication for dynamic allocation
        actionTimeout: 120000, // Increased from 60s to 120s for D3.js graph interactions
        navigationTimeout: 90000,
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'traceability-tests'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'traceability-tests' }
    },

    /* Equipment hierarchy tests - API tests with own request context */
    {
      name: 'equipment-hierarchy-tests',
      testMatch: '**/equipment-hierarchy.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'equipment-hierarchy-tests'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'equipment-hierarchy-tests' }
    },

    /* Material hierarchy tests - API tests with own request context */
    {
      name: 'material-hierarchy-tests',
      testMatch: '**/material-hierarchy.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'material-hierarchy-tests'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'material-hierarchy-tests' }
    },

    /* Process segment hierarchy tests - API tests with own request context */
    {
      name: 'process-segment-hierarchy-tests',
      testMatch: '**/process-segment-hierarchy.spec.ts',
      timeout: 90000, // 90 seconds per test
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - API tests create their own request context
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'process-segment-hierarchy-tests'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'process-segment-hierarchy-tests' }
    },

    /* FAI workflow tests - authenticated with extended timeouts */
    {
      name: 'fai-tests',
      testMatch: '**/fai-workflow.spec.ts',
      timeout: 120000, // 2 minutes per test (CMM data import can be slow)
      use: {
        ...devices['Desktop Chrome'],
        // No storageState - tests manage their own authentication for dynamic allocation
        actionTimeout: 120000, // Increased from 60s to 120s for CMM XML file processing
        navigationTimeout: 90000,
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'fai-tests'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'fai-tests' }
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
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'routing-edge-cases'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'routing-edge-cases' }
    },

    /* SPA routing tests - dynamic allocation */
    {
      name: 'routing-localhost',
      testMatch: '**/spa-routing.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Uses dynamic allocation infrastructure - no hardcoded baseURL
        // No storageState - tests manage auth for different scenarios
        // Authenticated tests use navigateAuthenticated helper
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'routing-localhost'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'routing-localhost' }
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
        extraHTTPHeaders: {
          'X-Test-Mode': 'playwright-e2e',
          'X-Project-Name': 'role-tests'
        }
      },
      // Set project name for dynamic allocation
      metadata: { projectName: 'role-tests' }
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
  
  /* Enhanced expect timeout for better reliability */
  expect: {
    timeout: 30000, // Increased from 10s to 30s for slow-loading elements
    // Additional expect configuration for UI reliability
    toHaveScreenshot: { threshold: 0.2, timeout: 30000 },
    toMatchScreenshot: { threshold: 0.2, timeout: 30000 }
  },
  
  /* Output directory */
  outputDir: 'test-results/',
});