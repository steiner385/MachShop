import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { BuildRecordStatus, FinalDisposition, OperationStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

// Test data setup
const testUser = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'OPERATOR',
  password: 'hashedpassword',
};

const testInspector = {
  id: 'test-inspector-1',
  name: 'Test Inspector',
  email: 'inspector@example.com',
  role: 'INSPECTOR',
  password: 'hashedpassword',
};

const testWorkOrder = {
  id: 'test-wo-1',
  orderNumber: 'WO-TEST-001',
  engineSerial: 'TEST-ENG-001',
  engineModel: 'TEST-V12',
  customer: 'Test Customer',
  partId: 'test-part-1',
  status: 'IN_PROGRESS',
};

const testPart = {
  id: 'test-part-1',
  partNumber: 'P-TEST-001',
  description: 'Test Part Assembly',
  type: 'ASSEMBLY',
};

const testWorkCenter = {
  id: 'test-wc-1',
  name: 'Test Work Center',
  description: 'Test work center for integration tests',
  location: 'Test Floor',
};

const testOperation = {
  id: 'test-op-1',
  operationNumber: '010',
  description: 'Test Assembly Operation',
  workCenterId: 'test-wc-1',
  standardTimeMinutes: 60,
  sequence: 1,
};

describe('Build Records API Integration Tests', () => {
  let authToken: string;
  let inspectorToken: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();

    // Create test users
    await prisma.user.createMany({
      data: [testUser, testInspector],
    });

    // Create auth tokens
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    inspectorToken = jwt.sign(
      { userId: testInspector.id, role: testInspector.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test data
    await prisma.part.create({ data: testPart });
    await prisma.workCenter.create({ data: testWorkCenter });
    await prisma.operation.create({ data: testOperation });
    await prisma.workOrder.create({
      data: {
        ...testWorkOrder,
        operations: {
          create: [{
            operationId: testOperation.id,
            sequence: 1,
          }],
        },
      },
    });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up build records before each test
    await prisma.buildRecord.deleteMany({
      where: { workOrderId: testWorkOrder.id },
    });
  });

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await prisma.buildRecordStatusHistory.deleteMany();
    await prisma.buildRecordSignature.deleteMany();
    await prisma.buildRecordPhoto.deleteMany();
    await prisma.buildRecordDocument.deleteMany();
    await prisma.buildDeviation.deleteMany();
    await prisma.buildRecordOperation.deleteMany();
    await prisma.buildRecord.deleteMany();
    await prisma.workOrderOperation.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.operation.deleteMany();
    await prisma.workCenter.deleteMany();
    await prisma.part.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, testInspector.id],
        },
      },
    });
  }

  describe('POST /api/build-records', () => {
    it('should create a new build record', async () => {
      const createData = {
        workOrderId: testWorkOrder.id,
        operatorId: testUser.id,
      };

      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        buildRecordNumber: expect.stringMatching(/^BR-\d{4}-\d{3}$/),
        workOrderId: testWorkOrder.id,
        status: BuildRecordStatus.PENDING,
        finalDisposition: FinalDisposition.PENDING,
        operatorId: testUser.id,
        startedAt: expect.any(String),
        operations: expect.arrayContaining([
          expect.objectContaining({
            operationId: testOperation.id,
            status: OperationStatus.PENDING,
            standardTimeMinutes: 60,
          }),
        ]),
      });
    });

    it('should return 400 for invalid work order', async () => {
      const createData = {
        workOrderId: 'nonexistent',
        operatorId: testUser.id,
      };

      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createData)
        .expect(400);

      expect(response.body.error).toContain('Work order not found');
    });

    it('should return 401 without authentication', async () => {
      const createData = {
        workOrderId: testWorkOrder.id,
        operatorId: testUser.id,
      };

      await request(app)
        .post('/api/build-records')
        .send(createData)
        .expect(401);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });

  describe('GET /api/build-records', () => {
    let buildRecord: any;

    beforeEach(async () => {
      // Create a test build record
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should list build records with pagination', async () => {
      const response = await request(app)
        .get('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: buildRecord.id,
            buildRecordNumber: buildRecord.buildRecordNumber,
          }),
        ]),
        pagination: {
          page: 1,
          limit: 10,
          total: expect.any(Number),
          totalPages: expect.any(Number),
        },
      });
    });

    it('should filter build records by status', async () => {
      const response = await request(app)
        .get('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: BuildRecordStatus.PENDING })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe(BuildRecordStatus.PENDING);
    });

    it('should search build records', async () => {
      const response = await request(app)
        .get('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'TEST-ENG-001' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].workOrder.engineSerial).toBe('TEST-ENG-001');
    });
  });

  describe('GET /api/build-records/:id', () => {
    let buildRecord: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should get build record by ID', async () => {
      const response = await request(app)
        .get(`/api/build-records/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: buildRecord.id,
        buildRecordNumber: buildRecord.buildRecordNumber,
        workOrder: expect.objectContaining({
          id: testWorkOrder.id,
          orderNumber: testWorkOrder.orderNumber,
        }),
        operations: expect.arrayContaining([
          expect.objectContaining({
            operation: expect.objectContaining({
              operationNumber: testOperation.operationNumber,
            }),
          }),
        ]),
      });
    });

    it('should return 404 for nonexistent build record', async () => {
      await request(app)
        .get('/api/build-records/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/build-records/:id/status', () => {
    let buildRecord: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should update build record status', async () => {
      const updateData = {
        status: BuildRecordStatus.IN_PROGRESS,
        reason: 'Starting work',
      };

      const response = await request(app)
        .put(`/api/build-records/${buildRecord.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.status).toBe(BuildRecordStatus.IN_PROGRESS);
    });

    it('should create status history entry', async () => {
      const updateData = {
        status: BuildRecordStatus.IN_PROGRESS,
        reason: 'Starting work',
      };

      await request(app)
        .put(`/api/build-records/${buildRecord.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      const response = await request(app)
        .get(`/api/build-records/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.statusHistory).toContainEqual(
        expect.objectContaining({
          status: BuildRecordStatus.IN_PROGRESS,
          reason: 'Starting work',
          changer: expect.objectContaining({
            id: testUser.id,
          }),
        })
      );
    });
  });

  describe('POST /api/build-records/:id/operations/:operationId/start', () => {
    let buildRecord: any;
    let operation: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
      operation = buildRecord.operations[0];
    });

    it('should start operation', async () => {
      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorId: testUser.id })
        .expect(200);

      expect(response.body).toMatchObject({
        id: operation.id,
        status: OperationStatus.IN_PROGRESS,
        operatorId: testUser.id,
        startedAt: expect.any(String),
      });
    });

    it('should prevent starting already started operation', async () => {
      // Start the operation first
      await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorId: testUser.id });

      // Try to start again
      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorId: testUser.id })
        .expect(400);

      expect(response.body.error).toContain('already been started');
    });
  });

  describe('POST /api/build-records/:id/operations/:operationId/complete', () => {
    let buildRecord: any;
    let operation: any;

    beforeEach(async () => {
      // Create build record
      let response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
      operation = buildRecord.operations[0];

      // Start the operation
      await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorId: testUser.id });
    });

    it('should complete operation', async () => {
      const completeData = {
        notes: 'Operation completed successfully',
        toolsUsed: ['Torque Wrench', 'Digital Caliper'],
        partsUsed: [
          {
            partNumber: 'P-TEST-002',
            quantity: 2,
            serialNumbers: ['SN001', 'SN002'],
          },
        ],
      };

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(completeData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: operation.id,
        status: OperationStatus.COMPLETED,
        completedAt: expect.any(String),
        actualTimeMinutes: expect.any(Number),
        notes: completeData.notes,
        toolsUsed: completeData.toolsUsed,
        partsUsed: completeData.partsUsed,
      });
    });

    it('should calculate actual time correctly', async () => {
      // Wait a moment to ensure some time passes
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Operation completed',
        });

      expect(response.body.actualTimeMinutes).toBeGreaterThan(0);
    });
  });

  describe('POST /api/build-records/:id/operations/:operationId/sign', () => {
    let buildRecord: any;
    let operation: any;

    beforeEach(async () => {
      // Create and complete operation
      let response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
      operation = buildRecord.operations[0];

      // Start operation
      await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/start`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorId: testUser.id });

      // Complete operation
      await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/complete`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Operation completed' });
    });

    it('should create operator signature', async () => {
      const signatureData = {
        signatureType: 'OPERATOR',
        comments: 'Operation completed successfully',
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        metadata: {
          certificationConfirmed: true,
          qualityChecked: true,
          acceptsResponsibility: true,
        },
      };

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/sign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(signatureData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        type: 'OPERATOR',
        signedAt: expect.any(String),
        signedBy: testUser.id,
        comments: signatureData.comments,
        isValid: true,
      });
    });

    it('should create inspector signature', async () => {
      const signatureData = {
        signatureType: 'INSPECTOR',
        comments: 'Inspection passed',
        signatureData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      };

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/sign`)
        .set('Authorization', `Bearer ${inspectorToken}`)
        .send(signatureData)
        .expect(201);

      expect(response.body.type).toBe('INSPECTOR');
      expect(response.body.signedBy).toBe(testInspector.id);
    });

    it('should prevent duplicate signatures', async () => {
      const signatureData = {
        signatureType: 'OPERATOR',
        comments: 'First signature',
        signatureData: 'data:image/png;base64,test',
      };

      // Create first signature
      await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/sign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(signatureData);

      // Try to create duplicate
      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/operations/${operation.id}/sign`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(signatureData)
        .expect(400);

      expect(response.body.error).toContain('already signed');
    });
  });

  describe('POST /api/build-records/:id/photos', () => {
    let buildRecord: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should upload photo', async () => {
      // Create a test image buffer
      const testImageBuffer = Buffer.from('test image data');

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/photos`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', testImageBuffer, 'test-photo.jpg')
        .field('caption', 'Test photo')
        .field('category', 'PROGRESS')
        .field('tags', JSON.stringify(['test', 'progress']))
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        filename: expect.stringMatching(/\.(jpg|jpeg|png)$/),
        originalName: 'test-photo.jpg',
        caption: 'Test photo',
        category: 'PROGRESS',
        tags: ['test', 'progress'],
        takenAt: expect.any(String),
        takenBy: testUser.id,
      });
    });

    it('should validate file type', async () => {
      const testBuffer = Buffer.from('not an image');

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/photos`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach('photo', testBuffer, 'test.txt')
        .field('caption', 'Test file')
        .expect(400);

      expect(response.body.error).toContain('Invalid file type');
    });
  });

  describe('POST /api/build-records/:id/deviations', () => {
    let buildRecord: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should create deviation', async () => {
      const deviationData = {
        type: 'PROCESS',
        category: 'QUALITY',
        severity: 'MEDIUM',
        title: 'Test deviation',
        description: 'This is a test deviation for integration testing',
        rootCause: 'Test root cause',
        correctiveAction: 'Test corrective action',
        preventiveAction: 'Test preventive action',
      };

      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/deviations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviationData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        buildRecordId: buildRecord.id,
        ...deviationData,
        status: 'REPORTED',
        detectedAt: expect.any(String),
        detectedBy: testUser.id,
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/api/build-records/${buildRecord.id}/deviations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('validation');
    });
  });

  describe('PUT /api/build-records/:id', () => {
    let buildRecord: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should update build record', async () => {
      const updateData = {
        finalDisposition: FinalDisposition.ACCEPT,
        inspectorId: testInspector.id,
        notes: 'Build record completed successfully',
      };

      const response = await request(app)
        .put(`/api/build-records/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: buildRecord.id,
        finalDisposition: FinalDisposition.ACCEPT,
        inspectorId: testInspector.id,
        notes: updateData.notes,
      });
    });
  });

  describe('DELETE /api/build-records/:id', () => {
    let buildRecord: any;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/build-records')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          workOrderId: testWorkOrder.id,
          operatorId: testUser.id,
        });

      buildRecord = response.body;
    });

    it('should delete build record', async () => {
      await request(app)
        .delete(`/api/build-records/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/build-records/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of completed build records', async () => {
      // Complete the build record first
      await request(app)
        .put(`/api/build-records/${buildRecord.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: BuildRecordStatus.COMPLETED });

      const response = await request(app)
        .delete(`/api/build-records/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Cannot delete completed');
    });
  });
});