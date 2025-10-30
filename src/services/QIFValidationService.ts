/**
 * QIF Validation Service
 * Centralized validation for QIF data with NIST AMS 300-12 compliance
 */

import { PrismaClient } from '@prisma/client';
import { QIFService } from './QIFService';
import {
  validateQIFUUID,
  validateAndNormalizeQIFId,
  validateMultipleUUIDs,
  isValidUUID,
  isNistCompliantUUID,
  type UUIDValidationResult,
} from '../utils/qif-uuid-validation';

export interface QIFValidationConfig {
  enforceNistCompliance: boolean;
  allowLegacyIds: boolean;
  validateUuidUniqueness: boolean;
  strictMode: boolean;
}

export interface QIFDocumentValidationResult {
  isValid: boolean;
  qifVersion?: string;
  hasUuids: boolean;
  nistCompliant: boolean;
  uuidValidations: Array<{
    field: string;
    value: string;
    validation: UUIDValidationResult;
  }>;
  structuralErrors: string[];
  uuidErrors: string[];
  warnings: string[];
  recommendations: string[];
}

export interface QIFDataValidationResult {
  planValidation?: QIFEntityValidationResult;
  characteristicValidations?: QIFEntityValidationResult[];
  resultValidation?: QIFEntityValidationResult;
  measurementValidations?: QIFEntityValidationResult[];
  overallStatus: 'VALID' | 'WARNING' | 'ERROR';
  summary: {
    totalEntities: number;
    validEntities: number;
    entitiesWithWarnings: number;
    entitiesWithErrors: number;
  };
}

export interface QIFEntityValidationResult {
  entityType: 'plan' | 'characteristic' | 'result' | 'measurement';
  entityId: string;
  hasUuid: boolean;
  hasLegacyId: boolean;
  uuidValid: boolean;
  nistCompliant: boolean;
  migrationStatus: 'COMPLETE' | 'PARTIAL' | 'NOT_STARTED';
  errors: string[];
  warnings: string[];
}

export class QIFValidationService {
  private prisma: PrismaClient;
  private qifService: QIFService;
  private config: QIFValidationConfig;

  constructor(
    prisma: PrismaClient,
    config: Partial<QIFValidationConfig> = {}
  ) {
    this.prisma = prisma;
    this.qifService = new QIFService({
      preferUuids: true,
      requireUuids: false,
      allowLegacyIds: true,
      validateUuidFormat: true,
      migrationMode: true,
      nistCompliance: true,
    });

    this.config = {
      enforceNistCompliance: false,
      allowLegacyIds: true,
      validateUuidUniqueness: true,
      strictMode: false,
      ...config,
    };
  }

  /**
   * Validate QIF XML document structure and UUID compliance
   */
  async validateQIFDocument(xmlContent: string): Promise<QIFDocumentValidationResult> {
    const result: QIFDocumentValidationResult = {
      isValid: false,
      hasUuids: false,
      nistCompliant: false,
      uuidValidations: [],
      structuralErrors: [],
      uuidErrors: [],
      warnings: [],
      recommendations: [],
    };

    try {
      // Parse and validate QIF structure
      const qifDoc = this.qifService.parseQIF(xmlContent);
      const structuralValidation = this.qifService.validateQIF(qifDoc);

      result.qifVersion = qifDoc.QIFDocument.Version;
      result.structuralErrors = structuralValidation.errors;

      if (!structuralValidation.valid) {
        return result;
      }

      // Extract and validate UUIDs
      const uuids = this.extractUUIDsFromQIF(qifDoc);
      result.hasUuids = uuids.length > 0;

      // Validate each UUID
      for (const { field, value } of uuids) {
        const validation = validateQIFUUID(value);
        result.uuidValidations.push({ field, value, validation });

        if (!validation.isValid) {
          result.uuidErrors.push(`Invalid UUID in ${field}: ${validation.errors.join(', ')}`);
        } else if (!validation.isNistCompliant) {
          result.warnings.push(`Non-NIST-compliant UUID in ${field}: ${validation.warnings.join(', ')}`);
        }
      }

      // Check overall NIST compliance
      result.nistCompliant = result.hasUuids &&
        result.uuidValidations.every(v => v.validation.isNistCompliant);

      // Generate recommendations
      this.generateRecommendations(result);

      result.isValid = result.structuralErrors.length === 0 && result.uuidErrors.length === 0;

    } catch (error) {
      result.structuralErrors.push(`Failed to parse QIF document: ${error}`);
    }

    return result;
  }

