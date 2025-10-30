import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TorqueOrchestrationService } from '@/services/TorqueOrchestrationService';
import { TorqueService } from '@/services/TorqueService';
import { DigitalWrenchService } from '@/services/DigitalWrenchService';
import { TorqueValidationService } from '@/services/TorqueValidationService';
import { TorqueRealtimeService } from '@/services/TorqueRealtimeService';
import {
  TorqueSession,
  TorqueSpecification,
  TorqueSequence,
  TorqueEvent,
  TorqueStatus,
  TorqueMethod,
  TorquePattern,
  DigitalWrenchReading,
  TorqueValidationResult,
  ValidationSeverity,
  SessionStatus
} from '@/types/torque';

// Mock the dependencies
vi.mock('@/services/TorqueService');
vi.mock('@/services/DigitalWrenchService');
vi.mock('@/services/TorqueValidationService');
vi.mock('@/services/TorqueRealtimeService');

describe('TorqueOrchestrationService', () => {
  let orchestrationService: TorqueOrchestrationService;
  let mockTorqueService: TorqueService;
  let mockWrenchService: DigitalWrenchService;
  let mockValidationService: TorqueValidationService;
  let mockRealtimeService: TorqueRealtimeService;

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

  const mockSequences: TorqueSequence[] = [
    {
      id: 'seq-001',
      specificationId: 'spec-123',
      boltPosition: 1,
      sequenceNumber: 1,
      x: 100,
      y: 100,
      description: 'Bolt 1',
      createdAt: new Date()
    },
    {
      id: 'seq-002',
      specificationId: 'spec-123',
      boltPosition: 2,
      sequenceNumber: 2,
      x: 200,
      y: 100,
      description: 'Bolt 2',
      createdAt: new Date()
    }
  ];

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock instances
    mockTorqueService = new TorqueService();
    mockWrenchService = new DigitalWrenchService();
    mockValidationService = new TorqueValidationService();
    mockRealtimeService = new TorqueRealtimeService();

    // Setup mock implementations
    vi.mocked(mockTorqueService.getTorqueSpecification).mockResolvedValue(mockSpec);
    vi.mocked(mockTorqueService.getTorqueSequences).mockResolvedValue(mockSequences);
    vi.mocked(mockWrenchService.isConnected).mockReturnValue(true);
    vi.mocked(mockValidationService.createSession).mockResolvedValue({
      sessionId: 'session-123',
      specification: mockSpec,
      isActive: true,
      startTime: new Date(),
      validationResults: []
    });
    vi.mocked(mockRealtimeService.isRunning).mockReturnValue(true);

    orchestrationService = new TorqueOrchestrationService(
      mockTorqueService,
      mockWrenchService,
      mockValidationService,
      mockRealtimeService
    );
  });

  afterEach(() => {
    orchestrationService.stop();
  });

  describe('Service Lifecycle', () => {
    it('should start service successfully', async () => {
      const result = await orchestrationService.start();

      expect(result).toBe(true);
      expect(orchestrationService.isRunning()).toBe(true);
    });

    it('should stop service successfully', async () => {
      await orchestrationService.start();
      const result = await orchestrationService.stop();

      expect(result).toBe(true);
      expect(orchestrationService.isRunning()).toBe(false);
    });

    it('should not start service twice', async () => {
      await orchestrationService.start();

      await expect(
        orchestrationService.start()
      ).rejects.toThrow('Orchestration service is already running');
    });
  });

  describe('Session Management', () => {
    beforeEach(async () => {
      await orchestrationService.start();
    });

    it('should create torque session successfully', async () => {
      const session = await orchestrationService.createSession(
        'session-123',
        'spec-123',
        'operator-456',
        'wrench-001'
      );

      expect(session).toBeDefined();
      expect(session.sessionId).toBe('session-123');
      expect(session.specificationId).toBe('spec-123');
      expect(session.operatorId).toBe('operator-456');
      expect(session.wrenchId).toBe('wrench-001');
      expect(session.status).toBe(SessionStatus.ACTIVE);
      expect(session.startTime).toBeInstanceOf(Date);
      expect(session.currentSequenceIndex).toBe(0);
      expect(session.currentPassNumber).toBe(1);
    });

    it('should reject session creation for non-existent specification', async () => {
      vi.mocked(mockTorqueService.getTorqueSpecification).mockResolvedValue(null);

      await expect(
        orchestrationService.createSession('session-123', 'non-existent', 'operator-456', 'wrench-001')
      ).rejects.toThrow('Torque specification not found: non-existent');
    });

    it('should reject session creation for disconnected wrench', async () => {
      vi.mocked(mockWrenchService.isConnected).mockReturnValue(false);

      await expect(
        orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001')
      ).rejects.toThrow('Digital wrench wrench-001 is not connected');
    });

    it('should reject duplicate session IDs', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      await expect(
        orchestrationService.createSession('session-123', 'spec-123', 'operator-789', 'wrench-002')
      ).rejects.toThrow('Session with ID session-123 already exists');
    });

    it('should get session by ID', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      const session = orchestrationService.getSession('session-123');

      expect(session).toBeDefined();
      expect(session?.sessionId).toBe('session-123');
    });

    it('should return undefined for non-existent session', () => {
      const session = orchestrationService.getSession('non-existent');

      expect(session).toBeUndefined();
    });

    it('should end session successfully', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      const result = await orchestrationService.endSession('session-123');

      expect(result).toBe(true);

      const session = orchestrationService.getSession('session-123');
      expect(session?.status).toBe(SessionStatus.COMPLETED);
      expect(session?.endTime).toBeInstanceOf(Date);
    });

    it('should fail to end non-existent session', async () => {
      await expect(
        orchestrationService.endSession('non-existent')
      ).rejects.toThrow('Session not found: non-existent');
    });

    it('should pause and resume session', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      await orchestrationService.pauseSession('session-123');
      const pausedSession = orchestrationService.getSession('session-123');
      expect(pausedSession?.status).toBe(SessionStatus.PAUSED);

      await orchestrationService.resumeSession('session-123');
      const resumedSession = orchestrationService.getSession('session-123');
      expect(resumedSession?.status).toBe(SessionStatus.ACTIVE);
    });
  });

  describe('Torque Reading Processing', () => {
    beforeEach(async () => {
      await orchestrationService.start();
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');
    });

    it('should process valid torque reading successfully', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      const mockTorqueEvent: TorqueEvent = {
        id: 'event-001',
        sequenceId: 'seq-001',
        sessionId: 'session-123',
        passNumber: 1,
        actualTorque: 150.0,
        targetTorque: 150.0,
        angle: 45.0,
        status: TorqueStatus.PASS,
        isValid: true,
        deviation: 0,
        percentDeviation: 0,
        wrenchId: 'wrench-001',
        operatorId: 'operator-456',
        timestamp: new Date(),
        createdAt: new Date()
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);
      vi.mocked(mockTorqueService.recordTorqueEvent).mockResolvedValue(mockTorqueEvent);

      const result = await orchestrationService.processTorqueReading('session-123', reading);

      expect(result).toBeDefined();
      expect(result.event).toEqual(mockTorqueEvent);
      expect(result.validationResult).toEqual(mockValidationResult);
      expect(result.nextSequence).toBeDefined();

      expect(mockValidationService.validateReading).toHaveBeenCalledWith('session-123', reading);
      expect(mockTorqueService.recordTorqueEvent).toHaveBeenCalled();
      expect(mockRealtimeService.broadcastTorqueEvent).toHaveBeenCalledWith(mockTorqueEvent);
      expect(mockRealtimeService.broadcastValidationResult).toHaveBeenCalledWith(mockValidationResult);
    });

    it('should handle out-of-spec torque reading', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 165.0, // Over tolerance
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: false,
        status: TorqueStatus.OVER_TORQUE,
        deviation: 15.0,
        percentDeviation: 10.0,
        message: 'Reading above specification',
        severity: ValidationSeverity.ERROR,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      const alertSpy = vi.fn();
      orchestrationService.on('outOfSpecAlert', alertSpy);

      await orchestrationService.processTorqueReading('session-123', reading);

      expect(alertSpy).toHaveBeenCalledOnce();
      expect(alertSpy).toHaveBeenCalledWith({
        sessionId: 'session-123',
        reading,
        validationResult: mockValidationResult,
        severity: ValidationSeverity.ERROR
      });
    });

    it('should fail to process reading for non-existent session', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      await expect(
        orchestrationService.processTorqueReading('non-existent', reading)
      ).rejects.toThrow('Session not found: non-existent');
    });

    it('should fail to process reading for inactive session', async () => {
      await orchestrationService.pauseSession('session-123');

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      await expect(
        orchestrationService.processTorqueReading('session-123', reading)
      ).rejects.toThrow('Session session-123 is not active');
    });
  });

  describe('Sequence Management', () => {
    beforeEach(async () => {
      await orchestrationService.start();
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');
    });

    it('should advance to next sequence after successful torque', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      await orchestrationService.processTorqueReading('session-123', reading);

      const session = orchestrationService.getSession('session-123');
      expect(session?.currentSequenceIndex).toBe(1); // Advanced to next sequence
    });

    it('should advance to next pass when all sequences completed', async () => {
      // Complete first sequence
      let session = orchestrationService.getSession('session-123');
      if (session) {
        session.currentSequenceIndex = 1; // Second sequence (last one)
      }

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      await orchestrationService.processTorqueReading('session-123', reading);

      session = orchestrationService.getSession('session-123');
      expect(session?.currentPassNumber).toBe(2); // Advanced to next pass
      expect(session?.currentSequenceIndex).toBe(0); // Reset to first sequence
    });

    it('should complete session when all passes finished', async () => {
      // Set up session at last pass, last sequence
      let session = orchestrationService.getSession('session-123');
      if (session) {
        session.currentPassNumber = 2; // Last pass
        session.currentSequenceIndex = 1; // Last sequence
      }

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      await orchestrationService.processTorqueReading('session-123', reading);

      session = orchestrationService.getSession('session-123');
      expect(session?.status).toBe(SessionStatus.COMPLETED);
      expect(session?.endTime).toBeInstanceOf(Date);
    });

    it('should get current sequence for session', () => {
      const currentSequence = orchestrationService.getCurrentSequence('session-123');

      expect(currentSequence).toEqual(mockSequences[0]); // First sequence
    });

    it('should get next sequence for session', () => {
      const nextSequence = orchestrationService.getNextSequence('session-123');

      expect(nextSequence).toEqual(mockSequences[1]); // Second sequence
    });

    it('should return undefined for next sequence at end', () => {
      let session = orchestrationService.getSession('session-123');
      if (session) {
        session.currentSequenceIndex = 1; // Last sequence
      }

      const nextSequence = orchestrationService.getNextSequence('session-123');

      expect(nextSequence).toBeUndefined();
    });
  });

  describe('Session Timeout Management', () => {
    beforeEach(async () => {
      await orchestrationService.start();
    });

    it('should timeout inactive sessions', async () => {
      const timeoutSpy = vi.fn();
      orchestrationService.on('sessionTimeout', timeoutSpy);

      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      // Manually set last activity to past
      const session = orchestrationService.getSession('session-123');
      if (session) {
        session.lastActivity = new Date(Date.now() - 32 * 60 * 1000); // 32 minutes ago
      }

      orchestrationService.checkSessionTimeouts();

      expect(timeoutSpy).toHaveBeenCalledOnce();
      expect(timeoutSpy).toHaveBeenCalledWith('session-123');

      const timedOutSession = orchestrationService.getSession('session-123');
      expect(timedOutSession?.status).toBe(SessionStatus.TIMEOUT);
    });

    it('should not timeout active sessions', async () => {
      const timeoutSpy = vi.fn();
      orchestrationService.on('sessionTimeout', timeoutSpy);

      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      orchestrationService.checkSessionTimeouts();

      expect(timeoutSpy).not.toHaveBeenCalled();

      const session = orchestrationService.getSession('session-123');
      expect(session?.status).toBe(SessionStatus.ACTIVE);
    });

    it('should update last activity on torque reading', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      const initialActivity = orchestrationService.getSession('session-123')?.lastActivity;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      await orchestrationService.processTorqueReading('session-123', reading);

      const updatedActivity = orchestrationService.getSession('session-123')?.lastActivity;

      expect(updatedActivity?.getTime()).toBeGreaterThan(initialActivity?.getTime() || 0);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await orchestrationService.start();
    });

    it('should get service statistics', async () => {
      await orchestrationService.createSession('session-1', 'spec-123', 'operator-1', 'wrench-001');
      await orchestrationService.createSession('session-2', 'spec-123', 'operator-2', 'wrench-001');

      const stats = orchestrationService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBe(2);
      expect(stats.activeSessions).toBe(2);
      expect(stats.completedSessions).toBe(0);
      expect(stats.pausedSessions).toBe(0);
      expect(stats.timeoutSessions).toBe(0);
      expect(stats.averageSessionDuration).toBe(0); // No completed sessions yet
      expect(stats.isRunning).toBe(true);
    });

    it('should track session completion statistics', async () => {
      await orchestrationService.createSession('session-1', 'spec-123', 'operator-1', 'wrench-001');
      await orchestrationService.endSession('session-1');

      const stats = orchestrationService.getStatistics();

      expect(stats.completedSessions).toBe(1);
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
    });

    it('should get session performance metrics', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      // Simulate some torque events
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      await orchestrationService.processTorqueReading('session-123', reading);

      const metrics = orchestrationService.getSessionMetrics('session-123');

      expect(metrics).toBeDefined();
      expect(metrics?.sessionId).toBe('session-123');
      expect(metrics?.totalReadings).toBe(1);
      expect(metrics?.passedReadings).toBe(1);
      expect(metrics?.failedReadings).toBe(0);
      expect(metrics?.passRate).toBe(100);
      expect(metrics?.averageTorque).toBe(150.0);
      expect(metrics?.currentSequenceIndex).toBe(1); // Should have advanced
      expect(metrics?.currentPassNumber).toBe(1);
    });
  });

  describe('Error Recovery', () => {
    beforeEach(async () => {
      await orchestrationService.start();
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');
    });

    it('should handle validation service errors gracefully', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      vi.mocked(mockValidationService.validateReading).mockRejectedValue(new Error('Validation failed'));

      const errorSpy = vi.fn();
      orchestrationService.on('processingError', errorSpy);

      await expect(
        orchestrationService.processTorqueReading('session-123', reading)
      ).rejects.toThrow('Validation failed');

      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('should handle torque service errors gracefully', async () => {
      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);
      vi.mocked(mockTorqueService.recordTorqueEvent).mockRejectedValue(new Error('Database error'));

      const errorSpy = vi.fn();
      orchestrationService.on('processingError', errorSpy);

      await expect(
        orchestrationService.processTorqueReading('session-123', reading)
      ).rejects.toThrow('Database error');

      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('should recover from wrench disconnection', async () => {
      const disconnectionSpy = vi.fn();
      orchestrationService.on('wrenchDisconnected', disconnectionSpy);

      vi.mocked(mockWrenchService.isConnected).mockReturnValue(false);

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      await expect(
        orchestrationService.processTorqueReading('session-123', reading)
      ).rejects.toThrow('Digital wrench wrench-001 is not connected');

      expect(disconnectionSpy).toHaveBeenCalledOnce();
      expect(disconnectionSpy).toHaveBeenCalledWith('session-123', 'wrench-001');

      const session = orchestrationService.getSession('session-123');
      expect(session?.status).toBe(SessionStatus.ERROR);
    });
  });

  describe('Integration with Services', () => {
    beforeEach(async () => {
      await orchestrationService.start();
    });

    it('should integrate with all required services on startup', () => {
      expect(mockRealtimeService.isRunning).toHaveBeenCalled();
    });

    it('should coordinate session creation across services', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      expect(mockTorqueService.getTorqueSpecification).toHaveBeenCalledWith('spec-123');
      expect(mockTorqueService.getTorqueSequences).toHaveBeenCalledWith('spec-123');
      expect(mockWrenchService.isConnected).toHaveBeenCalledWith('wrench-001');
      expect(mockValidationService.createSession).toHaveBeenCalledWith('session-123', mockSpec);
    });

    it('should coordinate torque reading processing across services', async () => {
      await orchestrationService.createSession('session-123', 'spec-123', 'operator-456', 'wrench-001');

      const reading: DigitalWrenchReading = {
        wrenchId: 'wrench-001',
        torque: 150.0,
        angle: 45.0,
        timestamp: new Date(),
        units: 'Nm',
        temperature: 20.0,
        batteryLevel: 85
      };

      const mockValidationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: [reading]
      };

      vi.mocked(mockValidationService.validateReading).mockResolvedValue(mockValidationResult);

      await orchestrationService.processTorqueReading('session-123', reading);

      expect(mockValidationService.validateReading).toHaveBeenCalledWith('session-123', reading);
      expect(mockTorqueService.recordTorqueEvent).toHaveBeenCalled();
      expect(mockRealtimeService.broadcastTorqueEvent).toHaveBeenCalled();
      expect(mockRealtimeService.broadcastValidationResult).toHaveBeenCalledWith(mockValidationResult);
    });

    it('should handle service dependencies correctly', async () => {
      // Test when realtime service is not running
      vi.mocked(mockRealtimeService.isRunning).mockReturnValue(false);

      await expect(
        orchestrationService.start()
      ).rejects.toThrow('Realtime service must be running before starting orchestration');
    });
  });
});