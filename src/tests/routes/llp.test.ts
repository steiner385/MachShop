/**
 * Integration Tests for LLP API Routes
 * Tests all LLP endpoints including configuration, life tracking,
 * alerts, certifications, and reporting functionality.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import llpRouter from '@/routes/llp';
import { setupTestDatabase, cleanupTestData, teardownTestDatabase } from '../helpers/database';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPAlertSeverity,
  LLPCertificationType
} from '@prisma/client';

describe('LLP Routes', () => {
  let app: express.Application;
  let testDb: PrismaClient;
  let testPartId: string;
  let testSerializedPartId: string;
  let authToken: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Setup Express app with LLP routes
    app = express();
    app.use(express.json());

    // Mock authentication middleware
    app.use((req, res, next) => {
      req.user = {
        id: 'test-user-123',
        username: 'testuser',
        roles: ['Production Supervisor'],
        permissions: ['production.read', 'production.write', 'llp.access', 'llp.manage']
      };
      next();
    });

    app.use('/api/v1/llp', llpRouter);

    // Clean up test data
    await testDb.llpAlert.deleteMany();
    await testDb.llpCertification.deleteMany();
    await testDb.llpLifeHistory.deleteMany();
    await testDb.serializedPart.deleteMany();
    await testDb.part.deleteMany();

    // Create test part
    const testPart = await testDb.part.create({
      data: {
        partNumber: 'TEST-LLP-API-001',
        partName: 'Test API LLP Part',
        partType: 'MANUFACTURED',
        isLifeLimited: true,
        llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
        llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
        llpCycleLimit: 1000,
        llpTimeLimit: 8760,
        llpInspectionInterval: 100,
        llpRegulatoryReference: 'FAA-AD-2024-001',
        llpCertificationRequired: true,
        description: 'Test LLP for API testing'
      }
    });
    testPartId = testPart.id;

    // Create test serialized part
    const testSerializedPart = await testDb.serializedPart.create({
      data: {
        partId: testPartId,
        serialNumber: 'SN-API-001',
        status: 'ACTIVE',
        manufacturingDate: new Date('2023-01-01'),
        location: 'Test Location'
      }
    });
    testSerializedPartId = testSerializedPart.id;
  });

  describe('Configuration Routes', () => {
    describe('POST /api/v1/llp/configuration', () => {
      it('should configure LLP settings for a part', async () => {
        const configData = {
          partId: testPartId,
          isLifeLimited: true,
          criticalityLevel: LLPCriticalityLevel.CRITICAL,
          retirementType: LLPRetirementType.CYCLES_ONLY,
          cycleLimit: 1500,
          regulatoryReference: 'EASA-AD-2024-002',
          certificationRequired: true,
          notes: 'Updated configuration for enhanced safety'
        };

        const response = await request(app)
          .post('/api/v1/llp/configuration')
          .send(configData)
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('partId', testPartId);
      });

      it('should validate configuration data', async () => {
        const invalidConfigData = {
          partId: testPartId,
          isLifeLimited: true,
          criticalityLevel: 'INVALID_LEVEL',
          retirementType: LLPRetirementType.CYCLES_ONLY,
          cycleLimit: -100
        };

        await request(app)
          .post('/api/v1/llp/configuration')
          .send(invalidConfigData)
          .expect(400);
      });

      it('should require authentication', async () => {
        // Create app without auth middleware
        const noAuthApp = express();
        noAuthApp.use(express.json());
        noAuthApp.use('/api/v1/llp', llpRouter);

        const configData = {
          partId: testPartId,
          isLifeLimited: true,
          criticalityLevel: LLPCriticalityLevel.CRITICAL
        };

        await request(noAuthApp)
          .post('/api/v1/llp/configuration')
          .send(configData)
          .expect(401);
      });
    });

    describe('GET /api/v1/llp/configuration/:partId', () => {
      it('should retrieve LLP configuration for a part', async () => {
        const response = await request(app)
          .get(`/api/v1/llp/configuration/${testPartId}`)
          .expect(200);

        expect(response.body).toHaveProperty('partId', testPartId);
        expect(response.body).toHaveProperty('isLifeLimited', true);
        expect(response.body).toHaveProperty('criticalityLevel', LLPCriticalityLevel.CRITICAL);
        expect(response.body).toHaveProperty('cycleLimit', 1000);
      });

      it('should return 404 for non-existent part', async () => {
        await request(app)
          .get('/api/v1/llp/configuration/non-existent-id')
          .expect(404);
      });
    });
  });

  describe('Life Event Routes', () => {
    describe('POST /api/v1/llp/life-events', () => {
      it('should record a manufacturing life event', async () => {
        const eventData = {
          serializedPartId: testSerializedPartId,
          eventType: 'MANUFACTURING_COMPLETE',
          eventDate: new Date('2023-01-15').toISOString(),
          cyclesAtEvent: 0,
          hoursAtEvent: 0,
          performedBy: 'TEST-OPERATOR-001',
          location: 'Assembly Line 1',
          notes: 'Initial manufacturing completion'
        };

        const response = await request(app)
          .post('/api/v1/llp/life-events')
          .send(eventData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(typeof response.body.id).toBe('string');
      });

      it('should record an installation event', async () => {
        const eventData = {
          serializedPartId: testSerializedPartId,
          eventType: 'INSTALLATION',
          eventDate: new Date('2023-02-01').toISOString(),
          cyclesAtEvent: 0,
          hoursAtEvent: 0,
          parentAssemblyId: 'ENGINE-ASSEMBLY-001',
          parentSerialNumber: 'ENG-SN-12345',
          workOrderId: 'WO-INSTALL-001',
          performedBy: 'MECHANIC-001',
          location: 'Engine Assembly Bay'
        };

        const response = await request(app)
          .post('/api/v1/llp/life-events')
          .send(eventData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
      });

      it('should validate life event data', async () => {
        const invalidEventData = {
          serializedPartId: 'invalid-id',
          eventType: 'INSTALLATION',
          eventDate: 'invalid-date',
          cyclesAtEvent: -50
        };

        await request(app)
          .post('/api/v1/llp/life-events')
          .send(invalidEventData)
          .expect(400);
      });
    });

    describe('GET /api/v1/llp/life-status/:serializedPartId', () => {
      beforeEach(async () => {
        // Create life history for testing
        await testDb.llpLifeHistory.createMany({
          data: [
            {
              serializedPartId: testSerializedPartId,
              eventType: 'MANUFACTURING_COMPLETE',
              eventDate: new Date('2023-01-15'),
              cyclesAtEvent: 0,
              hoursAtEvent: 0,
              performedBy: 'OPERATOR-001',
              location: 'Manufacturing'
            },
            {
              serializedPartId: testSerializedPartId,
              eventType: 'OPERATION',
              eventDate: new Date('2023-06-01'),
              cyclesAtEvent: 500,
              hoursAtEvent: 4380,
              performedBy: 'SYSTEM',
              location: 'In Service'
            }
          ]
        });
      });

      it('should retrieve current life status', async () => {
        const response = await request(app)
          .get(`/api/v1/llp/life-status/${testSerializedPartId}`)
          .expect(200);

        expect(response.body).toHaveProperty('currentCycles', 500);
        expect(response.body).toHaveProperty('currentHours', 4380);
        expect(response.body).toHaveProperty('overallPercentageUsed', 50);
        expect(response.body).toHaveProperty('status', 'ACTIVE');
        expect(response.body).toHaveProperty('alertLevel');
      });
    });

    describe('GET /api/v1/llp/back-to-birth/:serializedPartId', () => {
      beforeEach(async () => {
        // Create comprehensive life history
        await testDb.llpLifeHistory.createMany({
          data: [
            {
              serializedPartId: testSerializedPartId,
              eventType: 'MANUFACTURING_COMPLETE',
              eventDate: new Date('2023-01-15'),
              cyclesAtEvent: 0,
              hoursAtEvent: 0,
              performedBy: 'OPERATOR-001',
              location: 'Manufacturing'
            },
            {
              serializedPartId: testSerializedPartId,
              eventType: 'INSTALLATION',
              eventDate: new Date('2023-02-01'),
              cyclesAtEvent: 0,
              hoursAtEvent: 0,
              parentAssemblyId: 'ENGINE-001',
              workOrderId: 'WO-001',
              performedBy: 'MECHANIC-001',
              location: 'Assembly'
            },
            {
              serializedPartId: testSerializedPartId,
              eventType: 'MAINTENANCE',
              eventDate: new Date('2023-08-01'),
              cyclesAtEvent: 400,
              hoursAtEvent: 3500,
              workOrderId: 'WO-MAINT-001',
              performedBy: 'MECHANIC-002',
              location: 'Maintenance'
            }
          ]
        });
      });

      it('should provide complete back-to-birth traceability', async () => {
        const response = await request(app)
          .get(`/api/v1/llp/back-to-birth/${testSerializedPartId}`)
          .expect(200);

        expect(response.body).toHaveProperty('serializedPartId', testSerializedPartId);
        expect(response.body).toHaveProperty('partDetails');
        expect(response.body).toHaveProperty('manufacturingHistory');
        expect(response.body).toHaveProperty('installationHistory');
        expect(response.body).toHaveProperty('maintenanceHistory');
        expect(response.body).toHaveProperty('currentStatus');

        expect(response.body.manufacturingHistory).toHaveLength(1);
        expect(response.body.installationHistory).toHaveLength(1);
        expect(response.body.maintenanceHistory).toHaveLength(1);
      });
    });

    describe('GET /api/v1/llp/life-history/:serializedPartId', () => {
      beforeEach(async () => {
        // Create multiple life events for pagination testing
        const events = Array.from({ length: 15 }, (_, i) => ({
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date(`2023-${String(i + 1).padStart(2, '0')}-01`),
          cyclesAtEvent: i * 10,
          hoursAtEvent: i * 100,
          performedBy: 'SYSTEM',
          location: 'In Service'
        }));

        await testDb.llpLifeHistory.createMany({ data: events });
      });

      it('should retrieve paginated life history', async () => {
        const response = await request(app)
          .get(`/api/v1/llp/life-history/${testSerializedPartId}`)
          .query({ page: 1, limit: 10 })
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total', 15);
        expect(response.body).toHaveProperty('page', 1);
        expect(response.body).toHaveProperty('totalPages', 2);
        expect(response.body.data).toHaveLength(10);
      });

      it('should filter by event type', async () => {
        const response = await request(app)
          .get(`/api/v1/llp/life-history/${testSerializedPartId}`)
          .query({ eventType: 'OPERATION' })
          .expect(200);

        expect(response.body.data.every((event: any) => event.eventType === 'OPERATION')).toBe(true);
      });
    });
  });

  describe('Alert Routes', () => {
    beforeEach(async () => {
      // Create test alerts
      await testDb.llpAlert.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            alertType: 'LIFE_LIMIT_APPROACHING',
            severity: LLPAlertSeverity.INFO,
            title: 'Info Alert',
            message: 'Info level alert',
            currentCycles: 500,
            currentHours: 4380,
            isActive: true,
            generatedAt: new Date()
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: 'INSPECTION_DUE',
            severity: LLPAlertSeverity.WARNING,
            title: 'Inspection Due',
            message: 'Scheduled inspection required',
            currentCycles: 600,
            currentHours: 5256,
            isActive: true,
            generatedAt: new Date()
          }
        ]
      });
    });

    describe('POST /api/v1/llp/alerts/configuration', () => {
      it('should configure alert settings', async () => {
        const alertConfig = {
          globalConfig: true,
          enabled: true,
          thresholds: {
            info: 50,
            warning: 75,
            critical: 90,
            urgent: 95
          },
          notifications: {
            email: true,
            sms: false,
            dashboard: true
          },
          recipients: ['supervisor@company.com']
        };

        await request(app)
          .post('/api/v1/llp/alerts/configuration')
          .send(alertConfig)
          .expect(200);
      });

      it('should validate alert configuration', async () => {
        const invalidConfig = {
          globalConfig: true,
          enabled: true,
          thresholds: {
            info: 80, // Invalid: higher than warning
            warning: 75,
            critical: 90,
            urgent: 95
          },
          notifications: {
            email: true,
            sms: false,
            dashboard: true
          },
          recipients: []
        };

        await request(app)
          .post('/api/v1/llp/alerts/configuration')
          .send(invalidConfig)
          .expect(400);
      });
    });

    describe('GET /api/v1/llp/alerts', () => {
      it('should retrieve all active alerts', async () => {
        const response = await request(app)
          .get('/api/v1/llp/alerts')
          .query({ isActive: 'true' })
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total', 2);
        expect(response.body.data).toHaveLength(2);
      });

      it('should filter alerts by severity', async () => {
        const response = await request(app)
          .get('/api/v1/llp/alerts')
          .query({ severity: LLPAlertSeverity.WARNING, isActive: 'true' })
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].severity).toBe(LLPAlertSeverity.WARNING);
      });

      it('should filter alerts by serialized part', async () => {
        const response = await request(app)
          .get('/api/v1/llp/alerts')
          .query({ serializedPartId: testSerializedPartId, isActive: 'true' })
          .expect(200);

        expect(response.body.data.every((alert: any) => alert.serializedPartId === testSerializedPartId)).toBe(true);
      });
    });

    describe('POST /api/v1/llp/alerts/:alertId/acknowledge', () => {
      let testAlertId: string;

      beforeEach(async () => {
        const alert = await testDb.llpAlert.create({
          data: {
            serializedPartId: testSerializedPartId,
            alertType: 'LIFE_LIMIT_APPROACHING',
            severity: LLPAlertSeverity.WARNING,
            title: 'Test Acknowledgment Alert',
            message: 'Test alert for acknowledgment',
            currentCycles: 750,
            currentHours: 6570,
            isActive: true,
            generatedAt: new Date()
          }
        });
        testAlertId = alert.id;
      });

      it('should acknowledge an alert', async () => {
        const ackData = {
          notes: 'Alert reviewed and acknowledged by maintenance team'
        };

        await request(app)
          .post(`/api/v1/llp/alerts/${testAlertId}/acknowledge`)
          .send(ackData)
          .expect(200);

        // Verify acknowledgment
        const acknowledgedAlert = await testDb.llpAlert.findUnique({
          where: { id: testAlertId }
        });

        expect(acknowledgedAlert!.isAcknowledged).toBe(true);
        expect(acknowledgedAlert!.acknowledgedBy).toBe('test-user-123');
        expect(acknowledgedAlert!.acknowledgmentNotes).toBe(ackData.notes);
      });
    });

    describe('POST /api/v1/llp/alerts/:alertId/resolve', () => {
      let testAlertId: string;

      beforeEach(async () => {
        const alert = await testDb.llpAlert.create({
          data: {
            serializedPartId: testSerializedPartId,
            alertType: 'INSPECTION_DUE',
            severity: LLPAlertSeverity.WARNING,
            title: 'Test Resolution Alert',
            message: 'Test alert for resolution',
            currentCycles: 600,
            currentHours: 5256,
            isActive: true,
            isAcknowledged: true,
            acknowledgedBy: 'test-user-123',
            acknowledgedAt: new Date(),
            generatedAt: new Date()
          }
        });
        testAlertId = alert.id;
      });

      it('should resolve an acknowledged alert', async () => {
        const resolutionData = {
          resolution: 'INSPECTION_COMPLETED',
          notes: 'Inspection completed successfully'
        };

        await request(app)
          .post(`/api/v1/llp/alerts/${testAlertId}/resolve`)
          .send(resolutionData)
          .expect(200);

        // Verify resolution
        const resolvedAlert = await testDb.llpAlert.findUnique({
          where: { id: testAlertId }
        });

        expect(resolvedAlert!.isActive).toBe(false);
        expect(resolvedAlert!.resolvedBy).toBe('test-user-123');
        expect(resolvedAlert!.resolution).toBe(resolutionData.resolution);
        expect(resolvedAlert!.resolutionNotes).toBe(resolutionData.notes);
      });
    });
  });

  describe('Certification Routes', () => {
    describe('POST /api/v1/llp/certifications/upload', () => {
      it('should upload certification document', async () => {
        const response = await request(app)
          .post('/api/v1/llp/certifications/upload')
          .attach('document', Buffer.from('Test document content'), 'test-cert.pdf')
          .field('metadata', JSON.stringify({
            documentType: 'MANUFACTURING_CERTIFICATE',
            issuingOrganization: 'Test Certification Body'
          }))
          .expect(201);

        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('documentUrl');
        expect(response.body).toHaveProperty('documentId');
      });

      it('should reject invalid file types', async () => {
        await request(app)
          .post('/api/v1/llp/certifications/upload')
          .attach('document', Buffer.from('Malicious content'), 'malware.exe')
          .expect(400);
      });
    });

    describe('POST /api/v1/llp/certifications', () => {
      let testDocumentUrl: string;

      beforeEach(async () => {
        // Mock document upload
        testDocumentUrl = '/api/llp/documents/test-doc-001.pdf';
      });

      it('should create manufacturing certification', async () => {
        const certificationData = {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'API-MANUF-001',
          issuingOrganization: 'Manufacturing Quality Assurance',
          issuedDate: new Date('2023-01-15').toISOString(),
          expirationDate: new Date('2025-01-15').toISOString(),
          certificationStandard: 'AS9100',
          documentUrl: testDocumentUrl
        };

        const response = await request(app)
          .post('/api/v1/llp/certifications')
          .send(certificationData)
          .expect(201);

        expect(response.body).toHaveProperty('id');
      });

      it('should validate certification data', async () => {
        const invalidCertificationData = {
          serializedPartId: testSerializedPartId,
          certificationType: 'INVALID_TYPE',
          // Missing required fields
          issuingOrganization: 'Test Org'
        };

        await request(app)
          .post('/api/v1/llp/certifications')
          .send(invalidCertificationData)
          .expect(400);
      });
    });

    describe('GET /api/v1/llp/certifications/:serializedPartId', () => {
      beforeEach(async () => {
        // Create test certifications
        await testDb.llpCertification.createMany({
          data: [
            {
              serializedPartId: testSerializedPartId,
              certificationType: LLPCertificationType.MANUFACTURING,
              certificationNumber: 'API-CERT-001',
              issuingOrganization: 'Manufacturing QA',
              issuedDate: new Date('2023-01-15'),
              expirationDate: new Date('2025-01-15'),
              certificationStandard: 'AS9100',
              documentUrl: '/api/docs/cert-001.pdf',
              isActive: true,
              isVerified: true
            },
            {
              serializedPartId: testSerializedPartId,
              certificationType: LLPCertificationType.INSTALLATION,
              certificationNumber: 'API-CERT-002',
              issuingOrganization: 'Installation Team',
              issuedDate: new Date('2023-02-01'),
              expirationDate: new Date('2025-02-01'),
              certificationStandard: 'MIL-STD-1530',
              documentUrl: '/api/docs/cert-002.pdf',
              isActive: true,
              isVerified: false
            }
          ]
        });
      });

      it('should retrieve certification status', async () => {
        const response = await request(app)
          .get(`/api/v1/llp/certifications/${testSerializedPartId}`)
          .expect(200);

        expect(response.body).toHaveProperty('serializedPartId', testSerializedPartId);
        expect(response.body).toHaveProperty('totalCertifications', 2);
        expect(response.body).toHaveProperty('activeCertifications', 2);
        expect(response.body).toHaveProperty('verifiedCertifications', 1);
        expect(response.body).toHaveProperty('certificationsByType');
      });
    });

    describe('POST /api/v1/llp/certifications/verify', () => {
      let testCertificationId: string;

      beforeEach(async () => {
        const certification = await testDb.llpCertification.create({
          data: {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'API-VERIFY-001',
            issuingOrganization: 'Test Organization',
            issuedDate: new Date('2023-01-01'),
            expirationDate: new Date('2025-01-01'),
            certificationStandard: 'Test Standard',
            documentUrl: '/api/docs/verify-001.pdf',
            isActive: true,
            isVerified: false
          }
        });
        testCertificationId = certification.id;
      });

      it('should verify certification', async () => {
        const verificationData = {
          certificationId: testCertificationId,
          verifiedBy: 'QA-MANAGER-001',
          verificationNotes: 'Certification reviewed and verified',
          complianceStandards: ['AS9100', 'ISO 9001']
        };

        await request(app)
          .post('/api/v1/llp/certifications/verify')
          .send(verificationData)
          .expect(200);

        // Verify the certification was updated
        const verifiedCert = await testDb.llpCertification.findUnique({
          where: { id: testCertificationId }
        });

        expect(verifiedCert!.isVerified).toBe(true);
        expect(verifiedCert!.verifiedBy).toBe('QA-MANAGER-001');
        expect(verifiedCert!.complianceStandards).toEqual(['AS9100', 'ISO 9001']);
      });
    });

    describe('GET /api/v1/llp/certifications/expiring', () => {
      beforeEach(async () => {
        const now = new Date();
        const expiringDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days

        await testDb.llpCertification.create({
          data: {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MAINTENANCE,
            certificationNumber: 'API-EXPIRING-001',
            issuingOrganization: 'Test Org',
            issuedDate: new Date(now.getTime() - 350 * 24 * 60 * 60 * 1000),
            expirationDate: expiringDate,
            certificationStandard: 'Test Standard',
            documentUrl: '/api/docs/expiring-001.pdf',
            isActive: true
          }
        });
      });

      it('should retrieve expiring certifications', async () => {
        const response = await request(app)
          .get('/api/v1/llp/certifications/expiring')
          .query({ daysAhead: 30 })
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toHaveProperty('certificationNumber', 'API-EXPIRING-001');
        expect(response.body[0]).toHaveProperty('daysUntilExpiration');
        expect(response.body[0].daysUntilExpiration).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('Reporting Routes', () => {
    beforeEach(async () => {
      // Create data for reporting
      await testDb.llpLifeHistory.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            eventType: 'MANUFACTURING_COMPLETE',
            eventDate: new Date('2023-01-15'),
            cyclesAtEvent: 0,
            hoursAtEvent: 0,
            performedBy: 'OPERATOR-001',
            location: 'Manufacturing'
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'OPERATION',
            eventDate: new Date('2023-06-01'),
            cyclesAtEvent: 500,
            hoursAtEvent: 4380,
            performedBy: 'SYSTEM',
            location: 'In Service'
          }
        ]
      });
    });

    describe('POST /api/v1/llp/reports/fleet-status', () => {
      it('should generate fleet status report in PDF format', async () => {
        const reportRequest = {
          format: 'PDF',
          filters: {
            criticalityLevel: LLPCriticalityLevel.CRITICAL
          }
        };

        const response = await request(app)
          .post('/api/v1/llp/reports/fleet-status')
          .send(reportRequest)
          .expect(201);

        expect(response.body).toHaveProperty('reportId');
        expect(response.body).toHaveProperty('fileName');
        expect(response.body.fileName).toContain('.pdf');
        expect(response.body).toHaveProperty('downloadUrl');
        expect(response.body).toHaveProperty('metadata');
        expect(response.body.metadata.format).toBe('PDF');
        expect(response.body.metadata.reportType).toBe('FLEET_STATUS');
      });

      it('should generate fleet status report in Excel format', async () => {
        const reportRequest = {
          format: 'EXCEL'
        };

        const response = await request(app)
          .post('/api/v1/llp/reports/fleet-status')
          .send(reportRequest)
          .expect(201);

        expect(response.body.fileName).toContain('.xlsx');
        expect(response.body.metadata.format).toBe('EXCEL');
      });

      it('should validate report generation parameters', async () => {
        const invalidRequest = {
          format: 'INVALID_FORMAT'
        };

        await request(app)
          .post('/api/v1/llp/reports/fleet-status')
          .send(invalidRequest)
          .expect(400);
      });
    });

    describe('POST /api/v1/llp/reports/retirement-forecast', () => {
      it('should generate retirement forecast report', async () => {
        const reportRequest = {
          daysAhead: 90,
          format: 'PDF'
        };

        const response = await request(app)
          .post('/api/v1/llp/reports/retirement-forecast')
          .send(reportRequest)
          .expect(201);

        expect(response.body).toHaveProperty('reportId');
        expect(response.body.metadata.reportType).toBe('RETIREMENT_FORECAST');
        expect(response.body.metadata.filters.daysAhead).toBe(90);
      });

      it('should use default days ahead', async () => {
        const reportRequest = {
          format: 'JSON'
        };

        const response = await request(app)
          .post('/api/v1/llp/reports/retirement-forecast')
          .send(reportRequest)
          .expect(201);

        expect(response.body.metadata.filters.daysAhead).toBe(365);
      });
    });

    describe('POST /api/v1/llp/reports/compliance', () => {
      it('should generate compliance report for all standards', async () => {
        const reportRequest = {
          regulatoryStandard: 'ALL',
          format: 'PDF'
        };

        const response = await request(app)
          .post('/api/v1/llp/reports/compliance')
          .send(reportRequest)
          .expect(201);

        expect(response.body.metadata.reportType).toBe('REGULATORY_COMPLIANCE');
        expect(response.body.metadata.filters.regulatoryStandard).toBe('ALL');
      });

      it('should generate compliance report for specific standard', async () => {
        const reportRequest = {
          regulatoryStandard: 'FAA',
          format: 'EXCEL'
        };

        const response = await request(app)
          .post('/api/v1/llp/reports/compliance')
          .send(reportRequest)
          .expect(201);

        expect(response.body.metadata.filters.regulatoryStandard).toBe('FAA');
      });
    });

    describe('GET /api/v1/llp/reports/formats', () => {
      it('should retrieve available report formats', async () => {
        const response = await request(app)
          .get('/api/v1/llp/reports/formats')
          .expect(200);

        expect(response.body).toHaveProperty('exportFormats');
        expect(response.body).toHaveProperty('reportTypes');
        expect(response.body).toHaveProperty('supportedCombinations');
        expect(response.body).toHaveProperty('maxRetentionDays', 7);

        expect(response.body.exportFormats).toContain('PDF');
        expect(response.body.exportFormats).toContain('EXCEL');
        expect(response.body.exportFormats).toContain('CSV');
        expect(response.body.exportFormats).toContain('JSON');
      });
    });
  });

  describe('Retirement Routes', () => {
    describe('POST /api/v1/llp/retirement', () => {
      it('should retire an LLP successfully', async () => {
        const retirementData = {
          serializedPartId: testSerializedPartId,
          retirementDate: new Date('2024-01-01').toISOString(),
          retirementCycles: 1000,
          retirementReason: 'Reached cycle limit',
          disposition: 'SCRAP',
          performedBy: 'SUPERVISOR-001',
          location: 'Retirement Facility',
          notes: 'Part retired due to reaching maximum cycle limit'
        };

        const response = await request(app)
          .post('/api/v1/llp/retirement')
          .send(retirementData)
          .expect(201);

        expect(response.body).toHaveProperty('id');

        // Verify part status was updated
        const updatedPart = await testDb.serializedPart.findUnique({
          where: { id: testSerializedPartId }
        });

        expect(updatedPart!.status).toBe('RETIRED');
      });

      it('should validate retirement data', async () => {
        const invalidRetirementData = {
          serializedPartId: testSerializedPartId,
          retirementDate: new Date('2024-01-01').toISOString(),
          retirementCycles: -100, // Invalid negative cycles
          retirementReason: 'Test retirement',
          disposition: 'SCRAP',
          performedBy: 'SUPERVISOR-001',
          location: 'Test Location'
        };

        await request(app)
          .post('/api/v1/llp/retirement')
          .send(invalidRetirementData)
          .expect(400);
      });
    });

    describe('GET /api/v1/llp/retirement-forecast', () => {
      beforeEach(async () => {
        // Create life history approaching retirement
        await testDb.llpLifeHistory.create({
          data: {
            serializedPartId: testSerializedPartId,
            eventType: 'OPERATION',
            eventDate: new Date('2023-11-01'),
            cyclesAtEvent: 950, // Close to 1000 limit
            hoursAtEvent: 8300, // Close to 8760 limit
            performedBy: 'SYSTEM',
            location: 'In Service'
          }
        });
      });

      it('should retrieve retirement forecast', async () => {
        const response = await request(app)
          .get('/api/v1/llp/retirement-forecast')
          .query({ daysAhead: 90 })
          .expect(200);

        expect(response.body).toBeInstanceOf(Array);
        // Should include parts approaching retirement
      });
    });
  });

  describe('Health Check Route', () => {
    describe('GET /api/v1/llp/health', () => {
      it('should return system health status', async () => {
        const response = await request(app)
          .get('/api/v1/llp/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'healthy');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('services');
        expect(response.body).toHaveProperty('version', '1.0.0');

        expect(response.body.services).toHaveProperty('llpService', 'operational');
        expect(response.body.services).toHaveProperty('alertService', 'operational');
        expect(response.body.services).toHaveProperty('certificationService', 'operational');
        expect(response.body.services).toHaveProperty('database', 'operational');
      });
    });
  });

  describe('Batch Operations', () => {
    describe('POST /api/v1/llp/batch/life-events', () => {
      it('should process multiple life events in batch', async () => {
        const events = [
          {
            serializedPartId: testSerializedPartId,
            eventType: 'OPERATION',
            eventDate: new Date('2023-03-01').toISOString(),
            cyclesAtEvent: 100,
            hoursAtEvent: 900,
            performedBy: 'SYSTEM',
            location: 'In Service'
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'OPERATION',
            eventDate: new Date('2023-04-01').toISOString(),
            cyclesAtEvent: 200,
            hoursAtEvent: 1800,
            performedBy: 'SYSTEM',
            location: 'In Service'
          }
        ];

        const response = await request(app)
          .post('/api/v1/llp/batch/life-events')
          .send({ events })
          .expect(200);

        expect(response.body).toHaveProperty('successful');
        expect(response.body).toHaveProperty('failed');
        expect(response.body).toHaveProperty('totalProcessed', 2);
        expect(response.body.successful).toHaveLength(2);
        expect(response.body.failed).toHaveLength(0);
      });

      it('should validate batch events data', async () => {
        await request(app)
          .post('/api/v1/llp/batch/life-events')
          .send({ events: [] })
          .expect(400);
      });
    });
  });
});