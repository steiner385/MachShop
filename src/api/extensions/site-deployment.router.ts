/**
 * Site Extension Deployment API Routes
 * Provides REST endpoints for managing multi-site extension deployment
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SiteExtensionDeploymentService } from '../../services/SiteExtensionDeploymentService';
import {
  ExtensionDeploymentRequest,
  BulkDeploymentRequest,
  MultiTenancyContext,
  SiteDeploymentError,
} from '../../types/siteExtensionDeployment';

export function createSiteDeploymentRouter(
  service: SiteExtensionDeploymentService
): Router {
  const router = Router();

  /**
   * Helper to extract multi-tenancy context from request
   */
  const getMultiTenancyContext = (req: Request): MultiTenancyContext => {
    return {
      siteId: req.query.siteId as string,
      userId: req.user?.id,
      roles: req.user?.roles || [],
      permissions: req.user?.permissions || [],
    };
  };

  /**
   * GET /api/sites/:siteId/extensions/:extensionId/status
   * Get deployment status of extension at a site
   */
  router.get(
    '/:siteId/extensions/:extensionId/status',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const context = getMultiTenancyContext(req);

        // Get extension status
        // TODO: Query database for SiteExtension record
        const status = {
          siteId,
          extensionId,
          enabledStatus: 'enabled',
          deploymentStatus: 'deployed',
          healthStatus: 'healthy',
          message: 'Extension deployment status retrieved',
        };

        res.json(status);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/sites/:siteId/extensions/:extensionId/enable
   * Enable extension for a site
   */
  router.post(
    '/:siteId/extensions/:extensionId/enable',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const { extensionVersion } = req.body;
        const context = getMultiTenancyContext(req);

        if (!extensionVersion) {
          return res.status(400).json({
            error: 'extensionVersion is required',
          });
        }

        const result = await service.enableExtensionForSite(
          siteId,
          extensionId,
          extensionVersion,
          context
        );

        res.json({
          success: true,
          status: result,
          message: `Extension ${extensionId} enabled for site ${siteId}`,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/sites/:siteId/extensions/:extensionId/disable
   * Disable extension for a site
   */
  router.post(
    '/:siteId/extensions/:extensionId/disable',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const { reason } = req.body;
        const context = getMultiTenancyContext(req);

        const result = await service.disableExtensionForSite(
          siteId,
          extensionId,
          reason,
          context
        );

        res.json({
          success: true,
          status: result,
          message: `Extension ${extensionId} disabled for site ${siteId}`,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/sites/:siteId/extensions/:extensionId/deploy
   * Deploy extension to a site with options for rollout strategy
   */
  router.post(
    '/:siteId/extensions/:extensionId/deploy',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const context = getMultiTenancyContext(req);

        const deploymentRequest: ExtensionDeploymentRequest = {
          siteId,
          extensionId,
          extensionVersion: req.body.extensionVersion,
          deploymentType: req.body.deploymentType || 'initial',
          rolloutStrategy: req.body.rolloutStrategy || 'immediate',
          rolloutSchedule: req.body.rolloutSchedule,
          preDeploymentChecks: req.body.preDeploymentChecks !== false,
          postDeploymentChecks: req.body.postDeploymentChecks !== false,
          enableAutoRollback: req.body.enableAutoRollback !== false,
          rollbackThreshold: req.body.rollbackThreshold,
          requestedBy: context.userId,
          notes: req.body.notes,
        };

        if (!deploymentRequest.extensionVersion) {
          return res.status(400).json({
            error: 'extensionVersion is required',
          });
        }

        const result = await service.deployExtensionToSite(deploymentRequest, context);

        res.json({
          success: true,
          deploymentRequestId: result.id,
          status: result.status,
          message: 'Deployment initiated',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/sites/:siteId/extensions/bulk-deploy
   * Deploy multiple extensions to a site
   */
  router.post(
    '/:siteId/extensions/bulk-deploy',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId } = req.params;
        const context = getMultiTenancyContext(req);

        const bulkRequest: BulkDeploymentRequest = {
          extensions: req.body.extensions,
          deploymentType: req.body.deploymentType || 'initial',
          rolloutStrategy: req.body.rolloutStrategy,
          preDeploymentValidation: req.body.preDeploymentValidation !== false,
          orderByDependency: req.body.orderByDependency !== false,
          requestedBy: context.userId,
          notes: req.body.notes,
        };

        // Override sites in request to current site
        bulkRequest.extensions = bulkRequest.extensions.map(ext => ({
          ...ext,
          sites: [siteId],
        }));

        if (!bulkRequest.extensions || bulkRequest.extensions.length === 0) {
          return res.status(400).json({
            error: 'extensions array is required and must not be empty',
          });
        }

        const result = await service.bulkDeployExtensions(bulkRequest, context);

        res.json({
          success: true,
          requestId: result.requestId,
          totalDeployments: result.totalDeployments,
          successfulDeployments: result.successfulDeployments,
          failedDeployments: result.failedDeployments,
          errors: result.errors.length > 0 ? result.errors : undefined,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/deployments/:deploymentRequestId/rollback
   * Rollback a deployment
   */
  router.post(
    '/:siteId/deployments/:deploymentRequestId/rollback',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { deploymentRequestId } = req.params;
        const { reason } = req.body;
        const context = getMultiTenancyContext(req);

        if (!reason) {
          return res.status(400).json({
            error: 'reason is required for rollback',
          });
        }

        await service.rollbackDeployment(deploymentRequestId, reason, context);

        res.json({
          success: true,
          message: `Deployment ${deploymentRequestId} rolled back`,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/sites/:siteId/extensions/:extensionId/configuration
   * Get extension configuration with inheritance resolution
   */
  router.get(
    '/:siteId/extensions/:extensionId/configuration',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const context = getMultiTenancyContext(req);

        const config = await service.getSiteExtensionConfiguration(
          siteId,
          extensionId,
          context
        );

        res.json({
          siteExtensionId: config.siteExtensionId,
          extensionId: config.extensionId,
          siteId: config.siteId,
          resolvedConfiguration: config.configData,
          hierarchy: {
            extensionDefault: config.hierarchy.extensionDefault,
            enterpriseOverride: config.hierarchy.enterpriseOverride,
            siteOverride: config.hierarchy.siteOverride,
            inheritFromEnterprise: config.hierarchy.inheritFromEnterprise,
            inheritFromExtension: config.hierarchy.inheritFromExtension,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /api/sites/:siteId/extensions/:extensionId/configuration
   * Update extension configuration for a site
   */
  router.put(
    '/:siteId/extensions/:extensionId/configuration',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const { configData } = req.body;
        const context = getMultiTenancyContext(req);

        if (!configData || typeof configData !== 'object') {
          return res.status(400).json({
            error: 'configData is required and must be an object',
          });
        }

        const result = await service.updateSiteExtensionConfiguration(
          siteId,
          extensionId,
          configData,
          context
        );

        res.json({
          success: true,
          siteExtensionId: result.siteExtensionId,
          message: 'Configuration updated successfully',
          resolvedConfiguration: result.configData,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/sites/:siteId/extensions/:extensionId/health
   * Check health of extension at site
   */
  router.get(
    '/:siteId/extensions/:extensionId/health',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId, extensionId } = req.params;
        const checkType = (req.query.checkType as string) || 'periodic';

        const result = await service.checkExtensionHealth(
          siteId,
          extensionId,
          checkType as 'startup' | 'periodic' | 'on_demand' | 'pre_rollback'
        );

        res.json({
          checkId: result.id,
          status: result.status,
          checkType: result.checkType,
          responseTime: result.responseTime,
          statusCode: result.statusCode,
          memoryUsage: result.memoryUsage,
          cpuUsage: result.cpuUsage,
          triggeredRollback: result.triggeredRollback,
          checkedAt: result.checkedAt,
          errorLog: result.errorLog,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Error handling middleware for site deployment routes
   */
  router.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof SiteDeploymentError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        siteId: error.siteId,
        extensionId: error.extensionId,
        details: error.details,
      });
    }

    // Multi-tenancy access violation
    if (error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message,
      });
    }

    // Generic error handling
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  });

  return router;
}
