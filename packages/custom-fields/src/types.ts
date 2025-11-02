/**
 * Type Definitions for Custom Fields System
 * Comprehensive types for custom field definition, storage, and migration
 */

// ============================================================================
// Field Definition Types
// ============================================================================

/**
 * Custom field type enum
 */
export enum CustomFieldType {
  // Basic types
  STRING = 'string',
  INTEGER = 'integer',
  DECIMAL = 'decimal',
  BOOLEAN = 'boolean',

  // Date/Time types
  DATE = 'date',
  DATETIME = 'datetime',
  TIME = 'time',

  // Complex types
  JSON = 'json',
  ARRAY = 'array',
  ENUM = 'enum',

  // Special types
  CALCULATED = 'calculated',
  VIRTUAL = 'virtual',
  REFERENCE = 'reference',
}

/**
 * Database column type enum
 */
export enum DatabaseColumnType {
  VARCHAR = 'VARCHAR',
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  BIGINT = 'BIGINT',
  DECIMAL = 'DECIMAL',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
  DATETIME = 'DATETIME',
  TIME = 'TIME',
  TIMESTAMP = 'TIMESTAMP',
  JSON = 'JSON',
  JSONB = 'JSONB',
  UUID = 'UUID',
  BYTEA = 'BYTEA',
}

/**
 * Migration status enum
 */
export enum MigrationStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

/**
 * Field storage type
 */
export enum FieldStorageType {
  STORED = 'stored', // Physically stored in database
  VIRTUAL = 'virtual', // Computed on-the-fly
  CALCULATED = 'calculated', // SQL expression based
}

/**
 * Custom field metadata
 */
export interface CustomFieldMetadata {
  id: string;
  name: string;
  label: string;
  description?: string;
  type: CustomFieldType;
  storageType: FieldStorageType;

  // Data type mapping
  databaseType: DatabaseColumnType;
  precision?: number;
  scale?: number;

  // Options
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: unknown;
  enumValues?: string[]; // For enum types

  // Validation
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;

  // Calculated field
  sqlExpression?: string; // For calculated fields
  dependencies?: string[]; // Field IDs this field depends on

  // Virtual field
  computeFunction?: string; // Function name for virtual fields
  virtualParameters?: Record<string, unknown>;

  // Reference field
  referenceTable?: string;
  referenceField?: string;

  // Multi-site
  siteId?: string;
  isGlobal?: boolean;
  siteOverrides?: Record<string, unknown>;

  // Metadata
  category?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;

  // Versioning
  version: number;
  deprecated?: boolean;
  replacedBy?: string;
}

/**
 * Data type mapping configuration
 */
export interface DataTypeMapping {
  fieldType: CustomFieldType;
  databaseType: DatabaseColumnType;
  sqlDefault?: string;
  sqlConstraints?: string[];
  maxLength?: number;
  precision?: number;
  scale?: number;
}

// ============================================================================
// Field Definition Request
// ============================================================================

/**
 * Request to create a custom field
 */
export interface CreateCustomFieldRequest {
  name: string;
  label: string;
  description?: string;
  type: CustomFieldType;
  storageType?: FieldStorageType;
  databaseType?: DatabaseColumnType;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  precision?: number;
  scale?: number;
  sqlExpression?: string;
  dependencies?: string[];
  computeFunction?: string;
  virtualParameters?: Record<string, unknown>;
  referenceTable?: string;
  referenceField?: string;
  siteId?: string;
  isGlobal?: boolean;
  category?: string;
  tags?: string[];
}

/**
 * Request to update a custom field
 */
export interface UpdateCustomFieldRequest {
  label?: string;
  description?: string;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  defaultValue?: unknown;
  enumValues?: string[];
  pattern?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  sqlExpression?: string;
  dependencies?: string[];
  computeFunction?: string;
  virtualParameters?: Record<string, unknown>;
  category?: string;
  tags?: string[];
  deprecated?: boolean;
}

// ============================================================================
// Migration Types
// ============================================================================

/**
 * Custom field migration
 */
export interface FieldMigration {
  id: string;
  name: string;
  description?: string;
  status: MigrationStatus;

  // Fields involved
  fieldId?: string;
  fieldName?: string;
  fieldType?: CustomFieldType;
  databaseType?: DatabaseColumnType;

  // Migration SQL
  upSql: string; // SQL to apply migration
  downSql: string; // SQL to rollback migration

  // Metadata
  createdBy: string;
  createdAt: Date;
  appliedBy?: string;
  appliedAt?: Date;
  rollbackBy?: string;
  rollbackAt?: Date;

  // Error tracking
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  // Validation
  validated?: boolean;
  validationErrors?: ValidationError[];
  preChecksPassed?: boolean;
  postChecksPassed?: boolean;

  // Versioning
  version: number;
  previousMigrationId?: string;

  // Transaction
  transactionId?: string;
  siteId?: string;
}

/**
 * Migration execution result
 */
export interface MigrationResult {
  migrationId: string;
  status: MigrationStatus;
  success: boolean;
  executionTimeMs: number;
  recordsAffected?: number;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  rollbackAvailable: boolean;
  rollbackSql?: string;
}

