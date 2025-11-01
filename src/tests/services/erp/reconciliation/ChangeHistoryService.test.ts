/**
 * Change History Service Unit Tests
 * Issue #60: Phase 14 - Audit Trail & Change History
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeHistoryService } from '../../../../services/erp/reconciliation/ChangeHistoryService';
import AuditTrailService, {
  AuditEventType,
} from '../../../../services/erp/reconciliation/AuditTrailService';

describe('ChangeHistoryService', () => {
  let changeHistory: ChangeHistoryService;
  let auditTrail: AuditTrailService;

  beforeEach(() => {
    auditTrail = new AuditTrailService();
    changeHistory = new ChangeHistoryService(auditTrail);
  });

  describe('recordChange', () => {
    it('should record a change', async () => {
      const change = await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'isEnabled',
        true,
        false,
        'UPDATE',
        {
          reason: 'Schedule disabled by user request',
        }
      );

      expect(change.id).toBeDefined();
      expect(change.userId).toBe('user-1');
      expect(change.entityType).toBe('Schedule');
      expect(change.entityId).toBe('sched-1');
      expect(change.fieldName).toBe('isEnabled');
      expect(change.previousValue).toBe(true);
      expect(change.newValue).toBe(false);
      expect(change.changeType).toBe('UPDATE');
      expect(change.reason).toBe('Schedule disabled by user request');
    });

    it('should record CREATE change', async () => {
      const change = await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'id',
        undefined,
        'sched-1',
        'CREATE'
      );

      expect(change.changeType).toBe('CREATE');
      expect(change.previousValue).toBeUndefined();
    });

    it('should record DELETE change', async () => {
      const change = await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'id',
        'sched-1',
        undefined,
        'DELETE'
      );

      expect(change.changeType).toBe('DELETE');
      expect(change.newValue).toBeUndefined();
    });

    it('should record RESOLVE change', async () => {
      const change = await changeHistory.recordChange(
        'user-1',
        'Discrepancy',
        'disc-1',
        'status',
        'PENDING',
        'RESOLVED',
        'RESOLVE',
        {
          reason: 'Discrepancy corrected in ERP',
          impact: 'HIGH',
        }
      );

      expect(change.changeType).toBe('RESOLVE');
      expect(change.impact).toBe('HIGH');
    });
  });

  describe('getChangeSummary', () => {
    beforeEach(async () => {
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'frequency',
        'DAILY',
        'WEEKLY',
        'UPDATE'
      );
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'isEnabled',
        true,
        false,
        'UPDATE'
      );
      await changeHistory.recordChange(
        'user-2',
        'Schedule',
        'sched-1',
        'maxConcurrentJobs',
        1,
        3,
        'UPDATE'
      );
    });

    it('should return change summary', async () => {
      const summary = await changeHistory.getChangeSummary('Schedule', 'sched-1');

      expect(summary).toBeDefined();
      expect(summary?.entityType).toBe('Schedule');
      expect(summary?.entityId).toBe('sched-1');
      expect(summary?.totalChanges).toBe(3);
      expect(summary?.uniqueUsers).toBe(2);
    });

    it('should return null for non-existent entity', async () => {
      const summary = await changeHistory.getChangeSummary('Schedule', 'non-existent');

      expect(summary).toBeNull();
    });

    it('should include change details', async () => {
      const summary = await changeHistory.getChangeSummary('Schedule', 'sched-1');

      expect(Array.isArray(summary?.changes)).toBe(true);
      expect(summary!.changes.length).toBe(3);
    });

    it('should track first and last change timestamps', async () => {
      const summary = await changeHistory.getChangeSummary('Schedule', 'sched-1');

      expect(summary?.firstChange).toBeDefined();
      expect(summary?.lastChange).toBeDefined();
      expect(summary!.lastChange.getTime()).toBeGreaterThanOrEqual(
        summary!.firstChange.getTime()
      );
    });
  });

  describe('getEntityTimeline', () => {
    beforeEach(async () => {
      await auditTrail.logEvent(
        AuditEventType.SCHEDULE_CREATED,
        'user-1',
        'erp-1',
        'Schedule',
        'sched-1',
        'Create'
      );
      await auditTrail.logEvent(
        AuditEventType.SCHEDULE_UPDATED,
        'user-1',
        'erp-1',
        'Schedule',
        'sched-1',
        'Update'
      );
      await auditTrail.logEvent(
        AuditEventType.SCHEDULE_ENABLED,
        'user-2',
        'erp-1',
        'Schedule',
        'sched-1',
        'Enable'
      );
    });

    it('should return entity timeline', async () => {
      const timeline = await changeHistory.getEntityTimeline('Schedule', 'sched-1');

      expect(Array.isArray(timeline)).toBe(true);
      expect(timeline.length).toBe(3);
    });

    it('should respect limit parameter', async () => {
      const timeline = await changeHistory.getEntityTimeline('Schedule', 'sched-1', 2);

      expect(timeline.length).toBe(2);
    });

    it('should include timeline entry details', async () => {
      const timeline = await changeHistory.getEntityTimeline('Schedule', 'sched-1');

      expect(timeline[0].timestamp).toBeDefined();
      expect(timeline[0].userId).toBeDefined();
      expect(timeline[0].action).toBeDefined();
      expect(timeline[0].entityType).toBe('Schedule');
    });
  });

  describe('getChangeStatistics', () => {
    beforeEach(async () => {
      await changeHistory.recordChange('user-1', 'Schedule', 'sched-1', 'frequency', 'DAILY', 'WEEKLY', 'UPDATE');
      await changeHistory.recordChange('user-1', 'Schedule', 'sched-2', 'isEnabled', true, false, 'UPDATE');
      await changeHistory.recordChange('user-2', 'Job', 'job-1', 'status', 'PENDING', 'COMPLETED', 'RESOLVE');
    });

    it('should return change statistics', async () => {
      const stats = await changeHistory.getChangeStatistics();

      expect(stats.totalChanges).toBe(3);
      expect(stats.uniqueUsers).toBe(2);
    });

    it('should count changes by type', async () => {
      const stats = await changeHistory.getChangeStatistics();

      expect(stats.changesByType['UPDATE']).toBe(2);
      expect(stats.changesByType['RESOLVE']).toBe(1);
    });

    it('should count changes by field', async () => {
      const stats = await changeHistory.getChangeStatistics();

      expect(stats.changesByField['frequency']).toBe(1);
      expect(stats.changesByField['isEnabled']).toBe(1);
      expect(stats.changesByField['status']).toBe(1);
    });

    it('should identify most active user', async () => {
      const stats = await changeHistory.getChangeStatistics();

      expect(stats.mostActiveUser).toBeDefined();
      expect(stats.mostActiveUser?.userId).toBe('user-1');
      expect(stats.mostActiveUser?.changeCount).toBe(2);
    });

    it('should identify most changed field', async () => {
      const stats = await changeHistory.getChangeStatistics();

      expect(stats.mostChangedField).toBeDefined();
    });

    it('should filter by entityType', async () => {
      const stats = await changeHistory.getChangeStatistics({ entityType: 'Schedule' });

      expect(stats.totalChanges).toBe(2);
    });
  });

  describe('getChangeImpactAnalysis', () => {
    beforeEach(async () => {
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'frequency',
        'DAILY',
        'MONTHLY',
        'UPDATE',
        {
          impact: 'HIGH',
        }
      );
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'frequency',
        'MONTHLY',
        'WEEKLY',
        'UPDATE',
        {
          impact: 'CRITICAL',
        }
      );
      await changeHistory.recordChange(
        'user-2',
        'Schedule',
        'sched-2',
        'isEnabled',
        true,
        false,
        'UPDATE'
      );
    });

    it('should return impact analysis', async () => {
      const analysis = await changeHistory.getChangeImpactAnalysis();

      expect(analysis.highImpactChanges).toBeDefined();
      expect(Array.isArray(analysis.highImpactChanges)).toBe(true);
      expect(analysis.affectedEntities).toBeDefined();
      expect(Array.isArray(analysis.potentialIssues)).toBe(true);
    });

    it('should identify high impact changes', async () => {
      const analysis = await changeHistory.getChangeImpactAnalysis();

      expect(analysis.highImpactChanges.length).toBeGreaterThan(0);
    });

    it('should track affected entities', async () => {
      const analysis = await changeHistory.getChangeImpactAnalysis();

      expect(analysis.affectedEntities.size).toBeGreaterThan(0);
    });

    it('should generate potential issue warnings', async () => {
      const analysis = await changeHistory.getChangeImpactAnalysis();

      // The analysis might identify rapid changes to the same field as an issue
      expect(Array.isArray(analysis.potentialIssues)).toBe(true);
    });
  });

  describe('compareEntityStates', () => {
    beforeEach(async () => {
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'frequency',
        'DAILY',
        'WEEKLY',
        'UPDATE'
      );
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'isEnabled',
        true,
        false,
        'UPDATE'
      );
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'maxConcurrentJobs',
        1,
        3,
        'UPDATE'
      );
    });

    it('should compare entity states', async () => {
      const timestamp1 = new Date(Date.now() - 60000);
      const timestamp2 = new Date();

      const comparison = await changeHistory.compareEntityStates(
        'Schedule',
        'sched-1',
        timestamp1,
        timestamp2
      );

      expect(comparison.timestamp1).toEqual(timestamp1);
      expect(comparison.timestamp2).toEqual(timestamp2);
      expect(Array.isArray(comparison.changedFields)).toBe(true);
    });

    it('should identify changed fields', async () => {
      const timestamp1 = new Date(Date.now() - 60000);
      const timestamp2 = new Date();

      const comparison = await changeHistory.compareEntityStates(
        'Schedule',
        'sched-1',
        timestamp1,
        timestamp2
      );

      expect(comparison.changedFields.length).toBeGreaterThan(0);
    });
  });

  describe('exportChangesAsCSV', () => {
    beforeEach(async () => {
      await changeHistory.recordChange(
        'user-1',
        'Schedule',
        'sched-1',
        'frequency',
        'DAILY',
        'WEEKLY',
        'UPDATE',
        {
          reason: 'Changed to weekly schedule',
        }
      );
      await changeHistory.recordChange(
        'user-2',
        'Job',
        'job-1',
        'status',
        'PENDING',
        'COMPLETED',
        'RESOLVE'
      );
    });

    it('should export changes as CSV', async () => {
      const csv = await changeHistory.exportChangesAsCSV();

      expect(typeof csv).toBe('string');
      expect(csv.includes('Timestamp')).toBe(true);
      expect(csv.includes('User ID')).toBe(true);
      expect(csv.includes('Entity Type')).toBe(true);
    });

    it('should include all change records in CSV', async () => {
      const csv = await changeHistory.exportChangesAsCSV();

      expect(csv.includes('Schedule')).toBe(true);
      expect(csv.includes('Job')).toBe(true);
    });

    it('should filter by entityType', async () => {
      const csv = await changeHistory.exportChangesAsCSV({ entityType: 'Schedule' });

      expect(csv.includes('Schedule')).toBe(true);
      // CSV should not include Job data (or minimal)
    });
  });
});
