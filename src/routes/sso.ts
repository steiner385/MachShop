/**
 * SSO Authentication Routes (Issue #134)
 *
 * Public SSO authentication endpoints for unified authentication flows.
 * Integrates with the SSO orchestration service to handle multi-provider authentication.
 *
 * Endpoints:
 * - Provider discovery and selection
 * - Authentication initiation
 * - Provider callbacks
 * - Logout coordination
 * - Session management
 */

import express from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import SsoOrchestrationService from '../services/SsoOrchestrationService';
import { resolveUserPermissions } from '../services/permissionService';

const router = express.Router();

// Service instances
const orchestrationService = SsoOrchestrationService.getInstance();

// Validation schemas
const discoverProvidersSchema = z.object({
  email: z.string().email('Valid email required')
});

const initiateAuthSchema = z.object({
  email: z.string().email('Valid email required'),
  preferredProviderId: z.string().optional(),
  forceProvider: z.boolean().default(false),
  returnUrl: z.string().url().optional()
});

const callbackSchema = z.object({
  success: z.boolean(),
  userProfile: z.object({
    email: z.string().email(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional()
  }).optional(),
  providerSessionData: z.record(z.any()).optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional()
});

// ============================================================================
// PUBLIC SSO ENDPOINTS
// ============================================================================

/**
 * POST /api/v1/sso/discover
 * Discover available SSO providers for a user
 */
router.post('/discover',
  asyncHandler(async (req, res) => {
    const { email } = discoverProvidersSchema.parse(req.body);

    const result = await orchestrationService.getAvailableProviders(email);

    res.json({
      success: true,
      data: {
        recommended: result.recommended,
        alternatives: result.alternatives,
        discoveryInfo: result.discoveryResult ? {
          confidence: result.discoveryResult.confidence,
          matchedRule: result.discoveryResult.matchedRule?.name,
          fallbackUsed: result.discoveryResult.fallbackUsed
        } : null
      }
    });
  })
);

/**
 * POST /api/v1/sso/login
 * Initiate SSO authentication flow
 */
router.post('/login',
  asyncHandler(async (req, res) => {
    const authRequest = initiateAuthSchema.parse(req.body);

    // Add request metadata
    const enrichedRequest = {
      ...authRequest,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress
    };

    const result = await orchestrationService.initiateAuthentication(enrichedRequest);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.errorCode,
        message: result.errorMessage
      });
    }

    logger.info('SSO authentication initiated', {
      email: authRequest.email,
      providerId: result.provider.id,
      providerName: result.provider.name,
      userAgent: enrichedRequest.userAgent
    });

    res.json({
      success: true,
      data: {
        redirectUrl: result.redirectUrl,
        provider: {
          id: result.provider.id,
          name: result.provider.name,
          type: result.provider.type
        },
        requiresMfa: result.requiresMfa,
        mfaToken: result.mfaToken
      }
    });
  })
);

/**
 * POST /api/v1/sso/callback/:providerType
 * Handle SSO provider callbacks
 */
router.post('/callback/:providerType',
  asyncHandler(async (req, res) => {
    const { providerType } = req.params;
    const { flowId } = req.query;

    if (!flowId || typeof flowId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'MISSING_FLOW_ID',
        message: 'Flow ID is required'
      });
    }

    const callbackData = callbackSchema.parse(req.body);

    // Get the flow to determine provider ID
    const flow = orchestrationService.getFlowStatus(flowId);
    if (!flow) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_FLOW',
        message: 'Authentication flow not found or expired'
      });
    }

    const result = await orchestrationService.handleProviderCallback(flowId, {
      providerId: flow.providerId,
      ...callbackData
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.errorCode,
        message: result.errorMessage
      });
    }

    // Generate JWT tokens for successful authentication
    const tokens = await generateSsoTokens(result.user!, result.sessionId!);

    logger.info('SSO authentication completed', {
      userId: result.user!.id,
      email: result.user!.email,
      providerId: result.provider.id,
      sessionId: result.sessionId
    });

    res.json({
      success: true,
      data: {
        user: result.user,
        sessionId: result.sessionId,
        tokens,
        provider: {
          id: result.provider.id,
          name: result.provider.name,
          type: result.provider.type
        }
      }
    });
  })
);

