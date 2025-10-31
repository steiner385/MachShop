/**
 * OAuth 2.0/OpenID Connect Service (Issue #132)
 *
 * Dedicated service for OAuth 2.0/OIDC authentication flows with PKCE support,
 * discovery document integration, and claims mapping.
 *
 * Features:
 * - Authorization Code Flow with PKCE
 * - Discovery Document Support
 * - JWT Token Validation
 * - Claims Mapping
 * - User Provisioning Integration
 */

import { Client, Issuer, generators, TokenSet, IdTokenClaims } from 'openid-client';
import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../lib/database';
import { logger } from '../utils/logger';
import { OidcConfig, OidcSession, OidcAuthState, User } from '@prisma/client';

export interface OidcAuthRequest {
  configId: string;
  redirectUri: string;
  state?: string;
  nonce?: string;
  scopes?: string[];
  codeChallenge?: string;
  codeChallengeMethod?: 'S256' | 'plain';
}

export interface OidcTokenResponse {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType: string;
  expiresIn: number;
  scope?: string;
}

export interface OidcUserProfile {
  sub: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  picture?: string;
  groups?: string[];
  [key: string]: any;
}

export interface OidcAuthResult {
  success: boolean;
  user?: User;
  session?: OidcSession;
  tokens?: OidcTokenResponse;
  error?: string;
}

export class OidcService {
  private static instance: OidcService;
  private clients: Map<string, Client> = new Map();
  private issuers: Map<string, Issuer> = new Map();

  private constructor() {}

  public static getInstance(): OidcService {
    if (!OidcService.instance) {
      OidcService.instance = new OidcService();
    }
    return OidcService.instance;
  }

