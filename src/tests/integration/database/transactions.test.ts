/**
 * Database Transaction and Rollback Testing
 *
 * Tests database transaction handling, rollback scenarios, and data consistency
 * during complex operations. This ensures that all database operations maintain
 * ACID properties and handle failures gracefully.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Database Transactions and Rollbacks', () => {
  let testPrisma: PrismaClient;

  beforeAll(async () => {
    // Create a fresh Prisma client for tests
    testPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });
    await testPrisma.$connect();
  });

  afterAll(async () => {
    // Clean up any remaining test data
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      // Delete in order to respect foreign key constraints
      await testPrisma.workOrder.deleteMany({
        where: {
          workOrderNumber: {
            startsWith: 'TX-TEST-'
          }
        }
      });
      await testPrisma.part.deleteMany({
        where: {
          partNumber: {
            startsWith: 'TX-TEST-'
          }
        }
      });
      await testPrisma.site.deleteMany({
        where: {
          siteCode: {
            startsWith: 'TX-TEST-'
          }
        }
      });
      await testPrisma.enterprise.deleteMany({
        where: {
          enterpriseCode: {
            startsWith: 'TX-TEST-'
          }
        }
      });
      await testPrisma.user.deleteMany({
        where: {
          username: {
            startsWith: 'tx-test-'
          }
        }
      });
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  }

  describe('Basic Transaction Operations', () => {
    it('should commit transaction when all operations succeed', async () => {
      const result = await testPrisma.$transaction(async (tx) => {
        // Create enterprise
        const enterprise = await tx.enterprise.create({
          data: {
            enterpriseName: 'TX Test Enterprise',
            enterpriseCode: 'TX-TEST-ENT-001',
            isActive: true
          }
        });

        // Create site
        const site = await tx.site.create({
          data: {
            siteName: 'TX Test Site',
            siteCode: 'TX-TEST-SITE-001',
            enterpriseId: enterprise.id,
            isActive: true
          }
        });

        // Create user
        const user = await tx.user.create({
          data: {
            username: 'tx-test-user-001',
            email: 'tx-test-001@example.com',
            firstName: 'TX',
            lastName: 'User',
            passwordHash: '$2b$10$tx.test.hash.value',
            isActive: true
          }
        });

        return { enterprise, site, user };
      });

      // Verify all entities were created
      expect(result.enterprise.id).toBeDefined();
      expect(result.site.id).toBeDefined();
      expect(result.user.id).toBeDefined();

      // Verify they exist in the database
      const enterpriseExists = await testPrisma.enterprise.findUnique({
        where: { id: result.enterprise.id }
      });
      const siteExists = await testPrisma.site.findUnique({
        where: { id: result.site.id }
      });
      const userExists = await testPrisma.user.findUnique({
        where: { id: result.user.id }
      });

      expect(enterpriseExists).toBeTruthy();
      expect(siteExists).toBeTruthy();
      expect(userExists).toBeTruthy();
    });

    it('should rollback transaction when operation fails', async () => {
      await expect(async () => {
        await testPrisma.$transaction(async (tx) => {
          // Create enterprise (this will succeed)
          const enterprise = await tx.enterprise.create({
            data: {
              enterpriseName: 'TX Test Enterprise 2',
              enterpriseCode: 'TX-TEST-ENT-002',
              isActive: true
            }
          });

          // Create site (this will succeed)
          await tx.site.create({
            data: {
              siteName: 'TX Test Site 2',
              siteCode: 'TX-TEST-SITE-002',
              enterpriseId: enterprise.id,
              isActive: true
            }
          });

          // This will fail due to missing required field
          await tx.user.create({
            data: {
              username: 'tx-test-user-002',
              email: 'tx-test-002@example.com',
              firstName: 'TX',
              lastName: 'User',
              // Missing passwordHash - this will cause the transaction to fail
              isActive: true
            } as any
          });
        });
      }).rejects.toThrow();

      // Verify that none of the entities exist (transaction was rolled back)
      const enterprises = await testPrisma.enterprise.findMany({
        where: {
          enterpriseCode: 'TX-TEST-ENT-002'
        }
      });
      const sites = await testPrisma.site.findMany({
        where: {
          siteCode: 'TX-TEST-SITE-002'
        }
      });
      const users = await testPrisma.user.findMany({
        where: {
          username: 'tx-test-user-002'
        }
      });

      expect(enterprises).toHaveLength(0);
      expect(sites).toHaveLength(0);
      expect(users).toHaveLength(0);
    });

    it('should handle nested transactions correctly', async () => {
      const result = await testPrisma.$transaction(async (tx) => {
        // Create enterprise
        const enterprise = await tx.enterprise.create({
          data: {
            enterpriseName: 'TX Test Enterprise 3',
            enterpriseCode: 'TX-TEST-ENT-003',
            isActive: true
          }
        });

        // Nested operation: create multiple sites
        const sites = await Promise.all([
          tx.site.create({
            data: {
              siteName: 'TX Test Site 3A',
              siteCode: 'TX-TEST-SITE-003A',
              enterpriseId: enterprise.id,
              isActive: true
            }
          }),
          tx.site.create({
            data: {
              siteName: 'TX Test Site 3B',
              siteCode: 'TX-TEST-SITE-003B',
              enterpriseId: enterprise.id,
              isActive: true
            }
          })
        ]);

        return { enterprise, sites };
      });

      expect(result.enterprise.id).toBeDefined();
      expect(result.sites).toHaveLength(2);

      // Verify all sites exist and are linked to the enterprise
      const savedSites = await testPrisma.site.findMany({
        where: {
          enterpriseId: result.enterprise.id
        }
      });

      expect(savedSites).toHaveLength(2);
    });
  });

  describe('Complex Multi-Entity Transactions', () => {
    it('should handle work order creation transaction', async () => {
      const result = await testPrisma.$transaction(async (tx) => {
        // Create enterprise
        const enterprise = await tx.enterprise.create({
          data: {
            enterpriseName: 'TX Test Enterprise WO',
            enterpriseCode: 'TX-TEST-ENT-WO',
            isActive: true
          }
        });

        // Create site
        const site = await tx.site.create({
          data: {
            siteName: 'TX Test Site WO',
            siteCode: 'TX-TEST-SITE-WO',
            enterpriseId: enterprise.id,
            isActive: true
          }
        });

        // Create user
        const user = await tx.user.create({
          data: {
            username: 'tx-test-user-wo',
            email: 'tx-test-wo@example.com',
            firstName: 'TX',
            lastName: 'User',
            passwordHash: '$2b$10$tx.test.hash.value',
            isActive: true
          }
        });

        // Create part
        const part = await tx.part.create({
          data: {
            partNumber: 'TX-TEST-PART-WO',
            partName: 'TX Test Part WO',
            description: 'Test part for work order transaction',
            partType: 'MANUFACTURED',
            unitOfMeasure: 'EA',
            isActive: true
          }
        });

        // Create work order
        const workOrder = await tx.workOrder.create({
          data: {
            workOrderNumber: 'TX-TEST-WO-001',
            partId: part.id,
            siteId: site.id,
            quantity: 100,
            status: 'CREATED',
            priority: 'NORMAL',
            createdById: user.id
          }
        });

        return { enterprise, site, user, part, workOrder };
      });

      // Verify all entities were created with correct relationships
      const workOrder = await testPrisma.workOrder.findUnique({
        where: { id: result.workOrder.id },
        include: {
          part: true,
          site: {
            include: {
              enterprise: true
            }
          },
          createdBy: true
        }
      });

      expect(workOrder).toBeTruthy();
      expect(workOrder?.part.id).toBe(result.part.id);
      expect(workOrder?.site.id).toBe(result.site.id);
      expect(workOrder?.site.enterprise.id).toBe(result.enterprise.id);
      expect(workOrder?.createdBy.id).toBe(result.user.id);
    });

    it('should rollback work order creation when constraint violated', async () => {
      // First, create the basic entities
      const setupData = await testPrisma.$transaction(async (tx) => {
        const enterprise = await tx.enterprise.create({
          data: {
            enterpriseName: 'TX Test Enterprise WO2',
            enterpriseCode: 'TX-TEST-ENT-WO2',
            isActive: true
          }
        });

        const site = await tx.site.create({
          data: {
            siteName: 'TX Test Site WO2',
            siteCode: 'TX-TEST-SITE-WO2',
            enterpriseId: enterprise.id,
            isActive: true
          }
        });

        const user = await tx.user.create({
          data: {
            username: 'tx-test-user-wo2',
            email: 'tx-test-wo2@example.com',
            firstName: 'TX',
            lastName: 'User',
            passwordHash: '$2b$10$tx.test.hash.value',
            isActive: true
          }
        });

        const part = await tx.part.create({
          data: {
            partNumber: 'TX-TEST-PART-WO2',
            partName: 'TX Test Part WO2',
            description: 'Test part for work order transaction 2',
            partType: 'MANUFACTURED',
            unitOfMeasure: 'EA',
            isActive: true
          }
        });

        return { enterprise, site, user, part };
      });

      // Create first work order
      await testPrisma.workOrder.create({
        data: {
          workOrderNumber: 'TX-TEST-WO-DUPLICATE',
          partId: setupData.part.id,
          siteId: setupData.site.id,
          quantity: 100,
          status: 'CREATED',
          priority: 'NORMAL',
          createdById: setupData.user.id
        }
      });

      // Try to create second work order with duplicate number (should fail)
      await expect(async () => {
        await testPrisma.$transaction(async (tx) => {
          // This should fail due to unique constraint on workOrderNumber
          await tx.workOrder.create({
            data: {
              workOrderNumber: 'TX-TEST-WO-DUPLICATE',
              partId: setupData.part.id,
              siteId: setupData.site.id,
              quantity: 200,
              status: 'CREATED',
              priority: 'HIGH',
              createdById: setupData.user.id
            }
          });
        });
      }).rejects.toThrow();

      // Verify only one work order exists
      const workOrders = await testPrisma.workOrder.findMany({
        where: {
          workOrderNumber: 'TX-TEST-WO-DUPLICATE'
        }
      });

      expect(workOrders).toHaveLength(1);
      expect(workOrders[0].quantity).toBe(100); // Original value
    });
  });

  describe('Transaction Isolation Levels', () => {
    it('should handle concurrent transactions correctly', async () => {
      // Create test enterprise first
      const enterprise = await testPrisma.enterprise.create({
        data: {
          enterpriseName: 'TX Test Enterprise Concurrent',
          enterpriseCode: 'TX-TEST-ENT-CONCURRENT',
          isActive: true
        }
      });

      // Create multiple concurrent transactions
      const promises = Array.from({ length: 5 }, (_, index) =>
        testPrisma.$transaction(async (tx) => {
          return await tx.site.create({
            data: {
              siteName: `TX Test Site Concurrent ${index}`,
              siteCode: `TX-TEST-SITE-CONCURRENT-${index}`,
              enterpriseId: enterprise.id,
              isActive: true
            }
          });
        })
      );

      const results = await Promise.all(promises);

      // Verify all sites were created
      expect(results).toHaveLength(5);
      results.forEach((site, index) => {
        expect(site.siteName).toBe(`TX Test Site Concurrent ${index}`);
        expect(site.siteCode).toBe(`TX-TEST-SITE-CONCURRENT-${index}`);
      });

      // Verify in database
      const sites = await testPrisma.site.findMany({
        where: {
          enterpriseId: enterprise.id
        }
      });

      expect(sites).toHaveLength(5);
    });

    it('should handle deadlock scenarios gracefully', async () => {
      // Create test data
      const enterprise = await testPrisma.enterprise.create({
        data: {
          enterpriseName: 'TX Test Enterprise Deadlock',
          enterpriseCode: 'TX-TEST-ENT-DEADLOCK',
          isActive: true
        }
      });

      const site1 = await testPrisma.site.create({
        data: {
          siteName: 'TX Test Site Deadlock 1',
          siteCode: 'TX-TEST-SITE-DEADLOCK-1',
          enterpriseId: enterprise.id,
          isActive: true
        }
      });

      const site2 = await testPrisma.site.create({
        data: {
          siteName: 'TX Test Site Deadlock 2',
          siteCode: 'TX-TEST-SITE-DEADLOCK-2',
          enterpriseId: enterprise.id,
          isActive: true
        }
      });

      // Create concurrent transactions that access the same resources in different orders
      const transaction1 = testPrisma.$transaction(async (tx) => {
        // Access site1 first, then site2
        await tx.site.update({
          where: { id: site1.id },
          data: { siteName: 'TX Test Site Deadlock 1 Updated' }
        });

        // Small delay to increase chance of deadlock
        await new Promise(resolve => setTimeout(resolve, 10));

        await tx.site.update({
          where: { id: site2.id },
          data: { siteName: 'TX Test Site Deadlock 2 Updated by T1' }
        });

        return 'T1';
      });

      const transaction2 = testPrisma.$transaction(async (tx) => {
        // Access site2 first, then site1
        await tx.site.update({
          where: { id: site2.id },
          data: { siteName: 'TX Test Site Deadlock 2 Updated' }
        });

        // Small delay to increase chance of deadlock
        await new Promise(resolve => setTimeout(resolve, 10));

        await tx.site.update({
          where: { id: site1.id },
          data: { siteName: 'TX Test Site Deadlock 1 Updated by T2' }
        });

        return 'T2';
      });

      // At least one transaction should complete successfully
      const results = await Promise.allSettled([transaction1, transaction2]);

      const successful = results.filter(result => result.status === 'fulfilled');
      const failed = results.filter(result => result.status === 'rejected');

      // At least one should succeed, and failures should be due to deadlock or timeout
      expect(successful.length).toBeGreaterThanOrEqual(1);

      if (failed.length > 0) {
        failed.forEach(failure => {
          expect((failure as PromiseRejectedResult).reason.message).toMatch(
            /deadlock|timeout|serialization/i
          );
        });
      }
    });
  });

  describe('Transaction Retry Logic', () => {
    it('should retry failed transactions with exponential backoff', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const retryableTransaction = async (): Promise<any> => {
        attemptCount++;

        if (attemptCount < 3) {
          // Simulate a temporary failure
          throw new Error('Temporary database error');
        }

        // Success on third attempt
        return await testPrisma.$transaction(async (tx) => {
          return await tx.enterprise.create({
            data: {
              enterpriseName: 'TX Test Enterprise Retry',
              enterpriseCode: 'TX-TEST-ENT-RETRY',
              isActive: true
            }
          });
        });
      };

      const executeWithRetry = async () => {
        for (let retry = 0; retry < maxRetries; retry++) {
          try {
            return await retryableTransaction();
          } catch (error) {
            if (retry === maxRetries - 1) {
              throw error;
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retry) * 100));
          }
        }
      };

      const result = await executeWithRetry();

      expect(result.enterpriseName).toBe('TX Test Enterprise Retry');
      expect(attemptCount).toBe(3);
    });

    it('should handle transaction timeout correctly', async () => {
      const timeoutPromise = testPrisma.$transaction(
        async (tx) => {
          // Simulate a long-running operation
          await new Promise(resolve => setTimeout(resolve, 3000));

          return await tx.enterprise.create({
            data: {
              enterpriseName: 'TX Test Enterprise Timeout',
              enterpriseCode: 'TX-TEST-ENT-TIMEOUT',
              isActive: true
            }
          });
        },
        {
          maxWait: 500,  // 0.5 second max wait
          timeout: 1000  // 1 second timeout
        }
      );

      await expect(timeoutPromise).rejects.toThrow(/timeout/i);

      // Verify no enterprise was created
      const enterprises = await testPrisma.enterprise.findMany({
        where: {
          enterpriseCode: 'TX-TEST-ENT-TIMEOUT'
        }
      });

      expect(enterprises).toHaveLength(0);
    }, 5000); // Set test timeout to 5 seconds
  });

  describe('Transaction Performance', () => {
    it('should handle bulk operations efficiently', async () => {
      const batchSize = 100;
      const startTime = Date.now();

      const result = await testPrisma.$transaction(async (tx) => {
        // Create enterprise first
        const enterprise = await tx.enterprise.create({
          data: {
            enterpriseName: 'TX Test Enterprise Bulk',
            enterpriseCode: 'TX-TEST-ENT-BULK',
            isActive: true
          }
        });

        // Create sites in batches
        const siteData = Array.from({ length: batchSize }, (_, index) => ({
          siteName: `TX Test Site Bulk ${index}`,
          siteCode: `TX-TEST-SITE-BULK-${index.toString().padStart(3, '0')}`,
          enterpriseId: enterprise.id,
          isActive: true
        }));

        // Use createMany for better performance
        await tx.site.createMany({
          data: siteData
        });

        return enterprise;
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all sites were created
      const sites = await testPrisma.site.findMany({
        where: {
          enterpriseId: result.id
        }
      });

      expect(sites).toHaveLength(batchSize);

      // Performance assertion - should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
    });

    it('should measure transaction overhead', async () => {
      const iterations = 10;
      const transactionTimes: number[] = [];
      const directTimes: number[] = [];

      // Measure transaction performance
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await testPrisma.$transaction(async (tx) => {
          await tx.enterprise.create({
            data: {
              enterpriseName: `TX Test Enterprise Perf TX ${i}`,
              enterpriseCode: `TX-TEST-ENT-PERF-TX-${i}`,
              isActive: true
            }
          });
        });

        transactionTimes.push(Date.now() - startTime);
      }

      // Measure direct operation performance
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();

        await testPrisma.enterprise.create({
          data: {
            enterpriseName: `TX Test Enterprise Perf Direct ${i}`,
            enterpriseCode: `TX-TEST-ENT-PERF-DIRECT-${i}`,
            isActive: true
          }
        });

        directTimes.push(Date.now() - startTime);
      }

      const avgTransactionTime = transactionTimes.reduce((a, b) => a + b, 0) / iterations;
      const avgDirectTime = directTimes.reduce((a, b) => a + b, 0) / iterations;

      // Transaction overhead should be reasonable (less than 50% overhead)
      const overhead = (avgTransactionTime - avgDirectTime) / avgDirectTime;
      expect(overhead).toBeLessThan(0.5);

      console.log(`Average transaction time: ${avgTransactionTime}ms`);
      console.log(`Average direct time: ${avgDirectTime}ms`);
      console.log(`Transaction overhead: ${(overhead * 100).toFixed(2)}%`);
    });
  });

  describe('Error Recovery', () => {
    it('should maintain database consistency after failed transaction', async () => {
      // Create initial data
      const enterprise = await testPrisma.enterprise.create({
        data: {
          enterpriseName: 'TX Test Enterprise Recovery',
          enterpriseCode: 'TX-TEST-ENT-RECOVERY',
          isActive: true
        }
      });

      const initialSiteCount = await testPrisma.site.count({
        where: {
          enterpriseId: enterprise.id
        }
      });

      // Attempt transaction that will fail
      await expect(async () => {
        await testPrisma.$transaction(async (tx) => {
          // Create a site (this will succeed)
          await tx.site.create({
            data: {
              siteName: 'TX Test Site Recovery Success',
              siteCode: 'TX-TEST-SITE-RECOVERY-SUCCESS',
              enterpriseId: enterprise.id,
              isActive: true
            }
          });

          // Create another site (this will succeed)
          await tx.site.create({
            data: {
              siteName: 'TX Test Site Recovery Success 2',
              siteCode: 'TX-TEST-SITE-RECOVERY-SUCCESS-2',
              enterpriseId: enterprise.id,
              isActive: true
            }
          });

          // This will fail
          await tx.site.create({
            data: {
              siteName: 'TX Test Site Recovery Fail',
              siteCode: 'TX-TEST-SITE-RECOVERY-SUCCESS', // Duplicate code
              enterpriseId: enterprise.id,
              isActive: true
            }
          });
        });
      }).rejects.toThrow();

      // Verify site count hasn't changed (transaction was rolled back)
      const finalSiteCount = await testPrisma.site.count({
        where: {
          enterpriseId: enterprise.id
        }
      });

      expect(finalSiteCount).toBe(initialSiteCount);

      // Verify specific sites don't exist
      const sites = await testPrisma.site.findMany({
        where: {
          enterpriseId: enterprise.id,
          siteName: {
            contains: 'Recovery'
          }
        }
      });

      expect(sites).toHaveLength(0);
    });

    it('should handle connection loss during transaction', async () => {
      // This test simulates connection issues during transaction
      const connectionErrorTransaction = async () => {
        await testPrisma.$transaction(async (tx) => {
          // Create enterprise
          await tx.enterprise.create({
            data: {
              enterpriseName: 'TX Test Enterprise Connection',
              enterpriseCode: 'TX-TEST-ENT-CONNECTION',
              isActive: true
            }
          });

          // Simulate connection loss
          throw new Error('Connection lost');
        });
      };

      await expect(connectionErrorTransaction()).rejects.toThrow('Connection lost');

      // Verify no enterprise was created
      const enterprises = await testPrisma.enterprise.findMany({
        where: {
          enterpriseCode: 'TX-TEST-ENT-CONNECTION'
        }
      });

      expect(enterprises).toHaveLength(0);
    });
  });
});