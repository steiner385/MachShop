/**
 * WiFi/Network Manager
 * Handles TCP/IP connections for digital torque wrenches with network capability
 * Supports HTTP, TCP, and Modbus TCP protocols
 */

import net from 'net';
import http from 'http';
import https from 'https';

export interface WiFiConnectionConfig {
  ipAddress: string;
  port: number;
  protocol?: 'http' | 'https' | 'tcp' | 'modbus';
  timeout?: number;
  keepAlive?: boolean;
  username?: string;
  password?: string;
}

export interface ModbusRequest {
  slaveId: number;
  functionCode: number;
  startAddress: number;
  quantity: number;
}

export interface ModbusResponse {
  slaveId: number;
  functionCode: number;
  data: Buffer;
  error?: string;
}

export class WiFiManager {
  private socket?: net.Socket;
  private config?: WiFiConnectionConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectInterval = 5000;
  private keepAliveInterval?: NodeJS.Timer;

  constructor() {}

  /**
   * Connect to a network device
   */
  async connect(config: WiFiConnectionConfig): Promise<void> {
    this.config = config;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new net.Socket();

        // Set timeout
        this.socket.setTimeout(config.timeout || 10000);

        // Connection event handlers
        this.socket.on('connect', () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;

          // Set up keep-alive if enabled
          if (config.keepAlive) {
            this.setupKeepAlive();
          }

          console.log(`Connected to ${config.ipAddress}:${config.port}`);
          resolve();
        });

        this.socket.on('data', (data) => {
          this.onDataReceived(data);
        });

        this.socket.on('close', () => {
          this.onDisconnected();
        });

        this.socket.on('error', (error) => {
          console.error('WiFi connection error:', error);
          reject(new Error(`WiFi connection failed: ${error.message}`));
        });

        this.socket.on('timeout', () => {
          reject(new Error('WiFi connection timeout'));
        });

