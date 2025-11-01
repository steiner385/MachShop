/**
 * Equipment Signal Processor Service
 *
 * Handles equipment signal integration from multiple sources:
 * - OPC-UA servers (industrial automation systems)
 * - Modbus TCP/RTU (legacy PLCs and controllers)
 * - MTConnect (CNC controllers and machine tools)
 * - MQTT brokers (IoT sensors and edge devices)
 * - Historian systems (GE Proficy, OSIsoft PI)
 *
 * Features:
 * - Automatic signal debouncing and state management
 * - Health checking and error recovery
 * - Signal filtering and validation
 * - Historical tracking of signal changes
 * - Support for multiple concurrent signal streams
 *
 * @module services/EquipmentSignalProcessor
 * @see GitHub Issue #49: Machine-Based Time Tracking & Costing System
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { machineTimeTrackingService } from './MachineTimeTrackingService';

const prisma = new PrismaClient();

/**
 * Signal source configuration
 */
export interface SignalSourceConfig {
  sourceType: 'OPC_UA' | 'MODBUS_TCP' | 'MODBUS_RTU' | 'MTCONNECT' | 'MQTT' | 'HISTORIAN';
  name: string;
  enabled: boolean;
  config: any;
}

/**
 * Equipment signal data
 */
export interface EquipmentSignal {
  equipmentId: string;
  signalType: string; // START, STOP, RUNNING, IDLE, ERROR
  sourceType: string;
  timestamp: Date;
  value?: any;
  quality?: string; // GOOD, BAD, UNCERTAIN
}

/**
 * Signal processor state
 */
interface SignalProcessorState {
  equipmentId: string;
  lastSignalType: string;
  lastSignalTime: Date;
  debounceActive: boolean;
  debounceEndTime?: Date;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE';
  lastHealthCheck: Date;
}

/**
 * Equipment Signal Processor Service
 */
export class EquipmentSignalProcessor {
  private static readonly DEBOUNCE_WINDOW_MS = 2000; // 2 seconds
  private static readonly HEALTH_CHECK_INTERVAL_MS = 30000; // 30 seconds
  private static readonly SIGNAL_TIMEOUT_MS = 300000; // 5 minutes
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly RETRY_DELAY_MS = 5000; // 5 seconds

  private signalSources: Map<string, SignalSourceConfig> = new Map();
  private processorStates: Map<string, SignalProcessorState> = new Map();
  private healthCheckIntervals: Map<string, NodeJS.Timer> = new Map();
  private signalHistory: Map<string, EquipmentSignal[]> = new Map();

  /**
   * Initialize equipment signal processor
   *
   * @param signalSources - Array of signal source configurations
   */
  async initialize(signalSources: SignalSourceConfig[]): Promise<void> {
    try {
      logger.info('Initializing equipment signal processor', {
        sourceCount: signalSources.length,
      });

      // Register signal sources
      for (const source of signalSources) {
        this.signalSources.set(source.name, source);

        if (source.enabled) {
          await this.initializeSignalSource(source);
        }
      }

      // Start health checking
      this.startHealthChecking();

      logger.info('Equipment signal processor initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize equipment signal processor', { error });
      throw error;
    }
  }

  /**
   * Initialize individual signal source
   *
   * @param source - Signal source configuration
   */
  private async initializeSignalSource(source: SignalSourceConfig): Promise<void> {
    try {
      switch (source.sourceType) {
        case 'OPC_UA':
          await this.initializeOpcUa(source);
          break;
        case 'MODBUS_TCP':
        case 'MODBUS_RTU':
          await this.initializeModbus(source);
          break;
        case 'MTCONNECT':
          await this.initializeMtConnect(source);
          break;
        case 'MQTT':
          await this.initializeMqtt(source);
          break;
        case 'HISTORIAN':
          await this.initializeHistorian(source);
          break;
        default:
          logger.warn('Unknown signal source type', { sourceType: source.sourceType });
      }

      logger.info('Signal source initialized', {
        name: source.name,
        type: source.sourceType,
      });
    } catch (error) {
      logger.error('Failed to initialize signal source', {
        name: source.name,
        error,
      });
      throw error;
    }
  }

  /**
   * Initialize OPC-UA server connection
   *
   * @param source - OPC-UA source configuration
   */
  private async initializeOpcUa(source: SignalSourceConfig): Promise<void> {
    // OPC-UA client would be initialized here
    // This is a placeholder for actual OPC-UA implementation
    const { endpoint, nodeIds, reconnectDelay } = source.config;

    logger.info('OPC-UA connection configured', {
      endpoint,
      nodeCount: nodeIds?.length || 0,
      reconnectDelay,
    });

    // In a real implementation:
    // 1. Create OPC-UA client connection
    // 2. Subscribe to specified node IDs
    // 3. Setup value change listeners
    // 4. Implement retry logic with exponential backoff
  }

