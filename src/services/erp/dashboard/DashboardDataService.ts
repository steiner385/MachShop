/**
 * Dashboard Data Service
 * Issue #60: Phase 16 - Dashboard & Real-time Visualization
 *
 * Aggregates data from all reconciliation, sync, and job services for dashboard display.
 */

import { logger } from '../../../utils/logger';
import SyncService from '../sync/SyncService';
import SyncJobService from '../sync/SyncJobService';
import ConflictResolutionService from '../sync/ConflictResolutionService';
import AuditTrailService from '../reconciliation/AuditTrailService';

/**
 * Dashboard metric types
 */
export interface DashboardMetrics {
  timestamp: Date;
  syncStatus: {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    conflictedOperations: number;
    successRate: number;
    averageDuration: number;
  };
  jobStatus: {
    queueLength: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    successRate: number;
  };
  conflictStatus: {
    totalConflicts: number;
    unresolvedConflicts: number;
    resolvedConflicts: number;
    resolutionRate: number;
    criticalConflicts: number;
  };
  auditStatus: {
    totalEvents: number;
    criticalEvents: number;
    failureRate: number;
    eventsByType: Record<string, number>;
  };
  systemHealth: {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    issues: string[];
    recommendations: string[];
  };
}

/**
 * Dashboard alert
 */
export interface DashboardAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  category: 'SYNC' | 'CONFLICT' | 'JOB' | 'SYSTEM' | 'PERFORMANCE';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Dashboard summary
 */
export interface DashboardSummary {
  timestamp: Date;
  metrics: DashboardMetrics;
  activeAlerts: DashboardAlert[];
  recentOperations: Array<{
    id: string;
    type: string;
    status: string;
    timestamp: Date;
  }>;
  topIssues: Array<{
    issue: string;
    count: number;
    severity: string;
  }>;
}

/**
 * Dashboard Data Service
 */
export class DashboardDataService {
  private syncService: SyncService;
  private jobService: SyncJobService;
  private conflictService: ConflictResolutionService;
  private auditService: AuditTrailService;
  private alerts: Map<string, DashboardAlert> = new Map();
  private alertCounter = 0;

  constructor(
    syncService?: SyncService,
    jobService?: SyncJobService,
    conflictService?: ConflictResolutionService,
    auditService?: AuditTrailService
  ) {
    this.syncService = syncService || new SyncService();
    this.jobService = jobService || new SyncJobService();
    this.conflictService = conflictService || new ConflictResolutionService();
    this.auditService = auditService || new AuditTrailService();
  }

