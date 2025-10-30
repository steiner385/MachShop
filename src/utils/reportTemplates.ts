/**
 * Report Templates and Export Utilities
 * Template generators for torque reports in various formats
 * Supports AS9100 compliance and electronic signatures
 */

import {
  TorqueReportData,
  TorqueEventSummary,
  TorqueSpecificationWithMetadata,
  TorqueAnalyticsDashboard
} from '../types/torque';

export interface TemplateOptions {
  includeHeader: boolean;
  includeSignatures: boolean;
  includeStatistics: boolean;
  includeCharts: boolean;
  companyName: string;
  logoUrl?: string;
}

/**
 * HTML Template Generator for PDF conversion
 */
export class HTMLTemplateGenerator {
  /**
   * Generate HTML template for torque report
   */
  static generateTorqueReportHTML(
    reportData: TorqueReportData,
    options: TemplateOptions
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Torque Management Report - ${reportData.reportId}</title>
    <style>
        ${this.getReportCSS()}
    </style>
</head>
<body>
    <div class="report-container">
        ${options.includeHeader ? this.generateHeader(reportData, options) : ''}
        ${this.generateReportTitle(reportData)}
        ${reportData.workOrder ? this.generateWorkOrderSection(reportData) : ''}
        ${this.generateTorqueSpecSection(reportData)}
        ${options.includeStatistics ? this.generateSummarySection(reportData) : ''}
        ${reportData.outOfSpecAnalysis ? this.generateOutOfSpecSection(reportData) : ''}
        ${this.generateEventsTable(reportData)}
        ${options.includeSignatures ? this.generateSignaturesSection(reportData) : ''}
        ${this.generateFooter(reportData)}
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSS styles for the report
   */
  private static getReportCSS(): string {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #333;
        }

        .report-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.75in;
            background: white;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #2563eb;
        }

        .company-info h1 {
            font-size: 20px;
            color: #2563eb;
            margin-bottom: 5px;
        }

        .company-info p {
            margin: 2px 0;
            color: #666;
        }

        .compliance-notice {
            text-align: right;
            font-size: 10px;
            color: #888;
            font-style: italic;
        }

        .report-title {
            text-align: center;
            margin-bottom: 30px;
        }

        .report-title h1 {
            font-size: 24px;
            color: #1f2937;
            margin-bottom: 10px;
        }