/**
 * POST /api/v1/sso/logout
 * Initiate unified SSO logout
 */
router.post('/logout',
  asyncHandler(async (req, res) => {
    const { sessionId, userId } = req.body;

    if (!sessionId && !userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_IDENTIFIER',
        message: 'Either sessionId or userId is required'
      });
    }

    const result = await orchestrationService.initiateLogout(userId, sessionId);

    logger.info('SSO logout completed', {
      userId,
      sessionId,
      providersLoggedOut: result.providersLoggedOut,
      errors: result.errors.length
    });

    res.json({
      success: result.success,
      data: {
        providersLoggedOut: result.providersLoggedOut,
        errors: result.errors
      }
    });
  })
);

/**
 * GET /api/v1/sso/status/:flowId
 * Get authentication flow status
 */
router.get('/status/:flowId',
  asyncHandler(async (req, res) => {
    const { flowId } = req.params;

    const flow = orchestrationService.getFlowStatus(flowId);

    if (!flow) {
      return res.status(404).json({
        success: false,
        error: 'FLOW_NOT_FOUND',
        message: 'Authentication flow not found or expired'
      });
    }

    res.json({
      success: true,
      data: {
        id: flow.id,
        status: flow.status,
        email: flow.email,
        providerId: flow.providerId,
        startTime: flow.startTime,
        endTime: flow.endTime,
        redirectUrl: flow.redirectUrl
      }
    });
  })
);

// ============================================================================
// PROVIDER-SPECIFIC CALLBACK ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/sso/callback/saml
 * SAML provider callback (typically POST, but supporting GET for some providers)
 */
router.all('/callback/saml',
  asyncHandler(async (req, res) => {
    const { flowId, SAMLResponse } = req.method === 'POST' ? req.body : req.query;

    if (!flowId || !SAMLResponse) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SAML_RESPONSE',
        message: 'Missing flowId or SAMLResponse'
      });
    }

    try {
      // Parse SAML response (would use actual SAML library in production)
      const userProfile = await parseSamlResponse(SAMLResponse);

      const flow = orchestrationService.getFlowStatus(flowId);
      if (!flow) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_FLOW',
          message: 'Authentication flow not found or expired'
        });
      }

      const result = await orchestrationService.handleProviderCallback(flowId, {
        providerId: flow.providerId,
        success: true,
        userProfile,
        providerSessionData: { samlResponse: SAMLResponse }
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.errorCode,
          message: result.errorMessage
        });
      }

      // Generate tokens and redirect
      const tokens = await generateSsoTokens(result.user!, result.sessionId!);

      // Redirect to frontend with tokens (or return JSON for API clients)
      const returnUrl = flow.metadata.returnUrl || `${process.env.FRONTEND_URL}/auth/callback`;
      const redirectUrl = `${returnUrl}?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      res.redirect(redirectUrl);

    } catch (error) {
      logger.error('SAML callback processing failed', { error, flowId });
      res.status(500).json({
        success: false,
        error: 'SAML_PROCESSING_ERROR',
        message: 'Failed to process SAML response'
      });
    }
  })
);

/**
 * GET /api/v1/sso/callback/oidc
 * OIDC/OAuth provider callback
 */
router.get('/callback/oidc',
  asyncHandler(async (req, res) => {
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.status(400).json({
        success: false,
        error: 'OIDC_ERROR',
        message: `OAuth error: ${oauthError}`
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_OIDC_CALLBACK',
        message: 'Missing authorization code or state'
      });
    }

    try {
      // Parse state to get flow ID (state should contain the flow ID)
      const flowId = state as string;

      const flow = orchestrationService.getFlowStatus(flowId);
      if (!flow) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_FLOW',
          message: 'Authentication flow not found or expired'
        });
      }

      // Exchange code for tokens and get user profile
      const { userProfile, sessionData } = await exchangeOidcCode(code as string, flow.providerId);

      const result = await orchestrationService.handleProviderCallback(flowId, {
        providerId: flow.providerId,
        success: true,
        userProfile,
        providerSessionData: sessionData
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.errorCode,
          message: result.errorMessage
        });
      }

      // Generate tokens and redirect
      const tokens = await generateSsoTokens(result.user!, result.sessionId!);
      const returnUrl = flow.metadata.returnUrl || `${process.env.FRONTEND_URL}/auth/callback`;
      const redirectUrl = `${returnUrl}?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      res.redirect(redirectUrl);

    } catch (error) {
      logger.error('OIDC callback processing failed', { error, code, state });
      res.status(500).json({
        success: false,
        error: 'OIDC_PROCESSING_ERROR',
        message: 'Failed to process OIDC callback'
      });
    }
  })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate JWT tokens for SSO authenticated user
 */
