/**
 * Enhanced Kit Shortage Service with Automated Workflow Integration
 *
 * Extends the existing KitShortageService with automated notifications,
 * expedite request creation, and supplier communication workflows.
 */

import { PrismaClient, AlertPriority, AlertStatus, ExpeditUrgency } from '@prisma/client';
import { KitShortageService, MaterialShortage, ShortageAnalysisOptions, ShortageIdentificationResult } from './KitShortageService';
import { ShortageNotificationService, ShortageNotificationContext } from './ShortageNotificationService';
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';

export interface AutomatedWorkflowConfig {
  enableAutomaticNotifications: boolean;
  enableAutomaticExpeditRequests: boolean;
  enableSupplierCommunication: boolean;
  expediteThresholds: {
    criticalImpactDays: number;        // Auto-expedite if required within X days
    highValueThreshold: number;        // Auto-expedite if shortage value > X
    criticalPartTypes: string[];       // Part types that always auto-expedite
  };
  notificationSettings: {
    immediateNotificationRiskLevels: string[];  // Risk levels for immediate notification
    escalationEnabled: boolean;
    escalationIntervalMinutes: number;
  };
  supplierCommunication: {
    enableAutomaticEmails: boolean;
    enablePortalNotifications: boolean;
    responseTimeoutHours: number;
  };
}

export interface EnhancedShortageResult extends ShortageIdentificationResult {
  notificationsSent: number;
  expediteRequestsCreated: number;
  supplierCommunicationsSent: number;
  automatedActions: AutomatedAction[];
}

export interface AutomatedAction {
  action: 'NOTIFICATION_SENT' | 'EXPEDITE_CREATED' | 'SUPPLIER_CONTACTED' | 'ALERT_ESCALATED';
  partNumber: string;
  timestamp: Date;
  description: string;
  metadata?: any;
}

/**
 * Enhanced Kit Shortage Service with automated workflow integration
 */
export class EnhancedKitShortageService extends KitShortageService {
  private shortageNotificationService: ShortageNotificationService;
  private config: AutomatedWorkflowConfig;
  private automatedActions: AutomatedAction[] = [];

  constructor(
    prisma: PrismaClient,
    notificationService: NotificationService,
    config: AutomatedWorkflowConfig
  ) {
    super(prisma);
    this.shortageNotificationService = new ShortageNotificationService(
      prisma,
      notificationService,
      {
        enableEmailNotifications: true,
        enableSMSNotifications: true,
        enableInAppNotifications: true,
        enableSlackIntegration: false,
        escalationRules: {
          materialPlannerEscalationMinutes: config.notificationSettings.escalationIntervalMinutes,
          managerEscalationMinutes: config.notificationSettings.escalationIntervalMinutes * 2,
          directorEscalationMinutes: config.notificationSettings.escalationIntervalMinutes * 4,
        },
        stakeholderRoles: {
          materialPlanners: ['MATERIAL_PLANNER', 'SENIOR_MATERIAL_PLANNER'],
          procurementTeam: ['PROCUREMENT_SPECIALIST', 'BUYER', 'PROCUREMENT_MANAGER'],
          productionSupervisors: ['PRODUCTION_SUPERVISOR', 'PRODUCTION_MANAGER'],
          managers: ['MATERIAL_MANAGER', 'PRODUCTION_MANAGER', 'OPERATIONS_MANAGER'],
          directors: ['OPERATIONS_DIRECTOR', 'MANUFACTURING_DIRECTOR'],
        },
      }
    );
    this.config = config;
  }

