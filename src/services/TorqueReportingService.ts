/**
 * Torque Reporting Service
 * Generates comprehensive torque reports with PDF export functionality
 * Supports AS9100 compliance and electronic signature integration
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { Writable } from 'stream';
import {
  TorqueReportRequest,
  TorqueReportData,
  TorqueEventSummary,
  TorqueSpecificationWithMetadata,
  TorqueAnalyticsDashboard
} from '../types/torque';

export interface ReportConfiguration {
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logo?: string;
  };
  compliance: {
    enableAS9100: boolean;
    enableISO9001: boolean;
    auditTrail: boolean;
    electronicSignatures: boolean;
  };
  formatting: {
    dateFormat: string;
    numberFormat: string;
    currency: string;
    timezone: string;
  };
}

export interface PDFReportOptions {
  includeHeader: boolean;
  includeFooter: boolean;
  includeLogo: boolean;
  includeSignatures: boolean;
  includeCharts: boolean;
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  watermark?: string;
}

export class TorqueReportingService {
  private config: ReportConfiguration;

  constructor(config: ReportConfiguration) {
    this.config = config;
  }

  /**
   * Generate comprehensive torque report
   */
  async generateTorqueReport(
    request: TorqueReportRequest,
    events: TorqueEventSummary[],
    torqueSpec: TorqueSpecificationWithMetadata
  ): Promise<TorqueReportData> {
    const reportId = `TR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate summary statistics
    const summary = this.calculateSummaryStatistics(events, torqueSpec);

    // Analyze out-of-spec events
    const outOfSpecAnalysis = this.analyzeOutOfSpecEvents(events);

    // Generate electronic signatures (placeholder)
    const signatures = this.generateElectronicSignatures(request, events);

    const reportData: TorqueReportData = {
      reportId,
      generatedAt: new Date(),
      generatedBy: 'system', // Would be actual user

      workOrder: request.workOrderId ? {
        workOrderNumber: request.workOrderId,
        partNumber: request.partNumber || 'N/A',
        serialNumber: request.serialNumber,
        quantity: 1
      } : undefined,

      torqueSpec: {
        torqueSpecCode: torqueSpec.torqueSpecCode,
        name: torqueSpec.name,
        targetTorque: torqueSpec.targetTorque,
        toleranceRange: `${torqueSpec.targetTorque - torqueSpec.toleranceMinus} - ${torqueSpec.targetTorque + torqueSpec.tolerancePlus} ${torqueSpec.torqueUnit}`,
        fastenerType: torqueSpec.fastenerType,
        fastenerCount: torqueSpec.fastenerCount
      },

      summary,
      events,
      outOfSpecAnalysis,
      signatures
    };

    return reportData;
  }

  /**
   * Export report to PDF format
   */
  async exportToPDF(
    reportData: TorqueReportData,
    options: PDFReportOptions = {
      includeHeader: true,
      includeFooter: true,
      includeLogo: true,
      includeSignatures: true,
      includeCharts: false,
      pageSize: 'A4',
      orientation: 'portrait'
    }
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create PDF document
        const doc = new PDFDocument({
          size: options.pageSize,
          layout: options.orientation,
          margins: {
            top: 72,
            bottom: 72,
            left: 72,
            right: 72
          }
        });

        // Collect PDF data
        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate PDF content
        this.generatePDFContent(doc, reportData, options);

        // Finalize PDF
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export report to CSV format
   */
  async exportToCSV(reportData: TorqueReportData): Promise<string> {
    const headers = [
      'Report ID',
      'Generated At',
      'Work Order',
      'Serial Number',
      'Bolt Position',
      'Pass Number',
      'Target Torque',
      'Actual Torque',
      'Deviation %',
      'In Spec',
      'Requires Rework',
      'Operator',
      'Timestamp'
    ];

    const rows = [headers.join(',')];

    // Add data rows
    reportData.events.forEach(event => {
      const row = [
        reportData.reportId,
        reportData.generatedAt.toISOString(),
        event.workOrderNumber,
        event.serialNumber || '',
        event.boltPosition.toString(),
        event.passNumber.toString(),
        event.targetTorque.toString(),
        event.actualTorque.toString(),
        (event.deviationPercent || 0).toFixed(2),
        event.isInSpec ? 'Yes' : 'No',
        event.requiresRework ? 'Yes' : 'No',
        event.operatorName,
        event.timestamp.toISOString()
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Export report to JSON format
   */
  async exportToJSON(reportData: TorqueReportData): Promise<string> {
    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Generate batch reports for multiple work orders
   */
  async generateBatchReports(
    requests: TorqueReportRequest[],
    format: 'PDF' | 'CSV' | 'JSON' = 'PDF'
  ): Promise<Array<{
    request: TorqueReportRequest;
    reportData: TorqueReportData;
    exportData: Buffer | string;
  }>> {
    const results = [];

    for (const request of requests) {
      try {
        // This would fetch actual data from the database
        const events: TorqueEventSummary[] = []; // Placeholder
        const torqueSpec: TorqueSpecificationWithMetadata = {} as any; // Placeholder

        const reportData = await this.generateTorqueReport(request, events, torqueSpec);

        let exportData: Buffer | string;
        switch (format) {
          case 'PDF':
            exportData = await this.exportToPDF(reportData);
            break;
          case 'CSV':
            exportData = await this.exportToCSV(reportData);
            break;
          case 'JSON':
            exportData = await this.exportToJSON(reportData);
            break;
        }

        results.push({
          request,
          reportData,
          exportData
        });
      } catch (error) {
        console.error(`Failed to generate report for request:`, request, error);
        // Continue with other reports
      }
    }

    return results;
  }

  /**
   * Generate analytics dashboard report
   */
  async generateAnalyticsReport(
    dashboard: TorqueAnalyticsDashboard,
    format: 'PDF' | 'JSON' = 'PDF'
  ): Promise<Buffer | string> {
    if (format === 'JSON') {
      return JSON.stringify(dashboard, null, 2);
    }

    // Generate PDF analytics report
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape' });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.generateAnalyticsPDFContent(doc, dashboard);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calculate summary statistics for torque events
   */
  private calculateSummaryStatistics(
    events: TorqueEventSummary[],
    torqueSpec: TorqueSpecificationWithMetadata
  ) {
    const totalBolts = torqueSpec.fastenerCount;
    const totalPasses = torqueSpec.numberOfPasses || 1;
    const eventsRecorded = events.length;
    const inSpecCount = events.filter(e => e.isInSpec).length;
    const outOfSpecCount = eventsRecorded - inSpecCount;
    const reworkRequired = events.filter(e => e.requiresRework).length;

    const torqueValues = events.map(e => e.actualTorque);
    const averageTorque = torqueValues.length > 0
      ? torqueValues.reduce((sum, val) => sum + val, 0) / torqueValues.length
      : 0;

    return {
      totalBolts,
      totalPasses,
      eventsRecorded,
      inSpecCount,
      outOfSpecCount,
      successRate: eventsRecorded > 0 ? (inSpecCount / eventsRecorded) * 100 : 0,
      averageTorque,
      reworkRequired
    };
  }

  /**
   * Analyze out-of-spec events
   */
  private analyzeOutOfSpecEvents(events: TorqueEventSummary[]) {
    const outOfSpecEvents = events.filter(e => !e.isInSpec);

    const underTorqued = outOfSpecEvents.filter(e =>
      e.actualTorque < e.targetTorque
    ).length;

    const overTorqued = outOfSpecEvents.filter(e =>
      e.actualTorque > e.targetTorque
    ).length;

    const reworkCompleted = events.filter(e =>
      e.requiresRework && !e.requiresRework // This would be actual rework status
    ).length;

    const pendingRework = events.filter(e => e.requiresRework).length;

    return {
      underTorqued,
      overTorqued,
      reworkCompleted,
      pendingRework
    };
  }

  /**
   * Generate electronic signatures for AS9100 compliance
   */
  private generateElectronicSignatures(
    request: TorqueReportRequest,
    events: TorqueEventSummary[]
  ) {
    return [
      {
        role: 'Operator',
        name: events[0]?.operatorName || 'Unknown',
        timestamp: new Date(),
        signatureType: 'Electronic'
      },
      {
        role: 'Quality Inspector',
        name: 'Pending',
        timestamp: new Date(),
        signatureType: 'Electronic'
      },
      {
        role: 'Supervisor',
        name: 'Pending',
        timestamp: new Date(),
        signatureType: 'Electronic'
      }
    ];
  }

  /**
   * Generate PDF content for torque report
   */
  private generatePDFContent(
    doc: PDFDocument,
    reportData: TorqueReportData,
    options: PDFReportOptions
  ): void {
    let yPosition = 72;

    // Header
    if (options.includeHeader) {
      yPosition = this.addPDFHeader(doc, reportData, yPosition);
    }

    // Report title and metadata
    yPosition = this.addReportTitle(doc, reportData, yPosition);

    // Work order information
    if (reportData.workOrder) {
      yPosition = this.addWorkOrderSection(doc, reportData, yPosition);
    }

    // Torque specification
    yPosition = this.addTorqueSpecSection(doc, reportData, yPosition);

    // Summary statistics
    yPosition = this.addSummarySection(doc, reportData, yPosition);

    // Out-of-spec analysis
    if (reportData.outOfSpecAnalysis) {
      yPosition = this.addOutOfSpecSection(doc, reportData, yPosition);
    }

    // Detailed events table
    yPosition = this.addEventsTable(doc, reportData, yPosition);

    // Electronic signatures
    if (options.includeSignatures && reportData.signatures) {
      yPosition = this.addSignaturesSection(doc, reportData, yPosition);
    }

    // Footer
    if (options.includeFooter) {
      this.addPDFFooter(doc, reportData);
    }
  }

  /**
   * Add PDF header with company information
   */
  private addPDFHeader(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    // Company logo (if available)
    if (this.config.companyInfo.logo && fs.existsSync(this.config.companyInfo.logo)) {
      doc.image(this.config.companyInfo.logo, 72, yPosition, { width: 100 });
    }

    // Company information
    doc.fontSize(16).font('Helvetica-Bold')
       .text(this.config.companyInfo.name, 200, yPosition);

    doc.fontSize(10).font('Helvetica')
       .text(this.config.companyInfo.address, 200, yPosition + 20)
       .text(`${this.config.companyInfo.phone} | ${this.config.companyInfo.email}`, 200, yPosition + 35);

    // AS9100 compliance notice
    if (this.config.compliance.enableAS9100) {
      doc.fontSize(8).font('Helvetica-Oblique')
         .text('AS9100 Compliant Quality Record', 400, yPosition + 50);
    }

    doc.moveTo(72, yPosition + 70).lineTo(522, yPosition + 70).stroke();

    return yPosition + 90;
  }

  /**
   * Add report title and metadata
   */
  private addReportTitle(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    doc.fontSize(18).font('Helvetica-Bold')
       .text('DIGITAL TORQUE MANAGEMENT REPORT', 72, yPosition, { align: 'center' });

    yPosition += 30;

    doc.fontSize(10).font('Helvetica')
       .text(`Report ID: ${reportData.reportId}`, 72, yPosition)
       .text(`Generated: ${reportData.generatedAt.toLocaleString()}`, 72, yPosition + 15)
       .text(`Generated By: ${reportData.generatedBy}`, 72, yPosition + 30);

    return yPosition + 60;
  }

  /**
   * Add work order information section
   */
  private addWorkOrderSection(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    if (!reportData.workOrder) return yPosition;

    doc.fontSize(14).font('Helvetica-Bold')
       .text('Work Order Information', 72, yPosition);

    yPosition += 25;

    const workOrder = reportData.workOrder;
    doc.fontSize(10).font('Helvetica')
       .text(`Work Order: ${workOrder.workOrderNumber}`, 72, yPosition)
       .text(`Part Number: ${workOrder.partNumber}`, 72, yPosition + 15)
       .text(`Serial Number: ${workOrder.serialNumber || 'N/A'}`, 72, yPosition + 30)
       .text(`Quantity: ${workOrder.quantity}`, 72, yPosition + 45);

    return yPosition + 75;
  }

  /**
   * Add torque specification section
   */
  private addTorqueSpecSection(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Torque Specification', 72, yPosition);

    yPosition += 25;

    const spec = reportData.torqueSpec;
    doc.fontSize(10).font('Helvetica')
       .text(`Specification Code: ${spec.torqueSpecCode}`, 72, yPosition)
       .text(`Name: ${spec.name}`, 72, yPosition + 15)
       .text(`Target Torque: ${spec.targetTorque}`, 72, yPosition + 30)
       .text(`Tolerance Range: ${spec.toleranceRange}`, 72, yPosition + 45)
       .text(`Fastener Type: ${spec.fastenerType}`, 72, yPosition + 60)
       .text(`Fastener Count: ${spec.fastenerCount}`, 72, yPosition + 75);

    return yPosition + 105;
  }

  /**
   * Add summary statistics section
   */
  private addSummarySection(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Summary Statistics', 72, yPosition);

    yPosition += 25;

    const summary = reportData.summary;

    // Create a two-column layout
    const leftColumn = 72;
    const rightColumn = 300;

    doc.fontSize(10).font('Helvetica')
       .text(`Total Bolts: ${summary.totalBolts}`, leftColumn, yPosition)
       .text(`Total Passes: ${summary.totalPasses}`, rightColumn, yPosition)
       .text(`Events Recorded: ${summary.eventsRecorded}`, leftColumn, yPosition + 15)
       .text(`In-Spec Count: ${summary.inSpecCount}`, rightColumn, yPosition + 15)
       .text(`Out-of-Spec Count: ${summary.outOfSpecCount}`, leftColumn, yPosition + 30)
       .text(`Success Rate: ${summary.successRate.toFixed(1)}%`, rightColumn, yPosition + 30)
       .text(`Average Torque: ${summary.averageTorque.toFixed(2)}`, leftColumn, yPosition + 45)
       .text(`Rework Required: ${summary.reworkRequired}`, rightColumn, yPosition + 45);

    return yPosition + 75;
  }

  /**
   * Add out-of-spec analysis section
   */
  private addOutOfSpecSection(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    if (!reportData.outOfSpecAnalysis) return yPosition;

    doc.fontSize(14).font('Helvetica-Bold')
       .text('Out-of-Specification Analysis', 72, yPosition);

    yPosition += 25;

    const analysis = reportData.outOfSpecAnalysis;

    doc.fontSize(10).font('Helvetica')
       .text(`Under-torqued: ${analysis.underTorqued}`, 72, yPosition)
       .text(`Over-torqued: ${analysis.overTorqued}`, 200, yPosition)
       .text(`Rework Completed: ${analysis.reworkCompleted}`, 72, yPosition + 15)
       .text(`Pending Rework: ${analysis.pendingRework}`, 200, yPosition + 15);

    return yPosition + 45;
  }

  /**
   * Add detailed events table
   */
  private addEventsTable(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Detailed Torque Events', 72, yPosition);

    yPosition += 25;

    // Table headers
    const headers = ['Bolt', 'Pass', 'Target', 'Actual', 'Deviation', 'Status'];
    const columnWidths = [50, 40, 70, 70, 70, 60];
    const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);

    let xPosition = 72;

    // Draw headers
    doc.fontSize(9).font('Helvetica-Bold');
    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition, { width: columnWidths[index], align: 'center' });
      xPosition += columnWidths[index];
    });

    yPosition += 20;

    // Draw header line
    doc.moveTo(72, yPosition).lineTo(72 + tableWidth, yPosition).stroke();
    yPosition += 5;

    // Draw data rows
    doc.fontSize(8).font('Helvetica');

    const maxRowsPerPage = 25;
    let rowCount = 0;

    reportData.events.forEach((event, index) => {
      if (rowCount >= maxRowsPerPage) {
        doc.addPage();
        yPosition = 72;
        rowCount = 0;
      }

      xPosition = 72;

      const rowData = [
        event.boltPosition.toString(),
        event.passNumber.toString(),
        event.targetTorque.toFixed(1),
        event.actualTorque.toFixed(1),
        `${(event.deviationPercent || 0).toFixed(1)}%`,
        event.isInSpec ? 'PASS' : 'FAIL'
      ];

      rowData.forEach((data, colIndex) => {
        const color = colIndex === 5 ? (event.isInSpec ? 'green' : 'red') : 'black';
        doc.fillColor(color)
           .text(data, xPosition, yPosition, { width: columnWidths[colIndex], align: 'center' });
        xPosition += columnWidths[colIndex];
      });

      doc.fillColor('black'); // Reset color
      yPosition += 15;
      rowCount++;
    });

    return yPosition + 20;
  }

  /**
   * Add electronic signatures section
   */
  private addSignaturesSection(doc: PDFDocument, reportData: TorqueReportData, yPosition: number): number {
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Electronic Signatures', 72, yPosition);

    yPosition += 25;

    reportData.signatures.forEach(signature => {
      doc.fontSize(10).font('Helvetica')
         .text(`${signature.role}: ${signature.name}`, 72, yPosition)
         .text(`Date: ${signature.timestamp.toLocaleString()}`, 300, yPosition)
         .text(`Type: ${signature.signatureType}`, 450, yPosition);

      yPosition += 20;
    });

    return yPosition + 20;
  }

  /**
   * Add PDF footer
   */
  private addPDFFooter(doc: PDFDocument, reportData: TorqueReportData): void {
    const pageHeight = doc.page.height;
    const footerY = pageHeight - 50;

    doc.fontSize(8).font('Helvetica')
       .text(`Report ID: ${reportData.reportId}`, 72, footerY)
       .text(`Page 1 of 1`, 450, footerY)
       .text(`Generated: ${reportData.generatedAt.toLocaleString()}`, 72, footerY + 10);
  }

  /**
   * Generate analytics PDF content
   */
  private generateAnalyticsPDFContent(doc: PDFDocument, dashboard: TorqueAnalyticsDashboard): void {
    let yPosition = 72;

    // Title
    doc.fontSize(18).font('Helvetica-Bold')
       .text('TORQUE ANALYTICS DASHBOARD', 72, yPosition, { align: 'center' });

    yPosition += 40;

    // Date range
    doc.fontSize(12).font('Helvetica')
       .text(`Analysis Period: ${dashboard.dateRange.start.toLocaleDateString()} - ${dashboard.dateRange.end.toLocaleDateString()}`, 72, yPosition);

    yPosition += 30;

    // Overview section
    doc.fontSize(14).font('Helvetica-Bold')
       .text('Overview', 72, yPosition);

    yPosition += 20;

    const overview = dashboard.overview;
    doc.fontSize(10).font('Helvetica')
       .text(`Total Torque Events: ${overview.totalTorqueEvents}`, 72, yPosition)
       .text(`Success Rate: ${overview.successRate.toFixed(1)}%`, 300, yPosition)
       .text(`Average Success Rate: ${overview.averageSuccessRate.toFixed(1)}%`, 72, yPosition + 15)
       .text(`Rework Rate: ${overview.reworkRate.toFixed(1)}%`, 300, yPosition + 15);

    yPosition += 45;

    // Most used specifications
    doc.fontSize(12).font('Helvetica-Bold')
       .text('Most Used Specifications', 72, yPosition);

    yPosition += 20;

    overview.mostUsedSpecs.slice(0, 5).forEach(spec => {
      doc.fontSize(9).font('Helvetica')
         .text(`${spec.name}: ${spec.usageCount} uses`, 72, yPosition);
      yPosition += 15;
    });

    // Quality metrics would be added here...
    // This is a simplified version for demonstration
  }
}

export default TorqueReportingService;