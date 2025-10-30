/**
 * QIF UUID Validation Middleware
 * Express middleware for validating UUIDs in QIF API routes
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  validateQIFUUID,
  isValidUUID,
  isNistCompliantUUID,
  UUIDSchema,
  NISTCompliantUUIDSchema,
  QIFImportRequestSchema,
  QIFExportOptionsSchema,
  type UUIDValidationResult,
} from '../utils/qif-uuid-validation';

// =======================
// Extended Request Types
// =======================

declare global {
  namespace Express {
    interface Request {
      validatedUUIDs?: Record<string, {
        value: string;
        type: 'uuid' | 'legacy';
        validation?: UUIDValidationResult;
        normalized: string;
      }>;
      qifValidation?: {
        nistCompliant: boolean;
        hasWarnings: boolean;
        warnings: string[];
        errors: string[];
      };
    }
  }
}

// =======================
// Validation Middleware Factory
// =======================

export interface UUIDValidationOptions {
  paramNames?: string[];
  bodyFields?: string[];
  queryFields?: string[];
  enforceNistCompliance?: boolean;
  allowLegacyIds?: boolean;
  requireAtLeastOne?: boolean;
  strictMode?: boolean;
}

/**
 * Create UUID validation middleware with flexible options
 */
export function createQIFUUIDValidationMiddleware(
  options: UUIDValidationOptions = {}
) {
  const {
    paramNames = [],
    bodyFields = [],
    queryFields = [],
    enforceNistCompliance = false,
    allowLegacyIds = true,
    requireAtLeastOne = false,
    strictMode = false,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    req.validatedUUIDs = {};
    req.qifValidation = {
      nistCompliant: true,
      hasWarnings: false,
      warnings: [],
      errors: [],
    };

    let validUUIDCount = 0;
    let totalFieldsChecked = 0;

    // Validate URL parameters
    for (const paramName of paramNames) {
      const value = req.params[paramName];
      if (value) {
        totalFieldsChecked++;
        const result = validateFieldUUID(value, `param:${paramName}`, {
          enforceNistCompliance,
          allowLegacyIds,
          strictMode,
        });

        if (result.isValid) {
          validUUIDCount++;
          req.validatedUUIDs[paramName] = result;
        } else {
          req.qifValidation.errors.push(...result.errors);
        }

        req.qifValidation.warnings.push(...result.warnings);
        if (!result.nistCompliant) {
          req.qifValidation.nistCompliant = false;
        }
      }
    }

    // Validate request body fields
    for (const fieldName of bodyFields) {
      const value = req.body?.[fieldName];
      if (value) {
        totalFieldsChecked++;
        const result = validateFieldUUID(value, `body:${fieldName}`, {
          enforceNistCompliance,
          allowLegacyIds,
          strictMode,
        });

        if (result.isValid) {
          validUUIDCount++;
          req.validatedUUIDs[fieldName] = result;
        } else {
          req.qifValidation.errors.push(...result.errors);
        }

        req.qifValidation.warnings.push(...result.warnings);
        if (!result.nistCompliant) {
          req.qifValidation.nistCompliant = false;
        }
      }
    }

    // Validate query parameters
    for (const fieldName of queryFields) {
      const value = req.query[fieldName] as string;
      if (value) {
        totalFieldsChecked++;
        const result = validateFieldUUID(value, `query:${fieldName}`, {
          enforceNistCompliance,
          allowLegacyIds,
          strictMode,
        });

        if (result.isValid) {
          validUUIDCount++;
          req.validatedUUIDs[fieldName] = result;
        } else {
          req.qifValidation.errors.push(...result.errors);
        }

        req.qifValidation.warnings.push(...result.warnings);
        if (!result.nistCompliant) {
          req.qifValidation.nistCompliant = false;
        }
      }
    }

    // Check requirements
    if (requireAtLeastOne && validUUIDCount === 0 && totalFieldsChecked > 0) {
      req.qifValidation.errors.push('At least one valid UUID is required');
    }

    // Handle validation results
    req.qifValidation.hasWarnings = req.qifValidation.warnings.length > 0;

    // Set response headers for UUID validation status
    res.setHeader('X-UUID-Validation-Status', req.qifValidation.errors.length === 0 ? 'valid' : 'invalid');
    res.setHeader('X-NIST-Compliance', req.qifValidation.nistCompliant ? 'compliant' : 'non-compliant');

    if (req.qifValidation.hasWarnings) {
      res.setHeader('X-UUID-Warnings', req.qifValidation.warnings.length.toString());
    }

    // Fail fast if strict mode and errors exist
    if (strictMode && req.qifValidation.errors.length > 0) {
      return res.status(400).json({
        error: 'UUID validation failed',
        details: req.qifValidation.errors,
        nistCompliance: 'AMS-300-12',
        supportedFormats: ['UUID v4 (recommended)', 'Legacy string ID (if enabled)'],
      });
    }

    // Continue if not strict or no errors
    next();
  };
}

// =======================
// Specific Middleware Implementations
// =======================

/**
 * Validate QIF Plan ID parameter (supports UUID and legacy)
 */
export const validateQIFPlanIdParam = createQIFUUIDValidationMiddleware({
  paramNames: ['qifPlanId', 'planId'],
  allowLegacyIds: true,
  requireAtLeastOne: true,
});

/**
 * Validate QIF Results ID parameter (supports UUID and legacy)
 */
export const validateQIFResultsIdParam = createQIFUUIDValidationMiddleware({
  paramNames: ['qifResultsId', 'resultsId'],
  allowLegacyIds: true,
  requireAtLeastOne: true,
});

/**
 * Validate QIF Characteristic ID parameter (supports UUID and legacy)
 */
