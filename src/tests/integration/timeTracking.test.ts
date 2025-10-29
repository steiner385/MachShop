/**
 * Integration Tests: Time Tracking API Endpoints
 * End-to-end tests for the time tracking REST API
 *
 * GitHub Issue #46: Time Tracking Infrastructure
 */

import request from 'supertest';
import { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  TimeType,
  TimeEntrySource,
  TimeEntryStatus,
  TimeTrackingGranularity,
  IndirectCategory
} from '@prisma/client';

// Mock the app setup - in a real test, you'd import your actual app
const createMockApp = (): Express => {
  const express = require('express');
  const app = express();
  app.use(express.json());

  // Mock auth middleware
  app.use((req: any, res: any, next: any) => {
    req.user = { id: 'test-user-1', username: 'test.operator' };
    next();
  });

  return app;
};

describe('Time Tracking API Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;

  // Mock data
  const mockUser = {
    id: 'test-user-1',
    username: 'test.operator',
    laborRate: 25.0,
    costCenter: 'PRODUCTION',
    userSiteRoles: [{
      site: { id: 'test-site-1' }
    }]
  };

  const mockSite = {
    id: 'test-site-1',
    siteCode: 'TEST_SITE',
    siteName: 'Test Manufacturing Site',
  };

  const mockWorkOrder = {
    id: 'test-wo-1',
    workOrderNumber: 'WO-2024-001',
    partId: 'part-1',
    quantity: 100,
  };

  const mockOperation = {
    id: 'test-op-1',
    workOrderId: 'test-wo-1',
    routingOperationId: 'routing-op-1',
  };

  const mockIndirectCode = {
    id: 'break-15',
    code: 'BREAK-15',
    description: '15-minute break',
    category: IndirectCategory.BREAK,
  };

  const mockConfiguration = {
    id: 'config-1',
    siteId: 'test-site-1',
    timeTrackingEnabled: true,
    trackingGranularity: TimeTrackingGranularity.OPERATION,
    allowMultiTasking: false,
    requireTimeApproval: true,
  };

  beforeAll(async () => {
    // Setup test database and app
    app = createMockApp();
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
        }
      }
    });

    // Import and mount routes after setting up mocks
    const timeTrackingRoutes = require('../../routes/timeTracking').default;
    app.use('/api/v1/time-tracking', timeTrackingRoutes);
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.laborTimeEntry.deleteMany({});
    await prisma.machineTimeEntry.deleteMany({});
    await prisma.indirectCostCode.deleteMany({});
    await prisma.timeTrackingConfiguration.deleteMany({});

    // Seed test data
    await prisma.user.upsert({
      where: { id: mockUser.id },
      update: mockUser,
      create: mockUser,
    });

    await prisma.site.upsert({
      where: { id: mockSite.id },
      update: mockSite,
      create: mockSite,
    });

    await prisma.workOrder.upsert({
      where: { id: mockWorkOrder.id },
      update: mockWorkOrder,
      create: mockWorkOrder,
    });

    await prisma.workOrderOperation.upsert({
      where: { id: mockOperation.id },
      update: mockOperation,
      create: mockOperation,
    });

    await prisma.indirectCostCode.upsert({
      where: { id: mockIndirectCode.id },
      update: mockIndirectCode,
      create: { ...mockIndirectCode, createdBy: 'test-system' },
    });

    await prisma.timeTrackingConfiguration.upsert({
      where: { siteId: mockConfiguration.siteId },
      update: mockConfiguration,
      create: { ...mockConfiguration, createdBy: 'test-system' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/v1/time-tracking/clock-in', () => {
    it('should successfully clock in to a work order', async () => {
      const clockInData = {
        userId: mockUser.id,
        workOrderId: mockWorkOrder.id,
        entrySource: 'MANUAL',
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(clockInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: mockUser.id,
        workOrderId: mockWorkOrder.id,
        timeType: TimeType.DIRECT_LABOR,
        status: TimeEntryStatus.ACTIVE,
      });
      expect(response.body.data.clockInTime).toBeDefined();
    });

    it('should successfully clock in to an operation', async () => {
      const clockInData = {
        userId: mockUser.id,
        operationId: mockOperation.id,
        entrySource: 'KIOSK',
        deviceId: 'kiosk-001',
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(clockInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: mockUser.id,
        operationId: mockOperation.id,
        entrySource: TimeEntrySource.KIOSK,
        deviceId: 'kiosk-001',
      });
    });

    it('should successfully clock in to indirect activity', async () => {
      const clockInData = {
        userId: mockUser.id,
        indirectCodeId: mockIndirectCode.id,
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(clockInData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        userId: mockUser.id,
        indirectCodeId: mockIndirectCode.id,
        timeType: TimeType.INDIRECT,
      });
    });

    it('should reject invalid clock-in data', async () => {
      const invalidData = {
        userId: mockUser.id,
        // Missing work order, operation, or indirect code
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Must provide either work order, operation, or indirect code');
    });

    it('should prevent clock-in if user already has active entry', async () => {
      // First clock-in
      const firstClockIn = {
        userId: mockUser.id,
        workOrderId: mockWorkOrder.id,
      };

      await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(firstClockIn)
        .expect(201);

      // Second clock-in should fail
      const secondClockIn = {
        userId: mockUser.id,
        operationId: mockOperation.id,
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(secondClockIn)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot clock in. Active time entry exists');
    });
  });

  describe('POST /api/v1/time-tracking/clock-out/:timeEntryId', () => {
    let timeEntryId: string;

    beforeEach(async () => {
      // Create an active time entry
      const clockInData = {
        userId: mockUser.id,
        workOrderId: mockWorkOrder.id,
      };

      const clockInResponse = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send(clockInData);

      timeEntryId = clockInResponse.body.data.id;
    });

    it('should successfully clock out from active entry', async () => {
      const clockOutTime = new Date();
      const clockOutData = {
        clockOutTime: clockOutTime.toISOString(),
      };

      const response = await request(app)
        .post(`/api/v1/time-tracking/clock-out/${timeEntryId}`)
        .send(clockOutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: timeEntryId,
        status: TimeEntryStatus.PENDING_APPROVAL,
      });
      expect(response.body.data.clockOutTime).toBeDefined();
      expect(response.body.data.duration).toBeGreaterThan(0);
      expect(response.body.data.laborCost).toBeGreaterThan(0);
    });

    it('should clock out with current time if no time provided', async () => {
      const response = await request(app)
        .post(`/api/v1/time-tracking/clock-out/${timeEntryId}`)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.clockOutTime).toBeDefined();
    });

    it('should reject clock-out for non-existent entry', async () => {
      const response = await request(app)
        .post('/api/v1/time-tracking/clock-out/invalid-entry-id')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/v1/time-tracking/active-entries/:userId', () => {
    beforeEach(async () => {
      // Create some active entries
      await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          workOrderId: mockWorkOrder.id,
        });

      await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          indirectCodeId: mockIndirectCode.id,
        });
    });

    it('should return active time entries for user', async () => {
      const response = await request(app)
        .get(`/api/v1/time-tracking/active-entries/${mockUser.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.count).toBe(2);

      // Check that both entries are active
      response.body.data.forEach((entry: any) => {
        expect(entry.status).toBe(TimeEntryStatus.ACTIVE);
        expect(entry.userId).toBe(mockUser.id);
      });
    });

    it('should return empty array for user with no active entries', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/active-entries/nonexistent-user')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });
  });

  describe('POST /api/v1/time-tracking/stop-all/:userId', () => {
    beforeEach(async () => {
      // Create active entries
      await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          workOrderId: mockWorkOrder.id,
        });

      await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          indirectCodeId: mockIndirectCode.id,
        });
    });

    it('should stop all active entries for user', async () => {
      const stopData = {
        reason: 'Emergency stop for shift end',
      };

      const response = await request(app)
        .post(`/api/v1/time-tracking/stop-all/${mockUser.id}`)
        .send(stopData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.message).toContain('Stopped 2 active time entries');

      // Verify no active entries remain
      const activeResponse = await request(app)
        .get(`/api/v1/time-tracking/active-entries/${mockUser.id}`)
        .expect(200);

      expect(activeResponse.body.data).toHaveLength(0);
    });

    it('should require reason for stopping all entries', async () => {
      const response = await request(app)
        .post(`/api/v1/time-tracking/stop-all/${mockUser.id}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Reason is required');
    });
  });

  describe('GET /api/v1/time-tracking/entries', () => {
    beforeEach(async () => {
      // Create and complete some time entries
      const clockInResponse = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          workOrderId: mockWorkOrder.id,
        });

      await request(app)
        .post(`/api/v1/time-tracking/clock-out/${clockInResponse.body.data.id}`)
        .send({});

      const indirectClockInResponse = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          indirectCodeId: mockIndirectCode.id,
        });

      await request(app)
        .post(`/api/v1/time-tracking/clock-out/${indirectClockInResponse.body.data.id}`)
        .send({});
    });

    it('should return paginated time entries', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/entries')
        .query({
          limit: 10,
          offset: 0,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        total: 2,
        limit: 10,
        offset: 0,
        hasMore: false,
      });
    });

    it('should filter entries by user', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/entries')
        .query({
          userId: mockUser.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);

      response.body.data.forEach((entry: any) => {
        expect(entry.userId).toBe(mockUser.id);
      });
    });

    it('should filter entries by work order', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/entries')
        .query({
          workOrderId: mockWorkOrder.id,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].workOrderId).toBe(mockWorkOrder.id);
    });

    it('should filter entries by time type', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/entries')
        .query({
          timeType: TimeType.INDIRECT,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].timeType).toBe(TimeType.INDIRECT);
    });
  });

  describe('GET /api/v1/time-tracking/entries/:id', () => {
    let timeEntryId: string;

    beforeEach(async () => {
      const clockInResponse = await request(app)
        .post('/api/v1/time-tracking/clock-in')
        .send({
          userId: mockUser.id,
          workOrderId: mockWorkOrder.id,
        });

      timeEntryId = clockInResponse.body.data.id;
    });

    it('should return specific time entry by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/time-tracking/entries/${timeEntryId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: timeEntryId,
        userId: mockUser.id,
        workOrderId: mockWorkOrder.id,
      });
    });

    it('should return 404 for non-existent entry', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/entries/nonexistent-id')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/v1/time-tracking/indirect-cost-codes', () => {
    it('should return all indirect cost codes', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/indirect-cost-codes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.count).toBe(1);
      expect(response.body.data[0]).toMatchObject({
        code: mockIndirectCode.code,
        description: mockIndirectCode.description,
        category: mockIndirectCode.category,
      });
    });

    it('should filter cost codes by category', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/indirect-cost-codes')
        .query({
          category: IndirectCategory.BREAK,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe(IndirectCategory.BREAK);
    });

    it('should filter cost codes by active status', async () => {
      const response = await request(app)
        .get('/api/v1/time-tracking/indirect-cost-codes')
        .query({
          isActive: 'true',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].isActive).toBe(true);
    });
  });

  describe('POST /api/v1/time-tracking/indirect-cost-codes', () => {
    it('should create new indirect cost code', async () => {
      const newCostCode = {
        code: 'LUNCH-60',
        description: '1-hour lunch break',
        category: IndirectCategory.LUNCH,
        costCenter: 'LABOR-INDIRECT',
        displayColor: '#FF9800',
        displayIcon: 'restaurant',
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/indirect-cost-codes')
        .send(newCostCode)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(newCostCode);
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.createdAt).toBeDefined();
    });

    it('should reject duplicate cost code', async () => {
      const duplicateCode = {
        code: mockIndirectCode.code, // Same as existing
        description: 'Duplicate break',
        category: IndirectCategory.BREAK,
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/indirect-cost-codes')
        .send(duplicateCode)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should validate required fields', async () => {
      const invalidCode = {
        description: 'Missing code and category',
      };

      const response = await request(app)
        .post('/api/v1/time-tracking/indirect-cost-codes')
        .send(invalidCode)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/time-tracking/sites/:siteId/configuration', () => {
    it('should return site time tracking configuration', async () => {
      const response = await request(app)
        .get(`/api/v1/time-tracking/sites/${mockSite.id}/configuration`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        siteId: mockSite.id,
        timeTrackingEnabled: true,
        trackingGranularity: TimeTrackingGranularity.OPERATION,
        allowMultiTasking: false,
        requireTimeApproval: true,
      });
    });

    it('should create default configuration if none exists', async () => {
      // Delete existing configuration
      await prisma.timeTrackingConfiguration.delete({
        where: { siteId: mockSite.id }
      });

      const response = await request(app)
        .get(`/api/v1/time-tracking/sites/${mockSite.id}/configuration`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.siteId).toBe(mockSite.id);
      expect(response.body.data.timeTrackingEnabled).toBe(true); // Default value
    });
  });

  describe('PUT /api/v1/time-tracking/sites/:siteId/configuration', () => {
    it('should update site time tracking configuration', async () => {
      const updateData = {
        allowMultiTasking: true,
        overtimeThresholdHours: 10.0,
        enableMachineTracking: true,
      };

      const response = await request(app)
        .put(`/api/v1/time-tracking/sites/${mockSite.id}/configuration`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
      expect(response.body.message).toContain('updated successfully');
    });

    it('should validate configuration fields', async () => {
      const invalidData = {
        trackingGranularity: 'INVALID_GRANULARITY',
      };

      const response = await request(app)
        .put(`/api/v1/time-tracking/sites/${mockSite.id}/configuration`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});