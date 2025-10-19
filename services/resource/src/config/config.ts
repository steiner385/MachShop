/**
 * Work Order Service Configuration
 * Environment variable validation using Joi
 */

import Joi from 'joi';

// ============================================================================
// Environment Variable Schema
// ============================================================================

const envSchema = Joi.object({
  // Service Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),

  PORT: Joi.number()
    .default(3013),

  SERVICE_NAME: Joi.string()
    .default('resource-service'),

  // Database Configuration
  RESOURCE_DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL connection string for Work Order database'),

  // Redis Configuration
  REDIS_URL: Joi.string()
    .default('redis://localhost:6379')
    .description('Redis connection string for caching'),

  // Kafka Configuration
  KAFKA_BROKERS: Joi.string()
    .default('localhost:9092')
    .description('Comma-separated list of Kafka brokers'),

  KAFKA_CLIENT_ID: Joi.string()
    .default('resource-service'),

  KAFKA_GROUP_ID: Joi.string()
    .default('resource-service-group'),

  // CORS Configuration
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:5173')
    .description('Allowed CORS origin'),

  CORS_CREDENTIALS: Joi.string()
    .valid('true', 'false')
    .default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(900000) // 15 minutes
    .description('Rate limit window in milliseconds'),

  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .default(100)
    .description('Maximum requests per window'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly')
    .default('info'),

  // Business Rules
  MAX_RESOURCE_QUANTITY: Joi.number()
    .default(10000)
    .description('Maximum quantity per work order'),

  DEFAULT_DAILY_CAPACITY: Joi.number()
    .default(100)
    .description('Default daily production capacity for estimation'),

  // Auth Service Integration (for token verification)
  AUTH_SERVICE_URL: Joi.string()
    .default('http://localhost:3008')
    .description('Auth Service URL for token verification'),

}).unknown(true);

// ============================================================================
// Validate Environment
// ============================================================================

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// ============================================================================
// Export Typed Configuration
// ============================================================================

export const config = {
  // Environment
  env: envVars.NODE_ENV as string,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  // Service
  port: envVars.PORT as number,
  serviceName: envVars.SERVICE_NAME as string,

  // Database
  database: {
    url: envVars.RESOURCE_DATABASE_URL as string,
  },

  // Redis
  redis: {
    url: envVars.REDIS_URL as string,
  },

  // Kafka
  kafka: {
    brokers: (envVars.KAFKA_BROKERS as string).split(',').map(b => b.trim()),
    clientId: envVars.KAFKA_CLIENT_ID as string,
    groupId: envVars.KAFKA_GROUP_ID as string,
  },

  // CORS
  cors: {
    origin: envVars.CORS_ORIGIN as string,
    credentials: envVars.CORS_CREDENTIALS === 'true',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  },

  // Logging
  logging: {
    level: envVars.LOG_LEVEL as string,
  },

  // Business Rules
  businessRules: {
    maxWorkOrderQuantity: envVars.MAX_RESOURCE_QUANTITY as number,
    defaultDailyCapacity: envVars.DEFAULT_DAILY_CAPACITY as number,
  },

  // Auth Integration
  auth: {
    serviceUrl: envVars.AUTH_SERVICE_URL as string,
  },
} as const;

// ============================================================================
// Configuration Logging
// ============================================================================

export function logConfiguration(): void {
  console.log('[CONFIG] Work Order Service Configuration:');
  console.log(`  Environment: ${config.env}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Service Name: ${config.serviceName}`);
  console.log(`  Database: ${config.database.url.replace(/:[^:@]+@/, ':***@')}`);
  console.log(`  Redis: ${config.redis.url}`);
  console.log(`  Kafka Brokers: ${config.kafka.brokers.join(', ')}`);
  console.log(`  CORS Origin: ${config.cors.origin}`);
  console.log(`  Log Level: ${config.logging.level}`);
  console.log(`  Max Work Order Quantity: ${config.businessRules.maxWorkOrderQuantity}`);
  console.log(`  Default Daily Capacity: ${config.businessRules.defaultDailyCapacity}`);
}
