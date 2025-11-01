/**
 * Error Reporting Service
 * Phase 6: Comprehensive error reporting with messages, suggestions, and grouping
 *
 * Provides:
 * - Human-readable error messages
 * - Suggested fixes and remediation steps
 * - Error grouping and aggregation
 * - Error categorization and filtering
 * - Error context and metadata
 * - Batch error reporting
 * - Export and formatting capabilities
 */

import {
  ValidationError,
  ValidationType,
  Severity,
  EntityType
} from './ValidationService';

// ============================================================================
// Error Reporting Types
// ============================================================================

export interface ErrorMessage {
  code: string;
  title: string;
  description: string;
  severity: Severity;
  category: ErrorCategory;
}

export interface ErrorSuggestion {
  title: string;
  description: string;
  steps: string[];
  complexity: 'low' | 'medium' | 'high';
  timeEstimate: string;
  relatedFields?: string[];
}

export interface EnrichedError extends ValidationError {
  message: ErrorMessage;
  suggestion?: ErrorSuggestion;
  context?: ErrorContext;
  relatedErrors?: string[]; // IDs of related errors
}

export interface ErrorContext {
  recordId?: string;
  recordKey?: string;
  rowNumber?: number;
  batchId?: string;
  importSession?: string;
  metadata?: Record<string, any>;
}

export enum ErrorCategory {
  // Data Quality Issues
  MISSING_DATA = 'missing_data',
  INVALID_FORMAT = 'invalid_format',
  INVALID_VALUE = 'invalid_value',
  TYPE_MISMATCH = 'type_mismatch',
  RANGE_VIOLATION = 'range_violation',

  // Referential Issues
  MISSING_REFERENCE = 'missing_reference',
  ORPHANED_RECORD = 'orphaned_record',
  CIRCULAR_REFERENCE = 'circular_reference',

  // Consistency Issues
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  DATA_INCONSISTENCY = 'data_inconsistency',
  DUPLICATE_VALUE = 'duplicate_value',
  UNIQUENESS_VIOLATION = 'uniqueness_violation',

  // Configuration Issues
  CONFIGURATION_ERROR = 'configuration_error',
  MAPPING_ERROR = 'mapping_error',
  SCHEMA_MISMATCH = 'schema_mismatch',

  // System Issues
  SYSTEM_ERROR = 'system_error',
  PROCESSING_ERROR = 'processing_error',
  TIMEOUT_ERROR = 'timeout_error'
}

export interface ErrorGroup {
  category: ErrorCategory;
  severity: Severity;
  count: number;
  errors: EnrichedError[];
  commonField?: string; // If all errors are in the same field
  firstOccurrence: Date;
  lastOccurrence: Date;
  summary: string;
}

export interface ErrorReport {
  generatedAt: Date;
  totalErrors: number;
  errorsBySeverity: {
    error: number;
    warning: number;
    info: number;
  };
  errorsByCategory: Map<ErrorCategory, number>;
  groups: ErrorGroup[];
  topIssues: ErrorGroup[];
  affectedRecords: number;
  successRate: number;
}

export interface ErrorSummary {
  category: ErrorCategory;
  field?: string;
  occurrences: number;
  exampleValue?: any;
  severity: Severity;
  suggestedFix?: string;
}

export interface BatchErrorReport {
  batchId: string;
  timestamp: Date;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errorReports: ErrorReport;
  detailedErrors: EnrichedError[];
  exportFormat?: 'json' | 'csv' | 'html';
}

// ============================================================================
// Error Message Repository
// ============================================================================

