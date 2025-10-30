/**
 * LLP Alert Service
 *
 * Comprehensive alert management system for Life-Limited Parts with:
 * - Configurable threshold-based alerting
 * - Multi-channel notifications (email, SMS, dashboard)
 * - Automatic escalation rules
 * - Alert acknowledgment and resolution tracking
 * - Performance monitoring and analytics
 *
 * Safety-critical system for aerospace LLP compliance.
 */

import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
import cron from 'node-cron';
import {
  LLPAlertConfig,
  LLPEscalationRule,
  LLPAlert,
  LLPAlertSeverity,
  LLPAlertRequest,
  LLPLifeStatus,
  LLPValidationResult,
  LLPError,
  LLPErrorType
} from '../types/llp';

/**
 * Alert processing configuration
 */
interface LLPAlertProcessingConfig {
  enabled: boolean;
  intervalMinutes: number;
  batchSize: number;
  maxRetries: number;
  retryDelayMinutes: number;
}

/**
 * Alert statistics for monitoring
 */
interface LLPAlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  alertsBySeverity: Record<LLPAlertSeverity, number>;
  alertsByType: Record<string, number>;
  averageResolutionTime: number;
  escalationRate: number;
  acknowledgementsToday: number;
  resolutionsToday: number;
}

/**
 * Alert notification request
 */
interface LLPAlertNotification {
  alertId: string;
  recipients: string[];
  channels: ('email' | 'sms' | 'dashboard')[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  templateData: Record<string, any>;
}

/**
 * LLP Alert Service for threshold-based alerting and notifications
 */
export class LLPAlertService extends EventEmitter {
  private prisma: PrismaClient;
  private processingConfig: LLPAlertProcessingConfig;
  private alertConfigs: Map<string, LLPAlertConfig> = new Map();
  private cronJobs: cron.ScheduledTask[] = [];
  private isProcessing = false;

  constructor(
    prisma: PrismaClient,
    processingConfig: LLPAlertProcessingConfig = {
      enabled: true,
      intervalMinutes: 15,
      batchSize: 100,
      maxRetries: 3,
      retryDelayMinutes: 5
    }
  ) {
    super();
    this.prisma = prisma;
    this.processingConfig = processingConfig;

    this.initializeAlertProcessing();
    this.loadDefaultAlertConfigurations();
  }

