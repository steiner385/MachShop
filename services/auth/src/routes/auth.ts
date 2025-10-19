/**
 * Authentication Routes
 * HTTP endpoints for authentication operations
 */

import { Router, Request, Response } from 'express';
import { getAuthService } from '../services/AuthService';
import { getTokenService } from '../services/TokenService';
import {
  LoginRequest,
  RefreshTokenRequest,
  ChangePasswordRequest,
  AuthenticatedRequest,
} from '../types';

const router = Router();
const authService = getAuthService();
const tokenService = getTokenService();

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT tokens
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const loginData: LoginRequest = req.body;

    // Validate request body
    if (!loginData.username || !loginData.password) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Username and password are required',
      });
    }

    // Get client metadata
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Perform login
    const result = await authService.login(loginData, { ipAddress, userAgent });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('[AUTH] Login error:', error);

    // Handle specific errors
    if (error.message === 'Invalid username or password') {
      return res.status(401).json({
        error: 'Authentication Failed',
        message: error.message,
      });
    }

    if (error.message === 'Account is inactive') {
      return res.status(403).json({
        error: 'Account Inactive',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during login',
    });
  }
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required',
      });
    }

    // Refresh the access token
    const newAccessToken = await authService.refreshToken(refreshToken);

    res.status(200).json({
      token: newAccessToken,
    });
  } catch (error: any) {
    console.error('[AUTH] Token refresh error:', error);

    if (
      error.message.includes('Invalid') ||
      error.message.includes('expired') ||
      error.message.includes('revoked')
    ) {
      return res.status(401).json({
        error: 'Invalid Token',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during token refresh',
    });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user by revoking refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Refresh token is required',
      });
    }

    // Logout (revoke refresh token)
    await authService.logout(refreshToken);

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('[AUTH] Logout error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during logout',
    });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user information from token
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    // Get user from database
    const user = await authService.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account is inactive',
      });
    }

    res.status(200).json(user);
  } catch (error: any) {
    console.error('[AUTH] Get current user error:', error);

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while fetching user information',
    });
  }
});

/**
 * POST /api/v1/auth/change-password
 * Change user password
 * Requires authentication
 */
router.post('/change-password', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided',
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    let decoded;
    try {
      decoded = tokenService.verifyAccessToken(token);
    } catch (error) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    const changePasswordData: ChangePasswordRequest = req.body;

    // Validate request body
    if (!changePasswordData.currentPassword || !changePasswordData.newPassword) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Current password and new password are required',
      });
    }

    // Validate new password length
    if (changePasswordData.newPassword.length < 6) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'New password must be at least 6 characters long',
      });
    }

    // Change password
    await authService.changePassword(decoded.userId, changePasswordData);

    res.status(200).json({
      message: 'Password changed successfully. Please login again.',
    });
  } catch (error: any) {
    console.error('[AUTH] Change password error:', error);

    // Handle specific errors
    if (error.message === 'Current password is incorrect') {
      return res.status(400).json({
        error: 'Invalid Password',
        message: error.message,
      });
    }

    if (error.message.includes('Password must')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: error.message,
      });
    }

    if (error.message.includes('recently')) {
      return res.status(400).json({
        error: 'Password Reuse',
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while changing password',
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await authService.healthCheck();

    if (health.database && health.redis) {
      return res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'auth-service',
        checks: health,
      });
    }

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      checks: health,
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
      error: 'Health check failed',
    });
  }
});

export default router;
