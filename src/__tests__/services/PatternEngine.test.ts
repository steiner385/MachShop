/**
 * Pattern Engine Tests (Issue #149)
 * Unit tests for pattern parsing, validation, and generation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatternEngine } from '../../services/PatternEngine';
import { GenerationContext, ParsedPattern } from '../../types/serialNumberFormat';

describe('PatternEngine', () => {
  let engine: PatternEngine;
  let mockContext: GenerationContext;

  beforeEach(() => {
    engine = new PatternEngine();
    mockContext = {
      formatConfigId: 'test-format-1',
      siteId: 'SITE001',
      partId: 'PART001',
      timestamp: new Date('2025-10-31T12:00:00Z'),
    };
  });

  describe('parsePattern', () => {
    it('should parse a simple pattern with PREFIX and date components', () => {
      const pattern = '{PREFIX:PRE}-{YYYY}{MM}{DD}';
      const result = engine.parsePattern(pattern);

      expect(result.rawPattern).toBe(pattern);
      expect(result.components).toHaveLength(4);
      expect(result.components[0].type).toBe('PREFIX');
      expect(result.components[1].type).toBe('YYYY');
      expect(result.components[2].type).toBe('MM');
      expect(result.components[3].type).toBe('DD');
    });

    it('should parse pattern with sequential counter', () => {
      const pattern = '{PREFIX:ABC}-{SEQ:6}';
      const result = engine.parsePattern(pattern);

      expect(result.components).toHaveLength(2);
      expect(result.components[0].config?.value).toBe('ABC');
      expect(result.components[1].config?.length).toBe(6);
    });

    it('should parse pattern with check digit', () => {
      const pattern = '{PREFIX:SN}-{SEQ:5}-{CHECK:luhn}';
      const result = engine.parsePattern(pattern);

      expect(result.components).toHaveLength(3);
      expect(result.components[2].type).toBe('CHECK');
      expect(result.components[2].config?.algorithm).toBe('luhn');
    });

    it('should parse complex multi-component pattern', () => {
      const pattern = '{PREFIX:AERO}-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const result = engine.parsePattern(pattern);

      expect(result.components).toHaveLength(6);
      expect(result.isDeterministic).toBe(true);
      expect(result.metadata.hasDate).toBe(true);
      expect(result.metadata.hasSequential).toBe(true);
      expect(result.metadata.hasCheckDigit).toBe(true);
    });

    it('should handle patterns with random components', () => {
      const pattern = '{RANDOM:numeric:4}';
      const result = engine.parsePattern(pattern);

      expect(result.components).toHaveLength(1);
      expect(result.components[0].type).toBe('RANDOM');
      expect(result.isDeterministic).toBe(false);
      expect(result.metadata.hasRandom).toBe(true);
    });

    it('should handle empty or invalid patterns gracefully', () => {
      const result = engine.parsePattern('');
      expect(result.components).toHaveLength(0);
      expect(result.isDeterministic).toBe(false);
    });
  });

  describe('validatePatternSyntax', () => {
    it('should validate correct pattern syntax', () => {
      const patterns = [
        'PRE-{YYYY}{MM}{DD}-{SEQ:6}',
        '{PREFIX:TEST}-{YYYY}-{SEQ:4}',
        '{PREFIX:A}-{RANDOM:alphanumeric:4}-{CHECK:mod10}',
      ];

      patterns.forEach(pattern => {
        const result = engine.validatePatternSyntax(pattern);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should detect unknown component types', () => {
      const pattern = '{INVALID:value}';
      const result = engine.validatePatternSyntax(pattern);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Unknown component type');
    });

    it('should validate SEQ length constraints', () => {
      const invalidPatterns = [
        '{SEQ:0}', // Too small
        '{SEQ:9}', // Too large
        '{SEQ:invalid}', // Non-numeric
      ];

      invalidPatterns.forEach(pattern => {
        const result = engine.validatePatternSyntax(pattern);
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate RANDOM type constraints', () => {
      const result = engine.validatePatternSyntax('{RANDOM:invalid:4}');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('type must be');
    });

    it('should validate CHECK algorithm constraints', () => {
      const result = engine.validatePatternSyntax('{CHECK:invalid}');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('algorithm must be');
    });
  });

  describe('extractComponents', () => {
    it('should extract all components from pattern', () => {
      const pattern = '{PREFIX:ABC}-{YYYY}-{MM}-{SEQ:6}-{CHECK:luhn}';
      const components = engine.extractComponents(pattern);

      expect(components).toHaveLength(5);
      expect(components.map(c => c.type)).toEqual([
        'PREFIX',
        'YYYY',
        'MM',
        'SEQ',
        'CHECK',
      ]);
    });

    it('should extract components with correct positions', () => {
      const pattern = '{YYYY}-{SEQ:4}-{CHECK:luhn}';
      const components = engine.extractComponents(pattern);

      expect(components[0].position).toBe(0);
      expect(components[1].position).toBe(1);
      expect(components[2].position).toBe(2);
    });
  });

  describe('generateSerial', () => {
    it('should generate serial with date components', () => {
      const pattern = 'SN-{YYYY}{MM}{DD}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toBe('SN-20251031');
    });

    it('should generate serial with fixed components', () => {
      const pattern = '{PREFIX:ABC}-{SEQ:6}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^ABC-000000$/);
    });

    it('should generate serial with week number', () => {
      const pattern = '{YYYY}-W{WW}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^2025-W\d{2}$/);
    });

    it('should generate serial with UUID', () => {
      const pattern = 'UUID-{UUID}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^UUID-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    it('should generate serial with random alphanumeric', () => {
      const pattern = '{PREFIX:SN}-{RANDOM:alphanumeric:4}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^SN-[A-Z0-9]{4}$/);
    });

    it('should generate serial with random numeric', () => {
      const pattern = '{RANDOM:numeric:4}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^\d{4}$/);
    });

    it('should generate serial with random alpha', () => {
      const pattern = '{RANDOM:alpha:4}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^[A-Z]{4}$/);
    });

    it('should handle SITE in pattern', () => {
      const pattern = '{SITE}-{YYYY}';
      const serial = engine.generateSerial(pattern, {
        ...mockContext,
        siteId: 'NYC001',
      });

      // Pattern processing - just verify we get a result
      expect(serial).toBeDefined();
      expect(serial.length).toBeGreaterThan(0);
    });

    it('should handle PART in pattern', () => {
      const pattern = '{PART}-SN';
      const serial = engine.generateSerial(pattern, {
        ...mockContext,
        partId: 'P12345',
      });

      // Pattern processing - just verify we get a result
      expect(serial).toBeDefined();
      expect(serial.length).toBeGreaterThan(0);
    });
  });

  describe('buildSerial', () => {
    it('should build serial from parsed pattern', () => {
      const pattern = 'PRE-{YYYY}';
      const parsed = engine.parsePattern(pattern);
      const serial = engine.buildSerial(parsed, mockContext);

      expect(serial).toBe('PRE-2025');
    });
  });

  describe('validateAgainstPattern', () => {
    it('should validate serial matching pattern', () => {
      const pattern = 'SN-{YYYY}-{MM}-{DD}';

      expect(engine.validateAgainstPattern('SN-2025-10-31', pattern)).toBe(true);
      expect(engine.validateAgainstPattern('SN-2025-10-32', pattern)).toBe(true); // Pattern doesn't validate date ranges
      expect(engine.validateAgainstPattern('SN-2025-10', pattern)).toBe(false); // Too short
      expect(engine.validateAgainstPattern('XX-2025-10-31', pattern)).toBe(false); // Prefix mismatch
    });

    it('should validate serial with sequential number', () => {
      const pattern = '{PREFIX:ABC}-{SEQ:6}';

      expect(engine.validateAgainstPattern('ABC-123456', pattern)).toBe(true);
      expect(engine.validateAgainstPattern('ABC-12345', pattern)).toBe(false); // Wrong length
    });

    it('should validate complex patterns', () => {
      const pattern = 'AERO-{YYYY}-W{WW}-{SEQ:6}';

      expect(engine.validateAgainstPattern('AERO-2025-W44-000001', pattern)).toBe(true);
      expect(engine.validateAgainstPattern('AERO-2025-W44-00000', pattern)).toBe(false); // Wrong length
    });

    it('should handle patterns with random components', () => {
      const pattern = '{RANDOM:numeric:4}-{YYYY}';

      expect(engine.validateAgainstPattern('1234-2025', pattern)).toBe(true);
      expect(engine.validateAgainstPattern('ABCD-2025', pattern)).toBe(false); // Not numeric
    });
  });

  describe('getPatternMetadata', () => {
    it('should calculate correct metadata for fixed-length pattern', () => {
      const pattern = '{YYYY}{MM}{DD}-{SEQ:6}';
      const metadata = engine.getPatternMetadata(pattern);

      expect(metadata.hasDate).toBe(true);
      expect(metadata.hasSequential).toBe(true);
      expect(metadata.hasRandom).toBe(false);
      expect(metadata.isDeterministic).toBe(true);
    });

    it('should mark pattern with random as non-deterministic', () => {
      const pattern = '{RANDOM:numeric:4}';
      const metadata = engine.getPatternMetadata(pattern);

      expect(metadata.isDeterministic).toBe(false);
      expect(metadata.hasRandom).toBe(true);
    });

    it('should detect all metadata flags correctly', () => {
      const pattern = '{PREFIX:ABC}-{YYYY}{MM}{DD}-{SEQ:6}-{RANDOM:numeric:2}-{CHECK:luhn}';
      const metadata = engine.getPatternMetadata(pattern);

      expect(metadata.hasDate).toBe(true);
      expect(metadata.hasSequential).toBe(true);
      expect(metadata.hasRandom).toBe(true);
      expect(metadata.hasCheckDigit).toBe(true);
      expect(metadata.isDeterministic).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle pattern with only prefix', () => {
      const pattern = '{PREFIX:CONSTANT}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toBe('CONSTANT');
    });

    it('should handle pattern with special characters in prefix', () => {
      const pattern = '{PREFIX:SN-2025}-{SEQ:4}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toMatch(/^SN-2025-0000$/);
    });

    it('should handle repeated components', () => {
      const pattern = '{YYYY}-{YYYY}-{MM}';
      const serial = engine.generateSerial(pattern, mockContext);

      expect(serial).toBe('2025-2025-10');
    });

    it('should handle empty component config gracefully', () => {
      const pattern = '{PREFIX:}-{YYYY}';
      const serial = engine.generateSerial(pattern, mockContext);

      // Verify result is generated
      expect(serial).toBeDefined();
      expect(serial.length).toBeGreaterThan(0);
    });

    it('should handle missing context values gracefully', () => {
      const pattern = '{SITE}-{PART}';
      const serial = engine.generateSerial(pattern, {
        formatConfigId: 'test',
        siteId: '', // Empty
        // partId missing
      });

      // Verify result is generated
      expect(serial).toBeDefined();
    });

    it('should validate RFC4122 UUID format', () => {
      const pattern = '{UUID}';
      const serial = engine.generateSerial(pattern, mockContext);

      // Check basic UUID format
      expect(serial).toMatch(
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/
      );
    });
  });

  describe('Performance', () => {
    it('should parse complex pattern quickly', () => {
      const pattern = '{PREFIX:AERO}-{YYYY}{MM}{DD}-{WW}-{SEQ:6}-{RANDOM:numeric:2}-{CHECK:luhn}';
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        engine.parsePattern(pattern);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // 1000 parses in <500ms
    });

    it('should generate serials quickly', () => {
      const pattern = '{PREFIX:ABC}-{YYYY}-{SEQ:6}-{RANDOM:numeric:3}';
      const start = Date.now();

      for (let i = 0; i < 1000; i++) {
        engine.generateSerial(pattern, mockContext);
      }

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // 1000 generations in <1s
    });
  });
});
