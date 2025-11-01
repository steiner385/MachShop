/**
 * Extension Analytics Service
 * Comprehensive analytics and monitoring for extensions tracking usage metrics,
 * performance characteristics, adoption, health, and providing insights into
 * extension ecosystem health.
 *
 * Issue #415 Implementation
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

/**
 * Extension Usage Event Types
 */
export enum ExtensionEventType {
  ACTIVATION = 'activation',
  DEACTIVATION = 'deactivation',
  FEATURE_USED = 'feature_used',
  ERROR_OCCURRED = 'error_occurred',
  PERFORMANCE_ALERT = 'performance_alert',
  RESOURCE_ALERT = 'resource_alert',
  HEALTH_CHECK = 'health_check',
  INTEGRATION_FAILED = 'integration_failed',
  LICENSE_EXPIRY = 'license_expiry',
  USER_FEEDBACK = 'user_feedback',
}

/**
 * Extension Usage Event
 * Tracks individual usage events for analytics
 */
export interface ExtensionUsageEvent {
  extensionId: string;
  extensionVersion: string;
  siteId: string;
  eventType: ExtensionEventType;
  userId?: string;
  userRole?: string;
  featureName?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Performance Metric
 * Aggregated performance data per extension
 */
export interface ExtensionPerformanceMetric {
  extensionId: string;
  siteId: string;
  periodStart: Date;
  periodEnd: Date;

  // Latency metrics
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;

  // Throughput metrics
  requestsPerSecond: number;
  totalRequests: number;

  // Error metrics
  errorRate: number; // percentage
  totalErrors: number;
  errorTypes: Record<string, number>;

  // Resource metrics
  avgMemoryMB: number;
  peakMemoryMB: number;
  avgCpuPercent: number;
  peakCpuPercent: number;
  apiCallCount: number;

  // Health
  uptime: number; // percentage
}

/**
 * Health Check Result
 * Result of a health check for an extension
 */
export interface ExtensionHealthCheck {
  extensionId: string;
  siteId: string;

  // Overall status
  healthy: boolean;
  severity: 'critical' | 'warning' | 'info';
  message: string;

  // Component health
  availability: number; // percentage
  dependencyHealth: boolean;
  licenseValid: boolean;
  configValid: boolean;
  integrationHealthy: boolean;
  resourcesWithinLimits: boolean;

  // Details
  lastCheckTime: Date;
  nextCheckTime?: Date;
  issues: HealthIssue[];
}

/**
 * Health Issue
 * Individual health issue detected
 */
export interface HealthIssue {
  type: string; // e.g., 'license_expiry', 'resource_limit', 'dependency_missing'
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestedAction?: string;
  detectedAt: Date;
}

/**
 * Usage Analytics
 * Adoption and usage patterns
 */
export interface ExtensionUsageAnalytics {
  extensionId: string;
  siteId: string;

  // Adoption
  isDeployed: boolean;
  deployedAt?: Date;
  adoptionPercent: number;
  activeUsers: number;
  totalUsers: number;

  // Usage patterns
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;

  // Features
  featuresUsed: string[];
  mostUsedFeatures: Array<{ name: string; usageCount: number }>;
  averageFeaturesPerSession: number;

  // Trends
  adoptionTrend: 'increasing' | 'stable' | 'declining';
  usageTrend: 'increasing' | 'stable' | 'declining';
  trendPeriodDays: number;
}

/**
 * Business Impact Metrics
 * ROI and business value tracking
 */
export interface BusinessImpactMetrics {
  extensionId: string;
  siteId: string;
  periodStart: Date;
  periodEnd: Date;

  // Impact
  timeSavedHours: number;
  qualityDefectsReduced: number;
  efficiencyGainPercent: number;
  costSavingsDollars: number;

  // User satisfaction
  averageRating: number; // 1-5
  totalRatings: number;
  satisfactionTrend: 'improving' | 'stable' | 'declining';
  npsScore: number; // -100 to 100

  // ROI calculation
  estimatedROI: number; // percentage
  paybackPeriodDays: number;
}

/**
 * Anomaly Detection Result
 */
export interface AnomalyDetectionResult {
  extensionId: string;
  siteId: string;
  anomalyType: string; // 'error_rate', 'latency', 'resource_usage', 'adoption', etc.
  anomalySeverity: 'critical' | 'warning' | 'info';
  baseline: number;
  current: number;
  deviation: number; // percentage
  message: string;
  suggestedAction?: string;
  detectedAt: Date;
  confidence: number; // 0-100
}

/**
 * Extension Analytics Service
 * Central service for extension analytics and monitoring
 */
export class ExtensionAnalyticsService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;

