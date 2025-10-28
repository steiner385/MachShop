import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AuthTokenCache } from '../helpers/authCache';
import { TEST_USERS } from '../helpers/testAuthHelper';
import { ServerHealthMonitor } from '../helpers/serverHealthMonitor';
import FrontendStabilityManager from '../helpers/frontendStabilityManager';
import { portAllocator, AllocatedPorts } from '../helpers/portAllocator';
import { databaseAllocator, AllocatedDatabase } from '../helpers/databaseAllocator';

// Global variables to track server processes
let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;

// Server health monitor instance
export let healthMonitor: ServerHealthMonitor | null = null;

// Frontend stability manager instance
export let frontendStabilityManager: FrontendStabilityManager | null = null;

// Global variables to store allocated resources for this test session
let allocatedPorts: AllocatedPorts | null = null;
let allocatedDatabase: AllocatedDatabase | null = null;

/**
 * Clean up zombie test processes and occupied ports
 *
 * Runs the port cleanup script to ensure clean test environment.
 * This prevents port conflicts from zombie processes left by failed test runs.
 */
async function cleanupTestPorts(): Promise<void> {
  console.log('Running port cleanup script...');

  try {
    const cleanupScriptPath = path.join(process.cwd(), 'scripts', 'cleanup-test-ports.sh');

    execSync(cleanupScriptPath, {
      stdio: 'inherit',
      timeout: 30000 // 30 second timeout
    });

    console.log('Port cleanup completed successfully');
  } catch (error) {
    console.warn('Port cleanup script encountered an issue (non-fatal):', error instanceof Error ? error.message : String(error));
    // Don't fail the test setup if cleanup has issues - tests may still work
  }
}

/**
 * Get the current test project name from various sources
 */
