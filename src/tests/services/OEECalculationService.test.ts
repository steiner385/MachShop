import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PerformancePeriodType, EquipmentState } from '@prisma/client';
import OEECalculationService from '../../services/OEECalculationService';

// Mock the database module
vi.mock('../../lib/database', () => ({
  default: {
    equipmentStateHistory: {
      findMany: vi.fn(),
    },
    equipmentPerformanceLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    equipment: {
      update: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import prisma from '../../lib/database';

describe('OEECalculationService', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = prisma as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateOEE', () => {
    it('should calculate perfect OEE (100%)', () => {
      // Perfect conditions: 100% availability, 100% performance, 100% quality
      const result = OEECalculationService.calculateOEE(
        28800, // 8 hours planned production time (seconds)
        28800, // 8 hours operating time
        0,     // 0 downtime
        30,    // 30 seconds ideal cycle time
        30,    // 30 seconds actual cycle time
        960,   // 960 units produced (28800/30)
        960,   // 960 target production
        960,   // 960 good units
        960    // 960 total units
      );

      expect(result.availability).toBe(100);
      expect(result.performance).toBe(100);
      expect(result.quality).toBe(100);
      expect(result.oee).toBe(100);
    });

    it('should calculate OEE with typical production values', () => {
      // Realistic scenario: 90% availability, 95% performance, 98% quality
      const plannedTime = 28800; // 8 hours
      const operatingTime = 25920; // 7.2 hours (90% availability)
      const downtime = 2880; // 48 minutes
      const idealCycleTime = 30; // 30 seconds
      const totalUnits = 800;
      const goodUnits = 784; // 98% quality

      const result = OEECalculationService.calculateOEE(
        plannedTime,
        operatingTime,
        downtime,
        idealCycleTime,
        undefined, // Let it calculate actual cycle time
        totalUnits,
        undefined,
        goodUnits,
        totalUnits
      );

      expect(result.availability).toBe(90);
      expect(result.performance).toBeGreaterThan(90);
      expect(result.quality).toBe(98);
      expect(result.oee).toBeGreaterThan(80); // OEE should be in the 80s
    });

    it('should handle zero planned production time', () => {
      const result = OEECalculationService.calculateOEE(
        0, 0, 0, 30, undefined, 100, 100, 100, 100
      );

      expect(result.availability).toBe(0);
      expect(result.oee).toBe(0);
    });

    it('should calculate performance using ideal cycle time', () => {
      const result = OEECalculationService.calculateOEE(
        28800, // 8 hours
        28800, // 8 hours operating
        0,
        30,    // 30 second ideal cycle time
        undefined,
        960,   // Produced 960 units
        undefined,
        960,
        960
      );

      // Performance = (30 * 960) / 28800 * 100 = 100%
      expect(result.performance).toBe(100);
    });

    it('should calculate performance using target production', () => {
      const result = OEECalculationService.calculateOEE(
        28800,
        28800,
        0,
        undefined, // No ideal cycle time
        undefined,
        900,  // Produced 900 units
        1000, // Target 1000 units
        900,
        900
      );

      // Performance = 900 / 1000 * 100 = 90%
      expect(result.performance).toBe(90);
    });

    it('should calculate performance using actual vs ideal cycle time', () => {
      const result = OEECalculationService.calculateOEE(
        28800,
        28800,
        0,
        30,    // 30 second ideal
        35,    // 35 second actual
        0,     // No total units
        undefined,
        0,
        0
      );

      // Performance = 30 / 35 * 100 = 85.7%
      expect(result.performance).toBeCloseTo(85.7, 1);
    });

    it('should cap performance at 100%', () => {
      // Scenario where calculated performance would exceed 100%
      const result = OEECalculationService.calculateOEE(
        28800,
        28800,
        0,
        30,
        25, // Faster than ideal
        0,
        undefined,
        100,
        100
      );

      expect(result.performance).toBeLessThanOrEqual(100);
    });

    it('should calculate quality correctly', () => {
      const result = OEECalculationService.calculateOEE(
        28800,
        28800,
        0,
        30,
        30,
        1000,
        1000,
        950,  // 950 good units
        1000  // 1000 total units
      );

      // Quality = 950 / 1000 * 100 = 95%
      expect(result.quality).toBe(95);
    });

    it('should handle zero total units for quality', () => {
      const result = OEECalculationService.calculateOEE(
        28800,
        28800,
        0,
        30,
        30,
        0,
        0,
        0,
        0
      );

      expect(result.quality).toBe(0);
    });

    it('should calculate utilization rate correctly', () => {
      const plannedTime = 28800; // 8 hours
      const operatingTime = 25200; // 7 hours
      const downtime = 3600; // 1 hour

      const result = OEECalculationService.calculateOEE(
        plannedTime,
        operatingTime,
        downtime,
        30,
        30,
        840,
        840,
        840,
        840
      );

      // Utilization = (25200 + 3600) / 28800 * 100 = 100%
      expect(result.utilizationRate).toBe(100);
    });

    it('should round all metrics to 1 decimal place', () => {
      const result = OEECalculationService.calculateOEE(
        28800,
        25920, // 90%
        2880,
        30,
        32,    // Creates decimals
        810,
        850,
        798,   // Creates decimals
        810
      );

      // All values should have at most 1 decimal place
      expect(result.availability.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
      expect(result.performance.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
      expect(result.quality.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
      expect(result.oee.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(1);
    });

    it('should calculate TEEP (currently same as OEE)', () => {
      const result = OEECalculationService.calculateOEE(
        28800,
        25920,
        2880,
        30,
        30,
        864,
        864,
        850,
        864
      );

      expect(result.teep).toBe(result.oee);
    });
  });

  describe('recordOEEPerformance', () => {
    it('should record OEE performance log with state history integration', async () => {
      const equipmentId = 'eq-001';
      const periodStart = new Date('2025-10-18T08:00:00Z');
      const periodEnd = new Date('2025-10-18T16:00:00Z');

      // Mock state history: 7 hours running, 1 hour maintenance
      const mockStateHistory = [
        {
          id: 'sh-1',
          equipmentId,
          newState: EquipmentState.RUNNING,
          oldState: EquipmentState.IDLE,
          stateStartTime: new Date('2025-10-18T08:00:00Z'),
          stateEndTime: new Date('2025-10-18T15:00:00Z'),
          downtime: false,
          downtime_category: null,
          downtime_reason: null,
        },
        {
          id: 'sh-2',
          equipmentId,
          newState: EquipmentState.MAINTENANCE,
          oldState: EquipmentState.RUNNING,
          stateStartTime: new Date('2025-10-18T15:00:00Z'),
          stateEndTime: new Date('2025-10-18T16:00:00Z'),
          downtime: true,
          downtime_category: 'Planned',
          downtime_reason: 'Scheduled PM',
        },
      ];

      const mockPerformanceLog = {
        id: 'perf-log-1',
        equipmentId,
        periodStart,
        periodEnd,
        periodType: PerformancePeriodType.SHIFT,
        plannedProductionTime: 28800,
        operatingTime: 25200, // 7 hours
        downtime: 3600, // 1 hour
        availability: 87.5,
        idealCycleTime: 30,
        actualCycleTime: 30,
        totalUnitsProduced: 840,
        targetProduction: 960,
        performance: 87.5,
        goodUnits: 820,
        rejectedUnits: 15,
        scrapUnits: 5,
        reworkUnits: 0,
        quality: 97.6,
        oee: 83.5,
        teep: 83.5,
        utilizationRate: 100,
        hasAnomalies: false,
        workOrderId: null,
        partId: null,
        operatorId: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.equipmentStateHistory.findMany.mockResolvedValue(mockStateHistory);
      mockPrisma.equipmentPerformanceLog.create.mockResolvedValue(mockPerformanceLog);

      const result = await OEECalculationService.recordOEEPerformance({
        equipmentId,
        periodStart,
        periodEnd,
        periodType: PerformancePeriodType.SHIFT,
        plannedProductionTime: 28800,
        idealCycleTime: 30,
        totalUnitsProduced: 840,
        targetProduction: 960,
        goodUnits: 820,
        rejectedUnits: 15,
        scrapUnits: 5,
        reworkUnits: 0,
      });

      expect(mockPrisma.equipmentStateHistory.findMany).toHaveBeenCalled();
      expect(mockPrisma.equipmentPerformanceLog.create).toHaveBeenCalled();
      expect(result.equipmentId).toBe(equipmentId);
      expect(result.oee).toBeGreaterThan(0);
    });

    it('should detect anomalies when OEE > 100%', async () => {
      const mockStateHistory = [
        {
          equipmentId: 'eq-001',
          newState: EquipmentState.RUNNING,
          stateStartTime: new Date('2025-10-18T08:00:00Z'),
          stateEndTime: new Date('2025-10-18T16:00:00Z'),
          downtime: false,
        },
      ];

      const mockPerformanceLog = {
        id: 'perf-log-anomaly',
        equipmentId: 'eq-001',
        hasAnomalies: true,
        oee: 105, // Invalid OEE > 100%
        availability: 100,
        performance: 105,
        quality: 100,
      };

      mockPrisma.equipmentStateHistory.findMany.mockResolvedValue(mockStateHistory);
      mockPrisma.equipmentPerformanceLog.create.mockResolvedValue(mockPerformanceLog);

      const result = await OEECalculationService.recordOEEPerformance({
        equipmentId: 'eq-001',
        periodStart: new Date('2025-10-18T08:00:00Z'),
        periodEnd: new Date('2025-10-18T16:00:00Z'),
        periodType: PerformancePeriodType.SHIFT,
        plannedProductionTime: 28800,
        idealCycleTime: 25, // Faster than actual, causing > 100%
        totalUnitsProduced: 1200,
        targetProduction: 960,
        goodUnits: 1200,
        rejectedUnits: 0,
        scrapUnits: 0,
        reworkUnits: 0,
      });

      expect(result.hasAnomalies).toBe(true);
    });

    it('should calculate operating time from state history', async () => {
      const periodStart = new Date('2025-10-18T08:00:00Z');
      const periodEnd = new Date('2025-10-18T12:00:00Z');

      const mockStateHistory = [
        {
          equipmentId: 'eq-001',
          newState: EquipmentState.RUNNING,
          stateStartTime: new Date('2025-10-18T08:00:00Z'),
          stateEndTime: new Date('2025-10-18T10:00:00Z'), // 2 hours
          downtime: false,
        },
        {
          equipmentId: 'eq-001',
          newState: EquipmentState.IDLE,
          stateStartTime: new Date('2025-10-18T10:00:00Z'),
          stateEndTime: new Date('2025-10-18T11:00:00Z'), // 1 hour idle
          downtime: false,
        },
        {
          equipmentId: 'eq-001',
          newState: EquipmentState.RUNNING,
          stateStartTime: new Date('2025-10-18T11:00:00Z'),
          stateEndTime: new Date('2025-10-18T12:00:00Z'), // 1 hour
          downtime: false,
        },
      ];

      mockPrisma.equipmentStateHistory.findMany.mockResolvedValue(mockStateHistory);
      mockPrisma.equipmentPerformanceLog.create.mockResolvedValue({
        id: 'perf-log-2',
        operatingTime: 10800, // 3 hours total running
      });

      await OEECalculationService.recordOEEPerformance({
        equipmentId: 'eq-001',
        periodStart,
        periodEnd,
        periodType: PerformancePeriodType.SHIFT,
        plannedProductionTime: 14400,
        totalUnitsProduced: 360,
        goodUnits: 350,
        rejectedUnits: 10,
        scrapUnits: 0,
        reworkUnits: 0,
      });

      const createCall = mockPrisma.equipmentPerformanceLog.create.mock.calls[0][0];
      expect(createCall.data.operatingTime).toBeGreaterThan(0);
    });
  });

  describe('getCurrentOEE', () => {
    it('should return latest OEE performance log', async () => {
      const mockLatestLog = {
        id: 'latest-log',
        equipmentId: 'eq-001',
        periodEnd: new Date('2025-10-18T16:00:00Z'),
        oee: 85.5,
        availability: 90,
        performance: 95,
        quality: 100,
      };

      mockPrisma.equipmentPerformanceLog.findFirst.mockResolvedValue(mockLatestLog);

      const result = await OEECalculationService.getCurrentOEE('eq-001');

      expect(mockPrisma.equipmentPerformanceLog.findFirst).toHaveBeenCalledWith({
        where: { equipmentId: 'eq-001' },
        orderBy: { periodEnd: 'desc' },
      });
      expect(result).toEqual(mockLatestLog);
    });

    it('should return null if no OEE logs exist', async () => {
      mockPrisma.equipmentPerformanceLog.findFirst.mockResolvedValue(null);

      const result = await OEECalculationService.getCurrentOEE('eq-new');

      expect(result).toBeNull();
    });
  });

  describe('getOEEPerformance', () => {
    it('should retrieve OEE logs with filters', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          equipmentId: 'eq-001',
          periodType: PerformancePeriodType.SHIFT,
          periodStart: new Date('2025-10-18T08:00:00Z'),
          oee: 85,
        },
        {
          id: 'log-2',
          equipmentId: 'eq-001',
          periodType: PerformancePeriodType.SHIFT,
          periodStart: new Date('2025-10-17T08:00:00Z'),
          oee: 88,
        },
      ];

      mockPrisma.equipmentPerformanceLog.findMany.mockResolvedValue(mockLogs);

      const result = await OEECalculationService.getOEEPerformance({
        equipmentId: 'eq-001',
        periodType: PerformancePeriodType.SHIFT,
        from: new Date('2025-10-17T00:00:00Z'),
        to: new Date('2025-10-18T23:59:59Z'),
        limit: 50,
      });

      expect(mockPrisma.equipmentPerformanceLog.findMany).toHaveBeenCalled();
      expect(result).toEqual(mockLogs);
    });

    it('should use default limit of 100', async () => {
      mockPrisma.equipmentPerformanceLog.findMany.mockResolvedValue([]);

      await OEECalculationService.getOEEPerformance({
        equipmentId: 'eq-001',
      });

      const findManyCall = mockPrisma.equipmentPerformanceLog.findMany.mock.calls[0][0];
      expect(findManyCall.take).toBe(100);
    });
  });

  describe('calculateOEEFromHistory', () => {
    it('should calculate OEE automatically from state history', async () => {
      const periodStart = new Date('2025-10-18T08:00:00Z');
      const periodEnd = new Date('2025-10-18T16:00:00Z');

      const mockStateHistory = [
        {
          equipmentId: 'eq-001',
          newState: EquipmentState.RUNNING,
          stateStartTime: periodStart,
          stateEndTime: periodEnd,
          downtime: false,
        },
      ];

      mockPrisma.equipmentStateHistory.findMany.mockResolvedValue(mockStateHistory);

      const result = await OEECalculationService.calculateOEEFromHistory(
        'eq-001',
        periodStart,
        periodEnd,
        PerformancePeriodType.SHIFT,
        28800, // 8 hours planned
        30     // 30 second ideal cycle time
      );

      expect(result).toBeDefined();
      expect(result.availability).toBeGreaterThan(0);
      expect(result.oee).toBeGreaterThan(0);
    });

    it('should estimate units produced from cycle time', async () => {
      const periodStart = new Date('2025-10-18T08:00:00Z');
      const periodEnd = new Date('2025-10-18T16:00:00Z');

      const mockStateHistory = [
        {
          equipmentId: 'eq-001',
          newState: EquipmentState.RUNNING,
          stateStartTime: periodStart,
          stateEndTime: periodEnd,
          downtime: false,
        },
      ];

      mockPrisma.equipmentStateHistory.findMany.mockResolvedValue(mockStateHistory);

      const idealCycleTime = 30; // 30 seconds
      const result = await OEECalculationService.calculateOEEFromHistory(
        'eq-001',
        periodStart,
        periodEnd,
        PerformancePeriodType.SHIFT,
        28800,
        idealCycleTime
      );

      // With 28800 seconds operating and 30 second cycle time, should estimate 960 units
      expect(result.performance).toBeGreaterThan(0);
    });

    it('should handle periods with no state history', async () => {
      mockPrisma.equipmentStateHistory.findMany.mockResolvedValue([]);

      const result = await OEECalculationService.calculateOEEFromHistory(
        'eq-001',
        new Date('2025-10-18T08:00:00Z'),
        new Date('2025-10-18T16:00:00Z'),
        PerformancePeriodType.SHIFT,
        28800,
        30
      );

      expect(result.availability).toBe(0);
      expect(result.oee).toBe(0);
    });
  });

  describe('getAggregatedOEE', () => {
    it('should calculate average OEE across multiple periods', async () => {
      const mockPeriods = [
        {
          id: 'log-1',
          equipmentId: 'eq-001',
          availability: 90,
          performance: 95,
          quality: 98,
          oee: 83.8,
        },
        {
          id: 'log-2',
          equipmentId: 'eq-001',
          availability: 92,
          performance: 93,
          quality: 97,
          oee: 83.0,
        },
        {
          id: 'log-3',
          equipmentId: 'eq-001',
          availability: 88,
          performance: 96,
          quality: 99,
          oee: 83.6,
        },
      ];

      mockPrisma.equipmentPerformanceLog.findMany.mockResolvedValue(mockPeriods);

      const result = await OEECalculationService.getAggregatedOEE(
        'eq-001',
        PerformancePeriodType.SHIFT,
        new Date('2025-10-15T00:00:00Z'),
        new Date('2025-10-18T23:59:59Z')
      );

      expect(result.periods).toHaveLength(3);
      expect(result.average.availability).toBeCloseTo(90, 0); // (90+92+88)/3 = 90
      expect(result.average.oee).toBeCloseTo(83.5, 0); // Average OEE
    });

    it('should identify best and worst performing periods', async () => {
      const mockPeriods = [
        { id: 'log-1', oee: 85.0, availability: 90, performance: 95, quality: 99 },
        { id: 'log-2', oee: 92.5, availability: 95, performance: 97, quality: 100 },
        { id: 'log-3', oee: 78.3, availability: 85, performance: 92, quality: 100 },
      ];

      mockPrisma.equipmentPerformanceLog.findMany.mockResolvedValue(mockPeriods);

      const result = await OEECalculationService.getAggregatedOEE(
        'eq-001',
        PerformancePeriodType.SHIFT,
        new Date('2025-10-15T00:00:00Z'),
        new Date('2025-10-18T23:59:59Z')
      );

      expect(result.best?.id).toBe('log-2'); // Highest OEE
      expect(result.worst?.id).toBe('log-3'); // Lowest OEE
    });

    it('should handle empty period set', async () => {
      mockPrisma.equipmentPerformanceLog.findMany.mockResolvedValue([]);

      const result = await OEECalculationService.getAggregatedOEE(
        'eq-001',
        PerformancePeriodType.SHIFT,
        new Date('2025-10-15T00:00:00Z'),
        new Date('2025-10-18T23:59:59Z')
      );

      expect(result.periods).toHaveLength(0);
      expect(result.average.oee).toBe(0);
      expect(result.best).toBeNull();
      expect(result.worst).toBeNull();
    });
  });

  describe('updateEquipmentOEE', () => {
    it('should update equipment OEE fields from latest performance log', async () => {
      const mockLatestLog = {
        id: 'latest-log',
        equipmentId: 'eq-001',
        availability: 92.5,
        performance: 95.0,
        quality: 98.5,
        oee: 86.7,
        utilizationRate: 98.0,
      };

      mockPrisma.equipmentPerformanceLog.findFirst.mockResolvedValue(mockLatestLog);
      mockPrisma.equipment.update.mockResolvedValue({
        id: 'eq-001',
        availability: 92.5,
        performance: 95.0,
        quality: 98.5,
        oee: 86.7,
        utilizationRate: 98.0,
      });

      await OEECalculationService.updateEquipmentOEE('eq-001');

      expect(mockPrisma.equipment.update).toHaveBeenCalledWith({
        where: { id: 'eq-001' },
        data: {
          availability: 92.5,
          performance: 95.0,
          quality: 98.5,
          oee: 86.7,
          utilizationRate: 98.0,
        },
      });
    });

    it('should handle equipment with no OEE logs', async () => {
      mockPrisma.equipmentPerformanceLog.findFirst.mockResolvedValue(null);

      await OEECalculationService.updateEquipmentOEE('eq-new');

      expect(mockPrisma.equipment.update).not.toHaveBeenCalled();
    });

    it('should default utilizationRate to 0 if not present', async () => {
      const mockLatestLog = {
        id: 'latest-log',
        equipmentId: 'eq-001',
        availability: 90,
        performance: 95,
        quality: 100,
        oee: 85.5,
        utilizationRate: null,
      };

      mockPrisma.equipmentPerformanceLog.findFirst.mockResolvedValue(mockLatestLog);
      mockPrisma.equipment.update.mockResolvedValue({});

      await OEECalculationService.updateEquipmentOEE('eq-001');

      const updateCall = mockPrisma.equipment.update.mock.calls[0][0];
      expect(updateCall.data.utilizationRate).toBe(0);
    });
  });
});
