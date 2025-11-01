/**
 * ValidationService
 * Comprehensive data validation framework for data migration
 * Provides schema validation, business rules, referential integrity checks,
 * duplicate detection, and data quality scoring
 */

// ============================================================================
// Enums and Types
// ============================================================================

export enum ValidationType {
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  DATA_TYPE = 'DATA_TYPE',
  FORMAT = 'FORMAT',
  RANGE = 'RANGE',
  ENUM = 'ENUM',
  FOREIGN_KEY = 'FOREIGN_KEY',
  UNIQUE = 'UNIQUE',
  BUSINESS_RULE = 'BUSINESS_RULE',
  CONSISTENCY = 'CONSISTENCY',
  DUPLICATE = 'DUPLICATE',
  CUSTOM = 'CUSTOM'
}

export enum EntityType {
  PART = 'Part',
  BOM_ITEM = 'BOMItem',
  SITE = 'Site',
  WORK_ORDER = 'WorkOrder',
  MATERIAL_LOT = 'MaterialLot',
  OPERATION = 'Operation',
  EQUIPMENT = 'Equipment',
  USER = 'User',
  WORK_CENTER = 'WorkCenter',
  ROUTING = 'Routing'
}

export enum Severity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO'
}

export enum ValidationMode {
  PRE_IMPORT = 'pre-import',
  IMPORT = 'import',
  POST_IMPORT = 'post-import',
  ON_DEMAND = 'on-demand'
}

// ============================================================================
// Validation Error Interfaces
// ============================================================================

export interface ValidationError {
  field: string;
  errorType: ValidationType;
  severity: Severity;
  message: string;
  actualValue: any;
  expectedValue?: any;
  suggestedFix?: string;
  ruleId: string;
  rowNumber?: number;
}

export interface ValidationWarning {
  field: string;
  severity: Severity;
  message: string;
  actualValue: any;
  ruleId: string;
  rowNumber?: number;
}

export interface ValidationInfo {
  message: string;
  ruleId: string;
}

// ============================================================================
// Validation Result Interfaces
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  infos: ValidationInfo[];
  record: any;
  qualityScore: number;
  rowNumber?: number;
}

export interface BatchValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  totalErrors: number;
  totalWarnings: number;
  results: ValidationResult[];
  overallQualityScore: number;
  dimensionScores: DimensionScores;
}

export interface DatasetValidationResult {
  valid: boolean;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  totalErrors: number;
  totalWarnings: number;
  duplicateCount: number;
  overallQualityScore: number;
  dimensionScores: DimensionScores;
  errorSummary: ErrorSummary[];
  results: ValidationResult[];
}

export interface DimensionScores {
  completeness: number; // % of required fields present
  validity: number;     // % of values matching type/format rules
  consistency: number;  // % of values logically consistent
  accuracy: number;     // % of values accurate per business rules
}

export interface DataQualityScore {
  overallScore: number;
  completeness: number;
  validity: number;
  consistency: number;
  accuracy: number;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errorCount: number;
  warningCount: number;
}

export interface ErrorSummary {
  errorType: ValidationType;
  count: number;
  severity: Severity;
  examples: ValidationError[];
}

// ============================================================================
// Validation Context
// ============================================================================

export interface ValidationContext {
  mode: ValidationMode;
  skipForeignKeyChecks?: boolean;
  validateDuplicates?: boolean;
  existingRecords?: Map<string, any>; // For duplicate detection
  userId?: string;
  timestamp?: Date;
}

// ============================================================================
// Validation Rule Interfaces
// ============================================================================

export interface RequiredRule {
  allowEmpty: boolean;
  allowNull: boolean;
  allowWhitespace: boolean;
}

export interface DataTypeRule {
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  subType?: string; // e.g., 'integer', 'float', 'email', 'url', 'uuid'
}

export interface FormatRule {
  pattern: string; // Regex pattern
  message: string;
  flags?: string; // Regex flags
}

export interface RangeRule {
  min?: number;
  max?: number;
  inclusive: boolean;
}

export interface EnumRule {
  values: string[] | number[];
  caseSensitive: boolean;
  allowNull: boolean;
}

export interface ForeignKeyRule {
  table: string;
  field: string;
  displayField?: string; // Field to show in error messages
  allowNull?: boolean;
}

export interface UniqueRule {
  scope: 'batch' | 'database' | 'both';
  caseSensitive: boolean;
  allowNull: boolean;
  ignoreFields?: string[]; // Fields to ignore in uniqueness check
}

export interface BusinessRule {
  validate: (record: any, context?: ValidationContext) => Promise<RuleValidationResult>;
  description: string;
}

