import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { AsBuiltConfigurationService } from '../../services/AsBuiltConfigurationService';
import { prisma } from '../../lib/prisma';

// Mock Prisma client
vi.mock('../../lib/prisma', () => ({
  prisma: {
    buildRecord: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    buildRecordOperation: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    workOrder: {
      findUnique: vi.fn(),
    },
    part: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    operation: {
      findUnique: vi.fn(),
    },
    partUsage: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    configurationItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe('AsBuiltConfigurationService', () => {
  let asBuiltConfigurationService: AsBuiltConfigurationService;
  const mockPrisma = prisma as any;

  beforeEach(() => {
    asBuiltConfigurationService = new AsBuiltConfigurationService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockBuildRecord = {
    id: 'br-1',
    buildRecordNumber: 'BR-2024-001',
    workOrderId: 'wo-1',
    status: 'IN_PROGRESS',
    workOrder: {
      id: 'wo-1',
      partId: 'part-main',
      part: {
        id: 'part-main',
        partNumber: 'P12345',
        description: 'Main Assembly',
        bomItems: [
          {
            id: 'bom-1',
            childPartId: 'part-child-1',
            quantity: 2,
            position: 'A1',
            childPart: {
              id: 'part-child-1',
              partNumber: 'P12346',
              description: 'Child Part 1',
            },
          },
          {
            id: 'bom-2',
            childPartId: 'part-child-2',
            quantity: 1,
            position: 'B1',
            childPart: {
              id: 'part-child-2',
              partNumber: 'P12347',
              description: 'Child Part 2',
            },
          },
        ],
      },
    },
    operations: [
      {
        id: 'bro-1',
        operationId: 'op-1',
        status: 'COMPLETED',
        partsUsed: [
          {
            partId: 'part-child-1',
            partNumber: 'P12346',
            quantity: 2,
            serialNumbers: ['SN001', 'SN002'],
            lotNumber: 'LOT123',
          },
          {
            partId: 'part-child-2',
            partNumber: 'P12347',
            quantity: 1,
            serialNumbers: ['SN003'],
            lotNumber: 'LOT124',
          },
        ],
      },
    ],
  };

  const mockAsDesignedConfig = {
    mainAssembly: {
      partNumber: 'P12345',
      description: 'Main Assembly',
      children: [
        {
          partNumber: 'P12346',
          description: 'Child Part 1',
          quantity: 2,
          position: 'A1',
          specification: 'Spec A',
        },
        {
          partNumber: 'P12347',
          description: 'Child Part 2',
          quantity: 1,
          position: 'B1',
          specification: 'Spec B',
        },
      ],
    },
  };

  const mockAsBuiltConfig = {
    mainAssembly: {
      partNumber: 'P12345',
      description: 'Main Assembly',
      children: [
        {
          partNumber: 'P12346',
          description: 'Child Part 1',
          quantity: 2,
          position: 'A1',
          serialNumbers: ['SN001', 'SN002'],
          lotNumber: 'LOT123',
        },
        {
          partNumber: 'P12347',
          description: 'Child Part 2',
          quantity: 1,
          position: 'B1',
          serialNumbers: ['SN003'],
          lotNumber: 'LOT124',
        },
      ],
    },
  };

  describe('generateAsBuiltConfiguration', () => {
    beforeEach(() => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(mockBuildRecord);
    });

    it('should generate as-built configuration successfully', async () => {
      const result = await asBuiltConfigurationService.generateAsBuiltConfiguration('br-1');

      expect(mockPrisma.buildRecord.findUnique).toHaveBeenCalledWith({
        where: { id: 'br-1' },
        include: {
          workOrder: {
            include: {
              part: {
                include: {
                  bomItems: {
                    include: {
                      childPart: true,
                    },
                  },
                },
              },
            },
          },
          operations: {
            include: {
              operation: true,
            },
          },
        },
      });

      expect(result).toEqual({
        buildRecordId: 'br-1',
        mainAssembly: {
          partNumber: 'P12345',
          description: 'Main Assembly',
          serialNumber: null,
          lotNumber: null,
        },
        components: [
          {
            partNumber: 'P12346',
            description: 'Child Part 1',
            quantity: 2,
            position: 'A1',
            serialNumbers: ['SN001', 'SN002'],
            lotNumber: 'LOT123',
            operationUsed: 'bro-1',
          },
          {
            partNumber: 'P12347',
            description: 'Child Part 2',
            quantity: 1,
            position: 'B1',
            serialNumbers: ['SN003'],
            lotNumber: 'LOT124',
            operationUsed: 'bro-1',
          },
        ],
        generatedAt: expect.any(Date),
      });
    });

    it('should throw error if build record not found', async () => {
      mockPrisma.buildRecord.findUnique.mockResolvedValue(null);

      await expect(
        asBuiltConfigurationService.generateAsBuiltConfiguration('nonexistent')
      ).rejects.toThrow('Build record not found');
    });

    it('should handle build record without operations', async () => {
      const buildRecordWithoutOps = {
        ...mockBuildRecord,
        operations: [],
      };

      mockPrisma.buildRecord.findUnique.mockResolvedValue(buildRecordWithoutOps);

      const result = await asBuiltConfigurationService.generateAsBuiltConfiguration('br-1');

      expect(result.components).toEqual([]);
    });

    it('should aggregate parts used across multiple operations', async () => {
      const buildRecordMultipleOps = {
        ...mockBuildRecord,
        operations: [
          {
            id: 'bro-1',
            operationId: 'op-1',
            status: 'COMPLETED',
            partsUsed: [
              {
                partId: 'part-child-1',
                partNumber: 'P12346',
                quantity: 1,
                serialNumbers: ['SN001'],
                lotNumber: 'LOT123',
              },
            ],
          },
          {
            id: 'bro-2',
            operationId: 'op-2',
            status: 'COMPLETED',
            partsUsed: [
              {
                partId: 'part-child-1',
                partNumber: 'P12346',
                quantity: 1,
                serialNumbers: ['SN002'],
                lotNumber: 'LOT123',
              },
            ],
          },
        ],
      };

      mockPrisma.buildRecord.findUnique.mockResolvedValue(buildRecordMultipleOps);

      const result = await asBuiltConfigurationService.generateAsBuiltConfiguration('br-1');

      const aggregatedPart = result.components.find(c => c.partNumber === 'P12346');
      expect(aggregatedPart).toEqual({
        partNumber: 'P12346',
        description: 'Child Part 1',
        quantity: 2,
        position: 'A1',
        serialNumbers: ['SN001', 'SN002'],
        lotNumber: 'LOT123',
        operationUsed: 'bro-1, bro-2',
      });
    });
  });

  describe('compareConfigurations', () => {
    it('should compare as-designed vs as-built configurations', async () => {
      const comparison = await asBuiltConfigurationService.compareConfigurations(
        mockAsDesignedConfig,
        mockAsBuiltConfig
      );

      expect(comparison).toEqual({
        mainAssembly: {
          matches: true,
          differences: [],
        },
        components: [
          {
            partNumber: 'P12346',
            matches: true,
            differences: [],
            asDesigned: {
              partNumber: 'P12346',
              description: 'Child Part 1',
              quantity: 2,
              position: 'A1',
              specification: 'Spec A',
            },
            asBuilt: {
              partNumber: 'P12346',
              description: 'Child Part 1',
              quantity: 2,
              position: 'A1',
              serialNumbers: ['SN001', 'SN002'],
              lotNumber: 'LOT123',
            },
          },
          {
            partNumber: 'P12347',
            matches: true,
            differences: [],
            asDesigned: {
              partNumber: 'P12347',
              description: 'Child Part 2',
              quantity: 1,
              position: 'B1',
              specification: 'Spec B',
            },
            asBuilt: {
              partNumber: 'P12347',
              description: 'Child Part 2',
              quantity: 1,
              position: 'B1',
              serialNumbers: ['SN003'],
              lotNumber: 'LOT124',
            },
          },
        ],
        summary: {
          totalComponents: 2,
          matchingComponents: 2,
          deviations: 0,
          compliancePercentage: 100,
        },
      });
    });

    it('should detect quantity deviations', async () => {
      const asBuiltWithDeviations = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [
            {
              ...mockAsBuiltConfig.mainAssembly.children[0],
              quantity: 3, // Should be 2
            },
            mockAsBuiltConfig.mainAssembly.children[1],
          ],
        },
      };

      const comparison = await asBuiltConfigurationService.compareConfigurations(
        mockAsDesignedConfig,
        asBuiltWithDeviations
      );

      const componentWithDeviation = comparison.components.find(c => c.partNumber === 'P12346');
      expect(componentWithDeviation).toEqual({
        partNumber: 'P12346',
        matches: false,
        differences: ['quantity'],
        asDesigned: expect.any(Object),
        asBuilt: expect.any(Object),
      });

      expect(comparison.summary).toEqual({
        totalComponents: 2,
        matchingComponents: 1,
        deviations: 1,
        compliancePercentage: 50,
      });
    });

    it('should detect missing components', async () => {
      const asBuiltMissingComponent = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [mockAsBuiltConfig.mainAssembly.children[0]], // Missing second component
        },
      };

      const comparison = await asBuiltConfigurationService.compareConfigurations(
        mockAsDesignedConfig,
        asBuiltMissingComponent
      );

      expect(comparison.components).toHaveLength(2);
      expect(comparison.components[1]).toEqual({
        partNumber: 'P12347',
        matches: false,
        differences: ['missing'],
        asDesigned: expect.any(Object),
        asBuilt: null,
      });
    });

    it('should detect extra components', async () => {
      const asBuiltExtraComponent = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [
            ...mockAsBuiltConfig.mainAssembly.children,
            {
              partNumber: 'P12348',
              description: 'Extra Part',
              quantity: 1,
              position: 'C1',
              serialNumbers: ['SN004'],
              lotNumber: 'LOT125',
            },
          ],
        },
      };

      const comparison = await asBuiltConfigurationService.compareConfigurations(
        mockAsDesignedConfig,
        asBuiltExtraComponent
      );

      expect(comparison.components).toHaveLength(3);
      expect(comparison.components[2]).toEqual({
        partNumber: 'P12348',
        matches: false,
        differences: ['extra'],
        asDesigned: null,
        asBuilt: expect.any(Object),
      });
    });
  });

  describe('validateConfiguration', () => {
    const validationRules = {
      requireSerialNumbers: ['P12346'],
      requireLotNumbers: ['P12347'],
      allowedSubstitutions: {
        'P12346': ['P12346-ALT'],
      },
      criticalComponents: ['P12346'],
    };

    it('should validate configuration successfully', async () => {
      const result = await asBuiltConfigurationService.validateConfiguration(
        mockAsBuiltConfig,
        validationRules
      );

      expect(result).toEqual({
        isValid: true,
        violations: [],
        warnings: [],
        recommendations: [],
      });
    });

    it('should detect missing serial numbers', async () => {
      const configMissingSerial = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [
            {
              ...mockAsBuiltConfig.mainAssembly.children[0],
              serialNumbers: [], // Missing required serial numbers
            },
            mockAsBuiltConfig.mainAssembly.children[1],
          ],
        },
      };

      const result = await asBuiltConfigurationService.validateConfiguration(
        configMissingSerial,
        validationRules
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContainEqual({
        type: 'MISSING_SERIAL_NUMBER',
        partNumber: 'P12346',
        message: 'Serial number is required for part P12346',
        severity: 'HIGH',
      });
    });

    it('should detect missing lot numbers', async () => {
      const configMissingLot = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [
            mockAsBuiltConfig.mainAssembly.children[0],
            {
              ...mockAsBuiltConfig.mainAssembly.children[1],
              lotNumber: null, // Missing required lot number
            },
          ],
        },
      };

      const result = await asBuiltConfigurationService.validateConfiguration(
        configMissingLot,
        validationRules
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContainEqual({
        type: 'MISSING_LOT_NUMBER',
        partNumber: 'P12347',
        message: 'Lot number is required for part P12347',
        severity: 'MEDIUM',
      });
    });

    it('should validate substitutions', async () => {
      const configWithSubstitution = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [
            {
              ...mockAsBuiltConfig.mainAssembly.children[0],
              partNumber: 'P12346-ALT', // Allowed substitution
            },
            mockAsBuiltConfig.mainAssembly.children[1],
          ],
        },
      };

      const result = await asBuiltConfigurationService.validateConfiguration(
        configWithSubstitution,
        validationRules
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContainEqual({
        type: 'SUBSTITUTION_USED',
        partNumber: 'P12346-ALT',
        message: 'Substitution P12346-ALT used for P12346',
        originalPart: 'P12346',
      });
    });

    it('should detect unauthorized substitutions', async () => {
      const configWithUnauthorizedSub = {
        ...mockAsBuiltConfig,
        mainAssembly: {
          ...mockAsBuiltConfig.mainAssembly,
          children: [
            {
              ...mockAsBuiltConfig.mainAssembly.children[0],
              partNumber: 'P12346-UNAUTHORIZED', // Not allowed substitution
            },
            mockAsBuiltConfig.mainAssembly.children[1],
          ],
        },
      };

      const result = await asBuiltConfigurationService.validateConfiguration(
        configWithUnauthorizedSub,
        validationRules
      );

      expect(result.isValid).toBe(false);
      expect(result.violations).toContainEqual({
        type: 'UNAUTHORIZED_SUBSTITUTION',
        partNumber: 'P12346-UNAUTHORIZED',
        message: 'Unauthorized substitution P12346-UNAUTHORIZED for P12346',
        severity: 'HIGH',
      });
    });
  });

  describe('saveConfiguration', () => {
    it('should save configuration to build record', async () => {
      const updatedBuildRecord = {
        ...mockBuildRecord,
        asBuiltConfiguration: mockAsBuiltConfig,
      };

      mockPrisma.buildRecord.update.mockResolvedValue(updatedBuildRecord);

      const result = await asBuiltConfigurationService.saveConfiguration('br-1', mockAsBuiltConfig);

      expect(mockPrisma.buildRecord.update).toHaveBeenCalledWith({
        where: { id: 'br-1' },
        data: {
          asBuiltConfiguration: mockAsBuiltConfig,
          configurationGeneratedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(updatedBuildRecord);
    });

    it('should create configuration items for traceability', async () => {
      mockPrisma.buildRecord.update.mockResolvedValue(mockBuildRecord);

      const configurationItems = [
        {
          buildRecordId: 'br-1',
          partNumber: 'P12346',
          serialNumber: 'SN001',
          lotNumber: 'LOT123',
          position: 'A1',
          operationId: 'bro-1',
        },
        {
          buildRecordId: 'br-1',
          partNumber: 'P12346',
          serialNumber: 'SN002',
          lotNumber: 'LOT123',
          position: 'A1',
          operationId: 'bro-1',
        },
        {
          buildRecordId: 'br-1',
          partNumber: 'P12347',
          serialNumber: 'SN003',
          lotNumber: 'LOT124',
          position: 'B1',
          operationId: 'bro-1',
        },
      ];

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          buildRecord: {
            update: mockPrisma.buildRecord.update,
          },
          configurationItem: {
            createMany: vi.fn().mockResolvedValue({ count: configurationItems.length }),
          },
        });
      });

      await asBuiltConfigurationService.saveConfiguration('br-1', mockAsBuiltConfig);

      const transactionCall = mockPrisma.$transaction.mock.calls[0][0];
      const mockTxClient = {
        buildRecord: { update: vi.fn() },
        configurationItem: { createMany: vi.fn() },
      };

      await transactionCall(mockTxClient);

      expect(mockTxClient.configurationItem.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            buildRecordId: 'br-1',
            partNumber: 'P12346',
            serialNumber: 'SN001',
          }),
        ]),
      });
    });
  });

  describe('getConfigurationHistory', () => {
    const mockConfigHistory = [
      {
        id: 'config-1',
        buildRecordId: 'br-1',
        configuration: mockAsBuiltConfig,
        generatedAt: new Date('2024-01-01T08:00:00Z'),
        generatedBy: 'user-1',
        version: 1,
      },
      {
        id: 'config-2',
        buildRecordId: 'br-1',
        configuration: mockAsBuiltConfig,
        generatedAt: new Date('2024-01-01T10:00:00Z'),
        generatedBy: 'user-2',
        version: 2,
      },
    ];

    it('should return configuration history', async () => {
      mockPrisma.configurationItem.findMany.mockResolvedValue(mockConfigHistory);

      const result = await asBuiltConfigurationService.getConfigurationHistory('br-1');

      expect(mockPrisma.configurationItem.findMany).toHaveBeenCalledWith({
        where: {
          buildRecordId: 'br-1',
        },
        include: {
          generatedBy: true,
        },
        orderBy: {
          generatedAt: 'desc',
        },
      });

      expect(result).toEqual(mockConfigHistory);
    });
  });

  describe('generateTraceabilityReport', () => {
    const mockTraceabilityData = [
      {
        id: 'trace-1',
        buildRecordId: 'br-1',
        partNumber: 'P12346',
        serialNumber: 'SN001',
        lotNumber: 'LOT123',
        supplier: 'Supplier A',
        manufactureDate: new Date('2023-12-01'),
        certificationData: {
          material: 'Grade A Steel',
          heatTreatment: 'Annealed',
          testResults: 'Pass',
        },
      },
    ];

    it('should generate traceability report', async () => {
      mockPrisma.configurationItem.findMany.mockResolvedValue(mockTraceabilityData);

      const result = await asBuiltConfigurationService.generateTraceabilityReport('br-1');

      expect(mockPrisma.configurationItem.findMany).toHaveBeenCalledWith({
        where: {
          buildRecordId: 'br-1',
        },
        include: {
          part: {
            include: {
              supplier: true,
            },
          },
          certifications: true,
          qualityRecords: true,
        },
      });

      expect(result).toEqual({
        buildRecordId: 'br-1',
        generatedAt: expect.any(Date),
        components: mockTraceabilityData,
        summary: {
          totalComponents: 1,
          trackedComponents: 1,
          traceabilityPercentage: 100,
        },
      });
    });

    it('should calculate traceability percentage correctly', async () => {
      const partialTraceabilityData = [
        mockTraceabilityData[0],
        {
          ...mockTraceabilityData[0],
          id: 'trace-2',
          serialNumber: null, // Not fully traceable
          certificationData: null,
        },
      ];

      mockPrisma.configurationItem.findMany.mockResolvedValue(partialTraceabilityData);

      const result = await asBuiltConfigurationService.generateTraceabilityReport('br-1');

      expect(result.summary).toEqual({
        totalComponents: 2,
        trackedComponents: 1,
        traceabilityPercentage: 50,
      });
    });
  });
});