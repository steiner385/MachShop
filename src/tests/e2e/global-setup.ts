import { chromium, FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { AuthTokenCache } from '../helpers/authCache';
import { TEST_USERS } from '../helpers/testAuthHelper';
import { ServerHealthMonitor } from '../helpers/serverHealthMonitor';

// Global variables to track server processes
let backendProcess: ChildProcess | null = null;
let frontendProcess: ChildProcess | null = null;

// Server health monitor instance
export let healthMonitor: ServerHealthMonitor | null = null;

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

async function globalSetup(config: FullConfig) {
  console.log('Starting global setup for E2E tests...');

  // Clean up any zombie processes and occupied ports from previous test runs
  await cleanupTestPorts();

  // Load E2E environment variables
  loadE2EEnvironment();

  // Setup test database
  await setupTestDatabase();
  
  // Start E2E-specific servers
  await startE2EServers();
  
  // Wait for servers to be ready
  await waitForServer('http://localhost:3101/health');
  await waitForServer('http://localhost:5278');

  // Start server health monitoring
  console.log('Starting server health monitoring...');
  healthMonitor = ServerHealthMonitor.getInstance();
  healthMonitor.startMonitoring(() => {
    console.error('[Global Setup] ⚠️  Server crash detected by health monitor!');
    const summary = healthMonitor?.getHealthSummary();
    console.error('[Global Setup] Health Summary:', JSON.stringify(summary, null, 2));
    const latestMetrics = healthMonitor?.getLatestMetrics();
    if (latestMetrics) {
      console.error('[Global Setup] Latest Metrics:', {
        status: latestMetrics.status,
        backendAvailable: latestMetrics.backendHealth.available,
        frontendAvailable: latestMetrics.frontendHealth.available,
        backendError: latestMetrics.backendHealth.error,
        frontendError: latestMetrics.frontendHealth.error,
      });
    }
  });
  console.log('Server health monitoring started (checking every 30 seconds)');

  // Create test users and initial data
  await seedTestData();
  
  // Authenticate and save storage state for reuse
  await authenticateTestUser();

  // Pre-authenticate all test users to populate auth cache and prevent rate limiting
  await preAuthenticateAllUsers();

  console.log('Global setup completed.');
}

function loadE2EEnvironment() {
  console.log('Loading E2E environment configuration...');
  
  // Load E2E-specific environment variables
  const envPath = path.join(process.cwd(), '.env.e2e');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          process.env[key.trim()] = value.trim().replace(/['"]/g, '');
        }
      }
    }
  }
  
  // Override key environment variables for E2E
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3101';
  process.env.FRONTEND_PORT = '5278';
  process.env.DATABASE_URL = 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';
  
  console.log('E2E environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    FRONTEND_PORT: process.env.FRONTEND_PORT,
    DATABASE_URL: process.env.DATABASE_URL.split('@')[1] // Hide credentials
  });
}

async function startE2EServers() {
  console.log('Starting E2E-specific servers...');
  
  // Start backend server on port 3101
  await startBackendServer();
  
  // Start frontend server on port 5278
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
    console.log('Starting E2E backend server on port 3101...');

    backendProcess = spawn('npm', ['run', 'e2e:server'], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let serverStarted = false;

    backendProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[E2E Backend] ${output.trim()}`);
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
    const startTime = Date.now();
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3101/health');
        if (response.ok && !serverStarted) {
          serverStarted = true;
          clearInterval(pollInterval);
          console.log('E2E backend server is ready');
          resolve();
        }
      } catch (error) {
        // Server not ready yet, keep polling
      }

      // Timeout after 60 seconds
      if (Date.now() - startTime > 60000 && !serverStarted) {
        clearInterval(pollInterval);
        reject(new Error('E2E backend server failed to start within 60 seconds'));
      }
    }, 1000);
  });
}

async function startFrontendServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting E2E frontend server on port 5278...');

    frontendProcess = spawn('npm', ['run', 'e2e:frontend'], {
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: false
    });

    let serverStarted = false;

    frontendProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log(`[E2E Frontend] ${output.trim()}`);
      
      if ((output.includes('Local:') && output.includes('5278')) && !serverStarted) {
        serverStarted = true;
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

async function setupTestDatabase() {
  console.log('Setting up E2E test database...');
  
  try {
    // Create E2E test database if it doesn't exist
    try {
      execSync('PGPASSWORD=mes_password createdb -U mes_user -h localhost mes_e2e_db', { 
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });
      console.log('E2E test database created');
    } catch (error) {
      // Database might already exist
      console.log('E2E test database already exists or connection issue');
    }
    
    // Run migrations on E2E test database
    const e2eDatabaseUrl = 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';
    execSync(`DATABASE_URL="${e2eDatabaseUrl}" npx prisma migrate deploy`, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl }
    });
    
    console.log('E2E test database migrations completed');
  } catch (error) {
    console.error('Failed to setup E2E test database:', error);
    throw error;
  }
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

async function seedTestData() {
  console.log('Seeding E2E test data...');
  
  try {
    // Clear existing test data before seeding
    await clearTestData();
    
    // Seed E2E test database with test data
    const e2eDatabaseUrl = 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';
    execSync(`DATABASE_URL="${e2eDatabaseUrl}" tsx prisma/seed.ts`, { 
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: e2eDatabaseUrl }
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
    const e2eDatabaseUrl = 'postgresql://mes_user:mes_password@localhost:5432/mes_e2e_db?schema=public';
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
    baseURL: 'http://localhost:5278'
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
      
      // Wait for dashboard to load
      await page.waitForLoadState('networkidle');
      console.log('Dashboard navigation completed, URL:', page.url());
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

  const authEndpoint = 'http://localhost:3101/api/v1/auth/login';
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

export default globalSetup;