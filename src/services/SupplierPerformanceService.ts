/**
 * Supplier Performance Service
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Tracks supplier performance metrics for OSP operations
 * Used for supplier quality/delivery/cost tracking for ERP integration
 */

import { PrismaClient, SupplierPerformanceMetric, SupplierMetricType } from '@prisma/client';
import { logger } from '../utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface SupplierPerformanceData {
  vendorId: string;
  metricType: SupplierMetricType;
  periodStart: Date;
  periodEnd: Date;
  ordersOnTime: number;
  ordersLate: number;
  itemsShipped: number;
  itemsAccepted: number;
  itemsRejected: number;
  estimatedTotalCost?: number;
  actualTotalCost?: number;
}

export interface SupplierMetricsResponse {
  vendorId: string;
  vendorName: string;
  metricType: SupplierMetricType;
  periodStart: Date;
  periodEnd: Date;
  onTimeDeliveryPercent?: number;
  averageDeliveryDays?: number;
  qualityPercent?: number;
  costVariancePercent?: number;
  overallScore?: number;
  notes?: string;
}

export interface SupplierRanking {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  onTimeDeliveryPercent: number;
  qualityPercent: number;
  costVariancePercent?: number;
  overallScore: number;
  metricsCount: number;
}

// ============================================================================
// Supplier Performance Service
// ============================================================================