  /**
   * Enhanced shortage identification with automated workflow triggers
   */
  async identifyShortagesWithAutomation(options: ShortageAnalysisOptions = {}): Promise<EnhancedShortageResult> {
    logger.info('Starting enhanced shortage identification with automation', { options });

    try {
      // Reset automated actions for this run
      this.automatedActions = [];

      // Run the base shortage identification
      const baseResult = await this.identifyShortages(options);

      // Get the shortages that were identified
      const shortages = await this.getIdentifiedShortages(options);

      // Process automated workflows for each shortage
      let notificationsSent = 0;
      let expediteRequestsCreated = 0;
      let supplierCommunicationsSent = 0;

      for (const shortage of shortages) {
        // Process automated notifications
        if (this.config.enableAutomaticNotifications) {
          const sent = await this.processAutomaticNotifications(shortage);
          if (sent) notificationsSent++;
        }

        // Process automatic expedite requests
        if (this.config.enableAutomaticExpeditRequests) {
          const created = await this.processAutomaticExpeditRequests(shortage);
          if (created) expediteRequestsCreated++;
        }

        // Process supplier communication
        if (this.config.enableSupplierCommunication) {
          const sent = await this.processSupplierCommunication(shortage);
          if (sent) supplierCommunicationsSent++;
        }
      }

      const enhancedResult: EnhancedShortageResult = {
        ...baseResult,
        notificationsSent,
        expediteRequestsCreated,
        supplierCommunicationsSent,
        automatedActions: this.automatedActions,
      };

      logger.info('Enhanced shortage identification completed', {
        totalShortages: enhancedResult.totalShortages,
        notificationsSent,
        expediteRequestsCreated,
        supplierCommunicationsSent,
        automatedActions: this.automatedActions.length,
      });

      return enhancedResult;

    } catch (error) {
      logger.error('Error during enhanced shortage identification', { error });
      throw new Error(`Enhanced shortage identification failed: ${error.message}`);
    }
  }

  /**
   * Process automatic notifications for a shortage
   */
  private async processAutomaticNotifications(shortage: MaterialShortage): Promise<boolean> {
    try {
      // Check if this shortage meets criteria for immediate notification
      if (!this.shouldSendImmediateNotification(shortage)) {
        return false;
      }

      // Get the shortage alert ID
      const alert = await this.prisma.kitShortageAlert.findFirst({
        where: {
          partId: shortage.partId,
          status: { in: [AlertStatus.OPEN, AlertStatus.ASSIGNED, AlertStatus.IN_PROGRESS] }
        },
        include: {
          kit: {
            include: {
              workOrder: true,
            },
          },
        },
      });

      if (!alert) {
        logger.warn(`No shortage alert found for part ${shortage.partNumber}`);
        return false;
      }

      // Build notification context
      const notificationContext: ShortageNotificationContext = {
        shortageAlertId: alert.id,
        partNumber: shortage.partNumber,
        partName: shortage.partName,
        shortageQuantity: shortage.shortfallQuantity,
        requiredByDate: alert.requiredByDate || undefined,
        workOrderNumber: alert.kit?.workOrder?.workOrderNumber,
        kitNumber: alert.kit?.kitNumber,
        priority: alert.priority,
        estimatedCost: shortage.shortfallValue,
        affectedOperations: shortage.affectedKits.map(k => k.operationNumbers).flat(),
        supplierInfo: shortage.preferredSuppliers.length > 0 ? {
          name: shortage.preferredSuppliers[0],
        } : undefined,
      };

      // Send notification
      await this.shortageNotificationService.notifyMaterialShortageDetected(notificationContext);

      // Record automated action
      this.automatedActions.push({
        action: 'NOTIFICATION_SENT',
        partNumber: shortage.partNumber,
        timestamp: new Date(),
        description: `Automatic shortage notification sent for ${shortage.partNumber}`,
        metadata: {
          riskLevel: shortage.riskLevel,
          shortageQuantity: shortage.shortfallQuantity,
          recipients: 'material_planners,procurement_team',
        },
      });

      return true;

    } catch (error) {
      logger.error(`Failed to send automatic notification for part ${shortage.partNumber}`, { error });
      return false;
    }
  }

