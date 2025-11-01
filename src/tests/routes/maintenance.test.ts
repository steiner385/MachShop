// GitHub Issue #94: Equipment Registry & Maintenance Management System
// Maintenance Routes Integration Tests

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import maintenanceRoutes from '../../routes/maintenance';
import { MaintenanceService } from '../../services/MaintenanceService';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ServiceMockHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

// Mock the MaintenanceService
vi.mock('../../services/MaintenanceService');

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = AuthTestHelper.createSupervisorUser();
  next();
};

describe('Maintenance Routes', () => {
  let app: express.Application;
  let mockMaintenanceService: any;
  let testDb: PrismaClient;
  let testUser: any;
  let testSite: any;

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
    app.use('/api/v1/maintenance', maintenanceRoutes);

    // Create mock service
    mockMaintenanceService = ServiceMockHelper.createMockService('MaintenanceService', [
      'getMaintenanceWorkOrders',
      'getMaintenanceWorkOrderById',
      'createMaintenanceWorkOrder',
      'updateMaintenanceWorkOrder',
      'deleteMaintenanceWorkOrder',
      'startMaintenanceWorkOrder',
      'completeMaintenanceWorkOrder',
      'cancelMaintenanceWorkOrder',
      'addMaintenancePart',
      'addLaborEntry',
      'getMaintenanceParts',
      'getLaborEntries',
      'removeMaintenancePart',
      'removeLaborEntry',
      'getMaintenanceStatistics',
      'getOverdueMaintenanceWorkOrders',
      'getScheduledMaintenanceWorkOrders'
    ]);

    (MaintenanceService as any).mockImplementation(() => mockMaintenanceService);

    // Setup test data
    testUser = AuthTestHelper.createSupervisorUser();
    testSite = DatabaseTestHelper.createTestSite();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/maintenance/work-orders', () => {
    it('should retrieve maintenance work orders with pagination', async () => {
      const mockWorkOrders = [
        {
          id: 'mwo-001',
          workOrderNumber: 'WO-2024-001',
          title: 'Preventive Maintenance - Oil Change',
          equipmentId: 'eq-001',
          maintenanceType: 'PREVENTIVE',
          priority: 'NORMAL',
          status: 'PENDING',
          scheduledDate: new Date('2025-01-15').toISOString()
        },
        {
          id: 'mwo-002',
          workOrderNumber: 'WO-2024-002',
          title: 'Emergency Repair - Hydraulic Leak',
          equipmentId: 'eq-002',
          maintenanceType: 'EMERGENCY',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
          scheduledDate: new Date('2025-01-10').toISOString()
        }
      ];

      const mockResponse = {
        workOrders: mockWorkOrders,
        total: 2
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser, undefined, { page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(response.body.data).toEqual(mockWorkOrders);
      expect(mockMaintenanceService.getMaintenanceWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        siteId: testUser.siteId
      });
    });

    it('should filter work orders by status', async () => {
      const mockResponse = {
        workOrders: [{ id: 'mwo-001', status: 'IN_PROGRESS' }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser, undefined,
        { status: 'IN_PROGRESS', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockMaintenanceService.getMaintenanceWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: 'IN_PROGRESS',
        siteId: testUser.siteId
      });
    });

    it('should filter work orders by priority', async () => {
      const mockResponse = {
        workOrders: [{ id: 'mwo-001', priority: 'CRITICAL' }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser, undefined,
        { priority: 'CRITICAL', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockMaintenanceService.getMaintenanceWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        priority: 'CRITICAL',
        siteId: testUser.siteId
      });
    });

    it('should filter overdue work orders', async () => {
      const mockResponse = {
        workOrders: [{ id: 'mwo-001', scheduledDate: new Date('2024-12-01').toISOString() }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceWorkOrders', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser, undefined,
        { overdue: 'true', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockMaintenanceService.getMaintenanceWorkOrders).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        overdue: true,
        siteId: testUser.siteId
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser, undefined,
        { page: 'invalid', limit: 'invalid' }
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('POST /api/v1/maintenance/work-orders', () => {
    const validWorkOrderData = {
      equipmentId: 'eq-test-001',
      title: 'Preventive Maintenance - Filter Change',
      description: 'Replace hydraulic filters and check fluid levels',
      maintenanceType: 'PREVENTIVE',
      priority: 'NORMAL',
      scheduledDate: new Date('2025-02-01').toISOString(),
      estimatedDuration: 120,
      assignedToId: 'user-technician-001'
    };

    it('should create new maintenance work order successfully', async () => {
      const mockWorkOrder = {
        id: 'mwo-test-001',
        ...validWorkOrderData,
        workOrderNumber: 'WO-2024-0001',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'createMaintenanceWorkOrder', mockWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders', testUser, validWorkOrderData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockWorkOrder);
      expect(mockMaintenanceService.createMaintenanceWorkOrder).toHaveBeenCalledWith({
        ...validWorkOrderData,
        scheduledDate: new Date(validWorkOrderData.scheduledDate),
        createdById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/maintenance/work-orders', testUser, validWorkOrderData,
        ['equipmentId', 'title', 'maintenanceType']
      );
    });

    it('should return 400 for invalid maintenance type', async () => {
      const invalidData = { ...validWorkOrderData, maintenanceType: 'INVALID_TYPE' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for invalid priority', async () => {
      const invalidData = { ...validWorkOrderData, priority: 'INVALID_PRIORITY' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for negative estimated duration', async () => {
      const invalidData = { ...validWorkOrderData, estimatedDuration: -60 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should handle service validation errors', async () => {
      ServiceMockHelper.mockServiceValidationError(mockMaintenanceService, 'createMaintenanceWorkOrder');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders', testUser, validWorkOrderData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/maintenance/work-orders/:id', () => {
    it('should retrieve specific maintenance work order', async () => {
      const mockWorkOrder = {
        id: 'mwo-test-001',
        workOrderNumber: 'WO-2024-001',
        title: 'Preventive Maintenance - Oil Change',
        description: 'Change hydraulic oil and filters',
        equipmentId: 'eq-001',
        maintenanceType: 'PREVENTIVE',
        priority: 'NORMAL',
        status: 'PENDING',
        scheduledDate: new Date('2025-02-01').toISOString(),
        equipment: { id: 'eq-001', name: 'CNC Machine 001' },
        assignedTo: { id: 'user-001', firstName: 'John', lastName: 'Doe' }
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceWorkOrderById', mockWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders/mwo-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockWorkOrder);
      expect(mockMaintenanceService.getMaintenanceWorkOrderById).toHaveBeenCalledWith('mwo-test-001');
    });

    it('should return 404 for non-existent work order', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockMaintenanceService, 'getMaintenanceWorkOrderById');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/maintenance/work-orders/:id', () => {
    const updateData = {
      title: 'Updated Maintenance Task',
      priority: 'HIGH',
      estimatedDuration: 180,
      notes: 'Updated with additional requirements'
    };

    it('should update maintenance work order successfully', async () => {
      const mockUpdatedWorkOrder = {
        id: 'mwo-test-001',
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'updateMaintenanceWorkOrder', mockUpdatedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/maintenance/work-orders/mwo-test-001', testUser, updateData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUpdatedWorkOrder);
      expect(mockMaintenanceService.updateMaintenanceWorkOrder).toHaveBeenCalledWith('mwo-test-001', {
        ...updateData,
        updatedById: testUser.id
      });
    });

    it('should return 404 for non-existent work order', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockMaintenanceService, 'updateMaintenanceWorkOrder');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/maintenance/work-orders/non-existent', testUser, updateData
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent updating completed work orders', async () => {
      const error = new Error('Cannot update completed work order');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockMaintenanceService, 'updateMaintenanceWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/maintenance/work-orders/mwo-completed', testUser, updateData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/maintenance/work-orders/:id/start', () => {
    it('should start maintenance work order successfully', async () => {
      const mockStartedWorkOrder = {
        id: 'mwo-test-001',
        status: 'IN_PROGRESS',
        startedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'startMaintenanceWorkOrder', mockStartedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/start', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockStartedWorkOrder);
      expect(mockMaintenanceService.startMaintenanceWorkOrder).toHaveBeenCalledWith('mwo-test-001', testUser.id);
    });

    it('should return 400 for already started work order', async () => {
      const error = new Error('Work order already started');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockMaintenanceService, 'startMaintenanceWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/start', testUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/maintenance/work-orders/:id/complete', () => {
    const completionData = {
      notes: 'Maintenance completed successfully. All filters replaced.'
    };

    it('should complete maintenance work order successfully', async () => {
      const mockCompletedWorkOrder = {
        id: 'mwo-test-001',
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        notes: completionData.notes
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'completeMaintenanceWorkOrder', mockCompletedWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/complete', testUser, completionData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockCompletedWorkOrder);
      expect(mockMaintenanceService.completeMaintenanceWorkOrder).toHaveBeenCalledWith('mwo-test-001', testUser.id, completionData.notes);
    });

    it('should return 400 for work order not started', async () => {
      const error = new Error('Cannot complete work order that has not been started');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockMaintenanceService, 'completeMaintenanceWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/complete', testUser, completionData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/maintenance/work-orders/:id/cancel', () => {
    const cancellationData = {
      reason: 'Equipment no longer requires maintenance'
    };

    it('should cancel maintenance work order successfully', async () => {
      const mockCancelledWorkOrder = {
        id: 'mwo-test-001',
        status: 'CANCELLED',
        cancelledAt: new Date().toISOString(),
        cancellationReason: cancellationData.reason
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'cancelMaintenanceWorkOrder', mockCancelledWorkOrder);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/cancel', testUser, cancellationData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockCancelledWorkOrder);
      expect(mockMaintenanceService.cancelMaintenanceWorkOrder).toHaveBeenCalledWith('mwo-test-001', testUser.id, cancellationData.reason);
    });

    it('should return 400 for already completed work order', async () => {
      const error = new Error('Cannot cancel completed work order');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockMaintenanceService, 'cancelMaintenanceWorkOrder', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/cancel', testUser, cancellationData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/maintenance/work-orders/:id/parts', () => {
    const partData = {
      partNumber: 'PN-12345',
      description: 'Hydraulic Filter',
      quantityUsed: 2,
      unitCost: 25.50,
      supplierPartNumber: 'SUP-67890',
      notes: 'High-quality replacement filter'
    };

    it('should add maintenance part successfully', async () => {
      const mockPart = {
        id: 'part-001',
        ...partData,
        addedAt: new Date().toISOString(),
        addedById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'addMaintenancePart', mockPart);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/parts', testUser, partData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockPart);
      expect(mockMaintenanceService.addMaintenancePart).toHaveBeenCalledWith('mwo-test-001', {
        ...partData,
        addedById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/parts', testUser, partData,
        ['partNumber', 'description', 'quantityUsed']
      );
    });

    it('should return 400 for negative quantity', async () => {
      const invalidData = { ...partData, quantityUsed: -1 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/parts', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for negative unit cost', async () => {
      const invalidData = { ...partData, unitCost: -10.50 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/parts', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('POST /api/v1/maintenance/work-orders/:id/labor', () => {
    const laborData = {
      userId: 'user-technician-001',
      startTime: new Date('2025-01-15T08:00:00Z').toISOString(),
      endTime: new Date('2025-01-15T10:00:00Z').toISOString(),
      hourlyRate: 50.00,
      description: 'Filter replacement and system check'
    };

    it('should add labor entry successfully', async () => {
      const mockLaborEntry = {
        id: 'labor-001',
        ...laborData,
        recordedAt: new Date().toISOString(),
        recordedById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'addLaborEntry', mockLaborEntry);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/labor', testUser, laborData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockLaborEntry);
      expect(mockMaintenanceService.addLaborEntry).toHaveBeenCalledWith('mwo-test-001', {
        ...laborData,
        startTime: new Date(laborData.startTime),
        endTime: new Date(laborData.endTime),
        recordedById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/labor', testUser, laborData,
        ['userId', 'startTime', 'endTime']
      );
    });

    it('should return 400 for end time before start time', async () => {
      const invalidData = {
        ...laborData,
        startTime: new Date('2025-01-15T10:00:00Z').toISOString(),
        endTime: new Date('2025-01-15T08:00:00Z').toISOString()
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/labor', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for negative hourly rate', async () => {
      const invalidData = { ...laborData, hourlyRate: -25.00 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/maintenance/work-orders/mwo-test-001/labor', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('GET /api/v1/maintenance/statistics', () => {
    it('should retrieve maintenance statistics', async () => {
      const mockStatistics = {
        totalWorkOrders: 150,
        completedWorkOrders: 120,
        pendingWorkOrders: 20,
        overdueWorkOrders: 10,
        averageCompletionTime: 4.5,
        totalMaintenanceCost: 75000.00,
        preventiveMaintenancePercentage: 65.0,
        correctiveMaintenancePercentage: 35.0
      };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceStatistics', mockStatistics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/statistics', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockStatistics);
      expect(mockMaintenanceService.getMaintenanceStatistics).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 30
      });
    });

    it('should accept custom time period', async () => {
      const mockStatistics = { totalWorkOrders: 300 };

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getMaintenanceStatistics', mockStatistics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/statistics', testUser, undefined,
        { days: 90 }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockStatistics);
      expect(mockMaintenanceService.getMaintenanceStatistics).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 90
      });
    });
  });

  describe('GET /api/v1/maintenance/overdue', () => {
    it('should retrieve overdue maintenance work orders', async () => {
      const mockOverdueWorkOrders = [
        {
          id: 'mwo-001',
          workOrderNumber: 'WO-2024-001',
          title: 'Overdue Maintenance',
          scheduledDate: new Date('2024-12-01').toISOString(),
          daysOverdue: 15
        },
        {
          id: 'mwo-002',
          workOrderNumber: 'WO-2024-002',
          title: 'Critical Maintenance',
          scheduledDate: new Date('2024-11-15').toISOString(),
          daysOverdue: 31
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getOverdueMaintenanceWorkOrders', mockOverdueWorkOrders);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/overdue', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockOverdueWorkOrders);
      expect(mockMaintenanceService.getOverdueMaintenanceWorkOrders).toHaveBeenCalledWith({
        siteId: testUser.siteId
      });
    });

    it('should filter by assigned technician', async () => {
      const mockWorkOrders = [{ id: 'mwo-001', assignedToId: 'user-tech-001' }];

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getOverdueMaintenanceWorkOrders', mockWorkOrders);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/overdue', testUser, undefined,
        { assignedToId: 'user-tech-001' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockWorkOrders);
      expect(mockMaintenanceService.getOverdueMaintenanceWorkOrders).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        assignedToId: 'user-tech-001'
      });
    });
  });

  describe('GET /api/v1/maintenance/scheduled', () => {
    it('should retrieve scheduled maintenance work orders', async () => {
      const mockScheduledWorkOrders = [
        {
          id: 'mwo-003',
          workOrderNumber: 'WO-2025-003',
          title: 'Upcoming Maintenance',
          scheduledDate: new Date('2025-01-20').toISOString(),
          daysUntilDue: 5
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getScheduledMaintenanceWorkOrders', mockScheduledWorkOrders);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/scheduled', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockScheduledWorkOrders);
      expect(mockMaintenanceService.getScheduledMaintenanceWorkOrders).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 7
      });
    });

    it('should accept custom time period', async () => {
      const mockWorkOrders = [{ id: 'mwo-003', daysUntilDue: 25 }];

      ServiceMockHelper.mockServiceSuccess(mockMaintenanceService, 'getScheduledMaintenanceWorkOrders', mockWorkOrders);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/scheduled', testUser, undefined,
        { days: 30 }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockWorkOrders);
      expect(mockMaintenanceService.getScheduledMaintenanceWorkOrders).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 30
      });
    });
  });

  describe('Authorization Tests', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await RequestTestHelper.testUnauthorizedAccess(app, 'get', '/api/v1/maintenance/work-orders');
      await RequestTestHelper.testUnauthorizedAccess(app, 'post', '/api/v1/maintenance/work-orders');
    });

    it('should return 403 for users without sufficient permissions', async () => {
      const readOnlyUser = AuthTestHelper.createReadOnlyUser();

      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/maintenance/work-orders', readOnlyUser, {
          equipmentId: 'eq-001',
          title: 'Test Maintenance',
          maintenanceType: 'PREVENTIVE'
        }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'put', '/api/v1/maintenance/work-orders/mwo-001', readOnlyUser, { title: 'Updated Maintenance' }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'delete', '/api/v1/maintenance/work-orders/mwo-001', readOnlyUser
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/maintenance/work-orders')
        .set('Authorization', `Bearer test-token-${testUser.id}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service timeouts', async () => {
      const timeoutError = new Error('Service timeout');
      (timeoutError as any).code = 'TIMEOUT';
      ServiceMockHelper.mockServiceError(mockMaintenanceService, 'getMaintenanceWorkOrders', timeoutError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser
      );

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'DATABASE_ERROR';
      ServiceMockHelper.mockServiceError(mockMaintenanceService, 'getMaintenanceWorkOrders', dbError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/maintenance/work-orders', testUser
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});