/**
 * OAuth 2.0 Server Controller
 *
 * Endpoints for OAuth 2.0 flows:
 * - Authorization endpoint (authorization code flow)
 * - Token endpoint (authorization code and client credentials flows)
 * - Token revocation endpoint
 * - Client management endpoints
 *
 * @module modules/oauth/controllers/oauth-server.controller
 * @see GitHub Issue #74: API Access Control & Security Model (Phase 4)
 */

import { Request, Response } from 'express';
import { oauthServerService } from '../services/oauth-server.service';
import { logger } from '../../../utils/logger';

/**
 * Authorization Endpoint
 * GET /oauth/authorize?client_id=...&redirect_uri=...&scope=...&response_type=code&state=...
 *
 * User should be authenticated before reaching this endpoint.
 * This endpoint redirects to login if user not authenticated.
 */
export async function authorize(req: Request, res: Response): Promise<void> {
  try {
    const { client_id, redirect_uri, scope, response_type, state } = req.query;

    // Validation
    if (!client_id || typeof client_id !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id is required'
      });
      return;
    }

    if (!redirect_uri || typeof redirect_uri !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'redirect_uri is required'
      });
      return;
    }

    if (response_type !== 'code') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'response_type must be "code"'
      });
      return;
    }

    // Get client
    const client = await oauthServerService.getOAuthClient(client_id);
    if (!client || !client.isActive) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client not found or inactive'
      });
      return;
    }

    // Check redirect URI
    if (!client.redirectUris.includes(redirect_uri)) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'Redirect URI not registered'
      });
      return;
    }

    // Parse scopes
    const requestedScopes = scope ? (scope as string).split(' ') : [];

    // Check if user is authenticated
    const userId = req.user?.id || req.headers['x-user-id'];
    if (!userId) {
      // Redirect to login with return URL
      const loginUrl = `/login?redirect=${encodeURIComponent(req.originalUrl)}`;
      res.redirect(loginUrl);
      return;
    }

    // Generate authorization code
    const authCode = await oauthServerService.generateAuthorizationCode(
      client_id,
      userId as string,
      redirect_uri,
      requestedScopes,
      client
    );

    logger.info('Authorization code issued', {
      clientId: client_id,
      userId,
      state: state as string
    });

    // Redirect back to client with code
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', authCode);
    if (state) {
      redirectUrl.searchParams.append('state', state as string);
    }

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Authorization endpoint error', { error });

    if (error instanceof Error) {
      if (error.message.includes('Invalid redirect URI')) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: error.message
        });
        return;
      }
      if (error.message.includes('Invalid scopes')) {
        res.status(400).json({
          error: 'invalid_scope',
          error_description: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
}

/**
 * Token Endpoint
 * POST /oauth/token
 *
 * Handles:
 * 1. Authorization Code Flow: exchange code for token
 * 2. Client Credentials Flow: use client credentials for token
 * 3. Refresh Token Flow: use refresh token for new access token
 */
export async function token(req: Request, res: Response): Promise<void> {
  try {
    const { grant_type, code, redirect_uri, client_id, client_secret, refresh_token, scope } =
      req.body;

    // Validation
    if (!grant_type || typeof grant_type !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'grant_type is required'
      });
      return;
    }

    if (!client_id || typeof client_id !== 'string') {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id is required'
      });
      return;
    }

    // Authenticate client
    const client = await oauthServerService.authenticateClient(client_id, client_secret);
    if (!client) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      });
      return;
    }

    let tokenData;

    if (grant_type === 'authorization_code') {
      // Authorization Code Flow
      if (!code || !redirect_uri) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'code and redirect_uri are required for authorization_code flow'
        });
        return;
      }

      tokenData = await oauthServerService.exchangeAuthorizationCode(
        client_id,
        code,
        redirect_uri,
        client
      );

      logger.info('Token issued via authorization code flow', {
        clientId: client_id
      });
    } else if (grant_type === 'client_credentials') {
      // Client Credentials Flow
      const requestedScopes = scope ? scope.split(' ') : client.allowedScopes;

      tokenData = await oauthServerService.generateClientCredentialsToken(
        client_id,
        client,
        requestedScopes
      );

      logger.info('Token issued via client credentials flow', {
        clientId: client_id,
        scopes: requestedScopes
      });
    } else if (grant_type === 'refresh_token') {
      // Refresh Token Flow
      if (!refresh_token) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: 'refresh_token is required for refresh_token flow'
        });
        return;
      }

      tokenData = await oauthServerService.refreshAccessToken(client_id, refresh_token);

      logger.info('Token refreshed via refresh token flow', {
        clientId: client_id
      });
    } else {
      res.status(400).json({
        error: 'invalid_grant',
        error_description: `Unsupported grant_type: ${grant_type}`
      });
      return;
    }

    // Return token
    res.json({
      access_token: tokenData.accessToken,
      refresh_token: tokenData.refreshToken,
      token_type: tokenData.tokenType,
      expires_in: tokenData.expiresIn,
      scope: tokenData.scope
    });
  } catch (error) {
    logger.error('Token endpoint error', { error });

    if (error instanceof Error) {
      if (error.message.includes('Invalid')) {
        res.status(400).json({
          error: 'invalid_request',
          error_description: error.message
        });
        return;
      }
    }

    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
}

/**
 * Token Revocation Endpoint
 * POST /oauth/revoke
 *
 * Revoke an access or refresh token
 */
