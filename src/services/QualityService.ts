import {
  QualityCharacteristic,
  Inspection,
  InspectionMeasurement,
  InspectionResult,
  MeasurementValidationResult,
  NonConformanceReport,
  NCRStatus,
  NCRSeverity,
  NCRDisposition,
  CharacteristicType
} from '@/types/quality';
import { v4 as uuidv4 } from 'uuid';
// ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
import { UnifiedApprovalIntegration } from './UnifiedApprovalIntegration';
// ✅ GITHUB ISSUE #55: NCR Workflow Enhancement
import { NCRWorkflowEnhancement } from './NCRWorkflowEnhancement';
import { PrismaClient } from '@prisma/client';

// Static counters for unique number generation
let inspectionCounter = 0;
let ncrCounter = 0;

export class QualityService {
  // ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration
  private unifiedApprovalService: UnifiedApprovalIntegration;
  // ✅ GITHUB ISSUE #55: NCR Workflow Enhancement
  private workflowEnhancement: NCRWorkflowEnhancement;

  constructor(private prisma?: PrismaClient) {
    // Use provided prisma instance or create a new one
    this.prisma = prisma || new PrismaClient();
    this.unifiedApprovalService = new UnifiedApprovalIntegration(this.prisma);
    this.workflowEnhancement = new NCRWorkflowEnhancement(this.prisma);
  }

  /**
   * Validates a measurement against specification limits
   */
  validateMeasurement(
    measurement: number,
    characteristic: QualityCharacteristic
  ): MeasurementValidationResult {
    if (characteristic.characteristicType !== CharacteristicType.DIMENSIONAL && 
        characteristic.characteristicType !== CharacteristicType.VARIABLE) {
      return {
        isValid: true,
        result: InspectionResult.PASS,
        message: 'Non-numeric characteristic'
      };
    }

    const { specificationLowerLimit, specificationUpperLimit, specificationNominal } = characteristic;

    // Check if measurement is within specification limits
    if (specificationLowerLimit !== undefined && measurement < specificationLowerLimit) {
      const deviation = specificationLowerLimit - measurement;
      return {
        isValid: false,
        result: InspectionResult.FAIL,
        deviation,
        message: `Measurement ${measurement} is below lower limit ${specificationLowerLimit}`
      };
    }

    if (specificationUpperLimit !== undefined && measurement > specificationUpperLimit) {
      const deviation = measurement - specificationUpperLimit;
      return {
        isValid: false,
        result: InspectionResult.FAIL,
        deviation,
        message: `Measurement ${measurement} is above upper limit ${specificationUpperLimit}`
      };
    }

    // Calculate deviation from nominal if available
    let deviation = 0;
    if (specificationNominal !== undefined) {
      deviation = Math.abs(measurement - specificationNominal);
    }

    return {
      isValid: true,
      result: InspectionResult.PASS,
      deviation,
      message: 'Measurement within specification'
    };
  }

  /**
   * Determines overall inspection result based on individual measurements
   */
  determineOverallInspectionResult(measurements: InspectionMeasurement[]): InspectionResult {
    if (measurements.length === 0) {
      return InspectionResult.CONDITIONAL;
    }

    const hasFailures = measurements.some(m => m.result === InspectionResult.FAIL);
    const hasConditional = measurements.some(m => m.result === InspectionResult.CONDITIONAL);

    if (hasFailures) {
      return InspectionResult.FAIL;
    }

    if (hasConditional) {
      return InspectionResult.CONDITIONAL;
    }

    return InspectionResult.PASS;
  }

