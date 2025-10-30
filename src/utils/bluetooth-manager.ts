/**
 * Web Bluetooth Manager
 * Handles Bluetooth Low Energy connections for digital torque wrenches
 */

export interface BluetoothConnectionConfig {
  deviceName?: string;
  serviceUuid: string;
  characteristicUuid: string;
  deviceId?: string;
  filters?: BluetoothLEScanFilter[];
}

export interface BluetoothDevice {
  id: string;
  name?: string;
  connected: boolean;
  gatt?: BluetoothRemoteGATTServer;
  service?: BluetoothRemoteGATTService;
  characteristic?: BluetoothRemoteGATTCharacteristic;
}

export class WebBluetoothManager {
  private device?: BluetoothDevice;
  private connectionConfig?: BluetoothConnectionConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectInterval = 5000; // 5 seconds

  constructor() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth API not supported in this environment');
    }
  }

  /**
   * Connect to a Bluetooth device
   */
  async connect(config: BluetoothConnectionConfig): Promise<void> {
    this.connectionConfig = config;

    try {
      // Request device
      const filters: BluetoothLEScanFilter[] = config.filters || [];

      if (config.deviceName && !filters.some(f => f.name)) {
        filters.push({ name: config.deviceName });
      }

      if (!filters.length) {
        filters.push({ services: [config.serviceUuid] });
      }

      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices: [config.serviceUuid]
      });

      // Connect to GATT server
      const gatt = await bluetoothDevice.gatt!.connect();

      // Get service
      const service = await gatt.getPrimaryService(config.serviceUuid);

      // Get characteristic
      const characteristic = await service.getCharacteristic(config.characteristicUuid);

      // Store device info
      this.device = {
        id: bluetoothDevice.id,
        name: bluetoothDevice.name,
        connected: true,
        gatt,
        service,
        characteristic
      };

      // Set up disconnect handler
      bluetoothDevice.addEventListener('gattserverdisconnected', () => {
        this.onDisconnected();
      });

      // Start notifications if supported
      if (characteristic.properties.notify) {
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
          const target = event.target as BluetoothRemoteGATTCharacteristic;
          this.onDataReceived(target.value!);
        });
      }

      this.reconnectAttempts = 0;
      console.log(`Connected to Bluetooth device: ${bluetoothDevice.name || bluetoothDevice.id}`);

    } catch (error) {
      throw new Error(`Bluetooth connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from the device
   */
  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.device = undefined;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.device?.connected && this.device?.gatt?.connected || false;
  }

  /**
   * Read data from the characteristic
   */
  async readData(): Promise<ArrayBuffer> {
    if (!this.device?.characteristic) {
      throw new Error('Not connected to Bluetooth device');
    }

    try {
      const value = await this.device.characteristic.readValue();
      return value.buffer;
    } catch (error) {
      throw new Error(`Failed to read Bluetooth data: ${error}`);
    }
  }

  /**
   * Write data to the characteristic
   */
  async writeData(data: ArrayBuffer | Uint8Array): Promise<void> {
    if (!this.device?.characteristic) {
      throw new Error('Not connected to Bluetooth device');
    }

    try {
      await this.device.characteristic.writeValue(data);
    } catch (error) {
      throw new Error(`Failed to write Bluetooth data: ${error}`);
    }
  }

  /**
   * Send command to wrench
   */
  async sendCommand(command: string): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(command);
    await this.writeData(data);
  }

  /**
   * Get device info
   */
  getDeviceInfo(): BluetoothDevice | undefined {
    return this.device;
  }

  /**
   * Get signal strength (RSSI)
   */
  async getSignalStrength(): Promise<number> {
    // Web Bluetooth API doesn't expose RSSI directly
    // This would need to be implemented using experimental APIs or native code
    return -50; // Placeholder value
  }

  /**
   * Scan for available devices
   */
  async scanForDevices(serviceUuids: string[] = []): Promise<BluetoothDevice[]> {
    try {
      const devices: BluetoothDevice[] = [];

      // Request devices with filters
      const filters = serviceUuids.map(uuid => ({ services: [uuid] }));

      if (filters.length === 0) {
        filters.push({ acceptAllDevices: true } as any);
      }

      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters,
        optionalServices: serviceUuids
      });

      devices.push({
        id: bluetoothDevice.id,
        name: bluetoothDevice.name,
        connected: false
      });

      return devices;
    } catch (error) {
      console.warn('Bluetooth scan failed:', error);
      return [];
    }
  }

  /**
   * Handle disconnection
   */
  private onDisconnected(): void {
    if (this.device) {
      this.device.connected = false;
    }

    console.log('Bluetooth device disconnected');

    // Attempt reconnection
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.connectionConfig) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(async () => {
        try {
          await this.connect(this.connectionConfig!);
        } catch (error) {
          console.error('Reconnection failed:', error);
        }
      }, this.reconnectInterval);
    }
  }

  /**
   * Handle incoming data
   */
  private onDataReceived(value: DataView): void {
    // Convert DataView to string for text-based protocols
    const decoder = new TextDecoder();
    const data = decoder.decode(value);

    // Emit event or call callback
    // This would be handled by the protocol implementations
    console.log('Bluetooth data received:', data);
  }
}

/**
 * Utility functions for Bluetooth data conversion
 */
export class BluetoothDataUtils {
  /**
   * Convert string to ArrayBuffer
   */
  static stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }

  /**
   * Convert ArrayBuffer to string
   */
  static arrayBufferToString(buffer: ArrayBuffer): string {
    const decoder = new TextDecoder();
    return decoder.decode(buffer);
  }

  /**
   * Convert number to little-endian bytes
   */
  static numberToBytes(value: number, bytes: number = 4): Uint8Array {
    const buffer = new ArrayBuffer(bytes);
    const view = new DataView(buffer);

    if (bytes === 2) {
      view.setUint16(0, value, true); // little-endian
    } else if (bytes === 4) {
      view.setUint32(0, value, true); // little-endian
    } else if (bytes === 8) {
      view.setBigUint64(0, BigInt(value), true); // little-endian
    }

    return new Uint8Array(buffer);
  }

  /**
   * Convert bytes to number
   */
  static bytesToNumber(bytes: Uint8Array): number {
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const view = new DataView(buffer);

    switch (bytes.length) {
      case 1:
        return view.getUint8(0);
      case 2:
        return view.getUint16(0, true); // little-endian
      case 4:
        return view.getUint32(0, true); // little-endian
      case 8:
        return Number(view.getBigUint64(0, true)); // little-endian
      default:
        throw new Error(`Unsupported byte length: ${bytes.length}`);
    }
  }

  /**
   * Calculate checksum for data integrity
   */
  static calculateChecksum(data: Uint8Array): number {
    let checksum = 0;
    for (let i = 0; i < data.length; i++) {
      checksum ^= data[i];
    }
    return checksum;
  }

  /**
   * Verify checksum
   */
  static verifyChecksum(data: Uint8Array, expectedChecksum: number): boolean {
    const calculatedChecksum = this.calculateChecksum(data);
    return calculatedChecksum === expectedChecksum;
  }
}

export default WebBluetoothManager;