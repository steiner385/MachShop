/**
 * Integration Management Service
 * Centralized service for managing integrations and coordinating framework components
 */

import { integrationRegistry, IntegrationAdapterRegistry } from '../connectors/IntegrationAdapterRegistry';
import { safeQueryFramework, SafeQueryFramework } from './SafeQueryFramework';
import { authenticationHandler, AuthenticationHandler } from './AuthenticationHandler';
import { dataValidator, DataValidator } from './DataValidator';
import { errorHandlingService, ErrorHandlingService } from './ErrorHandlingService';
import { auditLoggingService, AuditLoggingService } from './AuditLoggingService';
import {
  ConnectorConfig,
  IntegrationRequest,
  IntegrationResponse,
  AdapterManifest,
  SiteIntegrationConfig,
  ConnectorHealthStatus,
  IntegrationOperationType,
} from '../types';

/**
 * Central management service coordinating all integration operations
 */
export class IntegrationManagementService {
  private siteConfigs: Map<string, SiteIntegrationConfig> = new Map();
  private activeRequests: Map<string, IntegrationRequest> = new Map();

  constructor(
    private registry: IntegrationAdapterRegistry = integrationRegistry,
    private queryFramework: SafeQueryFramework = safeQueryFramework,
    private authHandler: AuthenticationHandler = authenticationHandler,
    private validator: DataValidator = dataValidator,
    private errorHandler: ErrorHandlingService = errorHandlingService,
    private auditLog: AuditLoggingService = auditLoggingService
  ) {}

  /**
   * Register adapter with framework
   */
  registerAdapter(
    manifest: AdapterManifest,
    connectorClass: typeof import('../connectors/BaseIntegrationConnector').BaseIntegrationConnector,
    registeredBy: string
  ): void {
    this.registry.registerAdapter(manifest, connectorClass as any, registeredBy);
    this.auditLog.logOperation(
      IntegrationOperationType.SYNC,
      'system',
      registeredBy,
      `Registered adapter ${manifest.id}`,
      'success'
    );
  }

