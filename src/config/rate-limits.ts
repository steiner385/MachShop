/**
 * Rate Limiting Configuration
 *
 * Defines default rate limits for each API tier and provides
 * utilities for rate limit management and calculation.
 *
 * @module config/rate-limits
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { ApiTier } from '../constants/api-tiers';

/**
 * Rate Limit Configuration Interface
 */
export interface RateLimitConfig {
  tier: ApiTier;
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstMultiplier: number; // Allow temporary burst (e.g., 1.5 = 50% burst)
}

/**
 * Default Rate Limits per Tier
 *
 * These are the default rate limits applied to each API tier.
 * Can be overridden per API key or per resource in the database.
 */
export const DEFAULT_RATE_LIMITS: Record<ApiTier, RateLimitConfig> = {
  [ApiTier.PUBLIC]: {
    tier: ApiTier.PUBLIC,
    requestsPerMinute: 100,
    requestsPerHour: 5000,
    requestsPerDay: 100000,
    burstMultiplier: 1.5 // Allow up to 150 requests/min for short bursts
  },
  [ApiTier.SDK]: {
    tier: ApiTier.SDK,
    requestsPerMinute: 500,
    requestsPerHour: 25000,
    requestsPerDay: 500000,
    burstMultiplier: 2.0 // Allow up to 1000 requests/min for short bursts
  },
  [ApiTier.PRIVATE]: {
    tier: ApiTier.PRIVATE,
    requestsPerMinute: 999999, // Effectively unlimited
    requestsPerHour: 999999,
    requestsPerDay: 999999,
    burstMultiplier: 1.0 // No burst needed (already unlimited)
  }
};

/**
 * Resource-Specific Rate Limits
 *
 * Some endpoints may have different rate limits due to:
 * - Heavy computational requirements
 * - Database impact
 * - External API dependencies
 */
export interface ResourceRateLimitConfig {
  resource: string; // Resource identifier (e.g., 'reports', 'exports', 'search')
  limits: Record<ApiTier, Partial<RateLimitConfig>>;
  description: string;
}

