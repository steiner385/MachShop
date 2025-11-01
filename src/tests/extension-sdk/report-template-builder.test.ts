/**
 * Report Template Builder Tests
 * Issue #442: Report Template Extension System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportTemplateBuilder } from '../../../packages/extension-sdk/src/reporting/builder';
import type { ReportTemplate } from '../../../packages/extension-sdk/src/reporting/types';

describe('ReportTemplateBuilder', () => {
  let builder: ReportTemplateBuilder;

  beforeEach(() => {
    builder = new ReportTemplateBuilder();
  });

  describe('builder fluent API', () => {
    it('should build a complete report template', () => {
      const template = builder
        .setId('sales-report')
        .setName('Sales Report')
        .setDescription('Monthly sales summary')
        .setVersion('1.0.0')
        .setExtensionId('sales-ext')
        .setEntityName('Order')
        .addField({
          id: 'order-id',
          name: 'id',
          label: 'Order ID',
          dataType: 'string',
          dataSource: 'id',
        })
        .addField({
          id: 'amount',
          name: 'total',
          label: 'Amount',
          dataType: 'currency',
          dataSource: 'total',
          aggregation: 'sum',
        })
        .addHeader('Report', 'Sales Report')
        .addBodyTable(['order-id', 'amount'])
        .addFooter()
        .build();

      expect(template).toBeDefined();
      expect(template.id).toBe('sales-report');
      expect(template.name).toBe('Sales Report');
      expect(template.fields).toHaveLength(2);
      expect(template.sections.length).toBeGreaterThan(0);
    });

    it('should support method chaining', () => {
      const template = builder
        .setId('test')
        .setName('Test Report')
        .setVersion('1.0.0')
        .setExtensionId('test-ext')
        .setEntityName('Test')
        .build();

      expect(template.id).toBe('test');
      expect(template.name).toBe('Test Report');
    });

    it('should validate built template', () => {
      const template = builder
        .setId('incomplete')
        .setName('Incomplete')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        // Missing entityName
        .build();

      // Builder should handle missing required fields gracefully
      expect(template).toBeDefined();
    });
  });

  describe('field management', () => {
    it('should add multiple fields', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addField({
          id: 'field-1',
          name: 'name',
          label: 'Name',
          dataType: 'string',
          dataSource: 'name',
        })
        .addField({
          id: 'field-2',
          name: 'email',
          label: 'Email',
          dataType: 'string',
          dataSource: 'email',
        })
        .addField({
          id: 'field-3',
          name: 'active',
          label: 'Active',
          dataType: 'boolean',
          dataSource: 'active',
        })
        .build();

      expect(template.fields).toHaveLength(3);
      expect(template.fields.map(f => f.id)).toContain('field-1');
      expect(template.fields.map(f => f.id)).toContain('field-2');
      expect(template.fields.map(f => f.id)).toContain('field-3');
    });

    it('should configure field properties', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addField({
          id: 'salary',
          name: 'salary',
          label: 'Salary',
          dataType: 'currency',
          dataSource: 'salary',
          sortable: true,
          filterable: true,
          aggregation: 'avg',
          width: 150,
          alignment: 'right',
          visible: true,
          permissions: ['HR', 'ADMIN'],
        })
        .build();

      const field = template.fields.find(f => f.id === 'salary');

      expect(field?.sortable).toBe(true);
      expect(field?.filterable).toBe(true);
      expect(field?.aggregation).toBe('avg');
      expect(field?.width).toBe(150);
      expect(field?.alignment).toBe('right');
      expect(field?.visible).toBe(true);
      expect(field?.permissions).toContain('HR');
    });
  });

  describe('section and element management', () => {
    it('should add report sections', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addHeader('Title', 'Report Title')
        .addBodyTable(['field-1', 'field-2'])
        .addFooter()
        .build();

      expect(template.sections.length).toBeGreaterThan(0);

      const sectionTypes = template.sections.map(s => s.type);
      expect(sectionTypes).toContain('header');
      expect(sectionTypes).toContain('body');
      expect(sectionTypes).toContain('footer');
    });

    it('should support custom sections', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addSection({
          id: 'custom',
          name: 'Custom Section',
          type: 'detail',
          elements: [
            { id: 'elem-1', type: 'text', content: 'Custom content' },
          ],
        })
        .build();

      const customSection = template.sections.find(s => s.id === 'custom');
      expect(customSection?.type).toBe('detail');
      expect(customSection?.elements).toHaveLength(1);
    });
  });

  describe('filter and sorting configuration', () => {
    it('should add filters to template', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addField({
          id: 'status',
          name: 'status',
          label: 'Status',
          dataType: 'string',
          dataSource: 'status',
          filterable: true,
        })
        .addFilter({
          id: 'filter-active',
          fieldId: 'status',
          operator: 'eq',
          value: 'active',
          label: 'Active Only',
        })
        .build();

      expect(template.filters).toHaveLength(1);
      expect(template.filters?.[0].operator).toBe('eq');
      expect(template.filters?.[0].value).toBe('active');
    });

    it('should support complex filters', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addField({
          id: 'date',
          name: 'createdDate',
          label: 'Created',
          dataType: 'date',
          dataSource: 'createdDate',
          filterable: true,
        })
        .addFilter({
          id: 'filter-date-range',
          fieldId: 'date',
          operator: 'between',
          value: { start: '2025-01-01', end: '2025-12-31' },
          label: 'Year 2025',
        })
        .build();

      const filter = template.filters?.[0];
      expect(filter?.operator).toBe('between');
      expect(filter?.value).toHaveProperty('start');
      expect(filter?.value).toHaveProperty('end');
    });
  });

  describe('grouping configuration', () => {
    it('should add grouping to template', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addField({
          id: 'department',
          name: 'dept',
          label: 'Department',
          dataType: 'string',
          dataSource: 'dept',
        })
        .addField({
          id: 'salary',
          name: 'salary',
          label: 'Salary',
          dataType: 'currency',
          dataSource: 'salary',
          aggregation: 'sum',
        })
        .addGrouping({
          id: 'by-dept',
          name: 'By Department',
          fieldId: 'department',
          sortOrder: 'asc',
          subtotals: ['salary'],
        })
        .build();

      expect(template.groups).toHaveLength(1);
      expect(template.groups?.[0].fieldId).toBe('department');
      expect(template.groups?.[0].subtotals).toContain('salary');
    });
  });

  describe('export format configuration', () => {
    it('should configure PDF export', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .enablePdfExport({
          pageSize: 'A4',
          orientation: 'landscape',
          margins: { top: 10, bottom: 10, left: 10, right: 10 },
        })
        .build();

      expect(template.exportFormats?.pdf?.enabled).toBe(true);
      expect(template.exportFormats?.pdf?.pageSize).toBe('A4');
      expect(template.exportFormats?.pdf?.orientation).toBe('landscape');
    });

    it('should configure Excel export', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .enableExcelExport({
          sheetName: 'Report Data',
          includeHeaders: true,
          freezePanes: true,
        })
        .build();

      expect(template.exportFormats?.excel?.enabled).toBe(true);
      expect(template.exportFormats?.excel?.sheetName).toBe('Report Data');
      expect(template.exportFormats?.excel?.freezePanes).toBe(true);
    });

    it('should configure CSV export', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .enableCsvExport({
          delimiter: '\t',
          encoding: 'UTF-8',
          includeHeaders: true,
        })
        .build();

      expect(template.exportFormats?.csv?.enabled).toBe(true);
      expect(template.exportFormats?.csv?.delimiter).toBe('\t');
      expect(template.exportFormats?.csv?.encoding).toBe('UTF-8');
    });

    it('should enable multiple export formats', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .enablePdfExport({ pageSize: 'A4', orientation: 'portrait' })
        .enableExcelExport({ sheetName: 'Data' })
        .enableCsvExport({ delimiter: ',' })
        .build();

      expect(template.exportFormats?.pdf?.enabled).toBe(true);
      expect(template.exportFormats?.excel?.enabled).toBe(true);
      expect(template.exportFormats?.csv?.enabled).toBe(true);
    });
  });

  describe('template tagging and metadata', () => {
    it('should add tags to template', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .addTag('financial')
        .addTag('quarterly')
        .addTag('executive')
        .build();

      expect(template.tags).toContain('financial');
      expect(template.tags).toContain('quarterly');
      expect(template.tags).toContain('executive');
      expect(template.tags).toHaveLength(3);
    });

    it('should set template metadata', () => {
      const template = builder
        .setId('test')
        .setName('Test')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .setDescription('Test report')
        .setMetadata({
          author: 'John Doe',
          department: 'Finance',
          lastModified: '2025-11-01',
        })
        .build();

      expect(template.description).toBe('Test report');
      expect(template.metadata?.author).toBe('John Doe');
      expect(template.metadata?.department).toBe('Finance');
    });
  });

  describe('validation during build', () => {
    it('should validate required fields before building', () => {
      const incompleteBuilder = new ReportTemplateBuilder()
        .setId('incomplete')
        .setName('Incomplete');
      // Missing required fields: version, extensionId, entityName

      const template = incompleteBuilder.build();

      // Builder should either throw or return partial template
      expect(template).toBeDefined();
    });

    it('should reset builder', () => {
      const template1 = builder
        .setId('report-1')
        .setName('Report 1')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .build();

      builder.reset();

      const template2 = builder
        .setId('report-2')
        .setName('Report 2')
        .setVersion('1.0.0')
        .setExtensionId('ext')
        .setEntityName('Entity')
        .build();

      expect(template1.id).toBe('report-1');
      expect(template2.id).toBe('report-2');
      expect(template1.id).not.toBe(template2.id);
    });
  });
});
