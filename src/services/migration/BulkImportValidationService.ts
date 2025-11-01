/**
 * Bulk Import Validation Service
 * Phase 8: Integrates validation framework into bulk import workflow
 *
 * Features:
 * - Pre-import validation (schema, structure, requirements)
 * - Per-record validation during import
 * - Post-import validation (referential integrity, duplicates)
 * - Progress tracking and reporting
 * - Error recovery and rollback support
 * - Multiple validation strategies
 */

import {
  ValidationService,
  EntityType,
  ValidationType,
  ValidationResult
} from './validation/ValidationService';
import { DataQualityScoringService, DatasetQualityScore } from './validation/DataQualityScoringService';
import { ErrorReportingService, EnrichedError, BatchErrorReport } from './validation/ErrorReportingService';
import { ValidationOrchestrationService } from './validation/ValidationOrchestrationService';

// ============================================================================
// Import Validation Types
// ============================================================================

export enum ValidationStrategy {
  STRICT = 'strict',           // Stop on first error
  LENIENT = 'lenient',         // Continue on errors, collect all
  PROGRESSIVE = 'progressive'  // Validate incrementally, report progress
}

export enum ImportStage {
  PRE_IMPORT = 'pre_import',      // Before processing starts
  PER_RECORD = 'per_record',      // During record processing
  POST_IMPORT = 'post_import',    // After all records processed
  COMMIT = 'commit'               // Before database commit
}

export interface BulkImportValidationConfig {
  entityType: EntityType;
  strategy: ValidationStrategy;
  validatePreImport?: boolean;
  validatePerRecord?: boolean;
  validatePostImport?: boolean;
  validateBeforeCommit?: boolean;
  stopOnError?: boolean;
  calculateQualityScore?: boolean;
  generateReport?: boolean;
  maxErrorsToCollect?: number;
}

export interface ImportRecord {
  id?: string;
  rowNumber?: number;
  data: Record<string, any>;
  validationStatus?: 'pending' | 'valid' | 'invalid';
  validationResult?: ValidationResult;
  enrichedErrors?: EnrichedError[];
  qualityScore?: number;
}

export interface BulkImportValidationResult {
  importId: string;
  entityType: EntityType;
  strategy: ValidationStrategy;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  skippedRecords: number;
  successRate: number;
  stages: Map<ImportStage, StageValidationResult>;
  records: ImportRecord[];
  errors: EnrichedError[];
  qualityScore?: DatasetQualityScore;
  errorReport?: BatchErrorReport;
  timestamp: Date;
  duration: number; // milliseconds
}

export interface StageValidationResult {
  stage: ImportStage;
  passed: boolean;
  recordsProcessed: number;
  recordsValid: number;
  recordsInvalid: number;
  errorCount: number;
  errors: EnrichedError[];
  timestamp: Date;
}

export interface ImportProgressUpdate {
  stage: ImportStage;
  recordsProcessed: number;
  totalRecords: number;
  percentage: number;
  currentErrors: number;
  validRecords: number;
  invalidRecords: number;
}

export type ProgressCallback = (update: ImportProgressUpdate) => void;

// ============================================================================
// Bulk Import Validation Service
// ============================================================================

export class BulkImportValidationService {
  private validationService: ValidationService;
  private qualityScoringService: DataQualityScoringService;
  private errorReportingService: ErrorReportingService;
  private orchestrationService: ValidationOrchestrationService;

  constructor(
    validationService?: ValidationService,
    qualityScoringService?: DataQualityScoringService,
    errorReportingService?: ErrorReportingService,
    orchestrationService?: ValidationOrchestrationService
  ) {
    this.validationService = validationService || new ValidationService();
    this.qualityScoringService = qualityScoringService || new DataQualityScoringService();
    this.errorReportingService = errorReportingService || new ErrorReportingService();
    this.orchestrationService = orchestrationService || new ValidationOrchestrationService(
      this.validationService,
      this.qualityScoringService,
      this.errorReportingService
    );
  }

