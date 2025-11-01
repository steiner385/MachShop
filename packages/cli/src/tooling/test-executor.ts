/**
 * Optimized Test Executor with Parallel Execution Support
 * Manages test execution with smart sharding and parallel workers
 */

import { performance } from 'perf_hooks';

export interface TestFile {
  path: string;
  estimatedTime?: number;
  priority?: number;
  dependencies?: string[];
}

export interface TestShardConfig {
  workerCount: number;
  timeout: number;
  retryFailures: boolean;
  maxRetries: number;
  bail: boolean; // Stop on first failure
}

export interface TestExecutionPlan {
  shards: TestFile[][];
  totalTime: number;
  balanceScore: number; // How evenly distributed (0-100)
  recommendations: string[];
}

export interface TestResult {
  file: string;
  passed: boolean;
  duration: number;
  tests: number;
  failures: number;
  skipped: number;
  error?: string;
}

export interface ShardExecutionResult {
  results: TestResult[];
  totalTime: number;
  passRate: number;
  failedTests: TestResult[];
  skippedCount: number;
}

/**
 * Intelligent test sharding and execution planning
 */
export class TestExecutor {
  private fileMetrics: Map<string, { time: number; tests: number; failures: number }> = new Map();
  private history: TestResult[] = [];

  /**
   * Create optimal test execution plan
   */
  createExecutionPlan(files: TestFile[], config: TestShardConfig): TestExecutionPlan {
    // Estimate execution times based on history
    const estimatedFiles = files.map(file => ({
      ...file,
      estimatedTime: this.estimateTime(file)
    }));

    // Sort by estimated time (longest first) for better load balancing
    const sorted = [...estimatedFiles].sort((a, b) => (b.estimatedTime || 0) - (a.estimatedTime || 0));

    // Create shards using greedy bin packing
    const shards = this.createShards(sorted, config.workerCount);
    const balanceScore = this.calculateBalanceScore(shards);
    const totalTime = Math.max(...shards.map(shard => this.calculateShardTime(shard)));

    const recommendations: string[] = [];
    if (balanceScore < 70) {
      recommendations.push('Test distribution is uneven - consider adjusting test weights');
    }
    if (totalTime > 30000) {
      recommendations.push('Test execution time exceeds 30 seconds - consider splitting slow tests');
    }

    return {
      shards,
      totalTime,
      balanceScore,
      recommendations
    };
  }

  /**
   * Estimate execution time for a test file
   */
  private estimateTime(file: TestFile): number {
    if (file.estimatedTime) return file.estimatedTime;

    // Check history
    const metric = this.fileMetrics.get(file.path);
    if (metric) {
      return metric.time;
    }

    // Default estimate: 1000ms per file
    return 1000;
  }

  /**
   * Create shards using greedy bin packing
   */
  private createShards(files: TestFile[], workerCount: number): TestFile[][] {
    const shards: TestFile[][] = Array(workerCount)
      .fill(null)
      .map(() => []);
    const shardTimes: number[] = Array(workerCount).fill(0);

    for (const file of files) {
      const time = this.estimateTime(file);
      const minIdx = shardTimes.indexOf(Math.min(...shardTimes));
      shards[minIdx].push(file);
      shardTimes[minIdx] += time;
    }

    return shards;
  }

  /**
   * Calculate total time for a shard
   */
  private calculateShardTime(shard: TestFile[]): number {
    return shard.reduce((sum, file) => sum + this.estimateTime(file), 0);
  }

  /**
   * Calculate load balance score (0-100)
   */
  private calculateBalanceScore(shards: TestFile[][]): number {
    const times = shards.map(shard => this.calculateShardTime(shard));
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
    const stdDev = Math.sqrt(variance);

    // Convert to 0-100 score (lower deviation = higher score)
    const maxDev = avg * 0.5; // Allow 50% deviation
    const score = Math.max(0, 100 - (stdDev / maxDev) * 100);
    return Math.round(score);
  }

  /**
   * Record test result for future estimation
   */
  recordResult(result: TestResult): void {
    this.history.push(result);
    this.fileMetrics.set(result.file, {
      time: result.duration,
      tests: result.tests,
      failures: result.failures
    });
  }

  /**
   * Get metrics for optimization
   */
  getMetrics(): {
    totalRuns: number;
    averageTime: number;
    slowestTests: TestResult[];
    mostFailedTests: TestResult[];
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const slowest = [...this.history].sort((a, b) => b.duration - a.duration).slice(0, 5);
    const mostFailed = [...this.history]
      .filter(r => r.failures > 0)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 5);

