/**
 * Custom Entity & Enum Extension System - Type Definitions
 * Issue #441: Custom Entity & Enum Extension System
 */

/**
 * JSON Schema type definitions
 */
export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

/**
 * JSON Schema property definition
 */
export interface JSONSchemaProperty {
  type: JSONSchemaType | JSONSchemaType[];
  description?: string;
  default?: any;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  $ref?: string;
}

/**
 * Complete JSON Schema definition
 */
export interface JSONSchema {
  $schema?: string;
  id?: string;
  title: string;
  description?: string;
  type: 'object';
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  examples?: any[];
}

/**
 * Entity field definition
 */
export interface EntityField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum' | 'json' | 'relation';
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  description?: string;
  default?: any;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  enumType?: string;
  relationTarget?: string;
  relationField?: string;
}

/**
 * Entity definition
 */
export interface EntityDefinition {
  name: string;
  description?: string;
  tableName?: string;
  fields: EntityField[];
  primaryKey?: string;
  relationships?: EntityRelationship[];
  indexes?: EntityIndex[];
  timestamps?: boolean;
  extensionId: string;
  version: string;
  schema?: JSONSchema;
}

/**
 * Entity relationship definition
 */
export interface EntityRelationship {
  name: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  targetEntity: string;
  foreignKey?: string;
  joinTable?: string;
  description?: string;
}

/**
 * Entity index definition
 */
export interface EntityIndex {
  name: string;
  fields: string[];
  unique?: boolean;
  description?: string;
}

/**
 * Enum definition
 */
export interface EnumDefinition {
  name: string;
  description?: string;
  values: EnumValue[];
  extensionId: string;
  version: string;
}

/**
 * Enum value
 */
export interface EnumValue {
  name: string;
  value: string | number;
  description?: string;
  deprecated?: boolean;
}

/**
 * Entity validation result
 */
export interface EntityValidationResult {
  valid: boolean;
  errors: {
    field?: string;
    message: string;
    code: string;
  }[];
}

/**
 * Entity instance data
 */
export interface EntityData {
  [key: string]: any;
}

/**
 * Entity query filter
 */
export interface EntityFilter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
}

/**
 * Entity query options
 */
export interface EntityQueryOptions {
  filters?: EntityFilter[];
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  }[];
  skip?: number;
  limit?: number;
  fields?: string[];
  relations?: string[];
}

/**
 * Entity query result
 */
export interface EntityQueryResult<T = any> {
  data: T[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * CRUD operation result
 */
export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    timestamp: Date;
    duration: number;
    operationType: 'create' | 'read' | 'update' | 'delete' | 'batch';
  };
}

/**
 * Batch operation
 */
export interface BatchOperation<T = any> {
  operation: 'create' | 'update' | 'delete';
  data: T;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult<T = any> {
  successful: OperationResult<T>[];
  failed: Array<{
    operation: BatchOperation<T>;
    error: {
      code: string;
      message: string;
    };
  }>;
}

/**
 * TypeScript type representation
 */
export interface TypeScriptType {
  name: string;
  code: string;
  imports: string[];
  interfaces: string[];
}

/**
 * Entity event types
 */
export enum EntityEventType {
  REGISTERED = 'REGISTERED',
  SCHEMA_CHANGED = 'SCHEMA_CHANGED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  RELATIONSHIP_ADDED = 'RELATIONSHIP_ADDED',
}

/**
 * Entity event
 */
export interface EntityEvent {
  type: EntityEventType;
  entityName: string;
  timestamp: Date;
  data?: any;
  metadata?: Record<string, any>;
}

/**
 * Entity registry interface
 */
export interface IEntityRegistry {
  register(definition: EntityDefinition): void;
  unregister(entityName: string): void;
  get(entityName: string): EntityDefinition | undefined;
  list(): EntityDefinition[];
  validate(entityName: string, data: EntityData): EntityValidationResult;
  generateSchema(entityName: string): JSONSchema;
  generateTypeScript(entityName: string): TypeScriptType;
  onEntityEvent(listener: (event: EntityEvent) => void): () => void;
}

/**
 * Enum registry interface
 */
export interface IEnumRegistry {
  register(definition: EnumDefinition): void;
  unregister(enumName: string): void;
  get(enumName: string): EnumDefinition | undefined;
  list(): EnumDefinition[];
  validate(enumName: string, value: any): boolean;
  values(enumName: string): EnumValue[];
  generateTypeScript(enumName: string): TypeScriptType;
}

/**
 * Entity errors
 */
export class EntityError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'EntityError';
  }
}

export class EntityNotFoundError extends EntityError {
  constructor(entityName: string) {
    super(`Entity not found: ${entityName}`, 'ENTITY_NOT_FOUND', { entityName });
    this.name = 'EntityNotFoundError';
  }
}

export class EntityValidationError extends EntityError {
  constructor(
    entityName: string,
    public validationErrors: any[]
  ) {
    super(`Validation failed for entity: ${entityName}`, 'ENTITY_VALIDATION_ERROR', {
      entityName,
      errors: validationErrors,
    });
    this.name = 'EntityValidationError';
  }
}

export class DuplicateEntityError extends EntityError {
  constructor(entityName: string) {
    super(`Entity already registered: ${entityName}`, 'DUPLICATE_ENTITY', { entityName });
    this.name = 'DuplicateEntityError';
  }
}
