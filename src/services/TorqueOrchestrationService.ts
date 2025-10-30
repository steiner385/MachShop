/**
 * Torque Orchestration Service
 * Coordinates real-time validation, digital wrench integration, and UI updates
 * Main entry point for the torque management system
 */

import { EventEmitter } from 'events';
import { TorqueValidationService } from './TorqueValidationService';
import { TorqueRealtimeService } from './TorqueRealtimeService';
import { DigitalWrenchService } from './DigitalWrenchService';
import { TorqueService } from './TorqueService';
import {
  TorqueSpecification,
  TorqueEvent,
  DigitalWrenchReading,
  DigitalWrenchConfig,
  TorqueValidationResult,
  SequenceGuidanceState,
  RealtimeTorqueEvent,
  TorqueSystemConfig,
  ValidationContext,
  TorqueError,
  TorqueErrorType
} from '../types/torque';

export interface TorqueOrchestrationConfig {
  enableRealTimeValidation: boolean;
  enableDigitalWrench: boolean;
  enableWebSocketBroadcast: boolean;
  validationConfig: TorqueSystemConfig;
  autoConnectWrenches: boolean;
  maxConcurrentSessions: number;
}

export interface ActiveSession {
  sessionId: string;
  workOrderId: string;
  torqueSpecId: string;
  operatorId: string;
  wrenchId?: string;
  validationSessionId?: string;
  guidanceState: SequenceGuidanceState;
  startTime: Date;
  lastActivity: Date;
  status: 'initializing' | 'ready' | 'active' | 'paused' | 'error' | 'completed';
}

