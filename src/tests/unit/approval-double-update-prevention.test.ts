/**
 * Regression Tests: Prevent Double Database Updates in Approval Services
 *
 * These tests ensure that services using the unified workflow engine do not
 * perform redundant database updates that could cause:
 * - State conflicts
 * - Audit trail confusion
 * - Performance overhead
 * - Inconsistent entity status
 *
 * Issue: Services were calling unified approval service AND manually updating
 * entity status, causing double updates for the same approval action.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WorkInstructionService } from '../../services/WorkInstructionService';
import { FAIService } from '../../services/FAIService';
import { QualityService } from '../../services/QualityService';
import { ReviewService } from '../../services/ReviewService';

// Mock UnifiedApprovalIntegration first
vi.mock('../../services/UnifiedApprovalIntegration', () => {
  const mockUnifiedApprovalService = {
    initialize: vi.fn(),
    approveWorkInstruction: vi.fn(),
    approveFAIReport: vi.fn(),
    approveQualityProcess: vi.fn(),
    processApprovalAction: vi.fn(),
    getApprovalStatus: vi.fn(),
  };
  return {
    UnifiedApprovalIntegration: vi.fn(() => mockUnifiedApprovalService),
  };
});

// Mock Prisma
// Mock the database module
vi.mock('../../lib/database', () => ({
  default: mockPrisma,
}));

describe('Approval Double Update Prevention Tests', () => {
  let workInstructionService: WorkInstructionService;
  let faiService: FAIService;
  let qualityService: QualityService;
  let reviewService: ReviewService;

  beforeEach(() => {
    workInstructionService = new WorkInstructionService();
    faiService = new FAIService();
    qualityService = new QualityService();
    reviewService = new ReviewService();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkInstructionService Approval', () => {
    it('should NOT perform double updates when approving work instruction', async () => {
      const workInstructionId = 'wi-123';
      const userId = 'user-456';
      const comments = 'Approved for production';

      // Mock unified approval service success
      mockUnifiedApprovalService.approveWorkInstruction.mockResolvedValue({
        success: true,
        workflowInstanceId: 'workflow-789',
        message: 'Work instruction approved successfully',
      });

      // Mock the findUnique call (for fetching after approval)
      const mockWorkInstruction = {
        id: workInstructionId,
        status: 'APPROVED',
        approvedById: userId,
        approvedAt: new Date(),
        title: 'Test Work Instruction',
        steps: [],
        createdBy: { id: userId, username: 'testuser', firstName: 'Test', lastName: 'User' },
        updatedBy: { id: userId, username: 'testuser', firstName: 'Test', lastName: 'User' },
        approvedBy: { id: userId, username: 'testuser', firstName: 'Test', lastName: 'User' },
      };
      mockPrisma.workInstruction.findUnique.mockResolvedValue(mockWorkInstruction);

      // Execute approval
      const result = await workInstructionService.approveWorkInstruction(
        workInstructionId,
        userId,
        comments
      );

      // ✅ CRITICAL ASSERTION: Unified approval service should be called
      expect(mockUnifiedApprovalService.approveWorkInstruction).toHaveBeenCalledWith(
        workInstructionId,
        userId,
        comments
      );

      // ✅ CRITICAL ASSERTION: Should use findUnique (read-only) NOT update
      expect(mockPrisma.workInstruction.findUnique).toHaveBeenCalledWith({
        where: { id: workInstructionId },
        include: expect.any(Object),
      });

      // ❌ REGRESSION TEST: Should NOT call update (that would be double update)
      expect(mockPrisma.workInstruction.update).NOT.toHaveBeenCalled();

      // Verify result
      expect(result).toBeDefined();
      expect(result.id).toBe(workInstructionId);
    });

    it('should NOT perform double updates when rejecting work instruction', async () => {
      const workInstructionId = 'wi-123';
      const userId = 'user-456';
      const rejectionReason = 'Safety concerns';
      const comments = 'Needs revision';

      // Mock unified approval service success
      mockUnifiedApprovalService.processApprovalAction.mockResolvedValue({
        success: true,
        workflowInstanceId: 'workflow-789',
        message: 'Work instruction rejected successfully',
      });

      // Mock user lookup
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      });

      // Mock current work instruction (for approval history)
      mockPrisma.workInstruction.findUnique.mockResolvedValue({
        id: workInstructionId,
        approvalHistory: [],
      });

      // Mock the update call (only for approval history, not status)
      const mockUpdatedWorkInstruction = {
        id: workInstructionId,
        status: 'REJECTED',
        approvalHistory: [expect.any(Object)],
        createdBy: { id: userId, username: 'testuser', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
        updatedBy: { id: userId, username: 'testuser', firstName: 'Test', lastName: 'User' },
        approvedBy: { id: userId, username: 'testuser', firstName: 'Test', lastName: 'User' },
        steps: [],
      };
      mockPrisma.workInstruction.update.mockResolvedValue(mockUpdatedWorkInstruction);

      // Execute rejection
      const result = await workInstructionService.rejectWorkInstruction(
        workInstructionId,
        userId,
        rejectionReason,
        comments
      );

      // ✅ CRITICAL ASSERTION: Unified approval service should be called for rejection
      expect(mockUnifiedApprovalService.processApprovalAction).toHaveBeenCalledWith(
        'WORK_INSTRUCTION',
        workInstructionId,
        'REJECT',
        userId,
        `${rejectionReason}: ${comments}`
      );

      // ✅ ACCEPTABLE: Update call should ONLY modify approval history, NOT status
      expect(mockPrisma.workInstruction.update).toHaveBeenCalledWith({
        where: { id: workInstructionId },
        data: {
          approvalHistory: expect.any(Array), // Only updating history
          // ❌ Should NOT include status: 'REJECTED' (that's handled by unified service)
        },
        include: expect.any(Object),
      });

      // Verify that status update is NOT in the data
      const updateCall = mockPrisma.workInstruction.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('status');
      expect(updateCall.data).not.toHaveProperty('rejectedById');
      expect(updateCall.data).not.toHaveProperty('rejectedAt');

      expect(result).toBeDefined();
    });
  });

  describe('FAIService Approval', () => {
    it('should NOT perform double updates when approving FAI report', async () => {
      const faiReportId = 'fai-123';
      const approvedById = 'user-456';
      const comments = 'All measurements within tolerance';

      // Mock FAI report with characteristics
      const mockFAIReport = {
        id: faiReportId,
        characteristics: [
          { id: 'char-1', actualValue: '10.5', result: 'PASS' },
          { id: 'char-2', actualValue: '20.2', result: 'PASS' },
        ],
      };
      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);

      // Mock unified approval service success
      mockUnifiedApprovalService.approveFAIReport.mockResolvedValue({
        success: true,
        workflowInstanceId: 'workflow-789',
        requiresSignature: true,
        message: 'FAI report approved with electronic signature',
      });

      // Mock the findUnique call (for fetching after approval)
      const mockUpdatedFAIReport = {
        ...mockFAIReport,
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
      };
      mockPrisma.fAIReport.findUnique.mockResolvedValueOnce(mockFAIReport);
      mockPrisma.fAIReport.findUnique.mockResolvedValueOnce(mockUpdatedFAIReport);

      // Execute approval
      const result = await faiService.approveFAIReport(faiReportId, approvedById, comments);

      // ✅ CRITICAL ASSERTION: Unified approval service should be called with signature requirement
      expect(mockUnifiedApprovalService.approveFAIReport).toHaveBeenCalledWith(
        faiReportId,
        approvedById,
        comments,
        true // FAI always requires signature for regulatory compliance
      );

      // ✅ CRITICAL ASSERTION: Should use findUnique (read-only) NOT update
      expect(mockPrisma.fAIReport.findUnique).toHaveBeenCalledWith({
        where: { id: faiReportId },
        include: expect.any(Object),
      });

      // ❌ REGRESSION TEST: Should NOT call update (that would be double update)
      expect(mockPrisma.fAIReport.update).NOT.toHaveBeenCalled();

      expect(result).toBeDefined();
    });

    it('should NOT perform double updates when rejecting FAI report', async () => {
      const faiReportId = 'fai-123';
      const userId = 'user-456';
      const rejectionReason = 'Out of tolerance measurements';
      const comments = 'Multiple characteristics failed';

      // Mock unified approval service success
      mockUnifiedApprovalService.processApprovalAction.mockResolvedValue({
        success: true,
        workflowInstanceId: 'workflow-789',
        message: 'FAI report rejected successfully',
      });

      // Mock the findUnique call (for fetching after rejection)
      const mockRejectedFAIReport = {
        id: faiReportId,
        status: 'REJECTED',
        reviewedById: userId,
        reviewedAt: new Date(),
        characteristics: [],
      };
      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockRejectedFAIReport);

      // Execute rejection
      const result = await faiService.rejectFAIReport(faiReportId, userId, rejectionReason, comments);

      // ✅ CRITICAL ASSERTION: Unified approval service should be called for rejection
      expect(mockUnifiedApprovalService.processApprovalAction).toHaveBeenCalledWith(
        'FAI_REPORT',
        faiReportId,
        'REJECT',
        userId,
        `${rejectionReason}: ${comments}`
      );

      // ✅ CRITICAL ASSERTION: Should use findUnique (read-only) NOT update
      expect(mockPrisma.fAIReport.findUnique).toHaveBeenCalledWith({
        where: { id: faiReportId },
        include: expect.any(Object),
      });

      // ❌ REGRESSION TEST: Should NOT call update (that would be double update)
      expect(mockPrisma.fAIReport.update).NOT.toHaveBeenCalled();

      expect(result).toBeDefined();
    });
  });

  describe('Database Call Counting Tests', () => {
    it('should make exactly ONE database write per approval (via unified service only)', async () => {
      const workInstructionId = 'wi-test';
      const userId = 'user-test';

      // Mock successful unified approval
      mockUnifiedApprovalService.approveWorkInstruction.mockResolvedValue({
        success: true,
        workflowInstanceId: 'workflow-test',
      });

      // Mock findUnique response
      mockPrisma.workInstruction.findUnique.mockResolvedValue({
        id: workInstructionId,
        status: 'APPROVED',
        approvedById: userId,
      });

      await workInstructionService.approveWorkInstruction(workInstructionId, userId);

      // ✅ ASSERTION: Should have exactly ONE write operation (via unified service)
      // The unified service handles the database write internally
      expect(mockUnifiedApprovalService.approveWorkInstruction).toHaveBeenCalledOnce();

      // ✅ ASSERTION: Service should only READ to return result
      expect(mockPrisma.workInstruction.findUnique).toHaveBeenCalledOnce();

      // ❌ REGRESSION: Should NOT have any additional writes
      expect(mockPrisma.workInstruction.update).NOT.toHaveBeenCalled();
    });

    it('should detect if any service attempts double status updates', async () => {
      // This test specifically looks for the anti-pattern we fixed
      const faiReportId = 'fai-test';
      const userId = 'user-test';

      // Mock approval and ensure the status update is handled by unified service
      mockUnifiedApprovalService.approveFAIReport.mockResolvedValue({
        success: true,
        workflowInstanceId: 'workflow-test',
      });

      mockPrisma.fAIReport.findUnique.mockResolvedValueOnce({
        id: faiReportId,
        characteristics: [{ actualValue: '10.0', result: 'PASS' }],
      });

      mockPrisma.fAIReport.findUnique.mockResolvedValueOnce({
        id: faiReportId,
        status: 'APPROVED',
        approvedById: userId,
        characteristics: [],
      });

      await faiService.approveFAIReport(faiReportId, userId);

      // Count total database operations
      const totalReads = mockPrisma.fAIReport.findUnique.mock.calls.length;
      const totalWrites = mockPrisma.fAIReport.update.mock.calls.length;
      const unifiedServiceCalls = mockUnifiedApprovalService.approveFAIReport.mock.calls.length;

      // ✅ EXPECTED PATTERN: Read for validation, unified service handles write, read for result
      expect(totalReads).toBe(2); // Initial validation + result fetch
      expect(totalWrites).toBe(0); // No direct writes
      expect(unifiedServiceCalls).toBe(1); // One unified service call

      // Log the pattern for debugging
      console.log('Database operation pattern:', {
        reads: totalReads,
        writes: totalWrites,
        unifiedServiceCalls,
        message: 'This should show 2 reads, 0 writes, 1 unified service call'
      });
    });
  });

  describe('Error Handling Without Double Updates', () => {
    it('should not attempt manual updates when unified service fails', async () => {
      const workInstructionId = 'wi-fail';
      const userId = 'user-fail';

      // Mock unified service failure
      mockUnifiedApprovalService.approveWorkInstruction.mockResolvedValue({
        success: false,
        error: 'Workflow validation failed',
      });

      // Attempt approval (should fail)
      await expect(
        workInstructionService.approveWorkInstruction(workInstructionId, userId)
      ).rejects.toThrow('Approval failed: Workflow validation failed');

      // ✅ CRITICAL ASSERTION: Should NOT attempt manual fallback update
      expect(mockPrisma.workInstruction.update).NOT.toHaveBeenCalled();
      expect(mockPrisma.workInstruction.findUnique).NOT.toHaveBeenCalled();
    });
  });
});