export interface CustomRule {
  validate: (record: any, context?: ValidationContext) => Promise<RuleValidationResult>;
}

export interface RuleValidationResult {
  valid: boolean;
  message?: string;
  suggestedFix?: string;
}

export interface ValidationRule {
  id: string;
  entityType: EntityType;
  field?: string; // Field-level rule (null = record-level)
  ruleType: ValidationType;
  severity: Severity;
  description: string;
  condition?: string; // Conditional logic (e.g., "record.status === 'ACTIVE'")
  enabled: boolean;
  version: number;

  // Rule-specific configurations
  requiredRule?: RequiredRule;
  dataTypeRule?: DataTypeRule;
  formatRule?: FormatRule;
  rangeRule?: RangeRule;
  enumRule?: EnumRule;
  foreignKeyRule?: ForeignKeyRule;
  uniqueRule?: UniqueRule;
  businessRule?: BusinessRule;
  customRule?: CustomRule;

  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================================================
// Internal Result Types
// ============================================================================

interface RuleResult {
  valid: boolean;
  error?: ValidationError;
}

// ============================================================================
// ValidationService Class
// ============================================================================

export class ValidationService {
  private ruleRegistry: Map<EntityType, ValidationRule[]> = new Map();
  private foreignKeyCache: Map<string, boolean> = new Map();
  private readonly MAX_CACHE_SIZE = 100000;
  private readonly CACHE_TTL_MS = 3600000; // 1 hour
  private cacheTimestamp: Date = new Date();

  /**
   * Initialize validation service with rule registry
   */
  async initialize(): Promise<void> {
    // Rules will be registered via addRule() method
    // This method can be extended to load rules from database in future
    console.log('ValidationService initialized');
  }

  /**
   * Validate a single record
   */
  async validateRecord(
    record: any,
    entityType: EntityType,
    context: ValidationContext = { mode: ValidationMode.ON_DEMAND }
  ): Promise<ValidationResult> {
    const rules = this.ruleRegistry.get(entityType) || [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const infos: ValidationInfo[] = [];

    // Apply all rules
    for (const rule of rules) {
      if (!rule.enabled) continue;

      // Check condition if present
      if (rule.condition && !this.evaluateCondition(rule.condition, record)) {
        continue;
      }

      try {
        const result = await this.applyRule(record, rule, context);
        if (!result.valid && result.error) {
          if (rule.severity === Severity.ERROR) {
            errors.push(result.error);
          } else if (rule.severity === Severity.WARNING) {
            warnings.push(result.error as ValidationWarning);
          }
        }
      } catch (error) {
        console.error(`Error applying rule ${rule.id}:`, error);
        errors.push({
          field: rule.field || 'record',
          errorType: ValidationType.CUSTOM,
          severity: Severity.ERROR,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          actualValue: null,
          ruleId: rule.id
        });
      }
    }

    const valid = errors.length === 0;
    const qualityScore = this.calculateRecordQualityScore(record, errors, warnings, rules);

    return {
      valid,
      errors,
      warnings,
      infos,
      record,
      qualityScore
    };
  }

  /**
   * Validate multiple records (batch)
   */
  async validateBatch(
    records: any[],
    entityType: EntityType,
    context: ValidationContext = { mode: ValidationMode.PRE_IMPORT }
  ): Promise<BatchValidationResult> {
    const results: ValidationResult[] = [];
    const existingRecordsMap = new Map<string, any>();

    // Add existing records to context for duplicate detection
    if (context.validateDuplicates && context.existingRecords) {
      context.existingRecords.forEach((v, k) => existingRecordsMap.set(k, v));
    }

    // Validate each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const recordContext = { ...context, existingRecords: existingRecordsMap };
      const result = await this.validateRecord(record, entityType, recordContext);
      result.rowNumber = i + 2; // +2 because row 1 is header, rows start at 1
      results.push(result);
    }

    // Calculate batch-level statistics
    const validRecords = results.filter(r => r.valid).length;
    const invalidRecords = results.length - validRecords;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);

    const dimensionScores = this.calculateDimensionScores(results);
    const overallQualityScore = this.calculateOverallQualityScore(results);

    return {
      valid: invalidRecords === 0,
      totalRecords: records.length,
      validRecords,
      invalidRecords,
      totalErrors,
      totalWarnings,
      results,
      overallQualityScore,
      dimensionScores
    };
  }

