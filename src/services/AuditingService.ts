/**
 * Comprehensive Auditing Service - GitHub Issue #127
 *
 * Provides comprehensive permission usage tracking, security event monitoring,
 * session tracking, and audit report generation for compliance and security.
 */

import { PrismaClient, SecurityEventType, SecuritySeverity, ReportType, ReportStatus, PermissionChangeType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Cache for performance optimization
const auditingCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes for audit data

/**
 * Context for permission usage logging
 */
export interface PermissionUsageContext {
  userId: string;
  permission: string;
  endpoint?: string;
  method?: string;
  success: boolean;
  ip?: string;
  userAgent?: string;
  siteId?: string;
  duration?: number; // milliseconds
  context?: Record<string, any>; // Additional context data
}

/**
 * Security event data structure
 */
export interface SecurityEventData {
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  userId?: string;
  ip?: string;
  userAgent?: string;
  description: string;
  metadata?: Record<string, any>;
  siteId?: string;
}

/**
 * User session data structure
 */
export interface UserSessionData {
  userId: string;
  sessionId: string;
  ip?: string;
  userAgent?: string;
  siteAccess?: string[];
}

/**
 * Report generation parameters
 */
export interface ReportParameters {
  reportType: ReportType;
  title: string;
  timeRange?: {
    startDate: Date;
    endDate: Date;
  };
  siteId?: string;
  userId?: string;
  filters?: Record<string, any>;
}

/**
 * Permission change data structure
 */
export interface PermissionChangeData {
  changeType: PermissionChangeType;
  targetUserId: string;
  targetRole?: string;
  permission?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  changedBy: string;
  reason?: string;
  siteId?: string;
}

/**
 * Analytics data structures
 */
export interface UsageAnalytics {
  totalPermissionChecks: number;
  successfulChecks: number;
  failedChecks: number;
  averageDuration: number;
  topPermissions: Array<{ permission: string; count: number }>;
  topEndpoints: Array<{ endpoint: string; count: number }>;
}

export interface SecurityMetrics {
  totalSecurityEvents: number;
  eventsByType: Array<{ eventType: string; count: number }>;
  eventsBySeverity: Array<{ severity: string; count: number }>;
  unresolvedEvents: number;
  topSourceIPs: Array<{ ip: string; count: number }>;
}

export interface ActivityMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  totalActions: number;
  uniqueUsers: number;
  activeSessions: number;
}

/**
 * Time range helper interface
 */
export interface TimeRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Comprehensive Auditing Service
 */
export class AuditingService {
  /**
   * Log permission usage with full context
   * Core function for tracking every permission check
   */
  async logPermissionUsage(context: PermissionUsageContext): Promise<void> {
    try {
      const startTime = Date.now();

      await prisma.permissionUsageLog.create({
        data: {
          userId: context.userId,
          permission: context.permission,
          endpoint: context.endpoint,
          method: context.method,
          success: context.success,
          ip: context.ip,
          userAgent: context.userAgent,
          siteId: context.siteId,
          duration: context.duration,
          context: context.context,
          timestamp: new Date(),
        },
      });

      const logDuration = Date.now() - startTime;

      // Performance monitoring - warn if logging takes too long
      if (logDuration > 50) { // More than 50ms
        logger.warn(`Permission usage logging took ${logDuration}ms for user ${context.userId}`);
      }

      // Auto-detect security events based on permission checks
      await this.detectSecurityEvents(context);

    } catch (error) {
      logger.error('Failed to log permission usage:', error);
      // Don't throw - auditing should not break application flow
    }
  }

  /**
   * Log security events for threat detection
   */
  async logSecurityEvent(eventData: SecurityEventData): Promise<string> {
    try {
      const securityEvent = await prisma.securityEvent.create({
        data: {
          eventType: eventData.eventType,
          severity: eventData.severity,
          userId: eventData.userId,
          ip: eventData.ip,
          userAgent: eventData.userAgent,
          description: eventData.description,
          metadata: eventData.metadata,
          siteId: eventData.siteId,
          timestamp: new Date(),
        },
      });

      logger.info(`Security event logged: ${eventData.eventType} - ${eventData.severity}`, {
        eventId: securityEvent.id,
        userId: eventData.userId,
        ip: eventData.ip,
      });

      // Alert for critical events
      if (eventData.severity === SecuritySeverity.CRITICAL) {
        await this.triggerSecurityAlert(securityEvent.id, eventData);
      }

      return securityEvent.id;
    } catch (error) {
      logger.error('Failed to log security event:', error);
      throw error;
    }
  }

