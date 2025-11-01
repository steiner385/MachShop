/**
 * Monitoring Controller
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 *
 * Provides REST endpoints for monitoring webhooks, health checks, and metrics.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import WebhookMetricsService from '../services/monitoring/WebhookMetricsService';
import IntegrationHealthService from '../services/monitoring/IntegrationHealthService';
import { logger } from '../utils/logger';

/**
 * Monitoring Controller
 */
export class MonitoringController {
  private prisma: PrismaClient;
  private webhookMetricsService: WebhookMetricsService;
  private integrationHealthService: IntegrationHealthService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.webhookMetricsService = new WebhookMetricsService(this.prisma);
    this.integrationHealthService = new IntegrationHealthService(this.prisma);
  }

  /**
   * Get health status for all integrations
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const results = await this.integrationHealthService.getAllHealthStatus();

      logger.info('Health status retrieved', {
        count: results.length,
      });

      res.json({
        timestamp: new Date(),
        integrations: results,
      });
    } catch (error) {
      logger.error('Failed to get health status', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'HEALTH_CHECK_FAILED',
        message: 'Failed to retrieve health status',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get health status for specific integration
   */
  async getIntegrationHealth(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      const result = await this.integrationHealthService.healthCheck(integrationId);

      logger.info('Integration health checked', {
        integrationId,
        status: result.status,
      });

      res.json(result);
    } catch (error) {
      logger.error('Failed to check integration health', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'HEALTH_CHECK_FAILED',
        message: 'Failed to check integration health',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get webhook metrics for integration
   */
  async getWebhookMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      const metrics = await this.webhookMetricsService.getWebhookMetricsSummary(integrationId);

      logger.info('Webhook metrics retrieved', {
        integrationId,
      });

      res.json({
        timestamp: new Date(),
        metrics,
      });
    } catch (error) {
      logger.error('Failed to get webhook metrics', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to retrieve webhook metrics',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get metrics for specific webhook
   */
  async getWebhookDetail(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const metrics = await this.webhookMetricsService.getWebhookMetrics(webhookId);

      logger.info('Webhook detail metrics retrieved', {
        webhookId,
      });

      res.json({
        timestamp: new Date(),
        data: metrics,
      });
    } catch (error) {
      logger.error('Failed to get webhook detail metrics', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: req.params.webhookId,
      });

      res.status(500).json({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to retrieve webhook metrics',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get integration summary (health + metrics)
   */
  async getIntegrationSummary(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      const [health, metrics] = await Promise.all([
        this.integrationHealthService.healthCheck(integrationId),
        this.webhookMetricsService.getWebhookMetricsSummary(integrationId),
      ]);

      logger.info('Integration summary retrieved', {
        integrationId,
      });

      res.json({
        timestamp: new Date(),
        integrationId,
        health,
        webhookMetrics: metrics,
      });
    } catch (error) {
      logger.error('Failed to get integration summary', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'SUMMARY_FETCH_FAILED',
        message: 'Failed to retrieve integration summary',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get sync performance metrics
   */
  async getSyncMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { days = '7' } = req.query;

      const daysNum = Math.min(Math.max(parseInt(String(days)), 1), 90); // 1-90 days
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      const logs = await this.prisma.erpLog.findMany({
        where: {
          erpIntegrationId: integrationId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          operation: true,
          status: true,
          duration: true,
          recordCount: true,
          successCount: true,
          errorCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate metrics
      const successful = logs.filter((l) => l.status === 'SUCCESS').length;
      const failed = logs.filter((l) => l.status === 'FAILED').length;
      const avgDuration = logs.length > 0 ? logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length : 0;
      const totalRecords = logs.reduce((sum, l) => sum + (l.recordCount || 0), 0);

      logger.info('Sync metrics retrieved', {
        integrationId,
        days: daysNum,
        total: logs.length,
      });

      res.json({
        timestamp: new Date(),
        period: { days: daysNum, startDate },
        summary: {
          totalSyncs: logs.length,
          successful,
          failed,
          successRate: logs.length > 0 ? parseFloat(((successful / logs.length) * 100).toFixed(2)) : 0,
          avgDurationSeconds: parseFloat((avgDuration / 1000).toFixed(2)),
          totalRecords,
        },
        recentSyncs: logs.slice(0, 10),
      });
    } catch (error) {
      logger.error('Failed to get sync metrics', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to retrieve sync metrics',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get reconciliation metrics
   */
  async getReconciliationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { days = '30' } = req.query;

      const daysNum = Math.min(Math.max(parseInt(String(days)), 1), 90);
      const startDate = new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000);

      const reports = await this.prisma.erpReconciliationReport.findMany({
        where: {
          erpIntegrationId: integrationId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          entityType: true,
          status: true,
          totalRecords: true,
          matchedRecords: true,
          discrepancyCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Calculate metrics
      const completedReports = reports.filter((r) => r.status === 'COMPLETED');
      const totalDiscrepancies = reports.reduce((sum, r) => sum + r.discrepancyCount, 0);
      const avgMatchRate =
        completedReports.length > 0
          ? completedReports.reduce((sum, r) => sum + (r.matchedRecords / Math.max(r.totalRecords, 1)), 0) /
            completedReports.length
          : 0;

      logger.info('Reconciliation metrics retrieved', {
        integrationId,
        days: daysNum,
      });

      res.json({
        timestamp: new Date(),
        period: { days: daysNum, startDate },
        summary: {
          totalReports: reports.length,
          successful: completedReports.length,
          failed: reports.filter((r) => r.status === 'FAILED').length,
          successRate: reports.length > 0 ? parseFloat(((completedReports.length / reports.length) * 100).toFixed(2)) : 0,
          totalDiscrepancies,
          avgMatchRate: parseFloat((avgMatchRate * 100).toFixed(2)),
        },
        recentReports: reports.slice(0, 10),
      });
    } catch (error) {
      logger.error('Failed to get reconciliation metrics', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'METRICS_FETCH_FAILED',
        message: 'Failed to retrieve reconciliation metrics',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default MonitoringController;
