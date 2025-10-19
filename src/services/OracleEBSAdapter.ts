/**
 * Oracle E-Business Suite (EBS) Integration Adapter
 *
 * This adapter provides integration with Oracle EBS R12.x using the Integrated SOA Gateway (ISG).
 * Supports synchronization of work orders, production confirmations, and inventory transactions.
 *
 * Key Features:
 * - Work order synchronization (EBS → MES)
 * - Production confirmation (MES → EBS)
 * - Inventory transaction recording
 * - Item/part master data sync
 * - BOM structure sync (Engineering BOMs)
 * - REST API integration via ISG
 * - Basic Auth or Session-based authentication
 * - Error handling and retry logic
 *
 * EBS Integration Architecture:
 * - Uses Integrated SOA Gateway (ISG) for REST endpoints
 * - Supports both PL/SQL APIs and REST services
 * - Standard modules: INV (Inventory), WIP (Work In Process), BOM (Bill of Materials)
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Oracle EBS Configuration
 */
export interface OracleEBSConfig {
  // EBS Instance Configuration
  ebsBaseUrl: string;              // e.g., https://ebs.company.com
  isgRestPath: string;             // e.g., /webservices/rest
  ebsVersion: string;              // e.g., '12.2.10'

  // Authentication
  authType: 'BASIC' | 'SESSION';   // Authentication method
  username: string;                // EBS user
  password: string;                // EBS password
  responsibility: string;          // EBS responsibility name
  respApplication: string;         // Responsibility application
  securityGroup: string;           // Security group
  orgId?: number;                  // Operating unit ID

  // Module Configuration
  modules: {
    wip: boolean;                  // Work In Process
    inv: boolean;                  // Inventory
    bom: boolean;                  // Bill of Materials
    po: boolean;                   // Purchase Orders
  };

  // Synchronization Settings
  syncInterval: number;            // Minutes between syncs
  batchSize: number;               // Records per batch

  // Connection Settings
  timeout: number;                 // Request timeout (ms)
  retryAttempts: number;          // Retry attempts on failure
  retryDelay: number;             // Delay between retries (ms)
}

/**
 * EBS Work Order (Discrete Job)
 */
export interface EBSWorkOrder {
  WIP_ENTITY_ID: number;
  WIP_ENTITY_NAME: string;         // Job/work order number
  ORGANIZATION_ID: number;
  ORGANIZATION_CODE: string;
  PRIMARY_ITEM_ID: number;
  ITEM_NUMBER: string;
  ITEM_DESCRIPTION: string;
  STATUS_TYPE: number;
  STATUS_TYPE_DISP: string;        // Released, Complete, etc.
  START_QUANTITY: number;
  QUANTITY_COMPLETED: number;
  QUANTITY_SCRAPPED: number;
  DATE_RELEASED: string;
  SCHEDULED_START_DATE: string;
  SCHEDULED_COMPLETION_DATE: string;
  DATE_COMPLETED?: string;
  COMPLETION_SUBINVENTORY?: string;
  COMPLETION_LOCATOR_ID?: number;
  CLASS_CODE?: string;             // Job class/type
  PRIORITY?: number;
  DESCRIPTION?: string;
}

/**
 * EBS Item Master
 */
export interface EBSItem {
  INVENTORY_ITEM_ID: number;
  SEGMENT1: string;                // Item number
  DESCRIPTION: string;
  PRIMARY_UOM_CODE: string;
  ITEM_TYPE: string;
  PLANNING_MAKE_BUY_CODE: number;  // 1=Make, 2=Buy
  INVENTORY_ITEM_FLAG: string;     // Y/N
  STOCK_ENABLED_FLAG: string;      // Y/N
  BOM_ITEM_TYPE: number;           // 1=Model, 2=Option Class, 4=Standard
  ENGINEERING_ITEM_FLAG: string;
  INVENTORY_PLANNING_CODE: number;
  ORGANIZATION_ID: number;
  ORGANIZATION_CODE: string;
}

/**
 * EBS BOM Header
 */
