/**
 * QIF UUID Validation Utilities Test Suite
 * Comprehensive tests for NIST AMS 300-12 UUID validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  isValidUUID,
  isNistCompliantUUID,
  normalizeUUID,
  validateQIFUUID,
  validateAndNormalizeQIFId,
  validateMultipleUUIDs,
  createUUIDValidationMiddleware,
  UUIDSchema,
  NISTCompliantUUIDSchema,
  FlexibleQIFIdSchema,
  QIFPlanIdSchema,
  QIFResultsIdSchema,
  QIFCharacteristicIdSchema,
  QIFImportRequestSchema,
  QIFExportOptionsSchema,
} from '../../utils/qif-uuid-validation';
import { v4 as uuidv4, v1 as uuidv1, v3 as uuidv3, v5 as uuidv5 } from 'uuid';

describe('QIF UUID Validation Utilities', () => {
  // Test data
  const validUUIDv4 = uuidv4();
  const validUUIDv1 = uuidv1();
  const validUUIDv3 = uuidv3('test', uuidv3.DNS);
  const validUUIDv5 = uuidv5('test', uuidv5.DNS);
  const invalidUUID = 'invalid-uuid';
  const legacyId = 'PLAN-001';
  const emptyString = '';
  const longString = 'a'.repeat(101);

  describe('isValidUUID', () => {
    it('should validate correct UUID v4', () => {
      expect(isValidUUID(validUUIDv4)).toBe(true);
    });

    it('should validate other UUID versions', () => {
      expect(isValidUUID(validUUIDv1)).toBe(true);
      expect(isValidUUID(validUUIDv3)).toBe(true);
      expect(isValidUUID(validUUIDv5)).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID(invalidUUID)).toBe(false);
      expect(isValidUUID(legacyId)).toBe(false);
      expect(isValidUUID(emptyString)).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
      expect(isValidUUID(123 as any)).toBe(false);
      expect(isValidUUID(' ' + validUUIDv4 + ' ')).toBe(true); // Trimmed
    });
  });

  describe('isNistCompliantUUID', () => {
    it('should accept UUID v4 (NIST compliant)', () => {
      expect(isNistCompliantUUID(validUUIDv4)).toBe(true);
    });

    it('should reject non-v4 UUIDs', () => {
      expect(isNistCompliantUUID(validUUIDv1)).toBe(false);
      expect(isNistCompliantUUID(validUUIDv3)).toBe(false);
      expect(isNistCompliantUUID(validUUIDv5)).toBe(false);
    });

    it('should reject invalid UUIDs', () => {
      expect(isNistCompliantUUID(invalidUUID)).toBe(false);
      expect(isNistCompliantUUID(legacyId)).toBe(false);
    });
  });

  describe('normalizeUUID', () => {
    it('should normalize valid UUIDs to lowercase', () => {
      const upperCaseUUID = validUUIDv4.toUpperCase();
      expect(normalizeUUID(upperCaseUUID)).toBe(validUUIDv4.toLowerCase());
    });

    it('should trim whitespace', () => {
      const paddedUUID = '  ' + validUUIDv4 + '  ';
      expect(normalizeUUID(paddedUUID)).toBe(validUUIDv4.toLowerCase());
    });

    it('should throw on invalid UUID', () => {
      expect(() => normalizeUUID(invalidUUID)).toThrow('Invalid UUID format');
    });
  });

  describe('validateQIFUUID', () => {
    it('should provide comprehensive validation for valid UUID v4', () => {
      const result = validateQIFUUID(validUUIDv4);
      expect(result.isValid).toBe(true);
      expect(result.isNistCompliant).toBe(true);
      expect(result.version).toBe(4);
      expect(result.normalized).toBe(validUUIDv4.toLowerCase());
      expect(result.errors).toHaveLength(0);
    });

    it('should warn about non-v4 UUIDs', () => {
      const result = validateQIFUUID(validUUIDv1);
      expect(result.isValid).toBe(true);
      expect(result.isNistCompliant).toBe(false);
      expect(result.version).toBe(1);
      expect(result.warnings).toContain('UUID version 1 detected - NIST AMS 300-12 recommends UUID v4');
    });

    it('should handle invalid UUIDs', () => {
      const result = validateQIFUUID(invalidUUID);
      expect(result.isValid).toBe(false);
      expect(result.isNistCompliant).toBe(false);
      expect(result.errors).toContain('Invalid UUID format');
    });

    it('should handle empty values', () => {
      const result = validateQIFUUID('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('UUID cannot be empty');
    });

    it('should warn about formatting issues', () => {
      const upperCaseUUID = validUUIDv4.toUpperCase();
      const result = validateQIFUUID(upperCaseUUID);
      expect(result.warnings).toContain('UUID contains uppercase characters - consider using lowercase for consistency');
    });
  });

  describe('validateAndNormalizeQIFId', () => {
    it('should prefer UUID when both are provided', () => {
      const result = validateAndNormalizeQIFId(validUUIDv4, legacyId, { preferUuid: true });
      expect(result.type).toBe('uuid');
      expect(result.normalized).toBe(validUUIDv4.toLowerCase());
    });

    it('should fall back to legacy when UUID is invalid', () => {
      const result = validateAndNormalizeQIFId(undefined, legacyId, { allowLegacy: true });
      expect(result.type).toBe('legacy');
      expect(result.normalized).toBe(legacyId);
    });

    it('should enforce UUID requirement', () => {
      expect(() => {
        validateAndNormalizeQIFId(undefined, legacyId, { requireUuid: true });
      }).toThrow('UUID is required');
    });

    it('should reject legacy when not allowed', () => {
      expect(() => {
        validateAndNormalizeQIFId(undefined, legacyId, { allowLegacy: false });
      }).toThrow('Legacy IDs not allowed');
    });

    it('should validate legacy ID constraints', () => {
      expect(() => {
        validateAndNormalizeQIFId(undefined, longString, { allowLegacy: true });
      }).toThrow('Legacy ID too long');
    });
  });

  describe('validateMultipleUUIDs', () => {
    it('should validate array of UUIDs', () => {
      const uuids = [validUUIDv4, validUUIDv1, invalidUUID];
      const result = validateMultipleUUIDs(uuids);

      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(1);
      expect(result.warnings).toHaveLength(1); // v1 warning
      expect(result.invalid[0].uuid).toBe(invalidUUID);
    });

    it('should handle empty array', () => {
      const result = validateMultipleUUIDs([]);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('createUUIDValidationMiddleware', () => {
    let req: any, res: any, next: any;

    beforeEach(() => {
      req = {
        params: {},
        body: {},
        query: {},
        validatedUUIDs: {},
        qifValidation: {}
      };
      res = {
        setHeader: vitest.fn(),
        status: vitest.fn().mockReturnThis(),
        json: vitest.fn()
      };
      next = vitest.fn();
    });

    it('should validate param UUIDs', () => {
      const middleware = createUUIDValidationMiddleware({
        paramNames: ['planId'],
        allowLegacyIds: true
      });

      req.params.planId = validUUIDv4;
      middleware(req, res, next);

      expect(req.validatedUUIDs.planId).toBeDefined();
      expect(req.validatedUUIDs.planId.type).toBe('uuid');
      expect(next).toHaveBeenCalled();
    });

    it('should handle validation errors in strict mode', () => {
      const middleware = createUUIDValidationMiddleware({
        paramNames: ['planId'],
        strictMode: true,
        allowLegacyIds: false
      });

      req.params.planId = legacyId;
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'UUID validation failed'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Zod Schemas', () => {
    describe('UUIDSchema', () => {
      it('should validate correct UUIDs', () => {
        expect(() => UUIDSchema.parse(validUUIDv4)).not.toThrow();
      });

      it('should reject invalid UUIDs', () => {
        expect(() => UUIDSchema.parse(invalidUUID)).toThrow();
      });
    });

    describe('NISTCompliantUUIDSchema', () => {
      it('should validate UUID v4', () => {
        expect(() => NISTCompliantUUIDSchema.parse(validUUIDv4)).not.toThrow();
      });

      it('should reject non-v4 UUIDs', () => {
        expect(() => NISTCompliantUUIDSchema.parse(validUUIDv1)).toThrow();
      });
    });

    describe('FlexibleQIFIdSchema', () => {
      it('should accept valid UUIDs', () => {
        expect(() => FlexibleQIFIdSchema.parse(validUUIDv4)).not.toThrow();
      });

      it('should accept legacy IDs', () => {
        expect(() => FlexibleQIFIdSchema.parse(legacyId)).not.toThrow();
      });

      it('should reject empty strings', () => {
        expect(() => FlexibleQIFIdSchema.parse('')).toThrow();
      });
    });

    describe('QIFPlanIdSchema', () => {
      it('should require at least one identifier', () => {
        expect(() => QIFPlanIdSchema.parse({})).toThrow();
      });

      it('should accept UUID only', () => {
        const data = { qifPlanUuid: validUUIDv4 };
        expect(() => QIFPlanIdSchema.parse(data)).not.toThrow();
      });

      it('should accept legacy ID only', () => {
        const data = { qifPlanId: legacyId };
        expect(() => QIFPlanIdSchema.parse(data)).not.toThrow();
      });

      it('should accept both identifiers', () => {
        const data = { qifPlanUuid: validUUIDv4, qifPlanId: legacyId };
        expect(() => QIFPlanIdSchema.parse(data)).not.toThrow();
      });
    });

    describe('QIFImportRequestSchema', () => {
      it('should validate complete import request', () => {
        const data = {
          qifXml: '<QIFDocument>...</QIFDocument>',
          validateUuids: true,
          requireNistCompliance: false,
          planUuid: validUUIDv4,
          resultsUuid: validUUIDv4
        };
        expect(() => QIFImportRequestSchema.parse(data)).not.toThrow();
      });

      it('should require qifXml', () => {
        expect(() => QIFImportRequestSchema.parse({})).toThrow();
      });

      it('should set defaults', () => {
        const data = { qifXml: '<QIFDocument>...</QIFDocument>' };
        const result = QIFImportRequestSchema.parse(data);
        expect(result.validateUuids).toBe(true);
        expect(result.requireNistCompliance).toBe(false);
      });
    });

    describe('QIFExportOptionsSchema', () => {
      it('should set proper defaults', () => {
        const result = QIFExportOptionsSchema.parse({});
        expect(result.format).toBe('xml');
        expect(result.includeUuids).toBe(true);
        expect(result.nistCompliance).toBe(true);
        expect(result.validateUuids).toBe(true);
      });

      it('should validate format enum', () => {
        expect(() => QIFExportOptionsSchema.parse({ format: 'invalid' })).toThrow();
        expect(() => QIFExportOptionsSchema.parse({ format: 'xml' })).not.toThrow();
        expect(() => QIFExportOptionsSchema.parse({ format: 'json' })).not.toThrow();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      expect(isValidUUID(null as any)).toBe(false);
      expect(isValidUUID(undefined as any)).toBe(false);
      expect(validateQIFUUID(null as any).isValid).toBe(false);
      expect(validateQIFUUID(undefined as any).isValid).toBe(false);
    });

    it('should handle very long strings', () => {
      const veryLongString = 'a'.repeat(1000);
      expect(isValidUUID(veryLongString)).toBe(false);
      expect(validateQIFUUID(veryLongString).isValid).toBe(false);
    });

    it('should handle special characters', () => {
      const specialChars = '!@#$%^&*()_+{}|:<>?[]\\;\'",./`~';
      expect(isValidUUID(specialChars)).toBe(false);
      expect(validateQIFUUID(specialChars).isValid).toBe(false);
    });

    it('should handle whitespace-only strings', () => {
      const whitespaceOnly = '   \t\n   ';
      expect(isValidUUID(whitespaceOnly)).toBe(false);
      expect(validateQIFUUID(whitespaceOnly).isValid).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    it('should validate large batches efficiently', () => {
      const largeUUIDArray = Array.from({ length: 1000 }, () => uuidv4());
      const start = Date.now();
      const result = validateMultipleUUIDs(largeUUIDArray);
      const duration = Date.now() - start;

      expect(result.valid).toHaveLength(1000);
      expect(result.invalid).toHaveLength(0);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should normalize UUIDs efficiently', () => {
      const uuid = validUUIDv4.toUpperCase();
      const start = Date.now();
      for (let i = 0; i < 10000; i++) {
        normalizeUUID(uuid);
      }
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });
  });
});

// Test constants and utilities
export const testUUIDs = {
  validV4: uuidv4(),
  validV1: uuidv1(),
  validV3: uuidv3('test', uuidv3.DNS),
  validV5: uuidv5('test', uuidv5.DNS),
  invalid: 'invalid-uuid',
  legacy: 'PLAN-001',
  empty: '',
  long: 'a'.repeat(101),
};

export const createMockExpressRequest = (overrides: any = {}) => ({
  params: {},
  body: {},
  query: {},
  validatedUUIDs: {},
  qifValidation: {},
  ...overrides,
});

export const createMockExpressResponse = () => ({
  setHeader: vitest.fn(),
  status: vitest.fn().mockReturnThis(),
  json: vitest.fn(),
  send: vitest.fn(),
});

export default {
  testUUIDs,
  createMockExpressRequest,
  createMockExpressResponse,
};