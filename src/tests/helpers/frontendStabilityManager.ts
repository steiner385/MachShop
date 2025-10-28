/**
 * Frontend Stability Manager for E2E Tests
 *
 * Provides comprehensive frontend server monitoring, health checking,
 * and automatic recovery mechanisms to prevent test failures due to
 * frontend server instability.
 *
 * Key Features:
 * - Health monitoring with configurable intervals
 * - Process-level recovery mechanisms
 * - Circuit breaker patterns with failure thresholds
 * - Exponential backoff retry logic
 * - Graceful degradation for test execution
 */

import { ChildProcess, spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export interface FrontendHealthMetrics {
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  responseTime: number;
  lastCheck: Date;
  consecutiveFailures: number;
  totalChecks: number;
  uptime: number;
  lastError?: string;
}

export interface FrontendStabilityConfig {
  healthCheckInterval: number; // milliseconds
  healthCheckTimeout: number;
  maxConsecutiveFailures: number;
  maxRecoveryAttempts: number;
  exponentialBackoffBase: number;
  processRestartDelay: number;
  circuitBreakerThreshold: number;
  gracefulDegradationEnabled: boolean;
}

export class FrontendStabilityManager {
  private static instance: FrontendStabilityManager;
  private config: FrontendStabilityConfig;
  private healthMetrics: FrontendHealthMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private frontendProcess?: ChildProcess;
  private isRecovering = false;
  private circuitBreakerOpen = false;
  private lastRecoveryAttempt = 0;
  private recoveryAttemptCount = 0;

  // Event callbacks
  private onHealthChange?: (metrics: FrontendHealthMetrics) => void;
  private onRecoveryStart?: () => void;
  private onRecoveryComplete?: (success: boolean) => void;
  private onCircuitBreakerTrip?: () => void;

  private constructor(config?: Partial<FrontendStabilityConfig>) {
    this.config = {
      healthCheckInterval: 5000, // 5 seconds
      healthCheckTimeout: 10000, // 10 seconds
      maxConsecutiveFailures: 3,
      maxRecoveryAttempts: 5,
      exponentialBackoffBase: 2000, // 2 seconds base
      processRestartDelay: 5000, // 5 seconds
      circuitBreakerThreshold: 3,
      gracefulDegradationEnabled: true,
      ...config
    };

    this.healthMetrics = {
      status: 'offline',
      responseTime: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
      totalChecks: 0,
      uptime: 0
    };
  }

  public static getInstance(config?: Partial<FrontendStabilityConfig>): FrontendStabilityManager {
    if (!FrontendStabilityManager.instance) {
      FrontendStabilityManager.instance = new FrontendStabilityManager(config);
    }
    return FrontendStabilityManager.instance;
  }

  /**
   * Start monitoring frontend server health
   */
  async startMonitoring(frontendUrl: string): Promise<void> {
    console.log(`[FrontendStability] Starting health monitoring for ${frontendUrl}`);

    this.stopMonitoring(); // Stop any existing monitoring

    this.healthCheckTimer = setInterval(async () => {
      await this.performHealthCheck(frontendUrl);
    }, this.config.healthCheckInterval);

    // Perform initial health check
    await this.performHealthCheck(frontendUrl);
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    console.log('[FrontendStability] Health monitoring stopped');
  }

  /**
   * Perform health check with circuit breaker protection
   */
  private async performHealthCheck(frontendUrl: string): Promise<void> {
    if (this.circuitBreakerOpen) {
      console.log('[FrontendStability] Circuit breaker open, skipping health check');
      return;
    }

    const startTime = Date.now();

    try {
      this.healthMetrics.totalChecks++;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.healthCheckTimeout);

      const response = await fetch(frontendUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'E2E-HealthCheck',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      this.healthMetrics.responseTime = responseTime;
      this.healthMetrics.lastCheck = new Date();

      if (response.ok) {
        await this.handleHealthyResponse(responseTime);
      } else {
        await this.handleUnhealthyResponse(`HTTP ${response.status}`);
      }

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      await this.handleUnhealthyResponse(error.message || 'Health check failed');
    }
  }

  /**
   * Handle healthy response
   */
  private async handleHealthyResponse(responseTime: number): Promise<void> {
    const wasUnhealthy = this.healthMetrics.status !== 'healthy';

    this.healthMetrics.consecutiveFailures = 0;
    this.recoveryAttemptCount = 0; // Reset recovery attempts on success

    // Determine health status based on response time
    if (responseTime < 1000) {
      this.healthMetrics.status = 'healthy';
    } else if (responseTime < 3000) {
      this.healthMetrics.status = 'degraded';
    } else {
      this.healthMetrics.status = 'critical';
    }

    // Close circuit breaker if it was open
    if (this.circuitBreakerOpen) {
      this.circuitBreakerOpen = false;
      console.log('[FrontendStability] ✅ Circuit breaker closed - service recovered');
    }

    // Log recovery
    if (wasUnhealthy) {
      console.log(`[FrontendStability] ✅ Service recovered - Status: ${this.healthMetrics.status}, Response: ${responseTime}ms`);
      this.onRecoveryComplete?.(true);
    }

    this.onHealthChange?.(this.healthMetrics);
  }

  /**
   * Handle unhealthy response
   */
  private async handleUnhealthyResponse(error: string): Promise<void> {
    this.healthMetrics.consecutiveFailures++;
    this.healthMetrics.status = 'offline';
    this.healthMetrics.lastError = error;

    console.log(`[FrontendStability] ❌ Health check failed (${this.healthMetrics.consecutiveFailures}/${this.config.maxConsecutiveFailures}): ${error}`);

    // Trip circuit breaker if threshold reached
    if (this.healthMetrics.consecutiveFailures >= this.config.circuitBreakerThreshold && !this.circuitBreakerOpen) {
      this.circuitBreakerOpen = true;
      console.log('[FrontendStability] 🔌 Circuit breaker tripped - stopping health checks temporarily');
      this.onCircuitBreakerTrip?.();
    }

    // Trigger recovery if needed
    if (this.healthMetrics.consecutiveFailures >= this.config.maxConsecutiveFailures && !this.isRecovering) {
      await this.initiateRecovery();
    }

    this.onHealthChange?.(this.healthMetrics);
  }

  /**
   * Initiate frontend server recovery
   */
  private async initiateRecovery(): Promise<void> {
    if (this.isRecovering || this.recoveryAttemptCount >= this.config.maxRecoveryAttempts) {
      return;
    }

    this.isRecovering = true;
    this.recoveryAttemptCount++;

    console.log(`[FrontendStability] 🔄 Initiating recovery attempt ${this.recoveryAttemptCount}/${this.config.maxRecoveryAttempts}`);
    this.onRecoveryStart?.();

    try {
      // Calculate exponential backoff delay
      const delay = this.config.exponentialBackoffBase * Math.pow(2, this.recoveryAttemptCount - 1);
      console.log(`[FrontendStability] Waiting ${delay}ms before recovery attempt...`);
      await sleep(delay);

      // Attempt process-level recovery
      const recoverySuccess = await this.recoverFrontendProcess();

      if (recoverySuccess) {
        console.log('[FrontendStability] ✅ Recovery successful');
        this.healthMetrics.consecutiveFailures = 0;
        this.recoveryAttemptCount = 0;
        this.circuitBreakerOpen = false;
        this.onRecoveryComplete?.(true);
      } else {
        console.log(`[FrontendStability] ❌ Recovery attempt ${this.recoveryAttemptCount} failed`);
        this.onRecoveryComplete?.(false);
      }

    } catch (error: any) {
      console.error(`[FrontendStability] Recovery error: ${error.message}`);
      this.onRecoveryComplete?.(false);
    } finally {
      this.isRecovering = false;
      this.lastRecoveryAttempt = Date.now();
    }
  }

  /**
   * Recover frontend process through restart
   */
  private async recoverFrontendProcess(): Promise<boolean> {
    try {
      console.log('[FrontendStability] 🔄 Attempting frontend process recovery...');

      // Kill existing frontend processes
      await this.killExistingFrontendProcesses();

      // Wait for process cleanup
      await sleep(this.config.processRestartDelay);

      // Start new frontend process
      const success = await this.startFrontendProcess();

      if (success) {
        console.log('[FrontendStability] ✅ Frontend process restarted successfully');
        return true;
      } else {
        console.log('[FrontendStability] ❌ Failed to restart frontend process');
        return false;
      }

    } catch (error: any) {
      console.error('[FrontendStability] Process recovery failed:', error.message);
      return false;
    }
  }

  /**
   * Kill existing frontend processes
   */
  private async killExistingFrontendProcesses(): Promise<void> {
    try {
      // Kill any existing frontend process we're tracking
      if (this.frontendProcess && !this.frontendProcess.killed) {
        console.log('[FrontendStability] Killing tracked frontend process...');
        this.frontendProcess.kill('SIGTERM');

        // Wait for graceful shutdown, then force kill if needed
        await sleep(3000);
        if (!this.frontendProcess.killed) {
          this.frontendProcess.kill('SIGKILL');
        }
      }

      // Kill any orphaned Vite processes
      console.log('[FrontendStability] Cleaning up orphaned Vite processes...');
      await this.executeCommand('pkill -f "vite.*frontend"');
      await this.executeCommand('pkill -f "npm run dev:e2e"');

      // Wait for cleanup
      await sleep(2000);

    } catch (error: any) {
      console.log(`[FrontendStability] Process cleanup completed (some processes may not have existed)`);
    }
  }

  /**
   * Start new frontend process
   */
  private async startFrontendProcess(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const frontendDir = path.join(process.cwd(), 'frontend');

        console.log('[FrontendStability] Starting new frontend process...');

        this.frontendProcess = spawn('npm', ['run', 'dev:e2e'], {
          cwd: frontendDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            NODE_ENV: 'test'
          }
        });

        let startupTimeout: NodeJS.Timeout;
        let resolved = false;

        const resolveOnce = (success: boolean) => {
          if (!resolved) {
            resolved = true;
            if (startupTimeout) clearTimeout(startupTimeout);
            resolve(success);
          }
        };

        // Set startup timeout
        startupTimeout = setTimeout(() => {
          resolveOnce(false);
        }, 60000); // 60 second timeout

        // Monitor process output for startup indicators
        this.frontendProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('Local:') || output.includes('ready in')) {
            console.log('[FrontendStability] ✅ Frontend server startup detected');
            resolveOnce(true);
          }
        });

        this.frontendProcess.stderr?.on('data', (data: Buffer) => {
          const error = data.toString();
          console.log(`[FrontendStability] Frontend stderr: ${error}`);
        });

        this.frontendProcess.on('exit', (code) => {
          console.log(`[FrontendStability] Frontend process exited with code: ${code}`);
          resolveOnce(false);
        });

        this.frontendProcess.on('error', (error) => {
          console.error(`[FrontendStability] Frontend process error: ${error.message}`);
          resolveOnce(false);
        });

      } catch (error: any) {
        console.error(`[FrontendStability] Failed to start frontend process: ${error.message}`);
        resolve(false);
      }
    });
  }

  /**
   * Execute command with error handling
   */
  private async executeCommand(command: string): Promise<void> {
    return new Promise((resolve) => {
      const child = spawn('bash', ['-c', command], { stdio: 'ignore' });
      child.on('close', () => resolve());
      child.on('error', () => resolve()); // Don't throw on command errors
    });
  }

  /**
   * Get current health metrics
   */
  getHealthMetrics(): FrontendHealthMetrics {
    return { ...this.healthMetrics };
  }

  /**
   * Check if frontend is healthy enough for testing
   */
  isHealthyForTesting(): boolean {
    if (this.circuitBreakerOpen) {
      return false;
    }

    return this.healthMetrics.status === 'healthy' ||
           (this.config.gracefulDegradationEnabled && this.healthMetrics.status === 'degraded');
  }

  /**
   * Wait for frontend to become healthy
   */
  async waitForHealthy(timeoutMs: number = 60000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.isHealthyForTesting()) {
        return true;
      }

      await sleep(1000); // Check every second
    }

    return false;
  }

  /**
   * Set event callbacks
   */
  setEventCallbacks(callbacks: {
    onHealthChange?: (metrics: FrontendHealthMetrics) => void;
    onRecoveryStart?: () => void;
    onRecoveryComplete?: (success: boolean) => void;
    onCircuitBreakerTrip?: () => void;
  }): void {
    this.onHealthChange = callbacks.onHealthChange;
    this.onRecoveryStart = callbacks.onRecoveryStart;
    this.onRecoveryComplete = callbacks.onRecoveryComplete;
    this.onCircuitBreakerTrip = callbacks.onCircuitBreakerTrip;
  }

  /**
   * Get detailed status report
   */
  getStatusReport(): string {
    const uptime = Date.now() - this.healthMetrics.lastCheck.getTime();
    const successRate = this.healthMetrics.totalChecks > 0
      ? ((this.healthMetrics.totalChecks - this.healthMetrics.consecutiveFailures) / this.healthMetrics.totalChecks * 100).toFixed(1)
      : '0';

    return `
Frontend Stability Report:
  Status: ${this.healthMetrics.status}
  Response Time: ${this.healthMetrics.responseTime}ms
  Consecutive Failures: ${this.healthMetrics.consecutiveFailures}
  Total Checks: ${this.healthMetrics.totalChecks}
  Success Rate: ${successRate}%
  Circuit Breaker: ${this.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}
  Recovery Attempts: ${this.recoveryAttemptCount}/${this.config.maxRecoveryAttempts}
  Last Error: ${this.healthMetrics.lastError || 'None'}
    `.trim();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('[FrontendStability] Cleaning up resources...');

    this.stopMonitoring();

    if (this.frontendProcess && !this.frontendProcess.killed) {
      this.frontendProcess.kill('SIGTERM');
      await sleep(3000);
      if (!this.frontendProcess.killed) {
        this.frontendProcess.kill('SIGKILL');
      }
    }

    console.log('[FrontendStability] Cleanup complete');
  }
}

export default FrontendStabilityManager;