/**
 * Production Performance Export Service
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Exports work order actuals (from Task 1.7 WorkPerformance data) to ERP systems
 * Following ISA-95 Part 3 specification for production performance reporting
 */

import { PrismaClient, B2MMessageStatus } from '@prisma/client';
import { ProductionPerformanceActualInput, ProductionPerformanceExportResult } from '../types/b2m';
import B2MMessageBuilder from './B2MMessageBuilder';
import { v4 as uuidv4 } from 'uuid';

export class ProductionPerformanceExportService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

  /**
   * Export work order production actuals to ERP
   * Aggregates all performance data (labor, material, equipment, quality, downtime) for a work order
   */
  async exportWorkOrderActuals(params: {
    workOrderId: string;
    configId: string;
    createdBy: string;
  }): Promise<ProductionPerformanceExportResult> {
    const { workOrderId, configId, createdBy } = params;

    try {
      // Get work order with all performance data
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: {
          part: true,
          workPerformance: true,
          variances: true,
        },
      });

      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }

      if (!workOrder.actualStartDate || !workOrder.actualEndDate) {
        throw new Error(`Work order ${workOrderId} has not been completed (missing actual dates)`);
      }

      // Get integration config
      const config = await this.prisma.integrationConfig.findUnique({
        where: { id: configId },
      });

      if (!config) {
        throw new Error(`Integration config ${configId} not found`);
      }

      if (!config.enabled) {
        throw new Error(`Integration config ${configId} is disabled`);
      }

      // Aggregate performance data by type
      const laborPerformance = workOrder.workPerformance.filter(p => p.performanceType === 'LABOR');
      const materialPerformance = workOrder.workPerformance.filter(p => p.performanceType === 'MATERIAL');
      const qualityPerformance = workOrder.workPerformance.filter(p => p.performanceType === 'QUALITY');
      const downtimePerformance = workOrder.workPerformance.filter(p => p.performanceType === 'DOWNTIME');
      const setupPerformance = workOrder.workPerformance.filter(p => p.performanceType === 'SETUP');
      const equipmentPerformance = workOrder.workPerformance.filter(p => p.performanceType === 'EQUIPMENT');

      // Calculate aggregated quantities
      const totalQuantityProduced = qualityPerformance.reduce((sum, p) => sum + (p.quantityProduced || 0), 0);
      const totalQuantityGood = qualityPerformance.reduce((sum, p) => sum + (p.quantityGood || 0), 0);
      const totalQuantityScrap = qualityPerformance.reduce((sum, p) => sum + (p.quantityScrap || 0), 0);
      const totalQuantityRework = qualityPerformance.reduce((sum, p) => sum + (p.quantityRework || 0), 0);

      // Calculate yield percentage
      const yieldPercentage = totalQuantityProduced > 0
        ? (totalQuantityGood / totalQuantityProduced) * 100
        : 0;

      // Calculate aggregated time actuals (convert to minutes)
      const totalSetupTime = setupPerformance.reduce((sum, p) => sum + (p.setupTime || 0), 0)
        + equipmentPerformance.reduce((sum, p) => sum + (p.setupTime || 0), 0);

      const totalRunTime = equipmentPerformance.reduce((sum, p) => sum + (p.runTime || 0), 0);

      const totalDowntime = downtimePerformance.reduce((sum, p) => sum + (p.downtimeMinutes || 0), 0);

      const totalLaborHours = laborPerformance.reduce((sum, p) => sum + (p.laborHours || 0), 0);

      // Calculate aggregated cost actuals
      const totalLaborCost = laborPerformance.reduce((sum, p) => sum + (p.laborCost || 0), 0);
      const totalMaterialCost = materialPerformance.reduce((sum, p) => sum + (p.totalCost || 0), 0);

      // For overhead, use a simple calculation (could be enhanced with actual overhead rates)
      const overheadCost = (totalLaborCost + totalMaterialCost) * 0.15; // 15% overhead rate
      const totalCost = totalLaborCost + totalMaterialCost + overheadCost;

      // Aggregate variances
      const quantityVariance = workOrder.variances
        .filter(v => v.varianceType === 'QUANTITY')
        .reduce((sum, v) => sum + v.variance, 0);

      const timeVariance = workOrder.variances
        .filter(v => v.varianceType === 'TIME')
        .reduce((sum, v) => sum + v.variance, 0);

      const costVariance = workOrder.variances
        .filter(v => v.varianceType === 'COST')
        .reduce((sum, v) => sum + v.variance, 0);

      const efficiencyVariance = workOrder.variances
        .filter(v => v.varianceType === 'EFFICIENCY')
        .reduce((sum, v) => sum + v.variance, 0);

      // Build personnel actuals JSON
      const personnelActuals = laborPerformance.map(p => ({
        personnelId: p.personnelId,
        hours: p.laborHours,
        cost: p.laborCost,
        efficiency: p.laborEfficiency,
      }));

      // Build equipment actuals JSON
      const equipmentActuals = equipmentPerformance.map(p => ({
        equipmentId: p.equipmentId,
        setupTime: p.setupTime,
        runTime: p.runTime,
      }));

      // Build material actuals JSON
      const materialActuals = materialPerformance.map(p => ({
        partId: p.partId,
        quantityConsumed: p.quantityConsumed,
        quantityPlanned: p.quantityPlanned,
        variance: p.materialVariance,
        cost: p.totalCost,
      }));

      // Generate message ID
      const messageId = `PERF-${workOrder.workOrderNumber}-${Date.now()}`;

      // Build ISA-95 message
      const isa95Message = B2MMessageBuilder.buildProductionPerformanceMessage({
        messageId,
        sender: 'MES',
        receiver: config.name,
        workOrder: {
          externalId: workOrder.customerOrder || workOrder.workOrderNumber,
          actualStartDate: workOrder.actualStartDate,
          actualEndDate: workOrder.actualEndDate,
        },
        quantities: {
          produced: totalQuantityProduced,
          good: totalQuantityGood,
          scrap: totalQuantityScrap,
          rework: totalQuantityRework,
          yield: yieldPercentage,
        },
        actuals: {
          labor: totalLaborHours > 0 ? { hours: totalLaborHours, cost: totalLaborCost } : undefined,
          material: totalMaterialCost > 0 ? { cost: totalMaterialCost } : undefined,
          overhead: { cost: overheadCost },
          total: { cost: totalCost },
        },
        variances: {
          quantity: quantityVariance,
          time: timeVariance,
          cost: costVariance,
          efficiency: efficiencyVariance,
        },
      });

      // Validate message
      const validation = B2MMessageBuilder.validateProductionPerformanceMessage(isa95Message);
      if (!validation.isValid) {
        throw new Error(`Invalid production performance message: ${validation.errors?.join(', ')}`);
      }

      // Create ProductionPerformanceActual record
      const actualInput: ProductionPerformanceActualInput = {
        messageId,
        configId,
        workOrderId,
        externalWorkOrderId: workOrder.customerOrder || workOrder.workOrderNumber,
        operationId: undefined, // Could be enhanced to track specific operations
        reportingPeriodStart: workOrder.actualStartDate,
        reportingPeriodEnd: workOrder.actualEndDate,
        quantityProduced: totalQuantityProduced,
        quantityGood: totalQuantityGood,
        quantityScrap: totalQuantityScrap,
        quantityRework: totalQuantityRework,
        yieldPercentage,
        setupTimeActual: totalSetupTime,
        runTimeActual: totalRunTime,
        downtimeActual: totalDowntime,
        laborHoursActual: totalLaborHours,
        laborCostActual: totalLaborCost,
        materialCostActual: totalMaterialCost,
        overheadCostActual: overheadCost,
        totalCostActual: totalCost,
        quantityVariance,
        timeVariance,
        costVariance,
        efficiencyVariance,
        personnelActuals: personnelActuals.length > 0 ? personnelActuals : undefined,
        equipmentActuals: equipmentActuals.length > 0 ? equipmentActuals : undefined,
        materialActuals: materialActuals.length > 0 ? materialActuals : undefined,
        createdBy,
        messagePayload: isa95Message,
      };

      const performanceActual = await this.prisma.productionPerformanceActual.create({
        data: {
          ...actualInput,
          status: 'PENDING',
          personnelActuals: actualInput.personnelActuals as any,
          equipmentActuals: actualInput.equipmentActuals as any,
          materialActuals: actualInput.materialActuals as any,
          messagePayload: actualInput.messagePayload as any,
        },
      });

      // TODO: Send to ERP via IntegrationManager (to be implemented in future PR)
      // For now, mark as PROCESSED (would be SENT after actual transmission)
      await this.prisma.productionPerformanceActual.update({
        where: { id: performanceActual.id },
        data: {
          status: 'PROCESSED',
        },
      });

      return {
        messageId: performanceActual.messageId,
        workOrderId: performanceActual.workOrderId,
        externalWorkOrderId: performanceActual.externalWorkOrderId,
        status: 'PROCESSED' as B2MMessageStatus,
        sentToERP: false, // Would be true after actual transmission
        sentAt: undefined,
        erpConfirmation: undefined,
        errorMessage: undefined,
      };
    } catch (error) {
      throw new Error(`Failed to export work order actuals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get production performance export status
   */
  async getExportStatus(messageId: string) {
    const performanceActual = await this.prisma.productionPerformanceActual.findUnique({
      where: { messageId },
      include: {
        workOrder: {
          select: {
            workOrderNumber: true,
            partNumber: true,
            quantity: true,
          },
        },
      },
    });

    if (!performanceActual) {
      throw new Error(`Production performance export ${messageId} not found`);
    }

    return {
      messageId: performanceActual.messageId,
      workOrderId: performanceActual.workOrderId,
      externalWorkOrderId: performanceActual.externalWorkOrderId,
      status: performanceActual.status,
      sentToERP: performanceActual.sentToERP,
      sentAt: performanceActual.sentAt,
      erpConfirmation: performanceActual.erpConfirmation,
      errorMessage: performanceActual.errorMessage,
      workOrder: performanceActual.workOrder,
      createdAt: performanceActual.createdAt,
    };
  }

  /**
   * Get all production performance exports for a work order
   */
  async getWorkOrderExports(workOrderId: string) {
    const exports = await this.prisma.productionPerformanceActual.findMany({
      where: { workOrderId },
      orderBy: { createdAt: 'desc' },
    });

    return exports.map(exp => ({
      messageId: exp.messageId,
      status: exp.status,
      sentToERP: exp.sentToERP,
      sentAt: exp.sentAt,
      erpConfirmation: exp.erpConfirmation,
      errorMessage: exp.errorMessage,
      createdAt: exp.createdAt,
    }));
  }

  /**
   * Retry failed export
   */
  async retryExport(messageId: string, createdBy: string) {
    const performanceActual = await this.prisma.productionPerformanceActual.findUnique({
      where: { messageId },
    });

    if (!performanceActual) {
      throw new Error(`Production performance export ${messageId} not found`);
    }

    if (performanceActual.status === 'CONFIRMED') {
      throw new Error(`Export ${messageId} is already confirmed, cannot retry`);
    }

    // Reset status to PENDING for retry
    await this.prisma.productionPerformanceActual.update({
      where: { messageId },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    // Re-export
    return await this.exportWorkOrderActuals({
      workOrderId: performanceActual.workOrderId,
      configId: performanceActual.configId,
      createdBy,
    });
  }
}

// Export both class and default singleton instance
export default new ProductionPerformanceExportService();
