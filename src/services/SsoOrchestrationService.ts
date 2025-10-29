/**
 * SSO Authentication Orchestration Service (Issue #134)
 *
 * Main orchestration service for unified SSO authentication flows.
 * Coordinates provider selection, authentication initiation, and callback handling.
 *
 * Features:
 * - Intelligent provider selection and routing
 * - Authentication flow orchestration
 * - Failover and error recovery
 * - Cross-provider session coordination
 * - Comprehensive event tracking and analytics
 */

import { EventEmitter } from 'events';
import { SsoProvider, AuthenticationEventType } from '@prisma/client';
import prisma from '../lib/database';
import { logger } from '../utils/logger';
import SsoProviderService from './SsoProviderService';
import HomeRealmDiscoveryService from './HomeRealmDiscoveryService';
import SsoSessionService from './SsoSessionService';

export interface AuthenticationRequest {
  email: string;
  userAgent?: string;
  ipAddress?: string;
  preferredProviderId?: string;
  returnUrl?: string;
  forceProvider?: boolean;
  metadata?: Record<string, any>;
}

export interface AuthenticationResult {
  success: boolean;
  sessionId?: string;
  redirectUrl?: string;
  provider: SsoProvider;
  user?: any;
  errorCode?: string;
  errorMessage?: string;
  requiresMfa?: boolean;
  mfaToken?: string;
}

export interface ProviderCallback {
  providerId: string;
  success: boolean;
  userProfile?: any;
  providerSessionData?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
}

export interface AuthenticationFlow {
  id: string;
  email: string;
  providerId: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  redirectUrl?: string;
  metadata: Record<string, any>;
}

export class SsoOrchestrationService extends EventEmitter {
  private static instance: SsoOrchestrationService;
  private providerService: SsoProviderService;
  private discoveryService: HomeRealmDiscoveryService;
  private sessionService: SsoSessionService;
  private activeFlows = new Map<string, AuthenticationFlow>();
  private readonly FLOW_TIMEOUT = 600000; // 10 minutes

  private constructor() {
    super();
    this.providerService = SsoProviderService.getInstance();
    this.discoveryService = HomeRealmDiscoveryService.getInstance();
    this.sessionService = SsoSessionService.getInstance();
    this.startFlowCleanup();
  }

  public static getInstance(): SsoOrchestrationService {
    if (!SsoOrchestrationService.instance) {
      SsoOrchestrationService.instance = new SsoOrchestrationService();
    }
    return SsoOrchestrationService.instance;
  }

  /**
   * Initiate authentication flow
   */
  async initiateAuthentication(request: AuthenticationRequest): Promise<AuthenticationResult> {
    const flowId = this.generateFlowId();

    try {
      logger.info('Starting SSO authentication flow', {
        flowId,
        email: request.email,
        preferredProvider: request.preferredProviderId,
        userAgent: request.userAgent
      });

      // Track authentication event
      await this.trackAuthenticationEvent({
        email: request.email,
        eventType: 'LOGIN',
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
        metadata: { flowId, preferredProvider: request.preferredProviderId }
      });

      // Select provider
      const provider = await this.selectProvider(request);
      if (!provider) {
        return this.createFailureResult(
          'NO_PROVIDER',
          'No suitable authentication provider found'
        );
      }

      // Create authentication flow
      const flow: AuthenticationFlow = {
        id: flowId,
        email: request.email,
        providerId: provider.id,
        status: 'initiated',
        startTime: new Date(),
        metadata: {
          userAgent: request.userAgent,
          ipAddress: request.ipAddress,
          returnUrl: request.returnUrl,
          ...request.metadata
        }
      };

      this.activeFlows.set(flowId, flow);

      // Initiate provider-specific authentication
      const authResult = await this.initiateProviderAuthentication(provider, request, flowId);

      // Update flow status
      flow.status = authResult.success ? 'in_progress' : 'failed';
      flow.redirectUrl = authResult.redirectUrl;

      this.emit('authenticationInitiated', {
        flowId,
        provider,
        request,
        result: authResult
      });

      return authResult;

    } catch (error) {
      logger.error('Failed to initiate authentication', { error, flowId, request });

      await this.trackAuthenticationEvent({
        email: request.email,
        eventType: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: { flowId, error: String(error) }
      });

      return this.createFailureResult(
        'INITIATION_ERROR',
        error instanceof Error ? error.message : 'Failed to initiate authentication'
      );
    }
  }

