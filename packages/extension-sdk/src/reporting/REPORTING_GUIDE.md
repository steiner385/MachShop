# Report Template Extension System Guide

## Overview

The Report Template Extension System allows extensions to create, manage, and export custom reports with:
- Template definitions with flexible layouts
- Data binding to custom entities
- Multiple export formats (PDF, Excel, CSV, JSON, HTML)
- Field-level access control
- Report caching and performance optimization
- Template validation and searching

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Creating Templates](#creating-templates)
3. [Template Components](#template-components)
4. [Data Binding](#data-binding)
5. [Rendering & Exporting](#rendering--exporting)
6. [Permissions & Access Control](#permissions--access-control)
7. [Template Presets](#template-presets)
8. [Best Practices](#best-practices)
9. [API Reference](#api-reference)

---

## Getting Started

### Basic Setup

```typescript
import {
  ReportTemplateBuilder,
  reportTemplateRegistry,
  reportRenderer,
} from '@machshop/extension-sdk/reporting';

// Create a simple report template
const template = new ReportTemplateBuilder(
  'sales-report',
  'Sales Report',
  'Order', // Entity to bind to
  'my-extension'
)
  .description('Monthly sales report')
  .category('Finance')
  .addField('id', 'Order ID', 'string', 'id')
  .addField('amount', 'Amount', 'currency', 'amount')
  .addField('date', 'Order Date', 'date', 'createdAt')
  .addSection('header', 'Report Header', 'header')
  .addText('title', 'Sales Report')
  .addSection('body', 'Sales Data', 'body')
  .addTable('sales-table', ['id', 'amount', 'date'])
  .addSection('footer', 'Footer', 'footer')
  .addPageNumber('page')
  .build();

// Register template
reportTemplateRegistry.register({ template });

// Render to PDF
const result = await reportRenderer.render(
  template,
  {
    entityData: [
      { id: '1', amount: 1000, createdAt: new Date() },
      { id: '2', amount: 2000, createdAt: new Date() },
    ],
  },
  { format: 'pdf', filename: 'sales-report.pdf' }
);
```

---

## Creating Templates

### Template Builder API

```typescript
const builder = new ReportTemplateBuilder(
  'template-id',
  'Template Name',
  'EntityName',
  'extension-id'
);

builder
  .description('Template description')
  .category('Reports')
  // Add fields
  .addField('id', 'ID', 'string', 'id')
  .addField('name', 'Name', 'string', 'name')
  .addField('amount', 'Amount', 'currency', 'amount')
  // Add sections
  .addSection('header', 'Header', 'header')
  .addText('title', 'My Report')
  .addSection('body', 'Body', 'body')
  .addTable('table', ['id', 'name', 'amount'])
  .addSection('footer', 'Footer', 'footer')
  .addDate('date')
  // Add features
  .enablePageNumbers()
  .includeTimestamp()
  .setPageConfig({
    size: 'letter',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
  });

const template = builder.build();
```

---

## Template Components

### Fields

Fields define the data structure for your report:

```typescript
builder.addField(
  'fieldId',           // Unique identifier
  'Field Label',       // Display label
  'currency',          // Data type
  'entityFieldName'    // Entity field to bind to
);

// Data types: string, number, boolean, date, currency
```

### Sections

Reports are organized into sections:

```typescript
builder.addSection(
  'section-id',
  'Section Name',
  'header' // 'header', 'body', 'footer', 'detail'
);

// Add elements to current section
.addText('text-id', 'This is header text')
.addFieldElement('field-id', 'fieldId')
.addTable('table-id', ['field1', 'field2'])
.addPageNumber('page-id')
.addDate('date-id');
```

### Filters

Add filters to narrow data:

```typescript
builder.addFilter(
  'filter-id',
  'fieldId',
  'gte',              // eq, ne, gt, gte, lt, lte, in, contains
  1000                // Filter value
);
```

### Parameters

Allow users to input filter values:

```typescript
builder.addParameter(
  'param-id',
  'startDate',
  'Start Date',
  'date'
)
.addParameter(
  'param-id-2',
  'status',
  'Status',
  'select',
  [
    { label: 'Pending', value: 'pending' },
    { label: 'Shipped', value: 'shipped' },
  ]
);
```

### Groups

Group data and calculate subtotals:

```typescript
builder.addGroup(
  'group-id',
  'categoryField',
  ['amount', 'quantity'] // Fields to subtotal
);
```

---

## Data Binding

### Bind Entity Data

```typescript
const template = reportTemplateRegistry.get('template-id');

const reportData = {
  entityData: [
    { id: '1', name: 'Product A', amount: 100 },
    { id: '2', name: 'Product B', amount: 200 },
  ],
  filters: {
    amount: { min: 50, max: 500 },
  },
  parameters: {
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-12-31'),
  },
};

const result = await reportRenderer.render(
  template,
  reportData,
  { format: 'pdf' }
);
```

### Field Expressions

Fields support aggregation:

```typescript
const field: ReportField = {
  id: 'total-sales',
  name: 'Total Sales',
  label: 'Total Sales',
  dataType: 'currency',
  dataSource: 'amount',
  aggregation: 'sum', // sum, avg, min, max, count, distinct
};
```

---

## Rendering & Exporting

### Export Formats

```typescript
// PDF export
await reportRenderer.render(template, data, {
  format: 'pdf',
  includeCharts: true,
  filename: 'report.pdf',
});

// Excel export
await reportRenderer.render(template, data, {
  format: 'excel',
  compression: true,
});

// CSV export
const csv = await reportRenderer.render(template, data, {
  format: 'csv',
});

// HTML export
const html = await reportRenderer.render(template, data, {
  format: 'html',
});

// JSON export
const json = await reportRenderer.render(template, data, {
  format: 'json',
});
```

### Caching

Improve performance with caching:

```typescript
import { reportCache } from '@machshop/extension-sdk/reporting';

// Generate cache key
const cacheKey = reportCache.generateKey(
  'template-id',
  filters,
  parameters
);

// Check cache
let result = reportCache.get(cacheKey);

if (!result) {
  // Generate report
  result = await reportRenderer.render(template, data, options);

  // Cache result (1 hour TTL)
  reportCache.set(cacheKey, result, 3600000);
}
```

---

## Permissions & Access Control

### Field-Level Permissions

```typescript
const permissions = {
  canEdit: ['admin', 'manager'], // Role IDs
  canView: ['*'], // Everyone
  canExport: ['manager', 'admin'],
  fieldAccess: {
    'sensitive-field': ['admin'],
    'normal-field': ['*'],
  },
};

reportTemplateRegistry.register({
  template,
  permissions,
});

// Check access
const hasAccess = reportTemplateRegistry.canAccess(
  'template-id',
  userId,
  'view'
);
```

---

## Template Presets

### Preset Templates

```typescript
import { ReportTemplatePresets } from '@machshop/extension-sdk/reporting';

// Simple list
const list = ReportTemplatePresets.simpleList(
  'orders-list',
  'Orders',
  'Order',
  'extension-id',
  ['id', 'amount', 'status']
);

// Summary report
const summary = ReportTemplatePresets.summary(
  'sales-summary',
  'Sales Summary',
  'Order',
  'extension-id',
  ['totalAmount', 'orderCount', 'averageValue']
);

// Detailed report
const detailed = ReportTemplatePresets.detailed(
  'orders-detailed',
  'Orders Detailed',
  'Order',
  'extension-id',
  ['id', 'customer', 'amount', 'date', 'status']
);
```

---

## Best Practices

### 1. Validate Templates

```typescript
const validation = reportTemplateRegistry.validate(template);
if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
}
```

### 2. Use Presets

Start with presets and customize:

```typescript
const template = ReportTemplatePresets.detailed(
  'my-report',
  'My Report',
  'MyEntity',
  'my-extension',
  ['field1', 'field2']
);

// Customize...
reportTemplateRegistry.register({ template });
```

### 3. Implement Permissions

Always define field-level permissions:

```typescript
reportTemplateRegistry.register({
  template,
  permissions: {
    canView: ['user', 'manager'],
    canExport: ['manager', 'admin'],
  },
});
```

### 4. Cache Reports

Cache expensive reports:

```typescript
const cacheKey = reportCache.generateKey(templateId, filters);
let report = reportCache.get(cacheKey);

if (!report) {
  report = await generateReport();
  reportCache.set(cacheKey, report);
}
```

### 5. Handle Errors

```typescript
try {
  const result = await reportRenderer.render(template, data, options);
} catch (error) {
  if (error instanceof ReportRenderingError) {
    console.error('Rendering failed:', error.message);
  } else if (error instanceof ReportValidationError) {
    console.error('Validation failed:', error.validationErrors);
  }
}
```

---

## API Reference

### ReportTemplateRegistry

```typescript
interface IReportTemplateRegistry {
  register(config: ReportTemplateConfig): void;
  unregister(templateId: string): void;
  get(templateId: string): ReportTemplate | undefined;
  list(): ReportTemplate[];
  validate(template: ReportTemplate): ReportValidationResult;
  clone(templateId: string, newName: string): ReportTemplate;
  update(templateId: string, updates: Partial<ReportTemplate>): ReportTemplate;
  canAccess(templateId: string, userId: string, action: string): boolean;
}
```

### ReportRenderer

```typescript
interface IReportRenderer {
  render(
    template: ReportTemplate,
    data: ReportDataContext,
    options: ReportExportOptions
  ): Promise<ReportRenderResult>;
}
```

### ReportTemplateBuilder

```typescript
class ReportTemplateBuilder {
  addField(id: string, label: string, dataType: string, dataSource: string): this;
  addSection(id: string, name: string, type: string): this;
  addText(id: string, content: string): this;
  addFieldElement(id: string, fieldId: string): this;
  addTable(id: string, fieldIds: string[]): this;
  addFilter(id: string, fieldId: string, operator: string, value: any): this;
  addParameter(id: string, name: string, label: string, type: string, options?: any[]): this;
  addGroup(id: string, fieldId: string, subtotals?: string[]): this;
  setPageConfig(config: any): this;
  enablePageNumbers(): this;
  includeTimestamp(): this;
  build(): ReportTemplate;
}
```

---

## Examples

### Complete Sales Report

```typescript
import {
  ReportTemplateBuilder,
  reportTemplateRegistry,
  reportRenderer,
} from '@machshop/extension-sdk/reporting';

// Create template
const template = new ReportTemplateBuilder(
  'monthly-sales',
  'Monthly Sales Report',
  'Order',
  'sales-extension'
)
  .description('Summary of monthly sales by region')
  .category('Finance')
  .addField('id', 'Order ID', 'string', 'id')
  .addField('region', 'Region', 'string', 'region')
  .addField('amount', 'Amount', 'currency', 'amount')
  .addField('date', 'Date', 'date', 'createdAt')
  // Header
  .addSection('header', 'Header', 'header')
  .addText('title', 'Monthly Sales Report')
  .addDate('report-date')
  // Summary by region
  .addSection('body', 'Sales Data', 'body')
  .addTable('sales-table', ['id', 'region', 'amount', 'date'])
  // Footer
  .addSection('footer', 'Footer', 'footer')
  .addPageNumber('page-num')
  .addText('footer-text', 'Confidential')
  // Configuration
  .setPageConfig({
    size: 'letter',
    orientation: 'landscape',
  })
  .enablePageNumbers()
  .includeTimestamp()
  .repeatHeaderOnPages();

// Register with permissions
reportTemplateRegistry.register({
  template,
  permissions: {
    canView: ['manager', 'admin'],
    canExport: ['admin'],
  },
});

// Generate report
const data = {
  entityData: [
    { id: '1', region: 'North', amount: 10000, createdAt: new Date() },
    { id: '2', region: 'South', amount: 8000, createdAt: new Date() },
    { id: '3', region: 'East', amount: 12000, createdAt: new Date() },
  ],
};

const result = await reportRenderer.render(
  template,
  data,
  {
    format: 'pdf',
    filename: 'monthly-sales.pdf',
    includeCharts: true,
  }
);

console.log('Report generated:', result.metadata);
```

---

## Support

For questions or issues with the reporting system, consult the Extension SDK documentation or contact support.