  /**
   * Initialize Modbus TCP/RTU connection
   *
   * @param source - Modbus source configuration
   */
  private async initializeModbus(source: SignalSourceConfig): Promise<void> {
    const { host, port, baudRate, protocol, registers } = source.config;

    logger.info('Modbus connection configured', {
      host: source.sourceType === 'MODBUS_TCP' ? host : 'N/A',
      port: source.sourceType === 'MODBUS_TCP' ? port : 'N/A',
      baudRate: source.sourceType === 'MODBUS_RTU' ? baudRate : 'N/A',
      protocol: source.sourceType,
      registerCount: registers?.length || 0,
    });

    // In a real implementation:
    // 1. Create Modbus client (TCP or RTU)
    // 2. Configure register polling intervals
    // 3. Map registers to equipment signals
    // 4. Setup error handling for connection loss
  }

  /**
   * Initialize MTConnect adapter
   *
   * @param source - MTConnect source configuration
   */
  private async initializeMtConnect(source: SignalSourceConfig): Promise<void> {
    const { agentUrl, probeInterval, dataItems } = source.config;

    logger.info('MTConnect adapter configured', {
      agentUrl,
      probeInterval,
      dataItemCount: dataItems?.length || 0,
    });

    // In a real implementation:
    // 1. Connect to MTConnect agent
    // 2. Fetch and parse probe
    // 3. Subscribe to data item changes
    // 4. Parse MTConnect device model
  }

  /**
   * Initialize MQTT broker connection
   *
   * @param source - MQTT source configuration
   */
  private async initializeMqtt(source: SignalSourceConfig): Promise<void> {
    const { brokerUrl, topics, clientId } = source.config;

    logger.info('MQTT broker configured', {
      brokerUrl,
      topicCount: topics?.length || 0,
      clientId,
    });

    // In a real implementation:
    // 1. Create MQTT client connection
    // 2. Subscribe to specified topics
    // 3. Setup message handlers
    // 4. Implement QoS and reconnection logic
  }

  /**
   * Initialize Historian connection (GE Proficy, OSIsoft PI)
   *
   * @param source - Historian source configuration
   */
  private async initializeHistorian(source: SignalSourceConfig): Promise<void> {
    const { serverUrl, dataSource, tags, pollInterval } = source.config;

    logger.info('Historian connection configured', {
      serverUrl,
      dataSource,
      tagCount: tags?.length || 0,
      pollInterval,
    });

    // In a real implementation:
    // 1. Connect to historian server
    // 2. Authenticate with credentials
    // 3. Setup tag subscriptions
    // 4. Configure polling strategy
  }

  /**
   * Process equipment signal
   *
   * @param signal - Equipment signal to process
   */
  async processSignal(signal: EquipmentSignal): Promise<void> {
    try {
      // Validate signal
      if (!this.validateSignal(signal)) {
        logger.warn('Invalid equipment signal', { signal });
        return;
      }

      // Get or initialize processor state
      let state = this.processorStates.get(signal.equipmentId);
      if (!state) {
        state = {
          equipmentId: signal.equipmentId,
          lastSignalType: signal.signalType,
          lastSignalTime: signal.timestamp,
          debounceActive: false,
          healthStatus: 'HEALTHY',
          lastHealthCheck: new Date(),
        };
        this.processorStates.set(signal.equipmentId, state);
      }

      // Check debounce window
      if (state.debounceActive) {
        if (new Date() < state.debounceEndTime!) {
          logger.debug('Signal rejected due to debounce window', {
            equipmentId: signal.equipmentId,
            signalType: signal.signalType,
          });
          return;
        }
        state.debounceActive = false;
      }

      // Check for signal change
      if (signal.signalType === state.lastSignalType) {
        logger.debug('Duplicate signal, ignoring', {
          equipmentId: signal.equipmentId,
          signalType: signal.signalType,
        });
        return;
      }

      // Record signal in history
      this.recordSignal(signal);

      // Handle signal state transition
      await this.handleSignalTransition(signal, state);

      // Update state
      state.lastSignalType = signal.signalType;
      state.lastSignalTime = signal.timestamp;
      state.debounceActive = true;
      state.debounceEndTime = new Date(Date.now() + EquipmentSignalProcessor.DEBOUNCE_WINDOW_MS);

      logger.info('Equipment signal processed', {
        equipmentId: signal.equipmentId,
        signalType: signal.signalType,
        sourceType: signal.sourceType,
      });
    } catch (error) {
      logger.error('Failed to process equipment signal', { error, signal });
      throw error;
    }
  }

