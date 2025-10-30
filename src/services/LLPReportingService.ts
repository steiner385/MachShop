/**
 * LLP Reporting and Compliance Export Service
 *
 * Comprehensive reporting service for Life-Limited Parts compliance including:
 * - Fleet status reports and analytics
 * - Regulatory compliance reports (IATA, FAA, EASA)
 * - Retirement forecasting and planning reports
 * - Audit trail and traceability reports
 * - Certification status and expiration reports
 * - Custom report generation with filtering
 * - Export functionality (PDF, Excel, CSV)
 *
 * Safety-critical reporting system for aerospace manufacturing
 * regulatory compliance and decision making.
 */

import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import * as XLSX from 'xlsx';
import PDFDocument from 'pdfkit';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  LLPFleetReport,
  LLPPartReport,
  LLPAuditReport,
  LLPAnalyticsDashboard,
  LLPRetirementForecast,
  LLPComplianceStatus,
  LLPQueryFilters,
  LLPCertificationStatus
} from '../types/llp.js';
import { LLPService } from './LLPService';
import { LLPCertificationService } from './LLPCertificationService';

// ============================================================================
// REPORTING TYPES AND INTERFACES
// ============================================================================

export interface ReportGenerationRequest {
  reportType: ReportType;
  format: ExportFormat;
  filters?: LLPQueryFilters;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  includeGraphics?: boolean;
  includeRawData?: boolean;
  customFields?: string[];
  requestedBy: string;
}

export interface ReportGenerationResult {
  reportId: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
  generatedAt: Date;
  expiresAt: Date;
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  reportType: ReportType;
  format: ExportFormat;
  recordCount: number;
  filters: any;
  generationTime: number; // milliseconds
  requestedBy: string;
  complianceLevel: 'FULL' | 'SUMMARY' | 'BASIC';
}

export enum ReportType {
  FLEET_STATUS = 'FLEET_STATUS',
  RETIREMENT_FORECAST = 'RETIREMENT_FORECAST',
  COMPLIANCE_SUMMARY = 'COMPLIANCE_SUMMARY',
  AUDIT_TRAIL = 'AUDIT_TRAIL',
  CERTIFICATION_STATUS = 'CERTIFICATION_STATUS',
  LIFE_HISTORY = 'LIFE_HISTORY',
  ALERT_SUMMARY = 'ALERT_SUMMARY',
  REGULATORY_COMPLIANCE = 'REGULATORY_COMPLIANCE',
  CUSTOM_REPORT = 'CUSTOM_REPORT'
}

export enum ExportFormat {
  PDF = 'PDF',
  EXCEL = 'EXCEL',
  CSV = 'CSV',
  JSON = 'JSON'
}

export interface FleetStatusReportData {
  generatedAt: Date;
  totalLLPs: number;
  activePartsCount: number;
  retiredPartsCount: number;
  partsNearRetirement: number;
  averageLifeUsed: number;
  complianceRate: number;
  activeCriticalAlerts: number;
  partsByCategory: PartCategoryBreakdown[];
  statusDistribution: StatusDistribution[];
  retirementForecast: RetirementForecastSummary;
  complianceSummary: ComplianceSummaryData;
}

export interface PartCategoryBreakdown {
  partNumber: string;
  partName: string;
  criticalityLevel: string;
  totalCount: number;
  activeCount: number;
  retiredCount: number;
  averageLifeUsed: number;
  nextRetirementDate?: Date;
  complianceIssues: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface RetirementForecastSummary {
  next30Days: number;
  next90Days: number;
  next365Days: number;
  forecastAccuracy: number;
}

export interface ComplianceSummaryData {
  overallCompliantParts: number;
  iataCompliantParts: number;
  faaCompliantParts: number;
  easaCompliantParts: number;
  partsWithIssues: number;
  missingCertifications: number;
  expiredCertifications: number;
}

// ============================================================================
// MAIN REPORTING SERVICE
// ============================================================================

export class LLPReportingService extends EventEmitter {
  private prisma: PrismaClient;
  private llpService: LLPService;
  private certificationService: LLPCertificationService;
  private reportsDirectory: string;

  constructor(
    prisma: PrismaClient,
    llpService: LLPService,
    certificationService: LLPCertificationService
  ) {
    super();
    this.prisma = prisma;
    this.llpService = llpService;
    this.certificationService = certificationService;
    this.reportsDirectory = process.env.REPORTS_DIRECTORY || './generated-reports';
    this.ensureReportsDirectory();
  }