  // ============================================================================
  // ALERT CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Configure alert thresholds and notifications for a part type
   */
  async configureAlerts(partNumber: string, config: LLPAlertConfig): Promise<void> {
    // Validate configuration
    const validation = this.validateAlertConfig(config);
    if (!validation.isValid) {
      throw new Error(`Alert configuration validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Store configuration
    this.alertConfigs.set(partNumber, config);

    // Persist configuration to database
    await this.persistAlertConfig(partNumber, config);

    // Emit configuration event
    this.emit('alertConfigured', {
      partNumber,
      config,
      timestamp: new Date()
    });
  }

  /**
   * Get alert configuration for a part
   */
  getAlertConfig(partNumber: string): LLPAlertConfig | null {
    return this.alertConfigs.get(partNumber) || this.getDefaultAlertConfig();
  }

  /**
   * Load default alert configurations
   */
  private loadDefaultAlertConfigurations(): void {
    const defaultConfig: LLPAlertConfig = {
      enabled: true,
      thresholds: {
        info: 80,      // 80% life used
        warning: 90,   // 90% life used
        critical: 95,  // 95% life used
        urgent: 98     // 98% life used
      },
      notifications: {
        email: true,
        sms: false,
        dashboard: true
      },
      recipients: [],
      escalationRules: [
        {
          condition: 'severity >= CRITICAL && acknowledged == false',
          delayMinutes: 60,
          escalateTo: ['supervisor@company.com'],
          requiresAcknowledgment: true
        },
        {
          condition: 'severity >= URGENT && acknowledged == false',
          delayMinutes: 30,
          escalateTo: ['manager@company.com', 'safety@company.com'],
          requiresAcknowledgment: true
        }
      ]
    };

    this.alertConfigs.set('default', defaultConfig);
  }

  /**
   * Get default alert configuration
   */
  private getDefaultAlertConfig(): LLPAlertConfig {
    return this.alertConfigs.get('default')!;
  }

  /**
   * Validate alert configuration
   */
  private validateAlertConfig(config: LLPAlertConfig): LLPValidationResult {
    const errors: LLPError[] = [];

    // Validate thresholds are in ascending order
    const thresholds = config.thresholds;
    if (thresholds.info >= thresholds.warning) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'ALERT_001',
        message: 'Info threshold must be less than warning threshold'
      });
    }

    if (thresholds.warning >= thresholds.critical) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'ALERT_002',
        message: 'Warning threshold must be less than critical threshold'
      });
    }

    if (thresholds.critical >= thresholds.urgent) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'ALERT_003',
        message: 'Critical threshold must be less than urgent threshold'
      });
    }

    // Validate threshold ranges
    Object.entries(thresholds).forEach(([level, value]) => {
      if (value < 0 || value > 100) {
        errors.push({
          type: LLPErrorType.VALIDATION_ERROR,
          code: 'ALERT_004',
          message: `${level} threshold must be between 0 and 100`
        });
      }
    });

    // Validate recipients
    if (config.recipients.length === 0) {
      errors.push({
        type: LLPErrorType.VALIDATION_ERROR,
        code: 'ALERT_005',
        message: 'At least one recipient must be specified'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Persist alert configuration to database
   */
  private async persistAlertConfig(partNumber: string, config: LLPAlertConfig): Promise<void> {
    // This would store the configuration in a database table
    // For now, we'll store it in the Part model's metadata field
    await this.prisma.part.updateMany({
      where: { partNumber },
      data: {
        // Store in a metadata JSON field (would need to add this to schema)
        // metadata: { alertConfig: config }
      }
    });
  }

  // ============================================================================
  // ALERT PROCESSING AND MONITORING
  // ============================================================================

  /**
   * Initialize automatic alert processing
   */
  private initializeAlertProcessing(): void {
    if (!this.processingConfig.enabled) return;

    // Schedule alert processing
    const alertJob = cron.schedule(`*/${this.processingConfig.intervalMinutes} * * * *`, async () => {
      await this.processAlerts();
    }, { scheduled: false });

    // Schedule escalation processing (every 5 minutes)
    const escalationJob = cron.schedule('*/5 * * * *', async () => {
      await this.processEscalations();
    }, { scheduled: false });

    // Schedule cleanup (daily at 2 AM)
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      await this.cleanupResolvedAlerts();
    }, { scheduled: false });

    this.cronJobs = [alertJob, escalationJob, cleanupJob];

    // Start jobs
    this.cronJobs.forEach(job => job.start());
  }

  /**
   * Process alerts for all LLPs
   */
  async processAlerts(): Promise<void> {
    if (this.isProcessing) {
      console.warn('Alert processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;
    let processedCount = 0;
    let errorCount = 0;

    try {
      // Get all LLP serialized parts that need alert checking
      const llpParts = await this.prisma.serializedPart.findMany({
        where: {
          part: { isLifeLimited: true },
          status: { not: 'RETIRED' }
        },
        include: {
          part: true,
          llpAlerts: {
            where: { isActive: true }
          }
        },
        take: this.processingConfig.batchSize
      });

      // Process each part
      for (const serializedPart of llpParts) {
        try {
          await this.processAlertsForPart(serializedPart.id);
          processedCount++;
        } catch (error) {
          console.error(`Error processing alerts for part ${serializedPart.id}:`, error);
          errorCount++;
        }
      }

      // Emit processing statistics
      this.emit('alertProcessingComplete', {
        processedCount,
        errorCount,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error in alert processing:', error);
      this.emit('alertProcessingError', { error, timestamp: new Date() });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process alerts for a specific LLP
   */
  async processAlertsForPart(serializedPartId: string): Promise<void> {
    // Get part with alert configuration
    const serializedPart = await this.prisma.serializedPart.findUnique({
      where: { id: serializedPartId },
      include: {
        part: true,
        llpAlerts: { where: { isActive: true } }
      }
    });

    if (!serializedPart) return;

    // Get alert configuration
    const alertConfig = this.getAlertConfig(serializedPart.part.partNumber);
    if (!alertConfig?.enabled) return;

    // Calculate current life status (would use LLPService)
    // const lifeStatus = await this.llpService.calculateLifeStatus(serializedPartId);

    // For now, create a mock life status
    const lifeStatus: LLPLifeStatus = {
      totalCycles: 18000,
      cycleLimit: 20000,
      cyclePercentageUsed: 90,
      remainingCycles: 2000,
      totalYears: 12,
      timeLimit: 15,
      timePercentageUsed: 80,
      remainingYears: 3,
      overallPercentageUsed: 90,
      retirementDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: import('../types/llp').LLPLifeStatusType.AGING,
      alertLevel: 'WARNING',
      lastInspectionCycles: 15000,
      lastInspectionDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      nextInspectionDue: 20000,
      nextInspectionDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      isRetired: false,
      isExpired: false,
      canBeInstalled: true
    };

    // Check thresholds and create alerts
    await this.checkThresholds(serializedPartId, lifeStatus, alertConfig);
  }

  /**
   * Check thresholds and create appropriate alerts
   */
  private async checkThresholds(
    serializedPartId: string,
    lifeStatus: LLPLifeStatus,
    alertConfig: LLPAlertConfig
  ): Promise<void> {
    const percentageUsed = lifeStatus.overallPercentageUsed;
    const thresholds = alertConfig.thresholds;

    // Determine appropriate alert severity
    let severity: LLPAlertSeverity;
    let alertType: string;

    if (percentageUsed >= thresholds.urgent) {
      severity = 'URGENT';
      alertType = 'RETIREMENT_URGENT';
    } else if (percentageUsed >= thresholds.critical) {
      severity = 'CRITICAL';
      alertType = 'RETIREMENT_CRITICAL';
    } else if (percentageUsed >= thresholds.warning) {
      severity = 'WARNING';
      alertType = 'RETIREMENT_WARNING';
    } else if (percentageUsed >= thresholds.info) {
      severity = 'INFO';
      alertType = 'RETIREMENT_INFO';
    } else {
      return; // No alert needed
    }

    // Check if alert already exists at this severity level
    const existingAlert = await this.prisma.lLPAlert.findFirst({
      where: {
        serializedPartId,
        alertType,
        severity,
        isActive: true
      }
    });

    if (existingAlert) return;

    // Create new alert
    const alertRequest: LLPAlertRequest = {
      serializedPartId,
      alertType,
      severity,
      triggerCycles: lifeStatus.totalCycles,
      triggerDate: new Date(),
      thresholdPercentage: percentageUsed,
      message: this.generateAlertMessage(alertType, lifeStatus),
      actionRequired: this.getActionRequired(severity),
      dueDate: lifeStatus.retirementDue
    };

    const alertId = await this.createAlert(alertRequest);

    // Send notifications
    if (alertConfig.notifications.email || alertConfig.notifications.sms || alertConfig.notifications.dashboard) {
      await this.sendNotification({
        alertId,
        recipients: alertConfig.recipients,
        channels: this.getEnabledChannels(alertConfig.notifications),
        urgency: this.mapSeverityToUrgency(severity),
        templateData: {
          serializedPartId,
          partNumber: '', // Would get from database
          serialNumber: '', // Would get from database
          severity,
          percentageUsed,
          lifeStatus
        }
      });
    }
  }

  // ============================================================================
  // ALERT CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new alert
   */
  async createAlert(alertRequest: LLPAlertRequest): Promise<string> {
    const alert = await this.prisma.lLPAlert.create({
      data: {
        serializedPartId: alertRequest.serializedPartId,
        alertType: alertRequest.alertType,
        severity: alertRequest.severity,
        triggerCycles: alertRequest.triggerCycles,
        triggerDate: alertRequest.triggerDate,
        thresholdPercentage: alertRequest.thresholdPercentage,
        message: alertRequest.message,
        actionRequired: alertRequest.actionRequired,
        dueDate: alertRequest.dueDate,
        isActive: true,
        escalationLevel: 1,
        notificationsSent: 0
      }
    });

    // Emit alert created event
    this.emit('alertCreated', {
      alertId: alert.id,
      serializedPartId: alertRequest.serializedPartId,
      severity: alertRequest.severity,
      timestamp: new Date()
    });

    return alert.id;
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<void> {
    await this.prisma.lLPAlert.update({
      where: { id: alertId },
      data: {
        acknowledgedBy,
        acknowledgedAt: new Date()
      }
    });

    // Emit acknowledged event
    this.emit('alertAcknowledged', {
      alertId,
      acknowledgedBy,
      timestamp: new Date()
    });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, notes?: string): Promise<void> {
    await this.prisma.lLPAlert.update({
      where: { id: alertId },
      data: {
        isActive: false,
        resolvedBy,
        resolvedAt: new Date(),
        metadata: notes ? { resolutionNotes: notes } : undefined
      }
    });

    // Emit resolved event
    this.emit('alertResolved', {
      alertId,
      resolvedBy,
      timestamp: new Date()
    });
  }

  /**
   * Get active alerts for a serialized part
   */
  async getActiveAlerts(serializedPartId: string): Promise<LLPAlert[]> {
    return await this.prisma.lLPAlert.findMany({
      where: {
        serializedPartId,
        isActive: true
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * Get all alerts with filtering
   */
  async getAlerts(filters: {
    severity?: LLPAlertSeverity[];
    alertType?: string[];
    isActive?: boolean;
    fromDate?: Date;
    toDate?: Date;
  } = {}): Promise<LLPAlert[]> {
    const where: any = {};

    if (filters.severity?.length) {
      where.severity = { in: filters.severity };
    }

    if (filters.alertType?.length) {
      where.alertType = { in: filters.alertType };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }

    return await this.prisma.lLPAlert.findMany({
      where,
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  // ============================================================================
  // ESCALATION MANAGEMENT
  // ============================================================================

  /**
   * Process escalations for unacknowledged alerts
   */
  async processEscalations(): Promise<void> {
    // Get alerts that need escalation
    const alertsNeedingEscalation = await this.prisma.lLPAlert.findMany({
      where: {
        isActive: true,
        acknowledgedAt: null,
        createdAt: {
          lte: new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
        }
      },
      include: {
        serializedPart: {
          include: { part: true }
        }
      }
    });

    for (const alert of alertsNeedingEscalation) {
      await this.processEscalationForAlert(alert);
    }
  }

  /**
   * Process escalation for a specific alert
   */
  private async processEscalationForAlert(alert: any): Promise<void> {
    const partNumber = alert.serializedPart.part.partNumber;
    const alertConfig = this.getAlertConfig(partNumber);

    if (!alertConfig) return;

    // Find applicable escalation rules
    const applicableRules = alertConfig.escalationRules.filter(rule =>
      this.evaluateEscalationCondition(rule.condition, alert)
    );

    for (const rule of applicableRules) {
      const minutesSinceCreated = (Date.now() - new Date(alert.createdAt).getTime()) / (1000 * 60);

      if (minutesSinceCreated >= rule.delayMinutes) {
        await this.escalateAlert(alert.id, rule);
      }
    }
  }

  /**
   * Evaluate escalation condition
   */
  private evaluateEscalationCondition(condition: string, alert: any): boolean {
    // Simple condition evaluation (in practice, you'd use a proper expression evaluator)
    const severity = alert.severity;
    const acknowledged = alert.acknowledgedAt !== null;

    // Parse condition (simplified)
    if (condition.includes('severity >= CRITICAL') && ['CRITICAL', 'URGENT'].includes(severity)) {
      if (condition.includes('acknowledged == false') && !acknowledged) {
        return true;
      }
    }

    if (condition.includes('severity >= URGENT') && severity === 'URGENT') {
      if (condition.includes('acknowledged == false') && !acknowledged) {
        return true;
      }
    }

    return false;
  }

  /**
   * Escalate an alert
   */
  private async escalateAlert(alertId: string, rule: LLPEscalationRule): Promise<void> {
    // Update escalation level
    await this.prisma.lLPAlert.update({
      where: { id: alertId },
      data: {
        escalationLevel: {
          increment: 1
        }
      }
    });

    // Send escalation notification
    await this.sendNotification({
      alertId,
      recipients: rule.escalateTo,
      channels: ['email'],
      urgency: 'critical',
      templateData: {
        escalated: true,
        escalationLevel: 1 // Would get current level
      }
    });

    // Emit escalation event
    this.emit('alertEscalated', {
      alertId,
      escalationLevel: 1,
      escalatedTo: rule.escalateTo,
      timestamp: new Date()
    });
  }

  // ============================================================================
  // NOTIFICATION MANAGEMENT
  // ============================================================================

  /**
   * Send notification for an alert
   */
  private async sendNotification(notification: LLPAlertNotification): Promise<void> {
    try {
      // Update notification count
      await this.prisma.lLPAlert.update({
        where: { id: notification.alertId },
        data: {
          notificationsSent: {
            increment: 1
          }
        }
      });

      // Send notifications (mock implementation)
      for (const channel of notification.channels) {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(notification);
            break;
          case 'sms':
            await this.sendSMSNotification(notification);
            break;
          case 'dashboard':
            await this.sendDashboardNotification(notification);
            break;
        }
      }

      // Emit notification sent event
      this.emit('notificationSent', {
        alertId: notification.alertId,
        channels: notification.channels,
        recipients: notification.recipients,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Error sending notification:', error);
      this.emit('notificationError', {
        alertId: notification.alertId,
        error,
        timestamp: new Date()
      });
    }
  }

  /**
   * Send email notification (mock implementation)
   */
  private async sendEmailNotification(notification: LLPAlertNotification): Promise<void> {
    // Mock email sending
    console.log(`Sending email notification for alert ${notification.alertId} to:`, notification.recipients);
  }

  /**
   * Send SMS notification (mock implementation)
   */
  private async sendSMSNotification(notification: LLPAlertNotification): Promise<void> {
    // Mock SMS sending
    console.log(`Sending SMS notification for alert ${notification.alertId} to:`, notification.recipients);
  }

  /**
   * Send dashboard notification (mock implementation)
   */
  private async sendDashboardNotification(notification: LLPAlertNotification): Promise<void> {
    // Mock dashboard notification
    console.log(`Sending dashboard notification for alert ${notification.alertId}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate alert message
   */
  private generateAlertMessage(alertType: string, lifeStatus: LLPLifeStatus): string {
    switch (alertType) {
      case 'RETIREMENT_URGENT':
        return `URGENT: Part at ${lifeStatus.overallPercentageUsed.toFixed(1)}% of retirement limit. Immediate action required.`;
      case 'RETIREMENT_CRITICAL':
        return `CRITICAL: Part at ${lifeStatus.overallPercentageUsed.toFixed(1)}% of retirement limit. Plan retirement immediately.`;
      case 'RETIREMENT_WARNING':
        return `WARNING: Part at ${lifeStatus.overallPercentageUsed.toFixed(1)}% of retirement limit. Plan replacement.`;
      case 'RETIREMENT_INFO':
        return `INFO: Part at ${lifeStatus.overallPercentageUsed.toFixed(1)}% of retirement limit. Monitor closely.`;
      default:
        return `LLP Alert: ${alertType}`;
    }
  }

  /**
   * Get action required based on severity
   */
  private getActionRequired(severity: LLPAlertSeverity): string | null {
    switch (severity) {
      case 'URGENT':
        return 'Immediate retirement required';
      case 'CRITICAL':
        return 'Plan retirement within 30 days';
      case 'WARNING':
        return 'Plan replacement part procurement';
      case 'INFO':
        return 'Monitor and track';
      default:
        return null;
    }
  }

  /**
   * Get enabled notification channels
   */
  private getEnabledChannels(notifications: { email: boolean; sms: boolean; dashboard: boolean }): ('email' | 'sms' | 'dashboard')[] {
    const channels: ('email' | 'sms' | 'dashboard')[] = [];
    if (notifications.email) channels.push('email');
    if (notifications.sms) channels.push('sms');
    if (notifications.dashboard) channels.push('dashboard');
    return channels;
  }

  /**
   * Map severity to urgency level
   */
  private mapSeverityToUrgency(severity: LLPAlertSeverity): 'low' | 'medium' | 'high' | 'critical' {
    switch (severity) {
      case 'URGENT':
      case 'EXPIRED':
        return 'critical';
      case 'CRITICAL':
        return 'high';
      case 'WARNING':
        return 'medium';
      case 'INFO':
      default:
        return 'low';
    }
  }

  // ============================================================================
  // STATISTICS AND MONITORING
  // ============================================================================

  /**
   * Get alert statistics
   */
  async getAlertStatistics(): Promise<LLPAlertStatistics> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get alert counts
    const totalAlerts = await this.prisma.lLPAlert.count();
    const activeAlerts = await this.prisma.lLPAlert.count({ where: { isActive: true } });

    // Get alerts by severity
    const alertsBySeverity = await this.prisma.lLPAlert.groupBy({
      by: ['severity'],
      _count: { id: true },
      where: { isActive: true }
    });

    // Get alerts by type
    const alertsByType = await this.prisma.lLPAlert.groupBy({
      by: ['alertType'],
      _count: { id: true },
      where: { isActive: true }
    });

    // Get acknowledgments and resolutions today
    const acknowledgementsToday = await this.prisma.lLPAlert.count({
      where: {
        acknowledgedAt: { gte: todayStart }
      }
    });

    const resolutionsToday = await this.prisma.lLPAlert.count({
      where: {
        resolvedAt: { gte: todayStart }
      }
    });

    // Calculate average resolution time (mock for now)
    const averageResolutionTime = 2.5; // hours
    const escalationRate = 15; // percentage

    return {
      totalAlerts,
      activeAlerts,
      alertsBySeverity: alertsBySeverity.reduce((acc, item) => {
        acc[item.severity] = item._count.id;
        return acc;
      }, {} as Record<LLPAlertSeverity, number>),
      alertsByType: alertsByType.reduce((acc, item) => {
        acc[item.alertType] = item._count.id;
        return acc;
      }, {} as Record<string, number>),
      averageResolutionTime,
      escalationRate,
      acknowledgementsToday,
      resolutionsToday
    };
  }

  /**
   * Clean up resolved alerts older than specified days
   */
  async cleanupResolvedAlerts(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await this.prisma.lLPAlert.deleteMany({
      where: {
        isActive: false,
        resolvedAt: {
          lt: cutoffDate
        }
      }
    });

    return result.count;
  }

  /**
   * Stop alert processing and cleanup
   */
  shutdown(): void {
    this.cronJobs.forEach(job => job.stop());
    this.removeAllListeners();
  }
}

export default LLPAlertService;