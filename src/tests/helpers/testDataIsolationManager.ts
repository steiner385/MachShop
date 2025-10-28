/**
 * Test Data Isolation Manager
 *
 * Provides comprehensive test data isolation with:
 * - Automatic resource tracking and cleanup
 * - Transaction-based isolation where possible
 * - Resource leak detection and prevention
 * - Standardized cleanup patterns
 * - Cross-test contamination prevention
 */

import { PrismaClient } from '@prisma/client';
import { TestIdentifiers } from './uniqueTestIdentifiers';

export interface TestResource {
  type: string;
  id: string;
  data: any;
  createdAt: number;
  testName?: string;
}

export interface CleanupOptions {
  force?: boolean;
  maxRetries?: number;
  ignoreErrors?: boolean;
}

export class TestDataIsolationManager {
  private prisma: PrismaClient;
  private createdResources: Map<string, TestResource[]> = new Map();
  private cleanupOrder: string[] = [
    'routingStep',
    'routing',
    'workOrderOperation',
    'workOrder',
    'inventory',
    'serializedPart',
    'part',
    'operation',
    'site',
    'user'
  ];

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create a test resource with automatic tracking
   */
  async createResource<T>(
    resourceType: string,
    data: any,
    testName?: string
  ): Promise<T> {
    const resourceId = TestIdentifiers.uniqueId(resourceType.toUpperCase());

    try {
      console.log(`[TestIsolation] Creating ${resourceType}: ${resourceId}`);

      // Add unique fields to ensure no conflicts
      const enhancedData = {
        ...data,
        id: resourceId,
        // Add test-specific suffixes to important fields
        ...(data.siteName && { siteName: `${data.siteName}_${TestIdentifiers.uniqueId('SITE')}` }),
        // Always provide required fields for specific resource types
        ...(resourceType === 'site' ? { siteCode: data.siteCode || TestIdentifiers.uniqueId('SITE') } : {}),
        ...(resourceType === 'part' ? { partNumber: data.partNumber || TestIdentifiers.uniqueId('PART') } : {}),
        ...(resourceType === 'operation' ? { operationCode: data.operationCode || TestIdentifiers.uniqueId('OP') } : {}),
        ...(resourceType === 'routing' ? { routingNumber: data.routingNumber || TestIdentifiers.uniqueId('RT') } : {}),
        // Handle fields for non-matching resource types when explicitly provided
        ...(data.siteCode && resourceType !== 'site' && { siteCode: TestIdentifiers.uniqueId('SITE') }),
        ...(data.partNumber && resourceType !== 'part' && { partNumber: TestIdentifiers.uniqueId('PART') }),
        ...(data.operationCode && resourceType !== 'operation' && { operationCode: TestIdentifiers.uniqueId('OP') }),
        ...(data.routingNumber && resourceType !== 'routing' && { routingNumber: TestIdentifiers.uniqueId('RT') }),
      };

      // Create resource using Prisma
      const created = await (this.prisma as any)[resourceType].create({
        data: enhancedData
      });

      // Track resource for cleanup
      this.trackResource(resourceType, created.id, created, testName);

      console.log(`[TestIsolation] ✅ Created ${resourceType}: ${created.id}`);
      return created;

    } catch (error) {
      console.error(`[TestIsolation] ❌ Failed to create ${resourceType}:`, error);
      throw new Error(`Failed to create test ${resourceType}: ${error.message}`);
    }
  }

  /**
   * Find or create a test resource (prevents duplicates)
   */
  async findOrCreateResource<T>(
    resourceType: string,
    findCriteria: any,
    createData: any,
    testName?: string
  ): Promise<T> {
    try {
      // Try to find existing resource first
      const existing = await (this.prisma as any)[resourceType].findFirst({
        where: findCriteria
      });

      if (existing) {
        console.log(`[TestIsolation] Found existing ${resourceType}: ${existing.id}`);
        // Track existing resource for cleanup if it matches test pattern
        if (this.isTestResource(existing)) {
          this.trackResource(resourceType, existing.id, existing, testName);
        }
        return existing;
      }

      // Create new resource if not found
      return await this.createResource<T>(resourceType, createData, testName);

    } catch (error) {
      console.error(`[TestIsolation] Error in findOrCreate ${resourceType}:`, error);
      throw error;
    }
  }

  /**
   * Track a resource for cleanup
   */
  trackResource(type: string, id: string, data: any, testName?: string): void {
    const resource: TestResource = {
      type,
      id,
      data,
      createdAt: Date.now(),
      testName
    };

    if (!this.createdResources.has(type)) {
      this.createdResources.set(type, []);
    }

    this.createdResources.get(type)!.push(resource);
    console.log(`[TestIsolation] 📝 Tracking ${type}: ${id}`);
  }

