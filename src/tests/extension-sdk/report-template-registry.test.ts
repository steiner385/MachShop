/**
 * Report Template Registry Tests
 * Issue #442: Report Template Extension System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ReportTemplateRegistry } from '../../../packages/extension-sdk/src/reporting/registry';
import type {
  ReportTemplate,
  ReportField,
  ReportSection,
  ReportFilter,
} from '../../../packages/extension-sdk/src/reporting/types';

describe('ReportTemplateRegistry', () => {
  let registry: ReportTemplateRegistry;

  beforeEach(() => {
    registry = new ReportTemplateRegistry();
  });

  describe('template registration', () => {
    it('should register a report template', () => {
      const template: ReportTemplate = {
        id: 'sales-report',
        name: 'Sales Report',
        description: 'Monthly sales summary',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Order',
        fields: [
          {
            id: 'order-id',
            name: 'id',
            label: 'Order ID',
            dataType: 'string',
            dataSource: 'id',
          },
          {
            id: 'amount',
            name: 'total',
            label: 'Amount',
            dataType: 'currency',
            dataSource: 'total',
            aggregation: 'sum',
          },
        ],
        sections: [
          {
            id: 'header',
            name: 'Header',
            type: 'header',
            elements: [
              { id: 'title', type: 'text', content: 'Sales Report' },
            ],
          },
          {
            id: 'body',
            name: 'Body',
            type: 'body',
            elements: [{ id: 'table', type: 'table', properties: { columns: ['order-id', 'amount'] } }],
          },
        ],
        tags: ['sales', 'monthly'],
      };

      registry.register(template);
      const retrieved = registry.get('sales-report');

      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Sales Report');
      expect(retrieved?.fields).toHaveLength(2);
    });

    it('should list all registered templates', () => {
      const template1: ReportTemplate = {
        id: 'report-1',
        name: 'Report 1',
        version: '1.0.0',
        extensionId: 'ext-1',
        entityName: 'Entity1',
        fields: [],
        sections: [],
      };

      const template2: ReportTemplate = {
        id: 'report-2',
        name: 'Report 2',
        version: '1.0.0',
        extensionId: 'ext-2',
        entityName: 'Entity2',
        fields: [],
        sections: [],
      };

      registry.register(template1);
      registry.register(template2);

      const templates = registry.list();

      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.id)).toContain('report-1');
      expect(templates.map(t => t.id)).toContain('report-2');
    });

    it('should update an existing template', () => {
      const template: ReportTemplate = {
        id: 'update-test',
        name: 'Original Name',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
      };

      registry.register(template);

      const updated = {
        ...template,
        name: 'Updated Name',
        version: '1.1.0',
      };

      registry.register(updated);

      const retrieved = registry.get('update-test');
      expect(retrieved?.name).toBe('Updated Name');
      expect(retrieved?.version).toBe('1.1.0');
    });

    it('should unregister a template', () => {
      const template: ReportTemplate = {
        id: 'delete-test',
        name: 'To Delete',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
      };

      registry.register(template);
      expect(registry.get('delete-test')).toBeDefined();

      registry.unregister('delete-test');
      expect(registry.get('delete-test')).toBeUndefined();
    });

    it('should find templates by extension', () => {
      const template1: ReportTemplate = {
        id: 'ext-report-1',
        name: 'Report 1',
        version: '1.0.0',
        extensionId: 'my-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
      };

      const template2: ReportTemplate = {
        id: 'ext-report-2',
        name: 'Report 2',
        version: '1.0.0',
        extensionId: 'other-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
      };

      registry.register(template1);
      registry.register(template2);

      const templates = registry.getByExtension('my-ext');

      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('ext-report-1');
    });

    it('should find templates by entity', () => {
      const template1: ReportTemplate = {
        id: 'entity-report-1',
        name: 'Order Report',
        version: '1.0.0',
        extensionId: 'ext',
        entityName: 'Order',
        fields: [],
        sections: [],
      };

      const template2: ReportTemplate = {
        id: 'entity-report-2',
        name: 'Customer Report',
        version: '1.0.0',
        extensionId: 'ext',
        entityName: 'Customer',
        fields: [],
        sections: [],
      };

      registry.register(template1);
      registry.register(template2);

      const templates = registry.getByEntity('Order');

      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('entity-report-1');
    });

    it('should find templates by tag', () => {
      const template1: ReportTemplate = {
        id: 'tag-report-1',
        name: 'Report 1',
        version: '1.0.0',
        extensionId: 'ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
        tags: ['financial', 'quarterly'],
      };

      const template2: ReportTemplate = {
        id: 'tag-report-2',
        name: 'Report 2',
        version: '1.0.0',
        extensionId: 'ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
        tags: ['operational'],
      };

      registry.register(template1);
      registry.register(template2);

      const templates = registry.searchByTag('financial');

      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('tag-report-1');
    });
  });

  describe('template validation', () => {
    it('should validate template structure', () => {
      const template: ReportTemplate = {
        id: 'valid-template',
        name: 'Valid Report',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [
          {
            id: 'field-1',
            name: 'fieldName',
            label: 'Field Label',
            dataType: 'string',
            dataSource: 'fieldName',
          },
        ],
        sections: [
          {
            id: 'section-1',
            name: 'Section',
            type: 'body',
            elements: [{ id: 'elem-1', type: 'field', fieldId: 'field-1' }],
          },
        ],
      };

      const result = registry.validate(template);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid field references', () => {
      const template: ReportTemplate = {
        id: 'invalid-template',
        name: 'Invalid Report',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [
          {
            id: 'field-1',
            name: 'fieldName',
            label: 'Field',
            dataType: 'string',
            dataSource: 'fieldName',
          },
        ],
        sections: [
          {
            id: 'section-1',
            name: 'Section',
            type: 'body',
            elements: [{ id: 'elem-1', type: 'field', fieldId: 'nonexistent-field' }],
          },
        ],
      };

      const result = registry.validate(template);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate required fields', () => {
      const invalidTemplate: any = {
        id: 'missing-fields',
        // missing name
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
      };

      const result = registry.validate(invalidTemplate);

      expect(result.valid).toBe(false);
    });
  });

  describe('field-level access control', () => {
    it('should enforce field visibility', () => {
      const template: ReportTemplate = {
        id: 'access-control-test',
        name: 'Access Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [
          {
            id: 'public-field',
            name: 'publicData',
            label: 'Public',
            dataType: 'string',
            dataSource: 'publicData',
            visible: true,
          },
          {
            id: 'private-field',
            name: 'privateData',
            label: 'Private',
            dataType: 'string',
            dataSource: 'privateData',
            visible: false,
          },
        ],
        sections: [],
      };

      registry.register(template);
      const retrieved = registry.get('access-control-test');

      const publicField = retrieved?.fields.find(f => f.id === 'public-field');
      const privateField = retrieved?.fields.find(f => f.id === 'private-field');

      expect(publicField?.visible).toBe(true);
      expect(privateField?.visible).toBe(false);
    });

    it('should support field-level permissions', () => {
      const template: ReportTemplate = {
        id: 'permissions-test',
        name: 'Permissions Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [
          {
            id: 'salary-field',
            name: 'salary',
            label: 'Salary',
            dataType: 'currency',
            dataSource: 'salary',
            permissions: ['HR', 'ADMIN'],
          },
        ],
        sections: [],
      };

      registry.register(template);
      const retrieved = registry.get('permissions-test');
      const salaryField = retrieved?.fields.find(f => f.id === 'salary-field');

      expect(salaryField?.permissions).toContain('HR');
      expect(salaryField?.permissions).toContain('ADMIN');
    });
  });

  describe('report sections and elements', () => {
    it('should manage report sections', () => {
      const template: ReportTemplate = {
        id: 'sections-test',
        name: 'Sections Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [
          {
            id: 'header',
            name: 'Header',
            type: 'header',
            elements: [{ id: 'title', type: 'text', content: 'Report Title' }],
          },
          {
            id: 'body',
            name: 'Body',
            type: 'body',
            elements: [{ id: 'table', type: 'table' }],
          },
          {
            id: 'footer',
            name: 'Footer',
            type: 'footer',
            elements: [
              { id: 'page-num', type: 'page-number' },
              { id: 'date', type: 'date' },
            ],
          },
        ],
      };

      registry.register(template);
      const retrieved = registry.get('sections-test');

      expect(retrieved?.sections).toHaveLength(3);
      expect(retrieved?.sections.map(s => s.type)).toContain('header');
      expect(retrieved?.sections.map(s => s.type)).toContain('body');
      expect(retrieved?.sections.map(s => s.type)).toContain('footer');
    });

    it('should support conditional styling', () => {
      const field: ReportField = {
        id: 'conditional-field',
        name: 'status',
        label: 'Status',
        dataType: 'string',
        dataSource: 'status',
        conditional: {
          expression: 'status === "error"',
          trueStyle: {
            backgroundColor: '#ff0000',
            textColor: '#ffffff',
            fontWeight: 'bold',
          },
          falseStyle: {
            backgroundColor: '#00ff00',
            textColor: '#000000',
          },
        },
      };

      const template: ReportTemplate = {
        id: 'conditional-test',
        name: 'Conditional Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [field],
        sections: [],
      };

      registry.register(template);
      const retrieved = registry.get('conditional-test');
      const retrievedField = retrieved?.fields.find(f => f.id === 'conditional-field');

      expect(retrievedField?.conditional).toBeDefined();
      expect(retrievedField?.conditional?.expression).toBe('status === "error"');
      expect(retrievedField?.conditional?.trueStyle?.backgroundColor).toBe('#ff0000');
    });
  });

  describe('aggregation and grouping', () => {
    it('should support field aggregations', () => {
      const template: ReportTemplate = {
        id: 'aggregation-test',
        name: 'Aggregation Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Order',
        fields: [
          {
            id: 'quantity',
            name: 'qty',
            label: 'Quantity',
            dataType: 'number',
            dataSource: 'quantity',
            aggregation: 'sum',
          },
          {
            id: 'price',
            name: 'unitPrice',
            label: 'Unit Price',
            dataType: 'currency',
            dataSource: 'unitPrice',
            aggregation: 'avg',
          },
        ],
        sections: [],
      };

      registry.register(template);
      const retrieved = registry.get('aggregation-test');

      const quantityField = retrieved?.fields.find(f => f.id === 'quantity');
      const priceField = retrieved?.fields.find(f => f.id === 'price');

      expect(quantityField?.aggregation).toBe('sum');
      expect(priceField?.aggregation).toBe('avg');
    });

    it('should support grouping', () => {
      const template: ReportTemplate = {
        id: 'grouping-test',
        name: 'Grouping Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Order',
        fields: [
          { id: 'region', name: 'region', label: 'Region', dataType: 'string', dataSource: 'region' },
          { id: 'sales', name: 'amount', label: 'Sales', dataType: 'currency', dataSource: 'amount', aggregation: 'sum' },
        ],
        sections: [],
        groups: [
          {
            id: 'group-by-region',
            name: 'Region Grouping',
            fieldId: 'region',
            sortOrder: 'asc',
            subtotals: ['sales'],
          },
        ],
      };

      registry.register(template);
      const retrieved = registry.get('grouping-test');

      expect(retrieved?.groups).toHaveLength(1);
      expect(retrieved?.groups?.[0].fieldId).toBe('region');
      expect(retrieved?.groups?.[0].subtotals).toContain('sales');
    });
  });

  describe('filtering and sorting', () => {
    it('should support report filters', () => {
      const filter: ReportFilter = {
        id: 'filter-1',
        fieldId: 'status',
        operator: 'eq',
        value: 'active',
        label: 'Active Orders Only',
      };

      const template: ReportTemplate = {
        id: 'filter-test',
        name: 'Filter Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Order',
        fields: [
          { id: 'status', name: 'status', label: 'Status', dataType: 'string', dataSource: 'status', filterable: true },
        ],
        sections: [],
        filters: [filter],
      };

      registry.register(template);
      const retrieved = registry.get('filter-test');

      expect(retrieved?.filters).toHaveLength(1);
      expect(retrieved?.filters?.[0].operator).toBe('eq');
      expect(retrieved?.filters?.[0].value).toBe('active');
    });

    it('should support sortable fields', () => {
      const template: ReportTemplate = {
        id: 'sort-test',
        name: 'Sort Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Order',
        fields: [
          { id: 'date', name: 'orderDate', label: 'Date', dataType: 'date', dataSource: 'orderDate', sortable: true },
          { id: 'amount', name: 'total', label: 'Amount', dataType: 'currency', dataSource: 'total', sortable: true },
        ],
        sections: [],
      };

      registry.register(template);
      const retrieved = registry.get('sort-test');

      const sortableFields = retrieved?.fields.filter(f => f.sortable);
      expect(sortableFields).toHaveLength(2);
    });
  });

  describe('export configuration', () => {
    it('should configure PDF export', () => {
      const template: ReportTemplate = {
        id: 'pdf-export-test',
        name: 'PDF Export Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
        exportFormats: {
          pdf: {
            enabled: true,
            pageSize: 'A4',
            orientation: 'portrait',
            margins: { top: 10, bottom: 10, left: 10, right: 10 },
          },
        },
      };

      registry.register(template);
      const retrieved = registry.get('pdf-export-test');

      expect(retrieved?.exportFormats?.pdf?.enabled).toBe(true);
      expect(retrieved?.exportFormats?.pdf?.pageSize).toBe('A4');
      expect(retrieved?.exportFormats?.pdf?.orientation).toBe('portrait');
    });

    it('should configure Excel export', () => {
      const template: ReportTemplate = {
        id: 'excel-export-test',
        name: 'Excel Export Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
        exportFormats: {
          excel: {
            enabled: true,
            sheetName: 'Report Data',
            includeHeaders: true,
            freezePanes: true,
          },
        },
      };

      registry.register(template);
      const retrieved = registry.get('excel-export-test');

      expect(retrieved?.exportFormats?.excel?.enabled).toBe(true);
      expect(retrieved?.exportFormats?.excel?.sheetName).toBe('Report Data');
      expect(retrieved?.exportFormats?.excel?.freezePanes).toBe(true);
    });

    it('should configure CSV export', () => {
      const template: ReportTemplate = {
        id: 'csv-export-test',
        name: 'CSV Export Test',
        version: '1.0.0',
        extensionId: 'test-ext',
        entityName: 'Entity',
        fields: [],
        sections: [],
        exportFormats: {
          csv: {
            enabled: true,
            delimiter: ',',
            encoding: 'UTF-8',
            includeHeaders: true,
          },
        },
      };

      registry.register(template);
      const retrieved = registry.get('csv-export-test');

      expect(retrieved?.exportFormats?.csv?.enabled).toBe(true);
      expect(retrieved?.exportFormats?.csv?.delimiter).toBe(',');
      expect(retrieved?.exportFormats?.csv?.encoding).toBe('UTF-8');
    });
  });
});