  /**
   * Validate QIF database entities and their UUID migration status
   */
  async validateQIFData(): Promise<QIFDataValidationResult> {
    const result: QIFDataValidationResult = {
      overallStatus: 'VALID',
      summary: {
        totalEntities: 0,
        validEntities: 0,
        entitiesWithWarnings: 0,
        entitiesWithErrors: 0,
      },
    };

    try {
      // Validate measurement plans
      const plans = await this.prisma.qIFMeasurementPlan.findMany({
        select: {
          id: true,
          qifPlanUuid: true,
          qifPlanId: true,
        },
      });

      result.planValidation = await this.validateQIFEntities(
        plans.map(p => ({
          id: p.id,
          uuid: p.qifPlanUuid,
          legacyId: p.qifPlanId,
        })),
        'plan'
      )[0];

      // Validate characteristics
      const characteristics = await this.prisma.qIFCharacteristic.findMany({
        select: {
          id: true,
          characteristicUuid: true,
          characteristicId: true,
        },
      });

      result.characteristicValidations = await this.validateQIFEntities(
        characteristics.map(c => ({
          id: c.id,
          uuid: c.characteristicUuid,
          legacyId: c.characteristicId,
        })),
        'characteristic'
      );

      // Validate measurement results
      const results = await this.prisma.qIFMeasurementResult.findMany({
        select: {
          id: true,
          qifResultsUuid: true,
          qifResultsId: true,
        },
      });

      result.resultValidation = await this.validateQIFEntities(
        results.map(r => ({
          id: r.id,
          uuid: r.qifResultsUuid,
          legacyId: r.qifResultsId,
        })),
        'result'
      )[0];

      // Calculate summary
      const allValidations = [
        result.planValidation,
        ...(result.characteristicValidations || []),
        result.resultValidation,
      ].filter(Boolean) as QIFEntityValidationResult[];

      result.summary.totalEntities = allValidations.length;
      result.summary.validEntities = allValidations.filter(v => v.errors.length === 0).length;
      result.summary.entitiesWithWarnings = allValidations.filter(v => v.warnings.length > 0).length;
      result.summary.entitiesWithErrors = allValidations.filter(v => v.errors.length > 0).length;

      // Determine overall status
      if (result.summary.entitiesWithErrors > 0) {
        result.overallStatus = 'ERROR';
      } else if (result.summary.entitiesWithWarnings > 0) {
        result.overallStatus = 'WARNING';
      } else {
        result.overallStatus = 'VALID';
      }

    } catch (error) {
      result.overallStatus = 'ERROR';
      // Add error handling
    }

    return result;
  }