  /**
   * Clean up resources for a specific test
   */
  async cleanupTestResources(testName?: string, options: CleanupOptions = {}): Promise<void> {
    const { force = false, maxRetries = 3, ignoreErrors = true } = options;

    console.log(`[TestIsolation] 🧹 Starting cleanup${testName ? ` for test: ${testName}` : ''}`);

    // Clean up in reverse order to respect foreign key constraints
    for (const resourceType of [...this.cleanupOrder].reverse()) {
      const resources = this.createdResources.get(resourceType) || [];
      const resourcesToClean = testName
        ? resources.filter(r => r.testName === testName)
        : resources;

      if (resourcesToClean.length === 0) continue;

      console.log(`[TestIsolation] Cleaning ${resourcesToClean.length} ${resourceType} resources`);

      for (const resource of resourcesToClean) {
        await this.deleteResourceWithRetry(resource, maxRetries, ignoreErrors);
      }

      // Remove cleaned resources from tracking
      if (testName) {
        const remaining = resources.filter(r => r.testName !== testName);
        this.createdResources.set(resourceType, remaining);
      } else {
        this.createdResources.delete(resourceType);
      }
    }

    console.log(`[TestIsolation] ✅ Cleanup completed${testName ? ` for test: ${testName}` : ''}`);
  }

  /**
   * Delete a single resource with retry logic
   */
  private async deleteResourceWithRetry(
    resource: TestResource,
    maxRetries: number,
    ignoreErrors: boolean
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await (this.prisma as any)[resource.type].delete({
          where: { id: resource.id }
        });

        console.log(`[TestIsolation] ✅ Deleted ${resource.type}: ${resource.id}`);
        return;

      } catch (error: any) {
        const isLastAttempt = attempt === maxRetries;
        const isNotFound = error.code === 'P2025'; // Prisma "Record not found"

        if (isNotFound) {
          console.log(`[TestIsolation] Resource already deleted: ${resource.type}:${resource.id}`);
          return;
        }

        if (isLastAttempt) {
          if (ignoreErrors) {
            console.warn(`[TestIsolation] ⚠️ Failed to delete ${resource.type}:${resource.id} after ${maxRetries} attempts:`, error.message);
            return;
          } else {
            throw new Error(`Failed to delete ${resource.type}:${resource.id}: ${error.message}`);
          }
        }

        console.log(`[TestIsolation] Retry ${attempt}/${maxRetries} for ${resource.type}:${resource.id}`);
        await this.delay(100 * attempt); // Exponential backoff
      }
    }
  }

  /**
   * Check if a resource appears to be test-created
   */
  private isTestResource(resource: any): boolean {
    const testPatterns = [
      /TEST-\d+-\d+-[a-z0-9]+/i,  // Test identifier pattern
      /_\d+-\d+-[a-z0-9]+$/,      // Suffix pattern
      /^E2E_/i,                   // E2E prefix
    ];

    const checkFields = [
      resource.id,
      resource.siteName,
      resource.siteCode,
      resource.partNumber,
      resource.operationCode,
      resource.routingNumber,
      resource.name,
      resource.code
    ];

    return checkFields.some(field =>
      field && testPatterns.some(pattern => pattern.test(field))
    );
  }

  /**
   * Get current resource count (for monitoring)
   */
  getResourceCount(type?: string): number {
    if (type) {
      return this.createdResources.get(type)?.length || 0;
    }

    return Array.from(this.createdResources.values())
      .reduce((total, resources) => total + resources.length, 0);
  }

  /**
   * Get all tracked resources (for debugging)
   */
  getAllTrackedResources(): Map<string, TestResource[]> {
    return new Map(this.createdResources);
  }

  /**
   * Clean up ALL resources (nuclear option)
   */
  async cleanupAllResources(): Promise<void> {
    console.log('[TestIsolation] 💥 NUCLEAR CLEANUP: Removing ALL tracked resources');
    await this.cleanupTestResources(undefined, { force: true, ignoreErrors: true });
  }

  /**
   * Create a scoped isolation context for a single test
   */
  async withIsolation<T>(
    testName: string,
    testFunction: (manager: TestDataIsolationManager) => Promise<T>
  ): Promise<T> {
    console.log(`[TestIsolation] 🚀 Starting isolated test: ${testName}`);

    try {
      const result = await testFunction(this);
      console.log(`[TestIsolation] ✅ Test completed: ${testName}`);
      return result;

    } finally {
      // Always clean up test resources, even if test fails
      await this.cleanupTestResources(testName, { ignoreErrors: true });
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create a test isolation manager
 */
export function createTestIsolationManager(prisma: PrismaClient): TestDataIsolationManager {
  return new TestDataIsolationManager(prisma);
}

/**
 * Global isolation manager instance for easy access
 */
let globalIsolationManager: TestDataIsolationManager | null = null;

export function getGlobalIsolationManager(prisma?: PrismaClient): TestDataIsolationManager {
  if (!globalIsolationManager && prisma) {
    globalIsolationManager = new TestDataIsolationManager(prisma);
  }

  if (!globalIsolationManager) {
    throw new Error('Global isolation manager not initialized. Pass PrismaClient on first call.');
  }

  return globalIsolationManager;
}