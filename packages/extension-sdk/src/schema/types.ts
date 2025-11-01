/**
 * Database Schema Extension Framework - Type Definitions
 * Issue #438: Database Schema Extension Framework
 */

/**
 * Extended field definition for schema
 */
export interface SchemaField {
  name: string;
  type: 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Json' | 'Decimal' | 'Bytes';
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  default?: any;
  description?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  relationName?: string; // For relations
  relationTarget?: string; // Target model
  relationMode?: 'foreignKey' | 'implicit';
}

/**
 * Extended table definition for schema
 */
export interface SchemaTable {
  name: string;
  description?: string;
  fields: SchemaField[];
  primaryKey?: string; // Field name, defaults to 'id'
  indexes?: {
    name: string;
    fields: string[];
    unique?: boolean;
  }[];
  relations?: {
    name: string;
    target: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    joinTable?: string;
  }[];
  timestamps?: boolean; // Add createdAt, updatedAt
  extensionId: string;
  version: string;
}

/**
 * Schema extension definition
 */
export interface SchemaExtension {
  id: string;
  name: string;
  description?: string;
  extensionId: string;
  version: string;
  tables: SchemaTable[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Migration definition
 */
export interface SchemaMigration {
  id: string;
  extensionId: string;
  version: string;
  type: 'create' | 'modify' | 'delete' | 'rename';
  tableName: string;
  changes: {
    field?: string;
    operation: 'add' | 'remove' | 'modify' | 'rename';
    oldValue?: any;
    newValue?: any;
    details?: Record<string, any>;
  }[];
  createdAt: Date;
  appliedAt?: Date;
  reversible: boolean;
  rollbackScript?: string;
}

/**
 * Migration state
 */
export interface MigrationState {
  extensionId: string;
  currentVersion: string;
  appliedMigrations: string[];
  pendingMigrations: string[];
  lastAppliedAt?: Date;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: {
    table?: string;
    field?: string;
    message: string;
    code: string;
  }[];
  warnings?: {
    message: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

/**
 * Compatibility check result
 */
export interface CompatibilityResult {
  compatible: boolean;
  conflicts: {
    table?: string;
    field?: string;
    existingTable?: string;
    message: string;
  }[];
  suggestions?: string[];
}

/**
 * Prisma schema segment
 */
export interface PrismaSchema {
  datasource: string;
  generator?: string;
  models: {
    name: string;
    fields: {
      name: string;
      type: string;
      attributes?: string[];
      relationName?: string;
      relationTarget?: string;
    }[];
    attributes?: string[];
  }[];
}

/**
 * Data safety policy
 */
export interface DataSafetyPolicy {
  allowNullOnDelete?: boolean; // Set NULL instead of deleting child records
  cascadeDelete?: boolean; // Delete child records
  onConflict?: 'error' | 'ignore' | 'replace';
  maxTableSize?: number; // Bytes
  maxRecordSize?: number; // Bytes
  backupBeforeMigration?: boolean;
  requireApprovalForDestructive?: boolean;
}

/**
 * Schema conflict
 */
export interface SchemaConflict {
  type: 'nameCollision' | 'typeIncompatibility' | 'relationshipConflict' | 'constraintConflict';
  table: string;
  field?: string;
  existing: any;
  requested: any;
  resolution?: 'rename' | 'override' | 'merge' | 'skip';
}

/**
 * Schema registry interface
 */
export interface ISchemaRegistry {
  register(schema: SchemaExtension): Promise<void>;
  unregister(extensionId: string): Promise<void>;
  get(extensionId: string): SchemaExtension | undefined;
  list(): SchemaExtension[];
  validate(schema: SchemaExtension): SchemaValidationResult;
  checkCompatibility(schema: SchemaExtension): CompatibilityResult;
  generatePrismaSchema(schema: SchemaExtension): PrismaSchema;
  applyMigration(migration: SchemaMigration): Promise<void>;
}

/**
 * Schema errors
 */
export class SchemaError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SchemaError';
  }
}

export class SchemaValidationError extends SchemaError {
  constructor(
    public validationErrors: any[]
  ) {
    super('Schema validation failed', 'VALIDATION_ERROR', { errors: validationErrors });
    this.name = 'SchemaValidationError';
  }
}

export class SchemaConflictError extends SchemaError {
  constructor(
    public conflicts: SchemaConflict[]
  ) {
    super(`Schema conflicts detected: ${conflicts.length} conflict(s)`, 'CONFLICT_ERROR', {
      conflicts,
    });
    this.name = 'SchemaConflictError';
  }
}

export class MigrationError extends SchemaError {
  constructor(
    message: string,
    public migration: SchemaMigration
  ) {
    super(`Migration failed: ${message}`, 'MIGRATION_ERROR', { migration });
    this.name = 'MigrationError';
  }
}