export default class SupplierPerformanceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Record supplier performance metrics
   */
  async recordMetrics(data: SupplierPerformanceData): Promise<SupplierMetricsResponse> {
    try {
      logger.info('Recording supplier performance metrics', {
        vendorId: data.vendorId,
        metricType: data.metricType,
        periodStart: data.periodStart
      });

      // Validate vendor exists
      const vendor = await this.prisma.vendor.findUniqueOrThrow({
        where: { id: data.vendorId }
      });

      // Calculate metrics
      const onTimeDeliveryPercent = data.ordersOnTime + data.ordersLate > 0
        ? (data.ordersOnTime / (data.ordersOnTime + data.ordersLate)) * 100
        : 0;

      const qualityPercent = data.itemsShipped > 0
        ? (data.itemsAccepted / data.itemsShipped) * 100
        : 0;

      let costVariancePercent: number | undefined;
      if (data.estimatedTotalCost && data.actualTotalCost) {
        costVariancePercent = ((data.actualTotalCost - data.estimatedTotalCost) / data.estimatedTotalCost) * 100;
      }

      // Calculate overall score (0-100 composite)
      let overallScore = 0;
      let scoreComponents = 0;

      if (data.ordersOnTime + data.ordersLate > 0) {
        overallScore += onTimeDeliveryPercent * 0.4;
        scoreComponents += 0.4;
      }

      if (data.itemsShipped > 0) {
        overallScore += qualityPercent * 0.4;
        scoreComponents += 0.4;
      }

      if (costVariancePercent !== undefined) {
        const costScore = Math.max(0, 100 - Math.abs(costVariancePercent));
        overallScore += costScore * 0.2;
        scoreComponents += 0.2;
      }

      if (scoreComponents > 0) {
        overallScore = overallScore / scoreComponents;
      }

      // Check if metric already exists for this period
      const existingMetric = await this.prisma.supplierPerformanceMetric.findFirst({
        where: {
          vendorId: data.vendorId,
          metricType: data.metricType,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd
        }
      });

      let metric;
      if (existingMetric) {
        // Update existing metric
        metric = await this.prisma.supplierPerformanceMetric.update({
          where: { id: existingMetric.id },
          data: {
            ordersOnTime: data.ordersOnTime,
            ordersLate: data.ordersLate,
            onTimeDeliveryPercent: Math.round(onTimeDeliveryPercent * 100) / 100,
            itemsShipped: data.itemsShipped,
            itemsAccepted: data.itemsAccepted,
            itemsRejected: data.itemsRejected,
            qualityPercent: Math.round(qualityPercent * 100) / 100,
            estimatedTotalCost: data.estimatedTotalCost,
            actualTotalCost: data.actualTotalCost,
            costVariancePercent: costVariancePercent ? Math.round(costVariancePercent * 100) / 100 : undefined,
            overallScore: Math.round(overallScore * 100) / 100
          }
        });
      } else {
        // Create new metric
        metric = await this.prisma.supplierPerformanceMetric.create({
          data: {
            vendorId: data.vendorId,
            metricType: data.metricType,
            periodStart: data.periodStart,
            periodEnd: data.periodEnd,
            ordersOnTime: data.ordersOnTime,
            ordersLate: data.ordersLate,
            onTimeDeliveryPercent: Math.round(onTimeDeliveryPercent * 100) / 100,
            itemsShipped: data.itemsShipped,
            itemsAccepted: data.itemsAccepted,
            itemsRejected: data.itemsRejected,
            qualityPercent: Math.round(qualityPercent * 100) / 100,
            estimatedTotalCost: data.estimatedTotalCost,
            actualTotalCost: data.actualTotalCost,
            costVariancePercent: costVariancePercent ? Math.round(costVariancePercent * 100) / 100 : undefined,
            overallScore: Math.round(overallScore * 100) / 100
          }
        });
      }

      logger.info('Supplier metrics recorded', {
        vendorId: data.vendorId,
        overallScore: metric.overallScore
      });

      return this.mapToResponse(metric, vendor.name);
    } catch (error) {
      logger.error('Failed to record supplier metrics:', error);
      throw error;
    }
  }

  /**
   * Get supplier metrics for a period
   */
  async getSupplierMetrics(
    vendorId: string,
    metricType: SupplierMetricType,
    periodStart: Date,
    periodEnd: Date
  ): Promise<SupplierMetricsResponse | null> {
    try {
      const vendor = await this.prisma.vendor.findUniqueOrThrow({
        where: { id: vendorId }
      });

      const metric = await this.prisma.supplierPerformanceMetric.findFirst({
        where: {
          vendorId,
          metricType,
          periodStart,
          periodEnd
        }
      });

      return metric ? this.mapToResponse(metric, vendor.name) : null;
    } catch (error) {
      logger.error('Failed to get supplier metrics:', error);
      throw error;
    }
  }

  /**
   * Get supplier's latest metrics of a specific type
   */
  async getLatestSupplierMetrics(vendorId: string, metricType: SupplierMetricType): Promise<SupplierMetricsResponse | null> {
    try {
      const vendor = await this.prisma.vendor.findUniqueOrThrow({
        where: { id: vendorId }
      });

      const metric = await this.prisma.supplierPerformanceMetric.findFirst({
        where: {
          vendorId,
          metricType
        },
        orderBy: {
          periodEnd: 'desc'
        }
      });

      return metric ? this.mapToResponse(metric, vendor.name) : null;
    } catch (error) {
      logger.error('Failed to get latest supplier metrics:', error);
      throw error;
    }
  }

  /**
   * Get all metrics for a supplier
   */
  async getSupplierAllMetrics(vendorId: string): Promise<SupplierMetricsResponse[]> {
    try {
      const vendor = await this.prisma.vendor.findUniqueOrThrow({
        where: { id: vendorId }
      });

      const metrics = await this.prisma.supplierPerformanceMetric.findMany({
        where: { vendorId },
        orderBy: { periodEnd: 'desc' }
      });

      return metrics.map(m => this.mapToResponse(m, vendor.name));
    } catch (error) {
      logger.error('Failed to get supplier all metrics:', error);
      throw error;
    }
  }

  /**
   * Rank suppliers by performance
   */
  async rankSuppliers(limit: number = 20): Promise<SupplierRanking[]> {
    try {
      logger.info('Ranking suppliers by performance');

      const suppliers = await this.prisma.vendor.findMany({
        where: { isActive: true },
        include: {
          ospPerformanceMetrics: {
            orderBy: { periodEnd: 'desc' },
            take: 1
          }
        }
      });

      const rankings: SupplierRanking[] = suppliers
        .filter(s => s.ospPerformanceMetrics.length > 0)
        .map(supplier => {
          const latestMetric = supplier.ospPerformanceMetrics[0];

          return {
            vendorId: supplier.id,
            vendorName: supplier.name,
            vendorCode: supplier.code,
            onTimeDeliveryPercent: latestMetric.onTimeDeliveryPercent || 0,
            qualityPercent: latestMetric.qualityPercent || 0,
            costVariancePercent: latestMetric.costVariancePercent,
            overallScore: latestMetric.overallScore || 0,
            metricsCount: 1
          };
        })
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, limit);

      return rankings;
    } catch (error) {
      logger.error('Failed to rank suppliers:', error);
      throw error;
    }
  }

  /**
   * Get supplier scorecard with aggregated metrics
   */
  async getSupplierScorecard(vendorId: string): Promise<{
    vendorName: string;
    averageQualityPercent: number;
    averageOnTimePercent: number;
    averageOverallScore: number;
    recentMetrics: SupplierMetricsResponse[];
  }> {
    try {
      const vendor = await this.prisma.vendor.findUniqueOrThrow({
        where: { id: vendorId }
      });

      const metrics = await this.prisma.supplierPerformanceMetric.findMany({
        where: { vendorId },
        orderBy: { periodEnd: 'desc' },
        take: 12 // Last 12 periods
      });

      if (metrics.length === 0) {
        return {
          vendorName: vendor.name,
          averageQualityPercent: 0,
          averageOnTimePercent: 0,
          averageOverallScore: 0,
          recentMetrics: []
        };
      }

      const avgQuality = metrics.reduce((sum, m) => sum + (m.qualityPercent || 0), 0) / metrics.length;
      const avgOnTime = metrics.reduce((sum, m) => sum + (m.onTimeDeliveryPercent || 0), 0) / metrics.length;
      const avgScore = metrics.reduce((sum, m) => sum + (m.overallScore || 0), 0) / metrics.length;

      const recentMetrics = metrics.map(m => this.mapToResponse(m, vendor.name));

      return {
        vendorName: vendor.name,
        averageQualityPercent: Math.round(avgQuality * 100) / 100,
        averageOnTimePercent: Math.round(avgOnTime * 100) / 100,
        averageOverallScore: Math.round(avgScore * 100) / 100,
        recentMetrics
      };
    } catch (error) {
      logger.error('Failed to get supplier scorecard:', error);
      throw error;
    }
  }

  /**
   * Calculate metrics from OSP operations
   */
  async calculateFromOSPOperations(vendorId: string, metricType: SupplierMetricType): Promise<void> {
    try {
      logger.info('Calculating metrics from OSP operations', { vendorId, metricType });

      // Determine period based on metric type
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      switch (metricType) {
        case 'MONTHLY': {
          periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
          periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        }
        case 'QUARTERLY': {
          const quarter = Math.floor(now.getMonth() / 3);
          periodStart = new Date(now.getFullYear(), quarter * 3, 1);
          periodEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        }
        case 'ANNUAL': {
          periodStart = new Date(now.getFullYear(), 0, 1);
          periodEnd = new Date(now.getFullYear(), 11, 31);
          break;
        }
      }

      // Get completed OSP operations for the period
      const ospOperations = await this.prisma.ospOperation.findMany({
        where: {
          vendorId,
          status: 'ACCEPTED',
          updatedAt: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });

      // Get shipments for the period
      const shipments = await this.prisma.ospShipment.findMany({
        where: {
          sendingVendorId: vendorId,
          shipmentType: 'FROM_SUPPLIER',
          actualDeliveryDate: {
            gte: periodStart,
            lte: periodEnd
          }
        }
      });

      // Calculate metrics
      const onTime = shipments.filter(s => {
        if (!s.expectedDeliveryDate || !s.actualDeliveryDate) return false;
        return s.actualDeliveryDate <= s.expectedDeliveryDate;
      }).length;

      const onTimePct = shipments.length > 0 ? (onTime / shipments.length) * 100 : 0;

      const itemsShipped = ospOperations.reduce((sum, op) => sum + op.quantitySent, 0);
      const itemsAccepted = ospOperations.reduce((sum, op) => sum + op.quantityAccepted, 0);
      const itemsRejected = ospOperations.reduce((sum, op) => sum + op.quantityRejected, 0);

      const estimatedCost = ospOperations.reduce((sum, op) => sum + (op.estimatedCost || 0), 0);
      const actualCost = ospOperations.reduce((sum, op) => sum + (op.actualCost || 0), 0);

      await this.recordMetrics({
        vendorId,
        metricType,
        periodStart,
        periodEnd,
        ordersOnTime: onTime,
        ordersLate: shipments.length - onTime,
        itemsShipped,
        itemsAccepted,
        itemsRejected,
        estimatedTotalCost: estimatedCost || undefined,
        actualTotalCost: actualCost || undefined
      });

      logger.info('Metrics calculated from OSP operations', { vendorId, operationCount: ospOperations.length });
    } catch (error) {
      logger.error('Failed to calculate metrics from OSP operations:', error);
      throw error;
    }
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponse(metric: any, vendorName: string): SupplierMetricsResponse {
    return {
      vendorId: metric.vendorId,
      vendorName,
      metricType: metric.metricType,
      periodStart: metric.periodStart,
      periodEnd: metric.periodEnd,
      onTimeDeliveryPercent: metric.onTimeDeliveryPercent,
      averageDeliveryDays: metric.averageDeliveryDays,
      qualityPercent: metric.qualityPercent,
      costVariancePercent: metric.costVariancePercent,
      overallScore: metric.overallScore,
      notes: metric.notes
    };
  }
}
