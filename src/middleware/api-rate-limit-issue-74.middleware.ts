/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * Rate Limiting Middleware
 *
 * Handles:
 * - Check rate limits for authenticated API key
 * - Return 429 Too Many Requests when exceeded
 * - Add rate limit headers to response
 * - Track quota usage
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimitService } from '../services/RateLimitService';

/**
 * Rate Limit Check Middleware
 * Applied after API authentication
 */
export const checkRateLimit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Only check rate limits for authenticated requests
  if (!req.apiAuth) {
    return next();
  }

  try {
    const { allowed, usage, headers } = await rateLimitService.checkRateLimit(req.apiAuth.apiKeyId);

    // Add rate limit headers to response
    res.set(headers as any);

    if (!allowed) {
      // Rate limit exceeded
      res.status(429).json({
        error: 'Rate limit exceeded',
        usage,
        retryAfter: headers['RateLimit-Reset'],
        requestId: req.requestId,
      });
      return;
    }

    // Store usage info in request for logging
    (req as any).rateLimit = {
      allowed: true,
      usage,
    };

    next();
  } catch (error) {
    console.error(`Rate limit check error for request ${req.requestId}:`, error);
    // Don't fail the request on rate limit service errors
    next();
  }
};

/**
 * Create rate limit config for API key (admin endpoint)
 */
export const createDefaultRateLimit = async (
  apiKeyId: string,
  config?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
    burstSize?: number;
  },
): Promise<any> => {
  try {
    // Check if already exists
    const existing = await rateLimitService.getRateLimitConfig(apiKeyId);

    if (existing) {
      return existing;
    }

    return await rateLimitService.createRateLimitConfig(apiKeyId, config);
  } catch (error) {
    console.error(`Error creating rate limit config for key ${apiKeyId}:`, error);
    throw error;
  }
};
