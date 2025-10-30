import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { torqueRouter } from '@/routes/torque';
import { TorqueService } from '@/services/TorqueService';
import { DigitalWrenchService } from '@/services/DigitalWrenchService';
import { TorqueValidationService } from '@/services/TorqueValidationService';
import { TorqueRealtimeService } from '@/services/TorqueRealtimeService';
import { TorqueOrchestrationService } from '@/services/TorqueOrchestrationService';
import { TorqueReportingService } from '@/services/TorqueReportingService';
import { TorqueSignatureWorkflowService } from '@/services/TorqueSignatureWorkflowService';
import { authorize } from '@/middleware/authorize';
import { validateRequest } from '@/middleware/validateRequest';
import {
  TorqueSpecification,
  TorqueSequence,
  TorqueEvent,
  TorqueStatus,
  TorqueMethod,
  TorquePattern,
  DigitalWrenchConfig,
  WrenchConnectionType,
  WrenchBrand,
  TorqueReportFormat
} from '@/types/torque';

// Mock all services
vi.mock('@/services/TorqueService');
vi.mock('@/services/DigitalWrenchService');
vi.mock('@/services/TorqueValidationService');
vi.mock('@/services/TorqueRealtimeService');
vi.mock('@/services/TorqueOrchestrationService');
vi.mock('@/services/TorqueReportingService');
vi.mock('@/services/TorqueSignatureWorkflowService');

// Mock middleware
vi.mock('@/middleware/authorize', () => ({
  authorize: vi.fn(() => (req: any, res: any, next: any) => {
    req.user = { id: 'user-123', roles: ['Quality Engineer'] };
    next();
  }),
  authorizeTorqueSpecManagement: vi.fn((req: any, res: any, next: any) => next()),
  authorizeTorqueExecution: vi.fn((req: any, res: any, next: any) => next()),
  authorizeTorqueSupervision: vi.fn((req: any, res: any, next: any) => next()),
  authorizeSystemConfiguration: vi.fn((req: any, res: any, next: any) => next())
}));

vi.mock('@/middleware/validateRequest', () => ({
  validateRequest: vi.fn(() => (req: any, res: any, next: any) => next()),
  validateQuery: vi.fn(() => (req: any, res: any, next: any) => next()),
  validateParams: vi.fn(() => (req: any, res: any, next: any) => next())
}));