const ERROR_MESSAGES: Map<string, ErrorMessage> = new Map([
  // Required Field Errors
  [
    'REQUIRED_FIELD',
    {
      code: 'REQ001',
      title: 'Required Field Missing',
      description: 'This field is mandatory and must contain a value.',
      severity: Severity.ERROR,
      category: ErrorCategory.MISSING_DATA
    }
  ],

  // Format Errors
  [
    'FORMAT_INVALID',
    {
      code: 'FMT001',
      title: 'Invalid Format',
      description:
        'The value does not match the required format or pattern.',
      severity: Severity.ERROR,
      category: ErrorCategory.INVALID_FORMAT
    }
  ],

  // Enum Errors
  [
    'ENUM_INVALID',
    {
      code: 'ENM001',
      title: 'Invalid Value',
      description:
        'The value is not in the list of allowed values for this field.',
      severity: Severity.ERROR,
      category: ErrorCategory.INVALID_VALUE
    }
  ],

  // Range Errors
  [
    'RANGE_VIOLATION',
    {
      code: 'RNG001',
      title: 'Value Out of Range',
      description: 'The value is outside the allowed range.',
      severity: Severity.WARNING,
      category: ErrorCategory.RANGE_VIOLATION
    }
  ],

  // Data Type Errors
  [
    'TYPE_MISMATCH',
    {
      code: 'TYP001',
      title: 'Type Mismatch',
      description:
        'The value is not of the expected data type (e.g., should be date, number, etc.).',
      severity: Severity.ERROR,
      category: ErrorCategory.TYPE_MISMATCH
    }
  ],

  // Foreign Key Errors
  [
    'FOREIGN_KEY_INVALID',
    {
      code: 'FK001',
      title: 'Referenced Record Not Found',
      description:
        'The value references a record that does not exist in the referenced table.',
      severity: Severity.ERROR,
      category: ErrorCategory.MISSING_REFERENCE
    }
  ],

  // Unique Constraint Errors
  [
    'UNIQUE_VIOLATION',
    {
      code: 'UNQ001',
      title: 'Duplicate Value',
      description:
        'This value is not unique. Another record already uses this value in this field.',
      severity: Severity.ERROR,
      category: ErrorCategory.UNIQUENESS_VIOLATION
    }
  ],

  // Business Rule Errors
  [
    'BUSINESS_RULE_VIOLATION',
    {
      code: 'BIZ001',
      title: 'Business Rule Violation',
      description:
        'The data violates a business rule or constraint.',
      severity: Severity.ERROR,
      category: ErrorCategory.BUSINESS_RULE_VIOLATION
    }
  ],

  // Consistency Errors
  [
    'CONSISTENCY_ERROR',
    {
      code: 'CON001',
      title: 'Data Inconsistency',
      description:
        'The data is inconsistent with other related data or expected patterns.',
      severity: Severity.WARNING,
      category: ErrorCategory.DATA_INCONSISTENCY
    }
  ]
]);

