/**
 * Report Rendering Engine and Export Formatters
 * Issue #442: Report Template Extension System
 */

import type {
  ReportTemplate,
  ReportDataContext,
  ReportExportOptions,
  ReportRenderResult,
  IReportRenderer,
} from './types';

import { ReportRenderingError } from './types';

/**
 * Report Renderer
 * Renders templates with data into various formats
 */
export class ReportRenderer implements IReportRenderer {
  /**
   * Render report template with data
   */
  async render(
    template: ReportTemplate,
    data: ReportDataContext,
    options: ReportExportOptions
  ): Promise<ReportRenderResult> {
    try {
      const startTime = Date.now();

      // Generate HTML from template and data
      const html = this.renderHTML(template, data);

      // Apply filters and sorting
      const filteredData = this.applyFilters(data, template);
      const sortedData = this.applySorting(filteredData, template);

      // Generate content based on export format
      let renderResult: Partial<ReportRenderResult> = {
        metadata: {
          generatedAt: new Date(),
          templateId: template.id,
          format: options.format,
          totalRows: sortedData.entityData.length,
        },
      };

      switch (options.format) {
        case 'html':
          renderResult.html = html;
          break;
        case 'pdf':
          renderResult.pdf = await this.renderPDF(html, template, options);
          break;
        case 'excel':
          renderResult.excel = await this.renderExcel(template, sortedData, options);
          break;
        case 'csv':
          renderResult.csv = this.renderCSV(template, sortedData);
          break;
        case 'json':
          renderResult.json = sortedData;
          break;
      }

      return renderResult as ReportRenderResult;
    } catch (error) {
      throw new ReportRenderingError(template.id, String(error));
    }
  }

  /**
   * Render HTML representation
   */
  private renderHTML(template: ReportTemplate, data: ReportDataContext): string {
    const parts: string[] = [];

    // Header
    parts.push('<html><head><meta charset="UTF-8"><style>');
    parts.push(this.getBaseCSS());
    parts.push('</style></head><body>');

    // Sections
    for (const section of template.sections) {
      if (section.visible === false) continue;

      parts.push(`<div class="section section-${section.type}">`);

      // Elements
      for (const element of section.elements) {
        if (element.type === 'text') {
          parts.push(`<div class="element text">${this.escapeHTML(element.content || '')}</div>`);
        } else if (element.type === 'field' && element.fieldId) {
          const field = template.fields.find((f) => f.id === element.fieldId);
          if (field) {
            const value = this.getFieldValue(data, field);
            parts.push(`<div class="field" data-field="${field.id}">${this.escapeHTML(String(value))}</div>`);
          }
        } else if (element.type === 'table') {
          parts.push(this.renderTable(template, data));
        } else if (element.type === 'page-number') {
          parts.push('<span class="page-number">[Page]</span>');
        } else if (element.type === 'date') {
          parts.push(`<span class="date">${new Date().toLocaleDateString()}</span>`);
        }
      }

      parts.push('</div>');
    }

    parts.push('</body></html>');

    return parts.join('\n');
  }

  /**
   * Render table
   */
  private renderTable(template: ReportTemplate, data: ReportDataContext): string {
    const parts: string[] = ['<table class="report-table">'];

    // Header row
    parts.push('<thead><tr>');
    for (const field of template.fields.filter((f) => f.visible !== false)) {
      parts.push(`<th>${this.escapeHTML(field.label)}</th>`);
    }
    parts.push('</tr></thead>');

    // Data rows
    parts.push('<tbody>');
    for (const row of data.entityData) {
      parts.push('<tr>');
      for (const field of template.fields.filter((f) => f.visible !== false)) {
        const value = row[field.dataSource] || '';
        const formatted = this.formatValue(value, field.dataType, field.format);
        parts.push(`<td>${this.escapeHTML(formatted)}</td>`);
      }
      parts.push('</tr>');
    }
    parts.push('</tbody>');

    parts.push('</table>');

    return parts.join('\n');
  }

  /**
   * Render PDF (simulated - in real implementation would use PDF library)
   */
  private async renderPDF(
    html: string,
    template: ReportTemplate,
    options: ReportExportOptions
  ): Promise<Buffer> {
    // In production, this would use a library like puppeteer, pdfkit, or wkhtmltopdf
    // For now, we'll create a simple text representation
    const pdf = Buffer.from(
      `PDF: ${template.name}\n${new Date().toISOString()}\n\n${html}`,
      'utf-8'
    );
    return pdf;
  }

  /**
   * Render Excel format (simulated - in real implementation would use excel library)
   */
  private async renderExcel(
    template: ReportTemplate,
    data: ReportDataContext,
    options: ReportExportOptions
  ): Promise<Buffer> {
    // In production, this would use a library like xlsx or exceljs
    const csv = this.renderCSV(template, data);
    // Return as buffer (simplified)
    return Buffer.from(csv, 'utf-8');
  }