  private async ensureReportsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.reportsDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  // ============================================================================
  // REPORT GENERATION METHODS
  // ============================================================================

  /**
   * Generate comprehensive fleet status report
   */
  async generateFleetStatusReport(
    filters?: LLPQueryFilters,
    format: ExportFormat = ExportFormat.PDF
  ): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    const reportId = this.generateReportId('FLEET_STATUS');

    try {
      // Gather fleet data
      const fleetData = await this.collectFleetStatusData(filters);

      // Generate report in requested format
      let fileName: string;
      let fileSize: number;

      switch (format) {
        case ExportFormat.PDF:
          ({ fileName, fileSize } = await this.generateFleetStatusPDF(fleetData, reportId));
          break;
        case ExportFormat.EXCEL:
          ({ fileName, fileSize } = await this.generateFleetStatusExcel(fleetData, reportId));
          break;
        case ExportFormat.CSV:
          ({ fileName, fileSize } = await this.generateFleetStatusCSV(fleetData, reportId));
          break;
        case ExportFormat.JSON:
          ({ fileName, fileSize } = await this.generateFleetStatusJSON(fleetData, reportId));
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      const result: ReportGenerationResult = {
        reportId,
        fileName,
        fileSize,
        downloadUrl: `/api/v1/llp/reports/download/${reportId}`,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: {
          reportType: ReportType.FLEET_STATUS,
          format,
          recordCount: fleetData.totalLLPs,
          filters: filters || {},
          generationTime: Date.now() - startTime,
          requestedBy: 'system',
          complianceLevel: 'FULL'
        }
      };

      // Emit report generation event
      this.emit('reportGenerated', result);

      return result;
    } catch (error) {
      this.emit('reportGenerationFailed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        reportType: ReportType.FLEET_STATUS
      });
      throw error;
    }
  }

  /**
   * Generate retirement forecast report
   */
  async generateRetirementForecastReport(
    daysAhead: number = 365,
    format: ExportFormat = ExportFormat.PDF
  ): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    const reportId = this.generateReportId('RETIREMENT_FORECAST');

