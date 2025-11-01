/**
 * Reconciliation Report Service
 * Issue #60: Phase 12 - Data Reconciliation System
 *
 * Generates and manages reconciliation reports, tracks reconciliation history,
 * and provides analytics on data quality and system alignment.
 */

import { PrismaClient } from '@prisma/client';
import DiscrepancyService, { DiscrepancyDetail, DiscrepancySeverity } from './DiscrepancyService';
import { logger } from '../../../utils/logger';

/**
 * Reconciliation report status
 */
export enum ReconciliationStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED_CLEAN = 'COMPLETED_CLEAN',
  COMPLETED_WITH_DISCREPANCIES = 'COMPLETED_WITH_DISCREPANCIES',
  FAILED = 'FAILED',
}

/**
 * Reconciliation type
 */
export enum ReconciliationType {
  SUPPLIER = 'SUPPLIER',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  WORK_ORDER = 'WORK_ORDER',
  INVENTORY = 'INVENTORY',
  COST = 'COST',
  FULL_SYNC = 'FULL_SYNC',
}

/**
 * Reconciliation report
 */
export interface ReconciliationReport {
  id: string;
  integrationId: string;
  type: ReconciliationType;
  status: ReconciliationStatus;
  periodStart: Date;
  periodEnd: Date;
  startTime: Date;
  endTime?: Date;

  // Counts
  mesRecordCount: number;
  erpRecordCount: number;
  matchedRecordCount: number;
  discrepancyCount: number;

  // Discrepancy breakdown
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;

  // Results
  discrepancies: DiscrepancyDetail[];
  summary: string;
  recommendations: string[];

  // Execution details
  duration?: number; // milliseconds
  error?: string;
  executedBy?: string;
}

/**
 * Reconciliation Report Service
 */
export class ReconciliationReportService {
  private prisma: PrismaClient;
  private discrepancyService: DiscrepancyService;

  constructor(prisma?: PrismaClient, discrepancyService?: DiscrepancyService) {
    this.prisma = prisma || new PrismaClient();
    this.discrepancyService = discrepancyService || new DiscrepancyService(this.prisma);
  }

