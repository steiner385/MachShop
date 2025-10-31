/**
 * OAuth 2.0/OpenID Connect API Routes (Issue #132)
 *
 * Dedicated API endpoints for OAuth 2.0/OIDC authentication flows.
 * Provides authorization initiation, callback handling, token management,
 * and configuration management with PKCE support.
 *
 * Public Endpoints:
 * - Authorization initiation
 * - Authorization callback handling
 * - Token refresh
 * - Logout flows
 *
 * Admin Endpoints:
 * - OIDC configuration management
 * - Provider discovery
 * - Connection testing
 */

import express from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';
import { logger } from '../utils/logger';
import OidcService from '../services/OidcService';
import prisma from '../lib/database';

const router = express.Router();
const oidcService = OidcService.getInstance();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const initiateAuthSchema = z.object({
  configId: z.string().min(1, 'Configuration ID is required'),
  redirectUri: z.string().url('Valid redirect URI is required'),
  scopes: z.array(z.string()).optional(),
  state: z.string().optional(),
  nonce: z.string().optional()
});

const callbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().min(1, 'State parameter is required')
});

const refreshTokenSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required')
});

const createConfigSchema = z.object({
  name: z.string().min(1, 'Configuration name is required'),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  issuer: z.string().url('Valid issuer URL is required'),
  discoveryUrl: z.string().url().optional(),
  authorizationEndpoint: z.string().url().optional(),
  tokenEndpoint: z.string().url().optional(),
  userinfoEndpoint: z.string().url().optional(),
  jwksUri: z.string().url().optional(),
  scopes: z.array(z.string()).default(['openid', 'profile', 'email']),
  responseType: z.string().default('code'),
  responseMode: z.string().default('query'),
  usePkce: z.boolean().default(true),
  claimsMapping: z.record(z.string()).optional(),
  groupClaimsPath: z.string().optional(),
  isActive: z.boolean().default(true)
});

const updateConfigSchema = createConfigSchema.partial().omit({ name: true });

const discoverySchema = z.object({
  issuerUrl: z.string().url('Valid issuer URL is required')
});

// ============================================================================
// PUBLIC OIDC ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/sso/oidc/authorize
 * Initiate OAuth 2.0/OIDC authorization flow with PKCE
 */
router.post('/authorize',
  asyncHandler(async (req, res) => {
    const authRequest = initiateAuthSchema.parse(req.body);

    try {
      const result = await oidcService.initiateAuth(authRequest);

      logger.info('OIDC authorization initiated', {
        configId: authRequest.configId,
        state: result.state,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.json({
        success: true,
        data: {
          authUrl: result.authUrl,
          state: result.state,
          nonce: result.nonce
          // Note: codeVerifier is not returned for security (stored server-side)
        }
      });

    } catch (error) {
      logger.error('OIDC authorization initiation failed', {
        configId: authRequest.configId,
        error: error instanceof Error ? error.message : error
      });

      res.status(400).json({
        success: false,
        error: 'AUTHORIZATION_FAILED',
        message: error instanceof Error ? error.message : 'Authorization initiation failed'
      });
    }
  })
);

/**
 * GET /api/v1/sso/oidc/callback
 * Handle OAuth 2.0/OIDC authorization callback
 */
router.get('/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    // Handle OAuth error responses
    if (oauthError) {
      logger.warn('OAuth error received in callback', {
        error: oauthError,
        state,
        description: req.query.error_description
      });

      return res.status(400).json({
        success: false,
        error: 'OAUTH_ERROR',
        message: `OAuth error: ${oauthError}`,
        description: req.query.error_description
      });
    }

    // Validate required parameters
    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_CALLBACK',
        message: 'Missing authorization code or state parameter'
      });
    }

    try {
      // Extract redirect URI from request (should match what was sent to authorize)
      const redirectUri = `${req.protocol}://${req.get('host')}${req.path}`;

      const result = await oidcService.handleCallback(
        code as string,
        state as string,
        redirectUri
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'CALLBACK_FAILED',
          message: result.error || 'Callback processing failed'
        });
      }

      logger.info('OIDC callback processed successfully', {
        userId: result.user!.id,
        email: result.user!.email,
        sessionId: result.session!.id
      });

      // Return tokens and user info (frontend will handle token storage)
      res.json({
        success: true,
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            firstName: result.user!.firstName,
            lastName: result.user!.lastName,
            roles: result.user!.roles,
            permissions: result.user!.permissions
          },
          session: {
            id: result.session!.id,
            expiresAt: result.session!.expiresAt
          },
          tokens: result.tokens
        }
      });

    } catch (error) {
      logger.error('OIDC callback processing failed', {
        code: typeof code === 'string' ? code.substring(0, 20) + '...' : code,
        state,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'CALLBACK_PROCESSING_ERROR',
        message: 'Failed to process authorization callback'
      });
    }
  })
);

