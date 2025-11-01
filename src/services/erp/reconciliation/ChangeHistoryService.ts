/**
 * Change History Service
 * Issue #60: Phase 14 - Audit Trail & Change History
 *
 * Provides detailed analysis and historical tracking of reconciliation changes.
 */

import { logger } from '../../../utils/logger';
import { AuditTrailService, AuditEvent, AuditEventType } from './AuditTrailService';

/**
 * Change record
 */
export interface Change {
  id: string;
  timestamp: Date;
  userId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  previousValue: any;
  newValue: any;
  changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESOLVE';
  reason?: string;
  impact?: string;
}

/**
 * Change summary
 */
export interface ChangeSummary {
  entityType: string;
  entityId: string;
  totalChanges: number;
  uniqueUsers: number;
  firstChange: Date;
  lastChange: Date;
  changes: Change[];
}

/**
 * Timeline entry
 */
export interface TimelineEntry {
  timestamp: Date;
  userId: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string;
  status: 'SUCCESS' | 'FAILURE';
}

/**
 * Change History Service
 */
export class ChangeHistoryService {
  private auditTrail: AuditTrailService;
  private changes: Map<string, Change> = new Map();
  private changeCounter = 0;

  constructor(auditTrail?: AuditTrailService) {
    this.auditTrail = auditTrail || new AuditTrailService();
  }

