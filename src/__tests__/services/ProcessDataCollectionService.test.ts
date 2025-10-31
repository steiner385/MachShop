import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ProcessDataCollectionService } from '../../services/ProcessDataCollectionService';
import {
  StartProcessDataCollectionInput,
  CompleteProcessDataCollectionInput,
  QueryProcessDataInput,
  ProcessDataCollectionRecord,
  ProcessDataSummary,
  ProcessParameterTrend
} from '../../types/l2equipment';

// Mock Prisma Client
const mockPrisma = {
  equipment: {
    findUnique: vi.fn(),
  },
  workOrder: {
    findUnique: vi.fn(),
  },
  processDataCollection: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    deleteMany: vi.fn(),
  },
  sPCConfiguration: {
    findUnique: vi.fn(),
  },
  sPCRuleViolation: {
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
} as unknown as PrismaClient;

// Mock the prisma instance in the service
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

// Mock SPC Service and Western Electric Rules
vi.mock('../../services/SPCService', () => ({
  spcService: {
    calculateIMRLimits: vi.fn().mockResolvedValue({
      UCL: 10.5,
      centerLine: 10.0,
      LCL: 9.5,
      sigma: 0.2,
    }),
  },
}));

vi.mock('../../services/WesternElectricRulesEngine', () => ({
  westernElectricRulesEngine: {
    evaluateRules: vi.fn().mockReturnValue([
      {
        ruleNumber: 1,
        ruleName: 'Point beyond control limit',
        severity: 'CRITICAL',
        description: 'Data point exceeds control limit',
        dataPointIndices: [9],
        values: [11.0],
      },
    ]),
  },
}));

