import { describe, it, expect, beforeEach, beforeAll, afterAll, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import dashboardRouter from '@/routes/dashboard';
import { setupTestDatabase, cleanupTestData, teardownTestDatabase } from '../helpers/database';

describe('Dashboard Routes', () => {
  let app: express.Application;
  let testDb: PrismaClient;
  let testUserId: string;
  let testSiteId: string;
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
        roles: ['Production Supervisor'],
        permissions: ['production.read', 'site.access', 'dashboard.read', 'dashboard.access']
      };
      next();
    });

    app.use('/api/v1/dashboard', dashboardRouter);

    // Create test part for work order references
    await testDb.part.upsert({
      where: { partNumber: 'PART-TEST-123' },
      update: {},
      create: {
        id: 'test-part-123',
        partNumber: 'PART-TEST-123',
        partName: 'Test Part',
        partType: 'MANUFACTURED',
        description: 'Test part for dashboard tests',
        revision: 'A',
        isActive: true,
        unitOfMeasure: 'EA'
      }
    });

    // Create test quality plan for inspection references
    await testDb.qualityPlan.upsert({
      where: { planNumber: 'PLAN-TEST-123' },
      update: {},
      create: {
        id: 'test-plan-123',
        planNumber: 'PLAN-TEST-123',
        planName: 'Test Quality Plan',
        partId: 'test-part-123',
        description: 'Test quality plan for dashboard tests',
        isActive: true
      }
    });

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
        roles: ['Production Supervisor'],
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

    testUserId = testUser.id;
    testSiteId = testSite.id;
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

    it('should calculate active work orders correctly', async () => {
      // Create test work orders
      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-1',
            workOrderNumber: 'WO-001',
            partId: 'test-part-123',
            partNumber: 'PART-001',
            quantity: 10, // Changed from quantityOrdered to quantity
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId // Changed from createdBy to createdById
          },
          {
            id: 'wo-2',
            workOrderNumber: 'WO-002',
            partId: 'test-part-123',
          partNumber: 'PART-002',
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
            partId: 'test-part-123',
          partNumber: 'PART-003',
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

    it('should calculate work orders change percentage correctly', async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);

      // Create work orders from yesterday
      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-old-1',
            workOrderNumber: 'WO-OLD-001',
            partId: 'test-part-123',
          partNumber: 'PART-001',
            quantity: 10,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId,
            createdAt: yesterday
          }
        ]
      });

      // Create work orders today
      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-new-1',
            workOrderNumber: 'WO-NEW-001',
            partId: 'test-part-123',
          partNumber: 'PART-002',
            quantity: 20,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'HIGH',
            siteId: testSiteId,
            createdById: testUserId,
            createdAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.activeWorkOrders).toBe(2);
      expect(response.body.workOrdersChange).toBe(100); // From 1 to 2 is 100% increase
    });

    it('should calculate completed today count correctly', async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-completed-1',
            workOrderNumber: 'WO-COMP-001',
            partId: 'test-part-123',
          partNumber: 'PART-001',
            quantity: 10,
            quantityCompleted: 10,
            quantityScrapped: 0,
            status: 'COMPLETED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId,
            actualEndDate: new Date()
          },
          {
            id: 'wo-completed-2',
            workOrderNumber: 'WO-COMP-002',
            partId: 'test-part-123',
          partNumber: 'PART-002',
            quantity: 20,
            quantityCompleted: 20,
            quantityScrapped: 0,
            status: 'COMPLETED',
            priority: 'HIGH',
            siteId: testSiteId,
            createdById: testUserId,
            actualEndDate: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.completedToday).toBe(2);
    });

    it('should calculate quality yield correctly', async () => {
      // Create test work order
      const workOrder = await testDb.workOrder.create({
        data: {
          id: 'wo-quality-1',
          workOrderNumber: 'WO-QUALITY-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
          quantity: 10,
          quantityCompleted: 0,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          siteId: testSiteId,
          createdById: testUserId
        }
      });

      // Create quality inspections
      await testDb.qualityInspection.createMany({
        data: [
          {
            id: 'insp-1',
            inspectionNumber: 'INS-001',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          },
          {
            id: 'insp-2',
            inspectionNumber: 'INS-002',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          },
          {
            id: 'insp-3',
            inspectionNumber: 'INS-003',
            workOrderId: workOrder.id,
            result: 'FAIL',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.qualityYield).toBe(66.7); // 2 passed out of 3 = 66.7%
    });

    it('should calculate equipment utilization correctly', async () => {
      // Create test equipment
      await testDb.equipment.createMany({
        data: [
          {
            id: 'eq-1',
            name: 'CNC Machine 1',
            equipmentNumber: 'EQ-001',
            equipmentClass: 'PRODUCTION',
            serialNumber: 'CNC-001',
            equipmentType: 'CNC',
            status: 'OPERATIONAL',
            utilizationRate: 85.5,
            siteId: testSiteId
          },
          {
            id: 'eq-2',
            name: 'CNC Machine 2',
            equipmentNumber: 'EQ-002',
            equipmentClass: 'PRODUCTION',
            serialNumber: 'CNC-002',
            equipmentType: 'CNC',
            status: 'OPERATIONAL',
            utilizationRate: 92.3,
            siteId: testSiteId
          },
          {
            id: 'eq-3',
            name: 'CNC Machine 3',
            equipmentNumber: 'EQ-003',
            equipmentClass: 'PRODUCTION',
            serialNumber: 'CNC-003',
            equipmentType: 'CNC',
            status: 'MAINTENANCE',
            utilizationRate: 0,
            siteId: testSiteId
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/kpis')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.equipmentUtilization).toBe(88.9); // Average of 85.5 and 92.3
    });

    it('should filter by siteId when provided', async () => {
      const otherSite = await testDb.site.create({
        data: {
          id: 'other-site-123',
          siteCode: 'OTHER-SITE',
          siteName: 'Other Site',
          location: 'Other Location',
          isActive: true
        }
      });

      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-site1-1',
            workOrderNumber: 'WO-SITE1-001',
            partId: 'test-part-123',
          partNumber: 'PART-001',
            quantity: 10,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId
          },
          {
            id: 'wo-site2-1',
            workOrderNumber: 'WO-SITE2-001',
            partId: 'test-part-123',
          partNumber: 'PART-002',
            quantity: 20,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'HIGH',
            siteId: otherSite.id,
            createdById: testUserId
          }
        ]
      });

      const response = await request(app)
        .get(`/api/v1/dashboard/kpis?siteId=${testSiteId}`)
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.activeWorkOrders).toBe(1); // Only test site work orders
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
  });

  describe('GET /api/v1/dashboard/recent-work-orders', () => {
    it('should return recent work orders with correct structure', async () => {
      await testDb.workOrder.create({
        data: {
          id: 'wo-recent-1',
          workOrderNumber: 'WO-RECENT-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
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
      expect(workOrder).toHaveProperty('partNumber');
      expect(workOrder).toHaveProperty('status');
      expect(workOrder).toHaveProperty('progress');
      expect(workOrder).toHaveProperty('priority');
      expect(workOrder).toHaveProperty('dueDate');
    });

    it('should calculate progress correctly', async () => {
      await testDb.workOrder.create({
        data: {
          id: 'wo-progress-1',
          workOrderNumber: 'WO-PROGRESS-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
          quantity: 100,
          quantityCompleted: 25,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          siteId: testSiteId,
          createdById: testUserId
        }
      });

      const response = await request(app)
        .get('/api/v1/dashboard/recent-work-orders')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body[0].progress).toBe(25); // 25/100 = 25%
    });

    it('should respect limit parameter', async () => {
      // Create 10 work orders
      const workOrders = Array.from({ length: 10 }, (_, i) => ({
        id: `wo-limit-${i}`,
        workOrderNumber: `WO-LIMIT-${String(i).padStart(3, '0')}`,
        partId: 'test-part-123',
          partNumber: 'PART-001',
        quantity: 10,
        quantityCompleted: 0,
        quantityScrapped: 0,
        status: 'RELEASED',
        priority: 'NORMAL',
        siteId: testSiteId,
        createdById: testUserId
      }));

      await testDb.workOrder.createMany({ data: workOrders });

      const response = await request(app)
        .get('/api/v1/dashboard/recent-work-orders?limit=3')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(3);
    });

    it('should only return active work orders', async () => {
      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-active-1',
            workOrderNumber: 'WO-ACTIVE-001',
            partId: 'test-part-123',
          partNumber: 'PART-001',
            quantity: 10,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'RELEASED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId
          },
          {
            id: 'wo-completed-1',
            workOrderNumber: 'WO-COMPLETED-001',
            partId: 'test-part-123',
          partNumber: 'PART-002',
            quantity: 20,
            quantityCompleted: 20,
            quantityScrapped: 0,
            status: 'COMPLETED',
            priority: 'HIGH',
            siteId: testSiteId,
            createdById: testUserId
          },
          {
            id: 'wo-cancelled-1',
            workOrderNumber: 'WO-CANCELLED-001',
            partId: 'test-part-123',
          partNumber: 'PART-003',
            quantity: 15,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'CANCELLED',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/recent-work-orders')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1); // Only RELEASED
      expect(response.body[0].status).toBe('RELEASED');
    });

    it('should return 400 for invalid limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/dashboard/recent-work-orders?limit=invalid')
        .set('Authorization', authToken);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
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
          partId: 'test-part-123',
          partNumber: 'PART-001',
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
      const overdueAlert = response.body.find((alert: any) => alert.type === 'error' && alert.title === 'Work Order Overdue');
      expect(overdueAlert).toBeDefined();
      expect(overdueAlert?.description).toContain('WO-OVERDUE-001');
    });

    it('should return equipment maintenance alerts', async () => {
      await testDb.equipment.create({
        data: {
          id: 'eq-maintenance-1',
          name: 'CNC Machine Under Maintenance',
          equipmentNumber: 'EQ-001',
          equipmentClass: 'PRODUCTION',
          serialNumber: 'CNC-MAINT-001',
          equipmentType: 'CNC',
          status: 'MAINTENANCE',
          utilizationRate: 0,
          siteId: testSiteId
        }
      });

      const response = await request(app)
        .get('/api/v1/dashboard/alerts')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      const maintenanceAlert = response.body.find((alert: any) =>
        alert.type === 'warning' && alert.title === 'Equipment Maintenance'
      );
      expect(maintenanceAlert).toBeDefined();
      expect(maintenanceAlert?.description).toContain('CNC Machine Under Maintenance');
    });

    it('should return open NCR alerts', async () => {
      const workOrder = await testDb.workOrder.create({
        data: {
          id: 'wo-ncr-1',
          workOrderNumber: 'WO-NCR-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
          quantity: 10,
          quantityCompleted: 0,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          siteId: testSiteId,
          createdById: testUserId
        }
      });

      await testDb.nCR.create({
        data: {
          id: 'ncr-1',
          ncrNumber: 'NCR-001',
          partNumber: 'PART-001',
          workOrderId: workOrder.id,
          operation: 'Final Inspection',
          defectType: 'Dimensional',
          description: 'Critical dimensional defect found during inspection',
          severity: 'CRITICAL',
          quantity: 5,
          status: 'OPEN',
          assignedToId: testUserId,
          createdById: testUserId,
          dueDate: new Date('2025-12-31')
        }
      });

      const response = await request(app)
        .get('/api/v1/dashboard/alerts')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      const ncrAlert = response.body.find((alert: any) => alert.title === 'Open NCR');
      expect(ncrAlert).toBeDefined();
      expect(ncrAlert?.type).toBe('error'); // Critical NCR should be error
      expect(ncrAlert?.description).toContain('NCR-001');
    });

    it('should sort alerts by time descending', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await testDb.workOrder.createMany({
        data: [
          {
            id: 'wo-old',
            workOrderNumber: 'WO-OLD',
            partId: 'test-part-123',
          partNumber: 'PART-001',
            quantity: 10,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'IN_PROGRESS',
            priority: 'NORMAL',
            siteId: testSiteId,
            createdById: testUserId,
            dueDate: twoHoursAgo
          },
          {
            id: 'wo-recent',
            workOrderNumber: 'WO-RECENT',
            partId: 'test-part-123',
          partNumber: 'PART-002',
            quantity: 20,
            quantityCompleted: 0,
            quantityScrapped: 0,
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            siteId: testSiteId,
            createdById: testUserId,
            dueDate: oneHourAgo
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/alerts')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      if (response.body.length > 1) {
        const firstAlertTime = new Date(response.body[0].time);
        const secondAlertTime = new Date(response.body[1].time);
        expect(firstAlertTime.getTime()).toBeGreaterThanOrEqual(secondAlertTime.getTime());
      }
    });

    it('should respect limit parameter', async () => {
      // Create multiple alerts
      await testDb.equipment.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `eq-maint-${i}`,
          name: `Equipment ${i}`,
          equipmentNumber: `EQ-${String(i).padStart(3, '0')}`,
          equipmentClass: 'PRODUCTION',
          serialNumber: `EQ-${i}`,
          equipmentType: 'CNC',
          status: 'MAINTENANCE',
          utilizationRate: 0,
          siteId: testSiteId
        }))
      });

      const response = await request(app)
        .get('/api/v1/dashboard/alerts?limit=3')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeLessThanOrEqual(3);
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

    it('should calculate FPY (First Pass Yield) correctly', async () => {
      const workOrder = await testDb.workOrder.create({
        data: {
          id: 'wo-fpy-1',
          workOrderNumber: 'WO-FPY-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
          quantity: 10,
          quantityCompleted: 0,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          siteId: testSiteId,
          createdById: testUserId
        }
      });

      await testDb.qualityInspection.createMany({
        data: [
          {
            id: 'fpy-insp-1',
            inspectionNumber: 'INS-004',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          },
          {
            id: 'fpy-insp-2',
            inspectionNumber: 'INS-005',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          },
          {
            id: 'fpy-insp-3',
            inspectionNumber: 'INS-006',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          },
          {
            id: 'fpy-insp-4',
            inspectionNumber: 'INS-007',
            workOrderId: workOrder.id,
            result: 'FAIL',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/efficiency')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.fpy).toBe(75.0); // 3 passed out of 4 = 75%
    });

    it('should calculate OEE correctly based on equipment utilization and quality', async () => {
      // Create equipment with utilization
      await testDb.equipment.create({
        data: {
          id: 'eq-oee-1',
          name: 'CNC Machine',
          equipmentNumber: 'EQ-001',
          equipmentClass: 'PRODUCTION',
          serialNumber: 'CNC-OEE-001',
          equipmentType: 'CNC',
          status: 'OPERATIONAL',
          utilizationRate: 80.0, // 80% availability
          siteId: testSiteId
        }
      });

      // Create quality data
      const workOrder = await testDb.workOrder.create({
        data: {
          id: 'wo-oee-1',
          workOrderNumber: 'WO-OEE-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
          quantity: 10,
          quantityCompleted: 0,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          siteId: testSiteId,
          createdById: testUserId
        }
      });

      await testDb.qualityInspection.createMany({
        data: [
          {
            id: 'oee-insp-1',
            inspectionNumber: 'INS-008',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          },
          {
            id: 'oee-insp-2',
            inspectionNumber: 'INS-009',
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: new Date(),
            completedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/efficiency')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.oee).toBeGreaterThan(0);
      // OEE = Availability (80%) × Performance (95%) × Quality (100%) = 76%
      expect(response.body.oee).toBeCloseTo(76.0, 0);
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

    it('should calculate defect rate correctly for last 30 days', async () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      const workOrder = await testDb.workOrder.create({
        data: {
          id: 'wo-defect-1',
          workOrderNumber: 'WO-DEFECT-001',
          partId: 'test-part-123',
          partNumber: 'PART-001',
          quantity: 10,
          quantityCompleted: 0,
          quantityScrapped: 0,
          status: 'IN_PROGRESS',
          priority: 'NORMAL',
          siteId: testSiteId,
          createdById: testUserId
        }
      });

      // 7 inspections, 2 failed = 28.57% defect rate
      await testDb.qualityInspection.createMany({
        data: [
          ...Array(5).fill(null).map((_, i) => ({
            id: `defect-pass-${i}`,
            inspectionNumber: `INS-${String(10 + i).padStart(3, '0')}`,
            workOrderId: workOrder.id,
            result: 'PASS',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: twentyDaysAgo,
            completedAt: twentyDaysAgo
          })),
          ...Array(2).fill(null).map((_, i) => ({
            id: `defect-fail-${i}`,
            inspectionNumber: `INS-${String(15 + i).padStart(3, '0')}`,
            workOrderId: workOrder.id,
            result: 'FAIL',
            inspectorId: testUserId,
            planId: 'test-plan-123',
            status: 'COMPLETED',
            quantity: 1,
            startedAt: twentyDaysAgo,
            completedAt: twentyDaysAgo
          }))
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/quality-trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.defectRate).toBeCloseTo(28.57, 1);
    });

    it('should calculate NCR rate correctly', async () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      // Create 10 completed work orders
      const workOrders = await Promise.all(
        Array(10).fill(null).map(async (_, i) => {
          return await testDb.workOrder.create({
            data: {
              id: `wo-ncr-rate-${i}`,
              workOrderNumber: `WO-NCR-RATE-${String(i).padStart(3, '0')}`,
              partId: 'test-part-123',
          partNumber: 'PART-001',
              quantity: 10,
              quantityCompleted: 10,
              quantityScrapped: 0,
              status: 'COMPLETED',
              priority: 'NORMAL',
              siteId: testSiteId,
              createdById: testUserId,
              actualEndDate: twentyDaysAgo
            }
          });
        })
      );

      // Create 2 NCRs = 20% NCR rate
      await testDb.nCR.createMany({
        data: [
          {
            id: 'ncr-rate-1',
            ncrNumber: 'NCR-RATE-001',
            partNumber: 'PART-002',
            workOrderId: workOrders[0].id,
            operation: 'Final Inspection',
            defectType: 'Dimensional',
            description: 'Defect description',
            severity: 'MAJOR',
            quantity: 1,
            status: 'OPEN',
            assignedToId: testUserId,
            createdById: testUserId,
            dueDate: new Date('2025-12-31'),
            createdAt: twentyDaysAgo
          },
          {
            id: 'ncr-rate-2',
            ncrNumber: 'NCR-RATE-002',
            partNumber: 'PART-003',
            workOrderId: workOrders[1].id,
            operation: 'Final Inspection',
            defectType: 'Surface',
            description: 'Defect description',
            severity: 'MINOR',
            quantity: 1,
            status: 'CLOSED',
            assignedToId: testUserId,
            createdById: testUserId,
            dueDate: new Date('2025-12-31'),
            createdAt: twentyDaysAgo
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/dashboard/quality-trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.ncrRate).toBe(20.0); // 2 NCRs / 10 work orders = 20%
    });

    it('should calculate complaint rate based on critical NCRs', async () => {
      const now = new Date();
      const twentyDaysAgo = new Date(now);
      twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

      // Create 10 completed work orders
      const workOrders = await Promise.all(
        Array(10).fill(null).map(async (_, i) => {
          return await testDb.workOrder.create({
            data: {
              id: `wo-complaint-${i}`,
              workOrderNumber: `WO-COMPLAINT-${String(i).padStart(3, '0')}`,
              partId: 'test-part-123',
          partNumber: 'PART-001',
              quantity: 10,
              quantityCompleted: 10,
              quantityScrapped: 0,
              status: 'COMPLETED',
              priority: 'NORMAL',
              siteId: testSiteId,
              createdById: testUserId,
              actualEndDate: twentyDaysAgo
            }
          });
        })
      );

      // Create 1 critical NCR = 10% complaint rate
      await testDb.nCR.create({
        data: {
          id: 'ncr-critical-1',
          ncrNumber: 'NCR-CRITICAL-001',
          partNumber: 'PART-004',
          workOrderId: workOrders[0].id,
          operation: 'Final Inspection',
          defectType: 'Material',
          description: 'Critical defect',
          severity: 'CRITICAL',
          quantity: 1,
          status: 'OPEN',
          assignedToId: testUserId,
          createdById: testUserId,
          dueDate: new Date('2025-12-31'),
          createdAt: twentyDaysAgo
        }
      });

      const response = await request(app)
        .get('/api/v1/dashboard/quality-trends')
        .set('Authorization', authToken);

      expect(response.status).toBe(200);
      expect(response.body.complaintRate).toBe(10.0); // 1 critical NCR / 10 work orders = 10%
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
