/**
 * Export Utilities
 *
 * Provides functions for exporting data to Excel and PDF formats.
 * Used for exporting dashboard metrics, work order lists, and other data.
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Export data to Excel file
 */
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Convert data to worksheet
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = Object.keys(data[0] || {}).map((key) => {
      const maxLength = Math.max(
        key.length,
        ...data.map((row) => String(row[key] || '').length)
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Max width 50 characters
    });
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

/**
 * Export data to PDF file
 */
export const exportToPDF = (
  data: any[],
  filename: string,
  title: string,
  columns: { header: string; dataKey: string }[]
) => {
  try {
    // Create new PDF document
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(title, 14, 22);

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Add table
    autoTable(doc, {
      startY: 35,
      head: [columns.map((col) => col.header)],
      body: data.map((row) => columns.map((col) => row[col.dataKey] || '')),
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [41, 128, 185], // Blue header
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245], // Light gray
      },
    });

    // Save PDF
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export to PDF');
  }
};

/**
 * Export dashboard metrics to Excel
 */
export const exportDashboardMetricsToExcel = (metrics: {
  workOrders: any[];
  kpis: {
    totalWorkOrders: number;
    completionRate: number;
    avgCycleTime: number;
    onTimeDelivery: number;
  };
  dateRange?: { start: string; end: string };
}) => {
  try {
    const wb = XLSX.utils.book_new();

    // KPI Summary Sheet
    const kpiData = [
      { Metric: 'Total Work Orders', Value: metrics.kpis.totalWorkOrders },
      { Metric: 'Completion Rate', Value: `${metrics.kpis.completionRate}%` },
      { Metric: 'Avg Cycle Time (days)', Value: metrics.kpis.avgCycleTime.toFixed(1) },
      { Metric: 'On-Time Delivery', Value: `${metrics.kpis.onTimeDelivery}%` },
    ];

    if (metrics.dateRange) {
      kpiData.push(
        { Metric: 'Date Range Start', Value: metrics.dateRange.start },
        { Metric: 'Date Range End', Value: metrics.dateRange.end }
      );
    }

    const kpiWs = XLSX.utils.json_to_sheet(kpiData);
    kpiWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, kpiWs, 'KPI Summary');

    // Work Orders Sheet
    if (metrics.workOrders.length > 0) {
      const woData = metrics.workOrders.map((wo) => ({
        'Work Order': wo.workOrderNumber,
        'Part Number': wo.partNumber || 'N/A',
        Status: wo.status,
        Priority: wo.priority,
        Quantity: wo.quantity,
        Completed: wo.quantityCompleted,
        'Due Date': wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A',
        'Created At': new Date(wo.createdAt).toLocaleDateString(),
      }));

      const woWs = XLSX.utils.json_to_sheet(woData);
      woWs['!cols'] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, woWs, 'Work Orders');
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Dashboard_Export_${timestamp}`;

    // Write file
    XLSX.writeFile(wb, `${filename}.xlsx`);
  } catch (error) {
    console.error('Error exporting dashboard metrics to Excel:', error);
    throw new Error('Failed to export dashboard metrics to Excel');
  }
};

/**
 * Export dashboard metrics to PDF
 */
export const exportDashboardMetricsToPDF = (metrics: {
  workOrders: any[];
  kpis: {
    totalWorkOrders: number;
    completionRate: number;
    avgCycleTime: number;
    onTimeDelivery: number;
  };
  dateRange?: { start: string; end: string };
}) => {
  try {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Dashboard Metrics Report', 14, 22);

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

    // Add date range if provided
    if (metrics.dateRange) {
      doc.text(
        `Date Range: ${metrics.dateRange.start} to ${metrics.dateRange.end}`,
        14,
        36
      );
    }

    // KPI Summary Table
    const kpiData = [
      ['Total Work Orders', metrics.kpis.totalWorkOrders.toString()],
      ['Completion Rate', `${metrics.kpis.completionRate}%`],
      ['Avg Cycle Time', `${metrics.kpis.avgCycleTime.toFixed(1)} days`],
      ['On-Time Delivery', `${metrics.kpis.onTimeDelivery}%`],
    ];

    autoTable(doc, {
      startY: metrics.dateRange ? 42 : 36,
      head: [['Metric', 'Value']],
      body: kpiData,
      theme: 'grid',
      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' },
      },
    });

    // Work Orders Table (limited to first 50 for PDF)
    if (metrics.workOrders.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 70;

      doc.setFontSize(14);
      doc.text('Work Orders', 14, finalY + 10);

      const woData = metrics.workOrders.slice(0, 50).map((wo) => [
        wo.workOrderNumber,
        wo.partNumber || 'N/A',
        wo.status,
        wo.priority,
        `${wo.quantityCompleted}/${wo.quantity}`,
        wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A',
      ]);

      autoTable(doc, {
        startY: finalY + 15,
        head: [['WO Number', 'Part', 'Status', 'Priority', 'Progress', 'Due Date']],
        body: woData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 },
        },
      });

      // Add note if there are more than 50 work orders
      if (metrics.workOrders.length > 50) {
        const finalY2 = (doc as any).lastAutoTable.finalY || 200;
        doc.setFontSize(9);
        doc.text(
          `Note: Showing first 50 of ${metrics.workOrders.length} work orders. Export to Excel for full data.`,
          14,
          finalY2 + 10
        );
      }
    }

    // Save PDF
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Dashboard_Export_${timestamp}`;
    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting dashboard metrics to PDF:', error);
    throw new Error('Failed to export dashboard metrics to PDF');
  }
};

/**
 * Export work orders to Excel
 */
export const exportWorkOrdersToExcel = (workOrders: any[], filename: string = 'Work_Orders') => {
  const data = workOrders.map((wo) => ({
    'Work Order': wo.workOrderNumber,
    'Part Number': wo.partNumber || 'N/A',
    Status: wo.status,
    Priority: wo.priority,
    Quantity: wo.quantity,
    Completed: wo.quantityCompleted,
    Scrapped: wo.quantityScrapped,
    'Due Date': wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A',
    'Started At': wo.startedAt ? new Date(wo.startedAt).toLocaleDateString() : 'N/A',
    'Completed At': wo.completedAt ? new Date(wo.completedAt).toLocaleDateString() : 'N/A',
    'Created At': new Date(wo.createdAt).toLocaleDateString(),
  }));

  exportToExcel(data, filename, 'Work Orders');
};

/**
 * Export work orders to PDF
 */
export const exportWorkOrdersToPDF = (workOrders: any[], filename: string = 'Work_Orders') => {
  const columns = [
    { header: 'WO Number', dataKey: 'workOrderNumber' },
    { header: 'Part Number', dataKey: 'partNumber' },
    { header: 'Status', dataKey: 'status' },
    { header: 'Priority', dataKey: 'priority' },
    { header: 'Qty', dataKey: 'quantity' },
    { header: 'Completed', dataKey: 'quantityCompleted' },
    { header: 'Due Date', dataKey: 'dueDate' },
  ];

  const data = workOrders.map((wo) => ({
    ...wo,
    partNumber: wo.partNumber || 'N/A',
    dueDate: wo.dueDate ? new Date(wo.dueDate).toLocaleDateString() : 'N/A',
  }));

  exportToPDF(data, filename, 'Work Orders Report', columns);
};
