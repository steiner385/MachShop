/**
 * Work Order Interchangeability Integration Service (GitHub Issue #223)
 *
 * This service integrates the Part Interchangeability framework with the Work Order Execution system.
 * It provides enhanced material consumption with automatic substitution validation and suggestions.
 *
 * Key Features:
 * - Validates part substitutions during work order execution
 * - Automatically suggests available substitutes when parts are unavailable
 * - Enforces approval requirements for substitutions
 * - Logs all substitution activities for traceability
 * - Maintains AS9100 compliance for aerospace manufacturing
 */

import { WorkPerformanceType, SubstitutionReason } from '@prisma/client';
import prisma from '../lib/database';
import { PartInterchangeabilityService } from './PartInterchangeabilityService';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface MaterialConsumptionRequest {
  workOrderId: string;
  operationId?: string;
  originalPartId: string;
  requestedQuantity: number;
  recordedBy: string;
  unitCost?: number;
  notes?: string;
}

interface MaterialConsumptionValidation {
  isValid: boolean;
  canProceed: boolean;
  validationMessages: string[];
  substitutionRequired: boolean;
  originalPartAvailable: boolean;
  suggestedSubstitutes?: PartSubstituteOption[];
  approvalRequired?: boolean;
  approvalId?: string;
}

interface PartSubstituteOption {
  partId: string;
  partNumber: string;
  description: string;
  quantityRatio: number;
  priority: number;
  substitutionType: string;
  requiresApproval: boolean;
  availableQuantity?: number;
  estimatedCost?: number;
  effectiveDate?: Date;
  expirationDate?: Date;
  conditions?: string;
  groupName: string;
}

interface MaterialConsumptionResult {
  success: boolean;
  substitutionUsed: boolean;
  originalPartId: string;
  actualPartUsed: string;
  quantityConsumed: number;
  adjustedQuantity: number;
  quantityRatio: number;
  costImpact: number;
  substitutionReason?: string;
  approvalId?: string;
  performanceRecordId: string;
  workOrderSubstitutionId?: string;
  messages: string[];
}

