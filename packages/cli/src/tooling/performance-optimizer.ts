/**
 * Performance Optimizer for MES Plugin CLI
 * Implements caching strategies, parallel execution, and startup optimization
 */

import { performance } from 'perf_hooks';

export interface OptimizationMetrics {
  startupTime: number;
  buildTime: number;
  testExecutionTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  bundleSize: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface ParallelExecutionResult<T> {
  results: T[];
  totalTime: number;
  parallelism: number;
  successCount: number;
  failureCount: number;
}

/**
 * Multi-purpose cache for optimization
 */
export class OptimizationCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private hits = 0;
  private misses = 0;

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    entry.hits++;
    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with TTL
   */
  set(key: string, value: T, ttl: number = 3600000): void {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl,
      hits: 0
    });
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp
    }));

    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total === 0 ? 0 : (this.hits / total) * 100,
      entries
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}

/**
 * Parallel execution optimizer
 */
export class ParallelExecutor {
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 4) {
    this.maxConcurrency = Math.max(1, Math.min(maxConcurrency, require('os').cpus().length));
  }

  /**
   * Execute async tasks in parallel with concurrency limit
   */
  async execute<T>(
    tasks: Array<() => Promise<T>>,
    options: { timeout?: number; stopOnError?: boolean } = {}
  ): Promise<ParallelExecutionResult<T>> {
    const startTime = performance.now();
    const results: T[] = [];
    let successCount = 0;
    let failureCount = 0;
    const errors: Error[] = [];

    const queue = [...tasks];
    const active: Promise<void>[] = [];

    const executeTask = async (task: () => Promise<T>) => {
      try {
        const result = await this.withTimeout(task(), options.timeout);
        results.push(result);
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push(error instanceof Error ? error : new Error(String(error)));

        if (options.stopOnError) {
          throw error;
        }
      }
    };

    while (queue.length > 0 || active.length > 0) {
      while (active.length < this.maxConcurrency && queue.length > 0) {
        const task = queue.shift()!;
        const promise = executeTask(task).then(() => {
          const idx = active.indexOf(promise);
          if (idx > -1) active.splice(idx, 1);
        });
        active.push(promise);
      }

      if (active.length > 0) {
        await Promise.race(active);
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      results,
      totalTime,
      parallelism: this.maxConcurrency,
      successCount,
      failureCount
    };
  }

  /**
   * Execute with timeout
   */
  private withTimeout<T>(promise: Promise<T>, timeout?: number): Promise<T> {
    if (!timeout) return promise;

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), timeout)
      )
    ]);
  }
}

/**
 * Bundle size analyzer and optimizer
 */
export class BundleSizeAnalyzer {
  /**
   * Analyze bundle for optimization opportunities
   */
  static async analyze(bundlePath: string): Promise<{
    totalSize: number;
    gzipSize: number;
    largestModules: Array<{ name: string; size: number; percentage: number }>;
    optimization_suggestions: string[];
  }> {
    const fs = await import('fs').then(m => m.promises);
    const zlib = await import('zlib').then(m => m.promisify(m.gzip));

    try {
      const content = await fs.readFile(bundlePath);
      const gzipped = await zlib(content);

      return {
        totalSize: content.length,
        gzipSize: gzipped.length,
        largestModules: [],
        optimization_suggestions: [
          'Use tree-shaking: Remove unused code with ES6 imports',
          'Enable minification in production builds',
          'Consider code splitting for large applications',
          'Lazy-load non-critical features',
          'Remove or replace large dependencies'
        ]
      };
    } catch (error) {
      return {
        totalSize: 0,
        gzipSize: 0,
        largestModules: [],
        optimization_suggestions: []
      };
    }
  }
}

/**
 * Startup time optimizer
 */
export class StartupOptimizer {
  private cache: OptimizationCache<any>;
  private loadTime: Map<string, number> = new Map();

  constructor() {
    this.cache = new OptimizationCache();
  }

  /**
   * Measure and optimize startup phase
   */
  async measureStartup<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();

    // Check cache
    const cached = this.cache.get(`startup:${name}`);
    if (cached) {
      return { result: cached, duration: 0 };
    }

    const result = await fn();
    const duration = performance.now() - start;

    // Cache for next startup (10 minutes TTL)
    this.cache.set(`startup:${name}`, result, 600000);