  // In-memory caches for performance
  private metricsCache: Map<string, ExtensionPerformanceMetric> = new Map();
  private healthCache: Map<string, ExtensionHealthCheck> = new Map();
  private anomalies: AnomalyDetectionResult[] = [];

  private cacheExpireMs = 60000; // 1 minute
  private lastCacheTime: Map<string, number> = new Map();

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Record a usage event
   */
  async recordUsageEvent(event: ExtensionUsageEvent): Promise<void> {
    try {
      // Store in database
      await this.prisma.extensionUsageEvent.create({
        data: {
          extensionId: event.extensionId,
          extensionVersion: event.extensionVersion,
          siteId: event.siteId,
          eventType: event.eventType,
          userId: event.userId,
          userRole: event.userRole,
          featureName: event.featureName,
          metadata: event.metadata as any,
          timestamp: event.timestamp,
        },
      });

      this.logger.debug(`Recorded usage event for ${event.extensionId}: ${event.eventType}`);
    } catch (error) {
      this.logger.error(`Failed to record usage event: ${error}`);
      // Don't throw - analytics failures shouldn't break core functionality
    }
  }

  /**
   * Record performance metrics
   */
  async recordPerformanceMetrics(metric: ExtensionPerformanceMetric): Promise<void> {
    try {
      // Store in database
      await this.prisma.extensionPerformanceMetric.create({
        data: {
          extensionId: metric.extensionId,
          siteId: metric.siteId,
          periodStart: metric.periodStart,
          periodEnd: metric.periodEnd,
          avgLatencyMs: metric.avgLatencyMs,
          p50LatencyMs: metric.p50LatencyMs,
          p95LatencyMs: metric.p95LatencyMs,
          p99LatencyMs: metric.p99LatencyMs,
          maxLatencyMs: metric.maxLatencyMs,
          requestsPerSecond: metric.requestsPerSecond,
          totalRequests: metric.totalRequests,
          errorRate: metric.errorRate,
          totalErrors: metric.totalErrors,
          errorTypes: metric.errorTypes as any,
          avgMemoryMB: metric.avgMemoryMB,
          peakMemoryMB: metric.peakMemoryMB,
          avgCpuPercent: metric.avgCpuPercent,
          peakCpuPercent: metric.peakCpuPercent,
          apiCallCount: metric.apiCallCount,
          uptime: metric.uptime,
        },
      });

      // Update cache
      const cacheKey = `${metric.extensionId}:${metric.siteId}`;
      this.metricsCache.set(cacheKey, metric);
      this.lastCacheTime.set(cacheKey, Date.now());

      this.logger.debug(
        `Recorded performance metrics for ${metric.extensionId}: ${metric.avgLatencyMs}ms avg latency`
      );

      // Check for anomalies
      await this.detectAnomalies(metric);
    } catch (error) {
      this.logger.error(`Failed to record performance metrics: ${error}`);
    }
  }

  /**
   * Get usage analytics for an extension
   */
  async getUsageAnalytics(
    extensionId: string,
    siteId: string,
    periodDays: number = 30
  ): Promise<ExtensionUsageAnalytics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // Query usage events
    const events = await this.prisma.extensionUsageEvent.findMany({
      where: {
        extensionId,
        siteId,
        timestamp: { gte: startDate },
      },
    });

    // Analyze events
    const totalUsers = new Set(events.map((e) => e.userId)).size;
    const dailyUsers = this.calculateDailyActiveUsers(events);
    const weeklyUsers = this.calculateWeeklyActiveUsers(events);
    const monthlyUsers = this.calculateMonthlyActiveUsers(events);

    // Feature usage
    const featureEvents = events.filter((e) => e.eventType === ExtensionEventType.FEATURE_USED);
    const featuresUsed = [...new Set(featureEvents.map((e) => e.featureName))].filter(
      Boolean
    ) as string[];
    const mostUsedFeatures = this.calculateMostUsedFeatures(featureEvents);

    // Trends
    const midpoint = new Date();
    midpoint.setDate(midpoint.getDate() - Math.floor(periodDays / 2));

    const firstHalf = events.filter((e) => e.timestamp < midpoint).length;
    const secondHalf = events.filter((e) => e.timestamp >= midpoint).length;