function getTestProjectName(): string {
  // Try multiple sources for project name
  const projectName =
    process.env.PLAYWRIGHT_PROJECT ||
    process.env.PROJECT_NAME ||
    process.argv.find(arg => arg.startsWith('--project='))?.split('=')[1] ||
    process.argv.find((arg, index, arr) => arr[index - 1] === '--project') ||
    'default';

  console.log(`[Global Setup] Detected project name: "${projectName}"`);
  return projectName;
}

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup for E2E tests...');

  // Clean up any zombie processes and occupied ports from previous test runs
  await cleanupTestPorts();

  safeLog('[Global Setup] DEBUG: About to detect project name...');

  // Get project name early for better error reporting
  const projectName = getTestProjectName();
  safeLog(`[Global Setup] Project name detected: "${projectName}"`);

  try {
    safeLog('[Global Setup] DEBUG: About to allocate ports...');

    // Allocate dynamic ports with retry logic for parallel execution
    allocatedPorts = await portAllocator.allocatePortsForProject(projectName);
    safeLog(`[Global Setup] ✅ Allocated ports for project "${projectName}": Backend ${allocatedPorts.backendPort}, Frontend ${allocatedPorts.frontendPort}`);

    safeLog('[Global Setup] DEBUG: About to allocate database...');
    // Allocate dedicated database for this test project
    allocatedDatabase = await databaseAllocator.allocateDatabaseForProject(projectName);
    safeLog(`[Global Setup] ✅ Allocated database for project "${projectName}": ${allocatedDatabase.databaseName}`);

    // ✅ PHASE 6F FIX: Initialize reference counting for database cleanup
    // This prevents premature database dropping when multiple parallel processes share the same database
    await initializeDatabaseReferenceCount(projectName, allocatedDatabase.databaseName);

    safeLog(`[Global Setup] ✅ DYNAMIC ALLOCATION SUCCESS for "${projectName}"`);

  } catch (error) {
    console.error(`[Global Setup] ❌ DYNAMIC ALLOCATION FAILED for project "${projectName}":`, error);
    console.error('[Global Setup] 🔄 Will use fallback configuration (hardcoded ports)');
    console.error('[Global Setup] ⚠️  WARNING: This may cause EADDRINUSE conflicts with other parallel tests');

    // Log details for debugging
    if (error instanceof Error) {
      console.error('[Global Setup] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n') // First 5 lines of stack
      });
    }
  }

  safeLog('[Global Setup] DEBUG: About to load environment...');
  // Load E2E environment variables with dynamic resources (sets DATABASE_URL)
  loadE2EEnvironment();

  // Note: Database setup is now handled by DatabaseAllocator per-project
  // No longer need shared database setup since each project gets isolated database

  // Start E2E-specific servers (backend will now connect to isolated database)
  await startE2EServers();
  
  // Wait for servers to be ready using dynamic ports
  const backendUrl = `http://localhost:${process.env.PORT}/health`;
  const frontendUrl = `http://localhost:${process.env.FRONTEND_PORT}`;

  await waitForServer(backendUrl);
  await waitForServer(frontendUrl);

  console.log(`[Global Setup] Servers ready on dynamic ports: Backend ${backendUrl}, Frontend ${frontendUrl}`);

  // ✅ PHASE 6C FIX: Initialize ServerHealthMonitor with correct dynamic URLs
  console.log('Initializing ServerHealthMonitor with dynamic URLs...');
  healthMonitor = ServerHealthMonitor.getInstance();

  // ✅ CRITICAL FIX: Use updateConfiguration to ensure correct URLs even if instance exists
  healthMonitor.updateConfiguration(
    backendUrl.replace('/health', ''), // Remove /health suffix for base URL
    frontendUrl,
    30000 // 30 second check interval
  );
  console.log(`ServerHealthMonitor configured for Backend: ${backendUrl.replace('/health', '')}, Frontend: ${frontendUrl}`);

  // ✅ ENHANCED FRONTEND STABILITY: Start advanced frontend stability management
  console.log('Starting advanced frontend stability monitoring with intelligent recovery...');

  frontendStabilityManager = FrontendStabilityManager.getInstance({
    healthCheckInterval: 5000,        // Check every 5 seconds (vs 30s before)
    maxConsecutiveFailures: 3,        // Trip after 3 failures
    circuitBreakerThreshold: 3,       // Circuit breaker protection
    maxRecoveryAttempts: 5,           // More recovery attempts
    exponentialBackoffBase: 2000,     // 2s base delay with exponential backoff
    gracefulDegradationEnabled: true  // Allow degraded operation for tests
  });

  // Set up comprehensive event callbacks for monitoring
  frontendStabilityManager.setEventCallbacks({
    onHealthChange: (metrics) => {
      const statusEmoji = {
        'healthy': '✅',
        'degraded': '🟡',
        'critical': '🟠',
        'offline': '❌'
      }[metrics.status] || '❓';

      console.log(`[FrontendStability] ${statusEmoji} Status: ${metrics.status}, Response: ${metrics.responseTime}ms, Failures: ${metrics.consecutiveFailures}`);
    },

    onRecoveryStart: () => {
      console.log('[FrontendStability] 🔄 Starting intelligent recovery process...');
    },

    onRecoveryComplete: (success) => {
      if (success) {
        console.log('[FrontendStability] ✅ Recovery completed successfully');
      } else {
        console.log('[FrontendStability] ❌ Recovery attempt failed, will retry with exponential backoff');
      }
    },

    onCircuitBreakerTrip: () => {
      console.log('[FrontendStability] 🔌 Circuit breaker tripped - frontend stability compromised');
    }
  });

  // Start monitoring the frontend server
  await frontendStabilityManager.startMonitoring(frontendUrl);

  // Wait for frontend to be healthy before proceeding
  const isHealthy = await frontendStabilityManager.waitForHealthy(30000); // 30 second timeout
  if (!isHealthy) {
    console.warn('[FrontendStability] ⚠️  Frontend not fully healthy, but proceeding with degraded operation');
  }

  console.log('Advanced frontend stability monitoring active (5s intervals with circuit breaker protection)');

  // Create test users and initial data
  await seedTestData(projectName);
  
  // Authenticate and save storage state for reuse
  await authenticateTestUser();

  // Pre-authenticate all test users to populate auth cache and prevent rate limiting
  await preAuthenticateAllUsers();

  console.log('Global setup completed.');
}

