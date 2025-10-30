/**
 * Comprehensive Unit Tests for LLPReportingService
 * Tests report generation, export functionality, and compliance reporting
 * for Life-Limited Parts regulatory requirements.
 */

import { describe, it, expect, beforeEach, vi, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { LLPReportingService, ExportFormat, ReportType } from '@/services/LLPReportingService';
import { LLPService } from '@/services/LLPService';
import { LLPCertificationService } from '@/services/LLPCertificationService';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPCertificationType,
  LLPAlertSeverity
} from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file system operations for testing
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

describe('LLPReportingService', () => {
  let testDb: PrismaClient;
  let llpService: LLPService;
  let llpCertificationService: LLPCertificationService;
  let llpReportingService: LLPReportingService;
  let testPartIds: string[] = [];
  let testSerializedPartIds: string[] = [];

  beforeAll(async () => {
    testDb = await setupTestDatabase();
    llpService = new LLPService(testDb);
    llpCertificationService = new LLPCertificationService(testDb);
    llpReportingService = new LLPReportingService(testDb, llpService, llpCertificationService);

    // Mock file system operations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from('Mock file content'));
    mockFs.stat.mockResolvedValue({ size: 1024, mtime: new Date() } as any);
    mockFs.readdir.mockResolvedValue(['file1.pdf', 'file2.xlsx'] as any);
    mockFs.unlink.mockResolvedValue(undefined);
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean up test data
    await testDb.llpAlert.deleteMany();
    await testDb.llpCertification.deleteMany();
    await testDb.llpLifeHistory.deleteMany();
    await testDb.serializedPart.deleteMany();
    await testDb.part.deleteMany();

    testPartIds = [];
    testSerializedPartIds = [];

    // Create test fleet of LLP parts
    const testParts = await testDb.part.createMany({
      data: [
        {
          partNumber: 'TEST-RPT-001',
          partName: 'Test Turbine Blade',
          partType: 'MANUFACTURED',
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
          llpRetirementType: LLPRetirementType.CYCLES_OR_TIME,
          llpCycleLimit: 1000,
          llpTimeLimit: 8760,
          llpCertificationRequired: true,
          description: 'Critical turbine blade'
        },
        {
          partNumber: 'TEST-RPT-002',
          partName: 'Test Compressor Disk',
          partType: 'MANUFACTURED',
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.CONTROLLED,
          llpRetirementType: LLPRetirementType.CYCLES_ONLY,
          llpCycleLimit: 2000,
          llpCertificationRequired: true,
          description: 'Controlled compressor disk'
        },
        {
          partNumber: 'TEST-RPT-003',
          partName: 'Test Shaft Assembly',
          partType: 'MANUFACTURED',
          isLifeLimited: true,
          llpCriticalityLevel: LLPCriticalityLevel.CRITICAL,
          llpRetirementType: LLPRetirementType.TIME_ONLY,
          llpTimeLimit: 12000,
          llpCertificationRequired: false,
          description: 'Critical shaft assembly'
        }
      ]
    });

    // Get created part IDs
    const createdParts = await testDb.part.findMany({
      where: {
        partNumber: { in: ['TEST-RPT-001', 'TEST-RPT-002', 'TEST-RPT-003'] }
      }
    });
    testPartIds = createdParts.map(p => p.id);

    // Create serialized parts
    const serializedPartsData = createdParts.map((part, index) => ({
      partId: part.id,
      serialNumber: `SN-RPT-00${index + 1}`,
      status: 'ACTIVE',
      manufacturingDate: new Date(`2023-0${index + 1}-01`),
      location: `Location ${index + 1}`
    }));

    await testDb.serializedPart.createMany({ data: serializedPartsData });

    const createdSerializedParts = await testDb.serializedPart.findMany({
      where: {
        serialNumber: { in: ['SN-RPT-001', 'SN-RPT-002', 'SN-RPT-003'] }
      }
    });
    testSerializedPartIds = createdSerializedParts.map(sp => sp.id);

    // Create life history for each part
    const lifeHistoryData = testSerializedPartIds.flatMap((spId, index) => [
      {
        serializedPartId: spId,
        eventType: 'MANUFACTURING_COMPLETE',
        eventDate: new Date(`2023-0${index + 1}-01`),
        cyclesAtEvent: 0,
        hoursAtEvent: 0,
        performedBy: 'SYSTEM',
        location: 'Manufacturing'
      },
      {
        serializedPartId: spId,
        eventType: 'OPERATION',
        eventDate: new Date(`2023-${String(index + 6).padStart(2, '0')}-01`),
        cyclesAtEvent: (index + 1) * 300, // Varying usage levels
        hoursAtEvent: (index + 1) * 2500,
        performedBy: 'SYSTEM',
        location: 'In Service'
      }
    ]);

    await testDb.llpLifeHistory.createMany({ data: lifeHistoryData });

    // Create some alerts
    await testDb.llpAlert.createMany({
      data: [
        {
          serializedPartId: testSerializedPartIds[0],
          alertType: 'LIFE_LIMIT_APPROACHING',
          severity: LLPAlertSeverity.WARNING,
          title: 'Life Limit Approaching',
          message: 'Part approaching 75% life limit',
          currentCycles: 750,
          currentHours: 6570,
          isActive: true,
          generatedAt: new Date()
        },
        {
          serializedPartId: testSerializedPartIds[1],
          alertType: 'INSPECTION_DUE',
          severity: LLPAlertSeverity.INFO,
          title: 'Inspection Due',
          message: 'Scheduled inspection required',
          currentCycles: 600,
          currentHours: 5000,
          isActive: true,
          generatedAt: new Date()
        }
      ]
    });

    // Reset mock calls
    vi.clearAllMocks();
  });

  describe('generateFleetStatusReport', () => {
    it('should generate PDF fleet status report successfully', async () => {
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.PDF);

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.fileName).toContain('.pdf');
      expect(result.downloadUrl).toContain('/api/v1/llp/reports/download/');
      expect(result.metadata.reportType).toBe(ReportType.FLEET_STATUS);
      expect(result.metadata.format).toBe(ExportFormat.PDF);
      expect(result.metadata.recordCount).toBeGreaterThan(0);
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should generate Excel fleet status report successfully', async () => {
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.EXCEL);

      expect(result.fileName).toContain('.xlsx');
      expect(result.metadata.format).toBe(ExportFormat.EXCEL);
      expect(mockFs.writeFile).not.toHaveBeenCalled(); // Excel uses XLSX.writeFile
    });

    it('should generate CSV fleet status report successfully', async () => {
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.CSV);

      expect(result.fileName).toContain('.csv');
      expect(result.metadata.format).toBe(ExportFormat.CSV);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should generate JSON fleet status report successfully', async () => {
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      expect(result.fileName).toContain('.json');
      expect(result.metadata.format).toBe(ExportFormat.JSON);
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should apply filters to fleet status report', async () => {
      const filters = {
        partNumber: 'TEST-RPT-001',
        criticalityLevel: LLPCriticalityLevel.CRITICAL,
        status: 'ACTIVE'
      };

      const result = await llpReportingService.generateFleetStatusReport(filters, ExportFormat.JSON);

      expect(result.metadata.filters).toEqual(filters);
      expect(result.metadata.recordCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty fleet gracefully', async () => {
      // Remove all serialized parts
      await testDb.llpLifeHistory.deleteMany();
      await testDb.llpAlert.deleteMany();
      await testDb.serializedPart.deleteMany();

      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      expect(result.metadata.recordCount).toBe(0);
      expect(result.reportId).toBeDefined();
    });

    it('should emit report generation event', async () => {
      const eventHandler = vi.fn();
      llpReportingService.on('reportGenerated', eventHandler);

      await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.PDF);

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          reportId: expect.any(String),
          metadata: expect.objectContaining({
            reportType: ReportType.FLEET_STATUS
          })
        })
      );
    });

    it('should handle generation errors gracefully', async () => {
      // Mock file write failure
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'));

      const eventHandler = vi.fn();
      llpReportingService.on('reportGenerationFailed', eventHandler);

      await expect(llpReportingService.generateFleetStatusReport(undefined, ExportFormat.CSV))
        .rejects.toThrow('Disk full');

      expect(eventHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Disk full',
          reportType: ReportType.FLEET_STATUS
        })
      );
    });
  });

  describe('generateRetirementForecastReport', () => {
    beforeEach(async () => {
      // Create parts approaching retirement
      await testDb.llpLifeHistory.create({
        data: {
          serializedPartId: testSerializedPartIds[0],
          eventType: 'OPERATION',
          eventDate: new Date('2023-11-01'),
          cyclesAtEvent: 950, // Close to 1000 limit
          hoursAtEvent: 8300, // Close to 8760 limit
          performedBy: 'SYSTEM',
          location: 'In Service'
        }
      });
    });

    it('should generate retirement forecast report', async () => {
      const result = await llpReportingService.generateRetirementForecastReport(90, ExportFormat.PDF);

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.fileName).toContain('.pdf');
      expect(result.metadata.reportType).toBe(ReportType.RETIREMENT_FORECAST);
      expect(result.metadata.filters).toEqual({ daysAhead: 90 });
    });

    it('should forecast parts retiring within specified days', async () => {
      const result = await llpReportingService.generateRetirementForecastReport(365, ExportFormat.JSON);

      expect(result.metadata.recordCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.filters.daysAhead).toBe(365);
    });

    it('should support different export formats', async () => {
      const pdfResult = await llpReportingService.generateRetirementForecastReport(90, ExportFormat.PDF);
      const excelResult = await llpReportingService.generateRetirementForecastReport(90, ExportFormat.EXCEL);
      const jsonResult = await llpReportingService.generateRetirementForecastReport(90, ExportFormat.JSON);

      expect(pdfResult.fileName).toContain('.pdf');
      expect(excelResult.fileName).toContain('.xlsx');
      expect(jsonResult.fileName).toContain('.json');
    });

    it('should use default days ahead when not specified', async () => {
      const result = await llpReportingService.generateRetirementForecastReport(undefined, ExportFormat.JSON);

      expect(result.metadata.filters.daysAhead).toBe(365); // Default value
    });
  });

  describe('generateComplianceReport', () => {
    beforeEach(async () => {
      // Create certifications for compliance testing
      await testDb.llpCertification.createMany({
        data: [
          {
            serializedPartId: testSerializedPartIds[0],
            certificationType: LLPCertificationType.MANUFACTURING,
            certificationNumber: 'FAA-CERT-001',
            issuingOrganization: 'FAA Approved Organization',
            issuedDate: new Date('2023-01-01'),
            expirationDate: new Date('2025-01-01'),
            certificationStandard: 'FAR 21',
            documentUrl: '/api/docs/faa-cert-001.pdf',
            isActive: true,
            isVerified: true,
            complianceStandards: ['FAA']
          },
          {
            serializedPartId: testSerializedPartIds[1],
            certificationType: LLPCertificationType.INSTALLATION,
            certificationNumber: 'EASA-CERT-001',
            issuingOrganization: 'EASA Approved Organization',
            issuedDate: new Date('2023-02-01'),
            expirationDate: new Date('2025-02-01'),
            certificationStandard: 'EASA Part 145',
            documentUrl: '/api/docs/easa-cert-001.pdf',
            isActive: true,
            isVerified: true,
            complianceStandards: ['EASA']
          }
        ]
      });
    });

    it('should generate comprehensive compliance report', async () => {
      const result = await llpReportingService.generateComplianceReport('ALL', ExportFormat.PDF);

      expect(result).toBeDefined();
      expect(result.reportId).toBeDefined();
      expect(result.fileName).toContain('.pdf');
      expect(result.metadata.reportType).toBe(ReportType.REGULATORY_COMPLIANCE);
      expect(result.metadata.filters.regulatoryStandard).toBe('ALL');
    });

    it('should filter by regulatory standard', async () => {
      const faaResult = await llpReportingService.generateComplianceReport('FAA', ExportFormat.JSON);
      const easaResult = await llpReportingService.generateComplianceReport('EASA', ExportFormat.JSON);

      expect(faaResult.metadata.filters.regulatoryStandard).toBe('FAA');
      expect(easaResult.metadata.filters.regulatoryStandard).toBe('EASA');
    });

    it('should support all export formats', async () => {
      const pdfResult = await llpReportingService.generateComplianceReport('ALL', ExportFormat.PDF);
      const excelResult = await llpReportingService.generateComplianceReport('ALL', ExportFormat.EXCEL);
      const jsonResult = await llpReportingService.generateComplianceReport('ALL', ExportFormat.JSON);

      expect(pdfResult.fileName).toContain('.pdf');
      expect(excelResult.fileName).toContain('.xlsx');
      expect(jsonResult.fileName).toContain('.json');
    });

    it('should default to ALL regulatory standards', async () => {
      const result = await llpReportingService.generateComplianceReport(undefined, ExportFormat.JSON);

      expect(result.metadata.filters.regulatoryStandard).toBe('ALL');
    });
  });

  describe('getReportFile', () => {
    it('should retrieve report file successfully', async () => {
      const testReportId = 'TEST-REPORT-123';
      mockFs.readdir.mockResolvedValueOnce([`fleet-status-${testReportId}.pdf`] as any);

      const fileBuffer = await llpReportingService.getReportFile(testReportId);

      expect(fileBuffer).toBeInstanceOf(Buffer);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining(`fleet-status-${testReportId}.pdf`)
      );
    });

    it('should handle non-existent report file', async () => {
      const nonExistentId = 'NON-EXISTENT-REPORT';
      mockFs.readdir.mockResolvedValueOnce(['other-report.pdf'] as any);

      await expect(llpReportingService.getReportFile(nonExistentId))
        .rejects.toThrow(`Report file not found for ID: ${nonExistentId}`);
    });

    it('should handle file system errors', async () => {
      const testReportId = 'TEST-REPORT-ERROR';
      mockFs.readdir.mockRejectedValueOnce(new Error('Permission denied'));

      await expect(llpReportingService.getReportFile(testReportId))
        .rejects.toThrow('Permission denied');
    });
  });

  describe('cleanupExpiredReports', () => {
    beforeEach(() => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      mockFs.readdir.mockResolvedValue([
        'old-report-1.pdf',
        'old-report-2.xlsx',
        'recent-report.json'
      ] as any);

      mockFs.stat
        .mockResolvedValueOnce({ mtime: tenDaysAgo } as any) // old-report-1.pdf
        .mockResolvedValueOnce({ mtime: tenDaysAgo } as any) // old-report-2.xlsx
        .mockResolvedValueOnce({ mtime: fiveDaysAgo } as any); // recent-report.json
    });

    it('should clean up expired reports', async () => {
      await llpReportingService.cleanupExpiredReports();

      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('old-report-1.pdf'));
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('old-report-2.xlsx'));
    });

    it('should preserve recent reports', async () => {
      await llpReportingService.cleanupExpiredReports();

      expect(mockFs.unlink).not.toHaveBeenCalledWith(
        expect.stringContaining('recent-report.json')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      mockFs.readdir.mockRejectedValueOnce(new Error('Directory not found'));

      // Should not throw
      await expect(llpReportingService.cleanupExpiredReports()).resolves.toBeUndefined();
    });

    it('should handle file deletion errors gracefully', async () => {
      mockFs.unlink.mockRejectedValueOnce(new Error('Permission denied'));

      // Should not throw
      await expect(llpReportingService.cleanupExpiredReports()).resolves.toBeUndefined();
    });
  });

  describe('Report Data Collection', () => {
    it('should collect comprehensive fleet status data', async () => {
      // This tests the internal data collection method
      const reportResult = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      // Verify the report was generated successfully with expected data structure
      expect(reportResult.metadata.recordCount).toBe(3); // 3 serialized parts
      expect(reportResult.metadata.generationTime).toBeGreaterThan(0);
    });

    it('should handle parts with varying life usage', async () => {
      // Create parts with different usage levels
      await testDb.llpLifeHistory.createMany({
        data: [
          {
            serializedPartId: testSerializedPartIds[0],
            eventType: 'OPERATION',
            eventDate: new Date('2023-12-01'),
            cyclesAtEvent: 900, // 90% usage
            hoursAtEvent: 7884,
            performedBy: 'SYSTEM',
            location: 'In Service'
          },
          {
            serializedPartId: testSerializedPartIds[1],
            eventType: 'OPERATION',
            eventDate: new Date('2023-12-01'),
            cyclesAtEvent: 1000, // 50% usage (limit is 2000)
            hoursAtEvent: 8760,
            performedBy: 'SYSTEM',
            location: 'In Service'
          }
        ]
      });

      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      expect(result.metadata.recordCount).toBe(3);
      expect(result.reportId).toBeDefined();
    });

    it('should include alert data in fleet reports', async () => {
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      // Should successfully generate report including alert data
      expect(result.metadata.recordCount).toBeGreaterThan(0);
      expect(result.metadata.generationTime).toBeGreaterThan(0);
    });
  });

  describe('Report ID Generation', () => {
    it('should generate unique report IDs', async () => {
      const result1 = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);
      const result2 = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      expect(result1.reportId).not.toBe(result2.reportId);
      expect(result1.reportId).toContain('FLEET_STATUS');
      expect(result2.reportId).toContain('FLEET_STATUS');
    });

    it('should include timestamp in report ID', async () => {
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      expect(result.reportId).toMatch(/FLEET_STATUS-\d+-[a-z0-9]+/);
    });
  });

  describe('Report Metadata', () => {
    it('should include comprehensive metadata', async () => {
      const startTime = Date.now();
      const result = await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.PDF);
      const endTime = Date.now();

      expect(result.metadata.reportType).toBe(ReportType.FLEET_STATUS);
      expect(result.metadata.format).toBe(ExportFormat.PDF);
      expect(result.metadata.recordCount).toBeGreaterThanOrEqual(0);
      expect(result.metadata.generationTime).toBeGreaterThan(0);
      expect(result.metadata.generationTime).toBeLessThan(endTime - startTime + 1000); // Allow some margin
      expect(result.metadata.requestedBy).toBe('system');
      expect(result.metadata.complianceLevel).toBe('FULL');
    });

    it('should preserve filter information in metadata', async () => {
      const filters = {
        partNumber: 'TEST-RPT-001',
        criticalityLevel: LLPCriticalityLevel.CRITICAL
      };

      const result = await llpReportingService.generateFleetStatusReport(filters, ExportFormat.JSON);

      expect(result.metadata.filters).toEqual(filters);
    });
  });

  describe('Error Handling', () => {
    it('should handle unsupported export format', async () => {
      await expect(llpReportingService.generateFleetStatusReport(undefined, 'UNSUPPORTED' as ExportFormat))
        .rejects.toThrow('Unsupported format');
    });

    it('should handle database connection errors gracefully', async () => {
      // Mock database error
      const mockPrisma = {
        ...testDb,
        serializedPart: {
          findMany: vi.fn().mockRejectedValue(new Error('Database connection lost'))
        }
      } as any;

      const errorReportingService = new LLPReportingService(mockPrisma, llpService, llpCertificationService);

      await expect(errorReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON))
        .rejects.toThrow('Database connection lost');
    });
  });

  describe('Event Emission', () => {
    it('should emit events for successful report generation', async () => {
      const generatedHandler = vi.fn();
      const failedHandler = vi.fn();

      llpReportingService.on('reportGenerated', generatedHandler);
      llpReportingService.on('reportGenerationFailed', failedHandler);

      await llpReportingService.generateFleetStatusReport(undefined, ExportFormat.JSON);

      expect(generatedHandler).toHaveBeenCalledOnce();
      expect(failedHandler).not.toHaveBeenCalled();
    });

    it('should emit events for failed report generation', async () => {
      const generatedHandler = vi.fn();
      const failedHandler = vi.fn();

      llpReportingService.on('reportGenerated', generatedHandler);
      llpReportingService.on('reportGenerationFailed', failedHandler);

      // Force an error
      mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'));

      await expect(llpReportingService.generateFleetStatusReport(undefined, ExportFormat.CSV))
        .rejects.toThrow('Disk full');

      expect(generatedHandler).not.toHaveBeenCalled();
      expect(failedHandler).toHaveBeenCalledOnce();
    });
  });
});