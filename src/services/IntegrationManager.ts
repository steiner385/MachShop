/**
 * Integration Manager Service
 *
 * Unified integration framework that manages all ERP and PLM adapters.
 * Provides centralized configuration, job scheduling, health monitoring,
 * and data mapping for enterprise system integrations.
 *
 * Features:
 * - Multi-adapter management (Oracle Fusion, Oracle EBS, Teamcenter)
 * - Scheduled synchronization jobs (node-cron)
 * - Health monitoring and alerting
 * - Integration logging and audit trails
 * - Error handling and retry logic
 * - Data mapping and transformation
 * - Configuration encryption
 * - Job queue management
 *
 * Supported Integrations:
 * - Oracle Fusion Cloud ERP (REST/OAuth)
 * - Oracle E-Business Suite (REST/ISG)
 * - Siemens Teamcenter PLM (SOA/REST)
 */

import { PrismaClient, IntegrationType } from '@prisma/client';
import cron from 'node-cron';
import crypto from 'crypto';
import { OracleFusionAdapter, OracleFusionConfig } from './OracleFusionAdapter';
import { OracleEBSAdapter, OracleEBSConfig } from './OracleEBSAdapter';
import { TeamcenterAdapter, TeamcenterConfig } from './TeamcenterAdapter';
import { ProficyHistorianAdapter, ProficyHistorianConfig } from './ProficyHistorianAdapter';
import { IBMMaximoAdapter, IBMMaximoConfig } from './IBMMaximoAdapter';
import { IndysoftAdapter, IndysoftConfig } from './IndysoftAdapter';
import { CovalentAdapter, CovalentConfig } from './CovalentAdapter';
import { ShopFloorConnectAdapter, ShopFloorConnectConfig } from './ShopFloorConnectAdapter';
import { PredatorPDMAdapter, PredatorPDMConfig } from './PredatorPDMAdapter';
import { PredatorDNCAdapter, PredatorDNCConfig } from './PredatorDNCAdapter';
import { CMMAdapter, CMMConfig } from './CMMAdapter';

/**
 * Integration Job Configuration
 */
export interface IntegrationJob {
  id: string;
  configId: string;
  jobType: 'sync_items' | 'sync_boms' | 'sync_workorders' | 'health_check';
  schedule: string;              // Cron expression
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  cronTask?: any; // node-cron ScheduledTask
}

/**
 * Integration Health Status
 */
export interface IntegrationHealth {
  configId: string;
  name: string;
  type: IntegrationType;
  enabled: boolean;
  connected: boolean;
  lastSync?: Date;
  lastSyncStatus?: string;
  responseTime?: number;
  errorCount: number;
  lastError?: string;
  statistics: {
    totalSyncs: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  };
}

/**
 * Sync Job Options
 */
export interface SyncJobOptions {
  configName: string;
  jobType: 'sync_items' | 'sync_boms' | 'sync_workorders';
  filters?: any;
}

/**
 * Integration Manager Class
 */
// Type alias for all supported adapters
type IntegrationAdapter =
  | OracleFusionAdapter
  | OracleEBSAdapter
  | TeamcenterAdapter
  | ProficyHistorianAdapter
  | IBMMaximoAdapter
  | IndysoftAdapter
  | CovalentAdapter
  | ShopFloorConnectAdapter
  | PredatorPDMAdapter
  | PredatorDNCAdapter
  | CMMAdapter;

export class IntegrationManager {
  private prisma: PrismaClient;
  private adapters: Map<string, IntegrationAdapter>;
  private jobs: Map<string, IntegrationJob>;
  private encryptionKey: string;

  constructor(prismaClient?: PrismaClient, encryptionKey?: string) {
    this.prisma = prismaClient || new PrismaClient();
    this.adapters = new Map();
    this.jobs = new Map();
    this.encryptionKey = encryptionKey || process.env.INTEGRATION_ENCRYPTION_KEY || 'default-key-change-in-prod';
  }

  /**
   * Initialize integration manager
   * - Loads all enabled integrations
   * - Creates adapter instances
   * - Schedules synchronization jobs
   */
  async initialize(): Promise<void> {
    console.log('Initializing Integration Manager...');

    // Load all enabled integrations
    const configs = await this.prisma.integrationConfig.findMany({
      where: { enabled: true },
    });

    for (const config of configs) {
      try {
        await this.loadAdapter(config.id);
        console.log(`Loaded adapter: ${config.name} (${config.type})`);
      } catch (error: any) {
        console.error(`Failed to load adapter ${config.name}:`, error.message);
      }
    }

    // Schedule automatic sync jobs
    await this.scheduleJobs();

    console.log(`Integration Manager initialized with ${this.adapters.size} adapters`);
  }

