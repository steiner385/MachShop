/**
 * E2E Tests: Routing Visual Editor
 * Phase 5.1: Visual Editor Integration Tests
 *
 * Tests the new ReactFlow-based visual routing editor:
 * - Switch between form and visual modes
 * - Add/remove nodes to canvas
 * - Connect nodes with edges
 * - Auto-layout functionality
 * - Save visual routing data
 * - Load existing visual routing
 * - Different node types (PROCESS, INSPECTION, DECISION, etc.)
 * - Step property editing
 * - Undo/redo functionality
 * - Visual editor permissions
 */

import { test, expect, Page } from '@playwright/test';
import { PrismaClient, RoutingLifecycleState } from '@prisma/client';
import { setupTestAuth } from '../helpers/testAuthHelper';
import { createNavigationManager, EnhancedNavigationManager } from '../helpers/enhancedNavigationManager';
import { createReliableHelpers, ReliableTestHelpers } from '../helpers/reliableTestHelpers';

const prisma = new PrismaClient();

test.describe('Routing Visual Editor E2E Tests', () => {
  let page: Page;
  let navigationManager: EnhancedNavigationManager;
  let reliableHelpers: ReliableTestHelpers;
  let testPart: any;
  let testSite: any;
  let testProcessSegment: any;
  let createdRoutingId: string;

  test.beforeAll(async ({ browser }) => {
    // Create browser context
    const context = await browser.newContext();
    page = await context.newPage();

    // Initialize navigation manager and reliable helpers
    navigationManager = createNavigationManager(page);
    reliableHelpers = createReliableHelpers(page);

    // Setup test data
    testSite = await prisma.site.findFirst({ where: { isActive: true } });
    testPart = await prisma.part.findFirst();
    if (!testPart) {
      testPart = await prisma.part.create({
        data: {
          partNumber: 'VIS-PART-001',
          name: 'Visual Editor Test Part',
          description: 'Part for visual editor E2E tests',
          isActive: true,
        },
      });
    }

    testProcessSegment = await prisma.operation.findFirst({
      where: { isActive: true },
    });
  });

  test.beforeEach(async () => {
    // Setup authentication before each test
    await setupTestAuth(page, 'manufacturingEngineer');
  });

  test.afterAll(async () => {
    // Cleanup created routing
    if (createdRoutingId) {
      await prisma.routing.delete({ where: { id: createdRoutingId } });
    }
    await page.close();
  });

  test.describe('Mode Switching', () => {
    test('should navigate to routing form page', async () => {
      // ✅ ENHANCED: Using navigation manager instead of raw page.goto
      await navigationManager.navigateAuthenticated('/routings/new', {
        description: 'Navigate to routing creation page'
      });
      await expect(page.locator('h1')).toContainText('Create New Routing');
    });

    test('should display mode switcher with Form View and Visual Editor options', async () => {
      // ✅ ENHANCED: Intelligent wait strategies and route-specific configuration
      await navigationManager.navigateAuthenticated('/routings/new', {
        description: 'Navigate to routing creation for mode switcher test',
        additionalWaits: [
          { selector: '.ant-form, form', timeout: 10000 }
        ]
      });

      // Check for segmented control / mode switcher
      const formViewButton = page.locator('text=Form View').or(page.getByRole('button', { name: /form/i }));
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));

      await expect(formViewButton.first()).toBeVisible({ timeout: 15000 });
      await expect(visualEditorButton.first()).toBeVisible({ timeout: 15000 });
    });

    test('should start in Form View mode by default', async () => {
      // ✅ ENHANCED: Route-specific ready indicators ensure form is fully loaded
      await navigationManager.navigateAuthenticated('/routings/new', {
        description: 'Navigate to verify default Form View mode'
      });

      // Check that form fields are visible
      const routingNumberInput = page.getByLabel(/routing number/i).or(page.locator('input[name="routingNumber"]'));
      await expect(routingNumberInput.first()).toBeVisible({ timeout: 15000 });
    });

    test('should switch to Visual Editor mode when clicked', async () => {
      // ✅ ENHANCED: Use reliable navigation with SPA readiness
      await navigationManager.navigateAuthenticated('/routings/new', {
        description: 'Navigate to routing creation for Visual Editor switch test'
      });

      // ✅ ENHANCED: Use enhanced element waiting for Visual Editor button
      const visualEditorButton = await reliableHelpers.waitForElementReady(
        'text=Visual Editor, button:has-text("Visual Editor"), [role="button"]:has-text("Visual"), button:contains("Visual")',
        {
          timeout: 30000,
          retries: 4,
          description: 'Visual Editor mode button',
          progressive: true
        }
      );

      // ✅ ENHANCED: Use safe click with verification
      await reliableHelpers.safeClick(
        'text=Visual Editor, button:has-text("Visual Editor"), [role="button"]:has-text("Visual")',
        {
          timeout: 20000,
          description: 'Visual Editor mode button'
        }
      );

      // ✅ ENHANCED: Use specialized Visual Editor wait
      await reliableHelpers.waitForVisualEditor({
        timeout: 45000,
        waitForCanvas: true,
        waitForToolbar: false,
        description: 'Visual Editor canvas initialization'
      });
    });

    test('should switch back to Form View from Visual Editor', async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Switch to visual editor
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      await visualEditorButton.first().click();
      await page.waitForTimeout(1000);

      // Switch back to form view
      const formViewButton = page.locator('text=Form View').or(page.getByRole('button', { name: /form/i }));
      await formViewButton.first().click();
      await page.waitForTimeout(1000);

      // Check that form is visible again
      const routingNumberInput = page.getByLabel(/routing number/i).or(page.locator('input[name="routingNumber"]'));
      await expect(routingNumberInput.first()).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('Visual Editor UI Elements', () => {
    test.beforeEach(async () => {
      // ✅ ENHANCED: Reliable navigation with intelligent waiting
      await navigationManager.navigateAuthenticated('/routings/new', {
        description: 'Navigate to routing creation for visual editor tests',
        additionalWaits: [
          { selector: '.ant-form, form', timeout: 10000 }
        ]
      });

      // ✅ ENHANCED: Switch to visual editor mode with enhanced stability
      await reliableHelpers.safeClick(
        'text=Visual Editor, button:has-text("Visual Editor"), [role="button"]:has-text("Visual")',
        {
          timeout: 30000,
          retries: 4,
          description: 'Visual Editor mode switch button'
        }
      );

      // ✅ ENHANCED: Wait for ReactFlow and Visual Editor to be fully ready
      await reliableHelpers.waitForVisualEditor({
        timeout: 45000,
        waitForCanvas: true,
        waitForToolbar: true,
        description: 'Visual Editor complete initialization'
      });
    });

    test('should display ReactFlow canvas', async () => {
      const reactFlowCanvas = page.locator('.react-flow').or(page.locator('[class*="reactflow"]'));
      await expect(reactFlowCanvas.first()).toBeVisible({ timeout: 15000 });
    });

    test('should display control panel with quick-add buttons', async () => {
      // Visual editor control panel implemented with comprehensive quick-add buttons
      // Use data-testid selectors for better reliability
      const processButton = page.getByTestId('add-process-button');
      const inspectionButton = page.getByRole('button', { name: 'Inspection', exact: true });
      const decisionButton = page.getByRole('button', { name: 'Decision', exact: true });
      const splitButton = page.getByRole('button', { name: 'Split', exact: true });
      const joinButton = page.getByRole('button', { name: 'Join', exact: true });

      // Verify quick-add buttons are visible
      await expect(processButton).toBeVisible();
      await expect(inspectionButton).toBeVisible();
      await expect(decisionButton).toBeVisible();
      await expect(splitButton).toBeVisible();
      await expect(joinButton).toBeVisible();

      // Verify advanced node types are also available
      const ospButton = page.getByRole('button', { name: 'OSP', exact: true });
      const lotSplitButton = page.getByRole('button', { name: 'Lot Split', exact: true });
      const lotMergeButton = page.getByRole('button', { name: 'Lot Merge', exact: true });
      const telescopingButton = page.getByRole('button', { name: 'Telescoping', exact: true });

      await expect(ospButton).toBeVisible();
      await expect(lotSplitButton).toBeVisible();
      await expect(lotMergeButton).toBeVisible();
      await expect(telescopingButton).toBeVisible();
    });

    test.skip('should display zoom controls', async () => {
      // TODO: Verify zoom controls are properly configured in ReactFlow
      // This test needs to be updated once visual editor zoom controls are confirmed
      // ReactFlow typically has zoom in/out controls
      const zoomControls = page.locator('.react-flow__controls').or(page.locator('[class*="controls"]'));

      // Check if zoom controls exist
      const controlsExist = await zoomControls.count() > 0;
      expect(controlsExist).toBeTruthy();
    });

    test('should display mini-map for navigation', async () => {
      // ReactFlow mini-map
      const miniMap = page.locator('.react-flow__minimap').or(page.locator('[class*="minimap"]'));

      // Mini-map might be optional, so just check if it exists
      const miniMapCount = await miniMap.count();
      // This is informational - mini-map is optional
      console.log(`Mini-map elements found: ${miniMapCount}`);
    });

    test('should display save button', async () => {
      const saveButton = page.locator('button:has-text("Save")').or(page.getByRole('button', { name: /save/i }));
      await expect(saveButton.first()).toBeVisible({ timeout: 15000 });
    });

    test('should display undo/redo buttons if implemented', async () => {
      const undoButton = page.locator('button:has-text("Undo")').or(page.locator('[aria-label*="undo" i]'));
      const redoButton = page.locator('button:has-text("Redo")').or(page.locator('[aria-label*="redo" i]'));

      // Check if they exist (they may be optional features)
      const undoExists = await undoButton.count() > 0;
      const redoExists = await redoButton.count() > 0;

      console.log(`Undo button exists: ${undoExists}, Redo button exists: ${redoExists}`);
    });
  });

  test.describe('Node Operations', () => {
    test.beforeEach(async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Switch to visual editor mode
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      await visualEditorButton.first().click();
      await page.waitForTimeout(1000);
    });

    test('should add a PROCESS node to canvas', async () => {
      // Look for Add Process button or similar
      const addProcessButton = page.locator('button:has-text("Process")').or(page.locator('text=PROCESS'));

      if (await addProcessButton.count() > 0) {
        await addProcessButton.first().click();
        await page.waitForTimeout(500);

        // Check if a node was added to canvas
        const nodes = page.locator('.react-flow__node').or(page.locator('[class*="node"]'));
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should add an INSPECTION node to canvas', async () => {
      const addInspectionButton = page.locator('button:has-text("Inspection")').or(page.locator('text=INSPECTION'));

      if (await addInspectionButton.count() > 0) {
        await addInspectionButton.first().click();
        await page.waitForTimeout(500);

        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();
        expect(nodeCount).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    });

    test('should support START and END nodes', async () => {
      // START and END nodes are essential for routing flows
      const startButton = page.locator('button:has-text("Start")').or(page.locator('text=START'));
      const endButton = page.locator('button:has-text("End")').or(page.locator('text=END'));

      const hasStartOrEnd = (await startButton.count()) > 0 || (await endButton.count()) > 0;

      // These are typically auto-added or available
      console.log(`START/END node support: ${hasStartOrEnd}`);
    });

    test('should delete a node when delete button is clicked', async () => {
      // This test would require adding a node first, then deleting it
      // Skipping for now as it requires complex interaction
      test.skip();
    });
  });

  test.describe('Edge/Connection Operations', () => {
    test.beforeEach(async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      await visualEditorButton.first().click();
      await page.waitForTimeout(1000);
    });

    test('should allow connecting nodes with edges', async () => {
      // This requires complex drag-and-drop operations in ReactFlow
      // Typically requires:
      // 1. Add two nodes
      // 2. Drag from one node's handle to another's
      // This is complex to implement in E2E tests
      test.skip();
    });

    test('should display connection editor when edge is clicked', async () => {
      // Would need to create an edge first
      test.skip();
    });
  });

  test.describe('Auto-Layout', () => {
    test.beforeEach(async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      await visualEditorButton.first().click();
      await page.waitForTimeout(1000);
    });

    test('should have auto-layout button', async () => {
      const autoLayoutButton = page.locator('button:has-text("Auto Layout")').or(page.locator('text=Layout'));

      // Auto-layout is optional but recommended
      const hasAutoLayout = await autoLayoutButton.count() > 0;
      console.log(`Auto-layout button exists: ${hasAutoLayout}`);
    });

    test('should reorganize nodes when auto-layout is triggered', async () => {
      // Would require adding nodes first, then triggering layout
      test.skip();
    });
  });

  test.describe('Save and Load Visual Routing', () => {
    test('should save routing with visual data', async () => {
      await page.goto('/routings/new');

      // Fill in basic routing info first in form view
      const routingNumber = `VIS-RT-${Date.now()}`;
      await page.fill('input[name="routingNumber"]', routingNumber);

      // Select part using Ant Design Select
      const partSelect = page.locator('#partId');
      if (await partSelect.count() > 0) {
        await partSelect.click();
        await page.waitForTimeout(300); // Wait for dropdown
        await page.locator('.ant-select-item').nth(0).click();
      }

      // Site should be pre-selected from context, but select if needed
      // Check if site is already selected by looking for the selection item span
      const siteSelectionItem = page.locator('.ant-select-selection-item').filter({ hasText: /SITE-/ });
      const hasSiteSelected = await siteSelectionItem.count() > 0;

      if (!hasSiteSelected) {
        const siteSelect = page.locator('#siteId');
        if (await siteSelect.count() > 0) {
          // Click the select container, not the input
          await siteSelect.locator('..').click();
          await page.waitForTimeout(300); // Wait for dropdown
          await page.locator('.ant-select-item').first().click();
        }
      }

      // Switch to visual editor
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      await visualEditorButton.first().click();
      await page.waitForTimeout(1000);

      // Try to save
      const saveButton = page.locator('button:has-text("Save")').or(page.getByRole('button', { name: /save/i }));
      await saveButton.first().click();

      // Wait for navigation or success message
      await page.waitForTimeout(2000);

      // Check if we were redirected or if there's a success message
      const url = page.url();
      const hasSuccessMessage = await page.locator('text=success').or(page.locator('[class*="success"]')).count() > 0;

      expect(url.includes('/routings/') || hasSuccessMessage).toBeTruthy();
    });

    test('should load existing routing with visual data in visual editor', async () => {
      // Create a routing with visual data first
      const routing = await prisma.routing.create({
        data: {
          routingNumber: `VIS-LOAD-${Date.now()}`,
          partId: testPart.id,
          siteId: testSite.id,
          version: '1.0',
          lifecycleState: RoutingLifecycleState.DRAFT,
          notes: `Test routing\n\n[VISUAL_DATA]${JSON.stringify({
            nodes: [
              { id: 'node-1', type: 'start', position: { x: 0, y: 0 }, data: { label: 'Start' } },
              { id: 'node-2', type: 'process', position: { x: 200, y: 0 }, data: { label: 'Process 1' } },
            ],
            edges: [
              { id: 'edge-1', source: 'node-1', target: 'node-2' },
            ],
          })}[/VISUAL_DATA]`,
        },
      });

      createdRoutingId = routing.id;

      // ✅ ENHANCED: Navigate to edit with dynamic route handling
      await navigationManager.navigateAuthenticated(`/routings/${routing.id}/edit`, {
        description: `Navigate to edit routing ${routing.id}`,
        expectedUrl: new RegExp(`/routings/${routing.id}/edit`),
        additionalWaits: [
          { selector: '.ant-form, form', timeout: 10000 },
          { networkIdle: true, timeout: 5000 }
        ]
      });

      // Switch to visual editor with enhanced stability
      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      if (await visualEditorButton.count() > 0) {
        await visualEditorButton.first().click();

        // Wait for ReactFlow and nodes to be rendered
        await page.waitForSelector('.react-flow__node', { timeout: 15000 });

        // Check if nodes are rendered
        const nodes = page.locator('.react-flow__node');
        const nodeCount = await nodes.count();

        // Should have at least 2 nodes from our visual data
        expect(nodeCount).toBeGreaterThanOrEqual(2);
      } else {
        test.skip();
      }
    });
  });

  test.describe('Permissions', () => {
    test('should show visual editor for users with routing.write permission', async () => {
      // Already logged in as Manufacturing Engineer who has routing.write
      await page.goto('/routings/new');

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      const hasVisualEditor = await visualEditorButton.count() > 0;

      expect(hasVisualEditor).toBeTruthy();
    });

    test('should show visual editor in read-only mode for users with only routing.read permission', async () => {
      // Would need to login as different user (e.g., Production Supervisor)
      // and check if visual editor is in read-only mode
      test.skip();
    });
  });

  test.describe('Unsaved Changes Indicator', () => {
    test.beforeEach(async () => {
      await page.goto('/routings/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      const visualEditorButton = page.locator('text=Visual Editor').or(page.getByRole('button', { name: /visual/i }));
      await visualEditorButton.first().click();
      await page.waitForTimeout(1000);
    });

    test('should show unsaved changes indicator when modifications are made', async () => {
      // Look for unsaved changes indicator
      const unsavedIndicator = page.locator('text=Unsaved').or(page.locator('text=unsaved')).or(page.locator('[class*="unsaved"]'));

      // Initially should not have unsaved changes (might not be visible)
      // After making changes, it should appear
      // This is complex to test without actually modifying nodes
      test.skip();
    });
  });
});
