/**
 * Extension Schema Types
 *
 * Defines the type system for the Extension Schema Framework (#438)
 * Enables plugins to register custom database entities and fields
 * without modifying the core Prisma schema.
 */

/**
 * Field types supported in extension schemas
 */
export type ExtensionFieldType =
  | 'String'
  | 'Int'
  | 'Float'
  | 'Boolean'
  | 'DateTime'
  | 'Decimal'
  | 'Json'
  | 'Bytes'

/**
 * Relationship types between entities
 */
export type RelationshipType = 'OneToOne' | 'OneToMany' | 'ManyToMany'

/**
 * Schema registration status
 */
export type SchemaStatus = 'pending' | 'validating' | 'active' | 'failed'

/**
 * Migration execution status
 */
export type MigrationStatus = 'pending' | 'executing' | 'executed' | 'failed' | 'rolled_back'

/**
 * Field validation constraints
 */
export interface ExtensionFieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  regex?: string
  enum?: unknown[]
}

/**
 * Index specification for performance
 */
export interface ExtensionIndex {
  name: string
  fields: string[]
  unique?: boolean
  type?: 'BTREE' | 'HASH'
}

/**
 * Unique constraint specification
 */
export interface ExtensionUniqueConstraint {
  name: string
  fields: string[]
}

/**
 * Database field definition
 */
export interface ExtensionField {
  name: string
  type: ExtensionFieldType
  required: boolean
  default?: unknown
  validation?: ExtensionFieldValidation
  description?: string
  // Denormalization hint for performance
  index?: boolean
  unique?: boolean
}

/**
 * Enum definition
 */
export interface ExtensionEnum {
  name: string
  values: string[]
  localization?: Record<string, Record<string, string>>
  description?: string
}

/**
 * Database relationship definition
 */
export interface ExtensionRelationship {
  name?: string
  source: string // Table name, e.g., "plugin_customreports"
  sourceField: string // Field name in source table
  target: string // Target table name (core or custom)
  targetField: string // Field name in target table
  type: RelationshipType
  cascade?: 'delete' | 'update' | 'restrict'
  description?: string
}

/**
 * Complete extension database schema definition
 */
export interface ExtensionDatabaseSchema {
  pluginId: string
  version: string
  tables: ExtensionTable[]
  enums: ExtensionEnum[]
  relationships: ExtensionRelationship[]
  metadata: ExtensionSchemaMetadata
}

/**
 * Schema table definition
 */
export interface ExtensionTable {
  name: string
  namespace: string // e.g., "plugin_12345"
  displayName?: string
  description?: string
  fields: ExtensionField[]
  indexes?: ExtensionIndex[]
  uniqueConstraints?: ExtensionUniqueConstraint[]
  timestamps?: {
    createdAt?: boolean
    updatedAt?: boolean
  }
}

/**
 * Schema metadata for organization and documentation
 */
export interface ExtensionSchemaMetadata {
  description?: string
  author?: string
  namespace: string // For preventing collisions
  version?: string
  constraints?: Record<string, unknown>
  tags?: string[]
  documentation?: {
    overview?: string
    entities?: string
    relationships?: string
    examples?: string
  }
}

/**
 * Schema validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

/**
 * Individual validation error
 */
export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'critical'
  code: string
}

/**
 * Individual validation warning
 */
export interface ValidationWarning {
  field?: string
  message: string
  code: string
}

/**
 * Conflict detection result
 */
export interface ConflictReport {
  hasConflicts: boolean
  conflicts: Conflict[]
  warnings: ConflictWarning[]
}

/**
 * Individual conflict
 */
export interface Conflict {
  type: 'table_name' | 'field_name' | 'enum_name' | 'relationship'
  plugin1: string
  plugin2: string
  item1: string
  item2: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Conflict warning
 */
export interface ConflictWarning {
  type: string
  plugin: string
  item: string
  message: string
}

/**
 * Schema registration result
 */
export interface RegistrationResult {
  success: boolean
  pluginId: string
  schemaId: string
  version: string
  status: SchemaStatus
  errors?: string[]
  warnings?: string[]
  registeredAt: Date
}

/**
 * Migration record in database
 */
export interface Migration {
  id: string
  pluginId: string
  migrationId: string
  version: string
  sql: string
  rollbackSql?: string
  checksums: {
    schema: string // SHA256 of schema
    sql: string // SHA256 of SQL
  }
  createdAt: Date
}

/**
 * Migration execution record
 */
export interface MigrationRecord extends Migration {
  status: MigrationStatus
  executionStart?: Date
  executionEnd?: Date
  errorMessage?: string
  updatedAt: Date
}

/**
 * Migration execution result
 */
export interface ExecutionResult {
  success: boolean
  migrationId: string
  pluginId: string
  duration: number // milliseconds
  status: MigrationStatus
  errors?: string[]
  executedAt: Date
}

/**
 * Rollback result
 */
export interface RollbackResult {
  success: boolean
  migrationId: string
  pluginId: string
  duration: number
  status: MigrationStatus
  errors?: string[]
  rolledBackAt: Date
}

/**
 * Safety check result for migrations
 */
export interface SafetyCheckResult {
  safe: boolean
  issues: SafetyIssue[]
  suggestions: string[]
}

/**
 * Individual safety issue
 */
export interface SafetyIssue {
  type: 'data_loss' | 'constraint' | 'performance' | 'compatibility'
  severity: 'warning' | 'critical'
  message: string
  affectedTables?: string[]
}

/**
 * Prisma schema generation result
 */
export interface PrismaSchemaResult {
  success: boolean
  schema: string
  models: PrismaModel[]
  enums: PrismaEnum[]
  errors?: string[]
}

/**
 * Prisma model definition
 */
export interface PrismaModel {
  name: string
  fields: PrismaField[]
  relations?: PrismaRelation[]
}

/**
 * Prisma field definition
 */
export interface PrismaField {
  name: string
  type: string
  isList: boolean
  isRequired: boolean
  hasDefaultValue: boolean
  default?: unknown
  isId: boolean
  isUnique: boolean
}

/**
 * Prisma relation definition
 */
export interface PrismaRelation {
  name: string
  fromModel: string
  toModel: string
  type: 'OneToOne' | 'OneToMany' | 'ManyToMany'
  relationName?: string
}

/**
 * Prisma enum definition
 */
export interface PrismaEnum {
  name: string
  values: string[]
}

/**
 * Plugin manifest schema section
 */
export interface PluginManifestDatabase {
  version?: string
  migrationsDir?: string
  entities?: PluginManifestEntity[]
  enums?: PluginManifestEnum[]
  relationships?: PluginManifestRelationship[]
}

/**
 * Plugin manifest entity definition
 */
export interface PluginManifestEntity {
  name: string
  schema: ExtensionTable
}

/**
 * Plugin manifest enum definition
 */
export interface PluginManifestEnum {
  name: string
  values: string[]
}

/**
 * Plugin manifest relationship definition
 */
export interface PluginManifestRelationship {
  source: string
  sourceField: string
  target: string
  targetField: string
  type: RelationshipType
}