  /**
   * Handle provider callback
   */
  async handleProviderCallback(
    flowId: string,
    callback: ProviderCallback
  ): Promise<AuthenticationResult> {
    try {
      const flow = this.activeFlows.get(flowId);
      if (!flow) {
        throw new Error(`Authentication flow ${flowId} not found or expired`);
      }

      logger.info('Processing provider callback', {
        flowId,
        providerId: callback.providerId,
        success: callback.success
      });

      // Validate provider matches flow
      if (flow.providerId !== callback.providerId) {
        throw new Error('Provider mismatch in callback');
      }

      if (!callback.success) {
        flow.status = 'failed';
        flow.endTime = new Date();

        await this.trackAuthenticationEvent({
          providerId: callback.providerId,
          eventType: 'FAILURE',
          errorCode: callback.errorCode,
          errorMessage: callback.errorMessage,
          metadata: { flowId }
        });

        return this.createFailureResult(
          callback.errorCode || 'PROVIDER_ERROR',
          callback.errorMessage || 'Authentication failed at provider'
        );
      }

      // Process successful authentication
      const result = await this.processSuccessfulAuthentication(flow, callback);

      flow.status = 'completed';
      flow.endTime = new Date();

      this.emit('authenticationCompleted', {
        flowId,
        result,
        flow
      });

      // Clean up flow
      this.activeFlows.delete(flowId);

      return result;

    } catch (error) {
      logger.error('Failed to handle provider callback', { error, flowId, callback });

      await this.trackAuthenticationEvent({
        providerId: callback.providerId,
        eventType: 'FAILURE',
        errorMessage: error instanceof Error ? error.message : 'Callback processing error',
        metadata: { flowId, error: String(error) }
      });

      return this.createFailureResult(
        'CALLBACK_ERROR',
        error instanceof Error ? error.message : 'Failed to process authentication callback'
      );
    }
  }

  /**
   * Handle authentication failure with automatic failover
   */
  async handleAuthenticationFailure(
    flowId: string,
    providerId: string,
    error: string,
    enableFailover = true
  ): Promise<AuthenticationResult | null> {
    try {
      const flow = this.activeFlows.get(flowId);
      if (!flow) {
        return null;
      }

      logger.warn('Authentication failure detected', {
        flowId,
        providerId,
        error,
        enableFailover
      });

      await this.trackAuthenticationEvent({
        providerId,
        eventType: 'PROVIDER_ERROR',
        errorMessage: error,
        metadata: { flowId, enableFailover }
      });

      if (!enableFailover) {
        flow.status = 'failed';
        flow.endTime = new Date();
        return this.createFailureResult('AUTHENTICATION_FAILED', error);
      }

      // Try to find a failover provider
      const failoverProvider = await this.providerService.getFailoverProvider(
        providerId,
        flow.email
      );

      if (!failoverProvider) {
        flow.status = 'failed';
        flow.endTime = new Date();
        return this.createFailureResult(
          'NO_FAILOVER',
          'Authentication failed and no failover provider available'
        );
      }

      logger.info('Attempting failover authentication', {
        flowId,
        originalProvider: providerId,
        failoverProvider: failoverProvider.id
      });

      // Update flow for failover
      flow.providerId = failoverProvider.id;
      flow.metadata.failoverAttempt = true;
      flow.metadata.originalProvider = providerId;

      // Initiate authentication with failover provider
      const failoverResult = await this.initiateProviderAuthentication(
        failoverProvider,
        {
          email: flow.email,
          userAgent: flow.metadata.userAgent,
          ipAddress: flow.metadata.ipAddress,
          returnUrl: flow.metadata.returnUrl
        },
        flowId
      );

      this.emit('failoverInitiated', {
        flowId,
        originalProvider: providerId,
        failoverProvider,
        result: failoverResult
      });

      return failoverResult;

    } catch (error) {
      logger.error('Failed to handle authentication failure', { error, flowId, providerId });
      return this.createFailureResult(
        'FAILOVER_ERROR',
        'Failed to process authentication failure'
      );
    }
  }

