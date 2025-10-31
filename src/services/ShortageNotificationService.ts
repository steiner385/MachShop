import { PrismaClient, NotificationType, AlertPriority, ExpeditUrgency, CommunicationPriority } from '@prisma/client';
import { NotificationService } from './NotificationService';

export interface ShortageNotificationConfig {
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  enableInAppNotifications: boolean;
  enableSlackIntegration: boolean;
  escalationRules: {
    materialPlannerEscalationMinutes: number;
    managerEscalationMinutes: number;
    directorEscalationMinutes: number;
  };
  stakeholderRoles: {
    materialPlanners: string[];
    procurementTeam: string[];
    productionSupervisors: string[];
    managers: string[];
    directors: string[];
  };
}

export interface ShortageNotificationContext {
  shortageAlertId: string;
  partNumber: string;
  partName: string;
  shortageQuantity: number;
  requiredByDate?: Date;
  workOrderNumber?: string;
  kitNumber?: string;
  priority: AlertPriority;
  estimatedCost?: number;
  affectedOperations?: string[];
  supplierInfo?: {
    name: string;
    contactEmail?: string;
    contactPhone?: string;
  };
}

export interface ExpeditNotificationContext {
  expeditRequestId: string;
  partNumber: string;
  partName: string;
  urgencyLevel: ExpeditUrgency;
  requiredByDate: Date;
  requestedBy: string;
  expediteFee?: number;
  justification: string;
  vendorName?: string;
  estimatedDeliveryDate?: Date;
}

/**
 * Service for handling automated notifications in the shortage detection and expedite workflow
 * Supports multi-channel notifications, escalation rules, and stakeholder communication
 */
export class ShortageNotificationService {
  private prisma: PrismaClient;
  private notificationService: NotificationService;
  private config: ShortageNotificationConfig;

  constructor(
    prisma: PrismaClient,
    notificationService: NotificationService,
    config: ShortageNotificationConfig
  ) {
    this.prisma = prisma;
    this.notificationService = notificationService;
    this.config = config;
  }

  /**
   * Send material shortage detection notification to stakeholders
   */
  async notifyMaterialShortageDetected(context: ShortageNotificationContext): Promise<void> {
    const { shortageAlertId, partNumber, partName, shortageQuantity, requiredByDate, priority } = context;

    // Determine notification priority based on shortage alert priority
    const notificationPriority = this.mapAlertPriorityToNotificationPriority(priority);

    // Get stakeholders to notify
    const stakeholders = await this.getShortageStakeholders(context);

    // Create notification message
    const title = `Material Shortage Detected: ${partNumber}`;
    const message = this.buildShortageDetectionMessage(context);
    const actionUrl = `/shortage-alerts/${shortageAlertId}`;

    // Send notifications to all stakeholders
    for (const stakeholder of stakeholders) {
      await this.notificationService.createNotification({
        userId: stakeholder.userId,
        type: NotificationType.MATERIAL_SHORTAGE_DETECTED,
        title,
        message,
        priority: notificationPriority,
        entityType: 'KitShortageAlert',
        entityId: shortageAlertId,
        actionUrl,
        channels: this.getNotificationChannels(stakeholder.role, priority),
      });
    }

    // If critical shortage, send immediate escalation
    if (priority === AlertPriority.CRITICAL || priority === AlertPriority.URGENT) {
      await this.sendCriticalShortageAlert(context);
    }

    // Schedule escalation reminders
    await this.scheduleEscalationReminders(shortageAlertId, context);
  }

