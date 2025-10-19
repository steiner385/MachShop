/**
 * Authentication Service Configuration
 * Environment variable validation and configuration setup
 */

import Joi from 'joi';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Configuration schema validation using Joi
 */
const envSchema = Joi.object({
  // Service Configuration
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(3008),
  SERVICE_NAME: Joi.string().default('auth-service'),

  // Database Configuration
  AUTH_DATABASE_URL: Joi.string()
    .required()
    .description('PostgreSQL connection string for Auth Service database'),

  // Redis Configuration
  REDIS_URL: Joi.string()
    .default('redis://localhost:6379')
    .description('Redis connection URL for refresh tokens and caching'),

  // Kafka Configuration
  KAFKA_BROKERS: Joi.string()
    .default('localhost:9092')
    .description('Comma-separated list of Kafka broker addresses'),
  KAFKA_CLIENT_ID: Joi.string().default('auth-service'),
  KAFKA_GROUP_ID: Joi.string().default('auth-service-group'),

  // JWT Configuration
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret key for JWT signing (minimum 32 characters)'),
  JWT_EXPIRE: Joi.string()
    .default('24h')
    .description('Access token expiration time (e.g., 24h, 1d, 60m)'),
  JWT_REFRESH_EXPIRE: Joi.string()
    .default('7d')
    .description('Refresh token expiration time (e.g., 7d, 30d)'),

  // Security Configuration
  BCRYPT_ROUNDS: Joi.number()
    .min(10)
    .max(15)
    .default(12)
    .description('Number of bcrypt hashing rounds'),
  SESSION_SECRET: Joi.string()
    .min(32)
    .required()
    .description('Secret for session management'),

  // CORS Configuration
  CORS_ORIGIN: Joi.string()
    .default('http://localhost:5173')
    .description('Allowed CORS origin(s)'),
  CORS_CREDENTIALS: Joi.boolean()
    .default(true)
    .description('Allow credentials in CORS'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(900000)
    .description('Rate limit time window in milliseconds (default 15 minutes)'),
  RATE_LIMIT_MAX_REQUESTS: Joi.number()
    .default(100)
    .description('Maximum requests per time window'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
}).unknown();

/**
 * Validate environment variables
 */
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

/**
 * Typed configuration object
 */
export const config = {
  // Service
  env: envVars.NODE_ENV as 'development' | 'test' | 'production',
  port: envVars.PORT as number,
  serviceName: envVars.SERVICE_NAME as string,
  isDevelopment: envVars.NODE_ENV === 'development',
  isProduction: envVars.NODE_ENV === 'production',
  isTest: envVars.NODE_ENV === 'test',

  // Database
  database: {
    url: envVars.AUTH_DATABASE_URL as string,
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

  // JWT
  jwt: {
    secret: envVars.JWT_SECRET as string,
    accessTokenExpire: envVars.JWT_EXPIRE as string,
    refreshTokenExpire: envVars.JWT_REFRESH_EXPIRE as string,
  },

  // Security
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS as number,
    sessionSecret: envVars.SESSION_SECRET as string,
  },

  // CORS
  cors: {
    origin: envVars.CORS_ORIGIN as string,
    credentials: envVars.CORS_CREDENTIALS as boolean,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: envVars.RATE_LIMIT_WINDOW_MS as number,
    maxRequests: envVars.RATE_LIMIT_MAX_REQUESTS as number,
  },

  // Logging
  logging: {
    level: envVars.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
  },
};

/**
 * Validate critical configuration at startup
 */
export function validateConfig(): void {
  console.log('🔍 Validating configuration...');

  // Validate JWT secret strength
  if (config.jwt.secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate session secret strength
  if (config.security.sessionSecret.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters long');
  }

  // Warn about insecure defaults in production
  if (config.isProduction) {
    if (config.jwt.secret.includes('change-this')) {
      throw new Error('JWT_SECRET must be changed from default in production');
    }
    if (config.security.sessionSecret.includes('change-this')) {
      throw new Error('SESSION_SECRET must be changed from default in production');
    }
    if (config.security.bcryptRounds < 12) {
      console.warn('⚠️  BCRYPT_ROUNDS < 12 in production is not recommended');
    }
  }

  console.log('✅ Configuration validated successfully');
  console.log(`📊 Environment: ${config.env}`);
  console.log(`🚪 Port: ${config.port}`);
  console.log(`🔐 Bcrypt rounds: ${config.security.bcryptRounds}`);
  console.log(`⏰ Access token expiration: ${config.jwt.accessTokenExpire}`);
  console.log(`🔄 Refresh token expiration: ${config.jwt.refreshTokenExpire}`);
}

export default config;