  /**
   * Validate bulk import with full workflow
   */
  async validateBulkImport(
    importId: string,
    records: ImportRecord[],
    config: BulkImportValidationConfig,
    progressCallback?: ProgressCallback
  ): Promise<BulkImportValidationResult> {
    const startTime = Date.now();
    const stages = new Map<ImportStage, StageValidationResult>();
    let allErrors: EnrichedError[] = [];

    // Step 1: Pre-import validation
    if (config.validatePreImport) {
      const preImportResult = this.validatePreImport(records, config);
      stages.set(ImportStage.PRE_IMPORT, preImportResult);
      allErrors = allErrors.concat(preImportResult.errors);

      if (config.strategy === ValidationStrategy.STRICT && !preImportResult.passed) {
        return this.createValidationResult(
          importId,
          records,
          config,
          stages,
          allErrors,
          startTime
        );
      }
    }

    // Step 2: Per-record validation
    if (config.validatePerRecord) {
      const perRecordResult = await this.validatePerRecord(
        records,
        config,
        progressCallback
      );
      stages.set(ImportStage.PER_RECORD, perRecordResult);
      allErrors = allErrors.concat(perRecordResult.errors);

      if (config.strategy === ValidationStrategy.STRICT && !perRecordResult.passed) {
        return this.createValidationResult(
          importId,
          records,
          config,
          stages,
          allErrors,
          startTime
        );
      }
    }

    // Step 3: Post-import validation
    if (config.validatePostImport) {
      const postImportResult = this.validatePostImport(records, config);
      stages.set(ImportStage.POST_IMPORT, postImportResult);
      allErrors = allErrors.concat(postImportResult.errors);

      if (config.strategy === ValidationStrategy.STRICT && !postImportResult.passed) {
        return this.createValidationResult(
          importId,
          records,
          config,
          stages,
          allErrors,
          startTime
        );
      }
    }

    // Step 4: Pre-commit validation
    if (config.validateBeforeCommit) {
      const commitResult = this.validateBeforeCommit(records, config);
      stages.set(ImportStage.COMMIT, commitResult);
      allErrors = allErrors.concat(commitResult.errors);
    }

    // Create final result
    const result = this.createValidationResult(
      importId,
      records,
      config,
      stages,
      allErrors,
      startTime
    );

    // Calculate quality score if requested
    if (config.calculateQualityScore) {
      const validationResults = records
        .map(r => r.validationResult)
        .filter(r => r !== undefined) as ValidationResult[];

      if (validationResults.length > 0) {
        result.qualityScore = this.qualityScoringService.calculateDatasetScore(
          validationResults,
          records.length,
          config.entityType,
          Object.keys(records[0]?.data || {}).length
        );
      }
    }

    // Generate report if requested
    if (config.generateReport && allErrors.length > 0) {
      const successRate = (result.validRecords / result.totalRecords) * 100;
      result.errorReport = this.errorReportingService.generateBatchErrorReport(
        importId,
        result.totalRecords,
        allErrors,
        'json'
      );
    }

    return result;
  }

  /**
   * Validate import structure and requirements
   */
  private validatePreImport(records: ImportRecord[], config: BulkImportValidationConfig): StageValidationResult {
    const errors: EnrichedError[] = [];
    const timestamp = new Date();

    // Check if records array is not empty
    if (!records || records.length === 0) {
      errors.push({
        field: 'records',
        errorType: ValidationType.REQUIRED_FIELD,
        severity: 'ERROR' as any,
        message: 'No records provided for import',
        message: {
          code: 'IMP001',
          title: 'No Records',
          description: 'Import requires at least one record',
          severity: 'ERROR' as any,
          category: 'missing_data' as any
        }
      } as any);
    }

    // Check if all records have data
    const emptyRecords = records.filter((r, i) => !r.data || Object.keys(r.data).length === 0);
    if (emptyRecords.length > 0) {
      errors.push(...emptyRecords.map((r, i) => ({
        field: 'data',
        errorType: ValidationType.REQUIRED_FIELD,
        severity: 'ERROR' as any,
        message: `Record ${r.rowNumber || i} has no data`,
        message: {
          code: 'IMP002',
          title: 'Empty Record',
          description: `Record at row ${r.rowNumber || i} contains no data`,
          severity: 'ERROR' as any,
          category: 'missing_data' as any
        }
      } as any)));
    }

    return {
      stage: ImportStage.PRE_IMPORT,
      passed: errors.length === 0,
      recordsProcessed: records.length,
      recordsValid: records.length - emptyRecords.length,
      recordsInvalid: emptyRecords.length,
      errorCount: errors.length,
      errors,
      timestamp
    };
  }

