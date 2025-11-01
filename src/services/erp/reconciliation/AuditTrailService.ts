/**
 * Audit Trail Service
 * Issue #60: Phase 14 - Audit Trail & Change History
 *
 * Tracks all reconciliation operations for compliance and audit purposes.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

/**
 * Audit event types
 */
export enum AuditEventType {
  SCHEDULE_CREATED = 'SCHEDULE_CREATED',
  SCHEDULE_UPDATED = 'SCHEDULE_UPDATED',
  SCHEDULE_DELETED = 'SCHEDULE_DELETED',
  SCHEDULE_ENABLED = 'SCHEDULE_ENABLED',
  SCHEDULE_DISABLED = 'SCHEDULE_DISABLED',
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',
  RECONCILIATION_TRIGGERED = 'RECONCILIATION_TRIGGERED',
  DISCREPANCY_FOUND = 'DISCREPANCY_FOUND',
  DISCREPANCY_RESOLVED = 'DISCREPANCY_RESOLVED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_FINALIZED = 'REPORT_FINALIZED',
}

/**
 * Severity levels for audit events
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit event record
 */
export interface AuditEvent {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId: string;
  integrationId: string;
  entityType: string;
  entityId: string;
  action: string;
  description: string;
  changes: Record<string, any>;
  previousValues: Record<string, any>;
  newValues: Record<string, any>;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  status: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  duration: number;
  createdAt: Date;
}

/**
 * Audit Trail Service
 */
