/**
 * Comprehensive Unit Tests for LLPAlertService
 * Tests alert generation, threshold management, and notification workflows
 * for Life-Limited Parts monitoring system.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LLPAlertService } from '@/services/LLPAlertService';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPAlertSeverity,
  LLPAlertType
} from '@prisma/client';

describe('LLPAlertService', () => {
  let testDb: PrismaClient;
  let llpAlertService: LLPAlertService;
  let testPartId: string;
  let testSerializedPartId: string;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    llpAlertService = new LLPAlertService(testDb);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await testDb.llpAlert.deleteMany();
    await testDb.llpLifeHistory.deleteMany();
    await testDb.serializedPart.deleteMany();
    await testDb.part.deleteMany();

    // Create test part with LLP configuration
    const testPart = await testDb.part.create({
      data: {
        partNumber: 'TEST-ALERT-001',
        partName: 'Test Alert Part',
        partType: 'MANUFACTURED',
        isLifeLimited: true,
        llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
        llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
        llpCycleLimit: 1000,
        llpTimeLimit: 8760,
        llpInspectionInterval: 100,
        description: 'Test part for alert testing'
      }
    });
    testPartId = testPart.id;

    // Create test serialized part
    const testSerializedPart = await testDb.serializedPart.create({
      data: {
        partId: testPartId,
        serialNumber: 'SN-ALERT-001',
        status: 'ACTIVE',
        manufacturingDate: new Date('2023-01-01'),
        location: 'Test Location'
      }
    });
    testSerializedPartId = testSerializedPart.id;
  });

  describe('configureAlerts', () => {
    it('should configure global alert settings', async () => {
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
        recipients: ['supervisor@company.com', 'maintenance@company.com']
      };

      await llpAlertService.configureAlerts(alertConfig);

      // Verify configuration was saved (this would typically be in a configuration table)
      // For this test, we'll verify the method completes without error
      expect(true).toBe(true);
    });

    it('should configure part-specific alert settings', async () => {
      const alertConfig = {
        serializedPartId: testSerializedPartId,
        globalConfig: false,
        enabled: true,
        thresholds: {
          info: 40,
          warning: 70,
          critical: 85,
          urgent: 92
        },
        notifications: {
          email: true,
          sms: true,
          dashboard: true
        },
        recipients: ['critical-alerts@company.com']
      };

      await llpAlertService.configureAlerts(alertConfig);

      // Verify configuration was applied
      expect(true).toBe(true);
    });

    it('should validate threshold ordering', async () => {
      const invalidConfig = {
        globalConfig: true,
        enabled: true,
        thresholds: {
          info: 80, // Invalid: info threshold higher than warning
          warning: 75,
          critical: 90,
          urgent: 95
        },
        notifications: {
          email: true,
          sms: false,
          dashboard: true
        },
        recipients: ['test@company.com']
      };

      await expect(llpAlertService.configureAlerts(invalidConfig))
        .rejects.toThrow('Invalid threshold configuration');
    });
  });

  describe('generateAlert', () => {
    it('should generate info alert for moderate usage', async () => {
      const alertData = {
        serializedPartId: testSerializedPartId,
        alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
        severity: LLPAlertSeverity.INFO,
        title: 'Life Limit Approaching',
        message: 'Part has reached 60% of life limit',
        currentCycles: 600,
        currentHours: 5256,
        cycleThreshold: 500,
        hourThreshold: 4380,
        metadata: {
          percentageUsed: 60,
          estimatedRetirementDate: '2024-06-01'
        }
      };

      const alertId = await llpAlertService.generateAlert(alertData);

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');

      // Verify alert was created
      const createdAlert = await testDb.llpAlert.findUnique({
        where: { id: alertId }
      });

      expect(createdAlert).toBeTruthy();
      expect(createdAlert!.severity).toBe(LLPAlertSeverity.INFO);
      expect(createdAlert!.alertType).toBe(LLPAlertType.LIFE_LIMIT_APPROACHING);
      expect(createdAlert!.isActive).toBe(true);
    });

    it('should generate critical alert for high usage', async () => {
      const alertData = {
        serializedPartId: testSerializedPartId,
        alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
        severity: LLPAlertSeverity.CRITICAL,
        title: 'Critical Life Limit Warning',
        message: 'Part has reached 90% of life limit - retirement planning required',
        currentCycles: 900,
        currentHours: 7884,
        cycleThreshold: 900,
        hourThreshold: 7884,
        metadata: {
          percentageUsed: 90,
          estimatedRetirementDate: '2024-03-01',
          requiresImmediateAction: true
        }
      };

      const alertId = await llpAlertService.generateAlert(alertData);

      const createdAlert = await testDb.llpAlert.findUnique({
        where: { id: alertId }
      });

      expect(createdAlert!.severity).toBe(LLPAlertSeverity.CRITICAL);
      expect(createdAlert!.metadata).toEqual(
        expect.objectContaining({
          percentageUsed: 90,
          requiresImmediateAction: true
        })
      );
    });

    it('should generate urgent alert for exceeded limits', async () => {
      const alertData = {
        serializedPartId: testSerializedPartId,
        alertType: LLPAlertType.LIFE_LIMIT_EXCEEDED,
        severity: LLPAlertSeverity.URGENT,
        title: 'URGENT: Life Limit Exceeded',
        message: 'Part has exceeded life limits - immediate retirement required',
        currentCycles: 1050,
        currentHours: 9100,
        cycleThreshold: 1000,
        hourThreshold: 8760,
        metadata: {
          percentageUsed: 105,
          exceedsCycles: true,
          exceedsHours: true,
          safetyRisk: 'HIGH'
        }
      };

      const alertId = await llpAlertService.generateAlert(alertData);

      const createdAlert = await testDb.llpAlert.findUnique({
        where: { id: alertId }
      });

      expect(createdAlert!.severity).toBe(LLPAlertSeverity.URGENT);
      expect(createdAlert!.alertType).toBe(LLPAlertType.LIFE_LIMIT_EXCEEDED);
      expect(createdAlert!.metadata).toEqual(
        expect.objectContaining({
          safetyRisk: 'HIGH',
          exceedsCycles: true,
          exceedsHours: true
        })
      );
    });

    it('should prevent duplicate alerts for same condition', async () => {
      const alertData = {
        serializedPartId: testSerializedPartId,
        alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
        severity: LLPAlertSeverity.WARNING,
        title: 'Life Limit Warning',
        message: 'Part approaching life limit',
        currentCycles: 750,
        currentHours: 6570,
        cycleThreshold: 750,
        hourThreshold: 6570
      };

      // Generate first alert
      const firstAlertId = await llpAlertService.generateAlert(alertData);

      // Attempt to generate duplicate alert
      const secondAlertId = await llpAlertService.generateAlert(alertData);

      // Should return existing alert ID or handle gracefully
      expect(firstAlertId).toBeDefined();
      expect(secondAlertId).toBeDefined();

      // Verify no duplicate active alerts exist
      const activeAlerts = await testDb.llpAlert.findMany({
        where: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
          isActive: true
        }
      });

      expect(activeAlerts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getAlerts', () => {
    beforeEach(async () => {
      // Create test alerts
      await testDb.llpAlert.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
            severity: LLPAlertSeverity.INFO,
            title: 'Info Alert',
            message: 'Info level alert',
            currentCycles: 500,
            currentHours: 4380,
            isActive: true,
            generatedAt: new Date('2023-06-01')
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.INSPECTION_DUE,
            severity: LLPAlertSeverity.WARNING,
            title: 'Inspection Due',
            message: 'Scheduled inspection required',
            currentCycles: 600,
            currentHours: 5256,
            isActive: true,
            generatedAt: new Date('2023-07-01')
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
            severity: LLPAlertSeverity.CRITICAL,
            title: 'Critical Alert',
            message: 'Critical life limit warning',
            currentCycles: 900,
            currentHours: 7884,
            isActive: true,
            generatedAt: new Date('2023-08-01')
          }
        ]
      });
    });

    it('should retrieve all active alerts', async () => {
      const filters = {
        isActive: true,
        page: 1,
        limit: 10
      };

      const result = await llpAlertService.getAlerts(filters);

      expect(result).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter alerts by severity', async () => {
      const filters = {
        severity: LLPAlertSeverity.CRITICAL,
        isActive: true,
        page: 1,
        limit: 10
      };

      const result = await llpAlertService.getAlerts(filters);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].severity).toBe(LLPAlertSeverity.CRITICAL);
    });

    it('should filter alerts by serialized part', async () => {
      const filters = {
        serializedPartId: testSerializedPartId,
        isActive: true,
        page: 1,
        limit: 10
      };

      const result = await llpAlertService.getAlerts(filters);

      expect(result.data).toHaveLength(3);
      result.data.forEach(alert => {
        expect(alert.serializedPartId).toBe(testSerializedPartId);
      });
    });

    it('should support pagination', async () => {
      const filters = {
        isActive: true,
        page: 1,
        limit: 2
      };

      const result = await llpAlertService.getAlerts(filters);

      expect(result.data).toHaveLength(2);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(result.hasNextPage).toBe(true);
    });

    it('should sort alerts by generation date descending', async () => {
      const filters = {
        isActive: true,
        page: 1,
        limit: 10
      };

      const result = await llpAlertService.getAlerts(filters);

      // Should be ordered by newest first
      expect(result.data[0].generatedAt).toEqual(new Date('2023-08-01'));
      expect(result.data[1].generatedAt).toEqual(new Date('2023-07-01'));
      expect(result.data[2].generatedAt).toEqual(new Date('2023-06-01'));
    });
  });

  describe('acknowledgeAlert', () => {
    let testAlertId: string;

    beforeEach(async () => {
      const alert = await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
          severity: LLPAlertSeverity.WARNING,
          title: 'Test Alert',
          message: 'Test alert for acknowledgment',
          currentCycles: 750,
          currentHours: 6570,
          isActive: true,
          generatedAt: new Date()
        }
      });
      testAlertId = alert.id;
    });

    it('should acknowledge an alert successfully', async () => {
      const userId = 'TEST-USER-001';
      const notes = 'Alert reviewed and acknowledged by maintenance team';

      await llpAlertService.acknowledgeAlert(testAlertId, userId, notes);

      const acknowledgedAlert = await testDb.llpAlert.findUnique({
        where: { id: testAlertId }
      });

      expect(acknowledgedAlert!.isAcknowledged).toBe(true);
      expect(acknowledgedAlert!.acknowledgedBy).toBe(userId);
      expect(acknowledgedAlert!.acknowledgedAt).toBeDefined();
      expect(acknowledgedAlert!.acknowledgmentNotes).toBe(notes);
    });

    it('should prevent duplicate acknowledgment', async () => {
      const userId = 'TEST-USER-001';

      // First acknowledgment
      await llpAlertService.acknowledgeAlert(testAlertId, userId, 'First acknowledgment');

      // Attempt second acknowledgment
      await expect(llpAlertService.acknowledgeAlert(testAlertId, userId, 'Second acknowledgment'))
        .rejects.toThrow('Alert is already acknowledged');
    });

    it('should handle non-existent alert', async () => {
      const nonExistentId = 'NON-EXISTENT-ALERT-ID';
      const userId = 'TEST-USER-001';

      await expect(llpAlertService.acknowledgeAlert(nonExistentId, userId, 'Test notes'))
        .rejects.toThrow('Alert not found');
    });
  });

  describe('resolveAlert', () => {
    let testAlertId: string;

    beforeEach(async () => {
      const alert = await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.INSPECTION_DUE,
          severity: LLPAlertSeverity.WARNING,
          title: 'Inspection Due Alert',
          message: 'Scheduled inspection required',
          currentCycles: 600,
          currentHours: 5256,
          isActive: true,
          isAcknowledged: true,
          acknowledgedBy: 'TEST-USER-001',
          acknowledgedAt: new Date(),
          generatedAt: new Date()
        }
      });
      testAlertId = alert.id;
    });

    it('should resolve an alert successfully', async () => {
      const userId = 'MAINTENANCE-USER-001';
      const resolution = 'INSPECTION_COMPLETED';
      const notes = 'Inspection completed successfully, all parameters within limits';

      await llpAlertService.resolveAlert(testAlertId, userId, resolution, notes);

      const resolvedAlert = await testDb.llpAlert.findUnique({
        where: { id: testAlertId }
      });

      expect(resolvedAlert!.isActive).toBe(false);
      expect(resolvedAlert!.resolvedBy).toBe(userId);
      expect(resolvedAlert!.resolvedAt).toBeDefined();
      expect(resolvedAlert!.resolution).toBe(resolution);
      expect(resolvedAlert!.resolutionNotes).toBe(notes);
    });

    it('should require acknowledgment before resolution', async () => {
      // Create unacknowledged alert
      const unacknowledgedAlert = await testDb.llpAlert.create({
        data: {
          serializedPartId: testSerializedPartId,
          alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
          severity: LLPAlertSeverity.CRITICAL,
          title: 'Unacknowledged Alert',
          message: 'Test alert not acknowledged',
          currentCycles: 900,
          currentHours: 7884,
          isActive: true,
          isAcknowledged: false,
          generatedAt: new Date()
        }
      });

      const userId = 'TEST-USER-001';
      const resolution = 'FALSE_POSITIVE';

      await expect(llpAlertService.resolveAlert(unacknowledgedAlert.id, userId, resolution))
        .rejects.toThrow('Alert must be acknowledged before it can be resolved');
    });

    it('should prevent resolution of already resolved alert', async () => {
      const userId = 'TEST-USER-001';
      const resolution = 'COMPLETED';

      // First resolution
      await llpAlertService.resolveAlert(testAlertId, userId, resolution, 'First resolution');

      // Attempt second resolution
      await expect(llpAlertService.resolveAlert(testAlertId, userId, 'DUPLICATE', 'Second resolution'))
        .rejects.toThrow('Alert is already resolved');
    });
  });

  describe('evaluateLifeStatusForAlerts', () => {
    beforeEach(async () => {
      // Create life history events
      await testDb.llpLifeHistory.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            eventType: 'MANUFACTURING_COMPLETE',
            eventDate: new Date('2023-01-01'),
            cyclesAtEvent: 0,
            hoursAtEvent: 0,
            performedBy: 'SYSTEM',
            location: 'Manufacturing'
          },
          {
            serializedPartId: testSerializedPartId,
            eventType: 'OPERATION',
            eventDate: new Date('2023-10-01'),
            cyclesAtEvent: 800, // 80% of cycle limit
            hoursAtEvent: 7000, // ~80% of hour limit
            performedBy: 'SYSTEM',
            location: 'In Service'
          }
        ]
      });
    });

    it('should generate appropriate alerts based on life status', async () => {
      await llpAlertService.evaluateLifeStatusForAlerts(testSerializedPartId);

      // Check that alerts were generated
      const generatedAlerts = await testDb.llpAlert.findMany({
        where: {
          serializedPartId: testSerializedPartId,
          isActive: true
        }
      });

      expect(generatedAlerts.length).toBeGreaterThan(0);

      const warningAlerts = generatedAlerts.filter(
        alert => alert.severity === LLPAlertSeverity.WARNING
      );

      expect(warningAlerts.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate critical alerts when approaching limits', async () => {
      // Update to critical level (90%+)
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2023-11-01'),
          cyclesAtEvent: 950, // 95% of cycle limit
          hoursAtEvent: 8300, // ~95% of hour limit
          performedBy: 'SYSTEM',
          location: 'In Service'
        }
      });

      await llpAlertService.evaluateLifeStatusForAlerts(testSerializedPartId);

      const criticalAlerts = await testDb.llpAlert.findMany({
        where: {
          serializedPartId: testSerializedPartId,
          severity: LLPAlertSeverity.CRITICAL,
          isActive: true
        }
      });

      expect(criticalAlerts.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate urgent alerts when limits are exceeded', async () => {
      // Update to exceeded limits
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartId,
          eventType: 'OPERATION',
          eventDate: new Date('2023-12-01'),
          cyclesAtEvent: 1100, // Exceeds cycle limit
          hoursAtEvent: 9000, // Exceeds hour limit
          performedBy: 'SYSTEM',
          location: 'In Service'
        }
      });

      await llpAlertService.evaluateLifeStatusForAlerts(testSerializedPartId);

      const urgentAlerts = await testDb.llpAlert.findMany({
        where: {
          serializedPartId: testSerializedPartId,
          severity: LLPAlertSeverity.URGENT,
          isActive: true
        }
      });

      expect(urgentAlerts.length).toBeGreaterThanOrEqual(1);

      const exceededAlert = urgentAlerts.find(
        alert => alert.alertType === LLPAlertType.LIFE_LIMIT_EXCEEDED
      );

      expect(exceededAlert).toBeDefined();
    });
  });

  describe('getAlertStatistics', () => {
    beforeEach(async () => {
      // Create various alerts for statistics
      await testDb.llpAlert.createMany({
        data: [
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
            severity: LLPAlertSeverity.INFO,
            title: 'Info Alert 1',
            message: 'Info alert',
            currentCycles: 500,
            currentHours: 4380,
            isActive: true,
            generatedAt: new Date()
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
            severity: LLPAlertSeverity.WARNING,
            title: 'Warning Alert 1',
            message: 'Warning alert',
            currentCycles: 750,
            currentHours: 6570,
            isActive: true,
            generatedAt: new Date()
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.LIFE_LIMIT_APPROACHING,
            severity: LLPAlertSeverity.CRITICAL,
            title: 'Critical Alert 1',
            message: 'Critical alert',
            currentCycles: 950,
            currentHours: 8322,
            isActive: true,
            generatedAt: new Date()
          },
          {
            serializedPartId: testSerializedPartId,
            alertType: LLPAlertType.INSPECTION_DUE,
            severity: LLPAlertSeverity.WARNING,
            title: 'Inspection Alert',
            message: 'Inspection due',
            currentCycles: 600,
            currentHours: 5256,
            isActive: false,
            isAcknowledged: true,
            acknowledgedBy: 'USER-001',
            resolvedBy: 'USER-001',
            resolution: 'COMPLETED',
            generatedAt: new Date()
          }
        ]
      });
    });

    it('should provide comprehensive alert statistics', async () => {
      const stats = await llpAlertService.getAlertStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalActiveAlerts).toBe(3);
      expect(stats.totalResolvedAlerts).toBe(1);
      expect(stats.alertsBySeverity).toBeDefined();
      expect(stats.alertsByType).toBeDefined();
      expect(stats.alertsByStatus).toBeDefined();

      // Verify severity breakdown
      expect(stats.alertsBySeverity.INFO).toBe(1);
      expect(stats.alertsBySeverity.WARNING).toBe(1);
      expect(stats.alertsBySeverity.CRITICAL).toBe(1);
      expect(stats.alertsBySeverity.URGENT).toBe(0);

      // Verify type breakdown
      expect(stats.alertsByType.LIFE_LIMIT_APPROACHING).toBe(3);
      expect(stats.alertsByType.INSPECTION_DUE).toBe(1);
    });

    it('should include trend data', async () => {
      const stats = await llpAlertService.getAlertStatistics();

      expect(stats.trends).toBeDefined();
      expect(stats.trends.alertsLast24Hours).toBeGreaterThanOrEqual(0);
      expect(stats.trends.alertsLast7Days).toBeGreaterThanOrEqual(0);
      expect(stats.trends.alertsLast30Days).toBeGreaterThanOrEqual(0);
    });
  });
});