/**
 * POST /api/v1/sso/oidc/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const { sessionId } = refreshTokenSchema.parse(req.body);

    try {
      const tokens = await oidcService.refreshToken(sessionId);

      if (!tokens) {
        return res.status(401).json({
          success: false,
          error: 'REFRESH_FAILED',
          message: 'Unable to refresh token - session not found or refresh token invalid'
        });
      }

      logger.info('OIDC token refreshed', { sessionId });

      res.json({
        success: true,
        data: { tokens }
      });

    } catch (error) {
      logger.error('OIDC token refresh failed', {
        sessionId,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'REFRESH_ERROR',
        message: 'Token refresh failed'
      });
    }
  })
);

/**
 * POST /api/v1/sso/oidc/logout
 * Logout and revoke OIDC session
 */
router.post('/logout',
  asyncHandler(async (req, res) => {
    const { sessionId } = z.object({
      sessionId: z.string().min(1, 'Session ID is required')
    }).parse(req.body);

    try {
      const success = await oidcService.revokeSession(sessionId);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'SESSION_NOT_FOUND',
          message: 'Session not found or already revoked'
        });
      }

      logger.info('OIDC session logged out', { sessionId });

      res.json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('OIDC logout failed', {
        sessionId,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'LOGOUT_ERROR',
        message: 'Logout failed'
      });
    }
  })
);

/**
 * POST /api/v1/sso/oidc/validate
 * Validate ID token
 */
router.post('/validate',
  asyncHandler(async (req, res) => {
    const { idToken, configId } = z.object({
      idToken: z.string().min(1, 'ID token is required'),
      configId: z.string().min(1, 'Configuration ID is required')
    }).parse(req.body);

    try {
      const claims = await oidcService.validateIdToken(idToken, configId);

      if (!claims) {
        return res.status(401).json({
          success: false,
          error: 'INVALID_TOKEN',
          message: 'ID token validation failed'
        });
      }

      res.json({
        success: true,
        data: { claims }
      });

    } catch (error) {
      logger.error('ID token validation failed', {
        configId,
        error: error instanceof Error ? error.message : error
      });

      res.status(400).json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Token validation failed'
      });
    }
  })
);

// ============================================================================
// ADMIN OIDC CONFIGURATION ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/admin/oidc/configs
 * List all OIDC configurations
 */
router.get('/admin/configs',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    try {
      const configs = await prisma.oidcConfig.findMany({
        select: {
          id: true,
          name: true,
          issuer: true,
          scopes: true,
          responseType: true,
          usePkce: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          // Exclude sensitive fields
          clientId: false,
          clientSecret: false
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: configs
      });

    } catch (error) {
      logger.error('Failed to fetch OIDC configurations', {
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch configurations'
      });
    }
  })
);

/**
 * GET /api/v1/admin/oidc/configs/:id
 * Get specific OIDC configuration
 */
router.get('/admin/configs/:id',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const config = await prisma.oidcConfig.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          clientId: true,
          issuer: true,
          discoveryUrl: true,
          authorizationEndpoint: true,
          tokenEndpoint: true,
          userinfoEndpoint: true,
          jwksUri: true,
          scopes: true,
          responseType: true,
          responseMode: true,
          usePkce: true,
          claimsMapping: true,
          groupClaimsPath: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
          // Exclude clientSecret for security
        }
      });

      if (!config) {
        return res.status(404).json({
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: 'OIDC configuration not found'
        });
      }

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      logger.error('Failed to fetch OIDC configuration', {
        configId: id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'FETCH_ERROR',
        message: 'Failed to fetch configuration'
      });
    }
  })
);