const ERROR_SUGGESTIONS: Map<string, ErrorSuggestion> = new Map([
  [
    'REQUIRED_FIELD',
    {
      title: 'Provide Missing Value',
      description:
        'This field is mandatory. You must provide a valid value before import.',
      steps: [
        'Review the source data for missing values',
        'Fill in the missing value from available sources',
        'Verify the value matches the field requirements',
        'Re-validate before importing'
      ],
      complexity: 'low',
      timeEstimate: '5-10 minutes'
    }
  ],

  [
    'FORMAT_INVALID',
    {
      title: 'Correct the Format',
      description:
        'The value must follow a specific format or pattern.',
      steps: [
        'Check the expected format pattern',
        'Identify what is incorrect in the current value',
        'Reformat the value to match the expected pattern',
        'Test the new format against validation rules'
      ],
      complexity: 'low',
      timeEstimate: '5-15 minutes'
    }
  ],

  [
    'ENUM_INVALID',
    {
      title: 'Select Valid Value',
      description:
        'Choose a value from the list of allowed values.',
      steps: [
        'Review the list of allowed values',
        'Find the appropriate value from the list',
        'Replace the invalid value with the correct one',
        'Verify the change is correct'
      ],
      complexity: 'low',
      timeEstimate: '5-10 minutes'
    }
  ],

  [
    'RANGE_VIOLATION',
    {
      title: 'Adjust Value to Valid Range',
      description:
        'The value must be within the acceptable range.',
      steps: [
        'Check the minimum and maximum allowed values',
        'Review the current value and understand why it is out of range',
        'Adjust the value to fall within the valid range',
        'Validate the adjustment is reasonable for the data'
      ],
      complexity: 'medium',
      timeEstimate: '10-20 minutes'
    }
  ],

  [
    'TYPE_MISMATCH',
    {
      title: 'Convert to Correct Data Type',
      description:
        'The value must be of the correct data type.',
      steps: [
        'Identify the required data type',
        'Check the current value and its type',
        'Convert or reformat the value to the correct type',
        'Verify the conversion is accurate'
      ],
      complexity: 'medium',
      timeEstimate: '10-20 minutes'
    }
  ],

  [
    'FOREIGN_KEY_INVALID',
    {
      title: 'Reference Valid Record',
      description:
        'The referenced record must exist in the system.',
      steps: [
        'Verify the referenced record exists',
        'Check if the value should reference a different record',
        'Create the missing referenced record if needed',
        'Update the reference to point to an existing record'
      ],
      complexity: 'high',
      timeEstimate: '20-40 minutes',
      relatedFields: ['referenced table foreign keys']
    }
  ],

  [
    'UNIQUE_VIOLATION',
    {
      title: 'Resolve Duplicate Value',
      description:
        'The value must be unique. Remove duplicates or find alternative values.',
      steps: [
        'Identify the existing record with this value',
        'Determine if both records are needed',
        'Either merge the records or change one value to be unique',
        'Validate all related data is updated correctly'
      ],
      complexity: 'high',
      timeEstimate: '30-60 minutes'
    }
  ],

  [
    'BUSINESS_RULE_VIOLATION',
    {
      title: 'Align with Business Rules',
      description:
        'The data must comply with established business rules.',
      steps: [
        'Understand the business rule that is violated',
        'Review the data that violates the rule',
        'Make necessary changes to align with the rule',
        'Consult with stakeholders if the rule needs clarification'
      ],
      complexity: 'high',
      timeEstimate: '30-60 minutes'
    }
  ]
]);

// ============================================================================
// Error Reporting Service
// ============================================================================

export class ErrorReportingService {
  /**
   * Enrich a validation error with messages and suggestions
   */
  enrichError(
    error: ValidationError,
    context?: ErrorContext
  ): EnrichedError {
    const messageKey = this.getMessageKey(error.errorType);
    const message = ERROR_MESSAGES.get(messageKey) || this.getDefaultMessage(error);
    const suggestion = ERROR_SUGGESTIONS.get(messageKey);

    return {
      ...error,
      message,
      suggestion,
      context
    };
  }

  /**
   * Enrich multiple errors
   */
  enrichErrors(
    errors: ValidationError[],
    context?: ErrorContext
  ): EnrichedError[] {
    return errors.map(error => this.enrichError(error, context));
  }

