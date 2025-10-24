/**
 * Equipment Data Collection Service
 *
 * Handles real-time data collection from equipment sensors and monitoring systems.
 * Supports OPC UA, MTConnect, MQTT, and other industrial protocols.
 */

import { PrismaClient, DataCollectionType } from '@prisma/client';
import {
  CollectDataPointInput,
  EquipmentDataCollectionRecord,
  QueryDataPointsInput,
  DataCollectionSummary,
} from '../types/l2equipment';
import { EquipmentMessageBuilder } from './EquipmentMessageBuilder';

const prisma = new PrismaClient();

export class EquipmentDataCollectionService {
  /**
   * Collect a single data point from equipment
   */
  static async collectDataPoint(
    input: CollectDataPointInput
  ): Promise<EquipmentDataCollectionRecord> {
    const {
      equipmentId,
      dataCollectionType,
      dataPointName,
      dataPointId,
      value,
      unitOfMeasure,
      quality,
      workOrderId,
      operationId,
      productionRunId,
      equipmentState,
      protocol,
      sourceAddress,
    } = input;

    // Validate equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new Error(`Equipment with ID ${equipmentId} not found`);
    }

    // Validate data value based on type
    const validation = EquipmentMessageBuilder.validateDataValue(value, dataCollectionType);
    if (!validation.valid) {
      throw new Error(`Invalid data value: ${validation.errors.join(', ')}`);
    }

    // Determine which field to use based on value type
    let numericValue: number | undefined;
    let stringValue: string | undefined;
    let booleanValue: boolean | undefined;
    let jsonValue: any | undefined;

    if (typeof value === 'number') {
      numericValue = value;
    } else if (typeof value === 'string') {
      stringValue = value;
    } else if (typeof value === 'boolean') {
      booleanValue = value;
    } else {
      jsonValue = value;
    }

    // Create data collection record
    const dataCollection = await prisma.equipmentDataCollection.create({
      data: {
        equipmentId,
        dataCollectionType,
        dataPointName,
        dataPointId,
        numericValue,
        stringValue,
        booleanValue,
        jsonValue,
        unitOfMeasure,
        quality: quality || 'GOOD',
        workOrderId,
        operationId,
        productionRunId,
        equipmentState,
        protocol,
        sourceAddress,
      },
    });