  /**
   * Send expedite request created notification
   */
  async notifyExpeditRequestCreated(context: ExpeditNotificationContext): Promise<void> {
    const { expeditRequestId, partNumber, urgencyLevel, requestedBy } = context;

    const title = `Expedite Request Created: ${partNumber}`;
    const message = this.buildExpeditRequestMessage(context);
    const actionUrl = `/expedite-requests/${expeditRequestId}`;

    // Notify procurement team for approval
    const procurementTeam = await this.getProcurementTeamMembers();
    const notificationPriority = this.mapUrgencyToNotificationPriority(urgencyLevel);

    for (const member of procurementTeam) {
      await this.notificationService.createNotification({
        userId: member.id,
        type: NotificationType.EXPEDITE_REQUEST_CREATED,
        title,
        message,
        priority: notificationPriority,
        entityType: 'ExpeditRequest',
        entityId: expeditRequestId,
        actionUrl,
        channels: this.getNotificationChannels('procurement', AlertPriority.HIGH),
      });
    }

    // Notify requester that request was submitted
    await this.notificationService.createNotification({
      userId: requestedBy,
      type: NotificationType.EXPEDITE_REQUEST_CREATED,
      title: `Your expedite request for ${partNumber} has been submitted`,
      message: `Your expedite request is pending approval from procurement team.`,
      priority: 'MEDIUM',
      entityType: 'ExpeditRequest',
      entityId: expeditRequestId,
      actionUrl,
      channels: ['IN_APP', 'EMAIL'],
    });
  }

  /**
   * Send expedite request approval notification
   */
  async notifyExpeditRequestApproved(
    expeditRequestId: string,
    approvedBy: string,
    approvedCost?: number
  ): Promise<void> {
    const expeditRequest = await this.prisma.expeditRequest.findUnique({
      where: { id: expeditRequestId },
      include: {
        part: true,
        requestedBy: true,
        vendor: true,
      },
    });

    if (!expeditRequest) return;

    const title = `Expedite Request Approved: ${expeditRequest.part.partNumber}`;
    const message = `Expedite request for ${expeditRequest.part.partName} has been approved.${approvedCost ? ` Approved cost: $${approvedCost.toFixed(2)}` : ''}`;
    const actionUrl = `/expedite-requests/${expeditRequestId}`;

    // Notify requester
    await this.notificationService.createNotification({
      userId: expeditRequest.requestedById,
      type: NotificationType.EXPEDITE_REQUEST_APPROVED,
      title,
      message,
      priority: 'MEDIUM',
      entityType: 'ExpeditRequest',
      entityId: expeditRequestId,
      actionUrl,
      channels: ['IN_APP', 'EMAIL'],
    });

    // Notify material planners
    const materialPlanners = await this.getMaterialPlanners();
    for (const planner of materialPlanners) {
      await this.notificationService.createNotification({
        userId: planner.id,
        type: NotificationType.EXPEDITE_REQUEST_APPROVED,
        title,
        message: `${message} Next step: Contact supplier.`,
        priority: 'HIGH',
        entityType: 'ExpeditRequest',
        entityId: expeditRequestId,
        actionUrl,
        channels: this.getNotificationChannels('materialPlanner', AlertPriority.HIGH),
      });
    }
  }

  /**
   * Send supplier response received notification
   */
  async notifySupplierResponseReceived(
    expeditRequestId: string,
    supplierResponse: string,
    commitmentDate?: Date
  ): Promise<void> {
    const expeditRequest = await this.prisma.expeditRequest.findUnique({
      where: { id: expeditRequestId },
      include: {
        part: true,
        requestedBy: true,
        vendor: true,
      },
    });

    if (!expeditRequest) return;

    const title = `Supplier Response: ${expeditRequest.part.partNumber}`;
    const message = `Supplier ${expeditRequest.vendor?.name || 'response'}: ${supplierResponse}${commitmentDate ? ` | Delivery commitment: ${commitmentDate.toLocaleDateString()}` : ''}`;
    const actionUrl = `/expedite-requests/${expeditRequestId}`;

    // Notify requester and material planners
    const notifyUsers = [expeditRequest.requestedById];
    const materialPlanners = await this.getMaterialPlanners();
    notifyUsers.push(...materialPlanners.map(p => p.id));

    for (const userId of notifyUsers) {
      await this.notificationService.createNotification({
        userId,
        type: NotificationType.SUPPLIER_RESPONSE_RECEIVED,
        title,
        message,
        priority: 'MEDIUM',
        entityType: 'ExpeditRequest',
        entityId: expeditRequestId,
        actionUrl,
        channels: ['IN_APP', 'EMAIL'],
      });
    }
  }