export const RESOURCE_RATE_LIMITS: ResourceRateLimitConfig[] = [
  {
    resource: 'reports',
    description: 'Report generation endpoints (computationally expensive)',
    limits: {
      [ApiTier.PUBLIC]: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 500
      },
      [ApiTier.SDK]: {
        requestsPerMinute: 50,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      [ApiTier.PRIVATE]: {
        requestsPerMinute: 999999,
        requestsPerHour: 999999,
        requestsPerDay: 999999
      }
    }
  },
  {
    resource: 'exports',
    description: 'Data export endpoints (large data transfers)',
    limits: {
      [ApiTier.PUBLIC]: {
        requestsPerMinute: 5,
        requestsPerHour: 50,
        requestsPerDay: 200
      },
      [ApiTier.SDK]: {
        requestsPerMinute: 20,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      [ApiTier.PRIVATE]: {
        requestsPerMinute: 999999,
        requestsPerHour: 999999,
        requestsPerDay: 999999
      }
    }
  },
  {
    resource: 'search',
    description: 'Global search endpoints (database intensive)',
    limits: {
      [ApiTier.PUBLIC]: {
        requestsPerMinute: 30,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      [ApiTier.SDK]: {
        requestsPerMinute: 100,
        requestsPerHour: 5000,
        requestsPerDay: 50000
      },
      [ApiTier.PRIVATE]: {
        requestsPerMinute: 999999,
        requestsPerHour: 999999,
        requestsPerDay: 999999
      }
    }
  },
  {
    resource: 'bulk_operations',
    description: 'Bulk create/update/delete operations',
    limits: {
      [ApiTier.PUBLIC]: {
        requestsPerMinute: 5,
        requestsPerHour: 50,
        requestsPerDay: 200
      },
      [ApiTier.SDK]: {
        requestsPerMinute: 30,
        requestsPerHour: 500,
        requestsPerDay: 5000
      },
      [ApiTier.PRIVATE]: {
        requestsPerMinute: 200,
        requestsPerHour: 10000,
        requestsPerDay: 100000
      }
    }
  },
  {
    resource: 'file_uploads',
    description: 'File upload endpoints (bandwidth intensive)',
    limits: {
      [ApiTier.PUBLIC]: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 500
      },
      [ApiTier.SDK]: {
        requestsPerMinute: 50,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      [ApiTier.PRIVATE]: {
        requestsPerMinute: 999999,
        requestsPerHour: 999999,
        requestsPerDay: 999999
      }
    }
  }
];

/**
 * Rate Limit Window Types
 */
export enum RateLimitWindow {
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day'
}

/**
 * Rate Limit Response Headers
 * Standard headers to include in API responses
 */
export const RATE_LIMIT_HEADERS = {
  LIMIT: 'X-RateLimit-Limit',           // Maximum requests allowed in window
  REMAINING: 'X-RateLimit-Remaining',   // Requests remaining in current window
  RESET: 'X-RateLimit-Reset',           // Unix timestamp when window resets
  RETRY_AFTER: 'Retry-After'            // Seconds until request can be retried (429 only)
} as const;

/**
 * Rate Limit Error Messages
 */
export const RATE_LIMIT_ERRORS = {
  EXCEEDED: 'Rate limit exceeded. Please try again later.',
  MINUTE_EXCEEDED: 'Rate limit exceeded: too many requests per minute.',
  HOUR_EXCEEDED: 'Rate limit exceeded: too many requests per hour.',
  DAY_EXCEEDED: 'Rate limit exceeded: too many requests per day.',
  QUOTA_EXCEEDED: 'Monthly quota exceeded. Please upgrade your plan or contact support.'
} as const;

/**
 * Get rate limit configuration for a specific tier and optional resource
 *
 * @param tier - API tier
 * @param resource - Optional specific resource (e.g., 'reports', 'exports')
 * @returns Complete rate limit configuration
 */
export function getRateLimitConfig(tier: ApiTier, resource?: string): RateLimitConfig {
  const baseConfig = DEFAULT_RATE_LIMITS[tier];

  if (!resource) {
    return baseConfig;
  }

  // Check for resource-specific limits
  const resourceConfig = RESOURCE_RATE_LIMITS.find(r => r.resource === resource);
  if (!resourceConfig) {
    return baseConfig;
  }

  const resourceLimits = resourceConfig.limits[tier];
  return {
    ...baseConfig,
    ...resourceLimits
  };
}

/**
 * Calculate remaining time until rate limit window resets
 *
 * @param window - Rate limit window type
 * @param currentTime - Current timestamp
 * @returns Seconds until window resets
 */
export function calculateResetTime(window: RateLimitWindow, currentTime: Date = new Date()): number {
  const now = currentTime.getTime();

  switch (window) {
    case RateLimitWindow.MINUTE:
      const nextMinute = new Date(now);
      nextMinute.setSeconds(0, 0);
      nextMinute.setMinutes(nextMinute.getMinutes() + 1);
      return Math.ceil((nextMinute.getTime() - now) / 1000);

    case RateLimitWindow.HOUR:
      const nextHour = new Date(now);
      nextHour.setMinutes(0, 0, 0);
      nextHour.setHours(nextHour.getHours() + 1);
      return Math.ceil((nextHour.getTime() - now) / 1000);

    case RateLimitWindow.DAY:
      const nextDay = new Date(now);
      nextDay.setHours(0, 0, 0, 0);
      nextDay.setDate(nextDay.getDate() + 1);
      return Math.ceil((nextDay.getTime() - now) / 1000);

    default:
      return 60; // Default to 1 minute
  }
}

/**
 * Format rate limit for display
 *
 * @param limit - Rate limit number
 * @returns Formatted string (e.g., "100/min", "5K/hour", "100K/day")
 */
export function formatRateLimit(limit: number): string {
  if (limit >= 1000000) {
    return `${(limit / 1000000).toFixed(1)}M`;
  }
  if (limit >= 1000) {
    return `${(limit / 1000).toFixed(1)}K`;
  }
  return limit.toString();
}

/**
 * Check if a tier allows custom rate limits
 *
 * @param tier - API tier
 * @returns True if custom rate limits are allowed
 */
export function allowsCustomRateLimits(tier: ApiTier): boolean {
  return tier === ApiTier.SDK || tier === ApiTier.PRIVATE;
}

/**
 * Validate custom rate limit configuration
 *
 * @param config - Custom rate limit configuration
 * @returns Validation result with errors if any
 */
export function validateRateLimitConfig(config: Partial<RateLimitConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.requestsPerMinute !== undefined) {
    if (config.requestsPerMinute < 1) {
      errors.push('requestsPerMinute must be at least 1');
    }
    if (config.requestsPerMinute > 10000) {
      errors.push('requestsPerMinute cannot exceed 10,000');
    }
  }

  if (config.requestsPerHour !== undefined) {
    if (config.requestsPerHour < 1) {
      errors.push('requestsPerHour must be at least 1');
    }
    if (config.requestsPerHour > 100000) {
      errors.push('requestsPerHour cannot exceed 100,000');
    }
  }

  if (config.requestsPerDay !== undefined) {
    if (config.requestsPerDay < 1) {
      errors.push('requestsPerDay must be at least 1');
    }
    if (config.requestsPerDay > 1000000) {
      errors.push('requestsPerDay cannot exceed 1,000,000');
    }
  }

  if (config.burstMultiplier !== undefined) {
    if (config.burstMultiplier < 1.0) {
      errors.push('burstMultiplier must be at least 1.0');
    }
    if (config.burstMultiplier > 5.0) {
      errors.push('burstMultiplier cannot exceed 5.0');
    }
  }

  // Logical consistency checks
  if (config.requestsPerMinute && config.requestsPerHour) {
    if (config.requestsPerMinute * 60 > config.requestsPerHour) {
      errors.push('requestsPerMinute * 60 cannot exceed requestsPerHour');
    }
  }

  if (config.requestsPerHour && config.requestsPerDay) {
    if (config.requestsPerHour * 24 > config.requestsPerDay) {
      errors.push('requestsPerHour * 24 cannot exceed requestsPerDay');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Redis Key Patterns for Rate Limiting
 *
 * Used by the rate limiter service to store rate limit counters in Redis
 */
export const REDIS_KEY_PATTERNS = {
  RATE_LIMIT: (apiKeyId: string, window: RateLimitWindow) => `ratelimit:${apiKeyId}:${window}`,
  QUOTA: (apiKeyId: string, period: 'monthly' | 'daily') => `quota:${apiKeyId}:${period}`,
  RESOURCE_LIMIT: (apiKeyId: string, resource: string, window: RateLimitWindow) =>
    `ratelimit:${apiKeyId}:${resource}:${window}`
} as const;

/**
 * Rate Limiter Algorithm Configuration
 * Using Token Bucket algorithm with Redis
 */
export const RATE_LIMITER_CONFIG = {
  ALGORITHM: 'token-bucket',
  REDIS_KEY_PREFIX: 'api:ratelimit:',
  BLOCK_DURATION: 0, // Don't block, just enforce limits per window
  PENALTY_DURATION: 0, // No penalty, use standard rate limiting
  SKIP_FAILED_REQUESTS: false, // Count all requests
  SKIP_SUCCESSFUL_REQUESTS: false // Count all requests
} as const;
