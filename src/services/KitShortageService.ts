/**
 * Kit Shortage Identification and Alert Service
 *
 * Proactively identifies material shortages, manages alerts, and coordinates
 * resolution workflows to prevent assembly delays. Integrates with procurement
 * and supplier systems for automated expediting and alternate part suggestions.
 */

import { PrismaClient, Kit, KitShortageAlert, AlertPriority, AlertStatus, Part } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ShortageAnalysisOptions {
  workOrderId?: string;
  assemblyStage?: string;
  priority?: AlertPriority;
  lookaheadDays?: number; // How far ahead to analyze
  includeProjectedDemand?: boolean;
  includeSafetyStock?: boolean;
}

export interface ShortageIdentificationResult {
  totalShortages: number;
  criticalShortages: number;
  shortagesByCategory: Record<string, number>;
  alertsCreated: number;
  recommendedActions: RecommendedAction[];
  impactAnalysis: ImpactAnalysis;
}

export interface MaterialShortage {
  partId: string;
  partNumber: string;
  partName: string;
  currentStock: number;
  requiredQuantity: number;
  shortfallQuantity: number;
  shortfallValue: number;
  leadTime: number;
  preferredSuppliers: string[];
  alternativeParts: AlternativePart[];
  affectedKits: AffectedKit[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedImpactDate: Date;
}

export interface AlternativePart {
  partId: string;
  partNumber: string;
  partName: string;
  substitutionType: 'DIRECT' | 'EQUIVALENT' | 'APPROVED_SUBSTITUTE';
  availableQuantity: number;
  costDifference: number;
  qualificationRequired: boolean;
}

export interface AffectedKit {
  kitId: string;
  kitNumber: string;
  workOrderNumber: string;
  priority: string;
  dueDate: Date;
  impactSeverity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RecommendedAction {
  action: 'EXPEDITE' | 'SUBSTITUTE' | 'PARTIAL_RELEASE' | 'RESCHEDULE' | 'PURCHASE';
  priority: AlertPriority;
  description: string;
  partNumber: string;
  estimatedCost?: number;
  estimatedDelay?: number; // in days
  assignedTo?: string;
  dueDate?: Date;
  metadata?: Record<string, any>;
}

export interface ImpactAnalysis {
  affectedWorkOrders: number;
  potentialDelayDays: number;
  estimatedCostImpact: number;
  productionRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigationOptions: string[];
}

export interface ShortageResolutionOptions {
  alertId: string;
  resolutionType: 'EXPEDITE' | 'SUBSTITUTE' | 'SPLIT_ORDER' | 'RESCHEDULE';
  notes: string;
  userId: string;
  estimatedResolutionDate?: Date;
  supplierReference?: string;
  alternativePartId?: string;
}

export class KitShortageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Identify and analyze material shortages across all kits
   */
  async identifyShortages(options: ShortageAnalysisOptions = {}): Promise<ShortageIdentificationResult> {
    logger.info('Starting shortage identification analysis', { options });

    try {
      // Get kits to analyze
      const kits = await this.getKitsForAnalysis(options);

      // Analyze material demand
      const demandAnalysis = await this.analyzeMaterialDemand(kits, options);

      // Identify shortages
      const shortages = await this.identifyMaterialShortages(demandAnalysis, options);

      // Create or update alerts
      const alertsCreated = await this.manageShortageAlerts(shortages);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(shortages);

      // Perform impact analysis
      const impactAnalysis = await this.analyzeImpact(shortages, kits);

      const result: ShortageIdentificationResult = {
        totalShortages: shortages.length,
        criticalShortages: shortages.filter(s => s.riskLevel === 'CRITICAL').length,
        shortagesByCategory: this.categorizeShortages(shortages),
        alertsCreated,
        recommendedActions,
        impactAnalysis
      };

      logger.info('Shortage identification completed', {
        totalShortages: result.totalShortages,
        criticalShortages: result.criticalShortages,
        alertsCreated: result.alertsCreated
      });

      return result;

    } catch (error) {
      logger.error('Error during shortage identification', { error });
      throw new Error(`Shortage identification failed: ${error.message}`);
    }
  }

  /**
   * Get detailed shortage information for a specific part
   */
  async getPartShortageDetails(partId: string, lookaheadDays: number = 30): Promise<MaterialShortage | null> {
    logger.info(`Getting shortage details for part ${partId}`, { lookaheadDays });

    try {
      // Get part information
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
        include: {
          inventoryItems: true,
          kitItems: {
            include: {
              kit: {
                include: {
                  workOrder: true
                }
              }
            }
          }
        }
      });