  /**
   * Get available providers for user
   */
  async getAvailableProviders(email: string): Promise<{
    recommended: SsoProvider | null;
    alternatives: SsoProvider[];
    discoveryResult?: any;
  }> {
    try {
      // Use home realm discovery to find recommended provider
      const discoveryResult = await this.discoveryService.discoverProvider({
        email,
        userAgent: 'system'
      });

      // Get all available providers for this user
      const availableProviders = await this.providerService.getAvailableProvidersForUser(email);

      const recommended = discoveryResult?.provider || null;
      const alternatives = availableProviders.filter(p => p.id !== recommended?.id);

      return {
        recommended,
        alternatives,
        discoveryResult
      };

    } catch (error) {
      logger.error('Failed to get available providers', { error, email });
      return {
        recommended: null,
        alternatives: []
      };
    }
  }

  /**
   * Logout user from all SSO providers
   */
  async initiateLogout(userId: string, sessionId?: string): Promise<{
    success: boolean;
    providersLoggedOut: number;
    errors: Array<{ providerId: string; error: string }>;
  }> {
    try {
      logger.info('Initiating SSO logout', { userId, sessionId });

      if (sessionId) {
        // Logout specific session
        await this.sessionService.logoutSession(sessionId, 'user_logout');
        return {
          success: true,
          providersLoggedOut: 1,
          errors: []
        };
      } else {
        // Logout all sessions for user
        const sessions = await this.sessionService.getUserSessions(userId);
        const logoutPromises = sessions.map(session =>
          this.sessionService.logoutSession(session.id, 'user_logout')
            .catch(error => ({ error, sessionId: session.id }))
        );

        const results = await Promise.allSettled(logoutPromises);
        const errors = results
          .filter(result => result.status === 'rejected')
          .map((result: any) => ({
            providerId: 'unknown',
            error: result.reason?.message || 'Unknown error'
          }));

        return {
          success: errors.length === 0,
          providersLoggedOut: sessions.length - errors.length,
          errors
        };
      }

    } catch (error) {
      logger.error('Failed to initiate logout', { error, userId, sessionId });
      return {
        success: false,
        providersLoggedOut: 0,
        errors: [{ providerId: 'system', error: String(error) }]
      };
    }
  }

  /**
   * Get authentication flow status
   */
  getFlowStatus(flowId: string): AuthenticationFlow | null {
    return this.activeFlows.get(flowId) || null;
  }

  /**
   * Private methods
   */

  private async selectProvider(request: AuthenticationRequest): Promise<SsoProvider | null> {
    // Use preferred provider if specified and force flag is set
    if (request.preferredProviderId && request.forceProvider) {
      const provider = await this.providerService.getProviderById(request.preferredProviderId);
      if (provider && provider.isActive) {
        return provider;
      }
    }

    // Use home realm discovery
    const discoveryResult = await this.discoveryService.discoverProvider({
      email: request.email,
      userAgent: request.userAgent,
      ipAddress: request.ipAddress
    });

    if (discoveryResult?.provider) {
      return discoveryResult.provider;
    }

    // Fall back to preferred provider if discovery fails
    if (request.preferredProviderId) {
      const provider = await this.providerService.getProviderById(request.preferredProviderId);
      if (provider && provider.isActive) {
        return provider;
      }
    }

    // Get first available provider
    const availableProviders = await this.providerService.getAvailableProvidersForUser(request.email);
    return availableProviders[0] || null;
  }

  private async initiateProviderAuthentication(
    provider: SsoProvider,
    request: AuthenticationRequest,
    flowId: string
  ): Promise<AuthenticationResult> {
    try {
      // This would contain provider-specific authentication initiation logic
      // For now, we'll simulate the process

      const redirectUrl = this.generateProviderRedirectUrl(provider, request, flowId);

      await this.trackAuthenticationEvent({
        providerId: provider.id,
        eventType: 'LOGIN',
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
        metadata: {
          flowId,
          email: request.email,
          providerType: provider.type
        }
      });

      return {
        success: true,
        redirectUrl,
        provider
      };

    } catch (error) {
      logger.error('Failed to initiate provider authentication', {
        error,
        providerId: provider.id,
        flowId
      });

      return this.createFailureResult(
        'PROVIDER_INITIATION_ERROR',
        `Failed to initiate authentication with ${provider.name}`
      );
    }
  }

