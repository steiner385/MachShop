/**
 * Authentication Service Types
 * Type definitions for Auth Service
 */

import { User } from '.prisma/client-auth';

/**
 * User payload included in JWT tokens
 */
export interface JWTPayload {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  siteId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Login request body
 */
export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserResponse;
}

/**
 * User response (safe - no password)
 */
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  permissions: string[];
  siteId: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
}

/**
 * Refresh token request body
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  token: string;
}

/**
 * Change password request body
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Auth event types for Kafka
 */
export enum AuthEventType {
  USER_LOGIN = 'auth.user.login',
  USER_LOGOUT = 'auth.user.logout',
  PASSWORD_CHANGED = 'auth.password.changed',
  TOKEN_REFRESHED = 'auth.token.refreshed',
  SESSION_EXPIRED = 'auth.session.expired',
  LOGIN_FAILED = 'auth.login.failed',
}

/**
 * Authentication event payload
 */
export interface AuthEventPayload {
  userId: string;
  username: string;
  eventType: AuthEventType;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: JWTPayload;
}

/**
 * Stored refresh token in Redis
 */
export interface StoredRefreshToken {
  userId: string;
  username: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * User session information
 */
export interface UserSession {
  sessionId: string;
  userId: string;
  token: string;
  refreshToken: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivity: Date;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Login attempt tracking
 */
export interface LoginAttempt {
  username: string;
  ipAddress: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}
