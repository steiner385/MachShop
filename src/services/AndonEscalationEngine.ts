/**
 * AndonEscalationEngine - Automated escalation rule processing for Andon alerts
 *
 * Provides automated escalation processing including:
 * - Monitoring of overdue alerts based on escalation timeouts
 * - Rule evaluation and condition matching
 * - Automatic execution of escalation actions (notifications, reassignments)
 * - Escalation tracking and audit logging
 * - Dynamic escalation level progression
 * - Integration with notification systems
 *
 * This engine is designed to run as a background process or scheduled job
 * to continuously monitor and process alert escalations.
 *
 * Created for Issue #171: Production Alerts & Andon Core Infrastructure
 */

import {
  AndonAlert,
  AndonEscalationRule,
  AndonEscalationRuleResult,
  AndonAlertStatus,
  AndonSeverity,
  User
} from '@prisma/client';
import prisma from '../lib/database';
import { AndonService, AndonAlertWithRelations, AndonEscalationRuleWithRelations } from './AndonService';

// Guard check for prisma instance
if (!prisma) {
  throw new Error('Database connection not available. Check DATABASE_URL environment variable and database server connectivity.');
}

// ================================
// ESCALATION ENGINE TYPES AND INTERFACES
// ================================

export interface EscalationContext {
  alert: AndonAlertWithRelations;
  applicableRules: AndonEscalationRuleWithRelations[];
  currentTime: Date;
  escalationLevel: number;
}

export interface EscalationAction {
  type: 'NOTIFY' | 'REASSIGN' | 'STATUS_CHANGE' | 'CUSTOM';
  target: string; // User ID, role name, or other target identifier
  channel?: string; // EMAIL, SMS, PUSH, etc.
  metadata?: any;
}

export interface EscalationExecutionResult {
  success: boolean;
  actionsExecuted: EscalationAction[];
  notifiedUsers: string[];
  newAssigneeId?: string;
  newStatus?: AndonAlertStatus;
  errorMessage?: string;
  executionTime: Date;
  nextEscalationAt?: Date;
}

export interface EscalationProcessingStats {
  alertsProcessed: number;
  rulesExecuted: number;
  actionsPerformed: number;
  errorsEncountered: number;
  averageProcessingTime: number;
  escalationsByLevel: Record<number, number>;
}

export interface EscalationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface NotificationPayload {
  userId: string;
  channel: string;
  subject: string;
  message: string;
  alertId: string;
  escalationLevel: number;
  metadata?: any;
}

/**
 * Andon Escalation Engine Class
 */
export class AndonEscalationEngine {
  private static readonly DEFAULT_ESCALATION_DELAY_MINUTES = 30;
  private static readonly MAX_ESCALATION_LEVEL = 5;

  // ================================
  // CORE ESCALATION PROCESSING
  // ================================

  /**
   * Process all overdue alerts for escalation
   * This is the main entry point for the escalation engine
   */
  static async processEscalations(siteId?: string): Promise<EscalationProcessingStats> {
    const startTime = Date.now();
    const stats: EscalationProcessingStats = {
      alertsProcessed: 0,
      rulesExecuted: 0,
      actionsPerformed: 0,
      errorsEncountered: 0,
      averageProcessingTime: 0,
      escalationsByLevel: {}
    };

    try {
      // Get all overdue alerts
      const overdueAlerts = await AndonService.getOverdueAlerts(siteId);

      console.log(`AndonEscalationEngine: Processing ${overdueAlerts.length} overdue alerts`);

      // Process each alert
      for (const alert of overdueAlerts) {
        try {
          await AndonEscalationEngine.processAlertEscalation(alert as AndonAlertWithRelations);
          stats.alertsProcessed++;

          // Track escalation level statistics
          const level = alert.currentEscalationLevel + 1;
          stats.escalationsByLevel[level] = (stats.escalationsByLevel[level] || 0) + 1;
        } catch (error) {
          console.error(`Error processing escalation for alert ${alert.id}:`, error);
          stats.errorsEncountered++;
        }
      }

      // Calculate average processing time
      const endTime = Date.now();
      stats.averageProcessingTime = stats.alertsProcessed > 0
        ? (endTime - startTime) / stats.alertsProcessed
        : 0;

      console.log(`AndonEscalationEngine: Completed processing. Stats:`, stats);
      return stats;

    } catch (error) {
      console.error('AndonEscalationEngine: Error in processEscalations:', error);
      stats.errorsEncountered++;
      return stats;
    }
  }

