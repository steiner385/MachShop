import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DigitalWrenchService } from '@/services/DigitalWrenchService';
import {
  DigitalWrenchReading,
  DigitalWrenchConfig,
  WrenchConnectionType,
  WrenchBrand,
  WrenchStatus,
  DigitalWrenchCalibration
} from '@/types/torque';

// Mock the managers
vi.mock('@/utils/bluetooth-manager', () => ({
  WebBluetoothManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    isConnected: vi.fn().mockReturnValue(true),
    readData: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    writeData: vi.fn().mockResolvedValue(true),
    on: vi.fn(),
    off: vi.fn()
  }))
}));

vi.mock('@/utils/wifi-manager', () => ({
  WiFiManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    isConnected: vi.fn().mockReturnValue(true),
    sendRequest: vi.fn().mockResolvedValue({ torque: 150.0, angle: 45.0 }),
    on: vi.fn(),
    off: vi.fn()
  }))
}));

vi.mock('@/utils/serial-manager', () => ({
  SerialPortManager: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(true),
    isConnected: vi.fn().mockReturnValue(true),
    sendCommand: vi.fn().mockResolvedValue('TORQUE:150.0,ANGLE:45.0'),
    on: vi.fn(),
    off: vi.fn()
  }))
}));

describe('DigitalWrenchService', () => {
  let wrenchService: DigitalWrenchService;

  beforeEach(() => {
    wrenchService = new DigitalWrenchService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Management', () => {
    const validConfig: DigitalWrenchConfig = {
      id: 'wrench-001',
      name: 'Production Wrench 1',
      brand: WrenchBrand.SNAP_ON,
      model: 'ATECH3F150',
      connectionType: WrenchConnectionType.BLUETOOTH,
      address: '00:11:22:33:44:55',
      calibrationDate: new Date('2024-01-01'),
      calibrationDue: new Date('2024-12-31'),
      isActive: true,
      settings: {
        units: 'Nm',
        precision: 0.1,
        autoMode: true,
        timeout: 30000
      }
    };

    it('should add wrench configuration successfully', async () => {
      const result = await wrenchService.addWrench(validConfig);

      expect(result).toBe(true);
      expect(wrenchService.getWrenches()).toHaveLength(1);
      expect(wrenchService.getWrenches()[0]).toEqual(validConfig);
    });

    it('should reject duplicate wrench IDs', async () => {
      await wrenchService.addWrench(validConfig);

      await expect(
        wrenchService.addWrench(validConfig)
      ).rejects.toThrow('Wrench with ID wrench-001 already exists');
    });

    it('should remove wrench configuration', async () => {
      await wrenchService.addWrench(validConfig);
      const result = await wrenchService.removeWrench('wrench-001');

      expect(result).toBe(true);
      expect(wrenchService.getWrenches()).toHaveLength(0);
    });

    it('should return false when removing non-existent wrench', async () => {
      const result = await wrenchService.removeWrench('non-existent');

      expect(result).toBe(false);
    });

    it('should get wrench by ID', () => {
      wrenchService.addWrench(validConfig);
      const wrench = wrenchService.getWrench('wrench-001');

      expect(wrench).toEqual(validConfig);
    });

    it('should return undefined for non-existent wrench', () => {
      const wrench = wrenchService.getWrench('non-existent');

      expect(wrench).toBeUndefined();
    });
  });

  describe('Connection Management', () => {
    const bluetoothConfig: DigitalWrenchConfig = {
      id: 'bt-wrench',
      name: 'Bluetooth Wrench',
      brand: WrenchBrand.SNAP_ON,
      model: 'ATECH3F150',
      connectionType: WrenchConnectionType.BLUETOOTH,
      address: '00:11:22:33:44:55',
      calibrationDate: new Date(),
      calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
    };

    const wifiConfig: DigitalWrenchConfig = {
      id: 'wifi-wrench',
      name: 'WiFi Wrench',
      brand: WrenchBrand.NORBAR,
      model: 'EvoTorque',
      connectionType: WrenchConnectionType.WIFI,
      address: '192.168.1.100',
      calibrationDate: new Date(),
      calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
    };

    beforeEach(async () => {
      await wrenchService.addWrench(bluetoothConfig);
      await wrenchService.addWrench(wifiConfig);
    });

    it('should connect to Bluetooth wrench successfully', async () => {
      const result = await wrenchService.connect('bt-wrench');

      expect(result).toBe(true);
      expect(wrenchService.isConnected('bt-wrench')).toBe(true);
    });

    it('should connect to WiFi wrench successfully', async () => {
      const result = await wrenchService.connect('wifi-wrench');

      expect(result).toBe(true);
      expect(wrenchService.isConnected('wifi-wrench')).toBe(true);
    });

    it('should fail to connect to non-existent wrench', async () => {
      await expect(
        wrenchService.connect('non-existent')
      ).rejects.toThrow('Wrench configuration not found: non-existent');
    });

    it('should disconnect from wrench successfully', async () => {
      await wrenchService.connect('bt-wrench');
      const result = await wrenchService.disconnect('bt-wrench');

      expect(result).toBe(true);
      expect(wrenchService.isConnected('bt-wrench')).toBe(false);
    });

    it('should handle disconnection from non-connected wrench', async () => {
      const result = await wrenchService.disconnect('bt-wrench');

      expect(result).toBe(true); // Should succeed even if not connected
    });

    it('should get connection status correctly', async () => {
      expect(wrenchService.isConnected('bt-wrench')).toBe(false);

      await wrenchService.connect('bt-wrench');
      expect(wrenchService.isConnected('bt-wrench')).toBe(true);

      await wrenchService.disconnect('bt-wrench');
      expect(wrenchService.isConnected('bt-wrench')).toBe(false);
    });
  });

  describe('Data Reading', () => {
    const config: DigitalWrenchConfig = {
      id: 'test-wrench',
      name: 'Test Wrench',
      brand: WrenchBrand.SNAP_ON,
      model: 'ATECH3F150',
      connectionType: WrenchConnectionType.BLUETOOTH,
      address: '00:11:22:33:44:55',
      calibrationDate: new Date(),
      calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
    };

    beforeEach(async () => {
      await wrenchService.addWrench(config);
      await wrenchService.connect('test-wrench');
    });

    it('should read torque data successfully', async () => {
      const reading = await wrenchService.readTorque('test-wrench');

      expect(reading).toBeDefined();
      expect(reading.wrenchId).toBe('test-wrench');
      expect(reading.torque).toBe(150.0);
      expect(reading.angle).toBe(45.0);
      expect(reading.timestamp).toBeInstanceOf(Date);
      expect(reading.units).toBe('Nm');
    });

    it('should fail to read from disconnected wrench', async () => {
      await wrenchService.disconnect('test-wrench');

      await expect(
        wrenchService.readTorque('test-wrench')
      ).rejects.toThrow('Wrench test-wrench is not connected');
    });

    it('should fail to read from non-existent wrench', async () => {
      await expect(
        wrenchService.readTorque('non-existent')
      ).rejects.toThrow('Wrench configuration not found: non-existent');
    });

    it('should emit data event on successful reading', async () => {
      const dataSpy = vi.fn();
      wrenchService.on('data', dataSpy);

      await wrenchService.readTorque('test-wrench');

      expect(dataSpy).toHaveBeenCalledOnce();
      expect(dataSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          wrenchId: 'test-wrench',
          torque: 150.0,
          angle: 45.0
        })
      );
    });
  });

  describe('Calibration Management', () => {
    const config: DigitalWrenchConfig = {
      id: 'cal-wrench',
      name: 'Calibration Test Wrench',
      brand: WrenchBrand.CDI,
      model: '2503MRMH',
      connectionType: WrenchConnectionType.SERIAL,
      address: 'COM1',
      calibrationDate: new Date('2024-01-01'),
      calibrationDue: new Date('2024-06-01'), // 6 months
      isActive: true,
      settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
    };

    beforeEach(async () => {
      await wrenchService.addWrench(config);
    });

    it('should detect expired calibration', () => {
      const expiredConfig = {
        ...config,
        calibrationDue: new Date('2023-12-31') // Past date
      };

      const isExpired = wrenchService.isCalibrationExpired(expiredConfig);
      expect(isExpired).toBe(true);
    });

    it('should detect valid calibration', () => {
      const validConfig = {
        ...config,
        calibrationDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };

      const isExpired = wrenchService.isCalibrationExpired(validConfig);
      expect(isExpired).toBe(false);
    });

    it('should detect calibration expiring soon', () => {
      const expiringSoonConfig = {
        ...config,
        calibrationDue: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
      };

      const isExpiringSoon = wrenchService.isCalibrationExpiringSoon(expiringSoonConfig, 7);
      expect(isExpiringSoon).toBe(true);
    });

    it('should not detect calibration expiring soon when far out', () => {
      const validConfig = {
        ...config,
        calibrationDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      };

      const isExpiringSoon = wrenchService.isCalibrationExpiringSoon(validConfig, 7);
      expect(isExpiringSoon).toBe(false);
    });

    it('should get calibration status', () => {
      const status = wrenchService.getCalibrationStatus('cal-wrench');

      expect(status).toBeDefined();
      expect(status.wrenchId).toBe('cal-wrench');
      expect(status.isExpired).toBe(true); // config has past due date
      expect(status.calibrationDate).toEqual(config.calibrationDate);
      expect(status.calibrationDue).toEqual(config.calibrationDue);
    });

    it('should update calibration date', async () => {
      const newCalDate = new Date();
      const newDueDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await wrenchService.updateCalibration('cal-wrench', newCalDate, newDueDate);

      const updatedWrench = wrenchService.getWrench('cal-wrench');
      expect(updatedWrench?.calibrationDate).toEqual(newCalDate);
      expect(updatedWrench?.calibrationDue).toEqual(newDueDate);
    });

    it('should fail to update calibration for non-existent wrench', async () => {
      const newCalDate = new Date();
      const newDueDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await expect(
        wrenchService.updateCalibration('non-existent', newCalDate, newDueDate)
      ).rejects.toThrow('Wrench configuration not found: non-existent');
    });
  });

  describe('Discovery', () => {
    it('should discover available wrenches', async () => {
      const discovered = await wrenchService.discoverWrenches();

      expect(Array.isArray(discovered)).toBe(true);
      // Mock implementation should return some discovered devices
      expect(discovered.length).toBeGreaterThanOrEqual(0);
    });

    it('should discover Bluetooth wrenches specifically', async () => {
      const bluetoothWrenches = await wrenchService.discoverBluetoothWrenches();

      expect(Array.isArray(bluetoothWrenches)).toBe(true);
      expect(bluetoothWrenches.every(w => w.connectionType === WrenchConnectionType.BLUETOOTH)).toBe(true);
    });

    it('should discover WiFi wrenches specifically', async () => {
      const wifiWrenches = await wrenchService.discoverWiFiWrenches();

      expect(Array.isArray(wifiWrenches)).toBe(true);
      expect(wifiWrenches.every(w => w.connectionType === WrenchConnectionType.WIFI)).toBe(true);
    });

    it('should discover serial wrenches specifically', async () => {
      const serialWrenches = await wrenchService.discoverSerialWrenches();

      expect(Array.isArray(serialWrenches)).toBe(true);
      expect(serialWrenches.every(w => w.connectionType === WrenchConnectionType.SERIAL)).toBe(true);
    });
  });

  describe('Status Monitoring', () => {
    const config: DigitalWrenchConfig = {
      id: 'status-wrench',
      name: 'Status Test Wrench',
      brand: WrenchBrand.SNAP_ON,
      model: 'ATECH3F150',
      connectionType: WrenchConnectionType.BLUETOOTH,
      address: '00:11:22:33:44:55',
      calibrationDate: new Date(),
      calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
    };

    beforeEach(async () => {
      await wrenchService.addWrench(config);
    });

    it('should get wrench status when disconnected', async () => {
      const status = await wrenchService.getWrenchStatus('status-wrench');

      expect(status).toBeDefined();
      expect(status.wrenchId).toBe('status-wrench');
      expect(status.isConnected).toBe(false);
      expect(status.status).toBe(WrenchStatus.DISCONNECTED);
      expect(status.lastReading).toBeUndefined();
    });

    it('should get wrench status when connected', async () => {
      await wrenchService.connect('status-wrench');
      const status = await wrenchService.getWrenchStatus('status-wrench');

      expect(status).toBeDefined();
      expect(status.wrenchId).toBe('status-wrench');
      expect(status.isConnected).toBe(true);
      expect(status.status).toBe(WrenchStatus.READY);
    });

    it('should include battery level in status', async () => {
      await wrenchService.connect('status-wrench');
      const status = await wrenchService.getWrenchStatus('status-wrench');

      expect(status.batteryLevel).toBeDefined();
      expect(status.batteryLevel).toBeGreaterThanOrEqual(0);
      expect(status.batteryLevel).toBeLessThanOrEqual(100);
    });

    it('should include signal strength in status', async () => {
      await wrenchService.connect('status-wrench');
      const status = await wrenchService.getWrenchStatus('status-wrench');

      expect(status.signalStrength).toBeDefined();
      expect(status.signalStrength).toBeGreaterThanOrEqual(0);
      expect(status.signalStrength).toBeLessThanOrEqual(100);
    });

    it('should fail to get status for non-existent wrench', async () => {
      await expect(
        wrenchService.getWrenchStatus('non-existent')
      ).rejects.toThrow('Wrench configuration not found: non-existent');
    });
  });

  describe('Event Handling', () => {
    const config: DigitalWrenchConfig = {
      id: 'event-wrench',
      name: 'Event Test Wrench',
      brand: WrenchBrand.SNAP_ON,
      model: 'ATECH3F150',
      connectionType: WrenchConnectionType.BLUETOOTH,
      address: '00:11:22:33:44:55',
      calibrationDate: new Date(),
      calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
    };

    beforeEach(async () => {
      await wrenchService.addWrench(config);
    });

    it('should emit connected event on successful connection', async () => {
      const connectedSpy = vi.fn();
      wrenchService.on('connected', connectedSpy);

      await wrenchService.connect('event-wrench');

      expect(connectedSpy).toHaveBeenCalledOnce();
      expect(connectedSpy).toHaveBeenCalledWith({
        wrenchId: 'event-wrench',
        timestamp: expect.any(Date)
      });
    });

    it('should emit disconnected event on disconnection', async () => {
      const disconnectedSpy = vi.fn();
      wrenchService.on('disconnected', disconnectedSpy);

      await wrenchService.connect('event-wrench');
      await wrenchService.disconnect('event-wrench');

      expect(disconnectedSpy).toHaveBeenCalledOnce();
      expect(disconnectedSpy).toHaveBeenCalledWith({
        wrenchId: 'event-wrench',
        timestamp: expect.any(Date)
      });
    });

    it('should emit error event on connection failure', async () => {
      const errorSpy = vi.fn();
      wrenchService.on('error', errorSpy);

      // Mock connection failure
      const mockBluetooth = wrenchService['protocols'].get('event-wrench');
      if (mockBluetooth) {
        vi.spyOn(mockBluetooth, 'connect').mockRejectedValueOnce(new Error('Connection failed'));
      }

      await expect(wrenchService.connect('event-wrench')).rejects.toThrow('Connection failed');
      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('should emit calibrationExpired event for expired calibration', async () => {
      const expiredSpy = vi.fn();
      wrenchService.on('calibrationExpired', expiredSpy);

      const expiredConfig = {
        ...config,
        id: 'expired-wrench',
        calibrationDue: new Date('2023-12-31')
      };

      await wrenchService.addWrench(expiredConfig);
      await wrenchService.connect('expired-wrench');

      expect(expiredSpy).toHaveBeenCalledWith({
        wrenchId: 'expired-wrench',
        calibrationDue: expiredConfig.calibrationDue
      });
    });
  });

  describe('Protocol-Specific Tests', () => {
    describe('Snap-On Protocol', () => {
      const snapOnConfig: DigitalWrenchConfig = {
        id: 'snapon-wrench',
        name: 'Snap-On Wrench',
        brand: WrenchBrand.SNAP_ON,
        model: 'ATECH3F150',
        connectionType: WrenchConnectionType.BLUETOOTH,
        address: '00:11:22:33:44:55',
        calibrationDate: new Date(),
        calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
      };

      it('should handle Snap-On specific protocol', async () => {
        await wrenchService.addWrench(snapOnConfig);
        await wrenchService.connect('snapon-wrench');

        const reading = await wrenchService.readTorque('snapon-wrench');

        expect(reading.wrenchId).toBe('snapon-wrench');
        expect(reading.units).toBe('Nm');
      });
    });

    describe('Norbar Protocol', () => {
      const norbarConfig: DigitalWrenchConfig = {
        id: 'norbar-wrench',
        name: 'Norbar Wrench',
        brand: WrenchBrand.NORBAR,
        model: 'EvoTorque',
        connectionType: WrenchConnectionType.WIFI,
        address: '192.168.1.100',
        calibrationDate: new Date(),
        calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
      };

      it('should handle Norbar specific protocol', async () => {
        await wrenchService.addWrench(norbarConfig);
        await wrenchService.connect('norbar-wrench');

        const reading = await wrenchService.readTorque('norbar-wrench');

        expect(reading.wrenchId).toBe('norbar-wrench');
        expect(reading.units).toBe('Nm');
      });
    });

    describe('CDI Protocol', () => {
      const cdiConfig: DigitalWrenchConfig = {
        id: 'cdi-wrench',
        name: 'CDI Wrench',
        brand: WrenchBrand.CDI,
        model: '2503MRMH',
        connectionType: WrenchConnectionType.SERIAL,
        address: 'COM1',
        calibrationDate: new Date(),
        calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
      };

      it('should handle CDI specific protocol', async () => {
        await wrenchService.addWrench(cdiConfig);
        await wrenchService.connect('cdi-wrench');

        const reading = await wrenchService.readTorque('cdi-wrench');

        expect(reading.wrenchId).toBe('cdi-wrench');
        expect(reading.units).toBe('Nm');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle timeout during connection', async () => {
      const timeoutConfig: DigitalWrenchConfig = {
        id: 'timeout-wrench',
        name: 'Timeout Test Wrench',
        brand: WrenchBrand.SNAP_ON,
        model: 'ATECH3F150',
        connectionType: WrenchConnectionType.BLUETOOTH,
        address: '00:11:22:33:44:55',
        calibrationDate: new Date(),
        calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 100 } // Very short timeout
      };

      await wrenchService.addWrench(timeoutConfig);

      // Mock timeout
      const mockProtocol = wrenchService['protocols'].get('timeout-wrench');
      if (mockProtocol) {
        vi.spyOn(mockProtocol, 'connect').mockImplementation(() =>
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 50))
        );
      }

      await expect(
        wrenchService.connect('timeout-wrench')
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle invalid protocol responses', async () => {
      const config: DigitalWrenchConfig = {
        id: 'invalid-wrench',
        name: 'Invalid Response Wrench',
        brand: WrenchBrand.SNAP_ON,
        model: 'ATECH3F150',
        connectionType: WrenchConnectionType.BLUETOOTH,
        address: '00:11:22:33:44:55',
        calibrationDate: new Date(),
        calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        settings: { units: 'Nm', precision: 0.1, autoMode: true, timeout: 30000 }
      };

      await wrenchService.addWrench(config);
      await wrenchService.connect('invalid-wrench');

      // Mock invalid response
      const mockProtocol = wrenchService['protocols'].get('invalid-wrench');
      if (mockProtocol) {
        vi.spyOn(mockProtocol, 'readData').mockResolvedValueOnce(new ArrayBuffer(0));
      }

      await expect(
        wrenchService.readTorque('invalid-wrench')
      ).rejects.toThrow();
    });
  });
});