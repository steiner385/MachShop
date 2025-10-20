import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/config';
import { ValidationError, AuthenticationError } from '../middleware/errorHandler';
import { asyncHandler } from '../middleware/errorHandler';
import { securityLogger } from '../middleware/requestLogger';
import { logger } from '../utils/logger';
import prisma from '../lib/database';

const router = express.Router();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

// Note: Users are now stored in the database and loaded via Prisma

// Mock refresh token storage (in real implementation, this would be Redis or database)
const refreshTokens = new Set<string>();

// Generate JWT tokens
const generateTokens = (user: any) => {
  const payload = {
    userId: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    permissions: user.permissions,
    siteId: user.siteId
  };

  const accessToken = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expire
  });

  const refreshToken = jwt.sign(
    { userId: user.id },
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpire }
  );

  return { accessToken, refreshToken };
};

/**
 * @route POST /api/v1/auth/login
 * @desc User login
 * @access Public
 */
router.post('/login', 
  securityLogger('USER_LOGIN'),
  asyncHandler(async (req, res) => {
    // Validate request body
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid login data', validationResult.error.errors);
    }

    const { username, password } = validationResult.data;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { username }
    });
    
    if (!user) {
      logger.warn('Login attempt with invalid username', {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw new AuthenticationError('Invalid username or password');
    }

    // Check if user is active
    if (!user.isActive) {
      logger.warn('Login attempt for inactive user', {
        userId: user.id,
        username: user.username,
        ip: req.ip
      });
      throw new AuthenticationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      logger.warn('Login attempt with invalid password', {
        userId: user.id,
        username: user.username,
        ip: req.ip
      });
      throw new AuthenticationError('Invalid username or password');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    refreshTokens.add(refreshToken);

    // Log successful login
    logger.info('User logged in successfully', {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return response
    res.status(200).json({
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions: user.permissions,
        // siteId: user.siteId, // TODO: Add siteId to User model if needed
        isActive: user.isActive,
        lastLogin: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      },
      expiresIn: config.jwt.expire
    });
  })
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh',
  securityLogger('TOKEN_REFRESH'),
  asyncHandler(async (req, res) => {
    // Validate request body
    const validationResult = refreshTokenSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid refresh token data', validationResult.error.errors);
    }

    const { refreshToken } = validationResult.data;

    // Check if refresh token exists in storage
    if (!refreshTokens.has(refreshToken)) {
      throw new AuthenticationError('Invalid refresh token');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwt.secret) as { userId: string };
    } catch (error) {
      // Remove invalid token from storage
      refreshTokens.delete(refreshToken);
      throw new AuthenticationError('Invalid refresh token');
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      logger.warn('Token refresh failed - user not found', {
        userId: decoded.userId,
        ip: req.ip
      });
      refreshTokens.delete(refreshToken);
      throw new AuthenticationError('User not found or inactive');
    }
    
    if (!user.isActive) {
      logger.warn('Token refresh failed - user inactive', {
        userId: user.id,
        username: user.username,
        isActive: user.isActive,
        lastLogin: user.lastLoginAt,
        ip: req.ip
      });
      refreshTokens.delete(refreshToken);
      throw new AuthenticationError('User not found or inactive');
    }

    // Generate new access token
    const { accessToken } = generateTokens(user);

    logger.info('Token refreshed successfully', {
      userId: user.id,
      username: user.username,
      ip: req.ip
    });

    res.status(200).json({
      message: 'Token refreshed successfully',
      token: accessToken,
      expiresIn: config.jwt.expire
    });
  })
);

/**
 * @route POST /api/v1/auth/logout
 * @desc User logout
 * @access Private
 */
router.post('/logout',
  securityLogger('USER_LOGOUT'),
  asyncHandler(async (req, res) => {
    // Extract refresh token from request body
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove refresh token from storage
      refreshTokens.delete(refreshToken);
    }

    logger.info('User logged out', {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      message: 'Logout successful'
    });
  })
);

/**
 * @route GET /api/v1/auth/me
 * @desc Get current user information
 * @access Private
 */
router.get('/me',
  asyncHandler(async (req, res) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });
    
    if (!user) {
      logger.warn('Get current user failed - user not found', {
        userId: decoded.userId,
        ip: req.ip
      });
      throw new AuthenticationError('User not found or inactive');
    }
    
    if (!user.isActive) {
      logger.warn('Get current user failed - user inactive', {
        userId: user.id,
        username: user.username,
        isActive: user.isActive,
        lastLogin: user.lastLoginAt,
        updatedAt: user.updatedAt,
        ip: req.ip
      });
      throw new AuthenticationError('User not found or inactive');
    }

    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions: user.permissions,
        // siteId: user.siteId, // TODO: Add siteId to User model if needed
        isActive: user.isActive,
        lastLogin: user.lastLoginAt?.toISOString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      }
    });
  })
);

/**
 * @route POST /api/v1/auth/change-password
 * @desc Change user password
 * @access Private
 */
router.post('/change-password',
  securityLogger('PASSWORD_CHANGE'),
  asyncHandler(async (req, res) => {
    const changePasswordSchema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string()
        .min(8, 'New password must be at least 8 characters')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
               'Password must contain uppercase, lowercase, number and special character')
    });

    // Validate request body
    const validationResult = changePasswordSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid password data', validationResult.error.errors);
    }

    // Extract token and find user
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Access token is required');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      logger.warn('Password change attempt with invalid current password', {
        userId: user.id,
        username: user.username,
        ip: req.ip
      });
      throw new AuthenticationError('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = config.security.bcryptRounds;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    });

    logger.info('Password changed successfully', {
      userId: user.id,
      username: user.username,
      ip: req.ip
    });

    res.status(200).json({
      message: 'Password changed successfully'
    });
  })
);

export default router;