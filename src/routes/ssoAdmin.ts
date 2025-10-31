/**
 * SSO Administration API Routes (Issue #134)
 *
 * RESTful API endpoints for managing the unified SSO system.
 * Provides administration interfaces for providers, sessions, discovery rules, and analytics.
 *
 * Endpoints:
 * - Provider management (CRUD operations)
 * - Session monitoring and management
 * - Home realm discovery rule management
 * - System analytics and monitoring
 * - Health checks and diagnostics
 */

import express from 'express';
import { z } from 'zod';
import { SsoProviderType } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import SsoProviderService from '../services/SsoProviderService';
import HomeRealmDiscoveryService from '../services/HomeRealmDiscoveryService';
import SsoSessionService from '../services/SsoSessionService';
import SamlService from '../services/SamlService';
import prisma from '../lib/database';

const router = express.Router();

// Service instances
const providerService = SsoProviderService.getInstance();
const discoveryService = HomeRealmDiscoveryService.getInstance();
const sessionService = SsoSessionService.getInstance();

// Initialize SAML service with configuration
const samlService = new SamlService({
  baseUrl: process.env.BASE_URL || 'http://localhost:3001',
  acsPath: '/api/v1/sso/saml/acs',
  metadataPath: '/api/v1/sso/saml/metadata',
  sloPath: '/api/v1/sso/saml/slo'
});

// Validation schemas
const createProviderSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.nativeEnum(SsoProviderType),
  configId: z.string().min(1, 'Configuration ID is required'),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  domainRestrictions: z.array(z.string()).default([]),
  groupRestrictions: z.array(z.string()).default([]),
  metadata: z.record(z.any()).default({})
});

const updateProviderSchema = createProviderSchema.partial();

const createDiscoveryRuleSchema = z.object({
  name: z.string().min(1, 'Rule name is required'),
  pattern: z.string().min(1, 'Pattern is required'),
  providerId: z.string().min(1, 'Provider ID is required'),
  priority: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

const updateDiscoveryRuleSchema = createDiscoveryRuleSchema.partial();

// SAML configuration validation schemas
const createSamlConfigSchema = z.object({
  name: z.string().min(1, 'Configuration name is required'),
  entityId: z.string().min(1, 'Entity ID is required'),
  ssoUrl: z.string().url('Valid SSO URL is required'),
  sloUrl: z.string().url().optional(),
  certificate: z.string().min(1, 'Certificate is required'),
  privateKey: z.string().min(1, 'Private key is required'),
  signRequests: z.boolean().default(true),
  signAssertions: z.boolean().default(true),
  encryptAssertions: z.boolean().default(false),
  nameIdFormat: z.string().default('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress'),
  attributeMapping: z.record(z.string()).default({}),
  clockTolerance: z.number().int().min(0).default(300),
  isActive: z.boolean().default(true),
  idpMetadata: z.string().optional()
});

const updateSamlConfigSchema = createSamlConfigSchema.partial();

// ============================================================================
// SSO PROVIDER MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/admin/sso/providers
 * List all SSO providers with optional filtering
 */
router.get('/providers',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { type, isActive, domain } = req.query;

    const filters: any = {};
    if (type) filters.type = type as SsoProviderType;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (domain) filters.domain = domain as string;

    const providers = await providerService.getProviders(filters);

    // Include status information for each provider
    const providersWithStatus = await Promise.all(
      providers.map(async (provider) => {
        const status = await providerService.getProviderStatus(provider.id);
        const metrics = await providerService.getProviderMetrics(provider.id);
        return {
          ...provider,
          status,
          metrics
        };
      })
    );

    res.json({
      success: true,
      data: providersWithStatus,
      total: providers.length
    });
  })
);

/**
 * GET /api/v1/admin/sso/providers/:id
 * Get specific SSO provider details
 */
