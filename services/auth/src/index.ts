/**
 * Authentication Service Entry Point
 * MES Microservice for JWT-based authentication and authorization
 */

import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '.prisma/client-auth';
import { config, validateConfig } from './config/config';
import authRoutes from './routes/auth';

// Validate configuration before starting
validateConfig();

// Create Express app
const app = express();

// Create Prisma client
const prisma = new PrismaClient({
  log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
});

/**
 * Security Middleware
 */

// Helmet - Set security headers
app.use(helmet());

// CORS - Enable cross-origin resource sharing
app.use(
  cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
  })
);

// Compression - Compress responses
app.use(compression());

/**
 * Request Parsing
 */

// Parse JSON bodies with size limit
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Rate Limiting
 */

// Apply rate limiting to all requests
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// More strict rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too Many Login Attempts',
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Request Logging
 */
if (config.isDevelopment) {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

/**
 * Health Check Endpoint
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      version: '1.0.0',
      environment: config.env,
    });
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error);

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      error: 'Database connection failed',
    });
  }
});

/**
 * Root Endpoint
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'MES Authentication Service',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /api/v1/auth/login',
        refresh: 'POST /api/v1/auth/refresh',
        logout: 'POST /api/v1/auth/logout',
        me: 'GET /api/v1/auth/me',
        changePassword: 'POST /api/v1/auth/change-password',
      },
    },
  });
});

/**
 * API Routes
 */

// Apply login rate limiter to login endpoint
app.use('/api/v1/auth/login', loginLimiter);

// Mount authentication routes
app.use('/api/v1/auth', authRoutes);

/**
 * 404 Handler
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    service: 'auth-service',
  });
});

/**
 * Global Error Handler
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR] Unhandled error:', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.isDevelopment ? err.message : 'An unexpected error occurred',
    service: 'auth-service',
  });
});

/**
 * Start Server
 */
const server = app.listen(config.port, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   🔐 MES Authentication Service');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   Environment: ${config.env}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database.url.split('@')[1]}`);
  console.log(`   Redis: ${config.redis.url}`);
  console.log(`   CORS Origin: ${config.cors.origin}`);
  console.log('───────────────────────────────────────────────────────');
  console.log('   Endpoints:');
  console.log('   - POST /api/v1/auth/login');
  console.log('   - POST /api/v1/auth/refresh');
  console.log('   - POST /api/v1/auth/logout');
  console.log('   - GET  /api/v1/auth/me');
  console.log('   - POST /api/v1/auth/change-password');
  console.log('   - GET  /health');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`   ✅ Service ready at http://localhost:${config.port}`);
  console.log('═══════════════════════════════════════════════════════');
});

/**
 * Graceful Shutdown
 */
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  server.close(async () => {
    console.log('[SHUTDOWN] HTTP server closed');

    try {
      // Close database connection
      await prisma.$disconnect();
      console.log('[SHUTDOWN] Database connection closed');

      console.log('[SHUTDOWN] Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('[SHUTDOWN] Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('[SHUTDOWN] Forceful shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  console.error('[FATAL] Unhandled promise rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

export default app;
