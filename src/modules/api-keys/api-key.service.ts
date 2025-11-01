/**
 * API Key Service
 *
 * Manages the complete lifecycle of API keys including:
 * - Generation of cryptographically secure keys
 * - Key validation and authentication
 * - Key management (create, revoke, expire)
 * - Usage tracking and analytics
 *
 * @module modules/api-keys/api-key.service
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { logger } from '../../utils/logger';
import {
  ApiTier,
  ApiKeyStatus,
  API_KEY_PREFIXES,
  API_KEY_TEST_PREFIXES,
  API_KEY_LENGTH,
  API_TIER_CHARACTERISTICS,
  API_KEY_LIFECYCLE,
  validateScopes
} from '../../constants/api-tiers';

const prisma = new PrismaClient();

/**
 * Interface for API Key creation
 */
export interface CreateApiKeyData {
  name: string;
  tier: ApiTier;
  scopes: string[];
  createdBy: string;
  developerName?: string;
  developerEmail?: string;
  companyId?: string;
  siteId?: string;
  pluginId?: string;
  expiresAt?: Date;
  customRateLimit?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
}

/**
 * Interface for API Key validation result
 */
export interface ValidatedApiKey {
  id: string;
  name: string;
  tier: ApiTier;
  scopes: string[];
  companyId?: string;
  siteId?: string;
  rateLimit?: any;
  lastUsedAt?: Date;
}

/**
 * Interface for API Key usage statistics
 */
export interface ApiKeyUsageStats {
  apiKeyId: string;
  totalRequests: number;
  requestsByStatusCode: Record<number, number>;
  requestsByEndpoint: Record<string, number>;
  averageResponseTime: number;
  errorRate: number;
  lastUsed: Date | null;
  periodStart: Date;
  periodEnd: Date;
}

/**
 * API Key Service Class
 */
export class ApiKeyService {
  private readonly BCRYPT_ROUNDS = 10;
  private readonly isTestMode: boolean;

  constructor() {
    this.isTestMode = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';
  }

  /**
   * Generate a cryptographically secure API key
   *
   * Format: {prefix}{random_string}
   * Example: pk_live_1234567890abcdefghijklmnopqrstuv
   *
   * @param tier - API tier (PUBLIC, SDK, PRIVATE)
   * @returns Generated API key with prefix
   */
  generateApiKey(tier: ApiTier): string {
    // Select prefix based on tier and environment
    const prefixes = this.isTestMode ? API_KEY_TEST_PREFIXES : API_KEY_PREFIXES;
    const prefix = prefixes[tier];

    // Generate cryptographically secure random bytes
    const randomBytes = crypto.randomBytes(API_KEY_LENGTH);

    // Convert to base64url (URL-safe base64)
    const randomString = randomBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
      .substring(0, API_KEY_LENGTH);

    return `${prefix}${randomString}`;
  }

  /**
   * Hash an API key using bcrypt
   *
   * @param apiKey - Plain text API key
   * @returns Bcrypt hash of the key
   */
  async hashApiKey(apiKey: string): Promise<string> {
    return bcrypt.hash(apiKey, this.BCRYPT_ROUNDS);
  }

