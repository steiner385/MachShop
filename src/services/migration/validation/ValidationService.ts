/**
 * Data Validation Framework Core Service (Issue #33)
 * Phase 1-2: Core validation engine with multi-level validation support
 */

import { prisma } from '../../../db';
import { logger } from '../../../utils/logger';
import {
  ValidationResult,
  BatchValidationResult,
  DatasetValidationResult,
  ValidationError,
  ValidationRule,
  ValidationType,
  ValidationSeverity,
  ValidationContext,
  DataQualityScore,
  EntityType,
  DuplicateRecord,
  ValidationSummary,
} from './types';

export class ValidationService {
  private ruleRegistry: Map<EntityType, ValidationRule[]> = new Map();
  private foreignKeyCache: Map<string, boolean> = new Map();
  private cacheMaxSize = 10000;

  /**
   * Initialize validation framework with default rules
   */
  async initialize(): Promise<void> {
    logger.info('Initializing ValidationService');

    // Load rules from database (Phase 3+)
    // For now, rules are defined in RuleRegistry
    // TODO: Implement loadRulesFromDatabase() in Phase 3
  }

  /**
   * Validate single record
   */
  async validateRecord(
    record: any,
    entityType: EntityType,
    context?: ValidationContext
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const infos: ValidationInfo[] = [];

    const rules = this.ruleRegistry.get(entityType) || [];

    for (const rule of rules) {
      if (!rule.isActive) continue;

      // Check conditional rule
      if (rule.condition && !this.evaluateCondition(rule.condition, record)) {
        continue;
      }

      const result = await this.applyRule(record, rule, context);

      if (!result.valid) {
        const error = {
          ...result.error,
          rowNumber: context?.batchNumber,
        };

        if (rule.severity === ValidationSeverity.ERROR) {
          errors.push(error);
        } else if (rule.severity === ValidationSeverity.WARNING) {
          warnings.push(error);
        } else if (rule.severity === ValidationSeverity.INFO) {
          infos.push(error);
        }
      }
    }

    const qualityScore = this.calculateRecordQualityScore(errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      infos,
      record,
      qualityScore,
    };
  }

  /**
   * Validate batch of records
   */
  async validateBatch(
    records: any[],
    entityType: EntityType,
    context?: ValidationContext
  ): Promise<BatchValidationResult> {
    const startTime = Date.now();
    const results: ValidationResult[] = [];

    for (let i = 0; i < records.length; i++) {
      const batchContext = {
        ...context,
        batchNumber: i,
      };

      const result = await this.validateRecord(records[i], entityType, batchContext);
      results.push(result);
    }

    const validRecords = results.filter((r) => r.valid).length;
    const qualityScore = this.calculateBatchQualityScore(results);
    const duration = Date.now() - startTime;

    return {
      totalRecords: records.length,
      validRecords,
      invalidRecords: records.length - validRecords,
      results,
      qualityScore,
      duration,
    };
  }

  /**
   * Validate entire dataset (includes duplicate detection)
   */
  async validateDataset(
    dataset: any[],
    entityType: EntityType
  ): Promise<DatasetValidationResult> {
    const startTime = Date.now();
    const context: ValidationContext = {
      mode: 'pre-import',
      validateDuplicates: true,
      existingRecords: new Map(),
    };

    // Validate each record
    const batchResult = await this.validateBatch(dataset, entityType, context);

    // Detect duplicates within dataset
    const duplicatesWithinDataset = this.detectDuplicates(dataset, entityType, 'file');

    // Detect duplicates against database
    const duplicatesWithinDatabase = await this.detectDuplicatesInDatabase(
      dataset,
      entityType
    );

    // Generate summary
    const summary = this.generateValidationSummary(
      entityType,
      batchResult.results,
      duplicatesWithinDataset,
      duplicatesWithinDatabase
    );

    const duration = Date.now() - startTime;

    return {
      ...batchResult,
      duplicatesWithinDataset,
      duplicatesWithinDatabase,
      summary,
      duration,
    };
  }

  /**
   * Get validation rules for entity type
   */
  getRules(entityType: EntityType): ValidationRule[] {
    return this.ruleRegistry.get(entityType) || [];
  }

  /**
   * Register validation rules for entity
   */
  registerRules(entityType: EntityType, rules: ValidationRule[]): void {
    this.ruleRegistry.set(entityType, rules);
    logger.info(`Registered ${rules.length} rules for ${entityType}`);
  }

  /**
   * Add or update single rule
   */
  addRule(rule: ValidationRule): void {
    const rules = this.ruleRegistry.get(rule.entityType) || [];
    const index = rules.findIndex((r) => r.id === rule.id);

    if (index >= 0) {
      rules[index] = rule;
    } else {
      rules.push(rule);
    }

    this.ruleRegistry.set(rule.entityType, rules);
  }

