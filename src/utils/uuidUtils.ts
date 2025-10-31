/**
 * MBE Persistent UUID Utilities
 * For NIST AMS 300-12 compliant Model-Based Enterprise traceability
 */

import { v4 as uuidv4, validate as validateUUID, version as getUUIDVersion } from 'uuid';
import { z } from 'zod';

// ===========================
// UUID Generation & Validation
// ===========================

/**
 * Generate a new UUID v4 for MBE traceability
 * Follows NIST AMS 300-12 recommendations
 */
export function generatePersistentUUID(): string {
  return uuidv4();
}

/**
 * Validate UUID format and version
 */
export function isValidPersistentUUID(value: unknown): value is string {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const uuid = value.trim();

  // Check format
  if (!validateUUID(uuid)) {
    return false;
  }

  // NIST AMS 300-12 recommends UUID v4
  const version = getUUIDVersion(uuid);
  return version === 4;
}

/**
 * Normalize UUID format (lowercase, trimmed)
 */
export function normalizePersistentUUID(value: string): string {
  if (!isValidPersistentUUID(value)) {
    throw new Error('Invalid persistent UUID format');
  }

  return value.trim().toLowerCase();
}

// ===========================
// Zod Schemas
// ===========================

/**
 * Zod schema for persistent UUID validation
 */
export const PersistentUUIDSchema = z.string()
  .refine(isValidPersistentUUID, {
    message: 'Must be a valid UUID v4 format for MBE traceability'
  })
  .transform(normalizePersistentUUID);

/**
 * Optional persistent UUID schema
 */
export const OptionalPersistentUUIDSchema = z.string()
  .optional()
  .refine((value) => !value || isValidPersistentUUID(value), {
    message: 'Must be a valid UUID v4 format for MBE traceability'
  })
  .transform((value) => value ? normalizePersistentUUID(value) : undefined);

// ===========================
// Entity-Specific UUID Helpers
// ===========================

/**
 * Validate Part persistent UUID
 */
export function validatePartUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate SerializedPart persistent UUID
 */
export function validateSerializedPartUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate MaterialLot persistent UUID
 */
export function validateMaterialLotUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate WorkOrder persistent UUID
 */
export function validateWorkOrderUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate BOMItem persistent UUID
 */
export function validateBOMItemUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate Operation persistent UUID
 */
export function validateOperationUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate Routing persistent UUID
 */
export function validateRoutingUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

/**
 * Validate PartGenealogy persistent UUID
 */
export function validatePartGenealogyUUID(uuid: string): boolean {
  return isValidPersistentUUID(uuid);
}

// ===========================
// UUID Lookup Utilities
// ===========================

/**
 * Find entity by persistent UUID
 * Generic helper for database lookups
 */
export function createUUIDLookupQuery(persistentUuid: string) {
  const normalizedUuid = normalizePersistentUUID(persistentUuid);
  return {
    where: {
      persistentUuid: normalizedUuid
    }
  };
}

/**
 * Build unique constraint for persistent UUID
 */
export function createUUIDUniqueConstraint(persistentUuid: string) {
  const normalizedUuid = normalizePersistentUUID(persistentUuid);
  return {
    persistentUuid: normalizedUuid
  };
}

// ===========================
// MBE Integration Helpers
// ===========================

/**
 * Format UUID for STEP AP242 integration
 * CAD model identifiers in ISO 10303-242 format
 */
export function formatForSTEP(persistentUuid: string): string {
  const normalizedUuid = normalizePersistentUUID(persistentUuid);
  return `urn:uuid:${normalizedUuid}`;
}

/**
 * Format UUID for QIF integration
 * Quality Information Framework per NIST standards
 */
export function formatForQIF(persistentUuid: string): string {
  const normalizedUuid = normalizePersistentUUID(persistentUuid);
  return `urn:uuid:${normalizedUuid}`;
}

/**
 * Format UUID for ITAR/Export Control
 * Ensure persistent identification for controlled items
 */
export function formatForITAR(persistentUuid: string): string {
  const normalizedUuid = normalizePersistentUUID(persistentUuid);
  return `ITAR-UUID:${normalizedUuid.toUpperCase()}`;
}

// ===========================
// Error Classes
// ===========================

export class PersistentUUIDError extends Error {
  constructor(message: string, public uuid?: string) {
    super(message);
    this.name = 'PersistentUUIDError';
  }
}

export class UUIDNotFoundError extends PersistentUUIDError {
  constructor(uuid: string, entityType?: string) {
    super(`${entityType || 'Entity'} with persistent UUID ${uuid} not found`);
    this.name = 'UUIDNotFoundError';
  }
}

export class DuplicateUUIDError extends PersistentUUIDError {
  constructor(uuid: string, entityType?: string) {
    super(`Duplicate persistent UUID ${uuid} found for ${entityType || 'entity'}`);
    this.name = 'DuplicateUUIDError';
  }
}

// ===========================
// Constants
// ===========================

/**
 * NIST AMS 300-12 compliance constants
 */
export const MBE_UUID_CONSTANTS = {
  VERSION: 4,
  STANDARD: 'NIST AMS 300-12',
  PURPOSE: 'Model-Based Enterprise Traceability',
  FORMAT: 'UUID v4 (RFC 4122)',
  NAMESPACE: 'urn:uuid',
  REQUIREMENTS: {
    PERSISTENT: true,
    UNIQUE: true,
    GLOBAL: true,
    IMMUTABLE: true
  }
} as const;

/**
 * Entity types that support persistent UUIDs
 */
export const UUID_SUPPORTED_ENTITIES = [
  'Part',
  'SerializedPart',
  'MaterialLot',
  'WorkOrder',
  'BOMItem',
  'Operation',
  'Routing',
  'PartGenealogy'
] as const;

export type UUIDSupportedEntity = typeof UUID_SUPPORTED_ENTITIES[number];

// ===========================
// Type Guards
// ===========================

/**
 * Check if entity type supports persistent UUIDs
 */
export function supportsUUID(entityType: string): entityType is UUIDSupportedEntity {
  return UUID_SUPPORTED_ENTITIES.includes(entityType as UUIDSupportedEntity);
}

/**
 * Validate entity UUID mapping
 */
export function validateEntityUUID(entityType: UUIDSupportedEntity, uuid: string): boolean {
  if (!supportsUUID(entityType)) {
    throw new PersistentUUIDError(`Entity type ${entityType} does not support persistent UUIDs`);
  }

  return isValidPersistentUUID(uuid);
}

// ===========================
// Export All
// ===========================

export default {
  // Generation
  generatePersistentUUID,

  // Validation
  isValidPersistentUUID,
  normalizePersistentUUID,

  // Schemas
  PersistentUUIDSchema,
  OptionalPersistentUUIDSchema,

  // Entity-specific validators
  validatePartUUID,
  validateSerializedPartUUID,
  validateMaterialLotUUID,
  validateWorkOrderUUID,
  validateBOMItemUUID,
  validateOperationUUID,
  validateRoutingUUID,
  validatePartGenealogyUUID,

  // Utilities
  createUUIDLookupQuery,
  createUUIDUniqueConstraint,

  // MBE Integration
  formatForSTEP,
  formatForQIF,
  formatForITAR,

  // Type guards
  supportsUUID,
  validateEntityUUID,

  // Constants
  MBE_UUID_CONSTANTS,
  UUID_SUPPORTED_ENTITIES,

  // Errors
  PersistentUUIDError,
  UUIDNotFoundError,
  DuplicateUUIDError
};