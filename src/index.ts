// Initialize OpenTelemetry tracing first (before any other imports)
import { initializeTracing } from './utils/tracing';
initializeTracing();

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
import { metricsMiddleware, setupMetricsEndpoint } from './middleware/metrics';

// Import route handlers
import authRoutes from './routes/auth';
import workOrderRoutes from './routes/workOrders';
import qualityRoutes from './routes/quality';
import materialRoutes from './routes/materials';
import traceabilityRoutes from './routes/traceability';
import equipmentRoutes from './routes/equipment';
import dashboardRoutes from './routes/dashboard';
import workInstructionRoutes from './routes/workInstructions';
import uploadRoutes from './routes/upload';
import signatureRoutes from './routes/signatures';
import faiRoutes from './routes/fai';
import serializationRoutes from './routes/serialization';
import integrationRoutes from './routes/integrationRoutes';
import b2mRoutes from './routes/b2mRoutes';
import l2EquipmentRoutes from './routes/l2EquipmentRoutes';
import historianRoutes from './routes/historianRoutes';
import personnelRoutes from './routes/personnel';
import processSegmentRoutes from './routes/processSegments';
import productRoutes from './routes/products';
import productionScheduleRoutes from './routes/productionSchedules';
import workOrderExecutionRoutes from './routes/workOrderExecution';
import routingRoutes from './routes/routings';
import routingTemplateRoutes from './routes/routingTemplates';
import siteRoutes from './routes/sites';

// Aerospace integration routes
import maximoRoutes from './routes/maximoRoutes';
import indysoftRoutes from './routes/indysoftRoutes';
import covalentRoutes from './routes/covalentRoutes';
import shopFloorConnectRoutes from './routes/shopFloorConnectRoutes';
import predatorPDMRoutes from './routes/predatorPDMRoutes';
import predatorDNCRoutes from './routes/predatorDNCRoutes';
import cmmRoutes from './routes/cmmRoutes';
import searchRoutes from './routes/search';
import presenceRoutes from './routes/presence';
import parameterLimitsRoutes from './routes/parameterLimits';
import parameterGroupsRoutes from './routes/parameterGroups';
import parameterFormulasRoutes from './routes/parameterFormulas';
import spcRoutes from './routes/spc';
import mediaRoutes from './routes/media';

import { initializeIntegrationManager } from './services/IntegrationManager';

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

// Rate limiting (disabled in test environment to prevent HTTP 429 errors during E2E tests)
if (config.env !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);
  logger.info('Rate limiting enabled: 1000 requests per 15 minutes per IP');
} else {
  logger.info('Rate limiting DISABLED in test environment');
}

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ PHASE 9E FIX: Custom JSON parsing error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn('JSON parsing error detected', {
      url: req.url,
      method: req.method,
      contentType: req.get('Content-Type'),
      contentLength: req.get('Content-Length'),
      rawBody: err.body?.toString()?.substring(0, 200), // First 200 chars for debugging
      error: err.message,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Request body contains invalid JSON',
      details: 'Please ensure the request body is valid JSON format'
    });
  }
  next();
});

// Request logging
app.use(requestLogger);

// Observability middleware - Prometheus metrics
app.use(metricsMiddleware);

// Setup metrics and health endpoints
setupMetricsEndpoint(app);

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
apiRouter.use('/search', authMiddleware, searchRoutes);
apiRouter.use('/dashboard', authMiddleware, dashboardRoutes);
apiRouter.use('/workorders', authMiddleware, workOrderRoutes);
apiRouter.use('/quality', authMiddleware, qualityRoutes);
apiRouter.use('/materials', authMiddleware, materialRoutes);
apiRouter.use('/traceability', authMiddleware, traceabilityRoutes);
apiRouter.use('/equipment', authMiddleware, equipmentRoutes);
apiRouter.use('/personnel', authMiddleware, personnelRoutes);
apiRouter.use('/process-segments', authMiddleware, processSegmentRoutes);
apiRouter.use('/products', authMiddleware, productRoutes);
apiRouter.use('/production-schedules', authMiddleware, productionScheduleRoutes);
apiRouter.use('/work-order-execution', authMiddleware, workOrderExecutionRoutes);
apiRouter.use('/routings', authMiddleware, routingRoutes);
apiRouter.use('/routing-templates', authMiddleware, routingTemplateRoutes);
apiRouter.use('/presence', authMiddleware, presenceRoutes);
apiRouter.use('/sites', authMiddleware, siteRoutes);
apiRouter.use('/work-instructions', authMiddleware, workInstructionRoutes);
apiRouter.use('/media', authMiddleware, mediaRoutes);
apiRouter.use('/upload', authMiddleware, uploadRoutes);
apiRouter.use('/signatures', authMiddleware, signatureRoutes);
apiRouter.use('/fai', authMiddleware, faiRoutes);
apiRouter.use('/serialization', authMiddleware, serializationRoutes);
apiRouter.use('/integrations', authMiddleware, integrationRoutes);
apiRouter.use('/b2m', authMiddleware, b2mRoutes);
apiRouter.use('/l2-equipment', authMiddleware, l2EquipmentRoutes);
apiRouter.use('/historian', authMiddleware, historianRoutes);

// Aerospace integration routes
apiRouter.use('/maximo', authMiddleware, maximoRoutes);
apiRouter.use('/indysoft', authMiddleware, indysoftRoutes);
apiRouter.use('/covalent', authMiddleware, covalentRoutes);
apiRouter.use('/shop-floor-connect', authMiddleware, shopFloorConnectRoutes);
apiRouter.use('/predator-pdm', authMiddleware, predatorPDMRoutes);
apiRouter.use('/predator-dnc', authMiddleware, predatorDNCRoutes);
apiRouter.use('/cmm', authMiddleware, cmmRoutes);

// Parameter management routes (Variable System - Phase 1)
apiRouter.use('/parameters', authMiddleware, parameterLimitsRoutes);
apiRouter.use('/parameter-groups', authMiddleware, parameterGroupsRoutes);
apiRouter.use('/formulas', authMiddleware, parameterFormulasRoutes);

// SPC routes (Variable System - Phase 2)
apiRouter.use('/spc', authMiddleware, spcRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

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
const server = app.listen(PORT, async () => {
  logger.info(`MES API Server started on port ${PORT}`, {
    environment: config.env,
    port: PORT,
    nodeVersion: process.version,
  });

  // Initialize Integration Manager (ERP/PLM integrations)
  // Skip integration manager in test environment to prevent segfault in E2E tests
  if (!isTest) {
    try {
      await initializeIntegrationManager();
      logger.info('Integration Manager initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Integration Manager:', error);
    }
  } else {
    logger.info('Integration Manager initialization skipped (test environment)');
  }
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