  /**
   * Validate entire dataset (pre-import)
   */
  async validateDataset(
    records: any[],
    entityType: EntityType
  ): Promise<DatasetValidationResult> {
    const context: ValidationContext = {
      mode: ValidationMode.PRE_IMPORT,
      validateDuplicates: true,
      existingRecords: new Map()
    };

    const batchResult = await this.validateBatch(records, entityType, context);

    // Detect duplicates within dataset
    const duplicateCount = this.detectDuplicatesInDataset(records, entityType);

    // Create error summary
    const errorSummary = this.createErrorSummary(batchResult.results);

    return {
      valid: batchResult.valid && duplicateCount === 0,
      totalRecords: batchResult.totalRecords,
      validRecords: batchResult.validRecords,
      invalidRecords: batchResult.invalidRecords,
      totalErrors: batchResult.totalErrors,
      totalWarnings: batchResult.totalWarnings,
      duplicateCount,
      overallQualityScore: batchResult.overallQualityScore,
      dimensionScores: batchResult.dimensionScores,
      errorSummary,
      results: batchResult.results
    };
  }

  /**
   * Get validation rules for entity type
   */
  getRules(entityType: EntityType): ValidationRule[] {
    return this.ruleRegistry.get(entityType) || [];
  }

  /**
   * Add validation rule
   */
  addRule(rule: ValidationRule): void {
    if (!this.ruleRegistry.has(rule.entityType)) {
      this.ruleRegistry.set(rule.entityType, []);
    }
    this.ruleRegistry.get(rule.entityType)!.push(rule);
  }

  /**
   * Add multiple rules at once
   */
  addRules(rules: ValidationRule[]): void {
    rules.forEach(rule => this.addRule(rule));
  }

  /**
   * Apply single rule to record
   */
  private async applyRule(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<RuleResult> {
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
        return await this.validateCustom(record, rule, context);

      default:
        return { valid: true };
    }
  }

  /**
   * Validate required field
   */
  private validateRequired(record: any, rule: ValidationRule): RuleResult {
    const value = record[rule.field!];
    const config = rule.requiredRule || { allowEmpty: false, allowNull: false, allowWhitespace: false };

    let isEmpty = false;

    if (config.allowNull && value === null) {
      return { valid: true };
    }

    if (config.allowNull && value === undefined) {
      return { valid: true };
    }

    if (value === null || value === undefined) {
      isEmpty = true;
    }

    if (typeof value === 'string') {
      if (!config.allowEmpty && value.length === 0) {
        isEmpty = true;
      }
      if (!config.allowWhitespace && value.trim().length === 0) {
        isEmpty = true;
      }
    }

    if (isEmpty) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.REQUIRED_FIELD,
          severity: rule.severity,
          message: `${rule.field} is required`,
          actualValue: value,
          expectedValue: 'non-empty value',
          suggestedFix: `Provide a value for ${rule.field}`,
          ruleId: rule.id
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate data type
   */
  private validateDataType(record: any, rule: ValidationRule): RuleResult {
    const value = record[rule.field!];
    if (value === null || value === undefined) {
      return { valid: true }; // Handled by required validation
    }

    const config = rule.dataTypeRule!;
    let actualType = typeof value;
    let valid = false;

    switch (config.type) {
      case 'string':
        valid = typeof value === 'string';
        break;

      case 'number':
        valid = typeof value === 'number' && !isNaN(value);
        if (valid && config.subType === 'integer') {
          valid = Number.isInteger(value);
        }
        break;

      case 'boolean':
        valid = typeof value === 'boolean';
        break;

      case 'date':
        valid = value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)));
        actualType = 'date';
        break;

      case 'array':
        valid = Array.isArray(value);
        break;

