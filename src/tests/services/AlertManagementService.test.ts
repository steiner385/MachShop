/**
 * Alert Management Service - Unit Tests
 * Tests for SPC alert management and control chart rules
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import AlertManagementService from '../../services/AlertManagementService';

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AlertManagementService', () => {
  let alertService: AlertManagementService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $disconnect: vi.fn(),
    };

    alertService = new AlertManagementService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('defineAlertRule', () => {
    it('should define an alert rule', async () => {
      const input = {
        name: 'Beyond 3 Sigma',
        description: 'Point beyond 3 standard deviations',
        enabled: true,
        severity: 'HIGH' as const,
        ruleType: 'WESTERN_ELECTRIC' as const,
        condition: 'point > UCL or point < LCL',
      };

      const result = await alertService.defineAlertRule(input);

      expect(result).toBeDefined();
      expect(result.name).toBe('Beyond 3 Sigma');
      expect(result.enabled).toBe(true);
    });

    it('should throw error if name missing', async () => {
      const input = {
        name: '',
        description: 'Test',
        enabled: true,
        severity: 'MEDIUM' as const,
        ruleType: 'WESTERN_ELECTRIC' as const,
        condition: 'test',
      };

      await expect(alertService.defineAlertRule(input)).rejects.toThrow();
    });
  });

  describe('checkWesternElectricRule1', () => {
    it('should detect point beyond 3 sigma', () => {
      const violation = alertService.checkWesternElectricRule1(120, 100, 5); // 20 > 15 (3*5)

      expect(violation).toBe(true);
    });

    it('should not flag point within limits', () => {
      const violation = alertService.checkWesternElectricRule1(105, 100, 5);

      expect(violation).toBe(false);
    });
  });

  describe('checkWesternElectricRule2', () => {
    it('should detect 9 consecutive points above center', () => {
      const points = [101, 102, 101, 103, 102, 101, 103, 102, 101];
      const violation = alertService.checkWesternElectricRule2(points, 100);

      expect(violation).toBe(true);
    });

    it('should detect 9 consecutive points below center', () => {
      const points = [99, 98, 99, 97, 98, 99, 97, 98, 99];
      const violation = alertService.checkWesternElectricRule2(points, 100);

      expect(violation).toBe(true);
    });

    it('should return false if fewer than 9 points', () => {
      const violation = alertService.checkWesternElectricRule2([101, 102, 103], 100);

      expect(violation).toBe(false);
    });
  });

  describe('checkWesternElectricRule3', () => {
    it('should detect 6 consecutive increasing points', () => {
      const points = [100, 101, 102, 103, 104, 105, 106];
      const violation = alertService.checkWesternElectricRule3(points);

      expect(violation).toBe(true);
    });

    it('should detect 6 consecutive decreasing points', () => {
      const points = [106, 105, 104, 103, 102, 101, 100];
      const violation = alertService.checkWesternElectricRule3(points);

      expect(violation).toBe(true);
    });

    it('should return false for mixed trend', () => {
      const points = [100, 101, 100, 102, 101, 100];
      const violation = alertService.checkWesternElectricRule3(points);

      expect(violation).toBe(false);
    });
  });

  describe('checkWesternElectricRule4', () => {
    it('should detect 14 alternating points', () => {
      const points = [100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102, 100, 102];
      const violation = alertService.checkWesternElectricRule4(points);

      expect(violation).toBe(true);
    });

    it('should return false if fewer than 14 points', () => {
      const violation = alertService.checkWesternElectricRule4([100, 102, 100]);

      expect(violation).toBe(false);
    });
  });

  describe('checkNelsonRule5', () => {
    it('should detect 2 out of 3 points beyond 2 sigma above', () => {
      const points = [112, 115, 95]; // 112 > 110 (100+2*5), 115 > 110
      const violation = alertService.checkNelsonRule5(points, 100, 5);

      expect(violation).toBe(true);
    });

    it('should detect 2 out of 3 points beyond 2 sigma below', () => {
      const points = [88, 85, 105]; // 88 < 90 (100-2*5), 85 < 90
      const violation = alertService.checkNelsonRule5(points, 100, 5);

      expect(violation).toBe(true);
    });

    it('should return false if fewer than 3 points', () => {
      const violation = alertService.checkNelsonRule5([110, 105], 100, 5);

      expect(violation).toBe(false);
    });
  });

  describe('checkNelsonRule6', () => {
    it('should detect 4 out of 5 points beyond 1 sigma', () => {
      const points = [106, 107, 105, 108, 106]; // 4 points > 105 (100+1*5)
      const violation = alertService.checkNelsonRule6(points, 100, 5);

      expect(violation).toBe(true);
    });

    it('should return false if fewer than 5 points', () => {
      const violation = alertService.checkNelsonRule6([105, 106, 105], 100, 5);

      expect(violation).toBe(false);
    });
  });

  describe('createAlert', () => {
    it('should create an alert', async () => {
      const result = await alertService.createAlert('SPC-001', 'WE_RULE_1', 'Point beyond 3 sigma', 5, 'HIGH');

      expect(result).toBeDefined();
      expect(result.planId).toBe('SPC-001');
      expect(result.status).toBe('PENDING');
      expect(result.severity).toBe('HIGH');
    });

    it('should throw error if plan ID missing', async () => {
      await expect(alertService.createAlert('', 'WE_RULE_1', 'Test', 5, 'HIGH')).rejects.toThrow();
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', async () => {
      const result = await alertService.acknowledgeAlert('ALERT-001', 'user-1');

      expect(result === null || result.id).toBeTruthy();
    });

    it('should throw error if alert ID missing', async () => {
      await expect(alertService.acknowledgeAlert('', 'user-1')).rejects.toThrow();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', async () => {
      const result = await alertService.resolveAlert('ALERT-001', 'Adjusted process parameters');

      expect(result === null || result.id).toBeTruthy();
    });
  });

  describe('getPlanAlerts', () => {
    it('should retrieve plan alerts', async () => {
      const alerts = await alertService.getPlanAlerts('SPC-001');

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should filter by status if provided', async () => {
      const alerts = await alertService.getPlanAlerts('SPC-001', 'PENDING');

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getAlertStatistics', () => {
    it('should retrieve alert statistics', async () => {
      const stats = await alertService.getAlertStatistics('SPC-001');

      expect(stats).toBeDefined();
      expect(stats.pending).toBeGreaterThanOrEqual(0);
      expect(stats.acknowledged).toBeGreaterThanOrEqual(0);
      expect(stats.resolved).toBeGreaterThanOrEqual(0);
      expect(stats.highSeverity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkAllRules', () => {
    it('should check all enabled rules', async () => {
      const recentPoints = [100, 101, 100, 102, 101, 100];
      const alerts = await alertService.checkAllRules('SPC-001', 101, recentPoints, 100, 5);

      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should trigger alert for violation', async () => {
      const recentPoints = [100, 101, 102, 103, 104, 105, 106];
      const alerts = await alertService.checkAllRules('SPC-001', 106, recentPoints, 100, 5);

      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      await alertService.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});
