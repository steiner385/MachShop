// GitHub Issue #94: Equipment Registry & Maintenance Management System
// Equipment Routes Integration Tests

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import equipmentRoutes from '../../routes/equipment';
import { EquipmentService } from '../../services/EquipmentService';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ServiceMockHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

// Mock the EquipmentService
vi.mock('../../services/EquipmentService');

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = AuthTestHelper.createSupervisorUser();
  next();
};

describe('Equipment Routes', () => {
  let app: express.Application;
  let mockEquipmentService: any;
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
    app.use('/api/v1/equipment', equipmentRoutes);

    // Create mock service
    mockEquipmentService = ServiceMockHelper.createMockService('EquipmentService', [
      'getEquipment',
      'getEquipmentById',
      'createEquipment',
      'updateEquipment',
      'deleteEquipment',
      'getEquipmentRequiringMaintenance',
      'getEquipmentMetrics',
      'getEquipmentByAssetTag',
      'getEquipmentTypes',
      'createEquipmentType',
      'updateEquipmentType',
      'deleteEquipmentType',
      'getEquipmentMaintenanceHistory',
      'calculateEquipmentMetrics',
      'prioritizeMaintenanceWork'
    ]);

    (EquipmentService as any).mockImplementation(() => mockEquipmentService);

    // Setup test data
    testUser = AuthTestHelper.createSupervisorUser();
    testSite = DatabaseTestHelper.createTestSite();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/equipment', () => {
    it('should retrieve equipment with pagination', async () => {
      const mockEquipment = [
        {
          id: 'eq-001',
          name: 'CNC Machine 001',
          manufacturer: 'Haas Automation',
          model: 'VF-2',
          serialNumber: 'SN123456',
          assetTag: 'EQ-001',
          isActive: true,
          criticality: 'HIGH',
          nextMaintenanceDate: new Date('2025-01-15').toISOString()
        },
        {
          id: 'eq-002',
          name: 'Hydraulic Press 002',
          manufacturer: 'Beckwood',
          model: 'BP-50',
          serialNumber: 'SN789012',
          assetTag: 'EQ-002',
          isActive: true,
          criticality: 'MEDIUM',
          nextMaintenanceDate: new Date('2025-02-01').toISOString()
        }
      ];

      const mockResponse = {
        equipment: mockEquipment,
        total: 2
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipment', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment', testUser, undefined, { page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(response.body.data).toEqual(mockEquipment);
      expect(mockEquipmentService.getEquipment).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        siteId: testUser.siteId
      });
    });

    it('should filter equipment by criticality', async () => {
      const mockResponse = {
        equipment: [{ id: 'eq-001', criticality: 'HIGH' }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipment', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment', testUser, undefined,
        { criticality: 'HIGH', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockEquipmentService.getEquipment).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        criticality: 'HIGH',
        siteId: testUser.siteId
      });
    });

    it('should filter equipment requiring maintenance', async () => {
      const mockResponse = {
        equipment: [{ id: 'eq-001', nextMaintenanceDate: new Date('2024-12-01').toISOString() }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipment', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment', testUser, undefined,
        { maintenanceDue: 'true', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockEquipmentService.getEquipment).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        maintenanceDue: true,
        siteId: testUser.siteId
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment', testUser, undefined,
        { page: 'invalid', limit: 'invalid' }
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('POST /api/v1/equipment', () => {
    const validEquipmentData = {
      name: 'CNC Machine 001',
      manufacturer: 'Haas Automation',
      model: 'VF-2',
      serialNumber: 'SN123456',
      siteId: 'test-site-123',
      equipmentTypeId: 'type-456',
      criticality: 'HIGH',
      maintenanceInterval: 90,
      requiresCalibration: true
    };

    it('should create new equipment successfully', async () => {
      const mockEquipment = {
        id: 'eq-test-001',
        ...validEquipmentData,
        assetTag: 'EQ-12345678',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'createEquipment', mockEquipment);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/equipment', testUser, validEquipmentData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockEquipment);
      expect(mockEquipmentService.createEquipment).toHaveBeenCalledWith({
        ...validEquipmentData,
        createdById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/equipment', testUser, validEquipmentData,
        ['name', 'manufacturer', 'model', 'serialNumber', 'siteId']
      );
    });

    it('should return 400 for invalid criticality level', async () => {
      const invalidData = { ...validEquipmentData, criticality: 'INVALID_LEVEL' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/equipment', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for negative maintenance interval', async () => {
      const invalidData = { ...validEquipmentData, maintenanceInterval: -30 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/equipment', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should handle service validation errors', async () => {
      ServiceMockHelper.mockServiceValidationError(mockEquipmentService, 'createEquipment');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/equipment', testUser, validEquipmentData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/equipment/:id', () => {
    it('should retrieve specific equipment', async () => {
      const mockEquipment = {
        id: 'eq-test-001',
        name: 'CNC Machine 001',
        manufacturer: 'Haas Automation',
        model: 'VF-2',
        serialNumber: 'SN123456',
        assetTag: 'EQ-001',
        criticality: 'HIGH',
        isActive: true,
        equipmentType: { id: 'type-001', name: 'CNC Machine' },
        site: { id: 'site-001', siteName: 'Main Production' }
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipmentById', mockEquipment);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/eq-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEquipment);
      expect(mockEquipmentService.getEquipmentById).toHaveBeenCalledWith('eq-test-001');
    });

    it('should return 404 for non-existent equipment', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockEquipmentService, 'getEquipmentById');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/equipment/:id', () => {
    const updateData = {
      name: 'Updated CNC Machine 001',
      criticality: 'MEDIUM',
      maintenanceInterval: 120,
      requiresCalibration: false
    };

    it('should update equipment successfully', async () => {
      const mockUpdatedEquipment = {
        id: 'eq-test-001',
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'updateEquipment', mockUpdatedEquipment);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/equipment/eq-test-001', testUser, updateData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUpdatedEquipment);
      expect(mockEquipmentService.updateEquipment).toHaveBeenCalledWith('eq-test-001', {
        ...updateData,
        updatedById: testUser.id
      });
    });

    it('should return 404 for non-existent equipment', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockEquipmentService, 'updateEquipment');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/equipment/non-existent', testUser, updateData
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent updating critical equipment without proper authorization', async () => {
      const error = new Error('Insufficient permissions to update critical equipment');
      (error as any).code = 'INSUFFICIENT_PERMISSIONS';
      ServiceMockHelper.mockServiceError(mockEquipmentService, 'updateEquipment', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/equipment/eq-critical', testUser, updateData
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/equipment/:id', () => {
    it('should delete equipment successfully', async () => {
      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'deleteEquipment', undefined);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/equipment/eq-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response);
      expect(response.body.message).toBe('Equipment deleted successfully');
      expect(mockEquipmentService.deleteEquipment).toHaveBeenCalledWith('eq-test-001');
    });

    it('should return 404 for non-existent equipment', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockEquipmentService, 'deleteEquipment');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/equipment/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent deleting equipment with active work orders', async () => {
      const error = new Error('Cannot delete equipment with active work orders');
      (error as any).code = 'EQUIPMENT_IN_USE';
      ServiceMockHelper.mockServiceError(mockEquipmentService, 'deleteEquipment', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/equipment/eq-in-use', testUser
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/equipment/asset-tag/:assetTag', () => {
    it('should retrieve equipment by asset tag', async () => {
      const mockEquipment = {
        id: 'eq-test-001',
        name: 'CNC Machine 001',
        assetTag: 'EQ-12345678',
        criticality: 'HIGH'
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipmentByAssetTag', mockEquipment);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/asset-tag/EQ-12345678', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEquipment);
      expect(mockEquipmentService.getEquipmentByAssetTag).toHaveBeenCalledWith('EQ-12345678');
    });

    it('should return 404 for non-existent asset tag', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockEquipmentService, 'getEquipmentByAssetTag');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/asset-tag/INVALID-TAG', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/equipment/maintenance-required', () => {
    it('should retrieve equipment requiring maintenance', async () => {
      const mockEquipment = [
        {
          id: 'eq-001',
          name: 'CNC Machine 001',
          nextMaintenanceDate: new Date('2024-12-01').toISOString(),
          daysOverdue: 5
        },
        {
          id: 'eq-002',
          name: 'Hydraulic Press 002',
          nextMaintenanceDate: new Date('2024-12-15').toISOString(),
          daysOverdue: 0
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipmentRequiringMaintenance', mockEquipment);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/maintenance-required', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEquipment);
      expect(mockEquipmentService.getEquipmentRequiringMaintenance).toHaveBeenCalledWith({
        siteId: testUser.siteId
      });
    });

    it('should filter overdue maintenance only', async () => {
      const mockEquipment = [
        {
          id: 'eq-001',
          name: 'CNC Machine 001',
          daysOverdue: 5
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipmentRequiringMaintenance', mockEquipment);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/maintenance-required', testUser, undefined,
        { overdue: 'true' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEquipment);
      expect(mockEquipmentService.getEquipmentRequiringMaintenance).toHaveBeenCalledWith({
        overdue: true,
        siteId: testUser.siteId
      });
    });
  });

  describe('GET /api/v1/equipment/:id/metrics', () => {
    it('should retrieve equipment metrics', async () => {
      const mockMetrics = {
        equipmentId: 'eq-test-001',
        availability: 95.5,
        mtbf: 168.5,
        mttr: 2.5,
        totalRunTime: 8760,
        totalDownTime: 120,
        maintenanceCost: 15000.00,
        utilizationRate: 85.2
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'calculateEquipmentMetrics', mockMetrics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/eq-test-001/metrics', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockMetrics);
      expect(mockEquipmentService.calculateEquipmentMetrics).toHaveBeenCalledWith('eq-test-001', {
        days: 30
      });
    });

    it('should accept custom time period', async () => {
      const mockMetrics = { equipmentId: 'eq-test-001', availability: 92.0 };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'calculateEquipmentMetrics', mockMetrics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/eq-test-001/metrics', testUser, undefined,
        { days: 90 }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockMetrics);
      expect(mockEquipmentService.calculateEquipmentMetrics).toHaveBeenCalledWith('eq-test-001', {
        days: 90
      });
    });
  });

  describe('GET /api/v1/equipment/types', () => {
    it('should retrieve equipment types', async () => {
      const mockTypes = [
        {
          id: 'type-001',
          name: 'CNC Machine',
          description: 'Computer Numerical Control Machine',
          category: 'Manufacturing Equipment',
          defaultMaintenanceInterval: 90
        },
        {
          id: 'type-002',
          name: 'Hydraulic Press',
          description: 'High pressure forming equipment',
          category: 'Manufacturing Equipment',
          defaultMaintenanceInterval: 120
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipmentTypes', mockTypes);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/types', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockTypes);
      expect(mockEquipmentService.getEquipmentTypes).toHaveBeenCalledWith({});
    });

    it('should filter equipment types by category', async () => {
      const mockTypes = [
        {
          id: 'type-001',
          name: 'CNC Machine',
          category: 'Manufacturing Equipment'
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'getEquipmentTypes', mockTypes);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment/types', testUser, undefined,
        { category: 'Manufacturing Equipment' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockTypes);
      expect(mockEquipmentService.getEquipmentTypes).toHaveBeenCalledWith({
        category: 'Manufacturing Equipment'
      });
    });
  });

  describe('POST /api/v1/equipment/types', () => {
    const validTypeData = {
      name: 'Laser Cutting Machine',
      description: 'High precision laser cutting equipment',
      category: 'Manufacturing Equipment',
      defaultMaintenanceInterval: 60
    };

    it('should create new equipment type successfully', async () => {
      const mockType = {
        id: 'type-test-001',
        ...validTypeData,
        isActive: true,
        createdAt: new Date().toISOString(),
        createdById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockEquipmentService, 'createEquipmentType', mockType);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/equipment/types', testUser, validTypeData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockType);
      expect(mockEquipmentService.createEquipmentType).toHaveBeenCalledWith({
        ...validTypeData,
        createdById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/equipment/types', testUser, validTypeData,
        ['name', 'category']
      );
    });

    it('should return 400 for negative default maintenance interval', async () => {
      const invalidData = { ...validTypeData, defaultMaintenanceInterval: -30 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/equipment/types', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('Authorization Tests', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await RequestTestHelper.testUnauthorizedAccess(app, 'get', '/api/v1/equipment');
      await RequestTestHelper.testUnauthorizedAccess(app, 'post', '/api/v1/equipment');
    });

    it('should return 403 for users without sufficient permissions', async () => {
      const readOnlyUser = AuthTestHelper.createReadOnlyUser();

      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/equipment', readOnlyUser, {
          name: 'Test Equipment',
          manufacturer: 'Test Mfg',
          model: 'T-001',
          serialNumber: 'SN001'
        }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'put', '/api/v1/equipment/eq-001', readOnlyUser, { name: 'Updated Equipment' }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'delete', '/api/v1/equipment/eq-001', readOnlyUser
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/equipment')
        .set('Authorization', `Bearer test-token-${testUser.id}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service timeouts', async () => {
      const timeoutError = new Error('Service timeout');
      (timeoutError as any).code = 'TIMEOUT';
      ServiceMockHelper.mockServiceError(mockEquipmentService, 'getEquipment', timeoutError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment', testUser
      );

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'DATABASE_ERROR';
      ServiceMockHelper.mockServiceError(mockEquipmentService, 'getEquipment', dbError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/equipment', testUser
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});