  /**
   * Apply single validation rule
   */
  private async applyRule(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<{ valid: boolean; error?: ValidationError }> {
    try {
      switch (rule.ruleType) {
        case ValidationType.REQUIRED_FIELD:
          return this.validateRequired(record, rule);

        case ValidationType.DATA_TYPE:
          return this.validateDataType(record, rule);

        case ValidationType.FORMAT:
          return this.validateFormat(record, rule);

        case ValidationType.RANGE:
          return this.validateRange(record, rule);

        case ValidationType.ENUM:
          return this.validateEnum(record, rule);

        case ValidationType.FOREIGN_KEY:
          return await this.validateForeignKey(record, rule, context);

        case ValidationType.UNIQUE:
          return await this.validateUnique(record, rule, context);

        case ValidationType.BUSINESS_RULE:
          return await this.validateBusinessRule(record, rule, context);

        case ValidationType.CUSTOM:
          return await rule.customRule!.validate(record, context);

        default:
          return { valid: true };
      }
    } catch (error) {
      logger.error(`Rule validation error: ${rule.id}`, { error, record });
      return {
        valid: false,
        error: {
          field: rule.field || 'unknown',
          errorType: rule.ruleType,
          severity: ValidationSeverity.ERROR,
          message: `Validation error: ${error instanceof Error ? error.message : String(error)}`,
          actualValue: record[rule.field || 'unknown'],
          ruleId: rule.id,
        },
      };
    }
  }

  /**
   * Validate required field
   */
  private validateRequired(
    record: any,
    rule: ValidationRule
  ): { valid: boolean; error?: ValidationError } {
    const { allowEmpty = false, allowNull = false } = rule.requiredRule || {};
    const value = record[rule.field];

    if (value === null || value === undefined) {
      if (!allowNull) {
        return {
          valid: false,
          error: {
            field: rule.field!,
            errorType: ValidationType.REQUIRED_FIELD,
            severity: rule.severity,
            message: `${rule.field} is required`,
            actualValue: value,
            expectedValue: 'non-null value',
            suggestedFix: 'Provide a value for this field',
            ruleId: rule.id,
          },
        };
      }
    }

    if (typeof value === 'string' && value.trim() === '') {
      if (!allowEmpty) {
        return {
          valid: false,
          error: {
            field: rule.field!,
            errorType: ValidationType.REQUIRED_FIELD,
            severity: rule.severity,
            message: `${rule.field} cannot be empty`,
            actualValue: value,
            expectedValue: 'non-empty string',
            suggestedFix: 'Provide a non-empty value',
            ruleId: rule.id,
          },
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate data type
   */
  private validateDataType(
    record: any,
    rule: ValidationRule
  ): { valid: boolean; error?: ValidationError } {
    const { expectedType } = rule.dataTypeRule || { expectedType: 'string' };
    const value = record[rule.field];

    if (value === null || value === undefined) {
      return { valid: true }; // Handled by required validation
    }

    const actualType = typeof value;
    const isValid =
      (expectedType === 'string' && typeof value === 'string') ||
      (expectedType === 'number' && typeof value === 'number') ||
      (expectedType === 'boolean' && typeof value === 'boolean') ||
      (expectedType === 'date' && value instanceof Date) ||
      (expectedType === 'array' && Array.isArray(value)) ||
      (expectedType === 'object' && typeof value === 'object' && !Array.isArray(value));

    if (!isValid) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.DATA_TYPE,
          severity: rule.severity,
          message: `${rule.field} must be ${expectedType}, got ${actualType}`,
          actualValue: value,
          expectedValue: expectedType,
          suggestedFix: `Convert value to ${expectedType}`,
          ruleId: rule.id,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate format (regex)
   */
  private validateFormat(
    record: any,
    rule: ValidationRule
  ): { valid: boolean; error?: ValidationError } {
    const { pattern, message } = rule.formatRule || { pattern: '.*', message: 'Invalid format' };
    const value = record[rule.field];

    if (!value || typeof value !== 'string') {
      return { valid: true };
    }

    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.FORMAT,
          severity: rule.severity,
          message: `${rule.field}: ${message}`,
          actualValue: value,
          expectedValue: `matches pattern: ${pattern}`,
          suggestedFix: message,
          ruleId: rule.id,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate range
   */
  private validateRange(
    record: any,
    rule: ValidationRule
  ): { valid: boolean; error?: ValidationError } {
    const { min, max, inclusive } = rule.rangeRule || { inclusive: true };
    const value = record[rule.field];

    if (value === null || value === undefined || typeof value !== 'number') {
      return { valid: true };
    }

    const minValid = min === undefined || (inclusive ? value >= min : value > min);
    const maxValid = max === undefined || (inclusive ? value <= max : value < max);

    if (!minValid || !maxValid) {
      const bounds = `${inclusive ? '[' : '('}${min || '∞'}, ${max || '∞'}${inclusive ? ']' : ')'}`;
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.RANGE,
          severity: rule.severity,
          message: `${rule.field} must be in range ${bounds}`,
          actualValue: value,
          expectedValue: bounds,
          ruleId: rule.id,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate enum
   */
  private validateEnum(
    record: any,
    rule: ValidationRule
  ): { valid: boolean; error?: ValidationError } {
    const { values = [], caseSensitive } = rule.enumRule || { values: [], caseSensitive: true };
    const value = record[rule.field];

    if (value === null || value === undefined) {
      return { valid: true };
    }

    const enumValues = caseSensitive
      ? values
      : values.map((v) => (typeof v === 'string' ? v.toLowerCase() : v));
    const compareValue = caseSensitive ? value : typeof value === 'string' ? value.toLowerCase() : value;

    if (!enumValues.includes(compareValue)) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.ENUM,
          severity: rule.severity,
          message: `${rule.field} must be one of: ${values.join(', ')}`,
          actualValue: value,
          expectedValue: values.join(' | '),
          suggestedFix: `Use one of the valid values: ${values.join(', ')}`,
          ruleId: rule.id,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Validate foreign key existence
   */
  private async validateForeignKey(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<{ valid: boolean; error?: ValidationError }> {
    if (context?.skipForeignKeyChecks) {
      return { valid: true };
    }

    const fkValue = record[rule.field];
    if (!fkValue) {
      return { valid: true };
    }

    const { table, field, optional } = rule.foreignKeyRule || {
      table: '',
      field: 'id',
      optional: false,
    };

    // Check cache
    const cacheKey = `${table}:${field}:${fkValue}`;
    if (this.foreignKeyCache.has(cacheKey)) {
      return { valid: true };
    }

    try {
      // Query database
      const exists = await (prisma as any)[table].findUnique({
        where: { [field]: fkValue },
        select: { [field]: true },
      });

      if (exists) {
        this.addToCache(cacheKey, true);
        return { valid: true };
      }

      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.FOREIGN_KEY,
          severity: rule.severity,
          message: `${table} with ${field}='${fkValue}' does not exist`,
          actualValue: fkValue,
          expectedValue: `existing ${table}.${field}`,
          suggestedFix: `Create ${table} record or use existing ID`,
          ruleId: rule.id,
        },
      };
    } catch (error) {
      logger.error(`Foreign key validation error`, { error, table, field });
      return { valid: true }; // Don't block on FK validation errors
    }
  }

  /**
   * Validate business rule
   */
  private async validateBusinessRule(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<{ valid: boolean; error?: ValidationError }> {
    if (!rule.businessRule) {
      return { valid: true };
    }

    const result = await rule.businessRule.validate(record, context);

    if (!result.valid) {
      return {
        valid: false,
        error: {
          field: rule.field || 'record',
          errorType: ValidationType.BUSINESS_RULE,
          severity: rule.severity,
          message: result.message,
          actualValue: record,
          suggestedFix: result.suggestedFix,
          ruleId: rule.id,
        },
      };
    }

    return { valid: true };
  }

  /**
   * Detect duplicates within dataset
   */
  private detectDuplicates(
    records: any[],
    entityType: EntityType,
    scope: 'file' | 'database'
  ): DuplicateRecord[] {
    const duplicates: DuplicateRecord[] = [];
    const rules = this.ruleRegistry.get(entityType) || [];
    const uniqueRules = rules.filter((r) => r.ruleType === ValidationType.UNIQUE && r.uniqueRule?.scope === scope);

    for (const rule of uniqueRules) {
      const field = rule.field;
      if (!field) continue;

      const seen = new Map<string, number[]>();

      records.forEach((record, index) => {
        const value = record[field];
        if (value === null || value === undefined) return;

        const key =
          rule.uniqueRule?.caseSensitive || typeof value !== 'string'
            ? String(value)
            : String(value).toLowerCase();

        if (!seen.has(key)) {
          seen.set(key, []);
        }
        seen.get(key)!.push(index);
      });

      // Collect duplicates
      seen.forEach((rows, value) => {
        if (rows.length > 1) {
          duplicates.push({
            field,
            value,
            count: rows.length,
            rows,
          });
        }
      });
    }

    return duplicates;
  }

  /**
   * Detect duplicates in database
   */
  private async detectDuplicatesInDatabase(
    records: any[],
    entityType: EntityType
  ): Promise<DuplicateRecord[]> {
    const duplicates: DuplicateRecord[] = [];
    const rules = this.ruleRegistry.get(entityType) || [];
    const uniqueRules = rules.filter((r) => r.ruleType === ValidationType.UNIQUE && r.uniqueRule?.scope === 'database');

    for (const rule of uniqueRules) {
      const field = rule.field;
      if (!field) continue;

      const values = records.map((r) => r[field]).filter((v) => v !== null && v !== undefined);

      if (values.length === 0) continue;

      try {
        const existing = await (prisma as any)[entityType].findMany({
          where: {
            [field]: {
              in: values,
            },
          },
          select: { [field]: true, id: true },
        });

        existing.forEach((record: any) => {
          const rows = records
            .map((r, idx) => (r[field] === record[field] ? idx : -1))
            .filter((idx) => idx >= 0);

          duplicates.push({
            field,
            value: record[field],
            count: rows.length + 1,
            rows,
            databaseRecordId: record.id,
          });
        });
      } catch (error) {
        logger.warn(`Database duplicate check failed for ${entityType}.${field}`);
      }
    }

    return duplicates;
  }

  /**
   * Evaluate conditional logic
   */
  private evaluateCondition(condition: string, record: any): boolean {
    try {
      // Simple evaluation - improve in Phase 2 with better expression evaluator
      const fn = new Function('record', `return ${condition}`);
      return fn(record) === true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate quality score for single record
   */
  private calculateRecordQualityScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    return Math.max(0, 100 - errors.length * 10 - warnings.length * 2);
  }

  /**
   * Calculate quality score for batch
   */
  private calculateBatchQualityScore(results: ValidationResult[]): DataQualityScore {
    const totalRecords = results.length;
    const validRecords = results.filter((r) => r.valid).length;
    const errorCount = results.reduce((sum, r) => sum + r.errors.length, 0);
    const warningCount = results.reduce((sum, r) => sum + r.warnings.length, 0);

    const overallScore = Math.max(0, 100 - (errorCount * 10) / Math.max(1, totalRecords) - (warningCount * 2) / Math.max(1, totalRecords));

    return {
      overallScore: Math.round(overallScore),
      completeness: this.calculateCompletenessScore(results),
      validity: Math.round((validRecords / Math.max(1, totalRecords)) * 100),
      consistency: Math.round(Math.max(0, 100 - (errorCount / Math.max(1, totalRecords)) * 10)),
      accuracy: Math.round(Math.max(0, 100 - (warningCount / Math.max(1, totalRecords)) * 5)),
      totalRecords,
      validRecords,
      invalidRecords: totalRecords - validRecords,
      errorCount,
      warningCount,
      timestamp: new Date(),
    };
  }

  /**
   * Calculate completeness score (% of records with all required fields)
   */
  private calculateCompletenessScore(results: ValidationResult[]): number {
    if (results.length === 0) return 0;

    const completeRecords = results.filter(
      (r) => !r.errors.some((e) => e.errorType === ValidationType.REQUIRED_FIELD)
    ).length;

    return Math.round((completeRecords / results.length) * 100);
  }

  /**
   * Generate validation summary
   */
  private generateValidationSummary(
    entityType: EntityType,
    results: ValidationResult[],
    duplicatesFile: DuplicateRecord[],
    duplicatesDB: DuplicateRecord[]
  ): ValidationSummary {
    const errorsByType = new Map<ValidationType, number>();
    const errorsByField = new Map<string, number>();

    results.forEach((result) => {
      result.errors.forEach((error) => {
        errorsByType.set(error.errorType, (errorsByType.get(error.errorType) || 0) + 1);
        errorsByField.set(error.field, (errorsByField.get(error.field) || 0) + 1);
      });
    });

    return {
      entityType,
      totalRecords: results.length,
      validRecords: results.filter((r) => r.valid).length,
      invalidRecords: results.filter((r) => !r.valid).length,
      errorsByType,
      errorsByField,
      duplicateCount: duplicatesFile.length + duplicatesDB.length,
      qualityScore: this.calculateBatchQualityScore(results),
    };
  }

  /**
   * Cache management
   */
  private addToCache(key: string, value: boolean): void {
    if (this.foreignKeyCache.size >= this.cacheMaxSize) {
      // Clear half the cache
      const iterator = this.foreignKeyCache.keys();
      for (let i = 0; i < this.cacheMaxSize / 2; i++) {
        this.foreignKeyCache.delete(iterator.next().value);
      }
    }
    this.foreignKeyCache.set(key, value);
  }

  /**
   * Clear FK cache
   */
  clearCache(): void {
    this.foreignKeyCache.clear();
  }
}

export const validationService = new ValidationService();
