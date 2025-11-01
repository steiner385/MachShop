/**
 * Conflict Resolution Service
 * Issue #60: Phase 15 - Bi-directional Real-time Sync
 *
 * Handles conflict resolution during bi-directional sync operations.
 */

import { logger } from '../../../utils/logger';

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  SOURCE_PRIORITY = 'SOURCE_PRIORITY',
  TARGET_PRIORITY = 'TARGET_PRIORITY',
  CUSTOM = 'CUSTOM',
  MANUAL = 'MANUAL',
}

/**
 * Conflict record
 */
export interface Conflict {
  id: string;
  operationId: string;
  entityType: string;
  entityId: string;
  fieldName: string;
  sourceValue: any;
  targetValue: any;
  sourceSystem: 'ERP' | 'MES';
  targetSystem: 'ERP' | 'MES';
  sourceTimestamp: Date;
  targetTimestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'UNRESOLVED' | 'RESOLVED' | 'APPROVED' | 'REJECTED';
  resolution?: 'SOURCE' | 'TARGET' | 'CUSTOM';
  resolvedValue?: any;
  resolvedBy?: string;
  resolvedAt?: Date;
  notes?: string;
  createdAt: Date;
}

/**
 * Resolution rule
 */
export interface ResolutionRule {
  id: string;
  entityType: string;
  fieldName: string;
  condition?: (source: any, target: any) => boolean;
  strategy: ConflictResolutionStrategy;
  customResolver?: (source: any, target: any) => any;
  enabled: boolean;
  priority: number;
}

/**
 * Conflict Resolution Service
 */
export class ConflictResolutionService {
  private conflicts: Map<string, Conflict> = new Map();
  private resolutionRules: Map<string, ResolutionRule> = new Map();
  private conflictCounter = 0;
  private ruleCounter = 0;

  /**
   * Create a conflict record
   */
  async createConflict(
    operationId: string,
    entityType: string,
    entityId: string,
    fieldName: string,
    sourceValue: any,
    targetValue: any,
    sourceSystem: 'ERP' | 'MES',
    targetSystem: 'ERP' | 'MES',
    sourceTimestamp: Date,
    targetTimestamp: Date,
    options?: {
      severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      notes?: string;
    }
  ): Promise<Conflict> {
    try {
      const id = `conflict-${Date.now()}-${++this.conflictCounter}`;

      // Determine severity based on field and value difference
      const severity = options?.severity || this.determineSeverity(fieldName, sourceValue, targetValue);

      const conflict: Conflict = {
        id,
        operationId,
        entityType,
        entityId,
        fieldName,
        sourceValue,
        targetValue,
        sourceSystem,
        targetSystem,
        sourceTimestamp,
        targetTimestamp,
        severity,
        status: 'UNRESOLVED',
        notes: options?.notes,
        createdAt: new Date(),
      };

      this.conflicts.set(id, conflict);

      logger.info('Conflict created', {
        conflictId: id,
        operationId,
        entityType,
        entityId,
        fieldName,
        severity,
      });

      return conflict;
    } catch (error) {
      logger.error('Failed to create conflict', {
        error: error instanceof Error ? error.message : String(error),
        operationId,
        fieldName,
      });
      throw error;
    }
  }

