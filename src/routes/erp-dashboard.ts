/**
 * ERP Dashboard Routes
 * Issue #60: Phase 16 - Dashboard & Real-time Visualization
 *
 * REST endpoints for real-time ERP sync monitoring, alerts, and system metrics.
 */

import { Router } from 'express';
import DashboardController from '../controllers/DashboardController';

const router = Router();
const dashboardController = new DashboardController();

/**
 * GET /api/v1/erp/dashboard/summary
 * Get comprehensive dashboard summary with all ERP metrics and alerts
 */
router.get('/summary', (req, res) => dashboardController.getDashboardSummary(req, res));

/**
 * GET /api/v1/erp/dashboard/metrics
 * Get real-time ERP metrics (sync status, job status, conflict status, system health)
 */
router.get('/metrics', (req, res) => dashboardController.getMetrics(req, res));

/**
 * GET /api/v1/erp/dashboard/alerts
 * Get active ERP alerts with filtering and pagination
 * Query parameters: limit, offset
 */
router.get('/alerts', (req, res) => dashboardController.getAlerts(req, res));

/**
 * POST /api/v1/erp/dashboard/alerts
 * Create a new ERP alert
 * Body: { severity, category, title, message, metadata? }
 */
router.post('/alerts', (req, res) => dashboardController.createAlert(req, res));

/**
 * PUT /api/v1/erp/dashboard/alerts/:alertId/resolve
 * Resolve an ERP alert
 */
router.put('/alerts/:alertId/resolve', (req, res) => dashboardController.resolveAlert(req, res));

/**
 * GET /api/v1/erp/dashboard/events
 * Get ERP event history with filtering and pagination
 * Query parameters: limit, offset, eventType, source
 */
router.get('/events', (req, res) => dashboardController.getEventHistory(req, res));

/**
 * GET /api/v1/erp/dashboard/events/statistics
 * Get ERP event statistics
 */
router.get('/events/statistics', (req, res) => dashboardController.getEventStatistics(req, res));

/**
 * GET /api/v1/erp/dashboard/performance
 * Get ERP performance metrics (throughput, processing rates, duration averages)
 */
router.get('/performance', (req, res) => dashboardController.getPerformanceMetrics(req, res));

/**
 * GET /api/v1/erp/dashboard/rules
 * Get active ERP alerting rules
 */
router.get('/rules', (req, res) => dashboardController.getAlertingRules(req, res));

/**
 * GET /api/v1/erp/dashboard/notifications/statistics
 * Get ERP notification statistics
 */
router.get('/notifications/statistics', (req, res) =>
  dashboardController.getNotificationStatistics(req, res)
);

export default router;