  /**
   * Create connector instance
   */
  createConnector(
    adapterId: string,
    config: ConnectorConfig,
    userId: string
  ): { connectorId: string; success: boolean; error?: string } {
    try {
      const connector = this.registry.createConnectorInstance(adapterId, config);
      this.auditLog.logOperation(
        IntegrationOperationType.SYNC,
        config.id,
        userId,
        `Created connector instance`,
        'success'
      );
      return { connectorId: config.id, success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.auditLog.logOperation(
        IntegrationOperationType.SYNC,
        adapterId,
        userId,
        `Failed to create connector`,
        'failure',
        undefined,
        undefined,
        undefined,
        'CREATION_FAILED'
      );
      return { connectorId: config.id, success: false, error: errorMsg };
    }
  }

  /**
   * Execute integration operation with full framework coordination
   */
  async executeOperation(
    adapterId: string,
    connectorId: string,
    request: IntegrationRequest,
    userId: string,
    siteId?: string
  ): Promise<IntegrationResponse> {
    const operationId = `op-${Date.now()}`;
    this.activeRequests.set(operationId, request);

    try {
      // Get connector instance
      const connector = this.registry.getConnectorInstance(adapterId, connectorId);
      if (!connector) {
        throw new Error(`Connector ${connectorId} not found in adapter ${adapterId}`);
      }

      // Check if operation is allowed at site
      if (siteId && !this.isOperationAllowedAtSite(siteId, adapterId)) {
        throw new Error(`Adapter ${adapterId} not enabled for site ${siteId}`);
      }

      // Validate query against safety framework
      const config = this.queryFramework.getConfig(connectorId);
      if (config) {
        const validation = this.queryFramework.validateQuery(connectorId, request);
        if (!validation.valid) {
          throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
        }
      }

      // Check rate limiting
      const rateLimit = this.queryFramework.applyRateLimit(connectorId, userId);
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfterMs}ms`);
      }

      // Analyze impact if required
      if (this.queryFramework.requiresApproval(request)) {
        const impact = this.queryFramework.analyzeImpact(request);
        if (impact.risksIdentified.some((r) => r.severity === 'critical')) {
          throw new Error('Operation requires approval due to critical risks');
        }
      }

      // Execute with error handling and retry logic
      const response = await this.errorHandler.retry(
        async () => connector.executeWithCircuitBreaker(request),
        {
          policy: 'exponential-backoff',
          maxAttempts: 3,
          initialDelayMs: 100,
        },
        operationId
      );

      // Audit successful operation
      this.auditLog.logOperation(
        request.operationType,
        connectorId,
        userId,
        `Executed ${request.operationType} operation`,
        'success',
        request.metadata?.resourceId as string | undefined,
        undefined,
        response.data
      );

      return response;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Audit failed operation
      this.auditLog.logOperation(
        request.operationType,
        connectorId,
        userId,
        `Failed ${request.operationType} operation`,
        'failure',
        request.metadata?.resourceId as string | undefined,
        undefined,
        undefined,
        'EXECUTION_FAILED'
      );

      throw error;
    } finally {
      this.activeRequests.delete(operationId);
    }
  }

  /**
   * Configure site-level integration
   */
  configureSiteIntegration(config: SiteIntegrationConfig, userId: string): void {
    this.siteConfigs.set(config.siteId, config);
    this.auditLog.logOperation(
      IntegrationOperationType.SYNC,
      'system',
      userId,
      `Configured integration for site ${config.siteId}`,
      'success'
    );
  }

  /**
   * Check if operation is allowed at site
   */
  private isOperationAllowedAtSite(siteId: string, adapterId: string): boolean {
    const config = this.siteConfigs.get(siteId);
    if (!config) {
      return true; // Allow if no specific config
    }

    // Check if adapter is disabled
    if (config.disabledConnectors.includes(adapterId)) {
      return false;
    }

    // Check if adapter is in enabled list (if list exists)
    if (config.enabledConnectors.length > 0) {
      return config.enabledConnectors.includes(adapterId);
    }

    return true;
  }

  /**
   * Get connector health status
   */
  async getConnectorHealth(adapterId: string, connectorId: string): Promise<ConnectorHealthStatus> {
    const connector = this.registry.getConnectorInstance(adapterId, connectorId);
    if (!connector) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    return connector.getHealthStatus();
  }

  /**
   * List all adapters
   */
  listAdapters(): AdapterManifest[] {
    return this.registry.listAdapters();
  }

  /**
   * Get audit report
   */
  getAuditReport(startDate: Date, endDate: Date): ReturnType<AuditLoggingService['generateReport']> {
    return this.auditLog.generateReport(startDate, endDate);
  }

  /**
   * Check compliance for period
   */
  checkCompliance(startDate: Date, endDate: Date): ReturnType<AuditLoggingService['checkCompliance']> {
    return this.auditLog.checkCompliance(startDate, endDate);
  }

  /**
   * Get active requests
   */
  getActiveRequests(): IntegrationRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    adapters: number;
    connectors: number;
    activeRequests: number;
    auditLogSize: number;
  } {
    const regStats = this.registry.getStatistics();
    return {
      adapters: regStats.totalAdapters,
      connectors: regStats.totalConnectors,
      activeRequests: this.activeRequests.size,
      auditLogSize: this.auditLog.getLogCount(),
    };
  }

  /**
   * Health check for all connectors
   */
  async performSystemHealthCheck(): Promise<{
    healthy: boolean;
    connectorStatus: Record<string, ConnectorHealthStatus>;
    issues: string[];
  }> {
    const issues: string[] = [];
    const connectorStatus: Record<string, ConnectorHealthStatus> = {};

    const adapters = this.registry.listAdapters();
    for (const adapter of adapters) {
      const instances = this.registry.listConnectorInstances(adapter.id);
      for (const instance of instances) {
        const config = instance.getConfig();
        try {
          const health = await instance.getHealthStatus();
          connectorStatus[config.id] = health;

          if (health.successRate < 95) {
            issues.push(`Connector ${config.id} has low success rate: ${health.successRate}%`);
          }

          if (health.averageResponseTimeMs > 5000) {
            issues.push(`Connector ${config.id} has slow response time: ${health.averageResponseTimeMs}ms`);
          }
        } catch (error) {
          issues.push(`Failed to check health of connector ${config.id}`);
        }
      }
    }

    return {
      healthy: issues.length === 0,
      connectorStatus,
      issues,
    };
  }
}

// Singleton instance
export const integrationManagementService = new IntegrationManagementService();
