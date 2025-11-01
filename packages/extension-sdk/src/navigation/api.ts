/**
 * Navigation Extension Framework - API Routes
 * Issue #427: Navigation Extension Framework with Approval Workflow
 *
 * Provides REST API endpoints for managing navigation, menu items, and governance
 */

import type { Router, Request, Response, NextFunction } from 'express';
import type {
  NavigationMenuItem,
  NavigationMenuGroup,
  NewMenuGroupRequest,
  NavigationQueryOptions,
} from './types';
import { getNavigationRegistry } from './registry';
import {
  NavigationError,
  MenuItemNotFoundError,
  MenuGroupNotFoundError,
  NavigationValidationError,
} from './types';

/**
 * Create navigation API router
 */
export function createNavigationRouter(
  router: Router
): void {
  const registry = getNavigationRegistry();

  /**
   * Helper to get user permissions from request
   */
  const getUserPermissions = (req: Request): string[] => {
    return req.user?.permissions || [];
  };

  /**
   * Helper to extract query options from request
   */
  const getQueryOptions = (req: Request): NavigationQueryOptions => {
    return {
      userPermissions: getUserPermissions(req),
      includeMobileHidden: req.query.includeMobileHidden === 'true',
      excludeDisabledExtensions: req.query.excludeDisabledExtensions
        ? (req.query.excludeDisabledExtensions as string).split(',')
        : undefined,
      siteId: req.query.siteId as string,
    };
  };

  /**
   * GET /api/navigation/menu
   * Get complete navigation tree
   */
  router.get('/menu', (req: Request, res: Response, next: NextFunction) => {
    try {
      const options = getQueryOptions(req);
      const navigationTree = registry.getNavigationTree(options);
      res.json({
        success: true,
        data: navigationTree,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/navigation/groups
   * Get all menu groups
   */
  router.get('/groups', (req: Request, res: Response, next: NextFunction) => {
    try {
      const groups = registry.getGroups();
      res.json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /api/navigation/groups/:groupId
   * Get specific menu group with items
   */
  router.get(
    '/groups/:groupId',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { groupId } = req.params;
        const group = registry.getGroup(groupId);

        if (!group) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'GROUP_NOT_FOUND',
              message: `Menu group not found: ${groupId}`,
            },
          });
        }

        const options = getQueryOptions(req);
        const items = registry.getGroupItems(groupId, options);

        res.json({
          success: true,
          data: {
            ...group,
            items,
          },
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/navigation/items/:itemId
   * Get specific menu item
   */
  router.get(
    '/items/:itemId',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { itemId } = req.params;
        const item = registry.getMenuItem(itemId);

        if (!item) {
          return res.status(404).json({
            success: false,
            error: {
              code: 'ITEM_NOT_FOUND',
              message: `Menu item not found: ${itemId}`,
            },
          });
        }

        res.json({
          success: true,
          data: item,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/navigation/items
   * Register a new menu item
   */
  router.post('/items', (req: Request, res: Response, next: NextFunction) => {
    try {
      const item = req.body as NavigationMenuItem;

      // Validate required fields
      if (!item.id || !item.label || !item.path || !item.parentGroup) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: id, label, path, parentGroup',
          },
        });
      }

      registry.registerMenuItem(item);

      res.status(201).json({
        success: true,
        data: item,
        message: 'Menu item registered successfully',
      });
    } catch (error) {
      if (error instanceof NavigationValidationError) {
        return res.status(400).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.validationErrors,
          },
        });
      }
      if (error instanceof MenuGroupNotFoundError) {
        return res.status(404).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        });
      }
      next(error);
    }
  });

  /**
   * DELETE /api/navigation/items/:itemId
   * Unregister a menu item
   */
  router.delete(
    '/items/:itemId',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { itemId } = req.params;

        registry.unregisterMenuItem(itemId);

        res.json({
          success: true,
          message: 'Menu item unregistered successfully',
        });
      } catch (error) {
        if (error instanceof MenuItemNotFoundError) {
          return res.status(404).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }
        next(error);
      }
    }
  );

  /**
   * POST /api/navigation/groups/request
   * Request a new menu group (governance)
   */
  router.post(
    '/groups/request',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const request = req.body as NewMenuGroupRequest;

        // Validate required fields
        if (!request.id || !request.name || !request.description || !request.justification) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields: id, name, description, justification',
            },
          });
        }

        // Set extension ID from authenticated user if not provided
        request.extensionId = request.extensionId || req.user?.extensionId || 'unknown';

        registry.requestNewGroup(request);

        res.status(201).json({
          success: true,
          data: request,
          message: 'Group request submitted for approval',
        });
      } catch (error) {
        if (error instanceof NavigationError) {
          return res.status(409).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
          });
        }
        next(error);
      }
    }
  );

  /**
   * GET /api/navigation/groups/pending
   * Get pending group requests (governance)
   */
  router.get(
    '/groups/pending',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check admin permission
        if (!req.user?.permissions?.includes('admin:navigation')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Insufficient permissions to view pending requests',
            },
          });
        }

        const pendingRequests = registry.getPendingRequests();

        res.json({
          success: true,
          data: pendingRequests,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/navigation/groups/:groupId/approve
   * Approve a pending group request
   */
  router.post(
    '/groups/:groupId/approve',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { groupId } = req.params;
        const { comment } = req.body;

        // Check admin permission
        if (!req.user?.permissions?.includes('admin:navigation')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Insufficient permissions to approve groups',
            },
          });
        }

        registry.approveNewGroup(groupId, comment);

        res.json({
          success: true,
          message: `Group ${groupId} approved successfully`,
          data: registry.getGroup(groupId),
        });
      } catch (error) {
        if (error instanceof NavigationError) {
          return res.status(404).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }
        next(error);
      }
    }
  );

  /**
   * POST /api/navigation/groups/:groupId/reject
   * Reject a pending group request
   */
  router.post(
    '/groups/:groupId/reject',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { groupId } = req.params;
        const { comment } = req.body;

        // Check admin permission
        if (!req.user?.permissions?.includes('admin:navigation')) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'PERMISSION_DENIED',
              message: 'Insufficient permissions to reject groups',
            },
          });
        }

        if (!comment) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Comment is required for rejection',
            },
          });
        }

        registry.rejectNewGroup(groupId, comment);

        res.json({
          success: true,
          message: `Group ${groupId} rejected successfully`,
        });
      } catch (error) {
        if (error instanceof NavigationError) {
          return res.status(404).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
            },
          });
        }
        next(error);
      }
    }
  );

  /**
   * GET /api/navigation/sites/:siteId/config
   * Get site-scoped navigation configuration
   */
  router.get(
    '/sites/:siteId/config',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId } = req.params;
        const config = registry.getSiteNavigation(siteId);

        res.json({
          success: true,
          data: config,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /api/navigation/sites/:siteId/config
   * Update site-scoped navigation configuration
   */
  router.put(
    '/sites/:siteId/config',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { siteId } = req.params;
        const { enabledExtensions } = req.body;

        if (!Array.isArray(enabledExtensions)) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'enabledExtensions must be an array',
            },
          });
        }

        registry.updateSiteNavigation(siteId, enabledExtensions);
        const config = registry.getSiteNavigation(siteId);

        res.json({
          success: true,
          data: config,
          message: 'Site navigation configuration updated successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/navigation/approved-groups
   * Get all approved menu groups
   */
  router.get(
    '/approved-groups',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const approvedGroups = registry.getApprovedGroups();

        res.json({
          success: true,
          data: approvedGroups,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/navigation/validate
   * Validate a menu item configuration
   */
  router.post(
    '/validate',
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const item = req.body as NavigationMenuItem;
        const validation = registry.validateMenuItem(item);

        res.json({
          success: true,
          data: validation,
        });
      } catch (error) {
        next(error);
      }
    }
  );
}

/**
 * Register navigation routes with Express app
 */
export function registerNavigationRoutes(app: any): void {
  const router = app.Router?.() || require('express').Router();
  createNavigationRouter(router);
  app.use?.('/api/navigation', router);
}
