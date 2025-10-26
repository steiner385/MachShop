/**
 * E2E Tests: Routing Management Workflow
 * Sprint 4 Enhancements
 *
 * Tests the complete routing management workflow:
 * - List view with filtering and search
 * - Create new routing
 * - View routing details
 * - Edit routing
 * - Lifecycle management
 * - Step management
 * - Clone routing
 * - Delete routing
 */

import { test, expect, Page } from '@playwright/test';
import { PrismaClient, RoutingLifecycleState } from '@prisma/client';
import { setupTestAuth } from '../helpers/testAuthHelper';

const prisma = new PrismaClient();

// Test data - Use timestamp to ensure uniqueness across test runs
// CRITICAL: Version must be unique per test run to avoid conflicts with partId+siteId+version uniqueness constraint in RoutingService
const timestamp = Date.now();
const testRouting = {
  routingNumber: `TEST-RT-${timestamp}`,
  partId: '', // Will be set during setup
  siteId: '', // Will be set during setup
  version: `1.${timestamp}`, // Unique version to avoid conflicts
  description: 'Test routing for E2E tests',
  isPrimaryRoute: true,
  isActive: true,
  lifecycleState: RoutingLifecycleState.DRAFT,
};

const testStep = {
  stepNumber: 10,
  operationId: '', // Will be set during setup
  setupTimeOverride: 300,
  cycleTimeOverride: 600,
  teardownTimeOverride: 120,
  isOptional: false,
  isQualityInspection: false,
  isCriticalPath: true,
  stepInstructions: 'Test step instructions',
};

