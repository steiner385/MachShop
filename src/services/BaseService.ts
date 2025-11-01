/**
 * Base Service Class
 *
 * Provides common functionality for all services:
 * - Constructor-based dependency injection for Prisma
 * - Lazy-loaded singleton pattern support
 * - Consistent error handling
 * - Logging capabilities
 *
 * All services should extend this class to ensure consistent patterns
 * and proper test support.
 */

import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger';

/**
 * Abstract base class for all services
 *
 * Usage:
 * ```typescript
 * export class MyService extends BaseService {
 *   async doSomething() {
 *     return this.prisma.model.findMany(...);
 *   }
 * }
 *
 * // For tests:
 * const mockPrisma = { ... };
 * const service = new MyService(mockPrisma);
 * ```
 */
export abstract class BaseService {
  protected prisma: PrismaClient;
  protected logger: ReturnType<typeof createLogger>;

  /**
   * Constructor for dependency injection
   * @param prisma Optional PrismaClient instance. If not provided, creates a new one.
   * @param loggerName Optional logger name. Defaults to class name.
   */
  constructor(prisma?: PrismaClient, loggerName?: string) {
    this.prisma = prisma || new PrismaClient();
    this.logger = createLogger(loggerName || this.constructor.name);
  }

  /**
   * Log an info message
   */
  protected logInfo(message: string, data?: any): void {
    this.logger.info(message, data);
  }

  /**
   * Log an error message
   */
  protected logError(message: string, error?: any): void {
    this.logger.error(message, error);
  }

  /**
   * Log a debug message
   */
  protected logDebug(message: string, data?: any): void {
    this.logger.debug(message, data);
  }

  /**
   * Log a warning message
   */
  protected logWarn(message: string, data?: any): void {
    this.logger.warn(message, data);
  }

  /**
   * Helper method to safely handle errors and log them
   */
  protected async safeExecute<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logError(errorMessage, error);
      throw error;
    }
  }

  /**
   * Helper method to validate required parameters
   */
  protected validateRequired(
    value: any,
    fieldName: string
  ): void {
    if (value === null || value === undefined || value === '') {
      throw new Error(`${fieldName} is required`);
    }
  }

  /**
   * Helper method to validate an ID parameter
   */
  protected validateId(id: any, fieldName: string = 'ID'): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new Error(`Valid ${fieldName} is required`);
    }
  }
}
