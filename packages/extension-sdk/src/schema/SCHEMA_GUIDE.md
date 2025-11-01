# Database Schema Extension Framework Guide

## Overview

The Database Schema Extension Framework allows extensions to:
- Define custom database tables and fields dynamically
- Generate Prisma schema from extension definitions
- Manage schema migrations with versioning and rollback
- Enforce data safety policies and validation rules
- Detect and resolve schema conflicts between extensions
- Validate schema compatibility before registration

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Defining Schemas](#defining-schemas)
3. [Field Types & Validation](#field-types--validation)
4. [Registering Schemas](#registering-schemas)
5. [Managing Migrations](#managing-migrations)
6. [Data Safety Policies](#data-safety-policies)
7. [Compatibility & Conflict Detection](#compatibility--conflict-detection)
8. [Prisma Integration](#prisma-integration)
9. [Best Practices](#best-practices)
10. [API Reference](#api-reference)

---

## Getting Started

### Basic Setup

```typescript
import {
  schemaRegistry,
  migrationManager,
  dataSafetyValidator,
} from '@machshop/extension-sdk/schema';

// Define a simple table
const productsTable = {
  name: 'products',
  extensionId: 'my-extension',
  version: '1.0.0',
  fields: [
    {
      name: 'id',
      type: 'String',
      required: true,
      unique: true,
      description: 'Product ID',
    },
    {
      name: 'name',
      type: 'String',
      required: true,
      description: 'Product name',
    },
    {
      name: 'price',
      type: 'Decimal',
      description: 'Product price',
      validation: {
        min: 0,
      },
    },
  ],
};

// Define schema extension
const schema = {
  id: 'products-schema',
  name: 'Products Schema',
  extensionId: 'my-extension',
  version: '1.0.0',
  tables: [productsTable],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Register schema
schemaRegistry.register(schema);
```

---

## Defining Schemas

### Schema Structure

```typescript
interface SchemaExtension {
  id: string;                    // Unique schema ID
  name: string;                  // Human-readable name
  description?: string;          // Optional description
  extensionId: string;           // Associated extension ID
  version: string;               // Schema version
  tables: SchemaTable[];         // Table definitions
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
}
```

### Table Definition

```typescript
interface SchemaTable {
  name: string;                  // Table name
  description?: string;          // Optional description
  fields: SchemaField[];         // Field definitions
  primaryKey?: string;           // Primary key field (default: 'id')
  indexes?: {
    name: string;
    fields: string[];
    unique?: boolean;
  }[];
  relations?: {
    name: string;
    target: string;              // Target table name
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
    joinTable?: string;          // For many-to-many
  }[];
  timestamps?: boolean;          // Auto-add createdAt/updatedAt
  extensionId: string;
  version: string;
}
```

### Field Definition

```typescript
interface SchemaField {
  name: string;                  // Field name
  type: 'String' | 'Int' | 'Float' | 'Boolean' | 'DateTime' | 'Json' | 'Decimal' | 'Bytes';
  required?: boolean;            // NOT NULL constraint
  unique?: boolean;              // UNIQUE constraint
  indexed?: boolean;             // Create index
  default?: any;                 // Default value
  description?: string;          // Documentation
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;            // Regex pattern
    min?: number;
    max?: number;
  };
  relationName?: string;         // Relation identifier
  relationTarget?: string;       // Target table for relations
  relationMode?: 'foreignKey' | 'implicit';
}
```

---

## Field Types & Validation

### Supported Types

| Type | Size | Use Case |
|------|------|----------|
| String | Variable | Text data (0-255 chars default) |
| Int | 8 bytes | Integer numbers |
| Float | 8 bytes | Floating-point numbers |
| Boolean | 1 byte | True/False values |
| DateTime | 8 bytes | Timestamps and dates |
| Decimal | 16 bytes | Precise monetary values |
| Json | Variable | Structured data |
| Bytes | Variable | Binary data |

### Validation Rules

```typescript
// String validation
{
  name: 'email',
  type: 'String',
  validation: {
    minLength: 5,
    maxLength: 255,
    pattern: '^[^@]+@[^@]+\\.[^@]+$' // Email pattern
  }
}

// Numeric validation
{
  name: 'quantity',
  type: 'Int',
  validation: {
    min: 0,
    max: 10000
  }
}

// Decimal validation
{
  name: 'price',
  type: 'Decimal',
  validation: {
    min: 0.01,
    max: 999999.99
  }
}
```

### Example: Complete Table Definition

```typescript
const ordersTable = {
  name: 'orders',
  description: 'Customer orders',
  extensionId: 'orders-extension',
  version: '1.0.0',
  timestamps: true,  // Adds createdAt, updatedAt
  primaryKey: 'id',
  fields: [
    {
      name: 'id',
      type: 'String',
      required: true,
      unique: true,
      description: 'Order ID',
    },
    {
      name: 'customerId',
      type: 'String',
      required: true,
      relationName: 'customer',
      relationTarget: 'customers',
      relationMode: 'foreignKey',
      description: 'Associated customer',
    },
    {
      name: 'total',
      type: 'Decimal',
      required: true,
      validation: {
        min: 0,
      },
      description: 'Order total amount',
    },
    {
      name: 'status',
      type: 'String',
      default: 'pending',
      description: 'Order status',
    },
    {
      name: 'metadata',
      type: 'Json',
      description: 'Additional order data',
    },
  ],
  indexes: [
    {
      name: 'idx_customer_status',
      fields: ['customerId', 'status'],
    },
    {
      name: 'idx_created_date',
      fields: ['createdAt'],
    },
  ],
  relations: [
    {
      name: 'customer',
      target: 'customers',
      type: 'many-to-one',
    },
    {
      name: 'items',
      target: 'orderItems',
      type: 'one-to-many',
    },
  ],
};
```

---

## Registering Schemas

### Validation During Registration

Schemas are automatically validated when registered:

```typescript
try {
  schemaRegistry.register(schema);
} catch (error) {
  if (error instanceof SchemaValidationError) {
    console.error('Validation errors:', error.validationErrors);
  } else if (error instanceof SchemaConflictError) {
    console.error('Conflicts detected:', error.conflicts);
  }
}
```

### Checking Validation Manually

```typescript
const validation = schemaRegistry.validate(schema);

if (!validation.valid) {
  validation.errors.forEach(error => {
    console.error(
      `[${error.table}${error.field ? '.' + error.field : ''}] ${error.code}: ${error.message}`
    );
  });
}
```

### Checking Compatibility

```typescript
const compatibility = schemaRegistry.checkCompatibility(schema);

if (!compatibility.compatible) {
  console.error('Conflicts:', compatibility.conflicts);

  if (compatibility.suggestions) {
    console.log('Suggestions:', compatibility.suggestions);
  }
}
```

### Listing Registered Schemas

```typescript
const allSchemas = schemaRegistry.list();

allSchemas.forEach(schema => {
  console.log(`${schema.name} (${schema.extensionId})`);
});
```

---

## Managing Migrations

### Creating Migrations

```typescript
// Create table migration
const createMigration = migrationManager.createMigration(
  'my-extension',
  '1.0.0',
  'create',
  'products',
  []
);

// Add field migration
const addFieldMigration = migrationManager.createMigration(
  'my-extension',
  '1.1.0',
  'modify',
  'products',
  [
    {
      field: 'sku',
      operation: 'add',
      newValue: {
        name: 'sku',
        type: 'String',
        required: true,
        unique: true,
      },
    },
  ]
);

// Modify field migration
const modifyFieldMigration = migrationManager.createMigration(
  'my-extension',
  '1.2.0',
  'modify',
  'products',
  [
    {
      field: 'description',
      operation: 'modify',
      oldValue: {
        name: 'description',
        type: 'String',
        validation: { maxLength: 255 },
      },
      newValue: {
        name: 'description',
        type: 'String',
        validation: { maxLength: 1000 },
      },
    },
  ]
);

// Delete field migration
const removeFieldMigration = migrationManager.createMigration(
  'my-extension',
  '1.3.0',
  'modify',
  'products',
  [
    {
      field: 'legacyField',
      operation: 'remove',
      oldValue: { name: 'legacyField', type: 'String' },
    },
  ]
);
```

### Applying Migrations

```typescript
// Initialize migration state
migrationManager.initializeMigrationState('my-extension', '1.0.0');

// Register migration
migrationManager.registerMigration(createMigration);

// Apply migration with data safety policy
const dataSafetyPolicy = {
  backupBeforeMigration: true,
  requireApprovalForDestructive: true,
};

try {
  await migrationManager.applyMigration(
    createMigration,
    dataSafetyPolicy
  );
} catch (error) {
  console.error('Migration failed:', error.message);
}
```

### Checking Migration Status

```typescript
const state = migrationManager.getMigrationState('my-extension');

console.log(`Current version: ${state.currentVersion}`);
console.log(`Applied: ${state.appliedMigrations.length}`);
console.log(`Pending: ${state.pendingMigrations.length}`);
```

### Rollback

```typescript
try {
  await migrationManager.rollbackMigration(migrationId);
  console.log('Migration rolled back successfully');
} catch (error) {
  if (error instanceof MigrationError) {
    console.error('Rollback failed:', error.message);
  }
}
```

### Migration History

```typescript
const history = migrationManager.getHistory('my-extension');

history.forEach(migration => {
  console.log(`${migration.id}: ${migration.type} on ${migration.tableName}`);
  console.log(`  Applied at: ${migration.appliedAt}`);
});
```

---

## Data Safety Policies

### Policy Options

```typescript
interface DataSafetyPolicy {
  allowNullOnDelete?: boolean;           // Set NULL instead of deleting
  cascadeDelete?: boolean;               // Delete child records
  onConflict?: 'error' | 'ignore' | 'replace';
  maxTableSize?: number;                 // Bytes
  maxRecordSize?: number;                // Bytes
  backupBeforeMigration?: boolean;       // Create backup
  requireApprovalForDestructive?: boolean; // Require approval
}
```

### Setting Policies

```typescript
// Set default policy
const policy = {
  allowNullOnDelete: true,
  cascadeDelete: false,
  backupBeforeMigration: true,
  requireApprovalForDestructive: true,
  maxTableSize: 1000000000, // 1GB
  maxRecordSize: 16777216,  // 16MB
};

dataSafetyValidator.setDefaultPolicy(policy);

// Or use per-operation
await migrationManager.applyMigration(migration, policy);
```

### Validating Data

```typescript
// Validate a field
const fieldValidation = dataSafetyValidator.validateField(
  productField,
  productsTable,
  policy
);

if (!fieldValidation.valid) {
  console.error('Field errors:', fieldValidation.errors);
}

// Validate entire table
const tableValidation = dataSafetyValidator.validateTable(
  productsTable,
  policy
);

if (!tableValidation.valid) {
  console.error('Table errors:', tableValidation.errors);
}

// Validate data against constraints
const dataValidation = dataSafetyValidator.validateData(
  { price: -10 }, // Invalid: negative price
  priceField
);

if (!dataValidation.valid) {
  console.error('Data errors:', dataValidation.errors);
}
```

### Type Conversion Safety

```typescript
// Check if type conversion is safe
const conversion = dataSafetyValidator.validateTypeConversion(
  'Int',
  'String'
);

if (conversion.safe) {
  console.log('Safe to convert');
} else {
  console.error('Unsafe conversion');
}

if (conversion.warnings.length > 0) {
  console.warn('Warnings:', conversion.warnings);
}
```

---

## Compatibility & Conflict Detection

### Conflict Types

1. **Name Collision**: Table or field names conflict with other extensions
2. **Type Incompatibility**: Field type changes incompatible with existing data
3. **Relationship Conflict**: Relation target doesn't exist or has wrong type
4. **Constraint Conflict**: Constraints conflict (e.g., unique vs nullable)

### Detecting Conflicts

```typescript
const compatibility = schemaRegistry.checkCompatibility(newSchema);

compatibility.conflicts.forEach(conflict => {
  console.log(`Conflict: ${conflict.message}`);
  if (conflict.table) console.log(`  Table: ${conflict.table}`);
  if (conflict.field) console.log(`  Field: ${conflict.field}`);
});

// Get suggestions
if (compatibility.suggestions) {
  compatibility.suggestions.forEach(suggestion => {
    console.log(`Suggestion: ${suggestion}`);
  });
}
```

### Resolving Conflicts

```typescript
// Rename table to avoid collision
schema.tables[0].name = `${schema.extensionId}_products`;

// Update relations to match new name
schema.tables[0].relations?.forEach(rel => {
  if (rel.target === 'products') {
    rel.target = `${schema.extensionId}_products`;
  }
});

// Retry registration
schemaRegistry.register(schema);
```

---

## Prisma Integration

### Generating Prisma Schema

```typescript
const prismaSchema = schemaRegistry.generatePrismaSchema(schema);

console.log('Datasource:', prismaSchema.datasource);

prismaSchema.models.forEach(model => {
  console.log(`model ${model.name} {`);

  model.fields.forEach(field => {
    let def = `  ${field.name} ${field.type}`;

    if (field.attributes) {
      def += ` ${field.attributes.join(' ')}`;
    }

    console.log(def);
  });

  if (model.attributes) {
    model.attributes.forEach(attr => {
      console.log(`  ${attr}`);
    });
  }

  console.log('}');
});
```

### Generated Prisma Model Example

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model products {
  id          String    @id @unique
  name        String
  price       Decimal   @default(0)
  status      String    @default("active")
  metadata    Json?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@unique([id])
  @@index([status])
}
```

---

## Best Practices

### 1. Use Timestamps

```typescript
{
  name: 'orders',
  extensionId: 'orders-extension',
  version: '1.0.0',
  timestamps: true,  // Auto-adds createdAt, updatedAt
  fields: [
    // ... other fields
  ],
}
```

### 2. Add Indexes for Common Queries

```typescript
{
  name: 'orders',
  fields: [
    // ...
  ],
  indexes: [
    {
      name: 'idx_customer_status',
      fields: ['customerId', 'status'],
    },
    {
      name: 'idx_created_date',
      fields: ['createdAt'],
    },
  ],
}
```

### 3. Validate Early

```typescript
const validation = schemaRegistry.validate(schema);
if (!validation.valid) {
  throw new SchemaValidationError(validation.errors);
}

const compatibility = schemaRegistry.checkCompatibility(schema);
if (!compatibility.compatible) {
  throw new SchemaConflictError(compatibility.conflicts);
}
```

### 4. Use Data Safety Policies

```typescript
const policy = {
  backupBeforeMigration: true,
  requireApprovalForDestructive: true,
  cascadeDelete: false,
};

dataSafetyValidator.setDefaultPolicy(policy);
```

### 5. Version Your Schemas

```typescript
// Always increment version for migrations
const schema = {
  id: 'products-schema',
  name: 'Products Schema',
  extensionId: 'my-extension',
  version: '1.0.0',  // Increment when schema changes
  tables: [
    {
      name: 'products',
      extensionId: 'my-extension',
      version: '1.0.0',
      fields: [
        // ...
      ],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### 6. Listen to Registry Events

```typescript
schemaRegistry.onEvent((event) => {
  if (event.type === 'schema:registered') {
    console.log(`Schema registered: ${event.extensionId}`);
  }
});

migrationManager.onEvent((event) => {
  if (event.type === 'migration:applied') {
    console.log(`Migration applied: ${event.migration.id}`);
  }
});
```

---

## API Reference

### SchemaExtensionRegistry

```typescript
interface ISchemaRegistry {
  register(schema: SchemaExtension): void;
  unregister(extensionId: string): void;
  get(extensionId: string): SchemaExtension | undefined;
  list(): SchemaExtension[];
  validate(schema: SchemaExtension): SchemaValidationResult;
  checkCompatibility(schema: SchemaExtension): CompatibilityResult;
  generatePrismaSchema(schema: SchemaExtension): PrismaSchema;
  applyMigration(migration: SchemaMigration): Promise<void>;
}
```

### MigrationManager

```typescript
class MigrationManager {
  createMigration(
    extensionId: string,
    version: string,
    type: 'create' | 'modify' | 'delete' | 'rename',
    tableName: string,
    changes: SchemaMigration['changes']
  ): SchemaMigration;

  initializeMigrationState(
    extensionId: string,
    initialVersion: string
  ): MigrationState;

  getMigrationState(extensionId: string): MigrationState | undefined;

  registerMigration(migration: SchemaMigration): void;

  applyMigration(
    migration: SchemaMigration,
    dataSafetyPolicy?: DataSafetyPolicy
  ): Promise<void>;

  rollbackMigration(migrationId: string): Promise<void>;

  getHistory(extensionId: string): SchemaMigration[];

  getPendingMigrations(extensionId: string): SchemaMigration[];
}
```

### DataSafetyValidator

```typescript
class DataSafetyValidator {
  validateField(
    field: SchemaField,
    table: SchemaTable,
    policy?: DataSafetyPolicy
  ): { valid: boolean; errors: string[] };

  validateTable(
    table: SchemaTable,
    policy?: DataSafetyPolicy
  ): { valid: boolean; errors: string[] };

  validateCascadeDelete(
    sourceTable: SchemaTable,
    targetTable: SchemaTable,
    policy?: DataSafetyPolicy
  ): { safe: boolean; warnings: string[] };

  validateTypeConversion(
    fromType: string,
    toType: string
  ): { safe: boolean; warnings: string[] };

  validateData(
    data: Record<string, any>,
    field: SchemaField
  ): { valid: boolean; errors: string[] };

  getDefaultPolicy(): DataSafetyPolicy;

  setDefaultPolicy(policy: Partial<DataSafetyPolicy>): void;
}
```

---

## Examples

### Complete Extension with Schema

```typescript
import {
  schemaRegistry,
  migrationManager,
  dataSafetyValidator,
  type SchemaExtension,
} from '@machshop/extension-sdk/schema';

// Define products table
const productsTable = {
  name: 'products',
  extensionId: 'product-extension',
  version: '1.0.0',
  description: 'Product inventory',
  timestamps: true,
  fields: [
    {
      name: 'id',
      type: 'String',
      required: true,
      unique: true,
    },
    {
      name: 'name',
      type: 'String',
      required: true,
      validation: { minLength: 1, maxLength: 255 },
    },
    {
      name: 'sku',
      type: 'String',
      unique: true,
      validation: { pattern: '^[A-Z0-9]{3,20}$' },
    },
    {
      name: 'price',
      type: 'Decimal',
      required: true,
      validation: { min: 0 },
    },
    {
      name: 'stock',
      type: 'Int',
      default: 0,
      validation: { min: 0 },
    },
    {
      name: 'description',
      type: 'String',
      validation: { maxLength: 1000 },
    },
    {
      name: 'metadata',
      type: 'Json',
    },
  ],
  indexes: [
    {
      name: 'idx_sku',
      fields: ['sku'],
      unique: true,
    },
    {
      name: 'idx_name',
      fields: ['name'],
    },
  ],
};

// Define schema
const schema: SchemaExtension = {
  id: 'product-schema',
  name: 'Product Schema',
  description: 'Schema for product management',
  extensionId: 'product-extension',
  version: '1.0.0',
  tables: [productsTable],
  createdAt: new Date(),
  updatedAt: new Date(),
};

// Validate
const validation = schemaRegistry.validate(schema);
if (!validation.valid) {
  throw new Error('Schema validation failed');
}

// Register
schemaRegistry.register(schema);

// Initialize migrations
migrationManager.initializeMigrationState('product-extension', '1.0.0');

// Listen to events
schemaRegistry.onEvent((event) => {
  if (event.type === 'schema:registered') {
    console.log(`✓ Schema registered: ${event.extensionId}`);
  }
});

// Generate Prisma
const prismaSchema = schemaRegistry.generatePrismaSchema(schema);
console.log('Prisma schema generated');

// Set data safety policy
dataSafetyValidator.setDefaultPolicy({
  backupBeforeMigration: true,
  requireApprovalForDestructive: true,
});
```

---

## Support

For issues or questions about the schema extension framework, refer to the Extension SDK documentation or contact support.
