/**
 * Serial Propagation Service Tests
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 5: Serial Propagation Through Routing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import SerialPropagationService from '../../../services/serialization/SerialPropagationService';

describe('SerialPropagationService', () => {
  let prisma: PrismaClient;
  let service: SerialPropagationService;
  let testPartId: string;
  let testSiteId: string;
  let testSerialId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new SerialPropagationService(prisma);

    // Create test site with unique code
    const uniqueSiteCode = `SPS-${Date.now()}`;
    const site = await prisma.site.create({
      data: {
        siteCode: uniqueSiteCode,
        siteName: 'Serial Propagation Test Site',
        location: '123 Test St',
      },
    });
    testSiteId = site.id;

    // Create test part with unique part number
    const uniquePartNumber = `PART-SPS-${Date.now()}`;
    const part = await prisma.part.create({
      data: {
        partNumber: uniquePartNumber,
        partName: 'Test Part for Serial Propagation',
        description: 'Test Part for Serial Propagation',
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
        serialNumber: 'TEST-SERIAL-001',
        status: 'ACTIVE',
      },
    });
    testSerialId = serial.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.serialAssignmentAudit.deleteMany({ where: { partId: testPartId } });
    await prisma.serialPropagation.deleteMany({
      where: { sourceSerial: { partId: testPartId } },
    });
    await prisma.serializedPart.deleteMany({ where: { partId: testPartId } });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.$disconnect();
  });

  describe('Pass-Through Propagation', () => {
    it('should record pass-through propagation', async () => {
      const result = await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-001',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      expect(result).toBeDefined();
      expect(result.sourceSerialId).toBe(testSerialId);
      expect(result.propagationType).toBe('PASS_THROUGH');
      expect(result.operationCode).toBe('OP-001');
    });

    it('should include work center in propagation', async () => {
      const result = await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-002',
        routingSequence: 2,
        workCenterId: 'WC-ASSEMBLY',
        quantity: 1,
        createdBy: 'operator',
      });

      expect(result.workCenterId).toBe('WC-ASSEMBLY');
    });

    it('should fail with non-existent serial', async () => {
      await expect(
        service.propagatePassThrough({
          sourceSerialId: 'INVALID-SERIAL',
          propagationType: 'PASS_THROUGH',
          operationCode: 'OP-001',
          routingSequence: 1,
          quantity: 1,
          createdBy: 'operator',
        })
      ).rejects.toThrow('not found');
    });

    it('should track routing sequence', async () => {
      const result = await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-003',
        routingSequence: 5,
        quantity: 1,
        createdBy: 'operator',
      });

      expect(result.routingSequence).toBe(5);
    });
  });

  describe('Split Propagation', () => {
    it('should record split propagation (one to many)', async () => {
      // Create target serials
      const serial1 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'SPLIT-TARGET-1',
          status: 'ACTIVE',
        },
      });

      const serial2 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'SPLIT-TARGET-2',
          status: 'ACTIVE',
        },
      });

      const results = await service.propagateSplit({
        sourceSerialId: testSerialId,
        operationCode: 'OP-SPLIT',
        routingSequence: 1,
        targetSerialIds: [serial1.id, serial2.id],
        createdBy: 'operator',
      });

      expect(results).toBeDefined();
      expect(results.length).toBe(2);
      expect(results.every((r) => r.propagationType === 'SPLIT')).toBe(true);

      await prisma.serializedPart.delete({ where: { id: serial1.id } });
      await prisma.serializedPart.delete({ where: { id: serial2.id } });
    });

    it('should track parent-child relationships in split', async () => {
      const serial1 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'SPLIT-CHILD-1',
          status: 'ACTIVE',
        },
      });

      const serial2 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'SPLIT-CHILD-2',
          status: 'ACTIVE',
        },
      });

      const results = await service.propagateSplit({
        sourceSerialId: testSerialId,
        operationCode: 'OP-SPLIT',
        routingSequence: 1,
        targetSerialIds: [serial1.id, serial2.id],
        createdBy: 'operator',
      });

      expect(results[0].parentSerialIds).toContain(testSerialId);
      expect(results[0].childSerialIds).toContain(serial1.id);
      expect(results[0].childSerialIds).toContain(serial2.id);

      await prisma.serializedPart.delete({ where: { id: serial1.id } });
      await prisma.serializedPart.delete({ where: { id: serial2.id } });
    });

    it('should fail if target serial does not exist', async () => {
      await expect(
        service.propagateSplit({
          sourceSerialId: testSerialId,
          operationCode: 'OP-SPLIT',
          routingSequence: 1,
          targetSerialIds: ['INVALID-SERIAL'],
          createdBy: 'operator',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('Merge Propagation', () => {
    it('should record merge propagation (many to one)', async () => {
      // Create source serials
      const serial1 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'MERGE-SOURCE-1',
          status: 'ACTIVE',
        },
      });

      const serial2 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'MERGE-SOURCE-2',
          status: 'ACTIVE',
        },
      });

      const targetSerial = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'MERGE-TARGET',
          status: 'ACTIVE',
        },
      });

      const result = await service.propagateMerge({
        sourceSerialIds: [testSerialId, serial1.id, serial2.id],
        operationCode: 'OP-MERGE',
        routingSequence: 1,
        targetSerialId: targetSerial.id,
        createdBy: 'operator',
      });

      expect(result.propagationType).toBe('MERGE');
      expect(result.quantity).toBe(3);
      expect(result.targetSerialId).toBe(targetSerial.id);

      await prisma.serializedPart.delete({ where: { id: serial1.id } });
      await prisma.serializedPart.delete({ where: { id: serial2.id } });
      await prisma.serializedPart.delete({ where: { id: targetSerial.id } });
    });

    it('should track all parent serials in merge', async () => {
      const serial1 = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'MERGE-PARENT-1',
          status: 'ACTIVE',
        },
      });

      const targetSerial = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'MERGE-RESULT',
          status: 'ACTIVE',
        },
      });

      const result = await service.propagateMerge({
        sourceSerialIds: [testSerialId, serial1.id],
        operationCode: 'OP-MERGE',
        routingSequence: 1,
        targetSerialId: targetSerial.id,
        createdBy: 'operator',
      });

      expect(result.parentSerialIds).toContain(testSerialId);
      expect(result.parentSerialIds).toContain(serial1.id);
      expect(result.quantity).toBe(2);

      await prisma.serializedPart.delete({ where: { id: serial1.id } });
      await prisma.serializedPart.delete({ where: { id: targetSerial.id } });
    });

    it('should fail if source serial does not exist', async () => {
      const targetSerial = await prisma.serializedPart.create({
        data: {
          partId: testPartId,
          serialNumber: 'MERGE-TARGET-FAIL',
          status: 'ACTIVE',
        },
      });

      await expect(
        service.propagateMerge({
          sourceSerialIds: ['INVALID-SERIAL'],
          operationCode: 'OP-MERGE',
          routingSequence: 1,
          targetSerialId: targetSerial.id,
          createdBy: 'operator',
        })
      ).rejects.toThrow('not found');

      await prisma.serializedPart.delete({ where: { id: targetSerial.id } });
    });
  });

  describe('Transformation Propagation', () => {
    it('should record transformation propagation', async () => {
      const result = await service.propagateTransformation({
        sourceSerialId: testSerialId,
        propagationType: 'TRANSFORMATION',
        operationCode: 'OP-TRANSFORM',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      expect(result.propagationType).toBe('TRANSFORMATION');
      expect(result.operationCode).toBe('OP-TRANSFORM');
    });

    it('should track transformation through multiple operations', async () => {
      await service.propagateTransformation({
        sourceSerialId: testSerialId,
        propagationType: 'TRANSFORMATION',
        operationCode: 'OP-HEAT-TREAT',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      await service.propagateTransformation({
        sourceSerialId: testSerialId,
        propagationType: 'TRANSFORMATION',
        operationCode: 'OP-COOL-DOWN',
        routingSequence: 2,
        quantity: 1,
        createdBy: 'operator',
      });

      const lineage = await service.getSerialLineage(testSerialId);

      expect(lineage.propagationHistory.length).toBeGreaterThanOrEqual(2);
      expect(lineage.propagationHistory.some((p) => p.operationCode === 'OP-HEAT-TREAT')).toBe(true);
      expect(lineage.propagationHistory.some((p) => p.operationCode === 'OP-COOL-DOWN')).toBe(true);
    });
  });

  describe('Serial Lineage', () => {
    it('should retrieve serial lineage', async () => {
      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-001',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      const lineage = await service.getSerialLineage(testSerialId);

      expect(lineage.serial).toBeDefined();
      expect(lineage.serial.id).toBe(testSerialId);
      expect(Array.isArray(lineage.ancestors)).toBe(true);
      expect(Array.isArray(lineage.descendants)).toBe(true);
      expect(Array.isArray(lineage.propagationHistory)).toBe(true);
    });

    it('should fail with non-existent serial', async () => {
      await expect(service.getSerialLineage('INVALID-SERIAL')).rejects.toThrow('not found');
    });
  });

  describe('Propagation History', () => {
    it('should retrieve propagation history for part', async () => {
      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-HIST',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      const history = await service.getPropagationHistory(testPartId);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter history by operation code', async () => {
      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-FILTER-TEST',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      const history = await service.getPropagationHistory(testPartId, {
        operationCode: 'OP-FILTER-TEST',
      });

      expect(history.every((h) => h.operationCode === 'OP-FILTER-TEST')).toBe(true);
    });

    it('should filter history by propagation type', async () => {
      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-TYPE-FILTER',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      const history = await service.getPropagationHistory(testPartId, {
        propagationType: 'PASS_THROUGH',
      });

      expect(history.every((h) => h.propagationType === 'PASS_THROUGH')).toBe(true);
    });
  });

  describe('Propagation Statistics', () => {
    it('should calculate propagation statistics', async () => {
      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-STAT-1',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'operator',
      });

      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-STAT-2',
        routingSequence: 2,
        quantity: 1,
        createdBy: 'operator',
      });

      const stats = await service.getPropagationStatistics(testPartId);

      expect(stats.totalPropagations).toBeGreaterThanOrEqual(2);
      expect(stats.byType.PASS_THROUGH).toBeGreaterThanOrEqual(2);
      expect(stats.byOperation['OP-STAT-1']).toBeGreaterThanOrEqual(1);
      expect(stats.byOperation['OP-STAT-2']).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entries for propagations', async () => {
      await service.propagatePassThrough({
        sourceSerialId: testSerialId,
        propagationType: 'PASS_THROUGH',
        operationCode: 'OP-AUDIT',
        routingSequence: 1,
        quantity: 1,
        createdBy: 'test-operator',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { serialId: testSerialId, eventType: 'PROPAGATED' },
      });

      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
