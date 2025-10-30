/**
 * Database Integration Tests for LLP Models
 * Tests Prisma models, relationships, constraints, and database operations
 * for Life-Limited Parts data persistence.
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { setupTestDatabase, teardownTestDatabase } from '../../helpers/database';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPAlertSeverity,
  LLPAlertType,
  LLPCertificationType
} from '@prisma/client';

describe('LLP Database Models Integration', () => {
  let testDb: PrismaClient;
  let testPartId: string;
  let testSerializedPartId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await testDb.llpAlert.deleteMany();
    await testDb.llpCertification.deleteMany();
    await testDb.llpLifeHistory.deleteMany();
    await testDb.serializedPart.deleteMany();
    await testDb.part.deleteMany();

    // Create test part with LLP configuration
    const testPart = await testDb.part.create({
      data: {
        partNumber: 'TEST-DB-001',
        partName: 'Test Database LLP Part',
        partType: 'MANUFACTURED',
        isLifeLimited: true,
        llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
        llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
        llpCycleLimit: 1000,
        llpTimeLimit: 8760,
        llpInspectionInterval: 100,
        llpRegulatoryReference: 'FAA-AD-2024-001',
        llpCertificationRequired: true,
        llpNotes: 'Test LLP for database testing',
        description: 'Critical turbine blade with life limits'
      }
    });
    testPartId = testPart.id;

    // Create test serialized part
    const testSerializedPart = await testDb.serializedPart.create({
      data: {
        partId: testPartId,
        serialNumber: 'SN-DB-001',
        status: 'ACTIVE',
        manufacturingDate: new Date('2023-01-01'),
        location: 'Database Test Location'
      }
    });
    testSerializedPartId = testSerializedPart.id;
  });

  describe('Part Model LLP Extensions', () => {
    it('should store LLP configuration correctly', async () => {
      const part = await testDb.part.findUnique({
        where: { id: testPartId }
      });

      expect(part).toBeTruthy();
      expect(part!.isLifeLimited).toBe(true);
      expect(part!.llpCriticalityLevel).toBe(LLPCriticalityLevel.CRITICAL);
      expect(part!.llpRetirementType).toBe(LLPRetirementType.CYCLES_OR_TIME);
      expect(part!.llpCycleLimit).toBe(1000);
      expect(part!.llpTimeLimit).toBe(8760);
      expect(part!.llpInspectionInterval).toBe(100);
      expect(part!.llpRegulatoryReference).toBe('FAA-AD-2024-001');
      expect(part!.llpCertificationRequired).toBe(true);
      expect(part!.llpNotes).toBe('Test LLP for database testing');
    });

    it('should handle optional LLP fields', async () => {
      const partWithoutOptionalFields = await testDb.part.create({
        data: {
          partNumber: 'TEST-DB-002',
          partName: 'Test Part Without Optional LLP Fields',
          partType: 'MANUFACTURED',
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.TRACKED,
          llpRetirementType: LLPRetirementType.CYCLES_ONLY,
          llpCycleLimit: 500,
          description: 'Test part with minimal LLP configuration'
        }
      });

      expect(partWithoutOptionalFields.llpTimeLimit).toBeNull();
      expect(partWithoutOptionalFields.llpInspectionInterval).toBeNull();
      expect(partWithoutOptionalFields.llpRegulatoryReference).toBeNull();
      expect(partWithoutOptionalFields.llpCertificationRequired).toBe(false);
      expect(partWithoutOptionalFields.llpNotes).toBeNull();
    });

    it('should enforce enum constraints', async () => {
      await expect(testDb.part.create({
        data: {
          partNumber: 'TEST-INVALID-001',
          partName: 'Invalid Criticality Level',
          partType: 'MANUFACTURED',
          isLifeLimited: true,
          llpCriticalityLevel: 'INVALID_LEVEL' as any,
          llpRetirementType: LLPRetirementType.CYCLES_ONLY,
          llpCycleLimit: 1000,
          description: 'Test invalid criticality level'
        }
      })).rejects.toThrow();
    });

    it('should query parts by LLP configuration', async () => {
      // Create additional test parts
      await testDb.part.createMany({
        data: [
          {
            partNumber: 'TEST-CRITICAL-001',
            partName: 'Critical Part 1',
            partType: 'MANUFACTURED',
            isLifeLimited: true,
            llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
            llpRetirementType: LLPRetirementType.CYCLES_ONLY,
            llpCycleLimit: 800,
            description: 'Critical part for query testing'
          },
          {
            partNumber: 'TEST-CONTROLLED-001',
            partName: 'Controlled Part 1',
            partType: 'MANUFACTURED',
            isLifeLimited: true,
            llpCriticalityLevel: LLPCriticalityLevel.CONTROLLED,
            llpRetirementType: LLPRetirementType.TIME_ONLY,
            llpTimeLimit: 10000,
            description: 'Controlled part for query testing'
          },
          {
            partNumber: 'TEST-NON-LLP-001',
            partName: 'Non-LLP Part',
            partType: 'PURCHASED',
            isLifeLimited: false,
            description: 'Non-LLP part for query testing'
          }
        ]
      });

      // Query critical LLP parts
      const criticalParts = await testDb.part.findMany({
        where: {
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.CRITICAL
        }
      });

      expect(criticalParts).toHaveLength(2); // Original + new critical part

      // Query parts with cycle limits
      const cycleOnlyParts = await testDb.part.findMany({
        where: {
          llpRetirementType: LLPRetirementType.CYCLES_ONLY
        }
      });

      expect(cycleOnlyParts).toHaveLength(1);

      // Query all LLP parts
      const allLLPParts = await testDb.part.findMany({
        where: { isLifeLimited: true }
      });

      expect(allLLPParts).toHaveLength(3);
    });
  });

  describe('LLPLifeHistory Model', () => {
    it('should create life history events', async () => {
      const lifeEvent = await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'MANUFACTURING_COMPLETE',
          eventDate: new Date('2023-01-15'),
          cyclesAtEvent: 0,
          hoursAtEvent: 0,
          performedBy: 'OPERATOR-001',
          location: 'Manufacturing Plant A',
          notes: 'Initial manufacturing completion',
          metadata: {
            batchNumber: 'BATCH-2023-001',
            qualityLevel: 'CRITICAL'
          },
          inspectionResults: {
            dimensionalCheck: 'PASS',
            surfaceFinish: 'PASS'
          },
          repairDetails: null
        }
      });

      expect(lifeEvent).toBeTruthy();
      expect(lifeEvent.eventType).toBe('MANUFACTURING_COMPLETE');
      expect(lifeEvent.cyclesAtEvent).toBe(0);
      expect(lifeEvent.hoursAtEvent).toBe(0);
      expect(lifeEvent.metadata).toEqual({
        batchNumber: 'BATCH-2023-001',
        qualityLevel: 'CRITICAL'
      });
      expect(lifeEvent.inspectionResults).toEqual({
        dimensionalCheck: 'PASS',
        surfaceFinish: 'PASS'
      });
    });

    it('should handle complex metadata and JSON fields', async () => {
      const complexEvent = await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'MAINTENANCE',
          eventDate: new Date('2023-08-01'),
          cyclesAtEvent: 500,
          hoursAtEvent: 4380,
          workOrderId: 'WO-MAINT-001',
          performedBy: 'MECHANIC-002',
          location: 'Maintenance Hangar B',
          notes: 'Comprehensive maintenance and inspection',
          metadata: {
            maintenanceType: 'SCHEDULED',
            workScope: 'DETAILED_INSPECTION',
            environmentalConditions: {
              temperature: '72°F',
              humidity: '45%',
              pressure: '14.7 PSI'
            },
            toolsUsed: ['TORQUE_WRENCH', 'BORESCOPE', 'ULTRASONIC_TESTER']
          },
          inspectionResults: {
            visualInspection: 'PASS',
            dimensionalCheck: 'PASS',
            ndt: {
              ultrasonicTest: 'PASS',
              eddyCurrent: 'PASS',
              fluorescantPenetrant: 'PASS'
            },
            defectsFound: []
          },
          repairDetails: {
            repairRequired: false,
            repairActions: [],
            replacedComponents: []
          }
        }
      });

      expect(complexEvent.metadata).toEqual(
        expect.objectContaining({
          maintenanceType: 'SCHEDULED',
          workScope: 'DETAILED_INSPECTION',
          environmentalConditions: expect.objectContaining({
            temperature: '72°F',
            humidity: '45%'
          }),
          toolsUsed: expect.arrayContaining(['TORQUE_WRENCH', 'BORESCOPE'])
        })
      );

      expect(complexEvent.inspectionResults).toEqual(
        expect.objectContaining({
          ndt: expect.objectContaining({
            ultrasonicTest: 'PASS',
            eddyCurrent: 'PASS'
          })
        })
      );
    });

    it('should maintain proper relationships', async () => {
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'INSTALLATION',
          eventDate: new Date('2023-02-01'),
          cyclesAtEvent: 0,
          hoursAtEvent: 0,
          parentAssemblyId: 'ENGINE-001',
          parentSerialNumber: 'ENG-12345',
          performedBy: 'MECHANIC-001',
          location: 'Assembly Line 1'
        }
      });

      // Query with relationship
      const serializedPartWithHistory = await testDb.serializedPart.findUnique({
        where: { id: testSerializedPartId },
        include: {
          llpLifeHistory: {
            orderBy: { eventDate: 'asc' }
          }
        }
      });

      expect(serializedPartWithHistory!.llpLifeHistory).toHaveLength(1);
      expect(serializedPartWithHistory!.llpLifeHistory[0].eventType).toBe('INSTALLATION');
      expect(serializedPartWithHistory!.llpLifeHistory[0].parentAssemblyId).toBe('ENGINE-001');
    });

    it('should order events chronologically', async () => {
      // Create multiple events out of order
      const events = [
        {
          eventType: 'OPERATION',
          eventDate: new Date('2023-06-01'),
          cyclesAtEvent: 300,
          hoursAtEvent: 2600
        },
        {
          eventType: 'MANUFACTURING_COMPLETE',
          eventDate: new Date('2023-01-15'),
          cyclesAtEvent: 0,
          hoursAtEvent: 0
        },
        {
          eventType: 'INSTALLATION',
          eventDate: new Date('2023-02-01'),
          cyclesAtEvent: 0,
          hoursAtEvent: 0
        }
      ];

      for (const event of events) {
        await testDb.llpLifeHistory.create({
          data: {
            serializedPartId: testSerializedPartId,
            ...event,
            performedBy: 'TEST-USER',
            location: 'Test Location'
          }
        });
      }

      // Query ordered by date
      const orderedEvents = await testDb.llpLifeHistory.findMany({
        where: { serializedPartId: testSerializedPartId },
        orderBy: { eventDate: 'asc' }
      });

      expect(orderedEvents).toHaveLength(3);
      expect(orderedEvents[0].eventType).toBe('MANUFACTURING_COMPLETE');
      expect(orderedEvents[1].eventType).toBe('INSTALLATION');
      expect(orderedEvents[2].eventType).toBe('OPERATION');
    });

    it('should cascade delete with serialized part', async () => {
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'MANUFACTURING_COMPLETE',
          eventDate: new Date('2023-01-15'),
          cyclesAtEvent: 0,
          hoursAtEvent: 0,
          performedBy: 'OPERATOR-001',
          location: 'Manufacturing'
        }
      });

      // Verify event exists
      const eventsBeforeDelete = await testDb.llpLifeHistory.findMany({
        where: { serializedPartId: testSerializedPartId }
      });
      expect(eventsBeforeDelete).toHaveLength(1);

      // Delete serialized part
      await testDb.serializedPart.delete({
        where: { id: testSerializedPartId }
      });

      // Verify events were cascade deleted
      const eventsAfterDelete = await testDb.llpLifeHistory.findMany({
        where: { serializedPartId: testSerializedPartId }
      });
      expect(eventsAfterDelete).toHaveLength(0);
    });
  });

  describe('LLPAlert Model', () => {
    it('should create and manage alerts', async () => {
      const alert = await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
          severity: LLPAlertSeverity.WARNING,
          title: 'Life Limit Approaching',
          message: 'Part has reached 75% of life limit',
          currentCycles: 750,
          currentHours: 6570,
          cycleThreshold: 750,
          hourThreshold: 6570,
          isActive: true,
          isAcknowledged: false,
          generatedAt: new Date(),
          metadata: {
            percentageUsed: 75,
            estimatedRetirementDate: '2024-06-01',
            riskLevel: 'MODERATE'
          }
        }
      });

      expect(alert).toBeTruthy();
      expect(alert.alertType).toBe(LLPAlertType.LIFE_LIMIT_APPROACHING);
      expect(alert.severity).toBe(LLPAlertSeverity.WARNING);
      expect(alert.isActive).toBe(true);
      expect(alert.isAcknowledged).toBe(false);
      expect(alert.metadata).toEqual(
        expect.objectContaining({
          percentageUsed: 75,
          riskLevel: 'MODERATE'
        })
      );
    });

    it('should handle alert acknowledgment workflow', async () => {
      const alert = await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.INSPECTION_DUE,
          severity: LLPAlertSeverity.INFO,
          title: 'Inspection Due',
          message: 'Scheduled inspection required',
          currentCycles: 500,
          currentHours: 4380,
          isActive: true,
          isAcknowledged: false,
          generatedAt: new Date()
        }
      });

      // Acknowledge alert
      const acknowledgedAlert = await testDb.llpAlert.update({
        where: { id: alert.id },
        data: {
          isAcknowledged: true,
          acknowledgedBy: 'SUPERVISOR-001',
          acknowledgedAt: new Date(),
          acknowledgmentNotes: 'Alert reviewed and action planned'
        }
      });

      expect(acknowledgedAlert.isAcknowledged).toBe(true);
      expect(acknowledgedAlert.acknowledgedBy).toBe('SUPERVISOR-001');
      expect(acknowledgedAlert.acknowledgedAt).toBeTruthy();
      expect(acknowledgedAlert.acknowledgmentNotes).toBe('Alert reviewed and action planned');
    });

    it('should handle alert resolution workflow', async () => {
      const alert = await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.INSPECTION_DUE,
          severity: LLPAlertSeverity.WARNING,
          title: 'Inspection Due',
          message: 'Scheduled inspection required',
          currentCycles: 600,
          currentHours: 5256,
          isActive: true,
          isAcknowledged: true,
          acknowledgedBy: 'SUPERVISOR-001',
          acknowledgedAt: new Date(),
          generatedAt: new Date()
        }
      });

      // Resolve alert
      const resolvedAlert = await testDb.llpAlert.update({
        where: { id: alert.id },
        data: {
          isActive: false,
          resolvedBy: 'MECHANIC-001',
          resolvedAt: new Date(),
          resolution: 'INSPECTION_COMPLETED',
          resolutionNotes: 'Inspection completed successfully, all parameters within limits'
        }
      });

      expect(resolvedAlert.isActive).toBe(false);
      expect(resolvedAlert.resolvedBy).toBe('MECHANIC-001');
      expect(resolvedAlert.resolution).toBe('INSPECTION_COMPLETED');
      expect(resolvedAlert.resolutionNotes).toBeTruthy();
    });

    it('should query alerts by various criteria', async () => {
      // Create multiple alerts
      await testDb.llpAlert.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
            severity: LLPAlertSeverity.CRITICAL,
            title: 'Critical Alert',
            message: 'Critical life limit warning',
            currentCycles: 950,
            currentHours: 8300,
            isActive: true,
            generatedAt: new Date()
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.INSPECTION_DUE,
            severity: LLPAlertSeverity.INFO,
            title: 'Info Alert',
            message: 'Information alert',
            currentCycles: 300,
            currentHours: 2500,
            isActive: true,
            generatedAt: new Date()
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_EXCEEDED,
            severity: LLPAlertSeverity.URGENT,
            title: 'Urgent Alert',
            message: 'Life limit exceeded',
            currentCycles: 1100,
            currentHours: 9500,
            isActive: false,
            resolvedBy: 'SUPERVISOR-001',
            generatedAt: new Date()
          }
        ]
      });

      // Query active alerts
      const activeAlerts = await testDb.llpAlert.findMany({
        where: { isActive: true }
      });
      expect(activeAlerts).toHaveLength(2);

      // Query by severity
      const criticalAlerts = await testDb.llpAlert.findMany({
        where: { severity: LLPAlertSeverity.CRITICAL }
      });
      expect(criticalAlerts).toHaveLength(1);

      // Query by alert type
      const approachingAlerts = await testDb.llpAlert.findMany({
        where: { alertType: LLPAlertType.LIFE_LIMIT_APPROACHING }
      });
      expect(approachingAlerts).toHaveLength(1);

      // Query resolved alerts
      const resolvedAlerts = await testDb.llpAlert.findMany({
        where: { isActive: false }
      });
      expect(resolvedAlerts).toHaveLength(1);
    });
  });

  describe('LLPCertification Model', () => {
    it('should create and manage certifications', async () => {
      const certification = await testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'DB-MANUF-001',
          issuingOrganization: 'Manufacturing Quality Assurance',
          issuedDate: new Date('2023-01-15'),
          expirationDate: new Date('2025-01-15'),
          certificationStandard: 'AS9100',
          documentUrl: '/api/llp/documents/db-manuf-001.pdf',
          isActive: true,
          isVerified: false,
          metadata: {
            batchNumber: 'BATCH-2023-001',
            qualityLevel: 'CRITICAL',
            inspectionResults: {
              dimensionalCheck: 'PASS',
              materialVerification: 'PASS',
              surfaceFinish: 'PASS'
            }
          }
        }
      });

      expect(certification).toBeTruthy();
      expect(certification.certificationType).toBe(LLPCertificationType.MANUFACTURING);
      expect(certification.certificationNumber).toBe('DB-MANUF-001');
      expect(certification.isActive).toBe(true);
      expect(certification.isVerified).toBe(false);
      expect(certification.metadata).toEqual(
        expect.objectContaining({
          batchNumber: 'BATCH-2023-001',
          qualityLevel: 'CRITICAL'
        })
      );
    });

    it('should handle certification verification', async () => {
      const certification = await testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.INSTALLATION,
          certificationNumber: 'DB-INSTALL-001',
          issuingOrganization: 'Certified Installation Team',
          issuedDate: new Date('2023-02-01'),
          expirationDate: new Date('2025-02-01'),
          certificationStandard: 'MIL-STD-1530',
          documentUrl: '/api/llp/documents/db-install-001.pdf',
          isActive: true,
          isVerified: false
        }
      });

      // Verify certification
      const verifiedCertification = await testDb.llpCertification.update({
        where: { id: certification.id },
        data: {
          isVerified: true,
          verifiedBy: 'QA-MANAGER-001',
          verifiedAt: new Date(),
          verificationNotes: 'Certification reviewed and verified as authentic',
          complianceStandards: ['MIL-STD-1530', 'AS9100']
        }
      });

      expect(verifiedCertification.isVerified).toBe(true);
      expect(verifiedCertification.verifiedBy).toBe('QA-MANAGER-001');
      expect(verifiedCertification.verificationNotes).toBeTruthy();
      expect(verifiedCertification.complianceStandards).toEqual(['MIL-STD-1530', 'AS9100']);
    });

    it('should enforce unique certification numbers', async () => {
      await testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'UNIQUE-CERT-001',
          issuingOrganization: 'Test Organization',
          issuedDate: new Date('2023-01-01'),
          expirationDate: new Date('2025-01-01'),
          certificationStandard: 'Test Standard',
          documentUrl: '/api/docs/unique-001.pdf',
          isActive: true
        }
      });

      // Attempt to create duplicate certification number
      await expect(testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.INSTALLATION,
          certificationNumber: 'UNIQUE-CERT-001', // Duplicate
          issuingOrganization: 'Another Organization',
          issuedDate: new Date('2023-02-01'),
          expirationDate: new Date('2025-02-01'),
          certificationStandard: 'Another Standard',
          documentUrl: '/api/docs/duplicate-001.pdf',
          isActive: true
        }
      })).rejects.toThrow();
    });

    it('should query certifications by type and status', async () => {
      // Create multiple certifications
      await testDb.llpCertification.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'DB-MANUF-002',
            issuingOrganization: 'Manufacturing QA',
            issuedDate: new Date('2023-01-15'),
            expirationDate: new Date('2025-01-15'),
            certificationStandard: 'AS9100',
            documentUrl: '/api/docs/manuf-002.pdf',
            isActive: true,
            isVerified: true
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'DB-INSTALL-002',
            issuingOrganization: 'Installation Team',
            issuedDate: new Date('2023-02-01'),
            expirationDate: new Date('2025-02-01'),
            certificationStandard: 'MIL-STD-1530',
            documentUrl: '/api/docs/install-002.pdf',
            isActive: true,
            isVerified: false
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MAINTENANCE,
            certificationNumber: 'DB-MAINT-002',
            issuingOrganization: 'Maintenance Organization',
            issuedDate: new Date('2023-08-01'),
            expirationDate: new Date('2024-02-01'), // Expiring soon
            certificationStandard: 'FAR 145',
            documentUrl: '/api/docs/maint-002.pdf',
            isActive: false, // Inactive
            isVerified: true
          }
        ]
      });

      // Query by certification type
      const manufacturingCerts = await testDb.llpCertification.findMany({
        where: { certificationType: LLPCertificationType.MANUFACTURING }
      });
      expect(manufacturingCerts).toHaveLength(1);

      // Query active certifications
      const activeCerts = await testDb.llpCertification.findMany({
        where: { isActive: true }
      });
      expect(activeCerts).toHaveLength(2);

      // Query verified certifications
      const verifiedCerts = await testDb.llpCertification.findMany({
        where: { isVerified: true }
      });
      expect(verifiedCerts).toHaveLength(2);

      // Query expiring certifications
      const expiringCerts = await testDb.llpCertification.findMany({
        where: {
          expirationDate: {
            lte: new Date('2024-06-01')
          },
          isActive: true
        }
      });
      expect(expiringCerts).toHaveLength(0); // None active and expiring by June 2024
    });

    it('should maintain relationships with serialized parts', async () => {
      await testDb.llpCertification.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'REL-MANUF-001',
            issuingOrganization: 'Manufacturing QA',
            issuedDate: new Date('2023-01-15'),
            certificationStandard: 'AS9100',
            documentUrl: '/api/docs/rel-manuf-001.pdf',
            isActive: true
          },
          {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'REL-INSTALL-001',
            issuingOrganization: 'Installation Team',
            issuedDate: new Date('2023-02-01'),
            certificationStandard: 'MIL-STD-1530',
            documentUrl: '/api/docs/rel-install-001.pdf',
            isActive: true
          }
        ]
      });

      // Query with relationship
      const serializedPartWithCertifications = await testDb.serializedPart.findUnique({
        where: { id: testSerializedPartId },
        include: {
          llpCertifications: {
            where: { isActive: true },
            orderBy: { issuedDate: 'asc' }
          }
        }
      });

      expect(serializedPartWithCertifications!.llpCertifications).toHaveLength(2);
      expect(serializedPartWithCertifications!.llpCertifications[0].certificationType)
        .toBe(LLPCertificationType.MANUFACTURING);
      expect(serializedPartWithCertifications!.llpCertifications[1].certificationType)
        .toBe(LLPCertificationType.INSTALLATION);
    });
  });

  describe('Complex Queries and Relationships', () => {
    beforeEach(async () => {
      // Create comprehensive test data
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

      await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
          severity: LLPAlertSeverity.WARNING,
          title: 'Life Limit Approaching',
          message: 'Part approaching 75% life limit',
          currentCycles: 750,
          currentHours: 6570,
          isActive: true,
          generatedAt: new Date()
        }
      });

      await testDb.llpCertification.create({
        data: {
          serializedPartId: testSerializedPartId,
          certificationType: LLPCertificationType.MANUFACTURING,
          certificationNumber: 'COMPLEX-001',
          issuingOrganization: 'Manufacturing QA',
          issuedDate: new Date('2023-01-15'),
          expirationDate: new Date('2025-01-15'),
          certificationStandard: 'AS9100',
          documentUrl: '/api/docs/complex-001.pdf',
          isActive: true,
          isVerified: true
        }
      });
    });

    it('should query complete LLP data for a serialized part', async () => {
      const completeData = await testDb.serializedPart.findUnique({
        where: { id: testSerializedPartId },
        include: {
          part: true,
          llpLifeHistory: {
            orderBy: { eventDate: 'desc' }
          },
          llpAlerts: {
            where: { isActive: true }
          },
          llpCertifications: {
            where: { isActive: true }
          }
        }
      });

      expect(completeData).toBeTruthy();
      expect(completeData!.part.isLifeLimited).toBe(true);
      expect(completeData!.llpLifeHistory).toHaveLength(2);
      expect(completeData!.llpAlerts).toHaveLength(1);
      expect(completeData!.llpCertifications).toHaveLength(1);

      // Verify ordering
      expect(completeData!.llpLifeHistory[0].eventType).toBe('OPERATION');
      expect(completeData!.llpLifeHistory[1].eventType).toBe('MANUFACTURING_COMPLETE');
    });

    it('should query fleet-wide LLP statistics', async () => {
      // Create additional parts for fleet statistics
      const additionalPart = await testDb.part.create({
        data: {
          partNumber: 'TEST-FLEET-001',
          partName: 'Fleet Test Part',
          partType: 'MANUFACTURED',
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.CONTROLLED,
          llpRetirementType: LLPRetirementType.CYCLES_ONLY,
          llpCycleLimit: 2000,
          description: 'Fleet test part'
        }
      });

      const additionalSerializedPart = await testDb.serializedPart.create({
        data: {
          partId: additionalPart.id,
          serialNumber: 'SN-FLEET-001',
          status: 'ACTIVE',
          manufacturingDate: new Date('2023-03-01'),
          location: 'Fleet Location'
        }
      });

      // Query fleet statistics
      const fleetStats = await testDb.serializedPart.findMany({
        where: {
          part: { isLifeLimited: true }
        },
        include: {
          part: {
            select: {
              llpCriticalityLevel: true,
              llpRetirementType: true,
              llpCycleLimit: true,
              llpTimeLimit: true
            }
          },
          llpAlerts: {
            where: { isActive: true },
            select: { severity: true }
          },
          _count: {
            select: {
              llpLifeHistory: true,
              llpCertifications: true
            }
          }
        }
      });

      expect(fleetStats).toHaveLength(2);

      const criticalParts = fleetStats.filter(
        sp => sp.part.llpCriticalityLevel === LLPCriticalityLevel.CRITICAL
      );
      expect(criticalParts).toHaveLength(1);

      const controlledParts = fleetStats.filter(
        sp => sp.part.llpCriticalityLevel === LLPCriticalityLevel.CONTROLLED
      );
      expect(controlledParts).toHaveLength(1);
    });

    it('should handle transaction rollback on constraint violations', async () => {
      await testDb.$transaction(async (tx) => {
        // Create certification
        await tx.llpCertification.create({
          data: {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'TRANSACTION-001',
            issuingOrganization: 'Test Org',
            issuedDate: new Date('2023-01-01'),
            certificationStandard: 'Test Standard',
            documentUrl: '/api/docs/transaction-001.pdf',
            isActive: true
          }
        });

        // This should cause the transaction to rollback due to unique constraint
        await expect(tx.llpCertification.create({
          data: {
            serializedPartId: testSerializedPartId,
            certificationType: LLPCertificationType.MAINTENANCE,
            certificationNumber: 'TRANSACTION-001', // Duplicate
            issuingOrganization: 'Test Org 2',
            issuedDate: new Date('2023-02-01'),
            certificationStandard: 'Test Standard 2',
            documentUrl: '/api/docs/transaction-002.pdf',
            isActive: true
          }
        })).rejects.toThrow();
      });

      // Verify no certifications were created due to rollback
      const certifications = await testDb.llpCertification.findMany({
        where: { certificationNumber: 'TRANSACTION-001' }
      });
      expect(certifications).toHaveLength(0);
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query by indexed fields', async () => {
      // Create large dataset for performance testing
      const parts = Array.from({ length: 10 }, (_, i) => ({
        partNumber: `PERF-PART-${String(i + 1).padStart(3, '0')}`,
        partName: `Performance Test Part ${i + 1}`,
        partType: 'MANUFACTURED' as const,
        isLifeLimited: true,
        llpCriticalityLevel: i % 2 === 0 ? LLPCriticalityLevel.CRITICAL : LLPCriticalityLevel.CONTROLLED,
        llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
        llpCycleLimit: 1000 + (i * 100),
        description: `Performance test part ${i + 1}`
      }));

      await testDb.part.createMany({ data: parts });

      const startTime = Date.now();

      // Query that should use indexes
      const criticalParts = await testDb.part.findMany({
        where: {
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.CRITICAL
        }
      });

      const queryTime = Date.now() - startTime;

      expect(criticalParts.length).toBeGreaterThan(0);
      expect(queryTime).toBeLessThan(100); // Should be fast with proper indexing
    });
  });
});