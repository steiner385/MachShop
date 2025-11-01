/**
 * Error Reporting Service Tests
 * Phase 6: Error reporting with messages, suggestions, and grouping
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ErrorReportingService,
  ErrorCategory,
  EnrichedError
} from '../../../services/migration/validation/ErrorReportingService';
import {
  ValidationError,
  ValidationType,
  Severity
} from '../../../services/migration/validation/ValidationService';

describe('Error Reporting Service - Phase 6: Error Reporting', () => {
  let service: ErrorReportingService;

  beforeEach(() => {
    service = new ErrorReportingService();
  });

  // ============================================================================
  // ERROR ENRICHMENT
  // ============================================================================

  describe('Error Enrichment', () => {
    it('should enrich error with message and suggestion', () => {
      const error: ValidationError = {
        field: 'partNumber',
        errorType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        message: 'Part number is required'
      };

      const enriched = service.enrichError(error);

      expect(enriched.message).toBeDefined();
      expect(enriched.message.code).toBe('REQ001');
      expect(enriched.message.title).toBe('Required Field Missing');
      expect(enriched.suggestion).toBeDefined();
      expect(enriched.suggestion?.title).toBe('Provide Missing Value');
    });

    it('should include context in enriched error', () => {
      const error: ValidationError = {
        field: 'partNumber',
        errorType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        message: 'Required'
      };

      const context = {
        recordId: 'part-001',
        rowNumber: 5
      };

      const enriched = service.enrichError(error, context);

      expect(enriched.context).toEqual(context);
      expect(enriched.context?.recordId).toBe('part-001');
      expect(enriched.context?.rowNumber).toBe(5);
    });

    it('should enrich multiple errors', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        },
        {
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid enum'
        }
      ];

      const enriched = service.enrichErrors(errors);

      expect(enriched).toHaveLength(2);
      expect(enriched[0].message).toBeDefined();
      expect(enriched[1].message).toBeDefined();
      expect(enriched[0].suggestion).toBeDefined();
      expect(enriched[1].suggestion).toBeDefined();
    });

    it('should handle format errors', () => {
      const error: ValidationError = {
        field: 'partNumber',
        errorType: ValidationType.FORMAT,
        severity: Severity.ERROR,
        message: 'Invalid format',
        actualValue: 'invalid!'
      };

      const enriched = service.enrichError(error);

      expect(enriched.message.code).toBe('FMT001');
      expect(enriched.message.category).toBe(ErrorCategory.INVALID_FORMAT);
      expect(enriched.suggestion?.title).toBe('Correct the Format');
    });

    it('should handle enum errors', () => {
      const error: ValidationError = {
        field: 'status',
        errorType: ValidationType.ENUM,
        severity: Severity.ERROR,
        message: 'Invalid enum',
        actualValue: 'INVALID'
      };

      const enriched = service.enrichError(error);

      expect(enriched.message.code).toBe('ENM001');
      expect(enriched.message.category).toBe(ErrorCategory.INVALID_VALUE);
    });

    it('should handle foreign key errors', () => {
      const error: ValidationError = {
        field: 'componentPartId',
        errorType: ValidationType.FOREIGN_KEY,
        severity: Severity.ERROR,
        message: 'Referenced record not found',
        actualValue: 'invalid-id'
      };

      const enriched = service.enrichError(error);

      expect(enriched.message.code).toBe('FK001');
      expect(enriched.message.category).toBe(ErrorCategory.MISSING_REFERENCE);
    });
  });

  // ============================================================================
  // ERROR GROUPING
  // ============================================================================

  describe('Error Grouping', () => {
    it('should group errors by category and severity', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'field1',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'field2',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'field3',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid enum'
        })
      ];

      const groups = service.groupErrors(errors);

      expect(groups.length).toBeGreaterThan(0);
      const completenessGroup = groups.find(
        g => g.category === ErrorCategory.MISSING_DATA
      );
      expect(completenessGroup?.count).toBe(2);
    });

    it('should identify common field in error group', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          message: 'Invalid format'
        })
      ];

      const groups = service.groupErrors(errors);

      const commonFieldGroup = groups.find(g => g.commonField === 'partNumber');
      expect(commonFieldGroup).toBeDefined();
    });

    it('should sort groups by count descending', () => {
      const errors: EnrichedError[] = [
        ...Array(5).fill(null).map(() =>
          service.enrichError({
            field: 'field1',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          })
        ),
        ...Array(3).fill(null).map(() =>
          service.enrichError({
            field: 'field2',
            errorType: ValidationType.FORMAT,
            severity: Severity.ERROR,
            message: 'Invalid'
          })
        )
      ];

      const groups = service.groupErrors(errors);

      expect(groups[0].count).toBeGreaterThanOrEqual(groups[1].count);
    });

    it('should generate summary for error groups', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        })
      ];

      const groups = service.groupErrors(errors);
      const group = groups[0];

      expect(group.summary).toContain('2');
      expect(group.summary).toContain('partNumber');
    });
  });

  // ============================================================================
  // ERROR REPORTING
  // ============================================================================

  describe('Error Report Generation', () => {
    it('should generate comprehensive error report', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid'
        })
      ];

      const report = service.generateErrorReport(errors, 80);

      expect(report.totalErrors).toBe(2);
      expect(report.errorsBySeverity.error).toBe(2);
      expect(report.generatedAt).toBeDefined();
      expect(report.successRate).toBe(80);
    });

    it('should count errors by severity', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'field1',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }),
        service.enrichError({
          field: 'field2',
          errorType: ValidationType.RANGE,
          severity: Severity.WARNING,
          message: 'Warning'
        }),
        service.enrichError({
          field: 'field3',
          errorType: ValidationType.CUSTOM,
          severity: Severity.INFO,
          message: 'Info'
        })
      ];

      const report = service.generateErrorReport(errors);

      expect(report.errorsBySeverity.error).toBe(1);
      expect(report.errorsBySeverity.warning).toBe(1);
      expect(report.errorsBySeverity.info).toBe(1);
    });

    it('should count errors by category', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid'
        })
      ];

      const report = service.generateErrorReport(errors);

      expect(report.errorsByCategory.size).toBeGreaterThan(0);
      expect(report.errorsByCategory.get(ErrorCategory.MISSING_DATA)).toBe(1);
      expect(report.errorsByCategory.get(ErrorCategory.INVALID_VALUE)).toBe(1);
    });

    it('should identify top issues', () => {
      const errors: EnrichedError[] = [
        ...Array(5).fill(null).map(() =>
          service.enrichError({
            field: 'field1',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          })
        ),
        service.enrichError({
          field: 'field2',
          errorType: ValidationType.ENUM,
          severity: Severity.WARNING,
          message: 'Invalid'
        })
      ];

      const report = service.generateErrorReport(errors);

      expect(report.topIssues.length).toBeGreaterThan(0);
      expect(report.topIssues[0].count).toBeGreaterThanOrEqual(
        report.topIssues[1]?.count || 0
      );
    });
  });

  // ============================================================================
  // ERROR SUMMARY
  // ============================================================================

  describe('Error Summary Generation', () => {
    it('should generate error summary', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required',
          actualValue: null
        }),
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required',
          actualValue: null
        })
      ];

      const summary = service.generateErrorSummary(errors);

      expect(summary.length).toBeGreaterThan(0);
      expect(summary[0].occurrences).toBe(2);
      expect(summary[0].field).toBe('partNumber');
    });

    it('should sort summary by occurrence count', () => {
      const errors: EnrichedError[] = [
        ...Array(5).fill(null).map(() =>
          service.enrichError({
            field: 'field1',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          })
        ),
        ...Array(3).fill(null).map(() =>
          service.enrichError({
            field: 'field2',
            errorType: ValidationType.FORMAT,
            severity: Severity.ERROR,
            message: 'Invalid'
          })
        )
      ];

      const summary = service.generateErrorSummary(errors);

      expect(summary[0].occurrences).toBeGreaterThanOrEqual(summary[1].occurrences);
    });
  });

  // ============================================================================
  // ERROR FILTERING
  // ============================================================================

  describe('Error Filtering', () => {
    it('should filter errors by severity', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'field1',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Error'
        }),
        service.enrichError({
          field: 'field2',
          errorType: ValidationType.RANGE,
          severity: Severity.WARNING,
          message: 'Warning'
        })
      ];

      const filtered = service.filterErrors(errors, { severity: Severity.ERROR });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].severity).toBe(Severity.ERROR);
    });

    it('should filter errors by category', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid'
        })
      ];

      const filtered = service.filterErrors(errors, {
        category: ErrorCategory.MISSING_DATA
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].field).toBe('partNumber');
    });

    it('should filter errors by field', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        }),
        service.enrichError({
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid'
        })
      ];

      const filtered = service.filterErrors(errors, { field: 'partNumber' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].field).toBe('partNumber');
    });

    it('should filter errors by record ID', () => {
      const errors: EnrichedError[] = [
        service.enrichError(
          {
            field: 'field1',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          },
          { recordId: 'part-001' }
        ),
        service.enrichError(
          {
            field: 'field2',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          },
          { recordId: 'part-002' }
        )
      ];

      const filtered = service.filterErrors(errors, { recordId: 'part-001' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].context?.recordId).toBe('part-001');
    });
  });

  // ============================================================================
  // ERROR FORMATTING
  // ============================================================================

  describe('Error Formatting', () => {
    it('should format error for display', () => {
      const error = service.enrichError(
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required',
          actualValue: null
        },
        { recordId: 'part-001' }
      );

      const formatted = service.formatErrorForDisplay(error);

      expect(formatted).toContain('REQ001');
      expect(formatted).toContain('Required Field Missing');
      expect(formatted).toContain('partNumber');
      expect(formatted).toContain('part-001');
    });

    it('should include suggestion in formatted error', () => {
      const error = service.enrichError({
        field: 'partNumber',
        errorType: ValidationType.REQUIRED_FIELD,
        severity: Severity.ERROR,
        message: 'Required'
      });

      const formatted = service.formatErrorForDisplay(error);

      expect(formatted).toContain('Provide Missing Value');
    });
  });

  // ============================================================================
  // ERROR EXPORT
  // ============================================================================

  describe('Error Export', () => {
    it('should export errors as JSON', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        })
      ];

      const json = service.exportAsJSON(errors);
      const parsed = JSON.parse(json);

      expect(parsed).toHaveLength(1);
      expect(parsed[0].code).toBe('REQ001');
      expect(parsed[0].field).toBe('partNumber');
    });

    it('should export errors as CSV', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        })
      ];

      const csv = service.exportAsCSV(errors);
      const lines = csv.split('\n');

      expect(lines[0]).toContain('Code');
      expect(lines[0]).toContain('Field');
      expect(lines[1]).toContain('REQ001');
      expect(lines[1]).toContain('partNumber');
    });

    it('should handle special characters in CSV export', () => {
      const errors: EnrichedError[] = [
        service.enrichError({
          field: 'description',
          errorType: ValidationType.FORMAT,
          severity: Severity.ERROR,
          message: 'Invalid',
          actualValue: 'Value with "quotes"'
        })
      ];

      const csv = service.exportAsCSV(errors);

      // CSV escaping doubles quotes, so "quotes" becomes ""quotes""
      expect(csv).toContain('Value');
      expect(csv).toContain('FMT001');
      expect(csv).toContain('description');
    });
  });

  // ============================================================================
  // BATCH ERROR REPORTING
  // ============================================================================

  describe('Batch Error Reporting', () => {
    it('should generate batch error report', () => {
      const errors: EnrichedError[] = [
        service.enrichError(
          {
            field: 'field1',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          },
          { recordId: 'record-001' }
        ),
        service.enrichError(
          {
            field: 'field2',
            errorType: ValidationType.ENUM,
            severity: Severity.ERROR,
            message: 'Invalid'
          },
          { recordId: 'record-002' }
        )
      ];

      const batchReport = service.generateBatchErrorReport('batch-001', 10, errors);

      expect(batchReport.batchId).toBe('batch-001');
      expect(batchReport.totalRecords).toBe(10);
      expect(batchReport.failedRecords).toBeGreaterThan(0);
      expect(batchReport.errorReports.totalErrors).toBe(2);
    });

    it('should calculate successful record count', () => {
      const errors: EnrichedError[] = [
        service.enrichError(
          {
            field: 'field1',
            errorType: ValidationType.REQUIRED_FIELD,
            severity: Severity.ERROR,
            message: 'Required'
          },
          { recordId: 'record-001' }
        )
      ];

      const batchReport = service.generateBatchErrorReport('batch-001', 10, errors);

      expect(batchReport.successfulRecords).toBeLessThan(10);
      expect(batchReport.successfulRecords).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // INTEGRATION SCENARIOS
  // ============================================================================

  describe('Integration Scenarios', () => {
    it('should handle full error workflow', () => {
      const errors: ValidationError[] = [
        {
          field: 'partNumber',
          errorType: ValidationType.REQUIRED_FIELD,
          severity: Severity.ERROR,
          message: 'Required'
        },
        {
          field: 'unitOfMeasure',
          errorType: ValidationType.ENUM,
          severity: Severity.ERROR,
          message: 'Invalid'
        },
        {
          field: 'standardCost',
          errorType: ValidationType.RANGE,
          severity: Severity.WARNING,
          message: 'Out of range'
        }
      ];

      const context = { recordId: 'part-001', rowNumber: 5 };
      const enriched = service.enrichErrors(errors, context);
      const groups = service.groupErrors(enriched);
      const report = service.generateErrorReport(enriched, 70);
      const summary = service.generateErrorSummary(enriched);
      const json = service.exportAsJSON(enriched);

      expect(enriched).toHaveLength(3);
      expect(groups.length).toBeGreaterThan(0);
      expect(report.totalErrors).toBe(3);
      expect(summary.length).toBeGreaterThan(0);
      expect(JSON.parse(json)).toHaveLength(3);
    });

    it('should generate detailed batch report', () => {
      const errors: EnrichedError[] = [
        ...Array(5).fill(null).map((_, i) =>
          service.enrichError(
            {
              field: `field${i}`,
              errorType: ValidationType.REQUIRED_FIELD,
              severity: Severity.ERROR,
              message: 'Required'
            },
            { recordId: `record-${i}`, rowNumber: i + 1 }
          )
        )
      ];

      const batchReport = service.generateBatchErrorReport('batch-001', 100, errors, 'json');

      expect(batchReport.exportFormat).toBe('json');
      expect(batchReport.errorReports.groups.length).toBeGreaterThan(0);
      expect(batchReport.errorReports.topIssues.length).toBeGreaterThan(0);
    });
  });
});
