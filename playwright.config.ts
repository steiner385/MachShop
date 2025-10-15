import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
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

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    /* Domain-specific routing tests */
    {
      name: 'routing-localhost',
      testMatch: '**/spa-routing.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:5178'
      },
    },
    {
      name: 'routing-domain',
      testMatch: '**/spa-routing.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://local.mes.com'
      },
    },

    /* Edge case testing with specific configurations */
    {
      name: 'routing-edge-cases',
      testMatch: '**/routing-edge-cases.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Longer timeouts for edge case testing
        actionTimeout: 15000,
        navigationTimeout: 45000,
      },
    },

    /* Domain integration with full nginx proxy testing */
    {
      name: 'domain-integration-full',
      testMatch: '**/domain-integration.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        baseURL: 'http://local.mes.com',
        // Enable more detailed tracing for domain tests
        trace: 'on',
        video: 'on',
      },
    },
  ],


  /* Global setup */
  globalSetup: require.resolve('./src/tests/e2e/global-setup.ts'),
  
  /* Global teardown */
  globalTeardown: require.resolve('./src/tests/e2e/global-teardown.ts'),
  
  /* Test timeout */
  timeout: 60000,
  
  /* Expect timeout */
  expect: {
    timeout: 10000
  },
  
  /* Output directory */
  outputDir: 'test-results/',
});