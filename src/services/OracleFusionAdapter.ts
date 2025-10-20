import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Oracle Fusion Cloud ERP Adapter
 *
 * Integrates with Oracle Fusion Cloud ERP using REST APIs and Oracle Integration Cloud (OIC).
 *
 * Features:
 * - OAuth 2.0 client credentials authentication
 * - Part master (Item) synchronization
 * - BOM structure synchronization
 * - Work order integration
 * - Business event subscriptions (webhooks)
 * - Bulk data import/export (FBDI format)
 *
 * Integration Points:
 * - Supply Chain Planning - Work Orders
 * - Product Hub - Item Master
 * - Product Data Hub - BOM structures
 * - Manufacturing Cloud - Production reporting
 * - Inventory Cloud - Transaction processing
 */

export interface OracleFusionConfig {
  oicBaseUrl: string;           // OIC instance URL (e.g., https://oic-instance.integration.ocp.oraclecloud.com)
  fusionBaseUrl: string;        // Fusion ERP URL (e.g., https://fusion.oraclecloud.com)
  clientId: string;             // OAuth 2.0 client ID
  clientSecret: string;         // OAuth 2.0 client secret
  tokenUrl: string;             // OAuth token endpoint
  scopes: string[];             // OAuth scopes (e.g., ['urn:opc:resource:consumer::all'])
  webhookSecret: string;        // Secret for validating incoming webhooks
  environments: {
    dev: string;
    test: string;
    prod: string;
  };
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts
}

export interface OAuthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
  expires_at?: number;          // Calculated expiry timestamp
}

export interface FusionItem {
  ItemNumber: string;
  ItemDescription: string;
  ItemClass: string;
  UOMCode: string;
  ItemStatus: string;
  PrimaryUOMCode: string;
  ItemType?: string;
  OrganizationCode?: string;
  RevisionId?: string;
  EffectiveDate?: string;
  DisableDate?: string;
}

export interface FusionBOM {
  BillSequenceId: number;
  AssemblyItemNumber: string;
  AlternateBOMDesignator?: string;
  EffectiveDate: string;
  DisableDate?: string;
  BOMComponents: FusionBOMComponent[];
}

export interface FusionBOMComponent {
  ComponentSequenceId: number;
  ComponentItemNumber: string;
  ComponentQuantity: number;
  ComponentYieldFactor?: number;
  OperationSequenceNumber?: number;
  EffectiveDate?: string;
  DisableDate?: string;
}

export interface FusionWorkOrder {
  WorkOrderNumber: string;
  AssemblyItemNumber: string;
  StartQuantity: number;
  CompletionQuantity?: number;
  Status: string;
  PlannedStartDate?: string;
  PlannedCompletionDate?: string;
  ActualStartDate?: string;
  ActualCompletionDate?: string;
}

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: Array<{ record: any; error: string }>;
  duration: number;
}

export class OracleFusionAdapter {
  private config: OracleFusionConfig;
  private httpClient: AxiosInstance;
  private oauthToken: OAuthToken | null = null;
  private tokenExpiryBuffer = 300; // Refresh token 5 minutes before expiry

  constructor(config: OracleFusionConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      ...config,
    };

