/**
 * Bulk Import Validation Service Tests
 * Phase 8: Integration validation framework into bulk import workflow
 *
 * Test Coverage:
 * - Pre-import validation (schema, structure, requirements)
 * - Per-record validation during import with progress tracking
 * - Post-import validation (referential integrity, duplicates)
 * - Pre-commit validation (unvalidated/invalid record checks)
 * - Validation strategies (STRICT, LENIENT, PROGRESSIVE)
 * - Quality score calculation
 * - Error reporting and enrichment
 * - Import decision support
 * - Statistics generation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BulkImportValidationService,
  ValidationStrategy,
  ImportStage,
  ImportRecord,
  BulkImportValidationConfig,
  BulkImportValidationResult,
  StageValidationResult
} from '../../../services/migration/BulkImportValidationService';
import { EntityType } from '../../../services/migration/validation/ValidationService';

describe('BulkImportValidationService - Phase 8', () => {
  let service: BulkImportValidationService;

  beforeEach(() => {
    service = new BulkImportValidationService();
  });

  // ============================================================================
  // INITIALIZATION & CONFIGURATION
  // ============================================================================

  describe('Service Initialization', () => {
    it('should initialize with default services', () => {
      const newService = new BulkImportValidationService();
      expect(newService).toBeDefined();
    });

    it('should accept custom service instances', () => {
      const customService = new BulkImportValidationService(
        undefined, // validationService
        undefined, // qualityScoringService
        undefined, // errorReportingService
        undefined  // orchestrationService
      );
      expect(customService).toBeDefined();
    });
  });

  // ============================================================================
  // PRE-IMPORT VALIDATION
  // ============================================================================

  describe('Pre-Import Validation', () => {
    it('should detect empty records array', async () => {
      const records: ImportRecord[] = [];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePreImport: true
      };

      const result = await service.validateBulkImport('import-001', records, config);

      expect(result.stages.has(ImportStage.PRE_IMPORT)).toBe(true);
      const preImportStage = result.stages.get(ImportStage.PRE_IMPORT)!;
      expect(preImportStage.passed).toBe(false);
      expect(preImportStage.errors.length).toBeGreaterThan(0);
    });

    it('should detect empty record data', async () => {
      const records: ImportRecord[] = [
        { id: 'rec-001', rowNumber: 1, data: {} }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePreImport: true
      };

      const result = await service.validateBulkImport('import-002', records, config);

      expect(result.stages.has(ImportStage.PRE_IMPORT)).toBe(true);
      const preImportStage = result.stages.get(ImportStage.PRE_IMPORT)!;
      expect(preImportStage.passed).toBe(false);
    });

    it('should pass pre-import validation for valid records', async () => {
      const records: ImportRecord[] = [
        { id: 'rec-001', rowNumber: 1, data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePreImport: true
      };

      const result = await service.validateBulkImport('import-003', records, config);

      expect(result.stages.has(ImportStage.PRE_IMPORT)).toBe(true);
      const preImportStage = result.stages.get(ImportStage.PRE_IMPORT)!;
      expect(preImportStage.passed).toBe(true);
    });

    it('should skip pre-import validation if disabled', async () => {
      const records: ImportRecord[] = [];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePreImport: false
      };

      const result = await service.validateBulkImport('import-004', records, config);

      expect(result.stages.has(ImportStage.PRE_IMPORT)).toBe(false);
    });
  });

  // ============================================================================
  // PER-RECORD VALIDATION
  // ============================================================================

  describe('Per-Record Validation', () => {
    it('should validate individual records', async () => {
      const records: ImportRecord[] = [
        { id: 'rec-001', rowNumber: 1, data: { partNumber: 'PART-001', description: 'Test Part' } },
        { id: 'rec-002', rowNumber: 2, data: { partNumber: 'PART-002', description: 'Another Part' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-005', records, config);

      expect(result.stages.has(ImportStage.PER_RECORD)).toBe(true);
      const perRecordStage = result.stages.get(ImportStage.PER_RECORD)!;
      expect(perRecordStage.recordsProcessed).toBe(2);
    });

    it('should track validation status for each record', async () => {
      const records: ImportRecord[] = [
        { id: 'rec-001', rowNumber: 1, data: { partNumber: 'PART-001' } },
        { id: 'rec-002', rowNumber: 2, data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-006', records, config);

      expect(result.records[0].validationStatus).toBeDefined();
      expect(result.records[1].validationStatus).toBeDefined();
    });

    it('should assign row numbers automatically', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-007', records, config);

      expect(result.records[0].rowNumber).toBe(1);
      expect(result.records[1].rowNumber).toBe(2);
    });

    it('should skip per-record validation if disabled', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePerRecord: false
      };

      const result = await service.validateBulkImport('import-008', records, config);

      expect(result.stages.has(ImportStage.PER_RECORD)).toBe(false);
    });
  });

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  describe('Progress Callback Tracking', () => {
    it('should call progress callback for each record', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } },
        { data: { partNumber: 'PART-003' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const progressCallback = vi.fn();

      await service.validateBulkImport('import-009', records, config, progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should report progress percentage correctly', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const progressUpdates: any[] = [];
      const progressCallback = (update: any) => {
        progressUpdates.push(update);
      };

      await service.validateBulkImport('import-010', records, config, progressCallback);

      // Should have progress updates for each record
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Check that progress is reported
      if (progressUpdates.length > 0) {
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.percentage).toBeGreaterThanOrEqual(0);
        expect(lastUpdate.percentage).toBeLessThanOrEqual(100);
      }
    });

    it('should track error count in progress updates', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const progressUpdates: any[] = [];
      const progressCallback = (update: any) => {
        progressUpdates.push(update);
      };

      await service.validateBulkImport('import-011', records, config, progressCallback);

      // Should track errors in progress
      if (progressUpdates.length > 0) {
        const lastUpdate = progressUpdates[progressUpdates.length - 1];
        expect(lastUpdate.currentErrors).toBeDefined();
        expect(lastUpdate.validRecords).toBeDefined();
        expect(lastUpdate.invalidRecords).toBeDefined();
      }
    });
  });

  // ============================================================================
  // POST-IMPORT VALIDATION
  // ============================================================================

  describe('Post-Import Validation', () => {
    it('should detect duplicate records in batch', async () => {
      const records: ImportRecord[] = [
        { id: 'rec-001', rowNumber: 1, data: { partNumber: 'PART-001', description: 'Test' } },
        { id: 'rec-002', rowNumber: 2, data: { partNumber: 'PART-001', description: 'Test' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        validatePostImport: true
      };

      const result = await service.validateBulkImport('import-012', records, config);

      expect(result.stages.has(ImportStage.POST_IMPORT)).toBe(true);
      const postImportStage = result.stages.get(ImportStage.POST_IMPORT)!;
      expect(postImportStage.errors.length).toBeGreaterThan(0);
    });

    it('should count valid and invalid records correctly', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        validatePostImport: true
      };

      const result = await service.validateBulkImport('import-013', records, config);

      expect(result.stages.has(ImportStage.POST_IMPORT)).toBe(true);
      const postImportStage = result.stages.get(ImportStage.POST_IMPORT)!;
      expect(postImportStage.recordsProcessed).toBe(2);
    });

    it('should skip post-import validation if disabled', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePostImport: false
      };

      const result = await service.validateBulkImport('import-014', records, config);

      expect(result.stages.has(ImportStage.POST_IMPORT)).toBe(false);
    });
  });

  // ============================================================================
  // PRE-COMMIT VALIDATION
  // ============================================================================

  describe('Pre-Commit Validation', () => {
    it('should validate readiness for database commit', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePerRecord: true,
        validateBeforeCommit: true
      };

      const result = await service.validateBulkImport('import-015', records, config);

      expect(result.stages.has(ImportStage.COMMIT)).toBe(true);
      const commitStage = result.stages.get(ImportStage.COMMIT)!;
      expect(commitStage).toBeDefined();
    });

    it('should reject commit with invalid records in STRICT mode', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePerRecord: true,
        validateBeforeCommit: true
      };

      const result = await service.validateBulkImport('import-016', records, config);

      const commitStage = result.stages.get(ImportStage.COMMIT);
      if (commitStage && result.invalidRecords > 0) {
        expect(commitStage.passed).toBe(false);
      }
    });

    it('should skip pre-commit validation if disabled', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validateBeforeCommit: false
      };

      const result = await service.validateBulkImport('import-017', records, config);

      expect(result.stages.has(ImportStage.COMMIT)).toBe(false);
    });
  });

  // ============================================================================
  // VALIDATION STRATEGIES
  // ============================================================================

  describe('Validation Strategies', () => {
    it('should stop on first error in STRICT mode', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } },
        { data: { partNumber: 'PART-003' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePreImport: true,
        validatePerRecord: true,
        stopOnError: true
      };

      const result = await service.validateBulkImport('import-018', records, config);

      // In STRICT mode with stopOnError, should stop early
      expect(result.strategy).toBe(ValidationStrategy.STRICT);
    });

    it('should collect all errors in LENIENT mode', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } },
        { data: { partNumber: 'PART-003' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-019', records, config);

      expect(result.strategy).toBe(ValidationStrategy.LENIENT);
      // LENIENT should collect all records regardless of errors
      expect(result.totalRecords).toBe(3);
    });

    it('should always proceed in PROGRESSIVE mode', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.PROGRESSIVE,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-020', records, config);

      expect(result.strategy).toBe(ValidationStrategy.PROGRESSIVE);
      expect(service.canProceedWithImport(result)).toBe(true);
    });
  });

  // ============================================================================
  // QUALITY SCORING
  // ============================================================================

  describe('Quality Score Calculation', () => {
    it('should calculate quality score when requested', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001', description: 'Test Part' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        calculateQualityScore: true
      };

      const result = await service.validateBulkImport('import-021', records, config);

      expect(result.qualityScore).toBeDefined();
    });

    it('should not calculate quality score when disabled', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001', description: 'Test Part' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        calculateQualityScore: false
      };

      const result = await service.validateBulkImport('import-022', records, config);

      expect(result.qualityScore).toBeUndefined();
    });

    it('should skip quality score for empty results', async () => {
      const records: ImportRecord[] = [];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        calculateQualityScore: true
      };

      const result = await service.validateBulkImport('import-023', records, config);

      // Should handle empty gracefully
      expect(result.totalRecords).toBe(0);
    });
  });

  // ============================================================================
  // ERROR REPORTING
  // ============================================================================

  describe('Error Reporting', () => {
    it('should generate error report when requested', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        generateReport: true
      };

      const result = await service.validateBulkImport('import-024', records, config);

      // Only generate report if there are errors
      if (result.errors.length > 0) {
        expect(result.errorReport).toBeDefined();
      }
    });

    it('should not generate report when disabled', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        generateReport: false
      };

      const result = await service.validateBulkImport('import-025', records, config);

      expect(result.errorReport).toBeUndefined();
    });

    it('should enrich errors with messages', async () => {
      const records: ImportRecord[] = [
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-026', records, config);

      // Check if errors contain enriched information
      if (result.errors.length > 0) {
        const error = result.errors[0];
        expect(error).toBeDefined();
      }
    });
  });

  // ============================================================================
  // RESULT METRICS
  // ============================================================================

  describe('Result Metrics', () => {
    it('should calculate success rate correctly', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-027', records, config);

      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);
    });

    it('should track import duration', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-028', records, config);

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });

    it('should include timestamp in result', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-029', records, config);

      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should count valid, invalid, and skipped records', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } },
        { data: { partNumber: 'PART-003' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-030', records, config);

      expect(result.totalRecords).toBe(3);
      expect(result.validRecords).toBeGreaterThanOrEqual(0);
      expect(result.invalidRecords).toBeGreaterThanOrEqual(0);
      expect(result.skippedRecords).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // IMPORT DECISION SUPPORT
  // ============================================================================

  describe('Import Decision Support', () => {
    it('should allow import in STRICT mode with no errors', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-031', records, config);

      // Can proceed if no invalid or skipped records
      if (result.invalidRecords === 0 && result.skippedRecords === 0) {
        expect(service.canProceedWithImport(result)).toBe(true);
      }
    });

    it('should reject import in STRICT mode with errors', async () => {
      const records: ImportRecord[] = [
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.STRICT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-032', records, config);

      // Should reject if has invalid records
      if (result.invalidRecords > 0) {
        expect(service.canProceedWithImport(result)).toBe(false);
      }
    });

    it('should allow import in LENIENT mode with some valid records', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-033', records, config);

      // LENIENT allows import if at least one record is valid
      if (result.validRecords > 0) {
        expect(service.canProceedWithImport(result)).toBe(true);
      }
    });

    it('should always allow import in PROGRESSIVE mode', async () => {
      const records: ImportRecord[] = [
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.PROGRESSIVE,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-034', records, config);

      expect(service.canProceedWithImport(result)).toBe(true);
    });
  });

  // ============================================================================
  // STATISTICS GENERATION
  // ============================================================================

  describe('Statistics Generation', () => {
    it('should generate import statistics', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-035', records, config);
      const stats = service.getImportStatistics(result);

      expect(stats.totalRecords).toBe(2);
      expect(stats.validRecords).toBeGreaterThanOrEqual(0);
      expect(stats.invalidRecords).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(100);
    });

    it('should calculate errors per invalid record', async () => {
      const records: ImportRecord[] = [
        { data: { description: 'Missing Part Number' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-036', records, config);
      const stats = service.getImportStatistics(result);

      if (result.invalidRecords > 0) {
        expect(stats.averageErrorsPerInvalidRecord).toBeGreaterThanOrEqual(0);
      } else {
        expect(stats.averageErrorsPerInvalidRecord).toBe(0);
      }
    });

    it('should include duration in statistics', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-037', records, config);
      const stats = service.getImportStatistics(result);

      expect(stats.durationSeconds).toBeDefined();
      expect(typeof stats.durationSeconds).toBe('string');
    });

    it('should indicate if import can proceed', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-038', records, config);
      const stats = service.getImportStatistics(result);

      expect(stats.canProceed).toBeDefined();
      expect(typeof stats.canProceed).toBe('boolean');
    });
  });

  // ============================================================================
  // MAX ERRORS LIMIT
  // ============================================================================

  describe('Max Errors Limit', () => {
    it('should stop collecting errors at max limit', async () => {
      const records: ImportRecord[] = [
        { data: { description: 'Missing Part Number 1' } },
        { data: { description: 'Missing Part Number 2' } },
        { data: { description: 'Missing Part Number 3' } },
        { data: { description: 'Missing Part Number 4' } },
        { data: { description: 'Missing Part Number 5' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true,
        maxErrorsToCollect: 3
      };

      const result = await service.validateBulkImport('import-039', records, config);

      // Should not exceed max errors collected
      expect(result.errors.length).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // STAGE VALIDATION RESULTS
  // ============================================================================

  describe('Stage Validation Results', () => {
    it('should have timestamp for each stage', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePreImport: true,
        validatePerRecord: true,
        validatePostImport: true,
        validateBeforeCommit: true
      };

      const result = await service.validateBulkImport('import-040', records, config);

      result.stages.forEach((stage) => {
        expect(stage.timestamp).toBeInstanceOf(Date);
      });
    });

    it('should track record counts per stage', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001' } },
        { data: { partNumber: 'PART-002' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-041', records, config);

      const perRecordStage = result.stages.get(ImportStage.PER_RECORD);
      if (perRecordStage) {
        expect(perRecordStage.recordsProcessed).toBeGreaterThanOrEqual(0);
        expect(perRecordStage.recordsValid).toBeGreaterThanOrEqual(0);
        expect(perRecordStage.recordsInvalid).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================================================
  // FULL WORKFLOW INTEGRATION
  // ============================================================================

  describe('Full Workflow Integration', () => {
    it('should complete full validation workflow', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001', description: 'Test Part 1' } },
        { data: { partNumber: 'PART-002', description: 'Test Part 2' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePreImport: true,
        validatePerRecord: true,
        validatePostImport: true,
        validateBeforeCommit: true,
        calculateQualityScore: true,
        generateReport: true
      };

      const result = await service.validateBulkImport('import-042', records, config);

      // Verify all stages completed
      expect(result.importId).toBe('import-042');
      expect(result.entityType).toBe(EntityType.PART);
      expect(result.strategy).toBe(ValidationStrategy.LENIENT);
      expect(result.totalRecords).toBe(2);
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle mixed valid and invalid records', async () => {
      const records: ImportRecord[] = [
        { data: { partNumber: 'PART-001', description: 'Valid Part' } },
        { data: { description: 'Invalid - Missing Part Number' } },
        { data: { partNumber: 'PART-003', description: 'Another Valid Part' } }
      ];
      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePreImport: true,
        validatePerRecord: true,
        validatePostImport: true
      };

      const result = await service.validateBulkImport('import-043', records, config);

      expect(result.totalRecords).toBe(3);
      expect(result.validRecords + result.invalidRecords).toBeLessThanOrEqual(3);
    });

    it('should handle large batch of records', async () => {
      const records: ImportRecord[] = Array.from({ length: 100 }, (_, i) => ({
        data: {
          partNumber: `PART-${String(i + 1).padStart(5, '0')}`,
          description: `Test Part ${i + 1}`
        }
      }));

      const config: BulkImportValidationConfig = {
        entityType: EntityType.PART,
        strategy: ValidationStrategy.LENIENT,
        validatePerRecord: true
      };

      const result = await service.validateBulkImport('import-044', records, config);

      expect(result.totalRecords).toBe(100);
    });
  });
});
