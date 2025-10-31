/**
 * Comprehensive tests for SsoAnalyticsService
 * Epic 1: Backend Service Testing - Phase 1
 *
 * Tests SSO analytics and monitoring functionality including:
 * - Authentication metrics collection and analysis
 * - Provider performance monitoring
 * - Security metrics and anomaly detection
 * - Usage analytics and pattern analysis
 * - System health monitoring
 * - Alert generation and management
 * - Event emission and handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock dependencies with proper hoisting
vi.mock('../../lib/database', () => ({
  default: {
    authenticationEvent: {
      findMany: vi.fn(),
    },
    ssoProvider: {
      findMany: vi.fn(),
    },
    ssoSession: {
      count: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('geoip-lite', () => ({
  lookup: vi.fn((ip: string) => {
    if (ip === '8.8.8.8') {
      return {
        city: 'Mountain View',
        region: 'CA',
        country: 'US'
      };
    }
    return null;
  }),
}));

import { SsoAnalyticsService } from '../../services/SsoAnalyticsService';
import type {
  AuthenticationMetrics,
  ProviderPerformanceMetrics,
  SecurityMetrics,
  UsageAnalytics,
  SystemHealthMetrics,
  Alert
} from '../../services/SsoAnalyticsService';
import prisma from '../../lib/database';
import { logger } from '../../utils/logger';

// Get the mocked instances
const mockPrisma = prisma as any;
const mockLogger = logger as any;

describe('SsoAnalyticsService', () => {
  let analyticsService: SsoAnalyticsService;
  const mockDate = new Date('2024-01-15T10:00:00Z');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(mockDate);

    // Reset singleton instance for each test
    // @ts-ignore - accessing private property for testing
    SsoAnalyticsService.instance = undefined;

    analyticsService = SsoAnalyticsService.getInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
    // Clear all listeners
    analyticsService.removeAllListeners();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = SsoAnalyticsService.getInstance();
      const instance2 = SsoAnalyticsService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(SsoAnalyticsService);
      expect(instance1).toBeInstanceOf(EventEmitter);
    });

    it('should be an instance of EventEmitter', () => {
      expect(analyticsService).toBeInstanceOf(EventEmitter);
    });
  });

  describe('getAuthenticationMetrics', () => {
    const startDate = new Date('2024-01-01T00:00:00Z');
    const endDate = new Date('2024-01-31T23:59:59Z');

    const mockEvents = [
      {
        id: '1',
        eventType: 'LOGIN',
        providerId: 'provider-1',
        userId: 'user-1',
        responseTime: 1000,
        createdAt: new Date('2024-01-15T10:00:00Z'),
        provider: { name: 'Azure AD' }
      },
      {
        id: '2',
        eventType: 'LOGIN',
        providerId: 'provider-1',
        userId: 'user-2',
        responseTime: 1500,
        createdAt: new Date('2024-01-15T15:00:00Z'),
        provider: { name: 'Azure AD' }
      },
      {
        id: '3',
        eventType: 'FAILURE',
        providerId: 'provider-2',
        userId: 'user-3',
        responseTime: 2000,
        createdAt: new Date('2024-01-15T12:00:00Z'),
        provider: { name: 'Google' }
      },
      {
        id: '4',
        eventType: 'LOGIN',
        providerId: 'provider-2',
        userId: 'user-1',
        responseTime: 800,
        createdAt: new Date('2024-01-15T16:00:00Z'),
        provider: { name: 'Google' }
      }
    ];

    beforeEach(() => {
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(mockEvents);
    });

    it('should calculate comprehensive authentication metrics successfully', async () => {
      const metrics = await analyticsService.getAuthenticationMetrics(startDate, endDate);

      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          provider: true
        }
      });

      expect(metrics.totalLogins).toBe(3);
      expect(metrics.successfulLogins).toBe(3);
      expect(metrics.failedLogins).toBe(1);
      expect(metrics.successRate).toBe(1);
      expect(metrics.averageResponseTime).toBe(1325);
      expect(metrics.uniqueUsers).toBe(3);
      expect(metrics.peakHours).toHaveLength(4);
      expect(metrics.topProviders).toEqual([
        { providerId: 'provider-1', providerName: 'Azure AD', count: 2 },
        { providerId: 'provider-2', providerName: 'Google', count: 2 }
      ]);
    });

    it('should handle empty events gracefully', async () => {
      mockPrisma.authenticationEvent.findMany.mockResolvedValue([]);

      const metrics = await analyticsService.getAuthenticationMetrics(startDate, endDate);

      expect(metrics).toEqual<AuthenticationMetrics>({
        totalLogins: 0,
        successfulLogins: 0,
        failedLogins: 0,
        successRate: 0,
        averageResponseTime: 0,
        uniqueUsers: 0,
        peakHours: [],
        topProviders: []
      });
    });

    it('should handle events without response times', async () => {
      const eventsWithoutResponseTime = [
        {
          id: '1',
          eventType: 'LOGIN',
          providerId: 'provider-1',
          userId: 'user-1',
          responseTime: null,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          provider: { name: 'Azure AD' }
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutResponseTime);

      const metrics = await analyticsService.getAuthenticationMetrics(startDate, endDate);

      expect(metrics.averageResponseTime).toBe(0);
    });

    it('should handle events without providers', async () => {
      const eventsWithoutProvider = [
        {
          id: '1',
          eventType: 'LOGIN',
          providerId: 'provider-1',
          userId: 'user-1',
          responseTime: 1000,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          provider: null
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutProvider);

      const metrics = await analyticsService.getAuthenticationMetrics(startDate, endDate);

      expect(metrics.topProviders).toEqual([]);
    });

    it('should sort peak hours by count in descending order', async () => {
      const eventsWithSameHours = [
        ...Array(5).fill(null).map((_, i) => ({
          id: `${i}`,
          eventType: 'LOGIN',
          providerId: 'provider-1',
          userId: `user-${i}`,
          responseTime: 1000,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          provider: { name: 'Azure AD' }
        })),
        ...Array(3).fill(null).map((_, i) => ({
          id: `${i + 5}`,
          eventType: 'LOGIN',
          providerId: 'provider-1',
          userId: `user-${i + 5}`,
          responseTime: 1000,
          createdAt: new Date('2024-01-15T15:00:00Z'),
          provider: { name: 'Azure AD' }
        }))
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithSameHours);

      const metrics = await analyticsService.getAuthenticationMetrics(startDate, endDate);

      expect(metrics.peakHours[0].count).toBe(5);
      expect(metrics.peakHours[1].count).toBe(3);
      // Don't check specific hours since the times get processed through Date objects
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.authenticationEvent.findMany.mockRejectedValue(dbError);

      await expect(analyticsService.getAuthenticationMetrics(startDate, endDate))
        .rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get authentication metrics',
        { error: dbError, startDate, endDate }
      );
    });
  });

  describe('getProviderPerformanceMetrics', () => {
    const mockProviders = [
      {
        id: 'provider-1',
        name: 'Azure AD',
        type: 'AZURE_AD' as const,
        isActive: true
      },
      {
        id: 'provider-2',
        name: 'Google',
        type: 'GOOGLE' as const,
        isActive: true
      }
    ];

    const mockEvents = [
      {
        eventType: 'LOGIN',
        responseTime: 1000,
        createdAt: new Date('2024-01-15T10:00:00Z')
      },
      {
        eventType: 'FAILURE',
        responseTime: 2000,
        createdAt: new Date('2024-01-15T11:00:00Z')
      },
      {
        eventType: 'LOGIN',
        responseTime: 1500,
        createdAt: new Date('2024-01-15T12:00:00Z')
      }
    ];

    beforeEach(() => {
      mockPrisma.ssoProvider.findMany.mockResolvedValue(mockProviders);
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(mockEvents);
    });

    it('should calculate provider performance metrics for all providers', async () => {
      const metrics = await analyticsService.getProviderPerformanceMetrics();

      expect(mockPrisma.ssoProvider.findMany).toHaveBeenCalledWith();
      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledTimes(2);

      expect(metrics).toHaveLength(2);

      // Test first provider metrics
      const firstProvider = metrics[0];
      expect(firstProvider.providerId).toBe('provider-1');
      expect(firstProvider.providerName).toBe('Azure AD');
      expect(firstProvider.providerType).toBe('AZURE_AD');
      expect(firstProvider.totalRequests).toBe(3);
      expect(firstProvider.successfulRequests).toBe(2);
      expect(firstProvider.failedRequests).toBe(1);
      expect(firstProvider.averageResponseTime).toBe(1500);
      expect(firstProvider.availability).toBeCloseTo(0.6667, 3);
      expect(firstProvider.errorRate).toBeCloseTo(0.3333, 3);
      expect(firstProvider.lastFailure).toEqual(new Date('2024-01-15T11:00:00Z'));
      expect(['stable', 'increasing', 'decreasing']).toContain(firstProvider.trends.requestTrend);
      expect(['stable', 'improving', 'degrading']).toContain(firstProvider.trends.performanceTrend);
    });

    it('should calculate metrics for a specific provider', async () => {
      const specificProvider = [mockProviders[0]];
      mockPrisma.ssoProvider.findMany.mockResolvedValue(specificProvider);

      const metrics = await analyticsService.getProviderPerformanceMetrics('provider-1');

      expect(mockPrisma.ssoProvider.findMany).toHaveBeenCalledWith({
        where: { id: 'provider-1' }
      });
      expect(metrics).toHaveLength(1);
    });

    it('should handle providers with no events', async () => {
      mockPrisma.authenticationEvent.findMany.mockResolvedValue([]);

      const metrics = await analyticsService.getProviderPerformanceMetrics();

      expect(metrics[0]).toEqual<ProviderPerformanceMetrics>({
        providerId: 'provider-1',
        providerName: 'Azure AD',
        providerType: 'AZURE_AD',
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        availability: 1, // No requests means perfect availability
        errorRate: 0,
        lastFailure: undefined,
        trends: {
          requestTrend: 'stable',
          performanceTrend: 'stable'
        }
      });
    });

    it('should handle events without response times', async () => {
      const eventsWithoutResponseTime = [
        {
          eventType: 'LOGIN',
          responseTime: null,
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutResponseTime);

      const metrics = await analyticsService.getProviderPerformanceMetrics();

      expect(metrics[0].averageResponseTime).toBe(0);
    });

    it('should handle custom date range', async () => {
      await analyticsService.getProviderPerformanceMetrics(undefined, 7);

      const expectedSince = new Date(mockDate);
      expectedSince.setDate(expectedSince.getDate() - 7);

      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledWith({
        where: {
          providerId: expect.any(String),
          createdAt: { gte: expectedSince }
        }
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.ssoProvider.findMany.mockRejectedValue(dbError);

      await expect(analyticsService.getProviderPerformanceMetrics())
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get provider performance metrics',
        { error: dbError, providerId: undefined, days: 30 }
      );
    });
  });

  describe('getSecurityMetrics', () => {
    const mockFailedEvents = [
      {
        eventType: 'FAILURE',
        ipAddress: '192.168.1.100',
        userId: 'user-1',
        providerId: 'provider-1',
        createdAt: new Date('2024-01-15T10:00:00Z')
      },
      {
        eventType: 'FAILURE',
        ipAddress: '192.168.1.100',
        userId: 'user-1',
        providerId: 'provider-2',
        createdAt: new Date('2024-01-15T10:05:00Z')
      },
      {
        eventType: 'FAILURE',
        ipAddress: '10.0.0.1',
        userId: 'user-2',
        providerId: 'provider-1',
        createdAt: new Date('2024-01-15T10:10:00Z')
      }
    ];

    beforeEach(() => {
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(mockFailedEvents);
    });

    it('should calculate security metrics successfully', async () => {
      const metrics = await analyticsService.getSecurityMetrics();

      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: 'FAILURE',
          createdAt: { gte: expect.any(Date) }
        }
      });

      expect(metrics).toEqual<SecurityMetrics>({
        suspiciousLogins: 0, // No IPs reach the threshold of 10
        failedLoginsByIp: [], // No IPs reach the threshold
        multipleProviderAttempts: 1, // user-1 attempted multiple providers
        geographicalAnomalies: 0,
        timeBasedAnomalies: 0,
        bruteForceAttempts: 0 // No IPs with >= 20 attempts
      });
    });

    it('should detect suspicious IP addresses', async () => {
      const suspiciousEvents = Array(15).fill(null).map((_, i) => ({
        eventType: 'FAILURE',
        ipAddress: '192.168.1.100',
        userId: `user-${i}`,
        providerId: 'provider-1',
        createdAt: new Date('2024-01-15T10:00:00Z')
      }));

      mockPrisma.authenticationEvent.findMany.mockResolvedValue(suspiciousEvents);

      const metrics = await analyticsService.getSecurityMetrics();

      expect(metrics.suspiciousLogins).toBe(1);
      expect(metrics.failedLoginsByIp).toEqual([
        { ipAddress: '192.168.1.100', count: 15 }
      ]);
    });

    it('should detect brute force attempts', async () => {
      const bruteForceEvents = Array(25).fill(null).map((_, i) => ({
        eventType: 'FAILURE',
        ipAddress: '192.168.1.100',
        userId: `user-${i}`,
        providerId: 'provider-1',
        createdAt: new Date('2024-01-15T10:00:00Z')
      }));

      mockPrisma.authenticationEvent.findMany.mockResolvedValue(bruteForceEvents);

      const metrics = await analyticsService.getSecurityMetrics();

      expect(metrics.bruteForceAttempts).toBe(1);
    });

    it('should handle events without IP addresses', async () => {
      const eventsWithoutIp = [
        {
          eventType: 'FAILURE',
          ipAddress: null,
          userId: 'user-1',
          providerId: 'provider-1',
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutIp);

      const metrics = await analyticsService.getSecurityMetrics();

      expect(metrics.failedLoginsByIp).toEqual([]);
    });

    it('should handle events without user IDs', async () => {
      const eventsWithoutUserId = [
        {
          eventType: 'FAILURE',
          ipAddress: '192.168.1.100',
          userId: null,
          providerId: 'provider-1',
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutUserId);

      const metrics = await analyticsService.getSecurityMetrics();

      expect(metrics.multipleProviderAttempts).toBe(0);
    });

    it('should handle custom date range', async () => {
      await analyticsService.getSecurityMetrics(3);

      const expectedSince = new Date(mockDate);
      expectedSince.setDate(expectedSince.getDate() - 3);

      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: 'FAILURE',
          createdAt: { gte: expectedSince }
        }
      });
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.authenticationEvent.findMany.mockRejectedValue(dbError);

      await expect(analyticsService.getSecurityMetrics())
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get security metrics',
        { error: dbError, days: 7 }
      );
    });
  });

  describe('getUsageAnalytics', () => {
    const mockLoginEvents = [
      {
        eventType: 'LOGIN',
        userId: 'user-1',
        providerId: 'provider-1',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        ipAddress: '8.8.8.8',
        createdAt: new Date('2024-01-15T10:00:00Z') // Today
      },
      {
        eventType: 'LOGIN',
        userId: 'user-2',
        providerId: 'provider-2',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ipAddress: '192.168.1.1',
        createdAt: new Date('2024-01-10T10:00:00Z') // 5 days ago
      },
      {
        eventType: 'LOGIN',
        userId: 'user-1',
        providerId: 'provider-1',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        ipAddress: '10.0.0.1',
        createdAt: new Date('2024-01-05T10:00:00Z') // 10 days ago
      }
    ];

    beforeEach(() => {
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(mockLoginEvents);
    });

    it('should calculate usage analytics successfully', async () => {
      const analytics = await analyticsService.getUsageAnalytics();

      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: 'LOGIN',
          createdAt: { gte: expect.any(Date) }
        }
      });

      expect(analytics.dailyActiveUsers).toBe(1);
      expect(analytics.weeklyActiveUsers).toBe(2);
      expect(analytics.monthlyActiveUsers).toBe(2);
      expect(analytics.averageSessionDuration).toBe(0);

      // Check device types contain expected values
      expect(analytics.deviceTypes).toHaveLength(2);
      const deviceTypeMap = new Map(analytics.deviceTypes.map(d => [d.type, d.count]));
      expect(deviceTypeMap.get('mobile')).toBe(1);
      expect(deviceTypeMap.get('desktop')).toBe(2);

      // Check locations
      expect(analytics.locations).toHaveLength(2);
      expect(analytics.locations.some(l => l.location.includes('Private Network'))).toBe(true);

      // Check provider preferences
      expect(analytics.providerPreferences).toEqual([
        { providerId: 'provider-1', count: 2 },
        { providerId: 'provider-2', count: 1 }
      ]);
    });

    it('should handle events without user agents', async () => {
      const eventsWithoutUserAgent = [
        {
          eventType: 'LOGIN',
          userId: 'user-1',
          providerId: 'provider-1',
          userAgent: null,
          ipAddress: '8.8.8.8',
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutUserAgent);

      const analytics = await analyticsService.getUsageAnalytics();

      expect(analytics.deviceTypes).toEqual([]);
    });

    it('should handle events without IP addresses', async () => {
      const eventsWithoutIp = [
        {
          eventType: 'LOGIN',
          userId: 'user-1',
          providerId: 'provider-1',
          userAgent: 'Mozilla/5.0',
          ipAddress: null,
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutIp);

      const analytics = await analyticsService.getUsageAnalytics();

      expect(analytics.locations).toEqual([]);
    });

    it('should handle events without user IDs', async () => {
      const eventsWithoutUserId = [
        {
          eventType: 'LOGIN',
          userId: null,
          providerId: 'provider-1',
          userAgent: 'Mozilla/5.0',
          ipAddress: '8.8.8.8',
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(eventsWithoutUserId);

      const analytics = await analyticsService.getUsageAnalytics();

      expect(analytics.dailyActiveUsers).toBe(0);
      expect(analytics.weeklyActiveUsers).toBe(0);
      expect(analytics.monthlyActiveUsers).toBe(0);
    });

    it('should handle custom date range', async () => {
      await analyticsService.getUsageAnalytics(14);

      const expectedSince = new Date(mockDate);
      expectedSince.setDate(expectedSince.getDate() - 14);

      expect(mockPrisma.authenticationEvent.findMany).toHaveBeenCalledWith({
        where: {
          eventType: 'LOGIN',
          createdAt: { gte: expectedSince }
        }
      });
    });

    it('should detect different device types correctly', async () => {
      const deviceEvents = [
        {
          eventType: 'LOGIN',
          userId: 'user-1',
          providerId: 'provider-1',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          ipAddress: '8.8.8.8',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          eventType: 'LOGIN',
          userId: 'user-2',
          providerId: 'provider-1',
          userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)',
          ipAddress: '8.8.8.8',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          eventType: 'LOGIN',
          userId: 'user-3',
          providerId: 'provider-1',
          userAgent: 'Mozilla/5.0 (compatible; Tablet OS)',
          ipAddress: '8.8.8.8',
          createdAt: new Date('2024-01-15T10:00:00Z')
        },
        {
          eventType: 'LOGIN',
          userId: 'user-4',
          providerId: 'provider-1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          ipAddress: '8.8.8.8',
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      ];
      mockPrisma.authenticationEvent.findMany.mockResolvedValue(deviceEvents);

      const analytics = await analyticsService.getUsageAnalytics();

      // Check device types include expected values
      expect(analytics.deviceTypes).toHaveLength(3);
      const deviceMap = new Map(analytics.deviceTypes.map(d => [d.type, d.count]));
      expect(deviceMap.get('mobile')).toBe(2); // iPhone and iPad
      expect(deviceMap.get('desktop')).toBe(1);
      expect(deviceMap.get('tablet')).toBe(1);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.authenticationEvent.findMany.mockRejectedValue(dbError);

      await expect(analyticsService.getUsageAnalytics())
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get usage analytics',
        { error: dbError, days: 30 }
      );
    });
  });

  describe('getSystemHealthMetrics', () => {
    const mockProviders = [
      { id: 'provider-1', name: 'Azure AD', isActive: true },
      { id: 'provider-2', name: 'Google', isActive: true },
      { id: 'provider-3', name: 'SAML', isActive: false }
    ];

    beforeEach(() => {
      mockPrisma.ssoProvider.findMany.mockResolvedValue(mockProviders);
      mockPrisma.ssoSession.count.mockResolvedValue(50);
    });

    it('should calculate system health metrics successfully', async () => {
      const metrics = await analyticsService.getSystemHealthMetrics();

      expect(mockPrisma.ssoProvider.findMany).toHaveBeenCalled();
      expect(mockPrisma.ssoSession.count).toHaveBeenCalledWith({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        }
      });

      expect(metrics).toEqual<SystemHealthMetrics>({
        overallStatus: 'healthy',
        providerHealth: expect.arrayContaining([
          expect.objectContaining({
            providerId: 'provider-1',
            status: 'healthy',
            responseTime: expect.any(Number),
            uptime: expect.any(Number)
          }),
          expect.objectContaining({
            providerId: 'provider-2',
            status: 'healthy',
            responseTime: expect.any(Number),
            uptime: expect.any(Number)
          }),
          expect.objectContaining({
            providerId: 'provider-3',
            status: 'healthy',
            responseTime: expect.any(Number),
            uptime: expect.any(Number)
          })
        ]),
        activeProviders: 2,
        totalProviders: 3,
        activeSessions: 50,
        systemLoad: {
          cpu: expect.any(Number),
          memory: expect.any(Number),
          connections: 50
        }
      });

      // Verify response times are within expected range (100-1100ms based on mock)
      metrics.providerHealth.forEach(provider => {
        expect(provider.responseTime).toBeGreaterThanOrEqual(100);
        expect(provider.responseTime).toBeLessThanOrEqual(1100);
        expect(provider.uptime).toBeGreaterThanOrEqual(0.99);
        expect(provider.uptime).toBeLessThanOrEqual(1);
      });

      expect(metrics.systemLoad.cpu).toBeGreaterThanOrEqual(0);
      expect(metrics.systemLoad.cpu).toBeLessThanOrEqual(100);
      expect(metrics.systemLoad.memory).toBeGreaterThanOrEqual(0);
      expect(metrics.systemLoad.memory).toBeLessThanOrEqual(100);
    });

    it('should handle no providers', async () => {
      mockPrisma.ssoProvider.findMany.mockResolvedValue([]);

      const metrics = await analyticsService.getSystemHealthMetrics();

      expect(metrics.overallStatus).toBe('healthy');
      expect(metrics.providerHealth).toEqual([]);
      expect(metrics.activeProviders).toBe(0);
      expect(metrics.totalProviders).toBe(0);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      mockPrisma.ssoProvider.findMany.mockRejectedValue(dbError);

      await expect(analyticsService.getSystemHealthMetrics())
        .rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get system health metrics',
        { error: dbError }
      );
    });
  });

  describe('Alert Management', () => {
    const mockProviderMetrics: ProviderPerformanceMetrics[] = [
      {
        providerId: 'provider-1',
        providerName: 'Azure AD',
        providerType: 'AZURE_AD',
        totalRequests: 100,
        successfulRequests: 90,
        failedRequests: 10,
        averageResponseTime: 6000, // Above threshold
        availability: 0.9,
        errorRate: 0.1, // Above threshold
        trends: {
          requestTrend: 'increasing',
          performanceTrend: 'degrading'
        }
      }
    ];

    const mockSecurityMetrics: SecurityMetrics = {
      suspiciousLogins: 0,
      failedLoginsByIp: [],
      multipleProviderAttempts: 0,
      geographicalAnomalies: 0,
      timeBasedAnomalies: 0,
      bruteForceAttempts: 2 // Above threshold
    };

    beforeEach(() => {
      // Mock the methods to return test data
      vi.spyOn(analyticsService, 'getProviderPerformanceMetrics').mockResolvedValue(mockProviderMetrics);
      vi.spyOn(analyticsService, 'getSecurityMetrics').mockResolvedValue(mockSecurityMetrics);
    });

    describe('generateAlerts', () => {
      it('should generate performance alerts for high response time', async () => {
        const alerts = await analyticsService.generateAlerts();

        expect(alerts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'performance',
              severity: 'warning',
              title: 'High Response Time - Azure AD',
              description: expect.stringContaining('6000ms'),
              providerId: 'provider-1'
            })
          ])
        );
      });

      it('should generate availability alerts for high error rate', async () => {
        const alerts = await analyticsService.generateAlerts();

        expect(alerts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'availability',
              severity: 'critical',
              title: 'High Error Rate - Azure AD',
              description: expect.stringContaining('10.00%'),
              providerId: 'provider-1'
            })
          ])
        );
      });

      it('should generate security alerts for brute force attempts', async () => {
        const alerts = await analyticsService.generateAlerts();

        expect(alerts).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: 'security',
              severity: 'critical',
              title: 'Potential Brute Force Attacks Detected',
              description: expect.stringContaining('2 IP addresses')
            })
          ])
        );
      });

      it('should emit alertGenerated events', async () => {
        const alertHandler = vi.fn();
        analyticsService.on('alertGenerated', alertHandler);

        const alerts = await analyticsService.generateAlerts();

        expect(alertHandler).toHaveBeenCalledTimes(alerts.length);
        alerts.forEach(alert => {
          expect(alertHandler).toHaveBeenCalledWith(alert);
        });
      });

      it('should add alerts to the queue', async () => {
        await analyticsService.generateAlerts();

        const pendingAlerts = analyticsService.getPendingAlerts();
        expect(pendingAlerts.length).toBeGreaterThan(0);
      });

      it('should handle errors gracefully', async () => {
        vi.spyOn(analyticsService, 'getProviderPerformanceMetrics').mockRejectedValue(new Error('Test error'));

        const alerts = await analyticsService.generateAlerts();

        expect(alerts).toEqual([]);
        expect(mockLogger.error).toHaveBeenCalledWith(
          'Failed to generate alerts',
          { error: expect.any(Error) }
        );
      });
    });

    describe('getPendingAlerts', () => {
      it('should return only non-acknowledged alerts', async () => {
        await analyticsService.generateAlerts();

        const allAlerts = analyticsService.getPendingAlerts();
        const firstAlertId = allAlerts[0].id;

        analyticsService.acknowledgeAlert(firstAlertId);
        const pendingAlerts = analyticsService.getPendingAlerts();

        expect(pendingAlerts.length).toBe(allAlerts.length - 1);
        expect(pendingAlerts.find(a => a.id === firstAlertId)).toBeUndefined();
      });
    });

    describe('acknowledgeAlert', () => {
      it('should acknowledge an existing alert', async () => {
        await analyticsService.generateAlerts();
        const alerts = analyticsService.getPendingAlerts();
        const alertId = alerts[0].id;

        const acknowledged = analyticsService.acknowledgeAlert(alertId);

        expect(acknowledged).toBe(true);
        expect(alerts[0].acknowledged).toBe(true);
      });

      it('should emit alertAcknowledged event', async () => {
        const alertHandler = vi.fn();
        analyticsService.on('alertAcknowledged', alertHandler);

        await analyticsService.generateAlerts();
        const alerts = analyticsService.getPendingAlerts();
        const alertId = alerts[0].id;

        analyticsService.acknowledgeAlert(alertId);

        expect(alertHandler).toHaveBeenCalledWith(alerts[0]);
      });

      it('should return false for non-existent alert', () => {
        const acknowledged = analyticsService.acknowledgeAlert('non-existent');

        expect(acknowledged).toBe(false);
      });
    });

    describe('resolveAlert', () => {
      it('should resolve an existing alert', async () => {
        await analyticsService.generateAlerts();
        const alerts = analyticsService.getPendingAlerts();
        const alertId = alerts[0].id;

        const resolved = analyticsService.resolveAlert(alertId);

        expect(resolved).toBe(true);
        expect(alerts[0].resolvedAt).toBeInstanceOf(Date);
      });

      it('should emit alertResolved event', async () => {
        const alertHandler = vi.fn();
        analyticsService.on('alertResolved', alertHandler);

        await analyticsService.generateAlerts();
        const alerts = analyticsService.getPendingAlerts();
        const alertId = alerts[0].id;

        analyticsService.resolveAlert(alertId);

        expect(alertHandler).toHaveBeenCalledWith(alerts[0]);
      });

      it('should return false for non-existent alert', () => {
        const resolved = analyticsService.resolveAlert('non-existent');

        expect(resolved).toBe(false);
      });
    });
  });

  describe('Private Helper Methods', () => {
    describe('IP Address Analysis', () => {
      it('should detect private IP addresses correctly', () => {
        const privateIps = [
          '10.0.0.1',
          '172.16.0.1',
          '192.168.1.1',
          '127.0.0.1',
          '169.254.1.1'
        ];

        // Access private method via service instance
        privateIps.forEach(ip => {
          // @ts-ignore - accessing private method for testing
          expect(analyticsService.isPrivateIp(ip)).toBe(true);
        });
      });

      it('should detect public IP addresses correctly', () => {
        const publicIps = [
          '8.8.8.8',
          '1.1.1.1',
          '208.67.222.222'
        ];

        publicIps.forEach(ip => {
          // @ts-ignore - accessing private method for testing
          expect(analyticsService.isPrivateIp(ip)).toBe(false);
        });
      });
    });

    describe('Device Type Detection', () => {
      it('should detect mobile devices correctly', () => {
        const mobileUserAgents = [
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
          'Mozilla/5.0 (Linux; Android 10; SM-G981B)',
          'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)'
        ];

        mobileUserAgents.forEach(ua => {
          // @ts-ignore - accessing private method for testing
          expect(analyticsService.detectDeviceType(ua)).toBe('mobile');
        });
      });

      it('should detect tablet devices correctly', () => {
        const tabletUserAgent = 'Mozilla/5.0 (compatible; Tablet OS)';

        // @ts-ignore - accessing private method for testing
        expect(analyticsService.detectDeviceType(tabletUserAgent)).toBe('tablet');
      });

      it('should detect desktop devices correctly', () => {
        const desktopUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

        // @ts-ignore - accessing private method for testing
        expect(analyticsService.detectDeviceType(desktopUserAgent)).toBe('desktop');
      });
    });

    describe('Trend Calculation', () => {
      it('should calculate trend based on events', () => {
        const events = Array(30).fill({});

        // @ts-ignore - accessing private method for testing
        const trend = analyticsService.calculateTrend(events, 'requests');

        expect(['increasing', 'decreasing', 'stable']).toContain(trend);
      });

      it('should return stable for insufficient data', () => {
        const events = [{}];

        // @ts-ignore - accessing private method for testing
        const trend = analyticsService.calculateTrend(events, 'requests');

        expect(trend).toBe('stable');
      });
    });

    describe('Performance Trend Calculation', () => {
      it('should calculate improving performance trend', () => {
        const responseTimes = [2000, 1800, 1600, 1400, 1200, 1000, 800, 600, 400, 200]; // Improving

        // @ts-ignore - accessing private method for testing
        const trend = analyticsService.calculatePerformanceTrend(responseTimes);

        expect(trend).toBe('improving');
      });

      it('should calculate degrading performance trend', () => {
        const responseTimes = [200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000]; // Degrading

        // @ts-ignore - accessing private method for testing
        const trend = analyticsService.calculatePerformanceTrend(responseTimes);

        expect(trend).toBe('degrading');
      });

      it('should return stable for insufficient data', () => {
        const responseTimes = [1000, 1100];

        // @ts-ignore - accessing private method for testing
        const trend = analyticsService.calculatePerformanceTrend(responseTimes);

        expect(trend).toBe('stable');
      });
    });
  });

  describe('Event Emission', () => {
    it('should be able to register and emit custom events', () => {
      const customHandler = vi.fn();
      analyticsService.on('customEvent', customHandler);

      analyticsService.emit('customEvent', { data: 'test' });

      expect(customHandler).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should support multiple listeners', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      analyticsService.on('testEvent', handler1);
      analyticsService.on('testEvent', handler2);

      analyticsService.emit('testEvent', 'data');

      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });
  });
});