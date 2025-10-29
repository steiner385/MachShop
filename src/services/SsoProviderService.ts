/**
 * SSO Provider Management Service (Issue #134)
 *
 * Core service for managing SSO providers in the unified SSO system.
 * Handles provider registration, configuration, status monitoring, and failover logic.
 *
 * Features:
 * - Provider CRUD operations with validation
 * - Provider health monitoring and status tracking
 * - Priority-based provider selection and load balancing
 * - Failover and fallback mechanism
 * - Configuration validation for each provider type
 */

import { EventEmitter } from 'events';
import { SsoProviderType, SsoProvider } from '@prisma/client';
import prisma from '../lib/database';
import { logger } from '../utils/logger';

export interface ProviderConfig {
  id: string;
  name: string;
  type: SsoProviderType;
  configId: string;
  priority: number;
  isActive: boolean;
  isDefault: boolean;
  domainRestrictions: string[];
  groupRestrictions: string[];
  metadata: Record<string, any>;
}

export interface ProviderStatus {
  id: string;
  isHealthy: boolean;
  isReachable: boolean;
  responseTime: number;
  lastChecked: Date;
  errorMessage?: string;
}

export interface ProviderMetrics {
  id: string;
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  averageResponseTime: number;
  lastLogin: Date | null;
}

export class SsoProviderService extends EventEmitter {
  private static instance: SsoProviderService;
  private providerStatusCache = new Map<string, ProviderStatus>();
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly HEALTH_CHECK_INTERVAL = 300000; // 5 minutes

  private constructor() {
    super();
    this.startHealthChecking();
  }

  public static getInstance(): SsoProviderService {
    if (!SsoProviderService.instance) {
      SsoProviderService.instance = new SsoProviderService();
    }
    return SsoProviderService.instance;
  }

  /**
   * Register a new SSO provider
   */
  async registerProvider(config: Omit<ProviderConfig, 'id'>): Promise<SsoProvider> {
    try {
      // Validate configuration
      await this.validateProviderConfig(config);

      // Check for naming conflicts
      const existingProvider = await prisma.ssoProvider.findUnique({
        where: { name: config.name }
      });

      if (existingProvider) {
        throw new Error(`Provider with name '${config.name}' already exists`);
      }

      // If this is set as default, unset other defaults
      if (config.isDefault) {
        await this.unsetDefaultProviders();
      }

      // Create the provider
      const provider = await prisma.ssoProvider.create({
        data: {
          name: config.name,
          type: config.type,
          configId: config.configId,
          priority: config.priority,
          isActive: config.isActive,
          isDefault: config.isDefault,
          domainRestrictions: config.domainRestrictions,
          groupRestrictions: config.groupRestrictions,
          metadata: config.metadata
        }
      });

      logger.info(`SSO Provider registered: ${provider.name} (${provider.type})`, {
        providerId: provider.id,
        type: provider.type
      });

      this.emit('providerRegistered', provider);
      return provider;

    } catch (error) {
      logger.error('Failed to register SSO provider', { error, config });
      throw error;
    }
  }

