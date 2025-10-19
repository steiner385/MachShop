/**
 * Authentication Service
 * Core authentication business logic
 */

import bcrypt from 'bcryptjs';
import { PrismaClient } from '.prisma/client-auth';
import { TokenService } from './TokenService';
import { config } from '../config/config';
import {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  UserResponse,
  AuthEventType,
  AuthEventPayload,
} from '../types';

export class AuthService {
  private prisma: PrismaClient;
  private tokenService: TokenService;

  constructor(prisma?: PrismaClient, tokenService?: TokenService) {
    this.prisma = prisma || new PrismaClient();
    this.tokenService = tokenService || new TokenService();
  }

  /**
   * Authenticate user with username and password
   */
  async login(
    loginData: LoginRequest,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<LoginResponse> {
    const { username, password } = loginData;

    // Find user by username
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      // Log failed login attempt
      await this.logLoginAttempt(username, false, 'User not found', metadata?.ipAddress);
      throw new Error('Invalid username or password');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.logLoginAttempt(username, false, 'Account inactive', metadata?.ipAddress);
      throw new Error('Account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.logLoginAttempt(username, false, 'Invalid password', metadata?.ipAddress);
      throw new Error('Invalid username or password');
    }

    // Update last login time
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const userResponse = this.toUserResponse(user);
    const accessToken = this.tokenService.generateAccessToken(userResponse);
    const refreshToken = this.tokenService.generateRefreshToken(userResponse);

    // Store refresh token in Redis
    const refreshTokenExpiry = this.tokenService.parseExpirationToSeconds(
      config.jwt.refreshTokenExpire
    );
    await this.tokenService.storeRefreshToken(
      user.id,
      user.username,
      refreshToken,
      refreshTokenExpiry,
      metadata
    );

    // Create user session record
    await this.createUserSession(
      user.id,
      accessToken,
      refreshToken,
      metadata
    );

    // Log successful login
    await this.logLoginAttempt(username, true, undefined, metadata?.ipAddress);

    // Publish login event (will be implemented when integrating EventPublisher)
    await this.publishAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: AuthEventType.USER_LOGIN,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      timestamp: new Date(),
    });

    return {
      token: accessToken,
      refreshToken,
      user: userResponse,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<string> {
    // Verify refresh token JWT
    let decoded;
    try {
      decoded = this.tokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }

    // Check if refresh token exists in Redis
    const isValid = await this.tokenService.isRefreshTokenValid(refreshToken);
    if (!isValid) {
      throw new Error('Refresh token has been revoked');
    }

    // Verify user still exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || !user.isActive) {
      // Revoke the refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const userResponse = this.toUserResponse(user);
    const newAccessToken = this.tokenService.generateAccessToken(userResponse);

    // Publish token refresh event
    await this.publishAuthEvent({
      userId: user.id,
      username: user.username,
      eventType: AuthEventType.TOKEN_REFRESHED,
      timestamp: new Date(),
    });

    return newAccessToken;
  }

  /**
   * Logout user by revoking refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    // Get token data before revoking
    const tokenData = await this.tokenService.getRefreshToken(refreshToken);

    if (tokenData) {
      // Revoke refresh token
      await this.tokenService.revokeRefreshToken(refreshToken);

      // Mark session as ended
      await this.endUserSession(refreshToken);

      // Publish logout event
      await this.publishAuthEvent({
        userId: tokenData.userId,
        username: tokenData.username,
        eventType: AuthEventType.USER_LOGOUT,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get user information by ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.toUserResponse(user);
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    changePasswordData: ChangePasswordRequest
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordData;

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Check password history (prevent reuse)
    await this.checkPasswordHistory(userId, newPassword);

    // Hash new password
    const newPasswordHash = await bcrypt.hash(
      newPassword,
      config.security.bcryptRounds
    );

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Add to password history
    await this.addPasswordHistory(userId, newPasswordHash);

    // Revoke all refresh tokens (force re-login on all devices)
    await this.tokenService.revokeAllUserTokens(userId);

    // Publish password changed event
    await this.publishAuthEvent({
      userId,
      username: user.username,
      eventType: AuthEventType.PASSWORD_CHANGED,
      timestamp: new Date(),
    });
  }

  /**
   * Validate password complexity
   */
  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      throw new Error('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new Error('Password must contain at least one number');
    }

    // Optional: Check for special characters
    // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    //   throw new Error('Password must contain at least one special character');
    // }
  }

  /**
   * Check password history to prevent reuse
   */
  private async checkPasswordHistory(
    userId: string,
    newPassword: string
  ): Promise<void> {
    // Get last 5 passwords from history
    const passwordHistory = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
      take: 5,
    });

    // Check if new password matches any of the previous passwords
    for (const historyEntry of passwordHistory) {
      const matches = await bcrypt.compare(newPassword, historyEntry.passwordHash);
      if (matches) {
        throw new Error('Password has been used recently. Please choose a different password.');
      }
    }
  }

  /**
   * Add password to history
   */
  private async addPasswordHistory(
    userId: string,
    passwordHash: string
  ): Promise<void> {
    await this.prisma.passwordHistory.create({
      data: {
        userId,
        passwordHash,
        changedAt: new Date(),
      },
    });

    // Keep only last 10 passwords in history
    const allHistory = await this.prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: 'desc' },
    });

    if (allHistory.length > 10) {
      const toDelete = allHistory.slice(10);
      await this.prisma.passwordHistory.deleteMany({
        where: {
          id: { in: toDelete.map(h => h.id) },
        },
      });
    }
  }

  /**
   * Create user session record
   */
  private async createUserSession(
    userId: string,
    accessToken: string,
    refreshToken: string,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setTime(
      expiresAt.getTime() +
      this.tokenService.parseExpirationToSeconds(config.jwt.refreshTokenExpire) * 1000
    );

    await this.prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
        expiresAt,
        isActive: true,
      },
    });
  }

  /**
   * End user session
   */
  private async endUserSession(refreshToken: string): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: {
        refreshToken,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Log login attempt
   */
  private async logLoginAttempt(
    username: string,
    success: boolean,
    failureReason?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await this.prisma.loginHistory.create({
        data: {
          username,
          success,
          failureReason,
          ipAddress,
          attemptedAt: new Date(),
        },
      });
    } catch (error) {
      // Don't fail auth if logging fails
      console.error('Failed to log login attempt:', error);
    }
  }

  /**
   * Publish authentication event (stub - will implement with EventPublisher)
   */
  private async publishAuthEvent(event: AuthEventPayload): Promise<void> {
    // TODO: Integrate with EventPublisher from shared library
    console.log('[AUTH EVENT]', event.eventType, event.username);
  }

  /**
   * Convert User entity to UserResponse (remove sensitive fields)
   */
  private toUserResponse(user: any): UserResponse {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
      siteId: user.siteId,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
    await this.tokenService.close();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ database: boolean; redis: boolean }> {
    const database = await this.checkDatabaseHealth();
    const redis = await this.tokenService.healthCheck();

    return { database, redis };
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let authServiceInstance: AuthService | null = null;

export function getAuthService(
  prisma?: PrismaClient,
  tokenService?: TokenService
): AuthService {
  if (!authServiceInstance) {
    authServiceInstance = new AuthService(prisma, tokenService);
  }
  return authServiceInstance;
}

export default AuthService;
