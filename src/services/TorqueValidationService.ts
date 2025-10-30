/**
 * Real-time Torque Validation Service
 * Processes torque readings in real-time with in-spec/out-of-spec detection
 * Implements AS9100 compliance rules and supervisor review workflows
 */

import { EventEmitter } from 'events';
import {
  TorqueSpecification,
  TorqueEvent,
  TorqueValidationResult,
  DigitalWrenchReading,
  TorqueError,
  TorqueErrorType,
  RealtimeTorqueEvent,
  TorqueSystemConfig
} from '../types/torque';

export interface ValidationContext {
  workOrderId: string;
  operatorId: string;
  torqueSpecId: string;
  boltPosition: number;
  passNumber: number;
  sequenceId?: string;
  serialNumber?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'warning' | 'error' | 'critical';
  condition: (reading: DigitalWrenchReading, spec: TorqueSpecification, context: ValidationContext) => boolean;
  message: string;
  action: 'allow' | 'flag' | 'reject' | 'supervisor_review';
}

export interface ValidationSession {
  id: string;
  workOrderId: string;
  torqueSpecId: string;
  operatorId: string;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'completed' | 'error';
  totalReadings: number;
  inSpecReadings: number;
  outOfSpecReadings: number;
  reworkRequired: number;
  lastValidation?: TorqueValidationResult;
}

export class TorqueValidationService extends EventEmitter {
  private validationRules: Map<string, ValidationRule> = new Map();
  private activeSessions: Map<string, ValidationSession> = new Map();
  private config: TorqueSystemConfig;
  private validationHistory: Array<{
    timestamp: Date;
    reading: DigitalWrenchReading;
    result: TorqueValidationResult;
    context: ValidationContext;
  }> = [];

  constructor(config: TorqueSystemConfig) {
    super();
    this.config = config;
    this.initializeDefaultRules();
  }

  /**
   * Start a new validation session
   */
  async startValidationSession(
    workOrderId: string,
    torqueSpecId: string,
    operatorId: string
  ): Promise<string> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: ValidationSession = {
      id: sessionId,
      workOrderId,
      torqueSpecId,
      operatorId,
      startTime: new Date(),
      status: 'active',
      totalReadings: 0,
      inSpecReadings: 0,
      outOfSpecReadings: 0,
      reworkRequired: 0
    };

    this.activeSessions.set(sessionId, session);

    this.emit('session_started', {
      type: 'session_started',
      data: session,
      timestamp: new Date(),
      workOrderId,
      operatorId
    } as RealtimeTorqueEvent);

