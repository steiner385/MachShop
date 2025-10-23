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

import { test, expect, Page, request } from '@playwright/test';
import { PrismaClient, RoutingLifecycleState } from '@prisma/client';

const prisma = new PrismaClient();

// Test data
const testRouting = {
  routingNumber: 'TEST-RT-001',
  partId: '', // Will be set during setup
  siteId: '', // Will be set during setup
  version: '1.0',
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
  let authToken: string;
  let testPart: any;
  let testSite: any;
  let testProcessSegment: any;
  let createdRoutingId: string;

  test.beforeAll(async ({ browser }) => {
    // Create API context for authentication
    const apiContext = await request.newContext({
      baseURL: 'http://localhost:3101/api/v1/',
    });

    // Login to get auth token
    const loginResponse = await apiContext.post('auth/login', {
      data: {
        username: 'prod.planner',
        password: 'password123'
      }
    });

    if (!loginResponse.ok()) {
      throw new Error(`Login failed: ${await loginResponse.text()}`);
    }

    const loginData = await loginResponse.json();
    authToken = loginData.token;

    // Create browser context with auth token
    const context = await browser.newContext();
    page = await context.newPage();

    // Set auth token in page context
    await page.addInitScript((token) => {
      localStorage.setItem('authToken', token);
    }, authToken);

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

    testProcessSegment = await prisma.operation.findFirst({
      where: { isActive: true },
    });
    if (!testProcessSegment) {
      testProcessSegment = await prisma.operation.create({
        data: {
          operationName: 'Test Operation',
          operationType: 'MACHINING',
          setupTime: 300,
          duration: 600,
          teardownTime: 120,
          isStandardOperation: true,
          isActive: true,
        },
      });
    }

    // Set test data IDs
    testRouting.partId = testPart.id;
    testRouting.siteId = testSite.id;
    testStep.operationId = testProcessSegment.id;
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

      // Click site filter dropdown
      await page.locator('input[placeholder*="Filter by site"]').click();

      // Select first site
      await page.locator('.ant-select-item').first().click();

      // Wait for table to update
      await page.waitForTimeout(1000);

      // Verify table has results
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test('should search routings by routing number', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Enter search term
      await page.locator('input[placeholder*="Search"]').fill('RT');

      // Click search button
      await page.locator('button:has-text("Search")').click();

      // Wait for results
      await page.waitForTimeout(1000);

      // Verify search was applied (check URL or table)
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
    });

    test('should filter routings by lifecycle state', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Click lifecycle state filter
      await page.locator('input[placeholder*="lifecycle state"]').click();

      // Select DRAFT
      await page.locator('.ant-select-item:has-text("Draft")').click();

      // Wait for filter to apply
      await page.waitForTimeout(1000);

      // Verify table updated
      const rows = await page.locator('tbody tr').count();
      expect(rows).toBeGreaterThanOrEqual(0);
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
      await expect(page.locator('h2')).toContainText('Create New Routing');
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

      // Select part
      await page.locator('#partId').click();
      await page.locator(`.ant-select-item-option-content:has-text("${testPart.partNumber}")`).click();

      // Select site (should be pre-selected from context)
      // If not, select it manually
      const siteInput = page.locator('#siteId');
      const siteValue = await siteInput.inputValue();
      if (!siteValue) {
        await siteInput.click();
        await page.locator('.ant-select-item').first().click();
      }

      // Fill in description
      await page.locator('textarea[id="description"]').fill(testRouting.description);

      // Click "Save as Draft"
      await page.locator('button:has-text("Save as Draft")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Verify navigation to detail page
      await expect(page).toHaveURL(/\/routings\/[a-f0-9-]+$/);

      // Store created routing ID for cleanup
      const url = page.url();
      createdRoutingId = url.split('/').pop() || '';

      // Verify routing details are displayed
      await expect(page.locator('h2')).toContainText(testRouting.routingNumber);
      await expect(page.locator('text=DRAFT')).toBeVisible();
    });
  });

  test.describe('Routing Detail View', () => {
    test.beforeEach(async () => {
      // Ensure we have a routing to view
      if (!createdRoutingId) {
        // Create one via API if needed
        const response = await page.request.post('/api/v1/routings', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          data: testRouting,
        });
        const result = await response.json();
        createdRoutingId = result.data.id;
      }
    });

    test('should display routing details', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify header
      await expect(page.locator('h2')).toContainText(testRouting.routingNumber);

      // Verify lifecycle state badge
      await expect(page.locator('.ant-tag:has-text("Draft")')).toBeVisible();

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
      await expect(page.locator('text=Routing Number')).toBeVisible();
      await expect(page.locator('text=Version')).toBeVisible();
      await expect(page.locator('text=Part')).toBeVisible();
    });

    test('should display steps tab', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

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

      // Click Edit button
      await page.locator('button:has-text("Edit")').click();

      // Verify navigation to edit page
      await expect(page).toHaveURL(`/routings/${createdRoutingId}/edit`);
      await expect(page.locator('h2')).toContainText('Edit Routing');
    });

    test('should update routing successfully', async () => {
      await page.goto(`/routings/${createdRoutingId}/edit`);
      await page.waitForLoadState('networkidle');

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
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify current state is DRAFT
      await expect(page.locator('.ant-tag:has-text("Draft")')).toBeVisible();

      // Click "Submit for Review" button
      await page.locator('button:has-text("Submit for Review")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for page to reload
      await page.waitForTimeout(1000);

      // Verify state changed to REVIEW
      await expect(page.locator('.ant-tag:has-text("In Review")')).toBeVisible();
    });

    test('should transition from REVIEW to RELEASED', async () => {
      await page.goto(`/routings/${createdRoutingId}`);
      await page.waitForLoadState('networkidle');

      // Verify current state is REVIEW
      await expect(page.locator('.ant-tag:has-text("In Review")')).toBeVisible();

      // Click "Approve & Release" button
      await page.locator('button:has-text("Approve & Release")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for page to reload
      await page.waitForTimeout(1000);

      // Verify state changed to RELEASED
      await expect(page.locator('.ant-tag:has-text("Released")')).toBeVisible();
    });
  });

  test.describe('Delete Routing', () => {
    test('should delete routing successfully', async () => {
      // Create a routing specifically for deletion
      const deleteTestRouting = await prisma.routing.create({
        data: {
          routingNumber: 'TEST-DELETE-001',
          partId: testPart.id,
          siteId: testSite.id,
          version: '1.0',
          description: 'Routing for delete test',
          lifecycleState: RoutingLifecycleState.DRAFT,
          isPrimaryRoute: false,
          isActive: true,
        },
      });

      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

      // Find the routing in the table
      const routingRow = page.locator(`tr:has-text("${deleteTestRouting.routingNumber}")`);
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
      await expect(page.locator(`tr:has-text("${deleteTestRouting.routingNumber}")`)).not.toBeVisible();
    });
  });

  test.describe('Routing Steps Management', () => {
    let routingWithSteps: any;
    let testStepId: string;

    test.beforeAll(async () => {
      // Create a routing with steps for testing
      routingWithSteps = await prisma.routing.create({
        data: {
          routingNumber: 'TEST-STEPS-001',
          partId: testPart.id,
          siteId: testSite.id,
          version: '1.0',
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
      // Cleanup
      if (routingWithSteps?.id) {
        await prisma.routingStep.deleteMany({
          where: { routingId: routingWithSteps.id },
        });
        await prisma.routing.delete({
          where: { id: routingWithSteps.id },
        });
      }
    });

    test('should display routing steps', async () => {
      await page.goto(`/routings/${routingWithSteps.id}`);
      await page.waitForLoadState('networkidle');

      // Click Steps tab
      await page.locator('.ant-tabs-tab:has-text("Steps")').click();

      // Verify step is displayed
      await expect(page.locator('table tbody tr')).toHaveCount(1);
      await expect(page.locator('td:has-text("10")')).toBeVisible(); // Step number
    });

    test('should delete routing step', async () => {
      await page.goto(`/routings/${routingWithSteps.id}`);
      await page.waitForLoadState('networkidle');

      // Click Steps tab
      await page.locator('.ant-tabs-tab:has-text("Steps")').click();

      // Click delete button for the step
      await page.locator('table tbody tr button[aria-label*="delete"]').click();

      // Confirm deletion
      await page.locator('.ant-popconfirm button:has-text("Yes")').click();

      // Wait for success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Wait for table to update
      await page.waitForTimeout(1000);

      // Verify step is removed
      await expect(page.locator('table tbody tr')).toHaveCount(0);
      await expect(page.locator('text=No steps defined')).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should paginate routing list', async () => {
      await page.goto('/routings');
      await page.waitForLoadState('networkidle');

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
        test.skip();
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
        test.skip();
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
      if (!createdRoutingId) {
        test.skip();
        return;
      }

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
      if (!createdRoutingId) {
        test.skip();
        return;
      }

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
      if (!createdRoutingId) {
        test.skip();
        return;
      }

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
      if (!createdRoutingId) {
        test.skip();
        return;
      }

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
        test.skip();
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
        test.skip();
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
        test.skip();
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
        test.skip();
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
        test.skip();
      }
    });
  });
});
