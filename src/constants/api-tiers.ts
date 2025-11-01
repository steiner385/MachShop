/**
 * API Tier Constants
 *
 * Defines the three-tier API access control system with characteristics,
 * default rate limits, and feature access for each tier.
 *
 * @module constants/api-tiers
 * @see GitHub Issue #74: API Access Control & Security Model
 */

/**
 * API Access Tiers
 */
export enum ApiTier {
  PUBLIC = 'PUBLIC',   // Self-service, limited features
  SDK = 'SDK',         // Approved developers, advanced features
  PRIVATE = 'PRIVATE'  // Internal use, full access
}

/**
 * API Key Status
 */
export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

/**
 * OAuth Token Types
 */
export enum TokenType {
  ACCESS_TOKEN = 'ACCESS_TOKEN',
  REFRESH_TOKEN = 'REFRESH_TOKEN'
}

/**
 * API Key Prefixes - Used for quick identification of key tier
 */
export const API_KEY_PREFIXES = {
  [ApiTier.PUBLIC]: 'pk_live_',
  [ApiTier.SDK]: 'sdk_live_',
  [ApiTier.PRIVATE]: 'pvt_live_',
} as const;

/**
 * Test mode prefixes (for development/testing)
 */
export const API_KEY_TEST_PREFIXES = {
  [ApiTier.PUBLIC]: 'pk_test_',
  [ApiTier.SDK]: 'sdk_test_',
  [ApiTier.PRIVATE]: 'pvt_test_',
} as const;

/**
 * API Key Length (without prefix)
 * Using 32 characters for 256-bit security
 */
export const API_KEY_LENGTH = 32;

/**
 * API Tier Characteristics
 * Defines the features and limitations for each tier
 */
export interface ApiTierCharacteristics {
  tier: ApiTier;
  name: string;
  description: string;
  requiresApproval: boolean;
  defaultScopes: string[];
  maxScopes: number;
  allowsCustomRateLimits: boolean;
  allowsSiteRestriction: boolean;
  defaultExpirationDays: number | null; // null = no expiration
  features: string[];
}

export const API_TIER_CHARACTERISTICS: Record<ApiTier, ApiTierCharacteristics> = {
  [ApiTier.PUBLIC]: {
    tier: ApiTier.PUBLIC,
    name: 'Public API',
    description: 'Self-service API access for basic integrations',
    requiresApproval: false,
    defaultScopes: ['read:basic', 'read:public_data'],
    maxScopes: 5,
    allowsCustomRateLimits: false,
    allowsSiteRestriction: false,
    defaultExpirationDays: 365, // 1 year
    features: [
      'Read-only access to public endpoints',
      'Basic work order information',
      'Equipment status queries',
      'Material availability checks',
      'Standard rate limits'
    ]
  },
  [ApiTier.SDK]: {
    tier: ApiTier.SDK,
    name: 'SDK API',
    description: 'Advanced API access for approved third-party integrations',
    requiresApproval: true,
    defaultScopes: ['read:*', 'write:work_orders', 'write:quality', 'write:materials'],
    maxScopes: 20,
    allowsCustomRateLimits: true,
    allowsSiteRestriction: true,
    defaultExpirationDays: null, // No expiration
    features: [
      'Full read access to all endpoints',
      'Write access to work orders, quality, materials',
      'Webhook subscriptions',
      'Batch operations',
      'Advanced filtering and sorting',
      'Custom rate limits available',
      'Site-level access control'
    ]
  },
  [ApiTier.PRIVATE]: {
    tier: ApiTier.PRIVATE,
    name: 'Private API',
    description: 'Full API access for internal systems and trusted partners',
    requiresApproval: true,
    defaultScopes: ['*'], // All scopes
    maxScopes: 999, // Unlimited
    allowsCustomRateLimits: true,
    allowsSiteRestriction: true,
    defaultExpirationDays: null, // No expiration
    features: [
      'Unlimited API access',
      'Full CRUD operations on all resources',
      'Admin operations',
      'System configuration',
      'Bulk data operations',
      'No rate limiting',
      'Priority support'
    ]
  }
};

/**
 * OAuth Scopes
 * Defines available permission scopes for OAuth clients
 */
