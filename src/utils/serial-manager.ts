/**
 * Serial Port Manager
 * Handles RS-232/RS-485 connections for digital torque wrenches
 * Uses Node.js serialport library for cross-platform serial communication
 */

// Note: This would require 'serialport' npm package in a real implementation
// For now, we'll create the interface and mock the functionality

export interface SerialConnectionConfig {
  port: string;                    // e.g., 'COM3', '/dev/ttyUSB0'
  baudRate: number;               // e.g., 9600, 115200
  dataBits?: 7 | 8;              // Default: 8
  stopBits?: 1 | 2;              // Default: 1
  parity?: 'none' | 'even' | 'odd'; // Default: 'none'
  flowControl?: 'none' | 'hardware' | 'software'; // Default: 'none'
  timeout?: number;               // Read timeout in ms
  autoOpen?: boolean;             // Default: true
}

export interface SerialPortInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

export class SerialPortManager {
  private port?: any; // Would be SerialPort instance
  private config?: SerialConnectionConfig;
  private isConnected = false;
  private readBuffer = Buffer.alloc(0);
  private readCallbacks: Array<(data: Buffer) => void> = [];

  constructor() {}

  /**
   * Connect to a serial device
   */
  async connect(config: SerialConnectionConfig): Promise<void> {
    this.config = config;

    return new Promise((resolve, reject) => {
      try {
        // In a real implementation, this would use the serialport library:
        // const SerialPort = require('serialport');
        // this.port = new SerialPort({
        //   path: config.port,
        //   baudRate: config.baudRate,
        //   dataBits: config.dataBits || 8,
        //   stopBits: config.stopBits || 1,
        //   parity: config.parity || 'none',
        //   autoOpen: config.autoOpen !== false
        // });

        // Mock implementation for development
        this.port = {
          path: config.port,
          baudRate: config.baudRate,
          isOpen: false,

          open: (callback?: (error?: Error) => void) => {
            setTimeout(() => {
              this.port.isOpen = true;
              this.isConnected = true;
              console.log(`Serial port ${config.port} opened successfully`);
              callback && callback();
              resolve();
            }, 100);
          },

          close: (callback?: (error?: Error) => void) => {
            this.port.isOpen = false;
            this.isConnected = false;
            callback && callback();
          },

          write: (data: string | Buffer, callback?: (error?: Error) => void) => {
            setTimeout(() => {
              console.log('Serial data sent:', data);
              callback && callback();
            }, 10);
          },

          on: (event: string, callback: Function) => {
            if (event === 'data') {
              this.readCallbacks.push(callback as any);
            }
          },

          removeListener: (event: string, callback: Function) => {
            if (event === 'data') {
              const index = this.readCallbacks.indexOf(callback as any);
              if (index > -1) {
                this.readCallbacks.splice(index, 1);
              }
            }
          }
        };

        // Set up event handlers
        this.port.on('data', (data: Buffer) => {
          this.onDataReceived(data);
        });

        this.port.on('error', (error: Error) => {
          console.error('Serial port error:', error);
          reject(new Error(`Serial connection failed: ${error.message}`));
        });

        // Open the port
        if (!this.port.isOpen) {
          this.port.open((error?: Error) => {
            if (error) {
              reject(new Error(`Failed to open serial port: ${error.message}`));
            }
          });
        } else {
          this.isConnected = true;
          resolve();
        }

      } catch (error) {
        reject(new Error(`Serial port setup failed: ${error}`));
      }
    });
  }

  /**
   * Disconnect from the serial device
   */
  async disconnect(): Promise<void> {
    if (this.port && this.port.isOpen) {
      return new Promise((resolve) => {
        this.port.close(() => {
          this.isConnected = false;
          console.log('Serial port disconnected');
          resolve();
        });
      });
    }
  }

  /**
   * Check if connected
   */
  isConnectedToDevice(): boolean {
    return this.isConnected && this.port?.isOpen;
  }

