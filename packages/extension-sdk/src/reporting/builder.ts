/**
 * Report Template Builder - Fluent API for template creation
 * Issue #442: Report Template Extension System
 */

import type {
  ReportTemplate,
  ReportField,
  ReportSection,
  ReportElement,
  ReportGroup,
  ReportFilter,
  ReportParameter,
} from './types';

/**
 * Template Builder for creating reports with fluent API
 */
export class ReportTemplateBuilder {
  private template: ReportTemplate;
  private currentSection?: ReportSection;

  constructor(id: string, name: string, entityName: string, extensionId: string) {
    this.template = {
      id,
      name,
      entityName,
      extensionId,
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      sections: [],
      fields: [],
    };
  }

  /**
   * Set template description
   */
  description(description: string): this {
    this.template.description = description;
    return this;
  }

  /**
   * Set template category
   */
  category(category: string): this {
    this.template.category = category;
    return this;
  }

  /**
   * Add a field to the template
   */
  addField(id: string, label: string, dataType: string, dataSource: string): this {
    const field: ReportField = {
      id,
      name: id,
      label,
      dataType: dataType as any,
      dataSource,
      visible: true,
    };

    this.template.fields.push(field);
    return this;
  }

  /**
   * Add multiple fields
   */
  addFields(fields: Omit<ReportField, 'name'>[]): this {
    for (const field of fields) {
      this.template.fields.push({ ...field, name: field.id });
    }
    return this;
  }

  /**
   * Add a new section
   */
  addSection(id: string, name: string, type: 'header' | 'body' | 'footer' | 'detail'): this {
    this.currentSection = {
      id,
      name,
      type,
      elements: [],
    };

    this.template.sections.push(this.currentSection);
    return this;
  }

  /**
   * Add text element to current section
   */
  addText(id: string, content: string): this {
    if (!this.currentSection) {
      throw new Error('No active section. Call addSection first.');
    }

    this.currentSection.elements.push({
      id,
      type: 'text',
      content,
    });

    return this;
  }

  /**
   * Add field element to current section
   */
  addFieldElement(id: string, fieldId: string, x?: number, y?: number): this {
    if (!this.currentSection) {
      throw new Error('No active section. Call addSection first.');
    }

    const field = this.template.fields.find((f) => f.id === fieldId);
    if (!field) {
      throw new Error(`Field not found: ${fieldId}`);
    }

    this.currentSection.elements.push({
      id,
      type: 'field',
      fieldId,
      x,
      y,
    });

    return this;
  }

  /**
   * Add table element to current section
   */
  addTable(id: string, fieldIds: string[]): this {
    if (!this.currentSection) {
      throw new Error('No active section. Call addSection first.');
    }

    for (const fieldId of fieldIds) {
      const field = this.template.fields.find((f) => f.id === fieldId);
      if (!field) {
        throw new Error(`Field not found: ${fieldId}`);
      }
    }

    this.currentSection.elements.push({
      id,
      type: 'table',
      properties: { fieldIds },
    });

    return this;
  }

  /**
   * Add page number element
   */
  addPageNumber(id: string): this {
    if (!this.currentSection) {
      throw new Error('No active section. Call addSection first.');
    }

    this.currentSection.elements.push({
      id,
      type: 'page-number',
    });

    return this;
  }

  /**
   * Add date element
   */
  addDate(id: string): this {
    if (!this.currentSection) {
      throw new Error('No active section. Call addSection first.');
    }

    this.currentSection.elements.push({
      id,
      type: 'date',
    });

    return this;
  }

  /**
   * Add a group definition
   */
  addGroup(id: string, fieldId: string, subtotals?: string[]): this {
    if (!this.template.groups) {
      this.template.groups = [];
    }

    this.template.groups.push({
      id,
      name: id,
      fieldId,
      subtotals,
    });

    return this;
  }

  /**
   * Add a filter
   */
  addFilter(id: string, fieldId: string, operator: string, value: any): this {
    if (!this.template.filters) {
      this.template.filters = [];
    }

    this.template.filters.push({
      id,
      fieldId,
      operator: operator as any,
      value,
    });

    return this;
  }

