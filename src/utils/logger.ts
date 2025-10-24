import * as winston from 'winston';
import { config } from '../config/config';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  })
);

// Configure console format based on environment
const consoleFormat = config.env === 'production' 
  ? winston.format.combine(
      logFormat,
      winston.format.json()
    )
  : winston.format.combine(
      logFormat,
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, metadata }: any) => {
        const metaStr = Object.keys(metadata || {}).length > 0
          ? `\n${JSON.stringify(metadata, null, 2)}`
          : '';
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'mes-api',
    environment: config.env,
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      stderrLevels: ['error']
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.combine(
        logFormat,
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.combine(
        logFormat,
        winston.format.json()
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: winston.format.combine(
        logFormat,
        winston.format.json()
      )
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: winston.format.combine(
        logFormat,
        winston.format.json()
      )
    })
  ]
});

// Add development-specific transports
if (config.env === 'development') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Create structured logging methods
export const createLogger = (service: string) => {
  return {
    error: (message: string, meta: any = {}) => {
      logger.error(message, { service, ...meta });
    },
    
    warn: (message: string, meta: any = {}) => {
      logger.warn(message, { service, ...meta });
    },
    
    info: (message: string, meta: any = {}) => {
      logger.info(message, { service, ...meta });
    },
    
    debug: (message: string, meta: any = {}) => {
      logger.debug(message, { service, ...meta });
    },
    
    // Audit logging for compliance
    audit: (action: string, userId: string, entityType: string, entityId: string, details: any = {}) => {
      logger.info('AUDIT', {
        service,
        audit: true,
        action,
        userId,
        entityType,
        entityId,
        timestamp: new Date().toISOString(),
        ...details
      });
    },
    
    // Performance logging
    performance: (operation: string, duration: number, meta: any = {}) => {
      logger.info('PERFORMANCE', {
        service,
        performance: true,
        operation,
        duration,
        ...meta
      });
    },
    
    // Security logging
    security: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: any = {}) => {
      logger.warn('SECURITY', {
        service,
        security: true,
        event,
        severity,
        timestamp: new Date().toISOString(),
        ...details
      });
    }
  };
};

// HTTP request logging formatter
export const httpLogFormat = winston.format.printf(({ level, message, timestamp, metadata }: any) => {
  const { req, res, responseTime } = metadata || {};
  
  if (req && res) {
    return `${timestamp} [${level}]: ${req.method} ${req.url} ${res.statusCode} - ${responseTime}ms - ${req.ip}`;
  }
  
  return `${timestamp} [${level}]: ${message}`;
});

// Create HTTP logger
export const httpLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    httpLogFormat
  ),
  transports: [
    new winston.transports.File({
      filename: 'logs/http.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Stream for Morgan middleware
export const logStream = {
  write: (message: string) => {
    httpLogger.info(message.trim());
  }
};

// Helper functions for Logstash integration and distributed tracing
export const logWithTrace = (level: string, message: string, traceId?: string, meta: any = {}) => {
  logger.log(level, message, {
    ...meta,
    traceId,
    correlationId: traceId, // For Logstash correlation
  });
};

export const logHttpRequest = (req: any, statusCode: number, duration: number) => {
  const traceId = req.headers['x-request-id'] || req.headers['x-trace-id'];
  logger.info('HTTP Request', {
    http: {
      method: req.method,
      url: req.url,
      path: req.path,
      statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
    traceId,
    correlationId: traceId,
  });
};

export const logBusinessEvent = (
  event: string,
  entity: string,
  entityId: string | number,
  userId?: string | number,
  meta: any = {}
) => {
  logger.info('Business event', {
    audit: true,
    event,
    entity,
    entityId,
    userId,
    timestamp: new Date().toISOString(),
    ...meta,
  });
};

export default logger;