  /**
   * Load adapter for a specific integration config
   */
  private async loadAdapter(configId: string): Promise<void> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { id: configId },
    });

    if (!config || !config.enabled) {
      throw new Error(`Integration config not found or disabled: ${configId}`);
    }

    // Decrypt configuration
    const decryptedConfig = this.decryptConfig(config.config as any);

    // Create adapter based on type
    let adapter: IntegrationAdapter;

    switch (config.type) {
      case 'ERP':
        // Determine which ERP system based on config structure
        if (config.name.includes('fusion')) {
          adapter = new OracleFusionAdapter(decryptedConfig as OracleFusionConfig);
        } else if (config.name.includes('ebs')) {
          adapter = new OracleEBSAdapter(decryptedConfig as OracleEBSConfig);
        } else {
          throw new Error(`Unknown ERP type for config: ${config.name}`);
        }
        break;

      case 'PLM':
        adapter = new TeamcenterAdapter(decryptedConfig as TeamcenterConfig);
        break;

      case 'CMMS':
        adapter = new IBMMaximoAdapter(decryptedConfig as IBMMaximoConfig);
        break;

      case 'HISTORIAN':
        adapter = new ProficyHistorianAdapter(decryptedConfig as ProficyHistorianConfig);
        break;

      case 'CALIBRATION':
        adapter = new IndysoftAdapter(decryptedConfig as IndysoftConfig);
        break;

      case 'SKILLS':
        adapter = new CovalentAdapter(decryptedConfig as CovalentConfig);
        break;

      case 'SFC':
        adapter = new ShopFloorConnectAdapter(decryptedConfig as ShopFloorConnectConfig);
        break;

      case 'PDM':
        adapter = new PredatorPDMAdapter(decryptedConfig as PredatorPDMConfig);
        break;

      case 'DNC':
        // DNC adapter needs references to other adapters for authorization handshake
        const covalentAdapter = await this.getAdapterByType('SKILLS') as CovalentAdapter | undefined;
        const sfcAdapter = await this.getAdapterByType('SFC') as ShopFloorConnectAdapter | undefined;
        const indysoftAdapter = await this.getAdapterByType('CALIBRATION') as IndysoftAdapter | undefined;

        adapter = new PredatorDNCAdapter(
          decryptedConfig as PredatorDNCConfig,
          covalentAdapter,
          sfcAdapter,
          indysoftAdapter
        );
        break;

      case 'CMM':
        adapter = new CMMAdapter(decryptedConfig as CMMConfig);
        break;

      default:
        throw new Error(`Unsupported integration type: ${config.type}`);
    }

    this.adapters.set(configId, adapter);
  }

  /**
   * Get adapter by config ID
   */
  getAdapter(configId: string): IntegrationAdapter | undefined {
    return this.adapters.get(configId);
  }

  /**
   * Get adapter by config name
   */
  async getAdapterByName(configName: string): Promise<IntegrationAdapter | undefined> {
    const config = await this.prisma.integrationConfig.findUnique({
      where: { name: configName },
    });

    if (!config) return undefined;

    // Load adapter if not already loaded
    if (!this.adapters.has(config.id)) {
      await this.loadAdapter(config.id);
    }

    return this.adapters.get(config.id);
  }

  /**
   * Get adapter by integration type
   * Returns the first adapter of the specified type
   */
  async getAdapterByType(type: IntegrationType): Promise<IntegrationAdapter | undefined> {
    const config = await this.prisma.integrationConfig.findFirst({
      where: {
        type,
        enabled: true,
      },
    });

    if (!config) return undefined;

    // Load adapter if not already loaded
    if (!this.adapters.has(config.id)) {
      await this.loadAdapter(config.id);
    }

    return this.adapters.get(config.id);
  }

  /**
   * Execute synchronization job
   */
  async executeSyncJob(options: SyncJobOptions): Promise<void> {
    const startTime = Date.now();

    try {
      // Get adapter
      const adapter = await this.getAdapterByName(options.configName);
      if (!adapter) {
        throw new Error(`Adapter not found: ${options.configName}`);
      }

      // Get config
      const config = await this.prisma.integrationConfig.findUnique({
        where: { name: options.configName },
      });

      if (!config) {
        throw new Error(`Config not found: ${options.configName}`);
      }

      // Execute job based on type
      let result: any;

      switch (options.jobType) {
        case 'sync_items':
          if ('syncItems' in adapter && typeof adapter.syncItems === 'function') {
            result = await adapter.syncItems(options.filters);
          } else {
            throw new Error('Adapter does not support item sync');
          }
          break;

        case 'sync_boms':
          if ('syncBOMs' in adapter && typeof adapter.syncBOMs === 'function') {
            result = await (adapter as any).syncBOMs(options.filters?.assemblyItemNumber);
          } else {
            throw new Error('Adapter does not support BOM sync');
          }
          break;

        case 'sync_workorders':
          if ('syncWorkOrders' in adapter) {
            result = await adapter.syncWorkOrders(options.filters);
          } else {
            throw new Error('Adapter does not support work order sync');
          }
          break;

        default:
          throw new Error(`Unknown job type: ${options.jobType}`);
      }

      // Log success
      await this.logIntegration({
        configId: config.id,
        operation: options.jobType,
        direction: 'INBOUND',
        status: result.success ? 'SUCCESS' : 'PARTIAL',
        recordCount: result.recordsProcessed,
        successCount: result.recordsCreated + result.recordsUpdated,
        errorCount: result.recordsFailed,
        duration: result.duration,
        errors: result.errors.length > 0 ? result.errors : null,
      });

      // Update config status
      await this.prisma.integrationConfig.update({
        where: { id: config.id },
        data: {
          lastSync: new Date(),
          lastSyncStatus: result.success ? 'SUCCESS' : 'PARTIAL',
          lastError: result.errors.length > 0 ? JSON.stringify(result.errors[0]) : null,
          errorCount: result.success ? 0 : config.errorCount + 1,
          totalSyncs: config.totalSyncs + 1,
          successCount: result.success ? config.successCount + 1 : config.successCount,
          failureCount: result.success ? config.failureCount : config.failureCount + 1,
        },
      });

      console.log(`Sync job completed: ${options.configName} - ${options.jobType}`, {
        processed: result.recordsProcessed,
        created: result.recordsCreated,
        updated: result.recordsUpdated,
        failed: result.recordsFailed,
        duration: result.duration,
      });
    } catch (error: any) {
      console.error(`Sync job failed: ${options.configName} - ${options.jobType}`, error);

      // Log failure
      const config = await this.prisma.integrationConfig.findUnique({
        where: { name: options.configName },
      });

      if (config) {
        await this.logIntegration({
          configId: config.id,
          operation: options.jobType,
          direction: 'INBOUND',
          status: 'FAILURE',
          recordCount: 0,
          successCount: 0,
          errorCount: 1,
          duration: Date.now() - startTime,
          errors: [{ error: error.message }],
        });

        await this.prisma.integrationConfig.update({
          where: { id: config.id },
          data: {
            lastSync: new Date(),
            lastSyncStatus: 'FAILURE',
            lastError: error.message,
            errorCount: config.errorCount + 1,
            totalSyncs: config.totalSyncs + 1,
            failureCount: config.failureCount + 1,
          },
        });
      }

      throw error;
    }
  }

  /**
   * Log integration activity
   */
  private async logIntegration(data: {
    configId: string;
    operation: string;
    direction: 'INBOUND' | 'OUTBOUND';
    status: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
    recordCount: number;
    successCount: number;
    errorCount: number;
    duration: number;
    requestData?: any;
    responseData?: any;
    errors?: any;
  }): Promise<void> {
    await this.prisma.integrationLog.create({
      data: {
        configId: data.configId,
        operation: data.operation,
        direction: data.direction,
        status: data.status as any,
        recordCount: data.recordCount,
        successCount: data.successCount,
        errorCount: data.errorCount,
        duration: data.duration,
        requestData: data.requestData || null,
        responseData: data.responseData || null,
        errors: data.errors || null,
      },
    });
  }

  /**
   * Schedule automatic synchronization jobs
   */
  private async scheduleJobs(): Promise<void> {
    const configs = await this.prisma.integrationConfig.findMany({
      where: { enabled: true },
    });

    for (const config of configs) {
      const decryptedConfig = this.decryptConfig(config.config as any);

      // Schedule item sync (daily at 2 AM)
      this.scheduleJob({
        id: `${config.id}-sync-items`,
        configId: config.id,
        jobType: 'sync_items',
        schedule: '0 2 * * *',
        enabled: true,
      });

      // Schedule BOM sync (daily at 3 AM)
      this.scheduleJob({
        id: `${config.id}-sync-boms`,
        configId: config.id,
        jobType: 'sync_boms',
        schedule: '0 3 * * *',
        enabled: true,
      });

      // Schedule work order sync for ERP systems (every 15 minutes)
      if (config.type === 'ERP') {
        this.scheduleJob({
          id: `${config.id}-sync-workorders`,
          configId: config.id,
          jobType: 'sync_workorders',
          schedule: '*/15 * * * *',
          enabled: true,
        });
      }

      // Schedule health check (every 5 minutes)
      this.scheduleJob({
        id: `${config.id}-health-check`,
        configId: config.id,
        jobType: 'health_check',
        schedule: '*/5 * * * *',
        enabled: true,
      });
    }

    console.log(`Scheduled ${this.jobs.size} integration jobs`);
  }

  /**
   * Schedule a single job
   */
  private scheduleJob(job: IntegrationJob): void {
    if (!cron.validate(job.schedule)) {
      console.error(`Invalid cron expression for job ${job.id}: ${job.schedule}`);
      return;
    }

    const cronTask = cron.schedule(job.schedule, async () => {
      if (!job.enabled) return;

      console.log(`Running scheduled job: ${job.id} (${job.jobType})`);

      try {
        const config = await this.prisma.integrationConfig.findUnique({
          where: { id: job.configId },
        });

        if (!config || !config.enabled) {
          console.log(`Job ${job.id} skipped: config disabled`);
          return;
        }

        if (job.jobType === 'health_check') {
          await this.runHealthCheck(job.configId);
        } else {
          await this.executeSyncJob({
            configName: config.name,
            jobType: job.jobType as any,
          });
        }

        job.lastRun = new Date();
      } catch (error: any) {
        console.error(`Scheduled job failed: ${job.id}`, error);
      }
    });

    job.cronTask = cronTask;
    this.jobs.set(job.id, job);
  }

  /**
   * Run health check for an integration
   */
  async runHealthCheck(configId: string): Promise<void> {
    const adapter = this.adapters.get(configId);
    if (!adapter) return;

    try {
      const health = await adapter.getHealthStatus();

      const config = await this.prisma.integrationConfig.findUnique({
        where: { id: configId },
      });

      if (!config) return;

      if (!health.connected) {
        // Connection failed
        await this.prisma.integrationConfig.update({
          where: { id: configId },
          data: {
            lastError: health.error || 'Connection failed',
            errorCount: config.errorCount + 1,
          },
        });

        console.warn(`Health check failed for ${config.name}: ${health.error}`);
      } else {
        // Connection successful
        await this.prisma.integrationConfig.update({
          where: { id: configId },
          data: {
            lastError: null,
            errorCount: 0,
          },
        });
      }
    } catch (error: any) {
      console.error(`Health check error for ${configId}:`, error);
    }
  }

  /**
   * Get health status for all integrations
   */
  async getAllHealthStatus(): Promise<IntegrationHealth[]> {
    const configs = await this.prisma.integrationConfig.findMany();

    const healthStatuses: IntegrationHealth[] = [];

    for (const config of configs) {
      const adapter = this.adapters.get(config.id);
      let connected = false;
      let responseTime: number | undefined;

      if (adapter) {
        try {
          const health = await adapter.getHealthStatus();
          connected = health.connected;
          responseTime = (health as any).responseTime;
        } catch (error) {
          connected = false;
        }
      }

      healthStatuses.push({
        configId: config.id,
        name: config.displayName,
        type: config.type,
        enabled: config.enabled,
        connected,
        lastSync: config.lastSync || undefined,
        lastSyncStatus: config.lastSyncStatus || undefined,
        responseTime,
        errorCount: config.errorCount,
        lastError: config.lastError || undefined,
        statistics: {
          totalSyncs: config.totalSyncs,
          successCount: config.successCount,
          failureCount: config.failureCount,
          successRate: config.totalSyncs > 0
            ? Math.round((config.successCount / config.totalSyncs) * 100)
            : 0,
        },
      });
    }

    return healthStatuses;
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs(): void {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.cronTask) {
        job.cronTask.stop();
        console.log(`Stopped job: ${jobId}`);
      }
    }
    this.jobs.clear();
  }

  /**
   * Encrypt integration configuration
   */
  encryptConfig(config: any): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(JSON.stringify(config), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt integration configuration
   */
  decryptConfig(encryptedConfig: string | any): any {
    // If already an object, return as-is (for dev/testing)
    if (typeof encryptedConfig === 'object') {
      return encryptedConfig;
    }

    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);

    const parts = encryptedConfig.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

// Singleton instance
let integrationManagerInstance: IntegrationManager | null = null;

/**
 * Get Integration Manager singleton
 */
export function getIntegrationManager(): IntegrationManager {
  if (!integrationManagerInstance) {
    integrationManagerInstance = new IntegrationManager();
  }
  return integrationManagerInstance;
}

/**
 * Initialize Integration Manager (call on server startup)
 */
export async function initializeIntegrationManager(): Promise<void> {
  const manager = getIntegrationManager();
  await manager.initialize();
}

// Export both class and default singleton instance
export default new IntegrationManager();