  /**
   * Add a parameter for user input
   */
  addParameter(
    id: string,
    name: string,
    label: string,
    type: 'string' | 'number' | 'date' | 'select' | 'multiselect',
    options?: { label: string; value: any }[]
  ): this {
    if (!this.template.parameters) {
      this.template.parameters = [];
    }

    this.template.parameters.push({
      id,
      name,
      label,
      type,
      options,
    });

    return this;
  }

  /**
   * Set page configuration
   */
  setPageConfig(config: {
    size?: 'letter' | 'A4' | 'legal' | 'custom';
    orientation?: 'portrait' | 'landscape';
    margins?: { top: number; right: number; bottom: number; left: number };
    columnCount?: number;
  }): this {
    if (config.size) {
      this.template.pageSize = config.size;
    }
    if (config.orientation) {
      this.template.pageOrientation = config.orientation;
    }
    if (config.margins) {
      this.template.pageMargins = config.margins;
    }
    if (config.columnCount) {
      this.template.columnCount = config.columnCount;
    }

    return this;
  }

  /**
   * Enable page numbering
   */
  enablePageNumbers(): this {
    this.template.numberPages = true;
    return this;
  }

  /**
   * Enable timestamp
   */
  includeTimestamp(): this {
    this.template.includeTimestamp = true;
    return this;
  }

  /**
   * Enable repeat header on pages
   */
  repeatHeaderOnPages(): this {
    this.template.repeatHeaderOnPages = true;
    return this;
  }

  /**
   * Add sort field
   */
  addSort(fieldId: string, direction: 'asc' | 'desc' = 'asc'): this {
    if (!this.template.sortFields) {
      this.template.sortFields = [];
    }

    this.template.sortFields.push({ fieldId, direction });
    return this;
  }

  /**
   * Build and return the template
   */
  build(): ReportTemplate {
    if (this.template.sections.length === 0) {
      throw new Error('Template must have at least one section');
    }

    if (this.template.fields.length === 0) {
      throw new Error('Template must have at least one field');
    }

    this.template.updatedAt = new Date();
    return this.template;
  }

  /**
   * Build and register the template
   */
  register(registry: any): ReportTemplate {
    const template = this.build();
    registry.register({ template });
    return template;
  }
}

/**
 * Simple template preset factory
 */
export class ReportTemplatePresets {
  /**
   * Create a simple list template
   */
  static simpleList(templateId: string, name: string, entityName: string, extensionId: string, fieldIds: string[]): ReportTemplate {
    const builder = new ReportTemplateBuilder(templateId, name, entityName, extensionId);

    // Add header section
    builder
      .addSection('header', 'Report Header', 'header')
      .addText('title', name);

    // Add body with table
    builder
      .addSection('body', 'Report Body', 'body')
      .addTable('data-table', fieldIds);

    // Add footer
    builder
      .addSection('footer', 'Report Footer', 'footer')
      .addPageNumber('page-num')
      .addDate('report-date');

    return builder.build();
  }

  /**
   * Create a summary template
   */
  static summary(
    templateId: string,
    name: string,
    entityName: string,
    extensionId: string,
    summaryFields: string[]
  ): ReportTemplate {
    const builder = new ReportTemplateBuilder(templateId, name, entityName, extensionId);

    builder
      .addSection('header', 'Summary', 'header')
      .addText('title', `${name} Summary`);

    builder.addSection('body', 'Summary Data', 'body');

    for (let i = 0; i < summaryFields.length; i++) {
      builder.addFieldElement(`field-${i}`, summaryFields[i]);
    }

    return builder.build();
  }

  /**
   * Create a detailed report template
   */
  static detailed(
    templateId: string,
    name: string,
    entityName: string,
    extensionId: string,
    fieldIds: string[]
  ): ReportTemplate {
    const builder = new ReportTemplateBuilder(templateId, name, entityName, extensionId);

    builder
      .setPageConfig({
        size: 'letter',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
      })
      .enablePageNumbers()
      .includeTimestamp();

    builder
      .addSection('header', 'Header', 'header')
      .addText('title', name)
      .addDate('report-date')
      .addPageNumber('page-num');

    builder
      .addSection('body', 'Data', 'body')
      .addTable('data-table', fieldIds);

    builder
      .addSection('footer', 'Footer', 'footer')
      .addText('footer-text', 'End of Report');

    return builder.build();
  }
}