    return sessionId;
  }

  /**
   * End a validation session
   */
  async endValidationSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Validation session ${sessionId} not found`);
    }

    session.endTime = new Date();
    session.status = 'completed';

    this.emit('session_ended', {
      type: 'session_ended',
      data: session,
      timestamp: new Date(),
      workOrderId: session.workOrderId,
      operatorId: session.operatorId
    } as RealtimeTorqueEvent);

    this.activeSessions.delete(sessionId);
  }

  /**
   * Validate a torque reading in real-time
   */
  async validateTorqueReading(
    reading: DigitalWrenchReading,
    torqueSpec: TorqueSpecification,
    context: ValidationContext,
    sessionId?: string
  ): Promise<TorqueValidationResult> {
    try {
      // Update session if provided
      if (sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.totalReadings++;
        }
      }

      // Create validation result
      const result: TorqueValidationResult = {
        isInSpec: false,
        deviationPercent: 0,
        targetTorque: torqueSpec.targetTorque,
        toleranceRange: {
          min: torqueSpec.targetTorque - torqueSpec.toleranceMinus,
          max: torqueSpec.targetTorque + torqueSpec.tolerancePlus
        },
        message: '',
        requiresRework: false,
        requiresSupervisorReview: false
      };

      // Calculate deviation
      const deviation = reading.torqueValue - torqueSpec.targetTorque;
      result.deviationPercent = (deviation / torqueSpec.targetTorque) * 100;

      // Check basic tolerance
      const withinTolerance = reading.torqueValue >= result.toleranceRange.min &&
                             reading.torqueValue <= result.toleranceRange.max;

      result.isInSpec = withinTolerance;

      // Apply validation rules
      const ruleViolations = this.applyValidationRules(reading, torqueSpec, context);

      // Determine final status
      if (withinTolerance && ruleViolations.length === 0) {
        result.message = 'Torque reading is within specification';
        if (sessionId) {
          const session = this.activeSessions.get(sessionId);
          if (session) session.inSpecReadings++;
        }
      } else {
        // Handle out-of-spec conditions
        const criticalViolations = ruleViolations.filter(v => v.severity === 'critical');
        const errorViolations = ruleViolations.filter(v => v.severity === 'error');

        if (criticalViolations.length > 0) {
          result.requiresRework = true;
          result.requiresSupervisorReview = true;
          result.message = `Critical violation: ${criticalViolations[0].message}`;
        } else if (errorViolations.length > 0) {
          result.requiresRework = true;
          result.message = `Error: ${errorViolations[0].message}`;

          // Check if supervisor review is required
          if (this.config.allowSupervisorOverride) {
            result.requiresSupervisorReview = this.shouldRequireSupervisorReview(reading, torqueSpec, context);
          }
        } else if (!withinTolerance) {
          const toleranceViolation = this.checkToleranceViolation(reading, torqueSpec);
          result.message = toleranceViolation.message;
          result.requiresRework = toleranceViolation.requiresRework;
          result.requiresSupervisorReview = toleranceViolation.requiresSupervisorReview;
        }

        if (sessionId) {
          const session = this.activeSessions.get(sessionId);
          if (session) {
            session.outOfSpecReadings++;
            if (result.requiresRework) {
              session.reworkRequired++;
            }
          }
        }
      }

      // Update session with last validation
      if (sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.lastValidation = result;
        }
      }

      // Store in history
      this.validationHistory.push({
        timestamp: new Date(),
        reading,
        result,
        context
      });

      // Emit real-time event
      this.emit('validation_result', {
        type: 'validation_result',
        data: {
          reading,
          result,
          context
        },
        timestamp: new Date(),
        workOrderId: context.workOrderId,
        operatorId: context.operatorId
      } as RealtimeTorqueEvent);

      // Handle auto-flagging for rework
      if (result.requiresRework && this.config.autoFlagRework) {
        this.emit('rework_required', {
          type: 'rework_required',
          data: {
            reading,
            result,
            context,
            reason: result.message
          },
          timestamp: new Date(),
          workOrderId: context.workOrderId,
          operatorId: context.operatorId
        } as RealtimeTorqueEvent);
      }

      // Handle supervisor review requirement
      if (result.requiresSupervisorReview) {
        this.emit('supervisor_review_required', {
          type: 'supervisor_review_required',
          data: {
            reading,
            result,
            context,
            reason: result.message
          },
          timestamp: new Date(),
          workOrderId: context.workOrderId,
          operatorId: context.operatorId
        } as RealtimeTorqueEvent);
      }

      return result;

    } catch (error) {
      const validationError: TorqueError = {
        type: TorqueErrorType.SEQUENCE_VALIDATION_FAILED,
        message: `Validation failed: ${error}`,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: ['Check torque specification', 'Verify reading accuracy', 'Retry validation']
      };

      this.emit('validation_error', validationError);
      throw validationError;
    }
  }

  /**
   * Apply all enabled validation rules
   */
  private applyValidationRules(
    reading: DigitalWrenchReading,
    spec: TorqueSpecification,
    context: ValidationContext
  ): ValidationRule[] {
    const violations: ValidationRule[] = [];

    for (const rule of this.validationRules.values()) {
      if (rule.enabled && rule.condition(reading, spec, context)) {
        violations.push(rule);
      }
    }

    return violations.sort((a, b) => {
      const severityOrder = { critical: 3, error: 2, warning: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Check tolerance violation and determine severity
   */
  private checkToleranceViolation(
    reading: DigitalWrenchReading,
    spec: TorqueSpecification
  ): {
    message: string;
    requiresRework: boolean;
    requiresSupervisorReview: boolean;
  } {
    const target = spec.targetTorque;
    const upperLimit = target + spec.tolerancePlus;
    const lowerLimit = target - spec.toleranceMinus;

    if (reading.torqueValue > upperLimit) {
      const excessPercent = ((reading.torqueValue - upperLimit) / target) * 100;

      if (excessPercent > 20) {
        return {
          message: `Severely over-torqued: ${excessPercent.toFixed(1)}% above upper limit`,
          requiresRework: true,
          requiresSupervisorReview: true
        };
      } else if (excessPercent > 10) {
        return {
          message: `Over-torqued: ${excessPercent.toFixed(1)}% above upper limit`,
          requiresRework: true,
          requiresSupervisorReview: this.config.allowSupervisorOverride
        };
      } else {
        return {
          message: `Slightly over-torqued: ${excessPercent.toFixed(1)}% above upper limit`,
          requiresRework: this.config.strictToleranceMode,
          requiresSupervisorReview: false
        };
      }
    }

    if (reading.torqueValue < lowerLimit) {
      const deficitPercent = ((lowerLimit - reading.torqueValue) / target) * 100;

      if (deficitPercent > 20) {
        return {
          message: `Severely under-torqued: ${deficitPercent.toFixed(1)}% below lower limit`,
          requiresRework: true,
          requiresSupervisorReview: true
        };
      } else if (deficitPercent > 10) {
        return {
          message: `Under-torqued: ${deficitPercent.toFixed(1)}% below lower limit`,
          requiresRework: true,
          requiresSupervisorReview: this.config.allowSupervisorOverride
        };
      } else {
        return {
          message: `Slightly under-torqued: ${deficitPercent.toFixed(1)}% below lower limit`,
          requiresRework: this.config.strictToleranceMode,
          requiresSupervisorReview: false
        };
      }
    }

    return {
      message: 'Torque is within specification',
      requiresRework: false,
      requiresSupervisorReview: false
    };
  }

  /**
   * Determine if supervisor review is required
   */
  private shouldRequireSupervisorReview(
    reading: DigitalWrenchReading,
    spec: TorqueSpecification,
    context: ValidationContext
  ): boolean {
    // Always require supervisor review for critical assemblies
    if (spec.workCenter?.includes('CRITICAL') || spec.workCenter?.includes('ENGINE')) {
      return true;
    }

    // Require review for large deviations
    const deviationPercent = Math.abs((reading.torqueValue - spec.targetTorque) / spec.targetTorque) * 100;
    if (deviationPercent > 15) {
      return true;
    }

    // Require review for multiple consecutive out-of-spec readings
    const recentReadings = this.validationHistory
      .filter(h => h.context.workOrderId === context.workOrderId &&
                  h.context.boltPosition === context.boltPosition)
      .slice(-3);

    if (recentReadings.length >= 3 && recentReadings.every(r => !r.result.isInSpec)) {
      return true;
    }

    return false;
  }

  /**
   * Initialize default validation rules
   */
  private initializeDefaultRules(): void {
    // Wrench calibration rule
    this.addValidationRule({
      id: 'wrench_calibration',
      name: 'Wrench Calibration Check',
      description: 'Ensures digital wrench is properly calibrated',
      enabled: true,
      severity: 'critical',
      condition: (reading) => !reading.isCalibrated,
      message: 'Digital wrench is not calibrated',
      action: 'reject'
    });

    // Excessive torque rule
    this.addValidationRule({
      id: 'excessive_torque',
      name: 'Excessive Torque Protection',
      description: 'Prevents damage from excessive torque application',
      enabled: true,
      severity: 'critical',
      condition: (reading, spec) => reading.torqueValue > (spec.targetTorque * 1.5),
      message: 'Torque value exceeds 150% of target - risk of component damage',
      action: 'reject'
    });

    // Insufficient torque rule
    this.addValidationRule({
      id: 'insufficient_torque',
      name: 'Insufficient Torque Warning',
      description: 'Warns when torque is significantly below minimum',
      enabled: true,
      severity: 'error',
      condition: (reading, spec) => reading.torqueValue < (spec.targetTorque * 0.5),
      message: 'Torque value is less than 50% of target - insufficient clamping force',
      action: 'supervisor_review'
    });

    // Rapid sequence rule
    this.addValidationRule({
      id: 'rapid_sequence',
      name: 'Rapid Sequence Detection',
      description: 'Detects potentially rushed bolt tightening',
      enabled: true,
      severity: 'warning',
      condition: (reading, spec, context) => {
        // Check if reading was taken too quickly after previous one
        const recentReadings = this.validationHistory
          .filter(h => h.context.workOrderId === context.workOrderId)
          .slice(-2);

        if (recentReadings.length < 1) return false;

        const timeDiff = Date.now() - recentReadings[recentReadings.length - 1].timestamp.getTime();
        return timeDiff < 5000; // Less than 5 seconds
      },
      message: 'Rapid sequence detected - ensure proper bolt positioning',
      action: 'flag'
    });

    // Angle compliance rule (for torque-angle method)
    this.addValidationRule({
      id: 'angle_compliance',
      name: 'Angle Compliance Check',
      description: 'Validates angle rotation for torque-angle method',
      enabled: true,
      severity: 'error',
      condition: (reading, spec) => {
        if (spec.tighteningMethod !== 'TORQUE_ANGLE') return false;
        return !reading.angle || reading.angle < 30; // Minimum expected angle
      },
      message: 'Insufficient angle rotation for torque-angle method',
      action: 'supervisor_review'
    });
  }

  /**
   * Add a custom validation rule
   */
  addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  /**
   * Remove a validation rule
   */
  removeValidationRule(ruleId: string): void {
    this.validationRules.delete(ruleId);
  }

  /**
   * Enable or disable a validation rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): void {
    const rule = this.validationRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
    }
  }

  /**
   * Get all validation rules
   */
  getValidationRules(): ValidationRule[] {
    return Array.from(this.validationRules.values());
  }

  /**
   * Get validation session status
   */
  getSessionStatus(sessionId: string): ValidationSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get validation history
   */
  getValidationHistory(workOrderId?: string, limit?: number): Array<{
    timestamp: Date;
    reading: DigitalWrenchReading;
    result: TorqueValidationResult;
    context: ValidationContext;
  }> {
    let history = this.validationHistory;

    if (workOrderId) {
      history = history.filter(h => h.context.workOrderId === workOrderId);
    }

    if (limit) {
      history = history.slice(-limit);
    }

    return history.slice().reverse(); // Return most recent first
  }

  /**
   * Clear validation history
   */
  clearValidationHistory(): void {
    this.validationHistory = [];
  }

  /**
   * Get validation statistics
   */
  getValidationStatistics(workOrderId?: string): {
    totalReadings: number;
    inSpecReadings: number;
    outOfSpecReadings: number;
    successRate: number;
    reworkRequired: number;
    supervisorReviews: number;
  } {
    let history = this.validationHistory;

    if (workOrderId) {
      history = history.filter(h => h.context.workOrderId === workOrderId);
    }

    const totalReadings = history.length;
    const inSpecReadings = history.filter(h => h.result.isInSpec).length;
    const outOfSpecReadings = totalReadings - inSpecReadings;
    const reworkRequired = history.filter(h => h.result.requiresRework).length;
    const supervisorReviews = history.filter(h => h.result.requiresSupervisorReview).length;

    return {
      totalReadings,
      inSpecReadings,
      outOfSpecReadings,
      successRate: totalReadings > 0 ? (inSpecReadings / totalReadings) * 100 : 0,
      reworkRequired,
      supervisorReviews
    };
  }

  /**
   * Update system configuration
   */
  updateConfiguration(newConfig: Partial<TorqueSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('config_updated', newConfig);
  }
}

export default TorqueValidationService;