function loadE2EEnvironment() {
  console.log('Loading E2E environment configuration...');

  // Set essential E2E environment variables (since backend no longer loads .env.e2e)
  process.env.JWT_SECRET = 'e2e-test-jwt-secret-for-testing-only';
  process.env.JWT_EXPIRE = '24h';
  process.env.JWT_REFRESH_EXPIRE = '7d';
  process.env.BCRYPT_ROUNDS = '10';
  process.env.SESSION_SECRET = 'e2e-test-session-secret-for-testing-only';
  process.env.TEST_MODE = 'true';
  process.env.DISABLE_RATE_LIMITING = 'true';
  process.env.FAST_BCRYPT = 'true';
  process.env.LOG_LEVEL = 'warn';

  if (allocatedPorts) {
    process.env.PORT = allocatedPorts.backendPort.toString();
    process.env.FRONTEND_PORT = allocatedPorts.frontendPort.toString();
    process.env.E2E_BASE_URL = `http://localhost:${allocatedPorts.frontendPort}`;
    console.log(`[E2E Environment] ✅ DYNAMIC ALLOCATION MODE: Backend ${allocatedPorts.backendPort}, Frontend ${allocatedPorts.frontendPort}`);
  } else {
    // Fallback to default ports if allocation failed
    process.env.PORT = '3101';
    process.env.FRONTEND_PORT = '5278';
    process.env.E2E_BASE_URL = 'http://localhost:5278';
    console.warn('[E2E Environment] ⚠️  FALLBACK MODE: Using hardcoded ports Backend 3101, Frontend 5278');
    console.warn('[E2E Environment] ❌ This configuration may cause EADDRINUSE conflicts in parallel execution');
  }

  // Set project-specific database URL
  if (allocatedDatabase) {
    process.env.DATABASE_URL = allocatedDatabase.databaseUrl;
    console.log(`[E2E Environment] Using project database: ${allocatedDatabase.databaseName}`);
  } else {
    // When dynamic allocation fails, create a fresh fallback database with current migrations
    const fallbackDbName = `mes_e2e_fallback_${Date.now()}`;
    const fallbackDatabaseUrl = `postgresql://mes_user:mes_password@localhost:5432/${fallbackDbName}?schema=public`;

    try {
      console.warn('[E2E Environment] ⚠️  Dynamic database allocation failed, creating fallback database...');

      // Create fallback database
      execSync(`PGPASSWORD=mes_password createdb -U mes_user -h localhost ${fallbackDbName}`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });

      // Apply current migrations to fallback database
      execSync(`DATABASE_URL="${fallbackDatabaseUrl}" npx prisma migrate deploy`, {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: fallbackDatabaseUrl }
      });

      process.env.DATABASE_URL = fallbackDatabaseUrl;
      console.log(`[E2E Environment] ✅ Created fallback database: ${fallbackDbName}`);

    } catch (fallbackError) {
      console.error('[E2E Environment] ❌ CRITICAL: Both dynamic allocation and fallback database creation failed');
      console.error('[E2E Environment] This indicates a serious database connectivity or permissions issue');
      throw new Error(`Database setup completely failed: ${fallbackError}`);
    }
  }

  safeLog('E2E environment loaded: ' + JSON.stringify({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_PORT: process.env.FRONTEND_PORT,
    DATABASE_URL: process.env.DATABASE_URL.split('@')[1] // Hide credentials
  }));
}

async function startE2EServers() {
  console.log('Starting E2E-specific servers...');

  // Start backend server on dynamic port
  await startBackendServer();

  // Start frontend server on dynamic port
  await startFrontendServer();
  
  // Store process IDs for cleanup
  if (backendProcess?.pid) {
    fs.writeFileSync(path.join(__dirname, '.e2e-backend-pid'), backendProcess.pid.toString());
  }
  if (frontendProcess?.pid) {
    fs.writeFileSync(path.join(__dirname, '.e2e-frontend-pid'), frontendProcess.pid.toString());
  }
}

async function startBackendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const port = process.env.PORT || '3101';
    console.log(`Starting E2E backend server on port ${port}...`);

    backendProcess = spawn('npm', ['run', 'e2e:server'], {
      env: {
        ...process.env,
        // Explicitly ensure our dynamic DATABASE_URL takes precedence over .env.e2e
        DATABASE_URL: process.env.DATABASE_URL
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let serverStarted = false;

    backendProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      safeLog(`[E2E Backend] ${output.trim()}`);
    });

    backendProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.error(`[E2E Backend Error] ${output.trim()}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to start E2E backend server:', error);
      if (!serverStarted) {
        reject(error);
      }
    });

    backendProcess.on('exit', (code) => {
      if (code !== 0 && !serverStarted) {
        reject(new Error(`E2E backend server exited with code ${code}`));
      }
    });

    // Poll for server readiness by checking health endpoint
    const healthUrl = `http://localhost:${port}/health`;
    const startTime = Date.now();
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(healthUrl);
        if (response.ok && !serverStarted) {
          serverStarted = true;
          clearInterval(pollInterval);
          safeLog(`E2E backend server is ready at ${healthUrl}`);
          resolve();
        }
      } catch (error) {
        // Server not ready yet, keep polling
      }

      // Timeout after 60 seconds
      if (Date.now() - startTime > 60000 && !serverStarted) {
        clearInterval(pollInterval);
        reject(new Error(`E2E backend server failed to start within 60 seconds on port ${port}`));
      }
    }, 1000);
  });
}

