import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
// import swaggerUi from 'swagger-ui-express';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';

// Import route handlers
import authRoutes from './routes/auth';
import workOrderRoutes from './routes/workOrders';
import qualityRoutes from './routes/quality';
import materialRoutes from './routes/materials';
import traceabilityRoutes from './routes/traceability';
import equipmentRoutes from './routes/equipment';
import dashboardRoutes from './routes/dashboard';

// Import OpenAPI specification - commented out for now
// import * as openApiSpec from '../openapi.yaml';

const app = express();

// Trust proxy for nginx forwarded headers
app.set('trust proxy', 1);

// Security middleware
const isDevelopment = config.env === 'development';
const isTest = config.env === 'test';

// CSP configuration with environment-specific rules
const cspDirectives = {
  defaultSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  scriptSrc: ["'self'"],
  imgSrc: ["'self'", "data:", "https:"],
  connectSrc: (isDevelopment || isTest)
    ? ["'self'", "ws:", "wss:", "ws://localhost:5178", "ws://local.mes.com", "http://localhost:3001", "http://local.mes.com:3001"]
    : ["'self'", "https:"],
};

app.use(helmet({
  contentSecurityPolicy: {
    directives: cspDirectives,
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression middleware
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.env,
  });
});

// API documentation - commented out for now
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
//   customCss: '.swagger-ui .topbar { display: none }',
//   customSiteTitle: 'MES API Documentation',
// }));

// API routes
const apiRouter = express.Router();

// Public routes (no authentication required)
apiRouter.use('/auth', authRoutes);

// Protected routes (authentication required)
apiRouter.use('/dashboard', authMiddleware, dashboardRoutes);
apiRouter.use('/workorders', authMiddleware, workOrderRoutes);
apiRouter.use('/quality', authMiddleware, qualityRoutes);
apiRouter.use('/materials', authMiddleware, materialRoutes);
apiRouter.use('/traceability', authMiddleware, traceabilityRoutes);
apiRouter.use('/equipment', authMiddleware, equipmentRoutes);

// Mount API routes
app.use('/api/v1', apiRouter);

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'NotFound',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  logger.info(`MES API Server started on port ${PORT}`, {
    environment: config.env,
    port: PORT,
    nodeVersion: process.version,
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;