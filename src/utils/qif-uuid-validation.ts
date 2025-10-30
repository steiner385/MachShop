/**
 * QIF UUID Validation Utilities
 * Comprehensive validation for NIST AMS 300-12 compliant UUIDs
 */

import { validate as validateUUID, version as getUUIDVersion } from 'uuid';
import { z } from 'zod';

// =======================
// Core UUID Validation
// =======================

/**
 * Validate UUID format strictly
 */
export function isValidUUID(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return validateUUID(value.trim());
}

/**
 * Validate UUID version (NIST AMS 300-12 recommends UUID v4)
 */
export function isNistCompliantUUID(value: string): boolean {
  if (!isValidUUID(value)) {
    return false;
  }

  // NIST AMS 300-12 recommends UUID v4 for quality data
  const version = getUUIDVersion(value.trim());
  return version === 4;
}

/**
 * Normalize UUID format (lowercase, trimmed)
 */
export function normalizeUUID(value: string): string {
  if (!isValidUUID(value)) {
    throw new Error('Invalid UUID format');
  }

  return value.trim().toLowerCase();
}

/**
 * Comprehensive UUID validation result
 */
export interface UUIDValidationResult {
  isValid: boolean;
  isNistCompliant: boolean;
  version?: number;
  normalized?: string;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive UUID validation with detailed feedback
 */
export function validateQIFUUID(value: string): UUIDValidationResult {
  const result: UUIDValidationResult = {
    isValid: false,
    isNistCompliant: false,
    errors: [],
    warnings: [],
  };

  if (typeof value !== 'string') {
    result.errors.push('UUID value is required and must be a string');
    return result;
  }

  if (!value) {
    result.errors.push('UUID cannot be empty');
    return result;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    result.errors.push('UUID cannot be empty');
    return result;
  }

  // Check basic UUID format
  if (!validateUUID(trimmed)) {
    result.errors.push('Invalid UUID format');
    return result;
  }

  result.isValid = true;
  result.normalized = normalizeUUID(trimmed);

  // Check UUID version
  const version = getUUIDVersion(trimmed);
  result.version = version;

  if (version !== 4) {
    result.warnings.push(`UUID version ${version} detected - NIST AMS 300-12 recommends UUID v4`);
    result.isNistCompliant = false;
  } else {
    result.isNistCompliant = true;
  }

  // Check for common issues
  if (trimmed !== trimmed.toLowerCase()) {
    result.warnings.push('UUID contains uppercase characters - consider using lowercase for consistency');
  }

  if (trimmed !== value) {
    result.warnings.push('UUID contains leading/trailing whitespace');
  }

  return result;
}

// =======================
// Zod Schemas for Validation
// =======================

/**
 * Basic UUID validation schema
 */
export const UUIDSchema = z.string().refine(isValidUUID, {
  message: 'Must be a valid UUID format',
});

/**
 * NIST AMS 300-12 compliant UUID schema
 */
export const NISTCompliantUUIDSchema = z.string().refine(isNistCompliantUUID, {
  message: 'Must be a NIST AMS 300-12 compliant UUID (version 4)',
});

/**
 * Flexible UUID schema (accepts UUID or legacy string)
 */
export const FlexibleQIFIdSchema = z.union([
  z.string().refine(isValidUUID, { message: 'Invalid UUID format' }),
  z.string().min(1).max(100),
]);

/**
 * QIF Plan identifier schema supporting both UUID and legacy formats
 */
export const QIFPlanIdSchema = z.object({
  qifPlanUuid: UUIDSchema.optional(),
  qifPlanId: z.string().optional(),
}).refine(
  (data) => data.qifPlanUuid || data.qifPlanId,
  { message: 'Either qifPlanUuid or qifPlanId must be provided' }
);

/**
 * QIF Results identifier schema supporting both UUID and legacy formats
 */
export const QIFResultsIdSchema = z.object({
  qifResultsUuid: UUIDSchema.optional(),
  qifResultsId: z.string().optional(),
}).refine(
  (data) => data.qifResultsUuid || data.qifResultsId,
  { message: 'Either qifResultsUuid or qifResultsId must be provided' }
);

/**
 * QIF Characteristic identifier schema
 */
export const QIFCharacteristicIdSchema = z.object({
  characteristicUuid: UUIDSchema.optional(),
  characteristicId: z.string().optional(),
}).refine(
  (data) => data.characteristicUuid || data.characteristicId,
  { message: 'Either characteristicUuid or characteristicId must be provided' }
);

/**
 * QIF Import request schema with UUID validation
 */
export const QIFImportRequestSchema = z.object({
  qifXml: z.string().min(1, 'QIF XML content is required'),
  validateUuids: z.boolean().default(true),
  requireNistCompliance: z.boolean().default(false),
  workOrderId: z.string().optional(),
  serializedPartId: z.string().optional(),
  planUuid: UUIDSchema.optional(),
  resultsUuid: UUIDSchema.optional(),
});

/**
 * QIF Export options schema with UUID preferences
 */
export const QIFExportOptionsSchema = z.object({
  format: z.enum(['xml', 'json']).default('xml'),
  includeUuids: z.boolean().default(true),
  nistCompliance: z.boolean().default(true),
  validateUuids: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
  includeStatistics: z.boolean().default(false),
});

// =======================
// Validation Helpers
// =======================

/**
 * Validate QIF identifier and return normalized form
 */
export function validateAndNormalizeQIFId(
  uuidValue?: string,
  legacyValue?: string,
  options: {
    preferUuid?: boolean;
    requireUuid?: boolean;
    allowLegacy?: boolean;
  } = {}
): { id: string; type: 'uuid' | 'legacy'; normalized: string } {
  const { preferUuid = true, requireUuid = false, allowLegacy = true } = options;

  // Check UUID first if available
  if (uuidValue) {
    const uuidValidation = validateQIFUUID(uuidValue);
    if (uuidValidation.isValid) {
      return {
        id: uuidValue,
        type: 'uuid',
        normalized: uuidValidation.normalized!,
      };
    } else {
      throw new Error(`Invalid UUID: ${uuidValidation.errors.join(', ')}`);
    }
  }

  // Check legacy ID if allowed
  if (legacyValue && allowLegacy && !requireUuid) {
    if (legacyValue.trim().length === 0) {
      throw new Error('Legacy ID cannot be empty');
    }
    if (legacyValue.length > 100) {
      throw new Error('Legacy ID too long (max 100 characters)');
    }
    return {
      id: legacyValue,
      type: 'legacy',
      normalized: legacyValue.trim(),
    };
  }

  // No valid identifier found
  if (requireUuid) {
    throw new Error('UUID is required but not provided or invalid');
  }

  if (!allowLegacy) {
    throw new Error('Legacy IDs not allowed in current configuration');
  }

  throw new Error('No valid identifier provided');
}

/**
 * Create validation middleware for UUID parameters
 */
export function createUUIDValidationMiddleware(options: {
  paramNames?: string[];
  bodyFields?: string[];
  allowLegacyIds?: boolean;
  strictMode?: boolean;
  requireAtLeastOne?: boolean;
}) {
  return (req: any, res: any, next: any) => {
    const { paramNames = [], bodyFields = [], allowLegacyIds = true, strictMode = false, requireAtLeastOne = false } = options;

    req.validatedUUIDs = {};
    req.qifValidation = {
      errors: [],
      warnings: []
    };

    let foundValid = false;

    // Validate parameters
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value !== undefined) {
        if (value === '') {
          req.qifValidation.errors.push(`${paramName} cannot be empty`);
        } else if (isValidUUID(value)) {
          const validation = validateQIFUUID(value);
          req.validatedUUIDs[paramName] = {
            type: 'uuid',
            normalized: validation.normalized,
            validation
          };
          foundValid = true;
        } else if (allowLegacyIds && value.trim().length > 0) {
          req.validatedUUIDs[paramName] = {
            type: 'legacy',
            normalized: value.trim()
          };
          foundValid = true;
        } else {
          req.qifValidation.errors.push(`${paramName} must be a valid UUID or identifier`);
        }
      }
    }

