/**
 * ✅ GITHUB ISSUE #74: API Access Control & Security Model - Phase 1-2
 * API Key Management Service
 *
 * Handles:
 * - API key generation with bcrypt hashing
 * - Key validation and lookup
 * - Key rotation with scheduled auto-rotation
 * - Key expiration and revocation
 * - Usage statistics and metadata tracking
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { ApiKey, ApiKeySummary, CreateApiKeyRequest, CreateApiKeyResponse, AuthenticationResult, ApiKeyStatus, ApiKeyType } from '../types/security';
import { AppError } from '../middleware/errorHandler';

const SALT_ROUNDS = 12;
const KEY_LENGTH = 32; // bytes for 256-bit keys
const KEY_PREFIX_LENGTH = 8;

/**
 * API Key Service
 * Manages all aspects of API key lifecycle
 */
export class ApiKeyService {
  /**
   * Generate a new API key
   * Returns both the key (only shown once) and a summary for storage
   */
  async createApiKey(
    request: CreateApiKeyRequest,
    userId?: string,
    serviceAccountId?: string,
  ): Promise<CreateApiKeyResponse> {
    if (!userId && !serviceAccountId) {
      throw new AppError('Either userId or serviceAccountId must be provided', 400, 'INVALID_INPUT');
    }

    // Generate random key
    const rawKey = crypto.randomBytes(KEY_LENGTH).toString('hex');
    const keyPrefix = rawKey.substring(0, KEY_PREFIX_LENGTH);

    // Hash the key for storage
    const hashedKey = await bcrypt.hash(rawKey, SALT_ROUNDS);

    // Hash secret if it's an OAuth client
    let hashedSecret: string | undefined;
    if (request.type === ApiKeyType.OAUTH_CLIENT) {
      const clientSecret = crypto.randomBytes(KEY_LENGTH).toString('hex');
      hashedSecret = await bcrypt.hash(clientSecret, SALT_ROUNDS);
    }

    // Prepare rotation schedule if enabled
    let rotationSchedule;
    if (request.rotationSchedule?.enabled) {
      const days = request.rotationSchedule.rotateEveryDays;
      if (days < 30 || days > 365) {
        throw new AppError('Rotation period must be between 30-365 days', 400, 'INVALID_ROTATION_PERIOD');
      }

      rotationSchedule = {
        enabled: true,
        rotateEveryDays: days,
        nextRotationDate: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
        lastRotationDate: new Date(),
      };
    }

    // Calculate expiration date
    let expiresAt: Date | undefined;
    if (request.expiresInDays) {
      expiresAt = new Date(Date.now() + request.expiresInDays * 24 * 60 * 60 * 1000);
    }

    // Create the API key in database
    const apiKey = await prisma.apiKey.create({
      data: {
        name: request.name,
        type: request.type,
        key: hashedKey,
        keyPrefix,
        secret: hashedSecret,
        ownerId: userId || serviceAccountId,
        ownerType: userId ? 'user' : 'service_account',
        status: 'ACTIVE',
        expiresAt,
        rotationSchedule: rotationSchedule as any,
        metadata: request.metadata || {},
      },
    });

    // Assign roles if provided
    if (request.roles && request.roles.length > 0) {
      await Promise.all(
        request.roles.map(roleId =>
          prisma.apiKeyRole.create({
            data: {
              apiKeyId: apiKey.id,
              roleId,
              grantedBy: userId || serviceAccountId || 'system',
            },
          })
        )
      );
    }

    return {
      apiKey: this.toSummary(apiKey),
      secret: rawKey, // Return raw key only at creation time
      expiresAt,
    };
  }

