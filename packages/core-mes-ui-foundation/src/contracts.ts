/**
 * Core MES UI Foundation Component Contracts
 *
 * Defines the component contracts for all core MES UI capabilities.
 * These contracts ensure consistent interfaces and validate that extensions
 * can safely integrate with core MES components.
 *
 * @module core-mes-ui-foundation/contracts
 */

// Type-only import to avoid module resolution issues
type UIComponentContract = any;

/**
 * Main Layout Contract
 */
export const mainLayoutContract: UIComponentContract = {
  id: 'main-layout-contract',
  name: 'Main Layout',
  description:
    'Master layout component providing header, sidebar, and content area. Cannot be overridden.',
  type: 'layout',
  version: '2.0.0',
  supportedSlots: [],
  minimumAccessibilityLevel: 'wcag-aa',
  requiredComponents: ['Layout', 'Sider', 'Button', 'Menu'],
  forbiddenComponents: [],
  slotDataSchema: {},
  allowOverride: false,
};

/**
 * Dashboard Widget Contract
 */
export const dashboardWidgetContract: UIComponentContract = {
  id: 'dashboard-widget-contract',
  name: 'Dashboard Widget',
  description: 'Widget for dashboard display with KPI cards and charts',
  type: 'widget',
  version: '2.0.0',
  supportedSlots: ['dashboard-widgets'],
  minimumAccessibilityLevel: 'wcag-aa',
  requiredComponents: ['Card', 'Row', 'Col', 'Button'],
  forbiddenComponents: [],
  slotDataSchema: {
    'dashboard-widgets': {
      slot: 'dashboard-widgets',
      schema: {
        type: 'object',
        properties: {
          siteId: { type: 'string' },
          userPermissions: { type: 'array', items: { type: 'string' } },
          theme: { type: 'object' },
          refreshInterval: { type: 'number' },
        },
        required: ['siteId'],
      },
      example: {
        siteId: 'site-123',
        userPermissions: ['dashboard:view'],
        theme: { mode: 'light' },
        refreshInterval: 30000,
      },
      requiredFields: ['siteId'],
    },
  },
  allowOverride: false,
};

/**
 * Dashboard Chart Contract
 */
export const dashboardChartContract: UIComponentContract = {
  id: 'dashboard-chart-contract',
  name: 'Dashboard Chart',
  description: 'Chart or visualization for dashboard metrics',
  type: 'chart',
  version: '2.0.0',
  supportedSlots: ['dashboard-charts'],
  minimumAccessibilityLevel: 'wcag-aa',
  requiredComponents: [],
  forbiddenComponents: [],
  slotDataSchema: {
    'dashboard-charts': {
      slot: 'dashboard-charts',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          data: { type: 'array' },
          timeRange: { type: 'string' },
          metrics: { type: 'array', items: { type: 'string' } },
        },
        required: ['data'],
      },
      example: {
        title: 'Quality Metrics',
        data: [],
        timeRange: '30d',
        metrics: ['pass-rate', 'defect-count'],
      },
      requiredFields: ['data'],
    },
  },
  allowOverride: false,
};

/**
 * Work Order Form Contract
 */
export const workOrderFormContract: UIComponentContract = {
  id: 'work-order-form-contract',
  name: 'Work Order Form',
  description: 'Form for work order creation and editing',
  type: 'form-section',
  version: '2.0.0',
  supportedSlots: ['form-sections', 'form-fields'],
  minimumAccessibilityLevel: 'wcag-aa',
  requiredComponents: ['Form', 'Input', 'Select', 'Button', 'DatePicker'],
  forbiddenComponents: [],
  slotDataSchema: {
    'form-sections': {
      slot: 'form-sections',
      schema: {
        type: 'object',
        properties: {
          mode: { enum: ['create', 'edit', 'view'] },
          workOrderId: { type: 'string' },
          workOrder: { type: 'object' },
          onSubmit: { type: 'function' },
          onCancel: { type: 'function' },
        },
        required: ['mode'],
      },
      example: {
        mode: 'create',
        workOrder: {},
      },
      requiredFields: ['mode'],
    },
    'form-fields': {
      slot: 'form-fields',
      schema: {
        type: 'object',
        properties: {
          fieldName: { type: 'string' },
          fieldLabel: { type: 'string' },
          required: { type: 'boolean' },
        },
      },
      example: {
        fieldName: 'partNumber',
        fieldLabel: 'Part Number',
        required: true,
      },
      requiredFields: ['fieldName'],
    },
  },
  allowOverride: true,
};

/**
 * Data Table Contract
 */
export const dataTableContract: UIComponentContract = {
  id: 'data-table-contract',
  name: 'Data Table',
  description: 'Table for displaying and managing data',
  type: 'table',
  version: '2.0.0',
  supportedSlots: ['table-columns', 'table-actions'],
  minimumAccessibilityLevel: 'wcag-aa',
  requiredComponents: ['Table', 'Button'],
  forbiddenComponents: [],
  slotDataSchema: {
    'table-columns': {
      slot: 'table-columns',
      schema: {
        type: 'object',
        properties: {
          columnKey: { type: 'string' },
          columnTitle: { type: 'string' },
          dataType: { type: 'string' },
        },
        required: ['columnKey', 'columnTitle'],
      },
      example: {
        columnKey: 'partNumber',
        columnTitle: 'Part Number',
        dataType: 'string',
      },
      requiredFields: ['columnKey'],
    },
    'table-actions': {
      slot: 'table-actions',
      schema: {
        type: 'object',
        properties: {
          actionId: { type: 'string' },
          actionLabel: { type: 'string' },
          actionType: { enum: ['edit', 'delete', 'view', 'custom'] },
          requiredPermission: { type: 'string' },
        },
        required: ['actionId', 'actionLabel'],
      },
      example: {
        actionId: 'edit',
        actionLabel: 'Edit',
        actionType: 'edit',
      },
      requiredFields: ['actionId'],
    },
  },
  allowOverride: false,
};

/**
 * Export all contracts as an array
 */
export const coreUIContracts: UIComponentContract[] = [
  mainLayoutContract,
  dashboardWidgetContract,
  dashboardChartContract,
  workOrderFormContract,
  dataTableContract,
];

/**
 * Map of contract IDs to contracts for easy lookup
 */
export const contractMap: Record<string, UIComponentContract> = {
  'main-layout': mainLayoutContract,
  'dashboard-widget': dashboardWidgetContract,
  'dashboard-chart': dashboardChartContract,
  'work-order-form': workOrderFormContract,
  'data-table': dataTableContract,
};
