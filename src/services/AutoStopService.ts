/**
 * Auto-Stop Service
 * Service for automatically stopping time entries based on configurable rules
 * Integrates with time tracking to prevent runaway time entries
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import {
  AutoStopBehavior,
  AutoStopConfiguration,
  TimeEntryStatus,
  TimeType,
  LaborTimeEntry,
  MachineTimeEntry,
  TimeTrackingConfiguration,
  User,
} from '@prisma/client';
import prisma from '../lib/database';
import { timeTrackingService } from './TimeTrackingService';
import { timeEntryEditService } from './TimeEntryEditService';

export interface AutoStopTrigger {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: AutoStopCondition[];
  behavior: AutoStopBehavior;
  scope: AutoStopScope;
  notifications: AutoStopNotification[];
}

export interface AutoStopCondition {
  type: 'DURATION_EXCEEDED' | 'TIME_OF_DAY' | 'WORK_ORDER_COMPLETED' | 'SHIFT_END' | 'IDLE_DETECTION' | 'CUSTOM';
  parameters: Record<string, any>;
  operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS' | 'BETWEEN' | 'NOT_EQUALS';
  threshold: number | string | Date;
  unit?: 'MINUTES' | 'HOURS' | 'DAYS';
}

export interface AutoStopScope {
  siteIds?: string[];
  userIds?: string[];
  equipmentIds?: string[];
  workOrderIds?: string[];
  timeTypes?: TimeType[];
  personnelClasses?: string[];
}

export interface AutoStopNotification {
  type: 'EMAIL' | 'SMS' | 'IN_APP' | 'WEBHOOK';
  recipients: string[];
  template: string;
  timing: 'BEFORE' | 'DURING' | 'AFTER';
  advanceMinutes?: number;
}

export interface AutoStopEvent {
  id: string;
  triggerId: string;
  timeEntryId: string;
  timeEntryType: 'LABOR' | 'MACHINE';
  triggerCondition: string;
  actionTaken: AutoStopBehavior;
  triggeredAt: Date;
  userResponse?: 'CONFIRMED' | 'EXTENDED' | 'IGNORED';
  metadata: Record<string, any>;
}

export interface PromptResponse {
  timeEntryId: string;
  response: 'CONTINUE' | 'STOP' | 'EXTEND';
  extensionMinutes?: number;
  reason?: string;
  userId: string;
}

export class AutoStopService {
  private readonly CHECK_INTERVAL_MS = 60000; // Check every minute
  private checkTimer?: NodeJS.Timeout;

  /**
   * Start the auto-stop monitoring service
   */
  startMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkAutoStopConditions().catch(error => {
        console.error('Auto-stop monitoring error:', error);
      });
    }, this.CHECK_INTERVAL_MS);

    console.log('Auto-stop monitoring service started');
  }

  /**
   * Stop the auto-stop monitoring service
   */
  stopMonitoring(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }

    console.log('Auto-stop monitoring service stopped');
  }

  /**
   * Check all active time entries against auto-stop conditions
   */
  async checkAutoStopConditions(): Promise<void> {
    try {
      // Get all active configurations
      const configurations = await this.getActiveAutoStopConfigurations();

      for (const config of configurations) {
        await this.processAutoStopConfiguration(config);
      }
    } catch (error) {
      console.error('Error checking auto-stop conditions:', error);
    }
  }

  /**
   * Process a specific auto-stop configuration
   */
  private async processAutoStopConfiguration(config: AutoStopConfiguration): Promise<void> {
    // Get active time entries that match the configuration scope
    const activeEntries = await this.getActiveEntriesInScope(config);

    for (const entry of activeEntries) {
      await this.evaluateEntryForAutoStop(entry, config);
    }
  }

  /**
   * Evaluate a single time entry against auto-stop conditions
   */
  private async evaluateEntryForAutoStop(
    entry: LaborTimeEntry | MachineTimeEntry,
    config: AutoStopConfiguration
  ): Promise<void> {
    const conditions = config.conditions as AutoStopCondition[];

    for (const condition of conditions) {
      const shouldTrigger = await this.evaluateCondition(entry, condition);

      if (shouldTrigger) {
        await this.triggerAutoStop(entry, config, condition);
        break; // Only trigger first matching condition
      }
    }
  }

  /**
   * Evaluate a specific condition against a time entry
   */
  private async evaluateCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): Promise<boolean> {
    switch (condition.type) {
      case 'DURATION_EXCEEDED':
        return this.evaluateDurationCondition(entry, condition);

      case 'TIME_OF_DAY':
        return this.evaluateTimeOfDayCondition(entry, condition);

      case 'WORK_ORDER_COMPLETED':
        return await this.evaluateWorkOrderCompletedCondition(entry, condition);

      case 'SHIFT_END':
        return await this.evaluateShiftEndCondition(entry, condition);

      case 'IDLE_DETECTION':
        return await this.evaluateIdleDetectionCondition(entry, condition);

      case 'CUSTOM':
        return await this.evaluateCustomCondition(entry, condition);

      default:
        return false;
    }
  }

  /**
   * Trigger auto-stop action
   */
  private async triggerAutoStop(
    entry: LaborTimeEntry | MachineTimeEntry,
    config: AutoStopConfiguration,
    condition: AutoStopCondition
  ): Promise<void> {
    const isLabor = 'userId' in entry;
    const timeEntryType = isLabor ? 'LABOR' : 'MACHINE';

    // Check if this entry was already processed recently
    const recentEvent = await this.getRecentAutoStopEvent(entry.id, timeEntryType);
    if (recentEvent && this.isWithinCooldownPeriod(recentEvent)) {
      return;
    }

    // Create auto-stop event
    const event = await this.createAutoStopEvent(entry, config, condition);

    try {
      switch (config.behavior) {
        case AutoStopBehavior.STOP_ALL:
          await this.stopAllActiveEntries(entry, event);
          break;

        case AutoStopBehavior.STOP_DIRECT_ONLY:
          await this.stopDirectLaborOnly(entry, event);
          break;

        case AutoStopBehavior.PROMPT_OPERATOR:
          await this.promptOperatorForAction(entry, event);
          break;

        case AutoStopBehavior.DO_NOTHING:
          await this.logAutoStopEvent(entry, event);
          break;
      }

      // Send notifications
      await this.sendAutoStopNotifications(config, entry, event);

    } catch (error) {
      console.error(`Auto-stop action failed for entry ${entry.id}:`, error);

      // Update event with error
      await this.updateAutoStopEvent(event.id, {
        error: (error as Error).message,
        completed: false,
      });
    }
  }

  /**
   * Stop all active entries for a user
   */
  private async stopAllActiveEntries(
    entry: LaborTimeEntry | MachineTimeEntry,
    event: AutoStopEvent
  ): Promise<void> {
    const isLabor = 'userId' in entry;

    if (isLabor) {
      const laborEntry = entry as LaborTimeEntry;
      const stoppedEntries = await timeTrackingService.stopAllActiveEntries(
        laborEntry.userId,
        `Auto-stop triggered: ${event.triggerCondition}`
      );

      // Create edit records for audit trail
      for (const stopped of stoppedEntries) {
        await timeEntryEditService.createEdit({
          timeEntryId: stopped.id,
          timeEntryType: 'LABOR',
          editType: 'MODIFIED',
          originalValues: { status: TimeEntryStatus.ACTIVE },
          newValues: { status: stopped.status, clockOutTime: stopped.clockOutTime },
          changedFields: ['status', 'clockOutTime'],
          reason: `Auto-stop: ${event.triggerCondition}`,
          reasonCategory: 'SYSTEM_AUTOMATED',
          editedBy: 'SYSTEM',
          entrySource: 'AUTO_STOP',
        });
      }

      console.log(`Auto-stopped ${stoppedEntries.length} entries for user ${laborEntry.userId}`);
    } else {
      // Handle machine time entry
      const machineEntry = entry as MachineTimeEntry;
      await timeTrackingService.stopMachineTime(machineEntry.id);

      await timeEntryEditService.createEdit({
        timeEntryId: machineEntry.id,
        timeEntryType: 'MACHINE',
        editType: 'MODIFIED',
        originalValues: { status: TimeEntryStatus.ACTIVE },
        newValues: { status: TimeEntryStatus.COMPLETED },
        changedFields: ['status'],
        reason: `Auto-stop: ${event.triggerCondition}`,
        reasonCategory: 'SYSTEM_AUTOMATED',
        editedBy: 'SYSTEM',
        entrySource: 'AUTO_STOP',
      });
    }

    await this.updateAutoStopEvent(event.id, {
      actionTaken: AutoStopBehavior.STOP_ALL,
      completed: true,
    });
  }

  /**
   * Stop only direct labor entries, keep indirect time running
   */
  private async stopDirectLaborOnly(
    entry: LaborTimeEntry | MachineTimeEntry,
    event: AutoStopEvent
  ): Promise<void> {
    const isLabor = 'userId' in entry;

    if (isLabor) {
      const laborEntry = entry as LaborTimeEntry;

      // Only stop if this is direct labor
      if (laborEntry.timeType === TimeType.DIRECT_LABOR) {
        await timeTrackingService.clockOut({
          timeEntryId: laborEntry.id,
        });

        await timeEntryEditService.createEdit({
          timeEntryId: laborEntry.id,
          timeEntryType: 'LABOR',
          editType: 'MODIFIED',
          originalValues: { status: TimeEntryStatus.ACTIVE },
          newValues: { status: TimeEntryStatus.COMPLETED },
          changedFields: ['status'],
          reason: `Auto-stop direct labor: ${event.triggerCondition}`,
          reasonCategory: 'SYSTEM_AUTOMATED',
          editedBy: 'SYSTEM',
          entrySource: 'AUTO_STOP',
        });

        console.log(`Auto-stopped direct labor entry ${laborEntry.id}`);
      }
    }

    await this.updateAutoStopEvent(event.id, {
      actionTaken: AutoStopBehavior.STOP_DIRECT_ONLY,
      completed: true,
    });
  }

  /**
   * Prompt operator for action
   */
  private async promptOperatorForAction(
    entry: LaborTimeEntry | MachineTimeEntry,
    event: AutoStopEvent
  ): Promise<void> {
    const isLabor = 'userId' in entry;

    // Create a prompt record for the operator
    await this.createOperatorPrompt(entry, event);

    // Send immediate notification
    const userId = isLabor ? (entry as LaborTimeEntry).userId : null;
    if (userId) {
      await this.sendOperatorPromptNotification(userId, entry, event);
    }

    await this.updateAutoStopEvent(event.id, {
      actionTaken: AutoStopBehavior.PROMPT_OPERATOR,
      awaitingResponse: true,
    });

    console.log(`Created operator prompt for entry ${entry.id}`);
  }

  /**
   * Process operator response to auto-stop prompt
   */
  async processOperatorResponse(response: PromptResponse): Promise<void> {
    const prompt = await this.getOperatorPrompt(response.timeEntryId);
    if (!prompt) {
      throw new Error(`Prompt not found for time entry ${response.timeEntryId}`);
    }

    switch (response.response) {
      case 'CONTINUE':
        await this.extendTimeEntry(response.timeEntryId, response.extensionMinutes || 60);
        break;

      case 'STOP':
        await this.stopTimeEntryFromPrompt(response.timeEntryId, response.reason);
        break;

      case 'EXTEND':
        await this.extendTimeEntry(response.timeEntryId, response.extensionMinutes || 60);
        break;
    }

    // Update prompt as responded
    await this.updateOperatorPrompt(prompt.id, {
      respondedAt: new Date(),
      response: response.response,
      responseReason: response.reason,
    });

    console.log(`Processed operator response: ${response.response} for entry ${response.timeEntryId}`);
  }

  /**
   * Condition evaluation methods
   */
  private evaluateDurationCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): boolean {
    const startTime = 'clockInTime' in entry ? entry.clockInTime : entry.startTime;
    const currentTime = new Date();
    const durationMs = currentTime.getTime() - startTime.getTime();

    const thresholdMs = this.convertToMilliseconds(
      condition.threshold as number,
      condition.unit || 'HOURS'
    );

    switch (condition.operator) {
      case 'GREATER_THAN':
        return durationMs > thresholdMs;
      case 'GREATER_THAN_OR_EQUAL':
        return durationMs >= thresholdMs;
      default:
        return false;
    }
  }

  private evaluateTimeOfDayCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): boolean {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    const thresholdTimeMinutes = this.parseTimeToMinutes(condition.threshold as string);

    return currentTimeMinutes >= thresholdTimeMinutes;
  }

  private async evaluateWorkOrderCompletedCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): Promise<boolean> {
    if (!entry.workOrderId) return false;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: entry.workOrderId }
    });

    return workOrder?.status === 'COMPLETED';
  }

  private async evaluateShiftEndCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): Promise<boolean> {
    // Get user's shift information
    const isLabor = 'userId' in entry;
    if (!isLabor) return false;

    const user = await prisma.user.findUnique({
      where: { id: (entry as LaborTimeEntry).userId },
      include: { personnelClass: true }
    });

    // Simple implementation - check if current time is past shift end
    const currentTime = new Date();
    const shiftEndHour = condition.parameters.shiftEndHour || 17; // 5 PM default

    return currentTime.getHours() >= shiftEndHour;
  }

  private async evaluateIdleDetectionCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): Promise<boolean> {
    // This would integrate with actual idle detection systems
    // For now, return false as it requires external systems
    return false;
  }

  private async evaluateCustomCondition(
    entry: LaborTimeEntry | MachineTimeEntry,
    condition: AutoStopCondition
  ): Promise<boolean> {
    // Custom conditions would be implemented based on specific business rules
    return false;
  }

  /**
   * Utility methods
   */
  private convertToMilliseconds(value: number, unit: string): number {
    switch (unit) {
      case 'MINUTES':
        return value * 60 * 1000;
      case 'HOURS':
        return value * 60 * 60 * 1000;
      case 'DAYS':
        return value * 24 * 60 * 60 * 1000;
      default:
        return value;
    }
  }

  private parseTimeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private async getActiveAutoStopConfigurations(): Promise<AutoStopConfiguration[]> {
    return await prisma.autoStopConfiguration.findMany({
      where: { isActive: true }
    });
  }

  private async getActiveEntriesInScope(config: AutoStopConfiguration): Promise<(LaborTimeEntry | MachineTimeEntry)[]> {
    const scope = config.scope as AutoStopScope;
    const entries: (LaborTimeEntry | MachineTimeEntry)[] = [];

    // Get labor entries
    const laborEntries = await prisma.laborTimeEntry.findMany({
      where: {
        status: TimeEntryStatus.ACTIVE,
        ...(scope.userIds && { userId: { in: scope.userIds } }),
        ...(scope.workOrderIds && { workOrderId: { in: scope.workOrderIds } }),
        ...(scope.timeTypes && { timeType: { in: scope.timeTypes } }),
      },
      include: {
        user: true,
        workOrder: true,
      }
    });

    // Get machine entries
    const machineEntries = await prisma.machineTimeEntry.findMany({
      where: {
        status: TimeEntryStatus.ACTIVE,
        ...(scope.equipmentIds && { equipmentId: { in: scope.equipmentIds } }),
        ...(scope.workOrderIds && { workOrderId: { in: scope.workOrderIds } }),
      },
      include: {
        equipment: true,
        workOrder: true,
      }
    });

    entries.push(...laborEntries, ...machineEntries);
    return entries;
  }

  private async createAutoStopEvent(
    entry: LaborTimeEntry | MachineTimeEntry,
    config: AutoStopConfiguration,
    condition: AutoStopCondition
  ): Promise<AutoStopEvent> {
    const isLabor = 'userId' in entry;

    const event = await prisma.autoStopEvent.create({
      data: {
        configurationId: config.id,
        timeEntryId: entry.id,
        timeEntryType: isLabor ? 'LABOR' : 'MACHINE',
        triggerCondition: `${condition.type}: ${JSON.stringify(condition.parameters)}`,
        plannedAction: config.behavior,
        metadata: {
          conditionType: condition.type,
          threshold: condition.threshold,
          operator: condition.operator,
          entryStartTime: isLabor ? (entry as LaborTimeEntry).clockInTime : (entry as MachineTimeEntry).startTime,
        }
      }
    });

    return event as any; // Type assertion for interface compatibility
  }

  private async getRecentAutoStopEvent(timeEntryId: string, timeEntryType: string): Promise<AutoStopEvent | null> {
    const recentEvent = await prisma.autoStopEvent.findFirst({
      where: {
        timeEntryId,
        timeEntryType,
        triggeredAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Within last hour
        }
      },
      orderBy: { triggeredAt: 'desc' }
    });

    return recentEvent as any;
  }

  private isWithinCooldownPeriod(event: AutoStopEvent): boolean {
    const cooldownMs = 30 * 60 * 1000; // 30 minutes
    return (new Date().getTime() - event.triggeredAt.getTime()) < cooldownMs;
  }

  private async updateAutoStopEvent(eventId: string, updates: Partial<AutoStopEvent>): Promise<void> {
    await prisma.autoStopEvent.update({
      where: { id: eventId },
      data: updates
    });
  }

  private async createOperatorPrompt(entry: LaborTimeEntry | MachineTimeEntry, event: AutoStopEvent): Promise<void> {
    // Implementation would create operator prompt records
    console.log(`Creating operator prompt for entry ${entry.id}`);
  }

  private async sendOperatorPromptNotification(userId: string, entry: LaborTimeEntry | MachineTimeEntry, event: AutoStopEvent): Promise<void> {
    console.log(`Sending prompt notification to user ${userId} for entry ${entry.id}`);
  }

  private async getOperatorPrompt(timeEntryId: string): Promise<any> {
    // Implementation would retrieve operator prompt
    return null;
  }

  private async extendTimeEntry(timeEntryId: string, extensionMinutes: number): Promise<void> {
    console.log(`Extending time entry ${timeEntryId} by ${extensionMinutes} minutes`);
  }

  private async stopTimeEntryFromPrompt(timeEntryId: string, reason?: string): Promise<void> {
    console.log(`Stopping time entry ${timeEntryId} from operator prompt. Reason: ${reason}`);
  }

  private async updateOperatorPrompt(promptId: string, updates: any): Promise<void> {
    console.log(`Updating operator prompt ${promptId}`);
  }

  private async logAutoStopEvent(entry: LaborTimeEntry | MachineTimeEntry, event: AutoStopEvent): Promise<void> {
    console.log(`Auto-stop condition met for entry ${entry.id}, but action is DO_NOTHING`);
  }

  private async sendAutoStopNotifications(
    config: AutoStopConfiguration,
    entry: LaborTimeEntry | MachineTimeEntry,
    event: AutoStopEvent
  ): Promise<void> {
    const notifications = config.notifications as AutoStopNotification[];

    for (const notification of notifications) {
      console.log(`Sending ${notification.type} notification for auto-stop event ${event.id}`);
    }
  }
}

export const autoStopService = new AutoStopService();