  private async processSuccessfulAuthentication(
    flow: AuthenticationFlow,
    callback: ProviderCallback
  ): Promise<AuthenticationResult> {
    try {
      // Extract user information from provider callback
      const userProfile = callback.userProfile;
      if (!userProfile?.email) {
        throw new Error('No email provided in user profile');
      }

      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: userProfile.email }
      });

      if (!user) {
        // Create new user if not exists
        user = await prisma.user.create({
          data: {
            email: userProfile.email,
            username: userProfile.email,
            firstName: userProfile.firstName || userProfile.given_name,
            lastName: userProfile.lastName || userProfile.family_name,
            passwordHash: '', // SSO users don't have passwords
            isActive: true,
            roles: ['user'], // Default role
            permissions: []
          }
        });

        logger.info('New SSO user created', {
          userId: user.id,
          email: user.email,
          providerId: callback.providerId
        });
      }

      // Create SSO session
      const sessionInfo = await this.sessionService.createSession({
        userId: user.id,
        primaryProviderId: callback.providerId,
        sessionData: callback.providerSessionData || {},
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000) // 8 hours
      });

      // Track successful authentication
      await this.trackAuthenticationEvent({
        userId: user.id,
        providerId: callback.providerId,
        eventType: 'LOGIN',
        metadata: {
          flowId: flow.id,
          sessionId: sessionInfo.id
        }
      });

      const provider = await this.providerService.getProviderById(callback.providerId);

      return {
        success: true,
        sessionId: sessionInfo.id,
        provider: provider!,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      };

    } catch (error) {
      logger.error('Failed to process successful authentication', {
        error,
        flowId: flow.id,
        callback
      });

      return this.createFailureResult(
        'USER_CREATION_ERROR',
        'Failed to create user session'
      );
    }
  }

  private generateProviderRedirectUrl(
    provider: SsoProvider,
    request: AuthenticationRequest,
    flowId: string
  ): string {
    // This would generate provider-specific redirect URLs
    // For now, return a placeholder
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/sso/callback/${provider.type.toLowerCase()}?flowId=${flowId}`;
  }

  private async trackAuthenticationEvent(event: {
    userId?: string;
    providerId?: string;
    eventType: AuthenticationEventType;
    userAgent?: string;
    ipAddress?: string;
    errorCode?: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
    email?: string;
  }): Promise<void> {
    try {
      // If we have email but no userId, try to find the user
      let userId = event.userId;
      if (!userId && event.email) {
        const user = await prisma.user.findUnique({
          where: { email: event.email }
        });
        userId = user?.id;
      }

      // If we have providerId, log the event
      if (event.providerId) {
        await prisma.authenticationEvent.create({
          data: {
            userId,
            providerId: event.providerId,
            eventType: event.eventType,
            userAgent: event.userAgent,
            ipAddress: event.ipAddress,
            errorCode: event.errorCode,
            errorMessage: event.errorMessage,
            metadata: event.metadata || {}
          }
        });
      }

    } catch (error) {
      logger.warn('Failed to track authentication event', { error, event });
    }
  }

  private createFailureResult(errorCode: string, errorMessage: string): AuthenticationResult {
    return {
      success: false,
      errorCode,
      errorMessage,
      provider: {} as SsoProvider // Will need to handle this better
    };
  }

  private generateFlowId(): string {
    return `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlowCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [flowId, flow] of this.activeFlows.entries()) {
        if (now - flow.startTime.getTime() > this.FLOW_TIMEOUT) {
          logger.info('Cleaning up expired authentication flow', { flowId });
          this.activeFlows.delete(flowId);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.activeFlows.clear();
    this.removeAllListeners();
  }
}

export default SsoOrchestrationService;