router.get('/providers/:id',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const provider = await providerService.getProviderById(id);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    const [status, metrics] = await Promise.all([
      providerService.getProviderStatus(id),
      providerService.getProviderMetrics(id)
    ]);

    res.json({
      success: true,
      data: {
        ...provider,
        status,
        metrics
      }
    });
  })
);

/**
 * POST /api/v1/admin/sso/providers
 * Create a new SSO provider
 */
router.post('/providers',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    const validatedData = createProviderSchema.parse(req.body);

    const provider = await providerService.registerProvider(validatedData);

    logger.info('SSO provider created via API', {
      providerId: provider.id,
      name: provider.name,
      type: provider.type,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: provider
    });
  })
);

/**
 * PUT /api/v1/admin/sso/providers/:id
 * Update an existing SSO provider
 */
router.put('/providers/:id',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = updateProviderSchema.parse(req.body);

    const provider = await providerService.updateProvider(id, updates);

    logger.info('SSO provider updated via API', {
      providerId: id,
      updates: Object.keys(updates),
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: provider
    });
  })
);

/**
 * DELETE /api/v1/admin/sso/providers/:id
 * Delete an SSO provider
 */
router.delete('/providers/:id',
  requirePermission('sso.admin.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await providerService.deleteProvider(id);

    logger.info('SSO provider deleted via API', {
      providerId: id,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Provider deleted successfully'
    });
  })
);

/**
 * POST /api/v1/admin/sso/providers/:id/test
 * Test provider connectivity
 */
router.post('/providers/:id/test',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const result = await providerService.testProviderConnectivity(id);

    res.json({
      success: true,
      data: result
    });
  })
);

// ============================================================================
// HOME REALM DISCOVERY MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/admin/sso/discovery-rules
 * List all home realm discovery rules
 */
router.get('/discovery-rules',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const rules = await discoveryService.getRules();

    res.json({
      success: true,
      data: rules,
      total: rules.length
    });
  })
);

/**
 * POST /api/v1/admin/sso/discovery-rules
 * Create a new discovery rule
 */
router.post('/discovery-rules',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    const validatedData = createDiscoveryRuleSchema.parse(req.body);

    const rule = await discoveryService.createRule(validatedData);

    logger.info('Discovery rule created via API', {
      ruleId: rule.id,
      pattern: rule.pattern,
      providerId: rule.providerId,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: rule
    });
  })
);

/**
 * PUT /api/v1/admin/sso/discovery-rules/:id
 * Update a discovery rule
 */
router.put('/discovery-rules/:id',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = updateDiscoveryRuleSchema.parse(req.body);

    const rule = await discoveryService.updateRule(id, updates);

    logger.info('Discovery rule updated via API', {
      ruleId: id,
      updates: Object.keys(updates),
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: rule
    });
  })
);

/**
 * DELETE /api/v1/admin/sso/discovery-rules/:id
 * Delete a discovery rule
 */
router.delete('/discovery-rules/:id',
  requirePermission('sso.admin.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await discoveryService.deleteRule(id);

    logger.info('Discovery rule deleted via API', {
      ruleId: id,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Discovery rule deleted successfully'
    });
  })
);

/**
 * POST /api/v1/admin/sso/discovery-rules/:id/test
 * Test a discovery rule with a sample email
 */
router.post('/discovery-rules/:id/test',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { email } = z.object({
      email: z.string().email('Valid email required')
    }).parse(req.body);

    const result = await discoveryService.testRule(id, email);

    res.json({
      success: true,
      data: result
    });
  })
);

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/admin/sso/sessions
 * List active SSO sessions with optional filtering
 */
router.get('/sessions',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { userId, providerId, limit = 50, offset = 0 } = req.query;

    // This would need to be implemented in the session service
    // For now, we'll get basic session statistics
    const statistics = await sessionService.getSessionStatistics();

    res.json({
      success: true,
      data: {
        statistics,
        sessions: [], // Would implement pagination here
        total: statistics.totalActiveSessions
      }
    });
  })
);

/**
 * GET /api/v1/admin/sso/sessions/:id
 * Get specific session details
 */