  /**
   * Process automatic expedite requests for critical shortages
   */
  private async processAutomaticExpeditRequests(shortage: MaterialShortage): Promise<boolean> {
    try {
      // Check if this shortage meets criteria for automatic expedite
      if (!this.shouldCreateAutomaticExpediteRequest(shortage)) {
        return false;
      }

      // Get the shortage alert
      const alert = await this.prisma.kitShortageAlert.findFirst({
        where: {
          partId: shortage.partId,
          status: { in: [AlertStatus.OPEN, AlertStatus.ASSIGNED, AlertStatus.IN_PROGRESS] }
        },
      });

      if (!alert) return false;

      // Determine urgency level
      const urgencyLevel = this.determineExpeditUrgency(shortage);

      // Get preferred supplier
      const preferredSupplier = await this.getPreferredSupplier(shortage.partId);

      // Create expedite request
      const expeditRequest = await this.prisma.expeditRequest.create({
        data: {
          shortageAlertId: alert.id,
          partId: shortage.partId,
          requiredQuantity: shortage.shortfallQuantity,
          urgencyLevel,
          requestedByDate: shortage.estimatedImpactDate,
          justification: `Automatic expedite request: ${shortage.riskLevel} risk shortage affecting production schedule`,
          impactAssessment: `Shortage of ${shortage.shortfallQuantity} units with estimated cost impact of $${shortage.shortfallValue.toFixed(2)}`,
          costImpact: shortage.shortfallValue,
          alternativesSuggested: shortage.alternativeParts.map(alt => alt.partNumber),
          requestedById: 'system', // System-generated request
          vendorId: preferredSupplier?.id,
        },
      });

      // Record automated action
      this.automatedActions.push({
        action: 'EXPEDITE_CREATED',
        partNumber: shortage.partNumber,
        timestamp: new Date(),
        description: `Automatic expedite request created for ${shortage.partNumber}`,
        metadata: {
          expeditRequestId: expeditRequest.id,
          urgencyLevel,
          requiredQuantity: shortage.shortfallQuantity,
          estimatedCost: shortage.shortfallValue,
        },
      });

      logger.info(`Automatic expedite request created for part ${shortage.partNumber}`, {
        expeditRequestId: expeditRequest.id,
        urgencyLevel,
        shortfallQuantity: shortage.shortfallQuantity,
      });

      return true;

    } catch (error) {
      logger.error(`Failed to create automatic expedite request for part ${shortage.partNumber}`, { error });
      return false;
    }
  }

  /**
   * Process supplier communication for shortages
   */
  private async processSupplierCommunication(shortage: MaterialShortage): Promise<boolean> {
    try {
      // Only auto-communicate for high/critical shortages
      if (!['HIGH', 'CRITICAL'].includes(shortage.riskLevel)) {
        return false;
      }

      // Get preferred supplier
      const preferredSupplier = await this.getPreferredSupplier(shortage.partId);
      if (!preferredSupplier) {
        logger.debug(`No preferred supplier found for part ${shortage.partNumber}`);
        return false;
      }

      // Create supplier communication record
      await this.prisma.supplierCommunication.create({
        data: {
          vendorId: preferredSupplier.id,
          partId: shortage.partId,
          communicationType: 'EMAIL',
          direction: 'OUTBOUND',
          subject: `URGENT: Material Shortage Notification - ${shortage.partNumber}`,
          message: this.buildSupplierCommunicationMessage(shortage),
          priority: shortage.riskLevel === 'CRITICAL' ? 'URGENT' : 'HIGH',
          responseRequired: true,
          responseDeadline: new Date(Date.now() + (this.config.supplierCommunication.responseTimeoutHours * 60 * 60 * 1000)),
          sentById: 'system',
          sentAt: new Date(),
        },
      });

      // Record automated action
      this.automatedActions.push({
        action: 'SUPPLIER_CONTACTED',
        partNumber: shortage.partNumber,
        timestamp: new Date(),
        description: `Automatic supplier notification sent for ${shortage.partNumber}`,
        metadata: {
          supplierName: preferredSupplier.name,
          communicationType: 'EMAIL',
          riskLevel: shortage.riskLevel,
        },
      });

      return true;

    } catch (error) {
      logger.error(`Failed to send supplier communication for part ${shortage.partNumber}`, { error });
      return false;
    }
  }

  /**
   * Check if shortage meets criteria for immediate notification
   */
  private shouldSendImmediateNotification(shortage: MaterialShortage): boolean {
    return this.config.notificationSettings.immediateNotificationRiskLevels.includes(shortage.riskLevel);
  }