  /**
   * Process escalation for a single alert
   */
  static async processAlertEscalation(alert: AndonAlertWithRelations): Promise<EscalationExecutionResult> {
    const currentTime = new Date();
    const nextEscalationLevel = alert.currentEscalationLevel + 1;

    // Check if we've exceeded maximum escalation levels
    if (nextEscalationLevel > AndonEscalationEngine.MAX_ESCALATION_LEVEL) {
      console.warn(`Alert ${alert.id} has reached maximum escalation level`);
      return {
        success: false,
        actionsExecuted: [],
        notifiedUsers: [],
        errorMessage: 'Maximum escalation level reached',
        executionTime: currentTime
      };
    }

    // Find applicable escalation rules
    const applicableRules = await AndonEscalationEngine.findApplicableRules(
      alert,
      nextEscalationLevel
    );

    if (applicableRules.length === 0) {
      console.warn(`No applicable escalation rules found for alert ${alert.id} at level ${nextEscalationLevel}`);
      // Set a default next escalation time anyway
      await AndonEscalationEngine.updateAlertEscalationState(
        alert.id,
        nextEscalationLevel,
        new Date(Date.now() + AndonEscalationEngine.DEFAULT_ESCALATION_DELAY_MINUTES * 60 * 1000)
      );

      return {
        success: true,
        actionsExecuted: [],
        notifiedUsers: [],
        executionTime: currentTime,
        nextEscalationAt: new Date(Date.now() + AndonEscalationEngine.DEFAULT_ESCALATION_DELAY_MINUTES * 60 * 1000)
      };
    }

    // Execute escalation rules (process in priority order)
    const sortedRules = applicableRules.sort((a, b) => a.priority - b.priority);

    let aggregatedResult: EscalationExecutionResult = {
      success: true,
      actionsExecuted: [],
      notifiedUsers: [],
      executionTime: currentTime
    };

    for (const rule of sortedRules) {
      try {
        const ruleResult = await AndonEscalationEngine.executeEscalationRule(
          alert,
          rule,
          nextEscalationLevel
        );

        // Aggregate results
        aggregatedResult.actionsExecuted.push(...ruleResult.actionsExecuted);
        aggregatedResult.notifiedUsers.push(...ruleResult.notifiedUsers);

        if (ruleResult.newAssigneeId) {
          aggregatedResult.newAssigneeId = ruleResult.newAssigneeId;
        }

        if (ruleResult.newStatus) {
          aggregatedResult.newStatus = ruleResult.newStatus;
        }

        // Record rule execution
        await AndonEscalationEngine.recordRuleExecution(
          alert.id,
          rule.id,
          nextEscalationLevel,
          ruleResult
        );

        console.log(`Executed escalation rule ${rule.ruleName} for alert ${alert.id}`);

      } catch (error) {
        console.error(`Error executing rule ${rule.id} for alert ${alert.id}:`, error);

        // Record failed execution
        await AndonEscalationEngine.recordRuleExecution(
          alert.id,
          rule.id,
          nextEscalationLevel,
          {
            success: false,
            actionsExecuted: [],
            notifiedUsers: [],
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            executionTime: currentTime
          }
        );

        aggregatedResult.success = false;
      }
    }

    // Update alert escalation state
    const nextEscalationTime = AndonEscalationEngine.calculateNextEscalationTime(
      alert,
      nextEscalationLevel
    );

    await AndonEscalationEngine.updateAlertEscalationState(
      alert.id,
      nextEscalationLevel,
      nextEscalationTime,
      aggregatedResult.newAssigneeId,
      aggregatedResult.newStatus
    );

    aggregatedResult.nextEscalationAt = nextEscalationTime;
    return aggregatedResult;
  }

  // ================================
  // RULE EVALUATION AND EXECUTION
  // ================================