export const OAUTH_SCOPES = {
  // Read scopes
  'read:basic': 'Read basic public information',
  'read:public_data': 'Read public data endpoints',
  'read:work_orders': 'Read work order information',
  'read:quality': 'Read quality and inspection data',
  'read:materials': 'Read material and inventory data',
  'read:equipment': 'Read equipment status and data',
  'read:traceability': 'Read traceability and genealogy data',
  'read:personnel': 'Read personnel information',
  'read:documents': 'Read documents and work instructions',
  'read:scheduling': 'Read production schedules',
  'read:routing': 'Read routing and operation data',
  'read:*': 'Read access to all endpoints',

  // Write scopes
  'write:work_orders': 'Create and update work orders',
  'write:quality': 'Create and update quality records',
  'write:materials': 'Create and update material records',
  'write:equipment': 'Update equipment status and data',
  'write:documents': 'Create and update documents',
  'write:scheduling': 'Create and update schedules',
  'write:routing': 'Create and update routings',
  'write:*': 'Write access to all endpoints',

  // Delete scopes
  'delete:work_orders': 'Delete work orders',
  'delete:documents': 'Delete documents',
  'delete:*': 'Delete access to all resources',

  // Admin scopes
  'admin:users': 'Manage users and permissions',
  'admin:api_keys': 'Manage API keys',
  'admin:system': 'System administration',
  'admin:*': 'Full administrative access',

  // Special scopes
  '*': 'Full access to all resources and operations'
} as const;

/**
 * OAuth Scope Hierarchies
 * Defines which scopes automatically grant other scopes
 */
export const OAUTH_SCOPE_HIERARCHIES: Record<string, string[]> = {
  '*': Object.keys(OAUTH_SCOPES), // Full access grants everything
  'read:*': Object.keys(OAUTH_SCOPES).filter(s => s.startsWith('read:')),
  'write:*': Object.keys(OAUTH_SCOPES).filter(s => s.startsWith('write:')),
  'delete:*': Object.keys(OAUTH_SCOPES).filter(s => s.startsWith('delete:')),
  'admin:*': Object.keys(OAUTH_SCOPES).filter(s => s.startsWith('admin:'))
};

/**
 * OAuth Grant Types
 */
export const OAUTH_GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  CLIENT_CREDENTIALS: 'client_credentials',
  REFRESH_TOKEN: 'refresh_token',
  PASSWORD: 'password', // Discouraged, but supported for legacy
} as const;

/**
 * Token Expiration Times (in seconds)
 */
export const TOKEN_EXPIRATION = {
  ACCESS_TOKEN: 3600,        // 1 hour
  REFRESH_TOKEN: 2592000,    // 30 days
  AUTHORIZATION_CODE: 600,    // 10 minutes
  ID_TOKEN: 3600             // 1 hour
} as const;

/**
 * API Key Lifecycle Constants
 */
export const API_KEY_LIFECYCLE = {
  INACTIVE_EXPIRATION_DAYS: 180,  // Expire keys not used in 180 days
  WARNING_DAYS_BEFORE_EXPIRATION: 30, // Warn 30 days before expiration
  MIN_KEY_NAME_LENGTH: 3,
  MAX_KEY_NAME_LENGTH: 100
} as const;

/**
 * Check if a scope is included in a list of granted scopes
 * Handles wildcard scopes and hierarchies
 */
export function hasScope(grantedScopes: string[], requiredScope: string): boolean {
  // Check for exact match
  if (grantedScopes.includes(requiredScope)) {
    return true;
  }

  // Check for wildcard access
  if (grantedScopes.includes('*')) {
    return true;
  }

  // Check for category wildcard (e.g., read:* grants read:work_orders)
  const [category] = requiredScope.split(':');
  if (grantedScopes.includes(`${category}:*`)) {
    return true;
  }

  return false;
}

/**
 * Expand scopes to include all hierarchical scopes
 * e.g., ['read:*'] -> ['read:*', 'read:work_orders', 'read:quality', ...]
 */
export function expandScopes(scopes: string[]): string[] {
  const expanded = new Set<string>(scopes);

  for (const scope of scopes) {
    const hierarchicalScopes = OAUTH_SCOPE_HIERARCHIES[scope];
    if (hierarchicalScopes) {
      hierarchicalScopes.forEach(s => expanded.add(s));
    }
  }

  return Array.from(expanded);
}

/**
 * Validate if scopes are valid and allowed for a given tier
 */
export function validateScopes(scopes: string[], tier: ApiTier): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const characteristics = API_TIER_CHARACTERISTICS[tier];

  // Check if too many scopes
  if (scopes.length > characteristics.maxScopes) {
    errors.push(`Too many scopes. Maximum ${characteristics.maxScopes} scopes allowed for ${tier} tier.`);
  }

  // Check if all scopes are valid
  const validScopes = Object.keys(OAUTH_SCOPES);
  for (const scope of scopes) {
    if (!validScopes.includes(scope)) {
      errors.push(`Invalid scope: ${scope}`);
    }
  }

  // Check tier-specific restrictions
  if (tier === ApiTier.PUBLIC) {
    // Public tier cannot have write or delete scopes
    const restrictedScopes = scopes.filter(s =>
      s.startsWith('write:') || s.startsWith('delete:') || s.startsWith('admin:') || s === '*'
    );
    if (restrictedScopes.length > 0) {
      errors.push(`PUBLIC tier cannot have these scopes: ${restrictedScopes.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
