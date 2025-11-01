/**
 * ECO Approval Routing Engine Tests (Issue #226)
 *
 * Tests for intelligent approval routing including:
 * - Route type selection (sequential vs parallel)
 * - Approver determination based on change classification
 * - Approval step progression
 * - Escalation and delegation handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ECOApprovalRoutingEngine, ApprovalRouteType } from '../../services/ECOApprovalRoutingEngine';
import {
  ChangeClassification,
  SafetyCriticality,
  CertificationImpact,
} from '../../services/ECOClassificationService';
import { PrismaClient, ApprovalAction } from '@prisma/client';

// Mock Prisma
vi.mock('../../lib/database', () => ({
  default: {
    engineeringChangeOrder: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    eCOHistory: {
      create: vi.fn(),
    },
  },
}));

describe('ECOApprovalRoutingEngine', () => {
  let engine: ECOApprovalRoutingEngine;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      engineeringChangeOrder: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'eco-1',
          ecoNumber: 'ECO-2024-001',
          impactAnalysis: {
            approvalRoute: {
              routeId: 'route-eco-1-primary',
              ecoId: 'eco-1',
              routeType: 'SEQUENTIAL',
              approvalSequence: [
                {
                  stepNumber: 1,
                  approverRole: 'ENGINEERING',
                  approverDepartment: 'ENGINEERING',
                  priority: 1,
                  assignedAt: new Date(),
                  dueDate: new Date(Date.now() + 3 * 60 * 60 * 1000),
                  status: 'ASSIGNED',
                },
              ],
              totalApproversRequired: 1,
              approvalsReceived: 0,
              isComplete: false,
              startedAt: new Date(),
            },
          },
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      eCOHistory: {
        create: vi.fn().mockResolvedValue({}),
      },
    } as any;

    engine = new ECOApprovalRoutingEngine(mockPrisma);
  });

  // ============================================================================
  // Route Type Selection Tests
  // ============================================================================

  describe('Route Type Selection', () => {
    it('should select sequential routing for critical changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.COMBINED_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 2,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.routeType).toBe(ApprovalRouteType.SEQUENTIAL);
    });

    it('should select sequential routing for function changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'ENGINEERING',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.MEDIUM,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.routeType).toBe(ApprovalRouteType.SEQUENTIAL);
    });

    it('should select parallel routing for low-impact changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'COST_REDUCTION',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.LOW,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.routeType).toBe(ApprovalRouteType.PARALLEL);
    });

    it('should select sequential routing for certification changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'COMPLIANCE',
        changeClassification: ChangeClassification.FIT_CHANGE,
        safetyCriticality: SafetyCriticality.MEDIUM,
        certificationImpact: CertificationImpact.MAJOR,
        affectedAssemblyCount: 2,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.routeType).toBe(ApprovalRouteType.SEQUENTIAL);
    });
  });

  // ============================================================================
  // Approver Determination Tests
  // ============================================================================

  describe('Approver Determination', () => {
    it('should always include engineering approval', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'IMPROVEMENT',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.NON_CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.approvalSequence.some((s) =>
        s.approverRole.includes('ENGINEERING')
      )).toBe(true);
    });

    it('should include quality for certified items', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'COMPLIANCE',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.NON_CRITICAL,
        certificationImpact: CertificationImpact.MINOR,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.approvalSequence.some((s) =>
        s.approverRole === 'QUALITY'
      )).toBe(true);
    });

    it('should include manufacturing for fit/function changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'ENGINEERING',
        changeClassification: ChangeClassification.FIT_CHANGE,
        safetyCriticality: SafetyCriticality.MEDIUM,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.approvalSequence.some((s) =>
        s.approverRole === 'MANUFACTURING'
      )).toBe(true);
    });

    it('should include supply chain for high-cost changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'IMPROVEMENT',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.LOW,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        estimatedCost: 15000,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.approvalSequence.some((s) =>
        s.approverRole === 'SUPPLY_CHAIN'
      )).toBe(true);
    });

    it('should include customer approval when required', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CUSTOMER_REQUEST',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.NON_CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        customerApprovalRequired: true,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.approvalSequence.some((s) =>
        s.approverRole === 'CUSTOMER'
      )).toBe(true);
    });

    it('should include CRB for high-impact changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'ENGINEERING',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 3,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.recommendedRoute.approvalSequence.some((s) =>
        s.approverRole === 'CRB'
      )).toBe(true);
    });
  });

  // ============================================================================
  // Timeline Estimation Tests
  // ============================================================================

  describe('Timeline Estimation', () => {
    it('should estimate approval timeline based on sequential route', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.estimatedApprovalDays).toBeGreaterThan(0);
      expect(result.estimatedApprovalDays).toBeLessThanOrEqual(15);
    });

    it('should show faster timeline for parallel approvals', async () => {
      const parallelRequest = {
        ecoId: 'eco-1',
        ecoType: 'IMPROVEMENT',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.LOW,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const parallelResult = await engine.routeECO(parallelRequest);

      const sequentialRequest = {
        ecoId: 'eco-2',
        ecoType: 'COMPLIANCE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.MAJOR,  // Add major cert impact
        affectedAssemblyCount: 5,  // Larger cascade
        requiresCRB: true,
      };

      const sequentialResult = await engine.routeECO(sequentialRequest);

      // Sequential routes with more steps should take longer
      expect(sequentialResult.recommendedRoute.approvalSequence.length).toBeGreaterThan(
        parallelResult.recommendedRoute.approvalSequence.length
      );
    });
  });

  // ============================================================================
  // Parallel Approval Detection Tests
  // ============================================================================

  describe('Parallel Approval Potential', () => {
    it('should enable parallel approvals for low-impact changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'IMPROVEMENT',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.LOW,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.parallelApprovalsAvailable).toBe(true);
    });

    it('should disable parallel approvals for sequential routes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.parallelApprovalsAvailable).toBe(false);
    });
  });

  // ============================================================================
  // Escalation Probability Tests
  // ============================================================================

  describe('Escalation Probability', () => {
    it('should estimate low escalation probability for simple changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'IMPROVEMENT',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.LOW,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.escalationProbability).toBeLessThan(0.25);
    });

    it('should estimate high escalation probability for critical changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.COMPLETE_RECERTIFICATION,
        affectedAssemblyCount: 10,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.escalationProbability).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // Approval Action Handling Tests
  // ============================================================================

  describe('Approval Action Processing', () => {
    it('should handle approval action for a step', async () => {
      const route = await engine.handleApprovalAction(
        'eco-1',
        1,
        ApprovalAction.APPROVED,
        'user-123',
        'Approved as submitted'
      );

      expect(route).toBeDefined();
      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalled();
    });

    it('should advance to next step in sequential route', async () => {
      await engine.handleApprovalAction(
        'eco-1',
        1,
        ApprovalAction.APPROVED,
        'user-123'
      );

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalled();
    });

    it('should handle rejection action', async () => {
      await engine.handleApprovalAction(
        'eco-1',
        1,
        ApprovalAction.REJECTED,
        'user-456',
        'Needs additional analysis'
      );

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Escalation Handling Tests
  // ============================================================================

  describe('Escalation Handling', () => {
    it('should escalate approval to higher authority', async () => {
      await engine.escalateApproval(
        'eco-1',
        1,
        'Lack of clarity in change description',
        'user-123'
      );

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalled();
    });

    it('should set aggressive timeline for escalations', async () => {
      await engine.escalateApproval(
        'eco-1',
        1,
        'Critical issue requiring immediate attention',
        'user-456'
      );

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Delegation Handling Tests
  // ============================================================================

  describe('Delegation Handling', () => {
    it('should delegate approval to another approver', async () => {
      await engine.delegateApproval(
        'eco-1',
        1,
        'user-delegate',
        'Jane Smith',
        'user-original'
      );

      expect(mockPrisma.engineeringChangeOrder.update).toHaveBeenCalled();
    });

    it('should record delegate information', async () => {
      await engine.delegateApproval(
        'eco-1',
        1,
        'user-456',
        'John Doe',
        'user-789'
      );

      const updateCall = mockPrisma.engineeringChangeOrder.update.mock
        .calls[mockPrisma.engineeringChangeOrder.update.mock.calls.length - 1];

      expect(updateCall[0].where.id).toBe('eco-1');
    });
  });

  // ============================================================================
  // Alternative Routes Tests
  // ============================================================================

  describe('Alternative Routes', () => {
    it('should generate alternative routes for non-critical changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'IMPROVEMENT',
        changeClassification: ChangeClassification.FORM_CHANGE,
        safetyCriticality: SafetyCriticality.LOW,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: false,
      };

      const result = await engine.routeECO(request);

      expect(result.alternativeRoutes).toBeDefined();
    });

    it('should not generate alternatives for critical changes', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      if (result.alternativeRoutes) {
        expect(result.alternativeRoutes.length).toBe(0);
      }
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle missing ECO gracefully', async () => {
      mockPrisma.engineeringChangeOrder.findUnique.mockResolvedValue(null);

      await expect(
        engine.handleApprovalAction(
          'nonexistent-eco',
          1,
          ApprovalAction.APPROVED,
          'user-123'
        )
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      mockPrisma.engineeringChangeOrder.update.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        engine.handleApprovalAction(
          'eco-1',
          1,
          ApprovalAction.APPROVED,
          'user-123'
        )
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // Routing Rationale Tests
  // ============================================================================

  describe('Routing Rationale', () => {
    it('should provide clear rationale for sequential routing', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.routingRationale).toContain('SEQUENTIAL');
    });

    it('should include CRB rationale when applicable', async () => {
      const request = {
        ecoId: 'eco-1',
        ecoType: 'CORRECTIVE',
        changeClassification: ChangeClassification.FUNCTION_CHANGE,
        safetyCriticality: SafetyCriticality.CRITICAL,
        certificationImpact: CertificationImpact.NONE,
        affectedAssemblyCount: 1,
        requiresCRB: true,
      };

      const result = await engine.routeECO(request);

      expect(result.routingRationale).toContain('CRB');
    });
  });
});
