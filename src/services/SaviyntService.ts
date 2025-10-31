import { PrismaClient } from '@prisma/client';
import {
  SaviyntApiClient,
  SaviyntUser,
  SaviyntRole,
  SaviyntCredentials
} from './SaviyntApiClient';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import {
  SaviyntSyncStatus,
  SaviyntSyncType,
  SaviyntEntityType,
  SaviyntOperation,
  SaviyntMappingType
} from '@prisma/client';

export interface UserSyncResult {
  success: boolean;
  userKey?: string;
  errorMessage?: string;
  operation: SaviyntOperation;
}

export interface RoleSyncResult {
  success: boolean;
  roleKey?: string;
  errorMessage?: string;
  operation: SaviyntOperation;
}

export interface SyncBatchResult {
  successCount: number;
  failureCount: number;
  results: (UserSyncResult | RoleSyncResult)[];
  batchId: string;
}

export interface SaviyntHealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  errorMessage?: string;
  responseTime?: number;
}

export class SaviyntService {
  private prisma: PrismaClient;
  private apiClient: SaviyntApiClient;
  private isEnabled: boolean;

  constructor(prisma: PrismaClient, credentials?: SaviyntCredentials) {
    this.prisma = prisma;
    this.isEnabled = config.saviynt.enabled;
    this.apiClient = new SaviyntApiClient(credentials);
  }