  /**
   * Start user session tracking
   */
  async startUserSession(sessionData: UserSessionData): Promise<string> {
    try {
      // End any existing active sessions for this user
      await this.endActiveUserSessions(sessionData.userId);

      const session = await prisma.userSessionLog.create({
        data: {
          userId: sessionData.userId,
          sessionId: sessionData.sessionId,
          ip: sessionData.ip,
          userAgent: sessionData.userAgent,
          siteAccess: sessionData.siteAccess || [],
          startTime: new Date(),
          lastActivity: new Date(),
        },
      });

      logger.info(`User session started for user ${sessionData.userId}`, {
        sessionId: sessionData.sessionId,
        ip: sessionData.ip,
      });

      return session.id;
    } catch (error) {
      logger.error('Failed to start user session:', error);
      throw error;
    }
  }

  /**
   * End user session
   */
  async endUserSession(sessionId: string): Promise<void> {
    try {
      const endTime = new Date();

      const session = await prisma.userSessionLog.findUnique({
        where: { sessionId },
      });

      if (!session) {
        logger.warn(`Attempted to end non-existent session: ${sessionId}`);
        return;
      }

      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      await prisma.userSessionLog.update({
        where: { sessionId },
        data: {
          endTime,
          duration,
        },
      });

      logger.info(`User session ended for session ${sessionId}`, {
        userId: session.userId,
        duration: `${duration}s`,
      });
    } catch (error) {
      logger.error('Failed to end user session:', error);
      // Don't throw - session cleanup should not break flow
    }
  }

  /**
   * Update session activity and site access
   */
  async updateSessionActivity(sessionId: string, siteId?: string): Promise<void> {
    try {
      const updateData: any = {
        lastActivity: new Date(),
        actionsCount: {
          increment: 1,
        },
      };

      if (siteId) {
        const session = await prisma.userSessionLog.findUnique({
          where: { sessionId },
          select: { siteAccess: true },
        });

        if (session && !session.siteAccess.includes(siteId)) {
          updateData.siteAccess = [...session.siteAccess, siteId];
        }
      }

      await prisma.userSessionLog.update({
        where: { sessionId },
        data: updateData,
      });
    } catch (error) {
      logger.error('Failed to update session activity:', error);
      // Don't throw - activity tracking should not break flow
    }
  }

  /**
   * Log permission changes for compliance
   */
  async logPermissionChange(changeData: PermissionChangeData): Promise<void> {
    try {
      await prisma.permissionChangeLog.create({
        data: {
          changeType: changeData.changeType,
          targetUserId: changeData.targetUserId,
          targetRole: changeData.targetRole,
          permission: changeData.permission,
          oldValue: changeData.oldValue,
          newValue: changeData.newValue,
          changedBy: changeData.changedBy,
          reason: changeData.reason,
          siteId: changeData.siteId,
          timestamp: new Date(),
        },
      });

      logger.info(`Permission change logged: ${changeData.changeType}`, {
        targetUserId: changeData.targetUserId,
        changedBy: changeData.changedBy,
        reason: changeData.reason,
      });

      // Log as security event for high-privilege changes
      if (this.isHighPrivilegeChange(changeData)) {
        await this.logSecurityEvent({
          eventType: SecurityEventType.ADMIN_ACTION,
          severity: SecuritySeverity.HIGH,
          userId: changeData.changedBy,
          description: `High-privilege permission change: ${changeData.changeType}`,
          metadata: changeData,
          siteId: changeData.siteId,
        });
      }
    } catch (error) {
      logger.error('Failed to log permission change:', error);
      throw error;
    }
  }

  /**
   * Generate audit reports
   */
  async generateAuditReport(params: ReportParameters, generatedBy: string): Promise<string> {
    try {
      const report = await prisma.auditReport.create({
        data: {
          reportType: params.reportType,
          title: params.title,
          parameters: params,
          generatedBy,
          status: ReportStatus.GENERATING,
          siteId: params.siteId,
        },
      });

      // Start background report generation
      this.processReportGeneration(report.id, params).catch((error) => {
        logger.error(`Failed to generate report ${report.id}:`, error);
        prisma.auditReport.update({
          where: { id: report.id },
          data: {
            status: ReportStatus.FAILED,
            error: error.message,
          },
        }).catch((updateError) => {
          logger.error('Failed to update report status:', updateError);
        });
      });

      return report.id;
    } catch (error) {
      logger.error('Failed to create audit report:', error);
      throw error;
    }
  }