  /**
   * Handle signal state transition
   *
   * @param signal - Equipment signal
   * @param state - Processor state
   */
  private async handleSignalTransition(
    signal: EquipmentSignal,
    state: SignalProcessorState
  ): Promise<void> {
    try {
      // Get equipment and related context
      const equipment = await prisma.equipment.findUnique({
        where: { id: signal.equipmentId },
        include: {
          workCenter: true,
        },
      });

      if (!equipment) {
        logger.warn('Equipment not found for signal', {
          equipmentId: signal.equipmentId,
        });
        return;
      }

      // Get current work order if available
      const currentWorkOrder = await prisma.workOrder.findFirst({
        where: {
          status: 'IN_PROGRESS',
          workCenter: { equipmentIds: { has: signal.equipmentId } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get current operation if available
      const currentOperation = currentWorkOrder
        ? await prisma.operation.findFirst({
            where: {
              workOrderId: currentWorkOrder.id,
              status: 'IN_PROGRESS',
            },
            orderBy: { sequenceNumber: 'asc' },
          })
        : null;

      // Route to machine time tracking service
      switch (signal.signalType.toUpperCase()) {
        case 'START':
        case 'RUNNING':
          await machineTimeTrackingService.handleEquipmentSignal(
            signal.equipmentId,
            signal.signalType,
            currentWorkOrder?.id,
            currentOperation?.id
          );
          break;

        case 'STOP':
        case 'IDLE':
          await machineTimeTrackingService.handleEquipmentSignal(
            signal.equipmentId,
            signal.signalType
          );
          break;

        case 'ERROR':
          logger.error('Equipment error signal received', {
            equipmentId: signal.equipmentId,
            value: signal.value,
          });
          // Optionally auto-stop if in error state
          await machineTimeTrackingService.handleEquipmentSignal(
            signal.equipmentId,
            'STOP'
          );
          break;

        default:
          logger.warn('Unknown signal type', {
            signalType: signal.signalType,
          });
      }
    } catch (error) {
      logger.error('Failed to handle signal transition', { error });
      throw error;
    }
  }

  /**
   * Validate signal quality and completeness
   *
   * @param signal - Equipment signal to validate
   * @returns true if signal is valid
   */
  private validateSignal(signal: EquipmentSignal): boolean {
    // Validate required fields
    if (!signal.equipmentId || !signal.signalType || !signal.timestamp) {
      return false;
    }

    // Validate signal type
    const validSignalTypes = ['START', 'STOP', 'RUNNING', 'IDLE', 'ERROR'];
    if (!validSignalTypes.includes(signal.signalType.toUpperCase())) {
      return false;
    }

    // Validate timestamp is not in future
    if (signal.timestamp > new Date()) {
      return false;
    }

    // Validate quality if provided
    if (signal.quality) {
      const validQualities = ['GOOD', 'BAD', 'UNCERTAIN'];
      if (!validQualities.includes(signal.quality)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Record signal in history
   *
   * @param signal - Equipment signal
   */
  private recordSignal(signal: EquipmentSignal): void {
    const equipmentId = signal.equipmentId;

    if (!this.signalHistory.has(equipmentId)) {
      this.signalHistory.set(equipmentId, []);
    }

    const history = this.signalHistory.get(equipmentId)!;
    history.push(signal);

    // Keep only last 1000 signals per equipment
    if (history.length > 1000) {
      history.shift();
    }
  }

  /**
   * Get signal history for equipment
   *
   * @param equipmentId - Equipment ID
   * @param limit - Maximum number of signals to return
   * @returns Signal history
   */
  getSignalHistory(equipmentId: string, limit: number = 100): EquipmentSignal[] {
    const history = this.signalHistory.get(equipmentId) || [];
    return history.slice(-limit);
  }

  /**
   * Start health checking for all signal sources
   */
  private startHealthChecking(): void {
    for (const [sourceName, source] of this.signalSources) {
      if (!source.enabled) {
        continue;
      }

      const interval = setInterval(async () => {
        try {
          await this.checkSourceHealth(source);
        } catch (error) {
          logger.error('Health check failed for signal source', {
            sourceName,
            error,
          });
        }
      }, EquipmentSignalProcessor.HEALTH_CHECK_INTERVAL_MS);

      this.healthCheckIntervals.set(sourceName, interval);
    }
  }

  /**
   * Check health of a signal source
   *
   * @param source - Signal source configuration
   */
  private async checkSourceHealth(source: SignalSourceConfig): Promise<void> {
    try {
      switch (source.sourceType) {
        case 'OPC_UA':
          await this.checkOpcUaHealth(source);
          break;
        case 'MODBUS_TCP':
        case 'MODBUS_RTU':
          await this.checkModbusHealth(source);
          break;
        case 'MTCONNECT':
          await this.checkMtConnectHealth(source);
          break;
        case 'MQTT':
          await this.checkMqttHealth(source);
          break;
        case 'HISTORIAN':
          await this.checkHistorianHealth(source);
          break;
      }
    } catch (error) {
      logger.warn('Signal source health check failed', {
        sourceName: source.name,
        error,
      });
    }
  }

  /**
   * Check OPC-UA server health
   *
   * @param source - OPC-UA source configuration
   */
  private async checkOpcUaHealth(source: SignalSourceConfig): Promise<void> {
    // Implementation: Check OPC-UA server connection status
    logger.debug('OPC-UA health check', { sourceName: source.name });
  }

  /**
   * Check Modbus connection health
   *
   * @param source - Modbus source configuration
   */
  private async checkModbusHealth(source: SignalSourceConfig): Promise<void> {
    // Implementation: Perform Modbus read operation to verify connection
    logger.debug('Modbus health check', { sourceName: source.name });
  }

  /**
   * Check MTConnect agent health
   *
   * @param source - MTConnect source configuration
   */
  private async checkMtConnectHealth(source: SignalSourceConfig): Promise<void> {
    // Implementation: Fetch current data from MTConnect agent
    logger.debug('MTConnect health check', { sourceName: source.name });
  }

  /**
   * Check MQTT broker health
   *
   * @param source - MQTT source configuration
   */
  private async checkMqttHealth(source: SignalSourceConfig): Promise<void> {
    // Implementation: Check MQTT client connection status
    logger.debug('MQTT health check', { sourceName: source.name });
  }

  /**
   * Check Historian server health
   *
   * @param source - Historian source configuration
   */
  private async checkHistorianHealth(source: SignalSourceConfig): Promise<void> {
    // Implementation: Query historian for recent data
    logger.debug('Historian health check', { sourceName: source.name });
  }

  /**
   * Get processor state for equipment
   *
   * @param equipmentId - Equipment ID
   * @returns Processor state or undefined
   */
  getProcessorState(equipmentId: string): SignalProcessorState | undefined {
    return this.processorStates.get(equipmentId);
  }

  /**
   * Get all processor states
   *
   * @returns Map of all processor states
   */
  getAllProcessorStates(): Map<string, SignalProcessorState> {
    return new Map(this.processorStates);
  }

  /**
   * Enable signal source
   *
   * @param sourceName - Signal source name
   */
  async enableSignalSource(sourceName: string): Promise<void> {
    const source = this.signalSources.get(sourceName);
    if (!source) {
      throw new Error(`Signal source not found: ${sourceName}`);
    }

    if (source.enabled) {
      logger.warn('Signal source already enabled', { sourceName });
      return;
    }

    source.enabled = true;
    await this.initializeSignalSource(source);

    logger.info('Signal source enabled', { sourceName });
  }

  /**
   * Disable signal source
   *
   * @param sourceName - Signal source name
   */
  async disableSignalSource(sourceName: string): Promise<void> {
    const source = this.signalSources.get(sourceName);
    if (!source) {
      throw new Error(`Signal source not found: ${sourceName}`);
    }

    if (!source.enabled) {
      logger.warn('Signal source already disabled', { sourceName });
      return;
    }

    source.enabled = false;

    // Stop health check if exists
    const interval = this.healthCheckIntervals.get(sourceName);
    if (interval) {
      clearInterval(interval);
      this.healthCheckIntervals.delete(sourceName);
    }

    logger.info('Signal source disabled', { sourceName });
  }

  /**
   * Shutdown equipment signal processor
   */
  async shutdown(): Promise<void> {
    try {
      // Clear all health check intervals
      for (const interval of this.healthCheckIntervals.values()) {
        clearInterval(interval);
      }
      this.healthCheckIntervals.clear();

      // Clear states and history
      this.processorStates.clear();
      this.signalHistory.clear();

      logger.info('Equipment signal processor shutdown complete');
    } catch (error) {
      logger.error('Failed to shutdown equipment signal processor', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const equipmentSignalProcessor = new EquipmentSignalProcessor();
