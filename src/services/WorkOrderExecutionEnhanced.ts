/**
 * Enhanced Work Order Execution Service with Interchangeability Integration
 *
 * This service extends the existing WorkOrderExecutionService with part interchangeability capabilities.
 * It integrates the Part Interchangeability framework to provide automatic substitution validation
 * and enhanced material consumption workflows for AS9100 compliance.
 *
 * GitHub Issue #223: Regulatory Compliance: Part Interchangeability & Substitution Group Framework
 */

import { WorkPerformanceType } from '@prisma/client';
import prisma from '../lib/database';
import { WorkOrderInterchangeabilityIntegration } from './WorkOrderInterchangeabilityIntegration';
import { logger } from '../utils/logger';

// ============================================================================
// ENHANCED INTERFACES
// ============================================================================

interface EnhancedMaterialConsumptionData {
  workOrderId: string;
  operationId?: string;
  partId: string;
  quantityConsumed: number;
  quantityPlanned?: number;
  unitCost?: number;
  recordedBy: string;
  allowSubstitution?: boolean;
  requireApprovalForSubstitution?: boolean;
  substitutionReason?: string;
  notes?: string;
}

interface MaterialConsumptionResponse {
  success: boolean;
  performanceRecordId: string;
  substitutionUsed: boolean;
  originalPartId: string;
  actualPartUsed: string;
  quantityConsumed: number;
  costImpact: number;
  approvalRequired: boolean;
  messages: string[];
  substitutionDetails?: {
    workOrderSubstitutionId: string;
    quantityRatio: number;
    substitutionReason: string;
    approvalId?: string;
  };
}

// ============================================================================
// ENHANCED SERVICE METHODS
// ============================================================================

export class WorkOrderExecutionEnhanced {
  private static instance: WorkOrderExecutionEnhanced;
  private interchangeabilityIntegration: WorkOrderInterchangeabilityIntegration;

  private constructor() {
    this.interchangeabilityIntegration = WorkOrderInterchangeabilityIntegration.getInstance();
  }

  public static getInstance(): WorkOrderExecutionEnhanced {
    if (!WorkOrderExecutionEnhanced.instance) {
      WorkOrderExecutionEnhanced.instance = new WorkOrderExecutionEnhanced();
    }
    return WorkOrderExecutionEnhanced.instance;
  }