export interface EBSBOMHeader {
  BILL_SEQUENCE_ID: number;
  ASSEMBLY_ITEM_ID: number;
  ASSEMBLY_ITEM_NUMBER: string;
  ORGANIZATION_ID: number;
  ORGANIZATION_CODE: string;
  ALTERNATE_BOM_DESIGNATOR?: string;
  COMMON_ASSEMBLY_ITEM_ID?: number;
  ASSEMBLY_TYPE: number;           // 1=Manufacturing, 2=Engineering
  EFFECTIVITY_DATE: string;
  DISABLE_DATE?: string;
}

/**
 * EBS BOM Component
 */
export interface EBSBOMComponent {
  COMPONENT_SEQUENCE_ID: number;
  BILL_SEQUENCE_ID: number;
  COMPONENT_ITEM_ID: number;
  COMPONENT_ITEM_NUMBER: string;
  COMPONENT_QUANTITY: number;
  COMPONENT_YIELD_FACTOR: number;
  OPERATION_SEQ_NUM: number;
  WIP_SUPPLY_TYPE: number;         // 1=Push, 2=Assembly Pull, 3=Operation Pull
  SUPPLY_SUBINVENTORY?: string;
  EFFECTIVITY_DATE: string;
  DISABLE_DATE?: string;
  OPTIONAL: number;                // 1=Optional, 2=Mandatory
  INCLUDE_IN_COST_ROLLUP: number;  // 1=Yes, 2=No
}

/**
 * Production Move Transaction (for confirmations)
 */
export interface EBSMoveTransaction {
  WIP_ENTITY_ID: number;
  ORGANIZATION_ID: number;
  TRANSACTION_TYPE: number;        // 1=Move, 2=Completion, 3=Return
  FM_OPERATION_SEQ_NUM?: number;   // From operation
  TO_OPERATION_SEQ_NUM?: number;   // To operation
  TRANSACTION_QUANTITY: number;
  SCRAP_QUANTITY?: number;
  TRANSACTION_DATE: string;
  REASON_ID?: number;
  REFERENCE?: string;
  EMPLOYEE_ID?: number;
}

/**
 * Integration Result
 */
export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: Array<{ record: string; error: string }>;
  duration: number;
}

/**
 * Oracle EBS Adapter Class
 */
export class OracleEBSAdapter {
  private config: OracleEBSConfig;
  private httpClient: AxiosInstance;
  private sessionToken?: string;
  private sessionExpiry?: number;

