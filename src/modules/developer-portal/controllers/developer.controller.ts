/**
 * Developer Portal Controller
 *
 * Self-service endpoints for developers to manage their API keys.
 * Includes key creation, rotation, revocation, and usage analytics.
 *
 * @module modules/developer-portal/controllers/developer.controller
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response } from 'express';
import { developerService } from '../services/developer.service';
import { ApiTier } from '../../../constants/api-tiers';
import { logger } from '../../../utils/logger';

/**
 * Register as a developer
 * POST /api/developers/register
 */
export async function registerDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, company } = req.body;

    // Validation
    if (!name || !email) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: name, email'
      });
      return;
    }

    // Simple email validation
    if (!email.includes('@')) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email address'
      });
      return;
    }

    // Register developer
    const profile = await developerService.registerDeveloper({
      name,
      email,
      company
    });

    logger.info('Developer registered', { email });

    res.status(201).json({
      success: true,
      message: 'Developer registered successfully',
      data: profile
    });
  } catch (error) {
    logger.error('Failed to register developer', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to register developer'
    });
  }
}

/**
 * Create an API key (self-service)
 * POST /api/developers/keys
 */
export async function createKey(req: Request, res: Response): Promise<void> {
  try {
    const { name, tier, scopes } = req.body;
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

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

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Create key
    const result = await developerService.createDeveloperKey({
      developerEmail,
      name,
      tier,
      scopes: scopes || []
    });

    logger.info('Developer created API key', {
      tier,
      requiresApproval: result.requiresApproval,
      developer: developerEmail
    });

    res.status(201).json({
      success: true,
      message: result.requiresApproval
        ? 'API key created and is pending approval'
        : 'API key created successfully',
      data: {
        keyId: result.keyId,
        apiKey: result.apiKey,
        requiresApproval: result.requiresApproval,
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
 * List developer's API keys
 * GET /api/developers/keys
 */
export async function listKeys(req: Request, res: Response): Promise<void> {
  try {
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Get keys
    const keys = await developerService.getDeveloperKeys(developerEmail);

    res.json({
      success: true,
      data: keys,
      total: keys.length
    });
  } catch (error) {
    logger.error('Failed to list developer keys', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list API keys'
    });
  }
}

/**
 * Get API key details
 * GET /api/developers/keys/:keyId
 */
export async function getKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Get all developer keys and find the one
    const keys = await developerService.getDeveloperKeys(developerEmail);
    const key = keys.find(k => k.id === keyId);

    if (!key) {
      res.status(404).json({
        error: 'Not Found',
        message: 'API key not found or you do not have access to it'
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
 * Rotate an API key (generate new one)
 * POST /api/developers/keys/:keyId/rotate
 */
export async function rotateKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Rotate key
    const result = await developerService.rotateKey(keyId, developerEmail);

    logger.info('Developer rotated API key', { keyId, developer: developerEmail });

    res.json({
      success: true,
      message: 'API key rotated successfully',
      data: {
        newKeyId: result.newKeyId,
        apiKey: result.apiKey,
        note: 'Save the new API key now - it will not be shown again'
      }
    });
  } catch (error) {
    logger.error('Failed to rotate API key', { error });

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        res.status(403).json({
          error: 'Forbidden',
          message: error.message
        });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to rotate API key'
    });
  }
}

/**
 * Revoke an API key
 * POST /api/developers/keys/:keyId/revoke
 */
export async function revokeKey(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Revoke key
    await developerService.revokeKey(keyId, developerEmail);

    logger.info('Developer revoked API key', { keyId, developer: developerEmail });

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    logger.error('Failed to revoke API key', { error });

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        res.status(403).json({
          error: 'Forbidden',
          message: error.message
        });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to revoke API key'
    });
  }
}

/**
 * Get usage analytics for developer
 * GET /api/developers/usage?startDate=2021-10-01&endDate=2021-10-31
 */
export async function getUsageAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query;
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const analytics = await developerService.getDeveloperUsageAnalytics(developerEmail, start, end);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Failed to get usage analytics', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get usage analytics'
    });
  }
}

/**
 * Get pending approval keys
 * GET /api/developers/keys/pending
 */
export async function getPendingKeys(req: Request, res: Response): Promise<void> {
  try {
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    const pendingKeys = await developerService.getPendingKeys(developerEmail);

    res.json({
      success: true,
      data: pendingKeys,
      total: pendingKeys.length,
      message: 'Your keys are pending approval. You will be notified once they are reviewed.'
    });
  } catch (error) {
    logger.error('Failed to get pending keys', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pending keys'
    });
  }
}

/**
 * Get developer activity
 * GET /api/developers/activity
 */
export async function getActivity(req: Request, res: Response): Promise<void> {
  try {
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    const activity = await developerService.getDeveloperActivity(developerEmail);

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    logger.error('Failed to get developer activity', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get activity'
    });
  }
}

/**
 * Update key settings
 * PATCH /api/developers/keys/:keyId
 */
export async function updateKeySettings(req: Request, res: Response): Promise<void> {
  try {
    const { keyId } = req.params;
    const { name, expiresAt } = req.body;
    const developerEmail = req.user?.email || req.headers['x-developer-email'];

    if (!developerEmail) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Developer email required'
      });
      return;
    }

    // Update settings
    await developerService.updateKeySettings(
      keyId,
      developerEmail,
      {
        name,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      }
    );

    logger.info('Developer updated key settings', { keyId, developer: developerEmail });

    res.json({
      success: true,
      message: 'API key settings updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update key settings', { error });

    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        res.status(403).json({
          error: 'Forbidden',
          message: error.message
        });
        return;
      }
      if (error.message.includes('not found')) {
        res.status(404).json({
          error: 'Not Found',
          message: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update key settings'
    });
  }
}