        .report-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            font-size: 11px;
            color: #666;
        }

        .section {
            margin-bottom: 25px;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e5e7eb;
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
        }

        .info-item {
            display: flex;
            margin-bottom: 8px;
        }

        .info-label {
            font-weight: bold;
            min-width: 120px;
            color: #374151;
        }

        .info-value {
            color: #6b7280;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 20px 0;
        }

        .stat-box {
            text-align: center;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }

        .stat-number {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
        }

        .stat-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
        }

        .events-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11px;
        }

        .events-table th,
        .events-table td {
            border: 1px solid #d1d5db;
            padding: 8px;
            text-align: center;
        }

        .events-table th {
            background: #f3f4f6;
            font-weight: bold;
            color: #374151;
        }

        .events-table tr:nth-child(even) {
            background: #f9fafb;
        }

        .status-pass {
            color: #059669;
            font-weight: bold;
        }

        .status-fail {
            color: #dc2626;
            font-weight: bold;
        }

        .signatures-section {
            margin-top: 40px;
            page-break-inside: avoid;
        }

        .signature-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 30px;
            margin-top: 20px;
        }

        .signature-box {
            border: 1px solid #d1d5db;
            padding: 20px;
            text-align: center;
            min-height: 100px;
        }

        .signature-role {
            font-weight: bold;
            margin-bottom: 10px;
            color: #374151;
        }

        .signature-line {
            border-bottom: 1px solid #9ca3af;
            margin: 20px 0 10px 0;
            height: 40px;
        }

        .signature-date {
            font-size: 10px;
            color: #6b7280;
        }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 10px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
        }

        .page-break {
            page-break-before: always;
        }

        @media print {
            .report-container {
                margin: 0;
                padding: 0.5in;
            }

            .page-break {
                page-break-before: always;
            }
        }
    `;
  }

  /**
   * Generate header section
   */
  private static generateHeader(reportData: TorqueReportData, options: TemplateOptions): string {
    return `
        <div class="header">
            <div class="company-info">
                <h1>${options.companyName}</h1>
                <p>Quality Management System</p>
                <p>Digital Torque Control</p>
            </div>
            <div class="compliance-notice">
                <p>AS9100 Compliant Quality Record</p>
                <p>Electronic Signature Authorized</p>
            </div>
        </div>
    `;
  }

  /**
   * Generate report title section
   */
  private static generateReportTitle(reportData: TorqueReportData): string {
    return `
        <div class="report-title">
            <h1>DIGITAL TORQUE MANAGEMENT REPORT</h1>
            <div class="report-meta">
                <div>Report ID: ${reportData.reportId}</div>
                <div>Generated: ${reportData.generatedAt.toLocaleString()}</div>
                <div>Generated By: ${reportData.generatedBy}</div>
            </div>
        </div>
    `;
  }

  /**
   * Generate work order section
   */
  private static generateWorkOrderSection(reportData: TorqueReportData): string {
    if (!reportData.workOrder) return '';

    const workOrder = reportData.workOrder;
    return `
        <div class="section">
            <h2 class="section-title">Work Order Information</h2>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="info-label">Work Order:</span>
                        <span class="info-value">${workOrder.workOrderNumber}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Part Number:</span>
                        <span class="info-value">${workOrder.partNumber}</span>
                    </div>
                </div>
                <div>
                    <div class="info-item">
                        <span class="info-label">Serial Number:</span>
                        <span class="info-value">${workOrder.serialNumber || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Quantity:</span>
                        <span class="info-value">${workOrder.quantity}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate torque specification section
   */
  private static generateTorqueSpecSection(reportData: TorqueReportData): string {
    const spec = reportData.torqueSpec;
    return `
        <div class="section">
            <h2 class="section-title">Torque Specification</h2>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="info-label">Specification Code:</span>
                        <span class="info-value">${spec.torqueSpecCode}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Name:</span>
                        <span class="info-value">${spec.name}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Target Torque:</span>
                        <span class="info-value">${spec.targetTorque}</span>
                    </div>
                </div>
                <div>
                    <div class="info-item">
                        <span class="info-label">Tolerance Range:</span>
                        <span class="info-value">${spec.toleranceRange}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fastener Type:</span>
                        <span class="info-value">${spec.fastenerType}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Fastener Count:</span>
                        <span class="info-value">${spec.fastenerCount}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate summary statistics section
   */
  private static generateSummarySection(reportData: TorqueReportData): string {
    const summary = reportData.summary;
    return `
        <div class="section">
            <h2 class="section-title">Summary Statistics</h2>
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-number">${summary.totalBolts}</div>
                    <div class="stat-label">Total Bolts</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${summary.inSpecCount}</div>
                    <div class="stat-label">In Specification</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${summary.successRate.toFixed(1)}%</div>
                    <div class="stat-label">Success Rate</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${summary.reworkRequired}</div>
                    <div class="stat-label">Rework Required</div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate out-of-spec analysis section
   */
  private static generateOutOfSpecSection(reportData: TorqueReportData): string {
    if (!reportData.outOfSpecAnalysis) return '';

    const analysis = reportData.outOfSpecAnalysis;
    return `
        <div class="section">
            <h2 class="section-title">Out-of-Specification Analysis</h2>
            <div class="info-grid">
                <div>
                    <div class="info-item">
                        <span class="info-label">Under-torqued:</span>
                        <span class="info-value">${analysis.underTorqued}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Over-torqued:</span>
                        <span class="info-value">${analysis.overTorqued}</span>
                    </div>
                </div>
                <div>
                    <div class="info-item">
                        <span class="info-label">Rework Completed:</span>
                        <span class="info-value">${analysis.reworkCompleted}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Pending Rework:</span>
                        <span class="info-value">${analysis.pendingRework}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate events table
   */
  private static generateEventsTable(reportData: TorqueReportData): string {
    const tableRows = reportData.events.map((event, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${event.boltPosition}</td>
            <td>${event.passNumber}</td>
            <td>${event.targetTorque.toFixed(1)}</td>
            <td>${event.actualTorque.toFixed(1)}</td>
            <td>${(event.deviationPercent || 0).toFixed(1)}%</td>
            <td class="${event.isInSpec ? 'status-pass' : 'status-fail'}">
                ${event.isInSpec ? 'PASS' : 'FAIL'}
            </td>
            <td>${event.operatorName}</td>
            <td>${new Date(event.timestamp).toLocaleString()}</td>
        </tr>
    `).join('');

    return `
        <div class="section">
            <h2 class="section-title">Detailed Torque Events</h2>
            <table class="events-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Bolt Position</th>
                        <th>Pass</th>
                        <th>Target (Nm)</th>
                        <th>Actual (Nm)</th>
                        <th>Deviation</th>
                        <th>Status</th>
                        <th>Operator</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
  }

  /**
   * Generate signatures section
   */
  private static generateSignaturesSection(reportData: TorqueReportData): string {
    const signatureBoxes = reportData.signatures.map(signature => `
        <div class="signature-box">
            <div class="signature-role">${signature.role}</div>
            <div class="signature-line"></div>
            <div>${signature.name}</div>
            <div class="signature-date">${signature.timestamp.toLocaleString()}</div>
            <div class="signature-date">${signature.signatureType}</div>
        </div>
    `).join('');

    return `
        <div class="signatures-section page-break">
            <h2 class="section-title">Electronic Signatures</h2>
            <div class="signature-grid">
                ${signatureBoxes}
            </div>
        </div>
    `;
  }

  /**
   * Generate footer section
   */
  private static generateFooter(reportData: TorqueReportData): string {
    return `
        <div class="footer">
            <div>Report ID: ${reportData.reportId}</div>
            <div>Generated: ${reportData.generatedAt.toLocaleString()}</div>
            <div>Page 1 of 1</div>
        </div>
    `;
  }

  /**
   * Generate analytics dashboard HTML
   */
  static generateAnalyticsDashboardHTML(
    dashboard: TorqueAnalyticsDashboard,
    options: TemplateOptions
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Torque Analytics Dashboard</title>
    <style>
        ${this.getAnalyticsCSS()}
    </style>
</head>
<body>
    <div class="analytics-container">
        ${this.generateAnalyticsHeader(dashboard, options)}
        ${this.generateAnalyticsOverview(dashboard)}
        ${this.generateAnalyticsTrends(dashboard)}
        ${this.generateAnalyticsQuality(dashboard)}
    </div>
</body>
</html>`;
  }

  /**
   * Generate CSS for analytics dashboard
   */
  private static getAnalyticsCSS(): string {
    return `
        /* Add analytics-specific CSS styles here */
        ${this.getReportCSS()}

        .analytics-container {
            max-width: 11in;
            margin: 0 auto;
            padding: 0.75in;
        }

        .analytics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }

        .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }

        .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 8px;
        }

        .metric-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
        }

        .chart-placeholder {
            background: #f1f5f9;
            border: 2px dashed #cbd5e1;
            border-radius: 8px;
            height: 200px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-style: italic;
        }
    `;
  }

  /**
   * Generate analytics header
   */
  private static generateAnalyticsHeader(
    dashboard: TorqueAnalyticsDashboard,
    options: TemplateOptions
  ): string {
    return `
        <div class="header">
            <div class="company-info">
                <h1>${options.companyName}</h1>
                <p>Torque Analytics Dashboard</p>
            </div>
            <div class="compliance-notice">
                <p>Analysis Period</p>
                <p>${dashboard.dateRange.start.toLocaleDateString()} - ${dashboard.dateRange.end.toLocaleDateString()}</p>
            </div>
        </div>
    `;
  }

  /**
   * Generate analytics overview section
   */
  private static generateAnalyticsOverview(dashboard: TorqueAnalyticsDashboard): string {
    const overview = dashboard.overview;
    return `
        <div class="section">
            <h2 class="section-title">Overview Metrics</h2>
            <div class="analytics-grid">
                <div class="metric-card">
                    <div class="metric-value">${overview.totalTorqueEvents.toLocaleString()}</div>
                    <div class="metric-label">Total Torque Events</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${overview.successRate.toFixed(1)}%</div>
                    <div class="metric-label">Current Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${overview.averageSuccessRate.toFixed(1)}%</div>
                    <div class="metric-label">Average Success Rate</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${overview.reworkRate.toFixed(1)}%</div>
                    <div class="metric-label">Rework Rate</div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate analytics trends section
   */
  private static generateAnalyticsTrends(dashboard: TorqueAnalyticsDashboard): string {
    return `
        <div class="section">
            <h2 class="section-title">Trends & Performance</h2>
            <div class="chart-placeholder">
                Daily Success Rate Trends Chart
                <br>
                (Chart implementation would go here)
            </div>
        </div>
    `;
  }

  /**
   * Generate analytics quality metrics section
   */
  private static generateAnalyticsQuality(dashboard: TorqueAnalyticsDashboard): string {
    return `
        <div class="section">
            <h2 class="section-title">Quality Metrics</h2>
            <div class="analytics-grid">
                <div class="metric-card">
                    <div class="metric-value">${dashboard.qualityMetrics.reworkAnalysis.totalReworkEvents}</div>
                    <div class="metric-label">Total Rework Events</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${dashboard.qualityMetrics.reworkAnalysis.averageReworkTime.toFixed(1)}</div>
                    <div class="metric-label">Avg Rework Time (min)</div>
                </div>
            </div>
        </div>
    `;
  }
}

/**
 * CSV Export Utilities
 */
export class CSVExportUtil {
  /**
   * Convert torque events to CSV format
   */
  static exportTorqueEventsToCSV(events: TorqueEventSummary[]): string {
    const headers = [
      'Event ID',
      'Work Order Number',
      'Serial Number',
      'Bolt Position',
      'Pass Number',
      'Actual Torque',
      'Target Torque',
      'Deviation Percent',
      'Is In Spec',
      'Requires Rework',
      'Operator Name',
      'Timestamp'
    ];

    const rows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        `"${event.id}"`,
        `"${event.workOrderNumber}"`,
        `"${event.serialNumber || ''}"`,
        event.boltPosition.toString(),
        event.passNumber.toString(),
        event.actualTorque.toString(),
        event.targetTorque.toString(),
        (event.deviationPercent || 0).toFixed(2),
        event.isInSpec ? 'Yes' : 'No',
        event.requiresRework ? 'Yes' : 'No',
        `"${event.operatorName}"`,
        `"${event.timestamp.toISOString()}"`
      ];
      rows.push(row.join(','));
    });

    return rows.join('\n');
  }

  /**
   * Convert analytics data to CSV format
   */
  static exportAnalyticsToCSV(dashboard: TorqueAnalyticsDashboard): string {
    const headers = ['Metric', 'Value', 'Unit'];
    const rows = [headers.join(',')];

    // Overview metrics
    rows.push(`"Total Torque Events","${dashboard.overview.totalTorqueEvents}","count"`);
    rows.push(`"Success Rate","${dashboard.overview.successRate.toFixed(2)}","%"`);
    rows.push(`"Average Success Rate","${dashboard.overview.averageSuccessRate.toFixed(2)}","%"`);
    rows.push(`"Rework Rate","${dashboard.overview.reworkRate.toFixed(2)}","%"`);

    // Quality metrics
    rows.push(`"Total Rework Events","${dashboard.qualityMetrics.reworkAnalysis.totalReworkEvents}","count"`);
    rows.push(`"Average Rework Time","${dashboard.qualityMetrics.reworkAnalysis.averageReworkTime.toFixed(2)}","minutes"`);

    return rows.join('\n');
  }
}

/**
 * JSON Export Utilities
 */
export class JSONExportUtil {
  /**
   * Convert report data to formatted JSON
   */
  static exportReportToJSON(reportData: TorqueReportData): string {
    return JSON.stringify(reportData, null, 2);
  }

  /**
   * Convert analytics data to formatted JSON
   */
  static exportAnalyticsToJSON(dashboard: TorqueAnalyticsDashboard): string {
    return JSON.stringify(dashboard, null, 2);
  }
}

export default {
  HTMLTemplateGenerator,
  CSVExportUtil,
  JSONExportUtil
};