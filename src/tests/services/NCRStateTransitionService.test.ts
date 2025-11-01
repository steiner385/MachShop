/**
 * NCR State Transition Service Tests
 *
 * Test coverage for:
 * - State transitions with validation
 * - Required field checking
 * - Approval requirement detection
 * - Available transition retrieval
 * - Transition authorization checks
 */

import { NCRStateTransitionService } from '../../services/NCRStateTransitionService';
import { NCRStatus } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

// Mock Prisma client
jest.mock('@prisma/client');

describe('NCRStateTransitionService', () => {
  let service: NCRStateTransitionService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockPrisma = {
      nCR: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      nCRStateHistory: {
        create: jest.fn(),
      },
      nCRApprovalRequest: {
        create: jest.fn(),
      },
    } as any;

    service = new NCRStateTransitionService();
    (service as any).prisma = mockPrisma;
  });

  describe('executeTransition', () => {
    it('should successfully transition from DRAFT to SUBMITTED', async () => {
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-001',
        status: NCRStatus.DRAFT,
        partNumber: 'PART-001',
        defectType: 'DIMENSIONAL',
        description: 'Test defect',
        severity: 'HIGH',
      };

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);
      mockPrisma.nCR.update.mockResolvedValue({
        ...mockNCR,
        status: NCRStatus.SUBMITTED,
      });

      const result = await service.executeTransition({
        ncrId: 'ncr-1',
        fromState: NCRStatus.DRAFT,
        toState: NCRStatus.SUBMITTED,
        userId: 'user-1',
        reason: 'Test transition',
      });

      expect(result.success).toBe(true);
      expect(result.toState).toBe(NCRStatus.SUBMITTED);
      expect(mockPrisma.nCR.update).toHaveBeenCalled();
    });

    it('should fail if NCR not found', async () => {
      mockPrisma.nCR.findUnique.mockResolvedValue(null);

      const result = await service.executeTransition({
        ncrId: 'ncr-invalid',
        fromState: NCRStatus.DRAFT,
        toState: NCRStatus.SUBMITTED,
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('NCR not found');
    });

    it('should fail if current state does not match expected state', async () => {
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-001',
        status: NCRStatus.SUBMITTED, // Current state is SUBMITTED
      };

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);

      const result = await service.executeTransition({
        ncrId: 'ncr-1',
        fromState: NCRStatus.DRAFT, // But we expect DRAFT
        toState: NCRStatus.UNDER_INVESTIGATION,
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid state transition');
    });

    it('should fail if required fields are missing', async () => {
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-001',
        status: NCRStatus.UNDER_INVESTIGATION,
        // Missing 'rootCauseId' which is required for transition to PENDING_DISPOSITION
      };

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);

      const result = await service.executeTransition({
        ncrId: 'ncr-1',
        fromState: NCRStatus.UNDER_INVESTIGATION,
        toState: NCRStatus.PENDING_DISPOSITION,
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Required field missing: rootCauseId');
    });

    it('should create approval request for transitions requiring approval', async () => {
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-001',
        status: NCRStatus.SUBMITTED,
      };

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);
      mockPrisma.nCRApprovalRequest.create.mockResolvedValue({
        id: 'approval-1',
        ncrId: 'ncr-1',
        status: 'PENDING',
      });

      const result = await service.executeTransition({
        ncrId: 'ncr-1',
        fromState: NCRStatus.SUBMITTED,
        toState: NCRStatus.UNDER_INVESTIGATION,
        userId: 'user-1',
      });

      expect(result.approvalRequired).toBe(true);
      expect(mockPrisma.nCRApprovalRequest.create).toHaveBeenCalled();
    });

    it('should skip approval for transitions that auto-approve', async () => {
      const mockNCR = {
        id: 'ncr-1',
        ncrNumber: 'NCR-001',
        status: NCRStatus.MRB,
        mrbDecision: 'APPROVE',
        disposition: 'REWORK',
      };

      mockPrisma.nCR.findUnique.mockResolvedValue(mockNCR);
      mockPrisma.nCR.update.mockResolvedValue({
        ...mockNCR,
        status: NCRStatus.CLOSED,
      });

      const result = await service.executeTransition({
        ncrId: 'ncr-1',
        fromState: NCRStatus.MRB,
        toState: NCRStatus.CLOSED,
        userId: 'user-1',
        autoApprove: true,
      });

      expect(result.success).toBe(true);
      expect(result.approvalRequired).toBeUndefined();
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for DRAFT state', () => {
      const transitions = service.getAvailableTransitions(NCRStatus.DRAFT);

      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.some((t) => t.to === NCRStatus.SUBMITTED)).toBe(true);
      expect(transitions.some((t) => t.to === NCRStatus.CANCELLED)).toBe(true);
    });

    it('should return available transitions for PENDING_DISPOSITION state', () => {
      const transitions = service.getAvailableTransitions(NCRStatus.PENDING_DISPOSITION);

      expect(transitions.length).toBeGreaterThan(0);
      expect(transitions.some((t) => t.to === NCRStatus.CTP)).toBe(true);
      expect(transitions.some((t) => t.to === NCRStatus.DDR)).toBe(true);
      expect(transitions.some((t) => t.to === NCRStatus.MRB)).toBe(true);
    });

    it('should return empty array for unknown state', () => {
      const transitions = service.getAvailableTransitions('UNKNOWN' as NCRStatus);
      expect(transitions.length).toBe(0);
    });
  });

  describe('isTransitionAllowed', () => {
    it('should return true for allowed transitions', () => {
      const isAllowed = service.isTransitionAllowed(NCRStatus.DRAFT, NCRStatus.SUBMITTED);
      expect(isAllowed).toBe(true);
    });

    it('should return false for disallowed transitions', () => {
      const isAllowed = service.isTransitionAllowed(NCRStatus.DRAFT, NCRStatus.CLOSED);
      expect(isAllowed).toBe(false);
    });

    it('should return false if from state has no transitions', () => {
      const isAllowed = service.isTransitionAllowed('INVALID' as NCRStatus, NCRStatus.SUBMITTED);
      expect(isAllowed).toBe(false);
    });
  });

  describe('getTransitionConfig', () => {
    it('should return transition configuration', () => {
      const config = service.getTransitionConfig(NCRStatus.DRAFT, NCRStatus.SUBMITTED);

      expect(config).toBeDefined();
      expect(config?.from).toBe(NCRStatus.DRAFT);
      expect(config?.to).toBe(NCRStatus.SUBMITTED);
      expect(config?.description).toBeDefined();
    });

    it('should return undefined for invalid transition', () => {
      const config = service.getTransitionConfig(NCRStatus.DRAFT, NCRStatus.CLOSED);
      expect(config).toBeUndefined();
    });

    it('should include required fields in configuration', () => {
      const config = service.getTransitionConfig(
        NCRStatus.UNDER_INVESTIGATION,
        NCRStatus.PENDING_DISPOSITION
      );

      expect(config?.requiredFields).toBeDefined();
      expect(Array.isArray(config?.requiredFields)).toBe(true);
    });

    it('should indicate approval requirement', () => {
      const config = service.getTransitionConfig(NCRStatus.SUBMITTED, NCRStatus.UNDER_INVESTIGATION);

      expect(config?.requiresApproval).toBeDefined();
    });
  });

  describe('validateRequiredFields', () => {
    it('should identify missing required fields', () => {
      const ncr = {
        partNumber: 'PART-001',
        // Missing 'defectType'
        // Missing 'description'
      };

      const errors = (service as any).validateRequiredFields(ncr, [
        'partNumber',
        'defectType',
        'description',
      ]);

      expect(errors.length).toBe(2);
      expect(errors).toContain('Required field missing: defectType');
      expect(errors).toContain('Required field missing: description');
    });

    it('should return empty array if all fields present', () => {
      const ncr = {
        partNumber: 'PART-001',
        defectType: 'DIMENSIONAL',
        description: 'Test defect',
      };

      const errors = (service as any).validateRequiredFields(ncr, [
        'partNumber',
        'defectType',
        'description',
      ]);

      expect(errors.length).toBe(0);
    });

    it('should handle empty required fields array', () => {
      const ncr = { partNumber: 'PART-001' };
      const errors = (service as any).validateRequiredFields(ncr, []);

      expect(errors.length).toBe(0);
    });
  });

  describe('State machine coverage', () => {
    it('should support all aerospace quality states', () => {
      const states = [
        NCRStatus.DRAFT,
        NCRStatus.SUBMITTED,
        NCRStatus.UNDER_INVESTIGATION,
        NCRStatus.CONTAINMENT,
        NCRStatus.PENDING_DISPOSITION,
        NCRStatus.CTP,
        NCRStatus.DDR,
        NCRStatus.MRB,
        NCRStatus.CORRECTIVE_ACTION,
        NCRStatus.VERIFICATION,
        NCRStatus.CLOSED,
        NCRStatus.CANCELLED,
      ];

      states.forEach((state) => {
        const transitions = service.getAvailableTransitions(state);
        // Most states should have at least one available transition
        // (except final states)
        if (state !== NCRStatus.CLOSED && state !== NCRStatus.CANCELLED) {
          expect(transitions.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.nCR.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.executeTransition({
        ncrId: 'ncr-1',
        fromState: NCRStatus.DRAFT,
        toState: NCRStatus.SUBMITTED,
        userId: 'user-1',
      });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });
});
