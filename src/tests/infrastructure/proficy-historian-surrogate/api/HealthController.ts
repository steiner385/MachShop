import { Request, Response } from 'express';
import { TimeSeriesStore } from '../storage/TimeSeriesStore';
import { TagRegistry } from '../storage/TagRegistry';
import { PerformanceMonitor } from '../monitoring/PerformanceMonitor';

/**
 * Health Controller
 * Handles health check and system status endpoints
 */
export class HealthController {
  private startTime: number = Date.now();

  constructor(
    private timeSeriesStore: TimeSeriesStore,
    private tagRegistry: TagRegistry,
    private performanceMonitor: PerformanceMonitor
  ) {}

  /**
   * GET /health
   * GET /historian/health
   * Basic health check endpoint
   */
  async getHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.getHealthData();

      const statusCode = health.healthy ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error: any) {
      console.error('Health check failed:', error);
      res.status(503).json({
        healthy: false,
        status: 'UNHEALTHY',
        error: 'Health check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/health/detailed
   * Detailed health check with component status
   */
  async getDetailedHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await this.getDetailedHealthData();

      const statusCode = health.healthy ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error: any) {
      console.error('Detailed health check failed:', error);
      res.status(503).json({
        healthy: false,
        status: 'UNHEALTHY',
        error: 'Detailed health check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/health/metrics
   * Performance and operational metrics
   */
  async getHealthMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.performanceMonitor.getMetrics();
      const summary = this.performanceMonitor.getSummary();

      const healthMetrics = {
        performance: summary,
        storage: this.timeSeriesStore.getHealthStatus(),
        registry: {
          totalTags: this.tagRegistry.getTagCount(),
          statistics: this.tagRegistry.getStatistics()
        },
        system: {
          uptime: Date.now() - this.startTime,
          memory: this.getMemoryMetrics(),
          timestamp: new Date().toISOString()
        }
      };

      res.status(200).json(healthMetrics);

    } catch (error: any) {
      console.error('Failed to get health metrics:', error);
      res.status(500).json({
        error: 'Failed to retrieve health metrics',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/health/readiness
   * Kubernetes-style readiness probe
   */
  async getReadiness(req: Request, res: Response): Promise<void> {
    try {
      const readiness = await this.checkReadiness();

      const statusCode = readiness.ready ? 200 : 503;
      res.status(statusCode).json(readiness);

    } catch (error: any) {
      res.status(503).json({
        ready: false,
        status: 'NOT_READY',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/health/liveness
   * Kubernetes-style liveness probe
   */
  async getLiveness(req: Request, res: Response): Promise<void> {
    try {
      const liveness = await this.checkLiveness();

      const statusCode = liveness.alive ? 200 : 503;
      res.status(statusCode).json(liveness);

    } catch (error: any) {
      res.status(503).json({
        alive: false,
        status: 'NOT_ALIVE',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * GET /historian/health/startup
   * Kubernetes-style startup probe
   */
  async getStartup(req: Request, res: Response): Promise<void> {
    try {
      const startup = await this.checkStartup();

      const statusCode = startup.started ? 200 : 503;
      res.status(statusCode).json(startup);

    } catch (error: any) {
      res.status(503).json({
        started: false,
        status: 'NOT_STARTED',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Get basic health data
   */
  async getHealthData(): Promise<any> {
    const uptime = Date.now() - this.startTime;
    const storageHealth = this.timeSeriesStore.getHealthStatus();
    const performanceSummary = this.performanceMonitor.getSummary();

    // Determine overall health
    const healthy = storageHealth.healthy &&
                   uptime > 1000 && // At least 1 second uptime
                   performanceSummary.errors.errorRate < 0.1; // Less than 10% error rate

    return {
      healthy,
      status: healthy ? 'HEALTHY' : 'UNHEALTHY',
      uptime,
      components: {
        storage: storageHealth.healthy ? 'UP' : 'DOWN',
        registry: 'UP',
        monitoring: 'UP'
      },
      metrics: {
        totalTags: this.tagRegistry.getTagCount(),
        totalDataPoints: storageHealth.totalDataPoints,
        memoryUtilization: storageHealth.memoryUtilization,
        errorRate: performanceSummary.errors.errorRate
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get detailed health data
   */
  async getDetailedHealthData(): Promise<any> {
    const basicHealth = await this.getHealthData();
    const storageHealth = this.timeSeriesStore.getHealthStatus();
    const performanceMetrics = this.performanceMonitor.getMetrics();
    const tagStatistics = this.tagRegistry.getStatistics();

    return {
      ...basicHealth,
      details: {
        storage: {
          healthy: storageHealth.healthy,
          totalDataPoints: storageHealth.totalDataPoints,
          memoryUsage: {
            current: storageHealth.memoryUsage,
            utilization: storageHealth.memoryUtilization,
            peak: storageHealth.peakMemoryUsed
          },
          performance: {
            writesPerSecond: storageHealth.writesPerSecond,
            readsPerSecond: storageHealth.readsPerSecond,
            averageWriteLatency: storageHealth.averageWriteLatency,
            averageReadLatency: storageHealth.averageReadLatency
          },
          compression: {
            ratio: storageHealth.compressionRatio,
            compressedBuckets: storageHealth.compressedBuckets
          },
          errors: {
            writeErrors: storageHealth.writeErrors,
            readErrors: storageHealth.readErrors,
            lastError: storageHealth.lastError
          },
          maintenance: {
            lastCleanup: storageHealth.lastCleanup,
            lastCompression: storageHealth.lastCompression
          }
        },
        registry: {
          healthy: true,
          statistics: tagStatistics
        },
        performance: {
          writeOperations: performanceMetrics.writeOperations,
          readOperations: performanceMetrics.readOperations,
          system: performanceMetrics.system,
          errors: performanceMetrics.errors
        }
      }
    };
  }

  /**
   * Check readiness (can serve traffic)
   */
  private async checkReadiness(): Promise<any> {
    const uptime = Date.now() - this.startTime;
    const storageHealth = this.timeSeriesStore.getHealthStatus();

    // System is ready if it's been running for at least 5 seconds and storage is healthy
    const ready = uptime >= 5000 && storageHealth.healthy;

    const checks = [
      {
        name: 'uptime',
        status: uptime >= 5000 ? 'PASS' : 'FAIL',
        message: uptime >= 5000 ? 'Sufficient uptime' : 'Insufficient uptime',
        duration: uptime
      },
      {
        name: 'storage',
        status: storageHealth.healthy ? 'PASS' : 'FAIL',
        message: storageHealth.healthy ? 'Storage is healthy' : 'Storage is unhealthy'
      },
      {
        name: 'registry',
        status: 'PASS',
        message: 'Tag registry is operational'
      }
    ];

    return {
      ready,
      status: ready ? 'READY' : 'NOT_READY',
      checks,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check liveness (process is running)
   */
  private async checkLiveness(): Promise<any> {
    // For liveness, we just need to confirm the process is responsive
    const alive = true;

    return {
      alive,
      status: 'ALIVE',
      pid: process.pid,
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check startup (initialization complete)
   */
  private async checkStartup(): Promise<any> {
    const uptime = Date.now() - this.startTime;

    // System is started if it's been running for at least 2 seconds
    const started = uptime >= 2000;

    return {
      started,
      status: started ? 'STARTED' : 'STARTING',
      uptime,
      initializationTime: Math.min(uptime, 2000),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get memory metrics
   */
  private getMemoryMetrics(): any {
    const memoryUsage = process.memoryUsage();

    return {
      heapUsed: {
        bytes: memoryUsage.heapUsed,
        mb: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100
      },
      heapTotal: {
        bytes: memoryUsage.heapTotal,
        mb: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100
      },
      external: {
        bytes: memoryUsage.external,
        mb: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100
      },
      rss: {
        bytes: memoryUsage.rss,
        mb: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100
      },
      utilization: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) / 100
    };
  }
}