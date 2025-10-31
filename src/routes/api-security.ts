/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * API Security Routes
 *
 * Endpoints for:
 * - API key management (CRUD, rotation, revocation)
 * - RBAC management (permissions, roles)
 * - Rate limiting configuration
 * - Access logs and audit trails
 * - Security alerts
 */

import express, { Request, Response } from 'express';
import { apiKeyService } from '../services/ApiKeyService';
import { accessControlService } from '../services/ApiAccessControlService';
import { rateLimitService } from '../services/RateLimitService';
import {
  apiAuthentication,
  requireApiAuth,
  requirePermission,
  requireScopes,
} from '../middleware/api-auth-issue-74.middleware';
import { checkRateLimit } from '../middleware/api-rate-limit-issue-74.middleware';
import {
  auditRequestStart,
  auditAccessLog,
  detectSuspiciousActivity,
} from '../middleware/api-audit-issue-74.middleware';
import { asyncHandler } from '../middleware/errorHandler';
import { ApiKeyType } from '../types/security';

const router = express.Router();

// Apply middleware to all routes
router.use(auditRequestStart);
router.use(apiAuthentication);
router.use(checkRateLimit);
router.use(auditAccessLog);
router.use(detectSuspiciousActivity);

// ============================================================================
// API Key Management Routes
// ============================================================================

/**
 * @route POST /api/v1/api-keys
 * @desc Create a new API key
 * @access Private
 */
router.post(
  '/api-keys',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, type, expiresInDays, roles, rotationSchedule, metadata } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type are required' });
    }

    if (!Object.values(ApiKeyType).includes(type)) {
      return res.status(400).json({ error: 'Invalid API key type' });
    }

    const response = await apiKeyService.createApiKey(
      {
        name,
        type,
        expiresInDays,
        roles,
        rotationSchedule,
        metadata,
      },
      req.apiAuth!.userId,
      req.apiAuth!.serviceAccountId,
    );

    res.status(201).json({
      message: 'API key created successfully',
      data: response,
      warning: 'Save the secret key in a secure location. You will not be able to see it again.',
    });
  }),
);

/**
 * @route GET /api/v1/api-keys
 * @desc List API keys for the authenticated user/service account
 * @access Private
 */
router.get(
  '/api-keys',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, limit = '50', offset = '0' } = req.query;

    const result = await apiKeyService.listApiKeys(
      req.apiAuth!.userId || req.apiAuth!.serviceAccountId!,
      status as string,
      parseInt(limit as string),
      parseInt(offset as string),
    );

    res.json({
      message: 'API keys retrieved successfully',
      data: result,
    });
  }),
);

/**
 * @route GET /api/v1/api-keys/:id
 * @desc Get API key details
 * @access Private
 */
router.get(
  '/api-keys/:id',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const key = await apiKeyService.getApiKey(req.params.id);

    if (!key) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({
      message: 'API key details retrieved',
      data: key,
    });
  }),
);

/**
 * @route PUT /api/v1/api-keys/:id
 * @desc Update API key metadata
 * @access Private
 */
router.put(
  '/api-keys/:id',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, metadata } = req.body;

    const updated = await apiKeyService.updateApiKey(req.params.id, {
      name,
      metadata,
    });

    res.json({
      message: 'API key updated successfully',
      data: updated,
    });
  }),
);

/**
 * @route DELETE /api/v1/api-keys/:id
 * @desc Revoke an API key
 * @access Private
 */
router.delete(
  '/api-keys/:id',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { reason } = req.body;

    const revoked = await apiKeyService.revokeKey(
      req.params.id,
      req.apiAuth!.userId || req.apiAuth!.serviceAccountId!,
      reason,
    );

    res.json({
      message: 'API key revoked successfully',
      data: revoked,
    });
  }),
);

/**
 * @route POST /api/v1/api-keys/:id/rotate
 * @desc Rotate an API key
 * @access Private
 */
router.post(
  '/api-keys/:id/rotate',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const response = await apiKeyService.rotateKey(
      req.params.id,
      req.apiAuth!.userId,
      req.apiAuth!.serviceAccountId,
    );

    res.status(201).json({
      message: 'API key rotated successfully',
      data: response,
      warning: 'The old key has been revoked and will no longer work',
    });
  }),
);

/**
 * @route GET /api/v1/api-keys/:id/usage
 * @desc Get API key usage statistics
 * @access Private
 */
router.get(
  '/api-keys/:id/usage',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();

    const stats = await apiKeyService.getKeyUsageStats(req.params.id, start, end);

    res.json({
      message: 'Usage statistics retrieved',
      data: stats,
    });
  }),
);

/**
 * @route POST /api/v1/api-keys/:id/roles
 * @desc Assign a role to an API key
 * @access Private - Admin only
 */
router.post(
  '/api-keys/:id/roles',
  requireApiAuth,
  requirePermission('admin:api-keys:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { roleId } = req.body;

    if (!roleId) {
      return res.status(400).json({ error: 'roleId is required' });
    }

    await accessControlService.assignRoleToKey(req.params.id, roleId, req.apiAuth!.apiKeyId);

    res.status(201).json({
      message: 'Role assigned to API key successfully',
    });
  }),
);

/**
 * @route DELETE /api/v1/api-keys/:id/roles/:roleId
 * @desc Remove a role from an API key
 * @access Private - Admin only
 */
router.delete(
  '/api-keys/:id/roles/:roleId',
  requireApiAuth,
  requirePermission('admin:api-keys:write'),
  asyncHandler(async (req: Request, res: Response) => {
    await accessControlService.removeRoleFromKey(req.params.id, req.params.roleId);

    res.json({
      message: 'Role removed from API key successfully',
    });
  }),
);

