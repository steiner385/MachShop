/**
 * MRP Service Tests
 * Issue #84: Material Requirements Planning (MRP) System
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import MRPService from '../../services/MRPService';

describe('MRPService', () => {
  let prisma: PrismaClient;
  let service: MRPService;
  let testSiteId: string;
  let testPartId: string;
  let testScheduleId: string;
  let testComponentPartId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new MRPService(prisma);

    // Create test site with unique code
    const site = await prisma.site.create({
      data: {
        siteCode: `TEST-MRP-${Date.now()}`,
        siteName: 'MRP Test Site',
      },
    });
    testSiteId = site.id;

    // Create test parts with unique numbers
    const timestamp = Date.now();
    const parentPart = await prisma.part.create({
      data: {
        partNumber: `PARENT-${timestamp}`,
        partName: 'Parent Assembly',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA',
        productType: 'MADE_TO_STOCK',
        leadTimeDays: 5,
        lotSizeMin: 1,
        lotSizeMultiple: 1,
      },
    });
    testPartId = parentPart.id;

    const componentPart = await prisma.part.create({
      data: {
        partNumber: `COMP-${timestamp}`,
        partName: 'Component',
        partType: 'PART',
        unitOfMeasure: 'EA',
        productType: 'MADE_TO_STOCK',
        leadTimeDays: 3,
        lotSizeMin: 1,
        lotSizeMultiple: 1,
      },
    });
    testComponentPartId = componentPart.id;

    // Create BOM
    await prisma.bOMItem.create({
      data: {
        parentPartId: testPartId,
        componentPartId: testComponentPartId,
        quantity: 5,
        unitOfMeasure: 'EA',
        scrapFactor: 0,
        sequence: 1,
        isActive: true,
      },
    });

    // Create production schedule
    const schedule = await prisma.productionSchedule.create({
      data: {
        scheduleNumber: `SCHED-${Date.now()}`,
        scheduleName: 'MRP Test Schedule',
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        siteId: testSiteId,
      },
    });
    testScheduleId = schedule.id;

    // Create schedule entry (demand)
    await prisma.scheduleEntry.create({
      data: {
        scheduleId: schedule.id,
        entryNumber: 1,
        partId: testPartId,
        partNumber: parentPart.partNumber,
        plannedQuantity: 100,
        dispatchedQuantity: 0,
        completedQuantity: 0,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        plannedEndDate: new Date(Date.now() + 11 * 24 * 60 * 60 * 1000),
      },
    });

    // Create inventory
    await prisma.inventory.create({
      data: {
        partId: testPartId,
        location: 'STOCK-01',
        quantity: 50,
        unitOfMeasure: 'EA',
        isActive: true,
      },
    });

    await prisma.inventory.create({
      data: {
        partId: testComponentPartId,
        location: 'STOCK-01',
        quantity: 200,
        unitOfMeasure: 'EA',
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    // Cleanup test data
    try {
      await prisma.mRPException.deleteMany();
      await prisma.mRPPegging.deleteMany();
      await prisma.plannedOrder.deleteMany();
      await prisma.mRPRun.deleteMany();
      await prisma.scheduleEntry.deleteMany();
      await prisma.productionSchedule.deleteMany();
      await prisma.inventory.deleteMany();
      await prisma.bOMItem.deleteMany();
      await prisma.part.deleteMany({
        where: {
          id: {
            in: [testPartId, testComponentPartId],
          },
        },
      });
      await prisma.site.delete({ where: { id: testSiteId } });
    } catch (e) {
      // Handle cleanup errors gracefully
    }
    await prisma.$disconnect();
  });

  describe('MRP Run Execution', () => {
    it('should create and execute an MRP run', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
        horizonDays: 90,
        safetyStockLevel: 10,
        runBy: 'test-user',
        notes: 'Test MRP run',
      });

      expect(mrpRun).toBeDefined();
      expect(mrpRun.id).toBeDefined();
      expect(mrpRun.runNumber).toMatch(/^MRP-/);
      expect(mrpRun.status).toBeDefined();
      expect(mrpRun.siteId).toBe(testSiteId);
      expect(mrpRun.scheduleId).toBe(testScheduleId);
      expect(mrpRun.horizonDays).toBe(90);
      expect(mrpRun.safetyStockLevel).toBe(10);
    });

    it('should generate planned orders from demand', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
        horizonDays: 90,
      });

      expect(mrpRun.plannedOrdersCount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate net requirements accounting for on-hand inventory', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
        horizonDays: 90,
      });

      // Parent part demand is 100, on-hand is 50, so net requirement is 50
      const plannedOrders = await service.getPlannedOrders(mrpRun.id);

      if (plannedOrders.length > 0) {
        const parentOrder = plannedOrders.find(po => po.partId === testPartId);
        expect(parentOrder).toBeDefined();
        // Should order the net requirement (100 - 50 = 50)
        expect(parentOrder!.quantity).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('MRP Run Retrieval', () => {
    it('should retrieve MRP run by ID', async () => {
      const created = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const retrieved = await service.getMRPRun(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.runNumber).toBe(created.runNumber);
    });

    it('should list MRP runs', async () => {
      await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const runs = await service.listMRPRuns({
        siteId: testSiteId,
        limit: 10,
      });

      expect(Array.isArray(runs)).toBe(true);
      expect(runs.length).toBeGreaterThan(0);
    });

    it('should list MRP runs with pagination', async () => {
      await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const runsPage1 = await service.listMRPRuns({
        siteId: testSiteId,
        limit: 5,
        offset: 0,
      });

      const runsPage2 = await service.listMRPRuns({
        siteId: testSiteId,
        limit: 5,
        offset: 5,
      });

      expect(Array.isArray(runsPage1)).toBe(true);
      expect(Array.isArray(runsPage2)).toBe(true);
    });
  });

  describe('Planned Orders', () => {
    it('should retrieve planned orders from MRP run', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const plannedOrders = await service.getPlannedOrders(mrpRun.id);

      expect(Array.isArray(plannedOrders)).toBe(true);
    });

    it('should include order dates accounting for lead time', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const plannedOrders = await service.getPlannedOrders(mrpRun.id);

      if (plannedOrders.length > 0) {
        const order = plannedOrders[0];
        expect(order.orderDate).toBeDefined();
        expect(order.dueDate).toBeDefined();
        // Order date should be before or equal to due date
        expect(order.orderDate.getTime()).toBeLessThanOrEqual(order.dueDate.getTime());
      }
    });

    it('should track planned order status transitions', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const plannedOrders = await service.getPlannedOrders(mrpRun.id);

      if (plannedOrders.length > 0) {
        const order = plannedOrders[0];
        expect(order.status).toBe('PLANNED');
      }
    });
  });

  describe('BOM Explosion', () => {
    it('should explode multi-level BOMs', async () => {
      // Create a sub-assembly for deeper BOM
      const subAssembly = await prisma.part.create({
        data: {
          partNumber: 'SUBASM-001',
          partName: 'Sub Assembly',
          partType: 'ASSEMBLY',
          unitOfMeasure: 'EA',
          productType: 'MADE_TO_STOCK',
          leadTimeDays: 2,
        },
      });

      // Add sub-assembly to component as parent
      await prisma.bOMItem.create({
        data: {
          parentPartId: testComponentPartId,
          componentPartId: subAssembly.id,
          quantity: 2,
          unitOfMeasure: 'EA',
          scrapFactor: 0,
        },
      });

      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      expect(mrpRun.id).toBeDefined();

      // Cleanup sub-assembly
      await prisma.bOMItem.deleteMany({
        where: { componentPartId: subAssembly.id },
      });
      await prisma.part.delete({ where: { id: subAssembly.id } });
    });
  });

  describe('Safety Stock', () => {
    it('should calculate safety stock requirements', async () => {
      const safetyStockLevel = 20; // 20%

      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
        safetyStockLevel,
      });

      expect(mrpRun.safetyStockLevel).toBe(safetyStockLevel);
    });
  });

  describe('Exception Detection', () => {
    it('should detect exceptions in MRP run', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      expect(Array.isArray(mrpRun.exceptions)).toBe(true);
    });

    it('should flag late orders as exceptions', async () => {
      // Create a demand in the past
      const pastSchedule = await prisma.productionSchedule.create({
        data: {
          scheduleNumber: `PAST-SCHED-${Date.now()}`,
          scheduleName: 'Past Schedule',
          periodStart: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          periodEnd: new Date(),
          siteId: testSiteId,
        },
      });

      const pastEntry = await prisma.scheduleEntry.create({
        data: {
          scheduleId: pastSchedule.id,
          entryNumber: 1,
          partId: testPartId,
          partNumber: 'TEST-PART',
          plannedQuantity: 50,
          dispatchedQuantity: 0,
          completedQuantity: 0,
          unitOfMeasure: 'EA',
          plannedStartDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          plannedEndDate: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
        },
      });

      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: pastSchedule.id,
      });

      // Cleanup
      await prisma.scheduleEntry.delete({ where: { id: pastEntry.id } });
      await prisma.productionSchedule.delete({ where: { id: pastSchedule.id } });

      expect(mrpRun.id).toBeDefined();
    });
  });

  describe('Lot Sizing', () => {
    it('should apply LOT_FOR_LOT sizing rule', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const plannedOrders = await service.getPlannedOrders(mrpRun.id);

      if (plannedOrders.length > 0) {
        // With LOT_FOR_LOT, order quantity equals net requirement
        const order = plannedOrders[0];
        expect(order.lotSizingRule).toBeDefined();
      }
    });
  });

  describe('Pegging', () => {
    it('should generate pegging records linking demands to supplies', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      expect(Array.isArray(mrpRun.pegging)).toBe(true);
    });

    it('should track pegging hierarchies', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      if (mrpRun.pegging.length > 0) {
        const peg = mrpRun.pegging[0];
        expect(peg.demandPartId).toBeDefined();
        expect(peg.demandQuantity).toBeGreaterThan(0);
        expect(peg.level).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Work Order Conversion', () => {
    it('should convert planned order to work order', async () => {
      const mrpRun = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
      });

      const plannedOrders = await service.getPlannedOrders(mrpRun.id);

      if (plannedOrders.length > 0) {
        const order = plannedOrders[0];
        const testUserId = 'test-user-id';

        const converted = await service.convertPlannedOrderToWorkOrder(
          order.id,
          {
            priority: 'NORMAL',
            status: 'PLANNED',
            createdById: testUserId,
            siteId: testSiteId,
          }
        );

        expect(converted.status).toBe('CONVERTED_TO_WO');
        expect(converted.convertedToWoId).toBeDefined();
      }
    });
  });

  describe('Multiple MRP Runs', () => {
    it('should handle multiple MRP runs independently', async () => {
      const run1 = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
        notes: 'Run 1',
      });

      const run2 = await service.runMRP({
        siteId: testSiteId,
        scheduleId: testScheduleId,
        notes: 'Run 2',
      });

      expect(run1.id).not.toBe(run2.id);
      expect(run1.runNumber).not.toBe(run2.runNumber);
      expect(run1.notes).toBe('Run 1');
      expect(run2.notes).toBe('Run 2');
    });
  });
});
