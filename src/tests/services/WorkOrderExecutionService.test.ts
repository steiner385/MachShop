import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkOrderExecutionService } from '../../services/WorkOrderExecutionService';
import type { PrismaClient, WorkOrderStatus, WorkPerformanceType, VarianceType } from '@prisma/client';

// Mock Prisma Client with actual enums preserved
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    workOrder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    dispatchLog: {
      create: vi.fn(),
      count: vi.fn(),
    },
    workOrderStatusHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    workPerformance: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    productionVariance: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    workCenter: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('WorkOrderExecutionService', () => {
  let executionService: WorkOrderExecutionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      workOrder: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      dispatchLog: {
        create: vi.fn(),
        count: vi.fn(),
      },
      workOrderStatusHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      workPerformance: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
        aggregate: vi.fn(),
      },
      productionVariance: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        aggregate: vi.fn(),
      },
      workCenter: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    executionService = new WorkOrderExecutionService(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  // ========================================================================
  // WORK ORDER DISPATCHING
  // ========================================================================

  describe('dispatchWorkOrder', () => {
    it('should dispatch work order from CREATED to RELEASED with transaction', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'CREATED',
        quantity: 100,
        quantityCompleted: 0,
        quantityScrapped: 0,
        part: { partNumber: 'PN-001' },
        site: { siteName: 'Factory A' },
      };

      const mockDispatchLog = {
        id: 'dispatch-1',
        workOrderId: 'wo-1',
        dispatchedBy: 'operator@example.com',
        quantityDispatched: 100,
      };

      const mockUpdatedWorkOrder = {
        ...mockWorkOrder,
        status: 'RELEASED',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          dispatchLog: { create: vi.fn().mockResolvedValue(mockDispatchLog) },
          workOrder: { update: vi.fn().mockResolvedValue(mockUpdatedWorkOrder) },
          workOrderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      const result = await executionService.dispatchWorkOrder({
        workOrderId: 'wo-1',
        dispatchedBy: 'operator@example.com',
        workCenterId: 'wc-1',
        dispatchNotes: 'Standard dispatch',
      });

      expect(mockPrisma.workOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'wo-1' },
        include: { part: true, site: true },
      });

      expect(result.dispatchLog.workOrderId).toBe('wo-1');
      expect(result.workOrder.status).toBe('RELEASED');
    });

    it('should create dispatch log with all metadata', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'CREATED',
        quantity: 100,
        quantityCompleted: 0,
        quantityScrapped: 0,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          dispatchLog: {
            create: vi.fn().mockResolvedValue({
              id: 'dispatch-1',
              workOrderId: 'wo-1',
              dispatchedBy: 'operator@example.com',
              assignedToId: 'user-1',
              workCenterId: 'wc-1',
              priorityOverride: 'HIGH',
            }),
          },
          workOrder: { update: vi.fn().mockResolvedValue({ status: 'RELEASED' }) },
          workOrderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      const result = await executionService.dispatchWorkOrder({
        workOrderId: 'wo-1',
        dispatchedBy: 'operator@example.com',
        assignedToId: 'user-1',
        workCenterId: 'wc-1',
        priorityOverride: 'HIGH',
        dispatchNotes: 'Urgent dispatch',
      });

      expect(result.dispatchLog).toBeDefined();
    });

    it('should create status history record during dispatch', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'CREATED',
        quantity: 100,
        quantityCompleted: 0,
        quantityScrapped: 0,
      };

      const mockStatusHistory = {
        id: 'history-1',
        workOrderId: 'wo-1',
        previousStatus: 'CREATED',
        newStatus: 'RELEASED',
        reason: 'Work order dispatched to shop floor',
        changedBy: 'operator@example.com',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          dispatchLog: { create: vi.fn().mockResolvedValue({}) },
          workOrder: { update: vi.fn().mockResolvedValue({ status: 'RELEASED' }) },
          workOrderStatusHistory: { create: vi.fn().mockResolvedValue(mockStatusHistory) },
        };
        return callback(tx);
      });

      await executionService.dispatchWorkOrder({
        workOrderId: 'wo-1',
        dispatchedBy: 'operator@example.com',
      });

      // Transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error when work order not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        executionService.dispatchWorkOrder({
          workOrderId: 'non-existent',
          dispatchedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Work order non-existent not found');
    });

    it('should throw error when work order not in CREATED status', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        status: 'RELEASED',
      });

      await expect(
        executionService.dispatchWorkOrder({
          workOrderId: 'wo-1',
          dispatchedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Work order wo-1 cannot be dispatched. Current status: RELEASED. Only CREATED work orders can be dispatched.');
    });
  });

  describe('getWorkOrdersReadyForDispatch', () => {
    it('should get work orders ready for dispatch (CREATED status only)', async () => {
      const mockWorkOrders = [
        {
          id: 'wo-1',
          status: 'CREATED',
          priority: 'HIGH',
          dueDate: new Date('2025-01-15'),
          part: { partNumber: 'PN-001' },
          site: { siteName: 'Factory A' },
          routing: { operations: [] },
          createdBy: { id: 'user-1', username: 'planner' },
        },
        {
          id: 'wo-2',
          status: 'CREATED',
          priority: 'NORMAL',
          dueDate: new Date('2025-01-20'),
          part: { partNumber: 'PN-002' },
          site: { siteName: 'Factory A' },
          routing: { operations: [] },
          createdBy: { id: 'user-2', username: 'scheduler' },
        },
      ];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);

      const result = await executionService.getWorkOrdersReadyForDispatch();

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith({
        where: { status: 'CREATED' },
        include: expect.objectContaining({
          part: true,
          site: true,
          routing: expect.any(Object),
          createdBy: expect.any(Object),
        }),
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
          { createdAt: 'asc' },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('CREATED');
    });

    it('should filter work orders by site when provided', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await executionService.getWorkOrdersReadyForDispatch('site-1');

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith({
        where: {
          status: 'CREATED',
          siteId: 'site-1',
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should order ready work orders by priority, due date, created date', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await executionService.getWorkOrdersReadyForDispatch();

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { priority: 'desc' },
            { dueDate: 'asc' },
            { createdAt: 'asc' },
          ],
        })
      );
    });
  });

  // ========================================================================
  // STATUS TRANSITION MANAGEMENT
  // ========================================================================

  describe('transitionWorkOrderStatus', () => {
    it('should transition CREATED → RELEASED', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'CREATED',
        quantityCompleted: 0,
        quantityScrapped: 0,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockResolvedValue({ ...mockWorkOrder, status: 'RELEASED' }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({
              previousStatus: 'CREATED',
              newStatus: 'RELEASED',
            }),
          },
        };
        return callback(tx);
      });

      const result = await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'RELEASED' as WorkOrderStatus,
        reason: 'Dispatch to shop floor',
        changedBy: 'operator@example.com',
      });

      expect(result.workOrder.status).toBe('RELEASED');
      expect(result.statusHistory.newStatus).toBe('RELEASED');
    });

    it('should transition RELEASED → IN_PROGRESS', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'RELEASED',
        quantityCompleted: 0,
        quantityScrapped: 0,
        startedAt: null,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockResolvedValue({
              ...mockWorkOrder,
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({
              previousStatus: 'RELEASED',
              newStatus: 'IN_PROGRESS',
            }),
          },
        };
        return callback(tx);
      });

      const result = await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'IN_PROGRESS' as WorkOrderStatus,
        reason: 'Production started',
        changedBy: 'operator@example.com',
      });

      expect(result.workOrder.status).toBe('IN_PROGRESS');
    });

    it('should transition IN_PROGRESS → COMPLETED', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
        quantityCompleted: 100,
        quantityScrapped: 5,
        completedAt: null,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockResolvedValue({
              ...mockWorkOrder,
              status: 'COMPLETED',
              completedAt: new Date(),
            }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({
              previousStatus: 'IN_PROGRESS',
              newStatus: 'COMPLETED',
            }),
          },
        };
        return callback(tx);
      });

      const result = await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'COMPLETED' as WorkOrderStatus,
        reason: 'Production finished',
        changedBy: 'operator@example.com',
      });

      expect(result.workOrder.status).toBe('COMPLETED');
    });

    it('should transition IN_PROGRESS → ON_HOLD', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
        quantityCompleted: 50,
        quantityScrapped: 2,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockResolvedValue({ ...mockWorkOrder, status: 'ON_HOLD' }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({
              previousStatus: 'IN_PROGRESS',
              newStatus: 'ON_HOLD',
            }),
          },
        };
        return callback(tx);
      });

      const result = await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'ON_HOLD' as WorkOrderStatus,
        reason: 'Material shortage',
        changedBy: 'supervisor@example.com',
      });

      expect(result.workOrder.status).toBe('ON_HOLD');
    });

    it('should transition ON_HOLD → IN_PROGRESS', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'ON_HOLD',
        quantityCompleted: 50,
        quantityScrapped: 2,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockResolvedValue({ ...mockWorkOrder, status: 'IN_PROGRESS' }),
          },
          workOrderStatusHistory: {
            create: vi.fn().mockResolvedValue({
              previousStatus: 'ON_HOLD',
              newStatus: 'IN_PROGRESS',
            }),
          },
        };
        return callback(tx);
      });

      const result = await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'IN_PROGRESS' as WorkOrderStatus,
        reason: 'Material received, resuming production',
        changedBy: 'operator@example.com',
      });

      expect(result.workOrder.status).toBe('IN_PROGRESS');
    });

    it('should set startedAt when transitioning to IN_PROGRESS', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'RELEASED',
        quantityCompleted: 0,
        quantityScrapped: 0,
        startedAt: null,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockImplementation((args) => {
              expect(args.data.startedAt).toBeInstanceOf(Date);
              expect(args.data.actualStartDate).toBeInstanceOf(Date);
              return Promise.resolve({ status: 'IN_PROGRESS' });
            }),
          },
          workOrderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'IN_PROGRESS' as WorkOrderStatus,
        changedBy: 'operator@example.com',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should set completedAt when transitioning to COMPLETED', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
        quantityCompleted: 100,
        quantityScrapped: 0,
        completedAt: null,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: {
            update: vi.fn().mockImplementation((args) => {
              expect(args.data.completedAt).toBeInstanceOf(Date);
              expect(args.data.actualEndDate).toBeInstanceOf(Date);
              return Promise.resolve({ status: 'COMPLETED' });
            }),
          },
          workOrderStatusHistory: { create: vi.fn().mockResolvedValue({}) },
        };
        return callback(tx);
      });

      await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'COMPLETED' as WorkOrderStatus,
        changedBy: 'operator@example.com',
      });

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error for invalid transitions (e.g., COMPLETED → IN_PROGRESS)', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        status: 'COMPLETED',
      });

      await expect(
        executionService.transitionWorkOrderStatus({
          workOrderId: 'wo-1',
          newStatus: 'IN_PROGRESS' as WorkOrderStatus,
          changedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Invalid status transition: COMPLETED → IN_PROGRESS');
    });

    it('should validate terminal states (COMPLETED, CANCELLED cannot transition)', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        status: 'CANCELLED',
      });

      await expect(
        executionService.transitionWorkOrderStatus({
          workOrderId: 'wo-1',
          newStatus: 'RELEASED' as WorkOrderStatus,
          changedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Invalid status transition: CANCELLED → RELEASED');
    });

    it('should create status history for each transition', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'RELEASED',
        quantityCompleted: 0,
        quantityScrapped: 0,
      };

      const mockStatusHistory = {
        id: 'history-1',
        workOrderId: 'wo-1',
        previousStatus: 'RELEASED',
        newStatus: 'IN_PROGRESS',
        reason: 'Production started',
        changedBy: 'operator@example.com',
        quantityAtTransition: 0,
        scrapAtTransition: 0,
        notes: 'Starting production shift 1',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.$transaction.mockImplementation(async (callback) => {
        const tx = {
          workOrder: { update: vi.fn().mockResolvedValue({ status: 'IN_PROGRESS' }) },
          workOrderStatusHistory: { create: vi.fn().mockResolvedValue(mockStatusHistory) },
        };
        return callback(tx);
      });

      const result = await executionService.transitionWorkOrderStatus({
        workOrderId: 'wo-1',
        newStatus: 'IN_PROGRESS' as WorkOrderStatus,
        reason: 'Production started',
        changedBy: 'operator@example.com',
        notes: 'Starting production shift 1',
      });

      expect(result.statusHistory.previousStatus).toBe('RELEASED');
      expect(result.statusHistory.newStatus).toBe('IN_PROGRESS');
    });
  });

  // ========================================================================
  // WORK PERFORMANCE ACTUALS CAPTURE
  // ========================================================================

  describe('recordWorkPerformance', () => {
    it('should record LABOR performance with efficiency calculation', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      const mockPerformanceRecord = {
        id: 'perf-1',
        workOrderId: 'wo-1',
        performanceType: 'LABOR',
        recordedBy: 'operator@example.com',
        laborHours: 7.5,
        laborEfficiency: (8 / 7.5) * 100, // 106.67%
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue(mockPerformanceRecord);
      mockPrisma.productionVariance.create.mockResolvedValue({}); // For auto-variance

      const result = await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'LABOR' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        personnelId: 'user-1',
        laborHours: 7.5,
      });

      expect(mockPrisma.workPerformance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: 'wo-1',
          performanceType: 'LABOR',
          laborHours: 7.5,
          laborEfficiency: expect.closeTo(106.67, 0.1),
        }),
      });

      expect(result.laborEfficiency).toBeCloseTo(106.67, 0.1);
    });

    it('should record MATERIAL performance with variance calculation', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-2',
        performanceType: 'MATERIAL',
        quantityConsumed: 95,
        quantityPlanned: 100,
        materialVariance: 5, // Favorable
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      const result = await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        partId: 'part-1',
        quantityConsumed: 95,
        quantityPlanned: 100,
        unitCost: 10.5,
      });

      expect(result.materialVariance).toBe(5);
    });

    it('should record EQUIPMENT performance', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-3',
        performanceType: 'EQUIPMENT',
        equipmentId: 'eq-1',
        setupTime: 30,
        runTime: 120,
        plannedSetupTime: 45,
        plannedRunTime: 120,
      });

      const result = await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'EQUIPMENT' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        equipmentId: 'eq-1',
        setupTime: 30,
        runTime: 120,
        plannedSetupTime: 45,
        plannedRunTime: 120,
      });

      expect(result.performanceType).toBe('EQUIPMENT');
      expect(result.setupTime).toBe(30);
    });

    it('should record QUALITY performance with yield percentage', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-4',
        performanceType: 'QUALITY',
        quantityProduced: 100,
        quantityGood: 95,
        quantityScrap: 3,
        quantityRework: 2,
        yieldPercentage: 95,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      const result = await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'QUALITY' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityProduced: 100,
        quantityGood: 95,
        quantityScrap: 3,
        quantityRework: 2,
      });

      expect(result.yieldPercentage).toBe(95);
    });

    it('should record DOWNTIME performance', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-5',
        performanceType: 'DOWNTIME',
        downtimeMinutes: 45,
        downtimeReason: 'Machine breakdown',
        downtimeCategory: 'UNPLANNED',
      });

      const result = await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'DOWNTIME' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        downtimeMinutes: 45,
        downtimeReason: 'Machine breakdown',
        downtimeCategory: 'UNPLANNED',
      });

      expect(result.performanceType).toBe('DOWNTIME');
      expect(result.downtimeMinutes).toBe(45);
    });

    it('should throw error when work order not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        executionService.recordWorkPerformance({
          workOrderId: 'non-existent',
          performanceType: 'LABOR' as WorkPerformanceType,
          recordedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Work order non-existent not found');
    });

    it('should throw error when work order not IN_PROGRESS or COMPLETED', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue({
        id: 'wo-1',
        status: 'CREATED',
      });

      await expect(
        executionService.recordWorkPerformance({
          workOrderId: 'wo-1',
          performanceType: 'LABOR' as WorkPerformanceType,
          recordedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Cannot record performance for work order wo-1. Status: CREATED. Work order must be IN_PROGRESS or COMPLETED.');
    });

    it('should auto-calculate labor variance after LABOR performance', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      const mockPerformanceRecord = {
        id: 'perf-labor-1',
        workOrderId: 'wo-1',
        performanceType: 'LABOR',
        laborHours: 10,
        laborEfficiency: 80,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue(mockPerformanceRecord);
      mockPrisma.productionVariance.create.mockResolvedValue({
        varianceType: 'EFFICIENCY',
        variance: -2, // Unfavorable (10 actual > 8 standard)
        isFavorable: false,
      });

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'LABOR' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        laborHours: 10,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: 'wo-1',
          varianceType: 'EFFICIENCY',
          plannedValue: 8,
          actualValue: 10,
          variance: -2,
          isFavorable: false,
        }),
      });
    });

    it('should auto-calculate material variance after MATERIAL performance', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      const mockPerformanceRecord = {
        id: 'perf-mat-1',
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL',
        quantityConsumed: 105,
        quantityPlanned: 100,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue(mockPerformanceRecord);
      mockPrisma.productionVariance.create.mockResolvedValue({
        varianceType: 'MATERIAL',
        variance: -5, // Unfavorable (consumed more than planned)
        isFavorable: false,
      });

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityConsumed: 105,
        quantityPlanned: 100,
        unitCost: 15.5,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: 'wo-1',
          varianceType: 'MATERIAL',
          plannedValue: 100,
          actualValue: 105,
          variance: -5,
          isFavorable: false,
          costImpact: 77.5, // 5 * 15.5
        }),
      });
    });

    it('should auto-calculate yield variance after QUALITY performance', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        status: 'IN_PROGRESS',
      };

      const mockPerformanceRecord = {
        id: 'perf-qual-1',
        workOrderId: 'wo-1',
        performanceType: 'QUALITY',
        quantityProduced: 100,
        quantityGood: 92,
        yieldPercentage: 92,
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue(mockPerformanceRecord);
      mockPrisma.productionVariance.create.mockResolvedValue({
        varianceType: 'YIELD',
        variance: -8, // 92% - 100% = -8%
        isFavorable: false,
      });

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'QUALITY' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityProduced: 100,
        quantityGood: 92,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workOrderId: 'wo-1',
          varianceType: 'YIELD',
          plannedValue: 100,
          actualValue: 92,
          variance: -8,
          isFavorable: false,
        }),
      });
    });
  });

  describe('getWorkPerformanceRecords', () => {
    it('should get performance records filtered by type', async () => {
      const mockRecords = [
        {
          id: 'perf-1',
          workOrderId: 'wo-1',
          performanceType: 'LABOR',
          recordedAt: new Date('2025-01-15T08:00:00Z'),
          personnel: { id: 'user-1', username: 'operator1' },
        },
        {
          id: 'perf-2',
          workOrderId: 'wo-1',
          performanceType: 'LABOR',
          recordedAt: new Date('2025-01-15T16:00:00Z'),
          personnel: { id: 'user-2', username: 'operator2' },
        },
      ];

      mockPrisma.workPerformance.findMany.mockResolvedValue(mockRecords);

      const result = await executionService.getWorkPerformanceRecords('wo-1', 'LABOR' as WorkPerformanceType);

      expect(mockPrisma.workPerformance.findMany).toHaveBeenCalledWith({
        where: {
          workOrderId: 'wo-1',
          performanceType: 'LABOR',
        },
        include: {
          personnel: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { recordedAt: 'desc' },
      });

      expect(result).toHaveLength(2);
    });

    it('should get all performance records for work order', async () => {
      const mockRecords = [
        { id: 'perf-1', performanceType: 'LABOR', personnel: {} },
        { id: 'perf-2', performanceType: 'MATERIAL', personnel: {} },
        { id: 'perf-3', performanceType: 'QUALITY', personnel: {} },
      ];

      mockPrisma.workPerformance.findMany.mockResolvedValue(mockRecords);

      const result = await executionService.getWorkPerformanceRecords('wo-1');

      expect(mockPrisma.workPerformance.findMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-1' },
        include: expect.any(Object),
        orderBy: { recordedAt: 'desc' },
      });

      expect(result).toHaveLength(3);
    });
  });

  // ========================================================================
  // VARIANCE CALCULATION
  // ========================================================================

  describe('Variance Calculation', () => {
    it('should auto-calculate favorable labor variance (actual < standard)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        laborHours: 7,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({
        varianceType: 'EFFICIENCY',
        variance: 1, // 8 - 7 = 1 (favorable)
        isFavorable: true,
        costImpact: 50,
      });

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'LABOR' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        laborHours: 7,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variance: 1,
          isFavorable: true,
          costImpact: 50,
        }),
      });
    });

    it('should auto-calculate unfavorable labor variance (actual > standard)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        laborHours: 10,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({
        varianceType: 'EFFICIENCY',
        variance: -2, // 8 - 10 = -2 (unfavorable)
        isFavorable: false,
        costImpact: 100,
      });

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'LABOR' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        laborHours: 10,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variance: -2,
          isFavorable: false,
        }),
      });
    });

    it('should calculate labor cost impact ($50/hr assumed)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        laborHours: 10,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'LABOR' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        laborHours: 10,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          costImpact: 100, // |8 - 10| * $50 = 2 * $50 = $100
        }),
      });
    });

    it('should auto-calculate favorable material variance (actual < planned)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        quantityConsumed: 95,
        quantityPlanned: 100,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityConsumed: 95,
        quantityPlanned: 100,
        unitCost: 10,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variance: 5, // 100 - 95 = 5 (favorable)
          isFavorable: true,
        }),
      });
    });

    it('should auto-calculate unfavorable material variance (actual > planned)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        quantityConsumed: 105,
        quantityPlanned: 100,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityConsumed: 105,
        quantityPlanned: 100,
        unitCost: 12,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          variance: -5, // 100 - 105 = -5 (unfavorable)
          isFavorable: false,
        }),
      });
    });

    it('should calculate material cost impact with unit cost', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        quantityConsumed: 110,
        quantityPlanned: 100,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityConsumed: 110,
        quantityPlanned: 100,
        unitCost: 15.5,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          costImpact: 155, // |100 - 110| * 15.5 = 10 * 15.5 = 155
        }),
      });
    });

    it('should calculate material variance without cost impact when unitCost missing', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        quantityConsumed: 95,
        quantityPlanned: 100,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'MATERIAL' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityConsumed: 95,
        quantityPlanned: 100,
        // No unitCost provided
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          costImpact: undefined,
        }),
      });
    });

    it('should auto-calculate favorable yield variance (100% yield)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        quantityProduced: 100,
        quantityGood: 100,
        yieldPercentage: 100,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'QUALITY' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityProduced: 100,
        quantityGood: 100,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          varianceType: 'YIELD',
          actualValue: 100,
          variance: 0,
          isFavorable: true,
        }),
      });
    });

    it('should auto-calculate unfavorable yield variance (scrap/rework)', async () => {
      const mockWorkOrder = { id: 'wo-1', status: 'IN_PROGRESS' };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.workPerformance.create.mockResolvedValue({
        id: 'perf-1',
        quantityProduced: 100,
        quantityGood: 88,
        yieldPercentage: 88,
      });
      mockPrisma.productionVariance.create.mockResolvedValue({});

      await executionService.recordWorkPerformance({
        workOrderId: 'wo-1',
        performanceType: 'QUALITY' as WorkPerformanceType,
        recordedBy: 'operator@example.com',
        quantityProduced: 100,
        quantityGood: 88,
      });

      expect(mockPrisma.productionVariance.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          varianceType: 'YIELD',
          actualValue: 88,
          variance: -12,
          isFavorable: false,
        }),
      });
    });
  });

  describe('getProductionVariances', () => {
    it('should get variances by work order ID', async () => {
      const mockVariances = [
        {
          id: 'var-1',
          workOrderId: 'wo-1',
          varianceType: 'EFFICIENCY',
          variance: -2,
          isFavorable: false,
        },
        {
          id: 'var-2',
          workOrderId: 'wo-1',
          varianceType: 'MATERIAL',
          variance: 5,
          isFavorable: true,
        },
      ];

      mockPrisma.productionVariance.findMany.mockResolvedValue(mockVariances);

      const result = await executionService.getProductionVariances('wo-1');

      expect(mockPrisma.productionVariance.findMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-1' },
        orderBy: { calculatedAt: 'desc' },
      });

      expect(result).toHaveLength(2);
    });

    it('should filter variances by type', async () => {
      const mockVariances = [
        {
          id: 'var-1',
          workOrderId: 'wo-1',
          varianceType: 'EFFICIENCY',
          variance: -2,
        },
      ];

      mockPrisma.productionVariance.findMany.mockResolvedValue(mockVariances);

      const result = await executionService.getProductionVariances('wo-1', 'EFFICIENCY' as VarianceType);

      expect(mockPrisma.productionVariance.findMany).toHaveBeenCalledWith({
        where: {
          workOrderId: 'wo-1',
          varianceType: 'EFFICIENCY',
        },
        orderBy: { calculatedAt: 'desc' },
      });

      expect(result).toHaveLength(1);
    });
  });

  describe('calculateVarianceSummary', () => {
    it('should calculate variance summary with type breakdown', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        workPerformance: [],
        variances: [
          {
            varianceType: 'EFFICIENCY',
            variance: -2,
            variancePercent: -25,
            isFavorable: false,
            costImpact: 100,
          },
          {
            varianceType: 'MATERIAL',
            variance: 5,
            variancePercent: 5,
            isFavorable: true,
            costImpact: 50,
          },
          {
            varianceType: 'YIELD',
            variance: -8,
            variancePercent: -8,
            isFavorable: false,
            costImpact: 0,
          },
        ],
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      const result = await executionService.calculateVarianceSummary('wo-1');

      expect(result.totalVariances).toBe(3);
      expect(result.favorableVariances).toBe(1);
      expect(result.unfavorableVariances).toBe(2);
      expect(result.totalCostImpact).toBe(150);
    });

    it('should aggregate favorable/unfavorable counts', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        workPerformance: [],
        variances: [
          { varianceType: 'EFFICIENCY', isFavorable: false, costImpact: 100, variance: -2, variancePercent: -25 },
          { varianceType: 'EFFICIENCY', isFavorable: true, costImpact: 50, variance: 1, variancePercent: 12.5 },
          { varianceType: 'MATERIAL', isFavorable: true, costImpact: 75, variance: 5, variancePercent: 5 },
        ],
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      const result = await executionService.calculateVarianceSummary('wo-1');

      expect(result.byType.EFFICIENCY).toEqual({
        count: 2,
        totalVariance: -1, // -2 + 1
        averageVariancePercent: -6.25, // (-25 + 12.5) / 2
        favorableCount: 1,
        unfavorableCount: 1,
        totalCostImpact: 150,
      });
    });

    it('should calculate total cost impact', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        workPerformance: [],
        variances: [
          { varianceType: 'EFFICIENCY', isFavorable: false, costImpact: 200, variance: -4, variancePercent: -50 },
          { varianceType: 'MATERIAL', isFavorable: false, costImpact: 150, variance: -10, variancePercent: -10 },
          { varianceType: 'YIELD', isFavorable: true, costImpact: null, variance: 2, variancePercent: 2 },
        ],
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      const result = await executionService.calculateVarianceSummary('wo-1');

      expect(result.totalCostImpact).toBe(350);
    });

    it('should handle work order with no variances', async () => {
      const mockWorkOrder = {
        id: 'wo-1',
        workPerformance: [],
        variances: [],
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);

      const result = await executionService.calculateVarianceSummary('wo-1');

      expect(result.totalVariances).toBe(0);
      expect(result.favorableVariances).toBe(0);
      expect(result.unfavorableVariances).toBe(0);
      expect(result.totalCostImpact).toBe(0);
    });
  });

  // ========================================================================
  // DASHBOARD STATISTICS
  // ========================================================================

  describe('getExecutionDashboard', () => {
    it('should calculate status counts (CREATED, RELEASED, IN_PROGRESS, etc.)', async () => {
      const mockWorkOrders = [
        { status: 'CREATED', priority: 'NORMAL' },
        { status: 'CREATED', priority: 'HIGH' },
        { status: 'RELEASED', priority: 'NORMAL' },
        { status: 'IN_PROGRESS', priority: 'HIGH' },
        { status: 'COMPLETED', priority: 'NORMAL' },
      ];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(15);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([]);
      mockPrisma.productionVariance.count.mockResolvedValue(10);
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 500 } });

      const result = await executionService.getExecutionDashboard();

      expect(result.statusCounts).toEqual({
        CREATED: 2,
        RELEASED: 1,
        IN_PROGRESS: 1,
        ON_HOLD: 0,
        COMPLETED: 1,
        CANCELLED: 0,
      });
    });

    it('should calculate priority counts (LOW, NORMAL, HIGH, URGENT)', async () => {
      const mockWorkOrders = [
        { status: 'CREATED', priority: 'LOW' },
        { status: 'RELEASED', priority: 'NORMAL' },
        { status: 'IN_PROGRESS', priority: 'HIGH' },
        { status: 'IN_PROGRESS', priority: 'URGENT' },
      ];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(0);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([]);
      mockPrisma.productionVariance.count.mockResolvedValue(0);
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 0 } });

      const result = await executionService.getExecutionDashboard();

      expect(result.priorityCounts).toEqual({
        LOW: 1,
        NORMAL: 1,
        HIGH: 1,
        URGENT: 1,
      });
    });

    it('should calculate completion rate', async () => {
      const mockWorkOrders = [
        { status: 'CREATED', priority: 'NORMAL' },
        { status: 'IN_PROGRESS', priority: 'NORMAL' },
        { status: 'COMPLETED', priority: 'NORMAL' },
        { status: 'COMPLETED', priority: 'HIGH' },
      ];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(0);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([]);
      mockPrisma.productionVariance.count.mockResolvedValue(0);
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 0 } });

      const result = await executionService.getExecutionDashboard();

      expect(result.completionRate).toBe(50); // 2 completed out of 4 total = 50%
    });

    it('should aggregate performance records by type', async () => {
      const mockWorkOrders = [];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(25);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([
        { performanceType: 'LABOR', _count: 10 },
        { performanceType: 'MATERIAL', _count: 8 },
        { performanceType: 'QUALITY', _count: 7 },
      ]);
      mockPrisma.productionVariance.count.mockResolvedValue(0);
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 0 } });

      const result = await executionService.getExecutionDashboard();

      expect(result.performance.totalRecords).toBe(25);
      expect(result.performance.byType).toEqual({
        LABOR: 10,
        MATERIAL: 8,
        QUALITY: 7,
      });
    });

    it('should aggregate variances (total, favorable, unfavorable)', async () => {
      const mockWorkOrders = [];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(0);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([]);
      mockPrisma.productionVariance.count
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(12) // favorable
        .mockResolvedValueOnce(8); // unfavorable
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 750 } });

      const result = await executionService.getExecutionDashboard();

      expect(result.variances.total).toBe(20);
      expect(result.variances.favorable).toBe(12);
      expect(result.variances.unfavorable).toBe(8);
    });

    it('should calculate total cost impact from variances', async () => {
      const mockWorkOrders = [];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(0);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([]);
      mockPrisma.productionVariance.count.mockResolvedValue(10);
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 1250.75 } });

      const result = await executionService.getExecutionDashboard();

      expect(result.variances.totalCostImpact).toBe(1250.75);
    });

    it('should filter dashboard by site', async () => {
      const mockWorkOrders = [];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);
      mockPrisma.workPerformance.count.mockResolvedValue(0);
      mockPrisma.workPerformance.groupBy.mockResolvedValue([]);
      mockPrisma.productionVariance.count.mockResolvedValue(0);
      mockPrisma.productionVariance.aggregate.mockResolvedValue({ _sum: { costImpact: 0 } });

      await executionService.getExecutionDashboard('site-1');

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith({
        where: { siteId: 'site-1' },
      });
    });
  });

  // ========================================================================
  // QUERY OPERATIONS
  // ========================================================================

  describe('getWorkOrderStatusHistory', () => {
    it('should get status history ordered by transition date', async () => {
      const mockHistory = [
        {
          id: 'history-1',
          workOrderId: 'wo-1',
          previousStatus: 'CREATED',
          newStatus: 'RELEASED',
          transitionDate: new Date('2025-01-10T08:00:00Z'),
        },
        {
          id: 'history-2',
          workOrderId: 'wo-1',
          previousStatus: 'RELEASED',
          newStatus: 'IN_PROGRESS',
          transitionDate: new Date('2025-01-10T10:00:00Z'),
        },
      ];

      mockPrisma.workOrderStatusHistory.findMany.mockResolvedValue(mockHistory);

      const result = await executionService.getWorkOrderStatusHistory('wo-1');

      expect(mockPrisma.workOrderStatusHistory.findMany).toHaveBeenCalledWith({
        where: { workOrderId: 'wo-1' },
        orderBy: { transitionDate: 'asc' },
      });

      expect(result).toHaveLength(2);
    });

    it('should return empty array when no status history', async () => {
      mockPrisma.workOrderStatusHistory.findMany.mockResolvedValue([]);

      const result = await executionService.getWorkOrderStatusHistory('wo-new');

      expect(result).toEqual([]);
    });
  });

  describe('getWorkOrdersByStatus', () => {
    it('should get work orders filtered by status', async () => {
      const mockWorkOrders = [
        {
          id: 'wo-1',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          part: { partNumber: 'PN-001' },
          site: { siteName: 'Factory A' },
          assignedTo: { id: 'user-1', username: 'operator1' },
        },
      ];

      mockPrisma.workOrder.findMany.mockResolvedValue(mockWorkOrders);

      const result = await executionService.getWorkOrdersByStatus('IN_PROGRESS' as WorkOrderStatus);

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith({
        where: { status: 'IN_PROGRESS' },
        include: expect.objectContaining({
          part: true,
          site: true,
          assignedTo: expect.any(Object),
        }),
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' },
        ],
      });

      expect(result).toHaveLength(1);
    });

    it('should get work orders filtered by site', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      await executionService.getWorkOrdersByStatus('IN_PROGRESS' as WorkOrderStatus, 'site-1');

      expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith({
        where: {
          status: 'IN_PROGRESS',
          siteId: 'site-1',
        },
        include: expect.any(Object),
        orderBy: expect.any(Array),
      });
    });

    it('should return empty array when no work orders match status', async () => {
      mockPrisma.workOrder.findMany.mockResolvedValue([]);

      const result = await executionService.getWorkOrdersByStatus('CANCELLED' as WorkOrderStatus);

      expect(result).toEqual([]);
    });
  });

  // ========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ========================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle work order with no performance records', async () => {
      mockPrisma.workPerformance.findMany.mockResolvedValue([]);

      const result = await executionService.getWorkPerformanceRecords('wo-empty');

      expect(result).toEqual([]);
    });

    it('should handle work order with no variances', async () => {
      mockPrisma.productionVariance.findMany.mockResolvedValue([]);

      const result = await executionService.getProductionVariances('wo-no-variances');

      expect(result).toEqual([]);
    });

    it('should throw error when transitioning non-existent work order', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        executionService.transitionWorkOrderStatus({
          workOrderId: 'non-existent',
          newStatus: 'IN_PROGRESS' as WorkOrderStatus,
          changedBy: 'operator@example.com',
        })
      ).rejects.toThrow('Work order non-existent not found');
    });

    it('should validate ISA-95 state machine strictly', async () => {
      // Test all invalid transitions
      const invalidTransitions = [
        { from: 'CREATED', to: 'COMPLETED' },
        { from: 'RELEASED', to: 'CREATED' },
        { from: 'COMPLETED', to: 'IN_PROGRESS' },
        { from: 'CANCELLED', to: 'RELEASED' },
      ];

      for (const { from, to } of invalidTransitions) {
        mockPrisma.workOrder.findUnique.mockResolvedValue({
          id: 'wo-1',
          status: from,
        });

        await expect(
          executionService.transitionWorkOrderStatus({
            workOrderId: 'wo-1',
            newStatus: to as WorkOrderStatus,
            changedBy: 'operator@example.com',
          })
        ).rejects.toThrow(`Invalid status transition: ${from} → ${to}`);
      }
    });

    it('should handle variance summary for work order not found', async () => {
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        executionService.calculateVarianceSummary('non-existent')
      ).rejects.toThrow('Work order non-existent not found');
    });
  });
});