  /**
   * Initialize authentication flow with PKCE
   */
  public async initiateAuth(request: OidcAuthRequest): Promise<{
    authUrl: string;
    state: string;
    nonce: string;
    codeVerifier: string;
  }> {
    try {
      const config = await this.getConfig(request.configId);
      const client = await this.getClient(config.id);

      // Generate PKCE parameters
      const codeVerifier = generators.codeVerifier();
      const codeChallenge = generators.codeChallenge(codeVerifier);
      const state = request.state || generators.state();
      const nonce = request.nonce || generators.nonce();

      // Store auth state for callback validation
      await this.storeAuthState({
        state,
        codeVerifier,
        nonce,
        redirectUri: request.redirectUri,
        configId: config.id
      });

      // Build authorization URL
      const authUrl = client.authorizationUrl({
        scope: request.scopes?.join(' ') || config.scopes.join(' '),
        response_type: config.responseType,
        response_mode: config.responseMode,
        state,
        nonce,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        redirect_uri: request.redirectUri
      });

      logger.info('OIDC authentication initiated', {
        configId: config.id,
        configName: config.name,
        state,
        scopes: request.scopes || config.scopes
      });

      return {
        authUrl,
        state,
        nonce,
        codeVerifier
      };

    } catch (error) {
      logger.error('Failed to initiate OIDC authentication', {
        configId: request.configId,
        error: error instanceof Error ? error.message : error
      });
      throw new Error(`Authentication initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle OAuth callback with authorization code
   */
  public async handleCallback(
    code: string,
    state: string,
    redirectUri: string
  ): Promise<OidcAuthResult> {
    try {
      // Retrieve and validate auth state
      const authState = await this.getAuthState(state);
      if (!authState) {
        throw new Error('Invalid or expired authentication state');
      }

      // Clean up auth state (one-time use)
      await this.cleanupAuthState(state);

      const config = await this.getConfig(authState.configId);
      const client = await this.getClient(config.id);

      // Exchange code for tokens
      const tokenSet = await client.callback(redirectUri, { code, state }, {
        code_verifier: authState.codeVerifier || undefined,
        nonce: authState.nonce || undefined
      });

      if (!tokenSet.access_token) {
        throw new Error('No access token received from provider');
      }

      // Get user profile from tokens
      const userProfile = await this.getUserProfile(client, tokenSet, config);

      // Create or update user
      const user = await this.provisionUser(userProfile, config);

      // Create OIDC session
      const session = await this.createSession(user.id, tokenSet, config, userProfile);

      logger.info('OIDC authentication completed successfully', {
        configId: config.id,
        userId: user.id,
        email: user.email,
        sub: userProfile.sub
      });

      return {
        success: true,
        user,
        session,
        tokens: {
          accessToken: tokenSet.access_token,
          refreshToken: tokenSet.refresh_token || undefined,
          idToken: tokenSet.id_token || undefined,
          tokenType: tokenSet.token_type || 'Bearer',
          expiresIn: tokenSet.expires_in || 3600,
          scope: tokenSet.scope || undefined
        }
      };

    } catch (error) {
      logger.error('OIDC callback processing failed', {
        state,
        error: error instanceof Error ? error.message : error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  public async refreshToken(sessionId: string): Promise<OidcTokenResponse | null> {
    try {
      const session = await prisma.oidcSession.findUnique({
        where: { id: sessionId },
        include: { config: true }
      });

      if (!session || !session.refreshToken) {
        return null;
      }

      const client = await this.getClient(session.configId);
      const tokenSet = await client.refresh(session.refreshToken);

      // Update session with new tokens
      await prisma.oidcSession.update({
        where: { id: sessionId },
        data: {
          accessToken: tokenSet.access_token || undefined,
          refreshToken: tokenSet.refresh_token || session.refreshToken,
          expiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined
        }
      });

      logger.info('OIDC token refreshed successfully', {
        sessionId,
        configId: session.configId
      });

      return {
        accessToken: tokenSet.access_token || session.accessToken || '',
        refreshToken: tokenSet.refresh_token || session.refreshToken,
        tokenType: session.tokenType,
        expiresIn: tokenSet.expires_in || 3600
      };

    } catch (error) {
      logger.error('Failed to refresh OIDC token', {
        sessionId,
        error: error instanceof Error ? error.message : error
      });
      return null;
    }
  }

  /**
   * Validate JWT ID token
   */
  public async validateIdToken(idToken: string, configId: string): Promise<IdTokenClaims | null> {
    try {
      const client = await this.getClient(configId);
      const claims = client.validateIdToken(idToken);
      return claims;
    } catch (error) {
      logger.error('ID token validation failed', {
        configId,
        error: error instanceof Error ? error.message : error
      });
      return null;
    }
  }

  /**
   * Test OIDC provider connection
   */
  public async testConnection(configId: string): Promise<{
    success: boolean;
    endpoints?: any;
    error?: string;
  }> {
    try {
      const config = await this.getConfig(configId);
      const issuer = await this.getIssuer(config);

      return {
        success: true,
        endpoints: {
          issuer: issuer.issuer,
          authorization_endpoint: issuer.authorization_endpoint,
          token_endpoint: issuer.token_endpoint,
          userinfo_endpoint: issuer.userinfo_endpoint,
          jwks_uri: issuer.jwks_uri
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Revoke OIDC session
   */
  public async revokeSession(sessionId: string): Promise<boolean> {
    try {
      const session = await prisma.oidcSession.findUnique({
        where: { id: sessionId },
        include: { config: true }
      });

      if (!session) {
        return false;
      }

      // Try to revoke tokens at provider if supported
      try {
        const client = await this.getClient(session.configId);
        if (session.refreshToken && client.issuer.revocation_endpoint) {
          await client.revoke(session.refreshToken, 'refresh_token');
        }
        if (session.accessToken && client.issuer.revocation_endpoint) {
          await client.revoke(session.accessToken, 'access_token');
        }
      } catch (revokeError) {
        logger.warn('Failed to revoke tokens at provider', {
          sessionId,
          error: revokeError instanceof Error ? revokeError.message : revokeError
        });
      }

      // Delete session from database
      await prisma.oidcSession.delete({
        where: { id: sessionId }
      });

      logger.info('OIDC session revoked', { sessionId });
      return true;

    } catch (error) {
      logger.error('Failed to revoke OIDC session', {
        sessionId,
        error: error instanceof Error ? error.message : error
      });
      return false;
    }
  }

  /**
   * Automatic discovery of OIDC configuration
   */
  public async discoverProvider(issuerUrl: string): Promise<{
    success: boolean;
    configuration?: any;
    error?: string;
  }> {
    try {
      const issuer = await Issuer.discover(issuerUrl);

      return {
        success: true,
        configuration: {
          issuer: issuer.issuer,
          authorization_endpoint: issuer.authorization_endpoint,
          token_endpoint: issuer.token_endpoint,
          userinfo_endpoint: issuer.userinfo_endpoint,
          jwks_uri: issuer.jwks_uri,
          end_session_endpoint: issuer.end_session_endpoint,
          response_types_supported: issuer.response_types_supported,
          subject_types_supported: issuer.subject_types_supported,
          id_token_signing_alg_values_supported: issuer.id_token_signing_alg_values_supported,
          scopes_supported: issuer.scopes_supported,
          claims_supported: issuer.claims_supported
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Discovery failed'
      };
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async getConfig(configId: string): Promise<OidcConfig> {
    const config = await prisma.oidcConfig.findUnique({
      where: { id: configId, isActive: true }
    });

    if (!config) {
      throw new Error(`OIDC configuration not found: ${configId}`);
    }

    return config;
  }

  private async getIssuer(config: OidcConfig): Promise<Issuer> {
    if (this.issuers.has(config.id)) {
      return this.issuers.get(config.id)!;
    }

    let issuer: Issuer;

    if (config.discoveryUrl) {
      // Use discovery document
      issuer = await Issuer.discover(config.discoveryUrl);
    } else if (config.authorizationEndpoint && config.tokenEndpoint) {
      // Manual configuration
      issuer = new Issuer({
        issuer: config.issuer,
        authorization_endpoint: config.authorizationEndpoint,
        token_endpoint: config.tokenEndpoint,
        userinfo_endpoint: config.userinfoEndpoint || undefined,
        jwks_uri: config.jwksUri || undefined
      });
    } else {
      throw new Error(`Insufficient OIDC configuration for provider: ${config.name}`);
    }

    this.issuers.set(config.id, issuer);
    return issuer;
  }

  private async getClient(configId: string): Promise<Client> {
    if (this.clients.has(configId)) {
      return this.clients.get(configId)!;
    }

    const config = await this.getConfig(configId);
    const issuer = await this.getIssuer(config);

    const client = new issuer.Client({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      response_types: [config.responseType]
    });

    this.clients.set(configId, client);
    return client;
  }

  private async storeAuthState(authState: {
    state: string;
    codeVerifier: string;
    nonce: string;
    redirectUri: string;
    configId: string;
  }): Promise<void> {
    await prisma.oidcAuthState.create({
      data: {
        id: authState.state,
        state: authState.state,
        codeVerifier: authState.codeVerifier,
        nonce: authState.nonce,
        redirectUri: authState.redirectUri,
        configId: authState.configId
      }
    });
  }

  private async getAuthState(state: string): Promise<OidcAuthState | null> {
    return await prisma.oidcAuthState.findUnique({
      where: {
        state,
        expiresAt: { gt: new Date() }
      }
    });
  }

  private async cleanupAuthState(state: string): Promise<void> {
    await prisma.oidcAuthState.deleteMany({
      where: { state }
    });
  }

  private async getUserProfile(
    client: Client,
    tokenSet: TokenSet,
    config: OidcConfig
  ): Promise<OidcUserProfile> {
    // Get userinfo from endpoint
    const userinfo = await client.userinfo(tokenSet);

    // Extract ID token claims if available
    const idTokenClaims = tokenSet.id_token ?
      client.validateIdToken(tokenSet.id_token) : {};

    // Combine userinfo and ID token claims
    const profile = { ...userinfo, ...idTokenClaims };

    // Apply claims mapping if configured
    const mappedProfile = this.mapClaims(profile, config);

    return {
      sub: profile.sub,
      email: mappedProfile.email || profile.email || profile.preferred_username,
      firstName: mappedProfile.firstName || profile.given_name || profile.first_name,
      lastName: mappedProfile.lastName || profile.family_name || profile.last_name,
      name: mappedProfile.name || profile.name,
      picture: mappedProfile.picture || profile.picture,
      groups: this.extractGroups(profile, config),
      ...profile
    };
  }

  private mapClaims(profile: any, config: OidcConfig): any {
    if (!config.claimsMapping) {
      return profile;
    }

    const mapping = config.claimsMapping as Record<string, string>;
    const mapped: any = {};

    for (const [targetClaim, sourcePath] of Object.entries(mapping)) {
      const value = this.getNestedProperty(profile, sourcePath);
      if (value !== undefined) {
        mapped[targetClaim] = value;
      }
    }

    return mapped;
  }

  private extractGroups(profile: any, config: OidcConfig): string[] {
    if (!config.groupClaimsPath) {
      return [];
    }

    const groups = this.getNestedProperty(profile, config.groupClaimsPath);
    if (Array.isArray(groups)) {
      return groups.map(g => String(g));
    } else if (typeof groups === 'string') {
      return [groups];
    }

    return [];
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  private async provisionUser(profile: OidcUserProfile, config: OidcConfig): Promise<User> {
    if (!profile.email) {
      throw new Error('Email is required for user provisioning');
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: profile.email }
    });

    if (user) {
      // Update existing user with latest profile information
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: profile.firstName || user.firstName,
          lastName: profile.lastName || user.lastName,
          lastLoginAt: new Date()
        }
      });

      logger.info('Existing user updated from OIDC profile', {
        userId: user.id,
        email: user.email,
        configId: config.id
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email: profile.email,
          username: profile.email, // Use email as username for OIDC users
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          passwordHash: '', // No password for OIDC users
          isActive: true,
          roles: ['user'], // Default role, can be enhanced with group mapping
          permissions: [],
          lastLoginAt: new Date()
        }
      });

      logger.info('New user created from OIDC profile', {
        userId: user.id,
        email: user.email,
        configId: config.id
      });
    }

    return user;
  }

  private async createSession(
    userId: string,
    tokenSet: TokenSet,
    config: OidcConfig,
    profile: OidcUserProfile
  ): Promise<OidcSession> {
    return await prisma.oidcSession.create({
      data: {
        userId,
        sub: profile.sub,
        accessToken: tokenSet.access_token || undefined,
        refreshToken: tokenSet.refresh_token || undefined,
        idToken: tokenSet.id_token || undefined,
        tokenType: tokenSet.token_type || 'Bearer',
        expiresAt: tokenSet.expires_at ? new Date(tokenSet.expires_at * 1000) : undefined,
        refreshExpiresAt: tokenSet.refresh_expires_at ? new Date(tokenSet.refresh_expires_at * 1000) : undefined,
        configId: config.id,
        scopes: tokenSet.scope ? tokenSet.scope.split(' ') : config.scopes
      }
    });
  }
}

export default OidcService;