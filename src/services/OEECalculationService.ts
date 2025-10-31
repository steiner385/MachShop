import { EquipmentPerformanceLog, PerformancePeriodType, EquipmentState } from '@prisma/client';
import prisma from '../lib/database';

export interface OEEMetrics {
  availability: number; // 0-100%
  performance: number; // 0-100%
  quality: number; // 0-100%
  oee: number; // 0-100%
  teep?: number; // Total Effective Equipment Performance
  utilizationRate?: number; // 0-100%
}

export interface OEECalculationInput {
  equipmentId: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: PerformancePeriodType;
  // Availability inputs
  plannedProductionTime: number; // Seconds
  // Performance inputs
  idealCycleTime?: number; // Seconds per unit
  totalUnitsProduced: number;
  targetProduction?: number;
  // Quality inputs
  goodUnits: number;
  rejectedUnits: number;
  scrapUnits: number;
  reworkUnits: number;
  // Optional context
  workOrderId?: string;
  partId?: string;
  operatorId?: string;
  notes?: string;
}

export interface OEEPeriodQuery {
  equipmentId: string;
  periodType?: PerformancePeriodType;
  from?: Date;
  to?: Date;
  limit?: number;
}

class OEECalculationService {
  /**
   * Calculate OEE metrics from raw data
   */
  calculateOEE(
    plannedProductionTime: number,
    operatingTime: number,
    downtime: number,
    idealCycleTime: number | undefined,
    actualCycleTime: number | undefined,
    totalUnitsProduced: number,
    targetProduction: number | undefined,
    goodUnits: number,
    totalUnits: number
  ): OEEMetrics {
    // Availability = (Operating Time / Planned Production Time) × 100%
    const availability = plannedProductionTime > 0
      ? (operatingTime / plannedProductionTime) * 100
      : 0;

    // Performance calculation
    let performance = 0;
    if (idealCycleTime && totalUnitsProduced > 0 && operatingTime > 0) {
      // Performance = (Ideal Cycle Time × Total Count / Operating Time) × 100%
      performance = ((idealCycleTime * totalUnitsProduced) / operatingTime) * 100;
    } else if (targetProduction && targetProduction > 0) {
      // Alternative: Performance = (Actual Production / Target Production) × 100%
      performance = (totalUnitsProduced / targetProduction) * 100;
    } else if (actualCycleTime && idealCycleTime && actualCycleTime > 0) {
      // Alternative: Performance = (Ideal Cycle Time / Actual Cycle Time) × 100%
      performance = (idealCycleTime / actualCycleTime) * 100;
    }

    // Cap performance at 100%
    performance = Math.min(performance, 100);

    // Quality = (Good Units / Total Units) × 100%
    const quality = totalUnits > 0 ? (goodUnits / totalUnits) * 100 : 0;

    // OEE = Availability × Performance × Quality (as percentages)
    const oee = (availability * performance * quality) / 10000; // Divide by 10000 because we're multiplying percentages

    // TEEP = OEE × (Planned Production Time / All Time)
    // For now, we'll calculate TEEP as OEE (can be enhanced with calendar time tracking)
    const teep = oee;

    // Utilization Rate = (Operating Time + Downtime) / Planned Production Time
    const utilizationRate = plannedProductionTime > 0
      ? ((operatingTime + downtime) / plannedProductionTime) * 100
      : 0;

    return {
      availability: Math.round(availability * 10) / 10, // Round to 1 decimal
      performance: Math.round(performance * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      oee: Math.round(oee * 10) / 10,
      teep: Math.round(teep * 10) / 10,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
    };
  }

  /**
   * Calculate and store OEE performance log
   */
  async recordOEEPerformance(input: OEECalculationInput): Promise<EquipmentPerformanceLog> {
    const { equipmentId, periodStart, periodEnd, plannedProductionTime } = input;

    // Get state history for the period to calculate operating time and downtime
    const stateHistory = await prisma.equipmentStateHistory.findMany({
      where: {
        equipmentId,
        OR: [
          {
            AND: [
              { stateStartTime: { gte: periodStart } },
              { stateStartTime: { lte: periodEnd } },
            ],
          },
          {
            AND: [
              { stateStartTime: { lte: periodStart } },
              {
                OR: [
                  { stateEndTime: { gte: periodStart } },
                  { stateEndTime: null },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { stateStartTime: 'asc' },
    });

    // Calculate operating time and downtime from state history
    let operatingTime = 0;
    let downtime = 0;

    for (const state of stateHistory) {
      const stateStart = state.stateStartTime > periodStart ? state.stateStartTime : periodStart;
      const stateEnd = (state.stateEndTime && state.stateEndTime < periodEnd)
        ? state.stateEndTime
        : periodEnd;

      const duration = Math.floor((stateEnd.getTime() - stateStart.getTime()) / 1000);

      if (state.newState === EquipmentState.RUNNING) {
        operatingTime += duration;
      } else if (state.downtime) {
        downtime += duration;
      }
    }

    // Calculate actual cycle time if we have the data
    const actualCycleTime = input.totalUnitsProduced > 0 && operatingTime > 0
      ? operatingTime / input.totalUnitsProduced
      : undefined;

    // Calculate total units (all produced units including good, rejected, scrap)
    const totalUnits = input.goodUnits + input.rejectedUnits + input.scrapUnits;

    // Calculate OEE metrics
    const metrics = this.calculateOEE(
      plannedProductionTime,
      operatingTime,
      downtime,
      input.idealCycleTime,
      actualCycleTime,
      input.totalUnitsProduced,
      input.targetProduction,
      input.goodUnits,
      totalUnits
    );

    // Detect anomalies (OEE > 100% or any metric > 100%)
    const hasAnomalies =
      metrics.oee > 100 ||
      metrics.availability > 100 ||
      metrics.performance > 100 ||
      metrics.quality > 100;

    // Store performance log
    return prisma.equipmentPerformanceLog.create({
      data: {
        equipmentId,
        periodStart,
        periodEnd,
        periodType: input.periodType,
        plannedProductionTime,
        operatingTime,
        downtime,
        availability: metrics.availability,
        idealCycleTime: input.idealCycleTime,
        actualCycleTime,
        totalUnitsProduced: input.totalUnitsProduced,
        targetProduction: input.targetProduction,
        performance: metrics.performance,
        goodUnits: input.goodUnits,
        rejectedUnits: input.rejectedUnits,
        scrapUnits: input.scrapUnits,
        reworkUnits: input.reworkUnits,
        quality: metrics.quality,
        oee: metrics.oee,
        workOrderId: input.workOrderId,
        partId: input.partId,
        operatorId: input.operatorId,
        teep: metrics.teep,
        utilizationRate: metrics.utilizationRate,
        notes: input.notes,
        hasAnomalies,
      },
    });
  }

  /**
   * Get OEE performance logs for equipment
   */
  async getOEEPerformance(query: OEEPeriodQuery): Promise<EquipmentPerformanceLog[]> {
    const where: any = { equipmentId: query.equipmentId };

    if (query.periodType) {
      where.periodType = query.periodType;
    }

    if (query.from || query.to) {
      where.periodStart = {};
      if (query.from) where.periodStart.gte = query.from;
      if (query.to) where.periodStart.lte = query.to;
    }

    return prisma.equipmentPerformanceLog.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: query.limit || 100,
    });
  }

  /**
   * Get current/latest OEE for equipment
   */
  async getCurrentOEE(equipmentId: string): Promise<EquipmentPerformanceLog | null> {
    return prisma.equipmentPerformanceLog.findFirst({
      where: { equipmentId },
      orderBy: { periodEnd: 'desc' },
    });
  }

  /**
   * Calculate OEE from state history for a period
   * (Automatic calculation without manual input)
   */
  async calculateOEEFromHistory(
    equipmentId: string,
    periodStart: Date,
    periodEnd: Date,
    periodType: PerformancePeriodType,
    plannedProductionTime: number,
    idealCycleTime?: number
  ): Promise<OEEMetrics> {
    const stateHistory = await prisma.equipmentStateHistory.findMany({
      where: {
        equipmentId,
        OR: [
          {
            AND: [
              { stateStartTime: { gte: periodStart } },
              { stateStartTime: { lte: periodEnd } },
            ],
          },
          {
            AND: [
              { stateStartTime: { lte: periodStart } },
              {
                OR: [
                  { stateEndTime: { gte: periodStart } },
                  { stateEndTime: null },
                ],
              },
            ],
          },
        ],
      },
      orderBy: { stateStartTime: 'asc' },
    });

    let operatingTime = 0;
    let downtime = 0;
    let unitsProduced = 0; // Would need to be tracked separately

    for (const state of stateHistory) {
      const stateStart = state.stateStartTime > periodStart ? state.stateStartTime : periodStart;
      const stateEnd = (state.stateEndTime && state.stateEndTime < periodEnd)
        ? state.stateEndTime
        : periodEnd;

      const duration = Math.floor((stateEnd.getTime() - stateStart.getTime()) / 1000);

      if (state.newState === EquipmentState.RUNNING) {
        operatingTime += duration;
      } else if (state.downtime) {
        downtime += duration;
      }
    }

    // For automatic calculation, we estimate units produced from operating time and cycle time
    if (idealCycleTime && idealCycleTime > 0) {
      unitsProduced = Math.floor(operatingTime / idealCycleTime);
    }

    const actualCycleTime = unitsProduced > 0 ? operatingTime / unitsProduced : undefined;

    return this.calculateOEE(
      plannedProductionTime,
      operatingTime,
      downtime,
      idealCycleTime,
      actualCycleTime,
      unitsProduced,
      undefined,
      unitsProduced, // Assume all good for automatic calculation
      unitsProduced
    );
  }

  /**
   * Get aggregated OEE for multiple periods
   */
  async getAggregatedOEE(
    equipmentId: string,
    periodType: PerformancePeriodType,
    from: Date,
    to: Date
  ): Promise<{
    periods: EquipmentPerformanceLog[];
    average: OEEMetrics;
    best: EquipmentPerformanceLog | null;
    worst: EquipmentPerformanceLog | null;
  }> {
    const periods = await this.getOEEPerformance({
      equipmentId,
      periodType,
      from,
      to,
    });

    if (periods.length === 0) {
      return {
        periods: [],
        average: { availability: 0, performance: 0, quality: 0, oee: 0 },
        best: null,
        worst: null,
      };
    }

    // Calculate averages
    const totals = periods.reduce(
      (acc, period) => ({
        availability: acc.availability + period.availability,
        performance: acc.performance + period.performance,
        quality: acc.quality + period.quality,
        oee: acc.oee + period.oee,
      }),
      { availability: 0, performance: 0, quality: 0, oee: 0 }
    );

    const count = periods.length;
    const average: OEEMetrics = {
      availability: Math.round((totals.availability / count) * 10) / 10,
      performance: Math.round((totals.performance / count) * 10) / 10,
      quality: Math.round((totals.quality / count) * 10) / 10,
      oee: Math.round((totals.oee / count) * 10) / 10,
    };

    // Find best and worst periods
    const best = periods.reduce((max, period) =>
      period.oee > max.oee ? period : max
    , periods[0]);

    const worst = periods.reduce((min, period) =>
      period.oee < min.oee ? period : min
    , periods[0]);

    return { periods, average, best, worst };
  }

  /**
   * Update equipment's OEE fields based on latest performance
   */
  async updateEquipmentOEE(equipmentId: string): Promise<void> {
    const latestOEE = await this.getCurrentOEE(equipmentId);

    if (latestOEE) {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: {
          availability: latestOEE.availability,
          performance: latestOEE.performance,
          quality: latestOEE.quality,
          oee: latestOEE.oee,
          utilizationRate: latestOEE.utilizationRate || 0,
        },
      });
    }
  }
}

export default new OEECalculationService();
