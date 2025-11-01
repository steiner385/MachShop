/**
 * PLM Connector Manager
 * Issue #220 Phase 3: PLM system connector factory and management
 *
 * Manages instantiation and lifecycle of PLM connectors
 * Supports: Teamcenter, Windchill, ENOVIA, Aras
 */

import PLMConnectorBase, { PLMCredentials } from './PLMConnectorBase';
import TeamcenterConnector from './TeamcenterConnector';
import WindchillConnector from './WindchillConnector';
import ENOVIAConnector from './ENOVIAConnector';
import ArasConnector from './ArasConnector';
import { logger } from '../../logging/logger';

export interface PLMConnectionConfig {
  systemName: 'Teamcenter' | 'Windchill' | 'ENOVIA' | 'Aras';
  baseUrl: string;
  apiVersion: string;
  credentials: PLMCredentials;
}

export class PLMConnectorManager {
  private connectors: Map<string, PLMConnectorBase> = new Map();
  private connectionConfigs: Map<string, PLMConnectionConfig> = new Map();

  /**
   * Create connector instance for specified system
   */
  createConnector(config: PLMConnectionConfig): PLMConnectorBase {
    const key = `${config.systemName}:${config.baseUrl}`;

    // Return cached connector if available
    if (this.connectors.has(key)) {
      logger.info('Using cached PLM connector', { system: config.systemName, key });
      return this.connectors.get(key)!;
    }

    let connector: PLMConnectorBase;

    switch (config.systemName.toLowerCase()) {
      case 'teamcenter':
        connector = new TeamcenterConnector(
          config.baseUrl,
          config.apiVersion,
          config.credentials
        );
        break;

      case 'windchill':
        connector = new WindchillConnector(
          config.baseUrl,
          config.apiVersion,
          config.credentials
        );
        break;

      case 'enovia':
        connector = new ENOVIAConnector(
          config.baseUrl,
          config.apiVersion,
          config.credentials
        );
        break;

      case 'aras':
        connector = new ArasConnector(
          config.baseUrl,
          config.apiVersion,
          config.credentials
        );
        break;

      default:
        throw new Error(`Unsupported PLM system: ${config.systemName}`);
    }

    // Cache the connector
    this.connectors.set(key, connector);
    this.connectionConfigs.set(key, config);

    logger.info('Created PLM connector', {
      system: config.systemName,
      baseUrl: config.baseUrl,
      key
    });

    return connector;
  }

  /**
   * Get existing connector
   */
  getConnector(systemName: string, baseUrl: string): PLMConnectorBase | undefined {
    const key = `${systemName}:${baseUrl}`;
    return this.connectors.get(key);
  }

  /**
   * Get connector by key
   */
  getConnectorByKey(key: string): PLMConnectorBase | undefined {
    return this.connectors.get(key);
  }

  /**
   * List all active connectors
   */
  listConnectors(): Array<{ key: string; system: string; baseUrl: string }> {
    return Array.from(this.connectors.keys()).map(key => {
      const config = this.connectionConfigs.get(key);
      return {
        key,
        system: config?.systemName || 'unknown',
        baseUrl: config?.baseUrl || 'unknown'
      };
    });
  }

  /**
   * Get connection configuration
   */
  getConnectionConfig(key: string): PLMConnectionConfig | undefined {
    return this.connectionConfigs.get(key);
  }

  /**
   * Authenticate connector
   */
  async authenticateConnector(key: string): Promise<boolean> {
    const connector = this.getConnectorByKey(key);
    if (!connector) {
      logger.error('Connector not found', { key });
      return false;
    }

    try {
      await connector.authenticate();
      logger.info('Connector authenticated', { key });
      return true;
    } catch (error) {
      logger.error('Connector authentication failed', { key, error });
      return false;
    }
  }

  /**
   * Health check for connector
   */
  async healthCheck(key: string): Promise<boolean> {
    const connector = this.getConnectorByKey(key);
    if (!connector) {
      logger.error('Connector not found', { key });
      return false;
    }

    try {
      const healthy = await connector.healthCheck();
      logger.info('Connector health check', { key, healthy });
      return healthy;
    } catch (error) {
      logger.error('Connector health check failed', { key, error });
      return false;
    }
  }

  /**
   * Disconnect connector
   */
  async disconnectConnector(key: string): Promise<void> {
    const connector = this.getConnectorByKey(key);
    if (!connector) {
      logger.error('Connector not found', { key });
      return;
    }

    try {
      await connector.disconnect();
      this.connectors.delete(key);
      this.connectionConfigs.delete(key);
      logger.info('Connector disconnected', { key });
    } catch (error) {
      logger.error('Connector disconnect failed', { key, error });
      // Still remove from cache even if disconnect fails
      this.connectors.delete(key);
      this.connectionConfigs.delete(key);
    }
  }

  /**
   * Disconnect all connectors
   */
  async disconnectAll(): Promise<void> {
    const keys = Array.from(this.connectors.keys());

    for (const key of keys) {
      try {
        await this.disconnectConnector(key);
      } catch (error) {
        logger.error('Error disconnecting connector', { key, error });
      }
    }

    logger.info('All connectors disconnected');
  }

  /**
   * Get connector statistics
   */
  getStatistics(): {
    totalConnectors: number;
    systems: Record<string, number>;
  } {
    const systems: Record<string, number> = {};
    let totalConnectors = 0;

    for (const config of this.connectionConfigs.values()) {
      systems[config.systemName] = (systems[config.systemName] || 0) + 1;
      totalConnectors++;
    }

    return {
      totalConnectors,
      systems
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config: PLMConnectionConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.systemName) {
      errors.push('systemName is required');
    } else if (!['Teamcenter', 'Windchill', 'ENOVIA', 'Aras'].includes(config.systemName)) {
      errors.push(`Unsupported systemName: ${config.systemName}`);
    }

    if (!config.baseUrl) {
      errors.push('baseUrl is required');
    } else {
      try {
        new URL(config.baseUrl);
      } catch {
        errors.push(`Invalid baseUrl: ${config.baseUrl}`);
      }
    }

    if (!config.apiVersion) {
      errors.push('apiVersion is required');
    }

    if (!config.credentials) {
      errors.push('credentials are required');
    } else {
      // System-specific credential validation
      switch (config.systemName.toLowerCase()) {
        case 'teamcenter':
          if (!config.credentials.username || !config.credentials.password) {
            errors.push('Teamcenter requires username and password');
          }
          break;

        case 'windchill':
          if (!config.credentials.username || !config.credentials.password) {
            if (!config.credentials.oauthToken) {
              errors.push('Windchill requires either (username and password) or oauthToken');
            }
          }
          break;

        case 'enovia':
          if (!config.credentials.clientId || !config.credentials.clientSecret) {
            errors.push('ENOVIA requires clientId and clientSecret');
          }
          break;

        case 'aras':
          if (!config.credentials.username || !config.credentials.password) {
            errors.push('Aras requires username and password');
          }
          break;
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const plmConnectorManager = new PLMConnectorManager();

export default PLMConnectorManager;
