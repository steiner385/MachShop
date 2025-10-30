/**
 * Comprehensive Unit Tests for LLPService
 * Tests life tracking, back-to-birth traceability, and retirement calculations
 * for safety-critical aerospace components.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LLPService } from '@/services/LLPService';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPAlertSeverity,
  LLPCertificationType
} from '@prisma/client';

describe('LLPService', () => {
  let testDb: PrismaClient;
  let llpService: LLPService;
  let testPartId: string;
  let testSerializedPartId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    llpService = new LLPService(testDb);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await testDb.llpLifeHistory.deleteMany();
    await testDb.llpAlert.deleteMany();
    await testDb.llpCertification.deleteMany();
    await testDb.serializedPart.deleteMany();
    await testDb.part.deleteMany();

    // Create test part with LLP configuration
    const testPart = await testDb.part.create({
      data: {
        partNumber: 'TEST-LLP-001',
        partName: 'Test Life-Limited Part',
        partType: 'MANUFACTURED',
        isLifeLimited: true,
        llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
        llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
        llpCycleLimit: 1000,
        llpTimeLimit: 8760, // 1 year in hours
        llpInspectionInterval: 100,
        llpRegulatoryReference: 'FAA-AD-2024-001',
        llpCertificationRequired: true,
        llpNotes: 'Test LLP for engine turbine blade',
        description: 'Critical turbine blade with life limits'
      }
    });
    testPartId = testPart.id;

    // Create test serialized part
    const testSerializedPart = await testDb.serializedPart.create({
      data: {
        partId: testPartId,
        serialNumber: 'SN-TB-001',
        status: 'ACTIVE',
        manufacturingDate: new Date('2023-01-01'),
        location: 'Production Floor A'
      }
    });
    testSerializedPartId = testSerializedPart.id;
  });

  describe('configureLLPPart', () => {
    it('should configure LLP settings for a part', async () => {
      const config = {
        partId: testPartId,
        isLifeLimited: true,
        criticalityLevel: LLPCriticalityLevel.CRITICAL,
        retirementType: LLPRetirementType.CYCLES_ONLY,
        cycleLimit: 1500,
        regulatoryReference: 'EASA-AD-2024-002',
        certificationRequired: true,
        notes: 'Updated configuration for enhanced safety'
      };

      const result = await llpService.configureLLPPart(config);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.partId).toBe(testPartId);

      // Verify the part was updated
      const updatedPart = await testDb.part.findUnique({
        where: { id: testPartId }
      });

      expect(updatedPart).toBeTruthy();
      expect(updatedPart!.llpCycleLimit).toBe(1500);
      expect(updatedPart!.llpRetirementType).toBe(LLPRetirementType.CYCLES_ONLY);
      expect(updatedPart!.llpRegulatoryReference).toBe('EASA-AD-2024-002');
    });

    it('should validate configuration parameters', async () => {
      const invalidConfig = {
        partId: testPartId,
        isLifeLimited: true,
        criticalityLevel: LLPCriticalityLevel.CRITICAL,
        retirementType: LLPRetirementType.CYCLES_ONLY,
        cycleLimit: -100, // Invalid negative value
        certificationRequired: true
      };

      await expect(llpService.configureLLPPart(invalidConfig))
        .rejects.toThrow('Invalid cycle limit');
    });
  });

  describe('recordLifeEvent', () => {
    it('should record a manufacturing life event', async () => {
      const eventData = {
        serializedPartId: testSerializedPartId,
        eventType: 'MANUFACTURING_COMPLETE',
        eventDate: new Date('2023-01-15'),
        cyclesAtEvent: 0,
        hoursAtEvent: 0,
        performedBy: 'TEST-OPERATOR-001',
        location: 'Assembly Line 1',
        notes: 'Initial manufacturing completion',
        metadata: {
          qualityCheckPassed: true,
          assemblyRevision: 'REV-A'
        }
      };

      const eventId = await llpService.recordLifeEvent(eventData);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');

      // Verify the event was recorded
      const recordedEvent = await testDb.llpLifeHistory.findUnique({
        where: { id: eventId }
      });

      expect(recordedEvent).toBeTruthy();
      expect(recordedEvent!.eventType).toBe('MANUFACTURING_COMPLETE');
      expect(recordedEvent!.cyclesAtEvent).toBe(0);
      expect(recordedEvent!.performedBy).toBe('TEST-OPERATOR-001');
    });

    it('should record an installation event with parent assembly', async () => {
      const eventData = {
        serializedPartId: testSerializedPartId,
        eventType: 'INSTALLATION',
        eventDate: new Date('2023-02-01'),
        cyclesAtEvent: 0,
        hoursAtEvent: 0,
        parentAssemblyId: 'ENGINE-ASSEMBLY-001',
        parentSerialNumber: 'ENG-SN-12345',
        workOrderId: 'WO-INSTALL-001',
        performedBy: 'MECHANIC-001',
        location: 'Engine Assembly Bay',
        notes: 'Initial installation in engine',
        certificationUrls: ['/certs/install-cert-001.pdf']
      };

      const eventId = await llpService.recordLifeEvent(eventData);

      expect(eventId).toBeDefined();

      const recordedEvent = await testDb.llpLifeHistory.findUnique({
        where: { id: eventId }
      });

      expect(recordedEvent!.parentAssemblyId).toBe('ENGINE-ASSEMBLY-001');
      expect(recordedEvent!.parentSerialNumber).toBe('ENG-SN-12345');
      expect(recordedEvent!.certificationUrls).toEqual(['/certs/install-cert-001.pdf']);
    });

    it('should validate event data integrity', async () => {
      const invalidEventData = {
        serializedPartId: 'INVALID-PART-ID',
        eventType: 'INSTALLATION',
        eventDate: new Date(),
        cyclesAtEvent: -50, // Invalid negative cycles
        performedBy: 'TEST-OPERATOR'
      };

      await expect(llpService.recordLifeEvent(invalidEventData))
        .rejects.toThrow();
    });
  });

  describe('calculateLifeStatus', () => {
    beforeEach(async () => {
      // Create baseline life events
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
            performedBy: 'MECHANIC-001',
            location: 'Assembly'
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'OPERATION',
            eventDate: new Date('2023-06-01'),
            cyclesAtEvent: 500,
            hoursAtEvent: 4380, // 6 months
            performedBy: 'SYSTEM',
            location: 'In Service'
          }
        ]
      });
    });

    it('should calculate current life status correctly', async () => {
      const lifeStatus = await llpService.calculateLifeStatus(testSerializedPartId);

      expect(lifeStatus).toBeDefined();
      expect(lifeStatus.currentCycles).toBe(500);
      expect(lifeStatus.currentHours).toBe(4380);
      expect(lifeStatus.overallPercentageUsed).toBe(50.0); // 500/1000 cycles
      expect(lifeStatus.status).toBe('ACTIVE');
      expect(lifeStatus.alertLevel).toBe(LLPAlertSeverity.INFO);
    });

    it('should detect approaching retirement limits', async () => {
      // Add more cycle usage to approach limit
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2023-12-01'),
          cyclesAtEvent: 950, // 95% of limit
          hoursAtEvent: 8300,
          performedBy: 'SYSTEM',
          location: 'In Service'
        }
      });

      const lifeStatus = await llpService.calculateLifeStatus(testSerializedPartId);

      expect(lifeStatus.overallPercentageUsed).toBe(95.0);
      expect(lifeStatus.alertLevel).toBe(LLPAlertSeverity.CRITICAL);
      expect(lifeStatus.retirementDue).toBeDefined();
      expect(lifeStatus.daysUntilRetirement).toBeLessThan(100);
    });

    it('should handle parts exceeding life limits', async () => {
      // Add event that exceeds limits
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2024-06-01'),
          cyclesAtEvent: 1100, // Exceeds 1000 cycle limit
          hoursAtEvent: 9500,  // Exceeds 8760 hour limit
          performedBy: 'SYSTEM',
          location: 'In Service'
        }
      });

      const lifeStatus = await llpService.calculateLifeStatus(testSerializedPartId);

      expect(lifeStatus.overallPercentageUsed).toBeGreaterThan(100);
      expect(lifeStatus.alertLevel).toBe(LLPAlertSeverity.URGENT);
      expect(lifeStatus.status).toBe('EXCEEDED_LIMITS');
      expect(lifeStatus.retirementRequired).toBe(true);
    });
  });

  describe('getBackToBirthTrace', () => {
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
            location: 'Manufacturing Plant A',
            notes: 'Initial manufacturing',
            metadata: { batchNumber: 'BATCH-2023-001' }
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'QUALITY_INSPECTION',
            eventDate: new Date('2023-01-16'),
            cyclesAtEvent: 0,
            hoursAtEvent: 0,
            performedBy: 'QC-INSPECTOR-001',
            location: 'Quality Lab',
            notes: 'Passed dimensional inspection',
            inspectionResults: { dimensionalCheck: 'PASS', surfaceFinish: 'PASS' }
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'INSTALLATION',
            eventDate: new Date('2023-02-01'),
            cyclesAtEvent: 0,
            hoursAtEvent: 0,
            parentAssemblyId: 'ENGINE-001',
            parentSerialNumber: 'ENG-12345',
            workOrderId: 'WO-001',
            performedBy: 'MECHANIC-001',
            location: 'Assembly Line 1'
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'MAINTENANCE',
            eventDate: new Date('2023-08-01'),
            cyclesAtEvent: 400,
            hoursAtEvent: 3500,
            workOrderId: 'WO-MAINT-001',
            performedBy: 'MECHANIC-002',
            location: 'Maintenance Hangar B',
            notes: 'Routine inspection and cleaning'
          }
        ]
      });
    });

    it('should provide complete back-to-birth traceability', async () => {
      const trace = await llpService.getBackToBirthTrace(testSerializedPartId);

      expect(trace).toBeDefined();
      expect(trace.serializedPartId).toBe(testSerializedPartId);
      expect(trace.partDetails).toBeTruthy();
      expect(trace.manufacturingHistory).toHaveLength(1);
      expect(trace.installationHistory).toHaveLength(1);
      expect(trace.maintenanceHistory).toHaveLength(1);
      expect(trace.qualityHistory).toHaveLength(1);
      expect(trace.currentStatus).toBeTruthy();

      // Verify chronological ordering
      const allEvents = [
        ...trace.manufacturingHistory,
        ...trace.qualityHistory,
        ...trace.installationHistory,
        ...trace.maintenanceHistory
      ].sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());

      expect(allEvents[0].eventType).toBe('MANUFACTURING_COMPLETE');
      expect(allEvents[allEvents.length - 1].eventType).toBe('MAINTENANCE');
    });

    it('should include parent assembly information', async () => {
      const trace = await llpService.getBackToBirthTrace(testSerializedPartId);

      const installEvent = trace.installationHistory[0];
      expect(installEvent.parentAssemblyId).toBe('ENGINE-001');
      expect(installEvent.parentSerialNumber).toBe('ENG-12345');
      expect(installEvent.workOrderId).toBe('WO-001');
    });

    it('should handle parts with no history gracefully', async () => {
      // Create a new part with no history
      const newSerializedPart = await testDb.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'SN-NO-HISTORY',
          status: 'ACTIVE',
          manufacturingDate: new Date(),
          location: 'Storage'
        }
      });

      const trace = await llpService.getBackToBirthTrace(newSerializedPart.id);

      expect(trace.manufacturingHistory).toHaveLength(0);
      expect(trace.installationHistory).toHaveLength(0);
      expect(trace.maintenanceHistory).toHaveLength(0);
      expect(trace.qualityHistory).toHaveLength(0);
    });
  });

  describe('retireLLP', () => {
    it('should successfully retire an LLP with proper documentation', async () => {
      const retirementData = {
        serializedPartId: testSerializedPartId,
        retirementDate: new Date('2024-01-01'),
        retirementCycles: 1000,
        retirementReason: 'Reached cycle limit',
        disposition: 'SCRAP' as const,
        performedBy: 'SUPERVISOR-001',
        location: 'Retirement Facility',
        notes: 'Part retired due to reaching maximum cycle limit'
      };

      const retirementId = await llpService.retireLLP(retirementData);

      expect(retirementId).toBeDefined();

      // Verify retirement was recorded
      const retirementRecord = await testDb.llpLifeHistory.findUnique({
        where: { id: retirementId }
      });

      expect(retirementRecord).toBeTruthy();
      expect(retirementRecord!.eventType).toBe('RETIREMENT');
      expect(retirementRecord!.cyclesAtEvent).toBe(1000);

      // Verify serialized part status was updated
      const updatedPart = await testDb.serializedPart.findUnique({
        where: { id: testSerializedPartId }
      });

      expect(updatedPart!.status).toBe('RETIRED');
    });

    it('should validate retirement data', async () => {
      const invalidRetirementData = {
        serializedPartId: testSerializedPartId,
        retirementDate: new Date('2024-01-01'),
        retirementCycles: -100, // Invalid negative cycles
        retirementReason: 'Test retirement',
        disposition: 'SCRAP' as const,
        performedBy: 'SUPERVISOR-001',
        location: 'Test Location'
      };

      await expect(llpService.retireLLP(invalidRetirementData))
        .rejects.toThrow('Invalid retirement cycles');
    });

    it('should prevent retirement of already retired parts', async () => {
      // First retirement
      const retirementData = {
        serializedPartId: testSerializedPartId,
        retirementDate: new Date('2024-01-01'),
        retirementCycles: 1000,
        retirementReason: 'First retirement',
        disposition: 'SCRAP' as const,
        performedBy: 'SUPERVISOR-001',
        location: 'Facility'
      };

      await llpService.retireLLP(retirementData);

      // Attempt second retirement
      const secondRetirementData = {
        ...retirementData,
        retirementReason: 'Second retirement attempt'
      };

      await expect(llpService.retireLLP(secondRetirementData))
        .rejects.toThrow('Part is already retired');
    });
  });

  describe('generateFleetReport', () => {
    beforeEach(async () => {
      // Create additional test parts for fleet reporting
      await testDb.part.createMany({
        data: [
          {
            partNumber: 'TEST-LLP-002',
            partName: 'Test Blade 2',
            partType: 'MANUFACTURED',
            isLifeLimited: true,
            llpCriticalityLevel: LLPCriticalityLevel.CONTROLLED,
            llpRetirementType: LLPRetirementType.TIME_ONLY,
            llpTimeLimit: 4380,
            description: 'Secondary test blade'
          },
          {
            partNumber: 'TEST-LLP-003',
            partName: 'Test Disk',
            partType: 'MANUFACTURED',
            isLifeLimited: true,
            llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
            llpRetirementType: LLPRetirementType.CYCLES_ONLY,
            llpCycleLimit: 2000,
            description: 'Critical disk component'
          }
        ]
      });
    });

    it('should generate comprehensive fleet status report', async () => {
      const report = await llpService.generateFleetReport();

      expect(report).toBeDefined();
      expect(report.totalLLPs).toBeGreaterThan(0);
      expect(report.partsByCategory).toBeInstanceOf(Array);
      expect(report.complianceIssues).toBeInstanceOf(Array);
      expect(report.retirementsNext30Days).toBeGreaterThanOrEqual(0);
      expect(report.retirementsNext90Days).toBeGreaterThanOrEqual(0);
      expect(typeof report.generatedAt).toBe('object');
      expect(report.generatedAt instanceof Date).toBe(true);
    });

    it('should categorize parts by criticality level', async () => {
      const report = await llpService.generateFleetReport();

      const criticalParts = report.partsByCategory.filter(
        cat => cat.criticalityLevel === LLPCriticalityLevel.CRITICAL
      );

      const controlledParts = report.partsByCategory.filter(
        cat => cat.criticalityLevel === LLPCriticalityLevel.CONTROLLED
      );

      expect(criticalParts.length).toBeGreaterThan(0);
      expect(controlledParts.length).toBeGreaterThan(0);
    });
  });

  describe('batchProcessLifeEvents', () => {
    it('should process multiple life events in batch', async () => {
      const events = [
        {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2023-03-01'),
          cyclesAtEvent: 100,
          hoursAtEvent: 900,
          performedBy: 'SYSTEM',
          location: 'In Service'
        },
        {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2023-04-01'),
          cyclesAtEvent: 200,
          hoursAtEvent: 1800,
          performedBy: 'SYSTEM',
          location: 'In Service'
        },
        {
          serializedPartId: testSerializedPartId,
          eventType: 'MAINTENANCE',
          eventDate: new Date('2023-05-01'),
          cyclesAtEvent: 250,
          hoursAtEvent: 2200,
          performedBy: 'MECHANIC-001',
          location: 'Maintenance Bay'
        }
      ];

      const results = await llpService.batchProcessLifeEvents(events);

      expect(results).toBeDefined();
      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
      expect(results.totalProcessed).toBe(3);

      // Verify events were recorded
      const recordedEvents = await testDb.llpLifeHistory.findMany({
        where: { serializedPartId: testSerializedPartId }
      });

      expect(recordedEvents).toHaveLength(3);
    });

    it('should handle mixed success and failure in batch processing', async () => {
      const events = [
        {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2023-03-01'),
          cyclesAtEvent: 100,
          hoursAtEvent: 900,
          performedBy: 'SYSTEM',
          location: 'In Service'
        },
        {
          serializedPartId: 'INVALID-ID',
          eventType: 'OPERATION',
          eventDate: new Date('2023-04-01'),
          cyclesAtEvent: 200,
          hoursAtEvent: 1800,
          performedBy: 'SYSTEM',
          location: 'In Service'
        }
      ];

      const results = await llpService.batchProcessLifeEvents(events);

      expect(results.successful).toHaveLength(1);
      expect(results.failed).toHaveLength(1);
      expect(results.totalProcessed).toBe(2);
      expect(results.failed[0].error).toBeDefined();
    });
  });

  describe('getLLPConfiguration', () => {
    it('should retrieve LLP configuration for a part', async () => {
      const config = await llpService.getLLPConfiguration(testPartId);

      expect(config).toBeTruthy();
      expect(config!.partId).toBe(testPartId);
      expect(config!.isLifeLimited).toBe(true);
      expect(config!.criticalityLevel).toBe(LLPCriticalityLevel.CRITICAL);
      expect(config!.cycleLimit).toBe(1000);
      expect(config!.timeLimit).toBe(8760);
    });

    it('should return null for non-existent part', async () => {
      const config = await llpService.getLLPConfiguration('NON-EXISTENT-ID');
      expect(config).toBeNull();
    });

    it('should return null for non-LLP part', async () => {
      const nonLLPPart = await testDb.part.create({
        data: {
          partNumber: 'NON-LLP-001',
          partName: 'Non Life-Limited Part',
          partType: 'PURCHASED',
          isLifeLimited: false,
          description: 'Regular part without life limits'
        }
      });

      const config = await llpService.getLLPConfiguration(nonLLPPart.id);
      expect(config).toBeNull();
    });
  });
});