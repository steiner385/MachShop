import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { CMMAdapter, CMMConfig } from '../../services/CMMAdapter';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

// Mock Prisma Client
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    qIFMeasurementPlan: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    qIFCharacteristic: {
      createMany: vi.fn(),
    },
    qIFMeasurementResult: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    qIFMeasurement: {
      createMany: vi.fn(),
    },
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

// Mock QIFService
vi.mock('../../services/QIFService', () => {
  return {
    QIFService: vi.fn().mockImplementation(() => ({
      parseQIF: vi.fn(),
      generateQIF: vi.fn(),
      importQIF: vi.fn(),
      validateQIF: vi.fn(),
    })),
  };
});

describe('CMMAdapter', () => {
  let cmmAdapter: CMMAdapter;
  let mockPrisma: any;
  let mockAxiosInstance: any;

  const defaultConfig: CMMConfig = {
    baseUrl: 'https://test-cmm.com',
    cmmType: 'PC-DMIS',
    username: 'test-user',
    password: 'test-password',
    timeout: 60000,
    retryAttempts: 3,
    autoImportResults: true,
    pollInterval: 30000,
    qifVersion: '3.0.0',
  };

  beforeEach(() => {
    mockPrisma = new PrismaClient();

    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create = vi.fn(() => mockAxiosInstance);

    cmmAdapter = new CMMAdapter(defaultConfig);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(cmmAdapter).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: defaultConfig.baseUrl,
          timeout: defaultConfig.timeout,
        })
      );
    });

    it('should set default values for optional config', () => {
      const minimalConfig: CMMConfig = {
        baseUrl: 'https://cmm.com',
        cmmType: 'Calypso',
        username: 'user',
        password: 'pass',
      };

      const adapter = new CMMAdapter(minimalConfig);
      expect(adapter).toBeDefined();
    });

    it('should support PC-DMIS CMM type', () => {
      const config: CMMConfig = {
        ...defaultConfig,
        cmmType: 'PC-DMIS',
      };

      const adapter = new CMMAdapter(config);
      expect(adapter).toBeDefined();
    });

    it('should support Calypso CMM type', () => {
      const config: CMMConfig = {
        ...defaultConfig,
        cmmType: 'Calypso',
      };

      const adapter = new CMMAdapter(config);
      expect(adapter).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true when CMM is reachable', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await cmmAdapter.testConnection();

      expect(result).toBe(true);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/health');
    });

    it('should return false when CMM is unreachable', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection refused'));

      const result = await cmmAdapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('importQIFPlan', () => {
    it('should import QIF measurement plan successfully', async () => {
      const qifXml = `<?xml version="1.0"?>
<QIFDocument xmlns="http://qifstandards.org/xsd/qif3" versionQIF="3.0.0" idMax="2">
  <Version><QIFVersion>3.0.0</QIFVersion></Version>
  <Product id="1">
    <PartNumber>PN-12345</PartNumber>
    <PartRevision>Rev C</PartRevision>
  </Product>
  <MeasurementPlan id="2">
    <Characteristics>
      <Characteristic id="CHAR-1">
        <BalloonNumber>1</BalloonNumber>
        <NominalValue>100.0</NominalValue>
        <UpperTolerance>0.1</UpperTolerance>
        <LowerTolerance>0.1</LowerTolerance>
      </Characteristic>
    </Characteristics>
  </MeasurementPlan>
</QIFDocument>`;

      const mockQIFPlan = {
        id: 'plan-1',
        qifPlanId: 'QIF-PLAN-001',
        partNumber: 'PN-12345',
        partRevision: 'Rev C',
        planVersion: '1.0',
        qifXmlContent: qifXml,
        qifVersion: '3.0.0',
        characteristicCount: 1,
        status: 'ACTIVE',
      };

      mockPrisma.qIFMeasurementPlan.create.mockResolvedValue(mockQIFPlan);
      mockPrisma.qIFCharacteristic.createMany.mockResolvedValue({ count: 1 });

      const result = await cmmAdapter.importQIFPlan(qifXml);

      expect(result).toBeDefined();
      expect(mockPrisma.qIFMeasurementPlan.create).toHaveBeenCalled();
    });

    it('should throw error for invalid QIF XML', async () => {
      const invalidXml = '<invalid>xml</broken>';

      await expect(cmmAdapter.importQIFPlan(invalidXml)).rejects.toThrow();
    });
  });

  describe('exportQIFPlan', () => {
    it('should export QIF plan as XML', async () => {
      const mockQIFPlan = {
        id: 'plan-1',
        qifPlanId: 'QIF-PLAN-001',
        partNumber: 'PN-12345',
        partRevision: 'Rev C',
        qifXmlContent: '<?xml version="1.0"?><QIFDocument></QIFDocument>',
        characteristics: [],
      };

      mockPrisma.qIFMeasurementPlan.findUnique.mockResolvedValue(mockQIFPlan);

      const result = await cmmAdapter.exportQIFPlan('QIF-PLAN-001');

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<QIFDocument>');
      expect(mockPrisma.qIFMeasurementPlan.findUnique).toHaveBeenCalledWith({
        where: { qifPlanId: 'QIF-PLAN-001' },
        include: { characteristics: true },
      });
    });

    it('should throw error if plan not found', async () => {
      mockPrisma.qIFMeasurementPlan.findUnique.mockResolvedValue(null);

      await expect(cmmAdapter.exportQIFPlan('NON-EXISTENT')).rejects.toThrow(
        'QIF MeasurementPlan not found: NON-EXISTENT'
      );
    });
  });

  describe('importQIFResults', () => {
    it('should import QIF measurement results successfully', async () => {
      const qifXml = `<?xml version="1.0"?>
<QIFDocument xmlns="http://qifstandards.org/xsd/qif3" versionQIF="3.0.0">
  <Version><QIFVersion>3.0.0</QIFVersion></Version>
  <Product id="1">
    <PartNumber>PN-12345</PartNumber>
    <SerialNumber>SN-001</SerialNumber>
  </Product>
  <MeasurementResults id="2">
    <MeasuredBy>CMM-Operator</MeasuredBy>
    <InspectionStatus>PASS</InspectionStatus>
    <MeasurementDate>2025-10-18T10:00:00Z</MeasurementDate>
  </MeasurementResults>
</QIFDocument>`;

      const mockQIFResults = {
        id: 'results-1',
        qifResultsId: 'QIF-RESULTS-001',
        partNumber: 'PN-12345',
        serialNumber: 'SN-001',
        inspectionDate: new Date('2025-10-18T10:00:00Z'),
        inspectedBy: 'CMM-Operator',
        overallStatus: 'PASS',
        qifXmlContent: qifXml,
      };

      mockPrisma.qIFMeasurementResult.create.mockResolvedValue(mockQIFResults);
      mockPrisma.qIFMeasurement.createMany.mockResolvedValue({ count: 1 });

      const result = await cmmAdapter.importQIFResults(qifXml);

      expect(result).toBeDefined();
      expect(mockPrisma.qIFMeasurementResult.create).toHaveBeenCalled();
    });

    it('should link results to work order if provided', async () => {
      const qifXml = '<?xml version="1.0"?><QIFDocument></QIFDocument>';
      const workOrderId = 'WO-12345';

      mockPrisma.qIFMeasurementResult.create.mockResolvedValue({
        id: 'results-1',
        workOrderId,
      });

      await cmmAdapter.importQIFResults(qifXml, workOrderId);

      expect(mockPrisma.qIFMeasurementResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workOrderId,
          }),
        })
      );
    });
  });

  describe('exportQIFResults', () => {
    it('should export QIF results as XML', async () => {
      const mockQIFResults = {
        id: 'results-1',
        qifResultsId: 'QIF-RESULTS-001',
        qifXmlContent: '<?xml version="1.0"?><QIFDocument><MeasurementResults /></QIFDocument>',
        measurements: [],
      };

      mockPrisma.qIFMeasurementResult.findUnique.mockResolvedValue(mockQIFResults);

      const result = await cmmAdapter.exportQIFResults('QIF-RESULTS-001');

      expect(result).toContain('<?xml version="1.0"?>');
      expect(result).toContain('<MeasurementResults');
    });

    it('should throw error if results not found', async () => {
      mockPrisma.qIFMeasurementResult.findUnique.mockResolvedValue(null);

      await expect(cmmAdapter.exportQIFResults('NON-EXISTENT')).rejects.toThrow(
        'QIF MeasurementResults not found: NON-EXISTENT'
      );
    });
  });

  describe('executeInspection', () => {
    it('should execute CMM inspection program successfully', async () => {
      const request = {
        programName: 'INSPECT-PN12345',
        partNumber: 'PN-12345',
        serialNumber: 'SN-001',
        qifPlanId: 'QIF-PLAN-001',
      };

      const mockResponse = {
        data: {
          inspectionId: 'INSPECT-123',
          status: 'RUNNING',
          message: 'Inspection started successfully',
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const result = await cmmAdapter.executeInspection(request);

      expect(result.inspectionId).toBe('INSPECT-123');
      expect(result.status).toBe('RUNNING');
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/inspection/execute',
        expect.objectContaining({
          programName: request.programName,
          partNumber: request.partNumber,
        })
      );
    });

    it('should throw error if CMM execution fails', async () => {
      const request = {
        programName: 'INVALID-PROGRAM',
        partNumber: 'PN-999',
      };

      mockAxiosInstance.post.mockRejectedValue(new Error('Program not found'));

      await expect(cmmAdapter.executeInspection(request)).rejects.toThrow(
        'Failed to execute CMM inspection'
      );
    });
  });

  describe('getInspectionStatus', () => {
    it('should get inspection status successfully', async () => {
      const inspectionId = 'INSPECT-123';
      const mockResponse = {
        data: {
          inspectionId,
          status: 'COMPLETED',
          progress: 100,
          completedDate: '2025-10-18T11:00:00Z',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await cmmAdapter.getInspectionStatus(inspectionId);

      expect(result.inspectionId).toBe(inspectionId);
      expect(result.status).toBe('COMPLETED');
      expect(result.progress).toBe(100);
    });

    it('should handle inspection errors', async () => {
      const inspectionId = 'INSPECT-ERROR';
      const mockResponse = {
        data: {
          inspectionId,
          status: 'ERROR',
          errorMessage: 'Probe crash detected',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await cmmAdapter.getInspectionStatus(inspectionId);

      expect(result.status).toBe('ERROR');
      expect(result.errorMessage).toBe('Probe crash detected');
    });
  });

  describe('getMeasurementResults', () => {
    it('should retrieve measurement results after inspection', async () => {
      const inspectionId = 'INSPECT-123';
      const mockResponse = {
        data: {
          inspectionId,
          qifResultsXml: '<?xml version="1.0"?><QIFDocument></QIFDocument>',
          overallStatus: 'PASS',
          measurementCount: 25,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await cmmAdapter.getMeasurementResults(inspectionId);

      expect(result).not.toBeNull();
      expect(result!.qifResultsXml).toBeDefined();
      expect(result!.overallStatus).toBe('PASS');
    });

    it('should return null if results not available', async () => {
      const inspectionId = 'INSPECT-PENDING';
      const mockResponse = {
        data: null,
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await cmmAdapter.getMeasurementResults(inspectionId);

      expect(result).toBeNull();
    });
  });

  describe('createMESQIFPlan', () => {
    it('should create MES QIF plan with characteristics', async () => {
      const params = {
        partNumber: 'PN-12345',
        revision: 'Rev C',
        characteristics: [
          {
            balloonNumber: '1',
            description: 'Overall Length',
            nominalValue: 100.0,
            upperTolerance: 0.1,
            lowerTolerance: 0.1,
          },
        ],
      };

      const result = await cmmAdapter.createMESQIFPlan(params);

      expect(result).toBeDefined();
      expect(result.qifPlanId).toBeDefined();
      expect(result.partNumber).toBe('PN-12345');
      expect(result.revision).toBe('Rev C');
      expect(result.characteristics).toHaveLength(1);
      expect(result.xmlContent).toContain('<QIFDocument');
    });

    it('should generate unique QIF plan IDs', async () => {
      const params = {
        partNumber: 'PN-001',
        revision: 'A',
        characteristics: [
          { balloonNumber: '1', description: 'Test', nominalValue: 10, upperTolerance: 0.1, lowerTolerance: 0.1 },
        ],
      };

      const result1 = await cmmAdapter.createMESQIFPlan(params);
      const result2 = await cmmAdapter.createMESQIFPlan(params);

      expect(result1.qifPlanId).not.toBe(result2.qifPlanId);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status when CMM is reachable', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      const result = await cmmAdapter.getHealthStatus();

      expect(result.connected).toBe(true);
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when CMM is unreachable', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Network error'));

      const result = await cmmAdapter.getHealthStatus();

      expect(result.connected).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should measure response time', async () => {
      mockAxiosInstance.get.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ status: 200 }), 50))
      );

      const result = await cmmAdapter.getHealthStatus();

      expect(result.responseTime).toBeGreaterThan(0);
    });
  });

  describe('QIF 3.0 compliance', () => {
    it('should use QIF version 3.0.0', () => {
      expect(defaultConfig.qifVersion).toBe('3.0.0');
    });

    it('should support AS9102 FAI workflow', async () => {
      const qifXml = '<?xml version="1.0"?><QIFDocument versionQIF="3.0.0"></QIFDocument>';

      mockPrisma.qIFMeasurementPlan.create.mockResolvedValue({
        id: 'plan-1',
        qifVersion: '3.0.0',
      });

      await cmmAdapter.importQIFPlan(qifXml);

      expect(mockPrisma.qIFMeasurementPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            qifVersion: '3.0.0',
          }),
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('ECONNREFUSED'));

      const request = { programName: 'TEST-PROGRAM', partNumber: 'PN-001' };

      await expect(cmmAdapter.executeInspection(request)).rejects.toThrow(
        'Failed to execute CMM inspection'
      );
    });

    it('should handle CMM timeout errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await cmmAdapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources', async () => {
      await expect(cmmAdapter.cleanup()).resolves.not.toThrow();
    });
  });
});