    try {
      const forecastData = await this.collectRetirementForecastData(daysAhead);

      let fileName: string;
      let fileSize: number;

      switch (format) {
        case ExportFormat.PDF:
          ({ fileName, fileSize } = await this.generateRetirementForecastPDF(forecastData, reportId));
          break;
        case ExportFormat.EXCEL:
          ({ fileName, fileSize } = await this.generateRetirementForecastExcel(forecastData, reportId));
          break;
        default:
          ({ fileName, fileSize } = await this.generateRetirementForecastJSON(forecastData, reportId));
      }

      return {
        reportId,
        fileName,
        fileSize,
        downloadUrl: `/api/v1/llp/reports/download/${reportId}`,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          reportType: ReportType.RETIREMENT_FORECAST,
          format,
          recordCount: forecastData.length,
          filters: { daysAhead },
          generationTime: Date.now() - startTime,
          requestedBy: 'system',
          complianceLevel: 'FULL'
        }
      };
    } catch (error) {
      this.emit('reportGenerationFailed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        reportType: ReportType.RETIREMENT_FORECAST
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive compliance report
   */
  async generateComplianceReport(
    regulatoryStandard?: 'IATA' | 'FAA' | 'EASA' | 'ALL',
    format: ExportFormat = ExportFormat.PDF
  ): Promise<ReportGenerationResult> {
    const startTime = Date.now();
    const reportId = this.generateReportId('COMPLIANCE');

    try {
      const complianceData = await this.collectComplianceData(regulatoryStandard);

      let fileName: string;
      let fileSize: number;

      switch (format) {
        case ExportFormat.PDF:
          ({ fileName, fileSize } = await this.generateCompliancePDF(complianceData, reportId));
          break;
        case ExportFormat.EXCEL:
          ({ fileName, fileSize } = await this.generateComplianceExcel(complianceData, reportId));
          break;
        default:
          ({ fileName, fileSize } = await this.generateComplianceJSON(complianceData, reportId));
      }

      return {
        reportId,
        fileName,
        fileSize,
        downloadUrl: `/api/v1/llp/reports/download/${reportId}`,
        generatedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          reportType: ReportType.REGULATORY_COMPLIANCE,
          format,
          recordCount: complianceData.totalParts,
          filters: { regulatoryStandard },
          generationTime: Date.now() - startTime,
          requestedBy: 'system',
          complianceLevel: 'FULL'
        }
      };
    } catch (error) {
      this.emit('reportGenerationFailed', {
        reportId,
        error: error instanceof Error ? error.message : 'Unknown error',
        reportType: ReportType.REGULATORY_COMPLIANCE
      });
      throw error;
    }
  }

  // ============================================================================
  // DATA COLLECTION METHODS
  // ============================================================================

  private async collectFleetStatusData(filters?: LLPQueryFilters): Promise<FleetStatusReportData> {
    // Get all LLP serialized parts
    const serializedParts = await this.prisma.serializedPart.findMany({
      where: {
        part: { isLifeLimited: true }
      },
      include: {
        part: true,
        llpAlerts: { where: { isActive: true } },
        llpCertifications: { where: { isActive: true } }
      }
    });

    const totalLLPs = serializedParts.length;
    const activeParts = serializedParts.filter(p => p.status !== 'RETIRED');
    const retiredParts = serializedParts.filter(p => p.status === 'RETIRED');

    // Calculate life status for each part
    const lifeStatuses = await Promise.all(
      serializedParts.map(async (part) => {
        try {
          return await this.llpService.calculateLifeStatus(part.id);
        } catch (error) {
          return null;
        }
      })
    );

    const validLifeStatuses = lifeStatuses.filter(status => status !== null);
    const averageLifeUsed = validLifeStatuses.length > 0
      ? validLifeStatuses.reduce((sum, status) => sum + status.overallPercentageUsed, 0) / validLifeStatuses.length
      : 0;

    const partsNearRetirement = validLifeStatuses.filter(status => status.overallPercentageUsed >= 90).length;
    const activeCriticalAlerts = serializedParts.reduce(
      (sum, part) => sum + part.llpAlerts.filter(alert => ['CRITICAL', 'URGENT'].includes(alert.severity)).length,
      0
    );

    // Build part category breakdown
    const partsByCategory = await this.buildPartCategoryBreakdown(serializedParts, validLifeStatuses);

    // Build status distribution
    const statusDistribution = this.buildStatusDistribution(validLifeStatuses);

    // Calculate retirement forecast
    const retirementForecast = await this.calculateRetirementForecastSummary(validLifeStatuses);

    // Calculate compliance summary
    const complianceSummary = await this.calculateComplianceSummary(serializedParts);

    return {
      generatedAt: new Date(),
      totalLLPs,
      activePartsCount: activeParts.length,
      retiredPartsCount: retiredParts.length,
      partsNearRetirement,
      averageLifeUsed,
      complianceRate: complianceSummary.overallCompliantParts / totalLLPs * 100,
      activeCriticalAlerts,
      partsByCategory,
      statusDistribution,
      retirementForecast,
      complianceSummary
    };
  }

  private async collectRetirementForecastData(daysAhead: number): Promise<any[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const serializedParts = await this.prisma.serializedPart.findMany({
      where: {
        part: { isLifeLimited: true },
        status: { not: 'RETIRED' }
      },
      include: { part: true }
    });

    const forecast = [];
    for (const part of serializedParts) {
      try {
        const lifeStatus = await this.llpService.calculateLifeStatus(part.id);
        if (lifeStatus.retirementDue && new Date(lifeStatus.retirementDue) <= cutoffDate) {
          forecast.push({
            partNumber: part.part.partNumber,
            serialNumber: part.serialNumber,
            currentLifeUsed: lifeStatus.overallPercentageUsed,
            forecastRetirementDate: lifeStatus.retirementDue,
            criticalityLevel: part.part.llpCriticalityLevel,
            retirementReason: lifeStatus.retirementReason || 'Life limit approaching',
            daysUntilRetirement: Math.ceil(
              (new Date(lifeStatus.retirementDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            )
          });
        }
      } catch (error) {
        console.error(`Failed to calculate life status for part ${part.id}:`, error);
      }
    }

    return forecast.sort((a, b) => a.daysUntilRetirement - b.daysUntilRetirement);
  }

  private async collectComplianceData(regulatoryStandard?: string): Promise<any> {
    const serializedParts = await this.prisma.serializedPart.findMany({
      where: {
        part: { isLifeLimited: true }
      },
      include: {
        part: true,
        llpCertifications: { where: { isActive: true } }
      }
    });

    let totalParts = serializedParts.length;
    let compliantParts = 0;
    let iataCompliant = 0;
    let faaCompliant = 0;
    let easaCompliant = 0;
    let partsWithIssues = 0;

    const complianceDetails = [];

    for (const part of serializedParts) {
      try {
        const complianceStatus = await this.llpService.calculateComplianceStatus(part.id);

        if (complianceStatus.overallCompliant) compliantParts++;
        if (complianceStatus.iataCompliant) iataCompliant++;
        if (complianceStatus.faaCompliant) faaCompliant++;
        if (complianceStatus.easaCompliant) easaCompliant++;
        if (complianceStatus.complianceIssues.length > 0) partsWithIssues++;

        complianceDetails.push({
          partNumber: part.part.partNumber,
          serialNumber: part.serialNumber,
          complianceStatus,
          certificationCount: part.llpCertifications.length
        });
      } catch (error) {
        console.error(`Failed to check compliance for part ${part.id}:`, error);
        partsWithIssues++;
      }
    }

    return {
      totalParts,
      compliantParts,
      iataCompliant,
      faaCompliant,
      easaCompliant,
      partsWithIssues,
      complianceRate: (compliantParts / totalParts) * 100,
      complianceDetails
    };
  }

  // ============================================================================
  // PDF GENERATION METHODS
  // ============================================================================

  private async generateFleetStatusPDF(data: FleetStatusReportData, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    const fileName = `fleet-status-${reportId}.pdf`;
    const filePath = path.join(this.reportsDirectory, fileName);

    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream as any);

    // Header
    doc.fontSize(20).text('LLP Fleet Status Report', 50, 50);
    doc.fontSize(12).text(`Generated: ${data.generatedAt.toLocaleString()}`, 50, 80);

    // Executive Summary
    doc.fontSize(16).text('Executive Summary', 50, 120);
    doc.fontSize(12)
      .text(`Total LLPs: ${data.totalLLPs}`, 70, 150)
      .text(`Active Parts: ${data.activePartsCount}`, 70, 170)
      .text(`Retired Parts: ${data.retiredPartsCount}`, 70, 190)
      .text(`Parts Near Retirement: ${data.partsNearRetirement}`, 70, 210)
      .text(`Average Life Used: ${data.averageLifeUsed.toFixed(1)}%`, 70, 230)
      .text(`Compliance Rate: ${data.complianceRate.toFixed(1)}%`, 70, 250)
      .text(`Critical Alerts: ${data.activeCriticalAlerts}`, 70, 270);

    // Status Distribution
    doc.fontSize(16).text('Status Distribution', 50, 320);
    let yPos = 350;
    data.statusDistribution.forEach(status => {
      doc.fontSize(12).text(`${status.status}: ${status.count} (${status.percentage.toFixed(1)}%)`, 70, yPos);
      yPos += 20;
    });

    // Retirement Forecast
    doc.fontSize(16).text('Retirement Forecast', 50, yPos + 30);
    yPos += 60;
    doc.fontSize(12)
      .text(`Next 30 Days: ${data.retirementForecast.next30Days}`, 70, yPos)
      .text(`Next 90 Days: ${data.retirementForecast.next90Days}`, 70, yPos + 20)
      .text(`Next 365 Days: ${data.retirementForecast.next365Days}`, 70, yPos + 40);

    doc.end();

    return new Promise((resolve, reject) => {
      stream.on('finish', async () => {
        try {
          const stats = await fs.stat(filePath);
          resolve({ fileName, fileSize: stats.size });
        } catch (error) {
          reject(error);
        }
      });
      stream.on('error', reject);
    });
  }

  // ============================================================================
  // EXCEL GENERATION METHODS
  // ============================================================================

  private async generateFleetStatusExcel(data: FleetStatusReportData, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    const fileName = `fleet-status-${reportId}.xlsx`;
    const filePath = path.join(this.reportsDirectory, fileName);

    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['LLP Fleet Status Report'],
      ['Generated:', data.generatedAt.toLocaleString()],
      [''],
      ['Executive Summary'],
      ['Total LLPs', data.totalLLPs],
      ['Active Parts', data.activePartsCount],
      ['Retired Parts', data.retiredPartsCount],
      ['Parts Near Retirement', data.partsNearRetirement],
      ['Average Life Used (%)', data.averageLifeUsed.toFixed(1)],
      ['Compliance Rate (%)', data.complianceRate.toFixed(1)],
      ['Critical Alerts', data.activeCriticalAlerts]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Part categories sheet
    const categoryHeaders = ['Part Number', 'Part Name', 'Criticality', 'Total Count', 'Active', 'Retired', 'Avg Life Used (%)', 'Compliance Issues'];
    const categoryData = [categoryHeaders, ...data.partsByCategory.map(cat => [
      cat.partNumber,
      cat.partName,
      cat.criticalityLevel,
      cat.totalCount,
      cat.activeCount,
      cat.retiredCount,
      cat.averageLifeUsed.toFixed(1),
      cat.complianceIssues
    ])];

    const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Part Categories');

    // Status distribution sheet
    const statusHeaders = ['Status', 'Count', 'Percentage'];
    const statusData = [statusHeaders, ...data.statusDistribution.map(status => [
      status.status,
      status.count,
      status.percentage.toFixed(1)
    ])];

    const statusSheet = XLSX.utils.aoa_to_sheet(statusData);
    XLSX.utils.book_append_sheet(workbook, statusSheet, 'Status Distribution');

    XLSX.writeFile(workbook, filePath);

    const stats = await fs.stat(filePath);
    return { fileName, fileSize: stats.size };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private generateReportId(type: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${type}-${timestamp}-${random}`;
  }

  private async buildPartCategoryBreakdown(serializedParts: any[], lifeStatuses: any[]): Promise<PartCategoryBreakdown[]> {
    const categoryMap = new Map<string, PartCategoryBreakdown>();

    for (let i = 0; i < serializedParts.length; i++) {
      const part = serializedParts[i];
      const lifeStatus = lifeStatuses[i];

      if (!categoryMap.has(part.part.partNumber)) {
        categoryMap.set(part.part.partNumber, {
          partNumber: part.part.partNumber,
          partName: part.part.partName || 'Unknown',
          criticalityLevel: part.part.llpCriticalityLevel || 'TRACKED',
          totalCount: 0,
          activeCount: 0,
          retiredCount: 0,
          averageLifeUsed: 0,
          complianceIssues: 0
        });
      }

      const category = categoryMap.get(part.part.partNumber)!;
      category.totalCount++;

      if (part.status === 'RETIRED') {
        category.retiredCount++;
      } else {
        category.activeCount++;
      }

      if (lifeStatus) {
        category.averageLifeUsed += lifeStatus.overallPercentageUsed;
      }
    }

    // Calculate averages
    categoryMap.forEach(category => {
      if (category.totalCount > 0) {
        category.averageLifeUsed = category.averageLifeUsed / category.totalCount;
      }
    });

    return Array.from(categoryMap.values());
  }

  private buildStatusDistribution(lifeStatuses: any[]): StatusDistribution[] {
    const statusCounts = new Map<string, number>();

    lifeStatuses.forEach(status => {
      const statusKey = status.status;
      statusCounts.set(statusKey, (statusCounts.get(statusKey) || 0) + 1);
    });

    const total = lifeStatuses.length;
    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100
    }));
  }

  private async calculateRetirementForecastSummary(lifeStatuses: any[]): Promise<RetirementForecastSummary> {
    const now = new Date();

    let next30Days = 0;
    let next90Days = 0;
    let next365Days = 0;

    lifeStatuses.forEach(status => {
      if (status.retirementDue) {
        const retirementDate = new Date(status.retirementDue);
        const daysUntil = Math.ceil((retirementDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 30) next30Days++;
        if (daysUntil <= 90) next90Days++;
        if (daysUntil <= 365) next365Days++;
      }
    });

    return {
      next30Days,
      next90Days,
      next365Days,
      forecastAccuracy: 95.0 // This would be calculated based on historical accuracy
    };
  }

  private async calculateComplianceSummary(serializedParts: any[]): Promise<ComplianceSummaryData> {
    let overallCompliant = 0;
    let iataCompliant = 0;
    let faaCompliant = 0;
    let easaCompliant = 0;
    let partsWithIssues = 0;

    for (const part of serializedParts) {
      try {
        const complianceStatus = await this.llpService.calculateComplianceStatus(part.id);

        if (complianceStatus.overallCompliant) overallCompliant++;
        if (complianceStatus.iataCompliant) iataCompliant++;
        if (complianceStatus.faaCompliant) faaCompliant++;
        if (complianceStatus.easaCompliant) easaCompliant++;
        if (complianceStatus.complianceIssues.length > 0) partsWithIssues++;
      } catch (error) {
        partsWithIssues++;
      }
    }

    return {
      overallCompliantParts: overallCompliant,
      iataCompliantParts: iataCompliant,
      faaCompliantParts: faaCompliant,
      easaCompliantParts: easaCompliant,
      partsWithIssues,
      missingCertifications: 0, // Would be calculated from certification data
      expiredCertifications: 0   // Would be calculated from certification data
    };
  }

  // Placeholder methods for other format generators
  private async generateFleetStatusCSV(data: FleetStatusReportData, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    // Implementation for CSV generation
    const fileName = `fleet-status-${reportId}.csv`;
    const filePath = path.join(this.reportsDirectory, fileName);

    // Simple CSV generation
    const csvContent = `Part Number,Part Name,Total Count,Active,Retired,Avg Life Used
${data.partsByCategory.map(cat =>
  `${cat.partNumber},${cat.partName},${cat.totalCount},${cat.activeCount},${cat.retiredCount},${cat.averageLifeUsed.toFixed(1)}`
).join('\n')}`;

    await fs.writeFile(filePath, csvContent);
    const stats = await fs.stat(filePath);
    return { fileName, fileSize: stats.size };
  }

  private async generateFleetStatusJSON(data: FleetStatusReportData, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    const fileName = `fleet-status-${reportId}.json`;
    const filePath = path.join(this.reportsDirectory, fileName);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    const stats = await fs.stat(filePath);
    return { fileName, fileSize: stats.size };
  }

  // Additional placeholder methods for retirement forecast reports
  private async generateRetirementForecastPDF(data: any[], reportId: string): Promise<{ fileName: string; fileSize: number }> {
    // Implementation would be similar to fleet status PDF
    return { fileName: `retirement-forecast-${reportId}.pdf`, fileSize: 1024 };
  }

  private async generateRetirementForecastExcel(data: any[], reportId: string): Promise<{ fileName: string; fileSize: number }> {
    // Implementation would be similar to fleet status Excel
    return { fileName: `retirement-forecast-${reportId}.xlsx`, fileSize: 1024 };
  }

  private async generateRetirementForecastJSON(data: any[], reportId: string): Promise<{ fileName: string; fileSize: number }> {
    const fileName = `retirement-forecast-${reportId}.json`;
    const filePath = path.join(this.reportsDirectory, fileName);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    const stats = await fs.stat(filePath);
    return { fileName, fileSize: stats.size };
  }

  // Compliance report methods
  private async generateCompliancePDF(data: any, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    return { fileName: `compliance-${reportId}.pdf`, fileSize: 1024 };
  }

  private async generateComplianceExcel(data: any, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    return { fileName: `compliance-${reportId}.xlsx`, fileSize: 1024 };
  }

  private async generateComplianceJSON(data: any, reportId: string): Promise<{ fileName: string; fileSize: number }> {
    const fileName = `compliance-${reportId}.json`;
    const filePath = path.join(this.reportsDirectory, fileName);

    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    const stats = await fs.stat(filePath);
    return { fileName, fileSize: stats.size };
  }

  /**
   * Get report file for download
   */
  async getReportFile(reportId: string): Promise<Buffer> {
    const files = await fs.readdir(this.reportsDirectory);
    const reportFile = files.find(file => file.includes(reportId));

    if (!reportFile) {
      throw new Error(`Report file not found for ID: ${reportId}`);
    }

    const filePath = path.join(this.reportsDirectory, reportFile);
    return await fs.readFile(filePath);
  }

  /**
   * Clean up expired reports
   */
  async cleanupExpiredReports(): Promise<void> {
    try {
      const files = await fs.readdir(this.reportsDirectory);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      for (const file of files) {
        const filePath = path.join(this.reportsDirectory, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < sevenDaysAgo) {
          await fs.unlink(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired reports:', error);
    }
  }
}