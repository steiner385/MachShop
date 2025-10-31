/**
 * UUID Utilities for Frontend MBE Traceability
 * Provides validation, formatting, and conversion utilities for UUIDs
 */

import {
  UUID,
  EntityUUID,
  UUIDSupportedEntity,
  UUIDValidationResult,
  StandardFormats,
  UUID_V4_REGEX,
  CUID_REGEX,
  STEPFormat,
  QIFFormat,
  ITARFormat,
  MBE_UUID_CONSTANTS
} from '../types/uuid';

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(value: unknown): value is UUID {
  if (!value || typeof value !== 'string') {
    return false;
  }
  const uuid = value.trim();
  return UUID_V4_REGEX.test(uuid);
}

/**
 * Validates if a string is a valid CUID (legacy format)
 */
export function isValidCUID(value: unknown): value is string {
  if (!value || typeof value !== 'string') {
    return false;
  }
  return CUID_REGEX.test(value.trim());
}

/**
 * Validates and determines the format of an ID
 */
export function validateIdFormat(value: unknown): UUIDValidationResult {
  if (!value || typeof value !== 'string') {
    return { isValid: false, format: 'unknown', error: 'Value must be a string' };
  }

  const trimmed = value.trim();

  if (UUID_V4_REGEX.test(trimmed)) {
    return { isValid: true, format: 'uuid-v4', version: 4 };
  }

  if (CUID_REGEX.test(trimmed)) {
    return { isValid: true, format: 'cuid' };
  }

  if (/^\d+$/.test(trimmed)) {
    return { isValid: true, format: 'numeric' };
  }

  return { isValid: false, format: 'unknown', error: 'Invalid ID format' };
}

/**
 * Normalizes a UUID to lowercase format
 */
export function normalizeUUID(uuid: string): UUID {
  if (!isValidUUID(uuid)) {
    throw new Error('Invalid UUID format - must be UUID v4');
  }
  return uuid.trim().toLowerCase() as UUID;
}

/**
 * Truncates a UUID for display purposes
 */
export function truncateUUID(uuid: string, length: number = 8): string {
  if (!uuid) return '';
  const normalized = uuid.toLowerCase();
  if (normalized.length <= length * 2 + 3) return normalized; // Don't truncate if already short
  return `${normalized.slice(0, length)}...${normalized.slice(-length)}`;
}

/**
 * Formats UUID for different standards
 */
export function formatForSTEP(uuid: string): STEPFormat {
  const normalized = normalizeUUID(uuid);
  return `urn:uuid:${normalized}` as STEPFormat;
}

export function formatForQIF(uuid: string): QIFFormat {
  const normalized = normalizeUUID(uuid);
  return `urn:uuid:${normalized}` as QIFFormat;
}

export function formatForITAR(uuid: string): ITARFormat {
  const normalized = normalizeUUID(uuid);
  return `ITAR-UUID:${normalized.toUpperCase()}` as ITARFormat;
}

/**
 * Gets all standard formats for a UUID
 */
export function getAllStandardFormats(uuid: string): StandardFormats {
  return {
    step: formatForSTEP(uuid),
    qif: formatForQIF(uuid),
    itar: formatForITAR(uuid)
  };
}

/**
 * Checks if an entity type supports UUIDs
 */
export function supportsUUID(entityType: string): entityType is UUIDSupportedEntity {
  return Object.values(UUIDSupportedEntity).includes(entityType as UUIDSupportedEntity);
}

/**
 * Validates UUID for specific entity type
 */
export function validateEntityUUID(entityType: UUIDSupportedEntity, uuid: string): boolean {
  if (!supportsUUID(entityType)) {
    throw new Error(`Entity type ${entityType} does not support persistent UUIDs`);
  }
  return isValidUUID(uuid);
}

/**
 * Creates a typed UUID for specific entity
 */
export function createEntityUUID<T extends EntityUUID>(uuid: string): T {
  if (!isValidUUID(uuid)) {
    throw new Error('Invalid UUID format');
  }
  return normalizeUUID(uuid) as T;
}

/**
 * Copies UUID to clipboard
 */
