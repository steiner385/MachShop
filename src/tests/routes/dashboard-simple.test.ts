import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dashboardRouter from '@/routes/dashboard';
import { setupTestDatabase, cleanupTestData, teardownTestDatabase } from '../helpers/database';

describe('Dashboard Routes - Simple Tests', () => {
  let app: express.Application;
  let testDb: PrismaClient;
  let testUserId: string;
  let testSiteId: string;
  let testPartId: string;
  let authToken: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Setup Express app with dashboard routes
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 'test-user-123',
        username: 'testuser',
        roles: ['Production Supervisor'], // One of the accepted roles
        permissions: ['production.read', 'site.access']
      };
      next();
    });

    app.use('/api/v1/dashboard', dashboardRouter);

    // Create test data using upsert to avoid conflicts
    const testUser = await testDb.user.upsert({
      where: { username: 'testuser' },
      update: {},
      create: {
        id: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.value',
        roles: ['Production Manager'],
        permissions: ['production.read'],
        isActive: true
      }
    });

    const testSite = await testDb.site.upsert({
      where: { siteCode: 'TEST-SITE' },
      update: {},
      create: {
        id: 'test-site-123',
        siteCode: 'TEST-SITE',
        siteName: 'Test Manufacturing Site',
        location: 'Test Location',
        isActive: true
      }
    });

    const testPart = await testDb.part.upsert({
      where: { partNumber: 'TEST-PART-001' },
      update: {},
      create: {
        id: 'test-part-123',
        partNumber: 'TEST-PART-001',
        partName: 'Test Part',
        description: 'Test part for unit tests',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        isActive: true
      }
    });

    testUserId = testUser.id;
    testSiteId = testSite.id;
    testPartId = testPart.id;
    authToken = 'Bearer test-token';
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
  });

  describe('GET /api/v1/dashboard/kpis', () => {
    it('should return KPI metrics with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activeWorkOrders');
      expect(response.body).toHaveProperty('workOrdersChange');
      expect(response.body).toHaveProperty('completedToday');
      expect(response.body).toHaveProperty('completedChange');
      expect(response.body).toHaveProperty('qualityYield');
      expect(response.body).toHaveProperty('yieldChange');
      expect(response.body).toHaveProperty('equipmentUtilization');
      expect(response.body).toHaveProperty('utilizationChange');
    });

    it('should handle zero data gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.activeWorkOrders).toBe(0);
      expect(response.body.completedToday).toBe(0);
      expect(response.body.qualityYield).toBe(0);
      expect(response.body.equipmentUtilization).toBe(0);
      expect(response.body.workOrdersChange).toBe(0);
    });

    it('should calculate active work orders correctly', async () => {
      // Create test work orders with correct schema
      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-1',
            workOrderNumber: 'WO-001',
            partId: testPartId,
            partNumber: 'TEST-PART-001',
            quantity: 10,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId
          },
          {
            id: 'wo-2',
            workOrderNumber: 'WO-002',
            partId: testPartId,
            partNumber: 'TEST-PART-001',
            quantity: 20,
            quantityCompleted: 5,
            quantityScrapped: 0,
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            siteId: testSiteId,
            createdById: testUserId
          },
          {
            id: 'wo-3',
            workOrderNumber: 'WO-003',
            partId: testPartId,
            partNumber: 'TEST-PART-001',
            quantity: 15,
            quantityCompleted: 15,
            quantityScrapped: 0,
            status: 'COMPLETED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.activeWorkOrders).toBe(2); // RELEASED + IN_PROGRESS
    });
  });

  describe('GET /api/v1/dashboard/recent-work-orders', () => {
    it('should return recent work orders with correct structure', async () => {
      await testDb.workOrder.create({
        data: {
          id: 'wo-recent-1',
          workOrderNumber: 'WO-RECENT-001',
          partId: testPartId,
          partNumber: 'TEST-PART-001',
          quantity: 10,
          quantityCompleted: 3,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          siteId: testSiteId,
          createdById: testUserId,
          dueDate: new Date('2025-12-31')
        }
      });

      const response = await request(app)
        .get('/api/v1/dashboard/recent-work-orders')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const workOrder = response.body[0];
      expect(workOrder).toHaveProperty('id');
      expect(workOrder).toHaveProperty('workOrderNumber');
      expect(workOrder).toHaveProperty('status');
      expect(workOrder).toHaveProperty('priority');
    });
  });

  describe('GET /api/v1/dashboard/alerts', () => {
    it('should return alerts with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/alerts')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return overdue work order alerts', async () => {
      const pastDate = new Date('2020-01-01');

      await testDb.workOrder.create({
        data: {
          id: 'wo-overdue-1',
          workOrderNumber: 'WO-OVERDUE-001',
          partId: testPartId,
          partNumber: 'TEST-PART-001',
          quantity: 10,
          quantityCompleted: 5,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          siteId: testSiteId,
          createdById: testUserId,
          dueDate: pastDate
        }
      });

      const response = await request(app)
        .get('/api/v1/dashboard/alerts')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      const overdueAlert = response.body.find((alert: any) =>
        alert.type === 'error' && alert.title === 'Work Order Overdue'
      );
      expect(overdueAlert).toBeDefined();
      expect(overdueAlert?.description).toContain('WO-OVERDUE-001');
    });
  });

  describe('GET /api/v1/dashboard/efficiency', () => {
    it('should return efficiency metrics with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/efficiency')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('oee');
      expect(response.body).toHaveProperty('fpy');
      expect(response.body).toHaveProperty('onTimeDelivery');
    });

    it('should handle zero data gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/efficiency')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.oee).toBe(0);
      expect(response.body.fpy).toBe(0);
      expect(response.body.onTimeDelivery).toBe(0);
    });
  });

  describe('GET /api/v1/dashboard/quality-trends', () => {
    it('should return quality trends with correct structure', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/quality-trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('defectRate');
      expect(response.body).toHaveProperty('defectRateTrend');
      expect(response.body).toHaveProperty('complaintRate');
      expect(response.body).toHaveProperty('complaintRateTrend');
      expect(response.body).toHaveProperty('ncrRate');
      expect(response.body).toHaveProperty('ncrRateTrend');
    });

    it('should handle zero data gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/quality-trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.defectRate).toBe(0);
      expect(response.body.ncrRate).toBe(0);
      expect(response.body.complaintRate).toBe(0);
      expect(response.body.defectRateTrend).toBe(0);
      expect(response.body.ncrRateTrend).toBe(0);
      expect(response.body.complaintRateTrend).toBe(0);
    });
  });
});