  /**
   * Get permission usage analytics
   */
  async getPermissionUsageAnalytics(timeRange: TimeRange, siteId?: string): Promise<UsageAnalytics> {
    try {
      const cacheKey = `analytics:permission:${timeRange.startDate.getTime()}-${timeRange.endDate.getTime()}:${siteId || 'all'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const whereClause: any = {
        timestamp: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      };

      if (siteId) {
        whereClause.siteId = siteId;
      }

      const [totalChecks, successfulChecks, avgDuration, topPermissions, topEndpoints] = await Promise.all([
        prisma.permissionUsageLog.count({ where: whereClause }),
        prisma.permissionUsageLog.count({ where: { ...whereClause, success: true } }),
        prisma.permissionUsageLog.aggregate({
          where: { ...whereClause, duration: { not: null } },
          _avg: { duration: true },
        }),
        prisma.permissionUsageLog.groupBy({
          by: ['permission'],
          where: whereClause,
          _count: { permission: true },
          orderBy: { _count: { permission: 'desc' } },
          take: 10,
        }),
        prisma.permissionUsageLog.groupBy({
          by: ['endpoint'],
          where: { ...whereClause, endpoint: { not: null } },
          _count: { endpoint: true },
          orderBy: { _count: { endpoint: 'desc' } },
          take: 10,
        }),
      ]);

      const analytics: UsageAnalytics = {
        totalPermissionChecks: totalChecks,
        successfulChecks,
        failedChecks: totalChecks - successfulChecks,
        averageDuration: avgDuration._avg.duration || 0,
        topPermissions: topPermissions.map(p => ({
          permission: p.permission,
          count: p._count.permission,
        })),
        topEndpoints: topEndpoints.map(e => ({
          endpoint: e.endpoint!,
          count: e._count.endpoint,
        })),
      };

      this.setCachedData(cacheKey, analytics);
      return analytics;
    } catch (error) {
      logger.error('Failed to get permission usage analytics:', error);
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeRange: TimeRange, siteId?: string): Promise<SecurityMetrics> {
    try {
      const cacheKey = `analytics:security:${timeRange.startDate.getTime()}-${timeRange.endDate.getTime()}:${siteId || 'all'}`;
      const cached = this.getCachedData(cacheKey);
      if (cached) return cached;

      const whereClause: any = {
        timestamp: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      };

      if (siteId) {
        whereClause.siteId = siteId;
      }

      const [totalEvents, eventsByType, eventsBySeverity, unresolvedEvents, topIPs] = await Promise.all([
        prisma.securityEvent.count({ where: whereClause }),
        prisma.securityEvent.groupBy({
          by: ['eventType'],
          where: whereClause,
          _count: { eventType: true },
          orderBy: { _count: { eventType: 'desc' } },
        }),
        prisma.securityEvent.groupBy({
          by: ['severity'],
          where: whereClause,
          _count: { severity: true },
          orderBy: { _count: { severity: 'desc' } },
        }),
        prisma.securityEvent.count({ where: { ...whereClause, resolved: false } }),
        prisma.securityEvent.groupBy({
          by: ['ip'],
          where: { ...whereClause, ip: { not: null } },
          _count: { ip: true },
          orderBy: { _count: { ip: 'desc' } },
          take: 10,
        }),
      ]);

      const metrics: SecurityMetrics = {
        totalSecurityEvents: totalEvents,
        eventsByType: eventsByType.map(e => ({
          eventType: e.eventType,
          count: e._count.eventType,
        })),
        eventsBySeverity: eventsBySeverity.map(e => ({
          severity: e.severity,
          count: e._count.severity,
        })),
        unresolvedEvents,
        topSourceIPs: topIPs.map(ip => ({
          ip: ip.ip!,
          count: ip._count.ip,
        })),
      };

      this.setCachedData(cacheKey, metrics);
      return metrics;
    } catch (error) {
      logger.error('Failed to get security metrics:', error);
      throw error;
    }
  }

  /**
   * Get activity metrics
   */
  async getActivityMetrics(timeRange: TimeRange, siteId?: string): Promise<ActivityMetrics> {
    try {
      const whereClause: any = {
        startTime: {
          gte: timeRange.startDate,
          lte: timeRange.endDate,
        },
      };

      const [totalSessions, avgDuration, totalActions, uniqueUsers, activeSessions] = await Promise.all([
        prisma.userSessionLog.count({ where: whereClause }),
        prisma.userSessionLog.aggregate({
          where: { ...whereClause, duration: { not: null } },
          _avg: { duration: true },
        }),
        prisma.userSessionLog.aggregate({
          where: whereClause,
          _sum: { actionsCount: true },
        }),
        prisma.userSessionLog.groupBy({
          by: ['userId'],
          where: whereClause,
        }).then(groups => groups.length),
        prisma.userSessionLog.count({
          where: {
            endTime: null,
            lastActivity: {
              gte: new Date(Date.now() - 30 * 60 * 1000), // Active in last 30 minutes
            },
          },
        }),
      ]);

      return {
        totalSessions,
        averageSessionDuration: avgDuration._avg.duration || 0,
        totalActions: totalActions._sum.actionsCount || 0,
        uniqueUsers,
        activeSessions,
      };
    } catch (error) {
      logger.error('Failed to get activity metrics:', error);
      throw error;
    }
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string, resolvedBy: string, notes?: string): Promise<void> {
    try {
      await prisma.securityEvent.update({
        where: { id: eventId },
        data: {
          resolved: true,
          resolvedBy,
          resolvedAt: new Date(),
          metadata: notes ? { resolutionNotes: notes } : undefined,
        },
      });

      logger.info(`Security event ${eventId} resolved by user ${resolvedBy}`);
    } catch (error) {
      logger.error('Failed to resolve security event:', error);
      throw error;
    }
  }

  // Private helper methods

  private async detectSecurityEvents(context: PermissionUsageContext): Promise<void> {
    try {
      // Detect failed permission attempts
      if (!context.success) {
        await this.logSecurityEvent({
          eventType: SecurityEventType.PERMISSION_DENIED,
          severity: SecuritySeverity.LOW,
          userId: context.userId,
          ip: context.ip,
          userAgent: context.userAgent,
          description: `Permission denied: ${context.permission}`,
          metadata: { permission: context.permission, endpoint: context.endpoint },
          siteId: context.siteId,
        });
      }

      // Detect unusual access patterns (simple implementation)
      await this.detectUnusualAccess(context);
    } catch (error) {
      logger.error('Failed to detect security events:', error);
    }
  }

  private async detectUnusualAccess(context: PermissionUsageContext): Promise<void> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for high frequency of failed attempts
    const recentFailures = await prisma.permissionUsageLog.count({
      where: {
        userId: context.userId,
        success: false,
        timestamp: { gte: hourAgo },
      },
    });

    if (recentFailures > 10) { // More than 10 failures in an hour
      await this.logSecurityEvent({
        eventType: SecurityEventType.UNUSUAL_PATTERN,
        severity: SecuritySeverity.MEDIUM,
        userId: context.userId,
        ip: context.ip,
        description: `High frequency of permission failures: ${recentFailures} in last hour`,
        metadata: { recentFailures, timeWindow: '1hour' },
        siteId: context.siteId,
      });
    }
  }

  private async endActiveUserSessions(userId: string): Promise<void> {
    const activeSessions = await prisma.userSessionLog.findMany({
      where: {
        userId,
        endTime: null,
      },
    });

    for (const session of activeSessions) {
      await this.endUserSession(session.sessionId);
    }
  }

  private async triggerSecurityAlert(eventId: string, eventData: SecurityEventData): Promise<void> {
    // Implementation for triggering alerts (email, Slack, etc.)
    logger.error(`CRITICAL SECURITY EVENT: ${eventData.eventType}`, {
      eventId,
      description: eventData.description,
      userId: eventData.userId,
      ip: eventData.ip,
    });
    // TODO: Integrate with notification service for real alerts
  }

  private isHighPrivilegeChange(changeData: PermissionChangeData): boolean {
    const highPrivilegeTypes = [
      PermissionChangeType.ROLE_ASSIGNED,
      PermissionChangeType.PERMISSION_GRANTED,
      PermissionChangeType.EMERGENCY_OVERRIDE,
    ];

    return highPrivilegeTypes.includes(changeData.changeType);
  }

  private async processReportGeneration(reportId: string, params: ReportParameters): Promise<void> {
    // Implementation for background report generation
    // This would generate PDF/Excel reports based on the parameters
    // For now, just mark as completed
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

    await prisma.auditReport.update({
      where: { id: reportId },
      data: {
        status: ReportStatus.COMPLETED,
        filePath: `/reports/${reportId}.pdf`, // Would be actual file path
      },
    });
  }

  private getCachedData(key: string): any {
    const cached = auditingCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    auditingCache.delete(key);
    return null;
  }

  private setCachedData(key: string, data: any): void {
    auditingCache.set(key, { data, timestamp: Date.now() });
  }
}

// Export singleton instance
export const auditingService = new AuditingService();