  /**
   * Authenticate using an API key
   * Validates the key and returns authentication context
   */
  async authenticateKey(rawKey: string): Promise<AuthenticationResult> {
    if (!rawKey) {
      return {
        success: false,
        error: 'API key is required',
        errorCode: 'MALFORMED_KEY',
      };
    }

    try {
      // Get the prefix to narrow down search
      const prefix = rawKey.substring(0, KEY_PREFIX_LENGTH);

      // Find API key by prefix
      const apiKey = await prisma.apiKey.findFirst({
        where: {
          keyPrefix: prefix,
          status: 'ACTIVE',
        },
      });

      if (!apiKey) {
        return {
          success: false,
          error: 'Invalid API key',
          errorCode: 'INVALID_KEY',
        };
      }

      // Check if key has expired
      if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
        return {
          success: false,
          error: 'API key has expired',
          errorCode: 'EXPIRED_KEY',
        };
      }

      // Verify the key hash
      const isValid = await bcrypt.compare(rawKey, apiKey.key);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid API key',
          errorCode: 'INVALID_KEY',
        };
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });

      return {
        success: true,
        apiKeyId: apiKey.id,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Authentication failed',
        errorCode: 'INVALID_KEY',
      };
    }
  }

  /**
   * Get API key details with full information
   */
  async getApiKey(keyId: string): Promise<ApiKeySummary | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    return apiKey ? this.toSummary(apiKey) : null;
  }

  /**
   * List API keys for a user or service account
   */
  async listApiKeys(
    ownerId: string,
    status?: ApiKeyStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ keys: ApiKeySummary[]; total: number }> {
    const where: any = {
      ownerId,
    };

    if (status) {
      where.status = status;
    }

    const [keys, total] = await Promise.all([
      prisma.apiKey.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.apiKey.count({ where }),
    ]);

    return {
      keys: keys.map(k => this.toSummary(k)),
      total,
    };
  }

  /**
   * Revoke an API key
   */
  async revokeKey(
    keyId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<ApiKeySummary> {
    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy,
        revokedReason: reason,
      },
    });

    return this.toSummary(apiKey);
  }

  /**
   * Rotate an API key (revoke old, create new)
   */
  async rotateKey(
    keyId: string,
    userId?: string,
    serviceAccountId?: string,
  ): Promise<CreateApiKeyResponse> {
    const existingKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!existingKey) {
      throw new AppError('API key not found', 404);
    }

    // Create new key with same configuration
    const newKeyResponse = await this.createApiKey(
      {
        name: `${existingKey.name} (rotated)`,
        type: existingKey.type as ApiKeyType,
        rotationSchedule: existingKey.rotationSchedule as any,
      },
      userId,
      serviceAccountId,
    );

    // Revoke old key
    await this.revokeKey(keyId, userId || serviceAccountId || 'system', 'Key rotation');

    return newKeyResponse;
  }

  /**
   * Update API key metadata and configuration
   */
  async updateApiKey(
    keyId: string,
    updates: {
      name?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<ApiKeySummary> {
    const apiKey = await prisma.apiKey.update({
      where: { id: keyId },
      data: {
        name: updates.name,
        metadata: updates.metadata,
      },
    });

    return this.toSummary(apiKey);
  }

  /**
   * Get API key usage statistics
   */
  async getKeyUsageStats(
    keyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const logs = await prisma.apiAccessLog.findMany({
      where: {
        apiKeyId: keyId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (logs.length === 0) {
      return {
        apiKeyId: keyId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        requestsByEndpoint: {},
        requestsByStatus: {},
        period: { start: startDate, end: endDate },
      };
    }

    const requestsByEndpoint: Record<string, number> = {};
    const requestsByStatus: Record<number, number> = {};
    let totalResponseTime = 0;
    let successCount = 0;
    let failCount = 0;

    for (const log of logs) {
      // Count by endpoint
      requestsByEndpoint[log.endpoint] = (requestsByEndpoint[log.endpoint] || 0) + 1;

      // Count by status
      requestsByStatus[log.statusCode] = (requestsByStatus[log.statusCode] || 0) + 1;

      // Aggregate response times
      totalResponseTime += log.responseTime;

      // Count successes/failures
      if (log.statusCode >= 200 && log.statusCode < 400) {
        successCount++;
      } else {
        failCount++;
      }
    }

    return {
      apiKeyId: keyId,
      totalRequests: logs.length,
      successfulRequests: successCount,
      failedRequests: failCount,
      averageResponseTime: totalResponseTime / logs.length,
      requestsByEndpoint,
      requestsByStatus,
      errorRate: (failCount / logs.length) * 100,
      period: { start: startDate, end: endDate },
    };
  }

  /**
   * Check if a key is valid and not expired/revoked
   */
  async isKeyValid(keyId: string): Promise<boolean> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!apiKey) return false;
    if (apiKey.status !== 'ACTIVE') return false;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return false;

    return true;
  }

  /**
   * Get API key with its roles and permissions
   */
  async getKeyWithRoles(keyId: string): Promise<any> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
      include: {
        apiKeyRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!apiKey) return null;

    // Extract permissions from roles
    const permissions = new Set<string>();
    const roles = apiKey.apiKeyRoles.map(kr => ({
      roleId: kr.role.id,
      roleName: kr.role.name,
      permissions: kr.role.rolePermissions.map(rp => rp.permission.scope),
    }));

    apiKey.apiKeyRoles.forEach(kr => {
      kr.role.rolePermissions.forEach(rp => {
        permissions.add(rp.permission.scope);
      });
    });

    return {
      ...this.toSummary(apiKey),
      roles,
      permissions: Array.from(permissions),
    };
  }

  /**
   * Convert API key to safe summary (excludes sensitive fields)
   */
  private toSummary(apiKey: any): ApiKeySummary {
    return {
      id: apiKey.id,
      name: apiKey.name,
      type: apiKey.type as ApiKeyType,
      keyPrefix: apiKey.keyPrefix,
      status: apiKey.status as ApiKeyStatus,
      createdAt: apiKey.createdAt,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
    };
  }
}

export const apiKeyService = new ApiKeyService();
