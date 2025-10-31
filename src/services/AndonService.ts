/**
 * AndonService - Comprehensive Andon system management for shop floor issue escalation
 *
 * Provides full CRUD operations for Andon system including:
 * - Alert creation, management, and resolution
 * - Issue type configuration and management
 * - Escalation rule management and execution
 * - Configuration management (global and site-specific)
 * - Notification template management
 * - System settings management
 * - Analytics and reporting
 *
 * Created for Issue #171: Production Alerts & Andon Core Infrastructure
 */

import {
  AndonAlert,
  AndonIssueType,
  AndonEscalationRule,
  AndonEscalationRuleResult,
  AndonConfiguration,
  AndonSiteConfiguration,
  AndonNotificationTemplate,
  AndonSystemSettings,
  AndonSeverity,
  AndonPriority,
  AndonAlertStatus,
  User,
  Site,
  Area,
  WorkCenter,
  Equipment,
  WorkOrder,
  Operation
} from '@prisma/client';
import prisma from '../lib/database';

// Guard check for prisma instance
if (!prisma) {
  throw new Error('Database connection not available. Check DATABASE_URL environment variable and database server connectivity.');
}

// ================================
// ANDON ALERT TYPES AND INTERFACES
// ================================

export interface CreateAndonAlertData {
  title: string;
  description?: string;
  issueTypeId: string;
  severity?: AndonSeverity;
  priority?: AndonPriority;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  equipmentId?: string;
  workOrderId?: string;
  operationId?: string;
  raisedById: string;
  metadata?: any;
  attachments?: any[];
}

export interface UpdateAndonAlertData {
  title?: string;
  description?: string;
  severity?: AndonSeverity;
  priority?: AndonPriority;
  assignedToId?: string;
  status?: AndonAlertStatus;
  resolutionNotes?: string;
  resolutionActionTaken?: string;
  metadata?: any;
  attachments?: any[];
}

export interface AndonAlertWithRelations extends AndonAlert {
  issueType?: AndonIssueType;
  site?: Site | null;
  area?: Area | null;
  workCenter?: WorkCenter | null;
  equipment?: Equipment | null;
  workOrder?: WorkOrder | null;
  operation?: Operation | null;
  raisedBy?: User;
  assignedTo?: User | null;
  resolvedBy?: User | null;
  escalationRuleResults?: AndonEscalationRuleResult[];
}

