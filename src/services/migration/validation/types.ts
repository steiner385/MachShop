/**
 * Type definitions for Data Validation Framework (Issue #33)
 */

export enum ValidationType {
  REQUIRED_FIELD = 'required_field',
  DATA_TYPE = 'data_type',
  FORMAT = 'format',
  RANGE = 'range',
  ENUM = 'enum',
  FOREIGN_KEY = 'foreign_key',
  UNIQUE = 'unique',
  BUSINESS_RULE = 'business_rule',
  CONSISTENCY = 'consistency',
  DUPLICATE = 'duplicate',
  CUSTOM = 'custom',
}

export enum ValidationSeverity {
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

export type EntityType =
  | 'SITE'
  | 'PART'
  | 'EQUIPMENT'
  | 'PERSONNEL'
  | 'ROUTING'
  | 'BOM_ITEM'
  | 'WORK_ORDER'
  | 'MATERIAL_LOT'
  | 'QUALITY_PLAN'
  | 'QUALITY_RESULT';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  infos: ValidationInfo[];
  record: any;
  qualityScore: number;
}

export interface BatchValidationResult {
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  results: ValidationResult[];
  qualityScore: DataQualityScore;
  duration: number; // milliseconds
}

export interface DatasetValidationResult extends BatchValidationResult {
  duplicatesWithinDataset: DuplicateRecord[];
  duplicatesWithinDatabase: DuplicateRecord[];
  summary: ValidationSummary;
}

export interface ValidationError {
  field: string;
  errorType: ValidationType;
  severity: ValidationSeverity;
  message: string;
  actualValue: any;
  expectedValue?: any;
  suggestedFix?: string;
  ruleId: string;
  rowNumber?: number;
}

export interface ValidationWarning extends ValidationError {}

export interface ValidationInfo extends ValidationError {}

export interface ValidationRule {
  id: string;
  entityType: EntityType;
  field?: string; // Field-level rule if specified
  ruleType: ValidationType;
  severity: ValidationSeverity;
  description: string;
  condition?: string; // Optional conditional logic
  isActive: boolean;
  version: number;

  // Rule-specific configurations
  requiredRule?: RequiredFieldRule;
  dataTypeRule?: DataTypeRule;
  formatRule?: FormatRule;
  rangeRule?: RangeRule;
  enumRule?: EnumRule;
  foreignKeyRule?: ForeignKeyRule;
  uniqueRule?: UniqueRule;
  businessRule?: BusinessRule;
  customRule?: CustomRule;
}

export interface RequiredFieldRule {
  allowEmpty: boolean;
  allowNull: boolean;
  trimWhitespace?: boolean;
}

export interface DataTypeRule {
  expectedType: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
  coerceType?: boolean;
}

export interface FormatRule {
  pattern: string; // Regex pattern
  message: string;
}

export interface RangeRule {
  min?: number;
  max?: number;
  inclusive: boolean;
}

export interface EnumRule {
  values: (string | number)[];
  caseSensitive: boolean;
}

export interface ForeignKeyRule {
  table: string;
  field: string;
  optional?: boolean;
  cacheable?: boolean; // Cache FK lookups for performance
}

export interface UniqueRule {
  scope: 'file' | 'database' | 'site'; // Scope of uniqueness
  caseSensitive: boolean;
  ignoreNull?: boolean;
}

export interface BusinessRule {
  validate: (record: any, context?: ValidationContext) => Promise<BusinessRuleResult>;
  description: string;
}

export interface CustomRule {
  validate: (record: any, context?: ValidationContext) => Promise<CustomRuleResult>;
  description: string;
}

export interface BusinessRuleResult {
  valid: boolean;
  message: string;
  suggestedFix?: string;
}

export interface CustomRuleResult extends BusinessRuleResult {}

export interface ValidationContext {
  mode: 'pre-import' | 'import' | 'post-import';
  skipForeignKeyChecks?: boolean;
  validateDuplicates?: boolean;
  existingRecords?: Map<string, any>; // For duplicate detection
  cacheManager?: any; // Cache for FK lookups
  entityType?: EntityType;
  batchNumber?: number;
}

export interface DataQualityScore {
  overallScore: number; // 0-100
  completeness: number; // % of required fields present
  validity: number; // % of records with valid values
  consistency: number; // % of records consistent with rules
  accuracy: number; // % of records with correct cross-references
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errorCount: number;
  warningCount: number;
  timestamp: Date;
}

export interface DuplicateRecord {
  field: string;
  value: any;
  count: number;
  rows: number[];
  databaseRecordId?: string;
}

export interface ValidationSummary {
  entityType: EntityType;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  errorsByType: Map<ValidationType, number>;
  errorsByField: Map<string, number>;
  duplicateCount: number;
  qualityScore: DataQualityScore;
}

export interface ValidationRuleDefinition {
  id: string;
  entityType: EntityType;
  field?: string;
  ruleType: ValidationType;
  severity: ValidationSeverity;
  description: string;
  condition?: string;
  definition: Record<string, any>; // Rule-specific config as JSON
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export interface DataQualityReport {
  id: string;
  entityType: EntityType;
  importJobId?: string;
  scores: DataQualityScore;
  summary: ValidationSummary;
  generatedAt: Date;
}
