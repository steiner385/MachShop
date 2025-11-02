/**
 * Custom Fields System - Main Export File
 */

// Types
export * from './types';

// Mapping
export { DataTypeMapper } from './mapping/DataTypeMapper';

// Migrations
export { MigrationEngine } from './migrations/MigrationEngine';

// Validation
export { FieldValidator } from './validation/FieldValidator';

// Version
export const VERSION = '1.0.0';