    this.loadTime.set(name, duration);
    return { result, duration };
  }

  /**
   * Get startup metrics
   */
  getMetrics(): {
    totalTime: number;
    phases: Array<{ name: string; duration: number; percentage: number }>;
    optimization_opportunities: string[];
  } {
    const totalTime = Array.from(this.loadTime.values()).reduce((a, b) => a + b, 0);
    const phases = Array.from(this.loadTime.entries())
      .map(([name, duration]) => ({
        name,
        duration,
        percentage: (duration / totalTime) * 100
      }))
      .sort((a, b) => b.duration - a.duration);

    const slowPhases = phases.filter(p => p.percentage > 20);
    const optimization_opportunities = slowPhases.map(
      p => `Phase "${p.name}" takes ${p.percentage.toFixed(1)}% of startup time`
    );

    return {
      totalTime,
      phases,
      optimization_opportunities
    };
  }
}

/**
 * Memory optimization tracker
 */
export class MemoryOptimizer {
  private snapshots: Array<{ timestamp: number; heapUsed: number }> = [];

  /**
   * Record memory snapshot
   */
  snapshot(): number {
    if (typeof gc !== 'undefined') {
      gc();
    }

    const heapUsed = process.memoryUsage().heapUsed;
    this.snapshots.push({ timestamp: Date.now(), heapUsed });
    return heapUsed;
  }

  /**
   * Get memory optimization report
   */
  getReport(): {
    current: number;
    peak: number;
    average: number;
    trend: 'stable' | 'growing' | 'shrinking';
    recommendations: string[];
  } {
    if (this.snapshots.length === 0) {
      return {
        current: 0,
        peak: 0,
        average: 0,
        trend: 'stable',
        recommendations: []
      };
    }

    const latest = this.snapshots[this.snapshots.length - 1];
    const peak = Math.max(...this.snapshots.map(s => s.heapUsed));
    const average = this.snapshots.reduce((sum, s) => sum + s.heapUsed, 0) / this.snapshots.length;

    // Determine trend
    let trend: 'stable' | 'growing' | 'shrinking' = 'stable';
    if (this.snapshots.length > 2) {
      const recent = this.snapshots.slice(-3);
      const older = this.snapshots.slice(-6, -3);

      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
        const olderAvg = older.reduce((sum, s) => sum + s.heapUsed, 0) / older.length;

        const growth = ((recentAvg - olderAvg) / olderAvg) * 100;
        if (growth > 5) trend = 'growing';
        else if (growth < -5) trend = 'shrinking';
      }
    }

    const recommendations: string[] = [];
    if (trend === 'growing') {
      recommendations.push('Memory usage is increasing - check for memory leaks');
      recommendations.push('Profile with MemoryAnalyzer to identify leaks');
    }
    if (peak > 200 * 1024 * 1024) {
      recommendations.push('Peak memory usage exceeds 200MB - consider optimization');
    }

    return {
      current: latest.heapUsed,
      peak,
      average,
      trend,
      recommendations
    };
  }

  /**
   * Clear snapshots
   */
  clear(): void {
    this.snapshots = [];
  }
}

/**
 * Build cache for incremental builds
 */
export class BuildCache {
  private cache: Map<string, { hash: string; result: any; timestamp: number }> = new Map();
  private hashCache: Map<string, string> = new Map();

  /**
   * Compute hash of input
   */
  private async computeHash(input: string): Promise<string> {
    if (this.hashCache.has(input)) {
      return this.hashCache.get(input)!;
    }

    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
    this.hashCache.set(input, hash);
    return hash;
  }

  /**
   * Get cached build result
   */
  async get(key: string, input: string): Promise<any | null> {
    const hash = await this.computeHash(input);
    const entry = this.cache.get(key);

    if (!entry || entry.hash !== hash) {
      return null;
    }

    return entry.result;
  }

  /**
   * Store build result in cache
   */
  async set(key: string, input: string, result: any): Promise<void> {
    const hash = await this.computeHash(input);
    this.cache.set(key, {
      hash,
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hashCache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ key: string; age: number }> } {
    const now = Date.now();
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: now - entry.timestamp
      }))
    };
  }
}

export default {
  OptimizationCache,
  ParallelExecutor,
  BundleSizeAnalyzer,
  StartupOptimizer,
  MemoryOptimizer,
  BuildCache
};
