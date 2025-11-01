/**
 * Database Schema Extension Framework
 * Issue #438: Database Schema Extension Framework
 */

// Registry
export { SchemaExtensionRegistry, schemaRegistry } from './registry';
export type { SchemaRegistryEvent } from './registry';

// Migrations
export { MigrationManager, migrationManager } from './migrations';
export type { MigrationEvent } from './migrations';

// Validation & Data Safety
export { DataSafetyValidator, dataSafetyValidator } from './validation';

// Types
export {
  SchemaField,
  SchemaTable,
  SchemaExtension,
  SchemaMigration,
  MigrationState,
  DataSafetyPolicy,
  SchemaValidationResult,
  CompatibilityResult,
  SchemaConflict,
  PrismaSchema,
  ISchemaRegistry,
  SchemaError,
  SchemaValidationError,
  SchemaConflictError,
  MigrationError,
} from './types';

/**
 * Quick start:
 *
 * @example
 * ```typescript
 * import {
 *   SchemaExtensionRegistry,
 *   MigrationManager,
 *   DataSafetyValidator,
 *   schemaRegistry,
 *   migrationManager,
 *   dataSafetyValidator,
 * } from '@machshop/extension-sdk/schema';
 *
 * // Define a table schema
 * const table = {
 *   name: 'products',
 *   extensionId: 'my-extension',
 *   version: '1.0.0',
 *   fields: [
 *     {
 *       name: 'id',
 *       type: 'String',
 *       required: true,
 *       unique: true,
 *     },
 *     {
 *       name: 'name',
 *       type: 'String',
 *       required: true,
 *     },
 *     {
 *       name: 'price',
 *       type: 'Decimal',
 *       validation: { min: 0 },
 *     },
 *   ],
 * };
 *
 * // Define schema extension
 * const schema = {
 *   id: 'schema-1',
 *   name: 'Product Schema',
 *   extensionId: 'my-extension',
 *   version: '1.0.0',
 *   tables: [table],
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * };
 *
 * // Register schema
 * schemaRegistry.register(schema);
 *
 * // Create migration
 * const migration = migrationManager.createMigration(
 *   'my-extension',
 *   '1.0.0',
 *   'create',
 *   'products',
 *   []
 * );
 *
 * // Apply migration
 * await migrationManager.applyMigration(migration);
 *
 * // Generate Prisma schema
 * const prismaSchema = schemaRegistry.generatePrismaSchema(schema);
 * ```
 */
