/**
 * Integration Health Service
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 *
 * Monitors and reports health status of ERP integrations.
 * Provides detailed health metrics and alerting capabilities.
 */

import { PrismaClient } from '@prisma/client';
import promClient from 'prom-client';
import { logger } from '../../utils/logger';

/**
 * Health status enumeration
 */
export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Integration health metrics
 */
export const integrationHealthMetrics = {
  // Overall health status (0=unhealthy, 0.5=degraded, 1=healthy)
  healthStatus: new promClient.Gauge({
    name: 'erp_integration_health_status',
    help: 'Health status of ERP integration (0=unhealthy, 0.5=degraded, 1=healthy)',
    labelNames: ['integration_id', 'integration_name'],
  }),

  // Time since last successful sync
  lastSyncTimestamp: new promClient.Gauge({
    name: 'erp_integration_last_sync_timestamp',
    help: 'Unix timestamp of last successful sync',
    labelNames: ['integration_id'],
  }),

  // Sync success rate
  syncSuccessRate: new promClient.Gauge({
    name: 'erp_integration_sync_success_rate',
    help: 'Success rate of recent sync operations (0-1)',
    labelNames: ['integration_id'],
  }),

  // Error rate in last 24 hours
  error24hRate: new promClient.Gauge({
    name: 'erp_integration_error_rate_24h',
    help: 'Error rate in last 24 hours (0-1)',
    labelNames: ['integration_id'],
  }),

  // Active webhooks count
  activeWebhooks: new promClient.Gauge({
    name: 'erp_integration_active_webhooks',
    help: 'Number of active webhooks for integration',
    labelNames: ['integration_id'],
  }),

  // Failed webhooks count
  failedWebhooks: new promClient.Gauge({
    name: 'erp_integration_failed_webhooks',
    help: 'Number of failed webhooks for integration',
    labelNames: ['integration_id'],
  }),

  // Pending deliveries count
  pendingDeliveries: new promClient.Gauge({
    name: 'erp_integration_pending_deliveries',
    help: 'Number of pending webhook deliveries',
    labelNames: ['integration_id'],
  }),

  // Data freshness (age of last sync in seconds)
  dataFreshnessSeconds: new promClient.Gauge({
    name: 'erp_integration_data_freshness_seconds',
    help: 'Age of last successful sync in seconds',
    labelNames: ['integration_id'],
  }),
};

/**
 * Health check result
 */
export interface HealthCheckResult {
  integrationId: string;
  integrationName: string;
  status: HealthStatus;
  timestamp: Date;
  checks: {
    enabled: boolean;
    lastSync: {
      status: HealthStatus;
      timestamp: Date | null;
      ageSeconds: number;
    };
    syncSuccessRate: {
      status: HealthStatus;
      rate: number;
      samples: number;
    };
    webhookHealth: {
      status: HealthStatus;
      activeWebhooks: number;
      failedWebhooks: number;
      failureRate: number;
    };
    errorRate: {
      status: HealthStatus;
      rate: number;
      errorCount: number;
    };
  };
  recommendations: string[];
}

/**
 * Integration Health Service
 */
export class IntegrationHealthService {
  private prisma: PrismaClient;