  /**
   * Render CSV format
   */
  private renderCSV(template: ReportTemplate, data: ReportDataContext): string {
    const rows: string[] = [];

    // Header row
    const headers = template.fields
      .filter((f) => f.visible !== false)
      .map((f) => this.escapeCSV(f.label));
    rows.push(headers.join(','));

    // Data rows
    for (const row of data.entityData) {
      const values = template.fields
        .filter((f) => f.visible !== false)
        .map((f) => {
          const value = row[f.dataSource] || '';
          const formatted = this.formatValue(value, f.dataType, f.format);
          return this.escapeCSV(formatted);
        });
      rows.push(values.join(','));
    }

    // Totals if present
    if (data.totals) {
      const totalRows: string[] = [];
      for (const field of template.fields.filter((f) => f.visible !== false)) {
        const total = data.totals[field.id];
        totalRows.push(this.escapeCSV(total ? String(total) : ''));
      }
      rows.push(totalRows.join(','));
    }

    return rows.join('\n');
  }

  /**
   * Apply filters to data
   */
  private applyFilters(data: ReportDataContext, template: ReportTemplate): ReportDataContext {
    if (!template.filters || template.filters.length === 0) {
      return data;
    }

    const filtered = {
      ...data,
      entityData: data.entityData.filter((row) => {
        return template.filters!.every((filter) => {
          const fieldValue = row[filter.fieldId];

          switch (filter.operator) {
            case 'eq':
              return fieldValue === filter.value;
            case 'ne':
              return fieldValue !== filter.value;
            case 'gt':
              return fieldValue > filter.value;
            case 'gte':
              return fieldValue >= filter.value;
            case 'lt':
              return fieldValue < filter.value;
            case 'lte':
              return fieldValue <= filter.value;
            case 'in':
              return Array.isArray(filter.value) && filter.value.includes(fieldValue);
            case 'contains':
              return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
            default:
              return true;
          }
        });
      }),
    };

    return filtered;
  }

  /**
   * Apply sorting to data
   */
  private applySorting(data: ReportDataContext, template: ReportTemplate): ReportDataContext {
    if (!template.sortFields || template.sortFields.length === 0) {
      return data;
    }

    const sorted = {
      ...data,
      entityData: [...data.entityData].sort((a, b) => {
        for (const sort of template.sortFields!) {
          const aVal = a[sort.fieldId];
          const bVal = b[sort.fieldId];

          if (aVal < bVal) {
            return sort.direction === 'asc' ? -1 : 1;
          }
          if (aVal > bVal) {
            return sort.direction === 'asc' ? 1 : -1;
          }
        }
        return 0;
      }),
    };

    return sorted;
  }

  /**
   * Get field value from data context
   */
  private getFieldValue(data: ReportDataContext, field: any): any {
    if (data.entityData.length === 0) {
      return null;
    }

    const row = data.entityData[0];
    return row[field.dataSource] || '';
  }

  /**
   * Format value based on data type
   */
  private formatValue(value: any, dataType: string, format?: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (dataType) {
      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return new Date(value).toLocaleDateString();
      case 'currency':
        if (typeof value === 'number') {
          return `$${value.toFixed(2)}`;
        }
        return value;
      case 'number':
        if (typeof value === 'number') {
          return format ? value.toFixed(parseInt(format)) : String(value);
        }
        return value;
      default:
        return String(value);
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Escape CSV special characters
   */
  private escapeCSV(text: string): string {
    if (typeof text !== 'string') {
      text = String(text);
    }

    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  }

  /**
   * Get base CSS for HTML reports
   */
  private getBaseCSS(): string {
    return `
      * { margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; line-height: 1.6; }
      .section { margin: 20px 0; }
      .section-header { font-weight: bold; font-size: 18px; border-bottom: 2px solid #333; padding-bottom: 10px; }
      .section-footer { margin-top: 20px; border-top: 1px solid #ccc; padding-top: 10px; }
      .section-body { padding: 10px 0; }
      .element { margin: 5px 0; }
      .field { padding: 5px; }
      .report-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      .report-table th { background-color: #f0f0f0; padding: 10px; text-align: left; border: 1px solid #ddd; font-weight: bold; }
      .report-table td { padding: 8px; border: 1px solid #ddd; }
      .report-table tr:nth-child(even) { background-color: #f9f9f9; }
      .page-number { font-size: 12px; color: #666; }
      .date { font-size: 12px; color: #666; }
    `;
  }
}

/**
 * Global report renderer instance
 */
export const reportRenderer = new ReportRenderer();

/**
 * Report caching service
 */
export class ReportCacheService {
  private cache: Map<string, { data: any; expiresAt: Date }> = new Map();
  private defaultTTL: number = 3600000; // 1 hour

  /**
   * Get cached report
   */
  get(cacheKey: string): any | null {
    const entry = this.cache.get(cacheKey);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache report result
   */
  set(cacheKey: string, data: any, ttl?: number): void {
    const expiresAt = new Date(Date.now() + (ttl || this.defaultTTL));
    this.cache.set(cacheKey, { data, expiresAt });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = new Date();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key
   */
  generateKey(templateId: string, filters?: Record<string, any>, parameters?: Record<string, any>): string {
    const parts = [templateId];
    if (filters) {
      parts.push(JSON.stringify(filters));
    }
    if (parameters) {
      parts.push(JSON.stringify(parameters));
    }
    return parts.join('|');
  }
}

/**
 * Global cache service
 */
export const reportCache = new ReportCacheService();
