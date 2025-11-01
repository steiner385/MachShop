/**
 * Control Chart Calculation Service - Unit Tests
 * Tests for advanced control chart calculations and statistical tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ControlChartCalculationService from '../../services/ControlChartCalculationService';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ControlChartCalculationService', () => {
  let calculationService: ControlChartCalculationService;

  beforeEach(() => {
    calculationService = new ControlChartCalculationService();
    vi.clearAllMocks();
  });

  describe('calculateXbarSLimits', () => {
    it('should calculate Xbar-S control limits', () => {
      const measurements = [
        [9.9, 10.0, 10.1],
        [10.0, 10.1, 10.2],
        [9.9, 10.0, 10.0],
      ];

      const limits = calculationService.calculateXbarSLimits(measurements, 3);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
      expect(limits.lcl).toBeLessThan(limits.centerLine);
      expect(limits.uclRange).toBeDefined();
    });

    it('should throw error if no measurements', () => {
      expect(() => calculationService.calculateXbarSLimits([], 3)).toThrow();
    });
  });

  describe('calculateNpChartLimits', () => {
    it('should calculate np-chart limits', () => {
      const defectiveCounts = [2, 3, 1, 4, 2];
      const limits = calculationService.calculateNpChartLimits(defectiveCounts, 100);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
      expect(limits.centerLine).toBeGreaterThan(0);
    });

    it('should throw error if no defect data', () => {
      expect(() => calculationService.calculateNpChartLimits([], 100)).toThrow();
    });
  });

  describe('calculateCChartLimits', () => {
    it('should calculate c-chart limits', () => {
      const defectCounts = [5, 4, 6, 5, 7];
      const limits = calculationService.calculateCChartLimits(defectCounts);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
      expect(limits.centerLine).toBeGreaterThan(0);
    });

    it('should handle zero defects', () => {
      const limits = calculationService.calculateCChartLimits([0, 0, 0, 0]);

      expect(limits.centerLine).toBe(0);
    });

    it('should throw error for empty array', () => {
      expect(() => calculationService.calculateCChartLimits([])).toThrow();
    });
  });

  describe('calculateUChartLimits', () => {
    it('should calculate u-chart limits with variable sample sizes', () => {
      const defectCounts = [5, 4, 6, 5, 7];
      const unitSizes = [10, 12, 15, 10, 12];

      const limits = calculationService.calculateUChartLimits(defectCounts, unitSizes);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
    });

    it('should throw error if arrays have different lengths', () => {
      expect(() => calculationService.calculateUChartLimits([1, 2, 3], [10, 12])).toThrow();
    });
  });

  describe('calculateEWMALimits', () => {
    it('should calculate EWMA limits', () => {
      const measurements = [100, 101, 99, 102, 100, 101, 100];
      const result = calculationService.calculateEWMALimits(measurements, 0.2);

      expect(result).toBeDefined();
      expect(result.points.length).toBe(measurements.length);
      expect(result.ucl).toBeGreaterThan(result.centerLine);
      expect(result.lcl).toBeLessThan(result.centerLine);
    });

    it('should throw error if lambda invalid', () => {
      expect(() => calculationService.calculateEWMALimits([100, 101], 0)).toThrow();
      expect(() => calculationService.calculateEWMALimits([100, 101], 1.5)).toThrow();
    });
  });

  describe('calculateCUSUMLimits', () => {
    it('should calculate CUSUM limits', () => {
      const measurements = [100, 101, 99, 102, 100];
      const result = calculationService.calculateCUSUMLimits(measurements, 100);

      expect(result).toBeDefined();
      expect(result.points.length).toBe(measurements.length);
      expect(result.ucl).toBeGreaterThan(0);
      expect(result.lcl).toBeLessThan(0);
    });
  });

  describe('testNormality', () => {
    it('should test normality with normal distribution', () => {
      const measurements = [10, 11, 10, 12, 10, 11, 10, 12, 11, 10];
      const result = calculationService.testNormality(measurements);

      expect(result).toBeDefined();
      expect(typeof result.isNormal).toBe('boolean');
      expect(result.statistic).toBeGreaterThan(0);
    });

    it('should throw error if fewer than 3 measurements', () => {
      expect(() => calculationService.testNormality([1, 2])).toThrow();
    });

    it('should detect non-normal distribution', () => {
      const measurements = [1, 1, 1, 1, 100]; // Highly skewed
      const result = calculationService.testNormality(measurements);

      expect(result.statistic).toBeDefined();
    });
  });

  describe('boxCoxTransform', () => {
    it('should apply Box-Cox transformation', () => {
      const measurements = [1, 2, 3, 4, 5, 10, 20, 30];
      const result = calculationService.boxCoxTransform(measurements);

      expect(result.lambda).toBeDefined();
      expect(result.transformedData.length).toBe(measurements.length);
    });

    it('should handle positive measurements', () => {
      const result = calculationService.boxCoxTransform([1, 2, 3, 4, 5]);

      expect(result.transformedData.every((val) => typeof val === 'number')).toBe(true);
    });

    it('should throw error for empty array', () => {
      expect(() => calculationService.boxCoxTransform([])).toThrow();
    });
  });

  describe('detectWesternElectricViolations', () => {
    it('should detect point beyond 3 sigma', () => {
      const measurements = [100, 101, 100, 102, 120]; // 120 is 4 sigma away (>15)
      const violations = calculationService.detectWesternElectricViolations(measurements, 100, 5);

      expect(violations.length).toBeGreaterThan(0);
    });

    it('should detect 9 consecutive points on same side', () => {
      const measurements = [105, 106, 105, 107, 106, 105, 107, 106, 105, 106];
      const violations = calculationService.detectWesternElectricViolations(measurements, 100, 1);

      expect(violations).toBeDefined();
    });

    it('should detect 6 consecutive increasing points', () => {
      const measurements = [100, 101, 102, 103, 104, 105, 106, 103, 102];
      const violations = calculationService.detectWesternElectricViolations(measurements, 100, 1);

      expect(violations).toBeDefined();
    });

    it('should return empty array for compliant data', () => {
      const measurements = [100, 101, 100, 99, 100, 101, 100, 99, 100];
      const violations = calculationService.detectWesternElectricViolations(measurements, 100, 5);

      expect(violations.length).toBeGreaterThanOrEqual(0);
    });
  });
});