  /**
   * Check if shortage meets criteria for automatic expedite request
   */
  private shouldCreateAutomaticExpediteRequest(shortage: MaterialShortage): boolean {
    // Critical impact timeline
    const daysUntilImpact = Math.ceil((shortage.estimatedImpactDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilImpact <= this.config.expediteThresholds.criticalImpactDays) {
      return true;
    }

    // High value threshold
    if (shortage.shortfallValue >= this.config.expediteThresholds.highValueThreshold) {
      return true;
    }

    // Critical part types
    // Note: Would need to get part type from part record
    // if (this.config.expediteThresholds.criticalPartTypes.includes(partType)) {
    //   return true;
    // }

    // Always expedite critical risk shortages
    if (shortage.riskLevel === 'CRITICAL') {
      return true;
    }

    return false;
  }

  /**
   * Determine expedite urgency level based on shortage characteristics
   */
  private determineExpeditUrgency(shortage: MaterialShortage): ExpeditUrgency {
    if (shortage.riskLevel === 'CRITICAL') {
      return ExpeditUrgency.CRITICAL;
    }

    const daysUntilImpact = Math.ceil((shortage.estimatedImpactDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilImpact <= 1) {
      return ExpeditUrgency.EMERGENCY;
    } else if (daysUntilImpact <= 3) {
      return ExpeditUrgency.CRITICAL;
    } else if (daysUntilImpact <= 7) {
      return ExpeditUrgency.HIGH;
    } else {
      return ExpeditUrgency.NORMAL;
    }
  }

  /**
   * Build supplier communication message
   */
  private buildSupplierCommunicationMessage(shortage: MaterialShortage): string {
    let message = `Dear Supplier,\n\n`;
    message += `We have identified a ${shortage.riskLevel.toLowerCase()} shortage for the following part:\n\n`;
    message += `Part Number: ${shortage.partNumber}\n`;
    message += `Part Name: ${shortage.partName}\n`;
    message += `Shortage Quantity: ${shortage.shortfallQuantity}\n`;
    message += `Required By: ${shortage.estimatedImpactDate.toLocaleDateString()}\n\n`;

    if (shortage.shortfallValue > 0) {
      message += `Estimated Cost Impact: $${shortage.shortfallValue.toFixed(2)}\n\n`;
    }

    message += `Please confirm:\n`;
    message += `1. Current inventory availability\n`;
    message += `2. Earliest possible delivery date\n`;
    message += `3. Expedite options and associated costs\n\n`;

    message += `This shortage may impact our production schedule. Your prompt response is appreciated.\n\n`;
    message += `Best regards,\n`;
    message += `Material Planning Team`;

    return message;
  }

  /**
   * Get preferred supplier for a part
   */
  private async getPreferredSupplier(partId: string) {
    // This would integrate with your vendor/supplier management system
    // For now, return null as placeholder
    return null;
  }

  /**
   * Get identified shortages for processing
   */
  private async getIdentifiedShortages(options: ShortageAnalysisOptions): Promise<MaterialShortage[]> {
    // This would implement the logic to retrieve the shortages that were identified
    // For now, return empty array as placeholder
    // In a full implementation, this would cache or retrieve the shortages from the analysis
    return [];
  }

  /**
   * Get analytics for shortage resolution effectiveness
   */
  async getShortageResolutionAnalytics(days: number = 30): Promise<any> {
    const since = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));

    const analytics = await this.prisma.$transaction([
      // Total shortages resolved
      this.prisma.shortageResolution.count({
        where: {
          createdAt: { gte: since },
        },
      }),

      // Resolution by type
      this.prisma.shortageResolution.groupBy({
        by: ['resolutionType'],
        where: {
          createdAt: { gte: since },
        },
        _count: true,
      }),

      // Average resolution time
      this.prisma.shortageResolution.aggregate({
        where: {
          createdAt: { gte: since },
        },
        _avg: {
          laborImpactHours: true,
          totalAdditionalCost: true,
        },
      }),

      // Expedite request success rate
      this.prisma.expeditRequest.groupBy({
        by: ['resolution'],
        where: {
          createdAt: { gte: since },
        },
        _count: true,
      }),
    ]);

    return {
      totalShortagesResolved: analytics[0],
      resolutionsByType: analytics[1],
      averageMetrics: analytics[2],
      expediteSuccessRate: analytics[3],
      analysisDate: new Date(),
      periodDays: days,
    };
  }
}

// Default configuration for automated workflows
export const defaultAutomatedWorkflowConfig: AutomatedWorkflowConfig = {
  enableAutomaticNotifications: true,
  enableAutomaticExpeditRequests: true,
  enableSupplierCommunication: true,
  expediteThresholds: {
    criticalImpactDays: 7,        // Auto-expedite if required within 7 days
    highValueThreshold: 10000,    // Auto-expedite if shortage value > $10,000
    criticalPartTypes: ['ENGINE_CRITICAL', 'SAFETY_CRITICAL', 'FLIGHT_CRITICAL'],
  },
  notificationSettings: {
    immediateNotificationRiskLevels: ['HIGH', 'CRITICAL'],
    escalationEnabled: true,
    escalationIntervalMinutes: 30,
  },
  supplierCommunication: {
    enableAutomaticEmails: true,
    enablePortalNotifications: false,
    responseTimeoutHours: 24,
  },
};