  /**
   * Record a change
   */
  async recordChange(
    userId: string,
    entityType: string,
    entityId: string,
    fieldName: string,
    previousValue: any,
    newValue: any,
    changeType: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESOLVE',
    options?: {
      reason?: string;
      impact?: string;
    }
  ): Promise<Change> {
    try {
      const id = `change-${Date.now()}-${++this.changeCounter}`;

      const change: Change = {
        id,
        timestamp: new Date(),
        userId,
        entityType,
        entityId,
        fieldName,
        previousValue,
        newValue,
        changeType,
        reason: options?.reason,
        impact: options?.impact,
      };

      this.changes.set(id, change);

      logger.info('Change recorded', {
        changeId: id,
        entityType,
        entityId,
        fieldName,
        changeType,
        userId,
      });

      return change;
    } catch (error) {
      logger.error('Failed to record change', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
        entityId,
        fieldName,
      });
      throw error;
    }
  }

  /**
   * Get change summary for an entity
   */
  async getChangeSummary(
    entityType: string,
    entityId: string
  ): Promise<ChangeSummary | null> {
    try {
      const entityChanges = Array.from(this.changes.values()).filter(
        (c) => c.entityType === entityType && c.entityId === entityId
      );

      if (entityChanges.length === 0) {
        return null;
      }

      // Sort by timestamp
      entityChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Get unique users
      const uniqueUsers = new Set(entityChanges.map((c) => c.userId)).size;

      return {
        entityType,
        entityId,
        totalChanges: entityChanges.length,
        uniqueUsers,
        firstChange: entityChanges[0].timestamp,
        lastChange: entityChanges[entityChanges.length - 1].timestamp,
        changes: entityChanges,
      };
    } catch (error) {
      logger.error('Failed to get change summary', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Get timeline for an entity
   */
  async getEntityTimeline(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<TimelineEntry[]> {
    try {
      const auditEvents = await this.auditTrail.getEntityHistory(entityType, entityId, limit);

      const timeline: TimelineEntry[] = auditEvents.map((event) => ({
        timestamp: event.createdAt,
        userId: event.userId,
        action: event.action,
        description: event.description,
        entityType: event.entityType,
        entityId: event.entityId,
        status: event.status,
      }));

      return timeline;
    } catch (error) {
      logger.error('Failed to get entity timeline', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Get change statistics
   */
  async getChangeStatistics(options?: {
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalChanges: number;
    changesByType: Record<string, number>;
    changesByField: Record<string, number>;
    uniqueUsers: number;
    mostActiveUser: { userId: string; changeCount: number } | null;
    mostChangedField: { field: string; changeCount: number } | null;
  }> {
    try {
      let allChanges = Array.from(this.changes.values());

      if (options?.entityType) {
        allChanges = allChanges.filter((c) => c.entityType === options.entityType);
      }

      if (options?.startDate) {
        allChanges = allChanges.filter((c) => c.timestamp >= options.startDate!);
      }

      if (options?.endDate) {
        allChanges = allChanges.filter((c) => c.timestamp <= options.endDate!);
      }

      // Count by type
      const changesByType: Record<string, number> = {};
      allChanges.forEach((c) => {
        changesByType[c.changeType] = (changesByType[c.changeType] || 0) + 1;
      });

      // Count by field
      const changesByField: Record<string, number> = {};
      allChanges.forEach((c) => {
        changesByField[c.fieldName] = (changesByField[c.fieldName] || 0) + 1;
      });

      // Unique users
      const uniqueUsers = new Set(allChanges.map((c) => c.userId)).size;

      // Most active user
      const userChangeCounts: Record<string, number> = {};
      allChanges.forEach((c) => {
        userChangeCounts[c.userId] = (userChangeCounts[c.userId] || 0) + 1;
      });
      const mostActiveUser = Object.entries(userChangeCounts).sort(([, a], [, b]) => b - a)[0];

      // Most changed field
      const mostChangedFieldEntry = Object.entries(changesByField).sort(
        ([, a], [, b]) => b - a
      )[0];

      return {
        totalChanges: allChanges.length,
        changesByType,
        changesByField,
        uniqueUsers,
        mostActiveUser: mostActiveUser
          ? { userId: mostActiveUser[0], changeCount: mostActiveUser[1] }
          : null,
        mostChangedField: mostChangedFieldEntry
          ? { field: mostChangedFieldEntry[0], changeCount: mostChangedFieldEntry[1] }
          : null,
      };
    } catch (error) {
      logger.error('Failed to get change statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get change impact analysis
   */
  async getChangeImpactAnalysis(options?: {
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    highImpactChanges: Change[];
    affectedEntities: Map<string, number>;
    potentialIssues: string[];
  }> {
    try {
      let allChanges = Array.from(this.changes.values());

      if (options?.entityType) {
        allChanges = allChanges.filter((c) => c.entityType === options.entityType);
      }

      if (options?.startDate) {
        allChanges = allChanges.filter((c) => c.timestamp >= options.startDate!);
      }

      if (options?.endDate) {
        allChanges = allChanges.filter((c) => c.timestamp <= options.endDate!);
      }

      // Get high impact changes
      const highImpactChanges = allChanges.filter(
        (c) => c.impact && ['HIGH', 'CRITICAL'].includes(c.impact.toUpperCase())
      );

      // Count affected entities
      const affectedEntities = new Map<string, number>();
      allChanges.forEach((c) => {
        const key = `${c.entityType}:${c.entityId}`;
        affectedEntities.set(key, (affectedEntities.get(key) || 0) + 1);
      });

      // Identify potential issues
      const potentialIssues: string[] = [];

      // Check for conflicting changes
      const fieldChanges: Record<string, Change[]> = {};
      allChanges.forEach((c) => {
        const key = `${c.entityType}:${c.entityId}:${c.fieldName}`;
        if (!fieldChanges[key]) fieldChanges[key] = [];
        fieldChanges[key].push(c);
      });

      Object.entries(fieldChanges).forEach(([key, changes]) => {
        if (changes.length > 2) {
          potentialIssues.push(`Field ${key} changed ${changes.length} times - possible instability`);
        }
      });

      // Check for rapid changes by same user
      const userChangeTimes: Record<string, number[]> = {};
      allChanges.forEach((c) => {
        if (!userChangeTimes[c.userId]) userChangeTimes[c.userId] = [];
        userChangeTimes[c.userId].push(c.timestamp.getTime());
      });

      Object.entries(userChangeTimes).forEach(([userId, times]) => {
        for (let i = 1; i < times.length; i++) {
          if (times[i] - times[i - 1] < 1000) {
            potentialIssues.push(`User ${userId} made rapid consecutive changes`);
            break;
          }
        }
      });

      return {
        highImpactChanges,
        affectedEntities,
        potentialIssues,
      };
    } catch (error) {
      logger.error('Failed to get change impact analysis', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Compare entity states across time
   */
  async compareEntityStates(
    entityType: string,
    entityId: string,
    timestamp1: Date,
    timestamp2: Date
  ): Promise<{
    timestamp1: Date;
    timestamp2: Date;
    changedFields: Array<{
      fieldName: string;
      valueAtTime1: any;
      valueAtTime2: any;
    }>;
  }> {
    try {
      const allChanges = Array.from(this.changes.values())
        .filter((c) => c.entityType === entityType && c.entityId === entityId)
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Get field values at each timestamp
      const getStateAtTime = (time: Date): Record<string, any> => {
        const state: Record<string, any> = {};

        for (const change of allChanges) {
          if (change.timestamp <= time) {
            state[change.fieldName] = change.newValue;
          }
        }

        return state;
      };

      const state1 = getStateAtTime(timestamp1);
      const state2 = getStateAtTime(timestamp2);

      // Find changed fields
      const changedFields: Array<{
        fieldName: string;
        valueAtTime1: any;
        valueAtTime2: any;
      }> = [];

      const allFields = new Set([...Object.keys(state1), ...Object.keys(state2)]);
      allFields.forEach((field) => {
        if (state1[field] !== state2[field]) {
          changedFields.push({
            fieldName: field,
            valueAtTime1: state1[field],
            valueAtTime2: state2[field],
          });
        }
      });

      return {
        timestamp1,
        timestamp2,
        changedFields,
      };
    } catch (error) {
      logger.error('Failed to compare entity states', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Export change history as CSV
   */
  async exportChangesAsCSV(options?: {
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<string> {
    try {
      let allChanges = Array.from(this.changes.values());

      if (options?.entityType) {
        allChanges = allChanges.filter((c) => c.entityType === options.entityType);
      }

      if (options?.startDate) {
        allChanges = allChanges.filter((c) => c.timestamp >= options.startDate!);
      }

      if (options?.endDate) {
        allChanges = allChanges.filter((c) => c.timestamp <= options.endDate!);
      }

      // Sort by timestamp
      allChanges.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // CSV header
      const headers = [
        'Timestamp',
        'User ID',
        'Entity Type',
        'Entity ID',
        'Field Name',
        'Previous Value',
        'New Value',
        'Change Type',
        'Reason',
        'Impact',
      ];

      const rows = allChanges.map((c) => [
        c.timestamp.toISOString(),
        c.userId,
        c.entityType,
        c.entityId,
        c.fieldName,
        JSON.stringify(c.previousValue),
        JSON.stringify(c.newValue),
        c.changeType,
        c.reason || '',
        c.impact || '',
      ]);

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row) =>
          row.map((cell) => (typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell)).join(',')
        ),
      ].join('\n');

      return csvContent;
    } catch (error) {
      logger.error('Failed to export changes as CSV', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default ChangeHistoryService;
