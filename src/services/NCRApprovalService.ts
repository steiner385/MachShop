/**
 * NCR Approval Service
 *
 * Manages approval request workflow for NCR state transitions, dispositions,
 * CTP authorizations, and MRB decisions (Issue #55).
 *
 * @module services/NCRApprovalService
 * @see GitHub Issue #55: Enhanced NCR Workflow States & Disposition Management
 */

import { PrismaClient, NCRApprovalStatus, NCRApprovalRequestType } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Approval request with full context
 */
export interface ApprovalRequestContext {
  id: string;
  ncrId: string;
  ncrNumber: string;
  requestType: NCRApprovalRequestType;
  requestedBy: string;
  requestedByName?: string;
  requestedAt: Date;
  approverUserId: string;
  approverName?: string;
  status: NCRApprovalStatus;
  approvalNotes?: string;
  approvedAt?: Date;
  dueDate?: Date;
  escalated: boolean;
  escalatedAt?: Date;
  daysOverdue?: number;
}

/**
 * Approval decision
 */
export interface ApprovalDecision {
  approvalRequestId: string;
  approved: boolean;
  decision: NCRApprovalStatus;
  approvalNotes: string;
  approvedBy: string;
  decidedAt: Date;
}

/**
 * NCR Approval Service
 */
export class NCRApprovalService {
  private static readonly APPROVAL_DUE_DAYS = 2; // Default 2-day approval window
  private static readonly ESCALATION_HOURS = 24; // Escalate if no response in 24 hours