export interface AndonAlertFilters {
  status?: AndonAlertStatus[];
  severity?: AndonSeverity[];
  priority?: AndonPriority[];
  issueTypeId?: string;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  equipmentId?: string;
  raisedById?: string;
  assignedToId?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  isOverdue?: boolean;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AndonAlertListResult {
  alerts: AndonAlertWithRelations[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ================================
// ISSUE TYPE TYPES AND INTERFACES
// ================================

export interface CreateAndonIssueTypeData {
  typeCode: string;
  typeName: string;
  description?: string;
  defaultSeverity?: AndonSeverity;
  defaultPriority?: AndonPriority;
  requiresAttachment?: boolean;
  requiresWorkOrder?: boolean;
  requiresEquipment?: boolean;
  autoAssignRole?: string;
  autoAssignUserId?: string;
  enableEscalation?: boolean;
  escalationTimeoutMins?: number;
  siteId?: string;
  iconName?: string;
  colorCode?: string;
  displayOrder?: number;
  createdBy: string;
}

export interface UpdateAndonIssueTypeData {
  typeName?: string;
  description?: string;
  defaultSeverity?: AndonSeverity;
  defaultPriority?: AndonPriority;
  requiresAttachment?: boolean;
  requiresWorkOrder?: boolean;
  requiresEquipment?: boolean;
  autoAssignRole?: string;
  autoAssignUserId?: string;
  enableEscalation?: boolean;
  escalationTimeoutMins?: number;
  iconName?: string;
  colorCode?: string;
  displayOrder?: number;
  isActive?: boolean;
  updatedBy: string;
}

export interface AndonIssueTypeWithRelations extends AndonIssueType {
  site?: Site | null;
  autoAssignUser?: User | null;
  alerts?: AndonAlert[];
  escalationRules?: AndonEscalationRule[];
  _count?: {
    alerts: number;
    escalationRules: number;
  };
}

// ================================
// ESCALATION RULE TYPES AND INTERFACES
// ================================

export interface CreateAndonEscalationRuleData {
  ruleName: string;
  description?: string;
  siteId?: string;
  issueTypeId?: string;
  triggerSeverity: AndonSeverity[];
  triggerAfterMinutes: number;
  escalationLevel: number;
  notifyUserIds?: string[];
  notifyRoles?: string[];
  notifyChannels?: string[];
  assignToUserId?: string;
  assignToRole?: string;
  conditions?: any;
  priority?: number;
  createdBy: string;
}

export interface UpdateAndonEscalationRuleData {
  ruleName?: string;
  description?: string;
  triggerSeverity?: AndonSeverity[];
  triggerAfterMinutes?: number;
  escalationLevel?: number;
  notifyUserIds?: string[];
  notifyRoles?: string[];
  notifyChannels?: string[];
  assignToUserId?: string;
  assignToRole?: string;
  conditions?: any;
  isActive?: boolean;
  priority?: number;
  updatedBy: string;
}

export interface AndonEscalationRuleWithRelations extends AndonEscalationRule {
  site?: Site | null;
  issueType?: AndonIssueType | null;
  assignToUser?: User | null;
  results?: AndonEscalationRuleResult[];
  _count?: {
    results: number;
  };
}

// ================================
// CONFIGURATION TYPES AND INTERFACES
// ================================

export interface AndonConfigurationData {
  configKey: string;
  configValue: any;
  description?: string;
  dataType: string;
  category: string;
  isRequired?: boolean;
  validationRules?: any;
  defaultValue?: any;
  isEncrypted?: boolean;
  accessLevel?: string;
  lastModifiedBy: string;
}

export interface AndonSiteConfigurationData {
  siteId: string;
  configKey: string;
  configValue: any;
  isOverride?: boolean;
  inheritFromGlobal?: boolean;
  lastModifiedBy: string;
}

// ================================
// STATISTICS AND ANALYTICS INTERFACES
// ================================

export interface AndonSystemStats {
  totalAlerts: number;
  openAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number; // minutes
  averageResolutionTime: number; // minutes
  alertsBySeverity: Record<AndonSeverity, number>;
  alertsByStatus: Record<AndonAlertStatus, number>;
  alertsByIssueType: Record<string, { typeName: string; count: number }>;
  escalationStats: {
    totalEscalations: number;
    escalationsByLevel: Record<number, number>;
  };
  topIssues: Array<{
    issueTypeId: string;
    typeName: string;
    count: number;
    averageResolutionTime: number;
  }>;
}

/**
 * Andon Service Class - Core Andon system management
 */
export class AndonService {
  // ================================
  // ANDON ALERT MANAGEMENT
  // ================================

  /**
   * Create a new Andon alert
   */
  static async createAndonAlert(data: CreateAndonAlertData): Promise<AndonAlert> {
    // Validate issue type exists
    const issueType = await prisma.andonIssueType.findUnique({
      where: { id: data.issueTypeId, isActive: true }
    });

    if (!issueType) {
      throw new Error(`Active issue type with ID '${data.issueTypeId}' not found`);
    }

    // Validate user exists
    const user = await prisma.user.findUnique({
      where: { id: data.raisedById, isActive: true }
    });

    if (!user) {
      throw new Error(`Active user with ID '${data.raisedById}' not found`);
    }

    // Validate optional foreign keys
    if (data.siteId) {
      const site = await prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site) throw new Error(`Site with ID '${data.siteId}' not found`);
    }

    if (data.areaId) {
      const area = await prisma.area.findUnique({ where: { id: data.areaId } });
      if (!area) throw new Error(`Area with ID '${data.areaId}' not found`);
    }

    if (data.workCenterId) {
      const workCenter = await prisma.workCenter.findUnique({ where: { id: data.workCenterId } });
      if (!workCenter) throw new Error(`Work center with ID '${data.workCenterId}' not found`);
    }

    if (data.equipmentId) {
      const equipment = await prisma.equipment.findUnique({ where: { id: data.equipmentId } });
      if (!equipment) throw new Error(`Equipment with ID '${data.equipmentId}' not found`);
    }

    if (data.workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({ where: { id: data.workOrderId } });
      if (!workOrder) throw new Error(`Work order with ID '${data.workOrderId}' not found`);
    }

    if (data.operationId) {
      const operation = await prisma.operation.findUnique({ where: { id: data.operationId } });
      if (!operation) throw new Error(`Operation with ID '${data.operationId}' not found`);
    }

    // Generate alert number
    const alertNumber = await AndonService.generateAlertNumber();

    // Use issue type defaults if not specified
    const severity = data.severity || issueType.defaultSeverity;
    const priority = data.priority || issueType.defaultPriority;

    // Determine auto-assignment
    let assignedToId: string | null = null;
    if (issueType.autoAssignUserId) {
      assignedToId = issueType.autoAssignUserId;
    } else if (issueType.autoAssignRole) {
      // Find a user with the specified role (simplified - in production this would be more sophisticated)
      const userWithRole = await prisma.user.findFirst({
        where: {
          roles: { has: issueType.autoAssignRole },
          isActive: true
        }
      });
      assignedToId = userWithRole?.id || null;
    }

    const alert = await prisma.andonAlert.create({
      data: {
        alertNumber,
        title: data.title,
        description: data.description || null,
        issueTypeId: data.issueTypeId,
        severity,
        priority,
        siteId: data.siteId || null,
        areaId: data.areaId || null,
        workCenterId: data.workCenterId || null,
        equipmentId: data.equipmentId || null,
        workOrderId: data.workOrderId || null,
        operationId: data.operationId || null,
        raisedById: data.raisedById,
        assignedToId,
        status: AndonAlertStatus.OPEN,
        statusHistory: [
          {
            status: AndonAlertStatus.OPEN,
            timestamp: new Date().toISOString(),
            userId: data.raisedById,
            notes: 'Alert created'
          }
        ],
        currentEscalationLevel: 0,
        nextEscalationAt: issueType.enableEscalation && issueType.escalationTimeoutMins
          ? new Date(Date.now() + issueType.escalationTimeoutMins * 60 * 1000)
          : null,
        escalationHistory: [],
        metadata: data.metadata || null,
        attachments: data.attachments || []
      }
    });

    return alert;
  }

  /**
   * Get Andon alert by ID with optional relations
   */
  static async getAndonAlertById(
    id: string,
    includeRelations: boolean = false
  ): Promise<AndonAlertWithRelations | null> {
    const include = includeRelations ? {
      issueType: true,
      site: true,
      area: true,
      workCenter: true,
      equipment: true,
      workOrder: true,
      operation: true,
      raisedBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      assignedTo: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      resolvedBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true
        }
      },
      escalationRuleResults: {
        include: {
          rule: true
        },
        orderBy: {
          executedAt: 'desc'
        }
      }
    } : undefined;

    return prisma.andonAlert.findUnique({
      where: { id },
      include
    });
  }