  /**
   * Find escalation rules applicable to an alert at a specific escalation level
   */
  static async findApplicableRules(
    alert: AndonAlertWithRelations,
    escalationLevel: number
  ): Promise<AndonEscalationRuleWithRelations[]> {
    // Get rules for the alert's site and global rules
    const allRules = await AndonService.listAndonEscalationRules(
      alert.siteId || undefined,
      alert.issueTypeId,
      true // activeOnly
    );

    // Filter rules by escalation level and severity
    const applicableRules = allRules.filter(rule => {
      // Check escalation level
      if (rule.escalationLevel !== escalationLevel) {
        return false;
      }

      // Check if severity matches
      if (!rule.triggerSeverity.includes(alert.severity)) {
        return false;
      }

      // Check custom conditions if any
      if (rule.conditions) {
        return AndonEscalationEngine.evaluateConditions(alert, rule.conditions as any);
      }

      return true;
    });

    return applicableRules;
  }

  /**
   * Execute a specific escalation rule
   */
  static async executeEscalationRule(
    alert: AndonAlertWithRelations,
    rule: AndonEscalationRuleWithRelations,
    escalationLevel: number
  ): Promise<EscalationExecutionResult> {
    const actions: EscalationAction[] = [];
    const notifiedUsers: string[] = [];
    let newAssigneeId: string | undefined;
    let newStatus: AndonAlertStatus | undefined;

    try {
      // Execute notifications
      if (rule.notifyUserIds.length > 0) {
        for (const userId of rule.notifyUserIds) {
          await AndonEscalationEngine.sendNotification({
            userId,
            channel: 'EMAIL', // Default channel, could be from rule.notifyChannels
            subject: `Andon Alert Escalated: ${alert.title}`,
            message: AndonEscalationEngine.buildEscalationMessage(alert, escalationLevel),
            alertId: alert.id,
            escalationLevel
          });

          actions.push({
            type: 'NOTIFY',
            target: userId,
            channel: 'EMAIL'
          });

          notifiedUsers.push(userId);
        }
      }

      // Execute role-based notifications
      if (rule.notifyRoles.length > 0) {
        for (const roleName of rule.notifyRoles) {
          const usersWithRole = await AndonEscalationEngine.getUsersByRole(roleName);

          for (const user of usersWithRole) {
            await AndonEscalationEngine.sendNotification({
              userId: user.id,
              channel: 'EMAIL',
              subject: `Andon Alert Escalated: ${alert.title}`,
              message: AndonEscalationEngine.buildEscalationMessage(alert, escalationLevel),
              alertId: alert.id,
              escalationLevel
            });

            actions.push({
              type: 'NOTIFY',
              target: user.id,
              channel: 'EMAIL',
              metadata: { role: roleName }
            });

            notifiedUsers.push(user.id);
          }
        }
      }

      // Execute reassignment
      if (rule.assignToUserId) {
        newAssigneeId = rule.assignToUserId;

        actions.push({
          type: 'REASSIGN',
          target: rule.assignToUserId
        });
      } else if (rule.assignToRole) {
        // Find a user with the specified role for assignment
        const usersWithRole = await AndonEscalationEngine.getUsersByRole(rule.assignToRole);

        if (usersWithRole.length > 0) {
          // Simple round-robin or pick first available user
          // In production, this could be more sophisticated (workload balancing, etc.)
          newAssigneeId = usersWithRole[0].id;

          actions.push({
            type: 'REASSIGN',
            target: newAssigneeId,
            metadata: { role: rule.assignToRole }
          });
        }
      }

      // Update status to ESCALATED if not already
      if (alert.status !== AndonAlertStatus.ESCALATED) {
        newStatus = AndonAlertStatus.ESCALATED;

        actions.push({
          type: 'STATUS_CHANGE',
          target: AndonAlertStatus.ESCALATED
        });
      }

      return {
        success: true,
        actionsExecuted: actions,
        notifiedUsers: [...new Set(notifiedUsers)], // Remove duplicates
        newAssigneeId,
        newStatus,
        executionTime: new Date()
      };

    } catch (error) {
      return {
        success: false,
        actionsExecuted: actions,
        notifiedUsers: [...new Set(notifiedUsers)],
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        executionTime: new Date()
      };
    }
  }