  /**
   * Send material arrival expected notification
   */
  async notifyMaterialArrivalExpected(
    expeditRequestId: string,
    expectedArrivalDate: Date
  ): Promise<void> {
    const expeditRequest = await this.prisma.expeditRequest.findUnique({
      where: { id: expeditRequestId },
      include: {
        part: true,
        requestedBy: true,
        shortageAlert: {
          include: {
            kit: {
              include: {
                workOrder: true,
              },
            },
          },
        },
      },
    });

    if (!expeditRequest) return;

    const title = `Material Arrival Expected: ${expeditRequest.part.partNumber}`;
    const message = `Expected arrival: ${expectedArrivalDate.toLocaleDateString()}`;
    const actionUrl = `/expedite-requests/${expeditRequestId}`;

    // Notify production supervisors and material planners
    const productionSupervisors = await this.getProductionSupervisors();
    const materialPlanners = await this.getMaterialPlanners();
    const notifyUsers = [
      ...productionSupervisors.map(s => s.id),
      ...materialPlanners.map(p => p.id),
      expeditRequest.requestedById,
    ];

    for (const userId of notifyUsers) {
      await this.notificationService.createNotification({
        userId,
        type: NotificationType.MATERIAL_ARRIVAL_EXPECTED,
        title,
        message,
        priority: 'MEDIUM',
        entityType: 'ExpeditRequest',
        entityId: expeditRequestId,
        actionUrl,
        channels: ['IN_APP'],
      });
    }
  }

  /**
   * Send shortage resolved notification
   */
  async notifyShortageResolved(
    shortageAlertId: string,
    resolutionType: string,
    resolvedBy: string
  ): Promise<void> {
    const shortageAlert = await this.prisma.kitShortageAlert.findUnique({
      where: { id: shortageAlertId },
      include: {
        part: true,
        kit: {
          include: {
            workOrder: true,
          },
        },
        resolutionRecord: true,
      },
    });

    if (!shortageAlert) return;

    const title = `Shortage Resolved: ${shortageAlert.part.partNumber}`;
    const message = `Shortage resolved via ${resolutionType}`;
    const actionUrl = `/shortage-alerts/${shortageAlertId}`;

    // Get original stakeholders who were notified
    const stakeholders = await this.getShortageStakeholders({
      shortageAlertId,
      partNumber: shortageAlert.part.partNumber,
      partName: shortageAlert.part.partName,
      shortageQuantity: shortageAlert.shortageQuantity,
      requiredByDate: shortageAlert.requiredByDate || undefined,
      priority: shortageAlert.priority,
    });

    // Notify all original stakeholders
    for (const stakeholder of stakeholders) {
      await this.notificationService.createNotification({
        userId: stakeholder.userId,
        type: NotificationType.SHORTAGE_RESOLVED,
        title,
        message,
        priority: 'LOW',
        entityType: 'KitShortageAlert',
        entityId: shortageAlertId,
        actionUrl,
        channels: ['IN_APP'],
      });
    }
  }

