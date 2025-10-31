import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { BuildRecordStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';

// Test data setup
const testUser = {
  id: 'test-user-bb-1',
  name: 'Test User BuildBooks',
  email: 'test-bb@example.com',
  role: 'OPERATOR',
  password: 'hashedpassword',
};

const testManager = {
  id: 'test-manager-bb-1',
  name: 'Test Manager',
  email: 'manager-bb@example.com',
  role: 'PRODUCTION_MANAGER',
  password: 'hashedpassword',
};

const testWorkOrder = {
  id: 'test-wo-bb-1',
  orderNumber: 'WO-BB-TEST-001',
  engineSerial: 'TEST-BB-ENG-001',
  engineModel: 'TEST-BB-V12',
  customer: 'Test BB Customer',
  partId: 'test-part-bb-1',
  status: 'IN_PROGRESS',
};

const testPart = {
  id: 'test-part-bb-1',
  partNumber: 'P-BB-TEST-001',
  description: 'Test BuildBook Part Assembly',
  type: 'ASSEMBLY',
};

const testTemplate = {
  name: 'Test AS9100 Template',
  description: 'Test template for AS9100 compliance',
  isDefault: false,
  customerId: null,
  settings: {
    header: {
      enabled: true,
      logoPosition: 'left',
      logoSize: 50,
      title: 'Electronic Build Book',
      subtitle: 'AS9100 Compliant Assembly Record',
      showPageNumbers: true,
      showDate: true,
    },
    footer: {
      enabled: true,
      text: 'Confidential - Test Company',
      showPageNumbers: true,
      showGeneratedBy: true,
      companyInfo: 'Test Company\n123 Test St\nTest City, TC 12345',
      certificationInfo: 'AS9100D Certified | FAA Repair Station #TEST',
    },
    sections: {
      coverPage: true,
      tableOfContents: true,
      engineIdentification: true,
      asBuiltConfiguration: true,
      operationsList: true,
      deviationsList: true,
      photoGallery: true,
      signaturePages: true,
      appendices: false,
    },
    styling: {
      primaryColor: '#1890ff',
      secondaryColor: '#722ed1',
      fontFamily: 'Arial',
      fontSize: 11,
      headerFontSize: 14,
      lineSpacing: 1.2,
      marginTop: 72,
      marginBottom: 72,
      marginLeft: 72,
      marginRight: 72,
    },
    content: {
      includePhotos: true,
      photoMaxSize: 300,
      includeDeviations: true,
      includeNotes: true,
      includeTimestamps: true,
      includeSignatures: true,
      includeQRCode: true,
      watermark: 'TEST CONFIDENTIAL',
    },
    compliance: {
      as9100: true,
      faaPart43: true,
      iso9001: false,
      customStandards: ['Test Standard TS-001'],
    },
    customerSettings: {
      requireCustomerApproval: false,
      customFields: [],
      customSections: [],
    },
  },
};

describe('Build Books API Integration Tests', () => {
  let authToken: string;
  let managerToken: string;
  let buildRecord: any;
  let template: any;

  beforeAll(async () => {
    // Clean up any existing test data
    await cleanupTestData();

    // Create test users
    await prisma.user.createMany({
      data: [testUser, testManager],
    });

    // Create auth tokens
    authToken = jwt.sign(
      { userId: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    managerToken = jwt.sign(
      { userId: testManager.id, role: testManager.role },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test data
    await prisma.part.create({ data: testPart });
    await prisma.workOrder.create({ data: testWorkOrder });
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up build books and templates before each test
    await prisma.buildBookTemplate.deleteMany();
    await prisma.buildRecord.deleteMany({
      where: { workOrderId: testWorkOrder.id },
    });

    // Create a test build record
    const buildRecordData = await prisma.buildRecord.create({
      data: {
        buildRecordNumber: 'BR-BB-TEST-001',
        workOrderId: testWorkOrder.id,
        status: BuildRecordStatus.COMPLETED,
        finalDisposition: 'ACCEPT',
        operatorId: testUser.id,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      include: {
        workOrder: {
          include: {
            part: true,
          },
        },
        operator: true,
        operations: true,
        deviations: true,
        photos: true,
        signatures: true,
      },
    });

    buildRecord = buildRecordData;
  });

  async function cleanupTestData() {
    // Clean up in reverse dependency order
    await prisma.buildBookTemplate.deleteMany();
    await prisma.buildRecord.deleteMany();
    await prisma.workOrder.deleteMany();
    await prisma.part.deleteMany();
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [testUser.id, testManager.id],
        },
      },
    });
  }

  describe('POST /api/build-books/generate/:buildRecordId', () => {
    it('should generate build book PDF with default template', async () => {
      const response = await request(app)
        .post(`/api/build-books/generate/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/attachment; filename=.*\.pdf/);
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(1000); // PDF should have some content
    });

    it('should generate build book with custom template', async () => {
      // Create a custom template first
      const templateResponse = await request(app)
        .post('/api/build-books/templates')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(testTemplate);

      template = templateResponse.body;

      const customSettings = {
        ...testTemplate.settings,
        header: {
          ...testTemplate.settings.header,
          title: 'Custom Build Book Title',
        },
      };

      const response = await request(app)
        .post(`/api/build-books/generate/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateSettings: customSettings })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should return 404 for nonexistent build record', async () => {
      await request(app)
        .post('/api/build-books/generate/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 400 for incomplete build record', async () => {
      // Create incomplete build record
      const incompleteBR = await prisma.buildRecord.create({
        data: {
          buildRecordNumber: 'BR-BB-INCOMPLETE-001',
          workOrderId: testWorkOrder.id,
          status: BuildRecordStatus.PENDING,
          finalDisposition: 'PENDING',
          operatorId: testUser.id,
          startedAt: new Date(),
        },
      });

      const response = await request(app)
        .post(`/api/build-books/generate/${incompleteBR.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toContain('Build record must be completed');
    });

    it('should include custom watermark in PDF', async () => {
      const customSettings = {
        ...testTemplate.settings,
        content: {
          ...testTemplate.settings.content,
          watermark: 'CUSTOM TEST WATERMARK',
        },
      };

      const response = await request(app)
        .post(`/api/build-books/generate/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateSettings: customSettings })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('POST /api/build-books/preview/:buildRecordId', () => {
    it('should generate preview PDF', async () => {
      const response = await request(app)
        .post(`/api/build-books/preview/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateSettings: testTemplate.settings })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.headers['content-disposition']).toMatch(/inline; filename=.*preview.*\.pdf/);
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should include preview watermark', async () => {
      const response = await request(app)
        .post(`/api/build-books/preview/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ templateSettings: testTemplate.settings })
        .expect(200);

      // Preview should be smaller/limited compared to full build book
      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.headers['content-type']).toBe('application/pdf');
    });
  });

  describe('POST /api/build-books/templates', () => {
    it('should create new template', async () => {
      const response = await request(app)
        .post('/api/build-books/templates')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(testTemplate)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: testTemplate.name,
        description: testTemplate.description,
        isDefault: testTemplate.isDefault,
        settings: testTemplate.settings,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      template = response.body;
    });

    it('should validate template settings', async () => {
      const invalidTemplate = {
        name: '', // Empty name should fail validation
        settings: null,
      };

      const response = await request(app)
        .post('/api/build-books/templates')
        .set('Authorization', `Bearer ${managerToken}`)
        .send(invalidTemplate)
        .expect(400);

      expect(response.body.error).toContain('validation');
    });

    it('should require manager role for template creation', async () => {
      const response = await request(app)
        .post('/api/build-books/templates')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .send(testTemplate)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });

    it('should prevent duplicate default templates', async () => {
      // Create first default template
      await request(app)
        .post('/api/build-books/templates')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          ...testTemplate,
          name: 'First Default',
          isDefault: true,
        });

      // Try to create second default template
      const response = await request(app)
        .post('/api/build-books/templates')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          ...testTemplate,
          name: 'Second Default',
          isDefault: true,
        })
        .expect(400);

      expect(response.body.error).toContain('default template already exists');
    });
  });

  describe('GET /api/build-books/templates', () => {
    beforeEach(async () => {
      // Create test templates
      await prisma.buildBookTemplate.createMany({
        data: [
          {
            ...testTemplate,
            name: 'Template 1',
            isDefault: true,
          },
          {
            ...testTemplate,
            name: 'Template 2',
            customerId: 'customer-1',
            isDefault: false,
          },
          {
            ...testTemplate,
            name: 'Template 3',
            isDefault: false,
          },
        ],
      });
    });

    it('should list all templates', async () => {
      const response = await request(app)
        .get('/api/build-books/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body).toContainEqual(
        expect.objectContaining({
          name: 'Template 1',
          isDefault: true,
        })
      );
    });

    it('should filter templates by customer', async () => {
      const response = await request(app)
        .get('/api/build-books/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ customerId: 'customer-1' })
        .expect(200);

      expect(response.body).toHaveLength(2); // Customer template + default template
      expect(response.body).toContainEqual(
        expect.objectContaining({
          name: 'Template 2',
          customerId: 'customer-1',
        })
      );
      expect(response.body).toContainEqual(
        expect.objectContaining({
          name: 'Template 1',
          isDefault: true,
        })
      );
    });
  });

  describe('GET /api/build-books/templates/:id', () => {
    beforeEach(async () => {
      const created = await prisma.buildBookTemplate.create({
        data: testTemplate,
      });
      template = created;
    });

    it('should get template by ID', async () => {
      const response = await request(app)
        .get(`/api/build-books/templates/${template.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: template.id,
        name: testTemplate.name,
        settings: testTemplate.settings,
      });
    });

    it('should return 404 for nonexistent template', async () => {
      await request(app)
        .get('/api/build-books/templates/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/build-books/templates/:id', () => {
    beforeEach(async () => {
      const created = await prisma.buildBookTemplate.create({
        data: testTemplate,
      });
      template = created;
    });

    it('should update template', async () => {
      const updateData = {
        name: 'Updated Template Name',
        description: 'Updated description',
        settings: {
          ...testTemplate.settings,
          header: {
            ...testTemplate.settings.header,
            title: 'Updated Title',
          },
        },
      };

      const response = await request(app)
        .put(`/api/build-books/templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: template.id,
        name: updateData.name,
        description: updateData.description,
        settings: updateData.settings,
      });
    });

    it('should require manager role for template updates', async () => {
      const updateData = {
        name: 'Unauthorized Update',
      };

      const response = await request(app)
        .put(`/api/build-books/templates/${template.id}`)
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .send(updateData)
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('DELETE /api/build-books/templates/:id', () => {
    beforeEach(async () => {
      const created = await prisma.buildBookTemplate.create({
        data: testTemplate,
      });
      template = created;
    });

    it('should delete template', async () => {
      await request(app)
        .delete(`/api/build-books/templates/${template.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(204);

      // Verify deletion
      await request(app)
        .get(`/api/build-books/templates/${template.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should prevent deletion of default template', async () => {
      // Create default template
      const defaultTemplate = await prisma.buildBookTemplate.create({
        data: {
          ...testTemplate,
          name: 'Default Template',
          isDefault: true,
        },
      });

      const response = await request(app)
        .delete(`/api/build-books/templates/${defaultTemplate.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(400);

      expect(response.body.error).toContain('Cannot delete default template');
    });

    it('should require manager role for template deletion', async () => {
      const response = await request(app)
        .delete(`/api/build-books/templates/${template.id}`)
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('GET /api/build-books/history/:buildRecordId', () => {
    beforeEach(async () => {
      // Create some build book generation history
      await prisma.buildBookGenerationHistory.createMany({
        data: [
          {
            buildRecordId: buildRecord.id,
            templateId: null,
            generatedAt: new Date(Date.now() - 86400000), // 1 day ago
            generatedBy: testUser.id,
            fileName: 'BuildBook_BR-BB-TEST-001_v1.pdf',
            fileSize: 1024000,
          },
          {
            buildRecordId: buildRecord.id,
            templateId: null,
            generatedAt: new Date(),
            generatedBy: testManager.id,
            fileName: 'BuildBook_BR-BB-TEST-001_v2.pdf',
            fileSize: 1048576,
          },
        ],
      });
    });

    it('should get build book generation history', async () => {
      const response = await request(app)
        .get(`/api/build-books/history/${buildRecord.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toMatchObject({
        buildRecordId: buildRecord.id,
        generatedBy: testManager.id,
        fileName: 'BuildBook_BR-BB-TEST-001_v2.pdf',
        fileSize: 1048576,
      });
    });
  });

  describe('GET /api/build-books/analytics', () => {
    beforeEach(async () => {
      // Create some analytics data
      await prisma.buildBookGenerationHistory.createMany({
        data: [
          {
            buildRecordId: buildRecord.id,
            templateId: null,
            generatedAt: new Date(Date.now() - 86400000),
            generatedBy: testUser.id,
            fileName: 'test1.pdf',
            fileSize: 1024000,
          },
          {
            buildRecordId: buildRecord.id,
            templateId: null,
            generatedAt: new Date(),
            generatedBy: testUser.id,
            fileName: 'test2.pdf',
            fileSize: 2048000,
          },
        ],
      });
    });

    it('should get build book analytics', async () => {
      const response = await request(app)
        .get('/api/build-books/analytics')
        .set('Authorization', `Bearer ${managerToken}`)
        .query({
          startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(response.body).toMatchObject({
        totalGenerated: expect.any(Number),
        totalSize: expect.any(Number),
        averageSize: expect.any(Number),
        generationsByUser: expect.any(Array),
        generationsByTemplate: expect.any(Array),
        generationsByDay: expect.any(Array),
      });
    });

    it('should require manager role for analytics', async () => {
      const response = await request(app)
        .get('/api/build-books/analytics')
        .set('Authorization', `Bearer ${authToken}`) // Regular user token
        .expect(403);

      expect(response.body.error).toContain('Insufficient permissions');
    });
  });
});