  /**
   * Evaluate custom conditions against an alert
   */
  static evaluateConditions(alert: AndonAlertWithRelations, conditions: any): boolean {
    if (!conditions || !Array.isArray(conditions)) {
      return true; // No conditions means rule applies
    }

    // Simple condition evaluation - in production this could be more sophisticated
    for (const condition of conditions as EscalationCondition[]) {
      const alertValue = AndonEscalationEngine.getAlertFieldValue(alert, condition.field);

      if (!AndonEscalationEngine.evaluateCondition(alertValue, condition.operator, condition.value)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get field value from alert object
   */
  private static getAlertFieldValue(alert: AndonAlertWithRelations, fieldPath: string): any {
    const fields = fieldPath.split('.');
    let value: any = alert;

    for (const field of fields) {
      value = value?.[field];
    }

    return value;
  }

  /**
   * Evaluate a single condition
   */
  private static evaluateCondition(alertValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return alertValue === conditionValue;
      case 'not_equals':
        return alertValue !== conditionValue;
      case 'greater_than':
        return alertValue > conditionValue;
      case 'less_than':
        return alertValue < conditionValue;
      case 'contains':
        return typeof alertValue === 'string' && alertValue.includes(conditionValue);
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(alertValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(alertValue);
      default:
        console.warn(`Unknown condition operator: ${operator}`);
        return false;
    }
  }

  // ================================
  // NOTIFICATION AND COMMUNICATION
  // ================================

  /**
   * Send notification to a user
   * In production, this would integrate with the actual notification system
   */
  static async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      // This is a placeholder - in production this would:
      // 1. Determine user's preferred notification channels
      // 2. Use the appropriate notification service (email, SMS, push, etc.)
      // 3. Apply notification templates
      // 4. Handle delivery tracking and retries

      console.log(`Sending notification to user ${payload.userId}:`, {
        channel: payload.channel,
        subject: payload.subject,
        alertId: payload.alertId,
        escalationLevel: payload.escalationLevel
      });

      // Example integration with existing notification service
      // await NotificationService.createNotification({
      //   userId: payload.userId,
      //   type: 'ANDON_ESCALATION',
      //   title: payload.subject,
      //   message: payload.message,
      //   relatedEntityType: 'AndonAlert',
      //   relatedEntityId: payload.alertId,
      //   channels: [payload.channel as NotificationChannel],
      //   priority: 'HIGH',
      //   metadata: payload.metadata
      // });

    } catch (error) {
      console.error(`Failed to send notification to user ${payload.userId}:`, error);
      throw error;
    }
  }

  /**
   * Build escalation notification message
   */
  static buildEscalationMessage(alert: AndonAlertWithRelations, escalationLevel: number): string {
    return `
Alert: ${alert.title}
Alert Number: ${alert.alertNumber}
Severity: ${alert.severity}
Priority: ${alert.priority}
Issue Type: ${alert.issueType?.typeName || 'Unknown'}
Location: ${alert.site?.siteName || 'Unknown'} ${alert.area?.areaName ? `- ${alert.area.areaName}` : ''}
Escalation Level: ${escalationLevel}
Created: ${alert.createdAt.toLocaleString()}
Description: ${alert.description || 'No description provided'}

This alert has been escalated and requires immediate attention.
Please review and take appropriate action.
    `.trim();
  }

  /**
   * Get users by role
   */
  static async getUsersByRole(roleName: string): Promise<User[]> {
    return prisma.user.findMany({
      where: {
        roles: { has: roleName },
        isActive: true
      },
      take: 10 // Limit to prevent excessive notifications
    });
  }

  // ================================
  // STATE MANAGEMENT AND TRACKING
  // ================================

  /**
   * Update alert escalation state
   */
  static async updateAlertEscalationState(
    alertId: string,
    escalationLevel: number,
    nextEscalationAt: Date | null,
    newAssigneeId?: string,
    newStatus?: AndonAlertStatus
  ): Promise<void> {
    const alert = await prisma.andonAlert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    // Update escalation history
    const escalationHistory = [
      ...(alert.escalationHistory as any[]),
      {
        level: escalationLevel,
        timestamp: new Date().toISOString(),
        previousAssignee: alert.assignedToId,
        newAssignee: newAssigneeId
      }
    ];

    // Update status history if status changed
    let statusHistory = alert.statusHistory as any[];
    if (newStatus && newStatus !== alert.status) {
      statusHistory = [
        ...statusHistory,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          userId: newAssigneeId || alert.assignedToId,
          notes: `Status changed to ${newStatus} due to escalation`
        }
      ];
    }

    await prisma.andonAlert.update({
      where: { id: alertId },
      data: {
        currentEscalationLevel: escalationLevel,
        nextEscalationAt,
        escalationHistory,
        statusHistory,
        ...(newAssigneeId && { assignedToId: newAssigneeId }),
        ...(newStatus && { status: newStatus })
      }
    });
  }

