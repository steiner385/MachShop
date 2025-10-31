/**
 * Time Entry Management API Integration Tests
 * Comprehensive integration tests for time entry management endpoints
 *
 * GitHub Issue #51: Time Entry Management & Approvals System
 */

import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import request from 'supertest';
import express from 'express';
import timeEntryManagementRoutes from '../../routes/timeEntryManagement';
import { timeEntryEditService } from '../../services/TimeEntryEditService';
import { timeEntryApprovalService } from '../../services/TimeEntryApprovalService';
import { autoStopService } from '../../services/AutoStopService';
import prisma from '../../lib/database';

// Mock services
vi.mock('../../services/TimeEntryEditService');
vi.mock('../../services/TimeEntryApprovalService');
vi.mock('../../services/AutoStopService');
vi.mock('../../lib/database');

// Mock middleware
vi.mock('../../middleware/auth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    req.user = { id: 'user-1', username: 'testuser' };
    next();
  },
  requirePermission: (permission: string) => (req: any, res: any, next: any) => next(),
}));

describe('Time Entry Management API', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/v1/time-entry-management', timeEntryManagementRoutes);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('POST /api/v1/time-entry-management/edits', () => {
    const validEditRequest = {
      timeEntryId: 'entry-1',
      timeEntryType: 'LABOR',
      editType: 'MODIFIED',
      originalValues: { duration: 8.0 },
      newValues: { duration: 8.25 },
      changedFields: ['duration'],
      reason: 'Forgot to clock out for break',
      reasonCategory: 'TIME_CORRECTION',
    };

    it('should create a time entry edit successfully', async () => {
      const mockEdit = {
        id: 'edit-1',
        ...validEditRequest,
        editedBy: 'user-1',
        approvalStatus: 'AUTO_APPROVED',
        autoApproved: true,
      };

      (timeEntryEditService.createEdit as Mock).mockResolvedValue(mockEdit);

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send(validEditRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockEdit,
        message: 'Time entry edit created successfully'
      });

      expect(timeEntryEditService.createEdit).toHaveBeenCalledWith({
        ...validEditRequest,
        editedBy: 'user-1',
      });
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        timeEntryId: 'entry-1',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('validation');
    });

    it('should handle service errors', async () => {
      (timeEntryEditService.createEdit as Mock).mockRejectedValue(
        new Error('Time entry is locked')
      );

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send(validEditRequest)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Time entry is locked'
      });
    });

    it('should validate enum values', async () => {
      const invalidEnumRequest = {
        ...validEditRequest,
        timeEntryType: 'INVALID_TYPE',
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send(invalidEnumRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate array lengths for changed fields', async () => {
      const emptyFieldsRequest = {
        ...validEditRequest,
        changedFields: [],
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send(emptyFieldsRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/time-entry-management/edits/bulk', () => {
    const validBulkRequest = {
      timeEntryIds: ['entry-1', 'entry-2', 'entry-3'],
      timeEntryType: 'LABOR',
      editType: 'MODIFIED',
      newValues: { laborRate: 26.0 },
      reason: 'Rate adjustment for all entries',
      reasonCategory: 'RATE_ADJUSTMENT',
    };

    it('should create bulk edits successfully', async () => {
      const mockEdits = [
        { id: 'edit-1', timeEntryId: 'entry-1' },
        { id: 'edit-2', timeEntryId: 'entry-2' },
        { id: 'edit-3', timeEntryId: 'entry-3' },
      ];

      (timeEntryEditService.createEdit as Mock)
        .mockResolvedValueOnce(mockEdits[0])
        .mockResolvedValueOnce(mockEdits[1])
        .mockResolvedValueOnce(mockEdits[2]);

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits/bulk')
        .send(validBulkRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { edits: mockEdits, count: 3 },
        message: 'Successfully created 3 bulk edits'
      });

      expect(timeEntryEditService.createEdit).toHaveBeenCalledTimes(3);
    });

    it('should validate bulk request limits', async () => {
      const oversizedRequest = {
        ...validBulkRequest,
        timeEntryIds: Array.from({ length: 51 }, (_, i) => `entry-${i}`),
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits/bulk')
        .send(oversizedRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require minimum entries', async () => {
      const emptyRequest = {
        ...validBulkRequest,
        timeEntryIds: [],
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits/bulk')
        .send(emptyRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/time-entry-management/split', () => {
    const validSplitRequest = {
      timeEntryId: 'entry-1',
      timeEntryType: 'LABOR',
      splitPoints: [
        {
          endTime: '2023-01-01T13:00:00Z',
          workOrderId: 'wo-1',
        },
        {
          endTime: '2023-01-01T17:00:00Z',
          workOrderId: 'wo-2',
        },
      ],
      reason: 'Split between different work orders',
    };

    it('should split time entry successfully', async () => {
      const mockSplitEdits = [
        { id: 'edit-1', editType: 'SPLIT' },
        { id: 'edit-2', editType: 'SPLIT' },
        { id: 'edit-3', editType: 'SPLIT' },
      ];

      (timeEntryEditService.splitTimeEntry as Mock).mockResolvedValue(mockSplitEdits);

      const response = await request(app)
        .post('/api/v1/time-entry-management/split')
        .send(validSplitRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: { edits: mockSplitEdits, count: 3 },
        message: 'Time entry split successfully'
      });

      expect(timeEntryEditService.splitTimeEntry).toHaveBeenCalledWith({
        ...validSplitRequest,
        editedBy: 'user-1',
        splitPoints: expect.arrayContaining([
          expect.objectContaining({
            endTime: new Date('2023-01-01T13:00:00Z'),
          }),
        ]),
      });
    });

    it('should validate split points array', async () => {
      const invalidSplitRequest = {
        ...validSplitRequest,
        splitPoints: [], // Empty array
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/split')
        .send(invalidSplitRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should limit maximum split points', async () => {
      const tooManySplitsRequest = {
        ...validSplitRequest,
        splitPoints: Array.from({ length: 11 }, (_, i) => ({
          endTime: `2023-01-01T${10 + i}:00:00Z`,
          workOrderId: `wo-${i}`,
        })),
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/split')
        .send(tooManySplitsRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/time-entry-management/pending-approvals', () => {
    const mockPendingApprovals = {
      edits: [
        {
          id: 'edit-1',
          timeEntryId: 'entry-1',
          approvalStatus: 'PENDING',
          riskScore: 45,
          editor: { firstName: 'John', lastName: 'Doe' },
        },
        {
          id: 'edit-2',
          timeEntryId: 'entry-2',
          approvalStatus: 'PENDING',
          riskScore: 15,
          editor: { firstName: 'Jane', lastName: 'Smith' },
        },
      ],
      total: 2,
      hasMore: false,
      delegations: [],
    };

    it('should return pending approvals', async () => {
      (timeEntryApprovalService.getPendingApprovalsForSupervisor as Mock)
        .mockResolvedValue(mockPendingApprovals);

      const response = await request(app)
        .get('/api/v1/time-entry-management/pending-approvals')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPendingApprovals,
        message: 'Pending approvals retrieved successfully'
      });

      expect(timeEntryApprovalService.getPendingApprovalsForSupervisor)
        .toHaveBeenCalledWith('user-1', expect.objectContaining({
          filters: expect.any(Object),
        }));
    });

    it('should apply query filters', async () => {
      await request(app)
        .get('/api/v1/time-entry-management/pending-approvals')
        .query({
          siteId: 'site-1',
          sortBy: 'priority',
          riskScoreMin: '30',
          riskScoreMax: '80',
          editType: 'MODIFIED,SPLIT',
        })
        .expect(200);

      expect(timeEntryApprovalService.getPendingApprovalsForSupervisor)
        .toHaveBeenCalledWith('user-1', expect.objectContaining({
          siteId: 'site-1',
          sortBy: 'priority',
          filters: expect.objectContaining({
            riskScore: { min: 30, max: 80 },
            editType: ['MODIFIED', 'SPLIT'],
          }),
        }));
    });

    it('should handle pagination parameters', async () => {
      await request(app)
        .get('/api/v1/time-entry-management/pending-approvals')
        .query({
          limit: '25',
          offset: '50',
        })
        .expect(200);

      expect(timeEntryApprovalService.getPendingApprovalsForSupervisor)
        .toHaveBeenCalledWith('user-1', expect.objectContaining({
          limit: 25,
          offset: 50,
        }));
    });
  });

  describe('POST /api/v1/time-entry-management/approvals/:editId', () => {
    const mockApproval = {
      id: 'approval-1',
      timeEntryEditId: 'edit-1',
      approverUserId: 'user-1',
      status: 'APPROVED',
      approvalNotes: 'Looks good',
    };

    it('should process approval successfully', async () => {
      (timeEntryApprovalService.processApproval as Mock).mockResolvedValue(mockApproval);

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/edit-1')
        .send({
          status: 'APPROVED',
          approvalNotes: 'Looks good',
        })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockApproval,
        message: 'Edit approved successfully'
      });

      expect(timeEntryApprovalService.processApproval).toHaveBeenCalledWith({
        timeEntryEditId: 'edit-1',
        approverUserId: 'user-1',
        status: 'APPROVED',
        approvalNotes: 'Looks good',
      });
    });

    it('should handle rejection with notes', async () => {
      const rejectionApproval = {
        ...mockApproval,
        status: 'REJECTED',
        approvalNotes: 'Insufficient justification',
      };

      (timeEntryApprovalService.processApproval as Mock).mockResolvedValue(rejectionApproval);

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/edit-1')
        .send({
          status: 'REJECTED',
          approvalNotes: 'Insufficient justification',
        })
        .expect(201);

      expect(response.body.message).toBe('Edit rejected successfully');
    });

    it('should validate approval status enum', async () => {
      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/edit-1')
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/time-entry-management/approvals/bulk', () => {
    const validBulkApprovalRequest = {
      timeEntryEditIds: ['edit-1', 'edit-2', 'edit-3'],
      status: 'APPROVED',
      approvalNotes: 'Bulk approval for routine corrections',
      batchName: 'Daily Approvals',
    };

    it('should process bulk approval successfully', async () => {
      const mockBatch = {
        id: 'batch-1',
        batchName: 'Daily Approvals',
        status: 'COMPLETED',
        successCount: 3,
        errorCount: 0,
        processor: { id: 'user-1', firstName: 'John', lastName: 'Doe' },
      };

      (timeEntryApprovalService.processBulkApproval as Mock).mockResolvedValue(mockBatch);

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/bulk')
        .send(validBulkApprovalRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockBatch,
        message: 'Bulk approved processed successfully'
      });

      expect(timeEntryApprovalService.processBulkApproval).toHaveBeenCalledWith({
        ...validBulkApprovalRequest,
        approverUserId: 'user-1',
      });
    });

    it('should validate bulk approval array size', async () => {
      const oversizedRequest = {
        ...validBulkApprovalRequest,
        timeEntryEditIds: Array.from({ length: 51 }, (_, i) => `edit-${i}`),
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/bulk')
        .send(oversizedRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should require at least one edit ID', async () => {
      const emptyRequest = {
        ...validBulkApprovalRequest,
        timeEntryEditIds: [],
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/bulk')
        .send(emptyRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/time-entry-management/approvals/:editId/escalate', () => {
    const validEscalationRequest = {
      toUserId: 'manager-1',
      reason: 'High value change requires manager approval',
      notes: 'Please review this significant adjustment',
    };

    it('should escalate approval successfully', async () => {
      const mockEscalatedEdit = {
        id: 'edit-1',
        approvalStatus: 'ESCALATED',
        escalatedTo: 'manager-1',
        escalatedAt: new Date(),
      };

      (timeEntryApprovalService.escalateApproval as Mock).mockResolvedValue(mockEscalatedEdit);

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/edit-1/escalate')
        .send(validEscalationRequest)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockEscalatedEdit,
        message: 'Approval escalated successfully'
      });

      expect(timeEntryApprovalService.escalateApproval).toHaveBeenCalledWith({
        timeEntryEditId: 'edit-1',
        fromUserId: 'user-1',
        ...validEscalationRequest,
      });
    });

    it('should require escalation reason', async () => {
      const invalidRequest = {
        toUserId: 'manager-1',
        // Missing reason
      };

      const response = await request(app)
        .post('/api/v1/time-entry-management/approvals/edit-1/escalate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/time-entry-management/metrics', () => {
    const mockMetrics = {
      pendingCount: 5,
      averageApprovalTime: 2.5,
      approvalRate: 0.85,
      escalationRate: 0.1,
      autoApprovalRate: 0.65,
      oldestPendingDays: 3,
      byApprover: [
        {
          approverId: 'supervisor-1',
          approverName: 'Jane Smith',
          pendingCount: 3,
          avgTimeHours: 1.5,
          approvalRate: 0.9,
        },
      ],
    };

    it('should return approval metrics', async () => {
      (timeEntryApprovalService.getApprovalMetrics as Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/v1/time-entry-management/metrics')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMetrics,
        message: 'Approval metrics retrieved successfully'
      });

      expect(timeEntryApprovalService.getApprovalMetrics).toHaveBeenCalledWith(
        'user-1',
        undefined,
        undefined
      );
    });

    it('should apply date range filters', async () => {
      await request(app)
        .get('/api/v1/time-entry-management/metrics')
        .query({
          siteId: 'site-1',
          startDate: '2023-01-01T00:00:00Z',
          endDate: '2023-01-31T23:59:59Z',
        })
        .expect(200);

      expect(timeEntryApprovalService.getApprovalMetrics).toHaveBeenCalledWith(
        'user-1',
        'site-1',
        {
          start: new Date('2023-01-01T00:00:00Z'),
          end: new Date('2023-01-31T23:59:59Z'),
        }
      );
    });
  });

  describe('Auto-Stop Endpoints', () => {
    describe('POST /api/v1/time-entry-management/auto-stop/start', () => {
      it('should start auto-stop monitoring', async () => {
        const startSpy = vi.spyOn(autoStopService, 'startMonitoring').mockImplementation(() => {});

        const response = await request(app)
          .post('/api/v1/time-entry-management/auto-stop/start')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Auto-stop monitoring started'
        });

        expect(startSpy).toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/time-entry-management/auto-stop/stop', () => {
      it('should stop auto-stop monitoring', async () => {
        const stopSpy = vi.spyOn(autoStopService, 'stopMonitoring').mockImplementation(() => {});

        const response = await request(app)
          .post('/api/v1/time-entry-management/auto-stop/stop')
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Auto-stop monitoring stopped'
        });

        expect(stopSpy).toHaveBeenCalled();
      });
    });

    describe('POST /api/v1/time-entry-management/auto-stop/respond/:timeEntryId', () => {
      it('should process auto-stop response', async () => {
        (autoStopService.processOperatorResponse as Mock).mockResolvedValue(undefined);

        const response = await request(app)
          .post('/api/v1/time-entry-management/auto-stop/respond/entry-1')
          .send({
            response: 'CONTINUE',
            extensionMinutes: 60,
            reason: 'Need to finish current task',
          })
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: 'Auto-stop response processed successfully'
        });

        expect(autoStopService.processOperatorResponse).toHaveBeenCalledWith({
          timeEntryId: 'entry-1',
          response: 'CONTINUE',
          extensionMinutes: 60,
          reason: 'Need to finish current task',
          userId: 'user-1',
        });
      });

      it('should validate response enum', async () => {
        const response = await request(app)
          .post('/api/v1/time-entry-management/auto-stop/respond/entry-1')
          .send({
            response: 'INVALID_RESPONSE',
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });

      it('should validate extension minutes range', async () => {
        const response = await request(app)
          .post('/api/v1/time-entry-management/auto-stop/respond/entry-1')
          .send({
            response: 'EXTEND',
            extensionMinutes: 1000, // Too high
          })
          .expect(400);

        expect(response.body.success).toBe(false);
      });
    });
  });

  describe('GET /api/v1/time-entry-management/edits/:editId', () => {
    const mockEdit = {
      id: 'edit-1',
      timeEntryId: 'entry-1',
      editType: 'MODIFIED',
      reason: 'Time correction',
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

    it('should return edit details', async () => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(mockEdit);

      const response = await request(app)
        .get('/api/v1/time-entry-management/edits/edit-1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockEdit,
        message: 'Edit details retrieved successfully'
      });

      expect(prisma.timeEntryEdit.findUnique).toHaveBeenCalledWith({
        where: { id: 'edit-1' },
        include: expect.objectContaining({
          editor: expect.any(Object),
          laborTimeEntry: expect.any(Object),
          approvals: expect.any(Object),
        }),
      });
    });

    it('should handle non-existent edit', async () => {
      (prisma.timeEntryEdit.findUnique as Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/time-entry-management/edits/edit-1')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Edit not found'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      (timeEntryEditService.createEdit as Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send({
          timeEntryId: 'entry-1',
          timeEntryType: 'LABOR',
          editType: 'MODIFIED',
          originalValues: {},
          newValues: {},
          changedFields: ['duration'],
          reason: 'Test',
          reasonCategory: 'TIME_CORRECTION',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Database connection failed');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/v1/time-entry-management/edits')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle service unavailable errors gracefully', async () => {
      (autoStopService.startMonitoring as any) = vi.fn().mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .post('/api/v1/time-entry-management/auto-stop/start')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Service unavailable');
    });
  });
});