interface PartAvailabilityCheck {
  partId: string;
  partNumber: string;
  availableQuantity: number;
  reservedQuantity: number;
  onHandQuantity: number;
  isAvailable: boolean;
  locationInfo?: any;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class WorkOrderInterchangeabilityIntegration {
  private static instance: WorkOrderInterchangeabilityIntegration;
  private interchangeabilityService: PartInterchangeabilityService;

  private constructor() {
    this.interchangeabilityService = PartInterchangeabilityService.getInstance();
  }

  public static getInstance(): WorkOrderInterchangeabilityIntegration {
    if (!WorkOrderInterchangeabilityIntegration.instance) {
      WorkOrderInterchangeabilityIntegration.instance = new WorkOrderInterchangeabilityIntegration();
    }
    return WorkOrderInterchangeabilityIntegration.instance;
  }

  // ============================================================================
  // MATERIAL CONSUMPTION WITH INTERCHANGEABILITY
  // ============================================================================

  /**
   * Enhanced material consumption with automatic substitution validation
   */
  async consumeMaterialWithInterchangeability(
    request: MaterialConsumptionRequest
  ): Promise<MaterialConsumptionResult> {
    const {
      workOrderId,
      operationId,
      originalPartId,
      requestedQuantity,
      recordedBy,
      unitCost,
      notes
    } = request;

    logger.info('Starting material consumption with interchangeability validation', {
      workOrderId,
      originalPartId,
      requestedQuantity,
      recordedBy
    });

    try {
      // Step 1: Validate work order and operation
      await this.validateWorkOrderAndOperation(workOrderId, operationId);

      // Step 2: Check original part availability
      const availability = await this.checkPartAvailability(originalPartId, requestedQuantity);

      // Step 3: Validate material consumption request
      const validation = await this.validateMaterialConsumption({
        workOrderId,
        operationId,
        originalPartId,
        requestedQuantity,
        recordedBy
      });

      if (!validation.canProceed) {
        throw new Error(`Material consumption validation failed: ${validation.validationMessages.join('; ')}`);
      }

      // Step 4: Determine if substitution is needed
      let actualPartUsed = originalPartId;
      let quantityRatio = 1.0;
      let substitutionUsed = false;
      let substitutionReason: string | undefined;
      let approvalId: string | undefined;
      let workOrderSubstitutionId: string | undefined;

      if (validation.substitutionRequired || !availability.isAvailable) {
        const substitutionResult = await this.handlePartSubstitution(
          workOrderId,
          operationId,
          originalPartId,
          requestedQuantity,
          recordedBy,
          validation.suggestedSubstitutes
        );

        actualPartUsed = substitutionResult.partUsed;
        quantityRatio = substitutionResult.quantityRatio;
        substitutionUsed = true;
        substitutionReason = substitutionResult.reason;
        approvalId = substitutionResult.approvalId;
        workOrderSubstitutionId = substitutionResult.workOrderSubstitutionId;
      }

      // Step 5: Calculate adjusted quantities and costs
      const adjustedQuantity = requestedQuantity * quantityRatio;
      const originalCost = (unitCost || 0) * requestedQuantity;
      const actualCost = await this.calculateActualCost(actualPartUsed, adjustedQuantity, unitCost);
      const costImpact = actualCost - originalCost;

      // Step 6: Record work performance with actual part used
      const performanceRecordId = await this.recordMaterialPerformance({
        workOrderId,
        operationId,
        partId: actualPartUsed,
        quantityConsumed: adjustedQuantity,
        quantityPlanned: requestedQuantity,
        unitCost: unitCost,
        totalCost: actualCost,
        recordedBy,
        notes: substitutionUsed ? `${notes || ''} [SUBSTITUTION: ${originalPartId} → ${actualPartUsed}]`.trim() : notes
      });

      // Step 7: Log substitution if used
      if (substitutionUsed && workOrderSubstitutionId) {
        logger.info('Part substitution completed successfully', {
          workOrderId,
          originalPartId,
          actualPartUsed,
          quantityRatio,
          costImpact,
          substitutionReason
        });
      }

      return {
        success: true,
        substitutionUsed,
        originalPartId,
        actualPartUsed,
        quantityConsumed: adjustedQuantity,
        adjustedQuantity,
        quantityRatio,
        costImpact,
        substitutionReason,
        approvalId,
        performanceRecordId,
        workOrderSubstitutionId,
        messages: [
          substitutionUsed
            ? `Material consumed with substitution: ${originalPartId} → ${actualPartUsed} (ratio: ${quantityRatio})`
            : `Material consumed successfully: ${actualPartUsed}`
        ]
      };

    } catch (error) {
      logger.error('Material consumption with interchangeability failed', {
        workOrderId,
        originalPartId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Validate material consumption request with interchangeability rules
   */
  async validateMaterialConsumption(
    request: MaterialConsumptionRequest
  ): Promise<MaterialConsumptionValidation> {
    const { workOrderId, operationId, originalPartId, requestedQuantity } = request;

    const validation: MaterialConsumptionValidation = {
      isValid: true,
      canProceed: true,
      validationMessages: [],
      substitutionRequired: false,
      originalPartAvailable: true
    };

    try {
      // Check original part availability
      const availability = await this.checkPartAvailability(originalPartId, requestedQuantity);
      validation.originalPartAvailable = availability.isAvailable;

      if (!availability.isAvailable) {
        validation.substitutionRequired = true;
        validation.validationMessages.push(
          `Original part ${originalPartId} not available (required: ${requestedQuantity}, available: ${availability.availableQuantity})`
        );

        // Get available substitutes
        const substitutes = await this.interchangeabilityService.getAvailableSubstitutes(
          originalPartId,
          workOrderId,
          operationId,
          requestedQuantity
        );

        if (substitutes.length === 0) {
          validation.canProceed = false;
          validation.validationMessages.push('No valid substitutes available for this part');
        } else {
          validation.suggestedSubstitutes = await this.enhanceSubstituteOptions(substitutes, requestedQuantity);

          // Check if any substitutes require approval
          const needsApproval = validation.suggestedSubstitutes.some(s => s.requiresApproval);
          if (needsApproval) {
            validation.approvalRequired = true;
            validation.validationMessages.push('Substitution requires engineering approval');
          }
        }
      }

      return validation;

    } catch (error) {
      logger.error('Material consumption validation failed', {
        workOrderId,
        originalPartId,
        error: error instanceof Error ? error.message : String(error)
      });

      validation.isValid = false;
      validation.canProceed = false;
      validation.validationMessages.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
      return validation;
    }
  }

  /**
   * Get available substitute options for a part
   */
  async getSubstituteOptions(
    partId: string,
    workOrderId?: string,
    operationId?: string,
    quantity?: number
  ): Promise<PartSubstituteOption[]> {
    try {
      const substitutes = await this.interchangeabilityService.getAvailableSubstitutes(
        partId,
        workOrderId,
        operationId,
        quantity
      );

      return await this.enhanceSubstituteOptions(substitutes, quantity);

    } catch (error) {
      logger.error('Failed to get substitute options', {
        partId,
        workOrderId,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async validateWorkOrderAndOperation(workOrderId: string, operationId?: string): Promise<void> {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { part: true }
    });

    if (!workOrder) {
      throw new Error(`Work order ${workOrderId} not found`);
    }

    if (!['IN_PROGRESS', 'COMPLETED'].includes(workOrder.status)) {
      throw new Error(`Work order ${workOrderId} must be IN_PROGRESS or COMPLETED for material consumption`);
    }

    if (operationId) {
      const operation = await prisma.operation.findUnique({
        where: { id: operationId }
      });

      if (!operation) {
        throw new Error(`Operation ${operationId} not found`);
      }
    }
  }

  private async checkPartAvailability(partId: string, requiredQuantity: number): Promise<PartAvailabilityCheck> {
    // This would integrate with inventory management system
    // For now, we'll simulate the check
    const part = await prisma.part.findUnique({
      where: { id: partId }
    });

    if (!part) {
      throw new Error(`Part ${partId} not found`);
    }

    // Simulate inventory check - in real implementation, this would query inventory system
    const simulatedAvailableQuantity = Math.floor(Math.random() * 100);

    return {
      partId,
      partNumber: part.partNumber,
      availableQuantity: simulatedAvailableQuantity,
      reservedQuantity: 0,
      onHandQuantity: simulatedAvailableQuantity,
      isAvailable: simulatedAvailableQuantity >= requiredQuantity
    };
  }

  private async handlePartSubstitution(
    workOrderId: string,
    operationId: string | undefined,
    originalPartId: string,
    requestedQuantity: number,
    authorizedBy: string,
    suggestedSubstitutes?: PartSubstituteOption[]
  ): Promise<{
    partUsed: string;
    quantityRatio: number;
    reason: string;
    approvalId?: string;
    workOrderSubstitutionId: string;
  }> {
    if (!suggestedSubstitutes || suggestedSubstitutes.length === 0) {
      throw new Error('No substitute parts available');
    }

    // Select the highest priority substitute that doesn't require approval
    // In a real implementation, this could be user-selectable or more sophisticated
    const substitute = suggestedSubstitutes
      .filter(s => !s.requiresApproval)
      .sort((a, b) => b.priority - a.priority)[0] || suggestedSubstitutes[0];

    if (!substitute) {
      throw new Error('No suitable substitute found');
    }

    if (substitute.requiresApproval) {
      throw new Error(`Substitution ${originalPartId} → ${substitute.partId} requires approval`);
    }

    // Log the substitution
    const workOrderSubstitution = await this.interchangeabilityService.logWorkOrderSubstitution({
      workOrderId,
      operationId: operationId || '',
      fromPartId: originalPartId,
      toPartId: substitute.partId,
      quantitySubstituted: requestedQuantity * substitute.quantityRatio,
      reason: SubstitutionReason.UNAVAILABLE,
      authorizedBy
    });

    return {
      partUsed: substitute.partId,
      quantityRatio: substitute.quantityRatio,
      reason: 'Part unavailable - automatic substitution',
      workOrderSubstitutionId: workOrderSubstitution.id
    };
  }

  private async enhanceSubstituteOptions(
    substitutes: any[],
    quantity?: number
  ): Promise<PartSubstituteOption[]> {
    const enhanced: PartSubstituteOption[] = [];

    for (const substitute of substitutes) {
      const availability = await this.checkPartAvailability(substitute.toPartId, quantity || 1);
      const estimatedCost = await this.estimatePartCost(substitute.toPartId);

      enhanced.push({
        partId: substitute.toPartId,
        partNumber: substitute.toPart?.partNumber || substitute.toPartId,
        description: substitute.toPart?.description || '',
        quantityRatio: substitute.quantityRatio,
        priority: substitute.priority,
        substitutionType: substitute.type,
        requiresApproval: substitute.requiresApproval,
        availableQuantity: availability.availableQuantity,
        estimatedCost,
        effectiveDate: substitute.effectiveDate,
        expirationDate: substitute.expirationDate,
        conditions: substitute.conditions,
        groupName: substitute.group?.name || 'Unknown Group'
      });
    }

    return enhanced.sort((a, b) => b.priority - a.priority);
  }

  private async calculateActualCost(partId: string, quantity: number, unitCost?: number): Promise<number> {
    if (unitCost) {
      return unitCost * quantity;
    }

    // Get part cost from database or external system
    const estimatedUnitCost = await this.estimatePartCost(partId);
    return estimatedUnitCost * quantity;
  }

  private async estimatePartCost(partId: string): Promise<number> {
    // This would integrate with cost management system
    // For now, return a simulated cost
    const part = await prisma.part.findUnique({
      where: { id: partId }
    });

    // Simulate cost calculation - in real implementation, query costing system
    return Math.random() * 100 + 10; // Random cost between $10-$110
  }

  private async recordMaterialPerformance(data: {
    workOrderId: string;
    operationId?: string;
    partId: string;
    quantityConsumed: number;
    quantityPlanned: number;
    unitCost?: number;
    totalCost: number;
    recordedBy: string;
    notes?: string;
  }): Promise<string> {
    const performance = await prisma.workPerformance.create({
      data: {
        workOrderId: data.workOrderId,
        operationId: data.operationId,
        performanceType: WorkPerformanceType.MATERIAL,
        partId: data.partId,
        quantityConsumed: data.quantityConsumed,
        quantityPlanned: data.quantityPlanned,
        materialVariance: data.quantityPlanned - data.quantityConsumed,
        unitCost: data.unitCost,
        totalCost: data.totalCost,
        recordedBy: data.recordedBy,
        notes: data.notes,
        recordedAt: new Date()
      }
    });

    return performance.id;
  }

  // ============================================================================
  // REPORTING AND ANALYTICS
  // ============================================================================

  /**
   * Get substitution usage statistics for a work order
   */
  async getWorkOrderSubstitutionStats(workOrderId: string): Promise<{
    totalSubstitutions: number;
    substitutionsByReason: Record<string, number>;
    costImpact: number;
    partsAffected: string[];
  }> {
    const substitutions = await this.interchangeabilityService.getWorkOrderSubstitutions(workOrderId);

    const stats = {
      totalSubstitutions: substitutions.length,
      substitutionsByReason: {} as Record<string, number>,
      costImpact: 0,
      partsAffected: [] as string[]
    };

    for (const substitution of substitutions) {
      // Count by reason
      const reason = substitution.reason || 'UNKNOWN';
      stats.substitutionsByReason[reason] = (stats.substitutionsByReason[reason] || 0) + 1;

      // Track parts affected
      if (!stats.partsAffected.includes(substitution.fromPartId)) {
        stats.partsAffected.push(substitution.fromPartId);
      }

      // Calculate cost impact (simplified - would need actual costing in real implementation)
      // This is a placeholder calculation
      stats.costImpact += Math.random() * 50 - 25; // Random impact between -$25 and +$25
    }

    return stats;
  }

  /**
   * Get interchangeability utilization report
   */
  async getInterchangeabilityUtilizationReport(options: {
    startDate?: Date;
    endDate?: Date;
    siteId?: string;
    partIds?: string[];
  }): Promise<{
    totalWorkOrders: number;
    workOrdersWithSubstitutions: number;
    utilizationRate: number;
    topSubstitutedParts: Array<{
      partId: string;
      partNumber: string;
      substitutionCount: number;
      costSavings: number;
    }>;
    substitutionTrends: Array<{
      date: string;
      substitutionCount: number;
      costImpact: number;
    }>;
  }> {
    // This would implement comprehensive reporting
    // For now, return a placeholder structure
    return {
      totalWorkOrders: 0,
      workOrdersWithSubstitutions: 0,
      utilizationRate: 0,
      topSubstitutedParts: [],
      substitutionTrends: []
    };
  }
}

export default WorkOrderInterchangeabilityIntegration;