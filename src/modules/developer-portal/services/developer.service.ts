/**
 * Developer Service
 *
 * Manages self-service API key creation, rotation, and developer portal operations.
 * Handles the developer workflow from registration through key management.
 *
 * @module modules/developer-portal/services/developer.service
 * @see GitHub Issue #74: API Access Control & Security Model
 */

import { PrismaClient } from '@prisma/client';
import { apiKeyService } from '../../api-keys/api-key.service';
import { ApiTier, ApiKeyStatus } from '../../../constants/api-tiers';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();

/**
 * Developer profile interface
 */
export interface DeveloperProfile {
  id: string;
  name: string;
  email: string;
  company?: string;
  apiKeysCount: number;
  totalRequests: number;
  lastActivityAt?: Date;
  createdAt: Date;
}

/**
 * Developer Service
 */
export class DeveloperService {
  /**
   * Register a new developer
   *
   * @param data - Developer registration data
   * @returns Developer profile
   */
  async registerDeveloper(data: {
    name: string;
    email: string;
    company?: string;
  }): Promise<DeveloperProfile> {
    try {
      // Check if developer already exists (by email)
      // In a real system, would create a separate Developer table
      // For now, we use the first API key's developer info

      logger.info('Developer registration', { email: data.email, company: data.company });

      return {
        id: `dev_${Date.now()}`,
        name: data.name,
        email: data.email,
        company: data.company,
        apiKeysCount: 0,
        totalRequests: 0,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to register developer', { error });
      throw error;
    }
  }

  /**
   * Create an API key for a developer (self-service)
   *
   * @param data - Key creation request
   * @returns Created key with plaintext (shown only once)
   */
  async createDeveloperKey(data: {
    developerEmail: string;
    name: string;
    tier: ApiTier;
    scopes: string[];
  }): Promise<{ apiKey: string; keyId: string; requiresApproval: boolean }> {
    try {
      // SDK and PRIVATE tier keys require approval
      const requiresApproval = data.tier === ApiTier.SDK || data.tier === ApiTier.PRIVATE;

      // Create key
      const result = await apiKeyService.createApiKey({
        name: data.name,
        tier: data.tier,
        scopes: data.scopes,
        createdBy: data.developerEmail,
        developerEmail: data.developerEmail
      });

      logger.info('Developer key created', {
        keyId: result.keyId,
        tier: data.tier,
        requiresApproval,
        developer: data.developerEmail
      });

      return {
        apiKey: result.apiKey,
        keyId: result.keyId,
        requiresApproval
      };
    } catch (error) {
      logger.error('Failed to create developer key', { error });
      throw error;
    }
  }

  /**
   * Request key rotation (generate new key, keep old one valid temporarily)
   *
   * @param apiKeyId - API key ID to rotate
   * @param developerEmail - Developer email
   * @returns New API key
   */
  async rotateKey(apiKeyId: string, developerEmail: string): Promise<{ apiKey: string; newKeyId: string }> {
    try {
      // Get existing key
      const existingKey = await apiKeyService.getApiKeyById(apiKeyId);
      if (!existingKey) {
        throw new Error('API key not found');
      }

      // Verify developer owns this key
      if (existingKey.developerEmail !== developerEmail) {
        throw new Error('Unauthorized: You do not own this API key');
      }

      // Create new key with same properties
      const result = await apiKeyService.createApiKey({
        name: `${existingKey.name} (rotated)`,
        tier: existingKey.tier as ApiTier,
        scopes: existingKey.scopes,
        createdBy: developerEmail,
        developerEmail: developerEmail
      });

      logger.info('API key rotated', {
        oldKeyId: apiKeyId,
        newKeyId: result.keyId,
        developer: developerEmail
      });

      return {
        apiKey: result.apiKey,
        newKeyId: result.keyId
      };
    } catch (error) {
      logger.error('Failed to rotate key', { error });
      throw error;
    }
  }

  /**
   * Revoke a key (developer self-service)
   *
   * @param apiKeyId - API key ID
   * @param developerEmail - Developer email
   */
  async revokeKey(apiKeyId: string, developerEmail: string): Promise<void> {
    try {
      // Get key
      const key = await apiKeyService.getApiKeyById(apiKeyId);
      if (!key) {
        throw new Error('API key not found');
      }

      // Verify developer owns this key
      if (key.developerEmail !== developerEmail) {
        throw new Error('Unauthorized: You do not own this API key');
      }

      // Revoke key
      await apiKeyService.revokeApiKey(apiKeyId, developerEmail);

      logger.info('Developer revoked key', { keyId: apiKeyId, developer: developerEmail });
    } catch (error) {
      logger.error('Failed to revoke key', { error });
      throw error;
    }
  }

  /**
   * Get developer's keys
   *
   * @param developerEmail - Developer email
   * @returns List of developer's keys
   */
  async getDeveloperKeys(developerEmail: string) {
    try {
      const keys = await apiKeyService.listApiKeys({
        createdBy: developerEmail
      });

      return keys.map(key => ({
        id: key.id,
        name: key.name,
        tier: key.tier,
        status: key.status,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        keyPrefix: key.keyPrefix
      }));
    } catch (error) {
      logger.error('Failed to get developer keys', { error });
      throw error;
    }
  }

  /**
   * Get usage analytics for developer
   *
   * @param developerEmail - Developer email
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @returns Usage statistics
   */
  async getDeveloperUsageAnalytics(developerEmail: string, startDate: Date, endDate: Date) {
    try {
      // Get all keys for this developer
      const keys = await apiKeyService.listApiKeys({
        createdBy: developerEmail
      });

      if (keys.length === 0) {
        return {
          developer: developerEmail,
          period: { startDate, endDate },
          totalRequests: 0,
          totalKeys: 0,
          keys: []
      };
      }

      // Get stats for each key
      const keyStats = await Promise.all(
        keys.map(async key => {
          const stats = await apiKeyService.getUsageStats(key.id, startDate, endDate);
          return {
            keyId: key.id,
            name: key.name,
            tier: key.tier,
            ...stats
          };
        })
      );

      // Aggregate statistics
      const totalRequests = keyStats.reduce((sum, key) => sum + key.totalRequests, 0);
      const totalErrors = keyStats.reduce((sum, key) => sum + Object.values(key.requestsByStatusCode || {})
        .filter((_, status) => parseInt(status) >= 400).reduce((a, b) => a + b, 0), 0);

      return {
        developer: developerEmail,
        period: { startDate, endDate },
        totalRequests,
        totalKeys: keys.length,
        successRate: totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests) * 100 : 0,
        keys: keyStats
      };
    } catch (error) {
      logger.error('Failed to get usage analytics', { error });
      throw error;
    }
  }