  /**
   * Enhanced material consumption with automatic interchangeability validation
   * This method replaces or supplements the standard recordWorkPerformance for MATERIAL type
   */
  async consumeMaterialWithValidation(
    data: EnhancedMaterialConsumptionData
  ): Promise<MaterialConsumptionResponse> {
    const {
      workOrderId,
      operationId,
      partId,
      quantityConsumed,
      quantityPlanned,
      unitCost,
      recordedBy,
      allowSubstitution = true,
      requireApprovalForSubstitution = false,
      substitutionReason,
      notes
    } = data;

    logger.info('Enhanced material consumption started', {
      workOrderId,
      partId,
      quantityConsumed,
      allowSubstitution
    });

    try {
      // Validate inputs
      this.validateMaterialConsumptionInputs(data);

      // If substitution is not allowed, use standard consumption
      if (!allowSubstitution) {
        return await this.standardMaterialConsumption(data);
      }

      // Use interchangeability integration for enhanced consumption
      const result = await this.interchangeabilityIntegration.consumeMaterialWithInterchangeability({
        workOrderId,
        operationId,
        originalPartId: partId,
        requestedQuantity: quantityConsumed,
        recordedBy,
        unitCost,
        notes
      });

      // Check if approval is required and not provided
      if (result.substitutionUsed && requireApprovalForSubstitution && !result.approvalId) {
        logger.warn('Substitution used but approval required', {
          workOrderId,
          originalPartId: partId,
          actualPartUsed: result.actualPartUsed
        });
      }

      return {
        success: result.success,
        performanceRecordId: result.performanceRecordId,
        substitutionUsed: result.substitutionUsed,
        originalPartId: result.originalPartId,
        actualPartUsed: result.actualPartUsed,
        quantityConsumed: result.quantityConsumed,
        costImpact: result.costImpact,
        approvalRequired: requireApprovalForSubstitution && result.substitutionUsed && !result.approvalId,
        messages: result.messages,
        substitutionDetails: result.substitutionUsed ? {
          workOrderSubstitutionId: result.workOrderSubstitutionId!,
          quantityRatio: result.quantityRatio,
          substitutionReason: result.substitutionReason || substitutionReason || 'Automatic substitution',
          approvalId: result.approvalId
        } : undefined
      };

    } catch (error) {
      logger.error('Enhanced material consumption failed', {
        workOrderId,
        partId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to standard consumption if interchangeability fails and allowed
      logger.info('Attempting fallback to standard material consumption');
      try {
        return await this.standardMaterialConsumption(data);
      } catch (fallbackError) {
        logger.error('Standard material consumption fallback also failed', {
          workOrderId,
          partId,
          fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
        });
        throw new Error(
          `Material consumption failed: ${error instanceof Error ? error.message : String(error)}. ` +
          `Fallback also failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
        );
      }
    }
  }

  /**
   * Get available substitute options before consumption
   */
  async getSubstituteOptions(
    partId: string,
    workOrderId: string,
    operationId?: string,
    quantity?: number
  ): Promise<Array<{
    partId: string;
    partNumber: string;
    description: string;
    quantityRatio: number;
    priority: number;
    requiresApproval: boolean;
    availableQuantity?: number;
    estimatedCost?: number;
    conditions?: string;
  }>> {
    try {
      return await this.interchangeabilityIntegration.getSubstituteOptions(
        partId,
        workOrderId,
        operationId,
        quantity
      );
    } catch (error) {
      logger.error('Failed to get substitute options', {
        partId,
        workOrderId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Pre-validate material consumption to check for potential issues
   */
  async preValidateMaterialConsumption(
    workOrderId: string,
    partId: string,
    quantity: number,
    operationId?: string
  ): Promise<{
    canProceedDirectly: boolean;
    substitutionRequired: boolean;
    availableSubstitutes: number;
    approvalRequired: boolean;
    validationMessages: string[];
    suggestedAction: string;
  }> {
    try {
      const validation = await this.interchangeabilityIntegration.validateMaterialConsumption({
        workOrderId,
        operationId,
        originalPartId: partId,
        requestedQuantity: quantity,
        recordedBy: 'system' // This is just for validation
      });

      return {
        canProceedDirectly: !validation.substitutionRequired,
        substitutionRequired: validation.substitutionRequired,
        availableSubstitutes: validation.suggestedSubstitutes?.length || 0,
        approvalRequired: validation.approvalRequired || false,
        validationMessages: validation.validationMessages,
        suggestedAction: this.determineSuggestedAction(validation)
      };

    } catch (error) {
      logger.error('Pre-validation failed', {
        workOrderId,
        partId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        canProceedDirectly: false,
        substitutionRequired: false,
        availableSubstitutes: 0,
        approvalRequired: false,
        validationMessages: [`Validation error: ${error instanceof Error ? error.message : String(error)}`],
        suggestedAction: 'Contact supervisor for manual review'
      };
    }
  }

  /**
   * Get work order substitution summary
   */
  async getWorkOrderSubstitutionSummary(workOrderId: string): Promise<{
    totalSubstitutions: number;
    substitutionsByReason: Record<string, number>;
    costImpact: number;
    partsAffected: string[];
    substitutionDetails: Array<{
      fromPartId: string;
      toPartId: string;
      quantity: number;
      reason: string;
      timestamp: Date;
      authorizedBy: string;
    }>;
  }> {
    try {
      const [stats, substitutions] = await Promise.all([
        this.interchangeabilityIntegration.getWorkOrderSubstitutionStats(workOrderId),
        this.interchangeabilityIntegration.getWorkOrderSubstitutionStats(workOrderId) // This would be getWorkOrderSubstitutions in real implementation
      ]);

      // Get detailed substitution records
      const substitutionDetails = await prisma.workOrderPartSubstitution.findMany({
        where: { workOrderId },
        include: {
          fromPart: { select: { partNumber: true } },
          toPart: { select: { partNumber: true } },
          authorizedByUser: { select: { username: true } }
        },
        orderBy: { createdAt: 'desc' }
      });

      return {
        totalSubstitutions: stats.totalSubstitutions,
        substitutionsByReason: stats.substitutionsByReason,
        costImpact: stats.costImpact,
        partsAffected: stats.partsAffected,
        substitutionDetails: substitutionDetails.map(sub => ({
          fromPartId: sub.fromPartId,
          toPartId: sub.toPartId,
          quantity: sub.quantitySubstituted,
          reason: sub.reason || 'Not specified',
          timestamp: sub.createdAt,
          authorizedBy: sub.authorizedByUser?.username || 'Unknown'
        }))
      };

    } catch (error) {
      logger.error('Failed to get work order substitution summary', {
        workOrderId,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        totalSubstitutions: 0,
        substitutionsByReason: {},
        costImpact: 0,
        partsAffected: [],
        substitutionDetails: []
      };
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private validateMaterialConsumptionInputs(data: EnhancedMaterialConsumptionData): void {
    const { workOrderId, partId, quantityConsumed, recordedBy } = data;

    if (!workOrderId || typeof workOrderId !== 'string' || workOrderId.trim() === '') {
      throw new Error('Invalid work order ID provided');
    }

    if (!partId || typeof partId !== 'string' || partId.trim() === '') {
      throw new Error('Invalid part ID provided');
    }

    if (!quantityConsumed || quantityConsumed <= 0) {
      throw new Error('Quantity consumed must be greater than 0');
    }

    if (!recordedBy || typeof recordedBy !== 'string' || recordedBy.trim() === '') {
      throw new Error('RecordedBy user ID is required');
    }
  }

  private async standardMaterialConsumption(
    data: EnhancedMaterialConsumptionData
  ): Promise<MaterialConsumptionResponse> {
    const {
      workOrderId,
      operationId,
      partId,
      quantityConsumed,
      quantityPlanned,
      unitCost,
      recordedBy,
      notes
    } = data;

    // Create standard work performance record using existing service
    // This would normally call the existing WorkOrderExecutionService.recordWorkPerformance
    const performanceRecord = await prisma.workPerformance.create({
      data: {
        workOrderId,
        operationId,
        performanceType: WorkPerformanceType.MATERIAL,
        partId,
        quantityConsumed,
        quantityPlanned: quantityPlanned || quantityConsumed,
        materialVariance: (quantityPlanned || quantityConsumed) - quantityConsumed,
        unitCost,
        totalCost: unitCost ? unitCost * quantityConsumed : undefined,
        recordedBy,
        notes,
        recordedAt: new Date()
      }
    });

    return {
      success: true,
      performanceRecordId: performanceRecord.id,
      substitutionUsed: false,
      originalPartId: partId,
      actualPartUsed: partId,
      quantityConsumed,
      costImpact: 0,
      approvalRequired: false,
      messages: ['Standard material consumption completed successfully']
    };
  }

  private determineSuggestedAction(validation: any): string {
    if (!validation.canProceed) {
      return 'Cannot proceed - contact supervisor';
    }

    if (validation.substitutionRequired) {
      if (validation.approvalRequired) {
        return 'Substitution required with approval - submit approval request';
      } else {
        return 'Substitution available - review options and proceed';
      }
    }

    return 'Proceed with standard consumption';
  }
}

// ============================================================================
// UTILITY FUNCTIONS FOR INTEGRATION
// ============================================================================

/**
 * Middleware function to enhance existing work order execution endpoints
 */
export const withInterchangeabilityValidation = (
  originalHandler: Function
) => {
  return async (req: any, res: any, next: any) => {
    try {
      // Check if this is a material consumption request
      if (req.body.performanceType === 'MATERIAL' && req.body.partId) {
        const enhancedService = WorkOrderExecutionEnhanced.getInstance();

        // Add interchangeability pre-validation
        const preValidation = await enhancedService.preValidateMaterialConsumption(
          req.body.workOrderId,
          req.body.partId,
          req.body.quantityConsumed,
          req.body.operationId
        );

        // Add validation results to request context
        req.interchangeabilityValidation = preValidation;

        // If validation suggests issues, add warnings to response
        if (!preValidation.canProceedDirectly) {
          req.validationWarnings = preValidation.validationMessages;
        }
      }

      // Continue with original handler
      return await originalHandler(req, res, next);

    } catch (error) {
      logger.error('Interchangeability validation middleware error', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Continue with original handler even if validation fails
      return await originalHandler(req, res, next);
    }
  };
};

export default WorkOrderExecutionEnhanced;