  /**
   * Validate UUID uniqueness across QIF entities
   */
  async validateUUIDUniqueness(): Promise<{
    isUnique: boolean;
    duplicates: Array<{
      uuid: string;
      count: number;
      entities: Array<{ type: string; id: string }>;
    }>;
  }> {
    const duplicates: Array<{
      uuid: string;
      count: number;
      entities: Array<{ type: string; id: string }>;
    }> = [];

    // Collect all UUIDs from different tables
    const [plans, characteristics, results] = await Promise.all([
      this.prisma.qIFMeasurementPlan.findMany({
        where: { qifPlanUuid: { not: null } },
        select: { id: true, qifPlanUuid: true },
      }),
      this.prisma.qIFCharacteristic.findMany({
        where: { characteristicUuid: { not: null } },
        select: { id: true, characteristicUuid: true },
      }),
      this.prisma.qIFMeasurementResult.findMany({
        where: { qifResultsUuid: { not: null } },
        select: { id: true, qifResultsUuid: true },
      }),
    ]);

    // Map UUIDs to entities
    const uuidMap = new Map<string, Array<{ type: string; id: string }>>();

    plans.forEach(p => {
      if (p.qifPlanUuid) {
        const entities = uuidMap.get(p.qifPlanUuid) || [];
        entities.push({ type: 'QIFMeasurementPlan', id: p.id });
        uuidMap.set(p.qifPlanUuid, entities);
      }
    });

    characteristics.forEach(c => {
      if (c.characteristicUuid) {
        const entities = uuidMap.get(c.characteristicUuid) || [];
        entities.push({ type: 'QIFCharacteristic', id: c.id });
        uuidMap.set(c.characteristicUuid, entities);
      }
    });

    results.forEach(r => {
      if (r.qifResultsUuid) {
        const entities = uuidMap.get(r.qifResultsUuid) || [];
        entities.push({ type: 'QIFMeasurementResult', id: r.id });
        uuidMap.set(r.qifResultsUuid, entities);
      }
    });

    // Find duplicates
    for (const [uuid, entities] of uuidMap) {
      if (entities.length > 1) {
        duplicates.push({
          uuid,
          count: entities.length,
          entities,
        });
      }
    }

    return {
      isUnique: duplicates.length === 0,
      duplicates,
    };
  }

  /**
   * Generate validation report for QIF system health
   */
  async generateValidationReport(): Promise<{
    timestamp: string;
    systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL';
    dataValidation: QIFDataValidationResult;
    uniquenessCheck: { isUnique: boolean; duplicateCount: number };
    migrationProgress: {
      totalEntities: number;
      migratedEntities: number;
      migrationPercentage: number;
    };
    recommendations: string[];
  }> {
    const [dataValidation, uniquenessCheck] = await Promise.all([
      this.validateQIFData(),
      this.validateUUIDUniqueness(),
    ]);

    const migrationProgress = {
      totalEntities: dataValidation.summary.totalEntities,
      migratedEntities: dataValidation.summary.totalEntities - dataValidation.summary.entitiesWithErrors,
      migrationPercentage: Math.round(
        ((dataValidation.summary.totalEntities - dataValidation.summary.entitiesWithErrors) /
          dataValidation.summary.totalEntities) * 100
      ),
    };

    let systemHealth: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';

    if (dataValidation.overallStatus === 'ERROR' || !uniquenessCheck.isUnique) {
      systemHealth = 'CRITICAL';
    } else if (dataValidation.overallStatus === 'WARNING') {
      systemHealth = 'WARNING';
    }

    const recommendations = this.generateSystemRecommendations(
      dataValidation,
      uniquenessCheck,
      migrationProgress
    );

    return {
      timestamp: new Date().toISOString(),
      systemHealth,
      dataValidation,
      uniquenessCheck: {
        isUnique: uniquenessCheck.isUnique,
        duplicateCount: uniquenessCheck.duplicates.length,
      },
      migrationProgress,
      recommendations,
    };
  }

  // Private helper methods