async function startFrontendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const port = process.env.FRONTEND_PORT || '5278';
    console.log(`Starting E2E frontend server on port ${port}...`);

    frontendProcess = spawn('npm', ['run', 'e2e:frontend'], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let serverStarted = false;

    frontendProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[E2E Frontend] ${output.trim()}`);

      // Check for the dynamic port in the Vite output
      if ((output.includes('Local:') && output.includes(port)) && !serverStarted) {
        serverStarted = true;
        console.log(`E2E frontend server is ready on port ${port}`);
        resolve();
      }
    });

    frontendProcess.stderr?.on('data', (data) => {
      console.error(`[E2E Frontend Error] ${data.toString().trim()}`);
    });

    frontendProcess.on('error', (error) => {
      console.error('Failed to start E2E frontend server:', error);
      reject(error);
    });

    frontendProcess.on('exit', (code) => {
      if (code !== 0 && !serverStarted) {
        reject(new Error(`E2E frontend server exited with code ${code}`));
      }
    });

    // Timeout after 60 seconds
    setTimeout(() => {
      if (!serverStarted) {
        reject(new Error('E2E frontend server failed to start within 60 seconds'));
      }
    }, 60000);
  });
}


async function waitForServer(url: string) {
  console.log(`Waiting for server at ${url}...`);
  
  const maxAttempts = 60;
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Server at ${url} is ready`);
        return;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    attempts++;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server at ${url} did not start within ${maxAttempts} seconds`);
}

async function seedTestData(projectName: string) {
  console.log('Seeding E2E test data...');
  
  try {
    // Clear existing test data before seeding
    await clearTestData();
    
    // Use allocated database URL if available, otherwise fallback to shared database
    const seedDatabaseUrl = allocatedDatabase
      ? allocatedDatabase.databaseUrl
      : 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';

    console.log(`[E2E Seeding] Using database: ${seedDatabaseUrl.split('@')[1]}`); // Hide credentials

    // Determine seeding strategy based on project requirements
    const projectsNeedingFullSeed = [
      'equipment-hierarchy-tests',
      'material-hierarchy-tests',
      'process-segment-hierarchy-tests',
      'traceability-tests',
      'fai-tests',
      'routing-feature-tests',
      'routing-edge-cases',
      'routing-localhost',
      'authenticated',           // Includes production-scheduling which needs routing data
      'quality-tests',           // May include routing-related quality checks
      'collaborative-routing-tests', // Routing collaboration features
      'api-tests',              // API tests need full data for proper integration testing
      'parameter-management-tests', // Parameter tests need parameter data and routing context
      'spc-tests',              // SPC tests need full statistical process control data
      'smoke-tests',            // Comprehensive site traversal needs all data
      'role-tests',             // Role validation needs access to all features/data
      'default'                 // When running comprehensive test suite
    ];

    const needsFullSeed = projectsNeedingFullSeed.includes(projectName);
    const seedScript = needsFullSeed ? 'prisma/seed.ts' : 'prisma/seed-auth-only.ts';

    console.log(`[E2E Seeding] Using ${needsFullSeed ? 'FULL' : 'AUTH-ONLY'} seed for project: ${projectName}`);

    execSync(`DATABASE_URL="${seedDatabaseUrl}" tsx ${seedScript}`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: seedDatabaseUrl }
    });
    
    console.log('E2E test data seeded successfully');
  } catch (error) {
    console.error('Failed to seed E2E test data:', error);
    throw error;
  }
}

async function clearTestData() {
  console.log('Clearing existing E2E test data...');

  try {
    // Clear E2E test data in proper order respecting foreign key constraints
    // Use allocated database URL if available, otherwise fallback to shared database
    const e2eDatabaseUrl = allocatedDatabase
      ? allocatedDatabase.databaseUrl
      : 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';
    execSync(`DATABASE_URL="${e2eDatabaseUrl}" npx prisma db execute --stdin`, {
      input: `
        -- Disable foreign key checks temporarily for PostgreSQL
        SET session_replication_role = 'replica';
        
        -- Clear all tables in reverse dependency order
        TRUNCATE TABLE "inventory" CASCADE;
        TRUNCATE TABLE "serialized_parts" CASCADE;
        TRUNCATE TABLE "equipment" CASCADE;
        TRUNCATE TABLE "ncrs" CASCADE;
        TRUNCATE TABLE "quality_inspections" CASCADE;
        TRUNCATE TABLE "quality_characteristics" CASCADE;
        TRUNCATE TABLE "quality_plans" CASCADE;
        TRUNCATE TABLE "operations" CASCADE;
        TRUNCATE TABLE "routings" CASCADE;
        TRUNCATE TABLE "work_orders" CASCADE;
        TRUNCATE TABLE "parts" CASCADE;
        TRUNCATE TABLE "work_centers" CASCADE;
        TRUNCATE TABLE "users" CASCADE;
        
        -- Re-enable foreign key checks
        SET session_replication_role = 'origin';
      `,
      stdio: 'pipe',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl }
    });
    
    console.log('E2E test data cleared successfully');
  } catch (error) {
    console.log('E2E test data clearing skipped (tables might not exist yet)');
  }
}

async function authenticateTestUser() {
  console.log('Authenticating test user...');
  
  // Ensure auth directory exists (in project root, not test directory)
  const authDir = path.join(process.cwd(), '.auth');
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  const browser = await chromium.launch();
  const context = await browser.newContext({
    baseURL: `http://localhost:${process.env.FRONTEND_PORT || '5278'}`
  });
  const page = await context.newPage();
  
  // Set up console monitoring for authentication flow
  const consoleWarnings: string[] = [];
  const consoleErrors: string[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    if (msg.type() === 'warning') {
      consoleWarnings.push(text);
      console.log('Browser Warning:', text);
    } else if (msg.type() === 'error') {
      consoleErrors.push(text);
      console.log('Browser Error:', text);
    } else if (msg.type() === 'log') {
      console.log('Browser Log:', text);
    }
  });
  
  page.on('pageerror', (error) => {
    console.log('Browser Page Error:', error.message);
  });
  
  try {
    // Navigate to login page
    await page.goto('/');
    
    // Check if we're redirected to login
    await page.waitForURL(/\/login/, { timeout: 10000 });
    
    // Login as admin user (using seeded credentials)
    console.log('Filling login form...');
    await page.fill('input[data-testid="username-input"]', 'admin');
    await page.fill('input[data-testid="password-input"]', 'password123');
    
    console.log('Clicking login button...');
    
    // Listen for network requests
    page.on('request', request => {
      if (request.url().includes('/api/v1/auth/login')) {
        console.log('Login API request:', request.method(), request.url());
      }
    });
    
    page.on('response', async response => {
      if (response.url().includes('/api/v1/auth/login')) {
        console.log('Login API response:', response.status(), response.url());
        if (response.status() === 200) {
          try {
            const responseBody = await response.text();
            console.log('Login response body:', responseBody.substring(0, 500));
          } catch (error) {
            console.log('Could not read response body:', error);
          }
        }
      }
    });
    
    await page.click('button[data-testid="login-button"]');
    
    console.log('Waiting for login response...');
    // Wait for either navigation or error
    try {
      await Promise.race([
        page.waitForURL('/dashboard', { timeout: 10000 }),
        page.waitForSelector('.ant-alert-error', { timeout: 10000 })
      ]);
    } catch (error) {
      console.log('No navigation or error detected');
    }
    
    console.log('Current URL after login attempt:', page.url());
    
    // Check for any error messages
    const errorAlert = page.locator('.ant-alert-error');
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      console.log('Login error:', errorText);
    }
    
    // Check if login button is still loading
    const loginButton = page.locator('button[data-testid="login-button"]');
    const isLoading = await loginButton.locator('.ant-spin').isVisible().catch(() => false);
    console.log('Login button still loading:', isLoading);
    
    // Wait longer to see if there are any delayed effects
    await page.waitForTimeout(3000);
    console.log('Current URL after extended wait:', page.url());
    
    // Check localStorage for authentication state
    const localStorage = await page.evaluate(() => {
      const authData = localStorage.getItem('mes-auth-storage');
      let parsedAuth = null;
      try {
        parsedAuth = authData ? JSON.parse(authData) : null;
      } catch (e) {
        // ignore parse errors
      }
      
      return {
        hasAuthData: !!localStorage.getItem('auth-storage'),
        authKeys: Object.keys(localStorage).filter(key => key.includes('auth')),
        authStorageRaw: authData ? authData.substring(0, 200) + '...' : null,
        isAuthenticated: parsedAuth?.state?.user ? true : false,
        hasToken: parsedAuth?.state?.token ? true : false,
        userId: parsedAuth?.state?.user?.id || null
      };
    });
    console.log('Auth localStorage state:', localStorage);
    
    // Check for any console errors that occurred during login
    if (consoleErrors.length > 0) {
      console.log('Console errors during login:', consoleErrors);
    }
    
    // Since automatic navigation isn't working but auth data is saved correctly,
    // manually navigate to dashboard for test setup purposes
    if (localStorage.isAuthenticated && localStorage.hasToken) {
      console.log('Auth state is valid, manually navigating to dashboard for test setup...');
      await page.goto('/dashboard');

      // Wait for dashboard to load with more reliable condition
      // Instead of networkidle (which fails due to SiteContext polling), wait for main dashboard elements
      try {
        await page.waitForSelector('.ant-layout-content', { timeout: 15000 });
        console.log('Dashboard navigation completed, URL:', page.url());
      } catch (error) {
        console.log('Dashboard load timeout, but continuing - auth state is valid');
        console.log('Current URL:', page.url());
      }
    } else {
      console.log('Auth state invalid, cannot proceed with test setup');
      throw new Error('Authentication setup failed - invalid auth state');
    }
    
    // Save authenticated state to project root (matching playwright.config.ts expectation)
    await context.storageState({
      path: path.join(process.cwd(), '.auth/user.json')
    });
    
    console.log('Authentication completed and state saved');
  } catch (error) {
    console.error('Authentication failed:', error);
    console.log('Page URL:', page.url());
    
    // Take screenshot for debugging
    await page.screenshot({
      path: path.join(process.cwd(), '.auth/auth-failure.png'),
      fullPage: true
    });
    
    throw error;
  } finally {
    await browser.close();
  }
}

