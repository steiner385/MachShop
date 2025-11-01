/**
 * Serial Assignment Trigger Configuration Service Tests
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 7: Trigger Configuration Management
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import SerialAssignmentTriggerConfigService from '../../../services/serialization/SerialAssignmentTriggerConfigService';

describe('SerialAssignmentTriggerConfigService', () => {
  let prisma: PrismaClient;
  let service: SerialAssignmentTriggerConfigService;
  let testPartId: string;
  let testSiteId: string;
  let testFormatConfigId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new SerialAssignmentTriggerConfigService(prisma);

    // Create test site
    const uniqueSiteCode = `SATC-${Date.now()}`;
    const site = await prisma.site.create({
      data: {
        siteCode: uniqueSiteCode,
        siteName: 'Trigger Config Test Site',
        location: '123 Test St',
      },
    });
    testSiteId = site.id;

    // Create format config
    const formatConfig = await prisma.serialNumberFormatConfig.create({
      data: {
        name: 'Test Format',
        patternTemplate: 'TST-{YYYY}{MM}{DD}-{SEQ:4}',
        siteId: testSiteId,
      },
    });
    testFormatConfigId = formatConfig.id;

    // Create test part
    const uniquePartNumber = `PART-SATC-${Date.now()}`;
    const part = await prisma.part.create({
      data: {
        partNumber: uniquePartNumber,
        partName: 'Test Part for Trigger Config',
        description: 'Test Part for Trigger Config',
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
    await prisma.serialAssignmentTrigger.deleteMany({ where: { partId: testPartId } });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.serialNumberFormatConfig.delete({ where: { id: testFormatConfigId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.$disconnect();
  });

  describe('Trigger Creation', () => {
    it('should create a trigger configuration', async () => {
      const result = await service.createTrigger({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.triggerType).toBe('MATERIAL_RECEIPT');
      expect(result.assignmentType).toBe('SYSTEM_GENERATED');
      expect(result.isActive).toBe(true);
    });

    it('should create trigger with conditions', async () => {
      const result = await service.createTrigger({
        partId: testPartId,
        triggerType: 'WORK_ORDER_CREATE',
        assignmentType: 'VENDOR',
        isConditional: true,
        conditions: { workOrderType: 'STANDARD' },
        createdBy: 'operator',
      });

      expect(result.isConditional).toBe(true);
      expect(result.conditions).toBeDefined();
    });

    it('should create trigger with batch mode', async () => {
      const result = await service.createTrigger({
        partId: testPartId,
        triggerType: 'BATCH_COMPLETION',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        batchMode: true,
        batchSize: 10,
        createdBy: 'operator',
      });

      expect(result.batchMode).toBe(true);
      expect(result.batchSize).toBe(10);
    });

    it('should fail with non-existent part', async () => {
      await expect(
        service.createTrigger({
          partId: 'INVALID-PART',
          triggerType: 'MATERIAL_RECEIPT',
          assignmentType: 'SYSTEM_GENERATED',
          createdBy: 'operator',
        })
      ).rejects.toThrow('not found');
    });

    it('should fail with invalid format config', async () => {
      await expect(
        service.createTrigger({
          partId: testPartId,
          triggerType: 'MATERIAL_RECEIPT',
          assignmentType: 'SYSTEM_GENERATED',
          formatConfigId: 'INVALID-FORMAT',
          createdBy: 'operator',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('Trigger Update', () => {
    it('should update trigger configuration', async () => {
      const trigger = await service.createTrigger({
        partId: testPartId,
        triggerType: 'OPERATION_COMPLETE',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      const result = await service.updateTrigger({
        triggerId: trigger.id,
        isActive: false,
        updatedBy: 'manager',
      });

      expect(result.isActive).toBe(false);
    });

    it('should update batch configuration', async () => {
      const trigger = await service.createTrigger({
        partId: testPartId,
        triggerType: 'BATCH_COMPLETION',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        batchMode: false,
        createdBy: 'operator',
      });

      const result = await service.updateTrigger({
        triggerId: trigger.id,
        batchMode: true,
        batchSize: 5,
        updatedBy: 'manager',
      });

      expect(result.batchMode).toBe(true);
      expect(result.batchSize).toBe(5);
    });
  });

  describe('Trigger Retrieval', () => {
    it('should get trigger by ID', async () => {
      const created = await service.createTrigger({
        partId: testPartId,
        triggerType: 'QUALITY_CHECKPOINT',
        assignmentType: 'LATE_ASSIGNMENT',
        createdBy: 'operator',
      });

      const retrieved = await service.getTrigger(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should get all triggers for part', async () => {
      await service.createTrigger({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      await service.createTrigger({
        partId: testPartId,
        triggerType: 'OPERATION_COMPLETE',
        assignmentType: 'VENDOR',
        createdBy: 'operator',
      });

      const triggers = await service.getTriggersForPart(testPartId);

      expect(Array.isArray(triggers)).toBe(true);
      expect(triggers.length).toBe(2);
    });
  });

  describe('Trigger Application', () => {
    it('should find applicable triggers for context', async () => {
      await service.createTrigger({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      const result = await service.getApplicableTriggers({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        timestamp: new Date(),
      });

      expect(result.triggers.length).toBeGreaterThan(0);
      expect(result.applicableCount).toBeGreaterThan(0);
    });

    it('should filter by conditions', async () => {
      await service.createTrigger({
        partId: testPartId,
        triggerType: 'WORK_ORDER_CREATE',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        isConditional: true,
        conditions: { workOrderType: 'PRIORITY' },
        createdBy: 'operator',
      });

      const result = await service.getApplicableTriggers({
        partId: testPartId,
        triggerType: 'WORK_ORDER_CREATE',
        timestamp: new Date(),
        context: { workOrderType: 'PRIORITY' },
      });

      expect(result.applicableCount).toBeGreaterThan(0);
    });

    it('should respect active status', async () => {
      const trigger = await service.createTrigger({
        partId: testPartId,
        triggerType: 'OPERATION_COMPLETE',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      await service.disableTrigger(trigger.id, 'operator');

      const result = await service.getApplicableTriggers({
        partId: testPartId,
        triggerType: 'OPERATION_COMPLETE',
        timestamp: new Date(),
      });

      expect(result.applicableCount).toBe(0);
    });
  });

  describe('Trigger Enable/Disable', () => {
    it('should disable a trigger', async () => {
      const trigger = await service.createTrigger({
        partId: testPartId,
        triggerType: 'BATCH_COMPLETION',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      const result = await service.disableTrigger(trigger.id, 'manager');

      expect(result.isActive).toBe(false);
    });

    it('should enable a trigger', async () => {
      const trigger = await service.createTrigger({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      await service.disableTrigger(trigger.id, 'manager');
      const result = await service.enableTrigger(trigger.id, 'manager');

      expect(result.isActive).toBe(true);
    });
  });

  describe('Trigger Deletion', () => {
    it('should delete a trigger', async () => {
      const trigger = await service.createTrigger({
        partId: testPartId,
        triggerType: 'QUALITY_CHECKPOINT',
        assignmentType: 'VENDOR',
        createdBy: 'operator',
      });

      await service.deleteTrigger(trigger.id, 'manager');

      const retrieved = await service.getTrigger(trigger.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('Trigger Statistics', () => {
    it('should calculate trigger statistics', async () => {
      await service.createTrigger({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'operator',
      });

      await service.createTrigger({
        partId: testPartId,
        triggerType: 'WORK_ORDER_CREATE',
        assignmentType: 'VENDOR',
        isConditional: true,
        conditions: {},
        createdBy: 'operator',
      });

      const stats = await service.getTriggerStatistics(testPartId);

      expect(stats.totalTriggers).toBe(2);
      expect(stats.activeTriggers).toBe(2);
      expect(stats.byTriggerType.MATERIAL_RECEIPT).toBeGreaterThan(0);
      expect(stats.byAssignmentType.SYSTEM_GENERATED).toBeGreaterThan(0);
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry on trigger creation', async () => {
      await service.createTrigger({
        partId: testPartId,
        triggerType: 'MATERIAL_RECEIPT',
        assignmentType: 'SYSTEM_GENERATED',
        formatConfigId: testFormatConfigId,
        createdBy: 'test-operator',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { partId: testPartId, eventType: 'TRIGGER_CREATED' },
      });

      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
