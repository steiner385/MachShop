/**
 * Audit API Routes - GitHub Issue #127
 *
 * Comprehensive audit and security monitoring API endpoints for
 * permission usage tracking, security events, and compliance reporting.
 */

import express from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { authMiddleware } from '../middleware/auth';
import { requirePermissionWithAudit } from '../middleware/auditMiddleware';
import { auditingService, TimeRange, ReportParameters } from '../services/AuditingService';
import { ReportType, SecuritySeverity } from '@prisma/client';

const router = express.Router();

// Apply authentication middleware to all audit routes
router.use(authMiddleware);

// ============================================
// PERMISSION USAGE LOGS
// ============================================

/**
 * Get permission usage logs with filtering and pagination
 * GET /api/v1/audit/permission-usage
 */
router.get('/permission-usage',
  requirePermissionWithAudit('audit.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      userId: z.string().optional(),
      permission: z.string().optional(),
      endpoint: z.string().optional(),
      success: z.coerce.boolean().optional(),
      siteId: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;

    const whereClause: any = {};

    // Build filter conditions
    if (query.userId) whereClause.userId = query.userId;
    if (query.permission) whereClause.permission = { contains: query.permission, mode: 'insensitive' };
    if (query.endpoint) whereClause.endpoint = { contains: query.endpoint, mode: 'insensitive' };
    if (query.success !== undefined) whereClause.success = query.success;
    if (query.siteId) whereClause.siteId = query.siteId;

    if (query.startDate || query.endDate) {
      whereClause.timestamp = {};
      if (query.startDate) whereClause.timestamp.gte = query.startDate;
      if (query.endDate) whereClause.timestamp.lte = query.endDate;
    }

    const [logs, totalCount] = await Promise.all([
      prisma.permissionUsageLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          site: {
            select: { id: true, siteCode: true, siteName: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      prisma.permissionUsageLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      data: logs,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    });
  })
);

/**
 * Get permission usage statistics
 * GET /api/v1/audit/permission-usage/stats
 */
router.get('/permission-usage/stats',
  requirePermissionWithAudit('audit.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      timeRange: z.enum(['hour', 'day', 'week', 'month']).default('day'),
      siteId: z.string().optional(),
    }).parse(req.query);

    const now = new Date();
    let startDate: Date;

    switch (query.timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const timeRange: TimeRange = { startDate, endDate: now };
    const analytics = await auditingService.getPermissionUsageAnalytics(timeRange, query.siteId);

    res.json({
      timeRange: query.timeRange,
      siteId: query.siteId,
      period: { startDate, endDate: now },
      analytics,
    });
  })
);

// ============================================
// SECURITY EVENTS
// ============================================

/**
 * Get security events with filtering and pagination
 * GET /api/v1/audit/security-events
 */
router.get('/security-events',
  requirePermissionWithAudit('audit.security.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      userId: z.string().optional(),
      eventType: z.string().optional(),
      severity: z.nativeEnum(SecuritySeverity).optional(),
      resolved: z.coerce.boolean().optional(),
      siteId: z.string().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;

    const whereClause: any = {};

    // Build filter conditions
    if (query.userId) whereClause.userId = query.userId;
    if (query.eventType) whereClause.eventType = query.eventType;
    if (query.severity) whereClause.severity = query.severity;
    if (query.resolved !== undefined) whereClause.resolved = query.resolved;
    if (query.siteId) whereClause.siteId = query.siteId;

    if (query.startDate || query.endDate) {
      whereClause.timestamp = {};
      if (query.startDate) whereClause.timestamp.gte = query.startDate;
      if (query.endDate) whereClause.timestamp.lte = query.endDate;
    }

    const [events, totalCount] = await Promise.all([
      prisma.securityEvent.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
          resolvedByUser: {
            select: { id: true, username: true, email: true },
          },
          site: {
            select: { id: true, siteCode: true, siteName: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      prisma.securityEvent.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      data: events,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    });
  })
);

/**
 * Resolve a security event
 * PUT /api/v1/audit/security-events/:eventId/resolve
 */
router.put('/security-events/:eventId/resolve',
  requirePermissionWithAudit('audit.security.resolve'),
  asyncHandler(async (req, res) => {
    const { eventId } = req.params;
    const body = z.object({
      notes: z.string().optional(),
    }).parse(req.body);

    await auditingService.resolveSecurityEvent(
      eventId,
      req.user!.id,
      body.notes
    );

    logger.info('Security event resolved', {
      eventId,
      resolvedBy: req.user!.id,
      notes: body.notes,
    });

    res.json({
      success: true,
      message: 'Security event resolved successfully',
      resolvedBy: req.user!.username,
      resolvedAt: new Date(),
    });
  })
);

/**
 * Get security metrics
 * GET /api/v1/audit/security-events/metrics
 */
router.get('/security-events/metrics',
  requirePermissionWithAudit('audit.security.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      timeRange: z.enum(['hour', 'day', 'week', 'month']).default('day'),
      siteId: z.string().optional(),
    }).parse(req.query);

    const now = new Date();
    let startDate: Date;

    switch (query.timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const timeRange: TimeRange = { startDate, endDate: now };
    const metrics = await auditingService.getSecurityMetrics(timeRange, query.siteId);

    res.json({
      timeRange: query.timeRange,
      siteId: query.siteId,
      period: { startDate, endDate: now },
      metrics,
    });
  })
);

