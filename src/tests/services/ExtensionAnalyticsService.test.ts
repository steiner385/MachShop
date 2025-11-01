/**
 * Extension Analytics Service Tests
 * Comprehensive test suite for analytics and monitoring
 *
 * Issue #415 Implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import {
  ExtensionAnalyticsService,
  ExtensionEventType,
  ExtensionUsageEvent,
  ExtensionPerformanceMetric,
  ExtensionUsageAnalytics,
} from '../../services/ExtensionAnalyticsService';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('winston');

describe('ExtensionAnalyticsService', () => {
  let service: ExtensionAnalyticsService;
  let mockPrisma: any;
  let mockLogger: any;

  beforeEach(() => {
    mockPrisma = {
      extensionUsageEvent: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
      extensionPerformanceMetric: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    service = new ExtensionAnalyticsService(mockPrisma, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.clearCache();
  });

  describe('Usage Event Recording', () => {
    it('should record activation events', async () => {
      const event: ExtensionUsageEvent = {
        extensionId: 'test-ext',
        extensionVersion: '1.0.0',
        siteId: 'site-1',
        eventType: ExtensionEventType.ACTIVATION,
        userId: 'user-1',
        timestamp: new Date(),
      };

      await service.recordUsageEvent(event);

      expect(mockPrisma.extensionUsageEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          extensionId: 'test-ext',
          eventType: ExtensionEventType.ACTIVATION,
        }),
      });
    });

    it('should record feature usage events', async () => {
      const event: ExtensionUsageEvent = {
        extensionId: 'test-ext',
        extensionVersion: '1.0.0',
        siteId: 'site-1',
        eventType: ExtensionEventType.FEATURE_USED,
        userId: 'user-1',
        featureName: 'dashboard-view',
        timestamp: new Date(),
      };

      await service.recordUsageEvent(event);

      expect(mockPrisma.extensionUsageEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          featureName: 'dashboard-view',
          eventType: ExtensionEventType.FEATURE_USED,
        }),
      });
    });

    it('should record error events with metadata', async () => {
      const event: ExtensionUsageEvent = {
        extensionId: 'test-ext',
        extensionVersion: '1.0.0',
        siteId: 'site-1',
        eventType: ExtensionEventType.ERROR_OCCURRED,
        userId: 'user-1',
        metadata: {
          errorCode: 'TIMEOUT',
          errorMessage: 'Request timeout after 5000ms',
          stackTrace: 'at processRequest...',
        },
        timestamp: new Date(),
      };

      await service.recordUsageEvent(event);

      expect(mockPrisma.extensionUsageEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: ExtensionEventType.ERROR_OCCURRED,
          metadata: expect.objectContaining({
            errorCode: 'TIMEOUT',
          }),
        }),
      });
    });

    it('should handle recording failures gracefully', async () => {
      mockPrisma.extensionUsageEvent.create.mockRejectedValueOnce(new Error('DB error'));

      const event: ExtensionUsageEvent = {
        extensionId: 'test-ext',
        extensionVersion: '1.0.0',
        siteId: 'site-1',
        eventType: ExtensionEventType.ACTIVATION,
        timestamp: new Date(),
      };

      // Should not throw
      await expect(service.recordUsageEvent(event)).resolves.toBeUndefined();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Performance Metrics Recording', () => {
    it('should record performance metrics', async () => {
      const metric: ExtensionPerformanceMetric = {
        extensionId: 'test-ext',
        siteId: 'site-1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-02'),
        avgLatencyMs: 150,
        p50LatencyMs: 100,
        p95LatencyMs: 500,
        p99LatencyMs: 1000,
        maxLatencyMs: 2000,
        requestsPerSecond: 100,
        totalRequests: 8640000,
        errorRate: 0.5,
        totalErrors: 43200,
        errorTypes: { timeout: 20000, network: 15000, validation: 8200 },
        avgMemoryMB: 512,
        peakMemoryMB: 1024,
        avgCpuPercent: 25,
        peakCpuPercent: 75,
        apiCallCount: 50000,
        uptime: 99.9,
      };

      await service.recordPerformanceMetrics(metric);

      expect(mockPrisma.extensionPerformanceMetric.create).toHaveBeenCalled();
      expect(service.getCacheStats().metricsCache).toBe(1);
    });

    it('should use cached metrics when available', async () => {
      const metric: ExtensionPerformanceMetric = {
        extensionId: 'test-ext',
        siteId: 'site-1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-02'),
        avgLatencyMs: 150,
        p50LatencyMs: 100,
        p95LatencyMs: 500,
        p99LatencyMs: 1000,
        maxLatencyMs: 2000,
        requestsPerSecond: 100,
        totalRequests: 8640000,
        errorRate: 0.5,
        totalErrors: 43200,
        errorTypes: {},
        avgMemoryMB: 512,
        peakMemoryMB: 1024,
        avgCpuPercent: 25,
        peakCpuPercent: 75,
        apiCallCount: 50000,
        uptime: 99.9,
      };

      await service.recordPerformanceMetrics(metric);
      const retrieved = await service.getPerformanceMetrics('test-ext', 'site-1');

      expect(retrieved).toEqual(metric);
      // Second call should use cache
      const retrieved2 = await service.getPerformanceMetrics('test-ext', 'site-1');
      expect(retrieved2).toEqual(metric);
    });
  });

  describe('Usage Analytics', () => {
    it('should calculate usage analytics from events', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      const weekAgo = new Date(now.getTime() - 7 * 86400000);

      const mockEvents = [
        {
          extensionId: 'test-ext',
          userId: 'user-1',
          eventType: ExtensionEventType.ACTIVATION,
          timestamp: weekAgo,
        },
        {
          extensionId: 'test-ext',
          userId: 'user-1',
          eventType: ExtensionEventType.FEATURE_USED,
          featureName: 'dashboard',
          timestamp: yesterday,
        },
        {
          extensionId: 'test-ext',
          userId: 'user-2',
          eventType: ExtensionEventType.FEATURE_USED,
          featureName: 'reports',
          timestamp: now,
        },
      ];

      mockPrisma.extensionUsageEvent.findMany.mockResolvedValueOnce(mockEvents);

      const analytics = await service.getUsageAnalytics('test-ext', 'site-1', 30);

      expect(analytics.extensionId).toBe('test-ext');
      expect(analytics.isDeployed).toBe(true);
      expect(analytics.activeUsers).toBeGreaterThan(0);
      expect(analytics.featuresUsed).toContain('dashboard');
      expect(analytics.featuresUsed).toContain('reports');
    });

    it('should track adoption trends', async () => {
      const now = new Date();
      const periodDays = 30;

      const mockEvents = [
        // First half - low usage
        {
          userId: 'user-1',
          eventType: ExtensionEventType.FEATURE_USED,
          timestamp: new Date(now.getTime() - 25 * 86400000),
        },
        // Second half - high usage
        {
          userId: 'user-1',
          eventType: ExtensionEventType.FEATURE_USED,
          timestamp: new Date(now.getTime() - 5 * 86400000),
        },
        {
          userId: 'user-2',
          eventType: ExtensionEventType.FEATURE_USED,
          timestamp: new Date(now.getTime() - 4 * 86400000),
        },
        {
          userId: 'user-3',
          eventType: ExtensionEventType.FEATURE_USED,
          timestamp: new Date(now.getTime() - 3 * 86400000),
        },
      ];

      mockPrisma.extensionUsageEvent.findMany.mockResolvedValueOnce(mockEvents);

      const analytics = await service.getUsageAnalytics('test-ext', 'site-1', periodDays);

      expect(analytics.adoptionTrend).toBe('increasing');
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect latency anomalies', async () => {
      const baselineMetric: ExtensionPerformanceMetric = {
        extensionId: 'test-ext',
        siteId: 'site-1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-02'),
        avgLatencyMs: 100,
        p50LatencyMs: 100,
        p95LatencyMs: 500,
        p99LatencyMs: 1000,
        maxLatencyMs: 2000,
        requestsPerSecond: 100,
        totalRequests: 8640000,
        errorRate: 0.5,
        totalErrors: 43200,
        errorTypes: {},
        avgMemoryMB: 512,
        peakMemoryMB: 1024,
        avgCpuPercent: 25,
        peakCpuPercent: 75,
        apiCallCount: 50000,
        uptime: 99.9,
      };

      mockPrisma.extensionPerformanceMetric.findMany.mockResolvedValueOnce([baselineMetric]);

      const anomalyMetric: ExtensionPerformanceMetric = {
        ...baselineMetric,
        periodStart: new Date('2024-01-02'),
        periodEnd: new Date('2024-01-03'),
        avgLatencyMs: 500, // 5x increase
      };

      await service.recordPerformanceMetrics(anomalyMetric);

      const anomalies = service.getRecentAnomalies('test-ext');
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].anomalyType).toBe('latency');
    });

    it('should detect error rate anomalies', async () => {
      const baselineMetric: ExtensionPerformanceMetric = {
        extensionId: 'test-ext',
        siteId: 'site-1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-02'),
        avgLatencyMs: 100,
        p50LatencyMs: 100,
        p95LatencyMs: 500,
        p99LatencyMs: 1000,
        maxLatencyMs: 2000,
        requestsPerSecond: 100,
        totalRequests: 8640000,
        errorRate: 1,
        totalErrors: 86400,
        errorTypes: {},
        avgMemoryMB: 512,
        peakMemoryMB: 1024,
        avgCpuPercent: 25,
        peakCpuPercent: 75,
        apiCallCount: 50000,
        uptime: 99.9,
      };

      mockPrisma.extensionPerformanceMetric.findMany.mockResolvedValueOnce([baselineMetric]);

      const anomalyMetric: ExtensionPerformanceMetric = {
        ...baselineMetric,
        periodStart: new Date('2024-01-02'),
        periodEnd: new Date('2024-01-03'),
        errorRate: 5, // 5x increase
      };

      await service.recordPerformanceMetrics(anomalyMetric);

      const anomalies = service.getRecentAnomalies('test-ext');
      const errorAnomaly = anomalies.find((a) => a.anomalyType === 'error_rate');
      expect(errorAnomaly).toBeDefined();
      expect(errorAnomaly?.anomalySeverity).toBe('critical');
    });
  });

  describe('Cache Management', () => {
    it('should clear caches', async () => {
      const metric: ExtensionPerformanceMetric = {
        extensionId: 'test-ext',
        siteId: 'site-1',
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-01-02'),
        avgLatencyMs: 150,
        p50LatencyMs: 100,
        p95LatencyMs: 500,
        p99LatencyMs: 1000,
        maxLatencyMs: 2000,
        requestsPerSecond: 100,
        totalRequests: 8640000,
        errorRate: 0.5,
        totalErrors: 43200,
        errorTypes: {},
        avgMemoryMB: 512,
        peakMemoryMB: 1024,
        avgCpuPercent: 25,
        peakCpuPercent: 75,
        apiCallCount: 50000,
        uptime: 99.9,
      };

      await service.recordPerformanceMetrics(metric);
      expect(service.getCacheStats().metricsCache).toBe(1);

      service.clearCache();
      expect(service.getCacheStats().metricsCache).toBe(0);
    });

    it('should report cache statistics', async () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('metricsCache');
      expect(stats).toHaveProperty('healthCache');
      expect(stats).toHaveProperty('anomalies');
      expect(typeof stats.metricsCache).toBe('number');
    });
  });
});
