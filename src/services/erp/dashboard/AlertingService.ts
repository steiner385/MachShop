/**
 * Alerting Service
 * Issue #60: Phase 16 - Dashboard & Real-time Visualization
 *
 * Manages alerts and notifications for dashboard users.
 */

import { logger } from '../../../utils/logger';
import { RealtimeEventService, EventType } from './RealtimeEventService';

/**
 * Alert rule
 */
export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  condition: (metrics: Record<string, any>) => boolean;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  cooldown: number; // milliseconds
  lastTriggered?: Date;
}

/**
 * Notification
 */
export interface Notification {
  id: string;
  alertId: string;
  userId: string;
  channel: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'IN_APP';
  status: 'PENDING' | 'SENT' | 'FAILED';
  sentAt?: Date;
  failureReason?: string;
}

/**
 * Alerting Service
 */
export class AlertingService {
  private rules: Map<string, AlertRule> = new Map();
  private notifications: Map<string, Notification> = new Map();
  private eventService: RealtimeEventService;
  private ruleCounter = 0;
  private notificationCounter = 0;

  constructor(eventService?: RealtimeEventService) {
    this.eventService = eventService || new RealtimeEventService();

    // Register default alert rules
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // High failure rate alert
    this.registerRule({
      name: 'High Sync Failure Rate',
      enabled: true,
      condition: (metrics: Record<string, any>) => {
        return metrics.syncStatus?.successRate < 90;
      },
      severity: 'CRITICAL',
      title: 'Sync Success Rate Critical',
      message: 'Sync operations success rate has dropped below 90%',
      cooldown: 300000, // 5 minutes
    });

    // Many unresolved conflicts
    this.registerRule({
      name: 'Unresolved Conflicts',
      enabled: true,
      condition: (metrics: Record<string, any>) => {
        return metrics.conflictStatus?.unresolvedConflicts > 10;
      },
      severity: 'WARNING',
      title: 'Multiple Unresolved Conflicts',
      message: 'More than 10 conflicts remain unresolved',
      cooldown: 600000, // 10 minutes
    });

    // Queue backup alert
    this.registerRule({
      name: 'Job Queue Backup',
      enabled: true,
      condition: (metrics: Record<string, any>) => {
        return metrics.jobStatus?.queueLength > 100;
      },
      severity: 'WARNING',
      title: 'Job Queue Backup',
      message: 'Job queue has more than 100 pending jobs',
      cooldown: 300000, // 5 minutes
    });

    // System unhealthy
    this.registerRule({
      name: 'System Unhealthy',
      enabled: true,
      condition: (metrics: Record<string, any>) => {
        return metrics.systemHealth?.status === 'UNHEALTHY';
      },
      severity: 'CRITICAL',
      title: 'System Health Critical',
      message: 'System health status is UNHEALTHY',
      cooldown: 600000, // 10 minutes
    });
  }