describe('Torque Routes', () => {
  let app: express.Application;
  let mockTorqueService: TorqueService;
  let mockWrenchService: DigitalWrenchService;
  let mockValidationService: TorqueValidationService;
  let mockRealtimeService: TorqueRealtimeService;
  let mockOrchestrationService: TorqueOrchestrationService;
  let mockReportingService: TorqueReportingService;
  let mockSignatureService: TorqueSignatureWorkflowService;

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

  const mockEvent: TorqueEvent = {
    id: 'event-123',
    sequenceId: 'seq-123',
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
    operatorId: 'operator-123',
    timestamp: new Date(),
    createdAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock service instances
    mockTorqueService = new TorqueService();
    mockWrenchService = new DigitalWrenchService();
    mockValidationService = new TorqueValidationService();
    mockRealtimeService = new TorqueRealtimeService();
    mockOrchestrationService = new TorqueOrchestrationService();
    mockReportingService = new TorqueReportingService();
    mockSignatureService = new TorqueSignatureWorkflowService();

    // Setup default mock implementations
    vi.mocked(mockTorqueService.getTorqueSpecification).mockResolvedValue(mockSpec);
    vi.mocked(mockTorqueService.createTorqueSpecification).mockResolvedValue(mockSpec);
    vi.mocked(mockTorqueService.getTorqueEvents).mockResolvedValue([mockEvent]);
    vi.mocked(mockWrenchService.getWrenches).mockReturnValue([]);
    vi.mocked(mockOrchestrationService.isRunning).mockReturnValue(true);

    // Create Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/torque', torqueRouter);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Torque Specifications', () => {
    describe('GET /api/torque/specifications', () => {
      it('should get all torque specifications', async () => {
        vi.mocked(mockTorqueService.getTorqueSpecifications).mockResolvedValue([mockSpec]);

        const response = await request(app)
          .get('/api/torque/specifications')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0]).toEqual(expect.objectContaining({
          id: 'spec-123',
          torqueValue: 150.0
        }));
      });

      it('should handle query parameters', async () => {
        vi.mocked(mockTorqueService.getTorqueSpecifications).mockResolvedValue([mockSpec]);

        await request(app)
          .get('/api/torque/specifications?operationId=op-123&partId=part-456')
          .expect(200);

        expect(mockTorqueService.getTorqueSpecifications).toHaveBeenCalledWith({
          operationId: 'op-123',
          partId: 'part-456'
        });
      });

      it('should handle service errors', async () => {
        vi.mocked(mockTorqueService.getTorqueSpecifications).mockRejectedValue(new Error('Database error'));

        const response = await request(app)
          .get('/api/torque/specifications')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Database error');
      });
    });

    describe('GET /api/torque/specifications/:id', () => {
      it('should get torque specification by ID', async () => {
        const response = await request(app)
          .get('/api/torque/specifications/spec-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(expect.objectContaining({
          id: 'spec-123',
          torqueValue: 150.0
        }));
      });

      it('should return 404 for non-existent specification', async () => {
        vi.mocked(mockTorqueService.getTorqueSpecification).mockResolvedValue(null);

        const response = await request(app)
          .get('/api/torque/specifications/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Torque specification not found');
      });
    });

    describe('POST /api/torque/specifications', () => {
      it('should create new torque specification', async () => {
        const newSpecData = {
          operationId: 'op-456',
          partId: 'part-789',
          torqueValue: 200.0,
          toleranceLower: 190.0,
          toleranceUpper: 210.0,
          targetValue: 200.0,
          method: TorqueMethod.TORQUE_ONLY,
          pattern: TorquePattern.LINEAR,
          unit: 'Nm',
          numberOfPasses: 1,
          fastenerType: 'M12x1.75',
          safetyLevel: 'NORMAL'
        };

        const createdSpec = { ...mockSpec, ...newSpecData, id: 'spec-456' };
        vi.mocked(mockTorqueService.createTorqueSpecification).mockResolvedValue(createdSpec);

        const response = await request(app)
          .post('/api/torque/specifications')
          .send(newSpecData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('spec-456');
        expect(response.body.data.torqueValue).toBe(200.0);
      });

      it('should validate request body', async () => {
        const invalidData = {
          torqueValue: -10, // Invalid negative value
          method: 'INVALID_METHOD'
        };

        await request(app)
          .post('/api/torque/specifications')
          .send(invalidData)
          .expect(400);
      });
    });

    describe('PUT /api/torque/specifications/:id', () => {
      it('should update torque specification', async () => {
        const updateData = {
          torqueValue: 175.0,
          toleranceLower: 170.0,
          toleranceUpper: 180.0
        };

        const updatedSpec = { ...mockSpec, ...updateData };
        vi.mocked(mockTorqueService.updateTorqueSpecification).mockResolvedValue(updatedSpec);

        const response = await request(app)
          .put('/api/torque/specifications/spec-123')
          .send(updateData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.torqueValue).toBe(175.0);
      });

      it('should return 404 for non-existent specification', async () => {
        vi.mocked(mockTorqueService.updateTorqueSpecification).mockRejectedValue(new Error('Specification not found'));

        const response = await request(app)
          .put('/api/torque/specifications/non-existent')
          .send({ torqueValue: 175.0 })
          .expect(500);

        expect(response.body.success).toBe(false);
      });
    });

    describe('DELETE /api/torque/specifications/:id', () => {
      it('should delete torque specification', async () => {
        vi.mocked(mockTorqueService.deleteTorqueSpecification).mockResolvedValue(true);

        const response = await request(app)
          .delete('/api/torque/specifications/spec-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Torque specification deleted successfully');
      });

      it('should return 404 for non-existent specification', async () => {
        vi.mocked(mockTorqueService.deleteTorqueSpecification).mockResolvedValue(false);

        const response = await request(app)
          .delete('/api/torque/specifications/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Torque specification not found');
      });
    });
  });

  describe('Torque Sequences', () => {
    const mockSequence: TorqueSequence = {
      id: 'seq-123',
      specificationId: 'spec-123',
      boltPosition: 1,
      sequenceNumber: 1,
      x: 100,
      y: 100,
      description: 'Bolt 1',
      createdAt: new Date()
    };

    describe('GET /api/torque/specifications/:id/sequences', () => {
      it('should get sequences for specification', async () => {
        vi.mocked(mockTorqueService.getTorqueSequences).mockResolvedValue([mockSequence]);

        const response = await request(app)
          .get('/api/torque/specifications/spec-123/sequences')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].boltPosition).toBe(1);
      });
    });

    describe('POST /api/torque/specifications/:id/sequences', () => {
      it('should create torque sequence', async () => {
        const sequenceData = {
          boltPosition: 2,
          sequenceNumber: 2,
          x: 200,
          y: 100,
          description: 'Bolt 2'
        };

        const createdSequence = { ...mockSequence, ...sequenceData, id: 'seq-456' };
        vi.mocked(mockTorqueService.createTorqueSequence).mockResolvedValue(createdSequence);

        const response = await request(app)
          .post('/api/torque/specifications/spec-123/sequences')
          .send(sequenceData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.boltPosition).toBe(2);
      });
    });
  });

  describe('Torque Events', () => {
    describe('GET /api/torque/events', () => {
      it('should get torque events with pagination', async () => {
        const response = await request(app)
          .get('/api/torque/events?page=1&limit=10&sessionId=session-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.pagination).toBeDefined();
      });

      it('should filter events by status', async () => {
        await request(app)
          .get('/api/torque/events?status=PASS')
          .expect(200);

        expect(mockTorqueService.getTorqueEvents).toHaveBeenCalledWith(
          expect.objectContaining({ status: 'PASS' })
        );
      });
    });

    describe('GET /api/torque/events/:id', () => {
      it('should get torque event by ID', async () => {
        vi.mocked(mockTorqueService.getTorqueEvent).mockResolvedValue(mockEvent);

        const response = await request(app)
          .get('/api/torque/events/event-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('event-123');
      });
    });
  });

  describe('Digital Wrench Management', () => {
    const mockWrenchConfig: DigitalWrenchConfig = {
      id: 'wrench-001',
      name: 'Production Wrench 1',
      brand: WrenchBrand.SNAP_ON,
      model: 'ATECH3F150',
      connectionType: WrenchConnectionType.BLUETOOTH,
      address: '00:11:22:33:44:55',
      calibrationDate: new Date(),
      calibrationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      settings: {
        units: 'Nm',
        precision: 0.1,
        autoMode: true,
        timeout: 30000
      }
    };

    describe('GET /api/torque/wrenches', () => {
      it('should get all digital wrenches', async () => {
        vi.mocked(mockWrenchService.getWrenches).mockReturnValue([mockWrenchConfig]);

        const response = await request(app)
          .get('/api/torque/wrenches')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Production Wrench 1');
      });
    });

    describe('POST /api/torque/wrenches', () => {
      it('should add new digital wrench', async () => {
        vi.mocked(mockWrenchService.addWrench).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/wrenches')
          .send(mockWrenchConfig)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Digital wrench added successfully');
      });
    });

    describe('POST /api/torque/wrenches/:id/connect', () => {
      it('should connect to digital wrench', async () => {
        vi.mocked(mockWrenchService.connect).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/wrenches/wrench-001/connect')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Successfully connected to wrench');
      });

      it('should handle connection failure', async () => {
        vi.mocked(mockWrenchService.connect).mockRejectedValue(new Error('Connection failed'));

        const response = await request(app)
          .post('/api/torque/wrenches/wrench-001/connect')
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Connection failed');
      });
    });

    describe('POST /api/torque/wrenches/:id/disconnect', () => {
      it('should disconnect from digital wrench', async () => {
        vi.mocked(mockWrenchService.disconnect).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/wrenches/wrench-001/disconnect')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Successfully disconnected from wrench');
      });
    });

    describe('GET /api/torque/wrenches/:id/status', () => {
      it('should get wrench status', async () => {
        const mockStatus = {
          wrenchId: 'wrench-001',
          isConnected: true,
          batteryLevel: 85,
          signalStrength: 90,
          lastReading: new Date(),
          calibrationStatus: 'CURRENT'
        };

        vi.mocked(mockWrenchService.getWrenchStatus).mockResolvedValue(mockStatus);

        const response = await request(app)
          .get('/api/torque/wrenches/wrench-001/status')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.isConnected).toBe(true);
        expect(response.body.data.batteryLevel).toBe(85);
      });
    });

    describe('GET /api/torque/wrenches/discover', () => {
      it('should discover available wrenches', async () => {
        const discoveredWrenches = [
          {
            id: 'discovered-001',
            name: 'Discovered Wrench',
            brand: WrenchBrand.NORBAR,
            connectionType: WrenchConnectionType.BLUETOOTH,
            address: '00:22:33:44:55:66'
          }
        ];

        vi.mocked(mockWrenchService.discoverWrenches).mockResolvedValue(discoveredWrenches);

        const response = await request(app)
          .get('/api/torque/wrenches/discover')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Discovered Wrench');
      });
    });
  });

  describe('Session Management', () => {
    describe('POST /api/torque/sessions', () => {
      it('should create new torque session', async () => {
        const sessionData = {
          sessionId: 'session-456',
          specificationId: 'spec-123',
          operatorId: 'operator-123',
          wrenchId: 'wrench-001'
        };

        const mockSession = {
          sessionId: 'session-456',
          specificationId: 'spec-123',
          operatorId: 'operator-123',
          wrenchId: 'wrench-001',
          status: 'ACTIVE',
          startTime: new Date(),
          currentSequenceIndex: 0,
          currentPassNumber: 1
        };

        vi.mocked(mockOrchestrationService.createSession).mockResolvedValue(mockSession);

        const response = await request(app)
          .post('/api/torque/sessions')
          .send(sessionData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBe('session-456');
      });
    });

    describe('GET /api/torque/sessions/:id', () => {
      it('should get session by ID', async () => {
        const mockSession = {
          sessionId: 'session-123',
          specificationId: 'spec-123',
          operatorId: 'operator-123',
          wrenchId: 'wrench-001',
          status: 'ACTIVE',
          startTime: new Date(),
          currentSequenceIndex: 0,
          currentPassNumber: 1
        };

        vi.mocked(mockOrchestrationService.getSession).mockReturnValue(mockSession);

        const response = await request(app)
          .get('/api/torque/sessions/session-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.sessionId).toBe('session-123');
      });

      it('should return 404 for non-existent session', async () => {
        vi.mocked(mockOrchestrationService.getSession).mockReturnValue(undefined);

        const response = await request(app)
          .get('/api/torque/sessions/non-existent')
          .expect(404);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Session not found');
      });
    });

    describe('POST /api/torque/sessions/:id/end', () => {
      it('should end torque session', async () => {
        vi.mocked(mockOrchestrationService.endSession).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/sessions/session-123/end')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Session ended successfully');
      });
    });

    describe('POST /api/torque/sessions/:id/pause', () => {
      it('should pause torque session', async () => {
        vi.mocked(mockOrchestrationService.pauseSession).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/sessions/session-123/pause')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Session paused successfully');
      });
    });

    describe('POST /api/torque/sessions/:id/resume', () => {
      it('should resume torque session', async () => {
        vi.mocked(mockOrchestrationService.resumeSession).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/sessions/session-123/resume')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Session resumed successfully');
      });
    });
  });

  describe('Real-time Operations', () => {
    describe('POST /api/torque/sessions/:id/readings', () => {
      it('should process torque reading', async () => {
        const readingData = {
          wrenchId: 'wrench-001',
          torque: 150.0,
          angle: 45.0,
          timestamp: new Date().toISOString(),
          units: 'Nm',
          temperature: 20.0,
          batteryLevel: 85
        };

        const mockResult = {
          event: mockEvent,
          validationResult: {
            sessionId: 'session-123',
            isValid: true,
            status: TorqueStatus.PASS,
            deviation: 0,
            percentDeviation: 0,
            message: 'Reading within specification'
          },
          nextSequence: null
        };

        vi.mocked(mockOrchestrationService.processTorqueReading).mockResolvedValue(mockResult);

        const response = await request(app)
          .post('/api/torque/sessions/session-123/readings')
          .send(readingData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.event.status).toBe(TorqueStatus.PASS);
        expect(response.body.data.validationResult.isValid).toBe(true);
      });

      it('should handle validation errors', async () => {
        const readingData = {
          wrenchId: 'wrench-001',
          torque: 165.0, // Over tolerance
          angle: 45.0,
          timestamp: new Date().toISOString(),
          units: 'Nm'
        };

        vi.mocked(mockOrchestrationService.processTorqueReading).mockRejectedValue(
          new Error('Reading validation failed')
        );

        const response = await request(app)
          .post('/api/torque/sessions/session-123/readings')
          .send(readingData)
          .expect(500);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Reading validation failed');
      });
    });

    describe('GET /api/torque/sessions/:id/current-sequence', () => {
      it('should get current sequence for session', async () => {
        const mockSequence: TorqueSequence = {
          id: 'seq-current',
          specificationId: 'spec-123',
          boltPosition: 2,
          sequenceNumber: 2,
          x: 200,
          y: 150,
          description: 'Current Bolt',
          createdAt: new Date()
        };

        vi.mocked(mockOrchestrationService.getCurrentSequence).mockReturnValue(mockSequence);

        const response = await request(app)
          .get('/api/torque/sessions/session-123/current-sequence')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.boltPosition).toBe(2);
      });
    });

    describe('GET /api/torque/sessions/:id/metrics', () => {
      it('should get session metrics', async () => {
        const mockMetrics = {
          sessionId: 'session-123',
          totalReadings: 10,
          passedReadings: 9,
          failedReadings: 1,
          passRate: 90,
          averageTorque: 149.5,
          currentSequenceIndex: 2,
          currentPassNumber: 1,
          duration: 1200
        };

        vi.mocked(mockOrchestrationService.getSessionMetrics).mockReturnValue(mockMetrics);

        const response = await request(app)
          .get('/api/torque/sessions/session-123/metrics')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.passRate).toBe(90);
        expect(response.body.data.totalReadings).toBe(10);
      });
    });
  });

  describe('Reporting', () => {
    describe('POST /api/torque/reports', () => {
      it('should generate torque report', async () => {
        const reportRequest = {
          sessionId: 'session-123',
          format: TorqueReportFormat.PDF,
          includeAnalytics: true,
          includeTraceability: true
        };

        const mockReport = {
          reportId: 'report-123',
          format: TorqueReportFormat.PDF,
          data: Buffer.from('mock-pdf-data'),
          size: 1024,
          generatedAt: new Date(),
          checksum: 'mock-checksum'
        };

        vi.mocked(mockReportingService.generateReport).mockResolvedValue(mockReport);

        const response = await request(app)
          .post('/api/torque/reports')
          .send(reportRequest)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportId).toBe('report-123');
        expect(response.body.data.format).toBe(TorqueReportFormat.PDF);
      });
    });

    describe('GET /api/torque/reports/:id', () => {
      it('should get report by ID', async () => {
        const mockReport = {
          reportId: 'report-123',
          format: TorqueReportFormat.PDF,
          data: Buffer.from('mock-pdf-data'),
          size: 1024,
          generatedAt: new Date(),
          checksum: 'mock-checksum'
        };

        vi.mocked(mockReportingService.getReport).mockReturnValue(mockReport);

        const response = await request(app)
          .get('/api/torque/reports/report-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.reportId).toBe('report-123');
      });
    });

    describe('GET /api/torque/reports/:id/download', () => {
      it('should download report file', async () => {
        const mockReport = {
          reportId: 'report-123',
          format: TorqueReportFormat.PDF,
          data: Buffer.from('mock-pdf-data'),
          size: 1024,
          generatedAt: new Date(),
          checksum: 'mock-checksum',
          mimeType: 'application/pdf'
        };

        vi.mocked(mockReportingService.getReport).mockReturnValue(mockReport);

        const response = await request(app)
          .get('/api/torque/reports/report-123/download')
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
        expect(response.headers['content-disposition']).toContain('attachment');
      });
    });
  });

  describe('Analytics', () => {
    describe('GET /api/torque/analytics/dashboard', () => {
      it('should get analytics dashboard data', async () => {
        const mockDashboard = {
          timeRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          overallMetrics: {
            totalSessions: 100,
            completedSessions: 95,
            averageSessionDuration: 1200,
            firstPassYield: 92.5,
            processCapability: { cpk: 1.2, cp: 1.5 }
          },
          trendAnalysis: {},
          operatorPerformance: {},
          specificationAnalysis: {},
          partAnalysis: {},
          wrenchPerformance: {},
          qualityMetrics: {
            defectRate: 2.5,
            reworkRate: 1.2,
            scrapRate: 0.3,
            customerComplaints: 0
          },
          complianceStatus: {
            as9100Compliant: true,
            calibrationCurrent: true,
            traceabilityComplete: true,
            auditReady: true
          },
          alerts: []
        };

        vi.mocked(mockTorqueService.getAnalyticsDashboard).mockResolvedValue(mockDashboard);

        const response = await request(app)
          .get('/api/torque/analytics/dashboard?startDate=2024-01-01&endDate=2024-01-31')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.overallMetrics.totalSessions).toBe(100);
      });
    });

    describe('GET /api/torque/analytics/specifications/:id', () => {
      it('should get specification analytics', async () => {
        const mockAnalytics = {
          specificationId: 'spec-123',
          totalEvents: 150,
          passCount: 142,
          failCount: 8,
          firstPassYield: 94.7,
          averageTorque: 149.8,
          processCapability: { cpk: 1.3, cp: 1.6 },
          trends: { direction: 'stable', strength: 0.2 }
        };

        vi.mocked(mockTorqueService.getTorqueAnalytics).mockResolvedValue(mockAnalytics);

        const response = await request(app)
          .get('/api/torque/analytics/specifications/spec-123')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.firstPassYield).toBe(94.7);
      });
    });
  });

  describe('Validation Rules', () => {
    describe('GET /api/torque/validation/rules', () => {
      it('should get all validation rules', async () => {
        const mockRules = [
          {
            id: 'rule-001',
            name: 'Standard Tolerance',
            ruleType: 'TOLERANCE',
            parameters: { tolerancePercent: 3.0 },
            isActive: true
          }
        ];

        vi.mocked(mockValidationService.getRules).mockReturnValue(mockRules);

        const response = await request(app)
          .get('/api/torque/validation/rules')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Standard Tolerance');
      });
    });

    describe('POST /api/torque/validation/rules', () => {
      it('should create validation rule', async () => {
        const ruleData = {
          id: 'rule-002',
          name: 'Strict Tolerance',
          ruleType: 'TOLERANCE',
          parameters: { tolerancePercent: 1.0 },
          isActive: true
        };

        vi.mocked(mockValidationService.addRule).mockResolvedValue(true);

        const response = await request(app)
          .post('/api/torque/validation/rules')
          .send(ruleData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Validation rule created successfully');
      });
    });
  });

  describe('System Status', () => {
    describe('GET /api/torque/system/status', () => {
      it('should get system status', async () => {
        vi.mocked(mockOrchestrationService.getStatistics).mockReturnValue({
          totalSessions: 5,
          activeSessions: 2,
          completedSessions: 3,
          pausedSessions: 0,
          timeoutSessions: 0,
          averageSessionDuration: 1200,
          isRunning: true
        });

        vi.mocked(mockRealtimeService.getStatistics).mockReturnValue({
          totalClients: 3,
          activeClients: 3,
          uniqueSessions: 2,
          uniqueUsers: 2,
          isRunning: true,
          uptime: 3600,
          messagesSent: 100,
          messagesPerSecond: 0.5
        });

        const response = await request(app)
          .get('/api/torque/system/status')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.orchestration.isRunning).toBe(true);
        expect(response.body.data.realtime.activeClients).toBe(3);
      });
    });
  });

  describe('Error Handling and Middleware', () => {
    it('should handle authorization errors', async () => {
      // Mock authorization failure
      vi.mocked(authorize).mockImplementationOnce(() => (req: any, res: any, next: any) => {
        res.status(403).json({ success: false, error: 'Insufficient permissions' });
      });

      const response = await request(app)
        .get('/api/torque/specifications')
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Insufficient permissions');
    });

    it('should handle validation errors', async () => {
      // Mock validation failure
      vi.mocked(validateRequest).mockImplementationOnce(() => (req: any, res: any, next: any) => {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: [{ field: 'torqueValue', message: 'Required field missing' }]
        });
      });

      const response = await request(app)
        .post('/api/torque/specifications')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should handle unexpected errors gracefully', async () => {
      vi.mocked(mockTorqueService.getTorqueSpecifications).mockRejectedValue(
        new Error('Unexpected database error')
      );

      const response = await request(app)
        .get('/api/torque/specifications')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unexpected database error');
    });

    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/torque/specifications')
        .type('application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});