    const adoptionTrend = secondHalf > firstHalf ? 'increasing' : 'declining';
    const usageTrend = secondHalf > firstHalf ? 'increasing' : 'declining';

    const deploymentEvent = events.find((e) => e.eventType === ExtensionEventType.ACTIVATION);

    return {
      extensionId,
      siteId,
      isDeployed: !!deploymentEvent,
      deployedAt: deploymentEvent?.timestamp,
      adoptionPercent: totalUsers > 0 ? Math.round((dailyUsers / totalUsers) * 100) : 0,
      activeUsers: dailyUsers,
      totalUsers,
      dailyActiveUsers: dailyUsers,
      weeklyActiveUsers: weeklyUsers,
      monthlyActiveUsers: monthlyUsers,
      featuresUsed,
      mostUsedFeatures,
      averageFeaturesPerSession: featureEvents.length / Math.max(1, dailyUsers),
      adoptionTrend,
      usageTrend,
      trendPeriodDays: periodDays,
    };
  }

  /**
   * Get performance metrics for an extension
   */
  async getPerformanceMetrics(
    extensionId: string,
    siteId: string
  ): Promise<ExtensionPerformanceMetric | null> {
    const cacheKey = `${extensionId}:${siteId}`;
    const cached = this.metricsCache.get(cacheKey);
    const cacheAge = Date.now() - (this.lastCacheTime.get(cacheKey) || 0);

    if (cached && cacheAge < this.cacheExpireMs) {
      return cached;
    }

    // Query latest metrics from database
    const metric = await this.prisma.extensionPerformanceMetric.findFirst({
      where: {
        extensionId,
        siteId,
      },
      orderBy: {
        periodEnd: 'desc',
      },
    });

    if (metric) {
      const result: ExtensionPerformanceMetric = {
        extensionId: metric.extensionId,
        siteId: metric.siteId,
        periodStart: metric.periodStart,
        periodEnd: metric.periodEnd,
        avgLatencyMs: metric.avgLatencyMs,
        p50LatencyMs: metric.p50LatencyMs,
        p95LatencyMs: metric.p95LatencyMs,
        p99LatencyMs: metric.p99LatencyMs,
        maxLatencyMs: metric.maxLatencyMs,
        requestsPerSecond: metric.requestsPerSecond,
        totalRequests: metric.totalRequests,
        errorRate: metric.errorRate,
        totalErrors: metric.totalErrors,
        errorTypes: (metric.errorTypes as Record<string, number>) || {},
        avgMemoryMB: metric.avgMemoryMB,
        peakMemoryMB: metric.peakMemoryMB,
        avgCpuPercent: metric.avgCpuPercent,
        peakCpuPercent: metric.peakCpuPercent,
        apiCallCount: metric.apiCallCount,
        uptime: metric.uptime,
      };

      this.metricsCache.set(cacheKey, result);
      this.lastCacheTime.set(cacheKey, Date.now());
      return result;
    }

    return null;
  }

  /**
   * Detect anomalies in metrics
   */
  private async detectAnomalies(metric: ExtensionPerformanceMetric): Promise<void> {
    const anomalies: AnomalyDetectionResult[] = [];

    // Get baseline (average of last 7 periods)
    const baselineMetrics = await this.prisma.extensionPerformanceMetric.findMany({
      where: {
        extensionId: metric.extensionId,
        siteId: metric.siteId,
        periodEnd: {
          lt: metric.periodStart,
        },
      },
      orderBy: {
        periodEnd: 'desc',
      },
      take: 7,
    });

    if (baselineMetrics.length === 0) {
      return; // Not enough data for anomaly detection
    }

    const baselineLatency =
      baselineMetrics.reduce((sum, m) => sum + m.avgLatencyMs, 0) / baselineMetrics.length;
    const baselineErrorRate =
      baselineMetrics.reduce((sum, m) => sum + m.errorRate, 0) / baselineMetrics.length;
    const baselineMemory =
      baselineMetrics.reduce((sum, m) => sum + m.avgMemoryMB, 0) / baselineMetrics.length;

    // Detect latency anomaly (>50% deviation)
    const latencyDeviation = ((metric.avgLatencyMs - baselineLatency) / baselineLatency) * 100;
    if (Math.abs(latencyDeviation) > 50) {
      anomalies.push({
        extensionId: metric.extensionId,
        siteId: metric.siteId,
        anomalyType: 'latency',
        anomalySeverity: latencyDeviation > 100 ? 'critical' : 'warning',
        baseline: baselineLatency,
        current: metric.avgLatencyMs,
        deviation: latencyDeviation,
        message: `Latency ${latencyDeviation > 0 ? 'increased' : 'decreased'} by ${Math.abs(latencyDeviation).toFixed(1)}%`,
        suggestedAction:
          latencyDeviation > 0 ? 'Investigate slow operations and optimize' : undefined,
        detectedAt: new Date(),
        confidence: 85,
      });
    }

    // Detect error rate anomaly (>2x baseline)
    const errorRateDeviation = metric.errorRate - baselineErrorRate;
    if (errorRateDeviation > baselineErrorRate && baselineErrorRate > 0) {
      anomalies.push({
        extensionId: metric.extensionId,
        siteId: metric.siteId,
        anomalyType: 'error_rate',
        anomalySeverity: 'critical',
        baseline: baselineErrorRate,
        current: metric.errorRate,
        deviation: ((errorRateDeviation / baselineErrorRate) * 100),
        message: `Error rate increased from ${baselineErrorRate.toFixed(2)}% to ${metric.errorRate.toFixed(2)}%`,
        suggestedAction: 'Review error logs and investigate root cause',
        detectedAt: new Date(),
        confidence: 90,
      });
    }

    // Detect memory anomaly (>30% deviation)
    const memoryDeviation = ((metric.avgMemoryMB - baselineMemory) / baselineMemory) * 100;
    if (Math.abs(memoryDeviation) > 30) {
      anomalies.push({
        extensionId: metric.extensionId,
        siteId: metric.siteId,
        anomalyType: 'resource_usage',
        anomalySeverity: memoryDeviation > 50 ? 'warning' : 'info',
        baseline: baselineMemory,
        current: metric.avgMemoryMB,
        deviation: memoryDeviation,
        message: `Memory usage ${memoryDeviation > 0 ? 'increased' : 'decreased'} by ${Math.abs(memoryDeviation).toFixed(1)}%`,
        suggestedAction:
          memoryDeviation > 50
            ? 'Consider memory optimization or resource allocation review'
            : undefined,
        detectedAt: new Date(),
        confidence: 80,
      });
    }

    // Store anomalies
    this.anomalies = [...this.anomalies.filter((a) => a.detectedAt > new Date(Date.now() - 86400000)), ...anomalies];

    // Log anomalies
    for (const anomaly of anomalies) {
      this.logger.warn(`Anomaly detected for ${anomaly.extensionId}: ${anomaly.message}`);
    }
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(extensionId?: string, hours: number = 24): AnomalyDetectionResult[] {
    const cutoff = new Date(Date.now() - hours * 3600000);
    return this.anomalies.filter(
      (a) => a.detectedAt > cutoff && (!extensionId || a.extensionId === extensionId)
    );
  }

  /**
   * Calculate daily active users from events
   */
  private calculateDailyActiveUsers(events: any[]): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEvents = events.filter((e) => {
      const eventDate = new Date(e.timestamp);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });

    return new Set(todayEvents.map((e) => e.userId)).size;
  }

  /**
   * Calculate weekly active users from events
   */
  private calculateWeeklyActiveUsers(events: any[]): number {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const weekEvents = events.filter((e) => new Date(e.timestamp) > oneWeekAgo);
    return new Set(weekEvents.map((e) => e.userId)).size;
  }

  /**
   * Calculate monthly active users from events
   */
  private calculateMonthlyActiveUsers(events: any[]): number {
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

    const monthEvents = events.filter((e) => new Date(e.timestamp) > oneMonthAgo);
    return new Set(monthEvents.map((e) => e.userId)).size;
  }

  /**
   * Calculate most used features
   */
  private calculateMostUsedFeatures(
    featureEvents: any[]
  ): Array<{ name: string; usageCount: number }> {
    const featureCounts: Record<string, number> = {};

    for (const event of featureEvents) {
      if (event.featureName) {
        featureCounts[event.featureName] = (featureCounts[event.featureName] || 0) + 1;
      }
    }

    return Object.entries(featureCounts)
      .map(([name, count]) => ({ name, usageCount: count }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10);
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.metricsCache.clear();
    this.healthCache.clear();
    this.lastCacheTime.clear();
    this.logger.debug('Analytics caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    metricsCache: number;
    healthCache: number;
    anomalies: number;
  } {
    return {
      metricsCache: this.metricsCache.size,
      healthCache: this.healthCache.size,
      anomalies: this.anomalies.length,
    };
  }
}
