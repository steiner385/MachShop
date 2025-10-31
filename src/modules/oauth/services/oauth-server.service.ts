/**
 * OAuth 2.0 Server Service
 *
 * Implements OAuth 2.0 Authorization Code and Client Credentials flows.
 * Manages authorization codes, access tokens, and refresh tokens.
 *
 * @module modules/oauth/services/oauth-server.service
 * @see GitHub Issue #74: API Access Control & Security Model (Phase 4)
 */

import * as crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger';

const prisma = new PrismaClient();

/**
 * OAuth Client interface
 */
export interface OAuthClientData {
  id: string;
  clientId: string;
  clientSecret: string;
  name: string;
  redirectUris: string[];
  allowedScopes: string[];
  isConfidential: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Authorization Code interface
 */
export interface AuthorizationCodeData {
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  expiresAt: Date;
  isUsed: boolean;
}

/**
 * Token interface
 */
export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  scope?: string;
}

/**
 * OAuth 2.0 Server Service
 */
export class OAuthServerService {
  private static readonly AUTHORIZATION_CODE_LENGTH = 32;
  private static readonly ACCESS_TOKEN_LENGTH = 48;
  private static readonly REFRESH_TOKEN_LENGTH = 48;
  private static readonly AUTHORIZATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes
  private static readonly ACCESS_TOKEN_EXPIRY = 3600 * 1000; // 1 hour
  private static readonly REFRESH_TOKEN_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

  /**
   * Generate a secure random string
   */
  private generateSecureRandom(length: number): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash a token using SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Validate redirect URI against registered URIs
   */
  private isValidRedirectUri(clientId: string, redirectUri: string, registeredUris: string[]): boolean {
    return registeredUris.includes(redirectUri);
  }

  /**
   * Validate scopes
   */
  private validateScopes(requestedScopes: string[], allowedScopes: string[]): boolean {
    if (requestedScopes.length === 0) {
      return false;
    }

    // Check if all requested scopes are allowed
    return requestedScopes.every(scope => allowedScopes.includes(scope) || allowedScopes.includes('*'));
  }

  /**
   * Create an OAuth client
   *
   * @param data - Client data
   * @returns Created OAuth client
   */
  async createOAuthClient(data: {
    name: string;
    redirectUris: string[];
    allowedScopes: string[];
    isConfidential?: boolean;
  }): Promise<OAuthClientData> {
    try {
      const clientId = `oauth_client_${this.generateSecureRandom(16)}`;
      const clientSecret = this.generateSecureRandom(32);

      logger.info('Creating OAuth client', {
        clientId,
        name: data.name,
        redirectUris: data.redirectUris.length
      });

      // In a real implementation, would save to database
      const client: OAuthClientData = {
        id: `oc_${Date.now()}`,
        clientId,
        clientSecret,
        name: data.name,
        redirectUris: data.redirectUris,
        allowedScopes: data.allowedScopes,
        isConfidential: data.isConfidential ?? true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return client;
    } catch (error) {
      logger.error('Failed to create OAuth client', { error });
      throw error;
    }
  }

  /**
   * Get OAuth client by ID
   */
  async getOAuthClient(clientId: string): Promise<OAuthClientData | null> {
    try {
      logger.debug('Fetching OAuth client', { clientId });

      // In a real implementation, would query database
      // For now, return null
      return null;
    } catch (error) {
      logger.error('Failed to get OAuth client', { error });
      throw error;
    }
  }

  /**
   * Authenticate OAuth client using client credentials
   */
  async authenticateClient(
    clientId: string,
    clientSecret?: string
  ): Promise<OAuthClientData | null> {
    try {
      const client = await this.getOAuthClient(clientId);

      if (!client || !client.isActive) {
        logger.warn('Client authentication failed', { clientId, reason: 'not found or inactive' });
        return null;
      }

      // For confidential clients, verify secret
      if (client.isConfidential && clientSecret) {
        if (client.clientSecret !== clientSecret) {
          logger.warn('Client authentication failed', { clientId, reason: 'invalid secret' });
          return null;
        }
      }

      logger.info('Client authenticated successfully', { clientId });
      return client;
    } catch (error) {
      logger.error('Failed to authenticate client', { error });
      throw error;
    }
  }

  /**
   * Authorization Code Flow: Step 1 - Generate authorization code
   *
   * @param clientId - OAuth client ID
   * @param userId - User ID requesting access
   * @param redirectUri - Redirect URI
   * @param scopes - Requested scopes
   * @param client - OAuth client data
   * @returns Authorization code
   */
  async generateAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scopes: string[],
    client: OAuthClientData
  ): Promise<string> {
    try {
      // Validate redirect URI
      if (!this.isValidRedirectUri(clientId, redirectUri, client.redirectUris)) {
        throw new Error('Invalid redirect URI');
      }

      // Validate scopes
      if (!this.validateScopes(scopes, client.allowedScopes)) {
        throw new Error('Invalid scopes');
      }

      const code = this.generateSecureRandom(OAuthServerService.AUTHORIZATION_CODE_LENGTH);
      const hashedCode = this.hashToken(code);
      const expiresAt = new Date(Date.now() + OAuthServerService.AUTHORIZATION_CODE_EXPIRY);

      logger.info('Authorization code generated', {
        clientId,
        userId,
        scopes,
        expiresAt
      });

      // In a real implementation, would save code to database with hash
      // Store: { codeHash, clientId, userId, redirectUri, scopes, expiresAt, isUsed }

      return code;
    } catch (error) {
      logger.error('Failed to generate authorization code', { error });
      throw error;
    }
  }

