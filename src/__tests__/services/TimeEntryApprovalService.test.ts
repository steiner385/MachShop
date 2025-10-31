/**
 * TimeEntryApprovalService Tests
 * Comprehensive test suite for time entry approval workflow functionality
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import {
  TimeEntryApprovalService,
  ApprovalRequest,
  BulkApprovalRequest,
  EscalationRequest,
} from '../../services/TimeEntryApprovalService';
import {
  ApprovalStatus,
  TimeEntryBatchType,
  TimeEntryBatchStatus,
} from '@prisma/client';
import prisma from '../../lib/database';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    timeEntryEdit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    timeEntryApproval: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    timeEntryBatch: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    },
    approvalDelegation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  }
}));

// Mock TimeEntryEditService
vi.mock('../../services/TimeEntryEditService', () => ({
  timeEntryEditService: {
    applyEdit: vi.fn(),
  }
}));

describe('TimeEntryApprovalService', () => {
  let service: TimeEntryApprovalService;

  beforeEach(() => {
    service = new TimeEntryApprovalService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('processApproval', () => {
    const mockTimeEntryEdit = {
      id: 'edit-1',
      timeEntryId: 'entry-1',
      editedBy: 'user-1',
      approvalStatus: ApprovalStatus.PENDING,
      editor: {
        id: 'user-1',
        firstName: 'John',
        lastName: 'Doe',
        username: 'jdoe',
      },
      laborTimeEntry: {
        id: 'entry-1',
        user: { firstName: 'John', lastName: 'Doe' },
        workOrder: { workOrderNumber: 'WO001' },
      },
      approvals: [],
    };

    const mockApprover = {
      id: 'supervisor-1',
      firstName: 'Jane',
      lastName: 'Smith',
      username: 'jsmith',
      userRoles: [
        {
          role: {
            name: 'SUPERVISOR',
            rolePermissions: [
              {
                permission: { name: 'TIME_ENTRY_APPROVAL' }
              }
            ]
          }
        }
      ]
    };

    beforeEach(() => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(mockTimeEntryEdit);
      (prisma.user.findUnique as Mock).mockResolvedValue(mockApprover);
      (service as any).createApprovalNotification = vi.fn();
      (service as any).validateApprovalPermissions = vi.fn();
    });

    it('should approve an edit successfully', async () => {
      const approvalRequest: ApprovalRequest = {
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
        approvalNotes: 'Looks good, approved',
      };

      const mockApproval = {
        id: 'approval-1',
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
        approvalNotes: 'Looks good, approved',
        approver: mockApprover,
        timeEntryEdit: mockTimeEntryEdit,
      };

      (prisma.timeEntryApproval.create as Mock).mockResolvedValue(mockApproval);
      (prisma.timeEntryEdit.update as Mock).mockResolvedValue({});

      const result = await service.processApproval(approvalRequest);

      expect(result).toEqual(mockApproval);
      expect(prisma.timeEntryApproval.create).toHaveBeenCalledWith({
        data: {
          timeEntryEditId: 'edit-1',
          approverUserId: 'supervisor-1',
          status: ApprovalStatus.APPROVED,
          approvalNotes: 'Looks good, approved',
          conditions: {},
          reviewStartedAt: expect.any(Date),
          reviewCompletedAt: expect.any(Date),
        },
        include: expect.any(Object),
      });

      expect(prisma.timeEntryEdit.update).toHaveBeenCalledWith({
        where: { id: 'edit-1' },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedBy: 'supervisor-1',
          approvedAt: expect.any(Date),
          rejectionReason: null,
        },
      });
    });

    it('should reject an edit with reason', async () => {
      const approvalRequest: ApprovalRequest = {
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.REJECTED,
        approvalNotes: 'Insufficient justification for the change',
      };

      const mockApproval = {
        id: 'approval-1',
        ...approvalRequest,
        approver: mockApprover,
        timeEntryEdit: mockTimeEntryEdit,
      };

      (prisma.timeEntryApproval.create as Mock).mockResolvedValue(mockApproval);
      (prisma.timeEntryEdit.update as Mock).mockResolvedValue({});

      const result = await service.processApproval(approvalRequest);

      expect(result).toEqual(mockApproval);
      expect(prisma.timeEntryEdit.update).toHaveBeenCalledWith({
        where: { id: 'edit-1' },
        data: {
          approvalStatus: ApprovalStatus.REJECTED,
          approvedBy: null,
          approvedAt: null,
          rejectionReason: 'Insufficient justification for the change',
        },
      });
    });

    it('should handle already processed edit', async () => {
      const processedEdit = {
        ...mockTimeEntryEdit,
        approvalStatus: ApprovalStatus.APPROVED,
      };

      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(processedEdit);

      const approvalRequest: ApprovalRequest = {
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
      };

      await expect(service.processApproval(approvalRequest)).rejects.toThrow(
        'Edit is not pending approval (current status: APPROVED)'
      );
    });

    it('should handle non-existent edit', async () => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(null);

      const approvalRequest: ApprovalRequest = {
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
      };

      await expect(service.processApproval(approvalRequest)).rejects.toThrow(
        'Time entry edit edit-1 not found'
      );
    });

    it('should validate approver permissions', async () => {
      const unauthorizedUser = {
        ...mockApprover,
        userRoles: [
          {
            role: {
              name: 'OPERATOR',
              rolePermissions: []
            }
          }
        ]
      };

      (service as any).validateApprovalPermissions = vi.fn().mockRejectedValue(
        new Error('User supervisor-1 does not have approval permissions')
      );

      const approvalRequest: ApprovalRequest = {
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
      };

      await expect(service.processApproval(approvalRequest)).rejects.toThrow(
        'User supervisor-1 does not have approval permissions'
      );
    });
  });

  describe('processBulkApproval', () => {
    const mockBatch = {
      id: 'batch-1',
      batchType: TimeEntryBatchType.APPROVAL,
      batchName: 'Bulk Approval - 2023-01-01',
      status: TimeEntryBatchStatus.PROCESSING,
      processedBy: 'supervisor-1',
      totalItems: 3,
      processedItems: 0,
    };

    beforeEach(() => {
      (prisma.timeEntryBatch.create as Mock).mockResolvedValue(mockBatch);
      (service.processApproval as any) = vi.fn()
        .mockResolvedValueOnce({ id: 'approval-1' })
        .mockResolvedValueOnce({ id: 'approval-2' })
        .mockResolvedValueOnce({ id: 'approval-3' });
      (service as any).validateBulkApprovalPermissions = vi.fn();
    });

    it('should process bulk approvals successfully', async () => {
      const bulkRequest: BulkApprovalRequest = {
        timeEntryEditIds: ['edit-1', 'edit-2', 'edit-3'],
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
        approvalNotes: 'Bulk approval for routine corrections',
        batchName: 'Daily Approvals',
      };

      const completedBatch = {
        ...mockBatch,
        status: TimeEntryBatchStatus.COMPLETED,
        completedAt: new Date(),
        successCount: 3,
        errorCount: 0,
        processor: { id: 'supervisor-1', firstName: 'Jane', lastName: 'Smith' },
      };

      (prisma.timeEntryBatch.findUnique as Mock).mockResolvedValue(completedBatch);

      const result = await service.processBulkApproval(bulkRequest);

      expect(result).toEqual(completedBatch);
      expect(service.processApproval).toHaveBeenCalledTimes(3);
      expect(prisma.timeEntryBatch.update).toHaveBeenCalledWith({
        where: { id: mockBatch.id },
        data: {
          status: TimeEntryBatchStatus.COMPLETED,
          completedAt: expect.any(Date),
          results: expect.any(Array),
          successCount: 3,
          errorCount: 0,
        },
      });
    });

    it('should handle partial failures in bulk approval', async () => {
      (service.processApproval as any) = vi.fn()
        .mockResolvedValueOnce({ id: 'approval-1' })
        .mockRejectedValueOnce(new Error('Approval failed'))
        .mockResolvedValueOnce({ id: 'approval-3' });

      const bulkRequest: BulkApprovalRequest = {
        timeEntryEditIds: ['edit-1', 'edit-2', 'edit-3'],
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
      };

      const batchWithErrors = {
        ...mockBatch,
        status: TimeEntryBatchStatus.COMPLETED_WITH_ERRORS,
        successCount: 2,
        errorCount: 1,
      };

      (prisma.timeEntryBatch.findUnique as Mock).mockResolvedValue(batchWithErrors);

      const result = await service.processBulkApproval(bulkRequest);

      expect(result.status).toBe(TimeEntryBatchStatus.COMPLETED_WITH_ERRORS);
      expect(prisma.timeEntryBatch.update).toHaveBeenCalledWith({
        where: { id: mockBatch.id },
        data: {
          status: TimeEntryBatchStatus.COMPLETED_WITH_ERRORS,
          completedAt: expect.any(Date),
          results: expect.arrayContaining([
            expect.objectContaining({ success: true }),
            expect.objectContaining({ success: false }),
            expect.objectContaining({ success: true }),
          ]),
          successCount: 2,
          errorCount: 1,
        },
      });
    });

    it('should validate bulk approval permissions', async () => {
      (service as any).validateBulkApprovalPermissions = vi.fn().mockRejectedValue(
        new Error('Bulk approval size exceeds limit of 50')
      );

      const largeBulkRequest: BulkApprovalRequest = {
        timeEntryEditIds: Array.from({ length: 100 }, (_, i) => `edit-${i}`),
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.APPROVED,
      };

      await expect(service.processBulkApproval(largeBulkRequest)).rejects.toThrow(
        'Bulk approval size exceeds limit of 50'
      );
    });
  });

  describe('escalateApproval', () => {
    const mockTimeEntryEdit = {
      id: 'edit-1',
      timeEntryId: 'entry-1',
      approvals: [],
    };

    beforeEach(() => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(mockTimeEntryEdit);
      (service as any).validateEscalationPermissions = vi.fn();
      (service as any).createApprovalNotification = vi.fn();
    });

    it('should escalate approval successfully', async () => {
      const escalationRequest: EscalationRequest = {
        timeEntryEditId: 'edit-1',
        fromUserId: 'supervisor-1',
        toUserId: 'manager-1',
        reason: 'High value change requires manager approval',
        notes: 'Please review this significant time adjustment',
      };

      const mockEscalationApproval = {
        id: 'approval-escalation-1',
        timeEntryEditId: 'edit-1',
        approverUserId: 'supervisor-1',
        status: ApprovalStatus.ESCALATED,
        escalatedTo: 'manager-1',
        escalationReason: 'High value change requires manager approval',
      };

      const updatedEdit = {
        ...mockTimeEntryEdit,
        approvalStatus: ApprovalStatus.ESCALATED,
        escalatedTo: 'manager-1',
        escalatedAt: new Date(),
      };

      (prisma.timeEntryApproval.create as Mock).mockResolvedValue(mockEscalationApproval);
      (prisma.timeEntryEdit.update as Mock).mockResolvedValue(updatedEdit);
      (prisma.timeEntryEdit.findUnique as Mock)
        .mockResolvedValueOnce(mockTimeEntryEdit) // First call in method
        .mockResolvedValueOnce({ // Second call for return value
          ...updatedEdit,
          editor: { firstName: 'John', lastName: 'Doe' },
          approvals: [mockEscalationApproval],
        });

      const result = await service.escalateApproval(escalationRequest);

      expect(prisma.timeEntryApproval.create).toHaveBeenCalledWith({
        data: {
          timeEntryEditId: 'edit-1',
          approverUserId: 'supervisor-1',
          status: ApprovalStatus.ESCALATED,
          approvalNotes: 'Please review this significant time adjustment',
          escalatedTo: 'manager-1',
          escalationReason: 'High value change requires manager approval',
        },
      });

      expect(prisma.timeEntryEdit.update).toHaveBeenCalledWith({
        where: { id: 'edit-1' },
        data: {
          approvalStatus: ApprovalStatus.ESCALATED,
          escalatedTo: 'manager-1',
          escalatedAt: expect.any(Date),
        },
      });

      expect((service as any).createApprovalNotification).toHaveBeenCalledWith(
        'manager-1',
        expect.any(Object),
        'ESCALATED'
      );
    });

    it('should validate escalation permissions', async () => {
      (service as any).validateEscalationPermissions = vi.fn().mockRejectedValue(
        new Error('User does not have escalation permissions')
      );

      const escalationRequest: EscalationRequest = {
        timeEntryEditId: 'edit-1',
        fromUserId: 'operator-1',
        toUserId: 'manager-1',
        reason: 'Cannot escalate',
      };

      await expect(service.escalateApproval(escalationRequest)).rejects.toThrow(
        'User does not have escalation permissions'
      );
    });
  });

  describe('getPendingApprovalsForSupervisor', () => {
    const mockPendingEdits = [
      {
        id: 'edit-1',
        timeEntryId: 'entry-1',
        approvalStatus: ApprovalStatus.PENDING,
        editedAt: new Date('2023-01-01T10:00:00Z'),
        riskScore: 25,
        editType: 'MODIFIED',
        editor: { firstName: 'John', lastName: 'Doe' },
        laborTimeEntry: {
          user: {
            userSiteRoles: [
              { site: { siteManagers: [{ userId: 'supervisor-1' }] } }
            ]
          },
          workOrder: { workOrderNumber: 'WO001' },
        },
        approvals: [],
      },
      {
        id: 'edit-2',
        timeEntryId: 'entry-2',
        approvalStatus: ApprovalStatus.ESCALATED,
        escalatedTo: 'supervisor-1',
        editedAt: new Date('2023-01-01T11:00:00Z'),
        riskScore: 75,
        editType: 'MODIFIED',
        editor: { firstName: 'Jane', lastName: 'Smith' },
        laborTimeEntry: {
          user: {
            userSiteRoles: [
              { site: { siteManagers: [{ userId: 'manager-1' }] } }
            ]
          },
          workOrder: { workOrderNumber: 'WO002' },
        },
        approvals: [],
      },
    ];

    beforeEach(() => {
      (service as any).getActiveDelegations = vi.fn().mockResolvedValue([]);
      (prisma.timeEntryEdit.findMany as Mock).mockResolvedValue(mockPendingEdits);
      (prisma.timeEntryEdit.count as Mock).mockResolvedValue(2);
    });

    it('should return pending approvals for supervisor', async () => {
      const result = await service.getPendingApprovalsForSupervisor('supervisor-1', {
        sortBy: 'oldest',
        limit: 50,
      });

      expect(result.edits).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.delegations).toEqual([]);

      expect(prisma.timeEntryEdit.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              laborTimeEntry: expect.any(Object),
            }),
            expect.objectContaining({
              escalatedTo: 'supervisor-1',
            }),
          ]),
        }),
        include: expect.any(Object),
        orderBy: { editedAt: 'asc' },
        take: 50,
        skip: 0,
      });
    });

    it('should apply risk score filters', async () => {
      const options = {
        filters: {
          riskScore: { min: 30, max: 80 }
        }
      };

      await service.getPendingApprovalsForSupervisor('supervisor-1', options);

      expect(prisma.timeEntryEdit.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          riskScore: {
            gte: 30,
            lte: 80,
          },
        }),
        include: expect.any(Object),
        orderBy: { editedAt: 'asc' },
        take: 50,
        skip: 0,
      });
    });

    it('should apply edit type filters', async () => {
      const options = {
        filters: {
          editType: ['MODIFIED', 'SPLIT']
        }
      };

      await service.getPendingApprovalsForSupervisor('supervisor-1', options);

      expect(prisma.timeEntryEdit.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          editType: { in: ['MODIFIED', 'SPLIT'] },
        }),
        include: expect.any(Object),
        orderBy: { editedAt: 'asc' },
        take: 50,
        skip: 0,
      });
    });

    it('should handle pagination', async () => {
      const options = {
        limit: 10,
        offset: 20,
      };

      await service.getPendingApprovalsForSupervisor('supervisor-1', options);

      expect(prisma.timeEntryEdit.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { editedAt: 'asc' },
        take: 10,
        skip: 20,
      });
    });
  });

  describe('getApprovalMetrics', () => {
    const mockEdits = [
      { approvalStatus: ApprovalStatus.PENDING, editedAt: new Date() },
      { approvalStatus: ApprovalStatus.AUTO_APPROVED, editedAt: new Date() },
    ];

    const mockApprovals = [
      {
        status: ApprovalStatus.APPROVED,
        reviewStartedAt: new Date('2023-01-01T10:00:00Z'),
        reviewCompletedAt: new Date('2023-01-01T10:30:00Z'),
        approver: { id: 'supervisor-1', firstName: 'Jane', lastName: 'Smith' },
        timeEntryEdit: { id: 'edit-1' },
      },
      {
        status: ApprovalStatus.REJECTED,
        reviewStartedAt: new Date('2023-01-01T11:00:00Z'),
        reviewCompletedAt: new Date('2023-01-01T11:15:00Z'),
        approver: { id: 'supervisor-1', firstName: 'Jane', lastName: 'Smith' },
        timeEntryEdit: { id: 'edit-2' },
      },
    ];

    beforeEach(() => {
      (prisma.timeEntryEdit.count as Mock)
        .mockResolvedValueOnce(1) // pending count
        .mockResolvedValueOnce(2) // total count
        .mockResolvedValueOnce(1); // auto-approved count

      (prisma.timeEntryApproval.findMany as Mock).mockResolvedValue(mockApprovals);

      (prisma.timeEntryEdit.findFirst as Mock).mockResolvedValue({
        editedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
      });
    });

    it('should calculate comprehensive approval metrics', async () => {
      const metrics = await service.getApprovalMetrics('supervisor-1', 'site-1');

      expect(metrics.pendingCount).toBe(1);
      expect(metrics.averageApprovalTime).toBe(0.375); // 22.5 minutes average
      expect(metrics.approvalRate).toBe(0.5); // 1 approved out of 2 total
      expect(metrics.autoApprovalRate).toBe(0.5); // 1 auto-approved out of 2 total
      expect(metrics.oldestPendingDays).toBe(3);

      expect(metrics.byApprover).toHaveLength(1);
      expect(metrics.byApprover[0]).toEqual({
        approverId: 'supervisor-1',
        approverName: 'Jane Smith',
        pendingCount: 0,
        avgTimeHours: 0.375,
        approvalRate: 0.5,
      });
    });

    it('should handle empty metrics gracefully', async () => {
      (prisma.timeEntryEdit.count as Mock)
        .mockResolvedValueOnce(0) // pending count
        .mockResolvedValueOnce(0) // total count
        .mockResolvedValueOnce(0); // auto-approved count

      (prisma.timeEntryApproval.findMany as Mock).mockResolvedValue([]);
      (prisma.timeEntryEdit.findFirst as Mock).mockResolvedValue(null);

      const metrics = await service.getApprovalMetrics();

      expect(metrics.pendingCount).toBe(0);
      expect(metrics.averageApprovalTime).toBe(0);
      expect(metrics.approvalRate).toBe(0);
      expect(metrics.autoApprovalRate).toBe(0);
      expect(metrics.oldestPendingDays).toBe(0);
      expect(metrics.byApprover).toHaveLength(0);
    });

    it('should apply date range filters', async () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      await service.getApprovalMetrics('supervisor-1', 'site-1', { start: startDate, end: endDate });

      expect(prisma.timeEntryEdit.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          editedAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      });
    });
  });
});