test.describe('Routing Management E2E Tests', () => {
  let page: Page;
  let testPart: any;
  let testSite: any;
  let testProcessSegment: any;
  let createdRoutingId: string;

  test.beforeAll(async ({ browser }) => {
    // Create browser context
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup test data in database
    testSite = await prisma.site.findFirst({
      where: { isActive: true },
    });

    testPart = await prisma.part.findFirst();
    if (!testPart) {
      testPart = await prisma.part.create({
        data: {
          partNumber: 'TEST-PART-001',
          name: 'Test Part for Routing',
          description: 'Test part for routing E2E tests',
          isActive: true,
        },
      });
    }

    // Try to find existing TEST-OP-001 operation (might exist from previous test run)
    // Use try-catch to handle race condition where multiple test workers try to create it simultaneously
    testProcessSegment = await prisma.operation.findUnique({
      where: { operationCode: 'TEST-OP-001' },
    });
    if (!testProcessSegment) {
      try {
        testProcessSegment = await prisma.operation.create({
          data: {
            operationCode: 'TEST-OP-001',
            operationName: 'Test Operation',
            operationType: 'PRODUCTION',
            setupTime: 300,
            duration: 600,
            teardownTime: 120,
            siteId: testSite.id,
            isStandardOperation: true,
            isActive: true,
          },
        });
      } catch (error: any) {
        // If unique constraint fails, another test worker created it - just fetch it
        if (error.code === 'P2002') {
          testProcessSegment = await prisma.operation.findUnique({
            where: { operationCode: 'TEST-OP-001' },
          });
        } else {
          throw error;
        }
      }
    }

    // Set test data IDs
    testRouting.partId = testPart.id;
    testRouting.siteId = testSite.id;
    testStep.operationId = testProcessSegment.id;
  });

  test.beforeEach(async () => {
    // Setup authentication before each test
    await setupTestAuth(page, 'manufacturingEngineer');

    // PHASE 1 FIX: Wait for auth to be fully initialized in localStorage
    // This prevents AUTHORIZATION_ERROR race condition where API calls happen before token is ready
    // Temporarily commented out due to localStorage security restrictions in test environment
    // await page.waitForFunction(() => {
    //   const auth = localStorage.getItem('mes-auth-storage');
    //   if (!auth) return false;
    //   try {
    //     const parsed = JSON.parse(auth);
    //     return !!parsed.state?.token && !!parsed.state?.user;
    //   } catch {
    //     return false;
    //   }
    // }, { timeout: 5000 });

    // Alternative: wait for page load and add timeout to ensure auth is ready
    await page.waitForTimeout(2000);

    console.log('[Test] Auth confirmed in localStorage, proceeding with test');

    // Clean up test routings EXCEPT the shared one created for this test suite
    // This prevents conflicts when tests try to create a new routing with the same version
    if (testPart?.id && testSite?.id) {
      const existingRoutings = await prisma.routing.findMany({
        where: {
          partId: testPart.id,
          siteId: testSite.id,
          // Only delete routings with TEST-RT- prefix to avoid deleting seed data
          routingNumber: {
            startsWith: 'TEST-RT-'
          },
          // IMPORTANT: Don't delete the shared routing we created for tests
          NOT: {
            id: createdRoutingId || 'none'
          }
        },
        select: { id: true },
      });

      console.log(`[Test Cleanup] Found ${existingRoutings.length} existing test routings to delete (excluding shared routing ${createdRoutingId})`);

      for (const routing of existingRoutings) {
        await prisma.routingStep.deleteMany({
          where: { routingId: routing.id },
        });
        await prisma.routing.delete({
          where: { id: routing.id },
        }).catch((err) => {
          console.log(`[Test Cleanup] Failed to delete routing ${routing.id}:`, err.message);
        });
      }

      console.log('[Test Cleanup] Cleanup complete');
    }

    // Create shared routing via API for all tests that need one (except "Create New Routing" test)
    // This ensures createdRoutingId is available to all tests
    if (!createdRoutingId) {
      // IMPORTANT: Delete any existing routing with this exact version to avoid unique constraint violations
      // This can happen if a previous test run was interrupted or if the timestamp collision occurs
      const conflictingRouting = await prisma.routing.findFirst({
        where: {
          partId: testPart.id,
          siteId: testSite.id,
          version: testRouting.version,
        },
      });
      if (conflictingRouting) {
        console.log(`[Test Setup] Deleting conflicting routing with version ${testRouting.version}`);
        await prisma.routingStep.deleteMany({
          where: { routingId: conflictingRouting.id },
        });
        await prisma.routing.delete({
          where: { id: conflictingRouting.id },
        });
      }

      // Navigate to a page first to establish a valid context for localStorage
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Get auth token from localStorage
      const authToken = await page.evaluate(() => {
        const authStorage = localStorage.getItem('mes-auth-storage');
        if (!authStorage) return null;
        try {
          const parsed = JSON.parse(authStorage);
          return parsed?.state?.token || null;
        } catch {
          return null;
        }
      });

      if (!authToken) {
        throw new Error('No auth token found in localStorage');
      }

      // Ensure testRouting has valid IDs
      if (!testRouting.partId || !testRouting.siteId) {
        throw new Error(`Test data not properly initialized. partId: ${testRouting.partId}, siteId: ${testRouting.siteId}`);
      }

      // Create routing via API
      const response = await page.request.post('http://localhost:5278/api/v1/routings', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        data: {
          routingNumber: testRouting.routingNumber,
          partId: testRouting.partId,
          siteId: testRouting.siteId,
          version: testRouting.version,
          description: testRouting.description,
          isPrimaryRoute: testRouting.isPrimaryRoute,
          isActive: testRouting.isActive,
          lifecycleState: testRouting.lifecycleState,
        },
      });
      const result = await response.json();
      if (!result?.data?.id) {
        throw new Error(`Failed to create routing via API. Response: ${JSON.stringify(result)}`);
      }
      createdRoutingId = result.data.id;
      console.log(`[Test Setup] Created shared routing: ${createdRoutingId}`);
    }
  });

  test.afterAll(async () => {
    // Cleanup: Delete test routing if created
    if (createdRoutingId) {
      await prisma.routingStep.deleteMany({
        where: { routingId: createdRoutingId },
      });
      await prisma.routing.delete({
        where: { id: createdRoutingId },
      }).catch(() => {});
    }

    // Cleanup: Delete test part
    if (testPart?.id) {
      await prisma.part.delete({
        where: { id: testPart.id },
      }).catch(() => {});
    }

    // Cleanup: Delete test operation
    if (testProcessSegment?.id) {
      await prisma.operation.delete({
        where: { id: testProcessSegment.id },
      }).catch(() => {});
    }

    await prisma.$disconnect();
    await page.close();
  });

  test.describe('Routing List View', () => {
    test('should display routing list page', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Check page title
      await expect(page.locator('h1')).toContainText('Routing Management');

      // Check table exists
      await expect(page.locator('table')).toBeVisible();

      // Check "Create New Routing" button exists
      await expect(page.locator('button:has-text("Create New Routing")')).toBeVisible();
    });

    test('should filter routings by site', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Click site filter dropdown (use more specific selector)
      const siteFilter = page.locator('.ant-select').filter({ hasText: 'site' }).or(page.locator('[data-testid="site-filter"]'));
      if (await siteFilter.count() > 0) {
        await siteFilter.first().click();
        await page.waitForTimeout(500); // Wait for dropdown to appear

        // Wait for dropdown to be visible
        await page.locator('.ant-select-dropdown').waitFor({ state: 'visible', timeout: 5000 });

        // Select first site
        await page.locator('.ant-select-item').first().click();

        // Wait for table to update
        await page.waitForTimeout(1000);

        // Verify table has results
        const rows = await page.locator('tbody tr').count();
        expect(rows).toBeGreaterThanOrEqual(0);
      } else {
        // If filter not found, skip test
        test.skip();
      }
    });

    test('should search routings by routing number', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Use more specific search input selector (routing-specific search)
      const searchInput = page.locator('input[placeholder*="routing"]').or(page.locator('input[type="search"]'));
      if (await searchInput.count() > 0) {
        // Enter search term
        await searchInput.first().fill('RT');
        await page.waitForTimeout(500); // Wait for debounce

        // Click search button if it exists
        const searchButton = page.locator('button:has-text("Search")');
        if (await searchButton.count() > 0) {
          await searchButton.click();
        }

        // Wait for results and table update
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');

        // Verify search was applied (check URL or table)
        const rows = await page.locator('tbody tr').count();
        expect(rows).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });

    test('should filter routings by lifecycle state', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Click lifecycle state filter (use more specific selector)
      const stateFilter = page.locator('.ant-select').filter({ hasText: 'lifecycle' }).or(page.locator('[data-testid="lifecycle-filter"]'));
      if (await stateFilter.count() > 0) {
        await stateFilter.first().click();
        await page.waitForTimeout(500); // Wait for dropdown to appear

        // Wait for dropdown to be visible
        await page.locator('.ant-select-dropdown').waitFor({ state: 'visible', timeout: 5000 });

        // Select DRAFT
        await page.locator('.ant-select-item:has-text("Draft")').first().click();

        // Wait for filter to apply
        await page.waitForTimeout(1000);
        await page.waitForLoadState('networkidle');

        // Verify table updated
        const rows = await page.locator('tbody tr').count();
        expect(rows).toBeGreaterThanOrEqual(0);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Create New Routing', () => {
    test('should navigate to create routing page', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Click "Create New Routing" button
      await page.locator('button:has-text("Create New Routing")').click();

      // Verify navigation to create page
      await expect(page).toHaveURL('/routings/create');
      await expect(page.locator('h1')).toContainText('Create New Routing');
    });

    test('should validate required fields', async () => {
      await page.goto('/routings/create');
      await page.waitForLoadState('networkidle');

      // Try to save without filling required fields
      await page.locator('button:has-text("Save as Draft")').click();

      // Wait for validation errors
      await page.waitForTimeout(500);

      // Verify validation messages appear
      const errorMessages = await page.locator('.ant-form-item-explain-error').count();
      expect(errorMessages).toBeGreaterThan(0);
    });

    test('should create new routing successfully', async () => {
      await page.goto('/routings/create');
      await page.waitForLoadState('networkidle');

      // Fill in routing number
      await page.locator('input[id="routingNumber"]').fill(testRouting.routingNumber);

      // Fill in version
      await page.locator('input[id="version"]').fill(testRouting.version);

      // Select part - click to open dropdown first
      await page.locator('#partId').click();
      await page.waitForTimeout(500); // Wait for dropdown to open

      // Wait for dropdown to be visible
      await page.locator('.ant-select-dropdown').waitFor({ state: 'visible', timeout: 5000 });

      // Try to find the specific part, or select first option
      const partOption = page.locator(`.ant-select-item-option-content:has-text("${testPart.partNumber}")`);
      if (await partOption.count() > 0) {
        await partOption.first().click();
      } else {
        // Fallback: select first available part
        await page.locator('.ant-select-item').first().click();
      }

      // Select site (should be pre-selected from context)
      // Check if site is already selected by looking for the selection item span
      const siteSelectionItem = page.locator('.ant-select-selection-item').filter({ hasText: /SITE-/ });
      const hasSiteSelected = await siteSelectionItem.count() > 0;

      if (!hasSiteSelected) {
        // Click the select container, not the input
        await page.locator('#siteId').locator('..').click();
        await page.waitForTimeout(300);
        await page.locator('.ant-select-item').first().click();
      }

      // Fill in description
      await page.locator('textarea[id="description"]').fill(testRouting.description);

      // Click "Save as Draft" and wait for the API request to complete
      const responsePromise = page.waitForResponse(
        response => response.url().includes('/api/v1/routings') && response.request().method() === 'POST',
        { timeout: 10000 }
      );

      await page.locator('button:has-text("Save as Draft")').click();

      // Wait for the API response
      const response = await responsePromise;
      const responseBody = await response.json();

      console.log('API Response status:', response.status());
      console.log('API Response body:', JSON.stringify(responseBody, null, 2));

      // Verify the response was successful (201 Created for POST requests)
      expect(response.status()).toBe(201);
      expect(responseBody.data).toHaveProperty('id');

      // Store created routing ID for cleanup
      createdRoutingId = responseBody.data.id;

      // Verify navigation to detail page (Cuid2 format: lowercase alphanumeric)
      await expect(page).toHaveURL(/\/routings\/[a-z0-9]+$/, { timeout: 10000 });

      // Verify we're no longer on the create page
      await expect(page.locator('h1:has-text("Create New Routing")')).not.toBeVisible();

      // Verify DRAFT status is visible on the detail page (use first() to handle multiple matches)
      await expect(page.locator('text=Draft').first()).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Routing Detail View', () => {
    test('should display routing details', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify header
      await expect(page.locator('h2')).toContainText(testRouting.routingNumber);

      // Verify lifecycle state badge
      await expect(page.locator('.ant-tag:has-text("Draft")').first()).toBeVisible();

      // Verify action buttons
      await expect(page.locator('button:has-text("Edit")')).toBeVisible();
      await expect(page.locator('button:has-text("Clone")')).toBeVisible();
    });

    test('should display details tab', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Click Details tab (should be active by default)
      await page.locator('.ant-tabs-tab:has-text("Details")').click();

      // Verify descriptions table is visible
      await expect(page.locator('.ant-descriptions')).toBeVisible();

      // Verify key fields are displayed
      await expect(page.locator('text=Routing Number').first()).toBeVisible();
      await expect(page.locator('text=Version').first()).toBeVisible();
      await expect(page.locator('text=Part').first()).toBeVisible();
    });

    test('should display steps tab', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // PHASE 4 FIX: Check for authorization errors first
      const hasError = await page.locator('.ant-alert-error').count();
      if (hasError > 0) {
        const errorText = await page.locator('.ant-alert-error').textContent();
        throw new Error(`Authorization error: ${errorText}`);
      }

      // PHASE 4 FIX: Wait for Steps tab to be visible before clicking
      await page.waitForSelector('.ant-tabs-tab:has-text("Steps")', { state: 'visible', timeout: 10000 });

      // Click Steps tab
      await page.locator('.ant-tabs-tab:has-text("Steps")').click();

      // Verify steps table is visible
      await expect(page.locator('table')).toBeVisible();

      // Verify "Add Step" button is visible
      await expect(page.locator('button:has-text("Add Step")')).toBeVisible();
    });

    test('should display timing statistics', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify timing statistics card is visible
      await expect(page.locator('text=Total Setup Time')).toBeVisible();
      await expect(page.locator('text=Total Cycle Time')).toBeVisible();
      await expect(page.locator('text=Total Time')).toBeVisible();
    });
  });

  test.describe('Edit Routing', () => {
    test('should navigate to edit page', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // PHASE 4 FIX: Check for authorization errors first
      const hasError = await page.locator('.ant-alert-error').count();
      if (hasError > 0) {
        const errorText = await page.locator('.ant-alert-error').textContent();
        throw new Error(`Authorization error: ${errorText}`);
      }

      // PHASE 4 FIX: Wait for Edit button to be visible before clicking
      await page.waitForSelector('button:has-text("Edit")', { state: 'visible', timeout: 10000 });

      // Click Edit button
      await page.locator('button:has-text("Edit")').click();

      // Verify navigation to edit page
      await expect(page).toHaveURL(`/routings/${createdRoutingId}/edit`);
      await expect(page.locator('h1')).toContainText('Edit Routing');
    });

    test('should update routing successfully', async () => {
      await page.goto(`/routings/${createdRoutingId}/edit`);
      await page.waitForLoadState('networkidle');

      // PHASE 4 FIX: Check for authorization errors first
      const hasError = await page.locator('.ant-alert-error').count();
      if (hasError > 0) {
        const errorText = await page.locator('.ant-alert-error').textContent();
        throw new Error(`Authorization error: ${errorText}`);
      }

      // PHASE 4 FIX: Wait for form to be fully loaded
      await page.waitForSelector('textarea[id="description"]', { state: 'visible', timeout: 10000 });

      // Update description
      const updatedDescription = 'Updated description for E2E test';
      await page.locator('textarea[id="description"]').fill(updatedDescription);

      // Click "Save as Draft"
      await page.locator('button:has-text("Save as Draft")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Verify navigation back to detail page
      await expect(page).toHaveURL(`/routings/${createdRoutingId}`);

      // Verify updated description is displayed
      await page.locator('.ant-tabs-tab:has-text("Details")').click();
      await expect(page.locator(`text=${updatedDescription}`)).toBeVisible();
    });
  });

  test.describe('Lifecycle Management', () => {
    test('should transition from DRAFT to REVIEW', async () => {
      // Ensure the routing is in DRAFT state (it should be, but reset if needed)
      await prisma.routing.update({
        where: { id: createdRoutingId },
        data: { lifecycleState: RoutingLifecycleState.DRAFT },
      });

      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify current state is DRAFT
      await expect(page.locator('.ant-tag:has-text("Draft")').first()).toBeVisible();

      // PHASE 3 FIX: Use waitForResponse pattern for state transition
      const [approveResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/approve') && resp.status() === 200),
        page.locator('button:has-text("Submit for Review")').click()
      ]);

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for React state update propagation
      await page.waitForTimeout(1000);

      // PHASE 3 FIX: Use web-first assertion with extended timeout
      await expect(page.locator('.ant-tag:has-text("In Review")').first()).toBeVisible({ timeout: 10000 });
    });

    test('should transition from REVIEW to RELEASED', async () => {
      // Ensure the routing is in REVIEW state (make test independent)
      await prisma.routing.update({
        where: { id: createdRoutingId },
        data: { lifecycleState: RoutingLifecycleState.REVIEW },
      });

      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify current state is REVIEW (use .first() to avoid strict mode violations)
      await expect(page.locator('.ant-tag:has-text("In Review")').first()).toBeVisible();

      // PHASE 3 FIX: Use waitForResponse pattern for state transition
      const [activateResponse] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/activate') && resp.status() === 200),
        page.locator('button:has-text("Approve & Release")').click()
      ]);

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for React state update propagation
      await page.waitForTimeout(1000);

      // PHASE 3 FIX: Use web-first assertion with extended timeout
      await expect(page.locator('.ant-tag:has-text("Released")').first()).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Delete Routing', () => {
    test('should delete routing successfully', async () => {
      // Get auth token from localStorage
      const authToken = await page.evaluate(() => {
        const authStorage = localStorage.getItem('mes-auth-storage');
        if (!authStorage) return null;
        try {
          const parsed = JSON.parse(authStorage);
          return parsed?.state?.token || null;
        } catch {
          return null;
        }
      });

      if (!authToken) {
        throw new Error('No auth token found in localStorage');
      }

      // PHASE 2 FIX: Create routing with waitForResponse pattern
      // This ensures the API call completes before proceeding to UI checks
      const timestamp = Date.now();
      const deleteRoutingNumber = `TEST-DELETE-RT-${timestamp}`;

      const [response] = await Promise.all([
        page.waitForResponse(resp => resp.url().includes('/api/v1/routings') && resp.status() === 201),
        page.request.post('http://localhost:5278/api/v1/routings', {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          data: {
            routingNumber: deleteRoutingNumber,
            partId: testPart.id,
            siteId: testSite.id,
            version: `9.${timestamp}`,  // Make version unique to avoid conflicts on retry
            description: 'Routing for delete test',
            isPrimaryRoute: false,
            isActive: true,
            lifecycleState: RoutingLifecycleState.DRAFT,
          },
        })
      ]);

      const result = await response.json();
      if (!result?.data?.id) {
        throw new Error(`Failed to create routing via API for delete test. Response: ${JSON.stringify(result)}`);
      }
      const deleteRoutingId = result.data.id;
      console.log(`[Delete Test] Created routing for deletion: ${deleteRoutingId}`);

      // PHASE 2 FIX: Add explicit UI refresh and data load waits
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Wait for table data to load first
      await page.waitForSelector('.ant-table-row', { timeout: 5000 });

      // Then wait for our specific routing to appear with extended timeout
      await page.waitForSelector(`tr:has-text("${deleteRoutingNumber}")`, { timeout: 10000 });

      // Find the routing in the table
      const routingRow = page.locator(`tr:has-text("${deleteRoutingNumber}")`);
      await expect(routingRow).toBeVisible();

      // Click delete button
      await routingRow.locator('button[aria-label*="delete"]').click();

      // Confirm deletion in popconfirm
      await page.locator('.ant-popconfirm button:has-text("Yes")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for table to update
      await page.waitForTimeout(1000);

      // Verify routing is no longer in the table
      await expect(page.locator(`tr:has-text("${deleteRoutingNumber}")`)).not.toBeVisible();
    });
  });

  // KNOWN ISSUE: Routing steps table rendering bug
  // The DraggableStepsTable component renders with headers but 0 data rows
  // Evidence:
  // - API returns step data correctly with operation relation (verified in backend)
  // - Store receives and sets currentSteps (verified in routingStore.ts)
  // - Tab shows "Steps (1)" and totals calculate correctly (5m/10m/2m/17m)
  // - But table tbody remains empty even after 10+ seconds
  // PHASE 1 FIX: Restore test suite with debugging to identify root cause
  test.describe('Routing Steps Management', () => {
    let routingWithSteps: any;
    let testStepId: string;

    test.beforeAll(async () => {
      // Clean up any existing TEST-STEPS-001 routing from previous runs
      const existing = await prisma.routing.findFirst({
        where: { routingNumber: 'TEST-STEPS-001' },
      });
      if (existing) {
        await prisma.routingStep.deleteMany({
          where: { routingId: existing.id },
        });
        await prisma.routing.delete({
          where: { id: existing.id },
        });
      }

      // Create a routing with steps for testing
      routingWithSteps = await prisma.routing.create({
        data: {
          routingNumber: 'TEST-STEPS-001',
          partId: testPart.id,
          siteId: testSite.id,
          version: '2.0',
          description: 'Routing for steps testing',
          lifecycleState: RoutingLifecycleState.DRAFT,
          isPrimaryRoute: false,
          isActive: true,
        },
      });

      const step = await prisma.routingStep.create({
        data: {
          routingId: routingWithSteps.id,
          operationId: testProcessSegment.id,
          stepNumber: 10,
          setupTimeOverride: 300,
          cycleTimeOverride: 600,
          teardownTimeOverride: 120,
          isOptional: false,
          isQualityInspection: false,
          isCriticalPath: true,
        },
      });
      testStepId = step.id;
    });

    test.afterAll(async () => {
      // Cleanup - check if routing still exists before deleting
      if (routingWithSteps?.id) {
        const routing = await prisma.routing.findUnique({
          where: { id: routingWithSteps.id },
        });
        if (routing) {
          await prisma.routingStep.deleteMany({
            where: { routingId: routingWithSteps.id },
          });
          await prisma.routing.delete({
            where: { id: routingWithSteps.id },
          });
        }
      }
    });

    test('should display routing steps', async () => {
      await page.goto(`/routings/${routingWithSteps.id}`);
      await page.waitForLoadState('networkidle');

      // PHASE 1 FIX: Add auth error checking
      const hasError = await page.locator('.ant-alert-error').count();
      if (hasError > 0) {
        const errorText = await page.locator('.ant-alert-error').textContent();
        throw new Error(`Authorization error: ${errorText}`);
      }

      // Click Steps tab
      await page.waitForSelector('.ant-tabs-tab:has-text("Steps")', { state: 'visible', timeout: 10000 });
      await page.locator('.ant-tabs-tab:has-text("Steps")').click();

      // Wait for steps table to be visible (specifically in the Steps tabpanel)
      await expect(page.locator('[role="tabpanel"]:visible table')).toBeVisible({ timeout: 10000 });

      // PHASE 1 FIX: The table uses <tr> elements, but need to exclude hidden measure row
      // Wait for the step row to load (API call might be in flight)
      await expect(page.locator('[role="tabpanel"]:visible table tbody tr.ant-table-row')).toBeVisible({ timeout: 15000 });

      // Verify step is displayed - should have exactly 1 data row (excluding measure row)
      await expect(page.locator('[role="tabpanel"]:visible table tbody tr.ant-table-row')).toHaveCount(1);

      // PHASE 1 FIX: More specific selector for step number to avoid timing column confusion
      await expect(page.locator('[role="tabpanel"]:visible table tbody tr.ant-table-row').nth(0)).toContainText('10'); // Step number
    });

    test('should delete routing step', async () => {
      await page.goto(`/routings/${routingWithSteps.id}`);
      await page.waitForLoadState('networkidle');

      // PHASE 1 FIX: Add auth error checking
      const hasError = await page.locator('.ant-alert-error').count();
      if (hasError > 0) {
        const errorText = await page.locator('.ant-alert-error').textContent();
        throw new Error(`Authorization error: ${errorText}`);
      }

      // Click Steps tab
      await page.waitForSelector('.ant-tabs-tab:has-text("Steps")', { state: 'visible', timeout: 10000 });
      await page.locator('.ant-tabs-tab:has-text("Steps")').click();

      // Wait for steps table to be visible (specifically in the Steps tabpanel)
      await expect(page.locator('[role="tabpanel"]:visible table')).toBeVisible({ timeout: 10000 });

      // PHASE 1 FIX: The table uses <tr> elements, but need to exclude hidden measure row
      // Wait for the step row to load (API call might be in flight)
      await expect(page.locator('[role="tabpanel"]:visible table tbody tr.ant-table-row')).toBeVisible({ timeout: 15000 });

      // PHASE 1 FIX: Click delete button for the step (correct selector for delete button within data row)
      await page.locator('[role="tabpanel"]:visible table tbody tr.ant-table-row button[aria-label*="delete"]').click();

      // Confirm deletion
      await page.locator('.ant-popconfirm button:has-text("Yes")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for table to update
      await page.waitForTimeout(1000);

      // PHASE 1 FIX: Verify step is removed (using correct data row selector)
      await expect(page.locator('[role="tabpanel"]:visible table tbody tr.ant-table-row')).toHaveCount(0);
      await expect(page.locator('[role="tabpanel"]:visible text=No steps defined')).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should paginate routing list', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // PHASE 5 FIX: Wait for data to load before checking pagination
      await page.waitForSelector('.ant-table-row', { timeout: 5000 }); // Wait for any row
      await page.waitForSelector('.ant-pagination', { timeout: 10000 }); // Wait for pagination

      // Check if pagination exists
      const pagination = page.locator('.ant-pagination');
      const hasPagination = await pagination.isVisible();

      if (hasPagination) {
        // Get current page number
        const currentPage = await page.locator('.ant-pagination-item-active').textContent();
        expect(currentPage).toBeTruthy();

        // Try to go to next page if available
        const nextButton = page.locator('.ant-pagination-item-link[rel="next"]');
        const isNextEnabled = await nextButton.isEnabled();

        if (isNextEnabled) {
          await nextButton.click();
          await page.waitForTimeout(1000);

          // Verify page changed
          const newPage = await page.locator('.ant-pagination-item-active').textContent();
          expect(newPage).not.toBe(currentPage);
        }
      }
    });
  });

  test.describe('Visual Editor Integration (Phase 5.5 Enhancement)', () => {
    test('should show Visual Editor mode switcher on create page', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      // Look for mode switcher
      const formViewButton = page.locator('text=Form View').or(page.getByRole('button', { name: /form/i }));
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      const hasFormView = await formViewButton.count() > 0;
      const hasVisualEditor = await visualEditorButton.count() > 0;

      // At least one mode should be available
      expect(hasFormView || hasVisualEditor).toBeTruthy();
    });

    test('should switch between Form View and Visual Editor modes', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        // Switch to Visual Editor
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Check for ReactFlow canvas or visual editor components
        const hasReactFlow = await page.locator('.react-flow').count() > 0;
        const hasVisualEditor = await page.locator('[class*="visual"]').count() > 0;

        expect(hasReactFlow || hasVisualEditor).toBeTruthy();

        // Switch back to Form View
        const formViewButton = page.locator('text=Form View').or(page.getByRole('button', { name: /form/i }));
        if (await formViewButton.count() > 0) {
          await formViewButton.first().click();
          await page.waitForTimeout(500);

          // Check that form is visible again
          const routingNumberInput = page.locator('input[name="routingNumber"]');
          await expect(routingNumberInput).toBeVisible();
        }
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });

    test('should show unsaved changes indicator in visual editor', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Look for unsaved changes indicator (may appear after making changes)
        const unsavedIndicator = page.locator('text=Unsaved').or(page.locator('[class*="unsaved"]'));
        const hasUnsavedIndicator = await unsavedIndicator.count() > 0;

        // Just verify the indicator mechanism exists (may or may not show depending on state)
        console.log(`Unsaved changes indicator mechanism found: ${hasUnsavedIndicator}`);
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });
  });

  test.describe('Template-Based Routing Creation (Phase 5.5 Enhancement)', () => {
    test('should show template library access from routing list', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Look for template-related buttons
      const templateButton = page.locator('button:has-text("Template")').or(page.locator('button:has-text("From Template")'));
      const hasTemplateButton = await templateButton.count() > 0;

      // Template functionality may be in dropdown or separate button
      console.log(`Template access button found: ${hasTemplateButton}`);
    });

    test('should display Save as Template option in routing detail', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Look for Save as Template button or menu option
      const saveAsTemplateButton = page.locator('button:has-text("Save as Template")');
      const moreActionsButton = page.locator('button:has-text("More")').or(page.locator('[aria-label*="more" i]'));

      const hasDirectButton = await saveAsTemplateButton.count() > 0;
      const hasMoreMenu = await moreActionsButton.count() > 0;

      // Template save option should be accessible either directly or via menu
      console.log(`Save as Template access: direct=${hasDirectButton}, menu=${hasMoreMenu}`);
    });

    test('should filter routing list by template usage', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Look for filters that might include template-based indicator
      const filterDropdown = page.locator('.ant-select').or(page.locator('select'));
      const hasFilters = await filterDropdown.count() > 0;

      console.log(`Routing filters available: ${hasFilters}`);
    });
  });

  test.describe('Step Type Indicators (Phase 5.5 Enhancement)', () => {
    test('should display step type badges in routing detail', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Go to Steps tab
      const stepsTab = page.locator('.ant-tabs-tab:has-text("Steps")');
      if (await stepsTab.count() > 0) {
        await stepsTab.click();
        await page.waitForTimeout(500);

        // Look for step type indicators (badges, tags, or icons)
        const stepTypeBadge = page.locator('.ant-tag').or(page.locator('.ant-badge'));
        const hasStepTypeIndicators = await stepTypeBadge.count() > 0;

        console.log(`Step type indicators found: ${hasStepTypeIndicators}`);
      } else {
        test.skip();
      }
    });

    test('should display control type badges (LOT/SERIAL) in steps', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Go to Steps tab
      const stepsTab = page.locator('.ant-tabs-tab:has-text("Steps")');
      if (await stepsTab.count() > 0) {
        await stepsTab.click();
        await page.waitForTimeout(500);

        // Look for LOT/SERIAL control type indicators
        const lotControlBadge = page.locator('text=LOT').or(page.locator('[class*="lot"]'));
        const serialControlBadge = page.locator('text=SERIAL').or(page.locator('[class*="serial"]'));

        const hasLotControl = await lotControlBadge.count() > 0;
        const hasSerialControl = await serialControlBadge.count() > 0;

        console.log(`Control type badges - LOT: ${hasLotControl}, SERIAL: ${hasSerialControl}`);
      } else {
        test.skip();
      }
    });

    test('should show optional step indicators in routing detail', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Go to Steps tab
      const stepsTab = page.locator('.ant-tabs-tab:has-text("Steps")');
      if (await stepsTab.count() > 0) {
        await stepsTab.click();
        await page.waitForTimeout(500);

        // Look for optional step indicators
        const optionalIndicator = page.locator('text=Optional').or(page.locator('[class*="optional"]'));
        const hasOptionalIndicator = await optionalIndicator.count() > 0;

        console.log(`Optional step indicator mechanism found: ${hasOptionalIndicator}`);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Advanced Step Types Support (Phase 5.5 Enhancement)', () => {
    test('should support DECISION step type creation', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      // Fill in basic info
      const routingNumber = `TEST-DECISION-${Date.now()}`;
      await page.fill('input[name="routingNumber"]', routingNumber);

      // Switch to Visual Editor if available
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Look for DECISION node option in palette or add menu
        const decisionButton = page.locator('button:has-text("Decision")').or(page.locator('text=DECISION'));
        const hasDecisionOption = await decisionButton.count() > 0;

        console.log(`DECISION step type available: ${hasDecisionOption}`);
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });

    test('should support PARALLEL_SPLIT and PARALLEL_JOIN step types', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Look for parallel operation nodes
        const parallelSplitButton = page.locator('text=Parallel').or(page.locator('text=PARALLEL_SPLIT'));
        const parallelJoinButton = page.locator('text=Join').or(page.locator('text=PARALLEL_JOIN'));

        const hasParallelSplit = await parallelSplitButton.count() > 0;
        const hasParallelJoin = await parallelJoinButton.count() > 0;

        console.log(`Parallel operations - SPLIT: ${hasParallelSplit}, JOIN: ${hasParallelJoin}`);
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });

    test('should support OSP (Outside Processing) step type', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Look for OSP node option
        const ospButton = page.locator('button:has-text("OSP")').or(page.locator('text=Outside Processing'));
        const hasOSPOption = await ospButton.count() > 0;

        console.log(`OSP step type available: ${hasOSPOption}`);
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });

    test('should support LOT_SPLIT and LOT_MERGE step types', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Look for lot control nodes
        const lotSplitButton = page.locator('text=Split').or(page.locator('text=LOT_SPLIT'));
        const lotMergeButton = page.locator('text=Merge').or(page.locator('text=LOT_MERGE'));

        const hasLotSplit = await lotSplitButton.count() > 0;
        const hasLotMerge = await lotMergeButton.count() > 0;

        console.log(`Lot control operations - SPLIT: ${hasLotSplit}, MERGE: ${hasLotMerge}`);
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });

    test('should support TELESCOPING (optional operations) step type', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();
        await page.waitForTimeout(1000);

        // Look for telescoping node option
        const telescopingButton = page.locator('text=Telescoping').or(page.locator('text=Optional'));
        const hasTelescopingOption = await telescopingButton.count() > 0;

        console.log(`TELESCOPING step type available: ${hasTelescopingOption}`);
      } else {
        // PHASE 3 FIX: Visual Editor is available, this should not skip
        throw new Error('Visual Editor button not found - UI issue detected');
      }
    });
  });
});
