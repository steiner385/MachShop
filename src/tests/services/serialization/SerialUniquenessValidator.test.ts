/**
 * Serial Uniqueness Validator Tests
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 6: Serial Uniqueness Validation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import SerialUniquenessValidator from '../../../services/serialization/SerialUniquenessValidator';

describe('SerialUniquenessValidator', () => {
  let prisma: PrismaClient;
  let service: SerialUniquenessValidator;
  let testPartId: string;
  let testSiteId: string;
  let testSerialId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new SerialUniquenessValidator(prisma);

    // Create test site with unique code
    const uniqueSiteCode = `SUV-${Date.now()}`;
    const site = await prisma.site.create({
      data: {
        siteCode: uniqueSiteCode,
        siteName: 'Serial Uniqueness Validator Test Site',
        location: '123 Test St',
      },
    });
    testSiteId = site.id;

    // Create test part with unique part number
    const uniquePartNumber = `PART-SUV-${Date.now()}`;
    const part = await prisma.part.create({
      data: {
        partNumber: uniquePartNumber,
        partName: 'Test Part for Serial Uniqueness',
        description: 'Test Part for Serial Uniqueness',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        revision: '1.0',
      },
    });
    testPartId = part.id;

    // Create test serial
    const serial = await prisma.serializedPart.create({
      data: {
        partId: testPartId,
        serialNumber: 'UNIQUE-001',
        status: 'ACTIVE',
      },
    });
    testSerialId = serial.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.serialAssignmentAudit.deleteMany({ where: { partId: testPartId } });
    await prisma.serialUniquenessScope.deleteMany({ where: { partId: testPartId } });
    await prisma.serializedPart.deleteMany({ where: { partId: testPartId } });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.$disconnect();
  });

  describe('Uniqueness Check', () => {
    it('should detect unique serial', async () => {
      const result = await service.checkUniqueness({
        serialNumber: 'UNIQUE-NEW-SERIAL',
        partId: testPartId,
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflictingSerialIds.length).toBe(0);
      expect(result.conflictingScopes.length).toBe(0);
    });

    it('should detect duplicate within part', async () => {
      // Create another serial with same number
      await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'DUPLICATE-SERIAL',
          status: 'ACTIVE',
        },
      });

      const result = await service.checkUniqueness({
        serialNumber: 'DUPLICATE-SERIAL',
        partId: testPartId,
      });

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingSerialIds.length).toBeGreaterThan(0);
    });

    it('should check multiple scopes', async () => {
      const result = await service.checkUniqueness({
        serialNumber: 'SCOPE-TEST',
        partId: testPartId,
        scope: ['SITE', 'ENTERPRISE', 'PART_TYPE'],
      });

      expect(result.hasConflict).toBe(false);
      expect(Array.isArray(result.conflictingScopes)).toBe(true);
    });

    it('should fail with non-existent part', async () => {
      await expect(
        service.checkUniqueness({
          serialNumber: 'TEST-SERIAL',
          partId: 'INVALID-PART',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('Register Serial Uniqueness', () => {
    it('should register serial in uniqueness scopes', async () => {
      const result = await service.registerSerialUniqueness(
        'REGISTERED-SERIAL',
        testPartId
      );

      expect(result).toBeDefined();
      expect(result.serialNumber).toBe('REGISTERED-SERIAL');
      expect(result.partId).toBe(testPartId);
      expect(result.hasConflict).toBe(false);
    });

    it('should register with specific scopes', async () => {
      const result = await service.registerSerialUniqueness(
        'SCOPED-SERIAL',
        testPartId,
        ['SITE', 'ENTERPRISE']
      );

      expect(result.siteLevel).toBe(true);
      expect(result.enterpriseLevel).toBe(true);
      expect(result.partTypeLevel).toBe(false);
    });

    it('should update existing registration', async () => {
      await service.registerSerialUniqueness('UPDATE-TEST', testPartId, [
        'SITE',
      ]);

      const updated = await service.registerSerialUniqueness(
        'UPDATE-TEST',
        testPartId,
        ['ENTERPRISE']
      );

      expect(updated.siteLevel).toBe(false);
      expect(updated.enterpriseLevel).toBe(true);
    });
  });

  describe('Conflict Detection and Marking', () => {
    it('should mark serial with conflicts', async () => {
      const conflictSerialId = 'CONFLICT-SERIAL-ID';

      const result = await service.markConflict(
        'CONFLICT-SERIAL',
        testPartId,
        [conflictSerialId]
      );

      expect(result.hasConflict).toBe(true);
      expect(result.conflictingSerialIds).toContain(conflictSerialId);
    });

    it('should track multiple conflicts', async () => {
      const conflicts = ['ID-1', 'ID-2', 'ID-3'];

      const result = await service.markConflict(
        'MULTI-CONFLICT',
        testPartId,
        conflicts
      );

      expect(result.conflictingSerialIds.length).toBe(3);
      conflicts.forEach((c) => {
        expect(result.conflictingSerialIds).toContain(c);
      });
    });
  });

  describe('Conflict Resolution', () => {
    it('should resolve conflict with KEEP strategy', async () => {
      await service.markConflict(
        'RESOLVE-KEEP',
        testPartId,
        ['OTHER-SERIAL-ID']
      );

      const result = await service.resolveConflict({
        serialNumber: 'RESOLVE-KEEP',
        partId: testPartId,
        conflictResolution: 'KEEP',
        resolutionReason: 'Test resolution',
        resolvedBy: 'quality-manager',
      });

      expect(result.hasConflict).toBe(false);
      expect(result.conflictResolution).toBe('KEEP');
    });

    it('should resolve conflict with RETIRE strategy', async () => {
      // Create a serial to retire
      const retireSerial = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'TO-RETIRE',
          status: 'ACTIVE',
        },
      });

      await service.markConflict(
        'RESOLVE-RETIRE',
        testPartId,
        [retireSerial.id]
      );

      const result = await service.resolveConflict({
        serialNumber: 'RESOLVE-RETIRE',
        partId: testPartId,
        conflictResolution: 'RETIRE',
        retiredSerialId: retireSerial.id,
        resolutionReason: 'Duplicate found',
        resolvedBy: 'quality-manager',
      });

      expect(result.hasConflict).toBe(false);

      // Verify serial was retired
      const retired = await prisma.serializedPart.findUnique({
        where: { id: retireSerial.id },
      });

      expect(retired?.status).toBe('RETIRED');

      await prisma.serializedPart.delete({ where: { id: retireSerial.id } });
    });

    it('should resolve conflict with MARK_INVALID strategy', async () => {
      // Create serials to mark invalid
      const invalidSerial1 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'TO-INVALIDATE-1',
          status: 'ACTIVE',
        },
      });

      const invalidSerial2 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'TO-INVALIDATE-2',
          status: 'ACTIVE',
        },
      });

      await service.markConflict(
        'RESOLVE-INVALID',
        testPartId,
        [invalidSerial1.id, invalidSerial2.id]
      );

      const result = await service.resolveConflict({
        serialNumber: 'RESOLVE-INVALID',
        partId: testPartId,
        conflictResolution: 'MARK_INVALID',
        resolutionReason: 'Multiple duplicates',
        resolvedBy: 'quality-manager',
      });

      expect(result.hasConflict).toBe(false);

      // Verify serials were marked invalid
      const invalid1 = await prisma.serializedPart.findUnique({
        where: { id: invalidSerial1.id },
      });

      const invalid2 = await prisma.serializedPart.findUnique({
        where: { id: invalidSerial2.id },
      });

      expect(invalid1?.status).toBe('INVALID');
      expect(invalid2?.status).toBe('INVALID');

      await prisma.serializedPart.delete({ where: { id: invalidSerial1.id } });
      await prisma.serializedPart.delete({ where: { id: invalidSerial2.id } });
    });
  });

  describe('Uniqueness Report', () => {
    it('should generate uniqueness report', async () => {
      const report = await service.getUniquenessReport('REPORT-SERIAL', testPartId);

      expect(report).toBeDefined();
      expect(report.serialNumber).toBe('REPORT-SERIAL');
      expect(report.partId).toBe(testPartId);
      expect(typeof report.isSiteUnique).toBe('boolean');
      expect(typeof report.isEnterpriseUnique).toBe('boolean');
      expect(typeof report.isPartTypeUnique).toBe('boolean');
      expect(typeof report.totalConflicts).toBe('number');
    });

    it('should detect duplicates in report', async () => {
      // Create a duplicate
      await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'REPORT-DUP',
          status: 'ACTIVE',
        },
      });

      const report = await service.getUniquenessReport(
        'REPORT-DUP',
        testPartId
      );

      expect(report.totalConflicts).toBeGreaterThan(0);
      expect(report.conflictingSerials.length).toBeGreaterThan(0);
    });
  });

  describe('Conflict Retrieval', () => {
    it('should get pending conflicts', async () => {
      await service.markConflict(
        'PENDING-CONFLICT',
        testPartId,
        ['CONFLICT-ID']
      );

      const pending = await service.getPendingConflicts();

      expect(Array.isArray(pending)).toBe(true);
      expect(pending.length).toBeGreaterThan(0);
    });

    it('should get pending conflicts for specific part', async () => {
      await service.markConflict(
        'PART-SPECIFIC-CONFLICT',
        testPartId,
        ['ID']
      );

      const pending = await service.getPendingConflicts(testPartId);

      expect(Array.isArray(pending)).toBe(true);
      expect(pending.every((p) => p.partId === testPartId)).toBe(true);
    });

    it('should get conflict resolution history', async () => {
      await service.markConflict(
        'HISTORY-TEST',
        testPartId,
        ['ID']
      );

      await service.resolveConflict({
        serialNumber: 'HISTORY-TEST',
        partId: testPartId,
        conflictResolution: 'KEEP',
        resolutionReason: 'Test',
        resolvedBy: 'manager',
      });

      const history = await service.getConflictResolutionHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.some((h) => h.serialNumber === 'HISTORY-TEST')).toBe(true);
    });
  });

  describe('Uniqueness Statistics', () => {
    it('should calculate uniqueness statistics', async () => {
      await service.registerSerialUniqueness('STAT-SERIAL-1', testPartId);
      await service.registerSerialUniqueness('STAT-SERIAL-2', testPartId);
      await service.markConflict('STAT-SERIAL-1', testPartId, ['ID']);

      const stats = await service.getUniquenessStatistics(testPartId);

      expect(stats.totalUniqueSerials).toBeGreaterThanOrEqual(2);
      expect(stats.serialsWithConflicts).toBeGreaterThan(0);
      expect(typeof stats.conflictRate).toBe('number');
    });

    it('should handle empty statistics', async () => {
      const uniquePartNumber = `EMPTY-PART-${Date.now()}`;
      const emptyPart = await prisma.part.create({
        data: {
          partNumber: uniquePartNumber,
          partName: 'Empty Part',
          description: 'Empty',
          partType: 'COMPONENT',
          unitOfMeasure: 'EA',
          revision: '1.0',
        },
      });

      const stats = await service.getUniquenessStatistics(emptyPart.id);

      expect(stats.totalUniqueSerials).toBe(0);
      expect(stats.conflictRate).toBe(0);

      await prisma.part.delete({ where: { id: emptyPart.id } });
    });

    it('should calculate conflict rate', async () => {
      // Create 10 serials, mark 3 as having conflicts
      for (let i = 0; i < 10; i++) {
        await service.registerSerialUniqueness(
          `RATE-SERIAL-${i}`,
          testPartId
        );
      }

      for (let i = 0; i < 3; i++) {
        await service.markConflict(
          `RATE-SERIAL-${i}`,
          testPartId,
          ['ID']
        );
      }

      const stats = await service.getUniquenessStatistics(testPartId);

      expect(stats.serialsWithConflicts).toBe(3);
      expect(stats.conflictRate).toBeGreaterThan(0);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry on conflict marking', async () => {
      await service.markConflict(
        'AUDIT-CONFLICT',
        testPartId,
        ['ID']
      );

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: {
          serialNumber: 'AUDIT-CONFLICT',
          eventType: 'CONFLICT_DETECTED',
        },
      });

      expect(audits.length).toBeGreaterThan(0);
    });

    it('should create audit entry on conflict resolution', async () => {
      await service.markConflict(
        'AUDIT-RESOLVE',
        testPartId,
        ['ID']
      );

      await service.resolveConflict({
        serialNumber: 'AUDIT-RESOLVE',
        partId: testPartId,
        conflictResolution: 'KEEP',
        resolutionReason: 'Test',
        resolvedBy: 'manager',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: {
          serialNumber: 'AUDIT-RESOLVE',
          eventType: 'CONFLICT_RESOLVED',
        },
      });

      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