describe('ProcessDataCollectionService', () => {
  // Test data
  const mockEquipment = {
    id: 'equipment-123',
    equipmentNumber: 'EQ-001',
    name: 'CNC Machine 01',
  };

  const mockWorkOrder = {
    id: 'workorder-123',
    workOrderNumber: 'WO-001',
  };

  const mockStartInput: StartProcessDataCollectionInput = {
    equipmentId: 'equipment-123',
    processName: 'MACHINING_OPERATION',
    processStepNumber: 1,
    workOrderId: 'workorder-123',
    operationId: 'operation-123',
    partNumber: 'PN-001',
    lotNumber: 'LOT-001',
    serialNumber: 'SN-123',
    parameters: {
      spindle_speed: 2500,
      feed_rate: 150,
      depth_of_cut: 0.5,
      coolant_flow: 5.0,
    },
    operatorId: 'operator-123',
    supervisorId: 'supervisor-123',
  };

  const mockCompleteInput: CompleteProcessDataCollectionInput = {
    processDataCollectionId: 'process-123',
    endTimestamp: new Date('2024-01-15T10:30:00Z'),
    quantityProduced: 100,
    quantityGood: 95,
    quantityScrap: 5,
    inSpecCount: 95,
    outOfSpecCount: 5,
    averageUtilization: 85.5,
    peakUtilization: 98.2,
    alarmCount: 2,
    criticalAlarmCount: 0,
    additionalParameters: {
      final_temperature: 65.2,
      vibration_level: 0.02,
    },
  };

  const mockProcessData: ProcessDataCollectionRecord = {
    id: 'process-123',
    equipmentId: 'equipment-123',
    processName: 'MACHINING_OPERATION',
    processStepNumber: 1,
    startTimestamp: new Date('2024-01-15T09:00:00Z'),
    endTimestamp: null,
    duration: null,
    workOrderId: 'workorder-123',
    operationId: 'operation-123',
    partNumber: 'PN-001',
    lotNumber: 'LOT-001',
    serialNumber: 'SN-123',
    parameters: mockStartInput.parameters,
    operatorId: 'operator-123',
    supervisorId: 'supervisor-123',
    quantityProduced: null,
    quantityGood: null,
    quantityScrap: null,
    inSpecCount: null,
    outOfSpecCount: null,
    averageUtilization: null,
    peakUtilization: null,
    alarmCount: 0,
    criticalAlarmCount: 0,
    createdAt: new Date('2024-01-15T09:00:00Z'),
    updatedAt: new Date('2024-01-15T09:00:00Z'),
  };

  const mockCompletedProcessData: ProcessDataCollectionRecord = {
    ...mockProcessData,
    endTimestamp: new Date('2024-01-15T10:30:00Z'),
    duration: 5400, // 90 minutes in seconds
    quantityProduced: 100,
    quantityGood: 95,
    quantityScrap: 5,
    inSpecCount: 95,
    outOfSpecCount: 5,
    averageUtilization: 85.5,
    peakUtilization: 98.2,
    alarmCount: 2,
    criticalAlarmCount: 0,
  };

  const mockSPCConfig = {
    id: 'spc-config-123',
    parameterId: 'spindle_speed',
    chartType: 'I_MR',
    isActive: true,
    enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
    ruleSensitivity: 'NORMAL',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should have static methods available', () => {
      expect(typeof ProcessDataCollectionService.startProcessDataCollection).toBe('function');
      expect(typeof ProcessDataCollectionService.completeProcessDataCollection).toBe('function');
      expect(typeof ProcessDataCollectionService.queryProcessData).toBe('function');
    });
  });

  describe('startProcessDataCollection', () => {
    it('should start process data collection with valid input', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.processDataCollection.create.mockResolvedValue(mockProcessData);

      const result = await ProcessDataCollectionService.startProcessDataCollection(mockStartInput);

      expect(result).toEqual(mockProcessData);
      expect(mockPrisma.equipment.findUnique).toHaveBeenCalledWith({
        where: { id: 'equipment-123' },
      });
      expect(mockPrisma.workOrder.findUnique).toHaveBeenCalledWith({
        where: { id: 'workorder-123' },
      });
      expect(mockPrisma.processDataCollection.create).toHaveBeenCalledWith({
        data: {
          equipmentId: 'equipment-123',
          processName: 'MACHINING_OPERATION',
          processStepNumber: 1,
          startTimestamp: expect.any(Date),
          workOrderId: 'workorder-123',
          operationId: 'operation-123',
          partNumber: 'PN-001',
          lotNumber: 'LOT-001',
          serialNumber: 'SN-123',
          parameters: mockStartInput.parameters,
          operatorId: 'operator-123',
          supervisorId: 'supervisor-123',
        },
      });
    });

    it('should throw error when equipment not found', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      await expect(
        ProcessDataCollectionService.startProcessDataCollection(mockStartInput)
      ).rejects.toThrow('Equipment with ID equipment-123 not found');
    });

    it('should throw error when work order not found', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.workOrder.findUnique.mockResolvedValue(null);

      await expect(
        ProcessDataCollectionService.startProcessDataCollection(mockStartInput)
      ).rejects.toThrow('Work order with ID workorder-123 not found');
    });

    it('should work without work order when not provided', async () => {
      const inputWithoutWorkOrder = { ...mockStartInput, workOrderId: undefined };
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.create.mockResolvedValue(mockProcessData);

      const result = await ProcessDataCollectionService.startProcessDataCollection(inputWithoutWorkOrder);

      expect(result).toBeDefined();
      expect(mockPrisma.workOrder.findUnique).not.toHaveBeenCalled();
    });

    it('should handle minimal input data', async () => {
      const minimalInput: StartProcessDataCollectionInput = {
        equipmentId: 'equipment-123',
        processName: 'MINIMAL_PROCESS',
        processStepNumber: 1,
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        processName: 'MINIMAL_PROCESS',
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(minimalInput);

      expect(result).toBeDefined();
      expect(result.processName).toBe('MINIMAL_PROCESS');
    });
  });

  describe('completeProcessDataCollection', () => {
    it('should complete process data collection with valid input', async () => {
      mockPrisma.processDataCollection.findUnique.mockResolvedValue(mockProcessData);
      mockPrisma.processDataCollection.update.mockResolvedValue(mockCompletedProcessData);

      const result = await ProcessDataCollectionService.completeProcessDataCollection(mockCompleteInput);

      expect(result).toEqual(mockCompletedProcessData);
      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: expect.objectContaining({
          endTimestamp: mockCompleteInput.endTimestamp,
          duration: 5400, // 90 minutes
          quantityProduced: 100,
          quantityGood: 95,
          quantityScrap: 5,
          parameters: {
            ...mockStartInput.parameters,
            ...mockCompleteInput.additionalParameters,
          },
        }),
      });
    });

    it('should throw error when process data collection not found', async () => {
      mockPrisma.processDataCollection.findUnique.mockResolvedValue(null);

      await expect(
        ProcessDataCollectionService.completeProcessDataCollection(mockCompleteInput)
      ).rejects.toThrow('Process data collection with ID process-123 not found');
    });

    it('should handle completion without additional parameters', async () => {
      const inputWithoutAdditional = { ...mockCompleteInput, additionalParameters: undefined };
      mockPrisma.processDataCollection.findUnique.mockResolvedValue(mockProcessData);
      mockPrisma.processDataCollection.update.mockResolvedValue(mockCompletedProcessData);

      await ProcessDataCollectionService.completeProcessDataCollection(inputWithoutAdditional);

      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: expect.objectContaining({
          parameters: mockStartInput.parameters,
        }),
      });
    });

    it('should calculate duration correctly', async () => {
      const startTime = new Date('2024-01-15T09:00:00Z');
      const endTime = new Date('2024-01-15T11:00:00Z');
      const processWithStart = { ...mockProcessData, startTimestamp: startTime };
      const inputWithEndTime = { ...mockCompleteInput, endTimestamp: endTime };

      mockPrisma.processDataCollection.findUnique.mockResolvedValue(processWithStart);
      mockPrisma.processDataCollection.update.mockResolvedValue(mockCompletedProcessData);

      await ProcessDataCollectionService.completeProcessDataCollection(inputWithEndTime);

      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: expect.objectContaining({
          duration: 7200, // 2 hours in seconds
        }),
      });
    });

    it('should preserve existing alarm counts when not provided', async () => {
      const processWithAlarms = { ...mockProcessData, alarmCount: 5, criticalAlarmCount: 2 };
      const inputWithoutAlarms = {
        ...mockCompleteInput,
        alarmCount: undefined,
        criticalAlarmCount: undefined,
      };

      mockPrisma.processDataCollection.findUnique.mockResolvedValue(processWithAlarms);
      mockPrisma.processDataCollection.update.mockResolvedValue(mockCompletedProcessData);

      await ProcessDataCollectionService.completeProcessDataCollection(inputWithoutAlarms);

      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: expect.objectContaining({
          alarmCount: 5,
          criticalAlarmCount: 2,
        }),
      });
    });
  });

  describe('updateProcessParameters', () => {
    it('should update process parameters', async () => {
      const newParameters = { cutting_speed: 300, tool_wear: 0.05 };
      const mergedParameters = { ...mockStartInput.parameters, ...newParameters };

      mockPrisma.processDataCollection.findUnique.mockResolvedValue(mockProcessData);
      mockPrisma.processDataCollection.update.mockResolvedValue({
        ...mockProcessData,
        parameters: mergedParameters,
      });

      const result = await ProcessDataCollectionService.updateProcessParameters(
        'process-123',
        newParameters
      );

      expect(result.parameters).toEqual(mergedParameters);
      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: { parameters: mergedParameters },
      });
    });

    it('should throw error when process data collection not found', async () => {
      mockPrisma.processDataCollection.findUnique.mockResolvedValue(null);

      await expect(
        ProcessDataCollectionService.updateProcessParameters('nonexistent', {})
      ).rejects.toThrow('Process data collection with ID nonexistent not found');
    });
  });

  describe('incrementAlarmCount', () => {
    it('should increment normal alarm count', async () => {
      mockPrisma.processDataCollection.update.mockResolvedValue({
        ...mockProcessData,
        alarmCount: 1,
      });

      const result = await ProcessDataCollectionService.incrementAlarmCount('process-123', false);

      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: {
          alarmCount: { increment: 1 },
        },
      });
    });

    it('should increment critical alarm count', async () => {
      mockPrisma.processDataCollection.update.mockResolvedValue({
        ...mockProcessData,
        alarmCount: 1,
        criticalAlarmCount: 1,
      });

      const result = await ProcessDataCollectionService.incrementAlarmCount('process-123', true);

      expect(mockPrisma.processDataCollection.update).toHaveBeenCalledWith({
        where: { id: 'process-123' },
        data: {
          alarmCount: { increment: 1 },
          criticalAlarmCount: { increment: 1 },
        },
      });
    });
  });

  describe('queryProcessData', () => {
    it('should query process data with filters', async () => {
      const query: QueryProcessDataInput = {
        equipmentId: 'equipment-123',
        processName: 'MACHINING_OPERATION',
        workOrderId: 'workorder-123',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 50,
      };

      const queryResults = [mockProcessData, mockCompletedProcessData];
      mockPrisma.processDataCollection.findMany.mockResolvedValue(queryResults);

      const result = await ProcessDataCollectionService.queryProcessData(query);

      expect(result).toEqual(queryResults);
      expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
        where: {
          equipmentId: 'equipment-123',
          processName: 'MACHINING_OPERATION',
          workOrderId: 'workorder-123',
          startTimestamp: {
            gte: query.startDate,
            lte: query.endDate,
          },
        },
        orderBy: { startTimestamp: 'desc' },
        take: 50,
      });
    });

    it('should query with minimal filters', async () => {
      const minimalQuery: QueryProcessDataInput = {};
      mockPrisma.processDataCollection.findMany.mockResolvedValue([]);

      await ProcessDataCollectionService.queryProcessData(minimalQuery);

      expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { startTimestamp: 'desc' },
        take: 100, // Default limit
      });
    });

    it('should handle traceability queries', async () => {
      const traceabilityQuery: QueryProcessDataInput = {
        partNumber: 'PN-001',
        lotNumber: 'LOT-001',
        serialNumber: 'SN-123',
      };

      mockPrisma.processDataCollection.findMany.mockResolvedValue([mockProcessData]);

      await ProcessDataCollectionService.queryProcessData(traceabilityQuery);

      expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
        where: {
          partNumber: 'PN-001',
          lotNumber: 'LOT-001',
          serialNumber: 'SN-123',
        },
        orderBy: { startTimestamp: 'desc' },
        take: 100,
      });
    });
  });

  describe('getActiveProcesses', () => {
    it('should get active processes for equipment', async () => {
      const activeProcesses = [mockProcessData];
      mockPrisma.processDataCollection.findMany.mockResolvedValue(activeProcesses);

      const result = await ProcessDataCollectionService.getActiveProcesses('equipment-123');

      expect(result).toEqual(activeProcesses);
      expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
        where: {
          equipmentId: 'equipment-123',
          endTimestamp: null,
        },
        orderBy: { startTimestamp: 'desc' },
      });
    });
  });

  describe('generateProcessSummary', () => {
    it('should generate process summary with data', async () => {
      const processes = [
        {
          ...mockCompletedProcessData,
          quantityProduced: 100,
          quantityGood: 95,
          quantityScrap: 5,
          duration: 3600, // 1 hour
          averageUtilization: 85,
          alarmCount: 2,
          criticalAlarmCount: 0,
        },
        {
          ...mockCompletedProcessData,
          id: 'process-456',
          quantityProduced: 80,
          quantityGood: 78,
          quantityScrap: 2,
          duration: 2700, // 45 minutes
          averageUtilization: 90,
          alarmCount: 1,
          criticalAlarmCount: 1,
        },
      ];

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.findMany.mockResolvedValue(processes);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await ProcessDataCollectionService.generateProcessSummary(
        'equipment-123',
        'MACHINING_OPERATION',
        startDate,
        endDate
      );

      const expectedSummary: ProcessDataSummary = {
        equipmentId: 'equipment-123',
        equipmentNumber: 'EQ-001',
        equipmentName: 'CNC Machine 01',
        processName: 'MACHINING_OPERATION',
        totalRuns: 2,
        totalQuantityProduced: 180,
        totalQuantityGood: 173,
        totalQuantityScrap: 7,
        yieldPercentage: (173 / 180) * 100,
        averageCycleTime: (3600 + 2700) / 2,
        averageUtilization: (85 + 90) / 2,
        totalAlarms: 3,
        totalCriticalAlarms: 1,
        period: { start: startDate, end: endDate },
      };

      expect(result).toEqual(expectedSummary);
    });

    it('should generate empty summary when no data exists', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.findMany.mockResolvedValue([]);

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await ProcessDataCollectionService.generateProcessSummary(
        'equipment-123',
        'MACHINING_OPERATION',
        startDate,
        endDate
      );

      expect(result.totalRuns).toBe(0);
      expect(result.totalQuantityProduced).toBe(0);
      expect(result.yieldPercentage).toBe(0);
    });

    it('should throw error when equipment not found', async () => {
      mockPrisma.equipment.findUnique.mockResolvedValue(null);

      await expect(
        ProcessDataCollectionService.generateProcessSummary('nonexistent', 'PROCESS')
      ).rejects.toThrow('Equipment with ID nonexistent not found');
    });
  });

  describe('getProcessParameterTrend', () => {
    it('should get process parameter trend with statistics', async () => {
      const processes = [
        {
          ...mockProcessData,
          startTimestamp: new Date('2024-01-01T09:00:00Z'),
          parameters: { spindle_speed: 2400, feed_rate: 150 },
        },
        {
          ...mockProcessData,
          id: 'process-456',
          startTimestamp: new Date('2024-01-01T10:00:00Z'),
          parameters: { spindle_speed: 2500, feed_rate: 155 },
        },
        {
          ...mockProcessData,
          id: 'process-789',
          startTimestamp: new Date('2024-01-01T11:00:00Z'),
          parameters: { spindle_speed: 2600, feed_rate: 160 },
        },
      ];

      mockPrisma.processDataCollection.findMany.mockResolvedValue(processes);

      const result = await ProcessDataCollectionService.getProcessParameterTrend(
        'equipment-123',
        'MACHINING_OPERATION',
        'spindle_speed'
      );

      const expectedTrend: ProcessParameterTrend = {
        parameterName: 'spindle_speed',
        dataPoints: [
          {
            timestamp: new Date('2024-01-01T09:00:00Z'),
            value: 2400,
            processDataCollectionId: 'process-123',
          },
          {
            timestamp: new Date('2024-01-01T10:00:00Z'),
            value: 2500,
            processDataCollectionId: 'process-456',
          },
          {
            timestamp: new Date('2024-01-01T11:00:00Z'),
            value: 2600,
            processDataCollectionId: 'process-789',
          },
        ],
        statistics: {
          min: 2400,
          max: 2600,
          average: 2500,
          stdDev: expect.any(Number),
        },
      };

      expect(result).toEqual(expectedTrend);
      expect(result.statistics?.stdDev).toBeCloseTo(81.65, 1);
    });

    it('should handle non-numeric parameter values', async () => {
      const processes = [
        {
          ...mockProcessData,
          parameters: { status: 'RUNNING', spindle_speed: 2500 },
        },
      ];

      mockPrisma.processDataCollection.findMany.mockResolvedValue(processes);

      const result = await ProcessDataCollectionService.getProcessParameterTrend(
        'equipment-123',
        'MACHINING_OPERATION',
        'status'
      );

      expect(result.dataPoints).toHaveLength(1);
      expect(result.dataPoints[0].value).toBe('RUNNING');
      expect(result.statistics).toEqual({});
    });

    it('should handle missing parameter values', async () => {
      const processes = [
        {
          ...mockProcessData,
          parameters: { spindle_speed: 2500 },
        },
      ];

      mockPrisma.processDataCollection.findMany.mockResolvedValue(processes);

      const result = await ProcessDataCollectionService.getProcessParameterTrend(
        'equipment-123',
        'MACHINING_OPERATION',
        'nonexistent_param'
      );

      expect(result.dataPoints).toHaveLength(0);
      expect(result.statistics).toEqual({});
    });
  });

  describe('Traceability Methods', () => {
    describe('getProcessDataForWorkOrder', () => {
      it('should get process data for work order', async () => {
        const workOrderProcesses = [mockProcessData, mockCompletedProcessData];
        mockPrisma.processDataCollection.findMany.mockResolvedValue(workOrderProcesses);

        const result = await ProcessDataCollectionService.getProcessDataForWorkOrder('workorder-123');

        expect(result).toEqual(workOrderProcesses);
        expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
          where: { workOrderId: 'workorder-123' },
          orderBy: { startTimestamp: 'asc' },
        });
      });
    });

    describe('getProcessDataBySerialNumber', () => {
      it('should get process data by serial number', async () => {
        const serialProcesses = [mockProcessData];
        mockPrisma.processDataCollection.findMany.mockResolvedValue(serialProcesses);

        const result = await ProcessDataCollectionService.getProcessDataBySerialNumber('SN-123');

        expect(result).toEqual(serialProcesses);
        expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
          where: { serialNumber: 'SN-123' },
          orderBy: { startTimestamp: 'asc' },
        });
      });
    });

    describe('getProcessDataByLotNumber', () => {
      it('should get process data by lot number', async () => {
        const lotProcesses = [mockProcessData, mockCompletedProcessData];
        mockPrisma.processDataCollection.findMany.mockResolvedValue(lotProcesses);

        const result = await ProcessDataCollectionService.getProcessDataByLotNumber('LOT-001');

        expect(result).toEqual(lotProcesses);
        expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
          where: { lotNumber: 'LOT-001' },
          orderBy: { startTimestamp: 'asc' },
        });
      });
    });
  });

  describe('Data Management', () => {
    describe('deleteOldProcessData', () => {
      it('should delete old process data', async () => {
        const beforeDate = new Date('2023-01-01');
        mockPrisma.processDataCollection.deleteMany.mockResolvedValue({ count: 150 });

        const result = await ProcessDataCollectionService.deleteOldProcessData(beforeDate);

        expect(result).toEqual({ deletedCount: 150 });
        expect(mockPrisma.processDataCollection.deleteMany).toHaveBeenCalledWith({
          where: {
            startTimestamp: {
              lt: beforeDate,
            },
          },
        });
      });
    });

    describe('getProcessDataById', () => {
      it('should get process data by ID', async () => {
        mockPrisma.processDataCollection.findUnique.mockResolvedValue(mockProcessData);

        const result = await ProcessDataCollectionService.getProcessDataById('process-123');

        expect(result).toEqual(mockProcessData);
        expect(mockPrisma.processDataCollection.findUnique).toHaveBeenCalledWith({
          where: { id: 'process-123' },
        });
      });

      it('should return null when not found', async () => {
        mockPrisma.processDataCollection.findUnique.mockResolvedValue(null);

        const result = await ProcessDataCollectionService.getProcessDataById('nonexistent');

        expect(result).toBeNull();
      });
    });
  });

  describe('SPC Integration', () => {
    describe('evaluateSPCForParameter', () => {
      it('should evaluate SPC for parameter with active configuration', async () => {
        const historicalData = [
          { ...mockProcessData, parameters: { spindle_speed: 2400 } },
          { ...mockProcessData, parameters: { spindle_speed: 2500 } },
          { ...mockProcessData, parameters: { spindle_speed: 2600 } },
          { ...mockProcessData, parameters: { spindle_speed: 2450 } },
          { ...mockProcessData, parameters: { spindle_speed: 2550 } },
        ];

        const mockViolation = {
          id: 'violation-123',
          configurationId: 'spc-config-123',
          ruleNumber: 1,
          ruleName: 'Point beyond control limit',
          severity: 'CRITICAL',
          value: 11.0,
          timestamp: new Date(),
        };

        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(mockSPCConfig);
        mockPrisma.processDataCollection.findMany.mockResolvedValue(historicalData);
        mockPrisma.sPCRuleViolation.create.mockResolvedValue(mockViolation);

        const result = await ProcessDataCollectionService.evaluateSPCForParameter(
          'spindle_speed',
          11.0,
          new Date()
        );

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual(mockViolation);
        expect(mockPrisma.sPCRuleViolation.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            configurationId: 'spc-config-123',
            ruleNumber: 1,
            severity: 'CRITICAL',
            value: 11.0,
          }),
        });
      });

      it('should return empty array when no SPC configuration exists', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);

        const result = await ProcessDataCollectionService.evaluateSPCForParameter(
          'nonexistent_param',
          2500,
          new Date()
        );

        expect(result).toEqual([]);
      });

      it('should return empty array when SPC configuration is inactive', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue({
          ...mockSPCConfig,
          isActive: false,
        });

        const result = await ProcessDataCollectionService.evaluateSPCForParameter(
          'spindle_speed',
          2500,
          new Date()
        );

        expect(result).toEqual([]);
      });

      it('should handle insufficient historical data', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(mockSPCConfig);
        mockPrisma.processDataCollection.findMany.mockResolvedValue([
          { ...mockProcessData, parameters: { spindle_speed: 2500 } },
        ]);

        const result = await ProcessDataCollectionService.evaluateSPCForParameter(
          'spindle_speed',
          2500,
          new Date()
        );

        expect(result).toEqual([]);
      });

      it('should handle SPC evaluation errors gracefully', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockRejectedValue(new Error('Database error'));

        const result = await ProcessDataCollectionService.evaluateSPCForParameter(
          'spindle_speed',
          2500,
          new Date()
        );

        expect(result).toEqual([]);
      });
    });

    describe('evaluateSPCForProcessData', () => {
      it('should evaluate SPC for all parameters in process data', async () => {
        const processWithParams = {
          ...mockProcessData,
          parameters: {
            spindle_speed: 2500,
            feed_rate: 150,
            temperature: 65.5,
          },
        };

        const mockViolations = [
          {
            id: 'violation-123',
            severity: 'CRITICAL',
            ruleNumber: 1,
            value: 2500,
          },
          {
            id: 'violation-456',
            severity: 'WARNING',
            ruleNumber: 3,
            value: 150,
          },
        ];

        mockPrisma.processDataCollection.findUnique.mockResolvedValue(processWithParams);

        // Mock evaluateSPCForParameter to return violations for some parameters
        const originalEvaluate = ProcessDataCollectionService.evaluateSPCForParameter;
        vi.spyOn(ProcessDataCollectionService, 'evaluateSPCForParameter')
          .mockResolvedValueOnce([mockViolations[0]]) // spindle_speed
          .mockResolvedValueOnce([mockViolations[1]]) // feed_rate
          .mockResolvedValueOnce([]); // temperature

        const result = await ProcessDataCollectionService.evaluateSPCForProcessData('process-123');

        expect(result).toEqual({
          evaluatedParameters: 2,
          totalViolations: 2,
          criticalViolations: 1,
          violations: mockViolations,
        });

        ProcessDataCollectionService.evaluateSPCForParameter = originalEvaluate;
      });

      it('should handle process data without parameters', async () => {
        const processWithoutParams = {
          ...mockProcessData,
          parameters: null,
        };

        mockPrisma.processDataCollection.findUnique.mockResolvedValue(processWithoutParams);

        const result = await ProcessDataCollectionService.evaluateSPCForProcessData('process-123');

        expect(result).toEqual({
          evaluatedParameters: 0,
          totalViolations: 0,
          criticalViolations: 0,
          violations: [],
        });
      });

      it('should throw error when process data not found', async () => {
        mockPrisma.processDataCollection.findUnique.mockResolvedValue(null);

        await expect(
          ProcessDataCollectionService.evaluateSPCForProcessData('nonexistent')
        ).rejects.toThrow('Process data collection with ID nonexistent not found');
      });
    });

    describe('getSPCViolationsForParameter', () => {
      it('should get SPC violations for parameter', async () => {
        const mockViolations = [
          {
            id: 'violation-123',
            configurationId: 'spc-config-123',
            ruleNumber: 1,
            severity: 'CRITICAL',
            acknowledged: false,
          },
        ];

        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(mockSPCConfig);
        mockPrisma.sPCRuleViolation.findMany.mockResolvedValue(mockViolations);

        const result = await ProcessDataCollectionService.getSPCViolationsForParameter(
          'spindle_speed',
          false,
          10
        );

        expect(result).toEqual(mockViolations);
        expect(mockPrisma.sPCRuleViolation.findMany).toHaveBeenCalledWith({
          where: {
            configurationId: 'spc-config-123',
            acknowledged: false,
          },
          orderBy: { timestamp: 'desc' },
          take: 10,
        });
      });

      it('should return empty array when no SPC configuration exists', async () => {
        mockPrisma.sPCConfiguration.findUnique.mockResolvedValue(null);

        const result = await ProcessDataCollectionService.getSPCViolationsForParameter('nonexistent');

        expect(result).toEqual([]);
      });
    });

    describe('acknowledgeSPCViolation', () => {
      it('should acknowledge SPC violation', async () => {
        const acknowledgedViolation = {
          id: 'violation-123',
          acknowledged: true,
          acknowledgedBy: 'user-123',
          acknowledgedAt: new Date(),
          resolution: 'Equipment recalibrated',
        };

        mockPrisma.sPCRuleViolation.update.mockResolvedValue(acknowledgedViolation);

        const result = await ProcessDataCollectionService.acknowledgeSPCViolation(
          'violation-123',
          'user-123',
          'Equipment recalibrated'
        );

        expect(result).toEqual(acknowledgedViolation);
        expect(mockPrisma.sPCRuleViolation.update).toHaveBeenCalledWith({
          where: { id: 'violation-123' },
          data: {
            acknowledged: true,
            acknowledgedBy: 'user-123',
            acknowledgedAt: expect.any(Date),
            resolution: 'Equipment recalibrated',
          },
        });
      });
    });
  });

  describe('Manufacturing Scenarios', () => {
    it('should handle automotive production line data collection', async () => {
      const automotiveInput: StartProcessDataCollectionInput = {
        equipmentId: 'equipment-auto-001',
        processName: 'WELDING_OPERATION',
        processStepNumber: 3,
        workOrderId: 'auto-wo-001',
        partNumber: 'AUTO-BODY-PANEL',
        lotNumber: 'AUTO-LOT-2024-001',
        parameters: {
          weld_current: 150,
          weld_voltage: 22.5,
          weld_speed: 50,
          shield_gas_flow: 15,
          penetration_depth: 3.2,
        },
        operatorId: 'welder-001',
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        ...automotiveInput,
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(automotiveInput);

      expect(result.processName).toBe('WELDING_OPERATION');
      expect(result.parameters).toEqual(automotiveInput.parameters);
    });

    it('should handle aerospace manufacturing precision requirements', async () => {
      const aerospaceInput: StartProcessDataCollectionInput = {
        equipmentId: 'equipment-aero-001',
        processName: 'PRECISION_MACHINING',
        processStepNumber: 1,
        partNumber: 'AERO-TURBINE-BLADE',
        serialNumber: 'AERO-TB-001234',
        parameters: {
          spindle_speed: 8000,
          feed_rate: 0.05, // Very precise feed rate
          depth_of_cut: 0.001, // Minimal cuts for precision
          surface_roughness: 0.2,
          dimensional_tolerance: 0.0001,
          coolant_pressure: 50,
        },
        operatorId: 'machinist-certified-001',
        supervisorId: 'supervisor-aero-001',
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        ...aerospaceInput,
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(aerospaceInput);

      expect(result.parameters.dimensional_tolerance).toBe(0.0001);
      expect(result.supervisorId).toBe('supervisor-aero-001');
    });

    it('should handle pharmaceutical batch processing', async () => {
      const pharmaInput: StartProcessDataCollectionInput = {
        equipmentId: 'equipment-pharma-001',
        processName: 'TABLET_COMPRESSION',
        processStepNumber: 5,
        workOrderId: 'pharma-batch-001',
        lotNumber: 'PHARMA-LOT-2024-001',
        parameters: {
          compression_force: 25000, // Newtons
          tablet_weight: 250, // mg
          tablet_hardness: 8.5, // kg/cm²
          disintegration_time: 12, // minutes
          moisture_content: 1.5, // percentage
          room_temperature: 21.2,
          relative_humidity: 45,
        },
        operatorId: 'pharma-operator-001',
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        ...pharmaInput,
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(pharmaInput);

      expect(result.parameters.moisture_content).toBe(1.5);
      expect(result.parameters.relative_humidity).toBe(45);
    });

    it('should handle semiconductor fabrication process data', async () => {
      const semiInput: StartProcessDataCollectionInput = {
        equipmentId: 'equipment-semi-001',
        processName: 'PLASMA_ETCHING',
        processStepNumber: 12,
        partNumber: 'WAFER-300MM',
        lotNumber: 'SEMI-LOT-2024-001',
        serialNumber: 'WAFER-001234567',
        parameters: {
          rf_power: 1500, // Watts
          chamber_pressure: 0.05, // Torr
          gas_flow_ar: 100, // sccm
          gas_flow_cf4: 25, // sccm
          etch_rate: 350, // nm/min
          uniformity: 2.1, // percentage
          chamber_temperature: 65, // Celsius
        },
        operatorId: 'semi-tech-001',
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        ...semiInput,
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(semiInput);

      expect(result.parameters.etch_rate).toBe(350);
      expect(result.parameters.uniformity).toBe(2.1);
    });

    it('should handle food processing HACCP compliance', async () => {
      const foodInput: StartProcessDataCollectionInput = {
        equipmentId: 'equipment-food-001',
        processName: 'PASTEURIZATION',
        processStepNumber: 2,
        workOrderId: 'food-batch-001',
        lotNumber: 'DAIRY-LOT-2024-001',
        parameters: {
          temperature: 72.5, // Celsius - Critical Control Point
          hold_time: 15, // seconds
          flow_rate: 1000, // L/hr
          ph_level: 6.8,
          turbidity: 2.1, // NTU
          bacterial_count: 45, // CFU/ml
        },
        operatorId: 'food-operator-001',
        supervisorId: 'qa-supervisor-001',
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.workOrder.findUnique.mockResolvedValue(mockWorkOrder);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        ...foodInput,
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(foodInput);

      expect(result.parameters.temperature).toBe(72.5); // Critical for food safety
      expect(result.supervisorId).toBe('qa-supervisor-001');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.equipment.findUnique.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        ProcessDataCollectionService.startProcessDataCollection(mockStartInput)
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle corrupted parameter data', async () => {
      const corruptedProcess = {
        ...mockProcessData,
        parameters: 'corrupted_json_string',
      };

      mockPrisma.processDataCollection.findUnique.mockResolvedValue(corruptedProcess);

      const result = await ProcessDataCollectionService.getProcessParameterTrend(
        'equipment-123',
        'MACHINING_OPERATION',
        'spindle_speed'
      );

      expect(result.dataPoints).toHaveLength(0);
      expect(result.statistics).toEqual({});
    });

    it('should handle very large parameter datasets', async () => {
      const largeParameterSet = {};
      for (let i = 0; i < 1000; i++) {
        largeParameterSet[`param_${i}`] = Math.random() * 100;
      }

      const inputWithLargeParams = {
        ...mockStartInput,
        parameters: largeParameterSet,
      };

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.create.mockResolvedValue({
        ...mockProcessData,
        parameters: largeParameterSet,
      });

      const result = await ProcessDataCollectionService.startProcessDataCollection(inputWithLargeParams);

      expect(Object.keys(result.parameters as any)).toHaveLength(1000);
    });

    it('should handle concurrent process data operations', async () => {
      const concurrentInputs = Array.from({ length: 10 }, (_, i) => ({
        ...mockStartInput,
        serialNumber: `SN-${i}`,
      }));

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.create.mockResolvedValue(mockProcessData);

      const promises = concurrentInputs.map(input =>
        ProcessDataCollectionService.startProcessDataCollection(input)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(mockPrisma.processDataCollection.create).toHaveBeenCalledTimes(10);
    });

    it('should handle process completion with missing start data', async () => {
      const processWithoutStart = {
        ...mockProcessData,
        startTimestamp: null,
      };

      mockPrisma.processDataCollection.findUnique.mockResolvedValue(processWithoutStart);

      await expect(
        ProcessDataCollectionService.completeProcessDataCollection(mockCompleteInput)
      ).rejects.toThrow();
    });

    it('should handle statistical calculations with edge values', async () => {
      const edgeValueProcesses = [
        { ...mockProcessData, parameters: { temp: Number.MAX_SAFE_INTEGER } },
        { ...mockProcessData, parameters: { temp: Number.MIN_SAFE_INTEGER } },
        { ...mockProcessData, parameters: { temp: 0 } },
        { ...mockProcessData, parameters: { temp: -0 } },
        { ...mockProcessData, parameters: { temp: Infinity } },
        { ...mockProcessData, parameters: { temp: -Infinity } },
      ];

      mockPrisma.processDataCollection.findMany.mockResolvedValue(edgeValueProcesses);

      // Should not crash with extreme values
      const result = await ProcessDataCollectionService.getProcessParameterTrend(
        'equipment-123',
        'MACHINING_OPERATION',
        'temp'
      );

      expect(result.dataPoints).toHaveLength(6);
      // Statistics should handle edge cases gracefully
      expect(result.statistics).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large historical datasets efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        ...mockProcessData,
        id: `process-${i}`,
        startTimestamp: new Date(Date.now() - i * 3600000), // Hourly intervals
        parameters: { spindle_speed: 2500 + Math.sin(i / 100) * 100 },
      }));

      mockPrisma.processDataCollection.findMany.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      const result = await ProcessDataCollectionService.getProcessParameterTrend(
        'equipment-123',
        'MACHINING_OPERATION',
        'spindle_speed'
      );
      const endTime = Date.now();

      expect(result.dataPoints).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should optimize queries with proper pagination', async () => {
      mockPrisma.processDataCollection.findMany.mockResolvedValue([]);

      const query: QueryProcessDataInput = { limit: 25 };
      await ProcessDataCollectionService.queryProcessData(query);

      expect(mockPrisma.processDataCollection.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { startTimestamp: 'desc' },
        take: 25,
      });
    });

    it('should handle memory-intensive summary calculations', async () => {
      const memoryIntensiveData = Array.from({ length: 5000 }, (_, i) => ({
        ...mockCompletedProcessData,
        id: `process-${i}`,
        quantityProduced: 100 + Math.random() * 50,
        quantityGood: 95 + Math.random() * 4,
        duration: 3600 + Math.random() * 1800,
        averageUtilization: 80 + Math.random() * 15,
        alarmCount: Math.floor(Math.random() * 5),
        criticalAlarmCount: Math.floor(Math.random() * 2),
      }));

      mockPrisma.equipment.findUnique.mockResolvedValue(mockEquipment);
      mockPrisma.processDataCollection.findMany.mockResolvedValue(memoryIntensiveData);

      const result = await ProcessDataCollectionService.generateProcessSummary(
        'equipment-123',
        'MACHINING_OPERATION'
      );

      expect(result.totalRuns).toBe(5000);
      expect(result.totalQuantityProduced).toBeGreaterThan(500000);
      expect(result.yieldPercentage).toBeGreaterThan(90);
    });
  });
});