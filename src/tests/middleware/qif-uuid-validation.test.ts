/**
 * QIF UUID Validation Middleware Test Suite
 * Tests for Express middleware UUID validation functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  createQIFUUIDValidationMiddleware,
  validateQIFPlanIdParam,
  validateQIFResultsIdParam,
  validateQIFCharacteristicIdParam,
  validateNISTCompliantUUIDs,
  validateQIFImportRequest,
  validateQIFExportOptions,
  handleUUIDValidationError,
  createUUIDValidationError,
} from '../../middleware/qif-uuid-validation';
import { v4 as uuidv4, v1 as uuidv1 } from 'uuid';

// Test data
const testData = {
  validUUIDv4: uuidv4(),
  validUUIDv1: uuidv1(),
  invalidUUID: 'invalid-uuid',
  legacyId: 'PLAN-001',
  longLegacyId: 'a'.repeat(101),
  emptyString: '',

  validQIFXml: '<QIFDocument><Version>3.0.0</Version></QIFDocument>',

  validImportRequest: {
    qifXml: '<QIFDocument><Version>3.0.0</Version></QIFDocument>',
    validateUuids: true,
    requireNistCompliance: false,
    planUuid: uuidv4(),
    resultsUuid: uuidv4(),
  },

  validExportOptions: {
    format: 'xml' as const,
    includeUuids: true,
    nistCompliance: true,
    validateUuids: true,
  },
};

describe('QIF UUID Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      query: {},
      validatedUUIDs: {},
      qifValidation: {},
    };

    res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };

    next = vi.fn();
  });

  describe('createQIFUUIDValidationMiddleware', () => {
    describe('parameter validation', () => {
      it('should validate valid UUID parameters', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          allowLegacyIds: true,
        });

        req.params = { planId: testData.validUUIDv4 };
        middleware(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.planId).toBeDefined();
        expect(req.validatedUUIDs?.planId.type).toBe('uuid');
        expect(req.validatedUUIDs?.planId.normalized).toBe(testData.validUUIDv4.toLowerCase());
        expect(req.qifValidation?.errors).toHaveLength(0);
        expect(next).toHaveBeenCalled();
      });

      it('should validate legacy ID parameters when allowed', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          allowLegacyIds: true,
        });

        req.params = { planId: testData.legacyId };
        middleware(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.planId).toBeDefined();
        expect(req.validatedUUIDs?.planId.type).toBe('legacy');
        expect(req.validatedUUIDs?.planId.normalized).toBe(testData.legacyId);
        expect(req.qifValidation?.warnings.length).toBeGreaterThan(0);
        expect(next).toHaveBeenCalled();
      });

      it('should reject invalid UUIDs in strict mode', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          strictMode: true,
          allowLegacyIds: false,
        });

        req.params = { planId: testData.invalidUUID };
        middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'UUID validation failed',
        }));
        expect(next).not.toHaveBeenCalled();
      });

      it('should set proper response headers', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          allowLegacyIds: true,
        });

        req.params = { planId: testData.validUUIDv4 };
        middleware(req as Request, res as Response, next);

        expect(res.setHeader).toHaveBeenCalledWith('X-UUID-Validation-Status', 'valid');
        expect(res.setHeader).toHaveBeenCalledWith('X-NIST-Compliance', 'compliant');
      });

      it('should handle non-NIST-compliant UUIDs', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          enforceNistCompliance: false,
        });

        req.params = { planId: testData.validUUIDv1 };
        middleware(req as Request, res as Response, next);

        expect(req.qifValidation?.nistCompliant).toBe(false);
        expect(req.qifValidation?.warnings.length).toBeGreaterThan(0);
        expect(res.setHeader).toHaveBeenCalledWith('X-NIST-Compliance', 'non-compliant');
        expect(next).toHaveBeenCalled();
      });
    });

    describe('body field validation', () => {
      it('should validate UUID fields in request body', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          bodyFields: ['planUuid', 'resultsUuid'],
          allowLegacyIds: true,
        });

        req.body = {
          planUuid: testData.validUUIDv4,
          resultsUuid: testData.validUUIDv4,
        };

        middleware(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.planUuid).toBeDefined();
        expect(req.validatedUUIDs?.resultsUuid).toBeDefined();
        expect(req.qifValidation?.errors).toHaveLength(0);
        expect(next).toHaveBeenCalled();
      });

      it('should handle missing optional body fields', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          bodyFields: ['planUuid'],
          requireAtLeastOne: false,
        });

        req.body = {};
        middleware(req as Request, res as Response, next);

        expect(req.qifValidation?.errors).toHaveLength(0);
        expect(next).toHaveBeenCalled();
      });

      it('should enforce requireAtLeastOne option', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          bodyFields: ['planUuid'],
          requireAtLeastOne: true,
        });

        req.body = { planUuid: testData.invalidUUID };
        middleware(req as Request, res as Response, next);

        expect(req.qifValidation?.errors.length).toBeGreaterThan(0);
      });
    });

    describe('query parameter validation', () => {
      it('should validate UUID query parameters', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          queryFields: ['planId'],
          allowLegacyIds: true,
        });

        req.query = { planId: testData.validUUIDv4 };
        middleware(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.planId).toBeDefined();
        expect(req.validatedUUIDs?.planId.type).toBe('uuid');
        expect(next).toHaveBeenCalled();
      });

      it('should handle empty query parameters', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          queryFields: ['planId'],
        });

        req.query = {};
        middleware(req as Request, res as Response, next);

        expect(req.qifValidation?.errors).toHaveLength(0);
        expect(next).toHaveBeenCalled();
      });
    });

    describe('configuration options', () => {
      it('should enforce NIST compliance when configured', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          enforceNistCompliance: true,
          strictMode: true,
        });

        req.params = { planId: testData.validUUIDv1 };
        middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject legacy IDs when not allowed', () => {
        const middleware = createQIFUUIDValidationMiddleware({
          paramNames: ['planId'],
          allowLegacyIds: false,
          strictMode: true,
        });

        req.params = { planId: testData.legacyId };
        middleware(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('Pre-built middleware functions', () => {
    describe('validateQIFPlanIdParam', () => {
      it('should validate QIF plan ID parameters', () => {
        req.params = { qifPlanId: testData.validUUIDv4 };
        validateQIFPlanIdParam(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.qifPlanId).toBeDefined();
        expect(next).toHaveBeenCalled();
      });

      it('should handle legacy plan IDs', () => {
        req.params = { planId: testData.legacyId };
        validateQIFPlanIdParam(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.planId).toBeDefined();
        expect(req.validatedUUIDs?.planId.type).toBe('legacy');
        expect(next).toHaveBeenCalled();
      });
    });

    describe('validateQIFResultsIdParam', () => {
      it('should validate QIF results ID parameters', () => {
        req.params = { qifResultsId: testData.validUUIDv4 };
        validateQIFResultsIdParam(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.qifResultsId).toBeDefined();
        expect(next).toHaveBeenCalled();
      });
    });

    describe('validateQIFCharacteristicIdParam', () => {
      it('should validate QIF characteristic ID parameters', () => {
        req.params = { characteristicId: testData.validUUIDv4 };
        validateQIFCharacteristicIdParam(req as Request, res as Response, next);

        expect(req.validatedUUIDs?.characteristicId).toBeDefined();
        expect(next).toHaveBeenCalled();
      });
    });

    describe('validateNISTCompliantUUIDs', () => {
      it('should accept NIST-compliant UUIDs', () => {
        req.params = { uuid: testData.validUUIDv4 };
        validateNISTCompliantUUIDs(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
      });

      it('should reject non-NIST-compliant UUIDs', () => {
        req.params = { uuid: testData.validUUIDv1 };
        validateNISTCompliantUUIDs(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });

      it('should reject legacy IDs', () => {
        req.params = { uuid: testData.legacyId };
        validateNISTCompliantUUIDs(req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(next).not.toHaveBeenCalled();
      });
    });
  });

  describe('validateQIFImportRequest', () => {
    it('should validate complete import request', () => {
      req.body = testData.validImportRequest;
      validateQIFImportRequest(req as Request, res as Response, next);

      expect(req.body.validateUuids).toBe(true);
      expect(req.qifValidation?.errors).toHaveLength(0);
      expect(next).toHaveBeenCalled();
    });

    it('should require QIF XML content', () => {
      req.body = {};
      validateQIFImportRequest(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'QIF import request validation failed',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate UUID fields in import request', () => {
      req.body = {
        ...testData.validImportRequest,
        planUuid: testData.invalidUUID,
      };

      validateQIFImportRequest(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'QIF import request validation failed',
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should warn about non-NIST-compliant UUIDs', () => {
      req.body = {
        ...testData.validImportRequest,
        planUuid: testData.validUUIDv1,
      };

      validateQIFImportRequest(req as Request, res as Response, next);

      expect(req.qifValidation?.warnings.length).toBeGreaterThan(0);
      expect(req.qifValidation?.nistCompliant).toBe(false);
      expect(next).toHaveBeenCalled();
    });

    it('should set default values', () => {
      req.body = { qifXml: testData.validQIFXml };
      validateQIFImportRequest(req as Request, res as Response, next);

      expect(req.body.validateUuids).toBe(true);
      expect(req.body.requireNistCompliance).toBe(false);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateQIFExportOptions', () => {
    it('should validate export options', () => {
      req.query = testData.validExportOptions;
      validateQIFExportOptions(req as Request, res as Response, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-QIF-Format', 'xml');
      expect(res.setHeader).toHaveBeenCalledWith('X-UUID-Support', 'true');
      expect(res.setHeader).toHaveBeenCalledWith('X-NIST-Compliance', 'AMS-300-12');
      expect(next).toHaveBeenCalled();
    });

    it('should set default values', () => {
      req.query = {};
      validateQIFExportOptions(req as Request, res as Response, next);

      expect(req.query.format).toBe('xml');
      expect(req.query.includeUuids).toBe(true);
      expect(req.query.nistCompliance).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should validate format enum', () => {
      req.query = { format: 'invalid' };
      validateQIFExportOptions(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'QIF export options validation failed',
        supportedFormats: ['xml', 'json'],
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    describe('handleUUIDValidationError', () => {
      it('should handle UUID validation errors', () => {
        const error = createUUIDValidationError(
          'Invalid UUID',
          'planId',
          testData.invalidUUID,
          ['UUID must be valid RFC 4122 format']
        );

        handleUUIDValidationError(error, req as Request, res as Response, next);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          error: 'UUID validation failed',
          field: 'planId',
          providedValue: testData.invalidUUID,
          nistCompliance: 'AMS-300-12',
        }));
      });

      it('should pass through non-UUID errors', () => {
        const normalError = new Error('Some other error');
        handleUUIDValidationError(normalError, req as Request, res as Response, next);

        expect(next).toHaveBeenCalledWith(normalError);
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    describe('createUUIDValidationError', () => {
      it('should create properly formatted UUID validation error', () => {
        const error = createUUIDValidationError(
          'Test error',
          'testField',
          'testValue',
          ['detail1', 'detail2']
        );

        expect(error.message).toBe('Test error');
        expect((error as any).type).toBe('UUID_VALIDATION_ERROR');
        expect((error as any).field).toBe('testField');
        expect((error as any).value).toBe('testValue');
        expect((error as any).details).toEqual(['detail1', 'detail2']);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined parameters gracefully', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        paramNames: ['nonexistent'],
      });

      req.params = {};
      middleware(req as Request, res as Response, next);

      expect(req.qifValidation?.errors).toHaveLength(0);
      expect(next).toHaveBeenCalled();
    });

    it('should handle malformed request objects', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        bodyFields: ['planUuid'],
      });

      req.body = null;
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle extremely long UUIDs', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        paramNames: ['planId'],
        allowLegacyIds: true,
        strictMode: true,
      });

      req.params = { planId: testData.longLegacyId };
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle empty string parameters', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        paramNames: ['planId'],
        allowLegacyIds: true,
        strictMode: true,
      });

      req.params = { planId: testData.emptyString };
      middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Performance tests', () => {
    it('should handle multiple UUID validations efficiently', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        paramNames: ['id1', 'id2', 'id3', 'id4', 'id5'],
        bodyFields: ['uuid1', 'uuid2', 'uuid3', 'uuid4', 'uuid5'],
        queryFields: ['query1', 'query2', 'query3', 'query4', 'query5'],
      });

      req.params = {
        id1: uuidv4(),
        id2: uuidv4(),
        id3: uuidv4(),
        id4: uuidv4(),
        id5: uuidv4(),
      };

      req.body = {
        uuid1: uuidv4(),
        uuid2: uuidv4(),
        uuid3: uuidv4(),
        uuid4: uuidv4(),
        uuid5: uuidv4(),
      };

      req.query = {
        query1: uuidv4(),
        query2: uuidv4(),
        query3: uuidv4(),
        query4: uuidv4(),
        query5: uuidv4(),
      };

      const start = Date.now();
      middleware(req as Request, res as Response, next);
      const duration = Date.now() - start;

      expect(Object.keys(req.validatedUUIDs || {})).toHaveLength(15);
      expect(duration).toBeLessThan(100); // Should be very fast
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Integration with Express framework', () => {
    it('should maintain Express middleware contract', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        paramNames: ['planId'],
      });

      expect(middleware).toBeInstanceOf(Function);
      expect(middleware.length).toBe(3); // req, res, next

      req.params = { planId: testData.validUUIDv4 };
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // No error passed
    });

    it('should work with Express error handling', () => {
      const middleware = createQIFUUIDValidationMiddleware({
        paramNames: ['planId'],
        strictMode: true,
        allowLegacyIds: false,
      });

      req.params = { planId: testData.invalidUUID };

      expect(() => {
        middleware(req as Request, res as Response, next);
      }).not.toThrow(); // Should not throw, should call res.status instead

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});

// Export test utilities
export const createMockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  params: {},
  body: {},
  query: {},
  validatedUUIDs: {},
  qifValidation: {},
  ...overrides,
});

export const createMockResponse = (): Partial<Response> => ({
  setHeader: vi.fn(),
  status: vi.fn().mockReturnThis(),
  json: vi.fn(),
  send: vi.fn(),
});

export const createMockNext = (): NextFunction => vi.fn();

export default {
  testData,
  createMockRequest,
  createMockResponse,
  createMockNext,
};