export async function revoke(req: Request, res: Response): Promise<void> {
  try {
    const { token, token_type_hint, client_id, client_secret } = req.body;

    // Validation
    if (!token) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'token is required'
      });
      return;
    }

    if (!client_id) {
      res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id is required'
      });
      return;
    }

    // Authenticate client
    const client = await oauthServerService.authenticateClient(client_id, client_secret);
    if (!client) {
      res.status(401).json({
        error: 'invalid_client',
        error_description: 'Client authentication failed'
      });
      return;
    }

    // Determine token type
    const tokenType = (token_type_hint as 'access' | 'refresh') || 'access';

    // Revoke token
    await oauthServerService.revokeToken(client_id, token, tokenType);

    logger.info('Token revoked', {
      clientId: client_id,
      tokenType
    });

    // Return 200 OK (RFC 7009 allows 200 even if token doesn't exist)
    res.status(200).send();
  } catch (error) {
    logger.error('Token revocation endpoint error', { error });
    res.status(500).json({
      error: 'server_error',
      error_description: 'Internal server error'
    });
  }
}

/**
 * Create OAuth Client (Admin)
 * POST /admin/oauth/clients
 */
export async function createClient(req: Request, res: Response): Promise<void> {
  try {
    const { name, redirectUris, allowedScopes, isConfidential } = req.body;

    // Validation
    if (!name || !Array.isArray(redirectUris) || !Array.isArray(allowedScopes)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'name, redirectUris, and allowedScopes are required'
      });
      return;
    }

    if (redirectUris.length === 0 || allowedScopes.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'redirectUris and allowedScopes must not be empty'
      });
      return;
    }

    const client = await oauthServerService.createOAuthClient({
      name,
      redirectUris,
      allowedScopes,
      isConfidential
    });

    logger.info('OAuth client created', {
      clientId: client.clientId,
      name
    });

    res.status(201).json({
      success: true,
      message: 'OAuth client created successfully',
      data: {
        clientId: client.clientId,
        clientSecret: client.clientSecret,
        name: client.name,
        redirectUris: client.redirectUris,
        allowedScopes: client.allowedScopes,
        isConfidential: client.isConfidential,
        createdAt: client.createdAt,
        note: 'Save the client secret now - it will not be shown again'
      }
    });
  } catch (error) {
    logger.error('Failed to create OAuth client', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create OAuth client'
    });
  }
}

/**
 * List OAuth Clients (Admin)
 * GET /admin/oauth/clients
 */
export async function listClients(req: Request, res: Response): Promise<void> {
  try {
    const clients = await oauthServerService.listOAuthClients();

    res.json({
      success: true,
      data: clients.map(client => ({
        clientId: client.clientId,
        name: client.name,
        redirectUris: client.redirectUris,
        allowedScopes: client.allowedScopes,
        isConfidential: client.isConfidential,
        isActive: client.isActive,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      })),
      total: clients.length
    });
  } catch (error) {
    logger.error('Failed to list OAuth clients', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list OAuth clients'
    });
  }
}

/**
 * Get OAuth Client Details (Admin)
 * GET /admin/oauth/clients/:clientId
 */
export async function getClient(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;

    const client = await oauthServerService.getOAuthClient(clientId);

    if (!client) {
      res.status(404).json({
        error: 'Not Found',
        message: 'OAuth client not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        clientId: client.clientId,
        name: client.name,
        redirectUris: client.redirectUris,
        allowedScopes: client.allowedScopes,
        isConfidential: client.isConfidential,
        isActive: client.isActive,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      }
    });
  } catch (error) {
    logger.error('Failed to get OAuth client', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get OAuth client'
    });
  }
}

/**
 * Update OAuth Client (Admin)
 * PATCH /admin/oauth/clients/:clientId
 */
export async function updateClient(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;
    const { name, redirectUris, allowedScopes, isActive } = req.body;

    const updates: any = {};
    if (name) updates.name = name;
    if (redirectUris) updates.redirectUris = redirectUris;
    if (allowedScopes) updates.allowedScopes = allowedScopes;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const client = await oauthServerService.updateOAuthClient(clientId, updates);

    if (!client) {
      res.status(404).json({
        error: 'Not Found',
        message: 'OAuth client not found'
      });
      return;
    }

    logger.info('OAuth client updated', { clientId });

    res.json({
      success: true,
      message: 'OAuth client updated successfully',
      data: {
        clientId: client.clientId,
        name: client.name,
        redirectUris: client.redirectUris,
        allowedScopes: client.allowedScopes,
        isActive: client.isActive
      }
    });
  } catch (error) {
    logger.error('Failed to update OAuth client', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update OAuth client'
    });
  }
}

/**
 * Delete OAuth Client (Admin)
 * DELETE /admin/oauth/clients/:clientId
 */
export async function deleteClient(req: Request, res: Response): Promise<void> {
  try {
    const { clientId } = req.params;

    await oauthServerService.deleteOAuthClient(clientId);

    logger.info('OAuth client deleted', { clientId });

    res.json({
      success: true,
      message: 'OAuth client deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete OAuth client', { error });

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Not Found',
        message: 'OAuth client not found'
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete OAuth client'
    });
  }
}

/**
 * Get OAuth Token Statistics (Admin)
 * GET /admin/oauth/stats
 */
export async function getTokenStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await oauthServerService.getTokenStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get token stats', { error });
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get token statistics'
    });
  }
}
