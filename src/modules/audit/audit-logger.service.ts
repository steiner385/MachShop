/**
 * Audit Logger Service
 *
 * Manages comprehensive logging of all API requests and responses for audit trails,
 * compliance, and analytics. Provides both synchronous and asynchronous logging with
 * batch processing capabilities.
 *
 * @module modules/audit/audit-logger.service
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  apiKeyId: string;
  endpoint: string;
  httpMethod: string;
  apiVersion?: string;
  statusCode: number;
  responseTime: number; // milliseconds
  requestId: string;
  ipAddress?: string;
  userAgent?: string;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
  errorCode?: string;
  errorMessage?: string;
  requestBytes?: number;
  responseBytes?: number;
}

/**
 * Audit Logger Service
 * Handles logging of API requests and responses
 */
export class AuditLoggerService {
  private logBuffer: AuditLogEntry[] = [];
  private readonly BATCH_SIZE = 100;
  private readonly FLUSH_INTERVAL = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the audit logger with background flushing
   */
  async initialize(): Promise<void> {
    // Start background flush timer
    this.startAutoFlush();
    logger.info('Audit logger service initialized');
  }

  /**
   * Shutdown the audit logger
   */
  async shutdown(): Promise<void> {
    // Clear any pending timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Flush any remaining logs
    if (this.logBuffer.length > 0) {
      await this.flushLogs();
    }

    logger.info('Audit logger service shutdown');
  }

  /**
   * Start automatic flush timer
   */
  private startAutoFlush(): void {
    this.flushTimer = setInterval(async () => {
      if (this.logBuffer.length > 0) {
        await this.flushLogs();
      }
    }, this.FLUSH_INTERVAL);
  }

  /**
   * Log an API request/response
   * Adds to buffer for batch processing
   *
   * @param entry - Audit log entry to record
   */
  logRequest(entry: AuditLogEntry): void {
    try {
      this.logBuffer.push(entry);

      // Flush if buffer is full
      if (this.logBuffer.length >= this.BATCH_SIZE) {
        // Don't await - let it flush in background
        this.flushLogs().catch(err => {
          logger.error('Failed to flush audit logs', { error: err });
        });
      }
    } catch (error) {
      logger.error('Error buffering audit log', { error });
    }
  }

  /**
   * Flush buffered logs to database
   */
  private async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = this.logBuffer.splice(0, this.BATCH_SIZE);

    try {
      // Create all logs in batch
      await Promise.all(
        logsToFlush.map(entry =>
          prisma.apiUsageLog.create({
            data: {
              apiKeyId: entry.apiKeyId,
              endpoint: entry.endpoint,
              httpMethod: entry.httpMethod,
              apiVersion: entry.apiVersion,
              statusCode: entry.statusCode,
              responseTime: entry.responseTime,
              requestId: entry.requestId,
              ipAddress: entry.ipAddress,
              userAgent: entry.userAgent,
              rateLimitRemaining: entry.rateLimitRemaining,
              rateLimitReset: entry.rateLimitReset,
              errorCode: entry.errorCode,
              errorMessage: entry.errorMessage,
              requestBytes: entry.requestBytes,
              responseBytes: entry.responseBytes
            }
          })
        )
      );

      logger.debug(`Flushed ${logsToFlush.length} audit logs to database`);
    } catch (error) {
      logger.error('Failed to flush audit logs', { error, count: logsToFlush.length });
      // Re-add to buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Get audit logs for an API key
   *
   * @param apiKeyId - API key ID
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async getLogsForApiKey(
    apiKeyId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ) {
    try {
      return await prisma.apiUsageLog.findMany({
        where: {
          apiKeyId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('Failed to retrieve audit logs', { error, apiKeyId });
      throw error;
    }
  }

  /**
   * Get audit logs by endpoint
   *
   * @param endpoint - API endpoint
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param limit - Maximum number of logs to return
   * @returns Array of audit logs
   */
  async getLogsByEndpoint(endpoint: string, startDate: Date, endDate: Date, limit: number = 100) {
    try {
      return await prisma.apiUsageLog.findMany({
        where: {
          endpoint,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('Failed to retrieve logs by endpoint', { error, endpoint });
      throw error;
    }
  }

  /**
   * Get error logs
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param limit - Maximum number of logs to return
   * @returns Array of error logs
   */
  async getErrorLogs(startDate: Date, endDate: Date, limit: number = 100) {
    try {
      return await prisma.apiUsageLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          errorCode: {
            not: null
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      logger.error('Failed to retrieve error logs', { error });
      throw error;
    }
  }

  /**
   * Get aggregate statistics for a time period
   *
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Statistics object
   */
  async getStatistics(startDate: Date, endDate: Date) {
    try {
      const logs = await prisma.apiUsageLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      const totalRequests = logs.length;
      const successfulRequests = logs.filter(l => l.statusCode < 400).length;
      const failedRequests = logs.filter(l => l.statusCode >= 400).length;
      const avgResponseTime = logs.length > 0 ? logs.reduce((sum, l) => sum + l.responseTime, 0) / logs.length : 0;

      // Status code distribution
      const statusCodes: Record<number, number> = {};
      for (const log of logs) {
        statusCodes[log.statusCode] = (statusCodes[log.statusCode] || 0) + 1;
      }

      // Top endpoints
      const endpointCounts: Record<string, number> = {};
      for (const log of logs) {
        endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
      }

      const topEndpoints = Object.entries(endpointCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));

      return {
        period: { startDate, endDate },
        totalRequests,
        successfulRequests,
        failedRequests,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        avgResponseTime: Math.round(avgResponseTime),
        statusCodes,
        topEndpoints
      };
    } catch (error) {
      logger.error('Failed to retrieve statistics', { error });
      throw error;
    }
  }

  /**
   * Clean up old logs (retention policy)
   *
   * @param retentionDays - Number of days to retain logs
   * @returns Number of logs deleted
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.apiUsageLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate
          }
        }
      });

      logger.info('Cleaned up old audit logs', { count: result.count, retentionDays });
      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup audit logs', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const auditLoggerService = new AuditLoggerService();
