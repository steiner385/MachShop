/**
 * Directory Service Factory
 * Issue #128: External Integration: LDAP/AD Role Synchronization
 *
 * Factory for creating directory service instances based on configuration type.
 */

import {
  IDirectoryService,
  IDirectoryServiceFactory,
  DirectoryServiceError,
  UnsupportedOperationError,
} from './interfaces';
import { DirectoryConfig, DirectoryType } from '../../types/directory';
import { LdapDirectoryService } from './implementations/ldap';
import { ActiveDirectoryService } from './implementations/active-directory';
import { directoryLogger as logger } from '../../utils/logger';

/**
 * Factory class for creating directory service instances
 */
export class DirectoryServiceFactory implements IDirectoryServiceFactory {
  private static instance: DirectoryServiceFactory;
  private serviceCache = new Map<string, IDirectoryService>();

  private constructor() {}

  /**
   * Get singleton instance of the factory
   */
  public static getInstance(): DirectoryServiceFactory {
    if (!DirectoryServiceFactory.instance) {
      DirectoryServiceFactory.instance = new DirectoryServiceFactory();
    }
    return DirectoryServiceFactory.instance;
  }

  /**
   * Create a directory service instance for the given configuration
   */
  public async createService(config: DirectoryConfig): Promise<IDirectoryService> {
    const cacheKey = this.getCacheKey(config);

    // Return cached instance if available
    if (this.serviceCache.has(cacheKey)) {
      const cachedService = this.serviceCache.get(cacheKey)!;
      if (cachedService.isConnected()) {
        return cachedService;
      } else {
        // Remove disconnected service from cache
        this.serviceCache.delete(cacheKey);
      }
    }

    // Create new service instance
    let service: IDirectoryService;

    try {
      switch (config.type) {
        case DirectoryType.LDAP:
        case DirectoryType.OPENLDAP:
          service = new LdapDirectoryService();
          break;

        case DirectoryType.ACTIVE_DIRECTORY:
          service = new ActiveDirectoryService();
          break;

        case DirectoryType.AZURE_AD:
          // TODO: Implement Azure AD service in future iteration
          throw new UnsupportedOperationError(
            'Azure AD integration is not yet implemented',
            { type: config.type }
          );

        default:
          throw new UnsupportedOperationError(
            `Unsupported directory type: ${config.type}`,
            { type: config.type }
          );
      }

      // Connect to the directory
      await service.connect(config);

      // Cache the connected service
      this.serviceCache.set(cacheKey, service);

      logger.info('Directory service created and connected', {
        configId: config.id,
        type: config.type,
        host: config.host,
      });

      return service;

    } catch (error) {
      logger.error('Failed to create directory service', {
        configId: config.id,
        type: config.type,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error instanceof DirectoryServiceError
        ? error
        : new DirectoryServiceError(
          `Failed to create directory service: ${error instanceof Error ? error.message : String(error)}`,
          { configId: config.id, type: config.type }
        );
    }
  }

  /**
   * Get supported directory types
   */
  public getSupportedTypes(): string[] {
    return [
      DirectoryType.LDAP,
      DirectoryType.OPENLDAP,
      DirectoryType.ACTIVE_DIRECTORY,
      // DirectoryType.AZURE_AD, // Not yet implemented
    ];
  }

  /**
   * Check if a directory type is supported
   */
  public isTypeSupported(type: string): boolean {
    return this.getSupportedTypes().includes(type);
  }

  /**
   * Get a cached service instance if available
   */
  public getCachedService(config: DirectoryConfig): IDirectoryService | null {
    const cacheKey = this.getCacheKey(config);
    return this.serviceCache.get(cacheKey) || null;
  }

  /**
   * Remove a service from cache
   */
  public removeCachedService(config: DirectoryConfig): void {
    const cacheKey = this.getCacheKey(config);
    const service = this.serviceCache.get(cacheKey);

    if (service) {
      this.serviceCache.delete(cacheKey);
      logger.debug('Directory service removed from cache', {
        configId: config.id,
        type: config.type,
      });
    }
  }

  /**
   * Clear all cached services and disconnect them
   */
  public async clearCache(): Promise<void> {
    const disconnectPromises = Array.from(this.serviceCache.values()).map(async (service) => {
      try {
        if (service.isConnected()) {
          await service.disconnect();
        }
      } catch (error) {
        logger.warn('Error disconnecting cached service', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.allSettled(disconnectPromises);
    this.serviceCache.clear();

    logger.info('Directory service cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalCached: number;
    connectedServices: number;
    servicesByType: Record<string, number>;
  } {
    const stats = {
      totalCached: this.serviceCache.size,
      connectedServices: 0,
      servicesByType: {} as Record<string, number>,
    };

    this.serviceCache.forEach((service) => {
      if (service.isConnected()) {
        stats.connectedServices++;
      }
    });

    return stats;
  }

  /**
   * Create a cache key for a configuration
   */
  private getCacheKey(config: DirectoryConfig): string {
    // Create a unique key based on connection parameters
    return `${config.type}-${config.host}-${config.port}-${config.baseDN}`;
  }

  /**
   * Validate configuration before creating service
   */
  private async validateConfig(config: DirectoryConfig): Promise<void> {
    if (!config.host || !config.baseDN) {
      throw new DirectoryServiceError(
        'Host and baseDN are required for directory configuration',
        { configId: config.id }
      );
    }

    if (!this.isTypeSupported(config.type)) {
      throw new UnsupportedOperationError(
        `Directory type ${config.type} is not supported`,
        { type: config.type }
      );
    }

    // Additional validation based on directory type
    switch (config.type) {
      case DirectoryType.ACTIVE_DIRECTORY:
        if (!config.bindDN || !config.bindPassword) {
          throw new DirectoryServiceError(
            'Active Directory requires bind credentials',
            { configId: config.id }
          );
        }
        break;

      case DirectoryType.LDAP:
      case DirectoryType.OPENLDAP:
        // LDAP can work with anonymous bind, but warn if no credentials
        if (!config.bindDN) {
          logger.warn('LDAP configuration has no bind DN - using anonymous bind', {
            configId: config.id,
          });
        }
        break;
    }
  }
}

/**
 * Convenience function to create a directory service
 */
export async function createDirectoryService(config: DirectoryConfig): Promise<IDirectoryService> {
  const factory = DirectoryServiceFactory.getInstance();
  return factory.createService(config);
}

/**
 * Convenience function to get supported directory types
 */
export function getSupportedDirectoryTypes(): string[] {
  const factory = DirectoryServiceFactory.getInstance();
  return factory.getSupportedTypes();
}

/**
 * Directory service registry for managing multiple services
 */
export class DirectoryServiceRegistry {
  private static instance: DirectoryServiceRegistry;
  private services = new Map<string, IDirectoryService>();
  private factory: DirectoryServiceFactory;

  private constructor() {
    this.factory = DirectoryServiceFactory.getInstance();
  }

  /**
   * Get singleton instance of the registry
   */
  public static getInstance(): DirectoryServiceRegistry {
    if (!DirectoryServiceRegistry.instance) {
      DirectoryServiceRegistry.instance = new DirectoryServiceRegistry();
    }
    return DirectoryServiceRegistry.instance;
  }

  /**
   * Register a directory service instance
   */
  public register(configId: string, service: IDirectoryService): void {
    this.services.set(configId, service);
    logger.debug('Directory service registered', { configId });
  }

  /**
   * Unregister a directory service instance
   */
  public async unregister(configId: string): Promise<void> {
    const service = this.services.get(configId);
    if (service) {
      try {
        if (service.isConnected()) {
          await service.disconnect();
        }
      } catch (error) {
        logger.warn('Error disconnecting service during unregister', {
          configId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.services.delete(configId);
      logger.debug('Directory service unregistered', { configId });
    }
  }

  /**
   * Get a directory service instance
   */
  public get(configId: string): IDirectoryService | null {
    return this.services.get(configId) || null;
  }

  /**
   * Get or create a directory service instance
   */
  public async getOrCreate(config: DirectoryConfig): Promise<IDirectoryService> {
    const existing = this.get(config.id);
    if (existing && existing.isConnected()) {
      return existing;
    }

    // Remove disconnected service
    if (existing) {
      await this.unregister(config.id);
    }

    // Create new service
    const service = await this.factory.createService(config);
    this.register(config.id, service);
    return service;
  }

  /**
   * Get all registered service instances
   */
  public getAll(): Map<string, IDirectoryService> {
    return new Map(this.services);
  }

  /**
   * Check if a service is registered
   */
  public has(configId: string): boolean {
    return this.services.has(configId);
  }

  /**
   * Dispose all registered services
   */
  public async disposeAll(): Promise<void> {
    const disconnectPromises = Array.from(this.services.entries()).map(async ([configId, service]) => {
      try {
        if (service.isConnected()) {
          await service.disconnect();
        }
      } catch (error) {
        logger.warn('Error disconnecting service during dispose', {
          configId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    });

    await Promise.allSettled(disconnectPromises);
    this.services.clear();

    // Also clear factory cache
    await this.factory.clearCache();

    logger.info('All directory services disposed');
  }

  /**
   * Get registry statistics
   */
  public getStats(): {
    totalRegistered: number;
    connectedServices: number;
    servicesByType: Record<string, number>;
  } {
    const stats = {
      totalRegistered: this.services.size,
      connectedServices: 0,
      servicesByType: {} as Record<string, number>,
    };

    this.services.forEach((service) => {
      if (service.isConnected()) {
        stats.connectedServices++;
      }
    });

    return stats;
  }
}

// Export singleton instances
export const directoryServiceFactory = DirectoryServiceFactory.getInstance();
export const directoryServiceRegistry = DirectoryServiceRegistry.getInstance();