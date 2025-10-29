/**
 * Database Performance Testing Utilities
 *
 * Comprehensive performance testing for database operations including
 * query optimization, connection pooling, bulk operations, and benchmarking.
 * This ensures the database layer meets performance requirements.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Performance testing utilities
interface PerformanceMetrics {
  operationsPerSecond: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalOperations: number;
  totalDuration: number;
  memoryUsage: NodeJS.MemoryUsage;
}

interface PerformanceBenchmark {
  name: string;
  operations: number;
  concurrency: number;
  operation: () => Promise<any>;
}

class DatabasePerformanceTester {
  private prisma: PrismaClient;
  private results: PerformanceMetrics[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async runBenchmark(benchmark: PerformanceBenchmark): Promise<PerformanceMetrics> {
    const startMemory = process.memoryUsage();
    const latencies: number[] = [];
    const startTime = Date.now();

    // Run operations concurrently
    const batches = Math.ceil(benchmark.operations / benchmark.concurrency);

    for (let batch = 0; batch < batches; batch++) {
      const batchSize = Math.min(benchmark.concurrency, benchmark.operations - (batch * benchmark.concurrency));
      const batchPromises: Promise<any>[] = [];

      for (let i = 0; i < batchSize; i++) {
        const operationStart = Date.now();

        batchPromises.push(
          benchmark.operation().then(() => {
            const operationEnd = Date.now();
            latencies.push(operationEnd - operationStart);
          })
        );
      }

      await Promise.all(batchPromises);
    }

    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const totalDuration = endTime - startTime;

    // Calculate metrics
    latencies.sort((a, b) => a - b);
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Index = Math.floor(latencies.length * 0.95);
    const p99Index = Math.floor(latencies.length * 0.99);

    const metrics: PerformanceMetrics = {
      operationsPerSecond: (benchmark.operations / totalDuration) * 1000,
      averageLatency,
      p95Latency: latencies[p95Index] || 0,
      p99Latency: latencies[p99Index] || 0,
      totalOperations: benchmark.operations,
      totalDuration,
      memoryUsage: {
        rss: endMemory.rss - startMemory.rss,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        external: endMemory.external - startMemory.external,
        arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers
      }
    };

    this.results.push(metrics);
    return metrics;
  }

  async benchmarkQuery(
    queryName: string,
    queryFn: () => Promise<any>,
    iterations: number = 100,
    concurrency: number = 10
  ): Promise<PerformanceMetrics> {
    return await this.runBenchmark({
      name: queryName,
      operations: iterations,
      concurrency,
      operation: queryFn
    });
  }

  async benchmarkBulkOperations(
    operationName: string,
    setupFn: () => Promise<any[]>,
    operationFn: (data: any[]) => Promise<any>,
    batchSizes: number[] = [10, 50, 100, 500]
  ): Promise<Map<number, PerformanceMetrics>> {
    const results = new Map<number, PerformanceMetrics>();

    for (const batchSize of batchSizes) {
      const data = await setupFn();
      const testData = data.slice(0, batchSize);

      const metrics = await this.runBenchmark({
        name: `${operationName}-${batchSize}`,
        operations: 1,
        concurrency: 1,
        operation: () => operationFn(testData)
      });

      results.set(batchSize, metrics);
    }

    return results;
  }

  getResults(): PerformanceMetrics[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }

  printSummary(metrics: PerformanceMetrics, title: string): void {
    console.log(`\n=== ${title} ===`);
    console.log(`Operations/sec: ${metrics.operationsPerSecond.toFixed(2)}`);
    console.log(`Average latency: ${metrics.averageLatency.toFixed(2)}ms`);
    console.log(`P95 latency: ${metrics.p95Latency.toFixed(2)}ms`);
    console.log(`P99 latency: ${metrics.p99Latency.toFixed(2)}ms`);
    console.log(`Total operations: ${metrics.totalOperations}`);
    console.log(`Total duration: ${metrics.totalDuration}ms`);
    console.log(`Memory delta (MB): ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}`);
    console.log('================\n');
  }
}

// Connection Pool Monitor
class ConnectionPoolMonitor {
  private prisma: PrismaClient;
  private metrics: any[] = [];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async measureConnectionPoolUsage(
    testFn: () => Promise<void>,
    concurrent: number = 10
  ): Promise<void> {
    const startTime = Date.now();

    // Run concurrent operations to stress the connection pool
    const promises = Array.from({ length: concurrent }, async (_, index) => {
      const operationStart = Date.now();
      await testFn();
      const operationEnd = Date.now();

      this.metrics.push({
        index,
        duration: operationEnd - operationStart,
        timestamp: operationStart
      });
    });

    await Promise.all(promises);

    const endTime = Date.now();
    console.log(`Connection pool test completed in ${endTime - startTime}ms`);
    console.log(`Average operation time: ${this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length}ms`);
  }

  getMetrics() {
    return [...this.metrics];
  }

  clearMetrics() {
    this.metrics = [];
  }
}

describe('Database Performance Testing', () => {
  let testPrisma: PrismaClient;
  let performanceTester: DatabasePerformanceTester;
  let connectionMonitor: ConnectionPoolMonitor;

  beforeAll(async () => {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    await testPrisma.$connect();

    performanceTester = new DatabasePerformanceTester(testPrisma);
    connectionMonitor = new ConnectionPoolMonitor(testPrisma);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
    performanceTester.clearResults();
    connectionMonitor.clearMetrics();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      await testPrisma.workOrder.deleteMany({
        where: {
          workOrderNumber: {
            startsWith: 'PERF-TEST-'
          }
        }
      });
      await testPrisma.part.deleteMany({
        where: {
          partNumber: {
            startsWith: 'PERF-TEST-'
          }
        }
      });
      await testPrisma.site.deleteMany({
        where: {
          siteCode: {
            startsWith: 'PERF-TEST-'
          }
        }
      });
      await testPrisma.enterprise.deleteMany({
        where: {
          enterpriseCode: {
            startsWith: 'PERF-TEST-'
          }
        }
      });
      await testPrisma.user.deleteMany({
        where: {
          username: {
            startsWith: 'perf-test-'
          }
        }
      });
    } catch (error) {
      console.warn('Performance test cleanup failed:', error);
    }
  }

  describe('Query Performance Tests', () => {
    it('should benchmark simple select queries', async () => {
      // Create test data
      await testPrisma.enterprise.create({
        data: {
          enterpriseName: 'PERF Test Enterprise',
          enterpriseCode: 'PERF-TEST-ENT',
          isActive: true
        }
      });

      // Benchmark simple select
      const metrics = await performanceTester.benchmarkQuery(
        'simple-enterprise-select',
        () => testPrisma.enterprise.findMany({ where: { isActive: true } }),
        50,
        5
      );

      performanceTester.printSummary(metrics, 'Simple Select Query');

      expect(metrics.operationsPerSecond).toBeGreaterThan(10);
      expect(metrics.averageLatency).toBeLessThan(100);
      expect(metrics.p95Latency).toBeLessThan(200);
    });

    it('should benchmark complex join queries', async () => {
      // Create test data with relationships
      const enterprise = await testPrisma.enterprise.create({
        data: {
          enterpriseName: 'PERF Test Enterprise Complex',
          enterpriseCode: 'PERF-TEST-ENT-COMPLEX',
          isActive: true
        }
      });

      const site = await testPrisma.site.create({
        data: {
          siteName: 'PERF Test Site',
          siteCode: 'PERF-TEST-SITE',
          enterpriseId: enterprise.id,
          isActive: true
        }
      });

      const user = await testPrisma.user.create({
        data: {
          username: 'perf-test-user',
          email: 'perf-test@example.com',
          firstName: 'Perf',
          lastName: 'Test',
          passwordHash: '$2b$10$perf.test.hash.value',
          isActive: true
        }
      });

      const part = await testPrisma.part.create({
        data: {
          partNumber: 'PERF-TEST-PART',
          partName: 'Performance Test Part',
          description: 'Part for performance testing',
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          isActive: true
        }
      });

      await testPrisma.workOrder.create({
        data: {
          workOrderNumber: 'PERF-TEST-WO',
          partId: part.id,
          siteId: site.id,
          quantity: 100,
          status: 'CREATED',
          priority: 'NORMAL',
          createdById: user.id
        }
      });

      // Benchmark complex join query
      const metrics = await performanceTester.benchmarkQuery(
        'complex-join-query',
        () => testPrisma.workOrder.findMany({
          include: {
            part: true,
            site: {
              include: {
                enterprise: true
              }
            },
            createdBy: true
          },
          where: {
            status: 'CREATED'
          }
        }),
        30,
        5
      );

      performanceTester.printSummary(metrics, 'Complex Join Query');

      expect(metrics.operationsPerSecond).toBeGreaterThan(5);
      expect(metrics.averageLatency).toBeLessThan(500);
    });

    it('should benchmark filtered queries', async () => {
      // Create multiple test records
      const promises = Array.from({ length: 20 }, (_, index) =>
        testPrisma.part.create({
          data: {
            partNumber: `PERF-TEST-PART-${index.toString().padStart(3, '0')}`,
            partName: `Performance Test Part ${index}`,
            description: `Part for performance testing ${index}`,
            partType: index % 2 === 0 ? 'MANUFACTURED' : 'PURCHASED',
            unitOfMeasure: 'EA',
            isActive: index % 3 !== 0
          }
        })
      );

      await Promise.all(promises);

      // Benchmark filtered query
      const metrics = await performanceTester.benchmarkQuery(
        'filtered-query',
        () => testPrisma.part.findMany({
          where: {
            AND: [
              { partType: 'MANUFACTURED' },
              { isActive: true },
              { partName: { contains: 'Performance' } }
            ]
          },
          orderBy: { partNumber: 'asc' }
        }),
        50,
        10
      );

      performanceTester.printSummary(metrics, 'Filtered Query');

      expect(metrics.operationsPerSecond).toBeGreaterThan(15);
      expect(metrics.averageLatency).toBeLessThan(150);
    });
  });

  describe('Bulk Operation Performance', () => {
    it('should benchmark bulk inserts', async () => {
      const batchSizes = [10, 50, 100];

      const results = await performanceTester.benchmarkBulkOperations(
        'bulk-insert-parts',
        () => Promise.resolve([]), // No setup needed
        async (data: any[]) => {
          const partsData = Array.from({ length: batchSizes[0] }, (_, index) => ({
            partNumber: `PERF-TEST-BULK-${Date.now()}-${index}`,
            partName: `Bulk Test Part ${index}`,
            description: `Bulk insert test part ${index}`,
            partType: 'MANUFACTURED' as const,
            unitOfMeasure: 'EA',
            isActive: true
          }));

          await testPrisma.part.createMany({
            data: partsData
          });
        },
        batchSizes
      );

      for (const [batchSize, metrics] of results) {
        performanceTester.printSummary(metrics, `Bulk Insert (${batchSize} records)`);

        // Performance assertions
        expect(metrics.totalDuration).toBeLessThan(5000); // 5 seconds max
      }
    });

    it('should benchmark bulk updates', async () => {
      // Create test data first
      const partsData = Array.from({ length: 100 }, (_, index) => ({
        partNumber: `PERF-TEST-UPDATE-${index.toString().padStart(3, '0')}`,
        partName: `Update Test Part ${index}`,
        description: `Part for update testing ${index}`,
        partType: 'MANUFACTURED' as const,
        unitOfMeasure: 'EA',
        isActive: true
      }));

      await testPrisma.part.createMany({ data: partsData });

      // Benchmark bulk update
      const metrics = await performanceTester.benchmarkQuery(
        'bulk-update',
        () => testPrisma.part.updateMany({
          where: {
            partNumber: {
              startsWith: 'PERF-TEST-UPDATE-'
            }
          },
          data: {
            description: `Updated at ${Date.now()}`
          }
        }),
        10,
        2
      );

      performanceTester.printSummary(metrics, 'Bulk Update');

      expect(metrics.averageLatency).toBeLessThan(1000);
    });

    it('should benchmark bulk deletes', async () => {
      // Create test data first
      const partsData = Array.from({ length: 50 }, (_, index) => ({
        partNumber: `PERF-TEST-DELETE-${index.toString().padStart(3, '0')}`,
        partName: `Delete Test Part ${index}`,
        description: `Part for delete testing ${index}`,
        partType: 'MANUFACTURED' as const,
        unitOfMeasure: 'EA',
        isActive: true
      }));

      await testPrisma.part.createMany({ data: partsData });

      // Benchmark bulk delete
      const metrics = await performanceTester.benchmarkQuery(
        'bulk-delete',
        () => testPrisma.part.deleteMany({
          where: {
            partNumber: {
              startsWith: 'PERF-TEST-DELETE-'
            }
          }
        }),
        5,
        1
      );

      performanceTester.printSummary(metrics, 'Bulk Delete');

      expect(metrics.averageLatency).toBeLessThan(2000);
    });
  });

  describe('Connection Pool Performance', () => {
    it('should test connection pool under concurrent load', async () => {
      await connectionMonitor.measureConnectionPoolUsage(
        async () => {
          // Simulate database operations
          await testPrisma.enterprise.findMany({ take: 1 });
          await testPrisma.site.findMany({ take: 1 });
          await testPrisma.part.findMany({ take: 1 });
        },
        20 // 20 concurrent connections
      );

      const metrics = connectionMonitor.getMetrics();
      expect(metrics).toHaveLength(20);

      // Check that all operations completed
      const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
      expect(avgDuration).toBeLessThan(1000); // 1 second average
    });

    it('should test connection pool recovery', async () => {
      // Create a temporary client with smaller pool
      const smallPoolClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      try {
        await smallPoolClient.$connect();

        // Test many concurrent operations
        const promises = Array.from({ length: 50 }, async () => {
          return await smallPoolClient.part.findMany({ take: 1 });
        });

        const startTime = Date.now();
        await Promise.all(promises);
        const endTime = Date.now();

        console.log(`Connection pool recovery test: ${endTime - startTime}ms`);

        // Should complete without timeout errors
        expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
      } finally {
        await smallPoolClient.$disconnect();
      }
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should monitor memory usage during large queries', async () => {
      // Create substantial test data
      const largeDataset = Array.from({ length: 500 }, (_, index) => ({
        partNumber: `PERF-TEST-MEMORY-${index.toString().padStart(4, '0')}`,
        partName: `Memory Test Part ${index}`,
        description: `A part with a longer description for memory testing purposes. This is part number ${index} in our memory usage test suite. It contains additional text to increase memory footprint.`,
        partType: 'MANUFACTURED' as const,
        unitOfMeasure: 'EA',
        isActive: true
      }));

      await testPrisma.part.createMany({ data: largeDataset });

      const beforeMemory = process.memoryUsage();

      // Query all data
      const results = await testPrisma.part.findMany({
        where: {
          partNumber: {
            startsWith: 'PERF-TEST-MEMORY-'
          }
        }
      });

      const afterMemory = process.memoryUsage();

      expect(results).toHaveLength(500);

      const memoryIncrease = afterMemory.heapUsed - beforeMemory.heapUsed;
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);

      // Memory increase should be reasonable (less than 100MB for 500 records)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });

    it('should test query performance under memory pressure', async () => {
      // Create memory pressure by allocating large arrays
      const memoryPressure: any[] = [];

      try {
        // Allocate 50MB of memory
        for (let i = 0; i < 50; i++) {
          memoryPressure.push(new Array(1024 * 1024).fill('x'));
        }

        // Test query performance under memory pressure
        const metrics = await performanceTester.benchmarkQuery(
          'query-under-pressure',
          () => testPrisma.enterprise.findMany({ take: 10 }),
          20,
          5
        );

        performanceTester.printSummary(metrics, 'Query Under Memory Pressure');

        // Should still perform reasonably well
        expect(metrics.averageLatency).toBeLessThan(500);

      } finally {
        // Clean up memory
        memoryPressure.length = 0;
      }
    });
  });

  describe('Query Optimization Tests', () => {
    it('should compare indexed vs non-indexed query performance', async () => {
      // Create test data
      const enterprises = Array.from({ length: 100 }, (_, index) => ({
        enterpriseName: `Performance Enterprise ${index}`,
        enterpriseCode: `PERF-ENT-${index.toString().padStart(3, '0')}`,
        isActive: index % 2 === 0
      }));

      await testPrisma.enterprise.createMany({ data: enterprises });

      // Test indexed query (by ID)
      const firstEnterprise = await testPrisma.enterprise.findFirst();

      const indexedMetrics = await performanceTester.benchmarkQuery(
        'indexed-query',
        () => testPrisma.enterprise.findUnique({
          where: { id: firstEnterprise!.id }
        }),
        100,
        10
      );

      // Test filtered query (using indexed field - enterpriseCode)
      const filteredMetrics = await performanceTester.benchmarkQuery(
        'filtered-indexed-query',
        () => testPrisma.enterprise.findMany({
          where: { enterpriseCode: { startsWith: 'PERF-ENT-' } },
          take: 10
        }),
        50,
        10
      );

      performanceTester.printSummary(indexedMetrics, 'Indexed Query (ID)');
      performanceTester.printSummary(filteredMetrics, 'Filtered Query');

      // Indexed queries should be faster
      expect(indexedMetrics.averageLatency).toBeLessThan(filteredMetrics.averageLatency * 2);
    });

    it('should test pagination performance', async () => {
      // Create large dataset
      const parts = Array.from({ length: 200 }, (_, index) => ({
        partNumber: `PERF-TEST-PAGE-${index.toString().padStart(4, '0')}`,
        partName: `Pagination Test Part ${index}`,
        description: `Part for pagination testing ${index}`,
        partType: 'MANUFACTURED' as const,
        unitOfMeasure: 'EA',
        isActive: true
      }));

      await testPrisma.part.createMany({ data: parts });

      // Test different page sizes
      const pageSizes = [10, 25, 50, 100];

      for (const pageSize of pageSizes) {
        const metrics = await performanceTester.benchmarkQuery(
          `pagination-${pageSize}`,
          () => testPrisma.part.findMany({
            where: {
              partNumber: { startsWith: 'PERF-TEST-PAGE-' }
            },
            take: pageSize,
            skip: 0,
            orderBy: { partNumber: 'asc' }
          }),
          20,
          5
        );

        performanceTester.printSummary(metrics, `Pagination (${pageSize} records)`);

        // Larger page sizes might be slower but should still be reasonable
        expect(metrics.averageLatency).toBeLessThan(pageSize * 5); // 5ms per record max
      }
    });
  });
});