/**
 * Kit Workflow Service
 *
 * Manages the complete lifecycle of kits from planning through consumption.
 * Handles status transitions, audit trails, validation, and workflow automation
 * with proper state management and compliance tracking.
 */

import { PrismaClient, Kit, KitStatus, KitItem, KitItemStatus, KitPriority } from '@prisma/client';
import { logger } from '../utils/logger';

export interface StatusTransitionOptions {
  kitId: string;
  newStatus: KitStatus;
  userId: string;
  reason?: string;
  notes?: string;
  validationData?: ValidationData;
  autoTransition?: boolean;
}

export interface ValidationData {
  scannedItems?: ScannedItem[];
  locationVerified?: boolean;
  qualityCheck?: boolean;
  signatureRequired?: boolean;
  photosRequired?: boolean;
  customAttributes?: Record<string, any>;
}

export interface ScannedItem {
  kitItemId: string;
  partNumber: string;
  scannedQuantity: number;
  location?: string;
  batchNumber?: string;
  serialNumber?: string;
}

export interface WorkflowTransitionResult {
  success: boolean;
  newStatus: KitStatus;
  validationResults: ValidationResult[];
  nextActions: NextAction[];
  warnings: string[];
  auditTrail: AuditEntry[];
}

export interface ValidationResult {
  type: 'SUCCESS' | 'WARNING' | 'ERROR';
  message: string;
  field?: string;
  kitItemId?: string;
}

