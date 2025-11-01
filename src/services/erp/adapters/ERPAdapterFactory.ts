/**
 * ERPAdapterFactory - Factory pattern for creating and managing ERP adapters
 * Issue #60: Phase 4-6 - ERP Adapter Factory
 *
 * Provides centralized creation and lifecycle management of ERP adapters
 */

import { logger } from '../../../utils/logger';
import IERPAdapter from './IERPAdapter';
import { ImpactERPAdapter } from './ImpactERPAdapter';
import { SAPERPAdapter } from './SAPERPAdapter';
import { OracleERPAdapter } from './OracleERPAdapter';

/**
 * Available ERP adapter types
 */
export type ERPAdapterType = 'Impact' | 'SAP' | 'Oracle' | 'Generic';

/**
 * Adapter configuration union type
 */
export type AdapterConfig = any; // Can be ImpactConfig, SAPConfig, OracleConfig, etc.

/**
 * ERP Adapter Factory
 */
export class ERPAdapterFactory {
  private static adapters: Map<string, typeof IERPAdapter> = new Map();
  private static instances: Map<string, IERPAdapter> = new Map();

  /**
   * Static initialization - register built-in adapters
   */
  static {
    ERPAdapterFactory.registerAdapter('Impact', ImpactERPAdapter as any);
    ERPAdapterFactory.registerAdapter('SAP', SAPERPAdapter as any);
    ERPAdapterFactory.registerAdapter('Oracle', OracleERPAdapter as any);
  }

  /**
   * Register an adapter type
   */
  static registerAdapter(
    type: string,
    adapterClass: new () => IERPAdapter
  ): void {
    ERPAdapterFactory.adapters.set(type, adapterClass);
    logger.info(`Registered ERP adapter: ${type}`);
  }

  /**
   * Get list of available adapter types
   */
  static getAvailableAdapters(): string[] {
    return Array.from(ERPAdapterFactory.adapters.keys());
  }

  /**
   * Check if adapter type is available
   */
  static isAdapterAvailable(type: string): boolean {
    return ERPAdapterFactory.adapters.has(type);
  }

  /**
   * Create or retrieve adapter instance
   */
  static async createAdapter(
    type: string,
    config: AdapterConfig,
    instanceId?: string
  ): Promise<IERPAdapter> {
    try {
      const adapterKey = instanceId || `${type}-${Date.now()}`;

      // Check if instance already exists
      if (ERPAdapterFactory.instances.has(adapterKey)) {
        logger.debug(`Retrieving cached adapter instance: ${adapterKey}`);
        return ERPAdapterFactory.instances.get(adapterKey)!;
      }

      // Get adapter class
      const AdapterClass = ERPAdapterFactory.adapters.get(type);
      if (!AdapterClass) {
        throw new Error(`Unknown adapter type: ${type}. Available: ${ERPAdapterFactory.getAvailableAdapters().join(', ')}`);
      }

      // Create new instance
      const adapter = new AdapterClass();

      // Connect to ERP system
      await adapter.connect(config);

      // Cache the instance
      ERPAdapterFactory.instances.set(adapterKey, adapter);

      logger.info(`Created new adapter instance: ${adapterKey}`, {
        type,
      });

      return adapter;
    } catch (error) {
      logger.error(`Failed to create adapter: ${type}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cached adapter instance by ID
   */
  static getAdapter(instanceId: string): IERPAdapter | null {
    return ERPAdapterFactory.instances.get(instanceId) || null;
  }

  /**
   * Release adapter instance and cleanup
   */
  static async releaseAdapter(instanceId: string): Promise<void> {
    try {
      const adapter = ERPAdapterFactory.instances.get(instanceId);
      if (adapter) {
        await adapter.disconnect();
        ERPAdapterFactory.instances.delete(instanceId);
        logger.info(`Released adapter instance: ${instanceId}`);
      }
    } catch (error) {
      logger.error(`Failed to release adapter: ${instanceId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Release all adapter instances
   */
  static async releaseAllAdapters(): Promise<void> {
    try {
      for (const [instanceId] of ERPAdapterFactory.instances) {
        await ERPAdapterFactory.releaseAdapter(instanceId);
      }
      logger.info('Released all adapter instances');
    } catch (error) {
      logger.error('Failed to release all adapters', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get adapter statistics
   */
  static getStatistics(): {
    registeredAdapters: number;
    activeInstances: number;
    adapters: string[];
  } {
    return {
      registeredAdapters: ERPAdapterFactory.adapters.size,
      activeInstances: ERPAdapterFactory.instances.size,
      adapters: Array.from(ERPAdapterFactory.adapters.keys()),
    };
  }
}

export default ERPAdapterFactory;
