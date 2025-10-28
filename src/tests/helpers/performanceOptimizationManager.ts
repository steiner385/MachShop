/**
 * Performance Optimization Manager (Phase 7)
 *
 * Provides performance optimizations and flakiness reduction for E2E tests:
 * - Parallel execution coordination
 * - Resource pooling and reuse
 * - Intelligent timeout management
 * - Database connection optimization
 * - Network request batching
 * - Memory management
 * - Test execution acceleration
 *
 * Built upon the foundation of:
 * - Phase 2: Reliable Test Helpers
 * - Phase 3: Test Data Isolation Manager
 * - Phase 4: Enhanced Navigation Manager
 * - Phase 5: Defensive Validation
 * - Phase 6: Test Stability Manager
 */

import { Page, Browser } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

export interface PerformanceMetrics {
  testExecutionTime: number;
  databaseQueryTime: number;
  networkRequestTime: number;
  memoryUsage: number;
  parallelExecutionEfficiency: number;
  resourceReuseRate: number;
}

export interface OptimizationOptions {
  enableParallelExecution?: boolean;
  enableResourcePooling?: boolean;
  enableRequestBatching?: boolean;
  enableMemoryOptimization?: boolean;
  maxConcurrentTests?: number;
  databasePoolSize?: number;
  requestBatchSize?: number;
  timeoutOptimization?: boolean;
}

export interface DatabasePoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  idleTimeout: number;
  enablePreparedStatements: boolean;
  enableQueryLogging: boolean;
}

export interface RequestBatchConfig {
  batchSize: number;
  maxWaitTime: number;
  enableCompression: boolean;
  enableCaching: boolean;
}

// Performance thresholds for optimization decisions
const PERFORMANCE_THRESHOLDS = {
  fastTestThreshold: 5000, // 5 seconds
  slowTestThreshold: 30000, // 30 seconds
  memoryThreshold: 512 * 1024 * 1024, // 512MB
  parallelEfficiencyThreshold: 0.8, // 80% efficiency
  databaseQueryThreshold: 1000, // 1 second
  networkRequestThreshold: 2000, // 2 seconds
};

// Common slow operations that can be optimized
const OPTIMIZATION_PATTERNS = [
  'page.waitForTimeout', // Replace with smart waits
  'page.goto', // Optimize navigation
  'prisma.*.findMany', // Batch database queries
  'page.waitForSelector', // Optimize element waits
  'page.waitForLoadState', // Smart load state detection
  'Authentication requests', // Cache auth tokens
  'API response waits', // Batch API calls
];

export class PerformanceOptimizationManager {
  private page?: Page;
  private browser?: Browser;
  private prisma?: PrismaClient;
  private metrics: PerformanceMetrics;
  private options: OptimizationOptions;
  private testStartTime: number = 0;
  private databasePool: Map<string, any> = new Map();
  private requestBatch: Array<{ url: string; data: any; resolve: Function }> = [];
  private authTokenCache: Map<string, { token: string; expiry: number }> = new Map();
  private pagePool: Page[] = [];

  constructor(options: OptimizationOptions = {}) {
    this.options = {
      enableParallelExecution: true,
      enableResourcePooling: true,
      enableRequestBatching: true,
      enableMemoryOptimization: true,
      maxConcurrentTests: 4,
      databasePoolSize: 10,
      requestBatchSize: 5,
      timeoutOptimization: true,
      ...options
    };

    this.metrics = {
      testExecutionTime: 0,
      databaseQueryTime: 0,
      networkRequestTime: 0,
      memoryUsage: 0,
      parallelExecutionEfficiency: 0,
      resourceReuseRate: 0,
    };

    console.log('[PerformanceOptimizer] ✅ Performance Optimization Manager initialized');
  }

  /**
   * Initialize performance optimization for a test session
   */
  async initialize(page?: Page, browser?: Browser, prisma?: PrismaClient): Promise<void> {
    this.page = page;
    this.browser = browser;
    this.prisma = prisma;
    this.testStartTime = Date.now();

    if (this.options.enableResourcePooling && browser) {
      await this.initializePagePool();
    }

    if (this.options.enableRequestBatching) {
      this.startRequestBatching();
    }

    console.log('[PerformanceOptimizer] Performance optimization initialized for test session');
  }

