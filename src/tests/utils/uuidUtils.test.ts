/**
 * UUID Utilities Test Suite
 * Tests for MBE persistent UUID functionality
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generatePersistentUUID,
  isValidPersistentUUID,
  normalizePersistentUUID,
  PersistentUUIDSchema,
  OptionalPersistentUUIDSchema,
  validatePartUUID,
  validateSerializedPartUUID,
  validateMaterialLotUUID,
  validateWorkOrderUUID,
  validateBOMItemUUID,
  validateOperationUUID,
  validateRoutingUUID,
  validatePartGenealogyUUID,
  createUUIDLookupQuery,
  createUUIDUniqueConstraint,
  formatForSTEP,
  formatForQIF,
  formatForITAR,
  supportsUUID,
  validateEntityUUID,
  PersistentUUIDError,
  UUIDNotFoundError,
  DuplicateUUIDError,
  MBE_UUID_CONSTANTS,
  UUID_SUPPORTED_ENTITIES
} from '../../utils/uuidUtils';

describe('UUID Utilities', () => {
  let validUUID: string;
  let invalidUUID: string;

  beforeEach(() => {
    validUUID = generatePersistentUUID();
    invalidUUID = 'invalid-uuid-format';
  });

  describe('generatePersistentUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generatePersistentUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = generatePersistentUUID();
      const uuid2 = generatePersistentUUID();
      expect(uuid1).not.toBe(uuid2);
    });

    it('should generate UUIDs that pass validation', () => {
      const uuid = generatePersistentUUID();
      expect(isValidPersistentUUID(uuid)).toBe(true);
    });
  });

  describe('isValidPersistentUUID', () => {
    it('should validate correct UUID v4 format', () => {
      expect(isValidPersistentUUID(validUUID)).toBe(true);
    });

    it('should reject invalid UUID formats', () => {
      expect(isValidPersistentUUID(invalidUUID)).toBe(false);
      expect(isValidPersistentUUID('')).toBe(false);
      expect(isValidPersistentUUID('123')).toBe(false);
      expect(isValidPersistentUUID('not-a-uuid')).toBe(false);
    });

    it('should reject non-string inputs', () => {
      expect(isValidPersistentUUID(null)).toBe(false);
      expect(isValidPersistentUUID(undefined)).toBe(false);
      expect(isValidPersistentUUID(123)).toBe(false);
      expect(isValidPersistentUUID({})).toBe(false);
      expect(isValidPersistentUUID([])).toBe(false);
    });

    it('should reject UUID v1 format', () => {
      const uuidv1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      expect(isValidPersistentUUID(uuidv1)).toBe(false);
    });

    it('should accept UUID v4 with different case', () => {
      const upperUUID = validUUID.toUpperCase();
      expect(isValidPersistentUUID(upperUUID)).toBe(true);
    });
  });

  describe('normalizePersistentUUID', () => {
    it('should normalize UUID to lowercase', () => {
      const upperUUID = validUUID.toUpperCase();
      const normalized = normalizePersistentUUID(upperUUID);
      expect(normalized).toBe(validUUID.toLowerCase());
    });

    it('should trim whitespace', () => {
      const uuidWithSpaces = `  ${validUUID}  `;
      const normalized = normalizePersistentUUID(uuidWithSpaces);
      expect(normalized).toBe(validUUID.toLowerCase());
    });

    it('should throw error for invalid UUID', () => {
      expect(() => normalizePersistentUUID(invalidUUID)).toThrow('Invalid persistent UUID format');
    });
  });

  describe('Zod Schemas', () => {
    describe('PersistentUUIDSchema', () => {
      it('should validate and transform valid UUID', () => {
        const upperUUID = validUUID.toUpperCase();
        const result = PersistentUUIDSchema.parse(upperUUID);
        expect(result).toBe(validUUID.toLowerCase());
      });

      it('should reject invalid UUID', () => {
        expect(() => PersistentUUIDSchema.parse(invalidUUID)).toThrow();
      });
    });

    describe('OptionalPersistentUUIDSchema', () => {
      it('should accept valid UUID', () => {
        const result = OptionalPersistentUUIDSchema.parse(validUUID);
        expect(result).toBe(validUUID.toLowerCase());
      });

      it('should accept undefined', () => {
        const result = OptionalPersistentUUIDSchema.parse(undefined);
        expect(result).toBeUndefined();
      });

      it('should reject invalid UUID', () => {
        expect(() => OptionalPersistentUUIDSchema.parse(invalidUUID)).toThrow();
      });
    });
  });

  describe('Entity-specific validators', () => {
    const validators = [
      { name: 'Part', fn: validatePartUUID },
      { name: 'SerializedPart', fn: validateSerializedPartUUID },
      { name: 'MaterialLot', fn: validateMaterialLotUUID },
      { name: 'WorkOrder', fn: validateWorkOrderUUID },
      { name: 'BOMItem', fn: validateBOMItemUUID },
      { name: 'Operation', fn: validateOperationUUID },
      { name: 'Routing', fn: validateRoutingUUID },
      { name: 'PartGenealogy', fn: validatePartGenealogyUUID }
    ];

    validators.forEach(({ name, fn }) => {
      describe(`validate${name}UUID`, () => {
        it('should validate correct UUID', () => {
          expect(fn(validUUID)).toBe(true);
        });

        it('should reject invalid UUID', () => {
          expect(fn(invalidUUID)).toBe(false);
        });
      });
    });
  });

  describe('UUID Lookup Utilities', () => {
    describe('createUUIDLookupQuery', () => {
      it('should create correct Prisma query', () => {
        const query = createUUIDLookupQuery(validUUID);
        expect(query).toEqual({
          where: {
            persistentUuid: validUUID.toLowerCase()
          }
        });
      });

      it('should normalize UUID in query', () => {
        const upperUUID = validUUID.toUpperCase();
        const query = createUUIDLookupQuery(upperUUID);
        expect(query.where.persistentUuid).toBe(validUUID.toLowerCase());
      });
    });

    describe('createUUIDUniqueConstraint', () => {
      it('should create correct unique constraint', () => {
        const constraint = createUUIDUniqueConstraint(validUUID);
        expect(constraint).toEqual({
          persistentUuid: validUUID.toLowerCase()
        });
      });
    });
  });

  describe('MBE Integration Helpers', () => {
    describe('formatForSTEP', () => {
      it('should format UUID for STEP AP242', () => {
        const formatted = formatForSTEP(validUUID);
        expect(formatted).toBe(`urn:uuid:${validUUID.toLowerCase()}`);
      });
    });

    describe('formatForQIF', () => {
      it('should format UUID for QIF standard', () => {
        const formatted = formatForQIF(validUUID);
        expect(formatted).toBe(`urn:uuid:${validUUID.toLowerCase()}`);
      });
    });

    describe('formatForITAR', () => {
      it('should format UUID for ITAR compliance', () => {
        const formatted = formatForITAR(validUUID);
        expect(formatted).toBe(`ITAR-UUID:${validUUID.toUpperCase()}`);
      });
    });
  });

  describe('Type Guards', () => {
    describe('supportsUUID', () => {
      it('should return true for supported entities', () => {
        UUID_SUPPORTED_ENTITIES.forEach(entity => {
          expect(supportsUUID(entity)).toBe(true);
        });
      });

      it('should return false for unsupported entities', () => {
        expect(supportsUUID('UnsupportedEntity')).toBe(false);
        expect(supportsUUID('RandomString')).toBe(false);
      });
    });

    describe('validateEntityUUID', () => {
      it('should validate UUID for supported entity types', () => {
        expect(validateEntityUUID('Part', validUUID)).toBe(true);
        expect(validateEntityUUID('WorkOrder', validUUID)).toBe(true);
      });

      it('should reject invalid UUIDs for supported entities', () => {
        expect(validateEntityUUID('Part', invalidUUID)).toBe(false);
      });

      it('should throw error for unsupported entity types', () => {
        expect(() => validateEntityUUID('UnsupportedEntity' as any, validUUID))
          .toThrow('Entity type UnsupportedEntity does not support persistent UUIDs');
      });
    });
  });

  describe('Error Classes', () => {
    describe('PersistentUUIDError', () => {
      it('should create error with message and UUID', () => {
        const error = new PersistentUUIDError('Test error', validUUID);
        expect(error.message).toBe('Test error');
        expect(error.uuid).toBe(validUUID);
        expect(error.name).toBe('PersistentUUIDError');
      });
    });

    describe('UUIDNotFoundError', () => {
      it('should create error with UUID and entity type', () => {
        const error = new UUIDNotFoundError(validUUID, 'Part');
        expect(error.message).toBe(`Part with persistent UUID ${validUUID} not found`);
        expect(error.name).toBe('UUIDNotFoundError');
      });

      it('should work without entity type', () => {
        const error = new UUIDNotFoundError(validUUID);
        expect(error.message).toBe(`Entity with persistent UUID ${validUUID} not found`);
      });
    });

    describe('DuplicateUUIDError', () => {
      it('should create error with UUID and entity type', () => {
        const error = new DuplicateUUIDError(validUUID, 'WorkOrder');
        expect(error.message).toBe(`Duplicate persistent UUID ${validUUID} found for WorkOrder`);
        expect(error.name).toBe('DuplicateUUIDError');
      });
    });
  });

  describe('Constants', () => {
    describe('MBE_UUID_CONSTANTS', () => {
      it('should have correct NIST compliance values', () => {
        expect(MBE_UUID_CONSTANTS.VERSION).toBe(4);
        expect(MBE_UUID_CONSTANTS.STANDARD).toBe('NIST AMS 300-12');
        expect(MBE_UUID_CONSTANTS.PURPOSE).toBe('Model-Based Enterprise Traceability');
        expect(MBE_UUID_CONSTANTS.FORMAT).toBe('UUID v4 (RFC 4122)');
        expect(MBE_UUID_CONSTANTS.NAMESPACE).toBe('urn:uuid');
        expect(MBE_UUID_CONSTANTS.REQUIREMENTS.PERSISTENT).toBe(true);
        expect(MBE_UUID_CONSTANTS.REQUIREMENTS.UNIQUE).toBe(true);
        expect(MBE_UUID_CONSTANTS.REQUIREMENTS.GLOBAL).toBe(true);
        expect(MBE_UUID_CONSTANTS.REQUIREMENTS.IMMUTABLE).toBe(true);
      });
    });

    describe('UUID_SUPPORTED_ENTITIES', () => {
      it('should contain all expected entity types', () => {
        const expectedEntities = [
          'Part',
          'SerializedPart',
          'MaterialLot',
          'WorkOrder',
          'BOMItem',
          'Operation',
          'Routing',
          'PartGenealogy'
        ];

        expectedEntities.forEach(entity => {
          expect(UUID_SUPPORTED_ENTITIES).toContain(entity);
        });

        expect(UUID_SUPPORTED_ENTITIES).toHaveLength(expectedEntities.length);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete UUID workflow', () => {
      // Generate UUID
      const uuid = generatePersistentUUID();

      // Validate
      expect(isValidPersistentUUID(uuid)).toBe(true);

      // Normalize
      const normalized = normalizePersistentUUID(uuid);

      // Create query
      const query = createUUIDLookupQuery(normalized);
      expect(query.where.persistentUuid).toBe(normalized);

      // Format for different standards
      const stepFormat = formatForSTEP(normalized);
      const qifFormat = formatForQIF(normalized);
      const itarFormat = formatForITAR(normalized);

      expect(stepFormat).toMatch(/^urn:uuid:/);
      expect(qifFormat).toMatch(/^urn:uuid:/);
      expect(itarFormat).toMatch(/^ITAR-UUID:/);
    });

    it('should handle edge cases gracefully', () => {
      // Empty string
      expect(isValidPersistentUUID('')).toBe(false);

      // Whitespace only
      expect(isValidPersistentUUID('   ')).toBe(false);

      // Invalid format but close
      expect(isValidPersistentUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(false);

      // Valid UUID with extra characters
      expect(() => normalizePersistentUUID(validUUID + 'extra'))
        .toThrow('Invalid persistent UUID format');
    });
  });
});