export class TorqueOrchestrationService extends EventEmitter {
  private torqueService: TorqueService;
  private validationService: TorqueValidationService;
  private realtimeService: TorqueRealtimeService;
  private wrenchService: DigitalWrenchService;
  private config: TorqueOrchestrationConfig;
  private activeSessions: Map<string, ActiveSession> = new Map();
  private sessionTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    torqueService: TorqueService,
    config: TorqueOrchestrationConfig
  ) {
    super();
    this.torqueService = torqueService;
    this.config = config;

    // Initialize services
    this.validationService = new TorqueValidationService(config.validationConfig);
    this.realtimeService = new TorqueRealtimeService();
    this.wrenchService = new DigitalWrenchService();

    this.setupEventHandlers();
  }

  /**
   * Initialize the orchestration service
   */
  async initialize(httpServer?: any): Promise<void> {
    try {
      // Initialize WebSocket server if enabled
      if (this.config.enableWebSocketBroadcast && httpServer) {
        this.realtimeService.initialize(httpServer);
      }

      // Auto-connect configured wrenches
      if (this.config.autoConnectWrenches) {
        await this.autoConnectWrenches();
      }

      console.log('Torque orchestration service initialized successfully');
      this.emit('service_initialized');

    } catch (error) {
      console.error('Failed to initialize torque orchestration service:', error);
      throw error;
    }
  }

  /**
   * Start a new torque session
   */
  async startTorqueSession(
    workOrderId: string,
    torqueSpecId: string,
    operatorId: string,
    wrenchId?: string
  ): Promise<string> {
    try {
      // Check session limits
      if (this.activeSessions.size >= this.config.maxConcurrentSessions) {
        throw new Error('Maximum concurrent sessions reached');
      }

      // Get torque specification
      const torqueSpec = await this.torqueService.getTorqueSpecification(torqueSpecId);
      if (!torqueSpec) {
        throw new Error(`Torque specification ${torqueSpecId} not found`);
      }

      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Initialize guidance state
      const guidanceState: SequenceGuidanceState = {
        currentStep: {
          boltPosition: 1,
          passNumber: 1,
          targetTorque: torqueSpec.targetTorque,
          instructions: 'Position wrench on first bolt'
        },
        progress: {
          totalSteps: torqueSpec.fastenerCount * (torqueSpec.numberOfPasses || 1),
          completedSteps: 0,
          currentPass: 1,
          totalPasses: torqueSpec.numberOfPasses || 1,
          overallPercent: 0
        },
        visualData: {
          boltPositions: [], // Would be populated from sequences
          completedPositions: [],
          currentPosition: 1,
          nextPositions: [2, 3, 4]
        },
        status: 'initializing',
        messages: ['Initializing torque session...']
      };

      // Create active session
      const session: ActiveSession = {
        sessionId,
        workOrderId,
        torqueSpecId,
        operatorId,
        wrenchId,
        guidanceState,
        startTime: new Date(),
        lastActivity: new Date(),
        status: 'initializing'
      };

      this.activeSessions.set(sessionId, session);

      // Start validation session if enabled
      if (this.config.enableRealTimeValidation) {
        session.validationSessionId = await this.validationService.startValidationSession(
          workOrderId,
          torqueSpecId,
          operatorId
        );
      }

      // Connect to wrench if specified
      if (wrenchId && this.config.enableDigitalWrench) {
        try {
          const connected = await this.wrenchService.connectWrench(wrenchId);
          if (connected) {
            session.status = 'ready';
            guidanceState.status = 'ready';
            guidanceState.messages = ['Digital wrench connected. Ready to begin sequence.'];
          } else {
            session.status = 'error';
            guidanceState.status = 'error';
            guidanceState.messages = ['Failed to connect to digital wrench.'];
          }
        } catch (error) {
          console.error(`Failed to connect wrench ${wrenchId}:`, error);
          session.status = 'error';
          guidanceState.status = 'error';
          guidanceState.messages = [`Wrench connection error: ${error}`];
        }
      } else {
        session.status = 'ready';
        guidanceState.status = 'ready';
        guidanceState.messages = ['Session ready. Manual torque entry mode.'];
      }

      // Set session timeout
      const timeout = setTimeout(() => {
        this.handleSessionTimeout(sessionId);
      }, 30 * 60 * 1000); // 30 minutes

      this.sessionTimeouts.set(sessionId, timeout);

      // Broadcast session start
      if (this.config.enableWebSocketBroadcast) {
        this.realtimeService.broadcastSequenceUpdate(guidanceState, workOrderId, operatorId);
      }

      this.emit('session_started', {
        sessionId,
        workOrderId,
        operatorId,
        torqueSpecId
      });

      console.log(`Torque session ${sessionId} started for work order ${workOrderId}`);
      return sessionId;

    } catch (error) {
      console.error('Failed to start torque session:', error);
      throw error;
    }
  }

  /**
   * Process a torque reading
   */
  async processTorqueReading(
    sessionId: string,
    reading: DigitalWrenchReading,
    boltPosition: number,
    passNumber: number
  ): Promise<TorqueValidationResult> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    try {
      // Update session activity
      session.lastActivity = new Date();

      // Get torque specification
      const torqueSpec = await this.torqueService.getTorqueSpecification(session.torqueSpecId);
      if (!torqueSpec) {
        throw new Error(`Torque specification ${session.torqueSpecId} not found`);
      }

      // Create validation context
      const context: ValidationContext = {
        workOrderId: session.workOrderId,
        operatorId: session.operatorId,
        torqueSpecId: session.torqueSpecId,
        boltPosition,
        passNumber,
        sequenceId: undefined // Would be set if using sequences
      };

      // Validate the reading
      let validationResult: TorqueValidationResult;

      if (this.config.enableRealTimeValidation && session.validationSessionId) {
        validationResult = await this.validationService.validateTorqueReading(
          reading,
          torqueSpec,
          context,
          session.validationSessionId
        );
      } else {
        // Basic validation
        validationResult = await this.torqueService.validateTorqueReading(reading, torqueSpec);
      }

      // Update guidance state
      this.updateGuidanceState(session, boltPosition, passNumber, validationResult);

      // Record torque event
      await this.torqueService.recordTorqueEvent({
        workOrderId: session.workOrderId,
        torqueSpecId: session.torqueSpecId,
        serialNumber: undefined,
        actualTorque: reading.torqueValue,
        boltPosition,
        passNumber,
        digitalWrenchData: reading
      });

      // Broadcast real-time updates
      if (this.config.enableWebSocketBroadcast) {
        this.realtimeService.broadcastValidationResult(
          reading,
          validationResult,
          session.workOrderId,
          session.operatorId,
          boltPosition
        );

        this.realtimeService.broadcastSequenceUpdate(
          session.guidanceState,
          session.workOrderId,
          session.operatorId
        );
      }

      // Handle supervisor alerts
      if (validationResult.requiresSupervisorReview) {
        if (this.config.enableWebSocketBroadcast) {
          this.realtimeService.broadcastSupervisorAlert(
            'review_required',
            {
              reading,
              result: validationResult,
              boltPosition,
              passNumber
            },
            session.workOrderId,
            session.operatorId
          );
        }

        this.emit('supervisor_review_required', {
          sessionId,
          reading,
          validationResult,
          context
        });
      }

      // Handle rework requirement
      if (validationResult.requiresRework) {
        if (this.config.enableWebSocketBroadcast) {
          this.realtimeService.broadcastSupervisorAlert(
            'rework_needed',
            {
              reading,
              result: validationResult,
              boltPosition,
              passNumber,
              reason: validationResult.message
            },
            session.workOrderId,
            session.operatorId
          );
        }

        this.emit('rework_required', {
          sessionId,
          reading,
          validationResult,
          context
        });
      }

      // Check if sequence is complete
      if (this.isSequenceComplete(session)) {
        await this.completeSession(sessionId);
      }

      return validationResult;

    } catch (error) {
      console.error(`Error processing torque reading for session ${sessionId}:`, error);

      const torqueError: TorqueError = {
        type: TorqueErrorType.SEQUENCE_VALIDATION_FAILED,
        message: `Failed to process reading: ${error}`,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: ['Check wrench connection', 'Verify torque specification', 'Retry reading']
      };

      // Broadcast error
      if (this.config.enableWebSocketBroadcast) {
        this.realtimeService.broadcastError(torqueError, session.workOrderId, session.operatorId);
      }

      throw torqueError;
    }
  }

  /**
   * Update guidance state based on reading result
   */
  private updateGuidanceState(
    session: ActiveSession,
    boltPosition: number,
    passNumber: number,
    validationResult: TorqueValidationResult
  ): void {
    const guidanceState = session.guidanceState;

    // Update current position
    guidanceState.visualData.currentPosition = boltPosition;

    // Add to completed if in spec
    if (validationResult.isInSpec) {
      if (!guidanceState.visualData.completedPositions.includes(boltPosition)) {
        guidanceState.visualData.completedPositions.push(boltPosition);
        guidanceState.progress.completedSteps++;
      }
    }

    // Calculate progress
    guidanceState.progress.overallPercent =
      (guidanceState.progress.completedSteps / guidanceState.progress.totalSteps) * 100;

    // Update current step
    const nextBolt = this.getNextBoltPosition(session, boltPosition, passNumber);
    if (nextBolt) {
      guidanceState.currentStep = {
        boltPosition: nextBolt.position,
        passNumber: nextBolt.pass,
        targetTorque: validationResult.targetTorque,
        instructions: `Position wrench on bolt ${nextBolt.position}`
      };

      guidanceState.visualData.nextPositions = this.getUpcomingBolts(session, nextBolt.position, nextBolt.pass);
    }

    // Update status and messages
    if (validationResult.requiresRework) {
      guidanceState.status = 'out_of_spec';
      guidanceState.messages = [validationResult.message];
    } else if (validationResult.isInSpec) {
      guidanceState.status = 'in_progress';
      guidanceState.messages = ['Reading accepted. Proceed to next bolt.'];
    } else {
      guidanceState.status = 'waiting_for_input';
      guidanceState.messages = [validationResult.message];
    }

    // Update last event
    guidanceState.lastEvent = {
      id: `event_${Date.now()}`,
      workOrderNumber: session.workOrderId,
      boltPosition,
      passNumber,
      actualTorque: validationResult.targetTorque, // Would use actual reading value
      targetTorque: validationResult.targetTorque,
      isInSpec: validationResult.isInSpec,
      deviationPercent: validationResult.deviationPercent,
      timestamp: new Date(),
      operatorName: session.operatorId,
      requiresRework: validationResult.requiresRework
    };
  }

  /**
   * Get next bolt position in sequence
   */
  private getNextBoltPosition(
    session: ActiveSession,
    currentBolt: number,
    currentPass: number
  ): { position: number; pass: number } | null {
    // This would implement the actual sequence logic
    // For now, simple linear progression
    const torqueSpec = { fastenerCount: 8, numberOfPasses: 2 }; // Would get from actual spec

    if (currentPass < torqueSpec.numberOfPasses) {
      // Continue with next pass on same bolt
      return { position: currentBolt, pass: currentPass + 1 };
    } else if (currentBolt < torqueSpec.fastenerCount) {
      // Move to next bolt, first pass
      return { position: currentBolt + 1, pass: 1 };
    }

    return null; // Sequence complete
  }

  /**
   * Get upcoming bolt positions
   */
  private getUpcomingBolts(
    session: ActiveSession,
    currentBolt: number,
    currentPass: number
  ): number[] {
    const upcoming: number[] = [];
    let bolt = currentBolt;
    let pass = currentPass;

    for (let i = 0; i < 3; i++) {
      const next = this.getNextBoltPosition(session, bolt, pass);
      if (next) {
        upcoming.push(next.position);
        bolt = next.position;
        pass = next.pass;
      } else {
        break;
      }
    }

    return upcoming;
  }

  /**
   * Check if sequence is complete
   */
  private isSequenceComplete(session: ActiveSession): boolean {
    const guidanceState = session.guidanceState;
    return guidanceState.progress.completedSteps >= guidanceState.progress.totalSteps;
  }

  /**
   * Complete a torque session
   */
  async completeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      session.status = 'completed';
      session.guidanceState.status = 'completed';
      session.guidanceState.messages = ['Sequence completed successfully.'];

      // End validation session
      if (session.validationSessionId) {
        await this.validationService.endValidationSession(session.validationSessionId);
      }

      // Disconnect wrench if connected
      if (session.wrenchId) {
        await this.wrenchService.disconnectWrench(session.wrenchId);
      }

      // Clear timeout
      const timeout = this.sessionTimeouts.get(sessionId);
      if (timeout) {
        clearTimeout(timeout);
        this.sessionTimeouts.delete(sessionId);
      }

      // Broadcast completion
      if (this.config.enableWebSocketBroadcast) {
        this.realtimeService.broadcastSupervisorAlert(
          'sequence_complete',
          {
            sessionId,
            completedAt: new Date(),
            statistics: this.validationService.getValidationStatistics(session.workOrderId)
          },
          session.workOrderId,
          session.operatorId
        );
      }

      this.emit('session_completed', {
        sessionId,
        workOrderId: session.workOrderId,
        operatorId: session.operatorId,
        statistics: this.validationService.getValidationStatistics(session.workOrderId)
      });

      // Remove from active sessions
      this.activeSessions.delete(sessionId);

      console.log(`Torque session ${sessionId} completed`);

    } catch (error) {
      console.error(`Error completing session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Handle session timeout
   */
  private handleSessionTimeout(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    console.log(`Session ${sessionId} timed out`);

    session.status = 'error';
    session.guidanceState.status = 'error';
    session.guidanceState.messages = ['Session timed out due to inactivity.'];

    this.emit('session_timeout', { sessionId, session });

    // Clean up session
    this.completeSession(sessionId).catch(console.error);
  }

  /**
   * Auto-connect configured wrenches
   */
  private async autoConnectWrenches(): Promise<void> {
    try {
      const wrenches = this.wrenchService.getRegisteredWrenches();

      for (const wrench of wrenches) {
        if (wrench.isActive) {
          try {
            await this.wrenchService.connectWrench(wrench.id);
            console.log(`Auto-connected wrench: ${wrench.brand} ${wrench.model}`);
          } catch (error) {
            console.warn(`Failed to auto-connect wrench ${wrench.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('Error during auto-connect:', error);
    }
  }

  /**
   * Set up event handlers between services
   */
  private setupEventHandlers(): void {
    // Validation service events
    this.validationService.on('validation_result', (event: RealtimeTorqueEvent) => {
      this.emit('validation_result', event);
    });

    this.validationService.on('supervisor_review_required', (event: RealtimeTorqueEvent) => {
      this.emit('supervisor_review_required', event);
    });

    this.validationService.on('rework_required', (event: RealtimeTorqueEvent) => {
      this.emit('rework_required', event);
    });

    // Wrench service events
    this.wrenchService.on('torque_reading', (event: RealtimeTorqueEvent) => {
      this.emit('wrench_reading', event);
    });

    this.wrenchService.on('wrench_connected', (wrenchId: string) => {
      this.emit('wrench_connected', { wrenchId });
    });

    this.wrenchService.on('wrench_disconnected', (wrenchId: string) => {
      this.emit('wrench_disconnected', { wrenchId });
    });

    this.wrenchService.on('wrench_error', (error: TorqueError) => {
      this.emit('wrench_error', error);
    });
  }

  /**
   * Get active session information
   */
  getActiveSession(sessionId: string): ActiveSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getAllActiveSessions(): ActiveSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get service statistics
   */
  getServiceStatistics(): {
    activeSessions: number;
    totalValidations: number;
    connectedWrenches: number;
    realtimeConnections: number;
  } {
    const connectedWrenches = this.wrenchService.getRegisteredWrenches()
      .filter(w => w.isActive).length;

    const realtimeStats = this.realtimeService.getConnectionStats();

    return {
      activeSessions: this.activeSessions.size,
      totalValidations: 0, // Would get from validation service
      connectedWrenches,
      realtimeConnections: realtimeStats.authenticatedClients
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Complete all active sessions
    for (const sessionId of this.activeSessions.keys()) {
      await this.completeSession(sessionId);
    }

    // Clear timeouts
    for (const timeout of this.sessionTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.sessionTimeouts.clear();

    // Cleanup services
    await this.wrenchService.cleanup();
    this.realtimeService.cleanup();

    console.log('Torque orchestration service cleaned up');
  }
}

export default TorqueOrchestrationService;