router.get('/sessions/:id',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await sessionService.getSession(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const validation = await sessionService.validateSession(id);

    res.json({
      success: true,
      data: {
        ...session,
        validation
      }
    });
  })
);

/**
 * DELETE /api/v1/admin/sso/sessions/:id
 * Terminate a specific session
 */
router.delete('/sessions/:id',
  requirePermission('sso.admin.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    await sessionService.logoutSession(id, 'admin_terminated');

    logger.info('SSO session terminated via API', {
      sessionId: id,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'Session terminated successfully'
    });
  })
);

/**
 * DELETE /api/v1/admin/sso/users/:userId/sessions
 * Terminate all sessions for a user
 */
router.delete('/users/:userId/sessions',
  requirePermission('sso.admin.delete'),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    await sessionService.logoutUserFromAllSessions(userId, 'admin_terminated');

    logger.info('All SSO sessions terminated for user via API', {
      targetUserId: userId,
      adminUserId: req.user?.id
    });

    res.json({
      success: true,
      message: 'All sessions terminated successfully'
    });
  })
);

// ============================================================================
// SAML CONFIGURATION MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/admin/sso/saml-configs
 * List all SAML configurations
 */
router.get('/saml-configs',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { isActive } = req.query;

    const filters: any = {};
    if (isActive !== undefined) filters.isActive = isActive === 'true';

    const configs = await prisma.samlConfig.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' }
    });

    // Include status and session count for each config
    const configsWithStatus = await Promise.all(
      configs.map(async (config) => {
        const [isValid, sessionCount] = await Promise.all([
          samlService.validateConfiguration(config.id),
          prisma.samlSession.count({
            where: { configId: config.id }
          })
        ]);

        return {
          ...config,
          isValid,
          activeSessions: sessionCount,
          // Remove sensitive fields from response
          privateKey: undefined,
          certificate: config.certificate ? '[REDACTED]' : null
        };
      })
    );

    res.json({
      success: true,
      data: configsWithStatus,
      total: configs.length
    });
  })
);

/**
 * GET /api/v1/admin/sso/saml-configs/:id
 * Get specific SAML configuration details
 */
router.get('/saml-configs/:id',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const config = await prisma.samlConfig.findUnique({
      where: { id }
    });

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'SAML configuration not found'
      });
    }

    const [isValid, sessionCount, recentSessions] = await Promise.all([
      samlService.validateConfiguration(id),
      prisma.samlSession.count({
        where: { configId: id }
      }),
      prisma.samlSession.findMany({
        where: { configId: id },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    res.json({
      success: true,
      data: {
        ...config,
        isValid,
        activeSessions: sessionCount,
        recentSessions,
        // Remove sensitive fields from response
        privateKey: undefined,
        certificate: config.certificate ? '[REDACTED]' : null
      }
    });
  })
);

/**
 * POST /api/v1/admin/sso/saml-configs
 * Create a new SAML configuration
 */
router.post('/saml-configs',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    const validatedData = createSamlConfigSchema.parse(req.body);

    const config = await prisma.samlConfig.create({
      data: validatedData
    });

    logger.info('SAML configuration created via API', {
      configId: config.id,
      name: config.name,
      entityId: config.entityId,
      userId: req.user?.id
    });

    res.status(201).json({
      success: true,
      data: {
        ...config,
        // Remove sensitive fields from response
        privateKey: undefined,
        certificate: config.certificate ? '[REDACTED]' : null
      }
    });
  })
);

/**
 * PUT /api/v1/admin/sso/saml-configs/:id
 * Update an existing SAML configuration
 */
router.put('/saml-configs/:id',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = updateSamlConfigSchema.parse(req.body);

    const config = await prisma.samlConfig.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    logger.info('SAML configuration updated via API', {
      configId: id,
      updates: Object.keys(updates),
      userId: req.user?.id
    });

    res.json({
      success: true,
      data: {
        ...config,
        // Remove sensitive fields from response
        privateKey: undefined,
        certificate: config.certificate ? '[REDACTED]' : null
      }
    });
  })
);