  // Configurable thresholds
  private thresholds = {
    maxSyncAgeMinutes: 60, // Alert if sync older than 1 hour
    minSyncSuccessRate: 0.95, // Alert if success rate below 95%
    maxWebhookFailureRate: 0.1, // Alert if webhook failure rate above 10%
    maxError24hRate: 0.05, // Alert if 24h error rate above 5%
  };

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Perform health check for integration
   */
  async healthCheck(integrationId: string): Promise<HealthCheckResult> {
    try {
      const integration = await this.prisma.erpIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`);
      }

      // Perform all health checks
      const [lastSyncCheck, syncSuccessCheck, webhookCheck, errorRateCheck] = await Promise.all([
        this.checkLastSync(integrationId),
        this.checkSyncSuccessRate(integrationId),
        this.checkWebhookHealth(integrationId),
        this.checkErrorRate(integrationId),
      ]);

      // Determine overall status
      const checks = {
        enabled: integration.enabled,
        lastSync: lastSyncCheck,
        syncSuccessRate: syncSuccessCheck,
        webhookHealth: webhookCheck,
        errorRate: errorRateCheck,
      };

      const status = this.determineOverallStatus(checks);

      // Generate recommendations
      const recommendations = this.generateRecommendations(checks);

      // Update metrics
      this.updateHealthMetrics(integrationId, integration.name || integrationId, status, checks);

      return {
        integrationId,
        integrationName: integration.name || integrationId,
        status,
        timestamp: new Date(),
        checks,
        recommendations,
      };
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
      throw error;
    }
  }

  /**
   * Check last sync status
   */
  private async checkLastSync(integrationId: string): Promise<any> {
    try {
      const integration = await this.prisma.erpIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration?.lastSync) {
        return {
          status: HealthStatus.DEGRADED,
          timestamp: null,
          ageSeconds: Number.MAX_SAFE_INTEGER,
        };
      }

      const ageSeconds = (Date.now() - new Date(integration.lastSync).getTime()) / 1000;
      const maxAgeSeconds = this.thresholds.maxSyncAgeMinutes * 60;

      const status =
        ageSeconds > maxAgeSeconds ? HealthStatus.UNHEALTHY : HealthStatus.HEALTHY;

      return {
        status,
        timestamp: integration.lastSync,
        ageSeconds: Math.floor(ageSeconds),
      };
    } catch (error) {
      logger.warn('Failed to check last sync', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: HealthStatus.UNKNOWN,
        timestamp: null,
        ageSeconds: 0,
      };
    }
  }

  /**
   * Check sync success rate
   */
  private async checkSyncSuccessRate(integrationId: string): Promise<any> {
    try {
      // Get sync logs from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const [successCount, totalCount] = await Promise.all([
        this.prisma.erpLog.count({
          where: {
            erpIntegrationId: integrationId,
            createdAt: { gte: sevenDaysAgo },
            status: 'SUCCESS',
          },
        }),
        this.prisma.erpLog.count({
          where: {
            erpIntegrationId: integrationId,
            createdAt: { gte: sevenDaysAgo },
          },
        }),
      ]);

      const rate = totalCount > 0 ? successCount / totalCount : 0;
      const status =
        rate < this.thresholds.minSyncSuccessRate ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        rate: parseFloat((rate * 100).toFixed(2)),
        samples: totalCount,
      };
    } catch (error) {
      logger.warn('Failed to check sync success rate', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: HealthStatus.UNKNOWN,
        rate: 0,
        samples: 0,
      };
    }
  }

  /**
   * Check webhook health
   */
  private async checkWebhookHealth(integrationId: string): Promise<any> {
    try {
      const [webhooks, failedCount, failureCount] = await Promise.all([
        this.prisma.erpWebhookEndpoint.count({
          where: { integrationId, isActive: true },
        }),
        this.prisma.erpWebhookEndpoint.count({
          where: { integrationId, isActive: false },
        }),
        this.prisma.erpWebhookDelivery.count({
          where: {
            webhook: { integrationId },
            status: 'FAILED',
          },
        }),
      ]);

      const totalWebhooks = webhooks + failedCount;
      const failureRate = totalWebhooks > 0 ? failedCount / totalWebhooks : 0;

      const status =
        failureRate > this.thresholds.maxWebhookFailureRate
          ? HealthStatus.DEGRADED
          : HealthStatus.HEALTHY;

      return {
        status,
        activeWebhooks: webhooks,
        failedWebhooks: failedCount,
        failureRate: parseFloat((failureRate * 100).toFixed(2)),
      };
    } catch (error) {
      logger.warn('Failed to check webhook health', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: HealthStatus.UNKNOWN,
        activeWebhooks: 0,
        failedWebhooks: 0,
        failureRate: 0,
      };
    }
  }

  /**
   * Check error rate in last 24 hours
   */
  private async checkErrorRate(integrationId: string): Promise<any> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [errorCount, totalCount] = await Promise.all([
        this.prisma.erpLog.count({
          where: {
            erpIntegrationId: integrationId,
            createdAt: { gte: oneDayAgo },
            status: { in: ['FAILED', 'ERROR'] },
          },
        }),
        this.prisma.erpLog.count({
          where: {
            erpIntegrationId: integrationId,
            createdAt: { gte: oneDayAgo },
          },
        }),
      ]);

      const rate = totalCount > 0 ? errorCount / totalCount : 0;
      const status =
        rate > this.thresholds.maxError24hRate ? HealthStatus.DEGRADED : HealthStatus.HEALTHY;

      return {
        status,
        rate: parseFloat((rate * 100).toFixed(2)),
        errorCount,
      };
    } catch (error) {
      logger.warn('Failed to check error rate', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        status: HealthStatus.UNKNOWN,
        rate: 0,
        errorCount: 0,
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(checks: any): HealthStatus {
    if (!checks.enabled) {
      return HealthStatus.UNKNOWN;
    }

    const statusValues = [
      checks.lastSync.status,
      checks.syncSuccessRate.status,
      checks.webhookHealth.status,
      checks.errorRate.status,
    ];

    if (statusValues.includes(HealthStatus.UNHEALTHY)) {
      return HealthStatus.UNHEALTHY;
    }
    if (statusValues.includes(HealthStatus.DEGRADED)) {
      return HealthStatus.DEGRADED;
    }
    return HealthStatus.HEALTHY;
  }

  /**
   * Generate recommendations based on health checks
   */
  private generateRecommendations(checks: any): string[] {
    const recommendations: string[] = [];

    if (checks.lastSync.status === HealthStatus.UNHEALTHY) {
      recommendations.push(
        `Last sync was ${checks.lastSync.ageSeconds} seconds ago. Consider scheduling more frequent syncs.`
      );
    }

    if (checks.syncSuccessRate.status === HealthStatus.DEGRADED) {
      recommendations.push(
        `Sync success rate is ${checks.syncSuccessRate.rate}%. Review sync logs for common errors.`
      );
    }

    if (checks.webhookHealth.status === HealthStatus.DEGRADED) {
      recommendations.push(
        `${checks.webhookHealth.failedWebhooks} webhook(s) have failed. Check webhook endpoints and credentials.`
      );
    }

    if (checks.errorRate.status === HealthStatus.DEGRADED) {
      recommendations.push(
        `Error rate in last 24h is ${checks.errorRate.rate}%. Review error logs for issues.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Integration is healthy. No actions required.');
    }

    return recommendations;
  }

