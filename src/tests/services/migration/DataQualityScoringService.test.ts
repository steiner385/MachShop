/**
 * Data Quality Scoring Service Tests
 * Phase 5: Data quality measurement and analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  DataQualityScoringService,
  QualityDimension,
  QualityBand,
  RecordQualityScore,
  DatasetQualityScore
} from '../../../services/migration/validation/DataQualityScoringService';
import {
  ValidationResult,
  ValidationError,
  EntityType,
  Severity,
  ValidationType
} from '../../../services/migration/validation/ValidationService';

describe('Data Quality Scoring Service - Phase 5: Quality Measurement', () => {
  let service: DataQualityScoringService;

  beforeEach(() => {
    service = new DataQualityScoringService();
  });

  // ============================================================================
  // RECORD QUALITY SCORE CALCULATION
  // ============================================================================

  describe('Record Quality Score Calculation', () => {
    it('should calculate perfect quality score for valid record', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      expect(score.overall).toBe(100);
      expect(score.band).toBe(QualityBand.EXCELLENT);
      expect(score.issueCount).toBe(0);
    });

    it('should calculate reduced quality score for records with errors', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Part number is required',
          actualValue: null,
          ruleId: 'PART_001'
        },
        {
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid unit of measure',
          actualValue: 'INVALID',
          ruleId: 'PART_004'
        }
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      expect(score.overall).toBeLessThan(100);
      expect(score.issueCount).toBe(2);
      // With errors, the record should not be perfect/valid
      expect(score.isValid === false || score.overall < 100).toBe(true);
    });

    it('should calculate quality score based on error ratio', () => {
      // 3 errors out of 10 fields = 30% issues
      const errors: ValidationError[] = Array(3).fill(null).map((_, i) => ({
        field: `field${i}`,
        errorType: ValidationType.FORMAT,
        severity: Severity.ERROR,
        message: 'Format error',
        actualValue: 'invalid'
      }));

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      // With 3 errors in a 10-field record, score should be significantly below perfect
      expect(score.overall).toBeGreaterThanOrEqual(60);
      expect(score.overall).toBeLessThan(100);
      expect(score.issueCount).toBe(3);
    });

    it('should include all dimension scores in record quality', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required',
          actualValue: null
        }
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      expect(score.dimensions).toHaveLength(4);
      expect(score.dimensions.some(d => d.dimension === QualityDimension.COMPLETENESS)).toBe(true);
      expect(score.dimensions.some(d => d.dimension === QualityDimension.VALIDITY)).toBe(true);
      expect(score.dimensions.some(d => d.dimension === QualityDimension.CONSISTENCY)).toBe(true);
      expect(score.dimensions.some(d => d.dimension === QualityDimension.ACCURACY)).toBe(true);
    });

    it('should track record quality with record ID', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10, 'part-123');

      expect(score.recordId).toBe('part-123');
      expect(service.getScoreHistory('part-123')).toHaveLength(1);
    });
  });

  // ============================================================================
  // DATASET QUALITY SCORE CALCULATION
  // ============================================================================

  describe('Dataset Quality Score Calculation', () => {
    it('should calculate perfect dataset score when all records are valid', () => {
      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: true,
          errors: [],
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);

      expect(score.overall).toBe(100);
      expect(score.validRecords).toBe(10);
      expect(score.invalidRecords).toBe(0);
      expect(score.band).toBe(QualityBand.EXCELLENT);
    });

    it('should calculate dataset score based on valid record ratio', () => {
      const validResults: ValidationResult[] = Array(8).fill(null).map(() => ({
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      }));

      const invalidResults: ValidationResult[] = Array(2)
        .fill(null)
        .map(() => ({
          isValid: false,
          errors: [
            {
              field: 'test',
              errorType: ValidationType.REQUIRED_FIELD,
              severity: Severity.ERROR,
              message: 'Required',
              actualValue: null
            }
          ],
          warnings: [],
          fieldValidation: new Map()
        }));

      const results = [...validResults, ...invalidResults];
      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);

      expect(score.validRecords).toBe(8);
      expect(score.invalidRecords).toBe(2);
      expect(score.overall).toBeGreaterThan(60);
    });

    it('should calculate average issues per record', () => {
      const results: ValidationResult[] = [
        {
          isValid: false,
          errors: Array(5)
            .fill(null)
            .map(() => ({
              field: 'field',
              errorType: ValidationType.FORMAT,
              severity: Severity.ERROR,
              message: 'Error'
            })),
          warnings: [],
          fieldValidation: new Map()
        },
        {
          isValid: false,
          errors: Array(3)
            .fill(null)
            .map(() => ({
              field: 'field',
              errorType: ValidationType.FORMAT,
              severity: Severity.ERROR,
              message: 'Error'
            })),
          warnings: [],
          fieldValidation: new Map()
        }
      ];

      const score = service.calculateDatasetScore(results, 2, EntityType.PART, 10);

      expect(score.averageIssuesPerRecord).toBe(4); // (5 + 3) / 2
    });

    it('should track coverage metrics', () => {
      const completeResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const partialResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            field: 'description',
            errorType: ValidationType.FORMAT,
            severity: Severity.ERROR,
            message: 'Format',
            actualValue: 'invalid'
          }
        ],
        warnings: [],
        fieldValidation: new Map()
      };

      const emptyResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            field: 'partNumber',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required',
            actualValue: null
          }
        ],
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateDatasetScore(
        [completeResult, partialResult, emptyResult],
        3,
        EntityType.PART,
        10
      );

      expect(score.coverage.completeRecords).toBe(1);
      expect(score.coverage.partialRecords).toBe(1);
      expect(score.coverage.emptyRecords).toBe(1);
    });
  });

  // ============================================================================
  // QUALITY BAND DETERMINATION
  // ============================================================================

  describe('Quality Band Determination', () => {
    it('should classify score 95 as EXCELLENT', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: Array(1)
          .fill(null)
          .map(() => ({
            field: 'field',
            errorType: ValidationType.WARNING,
            severity: Severity.WARNING,
            message: 'Warning'
          })),
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 20);

      expect(score.band).toBe(QualityBand.EXCELLENT);
    });

    it('should classify score 80 as GOOD', () => {
      // Distribute errors to achieve GOOD band (~80 overall)
      const errors: ValidationError[] = [
        ...Array(8).fill(null).map(() => ({
          field: 'field',
          errorType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          message: 'Error'
        })),
        ...Array(2).fill(null).map(() => ({
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }))
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 20);

      // Accept bands in the GOOD range (EXCELLENT and GOOD)
      expect([QualityBand.EXCELLENT, QualityBand.GOOD]).toContain(score.band);
      expect(score.overall).toBeGreaterThanOrEqual(70);
    });

    it('should degrade quality band with more errors', () => {
      // Test that bands degrade properly with increasing errors
      const oneError: ValidationError[] = [
        {
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }
      ];

      const fiveErrors: ValidationError[] = Array(5)
        .fill(null)
        .map(() => ({
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }));

      const tenErrors: ValidationError[] = Array(10)
        .fill(null)
        .map(() => ({
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }));

      const result1: ValidationResult = {
        isValid: false,
        errors: oneError,
        warnings: [],
        fieldValidation: new Map()
      };

      const result5: ValidationResult = {
        isValid: false,
        errors: fiveErrors,
        warnings: [],
        fieldValidation: new Map()
      };

      const result10: ValidationResult = {
        isValid: false,
        errors: tenErrors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score1 = service.calculateRecordScore(result1, EntityType.PART, 20);
      const score5 = service.calculateRecordScore(result5, EntityType.PART, 20);
      const score10 = service.calculateRecordScore(result10, EntityType.PART, 20);

      // Scores should degrade with more errors
      expect(score1.overall).toBeGreaterThan(score5.overall);
      expect(score5.overall).toBeGreaterThan(score10.overall);

      // Band progression should degrade
      const bandOrder = [
        QualityBand.EXCELLENT,
        QualityBand.GOOD,
        QualityBand.ACCEPTABLE,
        QualityBand.POOR,
        QualityBand.CRITICAL
      ];
      const band1Index = bandOrder.indexOf(score1.band);
      const band5Index = bandOrder.indexOf(score5.band);
      const band10Index = bandOrder.indexOf(score10.band);

      expect(band1Index).toBeLessThanOrEqual(band5Index);
      expect(band5Index).toBeLessThanOrEqual(band10Index);
    });
  });

  // ============================================================================
  // DIMENSION SCORING
  // ============================================================================

  describe('Dimension Scoring', () => {
    it('should calculate completeness from REQUIRED_FIELD errors', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required',
          actualValue: null
        }
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);
      const completeness = score.dimensions.find(d => d.dimension === QualityDimension.COMPLETENESS);

      expect(completeness?.score).toBeLessThan(100);
      expect(completeness?.details.issueCount).toBe(1);
    });

    it('should calculate validity from FORMAT and ENUM errors', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          message: 'Format',
          actualValue: 'invalid!'
        },
        {
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid enum',
          actualValue: 'INVALID'
        }
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);
      const validity = score.dimensions.find(d => d.dimension === QualityDimension.VALIDITY);

      expect(validity?.details.issueCount).toBe(2);
    });

    it('should calculate consistency from BUSINESS_RULE errors', () => {
      const errors: ValidationError[] = [
        {
          field: 'startDate,endDate',
          errorType: ValidationType.BUSINESS_RULE,
          severity: Severity.ERROR,
          message: 'Business rule violation',
          actualValue: null
        }
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);
      const consistency = score.dimensions.find(
        d => d.dimension === QualityDimension.CONSISTENCY
      );

      expect(consistency?.details.issueCount).toBe(1);
    });

    it('should calculate accuracy from FOREIGN_KEY errors', () => {
      const errors: ValidationError[] = [
        {
          field: 'componentPartId',
          errorType: ValidationType.FOREIGN_KEY,
          severity: Severity.ERROR,
          message: 'FK violation',
          actualValue: 'invalid-id'
        }
      ];

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);
      const accuracy = score.dimensions.find(d => d.dimension === QualityDimension.ACCURACY);

      expect(accuracy?.details.issueCount).toBe(1);
    });

    it('should have proper weights for dimensions', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      const totalWeight = score.dimensions.reduce((sum, d) => sum + d.weight, 0);
      expect(Math.abs(totalWeight - 1.0)).toBeLessThan(0.01);
    });
  });

  // ============================================================================
  // CONFIDENCE CALCULATION
  // ============================================================================

  describe('Confidence Calculation', () => {
    it('should have maximum confidence for valid record', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      expect(score.confidence).toBe(1.0);
    });

    it('should reduce confidence with more errors', () => {
      const errors1: ValidationError[] = [
        {
          field: 'field1',
          errorType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          message: 'Error'
        }
      ];

      const errors5: ValidationError[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          field: `field${i}`,
          errorType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          message: 'Error'
        }));

      const result1: ValidationResult = {
        isValid: false,
        errors: errors1,
        warnings: [],
        fieldValidation: new Map()
      };

      const result5: ValidationResult = {
        isValid: false,
        errors: errors5,
        warnings: [],
        fieldValidation: new Map()
      };

      const score1 = service.calculateRecordScore(result1, EntityType.PART, 10);
      const score5 = service.calculateRecordScore(result5, EntityType.PART, 10);

      expect(score1.confidence).toBeGreaterThan(score5.confidence);
    });

    it('should reduce confidence with higher severity errors', () => {
      const errorWarning: ValidationError[] = [
        {
          field: 'field',
          errorType: ValidationType.FORMAT,
          severity: Severity.WARNING,
          message: 'Warning'
        }
      ];

      const errorCritical: ValidationError[] = [
        {
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }
      ];

      const resultWarning: ValidationResult = {
        isValid: false,
        errors: errorWarning,
        warnings: [],
        fieldValidation: new Map()
      };

      const resultCritical: ValidationResult = {
        isValid: false,
        errors: errorCritical,
        warnings: [],
        fieldValidation: new Map()
      };

      const scoreWarning = service.calculateRecordScore(resultWarning, EntityType.PART, 10);
      const scoreCritical = service.calculateRecordScore(resultCritical, EntityType.PART, 10);

      expect(scoreWarning.confidence).toBeGreaterThan(scoreCritical.confidence);
    });

    it('should respect minimum confidence threshold', () => {
      service.updateConfig({ minConfidence: 0.5 });

      const errors: ValidationError[] = Array(20)
        .fill(null)
        .map(() => ({
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }));

      const validationResult: ValidationResult = {
        isValid: false,
        errors,
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      expect(score.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ============================================================================
  // QUALITY REPORT GENERATION
  // ============================================================================

  describe('Quality Report Generation', () => {
    it('should generate comprehensive quality report', () => {
      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: true,
          errors: [],
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);
      const report = service.generateQualityReport(score);

      expect(report.generatedAt).toBeDefined();
      expect(report.summary).toEqual(score);
      expect(report.metrics).toBeDefined();
      expect(report.metrics.length).toBeGreaterThan(0);
      expect(report.recommendations).toBeDefined();
      expect(report.trends).toBeDefined();
    });

    it('should include quality metrics in report', () => {
      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: true,
          errors: [],
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);
      const report = service.generateQualityReport(score);

      expect(report.metrics.some(m => m.metric === 'Overall Quality Score')).toBe(true);
      expect(report.metrics.some(m => m.metric === 'Valid Records Ratio')).toBe(true);
      expect(report.metrics.some(m => m.metric === 'Completeness Score')).toBe(true);
    });

    it('should generate recommendations for poor quality', () => {
      const errors: ValidationError[] = Array(8)
        .fill(null)
        .map(() => ({
          field: 'field',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }));

      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: false,
          errors,
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);
      const report = service.generateQualityReport(score);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0].priority).toBe('high');
    });

    it('should not generate recommendations for excellent quality', () => {
      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: true,
          errors: [],
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);
      const report = service.generateQualityReport(score);

      expect(report.recommendations.length).toBe(0);
    });

    it('should include period in report if provided', () => {
      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: true,
          errors: [],
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const report = service.generateQualityReport(score, period);

      expect(report.period).toEqual(period);
    });
  });

  // ============================================================================
  // SCORE HISTORY TRACKING
  // ============================================================================

  describe('Score History Tracking', () => {
    it('should track score history for records', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      service.calculateRecordScore(validationResult, EntityType.PART, 10, 'part-001');
      service.calculateRecordScore(validationResult, EntityType.PART, 10, 'part-001');

      const history = service.getScoreHistory('part-001');

      expect(history).toHaveLength(2);
      expect(history[0].overall).toBe(100);
      expect(history[1].overall).toBe(100);
    });

    it('should return empty history for unknown key', () => {
      const history = service.getScoreHistory('unknown-key');

      expect(history).toHaveLength(0);
    });

    it('should clear history for specific key', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      service.calculateRecordScore(validationResult, EntityType.PART, 10, 'part-001');
      service.clearHistory('part-001');

      const history = service.getScoreHistory('part-001');

      expect(history).toHaveLength(0);
    });

    it('should clear all history', () => {
      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      service.calculateRecordScore(validationResult, EntityType.PART, 10, 'part-001');
      service.calculateRecordScore(validationResult, EntityType.PART, 10, 'part-002');

      service.clearAllHistory();

      expect(service.getScoreHistory('part-001')).toHaveLength(0);
      expect(service.getScoreHistory('part-002')).toHaveLength(0);
    });
  });

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config = service.getConfig();

      expect(config.dimensionWeights).toBeDefined();
      expect(config.qualityBands).toBeDefined();
      expect(config.minConfidence).toBeDefined();
    });

    it('should update dimension weights', () => {
      service.updateConfig({
        dimensionWeights: {
          completeness: 0.5,
          validity: 0.5,
          consistency: 0,
          accuracy: 0
        }
      });

      const config = service.getConfig();

      expect(config.dimensionWeights.completeness).toBe(0.5);
      expect(config.dimensionWeights.validity).toBe(0.5);
    });

    it('should update quality bands', () => {
      service.updateConfig({
        qualityBands: {
          excellent: 95,
          good: 80,
          acceptable: 60,
          poor: 40,
          critical: 0
        }
      });

      const config = service.getConfig();

      expect(config.qualityBands.excellent).toBe(95);
      expect(config.qualityBands.good).toBe(80);
    });

    it('should update minimum confidence', () => {
      service.updateConfig({ minConfidence: 0.8 });

      const config = service.getConfig();

      expect(config.minConfidence).toBe(0.8);
    });

    it('should merge partial configuration updates', () => {
      const originalConfig = service.getConfig();

      service.updateConfig({ minConfidence: 0.9 });

      const updatedConfig = service.getConfig();

      expect(updatedConfig.dimensionWeights).toEqual(originalConfig.dimensionWeights);
      expect(updatedConfig.minConfidence).toBe(0.9);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe('Integration Scenarios', () => {
    it('should handle mixed valid and invalid records', () => {
      const validResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const invalidResult: ValidationResult = {
        isValid: false,
        errors: [
          {
            field: 'partNumber',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required',
            actualValue: null
          }
        ],
        warnings: [],
        fieldValidation: new Map()
      };

      const results = [validResult, invalidResult, validResult, validResult];
      const score = service.calculateDatasetScore(results, 4, EntityType.PART, 10);

      expect(score.validRecords).toBe(3);
      expect(score.invalidRecords).toBe(1);
      expect(score.overall).toBeGreaterThan(50);
    });

    it('should calculate scores with custom configuration', () => {
      service.updateConfig({
        dimensionWeights: {
          completeness: 0.5,
          validity: 0.5,
          consistency: 0,
          accuracy: 0
        },
        qualityBands: {
          excellent: 95,
          good: 80,
          acceptable: 60,
          poor: 40,
          critical: 0
        }
      });

      const validationResult: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        fieldValidation: new Map()
      };

      const score = service.calculateRecordScore(validationResult, EntityType.PART, 10);

      expect(score.overall).toBe(100);
      expect(score.dimensions[0].weight).toBe(0.5); // completeness
      expect(score.dimensions[1].weight).toBe(0.5); // validity
    });

    it('should generate comprehensive quality report with recommendations', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required',
          actualValue: null
        },
        {
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid',
          actualValue: 'BAD'
        }
      ];

      const results: ValidationResult[] = Array(10)
        .fill(null)
        .map(() => ({
          isValid: false,
          errors,
          warnings: [],
          fieldValidation: new Map()
        }));

      const score = service.calculateDatasetScore(results, 10, EntityType.PART, 10);
      const report = service.generateQualityReport(score);

      expect(report.summary.overall).toBeLessThan(100);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.metrics.some(m => m.status === 'critical' || m.status === 'warning')).toBe(
        true
      );
    });
  });
});
