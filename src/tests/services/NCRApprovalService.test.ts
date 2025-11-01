/**
 * NCR Approval Service Tests
 *
 * Test coverage for:
 * - Approval request creation
 * - Approval approval/rejection/delegation
 * - Approval history retrieval
 * - Escalation detection
 * - Statistics calculation
 */

import { NCRApprovalService } from '../../services/NCRApprovalService';
import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client');

describe('NCRApprovalService', () => {
  let service: NCRApprovalService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      nCR: {
        findUnique: jest.fn(),
      },
      nCRApprovalRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
    } as any;

    service = new NCRApprovalService();
    (service as any).prisma = mockPrisma;
  });

  describe('createApprovalRequest', () => {
    it('should create approval request for valid NCR', async () => {
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-001',
      };

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);
      mockPrisma.nCRApprovalRequest.create.mockResolvedValue({
        id: 'approval-1',
        ncrId: 'ncr-1',
        ncrNumber: 'NCR-001',
        requestType: 'STATE_TRANSITION',
        requestedBy: 'user-1',
        requestedAt: new Date(),
        approverUserId: 'user-2',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        escalated: false,
      } as any);

      const result = await service.createApprovalRequest(
        'ncr-1',
        'STATE_TRANSITION',
        'user-1',
        'user-2',
        'Test approval'
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('approval-1');
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.nCRApprovalRequest.create).toHaveBeenCalled();
    });

    it('should fail if NCR does not exist', async () => {
      mockPrisma.nCR.findUnique.mockResolvedValue(null);

      await expect(
        service.createApprovalRequest('ncr-invalid', 'STATE_TRANSITION', 'user-1', 'user-2')
      ).rejects.toThrow('NCR not found');
    });

    it('should set due date to 2 days from now', async () => {
      const mockNCR = { id: 'ncr-1', ncrNumber: 'NCR-001' };
      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);

      const createCall = jest.fn().mockResolvedValue({
        id: 'approval-1',
        dueDate: new Date(),
      } as any);
      mockPrisma.nCRApprovalRequest.create = createCall;

      await service.createApprovalRequest('ncr-1', 'STATE_TRANSITION', 'user-1', 'user-2');

      const callArgs = createCall.mock.calls[0][0];
      expect(callArgs.data.dueDate).toBeDefined();
    });
  });

  describe('getPendingApprovalsForUser', () => {
    it('should return pending approvals for user', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          ncrId: 'ncr-1',
          ncrNumber: 'NCR-001',
          status: 'PENDING',
          requestType: 'STATE_TRANSITION',
          dueDate: new Date(),
          ncr: { ncrNumber: 'NCR-001' },
        },
        {
          id: 'approval-2',
          ncrId: 'ncr-2',
          ncrNumber: 'NCR-002',
          status: 'PENDING',
          requestType: 'DISPOSITION',
          dueDate: new Date(),
          ncr: { ncrNumber: 'NCR-002' },
        },
      ];

      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue(mockApprovals as any);

      const result = await service.getPendingApprovalsForUser('user-1');

      expect(result.length).toBe(2);
      expect(mockPrisma.nCRApprovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            approverUserId: 'user-1',
            status: 'PENDING',
          },
        })
      );
    });

    it('should limit results to specified count', async () => {
      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue([]);

      await service.getPendingApprovalsForUser('user-1', 10);

      expect(mockPrisma.nCRApprovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    it('should order by due date ascending', async () => {
      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue([]);

      await service.getPendingApprovalsForUser('user-1');

      expect(mockPrisma.nCRApprovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            dueDate: 'asc',
          },
        })
      );
    });
  });

  describe('approveRequest', () => {
    it('should approve pending request', async () => {
      const mockApproval = {
        id: 'approval-1',
        ncrId: 'ncr-1',
        status: 'PENDING',
        ncr: { ncrNumber: 'NCR-001' },
      };

      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue(mockApproval as any);
      mockPrisma.nCRApprovalRequest.update.mockResolvedValue({
        ...mockApproval,
        status: 'APPROVED',
        approvedAt: new Date(),
      } as any);

      const result = await service.approveRequest('approval-1', 'user-2', 'Looks good');

      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.nCRApprovalRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });

    it('should fail if approval not found', async () => {
      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue(null);

      await expect(service.approveRequest('approval-invalid', 'user-2')).rejects.toThrow(
        'Approval request not found'
      );
    });

    it('should fail if approval not pending', async () => {
      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue({
        id: 'approval-1',
        status: 'APPROVED',
      } as any);

      await expect(service.approveRequest('approval-1', 'user-2')).rejects.toThrow(
        'Cannot approve request with status APPROVED'
      );
    });
  });

  describe('rejectRequest', () => {
    it('should reject pending request', async () => {
      const mockApproval = {
        id: 'approval-1',
        ncrId: 'ncr-1',
        status: 'PENDING',
        ncr: { ncrNumber: 'NCR-001' },
      };

      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue(mockApproval as any);
      mockPrisma.nCRApprovalRequest.update.mockResolvedValue({
        ...mockApproval,
        status: 'REJECTED',
        approvedAt: new Date(),
      } as any);

      const result = await service.rejectRequest('approval-1', 'user-2', 'Needs more info');

      expect(result.status).toBe('REJECTED');
      expect(mockPrisma.nCRApprovalRequest.update).toHaveBeenCalled();
    });

    it('should include rejection reason in notes', async () => {
      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue({
        id: 'approval-1',
        status: 'PENDING',
        ncr: { ncrNumber: 'NCR-001' },
      } as any);

      const updateCall = jest.fn().mockResolvedValue({});
      mockPrisma.nCRApprovalRequest.update = updateCall;

      await service.rejectRequest('approval-1', 'user-2', 'Needs more info');

      const callArgs = updateCall.mock.calls[0][0];
      expect(callArgs.data.approvalNotes).toContain('REJECTED by user-2');
      expect(callArgs.data.approvalNotes).toContain('Needs more info');
    });
  });

  describe('delegateRequest', () => {
    it('should delegate approval to another user', async () => {
      const mockApproval = {
        id: 'approval-1',
        ncrId: 'ncr-1',
        status: 'PENDING',
        ncr: { ncrNumber: 'NCR-001' },
      };

      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue(mockApproval as any);
      mockPrisma.nCRApprovalRequest.update.mockResolvedValue({
        ...mockApproval,
        approverUserId: 'user-3',
        status: 'DELEGATED',
      } as any);

      const result = await service.delegateRequest('approval-1', 'user-3', 'user-2');

      expect(result.approverUserId).toBe('user-3');
      expect(result.status).toBe('DELEGATED');
    });

    it('should fail if approval not pending', async () => {
      mockPrisma.nCRApprovalRequest.findUnique.mockResolvedValue({
        id: 'approval-1',
        status: 'APPROVED',
      } as any);

      await expect(service.delegateRequest('approval-1', 'user-3', 'user-2')).rejects.toThrow(
        'Cannot delegate request with status APPROVED'
      );
    });
  });

  describe('getApprovalHistory', () => {
    it('should return approval history for NCR', async () => {
      const mockNCR = { id: 'ncr-1', ncrNumber: 'NCR-001' };
      const mockHistory = [
        {
          id: 'approval-1',
          ncrId: 'ncr-1',
          status: 'APPROVED',
          requestedAt: new Date(),
          approvedAt: new Date(),
        },
        {
          id: 'approval-2',
          ncrId: 'ncr-1',
          status: 'PENDING',
          requestedAt: new Date(),
        },
      ];

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR as any);
      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue(mockHistory as any);

      const result = await service.getApprovalHistory('ncr-1');

      expect(result.length).toBe(2);
    });

    it('should fail if NCR not found', async () => {
      mockPrisma.nCR.findUnique.mockResolvedValue(null);

      await expect(service.getApprovalHistory('ncr-invalid')).rejects.toThrow('NCR not found');
    });
  });

  describe('escalateOverdueApprovals', () => {
    it('should escalate approvals older than 24 hours', async () => {
      const mockApprovals = [
        {
          id: 'approval-1',
          requestedAt: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
          escalated: false,
        },
      ];

      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue(mockApprovals as any);
      mockPrisma.nCRApprovalRequest.update.mockResolvedValue({
        ...mockApprovals[0],
        escalated: true,
        escalatedAt: new Date(),
      } as any);

      const escalatedCount = await service.escalateOverdueApprovals();

      expect(escalatedCount).toBe(1);
      expect(mockPrisma.nCRApprovalRequest.update).toHaveBeenCalled();
    });

    it('should not escalate recent approvals', async () => {
      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue([]);

      const escalatedCount = await service.escalateOverdueApprovals();

      expect(escalatedCount).toBe(0);
    });
  });

  describe('getApprovalStatistics', () => {
    it('should calculate approval statistics', async () => {
      mockPrisma.nCRApprovalRequest.count = jest.fn((query) => {
        if ((query as any).where?.status === 'PENDING') return 5;
        if ((query as any).where?.status === 'APPROVED') return 20;
        if ((query as any).where?.status === 'REJECTED') return 2;
        if ((query as any).where?.status === 'DELEGATED') return 1;
        return 0;
      }) as any;

      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue([
        {
          requestedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          approvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        },
        {
          requestedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          approvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
      ] as any);

      const stats = await service.getApprovalStatistics();

      expect(stats.totalPending).toBe(5);
      expect(stats.totalApproved).toBe(20);
      expect(stats.totalRejected).toBe(2);
      expect(stats.totalDelegated).toBe(1);
      expect(stats.averageApprovalTime).toBeGreaterThan(0);
    });

    it('should calculate overdue pending count', async () => {
      mockPrisma.nCRApprovalRequest.count = jest.fn((query) => {
        if ((query as any).where?.status === 'PENDING') {
          if ((query as any).where?.requestedAt?.lt) return 3; // overdue
        }
        return 0;
      }) as any;

      mockPrisma.nCRApprovalRequest.findMany.mockResolvedValue([]);

      const stats = await service.getApprovalStatistics();

      expect(stats.overduePending).toBe(3);
    });
  });

  describe('isApprovalRequired', () => {
    it('should return true for state transitions', () => {
      const required = service.isApprovalRequired('STATE_TRANSITION');
      expect(required).toBe(true);
    });

    it('should return true for CTP authorizations', () => {
      const required = service.isApprovalRequired('CTP_AUTHORIZATION');
      expect(required).toBe(true);
    });

    it('should return true for MRB decisions', () => {
      const required = service.isApprovalRequired('MRB_DECISION');
      expect(required).toBe(true);
    });

    it('should return true for closures', () => {
      const required = service.isApprovalRequired('CLOSURE');
      expect(required).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors in createApprovalRequest', async () => {
      mockPrisma.nCR.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(
        service.createApprovalRequest('ncr-1', 'STATE_TRANSITION', 'user-1', 'user-2')
      ).rejects.toThrow();
    });

    it('should handle database errors in approveRequest', async () => {
      mockPrisma.nCRApprovalRequest.findUnique.mockRejectedValue(new Error('Database error'));

      await expect(service.approveRequest('approval-1', 'user-2')).rejects.toThrow();
    });
  });
});