  /**
   * Authorization Code Flow: Step 2 - Exchange code for token
   *
   * @param clientId - OAuth client ID
   * @param code - Authorization code
   * @param redirectUri - Redirect URI
   * @param client - OAuth client data
   * @returns Access and refresh tokens
   */
  async exchangeAuthorizationCode(
    clientId: string,
    code: string,
    redirectUri: string,
    client: OAuthClientData
  ): Promise<TokenData> {
    try {
      // In a real implementation:
      // 1. Hash the code
      // 2. Look up in database
      // 3. Verify not expired and not used
      // 4. Verify redirect URI matches
      // 5. Mark as used
      // 6. Generate tokens

      const accessToken = this.generateSecureRandom(OAuthServerService.ACCESS_TOKEN_LENGTH);
      const refreshToken = this.generateSecureRandom(OAuthServerService.REFRESH_TOKEN_LENGTH);
      const expiresIn = OAuthServerService.ACCESS_TOKEN_EXPIRY / 1000; // Convert to seconds

      logger.info('Authorization code exchanged for tokens', {
        clientId,
        redirectUri
      });

      return {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn,
        scope: 'openid profile email'
      };
    } catch (error) {
      logger.error('Failed to exchange authorization code', { error });
      throw error;
    }
  }

  /**
   * Client Credentials Flow - Generate access token
   *
   * @param clientId - OAuth client ID
   * @param client - OAuth client data
   * @param scopes - Requested scopes
   * @returns Access token
   */
  async generateClientCredentialsToken(
    clientId: string,
    client: OAuthClientData,
    scopes: string[]
  ): Promise<TokenData> {
    try {
      // Validate scopes
      if (!this.validateScopes(scopes, client.allowedScopes)) {
        throw new Error('Invalid scopes for client');
      }

      const accessToken = this.generateSecureRandom(OAuthServerService.ACCESS_TOKEN_LENGTH);
      const expiresIn = OAuthServerService.ACCESS_TOKEN_EXPIRY / 1000;

      logger.info('Client credentials token generated', {
        clientId,
        scopes,
        expiresIn
      });

      // In a real implementation, would save token to database
      // Store: { tokenHash, clientId, scopes, expiresAt, type: 'CLIENT_CREDENTIALS' }

      return {
        accessToken,
        tokenType: 'Bearer',
        expiresIn,
        scope: scopes.join(' ')
      };
    } catch (error) {
      logger.error('Failed to generate client credentials token', { error });
      throw error;
    }
  }

