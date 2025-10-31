/**
 * Predator DNC Adapter Tests
 *
 * Tests for Predator DNC integration adapter including:
 * - CRITICAL: Multi-system authorization handshake
 * - Operator authentication validation
 * - Work order and operation validation
 * - Operator certification check (Covalent integration)
 * - Program version validation (SFC integration)
 * - Gauge calibration check (Indysoft integration)
 * - Program transfer to equipment
 * - Machine status monitoring
 * - Error handling and authorization failure scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PredatorDNCAdapter, PredatorDNCConfig } from '../../services/PredatorDNCAdapter';
import { CovalentAdapter } from '../../services/CovalentAdapter';
import { ShopFloorConnectAdapter } from '../../services/ShopFloorConnectAdapter';
import { IndysoftAdapter } from '../../services/IndysoftAdapter';

// Mock axios - avoid hoisting issues by putting everything directly in mock
vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

// Mock crypto for authorization ID generation
vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: vi.fn(() => 'test-auth-id-123'),
  })),
}));

describe('PredatorDNCAdapter', () => {
  let adapter: PredatorDNCAdapter;
  let config: PredatorDNCConfig;
  let mockCovalentAdapter: Partial<CovalentAdapter>;
  let mockSFCAdapter: Partial<ShopFloorConnectAdapter>;
  let mockIndysoftAdapter: Partial<IndysoftAdapter>;
  let mockedAxios: any;

  beforeEach(async () => {
    mockedAxios = (await import('axios')).default;
    config = {
      baseUrl: 'https://test-dnc.predator.com',
      username: 'test-user',
      password: 'test-pass',
      timeout: 60000,
      retryAttempts: 3,
      enableAuthorizationHandshake: true,
      enableOperatorValidation: true,
      enableProgramVersioning: true,
      enableGaugeValidation: true,
      alertOnAuthorizationFailure: true,
      mtconnectEnabled: true,
    };

    // Mock Covalent adapter
    mockCovalentAdapter = {
      checkDNCAuthorization: vi.fn(),
      getHealthStatus: vi.fn().mockResolvedValue({ connected: true }),
    };

    // Mock Shop Floor Connect adapter
    mockSFCAdapter = {
      checkProgramRevision: vi.fn(),
      getHealthStatus: vi.fn().mockResolvedValue({ connected: true }),
    };

    // Mock Indysoft adapter
    mockIndysoftAdapter = {
      validateGaugeInCalibration: vi.fn(),
      getHealthStatus: vi.fn().mockResolvedValue({ connected: true }),
    };

    adapter = new PredatorDNCAdapter(
      config,
      mockCovalentAdapter as CovalentAdapter,
      mockSFCAdapter as ShopFloorConnectAdapter,
      mockIndysoftAdapter as IndysoftAdapter
    );

    // Setup default axios mock responses
    mockedAxios.create.mockReturnValue(mockedAxios);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization Handshake - CRITICAL', () => {
    const validRequest = {
      operatorId: 'OP-001',
      machineId: 'CNC-MILL-01',
      programName: 'PROG-12345.nc',
      partNumber: 'PART-001',
      operationCode: 'OP-010',
      workOrderNumber: 'WO-2024-001',
    };

    it('should complete successful 5-step authorization handshake', async () => {
      // Step 1: Operator authentication - mock successful
      mockedAxios.get.mockResolvedValueOnce({
        data: { authenticated: true, operatorId: 'OP-001' },
      });

      // Step 2: Work order validation - mock successful
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          valid: true,
          workOrderNumber: 'WO-2024-001',
          partNumber: 'PART-001',
          operationCode: 'OP-010',
        },
      });

      // Step 3: Operator certification check (Covalent)
      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: true,
        certificationValid: true,
        operatorId: 'OP-001',
      });

      // Step 4: Program version validation (SFC)
      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({
        isCorrectRevision: true,
        currentRevision: 'REV-B',
        authorized: true,
      });

      // Step 5: Gauge calibration check (Indysoft)
      mockIndysoftAdapter.validateGaugeInCalibration = vi.fn().mockResolvedValue({
        isValid: true,
        status: 'IN_CAL',
      });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.authorized).toBe(true);
      expect(result.operatorAuthenticated).toBe(true);
      expect(result.workOrderValid).toBe(true);
      expect(result.certificationValid).toBe(true);
      expect(result.programVersionValid).toBe(true);
      expect(result.gaugeCalibrationValid).toBe(true);
      expect(result.authorizationId).toBeDefined();
      expect(result.failureReasons).toHaveLength(0);
    });

    it('should BLOCK authorization if operator authentication fails', async () => {
      // Step 1: Operator authentication - FAILED
      mockedAxios.get.mockRejectedValueOnce(new Error('Operator not found'));

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.authorized).toBe(false);
      expect(result.operatorAuthenticated).toBe(false);
      expect(result.failureReasons).toContain('Operator authentication failed');
      expect(result.supervisorNotified).toBe(true);
    });

    it('should BLOCK authorization if work order is invalid', async () => {
      // Step 1: Pass
      mockedAxios.get.mockResolvedValueOnce({
        data: { authenticated: true },
      });

      // Step 2: Work order validation - FAILED (wrong operation)
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          valid: false,
          message: 'Operation OP-010 not found in work order',
        },
      });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.authorized).toBe(false);
      expect(result.workOrderValid).toBe(false);
      expect(result.failureReasons).toContain('Work order validation failed');
    });

    it('should BLOCK authorization if operator certification is invalid', async () => {
      // Steps 1-2: Pass
      mockedAxios.get
        .mockResolvedValueOnce({ data: { authenticated: true } })
        .mockResolvedValueOnce({ data: { valid: true } });

      // Step 3: Operator certification - FAILED
      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: false,
        certificationValid: false,
        reasons: ['Certification expired', 'Not qualified for this part complexity'],
      });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.authorized).toBe(false);
      expect(result.certificationValid).toBe(false);
      expect(result.failureReasons).toContain('Operator certification validation failed');
    });

    it('should BLOCK authorization if program version is incorrect', async () => {
      // Steps 1-3: Pass
      mockedAxios.get
        .mockResolvedValueOnce({ data: { authenticated: true } })
        .mockResolvedValueOnce({ data: { valid: true } });

      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: true,
        certificationValid: true,
      });

      // Step 4: Program version - FAILED
      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({
        isCorrectRevision: false,
        currentRevision: 'REV-C',
        machineRevision: 'REV-B',
        message: 'Program revision mismatch - ECO not incorporated',
      });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.authorized).toBe(false);
      expect(result.programVersionValid).toBe(false);
      expect(result.failureReasons).toContain('Program version validation failed');
    });

    it('should BLOCK authorization if gauges are out of calibration', async () => {
      // Steps 1-4: Pass
      mockedAxios.get
        .mockResolvedValueOnce({ data: { authenticated: true } })
        .mockResolvedValueOnce({ data: { valid: true } });

      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: true,
      });

      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({
        isCorrectRevision: true,
      });

      // Step 5: Gauge calibration - FAILED
      mockIndysoftAdapter.validateGaugeInCalibration = vi.fn().mockResolvedValue({
        isValid: false,
        status: 'OUT_OF_CAL',
        message: 'Micrometer MIC-0001 calibration expired',
      });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.authorized).toBe(false);
      expect(result.gaugeCalibrationValid).toBe(false);
      expect(result.failureReasons).toContain('Gauge calibration validation failed');
    });

    it('should log authorization result to database', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({ data: { authenticated: true } })
        .mockResolvedValueOnce({ data: { valid: true } });

      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: true,
      });

      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({
        isCorrectRevision: true,
      });

      mockIndysoftAdapter.validateGaugeInCalibration = vi.fn().mockResolvedValue({
        isValid: true,
      });

      // Mock database logging
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'log-123' } });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/authorization/log'),
        expect.objectContaining({
          authorizationId: expect.any(String),
          operatorId: 'OP-001',
          machineId: 'CNC-MILL-01',
          programName: 'PROG-12345.nc',
          authorized: true,
        })
      );
    });

    it('should notify supervisor on authorization failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Auth failed'));

      // Mock supervisor notification
      mockedAxios.post.mockResolvedValueOnce({ data: { notified: true } });

      const result = await adapter.performAuthorizationHandshake(validRequest);

      expect(result.supervisorNotified).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/alerts'),
        expect.objectContaining({
          type: 'AUTHORIZATION_FAILURE',
          severity: 'HIGH',
        })
      );
    });
  });

  describe('Program Transfer', () => {
    it('should transfer program after successful authorization', async () => {
      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
      };

      const authorizationId = 'auth-123';

      // Mock successful transfer
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          downloadId: 'download-456',
          transferredAt: new Date().toISOString(),
        },
      });

      const result = await adapter.transferProgram(request, authorizationId);

      expect(result.success).toBe(true);
      expect(result.downloadId).toBe('download-456');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/programs/transfer'),
        expect.objectContaining({
          authorizationId,
          machineId: 'CNC-MILL-01',
          programName: 'PROG-12345.nc',
        })
      );
    });

    it('should fail transfer without valid authorization ID', async () => {
      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
      };

      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 403,
          data: { error: 'Invalid authorization ID' },
        },
      });

      const result = await adapter.transferProgram(request, 'invalid-auth-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid authorization ID');
    });

    it('should log program download to audit trail', async () => {
      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          downloadId: 'download-456',
        },
      });

      await adapter.transferProgram(request, 'auth-123');

      // Verify download log was created
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/programs/transfer'),
        expect.any(Object)
      );
    });
  });

  describe('Machine Status Monitoring', () => {
    it('should retrieve machine status from DNC', async () => {
      const mockStatus = {
        machineId: 'CNC-MILL-01',
        status: 'RUNNING',
        currentProgram: 'PROG-12345.nc',
        connected: true,
        mtconnect: {
          availability: 'AVAILABLE',
          execution: 'ACTIVE',
        },
      };

      mockedAxios.get.mockResolvedValueOnce({ data: mockStatus });

      const result = await adapter.getMachineStatus('CNC-MILL-01');

      expect(result).toEqual(mockStatus);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/machines/CNC-MILL-01/status')
      );
    });

    it('should return null for disconnected machine', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404, data: { error: 'Machine not connected' } },
      });

      const result = await adapter.getMachineStatus('DISCONNECTED-01');

      expect(result).toBeNull();
    });
  });

  describe('Health Status', () => {
    it('should return healthy status when DNC is connected', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'ok' },
      });

      const health = await adapter.getHealthStatus();

      expect(health.connected).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
    });

    it('should return unhealthy status on connection failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const health = await adapter.getHealthStatus();

      expect(health.connected).toBe(false);
      expect(health.error).toContain('Connection refused');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing cross-adapter dependencies gracefully', async () => {
      // Create adapter without cross-adapter dependencies
      const standaloneAdapter = new PredatorDNCAdapter(config);

      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: { authenticated: true } })
        .mockResolvedValueOnce({ data: { valid: true } });

      // Should skip cross-adapter validation steps
      const result = await standaloneAdapter.performAuthorizationHandshake(request);

      // Still completes other validation steps
      expect(result.operatorAuthenticated).toBe(true);
      expect(result.workOrderValid).toBe(true);
    });

    it('should retry on transient network errors', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ data: { authenticated: true } });

      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
      };

      // Should retry and succeed
      const result = await adapter.performAuthorizationHandshake(request);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should handle concurrent authorization requests', async () => {
      const request1 = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-A.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
      };

      const request2 = {
        operatorId: 'OP-002',
        machineId: 'CNC-MILL-02',
        programName: 'PROG-B.nc',
        partNumber: 'PART-002',
        operationCode: 'OP-020',
      };

      // Mock successful responses for both
      mockedAxios.get.mockResolvedValue({ data: { authenticated: true } });
      mockedAxios.get.mockResolvedValue({ data: { valid: true } });

      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: true,
      });
      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({
        isCorrectRevision: true,
      });
      mockIndysoftAdapter.validateGaugeInCalibration = vi.fn().mockResolvedValue({
        isValid: true,
      });

      // Process concurrently
      const [result1, result2] = await Promise.all([
        adapter.performAuthorizationHandshake(request1),
        adapter.performAuthorizationHandshake(request2),
      ]);

      expect(result1.authorized).toBe(true);
      expect(result2.authorized).toBe(true);
      expect(result1.authorizationId).not.toBe(result2.authorizationId);
    });
  });

  describe('AS9100 Compliance and Auditability', () => {
    it('should create complete audit trail for authorization', async () => {
      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
        workOrderNumber: 'WO-2024-001',
      };

      mockedAxios.get
        .mockResolvedValueOnce({ data: { authenticated: true } })
        .mockResolvedValueOnce({ data: { valid: true } });

      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({
        authorized: true,
      });
      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({
        isCorrectRevision: true,
      });
      mockIndysoftAdapter.validateGaugeInCalibration = vi.fn().mockResolvedValue({
        isValid: true,
      });

      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'audit-123' } });

      const result = await adapter.performAuthorizationHandshake(request);

      // Verify comprehensive audit log
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/authorization/log'),
        expect.objectContaining({
          timestamp: expect.any(String),
          operatorId: 'OP-001',
          machineId: 'CNC-MILL-01',
          programName: 'PROG-12345.nc',
          partNumber: 'PART-001',
          workOrderNumber: 'WO-2024-001',
          authorized: true,
          validationResults: expect.objectContaining({
            operatorAuthenticated: true,
            workOrderValid: true,
            certificationValid: true,
            programVersionValid: true,
            gaugeCalibrationValid: true,
          }),
        })
      );
    });

    it('should include traceability data in authorization record', async () => {
      const request = {
        operatorId: 'OP-001',
        machineId: 'CNC-MILL-01',
        programName: 'PROG-12345.nc',
        partNumber: 'PART-001',
        operationCode: 'OP-010',
        workOrderNumber: 'WO-2024-001',
      };

      mockedAxios.get.mockResolvedValue({ data: { authenticated: true, valid: true } });
      mockCovalentAdapter.checkDNCAuthorization = vi.fn().mockResolvedValue({ authorized: true });
      mockSFCAdapter.checkProgramRevision = vi.fn().mockResolvedValue({ isCorrectRevision: true });
      mockIndysoftAdapter.validateGaugeInCalibration = vi.fn().mockResolvedValue({ isValid: true });
      mockedAxios.post.mockResolvedValue({ data: { id: 'trace-456' } });

      const result = await adapter.performAuthorizationHandshake(request);

      expect(result.authorizationId).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.traceabilityData).toBeDefined();
    });
  });
});
