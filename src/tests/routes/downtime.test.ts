// GitHub Issue #94: Equipment Registry & Maintenance Management System
// Downtime Routes Integration Tests

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import downtimeRoutes from '../../routes/downtime';
import { DowntimeService } from '../../services/DowntimeService';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ServiceMockHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

// Mock the DowntimeService
vi.mock('../../services/DowntimeService');

// Mock auth middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = AuthTestHelper.createSupervisorUser();
  next();
};

describe('Downtime Routes', () => {
  let app: express.Application;
  let mockDowntimeService: any;
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
    app.use('/api/v1/downtime', downtimeRoutes);

    // Create mock service
    mockDowntimeService = ServiceMockHelper.createMockService('DowntimeService', [
      'getDowntimeEvents',
      'getDowntimeEventById',
      'createDowntimeEvent',
      'updateDowntimeEvent',
      'deleteDowntimeEvent',
      'endDowntimeEvent',
      'getOngoingDowntimeEvents',
      'getDowntimeAnalytics',
      'getDowntimeReasons',
      'createDowntimeReason',
      'getDowntimeReasonById',
      'updateDowntimeReason',
      'deleteDowntimeReason',
      'getDowntimeTrends',
      'getDowntimeSummaryByReason'
    ]);

    (DowntimeService as any).mockImplementation(() => mockDowntimeService);

    // Setup test data
    testUser = AuthTestHelper.createSupervisorUser();
    testSite = DatabaseTestHelper.createTestSite();

    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
    vi.restoreAllMocks();
  });

  describe('GET /api/v1/downtime/events', () => {
    it('should retrieve downtime events with pagination', async () => {
      const mockEvents = [
        {
          id: 'dt-001',
          equipmentId: 'eq-001',
          downtimeReasonId: 'reason-001',
          startTime: new Date('2025-01-10T08:00:00Z').toISOString(),
          endTime: new Date('2025-01-10T10:00:00Z').toISOString(),
          description: 'Hydraulic system failure',
          impact: 'HIGH',
          equipment: { id: 'eq-001', name: 'CNC Machine 001' },
          downtimeReason: { id: 'reason-001', name: 'Equipment Failure' }
        },
        {
          id: 'dt-002',
          equipmentId: 'eq-002',
          downtimeReasonId: 'reason-002',
          startTime: new Date('2025-01-11T14:00:00Z').toISOString(),
          endTime: null,
          description: 'Scheduled maintenance',
          impact: 'MEDIUM',
          equipment: { id: 'eq-002', name: 'Hydraulic Press 002' },
          downtimeReason: { id: 'reason-002', name: 'Planned Maintenance' }
        }
      ];

      const mockResponse = {
        events: mockEvents,
        total: 2
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeEvents', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser, undefined, { page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(response.body.data).toEqual(mockEvents);
      expect(mockDowntimeService.getDowntimeEvents).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        siteId: testUser.siteId
      });
    });

    it('should filter downtime events by equipment', async () => {
      const mockResponse = {
        events: [{ id: 'dt-001', equipmentId: 'eq-001' }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeEvents', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser, undefined,
        { equipmentId: 'eq-001', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockDowntimeService.getDowntimeEvents).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        equipmentId: 'eq-001',
        siteId: testUser.siteId
      });
    });

    it('should filter downtime events by category', async () => {
      const mockResponse = {
        events: [{ id: 'dt-001', category: 'EQUIPMENT_FAILURE' }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeEvents', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser, undefined,
        { category: 'EQUIPMENT_FAILURE', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockDowntimeService.getDowntimeEvents).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        category: 'EQUIPMENT_FAILURE',
        siteId: testUser.siteId
      });
    });

    it('should filter ongoing downtime events', async () => {
      const mockResponse = {
        events: [{ id: 'dt-001', endTime: null }],
        total: 1
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeEvents', mockResponse);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser, undefined,
        { ongoing: 'true', page: 1, limit: 10 }
      );

      ResponseTestHelper.expectPaginatedResponse(response);
      expect(mockDowntimeService.getDowntimeEvents).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        ongoing: true,
        siteId: testUser.siteId
      });
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser, undefined,
        { page: 'invalid', limit: 'invalid' }
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('POST /api/v1/downtime/events', () => {
    const validEventData = {
      equipmentId: 'eq-test-001',
      downtimeReasonId: 'reason-test-001',
      startTime: new Date('2025-01-15T08:00:00Z').toISOString(),
      endTime: new Date('2025-01-15T10:00:00Z').toISOString(),
      description: 'Hydraulic system malfunction requiring repair',
      impact: 'HIGH',
      estimatedRepairTime: 120,
      notes: 'Contacted maintenance team immediately'
    };

    it('should create new downtime event successfully', async () => {
      const mockEvent = {
        id: 'dt-test-001',
        ...validEventData,
        actualRepairTime: null,
        rootCause: null,
        correctiveAction: null,
        createdAt: new Date().toISOString(),
        reportedById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'createDowntimeEvent', mockEvent);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events', testUser, validEventData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockEvent);
      expect(mockDowntimeService.createDowntimeEvent).toHaveBeenCalledWith({
        ...validEventData,
        startTime: new Date(validEventData.startTime),
        endTime: new Date(validEventData.endTime),
        reportedById: testUser.id
      });
    });

    it('should create ongoing downtime event without end time', async () => {
      const ongoingEventData = {
        ...validEventData,
        endTime: undefined
      };

      const mockEvent = {
        id: 'dt-test-001',
        ...ongoingEventData,
        endTime: null,
        reportedById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'createDowntimeEvent', mockEvent);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events', testUser, ongoingEventData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockEvent);
      expect(mockDowntimeService.createDowntimeEvent).toHaveBeenCalledWith({
        ...ongoingEventData,
        startTime: new Date(ongoingEventData.startTime),
        endTime: undefined,
        reportedById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/downtime/events', testUser, validEventData,
        ['equipmentId', 'downtimeReasonId', 'startTime']
      );
    });

    it('should return 400 for invalid impact level', async () => {
      const invalidData = { ...validEventData, impact: 'INVALID_IMPACT' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for end time before start time', async () => {
      const invalidData = {
        ...validEventData,
        startTime: new Date('2025-01-15T10:00:00Z').toISOString(),
        endTime: new Date('2025-01-15T08:00:00Z').toISOString()
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for negative estimated repair time', async () => {
      const invalidData = { ...validEventData, estimatedRepairTime: -60 };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should handle service validation errors', async () => {
      ServiceMockHelper.mockServiceValidationError(mockDowntimeService, 'createDowntimeEvent');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events', testUser, validEventData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/downtime/events/:id', () => {
    it('should retrieve specific downtime event', async () => {
      const mockEvent = {
        id: 'dt-test-001',
        equipmentId: 'eq-001',
        downtimeReasonId: 'reason-001',
        startTime: new Date('2025-01-15T08:00:00Z').toISOString(),
        endTime: new Date('2025-01-15T10:00:00Z').toISOString(),
        description: 'Hydraulic system failure',
        impact: 'HIGH',
        equipment: { id: 'eq-001', name: 'CNC Machine 001' },
        downtimeReason: { id: 'reason-001', name: 'Equipment Failure' },
        reportedBy: { id: 'user-001', firstName: 'John', lastName: 'Doe' }
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeEventById', mockEvent);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events/dt-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEvent);
      expect(mockDowntimeService.getDowntimeEventById).toHaveBeenCalledWith('dt-test-001');
    });

    it('should return 404 for non-existent downtime event', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockDowntimeService, 'getDowntimeEventById');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/downtime/events/:id', () => {
    const updateData = {
      description: 'Updated description with more details',
      impact: 'CRITICAL',
      actualRepairTime: 150,
      rootCause: 'Faulty hydraulic seal',
      correctiveAction: 'Replaced hydraulic seal and checked system pressure'
    };

    it('should update downtime event successfully', async () => {
      const mockUpdatedEvent = {
        id: 'dt-test-001',
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'updateDowntimeEvent', mockUpdatedEvent);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/downtime/events/dt-test-001', testUser, updateData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockUpdatedEvent);
      expect(mockDowntimeService.updateDowntimeEvent).toHaveBeenCalledWith('dt-test-001', updateData);
    });

    it('should return 404 for non-existent downtime event', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockDowntimeService, 'updateDowntimeEvent');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/downtime/events/non-existent', testUser, updateData
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid impact level', async () => {
      const invalidData = { ...updateData, impact: 'INVALID_IMPACT' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', '/api/v1/downtime/events/dt-test-001', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('DELETE /api/v1/downtime/events/:id', () => {
    it('should delete downtime event successfully', async () => {
      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'deleteDowntimeEvent', undefined);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/downtime/events/dt-test-001', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response);
      expect(response.body.message).toBe('Downtime event deleted successfully');
      expect(mockDowntimeService.deleteDowntimeEvent).toHaveBeenCalledWith('dt-test-001');
    });

    it('should return 404 for non-existent downtime event', async () => {
      ServiceMockHelper.mockServiceNotFoundError(mockDowntimeService, 'deleteDowntimeEvent');

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/downtime/events/non-existent', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should prevent deleting critical downtime events without proper authorization', async () => {
      const error = new Error('Insufficient permissions to delete critical downtime events');
      (error as any).code = 'INSUFFICIENT_PERMISSIONS';
      ServiceMockHelper.mockServiceError(mockDowntimeService, 'deleteDowntimeEvent', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', '/api/v1/downtime/events/dt-critical', testUser
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/downtime/events/:id/end', () => {
    const endEventData = {
      endTime: new Date('2025-01-15T12:00:00Z').toISOString(),
      notes: 'Equipment repaired and back in operation',
      rootCause: 'Worn hydraulic seal',
      correctiveAction: 'Replaced seal and updated maintenance schedule'
    };

    it('should end downtime event successfully', async () => {
      const mockEndedEvent = {
        id: 'dt-test-001',
        endTime: endEventData.endTime,
        notes: endEventData.notes,
        rootCause: endEventData.rootCause,
        correctiveAction: endEventData.correctiveAction,
        updatedAt: new Date().toISOString()
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'endDowntimeEvent', mockEndedEvent);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events/dt-test-001/end', testUser, endEventData
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEndedEvent);
      expect(mockDowntimeService.endDowntimeEvent).toHaveBeenCalledWith('dt-test-001', {
        ...endEventData,
        endTime: new Date(endEventData.endTime)
      });
    });

    it('should end downtime event with current time if no end time provided', async () => {
      const endEventDataWithoutTime = {
        notes: 'Equipment repaired',
        rootCause: 'Worn part',
        correctiveAction: 'Replaced part'
      };

      const mockEndedEvent = {
        id: 'dt-test-001',
        endTime: new Date().toISOString(),
        ...endEventDataWithoutTime
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'endDowntimeEvent', mockEndedEvent);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events/dt-test-001/end', testUser, endEventDataWithoutTime
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEndedEvent);
    });

    it('should return 400 for already ended downtime event', async () => {
      const error = new Error('Downtime event already ended');
      (error as any).code = 'INVALID_STATE';
      ServiceMockHelper.mockServiceError(mockDowntimeService, 'endDowntimeEvent', error);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/events/dt-test-001/end', testUser, endEventData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/downtime/ongoing', () => {
    it('should retrieve ongoing downtime events', async () => {
      const mockOngoingEvents = [
        {
          id: 'dt-001',
          equipmentId: 'eq-001',
          startTime: new Date('2025-01-15T08:00:00Z').toISOString(),
          endTime: null,
          description: 'Ongoing hydraulic issue',
          equipment: { id: 'eq-001', name: 'CNC Machine 001' }
        },
        {
          id: 'dt-002',
          equipmentId: 'eq-002',
          startTime: new Date('2025-01-15T10:00:00Z').toISOString(),
          endTime: null,
          description: 'Scheduled maintenance in progress',
          equipment: { id: 'eq-002', name: 'Hydraulic Press 002' }
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getOngoingDowntimeEvents', mockOngoingEvents);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/ongoing', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockOngoingEvents);
      expect(mockDowntimeService.getOngoingDowntimeEvents).toHaveBeenCalledWith({
        siteId: testUser.siteId
      });
    });

    it('should filter by equipment', async () => {
      const mockEvents = [{ id: 'dt-001', equipmentId: 'eq-001' }];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getOngoingDowntimeEvents', mockEvents);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/ongoing', testUser, undefined,
        { equipmentId: 'eq-001' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockEvents);
      expect(mockDowntimeService.getOngoingDowntimeEvents).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        equipmentId: 'eq-001'
      });
    });
  });

  describe('GET /api/v1/downtime/analytics', () => {
    it('should retrieve downtime analytics', async () => {
      const mockAnalytics = {
        totalDowntimeEvents: 25,
        totalDowntimeMinutes: 1500,
        averageDowntimePerEvent: 60,
        mttr: 45.5,
        downtimeFrequency: 0.8,
        equipmentWithMostDowntime: 'CNC Machine 001',
        mostCommonDowntimeReason: 'Equipment Failure',
        downtimeByCategory: [
          { category: 'EQUIPMENT_FAILURE', count: 15, totalMinutes: 900 },
          { category: 'PLANNED_MAINTENANCE', count: 10, totalMinutes: 600 }
        ]
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeAnalytics', mockAnalytics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/analytics', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockAnalytics);
      expect(mockDowntimeService.getDowntimeAnalytics).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 30
      });
    });

    it('should accept custom time period', async () => {
      const mockAnalytics = { totalDowntimeEvents: 50 };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeAnalytics', mockAnalytics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/analytics', testUser, undefined,
        { days: 90 }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockAnalytics);
      expect(mockDowntimeService.getDowntimeAnalytics).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 90
      });
    });

    it('should filter by equipment', async () => {
      const mockAnalytics = { totalDowntimeEvents: 10, equipmentId: 'eq-001' };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeAnalytics', mockAnalytics);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/analytics', testUser, undefined,
        { equipmentId: 'eq-001', days: 30 }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockAnalytics);
      expect(mockDowntimeService.getDowntimeAnalytics).toHaveBeenCalledWith({
        equipmentId: 'eq-001',
        siteId: testUser.siteId,
        days: 30
      });
    });
  });

  describe('GET /api/v1/downtime/reasons', () => {
    it('should retrieve downtime reasons', async () => {
      const mockReasons = [
        {
          id: 'reason-001',
          code: 'EQUIP-FAIL',
          name: 'Equipment Failure',
          description: 'Mechanical or electrical equipment failure',
          category: 'EQUIPMENT_FAILURE',
          isActive: true
        },
        {
          id: 'reason-002',
          code: 'PLAN-MAINT',
          name: 'Planned Maintenance',
          description: 'Scheduled preventive maintenance',
          category: 'PLANNED_MAINTENANCE',
          isActive: true
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeReasons', mockReasons);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/reasons', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockReasons);
      expect(mockDowntimeService.getDowntimeReasons).toHaveBeenCalledWith({
        isActive: true
      });
    });

    it('should filter by category', async () => {
      const mockReasons = [
        { id: 'reason-001', category: 'EQUIPMENT_FAILURE' }
      ];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeReasons', mockReasons);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/reasons', testUser, undefined,
        { category: 'EQUIPMENT_FAILURE' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockReasons);
      expect(mockDowntimeService.getDowntimeReasons).toHaveBeenCalledWith({
        category: 'EQUIPMENT_FAILURE',
        isActive: true
      });
    });

    it('should include inactive reasons when requested', async () => {
      const mockReasons = [
        { id: 'reason-001', isActive: true },
        { id: 'reason-002', isActive: false }
      ];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeReasons', mockReasons);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/reasons', testUser, undefined,
        { isActive: 'false' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockReasons);
      expect(mockDowntimeService.getDowntimeReasons).toHaveBeenCalledWith({
        isActive: false
      });
    });
  });

  describe('POST /api/v1/downtime/reasons', () => {
    const validReasonData = {
      code: 'POWER-OUT',
      name: 'Power Outage',
      description: 'Electrical power interruption',
      category: 'POWER_OUTAGE',
      isActive: true
    };

    it('should create new downtime reason successfully', async () => {
      const mockReason = {
        id: 'reason-test-001',
        ...validReasonData,
        createdAt: new Date().toISOString(),
        createdById: testUser.id
      };

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'createDowntimeReason', mockReason);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/reasons', testUser, validReasonData
      );

      ResponseTestHelper.expectCreatedResponse(response, mockReason);
      expect(mockDowntimeService.createDowntimeReason).toHaveBeenCalledWith({
        ...validReasonData,
        createdById: testUser.id
      });
    });

    it('should return 400 for missing required fields', async () => {
      await ValidationTestHelper.testRequiredFields(
        app, 'post', '/api/v1/downtime/reasons', testUser, validReasonData,
        ['code', 'name', 'category']
      );
    });

    it('should return 400 for invalid category', async () => {
      const invalidData = { ...validReasonData, category: 'INVALID_CATEGORY' };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/reasons', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });

    it('should return 400 for code exceeding 50 characters', async () => {
      const invalidData = { ...validReasonData, code: 'A'.repeat(51) };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/downtime/reasons', testUser, invalidData
      );

      ResponseTestHelper.expectValidationError(response);
    });
  });

  describe('GET /api/v1/downtime/trends', () => {
    it('should retrieve downtime trends', async () => {
      const mockTrends = [
        {
          period: '2025-01-01',
          totalEvents: 5,
          totalMinutes: 300,
          averageMinutesPerEvent: 60
        },
        {
          period: '2025-01-02',
          totalEvents: 3,
          totalMinutes: 180,
          averageMinutesPerEvent: 60
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeTrends', mockTrends);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/trends', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockTrends);
      expect(mockDowntimeService.getDowntimeTrends).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 30,
        groupBy: 'day'
      });
    });

    it('should accept custom grouping and time period', async () => {
      const mockTrends = [{ period: '2025-01', totalEvents: 25 }];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeTrends', mockTrends);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/trends', testUser, undefined,
        { days: 90, groupBy: 'week' }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockTrends);
      expect(mockDowntimeService.getDowntimeTrends).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 90,
        groupBy: 'week'
      });
    });
  });

  describe('GET /api/v1/downtime/summary', () => {
    it('should retrieve downtime summary by reason', async () => {
      const mockSummary = [
        {
          reasonId: 'reason-001',
          reasonName: 'Equipment Failure',
          category: 'EQUIPMENT_FAILURE',
          totalEvents: 15,
          totalMinutes: 900,
          percentage: 60.0
        },
        {
          reasonId: 'reason-002',
          reasonName: 'Planned Maintenance',
          category: 'PLANNED_MAINTENANCE',
          totalEvents: 10,
          totalMinutes: 600,
          percentage: 40.0
        }
      ];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeSummaryByReason', mockSummary);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/summary', testUser
      );

      ResponseTestHelper.expectSuccessResponse(response, mockSummary);
      expect(mockDowntimeService.getDowntimeSummaryByReason).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 30
      });
    });

    it('should accept custom time period', async () => {
      const mockSummary = [{ reasonName: 'Equipment Failure', totalEvents: 30 }];

      ServiceMockHelper.mockServiceSuccess(mockDowntimeService, 'getDowntimeSummaryByReason', mockSummary);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/summary', testUser, undefined,
        { days: 90 }
      );

      ResponseTestHelper.expectSuccessResponse(response, mockSummary);
      expect(mockDowntimeService.getDowntimeSummaryByReason).toHaveBeenCalledWith({
        siteId: testUser.siteId,
        days: 90
      });
    });
  });

  describe('Authorization Tests', () => {
    it('should return 401 for unauthenticated requests', async () => {
      await RequestTestHelper.testUnauthorizedAccess(app, 'get', '/api/v1/downtime/events');
      await RequestTestHelper.testUnauthorizedAccess(app, 'post', '/api/v1/downtime/events');
    });

    it('should return 403 for users without sufficient permissions', async () => {
      const readOnlyUser = AuthTestHelper.createReadOnlyUser();

      await RequestTestHelper.testForbiddenAccess(
        app, 'post', '/api/v1/downtime/events', readOnlyUser, {
          equipmentId: 'eq-001',
          downtimeReasonId: 'reason-001',
          startTime: new Date().toISOString()
        }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'put', '/api/v1/downtime/events/dt-001', readOnlyUser, { description: 'Updated' }
      );

      await RequestTestHelper.testForbiddenAccess(
        app, 'delete', '/api/v1/downtime/events/dt-001', readOnlyUser
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/v1/downtime/events')
        .set('Authorization', `Bearer test-token-${testUser.id}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should handle service timeouts', async () => {
      const timeoutError = new Error('Service timeout');
      (timeoutError as any).code = 'TIMEOUT';
      ServiceMockHelper.mockServiceError(mockDowntimeService, 'getDowntimeEvents', timeoutError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser
      );

      expect(response.status).toBe(504);
      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'DATABASE_ERROR';
      ServiceMockHelper.mockServiceError(mockDowntimeService, 'getDowntimeEvents', dbError);

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/downtime/events', testUser
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});