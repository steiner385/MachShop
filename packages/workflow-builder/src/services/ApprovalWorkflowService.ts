/**
 * Approval Workflow Service
 * Manages approval workflows for deployments and configurations
 */

import { Workflow } from '../types/workflow';

/**
 * Approval request types
 */
export type ApprovalRequestType =
  | 'workflow_deployment'
  | 'configuration_change'
  | 'site_template'
  | 'rollout_strategy'
  | 'version_release';

/**
 * Approval status
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';

/**
 * Approver
 */
export interface Approver {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'technical_lead';
  active: boolean;
}

/**
 * Approval step
 */
export interface ApprovalStep {
  id: string;
  stepNumber: number;
  approvers: Approver[];
  requiredApprovals: number;
  approvalDeadline: number;
  approvedBy: Array<{ approverId: string; approvedAt: number }>;
  rejectedBy?: Array<{ approverId: string; rejectionReason: string; rejectedAt: number }>;
  status: 'pending' | 'approved' | 'rejected';
}

/**
 * Approval request
 */
export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: number;
  expiresAt: number;
  title: string;
  description: string;
  data: {
    workflowId?: string;
    siteId?: string;
    configChanges?: Record<string, any>;
    rolloutStrategy?: string;
    templateId?: string;
  };
  steps: ApprovalStep[];
  currentStepIndex: number;
  completedAt?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Approval policy
 */
export interface ApprovalPolicy {
  id: string;
  name: string;
  requestType: ApprovalRequestType;
  steps: Array<{
    stepNumber: number;
    approverRoles: string[];
    requiredApprovals: number;
    timeoutHours: number;
  }>;
  enabled: boolean;
  priority: number;
  notificationRules?: Array<{
    event: 'created' | 'approved' | 'rejected' | 'expiring';
    recipients: string[];
  }>;
}

/**
 * Approval Workflow Service
 */
export class ApprovalWorkflowService {
  private requests: Map<string, ApprovalRequest> = new Map();
  private policies: Map<string, ApprovalPolicy> = new Map();
  private approvers: Map<string, Approver> = new Map();
  private auditLog: Array<{
    requestId: string;
    action: string;
    actor: string;
    timestamp: number;
    details?: Record<string, any>;
  }> = [];
  private maxAuditSize = 10000;

  /**
   * Register approver
   */
  registerApprover(approver: Approver): boolean {
    try {
      if (this.approvers.has(approver.id)) {
        throw new Error(`Approver ${approver.id} already exists`);
      }

      this.approvers.set(approver.id, approver);
      return true;
    } catch (error) {
      console.error(`Failed to register approver ${approver.id}:`, error);
      return false;
    }
  }

  /**
   * Create approval policy
   */
  createPolicy(policy: ApprovalPolicy): boolean {
    try {
      if (this.policies.has(policy.id)) {
        throw new Error(`Policy ${policy.id} already exists`);
      }

      this.policies.set(policy.id, policy);
      return true;
    } catch (error) {
      console.error(`Failed to create policy ${policy.id}:`, error);
      return false;
    }
  }

  /**
   * Get policy for request type
   */
  getPolicyForType(requestType: ApprovalRequestType): ApprovalPolicy | undefined {
    const policies = Array.from(this.policies.values())
      .filter(p => p.requestType === requestType && p.enabled)
      .sort((a, b) => b.priority - a.priority);

    return policies[0];
  }

  /**
   * Create approval request
   */
  createRequest(request: Omit<ApprovalRequest, 'id' | 'steps' | 'currentStepIndex'>): ApprovalRequest | null {
    try {
      const policy = this.getPolicyForType(request.type);

      if (!policy) {
        throw new Error(`No approval policy found for type ${request.type}`);
      }

      const requestId = `req-${Date.now()}`;
      const expiresAt = request.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days default

      // Build approval steps
      const steps: ApprovalStep[] = policy.steps.map(policyStep => {
        const stepApprovers = Array.from(this.approvers.values()).filter(a =>
          policyStep.approverRoles.includes(a.role)
        );

        return {
          id: `step-${requestId}-${policyStep.stepNumber}`,
          stepNumber: policyStep.stepNumber,
          approvers: stepApprovers,
          requiredApprovals: policyStep.requiredApprovals,
          approvalDeadline: Date.now() + policyStep.timeoutHours * 60 * 60 * 1000,
          approvedBy: [],
          status: 'pending',
        };
      });

      const newRequest: ApprovalRequest = {
        id: requestId,
        type: request.type,
        status: 'pending',
        requestedBy: request.requestedBy,
        requestedAt: Date.now(),
        expiresAt,
        title: request.title,
        description: request.description,
        data: request.data,
        steps,
        currentStepIndex: 0,
        metadata: request.metadata,
      };

      this.requests.set(requestId, newRequest);
      this.auditLog.push({
        requestId,
        action: 'request_created',
        actor: request.requestedBy,
        timestamp: Date.now(),
        details: { type: request.type, title: request.title },
      });

      return newRequest;
    } catch (error) {
      console.error(`Failed to create approval request:`, error);
      return null;
    }
  }