  /**
   * Get comprehensive dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const timestamp = new Date();
      const metrics = await this.getMetrics();
      const activeAlerts = this.getActiveAlerts();
      const recentOperations = await this.getRecentOperations();
      const topIssues = await this.getTopIssues();

      const summary: DashboardSummary = {
        timestamp,
        metrics,
        activeAlerts,
        recentOperations,
        topIssues,
      };

      return summary;
    } catch (error) {
      logger.error('Failed to get dashboard summary', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get metrics
   */
  async getMetrics(): Promise<DashboardMetrics> {
    try {
      const syncStats = await this.syncService.getSyncStatistics();
      const jobStats = await this.jobService.getJobStatistics();
      const conflictStats = await this.conflictService.getConflictStatistics();
      const auditStats = await this.auditService.getStatistics();

      // Calculate system health
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (syncStats.successRate < 95) {
        issues.push('Sync success rate below 95%');
        recommendations.push('Review failed sync operations and check system logs');
      }

      if (conflictStats.unresolvedConflicts > 10) {
        issues.push(`${conflictStats.unresolvedConflicts} unresolved conflicts`);
        recommendations.push('Review and resolve pending conflicts');
      }

      if (jobStats.failedJobs > 5) {
        issues.push(`${jobStats.failedJobs} failed jobs in queue`);
        recommendations.push('Check job execution logs and retry failed jobs');
      }

      if (auditStats.failureRate > 10) {
        issues.push('High failure rate in audit operations');
        recommendations.push('Investigate system performance and audit service health');
      }

      let systemStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
      if (issues.length > 2) {
        systemStatus = 'UNHEALTHY';
      } else if (issues.length > 0) {
        systemStatus = 'DEGRADED';
      }

      const metrics: DashboardMetrics = {
        timestamp: new Date(),
        syncStatus: {
          totalOperations: syncStats.totalSyncs,
          successfulOperations: syncStats.successfulSyncs,
          failedOperations: syncStats.failedSyncs,
          conflictedOperations: syncStats.conflictedSyncs,
          successRate: syncStats.successRate,
          averageDuration: syncStats.averageDuration,
        },
        jobStatus: {
          queueLength: jobStats.totalJobs,
          completedJobs: jobStats.completedJobs,
          failedJobs: jobStats.failedJobs,
          pendingJobs: jobStats.pendingJobs,
          successRate: jobStats.successRate,
        },
        conflictStatus: {
          totalConflicts: conflictStats.totalConflicts,
          unresolvedConflicts: conflictStats.unresolvedConflicts,
          resolvedConflicts: conflictStats.resolvedConflicts,
          resolutionRate: conflictStats.resolutionRate,
          criticalConflicts: Object.values(conflictStats.conflictsBySeverity).reduce(
            (sum: number, count: number) => sum + (count || 0),
            0
          ),
        },
        auditStatus: {
          totalEvents: auditStats.totalEvents,
          criticalEvents: auditStats.criticalEvents,
          failureRate: ((auditStats.failedEvents / auditStats.totalEvents) * 100) || 0,
          eventsByType: auditStats.eventsByType,
        },
        systemHealth: {
          status: systemStatus,
          issues,
          recommendations,
        },
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Create an alert
   */
  async createAlert(
    severity: 'INFO' | 'WARNING' | 'CRITICAL',
    category: 'SYNC' | 'CONFLICT' | 'JOB' | 'SYSTEM' | 'PERFORMANCE',
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<DashboardAlert> {
    try {
      const id = `alert-${Date.now()}-${++this.alertCounter}`;

      const alert: DashboardAlert = {
        id,
        severity,
        category,
        title,
        message,
        timestamp: new Date(),
        resolved: false,
        metadata,
      };

      this.alerts.set(id, alert);

      logger.info('Alert created', {
        alertId: id,
        severity,
        category,
        title,
      });

      return alert;
    } catch (error) {
      logger.error('Failed to create alert', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<DashboardAlert | null> {
    try {
      const alert = this.alerts.get(alertId);

      if (!alert) {
        return null;
      }

      alert.resolved = true;
      alert.resolvedAt = new Date();

      logger.info('Alert resolved', {
        alertId,
      });

      return alert;
    } catch (error) {
      logger.error('Failed to resolve alert', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): DashboardAlert[] {
    try {
      return Array.from(this.alerts.values())
        .filter((a) => !a.resolved)
        .sort((a, b) => {
          // Sort by severity (CRITICAL first)
          const severityOrder = { CRITICAL: 0, WARNING: 1, INFO: 2 };
          const severityDiff =
            severityOrder[a.severity as keyof typeof severityOrder] -
            severityOrder[b.severity as keyof typeof severityOrder];
          if (severityDiff !== 0) return severityDiff;

          // Then by timestamp (newest first)
          return b.timestamp.getTime() - a.timestamp.getTime();
        });
    } catch (error) {
      logger.error('Failed to get active alerts', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get recent operations
   */
  private async getRecentOperations(): Promise<
    Array<{
      id: string;
      type: string;
      status: string;
      timestamp: Date;
    }>
  > {
    try {
      const { operations } = await this.syncService.getSyncOperations({ limit: 10 });
      const { jobs } = await this.jobService.getJobs({ limit: 10 });

      const combined = [
        ...operations.map((op) => ({
          id: op.id,
          type: `Sync (${op.entityType})`,
          status: op.status,
          timestamp: op.createdAt,
        })),
        ...jobs.map((job) => ({
          id: job.id,
          type: `Job (${job.operationType})`,
          status: job.status,
          timestamp: job.createdAt,
        })),
      ];

      // Sort by timestamp and return top 10
      return combined.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
    } catch (error) {
      logger.error('Failed to get recent operations', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get top issues
   */
  private async getTopIssues(): Promise<
    Array<{
      issue: string;
      count: number;
      severity: string;
    }>
  > {
    try {
      const metrics = await this.getMetrics();
      const issues: Array<{
        issue: string;
        count: number;
        severity: string;
      }> = [];

      if (metrics.syncStatus.failedOperations > 0) {
        issues.push({
          issue: `Failed sync operations`,
          count: metrics.syncStatus.failedOperations,
          severity: 'WARNING',
        });
      }

      if (metrics.conflictStatus.unresolvedConflicts > 0) {
        issues.push({
          issue: `Unresolved conflicts`,
          count: metrics.conflictStatus.unresolvedConflicts,
          severity: metrics.conflictStatus.unresolvedConflicts > 10 ? 'CRITICAL' : 'WARNING',
        });
      }

      if (metrics.jobStatus.failedJobs > 0) {
        issues.push({
          issue: `Failed jobs`,
          count: metrics.jobStatus.failedJobs,
          severity: 'WARNING',
        });
      }

      return issues.sort((a, b) => b.count - a.count);
    } catch (error) {
      logger.error('Failed to get top issues', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<{
    syncThroughput: number; // operations per minute
    avgSyncTime: number; // milliseconds
    jobProcessingRate: number; // jobs per minute
    conflictResolutionTime: number; // milliseconds
  }> {
    try {
      const syncStats = await this.syncService.getSyncStatistics();
      const jobStats = await this.jobService.getJobStatistics();

      return {
        syncThroughput: (syncStats.totalSyncs / 60) * 1000, // ops/min
        avgSyncTime: syncStats.averageDuration,
        jobProcessingRate: (jobStats.totalJobs / 60) * 1000, // jobs/min
        conflictResolutionTime: 0, // TODO: Track in ConflictResolutionService
      };
    } catch (error) {
      logger.error('Failed to get performance metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default DashboardDataService;
