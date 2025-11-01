
# Custom Entity & Enum Extension System Guide

## Overview

The Custom Entity & Enum Extension System allows MachShop extensions to define, validate, and manage custom entities with auto-generated CRUD operations, relationship management, and TypeScript type generation. This enables low-code customization and self-service extensibility.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Defining Entities](#defining-entities)
3. [Defining Enums](#defining-enums)
4. [Entity Validation](#entity-validation)
5. [CRUD Operations](#crud-operations)
6. [Relationships](#relationships)
7. [Type Generation](#type-generation)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)

---

## Getting Started

### Basic Setup

```typescript
import {
  entityRegistry,
  enumRegistry,
  EntityService,
} from '@machshop/extension-sdk/entities';

// Register enum
enumRegistry.register({
  name: 'OrderStatus',
  values: [
    { name: 'PENDING', value: 'pending' },
    { name: 'SHIPPED', value: 'shipped' },
    { name: 'DELIVERED', value: 'delivered' },
  ],
  extensionId: 'my-extension',
  version: '1.0.0',
});

// Register entity
entityRegistry.register({
  name: 'Order',
  fields: [
    { name: 'id', type: 'string', required: true, indexed: true },
    { name: 'customerId', type: 'string', required: true },
    { name: 'amount', type: 'number', required: true },
    { name: 'status', type: 'enum', enumType: 'OrderStatus' },
  ],
  extensionId: 'my-extension',
  version: '1.0.0',
});

// Use service
const orderService = new EntityService('Order');
const result = await orderService.create({
  customerId: 'cust-123',
  amount: 99.99,
  status: 'pending',
});
```

---

## Defining Entities

### Entity Definition

```typescript
const orderEntity: EntityDefinition = {
  name: 'Order',
  description: 'Custom order entity',
  tableName: 'custom_orders',
  fields: [
    {
      name: 'id',
      type: 'string',
      required: true,
      indexed: true,
      description: 'Unique order ID',
    },
    {
      name: 'customerId',
      type: 'string',
      required: true,
      indexed: true,
    },
    {
      name: 'amount',
      type: 'number',
      required: true,
      validation: {
        min: 0,
        max: 999999,
      },
    },
    {
      name: 'status',
      type: 'enum',
      enumType: 'OrderStatus',
      default: 'pending',
    },
    {
      name: 'notes',
      type: 'string',
      validation: {
        maxLength: 500,
      },
    },
    {
      name: 'metadata',
      type: 'json',
    },
  ],
  primaryKey: 'id',
  timestamps: true, // Adds createdAt, updatedAt
  extensionId: 'my-extension',
  version: '1.0.0',
};

entityRegistry.register(orderEntity);
```

### Field Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Text field | `"John Doe"` |
| `number` | Floating point | `99.99` |
| `integer` | Integer number | `42` |
| `boolean` | True/false | `true` |
| `date` | Date/datetime | `new Date()` |
| `json` | JSON object | `{ key: "value" }` |
| `enum` | Enumerated value | `"PENDING"` |
| `relation` | Reference to another entity | `"order-123"` |

### Field Constraints

```typescript
const field: EntityField = {
  name: 'email',
  type: 'string',
  required: true,
  unique: true, // Unique constraint
  indexed: true, // Create index
  validation: {
    minLength: 5,
    maxLength: 255,
    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
  },
};
```

---

## Defining Enums

### Enum Definition

```typescript
const statusEnum: EnumDefinition = {
  name: 'OrderStatus',
  description: 'Status of an order',
  values: [
    {
      name: 'PENDING',
      value: 'pending',
      description: 'Order received, awaiting processing',
    },
    {
      name: 'PROCESSING',
      value: 'processing',
      description: 'Order is being processed',
    },
    {
      name: 'SHIPPED',
      value: 'shipped',
      description: 'Order has been shipped',
    },
    {
      name: 'DELIVERED',
      value: 'delivered',
      description: 'Order has been delivered',
      deprecated: false,
    },
    {
      name: 'CANCELLED',
      value: 'cancelled',
      description: 'Order was cancelled',
      deprecated: false,
    },
  ],
  extensionId: 'my-extension',
  version: '1.0.0',
};

enumRegistry.register(statusEnum);
```

---

## Entity Validation

### Validate Entity Data

```typescript
// Validate before creating
const data = {
  customerId: 'cust-123',
  amount: 99.99,
  status: 'pending',
};

const validation = entityRegistry.validate('Order', data);
if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
  // [
  //   { field: 'status', message: '...', code: 'INVALID_ENUM' }
  // ]
}
```

### Automatic Validation in CRUD

```typescript
const orderService = new EntityService('Order');

// Automatically validates
const result = await orderService.create({
  customerId: 'cust-123',
  amount: 99.99,
  status: 'invalid_status', // Will fail validation
});

if (!result.success) {
  console.log(result.error); // Validation error details
}
```

### Validation Rules

- **Required fields**: Must be provided and not null
- **Type validation**: Value matches field type
- **Enum validation**: Value is in enum values
- **String constraints**: Min/max length, pattern matching
- **Number constraints**: Min/max values
- **Unique constraints**: Value is unique in entity
- **Custom validation**: Via validation hooks

---

## CRUD Operations

### Create

```typescript
const orderService = new EntityService('Order');

const result = await orderService.create({
  customerId: 'cust-123',
  amount: 99.99,
  status: 'pending',
  notes: 'Rush delivery requested',
});

if (result.success) {
  console.log('Created order:', result.data);
  console.log('Created in', result.metadata?.duration, 'ms');
} else {
  console.error('Error:', result.error);
}
```

### Read

```typescript
// Read with filters
const result = await orderService.read({
  filters: [
    { field: 'status', operator: 'eq', value: 'pending' },
    { field: 'amount', operator: 'gte', value: 50 },
  ],
  sort: [{ field: 'amount', direction: 'desc' }],
  skip: 0,
  limit: 100,
  relations: ['customer'], // Include relationships
});

if (result.success) {
  console.log('Found orders:', result.data?.data);
  console.log('Total count:', result.data?.total);
}
```

### Update

```typescript
const result = await orderService.update('order-123', {
  status: 'shipped',
  notes: 'Shipped via FedEx',
});

if (result.success) {
  console.log('Updated order:', result.data);
}
```

### Delete

```typescript
const result = await orderService.delete('order-123');

if (result.success) {
  console.log('Deleted order:', result.data?.id);
}
```

### Find One

```typescript
const result = await orderService.findOne({
  customerId: 'cust-123',
});

if (result.success && result.data) {
  console.log('Found order:', result.data);
} else {
  console.log('Order not found');
}
```

### Count

```typescript
const result = await orderService.count({
  status: 'pending',
});

if (result.success) {
  console.log('Pending orders:', result.data);
}
```

### Batch Operations

```typescript
const result = await orderService.batch([
  { operation: 'create', data: { customerId: 'cust-1', amount: 10.00, status: 'pending' } },
  { operation: 'create', data: { customerId: 'cust-2', amount: 20.00, status: 'pending' } },
  { operation: 'update', data: { id: 'order-123', status: 'shipped' } },
  { operation: 'delete', data: { id: 'order-456' } },
]);

console.log('Successful:', result.successful.length);
console.log('Failed:', result.failed.length);
```

### Bulk Update

```typescript
const result = await orderService.updateMany(
  { status: 'pending' },
  { status: 'processing' }
);

if (result.success) {
  console.log('Updated records:', result.data?.updated);
}
```

### Bulk Delete

```typescript
const result = await orderService.deleteMany({
  status: 'cancelled',
});

if (result.success) {
  console.log('Deleted records:', result.data?.deleted);
}
```

---

## Relationships

### Define Relationships

```typescript
entityRegistry.register({
  name: 'Order',
  fields: [
    { name: 'id', type: 'string', required: true },
    { name: 'customerId', type: 'string', required: true },
  ],
  relationships: [
    {
      name: 'customer',
      type: 'one-to-one',
      targetEntity: 'Customer',
      foreignKey: 'customerId',
    },
    {
      name: 'items',
      type: 'one-to-many',
      targetEntity: 'OrderItem',
    },
    {
      name: 'shipments',
      type: 'many-to-many',
      targetEntity: 'Shipment',
      joinTable: 'order_shipments',
    },
  ],
  extensionId: 'my-extension',
  version: '1.0.0',
});
```

### Use Relationships

```typescript
import { RelationshipQueryBuilder, relationshipManager } from '@machshop/extension-sdk/entities';

// Build include query
const includes = new RelationshipQueryBuilder()
  .include('customer')
  .include('items')
  .depth(2)
  .build();

// Read with includes
const result = await orderService.read({
  relations: includes,
  limit: 10,
});

// Add relationship data (many-to-many)
relationshipManager.addRelationshipData(
  'order_shipments',
  'order-123',
  'shipment-456'
);

// Resolve relationships
const customerData = await relationshipManager.resolveRelationship(
  'Order',
  'order-123',
  'customer'
);
```

### Detect Circular Relationships

```typescript
import { circularDetector } from '@machshop/extension-sdk/entities';

const validation = circularDetector.validate();
if (!validation.valid) {
  console.error('Circular relationships detected:');
  validation.cycles.forEach((cycle) => {
    console.error(cycle.join(' -> '));
  });
}
```

---

## Type Generation

### Generate TypeScript Types

```typescript
const ts = entityRegistry.generateTypeScript('Order');

console.log(ts.code);
// Output:
// export interface Order {
//   id: string;
//   customerId: string;
//   amount: number;
//   status: OrderStatus;
//   notes?: string;
// }
```

### Generate JSON Schema

```typescript
const schema = entityRegistry.generateSchema('Order');

console.log(JSON.stringify(schema, null, 2));
// Output:
// {
//   "$schema": "http://json-schema.org/draft-07/schema#",
//   "id": "Order",
//   "title": "Order",
//   "type": "object",
//   "properties": { ... },
//   "required": ["id", "customerId", "amount"]
// }
```

### Generate Enum Types

```typescript
const enumTs = enumRegistry.generateTypeScript('OrderStatus');

console.log(enumTs.code);
// Output:
// export enum OrderStatus {
//   PENDING = 'pending',
//   SHIPPED = 'shipped',
//   DELIVERED = 'delivered',
// }
```

---

## Best Practices

### 1. Always Include Validation

```typescript
// Good: Validate data before operations
const validation = entityRegistry.validate('Order', data);
if (!validation.valid) {
  throw new Error(`Validation failed: ${validation.errors[0].message}`);
}

// Service already validates, but good to be explicit
```

### 2. Use Enums for Status Fields

```typescript
// Good: Define enum for status values
const orderStatusEnum: EnumDefinition = {
  name: 'OrderStatus',
  values: [
    { name: 'PENDING', value: 'pending' },
    { name: 'SHIPPED', value: 'shipped' },
  ],
  extensionId: 'my-extension',
  version: '1.0.0',
};

// Then use in field:
{ name: 'status', type: 'enum', enumType: 'OrderStatus' }

// Avoid: Free-form string
{ name: 'status', type: 'string' } // Can cause inconsistencies
```

### 3. Add Relationships Explicitly

```typescript
// Good: Define relationships for queries
relationships: [
  {
    name: 'customer',
    type: 'one-to-one',
    targetEntity: 'Customer',
  },
];

// Enables:
const result = await orderService.read({
  relations: ['customer'],
});

// Avoid: Implicit relationships
```

### 4. Enable Timestamps for Audit

```typescript
// Good: Track when entities are created/modified
entityRegistry.register({
  // ...
  timestamps: true, // Adds createdAt, updatedAt
});

// Avoid: Manual tracking
```

### 5. Use Indexed Fields for Queries

```typescript
// Good: Index frequently queried fields
fields: [
  { name: 'customerId', type: 'string', indexed: true },
  { name: 'status', type: 'string', indexed: true },
];

// Improves query performance
```

### 6. Validate Relationships

```typescript
// Good: Check for circular relationships
const validation = circularDetector.validate();
if (!validation.valid) {
  throw new Error('Circular relationships detected');
}

// Avoid: Assuming relationships are valid
```

---

## API Reference

### EntityRegistry

```typescript
class EntityRegistry {
  register(definition: EntityDefinition): void;
  unregister(entityName: string): void;
  get(entityName: string): EntityDefinition | undefined;
  list(): EntityDefinition[];
  validate(entityName: string, data: EntityData): EntityValidationResult;
  generateSchema(entityName: string): JSONSchema;
  generateTypeScript(entityName: string): TypeScriptType;
  onEntityEvent(listener: (event: EntityEvent) => void): () => void;
}
```

### EnumRegistry

```typescript
class EnumRegistry {
  register(definition: EnumDefinition): void;
  unregister(enumName: string): void;
  get(enumName: string): EnumDefinition | undefined;
  list(): EnumDefinition[];
  validate(enumName: string, value: any): boolean;
  values(enumName: string): any[];
  generateTypeScript(enumName: string): TypeScriptType;
}
```

### EntityService<T>

```typescript
class EntityService<T = EntityData> {
  constructor(entityName: string);
  async create(data: T): Promise<OperationResult<T>>;
  async read(options?: EntityQueryOptions): Promise<OperationResult<EntityQueryResult<T>>>;
  async update(id: string, data: Partial<T>): Promise<OperationResult<T>>;
  async delete(id: string): Promise<OperationResult<{ id: string }>>;
  async findOne(filter: Record<string, any>): Promise<OperationResult<T | null>>;
  async count(filter?: Record<string, any>): Promise<OperationResult<number>>;
  async batch(operations: BatchOperation<T>[]): Promise<BatchOperationResult<T>>;
  async updateMany(filter: Record<string, any>, updates: Partial<T>): Promise<OperationResult<{ updated: number }>>;
  async deleteMany(filter: Record<string, any>): Promise<OperationResult<{ deleted: number }>>;
}
```

### EntityRelationshipManager

```typescript
class EntityRelationshipManager {
  registerRelationship(config: RelationshipConfig): void;
  getRelationships(entityName: string): EntityRelationship[];
  getRelationship(entityName: string, relationshipName: string): EntityRelationship | undefined;
  addRelationshipData(joinTable: string, sourceId: string, targetId: string): void;
  removeRelationshipData(joinTable: string, sourceId: string, targetId: string): void;
  getRelationshipData(joinTable: string, sourceId: string): string[];
  async resolveRelationship(sourceEntity: string, sourceId: string, relationshipName: string): Promise<any>;
}
```

---

## Examples

### Complete Custom Entity Example

```typescript
import {
  entityRegistry,
  enumRegistry,
  EntityService,
  circularDetector,
} from '@machshop/extension-sdk/entities';

// Define status enum
enumRegistry.register({
  name: 'ProjectStatus',
  values: [
    { name: 'PLANNING', value: 'planning' },
    { name: 'IN_PROGRESS', value: 'in_progress' },
    { name: 'COMPLETED', value: 'completed' },
  ],
  extensionId: 'project-extension',
  version: '1.0.0',
});

// Define custom project entity
entityRegistry.register({
  name: 'Project',
  description: 'Custom project entity',
  fields: [
    { name: 'id', type: 'string', required: true, indexed: true },
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string' },
    { name: 'status', type: 'enum', enumType: 'ProjectStatus', default: 'planning' },
    { name: 'budget', type: 'number', validation: { min: 0 } },
    { name: 'startDate', type: 'date' },
    { name: 'endDate', type: 'date' },
    { name: 'assignees', type: 'json' }, // Array of user IDs
  ],
  timestamps: true,
  extensionId: 'project-extension',
  version: '1.0.0',
});

// Validate relationships
const validation = circularDetector.validate();
if (!validation.valid) {
  throw new Error('Invalid relationships');
}

// Use service
const projectService = new EntityService('Project');

async function createProject() {
  const result = await projectService.create({
    name: 'Q1 Product Launch',
    description: 'Launch new product features',
    status: 'planning',
    budget: 50000,
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-03-31'),
    assignees: ['user-123', 'user-456'],
  });

  if (result.success) {
    console.log('Project created:', result.data?.id);
  }
}

// Generate types
const projectTs = entityRegistry.generateTypeScript('Project');
const statusTs = enumRegistry.generateTypeScript('ProjectStatus');

// Use generated types
declare global {
  type Project = typeof projectTs;
  type ProjectStatus = typeof statusTs;
}
```

---

## Support

For questions or issues with the entity system, consult the Extension SDK documentation or contact support.