  /**
   * Get approval request
   */
  getRequest(requestId: string): ApprovalRequest | undefined {
    return this.requests.get(requestId);
  }

  /**
   * Get pending requests for approver
   */
  getPendingRequests(approverId: string): ApprovalRequest[] {
    const approver = this.approvers.get(approverId);
    if (!approver) {
      return [];
    }

    return Array.from(this.requests.values()).filter(req => {
      if (req.status !== 'pending') {
        return false;
      }

      const currentStep = req.steps[req.currentStepIndex];
      if (!currentStep) {
        return false;
      }

      return currentStep.approvers.some(a => a.id === approverId);
    });
  }

  /**
   * Approve request
   */
  approveRequest(requestId: string, approverId: string, comments?: string): boolean {
    try {
      const request = this.requests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const approver = this.approvers.get(approverId);
      if (!approver) {
        throw new Error(`Approver ${approverId} not found`);
      }

      if (request.status !== 'pending') {
        throw new Error(`Request ${requestId} is not pending`);
      }

      const currentStep = request.steps[request.currentStepIndex];
      if (!currentStep) {
        throw new Error(`No current step for request ${requestId}`);
      }

      // Check if approver is in current step
      if (!currentStep.approvers.some(a => a.id === approverId)) {
        throw new Error(`Approver ${approverId} is not authorized for this step`);
      }

      // Add approval
      currentStep.approvedBy.push({
        approverId,
        approvedAt: Date.now(),
      });

      // Check if step is complete
      if (currentStep.approvedBy.length >= currentStep.requiredApprovals) {
        currentStep.status = 'approved';

        // Move to next step
        if (request.currentStepIndex < request.steps.length - 1) {
          request.currentStepIndex++;
        } else {
          // All steps approved
          request.status = 'approved';
          request.completedAt = Date.now();
        }
      }

      this.auditLog.push({
        requestId,
        action: 'approved',
        actor: approverId,
        timestamp: Date.now(),
        details: { stepNumber: currentStep.stepNumber, comments },
      });

      return true;
    } catch (error) {
      console.error(`Failed to approve request ${requestId}:`, error);
      return false;
    }
  }

  /**
   * Reject request
   */
  rejectRequest(
    requestId: string,
    approverId: string,
    rejectionReason: string
  ): boolean {
    try {
      const request = this.requests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const approver = this.approvers.get(approverId);
      if (!approver) {
        throw new Error(`Approver ${approverId} not found`);
      }

      if (request.status !== 'pending') {
        throw new Error(`Request ${requestId} is not pending`);
      }

      const currentStep = request.steps[request.currentStepIndex];
      if (!currentStep) {
        throw new Error(`No current step for request ${requestId}`);
      }

      currentStep.status = 'rejected';
      currentStep.rejectedBy = [{ approverId, rejectionReason, rejectedAt: Date.now() }];

      request.status = 'rejected';
      request.reason = rejectionReason;
      request.completedAt = Date.now();

      this.auditLog.push({
        requestId,
        action: 'rejected',
        actor: approverId,
        timestamp: Date.now(),
        details: { reason: rejectionReason },
      });

      return true;
    } catch (error) {
      console.error(`Failed to reject request ${requestId}:`, error);
      return false;
    }
  }

