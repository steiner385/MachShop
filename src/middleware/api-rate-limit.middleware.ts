/**
 * API Rate Limit Middleware
 *
 * Enforces rate limits on API requests using Redis-backed rate limiter.
 * Sets standard rate limit headers and returns 429 if limits exceeded.
 *
 * @module middleware/api-rate-limit
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { Request, Response, NextFunction } from 'express';
import { rateLimiterService } from '../modules/rate-limiting/rate-limiter.service';
import { logger } from '../utils/logger';
import { ApiTier } from '../constants/api-tiers';
import { RATE_LIMIT_HEADERS, RATE_LIMIT_ERRORS } from '../config/rate-limits';

/**
 * Extract resource identifier from request path
 * Used for resource-specific rate limiting
 *
 * @param path - Request path
 * @returns Resource identifier or undefined
 */
function extractResource(path: string): string | undefined {
  // Map paths to resource identifiers
  if (path.includes('/reports')) return 'reports';
  if (path.includes('/export')) return 'exports';
  if (path.includes('/search')) return 'search';
  if (path.includes('/bulk')) return 'bulk_operations';
  if (path.includes('/upload')) return 'file_uploads';

  return undefined;
}

/**
 * API Rate Limit Middleware
 *
 * Checks rate limits for the authenticated API key and returns 429 if exceeded.
 * Sets X-RateLimit-* headers on all responses.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export const apiRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip rate limiting for health checks
    if (req.path === '/health') {
      return next();
    }

    // Require authenticated API key
    if (!req.apiKey) {
      logger.warn('Rate limit middleware called without API key', {
        path: req.path
      });
      return next(); // Let auth middleware handle this
    }

    const { id: apiKeyId, tier } = req.apiKey;
    const resource = extractResource(req.path);

    // Check rate limits
    const rateLimitStatus = await rateLimiterService.checkRateLimit(
      apiKeyId,
      tier as ApiTier,
      resource
    );

    // Use the most restrictive limit (if any window is exceeded)
    let isAllowed = true;
    let limitingWindow: 'minute' | 'hour' | 'day' | null = null;
    let retryAfter = 0;

    if (!rateLimitStatus.minute.allowed) {
      isAllowed = false;
      limitingWindow = 'minute';
      retryAfter = rateLimitStatus.minute.retryAfter || 60;
    } else if (!rateLimitStatus.hour.allowed) {
      isAllowed = false;
      limitingWindow = 'hour';
      retryAfter = rateLimitStatus.hour.retryAfter || 3600;
    } else if (!rateLimitStatus.day.allowed) {
      isAllowed = false;
      limitingWindow = 'day';
      retryAfter = rateLimitStatus.day.retryAfter || 86400;
    }

    // Set rate limit headers (using minute window for headers)
    res.setHeader(RATE_LIMIT_HEADERS.LIMIT, rateLimitStatus.minute.limit);
    res.setHeader(RATE_LIMIT_HEADERS.REMAINING, rateLimitStatus.minute.remaining);
    res.setHeader(RATE_LIMIT_HEADERS.RESET, rateLimitStatus.minute.resetTime);

    // If rate limit exceeded, return 429
    if (!isAllowed) {
      res.setHeader(RATE_LIMIT_HEADERS.RETRY_AFTER, retryAfter);

      logger.warn('Rate limit exceeded', {
        apiKeyId,
        tier,
        window: limitingWindow,
        endpoint: req.path,
        ip: req.ip
      });

      const errorMessage = limitingWindow === 'minute'
        ? RATE_LIMIT_ERRORS.MINUTE_EXCEEDED
        : limitingWindow === 'hour'
          ? RATE_LIMIT_ERRORS.HOUR_EXCEEDED
          : RATE_LIMIT_ERRORS.DAY_EXCEEDED;

      res.status(429).json({
        error: 'Too Many Requests',
        message: errorMessage,
        retryAfter,
        rateLimits: {
          minute: {
            limit: rateLimitStatus.minute.limit,
            remaining: rateLimitStatus.minute.remaining,
            resetTime: rateLimitStatus.minute.resetTime
          },
          hour: {
            limit: rateLimitStatus.hour.limit,
            remaining: rateLimitStatus.hour.remaining,
            resetTime: rateLimitStatus.hour.resetTime
          },
          day: {
            limit: rateLimitStatus.day.limit,
            remaining: rateLimitStatus.day.remaining,
            resetTime: rateLimitStatus.day.resetTime
          }
        }
      });
      return;
    }

    // Rate limit check passed, continue
    next();
  } catch (error) {
    logger.error('Error in rate limit middleware', {
      error,
      path: req.path,
      apiKeyId: req.apiKey?.id
    });

    // Fail open - allow request to proceed if rate limiter fails
    next();
  }
};

/**
 * Get rate limit status without enforcing
 * Useful for displaying quota information to users
 *
 * @param req - Express request
 * @param res - Express response
 */
export const getRateLimitStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.apiKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key required to check rate limits.'
      });
      return;
    }

    const { id: apiKeyId, tier } = req.apiKey;
    const resource = req.query.resource as string | undefined;

    const quota = await rateLimiterService.getRemainingQuota(
      apiKeyId,
      tier as ApiTier,
      resource
    );

    res.json({
      apiKeyId,
      tier,
      resource: resource || 'default',
      rateLimits: {
        minute: {
          limit: quota.minute.limit,
          remaining: quota.minute.remaining,
          resetTime: quota.minute.resetTime,
          resetAt: new Date(quota.minute.resetTime * 1000).toISOString()
        },
        hour: {
          limit: quota.hour.limit,
          remaining: quota.hour.remaining,
          resetTime: quota.hour.resetTime,
          resetAt: new Date(quota.hour.resetTime * 1000).toISOString()
        },
        day: {
          limit: quota.day.limit,
          remaining: quota.day.remaining,
          resetTime: quota.day.resetTime,
          resetAt: new Date(quota.day.resetTime * 1000).toISOString()
        }
      }
    });
  } catch (error) {
    logger.error('Error getting rate limit status', {
      error,
      apiKeyId: req.apiKey?.id
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve rate limit status.'
    });
  }
};
