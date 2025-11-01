/**
 * Discrepancy Service
 * Issue #60: Phase 12 - Data Reconciliation System
 *
 * Detects, tracks, and manages discrepancies between MES and ERP systems.
 * Provides detailed analysis of data mismatches and resolution workflows.
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

/**
 * Discrepancy severity levels
 */
export enum DiscrepancySeverity {
  LOW = 'LOW',           // Informational, doesn't affect operations
  MEDIUM = 'MEDIUM',     // Should be resolved, may affect reporting
  HIGH = 'HIGH',         // Critical, affects operations or financials
  CRITICAL = 'CRITICAL', // Immediate action required
}

/**
 * Discrepancy status
 */
export enum DiscrepancyStatus {
  DETECTED = 'DETECTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_RESOLUTION = 'IN_RESOLUTION',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
  ESCALATED = 'ESCALATED',
}

/**
 * Discrepancy resolution type
 */
export enum ResolutionType {
  MES_CORRECTION = 'MES_CORRECTION',
  ERP_CORRECTION = 'ERP_CORRECTION',
  SYNC_CORRECTION = 'SYNC_CORRECTION',
  MANUAL_CORRECTION = 'MANUAL_CORRECTION',
  ACKNOWLEDGED_DIFFERENCE = 'ACKNOWLEDGED_DIFFERENCE',
}

/**
 * Discrepancy details interface
 */