      case 'object':
        valid = typeof value === 'object' && value !== null && !Array.isArray(value);
        break;
    }

    if (!valid) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.DATA_TYPE,
          severity: rule.severity,
          message: `${rule.field} must be of type ${config.type}, got ${actualType}`,
          actualValue: value,
          expectedValue: config.type,
          suggestedFix: `Convert ${rule.field} to ${config.type}`,
          ruleId: rule.id
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate format (regex)
   */
  private validateFormat(record: any, rule: ValidationRule): RuleResult {
    const value = record[rule.field!];
    if (value === null || value === undefined) {
      return { valid: true };
    }

    const config = rule.formatRule!;
    const regex = new RegExp(config.pattern, config.flags);

    const valid = regex.test(String(value));

    if (!valid) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.FORMAT,
          severity: rule.severity,
          message: config.message,
          actualValue: value,
          expectedValue: `Matches pattern: ${config.pattern}`,
          suggestedFix: config.message,
          ruleId: rule.id
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate range
   */
  private validateRange(record: any, rule: ValidationRule): RuleResult {
    const value = record[rule.field!];
    if (value === null || value === undefined || typeof value !== 'number') {
      return { valid: true };
    }

    const config = rule.rangeRule!;
    const minValid = config.min === undefined || (config.inclusive ? value >= config.min : value > config.min);
    const maxValid = config.max === undefined || (config.inclusive ? value <= config.max : value < config.max);

    if (!minValid || !maxValid) {
      let expectedValue = '';
      if (config.min !== undefined && config.max !== undefined) {
        expectedValue = `${config.inclusive ? '[' : '('}${config.min}, ${config.max}${config.inclusive ? ']' : ')'}`;
      } else if (config.min !== undefined) {
        expectedValue = `${config.inclusive ? '>=' : '>'} ${config.min}`;
      } else if (config.max !== undefined) {
        expectedValue = `${config.inclusive ? '<=' : '<'} ${config.max}`;
      }

      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.RANGE,
          severity: rule.severity,
          message: `${rule.field} is out of range`,
          actualValue: value,
          expectedValue,
          suggestedFix: `Ensure ${rule.field} is within ${expectedValue}`,
          ruleId: rule.id
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate enum
   */
  private validateEnum(record: any, rule: ValidationRule): RuleResult {
    const value = record[rule.field!];
    if (value === null || value === undefined) {
      const config = rule.enumRule!;
      if (config.allowNull) {
        return { valid: true };
      }
    }

    const config = rule.enumRule!;
    const compareValue = config.caseSensitive ? value : String(value).toLowerCase();
    const validValues = config.caseSensitive
      ? config.values
      : config.values.map(v => String(v).toLowerCase());

    if (!validValues.includes(compareValue)) {
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.ENUM,
          severity: rule.severity,
          message: `${rule.field} must be one of: ${config.values.join(', ')}`,
          actualValue: value,
          expectedValue: config.values.join(', '),
          suggestedFix: `Choose one of: ${config.values.join(', ')}`,
          ruleId: rule.id
        }
      };
    }

    return { valid: true };
  }

  /**
   * Validate foreign key
   */
  private async validateForeignKey(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<RuleResult> {
    // Skip foreign key checks if disabled in context
    if (context?.skipForeignKeyChecks) {
      return { valid: true };
    }

    const value = record[rule.field!];
    const config = rule.foreignKeyRule!;

    if (value === null || value === undefined) {
      if (config.allowNull) {
        return { valid: true };
      }
      return {
        valid: false,
        error: {
          field: rule.field!,
          errorType: ValidationType.FOREIGN_KEY,
          severity: rule.severity,
          message: `${rule.field} is required (foreign key)`,
          actualValue: value,
          expectedValue: 'non-null value',
          suggestedFix: `Provide a valid reference to ${config.table}`,
          ruleId: rule.id
        }
      };
    }

    // Check cache
    const cacheKey = `${config.table}:${config.field}:${value}`;
    if (this.foreignKeyCache.has(cacheKey)) {
      return { valid: true };
    }

    // TODO: Query database when Prisma client is available
    // For now, assume valid (will be implemented in Phase 2)
    this.foreignKeyCache.set(cacheKey, true);

    if (this.foreignKeyCache.size > this.MAX_CACHE_SIZE) {
      this.clearCache();
    }

    return { valid: true };
  }

  /**
   * Validate unique constraint
   */
  private async validateUnique(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<RuleResult> {
    const value = record[rule.field!];
    const config = rule.uniqueRule!;

    if ((value === null || value === undefined) && config.allowNull) {
      return { valid: true };
    }

    const compareValue = config.caseSensitive ? value : String(value).toLowerCase();

    // Check against records in dataset
    if (context?.existingRecords && config.scope !== 'database') {
      if (context.existingRecords.has(compareValue)) {
        return {
          valid: false,
          error: {
            field: rule.field!,
            errorType: ValidationType.UNIQUE,
            severity: rule.severity,
            message: `${rule.field}: '${value}' is not unique within import file`,
            actualValue: value,
            suggestedFix: 'Remove duplicate or use different value',
            ruleId: rule.id
          }
        };
      }
      context.existingRecords.set(compareValue, record);
    }

    // TODO: Query database when Prisma client is available
    // For now, only check against existing records in context

    return { valid: true };
  }

  /**
   * Validate business rule
   */
  private async validateBusinessRule(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<RuleResult> {
    const config = rule.businessRule!;

    try {
      const result = await config.validate(record, context);

      if (!result.valid) {
        return {
          valid: false,
          error: {
            field: rule.field || 'record',
            errorType: ValidationType.BUSINESS_RULE,
            severity: rule.severity,
            message: result.message || rule.description,
            actualValue: null,
            suggestedFix: result.suggestedFix,
            ruleId: rule.id
          }
        };
      }

      return { valid: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Validate custom rule
   */
  private async validateCustom(
    record: any,
    rule: ValidationRule,
    context?: ValidationContext
  ): Promise<RuleResult> {
    const config = rule.customRule!;

    try {
      const result = await config.validate(record, context);

      if (!result.valid) {
        return {
          valid: false,
          error: {
            field: rule.field || 'record',
            errorType: ValidationType.CUSTOM,
            severity: rule.severity,
            message: result.message || rule.description,
            actualValue: null,
            suggestedFix: result.suggestedFix,
            ruleId: rule.id
          }
        };
      }

      return { valid: true };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Evaluate conditional expression
   */
  private evaluateCondition(condition: string, record: any): boolean {
    try {
      // Simple condition evaluation using Function constructor
      // More complex conditions should use eval with proper sandboxing in production
      const fn = new Function('record', `return ${condition}`);
      return fn(record) === true;
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return false;
    }
  }

  /**
   * Calculate quality score for single record
   */
  private calculateRecordQualityScore(
    record: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    rules: ValidationRule[]
  ): number {
    if (errors.length === 0 && warnings.length === 0) {
      return 100;
    }

    // Weight: 10 points per error, 2 points per warning
    let score = 100;
    score -= errors.length * 10;
    score -= warnings.length * 2;

    return Math.max(0, score);
  }

  /**
   * Calculate dimension scores
   */
  private calculateDimensionScores(results: ValidationResult[]): DimensionScores {
    if (results.length === 0) {
      return { completeness: 100, validity: 100, consistency: 100, accuracy: 100 };
    }

    // Completeness: % of records with no required field errors
    const completenessCount = results.filter(r =>
      !r.errors.some(e => e.errorType === ValidationType.REQUIRED_FIELD)
    ).length;

    // Validity: % of records with no data type/format errors
    const validityCount = results.filter(r =>
      !r.errors.some(e =>
        e.errorType === ValidationType.DATA_TYPE ||
        e.errorType === ValidationType.FORMAT ||
        e.errorType === ValidationType.RANGE ||
        e.errorType === ValidationType.ENUM
      )
    ).length;

    // Consistency: % of records with no consistency/uniqueness errors
    const consistencyCount = results.filter(r =>
      !r.errors.some(e =>
        e.errorType === ValidationType.UNIQUE ||
        e.errorType === ValidationType.CONSISTENCY ||
        e.errorType === ValidationType.DUPLICATE
      )
    ).length;

    // Accuracy: % of records with no foreign key or business rule errors
    const accuracyCount = results.filter(r =>
      !r.errors.some(e =>
        e.errorType === ValidationType.FOREIGN_KEY ||
        e.errorType === ValidationType.BUSINESS_RULE
      )
    ).length;

    return {
      completeness: Math.round((completenessCount / results.length) * 100),
      validity: Math.round((validityCount / results.length) * 100),
      consistency: Math.round((consistencyCount / results.length) * 100),
      accuracy: Math.round((accuracyCount / results.length) * 100)
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateOverallQualityScore(results: ValidationResult[]): number {
    if (results.length === 0) return 100;

    const avgScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / results.length;
    return Math.round(avgScore);
  }

  /**
   * Detect duplicates within dataset
   */
  private detectDuplicatesInDataset(records: any[], entityType: EntityType): number {
    // TODO: Implement comprehensive duplicate detection
    // For now, return 0
    return 0;
  }

  /**
   * Create error summary
   */
  private createErrorSummary(results: ValidationResult[]): ErrorSummary[] {
    const summary = new Map<ValidationType, ErrorSummary>();

    for (const result of results) {
      for (const error of result.errors) {
        if (!summary.has(error.errorType)) {
          summary.set(error.errorType, {
            errorType: error.errorType,
            count: 0,
            severity: error.severity,
            examples: []
          });
        }

        const entry = summary.get(error.errorType)!;
        entry.count++;

        // Keep first 3 examples
        if (entry.examples.length < 3) {
          entry.examples.push(error);
        }
      }
    }

    return Array.from(summary.values());
  }

  /**
   * Clear foreign key cache
   */
  private clearCache(): void {
    // Keep cache fresh - clear if older than TTL
    const now = new Date();
    if (now.getTime() - this.cacheTimestamp.getTime() > this.CACHE_TTL_MS) {
      this.foreignKeyCache.clear();
      this.cacheTimestamp = now;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.foreignKeyCache.size,
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.foreignKeyCache.clear();
    this.cacheTimestamp = new Date();
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const validationService = new ValidationService();