/**
 * DELETE /api/v1/admin/sso/saml-configs/:id
 * Delete a SAML configuration
 */
router.delete('/saml-configs/:id',
  requirePermission('sso.admin.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    // Check for active sessions before deletion
    const activeSessionCount = await prisma.samlSession.count({
      where: { configId: id }
    });

    if (activeSessionCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'ACTIVE_SESSIONS_EXIST',
        message: `Cannot delete configuration with ${activeSessionCount} active sessions`
      });
    }

    await prisma.samlConfig.delete({
      where: { id }
    });

    logger.info('SAML configuration deleted via API', {
      configId: id,
      userId: req.user?.id
    });

    res.json({
      success: true,
      message: 'SAML configuration deleted successfully'
    });
  })
);

/**
 * POST /api/v1/admin/sso/saml-configs/:id/test
 * Test SAML configuration
 */
router.post('/saml-configs/:id/test',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const isValid = await samlService.validateConfiguration(id);

      // Try to generate metadata to test configuration
      let metadataGenerated = false;
      let metadataError = null;

      try {
        await samlService.generateMetadata(id);
        metadataGenerated = true;
      } catch (error) {
        metadataError = error instanceof Error ? error.message : 'Unknown error';
      }

      res.json({
        success: true,
        data: {
          configId: id,
          isValid,
          metadataGenerated,
          metadataError,
          timestamp: new Date(),
          tests: {
            configurationValid: isValid,
            metadataGeneration: metadataGenerated
          }
        }
      });

    } catch (error) {
      logger.error('SAML configuration test failed', {
        configId: id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'SAML_CONFIG_TEST_FAILED',
        message: 'Failed to test SAML configuration'
      });
    }
  })
);

/**
 * GET /api/v1/admin/sso/saml-configs/:id/metadata
 * Get SAML configuration metadata (for IdP setup)
 */
router.get('/saml-configs/:id/metadata',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const metadata = await samlService.generateMetadata(id);

      res.set('Content-Type', 'application/xml');
      res.send(metadata);

    } catch (error) {
      logger.error('Failed to generate SAML metadata for admin', {
        configId: id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'METADATA_GENERATION_FAILED',
        message: 'Failed to generate SAML metadata'
      });
    }
  })
);

/**
 * GET /api/v1/admin/sso/saml-sessions
 * List SAML sessions with filtering
 */
router.get('/saml-sessions',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { configId, userId, limit = 50, offset = 0 } = req.query;

    const filters: any = {};
    if (configId) filters.configId = configId as string;
    if (userId) filters.userId = userId as string;

    const [sessions, total] = await Promise.all([
      prisma.samlSession.findMany({
        where: filters,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          config: { select: { id: true, name: true, entityId: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string, 10),
        skip: parseInt(offset as string, 10)
      }),
      prisma.samlSession.count({ where: filters })
    ]);

    res.json({
      success: true,
      data: sessions,
      total,
      pagination: {
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        hasMore: parseInt(offset as string, 10) + sessions.length < total
      }
    });
  })
);

/**
 * DELETE /api/v1/admin/sso/saml-sessions/:id
 * Terminate a specific SAML session
 */
router.delete('/saml-sessions/:id',
  requirePermission('sso.admin.delete'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const session = await prisma.samlSession.findUnique({
      where: { id }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'SAML session not found'
      });
    }

    await prisma.samlSession.delete({
      where: { id }
    });

    logger.info('SAML session terminated via API', {
      sessionId: id,
      userId: session.userId,
      adminUserId: req.user?.id
    });

    res.json({
      success: true,
      message: 'SAML session terminated successfully'
    });
  })
);

/**
 * POST /api/v1/admin/sso/saml-cleanup
 * Clean up expired SAML sessions and auth requests
 */
