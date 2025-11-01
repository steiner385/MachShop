/**
 * ERP Integration Service - Core integration engine for syncing with ERP systems
 * Issue #60: ERP & External System Integration for OSP Operations
 *
 * Provides:
 * - Configuration management for multiple ERP systems
 * - Connection testing and validation
 * - Field mapping and data transformation
 * - Transaction logging and error handling
 * - Reconciliation and audit trails
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ERPConnectionConfig {
  erpSystem: string;
  apiEndpoint?: string;
  apiVersion?: string;
  authMethod: 'BASIC' | 'OAUTH2' | 'API_KEY' | 'CERTIFICATE' | 'SAML';
  credentials: {
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
  };
}

export interface FieldMapping {
  mesField: string;
  erpField: string;
  dataType: string;
  transformation?: string;
  isRequired: boolean;
  defaultValue?: any;
}

export interface SyncTransaction {
  id?: string;
  entityType: string;
  entityId: string;
  transactionType: string;
  direction: 'INBOUND' | 'OUTBOUND' | 'BIDIRECTIONAL';
  mesPayload: any;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  retryCount?: number;
}

export class ERPIntegrationService {
  private prisma: PrismaClient;
  private fieldMappingCache: Map<string, FieldMapping[]> = new Map();
  private erpConnections: Map<string, any> = new Map();

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create or update ERP integration configuration
   */
  async configureERPSystem(
    name: string,
    erpSystem: string,
    config: {
      apiEndpoint?: string;
      apiVersion?: string;
      authMethod: string;
      apiUsername?: string;
      apiPassword?: string;
      apiToken?: string;
      clientId?: string;
      clientSecret?: string;
      fileIntegrationEnabled?: boolean;
      inboundFolder?: string;
      outboundFolder?: string;
      syncSchedule?: any;
      description?: string;
    }
  ) {
    try {
      const integration = await this.prisma.erpIntegration.upsert({
        where: { name },
        update: config,
        create: {
          name,
          erpSystem: erpSystem as any,
          ...config,
        },
      });

      logger.info(`ERP Integration configured: ${name} (${erpSystem})`, {
        integrationId: integration.id,
      });

      return integration;
    } catch (error) {
      logger.error(`Failed to configure ERP system ${name}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Test connection to ERP system
   */
  async testConnection(integrationId: string): Promise<{
    connected: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const integration = await this.prisma.erpIntegration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        return {
          connected: false,
          message: 'Integration not found',
          error: 'NOT_FOUND',
        };
      }

      // Test based on integration type
      let testResult: any;

      if (integration.apiEndpoint) {
        testResult = await this.testAPIConnection(integration);
      } else if (integration.fileIntegrationEnabled) {
        testResult = await this.testFileConnection(integration);
      } else if (integration.dbIntegrationEnabled) {
        testResult = await this.testDatabaseConnection(integration);
      } else {
        return {
          connected: false,
          message: 'No connection method configured',
          error: 'NO_CONNECTION_METHOD',
        };
      }

      // Update last connection check
      await this.prisma.erpIntegration.update({
        where: { id: integrationId },
        data: {
          lastConnectionCheckAt: new Date(),
          connectionStatus: testResult.connected ? 'CONNECTED' : 'DISCONNECTED',
          lastConnectionError: testResult.error || null,
        },
      });

      return testResult;
    } catch (error) {
      logger.error(`Failed to test ERP connection`, {
        integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        connected: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'UNKNOWN',
      };
    }
  }

  private async testAPIConnection(integration: any): Promise<{
    connected: boolean;
    message: string;
    error?: string;
  }> {
    // Implementation depends on ERP system type
    // For now, a basic HTTP test
    try {
      const response = await fetch(`${integration.apiEndpoint}/health`, {
        method: 'GET',
        headers: this.buildHeaders(integration),
        timeout: 5000,
      });

      if (response.ok) {
        return {
          connected: true,
          message: `Connected to ${integration.erpSystem} API`,
        };
      } else {
        return {
          connected: false,
          message: `API returned status ${response.status}`,
          error: `HTTP_${response.status}`,
        };
      }
    } catch (error) {
      return {
        connected: false,
        message: 'API connection failed',
        error: error instanceof Error ? error.message : 'UNKNOWN',
      };
    }
  }

  private async testFileConnection(integration: any): Promise<{
    connected: boolean;
    message: string;
    error?: string;
  }> {
    // TODO: Test file folder accessibility
    return {
      connected: true,
      message: 'File integration configured (not tested)',
    };
  }

  private async testDatabaseConnection(integration: any): Promise<{
    connected: boolean;
    message: string;
    error?: string;
  }> {
    // TODO: Test database connection string
    return {
      connected: true,
      message: 'Database integration configured (not tested)',
    };
  }

  /**
   * Configure field mappings for an entity type
   */
  async setFieldMappings(
    integrationId: string,
    entityType: string,
    mappings: FieldMapping[]
  ) {
    try {
      // Delete existing mappings
      await this.prisma.erpFieldMapping.deleteMany({
        where: {
          erpIntegrationId: integrationId,
          entityType,
        },
      });

      // Create new mappings
      const created = await this.prisma.erpFieldMapping.createMany({
        data: mappings.map((m) => ({
          erpIntegrationId: integrationId,
          entityType,
          ...m,
        })),
      });

      // Invalidate cache
      this.fieldMappingCache.delete(`${integrationId}:${entityType}`);

      logger.info(`Field mappings configured for ${entityType}`, {
        integrationId,
        count: created.count,
      });

      return created;
    } catch (error) {
      logger.error(`Failed to set field mappings`, {
        integrationId,
        entityType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get field mappings for an entity type
   */
  async getFieldMappings(
    integrationId: string,
    entityType: string
  ): Promise<FieldMapping[]> {
    const cacheKey = `${integrationId}:${entityType}`;

    // Check cache
    if (this.fieldMappingCache.has(cacheKey)) {
      return this.fieldMappingCache.get(cacheKey)!;
    }

    // Fetch from database
    const mappings = await this.prisma.erpFieldMapping.findMany({
      where: {
        erpIntegrationId: integrationId,
        entityType,
      },
    });

    // Cache the results
    this.fieldMappingCache.set(cacheKey, mappings as FieldMapping[]);

    return mappings as FieldMapping[];
  }

  /**
   * Transform MES data to ERP format using field mappings
   */
  async transformToERP(
    integrationId: string,
    entityType: string,
    mesData: Record<string, any>
  ): Promise<Record<string, any>> {
    const mappings = await this.getFieldMappings(integrationId, entityType);
    const erpData: Record<string, any> = {};

    for (const mapping of mappings) {
      let value = mesData[mapping.mesField];

      // Apply transformation if specified
      if (mapping.transformation && value !== undefined) {
        try {
          // Safely evaluate transformation (consider security implications)
          const transformFn = new Function('value', `return ${mapping.transformation}`);
          value = transformFn(value);
        } catch (error) {
          logger.warn(`Failed to apply transformation for ${mapping.mesField}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Use default value if not provided
      if (value === undefined && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      }

      if (value !== undefined) {
        erpData[mapping.erpField] = value;
      }
    }

    return erpData;
  }

  /**
   * Log a sync transaction
   */
  async logSyncTransaction(
    integrationId: string,
    transaction: SyncTransaction
  ) {
    try {
      const record = await this.prisma.erpSyncTransaction.create({
        data: {
          erpIntegrationId: integrationId,
          transactionType: transaction.transactionType as any,
          direction: transaction.direction,
          status: (transaction.status || 'PENDING') as any,
          entityType: transaction.entityType,
          entityId: transaction.entityId,
          mesPayload: transaction.mesPayload,
        },
      });

      return record;
    } catch (error) {
      logger.error(`Failed to log sync transaction`, {
        integrationId,
        entityType: transaction.entityType,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update sync transaction status
   */
  async updateSyncTransactionStatus(
    transactionId: string,
    status: string,
    updates?: {
      erpEntityId?: string;
      transformedPayload?: any;
      erpPayload?: any;
      erpResponseCode?: string;
      erpResponseMessage?: string;
      errorMessage?: string;
      errorDetails?: any;
    }
  ) {
    try {
      const record = await this.prisma.erpSyncTransaction.update({
        where: { id: transactionId },
        data: {
          status: status as any,
          ...updates,
          ...(status === 'COMPLETED' && { completedAt: new Date() }),
        },
      });

      return record;
    } catch (error) {
      logger.error(`Failed to update sync transaction`, {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Queue retry for failed transaction
   */
  async scheduleRetry(
    transactionId: string,
    maxRetries: number = 3,
    backoffSeconds: number = 60
  ) {
    try {
      const transaction = await this.prisma.erpSyncTransaction.findUnique({
        where: { id: transactionId },
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      if (transaction.retryCount >= maxRetries) {
        logger.warn(`Max retries reached for transaction`, {
          transactionId,
          retryCount: transaction.retryCount,
        });
        return;
      }

      const nextRetryAt = new Date(
        Date.now() + backoffSeconds * Math.pow(2, transaction.retryCount) * 1000
      );

      await this.prisma.erpSyncTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'RETRYING' as any,
          retryCount: transaction.retryCount + 1,
          nextRetryAt,
        },
      });

      logger.info(`Scheduled retry for transaction`, {
        transactionId,
        nextRetryAt,
        retryCount: transaction.retryCount + 1,
      });
    } catch (error) {
      logger.error(`Failed to schedule retry`, {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get pending retries
   */
  async getPendingRetries(integrationId: string) {
    return this.prisma.erpSyncTransaction.findMany({
      where: {
        erpIntegrationId: integrationId,
        status: 'RETRYING' as any,
        nextRetryAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        nextRetryAt: 'asc',
      },
      take: 100,
    });
  }

  /**
   * Build authentication headers for ERP API calls
   */
  private buildHeaders(integration: any): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (integration.authMethod === 'BASIC' && integration.apiUsername) {
      const credentials = Buffer.from(
        `${integration.apiUsername}:${integration.apiPassword}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (integration.authMethod === 'API_KEY' && integration.apiToken) {
      headers['X-API-Key'] = integration.apiToken;
    } else if (integration.authMethod === 'OAUTH2' && integration.apiToken) {
      headers['Authorization'] = `Bearer ${integration.apiToken}`;
    }

    return headers;
  }

  /**
   * Cleanup and close connections
   */
  async disconnect() {
    this.fieldMappingCache.clear();
    this.erpConnections.clear();
    await this.prisma.$disconnect();
  }
}

export default ERPIntegrationService;
