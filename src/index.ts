// Initialize OpenTelemetry tracing first (before any other imports)
import { initializeTracing } from './utils/tracing';
initializeTracing();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
// import swaggerUi from 'swagger-ui-express';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/requestLogger';
import { metricsMiddleware, setupMetricsEndpoint } from './middleware/metrics';
import { csrfProtection } from './middleware/csrf';

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
import workflowRoutes from './routes/workflows';
import timeTrackingRoutes from './routes/timeTracking';
import timeEntryManagementRoutes from './routes/timeEntryManagement';

// GitHub Issue #23: Multi-Document Type Support Routes
import setupSheetRoutes from './routes/setupSheets';
import inspectionPlanRoutes from './routes/inspectionPlans';
import sopRoutes from './routes/sops';
import toolDrawingRoutes from './routes/toolDrawings';
import unifiedDocumentRoutes from './routes/unifiedDocuments';

// GitHub Issue #24: Document Collaboration & Review Features Routes
import commentRoutes from './routes/comments';
import annotationRoutes from './routes/annotations';
import reviewRoutes from './routes/reviews';
import notificationRoutes from './routes/notifications';
import activityRoutes from './routes/activities';
import collaborationRoutes from './routes/collaboration';

// GitHub Issue #29: Dynamic Role and Permission System Routes
import adminRolesRoutes from './routes/admin/roles';
import adminPermissionsRoutes from './routes/admin/permissions';
import adminRolePermissionsRoutes from './routes/admin/role-permissions';
import adminUserRolesRoutes from './routes/admin/user-roles';

// ✅ GITHUB ISSUE #126: Time-Based Permission Grants (Temporal Permissions) Routes
import adminTemporalRolesRoutes from './routes/admin/temporal-roles';

// GitHub Issue #134: Unified SSO Management System Routes
import ssoRoutes from './routes/sso';
import ssoAdminRoutes from './routes/ssoAdmin';

// GitHub Issue #132: OAuth 2.0/OpenID Connect Integration Routes
import oidcRoutes from './routes/oidc';

// GitHub Issue #133: Azure AD/Entra ID Native Integration Routes
import azureAdGraphRoutes from './routes/azureAdGraph';

// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine - Unified Approval Routes
import unifiedApprovalRoutes from './routes/unifiedApprovals';

// ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations
import roleTemplateRoutes from './routes/roleTemplates';

// ✅ GITHUB ISSUE #231: Life-Limited Parts (LLP) Back-to-Birth Traceability
import llpRoutes from './routes/llp';

// ✅ GITHUB ISSUE #229: Kitting & Material Staging System Routes
import kitRoutes from './routes/api/kits';
import stagingRoutes from './routes/api/staging';
import vendorKitRoutes from './routes/vendorKits';

// ✅ GITHUB ISSUE #223: Regulatory Compliance: Part Interchangeability & Substitution Group Framework
import partInterchangeabilityRoutes from './routes/partInterchangeability';

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Client-Token'],
  exposedHeaders: ['X-CSRF-Client-Token'],
}));

// Compression middleware
app.use(compression());

// Cookie parsing middleware (required for CSRF protection)
app.use(cookieParser());

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
apiRouter.use('/sso', ssoRoutes);
// OAuth 2.0/OIDC public authentication endpoints
apiRouter.use('/sso/oidc', oidcRoutes);

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
apiRouter.use('/workflows', authMiddleware, workflowRoutes);
apiRouter.use('/media', authMiddleware, mediaRoutes);
apiRouter.use('/time-tracking', authMiddleware, timeTrackingRoutes);
// GitHub Issue #51: Time Entry Management & Approvals System API Routes
apiRouter.use('/time-entry-management', authMiddleware, timeEntryManagementRoutes);

// GitHub Issue #23: Multi-Document Type Support API Routes
apiRouter.use('/setup-sheets', authMiddleware, setupSheetRoutes);
apiRouter.use('/inspection-plans', authMiddleware, inspectionPlanRoutes);
apiRouter.use('/sops', authMiddleware, sopRoutes);
apiRouter.use('/tool-drawings', authMiddleware, toolDrawingRoutes);
apiRouter.use('/documents', authMiddleware, unifiedDocumentRoutes);

// GitHub Issue #24: Document Collaboration & Review Features API Routes
apiRouter.use('/comments', authMiddleware, commentRoutes);
apiRouter.use('/annotations', authMiddleware, annotationRoutes);
apiRouter.use('/reviews', authMiddleware, reviewRoutes);
apiRouter.use('/notifications', authMiddleware, notificationRoutes);
apiRouter.use('/activities', authMiddleware, activityRoutes);
apiRouter.use('/collaboration', authMiddleware, collaborationRoutes);
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

// GitHub Issue #29: Dynamic Role and Permission System API Routes
apiRouter.use('/admin/roles', authMiddleware, adminRolesRoutes);
apiRouter.use('/admin/permissions', authMiddleware, adminPermissionsRoutes);
apiRouter.use('/admin/role-permissions', authMiddleware, adminRolePermissionsRoutes);
apiRouter.use('/admin/user-roles', authMiddleware, adminUserRolesRoutes);

// ✅ GITHUB ISSUE #126: Time-Based Permission Grants (Temporal Permissions) API Routes
apiRouter.use('/admin/temporal-roles', authMiddleware, adminTemporalRolesRoutes);

// GitHub Issue #134: Unified SSO Management System Admin Routes
apiRouter.use('/admin/sso', authMiddleware, ssoAdminRoutes);
// GitHub Issue #132: OAuth 2.0/OIDC Configuration Admin Routes
apiRouter.use('/admin/oidc', authMiddleware, oidcRoutes);

// GitHub Issue #133: Azure AD/Entra ID Native Integration Admin Routes
apiRouter.use('/admin/azure-ad', authMiddleware, azureAdGraphRoutes);

// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine - Unified Approval API Routes
apiRouter.use('/approvals', authMiddleware, unifiedApprovalRoutes);

// ✅ GITHUB ISSUE #125: Role Templates for Predefined Role Configurations API Routes
apiRouter.use('/role-templates', authMiddleware, roleTemplateRoutes);

// ✅ GITHUB ISSUE #231: Life-Limited Parts (LLP) Back-to-Birth Traceability API Routes
apiRouter.use('/llp', authMiddleware, llpRoutes);

// ✅ GITHUB ISSUE #229: Kitting & Material Staging System API Routes
apiRouter.use('/kits', authMiddleware, kitRoutes);
apiRouter.use('/staging', authMiddleware, stagingRoutes);
apiRouter.use('/vendor-kits', authMiddleware, vendorKitRoutes);

// ✅ GITHUB ISSUE #223: Regulatory Compliance: Part Interchangeability & Substitution Group Framework API Routes
apiRouter.use('/part-interchangeability', authMiddleware, partInterchangeabilityRoutes);

// Serve uploaded files statically
app.use('/uploads', express.static(process.env.UPLOAD_DIR || './uploads'));

// CSRF Protection for API routes (GitHub Issue #117: Cross-Site Request Forgery Protection)
// Applied to all authenticated API endpoints except auth and SSO
app.use('/api/v1', (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Skip CSRF protection for authentication and SSO endpoints
  if (req.path.startsWith('/auth') || req.path.startsWith('/sso')) {
    return next();
  }

  // Apply CSRF protection to all other authenticated endpoints
  return csrfProtection(req, res, next);
});

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