// ============================================
// USER SESSIONS
// ============================================

/**
 * Get user session logs
 * GET /api/v1/audit/user-sessions
 */
router.get('/user-sessions',
  requirePermissionWithAudit('audit.sessions.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      userId: z.string().optional(),
      active: z.coerce.boolean().optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;

    const whereClause: any = {};

    // Build filter conditions
    if (query.userId) whereClause.userId = query.userId;
    if (query.active !== undefined) {
      if (query.active) {
        whereClause.endTime = null;
      } else {
        whereClause.endTime = { not: null };
      }
    }

    if (query.startDate || query.endDate) {
      whereClause.startTime = {};
      if (query.startDate) whereClause.startTime.gte = query.startDate;
      if (query.endDate) whereClause.startTime.lte = query.endDate;
    }

    const [sessions, totalCount] = await Promise.all([
      prisma.userSessionLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: { id: true, username: true, email: true },
          },
        },
        orderBy: { startTime: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      prisma.userSessionLog.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      data: sessions,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    });
  })
);

/**
 * Get activity metrics
 * GET /api/v1/audit/user-sessions/metrics
 */
router.get('/user-sessions/metrics',
  requirePermissionWithAudit('audit.sessions.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      timeRange: z.enum(['hour', 'day', 'week', 'month']).default('day'),
      siteId: z.string().optional(),
    }).parse(req.query);

    const now = new Date();
    let startDate: Date;

    switch (query.timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const timeRange: TimeRange = { startDate, endDate: now };
    const metrics = await auditingService.getActivityMetrics(timeRange, query.siteId);

    res.json({
      timeRange: query.timeRange,
      siteId: query.siteId,
      period: { startDate, endDate: now },
      metrics,
    });
  })
);

// ============================================
// AUDIT REPORTS
// ============================================

/**
 * Generate audit report
 * POST /api/v1/audit/reports/generate
 */
router.post('/reports/generate',
  requirePermissionWithAudit('audit.reports.create'),
  asyncHandler(async (req, res) => {
    const body = z.object({
      reportType: z.nativeEnum(ReportType),
      title: z.string().min(1),
      timeRange: z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
      }).optional(),
      siteId: z.string().optional(),
      filters: z.record(z.any()).optional(),
    }).parse(req.body);

    const reportParams: ReportParameters = {
      reportType: body.reportType,
      title: body.title,
      timeRange: body.timeRange,
      siteId: body.siteId,
      filters: body.filters,
    };

    const reportId = await auditingService.generateAuditReport(
      reportParams,
      req.user!.id
    );

    logger.info('Audit report generation initiated', {
      reportId,
      reportType: body.reportType,
      generatedBy: req.user!.id,
      title: body.title,
    });

    res.json({
      success: true,
      reportId,
      message: 'Report generation initiated',
      status: 'GENERATING',
    });
  })
);

/**
 * Get audit reports list
 * GET /api/v1/audit/reports
 */
router.get('/reports',
  requirePermissionWithAudit('audit.reports.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      page: z.coerce.number().min(1).default(1),
      limit: z.coerce.number().min(1).max(100).default(20),
      reportType: z.nativeEnum(ReportType).optional(),
      status: z.string().optional(),
      generatedBy: z.string().optional(),
    }).parse(req.query);

    const offset = (query.page - 1) * query.limit;

    const whereClause: any = {};

    // Build filter conditions
    if (query.reportType) whereClause.reportType = query.reportType;
    if (query.status) whereClause.status = query.status;
    if (query.generatedBy) whereClause.generatedBy = query.generatedBy;

    const [reports, totalCount] = await Promise.all([
      prisma.auditReport.findMany({
        where: whereClause,
        include: {
          generatedByUser: {
            select: { id: true, username: true, email: true },
          },
          site: {
            select: { id: true, siteCode: true, siteName: true },
          },
        },
        orderBy: { generatedAt: 'desc' },
        skip: offset,
        take: query.limit,
      }),
      prisma.auditReport.count({ where: whereClause }),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    res.json({
      data: reports,
      pagination: {
        page: query.page,
        limit: query.limit,
        totalCount,
        totalPages,
        hasNextPage: query.page < totalPages,
        hasPreviousPage: query.page > 1,
      },
    });
  })
);

