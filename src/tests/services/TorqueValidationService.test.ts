import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TorqueValidationService } from '@/services/TorqueValidationService';
import {
  TorqueValidationRule,
  TorqueValidationSession,
  TorqueValidationResult,
  TorqueStatus,
  ValidationSeverity,
  TorqueSpecification,
  TorqueMethod,
  TorquePattern,
  DigitalWrenchReading
} from '@/types/torque';

describe('TorqueValidationService', () => {
  let validationService: TorqueValidationService;

  beforeEach(() => {
    validationService = new TorqueValidationService();
  });

  describe('Validation Rule Management', () => {
    const validRule: TorqueValidationRule = {
      id: 'rule-001',
      name: 'Standard Torque Tolerance',
      description: 'Standard ±3% tolerance for torque values',
      ruleType: 'TOLERANCE',
      parameters: {
        tolerancePercent: 3.0,
        allowOverTorque: false,
        maxRetries: 2
      },
      isActive: true,
      severity: ValidationSeverity.ERROR,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should add validation rule successfully', async () => {
      const result = await validationService.addRule(validRule);

      expect(result).toBe(true);
      expect(validationService.getRules()).toHaveLength(1);
      expect(validationService.getRules()[0]).toEqual(validRule);
    });

    it('should reject duplicate rule IDs', async () => {
      await validationService.addRule(validRule);

      await expect(
        validationService.addRule(validRule)
      ).rejects.toThrow('Validation rule with ID rule-001 already exists');
    });

    it('should remove validation rule', async () => {
      await validationService.addRule(validRule);
      const result = await validationService.removeRule('rule-001');

      expect(result).toBe(true);
      expect(validationService.getRules()).toHaveLength(0);
    });

    it('should return false when removing non-existent rule', async () => {
      const result = await validationService.removeRule('non-existent');

      expect(result).toBe(false);
    });

    it('should update existing rule', async () => {
      await validationService.addRule(validRule);

      const updatedRule = {
        ...validRule,
        parameters: { ...validRule.parameters, tolerancePercent: 5.0 }
      };

      const result = await validationService.updateRule('rule-001', updatedRule);

      expect(result).toBe(true);
      const rules = validationService.getRules();
      expect(rules[0].parameters.tolerancePercent).toBe(5.0);
    });

    it('should fail to update non-existent rule', async () => {
      await expect(
        validationService.updateRule('non-existent', validRule)
      ).rejects.toThrow('Validation rule not found: non-existent');
    });

    it('should get rule by ID', () => {
      validationService.addRule(validRule);
      const rule = validationService.getRule('rule-001');

      expect(rule).toEqual(validRule);
    });

    it('should return undefined for non-existent rule', () => {
      const rule = validationService.getRule('non-existent');

      expect(rule).toBeUndefined();
    });
  });

  describe('Validation Session Management', () => {
    const mockSpec: TorqueSpecification = {
      id: 'spec-123',
      operationId: 'op-123',
      partId: 'part-456',
      torqueValue: 150.0,
      toleranceLower: 145.0,
      toleranceUpper: 155.0,
      targetValue: 150.0,
      method: TorqueMethod.TORQUE_ONLY,
      pattern: TorquePattern.STAR,
      unit: 'Nm',
      numberOfPasses: 2,
      fastenerType: 'M10x1.5',
      fastenerGrade: '8.8',
      threadCondition: 'Dry',
      toolType: 'Electronic Torque Wrench',
      calibrationRequired: true,
      engineeringApproval: true,
      approvedBy: 'engineer-123',
      approvedDate: new Date(),
      safetyLevel: 'CRITICAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should create validation session successfully', async () => {
      const session = await validationService.createSession('session-123', mockSpec);

      expect(session).toBeDefined();
      expect(session.sessionId).toBe('session-123');
      expect(session.specification).toEqual(mockSpec);
      expect(session.isActive).toBe(true);
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.validationResults).toHaveLength(0);
    });

    it('should reject duplicate session IDs', async () => {
      await validationService.createSession('session-123', mockSpec);

      await expect(
        validationService.createSession('session-123', mockSpec)
      ).rejects.toThrow('Validation session with ID session-123 already exists');
    });

    it('should get session by ID', async () => {
      await validationService.createSession('session-123', mockSpec);
      const session = validationService.getSession('session-123');

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe('session-123');
    });

    it('should return undefined for non-existent session', () => {
      const session = validationService.getSession('non-existent');

      expect(session).toBeUndefined();
    });

    it('should end session successfully', async () => {
      await validationService.createSession('session-123', mockSpec);
      const result = await validationService.endSession('session-123');

      expect(result).toBe(true);
      const session = validationService.getSession('session-123');
      expect(session?.isActive).toBe(false);
      expect(session?.endTime).toBeInstanceOf(Date);
    });

    it('should fail to end non-existent session', async () => {
      await expect(
        validationService.endSession('non-existent')
      ).rejects.toThrow('Validation session not found: non-existent');
    });
  });

  describe('Torque Reading Validation', () => {
    const mockSpec: TorqueSpecification = {
      id: 'spec-123',
      operationId: 'op-123',
      partId: 'part-456',
      torqueValue: 150.0,
      toleranceLower: 145.0,
      toleranceUpper: 155.0,
      targetValue: 150.0,
      method: TorqueMethod.TORQUE_ONLY,
      pattern: TorquePattern.STAR,
      unit: 'Nm',
      numberOfPasses: 2,
      fastenerType: 'M10x1.5',
      fastenerGrade: '8.8',
      threadCondition: 'Dry',
      toolType: 'Electronic Torque Wrench',
      calibrationRequired: true,
      engineeringApproval: true,
      approvedBy: 'engineer-123',
      approvedDate: new Date(),
      safetyLevel: 'CRITICAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const validReading: DigitalWrenchReading = {
      wrenchId: 'wrench-001',
      torque: 150.0,
      angle: 45.0,
      timestamp: new Date(),
      units: 'Nm',
      temperature: 20.0,
      batteryLevel: 85
    };

    beforeEach(async () => {
      await validationService.createSession('test-session', mockSpec);
    });

    it('should validate in-spec reading successfully', async () => {
      const result = await validationService.validateReading('test-session', validReading);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe(TorqueStatus.PASS);
      expect(result.deviation).toBe(0);
      expect(result.percentDeviation).toBe(0);
      expect(result.message).toBe('Reading within specification');
      expect(result.severity).toBe(ValidationSeverity.INFO);
    });

    it('should validate under-torque reading', async () => {
      const underTorqueReading = { ...validReading, torque: 140.0 };
      const result = await validationService.validateReading('test-session', underTorqueReading);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.UNDER_TORQUE);
      expect(result.deviation).toBe(-10.0);
      expect(result.percentDeviation).toBeCloseTo(-6.67, 2);
      expect(result.message).toContain('below specification');
      expect(result.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should validate over-torque reading', async () => {
      const overTorqueReading = { ...validReading, torque: 160.0 };
      const result = await validationService.validateReading('test-session', overTorqueReading);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.OVER_TORQUE);
      expect(result.deviation).toBe(10.0);
      expect(result.percentDeviation).toBeCloseTo(6.67, 2);
      expect(result.message).toContain('above specification');
      expect(result.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should validate reading at tolerance boundaries', async () => {
      const lowerBoundaryReading = { ...validReading, torque: 145.0 };
      const upperBoundaryReading = { ...validReading, torque: 155.0 };

      const lowerResult = await validationService.validateReading('test-session', lowerBoundaryReading);
      const upperResult = await validationService.validateReading('test-session', upperBoundaryReading);

      expect(lowerResult.isValid).toBe(true);
      expect(lowerResult.status).toBe(TorqueStatus.PASS);
      expect(upperResult.isValid).toBe(true);
      expect(upperResult.status).toBe(TorqueStatus.PASS);
    });

    it('should fail validation for non-existent session', async () => {
      await expect(
        validationService.validateReading('non-existent', validReading)
      ).rejects.toThrow('Validation session not found: non-existent');
    });

    it('should fail validation for inactive session', async () => {
      await validationService.endSession('test-session');

      await expect(
        validationService.validateReading('test-session', validReading)
      ).rejects.toThrow('Validation session test-session is not active');
    });

    it('should add validation result to session history', async () => {
      await validationService.validateReading('test-session', validReading);

      const session = validationService.getSession('test-session');
      expect(session?.validationResults).toHaveLength(1);
      expect(session?.validationResults[0].reading).toEqual(validReading);
    });

    it('should emit validation event', async () => {
      const validationSpy = vi.fn();
      validationService.on('validationComplete', validationSpy);

      await validationService.validateReading('test-session', validReading);

      expect(validationSpy).toHaveBeenCalledOnce();
      expect(validationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'test-session',
          isValid: true,
          status: TorqueStatus.PASS
        })
      );
    });
  });

  describe('Custom Validation Rules', () => {
    const mockSpec: TorqueSpecification = {
      id: 'spec-123',
      operationId: 'op-123',
      partId: 'part-456',
      torqueValue: 150.0,
      toleranceLower: 145.0,
      toleranceUpper: 155.0,
      targetValue: 150.0,
      method: TorqueMethod.TORQUE_ONLY,
      pattern: TorquePattern.STAR,
      unit: 'Nm',
      numberOfPasses: 2,
      fastenerType: 'M10x1.5',
      fastenerGrade: '8.8',
      threadCondition: 'Dry',
      toolType: 'Electronic Torque Wrench',
      calibrationRequired: true,
      engineeringApproval: true,
      approvedBy: 'engineer-123',
      approvedDate: new Date(),
      safetyLevel: 'CRITICAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const strictRule: TorqueValidationRule = {
      id: 'strict-rule',
      name: 'Strict Tolerance',
      description: 'Strict ±1% tolerance',
      ruleType: 'TOLERANCE',
      parameters: {
        tolerancePercent: 1.0,
        allowOverTorque: false,
        maxRetries: 1
      },
      isActive: true,
      severity: ValidationSeverity.ERROR,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const warningRule: TorqueValidationRule = {
      id: 'warning-rule',
      name: 'Warning Zone',
      description: 'Warning for readings near tolerance limits',
      ruleType: 'WARNING_ZONE',
      parameters: {
        warningZonePercent: 90.0, // Warn when within 90% of tolerance limit
        tolerancePercent: 3.0
      },
      isActive: true,
      severity: ValidationSeverity.WARNING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(async () => {
      await validationService.addRule(strictRule);
      await validationService.addRule(warningRule);
      await validationService.createSession('rule-session', mockSpec);
    });

    it('should apply strict tolerance rule', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 148.0, // 1.33% deviation - should fail strict rule
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const result = await validationService.validateReading('rule-session', reading);

      expect(result.isValid).toBe(false);
      expect(result.appliedRules).toContain('strict-rule');
      expect(result.severity).toBe(ValidationSeverity.ERROR);
    });

    it('should apply warning zone rule', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 154.5, // Near upper tolerance limit
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const result = await validationService.validateReading('rule-session', reading);

      expect(result.isValid).toBe(true);
      expect(result.appliedRules).toContain('warning-rule');
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
    });

    it('should handle multiple rule applications', async () => {
      const multiRule: TorqueValidationRule = {
        id: 'multi-rule',
        name: 'Multiple Conditions',
        description: 'Rule with multiple validation conditions',
        ruleType: 'MULTI_CONDITION',
        parameters: {
          conditions: [
            { type: 'MIN_TORQUE', value: 140.0 },
            { type: 'MAX_ANGLE', value: 90.0 },
            { type: 'TEMPERATURE_RANGE', min: 15.0, max: 25.0 }
          ]
        },
        isActive: true,
        severity: ValidationSeverity.WARNING,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await validationService.addRule(multiRule);

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const result = await validationService.validateReading('rule-session', reading);

      expect(result.appliedRules).toContain('multi-rule');
    });

    it('should skip inactive rules', async () => {
      const inactiveRule: TorqueValidationRule = {
        ...strictRule,
        id: 'inactive-rule',
        isActive: false
      };

      await validationService.addRule(inactiveRule);

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const result = await validationService.validateReading('rule-session', reading);

      expect(result.appliedRules).not.toContain('inactive-rule');
    });
  });

  describe('Statistics and Analytics', () => {
    const mockSpec: TorqueSpecification = {
      id: 'spec-123',
      operationId: 'op-123',
      partId: 'part-456',
      torqueValue: 150.0,
      toleranceLower: 145.0,
      toleranceUpper: 155.0,
      targetValue: 150.0,
      method: TorqueMethod.TORQUE_ONLY,
      pattern: TorquePattern.STAR,
      unit: 'Nm',
      numberOfPasses: 2,
      fastenerType: 'M10x1.5',
      fastenerGrade: '8.8',
      threadCondition: 'Dry',
      toolType: 'Electronic Torque Wrench',
      calibrationRequired: true,
      engineeringApproval: true,
      approvedBy: 'engineer-123',
      approvedDate: new Date(),
      safetyLevel: 'CRITICAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(async () => {
      await validationService.createSession('stats-session', mockSpec);

      // Add multiple validation results
      const readings = [
        { torque: 150.0, valid: true },
        { torque: 148.0, valid: true },
        { torque: 152.0, valid: true },
        { torque: 140.0, valid: false },
        { torque: 160.0, valid: false }
      ];

      for (const { torque, valid } of readings) {
        const reading: DigitalWrenchReading = {
          wrenchId: 'wrench-001',
          torque,
          angle: 45.0,
          timestamp: new Date(),
          units: 'Nm',
          temperature: 20.0,
          batteryLevel: 85
        };

        await validationService.validateReading('stats-session', reading);
      }
    });

    it('should calculate session statistics', () => {
      const stats = validationService.getSessionStatistics('stats-session');

      expect(stats).toBeDefined();
      expect(stats.totalValidations).toBe(5);
      expect(stats.passCount).toBe(3);
      expect(stats.failCount).toBe(2);
      expect(stats.passRate).toBe(60);
      expect(stats.averageTorque).toBe(150.0);
      expect(stats.standardDeviation).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent session statistics', () => {
      const stats = validationService.getSessionStatistics('non-existent');

      expect(stats).toBeUndefined();
    });

    it('should calculate process capability metrics', () => {
      const stats = validationService.getSessionStatistics('stats-session');

      expect(stats?.processCapability).toBeDefined();
      expect(stats?.processCapability?.cpk).toBeDefined();
      expect(stats?.processCapability?.cp).toBeDefined();
    });

    it('should track validation history', () => {
      const session = validationService.getSession('stats-session');

      expect(session?.validationResults).toHaveLength(5);
      expect(session?.validationResults.filter(r => r.result.isValid)).toHaveLength(3);
      expect(session?.validationResults.filter(r => !r.result.isValid)).toHaveLength(2);
    });

    it('should identify trends in validation data', () => {
      const stats = validationService.getSessionStatistics('stats-session');

      expect(stats?.trends).toBeDefined();
      expect(stats?.trends?.direction).toBeDefined();
      expect(stats?.trends?.strength).toBeDefined();
    });
  });

  describe('Real-time Validation', () => {
    const mockSpec: TorqueSpecification = {
      id: 'spec-123',
      operationId: 'op-123',
      partId: 'part-456',
      torqueValue: 150.0,
      toleranceLower: 145.0,
      toleranceUpper: 155.0,
      targetValue: 150.0,
      method: TorqueMethod.TORQUE_ONLY,
      pattern: TorquePattern.STAR,
      unit: 'Nm',
      numberOfPasses: 2,
      fastenerType: 'M10x1.5',
      fastenerGrade: '8.8',
      threadCondition: 'Dry',
      toolType: 'Electronic Torque Wrench',
      calibrationRequired: true,
      engineeringApproval: true,
      approvedBy: 'engineer-123',
      approvedDate: new Date(),
      safetyLevel: 'CRITICAL',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    beforeEach(async () => {
      await validationService.createSession('realtime-session', mockSpec);
    });

    it('should emit real-time validation events', async () => {
      const realtimeSpy = vi.fn();
      validationService.on('realtimeValidation', realtimeSpy);

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      await validationService.validateReading('realtime-session', reading);

      expect(realtimeSpy).toHaveBeenCalledOnce();
      expect(realtimeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'realtime-session',
          reading,
          result: expect.objectContaining({
            isValid: true,
            status: TorqueStatus.PASS
          })
        })
      );
    });

    it('should emit out-of-spec alerts', async () => {
      const alertSpy = vi.fn();
      validationService.on('outOfSpecAlert', alertSpy);

      const outOfSpecReading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 165.0, // Well over spec
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      await validationService.validateReading('realtime-session', outOfSpecReading);

      expect(alertSpy).toHaveBeenCalledOnce();
      expect(alertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'realtime-session',
          severity: ValidationSeverity.ERROR,
          reading: outOfSpecReading
        })
      );
    });

    it('should handle continuous validation stream', async () => {
      const validationSpy = vi.fn();
      validationService.on('validationComplete', validationSpy);

      const readings = Array.from({ length: 10 }, (_, i) => ({
        wrenchId: 'wrench-001',
        torque: 148 + i * 0.5, // Gradually increasing torque
        angle: 45.0,
        timestamp: new Date(Date.now() + i * 1000),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85 - i
      }));

      for (const reading of readings) {
        await validationService.validateReading('realtime-session', reading);
      }

      expect(validationSpy).toHaveBeenCalledTimes(10);

      const session = validationService.getSession('realtime-session');
      expect(session?.validationResults).toHaveLength(10);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid torque values gracefully', async () => {
      const mockSpec: TorqueSpecification = {
        id: 'spec-123',
        operationId: 'op-123',
        partId: 'part-456',
        torqueValue: 150.0,
        toleranceLower: 145.0,
        toleranceUpper: 155.0,
        targetValue: 150.0,
        method: TorqueMethod.TORQUE_ONLY,
        pattern: TorquePattern.STAR,
        unit: 'Nm',
        numberOfPasses: 2,
        fastenerType: 'M10x1.5',
        fastenerGrade: '8.8',
        threadCondition: 'Dry',
        toolType: 'Electronic Torque Wrench',
        calibrationRequired: true,
        engineeringApproval: true,
        approvedBy: 'engineer-123',
        approvedDate: new Date(),
        safetyLevel: 'CRITICAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await validationService.createSession('error-session', mockSpec);

      const invalidReading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: -10.0, // Negative torque
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const result = await validationService.validateReading('error-session', invalidReading);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.ERROR);
      expect(result.message).toContain('Invalid torque value');
    });

    it('should handle validation rule errors gracefully', async () => {
      const invalidRule: TorqueValidationRule = {
        id: 'invalid-rule',
        name: 'Invalid Rule',
        description: 'Rule with invalid parameters',
        ruleType: 'INVALID_TYPE' as any,
        parameters: {
          invalidParam: 'invalid'
        },
        isActive: true,
        severity: ValidationSeverity.ERROR,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await expect(
        validationService.addRule(invalidRule)
      ).rejects.toThrow('Invalid rule type: INVALID_TYPE');
    });

    it('should handle concurrent validation requests', async () => {
      const mockSpec: TorqueSpecification = {
        id: 'spec-123',
        operationId: 'op-123',
        partId: 'part-456',
        torqueValue: 150.0,
        toleranceLower: 145.0,
        toleranceUpper: 155.0,
        targetValue: 150.0,
        method: TorqueMethod.TORQUE_ONLY,
        pattern: TorquePattern.STAR,
        unit: 'Nm',
        numberOfPasses: 2,
        fastenerType: 'M10x1.5',
        fastenerGrade: '8.8',
        threadCondition: 'Dry',
        toolType: 'Electronic Torque Wrench',
        calibrationRequired: true,
        engineeringApproval: true,
        approvedBy: 'engineer-123',
        approvedDate: new Date(),
        safetyLevel: 'CRITICAL',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await validationService.createSession('concurrent-session', mockSpec);

      const readings = Array.from({ length: 5 }, (_, i) => ({
        wrenchId: 'wrench-001',
        torque: 150.0 + i,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      }));

      // Validate all readings concurrently
      const validationPromises = readings.map(reading =>
        validationService.validateReading('concurrent-session', reading)
      );

      const results = await Promise.all(validationPromises);

      expect(results).toHaveLength(5);
      expect(results.every(r => r !== undefined)).toBe(true);

      const session = validationService.getSession('concurrent-session');
      expect(session?.validationResults).toHaveLength(5);
    });
  });
});