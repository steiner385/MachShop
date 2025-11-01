/**
 * WorkflowEnforcementService Unit Tests (Issue #41)
 * Tests for flexible workflow enforcement with STRICT/FLEXIBLE/HYBRID modes
 */

import { WorkflowEnforcementService } from '../../services/WorkflowEnforcementService';
import { WorkflowConfigurationService } from '../../services/WorkflowConfigurationService';
import { prisma } from '../../db/client';

describe('WorkflowEnforcementService', () => {
  let enforcementService: WorkflowEnforcementService;
  let configService: WorkflowConfigurationService;

  beforeAll(() => {
    configService = new WorkflowConfigurationService();
    enforcementService = new WorkflowEnforcementService(configService);
  });

  describe('canRecordPerformance', () => {
    it('should allow performance recording for IN_PROGRESS work order in STRICT mode', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        enforceStatusGating: true,
        enforceQualityChecks: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrder, 'findUnique').mockResolvedValue({
        id: 'wo123',
        status: 'IN_PROGRESS',
      } as any);

      const decision = await enforcementService.canRecordPerformance('wo123');

      expect(decision.allowed).toBe(true);
      expect(decision.warnings).toHaveLength(0);
      expect(decision.bypassesApplied).toHaveLength(0);
      expect(decision.enforcementChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Status Gating',
            enforced: true,
            passed: true,
          }),
        ])
      );
    });

    it('should reject performance recording for CREATED work order in STRICT mode', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        enforceStatusGating: true,
        enforceQualityChecks: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrder, 'findUnique').mockResolvedValue({
        id: 'wo123',
        status: 'CREATED',
      } as any);

      const decision = await enforcementService.canRecordPerformance('wo123');

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('CREATED');
      expect(decision.enforcementChecks[0].passed).toBe(false);
    });

    it('should allow performance recording for CREATED work order in FLEXIBLE mode with warning', async () => {
      const mockConfig = {
        mode: 'FLEXIBLE' as const,
        enforceStatusGating: false,
        enforceQualityChecks: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrder, 'findUnique').mockResolvedValue({
        id: 'wo123',
        status: 'CREATED',
      } as any);

      const decision = await enforcementService.canRecordPerformance('wo123');

      expect(decision.allowed).toBe(true);
      expect(decision.warnings.length).toBeGreaterThan(0);
      expect(decision.bypassesApplied).toContain('status_gating');
      expect(decision.configMode).toBe('FLEXIBLE');
    });

    it('should not found work order', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        enforceStatusGating: true,
        enforceQualityChecks: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrder, 'findUnique').mockResolvedValue(null);

      const decision = await enforcementService.canRecordPerformance('wo999');

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('not found');
    });
  });

  describe('canStartOperation', () => {
    it('should allow starting CREATED operation', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        enforceOperationSequence: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'CREATED',
      } as any);
      jest
        .spyOn(enforcementService, 'validatePrerequisites')
        .mockResolvedValue({
          valid: true,
          unmetPrerequisites: [],
          warnings: [],
          enforcementMode: 'STRICT',
        });

      const decision = await enforcementService.canStartOperation('wo123', 'op123');

      expect(decision.allowed).toBe(true);
      expect(decision.enforcementChecks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Operation Status',
            passed: true,
          }),
        ])
      );
    });

    it('should reject starting already IN_PROGRESS operation', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'IN_PROGRESS',
      } as any);

      const decision = await enforcementService.canStartOperation('wo123', 'op123');

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('IN_PROGRESS');
    });

    it('should enforce prerequisites in STRICT mode', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        enforceOperationSequence: true,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'CREATED',
      } as any);
      jest.spyOn(enforcementService, 'validatePrerequisites').mockResolvedValue({
        valid: false,
        unmetPrerequisites: [
          {
            prerequisiteOperationId: 'op122',
            prerequisiteOperationName: 'Setup',
            prerequisiteOperationSeq: 1,
            currentOperationSeq: 2,
            dependencyType: 'SEQUENTIAL',
            reason: 'Status is CREATED, must be COMPLETED',
          },
        ],
        warnings: [],
        enforcementMode: 'STRICT',
      });

      const decision = await enforcementService.canStartOperation('wo123', 'op123');

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('Unmet prerequisites');
    });

    it('should warn but allow prerequisites in FLEXIBLE mode', async () => {
      const mockConfig = {
        mode: 'FLEXIBLE' as const,
        enforceOperationSequence: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'CREATED',
      } as any);
      jest.spyOn(enforcementService, 'validatePrerequisites').mockResolvedValue({
        valid: true,
        unmetPrerequisites: [
          {
            prerequisiteOperationId: 'op122',
            prerequisiteOperationName: 'Setup',
            prerequisiteOperationSeq: 1,
            currentOperationSeq: 2,
            dependencyType: 'SEQUENTIAL',
            reason: 'Status is CREATED, must be COMPLETED',
          },
        ],
        warnings: ['1 prerequisite(s) not met, but allowed in FLEXIBLE mode'],
        enforcementMode: 'FLEXIBLE',
      });

      const decision = await enforcementService.canStartOperation('wo123', 'op123');

      expect(decision.allowed).toBe(true);
      expect(decision.warnings.length).toBeGreaterThan(0);
      expect(decision.bypassesApplied).toContain('operation_sequence');
    });
  });

  describe('canCompleteOperation', () => {
    it('should allow completing IN_PROGRESS operation without quality checks', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        enforceQualityChecks: false,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'IN_PROGRESS',
      } as any);

      const decision = await enforcementService.canCompleteOperation('wo123', 'op123');

      expect(decision.allowed).toBe(true);
    });

    it('should reject completing CREATED operation', async () => {
      const mockConfig = {
        mode: 'STRICT' as const,
        source: { site: {}, routing: undefined, workOrder: undefined },
      };

      jest.spyOn(configService, 'getEffectiveConfiguration').mockResolvedValue(mockConfig as any);
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'CREATED',
      } as any);

      const decision = await enforcementService.canCompleteOperation('wo123', 'op123');

      expect(decision.allowed).toBe(false);
      expect(decision.reason).toContain('CREATED');
    });
  });

  describe('validatePrerequisites', () => {
    it('should return valid when no prerequisites', async () => {
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockResolvedValue({
        id: 'op123',
        workOrderId: 'wo123',
        status: 'CREATED',
        routingOperation: {
          routingStep: {
            operation: { sequenceNumber: 2 },
            dependencies: [],
          },
        },
      } as any);

      const validation = await enforcementService.validatePrerequisites('wo123', 'op123', 'STRICT');

      expect(validation.valid).toBe(true);
      expect(validation.unmetPrerequisites).toHaveLength(0);
    });

    it('should identify unmet prerequisites', async () => {
      jest.spyOn(prisma.workOrderOperation, 'findUnique').mockImplementation(async (args: any) => {
        if (args.where.id === 'op123') {
          return {
            id: 'op123',
            workOrderId: 'wo123',
            status: 'CREATED',
            routingOperation: {
              routingStep: {
                operation: { operationName: 'Assembly', sequenceNumber: 2 },
                dependencies: [
                  {
                    prerequisiteStep: {
                      operation: { id: 'routing_op_setup', operationName: 'Setup', sequenceNumber: 1 },
                    },
                    dependencyType: 'SEQUENTIAL',
                  },
                ],
              },
            },
          };
        }
        return null;
      });

      jest.spyOn(prisma.workOrderOperation, 'findFirst').mockResolvedValue(null);

      const validation = await enforcementService.validatePrerequisites('wo123', 'op123', 'STRICT');

      expect(validation.valid).toBe(false);
      expect(validation.unmetPrerequisites.length).toBeGreaterThan(0);
      expect(validation.unmetPrerequisites[0].prerequisiteOperationName).toBe('Setup');
    });
  });

  describe('recordEnforcementBypass', () => {
    it('should record enforcement bypass in audit trail', async () => {
      const createSpy = jest.spyOn(prisma.workflowEnforcementAudit, 'create').mockResolvedValue({
        id: 'audit123',
      } as any);

      const enforcement = {
        allowed: true,
        warnings: ['Status gating bypassed'],
        configMode: 'FLEXIBLE',
        bypassesApplied: ['status_gating'],
        enforcementChecks: [],
      };

      await enforcementService.recordEnforcementBypass('wo123', 'op123', 'RECORD_PERFORMANCE', enforcement, 'user123');

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workOrderId: 'wo123',
            operationId: 'op123',
            action: 'RECORD_PERFORMANCE',
            enforcementMode: 'FLEXIBLE',
            bypassesApplied: ['status_gating'],
            userId: 'user123',
          }),
        })
      );
    });
  });

  describe('getAuditTrail', () => {
    it('should return audit trail for work order', async () => {
      const mockAuditTrail = [
        {
          id: 'audit1',
          workOrderId: 'wo123',
          action: 'RECORD_PERFORMANCE',
          enforcementMode: 'FLEXIBLE',
          timestamp: new Date(),
        },
      ];

      jest.spyOn(prisma.workflowEnforcementAudit, 'findMany').mockResolvedValue(mockAuditTrail as any);

      const trail = await enforcementService.getAuditTrail('wo123');

      expect(trail).toEqual(mockAuditTrail);
      expect(trail.length).toBeGreaterThan(0);
    });
  });
});
