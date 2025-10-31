/**
 * Time Entry Approval Service
 * Service for managing supervisor approval workflows for time entry edits
 * Handles approval, rejection, escalation, and delegation workflows
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import {
  ApprovalStatus,
  TimeEntryApproval,
  TimeEntryEdit,
  TimeEntryBatch,
  TimeEntryBatchType,
  TimeEntryBatchStatus,
  User,
  UserRole,
  Permission,
} from '@prisma/client';
import prisma from '../lib/database';
import { timeEntryEditService } from './TimeEntryEditService';

export interface ApprovalRequest {
  timeEntryEditId: string;
  approverUserId: string;
  status: ApprovalStatus;
  approvalNotes?: string;
  delegateTo?: string;
  escalateTo?: string;
  conditions?: Record<string, any>;
}

export interface BulkApprovalRequest {
  timeEntryEditIds: string[];
  approverUserId: string;
  status: ApprovalStatus;
  approvalNotes?: string;
  batchName?: string;
}

export interface EscalationRequest {
  timeEntryEditId: string;
  fromUserId: string;
  toUserId: string;
  reason: string;
  notes?: string;
}

export interface DelegationRequest {
  fromUserId: string;
  toUserId: string;
  delegationType: 'TEMPORARY' | 'PERMANENT';
  expiryDate?: Date;
  scope?: {
    siteIds?: string[];
    userIds?: string[];
    maxAmount?: number;
  };
  reason: string;
}

export interface ApprovalWorkflowConfig {
  requireSecondApproval: boolean;
  secondApprovalThreshold?: number; // Dollar amount or hour threshold
  maxSingleApprovalHours: number;
  maxSingleApprovalAmount: number;
  autoEscalationHours: number;
  allowBulkApproval: boolean;
  maxBulkApprovalSize: number;
  requireApprovalNotes: boolean;
}

export interface ApprovalMetrics {
  pendingCount: number;
  averageApprovalTime: number;
  approvalRate: number; // Percentage approved vs rejected
  escalationRate: number;
  autoApprovalRate: number;
  oldestPendingDays: number;
  byApprover: Array<{
    approverId: string;
    approverName: string;
    pendingCount: number;
    avgTimeHours: number;
    approvalRate: number;
  }>;
}

export class TimeEntryApprovalService {
  /**
   * Process an approval decision (approve, reject, request more info)
   */
  async processApproval(request: ApprovalRequest): Promise<TimeEntryApproval> {
    // 1. Validate approval permissions
    await this.validateApprovalPermissions(request);

    // 2. Get the time entry edit
    const timeEntryEdit = await prisma.timeEntryEdit.findUnique({
      where: { id: request.timeEntryEditId },
      include: {
        editor: true,
        laborTimeEntry: {
          include: { user: true, workOrder: true }
        },
        machineTimeEntry: {
          include: { equipment: true, workOrder: true }
        },
        approvals: {
          include: { approver: true }
        }
      }
    });

    if (!timeEntryEdit) {
      throw new Error(`Time entry edit ${request.timeEntryEditId} not found`);
    }

    if (timeEntryEdit.approvalStatus !== ApprovalStatus.PENDING) {
      throw new Error(`Edit is not pending approval (current status: ${timeEntryEdit.approvalStatus})`);
    }

    // 3. Create approval record
    const approval = await prisma.timeEntryApproval.create({
      data: {
        timeEntryEditId: request.timeEntryEditId,
        approverUserId: request.approverUserId,
        status: request.status,
        approvalNotes: request.approvalNotes,
        conditions: request.conditions || {},
        reviewStartedAt: new Date(),
        reviewCompletedAt: new Date(),
      },
      include: {
        approver: true,
        timeEntryEdit: {
          include: {
            editor: true,
            laborTimeEntry: true,
            machineTimeEntry: true,
          }
        }
      }
    });

    // 4. Update time entry edit status
    const newStatus = this.determineNewEditStatus(request.status, timeEntryEdit);

    await prisma.timeEntryEdit.update({
      where: { id: request.timeEntryEditId },
      data: {
        approvalStatus: newStatus,
        approvedBy: request.status === ApprovalStatus.APPROVED ? request.approverUserId : null,
        approvedAt: request.status === ApprovalStatus.APPROVED ? new Date() : null,
        rejectionReason: request.status === ApprovalStatus.REJECTED ? request.approvalNotes : null,
      }
    });

    // 5. Handle post-approval actions
    await this.handlePostApprovalActions(approval, newStatus);

    console.log(
      `Approval processed: ${request.status} for edit ${request.timeEntryEditId} by ${request.approverUserId}`
    );

    return approval;
  }

  /**
   * Process bulk approval for multiple edits
   */
  async processBulkApproval(request: BulkApprovalRequest): Promise<TimeEntryBatch> {
    // 1. Validate bulk approval permissions
    await this.validateBulkApprovalPermissions(request);

    // 2. Create batch record
    const batch = await prisma.timeEntryBatch.create({
      data: {
        batchType: TimeEntryBatchType.APPROVAL,
        batchName: request.batchName || `Bulk ${request.status} - ${new Date().toISOString()}`,
        status: TimeEntryBatchStatus.PROCESSING,
        processedBy: request.approverUserId,
        totalItems: request.timeEntryEditIds.length,
        processedItems: 0,
        metadata: {
          approvalStatus: request.status,
          notes: request.approvalNotes,
        }
      }
    });

    // 3. Process each edit in the batch
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const editId of request.timeEntryEditIds) {
      try {
        const approval = await this.processApproval({
          timeEntryEditId: editId,
          approverUserId: request.approverUserId,
          status: request.status,
          approvalNotes: request.approvalNotes,
        });

        // Link approval to batch
        await prisma.timeEntryApproval.update({
          where: { id: approval.id },
          data: { batchId: batch.id }
        });

        results.push({ editId, success: true, approvalId: approval.id });
        successCount++;
      } catch (error) {
        results.push({ editId, success: false, error: (error as Error).message });
        errorCount++;
      }

      // Update batch progress
      await prisma.timeEntryBatch.update({
        where: { id: batch.id },
        data: {
          processedItems: successCount + errorCount,
        }
      });
    }

    // 4. Complete batch
    await prisma.timeEntryBatch.update({
      where: { id: batch.id },
      data: {
        status: errorCount > 0 ? TimeEntryBatchStatus.COMPLETED_WITH_ERRORS : TimeEntryBatchStatus.COMPLETED,
        completedAt: new Date(),
        results: results,
        successCount,
        errorCount,
      }
    });

    console.log(
      `Bulk approval completed: ${successCount} successful, ${errorCount} failed for batch ${batch.id}`
    );

    return await prisma.timeEntryBatch.findUnique({
      where: { id: batch.id },
      include: {
        processor: true,
      }
    })!;
  }

  /**
   * Escalate an approval to a higher authority
   */
  async escalateApproval(request: EscalationRequest): Promise<TimeEntryEdit> {
    // 1. Validate escalation permissions
    await this.validateEscalationPermissions(request);

    // 2. Get current edit
    const timeEntryEdit = await prisma.timeEntryEdit.findUnique({
      where: { id: request.timeEntryEditId },
      include: { approvals: true }
    });

    if (!timeEntryEdit) {
      throw new Error(`Time entry edit ${request.timeEntryEditId} not found`);
    }

    // 3. Create escalation approval record
    const escalationApproval = await prisma.timeEntryApproval.create({
      data: {
        timeEntryEditId: request.timeEntryEditId,
        approverUserId: request.fromUserId,
        status: ApprovalStatus.ESCALATED,
        approvalNotes: request.notes,
        escalatedTo: request.toUserId,
        escalationReason: request.reason,
      }
    });

    // 4. Update edit status
    await prisma.timeEntryEdit.update({
      where: { id: request.timeEntryEditId },
      data: {
        approvalStatus: ApprovalStatus.ESCALATED,
        escalatedTo: request.toUserId,
        escalatedAt: new Date(),
      }
    });

    // 5. Create notification for escalated approver
    await this.createApprovalNotification(request.toUserId, timeEntryEdit, 'ESCALATED');

    console.log(
      `Approval escalated: edit ${request.timeEntryEditId} from ${request.fromUserId} to ${request.toUserId}`
    );

    return await prisma.timeEntryEdit.findUnique({
      where: { id: request.timeEntryEditId },
      include: {
        editor: true,
        approvals: { include: { approver: true } }
      }
    })!;
  }

  /**
   * Delegate approval authority
   */
  async delegateApprovalAuthority(request: DelegationRequest): Promise<void> {
    // 1. Validate delegation permissions
    await this.validateDelegationPermissions(request);

    // 2. Create delegation record
    await prisma.approvalDelegation.create({
      data: {
        fromUserId: request.fromUserId,
        toUserId: request.toUserId,
        delegationType: request.delegationType,
        expiryDate: request.expiryDate,
        scope: request.scope || {},
        reason: request.reason,
        isActive: true,
      }
    });

    // 3. Create notification for delegate
    await this.createDelegationNotification(request.toUserId, request.fromUserId, request.delegationType);

    console.log(
      `Approval authority delegated: ${request.fromUserId} to ${request.toUserId} (${request.delegationType})`
    );
  }

  /**
   * Get pending approvals for a supervisor
   */
  async getPendingApprovalsForSupervisor(
    supervisorUserId: string,
    options: {
      siteId?: string;
      limit?: number;
      offset?: number;
      sortBy?: 'oldest' | 'newest' | 'priority';
      filters?: {
        editType?: string[];
        riskScore?: { min?: number; max?: number };
        amount?: { min?: number; max?: number };
      };
    } = {}
  ) {
    // 1. Check delegation - if user has delegated authority, include delegate's approvals
    const delegations = await this.getActiveDelegations(supervisorUserId);

    const supervisorIds = [supervisorUserId, ...delegations.map(d => d.fromUserId)];

    // 2. Build query conditions
    const where: any = {
      approvalStatus: {
        in: [ApprovalStatus.PENDING, ApprovalStatus.ESCALATED]
      },
      OR: [
        // Direct assignments
        {
          laborTimeEntry: {
            user: {
              userSiteRoles: {
                some: {
                  site: {
                    siteManagers: {
                      some: {
                        userId: { in: supervisorIds }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        // Escalated to this supervisor
        { escalatedTo: supervisorUserId }
      ]
    };

    // Apply filters
    if (options.siteId) {
      where.OR[0].laborTimeEntry.user.userSiteRoles.some.siteId = options.siteId;
    }

    if (options.filters?.editType) {
      where.editType = { in: options.filters.editType };
    }

    if (options.filters?.riskScore) {
      where.riskScore = {};
      if (options.filters.riskScore.min !== undefined) {
        where.riskScore.gte = options.filters.riskScore.min;
      }
      if (options.filters.riskScore.max !== undefined) {
        where.riskScore.lte = options.filters.riskScore.max;
      }
    }

    // 3. Execute query
    const [edits, total] = await Promise.all([
      prisma.timeEntryEdit.findMany({
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
            include: { approver: true },
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: this.getOrderByClause(options.sortBy),
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      prisma.timeEntryEdit.count({ where })
    ]);

    return {
      edits,
      total,
      hasMore: (options.offset || 0) + edits.length < total,
      delegations,
    };
  }

  /**
   * Get approval metrics and analytics
   */
  async getApprovalMetrics(
    supervisorUserId?: string,
    siteId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ApprovalMetrics> {
    const where: any = {};

    // Apply filters
    if (supervisorUserId) {
      where.approvals = {
        some: { approverUserId: supervisorUserId }
      };
    }

    if (siteId) {
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

    if (dateRange) {
      where.editedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Get metrics
    const [
      pendingCount,
      totalEdits,
      approvals,
      autoApprovedCount,
    ] = await Promise.all([
      prisma.timeEntryEdit.count({
        where: { ...where, approvalStatus: ApprovalStatus.PENDING }
      }),
      prisma.timeEntryEdit.count({ where }),
      prisma.timeEntryApproval.findMany({
        where: {
          timeEntryEdit: where,
          status: { in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] }
        },
        include: {
          approver: true,
          timeEntryEdit: true,
        }
      }),
      prisma.timeEntryEdit.count({
        where: { ...where, approvalStatus: ApprovalStatus.AUTO_APPROVED }
      }),
    ]);

    // Calculate metrics
    const approvedCount = approvals.filter(a => a.status === ApprovalStatus.APPROVED).length;
    const rejectedCount = approvals.filter(a => a.status === ApprovalStatus.REJECTED).length;
    const escalatedCount = approvals.filter(a => a.status === ApprovalStatus.ESCALATED).length;

    const approvalTimes = approvals
      .filter(a => a.reviewCompletedAt && a.reviewStartedAt)
      .map(a => (a.reviewCompletedAt!.getTime() - a.reviewStartedAt!.getTime()) / (1000 * 60 * 60));

    const averageApprovalTime = approvalTimes.length > 0
      ? approvalTimes.reduce((sum, time) => sum + time, 0) / approvalTimes.length
      : 0;

    // Get oldest pending
    const oldestPending = await prisma.timeEntryEdit.findFirst({
      where: { ...where, approvalStatus: ApprovalStatus.PENDING },
      orderBy: { editedAt: 'asc' }
    });

    const oldestPendingDays = oldestPending
      ? (new Date().getTime() - oldestPending.editedAt.getTime()) / (1000 * 60 * 60 * 24)
      : 0;

    // Group by approver
    const approverMetrics = new Map();
    for (const approval of approvals) {
      const approverId = approval.approverUserId;
      if (!approverMetrics.has(approverId)) {
        approverMetrics.set(approverId, {
          approverId,
          approverName: approval.approver.firstName + ' ' + approval.approver.lastName,
          approvals: [],
          pending: 0,
        });
      }
      approverMetrics.get(approverId).approvals.push(approval);
    }

    const byApprover = Array.from(approverMetrics.values()).map(metric => {
      const approved = metric.approvals.filter((a: any) => a.status === ApprovalStatus.APPROVED).length;
      const total = metric.approvals.length;
      const times = metric.approvals
        .filter((a: any) => a.reviewCompletedAt && a.reviewStartedAt)
        .map((a: any) => (a.reviewCompletedAt.getTime() - a.reviewStartedAt.getTime()) / (1000 * 60 * 60));

      return {
        approverId: metric.approverId,
        approverName: metric.approverName,
        pendingCount: metric.pending,
        avgTimeHours: times.length > 0 ? times.reduce((sum: number, time: number) => sum + time, 0) / times.length : 0,
        approvalRate: total > 0 ? approved / total : 0,
      };
    });

    return {
      pendingCount,
      averageApprovalTime,
      approvalRate: (approvedCount + rejectedCount) > 0 ? approvedCount / (approvedCount + rejectedCount) : 0,
      escalationRate: totalEdits > 0 ? escalatedCount / totalEdits : 0,
      autoApprovalRate: totalEdits > 0 ? autoApprovedCount / totalEdits : 0,
      oldestPendingDays,
      byApprover,
    };
  }

  /**
   * Private helper methods
   */
  private async validateApprovalPermissions(request: ApprovalRequest): Promise<void> {
    // Check if user has approval permissions
    const user = await prisma.user.findUnique({
      where: { id: request.approverUserId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      throw new Error(`Approver ${request.approverUserId} not found`);
    }

    const hasApprovalPermission = user.userRoles.some(ur =>
      ur.role.rolePermissions.some(rp =>
        rp.permission.name === 'TIME_ENTRY_APPROVAL' || rp.permission.name === 'SUPERVISOR'
      )
    );

    if (!hasApprovalPermission) {
      throw new Error(`User ${request.approverUserId} does not have approval permissions`);
    }
  }

  private async validateBulkApprovalPermissions(request: BulkApprovalRequest): Promise<void> {
    await this.validateApprovalPermissions({
      timeEntryEditId: request.timeEntryEditIds[0],
      approverUserId: request.approverUserId,
      status: request.status,
    });

    // Check bulk approval limits
    const config = await this.getApprovalWorkflowConfig();
    if (!config.allowBulkApproval) {
      throw new Error('Bulk approval is not enabled');
    }

    if (request.timeEntryEditIds.length > config.maxBulkApprovalSize) {
      throw new Error(`Bulk approval size exceeds limit of ${config.maxBulkApprovalSize}`);
    }
  }

  private async validateEscalationPermissions(request: EscalationRequest): Promise<void> {
    // Validate that toUser has higher authority
    const [fromUser, toUser] = await Promise.all([
      prisma.user.findUnique({
        where: { id: request.fromUserId },
        include: { userRoles: { include: { role: true } } }
      }),
      prisma.user.findUnique({
        where: { id: request.toUserId },
        include: { userRoles: { include: { role: true } } }
      })
    ]);

    if (!fromUser || !toUser) {
      throw new Error('Invalid user IDs for escalation');
    }

    // Simple check - in real implementation, would check role hierarchy
    const hasEscalationPermission = fromUser.userRoles.some(ur =>
      ['SUPERVISOR', 'MANAGER'].includes(ur.role.name)
    );

    if (!hasEscalationPermission) {
      throw new Error('User does not have escalation permissions');
    }
  }

  private async validateDelegationPermissions(request: DelegationRequest): Promise<void> {
    // Validate delegation permissions - simplified implementation
    const fromUser = await prisma.user.findUnique({
      where: { id: request.fromUserId },
      include: { userRoles: { include: { role: true } } }
    });

    if (!fromUser) {
      throw new Error('Delegating user not found');
    }

    const canDelegate = fromUser.userRoles.some(ur =>
      ['SUPERVISOR', 'MANAGER', 'ADMIN'].includes(ur.role.name)
    );

    if (!canDelegate) {
      throw new Error('User does not have delegation permissions');
    }
  }

  private determineNewEditStatus(approvalStatus: ApprovalStatus, timeEntryEdit: TimeEntryEdit): ApprovalStatus {
    switch (approvalStatus) {
      case ApprovalStatus.APPROVED:
        return ApprovalStatus.APPROVED;
      case ApprovalStatus.REJECTED:
        return ApprovalStatus.REJECTED;
      case ApprovalStatus.MORE_INFO_NEEDED:
        return ApprovalStatus.MORE_INFO_NEEDED;
      case ApprovalStatus.ESCALATED:
        return ApprovalStatus.ESCALATED;
      default:
        return ApprovalStatus.PENDING;
    }
  }

  private async handlePostApprovalActions(approval: TimeEntryApproval, newStatus: ApprovalStatus): Promise<void> {
    if (newStatus === ApprovalStatus.APPROVED) {
      // Apply the edit to the time entry
      await timeEntryEditService.applyEdit(approval.timeEntryEditId);

      // Create notification for edit creator
      await this.createApprovalNotification(
        approval.timeEntryEdit.editedBy,
        approval.timeEntryEdit,
        'APPROVED'
      );
    } else if (newStatus === ApprovalStatus.REJECTED) {
      // Create notification for edit creator
      await this.createApprovalNotification(
        approval.timeEntryEdit.editedBy,
        approval.timeEntryEdit,
        'REJECTED'
      );
    }
  }

  private async getActiveDelegations(userId: string) {
    return await prisma.approvalDelegation.findMany({
      where: {
        toUserId: userId,
        isActive: true,
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: new Date() } }
        ]
      },
      include: {
        fromUser: true,
        toUser: true,
      }
    });
  }

  private getOrderByClause(sortBy?: string) {
    switch (sortBy) {
      case 'oldest':
        return { editedAt: 'asc' as const };
      case 'newest':
        return { editedAt: 'desc' as const };
      case 'priority':
        return { riskScore: 'desc' as const };
      default:
        return { editedAt: 'asc' as const };
    }
  }

  private async getApprovalWorkflowConfig(): Promise<ApprovalWorkflowConfig> {
    // In real implementation, this would come from site configuration
    return {
      requireSecondApproval: false,
      secondApprovalThreshold: 1000,
      maxSingleApprovalHours: 40,
      maxSingleApprovalAmount: 5000,
      autoEscalationHours: 72,
      allowBulkApproval: true,
      maxBulkApprovalSize: 50,
      requireApprovalNotes: false,
    };
  }

  private async createApprovalNotification(
    userId: string,
    timeEntryEdit: TimeEntryEdit,
    type: 'APPROVED' | 'REJECTED' | 'ESCALATED'
  ): Promise<void> {
    // Create notification - simplified implementation
    console.log(`Creating ${type} notification for user ${userId} regarding edit ${timeEntryEdit.id}`);

    // In real implementation, this would integrate with a notification service
    // await notificationService.create({
    //   userId,
    //   type: `TIME_ENTRY_${type}`,
    //   title: `Time Entry ${type}`,
    //   message: `Your time entry edit has been ${type.toLowerCase()}`,
    //   data: { editId: timeEntryEdit.id }
    // });
  }

  private async createDelegationNotification(
    toUserId: string,
    fromUserId: string,
    delegationType: string
  ): Promise<void> {
    console.log(`Creating delegation notification: ${fromUserId} delegated ${delegationType} authority to ${toUserId}`);
  }
}

export const timeEntryApprovalService = new TimeEntryApprovalService();