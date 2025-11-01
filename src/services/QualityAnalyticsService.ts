/**
 * Quality Analytics Service (Issue #58)
 * Provides comprehensive quality metrics, Pareto analysis, and Cost of Quality (CoQ) tracking
 */

import { Prisma } from "@prisma/client";
import prisma from "../lib/database";
import { logger } from "../utils/logger";

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface MetricCalculationResult {
  metricType: string;
  period: string;
  value: number;
  trend: number | null;
  status: "GREEN" | "YELLOW" | "RED";
  numerator: number;
  denominator: number;
  sampleSize: number;
}

export interface ParetoItem {
  category: string;
  count: number;
  value: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface ParetoResult {
  analysisType: string;
  items: ParetoItem[];
  vitalFewCount: number;
  totalItems: number;
  totalOccurrences: number;
  totalCost: number | null;
}

export interface QualitySummary {
  siteId: string;
  period: string;
  metrics: {
    ncrRate: number;
    firstPassYield: number;
    dpmo: number;
    copq: number;
    scrapRate: number;
    reworkRate: number;
  };
  trends: {
    ncrRateTrend: number | null;
    firstPassYieldTrend: number | null;
    dproTrend: number | null;
  };
  topPareto: ParetoResult[];
  alertCount: number;
  escapeCount: number;
}

// ============================================================================
// Quality Analytics Service
// ============================================================================

export class QualityAnalyticsService {
  /**
   * Calculate NCR Rate = (Total NCRs / Total Units Produced) * 100
   */
  async calculateNCRRate(
    siteId: string,
    periodStart: Date,
    periodEnd: Date,
    defectType?: string,
    product?: string
  ): Promise<MetricCalculationResult> {
    try {
      const ncrCount = await prisma.nCR.count({
        where: {
          siteId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          ...(defectType && { defectType }),
          ...(product && { workOrder: { productId: product } }),
        },
      });

      // Get total units produced from work orders
      const workOrderStats = await prisma.workOrder.aggregate({
        where: {
          siteId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          ...(product && { productId: product }),
        },
        _sum: {
          plannedQuantity: true,
        },
      });

      const totalUnits = workOrderStats._sum.plannedQuantity || 1;
      const ncrRate = (ncrCount / totalUnits) * 100;
      const previousRate = await this.getPreviousMetricValue(
        siteId,
        "NCR_RATE",
        periodStart,
        defectType,
        product
      );
      const trend =
        previousRate !== null ? ((ncrRate - previousRate) / previousRate) * 100 : null;

      return {
        metricType: "NCR_RATE",
        period: this.getPeriodString(periodStart, periodEnd),
        value: ncrRate,
        trend,
        status: this.getMetricStatus("NCR_RATE", ncrRate, siteId),
        numerator: ncrCount,
        denominator: totalUnits,
        sampleSize: ncrCount,
      };
    } catch (error) {
      logger.error("Error calculating NCR rate", error);
      throw error;
    }
  }

  /**
   * Calculate First Pass Yield (FPY) = (Units Passed Without Defects / Total Units) * 100
   */
  async calculateFirstPassYield(
    siteId: string,
    periodStart: Date,
    periodEnd: Date,
    product?: string
  ): Promise<MetricCalculationResult> {
    try {
      // Get total work order operations
      const totalOperations = await prisma.workOrderOperation.count({
        where: {
          workOrder: {
            siteId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
            ...(product && { productId: product }),
          },
        },
      });

      // Get operations that passed quality inspection on first attempt
      const passedOperations = await prisma.workOrderOperation.count({
        where: {
          workOrder: {
            siteId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
            ...(product && { productId: product }),
          },
          qualityInspections: {
            some: {
              result: "PASS",
              status: "COMPLETED",
            },
          },
          ncrs: {
            none: {
              createdAt: {
                gte: periodStart,
                lte: periodEnd,
              },
            },
          },
        },
      });

      const fpy = totalOperations > 0 ? (passedOperations / totalOperations) * 100 : 0;
      const previousFpy = await this.getPreviousMetricValue(
        siteId,
        "FIRST_PASS_YIELD",
        periodStart,
        undefined,
        product
      );
      const trend =
        previousFpy !== null ? ((fpy - previousFpy) / previousFpy) * 100 : null;

      return {
        metricType: "FIRST_PASS_YIELD",
        period: this.getPeriodString(periodStart, periodEnd),
        value: fpy,
        trend,
        status: this.getMetricStatus("FIRST_PASS_YIELD", fpy, siteId),
        numerator: passedOperations,
        denominator: totalOperations,
        sampleSize: totalOperations,
      };
    } catch (error) {
      logger.error("Error calculating first pass yield", error);
      throw error;
    }
  }

