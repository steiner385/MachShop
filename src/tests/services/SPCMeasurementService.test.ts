/**
 * SPC Measurement Service - Unit Tests
 * Tests for measurement recording and subgroup management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SPCMeasurementService from '../../services/SPCMeasurementService';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SPCMeasurementService', () => {
  let measurementService: SPCMeasurementService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    measurementService = new SPCMeasurementService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordMeasurement', () => {
    it('should record a subgroup measurement', async () => {
      const input = {
        planId: 'SPC-001',
        values: [10.1, 10.2, 10.0],
        subgroupNumber: 1,
      };

      const result = await measurementService.recordMeasurement(input);

      expect(result).toBeDefined();
      expect(result.planId).toBe('SPC-001');
      expect(result.values.length).toBe(3);
      expect(result.mean).toBeCloseTo(10.1, 1);
      expect(result.range).toBeDefined();
    });

    it('should calculate correct mean for subgroup', async () => {
      const input = {
        planId: 'SPC-001',
        values: [9.0, 10.0, 11.0],
      };

      const result = await measurementService.recordMeasurement(input);

      expect(result.mean).toBe(10.0);
    });

    it('should calculate correct range', async () => {
      const input = {
        planId: 'SPC-001',
        values: [8.0, 10.0, 12.0],
      };

      const result = await measurementService.recordMeasurement(input);

      expect(result.range).toBe(4.0); // 12 - 8
    });

    it('should throw error if no values provided', async () => {
      const input = {
        planId: 'SPC-001',
        values: [],
      };

      await expect(measurementService.recordMeasurement(input)).rejects.toThrow();
    });

    it('should throw error if values contain invalid numbers', async () => {
      const input = {
        planId: 'SPC-001',
        values: [10.1, NaN, 10.2],
      };

      await expect(measurementService.recordMeasurement(input)).rejects.toThrow();
    });
  });

  describe('recordIndividualMeasurement', () => {
    it('should record individual measurement without moving range', async () => {
      const result = await measurementService.recordIndividualMeasurement('SPC-001', 100.5);

      expect(result).toBeDefined();
      expect(result.mean).toBe(100.5);
      expect(result.values.length).toBe(1);
      expect(result.movingRange).toBeUndefined();
    });

    it('should calculate moving range on second measurement', async () => {
      await measurementService.recordIndividualMeasurement('SPC-001', 100.0);
      const result = await measurementService.recordIndividualMeasurement('SPC-001', 101.0);

      expect(result.movingRange).toBe(1.0);
    });

    it('should throw error for invalid measurement value', async () => {
      await expect(measurementService.recordIndividualMeasurement('SPC-001', NaN)).rejects.toThrow();
    });
  });

  describe('calculateSubgroupStatistics', () => {
    it('should calculate mean correctly', () => {
      const stats = measurementService.calculateSubgroupStatistics([1, 2, 3, 4, 5]);

      expect(stats.subgroupMean).toBe(3);
    });

    it('should calculate range correctly', () => {
      const stats = measurementService.calculateSubgroupStatistics([1, 3, 5, 7, 9]);

      expect(stats.subgroupRange).toBe(8); // 9 - 1
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(9);
    });

    it('should calculate standard deviation', () => {
      const stats = measurementService.calculateSubgroupStatistics([2, 4, 6, 8, 10]);

      expect(stats.subgroupStdDev).toBeGreaterThan(0);
    });

    it('should throw error for empty values', () => {
      expect(() => measurementService.calculateSubgroupStatistics([])).toThrow();
    });

    it('should handle single value', () => {
      const stats = measurementService.calculateSubgroupStatistics([5]);

      expect(stats.subgroupMean).toBe(5);
      expect(stats.subgroupRange).toBe(0);
    });
  });

  describe('detectOutliers', () => {
    it('should detect outliers using IQR method', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // 100 is obvious outlier

      const result = measurementService.detectOutliers(values);

      expect(result.outliers.length).toBeGreaterThan(0);
      expect(result.outliers.includes(100)).toBe(true);
    });

    it('should return no outliers for normal distribution', () => {
      const values = [10, 11, 10, 12, 10, 11, 10, 12];

      const result = measurementService.detectOutliers(values);

      expect(result.outliers.length).toBe(0);
    });

    it('should return empty array if less than 4 values', () => {
      const result = measurementService.detectOutliers([1, 2, 3]);

      expect(result.outliers.length).toBe(0);
    });
  });

  describe('calculateRunningStatistics', () => {
    it('should calculate overall statistics', () => {
      const subgroups = [
        {
          id: 'sg-1',
          planId: 'plan-1',
          subgroupNumber: 1,
          values: [10, 11, 10],
          mean: 10.33,
          range: 1,
          standardDeviation: 0.5,
          samplingTime: new Date(),
          recordedDate: new Date(),
        },
        {
          id: 'sg-2',
          planId: 'plan-1',
          subgroupNumber: 2,
          values: [11, 12, 11],
          mean: 11.33,
          range: 1,
          standardDeviation: 0.5,
          samplingTime: new Date(),
          recordedDate: new Date(),
        },
      ];

      const result = measurementService.calculateRunningStatistics(subgroups);

      expect(result.overallMean).toBeGreaterThan(10);
      expect(result.overallRange).toBeGreaterThan(0);
      expect(result.overallStdDev).toBeGreaterThan(0);
    });

    it('should throw error for empty subgroups', () => {
      expect(() => measurementService.calculateRunningStatistics([])).toThrow();
    });
  });

  describe('validateAgainstSpecLimits', () => {
    it('should classify conforming and non-conforming values', () => {
      const values = [9.5, 10.0, 10.5, 10.8, 11.0];
      const result = measurementService.validateAgainstSpecLimits(values, 10.5, 9.5);

      expect(result.conforming.length).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThanOrEqual(0);
    });

    it('should calculate defect rate correctly', () => {
      const values = [10, 20, 30, 40, 50]; // 4 out of 5 above 30
      const result = measurementService.validateAgainstSpecLimits(values, 35, 15);

      expect(result.nonconforming.length).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThan(0);
    });

    it('should handle no upper specification limit', () => {
      const result = measurementService.validateAgainstSpecLimits([10, 20, 30], undefined, 5);

      expect(result).toBeDefined();
    });

    it('should handle no lower specification limit', () => {
      const result = measurementService.validateAgainstSpecLimits([10, 20, 30], 35, undefined);

      expect(result).toBeDefined();
    });
  });

  describe('getPlanMeasurements', () => {
    it('should retrieve plan measurements', async () => {
      const measurements = await measurementService.getPlanMeasurements('SPC-001');

      expect(Array.isArray(measurements)).toBe(true);
    });
  });

  describe('getRecentSubgroups', () => {
    it('should retrieve recent subgroups', async () => {
      const subgroups = await measurementService.getRecentSubgroups('SPC-001', 10);

      expect(Array.isArray(subgroups)).toBe(true);
    });

    it('should throw error if count is 0 or negative', async () => {
      await expect(measurementService.getRecentSubgroups('SPC-001', 0)).rejects.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await measurementService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