  /**
   * Record escalation rule execution result
   */
  static async recordRuleExecution(
    alertId: string,
    ruleId: string,
    escalationLevel: number,
    result: EscalationExecutionResult
  ): Promise<AndonEscalationRuleResult> {
    return prisma.andonEscalationRuleResult.create({
      data: {
        alertId,
        ruleId,
        escalationLevel,
        executedAt: result.executionTime,
        success: result.success,
        errorMessage: result.errorMessage || null,
        actionsTaken: result.actionsExecuted,
        notifiedUsers: result.notifiedUsers
      }
    });
  }

  /**
   * Calculate next escalation time based on alert and level
   */
  static calculateNextEscalationTime(
    alert: AndonAlertWithRelations,
    escalationLevel: number
  ): Date | null {
    // If we've reached max level, no more escalations
    if (escalationLevel >= AndonEscalationEngine.MAX_ESCALATION_LEVEL) {
      return null;
    }

    // Use issue type escalation timeout or default
    const timeoutMinutes = alert.issueType?.escalationTimeoutMins ||
                          AndonEscalationEngine.DEFAULT_ESCALATION_DELAY_MINUTES;

    // Implement exponential backoff for higher escalation levels
    const backoffMultiplier = Math.pow(1.5, escalationLevel - 1);
    const adjustedTimeout = timeoutMinutes * backoffMultiplier;

    return new Date(Date.now() + adjustedTimeout * 60 * 1000);
  }

  // ================================
  // UTILITY AND ADMIN METHODS
  // ================================

  /**
   * Test escalation rule execution (for development/testing)
   */
  static async testEscalationRule(
    ruleId: string,
    alertId: string
  ): Promise<EscalationExecutionResult> {
    const rule = await AndonService.getAndonEscalationRuleById(ruleId, true);
    const alert = await AndonService.getAndonAlertById(alertId, true);

    if (!rule) {
      throw new Error(`Escalation rule with ID ${ruleId} not found`);
    }

    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    // Execute rule without updating alert state (dry run)
    return AndonEscalationEngine.executeEscalationRule(
      alert,
      rule,
      alert.currentEscalationLevel + 1
    );
  }

  /**
   * Force escalation of a specific alert (manual trigger)
   */
  static async forceEscalation(alertId: string): Promise<EscalationExecutionResult> {
    const alert = await AndonService.getAndonAlertById(alertId, true);

    if (!alert) {
      throw new Error(`Alert with ID ${alertId} not found`);
    }

    if (alert.status === AndonAlertStatus.RESOLVED || alert.status === AndonAlertStatus.CLOSED) {
      throw new Error('Cannot escalate resolved or closed alert');
    }

    return AndonEscalationEngine.processAlertEscalation(alert);
  }

  /**
   * Get escalation statistics for monitoring
   */
  static async getEscalationStats(
    siteId?: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<any> {
    const whereClause: any = {};

    if (siteId) {
      whereClause.alert = { siteId };
    }

    if (dateRange) {
      whereClause.executedAt = {
        gte: dateRange.from,
        lte: dateRange.to
      };
    }

    const [
      totalExecutions,
      successfulExecutions,
      executionsByLevel,
      executionsByRule
    ] = await Promise.all([
      prisma.andonEscalationRuleResult.count({ where: whereClause }),
      prisma.andonEscalationRuleResult.count({
        where: { ...whereClause, success: true }
      }),
      prisma.andonEscalationRuleResult.groupBy({
        by: ['escalationLevel'],
        where: whereClause,
        _count: { escalationLevel: true }
      }),
      prisma.andonEscalationRuleResult.groupBy({
        by: ['ruleId'],
        where: whereClause,
        _count: { ruleId: true },
        orderBy: { _count: { ruleId: 'desc' } }
      })
    ]);

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions: totalExecutions - successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      executionsByLevel: executionsByLevel.reduce((acc, item) => {
        acc[item.escalationLevel] = item._count.escalationLevel;
        return acc;
      }, {} as Record<number, number>),
      topRules: executionsByRule.slice(0, 10)
    };
  }
}