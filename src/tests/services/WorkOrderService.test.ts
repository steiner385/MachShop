import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach } from 'vitest';
import { WorkOrderService } from '@/services/WorkOrderService';
import { 
  WorkOrderStatus, 
  WorkOrderPriority, 
  CreateWorkOrderRequest,
  WorkOrder 
} from '@/types/workOrder';
import { PrismaClient } from '@prisma/client';
import { setupTestDatabase, seedTestData, cleanupTestData, teardownTestDatabase } from '../helpers/database';

describe('WorkOrderService', () => {
  let workOrderService: WorkOrderService;
  let testDb: PrismaClient;
  let testUserId: string;
  let testPartId: string;
  let testRoutingId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    workOrderService = new WorkOrderService();
    
    // Seed test data
    const { testUser, testPart, testRouting } = await seedTestData(testDb);
    testUserId = testUser.id;
    testPartId = testPart.id;
    testRoutingId = testRouting.id;
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
  });

  describe('generateWorkOrderNumber', () => {
    it('should generate a work order number with correct format', () => {
      const workOrderNumber = workOrderService.generateWorkOrderNumber('TEST');
      expect(workOrderNumber).toMatch(/^WO-TEST-\d{4}-\d{7}$/);
    });

    it('should generate unique work order numbers', () => {
      const number1 = workOrderService.generateWorkOrderNumber();
      const number2 = workOrderService.generateWorkOrderNumber();
      expect(number1).not.toBe(number2);
    });

    it('should use default site code when not provided', () => {
      const workOrderNumber = workOrderService.generateWorkOrderNumber();
      expect(workOrderNumber).toMatch(/^WO-MFG-\d{4}-\d{7}$/);
    });
  });

  describe('validateWorkOrder', () => {
    it('should return no errors for valid work order request', () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 10,
        priority: WorkOrderPriority.HIGH,
        siteId: 'site-123',
        dueDate: new Date('2025-12-31')
      };

      const errors = workOrderService.validateWorkOrder(request);
      expect(errors).toHaveLength(0);
    });

    it('should return error for missing part number', () => {
      const request: CreateWorkOrderRequest = {
        partNumber: '',
        quantityOrdered: 10,
        siteId: 'site-123'
      };

      const errors = workOrderService.validateWorkOrder(request);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('partNumber');
      expect(errors[0].code).toBe('REQUIRED_FIELD');
    });

    it('should return error for invalid quantity', () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: -5,
        siteId: 'site-123'
      };

      const errors = workOrderService.validateWorkOrder(request);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('quantityOrdered');
      expect(errors[0].code).toBe('INVALID_QUANTITY');
    });

    it('should return error for quantity exceeding limit', () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 15000,
        siteId: 'site-123'
      };

      const errors = workOrderService.validateWorkOrder(request);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('quantityOrdered');
      expect(errors[0].code).toBe('QUANTITY_LIMIT_EXCEEDED');
    });

    it('should return error for past due date', () => {
      const pastDate = new Date('2020-01-01');
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 10,
        siteId: 'site-123',
        dueDate: pastDate
      };

      const errors = workOrderService.validateWorkOrder(request);
      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('dueDate');
      expect(errors[0].code).toBe('INVALID_DATE');
    });

    it('should return multiple errors for multiple validation failures', () => {
      const request: CreateWorkOrderRequest = {
        partNumber: '',
        quantityOrdered: -1,
        siteId: ''
      };

      const errors = workOrderService.validateWorkOrder(request);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('createWorkOrder', () => {
    it('should create a work order with valid data', async () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 10,
        priority: WorkOrderPriority.HIGH,
        customerOrder: 'CO-2024-001',
        siteId: 'site-123'
      };

      const workOrder = await workOrderService.createWorkOrder(request, testUserId);

      expect(workOrder).toBeDefined();
      expect(workOrder.partNumber).toBe('TEST-PART-001');
      expect(workOrder.quantityOrdered).toBe(10);
      expect(workOrder.quantityCompleted).toBe(0);
      expect(workOrder.quantityScrapped).toBe(0);
      expect(workOrder.status).toBe(WorkOrderStatus.CREATED);
      expect(workOrder.priority).toBe(WorkOrderPriority.HIGH);
      expect(workOrder.customerOrder).toBe('CO-2024-001');
      expect(workOrder.createdBy).toBe('testuser');
      expect(workOrder.id).toBeTruthy();
      expect(workOrder.workOrderNumber).toBeTruthy();
    });

    it('should use default priority when not specified', async () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 10,
        siteId: 'site-123'
      };

      const workOrder = await workOrderService.createWorkOrder(request, testUserId);
      expect(workOrder.priority).toBe(WorkOrderPriority.NORMAL);
    });

    it('should throw error for invalid work order data', async () => {
      const request: CreateWorkOrderRequest = {
        partNumber: '',
        quantityOrdered: -1,
        siteId: 'site-123'
      };

      await expect(
        workOrderService.createWorkOrder(request, testUserId)
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateWorkOrder', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 10,
        siteId: 'site-123'
      };
      workOrder = await workOrderService.createWorkOrder(request, testUserId);
    });

    it('should update work order with valid data', async () => {
      const updates = {
        quantityOrdered: 15,
        priority: WorkOrderPriority.URGENT,
        customerOrder: 'CO-2024-002'
      };

      const updatedWorkOrder = await workOrderService.updateWorkOrder(
        workOrder, 
        updates, 
        'user-456'
      );

      expect(updatedWorkOrder.quantityOrdered).toBe(15);
      expect(updatedWorkOrder.priority).toBe(WorkOrderPriority.URGENT);
      expect(updatedWorkOrder.customerOrder).toBe('CO-2024-002');
      expect(updatedWorkOrder.updatedAt).not.toBe(workOrder.updatedAt);
    });

    it('should not allow updates to completed work orders', async () => {
      const completedWorkOrder = { ...workOrder, status: WorkOrderStatus.COMPLETED };
      const updates = { quantityOrdered: 15 };

      await expect(
        workOrderService.updateWorkOrder(completedWorkOrder, updates, 'user-456')
      ).rejects.toThrow('Cannot update completed work order');
    });

    it('should not allow updates to cancelled work orders', async () => {
      const cancelledWorkOrder = { ...workOrder, status: WorkOrderStatus.CANCELLED };
      const updates = { quantityOrdered: 15 };

      await expect(
        workOrderService.updateWorkOrder(cancelledWorkOrder, updates, 'user-456')
      ).rejects.toThrow('Cannot update cancelled work order');
    });

    it('should not allow quantity reduction below completed quantity', async () => {
      const partiallyCompletedWorkOrder = { 
        ...workOrder, 
        quantityCompleted: 5 
      };
      const updates = { quantityOrdered: 3 };

      await expect(
        workOrderService.updateWorkOrder(partiallyCompletedWorkOrder, updates, 'user-456')
      ).rejects.toThrow('Cannot reduce quantity below completed quantity');
    });

    it('should reject invalid quantity updates', async () => {
      const updates = { quantityOrdered: -5 };

      await expect(
        workOrderService.updateWorkOrder(workOrder, updates, 'user-456')
      ).rejects.toThrow('Quantity ordered must be greater than 0');
    });
  });

  describe('releaseWorkOrder', () => {
    let workOrder: WorkOrder;

    beforeEach(async () => {
      const request: CreateWorkOrderRequest = {
        partNumber: 'TEST-PART-001',
        quantityOrdered: 10,
        siteId: 'site-123'
      };
      workOrder = await workOrderService.createWorkOrder(request, testUserId);
      
      // Manually add routing ID to enable release
      await testDb.workOrder.update({
        where: { id: workOrder.id },
        data: { routingId: testRoutingId }
      });
      
      // Refresh the work order object to include routing
      workOrder = await workOrderService.getWorkOrderById(workOrder.id) || workOrder;
    });

    it('should release work order with CREATED status', async () => {
      const releasedWorkOrder = await workOrderService.releaseWorkOrder(
        workOrder, 
        testUserId
      );

      expect(releasedWorkOrder.status).toBe(WorkOrderStatus.RELEASED);
      expect(releasedWorkOrder.updatedAt).not.toBe(workOrder.updatedAt);
    });

    it('should not allow release of non-CREATED work orders', async () => {
      const releasedWorkOrder = { ...workOrder, status: WorkOrderStatus.RELEASED };

      await expect(
        workOrderService.releaseWorkOrder(releasedWorkOrder, 'user-456')
      ).rejects.toThrow('Cannot release work order with status: RELEASED');
    });
  });

  describe('calculateCompletionPercentage', () => {
    it('should calculate correct completion percentage', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 100,
        quantityCompleted: 25,
        quantityScrapped: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const percentage = workOrderService.calculateCompletionPercentage(workOrder);
      expect(percentage).toBe(25);
    });

    it('should return 0 for zero quantity ordered', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 0,
        quantityCompleted: 0,
        quantityScrapped: 0,
        status: WorkOrderStatus.CREATED,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const percentage = workOrderService.calculateCompletionPercentage(workOrder);
      expect(percentage).toBe(0);
    });
  });

  describe('isOverdue', () => {
    it('should return true for overdue work order', () => {
      const pastDate = new Date('2020-01-01');
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 10,
        quantityCompleted: 5,
        quantityScrapped: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.NORMAL,
        dueDate: pastDate,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const isOverdue = workOrderService.isOverdue(workOrder);
      expect(isOverdue).toBe(true);
    });

    it('should return false for work order without due date', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 10,
        quantityCompleted: 5,
        quantityScrapped: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const isOverdue = workOrderService.isOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });

    it('should return false for completed work order even if past due date', () => {
      const pastDate = new Date('2020-01-01');
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 10,
        quantityCompleted: 10,
        quantityScrapped: 0,
        status: WorkOrderStatus.COMPLETED,
        priority: WorkOrderPriority.NORMAL,
        dueDate: pastDate,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const isOverdue = workOrderService.isOverdue(workOrder);
      expect(isOverdue).toBe(false);
    });
  });

  describe('calculateEstimatedCompletion', () => {
    it('should calculate estimated completion date', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 100,
        quantityCompleted: 20,
        quantityScrapped: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const dailyCapacity = 20;
      const estimatedDate = workOrderService.calculateEstimatedCompletion(workOrder, dailyCapacity);
      
      expect(estimatedDate).toBeDefined();
      expect(estimatedDate!.getDate()).toBe(new Date().getDate() + 4); // 80 remaining / 20 daily = 4 days
    });

    it('should return null for completed work order', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 100,
        quantityCompleted: 100,
        quantityScrapped: 0,
        status: WorkOrderStatus.COMPLETED,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const estimatedDate = workOrderService.calculateEstimatedCompletion(workOrder, 20);
      expect(estimatedDate).toBeNull();
    });

    it('should return null for zero or negative daily capacity', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 100,
        quantityCompleted: 20,
        quantityScrapped: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(workOrderService.calculateEstimatedCompletion(workOrder, 0)).toBeNull();
      expect(workOrderService.calculateEstimatedCompletion(workOrder, -5)).toBeNull();
    });
  });

  describe('canCancelWorkOrder', () => {
    it('should allow cancellation of created work order with no completed quantities', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 10,
        quantityCompleted: 0,
        quantityScrapped: 0,
        status: WorkOrderStatus.CREATED,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = workOrderService.canCancelWorkOrder(workOrder);
      expect(result.canCancel).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should not allow cancellation of completed work order', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 10,
        quantityCompleted: 10,
        quantityScrapped: 0,
        status: WorkOrderStatus.COMPLETED,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = workOrderService.canCancelWorkOrder(workOrder);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toBe('Cannot cancel completed work order');
    });

    it('should not allow cancellation of work order with completed quantities', () => {
      const workOrder: WorkOrder = {
        id: '1',
        workOrderNumber: 'WO-001',
        partId: 'part-1',
        partNumber: 'TEST-PART-001',
        routeId: 'route-1',
        quantityOrdered: 10,
        quantityCompleted: 5,
        quantityScrapped: 0,
        status: WorkOrderStatus.IN_PROGRESS,
        priority: WorkOrderPriority.NORMAL,
        siteId: 'site-1',
        createdBy: testUserId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = workOrderService.canCancelWorkOrder(workOrder);
      expect(result.canCancel).toBe(false);
      expect(result.reason).toBe('Cannot cancel work order with completed quantities');
    });
  });

  describe('getPriorityWeight', () => {
    it('should return correct priority weights', () => {
      expect(workOrderService.getPriorityWeight(WorkOrderPriority.URGENT)).toBe(1000);
      expect(workOrderService.getPriorityWeight(WorkOrderPriority.HIGH)).toBe(100);
      expect(workOrderService.getPriorityWeight(WorkOrderPriority.NORMAL)).toBe(10);
      expect(workOrderService.getPriorityWeight(WorkOrderPriority.LOW)).toBe(1);
    });
  });
});