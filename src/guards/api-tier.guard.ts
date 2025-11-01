/**
 * API Tier Guard (Express Middleware)
 *
 * Enforces API tier requirements on endpoints.
 * Prevents lower-tier API keys from accessing higher-tier endpoints.
 *
 * Tier hierarchy (highest to lowest):
 * PRIVATE (internal use) > SDK (integrators) > PUBLIC (external)
 *
 * @middleware
 * @example
 * // In your Express route
 * app.get('/endpoint', apiTierGuard(ApiTier.SDK), (req, res) => { ... })
 *
 * @module guards/api-tier
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response, NextFunction } from 'express';
import { ApiTier } from '../constants/api-tiers';
import { API_TIER_KEY, REQUIRED_SCOPES_KEY, getMetadata } from '../decorators/api-tier.decorator';
import { isScopeAllowed } from '../constants/api-tiers';
import { logger } from '../utils/logger';

/**
 * Tier hierarchy for access control
 * Higher index = higher tier (can access lower tiers)
 */
const TIER_HIERARCHY: Record<ApiTier, number> = {
  PUBLIC: 0,
  SDK: 1,
  PRIVATE: 2
};

/**
 * Express middleware to enforce API tier requirements
 *
 * Usage: app.get('/endpoint', apiTierGuard(ApiTier.SDK), handler)
 *
 * @param requiredTier - Required API tier for this endpoint
 * @param requiredScopes - Optional required scopes
 * @returns Express middleware function
 */
export function apiTierGuard(requiredTier: ApiTier, requiredScopes?: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get API key from request context (should be set by authentication middleware)
    const apiKey = req.apiKey;

    // Check if API key exists
    if (!apiKey) {
      logger.warn('API Tier Guard: No API key found in request');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'API key required to access this endpoint'
      });
    }

    // Check tier requirement
    const apiKeyTierLevel = TIER_HIERARCHY[apiKey.tier as ApiTier];
    const requiredTierLevel = TIER_HIERARCHY[requiredTier];

    if (apiKeyTierLevel < requiredTierLevel) {
      logger.warn('API Tier Guard: Insufficient tier', {
        apiKeyTier: apiKey.tier,
        requiredTier,
        apiKeyId: apiKey.id
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `This endpoint requires ${requiredTier} tier access (your key has ${apiKey.tier} tier access)`
      });
    }

    // Check scope requirement if specified
    const scopesToCheck = requiredScopes || [];
    if (scopesToCheck.length > 0) {
      const hasAllRequiredScopes = scopesToCheck.every(scope =>
        isScopeAllowed(apiKey.scopes, scope)
      );

      if (!hasAllRequiredScopes) {
        const missingScopes = scopesToCheck.filter(
          scope => !isScopeAllowed(apiKey.scopes, scope)
        );

        logger.warn('API Tier Guard: Missing required scopes', {
          requiredScopes: scopesToCheck,
          missingScopes,
          apiKeyId: apiKey.id
        });

        return res.status(403).json({
          error: 'Forbidden',
          message: `Missing required scopes: ${missingScopes.join(', ')}`
        });
      }
    }

    next();
  };
}

/**
 * Scope Guard (Express Middleware)
 *
 * Enforces scope requirements independently of tier
 *
 * Usage: app.post('/sensitive', scopeGuard(['work-orders:write']), handler)
 *
 * @param requiredScopes - Array of required scopes
 * @returns Express middleware function
 */
export function scopeGuard(requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If no scopes required, allow access
    if (!requiredScopes || requiredScopes.length === 0) {
      return next();
    }

    // Get API key from context
    const apiKey = req.apiKey;

    // Check if API key exists
    if (!apiKey) {
      logger.warn('Scope Guard: No API key found in request');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'API key required'
      });
    }

    // Check if API key has required scopes
    const hasAllRequiredScopes = requiredScopes.every(scope =>
      isScopeAllowed(apiKey.scopes, scope)
    );

    if (!hasAllRequiredScopes) {
      const missingScopes = requiredScopes.filter(
        scope => !isScopeAllowed(apiKey.scopes, scope)
      );

      logger.warn('Scope Guard: Missing required scopes', {
        requiredScopes,
        missingScopes,
        apiKeyTier: apiKey.tier,
        apiKeyId: apiKey.id
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: `This operation requires scopes: ${missingScopes.join(', ')}`
      });
    }

    next();
  };
}
