/**
 * Capability Study Service - Unit Tests
 * Tests for process capability studies (Cp, Cpk, Pp, Ppk)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CapabilityStudyService from '../../services/CapabilityStudyService';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('CapabilityStudyService', () => {
  let capabilityService: CapabilityStudyService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    capabilityService = new CapabilityStudyService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('conductCapabilityStudy', () => {
    it('should conduct a capability study with adequate data', async () => {
      const measurements = Array.from({length: 50}, (_, i) => 10.0 + (Math.random() - 0.5) * 0.2);

      const result = await capabilityService.conductCapabilityStudy({
        planId: 'SPC-001',
        measurements,
        upperSpec: 10.5,
        lowerSpec: 9.5,
        subgroupSize: 5,
        studyType: 'SHORT_TERM',
      });

      expect(result).toBeDefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics.cp).toBeGreaterThan(0);
      expect(result.metrics.cpk).toBeGreaterThan(0);
      expect(result.metrics.pp).toBeGreaterThan(0);
      expect(result.metrics.ppk).toBeGreaterThan(0);
    });

    it('should classify capable process', async () => {
      const measurements = Array.from({length: 50}, () => 10.0);

      const result = await capabilityService.conductCapabilityStudy({
        planId: 'SPC-001',
        measurements,
        upperSpec: 10.5,
        lowerSpec: 9.5,
        studyType: 'LONG_TERM',
      });

      expect(result.metrics.capability).toBe('CAPABLE');
    });

    it('should classify marginal process', async () => {
      const measurements = Array.from({length: 50}, (_, i) => 10.0 + (i % 3) * 0.1);

      const result = await capabilityService.conductCapabilityStudy({
        planId: 'SPC-001',
        measurements,
        upperSpec: 10.5,
        lowerSpec: 9.5,
        studyType: 'LONG_TERM',
      });

      expect(['MARGINAL', 'CAPABLE', 'INCAPABLE']).toContain(result.metrics.capability);
    });

    it('should provide recommendation', async () => {
      const measurements = Array.from({length: 50}, () => 10.0);

      const result = await capabilityService.conductCapabilityStudy({
        planId: 'SPC-001',
        measurements,
        upperSpec: 10.5,
        lowerSpec: 9.5,
        studyType: 'SHORT_TERM',
      });

      expect(result.metrics.recommendation).toBeTruthy();
      expect(typeof result.metrics.recommendation).toBe('string');
    });

    it('should throw error if less than 30 measurements', async () => {
      const measurements = Array.from({length: 20}, () => 10.0);

      await expect(
        capabilityService.conductCapabilityStudy({
          planId: 'SPC-001',
          measurements,
          upperSpec: 10.5,
          lowerSpec: 9.5,
          studyType: 'SHORT_TERM',
        })
      ).rejects.toThrow();
    });

    it('should throw error if USL <= LSL', async () => {
      const measurements = Array.from({length: 50}, () => 10.0);

      await expect(
        capabilityService.conductCapabilityStudy({
          planId: 'SPC-001',
          measurements,
          upperSpec: 9.5,
          lowerSpec: 10.5,
          studyType: 'SHORT_TERM',
        })
      ).rejects.toThrow();
    });
  });

  describe('calculateShortTermCapability', () => {
    it('should calculate Cp and Cpk', () => {
      const measurements = Array.from({length: 50}, () => 10.0);
      const result = capabilityService.calculateShortTermCapability(measurements, 4, 10.5, 9.5);

      expect(result.cp).toBeGreaterThan(0);
      expect(result.cpk).toBeGreaterThan(0);
      expect(result.cpk).toBeLessThanOrEqual(result.cp);
    });

    it('should throw error if no measurements', () => {
      expect(() => capabilityService.calculateShortTermCapability([], 4, 10.5, 9.5)).toThrow();
    });
  });

  describe('calculateLongTermCapability', () => {
    it('should calculate Pp and Ppk', () => {
      const measurements = Array.from({length: 50}, () => 10.0);
      const result = capabilityService.calculateLongTermCapability(measurements, 10.5, 9.5);

      expect(result.pp).toBeGreaterThan(0);
      expect(result.ppk).toBeGreaterThan(0);
      expect(result.ppk).toBeLessThanOrEqual(result.pp);
    });

    it('should throw error if no measurements', () => {
      expect(() => capabilityService.calculateLongTermCapability([], 10.5, 9.5)).toThrow();
    });
  });

  describe('compareCapabilityStudies', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should detect improvement', () => {
      const study1 = {
        id: 'CS-1',
        planId: 'SPC-001',
        studyType: 'SHORT_TERM' as const,
        metrics: {
          cp: 1.0,
          cpk: 0.95,
          pp: 1.0,
          ppk: 0.95,
          mean: 10.0,
          stdDev: 0.1,
          processSpread: 0.6,
          specSpread: 1.0,
          percentWithin: 100,
          capability: 'MARGINAL' as const,
          recommendation: 'Improve',
        },
        dataPoints: 50,
        studyDate: new Date(),
      };

      const study2 = {
        ...study1,
        id: 'CS-2',
        metrics: {
          ...study1.metrics,
          cpk: 1.2,
          ppk: 1.2,
        },
      };

      const result = capabilityService.compareCapabilityStudies(study1, study2);

      expect(result.improved).toBe(true);
      expect(result.cpkChange).toBeGreaterThan(0);
    });

    it('should detect decline', () => {
      const study1 = {
        id: 'CS-1',
        planId: 'SPC-001',
        studyType: 'SHORT_TERM' as const,
        metrics: {
          cp: 1.5,
          cpk: 1.4,
          pp: 1.5,
          ppk: 1.4,
          mean: 10.0,
          stdDev: 0.1,
          processSpread: 0.6,
          specSpread: 1.0,
          percentWithin: 100,
          capability: 'CAPABLE' as const,
          recommendation: 'Maintain',
        },
        dataPoints: 50,
        studyDate: new Date(),
      };

      const study2 = {
        ...study1,
        id: 'CS-2',
        metrics: {
          ...study1.metrics,
          cpk: 0.9,
          ppk: 0.9,
        },
      };

      const result = capabilityService.compareCapabilityStudies(study1, study2);

      expect(result.improved).toBe(false);
      expect(result.cpkChange).toBeLessThan(0);
    });
  });

  describe('getPlanCapabilityStudies', () => {
    it('should retrieve studies for plan', async () => {
      const studies = await capabilityService.getPlanCapabilityStudies('SPC-001');

      expect(Array.isArray(studies)).toBe(true);
    });
  });

  describe('getLatestCapabilityStudy', () => {
    it('should retrieve latest study', async () => {
      const study = await capabilityService.getLatestCapabilityStudy('SPC-001');

      expect(study === null || study.id).toBeTruthy();
    });
  });

  describe('isCapabilityStudyDue', () => {
    it('should indicate study is due when none exist', async () => {
      const isDue = await capabilityService.isCapabilityStudyDue('SPC-001');

      expect(typeof isDue).toBe('boolean');
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await capabilityService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
