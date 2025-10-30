import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TorqueService } from '@/services/TorqueService';
import {
  TorqueSpecification,
  TorqueSequence,
  TorqueEvent,
  TorqueMethod,
  TorquePattern,
  TorqueValidationResult,
  TorqueStatus,
  TorqueAnalyticsDashboard,
  TorqueReportData
} from '@/types/torque';

describe('TorqueService', () => {
  let torqueService: TorqueService;

  beforeEach(() => {
    torqueService = new TorqueService();
  });

  describe('createTorqueSpecification', () => {
    const validSpecData = {
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
      safetyLevel: 'CRITICAL'
    };

    it('should create torque specification with valid data', async () => {
      const spec = await torqueService.createTorqueSpecification(validSpecData);

      expect(spec).toBeDefined();
      expect(spec.operationId).toBe('op-123');
      expect(spec.partId).toBe('part-456');
      expect(spec.torqueValue).toBe(150.0);
      expect(spec.toleranceLower).toBe(145.0);
      expect(spec.toleranceUpper).toBe(155.0);
      expect(spec.method).toBe(TorqueMethod.TORQUE_ONLY);
      expect(spec.pattern).toBe(TorquePattern.STAR);
      expect(spec.numberOfPasses).toBe(2);
      expect(spec.safetyLevel).toBe('CRITICAL');
      expect(spec.id).toBeTruthy();
    });

    it('should reject negative torque value', async () => {
      const invalidData = { ...validSpecData, torqueValue: -10.0 };

      await expect(
        torqueService.createTorqueSpecification(invalidData)
      ).rejects.toThrow('Torque value must be positive');
    });

    it('should reject invalid tolerance range', async () => {
      const invalidData = {
        ...validSpecData,
        toleranceLower: 160.0,
        toleranceUpper: 140.0
      };

      await expect(
        torqueService.createTorqueSpecification(invalidData)
      ).rejects.toThrow('Lower tolerance must be less than upper tolerance');
    });

    it('should reject target value outside tolerance range', async () => {
      const invalidData = {
        ...validSpecData,
        targetValue: 200.0
      };

      await expect(
        torqueService.createTorqueSpecification(invalidData)
      ).rejects.toThrow('Target value must be within tolerance range');
    });

    it('should reject zero or negative number of passes', async () => {
      const invalidData = { ...validSpecData, numberOfPasses: 0 };

      await expect(
        torqueService.createTorqueSpecification(invalidData)
      ).rejects.toThrow('Number of passes must be positive');
    });

    it('should require engineering approval for critical safety level', async () => {
      const invalidData = {
        ...validSpecData,
        safetyLevel: 'CRITICAL',
        engineeringApproval: false
      };

      await expect(
        torqueService.createTorqueSpecification(invalidData)
      ).rejects.toThrow('Engineering approval required for critical safety level');
    });
  });

  describe('validateTorqueReading', () => {
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

    it('should validate in-spec torque reading', () => {
      const result = torqueService.validateTorqueReading(150.0, mockSpec);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe(TorqueStatus.PASS);
      expect(result.deviation).toBe(0);
      expect(result.percentDeviation).toBe(0);
      expect(result.message).toBe('Reading within specification');
    });

    it('should validate reading at lower tolerance limit', () => {
      const result = torqueService.validateTorqueReading(145.0, mockSpec);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe(TorqueStatus.PASS);
      expect(result.deviation).toBe(-5.0);
      expect(result.percentDeviation).toBeCloseTo(-3.33, 2);
    });

    it('should validate reading at upper tolerance limit', () => {
      const result = torqueService.validateTorqueReading(155.0, mockSpec);

      expect(result.isValid).toBe(true);
      expect(result.status).toBe(TorqueStatus.PASS);
      expect(result.deviation).toBe(5.0);
      expect(result.percentDeviation).toBeCloseTo(3.33, 2);
    });

    it('should reject reading below lower tolerance', () => {
      const result = torqueService.validateTorqueReading(140.0, mockSpec);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.UNDER_TORQUE);
      expect(result.deviation).toBe(-10.0);
      expect(result.percentDeviation).toBeCloseTo(-6.67, 2);
      expect(result.message).toContain('below lower tolerance');
    });

    it('should reject reading above upper tolerance', () => {
      const result = torqueService.validateTorqueReading(160.0, mockSpec);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.OVER_TORQUE);
      expect(result.deviation).toBe(10.0);
      expect(result.percentDeviation).toBeCloseTo(6.67, 2);
      expect(result.message).toContain('above upper tolerance');
    });

    it('should handle zero torque reading', () => {
      const result = torqueService.validateTorqueReading(0, mockSpec);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.UNDER_TORQUE);
      expect(result.message).toContain('below lower tolerance');
    });

    it('should handle negative torque reading', () => {
      const result = torqueService.validateTorqueReading(-10.0, mockSpec);

      expect(result.isValid).toBe(false);
      expect(result.status).toBe(TorqueStatus.UNDER_TORQUE);
      expect(result.message).toContain('below lower tolerance');
    });
  });

  describe('recordTorqueEvent', () => {
    const mockSequence: TorqueSequence = {
      id: 'seq-123',
      specificationId: 'spec-123',
      boltPosition: 1,
      sequenceNumber: 1,
      x: 100,
      y: 100,
      description: 'Bolt 1',
      createdAt: new Date()
    };

    const eventData = {
      sequenceId: 'seq-123',
      sessionId: 'session-123',
      passNumber: 1,
      actualTorque: 150.0,
      angle: 45.0,
      wrenchId: 'wrench-001',
      operatorId: 'operator-123',
      timestamp: new Date()
    };

    it('should record valid torque event', async () => {
      const event = await torqueService.recordTorqueEvent(eventData, mockSequence);

      expect(event).toBeDefined();
      expect(event.sequenceId).toBe('seq-123');
      expect(event.sessionId).toBe('session-123');
      expect(event.passNumber).toBe(1);
      expect(event.actualTorque).toBe(150.0);
      expect(event.angle).toBe(45.0);
      expect(event.status).toBe(TorqueStatus.PASS);
      expect(event.id).toBeTruthy();
    });

    it('should automatically validate torque reading', async () => {
      const lowTorqueData = { ...eventData, actualTorque: 140.0 };
      const event = await torqueService.recordTorqueEvent(lowTorqueData, mockSequence);

      expect(event.status).toBe(TorqueStatus.UNDER_TORQUE);
      expect(event.isValid).toBe(false);
      expect(event.deviation).toBe(-10.0);
    });

    it('should emit torque event on recording', async () => {
      const eventSpy = vi.fn();
      torqueService.on('torqueEvent', eventSpy);

      await torqueService.recordTorqueEvent(eventData, mockSequence);

      expect(eventSpy).toHaveBeenCalledOnce();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sequenceId: 'seq-123',
          actualTorque: 150.0
        })
      );
    });

    it('should reject negative pass number', async () => {
      const invalidData = { ...eventData, passNumber: -1 };

      await expect(
        torqueService.recordTorqueEvent(invalidData, mockSequence)
      ).rejects.toThrow('Pass number must be positive');
    });

    it('should reject zero pass number', async () => {
      const invalidData = { ...eventData, passNumber: 0 };

      await expect(
        torqueService.recordTorqueEvent(invalidData, mockSequence)
      ).rejects.toThrow('Pass number must be positive');
    });
  });

  describe('createTorqueSequence', () => {
    const sequenceData = {
      specificationId: 'spec-123',
      boltPosition: 1,
      sequenceNumber: 1,
      x: 100,
      y: 100,
      description: 'Bolt 1'
    };

    it('should create torque sequence with valid data', async () => {
      const sequence = await torqueService.createTorqueSequence(sequenceData);

      expect(sequence).toBeDefined();
      expect(sequence.specificationId).toBe('spec-123');
      expect(sequence.boltPosition).toBe(1);
      expect(sequence.sequenceNumber).toBe(1);
      expect(sequence.x).toBe(100);
      expect(sequence.y).toBe(100);
      expect(sequence.description).toBe('Bolt 1');
      expect(sequence.id).toBeTruthy();
    });

    it('should reject negative bolt position', async () => {
      const invalidData = { ...sequenceData, boltPosition: -1 };

      await expect(
        torqueService.createTorqueSequence(invalidData)
      ).rejects.toThrow('Bolt position must be positive');
    });

    it('should reject zero bolt position', async () => {
      const invalidData = { ...sequenceData, boltPosition: 0 };

      await expect(
        torqueService.createTorqueSequence(invalidData)
      ).rejects.toThrow('Bolt position must be positive');
    });

    it('should reject negative sequence number', async () => {
      const invalidData = { ...sequenceData, sequenceNumber: -1 };

      await expect(
        torqueService.createTorqueSequence(invalidData)
      ).rejects.toThrow('Sequence number must be positive');
    });
  });

  describe('Pattern Generation', () => {
    describe('generateStarPattern', () => {
      it('should generate correct star pattern for 4 bolts', () => {
        const pattern = torqueService.generateStarPattern(4);

        expect(pattern).toHaveLength(4);
        expect(pattern[0]).toBe(1);
        expect(pattern[1]).toBe(3);
        expect(pattern[2]).toBe(2);
        expect(pattern[3]).toBe(4);
      });

      it('should generate correct star pattern for 6 bolts', () => {
        const pattern = torqueService.generateStarPattern(6);

        expect(pattern).toHaveLength(6);
        expect(pattern[0]).toBe(1);
        expect(pattern[1]).toBe(4);
        expect(pattern[2]).toBe(2);
        expect(pattern[3]).toBe(5);
        expect(pattern[4]).toBe(3);
        expect(pattern[5]).toBe(6);
      });

      it('should handle single bolt', () => {
        const pattern = torqueService.generateStarPattern(1);

        expect(pattern).toHaveLength(1);
        expect(pattern[0]).toBe(1);
      });

      it('should reject zero bolt count', () => {
        expect(() => torqueService.generateStarPattern(0))
          .toThrow('Bolt count must be positive');
      });

      it('should reject negative bolt count', () => {
        expect(() => torqueService.generateStarPattern(-1))
          .toThrow('Bolt count must be positive');
      });
    });

    describe('generateSpiralPattern', () => {
      it('should generate correct spiral pattern for 4 bolts', () => {
        const pattern = torqueService.generateSpiralPattern(4);

        expect(pattern).toHaveLength(4);
        expect(pattern).toEqual([1, 2, 3, 4]);
      });

      it('should generate correct spiral pattern for 8 bolts', () => {
        const pattern = torqueService.generateSpiralPattern(8);

        expect(pattern).toHaveLength(8);
        // Should follow clockwise or counter-clockwise spiral
        expect(pattern[0]).toBe(1);
        expect(pattern).toContain(2);
        expect(pattern).toContain(3);
        expect(pattern).toContain(8);
      });

      it('should handle single bolt', () => {
        const pattern = torqueService.generateSpiralPattern(1);

        expect(pattern).toHaveLength(1);
        expect(pattern[0]).toBe(1);
      });
    });

    describe('generateCrossPattern', () => {
      it('should generate correct cross pattern for 4 bolts', () => {
        const pattern = torqueService.generateCrossPattern(4);

        expect(pattern).toHaveLength(4);
        expect(pattern[0]).toBe(1);
        expect(pattern[1]).toBe(3);
        expect(pattern[2]).toBe(2);
        expect(pattern[3]).toBe(4);
      });

      it('should generate correct cross pattern for 6 bolts', () => {
        const pattern = torqueService.generateCrossPattern(6);

        expect(pattern).toHaveLength(6);
        // Cross pattern should alternate across the pattern
        expect(pattern[0]).toBe(1);
        expect(pattern[1]).toBe(4);
      });

      it('should handle odd number of bolts', () => {
        const pattern = torqueService.generateCrossPattern(5);

        expect(pattern).toHaveLength(5);
        expect(pattern).toContain(1);
        expect(pattern).toContain(5);
      });
    });

    describe('generateLinearPattern', () => {
      it('should generate sequential linear pattern', () => {
        const pattern = torqueService.generateLinearPattern(5);

        expect(pattern).toHaveLength(5);
        expect(pattern).toEqual([1, 2, 3, 4, 5]);
      });

      it('should handle single bolt', () => {
        const pattern = torqueService.generateLinearPattern(1);

        expect(pattern).toHaveLength(1);
        expect(pattern[0]).toBe(1);
      });

      it('should handle large number of bolts', () => {
        const pattern = torqueService.generateLinearPattern(20);

        expect(pattern).toHaveLength(20);
        expect(pattern[0]).toBe(1);
        expect(pattern[19]).toBe(20);
      });
    });
  });

  describe('getTorqueAnalytics', () => {
    const mockEvents: TorqueEvent[] = [
      {
        id: 'event-1',
        sequenceId: 'seq-1',
        sessionId: 'session-1',
        passNumber: 1,
        actualTorque: 150.0,
        targetTorque: 150.0,
        angle: 45.0,
        status: TorqueStatus.PASS,
        isValid: true,
        deviation: 0,
        percentDeviation: 0,
        wrenchId: 'wrench-001',
        operatorId: 'operator-123',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        createdAt: new Date('2024-01-01T10:00:00Z')
      },
      {
        id: 'event-2',
        sequenceId: 'seq-2',
        sessionId: 'session-1',
        passNumber: 1,
        actualTorque: 140.0,
        targetTorque: 150.0,
        angle: 45.0,
        status: TorqueStatus.UNDER_TORQUE,
        isValid: false,
        deviation: -10.0,
        percentDeviation: -6.67,
        wrenchId: 'wrench-001',
        operatorId: 'operator-123',
        timestamp: new Date('2024-01-01T10:05:00Z'),
        createdAt: new Date('2024-01-01T10:05:00Z')
      }
    ];

    it('should calculate correct analytics from events', async () => {
      const analytics = await torqueService.getTorqueAnalytics('spec-123', mockEvents);

      expect(analytics.totalEvents).toBe(2);
      expect(analytics.passCount).toBe(1);
      expect(analytics.failCount).toBe(1);
      expect(analytics.firstPassYield).toBe(50);
      expect(analytics.averageTorque).toBe(145.0);
      expect(analytics.averageDeviation).toBe(-5.0);
      expect(analytics.standardDeviation).toBeCloseTo(7.07, 2);
    });

    it('should handle empty events array', async () => {
      const analytics = await torqueService.getTorqueAnalytics('spec-123', []);

      expect(analytics.totalEvents).toBe(0);
      expect(analytics.passCount).toBe(0);
      expect(analytics.failCount).toBe(0);
      expect(analytics.firstPassYield).toBe(0);
      expect(analytics.averageTorque).toBe(0);
      expect(analytics.averageDeviation).toBe(0);
      expect(analytics.standardDeviation).toBe(0);
    });

    it('should calculate process capability index (Cpk)', async () => {
      const analytics = await torqueService.getTorqueAnalytics('spec-123', mockEvents);

      expect(analytics.processCapability).toBeDefined();
      if (analytics.processCapability) {
        expect(analytics.processCapability.cpk).toBeGreaterThanOrEqual(0);
      }
    });

    it('should identify trends in torque data', async () => {
      const trendEvents = Array.from({ length: 10 }, (_, i) => ({
        ...mockEvents[0],
        id: `event-${i + 1}`,
        actualTorque: 145 + i, // Increasing trend
        timestamp: new Date(`2024-01-01T${10 + i}:00:00Z`)
      }));

      const analytics = await torqueService.getTorqueAnalytics('spec-123', trendEvents);

      expect(analytics.trends).toBeDefined();
      expect(analytics.trends?.direction).toBeDefined();
    });
  });

  describe('generateTorqueReport', () => {
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

    const mockEvents: TorqueEvent[] = [
      {
        id: 'event-1',
        sequenceId: 'seq-1',
        sessionId: 'session-1',
        passNumber: 1,
        actualTorque: 150.0,
        targetTorque: 150.0,
        angle: 45.0,
        status: TorqueStatus.PASS,
        isValid: true,
        deviation: 0,
        percentDeviation: 0,
        wrenchId: 'wrench-001',
        operatorId: 'operator-123',
        timestamp: new Date(),
        createdAt: new Date()
      }
    ];

    it('should generate comprehensive torque report', async () => {
      const report = await torqueService.generateTorqueReport(
        mockSpec,
        mockEvents,
        'session-123'
      );

      expect(report).toBeDefined();
      expect(report.specification).toEqual(mockSpec);
      expect(report.events).toEqual(mockEvents);
      expect(report.sessionId).toBe('session-123');
      expect(report.analytics).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.generatedAt).toBeDefined();
      expect(report.reportId).toBeTruthy();
    });

    it('should include analytics in report', async () => {
      const report = await torqueService.generateTorqueReport(
        mockSpec,
        mockEvents,
        'session-123'
      );

      expect(report.analytics.totalEvents).toBe(1);
      expect(report.analytics.passCount).toBe(1);
      expect(report.analytics.failCount).toBe(0);
      expect(report.analytics.firstPassYield).toBe(100);
    });

    it('should include summary information', async () => {
      const report = await torqueService.generateTorqueReport(
        mockSpec,
        mockEvents,
        'session-123'
      );

      expect(report.summary.overallStatus).toBe('PASS');
      expect(report.summary.completedBolts).toBeGreaterThan(0);
      expect(report.summary.operatorCount).toBeGreaterThan(0);
      expect(report.summary.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty events gracefully', async () => {
      const report = await torqueService.generateTorqueReport(
        mockSpec,
        [],
        'session-123'
      );

      expect(report.events).toHaveLength(0);
      expect(report.analytics.totalEvents).toBe(0);
      expect(report.summary.overallStatus).toBe('INCOMPLETE');
    });
  });

  describe('Event Emission', () => {
    it('should emit validationComplete event on validation', () => {
      const eventSpy = vi.fn();
      torqueService.on('validationComplete', eventSpy);

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

      torqueService.validateTorqueReading(150.0, mockSpec);

      expect(eventSpy).toHaveBeenCalledOnce();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: true,
          status: TorqueStatus.PASS
        })
      );
    });

    it('should emit sequenceProgress event on sequence updates', async () => {
      const eventSpy = vi.fn();
      torqueService.on('sequenceProgress', eventSpy);

      const sequenceData = {
        specificationId: 'spec-123',
        boltPosition: 1,
        sequenceNumber: 1,
        x: 100,
        y: 100,
        description: 'Bolt 1'
      };

      await torqueService.createTorqueSequence(sequenceData);

      expect(eventSpy).toHaveBeenCalledOnce();
    });
  });
});