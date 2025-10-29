/**
 * SSO Session Management Service (Issue #134)
 *
 * Handles unified session management across multiple SSO providers.
 * Provides session creation, tracking, renewal, and coordinated logout functionality.
 *
 * Features:
 * - Unified session handling across multiple providers
 * - Cross-provider session sharing
 * - Automated session renewal and cleanup
 * - Coordinated logout across all active providers
 * - Session security and validation
 * - Session analytics and monitoring
 */

import { EventEmitter } from 'events';
import { SsoSession, SsoProvider, User } from '@prisma/client';
import prisma from '../lib/database';
import { logger } from '../utils/logger';
import SsoProviderService from './SsoProviderService';

export interface SessionInfo {
  id: string;
  userId: string;
  primaryProviderId: string;
  activeProviders: string[];
  sessionData: Record<string, any>;
  expiresAt: Date | null;
  lastActivityAt: Date;
  createdAt: Date;
}

export interface CreateSessionRequest {
  userId: string;
  primaryProviderId: string;
  sessionData?: Record<string, any>;
  expiresAt?: Date;
}

export interface SessionValidationResult {
  isValid: boolean;
  isExpired: boolean;
  needsRefresh: boolean;
  timeUntilExpiry?: number;
  errorMessage?: string;
}

export interface SessionActivity {
  sessionId: string;
  activity: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export class SsoSessionService extends EventEmitter {
  private static instance: SsoSessionService;
  private providerService: SsoProviderService;
  private cleanupInterval?: NodeJS.Timeout;
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly REFRESH_BUFFER = 600000; // 10 minutes before expiry
  private readonly MAX_SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 hours

  private constructor() {
    super();
    this.providerService = SsoProviderService.getInstance();
    this.startSessionCleanup();
  }

  public static getInstance(): SsoSessionService {
    if (!SsoSessionService.instance) {
      SsoSessionService.instance = new SsoSessionService();
    }
    return SsoSessionService.instance;
  }

  /**
   * Create a new SSO session
   */
  async createSession(request: CreateSessionRequest): Promise<SessionInfo> {
    try {
      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: request.userId }
      });

      if (!user) {
        throw new Error(`User with ID '${request.userId}' not found`);
      }

      // Validate primary provider exists and is active
      const provider = await this.providerService.getProviderById(request.primaryProviderId);
      if (!provider || !provider.isActive) {
        throw new Error(`Provider with ID '${request.primaryProviderId}' not found or inactive`);
      }

      // Check for existing active sessions
      await this.cleanupExpiredSessionsForUser(request.userId);

      // Set default expiry if not provided
      const expiresAt = request.expiresAt || new Date(Date.now() + this.MAX_SESSION_DURATION);

      // Create the session
      const session = await prisma.ssoSession.create({
        data: {
          userId: request.userId,
          primaryProviderId: request.primaryProviderId,
          activeProviders: [request.primaryProviderId],
          sessionData: request.sessionData || {},
          expiresAt,
          lastActivityAt: new Date()
        }
      });

      const sessionInfo = this.mapToSessionInfo(session);

      logger.info('SSO session created', {
        sessionId: session.id,
        userId: request.userId,
        providerId: request.primaryProviderId,
        expiresAt
      });

      this.emit('sessionCreated', sessionInfo);
      await this.trackSessionActivity(session.id, 'session_created');

