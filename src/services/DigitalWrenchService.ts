/**
 * Digital Wrench Integration Service
 * Handles connection and data capture from digital torque wrenches
 * Supports multiple brands: Snap-on, Norbar, CDI, Gedore, Beta, Craftsman
 */

import { EventEmitter } from 'events';
import { WebBluetoothManager } from '../utils/bluetooth-manager';
import { WiFiManager } from '../utils/wifi-manager';
import { SerialPortManager } from '../utils/serial-manager';
import {
  DigitalWrenchConfig,
  DigitalWrenchReading,
  DigitalWrenchBrand,
  TorqueError,
  TorqueErrorType,
  RealtimeTorqueEvent
} from '../types/torque';

export interface WrenchConnectionStatus {
  isConnected: boolean;
  lastHeartbeat: Date;
  batteryLevel?: number;
  signalStrength?: number;
  calibrationStatus: 'valid' | 'expired' | 'unknown';
  errorCount: number;
  lastError?: string;
}

export interface WrenchProtocol {
  connect(config: DigitalWrenchConfig): Promise<boolean>;
  disconnect(): Promise<void>;
  readTorque(): Promise<DigitalWrenchReading>;
  getStatus(): Promise<WrenchConnectionStatus>;
  startContinuousReading(interval: number): void;
  stopContinuousReading(): void;
  validateCalibration(): Promise<boolean>;
}

/**
 * Generic Digital Wrench Protocol Implementation
 */
abstract class BaseWrenchProtocol extends EventEmitter implements WrenchProtocol {
  protected config: DigitalWrenchConfig;
  protected isConnected = false;
  protected continuousReadingInterval?: NodeJS.Timer;
  protected lastReading?: DigitalWrenchReading;
  protected connectionManager: any;

  constructor(config: DigitalWrenchConfig) {
    super();
    this.config = config;
  }

  abstract connect(config: DigitalWrenchConfig): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract readTorque(): Promise<DigitalWrenchReading>;
  abstract parseRawData(data: any): DigitalWrenchReading;

  async getStatus(): Promise<WrenchConnectionStatus> {
    return {
      isConnected: this.isConnected,
      lastHeartbeat: new Date(),
      calibrationStatus: await this.validateCalibration() ? 'valid' : 'expired',
      errorCount: 0
    };
  }

  startContinuousReading(interval: number = 1000): void {
    if (this.continuousReadingInterval) {
      this.stopContinuousReading();
    }

    this.continuousReadingInterval = setInterval(async () => {
      try {
        const reading = await this.readTorque();
        this.emit('torque_reading', reading);
      } catch (error) {
        this.emit('error', error);
      }
    }, interval);
  }

  stopContinuousReading(): void {
    if (this.continuousReadingInterval) {
      clearInterval(this.continuousReadingInterval);
      this.continuousReadingInterval = undefined;
    }
  }

  async validateCalibration(): Promise<boolean> {
    const now = new Date();
    const calibrationDate = new Date(this.config.lastCalibrationDate);
    const dueDate = new Date(this.config.calibrationDueDate);

    return now >= calibrationDate && now <= dueDate;
  }

  protected createBaseReading(): Partial<DigitalWrenchReading> {
    return {
      wrenchId: this.config.id,
      serialNumber: this.config.serialNumber,
      calibrationDate: new Date(this.config.lastCalibrationDate),
      timestamp: new Date(),
      isCalibrated: false, // Will be set by validateCalibration
      connectionType: this.config.connectionSettings.type,
      torqueUnit: this.config.torqueRange.unit
    };
  }
}

/**
 * Snap-on Digital Wrench Protocol
 */
