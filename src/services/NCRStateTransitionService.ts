/**
 * ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States & Disposition Management
 * NCR State Transition Service - Phase 1-2
 *
 * Manages NCR state transitions with validation against workflow configurations
 * Creates audit trail through state history records
 */

import {
  NonConformanceReportEnhanced,
  NonConformanceReport,
  NCRStatus,
  NCRSeverity,
  NCRStateHistory,
} from '@/types/quality';
import { NCRWorkflowConfigService } from './NCRWorkflowConfigService';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of validating a state transition
 */
export interface TransitionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * NCRStateTransitionService
 * Manages all state transitions with comprehensive validation
 */
export class NCRStateTransitionService {
  private configService: NCRWorkflowConfigService;

  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.configService = new NCRWorkflowConfigService(prisma);
  }

  /**
   * Validate a state transition
   */
  async validateTransition(
    ncrId: string,
    currentStatus: NCRStatus,
    toStatus: NCRStatus,
    siteId: string,
    severity: NCRSeverity
  ): Promise<TransitionValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate states are different
    if (currentStatus === toStatus) {
      errors.push(`Cannot transition to the same status: ${toStatus}`);
    }

    // Check if transition is allowed
    const isAllowed = await this.configService.isTransitionAllowed(siteId, severity, currentStatus, toStatus);
    if (!isAllowed) {
      errors.push(`Transition from ${currentStatus} to ${toStatus} is not allowed for ${severity} NCRs`);
    }

    // Additional validation for specific transitions
    if (toStatus === NCRStatus.CLOSED && currentStatus !== NCRStatus.VERIFICATION) {
      warnings.push(`Closing NCR from ${currentStatus} state may skip verification step`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transition NCR to a new state
   * Creates state history record and returns updated NCR
   */
  async transitionState(
    ncr: NonConformanceReport,
    toStatus: NCRStatus,
    changedBy: string,
    reason?: string,
    siteId?: string
  ): Promise<NonConformanceReportEnhanced> {
    // Use provided siteId or default to 'DEFAULT'
    const currentSiteId = siteId || 'DEFAULT';

    // Validate the transition
    const validation = await this.validateTransition(
      ncr.id,
      ncr.status as NCRStatus,
      toStatus,
      currentSiteId,
      ncr.severity
    );

    if (!validation.valid) {
      throw new Error(`State transition validation failed: ${validation.errors.join(', ')}`);
    }

    // Create state history record
    const stateHistory: NCRStateHistory = {
      id: uuidv4(),
      ncrId: ncr.id,
      fromStatus: ncr.status as NCRStatus,
      toStatus,
      changedBy,
      changedAt: new Date(),
      reason,
    };

    // Save state history to database
    await this.prisma?.nCRStateHistory.create({
      data: {
        id: stateHistory.id,
        ncrId: stateHistory.ncrId,
        fromStatus: stateHistory.fromStatus,
        toStatus: stateHistory.toStatus,
        changedBy: stateHistory.changedBy,
        changedAt: stateHistory.changedAt,
        reason: stateHistory.reason,
      },
    });

    // Create enhanced NCR with updated status and history
    const enhancedNCR: NonConformanceReportEnhanced = {
      ...ncr,
      status: toStatus,
      stateHistory: [stateHistory],
      approvalRequests: [],
      lastModifiedBy: changedBy,
      lastModifiedAt: new Date(),
    };

    return enhancedNCR;
  }

  /**
   * Perform bulk state transitions
   */
  async bulkTransitionState(
    ncrIds: string[],
    toStatus: NCRStatus,
    changedBy: string,
    ncrs: NonConformanceReport[],
    siteId?: string
  ): Promise<NonConformanceReportEnhanced[]> {
    const results: NonConformanceReportEnhanced[] = [];
    const failures: { ncrId: string; error: string }[] = [];

    for (const ncr of ncrs) {
      try {
        const result = await this.transitionState(ncr, toStatus, changedBy, undefined, siteId);
        results.push(result);
      } catch (error) {
        failures.push({
          ncrId: ncr.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (failures.length > 0) {
      console.warn(`Bulk transition completed with ${failures.length} failures:`, failures);
    }

    return results;
  }

  /**
   * Get state history for an NCR
   */
  async getStateHistory(ncrId: string): Promise<NCRStateHistory[]> {
    const history = await this.prisma?.nCRStateHistory.findMany({
      where: { ncrId },
      orderBy: { changedAt: 'asc' },
    });

    return history || [];
  }

  /**
   * Get state transition statistics
   */
  async getTransitionStats(siteId: string, severity: NCRSeverity): Promise<{
    totalTransitions: number;
    transitionCounts: Record<string, number>;
    averageTimeInState: Record<NCRStatus, number>; // in milliseconds
  }> {
    const history = await this.prisma?.nCRStateHistory.findMany({
      where: {
        // Filter would need siteId/severity association with NCR
      },
      orderBy: { changedAt: 'desc' },
      take: 1000,
    });

    if (!history || history.length === 0) {
      return {
        totalTransitions: 0,
        transitionCounts: {},
        averageTimeInState: {},
      };
    }

    // Calculate transition counts
    const transitionCounts: Record<string, number> = {};
    for (const record of history) {
      const key = `${record.fromStatus}->${record.toStatus}`;
      transitionCounts[key] = (transitionCounts[key] || 0) + 1;
    }

    // Calculate average time in each state
    const timeInStates: Record<NCRStatus, number[]> = {} as Record<NCRStatus, number[]>;
    for (let i = 0; i < history.length - 1; i++) {
      const current = history[i];
      const next = history[i + 1];

      if (current.toStatus === next.fromStatus) {
        const timeInMs = next.changedAt.getTime() - current.changedAt.getTime();
        if (!timeInStates[current.toStatus]) {
          timeInStates[current.toStatus] = [];
        }
        timeInStates[current.toStatus].push(timeInMs);
      }
    }

    const averageTimeInState: Record<NCRStatus, number> = {} as Record<NCRStatus, number>;
    for (const [status, times] of Object.entries(timeInStates)) {
      const average = times.reduce((a, b) => a + b, 0) / times.length;
      averageTimeInState[status as NCRStatus] = average;
    }

    return {
      totalTransitions: history.length,
      transitionCounts,
      averageTimeInState,
    };
  }

  /**
   * Get the path of state transitions for an NCR
   */
  async getTransitionPath(ncrId: string): Promise<NCRStatus[]> {
    const history = await this.getStateHistory(ncrId);
    const path: NCRStatus[] = [];

    for (const record of history) {
      if (path.length === 0) {
        path.push(record.fromStatus);
      }
      path.push(record.toStatus);
    }

    return path;
  }

  /**
   * Check if NCR has been in a specific state
   */
  async hasBeenInState(ncrId: string, status: NCRStatus): Promise<boolean> {
    const history = await this.getStateHistory(ncrId);
    return history.some(h => h.fromStatus === status || h.toStatus === status);
  }

  /**
   * Get time spent in a specific state (in milliseconds)
   */
  async getTimeInState(ncrId: string, status: NCRStatus): Promise<number> {
    const history = await this.getStateHistory(ncrId);

    let enterTime: Date | null = null;
    let totalTime = 0;

    for (const record of history) {
      if (record.toStatus === status && enterTime === null) {
        enterTime = record.changedAt;
      }

      if (record.fromStatus === status && enterTime !== null) {
        totalTime += record.changedAt.getTime() - enterTime.getTime();
        enterTime = null;
      }
    }

    // If still in the state, add time until now
    if (enterTime !== null) {
      totalTime += Date.now() - enterTime.getTime();
    }

    return totalTime;
  }

  /**
   * Restore an NCR to a previous state (only if allowed)
   * Used for rare cases where incorrect transition was made
   */
  async revertToPreviousState(
    ncr: NonConformanceReport,
    revertedBy: string,
    reason: string,
    siteId?: string
  ): Promise<NonConformanceReportEnhanced> {
    const history = await this.getStateHistory(ncr.id);

    if (history.length < 2) {
      throw new Error('Cannot revert: No previous state to restore to');
    }

    // Get the second-to-last state (the one before the current state)
    const previousStateRecord = history[history.length - 1];
    const previousStatus = previousStateRecord.fromStatus;

    // Validate the revert is allowed
    const validation = await this.validateTransition(
      ncr.id,
      ncr.status as NCRStatus,
      previousStatus,
      siteId || 'DEFAULT',
      ncr.severity
    );

    if (!validation.valid) {
      throw new Error(`Cannot revert to ${previousStatus}: ${validation.errors.join(', ')}`);
    }

    // Create revert history record
    const revertRecord: NCRStateHistory = {
      id: uuidv4(),
      ncrId: ncr.id,
      fromStatus: ncr.status as NCRStatus,
      toStatus: previousStatus,
      changedBy: revertedBy,
      changedAt: new Date(),
      reason: `Revert: ${reason}`,
    };

    await this.prisma?.nCRStateHistory.create({
      data: {
        id: revertRecord.id,
        ncrId: revertRecord.ncrId,
        fromStatus: revertRecord.fromStatus,
        toStatus: revertRecord.toStatus,
        changedBy: revertRecord.changedBy,
        changedAt: revertRecord.changedAt,
        reason: revertRecord.reason,
      },
    });

    return {
      ...ncr,
      status: previousStatus,
      stateHistory: [...history, revertRecord],
      approvalRequests: [],
      lastModifiedBy: revertedBy,
      lastModifiedAt: new Date(),
    };
  }

  /**
   * Close connection to database
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}
