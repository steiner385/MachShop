/**
 * System Generated Serial Service Tests
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 3: System-Generated Serial Numbers
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import SystemGeneratedSerialService from '../../../services/serialization/SystemGeneratedSerialService';

describe('SystemGeneratedSerialService', () => {
  let prisma: PrismaClient;
  let service: SystemGeneratedSerialService;
  let testPartId: string;
  let testSiteId: string;
  let testFormatConfigId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new SystemGeneratedSerialService(prisma);

    // Create test site with unique code
    const uniqueSiteCode = `SGSS-${Date.now()}`;
    const site = await prisma.site.create({
      data: {
        siteCode: uniqueSiteCode,
        siteName: 'System Generated Serial Test Site',
        location: '123 Test St',
      },
    });
    testSiteId = site.id;

    // Create serial number format config
    const formatConfig = await prisma.serialNumberFormatConfig.create({
      data: {
        name: 'Test Format',
        description: 'Test serial format',
        patternTemplate: 'TST-{YYYY}{MM}{DD}-{SEQ:4}',
        siteId: testSiteId,
        sequentialCounterStart: 1,
        sequentialCounterIncrement: 1,
      },
    });
    testFormatConfigId = formatConfig.id;

    // Create test part with unique part number
    const uniquePartNumber = `PART-SGSS-${Date.now()}`;
    const part = await prisma.part.create({
      data: {
        partNumber: uniquePartNumber,
        partName: 'Test Part for System Generated Serials',
        description: 'Test Part for System Generated Serials',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        revision: '1.0',
      },
    });
    testPartId = part.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.serialAssignmentAudit.deleteMany({ where: { partId: testPartId } });
    await prisma.serializedPart.deleteMany({ where: { partId: testPartId } });
    await prisma.serialAssignmentTrigger.deleteMany({ where: { partId: testPartId } });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.serialNumberFormatConfig.delete({ where: { id: testFormatConfigId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.$disconnect();
  });

  describe('System Serial Generation', () => {
    it('should generate a system serial number', async () => {
      // Update part to use format config
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const result = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.serial).toBeDefined();
      expect(result.serial.id).toBeDefined();
      expect(result.serialNumber).toBeDefined();
      expect(result.serialNumber).toMatch(/^TST-\d{8}-\d{4}$/);
      expect(result.formatConfigId).toBe(testFormatConfigId);
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate sequential serial numbers', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const result1 = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      const result2 = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      // Extract sequence numbers and verify they're different
      const seq1 = result1.serialNumber.split('-').pop();
      const seq2 = result2.serialNumber.split('-').pop();

      expect(seq1).toBeDefined();
      expect(seq2).toBeDefined();
      expect(seq1).not.toBe(seq2);
    });

    it('should prevent duplicate serial generation', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const result1 = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      // Try to create the exact same serial (would require identical timestamp and sequence)
      // This test verifies uniqueness checking works
      const result2 = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      expect(result1.serialNumber).not.toBe(result2.serialNumber);
    });

    it('should fail without format configuration', async () => {
      await expect(
        service.generateSystemSerial({
          partId: testPartId,
          generatedBy: 'system',
        })
      ).rejects.toThrow('No serial format configuration found');
    });

    it('should fail with non-existent part', async () => {
      await expect(
        service.generateSystemSerial({
          partId: 'INVALID-PART-ID',
          generatedBy: 'system',
        })
      ).rejects.toThrow('not found');
    });

    it('should include context information in generated serial', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const result = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'operator-1',
        operationCode: 'OP-ASSEMBLY',
        workOrderId: 'WO-12345',
        systemContext: 'Test context',
      });

      expect(result.serial.notes).toBeDefined();
      expect(result.serial.generatedMethod).toBe('SYSTEM_GENERATED');
    });
  });

  describe('Batch Serial Generation', () => {
    it('should generate batch of serials', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const results = await service.generateBatchSerials({
        partId: testPartId,
        generatedBy: 'system',
        batchSize: 5,
      });

      expect(results).toBeDefined();
      expect(results.length).toBe(5);
      expect(results.every((r) => r.serialNumber)).toBe(true);
      expect(results.every((r) => r.serial)).toBe(true);
    });

    it('should generate unique serials in batch', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const results = await service.generateBatchSerials({
        partId: testPartId,
        generatedBy: 'system',
        batchSize: 10,
      });

      const serialNumbers = results.map((r) => r.serialNumber);
      const uniqueSerials = new Set(serialNumbers);

      expect(uniqueSerials.size).toBe(serialNumbers.length);
    });

    it('should handle large batch generation', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const results = await service.generateBatchSerials({
        partId: testPartId,
        generatedBy: 'system',
        batchSize: 50,
      });

      expect(results.length).toBe(50);
    });
  });

  describe('Pattern Template Processing', () => {
    it('should format date tokens correctly', async () => {
      const formatConfig = await prisma.serialNumberFormatConfig.create({
        data: {
          name: 'Date Test Format',
          patternTemplate: 'DATE-{YYYY}-{MM}-{DD}',
          siteId: testSiteId,
        },
      });

      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: formatConfig.id,
        },
      });

      const result = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      expect(result.serialNumber).toMatch(/^DATE-\d{4}-\d{2}-\d{2}$/);

      await prisma.serialNumberFormatConfig.delete({ where: { id: formatConfig.id } });
    });

    it('should handle sequential counter tokens', async () => {
      const formatConfig = await prisma.serialNumberFormatConfig.create({
        data: {
          name: 'Sequence Test Format',
          patternTemplate: 'SEQ-{SEQ:6}',
          siteId: testSiteId,
          sequentialCounterStart: 1000,
        },
      });

      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: formatConfig.id,
        },
      });

      const result = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      expect(result.serialNumber).toMatch(/^SEQ-\d{6}$/);

      await prisma.serialNumberFormatConfig.delete({ where: { id: formatConfig.id } });
    });

    it('should preserve static text in template', async () => {
      const formatConfig = await prisma.serialNumberFormatConfig.create({
        data: {
          name: 'Static Test Format',
          patternTemplate: 'PROD-ABC-{SEQ:3}',
          siteId: testSiteId,
        },
      });

      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: formatConfig.id,
        },
      });

      const result = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      expect(result.serialNumber).toMatch(/^PROD-ABC-\d{3}$/);

      await prisma.serialNumberFormatConfig.delete({ where: { id: formatConfig.id } });
    });
  });

  describe('Trigger-based Serial Generation', () => {
    it('should trigger serial generation based on operation', async () => {
      // Create trigger
      const trigger = await prisma.serialAssignmentTrigger.create({
        data: {
          partId: testPartId,
          triggerType: 'OPERATION_COMPLETE',
          operationCode: 'OP-FINAL-ASSEMBLY',
          assignmentType: 'SYSTEM_GENERATED',
          formatConfigId: testFormatConfigId,
          isActive: true,
        },
      });

      const results = await service.triggerSerialGeneration(
        testPartId,
        'OPERATION_COMPLETE',
        {
          operationCode: 'OP-FINAL-ASSEMBLY',
          generatedBy: 'system',
        }
      );

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      await prisma.serialAssignmentTrigger.delete({ where: { id: trigger.id } });
    });

    it('should trigger batch generation when configured', async () => {
      const trigger = await prisma.serialAssignmentTrigger.create({
        data: {
          partId: testPartId,
          triggerType: 'WORK_ORDER_CREATE',
          assignmentType: 'SYSTEM_GENERATED',
          batchMode: true,
          batchSize: 5,
          formatConfigId: testFormatConfigId,
          isActive: true,
        },
      });

      const results = await service.triggerSerialGeneration(
        testPartId,
        'WORK_ORDER_CREATE',
        {
          workOrderId: 'WO-TEST',
          generatedBy: 'system',
        }
      );

      expect(results.length).toBe(5);

      await prisma.serialAssignmentTrigger.delete({ where: { id: trigger.id } });
    });

    it('should return empty array when no triggers found', async () => {
      const results = await service.triggerSerialGeneration(
        testPartId,
        'NON_EXISTENT_TRIGGER',
        {
          generatedBy: 'system',
        }
      );

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });

    it('should skip inactive triggers', async () => {
      const trigger = await prisma.serialAssignmentTrigger.create({
        data: {
          partId: testPartId,
          triggerType: 'MATERIAL_RECEIPT',
          assignmentType: 'SYSTEM_GENERATED',
          formatConfigId: testFormatConfigId,
          isActive: false,
        },
      });

      const results = await service.triggerSerialGeneration(
        testPartId,
        'MATERIAL_RECEIPT',
        {
          generatedBy: 'system',
        }
      );

      expect(results.length).toBe(0);

      await prisma.serialAssignmentTrigger.delete({ where: { id: trigger.id } });
    });
  });

  describe('Serial Retrieval', () => {
    it('should retrieve generated serials for a part', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      // Generate some serials
      await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      const results = await service.getGeneratedSerials(testPartId);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.generatedMethod === 'SYSTEM_GENERATED')).toBe(true);
    });

    it('should filter serials by date range', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      const results = await service.getGeneratedSerials(testPartId, {
        generatedSince: now,
        generatedUntil: futureDate,
      });

      expect(results.length).toBeGreaterThan(0);
    });

    it('should support sorting by generation date', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const result1 = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      // Small delay
      await new Promise((resolve) => setTimeout(resolve, 10));

      const result2 = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'system',
      });

      const results = await service.getGeneratedSerials(testPartId);

      expect(results[0].id).toBe(result2.serial.id);
      expect(results[1].id).toBe(result1.serial.id);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry on serial generation', async () => {
      await prisma.part.update({
        where: { id: testPartId },
        data: {
          serialNumberFormatConfigId: testFormatConfigId,
        },
      });

      const result = await service.generateSystemSerial({
        partId: testPartId,
        generatedBy: 'test-system',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { serialId: result.serial.id },
      });

      expect(audits.length).toBeGreaterThan(0);
      expect(audits.some((a) => a.eventType === 'CREATED')).toBe(true);
      expect(audits.some((a) => a.eventSource === 'SYSTEM_GENERATED')).toBe(true);
    });
  });
});