        // Attempt connection
        this.socket.connect(config.port, config.ipAddress);

      } catch (error) {
        reject(new Error(`WiFi connection setup failed: ${error}`));
      }
    });
  }

  /**
   * Disconnect from the device
   */
  async disconnect(): Promise<void> {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }

    if (this.socket && !this.socket.destroyed) {
      this.socket.destroy();
    }

    this.isConnected = false;
    this.socket = undefined;
  }

  /**
   * Check if connected
   */
  isConnectedToNetwork(): boolean {
    return this.isConnected && this.socket && !this.socket.destroyed || false;
  }

  /**
   * Send raw TCP data
   */
  async sendData(data: Buffer | string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to network device');
    }

    return new Promise((resolve, reject) => {
      this.socket!.write(data, (error) => {
        if (error) {
          reject(new Error(`Failed to send data: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Read data from the socket
   */
  async readData(timeout: number = 5000): Promise<Buffer> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to network device');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Read timeout'));
      }, timeout);

      const onData = (data: Buffer) => {
        clearTimeout(timer);
        this.socket!.removeListener('data', onData);
        resolve(data);
      };

      this.socket.on('data', onData);
    });
  }

  /**
   * Send HTTP request to wrench
   */
  async sendHttpRequest(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    if (!this.config) {
      throw new Error('WiFi manager not configured');
    }

    const protocol = this.config.protocol === 'https' ? https : http;
    const url = `${this.config.protocol || 'http'}://${this.config.ipAddress}:${this.config.port}${path}`;

    return new Promise((resolve, reject) => {
      const requestOptions: any = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: this.config!.timeout || 10000
      };

      // Add authentication if provided
      if (this.config!.username && this.config!.password) {
        const auth = Buffer.from(`${this.config!.username}:${this.config!.password}`).toString('base64');
        requestOptions.headers['Authorization'] = `Basic ${auth}`;
      }

      const req = protocol.request(url, requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const responseData = res.headers['content-type']?.includes('application/json')
              ? JSON.parse(data)
              : data;
            resolve(responseData);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`HTTP request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP request timeout'));
      });

      // Send body if provided
      if (body) {
        req.write(typeof body === 'string' ? body : JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Read Modbus TCP registers
   */
  async readModbusRegisters(startAddress: number, quantity: number, slaveId: number = 1): Promise<number[]> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to Modbus device');
    }

    const request = this.buildModbusRequest({
      slaveId,
      functionCode: 0x03, // Read Holding Registers
      startAddress,
      quantity
    });

    await this.sendData(request);
    const response = await this.readData();

    return this.parseModbusResponse(response);
  }

  /**
   * Write Modbus TCP registers
   */
  async writeModbusRegisters(startAddress: number, values: number[], slaveId: number = 1): Promise<void> {
    if (!this.socket || !this.isConnected) {
      throw new Error('Not connected to Modbus device');
    }

    const request = this.buildModbusWriteRequest(slaveId, startAddress, values);
    await this.sendData(request);

    // Read response to confirm write
    const response = await this.readData();
    this.validateModbusWriteResponse(response);
  }

  /**
   * Get network device status
   */
  async getDeviceStatus(): Promise<{
    connected: boolean;
    latency: number;
    signalStrength?: number;
  }> {
    const startTime = Date.now();

    try {
      // Send ping/status request
      await this.sendHttpRequest('GET', '/status');
      const latency = Date.now() - startTime;

      return {
        connected: this.isConnected,
        latency,
        signalStrength: await this.getSignalStrength()
      };
    } catch (error) {
      return {
        connected: false,
        latency: -1
      };
    }
  }

  /**
   * Scan for devices on network
   */
  async scanNetwork(baseIp: string, startPort: number = 8080, endPort: number = 8090): Promise<string[]> {
    const foundDevices: string[] = [];
    const ipBase = baseIp.substring(0, baseIp.lastIndexOf('.') + 1);

    // Scan IP range
    for (let i = 1; i <= 254; i++) {
      const ip = `${ipBase}${i}`;

      // Scan port range
      for (let port = startPort; port <= endPort; port++) {
        try {
          const testSocket = new net.Socket();
          testSocket.setTimeout(1000);

          await new Promise<void>((resolve, reject) => {
            testSocket.connect(port, ip, () => {
              foundDevices.push(`${ip}:${port}`);
              testSocket.destroy();
              resolve();
            });

            testSocket.on('error', () => {
              testSocket.destroy();
              reject();
            });

            testSocket.on('timeout', () => {
              testSocket.destroy();
              reject();
            });
          });
        } catch (error) {
          // Device not found on this IP:port
        }
      }
    }

    return foundDevices;
  }

  /**
   * Build Modbus TCP request
   */
  private buildModbusRequest(request: ModbusRequest): Buffer {
    const buffer = Buffer.alloc(12);
    let offset = 0;

    // Transaction ID (2 bytes)
    buffer.writeUInt16BE(0x0001, offset);
    offset += 2;

    // Protocol ID (2 bytes) - Always 0 for Modbus TCP
    buffer.writeUInt16BE(0x0000, offset);
    offset += 2;

    // Length (2 bytes) - Number of following bytes
    buffer.writeUInt16BE(0x0006, offset);
    offset += 2;

    // Unit ID (1 byte)
    buffer.writeUInt8(request.slaveId, offset);
    offset += 1;

    // Function Code (1 byte)
    buffer.writeUInt8(request.functionCode, offset);
    offset += 1;

    // Starting Address (2 bytes)
    buffer.writeUInt16BE(request.startAddress, offset);
    offset += 2;

    // Quantity (2 bytes)
    buffer.writeUInt16BE(request.quantity, offset);

    return buffer;
  }

  /**
   * Build Modbus TCP write request
   */
  private buildModbusWriteRequest(slaveId: number, startAddress: number, values: number[]): Buffer {
    const dataLength = values.length * 2;
    const buffer = Buffer.alloc(13 + dataLength);
    let offset = 0;

    // Transaction ID (2 bytes)
    buffer.writeUInt16BE(0x0001, offset);
    offset += 2;

    // Protocol ID (2 bytes)
    buffer.writeUInt16BE(0x0000, offset);
    offset += 2;

    // Length (2 bytes)
    buffer.writeUInt16BE(7 + dataLength, offset);
    offset += 2;

    // Unit ID (1 byte)
    buffer.writeUInt8(slaveId, offset);
    offset += 1;

    // Function Code (1 byte) - Write Multiple Registers
    buffer.writeUInt8(0x10, offset);
    offset += 1;

    // Starting Address (2 bytes)
    buffer.writeUInt16BE(startAddress, offset);
    offset += 2;

    // Quantity (2 bytes)
    buffer.writeUInt16BE(values.length, offset);
    offset += 2;

    // Byte Count (1 byte)
    buffer.writeUInt8(dataLength, offset);
    offset += 1;

    // Register Values (2 bytes each)
    for (const value of values) {
      buffer.writeUInt16BE(value, offset);
      offset += 2;
    }

    return buffer;
  }

  /**
   * Parse Modbus TCP response
   */
  private parseModbusResponse(response: Buffer): number[] {
    if (response.length < 9) {
      throw new Error('Invalid Modbus response length');
    }

    const functionCode = response.readUInt8(7);

    if (functionCode & 0x80) {
      // Error response
      const errorCode = response.readUInt8(8);
      throw new Error(`Modbus error code: ${errorCode}`);
    }

    const byteCount = response.readUInt8(8);
    const values: number[] = [];

    for (let i = 0; i < byteCount; i += 2) {
      const value = response.readUInt16BE(9 + i);
      values.push(value);
    }

    return values;
  }

  /**
   * Validate Modbus write response
   */
  private validateModbusWriteResponse(response: Buffer): void {
    if (response.length < 8) {
      throw new Error('Invalid Modbus write response');
    }

    const functionCode = response.readUInt8(7);

    if (functionCode & 0x80) {
      const errorCode = response.readUInt8(8);
      throw new Error(`Modbus write error code: ${errorCode}`);
    }
  }

  /**
   * Set up keep-alive mechanism
   */
  private setupKeepAlive(): void {
    this.keepAliveInterval = setInterval(async () => {
      try {
        // Send keep-alive packet
        await this.sendData(Buffer.from('PING'));
      } catch (error) {
        console.warn('Keep-alive failed:', error);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Get signal strength (WiFi RSSI)
   */
  private async getSignalStrength(): Promise<number> {
    try {
      // This would require platform-specific implementation
      // For now, return a placeholder value
      return -45; // dBm
    } catch (error) {
      return -100; // No signal
    }
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(): void {
    this.isConnected = false;

    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = undefined;
    }

    console.log('WiFi device disconnected');

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.config) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(async () => {
        try {
          await this.connect(this.config!);
        } catch (error) {
          console.error('WiFi reconnection failed:', error);
        }
      }, this.reconnectInterval);
    }
  }

  /**
   * Handle incoming data
   */
  private onDataReceived(data: Buffer): void {
    // This would be handled by the protocol implementations
    console.log('WiFi data received:', data.toString());
  }
}

export default WiFiManager;