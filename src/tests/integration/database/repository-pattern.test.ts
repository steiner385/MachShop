/**
 * Repository Pattern Testing Framework
 *
 * Tests repository pattern implementations with comprehensive data access testing,
 * query optimization, caching mechanisms, and error handling. This framework
 * demonstrates testing patterns for repository implementations using Prisma.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Example Repository Interface
interface BaseRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findMany(filter?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: K, data: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
  count(filter?: Partial<T>): Promise<number>;
}

// User Repository Implementation
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class UserRepository implements BaseRepository<User> {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { id }
    });
  }

  async findMany(filter?: Partial<User>): Promise<User[]> {
    return await this.prisma.user.findMany({
      where: filter ? {
        username: filter.username ? { contains: filter.username } : undefined,
        email: filter.email ? { contains: filter.email } : undefined,
        isActive: filter.isActive,
      } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return await this.prisma.user.create({
      data: {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    return await this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id }
    });
  }

  async count(filter?: Partial<User>): Promise<number> {
    return await this.prisma.user.count({
      where: filter ? {
        username: filter.username ? { contains: filter.username } : undefined,
        email: filter.email ? { contains: filter.email } : undefined,
        isActive: filter.isActive,
      } : undefined
    });
  }

  // Repository-specific methods
  async findByEmail(email: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.prisma.user.findUnique({
      where: { username }
    });
  }

  async findActiveUsers(): Promise<User[]> {
    return await this.prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

// Part Repository Implementation
interface Part {
  id: string;
  partNumber: string;
  partName: string;
  description: string;
  partType: string;
  unitOfMeasure: string;
  isActive: boolean;
}

class PartRepository implements BaseRepository<Part> {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<Part | null> {
    return await this.prisma.part.findUnique({
      where: { id }
    });
  }

  async findMany(filter?: Partial<Part>): Promise<Part[]> {
    return await this.prisma.part.findMany({
      where: filter ? {
        partNumber: filter.partNumber ? { contains: filter.partNumber } : undefined,
        partName: filter.partName ? { contains: filter.partName } : undefined,
        partType: filter.partType,
        isActive: filter.isActive,
      } : undefined,
      orderBy: { partNumber: 'asc' }
    });
  }

  async create(data: Omit<Part, 'id'>): Promise<Part> {
    return await this.prisma.part.create({
      data
    });
  }

  async update(id: string, data: Partial<Part>): Promise<Part> {
    return await this.prisma.part.update({
      where: { id },
      data
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.part.delete({
      where: { id }
    });
  }

  async count(filter?: Partial<Part>): Promise<number> {
    return await this.prisma.part.count({
      where: filter ? {
        partNumber: filter.partNumber ? { contains: filter.partNumber } : undefined,
        partName: filter.partName ? { contains: filter.partName } : undefined,
        partType: filter.partType,
        isActive: filter.isActive,
      } : undefined
    });
  }

  // Repository-specific methods
  async findByPartNumber(partNumber: string): Promise<Part | null> {
    return await this.prisma.part.findUnique({
      where: { partNumber }
    });
  }

  async findByPartType(partType: string): Promise<Part[]> {
    return await this.prisma.part.findMany({
      where: { partType, isActive: true },
      orderBy: { partNumber: 'asc' }
    });
  }

  async searchParts(searchTerm: string): Promise<Part[]> {
    return await this.prisma.part.findMany({
      where: {
        OR: [
          { partNumber: { contains: searchTerm } },
          { partName: { contains: searchTerm } },
          { description: { contains: searchTerm } }
        ],
        isActive: true
      },
      orderBy: { partNumber: 'asc' }
    });
  }
}

// Repository Cache Implementation (for testing caching patterns)
class CachedRepository<T, K = string> implements BaseRepository<T, K> {
  private cache = new Map<string, T>();
  private cacheExpiry = new Map<string, number>();
  private cacheDuration = 5 * 60 * 1000; // 5 minutes

  constructor(private repository: BaseRepository<T, K>) {}

  private getCacheKey(method: string, ...args: any[]): string {
    return `${method}:${JSON.stringify(args)}`;
  }

  private isExpired(key: string): boolean {
    const expiry = this.cacheExpiry.get(key);
    return !expiry || Date.now() > expiry;
  }

  private setCache(key: string, value: T): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.cacheDuration);
  }

  async findById(id: K): Promise<T | null> {
    const cacheKey = this.getCacheKey('findById', id);

    if (this.cache.has(cacheKey) && !this.isExpired(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    const result = await this.repository.findById(id);
    if (result) {
      this.setCache(cacheKey, result);
    }
    return result;
  }

  async findMany(filter?: Partial<T>): Promise<T[]> {
    // For simplicity, we don't cache findMany in this example
    return await this.repository.findMany(filter);
  }

  async create(data: Omit<T, 'id'>): Promise<T> {
    const result = await this.repository.create(data);
    // Invalidate relevant cache entries
    this.cache.clear();
    this.cacheExpiry.clear();
    return result;
  }

  async update(id: K, data: Partial<T>): Promise<T> {
    const result = await this.repository.update(id, data);
    // Invalidate cache for this ID
    const cacheKey = this.getCacheKey('findById', id);
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
    return result;
  }

  async delete(id: K): Promise<void> {
    await this.repository.delete(id);
    // Invalidate cache for this ID
    const cacheKey = this.getCacheKey('findById', id);
    this.cache.delete(cacheKey);
    this.cacheExpiry.delete(cacheKey);
  }

  async count(filter?: Partial<T>): Promise<number> {
    return await this.repository.count(filter);
  }

  // Cache management methods
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}

describe('Repository Pattern Testing Framework', () => {
  let testPrisma: PrismaClient;
  let userRepository: UserRepository;
  let partRepository: PartRepository;

  beforeAll(async () => {
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    await testPrisma.$connect();

    userRepository = new UserRepository(testPrisma);
    partRepository = new PartRepository(testPrisma);
  });

  afterAll(async () => {
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      await testPrisma.part.deleteMany({
        where: {
          partNumber: {
            startsWith: 'REPO-TEST-'
          }
        }
      });
      await testPrisma.user.deleteMany({
        where: {
          username: {
            startsWith: 'repo-test-'
          }
        }
      });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  describe('User Repository Tests', () => {
    it('should create and find user by ID', async () => {
      const userData = {
        username: 'repo-test-user1',
        email: 'repo-test-user1@example.com',
        firstName: 'Repository',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const createdUser = await userRepository.create(userData);
      expect(createdUser.id).toBeDefined();
      expect(createdUser.username).toBe(userData.username);
      expect(createdUser.email).toBe(userData.email);

      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeTruthy();
      expect(foundUser?.username).toBe(userData.username);
    });

    it('should find user by email', async () => {
      const userData = {
        username: 'repo-test-user2',
        email: 'repo-test-user2@example.com',
        firstName: 'Repository',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toBeTruthy();
      expect(foundUser?.email).toBe(userData.email);
    });

    it('should find user by username', async () => {
      const userData = {
        username: 'repo-test-user3',
        email: 'repo-test-user3@example.com',
        firstName: 'Repository',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      await userRepository.create(userData);
      const foundUser = await userRepository.findByUsername(userData.username);

      expect(foundUser).toBeTruthy();
      expect(foundUser?.username).toBe(userData.username);
    });

    it('should find active users only', async () => {
      const activeUser = {
        username: 'repo-test-active',
        email: 'repo-test-active@example.com',
        firstName: 'Active',
        lastName: 'User',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const inactiveUser = {
        username: 'repo-test-inactive',
        email: 'repo-test-inactive@example.com',
        firstName: 'Inactive',
        lastName: 'User',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: false
      };

      await userRepository.create(activeUser);
      await userRepository.create(inactiveUser);

      const activeUsers = await userRepository.findActiveUsers();

      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].username).toBe(activeUser.username);
    });

    it('should update user correctly', async () => {
      const userData = {
        username: 'repo-test-user4',
        email: 'repo-test-user4@example.com',
        firstName: 'Repository',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const createdUser = await userRepository.create(userData);

      const updatedUser = await userRepository.update(createdUser.id, {
        firstName: 'Updated',
        lastName: 'Name'
      });

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.username).toBe(userData.username); // Should remain unchanged
    });

    it('should delete user correctly', async () => {
      const userData = {
        username: 'repo-test-user5',
        email: 'repo-test-user5@example.com',
        firstName: 'Repository',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const createdUser = await userRepository.create(userData);
      await userRepository.delete(createdUser.id);

      const foundUser = await userRepository.findById(createdUser.id);
      expect(foundUser).toBeNull();
    });

    it('should count users correctly', async () => {
      const initialCount = await userRepository.count();

      await userRepository.create({
        username: 'repo-test-count1',
        email: 'repo-test-count1@example.com',
        firstName: 'Count',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      });

      await userRepository.create({
        username: 'repo-test-count2',
        email: 'repo-test-count2@example.com',
        firstName: 'Count',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: false
      });

      const totalCount = await userRepository.count();
      const activeCount = await userRepository.count({ isActive: true });

      expect(totalCount).toBe(initialCount + 2);
      expect(activeCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Part Repository Tests', () => {
    it('should create and find part by ID', async () => {
      const partData = {
        partNumber: 'REPO-TEST-PART-001',
        partName: 'Repository Test Part',
        description: 'A part for testing repository patterns',
        partType: 'MANUFACTURED',
        unitOfMeasure: 'EA',
        isActive: true
      };

      const createdPart = await partRepository.create(partData);
      expect(createdPart.id).toBeDefined();
      expect(createdPart.partNumber).toBe(partData.partNumber);

      const foundPart = await partRepository.findById(createdPart.id);
      expect(foundPart).toBeTruthy();
      expect(foundPart?.partNumber).toBe(partData.partNumber);
    });

    it('should find part by part number', async () => {
      const partData = {
        partNumber: 'REPO-TEST-PART-002',
        partName: 'Repository Test Part 2',
        description: 'Another part for testing',
        partType: 'PURCHASED',
        unitOfMeasure: 'EA',
        isActive: true
      };

      await partRepository.create(partData);
      const foundPart = await partRepository.findByPartNumber(partData.partNumber);

      expect(foundPart).toBeTruthy();
      expect(foundPart?.partNumber).toBe(partData.partNumber);
    });

    it('should find parts by type', async () => {
      const part1 = {
        partNumber: 'REPO-TEST-PART-003',
        partName: 'Manufactured Part 1',
        description: 'First manufactured part',
        partType: 'MANUFACTURED',
        unitOfMeasure: 'EA',
        isActive: true
      };

      const part2 = {
        partNumber: 'REPO-TEST-PART-004',
        partName: 'Manufactured Part 2',
        description: 'Second manufactured part',
        partType: 'MANUFACTURED',
        unitOfMeasure: 'EA',
        isActive: true
      };

      const part3 = {
        partNumber: 'REPO-TEST-PART-005',
        partName: 'Purchased Part',
        description: 'A purchased part',
        partType: 'PURCHASED',
        unitOfMeasure: 'EA',
        isActive: true
      };

      await partRepository.create(part1);
      await partRepository.create(part2);
      await partRepository.create(part3);

      const manufacturedParts = await partRepository.findByPartType('MANUFACTURED');

      expect(manufacturedParts).toHaveLength(2);
      expect(manufacturedParts.every(p => p.partType === 'MANUFACTURED')).toBe(true);
    });

    it('should search parts by term', async () => {
      await partRepository.create({
        partNumber: 'REPO-TEST-SEARCH-001',
        partName: 'Special Widget',
        description: 'A very special widget for testing',
        partType: 'MANUFACTURED',
        unitOfMeasure: 'EA',
        isActive: true
      });

      await partRepository.create({
        partNumber: 'REPO-TEST-SEARCH-002',
        partName: 'Regular Component',
        description: 'Contains special materials',
        partType: 'PURCHASED',
        unitOfMeasure: 'EA',
        isActive: true
      });

      const searchResults = await partRepository.searchParts('special');

      expect(searchResults).toHaveLength(2);
      expect(searchResults.some(p => p.partName.includes('Special'))).toBe(true);
      expect(searchResults.some(p => p.description.includes('special'))).toBe(true);
    });
  });

  describe('Repository Caching Tests', () => {
    it('should cache repository results', async () => {
      const userData = {
        username: 'repo-test-cache',
        email: 'repo-test-cache@example.com',
        firstName: 'Cache',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const cachedUserRepo = new CachedRepository(userRepository);

      // Create user
      const createdUser = await cachedUserRepo.create(userData);

      // First call should hit the database
      const user1 = await cachedUserRepo.findById(createdUser.id);
      expect(user1).toBeTruthy();

      // Second call should hit the cache
      const user2 = await cachedUserRepo.findById(createdUser.id);
      expect(user2).toBeTruthy();
      expect(user2?.username).toBe(userData.username);

      // Verify cache is being used
      expect(cachedUserRepo.getCacheSize()).toBeGreaterThan(0);
    });

    it('should invalidate cache on update', async () => {
      const userData = {
        username: 'repo-test-cache2',
        email: 'repo-test-cache2@example.com',
        firstName: 'Cache',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const cachedUserRepo = new CachedRepository(userRepository);

      // Create and cache user
      const createdUser = await cachedUserRepo.create(userData);
      await cachedUserRepo.findById(createdUser.id); // This should cache the user

      // Update user (should invalidate cache)
      await cachedUserRepo.update(createdUser.id, { firstName: 'Updated' });

      // Fetch user again (should get updated data from database)
      const updatedUser = await cachedUserRepo.findById(createdUser.id);
      expect(updatedUser?.firstName).toBe('Updated');
    });

    it('should clear cache manually', async () => {
      const cachedUserRepo = new CachedRepository(userRepository);

      // Add some data to cache
      const userData = {
        username: 'repo-test-cache3',
        email: 'repo-test-cache3@example.com',
        firstName: 'Cache',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      const createdUser = await cachedUserRepo.create(userData);
      await cachedUserRepo.findById(createdUser.id);

      expect(cachedUserRepo.getCacheSize()).toBeGreaterThan(0);

      // Clear cache
      cachedUserRepo.clearCache();
      expect(cachedUserRepo.getCacheSize()).toBe(0);
    });
  });

  describe('Repository Error Handling', () => {
    it('should handle database connection errors', async () => {
      // Create a repository with a disconnected Prisma client
      const disconnectedPrisma = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:5432/invalid'
          }
        }
      });

      const invalidUserRepo = new UserRepository(disconnectedPrisma);

      await expect(async () => {
        await invalidUserRepo.findById('invalid-id');
      }).rejects.toThrow();
    });

    it('should handle not found scenarios', async () => {
      const nonExistentUser = await userRepository.findById('non-existent-id');
      expect(nonExistentUser).toBeNull();

      const nonExistentPart = await partRepository.findByPartNumber('NON-EXISTENT');
      expect(nonExistentPart).toBeNull();
    });

    it('should handle constraint violations', async () => {
      const userData = {
        username: 'repo-test-constraint',
        email: 'repo-test-constraint@example.com',
        firstName: 'Constraint',
        lastName: 'Test',
        passwordHash: '$2b$10$repo.test.hash.value',
        isActive: true
      };

      // Create first user
      await userRepository.create(userData);

      // Try to create second user with same email (should fail)
      await expect(async () => {
        await userRepository.create(userData);
      }).rejects.toThrow(/unique constraint/i);
    });
  });

  describe('Repository Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const batchSize = 50;
      const startTime = Date.now();

      // Create multiple parts
      const createPromises = Array.from({ length: batchSize }, (_, index) =>
        partRepository.create({
          partNumber: `REPO-TEST-BULK-${index.toString().padStart(3, '0')}`,
          partName: `Bulk Test Part ${index}`,
          description: `Bulk test part number ${index}`,
          partType: 'MANUFACTURED',
          unitOfMeasure: 'EA',
          isActive: true
        })
      );

      await Promise.all(createPromises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all parts were created
      const parts = await partRepository.findMany();
      const bulkParts = parts.filter(p => p.partNumber.startsWith('REPO-TEST-BULK-'));
      expect(bulkParts).toHaveLength(batchSize);

      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(10000); // 10 seconds max
    });

    it('should optimize query performance with proper filtering', async () => {
      // Create test data
      await partRepository.create({
        partNumber: 'REPO-TEST-PERF-001',
        partName: 'Performance Test Part',
        description: 'For performance testing',
        partType: 'MANUFACTURED',
        unitOfMeasure: 'EA',
        isActive: true
      });

      const startTime = Date.now();

      // Test filtered query performance
      const filteredParts = await partRepository.findMany({
        partType: 'MANUFACTURED',
        isActive: true
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(filteredParts.length).toBeGreaterThanOrEqual(1);
      expect(duration).toBeLessThan(1000); // 1 second max for simple query
    });
  });
});