  /**
   * Update an Andon alert
   */
  static async updateAndonAlert(id: string, data: UpdateAndonAlertData): Promise<AndonAlert> {
    const existingAlert = await prisma.andonAlert.findUnique({
      where: { id }
    });

    if (!existingAlert) {
      throw new Error(`Andon alert with ID '${id}' not found`);
    }

    // Validate assignee if specified
    if (data.assignedToId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assignedToId, isActive: true }
      });
      if (!assignee) {
        throw new Error(`Active user with ID '${data.assignedToId}' not found`);
      }
    }

    // Build status history entry if status changed
    let statusHistory = existingAlert.statusHistory as any[];
    if (data.status && data.status !== existingAlert.status) {
      statusHistory = [
        ...statusHistory,
        {
          status: data.status,
          timestamp: new Date().toISOString(),
          userId: data.assignedToId || existingAlert.assignedToId,
          notes: `Status changed to ${data.status}`
        }
      ];
    }

    // Calculate timing metrics for resolution
    let updateData: any = {
      ...data,
      statusHistory,
      updatedAt: new Date()
    };

    if (data.status === AndonAlertStatus.RESOLVED && !existingAlert.resolvedAt) {
      const now = new Date();
      const resolutionTime = Math.floor((now.getTime() - existingAlert.createdAt.getTime()) / (1000 * 60));

      updateData = {
        ...updateData,
        resolvedAt: now,
        resolutionTime
      };
    }

    return prisma.andonAlert.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * List Andon alerts with filtering and pagination
   */
  static async listAndonAlerts(
    filters: AndonAlertFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<AndonAlertListResult> {
    const {
      page = 1,
      pageSize = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = pagination;

    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {};

    if (filters.status?.length) {
      where.status = { in: filters.status };
    }

    if (filters.severity?.length) {
      where.severity = { in: filters.severity };
    }

    if (filters.priority?.length) {
      where.priority = { in: filters.priority };
    }

    if (filters.issueTypeId) {
      where.issueTypeId = filters.issueTypeId;
    }

    if (filters.siteId) {
      where.siteId = filters.siteId;
    }

    if (filters.areaId) {
      where.areaId = filters.areaId;
    }

    if (filters.workCenterId) {
      where.workCenterId = filters.workCenterId;
    }

    if (filters.equipmentId) {
      where.equipmentId = filters.equipmentId;
    }

    if (filters.raisedById) {
      where.raisedById = filters.raisedById;
    }

    if (filters.assignedToId) {
      where.assignedToId = filters.assignedToId;
    }

    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    if (filters.isOverdue) {
      where.nextEscalationAt = {
        lt: new Date()
      };
      where.status = {
        in: [AndonAlertStatus.OPEN, AndonAlertStatus.ACKNOWLEDGED, AndonAlertStatus.IN_PROGRESS]
      };
    }

    const [alerts, total] = await Promise.all([
      prisma.andonAlert.findMany({
        where,
        include: {
          issueType: true,
          site: { select: { id: true, siteName: true } },
          area: { select: { id: true, areaName: true } },
          workCenter: { select: { id: true, name: true } },
          equipment: { select: { id: true, name: true, equipmentNumber: true } },
          workOrder: { select: { id: true, workOrderNumber: true } },
          operation: { select: { id: true, operationName: true } },
          raisedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: pageSize
      }),
      prisma.andonAlert.count({ where })
    ]);

    return {
      alerts,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }

  /**
   * Close an Andon alert
   */
  static async closeAndonAlert(
    id: string,
    closedById: string,
    resolutionNotes?: string,
    resolutionActionTaken?: string
  ): Promise<AndonAlert> {
    const alert = await prisma.andonAlert.findUnique({
      where: { id }
    });

    if (!alert) {
      throw new Error(`Andon alert with ID '${id}' not found`);
    }

    if (alert.status === AndonAlertStatus.CLOSED) {
      throw new Error('Alert is already closed');
    }

    const now = new Date();
    const resolutionTime = Math.floor((now.getTime() - alert.createdAt.getTime()) / (1000 * 60));

    // Update status history
    const statusHistory = [
      ...(alert.statusHistory as any[]),
      {
        status: AndonAlertStatus.CLOSED,
        timestamp: now.toISOString(),
        userId: closedById,
        notes: resolutionNotes || 'Alert closed'
      }
    ];

    return prisma.andonAlert.update({
      where: { id },
      data: {
        status: AndonAlertStatus.CLOSED,
        resolvedAt: alert.resolvedAt || now,
        resolvedById: closedById,
        resolutionTime: alert.resolutionTime || resolutionTime,
        resolutionNotes,
        resolutionActionTaken,
        statusHistory,
        nextEscalationAt: null // Clear escalation
      }
    });
  }

  // ================================
  // ISSUE TYPE MANAGEMENT
  // ================================

  /**
   * Create a new Andon issue type
   */
  static async createAndonIssueType(data: CreateAndonIssueTypeData): Promise<AndonIssueType> {
    // Validate type code uniqueness
    const existingType = await prisma.andonIssueType.findUnique({
      where: { typeCode: data.typeCode }
    });

    if (existingType) {
      throw new Error(`Issue type with code '${data.typeCode}' already exists`);
    }

    // Validate site if specified
    if (data.siteId) {
      const site = await prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site) throw new Error(`Site with ID '${data.siteId}' not found`);
    }

    // Validate auto-assign user if specified
    if (data.autoAssignUserId) {
      const user = await prisma.user.findUnique({
        where: { id: data.autoAssignUserId, isActive: true }
      });
      if (!user) throw new Error(`Active user with ID '${data.autoAssignUserId}' not found`);
    }

    return prisma.andonIssueType.create({
      data: {
        typeCode: data.typeCode,
        typeName: data.typeName,
        description: data.description || null,
        defaultSeverity: data.defaultSeverity || AndonSeverity.MEDIUM,
        defaultPriority: data.defaultPriority || AndonPriority.NORMAL,
        requiresAttachment: data.requiresAttachment || false,
        requiresWorkOrder: data.requiresWorkOrder || false,
        requiresEquipment: data.requiresEquipment || false,
        autoAssignRole: data.autoAssignRole || null,
        autoAssignUserId: data.autoAssignUserId || null,
        enableEscalation: data.enableEscalation ?? true,
        escalationTimeoutMins: data.escalationTimeoutMins || 30,
        siteId: data.siteId || null,
        iconName: data.iconName || null,
        colorCode: data.colorCode || null,
        displayOrder: data.displayOrder || null,
        createdBy: data.createdBy
      }
    });
  }

  /**
   * Get Andon issue type by ID
   */
  static async getAndonIssueTypeById(
    id: string,
    includeRelations: boolean = false
  ): Promise<AndonIssueTypeWithRelations | null> {
    const include = includeRelations ? {
      site: true,
      autoAssignUser: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      _count: {
        select: {
          alerts: true,
          escalationRules: true
        }
      }
    } : undefined;

    return prisma.andonIssueType.findUnique({
      where: { id },
      include
    });
  }

  /**
   * Update an Andon issue type
   */
  static async updateAndonIssueType(id: string, data: UpdateAndonIssueTypeData): Promise<AndonIssueType> {
    const existingType = await prisma.andonIssueType.findUnique({
      where: { id }
    });

    if (!existingType) {
      throw new Error(`Issue type with ID '${id}' not found`);
    }

    // Validate auto-assign user if specified
    if (data.autoAssignUserId) {
      const user = await prisma.user.findUnique({
        where: { id: data.autoAssignUserId, isActive: true }
      });
      if (!user) throw new Error(`Active user with ID '${data.autoAssignUserId}' not found`);
    }

    return prisma.andonIssueType.update({
      where: { id },
      data: {
        ...data,
        updatedBy: data.updatedBy
      }
    });
  }

  /**
   * List Andon issue types
   */
  static async listAndonIssueTypes(
    siteId?: string,
    activeOnly: boolean = true
  ): Promise<AndonIssueTypeWithRelations[]> {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (siteId) {
      where.OR = [
        { siteId: siteId },
        { siteId: null } // Include global types
      ];
    }

    return prisma.andonIssueType.findMany({
      where,
      include: {
        site: { select: { id: true, siteName: true } },
        autoAssignUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            alerts: true,
            escalationRules: true
          }
        }
      },
      orderBy: [
        { displayOrder: 'asc' },
        { typeName: 'asc' }
      ]
    });
  }

  // ================================
  // ESCALATION RULE MANAGEMENT
  // ================================

  /**
   * Create a new escalation rule
   */
  static async createAndonEscalationRule(data: CreateAndonEscalationRuleData): Promise<AndonEscalationRule> {
    // Validate site if specified
    if (data.siteId) {
      const site = await prisma.site.findUnique({ where: { id: data.siteId } });
      if (!site) throw new Error(`Site with ID '${data.siteId}' not found`);
    }

    // Validate issue type if specified
    if (data.issueTypeId) {
      const issueType = await prisma.andonIssueType.findUnique({
        where: { id: data.issueTypeId }
      });
      if (!issueType) throw new Error(`Issue type with ID '${data.issueTypeId}' not found`);
    }

    // Validate assign-to user if specified
    if (data.assignToUserId) {
      const user = await prisma.user.findUnique({
        where: { id: data.assignToUserId, isActive: true }
      });
      if (!user) throw new Error(`Active user with ID '${data.assignToUserId}' not found`);
    }

    return prisma.andonEscalationRule.create({
      data: {
        ruleName: data.ruleName,
        description: data.description || null,
        siteId: data.siteId || null,
        issueTypeId: data.issueTypeId || null,
        triggerSeverity: data.triggerSeverity,
        triggerAfterMinutes: data.triggerAfterMinutes,
        escalationLevel: data.escalationLevel,
        notifyUserIds: data.notifyUserIds || [],
        notifyRoles: data.notifyRoles || [],
        notifyChannels: data.notifyChannels || [],
        assignToUserId: data.assignToUserId || null,
        assignToRole: data.assignToRole || null,
        conditions: data.conditions || null,
        priority: data.priority || 100,
        createdBy: data.createdBy
      }
    });
  }

  /**
   * Get escalation rule by ID
   */
  static async getAndonEscalationRuleById(
    id: string,
    includeRelations: boolean = false
  ): Promise<AndonEscalationRuleWithRelations | null> {
    const include = includeRelations ? {
      site: true,
      issueType: true,
      assignToUser: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true
        }
      },
      _count: {
        select: {
          results: true
        }
      }
    } : undefined;

    return prisma.andonEscalationRule.findUnique({
      where: { id },
      include
    });
  }

  /**
   * List escalation rules
   */
  static async listAndonEscalationRules(
    siteId?: string,
    issueTypeId?: string,
    activeOnly: boolean = true
  ): Promise<AndonEscalationRuleWithRelations[]> {
    const where: any = {};

    if (activeOnly) {
      where.isActive = true;
    }

    if (siteId) {
      where.OR = [
        { siteId: siteId },
        { siteId: null } // Include global rules
      ];
    }

    if (issueTypeId) {
      where.OR = [
        ...(where.OR || []),
        { issueTypeId: issueTypeId },
        { issueTypeId: null } // Include rules for all issue types
      ];
    }

    return prisma.andonEscalationRule.findMany({
      where,
      include: {
        site: { select: { id: true, siteName: true } },
        issueType: { select: { id: true, typeName: true } },
        assignToUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { escalationLevel: 'asc' },
        { ruleName: 'asc' }
      ]
    });
  }

  // ================================
  // CONFIGURATION MANAGEMENT
  // ================================

  /**
   * Get configuration value (with site override support)
   */
  static async getConfiguration(configKey: string, siteId?: string): Promise<any> {
    // First check for site-specific override
    if (siteId) {
      const siteConfig = await prisma.andonSiteConfiguration.findFirst({
        where: {
          siteId,
          configKey,
          isActive: true
        }
      });

      if (siteConfig) {
        return siteConfig.configValue;
      }
    }

    // Fall back to global configuration
    const globalConfig = await prisma.andonConfiguration.findUnique({
      where: {
        configKey
      }
    });

    return globalConfig?.configValue || null;
  }

  /**
   * Set configuration value
   */
  static async setConfiguration(data: AndonConfigurationData): Promise<AndonConfiguration> {
    return prisma.andonConfiguration.upsert({
      where: {
        configKey: data.configKey
      },
      update: {
        configValue: data.configValue,
        description: data.description,
        lastModifiedBy: data.lastModifiedBy
      },
      create: data
    });
  }

  /**
   * Set site-specific configuration override
   */
  static async setSiteConfiguration(data: AndonSiteConfigurationData): Promise<AndonSiteConfiguration> {
    // Validate site exists
    const site = await prisma.site.findUnique({ where: { id: data.siteId } });
    if (!site) throw new Error(`Site with ID '${data.siteId}' not found`);

    return prisma.andonSiteConfiguration.upsert({
      where: {
        siteId_configKey: {
          siteId: data.siteId,
          configKey: data.configKey
        }
      },
      update: {
        configValue: data.configValue,
        isOverride: data.isOverride ?? true,
        inheritFromGlobal: data.inheritFromGlobal ?? false,
        lastModifiedBy: data.lastModifiedBy
      },
      create: data
    });
  }

  // ================================
  // SYSTEM STATISTICS AND ANALYTICS
  // ================================

  /**
   * Get comprehensive Andon system statistics
   */
  static async getAndonSystemStats(
    siteId?: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<AndonSystemStats> {
    const whereClause: any = {};

    if (siteId) {
      whereClause.siteId = siteId;
    }

    if (dateRange) {
      whereClause.createdAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    // Get basic counts
    const [
      totalAlerts,
      openAlerts,
      resolvedAlerts,
      alertsBySeverity,
      alertsByStatus,
      alertsByIssueType,
      escalationResults
    ] = await Promise.all([
      prisma.andonAlert.count({ where: whereClause }),
      prisma.andonAlert.count({
        where: {
          ...whereClause,
          status: {
            in: [AndonAlertStatus.OPEN, AndonAlertStatus.ACKNOWLEDGED, AndonAlertStatus.IN_PROGRESS]
          }
        }
      }),
      prisma.andonAlert.count({
        where: {
          ...whereClause,
          status: {
            in: [AndonAlertStatus.RESOLVED, AndonAlertStatus.CLOSED]
          }
        }
      }),

      // Alerts by severity
      prisma.andonAlert.groupBy({
        by: ['severity'],
        where: whereClause,
        _count: { severity: true }
      }),

      // Alerts by status
      prisma.andonAlert.groupBy({
        by: ['status'],
        where: whereClause,
        _count: { status: true }
      }),

      // Alerts by issue type
      prisma.andonAlert.groupBy({
        by: ['issueTypeId'],
        where: whereClause,
        _count: { issueTypeId: true },
        orderBy: { _count: { issueTypeId: 'desc' } }
      }),

      // Escalation statistics
      prisma.andonEscalationRuleResult.groupBy({
        by: ['escalationLevel'],
        _count: { escalationLevel: true }
      })
    ]);

    // Calculate timing averages
    const timingStats = await prisma.andonAlert.aggregate({
      where: {
        ...whereClause,
        resolutionTime: { not: null }
      },
      _avg: {
        responseTime: true,
        resolutionTime: true
      }
    });

    // Build severity stats
    const severityStats: Record<AndonSeverity, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    alertsBySeverity.forEach(item => {
      severityStats[item.severity] = item._count.severity;
    });

    // Build status stats
    const statusStats: Record<AndonAlertStatus, number> = {
      OPEN: 0,
      ACKNOWLEDGED: 0,
      IN_PROGRESS: 0,
      ESCALATED: 0,
      RESOLVED: 0,
      CLOSED: 0,
      CANCELLED: 0
    };

    alertsByStatus.forEach(item => {
      statusStats[item.status] = item._count.status;
    });

    // Build escalation level stats
    const escalationsByLevel: Record<number, number> = {};
    escalationResults.forEach(item => {
      escalationsByLevel[item.escalationLevel] = item._count.escalationLevel;
    });

    // Get issue type details for top issues
    const issueTypeIds = alertsByIssueType.map(item => item.issueTypeId);
    const issueTypes = await prisma.andonIssueType.findMany({
      where: { id: { in: issueTypeIds } },
      select: { id: true, typeName: true }
    });

    const issueTypeMap = new Map(issueTypes.map(type => [type.id, type.typeName]));

    // Build issue type stats with resolution times
    const topIssues = await Promise.all(
      alertsByIssueType.slice(0, 10).map(async (item) => {
        const avgResolutionTime = await prisma.andonAlert.aggregate({
          where: {
            ...whereClause,
            issueTypeId: item.issueTypeId,
            resolutionTime: { not: null }
          },
          _avg: { resolutionTime: true }
        });

        return {
          issueTypeId: item.issueTypeId,
          typeName: issueTypeMap.get(item.issueTypeId) || 'Unknown',
          count: item._count.issueTypeId,
          averageResolutionTime: avgResolutionTime._avg.resolutionTime || 0
        };
      })
    );

    // Build issue type stats for the record
    const issueTypeStats: Record<string, { typeName: string; count: number }> = {};
    alertsByIssueType.forEach(item => {
      issueTypeStats[item.issueTypeId] = {
        typeName: issueTypeMap.get(item.issueTypeId) || 'Unknown',
        count: item._count.issueTypeId
      };
    });

    return {
      totalAlerts,
      openAlerts,
      resolvedAlerts,
      averageResponseTime: timingStats._avg.responseTime || 0,
      averageResolutionTime: timingStats._avg.resolutionTime || 0,
      alertsBySeverity: severityStats,
      alertsByStatus: statusStats,
      alertsByIssueType: issueTypeStats,
      escalationStats: {
        totalEscalations: escalationResults.reduce((sum, item) => sum + item._count.escalationLevel, 0),
        escalationsByLevel
      },
      topIssues
    };
  }

  // ================================
  // UTILITY METHODS
  // ================================

  /**
   * Generate unique alert number
   */
  private static async generateAlertNumber(): Promise<string> {
    const today = new Date();
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get the count of alerts created today
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayCount = await prisma.andonAlert.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lt: endOfDay
        }
      }
    });

    const sequence = (todayCount + 1).toString().padStart(4, '0');
    return `AND-${datePrefix}-${sequence}`;
  }

  /**
   * Search alerts by text
   */
  static async searchAndonAlerts(
    searchTerm: string,
    filters: AndonAlertFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<AndonAlertListResult> {
    const searchFilters = {
      ...filters,
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { alertNumber: { contains: searchTerm, mode: 'insensitive' } },
        { resolutionNotes: { contains: searchTerm, mode: 'insensitive' } }
      ]
    };

    return AndonService.listAndonAlerts(searchFilters, pagination);
  }

  /**
   * Get overdue alerts that need escalation
   */
  static async getOverdueAlerts(siteId?: string): Promise<AndonAlertWithRelations[]> {
    const where: any = {
      nextEscalationAt: {
        lt: new Date()
      },
      status: {
        in: [AndonAlertStatus.OPEN, AndonAlertStatus.ACKNOWLEDGED, AndonAlertStatus.IN_PROGRESS]
      }
    };

    if (siteId) {
      where.siteId = siteId;
    }

    return prisma.andonAlert.findMany({
      where,
      include: {
        issueType: true,
        site: true,
        raisedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      },
      orderBy: {
        nextEscalationAt: 'asc'
      }
    });
  }
}