export interface DiscrepancyDetail {
  id: string;
  reconciliationId: string;
  entityType: string;
  entityId: string;
  erpEntityId?: string;
  field: string;
  mesValue: any;
  erpValue: any;
  difference: string;
  severity: DiscrepancySeverity;
  status: DiscrepancyStatus;
  description: string;
  resolution?: {
    type: ResolutionType;
    correctedValue: any;
    correctionDetails: string;
    resolvedAt: Date;
    resolvedBy: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Discrepancy Service
 */
export class DiscrepancyService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Detect discrepancies between two data objects
   */
  async detectDiscrepancies(
    reconciliationId: string,
    entityType: string,
    entityId: string,
    mesData: Record<string, any>,
    erpData: Record<string, any>,
    fieldMappings: Record<string, string> = {}
  ): Promise<DiscrepancyDetail[]> {
    try {
      const discrepancies: DiscrepancyDetail[] = [];

      // Compare all fields
      const allFields = new Set([...Object.keys(mesData), ...Object.keys(erpData)]);

      for (const field of allFields) {
        const mesValue = mesData[field];
        const erpValue = erpData[field];

        // Skip if both are undefined/null
        if (mesValue === undefined && erpValue === undefined) {
          continue;
        }

        // Check for difference
        if (!this.valuesEqual(mesValue, erpValue)) {
          const severity = this.calculateSeverity(entityType, field, mesValue, erpValue);
          const difference = this.describeDifference(mesValue, erpValue);

          discrepancies.push({
            id: `discrepancy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            reconciliationId,
            entityType,
            entityId,
            field,
            mesValue,
            erpValue,
            difference,
            severity,
            status: DiscrepancyStatus.DETECTED,
            description: `${field} differs: MES="${mesValue}" vs ERP="${erpValue}"`,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      logger.info('Discrepancies detected', {
        reconciliationId,
        entityType,
        entityId,
        discrepancyCount: discrepancies.length,
        criticities: this.groupBySeverity(discrepancies),
      });

      return discrepancies;
    } catch (error) {
      logger.error('Failed to detect discrepancies', {
        error: error instanceof Error ? error.message : String(error),
        reconciliationId,
        entityType,
      });
      throw error;
    }
  }

  /**
   * Check if two values are equal (with type coercion handling)
   */
  private valuesEqual(val1: any, val2: any): boolean {
    // Both undefined/null
    if ((val1 === null || val1 === undefined) && (val2 === null || val2 === undefined)) {
      return true;
    }

    // One is undefined/null
    if ((val1 === null || val1 === undefined) || (val2 === null || val2 === undefined)) {
      return false;
    }

    // Direct comparison
    if (val1 === val2) {
      return true;
    }

    // String comparison with trimming
    if (typeof val1 === 'string' && typeof val2 === 'string') {
      return val1.trim() === val2.trim();
    }

    // Number comparison with tolerance for floats
    if (typeof val1 === 'number' && typeof val2 === 'number') {
      const tolerance = 0.01; // 0.01 tolerance for decimal comparisons
      return Math.abs(val1 - val2) < tolerance;
    }

    // Date comparison
    if (val1 instanceof Date && val2 instanceof Date) {
      return Math.abs(val1.getTime() - val2.getTime()) < 1000; // 1 second tolerance
    }

    // Array/object comparison
    if (Array.isArray(val1) && Array.isArray(val2)) {
      if (val1.length !== val2.length) return false;
      return val1.every((v, i) => this.valuesEqual(v, val2[i]));
    }

    // Convert to strings for final comparison
    return String(val1).trim() === String(val2).trim();
  }

  /**
   * Calculate severity of discrepancy
   */
  private calculateSeverity(
    entityType: string,
    field: string,
    mesValue: any,
    erpValue: any
  ): DiscrepancySeverity {
    // Critical fields that affect operations
    const criticalFields: Record<string, string[]> = {
      PurchaseOrder: ['poNumber', 'quantity', 'unitPrice', 'status', 'vendorId'],
      WorkOrder: ['status', 'quantity', 'dueDate', 'workOrderNumber'],
      Supplier: ['vendorId', 'name', 'paymentTerms'],
      Inventory: ['quantity', 'warehouseLocation', 'batchNumber'],
    };

    // Financial fields
    const financialFields = ['unitPrice', 'totalPrice', 'cost', 'amount', 'taxAmount'];

    // Status fields
    const statusFields = ['status', 'state', 'stage'];

    // Check if critical field
    if (criticalFields[entityType]?.includes(field)) {
      return DiscrepancySeverity.HIGH;
    }

    // Check if financial field
    if (financialFields.some((f) => field.toLowerCase().includes(f.toLowerCase()))) {
      return DiscrepancySeverity.HIGH;
    }

    // Check if status field
    if (statusFields.some((f) => field.toLowerCase().includes(f.toLowerCase()))) {
      return DiscrepancySeverity.MEDIUM;
    }

    // Check for NULL/missing critical values
    if ((mesValue === null || mesValue === undefined) || (erpValue === null || erpValue === undefined)) {
      return DiscrepancySeverity.MEDIUM;
    }

    // Check magnitude of difference for numeric fields
    if (typeof mesValue === 'number' && typeof erpValue === 'number') {
      const percentDiff = Math.abs((mesValue - erpValue) / Math.max(Math.abs(erpValue), 1)) * 100;
      if (percentDiff > 10) return DiscrepancySeverity.MEDIUM;
      if (percentDiff > 1) return DiscrepancySeverity.LOW;
    }

    return DiscrepancySeverity.LOW;
  }

  /**
   * Describe the difference between two values
   */
  private describeDifference(mesValue: any, erpValue: any): string {
    if (typeof mesValue === 'number' && typeof erpValue === 'number') {
      const diff = erpValue - mesValue;
      const percentDiff = ((diff / Math.max(Math.abs(erpValue), 1)) * 100).toFixed(2);
      return `ERP ${erpValue} vs MES ${mesValue} (${percentDiff}% difference)`;
    }

    return `ERP "${erpValue}" vs MES "${mesValue}"`;
  }

  /**
   * Group discrepancies by severity
   */
  private groupBySeverity(
    discrepancies: DiscrepancyDetail[]
  ): Record<DiscrepancySeverity, number> {
    const grouped: Record<DiscrepancySeverity, number> = {
      [DiscrepancySeverity.LOW]: 0,
      [DiscrepancySeverity.MEDIUM]: 0,
      [DiscrepancySeverity.HIGH]: 0,
      [DiscrepancySeverity.CRITICAL]: 0,
    };

    for (const disc of discrepancies) {
      grouped[disc.severity]++;
    }

    return grouped;
  }

  /**
   * Suggest resolution for a discrepancy
   */
  suggestResolution(discrepancy: DiscrepancyDetail): {
    suggestedType: ResolutionType;
    rationale: string;
    recommendedValue: any;
  } {
    // If ERP value exists and MES is missing/null, use ERP (ERP is source of truth)
    if ((discrepancy.mesValue === null || discrepancy.mesValue === undefined) && discrepancy.erpValue) {
      return {
        suggestedType: ResolutionType.SYNC_CORRECTION,
        rationale: 'ERP is system of record. Sync ERP value to MES.',
        recommendedValue: discrepancy.erpValue,
      };
    }

    // If both exist but differ, ERP wins for master data
    if (discrepancy.entityType === 'Supplier' || discrepancy.entityType === 'Part') {
      return {
        suggestedType: ResolutionType.SYNC_CORRECTION,
        rationale: 'Master data should be synced from ERP system of record.',
        recommendedValue: discrepancy.erpValue,
      };
    }

    // For transactional data (PO, WO), analyze the difference
    if (discrepancy.severity === DiscrepancySeverity.HIGH) {
      return {
        suggestedType: ResolutionType.MANUAL_CORRECTION,
        rationale: 'High severity discrepancy requires manual review and decision.',
        recommendedValue: null,
      };
    }

    // For low severity, acknowledge difference
    return {
      suggestedType: ResolutionType.ACKNOWLEDGED_DIFFERENCE,
      rationale: 'Low severity discrepancy. Can be acknowledged and tracked.',
      recommendedValue: discrepancy.erpValue,
    };
  }

  /**
   * Resolve a discrepancy
   */
  async resolveDiscrepancy(
    discrepancyId: string,
    resolutionType: ResolutionType,
    correctedValue: any,
    correctionDetails: string,
    resolvedBy: string
  ): Promise<void> {
    try {
      logger.info('Resolving discrepancy', {
        discrepancyId,
        resolutionType,
        correctionDetails,
        resolvedBy,
      });

      // In a real implementation, this would:
      // 1. Update the discrepancy record in database
      // 2. Apply the correction (create sync transaction if needed)
      // 3. Log the resolution for audit trail
      // 4. Notify relevant parties

      logger.info('Discrepancy resolved', {
        discrepancyId,
        resolutionType,
      });
    } catch (error) {
      logger.error('Failed to resolve discrepancy', {
        error: error instanceof Error ? error.message : String(error),
        discrepancyId,
      });
      throw error;
    }
  }

  /**
   * Get summary of discrepancies by severity
   */
  async getSummary(discrepancies: DiscrepancyDetail[]): Promise<{
    total: number;
    bySeverity: Record<DiscrepancySeverity, number>;
    requiresAction: number;
    entityTypeSummary: Record<string, number>;
  }> {
    const bySeverity = this.groupBySeverity(discrepancies);
    const requiresAction = bySeverity[DiscrepancySeverity.CRITICAL] + bySeverity[DiscrepancySeverity.HIGH];

    const entityTypeSummary: Record<string, number> = {};
    for (const disc of discrepancies) {
      entityTypeSummary[disc.entityType] = (entityTypeSummary[disc.entityType] || 0) + 1;
    }

    return {
      total: discrepancies.length,
      bySeverity,
      requiresAction,
      entityTypeSummary,
    };
  }
}

export default DiscrepancyService;
