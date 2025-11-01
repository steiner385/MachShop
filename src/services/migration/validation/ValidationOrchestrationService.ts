/**
 * Validation Orchestration Service
 * Phase 7: Orchestrates validation operations across services
 *
 * Coordinates:
 * - Validation rule execution
 * - Quality scoring calculation
 * - Error enrichment and reporting
 * - Result persistence and retrieval
 */

import {
  ValidationResult,
  ValidationRule,
  EntityType
} from './ValidationService';
import { ValidationService } from './ValidationService';
import { DataQualityScoringService, DatasetQualityScore, RecordQualityScore } from './DataQualityScoringService';
import { ErrorReportingService, EnrichedError, ErrorReport, BatchErrorReport } from './ErrorReportingService';
import { BusinessRulesEngine } from './BusinessRulesEngine';

// ============================================================================
// Orchestration Types
// ============================================================================

export interface ValidationOrchestrationRequest {
  entityType: EntityType;
  data: Record<string, any>;
  recordId?: string;
  includeQualityScore?: boolean;
  includeErrorReport?: boolean;
  context?: Record<string, any>;
}

export interface ValidationOrchestrationResponse {
  recordId: string;
  isValid: boolean;
  validationResult: ValidationResult;
  enrichedErrors: EnrichedError[];
  qualityScore?: RecordQualityScore;
  timestamp: Date;
}

export interface BatchValidationOrchestrationRequest {
  entityType: EntityType;
  records: Array<Record<string, any>>;
  batchId?: string;
  includeQualityScore?: boolean;
  includeErrorReport?: boolean;
  stopOnFirstError?: boolean;
}

export interface BatchValidationOrchestrationResponse {
  batchId: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  successRate: number;
  results: ValidationOrchestrationResponse[];
  qualityScore?: DatasetQualityScore;
  errorReport?: ErrorReport;
  batchErrorReport?: BatchErrorReport;
  timestamp: Date;
}

export interface ValidationSummary {
  entityType: EntityType;
  recordCount: number;
  validCount: number;
  errorCount: number;
  successRate: number;
  topErrors: Array<{
    field: string;
    errorType: string;
    count: number;
  }>;
}

// ============================================================================
// Validation Orchestration Service
// ============================================================================

export class ValidationOrchestrationService {
  private validationService: ValidationService;
  private qualityScoringService: DataQualityScoringService;
  private errorReportingService: ErrorReportingService;
  private businessRulesEngine: BusinessRulesEngine;

  constructor(
    validationService?: ValidationService,
    qualityScoringService?: DataQualityScoringService,
    errorReportingService?: ErrorReportingService,
    businessRulesEngine?: BusinessRulesEngine
  ) {
    this.validationService = validationService || new ValidationService();
    this.qualityScoringService = qualityScoringService || new DataQualityScoringService();
    this.errorReportingService = errorReportingService || new ErrorReportingService();
    this.businessRulesEngine = businessRulesEngine || new BusinessRulesEngine();
  }

  /**
   * Orchestrate single record validation
   */
  async validateRecord(
    request: ValidationOrchestrationRequest
  ): Promise<ValidationOrchestrationResponse> {
    const {
      entityType,
      data,
      recordId = `record-${Date.now()}`,
      includeQualityScore = true,
      context = {}
    } = request;

    // Step 1: Get validation rules
    const rules = this.validationService.getRules(entityType) || [];

    // Step 2: Validate the record
    const validationResult = this.validationService.validateRecord(data, rules, {
      recordId,
      ...context
    });

    // Step 3: Enrich errors with messages and suggestions
    const enrichedErrors = this.errorReportingService.enrichErrors(
      validationResult.errors,
      { recordId, ...context }
    );

    // Step 4: Calculate quality score if requested
    let qualityScore: RecordQualityScore | undefined;
    if (includeQualityScore) {
      qualityScore = this.qualityScoringService.calculateRecordScore(
        validationResult,
        entityType,
        Object.keys(data).length,
        recordId
      );
    }

    return {
      recordId,
      isValid: validationResult.isValid,
      validationResult,
      enrichedErrors,
      qualityScore,
      timestamp: new Date()
    };
  }

