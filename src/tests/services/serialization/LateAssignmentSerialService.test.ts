/**
 * Late Assignment Serial Service Tests
 * Issue #150: Serialization - Advanced Assignment Workflows
 * Phase 4: Late Assignment and Deferred Serialization
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import LateAssignmentSerialService from '../../../services/serialization/LateAssignmentSerialService';

describe('LateAssignmentSerialService', () => {
  let prisma: PrismaClient;
  let service: LateAssignmentSerialService;
  let testPartId: string;
  let testSiteId: string;

  beforeEach(async () => {
    prisma = new PrismaClient();
    service = new LateAssignmentSerialService(prisma);

    // Create test site with unique code
    const uniqueSiteCode = `LASS-${Date.now()}`;
    const site = await prisma.site.create({
      data: {
        siteCode: uniqueSiteCode,
        siteName: 'Late Assignment Serial Test Site',
        location: '123 Test St',
      },
    });
    testSiteId = site.id;

    // Create test part with unique part number
    const uniquePartNumber = `PART-LASS-${Date.now()}`;
    const part = await prisma.part.create({
      data: {
        partNumber: uniquePartNumber,
        partName: 'Test Part for Late Assignment Serials',
        description: 'Test Part for Late Assignment Serials',
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
    await prisma.lateAssignmentPlaceholder.deleteMany({ where: { partId: testPartId } });
    await prisma.part.delete({ where: { id: testPartId } });
    await prisma.site.delete({ where: { id: testSiteId } });
    await prisma.$disconnect();
  });

  describe('Placeholder Creation', () => {
    it('should create a late assignment placeholder', async () => {
      const result = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.placeholderId).toBeDefined();
      expect(result.partId).toBe(testPartId);
      expect(result.status).toBe('PENDING');
      expect(result.createdAt).toBeDefined();
    });

    it('should create placeholder with work order and lot references', async () => {
      const result = await service.createPlaceholder({
        partId: testPartId,
        workOrderId: 'WO-12345',
        lotNumber: 'LOT-ABC-001',
        createdBy: 'operator',
      });

      expect(result.workOrderId).toBe('WO-12345');
      expect(result.lotNumber).toBe('LOT-ABC-001');
    });

    it('should fail with non-existent part', async () => {
      await expect(
        service.createPlaceholder({
          partId: 'INVALID-PART',
          createdBy: 'system',
        })
      ).rejects.toThrow('not found');
    });

    it('should generate unique placeholder IDs', async () => {
      const result1 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const result2 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      expect(result1.placeholderId).not.toBe(result2.placeholderId);
    });
  });

  describe('Batch Placeholder Creation', () => {
    it('should create batch of placeholders', async () => {
      const results = await service.createBatchPlaceholders({
        partId: testPartId,
        createdBy: 'system',
        quantity: 5,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(5);
      expect(results.every((p) => p.partId === testPartId)).toBe(true);
      expect(results.every((p) => p.status === 'PENDING')).toBe(true);
    });

    it('should create unique placeholders in batch', async () => {
      const results = await service.createBatchPlaceholders({
        partId: testPartId,
        createdBy: 'system',
        quantity: 10,
      });

      const ids = results.map((p) => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should batch create with work order', async () => {
      const results = await service.createBatchPlaceholders({
        partId: testPartId,
        workOrderId: 'WO-BATCH-001',
        createdBy: 'system',
        quantity: 3,
      });

      expect(results.every((p) => p.workOrderId === 'WO-BATCH-001')).toBe(true);
    });
  });

  describe('Serial Assignment to Placeholder', () => {
    it('should assign serial to placeholder', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const result = await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'ASSIGNED-001',
        assignmentOperationCode: 'OP-FINAL-ASSEMBLY',
        assignedBy: 'operator',
      });

      expect(result.status).toBe('SERIALIZED');
      expect(result.assignedSerialId).toBeDefined();
      expect(result.assignmentOperationCode).toBe('OP-FINAL-ASSEMBLY');
      expect(result.serializedDate).toBeDefined();
    });

    it('should prevent duplicate serial assignment', async () => {
      const placeholder1 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const placeholder2 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder1.id,
        serialNumber: 'UNIQUE-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      await expect(
        service.assignSerialToPlaceholder({
          placeholderId: placeholder2.id,
          serialNumber: 'UNIQUE-SERIAL',
          assignmentOperationCode: 'OP-001',
          assignedBy: 'operator',
        })
      ).rejects.toThrow('not unique');
    });

    it('should prevent reassigning to already serialized placeholder', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'FIRST-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      await expect(
        service.assignSerialToPlaceholder({
          placeholderId: placeholder.id,
          serialNumber: 'SECOND-SERIAL',
          assignmentOperationCode: 'OP-001',
          assignedBy: 'operator',
        })
      ).rejects.toThrow('already has');
    });

    it('should fail with non-existent placeholder', async () => {
      await expect(
        service.assignSerialToPlaceholder({
          placeholderId: 'INVALID-PLACEHOLDER',
          serialNumber: 'TEST-SERIAL',
          assignmentOperationCode: 'OP-001',
          assignedBy: 'operator',
        })
      ).rejects.toThrow('not found');
    });

    it('should include assignment notes', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'NOTED-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
        notes: 'Special handling required',
      });

      const assigned = await service.getPlaceholder(placeholder.id);
      expect(assigned?.assignmentOperationCode).toBe('OP-001');
    });
  });

  describe('Placeholder Failure Handling', () => {
    it('should mark placeholder as failed', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const result = await service.markPlaceholderFailed(
        placeholder.id,
        'Quality check failed',
        'quality-inspector'
      );

      expect(result.status).toBe('FAILED');
    });

    it('should prevent failing already serialized placeholder', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'SERIALIZED-ITEM',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      await expect(
        service.markPlaceholderFailed(placeholder.id, 'Reason', 'operator')
      ).rejects.toThrow('already been serialized');
    });

    it('should prevent assignment to failed placeholder', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.markPlaceholderFailed(placeholder.id, 'Failed reason', 'operator');

      await expect(
        service.assignSerialToPlaceholder({
          placeholderId: placeholder.id,
          serialNumber: 'TEST-SERIAL',
          assignmentOperationCode: 'OP-001',
          assignedBy: 'operator',
        })
      ).rejects.toThrow('marked as failed');
    });
  });

  describe('Placeholder Retrieval', () => {
    it('should retrieve placeholder by ID', async () => {
      const created = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const retrieved = await service.getPlaceholder(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.placeholderId).toBe(created.placeholderId);
    });

    it('should return null for non-existent placeholder', async () => {
      const result = await service.getPlaceholder('INVALID-ID');

      expect(result).toBeNull();
    });

    it('should get pending placeholders', async () => {
      await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const pending = await service.getPendingPlaceholders(testPartId);

      expect(pending.length).toBeGreaterThanOrEqual(2);
      expect(pending.every((p) => p.status === 'PENDING')).toBe(true);
    });

    it('should filter placeholders by status', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'TEST-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      const serialized = await service.getPlaceholders({
        partId: testPartId,
        status: 'SERIALIZED',
      });

      expect(serialized.length).toBeGreaterThan(0);
      expect(serialized.every((p) => p.status === 'SERIALIZED')).toBe(true);
    });

    it('should filter by work order ID', async () => {
      await service.createPlaceholder({
        partId: testPartId,
        workOrderId: 'WO-FILTER',
        createdBy: 'system',
      });

      const results = await service.getPlaceholders({
        partId: testPartId,
        workOrderId: 'WO-FILTER',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((p) => p.workOrderId === 'WO-FILTER')).toBe(true);
    });

    it('should filter by lot number', async () => {
      await service.createPlaceholder({
        partId: testPartId,
        lotNumber: 'LOT-TEST',
        createdBy: 'system',
      });

      const results = await service.getPlaceholders({
        partId: testPartId,
        lotNumber: 'LOT-TEST',
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((p) => p.lotNumber === 'LOT-TEST')).toBe(true);
    });
  });

  describe('Serialized Results Retrieval', () => {
    it('should retrieve serialized results from placeholders', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'RESULT-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      const results = await service.getSerializedFromPlaceholders(testPartId);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].serial).toBeDefined();
    });

    it('should filter serialized results by date range', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'DATE-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      const now = new Date();
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const results = await service.getSerializedFromPlaceholders(
        testPartId,
        new Date(now.getTime() - 60000),
        future
      );

      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Placeholder Statistics', () => {
    it('should calculate placeholder statistics', async () => {
      // Create mix of placeholders
      const p1 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const p2 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      const p3 = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      // Serialize one
      await service.assignSerialToPlaceholder({
        placeholderId: p1.id,
        serialNumber: 'STAT-SERIAL-1',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'operator',
      });

      // Fail one
      await service.markPlaceholderFailed(p2.id, 'Test failure', 'operator');

      const stats = await service.getPlaceholderStatistics(testPartId);

      expect(stats.totalPlaceholders).toBe(3);
      expect(stats.serializedCount).toBe(1);
      expect(stats.failedCount).toBe(1);
      expect(stats.pendingCount).toBe(1);
      expect(stats.serializedPercentage).toBe(33);
    });

    it('should handle zero placeholders in statistics', async () => {
      const uniquePartNumber = `PART-EMPTY-${Date.now()}`;
      const emptyPart = await prisma.part.create({
        data: {
          partNumber: uniquePartNumber,
          partName: 'Empty Part',
          description: 'Empty Part',
          partType: 'COMPONENT',
          unitOfMeasure: 'EA',
          revision: '1.0',
        },
      });

      const stats = await service.getPlaceholderStatistics(emptyPart.id);

      expect(stats.totalPlaceholders).toBe(0);
      expect(stats.pendingPercentage).toBe(0);
      expect(stats.serializedPercentage).toBe(0);
      expect(stats.failedPercentage).toBe(0);

      await prisma.part.delete({ where: { id: emptyPart.id } });
    });
  });

  describe('Audit Trail', () => {
    it('should create audit entry on placeholder creation', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'test-creator',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { serialId: placeholder.id },
      });

      expect(audits.length).toBeGreaterThan(0);
      expect(audits.some((a) => a.eventType === 'CREATED')).toBe(true);
    });

    it('should create audit entry on serial assignment', async () => {
      const placeholder = await service.createPlaceholder({
        partId: testPartId,
        createdBy: 'system',
      });

      await service.assignSerialToPlaceholder({
        placeholderId: placeholder.id,
        serialNumber: 'AUDIT-SERIAL',
        assignmentOperationCode: 'OP-001',
        assignedBy: 'test-operator',
      });

      const audits = await prisma.serialAssignmentAudit.findMany({
        where: { serialId: placeholder.id, eventType: 'SERIALIZED' },
      });

      expect(audits.length).toBeGreaterThan(0);
    });
  });
});