export const validateQIFCharacteristicIdParam = createQIFUUIDValidationMiddleware({
  paramNames: ['characteristicId', 'charId'],
  allowLegacyIds: true,
  requireAtLeastOne: true,
});

/**
 * Strict NIST compliance validation for UUID-only operations
 */
export const validateNISTCompliantUUIDs = createQIFUUIDValidationMiddleware({
  paramNames: ['id', 'uuid'],
  bodyFields: ['uuid', 'planUuid', 'resultsUuid', 'characteristicUuid'],
  enforceNistCompliance: true,
  allowLegacyIds: false,
  strictMode: true,
});

/**
 * Validate QIF import request body
 */
export function validateQIFImportRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedData = QIFImportRequestSchema.parse(req.body);
    req.body = validatedData;

    // Additional UUID validation for optional fields
    const uuidFields = ['planUuid', 'resultsUuid'];
    req.qifValidation = {
      nistCompliant: true,
      hasWarnings: false,
      warnings: [],
      errors: [],
    };

    for (const field of uuidFields) {
      const value = validatedData[field as keyof typeof validatedData];
      if (value && typeof value === 'string') {
        const validation = validateQIFUUID(value);
        if (!validation.isValid) {
          req.qifValidation.errors.push(`Invalid ${field}: ${validation.errors.join(', ')}`);
        } else if (!validation.isNistCompliant) {
          req.qifValidation.warnings.push(`Non-NIST-compliant ${field}: ${validation.warnings.join(', ')}`);
          req.qifValidation.nistCompliant = false;
        }
      }
    }

    req.qifValidation.hasWarnings = req.qifValidation.warnings.length > 0;

    if (req.qifValidation.errors.length > 0) {
      return res.status(400).json({
        error: 'QIF import request validation failed',
        details: req.qifValidation.errors,
        warnings: req.qifValidation.warnings,
      });
    }

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'QIF import request validation failed',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      });
    }
    next(error);
  }
}

/**
 * Validate QIF export options
 */
export function validateQIFExportOptions(req: Request, res: Response, next: NextFunction) {
  try {
    const validatedQuery = QIFExportOptionsSchema.parse(req.query);
    req.query = validatedQuery as any;

    // Set response headers based on options
    res.setHeader('X-QIF-Format', validatedQuery.format);
    res.setHeader('X-UUID-Support', validatedQuery.includeUuids.toString());
    res.setHeader('X-NIST-Compliance', validatedQuery.nistCompliance ? 'AMS-300-12' : 'false');

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'QIF export options validation failed',
        details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
        supportedFormats: ['xml', 'json'],
        defaultOptions: {
          format: 'xml',
          includeUuids: true,
          nistCompliance: true,
          validateUuids: true,
        },
      });
    }
    next(error);
  }
}

// =======================
// Helper Functions
// =======================

interface FieldValidationOptions {
  enforceNistCompliance: boolean;
  allowLegacyIds: boolean;
  strictMode: boolean;
}

function validateFieldUUID(
  value: string,
  fieldName: string,
  options: FieldValidationOptions
) {
  const result = {
    value,
    type: 'legacy' as 'uuid' | 'legacy',
    isValid: false,
    nistCompliant: false,
    normalized: value,
    warnings: [] as string[],
    errors: [] as string[],
  };

  if (!value || typeof value !== 'string') {
    result.errors.push(`${fieldName} must be a non-empty string`);
    return result;
  }

  const trimmed = value.trim();

  // Check if it's a UUID
  if (isValidUUID(trimmed)) {
    result.type = 'uuid';
    result.isValid = true;
    result.normalized = trimmed.toLowerCase();

    const validation = validateQIFUUID(trimmed);
    result.nistCompliant = validation.isNistCompliant;
    result.warnings = validation.warnings;

    if (options.enforceNistCompliance && !validation.isNistCompliant) {
      result.errors.push(`${fieldName} must be NIST AMS 300-12 compliant (UUID v4)`);
      result.isValid = false;
    }
  } else {
    // Handle as legacy ID
    if (!options.allowLegacyIds) {
      result.errors.push(`${fieldName} must be a valid UUID (legacy IDs not allowed)`);
      return result;
    }

    if (trimmed.length === 0) {
      result.errors.push(`${fieldName} cannot be empty`);
      return result;
    }

    if (trimmed.length > 100) {
      result.errors.push(`${fieldName} too long (max 100 characters for legacy IDs)`);
      return result;
    }

    result.isValid = true;
    result.normalized = trimmed;
    result.warnings.push(`${fieldName} uses legacy format - consider migrating to UUID`);
  }

  return result;
}

/**
 * Express error handler for UUID validation errors
 */
export function handleUUIDValidationError(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (error.type === 'UUID_VALIDATION_ERROR') {
    return res.status(400).json({
      error: 'UUID validation failed',
      details: error.details || [error.message],
      field: error.field,
      providedValue: error.value,
      nistCompliance: 'AMS-300-12',
      helpUrl: 'https://nvlpubs.nist.gov/nistpubs/ams/NIST.AMS.300-12.pdf',
    });
  }

  next(error);
}

/**
 * Utility to create UUID validation error
 */
export function createUUIDValidationError(
  message: string,
  field: string,
  value: string,
  details: string[] = []
) {
  const error = new Error(message);
  (error as any).type = 'UUID_VALIDATION_ERROR';
  (error as any).field = field;
  (error as any).value = value;
  (error as any).details = details;
  return error;
}

/**
 * Export all middleware and utilities
 */
export default {
  createQIFUUIDValidationMiddleware,
  validateQIFPlanIdParam,
  validateQIFResultsIdParam,
  validateQIFCharacteristicIdParam,
  validateNISTCompliantUUIDs,
  validateQIFImportRequest,
  validateQIFExportOptions,
  handleUUIDValidationError,
  createUUIDValidationError,
};