  /**
   * Validate individual records during import
   */
  private async validatePerRecord(
    records: ImportRecord[],
    config: BulkImportValidationConfig,
    progressCallback?: ProgressCallback
  ): Promise<StageValidationResult> {
    const errors: EnrichedError[] = [];
    const rules = this.validationService.getRules(config.entityType) || [];
    let validCount = 0;
    let invalidCount = 0;
    const timestamp = new Date();

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      record.rowNumber = record.rowNumber || i + 1;
      record.id = record.id || `${config.entityType}-record-${i}`;

      // Validate the record
      const validationResult = this.validationService.validateRecord(record.data, rules, {
        recordId: record.id,
        rowNumber: record.rowNumber
      });

      record.validationResult = validationResult;
      record.validationStatus = validationResult.isValid ? 'valid' : 'invalid';

      // Enrich errors
      if (!validationResult.isValid) {
        const enrichedErrors = this.errorReportingService.enrichErrors(
          validationResult.errors || [],
          { recordId: record.id, rowNumber: record.rowNumber }
        );
        record.enrichedErrors = enrichedErrors;
        errors.push(...enrichedErrors);
        invalidCount++;
      } else {
        validCount++;
      }

      // Report progress
      if (progressCallback) {
        progressCallback({
          stage: ImportStage.PER_RECORD,
          recordsProcessed: i + 1,
          totalRecords: records.length,
          percentage: ((i + 1) / records.length) * 100,
          currentErrors: errors.length,
          validRecords: validCount,
          invalidRecords: invalidCount
        });
      }

      // Check stop-on-error condition
      if (config.stopOnError && !validationResult.isValid && config.strategy === ValidationStrategy.STRICT) {
        break;
      }

      // Check max errors limit
      if (config.maxErrorsToCollect && errors.length >= config.maxErrorsToCollect) {
        break;
      }
    }