  constructor(config: OracleEBSConfig) {
    this.config = config;

    // Initialize HTTP client with base configuration
    this.httpClient = axios.create({
      baseURL: `${config.ebsBaseUrl}${config.isgRestPath}`,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Setup request interceptor for authentication
    this.httpClient.interceptors.request.use(
      async (config) => {
        if (this.config.authType === 'BASIC') {
          // Basic authentication
          const auth = Buffer.from(
            `${this.config.username}:${this.config.password}`
          ).toString('base64');
          config.headers.Authorization = `Basic ${auth}`;
        } else if (this.config.authType === 'SESSION') {
          // Session-based authentication
          const token = await this.getValidSessionToken();
          if (token) {
            config.headers['X-EBS-Session-Token'] = token;
          }
        }

        // Add EBS context headers
        config.headers['X-EBS-Responsibility'] = this.config.responsibility;
        config.headers['X-EBS-Resp-Application'] = this.config.respApplication;
        config.headers['X-EBS-Security-Group'] = this.config.securityGroup;

        if (this.config.orgId) {
          config.headers['X-EBS-Org-ID'] = this.config.orgId.toString();
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Setup response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && this.config.authType === 'SESSION') {
          // Session expired, clear token and retry
          this.sessionToken = undefined;
          this.sessionExpiry = undefined;

          if (error.config) {
            const token = await this.getValidSessionToken();
            if (token && error.config.headers) {
              error.config.headers['X-EBS-Session-Token'] = token;
              return this.httpClient.request(error.config);
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Authenticate and get session token (for SESSION auth type)
   */
  private async authenticate(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.config.ebsBaseUrl}/fndcp/sessionlogin`,
        {
          username: this.config.username,
          password: this.config.password,
          responsibility: this.config.responsibility,
          respApplication: this.config.respApplication,
          securityGroup: this.config.securityGroup,
        }
      );

      const token = response.data.sessionToken;
      this.sessionExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes

      return token;
    } catch (error) {
      console.error('EBS authentication failed:', error);
      throw new Error('Failed to authenticate with Oracle EBS');
    }
  }

  /**
   * Get valid session token (creates new if expired)
   */
  private async getValidSessionToken(): Promise<string | undefined> {
    if (this.config.authType !== 'SESSION') {
      return undefined;
    }

    // Check if token is valid
    if (this.sessionToken && this.sessionExpiry && Date.now() < this.sessionExpiry - 60000) {
      return this.sessionToken;
    }

    // Authenticate to get new token
    this.sessionToken = await this.authenticate();
    return this.sessionToken;
  }

  /**
   * Sync work orders from EBS to MES
   */
  async syncWorkOrders(filter?: {
    organizationCode?: string;
    statusType?: string;
    releasedAfter?: Date;
  }): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Build query parameters
      const params: any = {
        limit: this.config.batchSize,
      };

      if (filter?.organizationCode) {
        params.organizationCode = filter.organizationCode;
      }
      if (filter?.statusType) {
        params.statusType = filter.statusType;
      }
      if (filter?.releasedAfter) {
        params.releasedAfter = filter.releasedAfter.toISOString();
      }

      // Fetch work orders from EBS WIP module
      const response = await this.httpClient.get<{ items: EBSWorkOrder[] }>(
        '/wip/discreteJobs',
        { params }
      );

      const ebsWorkOrders = response.data.items || [];
      result.recordsProcessed = ebsWorkOrders.length;

      // Process each work order
      for (const ebsWO of ebsWorkOrders) {
        try {
          const isNew = await this.importWorkOrder(ebsWO);
          if (isNew) {
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push({
            record: ebsWO.WIP_ENTITY_NAME,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      console.error('Error syncing work orders from EBS:', error);
      result.success = false;
      result.errors.push({
        record: 'sync_operation',
        error: error.message,
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Import single work order from EBS to MES
   */
  private async importWorkOrder(ebsWO: EBSWorkOrder): Promise<boolean> {
    // Check if work order already exists
    const existing = await prisma.workOrder.findUnique({
      where: { workOrderNumber: ebsWO.WIP_ENTITY_NAME },
    });

    // Find or create part
    const part = await prisma.part.upsert({
      where: { partNumber: ebsWO.ITEM_NUMBER },
      update: {
        partName: ebsWO.ITEM_DESCRIPTION,
      },
      create: {
        partNumber: ebsWO.ITEM_NUMBER,
        partName: ebsWO.ITEM_DESCRIPTION,
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA', // Default, should be from item master
      },
    });

    // Map EBS status to MES status
    const status = this.mapEBSStatusToMES(ebsWO.STATUS_TYPE_DISP);

    // Create or update work order
    const workOrderData = {
      workOrderNumber: ebsWO.WIP_ENTITY_NAME,
      partId: part.id,
      quantity: ebsWO.START_QUANTITY,
      status,
      priority: ebsWO.PRIORITY ? this.mapPriorityToMES(ebsWO.PRIORITY) : 'NORMAL',
      plannedStartDate: new Date(ebsWO.SCHEDULED_START_DATE),
      plannedEndDate: new Date(ebsWO.SCHEDULED_COMPLETION_DATE),
      actualStartDate: ebsWO.DATE_RELEASED ? new Date(ebsWO.DATE_RELEASED) : null,
      actualEndDate: ebsWO.DATE_COMPLETED ? new Date(ebsWO.DATE_COMPLETED) : null,
      description: ebsWO.DESCRIPTION || `EBS Job ${ebsWO.WIP_ENTITY_NAME}`,
      externalSystemId: ebsWO.WIP_ENTITY_ID.toString(),
      externalSystemName: 'ORACLE_EBS',
    };

    if (existing) {
      await prisma.workOrder.update({
        where: { id: existing.id },
        data: workOrderData,
      });
      return false; // Updated
    } else {
      await prisma.workOrder.create({
        data: workOrderData,
      });
      return true; // Created
    }
  }

  /**
   * Sync items (parts) from EBS to MES
   */
  async syncItems(filter?: {
    organizationCode?: string;
    itemType?: string;
    modifiedSince?: Date;
  }): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      const params: any = {
        limit: this.config.batchSize,
      };

      if (filter?.organizationCode) {
        params.organizationCode = filter.organizationCode;
      }
      if (filter?.itemType) {
        params.itemType = filter.itemType;
      }
      if (filter?.modifiedSince) {
        params.lastUpdateDate = filter.modifiedSince.toISOString();
      }

      // Fetch items from EBS INV module
      const response = await this.httpClient.get<{ items: EBSItem[] }>(
        '/inv/items',
        { params }
      );

      const ebsItems = response.data.items || [];
      result.recordsProcessed = ebsItems.length;

      for (const ebsItem of ebsItems) {
        try {
          const isNew = await this.importItem(ebsItem);
          if (isNew) {
            result.recordsCreated++;
          } else {
            result.recordsUpdated++;
          }
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push({
            record: ebsItem.SEGMENT1,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      console.error('Error syncing items from EBS:', error);
      result.success = false;
      result.errors.push({
        record: 'sync_operation',
        error: error.message,
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Import single item from EBS to MES
   */
  private async importItem(ebsItem: EBSItem): Promise<boolean> {
    const existing = await prisma.part.findUnique({
      where: { partNumber: ebsItem.SEGMENT1 },
    });

    const partData = {
      partNumber: ebsItem.SEGMENT1,
      partName: ebsItem.DESCRIPTION,
      partType: this.mapBOMItemTypeToPartType(ebsItem.BOM_ITEM_TYPE),
      unitOfMeasure: ebsItem.PRIMARY_UOM_CODE,
      externalSystemId: ebsItem.INVENTORY_ITEM_ID.toString(),
      externalSystemName: 'ORACLE_EBS',
    };

    if (existing) {
      await prisma.part.update({
        where: { id: existing.id },
        data: partData,
      });
      return false;
    } else {
      await prisma.part.create({
        data: partData,
      });
      return true;
    }
  }

  /**
   * Sync BOMs from EBS to MES
   */
  async syncBOMs(assemblyItemNumber?: string): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      const params: any = {
        assemblyType: 1, // Manufacturing BOMs only
      };

      if (assemblyItemNumber) {
        params.assemblyItemNumber = assemblyItemNumber;
      }

      // Fetch BOM headers
      const response = await this.httpClient.get<{ items: EBSBOMHeader[] }>(
        '/bom/bills',
        { params }
      );

      const bomHeaders = response.data.items || [];

      for (const bomHeader of bomHeaders) {
        try {
          // Fetch BOM components for this header
          const componentsResponse = await this.httpClient.get<{ items: EBSBOMComponent[] }>(
            `/bom/bills/${bomHeader.BILL_SEQUENCE_ID}/components`
          );

          const components = componentsResponse.data.items || [];
          result.recordsProcessed += components.length;

          await this.importBOM(bomHeader, components);
          result.recordsCreated += components.length;
        } catch (error: any) {
          result.recordsFailed++;
          result.errors.push({
            record: bomHeader.ASSEMBLY_ITEM_NUMBER,
            error: error.message,
          });
        }
      }
    } catch (error: any) {
      console.error('Error syncing BOMs from EBS:', error);
      result.success = false;
      result.errors.push({
        record: 'sync_operation',
        error: error.message,
      });
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Import BOM structure from EBS to MES
   */
  private async importBOM(header: EBSBOMHeader, components: EBSBOMComponent[]): Promise<void> {
    // Find parent part
    const parentPart = await prisma.part.findUnique({
      where: { partNumber: header.ASSEMBLY_ITEM_NUMBER },
    });

    if (!parentPart) {
      throw new Error(`Parent part not found: ${header.ASSEMBLY_ITEM_NUMBER}`);
    }

    // Process each component
    for (const component of components) {
      const componentPart = await prisma.part.findUnique({
        where: {
          externalSystemId: component.COMPONENT_ITEM_ID.toString(),
          externalSystemName: 'ORACLE_EBS',
        },
      });

      if (!componentPart) {
        console.warn(`Component part not found: ${component.COMPONENT_ITEM_NUMBER}`);
        continue;
      }

      // Create or update BOM item
      await prisma.bOMItem.upsert({
        where: {
          parentPartId_componentPartId: {
            parentPartId: parentPart.id,
            componentPartId: componentPart.id,
          },
        },
        update: {
          quantity: component.COMPONENT_QUANTITY * component.COMPONENT_YIELD_FACTOR,
        },
        create: {
          parentPartId: parentPart.id,
          componentPartId: componentPart.id,
          quantity: component.COMPONENT_QUANTITY * component.COMPONENT_YIELD_FACTOR,
          unitOfMeasure: componentPart.unitOfMeasure,
        },
      });
    }
  }

  /**
   * Confirm production completion back to EBS
   */
  async confirmProduction(workOrderId: string, quantity: number, options?: {
    scrapQuantity?: number;
    transactionDate?: Date;
    employeeId?: number;
    reference?: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      // Get work order
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder || !workOrder.externalSystemId) {
        throw new Error('Work order not found or not linked to EBS');
      }

      // Create move transaction (completion)
      const moveTransaction: EBSMoveTransaction = {
        WIP_ENTITY_ID: parseInt(workOrder.externalSystemId),
        ORGANIZATION_ID: this.config.orgId || 0,
        TRANSACTION_TYPE: 2, // Completion
        TRANSACTION_QUANTITY: quantity,
        SCRAP_QUANTITY: options?.scrapQuantity || 0,
        TRANSACTION_DATE: options?.transactionDate?.toISOString() || new Date().toISOString(),
        REFERENCE: options?.reference || `MES Completion ${workOrder.workOrderNumber}`,
        EMPLOYEE_ID: options?.employeeId,
      };

      // Post transaction to EBS
      const response = await this.httpClient.post(
        '/wip/moveTransactions',
        moveTransaction
      );

      return {
        success: true,
        transactionId: response.data.transactionId,
      };
    } catch (error: any) {
      console.error('Error confirming production to EBS:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get health status of EBS connection
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    responseTime?: number;
    version?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Ping EBS with a simple query
      const response = await this.httpClient.get('/system/health');

      return {
        connected: true,
        responseTime: Date.now() - startTime,
        version: this.config.ebsVersion,
      };
    } catch (error: any) {
      return {
        connected: false,
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * Map EBS status to MES status
   */
  private mapEBSStatusToMES(ebsStatus: string): string {
    const statusMap: Record<string, string> = {
      'Released': 'RELEASED',
      'Complete': 'COMPLETED',
      'Complete - No Charges': 'COMPLETED',
      'Closed': 'CLOSED',
      'On Hold': 'ON_HOLD',
      'Cancelled': 'CANCELLED',
      'Pending': 'PENDING',
      'Unreleased': 'CREATED',
    };

    return statusMap[ebsStatus] || 'CREATED';
  }

  /**
   * Map EBS priority to MES priority
   */
  private mapPriorityToMES(ebsPriority: number): string {
    if (ebsPriority >= 75) return 'HIGH';
    if (ebsPriority >= 50) return 'NORMAL';
    return 'LOW';
  }

  /**
   * Map EBS BOM item type to MES part type
   */
  private mapBOMItemTypeToPartType(bomItemType: number): string {
    const typeMap: Record<number, string> = {
      1: 'MODEL',        // Model
      2: 'OPTION',       // Option Class
      4: 'ASSEMBLY',     // Standard/Planning item
      5: 'COMPONENT',    // Standard component
    };

    return typeMap[bomItemType] || 'COMPONENT';
  }
}

export default OracleEBSAdapter;
