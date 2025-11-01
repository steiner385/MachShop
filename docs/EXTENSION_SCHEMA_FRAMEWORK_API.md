# Extension Schema Framework - API Reference

**Issue**: #438 - Database Schema Extension Framework
**Version**: 1.0.0
**Date**: November 1, 2025

## Table of Contents

1. [Overview](#overview)
2. [Core Services](#core-services)
3. [Type Definitions](#type-definitions)
4. [API Endpoints](#api-endpoints)
5. [Examples](#examples)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)

## Overview

The Extension Schema Framework enables plugins to register custom database entities and fields without modifying the core Prisma schema. This API provides a complete solution for:

- **Schema Registration**: Register custom database entities
- **Validation**: Comprehensive input validation
- **Conflict Detection**: Prevent naming collisions
- **Migration Execution**: Safe schema changes with rollback
- **Data Safety**: Ensure data integrity across operations
- **Prisma Integration**: Type-safe access to custom entities

## Core Services

### ExtensionSchemaRegistry

Central service for managing extension database schemas.

#### Methods

##### `registerSchema(pluginId: string, schema: ExtensionDatabaseSchema): Promise<RegistrationResult>`

Register a new extension schema.

**Parameters:**
- `pluginId` (string, required): Unique plugin identifier
- `schema` (ExtensionDatabaseSchema, required): Extension schema definition

**Returns:** `Promise<RegistrationResult>`

**Example:**
```typescript
const result = await registry.registerSchema('my-plugin', {
  pluginId: 'my-plugin',
  version: '1.0.0',
  tables: [
    {
      name: 'custom_reports',
      namespace: 'plugin_myplugin',
      fields: [
        { name: 'title', type: 'String', required: true },
        { name: 'content', type: 'String', required: true },
      ],
    },
  ],
  enums: [],
  relationships: [],
  metadata: {
    namespace: 'plugin_myplugin',
    description: 'Custom reporting tables',
  },
})
```

**Success Response:**
```json
{
  "success": true,
  "pluginId": "my-plugin",
  "schemaId": "uuid-here",
  "version": "1.0.0",
  "status": "validating",
  "registeredAt": "2025-11-01T12:00:00Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "pluginId": "my-plugin",
  "schemaId": "my-plugin-1.0.0",
  "version": "1.0.0",
  "status": "failed",
  "errors": ["Table name 'users' is reserved"],
  "registeredAt": "2025-11-01T12:00:00Z"
}
```

##### `validateSchema(schema: ExtensionDatabaseSchema): ValidationResult`

Validate schema without registering.

**Parameters:**
- `schema` (ExtensionDatabaseSchema, required): Schema to validate

**Returns:** `ValidationResult`

**Example:**
```typescript
const validationResult = registry.validateSchema(schema)

if (!validationResult.valid) {
  console.error('Schema errors:', validationResult.errors)
  console.warn('Schema warnings:', validationResult.warnings)
}
```

##### `detectConflicts(schema: ExtensionDatabaseSchema): ConflictReport`

Detect conflicts with existing schemas.

**Parameters:**
- `schema` (ExtensionDatabaseSchema, required): Schema to check

**Returns:** `ConflictReport`

**Example:**
```typescript
const conflictReport = registry.detectConflicts(newSchema)

if (conflictReport.hasConflicts) {
  conflictReport.conflicts.forEach((conflict) => {
    console.log(`Conflict: ${conflict.message}`)
  })
}
```

##### `getAllSchemas(): ExtensionDatabaseSchema[]`

Get all registered schemas.

**Returns:** Array of `ExtensionDatabaseSchema`

**Example:**
```typescript
const allSchemas = registry.getAllSchemas()
allSchemas.forEach((schema) => {
  console.log(`Plugin: ${schema.pluginId}, Version: ${schema.version}`)
})
```

##### `getPluginSchema(pluginId: string): ExtensionDatabaseSchema | null`

Get schema by plugin ID.

**Parameters:**
- `pluginId` (string, required): Plugin identifier

**Returns:** `ExtensionDatabaseSchema | null`

**Example:**
```typescript
const schema = registry.getPluginSchema('my-plugin')
if (schema) {
  console.log(`Found schema with ${schema.tables.length} tables`)
}
```

##### `generatePrismaSchema(): PrismaSchemaResult`

Generate Prisma schema from all registered schemas.

**Returns:** `PrismaSchemaResult`

**Example:**
```typescript
const result = registry.generatePrismaSchema()

if (result.success) {
  console.log(result.schema) // Print Prisma DSL
}
```

##### `unregisterSchema(pluginId: string): Promise<void>`

Unregister and remove schema.

**Parameters:**
- `pluginId` (string, required): Plugin identifier

**Example:**
```typescript
await registry.unregisterSchema('my-plugin')
```

### ExtensionMigrationEngine

Handles safe execution and rollback of migrations.

#### Methods

##### `generateMigrations(pluginId: string, currentSchema: ExtensionDatabaseSchema, previousSchema?: ExtensionDatabaseSchema): Promise<string[]>`

Generate SQL migrations.

**Parameters:**
- `pluginId` (string, required): Plugin identifier
- `currentSchema` (ExtensionDatabaseSchema, required): Target schema
- `previousSchema` (ExtensionDatabaseSchema, optional): Previous schema for updates

**Returns:** Array of SQL migration strings

##### `executeMigrations(pluginId: string, migrations: string[], schema: ExtensionDatabaseSchema): Promise<ExecutionResult>`

Execute migrations safely.

**Parameters:**
- `pluginId` (string, required): Plugin identifier
- `migrations` (string[], required): SQL migration strings
- `schema` (ExtensionDatabaseSchema, required): Schema being applied

**Returns:** `ExecutionResult`

##### `rollbackMigration(migrationId: string): Promise<RollbackResult>`

Rollback a specific migration.

**Parameters:**
- `migrationId` (string, required): Migration identifier

**Returns:** `RollbackResult`

##### `getMigrationHistory(pluginId?: string): Promise<MigrationRecord[]>`

Get migration history.

**Parameters:**
- `pluginId` (string, optional): Filter by plugin

**Returns:** Array of `MigrationRecord`

### ExtensionPrismaIntegration

Type-safe access to custom entities.

#### Methods

##### `registerExtensionModels(schema: ExtensionDatabaseSchema): Promise<string>`

Register models with Prisma.

**Parameters:**
- `schema` (ExtensionDatabaseSchema, required): Schema with models

**Returns:** Prisma schema string

##### `queryEntity(modelName: string, query: ExtensionEntityQuery): Promise<ExtensionEntityResult>`

Query custom entities.

**Parameters:**
- `modelName` (string, required): Model name
- `query` (ExtensionEntityQuery, required): Query parameters

**Returns:** `ExtensionEntityResult`

**Example:**
```typescript
const result = await prismaIntegration.queryEntity('CustomReport', {
  where: { status: 'PUBLISHED' },
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 10,
})

if (result.success) {
  console.log(`Found ${result.count} entities`)
}
```

##### `createEntity(modelName: string, data: Record<string, any>): Promise<ExtensionEntityResult>`

Create entity.

**Parameters:**
- `modelName` (string, required): Model name
- `data` (Record<string, any>, required): Entity data

**Returns:** `ExtensionEntityResult`

##### `updateEntity(modelName: string, id: string, data: Record<string, any>): Promise<ExtensionEntityResult>`

Update entity.

**Parameters:**
- `modelName` (string, required): Model name
- `id` (string, required): Entity ID
- `data` (Record<string, any>, required): Update data

**Returns:** `ExtensionEntityResult`

##### `deleteEntity(modelName: string, id: string): Promise<ExtensionEntityResult>`

Delete entity.

**Parameters:**
- `modelName` (string, required): Model name
- `id` (string, required): Entity ID

**Returns:** `ExtensionEntityResult`

##### `batchCreateEntities(modelName: string, records: Record<string, any>[]): Promise<ExtensionEntityResult>`

Batch create entities.

**Parameters:**
- `modelName` (string, required): Model name
- `records` (Record<string, any>[], required): Array of entities

**Returns:** `ExtensionEntityResult`

##### `batchUpdateEntities(modelName: string, updates: Array<{id: string; data: Record<string, any>}>): Promise<ExtensionEntityResult>`

Batch update entities.

**Parameters:**
- `modelName` (string, required): Model name
- `updates` (Array, required): Array of {id, data} objects

**Returns:** `ExtensionEntityResult`

### ExtensionDataSafety

Validation and data safety.

#### Methods

##### `validateEntityData(table: any, data: Record<string, any>): DataValidationResult`

Validate entity data.

**Parameters:**
- `table` (ExtensionTable, required): Table definition
- `data` (Record<string, any>, required): Data to validate

**Returns:** `DataValidationResult`

**Example:**
```typescript
const result = dataSafety.validateEntityData(table, {
  name: 'John Doe',
  age: 30,
  email: 'john@example.com',
})

if (!result.valid) {
  result.errors.forEach((error) => {
    console.error(`${error.field}: ${error.message}`)
  })
}
```

##### `validateSchemaRelationships(schema: ExtensionDatabaseSchema): DataValidationResult`

Validate relationship definitions.

**Parameters:**
- `schema` (ExtensionDatabaseSchema, required): Schema to validate

**Returns:** `DataValidationResult`

##### `sanitizeData(data: Record<string, any>, fields: ExtensionField[]): Record<string, any>`

Sanitize and normalize data.

**Parameters:**
- `data` (Record<string, any>, required): Data to sanitize
- `fields` (ExtensionField[], required): Field definitions

**Returns:** Sanitized data

**Example:**
```typescript
const sanitized = dataSafety.sanitizeData(
  { name: '  John  ', age: '30', active: 'true' },
  fields
)
// Result: { name: 'John', age: 30, active: true }
```

##### `checkUniqueConstraint(tableName: string, field: string, value: any, excludeId?: string): Promise<ConstraintCheckResult>`

Check unique constraint.

**Parameters:**
- `tableName` (string, required): Table name
- `field` (string, required): Field name
- `value` (any, required): Value to check
- `excludeId` (string, optional): Exclude record from check

**Returns:** `ConstraintCheckResult`

##### `generateDataMigrationScript(oldFields: ExtensionField[], newFields: ExtensionField[]): string[]`

Generate migration scripts for schema changes.

**Parameters:**
- `oldFields` (ExtensionField[], required): Previous fields
- `newFields` (ExtensionField[], required): New fields

**Returns:** Array of migration script suggestions

## Type Definitions

### ExtensionDatabaseSchema

Complete schema definition.

```typescript
interface ExtensionDatabaseSchema {
  pluginId: string
  version: string
  tables: ExtensionTable[]
  enums: ExtensionEnum[]
  relationships: ExtensionRelationship[]
  metadata: ExtensionSchemaMetadata
}
```

### ExtensionTable

Table definition.

```typescript
interface ExtensionTable {
  name: string
  namespace: string
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
```

### ExtensionField

Field definition.

```typescript
interface ExtensionField {
  name: string
  type: 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Decimal' | 'Json' | 'Bytes'
  required: boolean
  default?: any
  validation?: ExtensionFieldValidation
  description?: string
  index?: boolean
  unique?: boolean
}
```

### ExtensionFieldValidation

Field constraints.

```typescript
interface ExtensionFieldValidation {
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: string
  regex?: string
  enum?: unknown[]
}
```

### ExtensionEnum

Enum definition.

```typescript
interface ExtensionEnum {
  name: string
  values: string[]
  localization?: Record<string, Record<string, string>>
  description?: string
}
```

### ExtensionRelationship

Relationship definition.

```typescript
interface ExtensionRelationship {
  name?: string
  source: string
  sourceField: string
  target: string
  targetField: string
  type: 'OneToOne' | 'OneToMany' | 'ManyToMany'
  cascade?: 'delete' | 'update' | 'restrict'
  description?: string
}
```

### ValidationResult

Validation result with errors and warnings.

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}
```

### ConflictReport

Conflict detection result.

```typescript
interface ConflictReport {
  hasConflicts: boolean
  conflicts: Conflict[]
  warnings: ConflictWarning[]
}
```

## API Endpoints

### REST API Endpoints

#### POST `/api/extensions/{pluginId}/schema`

Register new schema.

**Request Body:**
```json
{
  "pluginId": "my-plugin",
  "version": "1.0.0",
  "tables": [...],
  "enums": [],
  "relationships": [],
  "metadata": {...}
}
```

**Response:**
```json
{
  "success": true,
  "pluginId": "my-plugin",
  "schemaId": "uuid",
  "version": "1.0.0",
  "status": "validating",
  "registeredAt": "2025-11-01T12:00:00Z"
}
```

#### GET `/api/extensions/{pluginId}/schema`

Get registered schema.

**Response:**
```json
{
  "pluginId": "my-plugin",
  "version": "1.0.0",
  "tables": [...],
  "enums": [],
  "relationships": [],
  "metadata": {...}
}
```

#### PUT `/api/extensions/{pluginId}/schema`

Update schema (versioning).

#### DELETE `/api/extensions/{pluginId}/schema`

Unregister schema.

#### POST `/api/extensions/{pluginId}/schema/validate`

Validate schema without registering.

#### POST `/api/extensions/{pluginId}/migrations/execute`

Execute pending migrations.

#### GET `/api/extensions/{pluginId}/migrations`

Get migration history.

#### POST `/api/extensions/{pluginId}/migrations/{migrationId}/rollback`

Rollback migration.

#### GET `/api/extensions/conflicts`

Detect schema conflicts.

## Examples

### Example 1: Register Custom Reporting Schema

```typescript
import { ExtensionSchemaRegistry } from '@/services/ExtensionSchemaRegistry'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const registry = new ExtensionSchemaRegistry(prisma)

const reportingSchema = {
  pluginId: 'reporting-plugin',
  version: '1.0.0',
  tables: [
    {
      name: 'custom_reports',
      namespace: 'plugin_reporting',
      fields: [
        {
          name: 'title',
          type: 'String' as const,
          required: true,
          validation: { maxLength: 255 },
        },
        {
          name: 'content',
          type: 'String' as const,
          required: true,
        },
        {
          name: 'created_by',
          type: 'String' as const,
          required: true,
        },
        {
          name: 'status',
          type: 'String' as const,
          required: true,
          validation: { enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
        },
      ],
    },
  ],
  enums: [
    {
      name: 'ReportStatus',
      values: ['DRAFT', 'PUBLISHED', 'ARCHIVED'],
    },
  ],
  relationships: [
    {
      source: 'plugin_reporting_custom_reports',
      sourceField: 'created_by',
      target: 'User',
      targetField: 'id',
      type: 'ManyToOne' as const,
    },
  ],
  metadata: {
    namespace: 'plugin_reporting',
    description: 'Custom reporting entities',
  },
}

const result = await registry.registerSchema(
  reportingSchema.pluginId,
  reportingSchema
)

if (result.success) {
  console.log(`Schema registered: ${result.schemaId}`)
} else {
  console.error('Registration failed:', result.errors)
}
```

### Example 2: Create and Query Custom Entities

```typescript
import { ExtensionPrismaIntegration } from '@/services/ExtensionPrismaIntegration'

const prismaIntegration = new ExtensionPrismaIntegration(prisma)

// Create entity
const createResult = await prismaIntegration.createEntity('CustomReport', {
  title: 'Monthly Sales Report',
  content: 'Sales data for November',
  created_by: 'user123',
  status: 'PUBLISHED',
})

// Query entities
const queryResult = await prismaIntegration.queryEntity('CustomReport', {
  where: { status: 'PUBLISHED' },
  orderBy: { createdAt: 'desc' },
  take: 10,
})

// Update entity
const updateResult = await prismaIntegration.updateEntity(
  'CustomReport',
  createResult.data[0].id,
  { status: 'ARCHIVED' }
)

// Delete entity
const deleteResult = await prismaIntegration.deleteEntity(
  'CustomReport',
  createResult.data[0].id
)
```

### Example 3: Validate Data Before Insert

```typescript
import { ExtensionDataSafety } from '@/services/ExtensionDataSafety'

const dataSafety = new ExtensionDataSafety(prisma)

const reportData = {
  title: 'Q4 Sales Report',
  content: 'Quarterly sales summary',
  created_by: 'user123',
  status: 'PUBLISHED',
}

const validationResult = dataSafety.validateEntityData(
  reportTable,
  reportData
)

if (validationResult.valid) {
  // Safe to insert
  await prismaIntegration.createEntity('CustomReport', reportData)
} else {
  // Handle validation errors
  validationResult.errors.forEach((error) => {
    console.error(`Field ${error.field}: ${error.message}`)
  })
}
```

## Error Handling

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| `INVALID_SCHEMA` | Schema validation failed | Review schema definition |
| `TABLE_NAME_CONFLICT` | Table name already exists | Use unique namespace/name |
| `MISSING_FIELD` | Required field missing | Add required field |
| `INVALID_TYPE` | Field type is invalid | Use valid type |
| `CONSTRAINT_VIOLATION` | Data violates constraint | Ensure data meets constraints |
| `MIGRATION_FAILED` | Migration execution failed | Review SQL and rollback |

### Error Handling Example

```typescript
try {
  const result = await registry.registerSchema(pluginId, schema)

  if (!result.success) {
    console.error('Registration failed')
    result.errors?.forEach((error) => {
      console.error(`  - ${error}`)
    })
    return
  }
} catch (error) {
  console.error('Unexpected error:', error)
}
```

## Best Practices

### 1. Always Validate Before Registering

```typescript
const validation = registry.validateSchema(schema)
if (!validation.valid) {
  // Fix errors before registering
  return
}
```

### 2. Check for Conflicts

```typescript
const conflicts = registry.detectConflicts(newSchema)
if (conflicts.hasConflicts) {
  // Resolve conflicts or use different namespace
  return
}
```

### 3. Use Namespaces for Isolation

```typescript
{
  name: 'custom_entities',
  namespace: 'plugin_mycompany_customentities', // Unique namespace
  fields: [...]
}
```

### 4. Validate Data Before Operations

```typescript
const validation = dataSafety.validateEntityData(table, data)
if (!validation.valid) {
  // Sanitize or reject data
  return
}

const sanitized = dataSafety.sanitizeData(data, table.fields)
```

### 5. Handle Relationships Properly

```typescript
{
  source: 'plugin_reports_custom',
  sourceField: 'created_by',
  target: 'User', // Reference core table
  targetField: 'id',
  type: 'ManyToOne',
  cascade: 'delete', // Define cascade behavior
}
```

### 6. Version Your Schemas

```typescript
{
  pluginId: 'my-plugin',
  version: '1.0.0', // Use semantic versioning
  ...
}
```

### 7. Document Your Schemas

```typescript
{
  name: 'custom_reports',
  namespace: 'plugin_reports',
  description: 'User-defined report templates',
  fields: [
    {
      name: 'title',
      type: 'String',
      description: 'Report title (max 255 chars)',
      validation: { maxLength: 255 },
      ...
    }
  ]
}
```

## Additional Resources

- [Extension Framework Overview](./EXTENSION_FRAMEWORK_OVERVIEW.md)
- [Developer Guide](./EXTENSION_DEVELOPER_GUIDE.md)
- [Troubleshooting Guide](./EXTENSION_TROUBLESHOOTING.md)
- [GitHub Issue #438](https://github.com/steiner385/MachShop/issues/438)

---

**Last Updated:** November 1, 2025
**Maintained By:** Platform Engineering Team
