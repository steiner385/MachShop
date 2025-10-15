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

// Static counters for unique number generation
let inspectionCounter = 0;
let ncrCounter = 0;

export class QualityService {
  constructor() {}

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

    // Validate disposition based on severity
    if (ncr.severity === NCRSeverity.CRITICAL && disposition === NCRDisposition.USE_AS_IS) {
      throw new Error('Critical NCRs cannot be dispositioned as USE_AS_IS');
    }

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
}