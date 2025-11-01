/**
 * API Tier Decorator
 *
 * Marks endpoints with their required API tier classification (PUBLIC, SDK, PRIVATE)
 * Stores metadata about tier requirements for middleware/guard verification
 *
 * @module decorators/api-tier
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { ApiTier } from '../constants/api-tiers';

export const API_TIER_KEY = Symbol('api_tier');
export const REQUIRED_SCOPES_KEY = Symbol('required_scopes');

/**
 * Decorator metadata interface
 */
interface DecoratorMetadata {
  tier?: ApiTier;
  scopes?: string[];
}

/**
 * Store metadata on route handlers
 * This is used with Express middleware to enforce tier-based access control
 *
 * @param target - The target object (route handler)
 * @param key - The property key
 * @param value - The metadata value
 */
function setMetadata(target: any, key: symbol, value: any): void {
  if (!target.__metadata) {
    target.__metadata = {};
  }
  target.__metadata[key] = value;
}

/**
 * Retrieve metadata from route handlers
 */
export function getMetadata(target: any, key: symbol): any {
  return target.__metadata?.[key];
}

/**
 * Decorator to mark an endpoint with its required API tier
 *
 * Usage:
 * app.get('/public', ApiTier('PUBLIC'), (req, res) => { ... })
 *
 * @param tier - Required API tier (PUBLIC, SDK, or PRIVATE)
 * @returns Decorator function or middleware
 */
export function ApiTierDecorator(tier: ApiTier) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    setMetadata(descriptor.value, API_TIER_KEY, tier);
    return descriptor;
  };
}

/**
 * Decorator to require specific scopes
 *
 * Usage:
 * app.post('/sensitive', RequireScopes(['work-orders:write']), (req, res) => { ... })
 *
 * @param scopes - Array of required scopes
 * @returns Decorator function or middleware
 */
export function RequireScopes(scopes: string[]) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    setMetadata(descriptor.value, REQUIRED_SCOPES_KEY, scopes);
    return descriptor;
  };
}

// Convenience aliases
export const PublicApi = () => ApiTierDecorator(ApiTier.PUBLIC);
export const SdkApi = () => ApiTierDecorator(ApiTier.SDK);
export const PrivateApi = () => ApiTierDecorator(ApiTier.PRIVATE);
