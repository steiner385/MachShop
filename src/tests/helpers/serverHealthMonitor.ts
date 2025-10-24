/**
 * Server Health Monitoring for E2E Tests
 *
 * Monitors backend and frontend server health during test execution
 * to detect crashes early and enable auto-recovery.
 */

export interface ServerHealthMetrics {
  timestamp: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'crashed';
  backendHealth: {
    available: boolean;
    responseTime: number;
    statusCode: number | null;
    error: string | null;
  };
  frontendHealth: {
    available: boolean;
    responseTime: number;
    statusCode: number | null;
    error: string | null;
  };
  systemMetrics: {
    memory: NodeJS.MemoryUsage | null;
    uptime: number;
  };
}

export class ServerHealthMonitor {
  private static instance: ServerHealthMonitor | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthHistory: ServerHealthMetrics[] = [];
  private readonly backendUrl: string;
  private readonly frontendUrl: string;
  private readonly checkIntervalMs: number;
  private isMonitoring = false;
  private crashDetectedCallback: (() => void) | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 5; // Increased from 3 to 5 to reduce false positives

  private constructor(
    backendUrl = 'http://localhost:3101',
    frontendUrl = 'http://localhost:5278',
    checkIntervalMs = 60000 // 60 seconds (increased from 30s to reduce false positives during test load)
  ) {
    this.backendUrl = backendUrl;
    this.frontendUrl = frontendUrl;
    this.checkIntervalMs = checkIntervalMs;
  }

  static getInstance(): ServerHealthMonitor {
    if (!ServerHealthMonitor.instance) {
      ServerHealthMonitor.instance = new ServerHealthMonitor();
    }
    return ServerHealthMonitor.instance;
  }

  /**
   * Start monitoring server health
   */
  startMonitoring(onCrashDetected?: () => void): void {
    if (this.isMonitoring) {
      console.log('[Health Monitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.crashDetectedCallback = onCrashDetected || null;
    this.consecutiveFailures = 0;

    console.log(`[Health Monitor] Starting health monitoring (checking every ${this.checkIntervalMs / 1000}s)`);

    // Perform initial health check
    this.performHealthCheck();

    // Set up periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.checkIntervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    console.log('[Health Monitor] Stopped monitoring');
  }

  /**
   * Perform a health check on both servers
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      // Check backend health
      const backendHealth = await this.checkEndpoint(`${this.backendUrl}/health`);

      // Check frontend health
      const frontendHealth = await this.checkEndpoint(this.frontendUrl);

      // Get system metrics
      const systemMetrics = {
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };

      // Determine overall status
      const status = this.determineOverallStatus(backendHealth, frontendHealth);

      const metrics: ServerHealthMetrics = {
        timestamp: Date.now(),
        status,
        backendHealth,
        frontendHealth,
        systemMetrics
      };

      // Store metrics
      this.healthHistory.push(metrics);

      // Keep only last 100 checks (to prevent memory bloat)
      if (this.healthHistory.length > 100) {
        this.healthHistory.shift();
      }

      // Log health status
      this.logHealthStatus(metrics);

      // Check for crashes
      if (status === 'unhealthy' || status === 'crashed') {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          console.error(`[Health Monitor] ⚠️  Server crash detected! ${this.consecutiveFailures} consecutive failures`);
          if (this.crashDetectedCallback) {
            this.crashDetectedCallback();
          }
        }
      } else {
        this.consecutiveFailures = 0;
      }

    } catch (error) {
      console.error('[Health Monitor] Error performing health check:', error);
    }
  }

  /**
   * Check a specific endpoint
   */
  private async checkEndpoint(url: string): Promise<{
    available: boolean;
    responseTime: number;
    statusCode: number | null;
    error: string | null;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000) // 10 second timeout (increased from 5s for heavy test load)
      });

      const responseTime = Date.now() - startTime;

      return {
        available: response.ok,
        responseTime,
        statusCode: response.status,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        available: false,
        responseTime,
        statusCode: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Determine overall health status
   */
  private determineOverallStatus(
    backendHealth: { available: boolean },
    frontendHealth: { available: boolean }
  ): ServerHealthMetrics['status'] {
    if (!backendHealth.available && !frontendHealth.available) {
      return 'crashed';
    }
    if (!backendHealth.available || !frontendHealth.available) {
      return 'unhealthy';
    }
    return 'healthy';
  }

  /**
   * Log health status
   */
  private logHealthStatus(metrics: ServerHealthMetrics): void {
    const { status, backendHealth, frontendHealth, systemMetrics } = metrics;

    const statusEmoji = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
      crashed: '💥'
    }[status];

    const memoryMB = systemMetrics.memory
      ? (systemMetrics.memory.heapUsed / 1024 / 1024).toFixed(2)
      : '0';

    const backendStatus = backendHealth.available
      ? `✓ ${backendHealth.responseTime}ms`
      : `✗ ${backendHealth.error}`;

    const frontendStatus = frontendHealth.available
      ? `✓ ${frontendHealth.responseTime}ms`
      : `✗ ${frontendHealth.error}`;

    console.log(
      `[Health Monitor] ${statusEmoji} ${status.toUpperCase()} | ` +
      `Backend: ${backendStatus} | ` +
      `Frontend: ${frontendStatus} | ` +
      `Memory: ${memoryMB}MB | ` +
      `Uptime: ${Math.floor(systemMetrics.uptime)}s`
    );
  }

  /**
   * Get health history
   */
  getHealthHistory(): ServerHealthMetrics[] {
    return [...this.healthHistory];
  }

  /**
   * Get latest health metrics
   */
  getLatestMetrics(): ServerHealthMetrics | null {
    return this.healthHistory.length > 0
      ? this.healthHistory[this.healthHistory.length - 1]
      : null;
  }

  /**
   * Check if servers are currently healthy
   */
  isHealthy(): boolean {
    const latest = this.getLatestMetrics();
    return latest ? latest.status === 'healthy' : false;
  }

  /**
   * Get health summary statistics
   */
  getHealthSummary(): {
    totalChecks: number;
    healthyChecks: number;
    unhealthyChecks: number;
    crashedChecks: number;
    uptimePercentage: number;
  } {
    const total = this.healthHistory.length;
    const healthy = this.healthHistory.filter(m => m.status === 'healthy').length;
    const unhealthy = this.healthHistory.filter(m => m.status === 'unhealthy').length;
    const crashed = this.healthHistory.filter(m => m.status === 'crashed').length;

    return {
      totalChecks: total,
      healthyChecks: healthy,
      unhealthyChecks: unhealthy,
      crashedChecks: crashed,
      uptimePercentage: total > 0 ? (healthy / total) * 100 : 0
    };
  }

  /**
   * Reset monitoring state
   */
  reset(): void {
    this.stopMonitoring();
    this.healthHistory = [];
    this.consecutiveFailures = 0;
  }
}