  /**
   * Create approval request
   *
   * @param ncrId - NCR ID
   * @param requestType - Type of approval request
   * @param requestedBy - User ID who requested approval
   * @param approverUserId - User ID of approver
   * @param approvalNotes - Notes/justification for approval
   * @returns Created approval request
   */
  async createApprovalRequest(
    ncrId: string,
    requestType: NCRApprovalRequestType,
    requestedBy: string,
    approverUserId: string,
    approvalNotes?: string
  ): Promise<ApprovalRequestContext> {
    try {
      const ncr = await prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        throw new Error(`NCR not found: ${ncrId}`);
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + NCRApprovalService.APPROVAL_DUE_DAYS);

      const approvalRequest = await prisma.nCRApprovalRequest.create({
        data: {
          ncrId,
          requestType,
          requestedBy,
          requestedAt: new Date(),
          approverUserId,
          status: 'PENDING' as any,
          approvalNotes: approvalNotes || `${requestType} approval request for NCR ${ncr.ncrNumber}`,
          dueDate,
        },
      });

      logger.info('Approval request created', {
        approvalRequestId: approvalRequest.id,
        ncrId,
        requestType,
        approverUserId,
      });

      return this.mapToContext(approvalRequest, ncr);
    } catch (error) {
      logger.error('Failed to create approval request', { error });
      throw error;
    }
  }

  /**
   * Get pending approvals for user
   *
   * @param userId - Approver user ID
   * @param limit - Maximum number to return
   * @returns Array of pending approval requests
   */
  async getPendingApprovalsForUser(userId: string, limit: number = 50): Promise<ApprovalRequestContext[]> {
    try {
      const approvalRequests = await prisma.nCRApprovalRequest.findMany({
        where: {
          approverUserId: userId,
          status: 'PENDING' as any,
        },
        include: {
          ncr: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: limit,
      });

      return approvalRequests.map(req => this.mapToContext(req, req.ncr));
    } catch (error) {
      logger.error('Failed to get pending approvals', { error });
      throw error;
    }
  }

  /**
   * Get all pending approvals (admin view)
   *
   * @param limit - Maximum number to return
   * @returns Array of all pending approval requests
   */
  async getAllPendingApprovals(limit: number = 100): Promise<ApprovalRequestContext[]> {
    try {
      const approvalRequests = await prisma.nCRApprovalRequest.findMany({
        where: {
          status: 'PENDING' as any,
        },
        include: {
          ncr: true,
        },
        orderBy: {
          dueDate: 'asc',
        },
        take: limit,
      });

      return approvalRequests.map(req => this.mapToContext(req, req.ncr));
    } catch (error) {
      logger.error('Failed to get all pending approvals', { error });
      throw error;
    }
  }

  /**
   * Approve request
   *
   * @param approvalRequestId - Approval request ID
   * @param approvedBy - User ID who approved
   * @param approvalNotes - Optional notes
   * @returns Updated approval request
   */
  async approveRequest(
    approvalRequestId: string,
    approvedBy: string,
    approvalNotes?: string
  ): Promise<ApprovalRequestContext> {
    try {
      const approvalRequest = await prisma.nCRApprovalRequest.findUnique({
        where: { id: approvalRequestId },
        include: { ncr: true },
      });

      if (!approvalRequest) {
        throw new Error(`Approval request not found: ${approvalRequestId}`);
      }

      if (approvalRequest.status !== 'PENDING') {
        throw new Error(`Cannot approve request with status ${approvalRequest.status}`);
      }

      const updated = await prisma.nCRApprovalRequest.update({
        where: { id: approvalRequestId },
        data: {
          status: 'APPROVED' as any,
          approvedAt: new Date(),
          approvalNotes: approvalNotes || approvalRequest.approvalNotes,
        },
      });

      logger.info('Approval request approved', {
        approvalRequestId,
        approvedBy,
        ncrId: approvalRequest.ncrId,
      });

      return this.mapToContext(updated, approvalRequest.ncr);
    } catch (error) {
      logger.error('Failed to approve request', { error });
      throw error;
    }
  }

  /**
   * Reject request
   *
   * @param approvalRequestId - Approval request ID
   * @param rejectedBy - User ID who rejected
   * @param rejectionReason - Reason for rejection
   * @returns Updated approval request
   */
  async rejectRequest(
    approvalRequestId: string,
    rejectedBy: string,
    rejectionReason: string
  ): Promise<ApprovalRequestContext> {
    try {
      const approvalRequest = await prisma.nCRApprovalRequest.findUnique({
        where: { id: approvalRequestId },
        include: { ncr: true },
      });

      if (!approvalRequest) {
        throw new Error(`Approval request not found: ${approvalRequestId}`);
      }

      if (approvalRequest.status !== 'PENDING') {
        throw new Error(`Cannot reject request with status ${approvalRequest.status}`);
      }

      const updated = await prisma.nCRApprovalRequest.update({
        where: { id: approvalRequestId },
        data: {
          status: 'REJECTED' as any,
          approvedAt: new Date(),
          approvalNotes: `REJECTED by ${rejectedBy}: ${rejectionReason}`,
        },
      });

      logger.info('Approval request rejected', {
        approvalRequestId,
        rejectedBy,
        ncrId: approvalRequest.ncrId,
      });

      return this.mapToContext(updated, approvalRequest.ncr);
    } catch (error) {
      logger.error('Failed to reject request', { error });
      throw error;
    }
  }

  /**
   * Delegate approval request
   *
   * @param approvalRequestId - Approval request ID
   * @param delegatedTo - User ID to delegate to
   * @param delegatedBy - User ID who delegated
   * @returns Updated approval request
   */
  async delegateRequest(
    approvalRequestId: string,
    delegatedTo: string,
    delegatedBy: string
  ): Promise<ApprovalRequestContext> {
    try {
      const approvalRequest = await prisma.nCRApprovalRequest.findUnique({
        where: { id: approvalRequestId },
        include: { ncr: true },
      });

      if (!approvalRequest) {
        throw new Error(`Approval request not found: ${approvalRequestId}`);
      }

      if (approvalRequest.status !== 'PENDING') {
        throw new Error(`Cannot delegate request with status ${approvalRequest.status}`);
      }

      const updated = await prisma.nCRApprovalRequest.update({
        where: { id: approvalRequestId },
        data: {
          approverUserId: delegatedTo,
          status: 'DELEGATED' as any,
          approvalNotes: `Delegated by ${delegatedBy} to ${delegatedTo}`,
        },
      });

      logger.info('Approval request delegated', {
        approvalRequestId,
        delegatedFrom: delegatedBy,
        delegatedTo,
        ncrId: approvalRequest.ncrId,
      });

      return this.mapToContext(updated, approvalRequest.ncr);
    } catch (error) {
      logger.error('Failed to delegate request', { error });
      throw error;
    }
  }

  /**
   * Get approval history for NCR
   *
   * @param ncrId - NCR ID
   * @returns Array of approval requests for the NCR
   */
  async getApprovalHistory(ncrId: string): Promise<ApprovalRequestContext[]> {
    try {
      const ncr = await prisma.nCR.findUnique({
        where: { id: ncrId },
      });

      if (!ncr) {
        throw new Error(`NCR not found: ${ncrId}`);
      }

      const approvalRequests = await prisma.nCRApprovalRequest.findMany({
        where: { ncrId },
        orderBy: { requestedAt: 'desc' },
      });

      return approvalRequests.map(req => this.mapToContext(req, ncr));
    } catch (error) {
      logger.error('Failed to get approval history', { error });
      throw error;
    }
  }

  /**
   * Check if approval is required for action
   *
   * @param requestType - Type of approval request
   * @param severity - NCR severity level
   * @returns true if approval is required
   */
  isApprovalRequired(requestType: NCRApprovalRequestType, severity?: string): boolean {
    // State transitions, CTP, MRB decisions always require approval
    // Disposition approval depends on severity and disposition type
    const alwaysRequire = [
      'STATE_TRANSITION',
      'CTP_AUTHORIZATION',
      'MRB_DECISION',
      'CLOSURE',
    ];

    return alwaysRequire.includes(requestType);
  }

  /**
   * Escalate overdue approvals
   *
   * @returns Number of approvals escalated
   */
  async escalateOverdueApprovals(): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - NCRApprovalService.ESCALATION_HOURS);

      const overdueApprovals = await prisma.nCRApprovalRequest.findMany({
        where: {
          status: 'PENDING' as any,
          requestedAt: {
            lt: cutoffTime,
          },
          escalated: false,
        },
      });

      let escalatedCount = 0;

      for (const approval of overdueApprovals) {
        await prisma.nCRApprovalRequest.update({
          where: { id: approval.id },
          data: {
            escalated: true,
            escalatedAt: new Date(),
          },
        });
        escalatedCount++;
      }

      if (escalatedCount > 0) {
        logger.warn('Overdue approvals escalated', {
          count: escalatedCount,
          hours: NCRApprovalService.ESCALATION_HOURS,
        });
      }

      return escalatedCount;
    } catch (error) {
      logger.error('Failed to escalate overdue approvals', { error });
      throw error;
    }
  }

  /**
   * Get approval statistics
   *
   * @returns Statistics on approval requests
   */
  async getApprovalStatistics(): Promise<{
    totalPending: number;
    totalApproved: number;
    totalRejected: number;
    totalDelegated: number;
    averageApprovalTime: number;
    overduePending: number;
  }> {
    try {
      const pending = await prisma.nCRApprovalRequest.count({
        where: { status: 'PENDING' as any },
      });

      const approved = await prisma.nCRApprovalRequest.count({
        where: { status: 'APPROVED' as any },
      });

      const rejected = await prisma.nCRApprovalRequest.count({
        where: { status: 'REJECTED' as any },
      });

      const delegated = await prisma.nCRApprovalRequest.count({
        where: { status: 'DELEGATED' as any },
      });

      // Calculate average approval time (in hours)
      const completedApprovals = await prisma.nCRApprovalRequest.findMany({
        where: {
          approvedAt: { not: null },
        },
        select: {
          requestedAt: true,
          approvedAt: true,
        },
      });

      let averageApprovalTime = 0;
      if (completedApprovals.length > 0) {
        const totalTime = completedApprovals.reduce((sum, req) => {
          const timeMs = req.approvedAt!.getTime() - req.requestedAt.getTime();
          return sum + timeMs;
        }, 0);
        averageApprovalTime = Math.round(totalTime / completedApprovals.length / (1000 * 60 * 60));
      }

      // Count overdue pending
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - NCRApprovalService.APPROVAL_DUE_DAYS);

      const overdue = await prisma.nCRApprovalRequest.count({
        where: {
          status: 'PENDING' as any,
          requestedAt: { lt: cutoffTime },
        },
      });

      return {
        totalPending: pending,
        totalApproved: approved,
        totalRejected: rejected,
        totalDelegated: delegated,
        averageApprovalTime,
        overduePending: overdue,
      };
    } catch (error) {
      logger.error('Failed to get approval statistics', { error });
      throw error;
    }
  }

  /**
   * Map approval request to context with full information
   *
   * @param approvalRequest - Approval request from database
   * @param ncr - Associated NCR
   * @returns Approval request context
   */
  private mapToContext(approvalRequest: any, ncr: any): ApprovalRequestContext {
    const now = new Date();
    const daysOverdue = approvalRequest.dueDate
      ? Math.floor((now.getTime() - approvalRequest.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    return {
      id: approvalRequest.id,
      ncrId: approvalRequest.ncrId,
      ncrNumber: ncr.ncrNumber,
      requestType: approvalRequest.requestType,
      requestedBy: approvalRequest.requestedBy,
      requestedAt: approvalRequest.requestedAt,
      approverUserId: approvalRequest.approverUserId,
      status: approvalRequest.status,
      approvalNotes: approvalRequest.approvalNotes,
      approvedAt: approvalRequest.approvedAt,
      dueDate: approvalRequest.dueDate,
      escalated: approvalRequest.escalated,
      escalatedAt: approvalRequest.escalatedAt,
      daysOverdue: daysOverdue && daysOverdue > 0 ? daysOverdue : undefined,
    };
  }
}

// Export singleton instance
export const ncrApprovalService = new NCRApprovalService();
