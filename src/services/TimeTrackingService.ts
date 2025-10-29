/**
 * Time Tracking Service
 * Core service for managing labor and machine time tracking
 * Implements clock in/out logic, validation, and cost calculation
 *
 * GitHub Issue #46: Time Tracking Infrastructure
 */

import { PrismaClient } from '@prisma/client';
import {
  TimeType,
  TimeEntrySource,
  TimeEntryStatus,
  TimeTrackingGranularity,
  CostingModel,
  LaborTimeEntry,
  MachineTimeEntry,
  TimeTrackingConfiguration,
  IndirectCostCode,
} from '@prisma/client';

const prisma = new PrismaClient();

export interface ClockInRequest {
  userId: string;
  workOrderId?: string;
  operationId?: string;
  indirectCodeId?: string;
  entrySource?: TimeEntrySource;
  deviceId?: string;
  location?: string;
}

export interface ClockOutRequest {
  timeEntryId: string;
  clockOutTime?: Date;
}

export interface MachineTimeStartRequest {
  equipmentId: string;
  workOrderId?: string;
  operationId?: string;
  entrySource?: TimeEntrySource;
  dataSource?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class TimeTrackingService {
  /**
   * Clock in a user to a work order, operation, or indirect activity
   */
  async clockIn(request: ClockInRequest): Promise<LaborTimeEntry> {
    // 1. Get user and site information
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      include: {
        userSiteRoles: {
          include: { site: true }
        }
      }
    });

    if (!user) {
      throw new Error(`User ${request.userId} not found`);
    }

    // For now, get the first site the user has access to
    // In a real implementation, this would be passed in or determined by context
    const siteId = user.userSiteRoles[0]?.site?.id;
    if (!siteId) {
      throw new Error('User must be assigned to a site for time tracking');
    }

    // 2. Get site time tracking configuration
    const config = await this.getTimeTrackingConfiguration(siteId);

    if (!config.timeTrackingEnabled) {
      throw new Error('Time tracking is disabled for this site');
    }

    // 3. Check for active entries
    const activeEntries = await this.getActiveTimeEntries(request.userId);

    if (activeEntries.length > 0 && !config.allowMultiTasking) {
      const activeEntry = activeEntries[0];
      const activityDescription = activeEntry.workOrderId
        ? `work order ${activeEntry.workOrderId}`
        : activeEntry.operationId
        ? `operation ${activeEntry.operationId}`
        : 'indirect activity';

      throw new Error(
        `Cannot clock in. Active time entry exists for ${activityDescription}. ` +
        `Clock out first or enable multi-tasking.`
      );
    }

    // 4. Validate tracking granularity
    if (config.trackingGranularity === TimeTrackingGranularity.WORK_ORDER && request.operationId) {
      throw new Error('Operation-level tracking not enabled for this site');
    }

    if (config.trackingGranularity === TimeTrackingGranularity.NONE) {
      throw new Error('Time tracking is disabled for this site');
    }

    // 5. Determine time type
    let timeType: TimeType;
    if (request.indirectCodeId) {
      timeType = TimeType.INDIRECT;
    } else if (request.workOrderId || request.operationId) {
      timeType = TimeType.DIRECT_LABOR;
    } else {
      throw new Error('Must provide either work order, operation, or indirect code');
    }

    // 6. Get labor rate for costing
    const laborRate = user.laborRate || await this.getDefaultLaborRate(user.personnelClassId);

    // 7. Create time entry
    const timeEntry = await prisma.laborTimeEntry.create({
      data: {
        userId: request.userId,
        workOrderId: request.workOrderId,
        operationId: request.operationId,
        indirectCodeId: request.indirectCodeId,
        timeType,
        clockInTime: new Date(),
        entrySource: request.entrySource || TimeEntrySource.MANUAL,
        deviceId: request.deviceId,
        location: request.location,
        status: TimeEntryStatus.ACTIVE,
        laborRate,
        costCenter: user.costCenter,
      },
      include: {
        user: true,
        workOrder: true,
        operation: true,
        indirectCode: true,
      }
    });

