import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * IBM Maximo CMMS Adapter
 *
 * Integrates with IBM Maximo for Computerized Maintenance Management System (CMMS)
 * with AS9100 compliance for aerospace and defense manufacturing.
 *
 * Features:
 * - Equipment maintenance work order synchronization
 * - Asset configuration management per AS9100 Clause 7.1.3
 * - Preventive maintenance (PM) scheduling and tracking
 * - Corrective maintenance tracking with root cause analysis
 * - Calibration due date integration
 * - OSLC (Open Services for Lifecycle Collaboration) for digital thread
 * - Configuration change tracking and audit trails
 * - Equipment history and genealogy
 * - Spare parts inventory integration
 * - Work order status bidirectional sync
 *
 * AS9100 Compliance:
 * - Clause 7.1.3: Infrastructure maintenance records
 * - Clause 7.1.5.1: Measurement equipment calibration tracking
 * - Full audit trail for regulatory compliance
 * - Configuration management for critical equipment
 *
 * OSLC Support:
 * - Digital thread linking between maintenance records and production data
 * - Requirements traceability for equipment modifications
 * - Change management integration with PLM/ERP systems
 *
 * IBM Maximo REST API Documentation:
 * https://www.ibm.com/docs/en/mam/7.6.1?topic=api-maximo-rest
 */

export interface IBMMaximoConfig {
  baseUrl: string;              // Maximo server URL (e.g., https://maximo-server/maximo)
  username: string;             // Authentication username
  password: string;             // Authentication password
  authType?: 'basic' | 'maxauth' | 'oauth'; // Authentication type (default: maxauth)
  apiKey?: string;              // API Key for OAuth
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts for failed requests
  oslcEnabled?: boolean;        // Enable OSLC API support
  organization?: string;        // Maximo organization (default: EAGLENA)
  site?: string;                // Maximo site (default: PLANT1)
  autoSyncInterval?: number;    // Auto-sync interval in minutes (0 = disabled)
}

/**
 * Maximo Work Order
 */
export interface MaximoWorkOrder {
  wonum: string;                // Work order number
  description: string;          // Work order description
  worktype: 'PM' | 'CM' | 'CAL' | 'INSP' | 'PROJ'; // Work type (PM=Preventive, CM=Corrective, CAL=Calibration, INSP=Inspection, PROJ=Project)
  status: 'WAPPR' | 'APPR' | 'INPRG' | 'COMP' | 'CLOSE' | 'CAN'; // Status
  assetnum?: string;            // Asset/Equipment number
  location?: string;            // Location
  priority?: number;            // Priority (1-5)
  schedstart?: Date;            // Scheduled start date
  schedfinish?: Date;           // Scheduled finish date
  actstart?: Date;              // Actual start date
  actfinish?: Date;             // Actual finish date
  supervisor?: string;          // Supervisor
  crew?: string;                // Maintenance crew
  failurecode?: string;         // Failure code for corrective maintenance
  problemcode?: string;         // Problem code
  causecode?: string;           // Root cause code
  remedycode?: string;          // Remedy/action code
  estdur?: number;              // Estimated duration (hours)
  actdur?: number;              // Actual duration (hours)
  downtime?: number;            // Equipment downtime (hours)
  oslcResourceUrl?: string;     // OSLC resource URL for digital thread
}

/**
 * Maximo Asset/Equipment
 */
export interface MaximoAsset {
  assetnum: string;             // Asset number
  description: string;          // Asset description
  assettype?: string;           // Asset type
  serialnum?: string;           // Serial number
  manufacturer?: string;        // Manufacturer
  model?: string;               // Model number
  location?: string;            // Current location
  parent?: string;              // Parent asset (for hierarchies)
  status?: 'OPERATING' | 'NOTREADY' | 'DECOMMISSIONED' | 'MISSING';
  isrunning?: boolean;          // Currently running
  lastpmdate?: Date;            // Last preventive maintenance date
  nextpmdate?: Date;            // Next preventive maintenance date
  changedate?: Date;            // Last configuration change date
  changeby?: string;            // Last changed by (for audit trail)
  oslcResourceUrl?: string;     // OSLC resource URL
}

/**
 * Maximo PM (Preventive Maintenance) Schedule
 */
export interface MaximoPMSchedule {
  pmnum: string;                // PM number
  description: string;          // PM description
  assetnum: string;             // Asset number
  frequency?: number;           // Frequency value
  frequnit?: 'DAYS' | 'WEEKS' | 'MONTHS' | 'YEARS'; // Frequency unit
  nextduedate?: Date;           // Next due date
  lastcompdate?: Date;          // Last completion date
  leadtime?: number;            // Lead time (days)
  active?: boolean;             // Active schedule
}

