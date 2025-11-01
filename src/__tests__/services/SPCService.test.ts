import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient, SPCChartType, LimitCalculationMethod, SPCConfiguration } from '@prisma/client';
import { SPCService, ControlLimits, CapabilityIndices } from '../../services/SPCService';

// Mock Prisma Client
const mockPrisma = {
  sPCConfiguration: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock the prisma instance in the service
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  })),
}));

describe('SPCService', () => {
  let service: SPCService;

  // Test data - Using known statistical datasets for validation
  const mockSubgroups = [
    [10.2, 10.1, 10.3, 10.0, 10.2],
    [10.0, 10.2, 10.1, 10.3, 10.1],
    [10.1, 10.0, 10.2, 10.1, 10.0],
    [10.3, 10.1, 10.2, 10.0, 10.1],
    [10.0, 10.1, 10.3, 10.2, 10.1],
  ];

  const mockIndividuals = [10.1, 10.2, 10.0, 10.3, 10.1, 10.2, 10.0, 10.1, 10.3, 10.2];

  const mockDefectCounts = [2, 1, 3, 0, 2, 1, 4, 2, 1, 3];
  const mockSampleSizes = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100];

  const mockSPCConfig = {
    id: 'config-123',
    parameterId: 'param-123',
    chartType: 'I_MR' as SPCChartType,
    subgroupSize: null,
    UCL: 10.5,
    centerLine: 10.0,
    LCL: 9.5,
    rangeUCL: null,
    rangeCL: null,
    rangeLCL: null,
    USL: 10.6,
    LSL: 9.4,
    targetValue: 10.0,
    limitsBasedOn: 'HISTORICAL_DATA' as LimitCalculationMethod,
    historicalDataDays: 30,
    lastCalculatedAt: new Date(),
    enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
    ruleSensitivity: 'NORMAL',
    enableCapability: true,
    confidenceLevel: 0.95,
    isActive: true,
    createdBy: 'user-123',
    lastModifiedBy: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Instantiate service with mock Prisma client for each test
    service = new SPCService(mockPrisma);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize SPC service', () => {
      expect(service).toBeInstanceOf(SPCService);
    });
  });

  describe('calculateXBarRLimits', () => {
    it('should calculate X-bar R control limits correctly', async () => {
      const result = await service.calculateXBarRLimits(mockSubgroups);

      expect(result).toEqual({
        UCL: expect.any(Number),
        centerLine: expect.any(Number),
        LCL: expect.any(Number),
        rangeUCL: expect.any(Number),
        rangeCL: expect.any(Number),
        rangeLCL: expect.any(Number),
        sigma: expect.any(Number),
      });

      // Verify center line is approximately the overall mean
      expect(result.centerLine).toBeCloseTo(10.14, 1);

      // Verify UCL > centerLine > LCL
      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.centerLine).toBeGreaterThan(result.LCL);

      // Verify range limits
      expect(result.rangeUCL).toBeGreaterThan(result.rangeCL!);
      expect(result.rangeLCL).toBe(0); // D3 = 0 for n=5
    });

    it('should validate minimum subgroups requirement', async () => {
      await expect(service.calculateXBarRLimits([])).rejects.toThrow('No subgroups provided');
      await expect(service.calculateXBarRLimits([mockSubgroups[0]])).rejects.toThrow('Minimum 2 subgroups required');
    });

    it('should validate subgroup size requirements', async () => {
      const invalidSubgroups = [[10.1], [10.2]]; // Size 1
      await expect(service.calculateXBarRLimits(invalidSubgroups)).rejects.toThrow('Subgroup size must be at least 2');

      const largeSubgroups = [
        Array(11).fill(10.0),
        Array(11).fill(10.1)
      ]; // Size 11
      await expect(service.calculateXBarRLimits(largeSubgroups)).rejects.toThrow('Subgroup size must be between 2 and 10');
    });

    it('should validate consistent subgroup sizes', async () => {
      const inconsistentSubgroups = [
        [10.1, 10.2, 10.3],
        [10.0, 10.1], // Different size
      ];
      await expect(service.calculateXBarRLimits(inconsistentSubgroups)).rejects.toThrow('All subgroups must have consistent size');
    });

    it('should handle different subgroup sizes correctly', async () => {
      const size2Subgroups = [
        [10.0, 10.2],
        [10.1, 10.3],
        [10.2, 10.0],
      ];

      const result = await service.calculateXBarRLimits(size2Subgroups);
      expect(result).toBeDefined();
      expect(result.centerLine).toBeCloseTo(10.133, 1);
    });

    it('should calculate statistical values correctly for known dataset', async () => {
      // Use known statistical values for validation
      const knownSubgroups = [
        [20, 21, 19],
        [22, 20, 21],
        [19, 20, 22],
        [21, 19, 20],
      ];

      const result = await service.calculateXBarRLimits(knownSubgroups);

      // Verify calculations using known statistical formulas
      expect(result.centerLine).toBeCloseTo(20.25, 1); // Overall mean
      expect(result.sigma).toBeGreaterThan(0);
    });
  });

  describe('calculateXBarSLimits', () => {
    it('should calculate X-bar S control limits correctly', async () => {
      const result = await service.calculateXBarSLimits(mockSubgroups);

      expect(result).toEqual({
        UCL: expect.any(Number),
        centerLine: expect.any(Number),
        LCL: expect.any(Number),
        sigma: expect.any(Number),
      });

      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.centerLine).toBeGreaterThan(result.LCL);
    });

    it('should validate input requirements', async () => {
      await expect(service.calculateXBarSLimits([])).rejects.toThrow('No subgroups provided');
      await expect(service.calculateXBarSLimits([[10.1]])).rejects.toThrow('Subgroup size must be at least 2');
    });

    it('should handle large subgroup sizes', async () => {
      const largeSubgroups = [
        Array(15).fill(10.0).map((v, i) => v + i * 0.01),
        Array(15).fill(10.1).map((v, i) => v + i * 0.01),
      ];

      const result = await service.calculateXBarSLimits(largeSubgroups);
      expect(result).toBeDefined();
      expect(result.sigma).toBeGreaterThan(0);
    });

    it('should compare favorably with X-bar R for small subgroups', async () => {
      const rResult = await service.calculateXBarRLimits(mockSubgroups);
      const sResult = await service.calculateXBarSLimits(mockSubgroups);

      // Center lines should be identical
      expect(sResult.centerLine).toBeCloseTo(rResult.centerLine, 3);

      // Sigma estimates should be similar
      expect(Math.abs(sResult.sigma - rResult.sigma) / rResult.sigma).toBeLessThan(0.1);
    });
  });

  describe('calculateIMRLimits', () => {
    it('should calculate I-MR control limits correctly', async () => {
      const result = await service.calculateIMRLimits(mockIndividuals);

      expect(result).toEqual({
        UCL: expect.any(Number),
        centerLine: expect.any(Number),
        LCL: expect.any(Number),
        rangeUCL: expect.any(Number),
        rangeCL: expect.any(Number),
        rangeLCL: expect.any(Number),
        sigma: expect.any(Number),
      });

      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.centerLine).toBeGreaterThan(result.LCL);
      expect(result.rangeLCL).toBe(0); // Always 0 for moving range
    });

    it('should validate minimum data requirements', async () => {
      await expect(service.calculateIMRLimits([10.1, 10.2])).rejects.toThrow('Minimum 4 data points required');
    });

    it('should handle moving range span validation', async () => {
      await expect(service.calculateIMRLimits([10.1, 10.2], 3)).rejects.toThrow('At least 3 data points required');
    });

    it('should calculate moving ranges correctly', async () => {
      const simpleData = [10, 12, 8, 14];
      const result = await service.calculateIMRLimits(simpleData);

      expect(result.centerLine).toBe(11); // Mean of [10, 12, 8, 14]
      expect(result.rangeCL).toBeCloseTo(3.33, 1); // Mean of moving ranges [2, 4, 6]
    });

    it('should handle different moving range spans', async () => {
      const data = [10, 12, 8, 14, 11, 9];
      const span2Result = await service.calculateIMRLimits(data, 2);
      const span3Result = await service.calculateIMRLimits(data, 3);

      expect(span2Result.rangeCL).not.toEqual(span3Result.rangeCL);
      expect(span2Result.centerLine).toBeCloseTo(span3Result.centerLine, 3);
    });
  });

  describe('calculatePChartLimits', () => {
    it('should calculate P-chart control limits correctly', async () => {
      const result = await service.calculatePChartLimits(mockDefectCounts, mockSampleSizes);

      expect(result).toEqual({
        UCL: expect.any(Number),
        centerLine: expect.any(Number),
        LCL: expect.any(Number),
        sigma: expect.any(Number),
      });

      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.centerLine).toBeGreaterThanOrEqual(result.LCL);
      expect(result.LCL).toBeGreaterThanOrEqual(0); // Can't be negative
    });

    it('should validate input array lengths', async () => {
      await expect(service.calculatePChartLimits([1, 2], [100])).rejects.toThrow('Defect counts and sample sizes arrays must have same length');
    });

    it('should validate non-negative values', async () => {
      await expect(service.calculatePChartLimits([-1, 2], [100, 100])).rejects.toThrow('Defect counts cannot be negative');
      await expect(service.calculatePChartLimits([1, 2], [-100, 100])).rejects.toThrow('Sample sizes cannot be negative');
    });

    it('should validate defect counts do not exceed sample sizes', async () => {
      await expect(service.calculatePChartLimits([150, 2], [100, 100])).rejects.toThrow('Defect count (150) cannot exceed sample size (100)');
    });

    it('should handle zero defects correctly', async () => {
      const zeroDefects = [0, 0, 0, 0, 0];
      const samples = [100, 100, 100, 100, 100];

      const result = await service.calculatePChartLimits(zeroDefects, samples);
      expect(result.centerLine).toBe(0);
      expect(result.LCL).toBe(0);
      expect(result.UCL).toBeGreaterThan(0);
    });

    it('should calculate proportion correctly', async () => {
      const defects = [5, 10, 15];
      const samples = [100, 200, 300];

      const result = await service.calculatePChartLimits(defects, samples);

      // p-bar = (5 + 10 + 15) / (100 + 200 + 300) = 30/600 = 0.05
      expect(result.centerLine).toBeCloseTo(0.05, 3);
    });

    it('should handle variable sample sizes', async () => {
      const defects = [1, 2, 3, 4];
      const variableSamples = [50, 100, 150, 200];

      const result = await service.calculatePChartLimits(defects, variableSamples);
      expect(result).toBeDefined();
      expect(result.centerLine).toBeGreaterThan(0);
    });
  });

  describe('calculateCChartLimits', () => {
    it('should calculate C-chart control limits correctly', async () => {
      const result = await service.calculateCChartLimits(mockDefectCounts);

      expect(result).toEqual({
        UCL: expect.any(Number),
        centerLine: expect.any(Number),
        LCL: expect.any(Number),
        sigma: expect.any(Number),
      });

      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.centerLine).toBeGreaterThanOrEqual(result.LCL);
      expect(result.LCL).toBeGreaterThanOrEqual(0);
    });

    it('should validate minimum data requirements', async () => {
      await expect(service.calculateCChartLimits([])).rejects.toThrow('No defect counts provided');
      await expect(service.calculateCChartLimits([5])).rejects.toThrow('Minimum 2 data points required');
    });

    it('should validate non-negative values', async () => {
      await expect(service.calculateCChartLimits([1, -2, 3])).rejects.toThrow('Defect counts cannot be negative');
    });

    it('should follow Poisson distribution properties', async () => {
      const poissonData = [4, 6, 3, 7, 5, 4, 6, 5, 3, 7];
      const result = await service.calculateCChartLimits(poissonData);

      // For Poisson, sigma = sqrt(mean)
      expect(result.sigma).toBeCloseTo(Math.sqrt(result.centerLine), 2);
    });

    it('should handle zero defects', async () => {
      const zeroDefects = [0, 0, 0, 0];
      const result = await service.calculateCChartLimits(zeroDefects);

      expect(result.centerLine).toBe(0);
      expect(result.LCL).toBe(0);
      expect(result.UCL).toBe(0);
      expect(result.sigma).toBe(0);
    });

    it('should calculate known Poisson example correctly', async () => {
      // Known Poisson data with lambda = 5
      const poissonData = [5, 4, 6, 5, 3, 7, 5, 6, 4, 5];
      const result = await service.calculateCChartLimits(poissonData);

      expect(result.centerLine).toBeCloseTo(5, 1);
      expect(result.sigma).toBeCloseTo(Math.sqrt(5), 2);
      expect(result.UCL).toBeCloseTo(5 + 3 * Math.sqrt(5), 1);
    });
  });

  describe('calculateCapabilityIndices', () => {
    it('should calculate capability indices correctly', () => {
      const data = [9.8, 10.0, 10.2, 9.9, 10.1, 10.0, 9.8, 10.3, 9.9, 10.0];
      const USL = 10.5;
      const LSL = 9.5;
      const target = 10.0;

      const result = service.calculateCapabilityIndices(data, USL, LSL, target);

      expect(result).toEqual({
        Cp: expect.any(Number),
        Cpk: expect.any(Number),
        Pp: expect.any(Number),
        Ppk: expect.any(Number),
        Cpm: expect.any(Number),
      });

      expect(result!.Cp).toBeGreaterThan(0);
      expect(result!.Cpk).toBeGreaterThan(0);
      expect(result!.Cpk).toBeLessThanOrEqual(result!.Cp);
    });

    it('should validate minimum data requirements', () => {
      expect(() => service.calculateCapabilityIndices([10.0, 10.1])).toThrow('At least 3 data points required');
    });

    it('should validate specification limits', () => {
      const data = [9.8, 10.0, 10.2];

      expect(() => service.calculateCapabilityIndices(data)).toThrow('At least one specification limit');
      expect(() => service.calculateCapabilityIndices(data, 9.5, 10.5)).toThrow('Upper specification limit');
    });

    it('should handle one-sided specifications', () => {
      const data = [9.8, 10.0, 10.2, 9.9, 10.1];

      // Only USL
      const resultUSL = service.calculateCapabilityIndices(data, 10.5);
      expect(resultUSL!.Cpk).toBeGreaterThan(0);
      expect(resultUSL!.Cp).toBe(0); // Can't calculate without both limits

      // Only LSL
      const resultLSL = service.calculateCapabilityIndices(data, undefined, 9.5);
      expect(resultLSL!.Cpk).toBeGreaterThan(0);
      expect(resultLSL!.Cp).toBe(0);
    });

    it('should handle perfect process (zero variation)', () => {
      const perfectData = [10.0, 10.0, 10.0, 10.0, 10.0];
      const result = service.calculateCapabilityIndices(perfectData, 10.5, 9.5, 10.0);

      expect(result!.Cp).toBe(999);
      expect(result!.Cpk).toBe(999);
      expect(result!.Cpm).toBe(999);
    });

    it('should calculate Cpm only when target is specified', () => {
      const data = [9.8, 10.0, 10.2, 9.9, 10.1];

      const withoutTarget = service.calculateCapabilityIndices(data, 10.5, 9.5);
      expect(withoutTarget!.Cpm).toBeUndefined();

      const withTarget = service.calculateCapabilityIndices(data, 10.5, 9.5, 10.0);
      expect(withTarget!.Cpm).toBeDefined();
    });

    it('should calculate known capability example correctly', () => {
      // Known example: data centered at 10, sigma = 0.1, spec limits 9.7 to 10.3
      const centeredData = [9.9, 10.0, 10.1, 9.95, 10.05, 10.0, 9.98, 10.02, 9.97, 10.03];
      const result = service.calculateCapabilityIndices(centeredData, 10.3, 9.7);

      expect(result!.Cp).toBeGreaterThan(1.0); // Should be capable
      expect(result!.Cpk).toBeCloseTo(result!.Cp, 1); // Should be well-centered
    });

    it('should show impact of off-center process', () => {
      // Same variation but shifted off-center
      const offCenterData = [10.1, 10.2, 10.3, 10.15, 10.25, 10.2, 10.18, 10.22, 10.17, 10.23];
      const result = service.calculateCapabilityIndices(offCenterData, 10.5, 9.5);

      expect(result!.Cpk).toBeLessThan(result!.Cp); // Cpk penalizes off-center
    });
  });

  describe('SPC Configuration Management', () => {
    describe('createSPCConfiguration', () => {
      it('should create new SPC configuration', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null); // No existing config
        mockPrisma.sPCConfiguration.create.mockResolvedValue(mockSPCConfig);

        const result = await service.createSPCConfiguration(
          'param-123',
          'I_MR',
          null,
          mockIndividuals,
          {
            USL: 10.6,
            LSL: 9.4,
            targetValue: 10.0,
          },
          'user-123'
        );

        expect(result).toEqual(mockSPCConfig);
        expect(mockPrisma.sPCConfiguration.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            parameterId: 'param-123',
            chartType: 'I_MR',
            USL: 10.6,
            LSL: 9.4,
            targetValue: 10.0,
            createdBy: 'user-123',
          }),
        });
      });

      it('should update existing SPC configuration', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(mockSPCConfig); // Existing config
        mockPrisma.sPCConfiguration.update.mockResolvedValue({
          ...mockSPCConfig,
          chartType: 'X_BAR_R',
        });

        const result = await service.createSPCConfiguration(
          'param-123',
          'X_BAR_R',
          5,
          [],
          {},
          'user-456'
        );

        expect(result.chartType).toBe('X_BAR_R');
        expect(mockPrisma.sPCConfiguration.update).toHaveBeenCalledWith({
          where: { parameterId: 'param-123' },
          data: expect.objectContaining({
            chartType: 'X_BAR_R',
            subgroupSize: 5,
            lastModifiedBy: 'user-456',
          }),
        });
      });

      it('should calculate control limits for I-MR with sufficient data', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);
        mockPrisma.sPCConfiguration.create.mockResolvedValue(mockSPCConfig);

        await service.createSPCConfiguration(
          'param-123',
          'I_MR',
          null,
          mockIndividuals
        );

        expect(mockPrisma.sPCConfiguration.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            UCL: expect.any(Number),
            centerLine: expect.any(Number),
            LCL: expect.any(Number),
            lastCalculatedAt: expect.any(Date),
          }),
        });
      });

      it('should handle insufficient historical data gracefully', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);
        mockPrisma.sPCConfiguration.create.mockResolvedValue({
          ...mockSPCConfig,
          UCL: null,
          centerLine: null,
          LCL: null,
        });

        await service.createSPCConfiguration(
          'param-123',
          'I_MR',
          null,
          [10.0, 10.1] // Insufficient data
        );

        expect(mockPrisma.sPCConfiguration.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            UCL: null,
            centerLine: null,
            LCL: null,
            lastCalculatedAt: null,
          }),
        });
      });

      it('should use default options when none provided', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);
        mockPrisma.sPCConfiguration.create.mockResolvedValue(mockSPCConfig);

        await service.createSPCConfiguration('param-123', 'I_MR', null, []);

        expect(mockPrisma.sPCConfiguration.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            limitsBasedOn: 'HISTORICAL_DATA',
            historicalDataDays: 30,
            enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
            ruleSensitivity: 'NORMAL',
            enableCapability: true,
            confidenceLevel: 0.95,
            isActive: true,
          }),
        });
      });

      it('should handle attribute chart configurations', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);
        mockPrisma.sPCConfiguration.create.mockResolvedValue({
          ...mockSPCConfig,
          chartType: 'P_CHART',
        });

        await service.createSPCConfiguration(
          'param-123',
          'P_CHART',
          null,
          [0.02, 0.03, 0.01, 0.04, 0.02]
        );

        expect(mockPrisma.sPCConfiguration.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            chartType: 'P_CHART',
            UCL: expect.any(Number),
            centerLine: expect.any(Number),
            LCL: expect.any(Number),
          }),
        });
      });
    });

    describe('getSPCConfiguration', () => {
      it('should get SPC configuration by parameter ID', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(mockSPCConfig);

        const result = await service.getSPCConfiguration('param-123');

        expect(result).toEqual(mockSPCConfig);
        expect(mockPrisma.sPCConfiguration.findUnique).toHaveBeenCalledWith({
          where: { parameterId: 'param-123' },
          include: { parameter: true },
        });
      });

      it('should return null when configuration not found', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);

        const result = await service.getSPCConfiguration('nonexistent');

        expect(result).toBeNull();
      });
    });

    describe('updateSPCConfiguration', () => {
      it('should update SPC configuration', async () => {
        const updatedConfig = {
          ...mockSPCConfig,
          UCL: 11.0,
          lastModifiedBy: 'user-456',
        };
        mockPrisma.sPCConfiguration.update.mockResolvedValue(updatedConfig);

        const updates = { UCL: 11.0, isActive: false };
        const result = await service.updateSPCConfiguration('param-123', updates, 'user-456');

        expect(result).toEqual(updatedConfig);
        expect(mockPrisma.sPCConfiguration.update).toHaveBeenCalledWith({
          where: { parameterId: 'param-123' },
          data: {
            UCL: 11.0,
            isActive: false,
            lastModifiedBy: 'user-456',
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should exclude protected fields from updates', async () => {
        mockPrisma.sPCConfiguration.update.mockResolvedValue(mockSPCConfig);

        const updates = {
          id: 'should-be-ignored',
          parameterId: 'should-be-ignored',
          createdBy: 'should-be-ignored',
          createdAt: new Date(),
          UCL: 11.0,
        } as any;

        await service.updateSPCConfiguration('param-123', updates, 'user-456');

        expect(mockPrisma.sPCConfiguration.update).toHaveBeenCalledWith({
          where: { parameterId: 'param-123' },
          data: {
            UCL: 11.0,
            lastModifiedBy: 'user-456',
            updatedAt: expect.any(Date),
          },
        });
      });
    });

    describe('deleteSPCConfiguration', () => {
      it('should delete SPC configuration', async () => {
        mockPrisma.sPCConfiguration.delete.mockResolvedValue(mockSPCConfig);

        await service.deleteSPCConfiguration('param-123');

        expect(mockPrisma.sPCConfiguration.delete).toHaveBeenCalledWith({
          where: { parameterId: 'param-123' },
        });
      });

      it('should handle deletion errors', async () => {
        mockPrisma.sPCConfiguration.delete.mockRejectedValue(new Error('Configuration not found'));

        await expect(service.deleteSPCConfiguration('nonexistent')).rejects.toThrow('Configuration not found');
      });
    });

    describe('listSPCConfigurations', () => {
      it('should list all SPC configurations without filters', async () => {
        const mockConfigs = [mockSPCConfig, { ...mockSPCConfig, id: 'config-456' }];
        mockPrisma.sPCConfiguration.findMany.mockResolvedValue(mockConfigs);

        const result = await service.listSPCConfigurations();

        expect(result).toEqual(mockConfigs);
        expect(mockPrisma.sPCConfiguration.findMany).toHaveBeenCalledWith({
          where: undefined,
          include: {
            parameter: {
              include: { operation: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should list SPC configurations with filters', async () => {
        const activeConfigs = [mockSPCConfig];
        mockPrisma.sPCConfiguration.findMany.mockResolvedValue(activeConfigs);

        const filters = { isActive: true, chartType: 'I_MR' as SPCChartType };
        const result = await service.listSPCConfigurations(filters);

        expect(result).toEqual(activeConfigs);
        expect(mockPrisma.sPCConfiguration.findMany).toHaveBeenCalledWith({
          where: filters,
          include: {
            parameter: {
              include: { operation: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      });

      it('should handle empty results', async () => {
        mockPrisma.sPCConfiguration.findMany.mockResolvedValue([]);

        const result = await service.listSPCConfigurations();

        expect(result).toEqual([]);
      });
    });
  });

  describe('Manufacturing Scenarios', () => {
    it('should handle aerospace dimensional tolerances', async () => {
      // Tight aerospace tolerances for critical dimensions
      const aerospaceDimensions = [
        25.000, 25.001, 24.999, 25.002, 24.998,
        25.001, 25.000, 24.999, 25.001, 25.000
      ];

      const result = await service.calculateIMRLimits(aerospaceDimensions);

      expect(result.centerLine).toBeCloseTo(25.0001, 3);
      expect(result.sigma).toBeLessThan(0.01); // Very tight process
    });

    it('should handle automotive defect rate monitoring', async () => {
      // Automotive defect rates (parts per million)
      const defectRates = [0.002, 0.001, 0.003, 0.001, 0.002, 0.001, 0.004, 0.002];
      const result = await service.calculateIMRLimits(defectRates);

      expect(result.centerLine).toBeCloseTo(0.002, 3);
      expect(result.UCL).toBeGreaterThan(result.centerLine);
    });

    it('should handle pharmaceutical process capability', async () => {
      // Pharmaceutical tablet weight variation
      const tabletWeights = [
        249.8, 250.2, 249.9, 250.1, 250.0,
        249.9, 250.1, 250.0, 249.8, 250.2
      ];

      const capability = service.calculateCapabilityIndices(
        tabletWeights,
        252.5, // USL: +1% of target
        247.5, // LSL: -1% of target
        250.0  // Target weight
      );

      expect(capability!.Cp).toBeGreaterThan(1.33); // Pharmaceutical standard
      expect(capability!.Cpm).toBeDefined(); // Target-based index important
    });

    it('should handle electronics surface mount placement accuracy', async () => {
      // SMT placement accuracy in micrometers
      const placementErrors = [
        [2.1, 1.8, 2.3, 2.0, 1.9],
        [2.2, 2.0, 1.7, 2.1, 2.0],
        [1.9, 2.1, 2.2, 1.8, 2.0],
        [2.0, 1.9, 2.1, 2.2, 1.8],
      ];

      const result = await service.calculateXBarRLimits(placementErrors);

      expect(result.centerLine).toBeCloseTo(2.0, 1);
      expect(result.sigma).toBeLessThan(0.5); // High precision process
    });

    it('should handle food safety temperature monitoring', async () => {
      // Critical control point temperatures
      const temperatures = [
        74.2, 74.8, 74.5, 74.1, 74.6,
        74.3, 74.7, 74.4, 74.0, 74.5
      ];

      const result = await service.calculateIMRLimits(temperatures);

      expect(result.centerLine).toBeCloseTo(74.41, 1);
      expect(result.LCL).toBeGreaterThan(73.0); // Above critical minimum
    });

    it('should handle textile quality control', async () => {
      // Fabric defects per 100 square meters
      const fabricDefects = [3, 2, 4, 1, 3, 2, 5, 3, 2, 4];
      const result = await service.calculateCChartLimits(fabricDefects);

      expect(result.centerLine).toBeCloseTo(2.9, 1);
      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.LCL).toBeGreaterThanOrEqual(0);
    });

    it('should handle chemical process yield monitoring', async () => {
      // Batch yield percentages
      const yieldData = [
        [97.2, 97.5, 97.1, 97.4, 97.3],
        [97.0, 97.6, 97.2, 97.3, 97.1],
        [97.4, 97.1, 97.5, 97.2, 97.0],
      ];

      const result = await service.calculateXBarSLimits(yieldData);

      expect(result.centerLine).toBeCloseTo(97.24, 1);
      expect(result.UCL).toBeLessThan(100); // Physically meaningful limit
    });
  });

  describe('Statistical Accuracy and Edge Cases', () => {
    it('should handle extreme outliers gracefully', async () => {
      const dataWithOutliers = [10.0, 10.1, 10.0, 50.0, 10.1, 10.0]; // One extreme outlier

      const result = await service.calculateIMRLimits(dataWithOutliers);

      expect(result.UCL).toBeGreaterThan(result.centerLine);
      expect(result.LCL).toBeLessThan(result.centerLine);
      expect(isFinite(result.sigma)).toBe(true);
    });

    it('should handle constant data (zero variation)', async () => {
      const constantData = [10.0, 10.0, 10.0, 10.0, 10.0];

      const capability = service.calculateCapabilityIndices(constantData, 12.0, 8.0);

      expect(capability!.Cp).toBe(999); // Very large value for perfect process
      expect(capability!.Cpk).toBe(999);
    });

    it('should handle very small numbers accurately', async () => {
      const microData = [0.0001, 0.0002, 0.0001, 0.0003, 0.0002];

      const result = await service.calculateIMRLimits(microData);

      expect(result.centerLine).toBeCloseTo(0.00018, 5);
      expect(result.sigma).toBeGreaterThan(0);
    });

    it('should handle very large numbers accurately', async () => {
      const macroData = [1000000, 1000001, 999999, 1000002, 999998];

      const result = await service.calculateIMRLimits(macroData);

      expect(result.centerLine).toBeCloseTo(1000000, -3);
      expect(result.sigma).toBeGreaterThan(0);
    });

    it('should validate statistical properties of normal distribution', async () => {
      // Generate normal-like data
      const normalData = [
        9.5, 9.7, 9.9, 10.0, 10.1, 10.3, 10.5,
        9.6, 9.8, 10.0, 10.1, 10.2, 10.4, 10.2,
        9.7, 9.9, 10.0, 10.1, 10.2, 10.3, 10.1
      ];

      const capability = service.calculateCapabilityIndices(normalData, 11.0, 9.0);

      // For normal distribution within 3-sigma limits
      expect(capability!.Cp).toBeGreaterThan(1.0);
      expect(capability!.Cpk).toBeCloseTo(capability!.Cp, 0.5); // Should be reasonably centered
    });

    it('should handle asymmetric specifications correctly', async () => {
      const data = [10.0, 10.1, 9.9, 10.2, 9.8, 10.0, 10.1];

      // Tight lower limit, loose upper limit
      const asymmetric = service.calculateCapabilityIndices(data, 15.0, 9.95);

      expect(asymmetric!.Cpk).toBeLessThan(asymmetric!.Cp); // Limited by tighter LSL
    });

    it('should maintain precision with repeated calculations', async () => {
      const testData = mockIndividuals;

      const result1 = await service.calculateIMRLimits(testData);
      const result2 = await service.calculateIMRLimits(testData);

      expect(result1.centerLine).toEqual(result2.centerLine);
      expect(result1.UCL).toEqual(result2.UCL);
      expect(result1.LCL).toEqual(result2.LCL);
    });

    it('should handle database errors in configuration operations', async () => {
      mockPrisma.sPCConfiguration.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.createSPCConfiguration('param-123', 'I_MR', null, []))
        .rejects.toThrow('Database connection failed');
    });

    it('should validate configuration consistency', async () => {
      // Ensure configurations with calculated limits are internally consistent
      mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.sPCConfiguration.create.mockResolvedValue(mockSPCConfig);

      await service.createSPCConfiguration('param-123', 'I_MR', null, mockIndividuals);

      const createCall = mockPrisma.sPCConfiguration.create.mock.calls[0][0];
      const data = createCall.data;

      // UCL should be greater than center line which should be greater than LCL
      if (data.UCL && data.centerLine && data.LCL) {
        expect(data.UCL).toBeGreaterThan(data.centerLine);
        expect(data.centerLine).toBeGreaterThan(data.LCL);
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => 10 + Math.sin(i / 100) * 0.1);

      const startTime = Date.now();
      const result = await service.calculateIMRLimits(largeDataset);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle many small subgroups efficiently', async () => {
      const manySubgroups = Array.from({ length: 1000 }, (_, i) => [
        10 + i * 0.001,
        10 + i * 0.001 + 0.1,
        10 + i * 0.001 - 0.1
      ]);

      const result = await service.calculateXBarRLimits(manySubgroups);

      expect(result).toBeDefined();
      expect(result.centerLine).toBeCloseTo(10.5, 1);
    });

    it('should maintain accuracy with high precision data', async () => {
      const precisionData = Array.from({ length: 100 }, (_, i) =>
        1.23456789 + i * 0.00000001
      );

      const result = await service.calculateIMRLimits(precisionData);

      expect(result.centerLine).toBeCloseTo(1.2345729, 6);
      expect(result.sigma).toBeGreaterThan(0);
    });
  });
});