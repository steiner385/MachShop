import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware, requirePermission } from '../../middleware/auth';
import { PluginRegistryService } from '../../services/PluginRegistryService';
import { PluginValidationService } from '../../services/PluginValidationService';
import { prisma } from '../../lib/prisma';

const router = Router();

/**
 * Plugin Registry Admin Routes
 *
 * All routes require authentication and admin permissions:
 * - /admin/plugin-registry/* - Central IT management
 * - /admin/plugins/* - General plugin management
 */

// ============================================================================
// PLUGIN PACKAGE MANAGEMENT (Central IT)
// ============================================================================

/**
 * GET /admin/plugin-registry/packages
 * List all plugin packages across registries
 */
router.get(
  '/plugin-registry/packages',
  requirePermission('plugins:read'),
  async (req: Request, res: Response) => {
    try {
      const { registryId, status, search, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (registryId) where.registryId = registryId as string;
      if (status) where.status = status as string;
      if (search) {
        where.OR = [
          { pluginId: { contains: search as string, mode: 'insensitive' } },
          { name: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const packages = await prisma.pluginPackage.findMany({
        where,
        include: { registry: true, reviews: { take: 3 } },
        skip,
        take: Number(limit),
        orderBy: { uploadedAt: 'desc' },
      });

      const total = await prisma.pluginPackage.count({ where });

      res.json({
        data: packages,
        pagination: { page: Number(page), limit: Number(limit), total },
      });
    } catch (error) {
      console.error('Error listing plugins:', error);
      res.status(500).json({ error: 'Failed to list plugins' });
    }
  }
);

/**
 * POST /admin/plugin-registry/packages
 * Submit a new plugin package for approval
 */
router.post(
  '/plugin-registry/packages',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        registryId: z.string(),
        pluginId: z.string().regex(/^[a-z0-9-]+$/),
        version: z.string(),
        manifest: z.object({
          id: z.string(),
          name: z.string(),
          version: z.string(),
          author: z.string(),
          apiVersion: z.string(),
          license: z.string().optional(),
          mesVersion: z.string().optional(),
          permissions: z.array(z.string()).optional(),
          hooks: z.array(z.string()).optional(),
          dependencies: z.record(z.string()).optional(),
          configuration: z.record(z.any()).optional(),
        }),
        packageUrl: z.string().url(),
        checksum: z.string(),
      });

      const input = schema.parse(req.body);
      const userId = (req as any).user.id;

      // Validate manifest
      const validation = await PluginValidationService.validatePlugin(
        input.manifest,
        Buffer.from(''), // Would load actual package data
        input.checksum,
        process.env.API_VERSION || '1.0.0',
        process.env.MES_VERSION || '1.0.0'
      );

      if (!validation.valid) {
        return res.status(400).json({
          error: 'Plugin validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      const pkg = await PluginRegistryService.submitPlugin(
        input.registryId,
        input.pluginId,
        input.version,
        input.manifest,
        input.packageUrl,
        input.checksum,
        input.manifest.author,
        userId
      );

      res.status(201).json({
        data: pkg,
        message: 'Plugin submitted for approval',
        warnings: validation.warnings,
        securityFindings: validation.securityFindings,
      });
    } catch (error: any) {
      console.error('Error submitting plugin:', error);
      if (error.message.includes('Invalid')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to submit plugin' });
    }
  }
);

/**
 * GET /admin/plugin-registry/packages/:id
 * Get plugin package details
 */
router.get(
  '/plugin-registry/packages/:id',
  requirePermission('plugins:read'),
  async (req: Request, res: Response) => {
    try {
      const pkg = await prisma.pluginPackage.findUnique({
        where: { id: req.params.id },
        include: {
          registry: true,
          installations: { take: 10, orderBy: { installedAt: 'desc' } },
          licenses: { take: 10 },
          reviews: { orderBy: { createdAt: 'desc' } },
          deployments: { take: 10, orderBy: { createdAt: 'desc' } },
        },
      });

      if (!pkg) {
        return res.status(404).json({ error: 'Plugin not found' });
      }

      res.json({ data: pkg });
    } catch (error) {
      console.error('Error getting plugin:', error);
      res.status(500).json({ error: 'Failed to get plugin' });
    }
  }
);

/**
 * PUT /admin/plugin-registry/packages/:id/approve
 * Approve a plugin for installation
 */
router.put(
  '/plugin-registry/packages/:id/approve',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;

      const pkg = await PluginRegistryService.approvePlugin(req.params.id, userId);

      res.json({
        data: pkg,
        message: 'Plugin approved for installation',
      });
    } catch (error: any) {
      console.error('Error approving plugin:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * PUT /admin/plugin-registry/packages/:id/reject
 * Reject a plugin submission
 */
router.put(
  '/plugin-registry/packages/:id/reject',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = z.object({ reason: z.string() }).parse(req.body);
      const userId = (req as any).user.id;

      const pkg = await PluginRegistryService.rejectPlugin(req.params.id, reason, userId);

      res.json({
        data: pkg,
        message: 'Plugin rejected',
      });
    } catch (error: any) {
      console.error('Error rejecting plugin:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * PUT /admin/plugin-registry/packages/:id/revoke
 * Revoke a plugin due to security issue
 */
router.put(
  '/plugin-registry/packages/:id/revoke',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const { reason } = z.object({ reason: z.string() }).parse(req.body);

      const pkg = await PluginRegistryService.revokePlugin(req.params.id, reason);

      res.json({
        data: pkg,
        message: 'Plugin revoked - all installations should be deactivated',
      });
    } catch (error: any) {
      console.error('Error revoking plugin:', error);
      res.status(500).json({ error: 'Failed to revoke plugin' });
    }
  }
);

// ============================================================================
// PLUGIN INSTALLATION MANAGEMENT (Site Admin)
// ============================================================================

/**
 * GET /admin/plugins/installed
 * List plugins installed at current site
 */
router.get(
  '/plugins/installed',
  requirePermission('plugins:read'),
  async (req: Request, res: Response) => {
    try {
      const siteId = (req as any).user.siteId;
      if (!siteId) {
        return res.status(400).json({ error: 'Site context required' });
      }

      const installations = await prisma.pluginInstallation.findMany({
        where: { siteId },
        include: {
          package: { include: { registry: true } },
          healthLogs: { take: 5, orderBy: { recordedAt: 'desc' } },
        },
        orderBy: { installedAt: 'desc' },
      });

      res.json({ data: installations });
    } catch (error) {
      console.error('Error listing installed plugins:', error);
      res.status(500).json({ error: 'Failed to list installations' });
    }
  }
);

/**
 * POST /admin/plugins/install
 * Install a plugin at the current site
 */
router.post(
  '/plugins/install',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        packageId: z.string(),
        configuration: z.record(z.any()).optional(),
      });

      const input = schema.parse(req.body);
      const siteId = (req as any).user.siteId;
      const userId = (req as any).user.id;

      if (!siteId) {
        return res.status(400).json({ error: 'Site context required' });
      }

      const installation = await PluginRegistryService.installPlugin(
        input.packageId,
        siteId,
        input.configuration,
        userId
      );

      res.status(201).json({
        data: installation,
        message: 'Plugin installed successfully',
      });
    } catch (error: any) {
      console.error('Error installing plugin:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /admin/plugins/:id/activate
 * Activate an installed plugin
 */
router.post(
  '/plugins/:id/activate',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const installation = await PluginRegistryService.activatePlugin(req.params.id);

      res.json({
        data: installation,
        message: 'Plugin activated',
      });
    } catch (error: any) {
      console.error('Error activating plugin:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * POST /admin/plugins/:id/deactivate
 * Deactivate a plugin (soft uninstall)
 */
router.post(
  '/plugins/:id/deactivate',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const installation = await prisma.pluginInstallation.update({
        where: { id: req.params.id },
        data: {
          status: 'INACTIVE',
          deactivatedAt: new Date(),
        },
      });

      res.json({
        data: installation,
        message: 'Plugin deactivated',
      });
    } catch (error: any) {
      console.error('Error deactivating plugin:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: 'Installation not found' });
      }
      res.status(500).json({ error: 'Failed to deactivate plugin' });
    }
  }
);

/**
 * DELETE /admin/plugins/:id
 * Uninstall a plugin
 */
router.delete(
  '/plugins/:id',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const installation = await PluginRegistryService.uninstallPlugin(req.params.id);

      res.json({
        data: installation,
        message: 'Plugin uninstalled',
      });
    } catch (error: any) {
      console.error('Error uninstalling plugin:', error);
      res.status(500).json({ error: 'Failed to uninstall plugin' });
    }
  }
);

// ============================================================================
// MULTI-SITE DEPLOYMENT
// ============================================================================

/**
 * POST /admin/plugin-registry/deploy
 * Deploy plugin to multiple sites
 */
router.post(
  '/plugin-registry/deploy',
  requirePermission('plugins:write'),
  async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        packageId: z.string(),
        siteIds: z.array(z.string()).min(1),
        deploymentType: z.enum(['INSTALL', 'UPGRADE', 'ROLLBACK']),
        scheduledFor: z.string().datetime().optional(),
      });

      const input = schema.parse(req.body);
      const userId = (req as any).user.id;

      const deployment = await PluginRegistryService.deployToSites(
        input.packageId,
        input.siteIds,
        input.deploymentType,
        userId,
        input.scheduledFor ? new Date(input.scheduledFor) : undefined
      );

      res.status(201).json({
        data: deployment,
        message: `Plugin deployment ${input.deploymentType.toLowerCase()} initiated`,
      });
    } catch (error: any) {
      console.error('Error deploying plugin:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

/**
 * GET /admin/plugin-registry/deployments
 * List deployments
 */
router.get(
  '/plugin-registry/deployments',
  requirePermission('plugins:read'),
  async (req: Request, res: Response) => {
    try {
      const { status, page = 1, limit = 50 } = req.query;

      const where: any = {};
      if (status) where.status = status as string;

      const skip = (Number(page) - 1) * Number(limit);
      const deployments = await prisma.pluginDeployment.findMany({
        where,
        include: { package: true },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.pluginDeployment.count({ where });

      res.json({
        data: deployments,
        pagination: { page: Number(page), limit: Number(limit), total },
      });
    } catch (error) {
      console.error('Error listing deployments:', error);
      res.status(500).json({ error: 'Failed to list deployments' });
    }
  }
);

/**
 * GET /admin/plugin-registry/deployments/:id
 * Get deployment status
 */
router.get(
  '/plugin-registry/deployments/:id',
  requirePermission('plugins:read'),
  async (req: Request, res: Response) => {
    try {
      const deployment = await prisma.pluginDeployment.findUnique({
        where: { id: req.params.id },
        include: { package: true },
      });

      if (!deployment) {
        return res.status(404).json({ error: 'Deployment not found' });
      }

      res.json({ data: deployment });
    } catch (error) {
      console.error('Error getting deployment:', error);
      res.status(500).json({ error: 'Failed to get deployment' });
    }
  }
);

// ============================================================================
// PLUGIN HEALTH & MONITORING
// ============================================================================

/**
 * GET /admin/plugins/:id/health
 * Get plugin health status
 */
router.get(
  '/plugins/:id/health',
  requirePermission('plugins:read'),
  async (req: Request, res: Response) => {
    try {
      const installation = await PluginRegistryService.getInstallationStatus(req.params.id);

      if (!installation) {
        return res.status(404).json({ error: 'Installation not found' });
      }

      res.json({ data: installation });
    } catch (error) {
      console.error('Error getting health status:', error);
      res.status(500).json({ error: 'Failed to get health status' });
    }
  }
);

/**
 * POST /admin/plugins/:id/health
 * Record plugin health metrics
 */
router.post(
  '/plugins/:id/health',
  async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        errorCount: z.number().optional(),
        warningCount: z.number().optional(),
        avgExecutionTime: z.number().optional(),
        memoryUsage: z.number().optional(),
        cpuUsage: z.number().optional(),
      });

      const metrics = schema.parse(req.body);

      await PluginRegistryService.recordHealth(req.params.id, metrics);

      res.json({ message: 'Health metrics recorded' });
    } catch (error: any) {
      console.error('Error recording health:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