    return {
      stage: ImportStage.PER_RECORD,
      passed: errors.length === 0,
      recordsProcessed: records.length,
      recordsValid: validCount,
      recordsInvalid: invalidCount,
      errorCount: errors.length,
      errors,
      timestamp
    };
  }

  /**
   * Validate cross-record and referential constraints
   */
  private validatePostImport(records: ImportRecord[], config: BulkImportValidationConfig): StageValidationResult {
    const errors: EnrichedError[] = [];
    const timestamp = new Date();

    // Check for duplicates within batch
    const uniqueFields = new Set<string>();
    for (const record of records) {
      if (!record.data) continue;

      // Check for duplicate IDs
      const recordKey = JSON.stringify(record.data);
      if (uniqueFields.has(recordKey)) {
        errors.push({
          field: 'data',
          errorType: ValidationType.UNIQUE,
          severity: 'ERROR' as any,
          message: `Duplicate record in batch`,
          message: {
            code: 'IMP003',
            title: 'Duplicate Record',
            description: 'This record is a duplicate of another record in the batch',
            severity: 'ERROR' as any,
            category: 'uniqueness_violation' as any
          },
          context: { recordId: record.id, rowNumber: record.rowNumber }
        } as any);
      }
      uniqueFields.add(recordKey);
    }

    // Count valid vs invalid records
    const validRecords = records.filter(r => r.validationStatus === 'valid').length;
    const invalidRecords = records.filter(r => r.validationStatus === 'invalid').length;

    return {
      stage: ImportStage.POST_IMPORT,
      passed: errors.length === 0,
      recordsProcessed: records.length,
      recordsValid: validRecords,
      recordsInvalid: invalidRecords,
      errorCount: errors.length,
      errors,
      timestamp
    };
  }

  /**
   * Validate readiness for database commit
   */
  private validateBeforeCommit(records: ImportRecord[], config: BulkImportValidationConfig): StageValidationResult {
    const errors: EnrichedError[] = [];
    const timestamp = new Date();

    // Check that all records have been validated
    const unvalidatedRecords = records.filter(r => r.validationStatus === 'pending');
    if (unvalidatedRecords.length > 0) {
      errors.push({
        field: 'records',
        errorType: ValidationType.CUSTOM,
        severity: 'ERROR' as any,
        message: `${unvalidatedRecords.length} records have not been validated`,
        message: {
          code: 'IMP004',
          title: 'Unvalidated Records',
          description: `Cannot commit with ${unvalidatedRecords.length} unvalidated records`,
          severity: 'ERROR' as any,
          category: 'configuration_error' as any
        }
      } as any);
    }

    // Check that validation passed for all records (in strict mode)
    const invalidRecords = records.filter(r => r.validationStatus === 'invalid');
    if (config.strategy === ValidationStrategy.STRICT && invalidRecords.length > 0) {
      errors.push({
        field: 'records',
        errorType: ValidationType.BUSINESS_RULE,
        severity: 'ERROR' as any,
        message: `Cannot commit with ${invalidRecords.length} invalid records in STRICT mode`,
        message: {
          code: 'IMP005',
          title: 'Invalid Records',
          description: 'Cannot commit import with invalid records in STRICT validation mode',
          severity: 'ERROR' as any,
          category: 'business_rule_violation' as any
        }
      } as any);
    }

    const validRecords = records.filter(r => r.validationStatus === 'valid').length;

    return {
      stage: ImportStage.COMMIT,
      passed: errors.length === 0,
      recordsProcessed: records.length,
      recordsValid: validRecords,
      recordsInvalid: invalidRecords.length,
      errorCount: errors.length,
      errors,
      timestamp
    };
  }

  /**
   * Create validation result object
   */
  private createValidationResult(
    importId: string,
    records: ImportRecord[],
    config: BulkImportValidationConfig,
    stages: Map<ImportStage, StageValidationResult>,
    errors: EnrichedError[],
    startTime: number
  ): BulkImportValidationResult {
    const validRecords = records.filter(r => r.validationStatus === 'valid').length;
    const invalidRecords = records.filter(r => r.validationStatus === 'invalid').length;
    const skippedRecords = records.filter(r => r.validationStatus === 'pending').length;

    return {
      importId,
      entityType: config.entityType,
      strategy: config.strategy,
      totalRecords: records.length,
      validRecords,
      invalidRecords,
      skippedRecords,
      successRate: records.length > 0 ? (validRecords / records.length) * 100 : 100,
      stages,
      records,
      errors,
      timestamp: new Date(),
      duration: Date.now() - startTime
    };
  }

  /**
   * Determine if import should proceed
   */
  canProceedWithImport(result: BulkImportValidationResult): boolean {
    if (result.strategy === ValidationStrategy.STRICT) {
      return result.invalidRecords === 0 && result.skippedRecords === 0;
    }

    if (result.strategy === ValidationStrategy.LENIENT) {
      return result.validRecords > 0;
    }

    if (result.strategy === ValidationStrategy.PROGRESSIVE) {
      return true; // Always proceed, even with errors
    }

    return false;
  }

  /**
   * Get import statistics
   */
  getImportStatistics(result: BulkImportValidationResult) {
    return {
      totalRecords: result.totalRecords,
      validRecords: result.validRecords,
      invalidRecords: result.invalidRecords,
      skippedRecords: result.skippedRecords,
      successRate: result.successRate,
      errorCount: result.errors.length,
      averageErrorsPerInvalidRecord: result.invalidRecords > 0
        ? result.errors.length / result.invalidRecords
        : 0,
      durationSeconds: (result.duration / 1000).toFixed(2),
      canProceed: this.canProceedWithImport(result)
    };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const bulkImportValidationService = new BulkImportValidationService();