/**
 * POST /api/v1/admin/oidc/configs
 * Create new OIDC configuration
 */
router.post('/admin/configs',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    const configData = createConfigSchema.parse(req.body);

    try {
      const config = await prisma.oidcConfig.create({
        data: configData,
        select: {
          id: true,
          name: true,
          issuer: true,
          scopes: true,
          isActive: true,
          createdAt: true
        }
      });

      logger.info('OIDC configuration created', {
        configId: config.id,
        name: config.name,
        issuer: configData.issuer
      });

      res.status(201).json({
        success: true,
        data: config
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        return res.status(400).json({
          success: false,
          error: 'DUPLICATE_NAME',
          message: 'Configuration with this name already exists'
        });
      }

      logger.error('Failed to create OIDC configuration', {
        name: configData.name,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'CREATE_ERROR',
        message: 'Failed to create configuration'
      });
    }
  })
);

/**
 * PUT /api/v1/admin/oidc/configs/:id
 * Update OIDC configuration
 */
router.put('/admin/configs/:id',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = updateConfigSchema.parse(req.body);

    try {
      const config = await prisma.oidcConfig.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          issuer: true,
          scopes: true,
          isActive: true,
          updatedAt: true
        }
      });

      logger.info('OIDC configuration updated', {
        configId: id,
        name: config.name
      });

      res.json({
        success: true,
        data: config
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to update not found')) {
        return res.status(404).json({
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: 'OIDC configuration not found'
        });
      }

      logger.error('Failed to update OIDC configuration', {
        configId: id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'UPDATE_ERROR',
        message: 'Failed to update configuration'
      });
    }
  })
);

/**
 * DELETE /api/v1/admin/oidc/configs/:id
 * Delete OIDC configuration
 */
router.delete('/admin/configs/:id',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      await prisma.oidcConfig.delete({
        where: { id }
      });

      logger.info('OIDC configuration deleted', { configId: id });

      res.json({
        success: true,
        message: 'Configuration deleted successfully'
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return res.status(404).json({
          success: false,
          error: 'CONFIG_NOT_FOUND',
          message: 'OIDC configuration not found'
        });
      }

      logger.error('Failed to delete OIDC configuration', {
        configId: id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'DELETE_ERROR',
        message: 'Failed to delete configuration'
      });
    }
  })
);

/**
 * POST /api/v1/admin/oidc/discovery
 * Discover OIDC provider configuration
 */
router.post('/admin/discovery',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    const { issuerUrl } = discoverySchema.parse(req.body);

    try {
      const result = await oidcService.discoverProvider(issuerUrl);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'DISCOVERY_FAILED',
          message: result.error || 'Provider discovery failed'
        });
      }

      logger.info('OIDC provider discovered', {
        issuerUrl,
        endpoints: Object.keys(result.configuration || {})
      });

      res.json({
        success: true,
        data: result.configuration
      });

    } catch (error) {
      logger.error('OIDC provider discovery failed', {
        issuerUrl,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'DISCOVERY_ERROR',
        message: 'Provider discovery failed'
      });
    }
  })
);

/**
 * POST /api/v1/admin/oidc/test/:id
 * Test OIDC provider connection
 */
router.post('/admin/test/:id',
  requirePermission('sso:admin'),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    try {
      const result = await oidcService.testConnection(id);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: 'CONNECTION_FAILED',
          message: result.error || 'Connection test failed'
        });
      }

      logger.info('OIDC connection test successful', {
        configId: id,
        endpoints: result.endpoints
      });

      res.json({
        success: true,
        data: {
          message: 'Connection test successful',
          endpoints: result.endpoints
        }
      });

    } catch (error) {
      logger.error('OIDC connection test failed', {
        configId: id,
        error: error instanceof Error ? error.message : error
      });

      res.status(500).json({
        success: false,
        error: 'TEST_ERROR',
        message: 'Connection test failed'
      });
    }
  })
);

export default router;