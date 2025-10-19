import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { FAIService } from '../../services/FAIService';
import {
  FAIStatus,
  CharacteristicResult,
  InspectionMethod,
  ToleranceType,
  CreateFAIReportInput,
  UpdateFAIReportInput,
  CreateCharacteristicInput,
  UpdateCharacteristicInput,
} from '../../types/fai';

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    part: {
      findUnique: vi.fn(),
    },
    fAIReport: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    fAICharacteristic: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('FAIService', () => {
  let faiService: FAIService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new PrismaClient();
    faiService = new FAIService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFAIReport', () => {
    it('should create a new FAI report successfully', async () => {
      const input: CreateFAIReportInput = {
        faiNumber: 'FAI-2025-001',
        partId: 'part-123',
        revisionLevel: 'Rev C',
        form1Data: {
          partNumber: 'PN-12345',
          partName: 'Turbine Blade',
          drawingNumber: 'DWG-001',
          drawingRevision: 'B',
          manufacturerName: 'Acme Manufacturing',
        },
      };

      const mockPart = {
        id: 'part-123',
        partNumber: 'PN-12345',
        partName: 'Turbine Blade',
      };

      const mockFAIReport = {
        id: 'fai-report-1',
        faiNumber: 'FAI-2025-001',
        partId: 'part-123',
        workOrderId: null,
        inspectionId: null,
        status: FAIStatus.IN_PROGRESS,
        revisionLevel: 'Rev C',
        form1Data: input.form1Data,
        form2Data: null,
        createdById: 'user-1',
        reviewedById: null,
        approvedById: null,
        reviewedAt: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        characteristics: [],
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.fAIReport.findUnique.mockResolvedValue(null);
      mockPrisma.fAIReport.create.mockResolvedValue(mockFAIReport);

      const result = await faiService.createFAIReport(input, 'user-1');

      expect(mockPrisma.part.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-123' },
      });
      expect(mockPrisma.fAIReport.create).toHaveBeenCalled();
      expect(result.faiNumber).toBe('FAI-2025-001');
      expect(result.status).toBe(FAIStatus.IN_PROGRESS);
    });

    it('should throw error if part does not exist', async () => {
      const input: CreateFAIReportInput = {
        faiNumber: 'FAI-2025-001',
        partId: 'invalid-part',
      };

      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(faiService.createFAIReport(input, 'user-1')).rejects.toThrow(
        'Part not found with ID: invalid-part'
      );
    });

    it('should throw error if FAI number already exists', async () => {
      const input: CreateFAIReportInput = {
        faiNumber: 'FAI-2025-001',
        partId: 'part-123',
      };

      const mockPart = { id: 'part-123', partNumber: 'PN-12345' };
      const mockExistingFAI = { id: 'existing-fai', faiNumber: 'FAI-2025-001' };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockExistingFAI);

      await expect(faiService.createFAIReport(input, 'user-1')).rejects.toThrow(
        'FAI report with number FAI-2025-001 already exists'
      );
    });
  });

  describe('getFAIReport', () => {
    it('should retrieve FAI report by ID', async () => {
      const mockFAIReport = {
        id: 'fai-report-1',
        faiNumber: 'FAI-2025-001',
        partId: 'part-123',
        workOrderId: null,
        inspectionId: null,
        status: FAIStatus.IN_PROGRESS,
        revisionLevel: 'Rev C',
        form1Data: {},
        form2Data: null,
        createdById: 'user-1',
        reviewedById: null,
        approvedById: null,
        reviewedAt: null,
        approvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        characteristics: [],
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);

      const result = await faiService.getFAIReport('fai-report-1');

      expect(mockPrisma.fAIReport.findUnique).toHaveBeenCalledWith({
        where: { id: 'fai-report-1' },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });
      expect(result).not.toBeNull();
      expect(result?.id).toBe('fai-report-1');
    });

    it('should return null if FAI report does not exist', async () => {
      mockPrisma.fAIReport.findUnique.mockResolvedValue(null);

      const result = await faiService.getFAIReport('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateFAIReport', () => {
    it('should update FAI report successfully', async () => {
      const input: UpdateFAIReportInput = {
        status: FAIStatus.REVIEW,
        reviewedById: 'reviewer-1',
      };

      const mockExistingReport = {
        id: 'fai-report-1',
        faiNumber: 'FAI-2025-001',
        status: FAIStatus.IN_PROGRESS,
      };

      const mockUpdatedReport = {
        ...mockExistingReport,
        status: FAIStatus.REVIEW,
        reviewedById: 'reviewer-1',
        reviewedAt: new Date(),
        characteristics: [],
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockExistingReport);
      mockPrisma.fAIReport.update.mockResolvedValue(mockUpdatedReport);

      const result = await faiService.updateFAIReport('fai-report-1', input);

      expect(result.status).toBe(FAIStatus.REVIEW);
      expect(result.reviewedById).toBe('reviewer-1');
    });

    it('should throw error if FAI report does not exist', async () => {
      const input: UpdateFAIReportInput = {
        status: FAIStatus.REVIEW,
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(null);

      await expect(faiService.updateFAIReport('non-existent', input)).rejects.toThrow(
        'FAI report not found with ID: non-existent'
      );
    });
  });

  describe('deleteFAIReport', () => {
    it('should delete FAI report successfully', async () => {
      const mockFAIReport = {
        id: 'fai-report-1',
        status: FAIStatus.IN_PROGRESS,
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);
      mockPrisma.fAIReport.delete.mockResolvedValue(mockFAIReport);

      await faiService.deleteFAIReport('fai-report-1');

      expect(mockPrisma.fAIReport.delete).toHaveBeenCalledWith({
        where: { id: 'fai-report-1' },
      });
    });

    it('should not allow deletion of approved FAI report', async () => {
      const mockFAIReport = {
        id: 'fai-report-1',
        status: FAIStatus.APPROVED,
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);

      await expect(faiService.deleteFAIReport('fai-report-1')).rejects.toThrow(
        'Cannot delete approved FAI report'
      );
    });

    it('should throw error if FAI report does not exist', async () => {
      mockPrisma.fAIReport.findUnique.mockResolvedValue(null);

      await expect(faiService.deleteFAIReport('non-existent')).rejects.toThrow(
        'FAI report not found with ID: non-existent'
      );
    });
  });

  describe('addCharacteristic', () => {
    it('should add characteristic successfully', async () => {
      const input: CreateCharacteristicInput = {
        characteristicNumber: 1,
        characteristic: 'Overall Length',
        specification: '10.00 ± 0.05',
        nominalValue: 10.0,
        upperLimit: 0.05,
        lowerLimit: 0.05,
        unitOfMeasure: 'in',
        toleranceType: ToleranceType.BILATERAL,
        inspectionMethod: InspectionMethod.CMM,
        measuredValues: [10.02, 10.01, 9.99],
      };

      const mockFAIReport = {
        id: 'fai-report-1',
        faiNumber: 'FAI-2025-001',
      };

      const mockCharacteristic = {
        id: 'char-1',
        faiReportId: 'fai-report-1',
        characteristicNumber: 1,
        characteristic: 'Overall Length',
        specification: '10.00 ± 0.05',
        requirement: null,
        nominalValue: 10.0,
        upperLimit: 0.05,
        lowerLimit: 0.05,
        unitOfMeasure: 'in',
        toleranceType: ToleranceType.BILATERAL,
        inspectionMethod: InspectionMethod.CMM,
        inspectionFrequency: null,
        measuredValues: [10.02, 10.01, 9.99],
        actualValue: 10.01,
        deviation: 0.01,
        result: CharacteristicResult.PASS,
        notes: null,
        verifiedById: null,
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);
      mockPrisma.fAICharacteristic.findUnique.mockResolvedValue(null);
      mockPrisma.fAICharacteristic.create.mockResolvedValue(mockCharacteristic);

      const result = await faiService.addCharacteristic('fai-report-1', input);

      expect(mockPrisma.fAICharacteristic.create).toHaveBeenCalled();
      expect(result.characteristicNumber).toBe(1);
      expect(result.actualValue).toBeCloseTo(10.01, 2);
      expect(result.result).toBe(CharacteristicResult.PASS);
    });

    it('should throw error if characteristic number already exists', async () => {
      const input: CreateCharacteristicInput = {
        characteristicNumber: 1,
        characteristic: 'Overall Length',
        specification: '10.00 ± 0.05',
      };

      const mockFAIReport = { id: 'fai-report-1' };
      const mockExistingChar = { id: 'existing-char', characteristicNumber: 1 };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);
      mockPrisma.fAICharacteristic.findUnique.mockResolvedValue(mockExistingChar);

      await expect(faiService.addCharacteristic('fai-report-1', input)).rejects.toThrow(
        'Characteristic number 1 already exists for this FAI report'
      );
    });

    it('should correctly validate FAIL result for out-of-tolerance measurement', async () => {
      const input: CreateCharacteristicInput = {
        characteristicNumber: 2,
        characteristic: 'Diameter',
        specification: '5.00 ± 0.01',
        nominalValue: 5.0,
        upperLimit: 0.01,
        lowerLimit: 0.01,
        unitOfMeasure: 'in',
        toleranceType: ToleranceType.BILATERAL,
        inspectionMethod: InspectionMethod.MANUAL,
        measuredValues: [5.02], // Out of tolerance (5.00 ± 0.01)
      };

      const mockFAIReport = { id: 'fai-report-1' };
      const mockCharacteristic = {
        id: 'char-2',
        faiReportId: 'fai-report-1',
        ...input,
        actualValue: 5.02,
        deviation: 0.02,
        result: CharacteristicResult.FAIL,
        requirement: null,
        inspectionFrequency: null,
        notes: null,
        verifiedById: null,
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);
      mockPrisma.fAICharacteristic.findUnique.mockResolvedValue(null);
      mockPrisma.fAICharacteristic.create.mockResolvedValue(mockCharacteristic);

      const result = await faiService.addCharacteristic('fai-report-1', input);

      expect(result.result).toBe(CharacteristicResult.FAIL);
      expect(result.actualValue).toBe(5.02);
      expect(result.deviation).toBe(0.02);
    });
  });

  describe('updateCharacteristic', () => {
    it('should update characteristic successfully', async () => {
      const input: UpdateCharacteristicInput = {
        measuredValues: [10.03, 10.02, 10.01],
        notes: 'Remeasured after calibration',
      };

      const mockExistingChar = {
        id: 'char-1',
        faiReportId: 'fai-report-1',
        characteristicNumber: 1,
        characteristic: 'Overall Length',
        specification: '10.00 ± 0.05',
        requirement: null,
        nominalValue: 10.0,
        upperLimit: 0.05,
        lowerLimit: 0.05,
        unitOfMeasure: 'in',
        toleranceType: ToleranceType.BILATERAL,
        inspectionMethod: InspectionMethod.CMM,
        inspectionFrequency: null,
        measuredValues: [10.02, 10.01, 9.99],
        actualValue: 10.01,
        deviation: 0.01,
        result: CharacteristicResult.PASS,
        notes: null,
        verifiedById: null,
        verifiedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdatedChar = {
        ...mockExistingChar,
        measuredValues: [10.03, 10.02, 10.01],
        actualValue: 10.02,
        deviation: 0.02,
        notes: 'Remeasured after calibration',
      };

      mockPrisma.fAICharacteristic.findUnique.mockResolvedValue(mockExistingChar);
      mockPrisma.fAICharacteristic.update.mockResolvedValue(mockUpdatedChar);

      const result = await faiService.updateCharacteristic('char-1', input);

      expect(result.actualValue).toBeCloseTo(10.02, 2);
      expect(result.notes).toBe('Remeasured after calibration');
    });

    it('should throw error if characteristic does not exist', async () => {
      const input: UpdateCharacteristicInput = {
        notes: 'Test note',
      };

      mockPrisma.fAICharacteristic.findUnique.mockResolvedValue(null);

      await expect(faiService.updateCharacteristic('non-existent', input)).rejects.toThrow(
        'Characteristic not found with ID: non-existent'
      );
    });
  });

  describe('approveFAIReport', () => {
    it('should approve FAI report successfully', async () => {
      const mockFAIReport = {
        id: 'fai-report-1',
        faiNumber: 'FAI-2025-001',
        status: FAIStatus.REVIEW,
        characteristics: [
          {
            id: 'char-1',
            characteristicNumber: 1,
            actualValue: 10.01,
            result: CharacteristicResult.PASS,
          },
          {
            id: 'char-2',
            characteristicNumber: 2,
            actualValue: 5.00,
            result: CharacteristicResult.PASS,
          },
        ],
      };

      const mockApprovedReport = {
        ...mockFAIReport,
        status: FAIStatus.APPROVED,
        approvedById: 'approver-1',
        approvedAt: new Date(),
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);
      mockPrisma.fAIReport.update.mockResolvedValue(mockApprovedReport);

      const result = await faiService.approveFAIReport('fai-report-1', 'approver-1');

      expect(result.status).toBe(FAIStatus.APPROVED);
      expect(result.approvedById).toBe('approver-1');
    });

    it('should throw error if characteristics are not measured', async () => {
      const mockFAIReport = {
        id: 'fai-report-1',
        characteristics: [
          {
            id: 'char-1',
            actualValue: null,
            result: null,
          },
        ],
      };

      mockPrisma.fAIReport.findUnique.mockResolvedValue(mockFAIReport);

      await expect(faiService.approveFAIReport('fai-report-1', 'approver-1')).rejects.toThrow(
        'Cannot approve FAI report: 1 characteristics have not been measured'
      );
    });

    it('should throw error if FAI report does not exist', async () => {
      mockPrisma.fAIReport.findUnique.mockResolvedValue(null);

      await expect(faiService.approveFAIReport('non-existent', 'approver-1')).rejects.toThrow(
        'FAI report not found with ID: non-existent'
      );
    });
  });

  describe('listFAIReports', () => {
    it('should list FAI reports with pagination', async () => {
      const mockReports = [
        {
          id: 'fai-1',
          faiNumber: 'FAI-2025-001',
          partId: 'part-123',
          workOrderId: null,
          inspectionId: null,
          status: FAIStatus.IN_PROGRESS,
          revisionLevel: 'Rev C',
          form1Data: {},
          form2Data: null,
          createdById: 'user-1',
          reviewedById: null,
          approvedById: null,
          reviewedAt: null,
          approvedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          characteristics: [],
        },
      ];

      mockPrisma.fAIReport.count.mockResolvedValue(1);
      mockPrisma.fAIReport.findMany.mockResolvedValue(mockReports);

      const result = await faiService.listFAIReports({ page: 1, pageSize: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter FAI reports by status', async () => {
      mockPrisma.fAIReport.count.mockResolvedValue(0);
      mockPrisma.fAIReport.findMany.mockResolvedValue([]);

      await faiService.listFAIReports({ status: FAIStatus.APPROVED });

      expect(mockPrisma.fAIReport.count).toHaveBeenCalledWith({
        where: { status: FAIStatus.APPROVED },
      });
    });
  });
});