  /**
   * Write data to the serial port
   */
  async writeData(data: string | Buffer): Promise<void> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not connected');
    }

    return new Promise((resolve, reject) => {
      this.port.write(data, (error?: Error) => {
        if (error) {
          reject(new Error(`Failed to write serial data: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Read data from the serial port
   */
  async readData(timeout: number = 5000): Promise<Buffer> {
    if (!this.port || !this.port.isOpen) {
      throw new Error('Serial port not connected');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.port.removeListener('data', onData);
        reject(new Error('Serial read timeout'));
      }, timeout);

      const onData = (data: Buffer) => {
        clearTimeout(timer);
        this.port.removeListener('data', onData);
        resolve(data);
      };

      this.port.on('data', onData);
    });
  }

  /**
   * Send command and wait for response
   */
  async sendCommand(command: string, timeout: number = 5000): Promise<string> {
    await this.writeData(command + '\r\n');
    const response = await this.readData(timeout);
    return response.toString().trim();
  }

  /**
   * Read line from serial port (until newline)
   */
  async readLine(timeout: number = 5000): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Serial readline timeout'));
      }, timeout);

      const checkBuffer = () => {
        const newlineIndex = this.readBuffer.indexOf('\n');
        if (newlineIndex !== -1) {
          clearTimeout(timer);
          const line = this.readBuffer.slice(0, newlineIndex).toString().trim();
          this.readBuffer = this.readBuffer.slice(newlineIndex + 1);
          resolve(line);
          return true;
        }
        return false;
      };

      // Check if we already have a line in the buffer
      if (checkBuffer()) {
        return;
      }

      const onData = (data: Buffer) => {
        this.readBuffer = Buffer.concat([this.readBuffer, data]);
        if (checkBuffer()) {
          this.port.removeListener('data', onData);
        }
      };

      this.port.on('data', onData);
    });
  }

  /**
   * Get port configuration
   */
  getConfiguration(): SerialConnectionConfig | undefined {
    return this.config;
  }

  /**
   * Get port status
   */
  getStatus(): {
    connected: boolean;
    port?: string;
    baudRate?: number;
    bytesReceived: number;
    bytesSent: number;
  } {
    return {
      connected: this.isConnected,
      port: this.config?.port,
      baudRate: this.config?.baudRate,
      bytesReceived: this.readBuffer.length,
      bytesSent: 0 // Would track in real implementation
    };
  }

  /**
   * List available serial ports
   */
  static async listPorts(): Promise<SerialPortInfo[]> {
    // In a real implementation, this would use:
    // const SerialPort = require('serialport');
    // const ports = await SerialPort.list();

    // Mock implementation returning common ports
    return [
      {
        path: '/dev/ttyUSB0',
        manufacturer: 'FTDI',
        serialNumber: 'FT1234567',
        productId: '6001',
        vendorId: '0403'
      },
      {
        path: '/dev/ttyACM0',
        manufacturer: 'Arduino',
        serialNumber: 'AR9876543'
      },
      {
        path: 'COM3',
        manufacturer: 'Prolific',
        serialNumber: 'PL2303'
      }
    ];
  }

  /**
   * Auto-detect wrench on serial ports
   */
  static async detectWrenches(): Promise<Array<{
    port: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
  }>> {
    const detectedWrenches: Array<{
      port: string;
      brand?: string;
      model?: string;
      serialNumber?: string;
    }> = [];

    try {
      const ports = await this.listPorts();

      for (const portInfo of ports) {
        try {
          const manager = new SerialPortManager();

          // Try common wrench baud rates
          const baudRates = [9600, 19200, 38400, 115200];

          for (const baudRate of baudRates) {
            try {
              await manager.connect({
                port: portInfo.path,
                baudRate,
                timeout: 2000
              });

              // Send identification commands for different brands
              const commands = [
                'ID?',           // Generic
                'ATI',           // Norbar
                '*IDN?',         // SCPI standard
                'GET_INFO',      // Custom
                'STATUS'         // Generic status
              ];

              for (const command of commands) {
                try {
                  const response = await manager.sendCommand(command, 1000);

                  if (response && response.length > 0) {
                    const wrenchInfo = this.parseWrenchIdentification(response);

                    if (wrenchInfo.brand) {
                      detectedWrenches.push({
                        port: portInfo.path,
                        ...wrenchInfo
                      });
                      break;
                    }
                  }
                } catch (error) {
                  // Command failed, try next one
                }
              }

              await manager.disconnect();
              break; // Found a working baud rate

            } catch (error) {
              // Baud rate didn't work, try next one
              await manager.disconnect().catch(() => {});
            }
          }

        } catch (error) {
          console.warn(`Failed to probe port ${portInfo.path}:`, error);
        }
      }

    } catch (error) {
      console.error('Wrench detection failed:', error);
    }

    return detectedWrenches;
  }

  /**
   * Parse wrench identification response
   */
  private static parseWrenchIdentification(response: string): {
    brand?: string;
    model?: string;
    serialNumber?: string;
  } {
    const result: any = {};

    // Norbar identification patterns
    if (response.includes('NORBAR') || response.includes('NOR_')) {
      result.brand = 'NORBAR';
      const modelMatch = response.match(/Model:([A-Z0-9-]+)/i);
      if (modelMatch) result.model = modelMatch[1];
      const serialMatch = response.match(/S\/N:([A-Z0-9]+)/i);
      if (serialMatch) result.serialNumber = serialMatch[1];
    }

    // CDI identification patterns
    else if (response.includes('CDI') || response.includes('Consolidated')) {
      result.brand = 'CDI';
      const modelMatch = response.match(/([0-9]{4}[A-Z]*)/);
      if (modelMatch) result.model = modelMatch[1];
    }

    // Gedore identification patterns
    else if (response.includes('GEDORE') || response.includes('GED_')) {
      result.brand = 'GEDORE';
      const modelMatch = response.match(/DREMASTER\s+([A-Z0-9-]+)/i);
      if (modelMatch) result.model = modelMatch[1];
    }

    // Generic patterns
    else if (response.match(/TORQUE|WRENCH|TW[0-9]/i)) {
      // Likely a torque wrench, but unknown brand
      const modelMatch = response.match(/([A-Z0-9-]{5,})/);
      if (modelMatch) result.model = modelMatch[1];
    }

    return result;
  }

  /**
   * Handle incoming data
   */
  private onDataReceived(data: Buffer): void {
    // Add to read buffer for line-based reading
    this.readBuffer = Buffer.concat([this.readBuffer, data]);

    // Trigger callbacks
    this.readCallbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Serial data callback error:', error);
      }
    });

    // Trim buffer if it gets too large
    if (this.readBuffer.length > 4096) {
      this.readBuffer = this.readBuffer.slice(-2048);
    }
  }

  /**
   * Calculate and verify checksum for data integrity
   */
  static calculateChecksum(data: Buffer, type: 'xor' | 'sum' | 'crc16' = 'xor'): number {
    switch (type) {
      case 'xor': {
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
          checksum ^= data[i];
        }
        return checksum;
      }

      case 'sum': {
        let checksum = 0;
        for (let i = 0; i < data.length; i++) {
          checksum += data[i];
        }
        return checksum & 0xFF;
      }

      case 'crc16': {
        let crc = 0xFFFF;
        for (let i = 0; i < data.length; i++) {
          crc ^= data[i];
          for (let j = 0; j < 8; j++) {
            if (crc & 0x0001) {
              crc = (crc >> 1) ^ 0xA001;
            } else {
              crc = crc >> 1;
            }
          }
        }
        return crc;
      }

      default:
        throw new Error(`Unsupported checksum type: ${type}`);
    }
  }

  /**
   * Verify data integrity with checksum
   */
  static verifyChecksum(data: Buffer, expectedChecksum: number, type: 'xor' | 'sum' | 'crc16' = 'xor'): boolean {
    const calculatedChecksum = this.calculateChecksum(data, type);
    return calculatedChecksum === expectedChecksum;
  }
}

export default SerialPortManager;