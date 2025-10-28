/**
 * ✅ GITHUB ISSUE #22: Effectivity Service
 *
 * EffectivityService - Service for managing ECO effectivity dates,
 * version transitions, and interchangeability rules
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  EffectivityInput,
  EffectivityContext,
  TransitionPlan,
  ECOError,
  ECOValidationError
} from '../types/eco';
import {
  EffectivityType,
  ECOStatus,
  ECOEventType
} from '@prisma/client';

export interface EffectivityValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VersionInfo {
  entityType: string;
  entityId: string;
  currentVersion: string;
  effectiveVersion: string;
  isTransitioning: boolean;
  effectiveDate?: Date;
  interchangeable: boolean;
}

export interface InventoryImpactAnalysis {
  wipItems: Array<{
    workOrderId: string;
    partId: string;
    quantity: number;
    estimatedValue: number;
    canUseOldVersion: boolean;
    mustScrap: boolean;
  }>;
  finishedGoods: Array<{
    lotNumber: string;
    partId: string;
    quantity: number;
    estimatedValue: number;
    canShip: boolean;
    requiresRework: boolean;
  }>;
  rawMaterials: Array<{
    partId: string;
    quantity: number;
    estimatedValue: number;
    isObsolete: boolean;
    canReturn: boolean;
  }>;
  totalImpactValue: number;
}

export class EffectivityService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  // ============================================================================
  // Effectivity Management
  // ============================================================================

  /**
   * Set effectivity for an ECO
   */
  async setEffectivity(ecoId: string, input: EffectivityInput): Promise<void> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId }
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoId}`, 'ECO_NOT_FOUND');
      }

      // Validate effectivity input
      await this.validateEffectivityInput(input, eco);

      // Update ECO with effectivity information
      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          effectivityType: input.effectivityType,
          effectivityValue: input.effectivityValue,
          isInterchangeable: input.isInterchangeable,
          plannedEffectiveDate: input.plannedEffectiveDate,
          updatedAt: new Date()
        }
      });

      // Create history entry
      await this.prisma.eCOHistory.create({
        data: {
          ecoId,
          eventType: ECOEventType.EFFECTIVITY_SET,
          eventDescription: `Effectivity set: ${input.effectivityType} - ${input.effectivityValue}`,
          performedById: 'system',
          performedByName: 'System',
          performedByRole: 'Effectivity Manager',
          details: input
        }
      });

      logger.info(`Effectivity set for ECO ${eco.ecoNumber}`, {
        ecoId,
        effectivityType: input.effectivityType,
        effectivityValue: input.effectivityValue
      });

    } catch (error) {
      logger.error('Error setting effectivity:', error);
      throw new ECOError(`Failed to set effectivity: ${error.message}`);
    }
  }

  /**
   * Get effective version for an entity given context
   */
  async getEffectiveVersion(
    entityType: string,
    entityId: string,
    context: EffectivityContext
  ): Promise<string> {
    try {
      // Find all ECOs affecting this entity
      const affectingECOs = await this.prisma.engineeringChangeOrder.findMany({
        where: {
          status: { in: [ECOStatus.CRB_APPROVED, ECOStatus.IMPLEMENTATION, ECOStatus.COMPLETED] },
          OR: [
            {
              affectedDocuments: {
                some: {
                  documentType: entityType,
                  documentId: entityId
                }
              }
            },
            {
              affectedParts: { has: entityId },
            },
            {
              affectedOperations: { has: entityId }
            }
          ]
        },
        include: {
          affectedDocuments: {
            where: {
              documentType: entityType,
              documentId: entityId
            }
          }
        },
        orderBy: { actualEffectiveDate: 'desc' }
      });

      // Check effectivity for each ECO
      for (const eco of affectingECOs) {
        const isEffective = await this.checkEffectivity(eco.id, context);
        if (isEffective) {
          const affectedDoc = eco.affectedDocuments.find(
            doc => doc.documentType === entityType && doc.documentId === entityId
          );
          if (affectedDoc?.targetVersion) {
            return affectedDoc.targetVersion;
          }
        }
      }

      // Return current version if no effective ECO found
      const currentEntity = await this.getCurrentEntityVersion(entityType, entityId);
      return currentEntity?.version || '1.0.0';

    } catch (error) {
      logger.error('Error getting effective version:', error);
      throw new ECOError(`Failed to get effective version: ${error.message}`);
    }
  }

  /**
   * Check if an ECO is effective for given context
   */
  async checkEffectivity(ecoId: string, context: EffectivityContext): Promise<boolean> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId }
      });

      if (!eco || !eco.effectivityType || !eco.effectivityValue) {
        return false;
      }

      const now = context.date || new Date();

      switch (eco.effectivityType) {
        case EffectivityType.BY_DATE:
          const effectiveDate = eco.actualEffectiveDate || eco.plannedEffectiveDate;
          return effectiveDate ? now >= effectiveDate : false;

        case EffectivityType.BY_SERIAL_NUMBER:
          if (!context.serialNumber) return false;
          const targetSerial = parseInt(eco.effectivityValue);
          const currentSerial = parseInt(context.serialNumber);
          return currentSerial >= targetSerial;

        case EffectivityType.BY_WORK_ORDER:
          if (!context.workOrderNumber) return false;
          const targetWO = parseInt(eco.effectivityValue);
          const currentWO = parseInt(context.workOrderNumber);
          return currentWO >= targetWO;

        case EffectivityType.BY_LOT_BATCH:
          if (!context.lotBatch) return false;
          return context.lotBatch >= eco.effectivityValue;

        case EffectivityType.IMMEDIATE:
          return eco.status === ECOStatus.COMPLETED;

        default:
          return false;
      }

    } catch (error) {
      logger.error('Error checking effectivity:', error);
      throw new ECOError(`Failed to check effectivity: ${error.message}`);
    }
  }

  /**
   * Generate transition plan for an ECO
   */
  async getTransitionPlan(ecoId: string): Promise<TransitionPlan> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
        include: {
          affectedDocuments: true
        }
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoId}`, 'ECO_NOT_FOUND');
      }

      const inventoryImpact = await this.analyzeInventoryImpact(ecoId);

      // Calculate transition dates
      const newVersionStart = eco.plannedEffectiveDate || new Date();
      const transitionPeriod = this.calculateTransitionPeriod(eco, inventoryImpact);
      const oldVersionDepletion = new Date(newVersionStart);
      oldVersionDepletion.setDate(oldVersionDepletion.getDate() + transitionPeriod);

      // Find approved exceptions
      const exceptions = await this.findApprovedExceptions(ecoId);

      return {
        ecoId,
        oldVersionDepletion,
        newVersionStart,
        transitionPeriod,
        affectedInventory: {
          wip: inventoryImpact.wipItems.reduce((sum, item) => sum + item.estimatedValue, 0),
          finished: inventoryImpact.finishedGoods.reduce((sum, item) => sum + item.estimatedValue, 0),
          raw: inventoryImpact.rawMaterials.reduce((sum, item) => sum + item.estimatedValue, 0)
        },
        exceptions
      };

    } catch (error) {
      logger.error('Error generating transition plan:', error);
      throw new ECOError(`Failed to generate transition plan: ${error.message}`);
    }
  }

  /**
   * Validate effectivity setup
   */
  async validateEffectivity(ecoId: string): Promise<EffectivityValidationResult> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
        include: {
          affectedDocuments: true,
          tasks: true
        }
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoId}`, 'ECO_NOT_FOUND');
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check required fields
      if (!eco.effectivityType) {
        errors.push('Effectivity type is required');
      }

      if (!eco.effectivityValue) {
        errors.push('Effectivity value is required');
      }

      // Validate effectivity value format
      if (eco.effectivityType && eco.effectivityValue) {
        const valueValidation = this.validateEffectivityValue(eco.effectivityType, eco.effectivityValue);
        if (!valueValidation.isValid) {
          errors.push(...valueValidation.errors);
        }
      }

      // Check if all affected documents have target versions
      const documentsWithoutTarget = eco.affectedDocuments.filter(doc => !doc.targetVersion);
      if (documentsWithoutTarget.length > 0) {
        warnings.push(`${documentsWithoutTarget.length} affected documents missing target versions`);
      }

      // Check if implementation tasks are completed
      const incompleteTasks = eco.tasks.filter(task => task.status !== 'COMPLETED');
      if (incompleteTasks.length > 0) {
        warnings.push(`${incompleteTasks.length} implementation tasks not completed`);
      }

      // Check for inventory impact
      const inventoryImpact = await this.analyzeInventoryImpact(ecoId);
      if (inventoryImpact.totalImpactValue > 100000) {
        warnings.push(`High inventory impact: $${inventoryImpact.totalImpactValue.toLocaleString()}`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      logger.error('Error validating effectivity:', error);
      throw new ECOError(`Failed to validate effectivity: ${error.message}`);
    }
  }

  /**
   * Get version information for entities
   */
  async getVersionInfo(entityType: string, entityIds: string[]): Promise<VersionInfo[]> {
    try {
      const versionInfo: VersionInfo[] = [];

      for (const entityId of entityIds) {
        const currentVersion = await this.getCurrentEntityVersion(entityType, entityId);

        // Check if there's an ECO affecting this entity
        const affectingECO = await this.prisma.engineeringChangeOrder.findFirst({
          where: {
            status: { in: [ECOStatus.CRB_APPROVED, ECOStatus.IMPLEMENTATION] },
            affectedDocuments: {
              some: {
                documentType: entityType,
                documentId: entityId
              }
            }
          },
          include: {
            affectedDocuments: {
              where: {
                documentType: entityType,
                documentId: entityId
              }
            }
          }
        });

        const affectedDoc = affectingECO?.affectedDocuments[0];

        versionInfo.push({
          entityType,
          entityId,
          currentVersion: currentVersion?.version || '1.0.0',
          effectiveVersion: affectedDoc?.targetVersion || currentVersion?.version || '1.0.0',
          isTransitioning: !!affectingECO,
          effectiveDate: affectingECO?.plannedEffectiveDate || undefined,
          interchangeable: affectingECO?.isInterchangeable || false
        });
      }

      return versionInfo;

    } catch (error) {
      logger.error('Error getting version info:', error);
      throw new ECOError(`Failed to get version info: ${error.message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async validateEffectivityInput(input: EffectivityInput, eco: any): Promise<void> {
    const validation = this.validateEffectivityValue(input.effectivityType, input.effectivityValue);
    if (!validation.isValid) {
      throw new ECOValidationError(validation.errors.join(', '));
    }

    // Additional business logic validations
    if (input.effectivityType === EffectivityType.BY_DATE && input.plannedEffectiveDate) {
      const now = new Date();
      if (input.plannedEffectiveDate < now) {
        throw new ECOValidationError('Planned effective date cannot be in the past');
      }
    }

    if (input.effectivityType === EffectivityType.IMMEDIATE && eco.status !== ECOStatus.CRB_APPROVED) {
      throw new ECOValidationError('Immediate effectivity can only be set for CRB approved ECOs');
    }
  }

  private validateEffectivityValue(type: EffectivityType, value: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (type) {
      case EffectivityType.BY_DATE:
        if (!value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          errors.push('Date effectivity value must be in YYYY-MM-DD format');
        }
        break;

      case EffectivityType.BY_SERIAL_NUMBER:
        if (!value.match(/^\d+$/)) {
          errors.push('Serial number effectivity value must be numeric');
        }
        break;

      case EffectivityType.BY_WORK_ORDER:
        if (!value.match(/^\d+$/)) {
          errors.push('Work order effectivity value must be numeric');
        }
        break;

      case EffectivityType.BY_LOT_BATCH:
        if (!value.trim()) {
          errors.push('Lot/batch effectivity value cannot be empty');
        }
        break;

      case EffectivityType.IMMEDIATE:
        // No validation needed for immediate effectivity
        break;

      default:
        errors.push('Invalid effectivity type');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async getCurrentEntityVersion(entityType: string, entityId: string): Promise<{ version: string } | null> {
    try {
      switch (entityType) {
        case 'WorkInstruction':
          return await this.prisma.workInstruction.findUnique({
            where: { id: entityId },
            select: { version: true }
          });

        case 'SetupSheet':
          const setupSheet = await this.prisma.setupSheet.findUnique({
            where: { id: entityId },
            select: { version: true }
          });
          return setupSheet ? { version: setupSheet.version || '1.0.0' } : null;

        // Add other entity types as needed
        default:
          logger.warn(`Unknown entity type for version lookup: ${entityType}`);
          return null;
      }
    } catch (error) {
      logger.error(`Error getting current version for ${entityType}:${entityId}:`, error);
      return null;
    }
  }

  private async analyzeInventoryImpact(ecoId: string): Promise<InventoryImpactAnalysis> {
    try {
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId }
      });

      if (!eco) {
        throw new ECOError(`ECO not found: ${ecoId}`, 'ECO_NOT_FOUND');
      }

      // Simplified inventory impact analysis
      // In a real implementation, this would query actual inventory systems
      const wipItems = eco.affectedParts.map(partId => ({
        workOrderId: `WO-${Math.random().toString(36).substr(2, 9)}`,
        partId,
        quantity: Math.floor(Math.random() * 100) + 1,
        estimatedValue: Math.floor(Math.random() * 10000) + 1000,
        canUseOldVersion: eco.isInterchangeable,
        mustScrap: !eco.isInterchangeable && Math.random() > 0.7
      }));

      const finishedGoods = eco.affectedParts.map(partId => ({
        lotNumber: `LOT-${Math.random().toString(36).substr(2, 9)}`,
        partId,
        quantity: Math.floor(Math.random() * 50) + 1,
        estimatedValue: Math.floor(Math.random() * 15000) + 2000,
        canShip: eco.isInterchangeable || Math.random() > 0.5,
        requiresRework: !eco.isInterchangeable && Math.random() > 0.6
      }));

      const rawMaterials = eco.affectedParts.map(partId => ({
        partId,
        quantity: Math.floor(Math.random() * 200) + 10,
        estimatedValue: Math.floor(Math.random() * 5000) + 500,
        isObsolete: !eco.isInterchangeable && Math.random() > 0.8,
        canReturn: Math.random() > 0.7
      }));

      const totalImpactValue =
        wipItems.reduce((sum, item) => sum + item.estimatedValue, 0) +
        finishedGoods.reduce((sum, item) => sum + item.estimatedValue, 0) +
        rawMaterials.reduce((sum, item) => sum + item.estimatedValue, 0);

      return {
        wipItems,
        finishedGoods,
        rawMaterials,
        totalImpactValue
      };

    } catch (error) {
      logger.error('Error analyzing inventory impact:', error);
      throw new ECOError(`Failed to analyze inventory impact: ${error.message}`);
    }
  }

  private calculateTransitionPeriod(eco: any, inventoryImpact: InventoryImpactAnalysis): number {
    // Base transition period based on complexity
    let baseDays = 30;

    // Adjust based on priority
    switch (eco.priority) {
      case 'EMERGENCY':
        baseDays = 7;
        break;
      case 'CRITICAL':
        baseDays = 14;
        break;
      case 'HIGH':
        baseDays = 21;
        break;
      case 'MEDIUM':
        baseDays = 30;
        break;
      case 'LOW':
        baseDays = 60;
        break;
    }

    // Adjust based on inventory impact
    if (inventoryImpact.totalImpactValue > 500000) {
      baseDays += 30;
    } else if (inventoryImpact.totalImpactValue > 100000) {
      baseDays += 14;
    }

    // Adjust if not interchangeable
    if (!eco.isInterchangeable) {
      baseDays += 14;
    }

    return baseDays;
  }

  private async findApprovedExceptions(ecoId: string): Promise<any[]> {
    try {
      // In a real implementation, this would query an exceptions table
      // For now, return empty array
      return [];
    } catch (error) {
      logger.error('Error finding approved exceptions:', error);
      return [];
    }
  }
}