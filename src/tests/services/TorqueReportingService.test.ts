import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TorqueReportingService } from '@/services/TorqueReportingService';
import {
  TorqueReportData,
  TorqueSpecification,
  TorqueEvent,
  TorqueSequence,
  TorqueStatus,
  TorqueMethod,
  TorquePattern,
  TorqueReportFormat,
  TorqueAnalyticsDashboard
} from '@/types/torque';

// Mock external dependencies
vi.mock('puppeteer', () => ({
  launch: vi.fn().mockResolvedValue({
    newPage: vi.fn().mockResolvedValue({
      setContent: vi.fn(),
      pdf: vi.fn().mockResolvedValue(Buffer.from('mock-pdf-content')),
      close: vi.fn()
    }),
    close: vi.fn()
  })
}));

vi.mock('@/utils/reportTemplates', () => ({
  generateTorqueReportHTML: vi.fn().mockReturnValue('<html>Mock HTML Report</html>'),
  generateCSVReport: vi.fn().mockReturnValue('col1,col2\nval1,val2'),
  generateJSONReport: vi.fn().mockReturnValue('{"test": "data"}'),
  generateAnalyticsDashboard: vi.fn().mockReturnValue('<html>Mock Dashboard</html>')
}));

describe('TorqueReportingService', () => {
  let reportingService: TorqueReportingService;

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
    approvedDate: new Date('2024-01-01'),
    safetyLevel: 'CRITICAL',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockSequences: TorqueSequence[] = [
    {
      id: 'seq-001',
      specificationId: 'spec-123',
      boltPosition: 1,
      sequenceNumber: 1,
      x: 100,
      y: 100,
      description: 'Bolt 1',
      createdAt: new Date('2024-01-01')
    },
    {
      id: 'seq-002',
      specificationId: 'spec-123',
      boltPosition: 2,
      sequenceNumber: 2,
      x: 200,
      y: 100,
      description: 'Bolt 2',
      createdAt: new Date('2024-01-01')
    }
  ];

  const mockEvents: TorqueEvent[] = [
    {
      id: 'event-001',
      sequenceId: 'seq-001',
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
      timestamp: new Date('2024-01-01T10:00:00Z'),
      createdAt: new Date('2024-01-01T10:00:00Z')
    },
    {
      id: 'event-002',
      sequenceId: 'seq-002',
      sessionId: 'session-123',
      passNumber: 1,
      actualTorque: 148.0,
      targetTorque: 150.0,
      angle: 45.0,
      status: TorqueStatus.PASS,
      isValid: true,
      deviation: -2.0,
      percentDeviation: -1.33,
      wrenchId: 'wrench-001',
      operatorId: 'operator-123',
      timestamp: new Date('2024-01-01T10:05:00Z'),
      createdAt: new Date('2024-01-01T10:05:00Z')
    },
    {
      id: 'event-003',
      sequenceId: 'seq-001',
      sessionId: 'session-123',
      passNumber: 2,
      actualTorque: 152.0,
      targetTorque: 150.0,
      angle: 45.0,
      status: TorqueStatus.PASS,
      isValid: true,
      deviation: 2.0,
      percentDeviation: 1.33,
      wrenchId: 'wrench-001',
      operatorId: 'operator-123',
      timestamp: new Date('2024-01-01T10:10:00Z'),
      createdAt: new Date('2024-01-01T10:10:00Z')
    }
  ];

  beforeEach(() => {
    reportingService = new TorqueReportingService();
    vi.clearAllMocks();
  });

  describe('Report Generation', () => {
    it('should generate comprehensive torque report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-123',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600, // 10 minutes
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date('2024-01-01T10:15:00Z'),
        generatedBy: 'system',
        complianceInfo: {
          as9100Compliant: true,
          traceabilityComplete: true,
          certificateRequired: true
        }
      };

      const report = await reportingService.generateReport(reportData, TorqueReportFormat.PDF);

      expect(report).toBeDefined();
      expect(report.reportId).toBe('report-123');
      expect(report.format).toBe(TorqueReportFormat.PDF);
      expect(report.data).toBeInstanceOf(Buffer);
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.size).toBeGreaterThan(0);
      expect(report.checksum).toBeTruthy();
    });

    it('should generate PDF report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-pdf',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generatePDFReport(reportData);

      expect(report.format).toBe(TorqueReportFormat.PDF);
      expect(report.data).toBeInstanceOf(Buffer);
      expect(report.mimeType).toBe('application/pdf');
    });

    it('should generate CSV report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-csv',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateCSVReport(reportData);

      expect(report.format).toBe(TorqueReportFormat.CSV);
      expect(report.data).toBeInstanceOf(Buffer);
      expect(report.mimeType).toBe('text/csv');
    });

    it('should generate JSON report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-json',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateJSONReport(reportData);

      expect(report.format).toBe(TorqueReportFormat.JSON);
      expect(report.data).toBeInstanceOf(Buffer);
      expect(report.mimeType).toBe('application/json');
    });

    it('should reject unsupported report format', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-invalid',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      await expect(
        reportingService.generateReport(reportData, 'INVALID' as TorqueReportFormat)
      ).rejects.toThrow('Unsupported report format: INVALID');
    });
  });

  describe('Analytics Dashboard', () => {
    it('should generate analytics dashboard', async () => {
      const dashboardData: TorqueAnalyticsDashboard = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        overallMetrics: {
          totalSessions: 25,
          completedSessions: 23,
          averageSessionDuration: 1200,
          firstPassYield: 92.5,
          processCapability: { cpk: 1.2, cp: 1.5 }
        },
        trendAnalysis: {
          torqueAccuracy: { trend: 'improving', data: [] },
          firstPassYield: { trend: 'stable', data: [] },
          sessionDuration: { trend: 'decreasing', data: [] }
        },
        operatorPerformance: {
          'operator-123': {
            operatorId: 'operator-123',
            operatorName: 'John Doe',
            sessionsCompleted: 10,
            averageAccuracy: 98.5,
            firstPassYield: 95.0,
            averageSessionTime: 1100
          }
        },
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

      const dashboard = await reportingService.generateAnalyticsDashboard(dashboardData);

      expect(dashboard).toBeDefined();
      expect(dashboard.format).toBe(TorqueReportFormat.PDF);
      expect(dashboard.data).toBeInstanceOf(Buffer);
      expect(dashboard.mimeType).toBe('application/pdf');
      expect(dashboard.reportId).toBeTruthy();
    });

    it('should include trend analysis in dashboard', async () => {
      const dashboardData: TorqueAnalyticsDashboard = {
        timeRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        overallMetrics: {
          totalSessions: 100,
          completedSessions: 95,
          averageSessionDuration: 900,
          firstPassYield: 88.0,
          processCapability: { cpk: 1.1, cp: 1.4 }
        },
        trendAnalysis: {
          torqueAccuracy: {
            trend: 'declining',
            data: [
              { date: '2024-01-01', value: 95.0 },
              { date: '2024-01-15', value: 90.0 },
              { date: '2024-01-31', value: 85.0 }
            ]
          },
          firstPassYield: {
            trend: 'stable',
            data: [
              { date: '2024-01-01', value: 88.0 },
              { date: '2024-01-15', value: 87.5 },
              { date: '2024-01-31', value: 88.5 }
            ]
          },
          sessionDuration: {
            trend: 'increasing',
            data: [
              { date: '2024-01-01', value: 800 },
              { date: '2024-01-15', value: 850 },
              { date: '2024-01-31', value: 900 }
            ]
          }
        },
        operatorPerformance: {},
        specificationAnalysis: {},
        partAnalysis: {},
        wrenchPerformance: {},
        qualityMetrics: {
          defectRate: 5.0,
          reworkRate: 3.2,
          scrapRate: 1.8,
          customerComplaints: 2
        },
        complianceStatus: {
          as9100Compliant: false,
          calibrationCurrent: true,
          traceabilityComplete: false,
          auditReady: false
        },
        alerts: [
          {
            id: 'alert-001',
            type: 'QUALITY_DEGRADATION',
            severity: 'HIGH',
            message: 'First pass yield below target',
            timestamp: new Date(),
            acknowledged: false
          }
        ]
      };

      const dashboard = await reportingService.generateAnalyticsDashboard(dashboardData);

      expect(dashboard).toBeDefined();
      expect(dashboard.reportId).toBeTruthy();
    });
  });

  describe('Report Storage and Retrieval', () => {
    it('should store generated report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-store',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateReport(reportData, TorqueReportFormat.PDF);
      const stored = await reportingService.storeReport(report);

      expect(stored).toBe(true);
      expect(reportingService.getStoredReports()).toHaveLength(1);
    });

    it('should retrieve stored report by ID', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-retrieve',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateReport(reportData, TorqueReportFormat.PDF);
      await reportingService.storeReport(report);

      const retrieved = reportingService.getReport('report-retrieve');

      expect(retrieved).toBeDefined();
      expect(retrieved?.reportId).toBe('report-retrieve');
      expect(retrieved?.format).toBe(TorqueReportFormat.PDF);
    });

    it('should return undefined for non-existent report', () => {
      const retrieved = reportingService.getReport('non-existent');

      expect(retrieved).toBeUndefined();
    });

    it('should get reports by session ID', async () => {
      const reportData1: TorqueReportData = {
        reportId: 'report-session-1',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const reportData2: TorqueReportData = {
        ...reportData1,
        reportId: 'report-session-2',
        sessionId: 'session-456'
      };

      const report1 = await reportingService.generateReport(reportData1, TorqueReportFormat.PDF);
      const report2 = await reportingService.generateReport(reportData2, TorqueReportFormat.CSV);

      await reportingService.storeReport(report1);
      await reportingService.storeReport(report2);

      const sessionReports = reportingService.getReportsBySession('session-123');

      expect(sessionReports).toHaveLength(1);
      expect(sessionReports[0].reportId).toBe('report-session-1');
    });

    it('should delete stored report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-delete',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateReport(reportData, TorqueReportFormat.PDF);
      await reportingService.storeReport(report);

      const deleted = await reportingService.deleteReport('report-delete');

      expect(deleted).toBe(true);
      expect(reportingService.getReport('report-delete')).toBeUndefined();
    });

    it('should return false when deleting non-existent report', async () => {
      const deleted = await reportingService.deleteReport('non-existent');

      expect(deleted).toBe(false);
    });
  });

  describe('AS9100 Compliance', () => {
    it('should generate AS9100 compliant report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-as9100',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system',
        complianceInfo: {
          as9100Compliant: true,
          traceabilityComplete: true,
          certificateRequired: true,
          certificateNumber: 'CERT-2024-001',
          approvalRequired: true,
          approvedBy: 'quality-manager-456',
          approvedDate: new Date(),
          revisionNumber: 'REV-A',
          controlledDocument: true
        }
      };

      const report = await reportingService.generateAS9100Report(reportData);

      expect(report).toBeDefined();
      expect(report.reportId).toBe('report-as9100');
      expect(report.format).toBe(TorqueReportFormat.PDF);
      expect(report.metadata?.compliance?.as9100).toBe(true);
      expect(report.metadata?.certificateRequired).toBe(true);
    });

    it('should include traceability information in AS9100 report', async () => {
      const reportData: TorqueReportData = {
        reportId: 'report-traceability',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system',
        traceabilityInfo: {
          serialNumbers: ['SN-001', 'SN-002'],
          lotNumbers: ['LOT-2024-001'],
          materialCertificates: ['CERT-MAT-001'],
          toolCalibrations: ['CAL-WRENCH-001'],
          operatorCertifications: ['CERT-OP-123']
        }
      };

      const report = await reportingService.generateAS9100Report(reportData);

      expect(report.metadata?.traceability).toBeDefined();
      expect(report.metadata?.traceability?.serialNumbers).toContain('SN-001');
      expect(report.metadata?.traceability?.lotNumbers).toContain('LOT-2024-001');
    });

    it('should require approval for critical safety level', async () => {
      const criticalSpec = {
        ...mockSpec,
        safetyLevel: 'CRITICAL' as const
      };

      const reportData: TorqueReportData = {
        reportId: 'report-critical',
        sessionId: 'session-123',
        specification: criticalSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateAS9100Report(reportData);

      expect(report.metadata?.approvalRequired).toBe(true);
      expect(report.metadata?.safetyLevel).toBe('CRITICAL');
    });
  });

  describe('Report Statistics', () => {
    beforeEach(async () => {
      // Generate and store multiple reports for testing
      const reportData1: TorqueReportData = {
        reportId: 'report-stats-1',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const reportData2: TorqueReportData = {
        ...reportData1,
        reportId: 'report-stats-2',
        sessionId: 'session-456'
      };

      const report1 = await reportingService.generateReport(reportData1, TorqueReportFormat.PDF);
      const report2 = await reportingService.generateReport(reportData2, TorqueReportFormat.CSV);

      await reportingService.storeReport(report1);
      await reportingService.storeReport(report2);
    });

    it('should get reporting statistics', () => {
      const stats = reportingService.getReportingStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalReports).toBe(2);
      expect(stats.reportsByFormat.PDF).toBe(1);
      expect(stats.reportsByFormat.CSV).toBe(1);
      expect(stats.totalStorageSize).toBeGreaterThan(0);
      expect(stats.averageReportSize).toBeGreaterThan(0);
      expect(stats.reportsByPeriod).toBeDefined();
    });

    it('should track report generation performance', () => {
      const stats = reportingService.getReportingStatistics();

      expect(stats.performanceMetrics).toBeDefined();
      expect(stats.performanceMetrics.averageGenerationTime).toBeGreaterThanOrEqual(0);
      expect(stats.performanceMetrics.totalGenerationTime).toBeGreaterThanOrEqual(0);
    });

    it('should get storage usage statistics', () => {
      const usage = reportingService.getStorageUsage();

      expect(usage).toBeDefined();
      expect(usage.totalReports).toBe(2);
      expect(usage.totalSize).toBeGreaterThan(0);
      expect(usage.averageSize).toBeGreaterThan(0);
      expect(usage.formatBreakdown).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle PDF generation errors gracefully', async () => {
      const { launch } = await import('puppeteer');
      vi.mocked(launch).mockRejectedValueOnce(new Error('Puppeteer failed'));

      const reportData: TorqueReportData = {
        reportId: 'report-error',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      await expect(
        reportingService.generatePDFReport(reportData)
      ).rejects.toThrow('Puppeteer failed');
    });

    it('should handle invalid report data gracefully', async () => {
      const invalidReportData = {
        reportId: 'invalid-report',
        sessionId: null, // Invalid session ID
        specification: null, // Invalid specification
        sequences: [],
        events: [],
        analytics: null, // Invalid analytics
        summary: null, // Invalid summary
        generatedAt: new Date(),
        generatedBy: 'system'
      } as any;

      await expect(
        reportingService.generateReport(invalidReportData, TorqueReportFormat.PDF)
      ).rejects.toThrow();
    });

    it('should handle template generation errors', async () => {
      const { generateTorqueReportHTML } = await import('@/utils/reportTemplates');
      vi.mocked(generateTorqueReportHTML).mockImplementation(() => {
        throw new Error('Template generation failed');
      });

      const reportData: TorqueReportData = {
        reportId: 'report-template-error',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      await expect(
        reportingService.generatePDFReport(reportData)
      ).rejects.toThrow('Template generation failed');
    });
  });

  describe('Report Validation', () => {
    it('should validate report data before generation', async () => {
      const incompleteReportData = {
        reportId: 'incomplete-report',
        sessionId: 'session-123',
        // Missing required fields
        generatedAt: new Date(),
        generatedBy: 'system'
      } as any;

      await expect(
        reportingService.generateReport(incompleteReportData, TorqueReportFormat.PDF)
      ).rejects.toThrow('Invalid report data');
    });

    it('should validate torque events data', async () => {
      const reportDataWithInvalidEvents: TorqueReportData = {
        reportId: 'invalid-events',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: [
          {
            ...mockEvents[0],
            actualTorque: -100, // Invalid negative torque
            status: 'INVALID_STATUS' as any
          }
        ],
        analytics: {
          totalEvents: 1,
          passCount: 0,
          failCount: 1,
          firstPassYield: 0,
          averageTorque: -100,
          averageDeviation: 0,
          standardDeviation: 0,
          processCapability: { cpk: 0, cp: 0 },
          trends: { direction: 'stable', strength: 0 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'FAIL',
          completedBolts: 0,
          totalPasses: 1,
          duration: 300,
          operatorCount: 1,
          outOfSpecEvents: 1
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      await expect(
        reportingService.generateReport(reportDataWithInvalidEvents, TorqueReportFormat.PDF)
      ).rejects.toThrow('Invalid torque event data');
    });

    it('should validate report ID uniqueness', async () => {
      const reportData: TorqueReportData = {
        reportId: 'duplicate-report',
        sessionId: 'session-123',
        specification: mockSpec,
        sequences: mockSequences,
        events: mockEvents,
        analytics: {
          totalEvents: 3,
          passCount: 3,
          failCount: 0,
          firstPassYield: 100,
          averageTorque: 150.0,
          averageDeviation: 0,
          standardDeviation: 2.0,
          processCapability: { cpk: 1.5, cp: 1.8 },
          trends: { direction: 'stable', strength: 0.1 },
          operatorPerformance: {}
        },
        summary: {
          overallStatus: 'PASS',
          completedBolts: 2,
          totalPasses: 2,
          duration: 600,
          operatorCount: 1,
          outOfSpecEvents: 0
        },
        generatedAt: new Date(),
        generatedBy: 'system'
      };

      const report = await reportingService.generateReport(reportData, TorqueReportFormat.PDF);
      await reportingService.storeReport(report);

      await expect(
        reportingService.storeReport(report)
      ).rejects.toThrow('Report with ID duplicate-report already exists');
    });
  });
});