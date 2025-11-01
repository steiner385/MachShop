/**
 * Extension Health Check Service
 * Monitors extension health, availability, and detects issues
 *
 * Issue #415 Implementation
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { ExtensionHealthCheck, HealthIssue } from './ExtensionAnalyticsService';

/**
 * Health Check Configuration
 */
export interface HealthCheckConfig {
  extensionId: string;
  siteId: string;
  checkIntervalMinutes?: number;
  licenseExpiryWarningDaysBefore?: number;
  errorRateThresholdPercent?: number;
  latencyThresholdMs?: number;
  memoryThresholdMB?: number;
  cpuThresholdPercent?: number;
}

/**
 * Health Check Alert
 */
export interface HealthCheckAlert {
  extensionId: string;
  siteId: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  message: string;
  suggestedAction?: string;
  detectedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

/**
 * Extension Health Check Service
 * Comprehensive health monitoring for extensions
 */
export class ExtensionHealthCheckService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;
  private healthChecks: Map<string, ExtensionHealthCheck> = new Map();
  private alerts: HealthCheckAlert[] = [];
  private lastCheckTimes: Map<string, number> = new Map();

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Perform comprehensive health check for an extension
   */
  async performHealthCheck(
    extensionId: string,
    siteId: string,
    config?: HealthCheckConfig
  ): Promise<ExtensionHealthCheck> {
    const cacheKey = `${extensionId}:${siteId}`;
    const lastCheck = this.lastCheckTimes.get(cacheKey) || 0;
    const checkInterval = (config?.checkIntervalMinutes || 5) * 60 * 1000;

    // Use cached result if recent
    const cached = this.healthChecks.get(cacheKey);
    if (cached && Date.now() - lastCheck < checkInterval) {
      return cached;
    }

    const issues: HealthIssue[] = [];
    let healthy = true;
    let severity: 'critical' | 'warning' | 'info' = 'info';

    try {
      // Check 1: Extension availability
      const availabilityIssue = await this.checkAvailability(extensionId, siteId);
      if (availabilityIssue) {
        issues.push(availabilityIssue);
        if (availabilityIssue.severity === 'critical') healthy = false;
        severity = this.maxSeverity(severity, availabilityIssue.severity);
      }

      // Check 2: Dependency health
      const depIssue = await this.checkDependencyHealth(extensionId, siteId);
      if (depIssue) {
        issues.push(depIssue);
        healthy = false;
        severity = 'critical';
      }

      // Check 3: License validity
      const licenseIssue = await this.checkLicenseHealth(
        extensionId,
        siteId,
        config?.licenseExpiryWarningDaysBefore || 30
      );
      if (licenseIssue) {
        issues.push(licenseIssue);
        if (licenseIssue.severity === 'critical') {
          healthy = false;
          severity = 'critical';
        } else {
          severity = this.maxSeverity(severity, licenseIssue.severity);
        }
      }

      // Check 4: Configuration health
      const configIssue = await this.checkConfiguration(extensionId, siteId);
      if (configIssue) {
        issues.push(configIssue);
        if (configIssue.severity === 'critical') {
          healthy = false;
          severity = 'critical';
        } else {
          severity = this.maxSeverity(severity, configIssue.severity);
        }
      }

      // Check 5: Performance health
      const perfIssue = await this.checkPerformanceHealth(extensionId, siteId, config);
      if (perfIssue) {
        issues.push(perfIssue);
        severity = this.maxSeverity(severity, perfIssue.severity);
      }

      // Check 6: Integration health
      const integrationIssue = await this.checkIntegrationHealth(extensionId, siteId);
      if (integrationIssue) {
        issues.push(integrationIssue);
        if (integrationIssue.severity === 'critical') {
          healthy = false;
          severity = 'critical';
        } else {
          severity = this.maxSeverity(severity, integrationIssue.severity);
        }
      }

      // Check 7: Resource limits
      const resourceIssue = await this.checkResourceHealth(extensionId, siteId, config);
      if (resourceIssue) {
        issues.push(resourceIssue);
        severity = this.maxSeverity(severity, resourceIssue.severity);
      }
    } catch (error) {
      this.logger.error(`Health check failed for ${extensionId}@${siteId}: ${error}`);
      issues.push({
        type: 'check_failed',
        severity: 'warning',
        message: 'Health check execution failed',
        detectedAt: new Date(),
      });
    }

    const now = new Date();
    const result: ExtensionHealthCheck = {
      extensionId,
      siteId,
      healthy: healthy && issues.length === 0,
      severity,
      message: issues.length === 0 ? 'Extension is healthy' : `${issues.length} issue(s) detected`,
      availability: 100, // TODO: Calculate from events
      dependencyHealth: !issues.some((i) => i.type === 'dependency_missing'),
      licenseValid: !issues.some((i) => i.type === 'license_expired'),
      configValid: !issues.some((i) => i.type === 'config_invalid'),
      integrationHealthy: !issues.some((i) => i.type === 'integration_failed'),
      resourcesWithinLimits: !issues.some((i) => i.type === 'resource_limit_exceeded'),
      lastCheckTime: now,
      nextCheckTime: new Date(now.getTime() + checkInterval),
      issues,
    };

    // Cache result
    this.healthChecks.set(cacheKey, result);
    this.lastCheckTimes.set(cacheKey, Date.now());

    // Generate alerts for critical issues
    for (const issue of issues) {
      if (issue.severity === 'critical') {
        await this.createAlert(extensionId, siteId, issue);
      }
    }

    this.logger.info(
      `Health check for ${extensionId}@${siteId}: ${result.healthy ? 'healthy' : 'unhealthy'}`
    );

    return result;
  }