/**
 * Download audit report
 * GET /api/v1/audit/reports/:reportId/download
 */
router.get('/reports/:reportId/download',
  requirePermissionWithAudit('audit.reports.read'),
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await prisma.auditReport.findUnique({
      where: { id: reportId },
      include: {
        generatedByUser: {
          select: { username: true },
        },
      },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Report is not ready for download',
        status: report.status,
      });
    }

    // Update download count
    await prisma.auditReport.update({
      where: { id: reportId },
      data: { downloadCount: { increment: 1 } },
    });

    logger.info('Audit report downloaded', {
      reportId,
      downloadedBy: req.user!.id,
      reportType: report.reportType,
    });

    // In a real implementation, you would serve the actual file
    // For now, we'll just return the report metadata
    res.json({
      success: true,
      report: {
        id: report.id,
        title: report.title,
        reportType: report.reportType,
        generatedBy: report.generatedByUser.username,
        generatedAt: report.generatedAt,
        filePath: report.filePath,
      },
      message: 'Report ready for download',
    });
  })
);

/**
 * Delete audit report
 * DELETE /api/v1/audit/reports/:reportId
 */
router.delete('/reports/:reportId',
  requirePermissionWithAudit('audit.reports.delete'),
  asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const report = await prisma.auditReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Only allow deletion by the report creator or system admin
    if (report.generatedBy !== req.user!.id && !req.user!.permissions.includes('*')) {
      return res.status(403).json({ error: 'Not authorized to delete this report' });
    }

    await prisma.auditReport.delete({
      where: { id: reportId },
    });

    logger.info('Audit report deleted', {
      reportId,
      deletedBy: req.user!.id,
      reportType: report.reportType,
    });

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  })
);

// ============================================
// ANALYTICS AND INSIGHTS
// ============================================

/**
 * Get comprehensive audit dashboard data
 * GET /api/v1/audit/dashboard
 */
router.get('/dashboard',
  requirePermissionWithAudit('audit.dashboard.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      timeRange: z.enum(['hour', 'day', 'week', 'month']).default('day'),
      siteId: z.string().optional(),
    }).parse(req.query);

    const now = new Date();
    let startDate: Date;

    switch (query.timeRange) {
      case 'hour':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const timeRange: TimeRange = { startDate, endDate: now };

    // Get all metrics in parallel
    const [
      permissionAnalytics,
      securityMetrics,
      activityMetrics,
    ] = await Promise.all([
      auditingService.getPermissionUsageAnalytics(timeRange, query.siteId),
      auditingService.getSecurityMetrics(timeRange, query.siteId),
      auditingService.getActivityMetrics(timeRange, query.siteId),
    ]);

    res.json({
      timeRange: query.timeRange,
      siteId: query.siteId,
      period: { startDate, endDate: now },
      dashboard: {
        permissionUsage: permissionAnalytics,
        security: securityMetrics,
        activity: activityMetrics,
      },
    });
  })
);

/**
 * Get trend analysis
 * GET /api/v1/audit/trends
 */
router.get('/trends',
  requirePermissionWithAudit('audit.analytics.read'),
  asyncHandler(async (req, res) => {
    const query = z.object({
      metric: z.enum(['permission_usage', 'security_events', 'user_activity']),
      period: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
      days: z.coerce.number().min(1).max(90).default(7),
      siteId: z.string().optional(),
    }).parse(req.query);

    // This would be implemented with time-series data aggregation
    // For now, return placeholder structure
    const trends = {
      metric: query.metric,
      period: query.period,
      days: query.days,
      data: [], // Would contain time-series data points
      summary: {
        trend: 'stable', // 'increasing', 'decreasing', 'stable'
        changePercent: 0,
        averageValue: 0,
      },
    };

    res.json({
      trends,
      message: 'Trend analysis - implementation in progress',
    });
  })
);

// Add missing import
import prisma from '../lib/database';

export default router;