  /**
   * Register an alert rule
   */
  registerRule(ruleConfig: Omit<AlertRule, 'id' | 'lastTriggered'>): void {
    try {
      const id = `rule-${Date.now()}-${++this.ruleCounter}`;

      const rule: AlertRule = {
        id,
        ...ruleConfig,
      };

      this.rules.set(id, rule);

      logger.info('Alert rule registered', {
        ruleId: id,
        name: rule.name,
        severity: rule.severity,
      });
    } catch (error) {
      logger.error('Failed to register alert rule', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Evaluate all rules
   */
  async evaluateRules(metrics: Record<string, any>): Promise<Array<AlertRule>> {
    try {
      const triggeredRules: AlertRule[] = [];

      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;

        // Check cooldown
        const now = Date.now();
        if (rule.lastTriggered) {
          const timeSinceLastTrigger = now - rule.lastTriggered.getTime();
          if (timeSinceLastTrigger < rule.cooldown) {
            continue;
          }
        }

        // Evaluate condition
        try {
          if (rule.condition(metrics)) {
            rule.lastTriggered = new Date();
            triggeredRules.push(rule);

            // Emit alert event
            await this.eventService.emit(EventType.ALERT_CREATED, 'AlertingService', {
              ruleId: rule.id,
              ruleName: rule.name,
              severity: rule.severity,
              title: rule.title,
              message: rule.message,
            });
          }
        } catch (error) {
          logger.error('Error evaluating alert rule', {
            error: error instanceof Error ? error.message : String(error),
            ruleId: rule.id,
          });
        }
      }

      return triggeredRules;
    } catch (error) {
      logger.error('Failed to evaluate alert rules', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get active rules
   */
  getActiveRules(): AlertRule[] {
    try {
      return Array.from(this.rules.values()).filter((r) => r.enabled);
    } catch (error) {
      logger.error('Failed to get active rules', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Send notification
   */
  async sendNotification(
    alertId: string,
    userId: string,
    channel: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'IN_APP'
  ): Promise<Notification> {
    try {
      const id = `notif-${Date.now()}-${++this.notificationCounter}`;

      const notification: Notification = {
        id,
        alertId,
        userId,
        channel,
        status: 'PENDING',
      };

      this.notifications.set(id, notification);

      // Simulate sending notification
      try {
        await this.deliverNotification(notification);
        notification.status = 'SENT';
        notification.sentAt = new Date();

        logger.info('Notification sent', {
          notificationId: id,
          userId,
          channel,
        });
      } catch (error) {
        notification.status = 'FAILED';
        notification.failureReason = error instanceof Error ? error.message : String(error);

        logger.error('Failed to send notification', {
          notificationId: id,
          error: notification.failureReason,
        });
      }

      return notification;
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Deliver notification (stub)
   */
  private async deliverNotification(notification: Notification): Promise<void> {
    // This would integrate with actual notification services
    // For now, just simulate the delivery
    return new Promise((resolve) => {
      setTimeout(() => {
        logger.info('Notification delivered', {
          channel: notification.channel,
          userId: notification.userId,
        });
        resolve();
      }, 100);
    });
  }

  /**
   * Get notifications
   */
  getNotifications(options?: {
    userId?: string;
    channel?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): { notifications: Notification[]; total: number } {
    try {
      let notifications = Array.from(this.notifications.values());

      if (options?.userId) {
        notifications = notifications.filter((n) => n.userId === options.userId);
      }

      if (options?.channel) {
        notifications = notifications.filter((n) => n.channel === options.channel);
      }

      if (options?.status) {
        notifications = notifications.filter((n) => n.status === options.status);
      }

      // Sort by sentAt descending
      notifications.sort((a, b) => {
        const aTime = a.sentAt?.getTime() || 0;
        const bTime = b.sentAt?.getTime() || 0;
        return bTime - aTime;
      });

      const total = notifications.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const sliced = notifications.slice(offset, offset + limit);

      return { notifications: sliced, total };
    } catch (error) {
      logger.error('Failed to get notifications', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Get notification statistics
   */
  getNotificationStatistics(): {
    totalNotifications: number;
    sentNotifications: number;
    failedNotifications: number;
    notificationsByChannel: Record<string, number>;
  } {
    try {
      const notificationsByChannel: Record<string, number> = {};
      let sentCount = 0;
      let failedCount = 0;

      this.notifications.forEach((notif) => {
        notificationsByChannel[notif.channel] = (notificationsByChannel[notif.channel] || 0) + 1;
        if (notif.status === 'SENT') sentCount++;
        if (notif.status === 'FAILED') failedCount++;
      });

      return {
        totalNotifications: this.notifications.size,
        sentNotifications: sentCount,
        failedNotifications: failedCount,
        notificationsByChannel,
      };
    } catch (error) {
      logger.error('Failed to get notification statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalNotifications: 0,
        sentNotifications: 0,
        failedNotifications: 0,
        notificationsByChannel: {},
      };
    }
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): boolean {
    try {
      const rule = this.rules.get(ruleId);

      if (!rule) {
        return false;
      }

      rule.enabled = false;

      logger.info('Alert rule disabled', {
        ruleId,
        ruleName: rule.name,
      });

      return true;
    } catch (error) {
      logger.error('Failed to disable alert rule', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): boolean {
    try {
      const rule = this.rules.get(ruleId);

      if (!rule) {
        return false;
      }

      rule.enabled = true;

      logger.info('Alert rule enabled', {
        ruleId,
        ruleName: rule.name,
      });

      return true;
    } catch (error) {
      logger.error('Failed to enable alert rule', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default AlertingService;
