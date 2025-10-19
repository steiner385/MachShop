/**
 * Token Service
 * Handles JWT generation, validation, and refresh token management
 */

import jwt from 'jsonwebtoken';
import Redis from 'ioredis';
import { config } from '../config/config';
import {
  JWTPayload,
  StoredRefreshToken,
  UserResponse,
} from '../types';

export class TokenService {
  private redis: Redis;
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';

  constructor(redisClient?: Redis) {
    this.redis = redisClient || new Redis(config.redis.url);
  }

  /**
   * Generate access token (JWT)
   */
  generateAccessToken(user: UserResponse): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      siteId: user.siteId || undefined,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpire,
      issuer: config.serviceName,
      subject: user.id,
    });
  }

  /**
   * Generate refresh token (JWT)
   */
  generateRefreshToken(user: UserResponse): string {
    const payload: JWTPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      siteId: user.siteId || undefined,
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenExpire,
      issuer: config.serviceName,
      subject: user.id,
    });
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.serviceName,
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: config.serviceName,
      }) as JWTPayload;

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Store refresh token in Redis with metadata
   */
  async storeRefreshToken(
    userId: string,
    username: string,
    token: string,
    expiresInSeconds: number,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${token}`;

    const tokenData: StoredRefreshToken = {
      userId,
      username,
      token,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      createdAt: new Date(),
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
    };

    // Store refresh token with expiration
    await this.redis.setex(
      key,
      expiresInSeconds,
      JSON.stringify(tokenData)
    );

    // Add token to user's session set for tracking multiple devices
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    await this.redis.sadd(userSessionsKey, token);
    await this.redis.expire(userSessionsKey, expiresInSeconds);
  }

  /**
   * Check if refresh token exists in Redis
   */
  async isRefreshTokenValid(token: string): Promise<boolean> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${token}`;
    const exists = await this.redis.exists(key);
    return exists === 1;
  }

  /**
   * Get refresh token data from Redis
   */
  async getRefreshToken(token: string): Promise<StoredRefreshToken | null> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${token}`;
    const data = await this.redis.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as StoredRefreshToken;
    } catch {
      return null;
    }
  }

  /**
   * Delete refresh token from Redis (logout)
   */
  async revokeRefreshToken(token: string): Promise<void> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${token}`;

    // Get token data to remove from user sessions
    const tokenData = await this.getRefreshToken(token);

    // Delete the token
    await this.redis.del(key);

    // Remove from user's session set
    if (tokenData) {
      const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${tokenData.userId}`;
      await this.redis.srem(userSessionsKey, token);
    }
  }

  /**
   * Revoke all refresh tokens for a user (logout all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;

    // Get all tokens for this user
    const tokens = await this.redis.smembers(userSessionsKey);

    // Delete all tokens
    const pipeline = this.redis.pipeline();
    for (const token of tokens) {
      const key = `${this.REFRESH_TOKEN_PREFIX}${token}`;
      pipeline.del(key);
    }
    pipeline.del(userSessionsKey);
    await pipeline.exec();
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<StoredRefreshToken[]> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const tokens = await this.redis.smembers(userSessionsKey);

    const sessions: StoredRefreshToken[] = [];
    for (const token of tokens) {
      const tokenData = await this.getRefreshToken(token);
      if (tokenData) {
        sessions.push(tokenData);
      }
    }

    return sessions;
  }

  /**
   * Clean up expired tokens from user sessions set
   */
  async cleanupExpiredTokens(userId: string): Promise<void> {
    const userSessionsKey = `${this.USER_SESSIONS_PREFIX}${userId}`;
    const tokens = await this.redis.smembers(userSessionsKey);

    for (const token of tokens) {
      const exists = await this.isRefreshTokenValid(token);
      if (!exists) {
        await this.redis.srem(userSessionsKey, token);
      }
    }
  }

  /**
   * Get remaining TTL for a refresh token
   */
  async getRefreshTokenTTL(token: string): Promise<number> {
    const key = `${this.REFRESH_TOKEN_PREFIX}${token}`;
    return await this.redis.ttl(key);
  }

  /**
   * Parse expiration time string (e.g., '24h', '7d') to seconds
   */
  parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhdw])$/);
    if (!match) {
      throw new Error(`Invalid expiration format: ${expiration}`);
    }

    const [, value, unit] = match;
    const numValue = parseInt(value, 10);

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };

    return numValue * multipliers[unit];
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.redis.ping();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let tokenServiceInstance: TokenService | null = null;

export function getTokenService(redisClient?: Redis): TokenService {
  if (!tokenServiceInstance) {
    tokenServiceInstance = new TokenService(redisClient);
  }
  return tokenServiceInstance;
}

export default TokenService;
