/**
 * Reconciliation Controller
 * Issue #60: Phase 12 - Data Reconciliation System
 *
 * Provides REST endpoints for managing data reconciliation between MES and ERP.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import DiscrepancyService, { DiscrepancySeverity } from '../services/erp/reconciliation/DiscrepancyService';
import ReconciliationReportService, { ReconciliationType } from '../services/erp/reconciliation/ReconciliationReportService';
import EntityReconciliationService from '../services/erp/reconciliation/EntityReconciliationService';
import { logger } from '../utils/logger';

/**
 * Reconciliation Controller
 */
export class ReconciliationController {
  private prisma: PrismaClient;
  private discrepancyService: DiscrepancyService;
  private reportService: ReconciliationReportService;
  private entityService: EntityReconciliationService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.discrepancyService = new DiscrepancyService(this.prisma);
    this.reportService = new ReconciliationReportService(this.prisma, this.discrepancyService);
    this.entityService = new EntityReconciliationService(this.prisma, this.discrepancyService);
  }

  /**
   * Trigger reconciliation for a specific entity type
   */
  async triggerReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { type, periodStart, periodEnd } = req.body;

      // Validate input
      if (!type || !Object.values(ReconciliationType).includes(type)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: `Invalid reconciliation type. Must be one of: ${Object.values(ReconciliationType).join(', ')}`,
        });
        return;
      }

      const start = periodStart ? new Date(periodStart) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const end = periodEnd ? new Date(periodEnd) : new Date();

      logger.info('Triggering reconciliation', {
        integrationId,
        type,
        period: { start, end },
      });

      // Create report
      const report = await this.reportService.createReport(integrationId, type, start, end);

      // Perform reconciliation based on type
      let result;
      switch (type) {
        case ReconciliationType.SUPPLIER:
          result = await this.entityService.reconcileSuppliers(integrationId, report.id);
          break;
        case ReconciliationType.PURCHASE_ORDER:
          result = await this.entityService.reconcilePurchaseOrders(integrationId, report.id);
          break;
        case ReconciliationType.WORK_ORDER:
          result = await this.entityService.reconcileWorkOrders(integrationId, report.id);
          break;
        case ReconciliationType.INVENTORY:
          result = await this.entityService.reconcileInventory(integrationId, report.id);
          break;
        case ReconciliationType.FULL_SYNC:
          // Run all reconciliation types
          const results = await Promise.all([
            this.entityService.reconcileSuppliers(integrationId, report.id),
            this.entityService.reconcilePurchaseOrders(integrationId, report.id),
            this.entityService.reconcileWorkOrders(integrationId, report.id),
            this.entityService.reconcileInventory(integrationId, report.id),
          ]);

          // Merge results
          const allDiscrepancies = results.flatMap((r) => r.discrepancies);
          result = {
            entityType: 'FULL_SYNC',
            totalMesRecords: results.reduce((sum, r) => sum + r.totalMesRecords, 0),
            totalErpRecords: results.reduce((sum, r) => sum + r.totalErpRecords, 0),
            matchedRecords: results.reduce((sum, r) => sum + r.matchedRecords, 0),
            discrepancies: allDiscrepancies,
          };
          break;
        default:
          result = {
            entityType: type,
            totalMesRecords: 0,
            totalErpRecords: 0,
            matchedRecords: 0,
            discrepancies: [],
          };
      }

      // Update report with results
      report.mesRecordCount = result.totalMesRecords;
      report.erpRecordCount = result.totalErpRecords;
      report.matchedRecordCount = result.matchedRecords;

      const finalizedReport = await this.reportService.finalizeReport(report, result.discrepancies);
      const dataQualityScore = this.reportService.calculateDataQualityScore(finalizedReport);

      logger.info('Reconciliation completed', {
        integrationId,
        type,
        discrepancyCount: result.discrepancies.length,
        dataQualityScore,
      });

      res.json({
        timestamp: new Date(),
        report: finalizedReport,
        dataQualityScore,
      });
    } catch (error) {
      logger.error('Failed to trigger reconciliation', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'RECONCILIATION_FAILED',
        message: 'Failed to complete reconciliation',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get reconciliation report
   */
  async getReport(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, reportId } = req.params;

      logger.info('Retrieving reconciliation report', {
        integrationId,
        reportId,
      });

      res.json({
        timestamp: new Date(),
        message: 'Report retrieval not yet implemented',
        reportId,
      });
    } catch (error) {
      logger.error('Failed to get reconciliation report', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'REPORT_FETCH_FAILED',
        message: 'Failed to retrieve reconciliation report',
      });
    }
  }

  /**
   * Get reconciliation history
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { type, limit = '10' } = req.query;

      const limitNum = Math.min(Math.max(parseInt(String(limit)), 1), 100);

      logger.info('Retrieving reconciliation history', {
        integrationId,
        type,
        limit: limitNum,
      });

      const history = await this.reportService.getHistory(
        integrationId,
        type as ReconciliationType,
        limitNum
      );

      res.json({
        timestamp: new Date(),
        integrationId,
        history,
      });
    } catch (error) {
      logger.error('Failed to get reconciliation history', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'HISTORY_FETCH_FAILED',
        message: 'Failed to retrieve reconciliation history',
      });
    }
  }

  /**
   * Get trends and analysis
   */
  async getTrends(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { type, days = '30' } = req.query;

      if (!type || !Object.values(ReconciliationType).includes(type as ReconciliationType)) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'Type parameter is required and must be valid',
        });
        return;
      }

      const daysNum = Math.min(Math.max(parseInt(String(days)), 1), 90);

      logger.info('Analyzing reconciliation trends', {
        integrationId,
        type,
        days: daysNum,
      });

      const trends = await this.reportService.getTrends(
        integrationId,
        type as ReconciliationType,
        daysNum
      );

      res.json({
        timestamp: new Date(),
        integrationId,
        period: { days: daysNum },
        trends,
      });
    } catch (error) {
      logger.error('Failed to get reconciliation trends', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'TRENDS_ANALYSIS_FAILED',
        message: 'Failed to analyze reconciliation trends',
      });
    }
  }

  /**
   * Get discrepancies for a report
   */
  async getDiscrepancies(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, reportId } = req.params;
      const { severity, entityType, limit = '100' } = req.query;

      const limitNum = Math.min(Math.max(parseInt(String(limit)), 1), 1000);

      logger.info('Retrieving discrepancies', {
        integrationId,
        reportId,
        severity,
        entityType,
        limit: limitNum,
      });

      res.json({
        timestamp: new Date(),
        integrationId,
        reportId,
        filters: { severity, entityType, limit: limitNum },
        discrepancies: [],
      });
    } catch (error) {
      logger.error('Failed to get discrepancies', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'DISCREPANCIES_FETCH_FAILED',
        message: 'Failed to retrieve discrepancies',
      });
    }
  }

  /**
   * Resolve a discrepancy
   */
  async resolveDiscrepancy(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, discrepancyId } = req.params;
      const { resolutionType, correctedValue, correctionDetails } = req.body;

      if (!resolutionType) {
        res.status(400).json({
          error: 'INVALID_REQUEST',
          message: 'resolutionType is required',
        });
        return;
      }

      const resolvedBy = (req as any).user?.id || 'system';

      logger.info('Resolving discrepancy', {
        integrationId,
        discrepancyId,
        resolutionType,
        resolvedBy,
      });

      await this.discrepancyService.resolveDiscrepancy(
        discrepancyId,
        resolutionType,
        correctedValue,
        correctionDetails || '',
        resolvedBy
      );

      res.json({
        timestamp: new Date(),
        integrationId,
        discrepancyId,
        status: 'RESOLVED',
        resolutionType,
      });
    } catch (error) {
      logger.error('Failed to resolve discrepancy', {
        error: error instanceof Error ? error.message : String(error),
        discrepancyId: req.params.discrepancyId,
      });

      res.status(500).json({
        error: 'RESOLUTION_FAILED',
        message: 'Failed to resolve discrepancy',
      });
    }
  }

  /**
   * Get discrepancy suggestions
   */
  async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId, discrepancyId } = req.params;

      logger.info('Getting discrepancy suggestions', {
        integrationId,
        discrepancyId,
      });

      // In real implementation, would fetch discrepancy and generate suggestions
      res.json({
        timestamp: new Date(),
        integrationId,
        discrepancyId,
        suggestions: [
          {
            type: 'SYNC_CORRECTION',
            rationale: 'ERP is system of record',
            recommendedValue: null,
          },
        ],
      });
    } catch (error) {
      logger.error('Failed to get suggestions', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'SUGGESTIONS_FAILED',
        message: 'Failed to generate suggestions',
      });
    }
  }

  /**
   * Get reconciliation dashboard summary
   */
  async getDashboardSummary(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      logger.info('Retrieving dashboard summary', {
        integrationId,
      });

      res.json({
        timestamp: new Date(),
        integrationId,
        summary: {
          lastReconciliation: null,
          dataQualityScore: 0,
          pendingDiscrepancies: 0,
          criticalCount: 0,
          highCount: 0,
          trend: 'stable',
        },
      });
    } catch (error) {
      logger.error('Failed to get dashboard summary', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'DASHBOARD_FAILED',
        message: 'Failed to retrieve dashboard data',
      });
    }
  }
}

export default ReconciliationController;
