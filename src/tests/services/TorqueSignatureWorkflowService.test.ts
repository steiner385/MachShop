import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TorqueSignatureWorkflowService } from '@/services/TorqueSignatureWorkflowService';
import { ElectronicSignatureService } from '@/services/ElectronicSignatureService';
import {
  TorqueSignatureWorkflow,
  TorqueSignatureWorkflowType,
  TorqueReportData,
  TorqueSpecification,
  TorqueEvent,
  TorqueStatus,
  TorqueMethod,
  TorquePattern,
  WorkflowStatus,
  SignatureRequirement
} from '@/types/torque';
import { ElectronicSignature, SignatureType, SignatureStatus } from '@/types/signatures';

// Mock the ElectronicSignatureService
vi.mock('@/services/ElectronicSignatureService');

describe('TorqueSignatureWorkflowService', () => {
  let workflowService: TorqueSignatureWorkflowService;
  let mockSignatureService: ElectronicSignatureService;

  const mockSpec: TorqueSpecification = {
    id: 'spec-123',
    operationId: 'op-123',
    partId: 'part-456',
    torqueValue: 150.0,
    toleranceLower: 145.0,
    toleranceUpper: 155.0,
    targetValue: 150.0,
    method: TorqueMethod.TORQUE_ONLY,
    pattern: TorquePattern.STAR,
    unit: 'Nm',
    numberOfPasses: 2,
    fastenerType: 'M10x1.5',
    fastenerGrade: '8.8',
    threadCondition: 'Dry',
    toolType: 'Electronic Torque Wrench',
    calibrationRequired: true,
    engineeringApproval: true,
    approvedBy: 'engineer-123',
    approvedDate: new Date(),
    safetyLevel: 'CRITICAL',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockEvents: TorqueEvent[] = [
    {
      id: 'event-001',
      sequenceId: 'seq-001',
      sessionId: 'session-123',
      passNumber: 1,
      actualTorque: 150.0,
      targetTorque: 150.0,
      angle: 45.0,
      status: TorqueStatus.PASS,
      isValid: true,
      deviation: 0,
      percentDeviation: 0,
      wrenchId: 'wrench-001',
      operatorId: 'operator-123',
      timestamp: new Date(),
      createdAt: new Date()
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockSignatureService = new ElectronicSignatureService();

    // Setup mock implementations
    vi.mocked(mockSignatureService.createSignature).mockResolvedValue({
      id: 'sig-123',
      documentId: 'doc-123',
      signerId: 'signer-123',
      signerName: 'John Doe',
      signerRole: 'Quality Inspector',
      signatureType: SignatureType.COMPLETION,
      signatureData: 'mock-signature-data',
      timestamp: new Date(),
      status: SignatureStatus.PENDING,
      reason: 'Torque operation completion',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    vi.mocked(mockSignatureService.getSignature).mockResolvedValue({
      id: 'sig-123',
      documentId: 'doc-123',
      signerId: 'signer-123',
      signerName: 'John Doe',
      signerRole: 'Quality Inspector',
      signatureType: SignatureType.COMPLETION,
      signatureData: 'mock-signature-data',
      timestamp: new Date(),
      status: SignatureStatus.COMPLETED,
      reason: 'Torque operation completion',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    workflowService = new TorqueSignatureWorkflowService(mockSignatureService);
  });

  describe('Workflow Creation', () => {
    it('should create completion workflow for successful torque operation', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-123',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const workflow = await workflowService.createWorkflow(
        'workflow-123',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      expect(workflow).toBeDefined();
      expect(workflow.workflowId).toBe('workflow-123');
      expect(workflow.type).toBe(TorqueSignatureWorkflowType.COMPLETION);
      expect(workflow.reportData).toEqual(reportData);
      expect(workflow.initiatedBy).toBe('operator-123');
      expect(workflow.status).toBe(WorkflowStatus.PENDING);
      expect(workflow.signatures).toHaveLength(0);
      expect(workflow.currentStepIndex).toBe(0);
    });

    it('should create rework approval workflow for failed torque operation', async () => {
      const failedEvents: TorqueEvent[] = [
        {
          ...mockEvents[0],
          actualTorque: 165.0,
          status: TorqueStatus.OVER_TORQUE,
          isValid: false,
          deviation: 15.0,
          percentDeviation: 10.0
        }
      ];

      const reportData: TorqueReportData = {
        reportId: 'report-failed',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: failedEvents,
        analytics: {
          totalEvents: 1,
          passCount: 0,
          failCount: 1,
          firstPassYield: 0,
          averageTorque: 165.0,
          averageDeviation: 15.0,
          standardDeviation: 0,
          processCapability: { cpk: 0.5, cp: 0.8 },
          trends: { direction: 'declining', strength: 0.8 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'FAIL',
          completedBolts: 0,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 1
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const workflow = await workflowService.createWorkflow(
        'workflow-rework',
        TorqueSignatureWorkflowType.REWORK_APPROVAL,
        reportData,
        'supervisor-456'
      );

      expect(workflow.type).toBe(TorqueSignatureWorkflowType.REWORK_APPROVAL);
      expect(workflow.status).toBe(WorkflowStatus.PENDING);
    });

    it('should create supervisor override workflow', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-override',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const workflow = await workflowService.createWorkflow(
        'workflow-override',
        TorqueSignatureWorkflowType.SUPERVISOR_OVERRIDE,
        reportData,
        'supervisor-789',
        'Manual override required due to equipment malfunction'
      );

      expect(workflow.type).toBe(TorqueSignatureWorkflowType.SUPERVISOR_OVERRIDE);
      expect(workflow.overrideReason).toBe('Manual override required due to equipment malfunction');
      expect(workflow.status).toBe(WorkflowStatus.PENDING);
    });

    it('should reject duplicate workflow IDs', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-123',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-duplicate',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      await expect(
        workflowService.createWorkflow(
          'workflow-duplicate',
          TorqueSignatureWorkflowType.COMPLETION,
          reportData,
          'operator-123'
        )
      ).rejects.toThrow('Workflow with ID workflow-duplicate already exists');
    });
  });

  describe('Signature Requirements Determination', () => {
    it('should determine single operator signature for normal completion', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-normal',
        sessionId: 'session-123',
        specification: { ...mockSpec, safetyLevel: 'NORMAL' },
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const requirements = workflowService.determineSignatureRequirements(
        TorqueSignatureWorkflowType.COMPLETION,
        reportData
      );

      expect(requirements).toHaveLength(1);
      expect(requirements[0].role).toBe('operator');
      expect(requirements[0].required).toBe(true);
    });

    it('should require supervisor signature for critical safety level', async () => {
      const criticalReportData: TorqueReportData = {
        reportId: 'report-critical',
        sessionId: 'session-123',
        specification: { ...mockSpec, safetyLevel: 'CRITICAL' },
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const requirements = workflowService.determineSignatureRequirements(
        TorqueSignatureWorkflowType.COMPLETION,
        criticalReportData
      );

      expect(requirements).toHaveLength(2);
      expect(requirements.find(r => r.role === 'operator')).toBeDefined();
      expect(requirements.find(r => r.role === 'supervisor')).toBeDefined();
    });

    it('should require additional signatures for out-of-spec events', async () => {
      const outOfSpecEvents: TorqueEvent[] = [
        {
          ...mockEvents[0],
          actualTorque: 165.0,
          status: TorqueStatus.OVER_TORQUE,
          isValid: false,
          deviation: 15.0,
          percentDeviation: 10.0
        }
      ];

      const outOfSpecReportData: TorqueReportData = {
        reportId: 'report-out-of-spec',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: outOfSpecEvents,
        analytics: {
          totalEvents: 1,
          passCount: 0,
          failCount: 1,
          firstPassYield: 0,
          averageTorque: 165.0,
          averageDeviation: 15.0,
          standardDeviation: 0,
          processCapability: { cpk: 0.5, cp: 0.8 },
          trends: { direction: 'declining', strength: 0.8 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'FAIL',
          completedBolts: 0,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 1
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const requirements = workflowService.determineSignatureRequirements(
        TorqueSignatureWorkflowType.REWORK_APPROVAL,
        outOfSpecReportData
      );

      expect(requirements).toHaveLength(2);
      expect(requirements.find(r => r.role === 'supervisor')).toBeDefined();
      expect(requirements.find(r => r.role === 'quality_inspector')).toBeDefined();
    });

    it('should require quality engineer signature for supervisor override', () => {
      const requirements = workflowService.determineSignatureRequirements(
        TorqueSignatureWorkflowType.SUPERVISOR_OVERRIDE,
        { summary: { outOfSpecEvents: 0 } } as TorqueReportData
      );

      expect(requirements).toHaveLength(2);
      expect(requirements.find(r => r.role === 'supervisor')).toBeDefined();
      expect(requirements.find(r => r.role === 'quality_engineer')).toBeDefined();
    });
  });

  describe('Workflow Execution', () => {
    let workflow: TorqueSignatureWorkflow;

    beforeEach(async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-execution',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      workflow = await workflowService.createWorkflow(
        'workflow-execution',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );
    });

    it('should add signature to workflow successfully', async () => {
      const result = await workflowService.addSignature(
        'workflow-execution',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Torque operation completed successfully'
      );

      expect(result).toBe(true);

      const updatedWorkflow = workflowService.getWorkflow('workflow-execution');
      expect(updatedWorkflow?.signatures).toHaveLength(1);
      expect(updatedWorkflow?.signatures[0].signerId).toBe('operator-123');
    });

    it('should advance workflow when all required signatures collected', async () => {
      await workflowService.addSignature(
        'workflow-execution',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Torque operation completed successfully'
      );

      const updatedWorkflow = workflowService.getWorkflow('workflow-execution');
      expect(updatedWorkflow?.status).toBe(WorkflowStatus.COMPLETED);
      expect(updatedWorkflow?.completedAt).toBeInstanceOf(Date);
    });

    it('should handle signature rejection', async () => {
      vi.mocked(mockSignatureService.createSignature).mockResolvedValue({
        id: 'sig-rejected',
        documentId: 'doc-123',
        signerId: 'supervisor-456',
        signerName: 'Jane Smith',
        signerRole: 'Supervisor',
        signatureType: SignatureType.REJECTION,
        signatureData: 'rejection-signature',
        timestamp: new Date(),
        status: SignatureStatus.REJECTED,
        reason: 'Rework required',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await workflowService.addSignature(
        'workflow-execution',
        'supervisor-456',
        'Jane Smith',
        'supervisor',
        SignatureType.REJECTION,
        'Rework required'
      );

      expect(result).toBe(true);

      const updatedWorkflow = workflowService.getWorkflow('workflow-execution');
      expect(updatedWorkflow?.status).toBe(WorkflowStatus.REJECTED);
      expect(updatedWorkflow?.rejectionReason).toBe('Rework required');
    });

    it('should fail to add signature for non-existent workflow', async () => {
      await expect(
        workflowService.addSignature(
          'non-existent',
          'operator-123',
          'John Doe',
          'operator',
          SignatureType.COMPLETION,
          'Signature'
        )
      ).rejects.toThrow('Workflow not found: non-existent');
    });

    it('should fail to add signature to completed workflow', async () => {
      // Complete the workflow first
      await workflowService.addSignature(
        'workflow-execution',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Torque operation completed successfully'
      );

      // Try to add another signature
      await expect(
        workflowService.addSignature(
          'workflow-execution',
          'supervisor-456',
          'Jane Smith',
          'supervisor',
          SignatureType.COMPLETION,
          'Additional signature'
        )
      ).rejects.toThrow('Cannot add signature to completed or rejected workflow');
    });
  });

  describe('Workflow Retrieval and Management', () => {
    beforeEach(async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-mgmt',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-mgmt',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );
    });

    it('should get workflow by ID', () => {
      const workflow = workflowService.getWorkflow('workflow-mgmt');

      expect(workflow).toBeDefined();
      expect(workflow?.workflowId).toBe('workflow-mgmt');
    });

    it('should return undefined for non-existent workflow', () => {
      const workflow = workflowService.getWorkflow('non-existent');

      expect(workflow).toBeUndefined();
    });

    it('should get workflows by session ID', async () => {
      const reportData2: TorqueReportData = {
        reportId: 'report-mgmt-2',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-456'
      };

      await workflowService.createWorkflow(
        'workflow-mgmt-2',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData2,
        'operator-456'
      );

      const sessionWorkflows = workflowService.getWorkflowsBySession('session-123');

      expect(sessionWorkflows).toHaveLength(2);
      expect(sessionWorkflows.map(w => w.workflowId)).toContain('workflow-mgmt');
      expect(sessionWorkflows.map(w => w.workflowId)).toContain('workflow-mgmt-2');
    });

    it('should get workflows by user ID', () => {
      const userWorkflows = workflowService.getWorkflowsByUser('operator-123');

      expect(userWorkflows).toHaveLength(1);
      expect(userWorkflows[0].workflowId).toBe('workflow-mgmt');
    });

    it('should get pending workflows', () => {
      const pendingWorkflows = workflowService.getPendingWorkflows();

      expect(pendingWorkflows).toHaveLength(1);
      expect(pendingWorkflows[0].status).toBe(WorkflowStatus.PENDING);
    });

    it('should get workflows by status', () => {
      const pendingWorkflows = workflowService.getWorkflowsByStatus(WorkflowStatus.PENDING);

      expect(pendingWorkflows).toHaveLength(1);
      expect(pendingWorkflows[0].status).toBe(WorkflowStatus.PENDING);
    });
  });

  describe('Notification Management', () => {
    it('should emit workflow created event', async () => {
      const createdSpy = vi.fn();
      workflowService.on('workflowCreated', createdSpy);

      const reportData: TorqueReportData = {
        reportId: 'report-notification',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-notification',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      expect(createdSpy).toHaveBeenCalledOnce();
      expect(createdSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-notification',
          type: TorqueSignatureWorkflowType.COMPLETION
        })
      );
    });

    it('should emit signature added event', async () => {
      const signatureSpy = vi.fn();
      workflowService.on('signatureAdded', signatureSpy);

      const reportData: TorqueReportData = {
        reportId: 'report-sig-event',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-sig-event',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      await workflowService.addSignature(
        'workflow-sig-event',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Signature added'
      );

      expect(signatureSpy).toHaveBeenCalledOnce();
      expect(signatureSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-sig-event',
          signerId: 'operator-123'
        })
      );
    });

    it('should emit workflow completed event', async () => {
      const completedSpy = vi.fn();
      workflowService.on('workflowCompleted', completedSpy);

      const reportData: TorqueReportData = {
        reportId: 'report-completed',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-completed',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      await workflowService.addSignature(
        'workflow-completed',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Workflow completed'
      );

      expect(completedSpy).toHaveBeenCalledOnce();
      expect(completedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workflowId: 'workflow-completed',
          status: WorkflowStatus.COMPLETED
        })
      );
    });

    it('should get pending signatures for user', async () => {
      const criticalReportData: TorqueReportData = {
        reportId: 'report-pending',
        sessionId: 'session-123',
        specification: { ...mockSpec, safetyLevel: 'CRITICAL' },
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-pending',
        TorqueSignatureWorkflowType.COMPLETION,
        criticalReportData,
        'operator-123'
      );

      // Add operator signature, supervisor signature still pending
      await workflowService.addSignature(
        'workflow-pending',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Operator signature'
      );

      const pendingSignatures = workflowService.getPendingSignatures('supervisor-456');

      expect(pendingSignatures).toHaveLength(1);
      expect(pendingSignatures[0].workflowId).toBe('workflow-pending');
      expect(pendingSignatures[0].requiredRole).toBe('supervisor');
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      // Create multiple workflows for testing
      const reportData1: TorqueReportData = {
        reportId: 'report-stats-1',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const reportData2: TorqueReportData = {
        ...reportData1,
        reportId: 'report-stats-2',
        sessionId: 'session-456'
      };

      await workflowService.createWorkflow(
        'workflow-stats-1',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData1,
        'operator-123'
      );

      await workflowService.createWorkflow(
        'workflow-stats-2',
        TorqueSignatureWorkflowType.REWORK_APPROVAL,
        reportData2,
        'supervisor-456'
      );

      // Complete one workflow
      await workflowService.addSignature(
        'workflow-stats-1',
        'operator-123',
        'John Doe',
        'operator',
        SignatureType.COMPLETION,
        'Completed'
      );
    });

    it('should get workflow statistics', () => {
      const stats = workflowService.getWorkflowStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalWorkflows).toBe(2);
      expect(stats.pendingWorkflows).toBe(1);
      expect(stats.completedWorkflows).toBe(1);
      expect(stats.rejectedWorkflows).toBe(0);
      expect(stats.workflowsByType.COMPLETION).toBe(1);
      expect(stats.workflowsByType.REWORK_APPROVAL).toBe(1);
      expect(stats.averageCompletionTime).toBeGreaterThanOrEqual(0);
    });

    it('should get signature statistics', () => {
      const stats = workflowService.getSignatureStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSignatures).toBe(1);
      expect(stats.pendingSignatures).toBeGreaterThanOrEqual(0);
      expect(stats.signaturesByRole.operator).toBe(1);
      expect(stats.averageSignatureTime).toBeGreaterThanOrEqual(0);
    });

    it('should get user performance metrics', () => {
      const metrics = workflowService.getUserPerformanceMetrics('operator-123');

      expect(metrics).toBeDefined();
      expect(metrics.userId).toBe('operator-123');
      expect(metrics.workflowsInitiated).toBe(1);
      expect(metrics.signaturesProvided).toBe(1);
      expect(metrics.averageSignatureTime).toBeGreaterThanOrEqual(0);
      expect(metrics.onTimeSignatureRate).toBe(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle signature service errors gracefully', async () => {
      vi.mocked(mockSignatureService.createSignature).mockRejectedValue(new Error('Signature service failed'));

      const reportData: TorqueReportData = {
        reportId: 'report-error',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await workflowService.createWorkflow(
        'workflow-error',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      await expect(
        workflowService.addSignature(
          'workflow-error',
          'operator-123',
          'John Doe',
          'operator',
          SignatureType.COMPLETION,
          'Signature'
        )
      ).rejects.toThrow('Signature service failed');
    });

    it('should handle invalid workflow types', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-invalid',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      await expect(
        workflowService.createWorkflow(
          'workflow-invalid',
          'INVALID_TYPE' as TorqueSignatureWorkflowType,
          reportData,
          'operator-123'
        )
      ).rejects.toThrow('Invalid workflow type: INVALID_TYPE');
    });

    it('should handle workflow timeout', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-timeout',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: [],
        events: mockEvents,
        analytics: {
          totalEvents: 1,
          passCount: 1,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 1,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'operator-123'
      };

      const workflow = await workflowService.createWorkflow(
        'workflow-timeout',
        TorqueSignatureWorkflowType.COMPLETION,
        reportData,
        'operator-123'
      );

      // Manually set creation time to past to simulate timeout
      workflow.createdAt = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago

      const timeoutSpy = vi.fn();
      workflowService.on('workflowTimeout', timeoutSpy);

      workflowService.checkWorkflowTimeouts();

      expect(timeoutSpy).toHaveBeenCalledOnce();
      expect(timeoutSpy).toHaveBeenCalledWith('workflow-timeout');

      const timedOutWorkflow = workflowService.getWorkflow('workflow-timeout');
      expect(timedOutWorkflow?.status).toBe(WorkflowStatus.TIMEOUT);
    });
  });
});