  /**
   * Cancel request
   */
  cancelRequest(requestId: string, cancelledBy: string, reason?: string): boolean {
    try {
      const request = this.requests.get(requestId);
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      if (request.status !== 'pending') {
        throw new Error(`Can only cancel pending requests`);
      }

      request.status = 'cancelled';
      request.reason = reason;
      request.completedAt = Date.now();

      this.auditLog.push({
        requestId,
        action: 'cancelled',
        actor: cancelledBy,
        timestamp: Date.now(),
        details: { reason },
      });

      return true;
    } catch (error) {
      console.error(`Failed to cancel request ${requestId}:`, error);
      return false;
    }
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    averageApprovalTime: number;
  } {
    const requests = Array.from(this.requests.values());

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      approved: requests.filter(r => r.status === 'approved').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      cancelled: requests.filter(r => r.status === 'cancelled').length,
      averageApprovalTime: 0,
    };

    const approvedRequests = requests.filter(r => r.completedAt && r.status === 'approved');
    if (approvedRequests.length > 0) {
      const totalTime = approvedRequests.reduce(
        (sum, r) => sum + (r.completedAt! - r.requestedAt),
        0
      );
      stats.averageApprovalTime = totalTime / approvedRequests.length;
    }

    return stats;
  }

  /**
   * Get approval performance metrics
   */
  getApproverMetrics(approverId: string): {
    totalApproved: number;
    totalRejected: number;
    averageTimeToApprove: number;
    recentApprovals: ApprovalRequest[];
  } {
    const approverApprovals = Array.from(this.requests.values()).filter(req =>
      req.steps.some(step =>
        step.approvedBy.some(a => a.approverId === approverId)
      )
    );

    const approverRejections = Array.from(this.requests.values()).filter(req =>
      req.steps.some(step =>
        step.rejectedBy?.some(a => a.approverId === approverId)
      )
    );

    const totalApproved = approverApprovals.length;
    const totalRejected = approverRejections.length;

    let averageTimeToApprove = 0;
    if (totalApproved > 0) {
      const totalTime = approverApprovals.reduce((sum, req) => {
        const approval = req.steps
          .flatMap(s => s.approvedBy)
          .find(a => a.approverId === approverId);
        return sum + (approval ? approval.approvedAt - req.requestedAt : 0);
      }, 0);
      averageTimeToApprove = totalTime / totalApproved;
    }

    const recentApprovals = approverApprovals.slice(-10);

    return {
      totalApproved,
      totalRejected,
      averageTimeToApprove,
      recentApprovals,
    };
  }

  /**
   * Check expired requests
   */
  checkExpiredRequests(): ApprovalRequest[] {
    const now = Date.now();
    const expired: ApprovalRequest[] = [];

    for (const request of this.requests.values()) {
      if (request.status === 'pending' && request.expiresAt < now) {
        request.status = 'expired';
        request.completedAt = Date.now();
        expired.push(request);

        this.auditLog.push({
          requestId: request.id,
          action: 'expired',
          actor: 'system',
          timestamp: Date.now(),
        });
      }
    }

    return expired;
  }

  /**
   * Get audit log
   */
  getAuditLog(filters?: {
    requestId?: string;
    action?: string;
    actor?: string;
    startTime?: number;
    endTime?: number;
  }): Array<{
    requestId: string;
    action: string;
    actor: string;
    timestamp: number;
    details?: Record<string, any>;
  }> {
    let log = this.auditLog;

    if (filters) {
      log = log.filter(entry => {
        if (filters.requestId && entry.requestId !== filters.requestId) {
          return false;
        }
        if (filters.action && entry.action !== filters.action) {
          return false;
        }
        if (filters.actor && entry.actor !== filters.actor) {
          return false;
        }
        if (filters.startTime && entry.timestamp < filters.startTime) {
          return false;
        }
        if (filters.endTime && entry.timestamp > filters.endTime) {
          return false;
        }
        return true;
      });
    }

    return log;
  }

  /**
   * Get all approvers
   */
  getAllApprovers(): Approver[] {
    return Array.from(this.approvers.values());
  }

  /**
   * Get active approvers
   */
  getActiveApprovers(): Approver[] {
    return Array.from(this.approvers.values()).filter(a => a.active);
  }

  /**
   * Get approvers by role
   */
  getApproversByRole(role: string): Approver[] {
    return Array.from(this.approvers.values()).filter(a => a.role === role && a.active);
  }

  /**
   * Deactivate approver
   */
  deactivateApprover(approverId: string): boolean {
    const approver = this.approvers.get(approverId);
    if (!approver) {
      return false;
    }

    approver.active = false;
    return true;
  }
}

export default ApprovalWorkflowService;