    if (slowest.length > 0 && slowest[0].duration > 5000) {
      recommendations.push(`"${slowest[0].file}" takes ${(slowest[0].duration / 1000).toFixed(1)}s - consider splitting or optimizing`);
    }

    if (mostFailed.length > 0) {
      recommendations.push(`"${mostFailed[0].file}" fails most frequently (${mostFailed[0].failures} times) - review flakiness`);
    }

    const avgTime =
      this.history.length > 0 ? this.history.reduce((sum, r) => sum + r.duration, 0) / this.history.length : 0;

    return {
      totalRuns: this.history.length,
      averageTime: avgTime,
      slowestTests: slowest,
      mostFailedTests: mostFailed,
      recommendations
    };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }
}

/**
 * Smart retry handler for flaky tests
 */
export class TestRetryHandler {
  private retryHistory: Map<string, { attempts: number; lastPass: number }> = new Map();

  /**
   * Determine if test should be retried
   */
  shouldRetry(testFile: string, failureCount: number, maxRetries: number): boolean {
    if (failureCount >= maxRetries) return false;

    const history = this.retryHistory.get(testFile);
    if (!history) return true;

    // Avoid retrying tests that consistently fail
    if (history.attempts > 5 && history.lastPass < Date.now() - 3600000) {
      // Last passed more than 1 hour ago
      return false;
    }

    return true;
  }

  /**
   * Record retry attempt
   */
  recordAttempt(testFile: string, passed: boolean): void {
    const history = this.retryHistory.get(testFile) || { attempts: 0, lastPass: 0 };
    history.attempts++;
    if (passed) {
      history.lastPass = Date.now();
    }
    this.retryHistory.set(testFile, history);
  }

  /**
   * Get retry analysis
   */
  getAnalysis(): {
    flakyTests: Array<{ file: string; failureRate: number; attempts: number }>;
    recommendations: string[];
  } {
    const flakyTests = Array.from(this.retryHistory.entries())
      .map(([file, history]) => ({
        file,
        failureRate: Math.round((history.attempts / Math.max(1, history.lastPass ? 1 : 0)) * 100),
        attempts: history.attempts
      }))
      .filter(t => t.failureRate > 20)
      .sort((a, b) => b.failureRate - a.failureRate);

    const recommendations = flakyTests.slice(0, 3).map(t => `Test "${t.file}" is flaky (${t.failureRate}% failure rate) - needs investigation`);

    return { flakyTests, recommendations };
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.retryHistory.clear();
  }
}

/**
 * Test performance analyzer
 */
export class TestPerformanceAnalyzer {
  /**
   * Analyze test performance and generate report
   */
  static generateReport(results: TestResult[]): {
    summary: {
      total: number;
      passed: number;
      failed: number;
      skipped: number;
      totalTime: number;
      averageTime: number;
    };
    slowest: TestResult[];
    fastest: TestResult[];
    optimization_suggestions: string[];
  } {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const skipped = results.reduce((sum, r) => sum + (r.skipped || 0), 0);
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    const averageTime = total > 0 ? totalTime / total : 0;

    const slowest = [...results].sort((a, b) => b.duration - a.duration).slice(0, 5);
    const fastest = [...results].sort((a, b) => a.duration - b.duration).slice(0, 5);

    const optimization_suggestions: string[] = [];

    if (slowest[0] && slowest[0].duration > 3000) {
      optimization_suggestions.push(
        `"${slowest[0].file}" is slowest (${(slowest[0].duration / 1000).toFixed(1)}s) - consider parallelizing or breaking into smaller tests`
      );
    }

    if (failed > total * 0.1) {
      optimization_suggestions.push(`${failed} tests failing (${((failed / total) * 100).toFixed(1)}%) - high failure rate suggests test reliability issues`);
    }

    if (totalTime > 30000) {
      optimization_suggestions.push('Total test time exceeds 30 seconds - use parallel execution to reduce feedback time');
    }

    return {
      summary: {
        total,
        passed,
        failed,
        skipped,
        totalTime,
        averageTime
      },
      slowest,
      fastest,
      optimization_suggestions
    };
  }
}

export default {
  TestExecutor,
  TestRetryHandler,
  TestPerformanceAnalyzer
};