export async function copyUUIDToClipboard(uuid: string, format: 'raw' | 'step' | 'qif' | 'itar' = 'raw'): Promise<boolean> {
  try {
    let textToCopy: string;

    switch (format) {
      case 'step':
        textToCopy = formatForSTEP(uuid);
        break;
      case 'qif':
        textToCopy = formatForQIF(uuid);
        break;
      case 'itar':
        textToCopy = formatForITAR(uuid);
        break;
      default:
        textToCopy = normalizeUUID(uuid);
    }

    await navigator.clipboard.writeText(textToCopy);
    return true;
  } catch (error) {
    console.error('Failed to copy UUID to clipboard:', error);
    return false;
  }
}

/**
 * Detects if a URL parameter is a UUID
 */
export function isUUIDParam(param: string): boolean {
  return isValidUUID(param);
}

/**
 * Gets display text for an entity with UUID
 */
export function getEntityDisplayText(
  entityType: UUIDSupportedEntity,
  uuid: string,
  displayName?: string
): string {
  if (displayName) {
    return displayName;
  }

  // Fallback to truncated UUID if no display name
  return `${entityType}: ${truncateUUID(uuid)}`;
}

/**
 * Creates a URL-safe UUID parameter
 */
export function createUUIDParam(uuid: string): string {
  return normalizeUUID(uuid);
}

/**
 * Parses UUID from URL parameter
 */
export function parseUUIDParam(param: string): UUID {
  const validation = validateIdFormat(param);

  if (!validation.isValid) {
    throw new Error(`Invalid UUID parameter: ${validation.error}`);
  }

  if (validation.format !== 'uuid-v4') {
    throw new Error(`UUID parameter must be UUID v4 format, got: ${validation.format}`);
  }

  return normalizeUUID(param);
}

/**
 * Creates a search-friendly UUID query
 */
export function createUUIDSearchQuery(uuid: string): string {
  // Remove dashes for more flexible searching
  return normalizeUUID(uuid).replace(/-/g, '');
}

/**
 * Checks if a search query might be a UUID
 */
export function isLikelyUUIDQuery(query: string): boolean {
  // Remove spaces and dashes
  const cleaned = query.replace(/[\s-]/g, '');

  // Check if it's hex and appropriate length
  if (!/^[0-9a-f]+$/i.test(cleaned)) {
    return false;
  }

  // UUID without dashes is 32 characters
  return cleaned.length >= 8 && cleaned.length <= 32;
}

/**
 * Attempts to reconstruct UUID from partial input
 */
export function reconstructUUID(partial: string): string | null {
  const cleaned = partial.replace(/[\s-]/g, '').toLowerCase();

  if (cleaned.length !== 32) {
    return null;
  }

  if (!/^[0-9a-f]{32}$/i.test(cleaned)) {
    return null;
  }

  // Reconstruct UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  const uuid = `${cleaned.slice(0, 8)}-${cleaned.slice(8, 12)}-${cleaned.slice(12, 16)}-${cleaned.slice(16, 20)}-${cleaned.slice(20, 32)}`;

  return isValidUUID(uuid) ? uuid : null;
}

/**
 * UUID error classes for better error handling
 */
export class UUIDValidationError extends Error {
  constructor(
    message: string,
    public readonly uuid: string,
    public readonly entityType?: UUIDSupportedEntity
  ) {
    super(message);
    this.name = 'UUIDValidationError';
  }
}

export class UUIDNotFoundError extends Error {
  constructor(
    public readonly uuid: string,
    public readonly entityType?: UUIDSupportedEntity
  ) {
    const entityText = entityType ? `${entityType} ` : '';
    super(`${entityText}with persistent UUID ${uuid} not found`);
    this.name = 'UUIDNotFoundError';
  }
}

/**
 * UUID constants for frontend usage
 */
export const FRONTEND_UUID_CONSTANTS = {
  ...MBE_UUID_CONSTANTS,
  TRUNCATE_LENGTH: 8,
  COPY_TIMEOUT: 2000,
  TOOLTIP_DELAY: 300
} as const;

/**
 * Default UUID display options
 */
export const DEFAULT_UUID_DISPLAY_OPTIONS = {
  showCopy: true,
  showTooltip: true,
  truncate: true,
  truncateLength: FRONTEND_UUID_CONSTANTS.TRUNCATE_LENGTH,
  showPrefix: false
} as const;