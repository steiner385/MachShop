import { Page, expect } from '@playwright/test';

/**
 * Test Authentication Helper
 * Provides reliable authentication setup for E2E tests
 */

export interface TestUser {
  readonly username: string;
  readonly password: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export const TEST_USERS = {
  // Legacy test users (kept for backward compatibility)
  admin: {
    username: 'admin',
    password: 'password123',
    email: 'admin@mes.com',
    roles: ['Plant Manager', 'System Administrator'],
    permissions: [
      'workorders.read', 'workorders.write', 'workorders.create', 'workorders.update', 'workorders.delete', 'workorders.release',
      'quality.read', 'quality.write',
      'traceability.read', 'traceability.write',
      'equipment.read', 'equipment.write',
      'users.read', 'users.write',
      'materials.read', 'materials.write',
      'scheduling.read', 'scheduling.write',
      'workinstructions.read', 'workinstructions.write', 'workinstructions.create', 'workinstructions.execute'
    ]
  },
  qualityEngineer: {
    username: 'jane.smith',
    password: 'password123',
    email: 'jane.smith@mes.com',
    roles: ['Quality Engineer'],
    permissions: ['workorders.read', 'quality.read', 'quality.write', 'traceability.read', 'fai.read', 'fai.write', 'fai.approve', 'ncr.read', 'ncr.write', 'ncr.close', 'signatures.read', 'signatures.write']
  },
  operator: {
    username: 'john.doe',
    password: 'password123',
    email: 'john.doe@mes.com',
    roles: ['Production Operator'],
    permissions: ['workorders.read', 'workinstructions.read', 'workinstructions.execute']
  },

  // Tier 1: Production Roles (P0 - Critical)
  productionOperator: {
    username: 'prod.operator',
    password: 'password123',
    email: 'prod.operator@mes.com',
    roles: ['Production Operator'],
    permissions: ['workorders.read', 'workinstructions.read', 'workinstructions.execute', 'equipment.read']
  },
  productionSupervisor: {
    username: 'prod.supervisor',
    password: 'password123',
    email: 'prod.supervisor@mes.com',
    roles: ['Production Supervisor'],
    permissions: ['workorders.read', 'workorders.write', 'workorders.assign', 'personnel.read', 'personnel.assign', 'workinstructions.read', 'equipment.read', 'materials.read']
  },
  productionPlanner: {
    username: 'prod.planner',
    password: 'password123',
    email: 'prod.planner@mes.com',
    roles: ['Production Planner'],
    permissions: ['workorders.read', 'workorders.create', 'scheduling.read', 'scheduling.write', 'capacity.read', 'routings.read', 'bom.read', 'materials.read']
  },
  productionScheduler: {
    username: 'prod.scheduler',
    password: 'password123',
    email: 'prod.scheduler@mes.com',
    roles: ['Production Scheduler'],
    permissions: ['workorders.read', 'workorders.priority', 'scheduling.read', 'scheduling.write', 'equipment.read', 'materials.read', 'capacity.read']
  },
  manufacturingEngineer: {
    username: 'mfg.engineer',
    password: 'password123',
    email: 'mfg.engineer@mes.com',
    roles: ['Manufacturing Engineer'],
    permissions: ['routings.read', 'routings.write', 'routings.delete', 'bom.read', 'bom.write', 'processSegments.read', 'processSegments.write', 'workorders.read', 'quality.read', 'equipment.read']
  },

  // Tier 2: Quality & Compliance (P1 - High)
  qualityEngineerFull: {
    username: 'quality.engineer',
    password: 'password123',
    email: 'quality.engineer@mes.com',
    roles: ['Quality Engineer'],
    permissions: ['workorders.read', 'quality.read', 'quality.write', 'fai.read', 'fai.write', 'fai.approve', 'ncr.read', 'ncr.write', 'ncr.close', 'signatures.read', 'signatures.write', 'traceability.read', 'inspections.read', 'inspections.approve']
  },
  qualityInspector: {
    username: 'quality.inspector',
    password: 'password123',
    email: 'quality.inspector@mes.com',
    roles: ['Quality Inspector'],
    permissions: ['workorders.read', 'quality.read', 'inspections.read', 'inspections.write', 'fai.read', 'fai.execute', 'ncr.read', 'ncr.write', 'signatures.read', 'signatures.write', 'traceability.read']
  },
  dcmaInspector: {
    username: 'dcma.inspector',
    password: 'password123',
    email: 'dcma.inspector@mes.com',
    roles: ['DCMA Inspector'],
    permissions: ['workorders.read', 'quality.read', 'fai.read', 'ncr.read', 'signatures.read', 'traceability.read', 'audit.read', 'audit.export']
  },
  processEngineer: {
    username: 'process.engineer',
    password: 'password123',
    email: 'process.engineer@mes.com',
    roles: ['Process Engineer'],
    permissions: ['workorders.read', 'quality.read', 'spc.read', 'spc.write', 'processImprovement.read', 'processImprovement.write', 'yield.read', 'yield.write', 'capability.read', 'capability.write', 'equipment.read']
  },

  // Tier 3: Materials & Logistics (P1 - High)
  warehouseManager: {
    username: 'warehouse.manager',
    password: 'password123',
    email: 'warehouse.manager@mes.com',
    roles: ['Warehouse Manager'],
    permissions: ['inventory.read', 'inventory.write', 'materials.read', 'materials.write', 'warehouse.read', 'warehouse.write', 'cycleCounts.read', 'cycleCounts.write', 'adjustments.approve']
  },
  materialsHandler: {
    username: 'materials.handler',
    password: 'password123',
    email: 'materials.handler@mes.com',
    roles: ['Materials Handler'],
    permissions: ['workorders.read', 'materials.read', 'materials.move', 'inventory.read', 'inventory.update', 'cycleCounts.read', 'cycleCounts.execute']
  },
  shippingReceivingSpecialist: {
    username: 'shipping.specialist',
    password: 'password123',
    email: 'shipping.specialist@mes.com',
    roles: ['Shipping/Receiving Specialist'],
    permissions: ['shipments.read', 'shipments.write', 'receiving.read', 'receiving.write', 'carriers.read', 'carriers.write', 'packingLists.read', 'packingLists.write', 'workorders.read', 'materials.read']
  },
  logisticsCoordinator: {
    username: 'logistics.coordinator',
    password: 'password123',
    email: 'logistics.coordinator@mes.com',
    roles: ['Logistics Coordinator'],
    permissions: ['logistics.read', 'logistics.write', 'shipments.read', 'shipments.write', 'tracking.read', 'tracking.write', 'carriers.read', 'workorders.read', 'inventory.read']
  },

  // Tier 4: Maintenance & Equipment (P2 - Medium)
  maintenanceTechnician: {
    username: 'maint.technician',
    password: 'password123',
    email: 'maint.technician@mes.com',
    roles: ['Maintenance Technician'],
    permissions: ['equipment.read', 'equipment.write', 'maintenance.read', 'maintenance.execute', 'pmScheduling.read', 'workorders.read']
  },
  maintenanceSupervisor: {
    username: 'maint.supervisor',
    password: 'password123',
    email: 'maint.supervisor@mes.com',
    roles: ['Maintenance Supervisor'],
    permissions: ['equipment.read', 'equipment.write', 'maintenance.read', 'maintenance.write', 'pmScheduling.read', 'pmScheduling.write', 'workRequests.approve', 'spareParts.read', 'spareParts.write', 'workorders.read']
  },

  // Tier 5: Administration (P2 - Medium)
  plantManager: {
    username: 'plant.manager',
    password: 'password123',
    email: 'plant.manager@mes.com',
    roles: ['Plant Manager'],
    permissions: ['workorders.read', 'quality.read', 'equipment.read', 'materials.read', 'personnel.read', 'reports.read', 'reports.write', 'kpi.read', 'capex.approve', 'traceability.read', 'audit.read']
  },
  systemAdministrator: {
    username: 'sys.admin',
    password: 'password123',
    email: 'sys.admin@mes.com',
    roles: ['System Administrator'],
    permissions: ['users.read', 'users.write', 'roles.read', 'roles.write', 'permissions.read', 'permissions.write', 'system.config', 'audit.read', 'integrations.read', 'integrations.write']
  },
  superuser: {
    username: 'superuser',
    password: 'password123',
    email: 'superuser@mes.com',
    roles: ['Superuser'],
    permissions: ['*', 'bypass.validations', 'impersonate.*', 'force.status', 'audit.read']
  },
  inventoryControlSpecialist: {
    username: 'inventory.specialist',
    password: 'password123',
    email: 'inventory.specialist@mes.com',
    roles: ['Inventory Control Specialist'],
    permissions: ['inventory.read', 'inventory.write', 'cycleCounts.read', 'cycleCounts.write', 'adjustments.read', 'adjustments.write', 'minmax.read', 'minmax.write', 'mrp.read', 'mrp.write', 'materials.read']
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
  const permissions = testUser.permissions as unknown as string[];
  return requiredPermissions.every(permission =>
    permissions.includes(permission) || permissions.includes('*')
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

/**
 * Login as test user and return auth headers for API requests
 * Used for API-level E2E tests with Playwright request context
 */
export async function loginAsTestUser(
  request: any,
  user: keyof typeof TEST_USERS = 'admin'
): Promise<Record<string, string>> {
  const testUser = TEST_USERS[user];

  const loginResponse = await request.post('/api/v1/auth/login', {
    data: {
      username: testUser.username,
      password: testUser.password
    }
  });

  expect(loginResponse.ok()).toBeTruthy();
  const authData = await loginResponse.json();
  expect(authData.token).toBeTruthy();

  return {
    'Authorization': `Bearer ${authData.token}`,
    'Content-Type': 'application/json'
  };
}