export class AuditTrailService {
  private prisma: PrismaClient;
  private auditEvents: Map<string, AuditEvent> = new Map();
  private eventCounter = 0;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Log an audit event
   */
  async logEvent(
    eventType: AuditEventType,
    userId: string,
    integrationId: string,
    entityType: string,
    entityId: string,
    action: string,
    options?: {
      description?: string;
      changes?: Record<string, any>;
      previousValues?: Record<string, any>;
      newValues?: Record<string, any>;
      metadata?: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
      status?: 'SUCCESS' | 'FAILURE';
      errorMessage?: string;
      duration?: number;
      severity?: AuditSeverity;
    }
  ): Promise<AuditEvent> {
    try {
      const startTime = Date.now();
      const id = `audit-${Date.now()}-${++this.eventCounter}`;

      // Determine severity
      const severity = options?.severity || this.determineSeverity(eventType);

      const auditEvent: AuditEvent = {
        id,
        eventType,
        severity,
        userId,
        integrationId,
        entityType,
        entityId,
        action,
        description: options?.description || action,
        changes: options?.changes || {},
        previousValues: options?.previousValues || {},
        newValues: options?.newValues || {},
        metadata: options?.metadata || {},
        ipAddress: options?.ipAddress,
        userAgent: options?.userAgent,
        status: options?.status || 'SUCCESS',
        errorMessage: options?.errorMessage,
        duration: options?.duration || (Date.now() - startTime),
        createdAt: new Date(),
      };

      this.auditEvents.set(id, auditEvent);

      logger.info('Audit event logged', {
        eventId: id,
        eventType,
        userId,
        integrationId,
        entityType,
        entityId,
        severity,
        status: auditEvent.status,
      });

      return auditEvent;
    } catch (error) {
      logger.error('Failed to log audit event', {
        error: error instanceof Error ? error.message : String(error),
        eventType,
        userId,
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get audit events by various filters
   */
  async getEvents(options?: {
    userId?: string;
    integrationId?: string;
    entityType?: string;
    entityId?: string;
    eventType?: AuditEventType;
    severity?: AuditSeverity;
    startDate?: Date;
    endDate?: Date;
    status?: 'SUCCESS' | 'FAILURE';
    limit?: number;
    offset?: number;
  }): Promise<{ events: AuditEvent[]; total: number }> {
    try {
      let filtered = Array.from(this.auditEvents.values());

      // Apply filters
      if (options?.userId) {
        filtered = filtered.filter((e) => e.userId === options.userId);
      }
      if (options?.integrationId) {
        filtered = filtered.filter((e) => e.integrationId === options.integrationId);
      }
      if (options?.entityType) {
        filtered = filtered.filter((e) => e.entityType === options.entityType);
      }
      if (options?.entityId) {
        filtered = filtered.filter((e) => e.entityId === options.entityId);
      }
      if (options?.eventType) {
        filtered = filtered.filter((e) => e.eventType === options.eventType);
      }
      if (options?.severity) {
        filtered = filtered.filter((e) => e.severity === options.severity);
      }
      if (options?.status) {
        filtered = filtered.filter((e) => e.status === options.status);
      }

      // Date range filter
      if (options?.startDate) {
        filtered = filtered.filter((e) => e.createdAt >= options.startDate!);
      }
      if (options?.endDate) {
        filtered = filtered.filter((e) => e.createdAt <= options.endDate!);
      }

      // Sort by createdAt descending
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const total = filtered.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const events = filtered.slice(offset, offset + limit);

      return { events, total };
    } catch (error) {
      logger.error('Failed to get audit events', {
        error: error instanceof Error ? error.message : String(error),
        filters: options,
      });
      throw error;
    }
  }

  /**
   * Get audit events for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Promise<AuditEvent[]> {
    try {
      let events = Array.from(this.auditEvents.values()).filter(
        (e) => e.entityType === entityType && e.entityId === entityId
      );

      events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return events.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get entity history', {
        error: error instanceof Error ? error.message : String(error),
        entityType,
        entityId,
      });
      throw error;
    }
  }

  /**
   * Get audit events for a specific user
   */
  async getUserActivity(userId: string, limit: number = 100): Promise<AuditEvent[]> {
    try {
      let events = Array.from(this.auditEvents.values()).filter((e) => e.userId === userId);

      events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return events.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get user activity', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  /**
   * Get critical events for compliance reporting
   */
  async getCriticalEvents(options?: {
    integrationId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditEvent[]> {
    try {
      let events = Array.from(this.auditEvents.values()).filter(
        (e) => e.severity === AuditSeverity.CRITICAL || e.status === 'FAILURE'
      );

      if (options?.integrationId) {
        events = events.filter((e) => e.integrationId === options.integrationId);
      }

      if (options?.startDate) {
        events = events.filter((e) => e.createdAt >= options.startDate!);
      }

      if (options?.endDate) {
        events = events.filter((e) => e.createdAt <= options.endDate!);
      }

      events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const limit = options?.limit || 100;
      return events.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get critical events', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getStatistics(options?: {
    integrationId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    criticalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    uniqueUsers: number;
  }> {
    try {
      let events = Array.from(this.auditEvents.values());

      if (options?.integrationId) {
        events = events.filter((e) => e.integrationId === options.integrationId);
      }

      if (options?.startDate) {
        events = events.filter((e) => e.createdAt >= options.startDate);
      }

      if (options?.endDate) {
        events = events.filter((e) => e.createdAt <= options.endDate);
      }

      const successfulEvents = events.filter((e) => e.status === 'SUCCESS').length;
      const failedEvents = events.filter((e) => e.status === 'FAILURE').length;
      const criticalEvents = events.filter(
        (e) => e.severity === AuditSeverity.CRITICAL || e.status === 'FAILURE'
      ).length;

      // Count by type
      const eventsByType: Record<string, number> = {};
      events.forEach((e) => {
        eventsByType[e.eventType] = (eventsByType[e.eventType] || 0) + 1;
      });

      // Count by severity
      const eventsBySeverity: Record<string, number> = {};
      events.forEach((e) => {
        eventsBySeverity[e.severity] = (eventsBySeverity[e.severity] || 0) + 1;
      });

      // Unique users
      const uniqueUsers = new Set(events.map((e) => e.userId)).size;

      return {
        totalEvents: events.length,
        successfulEvents,
        failedEvents,
        criticalEvents,
        eventsByType,
        eventsBySeverity,
        uniqueUsers,
      };
    } catch (error) {
      logger.error('Failed to get audit statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(options?: {
    integrationId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    reportId: string;
    generatedAt: Date;
    period: { start: Date; end: Date };
    summary: {
      totalOperations: number;
      successRate: number;
      criticalEvents: number;
      failureRate: number;
    };
    eventDetails: AuditEvent[];
    recommendations: string[];
  }> {
    try {
      const reportId = `compliance-report-${Date.now()}`;
      const generatedAt = new Date();

      // Get events for period
      const { events: eventDetails, total } = await this.getEvents({
        integrationId: options?.integrationId,
        startDate: options?.startDate,
        endDate: options?.endDate,
        limit: 1000,
      });

      const criticalEvents = await this.getCriticalEvents({
        integrationId: options?.integrationId,
        startDate: options?.startDate,
        endDate: options?.endDate,
      });

      const failureCount = eventDetails.filter((e) => e.status === 'FAILURE').length;
      const successRate = total > 0 ? ((total - failureCount) / total) * 100 : 100;
      const failureRate = total > 0 ? (failureCount / total) * 100 : 0;

      // Generate recommendations
      const recommendations: string[] = [];
      if (failureRate > 10) {
        recommendations.push('High failure rate detected. Review error logs and system health.');
      }
      if (criticalEvents.length > 5) {
        recommendations.push('Multiple critical events detected. Immediate investigation required.');
      }
      if (successRate < 95) {
        recommendations.push(
          'System reliability below 95%. Consider implementing additional validation checks.'
        );
      }

      logger.info('Compliance report generated', {
        reportId,
        totalOperations: total,
        successRate: successRate.toFixed(2),
        criticalEvents: criticalEvents.length,
      });

      return {
        reportId,
        generatedAt,
        period: {
          start: options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: options?.endDate || new Date(),
        },
        summary: {
          totalOperations: total,
          successRate,
          criticalEvents: criticalEvents.length,
          failureRate,
        },
        eventDetails,
        recommendations,
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Determine severity based on event type
   */
  private determineSeverity(eventType: AuditEventType): AuditSeverity {
    const criticalEvents = [
      AuditEventType.SCHEDULE_DELETED,
      AuditEventType.JOB_FAILED,
      AuditEventType.DISCREPANCY_FOUND,
      AuditEventType.REPORT_FINALIZED,
    ];

    const warningEvents = [
      AuditEventType.SCHEDULE_DISABLED,
      AuditEventType.DISCREPANCY_RESOLVED,
    ];

    if (criticalEvents.includes(eventType)) {
      return AuditSeverity.CRITICAL;
    }
    if (warningEvents.includes(eventType)) {
      return AuditSeverity.WARNING;
    }
    return AuditSeverity.INFO;
  }

  /**
   * Clear old audit events (cleanup)
   */
  async clearOldEvents(olderThanDays: number): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      let count = 0;

      for (const [id, event] of this.auditEvents.entries()) {
        if (event.createdAt < cutoffDate) {
          this.auditEvents.delete(id);
          count++;
        }
      }

      logger.info('Old audit events cleared', {
        count,
        olderThanDays,
      });

      return count;
    } catch (error) {
      logger.error('Failed to clear old audit events', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default AuditTrailService;