  /**
   * Send partial kit released notification
   */
  async notifyPartialKitReleased(
    kitId: string,
    partialQuantity: number,
    blockedOperations: string[]
  ): Promise<void> {
    const kit = await this.prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        workOrder: true,
      },
    });

    if (!kit) return;

    const title = `Partial Kit Released: ${kit.kitNumber}`;
    const message = `Partial kit released with ${partialQuantity} items. Blocked operations: ${blockedOperations.join(', ')}`;
    const actionUrl = `/kits/${kitId}`;

    // Notify production supervisors
    const productionSupervisors = await this.getProductionSupervisors();
    for (const supervisor of productionSupervisors) {
      await this.notificationService.createNotification({
        userId: supervisor.id,
        type: NotificationType.PARTIAL_KIT_RELEASED,
        title,
        message,
        priority: 'MEDIUM',
        entityType: 'Kit',
        entityId: kitId,
        actionUrl,
        channels: ['IN_APP', 'EMAIL'],
      });
    }
  }

  /**
   * Build shortage detection message
   */
  private buildShortageDetectionMessage(context: ShortageNotificationContext): string {
    const { partNumber, partName, shortageQuantity, requiredByDate, workOrderNumber, estimatedCost } = context;

    let message = `Shortage detected for part ${partNumber} (${partName}). `;
    message += `Shortage quantity: ${shortageQuantity}`;

    if (requiredByDate) {
      message += ` | Required by: ${requiredByDate.toLocaleDateString()}`;
    }

    if (workOrderNumber) {
      message += ` | Work Order: ${workOrderNumber}`;
    }

    if (estimatedCost) {
      message += ` | Estimated cost impact: $${estimatedCost.toFixed(2)}`;
    }

    message += '. Immediate action required.';

    return message;
  }

  /**
   * Build expedite request message
   */
  private buildExpeditRequestMessage(context: ExpeditNotificationContext): string {
    const { partNumber, partName, urgencyLevel, requiredByDate, expediteFee, justification } = context;

    let message = `Expedite request for ${partNumber} (${partName}). `;
    message += `Urgency: ${urgencyLevel} | Required by: ${requiredByDate.toLocaleDateString()}`;

    if (expediteFee) {
      message += ` | Estimated expedite fee: $${expediteFee.toFixed(2)}`;
    }

    message += ` | Justification: ${justification}`;

    return message;
  }

  /**
   * Send critical shortage alert with immediate escalation
   */
  private async sendCriticalShortageAlert(context: ShortageNotificationContext): Promise<void> {
    const { shortageAlertId, partNumber, partName } = context;

    const title = `🚨 CRITICAL SHORTAGE ALERT: ${partNumber}`;
    const message = `IMMEDIATE ACTION REQUIRED: Critical shortage detected for ${partName}. This may impact production schedule.`;
    const actionUrl = `/shortage-alerts/${shortageAlertId}`;

    // Get managers and directors for immediate escalation
    const managers = await this.getManagers();
    const directors = await this.getDirectors();
    const escalationUsers = [...managers, ...directors];

    for (const user of escalationUsers) {
      await this.notificationService.createNotification({
        userId: user.id,
        type: NotificationType.CRITICAL_SHORTAGE_ALERT,
        title,
        message,
        priority: 'URGENT',
        entityType: 'KitShortageAlert',
        entityId: shortageAlertId,
        actionUrl,
        channels: ['IN_APP', 'EMAIL', 'SMS'], // Use all available channels for critical alerts
      });
    }
  }

  /**
   * Schedule escalation reminders based on configuration
   */
  private async scheduleEscalationReminders(
    shortageAlertId: string,
    context: ShortageNotificationContext
  ): Promise<void> {
    // Implementation would depend on job scheduling system (e.g., Bull, Agenda, etc.)
    // For now, we'll just log the intention
    console.log(`Scheduled escalation reminders for shortage alert ${shortageAlertId}`);

    // TODO: Implement actual job scheduling
    // Example:
    // - Schedule material planner reminder after 30 minutes
    // - Schedule manager escalation after 2 hours
    // - Schedule director escalation after 4 hours
  }

  /**
   * Get stakeholders who should be notified about shortages
   */
  private async getShortageStakeholders(context: ShortageNotificationContext): Promise<Array<{userId: string, role: string}>> {
    const stakeholders: Array<{userId: string, role: string}> = [];

    // Add material planners (primary stakeholders)
    const materialPlanners = await this.getMaterialPlanners();
    stakeholders.push(...materialPlanners.map(p => ({ userId: p.id, role: 'materialPlanner' })));

    // Add production supervisors if work order is affected
    if (context.workOrderNumber) {
      const productionSupervisors = await this.getProductionSupervisors();
      stakeholders.push(...productionSupervisors.map(s => ({ userId: s.id, role: 'productionSupervisor' })));
    }

    // Add procurement team for high priority shortages
    if (context.priority === AlertPriority.HIGH || context.priority === AlertPriority.CRITICAL) {
      const procurementTeam = await this.getProcurementTeamMembers();
      stakeholders.push(...procurementTeam.map(p => ({ userId: p.id, role: 'procurement' })));
    }

    return stakeholders;
  }

  /**
   * Get notification channels based on role and priority
   */
  private getNotificationChannels(role: string, priority: AlertPriority): string[] {
    const channels = ['IN_APP'];

    if (this.config.enableEmailNotifications) {
      channels.push('EMAIL');
    }

    // Add SMS for high priority alerts
    if (this.config.enableSMSNotifications &&
        (priority === AlertPriority.HIGH || priority === AlertPriority.CRITICAL)) {
      channels.push('SMS');
    }

    // Add Slack for certain roles
    if (this.config.enableSlackIntegration && ['materialPlanner', 'procurement'].includes(role)) {
      channels.push('SLACK');
    }

    return channels;
  }

  /**
   * Map alert priority to notification priority
   */
  private mapAlertPriorityToNotificationPriority(priority: AlertPriority): string {
    switch (priority) {
      case AlertPriority.CRITICAL:
        return 'URGENT';
      case AlertPriority.HIGH:
        return 'HIGH';
      case AlertPriority.NORMAL:
        return 'MEDIUM';
      case AlertPriority.LOW:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Map expedite urgency to notification priority
   */
  private mapUrgencyToNotificationPriority(urgency: ExpeditUrgency): string {
    switch (urgency) {
      case ExpeditUrgency.EMERGENCY:
        return 'URGENT';
      case ExpeditUrgency.CRITICAL:
        return 'URGENT';
      case ExpeditUrgency.HIGH:
        return 'HIGH';
      case ExpeditUrgency.NORMAL:
        return 'MEDIUM';
      case ExpeditUrgency.LOW:
        return 'LOW';
      default:
        return 'MEDIUM';
    }
  }

  /**
   * Helper methods to get different user groups
   * These would integrate with your existing user role management
   */
  private async getMaterialPlanners() {
    return this.prisma.user.findMany({
      where: {
        roles: { hasSome: this.config.stakeholderRoles.materialPlanners },
        isActive: true,
      },
    });
  }

  private async getProcurementTeamMembers() {
    return this.prisma.user.findMany({
      where: {
        roles: { hasSome: this.config.stakeholderRoles.procurementTeam },
        isActive: true,
      },
    });
  }

  private async getProductionSupervisors() {
    return this.prisma.user.findMany({
      where: {
        roles: { hasSome: this.config.stakeholderRoles.productionSupervisors },
        isActive: true,
      },
    });
  }

  private async getManagers() {
    return this.prisma.user.findMany({
      where: {
        roles: { hasSome: this.config.stakeholderRoles.managers },
        isActive: true,
      },
    });
  }

  private async getDirectors() {
    return this.prisma.user.findMany({
      where: {
        roles: { hasSome: this.config.stakeholderRoles.directors },
        isActive: true,
      },
    });
  }
}

// Default configuration
export const defaultShortageNotificationConfig: ShortageNotificationConfig = {
  enableEmailNotifications: true,
  enableSMSNotifications: true,
  enableInAppNotifications: true,
  enableSlackIntegration: false,
  escalationRules: {
    materialPlannerEscalationMinutes: 30,
    managerEscalationMinutes: 120,
    directorEscalationMinutes: 240,
  },
  stakeholderRoles: {
    materialPlanners: ['MATERIAL_PLANNER', 'SENIOR_MATERIAL_PLANNER'],
    procurementTeam: ['PROCUREMENT_SPECIALIST', 'BUYER', 'PROCUREMENT_MANAGER'],
    productionSupervisors: ['PRODUCTION_SUPERVISOR', 'PRODUCTION_MANAGER'],
    managers: ['MATERIAL_MANAGER', 'PRODUCTION_MANAGER', 'OPERATIONS_MANAGER'],
    directors: ['OPERATIONS_DIRECTOR', 'MANUFACTURING_DIRECTOR'],
  },
};