      if (!part) {
        return null;
      }

      // Calculate current stock
      const currentStock = part.inventoryItems.reduce((sum, inv) => sum + inv.quantity, 0);

      // Calculate required quantity within lookahead period
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + lookaheadDays);

      const requiredQuantity = part.kitItems
        .filter(item => item.kit.workOrder?.dueDate && item.kit.workOrder.dueDate <= futureDate)
        .reduce((sum, item) => sum + item.requiredQuantity, 0);

      // Check if there's a shortage
      const shortfallQuantity = Math.max(0, requiredQuantity - currentStock);

      if (shortfallQuantity <= 0) {
        return null; // No shortage
      }

      // Build affected kits list
      const affectedKits: AffectedKit[] = part.kitItems
        .filter(item => item.requiredQuantity > 0)
        .map(item => ({
          kitId: item.kit.id,
          kitNumber: item.kit.kitNumber,
          workOrderNumber: item.kit.workOrder?.workOrderNumber || '',
          priority: item.kit.priority,
          dueDate: item.kit.workOrder?.dueDate || new Date(),
          impactSeverity: this.calculateImpactSeverity(item.kit, shortfallQuantity)
        }));

      // Get alternative parts
      const alternativeParts = await this.findAlternativeParts(partId);

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(shortfallQuantity, affectedKits, part.leadTimeDays || 0);