  /**
   * Check extension availability
   */
  private async checkAvailability(
    extensionId: string,
    siteId: string
  ): Promise<HealthIssue | null> {
    try {
      // Check if extension is registered and active
      const extension = await this.prisma.extension.findUnique({
        where: { id: extensionId },
      });

      if (!extension) {
        return {
          type: 'not_found',
          severity: 'critical',
          message: `Extension ${extensionId} not found`,
          detectedAt: new Date(),
        };
      }

      if (!extension.active) {
        return {
          type: 'disabled',
          severity: 'warning',
          message: `Extension ${extensionId} is disabled`,
          suggestedAction: 'Enable the extension if needed',
          detectedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      this.logger.error(`Availability check failed: ${error}`);
      return {
        type: 'check_failed',
        severity: 'warning',
        message: 'Could not verify extension availability',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Check dependency health
   */
  private async checkDependencyHealth(
    extensionId: string,
    siteId: string
  ): Promise<HealthIssue | null> {
    try {
      // TODO: Query extension dependencies from database
      // Check if all required dependencies are installed and healthy
      return null;
    } catch (error) {
      return {
        type: 'dependency_check_failed',
        severity: 'warning',
        message: 'Could not verify dependencies',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Check license health
   */
  private async checkLicenseHealth(
    extensionId: string,
    siteId: string,
    warningDaysBefore: number = 30
  ): Promise<HealthIssue | null> {
    try {
      // TODO: Query license information from database
      // Check if license is valid and not expiring soon
      return null;
    } catch (error) {
      return {
        type: 'license_check_failed',
        severity: 'warning',
        message: 'Could not verify license status',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Check configuration validity
   */
  private async checkConfiguration(
    extensionId: string,
    siteId: string
  ): Promise<HealthIssue | null> {
    try {
      // TODO: Validate extension configuration
      // Check for required configuration parameters
      return null;
    } catch (error) {
      return {
        type: 'config_invalid',
        severity: 'critical',
        message: 'Extension configuration is invalid',
        suggestedAction: 'Review and fix configuration settings',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Check performance health
   */
  private async checkPerformanceHealth(
    extensionId: string,
    siteId: string,
    config?: HealthCheckConfig
  ): Promise<HealthIssue | null> {
    try {
      // Get latest performance metrics
      const metric = await this.prisma.extensionPerformanceMetric.findFirst({
        where: { extensionId, siteId },
        orderBy: { periodEnd: 'desc' },
      });

      if (!metric) {
        return null; // No metrics yet
      }

      const latencyThreshold = config?.latencyThresholdMs || 5000;
      const errorRateThreshold = config?.errorRateThresholdPercent || 5;

      if (metric.avgLatencyMs > latencyThreshold) {
        return {
          type: 'high_latency',
          severity: metric.avgLatencyMs > latencyThreshold * 2 ? 'critical' : 'warning',
          message: `Average latency ${metric.avgLatencyMs}ms exceeds threshold ${latencyThreshold}ms`,
          suggestedAction: 'Investigate performance bottlenecks and optimize',
          detectedAt: new Date(),
        };
      }

      if (metric.errorRate > errorRateThreshold) {
        return {
          type: 'high_error_rate',
          severity: metric.errorRate > errorRateThreshold * 2 ? 'critical' : 'warning',
          message: `Error rate ${metric.errorRate.toFixed(2)}% exceeds threshold ${errorRateThreshold}%`,
          suggestedAction: 'Review error logs and fix underlying issues',
          detectedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      return {
        type: 'perf_check_failed',
        severity: 'info',
        message: 'Could not verify performance metrics',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Check integration health
   */
  private async checkIntegrationHealth(
    extensionId: string,
    siteId: string
  ): Promise<HealthIssue | null> {
    try {
      // TODO: Check integration status
      // Query for recent integration failures
      return null;
    } catch (error) {
      return {
        type: 'integration_check_failed',
        severity: 'warning',
        message: 'Could not verify integration health',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Check resource health
   */
  private async checkResourceHealth(
    extensionId: string,
    siteId: string,
    config?: HealthCheckConfig
  ): Promise<HealthIssue | null> {
    try {
      const metric = await this.prisma.extensionPerformanceMetric.findFirst({
        where: { extensionId, siteId },
        orderBy: { periodEnd: 'desc' },
      });

      if (!metric) {
        return null;
      }

      const memoryThreshold = config?.memoryThresholdMB || 2048;
      const cpuThreshold = config?.cpuThresholdPercent || 80;

      if (metric.avgMemoryMB > memoryThreshold) {
        return {
          type: 'resource_limit_exceeded',
          severity: 'warning',
          message: `Memory usage ${metric.avgMemoryMB}MB exceeds threshold ${memoryThreshold}MB`,
          suggestedAction: 'Consider memory optimization or increasing resource allocation',
          detectedAt: new Date(),
        };
      }

      if (metric.avgCpuPercent > cpuThreshold) {
        return {
          type: 'resource_limit_exceeded',
          severity: 'warning',
          message: `CPU usage ${metric.avgCpuPercent}% exceeds threshold ${cpuThreshold}%`,
          suggestedAction: 'Optimize extension code or increase CPU allocation',
          detectedAt: new Date(),
        };
      }

      return null;
    } catch (error) {
      return {
        type: 'resource_check_failed',
        severity: 'info',
        message: 'Could not verify resource usage',
        detectedAt: new Date(),
      };
    }
  }

  /**
   * Create a health alert
   */
  private async createAlert(
    extensionId: string,
    siteId: string,
    issue: HealthIssue
  ): Promise<void> {
    const alert: HealthCheckAlert = {
      extensionId,
      siteId,
      severity: issue.severity,
      type: issue.type,
      message: issue.message,
      suggestedAction: issue.suggestedAction,
      detectedAt: new Date(),
    };

    this.alerts.push(alert);
    this.logger.warn(`Health alert: ${alert.message}`);

    // TODO: Send alert notifications (email, webhook, etc.)
  }

  /**
   * Get recent health alerts
   */
  getRecentAlerts(
    extensionId?: string,
    hours: number = 24,
    severity?: 'critical' | 'warning' | 'info'
  ): HealthCheckAlert[] {
    const cutoff = new Date(Date.now() - hours * 3600000);
    return this.alerts.filter(
      (a) =>
        a.detectedAt > cutoff &&
        (!extensionId || a.extensionId === extensionId) &&
        (!severity || a.severity === severity)
    );
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(
    alertIndex: number,
    acknowledgedBy: string
  ): Promise<HealthCheckAlert | null> {
    if (alertIndex < 0 || alertIndex >= this.alerts.length) {
      return null;
    }

    const alert = this.alerts[alertIndex];
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;

    this.logger.info(`Alert acknowledged by ${acknowledgedBy}: ${alert.message}`);
    return alert;
  }

  /**
   * Get unacknowledged critical alerts
   */
  getUnacknowledgedCriticalAlerts(): HealthCheckAlert[] {
    return this.alerts.filter((a) => a.severity === 'critical' && !a.acknowledgedAt);
  }

  /**
   * Determine maximum severity
   */
  private maxSeverity(
    a: 'critical' | 'warning' | 'info',
    b: 'critical' | 'warning' | 'info'
  ): 'critical' | 'warning' | 'info' {
    const severityOrder = { critical: 3, warning: 2, info: 1 };
    return severityOrder[a] > severityOrder[b] ? a : b;
  }

  /**
   * Clear caches
   */
  clearCache(): void {
    this.healthChecks.clear();
    this.lastCheckTimes.clear();
    this.logger.debug('Health check caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    healthChecks: number;
    alerts: number;
    unacknowledgedCritical: number;
  } {
    return {
      healthChecks: this.healthChecks.size,
      alerts: this.alerts.length,
      unacknowledgedCritical: this.getUnacknowledgedCriticalAlerts().length,
    };
  }
}
