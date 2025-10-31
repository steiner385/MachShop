/**
 * UUID Type Definitions and Utilities for MBE Traceability
 * Provides type-safe UUID handling with branded types for different entities
 */

// Branded UUID types for type safety
export type UUID = string & { readonly __brand: 'UUID' };
export type PartUUID = UUID & { readonly __entity: 'Part' };
export type WorkOrderUUID = UUID & { readonly __entity: 'WorkOrder' };
export type MaterialLotUUID = UUID & { readonly __entity: 'MaterialLot' };
export type RoutingUUID = UUID & { readonly __entity: 'Routing' };
export type OperationUUID = UUID & { readonly __entity: 'Operation' };
export type BOMItemUUID = UUID & { readonly __entity: 'BOMItem' };
export type SerializedPartUUID = UUID & { readonly __entity: 'SerializedPart' };
export type PartGenealogyUUID = UUID & { readonly __entity: 'PartGenealogy' };

// Entity UUID union type
export type EntityUUID =
  | PartUUID
  | WorkOrderUUID
  | MaterialLotUUID
  | RoutingUUID
  | OperationUUID
  | BOMItemUUID
  | SerializedPartUUID
  | PartGenealogyUUID;

// Entity types that support UUIDs
export enum UUIDSupportedEntity {
  PART = 'Part',
  WORK_ORDER = 'WorkOrder',
  MATERIAL_LOT = 'MaterialLot',
  ROUTING = 'Routing',
  OPERATION = 'Operation',
  BOM_ITEM = 'BOMItem',
  SERIALIZED_PART = 'SerializedPart',
  PART_GENEALOGY = 'PartGenealogy'
}

// UUID validation regex (UUID v4 format)
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// CUID validation regex (for legacy compatibility)
export const CUID_REGEX = /^c[a-z0-9]{24}$/i;

// Interface for entities with persistent UUIDs
export interface HasPersistentUUID {
  id: string; // Internal CUID
  persistentUuid?: string; // MBE UUID for external integration
}

// Display preferences for UUIDs
export interface UUIDDisplayOptions {
  showCopy?: boolean;
  showTooltip?: boolean;
  truncate?: boolean;
  truncateLength?: number;
  showPrefix?: boolean;
  prefix?: string;
}

// UUID validation result
export interface UUIDValidationResult {
  isValid: boolean;
  format: 'uuid-v4' | 'cuid' | 'numeric' | 'unknown';
  version?: number;
  error?: string;
}

// MBE compliance constants
export const MBE_UUID_CONSTANTS = {
  VERSION: 4,
  STANDARD: 'NIST AMS 300-12',
  PURPOSE: 'Model-Based Enterprise Traceability',
  FORMAT: 'UUID v4 (RFC 4122)',
  NAMESPACE: 'urn:uuid'
} as const;

// Export format types for standards integration
export type STEPFormat = `urn:uuid:${string}`;
export type QIFFormat = `urn:uuid:${string}`;
export type ITARFormat = `ITAR-UUID:${string}`;

export interface StandardFormats {
  step: STEPFormat;
  qif: QIFFormat;
  itar: ITARFormat;
}