  /**
   * Update health metrics
   */
  private updateHealthMetrics(
    integrationId: string,
    integrationName: string,
    status: HealthStatus,
    checks: any
  ): void {
    try {
      const statusValue = status === HealthStatus.HEALTHY ? 1 : status === HealthStatus.DEGRADED ? 0.5 : 0;

      integrationHealthMetrics.healthStatus.set(
        { integration_id: integrationId, integration_name: integrationName },
        statusValue
      );

      if (checks.lastSync.timestamp) {
        integrationHealthMetrics.lastSyncTimestamp.set(
          { integration_id: integrationId },
          Math.floor(new Date(checks.lastSync.timestamp).getTime() / 1000)
        );
      }

      integrationHealthMetrics.syncSuccessRate.set(
        { integration_id: integrationId },
        checks.syncSuccessRate.rate / 100
      );

      integrationHealthMetrics.error24hRate.set(
        { integration_id: integrationId },
        checks.errorRate.rate / 100
      );

      integrationHealthMetrics.activeWebhooks.set(
        { integration_id: integrationId },
        checks.webhookHealth.activeWebhooks
      );

      integrationHealthMetrics.failedWebhooks.set(
        { integration_id: integrationId },
        checks.webhookHealth.failedWebhooks
      );

      integrationHealthMetrics.dataFreshnessSeconds.set(
        { integration_id: integrationId },
        checks.lastSync.ageSeconds
      );
    } catch (error) {
      logger.warn('Failed to update health metrics', {
        error: error instanceof Error ? error.message : String(error),
        integrationId,
      });
    }
  }

  /**
   * Get health status for all integrations
   */
  async getAllHealthStatus(): Promise<HealthCheckResult[]> {
    try {
      const integrations = await this.prisma.erpIntegration.findMany();
      const results = await Promise.all(integrations.map((i) => this.healthCheck(i.id)));
      return results;
    } catch (error) {
      logger.error('Failed to get all health status', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default IntegrationHealthService;