export interface NextAction {
  action: string;
  description: string;
  assignedTo?: string;
  dueDate?: Date;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface AuditEntry {
  timestamp: Date;
  userId: string;
  action: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface KitMetrics {
  totalKits: number;
  statusDistribution: Record<KitStatus, number>;
  avgCycleTime: number; // in hours
  avgStagingTime: number;
  avgConsumptionTime: number;
  completionRate: number;
  shortageRate: number;
}

export class KitWorkflowService {
  private readonly validTransitions: Map<KitStatus, KitStatus[]>;

  constructor(private prisma: PrismaClient) {
    // Define valid status transitions
    this.validTransitions = new Map([
      [KitStatus.PLANNED, [KitStatus.STAGING, KitStatus.CANCELLED, KitStatus.ON_HOLD]],
      [KitStatus.STAGING, [KitStatus.STAGED, KitStatus.PARTIAL, KitStatus.CANCELLED, KitStatus.ON_HOLD]],
      [KitStatus.STAGED, [KitStatus.ISSUED, KitStatus.RETURNED, KitStatus.CANCELLED]],
      [KitStatus.ISSUED, [KitStatus.PARTIAL, KitStatus.CONSUMED, KitStatus.RETURNED]],
      [KitStatus.PARTIAL, [KitStatus.CONSUMED, KitStatus.RETURNED, KitStatus.CANCELLED]],
      [KitStatus.ON_HOLD, [KitStatus.PLANNED, KitStatus.STAGING, KitStatus.CANCELLED]],
      [KitStatus.RETURNED, [KitStatus.PLANNED, KitStatus.STAGING]], // Can be restaged
      [KitStatus.CONSUMED, []], // Terminal state
      [KitStatus.CANCELLED, [KitStatus.PLANNED]] // Can be reactivated
    ]);
  }

  /**
   * Transition kit to new status with validation
   */
  async transitionKitStatus(options: StatusTransitionOptions): Promise<WorkflowTransitionResult> {
    logger.info(`Transitioning kit ${options.kitId} to status ${options.newStatus}`, { options });

    try {
      // Get current kit state
      const kit = await this.getKitWithDetails(options.kitId);
      if (!kit) {
        throw new Error(`Kit ${options.kitId} not found`);
      }

      // Validate transition
      const validationResults = await this.validateTransition(kit, options);
      const hasErrors = validationResults.some(v => v.type === 'ERROR');

      if (hasErrors && !options.autoTransition) {
        return {
          success: false,
          newStatus: kit.status,
          validationResults,
          nextActions: [],
          warnings: [],
          auditTrail: []
        };
      }

      // Perform the transition
      const result = await this.executeTransition(kit, options);

      // Generate next actions
      const nextActions = await this.generateNextActions(result.newStatus, kit);

      // Generate warnings
      const warnings = this.generateWarnings(result.newStatus, kit, validationResults);

      logger.info(`Successfully transitioned kit ${options.kitId} from ${kit.status} to ${result.newStatus}`);

      return {
        success: true,
        newStatus: result.newStatus,
        validationResults,
        nextActions,
        warnings,
        auditTrail: result.auditTrail
      };

    } catch (error) {
      logger.error(`Error transitioning kit ${options.kitId} to status ${options.newStatus}`, { error });
      throw new Error(`Status transition failed: ${error.message}`);
    }
  }

  /**
   * Process kit item consumption
   */
  async processItemConsumption(
    kitId: string,
    itemConsumption: { kitItemId: string; consumedQuantity: number; location?: string }[],
    userId: string
  ): Promise<WorkflowTransitionResult> {
    logger.info(`Processing item consumption for kit ${kitId}`, { itemConsumption });

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const auditTrail: AuditEntry[] = [];

        // Update kit items
        for (const consumption of itemConsumption) {
          const kitItem = await tx.kitItem.findUnique({
            where: { id: consumption.kitItemId }
          });

          if (!kitItem) {
            throw new Error(`Kit item ${consumption.kitItemId} not found`);
          }

          const newConsumedQuantity = kitItem.consumedQuantity + consumption.consumedQuantity;
          const newStatus = newConsumedQuantity >= kitItem.requiredQuantity ?
            KitItemStatus.CONSUMED : KitItemStatus.ISSUED;

          await tx.kitItem.update({
            where: { id: consumption.kitItemId },
            data: {
              consumedQuantity: newConsumedQuantity,
              status: newStatus
            }
          });

          auditTrail.push({
            timestamp: new Date(),
            userId,
            action: 'ITEM_CONSUMPTION',
            details: `Consumed ${consumption.consumedQuantity} of part ${kitItem.partId}`,
            metadata: { kitItemId: consumption.kitItemId, consumedQuantity: consumption.consumedQuantity }
          });
        }

        // Check if kit is fully consumed
        const kit = await tx.kit.findUnique({
          where: { id: kitId },
          include: { kitItems: true }
        });

        if (!kit) {
          throw new Error(`Kit ${kitId} not found`);
        }

        const allItemsConsumed = kit.kitItems.every(item =>
          item.consumedQuantity >= item.requiredQuantity
        );

        const anyItemsConsumed = kit.kitItems.some(item =>
          item.consumedQuantity > 0
        );

        let newKitStatus = kit.status;
        if (allItemsConsumed) {
          newKitStatus = KitStatus.CONSUMED;
        } else if (anyItemsConsumed && kit.status === KitStatus.ISSUED) {
          newKitStatus = KitStatus.PARTIAL;
        }

        // Update kit status if changed
        if (newKitStatus !== kit.status) {
          await tx.kit.update({
            where: { id: kitId },
            data: {
              status: newKitStatus,
              isPartiallyConsumed: anyItemsConsumed,
              completionPercent: this.calculateCompletionPercent(kit.kitItems)
            }
          });

          // Create status history
          await tx.kitStatusHistory.create({
            data: {
              kitId,
              fromStatus: kit.status,
              toStatus: newKitStatus,
              changedById: userId,
              reason: 'Item consumption processed',
              notes: `${itemConsumption.length} items consumed`
            }
          });

          auditTrail.push({
            timestamp: new Date(),
            userId,
            action: 'STATUS_CHANGE',
            details: `Kit status changed from ${kit.status} to ${newKitStatus}`,
            metadata: { fromStatus: kit.status, toStatus: newKitStatus }
          });
        }

        return { newStatus: newKitStatus, auditTrail };
      });

      return {
        success: true,
        newStatus: result.newStatus,
        validationResults: [],
        nextActions: await this.generateNextActions(result.newStatus, { id: kitId } as any),
        warnings: [],
        auditTrail: result.auditTrail
      };

    } catch (error) {
      logger.error(`Error processing item consumption for kit ${kitId}`, { error });
      throw new Error(`Item consumption processing failed: ${error.message}`);
    }
  }

  /**
   * Handle kit returns
   */
  async processKitReturn(
    kitId: string,
    returnedItems: { kitItemId: string; returnedQuantity: number }[],
    returnReason: string,
    userId: string
  ): Promise<WorkflowTransitionResult> {
    logger.info(`Processing kit return for kit ${kitId}`, { returnedItems, returnReason });

    try {
      return await this.transitionKitStatus({
        kitId,
        newStatus: KitStatus.RETURNED,
        userId,
        reason: returnReason,
        validationData: {
          scannedItems: returnedItems.map(item => ({
            kitItemId: item.kitItemId,
            partNumber: '', // Will be populated during validation
            scannedQuantity: item.returnedQuantity
          }))
        }
      });

    } catch (error) {
      logger.error(`Error processing kit return for kit ${kitId}`, { error });
      throw new Error(`Kit return processing failed: ${error.message}`);
    }
  }

  /**
   * Get kit metrics and analytics
   */
  async getKitMetrics(filters?: {
    startDate?: Date;
    endDate?: Date;
    workOrderId?: string;
    assemblyStage?: string;
  }): Promise<KitMetrics> {
    const whereClause: any = {};

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
    }

    if (filters?.workOrderId) {
      whereClause.workOrderId = filters.workOrderId;
    }

    if (filters?.assemblyStage) {
      whereClause.assemblyStage = filters.assemblyStage;
    }

    const kits = await this.prisma.kit.findMany({
      where: whereClause,
      include: {
        kitItems: true,
        statusHistory: true
      }
    });

    // Calculate metrics
    const totalKits = kits.length;
    const statusDistribution = this.calculateStatusDistribution(kits);
    const cycleTimeStats = this.calculateCycleTimeStats(kits);
    const completionRate = this.calculateCompletionRate(kits);
    const shortageRate = this.calculateShortageRate(kits);

    return {
      totalKits,
      statusDistribution,
      avgCycleTime: cycleTimeStats.avgCycleTime,
      avgStagingTime: cycleTimeStats.avgStagingTime,
      avgConsumptionTime: cycleTimeStats.avgConsumptionTime,
      completionRate,
      shortageRate
    };
  }

  /**
   * Private helper methods
   */

  private async getKitWithDetails(kitId: string) {
    return await this.prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        kitItems: {
          include: {
            part: true
          }
        },
        workOrder: true,
        operation: true,
        stagingLocation: true
      }
    });
  }

  private async validateTransition(kit: any, options: StatusTransitionOptions): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Check if transition is valid
    const validNextStates = this.validTransitions.get(kit.status) || [];
    if (!validNextStates.includes(options.newStatus)) {
      results.push({
        type: 'ERROR',
        message: `Invalid transition from ${kit.status} to ${options.newStatus}`
      });
      return results;
    }

    // Status-specific validations
    switch (options.newStatus) {
      case KitStatus.STAGED:
        await this.validateStagingTransition(kit, options, results);
        break;

      case KitStatus.ISSUED:
        await this.validateIssuanceTransition(kit, options, results);
        break;

      case KitStatus.CONSUMED:
        await this.validateConsumptionTransition(kit, options, results);
        break;

      case KitStatus.RETURNED:
        await this.validateReturnTransition(kit, options, results);
        break;
    }

    return results;
  }

  private async validateStagingTransition(kit: any, options: StatusTransitionOptions, results: ValidationResult[]): Promise<void> {
    // Check if staging location is assigned
    if (!kit.stagingLocationId) {
      results.push({
        type: 'ERROR',
        message: 'Staging location must be assigned before staging'
      });
    }

    // Check if all items are available
    for (const item of kit.kitItems) {
      const availability = await this.checkItemAvailability(item);
      if (availability.shortfall > 0) {
        results.push({
          type: 'WARNING',
          message: `Shortage of ${availability.shortfall} units for part ${item.part?.partNumber}`,
          kitItemId: item.id
        });
      }
    }

    // Validate scanned items if provided
    if (options.validationData?.scannedItems) {
      this.validateScannedItems(kit, options.validationData.scannedItems, results);
    }
  }

  private async validateIssuanceTransition(kit: any, options: StatusTransitionOptions, results: ValidationResult[]): Promise<void> {
    // Check if kit is properly staged
    if (kit.status !== KitStatus.STAGED) {
      results.push({
        type: 'ERROR',
        message: 'Kit must be staged before issuance'
      });
    }

    // Check if location is verified
    if (options.validationData?.locationVerified === false) {
      results.push({
        type: 'WARNING',
        message: 'Kit location not verified before issuance'
      });
    }

    // Check if quality check is completed for critical items
    const hasCriticalItems = kit.kitItems.some((item: any) => item.isCritical);
    if (hasCriticalItems && !options.validationData?.qualityCheck) {
      results.push({
        type: 'ERROR',
        message: 'Quality check required for kits containing critical items'
      });
    }
  }

  private async validateConsumptionTransition(kit: any, options: StatusTransitionOptions, results: ValidationResult[]): Promise<void> {
    // Check if all items are consumed
    const unconsumedItems = kit.kitItems.filter((item: any) =>
      item.consumedQuantity < item.requiredQuantity
    );

    if (unconsumedItems.length > 0) {
      results.push({
        type: 'WARNING',
        message: `${unconsumedItems.length} items not fully consumed`
      });
    }
  }

  private async validateReturnTransition(kit: any, options: StatusTransitionOptions, results: ValidationResult[]): Promise<void> {
    // Reason is required for returns
    if (!options.reason) {
      results.push({
        type: 'ERROR',
        message: 'Return reason is required'
      });
    }

    // Validate returned quantities
    if (options.validationData?.scannedItems) {
      for (const scannedItem of options.validationData.scannedItems) {
        const kitItem = kit.kitItems.find((item: any) => item.id === scannedItem.kitItemId);
        if (kitItem && scannedItem.scannedQuantity > kitItem.issuedQuantity) {
          results.push({
            type: 'ERROR',
            message: `Cannot return more than issued quantity for item ${scannedItem.partNumber}`,
            kitItemId: scannedItem.kitItemId
          });
        }
      }
    }
  }

  private validateScannedItems(kit: any, scannedItems: ScannedItem[], results: ValidationResult[]): void {
    for (const scannedItem of scannedItems) {
      const kitItem = kit.kitItems.find((item: any) => item.id === scannedItem.kitItemId);

      if (!kitItem) {
        results.push({
          type: 'ERROR',
          message: `Kit item ${scannedItem.kitItemId} not found in kit`,
          kitItemId: scannedItem.kitItemId
        });
        continue;
      }

      // Check quantity discrepancies
      if (Math.abs(scannedItem.scannedQuantity - kitItem.requiredQuantity) > 0.01) {
        results.push({
          type: 'WARNING',
          message: `Quantity mismatch for ${scannedItem.partNumber}: expected ${kitItem.requiredQuantity}, scanned ${scannedItem.scannedQuantity}`,
          kitItemId: scannedItem.kitItemId
        });
      }
    }
  }

  private async executeTransition(kit: any, options: StatusTransitionOptions): Promise<{ newStatus: KitStatus; auditTrail: AuditEntry[] }> {
    const auditTrail: AuditEntry[] = [];

    await this.prisma.$transaction(async (tx) => {
      // Update kit status
      const updateData: any = {
        status: options.newStatus,
        updatedAt: new Date()
      };

      // Status-specific updates
      switch (options.newStatus) {
        case KitStatus.STAGED:
          updateData.stagedAt = new Date();
          updateData.stagedById = options.userId;
          break;

        case KitStatus.ISSUED:
          updateData.issuedAt = new Date();
          updateData.issuedById = options.userId;
          break;

        case KitStatus.CONSUMED:
          updateData.completionPercent = 100;
          break;

        case KitStatus.RETURNED:
          updateData.returnedAt = new Date();
          updateData.returnedById = options.userId;
          updateData.returnReason = options.reason;
          break;
      }

      await tx.kit.update({
        where: { id: options.kitId },
        data: updateData
      });

      // Create status history record
      await tx.kitStatusHistory.create({
        data: {
          kitId: options.kitId,
          fromStatus: kit.status,
          toStatus: options.newStatus,
          changedById: options.userId,
          reason: options.reason,
          notes: options.notes
        }
      });

      auditTrail.push({
        timestamp: new Date(),
        userId: options.userId,
        action: 'STATUS_TRANSITION',
        details: `Kit status changed from ${kit.status} to ${options.newStatus}`,
        metadata: {
          fromStatus: kit.status,
          toStatus: options.newStatus,
          reason: options.reason
        }
      });
    });

    return { newStatus: options.newStatus, auditTrail };
  }

  private async generateNextActions(status: KitStatus, kit: any): Promise<NextAction[]> {
    const actions: NextAction[] = [];

    switch (status) {
      case KitStatus.PLANNED:
        actions.push({
          action: 'ASSIGN_STAGING_LOCATION',
          description: 'Assign optimal staging location',
          priority: 'NORMAL'
        });
        break;

      case KitStatus.STAGING:
        actions.push({
          action: 'PICK_MATERIALS',
          description: 'Pick and verify all kit materials',
          priority: 'HIGH'
        });
        break;

      case KitStatus.STAGED:
        actions.push({
          action: 'READY_FOR_ISSUE',
          description: 'Kit ready for production issuance',
          priority: 'NORMAL'
        });
        break;

      case KitStatus.ISSUED:
        actions.push({
          action: 'MONITOR_CONSUMPTION',
          description: 'Monitor material consumption progress',
          priority: 'LOW'
        });
        break;

      case KitStatus.PARTIAL:
        actions.push({
          action: 'VERIFY_COMPLETION',
          description: 'Verify if remaining materials are still needed',
          priority: 'NORMAL'
        });
        break;

      case KitStatus.RETURNED:
        actions.push({
          action: 'PROCESS_RETURN',
          description: 'Process returned materials and update inventory',
          priority: 'HIGH'
        });
        break;
    }

    return actions;
  }

  private generateWarnings(status: KitStatus, kit: any, validationResults: ValidationResult[]): string[] {
    const warnings: string[] = [];

    // Add validation warnings
    warnings.push(...validationResults.filter(v => v.type === 'WARNING').map(v => v.message));

    // Status-specific warnings
    if (status === KitStatus.STAGED && kit.priority === KitPriority.URGENT) {
      warnings.push('Urgent kit staged - prioritize for immediate issuance');
    }

    if (status === KitStatus.PARTIAL) {
      warnings.push('Kit partially consumed - review remaining materials');
    }

    return warnings;
  }

  private async checkItemAvailability(kitItem: any): Promise<{ available: number; shortfall: number }> {
    // Simplified availability check - would integrate with inventory service
    const available = kitItem.part?.inventoryItems?.reduce((sum: number, inv: any) => sum + inv.quantity, 0) || 0;
    const shortfall = Math.max(0, kitItem.requiredQuantity - available);

    return { available, shortfall };
  }

  private calculateCompletionPercent(kitItems: any[]): number {
    if (kitItems.length === 0) return 0;

    const totalRequired = kitItems.reduce((sum, item) => sum + item.requiredQuantity, 0);
    const totalConsumed = kitItems.reduce((sum, item) => sum + item.consumedQuantity, 0);

    return (totalConsumed / totalRequired) * 100;
  }

  private calculateStatusDistribution(kits: any[]): Record<KitStatus, number> {
    const distribution = {} as Record<KitStatus, number>;

    // Initialize all statuses to 0
    Object.values(KitStatus).forEach(status => {
      distribution[status] = 0;
    });

    // Count each status
    kits.forEach(kit => {
      distribution[kit.status]++;
    });

    return distribution;
  }

  private calculateCycleTimeStats(kits: any[]): {
    avgCycleTime: number;
    avgStagingTime: number;
    avgConsumptionTime: number;
  } {
    let totalCycleTime = 0;
    let totalStagingTime = 0;
    let totalConsumptionTime = 0;
    let cycleCount = 0;
    let stagingCount = 0;
    let consumptionCount = 0;

    kits.forEach(kit => {
      if (kit.createdAt && kit.stagedAt) {
        totalStagingTime += (kit.stagedAt.getTime() - kit.createdAt.getTime()) / (1000 * 60 * 60); // hours
        stagingCount++;
      }

      if (kit.issuedAt && kit.status === KitStatus.CONSUMED) {
        totalConsumptionTime += (new Date().getTime() - kit.issuedAt.getTime()) / (1000 * 60 * 60); // hours
        consumptionCount++;
      }

      if (kit.createdAt && (kit.status === KitStatus.CONSUMED || kit.status === KitStatus.RETURNED)) {
        totalCycleTime += (new Date().getTime() - kit.createdAt.getTime()) / (1000 * 60 * 60); // hours
        cycleCount++;
      }
    });

    return {
      avgCycleTime: cycleCount > 0 ? totalCycleTime / cycleCount : 0,
      avgStagingTime: stagingCount > 0 ? totalStagingTime / stagingCount : 0,
      avgConsumptionTime: consumptionCount > 0 ? totalConsumptionTime / consumptionCount : 0
    };
  }

  private calculateCompletionRate(kits: any[]): number {
    if (kits.length === 0) return 0;

    const completedKits = kits.filter(kit =>
      kit.status === KitStatus.CONSUMED || kit.status === KitStatus.RETURNED
    ).length;

    return (completedKits / kits.length) * 100;
  }

  private calculateShortageRate(kits: any[]): number {
    if (kits.length === 0) return 0;

    const kitsWithShortages = kits.filter(kit =>
      kit.kitItems?.some((item: any) => item.shortageQuantity > 0)
    ).length;

    return (kitsWithShortages / kits.length) * 100;
  }
}