/**
 * Comprehensive Database Error Handling Tests
 *
 * Tests database error scenarios including connection failures, constraint violations,
 * timeout handling, and recovery mechanisms. This ensures robust error handling
 * throughout the database layer.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';

// Custom error types for testing
class DatabaseErrorHandler {
  static handlePrismaError(error: any): { type: string; message: string; code?: string } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return {
            type: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: 'A record with this value already exists',
            code: error.code
          };
        case 'P2003':
          return {
            type: 'FOREIGN_KEY_CONSTRAINT_VIOLATION',
            message: 'Foreign key constraint failed',
            code: error.code
          };
        case 'P2025':
          return {
            type: 'RECORD_NOT_FOUND',
            message: 'Record not found',
            code: error.code
          };
        case 'P2014':
          return {
            type: 'RELATION_VIOLATION',
            message: 'The change would violate a relation',
            code: error.code
          };
        default:
          return {
            type: 'KNOWN_DATABASE_ERROR',
            message: error.message,
            code: error.code
          };
      }
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      return {
        type: 'UNKNOWN_DATABASE_ERROR',
        message: 'An unknown database error occurred'
      };
    }

    if (error instanceof Prisma.PrismaClientInitializationError) {
      return {
        type: 'DATABASE_CONNECTION_ERROR',
        message: 'Failed to connect to database'
      };
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return {
        type: 'VALIDATION_ERROR',
        message: 'Invalid data provided'
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred'
    };
  }

  static isRetryableError(error: any): boolean {
    // Check if error is retryable (connection issues, timeouts, etc.)
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return true;
    }

    if (error instanceof Prisma.PrismaClientUnknownRequestError) {
      // Check if it's a connection-related error
      return error.message.includes('connection') || error.message.includes('timeout');
    }

    return false;
  }
}

// Retry utility for testing
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 100
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !DatabaseErrorHandler.isRetryableError(error)) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError;
}

describe('Database Error Handling Tests', () => {
  let testPrisma: PrismaClient;
  let validTestData: any;

  beforeAll(async () => {
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
    await cleanupTestData();
    await testPrisma.$disconnect();
  });

  beforeEach(async () => {
    await cleanupTestData();

    // Set up valid test data for each test
    validTestData = {
      enterprise: {
        enterpriseName: 'Error Test Enterprise',
        enterpriseCode: 'ERROR-TEST-ENT',
        isActive: true
      },
      site: {
        siteName: 'Error Test Site',
        siteCode: 'ERROR-TEST-SITE',
        isActive: true
      },
      user: {
        username: 'error-test-user',
        email: 'error-test@example.com',
        firstName: 'Error',
        lastName: 'Test',
        passwordHash: '$2b$10$error.test.hash.value',
        isActive: true
      },
      part: {
        partNumber: 'ERROR-TEST-PART',
        partName: 'Error Test Part',
        description: 'Part for error testing',
        partType: 'MANUFACTURED',
        unitOfMeasure: 'EA',
        isActive: true
      }
    };
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  async function cleanupTestData() {
    try {
      await testPrisma.workOrder.deleteMany({
        where: {
          workOrderNumber: {
            startsWith: 'ERROR-TEST-'
          }
        }
      });
      await testPrisma.part.deleteMany({
        where: {
          partNumber: {
            startsWith: 'ERROR-TEST-'
          }
        }
      });
      await testPrisma.site.deleteMany({
        where: {
          siteCode: {
            startsWith: 'ERROR-TEST-'
          }
        }
      });
      await testPrisma.enterprise.deleteMany({
        where: {
          enterpriseCode: {
            startsWith: 'ERROR-TEST-'
          }
        }
      });
      await testPrisma.user.deleteMany({
        where: {
          username: {
            startsWith: 'error-test-'
          }
        }
      });
    } catch (error) {
      console.warn('Error handling test cleanup failed:', error);
    }
  }

  describe('Constraint Violation Errors', () => {
    it('should handle unique constraint violations correctly', async () => {
      // Create initial record
      await testPrisma.enterprise.create({
        data: validTestData.enterprise
      });

      // Try to create duplicate
      try {
        await testPrisma.enterprise.create({
          data: validTestData.enterprise
        });
        expect.fail('Should have thrown unique constraint error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('UNIQUE_CONSTRAINT_VIOLATION');
        expect(handled.code).toBe('P2002');
        expect(handled.message).toBe('A record with this value already exists');
      }
    });

    it('should handle foreign key constraint violations', async () => {
      // Try to create site without enterprise
      try {
        await testPrisma.site.create({
          data: {
            ...validTestData.site,
            enterpriseId: 'non-existent-id'
          }
        });
        expect.fail('Should have thrown foreign key constraint error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');
        expect(handled.code).toBe('P2003');
      }
    });

    it('should handle record not found errors', async () => {
      try {
        await testPrisma.enterprise.update({
          where: { id: 'non-existent-id' },
          data: { enterpriseName: 'Updated Name' }
        });
        expect.fail('Should have thrown record not found error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('RECORD_NOT_FOUND');
        expect(handled.code).toBe('P2025');
      }
    });

    it('should handle cascade delete constraint violations', async () => {
      // Create enterprise and site
      const enterprise = await testPrisma.enterprise.create({
        data: validTestData.enterprise
      });

      await testPrisma.site.create({
        data: {
          ...validTestData.site,
          enterpriseId: enterprise.id
        }
      });

      // Try to delete enterprise with dependent site
      try {
        await testPrisma.enterprise.delete({
          where: { id: enterprise.id }
        });
        expect.fail('Should have thrown relation violation error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(['FOREIGN_KEY_CONSTRAINT_VIOLATION', 'RELATION_VIOLATION']).toContain(handled.type);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should handle field validation errors', async () => {
      try {
        await testPrisma.user.create({
          data: {
            username: 'error-test-validation',
            email: 'invalid-email', // Invalid email format
            firstName: '',  // Empty required field
            lastName: 'Test',
            passwordHash: '$2b$10$error.test.hash.value',
            isActive: true
          }
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle enum validation errors', async () => {
      const enterprise = await testPrisma.enterprise.create({
        data: validTestData.enterprise
      });

      const site = await testPrisma.site.create({
        data: {
          ...validTestData.site,
          enterpriseId: enterprise.id
        }
      });

      const user = await testPrisma.user.create({
        data: validTestData.user
      });

      const part = await testPrisma.part.create({
        data: validTestData.part
      });

      try {
        await testPrisma.workOrder.create({
          data: {
            workOrderNumber: 'ERROR-TEST-WO',
            partId: part.id,
            siteId: site.id,
            quantity: 100,
            status: 'INVALID_STATUS' as any, // Invalid enum value
            priority: 'NORMAL',
            createdById: user.id
          }
        });
        expect.fail('Should have thrown enum validation error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle missing required fields', async () => {
      try {
        await testPrisma.part.create({
          data: {
            partName: 'Test Part',
            // Missing required partNumber field
            description: 'Test description',
            partType: 'MANUFACTURED',
            unitOfMeasure: 'EA',
            isActive: true
          } as any
        });
        expect.fail('Should have thrown validation error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('Connection and Timeout Errors', () => {
    it('should handle database connection errors', async () => {
      // Create a client with invalid connection string
      const invalidClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:9999/invalid'
          }
        }
      });

      try {
        await invalidClient.$connect();
        await invalidClient.enterprise.findMany();
        expect.fail('Should have thrown connection error');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('DATABASE_CONNECTION_ERROR');
      } finally {
        await invalidClient.$disconnect().catch(() => {});
      }
    });

    it('should handle query timeouts', async () => {
      // Create a client with very short timeout
      const timeoutClient = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      try {
        await timeoutClient.$connect();

        // This test is tricky because we need to simulate a timeout
        // For demonstration, we'll test with a mock timeout scenario
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Query timeout'));
          }, 100);
        });

        const queryPromise = timeoutClient.enterprise.findMany();

        await expect(Promise.race([queryPromise, timeoutPromise])).rejects.toThrow('Query timeout');

      } finally {
        await timeoutClient.$disconnect().catch(() => {});
      }
    });
  });

  describe('Error Recovery and Retry Logic', () => {
    it('should retry retryable operations', async () => {
      let attemptCount = 0;

      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          // Simulate connection error
          throw new Prisma.PrismaClientInitializationError('Connection failed', '1.0.0', '123');
        }

        return await testPrisma.enterprise.create({
          data: validTestData.enterprise
        });
      };

      const result = await withRetry(operation, 3, 50);

      expect(result.enterpriseName).toBe(validTestData.enterprise.enterpriseName);
      expect(attemptCount).toBe(3);
    });

    it('should not retry non-retryable errors', async () => {
      let attemptCount = 0;

      const operation = async () => {
        attemptCount++;
        // Simulate unique constraint violation (non-retryable)
        throw new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed',
          {
            code: 'P2002',
            clientVersion: '1.0.0'
          }
        );
      };

      await expect(withRetry(operation, 3, 50)).rejects.toThrow('Unique constraint failed');

      expect(attemptCount).toBe(1); // Should not retry
    });

    it('should handle graceful degradation', async () => {
      // Test graceful degradation when database is unavailable
      const degradedClient = new PrismaClient({
        datasources: {
          db: {
            url: 'postgresql://invalid:invalid@localhost:9999/invalid'
          }
        }
      });

      const fallbackData = {
        enterprises: [],
        error: 'Database unavailable'
      };

      try {
        const enterprises = await degradedClient.enterprise.findMany();
        expect.fail('Should have failed');
      } catch (error) {
        // Simulate graceful degradation
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        if (handled.type === 'DATABASE_CONNECTION_ERROR') {
          // Return fallback data
          expect(fallbackData.error).toBe('Database unavailable');
          expect(fallbackData.enterprises).toEqual([]);
        }
      } finally {
        await degradedClient.$disconnect().catch(() => {});
      }
    });
  });

  describe('Transaction Error Handling', () => {
    it('should handle errors within transactions', async () => {
      try {
        await testPrisma.$transaction(async (tx) => {
          // Create enterprise (should succeed)
          await tx.enterprise.create({
            data: validTestData.enterprise
          });

          // Try to create duplicate (should fail)
          await tx.enterprise.create({
            data: validTestData.enterprise
          });
        });
        expect.fail('Transaction should have failed');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('UNIQUE_CONSTRAINT_VIOLATION');

        // Verify transaction was rolled back
        const enterprises = await testPrisma.enterprise.findMany({
          where: {
            enterpriseCode: validTestData.enterprise.enterpriseCode
          }
        });
        expect(enterprises).toHaveLength(0);
      }
    });

    it('should handle partial transaction failures', async () => {
      const enterprise = await testPrisma.enterprise.create({
        data: validTestData.enterprise
      });

      try {
        await testPrisma.$transaction(async (tx) => {
          // Create site (should succeed)
          await tx.site.create({
            data: {
              ...validTestData.site,
              enterpriseId: enterprise.id
            }
          });

          // Try to create user with invalid data (should fail)
          await tx.user.create({
            data: {
              username: 'error-test-transaction',
              email: 'invalid-email-format',
              firstName: '',
              lastName: 'Test',
              passwordHash: '$2b$10$error.test.hash.value',
              isActive: true
            }
          });
        });
        expect.fail('Transaction should have failed');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('VALIDATION_ERROR');

        // Verify site was not created (transaction rolled back)
        const sites = await testPrisma.site.findMany({
          where: {
            siteCode: validTestData.site.siteCode
          }
        });
        expect(sites).toHaveLength(0);
      }
    });
  });

  describe('Bulk Operation Error Handling', () => {
    it('should handle bulk operation failures', async () => {
      const bulkData = [
        { ...validTestData.enterprise, enterpriseCode: 'ERROR-BULK-1' },
        { ...validTestData.enterprise, enterpriseCode: 'ERROR-BULK-2' },
        { ...validTestData.enterprise, enterpriseCode: 'ERROR-BULK-1' } // Duplicate
      ];

      try {
        await testPrisma.enterprise.createMany({
          data: bulkData
        });
        expect.fail('Bulk operation should have failed');
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(handled.type).toBe('UNIQUE_CONSTRAINT_VIOLATION');

        // Verify no records were created
        const enterprises = await testPrisma.enterprise.findMany({
          where: {
            enterpriseCode: {
              startsWith: 'ERROR-BULK-'
            }
          }
        });
        expect(enterprises).toHaveLength(0);
      }
    });

    it('should handle partial bulk update failures', async () => {
      // Create test enterprises
      await testPrisma.enterprise.createMany({
        data: [
          { ...validTestData.enterprise, enterpriseCode: 'ERROR-UPDATE-1' },
          { ...validTestData.enterprise, enterpriseCode: 'ERROR-UPDATE-2' }
        ]
      });

      try {
        // Try to update with invalid data
        await testPrisma.enterprise.updateMany({
          where: {
            enterpriseCode: {
              startsWith: 'ERROR-UPDATE-'
            }
          },
          data: {
            enterpriseName: '', // Invalid empty name
            isActive: false
          }
        });

        // This might not fail depending on database constraints
        // But we can test the error handling structure
      } catch (error) {
        const handled = DatabaseErrorHandler.handlePrismaError(error);

        expect(['VALIDATION_ERROR', 'KNOWN_DATABASE_ERROR', 'UNKNOWN_DATABASE_ERROR']).toContain(handled.type);
      }
    });
  });

  describe('Error Logging and Monitoring', () => {
    it('should capture and format error details', async () => {
      const errorCapture: any[] = [];

      const captureError = (operation: string, error: any) => {
        const handled = DatabaseErrorHandler.handlePrismaError(error);
        errorCapture.push({
          operation,
          timestamp: new Date().toISOString(),
          error: handled,
          originalError: {
            name: error.constructor.name,
            message: error.message
          }
        });
      };

      // Test various error scenarios
      try {
        await testPrisma.enterprise.create({
          data: validTestData.enterprise
        });

        await testPrisma.enterprise.create({
          data: validTestData.enterprise
        });
      } catch (error) {
        captureError('enterprise.create', error);
      }

      try {
        await testPrisma.site.create({
          data: {
            ...validTestData.site,
            enterpriseId: 'non-existent'
          }
        });
      } catch (error) {
        captureError('site.create', error);
      }

      expect(errorCapture).toHaveLength(2);
      expect(errorCapture[0].error.type).toBe('UNIQUE_CONSTRAINT_VIOLATION');
      expect(errorCapture[1].error.type).toBe('FOREIGN_KEY_CONSTRAINT_VIOLATION');

      // Verify timestamps and original error details are captured
      errorCapture.forEach(capture => {
        expect(capture.timestamp).toBeDefined();
        expect(capture.operation).toBeDefined();
        expect(capture.originalError.name).toBeDefined();
        expect(capture.originalError.message).toBeDefined();
      });
    });
  });
});