class SnapOnWrenchProtocol extends BaseWrenchProtocol {
  async connect(config: DigitalWrenchConfig): Promise<boolean> {
    try {
      switch (config.connectionSettings.type) {
        case 'Bluetooth':
          this.connectionManager = new WebBluetoothManager();
          await this.connectionManager.connect({
            deviceName: `SNAPON_${config.serialNumber}`,
            serviceUuid: '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Snap-on Nordic UART
            characteristicUuid: '6e400003-b5a3-f393-e0a9-e50e24dcca9e'
          });
          break;
        case 'WiFi':
          this.connectionManager = new WiFiManager();
          await this.connectionManager.connect({
            ipAddress: config.connectionSettings.address!,
            port: config.connectionSettings.port || 8080
          });
          break;
        default:
          throw new Error(`Unsupported connection type: ${config.connectionSettings.type}`);
      }

      this.isConnected = true;
      this.emit('connected', config);
      return true;
    } catch (error) {
      this.emit('error', new Error(`Snap-on connection failed: ${error}`));
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.disconnect();
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  async readTorque(): Promise<DigitalWrenchReading> {
    if (!this.isConnected) {
      throw new Error('Wrench not connected');
    }

    try {
      const rawData = await this.connectionManager.readData();
      return this.parseRawData(rawData);
    } catch (error) {
      throw new Error(`Failed to read torque: ${error}`);
    }
  }

  parseRawData(data: any): DigitalWrenchReading {
    // Snap-on protocol: "T:125.5,A:45.2,U:Nm,S:OK"
    const reading = this.createBaseReading() as DigitalWrenchReading;

    const dataStr = data.toString();
    const matches = dataStr.match(/T:([\d.]+),A:([\d.]+),U:(\w+),S:(\w+)/);

    if (!matches) {
      throw new Error('Invalid Snap-on data format');
    }

    reading.torqueValue = parseFloat(matches[1]);
    reading.angle = parseFloat(matches[2]);
    reading.torqueUnit = matches[3];
    reading.isCalibrated = matches[4] === 'OK';

    return reading;
  }
}

/**
 * Norbar Digital Wrench Protocol
 */
class NorbarWrenchProtocol extends BaseWrenchProtocol {
  async connect(config: DigitalWrenchConfig): Promise<boolean> {
    try {
      switch (config.connectionSettings.type) {
        case 'Bluetooth':
          this.connectionManager = new WebBluetoothManager();
          await this.connectionManager.connect({
            deviceName: `NOR_${config.serialNumber}`,
            serviceUuid: '0000ffe0-0000-1000-8000-00805f9b34fb', // Norbar BLE service
            characteristicUuid: '0000ffe1-0000-1000-8000-00805f9b34fb'
          });
          break;
        case 'Serial':
          this.connectionManager = new SerialPortManager();
          await this.connectionManager.connect({
            port: config.connectionSettings.address!,
            baudRate: config.connectionSettings.baudRate || 9600
          });
          break;
        default:
          throw new Error(`Unsupported connection type for Norbar: ${config.connectionSettings.type}`);
      }

      this.isConnected = true;
      this.emit('connected', config);
      return true;
    } catch (error) {
      this.emit('error', new Error(`Norbar connection failed: ${error}`));
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.disconnect();
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  async readTorque(): Promise<DigitalWrenchReading> {
    if (!this.isConnected) {
      throw new Error('Wrench not connected');
    }

    try {
      const rawData = await this.connectionManager.readData();
      return this.parseRawData(rawData);
    } catch (error) {
      throw new Error(`Failed to read torque: ${error}`);
    }
  }

  parseRawData(data: any): DigitalWrenchReading {
    // Norbar protocol: "[Torque:125.50][Unit:Nm][Status:OK][Battery:85]"
    const reading = this.createBaseReading() as DigitalWrenchReading;

    const dataStr = data.toString();
    const torqueMatch = dataStr.match(/\[Torque:([\d.]+)\]/);
    const unitMatch = dataStr.match(/\[Unit:(\w+)\]/);
    const statusMatch = dataStr.match(/\[Status:(\w+)\]/);
    const batteryMatch = dataStr.match(/\[Battery:(\d+)\]/);

    if (!torqueMatch || !unitMatch) {
      throw new Error('Invalid Norbar data format');
    }

    reading.torqueValue = parseFloat(torqueMatch[1]);
    reading.torqueUnit = unitMatch[1];
    reading.isCalibrated = statusMatch?.[1] === 'OK';
    reading.batteryLevel = batteryMatch ? parseInt(batteryMatch[1]) : undefined;

    return reading;
  }
}

/**
 * CDI Digital Wrench Protocol
 */
class CDIWrenchProtocol extends BaseWrenchProtocol {
  async connect(config: DigitalWrenchConfig): Promise<boolean> {
    try {
      // CDI primarily uses WiFi connectivity
      this.connectionManager = new WiFiManager();
      await this.connectionManager.connect({
        ipAddress: config.connectionSettings.address!,
        port: config.connectionSettings.port || 502 // Modbus TCP
      });

      this.isConnected = true;
      this.emit('connected', config);
      return true;
    } catch (error) {
      this.emit('error', new Error(`CDI connection failed: ${error}`));
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.connectionManager) {
      await this.connectionManager.disconnect();
      this.isConnected = false;
      this.emit('disconnected');
    }
  }

  async readTorque(): Promise<DigitalWrenchReading> {
    if (!this.isConnected) {
      throw new Error('Wrench not connected');
    }

    try {
      const rawData = await this.connectionManager.readModbusRegisters(40001, 4);
      return this.parseRawData(rawData);
    } catch (error) {
      throw new Error(`Failed to read torque: ${error}`);
    }
  }

  parseRawData(data: any): DigitalWrenchReading {
    // CDI Modbus registers: [torque_high, torque_low, angle_high, angle_low]
    const reading = this.createBaseReading() as DigitalWrenchReading;

    const registers = data as number[];
    if (registers.length < 2) {
      throw new Error('Invalid CDI data format');
    }

    // Combine high and low registers to get float values
    const torqueValue = this.combineRegisters(registers[0], registers[1]);
    const angleValue = registers.length >= 4 ? this.combineRegisters(registers[2], registers[3]) : undefined;

    reading.torqueValue = torqueValue;
    reading.angle = angleValue;
    reading.isCalibrated = true; // CDI sends calibration status separately

    return reading;
  }

  private combineRegisters(high: number, low: number): number {
    // Convert two 16-bit registers to IEEE 754 float
    const buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt16BE(high, 0);
    buffer.writeUInt16BE(low, 2);
    return buffer.readFloatBE(0);
  }
}

/**
 * Digital Wrench Service
 * Main service for managing digital wrench connections and data capture
 */
export class DigitalWrenchService extends EventEmitter {
  private wrenches = new Map<string, WrenchProtocol>();
  private configs = new Map<string, DigitalWrenchConfig>();
  private connectionTimeouts = new Map<string, NodeJS.Timer>();

  constructor() {
    super();
  }

  /**
   * Register a digital wrench configuration
   */
  async registerWrench(config: DigitalWrenchConfig): Promise<void> {
    const protocol = this.createProtocol(config);

    this.configs.set(config.id, config);
    this.wrenches.set(config.id, protocol);

    // Forward events
    protocol.on('torque_reading', (reading: DigitalWrenchReading) => {
      this.emit('torque_reading', {
        type: 'torque_reading',
        data: reading,
        timestamp: new Date(),
        workOrderId: '', // Will be set by calling code
        operatorId: '' // Will be set by calling code
      } as RealtimeTorqueEvent);
    });

    protocol.on('connected', () => {
      this.emit('wrench_connected', config.id);
    });

    protocol.on('disconnected', () => {
      this.emit('wrench_disconnected', config.id);
    });

    protocol.on('error', (error: Error) => {
      this.emit('wrench_error', {
        type: TorqueErrorType.WRENCH_CONNECTION_FAILED,
        message: error.message,
        timestamp: new Date(),
        recoverable: true,
        suggestedActions: ['Check wrench power', 'Verify connection settings', 'Retry connection']
      } as TorqueError);
    });
  }

  /**
   * Connect to a registered wrench
   */
  async connectWrench(wrenchId: string): Promise<boolean> {
    const config = this.configs.get(wrenchId);
    const protocol = this.wrenches.get(wrenchId);

    if (!config || !protocol) {
      throw new Error(`Wrench ${wrenchId} not registered`);
    }

    // Check calibration before connecting
    if (!(await protocol.validateCalibration())) {
      this.emit('wrench_error', {
        type: TorqueErrorType.WRENCH_NOT_CALIBRATED,
        message: `Wrench ${wrenchId} calibration expired`,
        timestamp: new Date(),
        recoverable: false,
        suggestedActions: ['Calibrate wrench before use', 'Contact calibration service']
      } as TorqueError);
      return false;
    }

    try {
      const success = await protocol.connect(config);

      if (success) {
        // Set connection timeout
        const timeout = setTimeout(() => {
          this.emit('wrench_error', {
            type: TorqueErrorType.TIMEOUT_EXCEEDED,
            message: `Wrench ${wrenchId} connection timeout`,
            timestamp: new Date(),
            recoverable: true
          } as TorqueError);
        }, 30000); // 30 second timeout

        this.connectionTimeouts.set(wrenchId, timeout);
      }

      return success;
    } catch (error) {
      this.emit('wrench_error', {
        type: TorqueErrorType.WRENCH_CONNECTION_FAILED,
        message: `Failed to connect to wrench ${wrenchId}: ${error}`,
        timestamp: new Date(),
        recoverable: true
      } as TorqueError);
      return false;
    }
  }

  /**
   * Disconnect from a wrench
   */
  async disconnectWrench(wrenchId: string): Promise<void> {
    const protocol = this.wrenches.get(wrenchId);

    if (protocol) {
      await protocol.disconnect();
    }

    // Clear timeout
    const timeout = this.connectionTimeouts.get(wrenchId);
    if (timeout) {
      clearTimeout(timeout);
      this.connectionTimeouts.delete(wrenchId);
    }
  }

  /**
   * Read torque from a connected wrench
   */
  async readTorque(wrenchId: string): Promise<DigitalWrenchReading> {
    const protocol = this.wrenches.get(wrenchId);

    if (!protocol) {
      throw new Error(`Wrench ${wrenchId} not registered`);
    }

    return await protocol.readTorque();
  }

  /**
   * Start continuous reading from a wrench
   */
  startContinuousReading(wrenchId: string, interval: number = 1000): void {
    const protocol = this.wrenches.get(wrenchId);

    if (!protocol) {
      throw new Error(`Wrench ${wrenchId} not registered`);
    }

    protocol.startContinuousReading(interval);
  }

  /**
   * Stop continuous reading from a wrench
   */
  stopContinuousReading(wrenchId: string): void {
    const protocol = this.wrenches.get(wrenchId);

    if (protocol) {
      protocol.stopContinuousReading();
    }
  }

  /**
   * Get status of a wrench
   */
  async getWrenchStatus(wrenchId: string): Promise<WrenchConnectionStatus> {
    const protocol = this.wrenches.get(wrenchId);

    if (!protocol) {
      throw new Error(`Wrench ${wrenchId} not registered`);
    }

    return await protocol.getStatus();
  }

  /**
   * Get all registered wrenches
   */
  getRegisteredWrenches(): DigitalWrenchConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Auto-discover wrenches on the network
   */
  async discoverWrenches(): Promise<Partial<DigitalWrenchConfig>[]> {
    const discovered: Partial<DigitalWrenchConfig>[] = [];

    try {
      // Bluetooth discovery
      const bluetoothDevices = await this.discoverBluetoothWrenches();
      discovered.push(...bluetoothDevices);

      // WiFi discovery (network scan)
      const wifiDevices = await this.discoverWiFiWrenches();
      discovered.push(...wifiDevices);

    } catch (error) {
      console.warn('Wrench discovery failed:', error);
    }

    return discovered;
  }

  /**
   * Create protocol instance based on wrench brand
   */
  private createProtocol(config: DigitalWrenchConfig): WrenchProtocol {
    switch (config.brand) {
      case DigitalWrenchBrand.SNAP_ON:
        return new SnapOnWrenchProtocol(config);
      case DigitalWrenchBrand.NORBAR:
        return new NorbarWrenchProtocol(config);
      case DigitalWrenchBrand.CDI:
        return new CDIWrenchProtocol(config);
      case DigitalWrenchBrand.GEDORE:
      case DigitalWrenchBrand.BETA:
      case DigitalWrenchBrand.CRAFTSMAN:
        // Use generic protocol for other brands
        return new BaseWrenchProtocol(config) as any;
      default:
        throw new Error(`Unsupported wrench brand: ${config.brand}`);
    }
  }

  /**
   * Discover Bluetooth wrenches
   */
  private async discoverBluetoothWrenches(): Promise<Partial<DigitalWrenchConfig>[]> {
    // Implementation would use Web Bluetooth API or noble library
    // This is a placeholder for the actual discovery logic
    return [];
  }

  /**
   * Discover WiFi wrenches
   */
  private async discoverWiFiWrenches(): Promise<Partial<DigitalWrenchConfig>[]> {
    // Implementation would scan network for known wrench TCP ports
    // This is a placeholder for the actual discovery logic
    return [];
  }

  /**
   * Cleanup all connections
   */
  async cleanup(): Promise<void> {
    for (const [wrenchId] of this.wrenches) {
      await this.disconnectWrench(wrenchId);
    }

    this.wrenches.clear();
    this.configs.clear();
    this.connectionTimeouts.clear();
  }
}

export default DigitalWrenchService;