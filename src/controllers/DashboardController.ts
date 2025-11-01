/**
 * Dashboard Controller
 * Issue #60: Phase 16 - Dashboard & Real-time Visualization
 *
 * Handles REST endpoints for real-time dashboard data, alerts, and system metrics.
 */

import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import DashboardDataService from '../services/erp/dashboard/DashboardDataService';
import AlertingService from '../services/erp/dashboard/AlertingService';
import RealtimeEventService from '../services/erp/dashboard/RealtimeEventService';

/**
 * Dashboard Controller
 */
export class DashboardController {
  private dashboardService: DashboardDataService;
  private alertingService: AlertingService;
  private eventService: RealtimeEventService;

  constructor(
    dashboardService?: DashboardDataService,
    alertingService?: AlertingService,
    eventService?: RealtimeEventService,
    private prisma?: any
  ) {
    this.dashboardService = dashboardService || new DashboardDataService();
    this.alertingService = alertingService || new AlertingService(eventService);
    this.eventService = eventService || new RealtimeEventService();
  }

  /**
   * Get comprehensive dashboard summary
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.dashboardService.getDashboardSummary();

      res.json({
        summary,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to get dashboard summary', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get dashboard summary',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get real-time metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.dashboardService.getMetrics();

      res.json({
        metrics,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to get metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get active alerts
   */
  async getAlerts(req: Request, res: Response): Promise<void> {
    try {
      const activeAlerts = this.dashboardService.getActiveAlerts();
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const sliced = activeAlerts.slice(offset, offset + limit);

      res.json({
        alerts: sliced,
        count: sliced.length,
        total: activeAlerts.length,
        offset,
        limit,
      });
    } catch (error) {
      logger.error('Failed to get alerts', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get alerts',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create an alert
   */
  async createAlert(req: Request, res: Response): Promise<void> {
    try {
      const { severity, category, title, message, metadata } = req.body;

      // Validate required fields
      if (!severity || !category || !title || !message) {
        res.status(400).json({
          error: 'Missing required fields',
          required: ['severity', 'category', 'title', 'message'],
        });
        return;
      }

      const alert = await this.dashboardService.createAlert(
        severity,
        category,
        title,
        message,
        metadata
      );

      res.status(201).json({
        alert,
        message: 'Alert created successfully',
      });
    } catch (error) {
      logger.error('Failed to create alert', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to create alert',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;

      if (!alertId) {
        res.status(400).json({
          error: 'Missing alertId parameter',
        });
        return;
      }

      const alert = await this.dashboardService.resolveAlert(alertId);

      if (!alert) {
        res.status(404).json({
          error: 'Alert not found',
          alertId,
        });
        return;
      }

      res.json({
        alert,
        message: 'Alert resolved successfully',
      });
    } catch (error) {
      logger.error('Failed to resolve alert', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to resolve alert',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get event history
   */
  async getEventHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const eventType = req.query.eventType as string;
      const source = req.query.source as string;

      const { events, total } = this.eventService.getEventHistory({
        eventType: eventType as any,
        source,
        limit,
        offset,
      });

      res.json({
        events,
        count: events.length,
        total,
        offset,
        limit,
      });
    } catch (error) {
      logger.error('Failed to get event history', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get event history',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const performanceMetrics = await this.dashboardService.getPerformanceMetrics();

      res.json({
        performanceMetrics,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to get performance metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get performance metrics',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get alerting rules
   */
  async getAlertingRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = this.alertingService.getActiveRules();

      res.json({
        rules,
        count: rules.length,
      });
    } catch (error) {
      logger.error('Failed to get alerting rules', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get alerting rules',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.eventService.getEventStatistics();

      res.json({
        statistics: stats,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to get event statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get event statistics',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = this.alertingService.getNotificationStatistics();

      res.json({
        statistics: stats,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error('Failed to get notification statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({
        error: 'Failed to get notification statistics',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default DashboardController;
