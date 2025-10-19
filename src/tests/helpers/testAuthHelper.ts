import { Page, expect } from '@playwright/test';

/**
 * Test Authentication Helper
 * Provides reliable authentication setup for E2E tests
 */

export interface TestUser {
  username: string;
  password: string;
  email: string;
  roles: string[];
  permissions: string[];
}

export const TEST_USERS = {
  admin: {
    username: 'admin',
    password: 'password123',
    email: 'admin@mes.com',
    roles: ['Plant Manager', 'System Administrator'],
    permissions: [
      'workorders.read', 'workorders.write', 'workorders.delete',
      'quality.read', 'quality.write',
      'traceability.read', 'traceability.write',
      'equipment.read', 'equipment.write',
      'users.read', 'users.write'
    ]
  },
  qualityEngineer: {
    username: 'jane.smith',
    password: 'password123',
    email: 'jane.smith@mes.com',
    roles: ['Quality Engineer'],
    permissions: ['workorders.read', 'quality.read', 'quality.write', 'traceability.read']
  },
  operator: {
    username: 'john.doe',
    password: 'password123',
    email: 'john.doe@mes.com',
    roles: ['Production Operator'],
    permissions: ['workorders.read']
  }
} as const;

/**
 * Set up authentication for E2E tests by directly setting localStorage
 * This bypasses the complex async auth flow and provides immediate authentication
 */
export async function setupTestAuth(page: Page, user: keyof typeof TEST_USERS = 'admin'): Promise<void> {
  const testUser = TEST_USERS[user];
  
  console.log(`[TEST AUTH] Setting up authentication for user: ${testUser.username}`);
  
  // Set test mode marker
  await page.addInitScript(() => {
    (window as any).__E2E_TEST_MODE = true;
  });
  
  // First, get a valid auth token by logging in through the API
  // Support three modes:
  // 1. Direct Auth Service: Use AUTH_SERVICE_URL if set (for microservice testing)
  // 2. E2E Test: Use frontend proxy on port 5278 (realistic browser flow)
  // 3. Development: Use frontend proxy on port 5178
  const authServiceURL = process.env.AUTH_SERVICE_URL;
  const isE2ETest = process.env.NODE_ENV === 'test' || process.env.FRONTEND_PORT === '5278';
  const frontendURL = isE2ETest ? 'http://localhost:5278' : 'http://localhost:5178';

  // Prefer direct Auth Service URL if specified, otherwise use frontend proxy
  const baseURL = authServiceURL || frontendURL;
  const authEndpoint = authServiceURL
    ? `${authServiceURL}/api/v1/auth/login`  // Direct to Auth Service
    : `${baseURL}/api/v1/auth/login`;        // Through frontend proxy

  console.log(`[TEST AUTH] Using auth endpoint: ${authEndpoint}`);

  const response = await page.request.post(authEndpoint, {
    data: {
      username: testUser.username,
      password: testUser.password
    }
  });
  
  if (!response.ok()) {
    const errorText = await response.text().catch(() => 'No error details');
    console.error(`[TEST AUTH] Authentication failed for ${testUser.username}:`);
    console.error(`  Status: ${response.status()}`);
    console.error(`  Error: ${errorText}`);
    
    // For test resilience, provide more context about the failure
    if (response.status() === 404) {
      throw new Error(`Authentication API not available (404). Ensure the backend server is running at the correct URL.`);
    } else if (response.status() === 500) {
      throw new Error(`Authentication server error (500). Check backend logs for details.`);
    } else {
      throw new Error(`Failed to authenticate test user ${testUser.username}: ${response.status()} - ${errorText}`);
    }
  }
  
  const authData = await response.json();
  
  // Create the auth state object that matches Zustand persistence format
  const authState = {
    state: {
      token: authData.token,
      refreshToken: authData.refreshToken,
      user: {
        id: authData.user.id,
        username: testUser.username,
        email: testUser.email,
        roles: testUser.roles,
        permissions: testUser.permissions,
        isActive: true  // Ensure test users are always active
      }
    },
    version: 0
  };
  
  // Set the auth state in localStorage before navigation
  await page.addInitScript((authStateString) => {
    localStorage.setItem('mes-auth-storage', authStateString);
    console.log('[TEST AUTH] Auth state set in localStorage');
  }, JSON.stringify(authState));
  
  console.log(`[TEST AUTH] Authentication setup complete for ${testUser.username}`);
}

/**
 * Wait for authentication to be fully loaded in the app
 */
export async function waitForAuthReady(page: Page, timeout: number = 10000): Promise<void> {
  console.log('[TEST AUTH] Waiting for auth to be ready...');
  
  // Wait for the auth store to initialize and not show loading
  await page.waitForFunction(() => {
    const authStorage = localStorage.getItem('mes-auth-storage');
    if (!authStorage) return false;
    
    try {
      const parsed = JSON.parse(authStorage);
      return !!(parsed.state?.token && parsed.state?.user);
    } catch {
      return false;
    }
  }, { timeout });
  
  console.log('[TEST AUTH] Auth is ready');
}

/**
 * Navigate to a protected route and wait for it to load
 */
export async function navigateAuthenticated(page: Page, route: string, user: keyof typeof TEST_USERS = 'admin'): Promise<void> {
  await setupTestAuth(page, user);
  await page.goto(route);
  await waitForAuthReady(page);
  
  // Wait a moment for React to process the auth state
  await page.waitForTimeout(1000);
  
  // Verify we're not redirected to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login')) {
    // Check if there's an error message on the login page
    const errorMessage = await page.locator('.ant-alert-error').textContent().catch(() => null);
    const authState = await page.evaluate(() => {
      const authData = localStorage.getItem('mes-auth-storage');
      try {
        const parsed = authData ? JSON.parse(authData) : null;
        return parsed?.state || null;
      } catch {
        return null;
      }
    });
    
    let errorDetails = `Authentication failed - redirected to login when accessing ${route}`;
    if (errorMessage) {
      errorDetails += `\n  Login error: ${errorMessage}`;
    }
    if (authState) {
      errorDetails += `\n  Auth state exists but login redirect occurred`;
      errorDetails += `\n  Token present: ${!!authState.token}`;
      errorDetails += `\n  User present: ${!!authState.user}`;
    } else {
      errorDetails += `\n  No auth state found in localStorage`;
    }
    
    throw new Error(errorDetails);
  }
}

/**
 * Verify user has required permissions for a route
 */
export function checkUserPermissions(user: keyof typeof TEST_USERS, requiredPermissions: string[]): boolean {
  const testUser = TEST_USERS[user];
  return requiredPermissions.every(permission => 
    testUser.permissions.includes(permission) || testUser.permissions.includes('*')
  );
}

/**
 * Clear authentication state - useful for testing unauthenticated scenarios
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('mes-auth-storage');
    (window as any).__E2E_TEST_MODE = false;
  });
}

/**
 * Assert that user is authenticated and has proper state
 */
export async function assertAuthenticated(page: Page): Promise<void> {
  const authState = await page.evaluate(() => {
    const authStorage = localStorage.getItem('mes-auth-storage');
    if (!authStorage) return null;
    
    try {
      return JSON.parse(authStorage);
    } catch {
      return null;
    }
  });
  
  expect(authState).toBeTruthy();
  expect(authState.state.token).toBeTruthy();
  expect(authState.state.user).toBeTruthy();
}