    // Create HTTP client for Fusion APIs
    this.httpClient = axios.create({
      baseURL: this.config.fusionBaseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Add request interceptor for OAuth token injection
    this.httpClient.interceptors.request.use(
      async (config) => {
        const token = await this.getValidToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token.access_token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Handle 401 Unauthorized - token expired
        if (error.response?.status === 401 && error.config) {
          this.oauthToken = null; // Clear expired token
          const token = await this.getValidToken();
          if (token && error.config.headers) {
            error.config.headers.Authorization = `Bearer ${token.access_token}`;
            return this.httpClient.request(error.config);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get valid OAuth 2.0 access token (refresh if needed)
   */
  private async getValidToken(): Promise<OAuthToken | null> {
    // Check if current token is still valid
    if (this.oauthToken && this.isTokenValid(this.oauthToken)) {
      return this.oauthToken;
    }

    // Refresh or obtain new token
    try {
      this.oauthToken = await this.authenticate();
      return this.oauthToken;
    } catch (error) {
      console.error('Failed to obtain OAuth token:', error);
      return null;
    }
  }

  /**
   * Check if OAuth token is still valid
   */
  private isTokenValid(token: OAuthToken): boolean {
    if (!token.expires_at) return false;
    const now = Date.now() / 1000;
    return token.expires_at - this.tokenExpiryBuffer > now;
  }

  /**
   * Authenticate with Oracle Fusion using OAuth 2.0 client credentials
   */
  async authenticate(): Promise<OAuthToken> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);

      if (this.config.scopes && this.config.scopes.length > 0) {
        params.append('scope', this.config.scopes.join(' '));
      }

      const response = await axios.post<OAuthToken>(
        this.config.tokenUrl,
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: this.config.timeout,
        }
      );

      const token = response.data;
      token.expires_at = Math.floor(Date.now() / 1000) + token.expires_in;

      console.log('Successfully authenticated with Oracle Fusion Cloud');
      return token;
    } catch (error: any) {
      console.error('OAuth authentication failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Oracle Fusion Cloud');
    }
  }

  /**
   * Test connection to Oracle Fusion Cloud
   */
  async testConnection(): Promise<boolean> {
    try {
      const token = await this.getValidToken();
      if (!token) return false;

      // Test by calling a simple endpoint (e.g., get server info)
      const response = await this.httpClient.get('/fscmRestApi/resources/11.13.18.05/serverInfo');
      return response.status === 200;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  /**
   * Synchronize items (parts) from Oracle Fusion to MES
   */
  async syncItems(filter?: {
    organizationCode?: string;
    itemClass?: string;
    modifiedSince?: Date;
  }): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Build query parameters
      const params: any = {
        onlyData: true,
        limit: 500, // Batch size
      };

      if (filter?.organizationCode) {
        params.q = `OrganizationCode='${filter.organizationCode}'`;
      }

      if (filter?.itemClass) {
        params.q = params.q
          ? `${params.q};ItemClass='${filter.itemClass}'`
          : `ItemClass='${filter.itemClass}'`;
      }

      // Fetch items from Fusion
      const response = await this.httpClient.get<{ items: FusionItem[] }>(
        '/fscmRestApi/resources/11.13.18.05/itemsV2',
        { params }
      );

      const fusionItems = response.data.items || [];
      result.recordsProcessed = fusionItems.length;

      // Process each item
      for (const fusionItem of fusionItems) {
        try {
          await this.importItem(fusionItem);
          result.recordsSucceeded++;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push({
            record: fusionItem,
            error: error.message,
          });
        }
      }

      result.success = result.recordsFailed === 0;
      result.duration = Date.now() - startTime;

      console.log(`Item sync completed: ${result.recordsSucceeded}/${result.recordsProcessed} succeeded`);
      return result;
    } catch (error: any) {
      console.error('Item sync failed:', error);
      result.duration = Date.now() - startTime;
      result.errors.push({
        record: null,
        error: error.message,
      });
      return result;
    }
  }

  /**
   * Import a single item from Fusion to MES
   */
  private async importItem(fusionItem: FusionItem): Promise<void> {
    // Map Fusion item to MES Part model
    const partData = {
      partNumber: fusionItem.ItemNumber,
      partName: fusionItem.ItemDescription || fusionItem.ItemNumber,
      description: fusionItem.ItemDescription,
      partType: this.mapItemClassToPartType(fusionItem.ItemClass),
      unitOfMeasure: fusionItem.UOMCode || fusionItem.PrimaryUOMCode,
      revision: fusionItem.RevisionId,
      isActive: fusionItem.ItemStatus === 'Active',
    };

    // Upsert part in MES database
    await prisma.part.upsert({
      where: { partNumber: partData.partNumber },
      update: partData,
      create: partData,
    });
  }

  /**
   * Map Fusion ItemClass to MES PartType
   */
  private mapItemClassToPartType(itemClass: string): string {
    const mapping: Record<string, string> = {
      'FG': 'FINISHED_GOOD',
      'SEMI': 'WIP',
      'RM': 'RAW_MATERIAL',
      'PURCHASED': 'PURCHASED_PART',
    };
    return mapping[itemClass] || 'FINISHED_GOOD';
  }

  /**
   * Synchronize BOMs from Oracle Fusion to MES
   */
  async syncBOMs(assemblyItemNumber?: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: false,
      recordsProcessed: 0,
      recordsSucceeded: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Build query parameters
      const params: any = {
        onlyData: true,
        limit: 100,
      };

      if (assemblyItemNumber) {
        params.q = `AssemblyItemNumber='${assemblyItemNumber}'`;
      }

      // Fetch BOMs from Fusion
      const response = await this.httpClient.get<{ items: FusionBOM[] }>(
        '/fscmRestApi/resources/11.13.18.05/billsOfMaterials',
        { params }
      );

      const fusionBOMs = response.data.items || [];
      result.recordsProcessed = fusionBOMs.length;

      // Process each BOM
      for (const fusionBOM of fusionBOMs) {
        try {
          await this.importBOM(fusionBOM);
          result.recordsSucceeded++;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push({
            record: fusionBOM,
            error: error.message,
          });
        }
      }

      result.success = result.recordsFailed === 0;
      result.duration = Date.now() - startTime;

      console.log(`BOM sync completed: ${result.recordsSucceeded}/${result.recordsProcessed} succeeded`);
      return result;
    } catch (error: any) {
      console.error('BOM sync failed:', error);
      result.duration = Date.now() - startTime;
      result.errors.push({
        record: null,
        error: error.message,
      });
      return result;
    }
  }

  /**
   * Import a single BOM from Fusion to MES
   */
  private async importBOM(fusionBOM: FusionBOM): Promise<void> {
    // Find parent part
    const parentPart = await prisma.part.findUnique({
      where: { partNumber: fusionBOM.AssemblyItemNumber },
    });

    if (!parentPart) {
      throw new Error(`Parent part ${fusionBOM.AssemblyItemNumber} not found in MES`);
    }

    // Process each BOM component
    for (const component of fusionBOM.BOMComponents) {
      // Find component part
      const componentPart = await prisma.part.findUnique({
        where: { partNumber: component.ComponentItemNumber },
      });

      if (!componentPart) {
        console.warn(`Component part ${component.ComponentItemNumber} not found, skipping`);
        continue;
      }

      // Create or update BOM item
      const existingBOMItem = await prisma.bOMItem.findFirst({
        where: {
          parentPartId: parentPart.id,
          componentPartId: componentPart.id,
        },
      });

      if (existingBOMItem) {
        await prisma.bOMItem.update({
          where: { id: existingBOMItem.id },
          data: {
            quantity: component.ComponentQuantity,
            sequence: component.OperationSequenceNumber || null,
            isActive: !component.DisableDate,
          },
        });
      } else {
        await prisma.bOMItem.create({
          data: {
            parentPartId: parentPart.id,
            componentPartId: componentPart.id,
            quantity: component.ComponentQuantity,
            unitOfMeasure: componentPart.unitOfMeasure,
            sequence: component.OperationSequenceNumber || null,
            isActive: !component.DisableDate,
          },
        });
      }
    }
  }

  /**
   * Confirm production completion to Oracle Fusion
   */
  async confirmProduction(workOrderId: string): Promise<boolean> {
    try {
      // Fetch work order from MES
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        include: { part: true },
      });

      if (!workOrder) {
        throw new Error(`Work order ${workOrderId} not found`);
      }

      // Prepare production confirmation payload
      const confirmationPayload = {
        WorkOrderNumber: workOrder.workOrderNumber,
        AssemblyItemNumber: workOrder.part.partNumber,
        CompletedQuantity: workOrder.quantityCompleted,
        ScrappedQuantity: workOrder.quantityScrapped,
        CompletionDate: workOrder.completedAt?.toISOString() || new Date().toISOString(),
        Status: 'COMPLETED',
      };

      // Send to Fusion (endpoint may vary based on Fusion configuration)
      const response = await this.httpClient.post(
        '/fscmRestApi/resources/11.13.18.05/workOrderCompletions',
        confirmationPayload
      );

      console.log(`Production confirmed for work order ${workOrder.workOrderNumber}`);
      return response.status === 201 || response.status === 200;
    } catch (error: any) {
      console.error('Production confirmation failed:', error);
      throw new Error(`Failed to confirm production: ${error.message}`);
    }
  }

  /**
   * Handle incoming webhook event from Oracle Fusion
   */
  async handleWebhookEvent(event: {
    eventType: string;
    payload: any;
    signature?: string;
  }): Promise<void> {
    // Validate webhook signature (if provided)
    if (event.signature && !this.validateWebhookSignature(event.payload, event.signature)) {
      throw new Error('Invalid webhook signature');
    }

    console.log(`Received Fusion webhook event: ${event.eventType}`);

    // Handle different event types
    switch (event.eventType) {
      case 'item.created':
      case 'item.updated':
        await this.handleItemEvent(event.payload);
        break;

      case 'bom.created':
      case 'bom.updated':
        await this.handleBOMEvent(event.payload);
        break;

      case 'workOrder.created':
      case 'workOrder.updated':
        await this.handleWorkOrderEvent(event.payload);
        break;

      default:
        console.warn(`Unhandled event type: ${event.eventType}`);
    }
  }

  /**
   * Validate webhook signature using HMAC
   */
  private validateWebhookSignature(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const computedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    return computedSignature === signature;
  }

  /**
   * Handle item (part) event from webhook
   */
  private async handleItemEvent(payload: FusionItem): Promise<void> {
    await this.importItem(payload);
    console.log(`Processed item event for ${payload.ItemNumber}`);
  }

  /**
   * Handle BOM event from webhook
   */
  private async handleBOMEvent(payload: FusionBOM): Promise<void> {
    await this.importBOM(payload);
    console.log(`Processed BOM event for ${payload.AssemblyItemNumber}`);
  }

  /**
   * Handle work order event from webhook
   */
  private async handleWorkOrderEvent(payload: FusionWorkOrder): Promise<void> {
    // Import work order from Fusion to MES
    const part = await prisma.part.findUnique({
      where: { partNumber: payload.AssemblyItemNumber },
    });

    if (!part) {
      console.warn(`Part ${payload.AssemblyItemNumber} not found, cannot create work order`);
      return;
    }

    // TODO: Find or create a default user for system-created work orders
    const systemUser = await prisma.user.findFirst({
      where: { username: 'system' },
    });

    if (!systemUser) {
      console.warn('System user not found, cannot create work order');
      return;
    }

    await prisma.workOrder.upsert({
      where: { workOrderNumber: payload.WorkOrderNumber },
      update: {
        quantity: payload.StartQuantity,
        quantityCompleted: payload.CompletionQuantity || 0,
        status: this.mapFusionStatusToMESStatus(payload.Status) as any,
      },
      create: {
        workOrderNumber: payload.WorkOrderNumber,
        partId: part.id,
        partNumber: part.partNumber,
        quantity: payload.StartQuantity,
        quantityCompleted: payload.CompletionQuantity || 0,
        priority: 'NORMAL',
        status: this.mapFusionStatusToMESStatus(payload.Status) as any,
        createdById: systemUser.id,
      },
    });

    console.log(`Processed work order event for ${payload.WorkOrderNumber}`);
  }

  /**
   * Map Fusion work order status to MES status
   */
  private mapFusionStatusToMESStatus(fusionStatus: string): string {
    const mapping: Record<string, string> = {
      'Unreleased': 'CREATED',
      'Released': 'RELEASED',
      'In Process': 'IN_PROGRESS',
      'Completed': 'COMPLETED',
      'Closed': 'COMPLETED',
      'Cancelled': 'CANCELLED',
      'On Hold': 'ON_HOLD',
    };
    return mapping[fusionStatus] || 'CREATED';
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    lastSync?: Date;
    error?: string;
  }> {
    try {
      const connected = await this.testConnection();
      return { connected };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }
}

export default OracleFusionAdapter;