      return {
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.partName,
        currentStock,
        requiredQuantity,
        shortfallQuantity,
        shortfallValue: shortfallQuantity * (part.standardCost || 0),
        leadTime: part.leadTimeDays || 0,
        preferredSuppliers: [], // TODO: Get from part supplier relationships
        alternativeParts,
        affectedKits,
        riskLevel,
        estimatedImpactDate: this.calculateEstimatedImpactDate(affectedKits)
      };

    } catch (error) {
      logger.error(`Error getting shortage details for part ${partId}`, { error });
      throw new Error(`Failed to get shortage details: ${error.message}`);
    }
  }

  /**
   * Create shortage alert
   */
  async createShortageAlert(shortage: MaterialShortage, userId: string): Promise<string> {
    logger.info(`Creating shortage alert for part ${shortage.partNumber}`, { shortage });

    try {
      // Check if alert already exists
      const existingAlert = await this.prisma.kitShortageAlert.findFirst({
        where: {
          partId: shortage.partId,
          status: { in: [AlertStatus.OPEN, AlertStatus.ASSIGNED, AlertStatus.IN_PROGRESS] }
        }
      });

      if (existingAlert) {
        // Update existing alert
        await this.prisma.kitShortageAlert.update({
          where: { id: existingAlert.id },
          data: {
            shortageQuantity: shortage.shortfallQuantity,
            priority: this.mapRiskToPriority(shortage.riskLevel),
            alertMessage: this.generateAlertMessage(shortage),
            updatedAt: new Date()
          }
        });

        return existingAlert.id;
      }

      // Create new alert
      const alert = await this.prisma.kitShortageAlert.create({
        data: {
          kitId: shortage.affectedKits[0]?.kitId || '', // Primary affected kit
          partId: shortage.partId,
          shortageQuantity: shortage.shortfallQuantity,
          requiredByDate: shortage.estimatedImpactDate,
          priority: this.mapRiskToPriority(shortage.riskLevel),
          status: AlertStatus.OPEN,
          alertMessage: this.generateAlertMessage(shortage),
          actionRequired: this.generateActionRequired(shortage)
        }
      });

      logger.info(`Created shortage alert ${alert.id} for part ${shortage.partNumber}`);
      return alert.id;

    } catch (error) {
      logger.error(`Error creating shortage alert for part ${shortage.partNumber}`, { error });
      throw new Error(`Failed to create shortage alert: ${error.message}`);
    }
  }

  /**
   * Resolve shortage alert
   */
  async resolveShortageAlert(options: ShortageResolutionOptions): Promise<void> {
    logger.info(`Resolving shortage alert ${options.alertId}`, { options });

    try {
      await this.prisma.$transaction(async (tx) => {
        // Update alert
        await tx.kitShortageAlert.update({
          where: { id: options.alertId },
          data: {
            status: AlertStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedById: options.userId,
            resolution: `${options.resolutionType}: ${options.notes}`
          }
        });

        // Perform resolution actions based on type
        switch (options.resolutionType) {
          case 'EXPEDITE':
            await this.processExpediteAction(options, tx);
            break;

          case 'SUBSTITUTE':
            await this.processSubstitutionAction(options, tx);
            break;

          case 'SPLIT_ORDER':
            await this.processSplitOrderAction(options, tx);
            break;

          case 'RESCHEDULE':
            await this.processRescheduleAction(options, tx);
            break;
        }
      });

      logger.info(`Successfully resolved shortage alert ${options.alertId}`);

    } catch (error) {
      logger.error(`Error resolving shortage alert ${options.alertId}`, { error });
      throw new Error(`Failed to resolve shortage alert: ${error.message}`);
    }
  }

  /**
   * Get shortage dashboard data
   */
  async getShortagesDashboard(filters?: {
    priority?: AlertPriority;
    status?: AlertStatus;
    assemblyStage?: string;
  }): Promise<{
    summary: {
      totalAlerts: number;
      openAlerts: number;
      criticalAlerts: number;
      resolvedToday: number;
    };
    alertsByPriority: Record<AlertPriority, number>;
    alertsByStage: Record<string, number>;
    topShortages: Array<{
      partNumber: string;
      shortageQuantity: number;
      impactValue: number;
      affectedKits: number;
    }>;
    resolutionMetrics: {
      avgResolutionTime: number;
      resolutionRate: number;
    };
  }> {
    const whereClause: any = {};

    if (filters?.priority) whereClause.priority = filters.priority;
    if (filters?.status) whereClause.status = filters.status;

    const alerts = await this.prisma.kitShortageAlert.findMany({
      where: whereClause,
      include: {
        kit: true,
        part: true
      }
    });

    // Calculate summary metrics
    const totalAlerts = alerts.length;
    const openAlerts = alerts.filter(a => a.status === AlertStatus.OPEN).length;
    const criticalAlerts = alerts.filter(a => a.priority === AlertPriority.CRITICAL).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = alerts.filter(a =>
      a.status === AlertStatus.RESOLVED &&
      a.resolvedAt &&
      a.resolvedAt >= today
    ).length;

    // Calculate alerts by priority
    const alertsByPriority = {} as Record<AlertPriority, number>;
    Object.values(AlertPriority).forEach(priority => {
      alertsByPriority[priority] = alerts.filter(a => a.priority === priority).length;
    });

    // Calculate alerts by assembly stage
    const alertsByStage: Record<string, number> = {};
    alerts.forEach(alert => {
      const stage = alert.kit?.assemblyStage || 'UNKNOWN';
      alertsByStage[stage] = (alertsByStage[stage] || 0) + 1;
    });

    // Top shortages by impact
    const topShortages = alerts
      .map(alert => ({
        partNumber: alert.part?.partNumber || '',
        shortageQuantity: alert.shortageQuantity,
        impactValue: alert.shortageQuantity * (alert.part?.standardCost || 0),
        affectedKits: 1 // Simplified - would count actual affected kits
      }))
      .sort((a, b) => b.impactValue - a.impactValue)
      .slice(0, 10);

    // Resolution metrics
    const resolvedAlerts = alerts.filter(a => a.status === AlertStatus.RESOLVED && a.resolvedAt);
    const avgResolutionTime = this.calculateAverageResolutionTime(resolvedAlerts);
    const resolutionRate = totalAlerts > 0 ? (resolvedAlerts.length / totalAlerts) * 100 : 0;

    return {
      summary: {
        totalAlerts,
        openAlerts,
        criticalAlerts,
        resolvedToday
      },
      alertsByPriority,
      alertsByStage,
      topShortages,
      resolutionMetrics: {
        avgResolutionTime,
        resolutionRate
      }
    };
  }

  /**
   * Private helper methods
   */

  private async getKitsForAnalysis(options: ShortageAnalysisOptions): Promise<any[]> {
    const whereClause: any = {
      status: { in: ['PLANNED', 'STAGING', 'STAGED'] }
    };

    if (options.workOrderId) {
      whereClause.workOrderId = options.workOrderId;
    }

    if (options.assemblyStage) {
      whereClause.assemblyStage = options.assemblyStage;
    }

    if (options.lookaheadDays) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + options.lookaheadDays);
      whereClause.workOrder = {
        dueDate: { lte: futureDate }
      };
    }

    return await this.prisma.kit.findMany({
      where: whereClause,
      include: {
        kitItems: {
          include: {
            part: {
              include: {
                inventoryItems: true
              }
            }
          }
        },
        workOrder: true
      }
    });
  }

  private async analyzeMaterialDemand(kits: any[], options: ShortageAnalysisOptions): Promise<Map<string, number>> {
    const demandMap = new Map<string, number>();

    for (const kit of kits) {
      for (const item of kit.kitItems) {
        const currentDemand = demandMap.get(item.partId) || 0;
        demandMap.set(item.partId, currentDemand + item.requiredQuantity);
      }
    }

    return demandMap;
  }

  private async identifyMaterialShortages(
    demandMap: Map<string, number>,
    options: ShortageAnalysisOptions
  ): Promise<MaterialShortage[]> {
    const shortages: MaterialShortage[] = [];

    for (const [partId, requiredQuantity] of demandMap.entries()) {
      const shortage = await this.getPartShortageDetails(partId, options.lookaheadDays || 30);
      if (shortage) {
        shortages.push(shortage);
      }
    }

    return shortages;
  }

  private async manageShortageAlerts(shortages: MaterialShortage[]): Promise<number> {
    let alertsCreated = 0;

    for (const shortage of shortages) {
      try {
        await this.createShortageAlert(shortage, 'system');
        alertsCreated++;
      } catch (error) {
        logger.warn(`Failed to create alert for part ${shortage.partNumber}`, { error });
      }
    }

    return alertsCreated;
  }

  private async generateRecommendedActions(shortages: MaterialShortage[]): Promise<RecommendedAction[]> {
    const actions: RecommendedAction[] = [];

    for (const shortage of shortages) {
      // Determine best action based on shortage characteristics
      if (shortage.alternativeParts.length > 0) {
        actions.push({
          action: 'SUBSTITUTE',
          priority: this.mapRiskToPriority(shortage.riskLevel),
          description: `Consider substitute parts for ${shortage.partNumber}`,
          partNumber: shortage.partNumber,
          metadata: { alternativeParts: shortage.alternativeParts }
        });
      }

      if (shortage.leadTime <= 7) {
        actions.push({
          action: 'EXPEDITE',
          priority: this.mapRiskToPriority(shortage.riskLevel),
          description: `Expedite delivery for ${shortage.partNumber}`,
          partNumber: shortage.partNumber,
          estimatedCost: shortage.shortfallValue * 0.1 // 10% expedite cost
        });
      }

      if (shortage.riskLevel === 'CRITICAL') {
        actions.push({
          action: 'PURCHASE',
          priority: AlertPriority.URGENT,
          description: `Emergency purchase for critical shortage ${shortage.partNumber}`,
          partNumber: shortage.partNumber,
          estimatedCost: shortage.shortfallValue
        });
      }
    }

    return actions;
  }

  private async analyzeImpact(shortages: MaterialShortage[], kits: any[]): Promise<ImpactAnalysis> {
    const affectedWorkOrders = new Set();
    let totalCostImpact = 0;
    let maxDelayDays = 0;

    for (const shortage of shortages) {
      for (const affectedKit of shortage.affectedKits) {
        affectedWorkOrders.add(affectedKit.workOrderNumber);
        totalCostImpact += shortage.shortfallValue;
        maxDelayDays = Math.max(maxDelayDays, shortage.leadTime);
      }
    }

    const productionRisk = this.calculateProductionRisk(shortages, affectedWorkOrders.size);

    return {
      affectedWorkOrders: affectedWorkOrders.size,
      potentialDelayDays: maxDelayDays,
      estimatedCostImpact: totalCostImpact,
      productionRisk,
      mitigationOptions: [
        'Expedite critical parts',
        'Use approved substitutes',
        'Partial kit releases',
        'Reschedule non-critical work orders'
      ]
    };
  }

  private calculateImpactSeverity(kit: any, shortfallQuantity: number): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (kit.priority === 'CRITICAL' || kit.priority === 'URGENT') return 'HIGH';
    if (shortfallQuantity > 100) return 'HIGH';
    if (shortfallQuantity > 10) return 'MEDIUM';
    return 'LOW';
  }

  private calculateRiskLevel(shortfall: number, affectedKits: AffectedKit[], leadTime: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const hasUrgentKits = affectedKits.some(kit => kit.priority === 'URGENT' || kit.priority === 'CRITICAL');
    const isHighValue = shortfall > 1000;
    const isLongLeadTime = leadTime > 30;

    if (hasUrgentKits && (isHighValue || isLongLeadTime)) return 'CRITICAL';
    if (hasUrgentKits || (isHighValue && isLongLeadTime)) return 'HIGH';
    if (isHighValue || isLongLeadTime) return 'MEDIUM';
    return 'LOW';
  }

  private calculateEstimatedImpactDate(affectedKits: AffectedKit[]): Date {
    if (affectedKits.length === 0) return new Date();

    // Return earliest due date
    return affectedKits.reduce((earliest, kit) =>
      kit.dueDate < earliest ? kit.dueDate : earliest,
      affectedKits[0].dueDate
    );
  }

  private async findAlternativeParts(partId: string): Promise<AlternativePart[]> {
    // Simplified implementation - would integrate with part management system
    // to find approved substitutes and equivalent parts
    return [];
  }

  private mapRiskToPriority(riskLevel: string): AlertPriority {
    switch (riskLevel) {
      case 'CRITICAL': return AlertPriority.CRITICAL;
      case 'HIGH': return AlertPriority.HIGH;
      case 'MEDIUM': return AlertPriority.NORMAL;
      default: return AlertPriority.LOW;
    }
  }

  private generateAlertMessage(shortage: MaterialShortage): string {
    return `Shortage of ${shortage.shortfallQuantity} units for part ${shortage.partNumber}. ` +
           `Required by ${shortage.estimatedImpactDate.toLocaleDateString()}. ` +
           `Affects ${shortage.affectedKits.length} kit(s).`;
  }

  private generateActionRequired(shortage: MaterialShortage): string {
    if (shortage.alternativeParts.length > 0) {
      return 'Review substitute parts or expedite delivery';
    }
    return 'Expedite delivery or reschedule affected work orders';
  }

  private categorizeShortages(shortages: MaterialShortage[]): Record<string, number> {
    const categories = {
      'CRITICAL': shortages.filter(s => s.riskLevel === 'CRITICAL').length,
      'HIGH_VALUE': shortages.filter(s => s.shortfallValue > 10000).length,
      'LONG_LEAD_TIME': shortages.filter(s => s.leadTime > 30).length,
      'URGENT_KITS': shortages.filter(s => s.affectedKits.some(k => k.priority === 'URGENT')).length
    };

    return categories;
  }

  private calculateProductionRisk(shortages: MaterialShortage[], affectedWorkOrders: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const criticalShortages = shortages.filter(s => s.riskLevel === 'CRITICAL').length;

    if (criticalShortages > 5 || affectedWorkOrders > 20) return 'CRITICAL';
    if (criticalShortages > 2 || affectedWorkOrders > 10) return 'HIGH';
    if (criticalShortages > 0 || affectedWorkOrders > 5) return 'MEDIUM';
    return 'LOW';
  }

  private calculateAverageResolutionTime(resolvedAlerts: any[]): number {
    if (resolvedAlerts.length === 0) return 0;

    const totalTime = resolvedAlerts.reduce((sum, alert) => {
      const resolutionTime = alert.resolvedAt.getTime() - alert.createdAt.getTime();
      return sum + (resolutionTime / (1000 * 60 * 60)); // Convert to hours
    }, 0);

    return totalTime / resolvedAlerts.length;
  }

  private async processExpediteAction(options: ShortageResolutionOptions, tx: any): Promise<void> {
    // Implementation would integrate with procurement system
    logger.info(`Processing expedite action for alert ${options.alertId}`);
  }

  private async processSubstitutionAction(options: ShortageResolutionOptions, tx: any): Promise<void> {
    // Implementation would update kit items with substitute parts
    logger.info(`Processing substitution action for alert ${options.alertId}`);
  }

  private async processSplitOrderAction(options: ShortageResolutionOptions, tx: any): Promise<void> {
    // Implementation would split kits for partial releases
    logger.info(`Processing split order action for alert ${options.alertId}`);
  }

  private async processRescheduleAction(options: ShortageResolutionOptions, tx: any): Promise<void> {
    // Implementation would reschedule affected work orders
    logger.info(`Processing reschedule action for alert ${options.alertId}`);
  }
}