  /**
   * Creates an inspection record
   */
  async createInspection(
    workOrderOperationId: string,
    qualityPlanId: string,
    inspectorId: string,
    sampleSize: number,
    lotNumber?: string,
    serialNumber?: string
  ): Promise<Inspection> {
    if (sampleSize <= 0) {
      throw new Error('Sample size must be greater than 0');
    }

    if (sampleSize > 1000) {
      throw new Error('Sample size cannot exceed 1000');
    }

    const inspection: Inspection = {
      id: uuidv4(),
      inspectionNumber: this.generateInspectionNumber(),
      workOrderOperationId,
      qualityPlanId,
      lotNumber,
      serialNumber,
      sampleSize,
      inspectorId,
      inspectionDate: new Date(),
      overallResult: InspectionResult.CONDITIONAL, // Will be updated when measurements are recorded
      notes: undefined,
      certificateRequired: false,
      certificateGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return inspection;
  }

  /**
   * Records inspection measurements
   */
  async recordMeasurements(
    inspection: Inspection,
    measurements: Array<{
      qualityCharacteristicId: string;
      sampleNumber: number;
      measuredValue?: number;
      attributeValue?: string;
      measurementEquipment?: string;
      measuredBy: string;
    }>,
    characteristics: QualityCharacteristic[]
  ): Promise<InspectionMeasurement[]> {
    const inspectionMeasurements: InspectionMeasurement[] = [];

    for (const measurement of measurements) {
      const characteristic = characteristics.find(c => c.id === measurement.qualityCharacteristicId);
      if (!characteristic) {
        throw new Error(`Quality characteristic not found: ${measurement.qualityCharacteristicId}`);
      }

      let result = InspectionResult.PASS;
      let outOfSpecReason: string | undefined;

      // Validate dimensional/variable measurements
      if (measurement.measuredValue !== undefined) {
        const validation = this.validateMeasurement(measurement.measuredValue, characteristic);
        result = validation.result;
        if (!validation.isValid) {
          outOfSpecReason = validation.message;
        }
      }

      const inspectionMeasurement: InspectionMeasurement = {
        id: uuidv4(),
        inspectionId: inspection.id,
        qualityCharacteristicId: measurement.qualityCharacteristicId,
        sampleNumber: measurement.sampleNumber,
        measuredValue: measurement.measuredValue,
        attributeValue: measurement.attributeValue,
        result,
        outOfSpecReason,
        measurementEquipment: measurement.measurementEquipment,
        measuredAt: new Date(),
        measuredBy: measurement.measuredBy,
        createdAt: new Date()
      };

      inspectionMeasurements.push(inspectionMeasurement);
    }

    return inspectionMeasurements;
  }

  /**
   * Generates a unique inspection number
   */
  generateInspectionNumber(): string {
    inspectionCounter++;
    const timestamp = Date.now().toString();
    return `INS-${timestamp.slice(-5)}${inspectionCounter.toString().padStart(3, '0')}`;
  }

  /**
   * Creates a non-conformance report
   */
  async createNCR(
    partId: string,
    description: string,
    quantityAffected: number,
    severity: NCRSeverity,
    reportedBy: string,
    inspectionId?: string,
    workOrderId?: string
  ): Promise<NonConformanceReport> {
    if (!description || description.trim().length === 0) {
      throw new Error('Description is required for NCR');
    }

    if (quantityAffected <= 0) {
      throw new Error('Quantity affected must be greater than 0');
    }

    const ncr: NonConformanceReport = {
      id: uuidv4(),
      ncrNumber: this.generateNCRNumber(),
      inspectionId,
      workOrderId,
      partId,
      description: description.trim(),
      quantityAffected,
      severity,
      status: NCRStatus.OPEN,
      reportedBy,
      reportedDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return ncr;
  }

  /**
   * Sets NCR disposition
   */
  async setNCRDisposition(
    ncr: NonConformanceReport,
    disposition: NCRDisposition,
    dispositionReason: string,
    reviewedBy: string,
    rootCause?: string,
    correctiveAction?: string
  ): Promise<NonConformanceReport> {
    if (ncr.status === NCRStatus.CLOSED) {
      throw new Error('Cannot set disposition on closed NCR');
    }

    if (!dispositionReason || dispositionReason.trim().length === 0) {
      throw new Error('Disposition reason is required');
    }

    // ✅ GITHUB ISSUE #55: Hardcoded disposition restrictions removed (lines 271-272)
    // Disposition validation is now config-based via NCRDispositionService
    // This allows per-site/per-severity customization of allowed dispositions

    const updatedNCR: NonConformanceReport = {
      ...ncr,
      disposition,
      dispositionReason: dispositionReason.trim(),
      rootCause: rootCause?.trim(),
      correctiveAction: correctiveAction?.trim(),
      status: NCRStatus.DISPOSITION_SET,
      reviewedBy,
      reviewedDate: new Date(),
      updatedAt: new Date()
    };

    return updatedNCR;
  }

  /**
   * Generates a unique NCR number
   */
  generateNCRNumber(): string {
    ncrCounter++;
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    return `NCR-${year}-${timestamp}${ncrCounter.toString().padStart(3, '0')}`;
  }

  // ✅ GITHUB ISSUE #147: Core Unified Workflow Engine Integration - Quality Process Approvals

  /**
   * Submit quality process for approval using unified workflow engine
   */
  async submitQualityProcessForApproval(
    qualityProcessId: string,
    userId: string,
    requiredApproverRoles: string[] = ['quality_manager'],
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM'
  ): Promise<{
    success: boolean;
    workflowInstanceId?: string;
    currentStage?: string;
    nextApprovers?: string[];
    error?: string;
  }> {
    try {
      // Initialize the unified approval service if needed
      await this.unifiedApprovalService.initialize(userId);

      // Initiate approval workflow for quality process
      const result = await this.unifiedApprovalService.initiateApproval(
        {
          entityType: 'QUALITY_PROCESS',
          entityId: qualityProcessId,
          currentStatus: 'PENDING_APPROVAL',
          requiredApproverRoles,
          priority,
          metadata: {
            submittedAt: new Date().toISOString(),
            submittedBy: userId,
            processType: 'quality_inspection'
          }
        },
        userId
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve quality process using unified workflow engine
   */
  async approveQualityProcess(
    qualityProcessId: string,
    userId: string,
    comments?: string
  ): Promise<{
    success: boolean;
    workflowInstanceId?: string;
    currentStage?: string;
    error?: string;
  }> {
    try {
      // Use unified approval service
      const approvalResult = await this.unifiedApprovalService.approveQualityProcess(
        qualityProcessId,
        userId,
        comments
      );

      if (!approvalResult.success) {
        throw new Error(`Approval failed: ${approvalResult.error || 'Unknown error'}`);
      }

      return approvalResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reject quality process using unified workflow engine
   */
  async rejectQualityProcess(
    qualityProcessId: string,
    userId: string,
    rejectionReason: string,
    comments: string
  ): Promise<{
    success: boolean;
    workflowInstanceId?: string;
    error?: string;
  }> {
    try {
      // Use unified approval service for rejection
      const rejectionResult = await this.unifiedApprovalService.processApprovalAction(
        'QUALITY_PROCESS',
        qualityProcessId,
        'REJECT',
        userId,
        `${rejectionReason}: ${comments}`
      );

      if (!rejectionResult.success) {
        throw new Error(`Rejection failed: ${rejectionResult.error || 'Unknown error'}`);
      }

      return rejectionResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get approval status for quality process from unified workflow engine
   */
  async getQualityProcessApprovalStatus(qualityProcessId: string): Promise<{
    hasActiveWorkflow: boolean;
    workflowStatus?: string;
    currentStage?: string;
    completionPercentage?: number;
    nextApprovers?: string[];
    approvalHistory?: any[];
  }> {
    try {
      const status = await this.unifiedApprovalService.getApprovalStatus(
        'QUALITY_PROCESS',
        qualityProcessId
      );

      return status;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Calculates process capability index (Cpk)
   */
  calculateCpk(
    measurements: number[],
    lowerLimit: number,
    upperLimit: number
  ): number | null {
    if (measurements.length < 2) {
      return null;
    }

    const mean = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const variance = measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (measurements.length - 1);
    const standardDeviation = Math.sqrt(variance);

    if (standardDeviation === 0) {
      return null;
    }

    const cpkUpper = (upperLimit - mean) / (3 * standardDeviation);
    const cpkLower = (mean - lowerLimit) / (3 * standardDeviation);

    return Math.min(cpkUpper, cpkLower);
  }

  /**
   * Determines if process is in statistical control
   */
  isProcessInControl(measurements: number[], controlLimits: { ucl: number; lcl: number }): boolean {
    if (measurements.length === 0) {
      return true;
    }

    // Check for points outside control limits
    const outsidePoints = measurements.filter(m => m > controlLimits.ucl || m < controlLimits.lcl);
    if (outsidePoints.length > 0) {
      return false;
    }

    // Additional rules can be added here (7 points in a row on one side of center, etc.)
    
    return true;
  }

  /**
   * Calculates first pass yield
   */
  calculateFirstPassYield(totalInspected: number, totalPassed: number): number {
    if (totalInspected === 0) {
      return 0;
    }

    return (totalPassed / totalInspected) * 100;
  }

  /**
   * Determines if certificate of compliance is required
   */
  isCertificateRequired(inspection: Inspection, characteristics: QualityCharacteristic[]): boolean {
    // Certificate required if any critical characteristics are inspected
    const criticalCharacteristics = characteristics.filter(c => c.isCritical);
    return criticalCharacteristics.length > 0;
  }

  // ✅ GITHUB ISSUE #55: NCR Workflow Methods (Phase 3)
  // These methods delegate to NCRWorkflowEnhancement for state management and approvals

  /**
   * Transition NCR to new state with workflow validation and approvals
   */
  async transitionNCRState(
    ncrId: string,
    toState: NCRStatus,
    userId: string,
    reason?: string
  ) {
    return this.workflowEnhancement.transitionNCRState(ncrId, toState, userId, reason);
  }

  /**
   * Set NCR disposition with workflow approval
   */
  async setNCRDispositionWithWorkflow(
    ncrId: string,
    disposition: NCRDisposition,
    userId: string,
    reason: string,
    correctiveAction?: string
  ) {
    return this.workflowEnhancement.setNCRDispositionWithWorkflow(
      ncrId,
      disposition,
      userId,
      reason,
      correctiveAction
    );
  }

  /**
   * Get available transitions for NCR
   */
  async getAvailableTransitions(ncrId: string) {
    return this.workflowEnhancement.getAvailableTransitions(ncrId);
  }

  /**
   * Get NCR workflow configuration
   */
  async getNCRWorkflowConfig(ncrId: string) {
    return this.workflowEnhancement.getNCRWorkflowConfig(ncrId);
  }

  /**
   * Get NCR state history
   */
  async getNCRStateHistory(ncrId: string) {
    return this.workflowEnhancement.getNCRStateHistory(ncrId);
  }

  /**
   * Get NCR approval history
   */
  async getNCRApprovalHistory(ncrId: string) {
    return this.workflowEnhancement.getNCRApprovalHistory(ncrId);
  }

  /**
   * Close NCR with final approval
   */
  async closeNCRWithApproval(
    ncrId: string,
    userId: string,
    closureNotes: string
  ) {
    return this.workflowEnhancement.closeNCRWithApproval(ncrId, userId, closureNotes);
  }

  /**
   * Escalate overdue NCR approvals
   */
  async escalateOverdueApprovals(): Promise<number> {
    return this.workflowEnhancement.escalateOverdueApprovals();
  }

  /**
   * Get NCR workflow statistics
   */
  async getNCRWorkflowStats(siteId?: string) {
    return this.workflowEnhancement.getNCRWorkflowStats(siteId);
  }

  /**
   * Validate NCR can transition to state
   */
  async validateTransition(ncrId: string, toState: NCRStatus) {
    return this.workflowEnhancement.validateTransition(ncrId, toState);
  }
}