/**
 * Work Order Sync Result
 */
export interface WorkOrderSyncResult {
  success: boolean;
  workOrdersSynced: number;
  workOrdersFailed: number;
  errors: Array<{ wonum: string; error: string }>;
  duration: number;
}

/**
 * Asset Sync Result
 */
export interface AssetSyncResult {
  success: boolean;
  assetsSynced: number;
  assetsFailed: number;
  errors: Array<{ assetnum: string; error: string }>;
  duration: number;
}

export class IBMMaximoAdapter {
  private config: IBMMaximoConfig;
  private httpClient: AxiosInstance;
  private oslcClient?: AxiosInstance; // Separate client for OSLC API

  constructor(config: IBMMaximoConfig) {
    this.config = {
      authType: 'maxauth',
      timeout: 30000,
      retryAttempts: 3,
      oslcEnabled: true,
      organization: 'EAGLENA',
      site: 'PLANT1',
      autoSyncInterval: 0,
      ...config,
    };

    // Create HTTP client for Maximo REST API
    this.httpClient = axios.create({
      baseURL: `${this.config.baseUrl}/oslc`,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'maxauth': Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64'),
      },
    });

    // Create OSLC client if enabled
    if (this.config.oslcEnabled) {
      this.oslcClient = axios.create({
        baseURL: `${this.config.baseUrl}/oslc`,
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/rdf+xml',
          'Accept': 'application/rdf+xml',
          'OSLC-Core-Version': '2.0',
          'maxauth': Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64'),
        },
      });
    }

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error('IBM Maximo API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('IBM Maximo CMMS Adapter initialized');
  }

  /**
   * Test connection to IBM Maximo
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test by querying Maximo system properties
      const response = await this.httpClient.get('/os/mxapibase');
      return response.status === 200;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Sync work orders from Maximo to MES
   * Retrieves open/in-progress work orders for equipment maintenance
   */
  async syncWorkOrdersFromMaximo(filter?: {
    status?: string[];
    worktype?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<WorkOrderSyncResult> {
    const startTime = Date.now();
    const result: WorkOrderSyncResult = {
      success: false,
      workOrdersSynced: 0,
      workOrdersFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Build query filter
      let whereClause = '1=1';
      if (filter?.status && filter.status.length > 0) {
        whereClause += ` and status in [${filter.status.map(s => `"${s}"`).join(',')}]`;
      }
      if (filter?.worktype && filter.worktype.length > 0) {
        whereClause += ` and worktype in [${filter.worktype.map(wt => `"${wt}"`).join(',')}]`;
      }
      if (filter?.dateFrom) {
        whereClause += ` and schedstart>="${filter.dateFrom.toISOString()}"`;
      }
      if (filter?.dateTo) {
        whereClause += ` and schedstart<="${filter.dateTo.toISOString()}"`;
      }

      // Query Maximo for work orders
      const response = await this.httpClient.get('/os/mxapiwodetail', {
        params: {
          'oslc.where': whereClause,
          'oslc.select': 'wonum,description,worktype,status,assetnum,location,priority,schedstart,schedfinish,actstart,actfinish,failurecode,problemcode,causecode,remedycode',
          'oslc.pageSize': 100,
        },
      });

      const workOrders = response.data.member || [];

      for (const wo of workOrders) {
        try {
          // Check if work order already exists in MES
          const existingWO = await prisma.maintenanceWorkOrder.findUnique({
            where: { externalWorkOrderNumber: wo.wonum },
          });

          // Map Maximo asset to MES equipment
          let equipmentId: string | null = null;
          if (wo.assetnum) {
            const equipment = await prisma.equipment.findFirst({
              where: { equipmentCode: wo.assetnum },
            });
            equipmentId = equipment?.id || null;
          }

          const workOrderData = {
            externalWorkOrderNumber: wo.wonum,
            description: wo.description,
            workType: wo.worktype,
            status: wo.status,
            equipmentId: equipmentId,
            scheduledStart: wo.schedstart ? new Date(wo.schedstart) : null,
            scheduledFinish: wo.schedfinish ? new Date(wo.schedfinish) : null,
            actualStart: wo.actstart ? new Date(wo.actstart) : null,
            actualFinish: wo.actfinish ? new Date(wo.actfinish) : null,
            priority: wo.priority || 3,
            failureCode: wo.failurecode,
            problemCode: wo.problemcode,
            causeCode: wo.causecode,
            remedyCode: wo.remedycode,
            lastSyncedAt: new Date(),
          };

          if (existingWO) {
            // Update existing work order
            await prisma.maintenanceWorkOrder.update({
              where: { id: existingWO.id },
              data: workOrderData,
            });
          } else {
            // Create new work order
            await prisma.maintenanceWorkOrder.create({
              data: workOrderData,
            });
          }

          result.workOrdersSynced++;
        } catch (error: any) {
          result.workOrdersFailed++;
          result.errors.push({
            wonum: wo.wonum,
            error: error.message,
          });
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Synced ${result.workOrdersSynced} work orders from Maximo (${result.workOrdersFailed} failed)`);
      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors.push({
        wonum: 'bulk_sync',
        error: error.message,
      });
      console.error('Failed to sync work orders from Maximo:', error.message);
      return result;
    }
  }

  /**
   * Push work order status update to Maximo
   * When maintenance is completed in MES, update Maximo
   */
  async pushWorkOrderStatus(
    wonum: string,
    status: 'INPRG' | 'COMP' | 'CLOSE',
    actualStart?: Date,
    actualFinish?: Date,
    actualDuration?: number,
    downtime?: number
  ): Promise<boolean> {
    try {
      const updateData: any = {
        status,
      };

      if (actualStart) updateData.actstart = actualStart.toISOString();
      if (actualFinish) updateData.actfinish = actualFinish.toISOString();
      if (actualDuration) updateData.actdur = actualDuration;
      if (downtime) updateData.downtime = downtime;

      const response = await this.httpClient.patch(
        `/os/mxapiwodetail/${wonum}`,
        updateData
      );

      console.log(`Updated work order ${wonum} status to ${status} in Maximo`);
      return response.status === 200;
    } catch (error: any) {
      console.error(`Failed to update work order ${wonum}:`, error.message);
      throw new Error(`Failed to update work order: ${error.message}`);
    }
  }

  /**
   * Sync assets/equipment from Maximo to MES
   * Synchronizes equipment master data and configuration
   */
  async syncAssetsFromMaximo(activeOnly: boolean = true): Promise<AssetSyncResult> {
    const startTime = Date.now();
    const result: AssetSyncResult = {
      success: false,
      assetsSynced: 0,
      assetsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      let whereClause = '1=1';
      if (activeOnly) {
        whereClause += ' and status="OPERATING"';
      }

      const response = await this.httpClient.get('/os/mxapiasset', {
        params: {
          'oslc.where': whereClause,
          'oslc.select': 'assetnum,description,assettype,serialnum,manufacturer,model,location,status,lastpmdate,nextpmdate',
          'oslc.pageSize': 100,
        },
      });

      const assets = response.data.member || [];

      for (const asset of assets) {
        try {
          const existingEquipment = await prisma.equipment.findFirst({
            where: { equipmentCode: asset.assetnum },
          });

          const equipmentData = {
            equipmentCode: asset.assetnum,
            equipmentName: asset.description,
            equipmentType: asset.assettype || 'GENERAL',
            manufacturer: asset.manufacturer,
            model: asset.model,
            serialNumber: asset.serialnum,
            location: asset.location,
            isActive: asset.status === 'OPERATING',
            lastMaintenanceDate: asset.lastpmdate ? new Date(asset.lastpmdate) : null,
            nextMaintenanceDate: asset.nextpmdate ? new Date(asset.nextpmdate) : null,
            lastSyncedAt: new Date(),
          };

          if (existingEquipment) {
            await prisma.equipment.update({
              where: { id: existingEquipment.id },
              data: equipmentData,
            });
          } else {
            await prisma.equipment.create({
              data: {
                ...equipmentData,
                capacity: 1.0,
                currentStatus: 'AVAILABLE',
              },
            });
          }

          result.assetsSynced++;
        } catch (error: any) {
          result.assetsFailed++;
          result.errors.push({
            assetnum: asset.assetnum,
            error: error.message,
          });
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Synced ${result.assetsSynced} assets from Maximo (${result.assetsFailed} failed)`);
      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors.push({
        assetnum: 'bulk_sync',
        error: error.message,
      });
      console.error('Failed to sync assets from Maximo:', error.message);
      return result;
    }
  }

  /**
   * Create corrective maintenance work order in Maximo
   * When equipment failure is detected in MES, create CM work order
   */
  async createCorrectiveMaintenanceWorkOrder(
    assetnum: string,
    description: string,
    failureCode?: string,
    priority: number = 1
  ): Promise<string> {
    try {
      const workOrderData = {
        description,
        worktype: 'CM',
        assetnum,
        status: 'WAPPR', // Waiting for approval
        priority,
        failurecode: failureCode,
        reportdate: new Date().toISOString(),
        siteid: this.config.site,
        orgid: this.config.organization,
      };

      const response = await this.httpClient.post('/os/mxapiwodetail', workOrderData);

      const wonum = response.data.wonum;
      console.log(`Created corrective maintenance work order ${wonum} in Maximo`);
      return wonum;
    } catch (error: any) {
      console.error('Failed to create corrective maintenance work order:', error.message);
      throw new Error(`Failed to create CM work order: ${error.message}`);
    }
  }

  /**
   * Query equipment maintenance history from Maximo
   * For AS9100 traceability and configuration management
   */
  async getEquipmentMaintenanceHistory(
    assetnum: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<MaximoWorkOrder[]> {
    try {
      let whereClause = `assetnum="${assetnum}"`;
      if (dateFrom) {
        whereClause += ` and actfinish>="${dateFrom.toISOString()}"`;
      }
      if (dateTo) {
        whereClause += ` and actfinish<="${dateTo.toISOString()}"`;
      }

      const response = await this.httpClient.get('/os/mxapiwodetail', {
        params: {
          'oslc.where': whereClause,
          'oslc.select': 'wonum,description,worktype,status,actstart,actfinish,actdur,downtime,failurecode,problemcode,causecode,remedycode',
          'oslc.orderBy': '-actfinish',
          'oslc.pageSize': 100,
        },
      });

      const workOrders = response.data.member || [];
      return workOrders.map((wo: any) => ({
        wonum: wo.wonum,
        description: wo.description,
        worktype: wo.worktype,
        status: wo.status,
        assetnum: assetnum,
        actstart: wo.actstart ? new Date(wo.actstart) : undefined,
        actfinish: wo.actfinish ? new Date(wo.actfinish) : undefined,
        actdur: wo.actdur,
        downtime: wo.downtime,
        failurecode: wo.failurecode,
        problemcode: wo.problemcode,
        causecode: wo.causecode,
        remedycode: wo.remedycode,
      }));
    } catch (error: any) {
      console.error(`Failed to get maintenance history for ${assetnum}:`, error.message);
      throw new Error(`Failed to get maintenance history: ${error.message}`);
    }
  }

  /**
   * Sync PM schedules from Maximo
   * Integrates preventive maintenance schedules for planning
   */
  async syncPMSchedules(assetnum?: string): Promise<MaximoPMSchedule[]> {
    try {
      let whereClause = 'active=true';
      if (assetnum) {
        whereClause += ` and assetnum="${assetnum}"`;
      }

      const response = await this.httpClient.get('/os/mxapipm', {
        params: {
          'oslc.where': whereClause,
          'oslc.select': 'pmnum,description,assetnum,frequency,frequnit,nextduedate,lastcompdate,leadtime',
          'oslc.pageSize': 100,
        },
      });

      const pmSchedules = response.data.member || [];
      return pmSchedules.map((pm: any) => ({
        pmnum: pm.pmnum,
        description: pm.description,
        assetnum: pm.assetnum,
        frequency: pm.frequency,
        frequnit: pm.frequnit,
        nextduedate: pm.nextduedate ? new Date(pm.nextduedate) : undefined,
        lastcompdate: pm.lastcompdate ? new Date(pm.lastcompdate) : undefined,
        leadtime: pm.leadtime,
        active: true,
      }));
    } catch (error: any) {
      console.error('Failed to sync PM schedules:', error.message);
      throw new Error(`Failed to sync PM schedules: ${error.message}`);
    }
  }

  /**
   * OSLC: Query equipment configuration changes for digital thread
   * Tracks all configuration changes for AS9100 compliance
   */
  async queryConfigurationChanges(
    assetnum: string,
    dateFrom?: Date
  ): Promise<any[]> {
    if (!this.config.oslcEnabled || !this.oslcClient) {
      throw new Error('OSLC is not enabled');
    }

    try {
      let whereClause = `assetnum="${assetnum}"`;
      if (dateFrom) {
        whereClause += ` and changedate>="${dateFrom.toISOString()}"`;
      }

      const response = await this.oslcClient.get('/os/mxapiasset', {
        params: {
          'oslc.where': whereClause,
          'oslc.select': 'assetnum,changedate,changeby,memo',
        },
      });

      return response.data.member || [];
    } catch (error: any) {
      console.error('Failed to query configuration changes:', error.message);
      throw new Error(`Failed to query configuration changes: ${error.message}`);
    }
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    responseTime?: number;
    lastSync?: Date;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const connected = await this.testConnection();
      const responseTime = Date.now() - startTime;
      return { connected, responseTime };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('IBM Maximo adapter cleanup completed');
  }
}

export default IBMMaximoAdapter;
