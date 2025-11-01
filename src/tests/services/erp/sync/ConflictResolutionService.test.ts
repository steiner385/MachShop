/**
 * Conflict Resolution Service Unit Tests
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 */

import { describe, it, expect, beforeEach } from 'vitest';
import ConflictResolutionService, {
  ConflictResolutionStrategy,
} from '../../../../services/erp/sync/ConflictResolutionService';

describe('ConflictResolutionService', () => {
  let conflictService: ConflictResolutionService;

  beforeEach(() => {
    conflictService = new ConflictResolutionService();
  });

  describe('createConflict', () => {
    it('should create a conflict record', async () => {
      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date(),
        {
          notes: 'Inventory mismatch',
        }
      );

      expect(conflict.id).toBeDefined();
      expect(conflict.operationId).toBe('op-1');
      expect(conflict.entityType).toBe('Product');
      expect(conflict.fieldName).toBe('quantity');
      expect(conflict.sourceValue).toBe(100);
      expect(conflict.targetValue).toBe(50);
      expect(conflict.status).toBe('UNRESOLVED');
    });

    it('should determine severity based on field', async () => {
      const critical = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      expect(critical.severity).toBe('CRITICAL');

      const medium = await conflictService.createConflict(
        'op-2',
        'Product',
        'prod-1',
        'notes',
        'Old note',
        'New note',
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      // 'notes' field should have LOW severity since it's not in critical/high lists
      expect(['LOW', 'MEDIUM']).toContain(medium.severity);
    });
  });

  describe('resolveConflict', () => {
    it('should resolve conflict with LAST_WRITE_WINS strategy', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000);

      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        earlier,
        now
      );

      const resolved = await conflictService.resolveConflict(
        conflict.id,
        ConflictResolutionStrategy.LAST_WRITE_WINS
      );

      expect(resolved?.status).toBe('RESOLVED');
      expect(resolved?.resolution).toBe('TARGET');
      expect(resolved?.resolvedValue).toBe(50);
    });

    it('should resolve conflict with SOURCE_PRIORITY strategy', async () => {
      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      const resolved = await conflictService.resolveConflict(
        conflict.id,
        ConflictResolutionStrategy.SOURCE_PRIORITY
      );

      expect(resolved?.resolution).toBe('SOURCE');
      expect(resolved?.resolvedValue).toBe(100);
    });

    it('should resolve conflict with TARGET_PRIORITY strategy', async () => {
      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      const resolved = await conflictService.resolveConflict(
        conflict.id,
        ConflictResolutionStrategy.TARGET_PRIORITY
      );

      expect(resolved?.resolution).toBe('TARGET');
      expect(resolved?.resolvedValue).toBe(50);
    });

    it('should resolve conflict with CUSTOM strategy', async () => {
      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      const resolved = await conflictService.resolveConflict(
        conflict.id,
        ConflictResolutionStrategy.CUSTOM,
        {
          customValue: 75,
        }
      );

      expect(resolved?.resolution).toBe('CUSTOM');
      expect(resolved?.resolvedValue).toBe(75);
    });
  });

  describe('approveResolution', () => {
    it('should approve a resolved conflict', async () => {
      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      await conflictService.resolveConflict(
        conflict.id,
        ConflictResolutionStrategy.SOURCE_PRIORITY
      );

      const approved = await conflictService.approveResolution(conflict.id, 'user-1');

      expect(approved?.status).toBe('APPROVED');
      expect(approved?.resolvedBy).toBe('user-1');
    });
  });

  describe('rejectResolution', () => {
    it('should reject a resolution', async () => {
      const conflict = await conflictService.createConflict(
        'op-1',
        'Product',
        'prod-1',
        'quantity',
        100,
        50,
        'ERP',
        'MES',
        new Date(),
        new Date()
      );

      const rejected = await conflictService.rejectResolution(
        conflict.id,
        'user-1',
        'Resolution requires manual review'
      );

      expect(rejected?.status).toBe('REJECTED');
      expect(rejected?.notes).toBe('Resolution requires manual review');
    });
  });

  describe('getConflicts', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await conflictService.createConflict(
          `op-${i}`,
          'Product',
          `prod-${i}`,
          'quantity',
          100 + i * 10,
          50 + i * 10,
          'ERP',
          'MES',
          new Date(),
          new Date()
        );
      }
    });

    it('should list all conflicts', async () => {
      const { conflicts, total } = await conflictService.getConflicts();

      expect(conflicts.length).toBeGreaterThan(0);
      expect(total).toBe(3);
    });

    it('should filter by status', async () => {
      const { conflicts } = await conflictService.getConflicts({ status: 'UNRESOLVED' });

      expect(conflicts.every((c) => c.status === 'UNRESOLVED')).toBe(true);
    });

    it('should filter by severity', async () => {
      const { conflicts } = await conflictService.getConflicts({ severity: 'CRITICAL' });

      expect(conflicts.every((c) => c.severity === 'CRITICAL')).toBe(true);
    });

    it('should support pagination', async () => {
      const { conflicts, total } = await conflictService.getConflicts({ limit: 2, offset: 0 });

      expect(conflicts.length).toBeLessThanOrEqual(2);
      expect(total).toBe(3);
    });
  });

  describe('getConflictStatistics', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        const conflict = await conflictService.createConflict(
          `op-${i}`,
          'Product',
          `prod-${i}`,
          'quantity',
          100,
          50,
          'ERP',
          'MES',
          new Date(),
          new Date()
        );

        if (i < 3) {
          await conflictService.resolveConflict(
            conflict.id,
            ConflictResolutionStrategy.SOURCE_PRIORITY
          );
        }
      }
    });

    it('should return conflict statistics', async () => {
      const stats = await conflictService.getConflictStatistics();

      expect(stats.totalConflicts).toBe(5);
      expect(stats.unresolvedConflicts).toBe(2);
      expect(stats.resolvedConflicts).toBe(3);
    });

    it('should calculate resolution rate', async () => {
      const stats = await conflictService.getConflictStatistics();

      expect(stats.resolutionRate).toBeGreaterThan(0);
      expect(stats.resolutionRate).toBeLessThanOrEqual(100);
    });

    it('should provide status breakdown', async () => {
      const stats = await conflictService.getConflictStatistics();

      expect(stats.conflictsByStatus).toBeDefined();
      expect(stats.conflictsByStatus['UNRESOLVED']).toBeGreaterThan(0);
    });
  });

  describe('registerResolutionRule', () => {
    it('should register a resolution rule', async () => {
      await conflictService.registerResolutionRule({
        id: 'rule-1',
        entityType: 'Product',
        fieldName: 'quantity',
        strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
        enabled: true,
        priority: 10,
      });

      // If no error thrown, registration was successful
      expect(true).toBe(true);
    });
  });

  describe('findApplicableRule', () => {
    beforeEach(async () => {
      await conflictService.registerResolutionRule({
        id: 'rule-1',
        entityType: 'Product',
        fieldName: 'quantity',
        strategy: ConflictResolutionStrategy.SOURCE_PRIORITY,
        enabled: true,
        priority: 10,
      });
    });

    it('should find applicable rule', async () => {
      const rule = await conflictService.findApplicableRule('Product', 'quantity', 100, 50);

      expect(rule).toBeDefined();
      expect(rule?.fieldName).toBe('quantity');
      expect(rule?.entityType).toBe('Product');
    });

    it('should return null for non-matching rule', async () => {
      const rule = await conflictService.findApplicableRule('Order', 'quantity', 100, 50);

      expect(rule).toBeNull();
    });
  });
});
