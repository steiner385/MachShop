/**
 * Time Entry Edit Service
 * Service for managing time entry modifications, validations, and approvals
 * Implements auto-approval logic and business rule validation
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import {
  TimeEntryType,
  EditType,
  EditReasonCategory,
  ApprovalStatus,
  TimeEntryStatus,
  TimeEntryEdit,
  TimeEntryApproval,
  LaborTimeEntry,
  MachineTimeEntry,
  TimeTrackingConfiguration,
  User,
} from '@prisma/client';
import prisma from '../lib/database';
import { timeTrackingService } from './TimeTrackingService';

export interface TimeEntryEditRequest {
  timeEntryId: string;
  timeEntryType: TimeEntryType;
  editType: EditType;
  originalValues: Record<string, any>;
  newValues: Record<string, any>;
  changedFields: string[];
  reason: string;
  reasonCategory: EditReasonCategory;
  editedBy: string;
  entrySource?: string;
  deviceId?: string;
}

export interface AutoApprovalEvaluation {
  shouldAutoApprove: boolean;
  reason: string;
  riskScore: number;
  appliedRules: string[];
  requiresManualApproval?: string[];
}

export interface TimeEntryEditValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  businessRuleViolations: string[];
  autoApprovalEvaluation: AutoApprovalEvaluation;
}

export interface BulkEditRequest {
  timeEntryIds: string[];
  timeEntryType: TimeEntryType;
  editType: EditType;
  newValues: Record<string, any>;
  reason: string;
  reasonCategory: EditReasonCategory;
  editedBy: string;
}

export interface SplitTimeEntryRequest {
  timeEntryId: string;
  timeEntryType: TimeEntryType;
  splitPoints: Array<{
    endTime: Date;
    workOrderId?: string;
    operationId?: string;
    indirectCodeId?: string;
  }>;
  reason: string;
  editedBy: string;
}

export interface MergeTimeEntriesRequest {
  timeEntryIds: string[];
  timeEntryType: TimeEntryType;
  targetWorkOrderId?: string;
  targetOperationId?: string;
  targetIndirectCodeId?: string;
  reason: string;
  editedBy: string;
}

export class TimeEntryEditService {
  /**
   * Create a time entry edit with validation and auto-approval evaluation
   */
  async createEdit(request: TimeEntryEditRequest): Promise<TimeEntryEdit> {
    // 1. Validate the edit request
    const validation = await this.validateEdit(request);
    if (!validation.isValid) {
      throw new Error(`Edit validation failed: ${validation.errors.join(', ')}`);
    }

    // 2. Get site configuration for approval rules
    const siteConfig = await this.getSiteConfigurationForTimeEntry(
      request.timeEntryId,
      request.timeEntryType
    );

    // 3. Determine if approval is required
    const requiresApproval = this.shouldRequireApproval(validation.autoApprovalEvaluation, siteConfig);

    // 4. Create the edit record
    const timeEntryEdit = await prisma.timeEntryEdit.create({
      data: {
        timeEntryId: request.timeEntryId,
        timeEntryType: request.timeEntryType,
        editType: request.editType,
        originalValues: request.originalValues,
        newValues: request.newValues,
        changedFields: request.changedFields,
        reason: request.reason,
        reasonCategory: request.reasonCategory,
        editedBy: request.editedBy,
        entrySource: request.entrySource || 'MANUAL',
        deviceId: request.deviceId,
        approvalRequired: requiresApproval,
        approvalStatus: validation.autoApprovalEvaluation.shouldAutoApprove
          ? ApprovalStatus.AUTO_APPROVED
          : requiresApproval
          ? ApprovalStatus.PENDING
          : ApprovalStatus.APPROVED,
        autoApproved: validation.autoApprovalEvaluation.shouldAutoApprove,
        riskScore: validation.autoApprovalEvaluation.riskScore,
        autoApprovalReason: validation.autoApprovalEvaluation.shouldAutoApprove
          ? validation.autoApprovalEvaluation.reason
          : null,
        appliedAt: validation.autoApprovalEvaluation.shouldAutoApprove ? new Date() : null,
      },
      include: {
        editor: true,
        approvals: true,
      },
    });

    // 5. If auto-approved, apply the changes immediately
    if (validation.autoApprovalEvaluation.shouldAutoApprove) {
      await this.applyEdit(timeEntryEdit.id);
    }

    console.log(
      `Time entry edit created: ${timeEntryEdit.id} for entry ${request.timeEntryId}. ` +
        `Auto-approved: ${validation.autoApprovalEvaluation.shouldAutoApprove}`
    );

    return timeEntryEdit;
  }

  /**
   * Validate a time entry edit against business rules
   */
  async validateEdit(request: TimeEntryEditRequest): Promise<TimeEntryEditValidationResult> {
    const result: TimeEntryEditValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      businessRuleViolations: [],
      autoApprovalEvaluation: {
        shouldAutoApprove: false,
        reason: '',
        riskScore: 0,
        appliedRules: [],
      },
    };

    // 1. Get the original time entry
    const originalEntry = await this.getTimeEntry(request.timeEntryId, request.timeEntryType);
    if (!originalEntry) {
      result.errors.push(`Time entry ${request.timeEntryId} not found`);
      result.isValid = false;
      return result;
    }

    // 2. Validate edit permissions
    await this.validateEditPermissions(request, originalEntry, result);

    // 3. Validate business rules
    await this.validateBusinessRules(request, originalEntry, result);

    // 4. Evaluate auto-approval eligibility
    if (result.isValid) {
      result.autoApprovalEvaluation = await this.evaluateAutoApproval(request, originalEntry);
    }

    return result;
  }

  /**
   * Apply an approved edit to the time entry
   */
  async applyEdit(editId: string): Promise<void> {
    const edit = await prisma.timeEntryEdit.findUnique({
      where: { id: editId },
      include: {
        laborTimeEntry: true,
        machineTimeEntry: true,
      },
    });

    if (!edit) {
      throw new Error(`Time entry edit ${editId} not found`);
    }

    if (edit.approvalStatus !== ApprovalStatus.APPROVED && edit.approvalStatus !== ApprovalStatus.AUTO_APPROVED) {
      throw new Error(`Edit ${editId} is not approved for application`);
    }

    // Apply changes based on time entry type
    if (edit.timeEntryType === TimeEntryType.LABOR) {
      await this.applyLaborTimeEdit(edit);
    } else if (edit.timeEntryType === TimeEntryType.MACHINE) {
      await this.applyMachineTimeEdit(edit);
    }

    // Mark edit as applied
    await prisma.timeEntryEdit.update({
      where: { id: editId },
      data: {
        appliedAt: new Date(),
        appliedBy: edit.approvedBy || 'SYSTEM',
      },
    });

    console.log(`Applied time entry edit ${editId} to entry ${edit.timeEntryId}`);
  }

  /**
   * Split a time entry into multiple entries
   */
  async splitTimeEntry(request: SplitTimeEntryRequest): Promise<TimeEntryEdit[]> {
    const originalEntry = await this.getTimeEntry(request.timeEntryId, request.timeEntryType);
    if (!originalEntry) {
      throw new Error(`Time entry ${request.timeEntryId} not found`);
    }

    const edits: TimeEntryEdit[] = [];

    // Create edit for original entry modification
    const originalEdit = await this.createEdit({
      timeEntryId: request.timeEntryId,
      timeEntryType: request.timeEntryType,
      editType: EditType.SPLIT,
      originalValues: this.extractTimeEntryValues(originalEntry),
      newValues: { status: 'SPLIT_PARENT' },
      changedFields: ['status'],
      reason: request.reason,
      reasonCategory: EditReasonCategory.TIME_CORRECTION,
      editedBy: request.editedBy,
    });

    edits.push(originalEdit);

    // Create new time entries for each split
    for (let i = 0; i < request.splitPoints.length; i++) {
      const splitPoint = request.splitPoints[i];
      const startTime = i === 0
        ? (originalEntry as any).clockInTime || (originalEntry as any).startTime
        : request.splitPoints[i - 1].endTime;

      const newEntryData = {
        ...this.extractTimeEntryValues(originalEntry),
        clockInTime: startTime,
        clockOutTime: splitPoint.endTime,
        workOrderId: splitPoint.workOrderId || (originalEntry as any).workOrderId,
        operationId: splitPoint.operationId || (originalEntry as any).operationId,
        indirectCodeId: splitPoint.indirectCodeId || (originalEntry as any).indirectCodeId,
      };

      // This would create new entries - for now, create edit records
      const splitEdit = await this.createEdit({
        timeEntryId: request.timeEntryId,
        timeEntryType: request.timeEntryType,
        editType: EditType.SPLIT,
        originalValues: this.extractTimeEntryValues(originalEntry),
        newValues: newEntryData,
        changedFields: Object.keys(newEntryData),
        reason: `Split entry ${i + 1}: ${request.reason}`,
        reasonCategory: EditReasonCategory.TIME_CORRECTION,
        editedBy: request.editedBy,
      });

      edits.push(splitEdit);
    }

    return edits;
  }

  /**
   * Merge multiple time entries into one
   */
  async mergeTimeEntries(request: MergeTimeEntriesRequest): Promise<TimeEntryEdit[]> {
    const entries = await Promise.all(
      request.timeEntryIds.map(id => this.getTimeEntry(id, request.timeEntryType))
    );

    const validEntries = entries.filter(entry => entry !== null);
    if (validEntries.length !== request.timeEntryIds.length) {
      throw new Error('Some time entries were not found');
    }

    const edits: TimeEntryEdit[] = [];

    // Create merge edit for each entry
    for (const entry of validEntries) {
      const edit = await this.createEdit({
        timeEntryId: (entry as any).id,
        timeEntryType: request.timeEntryType,
        editType: EditType.MERGED,
        originalValues: this.extractTimeEntryValues(entry),
        newValues: {
          workOrderId: request.targetWorkOrderId,
          operationId: request.targetOperationId,
          indirectCodeId: request.targetIndirectCodeId,
          status: 'MERGED',
        },
        changedFields: ['workOrderId', 'operationId', 'indirectCodeId', 'status'],
        reason: request.reason,
        reasonCategory: EditReasonCategory.WORK_ORDER_CORRECTION,
        editedBy: request.editedBy,
      });

      edits.push(edit);
    }

    return edits;
  }

  /**
   * Get time entries pending approval for a supervisor
   */
  async getPendingApprovals(supervisorUserId: string, siteId?: string) {
    const where: any = {
      approvalStatus: ApprovalStatus.PENDING,
    };

    if (siteId) {
      // Add site filtering through time entry relations
      where.OR = [
        {
          laborTimeEntry: {
            user: {
              userSiteRoles: {
                some: { siteId }
              }
            }
          }
        },
        {
          machineTimeEntry: {
            equipment: { siteId }
          }
        }
      ];
    }

    return await prisma.timeEntryEdit.findMany({
      where,
      include: {
        editor: true,
        laborTimeEntry: {
          include: {
            user: true,
            workOrder: true,
            operation: true,
            indirectCode: true,
          }
        },
        machineTimeEntry: {
          include: {
            equipment: true,
            workOrder: true,
            operation: true,
          }
        },
        approvals: {
          include: {
            approver: true,
          }
        }
      },
      orderBy: {
        editedAt: 'asc'
      }
    });
  }

  /**
   * Evaluate auto-approval eligibility for an edit
   */
  private async evaluateAutoApproval(
    request: TimeEntryEditRequest,
    originalEntry: any
  ): Promise<AutoApprovalEvaluation> {
    const evaluation: AutoApprovalEvaluation = {
      shouldAutoApprove: false,
      reason: '',
      riskScore: 0,
      appliedRules: [],
      requiresManualApproval: [],
    };

    // Get site configuration
    const siteConfig = await this.getSiteConfigurationForTimeEntry(
      request.timeEntryId,
      request.timeEntryType
    );

    if (!siteConfig.enableAutoApproval) {
      evaluation.reason = 'Auto-approval disabled for site';
      return evaluation;
    }

    let riskScore = 0;
    const appliedRules: string[] = [];

    // Rule 1: Small time adjustments (< X minutes)
    if (this.isSmallTimeAdjustment(request, originalEntry, siteConfig)) {
      riskScore += 1;
      appliedRules.push('SMALL_TIME_ADJUSTMENT');
    } else {
      riskScore += 5;
    }

    // Rule 2: Recent edits (within X hours)
    if (this.isRecentTimeEntry(originalEntry, siteConfig)) {
      riskScore += 1;
      appliedRules.push('RECENT_ENTRY');
    } else {
      riskScore += 3;
    }

    // Rule 3: Same-day edits
    if (this.isSameDayEdit(originalEntry)) {
      riskScore += 1;
      appliedRules.push('SAME_DAY_EDIT');
    } else {
      riskScore += 4;
    }

    // Rule 4: Low-impact edit types
    if (this.isLowImpactEditType(request.editType)) {
      riskScore += 1;
      appliedRules.push('LOW_IMPACT_TYPE');
    } else {
      riskScore += 3;
    }

    // Rule 5: Editor is entry owner
    if (this.isOwnerEdit(request, originalEntry)) {
      riskScore += 1;
      appliedRules.push('OWNER_EDIT');
    } else {
      riskScore += 2;
    }

    // Auto-approve if risk score is below threshold
    evaluation.shouldAutoApprove = riskScore <= (siteConfig.autoApprovalRiskThreshold || 10);
    evaluation.riskScore = riskScore;
    evaluation.appliedRules = appliedRules;

    if (evaluation.shouldAutoApprove) {
      evaluation.reason = `Auto-approved: Low risk score (${riskScore}). Rules: ${appliedRules.join(', ')}`;
    } else {
      evaluation.reason = `Manual approval required: High risk score (${riskScore})`;
      evaluation.requiresManualApproval = [
        `Risk score ${riskScore} exceeds threshold ${siteConfig.autoApprovalRiskThreshold || 10}`
      ];
    }

    return evaluation;
  }

  /**
   * Validate edit permissions
   */
  private async validateEditPermissions(
    request: TimeEntryEditRequest,
    originalEntry: any,
    result: TimeEntryEditValidationResult
  ): Promise<void> {
    // Check if entry is locked
    const isLocked = await this.isTimeEntryLocked(request.timeEntryId, request.timeEntryType);
    if (isLocked) {
      result.errors.push('Time entry is locked and cannot be edited');
      result.isValid = false;
    }

    // Check if entry is already completed and locked by time
    const siteConfig = await this.getSiteConfigurationForTimeEntry(
      request.timeEntryId,
      request.timeEntryType
    );

    if (siteConfig.lockAfterHours && originalEntry.clockOutTime) {
      const hoursElapsed = (new Date().getTime() - originalEntry.clockOutTime.getTime()) / (1000 * 60 * 60);
      if (hoursElapsed > siteConfig.lockAfterHours) {
        result.errors.push(`Time entry is locked: ${siteConfig.lockAfterHours} hours have elapsed since completion`);
        result.isValid = false;
      }
    }
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    request: TimeEntryEditRequest,
    originalEntry: any,
    result: TimeEntryEditValidationResult
  ): Promise<void> {
    // Validate time changes don't create negative duration
    if (request.changedFields.includes('clockInTime') || request.changedFields.includes('clockOutTime')) {
      const newClockIn = request.newValues.clockInTime ? new Date(request.newValues.clockInTime) : originalEntry.clockInTime;
      const newClockOut = request.newValues.clockOutTime ? new Date(request.newValues.clockOutTime) : originalEntry.clockOutTime;

      if (newClockIn && newClockOut && newClockIn >= newClockOut) {
        result.errors.push('Clock out time must be after clock in time');
        result.isValid = false;
      }
    }

    // Validate duration limits
    if (request.changedFields.includes('duration')) {
      const newDuration = request.newValues.duration;
      if (newDuration < 0) {
        result.errors.push('Duration cannot be negative');
        result.isValid = false;
      }
      if (newDuration > 24) {
        result.businessRuleViolations.push('Duration exceeds 24 hours');
      }
    }

    // Check for overlapping entries
    if (request.changedFields.includes('clockInTime') || request.changedFields.includes('clockOutTime')) {
      const hasOverlap = await this.checkForOverlappingEntries(request, originalEntry);
      if (hasOverlap) {
        result.businessRuleViolations.push('Edit would create overlapping time entries');
      }
    }
  }

  /**
   * Helper methods for auto-approval rules
   */
  private isSmallTimeAdjustment(request: TimeEntryEditRequest, originalEntry: any, config: any): boolean {
    const threshold = config.smallAdjustmentMinutes || 15; // 15 minutes default

    if (request.changedFields.includes('duration')) {
      const originalDuration = originalEntry.duration || 0;
      const newDuration = request.newValues.duration || 0;
      const differenceMinutes = Math.abs(originalDuration - newDuration) * 60;
      return differenceMinutes <= threshold;
    }

    return false;
  }

  private isRecentTimeEntry(originalEntry: any, config: any): boolean {
    const threshold = config.recentEditHours || 24; // 24 hours default
    const entryTime = originalEntry.clockInTime || originalEntry.startTime;
    const hoursAgo = (new Date().getTime() - entryTime.getTime()) / (1000 * 60 * 60);
    return hoursAgo <= threshold;
  }

  private isSameDayEdit(originalEntry: any): boolean {
    const entryTime = originalEntry.clockInTime || originalEntry.startTime;
    const today = new Date();
    const entryDate = new Date(entryTime);

    return (
      today.getFullYear() === entryDate.getFullYear() &&
      today.getMonth() === entryDate.getMonth() &&
      today.getDate() === entryDate.getDate()
    );
  }

  private isLowImpactEditType(editType: EditType): boolean {
    const lowImpactTypes = [EditType.MODIFIED];
    return lowImpactTypes.includes(editType);
  }

  private isOwnerEdit(request: TimeEntryEditRequest, originalEntry: any): boolean {
    return originalEntry.userId === request.editedBy;
  }

  /**
   * Utility methods
   */
  private async getTimeEntry(timeEntryId: string, timeEntryType: TimeEntryType) {
    if (timeEntryType === TimeEntryType.LABOR) {
      return await prisma.laborTimeEntry.findUnique({
        where: { id: timeEntryId },
        include: { user: true, workOrder: true, operation: true, indirectCode: true }
      });
    } else {
      return await prisma.machineTimeEntry.findUnique({
        where: { id: timeEntryId },
        include: { equipment: true, workOrder: true, operation: true }
      });
    }
  }

  private async getSiteConfigurationForTimeEntry(
    timeEntryId: string,
    timeEntryType: TimeEntryType
  ): Promise<TimeTrackingConfiguration> {
    const timeEntry = await this.getTimeEntry(timeEntryId, timeEntryType);
    if (!timeEntry) {
      throw new Error(`Time entry ${timeEntryId} not found`);
    }

    let siteId: string;
    if (timeEntryType === TimeEntryType.LABOR) {
      // Get site from user's site roles
      const userWithSite = await prisma.user.findUnique({
        where: { id: (timeEntry as any).userId },
        include: { userSiteRoles: { include: { site: true } } }
      });
      siteId = userWithSite?.userSiteRoles[0]?.site?.id!;
    } else {
      // Get site from equipment
      const equipment = await prisma.equipment.findUnique({
        where: { id: (timeEntry as any).equipmentId },
        select: { siteId: true }
      });
      siteId = equipment?.siteId!;
    }

    return await timeTrackingService.getTimeTrackingConfiguration(siteId);
  }

  private extractTimeEntryValues(entry: any): Record<string, any> {
    const commonFields = {
      clockInTime: entry.clockInTime || entry.startTime,
      clockOutTime: entry.clockOutTime || entry.endTime,
      duration: entry.duration,
      workOrderId: entry.workOrderId,
      operationId: entry.operationId,
      status: entry.status,
    };

    if (entry.userId) {
      return {
        ...commonFields,
        userId: entry.userId,
        indirectCodeId: entry.indirectCodeId,
        laborRate: entry.laborRate,
        laborCost: entry.laborCost,
      };
    } else {
      return {
        ...commonFields,
        equipmentId: entry.equipmentId,
        machineRate: entry.machineRate,
        machineCost: entry.machineCost,
      };
    }
  }

  private shouldRequireApproval(
    autoApprovalEvaluation: AutoApprovalEvaluation,
    siteConfig: TimeTrackingConfiguration
  ): boolean {
    return siteConfig.requireTimeApproval && !autoApprovalEvaluation.shouldAutoApprove;
  }

  private async isTimeEntryLocked(timeEntryId: string, timeEntryType: TimeEntryType): Promise<boolean> {
    const lock = await prisma.timeEntryLock.findFirst({
      where: {
        timeEntryId,
        timeEntryType,
        isActive: true,
      }
    });

    return !!lock;
  }

  private async checkForOverlappingEntries(
    request: TimeEntryEditRequest,
    originalEntry: any
  ): Promise<boolean> {
    // Implementation would check for overlapping time entries
    // This is a simplified version
    return false;
  }

  private async applyLaborTimeEdit(edit: TimeEntryEdit): Promise<void> {
    const updateData: any = {};

    for (const field of edit.changedFields) {
      if (edit.newValues.hasOwnProperty(field)) {
        updateData[field] = edit.newValues[field];
      }
    }

    // Recalculate cost if duration or rate changed
    if (edit.changedFields.includes('duration') || edit.changedFields.includes('laborRate')) {
      const entry = await prisma.laborTimeEntry.findUnique({
        where: { id: edit.timeEntryId }
      });

      if (entry) {
        const newDuration = updateData.duration || entry.duration;
        const newRate = updateData.laborRate || entry.laborRate;
        updateData.laborCost = (newDuration || 0) * (newRate || 0);
      }
    }

    await prisma.laborTimeEntry.update({
      where: { id: edit.timeEntryId },
      data: {
        ...updateData,
        editReason: edit.reason,
        editedAt: new Date(),
        editedBy: edit.editedBy,
      }
    });
  }

  private async applyMachineTimeEdit(edit: TimeEntryEdit): Promise<void> {
    const updateData: any = {};

    for (const field of edit.changedFields) {
      if (edit.newValues.hasOwnProperty(field)) {
        updateData[field] = edit.newValues[field];
      }
    }

    // Recalculate cost if duration or rate changed
    if (edit.changedFields.includes('duration') || edit.changedFields.includes('machineRate')) {
      const entry = await prisma.machineTimeEntry.findUnique({
        where: { id: edit.timeEntryId }
      });

      if (entry) {
        const newDuration = updateData.duration || entry.duration;
        const newRate = updateData.machineRate || entry.machineRate;
        updateData.machineCost = (newDuration || 0) * (newRate || 0);
      }
    }

    await prisma.machineTimeEntry.update({
      where: { id: edit.timeEntryId },
      data: updateData
    });
  }
}

export const timeEntryEditService = new TimeEntryEditService();