  /**
   * Register a resolution rule
   */
  async registerResolutionRule(rule: ResolutionRule): Promise<void> {
    try {
      const ruleId = `resolution-rule-${Date.now()}-${++this.ruleCounter}`;

      this.resolutionRules.set(ruleId, rule);

      logger.info('Resolution rule registered', {
        ruleId,
        entityType: rule.entityType,
        fieldName: rule.fieldName,
        strategy: rule.strategy,
        priority: rule.priority,
      });
    } catch (error) {
      logger.error('Failed to register resolution rule', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resolve a conflict automatically
   */
  async resolveConflict(
    conflictId: string,
    strategy: ConflictResolutionStrategy,
    options?: {
      customValue?: any;
      resolvedBy?: string;
      notes?: string;
    }
  ): Promise<Conflict | null> {
    try {
      const conflict = this.conflicts.get(conflictId);

      if (!conflict) {
        return null;
      }

      let resolvedValue: any;
      let resolution: 'SOURCE' | 'TARGET' | 'CUSTOM';

      // Determine resolved value based on strategy
      switch (strategy) {
        case ConflictResolutionStrategy.LAST_WRITE_WINS:
          if (conflict.sourceTimestamp >= conflict.targetTimestamp) {
            resolvedValue = conflict.sourceValue;
            resolution = 'SOURCE';
          } else {
            resolvedValue = conflict.targetValue;
            resolution = 'TARGET';
          }
          break;

        case ConflictResolutionStrategy.SOURCE_PRIORITY:
          resolvedValue = conflict.sourceValue;
          resolution = 'SOURCE';
          break;

        case ConflictResolutionStrategy.TARGET_PRIORITY:
          resolvedValue = conflict.targetValue;
          resolution = 'TARGET';
          break;

        case ConflictResolutionStrategy.CUSTOM:
          if (!options?.customValue) {
            throw new Error('Custom value required for CUSTOM strategy');
          }
          resolvedValue = options.customValue;
          resolution = 'CUSTOM';
          break;

        default:
          throw new Error(`Unknown resolution strategy: ${strategy}`);
      }

      conflict.resolution = resolution;
      conflict.resolvedValue = resolvedValue;
      conflict.resolvedBy = options?.resolvedBy || 'SYSTEM';
      conflict.resolvedAt = new Date();
      conflict.status = 'RESOLVED';
      conflict.notes = options?.notes;

      logger.info('Conflict resolved', {
        conflictId,
        strategy,
        resolution,
        resolvedValue,
        resolvedBy: conflict.resolvedBy,
      });

      return conflict;
    } catch (error) {
      logger.error('Failed to resolve conflict', {
        error: error instanceof Error ? error.message : String(error),
        conflictId,
      });
      throw error;
    }
  }

  /**
   * Approve a conflict resolution
   */
  async approveResolution(
    conflictId: string,
    approvedBy: string,
    options?: {
      notes?: string;
    }
  ): Promise<Conflict | null> {
    try {
      const conflict = this.conflicts.get(conflictId);

      if (!conflict) {
        return null;
      }

      if (conflict.status !== 'RESOLVED') {
        throw new Error('Only resolved conflicts can be approved');
      }

      conflict.status = 'APPROVED';
      conflict.resolvedBy = approvedBy;
      conflict.resolvedAt = new Date();
      if (options?.notes) {
        conflict.notes = options.notes;
      }

      logger.info('Conflict resolution approved', {
        conflictId,
        approvedBy,
      });

      return conflict;
    } catch (error) {
      logger.error('Failed to approve resolution', {
        error: error instanceof Error ? error.message : String(error),
        conflictId,
      });
      throw error;
    }
  }

  /**
   * Reject a conflict resolution
   */
  async rejectResolution(
    conflictId: string,
    rejectedBy: string,
    reason: string
  ): Promise<Conflict | null> {
    try {
      const conflict = this.conflicts.get(conflictId);

      if (!conflict) {
        return null;
      }

      conflict.status = 'REJECTED';
      conflict.notes = reason;
      conflict.resolvedBy = rejectedBy;

      logger.info('Conflict resolution rejected', {
        conflictId,
        rejectedBy,
        reason,
      });

      return conflict;
    } catch (error) {
      logger.error('Failed to reject resolution', {
        error: error instanceof Error ? error.message : String(error),
        conflictId,
      });
      throw error;
    }
  }

  /**
   * Get conflicts
   */
  async getConflicts(options?: {
    operationId?: string;
    entityType?: string;
    entityId?: string;
    status?: 'UNRESOLVED' | 'RESOLVED' | 'APPROVED' | 'REJECTED';
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    limit?: number;
    offset?: number;
  }): Promise<{ conflicts: Conflict[]; total: number }> {
    try {
      let conflicts = Array.from(this.conflicts.values());

      if (options?.operationId) {
        conflicts = conflicts.filter((c) => c.operationId === options.operationId);
      }
      if (options?.entityType) {
        conflicts = conflicts.filter((c) => c.entityType === options.entityType);
      }
      if (options?.entityId) {
        conflicts = conflicts.filter((c) => c.entityId === options.entityId);
      }
      if (options?.status) {
        conflicts = conflicts.filter((c) => c.status === options.status);
      }
      if (options?.severity) {
        conflicts = conflicts.filter((c) => c.severity === options.severity);
      }

      // Sort by severity and creation date
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      conflicts.sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      const total = conflicts.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const sliced = conflicts.slice(offset, offset + limit);

      return { conflicts: sliced, total };
    } catch (error) {
      logger.error('Failed to get conflicts', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get conflict statistics
   */
  async getConflictStatistics(options?: {
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalConflicts: number;
    unresolvedConflicts: number;
    resolvedConflicts: number;
    approvedConflicts: number;
    rejectedConflicts: number;
    conflictsByStatus: Record<string, number>;
    conflictsBySeverity: Record<string, number>;
    resolutionRate: number;
  }> {
    try {
      let conflicts = Array.from(this.conflicts.values());

      if (options?.entityType) {
        conflicts = conflicts.filter((c) => c.entityType === options.entityType);
      }

      if (options?.startDate) {
        conflicts = conflicts.filter((c) => c.createdAt >= options.startDate!);
      }

      if (options?.endDate) {
        conflicts = conflicts.filter((c) => c.createdAt <= options.endDate!);
      }

      const unresolved = conflicts.filter((c) => c.status === 'UNRESOLVED').length;
      const resolved = conflicts.filter((c) => c.status === 'RESOLVED').length;
      const approved = conflicts.filter((c) => c.status === 'APPROVED').length;
      const rejected = conflicts.filter((c) => c.status === 'REJECTED').length;

      // Count by status
      const conflictsByStatus: Record<string, number> = {};
      conflicts.forEach((c) => {
        conflictsByStatus[c.status] = (conflictsByStatus[c.status] || 0) + 1;
      });

      // Count by severity
      const conflictsBySeverity: Record<string, number> = {};
      conflicts.forEach((c) => {
        conflictsBySeverity[c.severity] = (conflictsBySeverity[c.severity] || 0) + 1;
      });

      const resolutionRate =
        conflicts.length > 0 ? ((resolved + approved + rejected) / conflicts.length) * 100 : 100;

      return {
        totalConflicts: conflicts.length,
        unresolvedConflicts: unresolved,
        resolvedConflicts: resolved,
        approvedConflicts: approved,
        rejectedConflicts: rejected,
        conflictsByStatus,
        conflictsBySeverity,
        resolutionRate,
      };
    } catch (error) {
      logger.error('Failed to get conflict statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Find applicable resolution rule
   */
  async findApplicableRule(
    entityType: string,
    fieldName: string,
    sourceValue: any,
    targetValue: any
  ): Promise<ResolutionRule | null> {
    try {
      let rules = Array.from(this.resolutionRules.values()).filter(
        (r) => r.entityType === entityType && r.fieldName === fieldName && r.enabled
      );

      // Sort by priority
      rules.sort((a, b) => b.priority - a.priority);

      // Find first matching rule
      for (const rule of rules) {
        if (!rule.condition || rule.condition(sourceValue, targetValue)) {
          return rule;
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to find applicable rule', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
        fieldName,
      });
      throw error;
    }
  }

  /**
   * Determine conflict severity
   */
  private determineSeverity(
    fieldName: string,
    sourceValue: any,
    targetValue: any
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Critical fields
    const criticalFields = ['id', 'entityId', 'status', 'quantity', 'price', 'amount'];
    if (criticalFields.some((f) => fieldName.toLowerCase().includes(f.toLowerCase()))) {
      return 'CRITICAL';
    }

    // High priority fields
    const highFields = ['name', 'description', 'date', 'revision', 'version'];
    if (highFields.some((f) => fieldName.toLowerCase().includes(f.toLowerCase()))) {
      return 'HIGH';
    }

    // Check value difference magnitude
    if (typeof sourceValue === 'number' && typeof targetValue === 'number') {
      const diff = Math.abs(sourceValue - targetValue);
      const maxVal = Math.max(Math.abs(sourceValue), Math.abs(targetValue));
      const percentDiff = maxVal > 0 ? (diff / maxVal) * 100 : 0;

      if (percentDiff > 20) {
        return 'MEDIUM';
      }
    }

    return 'LOW';
  }
}

export default ConflictResolutionService;
