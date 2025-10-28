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
  private recoveryCallback: (() => Promise<void>) | null = null;
  private consecutiveFailures = 0;
  private readonly maxConsecutiveFailures = 3; // ✅ PHASE 7 FIX: Reduced to 3 for faster detection during active testing
  private recoveryAttempts = 0;
  private readonly maxRecoveryAttempts = 2;

  private constructor(
    backendUrl = 'http://localhost:3100',
    frontendUrl = 'http://localhost:3101',
    checkIntervalMs = 30000 // ✅ PHASE 7 FIX: Reduced to 30s for more responsive monitoring during test execution
  ) {
    this.backendUrl = backendUrl;
    this.frontendUrl = frontendUrl;
    this.checkIntervalMs = checkIntervalMs;
  }

  static getInstance(
    backendUrl?: string,
    frontendUrl?: string,
    checkIntervalMs?: number
  ): ServerHealthMonitor {
    if (!ServerHealthMonitor.instance) {
      ServerHealthMonitor.instance = new ServerHealthMonitor(backendUrl, frontendUrl, checkIntervalMs);
    }
    return ServerHealthMonitor.instance;
  }

  /**
   * ✅ PHASE 6C FIX: Update URLs on existing instance
   * Fixes singleton pattern bug where dynamic URLs are ignored if instance already exists
   */
  updateConfiguration(
    backendUrl: string,
    frontendUrl: string,
    checkIntervalMs?: number
  ): void {
    console.log(`[Health Monitor] Updating configuration - Backend: ${backendUrl}, Frontend: ${frontendUrl}`);

    // Stop monitoring if it's running
    const wasMonitoring = this.isMonitoring;
    if (wasMonitoring) {
      this.stopMonitoring();
    }

    // Update URLs
    (this as any).backendUrl = backendUrl;
    (this as any).frontendUrl = frontendUrl;

    if (checkIntervalMs !== undefined) {
      (this as any).checkIntervalMs = checkIntervalMs;
    }

    // Reset state
    this.consecutiveFailures = 0;
    this.recoveryAttempts = 0;
    this.healthHistory = [];

    console.log(`[Health Monitor] Configuration updated successfully`);

    // Restart monitoring if it was running
    if (wasMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Start monitoring server health with optional recovery callback
   * ✅ PHASE 7 FIX: Added recovery callback for automatic server restart
   */
  startMonitoring(
    onCrashDetected?: () => void,
    onRecoveryNeeded?: () => Promise<void>
  ): void {
    if (this.isMonitoring) {
      console.log('[Health Monitor] Already monitoring');
      return;
    }

    this.isMonitoring = true;
    this.crashDetectedCallback = onCrashDetected || null;
    this.recoveryCallback = onRecoveryNeeded || null;
    this.consecutiveFailures = 0;
    this.recoveryAttempts = 0;

    console.log(`[Health Monitor] Starting enhanced health monitoring (checking every ${this.checkIntervalMs / 1000}s)`);
    console.log(`[Health Monitor] Recovery mechanism: ${this.recoveryCallback ? 'ENABLED' : 'DISABLED'}`);

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

      // Check frontend health with SPA readiness verification
      const frontendHealth = await this.checkFrontendSPAHealth(this.frontendUrl);

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

      // Check for crashes and attempt recovery
      if (status === 'unhealthy' || status === 'crashed') {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
          console.error(`[Health Monitor] ⚠️  Server crash detected! ${this.consecutiveFailures} consecutive failures`);

          // Trigger crash detection callback
          if (this.crashDetectedCallback) {
            this.crashDetectedCallback();
          }

          // ✅ PHASE 7 FIX: Attempt automatic recovery if callback is available
          if (this.recoveryCallback && this.recoveryAttempts < this.maxRecoveryAttempts) {
            this.recoveryAttempts++;
            console.log(`[Health Monitor] 🔄 Attempting recovery (${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

            try {
              await this.recoveryCallback();
              console.log(`[Health Monitor] ✅ Recovery attempt ${this.recoveryAttempts} completed`);

              // Reset consecutive failures to give recovery a chance to work
              this.consecutiveFailures = 0;
            } catch (recoveryError) {
              console.error(`[Health Monitor] ❌ Recovery attempt ${this.recoveryAttempts} failed:`, recoveryError);
            }
          } else if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
            console.error(`[Health Monitor] 💥 Maximum recovery attempts (${this.maxRecoveryAttempts}) exceeded`);
          }
        }
      } else {
        // Reset counters on successful health check
        this.consecutiveFailures = 0;
        this.recoveryAttempts = 0;
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
   * ✅ PHASE 7 FIX: Enhanced frontend SPA health check
   * Verifies not just that the server responds, but that the React SPA is ready and functional
   */
  private async checkFrontendSPAHealth(url: string): Promise<{
    available: boolean;
    responseTime: number;
    statusCode: number | null;
    error: string | null;
  }> {
    const startTime = Date.now();

    try {
      // First check if the server responds
      const response = await fetch(url, {
        signal: AbortSignal.timeout(8000) // Reduced timeout for frontend checks
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        return {
          available: false,
          responseTime,
          statusCode: response.status,
          error: `HTTP ${response.status}`
        };
      }

      // For frontend, also verify that the HTML contains React app indicators
      const htmlContent = await response.text();

      // Check for React app indicators in the HTML
      const hasReactRoot = htmlContent.includes('id="root"') || htmlContent.includes('data-reactroot');
      const hasViteAssets = htmlContent.includes('/src/') || htmlContent.includes('.js') || htmlContent.includes('.css');
      const hasMESTitle = htmlContent.includes('MES') || htmlContent.includes('Manufacturing');

      if (!hasReactRoot) {
        return {
          available: false,
          responseTime,
          statusCode: response.status,
          error: 'SPA_NOT_READY: Missing React root element'
        };
      }

      if (!hasViteAssets) {
        return {
          available: false,
          responseTime,
          statusCode: response.status,
          error: 'SPA_NOT_READY: Missing JavaScript/CSS assets'
        };
      }

      // All checks passed - frontend SPA appears ready
      return {
        available: true,
        responseTime,
        statusCode: response.status,
        error: null
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
   * Reset monitoring state
   */
  reset(): void {
    this.stopMonitoring();
    this.healthHistory = [];
    this.consecutiveFailures = 0;
    this.recoveryAttempts = 0;
  }
}
