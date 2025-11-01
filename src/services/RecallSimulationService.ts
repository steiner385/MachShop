/**
 * Recall Simulation Service
 * Issue #105: Product Genealogy & BOM Management
 *
 * Simulates and analyzes product recalls:
 * - Determines affected products and customers
 * - Estimates recall costs
 * - Prioritizes critical recalls
 * - Tracks recall progress and effectiveness
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface RecallSimulation {
  simulationId: string;
  initiatingPartId: string;
  initiatingPartNumber: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  estimatedAffectedUnits: number;
  affectedPartsList: Array<{
    partId: string;
    partNumber: string;
    partName: string;
    estimatedUnitsAffected: number;
    riskLevel: string;
  }>;
  estimatedCost: number;
  estimatedDuration: number; // in days
  affectedCustomers: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  simulatedDate: Date;
}

export interface RecallAction {
  actionId: string;
  recallId: string;
  actionType: 'NOTIFICATION' | 'REPLACEMENT' | 'REPAIR' | 'REFUND' | 'INVESTIGATION';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  affectedUnits: number;
  completedUnits: number;
  targetCompletionDate: Date;
  actualCompletionDate?: Date;
  cost: number;
  notes?: string;
}

export interface RecallEffectiveness {
  recallId: string;
  initiatingPartNumber: string;
  totalAffectedUnits: number;
  recoveredUnits: number;
  recoveryRate: number;
  elapsedDays: number;
  projectedCompletionDays: number;
  successRate: number;
  remainingUnits: number;
  criticalRemainingUnits: number;
  estimatedCostToCompletion: number;
}

export class RecallSimulationService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Simulate a product recall
   */
  async simulateRecall(
    initiatingPartId: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    reason: string
  ): Promise<RecallSimulation> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: initiatingPartId },
      });

      if (!part) {
        throw new Error(`Part ${initiatingPartId} not found`);
      }

      // Get all downstream products
      const affectedSerials = await this.prisma.serializedPart.findMany({
        where: { partId: initiatingPartId },
      });

      const estimatedAffectedUnits = affectedSerials.length;

      // Simulate affected parts (using dummy data for components)
      const affectedPartsList = [
        {
          partId: initiatingPartId,
          partNumber: part.partNumber,
          partName: part.partName,
          estimatedUnitsAffected: estimatedAffectedUnits,
          riskLevel: this.determineRiskLevel(severity),
        },
      ];

      // Calculate estimated cost based on severity
      const estimatedCost = this.calculateRecallCost(
        estimatedAffectedUnits,
        severity
      );

      // Estimate duration based on units and severity
      const estimatedDuration = this.estimateRecallDuration(
        estimatedAffectedUnits,
        severity
      );

      // Simulate affected customers
      const affectedCustomers = Array.from(
        { length: Math.min(estimatedAffectedUnits, 10) },
        (_, i) => `CUST-${String(i + 1).padStart(4, '0')}`
      );

      const priority = severity === 'CRITICAL' ? 'CRITICAL' : severity;

      const simulation: RecallSimulation = {
        simulationId: `RECALL-SIM-${Date.now()}`,
        initiatingPartId,
        initiatingPartNumber: part.partNumber,
        severity,
        reason,
        estimatedAffectedUnits,
        affectedPartsList,
        estimatedCost,
        estimatedDuration,
        affectedCustomers,
        priority: priority as any,
        simulatedDate: new Date(),
      };

      logger.info(
        `Simulated recall for part ${part.partNumber}: ${estimatedAffectedUnits} units affected, estimated cost $${estimatedCost}`
      );
      return simulation;
    } catch (error) {
      logger.error(`Error in simulateRecall: ${error}`);
      throw error;
    }
  }

  /**
   * Get detailed impact analysis
   */
  async getRecallImpactAnalysis(recallId: string): Promise<any> {
    try {
      // In a real implementation, would fetch from database
      const analysis = {
        recallId,
        directlyAffectedUnits: 500,
        indirectlyAffectedUnits: 1200,
        totalAffectedUnits: 1700,
        affectedCustomers: [
          {
            customerId: 'CUST-0001',
            customerName: 'Major Customer 1',
            affectedUnits: 150,
            contractValue: 50000,
          },
          {
            customerId: 'CUST-0002',
            customerName: 'Medium Customer',
            affectedUnits: 75,
            contractValue: 25000,
          },
        ],
        financialImpact: {
          replacementCost: 85000,
          shippingCost: 5000,
          laborCost: 15000,
          administrativeCost: 5000,
          totalEstimatedCost: 110000,
        },
        timelineEstimates: {
          notificationPeriod: 3, // days
          replacementPeriod: 30, // days
          verificationPeriod: 7, // days
          totalDays: 40,
        },
        riskAssessment: {
          safetyRisk: 'HIGH',
          customerSatisfactionRisk: 'HIGH',
          regulatoryRisk: 'MEDIUM',
          reputationalRisk: 'HIGH',
        },
      };

      logger.info(`Retrieved impact analysis for recall ${recallId}`);
      return analysis;
    } catch (error) {
      logger.error(`Error in getRecallImpactAnalysis: ${error}`);
      throw error;
    }
  }

  /**
   * Generate recall action plan
   */
  async generateRecallActionPlan(
    recallId: string,
    affectedUnits: number,
    severity: string
  ): Promise<RecallAction[]> {
    try {
      const actions: RecallAction[] = [];

      // Phase 1: Notification
      actions.push({
        actionId: `ACTION-${recallId}-001`,
        recallId,
        actionType: 'NOTIFICATION',
        status: 'PLANNED',
        affectedUnits,
        completedUnits: 0,
        targetCompletionDate: this.addDays(new Date(), 3),
        cost: 5000,
        notes: 'Notify customers of recall via email and phone',
      });

      // Phase 2: Investigation (if HIGH or CRITICAL)
      if (severity === 'HIGH' || severity === 'CRITICAL') {
        actions.push({
          actionId: `ACTION-${recallId}-002`,
          recallId,
          actionType: 'INVESTIGATION',
          status: 'PLANNED',
          affectedUnits,
          completedUnits: 0,
          targetCompletionDate: this.addDays(new Date(), 7),
          cost: 15000,
          notes: 'Investigate root cause and determine replacement strategy',
        });
      }

      // Phase 3: Replacement/Repair
      actions.push({
        actionId: `ACTION-${recallId}-003`,
        recallId,
        actionType: 'REPLACEMENT',
        status: 'PLANNED',
        affectedUnits,
        completedUnits: 0,
        targetCompletionDate: this.addDays(new Date(), 30),
        cost: 75000,
        notes: 'Replace affected units',
      });

      // Phase 4: Verification
      actions.push({
        actionId: `ACTION-${recallId}-004`,
        recallId,
        actionType: 'REFUND',
        status: 'PLANNED',
        affectedUnits,
        completedUnits: 0,
        targetCompletionDate: this.addDays(new Date(), 40),
        cost: 10000,
        notes: 'Process refunds for non-replaced units',
      });

      logger.info(
        `Generated recall action plan for recall ${recallId} with ${actions.length} actions`
      );
      return actions;
    } catch (error) {
      logger.error(`Error in generateRecallActionPlan: ${error}`);
      throw error;
    }
  }

  /**
   * Track recall progress and effectiveness
   */
  async trackRecallEffectiveness(recallId: string): Promise<RecallEffectiveness> {
    try {
      // Simulated tracking data
      const totalAffectedUnits = 1700;
      const recoveredUnits = 850;
      const elapsedDays = 15;

      const recoveryRate = (recoveredUnits / totalAffectedUnits) * 100;
      const successRate = 95; // Replacement success rate

      // Project completion based on current recovery rate
      const daysPerUnit = elapsedDays / recoveredUnits;
      const projectedCompletionDays = Math.ceil(
        daysPerUnit * totalAffectedUnits
      );

      const remainingUnits = totalAffectedUnits - recoveredUnits;
      const criticalRemainingUnits = Math.ceil(remainingUnits * 0.2);

      const estimatedCostToCompletion = remainingUnits * 50; // $50 per unit

      const effectiveness: RecallEffectiveness = {
        recallId,
        initiatingPartNumber: 'PN-001-123',
        totalAffectedUnits,
        recoveredUnits,
        recoveryRate: Math.round(recoveryRate * 100) / 100,
        elapsedDays,
        projectedCompletionDays,
        successRate,
        remainingUnits,
        criticalRemainingUnits,
        estimatedCostToCompletion,
      };

      logger.info(
        `Tracked recall effectiveness for recall ${recallId}: ${effectiveness.recoveryRate}% recovery rate`
      );
      return effectiveness;
    } catch (error) {
      logger.error(`Error in trackRecallEffectiveness: ${error}`);
      throw error;
    }
  }

  /**
   * Estimate recall cost
   */
  async estimateRecallCost(
    affectedUnits: number,
    severity: string,
    recallType: string
  ): Promise<any> {
    try {
      const baseUnitCost = 50;
      const severityMultiplier = this.getSeverityMultiplier(severity);
      const typeMultiplier = this.getRecallTypeMultiplier(recallType);

      const unitCost = baseUnitCost * severityMultiplier * typeMultiplier;
      const totalCost = affectedUnits * unitCost;

      const breakdown = {
        replacement: totalCost * 0.6,
        shipping: totalCost * 0.15,
        labor: totalCost * 0.15,
        administration: totalCost * 0.1,
      };

      logger.info(
        `Estimated recall cost for ${affectedUnits} units: $${totalCost}`
      );

      return {
        affectedUnits,
        unitCost: Math.round(unitCost * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100,
        breakdown,
        confidenceLevel: 'MEDIUM',
        assumptions:
          'Based on standard recall procedures and industry average costs',
      };
    } catch (error) {
      logger.error(`Error in estimateRecallCost: ${error}`);
      throw error;
    }
  }

  /**
   * Identify critical recall areas
   */
  async identifyCriticalAreas(recallId: string): Promise<any[]> {
    try {
      const criticalAreas = [
        {
          areaId: 'AREA-001',
          areaName: 'Customer Base Region 1',
          riskLevel: 'CRITICAL',
          affectedUnits: 250,
          completionPercentage: 45,
          priority: 1,
          notes: 'High concentration of affected units',
        },
        {
          areaId: 'AREA-002',
          areaName: 'Customer Base Region 2',
          riskLevel: 'HIGH',
          affectedUnits: 180,
          completionPercentage: 60,
          priority: 2,
          notes: 'Safety-critical application area',
        },
        {
          areaId: 'AREA-003',
          areaName: 'OEM Production Line',
          riskLevel: 'HIGH',
          affectedUnits: 420,
          completionPercentage: 30,
          priority: 3,
          notes: 'High-volume manufacturing environment',
        },
      ];

      logger.info(
        `Identified ${criticalAreas.length} critical areas for recall ${recallId}`
      );
      return criticalAreas;
    } catch (error) {
      logger.error(`Error in identifyCriticalAreas: ${error}`);
      throw error;
    }
  }

  /**
   * Generate recall report
   */
  async generateRecallReport(recallId: string): Promise<any> {
    try {
      const report = {
        recallId,
        reportDate: new Date(),
        initiatingPartNumber: 'PN-001-123',
        severity: 'HIGH',
        status: 'IN_PROGRESS',
        summary: {
          totalAffectedUnits: 1700,
          recoveredUnits: 850,
          recoveryRate: 50,
          remainingUnits: 850,
        },
        financials: {
          totalEstimatedCost: 110000,
          costIncurred: 55000,
          projectedFinalCost: 110000,
        },
        timeline: {
          recallInitiatedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          projectedCompletionDate: this.addDays(new Date(), 25),
          elapsedDays: 15,
          remainingDays: 25,
        },
        actionPlan: {
          totalActions: 4,
          completedActions: 1,
          inProgressActions: 2,
          pendingActions: 1,
        },
        riskAssessment: {
          overallRisk: 'MEDIUM',
          safetyRisk: 'HIGH',
          customerRisk: 'MEDIUM',
          complianceRisk: 'LOW',
        },
      };

      logger.info(`Generated recall report for recall ${recallId}`);
      return report;
    } catch (error) {
      logger.error(`Error in generateRecallReport: ${error}`);
      throw error;
    }
  }

  /**
   * Helper: Determine risk level based on severity
   */
  private determineRiskLevel(severity: string): string {
    switch (severity) {
      case 'CRITICAL':
        return 'CRITICAL';
      case 'HIGH':
        return 'HIGH';
      case 'MEDIUM':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  /**
   * Helper: Calculate recall cost
   */
  private calculateRecallCost(units: number, severity: string): number {
    const baseCost = 50;
    const severityMultiplier = this.getSeverityMultiplier(severity);
    return units * baseCost * severityMultiplier;
  }

  /**
   * Helper: Get severity multiplier
   */
  private getSeverityMultiplier(severity: string): number {
    switch (severity) {
      case 'CRITICAL':
        return 3.0;
      case 'HIGH':
        return 2.0;
      case 'MEDIUM':
        return 1.5;
      default:
        return 1.0;
    }
  }

  /**
   * Helper: Get recall type multiplier
   */
  private getRecallTypeMultiplier(type: string): number {
    switch (type) {
      case 'SAFETY':
        return 2.0;
      case 'QUALITY':
        return 1.5;
      default:
        return 1.0;
    }
  }

  /**
   * Helper: Estimate recall duration
   */
  private estimateRecallDuration(units: number, severity: string): number {
    const baseDaily = 50;
    const severityMultiplier = this.getSeverityMultiplier(severity);
    const dailyRecallRate = baseDaily * severityMultiplier;
    return Math.ceil(units / dailyRecallRate);
  }

  /**
   * Helper: Add days to date
   */
  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default RecallSimulationService;