    // Validate body fields
    for (const fieldName of bodyFields) {
      const value = req.body?.[fieldName];
      if (value !== undefined) {
        if (value === '') {
          req.qifValidation.errors.push(`${fieldName} cannot be empty`);
        } else if (isValidUUID(value)) {
          const validation = validateQIFUUID(value);
          if (validation.isValid) {
            req.validatedUUIDs[fieldName] = {
              type: 'uuid',
              normalized: validation.normalized,
              validation
            };
            foundValid = true;
          } else {
            req.qifValidation.errors.push(`${fieldName}: ${validation.errors.join(', ')}`);
          }
        } else if (allowLegacyIds && value.trim().length > 0) {
          req.validatedUUIDs[fieldName] = {
            type: 'legacy',
            normalized: value.trim()
          };
          foundValid = true;
        } else {
          req.qifValidation.errors.push(`${fieldName} must be a valid UUID or identifier`);
        }
      }
    }

    if (requireAtLeastOne && !foundValid && (paramNames.length > 0 || bodyFields.length > 0)) {
      req.qifValidation.errors.push('At least one valid identifier required');
    }

    if (strictMode && req.qifValidation.errors.length > 0) {
      return res.status(400).json({
        error: 'UUID validation failed',
        details: req.qifValidation.errors
      });
    }

    next();
  };
}

/**
 * Batch validate multiple UUIDs
 */
export function validateMultipleUUIDs(uuids: string[]): {
  valid: string[];
  invalid: Array<{ uuid: string; errors: string[] }>;
  warnings: Array<{ uuid: string; warnings: string[] }>;
} {
  const result = {
    valid: [] as string[],
    invalid: [] as Array<{ uuid: string; errors: string[] }>,
    warnings: [] as Array<{ uuid: string; warnings: string[] }>,
  };

  for (const uuid of uuids) {
    const validation = validateQIFUUID(uuid);

    if (validation.isValid) {
      result.valid.push(validation.normalized!);

      if (validation.warnings.length > 0) {
        result.warnings.push({
          uuid,
          warnings: validation.warnings,
        });
      }
    } else {
      result.invalid.push({
        uuid,
        errors: validation.errors,
      });
    }
  }

  return result;
}

/**
 * Export all validation utilities
 */
export default {
  isValidUUID,
  isNistCompliantUUID,
  normalizeUUID,
  validateQIFUUID,
  validateAndNormalizeQIFId,
  validateMultipleUUIDs,
  createUUIDValidationMiddleware,
  // Schemas
  UUIDSchema,
  NISTCompliantUUIDSchema,
  FlexibleQIFIdSchema,
  QIFPlanIdSchema,
  QIFResultsIdSchema,
  QIFCharacteristicIdSchema,
  QIFImportRequestSchema,
  QIFExportOptionsSchema,
};