router.post('/saml-cleanup',
  requirePermission('sso.admin.write'),
  asyncHandler(async (req, res) => {
    try {
      await samlService.cleanup();

      const stats = await Promise.all([
        prisma.samlSession.count(),
        prisma.samlAuthRequest.count()
      ]);

      logger.info('SAML cleanup completed via API', {
        userId: req.user?.id
      });

      res.json({
        success: true,
        data: {
          message: 'SAML cleanup completed',
          activeSessions: stats[0],
          activeAuthRequests: stats[1],
          timestamp: new Date()
        }
      });

    } catch (error) {
      logger.error('SAML cleanup failed', {
        error: error instanceof Error ? error.message : error,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'SAML_CLEANUP_FAILED',
        message: 'Failed to perform SAML cleanup'
      });
    }
  })
);

// ============================================================================
// ANALYTICS AND MONITORING
// ============================================================================

/**
 * GET /api/v1/admin/sso/dashboard
 * Get SSO management dashboard data
 */
router.get('/dashboard',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const [
      providers,
      sessionStats,
      discoveryAnalytics
    ] = await Promise.all([
      providerService.getProviders({ isActive: true }),
      sessionService.getSessionStatistics(),
      discoveryService.getAnalytics()
    ]);

    // Get provider status for all active providers
    const providersWithStatus = await Promise.all(
      providers.map(async (provider) => {
        const status = await providerService.getProviderStatus(provider.id);
        return {
          id: provider.id,
          name: provider.name,
          type: provider.type,
          isHealthy: status?.isHealthy || false,
          responseTime: status?.responseTime || 0
        };
      })
    );

    res.json({
      success: true,
      data: {
        providers: {
          total: providers.length,
          healthy: providersWithStatus.filter(p => p.isHealthy).length,
          details: providersWithStatus
        },
        sessions: sessionStats,
        discovery: discoveryAnalytics,
        systemHealth: {
          overallStatus: providersWithStatus.some(p => p.isHealthy) ? 'healthy' : 'unhealthy',
          lastUpdated: new Date()
        }
      }
    });
  })
);

/**
 * GET /api/v1/admin/sso/analytics
 * Get detailed SSO analytics
 */
router.get('/analytics',
  requirePermission('sso.admin.read'),
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;
    const daysNum = parseInt(days as string, 10);

    const [
      discoveryAnalytics,
      sessionStats
    ] = await Promise.all([
      discoveryService.getAnalytics(daysNum),
      sessionService.getSessionStatistics()
    ]);

    // Get provider metrics for all providers
    const providers = await providerService.getProviders();
    const providerMetrics = await Promise.all(
      providers.map(async (provider) => {
        const metrics = await providerService.getProviderMetrics(provider.id, daysNum);
        return {
          provider: {
            id: provider.id,
            name: provider.name,
            type: provider.type
          },
          metrics
        };
      })
    );

    res.json({
      success: true,
      data: {
        period: {
          days: daysNum,
          startDate: new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000),
          endDate: new Date()
        },
        discovery: discoveryAnalytics,
        sessions: sessionStats,
        providers: providerMetrics
      }
    });
  })
);

/**
 * GET /api/v1/admin/sso/health
 * System health check endpoint
 */
router.get('/health',
  asyncHandler(async (req, res) => {
    const providers = await providerService.getProviders({ isActive: true });

    const healthChecks = await Promise.all(
      providers.map(async (provider) => {
        const status = await providerService.getProviderStatus(provider.id, true);
        return {
          providerId: provider.id,
          providerName: provider.name,
          isHealthy: status?.isHealthy || false,
          responseTime: status?.responseTime || 0,
          lastChecked: status?.lastChecked || new Date()
        };
      })
    );

    const healthyCount = healthChecks.filter(check => check.isHealthy).length;
    const overallHealth = healthyCount > 0 ? 'healthy' : 'unhealthy';

    res.json({
      success: true,
      data: {
        overallStatus: overallHealth,
        healthyProviders: healthyCount,
        totalProviders: providers.length,
        providers: healthChecks,
        timestamp: new Date()
      }
    });
  })
);

export default router;