  /**
   * Update an existing SSO provider
   */
  async updateProvider(id: string, updates: Partial<ProviderConfig>): Promise<SsoProvider> {
    try {
      const existingProvider = await this.getProviderById(id);
      if (!existingProvider) {
        throw new Error(`Provider with ID '${id}' not found`);
      }

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await this.unsetDefaultProviders();
      }

      // Validate updated configuration
      const updatedConfig = { ...existingProvider, ...updates };
      await this.validateProviderConfig(updatedConfig);

      const provider = await prisma.ssoProvider.update({
        where: { id },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.type && { type: updates.type }),
          ...(updates.configId && { configId: updates.configId }),
          ...(updates.priority !== undefined && { priority: updates.priority }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive }),
          ...(updates.isDefault !== undefined && { isDefault: updates.isDefault }),
          ...(updates.domainRestrictions && { domainRestrictions: updates.domainRestrictions }),
          ...(updates.groupRestrictions && { groupRestrictions: updates.groupRestrictions }),
          ...(updates.metadata && { metadata: updates.metadata })
        }
      });

      logger.info(`SSO Provider updated: ${provider.name}`, {
        providerId: id,
        updates: Object.keys(updates)
      });

      this.emit('providerUpdated', provider);
      return provider;

    } catch (error) {
      logger.error('Failed to update SSO provider', { error, id, updates });
      throw error;
    }
  }

  /**
   * Delete an SSO provider
   */
  async deleteProvider(id: string): Promise<void> {
    try {
      const provider = await this.getProviderById(id);
      if (!provider) {
        throw new Error(`Provider with ID '${id}' not found`);
      }

      // Check if provider has active sessions
      const activeSessions = await prisma.ssoSession.count({
        where: {
          primaryProviderId: id,
          expiresAt: { gt: new Date() }
        }
      });

      if (activeSessions > 0) {
        throw new Error(`Cannot delete provider with ${activeSessions} active sessions`);
      }

      await prisma.ssoProvider.delete({
        where: { id }
      });

      // Remove from status cache
      this.providerStatusCache.delete(id);

      logger.info(`SSO Provider deleted: ${provider.name}`, {
        providerId: id
      });

      this.emit('providerDeleted', { id, name: provider.name });

    } catch (error) {
      logger.error('Failed to delete SSO provider', { error, id });
      throw error;
    }
  }

  /**
   * Get provider by ID
   */
  async getProviderById(id: string): Promise<SsoProvider | null> {
    return await prisma.ssoProvider.findUnique({
      where: { id }
    });
  }

  /**
   * Get all providers with optional filtering
   */
  async getProviders(filters?: {
    type?: SsoProviderType;
    isActive?: boolean;
    domain?: string;
  }): Promise<SsoProvider[]> {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.domain) {
      where.domainRestrictions = {
        has: filters.domain
      };
    }

    return await prisma.ssoProvider.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * Get available providers for a user based on email domain
   */
  async getAvailableProvidersForUser(email: string): Promise<SsoProvider[]> {
    const domain = email.split('@')[1];

    return await prisma.ssoProvider.findMany({
      where: {
        isActive: true,
        OR: [
          { domainRestrictions: { isEmpty: true } }, // No domain restrictions
          { domainRestrictions: { has: domain } }    // Domain is allowed
        ]
      },
      orderBy: [
        { priority: 'desc' },
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    });
  }

  /**
   * Get default provider
   */
  async getDefaultProvider(): Promise<SsoProvider | null> {
    return await prisma.ssoProvider.findFirst({
      where: {
        isActive: true,
        isDefault: true
      }
    });
  }

  /**
   * Get provider status (cached or fresh check)
   */
  async getProviderStatus(id: string, forceRefresh = false): Promise<ProviderStatus | null> {
    if (!forceRefresh && this.providerStatusCache.has(id)) {
      return this.providerStatusCache.get(id)!;
    }

    return await this.checkProviderHealth(id);
  }

  /**
   * Get provider metrics from analytics
   */
  async getProviderMetrics(id: string, days = 30): Promise<ProviderMetrics> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.authenticationEvent.findMany({
      where: {
        providerId: id,
        createdAt: { gte: since }
      }
    });

    const totalLogins = events.filter(e => e.eventType === 'LOGIN').length;
    const successfulLogins = totalLogins; // LOGIN events are successful by definition
    const failedLogins = events.filter(e => e.eventType === 'FAILURE').length;

    const responseTimes = events
      .filter(e => e.responseTime !== null)
      .map(e => e.responseTime!);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    const lastLoginEvent = events
      .filter(e => e.eventType === 'LOGIN')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

    return {
      id,
      totalLogins,
      successfulLogins,
      failedLogins,
      averageResponseTime,
      lastLogin: lastLoginEvent?.createdAt || null
    };
  }

  /**
   * Test provider connectivity
   */
  async testProviderConnectivity(id: string): Promise<{
    success: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const provider = await this.getProviderById(id);
      if (!provider) {
        throw new Error('Provider not found');
      }

      // Provider-specific connectivity tests would go here
      // For now, we'll simulate a basic test
      const testResult = await this.performProviderSpecificTest(provider);

      const responseTime = Date.now() - startTime;

      // Update status cache
      this.providerStatusCache.set(id, {
        id,
        isHealthy: testResult.success,
        isReachable: testResult.success,
        responseTime,
        lastChecked: new Date(),
        errorMessage: testResult.error
      });

      return {
        success: testResult.success,
        responseTime,
        error: testResult.error
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.providerStatusCache.set(id, {
        id,
        isHealthy: false,
        isReachable: false,
        responseTime,
        lastChecked: new Date(),
        errorMessage
      });

      return {
        success: false,
        responseTime,
        error: errorMessage
      };
    }
  }

  /**
   * Get next available provider for failover
   */
  async getFailoverProvider(excludeId: string, userEmail?: string): Promise<SsoProvider | null> {
    const providers = userEmail
      ? await this.getAvailableProvidersForUser(userEmail)
      : await this.getProviders({ isActive: true });

    // Filter out the failed provider and sort by priority
    const availableProviders = providers
      .filter(p => p.id !== excludeId)
      .sort((a, b) => b.priority - a.priority);

    for (const provider of availableProviders) {
      const status = await this.getProviderStatus(provider.id);
      if (status?.isHealthy) {
        return provider;
      }
    }

    return null;
  }

  /**
   * Private methods
   */

  private async validateProviderConfig(config: Partial<ProviderConfig>): Promise<void> {
    if (!config.name?.trim()) {
      throw new Error('Provider name is required');
    }

    if (!config.type) {
      throw new Error('Provider type is required');
    }

    if (!config.configId?.trim()) {
      throw new Error('Provider configuration ID is required');
    }

    // Validate domain restrictions format
    if (config.domainRestrictions) {
      for (const domain of config.domainRestrictions) {
        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
          throw new Error(`Invalid domain format: ${domain}`);
        }
      }
    }

    // Validate provider-specific metadata
    if (config.metadata) {
      await this.validateProviderMetadata(config.type!, config.metadata);
    }
  }

  private async validateProviderMetadata(type: SsoProviderType, metadata: any): Promise<void> {
    switch (type) {
      case 'SAML':
        if (!metadata.entityId || !metadata.ssoUrl) {
          throw new Error('SAML provider requires entityId and ssoUrl in metadata');
        }
        break;
      case 'OIDC':
        if (!metadata.clientId || !metadata.discoveryUrl) {
          throw new Error('OIDC provider requires clientId and discoveryUrl in metadata');
        }
        break;
      case 'AZURE_AD':
        if (!metadata.tenantId || !metadata.clientId) {
          throw new Error('Azure AD provider requires tenantId and clientId in metadata');
        }
        break;
      case 'LDAP':
        if (!metadata.serverUrl || !metadata.baseDN) {
          throw new Error('LDAP provider requires serverUrl and baseDN in metadata');
        }
        break;
    }
  }

  private async unsetDefaultProviders(): Promise<void> {
    await prisma.ssoProvider.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });
  }

  private async checkProviderHealth(id: string): Promise<ProviderStatus | null> {
    const result = await this.testProviderConnectivity(id);
    return this.providerStatusCache.get(id) || null;
  }

  private async performProviderSpecificTest(provider: SsoProvider): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Perform provider-specific health checks based on provider type
      switch (provider.type) {
        case 'SAML2':
          return await this.testSamlProvider(provider);
        case 'OIDC':
          return await this.testOidcProvider(provider);
        case 'OAuth2':
          return await this.testOAuth2Provider(provider);
        default:
          return {
            success: false,
            error: `Unsupported provider type: ${provider.type}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during provider test'
      };
    }
  }

  private async testSamlProvider(provider: SsoProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const { metadata } = provider;

      // Check if required SAML metadata is present
      if (!metadata.entryPoint && !metadata.issuer_url) {
        return { success: false, error: 'Missing SAML entry point or issuer URL' };
      }

      // Test connectivity to SAML metadata endpoint
      const metadataUrl = metadata.metadataUrl || `${metadata.entryPoint}/metadata`;

      const response = await fetch(metadataUrl, {
        method: 'GET',
        timeout: 10000,
        headers: { 'User-Agent': 'MachShop-SSO-Health-Check/1.0' }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `SAML metadata endpoint returned ${response.status}`
        };
      }

      // Basic validation that we got XML metadata
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('xml')) {
        return {
          success: false,
          error: 'SAML metadata endpoint did not return XML content'
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `SAML provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testOidcProvider(provider: SsoProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const { metadata } = provider;

      if (!metadata.issuer_url) {
        return { success: false, error: 'Missing OIDC issuer URL' };
      }

      // Test OIDC discovery endpoint
      const discoveryUrl = `${metadata.issuer_url}/.well-known/openid-configuration`;

      const response = await fetch(discoveryUrl, {
        method: 'GET',
        timeout: 10000,
        headers: { 'User-Agent': 'MachShop-SSO-Health-Check/1.0' }
      });

      if (!response.ok) {
        return {
          success: false,
          error: `OIDC discovery endpoint returned ${response.status}`
        };
      }

      const config = await response.json();

      // Validate required OIDC endpoints are present
      if (!config.authorization_endpoint || !config.token_endpoint) {
        return {
          success: false,
          error: 'OIDC discovery missing required endpoints'
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `OIDC provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async testOAuth2Provider(provider: SsoProvider): Promise<{ success: boolean; error?: string }> {
    try {
      const { metadata } = provider;

      if (!metadata.authorization_endpoint) {
        return { success: false, error: 'Missing OAuth2 authorization endpoint' };
      }

      // Test OAuth2 authorization endpoint (just check if it's reachable)
      const response = await fetch(metadata.authorization_endpoint, {
        method: 'HEAD',
        timeout: 10000,
        headers: { 'User-Agent': 'MachShop-SSO-Health-Check/1.0' }
      });

      if (!response.ok && response.status !== 400) {
        // 400 is acceptable for HEAD request to auth endpoint
        return {
          success: false,
          error: `OAuth2 authorization endpoint returned ${response.status}`
        };
      }

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `OAuth2 provider test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const providers = await this.getProviders({ isActive: true });

        const healthChecks = providers.map(provider =>
          this.checkProviderHealth(provider.id).catch(error => {
            logger.warn(`Health check failed for provider ${provider.name}`, {
              providerId: provider.id,
              error
            });
          })
        );

        await Promise.allSettled(healthChecks);

      } catch (error) {
        logger.error('Failed to perform provider health checks', { error });
      }
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.removeAllListeners();
  }
}

export default SsoProviderService;