async function generateSsoTokens(user: any, sessionId: string) {
  try {
    // Get user permissions using RBAC system
    let resolvedPermissions;
    let effectiveRoles: string[] = [];
    let effectivePermissions: string[] = [];

    try {
      resolvedPermissions = await resolveUserPermissions(user.id);
      effectiveRoles = [...resolvedPermissions.globalRoles];
      effectivePermissions = resolvedPermissions.permissions;
    } catch (error) {
      logger.warn('Failed to resolve SSO user permissions, using defaults', {
        userId: user.id,
        error
      });
      effectiveRoles = user.roles || ['user'];
      effectivePermissions = user.permissions || [];
    }

    const payload = {
      userId: user.id,
      username: user.username || user.email,
      email: user.email,
      roles: effectiveRoles,
      permissions: effectivePermissions,
      sessionId, // Include SSO session ID
      authType: 'sso', // Mark as SSO authentication
      rbacEnabled: !!resolvedPermissions,
      isSystemAdmin: resolvedPermissions?.isSystemAdmin || false
    };

    const jwtSecret = process.env.NODE_ENV === 'test' ? process.env.JWT_SECRET : config.jwt.secret;
    const jwtExpire = process.env.NODE_ENV === 'test' ? process.env.JWT_EXPIRE : config.jwt.expire;
    const jwtRefreshExpire = process.env.NODE_ENV === 'test' ? process.env.JWT_REFRESH_EXPIRE : config.jwt.refreshExpire;

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: jwtExpire
    });

    const refreshToken = jwt.sign(
      { userId: user.id, sessionId },
      jwtSecret,
      { expiresIn: jwtRefreshExpire }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: jwtExpire
    };

  } catch (error) {
    logger.error('Failed to generate SSO tokens', { error, userId: user.id });
    throw error;
  }
}

/**
 * Parse SAML response (mock implementation)
 */
async function parseSamlResponse(samlResponse: string): Promise<any> {
  // This would use a proper SAML library like node-saml
  // For now, return a mock user profile
  return {
    email: 'user@company.com',
    firstName: 'SAML',
    lastName: 'User'
  };
}

/**
 * Exchange OIDC authorization code for tokens (mock implementation)
 */
async function exchangeOidcCode(code: string, providerId: string): Promise<{
  userProfile: any;
  sessionData: any;
}> {
  // This would implement the actual OIDC token exchange
  // For now, return mock data
  return {
    userProfile: {
      email: 'user@company.com',
      firstName: 'OIDC',
      lastName: 'User'
    },
    sessionData: {
      accessToken: 'mock_access_token',
      refreshToken: 'mock_refresh_token',
      expiresIn: 3600
    }
  };
}

export default router;