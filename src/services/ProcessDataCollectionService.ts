/**
 * Process Data Collection Service
 *
 * Collects and manages process data during production runs,
 * including process parameters, results, and quality metrics.
 */

import { PrismaClient } from '@prisma/client';
import {
  StartProcessDataCollectionInput,
  CompleteProcessDataCollectionInput,
  ProcessDataCollectionRecord,
  QueryProcessDataInput,
  ProcessDataSummary,
  ProcessParameterTrend,
} from '../types/l2equipment';

const prisma = new PrismaClient();

export class ProcessDataCollectionService {
  /**
   * Start a new process data collection
   */
  static async startProcessDataCollection(
    input: StartProcessDataCollectionInput
  ): Promise<ProcessDataCollectionRecord> {
    const {
      equipmentId,
      processName,
      processStepNumber,
      workOrderId,
      operationId,
      partNumber,
      lotNumber,
      serialNumber,
      parameters,
      operatorId,
      supervisorId,
    } = input;

    // Validate equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new Error(`Equipment with ID ${equipmentId} not found`);
    }

    // Validate work order if provided
    if (workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        throw new Error(`Work order with ID ${workOrderId} not found`);
      }
    }

    // Create process data collection record
    const processData = await prisma.processDataCollection.create({
      data: {
        equipmentId,
        processName,
        processStepNumber,
        startTimestamp: new Date(),
        workOrderId,
        operationId,
        partNumber,
        lotNumber,
        serialNumber,
        parameters,
        operatorId,
        supervisorId,
      },
    });

    return processData as ProcessDataCollectionRecord;
  }

  /**
   * Complete a process data collection
   */
  static async completeProcessDataCollection(
    input: CompleteProcessDataCollectionInput
  ): Promise<ProcessDataCollectionRecord> {
    const {
      processDataCollectionId,
      endTimestamp,
      quantityProduced,
      quantityGood,
      quantityScrap,
      inSpecCount,
      outOfSpecCount,
      averageUtilization,
      peakUtilization,
      alarmCount,
      criticalAlarmCount,
      additionalParameters,
    } = input;

    // Get existing process data
    const existingData = await prisma.processDataCollection.findUnique({
      where: { id: processDataCollectionId },
    });

    if (!existingData) {
      throw new Error(
        `Process data collection with ID ${processDataCollectionId} not found`
      );
    }

    // Calculate duration
    const duration = (endTimestamp.getTime() - existingData.startTimestamp.getTime()) / 1000; // seconds

    // Merge additional parameters with existing ones
    const mergedParameters = additionalParameters
      ? { ...existingData.parameters, ...additionalParameters }
      : existingData.parameters;

    // Update process data
    const updatedData = await prisma.processDataCollection.update({
      where: { id: processDataCollectionId },
      data: {
        endTimestamp,
        duration,
        quantityProduced,
        quantityGood,
        quantityScrap,
        inSpecCount,
        outOfSpecCount,
        averageUtilization,
        peakUtilization,
        alarmCount: alarmCount !== undefined ? alarmCount : existingData.alarmCount,
        criticalAlarmCount: criticalAlarmCount !== undefined ? criticalAlarmCount : existingData.criticalAlarmCount,
        parameters: mergedParameters,
      },
    });

    return updatedData as ProcessDataCollectionRecord;
  }

  /**
   * Update process parameters during collection
   */
  static async updateProcessParameters(
    processDataCollectionId: string,
    parameters: Record<string, any>
  ): Promise<ProcessDataCollectionRecord> {
    const existingData = await prisma.processDataCollection.findUnique({
      where: { id: processDataCollectionId },
    });

    if (!existingData) {
      throw new Error(
        `Process data collection with ID ${processDataCollectionId} not found`
      );
    }

    // Merge parameters
    const mergedParameters = { ...existingData.parameters, ...parameters };

    const updatedData = await prisma.processDataCollection.update({
      where: { id: processDataCollectionId },
      data: { parameters: mergedParameters },
    });

    return updatedData as ProcessDataCollectionRecord;
  }

  /**
   * Increment alarm counts
   */
  static async incrementAlarmCount(
    processDataCollectionId: string,
    critical: boolean = false
  ): Promise<ProcessDataCollectionRecord> {
    const updateData: any = {
      alarmCount: { increment: 1 },
    };

    if (critical) {
      updateData.criticalAlarmCount = { increment: 1 };
    }

    const updatedData = await prisma.processDataCollection.update({
      where: { id: processDataCollectionId },
      data: updateData,
    });

    return updatedData as ProcessDataCollectionRecord;
  }

  /**
   * Query process data collections
   */
  static async queryProcessData(
    query: QueryProcessDataInput
  ): Promise<ProcessDataCollectionRecord[]> {
    const {
      equipmentId,
      processName,
      workOrderId,
      partNumber,
      lotNumber,
      serialNumber,
      startDate,
      endDate,
      limit,
    } = query;

    const where: any = {};

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (processName) {
      where.processName = processName;
    }

    if (workOrderId) {
      where.workOrderId = workOrderId;
    }

    if (partNumber) {
      where.partNumber = partNumber;
    }

    if (lotNumber) {
      where.lotNumber = lotNumber;
    }

    if (serialNumber) {
      where.serialNumber = serialNumber;
    }

    if (startDate || endDate) {
      where.startTimestamp = {};
      if (startDate) {
        where.startTimestamp.gte = startDate;
      }
      if (endDate) {
        where.startTimestamp.lte = endDate;
      }
    }

    const processData = await prisma.processDataCollection.findMany({
      where,
      orderBy: { startTimestamp: 'desc' },
      take: limit || 100,
    });

    return processData as ProcessDataCollectionRecord[];
  }

  /**
   * Get active (incomplete) process data collections for equipment
   */
  static async getActiveProcesses(
    equipmentId: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await prisma.processDataCollection.findMany({
      where: {
        equipmentId,
        endTimestamp: null,
      },
      orderBy: { startTimestamp: 'desc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Generate process data summary
   */
  static async generateProcessSummary(
    equipmentId: string,
    processName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProcessDataSummary> {
    // Get equipment details
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
      select: {
        id: true,
        equipmentNumber: true,
        name: true,
      },
    });

    if (!equipment) {
      throw new Error(`Equipment with ID ${equipmentId} not found`);
    }

    // Build query filters
    const where: any = {
      equipmentId,
      processName,
      endTimestamp: { not: null }, // Only completed processes
    };

    if (startDate || endDate) {
      where.startTimestamp = {};
      if (startDate) {
        where.startTimestamp.gte = startDate;
      }
      if (endDate) {
        where.startTimestamp.lte = endDate;
      }
    }

    // Get process data
    const processes = await prisma.processDataCollection.findMany({
      where,
    });

    const totalRuns = processes.length;

    if (totalRuns === 0) {
      return {
        equipmentId: equipment.id,
        equipmentNumber: equipment.equipmentNumber,
        equipmentName: equipment.name,
        processName,
        totalRuns: 0,
        totalQuantityProduced: 0,
        totalQuantityGood: 0,
        totalQuantityScrap: 0,
        yieldPercentage: 0,
        averageCycleTime: 0,
        averageUtilization: 0,
        totalAlarms: 0,
        totalCriticalAlarms: 0,
        period: {
          start: startDate || new Date(),
          end: endDate || new Date(),
        },
      };
    }

    // Calculate aggregates
    const totalQuantityProduced = processes.reduce(
      (sum, p) => sum + (p.quantityProduced || 0),
      0
    );
    const totalQuantityGood = processes.reduce(
      (sum, p) => sum + (p.quantityGood || 0),
      0
    );
    const totalQuantityScrap = processes.reduce(
      (sum, p) => sum + (p.quantityScrap || 0),
      0
    );

    const yieldPercentage =
      totalQuantityProduced > 0
        ? (totalQuantityGood / totalQuantityProduced) * 100
        : 0;

    const totalCycleTime = processes.reduce((sum, p) => sum + (p.duration || 0), 0);
    const averageCycleTime = totalCycleTime / totalRuns;

    const totalUtilization = processes.reduce(
      (sum, p) => sum + (p.averageUtilization || 0),
      0
    );
    const averageUtilization = totalUtilization / totalRuns;

    const totalAlarms = processes.reduce((sum, p) => sum + p.alarmCount, 0);
    const totalCriticalAlarms = processes.reduce(
      (sum, p) => sum + p.criticalAlarmCount,
      0
    );

    return {
      equipmentId: equipment.id,
      equipmentNumber: equipment.equipmentNumber,
      equipmentName: equipment.name,
      processName,
      totalRuns,
      totalQuantityProduced,
      totalQuantityGood,
      totalQuantityScrap,
      yieldPercentage,
      averageCycleTime,
      averageUtilization,
      totalAlarms,
      totalCriticalAlarms,
      period: {
        start: startDate || new Date(0),
        end: endDate || new Date(),
      },
    };
  }

  /**
   * Get process parameter trend
   */
  static async getProcessParameterTrend(
    equipmentId: string,
    processName: string,
    parameterName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProcessParameterTrend> {
    const where: any = {
      equipmentId,
      processName,
    };

    if (startDate || endDate) {
      where.startTimestamp = {};
      if (startDate) {
        where.startTimestamp.gte = startDate;
      }
      if (endDate) {
        where.startTimestamp.lte = endDate;
      }
    }

    const processes = await prisma.processDataCollection.findMany({
      where,
      orderBy: { startTimestamp: 'asc' },
    });

    const dataPoints: Array<{
      timestamp: Date;
      value: any;
      processDataCollectionId: string;
    }> = [];

    const numericValues: number[] = [];

    for (const process of processes) {
      const params = process.parameters as Record<string, any>;
      if (params && parameterName in params) {
        const value = params[parameterName];
        dataPoints.push({
          timestamp: process.startTimestamp,
          value,
          processDataCollectionId: process.id,
        });

        if (typeof value === 'number') {
          numericValues.push(value);
        }
      }
    }

    // Calculate statistics for numeric values
    let statistics: {
      min?: number;
      max?: number;
      average?: number;
      stdDev?: number;
    } = {};

    if (numericValues.length > 0) {
      const min = Math.min(...numericValues);
      const max = Math.max(...numericValues);
      const sum = numericValues.reduce((acc, val) => acc + val, 0);
      const average = sum / numericValues.length;

      const squaredDiffs = numericValues.map((val) => Math.pow(val - average, 2));
      const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / numericValues.length;
      const stdDev = Math.sqrt(variance);

      statistics = { min, max, average, stdDev };
    }

    return {
      parameterName,
      dataPoints,
      statistics,
    };
  }

  /**
   * Get process data for work order
   */
  static async getProcessDataForWorkOrder(
    workOrderId: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await prisma.processDataCollection.findMany({
      where: { workOrderId },
      orderBy: { startTimestamp: 'asc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Get process data by serial number
   */
  static async getProcessDataBySerialNumber(
    serialNumber: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await prisma.processDataCollection.findMany({
      where: { serialNumber },
      orderBy: { startTimestamp: 'asc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Get process data by lot number
   */
  static async getProcessDataByLotNumber(
    lotNumber: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await prisma.processDataCollection.findMany({
      where: { lotNumber },
      orderBy: { startTimestamp: 'asc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Delete old process data (data retention)
   */
  static async deleteOldProcessData(
    beforeDate: Date
  ): Promise<{ deletedCount: number }> {
    const result = await prisma.processDataCollection.deleteMany({
      where: {
        startTimestamp: {
          lt: beforeDate,
        },
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * Get process data by ID
   */
  static async getProcessDataById(
    processDataCollectionId: string
  ): Promise<ProcessDataCollectionRecord | null> {
    const processData = await prisma.processDataCollection.findUnique({
      where: { id: processDataCollectionId },
    });

    return processData as ProcessDataCollectionRecord | null;
  }
}
