/**
 * Integration Tests for Vendor Kitting API Endpoints
 *
 * End-to-end testing of vendor kit management API routes including vendor
 * validation, kit requests, status tracking, and quality inspections.
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

describe('Vendor Kitting API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testVendorId: string;
  let testWorkOrderId: string;
  let testPartId: string;
  let testVendorKitId: string;
  let componentPart1Id: string;
  let componentPart2Id: string;

  beforeAll(async () => {
    await prisma.$connect();
    await cleanupTestData();

    // Create test user with vendor management permissions
    const testUser = await prisma.user.create({
      data: {
        username: 'test-vendor-kit-user',
        email: 'test-vendor-kit@example.com',
        firstName: 'Test',
        lastName: 'VendorKit User',
        passwordHash: '$2b$10$test.hash.for.testing',
        roles: ['Production Planner', 'Manufacturing Engineer', 'Material Coordinator'],
        permissions: ['vendor-kits.read', 'vendor-kits.write', 'quality.inspect'],
        isActive: true
      }
    });
    testUserId = testUser.id;

    // Create test vendor
    const testVendor = await prisma.vendor.create({
      data: {
        code: 'VEND001',
        name: 'Test Vendor Corporation',
        contactEmail: 'vendor@testvendor.com',
        contactPhone: '+1-555-0123',
        address: '123 Vendor Street, Vendor City, VC 12345',
        qualityRating: 95.5,
        onTimeDeliveryRate: 98.2,
        certifications: ['AS9100', 'ISO9001'],
        approvedParts: ['COMP-001-VK', 'COMP-002-VK'],
        isActive: true,
        preferredVendor: true
      }
    });
    testVendorId = testVendor.id;

    // Create test parts
    const testPart = await prisma.part.create({
      data: {
        partNumber: 'TEST-ASSEMBLY-VK-001',
        partName: 'Test Assembly for Vendor Kitting',
        description: 'Integration test assembly part for vendor kits',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA',
        isActive: true,
        makeOrBuy: 'MAKE'
      }
    });
    testPartId = testPart.id;

    const componentPart1 = await prisma.part.create({
      data: {
        partNumber: 'COMP-001-VK',
        partName: 'Vendor Kit Component 1',
        description: 'First component for vendor kit testing',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        isActive: true,
        makeOrBuy: 'BUY'
      }
    });
    componentPart1Id = componentPart1.id;

    const componentPart2 = await prisma.part.create({
      data: {
        partNumber: 'COMP-002-VK',
        partName: 'Vendor Kit Component 2',
        description: 'Second component for vendor kit testing',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        isActive: true,
        makeOrBuy: 'BUY'
      }
    });
    componentPart2Id = componentPart2.id;

    // Create test work order
    const testWorkOrder = await prisma.workOrder.create({
      data: {
        workOrderNumber: 'WO-TEST-VK-001',
        partId: testPartId,
        quantity: 3,
        status: 'OPEN',
        priority: 'HIGH',
        createdById: testUserId,
        plannedStartDate: new Date(),
        plannedCompletionDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
      }
    });
    testWorkOrderId = testWorkOrder.id;

    // Get authentication token
    authToken = await getAuthToken(testUser.username);
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Reset test state
  });

  afterEach(async () => {
    // Clean up vendor kits created during tests
    if (testVendorKitId) {
      await prisma.vendorKitHistory.deleteMany({ where: { vendorKitId: testVendorKitId } });
      await prisma.vendorKitInspection.deleteMany({ where: { vendorKitId: testVendorKitId } });
      await prisma.vendorKitItem.deleteMany({ where: { vendorKitId: testVendorKitId } });
      await prisma.vendorKit.deleteMany({ where: { id: testVendorKitId } });
      testVendorKitId = '';
    }
  });

  describe('POST /api/v1/vendor-kits', () => {
    const validVendorKitRequest = {
      vendorId: '', // Will be set in beforeEach
      kitSpecification: {
        kitName: 'Integration Test Vendor Kit',
        assemblyStage: 'ASSEMBLY',
        priority: 'HIGH',
        requiredDeliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        specialInstructions: 'Handle with extreme care'
      },
      kitItems: [
        {
          partId: '', // Will be set in beforeEach
          requiredQuantity: 15,
          specifications: { material: 'Titanium', finish: 'Anodized' },
          qualityRequirements: ['AS9100', 'Material Certification']
        },
        {
          partId: '', // Will be set in beforeEach
          requiredQuantity: 8,
          specifications: { coating: 'Chromate', hardness: 'HRC 45-50' },
          qualityRequirements: ['Dimensional Inspection', 'Surface Finish']
        }
      ],
      deliveryLocation: {
        locationId: 'STAGING-AREA-VK-01',
        contactPerson: 'John Vendor Kit Coordinator',
        specialHandling: ['Fragile', 'Climate Controlled']
      },
      qualityRequirements: {
        inspectionLevel: 'ENHANCED',
        certificationRequired: true,
        testRequirements: ['Dimensional', 'Material', 'Surface Finish'],
        complianceStandards: ['AS9100', 'ISO9001', 'NADCAP']
      }
    };

    beforeEach(() => {
      validVendorKitRequest.vendorId = testVendorId;
      validVendorKitRequest.kitItems[0].partId = componentPart1Id;
      validVendorKitRequest.kitItems[1].partId = componentPart2Id;
    });

    it('should successfully create a vendor kit request', async () => {
      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validVendorKitRequest)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('vendorKitNumber');
      expect(response.body).toHaveProperty('vendorId', testVendorId);
      expect(response.body).toHaveProperty('status', 'REQUESTED');
      expect(response.body).toHaveProperty('kitName', 'Integration Test Vendor Kit');
      expect(response.body).toHaveProperty('priority', 'HIGH');

      testVendorKitId = response.body.id;

      // Verify vendor kit items were created
      const vendorKitItems = await prisma.vendorKitItem.findMany({
        where: { vendorKitId: testVendorKitId }
      });
      expect(vendorKitItems).toHaveLength(2);

      // Verify history record was created
      const history = await prisma.vendorKitHistory.findMany({
        where: { vendorKitId: testVendorKitId }
      });
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('REQUESTED');
    });

    it('should return 400 for invalid vendor ID', async () => {
      const invalidRequest = {
        ...validVendorKitRequest,
        vendorId: 'invalid-vendor-id'
      };

      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Vendor');
    });

    it('should return 400 for inactive vendor', async () => {
      // Create inactive vendor
      const inactiveVendor = await prisma.vendor.create({
        data: {
          code: 'INACTIVE001',
          name: 'Inactive Vendor Corp',
          isActive: false,
          preferredVendor: false,
          qualityRating: 0,
          onTimeDeliveryRate: 0,
          certifications: [],
          approvedParts: []
        }
      });

      const invalidRequest = {
        ...validVendorKitRequest,
        vendorId: inactiveVendor.id
      };

      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not active');

      // Cleanup
      await prisma.vendor.delete({ where: { id: inactiveVendor.id } });
    });

    it('should return 400 for missing parts', async () => {
      const invalidRequest = {
        ...validVendorKitRequest,
        kitItems: [
          {
            partId: 'non-existent-part-id',
            requiredQuantity: 10,
            specifications: {},
            qualityRequirements: []
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Parts not found');
    });

    it('should return 400 for invalid quantities', async () => {
      const invalidRequest = {
        ...validVendorKitRequest,
        kitItems: [
          {
            partId: componentPart1Id,
            requiredQuantity: -5, // Invalid negative quantity
            specifications: {},
            qualityRequirements: []
          }
        ]
      };

      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid quantity');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/vendor-kits')
        .send(validVendorKitRequest)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        vendorId: testVendorId,
        // Missing kitSpecification
        kitItems: [],
        deliveryLocation: {},
        qualityRequirements: {}
      };

      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/vendor-kits', () => {
    beforeEach(async () => {
      // Create test vendor kit
      const vendorKit = await prisma.vendorKit.create({
        data: {
          vendorKitNumber: 'VK-TEST-001',
          vendorId: testVendorId,
          requestId: 'REQ-VK-001',
          partNumbers: ['COMP-001-VK', 'COMP-002-VK'],
          quantityOrdered: 10,
          status: 'REQUESTED',
          priority: 'NORMAL',
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      testVendorKitId = vendorKit.id;
    });

    it('should return list of vendor kits with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          limit: 10
        })
        .expect(200);

      expect(response.body).toHaveProperty('vendorKits');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.vendorKits).toBeInstanceOf(Array);
      expect(response.body.pagination).toHaveProperty('page', 1);
      expect(response.body.pagination).toHaveProperty('limit', 10);
    });

    it('should filter vendor kits by status', async () => {
      const response = await request(app)
        .get('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'REQUESTED'
        })
        .expect(200);

      expect(response.body.vendorKits).toBeInstanceOf(Array);
      response.body.vendorKits.forEach((vendorKit: any) => {
        expect(vendorKit.status).toBe('REQUESTED');
      });
    });

    it('should filter vendor kits by vendor', async () => {
      const response = await request(app)
        .get('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          vendorId: testVendorId
        })
        .expect(200);

      expect(response.body.vendorKits).toBeInstanceOf(Array);
      response.body.vendorKits.forEach((vendorKit: any) => {
        expect(vendorKit.vendorId).toBe(testVendorId);
      });
    });

    it('should sort vendor kits by priority and date', async () => {
      const response = await request(app)
        .get('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          sortBy: 'requiredDate',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(response.body.vendorKits).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/v1/vendor-kits/:id', () => {
    beforeEach(async () => {
      const vendorKit = await prisma.vendorKit.create({
        data: {
          vendorKitNumber: 'VK-TEST-DETAIL-001',
          vendorId: testVendorId,
          requestId: 'REQ-VK-DETAIL-001',
          partNumbers: ['COMP-001-VK'],
          quantityOrdered: 5,
          status: 'ACKNOWLEDGED',
          priority: 'HIGH',
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      testVendorKitId = vendorKit.id;
    });

    it('should return vendor kit details with items and history', async () => {
      const response = await request(app)
        .get(`/api/v1/vendor-kits/${testVendorKitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testVendorKitId);
      expect(response.body).toHaveProperty('vendorKitNumber');
      expect(response.body).toHaveProperty('vendorId', testVendorId);
      expect(response.body).toHaveProperty('status', 'ACKNOWLEDGED');
      expect(response.body).toHaveProperty('vendor');
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('history');
    });

    it('should return 404 for non-existent vendor kit', async () => {
      const response = await request(app)
        .get('/api/v1/vendor-kits/non-existent-vendor-kit-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/v1/vendor-kits/:id/status', () => {
    beforeEach(async () => {
      const vendorKit = await prisma.vendorKit.create({
        data: {
          vendorKitNumber: 'VK-TEST-STATUS-001',
          vendorId: testVendorId,
          requestId: 'REQ-VK-STATUS-001',
          partNumbers: ['COMP-001-VK'],
          quantityOrdered: 8,
          status: 'ACKNOWLEDGED',
          priority: 'NORMAL',
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      testVendorKitId = vendorKit.id;
    });

    it('should successfully update vendor kit status', async () => {
      const response = await request(app)
        .put(`/api/v1/vendor-kits/${testVendorKitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'IN_PRODUCTION',
          notes: 'Vendor has started production',
          metadata: { estimatedCompletionDate: '2024-02-15' }
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'IN_PRODUCTION');
      expect(response.body).toHaveProperty('id', testVendorKitId);

      // Verify history was created
      const history = await prisma.vendorKitHistory.findMany({
        where: { vendorKitId: testVendorKitId, action: 'STATUS_UPDATED' }
      });
      expect(history.length).toBeGreaterThan(0);
    });

    it('should validate status transitions', async () => {
      // Try invalid transition from ACKNOWLEDGED to RECEIVED (skipping IN_PRODUCTION)
      const response = await request(app)
        .put(`/api/v1/vendor-kits/${testVendorKitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'RECEIVED'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status transition');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .put(`/api/v1/vendor-kits/${testVendorKitId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'INVALID_STATUS'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/vendor-kits/:id/receive', () => {
    beforeEach(async () => {
      const vendorKit = await prisma.vendorKit.create({
        data: {
          vendorKitNumber: 'VK-TEST-RECEIVE-001',
          vendorId: testVendorId,
          requestId: 'REQ-VK-RECEIVE-001',
          partNumbers: ['COMP-001-VK'],
          quantityOrdered: 12,
          status: 'SHIPPED',
          priority: 'HIGH',
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      testVendorKitId = vendorKit.id;

      // Create vendor kit item
      await prisma.vendorKitItem.create({
        data: {
          vendorKitId: testVendorKitId,
          partId: componentPart1Id,
          partNumber: 'COMP-001-VK',
          quantityOrdered: 12,
          unitOfMeasure: 'EA',
          status: 'SHIPPED'
        }
      });
    });

    it('should successfully receive vendor kit', async () => {
      const vendorKitItems = await prisma.vendorKitItem.findMany({
        where: { vendorKitId: testVendorKitId }
      });

      const receiptData = {
        actualReceiveDate: new Date().toISOString(),
        trackingNumber: 'TRK-VK-123456789',
        deliveryNotes: 'Package delivered in excellent condition',
        items: [
          {
            vendorKitItemId: vendorKitItems[0].id,
            quantityReceived: 12,
            lotNumber: 'LOT-VK-001',
            serialNumbers: ['SN-VK-001', 'SN-VK-002'],
            notes: 'All items received and inspected'
          }
        ]
      };

      const response = await request(app)
        .post(`/api/v1/vendor-kits/${testVendorKitId}/receive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(receiptData)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'RECEIVED');
      expect(response.body).toHaveProperty('actualReceiveDate');
      expect(response.body).toHaveProperty('trackingNumber', 'TRK-VK-123456789');

      // Verify vendor kit items were updated
      const updatedItems = await prisma.vendorKitItem.findMany({
        where: { vendorKitId: testVendorKitId }
      });
      expect(updatedItems[0].quantityReceived).toBe(12);
      expect(updatedItems[0].lotNumber).toBe('LOT-VK-001');
    });

    it('should return 400 for vendor kit not in SHIPPED status', async () => {
      // Update vendor kit to wrong status
      await prisma.vendorKit.update({
        where: { id: testVendorKitId },
        data: { status: 'REQUESTED' }
      });

      const receiptData = {
        actualReceiveDate: new Date().toISOString(),
        items: []
      };

      const response = await request(app)
        .post(`/api/v1/vendor-kits/${testVendorKitId}/receive`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(receiptData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid status transition');
    });
  });

  describe('POST /api/v1/vendor-kits/:id/inspect', () => {
    beforeEach(async () => {
      const vendorKit = await prisma.vendorKit.create({
        data: {
          vendorKitNumber: 'VK-TEST-INSPECT-001',
          vendorId: testVendorId,
          requestId: 'REQ-VK-INSPECT-001',
          partNumbers: ['COMP-001-VK'],
          quantityOrdered: 15,
          quantityReceived: 15,
          status: 'RECEIVED',
          priority: 'HIGH',
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          actualReceiveDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      testVendorKitId = vendorKit.id;
    });

    it('should successfully perform vendor kit inspection with PASS result', async () => {
      const inspectionData = {
        inspectionType: 'RECEIVING',
        result: 'PASS',
        conformingQuantity: 15,
        nonConformingQuantity: 0,
        notes: 'All items passed dimensional and visual inspection',
        correctionRequired: false,
        certificatesReceived: true
      };

      const response = await request(app)
        .post(`/api/v1/vendor-kits/${testVendorKitId}/inspect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inspectionData)
        .expect(201);

      expect(response.body).toHaveProperty('inspectionType', 'RECEIVING');
      expect(response.body).toHaveProperty('result', 'PASS');
      expect(response.body).toHaveProperty('conformingQuantity', 15);
      expect(response.body).toHaveProperty('vendorKitId', testVendorKitId);

      // Verify vendor kit status was updated
      const updatedVendorKit = await prisma.vendorKit.findUnique({
        where: { id: testVendorKitId }
      });
      expect(updatedVendorKit?.status).toBe('ACCEPTED');
    });

    it('should handle inspection with FAIL result', async () => {
      const inspectionData = {
        inspectionType: 'DIMENSIONAL',
        result: 'FAIL',
        conformingQuantity: 12,
        nonConformingQuantity: 3,
        notes: 'Found 3 items with dimensional non-conformances',
        correctionRequired: true,
        correctionNotes: 'Require vendor replacement for 3 non-conforming items',
        certificatesReceived: false
      };

      const response = await request(app)
        .post(`/api/v1/vendor-kits/${testVendorKitId}/inspect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inspectionData)
        .expect(201);

      expect(response.body).toHaveProperty('result', 'FAIL');
      expect(response.body).toHaveProperty('correctionRequired', true);

      // Verify vendor kit status was updated to REJECTED
      const updatedVendorKit = await prisma.vendorKit.findUnique({
        where: { id: testVendorKitId }
      });
      expect(updatedVendorKit?.status).toBe('REJECTED');
    });

    it('should return 400 for vendor kit not ready for inspection', async () => {
      // Update vendor kit to wrong status
      await prisma.vendorKit.update({
        where: { id: testVendorKitId },
        data: { status: 'REQUESTED' }
      });

      const inspectionData = {
        inspectionType: 'RECEIVING',
        result: 'PASS',
        conformingQuantity: 15,
        nonConformingQuantity: 0
      };

      const response = await request(app)
        .post(`/api/v1/vendor-kits/${testVendorKitId}/inspect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inspectionData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('inspection');
    });

    it('should validate inspection quantities', async () => {
      const inspectionData = {
        inspectionType: 'RECEIVING',
        result: 'PASS',
        conformingQuantity: -5, // Invalid negative quantity
        nonConformingQuantity: 0
      };

      const response = await request(app)
        .post(`/api/v1/vendor-kits/${testVendorKitId}/inspect`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(inspectionData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid quantity');
    });
  });

  describe('GET /api/v1/vendor-kits/:id/history', () => {
    beforeEach(async () => {
      const vendorKit = await prisma.vendorKit.create({
        data: {
          vendorKitNumber: 'VK-TEST-HISTORY-001',
          vendorId: testVendorId,
          requestId: 'REQ-VK-HISTORY-001',
          partNumbers: ['COMP-001-VK'],
          quantityOrdered: 10,
          status: 'SHIPPED',
          priority: 'NORMAL',
          requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      testVendorKitId = vendorKit.id;

      // Create history records
      await prisma.vendorKitHistory.createMany({
        data: [
          {
            vendorKitId: testVendorKitId,
            userId: testUserId,
            action: 'CREATED',
            notes: 'Vendor kit request created',
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
          },
          {
            vendorKitId: testVendorKitId,
            userId: testUserId,
            action: 'ACKNOWLEDGED',
            notes: 'Vendor acknowledged request',
            timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          },
          {
            vendorKitId: testVendorKitId,
            userId: testUserId,
            action: 'SHIPPED',
            notes: 'Vendor shipped kit',
            timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
          }
        ]
      });
    });

    it('should return vendor kit history in chronological order', async () => {
      const response = await request(app)
        .get(`/api/v1/vendor-kits/${testVendorKitId}/history`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);

      // Verify chronological order (most recent first)
      for (let i = 1; i < response.body.length; i++) {
        const currentDate = new Date(response.body[i].timestamp);
        const previousDate = new Date(response.body[i - 1].timestamp);
        expect(currentDate.getTime()).toBeLessThanOrEqual(previousDate.getTime());
      }

      // Verify expected actions
      const actions = response.body.map((h: any) => h.action);
      expect(actions).toContain('CREATED');
      expect(actions).toContain('ACKNOWLEDGED');
      expect(actions).toContain('SHIPPED');
    });
  });

  describe('GET /api/v1/vendors/:vendorId/performance', () => {
    beforeEach(async () => {
      // Create performance metrics for the vendor
      const currentDate = new Date();
      await prisma.vendorPerformanceMetric.createMany({
        data: [
          {
            vendorId: testVendorId,
            metricType: 'ON_TIME_DELIVERY',
            metricPeriod: currentDate,
            periodType: 'MONTHLY',
            value: 95.5,
            target: 90.0,
            unit: '%'
          },
          {
            vendorId: testVendorId,
            metricType: 'QUALITY_RATING',
            metricPeriod: currentDate,
            periodType: 'MONTHLY',
            value: 98.2,
            target: 95.0,
            unit: '%'
          },
          {
            vendorId: testVendorId,
            metricType: 'COST_PERFORMANCE',
            metricPeriod: currentDate,
            periodType: 'MONTHLY',
            value: 102.1,
            target: 100.0,
            unit: '%'
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.vendorPerformanceMetric.deleteMany({
        where: { vendorId: testVendorId }
      });
    });

    it('should return vendor performance metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/vendors/${testVendorId}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(3);

      const metricTypes = response.body.map((m: any) => m.metricType);
      expect(metricTypes).toContain('ON_TIME_DELIVERY');
      expect(metricTypes).toContain('QUALITY_RATING');
      expect(metricTypes).toContain('COST_PERFORMANCE');

      // Verify metric structure
      response.body.forEach((metric: any) => {
        expect(metric).toHaveProperty('metricType');
        expect(metric).toHaveProperty('value');
        expect(metric).toHaveProperty('target');
        expect(metric).toHaveProperty('unit');
        expect(metric).toHaveProperty('metricPeriod');
      });
    });

    it('should filter metrics by type', async () => {
      const response = await request(app)
        .get(`/api/v1/vendors/${testVendorId}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          metricType: 'ON_TIME_DELIVERY'
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].metricType).toBe('ON_TIME_DELIVERY');
    });

    it('should filter metrics by date range', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const response = await request(app)
        .get(`/api/v1/vendors/${testVendorId}/performance`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle large file uploads for certifications', async () => {
      // Simulate large certification file upload
      const response = await request(app)
        .post('/api/v1/vendor-kits')
        .set('Authorization', `Bearer ${authToken}`)
        .field('vendorId', testVendorId)
        .field('certificationFiles', 'very-large-file-content'.repeat(1000))
        .expect(413); // Payload too large

      expect(response.body).toHaveProperty('error');
    });

    it('should handle concurrent vendor kit requests', async () => {
      const validRequest = {
        vendorId: testVendorId,
        kitSpecification: {
          kitName: 'Concurrent Test Kit',
          priority: 'NORMAL',
          requiredDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        kitItems: [
          {
            partId: componentPart1Id,
            requiredQuantity: 5,
            specifications: {},
            qualityRequirements: []
          }
        ],
        deliveryLocation: {
          locationId: 'STAGING-01',
          contactPerson: 'Test Coordinator'
        },
        qualityRequirements: {
          inspectionLevel: 'STANDARD',
          certificationRequired: false,
          complianceStandards: []
        }
      };

      // Create multiple simultaneous requests
      const promises = Array.from({ length: 3 }, () =>
        request(app)
          .post('/api/v1/vendor-kits')
          .set('Authorization', `Bearer ${authToken}`)
          .send(validRequest)
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('vendorKitNumber');
      });

      // Cleanup created vendor kits
      const vendorKitNumbers = responses.map(r => r.body.vendorKitNumber);
      await prisma.vendorKit.deleteMany({
        where: { vendorKitNumber: { in: vendorKitNumbers } }
      });
    });
  });

  // Helper functions
  async function getAuthToken(username: string): Promise<string> {
    // In a real test, this would authenticate against the actual auth system
    // For integration tests, we might use a test token or mock authentication
    return 'mock-vendor-kit-token-for-testing';
  }

  async function cleanupTestData(): Promise<void> {
    // Clean up in reverse dependency order
    await prisma.vendorPerformanceMetric.deleteMany({
      where: { vendor: { code: { startsWith: 'VEND' } } }
    });

    await prisma.vendorKitHistory.deleteMany({
      where: { vendorKit: { vendorKitNumber: { startsWith: 'VK-TEST-' } } }
    });

    await prisma.vendorKitInspection.deleteMany({
      where: { vendorKit: { vendorKitNumber: { startsWith: 'VK-TEST-' } } }
    });

    await prisma.vendorKitItem.deleteMany({
      where: { vendorKit: { vendorKitNumber: { startsWith: 'VK-TEST-' } } }
    });

    await prisma.vendorKit.deleteMany({
      where: { vendorKitNumber: { startsWith: 'VK-TEST-' } }
    });

    await prisma.workOrder.deleteMany({
      where: { workOrderNumber: { startsWith: 'WO-TEST-VK-' } }
    });

    await prisma.part.deleteMany({
      where: {
        OR: [
          { partNumber: { startsWith: 'TEST-ASSEMBLY-VK-' } },
          { partNumber: { startsWith: 'COMP-' } }
        ]
      }
    });

    await prisma.vendor.deleteMany({
      where: { code: { startsWith: 'VEND' } }
    });

    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test-vendor-kit-' } }
    });
  }
});