  /**
   * Calculate DPMO = (Total Defects / Total Opportunities) * 1,000,000
   */
  async calculateDPMO(
    siteId: string,
    periodStart: Date,
    periodEnd: Date,
    severity?: string
  ): Promise<MetricCalculationResult> {
    try {
      // Count NCRs as defects
      const defectCount = await prisma.nCR.count({
        where: {
          siteId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          ...(severity && { severity: severity as any }),
        },
      });

      // Calculate total opportunities (units * characteristics per unit)
      // For simplicity, using total operations as opportunities
      const totalOpportunities = await prisma.workOrderOperation.count({
        where: {
          workOrder: {
            siteId,
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        },
      });

      const dpmo =
        totalOpportunities > 0 ? (defectCount / totalOpportunities) * 1000000 : 0;
      const previousDPMO = await this.getPreviousMetricValue(
        siteId,
        "DPMO",
        periodStart,
        undefined,
        undefined,
        severity
      );
      const trend =
        previousDPMO !== null ? ((dpmo - previousDPMO) / previousDPMO) * 100 : null;

      return {
        metricType: "DPMO",
        period: this.getPeriodString(periodStart, periodEnd),
        value: dpmo,
        trend,
        status: this.getMetricStatus("DPMO", dpmo, siteId),
        numerator: defectCount,
        denominator: totalOpportunities,
        sampleSize: defectCount,
      };
    } catch (error) {
      logger.error("Error calculating DPMO", error);
      throw error;
    }
  }

  /**
   * Calculate Cost of Quality (CoQ) = Sum of all quality-related costs
   * PAF Model: Prevention + Appraisal + Internal Failure + External Failure
   */
  async calculateCostOfQuality(
    siteId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<{
    totalCoq: number;
    preventionCost: number;
    appraisalCost: number;
    internalFailureCost: number;
    externalFailureCost: number;
    copqPercent: number;
  }> {
    try {
      // Get NCRs with cost data
      const ncrs = await prisma.nCR.findMany({
        where: {
          siteId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      // Sum all cost components
      let internalFailureCost = 0; // Scrap + Rework + Sorting
      let externalFailureCost = 0; // Customer costs + Returns

      for (const ncr of ncrs) {
        internalFailureCost += (ncr.scrapCost?.toNumber() || 0) +
          (ncr.reworkCost?.toNumber() || 0) +
          (ncr.sortingCost?.toNumber() || 0);

        externalFailureCost += ncr.customerCost?.toNumber() || 0;
      }

      // Engineering cost from NCRs
      const engineeringCost = ncrs.reduce(
        (sum, ncr) => sum + (ncr.engineeringCost?.toNumber() || 0),
        0
      );

      // Get inspection/audit costs (appraisal) - estimate from quality inspections
      const inspectionCount = await prisma.qualityInspection.count({
        where: {
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          workOrderOperation: {
            workOrder: {
              siteId,
            },
          },
        },
      });
      const appraisalCost = inspectionCount * 100; // Assume $100 per inspection

      // Prevention cost - estimate (training, quality planning)
      const preventionCost = (internalFailureCost + externalFailureCost) * 0.05; // 5% of failure costs

      const totalCoq =
        preventionCost + appraisalCost + internalFailureCost + externalFailureCost;

      return {
        totalCoq,
        preventionCost,
        appraisalCost,
        internalFailureCost,
        externalFailureCost,
        copqPercent: 0, // Would need revenue data to calculate
      };
    } catch (error) {
      logger.error("Error calculating cost of quality", error);
      throw error;
    }
  }

  /**
   * Generate Pareto analysis for a given dimension
   */
  async generateParetoAnalysis(
    siteId: string,
    analysisType: string,
    periodStart: Date,
    periodEnd: Date,
    severity?: string,
    defectType?: string
  ): Promise<ParetoResult> {
    try {
      // Query NCRs grouped by analysis dimension
      const groupBy = this.getGroupByField(analysisType);
      if (!groupBy) {
        throw new Error(`Invalid Pareto analysis type: ${analysisType}`);
      }

      const ncrs = await prisma.nCR.findMany({
        where: {
          siteId,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
          ...(severity && { severity: severity as any }),
          ...(defectType && { defectType }),
        },
        select: {
          [groupBy]: true,
          actualCost: true,
          scrapCost: true,
          reworkCost: true,
        },
      });

      // Aggregate by dimension
      const grouped: { [key: string]: { count: number; value: number } } = {};
      let totalCost = 0;

      for (const ncr of ncrs) {
        const key = String(ncr[groupBy as keyof typeof ncr] || "Unknown");
        if (!grouped[key]) {
          grouped[key] = { count: 0, value: 0 };
        }
        grouped[key].count++;

        const cost =
          (ncr.actualCost?.toNumber() || 0) +
          (ncr.scrapCost?.toNumber() || 0) +
          (ncr.reworkCost?.toNumber() || 0);
        grouped[key].value += cost;
        totalCost += cost;
      }

      // Sort by count descending
      const sorted = Object.entries(grouped)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([category, data]) => ({
          category,
          count: data.count,
          value: data.value,
          percentage: (data.count / ncrs.length) * 100,
          cumulativePercentage: 0,
        }));

      // Calculate cumulative percentages
      let cumulative = 0;
      sorted.forEach((item) => {
        cumulative += item.percentage;
        item.cumulativePercentage = cumulative;
      });

      // Find vital few (80%)
      const vitalFewCount = sorted.findIndex((item) => item.cumulativePercentage >= 80) + 1;

      return {
        analysisType,
        items: sorted,
        vitalFewCount: Math.max(vitalFewCount, 1),
        totalItems: sorted.length,
        totalOccurrences: ncrs.length,
        totalCost,
      };
    } catch (error) {
      logger.error("Error generating Pareto analysis", error);
      throw error;
    }
  }

  /**
   * Store calculated metrics in database for materialized views
   */
  async storeMetric(
    siteId: string,
    metricType: string,
    period: string,
    periodStart: Date,
    periodEnd: Date,
    value: number,
    numerator: number,
    denominator: number,
    defectType?: string,
    rootCause?: string,
    product?: string,
    supplier?: string,
    workCenter?: string,
    operation?: string,
    customer?: string,
    severity?: string,
    disposition?: string,
    detectionPoint?: string
  ): Promise<void> {
    try {
      await prisma.qualityMetric.upsert({
        where: {
          siteId_metricType_period_periodStart_defectType_rootCause_product_supplier_workCenter_operation_customer_severity_disposition_detectionPoint: {
            siteId,
            metricType: metricType as any,
            period,
            periodStart,
            defectType,
            rootCause,
            product,
            supplier,
            workCenter,
            operation,
            customer,
            severity: severity as any,
            disposition: disposition as any,
            detectionPoint: detectionPoint as any,
          },
        },
        create: {
          siteId,
          metricType: metricType as any,
          period,
          periodStart,
          periodEnd,
          defectType,
          rootCause,
          product,
          supplier,
          workCenter,
          operation,
          customer,
          severity: severity as any,
          disposition: disposition as any,
          detectionPoint: detectionPoint as any,
          value,
          numerator,
          denominator,
          sampleSize: numerator,
          calculatedAt: new Date(),
        },
        update: {
          value,
          numerator,
          denominator,
          sampleSize: numerator,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error("Error storing metric", error);
      // Don't throw - metrics storage should not block operations
    }
  }

  /**
   * Get comprehensive quality summary for a site
   */
  async getQualitySummary(
    siteId: string,
    period: "DAY" | "WEEK" | "MONTH" = "DAY"
  ): Promise<QualitySummary> {
    try {
      const { periodStart, periodEnd } = this.getPeriodDates(period);

      // Calculate all metrics
      const [
        ncrRate,
        fpy,
        dpmo,
        coq,
        paretoDefectType,
        paretoRootCause,
      ] = await Promise.all([
        this.calculateNCRRate(siteId, periodStart, periodEnd),
        this.calculateFirstPassYield(siteId, periodStart, periodEnd),
        this.calculateDPMO(siteId, periodStart, periodEnd),
        this.calculateCostOfQuality(siteId, periodStart, periodEnd),
        this.generateParetoAnalysis(siteId, "DEFECT_TYPE", periodStart, periodEnd),
        this.generateParetoAnalysis(siteId, "ROOT_CAUSE", periodStart, periodEnd),
      ]);

      // Get escaped defects count
      const escapeCount = await prisma.nCR.count({
        where: {
          siteId,
          isEscapedDefect: true,
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      // Get active alerts
      const alertCount = await prisma.qualityAlert.count({
        where: {
          siteId,
          status: "ACTIVE",
          createdAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
      });

      return {
        siteId,
        period,
        metrics: {
          ncrRate: Number(ncrRate.value.toFixed(2)),
          firstPassYield: Number(fpy.value.toFixed(2)),
          dpmo: Number(dpmo.value.toFixed(0)),
          copq: Number(((coq.totalCoq / 1000000) * 100).toFixed(2)), // Rough estimation
          scrapRate: 0, // Would calculate separately
          reworkRate: 0, // Would calculate separately
        },
        trends: {
          ncrRateTrend: ncrRate.trend,
          firstPassYieldTrend: fpy.trend,
          dproTrend: dpmo.trend,
        },
        topPareto: [paretoDefectType, paretoRootCause],
        alertCount,
        escapeCount,
      };
    } catch (error) {
      logger.error("Error getting quality summary", error);
      throw error;
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getPreviousMetricValue(
    siteId: string,
    metricType: string,
    periodStart: Date,
    defectType?: string,
    product?: string,
    severity?: string
  ): Promise<number | null> {
    try {
      const metric = await prisma.qualityMetric.findFirst({
        where: {
          siteId,
          metricType: metricType as any,
          periodStart: {
            lt: periodStart,
          },
          ...(defectType && { defectType }),
          ...(product && { product }),
          ...(severity && { severity: severity as any }),
        },
        orderBy: {
          periodStart: "desc",
        },
      });

      return metric ? metric.value : null;
    } catch (error) {
      logger.warn("Error getting previous metric value", error);
      return null;
    }
  }

  private getMetricStatus(
    metricType: string,
    value: number,
    siteId: string
  ): "GREEN" | "YELLOW" | "RED" {
    // Default thresholds - should be pulled from configuration
    const thresholds: { [key: string]: { green: number; yellow: number } } = {
      NCR_RATE: { green: 0.5, yellow: 1.0 }, // % NCRs
      FIRST_PASS_YIELD: { green: 98, yellow: 95 }, // % FPY
      DPMO: { green: 3000, yellow: 10000 }, // Defects per million
      SCRAP_RATE: { green: 1, yellow: 2 }, // % Scrap
      REWORK_RATE: { green: 2, yellow: 3 }, // % Rework
    };

    const threshold = thresholds[metricType];
    if (!threshold) return "GREEN";

    if (
      metricType === "FIRST_PASS_YIELD" ||
      metricType === "SUPPLIER_QUALITY_INDEX"
    ) {
      // Higher is better for these metrics
      if (value >= threshold.green) return "GREEN";
      if (value >= threshold.yellow) return "YELLOW";
      return "RED";
    } else {
      // Lower is better for these metrics
      if (value <= threshold.green) return "GREEN";
      if (value <= threshold.yellow) return "YELLOW";
      return "RED";
    }
  }

  private getPeriodString(periodStart: Date, periodEnd: Date): string {
    const start = periodStart.toISOString().split("T")[0];
    const end = periodEnd.toISOString().split("T")[0];
    return `${start} to ${end}`;
  }

  private getPeriodDates(
    period: "DAY" | "WEEK" | "MONTH"
  ): { periodStart: Date; periodEnd: Date } {
    const periodEnd = new Date();
    const periodStart = new Date();

    switch (period) {
      case "DAY":
        periodStart.setDate(periodStart.getDate() - 1);
        break;
      case "WEEK":
        periodStart.setDate(periodStart.getDate() - 7);
        break;
      case "MONTH":
        periodStart.setMonth(periodStart.getMonth() - 1);
        break;
    }

    return { periodStart, periodEnd };
  }

  private getGroupByField(
    analysisType: string
  ): "defectType" | "rootCause" | null {
    // Map Pareto analysis types to NCR fields
    const fieldMap: { [key: string]: string } = {
      DEFECT_TYPE: "defectType",
      ROOT_CAUSE: "rootCauseId",
    };

    return (fieldMap[analysisType] || null) as any;
  }
}