// ============================================================================
// RBAC Management Routes
// ============================================================================

/**
 * @route GET /api/v1/permissions
 * @desc List all permissions
 * @access Private
 */
router.get(
  '/permissions',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = '100', offset = '0' } = req.query;

    const result = await accessControlService.listPermissions(
      parseInt(limit as string),
      parseInt(offset as string),
    );

    res.json({
      message: 'Permissions retrieved successfully',
      data: result,
    });
  }),
);

/**
 * @route GET /api/v1/roles
 * @desc List all roles
 * @access Private
 */
router.get(
  '/roles',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit = '100', offset = '0' } = req.query;

    const result = await accessControlService.listRoles(
      parseInt(limit as string),
      parseInt(offset as string),
    );

    res.json({
      message: 'Roles retrieved successfully',
      data: result,
    });
  }),
);

/**
 * @route GET /api/v1/roles/:id
 * @desc Get role details with permissions
 * @access Private
 */
router.get(
  '/roles/:id',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const role = await accessControlService.getRoleWithPermissions(req.params.id);

    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    res.json({
      message: 'Role details retrieved',
      data: role,
    });
  }),
);

/**
 * @route POST /api/v1/roles
 * @desc Create a new role
 * @access Private - Admin only
 */
router.post(
  '/roles',
  requireApiAuth,
  requirePermission('admin:roles:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, permissions } = req.body;

    if (!name || !permissions) {
      return res.status(400).json({ error: 'name and permissions are required' });
    }

    const role = await accessControlService.createRole({
      name,
      description,
      permissions,
      isSystem: false,
    });

    res.status(201).json({
      message: 'Role created successfully',
      data: role,
    });
  }),
);

/**
 * @route PUT /api/v1/roles/:id
 * @desc Update role permissions
 * @access Private - Admin only
 */
router.put(
  '/roles/:id',
  requireApiAuth,
  requirePermission('admin:roles:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const { permissions } = req.body;

    if (!permissions) {
      return res.status(400).json({ error: 'permissions array is required' });
    }

    const updated = await accessControlService.updateRolePermissions(req.params.id, permissions);

    res.json({
      message: 'Role updated successfully',
      data: updated,
    });
  }),
);

/**
 * @route DELETE /api/v1/roles/:id
 * @desc Delete a custom role
 * @access Private - Admin only
 */
router.delete(
  '/roles/:id',
  requireApiAuth,
  requirePermission('admin:roles:write'),
  asyncHandler(async (req: Request, res: Response) => {
    await accessControlService.deleteRole(req.params.id);

    res.json({
      message: 'Role deleted successfully',
    });
  }),
);

// ============================================================================
// Rate Limiting Routes
// ============================================================================

/**
 * @route GET /api/v1/api-keys/:id/rate-limits
 * @desc Get rate limit configuration
 * @access Private
 */
router.get(
  '/api-keys/:id/rate-limits',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const config = await rateLimitService.getRateLimitConfig(req.params.id);

    if (!config) {
      return res.status(404).json({ error: 'Rate limit configuration not found' });
    }

    res.json({
      message: 'Rate limit configuration retrieved',
      data: config,
    });
  }),
);

/**
 * @route PUT /api/v1/api-keys/:id/rate-limits
 * @desc Update rate limit configuration
 * @access Private - Admin only
 */
router.put(
  '/api-keys/:id/rate-limits',
  requireApiAuth,
  requirePermission('admin:rate-limits:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await rateLimitService.updateRateLimitConfig(req.params.id, req.body);

    res.json({
      message: 'Rate limit configuration updated',
      data: updated,
    });
  }),
);

/**
 * @route GET /api/v1/api-keys/:id/quota
 * @desc Get current quota usage
 * @access Private
 */
router.get(
  '/api-keys/:id/quota',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const usage = await rateLimitService.getQuotaUsage(req.params.id);

    res.json({
      message: 'Quota usage retrieved',
      data: usage,
    });
  }),
);

/**
 * @route POST /api/v1/api-keys/:id/quota-reset
 * @desc Force quota reset (admin only)
 * @access Private - Admin only
 */
router.post(
  '/api-keys/:id/quota-reset',
  requireApiAuth,
  requirePermission('admin:rate-limits:write'),
  asyncHandler(async (req: Request, res: Response) => {
    const updated = await rateLimitService.resetQuota(req.params.id);

    res.json({
      message: 'Quota reset successfully',
      data: updated,
    });
  }),
);

// ============================================================================
// Audit & Logs Routes
// ============================================================================

/**
 * @route GET /api/v1/api-keys/:id/access-logs
 * @desc Get access logs for an API key
 * @access Private
 */
router.get(
  '/api-keys/:id/access-logs',
  requireApiAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, limit = '50', offset = '0' } = req.query;

    // TODO: Implement access log retrieval
    // For now, return empty response

    res.json({
      message: 'Access logs retrieved',
      data: {
        logs: [],
        total: 0,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  }),
);

/**
 * @route GET /api/v1/access-logs/stats
 * @desc Get access statistics
 * @access Private - Admin only
 */
router.get(
  '/access-logs/stats',
  requireApiAuth,
  requirePermission('admin:logs:read'),
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement stats aggregation

    res.json({
      message: 'Access statistics retrieved',
      data: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
      },
    });
  }),
);

/**
 * @route GET /api/v1/access-logs/security
 * @desc Get security alerts
 * @access Private - Admin only
 */
router.get(
  '/access-logs/security',
  requireApiAuth,
  requirePermission('admin:logs:read'),
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Implement security alerts retrieval

    res.json({
      message: 'Security alerts retrieved',
      data: {
        alerts: [],
        total: 0,
      },
    });
  }),
);

export default router;
