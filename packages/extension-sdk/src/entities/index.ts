/**
 * Custom Entity & Enum Extension System
 * Issue #441: Custom Entity & Enum Extension System
 */

// Core registries
export { EntityRegistry, EnumRegistry, entityRegistry, enumRegistry } from './registry';

// CRUD operations
export { EntityCRUDService, crudService, EntityService } from './crud';

// Relationships
export {
  EntityRelationshipManager,
  RelationshipQueryBuilder,
  CircularRelationshipDetector,
  relationshipManager,
  circularDetector,
  type RelationshipConfig,
  type RelationshipResolver,
} from './relationships';

// Types and interfaces
export {
  JSONSchemaType,
  JSONSchema,
  JSONSchemaProperty,
  EntityField,
  EntityDefinition,
  EntityRelationship,
  EntityIndex,
  EnumDefinition,
  EnumValue,
  EntityValidationResult,
  EntityData,
  EntityFilter,
  EntityQueryOptions,
  EntityQueryResult,
  OperationResult,
  BatchOperation,
  BatchOperationResult,
  TypeScriptType,
  EntityEvent,
  EntityEventType,
  IEntityRegistry,
  IEnumRegistry,
  EntityError,
  EntityNotFoundError,
  EntityValidationError,
  DuplicateEntityError,
} from './types';

/**
 * Quick start example:
 *
 * @example
 * ```typescript
 * import {
 *   entityRegistry,
 *   enumRegistry,
 *   EntityService,
 * } from '@machshop/extension-sdk/entities';
 *
 * // Define an enum
 * enumRegistry.register({
 *   name: 'OrderStatus',
 *   values: [
 *     { name: 'PENDING', value: 'pending' },
 *     { name: 'PROCESSING', value: 'processing' },
 *     { name: 'COMPLETED', value: 'completed' },
 *   ],
 *   extensionId: 'my-extension',
 *   version: '1.0.0',
 * });
 *
 * // Define a custom entity
 * entityRegistry.register({
 *   name: 'CustomOrder',
 *   tableName: 'custom_orders',
 *   fields: [
 *     { name: 'id', type: 'string', required: true },
 *     { name: 'customerId', type: 'string', required: true },
 *     { name: 'amount', type: 'number', required: true },
 *     { name: 'status', type: 'enum', enumType: 'OrderStatus' },
 *     { name: 'notes', type: 'string' },
 *   ],
 *   extensionId: 'my-extension',
 *   version: '1.0.0',
 * });
 *
 * // Use CRUD service
 * const orderService = new EntityService('CustomOrder');
 * const result = await orderService.create({
 *   customerId: 'cust-123',
 *   amount: 99.99,
 *   status: 'pending',
 * });
 *
 * // Validate data
 * const validation = entityRegistry.validate('CustomOrder', {
 *   customerId: 'cust-123',
 *   amount: 99.99,
 *   status: 'pending',
 * });
 *
 * // Generate TypeScript types
 * const ts = entityRegistry.generateTypeScript('CustomOrder');
 * console.log(ts.code);
 *
 * // Generate JSON schema
 * const schema = entityRegistry.generateSchema('CustomOrder');
 * ```
 */