/**
 * Migration validation result
 */
export interface MigrationValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  affectedRecords?: number;
  diskSpaceRequired?: number;
  estimatedDuration?: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  severity: 'error' | 'warning';
  details?: unknown;
}

// ============================================================================
// Field Storage Configuration
// ============================================================================

/**
 * Field storage configuration
 */
export interface FieldStorageConfig {
  fieldId: string;
  tableName: string;
  columnName: string;
  databaseType: DatabaseColumnType;
  nullable: boolean;
  unique: boolean;
  indexed: boolean;
  defaultValue?: string;
  checkConstraint?: string;
  foreignKey?: {
    referenceTable: string;
    referenceColumn: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  };
}

/**
 * Table structure
 */
export interface TableStructure {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string;
  uniqueConstraints?: string[][];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyConstraint[];
}

/**
 * Column definition
 */
export interface ColumnDefinition {
  name: string;
  type: DatabaseColumnType;
  nullable: boolean;
  unique: boolean;
  defaultValue?: string;
  checkConstraint?: string;
  comments?: string;
}

/**
 * Index definition
 */
export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: 'BTREE' | 'HASH' | 'FULLTEXT';
}

/**
 * Foreign key constraint
 */
export interface ForeignKeyConstraint {
  name: string;
  column: string;
  referenceTable: string;
  referenceColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

// ============================================================================
// Migration Engine Types
// ============================================================================

/**
 * Migration history entry
 */
export interface MigrationHistory {
  id: string;
  migrationId: string;
  fieldId?: string;
  status: MigrationStatus;
  executedAt: Date;
  executionTimeMs: number;
  executedBy: string;
  siteId?: string;
}

/**
 * Migration plan
 */
export interface MigrationPlan {
  id: string;
  name: string;
  fieldId: string;
  migrations: FieldMigration[];
  validationResults: MigrationValidationResult;
  estimatedDuration: number;
  diskSpaceRequired: number;
  riskLevel: 'low' | 'medium' | 'high';
  rollbackPlan?: MigrationPlan;
}

/**
 * Rollback plan
 */
export interface RollbackPlan {
  id: string;
  migrationId: string;
  rollbackSql: string;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
  validationResult?: MigrationValidationResult;
}

// ============================================================================
// Field Registry
// ============================================================================

/**
 * Custom field definition
 */
export interface CustomFieldDefinition {
  metadata: CustomFieldMetadata;
  storageConfig: FieldStorageConfig;
  migrationHistory: MigrationHistory[];
  validationRules: FieldValidationRule[];
  indexes: IndexDefinition[];
}

/**
 * Field validation rule
 */
export interface FieldValidationRule {
  id: string;
  fieldId: string;
  type: string;
  condition: Record<string, unknown>;
  errorMessage: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// Field Compatibility
// ============================================================================

/**
 * Field compatibility check result
 */
export interface FieldCompatibilityResult {
  isCompatible: boolean;
  errors: ValidationError[];
  warnings: string[];
  existingFieldValues?: {
    fieldId: string;
    sampleValues: unknown[];
    canCoexist: boolean;
  };
}

/**
 * Data type compatibility
 */
export interface DataTypeCompatibility {
  sourceType: DatabaseColumnType;
  targetType: DatabaseColumnType;
  compatible: boolean;
  requiresConversion: boolean;
  conversionFunction?: string;
  dateLoss: boolean;
  conversionWarnings?: string[];
}

// ============================================================================
// Field Management
// ============================================================================

/**
 * Field management operations
 */
export interface FieldManagementOps {
  create: (request: CreateCustomFieldRequest) => Promise<CustomFieldDefinition>;
  update: (fieldId: string, request: UpdateCustomFieldRequest) => Promise<CustomFieldDefinition>;
  delete: (fieldId: string) => Promise<boolean>;
  get: (fieldId: string) => Promise<CustomFieldDefinition | undefined>;
  list: (options?: ListFieldsOptions) => Promise<CustomFieldDefinition[]>;
  migrate: (fieldId: string) => Promise<MigrationResult>;
  rollback: (migrationId: string) => Promise<MigrationResult>;
}

/**
 * List fields options
 */
export interface ListFieldsOptions {
  siteId?: string;
  type?: CustomFieldType;
  storageType?: FieldStorageType;
  deprecated?: boolean;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Prisma Schema Generation
// ============================================================================

/**
 * Prisma schema model
 */
export interface PrismaSchemaModel {
  name: string;
  fields: PrismaField[];
  uniqueConstraints?: string[][];
  indexes?: PrismaIndex[];
}

/**
 * Prisma field definition
 */
export interface PrismaField {
  name: string;
  type: string;
  isId?: boolean;
  isUpdatedAt?: boolean;
  relationName?: string;
  relationFromFields?: string[];
  relationToFields?: string[];
  isList?: boolean;
  isRequired?: boolean;
  hasDefaultValue?: boolean;
  default?: unknown;
  isGenerated?: boolean;
  generatedType?: string;
  dbName?: string;
  kind?: string;
}

/**
 * Prisma index
 */
export interface PrismaIndex {
  name: string;
  fields: string[];
  type?: string;
}