  /**
   * Initialize the Saviynt service
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Saviynt integration is disabled');
      return;
    }

    try {
      await this.apiClient.authenticate();
      const isHealthy = await this.apiClient.testConnection();

      if (!isHealthy) {
        throw new Error('Saviynt health check failed');
      }

      logger.info('Saviynt service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Saviynt service', { error });
      throw error;
    }
  }

  /**
   * Check if Saviynt integration is enabled and healthy
   */
  public async getHealthStatus(): Promise<SaviyntHealthStatus> {
    if (!this.isEnabled) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: 'Saviynt integration is disabled',
      };
    }

    const startTime = Date.now();
    try {
      const isHealthy = await this.apiClient.testConnection();
      const responseTime = Date.now() - startTime;

      return {
        isHealthy,
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error) {
      return {
        isHealthy: false,
        lastChecked: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Sync a user to Saviynt
   */
  public async syncUser(
    userId: string,
    operation: SaviyntOperation,
    triggeredBy: string
  ): Promise<UserSyncResult> {
    if (!this.isEnabled) {
      throw new Error('Saviynt integration is disabled');
    }

    const startTime = Date.now();
    const batchId = `user-sync-${Date.now()}`;

    try {
      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { saviyntUserMapping: true },
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      let result: UserSyncResult;

      switch (operation) {
        case SaviyntOperation.CREATE:
        case SaviyntOperation.PROVISION:
          result = await this.provisionUser(user, batchId, triggeredBy);
          break;

        case SaviyntOperation.UPDATE:
        case SaviyntOperation.SYNC:
          result = await this.updateUserInSaviynt(user, batchId, triggeredBy);
          break;

        case SaviyntOperation.DELETE:
        case SaviyntOperation.DEPROVISION:
          result = await this.deprovisionUser(user, batchId, triggeredBy);
          break;

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Log sync result
      await this.logSyncOperation({
        syncType: SaviyntSyncType.REAL_TIME,
        entityType: SaviyntEntityType.USER,
        entityId: userId,
        saviyntEntityId: result.userKey,
        operation,
        status: result.success ? SaviyntSyncStatus.COMPLETED : SaviyntSyncStatus.FAILED,
        errorMessage: result.errorMessage,
        duration: Date.now() - startTime,
        triggeredBy,
        syncBatchId: batchId,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed sync
      await this.logSyncOperation({
        syncType: SaviyntSyncType.REAL_TIME,
        entityType: SaviyntEntityType.USER,
        entityId: userId,
        operation,
        status: SaviyntSyncStatus.FAILED,
        errorMessage,
        duration: Date.now() - startTime,
        triggeredBy,
        syncBatchId: batchId,
      });

      return {
        success: false,
        errorMessage,
        operation,
      };
    }
  }

  /**
   * Provision a new user in Saviynt
   */
  private async provisionUser(
    user: any,
    batchId: string,
    triggeredBy: string
  ): Promise<UserSyncResult> {
    try {
      // Check if user is already mapped
      if (user.saviyntUserMapping) {
        throw new Error('User is already provisioned in Saviynt');
      }

      // Create Saviynt user object
      const saviyntUser: SaviyntUser = {
        username: user.username,
        email: user.email,
        firstname: user.firstName || '',
        lastname: user.lastName || '',
        displayname: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        employeeid: user.employeeNumber || '',
        departmentname: user.department || '',
        enabledate: new Date().toISOString().split('T')[0],
        statuskey: user.isActive ? '1' : '0',
        attributes: {
          mesUserId: user.id,
          phone: user.phone,
          hireDate: user.hireDate?.toISOString(),
          costCenter: user.costCenter,
        },
      };

      // Create user in Saviynt
      const userKey = await this.apiClient.createUser(saviyntUser);

      // Create mapping in database
      await this.prisma.saviyntUserMapping.create({
        data: {
          userId: user.id,
          saviyntUserId: userKey,
          saviyntUsername: user.username,
          syncStatus: SaviyntSyncStatus.COMPLETED,
          provisionedAt: new Date(),
          lastSyncAt: new Date(),
          attributes: saviyntUser.attributes,
        },
      });

      logger.info('User provisioned in Saviynt', {
        userId: user.id,
        userKey,
        username: user.username,
      });

      return {
        success: true,
        userKey,
        operation: SaviyntOperation.PROVISION,
      };
    } catch (error) {
      logger.error('Failed to provision user in Saviynt', {
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        operation: SaviyntOperation.PROVISION,
      };
    }
  }

  /**
   * Update user in Saviynt
   */
  private async updateUserInSaviynt(
    user: any,
    batchId: string,
    triggeredBy: string
  ): Promise<UserSyncResult> {
    try {
      if (!user.saviyntUserMapping) {
        // User not provisioned, provision them first
        return await this.provisionUser(user, batchId, triggeredBy);
      }

      // Update Saviynt user
      const updates: Partial<SaviyntUser> = {
        email: user.email,
        firstname: user.firstName || '',
        lastname: user.lastName || '',
        displayname: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        employeeid: user.employeeNumber || '',
        departmentname: user.department || '',
        statuskey: user.isActive ? '1' : '0',
        attributes: {
          mesUserId: user.id,
          phone: user.phone,
          hireDate: user.hireDate?.toISOString(),
          costCenter: user.costCenter,
        },
      };

      await this.apiClient.updateUser(user.saviyntUserMapping.saviyntUserId, updates);

      // Update mapping
      await this.prisma.saviyntUserMapping.update({
        where: { userId: user.id },
        data: {
          lastSyncAt: new Date(),
          syncStatus: SaviyntSyncStatus.COMPLETED,
          attributes: updates.attributes,
        },
      });

      logger.info('User updated in Saviynt', {
        userId: user.id,
        userKey: user.saviyntUserMapping.saviyntUserId,
      });

      return {
        success: true,
        userKey: user.saviyntUserMapping.saviyntUserId,
        operation: SaviyntOperation.UPDATE,
      };
    } catch (error) {
      logger.error('Failed to update user in Saviynt', {
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        operation: SaviyntOperation.UPDATE,
      };
    }
  }

  /**
   * Deprovision user from Saviynt
   */
  private async deprovisionUser(
    user: any,
    batchId: string,
    triggeredBy: string
  ): Promise<UserSyncResult> {
    try {
      if (!user.saviyntUserMapping) {
        throw new Error('User is not provisioned in Saviynt');
      }

      // Disable user in Saviynt instead of deleting
      await this.apiClient.disableUser(user.saviyntUserMapping.saviyntUserId);

      // Update mapping status
      await this.prisma.saviyntUserMapping.update({
        where: { userId: user.id },
        data: {
          isActive: false,
          lastSyncAt: new Date(),
          syncStatus: SaviyntSyncStatus.COMPLETED,
        },
      });

      logger.info('User deprovisioned in Saviynt', {
        userId: user.id,
        userKey: user.saviyntUserMapping.saviyntUserId,
      });

      return {
        success: true,
        userKey: user.saviyntUserMapping.saviyntUserId,
        operation: SaviyntOperation.DEPROVISION,
      };
    } catch (error) {
      logger.error('Failed to deprovision user in Saviynt', {
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        operation: SaviyntOperation.DEPROVISION,
      };
    }
  }

  /**
   * Sync role mappings to Saviynt
   */
  public async syncRole(
    roleId: string,
    operation: SaviyntOperation,
    triggeredBy: string
  ): Promise<RoleSyncResult> {
    if (!this.isEnabled) {
      throw new Error('Saviynt integration is disabled');
    }

    const startTime = Date.now();
    const batchId = `role-sync-${Date.now()}`;

    try {
      // Get role from database
      const role = await this.prisma.role.findUnique({
        where: { id: roleId },
        include: { saviyntRoleMappings: true },
      });

      if (!role) {
        throw new Error(`Role not found: ${roleId}`);
      }

      let result: RoleSyncResult;

      switch (operation) {
        case SaviyntOperation.CREATE:
          result = await this.createRoleMapping(role, batchId, triggeredBy);
          break;

        case SaviyntOperation.UPDATE:
        case SaviyntOperation.SYNC:
          result = await this.updateRoleMapping(role, batchId, triggeredBy);
          break;

        case SaviyntOperation.DELETE:
          result = await this.deleteRoleMapping(role, batchId, triggeredBy);
          break;

        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }

      // Log sync result
      await this.logSyncOperation({
        syncType: SaviyntSyncType.REAL_TIME,
        entityType: SaviyntEntityType.ROLE,
        entityId: roleId,
        saviyntEntityId: result.roleKey,
        operation,
        status: result.success ? SaviyntSyncStatus.COMPLETED : SaviyntSyncStatus.FAILED,
        errorMessage: result.errorMessage,
        duration: Date.now() - startTime,
        triggeredBy,
        syncBatchId: batchId,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed sync
      await this.logSyncOperation({
        syncType: SaviyntSyncType.REAL_TIME,
        entityType: SaviyntEntityType.ROLE,
        entityId: roleId,
        operation,
        status: SaviyntSyncStatus.FAILED,
        errorMessage,
        duration: Date.now() - startTime,
        triggeredBy,
        syncBatchId: batchId,
      });

      return {
        success: false,
        errorMessage,
        operation,
      };
    }
  }

  /**
   * Create role mapping in Saviynt
   */
  private async createRoleMapping(
    role: any,
    batchId: string,
    triggeredBy: string
  ): Promise<RoleSyncResult> {
    try {
      // Check if mapping already exists
      if (role.saviyntRoleMappings.length > 0) {
        throw new Error('Role mapping already exists');
      }

      // Get or create corresponding Saviynt role
      let saviyntRole = await this.apiClient.getRole(role.roleCode);

      if (!saviyntRole) {
        // Create role in Saviynt
        const newRole: SaviyntRole = {
          rolename: role.roleCode,
          roledisplayname: role.roleName,
          roledescription: role.description || '',
          attributes: {
            mesRoleId: role.id,
            isGlobal: role.isGlobal,
            createdBy: role.createdBy,
          },
        };

        const roleKey = await this.apiClient.createRole(newRole);
        saviyntRole = { ...newRole, rolekey: roleKey };
      }

      // Create mapping in database
      await this.prisma.saviyntRoleMapping.create({
        data: {
          roleId: role.id,
          saviyntRoleId: saviyntRole.rolekey!,
          saviyntRoleName: saviyntRole.rolename,
          mappingType: SaviyntMappingType.AUTOMATIC,
          lastSyncAt: new Date(),
        },
      });

      logger.info('Role mapping created in Saviynt', {
        roleId: role.id,
        saviyntRoleKey: saviyntRole.rolekey,
      });

      return {
        success: true,
        roleKey: saviyntRole.rolekey,
        operation: SaviyntOperation.CREATE,
      };
    } catch (error) {
      logger.error('Failed to create role mapping in Saviynt', {
        roleId: role.id,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        operation: SaviyntOperation.CREATE,
      };
    }
  }

  /**
   * Update role mapping in Saviynt
   */
  private async updateRoleMapping(
    role: any,
    batchId: string,
    triggeredBy: string
  ): Promise<RoleSyncResult> {
    try {
      if (role.saviyntRoleMappings.length === 0) {
        // No mapping exists, create one
        return await this.createRoleMapping(role, batchId, triggeredBy);
      }

      const mapping = role.saviyntRoleMappings[0];

      // Update role in Saviynt
      const updates: Partial<SaviyntRole> = {
        roledisplayname: role.roleName,
        roledescription: role.description || '',
        attributes: {
          mesRoleId: role.id,
          isGlobal: role.isGlobal,
          lastUpdated: new Date().toISOString(),
        },
      };

      await this.apiClient.updateRole(mapping.saviyntRoleId, updates);

      // Update mapping
      await this.prisma.saviyntRoleMapping.update({
        where: { id: mapping.id },
        data: {
          lastSyncAt: new Date(),
        },
      });

      logger.info('Role mapping updated in Saviynt', {
        roleId: role.id,
        saviyntRoleKey: mapping.saviyntRoleId,
      });

      return {
        success: true,
        roleKey: mapping.saviyntRoleId,
        operation: SaviyntOperation.UPDATE,
      };
    } catch (error) {
      logger.error('Failed to update role mapping in Saviynt', {
        roleId: role.id,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        operation: SaviyntOperation.UPDATE,
      };
    }
  }

  /**
   * Delete role mapping from Saviynt
   */
  private async deleteRoleMapping(
    role: any,
    batchId: string,
    triggeredBy: string
  ): Promise<RoleSyncResult> {
    try {
      if (role.saviyntRoleMappings.length === 0) {
        throw new Error('No role mapping exists');
      }

      const mapping = role.saviyntRoleMappings[0];

      // Mark mapping as inactive instead of deleting
      await this.prisma.saviyntRoleMapping.update({
        where: { id: mapping.id },
        data: {
          isActive: false,
          lastSyncAt: new Date(),
        },
      });

      logger.info('Role mapping deactivated in Saviynt', {
        roleId: role.id,
        saviyntRoleKey: mapping.saviyntRoleId,
      });

      return {
        success: true,
        roleKey: mapping.saviyntRoleId,
        operation: SaviyntOperation.DELETE,
      };
    } catch (error) {
      logger.error('Failed to delete role mapping in Saviynt', {
        roleId: role.id,
        error: error instanceof Error ? error.message : error,
      });

      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        operation: SaviyntOperation.DELETE,
      };
    }
  }

  /**
   * Log sync operation to database
   */
  private async logSyncOperation(data: {
    syncType: SaviyntSyncType;
    entityType: SaviyntEntityType;
    entityId: string;
    saviyntEntityId?: string;
    operation: SaviyntOperation;
    status: SaviyntSyncStatus;
    requestPayload?: any;
    responsePayload?: any;
    errorMessage?: string;
    errorCode?: string;
    retryCount?: number;
    duration?: number;
    triggeredBy: string;
    syncBatchId?: string;
  }): Promise<void> {
    try {
      await this.prisma.saviyntSyncLog.create({
        data: {
          ...data,
          startedAt: new Date(),
          completedAt: data.status === SaviyntSyncStatus.COMPLETED ? new Date() : undefined,
        },
      });
    } catch (error) {
      logger.error('Failed to log sync operation', { error, data });
    }
  }

  /**
   * Get sync statistics
   */
  public async getSyncStatistics(timeRange?: { start: Date; end: Date }) {
    const where = timeRange ? {
      startedAt: {
        gte: timeRange.start,
        lte: timeRange.end,
      },
    } : {};

    const stats = await this.prisma.saviyntSyncLog.groupBy({
      by: ['status', 'entityType', 'operation'],
      where,
      _count: true,
    });

    const totalDuration = await this.prisma.saviyntSyncLog.aggregate({
      where: {
        ...where,
        duration: { not: null },
      },
      _avg: { duration: true },
      _sum: { duration: true },
    });

    return {
      operations: stats,
      averageDuration: totalDuration._avg.duration,
      totalDuration: totalDuration._sum.duration,
    };
  }

  /**
   * Get recent sync logs
   */
  public async getRecentSyncLogs(limit = 50) {
    return this.prisma.saviyntSyncLog.findMany({
      take: limit,
      orderBy: { startedAt: 'desc' },
    });
  }

  /**
   * Test Saviynt connectivity and authentication
   */
  public async testConnectivity(): Promise<SaviyntHealthStatus> {
    return this.getHealthStatus();
  }
}

// Export configured instance
export const saviyntService = new SaviyntService(new PrismaClient());