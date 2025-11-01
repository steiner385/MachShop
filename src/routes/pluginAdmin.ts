import express, { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import PluginSystemService from '../services/PluginSystemService';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Admin Plugin Management Routes (Issue #75 Phase 3)
 * All routes require System Administrator role
 */

// ============================================================================
// PLUGIN LISTING & DISCOVERY
// ============================================================================

/**
 * GET /api/v1/admin/plugins
 * List all plugins with optional filtering
 */
router.get(
  '/',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { status, isActive, siteId } = req.query;

    const plugins = await PluginSystemService.getPlugins({
      ...(status && { status: status as any }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(siteId && { siteId: siteId as string }),
    });

    res.json({
      success: true,
      data: plugins,
      count: plugins.length,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/admin/plugins/:id
 * Get specific plugin details
 */
router.get(
  '/:id',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await PluginSystemService.getPlugin(id);
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Plugin ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: plugin,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// PLUGIN INSTALLATION
// ============================================================================

/**
 * POST /api/v1/admin/plugins/install
 * Install a new plugin from package
 */
router.post(
  '/install',
  requireAuth,
  requireRole(['System Administrator']),
  validateRequest(
    {
      body: {
        manifest: { type: 'object', required: true },
        packageUrl: { type: 'string', required: true },
        siteId: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { manifest, packageUrl, siteId } = req.body;
    const userId = req.user?.id || 'system';

    // Validate manifest structure
    if (!manifest.id || !manifest.name || !manifest.version) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_MANIFEST',
          message: 'Manifest must include id, name, and version',
        },
        timestamp: new Date(),
      });
    }

    const plugin = await PluginSystemService.installPlugin(manifest, packageUrl, userId, siteId);

    res.status(201).json({
      success: true,
      data: plugin,
      message: `Plugin ${manifest.id} installed successfully. Pending approval.`,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// PLUGIN LIFECYCLE MANAGEMENT
// ============================================================================

/**
 * POST /api/v1/admin/plugins/:id/approve
 * Approve a plugin for installation
 */
router.post(
  '/:id/approve',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await PluginSystemService.approvePlugin(id);

    res.json({
      success: true,
      data: plugin,
      message: `Plugin ${plugin.pluginId} approved successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/admin/plugins/:id/activate
 * Activate a plugin and register its hooks
 */
router.post(
  '/:id/activate',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await PluginSystemService.activatePlugin(id);

    res.json({
      success: true,
      data: plugin,
      message: `Plugin ${plugin.pluginId} activated successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/admin/plugins/:id/deactivate
 * Deactivate a plugin without uninstalling
 */
router.post(
  '/:id/deactivate',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await PluginSystemService.deactivatePlugin(id);

    res.json({
      success: true,
      data: plugin,
      message: `Plugin ${plugin.pluginId} deactivated successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * DELETE /api/v1/admin/plugins/:id
 * Uninstall a plugin completely
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await PluginSystemService.getPlugin(id);
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Plugin ${id} not found` },
        timestamp: new Date(),
      });
    }

    await PluginSystemService.uninstallPlugin(id);

    res.json({
      success: true,
      data: { pluginId: plugin.pluginId },
      message: `Plugin ${plugin.pluginId} uninstalled successfully`,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// PLUGIN CONFIGURATION
// ============================================================================

/**
 * GET /api/v1/admin/plugins/:id/config
 * Get plugin configuration
 */
router.get(
  '/:id/config',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const plugin = await PluginSystemService.getPlugin(id);
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Plugin ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: {
        pluginId: plugin.pluginId,
        configuration: plugin.configuration,
        manifest: (plugin.manifest as any).configuration,
      },
      timestamp: new Date(),
    });
  })
);

/**
 * PUT /api/v1/admin/plugins/:id/config
 * Update plugin configuration
 */
router.put(
  '/:id/config',
  requireAuth,
  requireRole(['System Administrator']),
  validateRequest(
    {
      body: {
        configuration: { type: 'object', required: true },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { configuration } = req.body;
    const userId = req.user?.id || 'system';

    const plugin = await PluginSystemService.getPlugin(id);
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Plugin ${id} not found` },
        timestamp: new Date(),
      });
    }

    // Validate against manifest schema if provided
    const manifestConfig = (plugin.manifest as any).configuration;
    if (manifestConfig) {
      for (const [key, config] of Object.entries(manifestConfig)) {
        if ((config as any).required && !(configuration[key] !== undefined)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: `Required configuration field '${key}' is missing`,
            },
            timestamp: new Date(),
          });
        }
      }
    }

    // Update plugin configuration
    const updated = await PluginSystemService.updatePluginConfiguration(id, configuration, userId);

    res.json({
      success: true,
      data: {
        pluginId: plugin.pluginId,
        configuration: updated,
      },
      message: 'Plugin configuration updated successfully',
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// PLUGIN MONITORING & EXECUTION HISTORY
// ============================================================================

/**
 * GET /api/v1/admin/plugins/:id/executions
 * Get execution history for a plugin
 */
router.get(
  '/:id/executions',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = '100', hookPoint } = req.query;

    const plugin = await PluginSystemService.getPlugin(id);
    if (!plugin) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Plugin ${id} not found` },
        timestamp: new Date(),
      });
    }

    const executions = await PluginSystemService.getExecutionHistory(
      id,
      parseInt(limit as string),
      hookPoint as string
    );

    res.json({
      success: true,
      data: executions,
      count: executions.length,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/admin/plugins/:id/executions/:executionId
 * Get specific execution details
 */
router.get(
  '/:id/executions/:executionId',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id, executionId } = req.params;

    const execution = await PluginSystemService.getExecution(executionId);
    if (!execution || execution.pluginId !== id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Execution ${executionId} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: execution,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/admin/plugins/:id/stats
 * Get plugin statistics and health metrics
 */
router.get(
  '/:id/stats',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const stats = await PluginSystemService.getPluginStats(id);
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Plugin ${id} not found` },
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// PLUGIN WEBHOOK MANAGEMENT
// ============================================================================

/**
 * GET /api/v1/admin/plugins/:id/webhooks
 * Get webhooks registered by a plugin
 */
router.get(
  '/:id/webhooks',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const webhooks = await PluginSystemService.getPluginWebhooks(id);

    res.json({
      success: true,
      data: webhooks,
      count: webhooks.length,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/admin/plugins/:id/webhooks
 * Register a webhook for a plugin
 */
router.post(
  '/:id/webhooks',
  requireAuth,
  requireRole(['System Administrator']),
  validateRequest(
    {
      body: {
        eventType: { type: 'string', required: true },
        webhookUrl: { type: 'string', required: true },
        secret: { type: 'string', required: true },
        maxRetries: { type: 'number', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { eventType, webhookUrl, secret, maxRetries = 3 } = req.body;

    const webhook = await PluginSystemService.registerWebhook(id, eventType, webhookUrl, secret, maxRetries);

    res.status(201).json({
      success: true,
      data: webhook,
      message: 'Webhook registered successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * DELETE /api/v1/admin/plugins/:id/webhooks/:webhookId
 * Unregister a webhook
 */
router.delete(
  '/:id/webhooks/:webhookId',
  requireAuth,
  requireRole(['System Administrator']),
  errorHandler(async (req, res) => {
    const { id, webhookId } = req.params;

    await PluginSystemService.unregisterWebhook(webhookId);

    res.json({
      success: true,
      data: { webhookId },
      message: 'Webhook unregistered successfully',
      timestamp: new Date(),
    });
  })
);

export default router;