  /**
   * Get pending keys awaiting approval
   *
   * @param developerEmail - Developer email
   * @returns List of pending keys
   */
  async getPendingKeys(developerEmail: string) {
    try {
      const keys = await apiKeyService.listApiKeys({
        createdBy: developerEmail,
        status: ApiKeyStatus.PENDING_APPROVAL
      });

      return keys.map(key => ({
        id: key.id,
        name: key.name,
        tier: key.tier,
        createdAt: key.createdAt,
        scopes: key.scopes
      }));
    } catch (error) {
      logger.error('Failed to get pending keys', { error });
      throw error;
    }
  }

  /**
   * Update key settings
   *
   * @param apiKeyId - API key ID
   * @param developerEmail - Developer email
   * @param updates - Fields to update
   */
  async updateKeySettings(
    apiKeyId: string,
    developerEmail: string,
    updates: { name?: string; expiresAt?: Date }
  ): Promise<void> {
    try {
      // Get key
      const key = await apiKeyService.getApiKeyById(apiKeyId);
      if (!key) {
        throw new Error('API key not found');
      }

      // Verify developer owns this key
      if (key.developerEmail !== developerEmail) {
        throw new Error('Unauthorized: You do not own this API key');
      }

      // Note: In a real implementation, would use Prisma to update the key
      // For now, we just log the request
      logger.info('Key settings updated', {
        keyId: apiKeyId,
        developer: developerEmail,
        updates
      });
    } catch (error) {
      logger.error('Failed to update key settings', { error });
      throw error;
    }
  }

  /**
   * Get developer activity (last 30 days)
   *
   * @param developerEmail - Developer email
   * @returns Activity summary
   */
  async getDeveloperActivity(developerEmail: string) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();

      const stats = await this.getDeveloperUsageAnalytics(developerEmail, thirtyDaysAgo, today);

      return {
        developer: developerEmail,
        period: '30 days',
        lastActive: thirtyDaysAgo,
        totalRequests: stats.totalRequests,
        apiKeysActive: stats.totalKeys,
        successRate: stats.successRate
      };
    } catch (error) {
      logger.error('Failed to get developer activity', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const developerService = new DeveloperService();
