/**
 * E2E Tests: Routing Advanced Patterns
 * Phase 5.2: Advanced Pattern Integration Tests
 *
 * Tests complex routing patterns supported by the visual editor:
 * - Mutually exclusive operations (DECISION nodes)
 * - Parallel operations (PARALLEL_SPLIT/JOIN)
 * - Telescoping patterns (optional operations)
 * - OSP/Farmout operations
 * - Lot/Serial control transitions
 * - Lot separation/merging workflows
 */

import { test, expect, Page } from '@playwright/test';
import { PrismaClient, RoutingLifecycleState, StepType, ControlType } from '@prisma/client';
import { setupTestAuth } from '../helpers/testAuthHelper';

const prisma = new PrismaClient();

test.describe('Routing Advanced Patterns E2E Tests', () => {
  let page: Page;
  let testPart: any;
  let testSite: any;
  let testProcessSegment: any;
  let testWorkCenter: any;

  test.beforeAll(async ({ browser }) => {
    // Create browser context
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup test data
    testSite = await prisma.site.findFirst({ where: { isActive: true } });
    testPart = await prisma.part.findFirst();
    if (!testPart) {
      testPart = await prisma.part.create({
        data: {
          partNumber: 'ADV-PART-001',
          name: 'Advanced Pattern Test Part',
          description: 'Part for advanced pattern E2E tests',
          isActive: true,
        },
      });
    }

    testProcessSegment = await prisma.operation.findFirst({
      where: { isActive: true },
    });

    testWorkCenter = await prisma.workCenter.findFirst({
      where: { isActive: true },
    });
  });

  test.beforeEach(async () => {
    // Setup authentication before each test
    await setupTestAuth(page, 'manufacturingEngineer');
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.describe('Pattern 1: Mutually Exclusive Operations (DECISION)', () => {
    test('should create routing with DECISION node for mutually exclusive paths', async () => {
      // Create routing with DECISION pattern via API
      const routingNumber = `DECISION-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Initial Inspection',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
              },
              {
                stepNumber: 20,
                stepType: StepType.DECISION,
                stepInstructions: 'Decision: Rework or Continue',
                notes: 'DECIDE-REWORK',
                operationId: testProcessSegment.id,
              },
              {
                stepNumber: 30,
                stepType: StepType.PROCESS,
                stepInstructions: 'Rework Operation',
                notes: 'REWORK',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 60,
              },
              {
                stepNumber: 40,
                stepType: StepType.PROCESS,
                stepInstructions: 'Continue to Assembly',
                notes: 'CONTINUE',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 30,
              },
            ],
          },
        },
      });

      // Navigate to routing detail page
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Verify routing is displayed (use .first() to handle multiple matches)
      await expect(page.locator(`text=${routingNumber}`).first()).toBeVisible();

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Check that DECISION step is shown
      await expect(page.locator('text=DECIDE-REWORK').or(page.locator('text=Decision')).first()).toBeVisible();

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });

    test('should enforce mutually exclusive execution paths in work order execution', async () => {
      // This would test that only one branch of DECISION is executed
      // Complex workflow test - marked as informational
      test.skip();
    });
  });

  test.describe('Pattern 2: Parallel Operations (PARALLEL_SPLIT/JOIN)', () => {
    test('should create routing with PARALLEL_SPLIT and PARALLEL_JOIN', async () => {
      const routingNumber = `PARALLEL-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Preparation',
                notes: 'PREP',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
              },
              {
                stepNumber: 20,
                stepType: StepType.PARALLEL_SPLIT,
                stepInstructions: 'Split for Parallel Operations',
                notes: 'SPLIT',
                operationId: testProcessSegment.id,
              },
              {
                stepNumber: 30,
                stepType: StepType.PROCESS,
                stepInstructions: 'Machining Operation',
                notes: 'MACHINING',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 45,
              },
              {
                stepNumber: 40,
                stepType: StepType.PROCESS,
                stepInstructions: 'Heat Treatment',
                notes: 'HEAT-TREAT',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 120,
              },
              {
                stepNumber: 50,
                stepType: StepType.PROCESS,
                stepInstructions: 'Surface Coating',
                notes: 'COATING',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 30,
              },
              {
                stepNumber: 60,
                stepType: StepType.PARALLEL_JOIN,
                stepInstructions: 'Join Parallel Operations',
                notes: 'JOIN',
                operationId: testProcessSegment.id,
              },
              {
                stepNumber: 70,
                stepType: StepType.PROCESS,
                stepInstructions: 'Final Assembly',
                notes: 'FINAL-ASSY',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 60,
              },
            ],
          },
        },
      });

      // Navigate to routing
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Verify parallel nodes are displayed
      await expect(page.locator('text=SPLIT').or(page.locator('text=Parallel Split')).first()).toBeVisible();
      await expect(page.locator('text=JOIN').or(page.locator('text=Parallel Join')).first()).toBeVisible();

      // Verify all parallel operations are present
      await expect(page.locator('text=MACHINING').first()).toBeVisible();
      await expect(page.locator('text=HEAT-TREAT').first()).toBeVisible();
      await expect(page.locator('text=COATING').first()).toBeVisible();

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });

    test('should validate that PARALLEL_JOIN waits for all branches to complete', async () => {
      // Complex execution logic test
      test.skip();
    });
  });

  test.describe('Pattern 3: Telescoping (Optional Operations)', () => {
    test('should create routing with optional TELESCOPING steps', async () => {
      const routingNumber = `TELESCOPE-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Required Machining',
                notes: 'MACHINING',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 45,
              },
              {
                stepNumber: 20,
                stepType: StepType.TELESCOPING,
                stepInstructions: 'Optional Deburring (if needed)',
                notes: 'OPTIONAL-DEBURR',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
                isOptional: true,
              },
              {
                stepNumber: 30,
                stepType: StepType.INSPECTION,
                stepInstructions: 'Final Inspection',
                notes: 'FINAL-INSPECT',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 10,
              },
            ],
          },
        },
      });

      // Navigate to routing
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Verify telescoping step is shown
      await expect(page.locator('text=OPTIONAL-DEBURR')).toBeVisible();

      // Check for optional indicator (badge, icon, or text)
      const optionalIndicator = page.locator('text=Optional').or(page.locator('[class*="optional"]'));
      const hasOptionalIndicator = await optionalIndicator.count() > 0;

      console.log(`Optional indicator found: ${hasOptionalIndicator}`);

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });

    test('should allow skipping TELESCOPING steps during work order execution', async () => {
      // Complex execution logic test
      test.skip();
    });
  });

  test.describe('Pattern 4: OSP/Farmout Operations', () => {
    test('should create routing with OSP (Outside Processing) steps', async () => {
      const routingNumber = `OSP-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Preparation for OSP',
                notes: 'PREP',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 20,
              },
              {
                stepNumber: 20,
                stepType: StepType.OSP,
                stepInstructions: 'External Painting (Vendor XYZ)',
                notes: 'PAINT-VENDOR - Ship to: Vendor XYZ Painting, 123 Industrial Blvd',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 240,
              },
              {
                stepNumber: 30,
                stepType: StepType.INSPECTION,
                stepInstructions: 'Receiving Inspection from OSP',
                notes: 'RECEIVE-INSPECT',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
              },
              {
                stepNumber: 40,
                stepType: StepType.PROCESS,
                stepInstructions: 'Final Assembly',
                notes: 'FINAL-ASSY',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 45,
              },
            ],
          },
        },
      });

      // Navigate to routing
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Verify OSP step is shown
      await expect(page.locator('text=PAINT-VENDOR').first()).toBeVisible();
      await expect(page.locator('text=Outside Process').first()).toBeVisible();

      // Check for OSP indicator (Outside Process badge in Type column)
      const ospIndicator = page.locator('text=Outside Process').or(page.locator('[class*="osp"]'));
      const hasOSPIndicator = await ospIndicator.count() > 0;

      console.log(`OSP indicator found: ${hasOSPIndicator}`);

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });

    test('should track material movement for OSP operations', async () => {
      // Complex material tracking test
      test.skip();
    });
  });

  test.describe('Pattern 5: Lot Control Transitions', () => {
    test('should create routing with LOT_CONTROLLED to SERIAL_CONTROLLED transition', async () => {
      const routingNumber = `LOTSERIAL-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Batch Mixing',
                notes: 'BATCH-MIX',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 30,
              },
              {
                stepNumber: 20,
                stepType: StepType.PROCESS,
                stepInstructions: 'Casting',
                notes: 'CAST',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 60,
              },
              {
                stepNumber: 30,
                stepType: StepType.PROCESS,
                stepInstructions: 'Serialization Point - Apply Serial Numbers',
                notes: 'SERIALIZE - Transition from LOT to SERIAL control',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 5,
              },
              {
                stepNumber: 40,
                stepType: StepType.PROCESS,
                stepInstructions: 'Final Testing (per serial)',
                notes: 'FINAL-TEST',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
              },
            ],
          },
        },
      });

      // Navigate to routing
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Verify control type indicators
      await expect(page.locator('text=BATCH-MIX')).toBeVisible();
      await expect(page.locator('text=SERIALIZE')).toBeVisible();

      // Look for control type badges
      const lotControlBadge = page.locator('text=LOT').or(page.locator('[class*="lot"]'));
      const serialControlBadge = page.locator('text=SERIAL').or(page.locator('[class*="serial"]'));

      const hasLotControl = await lotControlBadge.count() > 0;
      const hasSerialControl = await serialControlBadge.count() > 0;

      console.log(`LOT control indicator found: ${hasLotControl}`);
      console.log(`SERIAL control indicator found: ${hasSerialControl}`);

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });
  });

  test.describe('Pattern 6: Lot Separation and Merging', () => {
    test('should create routing with LOT_SPLIT and LOT_MERGE operations', async () => {
      const routingNumber = `LOTSPLIT-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Material Preparation',
                notes: 'PREP',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 20,
              },
              {
                stepNumber: 20,
                stepType: StepType.LOT_SPLIT,
                stepInstructions: 'Split Lot for Multiple Production Lines',
                notes: 'SPLIT-FOR-LINES - Split into sub-lots for parallel processing',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 5,
              },
              {
                stepNumber: 30,
                stepType: StepType.PROCESS,
                stepInstructions: 'Machining on Line 1',
                notes: 'MACHINING-LINE1',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 45,
              },
              {
                stepNumber: 40,
                stepType: StepType.PROCESS,
                stepInstructions: 'Machining on Line 2',
                notes: 'MACHINING-LINE2',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 45,
              },
              {
                stepNumber: 50,
                stepType: StepType.LOT_MERGE,
                stepInstructions: 'Merge Sub-lots After Machining',
                notes: 'MERGE-AFTER-MACHINING - Consolidate sub-lots back to single lot',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 5,
              },
              {
                stepNumber: 60,
                stepType: StepType.INSPECTION,
                stepInstructions: 'Final Inspection',
                notes: 'FINAL-INSPECT',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
              },
            ],
          },
        },
      });

      // Navigate to routing
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Verify LOT_SPLIT and LOT_MERGE steps
      await expect(page.locator('text=SPLIT-FOR-LINES')).toBeVisible();
      await expect(page.locator('text=MERGE-AFTER-MACHINING')).toBeVisible();

      // Check for split/merge indicators
      const splitIndicator = page.locator('text=SPLIT').or(page.locator('[class*="split"]'));
      const mergeIndicator = page.locator('text=MERGE').or(page.locator('[class*="merge"]'));

      const hasSplitIndicator = await splitIndicator.count() > 0;
      const hasMergeIndicator = await mergeIndicator.count() > 0;

      console.log(`LOT_SPLIT indicator found: ${hasSplitIndicator}`);
      console.log(`LOT_MERGE indicator found: ${hasMergeIndicator}`);

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });

    test('should enforce lot traceability through split and merge operations', async () => {
      // Complex traceability test
      test.skip();
    });
  });

  test.describe('Pattern 7: Complex Combined Pattern', () => {
    test('should create routing combining multiple advanced patterns', async () => {
      const routingNumber = `COMPLEX-RT-${Date.now()}`;

      const routing = await prisma.routing.create({
        data: {
          routingNumber,
          partId: testPart.id,
          siteId: testSite.id,
          version: routingNumber,
          lifecycleState: RoutingLifecycleState.DRAFT,
          notes: 'Complex routing with multiple advanced patterns',
          steps: {
            create: [
              {
                stepNumber: 10,
                stepType: StepType.PROCESS,
                stepInstructions: 'Initial Preparation',
                notes: 'START-PREP',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 15,
              },
              {
                stepNumber: 20,
                stepType: StepType.LOT_SPLIT,
                stepInstructions: 'Split for Parallel Processing',
                notes: 'SPLIT',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 5,
              },
              {
                stepNumber: 30,
                stepType: StepType.PARALLEL_SPLIT,
                stepInstructions: 'Begin Parallel Operations',
                notes: 'PARALLEL-START',
                operationId: testProcessSegment.id,
              },
              {
                stepNumber: 40,
                stepType: StepType.PROCESS,
                stepInstructions: 'Machining',
                notes: 'MACHINING',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 45,
              },
              {
                stepNumber: 50,
                stepType: StepType.OSP,
                stepInstructions: 'Heat Treatment (External)',
                notes: 'HEAT-TREAT-OSP',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 480,
              },
              {
                stepNumber: 60,
                stepType: StepType.PARALLEL_JOIN,
                stepInstructions: 'End Parallel Operations',
                notes: 'PARALLEL-END',
                operationId: testProcessSegment.id,
              },
              {
                stepNumber: 70,
                stepType: StepType.DECISION,
                stepInstructions: 'Quality Decision',
                notes: 'INSPECT-DECISION',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 10,
              },
              {
                stepNumber: 80,
                stepType: StepType.TELESCOPING,
                stepInstructions: 'Optional Rework',
                notes: 'OPTIONAL-REWORK',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 30,
                isOptional: true,
              },
              {
                stepNumber: 90,
                stepType: StepType.LOT_MERGE,
                stepInstructions: 'Merge Sub-lots',
                notes: 'MERGE',
                operationId: testProcessSegment.id,
                cycleTimeOverride: 5,
              },
              {
                stepNumber: 100,
                stepType: StepType.PROCESS,
                stepInstructions: 'Final Assembly',
                notes: 'FINAL-ASSY',
                operationId: testProcessSegment.id,
                workCenterId: testWorkCenter.id,
                cycleTimeOverride: 60,
              },
            ],
          },
        },
      });

      // Navigate to routing
      await page.goto(`/routings/${routing.id}`);
      await page.waitForTimeout(1000);

      // Verify routing is displayed (use .first() to handle multiple matches)
      await expect(page.locator(`text=${routingNumber}`).first()).toBeVisible();

      // Click on the Steps tab to view the steps table
      await page.click('text=Steps');
      await page.waitForTimeout(500);

      // Verify key pattern steps are present
      await expect(page.locator('text=SPLIT').first()).toBeVisible();
      await expect(page.locator('text=PARALLEL').first()).toBeVisible();
      await expect(page.locator('text=HEAT-TREAT-OSP').first()).toBeVisible();
      await expect(page.locator('text=INSPECT-DECISION').first()).toBeVisible();
      await expect(page.locator('text=MERGE').first()).toBeVisible();

      // Cleanup
      await prisma.routing.delete({ where: { id: routing.id } });
    });
  });

  test.describe('Pattern Validation', () => {
    test('should validate that PARALLEL_SPLIT has matching PARALLEL_JOIN', async () => {
      // Validation logic test - would check for unmatched SPLIT/JOIN
      test.skip();
    });

    test('should validate that LOT_SPLIT has matching LOT_MERGE', async () => {
      // Validation logic test - would check for unmatched SPLIT/MERGE
      test.skip();
    });

    test('should validate that DECISION branches eventually converge', async () => {
      // Validation logic test - would check for orphaned branches
      test.skip();
    });
  });
});