  private extractUUIDsFromQIF(qifDoc: any): Array<{ field: string; value: string }> {
    const uuids: Array<{ field: string; value: string }> = [];

    // Extract UUIDs from various QIF elements
    if (qifDoc.QIFDocument.MeasurementPlan?.id && isValidUUID(qifDoc.QIFDocument.MeasurementPlan.id)) {
      uuids.push({ field: 'MeasurementPlan.id', value: qifDoc.QIFDocument.MeasurementPlan.id });
    }

    if (qifDoc.QIFDocument.MeasurementResults?.id && isValidUUID(qifDoc.QIFDocument.MeasurementResults.id)) {
      uuids.push({ field: 'MeasurementResults.id', value: qifDoc.QIFDocument.MeasurementResults.id });
    }

    // Extract characteristic UUIDs
    if (qifDoc.QIFDocument.Product) {
      qifDoc.QIFDocument.Product.forEach((product: any, productIndex: number) => {
        if (product.Characteristics) {
          product.Characteristics.forEach((char: any, charIndex: number) => {
            if (char.id && isValidUUID(char.id)) {
              uuids.push({
                field: `Product[${productIndex}].Characteristics[${charIndex}].id`,
                value: char.id,
              });
            }
          });
        }
      });
    }

    return uuids;
  }

  private async validateQIFEntities(
    entities: Array<{ id: string; uuid?: string | null; legacyId?: string | null }>,
    entityType: 'plan' | 'characteristic' | 'result' | 'measurement'
  ): Promise<QIFEntityValidationResult[]> {
    return entities.map(entity => {
      const result: QIFEntityValidationResult = {
        entityType,
        entityId: entity.id,
        hasUuid: Boolean(entity.uuid),
        hasLegacyId: Boolean(entity.legacyId),
        uuidValid: false,
        nistCompliant: false,
        migrationStatus: 'NOT_STARTED',
        errors: [],
        warnings: [],
      };

      // Validate UUID if present
      if (entity.uuid) {
        const validation = validateQIFUUID(entity.uuid);
        result.uuidValid = validation.isValid;
        result.nistCompliant = validation.isNistCompliant;

        if (!validation.isValid) {
          result.errors.push(...validation.errors);
        }
        if (validation.warnings.length > 0) {
          result.warnings.push(...validation.warnings);
        }
      }

      // Determine migration status
      if (result.hasUuid && result.uuidValid) {
        result.migrationStatus = 'COMPLETE';
      } else if (result.hasUuid && !result.uuidValid) {
        result.migrationStatus = 'PARTIAL';
        result.errors.push('Invalid UUID format detected');
      } else if (result.hasLegacyId) {
        result.migrationStatus = 'NOT_STARTED';
        result.warnings.push('Entity uses legacy ID - consider migrating to UUID');
      } else {
        result.errors.push('Entity has neither UUID nor legacy ID');
      }

      return result;
    });
  }

  private generateRecommendations(result: QIFDocumentValidationResult): void {
    if (!result.hasUuids) {
      result.recommendations.push('Consider adding UUIDs to achieve NIST AMS 300-12 compliance');
    }

    if (result.hasUuids && !result.nistCompliant) {
      result.recommendations.push('Upgrade non-compliant UUIDs to version 4 for NIST compliance');
    }

    if (result.uuidErrors.length > 0) {
      result.recommendations.push('Fix invalid UUID formats before deployment');
    }
  }

  private generateSystemRecommendations(
    dataValidation: QIFDataValidationResult,
    uniquenessCheck: { isUnique: boolean; duplicateCount: number },
    migrationProgress: { migrationPercentage: number }
  ): string[] {
    const recommendations: string[] = [];

    if (migrationProgress.migrationPercentage < 100) {
      recommendations.push(`Complete UUID migration (${migrationProgress.migrationPercentage}% complete)`);
    }

    if (!uniquenessCheck.isUnique) {
      recommendations.push(`Resolve ${uniquenessCheck.duplicateCount} duplicate UUIDs`);
    }

    if (dataValidation.summary.entitiesWithErrors > 0) {
      recommendations.push(`Fix ${dataValidation.summary.entitiesWithErrors} entities with validation errors`);
    }

    if (dataValidation.summary.entitiesWithWarnings > 0) {
      recommendations.push(`Review ${dataValidation.summary.entitiesWithWarnings} entities with warnings`);
    }

    return recommendations;
  }
}

export default QIFValidationService;