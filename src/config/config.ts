import * as dotenv from 'dotenv';
import * as joi from 'joi';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' :
                process.env.NODE_ENV === 'development' ? '.env.development' :
                '.env';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || envFile });

// Configuration schema validation
const envSchema = joi.object({
  NODE_ENV: joi.string().valid('development', 'test', 'production').default('development'),
  PORT: joi.number().positive().default(3000),
  
  // Database configuration
  DATABASE_URL: joi.string().required(),
  DB_POOL_MIN: joi.number().min(0).default(2),
  DB_POOL_MAX: joi.number().min(1).default(10),
  
  // Redis configuration
  REDIS_URL: joi.string().default('redis://localhost:6379'),
  REDIS_PASSWORD: joi.string().allow(''),
  
  // JWT configuration
  JWT_SECRET: joi.string().min(32).required(),
  JWT_EXPIRE: joi.string().default('24h'),
  JWT_REFRESH_EXPIRE: joi.string().default('7d'),
  
  // Security configuration
  BCRYPT_ROUNDS: joi.number().min(10).max(15).default(12),
  SESSION_SECRET: joi.string().min(32).required(),
  
  // CORS configuration
  CORS_ORIGINS: joi.string().default('http://localhost:3000,http://localhost:3001'),
  
  // File upload configuration
  MAX_FILE_SIZE: joi.number().default(10485760), // 10MB
  UPLOAD_PATH: joi.string().default('./uploads'),
  
  // External service configuration
  ERP_API_URL: joi.string().uri().allow(''),
  ERP_API_KEY: joi.string().allow(''),
  PLM_API_URL: joi.string().uri().allow(''),
  PLM_API_KEY: joi.string().allow(''),
  
  // Message queue configuration
  KAFKA_BROKERS: joi.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: joi.string().default('mes-api'),
  
  // Logging configuration
  LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: joi.string().valid('json', 'simple').default('json'),
  
  // Performance configuration
  CLUSTER_MODE: joi.boolean().default(false),
  RATE_LIMIT_WINDOW: joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX: joi.number().default(1000),
  
  // Monitoring configuration
  METRICS_ENABLED: joi.boolean().default(true),
  HEALTH_CHECK_INTERVAL: joi.number().default(30000), // 30 seconds
  
  // Email configuration (for notifications)
  SMTP_HOST: joi.string().allow(''),
  SMTP_PORT: joi.number().allow(''),
  SMTP_USER: joi.string().allow(''),
  SMTP_PASS: joi.string().allow(''),
  
  // Time series database configuration
  INFLUXDB_URL: joi.string().default('http://localhost:8086'),
  INFLUXDB_TOKEN: joi.string().allow(''),
  INFLUXDB_ORG: joi.string().default('mes'),
  INFLUXDB_BUCKET: joi.string().default('manufacturing'),
}).unknown(true);

// Validate environment variables
const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export configuration object
export const config = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  
  // Database configuration
  database: {
    url: envVars.DATABASE_URL,
    pool: {
      min: envVars.DB_POOL_MIN,
      max: envVars.DB_POOL_MAX,
    },
  },
  
  // Redis configuration
  redis: {
    url: envVars.REDIS_URL,
    password: envVars.REDIS_PASSWORD,
  },
  
  // JWT configuration
  jwt: {
    secret: envVars.JWT_SECRET,
    expire: envVars.JWT_EXPIRE,
    refreshExpire: envVars.JWT_REFRESH_EXPIRE,
  },
  
  // Security configuration
  security: {
    bcryptRounds: envVars.BCRYPT_ROUNDS,
    sessionSecret: envVars.SESSION_SECRET,
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: envVars.CORS_ORIGINS.split(',').map((origin: string) => origin.trim()),
  },
  
  // File upload configuration
  upload: {
    maxFileSize: envVars.MAX_FILE_SIZE,
    path: envVars.UPLOAD_PATH,
  },
  
  // External services configuration
  externalServices: {
    erp: {
      apiUrl: envVars.ERP_API_URL,
      apiKey: envVars.ERP_API_KEY,
    },
    plm: {
      apiUrl: envVars.PLM_API_URL,
      apiKey: envVars.PLM_API_KEY,
    },
  },
  
  // Message queue configuration
  kafka: {
    brokers: envVars.KAFKA_BROKERS.split(',').map((broker: string) => broker.trim()),
    clientId: envVars.KAFKA_CLIENT_ID,
  },
  
  // Logging configuration
  logging: {
    level: envVars.LOG_LEVEL,
    format: envVars.LOG_FORMAT,
  },
  
  // Performance configuration
  performance: {
    clusterMode: envVars.CLUSTER_MODE,
    rateLimit: {
      windowMs: envVars.RATE_LIMIT_WINDOW,
      max: envVars.RATE_LIMIT_MAX,
    },
  },
  
  // Monitoring configuration
  monitoring: {
    metricsEnabled: envVars.METRICS_ENABLED,
    healthCheckInterval: envVars.HEALTH_CHECK_INTERVAL,
  },
  
  // Email configuration
  email: {
    smtp: {
      host: envVars.SMTP_HOST,
      port: envVars.SMTP_PORT,
      user: envVars.SMTP_USER,
      pass: envVars.SMTP_PASS,
    },
  },
  
  // Time series database configuration
  influxdb: {
    url: envVars.INFLUXDB_URL,
    token: envVars.INFLUXDB_TOKEN,
    org: envVars.INFLUXDB_ORG,
    bucket: envVars.INFLUXDB_BUCKET,
  },
};

// Configuration validation for production
if (config.env === 'production') {
  const requiredProdConfig = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
  ];
  
  const missingConfig = requiredProdConfig.filter(key => !process.env[key]);
  
  if (missingConfig.length > 0) {
    throw new Error(`Missing required production configuration: ${missingConfig.join(', ')}`);
  }
}

export default config;