  /**
   * Group errors by category
   */
  groupErrors(errors: EnrichedError[]): ErrorGroup[] {
    const groupMap = new Map<string, EnrichedError[]>();

    // Group errors
    errors.forEach(error => {
      const key = `${error.message.category}:${error.severity}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(error);
    });

    // Create error groups
    const groups: ErrorGroup[] = [];
    groupMap.forEach((groupErrors, key) => {
      const [category, severity] = key.split(':');
      const commonField = this.findCommonField(groupErrors);
      const dates = groupErrors
        .map(e => e.message ? new Date() : new Date())
        .sort();

      groups.push({
        category: category as ErrorCategory,
        severity: severity as Severity,
        count: groupErrors.length,
        errors: groupErrors,
        commonField,
        firstOccurrence: dates[0],
        lastOccurrence: dates[dates.length - 1],
        summary: this.generateGroupSummary(category as ErrorCategory, groupErrors)
      });
    });

    return groups.sort((a, b) => b.count - a.count);
  }

  /**
   * Generate comprehensive error report
   */
  generateErrorReport(errors: EnrichedError[], successRate: number = 100): ErrorReport {
    const groups = this.groupErrors(errors);
    const errorsBySeverity = this.countBySeverity(errors);
    const errorsByCategory = this.countByCategory(errors);

    const topIssues = groups
      .sort((a, b) => {
        const severityOrder = { [Severity.ERROR]: 0, [Severity.WARNING]: 1, [Severity.INFO]: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.count - a.count;
      })
      .slice(0, 5);

    const affectedRecords = new Set(
      errors.map(e => e.actualValue).filter(v => v !== undefined && v !== null)
    ).size;

    return {
      generatedAt: new Date(),
      totalErrors: errors.length,
      errorsBySeverity,
      errorsByCategory,
      groups,
      topIssues,
      affectedRecords,
      successRate
    };
  }

  /**
   * Generate summary of errors by category and field
   */
  generateErrorSummary(errors: EnrichedError[]): ErrorSummary[] {
    const summaryMap = new Map<string, ErrorSummary>();

    errors.forEach(error => {
      const key = `${error.message.category}:${error.field}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          category: error.message.category,
          field: error.field,
          occurrences: 0,
          severity: error.severity,
          suggestedFix: error.suggestion?.title
        });
      }