      return sessionInfo;

    } catch (error) {
      logger.error('Failed to create SSO session', { error, request });
      throw error;
    }
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const session = await prisma.ssoSession.findUnique({
      where: { id: sessionId }
    });

    return session ? this.mapToSessionInfo(session) : null;
  }

  /**
   * Get active sessions for a user
   */
  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await prisma.ssoSession.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { lastActivityAt: 'desc' }
    });

    return sessions.map(session => this.mapToSessionInfo(session));
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, activity?: string): Promise<SessionInfo> {
    try {
      const session = await prisma.ssoSession.update({
        where: { id: sessionId },
        data: { lastActivityAt: new Date() }
      });

      if (activity) {
        await this.trackSessionActivity(sessionId, activity);
      }

      const sessionInfo = this.mapToSessionInfo(session);
      this.emit('sessionActivity', sessionInfo);

      return sessionInfo;

    } catch (error) {
      logger.error('Failed to update session activity', { error, sessionId });
      throw error;
    }
  }

  /**
   * Add provider to existing session
   */
  async addProviderToSession(sessionId: string, providerId: string): Promise<SessionInfo> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      // Validate provider
      const provider = await this.providerService.getProviderById(providerId);
      if (!provider || !provider.isActive) {
        throw new Error(`Provider with ID '${providerId}' not found or inactive`);
      }

      // Check if provider is already active
      if (session.activeProviders.includes(providerId)) {
        return session;
      }

      const updatedProviders = [...session.activeProviders, providerId];

      const updatedSession = await prisma.ssoSession.update({
        where: { id: sessionId },
        data: {
          activeProviders: updatedProviders,
          lastActivityAt: new Date()
        }
      });

      const sessionInfo = this.mapToSessionInfo(updatedSession);

      logger.info('Provider added to SSO session', {
        sessionId,
        providerId,
        totalProviders: updatedProviders.length
      });

      this.emit('providerAdded', { sessionInfo, providerId });
      await this.trackSessionActivity(sessionId, 'provider_added', { providerId });

      return sessionInfo;

    } catch (error) {
      logger.error('Failed to add provider to session', { error, sessionId, providerId });
      throw error;
    }
  }

  /**
   * Remove provider from session
   */
  async removeProviderFromSession(sessionId: string, providerId: string): Promise<SessionInfo> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      const updatedProviders = session.activeProviders.filter(id => id !== providerId);

      // If removing the primary provider, promote another provider
      let updatedPrimaryProviderId = session.primaryProviderId;
      if (session.primaryProviderId === providerId && updatedProviders.length > 0) {
        updatedPrimaryProviderId = updatedProviders[0];
      }

      const updatedSession = await prisma.ssoSession.update({
        where: { id: sessionId },
        data: {
          primaryProviderId: updatedPrimaryProviderId,
          activeProviders: updatedProviders,
          lastActivityAt: new Date()
        }
      });

      const sessionInfo = this.mapToSessionInfo(updatedSession);

      logger.info('Provider removed from SSO session', {
        sessionId,
        providerId,
        remainingProviders: updatedProviders.length
      });

      this.emit('providerRemoved', { sessionInfo, providerId });
      await this.trackSessionActivity(sessionId, 'provider_removed', { providerId });

      return sessionInfo;

    } catch (error) {
      logger.error('Failed to remove provider from session', { error, sessionId, providerId });
      throw error;
    }
  }

  /**
   * Validate session and check expiry
   */
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    try {
      const session = await this.getSession(sessionId);

      if (!session) {
        return {
          isValid: false,
          isExpired: false,
          needsRefresh: false,
          errorMessage: 'Session not found'
        };
      }

      const now = new Date();

      // Check if session is expired
      if (session.expiresAt && session.expiresAt <= now) {
        return {
          isValid: false,
          isExpired: true,
          needsRefresh: false,
          errorMessage: 'Session expired'
        };
      }

      // Check if session needs refresh
      const needsRefresh = session.expiresAt &&
        (session.expiresAt.getTime() - now.getTime()) < this.REFRESH_BUFFER;

      const timeUntilExpiry = session.expiresAt
        ? session.expiresAt.getTime() - now.getTime()
        : undefined;

      return {
        isValid: true,
        isExpired: false,
        needsRefresh: !!needsRefresh,
        timeUntilExpiry
      };

    } catch (error) {
      logger.error('Failed to validate session', { error, sessionId });
      return {
        isValid: false,
        isExpired: false,
        needsRefresh: false,
        errorMessage: 'Validation error'
      };
    }
  }

  /**
   * Extend session expiry
   */
  async extendSession(sessionId: string, additionalTime?: number): Promise<SessionInfo> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session with ID '${sessionId}' not found`);
      }

      const extensionTime = additionalTime || this.MAX_SESSION_DURATION;
      const newExpiryTime = new Date(Date.now() + extensionTime);

      const updatedSession = await prisma.ssoSession.update({
        where: { id: sessionId },
        data: {
          expiresAt: newExpiryTime,
          lastActivityAt: new Date()
        }
      });

      const sessionInfo = this.mapToSessionInfo(updatedSession);

      logger.info('SSO session extended', {
        sessionId,
        newExpiryTime,
        extensionTime
      });

      this.emit('sessionExtended', sessionInfo);
      await this.trackSessionActivity(sessionId, 'session_extended');

      return sessionInfo;

    } catch (error) {
      logger.error('Failed to extend session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Logout user from all providers
   */
  async logoutSession(sessionId: string, reason = 'user_logout'): Promise<void> {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        logger.warn(`Session ${sessionId} not found for logout`);
        return;
      }

      // Perform logout with each active provider
      const logoutPromises = session.activeProviders.map(async (providerId) => {
        try {
          await this.performProviderLogout(sessionId, providerId);
        } catch (error) {
          logger.warn(`Failed to logout from provider ${providerId}`, {
            error,
            sessionId
          });
        }
      });

      await Promise.allSettled(logoutPromises);

      // Delete the session
      await prisma.ssoSession.delete({
        where: { id: sessionId }
      });

      logger.info('SSO session logged out', {
        sessionId,
        userId: session.userId,
        reason,
        providersLoggedOut: session.activeProviders.length
      });

      this.emit('sessionLoggedOut', { sessionInfo: session, reason });
      await this.trackSessionActivity(sessionId, 'session_logout', { reason });

    } catch (error) {
      logger.error('Failed to logout session', { error, sessionId });
      throw error;
    }
  }

  /**
   * Logout user from all sessions
   */
  async logoutUserFromAllSessions(userId: string, reason = 'admin_logout'): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);

      const logoutPromises = sessions.map(session =>
        this.logoutSession(session.id, reason)
      );

      await Promise.allSettled(logoutPromises);

      logger.info('User logged out from all sessions', {
        userId,
        sessionsCount: sessions.length,
        reason
      });

    } catch (error) {
      logger.error('Failed to logout user from all sessions', { error, userId });
      throw error;
    }
  }

  /**
   * Get session statistics
   */
  async getSessionStatistics(): Promise<{
    totalActiveSessions: number;
    sessionsByProvider: Array<{ providerId: string; count: number }>;
    avgSessionDuration: number;
    expiringSoon: number;
  }> {
    const now = new Date();
    const soonThreshold = new Date(now.getTime() + this.REFRESH_BUFFER);

    const [totalActive, sessionsByProvider, expiringSoon] = await Promise.all([
      prisma.ssoSession.count({
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        }
      }),

      prisma.ssoSession.groupBy({
        by: ['primaryProviderId'],
        where: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: now } }
          ]
        },
        _count: { id: true }
      }),

      prisma.ssoSession.count({
        where: {
          expiresAt: {
            gt: now,
            lt: soonThreshold
          }
        }
      })
    ]);

    // Calculate average session duration (simplified)
    const avgSessionDuration = this.MAX_SESSION_DURATION / 2; // Placeholder calculation

    return {
      totalActiveSessions: totalActive,
      sessionsByProvider: sessionsByProvider.map(item => ({
        providerId: item.primaryProviderId,
        count: item._count.id
      })),
      avgSessionDuration,
      expiringSoon
    };
  }

  /**
   * Private methods
   */

  private mapToSessionInfo(session: SsoSession): SessionInfo {
    return {
      id: session.id,
      userId: session.userId,
      primaryProviderId: session.primaryProviderId,
      activeProviders: session.activeProviders,
      sessionData: session.sessionData as Record<string, any>,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
      createdAt: session.createdAt
    };
  }

  private async cleanupExpiredSessionsForUser(userId: string): Promise<void> {
    const now = new Date();

    const expiredSessions = await prisma.ssoSession.findMany({
      where: {
        userId,
        expiresAt: { lt: now }
      }
    });

    if (expiredSessions.length > 0) {
      await prisma.ssoSession.deleteMany({
        where: {
          userId,
          expiresAt: { lt: now }
        }
      });

      logger.info(`Cleaned up ${expiredSessions.length} expired sessions for user ${userId}`);
    }
  }

  private async performProviderLogout(sessionId: string, providerId: string): Promise<void> {
    // This would integrate with provider-specific logout mechanisms
    // For now, we'll just log the action
    logger.info('Performing provider logout', { sessionId, providerId });
  }

  private async trackSessionActivity(
    sessionId: string,
    activity: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // This would integrate with the analytics service
      // For now, just log the activity
      logger.info('Session activity tracked', {
        sessionId,
        activity,
        metadata,
        timestamp: new Date()
      });
    } catch (error) {
      logger.warn('Failed to track session activity', { error });
    }
  }

  private startSessionCleanup(): void {
    this.cleanupInterval = setInterval(async () => {
      try {
        const now = new Date();

        const expiredSessions = await prisma.ssoSession.findMany({
          where: { expiresAt: { lt: now } },
          select: { id: true, userId: true }
        });

        if (expiredSessions.length > 0) {
          await prisma.ssoSession.deleteMany({
            where: { expiresAt: { lt: now } }
          });

          logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);

          // Emit cleanup event
          this.emit('sessionsCleanedUp', {
            count: expiredSessions.length,
            sessionIds: expiredSessions.map(s => s.id)
          });
        }

      } catch (error) {
        logger.error('Failed to cleanup expired sessions', { error });
      }
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.removeAllListeners();
  }
}

export default SsoSessionService;