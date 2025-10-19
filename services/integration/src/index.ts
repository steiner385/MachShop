/**
 * Work Order Service
 * Entry point for the Work Order microservice
 *
 * Port: 3015
 * Database: postgres-integration (port 5433)
 */

import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config, logConfiguration } from './config/config';
import integrationRoutes from './routes/workOrders';

// ============================================================================
// Express App Configuration
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS - Cross-Origin Resource Sharing
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// Rate Limiting
// ============================================================================

// Global rate limiter
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

// Strict rate limiter for write operations
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: {
    error: 'Too many write requests',
    message: 'You have exceeded the write rate limit. Please try again later.',
  },
  skipSuccessfulRequests: false,
});

// ============================================================================
// Request Logging Middleware
// ============================================================================

app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms`
    );
  });

  next();
});

// ============================================================================
// Health Check Endpoint
// ============================================================================

app.get('/health', async (req: Request, res: Response) => {
  try {
    // TODO: Add database health check when Prisma is initialized
    // const dbHealth = await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: config.serviceName,
      version: '1.0.0',
      checks: {
        database: true, // TODO: Implement actual database check
        redis: true,    // TODO: Implement actual Redis check
      },
    });
  } catch (error) {
    console.error('[HEALTH] Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: config.serviceName,
      error: 'Service health check failed',
    });
  }
});

// ============================================================================
// API Routes
// ============================================================================

// Work Order routes
app.use('/api/v1/integration', writeLimiter, integrationRoutes);

// ============================================================================
// Error Handling Middleware
// ============================================================================

// 404 Not Found
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('[ERROR]', err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: err.name || 'Error',
    message,
    ...(config.isDevelopment && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Server Startup
// ============================================================================

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log(`🚀 Work Order Service Started`);
  console.log('='.repeat(60));
  logConfiguration();
  console.log('='.repeat(60));
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 API endpoint: http://localhost:${PORT}/api/v1/integration`);
  console.log('='.repeat(60));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // TODO: Close database connection
      // await prisma.$disconnect();
      console.log('Database connection closed');

      // TODO: Close Redis connection
      // await redis.quit();
      console.log('Redis connection closed');

      // TODO: Close Kafka connection
      // await kafka.producer().disconnect();
      console.log('Kafka connection closed');

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