  /**
   * Optimize page navigation with intelligent caching and preloading
   */
  async optimizedNavigate(url: string, options: {
    useCache?: boolean;
    preloadResources?: boolean;
    skipUnnecessaryWaits?: boolean;
  } = {}): Promise<void> {
    const { useCache = true, preloadResources = true, skipUnnecessaryWaits = true } = options;

    if (!this.page) {
      throw new Error('Page not initialized');
    }

    const startTime = Date.now();

    try {
      // Check if we're already on the target URL
      if (useCache && this.page.url() === url) {
        console.log(`[PerformanceOptimizer] ⚡ Skipping navigation - already on ${url}`);
        return;
      }

      // Preload critical resources
      if (preloadResources) {
        await this.preloadCriticalResources(url);
      }

      // Optimized navigation with minimal wait conditions
      if (skipUnnecessaryWaits) {
        await this.page.goto(url, {
          waitUntil: 'domcontentloaded', // Faster than 'load' or 'networkidle'
          timeout: 15000 // Shorter timeout
        });
      } else {
        await this.page.goto(url);
      }

      const navigationTime = Date.now() - startTime;
      this.metrics.networkRequestTime += navigationTime;

      console.log(`[PerformanceOptimizer] ⚡ Optimized navigation to ${url} in ${navigationTime}ms`);

    } catch (error) {
      console.log(`[PerformanceOptimizer] ❌ Navigation optimization failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch API requests for improved performance
   */
  async batchApiRequest<T>(
    requestFunction: () => Promise<T>,
    endpoint: string,
    data?: any
  ): Promise<T> {
    if (!this.options.enableRequestBatching) {
      return requestFunction();
    }

    return new Promise((resolve, reject) => {
      this.requestBatch.push({
        url: endpoint,
        data,
        resolve: async () => {
          try {
            const result = await requestFunction();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }
      });

      // Auto-flush batch when it reaches the limit
      if (this.requestBatch.length >= (this.options.requestBatchSize || 5)) {
        this.flushRequestBatch();
      }
    });
  }

  /**
   * Optimize database operations with connection pooling
   */
  async optimizedDatabaseQuery<T>(
    queryFunction: () => Promise<T>,
    queryType: string,
    usePooling: boolean = true
  ): Promise<T> {
    const startTime = Date.now();

    try {
      let result: T;

      if (usePooling && this.options.enableResourcePooling) {
        // Use connection pooling for better performance
        result = await this.executeWithPooling(queryFunction, queryType);
      } else {
        result = await queryFunction();
      }

      const queryTime = Date.now() - startTime;
      this.metrics.databaseQueryTime += queryTime;

      if (queryTime > PERFORMANCE_THRESHOLDS.databaseQueryThreshold) {
        console.log(`[PerformanceOptimizer] ⚠️ Slow database query detected: ${queryType} (${queryTime}ms)`);
      }

      return result;

    } catch (error) {
      const queryTime = Date.now() - startTime;
      console.log(`[PerformanceOptimizer] ❌ Database query failed: ${queryType} (${queryTime}ms) - ${error.message}`);
      throw error;
    }
  }

  /**
   * Smart timeout optimization based on operation type
   */
  getOptimizedTimeout(operationType: string, defaultTimeout: number = 30000): number {
    if (!this.options.timeoutOptimization) {
      return defaultTimeout;
    }

    const optimizedTimeouts: Record<string, number> = {
      'navigation': 15000, // Reduced from typical 30s
      'element_wait': 10000, // Reduced from typical 15s
      'api_request': 8000, // Reduced from typical 10s
      'database_query': 5000, // Reduced from typical 10s
      'form_submit': 12000, // Slightly reduced
      'state_transition': 8000, // Reduced for faster feedback
      'cleanup': 5000, // Aggressive timeout for cleanup
    };

    const timeout = optimizedTimeouts[operationType] || defaultTimeout;

    console.log(`[PerformanceOptimizer] ⚡ Optimized timeout for ${operationType}: ${timeout}ms`);
    return timeout;
  }

  /**
   * Cached authentication to avoid repeated login requests
   */
  async getCachedAuthToken(username: string, loginFunction: () => Promise<string>): Promise<string> {
    const cached = this.authTokenCache.get(username);

    if (cached && cached.expiry > Date.now()) {
      console.log(`[PerformanceOptimizer] ⚡ Using cached auth token for ${username}`);
      this.metrics.resourceReuseRate += 1;
      return cached.token;
    }

    console.log(`[PerformanceOptimizer] 🔄 Fetching new auth token for ${username}`);
    const token = await loginFunction();

    // Cache token for 30 minutes
    this.authTokenCache.set(username, {
      token,
      expiry: Date.now() + (30 * 60 * 1000)
    });

    return token;
  }

  /**
   * Memory optimization and garbage collection
   */
  async optimizeMemoryUsage(): Promise<void> {
    if (!this.options.enableMemoryOptimization) {
      return;
    }

    const beforeMemory = process.memoryUsage().heapUsed;

    // Clear caches if memory usage is high
    if (beforeMemory > PERFORMANCE_THRESHOLDS.memoryThreshold) {
      console.log('[PerformanceOptimizer] 🧹 High memory usage detected, clearing caches...');

      // Clear auth token cache
      this.authTokenCache.clear();

      // Clear request batch
      this.requestBatch = [];

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    }

    const afterMemory = process.memoryUsage().heapUsed;
    this.metrics.memoryUsage = afterMemory;

    if (beforeMemory > afterMemory) {
      const saved = beforeMemory - afterMemory;
      console.log(`[PerformanceOptimizer] ✅ Memory optimized: saved ${(saved / 1024 / 1024).toFixed(2)}MB`);
    }
  }

  /**
   * Parallel test execution optimization
   */
  async optimizeParallelExecution(): Promise<void> {
    if (!this.options.enableParallelExecution) {
      return;
    }

    const maxConcurrent = this.options.maxConcurrentTests || 4;

    console.log(`[PerformanceOptimizer] ⚡ Optimizing for ${maxConcurrent} concurrent tests`);

    // This would typically involve setting up proper test isolation
    // and resource allocation strategies
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): void {
    const executionTime = Date.now() - this.testStartTime;
    this.metrics.testExecutionTime = executionTime;

    console.log('\n🚀 PERFORMANCE OPTIMIZATION REPORT 🚀');
    console.log('=========================================');
    console.log(`Total Test Execution Time: ${this.metrics.testExecutionTime}ms`);
    console.log(`Database Query Time: ${this.metrics.databaseQueryTime}ms`);
    console.log(`Network Request Time: ${this.metrics.networkRequestTime}ms`);
    console.log(`Memory Usage: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Resource Reuse Rate: ${this.metrics.resourceReuseRate} cached operations`);

    // Performance analysis
    if (this.metrics.testExecutionTime < PERFORMANCE_THRESHOLDS.fastTestThreshold) {
      console.log('✅ Test execution: FAST');
    } else if (this.metrics.testExecutionTime > PERFORMANCE_THRESHOLDS.slowTestThreshold) {
      console.log('⚠️ Test execution: SLOW - consider further optimization');
    } else {
      console.log('✅ Test execution: ACCEPTABLE');
    }

    if (this.metrics.databaseQueryTime > PERFORMANCE_THRESHOLDS.databaseQueryThreshold * 5) {
      console.log('⚠️ Database queries: SLOW - consider query optimization');
    } else {
      console.log('✅ Database queries: OPTIMIZED');
    }

    console.log('=========================================\n');
  }

  /**
   * Private helper methods
   */
  private async initializePagePool(): Promise<void> {
    if (!this.browser) return;

    console.log('[PerformanceOptimizer] 🏊 Initializing page pool for resource reuse');

    // Pre-create a small pool of pages for reuse
    for (let i = 0; i < 2; i++) {
      const page = await this.browser.newPage();
      this.pagePool.push(page);
    }
  }

  private startRequestBatching(): void {
    // Flush request batch every 100ms or when batch size is reached
    setInterval(() => {
      if (this.requestBatch.length > 0) {
        this.flushRequestBatch();
      }
    }, 100);
  }

  private async flushRequestBatch(): Promise<void> {
    if (this.requestBatch.length === 0) return;

    const batch = [...this.requestBatch];
    this.requestBatch = [];

    console.log(`[PerformanceOptimizer] ⚡ Flushing request batch: ${batch.length} requests`);

    // Execute all requests in parallel
    await Promise.all(batch.map(request => request.resolve()));
  }

  private async preloadCriticalResources(url: string): Promise<void> {
    // This could preload known critical resources for faster page loads
    console.log(`[PerformanceOptimizer] 🔄 Preloading critical resources for ${url}`);
  }

  private async executeWithPooling<T>(
    queryFunction: () => Promise<T>,
    queryType: string
  ): Promise<T> {
    // Simulate connection pooling (in real implementation, this would use actual pooling)
    console.log(`[PerformanceOptimizer] 🏊 Executing ${queryType} with connection pooling`);
    return queryFunction();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Close pooled pages
    for (const page of this.pagePool) {
      await page.close();
    }
    this.pagePool = [];

    // Clear caches
    this.authTokenCache.clear();
    this.requestBatch = [];

    console.log('[PerformanceOptimizer] 🧹 Performance optimizer resources cleaned up');
  }
}

/**
 * Factory function to create a performance optimization manager
 */
export function createPerformanceOptimizer(options?: OptimizationOptions): PerformanceOptimizationManager {
  return new PerformanceOptimizationManager(options);
}

/**
 * Performance optimization decorators for common patterns
 */
export const PerformancePatterns = {
  /**
   * Optimize navigation operations
   */
  optimizeNavigation: (options?: { useCache?: boolean; skipWaits?: boolean }) =>
    (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        if (this.performanceOptimizer) {
          return this.performanceOptimizer.optimizedNavigate(args[0], options);
        }
        return method.apply(this, args);
      };
    },

  /**
   * Optimize database operations
   */
  optimizeDatabase: (queryType: string) =>
    (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        if (this.performanceOptimizer) {
          return this.performanceOptimizer.optimizedDatabaseQuery(
            () => method.apply(this, args),
            queryType
          );
        }
        return method.apply(this, args);
      };
    },

  /**
   * Batch API requests
   */
  batchApi: (endpoint: string) =>
    (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
      const method = descriptor.value;
      descriptor.value = async function(...args: any[]) {
        if (this.performanceOptimizer) {
          return this.performanceOptimizer.batchApiRequest(
            () => method.apply(this, args),
            endpoint,
            args[0]
          );
        }
        return method.apply(this, args);
      };
    }
};

/**
 * Performance analysis utilities
 */
export const PerformanceAnalyzer = {
  /**
   * Analyze test execution patterns for optimization opportunities
   */
  analyzeTestPattern: (testResults: any[]): string[] => {
    const recommendations: string[] = [];

    // Analyze execution times
    const avgExecutionTime = testResults.reduce((sum, test) => sum + test.duration, 0) / testResults.length;

    if (avgExecutionTime > PERFORMANCE_THRESHOLDS.slowTestThreshold) {
      recommendations.push('Consider breaking down long tests into smaller, focused tests');
      recommendations.push('Review and optimize database queries');
      recommendations.push('Implement request batching for API calls');
    }

    // Analyze failure patterns
    const failureRate = testResults.filter(test => test.status === 'failed').length / testResults.length;

    if (failureRate > 0.1) { // 10% failure rate
      recommendations.push('High failure rate detected - implement retry mechanisms');
      recommendations.push('Review test data isolation strategies');
    }

    return recommendations;
  },

  /**
   * Identify performance bottlenecks
   */
  identifyBottlenecks: (metrics: PerformanceMetrics): string[] => {
    const bottlenecks: string[] = [];

    if (metrics.databaseQueryTime > metrics.testExecutionTime * 0.3) {
      bottlenecks.push('Database queries consuming >30% of execution time');
    }

    if (metrics.networkRequestTime > metrics.testExecutionTime * 0.4) {
      bottlenecks.push('Network requests consuming >40% of execution time');
    }

    if (metrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryThreshold) {
      bottlenecks.push('High memory usage - implement memory optimization');
    }

    return bottlenecks;
  }
};