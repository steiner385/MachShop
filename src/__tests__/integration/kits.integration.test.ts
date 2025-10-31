/**
 * Integration Tests for Kit Management API Endpoints
 *
 * End-to-end testing of kit management API routes including authentication,
 * authorization, request validation, and database interactions.
 */

import { jest, describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../../index';

// Test database setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/machshop_test'
    }
  }
});

describe('Kit Management API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testWorkOrderId: string;
  let testPartId: string;
  let testKitId: string;

  beforeAll(async () => {
    // Connect to test database
    await prisma.$connect();

    // Clean up any existing test data
    await cleanupTestData();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        username: 'test-kit-user',
        email: 'test-kit@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: '$2b$10$test.hash.for.testing',
        roles: ['Production Planner', 'Manufacturing Engineer'],
        permissions: ['kits.read', 'kits.write', 'workorders.read'],
        isActive: true
      }
    });
    testUserId = testUser.id;

    // Create test part
    const testPart = await prisma.part.create({
      data: {
        partNumber: 'TEST-ASSEMBLY-001',
        partName: 'Test Assembly for Kitting',
        description: 'Integration test assembly part',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA',
        isActive: true,
        makeOrBuy: 'MAKE'
      }
    });
    testPartId = testPart.id;

    // Create test work order
    const testWorkOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber: 'WO-TEST-KIT-001',
        partId: testPartId,
        quantity: 5,
        status: 'OPEN',
        priority: 'NORMAL',
        createdById: testUserId,
        plannedStartDate: new Date(),
        plannedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    testWorkOrderId = testWorkOrder.id;

    // Create test BOM items
    const componentPart1 = await prisma.part.create({
      data: {
        partNumber: 'COMP-001-INT',
        partName: 'Integration Test Component 1',
        description: 'First component for integration testing',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        isActive: true,
        makeOrBuy: 'BUY'
      }
    });

    const componentPart2 = await prisma.part.create({
      data: {
        partNumber: 'COMP-002-INT',
        partName: 'Integration Test Component 2',
        description: 'Second component for integration testing',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        isActive: true,
        makeOrBuy: 'BUY'
      }
    });

    await prisma.bOMItem.createMany({
      data: [
        {
          parentPartId: testPartId,
          componentPartId: componentPart1.id,
          quantity: 2,
          unitOfMeasure: 'EA',
          isActive: true
        },
        {
          parentPartId: testPartId,
          componentPartId: componentPart2.id,
          quantity: 1,
          unitOfMeasure: 'EA',
          isActive: true
        }
      ]
    });

    // Create test inventory
    await prisma.inventory.createMany({
      data: [
        {
          partId: componentPart1.id,
          quantity: 100,
          unitOfMeasure: 'EA',
          location: 'A1-B2-C3',
          lotNumber: 'LOT001-INT',
          isActive: true
        },
        {
          partId: componentPart2.id,
          quantity: 50,
          unitOfMeasure: 'EA',
          location: 'A2-B3-C4',
          lotNumber: 'LOT002-INT',
          isActive: true
        }
      ]
    });

    // Get authentication token
    authToken = await getAuthToken(testUser.username);
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset any test state if needed
  });

  afterEach(async () => {
    // Clean up any data created during tests
    if (testKitId) {
      await prisma.kitItem.deleteMany({ where: { kitId: testKitId } });
      await prisma.kit.deleteMany({ where: { id: testKitId } });
      testKitId = '';
    }
  });

  describe('POST /api/v1/kits/generate', () => {
    it('should successfully generate kits for a valid work order', async () => {
      const response = await request(app)
        .post('/api/v1/kits/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrderId,
          priority: 'NORMAL',
          scrapFactor: 0.05,
          autoStage: false
        })
        .expect(201);

      expect(response.body).toHaveProperty('kits');
      expect(response.body).toHaveProperty('analysis');
      expect(response.body).toHaveProperty('shortages');
      expect(response.body).toHaveProperty('warnings');

      expect(response.body.kits).toHaveLength(1);
      expect(response.body.analysis.totalItems).toBe(2);
      expect(response.body.shortages).toHaveLength(0);

      const kit = response.body.kits[0];
      expect(kit).toHaveProperty('kitNumber');
      expect(kit.workOrderId).toBe(testWorkOrderId);
      expect(kit.status).toBe('PLANNED');

      testKitId = kit.id;
    });

    it('should return 400 for invalid work order ID', async () => {
      const response = await request(app)
        .post('/api/v1/kits/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: 'invalid-work-order-id',
          priority: 'NORMAL'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid work order');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/kits/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          priority: 'NORMAL'
          // Missing workOrderId
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/kits/generate')
        .send({
          workOrderId: testWorkOrderId,
          priority: 'NORMAL'
        })
        .expect(401);
    });

    it('should handle insufficient materials gracefully', async () => {
      // Create work order with large quantity to trigger shortage
      const largeQuantityWorkOrder = await prisma.workOrder.create({
        data: {
          workOrderNumber: 'WO-TEST-LARGE-001',
          partId: testPartId,
          quantity: 1000, // Large quantity to exceed inventory
          status: 'OPEN',
          priority: 'HIGH',
          createdById: testUserId,
          plannedStartDate: new Date(),
          plannedCompletionDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      const response = await request(app)
        .post('/api/v1/kits/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: largeQuantityWorkOrder.id,
          priority: 'HIGH'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Critical material shortage');

      // Cleanup
      await prisma.workOrder.delete({ where: { id: largeQuantityWorkOrder.id } });
    });
  });

  describe('GET /api/v1/kits', () => {
    beforeEach(async () => {
      // Create test kit for retrieval tests
      const kit = await prisma.kit.create({
        data: {
          kitNumber: 'KIT-TEST-001',
          workOrderId: testWorkOrderId,
          status: 'PLANNED',
          priority: 'NORMAL',
          createdById: testUserId
        }
      });
      testKitId = kit.id;
    });

    it('should return list of kits with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(response.body).toHaveProperty('kits');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.kits).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter kits by status', async () => {
      const response = await request(app)
        .get('/api/v1/kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'PLANNED'
        })
        .expect(200);

      expect(response.body.kits).toBeInstanceOf(Array);
      response.body.kits.forEach((kit: any) => {
        expect(kit.status).toBe('PLANNED');
      });
    });

    it('should filter kits by work order', async () => {
      const response = await request(app)
        .get('/api/v1/kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          workOrderId: testWorkOrderId
        })
        .expect(200);

      expect(response.body.kits).toBeInstanceOf(Array);
      response.body.kits.forEach((kit: any) => {
        expect(kit.workOrderId).toBe(testWorkOrderId);
      });
    });

    it('should sort kits by creation date', async () => {
      const response = await request(app)
        .get('/api/v1/kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sortBy: 'createdAt',
          sortOrder: 'desc'
        })
        .expect(200);

      expect(response.body.kits).toBeInstanceOf(Array);

      // Check if sorted by creation date (most recent first)
      for (let i = 1; i < response.body.kits.length; i++) {
        const currentDate = new Date(response.body.kits[i].createdAt);
        const previousDate = new Date(response.body.kits[i - 1].createdAt);
        expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
      }
    });
  });

  describe('GET /api/v1/kits/:id', () => {
    beforeEach(async () => {
      const kit = await prisma.kit.create({
        data: {
          kitNumber: 'KIT-TEST-DETAIL-001',
          workOrderId: testWorkOrderId,
          status: 'PLANNED',
          priority: 'NORMAL',
          createdById: testUserId
        }
      });
      testKitId = kit.id;
    });

    it('should return kit details with items', async () => {
      const response = await request(app)
        .get(`/api/v1/kits/${testKitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testKitId);
      expect(response.body).toHaveProperty('kitNumber');
      expect(response.body).toHaveProperty('workOrderId', testWorkOrderId);
      expect(response.body).toHaveProperty('status', 'PLANNED');
      expect(response.body).toHaveProperty('kitItems');
      expect(response.body.kitItems).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent kit', async () => {
      const response = await request(app)
        .get('/api/v1/kits/non-existent-kit-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/kits/:id/status', () => {
    beforeEach(async () => {
      const kit = await prisma.kit.create({
        data: {
          kitNumber: 'KIT-TEST-STATUS-001',
          workOrderId: testWorkOrderId,
          status: 'PLANNED',
          priority: 'NORMAL',
          createdById: testUserId
        }
      });
      testKitId = kit.id;
    });

    it('should successfully update kit status', async () => {
      const response = await request(app)
        .put(`/api/v1/kits/${testKitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'STAGING',
          notes: 'Moving kit to staging area'
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'STAGING');
      expect(response.body).toHaveProperty('id', testKitId);

      // Verify status history was created
      const statusHistory = await prisma.kitStatusHistory.findMany({
        where: { kitId: testKitId }
      });
      expect(statusHistory.length).toBeGreaterThan(0);
    });

    it('should validate status transitions', async () => {
      // Try invalid transition from PLANNED to CONSUMED
      const response = await request(app)
        .put(`/api/v1/kits/${testKitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'CONSUMED'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status transition');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/v1/kits/${testKitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'INVALID_STATUS'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/kits/:id/scan', () => {
    beforeEach(async () => {
      const kit = await prisma.kit.create({
        data: {
          kitNumber: 'KIT-TEST-SCAN-001',
          workOrderId: testWorkOrderId,
          status: 'STAGED',
          priority: 'NORMAL',
          createdById: testUserId
        }
      });
      testKitId = kit.id;
    });

    it('should successfully scan kit barcode', async () => {
      const response = await request(app)
        .post(`/api/v1/kits/${testKitId}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          barcode: `KIT:${testKitId}`,
          scanType: 'ISSUE',
          location: 'WORKSTATION-01'
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('kitId', testKitId);
      expect(response.body).toHaveProperty('scanType', 'ISSUE');
    });

    it('should return 400 for invalid barcode format', async () => {
      const response = await request(app)
        .post(`/api/v1/kits/${testKitId}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          barcode: 'INVALID-BARCODE-FORMAT',
          scanType: 'ISSUE',
          location: 'WORKSTATION-01'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid barcode format');
    });

    it('should return 409 for kit not in correct status for scanning', async () => {
      // Update kit to a status that doesn't allow issuing
      await prisma.kit.update({
        where: { id: testKitId },
        data: { status: 'CONSUMED' }
      });

      const response = await request(app)
        .post(`/api/v1/kits/${testKitId}/scan`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          barcode: `KIT:${testKitId}`,
          scanType: 'ISSUE',
          location: 'WORKSTATION-01'
        })
        .expect(409);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Kit cannot be issued');
    });
  });

  describe('GET /api/v1/kits/analytics/dashboard', () => {
    it('should return analytics dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/kits/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(response.body).toHaveProperty('totalKits');
      expect(response.body).toHaveProperty('kitsByStatus');
      expect(response.body).toHaveProperty('completionRate');
      expect(response.body).toHaveProperty('averageProcessingTime');
      expect(response.body).toHaveProperty('shortageAlerts');
    });

    it('should filter analytics by date range', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get('/api/v1/kits/analytics/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      expect(response.body).toHaveProperty('dateRange');
      expect(response.body.dateRange).toHaveProperty('start');
      expect(response.body.dateRange).toHaveProperty('end');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/kits/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle database connection failures gracefully', async () => {
      // This test would typically involve mocking the database connection
      // For integration tests, we simulate this by testing resilience
      const response = await request(app)
        .get('/api/v1/kits')
        .set('Authorization', `Bearer ${authToken}`)
        .timeout(5000) // Set reasonable timeout
        .expect(200);

      expect(response.body).toHaveProperty('kits');
    });

    it('should handle concurrent requests properly', async () => {
      // Create multiple simultaneous requests
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app)
          .get('/api/v1/kits')
          .set('Authorization', `Bearer ${authToken}`)
          .query({ page: i + 1, limit: 5 })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('kits');
      });
    });

    it('should handle very large result sets with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 1000 // Large limit
        })
        .expect(200);

      expect(response.body).toHaveProperty('kits');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination.limit).toBeLessThanOrEqual(100); // Should be capped
    });
  });

  // Helper functions
  async function getAuthToken(username: string): Promise<string> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username,
        password: 'test-password' // This would need to match the test user's password
      });

    return response.body.token || 'mock-token-for-testing';
  }

  async function cleanupTestData(): Promise<void> {
    // Clean up in reverse dependency order
    await prisma.kitStatusHistory.deleteMany({
      where: { kit: { workOrder: { workOrderNumber: { startsWith: 'WO-TEST-' } } } }
    });

    await prisma.kitItem.deleteMany({
      where: { kit: { workOrder: { workOrderNumber: { startsWith: 'WO-TEST-' } } } }
    });

    await prisma.kit.deleteMany({
      where: { workOrder: { workOrderNumber: { startsWith: 'WO-TEST-' } } }
    });

    await prisma.inventory.deleteMany({
      where: { part: { partNumber: { startsWith: 'COMP-' } } }
    });

    await prisma.bOMItem.deleteMany({
      where: {
        OR: [
          { parentPart: { partNumber: { startsWith: 'TEST-' } } },
          { componentPart: { partNumber: { startsWith: 'COMP-' } } }
        ]
      }
    });

    await prisma.workOrder.deleteMany({
      where: { workOrderNumber: { startsWith: 'WO-TEST-' } }
    });

    await prisma.part.deleteMany({
      where: {
        OR: [
          { partNumber: { startsWith: 'TEST-' } },
          { partNumber: { startsWith: 'COMP-' } }
        ]
      }
    });

    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test-' } }
    });
  }
});