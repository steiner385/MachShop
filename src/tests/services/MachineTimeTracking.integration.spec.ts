/**
 * Machine Time Tracking Integration Tests
 *
 * Tests for machine time tracking, equipment signal processing,
 * and cost calculation services working together in real scenarios.
 *
 * @module tests/services/MachineTimeTracking.integration.spec.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { machineTimeTrackingService } from '../../services/MachineTimeTrackingService';
import { equipmentSignalProcessor } from '../../services/EquipmentSignalProcessor';
import { machineCostCalculationService } from '../../services/MachineCostCalculationService';

const prisma = new PrismaClient();

describe('Machine Time Tracking Integration Tests', () => {
  let testEquipmentId: string;
  let testWorkOrderId: string;
  let testOperationId: string;
  let testEntryId: string;

  beforeAll(async () => {
    // Create test data
    const equipment = await prisma.equipment.create({
      data: {
        name: 'Test Machine',
        serialNumber: 'TEST-001',
        machineHourRate: 150.0,
        dailyFixedCost: 500.0,
      },
    });
    testEquipmentId = equipment.id;

    const workOrder = await prisma.workOrder.create({
      data: {
        number: 'WO-TEST-001',
        quantity: 100,
        status: 'IN_PROGRESS',
      },
    });
    testWorkOrderId = workOrder.id;

    const operation = await prisma.operation.create({
      data: {
        workOrderId,
        name: 'Test Operation',
        sequenceNumber: 1,
        status: 'IN_PROGRESS',
        estimatedCost: 1000.0,
      },
    });
    testOperationId = operation.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.machineTimeEntry.deleteMany({
      where: { equipmentId: testEquipmentId },
    });
    await prisma.operation.deleteMany({
      where: { id: testOperationId },
    });
    await prisma.workOrder.deleteMany({
      where: { id: testWorkOrderId },
    });
    await prisma.equipment.deleteMany({
      where: { id: testEquipmentId },
    });
    await prisma.$disconnect();
  });

  describe('Basic Machine Time Entry Operations', () => {
    it('should create a new machine time entry', async () => {
      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId: testEquipmentId,
        workOrderId: testWorkOrderId,
        operationId: testOperationId,
        startTime: new Date(),
        entrySource: 'MANUAL',
        dataSource: 'API',
      });

      expect(entry).toBeDefined();
      expect(entry.equipmentId).toBe(testEquipmentId);
      expect(entry.status).toBe('ACTIVE');
      testEntryId = entry.id;
    });

    it('should not allow overlapping entries for same equipment', async () => {
      await expect(
        machineTimeTrackingService.startMachineTime({
          equipmentId: testEquipmentId,
          workOrderId: testWorkOrderId,
          operationId: testOperationId,
          startTime: new Date(),
          entrySource: 'MANUAL',
        })
      ).rejects.toThrow('already has active time entry');
    });

    it('should stop a machine time entry and calculate duration', async () => {
      const startTime = new Date(Date.now() - 3600000); // 1 hour ago
      const endTime = new Date();

      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId: testEquipmentId,
        workOrderId: testWorkOrderId,
        operationId: testOperationId,
        startTime,
        entrySource: 'MANUAL',
      });

      const stopped = await machineTimeTrackingService.stopMachineTime(entry.id, endTime);

      expect(stopped.status).toBe('COMPLETED');
      expect(stopped.duration).toBeDefined();
      expect(stopped.machineCost).toBeDefined();
      expect(stopped.duration).toBeCloseTo(1, 1); // Should be ~1 hour
    });

    it('should pause and resume machine time entry', async () => {
      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId: testEquipmentId,
        workOrderId: testWorkOrderId,
        operationId: testOperationId,
        startTime: new Date(),
        entrySource: 'MANUAL',
      });

      const paused = await machineTimeTrackingService.pauseMachineTime(entry.id);
      expect(paused.status).toBe('PAUSED');

      const resumed = await machineTimeTrackingService.resumeMachineTime(entry.id);
      expect(resumed.status).toBe('ACTIVE');

      await machineTimeTrackingService.stopMachineTime(entry.id);
    });
  });

  describe('Equipment Signal Processing', () => {
    it('should process START signal and create machine time entry', async () => {
      const signal = {
        equipmentId: testEquipmentId,
        signalType: 'START',
        sourceType: 'EQUIPMENT_SIGNAL',
        timestamp: new Date(),
        quality: 'GOOD' as const,
      };

      await equipmentSignalProcessor.processSignal(signal);

      const entries = await machineTimeTrackingService.getActiveEntries(testEquipmentId);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].entrySource).toBe('MACHINE_AUTO');
    });

    it('should process STOP signal and stop machine time entry', async () => {
      const startSignal = {
        equipmentId: testEquipmentId,
        signalType: 'START',
        sourceType: 'EQUIPMENT_SIGNAL',
        timestamp: new Date(),
        quality: 'GOOD' as const,
      };

      await equipmentSignalProcessor.processSignal(startSignal);

      // Wait for debounce window
      await new Promise((resolve) => setTimeout(resolve, 2100));

      const stopSignal = {
        equipmentId: testEquipmentId,
        signalType: 'STOP',
        sourceType: 'EQUIPMENT_SIGNAL',
        timestamp: new Date(),
        quality: 'GOOD' as const,
      };

      await equipmentSignalProcessor.processSignal(stopSignal);

      const entries = await machineTimeTrackingService.getActiveEntries(testEquipmentId);
      // Should have no active entries after stop signal
      const activeEntries = entries.filter((e) => e.status === 'ACTIVE');
      expect(activeEntries.length).toBe(0);
    });

    it('should debounce duplicate signals within window', async () => {
      const signal = {
        equipmentId: testEquipmentId,
        signalType: 'START',
        sourceType: 'EQUIPMENT_SIGNAL',
        timestamp: new Date(),
        quality: 'GOOD' as const,
      };

      await equipmentSignalProcessor.processSignal(signal);
      const entriesAfterFirst = await machineTimeTrackingService.getActiveEntries(testEquipmentId);
      const countAfterFirst = entriesAfterFirst.length;

      // Send same signal again immediately (should be debounced)
      await equipmentSignalProcessor.processSignal(signal);
      const entriesAfterSecond = await machineTimeTrackingService.getActiveEntries(testEquipmentId);

      // Should not create new entry due to debouncing
      expect(entriesAfterSecond.length).toBe(countAfterFirst);
    });

    it('should record signal history', () => {
      const signal = {
        equipmentId: testEquipmentId,
        signalType: 'RUNNING',
        sourceType: 'MTCONNECT',
        timestamp: new Date(),
        quality: 'GOOD' as const,
      };

      equipmentSignalProcessor['recordSignal'](signal);

      const history = equipmentSignalProcessor.getSignalHistory(testEquipmentId);
      expect(history.length).toBeGreaterThan(0);
      expect(history[history.length - 1].signalType).toBe('RUNNING');
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate machine hour cost correctly', () => {
      const durationSeconds = 3600; // 1 hour
      const hourlyRate = 150;

      const cost = machineCostCalculationService.calculateMachineHourCost(
        durationSeconds,
        hourlyRate
      );

      expect(cost).toBe(150);
    });

    it('should calculate machine hour cost with partial hours', () => {
      const durationSeconds = 1800; // 30 minutes
      const hourlyRate = 150;

      const cost = machineCostCalculationService.calculateMachineHourCost(
        durationSeconds,
        hourlyRate
      );

      expect(cost).toBe(75);
    });

    it('should calculate machine time entry cost', async () => {
      const startTime = new Date(Date.now() - 7200000); // 2 hours ago
      const endTime = new Date();

      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId: testEquipmentId,
        workOrderId: testWorkOrderId,
        operationId: testOperationId,
        startTime,
        entrySource: 'MANUAL',
      });

      await machineTimeTrackingService.stopMachineTime(entry.id, endTime);

      const costResult = await machineCostCalculationService.calculateMachineTimeCost(entry.id);

      expect(costResult).toBeDefined();
      expect(costResult.baseMachineHours).toBeCloseTo(2, 0);
      expect(costResult.machineCost).toBeGreaterThan(0);
      expect(costResult.totalCost).toBeGreaterThan(0);
    });

    it('should calculate operation cost summary', async () => {
      const summary = await machineCostCalculationService.calculateOperationCostSummary(
        testOperationId
      );

      expect(summary).toBeDefined();
      expect(summary.operationId).toBe(testOperationId);
      expect(summary.totalMachineHours).toBeGreaterThanOrEqual(0);
      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
    });

    it('should calculate work order cost summary', async () => {
      const summary = await machineCostCalculationService.calculateWorkOrderCostSummary(
        testWorkOrderId
      );

      expect(summary).toBeDefined();
      expect(summary.workOrderId).toBe(testWorkOrderId);
      expect(summary.totalCost).toBeGreaterThanOrEqual(0);
      expect(summary.costPerUnit).toBeGreaterThanOrEqual(0);
    });

    it('should calculate equipment cost allocation', async () => {
      const startDate = new Date(Date.now() - 86400000); // 1 day ago
      const endDate = new Date();

      const allocation = await machineCostCalculationService.calculateEquipmentCostAllocation(
        testEquipmentId,
        startDate,
        endDate
      );

      expect(allocation).toBeDefined();
      expect(allocation.equipmentId).toBe(testEquipmentId);
      expect(allocation.totalMachineHours).toBeGreaterThanOrEqual(0);
      expect(allocation.utilizationPercent).toBeGreaterThanOrEqual(0);
    });

    it('should validate costing configuration', () => {
      const result = machineCostCalculationService['constructor'].validateConfiguration({
        costingModel: 'MACHINE_HOURS',
        overheadRate: 0.15,
      });

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should reject invalid costing configuration', () => {
      const result = machineCostCalculationService['constructor'].validateConfiguration({
        costingModel: 'INVALID',
        overheadRate: 1.5,
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Machine Utilization Metrics', () => {
    it('should calculate machine utilization', async () => {
      const startDate = new Date(Date.now() - 86400000); // 1 day ago
      const endDate = new Date();

      const utilization = await machineTimeTrackingService.getMachineUtilization(
        testEquipmentId,
        startDate,
        endDate
      );

      expect(utilization).toBeDefined();
      expect(utilization.totalRunTime).toBeGreaterThanOrEqual(0);
      expect(utilization.totalIdleTime).toBeGreaterThanOrEqual(0);
      expect(utilization.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(utilization.utilizationRate).toBeLessThanOrEqual(100);
    });

    it('should return zero metrics for equipment with no history', async () => {
      const tempEquipment = await prisma.equipment.create({
        data: {
          name: 'Temp Equipment',
          serialNumber: 'TEMP-001',
          machineHourRate: 100,
        },
      });

      const utilization = await machineTimeTrackingService.getMachineUtilization(
        tempEquipment.id,
        new Date(Date.now() - 86400000),
        new Date()
      );

      expect(utilization.totalRunTime).toBe(0);
      expect(utilization.utilizationRate).toBe(0);

      await prisma.equipment.delete({
        where: { id: tempEquipment.id },
      });
    });
  });

  describe('Data Validation', () => {
    it('should validate complete machine time entry', async () => {
      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId: testEquipmentId,
        workOrderId: testWorkOrderId,
        operationId: testOperationId,
        startTime: new Date(),
        entrySource: 'MANUAL',
      });

      const validation = await machineTimeTrackingService.validateMachineTimeEntry(entry.id);

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);

      await machineTimeTrackingService.stopMachineTime(entry.id);
    });

    it('should detect invalid machine time entry', async () => {
      const validation = await machineTimeTrackingService.validateMachineTimeEntry(
        'non-existent-id'
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Idle Machine Auto-stop', () => {
    it('should auto-stop idle machines', async () => {
      const oldStartTime = new Date(Date.now() - 600000); // 10 minutes ago
      const entry = await machineTimeTrackingService.startMachineTime({
        equipmentId: testEquipmentId,
        workOrderId: testWorkOrderId,
        operationId: testOperationId,
        startTime: oldStartTime,
        entrySource: 'MANUAL',
      });

      // Manually update updatedAt to make it appear idle
      await prisma.machineTimeEntry.update({
        where: { id: entry.id },
        data: { updatedAt: oldStartTime },
      });

      const stoppedCount = await machineTimeTrackingService.autoStopIdleMachines(300);

      expect(stoppedCount).toBeGreaterThanOrEqual(0);

      const stoppedEntry = await prisma.machineTimeEntry.findUnique({
        where: { id: entry.id },
      });

      expect(stoppedEntry?.status).toBe('COMPLETED');
    });
  });

  describe('History and Reporting', () => {
    it('should retrieve machine time history with date filters', async () => {
      const startDate = new Date(Date.now() - 86400000);
      const endDate = new Date();

      const history = await machineTimeTrackingService.getMachineTimeHistory(
        testEquipmentId,
        startDate,
        endDate
      );

      expect(Array.isArray(history)).toBe(true);
      expect(history.every((e) => e.status === 'COMPLETED')).toBe(true);
    });

    it('should return empty history for future date range', async () => {
      const startDate = new Date(Date.now() + 86400000);
      const endDate = new Date(Date.now() + 172800000);

      const history = await machineTimeTrackingService.getMachineTimeHistory(
        testEquipmentId,
        startDate,
        endDate
      );

      expect(history.length).toBe(0);
    });
  });

  describe('Processor State Management', () => {
    it('should track processor state for equipment', () => {
      const state = equipmentSignalProcessor.getProcessorState(testEquipmentId);

      // State may exist if equipment has been processed
      if (state) {
        expect(state.equipmentId).toBe(testEquipmentId);
        expect(state.healthStatus).toBeDefined();
      }
    });

    it('should return undefined for equipment with no processor state', () => {
      const state = equipmentSignalProcessor.getProcessorState('non-existent-equipment');

      expect(state).toBeUndefined();
    });
  });
});
