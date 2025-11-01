/**
 * Admin API Key Controller
 *
 * Provides administrative endpoints for managing API keys.
 * Includes CRUD operations and key lifecycle management.
 *
 * @module modules/api-keys/controllers/admin-api-key.controller
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response } from 'express';
import { apiKeyService } from '../api-key.service';
import { ApiTier, ApiKeyStatus } from '../../../constants/api-tiers';
import { logger } from '../../../utils/logger';

/**
 * Create a new API key
 * POST /admin/api-keys
 */
export async function createApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { name, tier, scopes, developerName, developerEmail, developerCompany, expiresAt } = req.body;

    // Validation
    if (!name || !tier) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: name, tier'
      });
      return;
    }

    if (!Object.values(ApiTier).includes(tier)) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Invalid tier. Must be one of: ${Object.values(ApiTier).join(', ')}`
      });
      return;
    }

    // Create key
    const result = await apiKeyService.createApiKey({
      name,
      tier,
      scopes: scopes || [],
      createdBy: 'admin', // TODO: Get from authenticated user
      developerName,
      developerEmail,
      developerCompany,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined
    });

    logger.info('API key created', {
      keyId: result.keyId,
      tier,
      createdBy: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: {
        keyId: result.keyId,
        keyPrefix: result.keyPrefix,
        apiKey: result.apiKey, // Only shown once at creation
        note: 'Save the API key now - it will not be shown again'
      }
    });
  } catch (error) {
    logger.error('Failed to create API key', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create API key'
    });
  }
}

/**
 * List all API keys with optional filters
 * GET /admin/api-keys
 *
 * Query parameters:
 * - tier: Filter by tier (PUBLIC, SDK, PRIVATE)
 * - status: Filter by status (ACTIVE, SUSPENDED, REVOKED, EXPIRED, PENDING_APPROVAL)
 * - createdBy: Filter by creator
 * - siteId: Filter by site
 * - limit: Results per page (default: 20)
 * - offset: Page offset (default: 0)
 */
export async function listApiKeys(req: Request, res: Response): Promise<void> {
  try {
    const { tier, status, createdBy, siteId, limit = 20, offset = 0 } = req.query;

    const filters: any = {};
    if (tier) filters.tier = tier;
    if (status) filters.status = status;
    if (createdBy) filters.createdBy = createdBy;
    if (siteId) filters.siteId = siteId;

    // Get keys (with offset/limit would require custom query)
    const keys = await apiKeyService.listApiKeys(filters);

    // Apply pagination
    const paginatedKeys = keys.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedKeys,
      pagination: {
        total: keys.length,
        limit: Number(limit),
        offset: Number(offset),
        returned: paginatedKeys.length
      }
    });
  } catch (error) {
    logger.error('Failed to list API keys', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list API keys'
    });
  }
}

/**
 * Get a single API key by ID
 * GET /admin/api-keys/:keyId
 */
export async function getApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;

    const key = await apiKeyService.getApiKeyById(keyId);

    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
      return;
    }

    res.json({
      success: true,
      data: key
    });
  } catch (error) {
    logger.error('Failed to get API key', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get API key'
    });
  }
}

/**
 * Revoke an API key
 * POST /admin/api-keys/:keyId/revoke
 */
export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;

    // Check if key exists
    const key = await apiKeyService.getApiKeyById(keyId);
    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
      return;
    }

    // Revoke key
    await apiKeyService.revokeApiKey(keyId, 'admin'); // TODO: Get from authenticated user

    logger.info('API key revoked', { keyId });

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('Failed to revoke API key', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key'
    });
  }
}

/**
 * Suspend an API key (temporarily disable)
 * POST /admin/api-keys/:keyId/suspend
 */
export async function suspendApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;

    // Check if key exists
    const key = await apiKeyService.getApiKeyById(keyId);
    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
      return;
    }

    // Suspend key
    await apiKeyService.suspendApiKey(keyId, 'admin'); // TODO: Get from authenticated user

    logger.info('API key suspended', { keyId });

    res.json({
      success: true,
      message: 'API key suspended successfully'
    });
  } catch (error) {
    logger.error('Failed to suspend API key', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to suspend API key'
    });
  }
}

/**
 * Reactivate a suspended API key
 * POST /admin/api-keys/:keyId/reactivate
 */
export async function reactivateApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;

    // Check if key exists
    const key = await apiKeyService.getApiKeyById(keyId);
    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
      return;
    }

    // Reactivate key
    await apiKeyService.reactivateApiKey(keyId, 'admin'); // TODO: Get from authenticated user

    logger.info('API key reactivated', { keyId });

    res.json({
      success: true,
      message: 'API key reactivated successfully'
    });
  } catch (error) {
    logger.error('Failed to reactivate API key', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to reactivate API key'
    });
  }
}

/**
 * Approve a pending SDK/PRIVATE tier API key
 * POST /admin/api-keys/:keyId/approve
 */
export async function approveApiKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;

    // Check if key exists
    const key = await apiKeyService.getApiKeyById(keyId);
    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
      return;
    }

    // Approve key
    await apiKeyService.approveApiKey(keyId, 'admin'); // TODO: Get from authenticated user

    logger.info('API key approved', { keyId });

    res.json({
      success: true,
      message: 'API key approved successfully'
    });
  } catch (error) {
    logger.error('Failed to approve API key', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to approve API key'
    });
  }
}

/**
 * Get usage statistics for an API key
 * GET /admin/api-keys/:keyId/stats
 *
 * Query parameters:
 * - startDate: Start of date range (ISO 8601)
 * - endDate: End of date range (ISO 8601)
 */
export async function getApiKeyStats(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const { startDate, endDate } = req.query;

    // Check if key exists
    const key = await apiKeyService.getApiKeyById(keyId);
    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found'
      });
      return;
    }

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = await apiKeyService.getUsageStats(keyId, start, end);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get API key statistics', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get API key statistics'
    });
  }
}
