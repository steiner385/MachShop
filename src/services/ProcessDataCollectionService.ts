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

export class ProcessDataCollectionService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Start a new process data collection
   */
  async startProcessDataCollection(
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
    const equipment = await this.prisma.equipment.findUnique({
      where: { id: equipmentId },
    });

    if (!equipment) {
      throw new Error(`Equipment with ID ${equipmentId} not found`);
    }

    // Validate work order if provided
    if (workOrderId) {
      const workOrder = await this.prisma.workOrder.findUnique({
        where: { id: workOrderId },
      });

      if (!workOrder) {
        throw new Error(`Work order with ID ${workOrderId} not found`);
      }
    }

    // Create process data collection record
    const processData = await this.prisma.processDataCollection.create({
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
  async completeProcessDataCollection(
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
    const existingData = await this.prisma.processDataCollection.findUnique({
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
      ? { ...(existingData.parameters as any), ...additionalParameters }
      : existingData.parameters;

    // Update process data
    const updatedData = await this.prisma.processDataCollection.update({
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
  async updateProcessParameters(
    processDataCollectionId: string,
    parameters: Record<string, any>
  ): Promise<ProcessDataCollectionRecord> {
    const existingData = await this.prisma.processDataCollection.findUnique({
      where: { id: processDataCollectionId },
    });

    if (!existingData) {
      throw new Error(
        `Process data collection with ID ${processDataCollectionId} not found`
      );
    }

    // Merge parameters
    const mergedParameters = { ...(existingData.parameters as any), ...parameters };

    const updatedData = await this.prisma.processDataCollection.update({
      where: { id: processDataCollectionId },
      data: { parameters: mergedParameters },
    });

    return updatedData as ProcessDataCollectionRecord;
  }

  /**
   * Increment alarm counts
   */
  async incrementAlarmCount(
    processDataCollectionId: string,
    critical: boolean = false
  ): Promise<ProcessDataCollectionRecord> {
    const updateData: any = {
      alarmCount: { increment: 1 },
    };

    if (critical) {
      updateData.criticalAlarmCount = { increment: 1 };
    }

    const updatedData = await this.prisma.processDataCollection.update({
      where: { id: processDataCollectionId },
      data: updateData,
    });

    return updatedData as ProcessDataCollectionRecord;
  }

  /**
   * Query process data collections
   */
  async queryProcessData(
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

    const processData = await this.prisma.processDataCollection.findMany({
      where,
      orderBy: { startTimestamp: 'desc' },
      take: limit || 100,
    });

    return processData as ProcessDataCollectionRecord[];
  }

  /**
   * Get active (incomplete) process data collections for equipment
   */
  async getActiveProcesses(
    equipmentId: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await this.prisma.processDataCollection.findMany({
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
  async generateProcessSummary(
    equipmentId: string,
    processName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ProcessDataSummary> {
    // Get equipment details
    const equipment = await this.prisma.equipment.findUnique({
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
    const processes = await this.prisma.processDataCollection.findMany({
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
  async getProcessParameterTrend(
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

    const processes = await this.prisma.processDataCollection.findMany({
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
  async getProcessDataForWorkOrder(
    workOrderId: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await this.prisma.processDataCollection.findMany({
      where: { workOrderId },
      orderBy: { startTimestamp: 'asc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Get process data by serial number
   */
  async getProcessDataBySerialNumber(
    serialNumber: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await this.prisma.processDataCollection.findMany({
      where: { serialNumber },
      orderBy: { startTimestamp: 'asc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Get process data by lot number
   */
  async getProcessDataByLotNumber(
    lotNumber: string
  ): Promise<ProcessDataCollectionRecord[]> {
    const processes = await this.prisma.processDataCollection.findMany({
      where: { lotNumber },
      orderBy: { startTimestamp: 'asc' },
    });

    return processes as ProcessDataCollectionRecord[];
  }

  /**
   * Delete old process data (data retention)
   */
  async deleteOldProcessData(
    beforeDate: Date
  ): Promise<{ deletedCount: number }> {
    const result = await this.prisma.processDataCollection.deleteMany({
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
  async getProcessDataById(
    processDataCollectionId: string
  ): Promise<ProcessDataCollectionRecord | null> {
    const processData = await this.prisma.processDataCollection.findUnique({
      where: { id: processDataCollectionId },
    });

    return processData as ProcessDataCollectionRecord | null;
  }

  /**
   * Evaluate SPC for collected parameter data
   * Automatically called when parameter measurements are recorded
   *
   * @param parameterId - Operation parameter ID
   * @param value - Measured value
   * @param timestamp - Measurement timestamp
   * @param processDataCollectionId - Optional process data collection record ID
   * @returns Array of rule violations detected (if any)
   */
  async evaluateSPCForParameter(
    parameterId: string,
    value: number,
    timestamp: Date,
    processDataCollectionId?: string
  ): Promise<any[]> {
    try {
      // Check if parameter has active SPC configuration
      const spcConfig = await this.prisma.sPCConfiguration.findUnique({
        where: { parameterId },
      });

      if (!spcConfig || !spcConfig.isActive) {
        // No active SPC configuration for this parameter
        return [];
      }

      // Get historical data for this parameter (for control limit calculation and rule evaluation)
      const historicalDataDays = 30; // Default lookback period
      const since = new Date();
      since.setDate(since.getDate() - historicalDataDays);

      // Query historical measurements from process data collections
      // Note: This is a simplified approach. In production, you'd want a dedicated
      // measurement tracking table for better performance
      const historicalRecords = await this.prisma.processDataCollection.findMany({
        where: {
          startTimestamp: {
            gte: since,
          },
        },
        orderBy: {
          startTimestamp: 'asc',
        },
        take: 100, // Limit to most recent 100 records
      });

      // Extract parameter values from historical records
      // This assumes parameters are stored in JSON format
      const historicalValues: number[] = [];
      for (const record of historicalRecords) {
        const params = record.parameters as any;
        if (params && typeof params[parameterId] === 'number') {
          historicalValues.push(params[parameterId]);
        }
      }

      // Add current value
      historicalValues.push(value);

      if (historicalValues.length < 5) {
        // Not enough data for SPC evaluation
        console.log(
          `Insufficient data for SPC evaluation on parameter ${parameterId}: ${historicalValues.length} points`
        );
        return [];
      }

      // Calculate control limits based on chart type
      // Import SPC service (lazy import to avoid circular dependencies)
      const { spcService } = await import('./SPCService');
      const { westernElectricRulesEngine } = await import(
        './WesternElectricRulesEngine'
      );

      let limits: any;

      if (spcConfig.chartType === 'I_MR') {
        // Individual and Moving Range chart
        limits = await spcService.calculateIMRLimits(historicalValues);
      } else {
        // For other chart types, would need subgroup data
        // Simplified: Use I-MR as fallback
        limits = await spcService.calculateIMRLimits(historicalValues);
      }

      // Evaluate Western Electric Rules
      const enabledRules = (spcConfig.enabledRules as any) || [1, 2, 3, 4, 5, 6, 7, 8];
      const sensitivity = (spcConfig.ruleSensitivity as any) || 'NORMAL';

      const violations = westernElectricRulesEngine.evaluateRules(
        historicalValues,
        limits,
        enabledRules,
        sensitivity
      );

      // Persist violations to database
      const createdViolations = [];
      for (const violation of violations) {
        // Check if this is a new violation for the current data point
        if (violation.dataPointIndices.includes(historicalValues.length - 1)) {
          const createdViolation = await this.prisma.sPCRuleViolation.create({
            data: {
              configurationId: spcConfig.id,
              ruleNumber: violation.ruleNumber,
              ruleName: violation.ruleName,
              severity: violation.severity,
              value,
              timestamp,
              UCL: limits.UCL,
              LCL: limits.LCL,
              centerLine: limits.centerLine,
              acknowledged: false,
            },
          });

          createdViolations.push(createdViolation);

          // Log violation
          console.log(
            `SPC Violation Detected - Parameter: ${parameterId}, Rule ${violation.ruleNumber}: ${violation.description}, Severity: ${violation.severity}`
          );
        }
      }

      return createdViolations;
    } catch (error) {
      console.error(`Error evaluating SPC for parameter ${parameterId}:`, error);
      return [];
    }
  }

  /**
   * Evaluate SPC for all parameters in a process data collection
   *
   * @param processDataCollectionId - Process data collection record ID
   * @returns Summary of SPC evaluation results
   */
  async evaluateSPCForProcessData(
    processDataCollectionId: string
  ): Promise<{
    evaluatedParameters: number;
    totalViolations: number;
    criticalViolations: number;
    violations: any[];
  }> {
    const processData = await this.prisma.processDataCollection.findUnique({
      where: { id: processDataCollectionId },
    });

    if (!processData) {
      throw new Error(
        `Process data collection with ID ${processDataCollectionId} not found`
      );
    }

    const parameters = processData.parameters as any;
    if (!parameters || typeof parameters !== 'object') {
      return {
        evaluatedParameters: 0,
        totalViolations: 0,
        criticalViolations: 0,
        violations: [],
      };
    }

    const allViolations: any[] = [];
    let evaluatedCount = 0;

    // Evaluate each parameter
    for (const [paramId, value] of Object.entries(parameters)) {
      if (typeof value === 'number') {
        const violations = await this.evaluateSPCForParameter(
          paramId,
          value,
          processData.startTimestamp,
          processDataCollectionId
        );

        allViolations.push(...violations);
        if (violations.length > 0) {
          evaluatedCount++;
        }
      }
    }

    const criticalCount = allViolations.filter((v) => v.severity === 'CRITICAL').length;

    return {
      evaluatedParameters: evaluatedCount,
      totalViolations: allViolations.length,
      criticalViolations: criticalCount,
      violations: allViolations,
    };
  }

  /**
   * Get SPC violations for a parameter
   *
   * @param parameterId - Operation parameter ID
   * @param acknowledged - Filter by acknowledgement status
   * @param limit - Maximum number of violations to return
   * @returns Array of SPC rule violations
   */
  async getSPCViolationsForParameter(
    parameterId: string,
    acknowledged?: boolean,
    limit: number = 50
  ): Promise<any[]> {
    // Get SPC configuration for parameter
    const spcConfig = await this.prisma.sPCConfiguration.findUnique({
      where: { parameterId },
    });

    if (!spcConfig) {
      return [];
    }

    const where: any = {
      configurationId: spcConfig.id,
    };

    if (acknowledged !== undefined) {
      where.acknowledged = acknowledged;
    }

    const violations = await this.prisma.sPCRuleViolation.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });

    return violations;
  }

  /**
   * Acknowledge an SPC rule violation
   *
   * @param violationId - Violation ID
   * @param acknowledgedBy - User who acknowledged the violation
   * @param resolution - Resolution description
   * @returns Updated violation record
   */
  async acknowledgeSPCViolation(
    violationId: string,
    acknowledgedBy: string,
    resolution: string
  ): Promise<any> {
    const violation = await this.prisma.sPCRuleViolation.update({
      where: { id: violationId },
      data: {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
        resolution,
      },
    });

    return violation;
  }
}