    return dataCollection as EquipmentDataCollectionRecord;
  }

  /**
   * Collect multiple data points in batch
   */
  static async collectDataPointsBatch(
    inputs: CollectDataPointInput[]
  ): Promise<{
    successful: EquipmentDataCollectionRecord[];
    failed: Array<{ input: CollectDataPointInput; error: string }>;
  }> {
    const successful: EquipmentDataCollectionRecord[] = [];
    const failed: Array<{ input: CollectDataPointInput; error: string }> = [];

    for (const input of inputs) {
      try {
        const result = await this.collectDataPoint(input);
        successful.push(result);
      } catch (error: any) {
        failed.push({
          input,
          error: error.message || 'Unknown error',
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Query data points with filters
   */
  static async queryDataPoints(
    query: QueryDataPointsInput
  ): Promise<EquipmentDataCollectionRecord[]> {
    const {
      equipmentId,
      dataPointName,
      dataCollectionType,
      workOrderId,
      startDate,
      endDate,
      limit,
    } = query;

    const where: any = {};

    if (equipmentId) {
      where.equipmentId = equipmentId;
    }

    if (dataPointName) {
      where.dataPointName = dataPointName;
    }

    if (dataCollectionType) {
      where.dataCollectionType = dataCollectionType;
    }

    if (workOrderId) {
      where.workOrderId = workOrderId;
    }

    if (startDate || endDate) {
      where.collectionTimestamp = {};
      if (startDate) {
        where.collectionTimestamp.gte = startDate;
      }
      if (endDate) {
        where.collectionTimestamp.lte = endDate;
      }
    }

    const dataPoints = await prisma.equipmentDataCollection.findMany({
      where,
      orderBy: { collectionTimestamp: 'desc' },
      take: limit || 100,
    });

    return dataPoints as EquipmentDataCollectionRecord[];
  }

  /**
   * Get latest data point for a specific data point name
   */
  static async getLatestDataPoint(
    equipmentId: string,
    dataPointName: string
  ): Promise<EquipmentDataCollectionRecord | null> {
    const dataPoint = await prisma.equipmentDataCollection.findFirst({
      where: {
        equipmentId,
        dataPointName,
      },
      orderBy: { collectionTimestamp: 'desc' },
    });

    return dataPoint as EquipmentDataCollectionRecord | null;
  }

  /**
   * Get all latest data points for equipment
   */
  static async getLatestDataPointsForEquipment(
    equipmentId: string
  ): Promise<EquipmentDataCollectionRecord[]> {
    // Get unique data point names
    const uniqueDataPoints = await prisma.equipmentDataCollection.findMany({
      where: { equipmentId },
      distinct: ['dataPointName'],
      select: { dataPointName: true },
    });

    const latestDataPoints: EquipmentDataCollectionRecord[] = [];

    for (const { dataPointName } of uniqueDataPoints) {
      const latest = await this.getLatestDataPoint(equipmentId, dataPointName);
      if (latest) {
        latestDataPoints.push(latest);
      }
    }

    return latestDataPoints;
  }

  /**
   * Generate data collection summary for equipment
   */
  static async generateDataCollectionSummary(
    equipmentId: string,
    dataCollectionType?: DataCollectionType,
    startDate?: Date,
    endDate?: Date
  ): Promise<DataCollectionSummary> {
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
    const where: any = { equipmentId };

    // Filter by dataCollectionType if provided
    if (dataCollectionType) {
      where.dataCollectionType = dataCollectionType;
    }

    if (startDate || endDate) {
      where.collectionTimestamp = {};
      if (startDate) {
        where.collectionTimestamp.gte = startDate;
      }
      if (endDate) {
        where.collectionTimestamp.lte = endDate;
      }
    }

    // Get total data points
    const totalDataPoints = await prisma.equipmentDataCollection.count({ where });

    // Get data points by type
    const dataPointsByType = await prisma.equipmentDataCollection.groupBy({
      by: ['dataCollectionType'],
      where,
      _count: {
        _all: true,
      },
    });

    const typeMap: Record<DataCollectionType, number> = {
      SENSOR: 0,
      ALARM: 0,
      EVENT: 0,
      MEASUREMENT: 0,
      STATUS: 0,
      PERFORMANCE: 0,
    };

    for (const group of dataPointsByType) {
      (typeMap as any)[(group as any).dataCollectionType] = (group._count as any)._all;
    }

    // Get latest and oldest data points
    const latestDataPoint = await prisma.equipmentDataCollection.findFirst({
      where,
      orderBy: { collectionTimestamp: 'desc' },
    });

    const oldestDataPoint = await prisma.equipmentDataCollection.findFirst({
      where,
      orderBy: { collectionTimestamp: 'asc' },
    });

    return {
      equipmentId: equipment.id,
      equipmentNumber: equipment.equipmentNumber,
      equipmentName: equipment.name,
      dataCollectionType: dataCollectionType || undefined,
      totalDataPoints,
      dataPointsByType: typeMap,
      latestDataPoint: latestDataPoint as EquipmentDataCollectionRecord | undefined,
      oldestDataPoint: oldestDataPoint as EquipmentDataCollectionRecord | undefined,
      period: {
        start: startDate || oldestDataPoint?.collectionTimestamp || new Date(),
        end: endDate || latestDataPoint?.collectionTimestamp || new Date(),
      },
    };
  }

  /**
   * Get data point trend (time series data)
   */
  static async getDataPointTrend(
    equipmentId: string,
    dataPointName: string,
    startDate: Date,
    endDate: Date,
    limit?: number
  ): Promise<{
    dataPointName: string;
    dataPoints: Array<{
      timestamp: Date;
      value: number | string | boolean | object;
      quality?: string;
    }>;
  }> {
    const dataPoints = await prisma.equipmentDataCollection.findMany({
      where: {
        equipmentId,
        dataPointName,
        collectionTimestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { collectionTimestamp: 'asc' },
      take: limit || 1000,
    });

    return {
      dataPointName,
      dataPoints: dataPoints.map((dp) => ({
        timestamp: dp.collectionTimestamp,
        value: dp.numericValue ?? dp.stringValue ?? dp.booleanValue ?? dp.jsonValue ?? '',
        quality: dp.quality || undefined,
      })),
    };
  }

  /**
   * Calculate statistics for numeric data point
   */
  static async calculateDataPointStatistics(
    equipmentId: string,
    dataPointName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    count: number;
    min?: number;
    max?: number;
    average?: number;
    stdDev?: number;
  }> {
    const where: any = {
      equipmentId,
      dataPointName,
      numericValue: { not: null },
    };

    if (startDate || endDate) {
      where.collectionTimestamp = {};
      if (startDate) {
        where.collectionTimestamp.gte = startDate;
      }
      if (endDate) {
        where.collectionTimestamp.lte = endDate;
      }
    }

    const dataPoints = await prisma.equipmentDataCollection.findMany({
      where,
      select: { numericValue: true },
    });

    if (dataPoints.length === 0) {
      return { count: 0 };
    }

    const values = dataPoints
      .map((dp) => dp.numericValue)
      .filter((v): v is number => v !== null);

    const count = values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;

    // Calculate standard deviation
    const squaredDiffs = values.map((val) => Math.pow(val - average, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      count,
      min,
      max,
      average,
      stdDev,
    };
  }

  /**
   * Delete old data points (data retention)
   */
  static async deleteOldDataPoints(
    beforeDate: Date
  ): Promise<{ deletedCount: number }> {
    const result = await prisma.equipmentDataCollection.deleteMany({
      where: {
        collectionTimestamp: {
          lt: beforeDate,
        },
      },
    });

    return { deletedCount: result.count };
  }

  /**
   * Get alarm events for equipment
   */
  static async getAlarmEvents(
    equipmentId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<EquipmentDataCollectionRecord[]> {
    const where: any = {
      equipmentId,
    };

    if (startDate || endDate) {
      where.collectionTimestamp = {};
      if (startDate) {
        where.collectionTimestamp.gte = startDate;
      }
      if (endDate) {
        where.collectionTimestamp.lte = endDate;
      }
    }

    const alarms = await prisma.equipmentDataCollection.findMany({
      where,
      orderBy: { collectionTimestamp: 'desc' },
      take: limit || 100,
    });

    return alarms as EquipmentDataCollectionRecord[];
  }

  /**
   * Get equipment status events
   */
  static async getStatusEvents(
    equipmentId: string,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  ): Promise<EquipmentDataCollectionRecord[]> {
    const where: any = {
      equipmentId,
    };

    if (startDate || endDate) {
      where.collectionTimestamp = {};
      if (startDate) {
        where.collectionTimestamp.gte = startDate;
      }
      if (endDate) {
        where.collectionTimestamp.lte = endDate;
      }
    }

    const statusEvents = await prisma.equipmentDataCollection.findMany({
      where,
      orderBy: { collectionTimestamp: 'desc' },
      take: limit || 100,
    });

    return statusEvents as EquipmentDataCollectionRecord[];
  }

  /**
   * Get data points for work order
   */
  static async getDataPointsForWorkOrder(
    workOrderId: string,
    dataCollectionType?: DataCollectionType
  ): Promise<EquipmentDataCollectionRecord[]> {
    const where: any = { workOrderId };

    if (dataCollectionType) {
      where.dataCollectionType = dataCollectionType;
    }

    const dataPoints = await prisma.equipmentDataCollection.findMany({
      where,
      orderBy: { collectionTimestamp: 'asc' },
    });

    return dataPoints as EquipmentDataCollectionRecord[];
  }

  /**
   * Get equipment utilization from data points
   */
  static async calculateEquipmentUtilization(
    equipmentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    utilizationPercentage: number;
    totalTime: number;
    runningTime: number;
    idleTime: number;
    downTime: number;
  }> {
    // Get all status events in the period
    const statusEvents = await this.getStatusEvents(equipmentId, startDate, endDate);

    let runningTime = 0;
    let idleTime = 0;
    let downTime = 0;

    for (let i = 0; i < statusEvents.length - 1; i++) {
      const currentEvent = statusEvents[i];
      const nextEvent = statusEvents[i + 1];

      const duration =
        nextEvent.collectionTimestamp.getTime() -
        currentEvent.collectionTimestamp.getTime();

      const state = currentEvent.stringValue || '';

      if (state.includes('RUNNING') || state.includes('ACTIVE')) {
        runningTime += duration;
      } else if (state.includes('IDLE') || state.includes('READY')) {
        idleTime += duration;
      } else {
        downTime += duration;
      }
    }

    const totalTime = endDate.getTime() - startDate.getTime();
    const utilizationPercentage = totalTime > 0 ? (runningTime / totalTime) * 100 : 0;

    return {
      utilizationPercentage,
      totalTime: totalTime / 1000, // Convert to seconds
      runningTime: runningTime / 1000,
      idleTime: idleTime / 1000,
      downTime: downTime / 1000,
    };
  }
}
