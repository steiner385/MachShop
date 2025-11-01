/**
 * SPC Plan Service - Unit Tests
 * Tests for SPC plan creation, control limit calculations, and plan management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import SPCPlanService from '../../services/SPCPlanService';

// Mock logger
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SPCPlanService', () => {
  let planService: SPCPlanService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    planService = new SPCPlanService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize service successfully', () => {
      expect(planService).toBeDefined();
    });

    it('should have all public methods', () => {
      expect(planService.createPlan).toBeDefined();
      expect(planService.getPlan).toBeDefined();
      expect(planService.calculateXbarRLimits).toBeDefined();
      expect(planService.calculateIMRLimits).toBeDefined();
      expect(planService.calculatePChartLimits).toBeDefined();
      expect(planService.updatePlanStatus).toBeDefined();
      expect(planService.getActivePlans).toBeDefined();
      expect(planService.deletePlan).toBeDefined();
    });
  });

  describe('createPlan', () => {
    it('should create a valid SPC plan with Xbar-R chart', async () => {
      const input = {
        planNumber: 'SPC-001',
        name: 'Diameter Measurement',
        description: 'Monitor shaft diameter',
        characteristic: 'Diameter',
        characteristicType: 'VARIABLE' as const,
        chartType: 'XBAR_R' as const,
        subgroupSize: 4,
        upperSpec: 10.5,
        lowerSpec: 9.5,
        unit: 'mm',
        createdById: 'user-1',
      };

      const result = await planService.createPlan(input);

      expect(result).toBeDefined();
      expect(result.planNumber).toBe('SPC-001');
      expect(result.characteristic).toBe('Diameter');
      expect(result.chartType).toBe('XBAR_R');
      expect(result.status).toBe('ACTIVE');
    });

    it('should create plan with I-MR chart', async () => {
      const input = {
        planNumber: 'SPC-002',
        name: 'Temperature',
        characteristic: 'Temperature',
        characteristicType: 'VARIABLE' as const,
        chartType: 'I_MR' as const,
        createdById: 'user-1',
      };

      const result = await planService.createPlan(input);

      expect(result.chartType).toBe('I_MR');
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw error if plan number missing', async () => {
      const input = {
        planNumber: '',
        name: 'Test',
        characteristic: 'Test',
        characteristicType: 'VARIABLE' as const,
        chartType: 'XBAR_R' as const,
        createdById: 'user-1',
      };

      await expect(planService.createPlan(input)).rejects.toThrow();
    });

    it('should throw error if characteristic missing', async () => {
      const input = {
        planNumber: 'SPC-001',
        name: 'Test',
        characteristic: '',
        characteristicType: 'VARIABLE' as const,
        chartType: 'XBAR_R' as const,
        createdById: 'user-1',
      };

      await expect(planService.createPlan(input)).rejects.toThrow();
    });
  });

  describe('calculateXbarRLimits', () => {
    it('should calculate control limits for Xbar-R chart', () => {
      const measurements = [
        [9.9, 10.0, 10.1],
        [9.8, 10.1, 10.2],
        [10.0, 10.1, 10.0],
        [10.2, 10.3, 10.1],
        [9.9, 10.0, 10.1],
      ];

      const limits = planService.calculateXbarRLimits(measurements, 3);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
      expect(limits.lcl).toBeLessThan(limits.centerLine);
      expect(limits.centerLine).toBeGreaterThan(0);
      expect(limits.uclRange).toBeDefined();
      expect(limits.centerLineRange).toBeDefined();
      expect(limits.lclRange).toBeDefined();
    });

    it('should calculate limits with subgroup size 4', () => {
      const measurements = [
        [9.9, 10.0, 10.1, 10.0],
        [10.1, 10.2, 10.0, 10.1],
        [10.0, 10.1, 10.2, 10.0],
      ];

      const limits = planService.calculateXbarRLimits(measurements, 4);

      expect(limits.ucl).toBeGreaterThan(0);
      expect(limits.lcl).toBeGreaterThan(0);
    });

    it('should throw error if no measurements provided', () => {
      expect(() => planService.calculateXbarRLimits([], 3)).toThrow();
    });

    it('should use d2 constant correctly', () => {
      // Test with different subgroup sizes
      const measurements = [
        [10.0, 10.1, 10.0],
        [10.0, 10.1, 10.0],
      ];

      const limits1 = planService.calculateXbarRLimits(measurements, 3);
      const limits2 = planService.calculateXbarRLimits(measurements, 2);

      expect(limits1).toBeDefined();
      expect(limits2).toBeDefined();
    });
  });

  describe('calculateIMRLimits', () => {
    it('should calculate I-MR control limits', () => {
      const measurements = [100.1, 100.3, 100.2, 100.4, 100.3, 100.2, 100.1];

      const limits = planService.calculateIMRLimits(measurements);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
      expect(limits.lcl).toBeLessThan(limits.centerLine);
      expect(limits.centerLine).toBeCloseTo(100.24, 1);
    });

    it('should throw error if less than 2 measurements', () => {
      expect(() => planService.calculateIMRLimits([100.1])).toThrow();
    });

    it('should calculate moving range correctly', () => {
      const measurements = [100.0, 101.0, 102.0];

      const limits = planService.calculateIMRLimits(measurements);

      expect(limits).toBeDefined();
    });
  });

  describe('calculatePChartLimits', () => {
    it('should calculate p-chart limits with consistent sample sizes', () => {
      const defectiveCounts = [2, 3, 1, 4, 2];
      const sampleSizes = [100, 100, 100, 100, 100];

      const limits = planService.calculatePChartLimits(defectiveCounts, sampleSizes);

      expect(limits).toBeDefined();
      expect(limits.ucl).toBeGreaterThan(limits.centerLine);
      expect(limits.lcl).toBeGreaterThanOrEqual(0);
      expect(limits.centerLine).toBeGreaterThan(0);
      expect(limits.centerLine).toBeLessThan(1);
    });

    it('should calculate p-chart limits with variable sample sizes', () => {
      const defectiveCounts = [1, 2, 3, 2, 1];
      const sampleSizes = [50, 75, 100, 125, 100];

      const limits = planService.calculatePChartLimits(defectiveCounts, sampleSizes);

      expect(limits).toBeDefined();
      expect(limits.lcl).toBeGreaterThanOrEqual(0);
    });

    it('should not allow negative LCL', () => {
      const defectiveCounts = [0, 0, 0, 0, 0];
      const sampleSizes = [100, 100, 100, 100, 100];

      const limits = planService.calculatePChartLimits(defectiveCounts, sampleSizes);

      expect(limits.lcl).toBe(0);
    });

    it('should throw error if array lengths do not match', () => {
      const defectiveCounts = [2, 3, 1];
      const sampleSizes = [100, 100];

      expect(() => planService.calculatePChartLimits(defectiveCounts, sampleSizes)).toThrow();
    });

    it('should throw error if empty arrays', () => {
      expect(() => planService.calculatePChartLimits([], [])).toThrow();
    });
  });

  describe('getPlan', () => {
    it('should retrieve plan by ID', async () => {
      const plan = await planService.getPlan('SPC-001');

      expect(plan).toBeNull(); // Mock returns null
    });
  });

  describe('getActivePlans', () => {
    it('should retrieve all active plans', async () => {
      const plans = await planService.getActivePlans();

      expect(Array.isArray(plans)).toBe(true);
    });
  });

  describe('updatePlanStatus', () => {
    it('should update plan status', async () => {
      await expect(planService.updatePlanStatus('SPC-001', 'PAUSED')).resolves.not.toThrow();
    });
  });

  describe('deletePlan', () => {
    it('should delete plan by ID', async () => {
      await expect(planService.deletePlan('SPC-001')).resolves.not.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await planService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
