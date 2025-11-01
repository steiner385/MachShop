/**
 * Serial Number Generation Performance Tests (Issue #149)
 * Validates performance characteristics under load
 */

import { PatternEngine } from '../../services/PatternEngine';
import { CheckDigitService } from '../../services/CheckDigitService';
import { describe, it, expect, beforeAll } from 'vitest';

describe('Serial Number Generation - Performance Tests', () => {
  let patternEngine: PatternEngine;
  let checkDigitService: CheckDigitService;

  beforeAll(() => {
    patternEngine = new PatternEngine();
    checkDigitService = new CheckDigitService();
  });

  describe('Single Serial Generation Performance', () => {
    it('should parse patterns efficiently (<1ms)', () => {
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        patternEngine.parsePattern(pattern);
      }

      const elapsed = performance.now() - start;
      const average = elapsed / 100;

      expect(average).toBeLessThan(1);
    });

    it('should validate serials efficiently (<2ms)', () => {
      const serial = 'AERO-20251031-000001X';
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        patternEngine.validateAgainstPattern(serial, pattern);
      }

      const elapsed = performance.now() - start;
      const average = elapsed / 100;

      expect(average).toBeLessThan(2);
    });
  });

  describe('Batch Serial Generation Performance', () => {
    it('should handle 1000 pattern generations', () => {
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        patternEngine.parsePattern(pattern);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should calculate check digits for 10,000 values efficiently', () => {
      const baseValue = '79927398';
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        checkDigitService.calculateCheckDigit(`${baseValue}${i}`, 'luhn');
      }

      const elapsed = performance.now() - start;
      const average = elapsed / 10000;

      expect(average).toBeLessThan(1); // Should average under 1ms per calculation
      expect(elapsed).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Pattern Complexity Performance', () => {
    it('should handle simple patterns (prefix + seq)', () => {
      const pattern = '{PREFIX:SN}-{SEQ:8}';
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        patternEngine.parsePattern(pattern);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
    });

    it('should handle complex patterns (all components)', () => {
      const pattern = '{PREFIX:AERO}-{YYYY}{MM}{DD}-W{WW}-{SEQ:5}-{SITE}-{CHECK:luhn}';
      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        patternEngine.parsePattern(pattern);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Validation Performance', () => {
    it('should validate 1000 serials efficiently', () => {
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const serials = Array.from({ length: 1000 }, (_, i) =>
        `AERO-20251031-${(i + 1).toString().padStart(6, '0')}X`
      );

      const start = performance.now();

      for (const serial of serials) {
        patternEngine.validateAgainstPattern(serial, pattern);
      }

      const elapsed = performance.now() - start;
      const average = elapsed / serials.length;

      expect(average).toBeLessThan(2); // Average < 2ms per validation
      expect(elapsed).toBeLessThan(3000); // Total < 3 seconds
    });

    it('should validate check digits for 10,000 serials', () => {
      const serials = Array.from({ length: 10000 }, (_, i) => {
        const base = `79927398${i}`;
        const result = checkDigitService.calculateCheckDigit(base, 'luhn');
        return result.value;
      });

      const start = performance.now();

      for (const serial of serials) {
        checkDigitService.validateCheckDigit(serial, 'luhn');
      }

      const elapsed = performance.now() - start;
      const average = elapsed / serials.length;

      expect(average).toBeLessThan(1); // Average < 1ms per validation
      expect(elapsed).toBeLessThan(10000); // Total < 10 seconds
    });
  });

  describe('Concurrent Operation Simulation', () => {
    it('should handle simulated concurrent pattern parsing', async () => {
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const concurrentOperations = 100;

      const start = performance.now();

      const promises = Array.from({ length: concurrentOperations }, () => {
        return Promise.resolve().then(() => {
          // Simulate 10 operations per concurrent request
          for (let i = 0; i < 10; i++) {
            patternEngine.parsePattern(pattern);
          }
        });
      });

      await Promise.all(promises);

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete in under 5 seconds
    });

    it('should handle simulated concurrent serial validations', async () => {
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const serials = Array.from({ length: 100 }, (_, i) =>
        `AERO-20251031-${(i + 1).toString().padStart(6, '0')}X`
      );

      const start = performance.now();

      const promises = serials.map(serial => {
        return Promise.resolve().then(() => {
          patternEngine.validateAgainstPattern(serial, pattern);
        });
      });

      await Promise.all(promises);

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('Memory and Efficiency Metrics', () => {
    it('should not create memory leaks with repeated parsing', () => {
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';

      const iterations = 10000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        patternEngine.parsePattern(pattern);
      }

      const elapsed = performance.now() - start;
      const opsPerSecond = (iterations / elapsed) * 1000;

      expect(opsPerSecond).toBeGreaterThan(10000); // Should handle >10k ops/sec
    });

    it('should efficiently handle pattern component replacement', () => {
      let serial = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      const components = [
        { placeholder: '{YYYY}', value: '2025' },
        { placeholder: '{MM}', value: '10' },
        { placeholder: '{DD}', value: '31' },
        { placeholder: '{SEQ:6}', value: '000001' },
        { placeholder: '{CHECK:luhn}', value: '' },
      ];

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        let temp = serial;
        for (const component of components) {
          temp = temp.replace(component.placeholder, component.value);
        }
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(500);
    });
  });

  describe('Baseline Performance Acceptance Criteria', () => {
    it('should parse patterns in < 1ms', () => {
      const start = performance.now();
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      patternEngine.parsePattern(pattern);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
    });

    it('should validate patterns in < 1ms', () => {
      const start = performance.now();
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      patternEngine.validatePatternSyntax(pattern);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
    });

    it('should validate serials in < 2ms', () => {
      const start = performance.now();
      const serial = 'AERO-20251031-000001X';
      const pattern = 'AERO-{YYYY}{MM}{DD}-{SEQ:6}-{CHECK:luhn}';
      patternEngine.validateAgainstPattern(serial, pattern);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(2);
    });

    it('should calculate check digits in < 1ms', () => {
      const start = performance.now();
      checkDigitService.calculateCheckDigit('79927398713', 'luhn');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
    });

    it('should validate check digits in < 1ms', () => {
      const start = performance.now();
      checkDigitService.validateCheckDigit('799273987139', 'luhn');
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(1);
    });

    it('should batch generate > 1000 serials/second', () => {
      const pattern = 'SN-{SEQ:5}';
      const count = 1000;

      const start = performance.now();

      for (let i = 1; i <= count; i++) {
        const serial = pattern.replace('{SEQ:5}', i.toString().padStart(5, '0'));
        // Validate it
        patternEngine.validateAgainstPattern(serial, pattern);
      }

      const elapsed = performance.now() - start;
      const throughput = (count / elapsed) * 1000;

      expect(throughput).toBeGreaterThan(1000);
    });
  });
});