    console.log(`User ${user.username} clocked in to ${timeType} at ${timeEntry.clockInTime}`);
    return timeEntry;
  }

  /**
   * Clock out a user from an active time entry
   */
  async clockOut(request: ClockOutRequest): Promise<LaborTimeEntry> {
    // 1. Get time entry
    const entry = await prisma.laborTimeEntry.findUnique({
      where: { id: request.timeEntryId },
      include: {
        user: {
          include: {
            userSiteRoles: {
              include: { site: true }
            }
          }
        }
      }
    });

    if (!entry) {
      throw new Error(`Time entry ${request.timeEntryId} not found`);
    }

    if (entry.status !== TimeEntryStatus.ACTIVE) {
      throw new Error(`Time entry is not active (status: ${entry.status})`);
    }

    // 2. Calculate duration
    const clockOut = request.clockOutTime || new Date();
    const durationMs = clockOut.getTime() - entry.clockInTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // 3. Get site configuration for break rules
    const siteId = entry.user.userSiteRoles[0]?.site?.id;
    if (!siteId) {
      throw new Error('Cannot determine site for time tracking configuration');
    }

    const config = await this.getTimeTrackingConfiguration(siteId);
    let adjustedDuration = durationHours;

    // Apply break rules if configured
    if (config.autoSubtractBreaks && config.standardBreakMinutes) {
      const breakHours = config.standardBreakMinutes / 60;
      adjustedDuration = Math.max(0, durationHours - breakHours);
    }

    // 4. Calculate labor cost
    const laborCost = adjustedDuration * (entry.laborRate || 0);

    // 5. Determine status after clock out
    const newStatus = config.requireTimeApproval
      ? TimeEntryStatus.PENDING_APPROVAL
      : TimeEntryStatus.COMPLETED;

    // 6. Update time entry
    const updatedEntry = await prisma.laborTimeEntry.update({
      where: { id: request.timeEntryId },
      data: {
        clockOutTime: clockOut,
        duration: adjustedDuration,
        laborCost,
        status: newStatus,
      },
      include: {
        user: true,
        workOrder: true,
        operation: true,
        indirectCode: true,
      }
    });

    console.log(`User ${entry.user.username} clocked out. Duration: ${adjustedDuration.toFixed(2)} hours, Cost: $${laborCost.toFixed(2)}`);
    return updatedEntry;
  }

  /**
   * Get all active time entries for a user
   */
  async getActiveTimeEntries(userId: string): Promise<LaborTimeEntry[]> {
    return await prisma.laborTimeEntry.findMany({
      where: {
        userId,
        status: TimeEntryStatus.ACTIVE,
      },
      include: {
        user: true,
        workOrder: true,
        operation: true,
        indirectCode: true,
      },
      orderBy: {
        clockInTime: 'desc'
      }
    });
  }

  /**
   * Stop all active time entries for a user (emergency stop)
   */
  async stopAllActiveEntries(userId: string, reason: string): Promise<LaborTimeEntry[]> {
    const activeEntries = await this.getActiveTimeEntries(userId);

    const stoppedEntries = [];
    for (const entry of activeEntries) {
      const stopped = await this.clockOut({
        timeEntryId: entry.id,
        clockOutTime: new Date()
      });

      // Add a note about the bulk stop
      await prisma.laborTimeEntry.update({
        where: { id: stopped.id },
        data: {
          editReason: `Bulk stop: ${reason}`,
          editedAt: new Date(),
        }
      });

      stoppedEntries.push(stopped);
    }

    console.log(`Stopped ${stoppedEntries.length} active entries for user ${userId}. Reason: ${reason}`);
    return stoppedEntries;
  }

  /**
   * Start machine time tracking
   */
  async startMachineTime(request: MachineTimeStartRequest): Promise<MachineTimeEntry> {
    // 1. Get equipment information
    const equipment = await prisma.equipment.findUnique({
      where: { id: request.equipmentId },
      include: {
        site: {
          include: {
            timeTrackingConfiguration: true
          }
        }
      }
    });

    if (!equipment) {
      throw new Error(`Equipment ${request.equipmentId} not found`);
    }

    const config = equipment.site?.timeTrackingConfiguration;
    if (!config?.enableMachineTracking) {
      throw new Error('Machine time tracking is not enabled for this site');
    }

    // 2. Check for active machine entries
    const activeEntries = await prisma.machineTimeEntry.findMany({
      where: {
        equipmentId: request.equipmentId,
        status: TimeEntryStatus.ACTIVE,
      }
    });

    if (activeEntries.length > 0) {
      throw new Error(`Machine ${equipment.name} already has active time tracking`);
    }

    // 3. Create machine time entry
    const machineEntry = await prisma.machineTimeEntry.create({
      data: {
        equipmentId: request.equipmentId,
        workOrderId: request.workOrderId,
        operationId: request.operationId,
        startTime: new Date(),
        entrySource: request.entrySource || TimeEntrySource.MACHINE_AUTO,
        dataSource: request.dataSource,
        status: TimeEntryStatus.ACTIVE,
      },
      include: {
        equipment: true,
        workOrder: true,
        operation: true,
      }
    });

    console.log(`Machine time started for ${equipment.name} at ${machineEntry.startTime}`);
    return machineEntry;
  }

  /**
   * Stop machine time tracking
   */
  async stopMachineTime(machineTimeEntryId: string, endTime?: Date): Promise<MachineTimeEntry> {
    const entry = await prisma.machineTimeEntry.findUnique({
      where: { id: machineTimeEntryId },
      include: {
        equipment: true
      }
    });

    if (!entry) {
      throw new Error(`Machine time entry ${machineTimeEntryId} not found`);
    }

    if (entry.status !== TimeEntryStatus.ACTIVE) {
      throw new Error(`Machine time entry is not active (status: ${entry.status})`);
    }

    const stopTime = endTime || new Date();
    const durationMs = stopTime.getTime() - entry.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    // Calculate machine cost (if machine rate is available)
    const machineCost = entry.machineRate ? durationHours * entry.machineRate : null;

    const updatedEntry = await prisma.machineTimeEntry.update({
      where: { id: machineTimeEntryId },
      data: {
        endTime: stopTime,
        duration: durationHours,
        machineCost,
        status: TimeEntryStatus.COMPLETED,
      },
      include: {
        equipment: true,
        workOrder: true,
        operation: true,
      }
    });

    console.log(`Machine time stopped for ${entry.equipment.name}. Duration: ${durationHours.toFixed(2)} hours`);
    return updatedEntry;
  }

  /**
   * Get time tracking configuration for a site
   */
  async getTimeTrackingConfiguration(siteId: string): Promise<TimeTrackingConfiguration> {
    const config = await prisma.timeTrackingConfiguration.findUnique({
      where: { siteId }
    });

    if (!config) {
      // Create default configuration
      return await prisma.timeTrackingConfiguration.create({
        data: {
          siteId,
          createdBy: 'system', // In real implementation, use actual user ID
        }
      });
    }

    return config;
  }

  /**
   * Validate a time entry against business rules
   */
  async validateTimeEntry(timeEntry: LaborTimeEntry): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    // Check for reasonable duration
    if (timeEntry.duration && timeEntry.duration > 24) {
      result.errors.push('Time entry duration cannot exceed 24 hours');
      result.isValid = false;
    }

    if (timeEntry.duration && timeEntry.duration < 0) {
      result.errors.push('Time entry duration cannot be negative');
      result.isValid = false;
    }

    // Check for missing clock out
    if (timeEntry.status === TimeEntryStatus.ACTIVE && timeEntry.clockInTime) {
      const hoursActive = (new Date().getTime() - timeEntry.clockInTime.getTime()) / (1000 * 60 * 60);
      if (hoursActive > 16) {
        result.warnings.push('Time entry has been active for more than 16 hours');
      }
    }

    // Check for overlapping entries
    if (timeEntry.clockInTime && timeEntry.clockOutTime) {
      const overlapping = await prisma.laborTimeEntry.findMany({
        where: {
          userId: timeEntry.userId,
          id: { not: timeEntry.id },
          AND: [
            {
              clockInTime: {
                lt: timeEntry.clockOutTime
              }
            },
            {
              OR: [
                {
                  clockOutTime: {
                    gt: timeEntry.clockInTime
                  }
                },
                {
                  clockOutTime: null // Active entries
                }
              ]
            }
          ]
        }
      });

      if (overlapping.length > 0) {
        result.errors.push('Time entry overlaps with existing entries');
        result.isValid = false;
      }
    }

    return result;
  }

  /**
   * Calculate labor cost for a time entry
   */
  async calculateLaborCost(timeEntryId: string): Promise<number> {
    const entry = await prisma.laborTimeEntry.findUnique({
      where: { id: timeEntryId },
      include: { user: true }
    });

    if (!entry || !entry.duration) {
      return 0;
    }

    const rate = entry.laborRate || entry.user.laborRate || 0;
    return entry.duration * rate;
  }

  /**
   * Calculate machine cost for a machine time entry
   */
  async calculateMachineCost(machineTimeEntryId: string): Promise<number> {
    const entry = await prisma.machineTimeEntry.findUnique({
      where: { id: machineTimeEntryId }
    });

    if (!entry || !entry.duration || !entry.machineRate) {
      return 0;
    }

    return entry.duration * entry.machineRate;
  }

  /**
   * Get default labor rate for a personnel class
   */
  private async getDefaultLaborRate(personnelClassId?: string): Promise<number> {
    if (!personnelClassId) {
      return 25.0; // Default rate
    }

    // In a real implementation, this would look up rates by personnel class
    // For now, return a default
    return 25.0;
  }

  /**
   * Get time entries with filtering
   */
  async getTimeEntries(filters: {
    userId?: string;
    workOrderId?: string;
    operationId?: string;
    status?: TimeEntryStatus;
    startDate?: Date;
    endDate?: Date;
    timeType?: TimeType;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.workOrderId) where.workOrderId = filters.workOrderId;
    if (filters.operationId) where.operationId = filters.operationId;
    if (filters.status) where.status = filters.status;
    if (filters.timeType) where.timeType = filters.timeType;

    if (filters.startDate || filters.endDate) {
      where.clockInTime = {};
      if (filters.startDate) where.clockInTime.gte = filters.startDate;
      if (filters.endDate) where.clockInTime.lte = filters.endDate;
    }

    const [entries, total] = await Promise.all([
      prisma.laborTimeEntry.findMany({
        where,
        include: {
          user: true,
          workOrder: true,
          operation: true,
          indirectCode: true,
        },
        orderBy: {
          clockInTime: 'desc'
        },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.laborTimeEntry.count({ where })
    ]);

    return {
      entries,
      total,
      hasMore: (filters.offset || 0) + entries.length < total
    };
  }
}

export const timeTrackingService = new TimeTrackingService();