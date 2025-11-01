/**
 * Audit Trail Controller
 * Issue #60: Phase 14 - Audit Trail & Change History
 *
 * REST endpoints for audit trail and change history operations.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuditTrailService, AuditEventType, AuditSeverity } from '../services/erp/reconciliation/AuditTrailService';
import { ChangeHistoryService } from '../services/erp/reconciliation/ChangeHistoryService';
import { logger } from '../utils/logger';

/**
 * Audit Trail Controller
 */
export class AuditTrailController {
  private prisma: PrismaClient;
  private auditTrail: AuditTrailService;
  private changeHistory: ChangeHistoryService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.auditTrail = new AuditTrailService(this.prisma);
    this.changeHistory = new ChangeHistoryService(this.auditTrail);
  }

  /**
   * Get audit events with filters
   */
  async getAuditEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        integrationId,
        entityType,
        entityId,
        eventType,
        severity,
        status,
        startDate,
        endDate,
        limit = 50,
        offset = 0,
      } = req.query;

      const filters: any = {
        userId: userId as string,
        integrationId: integrationId as string,
        entityType: entityType as string,
        entityId: entityId as string,
        eventType: eventType as AuditEventType,
        severity: severity as AuditSeverity,
        status: status as 'SUCCESS' | 'FAILURE',
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      };

      // Parse dates
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const { events, total } = await this.auditTrail.getEvents(filters);

      logger.info('Audit events retrieved via API', {
        count: events.length,
        total,
        filters: Object.keys(filters).filter((k) => filters[k]),
      });

      res.json({
        timestamp: new Date(),
        count: events.length,
        total,
        limit: filters.limit,
        offset: filters.offset,
        events,
      });
    } catch (error) {
      logger.error('Failed to get audit events', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'AUDIT_EVENTS_FAILED',
        message: 'Failed to retrieve audit events',
      });
    }
  }

  /**
   * Get entity history
   */
  async getEntityHistory(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      const { limit = 100 } = req.query;

      if (!entityType || !entityId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'entityType and entityId are required',
        });
        return;
      }

      const events = await this.auditTrail.getEntityHistory(
        entityType,
        entityId,
        parseInt(limit as string, 10)
      );

      logger.info('Entity history retrieved via API', {
        entityType,
        entityId,
        count: events.length,
      });

      res.json({
        timestamp: new Date(),
        entityType,
        entityId,
        count: events.length,
        events,
      });
    } catch (error) {
      logger.error('Failed to get entity history', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'ENTITY_HISTORY_FAILED',
        message: 'Failed to retrieve entity history',
      });
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 100 } = req.query;

      if (!userId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'userId is required',
        });
        return;
      }

      const events = await this.auditTrail.getUserActivity(
        userId,
        parseInt(limit as string, 10)
      );

      logger.info('User activity retrieved via API', {
        userId,
        count: events.length,
      });

      res.json({
        timestamp: new Date(),
        userId,
        count: events.length,
        events,
      });
    } catch (error) {
      logger.error('Failed to get user activity', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'USER_ACTIVITY_FAILED',
        message: 'Failed to retrieve user activity',
      });
    }
  }

  /**
   * Get critical events
   */
  async getCriticalEvents(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, startDate, endDate, limit = 100 } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
        limit: parseInt(limit as string, 10),
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const events = await this.auditTrail.getCriticalEvents(filters);

      logger.info('Critical events retrieved via API', {
        count: events.length,
      });

      res.json({
        timestamp: new Date(),
        count: events.length,
        events,
      });
    } catch (error) {
      logger.error('Failed to get critical events', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'CRITICAL_EVENTS_FAILED',
        message: 'Failed to retrieve critical events',
      });
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, startDate, endDate } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const stats = await this.auditTrail.getStatistics(filters);

      logger.info('Audit statistics retrieved via API', {
        integrationId: filters.integrationId,
        totalEvents: stats.totalEvents,
      });

      res.json({
        timestamp: new Date(),
        stats,
      });
    } catch (error) {
      logger.error('Failed to get audit statistics', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'STATS_FAILED',
        message: 'Failed to retrieve statistics',
      });
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, startDate, endDate } = req.query;

      const filters: any = {
        integrationId: integrationId as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const report = await this.auditTrail.generateComplianceReport(filters);

      logger.info('Compliance report generated via API', {
        reportId: report.reportId,
        integrationId: filters.integrationId,
        totalOperations: report.summary.totalOperations,
      });

      res.json({
        timestamp: new Date(),
        report,
      });
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'REPORT_GENERATION_FAILED',
        message: 'Failed to generate compliance report',
      });
    }
  }

  /**
   * Get change summary for entity
   */
  async getChangeSummary(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;

      if (!entityType || !entityId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'entityType and entityId are required',
        });
        return;
      }

      const summary = await this.changeHistory.getChangeSummary(entityType, entityId);

      if (!summary) {
        res.status(404).json({
          error: 'NOT_FOUND',
          message: `No changes found for ${entityType} ${entityId}`,
        });
        return;
      }

      logger.info('Change summary retrieved via API', {
        entityType,
        entityId,
        totalChanges: summary.totalChanges,
      });

      res.json({
        timestamp: new Date(),
        summary,
      });
    } catch (error) {
      logger.error('Failed to get change summary', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'CHANGE_SUMMARY_FAILED',
        message: 'Failed to retrieve change summary',
      });
    }
  }

  /**
   * Get entity timeline
   */
  async getEntityTimeline(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      const { limit = 100 } = req.query;

      if (!entityType || !entityId) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'entityType and entityId are required',
        });
        return;
      }

      const timeline = await this.changeHistory.getEntityTimeline(
        entityType,
        entityId,
        parseInt(limit as string, 10)
      );

      logger.info('Entity timeline retrieved via API', {
        entityType,
        entityId,
        count: timeline.length,
      });

      res.json({
        timestamp: new Date(),
        entityType,
        entityId,
        count: timeline.length,
        timeline,
      });
    } catch (error) {
      logger.error('Failed to get entity timeline', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'TIMELINE_FAILED',
        message: 'Failed to retrieve timeline',
      });
    }
  }

  /**
   * Get change statistics
   */
  async getChangeStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, startDate, endDate } = req.query;

      const filters: any = {
        entityType: entityType as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const stats = await this.changeHistory.getChangeStatistics(filters);

      logger.info('Change statistics retrieved via API', {
        entityType: filters.entityType,
        totalChanges: stats.totalChanges,
      });

      res.json({
        timestamp: new Date(),
        stats,
      });
    } catch (error) {
      logger.error('Failed to get change statistics', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'CHANGE_STATS_FAILED',
        message: 'Failed to retrieve change statistics',
      });
    }
  }

  /**
   * Get change impact analysis
   */
  async getChangeImpactAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, startDate, endDate } = req.query;

      const filters: any = {
        entityType: entityType as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const analysis = await this.changeHistory.getChangeImpactAnalysis(filters);

      logger.info('Change impact analysis retrieved via API', {
        entityType: filters.entityType,
        highImpactChanges: analysis.highImpactChanges.length,
      });

      res.json({
        timestamp: new Date(),
        analysis,
      });
    } catch (error) {
      logger.error('Failed to get change impact analysis', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'IMPACT_ANALYSIS_FAILED',
        message: 'Failed to retrieve impact analysis',
      });
    }
  }

  /**
   * Export changes as CSV
   */
  async exportChangesCSV(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, startDate, endDate } = req.query;

      const filters: any = {
        entityType: entityType as string,
      };

      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }

      const csvContent = await this.changeHistory.exportChangesAsCSV(filters);

      logger.info('Changes exported as CSV via API', {
        entityType: filters.entityType,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="changes-${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (error) {
      logger.error('Failed to export changes as CSV', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'EXPORT_FAILED',
        message: 'Failed to export changes',
      });
    }
  }
}

export default AuditTrailController;