/**
 * Pre-authenticate all test users to populate auth cache
 *
 * CRITICAL OPTIMIZATION:
 * This function authenticates all 22 test users during global setup,
 * caching their JWT tokens. This prevents the rate limiting issue (HTTP 429)
 * that was causing ~150 test failures.
 *
 * With this optimization:
 * - Each user authenticates once during setup
 * - Tokens are cached and reused across all tests
 * - Auth API calls reduced by ~95%
 * - Rate limiting errors eliminated
 */
async function preAuthenticateAllUsers(): Promise<void> {
  console.log('\n=== PRE-AUTHENTICATING ALL TEST USERS ===');
  console.log('This prevents rate limiting (HTTP 429) during test execution\n');

  // Initialize the auth cache
  AuthTokenCache.initialize();

  const authEndpoint = `http://localhost:${process.env.PORT || '3101'}/api/v1/auth/login`;
  const userKeys = Object.keys(TEST_USERS) as Array<keyof typeof TEST_USERS>;

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  // Authenticate users sequentially with small delay to avoid overwhelming the server
  for (const userKey of userKeys) {
    const testUser = TEST_USERS[userKey];

    try {
      console.log(`[${successCount + errorCount + 1}/${userKeys.length}] Authenticating ${testUser.username}...`);

      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: testUser.username,
          password: testUser.password
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        errors.push(`${testUser.username}: ${response.status} - ${errorText}`);
        errorCount++;
        console.error(`  ✗ Failed: ${response.status}`);
        continue;
      }

      const authData = await response.json();

      // Cache the token (1 hour expiry)
      AuthTokenCache.setToken(
        testUser.username,
        authData.token,
        3600000, // 1 hour
        authData.user.id,
        authData.refreshToken
      );

      successCount++;
      console.log(`  ✓ Cached token for ${testUser.username}`);

      // Small delay to avoid overwhelming the auth endpoint
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (error) {
      errors.push(`${testUser.username}: ${error instanceof Error ? error.message : String(error)}`);
      errorCount++;
      console.error(`  ✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log(`\n=== PRE-AUTHENTICATION COMPLETE ===`);
  console.log(`✓ Successfully cached: ${successCount}/${userKeys.length} users`);
  if (errorCount > 0) {
    console.log(`✗ Failed: ${errorCount}/${userKeys.length} users`);
    console.log('\nFailed authentications:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  // Display cache statistics
  const stats = AuthTokenCache.getStats();
  console.log(`\nAuth Cache Statistics:`);
  console.log(`  Total tokens: ${stats.totalTokens}`);
  console.log(`  Valid tokens: ${stats.validTokens}`);
  console.log(`  Expired tokens: ${stats.expiredTokens}`);
  console.log(`  Cache file: ${AuthTokenCache.getCacheFilePath()}`);
  console.log('=====================================\n');

  // If more than 50% failed, throw error
  if (errorCount > userKeys.length / 2) {
    throw new Error(`Pre-authentication failed for majority of users (${errorCount}/${userKeys.length}). Check authentication endpoint and credentials.`);
  }
}

/**
 * ✅ PHASE 7 FIX: Frontend server recovery function
 * Automatically restarts the frontend server when crashes are detected
 */
async function recoverFrontendServer(): Promise<void> {
  console.log('[Recovery] 🔧 Starting frontend server recovery...');

  try {
    // Step 1: Kill existing frontend process if it exists
    if (frontendProcess && !frontendProcess.killed) {
      console.log('[Recovery] Terminating existing frontend process...');
      frontendProcess.kill('SIGTERM');

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Force kill if still running
      if (!frontendProcess.killed) {
        console.log('[Recovery] Force killing frontend process...');
        frontendProcess.kill('SIGKILL');
      }
    }

    // Step 2: Clean up PID file
    const frontendPidFile = path.join(__dirname, '.e2e-frontend-pid');
    if (fs.existsSync(frontendPidFile)) {
      fs.unlinkSync(frontendPidFile);
    }

    // Step 3: Wait a moment for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Restart frontend server
    console.log('[Recovery] Restarting frontend server...');
    await startFrontendServer();

    // Step 5: Wait for frontend to be ready
    const frontendUrl = `http://localhost:${process.env.FRONTEND_PORT}`;
    await waitForServer(frontendUrl);

    console.log('[Recovery] ✅ Frontend server recovery completed successfully');

  } catch (error) {
    console.error('[Recovery] ❌ Frontend server recovery failed:', error);
    throw new Error(`Frontend server recovery failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * ✅ PHASE 6F FIX: Initialize database reference counting
 * Prevents authentication failures caused by premature database dropping
 */
async function initializeDatabaseReferenceCount(projectName: string, databaseName: string): Promise<void> {
  const lockFile = path.join(process.cwd(), 'test-results', `${projectName}-db-lock.json`);

  try {
    // Ensure test-results directory exists
    const dir = path.dirname(lockFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Read existing reference count or initialize
    let refCount = 1;
    if (fs.existsSync(lockFile)) {
      try {
        const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf-8'));
        refCount = (lockData.refCount || 0) + 1;
      } catch (error) {
        // File corrupted, initialize fresh
        console.warn(`[Database Setup] Lock file corrupted for ${projectName}, initializing fresh reference count`);
        refCount = 1;
      }
    }

    // Write updated reference count
    const lockData = {
      refCount,
      databaseName,
      lastUpdate: new Date().toISOString(),
      createdBy: process.pid
    };

    fs.writeFileSync(lockFile, JSON.stringify(lockData, null, 2));
    console.log(`[Database Setup] ✅ Initialized reference count for ${projectName}: ${refCount} references`);

  } catch (error) {
    console.error(`[Database Setup] Failed to initialize reference count for ${projectName}:`, error);
    // Continue anyway - worst case we might have a premature cleanup
  }
}

/**
 * Safe logging that won't crash on EPIPE errors during parallel execution
 */
function safeLog(message: string): void {
  try {
    console.log(message);
  } catch (error: any) {
    // Silently ignore ALL console/stdout errors during parallel execution
    // This includes EPIPE, ECONNRESET, broken pipes, and any write errors
    // Just return silently - parallel test execution causes these conflicts
    return;
  }
}

export default globalSetup;