  /**
   * Orchestrate batch validation
   */
  async validateBatch(
    request: BatchValidationOrchestrationRequest
  ): Promise<BatchValidationOrchestrationResponse> {
    const {
      entityType,
      records,
      batchId = `batch-${Date.now()}`,
      includeQualityScore = true,
      includeErrorReport = true,
      stopOnFirstError = false
    } = request;

    // Step 1: Get validation rules
    const rules = this.validationService.getRules(entityType) || [];

    // Step 2: Validate all records
    const results = records.map((data, index) =>
      this.validationService.validateRecord(data, rules, {
        recordId: data.id || `${batchId}-record-${index}`,
        rowNumber: index + 1
      })
    );

    // Step 3: Enrich all errors
    const allEnrichedErrors = results.flatMap((result, index) =>
      this.errorReportingService.enrichErrors(result.errors, {
        recordId: records[index].id || `${batchId}-record-${index}`,
        rowNumber: index + 1,
        batchId
      })
    );

    // Step 4: Create individual response objects
    const individualResponses: ValidationOrchestrationResponse[] = records.map(
      (data, index) => ({
        recordId: data.id || `${batchId}-record-${index}`,
        isValid: results[index].isValid,
        validationResult: results[index],
        enrichedErrors: allEnrichedErrors.filter(
          e => e.context?.recordId === (data.id || `${batchId}-record-${index}`)
        ),
        timestamp: new Date()
      })
    );

    // Step 5: Calculate quality score if requested
    let qualityScore: DatasetQualityScore | undefined;
    if (includeQualityScore) {
      qualityScore = this.qualityScoringService.calculateDatasetScore(
        results,
        records.length,
        entityType,
        Object.keys(records[0] || {}).length
      );
    }

    // Step 6: Generate error report if requested
    let errorReport: ErrorReport | undefined;
    if (includeErrorReport && allEnrichedErrors.length > 0) {
      const successRate = (results.filter(r => r.isValid).length / results.length) * 100;
      errorReport = this.errorReportingService.generateErrorReport(
        allEnrichedErrors,
        successRate
      );
    }

    // Step 7: Generate batch error report
    const batchErrorReport = this.errorReportingService.generateBatchErrorReport(
      batchId,
      records.length,
      allEnrichedErrors,
      'json'
    );

    const validCount = results.filter(r => r.isValid).length;
    const invalidCount = records.length - validCount;

    return {
      batchId,
      totalRecords: records.length,
      validRecords: validCount,
      invalidRecords: invalidCount,
      successRate: (validCount / records.length) * 100,
      results: individualResponses,
      qualityScore,
      errorReport,
      batchErrorReport,
      timestamp: new Date()
    };
  }

  /**
   * Orchestrate dataset validation with comprehensive reporting
   */
  async validateDataset(
    request: BatchValidationOrchestrationRequest
  ): Promise<BatchValidationOrchestrationResponse> {
    // Use batch validation for dataset
    return this.validateBatch(request);
  }

  /**
   * Get validation summary
   */
  generateValidationSummary(
    request: BatchValidationOrchestrationRequest,
    response: BatchValidationOrchestrationResponse
  ): ValidationSummary {
    // Aggregate error information
    const errorCounts = new Map<string, number>();
    const fieldErrorCounts = new Map<string, number>();

    response.batchErrorReport?.detailedErrors.forEach(error => {
      const key = `${error.field}:${error.errorType}`;
      errorCounts.set(key, (errorCounts.get(key) || 0) + 1);

      const fieldKey = error.field;
      fieldErrorCounts.set(fieldKey, (fieldErrorCounts.get(fieldKey) || 0) + 1);
    });

    // Sort errors by frequency
    const topErrors = Array.from(errorCounts.entries())
      .map(([key, count]) => {
        const [field, errorType] = key.split(':');
        return { field, errorType, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      entityType: request.entityType,
      recordCount: response.totalRecords,
      validCount: response.validRecords,
      errorCount: response.batchErrorReport?.detailedErrors.length || 0,
      successRate: response.successRate,
      topErrors
    };
  }

  /**
   * Get validation rules for entity type
   */
  getValidationRules(entityType: EntityType): ValidationRule[] {
    return this.validationService.getRules(entityType) || [];
  }

  /**
   * Register custom validation rule
   */
  registerValidationRule(rule: ValidationRule): void {
    this.validationService.addRule(rule);
  }

  /**
   * Register multiple validation rules
   */
  registerValidationRules(rules: ValidationRule[]): void {
    rules.forEach(rule => this.validationService.addRule(rule));
  }

  /**
   * Get business rules engine instance
   */
  getBusinessRulesEngine(): BusinessRulesEngine {
    return this.businessRulesEngine;
  }

  /**
   * Get validation service instance
   */
  getValidationService(): ValidationService {
    return this.validationService;
  }

  /**
   * Get quality scoring service instance
   */
  getQualityScoringService(): DataQualityScoringService {
    return this.qualityScoringService;
  }

  /**
   * Get error reporting service instance
   */
  getErrorReportingService(): ErrorReportingService {
    return this.errorReportingService;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const validationOrchestrationService = new ValidationOrchestrationService();
