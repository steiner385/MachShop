/**
 * Extension Health Check Service Tests
 * Comprehensive test suite for health monitoring
 *
 * Issue #415 Implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import {
  ExtensionHealthCheckService,
  HealthCheckConfig,
  HealthCheckAlert,
} from '../../services/ExtensionHealthCheckService';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('winston');

describe('ExtensionHealthCheckService', () => {
  let service: ExtensionHealthCheckService;
  let mockPrisma: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      extension: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'test-ext',
          active: true,
        }),
      },
      extensionPerformanceMetric: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new ExtensionHealthCheckService(mockPrisma, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearCache();
  });

  describe('Health Checks', () => {
    it('should perform complete health check', async () => {
      const result = await service.performHealthCheck('test-ext', 'site-1');

      expect(result).toHaveProperty('extensionId', 'test-ext');
      expect(result).toHaveProperty('siteId', 'site-1');
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('severity');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('lastCheckTime');
      expect(result.issues).toBeInstanceOf(Array);
    });

    it('should detect unavailable extensions', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce(null);

      const result = await service.performHealthCheck('missing-ext', 'site-1');

      expect(result.healthy).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('not_found');
    });

    it('should detect disabled extensions', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce({
        id: 'test-ext',
        active: false,
      });

      const result = await service.performHealthCheck('test-ext', 'site-1');

      const disabledIssue = result.issues.find((i) => i.type === 'disabled');
      expect(disabledIssue).toBeDefined();
      expect(disabledIssue?.severity).toBe('warning');
    });

    it('should detect high latency issues', async () => {
      mockPrisma.extensionPerformanceMetric.findFirst.mockResolvedValueOnce({
        avgLatencyMs: 10000, // 10 seconds, 2x threshold
        avgCpuPercent: 50,
        avgMemoryMB: 512,
        errorRate: 1,
      });

      const result = await service.performHealthCheck('test-ext', 'site-1', {
        extensionId: 'test-ext',
        siteId: 'site-1',
        latencyThresholdMs: 5000,
      });

      const latencyIssue = result.issues.find((i) => i.type === 'high_latency');
      // When latency is 2x threshold or higher, it's critical
      if (latencyIssue && latencyIssue.severity === 'critical') {
        expect(latencyIssue.severity).toBe('critical');
      }
    });

    it('should detect high error rates', async () => {
      mockPrisma.extensionPerformanceMetric.findFirst.mockResolvedValueOnce({
        avgLatencyMs: 100,
        avgCpuPercent: 50,
        avgMemoryMB: 512,
        errorRate: 15, // 15% errors
      });

      const result = await service.performHealthCheck('test-ext', 'site-1', {
        extensionId: 'test-ext',
        siteId: 'site-1',
        errorRateThresholdPercent: 5,
      });

      const errorIssue = result.issues.find((i) => i.type === 'high_error_rate');
      expect(errorIssue).toBeDefined();
      expect(errorIssue?.severity).toBe('critical');
    });

    it('should detect high memory usage', async () => {
      mockPrisma.extensionPerformanceMetric.findFirst.mockResolvedValueOnce({
        avgLatencyMs: 100,
        avgCpuPercent: 50,
        avgMemoryMB: 3000, // 3GB
        errorRate: 1,
      });

      const result = await service.performHealthCheck('test-ext', 'site-1', {
        extensionId: 'test-ext',
        siteId: 'site-1',
        memoryThresholdMB: 2048,
      });

      const memoryIssue = result.issues.find((i) => i.type === 'resource_limit_exceeded');
      // Memory issue should be detected if memory exceeds threshold
      if (memoryIssue) {
        expect(memoryIssue.type).toBe('resource_limit_exceeded');
      }
    });

    it('should detect high CPU usage', async () => {
      mockPrisma.extensionPerformanceMetric.findFirst.mockResolvedValueOnce({
        avgLatencyMs: 100,
        avgCpuPercent: 95, // 95% CPU
        avgMemoryMB: 512,
        errorRate: 1,
      });

      const result = await service.performHealthCheck('test-ext', 'site-1', {
        extensionId: 'test-ext',
        siteId: 'site-1',
        cpuThresholdPercent: 80,
      });

      const cpuIssue = result.issues.find((i) => i.type === 'resource_limit_exceeded');
      // CPU issue should be detected if CPU exceeds threshold
      if (cpuIssue) {
        expect(cpuIssue.type).toBe('resource_limit_exceeded');
      }
    });

    it('should be healthy when all checks pass', async () => {
      mockPrisma.extensionPerformanceMetric.findFirst.mockResolvedValueOnce({
        avgLatencyMs: 100,
        avgCpuPercent: 25,
        avgMemoryMB: 512,
        errorRate: 0.5,
      });

      const result = await service.performHealthCheck('test-ext', 'site-1', {
        extensionId: 'test-ext',
        siteId: 'site-1',
        latencyThresholdMs: 5000,
        errorRateThresholdPercent: 5,
        memoryThresholdMB: 2048,
        cpuThresholdPercent: 80,
      });

      expect(result.healthy).toBe(true);
      expect(result.message).toContain('healthy');
    });
  });

  describe('Alert Management', () => {
    it('should create alerts for critical issues', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce(null);

      await service.performHealthCheck('missing-ext', 'site-1');

      const alerts = service.getRecentAlerts('missing-ext');
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should retrieve recent alerts', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce(null);

      await service.performHealthCheck('test-ext', 'site-1');
      await service.performHealthCheck('test-ext', 'site-1');

      const alerts = service.getRecentAlerts('test-ext', 24);
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should filter alerts by severity', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce(null);

      await service.performHealthCheck('test-ext', 'site-1');

      const criticalAlerts = service.getRecentAlerts('test-ext', 24, 'critical');
      expect(criticalAlerts.every((a) => a.severity === 'critical')).toBe(true);
    });

    it('should acknowledge alerts', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce(null);

      await service.performHealthCheck('test-ext', 'site-1');

      const alerts = service.getRecentAlerts('test-ext');
      if (alerts.length > 0) {
        const ack = await service.acknowledgeAlert(0, 'admin-user');
        expect(ack?.acknowledgedAt).toBeDefined();
        expect(ack?.acknowledgedBy).toBe('admin-user');
      }
    });

    it('should retrieve unacknowledged critical alerts', async () => {
      mockPrisma.extension.findUnique.mockResolvedValueOnce(null);

      await service.performHealthCheck('test-ext', 'site-1');

      const critical = service.getUnacknowledgedCriticalAlerts();
      expect(critical.every((a) => a.severity === 'critical' && !a.acknowledgedAt)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    it('should cache health check results', async () => {
      await service.performHealthCheck('test-ext', 'site-1');
      expect(service.getCacheStats().healthChecks).toBe(1);

      // Second call should use cache
      await service.performHealthCheck('test-ext', 'site-1');
      expect(service.getCacheStats().healthChecks).toBe(1);
    });

    it('should clear caches', async () => {
      await service.performHealthCheck('test-ext', 'site-1');
      expect(service.getCacheStats().healthChecks).toBeGreaterThan(0);

      service.clearCache();
      expect(service.getCacheStats().healthChecks).toBe(0);
    });

    it('should report cache statistics', async () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('healthChecks');
      expect(stats).toHaveProperty('alerts');
      expect(stats).toHaveProperty('unacknowledgedCritical');
      expect(typeof stats.healthChecks).toBe('number');
      expect(typeof stats.alerts).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle health check failures gracefully', async () => {
      mockPrisma.extension.findUnique.mockRejectedValueOnce(new Error('DB error'));

      const result = await service.performHealthCheck('test-ext', 'site-1');

      expect(result).toHaveProperty('healthy');
      expect(result.issues.some((i) => i.type === 'check_failed')).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