  /**
   * Validate an API key and return key details if valid
   *
   * @param providedKey - API key provided by the client
   * @returns Validated API key details or null if invalid
   */
  async validateApiKey(providedKey: string): Promise<ValidatedApiKey | null> {
    try {
      // Extract prefix to quickly lookup the key
      const prefixMatch = providedKey.match(/^([a-z]+_[a-z]+_)/);
      if (!prefixMatch) {
        logger.warn('Invalid API key format - no valid prefix found');
        return null;
      }

      const prefix = prefixMatch[1];

      // Look up key by prefix
      const apiKey = await prisma.apiKey.findUnique({
        where: { keyPrefix: prefix }
      });

      if (!apiKey) {
        logger.warn(`API key not found for prefix: ${prefix}`);
        return null;
      }

      // Verify key status
      if (apiKey.status !== ApiKeyStatus.ACTIVE) {
        logger.warn(`API key is not active: ${apiKey.status}`, { keyId: apiKey.id });
        return null;
      }

      // Check expiration
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        logger.warn('API key has expired', { keyId: apiKey.id });
        // Update status to EXPIRED
        await prisma.apiKey.update({
          where: { id: apiKey.id },
          data: { status: ApiKeyStatus.EXPIRED }
        });
        return null;
      }

      // Verify key hash
      const isValid = await bcrypt.compare(providedKey, apiKey.keyHash);
      if (!isValid) {
        logger.warn('API key hash verification failed', { keyId: apiKey.id });
        return null;
      }

      // Update last used timestamp (async, don't wait)
      prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() }
      }).catch(err => {
        logger.error('Failed to update API key lastUsedAt', { error: err, keyId: apiKey.id });
      });

      // Return validated key details
      return {
        id: apiKey.id,
        name: apiKey.name,
        tier: apiKey.tier as ApiTier,
        scopes: apiKey.scopes,
        companyId: apiKey.companyId ?? undefined,
        siteId: apiKey.siteId ?? undefined,
        rateLimit: apiKey.rateLimit,
        lastUsedAt: apiKey.lastUsedAt ?? undefined
      };
    } catch (error) {
      logger.error('Error validating API key', { error });
      return null;
    }
  }

  /**
   * Create a new API key
   *
   * @param data - API key creation data
   * @returns Created API key (plaintext key only returned once!)
   */
  async createApiKey(data: CreateApiKeyData): Promise<{ apiKey: string; keyId: string; keyPrefix: string }> {
    // Validate key name
    if (data.name.length < API_KEY_LIFECYCLE.MIN_KEY_NAME_LENGTH ||
        data.name.length > API_KEY_LIFECYCLE.MAX_KEY_NAME_LENGTH) {
      throw new Error(
        `Key name must be between ${API_KEY_LIFECYCLE.MIN_KEY_NAME_LENGTH} and ${API_KEY_LIFECYCLE.MAX_KEY_NAME_LENGTH} characters`
      );
    }

    // Validate scopes
    const scopeValidation = validateScopes(data.scopes, data.tier);
    if (!scopeValidation.valid) {
      throw new Error(`Invalid scopes: ${scopeValidation.errors.join(', ')}`);
    }

    // Get tier characteristics
    const characteristics = API_TIER_CHARACTERISTICS[data.tier];

    // Determine status based on approval requirements
    const status = characteristics.requiresApproval
      ? ApiKeyStatus.PENDING_APPROVAL
      : ApiKeyStatus.ACTIVE;

    // Calculate expiration date
    let expiresAt: Date | null = data.expiresAt || null;
    if (!expiresAt && characteristics.defaultExpirationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + characteristics.defaultExpirationDays);
    }

    // Generate API key
    const apiKey = this.generateApiKey(data.tier);

    // Extract prefix
    const prefixMatch = apiKey.match(/^([a-z]+_[a-z]+_)/);
    if (!prefixMatch) {
      throw new Error('Failed to extract key prefix');
    }
    const keyPrefix = prefixMatch[1];

    // Hash the key
    const keyHash = await this.hashApiKey(apiKey);

    // Create database record
    const createdKey = await prisma.apiKey.create({
      data: {
        keyPrefix,
        keyHash,
        name: data.name,
        tier: data.tier,
        status,
        scopes: data.scopes,
        createdBy: data.createdBy,
        developerName: data.developerName,
        developerEmail: data.developerEmail,
        companyId: data.companyId,
        siteId: data.siteId,
        pluginId: data.pluginId,
        expiresAt,
        rateLimit: data.customRateLimit || null
      }
    });

    logger.info('API key created', {
      keyId: createdKey.id,
      tier: data.tier,
      status,
      createdBy: data.createdBy
    });

    // Return the plaintext key (ONLY TIME IT'S AVAILABLE!)
    return {
      apiKey,
      keyId: createdKey.id,
      keyPrefix
    };
  }

  /**
   * Revoke an API key
   *
   * @param keyId - API key ID
   * @param revokedBy - User ID who revoked the key
   */
  async revokeApiKey(keyId: string, revokedBy: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: ApiKeyStatus.REVOKED,
        updatedAt: new Date()
      }
    });

    logger.info('API key revoked', { keyId, revokedBy });
  }

  /**
   * Suspend an API key (can be reactivated later)
   *
   * @param keyId - API key ID
   * @param suspendedBy - User ID who suspended the key
   */
  async suspendApiKey(keyId: string, suspendedBy: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: ApiKeyStatus.SUSPENDED,
        updatedAt: new Date()
      }
    });

    logger.info('API key suspended', { keyId, suspendedBy });
  }

  /**
   * Reactivate a suspended API key
   *
   * @param keyId - API key ID
   * @param reactivatedBy - User ID who reactivated the key
   */
  async reactivateApiKey(keyId: string, reactivatedBy: string): Promise<void> {
    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    if (apiKey.status !== ApiKeyStatus.SUSPENDED) {
      throw new Error('Only suspended keys can be reactivated');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: ApiKeyStatus.ACTIVE,
        updatedAt: new Date()
      }
    });

    logger.info('API key reactivated', { keyId, reactivatedBy });
  }

  /**
   * Approve a pending SDK/PRIVATE tier API key
   *
   * @param keyId - API key ID
   * @param approvedBy - User ID who approved the key
   */
  async approveApiKey(keyId: string, approvedBy: string): Promise<void> {
    const apiKey = await prisma.apiKey.findUnique({ where: { id: keyId } });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    if (apiKey.status !== ApiKeyStatus.PENDING_APPROVAL) {
      throw new Error('Only pending keys can be approved');
    }

    await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: ApiKeyStatus.ACTIVE,
        approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date()
      }
    });

    logger.info('API key approved', { keyId, approvedBy });
  }

  /**
   * Expire inactive API keys
   * Keys that haven't been used in the specified number of days will be expired
   *
   * @param inactiveDays - Number of days of inactivity before expiration (default: 180)
   * @returns Number of keys expired
   */
  async expireInactiveKeys(inactiveDays: number = API_KEY_LIFECYCLE.INACTIVE_EXPIRATION_DAYS): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const result = await prisma.apiKey.updateMany({
      where: {
        status: ApiKeyStatus.ACTIVE,
        OR: [
          { lastUsedAt: { lt: cutoffDate } },
          { lastUsedAt: null, createdAt: { lt: cutoffDate } }
        ]
      },
      data: {
        status: ApiKeyStatus.EXPIRED,
        updatedAt: new Date()
      }
    });

    logger.info('Expired inactive API keys', { count: result.count, inactiveDays });

    return result.count;
  }

  /**
   * Get usage statistics for an API key
   *
   * @param apiKeyId - API key ID
   * @param periodStart - Start of the period
   * @param periodEnd - End of the period
   * @returns Usage statistics
   */
  async getUsageStats(
    apiKeyId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<ApiKeyUsageStats> {
    const logs = await prisma.apiUsageLog.findMany({
      where: {
        apiKeyId,
        timestamp: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    const totalRequests = logs.length;
    const requestsByStatusCode: Record<number, number> = {};
    const requestsByEndpoint: Record<string, number> = {};
    let totalResponseTime = 0;
    let errorCount = 0;

    for (const log of logs) {
      // Count by status code
      requestsByStatusCode[log.statusCode] = (requestsByStatusCode[log.statusCode] || 0) + 1;

      // Count by endpoint
      requestsByEndpoint[log.endpoint] = (requestsByEndpoint[log.endpoint] || 0) + 1;

      // Sum response times
      totalResponseTime += log.responseTime;

      // Count errors (4xx and 5xx)
      if (log.statusCode >= 400) {
        errorCount++;
      }
    }

    const lastLog = logs.length > 0 ? logs[logs.length - 1] : null;

    return {
      apiKeyId,
      totalRequests,
      requestsByStatusCode,
      requestsByEndpoint,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? errorCount / totalRequests : 0,
      lastUsed: lastLog?.timestamp || null,
      periodStart,
      periodEnd
    };
  }

  /**
   * List all API keys (admin function)
   *
   * @param filters - Optional filters
   * @returns List of API keys
   */
  async listApiKeys(filters?: {
    tier?: ApiTier;
    status?: ApiKeyStatus;
    createdBy?: string;
    siteId?: string;
  }) {
    return prisma.apiKey.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        tier: true,
        status: true,
        scopes: true,
        companyId: true,
        siteId: true,
        expiresAt: true,
        lastUsedAt: true,
        createdBy: true,
        createdAt: true,
        approvedBy: true,
        approvedAt: true,
        developerName: true,
        developerEmail: true
      }
    });
  }

  /**
   * Get API key details by ID
   *
   * @param keyId - API key ID
   * @returns API key details (without hash)
   */
  async getApiKeyById(keyId: string) {
    return prisma.apiKey.findUnique({
      where: { id: keyId },
      select: {
        id: true,
        keyPrefix: true,
        name: true,
        tier: true,
        status: true,
        scopes: true,
        companyId: true,
        siteId: true,
        pluginId: true,
        rateLimit: true,
        quotas: true,
        expiresAt: true,
        lastUsedAt: true,
        createdBy: true,
        createdAt: true,
        approvedBy: true,
        approvedAt: true,
        developerName: true,
        developerEmail: true,
        updatedAt: true
      }
    });
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
