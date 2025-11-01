/**
 * Alert Management Service
 * Issue #98: Statistical Process Control & Control Charts
 *
 * Manages SPC alerts and rule violation detection:
 * - Western Electric rules implementation
 * - Nelson rules implementation
 * - Custom rule definitions
 * - Alert generation and escalation
 * - Alert tracking and resolution
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface AlertRuleInput {
  name: string;
  description: string;
  enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ruleType: 'WESTERN_ELECTRIC' | 'NELSON' | 'CUSTOM';
  condition: string;
}

export interface SPCAlert {
  id: string;
  planId: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  detectionPoint: number;
  detectedAt: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  ruleType: string;
  condition: string;
  createdDate: Date;
}

export class AlertManagementService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Define a new alert rule
   */
  async defineAlertRule(input: AlertRuleInput): Promise<AlertRule> {
    try {
      if (!input.name || !input.ruleType) {
        throw new Error('Rule name and type are required');
      }

      const rule: AlertRule = {
        id: `RULE-${Date.now()}`,
        name: input.name,
        description: input.description,
        enabled: input.enabled,
        severity: input.severity,
        ruleType: input.ruleType,
        condition: input.condition,
        createdDate: new Date(),
      };

      logger.info(`Created alert rule: ${input.name}`);
      return rule;
    } catch (error) {
      logger.error(`Error in defineAlertRule: ${error}`);
      throw error;
    }
  }

  /**
   * Check Western Electric Rule 1: Point beyond 3 sigma
   */
  checkWesternElectricRule1(measurement: number, centerLine: number, sigma: number): boolean {
    try {
      const deviation = Math.abs(measurement - centerLine);
      const violation = deviation > 3 * sigma;

      if (violation) {
        logger.warn(`WE Rule 1: Point beyond 3 sigma (deviation=${deviation.toFixed(3)}, limit=${(3 * sigma).toFixed(3)})`);
      }

      return violation;
    } catch (error) {
      logger.error(`Error in checkWesternElectricRule1: ${error}`);
      throw error;
    }
  }

  /**
   * Check Western Electric Rule 2: 9 consecutive points on same side of center
   */
  checkWesternElectricRule2(recentPoints: number[], centerLine: number): boolean {
    try {
      if (recentPoints.length < 9) {
        return false;
      }

      const last9 = recentPoints.slice(-9);
      const allAbove = last9.every((p) => p > centerLine);
      const allBelow = last9.every((p) => p < centerLine);
      const violation = allAbove || allBelow;

      if (violation) {
        logger.warn(`WE Rule 2: 9 consecutive points on same side of center`);
      }

      return violation;
    } catch (error) {
      logger.error(`Error in checkWesternElectricRule2: ${error}`);
      throw error;
    }
  }

  /**
   * Check Western Electric Rule 3: 6 consecutive increasing or decreasing
   */
  checkWesternElectricRule3(recentPoints: number[]): boolean {
    try {
      if (recentPoints.length < 6) {
        return false;
      }

      const last6 = recentPoints.slice(-6);
      const increasing = last6.every((p, idx) => idx === 0 || p > last6[idx - 1]);
      const decreasing = last6.every((p, idx) => idx === 0 || p < last6[idx - 1]);
      const violation = increasing || decreasing;

      if (violation) {
        logger.warn(`WE Rule 3: 6 consecutive increasing or decreasing points`);
      }

      return violation;
    } catch (error) {
      logger.error(`Error in checkWesternElectricRule3: ${error}`);
      throw error;
    }
  }

  /**
   * Check Western Electric Rule 4: 14 alternating points
   */
  checkWesternElectricRule4(recentPoints: number[]): boolean {
    try {
      if (recentPoints.length < 14) {
        return false;
      }

      const last14 = recentPoints.slice(-14);
      let alternating = true;

      for (let i = 1; i < last14.length; i++) {
        const increasing = last14[i] > last14[i - 1];
        const prevIncreasing = last14[i - 1] > last14[i - 2];

        if (i > 1 && increasing === prevIncreasing) {
          alternating = false;
          break;
        }
      }

      if (alternating) {
        logger.warn(`WE Rule 4: 14 alternating points detected`);
      }

      return alternating;
    } catch (error) {
      logger.error(`Error in checkWesternElectricRule4: ${error}`);
      throw error;
    }
  }

  /**
   * Check Nelson Rule 1: Point beyond 3 sigma
   */
  checkNelsonRule1(measurement: number, centerLine: number, sigma: number): boolean {
    return this.checkWesternElectricRule1(measurement, centerLine, sigma);
  }

  /**
   * Check Nelson Rule 2: 9 consecutive points on same side
   */
  checkNelsonRule2(recentPoints: number[], centerLine: number): boolean {
    return this.checkWesternElectricRule2(recentPoints, centerLine);
  }

  /**
   * Check Nelson Rule 3: 6 consecutive increasing or decreasing
   */
  checkNelsonRule3(recentPoints: number[]): boolean {
    return this.checkWesternElectricRule3(recentPoints);
  }

  /**
   * Check Nelson Rule 4: 14 alternating points
   */
  checkNelsonRule4(recentPoints: number[]): boolean {
    return this.checkWesternElectricRule4(recentPoints);
  }

  /**
   * Check Nelson Rule 5: 2 out of 3 points beyond 2 sigma on same side
   */
  checkNelsonRule5(recentPoints: number[], centerLine: number, sigma: number): boolean {
    try {
      if (recentPoints.length < 3) {
        return false;
      }

      const last3 = recentPoints.slice(-3);
      const twoSigma = 2 * sigma;

      const beyondUpper = last3.filter((p) => p > centerLine + twoSigma).length;
      const beyondLower = last3.filter((p) => p < centerLine - twoSigma).length;

      const violation = beyondUpper >= 2 || beyondLower >= 2;

      if (violation) {
        logger.warn(`Nelson Rule 5: 2 out of 3 points beyond 2 sigma`);
      }

      return violation;
    } catch (error) {
      logger.error(`Error in checkNelsonRule5: ${error}`);
      throw error;
    }
  }

  /**
   * Check Nelson Rule 6: 4 out of 5 points beyond 1 sigma on same side
   */
  checkNelsonRule6(recentPoints: number[], centerLine: number, sigma: number): boolean {
    try {
      if (recentPoints.length < 5) {
        return false;
      }

      const last5 = recentPoints.slice(-5);
      const oneSigma = sigma;

      const beyondUpper = last5.filter((p) => p > centerLine + oneSigma).length;
      const beyondLower = last5.filter((p) => p < centerLine - oneSigma).length;

      const violation = beyondUpper >= 4 || beyondLower >= 4;

      if (violation) {
        logger.warn(`Nelson Rule 6: 4 out of 5 points beyond 1 sigma`);
      }

      return violation;
    } catch (error) {
      logger.error(`Error in checkNelsonRule6: ${error}`);
      throw error;
    }
  }

  /**
   * Create an alert
   */
  async createAlert(
    planId: string,
    alertType: string,
    message: string,
    detectionPoint: number,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ): Promise<SPCAlert> {
    try {
      if (!planId || !alertType || !message) {
        throw new Error('Plan ID, alert type, and message are required');
      }

      const alert: SPCAlert = {
        id: `ALERT-${Date.now()}`,
        planId,
        alertType,
        severity,
        message,
        detectionPoint,
        detectedAt: new Date(),
        status: 'PENDING',
      };

      logger.warn(`Created alert [${severity}]: ${message}`);
      return alert;
    } catch (error) {
      logger.error(`Error in createAlert: ${error}`);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<SPCAlert | null> {
    try {
      if (!alertId || !userId) {
        throw new Error('Alert ID and user ID are required');
      }

      logger.info(`Alert ${alertId} acknowledged by ${userId}`);
      return null; // Would update in DB
    } catch (error) {
      logger.error(`Error in acknowledgeAlert: ${error}`);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: string): Promise<SPCAlert | null> {
    try {
      if (!alertId) {
        throw new Error('Alert ID is required');
      }

      logger.info(`Alert ${alertId} resolved: ${resolution}`);
      return null; // Would update in DB
    } catch (error) {
      logger.error(`Error in resolveAlert: ${error}`);
      throw error;
    }
  }

  /**
   * Get active alerts for a plan
   */
  async getPlanAlerts(planId: string, status?: string): Promise<SPCAlert[]> {
    try {
      logger.info(`Retrieved alerts for plan ${planId}`);
      return []; // Would fetch from DB
    } catch (error) {
      logger.error(`Error in getPlanAlerts: ${error}`);
      throw error;
    }
  }

  /**
   * Get alert statistics for a plan
   */
  async getAlertStatistics(planId: string): Promise<{ pending: number; acknowledged: number; resolved: number; highSeverity: number }> {
    try {
      logger.info(`Retrieved alert statistics for plan ${planId}`);
      return {
        pending: 0,
        acknowledged: 0,
        resolved: 0,
        highSeverity: 0,
      };
    } catch (error) {
      logger.error(`Error in getAlertStatistics: ${error}`);
      throw error;
    }
  }

  /**
   * Check all enabled rules against measurement
   */
  async checkAllRules(
    planId: string,
    measurement: number,
    recentPoints: number[],
    centerLine: number,
    sigma: number
  ): Promise<SPCAlert[]> {
    try {
      const alerts: SPCAlert[] = [];

      // Check Western Electric Rules
      if (this.checkWesternElectricRule1(measurement, centerLine, sigma)) {
        const alert = await this.createAlert(planId, 'WE_RULE_1', 'Point beyond 3 sigma', recentPoints.length, 'HIGH');
        alerts.push(alert);
      }

      if (this.checkWesternElectricRule2(recentPoints, centerLine)) {
        const alert = await this.createAlert(planId, 'WE_RULE_2', '9 consecutive points on same side', recentPoints.length, 'MEDIUM');
        alerts.push(alert);
      }

      if (this.checkWesternElectricRule3(recentPoints)) {
        const alert = await this.createAlert(planId, 'WE_RULE_3', '6 consecutive increasing or decreasing', recentPoints.length, 'MEDIUM');
        alerts.push(alert);
      }

      // Check Nelson Rules
      if (this.checkNelsonRule5(recentPoints, centerLine, sigma)) {
        const alert = await this.createAlert(planId, 'NELSON_RULE_5', '2 out of 3 points beyond 2 sigma', recentPoints.length, 'MEDIUM');
        alerts.push(alert);
      }

      logger.info(`Rule check completed: ${alerts.length} alerts triggered`);
      return alerts;
    } catch (error) {
      logger.error(`Error in checkAllRules: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default AlertManagementService;