  /**
   * Create a new reconciliation report
   */
  async createReport(
    integrationId: string,
    type: ReconciliationType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ReconciliationReport> {
    const reportId = `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id: reportId,
      integrationId,
      type,
      status: ReconciliationStatus.IN_PROGRESS,
      periodStart,
      periodEnd,
      startTime: new Date(),
      mesRecordCount: 0,
      erpRecordCount: 0,
      matchedRecordCount: 0,
      discrepancyCount: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      discrepancies: [],
      summary: 'Reconciliation in progress...',
      recommendations: [],
    };
  }

  /**
   * Finalize report after reconciliation
   */
  async finalizeReport(
    report: ReconciliationReport,
    discrepancies: DiscrepancyDetail[]
  ): Promise<ReconciliationReport> {
    try {
      const endTime = new Date();
      const duration = endTime.getTime() - report.startTime.getTime();

      // Count discrepancies by severity
      const severityCounts = {
        [DiscrepancySeverity.CRITICAL]: 0,
        [DiscrepancySeverity.HIGH]: 0,
        [DiscrepancySeverity.MEDIUM]: 0,
        [DiscrepancySeverity.LOW]: 0,
      };

      for (const disc of discrepancies) {
        severityCounts[disc.severity]++;
      }

      // Determine status
      const hasDiscrepancies = discrepancies.length > 0;
      const hasCritical = severityCounts[DiscrepancySeverity.CRITICAL] > 0;

      const status = hasDiscrepancies
        ? hasCritical
          ? ReconciliationStatus.COMPLETED_WITH_DISCREPANCIES
          : ReconciliationStatus.COMPLETED_WITH_DISCREPANCIES
        : ReconciliationStatus.COMPLETED_CLEAN;

      // Generate summary
      const summary = this.generateSummary(
        report,
        discrepancies.length,
        severityCounts
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(
        report.type,
        discrepancies,
        severityCounts
      );

      const finalizedReport: ReconciliationReport = {
        ...report,
        status,
        endTime,
        duration,
        discrepancyCount: discrepancies.length,
        criticalCount: severityCounts[DiscrepancySeverity.CRITICAL],
        highCount: severityCounts[DiscrepancySeverity.HIGH],
        mediumCount: severityCounts[DiscrepancySeverity.MEDIUM],
        lowCount: severityCounts[DiscrepancySeverity.LOW],
        discrepancies,
        summary,
        recommendations,
      };

      logger.info('Reconciliation report finalized', {
        reportId: report.id,
        status,
        discrepancyCount: discrepancies.length,
        duration,
      });

      return finalizedReport;
    } catch (error) {
      logger.error('Failed to finalize reconciliation report', {
        error: error instanceof Error ? error.message : String(error),
        reportId: report.id,
      });
      throw error;
    }
  }

  /**
   * Generate summary text for report
   */
  private generateSummary(
    report: ReconciliationReport,
    discrepancyCount: number,
    severityCounts: Record<DiscrepancySeverity, number>
  ): string {
    const matchPercentage = report.mesRecordCount > 0
      ? ((report.matchedRecordCount / report.mesRecordCount) * 100).toFixed(1)
      : 'N/A';

    let summary = `${report.type} Reconciliation Report\n`;
    summary += `Period: ${report.periodStart.toISOString()} to ${report.periodEnd.toISOString()}\n`;
    summary += `\nRecords Compared:\n`;
    summary += `  MES Records: ${report.mesRecordCount}\n`;
    summary += `  ERP Records: ${report.erpRecordCount}\n`;
    summary += `  Matched: ${report.matchedRecordCount} (${matchPercentage}%)\n`;
    summary += `\nDiscrepancies Found: ${discrepancyCount}\n`;

    if (discrepancyCount > 0) {
      summary += `  Critical: ${severityCounts[DiscrepancySeverity.CRITICAL]}\n`;
      summary += `  High: ${severityCounts[DiscrepancySeverity.HIGH]}\n`;
      summary += `  Medium: ${severityCounts[DiscrepancySeverity.MEDIUM]}\n`;
      summary += `  Low: ${severityCounts[DiscrepancySeverity.LOW]}\n`;
    }

    return summary;
  }

  /**
   * Generate recommendations based on discrepancies
   */
  private generateRecommendations(
    type: ReconciliationType,
    discrepancies: DiscrepancyDetail[],
    severityCounts: Record<DiscrepancySeverity, number>
  ): string[] {
    const recommendations: string[] = [];

    // Critical discrepancies
    if (severityCounts[DiscrepancySeverity.CRITICAL] > 0) {
      recommendations.push(
        `⚠️ URGENT: ${severityCounts[DiscrepancySeverity.CRITICAL]} critical discrepancies found. Immediate action required.`
      );
      recommendations.push('Contact system administrator and escalate to ERP team.');
    }

    // High severity discrepancies
    if (severityCounts[DiscrepancySeverity.HIGH] > 0) {
      recommendations.push(
        `⚠️ ${severityCounts[DiscrepancySeverity.HIGH]} high severity discrepancies require resolution within 24 hours.`
      );

      // Specific recommendations by type
      if (type === ReconciliationType.PURCHASE_ORDER) {
        recommendations.push(
          'Review PO quantities, prices, and status. Ensure accurate ERP posting before payment.'
        );
      } else if (type === ReconciliationType.SUPPLIER) {
        recommendations.push(
          'Verify supplier master data changes in ERP and sync to MES system.'
        );
      } else if (type === ReconciliationType.INVENTORY) {
        recommendations.push(
          'Reconcile inventory counts and adjust as needed to maintain accurate balances.'
        );
      }
    }

    // Missing records
    const missingInMes = discrepancies.filter(
      (d) => (d.mesValue === null || d.mesValue === undefined) && d.erpValue
    ).length;
    const missingInErp = discrepancies.filter(
      (d) => (d.erpValue === null || d.erpValue === undefined) && d.mesValue
    ).length;

    if (missingInMes > 0) {
      recommendations.push(
        `${missingInMes} records exist in ERP but not in MES. Consider syncing from ERP.`
      );
    }

    if (missingInErp > 0) {
      recommendations.push(
        `${missingInErp} records exist in MES but not in ERP. Verify these are valid or clean up.`
      );
    }

    // General recommendations
    if (discrepancies.length === 0) {
      recommendations.push('✅ No discrepancies found. Systems are in sync.');
    } else if (discrepancies.length < 5) {
      recommendations.push(
        'Manual review and correction recommended for all discrepancies.'
      );
    } else {
      recommendations.push(
        'Consider automated correction for low-severity discrepancies using suggested resolutions.'
      );
    }

    return recommendations;
  }

  /**
   * Get reconciliation history
   */
  async getHistory(
    integrationId: string,
    type?: ReconciliationType,
    limit: number = 10
  ): Promise<ReconciliationReport[]> {
    try {
      logger.info('Retrieving reconciliation history', {
        integrationId,
        type,
        limit,
      });

      // In a real implementation, this would query the database
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to get reconciliation history', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Get trends over time
   */
  async getTrends(
    integrationId: string,
    type: ReconciliationType,
    days: number = 30
  ): Promise<{
    date: Date;
    discrepancyCount: number;
    criticalCount: number;
    trend: 'improving' | 'stable' | 'degrading';
  }[]> {
    try {
      logger.info('Analyzing reconciliation trends', {
        integrationId,
        type,
        days,
      });

      // In a real implementation, this would analyze historical data
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Failed to analyze reconciliation trends', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Calculate data quality score
   */
  calculateDataQualityScore(report: ReconciliationReport): number {
    if (report.mesRecordCount === 0) {
      return 100; // No data to compare
    }

    const matchPercentage = (report.matchedRecordCount / report.mesRecordCount) * 100;
    const discrepancyPenalty =
      report.criticalCount * 10 +
      report.highCount * 5 +
      report.mediumCount * 2 +
      report.lowCount * 0.5;

    const score = Math.max(0, Math.min(100, matchPercentage - discrepancyPenalty));
    return parseFloat(score.toFixed(2));
  }
}

export default ReconciliationReportService;