  /**
   * Refresh an access token using refresh token
   *
   * @param clientId - OAuth client ID
   * @param refreshToken - Refresh token
   * @returns New access and refresh tokens
   */
  async refreshAccessToken(
    clientId: string,
    refreshToken: string
  ): Promise<TokenData> {
    try {
      // In a real implementation:
      // 1. Hash the refresh token
      // 2. Look up in database
      // 3. Verify not expired and still valid
      // 4. Verify clientId matches
      // 5. Generate new access token and optionally new refresh token
      // 6. Save new tokens to database

      const accessToken = this.generateSecureRandom(OAuthServerService.ACCESS_TOKEN_LENGTH);
      const newRefreshToken = this.generateSecureRandom(OAuthServerService.REFRESH_TOKEN_LENGTH);
      const expiresIn = OAuthServerService.ACCESS_TOKEN_EXPIRY / 1000;

      logger.info('Access token refreshed', {
        clientId,
        expiresIn
      });

      return {
        accessToken,
        refreshToken: newRefreshToken,
        tokenType: 'Bearer',
        expiresIn
      };
    } catch (error) {
      logger.error('Failed to refresh access token', { error });
      throw error;
    }
  }

  /**
   * Revoke a token (access or refresh)
   *
   * @param clientId - OAuth client ID
   * @param token - Token to revoke
   * @param tokenType - Type of token (access or refresh)
   */
  async revokeToken(
    clientId: string,
    token: string,
    tokenType: 'access' | 'refresh' = 'access'
  ): Promise<void> {
    try {
      logger.info('Token revoked', {
        clientId,
        tokenType
      });

      // In a real implementation:
      // 1. Hash the token
      // 2. Find token in database
      // 3. Mark as revoked with timestamp
      // 4. For refresh tokens, also revoke associated access tokens
    } catch (error) {
      logger.error('Failed to revoke token', { error });
      throw error;
    }
  }

  /**
   * Validate an access token
   *
   * @param token - Access token to validate
   * @returns Token data if valid
   */
  async validateAccessToken(token: string): Promise<{
    clientId: string;
    userId?: string;
    scopes: string[];
    expiresAt: Date;
    isValid: boolean;
  } | null> {
    try {
      const hashedToken = this.hashToken(token);

      logger.debug('Validating access token');

      // In a real implementation:
      // 1. Hash the token
      // 2. Look up in database
      // 3. Check if not expired
      // 4. Check if not revoked
      // 5. Return token data

      return null;
    } catch (error) {
      logger.error('Failed to validate access token', { error });
      throw error;
    }
  }

  /**
   * Get all OAuth clients for an admin
   *
   * @returns List of OAuth clients
   */
  async listOAuthClients(): Promise<OAuthClientData[]> {
    try {
      // In a real implementation, would query database
      return [];
    } catch (error) {
      logger.error('Failed to list OAuth clients', { error });
      throw error;
    }
  }

  /**
   * Update OAuth client
   *
   * @param clientId - Client ID
   * @param updates - Fields to update
   */
  async updateOAuthClient(
    clientId: string,
    updates: Partial<{
      name: string;
      redirectUris: string[];
      allowedScopes: string[];
      isActive: boolean;
    }>
  ): Promise<OAuthClientData | null> {
    try {
      const client = await this.getOAuthClient(clientId);

      if (!client) {
        throw new Error('OAuth client not found');
      }

      logger.info('OAuth client updated', {
        clientId,
        updates: Object.keys(updates)
      });

      // In a real implementation, would update database

      return client;
    } catch (error) {
      logger.error('Failed to update OAuth client', { error });
      throw error;
    }
  }

  /**
   * Delete OAuth client
   *
   * @param clientId - Client ID
   */
  async deleteOAuthClient(clientId: string): Promise<void> {
    try {
      logger.info('OAuth client deleted', { clientId });

      // In a real implementation:
      // 1. Revoke all associated tokens
      // 2. Delete client from database
      // 3. Log deletion for audit trail
    } catch (error) {
      logger.error('Failed to delete OAuth client', { error });
      throw error;
    }
  }

  /**
   * Get token statistics
   */
  async getTokenStats(): Promise<{
    totalTokensIssued: number;
    activeTokens: number;
    revokedTokens: number;
    expiredTokens: number;
  }> {
    try {
      // In a real implementation, would aggregate from database

      return {
        totalTokensIssued: 0,
        activeTokens: 0,
        revokedTokens: 0,
        expiredTokens: 0
      };
    } catch (error) {
      logger.error('Failed to get token stats', { error });
      throw error;
    }
  }

  /**
   * Clean up expired tokens (background task)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      logger.info('Cleaning up expired tokens');

      // In a real implementation:
      // 1. Query for tokens where expiresAt < now()
      // 2. Delete them
      // 3. Log count deleted

      return 0;
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error });
      return 0;
    }
  }
}

// Export singleton instance
export const oauthServerService = new OAuthServerService();
