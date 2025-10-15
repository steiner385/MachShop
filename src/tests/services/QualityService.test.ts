import { describe, it, expect, beforeEach } from 'vitest';
import { QualityService } from '@/services/QualityService';
import {
  QualityCharacteristic,
  CharacteristicType,
  InspectionResult,
  NCRSeverity,
  NCRDisposition,
  NCRStatus,
  NonConformanceReport
} from '@/types/quality';

describe('QualityService', () => {
  let qualityService: QualityService;

  beforeEach(() => {
    qualityService = new QualityService();
  });

  describe('validateMeasurement', () => {
    const characteristic: QualityCharacteristic = {
      id: '1',
      qualityPlanId: 'plan-1',
      characteristicNumber: 1,
      characteristicName: 'Diameter',
      characteristicType: CharacteristicType.DIMENSIONAL,
      specificationNominal: 5.0,
      specificationLowerLimit: 4.5,
      specificationUpperLimit: 5.5,
      uom: 'mm',
      isCritical: true,
      createdAt: new Date()
    };

    it('should pass measurement within specification limits', () => {
      const result = qualityService.validateMeasurement(5.0, characteristic);
      
      expect(result.isValid).toBe(true);
      expect(result.result).toBe(InspectionResult.PASS);
      expect(result.deviation).toBe(0);
    });

    it('should fail measurement below lower limit', () => {
      const result = qualityService.validateMeasurement(4.0, characteristic);
      
      expect(result.isValid).toBe(false);
      expect(result.result).toBe(InspectionResult.FAIL);
      expect(result.deviation).toBe(0.5);
      expect(result.message).toContain('below lower limit');
    });

    it('should fail measurement above upper limit', () => {
      const result = qualityService.validateMeasurement(6.0, characteristic);
      
      expect(result.isValid).toBe(false);
      expect(result.result).toBe(InspectionResult.FAIL);
      expect(result.deviation).toBe(0.5);
      expect(result.message).toContain('above upper limit');
    });

    it('should pass measurement at boundary limits', () => {
      const lowerResult = qualityService.validateMeasurement(4.5, characteristic);
      const upperResult = qualityService.validateMeasurement(5.5, characteristic);
      
      expect(lowerResult.isValid).toBe(true);
      expect(lowerResult.result).toBe(InspectionResult.PASS);
      expect(upperResult.isValid).toBe(true);
      expect(upperResult.result).toBe(InspectionResult.PASS);
    });

    it('should calculate deviation from nominal correctly', () => {
      const result = qualityService.validateMeasurement(5.2, characteristic);
      
      expect(result.isValid).toBe(true);
      expect(result.result).toBe(InspectionResult.PASS);
      expect(result.deviation).toBeCloseTo(0.2, 1);
    });

    it('should handle non-numeric characteristics', () => {
      const visualCharacteristic: QualityCharacteristic = {
        ...characteristic,
        characteristicType: CharacteristicType.VISUAL
      };

      const result = qualityService.validateMeasurement(5.0, visualCharacteristic);
      
      expect(result.isValid).toBe(true);
      expect(result.result).toBe(InspectionResult.PASS);
      expect(result.message).toBe('Non-numeric characteristic');
    });
  });

  describe('determineOverallInspectionResult', () => {
    it('should return FAIL if any measurement fails', () => {
      const measurements = [
        {
          id: '1',
          inspectionId: 'insp-1',
          qualityCharacteristicId: 'char-1',
          sampleNumber: 1,
          result: InspectionResult.PASS,
          measuredAt: new Date(),
          createdAt: new Date()
        },
        {
          id: '2',
          inspectionId: 'insp-1',
          qualityCharacteristicId: 'char-2',
          sampleNumber: 1,
          result: InspectionResult.FAIL,
          measuredAt: new Date(),
          createdAt: new Date()
        }
      ];

      const result = qualityService.determineOverallInspectionResult(measurements);
      expect(result).toBe(InspectionResult.FAIL);
    });

    it('should return CONDITIONAL if any measurement is conditional and none fail', () => {
      const measurements = [
        {
          id: '1',
          inspectionId: 'insp-1',
          qualityCharacteristicId: 'char-1',
          sampleNumber: 1,
          result: InspectionResult.PASS,
          measuredAt: new Date(),
          createdAt: new Date()
        },
        {
          id: '2',
          inspectionId: 'insp-1',
          qualityCharacteristicId: 'char-2',
          sampleNumber: 1,
          result: InspectionResult.CONDITIONAL,
          measuredAt: new Date(),
          createdAt: new Date()
        }
      ];

      const result = qualityService.determineOverallInspectionResult(measurements);
      expect(result).toBe(InspectionResult.CONDITIONAL);
    });

    it('should return PASS if all measurements pass', () => {
      const measurements = [
        {
          id: '1',
          inspectionId: 'insp-1',
          qualityCharacteristicId: 'char-1',
          sampleNumber: 1,
          result: InspectionResult.PASS,
          measuredAt: new Date(),
          createdAt: new Date()
        },
        {
          id: '2',
          inspectionId: 'insp-1',
          qualityCharacteristicId: 'char-2',
          sampleNumber: 1,
          result: InspectionResult.PASS,
          measuredAt: new Date(),
          createdAt: new Date()
        }
      ];

      const result = qualityService.determineOverallInspectionResult(measurements);
      expect(result).toBe(InspectionResult.PASS);
    });

    it('should return CONDITIONAL for empty measurements array', () => {
      const result = qualityService.determineOverallInspectionResult([]);
      expect(result).toBe(InspectionResult.CONDITIONAL);
    });
  });

  describe('createInspection', () => {
    it('should create inspection with valid parameters', async () => {
      const inspection = await qualityService.createInspection(
        'wo-op-123',
        'qp-456',
        'inspector-789',
        5,
        'LOT-001',
        'SN-001'
      );

      expect(inspection).toBeDefined();
      expect(inspection.workOrderOperationId).toBe('wo-op-123');
      expect(inspection.qualityPlanId).toBe('qp-456');
      expect(inspection.inspectorId).toBe('inspector-789');
      expect(inspection.sampleSize).toBe(5);
      expect(inspection.lotNumber).toBe('LOT-001');
      expect(inspection.serialNumber).toBe('SN-001');
      expect(inspection.overallResult).toBe(InspectionResult.CONDITIONAL);
      expect(inspection.inspectionNumber).toBeTruthy();
      expect(inspection.id).toBeTruthy();
    });

    it('should reject zero sample size', async () => {
      await expect(
        qualityService.createInspection('wo-op-123', 'qp-456', 'inspector-789', 0)
      ).rejects.toThrow('Sample size must be greater than 0');
    });

    it('should reject negative sample size', async () => {
      await expect(
        qualityService.createInspection('wo-op-123', 'qp-456', 'inspector-789', -5)
      ).rejects.toThrow('Sample size must be greater than 0');
    });

    it('should reject sample size exceeding limit', async () => {
      await expect(
        qualityService.createInspection('wo-op-123', 'qp-456', 'inspector-789', 1500)
      ).rejects.toThrow('Sample size cannot exceed 1000');
    });
  });

  describe('recordMeasurements', () => {
    const mockInspection = {
      id: 'insp-123',
      inspectionNumber: 'INS-001',
      workOrderOperationId: 'wo-op-123',
      qualityPlanId: 'qp-456',
      sampleSize: 2,
      inspectorId: 'inspector-789',
      inspectionDate: new Date(),
      overallResult: InspectionResult.CONDITIONAL,
      certificateRequired: false,
      certificateGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockCharacteristics: QualityCharacteristic[] = [
      {
        id: 'char-1',
        qualityPlanId: 'qp-456',
        characteristicNumber: 1,
        characteristicName: 'Diameter',
        characteristicType: CharacteristicType.DIMENSIONAL,
        specificationNominal: 5.0,
        specificationLowerLimit: 4.5,
        specificationUpperLimit: 5.5,
        uom: 'mm',
        isCritical: true,
        createdAt: new Date()
      }
    ];

    it('should record measurements successfully', async () => {
      const measurementData = [
        {
          qualityCharacteristicId: 'char-1',
          sampleNumber: 1,
          measuredValue: 5.0,
          measurementEquipment: 'CMM-001',
          measuredBy: 'inspector-789'
        }
      ];

      const measurements = await qualityService.recordMeasurements(
        mockInspection,
        measurementData,
        mockCharacteristics
      );

      expect(measurements).toHaveLength(1);
      expect(measurements[0].qualityCharacteristicId).toBe('char-1');
      expect(measurements[0].measuredValue).toBe(5.0);
      expect(measurements[0].result).toBe(InspectionResult.PASS);
      expect(measurements[0].measurementEquipment).toBe('CMM-001');
      expect(measurements[0].measuredBy).toBe('inspector-789');
      expect(measurements[0].id).toBeTruthy();
    });

    it('should fail measurements outside specification', async () => {
      const measurementData = [
        {
          qualityCharacteristicId: 'char-1',
          sampleNumber: 1,
          measuredValue: 4.0, // Below lower limit
          measuredBy: 'inspector-789'
        }
      ];

      const measurements = await qualityService.recordMeasurements(
        mockInspection,
        measurementData,
        mockCharacteristics
      );

      expect(measurements[0].result).toBe(InspectionResult.FAIL);
      expect(measurements[0].outOfSpecReason).toContain('below lower limit');
    });

    it('should throw error for unknown characteristic', async () => {
      const measurementData = [
        {
          qualityCharacteristicId: 'unknown-char',
          sampleNumber: 1,
          measuredValue: 5.0,
          measuredBy: 'inspector-789'
        }
      ];

      await expect(
        qualityService.recordMeasurements(mockInspection, measurementData, mockCharacteristics)
      ).rejects.toThrow('Quality characteristic not found: unknown-char');
    });
  });

  describe('generateInspectionNumber', () => {
    it('should generate inspection number with correct format', () => {
      const number = qualityService.generateInspectionNumber();
      expect(number).toMatch(/^INS-\d{8}$/);
    });

    it('should generate unique inspection numbers', async () => {
      const number1 = qualityService.generateInspectionNumber();
      // Add small delay to ensure uniqueness
      await new Promise(resolve => setTimeout(resolve, 1));
      const number2 = qualityService.generateInspectionNumber();
      expect(number1).not.toBe(number2);
    });
  });

  describe('createNCR', () => {
    it('should create NCR with valid data', async () => {
      const ncr = await qualityService.createNCR(
        'part-123',
        'Dimension out of tolerance',
        5,
        NCRSeverity.MAJOR,
        'inspector-789',
        'insp-123',
        'wo-456'
      );

      expect(ncr).toBeDefined();
      expect(ncr.partId).toBe('part-123');
      expect(ncr.description).toBe('Dimension out of tolerance');
      expect(ncr.quantityAffected).toBe(5);
      expect(ncr.severity).toBe(NCRSeverity.MAJOR);
      expect(ncr.status).toBe(NCRStatus.OPEN);
      expect(ncr.reportedBy).toBe('inspector-789');
      expect(ncr.inspectionId).toBe('insp-123');
      expect(ncr.workOrderId).toBe('wo-456');
      expect(ncr.ncrNumber).toBeTruthy();
      expect(ncr.id).toBeTruthy();
    });

    it('should reject empty description', async () => {
      await expect(
        qualityService.createNCR('part-123', '', 5, NCRSeverity.MAJOR, 'inspector-789')
      ).rejects.toThrow('Description is required for NCR');
    });

    it('should reject whitespace-only description', async () => {
      await expect(
        qualityService.createNCR('part-123', '   ', 5, NCRSeverity.MAJOR, 'inspector-789')
      ).rejects.toThrow('Description is required for NCR');
    });

    it('should reject zero quantity affected', async () => {
      await expect(
        qualityService.createNCR('part-123', 'Issue', 0, NCRSeverity.MAJOR, 'inspector-789')
      ).rejects.toThrow('Quantity affected must be greater than 0');
    });

    it('should reject negative quantity affected', async () => {
      await expect(
        qualityService.createNCR('part-123', 'Issue', -5, NCRSeverity.MAJOR, 'inspector-789')
      ).rejects.toThrow('Quantity affected must be greater than 0');
    });
  });

  describe('setNCRDisposition', () => {
    let mockNCR: NonConformanceReport;

    beforeEach(async () => {
      mockNCR = await qualityService.createNCR(
        'part-123',
        'Dimension out of tolerance',
        5,
        NCRSeverity.MAJOR,
        'inspector-789'
      );
    });

    it('should set disposition successfully', async () => {
      const updatedNCR = await qualityService.setNCRDisposition(
        mockNCR,
        NCRDisposition.REWORK,
        'Parts can be reworked to meet specification',
        'quality-engineer-123',
        'Improper tooling setup',
        'Retrain operators on setup procedure'
      );

      expect(updatedNCR.disposition).toBe(NCRDisposition.REWORK);
      expect(updatedNCR.dispositionReason).toBe('Parts can be reworked to meet specification');
      expect(updatedNCR.rootCause).toBe('Improper tooling setup');
      expect(updatedNCR.correctiveAction).toBe('Retrain operators on setup procedure');
      expect(updatedNCR.status).toBe(NCRStatus.DISPOSITION_SET);
      expect(updatedNCR.reviewedBy).toBe('quality-engineer-123');
      expect(updatedNCR.reviewedDate).toBeDefined();
      expect(updatedNCR.updatedAt).not.toBe(mockNCR.updatedAt);
    });

    it('should not allow disposition of closed NCR', async () => {
      const closedNCR = { ...mockNCR, status: NCRStatus.CLOSED };

      await expect(
        qualityService.setNCRDisposition(
          closedNCR,
          NCRDisposition.REWORK,
          'Rework required',
          'quality-engineer-123'
        )
      ).rejects.toThrow('Cannot set disposition on closed NCR');
    });

    it('should reject empty disposition reason', async () => {
      await expect(
        qualityService.setNCRDisposition(
          mockNCR,
          NCRDisposition.REWORK,
          '',
          'quality-engineer-123'
        )
      ).rejects.toThrow('Disposition reason is required');
    });

    it('should reject USE_AS_IS for critical NCRs', async () => {
      const criticalNCR = { ...mockNCR, severity: NCRSeverity.CRITICAL };

      await expect(
        qualityService.setNCRDisposition(
          criticalNCR,
          NCRDisposition.USE_AS_IS,
          'Within functional requirements',
          'quality-engineer-123'
        )
      ).rejects.toThrow('Critical NCRs cannot be dispositioned as USE_AS_IS');
    });
  });

  describe('generateNCRNumber', () => {
    it('should generate NCR number with correct format', () => {
      const number = qualityService.generateNCRNumber();
      expect(number).toMatch(/^NCR-\d{4}-\d{7}$/);
    });

    it('should generate unique NCR numbers', async () => {
      const number1 = qualityService.generateNCRNumber();
      // Add small delay to ensure uniqueness
      await new Promise(resolve => setTimeout(resolve, 1));
      const number2 = qualityService.generateNCRNumber();
      expect(number1).not.toBe(number2);
    });
  });

  describe('calculateCpk', () => {
    it('should calculate Cpk correctly for centered process', () => {
      const measurements = [4.9, 5.0, 5.1, 4.95, 5.05, 5.0, 4.98, 5.02];
      const cpk = qualityService.calculateCpk(measurements, 4.5, 5.5);
      
      expect(cpk).toBeGreaterThan(1); // Process should be capable
      expect(cpk).toBeLessThan(10); // Reasonable upper bound
    });

    it('should return null for insufficient data', () => {
      const measurements = [5.0];
      const cpk = qualityService.calculateCpk(measurements, 4.5, 5.5);
      
      expect(cpk).toBeNull();
    });

    it('should return null for zero standard deviation', () => {
      const measurements = [5.0, 5.0, 5.0, 5.0];
      const cpk = qualityService.calculateCpk(measurements, 4.5, 5.5);
      
      expect(cpk).toBeNull();
    });

    it('should calculate lower Cpk for off-center process', () => {
      const measurements = [4.6, 4.7, 4.65, 4.68, 4.72]; // Biased toward lower limit
      const cpk = qualityService.calculateCpk(measurements, 4.5, 5.5);
      
      expect(cpk).toBeDefined();
      expect(cpk).toBeGreaterThan(0);
    });
  });

  describe('isProcessInControl', () => {
    it('should return true for measurements within control limits', () => {
      const measurements = [5.0, 5.1, 4.9, 5.05, 4.95];
      const controlLimits = { ucl: 5.2, lcl: 4.8 };
      
      const isInControl = qualityService.isProcessInControl(measurements, controlLimits);
      expect(isInControl).toBe(true);
    });

    it('should return false for measurements outside control limits', () => {
      const measurements = [5.0, 5.1, 4.9, 5.3, 4.95]; // 5.3 is outside UCL
      const controlLimits = { ucl: 5.2, lcl: 4.8 };
      
      const isInControl = qualityService.isProcessInControl(measurements, controlLimits);
      expect(isInControl).toBe(false);
    });

    it('should return true for empty measurements array', () => {
      const measurements: number[] = [];
      const controlLimits = { ucl: 5.2, lcl: 4.8 };
      
      const isInControl = qualityService.isProcessInControl(measurements, controlLimits);
      expect(isInControl).toBe(true);
    });
  });

  describe('calculateFirstPassYield', () => {
    it('should calculate correct first pass yield', () => {
      const fpy = qualityService.calculateFirstPassYield(100, 95);
      expect(fpy).toBe(95);
    });

    it('should return 0 for zero total inspected', () => {
      const fpy = qualityService.calculateFirstPassYield(0, 0);
      expect(fpy).toBe(0);
    });

    it('should handle perfect yield', () => {
      const fpy = qualityService.calculateFirstPassYield(50, 50);
      expect(fpy).toBe(100);
    });

    it('should handle zero pass rate', () => {
      const fpy = qualityService.calculateFirstPassYield(50, 0);
      expect(fpy).toBe(0);
    });
  });

  describe('isCertificateRequired', () => {
    const mockInspection = {
      id: 'insp-123',
      inspectionNumber: 'INS-001',
      workOrderOperationId: 'wo-op-123',
      qualityPlanId: 'qp-456',
      sampleSize: 2,
      inspectorId: 'inspector-789',
      inspectionDate: new Date(),
      overallResult: InspectionResult.PASS,
      certificateRequired: false,
      certificateGenerated: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should require certificate for critical characteristics', () => {
      const characteristics: QualityCharacteristic[] = [
        {
          id: 'char-1',
          qualityPlanId: 'qp-456',
          characteristicNumber: 1,
          characteristicName: 'Critical Dimension',
          characteristicType: CharacteristicType.DIMENSIONAL,
          isCritical: true,
          createdAt: new Date()
        }
      ];

      const required = qualityService.isCertificateRequired(mockInspection, characteristics);
      expect(required).toBe(true);
    });

    it('should not require certificate for non-critical characteristics only', () => {
      const characteristics: QualityCharacteristic[] = [
        {
          id: 'char-1',
          qualityPlanId: 'qp-456',
          characteristicNumber: 1,
          characteristicName: 'Non-Critical Dimension',
          characteristicType: CharacteristicType.DIMENSIONAL,
          isCritical: false,
          createdAt: new Date()
        }
      ];

      const required = qualityService.isCertificateRequired(mockInspection, characteristics);
      expect(required).toBe(false);
    });

    it('should not require certificate for empty characteristics', () => {
      const characteristics: QualityCharacteristic[] = [];

      const required = qualityService.isCertificateRequired(mockInspection, characteristics);
      expect(required).toBe(false);
    });
  });
});