      const summary = summaryMap.get(key)!;
      summary.occurrences++;
      if (!summary.exampleValue && error.actualValue) {
        summary.exampleValue = error.actualValue;
      }
    });

    return Array.from(summaryMap.values()).sort(
      (a, b) => b.occurrences - a.occurrences
    );
  }

  /**
   * Filter errors by criteria
   */
  filterErrors(
    errors: EnrichedError[],
    criteria: {
      severity?: Severity;
      category?: ErrorCategory;
      field?: string;
      recordId?: string;
    }
  ): EnrichedError[] {
    return errors.filter(error => {
      if (criteria.severity && error.severity !== criteria.severity) {
        return false;
      }
      if (criteria.category && error.message.category !== criteria.category) {
        return false;
      }
      if (criteria.field && error.field !== criteria.field) {
        return false;
      }
      if (criteria.recordId && error.context?.recordId !== criteria.recordId) {
        return false;
      }
      return true;
    });
  }

  /**
   * Format errors for display
   */
  formatErrorForDisplay(error: EnrichedError): string {
    const parts: string[] = [];

    parts.push(`[${error.message.code}] ${error.message.title}`);
    parts.push(`Field: ${error.field}`);
    parts.push(`Message: ${error.message.description}`);

    if (error.actualValue !== undefined && error.actualValue !== null) {
      parts.push(`Current Value: ${JSON.stringify(error.actualValue)}`);
    }

    if (error.suggestion) {
      parts.push(`Suggested Fix: ${error.suggestion.title}`);
    }

    if (error.context?.recordId) {
      parts.push(`Record: ${error.context.recordId}`);
    }

    return parts.join('\n');
  }

  /**
   * Export errors as JSON
   */
  exportAsJSON(errors: EnrichedError[], pretty: boolean = true): string {
    const exportData = errors.map(error => ({
      code: error.message.code,
      field: error.field,
      severity: error.severity,
      category: error.message.category,
      message: error.message.title,
      description: error.message.description,
      currentValue: error.actualValue,
      suggestion: error.suggestion?.title,
      recordId: error.context?.recordId,
      rowNumber: error.context?.rowNumber
    }));

    return pretty ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
  }

  /**
   * Export errors as CSV
   */
  exportAsCSV(errors: EnrichedError[]): string {
    const headers = [
      'Code',
      'Field',
      'Severity',
      'Category',
      'Message',
      'Current Value',
      'Suggestion',
      'Record ID',
      'Row Number'
    ];

    const rows = errors.map(error => [
      error.message.code,
      error.field,
      error.severity,
      error.message.category,
      error.message.title,
      error.actualValue ? JSON.stringify(error.actualValue) : '',
      error.suggestion?.title || '',
      error.context?.recordId || '',
      error.context?.rowNumber || ''
    ]);

    const csvLines = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ];

    return csvLines.join('\n');
  }

  /**
   * Generate batch error report
   */
  generateBatchErrorReport(
    batchId: string,
    totalRecords: number,
    errors: EnrichedError[],
    exportFormat: 'json' | 'csv' | 'html' = 'json'
  ): BatchErrorReport {
    const successfulRecords = totalRecords - new Set(
      errors.map(e => e.context?.recordId).filter(id => id !== undefined)
    ).size;

    const errorReport = this.generateErrorReport(
      errors,
      (successfulRecords / totalRecords) * 100
    );

    return {
      batchId,
      timestamp: new Date(),
      totalRecords,
      successfulRecords,
      failedRecords: totalRecords - successfulRecords,
      errorReports: errorReport,
      detailedErrors: errors,
      exportFormat
    };
  }

  /**
   * Get error message by validation type
   */
  private getMessageKey(validationType: ValidationType): string {
    const typeMap: Record<ValidationType, string> = {
      [ValidationType.REQUIRED_FIELD]: 'REQUIRED_FIELD',
      [ValidationType.FORMAT]: 'FORMAT_INVALID',
      [ValidationType.ENUM]: 'ENUM_INVALID',
      [ValidationType.RANGE]: 'RANGE_VIOLATION',
      [ValidationType.DATA_TYPE]: 'TYPE_MISMATCH',
      [ValidationType.FOREIGN_KEY]: 'FOREIGN_KEY_INVALID',
      [ValidationType.UNIQUE]: 'UNIQUE_VIOLATION',
      [ValidationType.BUSINESS_RULE]: 'BUSINESS_RULE_VIOLATION',
      [ValidationType.CUSTOM]: 'BUSINESS_RULE_VIOLATION',
      [ValidationType.CONSISTENCY]: 'CONSISTENCY_ERROR'
    };

    return typeMap[validationType] || 'BUSINESS_RULE_VIOLATION';
  }

  /**
   * Get default error message
   */
  private getDefaultMessage(error: ValidationError): ErrorMessage {
    return {
      code: 'DEFAULT',
      title: 'Validation Error',
      description: error.message || 'A validation error occurred.',
      severity: error.severity,
      category: ErrorCategory.SYSTEM_ERROR
    };
  }

  /**
   * Find common field in error group
   */
  private findCommonField(errors: EnrichedError[]): string | undefined {
    const fields = errors.map(e => e.field).filter((f, i, arr) => arr.indexOf(f) === i);
    return fields.length === 1 ? fields[0] : undefined;
  }

  /**
   * Generate summary for error group
   */
  private generateGroupSummary(category: ErrorCategory, errors: EnrichedError[]): string {
    const field = this.findCommonField(errors);
    if (field) {
      return `${errors.length} ${category} errors in field '${field}'`;
    }
    return `${errors.length} ${category} errors across multiple fields`;
  }

  /**
   * Count errors by severity
   */
  private countBySeverity(errors: EnrichedError[]) {
    return {
      error: errors.filter(e => e.severity === Severity.ERROR).length,
      warning: errors.filter(e => e.severity === Severity.WARNING).length,
      info: errors.filter(e => e.severity === Severity.INFO).length
    };
  }

  /**
   * Count errors by category
   */
  private countByCategory(errors: EnrichedError[]): Map<ErrorCategory, number> {
    const counts = new Map<ErrorCategory, number>();

    errors.forEach(error => {
      const category = error.message.category;
      counts.set(category, (counts.get(category) || 0) + 1);
    });

    return counts;
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const errorReportingService = new ErrorReportingService();
