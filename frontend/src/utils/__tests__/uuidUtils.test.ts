/**
 * Frontend UUID Utilities Test Suite
 * Tests for MBE persistent UUID functionality in frontend
 */

import {
  isValidUUID,
  isValidCUID,
  validateIdFormat,
  normalizeUUID,
  truncateUUID,
  formatForSTEP,
  formatForQIF,
  formatForITAR,
  getAllStandardFormats,
  supportsUUID,
  validateEntityUUID,
  createEntityUUID,
  copyUUIDToClipboard,
  isUUIDParam,
  getEntityDisplayText,
  createUUIDParam,
  parseUUIDParam,
  createUUIDSearchQuery,
  isLikelyUUIDQuery,
  reconstructUUID,
  UUIDValidationError,
  UUIDNotFoundError,
  FRONTEND_UUID_CONSTANTS,
  DEFAULT_UUID_DISPLAY_OPTIONS
} from '../uuidUtils';

import {
  UUIDSupportedEntity,
  UUID_V4_REGEX,
  CUID_REGEX
} from '../../types/uuid';

// Mock clipboard API
const mockWriteText = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

describe('Frontend UUID Utilities', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';
  const validUUIDUpperCase = '123E4567-E89B-12D3-A456-426614174000';
  const invalidUUID = 'invalid-uuid-format';
  const validCUID = 'c1234567890123456789012345';
  const uuidV1 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

  beforeEach(() => {
    mockWriteText.mockReset();
  });

  describe('UUID Validation', () => {
    describe('isValidUUID', () => {
      it('should validate correct UUID v4 format', () => {
        expect(isValidUUID(validUUID)).toBe(true);
        expect(isValidUUID(validUUIDUpperCase)).toBe(true);
      });

      it('should reject invalid UUID formats', () => {
        expect(isValidUUID(invalidUUID)).toBe(false);
        expect(isValidUUID('')).toBe(false);
        expect(isValidUUID('123')).toBe(false);
        expect(isValidUUID('not-a-uuid')).toBe(false);
      });

      it('should reject non-string inputs', () => {
        expect(isValidUUID(null)).toBe(false);
        expect(isValidUUID(undefined)).toBe(false);
        expect(isValidUUID(123 as any)).toBe(false);
        expect(isValidUUID({} as any)).toBe(false);
        expect(isValidUUID([] as any)).toBe(false);
      });

      it('should reject UUID v1 format', () => {
        expect(isValidUUID(uuidV1)).toBe(false);
      });
    });

    describe('isValidCUID', () => {
      it('should validate correct CUID format', () => {
        expect(isValidCUID(validCUID)).toBe(true);
      });

      it('should reject invalid CUID formats', () => {
        expect(isValidCUID(validUUID)).toBe(false);
        expect(isValidCUID('1234567890123456789012345')).toBe(false); // No 'c' prefix
        expect(isValidCUID('c123')).toBe(false); // Too short
      });

      it('should reject non-string inputs', () => {
        expect(isValidCUID(null)).toBe(false);
        expect(isValidCUID(undefined)).toBe(false);
        expect(isValidCUID(123 as any)).toBe(false);
      });
    });

    describe('validateIdFormat', () => {
      it('should detect UUID v4 format', () => {
        const result = validateIdFormat(validUUID);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('uuid-v4');
        expect(result.version).toBe(4);
      });

      it('should detect CUID format', () => {
        const result = validateIdFormat(validCUID);
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('cuid');
      });

      it('should detect numeric format', () => {
        const result = validateIdFormat('12345');
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('numeric');
      });

      it('should detect unknown format', () => {
        const result = validateIdFormat(invalidUUID);
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('unknown');
        expect(result.error).toBe('Invalid ID format');
      });

      it('should handle non-string inputs', () => {
        const result = validateIdFormat(null);
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('unknown');
        expect(result.error).toBe('Value must be a string');
      });
    });
  });

  describe('UUID Normalization', () => {
    describe('normalizeUUID', () => {
      it('should normalize UUID to lowercase', () => {
        const normalized = normalizeUUID(validUUIDUpperCase);
        expect(normalized).toBe(validUUID);
      });

      it('should trim whitespace', () => {
        const uuidWithSpaces = `  ${validUUID}  `;
        const normalized = normalizeUUID(uuidWithSpaces);
        expect(normalized).toBe(validUUID);
      });

      it('should throw error for invalid UUID', () => {
        expect(() => normalizeUUID(invalidUUID)).toThrow('Invalid UUID format - must be UUID v4');
      });
    });

    describe('truncateUUID', () => {
      it('should truncate UUID to specified length', () => {
        const truncated = truncateUUID(validUUID, 8);
        expect(truncated).toBe('123e4567...174000');
      });

      it('should use default length of 8', () => {
        const truncated = truncateUUID(validUUID);
        expect(truncated).toBe('123e4567...174000');
      });

      it('should handle custom length', () => {
        const truncated = truncateUUID(validUUID, 4);
        expect(truncated).toBe('123e...4000');
      });

      it('should return original if already short', () => {
        const shortUuid = '123e4567';
        const truncated = truncateUUID(shortUuid, 8);
        expect(truncated).toBe(shortUuid);
      });

      it('should handle empty string', () => {
        const truncated = truncateUUID('');
        expect(truncated).toBe('');
      });
    });
  });

  describe('Standard Format Conversion', () => {
    describe('formatForSTEP', () => {
      it('should format UUID for STEP AP242', () => {
        const formatted = formatForSTEP(validUUID);
        expect(formatted).toBe(`urn:uuid:${validUUID}`);
      });

      it('should normalize before formatting', () => {
        const formatted = formatForSTEP(validUUIDUpperCase);
        expect(formatted).toBe(`urn:uuid:${validUUID}`);
      });
    });

    describe('formatForQIF', () => {
      it('should format UUID for QIF standard', () => {
        const formatted = formatForQIF(validUUID);
        expect(formatted).toBe(`urn:uuid:${validUUID}`);
      });
    });

    describe('formatForITAR', () => {
      it('should format UUID for ITAR compliance', () => {
        const formatted = formatForITAR(validUUID);
        expect(formatted).toBe(`ITAR-UUID:${validUUID.toUpperCase()}`);
      });
    });

    describe('getAllStandardFormats', () => {
      it('should return all standard formats', () => {
        const formats = getAllStandardFormats(validUUID);
        expect(formats.step).toBe(`urn:uuid:${validUUID}`);
        expect(formats.qif).toBe(`urn:uuid:${validUUID}`);
        expect(formats.itar).toBe(`ITAR-UUID:${validUUID.toUpperCase()}`);
      });
    });
  });

  describe('Entity Type Support', () => {
    describe('supportsUUID', () => {
      it('should return true for supported entities', () => {
        Object.values(UUIDSupportedEntity).forEach(entity => {
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
        expect(validateEntityUUID(UUIDSupportedEntity.PART, validUUID)).toBe(true);
        expect(validateEntityUUID(UUIDSupportedEntity.WORK_ORDER, validUUID)).toBe(true);
      });

      it('should reject invalid UUIDs for supported entities', () => {
        expect(validateEntityUUID(UUIDSupportedEntity.PART, invalidUUID)).toBe(false);
      });

      it('should throw error for unsupported entity types', () => {
        expect(() => validateEntityUUID('UnsupportedEntity' as any, validUUID))
          .toThrow('Entity type UnsupportedEntity does not support persistent UUIDs');
      });
    });

    describe('createEntityUUID', () => {
      it('should create typed UUID for valid input', () => {
        const entityUuid = createEntityUUID(validUUID);
        expect(entityUuid).toBe(validUUID);
      });

      it('should throw error for invalid UUID', () => {
        expect(() => createEntityUUID(invalidUUID)).toThrow('Invalid UUID format');
      });
    });
  });

  describe('Clipboard Operations', () => {
    describe('copyUUIDToClipboard', () => {
      it('should copy raw UUID to clipboard', async () => {
        mockWriteText.mockResolvedValue(undefined);

        const result = await copyUUIDToClipboard(validUUID);

        expect(result).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith(validUUID);
      });

      it('should copy STEP format to clipboard', async () => {
        mockWriteText.mockResolvedValue(undefined);

        const result = await copyUUIDToClipboard(validUUID, 'step');

        expect(result).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith(`urn:uuid:${validUUID}`);
      });

      it('should copy QIF format to clipboard', async () => {
        mockWriteText.mockResolvedValue(undefined);

        const result = await copyUUIDToClipboard(validUUID, 'qif');

        expect(result).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith(`urn:uuid:${validUUID}`);
      });

      it('should copy ITAR format to clipboard', async () => {
        mockWriteText.mockResolvedValue(undefined);

        const result = await copyUUIDToClipboard(validUUID, 'itar');

        expect(result).toBe(true);
        expect(mockWriteText).toHaveBeenCalledWith(`ITAR-UUID:${validUUID.toUpperCase()}`);
      });

      it('should handle clipboard errors gracefully', async () => {
        mockWriteText.mockRejectedValue(new Error('Clipboard error'));

        const result = await copyUUIDToClipboard(validUUID);

        expect(result).toBe(false);
      });
    });
  });

  describe('URL Parameter Handling', () => {
    describe('isUUIDParam', () => {
      it('should detect UUID parameters', () => {
        expect(isUUIDParam(validUUID)).toBe(true);
        expect(isUUIDParam(invalidUUID)).toBe(false);
      });
    });

    describe('createUUIDParam', () => {
      it('should create URL-safe UUID parameter', () => {
        const param = createUUIDParam(validUUIDUpperCase);
        expect(param).toBe(validUUID);
      });
    });

    describe('parseUUIDParam', () => {
      it('should parse valid UUID parameter', () => {
        const parsed = parseUUIDParam(validUUID);
        expect(parsed).toBe(validUUID);
      });

      it('should throw error for invalid UUID parameter', () => {
        expect(() => parseUUIDParam(invalidUUID))
          .toThrow('Invalid UUID parameter: Invalid ID format');
      });

      it('should throw error for non-UUID format', () => {
        expect(() => parseUUIDParam(validCUID))
          .toThrow('UUID parameter must be UUID v4 format, got: cuid');
      });
    });
  });

  describe('Display Utilities', () => {
    describe('getEntityDisplayText', () => {
      it('should return display name when provided', () => {
        const displayText = getEntityDisplayText(
          UUIDSupportedEntity.PART,
          validUUID,
          'Test Part'
        );
        expect(displayText).toBe('Test Part');
      });

      it('should return entity type with truncated UUID when no display name', () => {
        const displayText = getEntityDisplayText(
          UUIDSupportedEntity.WORK_ORDER,
          validUUID
        );
        expect(displayText).toBe('WorkOrder: 123e4567...174000');
      });
    });
  });

  describe('Search Utilities', () => {
    describe('createUUIDSearchQuery', () => {
      it('should remove dashes for flexible searching', () => {
        const searchQuery = createUUIDSearchQuery(validUUID);
        expect(searchQuery).toBe('123e4567e89b12d3a456426614174000');
      });
    });

    describe('isLikelyUUIDQuery', () => {
      it('should detect likely UUID queries', () => {
        expect(isLikelyUUIDQuery(validUUID)).toBe(true);
        expect(isLikelyUUIDQuery('123e4567e89b12d3a456426614174000')).toBe(true); // No dashes
        expect(isLikelyUUIDQuery('123e4567 e89b 12d3')).toBe(true); // Spaces
        expect(isLikelyUUIDQuery('123e4567')).toBe(true); // Partial
      });

      it('should reject non-UUID queries', () => {
        expect(isLikelyUUIDQuery('hello world')).toBe(false);
        expect(isLikelyUUIDQuery('123')).toBe(false); // Too short
        expect(isLikelyUUIDQuery('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false); // Not hex
      });
    });

    describe('reconstructUUID', () => {
      it('should reconstruct UUID from cleaned input', () => {
        const cleaned = '123e4567e89b12d3a456426614174000';
        const reconstructed = reconstructUUID(cleaned);
        expect(reconstructed).toBe(validUUID);
      });

      it('should handle input with spaces and dashes', () => {
        const messy = '123e4567 e89b-12d3 a456 426614174000';
        const reconstructed = reconstructUUID(messy);
        expect(reconstructed).toBe(validUUID);
      });

      it('should return null for invalid length', () => {
        const reconstructed = reconstructUUID('123e4567');
        expect(reconstructed).toBeNull();
      });

      it('should return null for non-hex characters', () => {
        const reconstructed = reconstructUUID('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz');
        expect(reconstructed).toBeNull();
      });
    });
  });

  describe('Error Classes', () => {
    describe('UUIDValidationError', () => {
      it('should create error with message and UUID', () => {
        const error = new UUIDValidationError('Test error', validUUID, UUIDSupportedEntity.PART);
        expect(error.message).toBe('Test error');
        expect(error.uuid).toBe(validUUID);
        expect(error.entityType).toBe(UUIDSupportedEntity.PART);
        expect(error.name).toBe('UUIDValidationError');
      });
    });

    describe('UUIDNotFoundError', () => {
      it('should create error with UUID and entity type', () => {
        const error = new UUIDNotFoundError(validUUID, UUIDSupportedEntity.WORK_ORDER);
        expect(error.message).toBe(`WorkOrder with persistent UUID ${validUUID} not found`);
        expect(error.uuid).toBe(validUUID);
        expect(error.entityType).toBe(UUIDSupportedEntity.WORK_ORDER);
        expect(error.name).toBe('UUIDNotFoundError');
      });

      it('should work without entity type', () => {
        const error = new UUIDNotFoundError(validUUID);
        expect(error.message).toBe(`Entity with persistent UUID ${validUUID} not found`);
        expect(error.uuid).toBe(validUUID);
        expect(error.entityType).toBeUndefined();
      });
    });
  });

  describe('Constants', () => {
    describe('FRONTEND_UUID_CONSTANTS', () => {
      it('should have correct values', () => {
        expect(FRONTEND_UUID_CONSTANTS.VERSION).toBe(4);
        expect(FRONTEND_UUID_CONSTANTS.STANDARD).toBe('NIST AMS 300-12');
        expect(FRONTEND_UUID_CONSTANTS.TRUNCATE_LENGTH).toBe(8);
        expect(FRONTEND_UUID_CONSTANTS.COPY_TIMEOUT).toBe(2000);
        expect(FRONTEND_UUID_CONSTANTS.TOOLTIP_DELAY).toBe(300);
      });
    });

    describe('DEFAULT_UUID_DISPLAY_OPTIONS', () => {
      it('should have correct default values', () => {
        expect(DEFAULT_UUID_DISPLAY_OPTIONS.showCopy).toBe(true);
        expect(DEFAULT_UUID_DISPLAY_OPTIONS.showTooltip).toBe(true);
        expect(DEFAULT_UUID_DISPLAY_OPTIONS.truncate).toBe(true);
        expect(DEFAULT_UUID_DISPLAY_OPTIONS.truncateLength).toBe(8);
        expect(DEFAULT_UUID_DISPLAY_OPTIONS.showPrefix).toBe(false);
      });
    });
  });

  describe('Regex Patterns', () => {
    it('should validate UUID v4 pattern correctly', () => {
      expect(UUID_V4_REGEX.test(validUUID)).toBe(true);
      expect(UUID_V4_REGEX.test(validUUIDUpperCase)).toBe(true);
      expect(UUID_V4_REGEX.test(uuidV1)).toBe(false);
      expect(UUID_V4_REGEX.test(invalidUUID)).toBe(false);
    });

    it('should validate CUID pattern correctly', () => {
      expect(CUID_REGEX.test(validCUID)).toBe(true);
      expect(CUID_REGEX.test(validUUID)).toBe(false);
      expect(CUID_REGEX.test('1234567890123456789012345')).toBe(false); // No 'c' prefix
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete UUID workflow', () => {
      // Generate a UUID (simulated - we use a known valid one)
      const uuid = validUUID;

      // Validate
      expect(isValidUUID(uuid)).toBe(true);

      // Normalize
      const normalized = normalizeUUID(uuid);
      expect(normalized).toBe(uuid);

      // Truncate for display
      const truncated = truncateUUID(normalized);
      expect(truncated).toBe('123e4567...174000');

      // Format for different standards
      const stepFormat = formatForSTEP(normalized);
      const qifFormat = formatForQIF(normalized);
      const itarFormat = formatForITAR(normalized);

      expect(stepFormat).toBe(`urn:uuid:${uuid}`);
      expect(qifFormat).toBe(`urn:uuid:${uuid}`);
      expect(itarFormat).toBe(`ITAR-UUID:${uuid.toUpperCase()}`);

      // Entity validation
      expect(validateEntityUUID(UUIDSupportedEntity.PART, uuid)).toBe(true);

      // Search query creation
      const searchQuery = createUUIDSearchQuery(uuid);
      expect(searchQuery).toBe('123e4567e89b12d3a456426614174000');
    });

    it('should handle edge cases gracefully', () => {
      // Empty string
      expect(isValidUUID('')).toBe(false);

      // Whitespace only
      expect(isValidUUID('   ')).toBe(false);

      // Invalid format but close
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(false);

      // Mixed case normalization
      const mixed = '123E4567-e89b-12D3-A456-426614174000';
      expect(normalizeUUID(mixed)).toBe(validUUID);

      // Truncation edge cases
      expect(truncateUUID('', 8)).toBe('');
      expect(truncateUUID('short', 8)).toBe('short');
    });
  });
});