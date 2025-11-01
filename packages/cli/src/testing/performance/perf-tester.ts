/**
 * Performance Testing Framework
 * Measures and benchmarks hook execution performance
 */

import { performance } from 'perf_hooks';

export interface PerformanceBenchmark {
  name: string;
  iterations: number;
  avgExecutionTime: number;
  minExecutionTime: number;
  maxExecutionTime: number;
  p50ExecutionTime: number;
  p95ExecutionTime: number;
  p99ExecutionTime: number;
  totalExecutionTime: number;
  passRate: number; // Percentage of iterations under maxTime threshold
}

export interface PerformanceTestOptions {
  hook: Function;
  iterations?: number;
  warmupIterations?: number;
  maxExecutionTime?: number; // ms - threshold for pass/fail
  context?: any;
}

export class PerformanceTester {
  /**
   * Run performance benchmark on hook
   */
  static async benchmark(options: PerformanceTestOptions): Promise<PerformanceBenchmark> {
    const {
      hook,
      iterations = 100,
      warmupIterations = 10,
      maxExecutionTime = 5000,
      context = {}
    } = options;

    const times: number[] = [];
    let passCount = 0;

    // Warmup runs to stabilize JIT compilation
    for (let i = 0; i < warmupIterations; i++) {
      try {
        const start = performance.now();
        await hook(context);
        const end = performance.now();
        // Discard warmup times
      } catch (e) {
        // Ignore warmup errors
      }
    }

    // Actual benchmark runs
    for (let i = 0; i < iterations; i++) {
      try {
        const start = performance.now();
        await hook(context);
        const end = performance.now();
        const duration = end - start;

        times.push(duration);
        if (duration <= maxExecutionTime) {
          passCount++;
        }
      } catch (error) {
        console.error(`Iteration ${i} failed:`, error);
        times.push(Infinity); // Count failures as infinite time
      }
    }

    // Calculate statistics
    times.sort((a, b) => a - b);
    const avgExecutionTime = times.reduce((a, b) => a + b, 0) / times.length;
    const totalExecutionTime = times.reduce((a, b) => a + b, 0);
    const minExecutionTime = times[0];
    const maxTime = times[times.length - 1];
    const p50ExecutionTime = times[Math.floor(times.length * 0.5)];
    const p95ExecutionTime = times[Math.floor(times.length * 0.95)];
    const p99ExecutionTime = times[Math.floor(times.length * 0.99)];
    const passRate = (passCount / iterations) * 100;

    return {
      name: hook.name || 'unnamed_hook',
      iterations,
      avgExecutionTime,
      minExecutionTime,
      maxExecutionTime: maxTime,
      p50ExecutionTime,
      p95ExecutionTime,
      p99ExecutionTime,
      totalExecutionTime,
      passRate
    };
  }

  /**
   * Compare performance between two hook implementations
   */
  static async compare(
    hookA: Function,
    hookB: Function,
    context?: any
  ): Promise<{
    hookA: PerformanceBenchmark;
    hookB: PerformanceBenchmark;
    improvement: number; // Percentage improvement of B over A
  }> {
    const benchmarkA = await this.benchmark({
      hook: hookA,
      iterations: 100,
      context
    });

    const benchmarkB = await this.benchmark({
      hook: hookB,
      iterations: 100,
      context
    });

    const improvement = ((benchmarkA.avgExecutionTime - benchmarkB.avgExecutionTime) /
      benchmarkA.avgExecutionTime) * 100;

    return {
      hookA: benchmarkA,
      hookB: benchmarkB,
      improvement
    };
  }

  /**
   * Detect performance regressions
   */
  static async detectRegression(
    hook: Function,
    baselineBenchmark: PerformanceBenchmark,
    context?: any,
    regressionThreshold: number = 10 // 10% slower = regression
  ): Promise<{
    isRegression: boolean;
    change: number; // Percentage change
    baseline: PerformanceBenchmark;
    current: PerformanceBenchmark;
  }> {
    const currentBenchmark = await this.benchmark({
      hook,
      iterations: 50,
      context
    });

    const change = ((currentBenchmark.avgExecutionTime - baselineBenchmark.avgExecutionTime) /
      baselineBenchmark.avgExecutionTime) * 100;

    return {
      isRegression: change > regressionThreshold,
      change,
      baseline: baselineBenchmark,
      current: currentBenchmark
    };
  }

  /**
   * Profile memory usage during hook execution
   */
  static async profileMemory(
    hook: Function,
    iterations: number = 10,
    context?: any
  ): Promise<{
    avgMemoryUsed: number;
    peakMemoryUsed: number;
    totalAllocations: number;
  }> {
    if (global.gc) {
      global.gc();
    }

    let peakMemoryUsed = 0;
    let totalAllocations = 0;

    const initialMemory = process.memoryUsage().heapUsed;

    for (let i = 0; i < iterations; i++) {
      const beforeMemory = process.memoryUsage().heapUsed;
      await hook(context);
      const afterMemory = process.memoryUsage().heapUsed;
      const allocated = Math.max(0, afterMemory - beforeMemory);

      peakMemoryUsed = Math.max(peakMemoryUsed, allocated);
      totalAllocations += allocated;

      if (global.gc) {
        global.gc();
      }
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const avgMemoryUsed = totalAllocations / iterations;

    return {
      avgMemoryUsed,
      peakMemoryUsed,
      totalAllocations
    };
  }
}

export default PerformanceTester;
