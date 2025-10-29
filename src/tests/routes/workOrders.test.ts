import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import workOrderRoutes from '../../routes/workOrders';
import { WorkOrderService } from '../../services/WorkOrderService';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ServiceMockHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

// Mock the WorkOrderService
vi.mock('../../services/WorkOrderService');

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = AuthTestHelper.createSupervisorUser();
  next();
};

describe('Work Order Routes', () => {
  let app: express.Application;
  let mockWorkOrderService: any;
  let testDb: PrismaClient;
  let testUser: any;
  let testSite: any;
  let testPart: any;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(mockAuthMiddleware);
    app.use('/api/v1/work-orders', workOrderRoutes);

    // Create mock service
    mockWorkOrderService = ServiceMockHelper.createMockService('WorkOrderService', [
      'createWorkOrder',
      'getWorkOrders',
      'getWorkOrderById',
      'updateWorkOrder',
      'deleteWorkOrder',
      'startWorkOrder',
      'completeWorkOrder',
      'pauseWorkOrder',
      'cancelWorkOrder',
      'getWorkOrderHistory',
      'getWorkOrderMetrics',
      'assignPersonnel',
      'updateProgress',
      'addMaterialTransaction',
      'getWorkOrderDocuments'
    ]);

    (WorkOrderService as any).mockImplementation(() => mockWorkOrderService);

    // Setup test data
    testUser = AuthTestHelper.createSupervisorUser();
    testSite = DatabaseTestHelper.createTestSite();

    testPart = await testDb.part.upsert({
      where: { partNumber: 'TEST-PART-001' },
      update: {},
      create: {
        id: 'test-part-001',
        partNumber: 'TEST-PART-001',
        partName: 'Test Part',
        partType: 'MANUFACTURED',
        description: 'Test part for work order tests',
        revision: 'A',
        isActive: true,
        unitOfMeasure: 'EA'
      }
    });

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    vi.restoreAllMocks();
  });

  describe('POST /api/v1/work-orders', () => {
    const validWorkOrderData = {
      workOrderNumber: 'WO-TEST-001',
      partId: 'test-part-001',
      partNumber: 'TEST-PART-001',
      quantity: 100,
      priority: 'NORMAL',
      siteId: 'test-site-123',
      dueDate: new Date('2025-12-31').toISOString(),
      routingId: 'test-routing-001'
    };

    it('should create a new work order successfully', async () => {
      const mockWorkOrder = {
        id: 'wo-test-001',
        ...validWorkOrderData,
        status: 'PENDING',
        quantityCompleted: 0,
        quantityScrapped: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'createWorkOrder', mockWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders', testUser, validWorkOrderData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockWorkOrder);
      expect(mockWorkOrderService.createWorkOrder).toHaveBeenCalledWith({
        ...validWorkOrderData,
        createdById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/work-orders', testUser, validWorkOrderData,
        ['workOrderNumber', 'partId', 'quantity', 'siteId']
      );
    });

    it('should return 400 for invalid field types', async () => {
      await ValidationTestHelper.testInvalidFieldTypes(
        app, 'post', '/api/v1/work-orders', testUser, validWorkOrderData, {
          quantity: 'invalid-number',
          priority: 'INVALID_PRIORITY',
          dueDate: 'invalid-date'
        }
      );
    });

    it('should return 400 for negative quantity', async () => {
      const invalidData = { ...validWorkOrderData, quantity: -10 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should handle service validation errors', async () => {
      ServiceMockHelper.mockServiceValidationError(mockWorkOrderService, 'createWorkOrder');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders', testUser, validWorkOrderData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service database errors', async () => {
      ServiceMockHelper.mockServiceError(
        mockWorkOrderService, 'createWorkOrder',
        new Error('Database connection failed')
      );

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders', testUser, validWorkOrderData
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/work-orders', () => {
    it('should retrieve work orders with pagination', async () => {
      const mockWorkOrders = [
        {
          id: 'wo-001',
          workOrderNumber: 'WO-001',
          partNumber: 'PART-001',
          quantity: 100,
          quantityCompleted: 25,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          dueDate: new Date('2025-12-31').toISOString()
        },
        {
          id: 'wo-002',
          workOrderNumber: 'WO-002',
          partNumber: 'PART-002',
          quantity: 50,
          quantityCompleted: 0,
          status: 'PENDING',
          priority: 'NORMAL',
          dueDate: new Date('2025-11-30').toISOString()
        }
      ];

      const mockResponse = {
        data: mockWorkOrders,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1
        }
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'getWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders', testUser, undefined, { page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(response.body.data).toEqual(mockWorkOrders);
      expect(mockWorkOrderService.getWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        siteId: testUser.siteId
      });
    });

    it('should filter work orders by status', async () => {
      const mockResponse = {
        data: [{ id: 'wo-001', status: 'IN_PROGRESS' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'getWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders', testUser, undefined,
        { status: 'IN_PROGRESS', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockWorkOrderService.getWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'IN_PROGRESS',
        siteId: testUser.siteId
      });
    });

    it('should filter work orders by priority', async () => {
      const mockResponse = {
        data: [{ id: 'wo-001', priority: 'HIGH' }],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'getWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders', testUser, undefined,
        { priority: 'HIGH', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockWorkOrderService.getWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        priority: 'HIGH',
        siteId: testUser.siteId
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders', testUser, undefined,
        { page: 'invalid', limit: 'invalid' }
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('GET /api/v1/work-orders/:id', () => {
    it('should retrieve a specific work order', async () => {
      const mockWorkOrder = {
        id: 'wo-test-001',
        workOrderNumber: 'WO-TEST-001',
        partNumber: 'PART-001',
        quantity: 100,
        quantityCompleted: 25,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date('2025-12-31').toISOString(),
        routing: { id: 'routing-001', name: 'Standard Routing' },
        personnel: [{ id: 'person-001', name: 'John Doe' }],
        materials: [{ id: 'mat-001', name: 'Raw Material A' }]
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'getWorkOrderById', mockWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders/wo-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockWorkOrder);
      expect(mockWorkOrderService.getWorkOrderById).toHaveBeenCalledWith('wo-test-001');
    });

    it('should return 404 for non-existent work order', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockWorkOrderService, 'getWorkOrderById');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders/invalid-id-format', testUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/work-orders/:id', () => {
    const updateData = {
      quantity: 150,
      priority: 'HIGH',
      dueDate: new Date('2025-11-30').toISOString()
    };

    it('should update a work order successfully', async () => {
      const mockUpdatedWorkOrder = {
        id: 'wo-test-001',
        ...updateData,
        workOrderNumber: 'WO-TEST-001',
        partNumber: 'PART-001',
        status: 'PENDING',
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'updateWorkOrder', mockUpdatedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/work-orders/wo-test-001', testUser, updateData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUpdatedWorkOrder);
      expect(mockWorkOrderService.updateWorkOrder).toHaveBeenCalledWith('wo-test-001', updateData);
    });

    it('should return 404 for non-existent work order', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockWorkOrderService, 'updateWorkOrder');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/work-orders/non-existent', testUser, updateData
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent updating completed work orders', async () => {
      const error = new Error('Cannot update completed work order');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockWorkOrderService, 'updateWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/work-orders/wo-completed', testUser, updateData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot update completed work order');
    });
  });

  describe('POST /api/v1/work-orders/:id/start', () => {
    it('should start a work order successfully', async () => {
      const mockStartedWorkOrder = {
        id: 'wo-test-001',
        status: 'IN_PROGRESS',
        actualStartDate: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'startWorkOrder', mockStartedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders/wo-test-001/start', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockStartedWorkOrder);
      expect(mockWorkOrderService.startWorkOrder).toHaveBeenCalledWith('wo-test-001', testUser.id);
    });

    it('should return 400 for already started work order', async () => {
      const error = new Error('Work order already started');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockWorkOrderService, 'startWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders/wo-test-001/start', testUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/work-orders/:id/complete', () => {
    const completionData = {
      quantityCompleted: 100,
      quantityScrapped: 5,
      notes: 'Completed successfully with minor scrap'
    };

    it('should complete a work order successfully', async () => {
      const mockCompletedWorkOrder = {
        id: 'wo-test-001',
        status: 'COMPLETED',
        quantityCompleted: 100,
        quantityScrapped: 5,
        actualEndDate: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'completeWorkOrder', mockCompletedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders/wo-test-001/complete', testUser, completionData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockCompletedWorkOrder);
      expect(mockWorkOrderService.completeWorkOrder).toHaveBeenCalledWith('wo-test-001', {
        ...completionData,
        completedById: testUser.id
      });
    });

    it('should require quantityCompleted for completion', async () => {
      const invalidData = { ...completionData };
      delete invalidData.quantityCompleted;

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders/wo-test-001/complete', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should validate quantity limits', async () => {
      const invalidData = { ...completionData, quantityCompleted: -10 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/work-orders/wo-test-001/complete', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('DELETE /api/v1/work-orders/:id', () => {
    it('should delete a work order successfully', async () => {
      const mockDeletedWorkOrder = {
        id: 'wo-test-001',
        workOrderNumber: 'WO-TEST-001',
        status: 'CANCELLED'
      };

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'deleteWorkOrder', mockDeletedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/work-orders/wo-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response);
      expect(response.body.message).toBe('Work order deleted successfully');
      expect(mockWorkOrderService.deleteWorkOrder).toHaveBeenCalledWith('wo-test-001');
    });

    it('should return 404 for non-existent work order', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockWorkOrderService, 'deleteWorkOrder');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/work-orders/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent deleting in-progress work orders', async () => {
      const error = new Error('Cannot delete in-progress work order');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockWorkOrderService, 'deleteWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/work-orders/wo-in-progress', testUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/work-orders/:id/history', () => {
    it('should retrieve work order history', async () => {
      const mockHistory = [
        {
          id: 'history-001',
          workOrderId: 'wo-test-001',
          action: 'CREATED',
          timestamp: new Date().toISOString(),
          userId: testUser.id,
          userName: 'Test User',
          details: 'Work order created'
        },
        {
          id: 'history-002',
          workOrderId: 'wo-test-001',
          action: 'STARTED',
          timestamp: new Date().toISOString(),
          userId: testUser.id,
          userName: 'Test User',
          details: 'Work order started'
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockWorkOrderService, 'getWorkOrderHistory', mockHistory);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders/wo-test-001/history', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockHistory);
      expect(mockWorkOrderService.getWorkOrderHistory).toHaveBeenCalledWith('wo-test-001');
    });
  });

  describe('Authorization Tests', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await RequestTestHelper.testUnauthorizedAccess(app, 'get', '/api/v1/work-orders');
      await RequestTestHelper.testUnauthorizedAccess(app, 'post', '/api/v1/work-orders');
    });

    it('should return 403 for users without sufficient permissions', async () => {
      const readOnlyUser = AuthTestHelper.createReadOnlyUser();

      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/work-orders', readOnlyUser, {
          workOrderNumber: 'WO-001',
          partId: 'part-001',
          quantity: 100
        }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'put', '/api/v1/work-orders/wo-001', readOnlyUser, { quantity: 150 }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'delete', '/api/v1/work-orders/wo-001', readOnlyUser
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/work-orders')
        .set('Authorization', `Bearer test-token-${testUser.id}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service timeouts', async () => {
      const timeoutError = new Error('Service timeout');
      (timeoutError as any).code = 'TIMEOUT';
      ServiceMockHelper.mockServiceError(mockWorkOrderService, 'getWorkOrders', timeoutError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/work-orders', testUser
      );

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
    });
  });
});