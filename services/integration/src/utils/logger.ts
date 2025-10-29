/**
 * Logger Utility for Directory Services
 * Issue #128: External Integration: LDAP/AD Role Synchronization
 *
 * Centralized logging utility for directory service operations.
 */

import { createLogger, format, transports } from 'winston';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, ...meta }) => {
  let logMessage = `${timestamp} [${level}]: ${message}`;

  // Add metadata if present
  if (Object.keys(meta).length > 0) {
    logMessage += ` ${JSON.stringify(meta)}`;
  }

  return logMessage;
});

// Create Winston logger instance
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  defaultMeta: { service: 'directory-integration' },
  transports: [
    // Console transport for development
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
      ),
    }),

    // File transport for production logs
    new transports.File({
      filename: 'logs/directory-error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined log file
    new transports.File({
      filename: 'logs/directory-combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
import path from 'path';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper methods for structured logging
export const directoryLogger = {
  info: (message: string, meta?: Record<string, any>) => {
    logger.info(message, meta);
  },

  warn: (message: string, meta?: Record<string, any>) => {
    logger.warn(message, meta);
  },

  error: (message: string, meta?: Record<string, any>) => {
    logger.error(message, meta);
  },

  debug: (message: string, meta?: Record<string, any>) => {
    logger.debug(message, meta);
  },

  // Specialized methods for directory operations
  connection: {
    attempt: (configId: string, host: string, type: string) => {
      logger.info('Directory connection attempt', {
        configId,
        host,
        type,
        operation: 'connection_attempt',
      });
    },

    success: (configId: string, host: string, type: string, duration: number) => {
      logger.info('Directory connection successful', {
        configId,
        host,
        type,
        duration,
        operation: 'connection_success',
      });
    },

    failure: (configId: string, host: string, type: string, error: string) => {
      logger.error('Directory connection failed', {
        configId,
        host,
        type,
        error,
        operation: 'connection_failure',
      });
    },

    disconnect: (configId: string, host: string, type: string) => {
      logger.info('Directory disconnected', {
        configId,
        host,
        type,
        operation: 'disconnection',
      });
    },
  },

  sync: {
    start: (configId: string, syncType: string, batchId: string) => {
      logger.info('Directory synchronization started', {
        configId,
        syncType,
        batchId,
        operation: 'sync_start',
      });
    },

    progress: (configId: string, batchId: string, stage: string, processed: number, total: number) => {
      logger.info('Directory synchronization progress', {
        configId,
        batchId,
        stage,
        processed,
        total,
        percentage: Math.round((processed / total) * 100),
        operation: 'sync_progress',
      });
    },

    complete: (configId: string, batchId: string, duration: number, stats: Record<string, number>) => {
      logger.info('Directory synchronization completed', {
        configId,
        batchId,
        duration,
        stats,
        operation: 'sync_complete',
      });
    },

    error: (configId: string, batchId: string, error: string, stage?: string) => {
      logger.error('Directory synchronization error', {
        configId,
        batchId,
        error,
        stage,
        operation: 'sync_error',
      });
    },
  },

  search: {
    start: (configId: string, filter: string, base: string, scope: string) => {
      logger.debug('Directory search started', {
        configId,
        filter,
        base,
        scope,
        operation: 'search_start',
      });
    },

    result: (configId: string, filter: string, resultCount: number, duration: number) => {
      logger.debug('Directory search completed', {
        configId,
        filter,
        resultCount,
        duration,
        operation: 'search_result',
      });
    },

    error: (configId: string, filter: string, error: string) => {
      logger.error('Directory search error', {
        configId,
        filter,
        error,
        operation: 'search_error',
      });
    },
  },

  auth: {
    attempt: (configId: string, username: string) => {
      logger.info('Directory authentication attempt', {
        configId,
        username,
        operation: 'auth_attempt',
      });
    },

    success: (configId: string, username: string, duration: number) => {
      logger.info('Directory authentication successful', {
        configId,
        username,
        duration,
        operation: 'auth_success',
      });
    },

    failure: (configId: string, username: string, reason: string) => {
      logger.warn('Directory authentication failed', {
        configId,
        username,
        reason,
        operation: 'auth_failure',
      });
    },
  },
};

// Export default logger for backward compatibility
export { logger };
export default directoryLogger;