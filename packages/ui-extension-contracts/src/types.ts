/**
 * UI Extension Contract Types
 *
 * Defines the contracts and interfaces for frontend extensions in the MachShop
 * composable extension architecture. These types ensure consistency and safety
 * when extending the UI with new components, widgets, and functionality.
 *
 * @module ui-extension-contracts/types
 */

import * as React from 'react';

/**
 * Available slots for widget extension points.
 * Slots define WHERE extensions can inject components in the UI.
 */
export enum UISlot {
  // Dashboard extension points
  DASHBOARD_WIDGETS = 'dashboard-widgets',
  DASHBOARD_CHARTS = 'dashboard-charts',
  DASHBOARD_KPI_CARDS = 'dashboard-kpi-cards',

  // Form extension points
  FORM_FIELDS = 'form-fields',
  FORM_SECTIONS = 'form-sections',
  FORM_ACTIONS = 'form-actions',

  // Table extension points
  TABLE_ACTIONS = 'table-actions',
  TABLE_COLUMNS = 'table-columns',
  TABLE_BULK_ACTIONS = 'table-bulk-actions',
  TABLE_ROW_EXPANSION = 'table-row-expansion',

  // Report extension points
  REPORT_SECTIONS = 'report-sections',
  REPORT_FILTERS = 'report-filters',
  REPORT_EXPORTS = 'report-exports',

  // Navigation extension points
  NAVIGATION_MENU_ITEMS = 'navigation-menu-items',
  NAVIGATION_BREADCRUMBS = 'navigation-breadcrumbs',

  // Page extension points
  PAGE_HEADER_ACTIONS = 'page-header-actions',
  PAGE_FOOTER_ACTIONS = 'page-footer-actions',
  PAGE_SIDEBARS = 'page-sidebars',

  // Settings/Admin extension points
  ADMIN_SETTINGS_SECTIONS = 'admin-settings-sections',
  ADMIN_CONFIGURATION_FORMS = 'admin-configuration-forms',

  // Custom extension points
  CUSTOM = 'custom'
}

/**
 * Component type categories for taxonomy and validation.
 */
export enum ComponentType {
  WIDGET = 'widget',
  FORM_FIELD = 'form-field',
  FORM_SECTION = 'form-section',
  TABLE = 'table',
  CHART = 'chart',
  DASHBOARD = 'dashboard',
  PAGE = 'page',
  LAYOUT = 'layout',
  NAVIGATION = 'navigation',
  ACTION = 'action',
  FILTER = 'filter',
  EXPORT = 'export',
  REPORT = 'report',
  CUSTOM = 'custom'
}

/**
 * Required accessibility level for components.
 * All extensions must meet at least WCAG_AA.
 */
export enum AccessibilityLevel {
  WCAG_A = 'wcag-a',
  WCAG_AA = 'wcag-aa',
  WCAG_AAA = 'wcag-aaa'
}

/**
 * Metadata for a UI component that can be extended.
 * Describes what a component does, where it can be extended, and what rules apply.
 */
export interface UIComponentContract {
  /**
   * Unique identifier for this contract (e.g., "work-order-form", "quality-dashboard")
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of the component and its purpose
   */
  description: string;

  /**
   * Component type category
   */
  type: ComponentType;

  /**
   * Version of this contract (for backward compatibility)
   */
  version: string;

  /**
   * Which slots this component supports for extensions
   */
  supportedSlots: UISlot[];

  /**
   * Minimum accessibility level required for extensions
   */
  minimumAccessibilityLevel: AccessibilityLevel;

  /**
   * Required Ant Design components that MUST be used
   * (e.g., ["Button", "Form", "Input"] to enforce Ant Design usage)
   */
  requiredComponents: string[];

  /**
   * Ant Design components that MUST NOT be used
   * (e.g., legacy components that shouldn't be used)
   */
  forbiddenComponents: string[];

  /**
   * Data interface that extensions receive when plugged into this slot
   */
  slotDataSchema: Record<UISlot, WidgetDataContract>;

  /**
   * Whether this component allows overriding
   */
  allowOverride: boolean;

  /**
   * If allowing override, the interface that overrides must implement
   */
  overrideInterface?: React.ComponentType<any>;

  /**
   * Theme tokens that can be used (whitelist to ensure design consistency)
   */
  allowedThemeTokens?: string[];

  /**
   * Custom validation rules for this component
   */
  customValidationRules?: ComponentValidationRule[];

  /**
   * Notes on best practices and expected behavior
   */
  implementationNotes?: string;

  /**
   * Extension point categories this component belongs to
   */
  categories?: string[];
}

/**
 * Data contract for a widget being injected into a slot.
 * Defines what data the slot will pass to the widget.
 */
export interface WidgetDataContract {
  /**
   * Slot identifier
   */
  slot: UISlot;

  /**
   * JSON Schema for the data object passed to widgets in this slot
   */
  schema: Record<string, any>;

  /**
   * Example data payload
   */
  example: Record<string, any>;

  /**
   * Required fields that must be present
   */
  requiredFields: string[];

  /**
   * Documentation on how to use this data
   */
  documentation?: string;
}

/**
 * Custom validation rule for a component.
 * Allows enforcing component-specific validation beyond the standard checks.
 */
export interface ComponentValidationRule {
  /**
   * Rule identifier
   */
  id: string;

  /**
   * Description of what this rule validates
   */
  description: string;

  /**
   * Validation function that returns true if valid, false otherwise
   */
  validate: (component: any) => boolean | Promise<boolean>;

  /**
   * Error message if validation fails
   */
  errorMessage: string;

  /**
   * Whether this rule must pass (true) or is a warning (false)
   */
  severity: 'error' | 'warning';
}

/**
 * A widget registered in the registry that can be injected into a slot.
 * Represents an extension's contribution to a UI slot.
 */
export interface RegisteredWidget {
  /**
   * Unique widget identifier (e.g., "custom-extension:quality-widget")
   */
  id: string;

  /**
   * Extension ID that provides this widget
   */
  extensionId: string;

  /**
   * Which slot this widget is registered for
   */
  slot: UISlot;

  /**
   * The component reference (React component)
   */
  component: React.ComponentType<any>;

  /**
   * Display order when multiple widgets are in the same slot
   */
  order?: number;

  /**
   * Optional permission required to display this widget
   */
  requiredPermission?: string;

  /**
   * Site IDs where this widget is enabled (undefined = all sites)
   */
  enabledAtSites?: string[];

  /**
   * When this widget was registered
   */
  registeredAt: Date;

  /**
   * Contract ID this widget claims to implement
   */
  implementsContract?: string;

  /**
   * Contract version this widget was tested with
   */
  contractVersion?: string;
}

/**
 * Information about a navigation menu item extension.
 * Extensions can add menu items to the navigation.
 */
export interface NavigationMenuItemContract {
  /**
   * Unique menu item identifier
   */
  id: string;

  /**
   * Display label for the menu item
   */
  label: string;

  /**
   * Icon identifier (Ant Design icon name)
   */
  icon?: string;

  /**
   * Route/path this menu item navigates to
   */
  path: string;

  /**
   * Parent menu group (if adding to existing group)
   */
  parentGroup?: string;

  /**
   * Order within parent
   */
  order?: number;

  /**
   * Permission required to view this menu item
   */
  requiredPermission?: string;

  /**
   * Whether this is for a new menu group (requires foundation tier approval)
   */
  isNewMenuGroup?: boolean;

  /**
   * Description of new menu group (if isNewMenuGroup = true)
   */
  menuGroupDescription?: string;

  /**
   * Badge count to display
   */
  badge?: number | string;

  /**
   * Whether this menu item should be hidden on small screens
   */
  hiddenOnMobile?: boolean;
}

/**
 * Form field extension contract.
 * Describes a custom form field that can be used in forms.
 */
export interface FormFieldContract {
  /**
   * Unique field type identifier (e.g., "custom-extension:multi-select")
   */
  fieldType: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of field capability
   */
  description: string;

  /**
   * React component that renders the field
   */
  component: React.ComponentType<any>;

  /**
   * JSON Schema for field value
   */
  valueSchema: Record<string, any>;

  /**
   * Default field configuration
   */
  defaultConfig: Record<string, any>;

  /**
   * Supported value types
   */
  supportedValueTypes: ('string' | 'number' | 'boolean' | 'array' | 'object')[];

  /**
   * Validation rules for this field type
   */
  validationRules?: ComponentValidationRule[];

  /**
   * Minimum accessibility level required
   */
  minimumAccessibilityLevel: AccessibilityLevel;
}

/**
 * Chart/visualization extension contract.
 * Describes a custom chart that can be displayed on dashboards and reports.
 */
export interface ChartContract {
  /**
   * Unique chart type identifier
   */
  chartType: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description of chart capability
   */
  description: string;

  /**
   * React component that renders the chart
   */
  component: React.ComponentType<any>;

  /**
   * JSON Schema for chart data format
   */
  dataSchema: Record<string, any>;

  /**
   * Example data payload
   */
  exampleData: Record<string, any>;

  /**
   * Supported configuration options
   */
  supportedOptions: Record<string, any>;

  /**
   * Required Ant Design or charting components used
   */
  usedComponents: string[];
}

/**
 * Table extension contract.
 * Describes extensions for table columns, actions, etc.
 */
export interface TableExtensionContract {
  /**
   * Extension type
   */
  extensionType: 'column' | 'action' | 'bulk-action' | 'row-expansion';

  /**
   * Unique identifier
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Description
   */
  description: string;

  /**
   * React component
   */
  component: React.ComponentType<any>;

  /**
   * Data schema for row data
   */
  rowDataSchema: Record<string, any>;

  /**
   * Required fields in row data
   */
  requiredFields: string[];
}

/**
 * Theme awareness contract.
 * Ensures components respect the design system.
 */
export interface ThemeAwarenessContract {
  /**
   * Whether component respects current theme (light/dark)
   */
  respectsTheme: boolean;

  /**
   * Theme tokens used in component styling
   */
  usedTokens: string[];

  /**
   * Whether component handles color blindness accessibility
   */
  handlesColorBlindness: boolean;

  /**
   * CSS-in-JS approach used (if any)
   */
  stylingApproach: 'css-custom-properties' | 'styled-components' | 'emotion' | 'antd-theme' | 'none';
}

/**
 * Permission-aware rendering contract.
 * Ensures components respect user roles and permissions.
 */
export interface PermissionAwarenessContract {
  /**
   * Declares what permissions the component checks
   */
  declaredPermissions: string[];

  /**
   * Whether component uses usePermission hook
   */
  usesPermissionHook: boolean;

  /**
   * Whether component gracefully hides without permission
   */
  gracefullyHidesWithoutPermission: boolean;
}

/**
 * Validation report for a component against a contract.
 */
export interface ComponentValidationReport {
  /**
   * Whether validation passed
   */
  valid: boolean;

  /**
   * List of errors (if validation failed)
   */
  errors: ValidationError[];

  /**
   * List of warnings (non-blocking issues)
   */
  warnings: ValidationWarning[];

  /**
   * Component ID being validated
   */
  componentId: string;

  /**
   * Contract ID it was validated against
   */
  contractId: string;

  /**
   * When validation occurred
   */
  validatedAt: Date;

  /**
   * Detailed validation metrics
   */
  metrics?: {
    antdComponentUsageScore: number; // 0-100
    accessibilityScore: number; // 0-100
    themeAwarenessScore: number; // 0-100
    overallScore: number; // 0-100
  };
}

/**
 * Validation error for contract violation.
 */
export interface ValidationError {
  /**
   * Error code
   */
  code: string;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Path to problematic code/config
   */
  path?: string;

  /**
   * Rule that was violated
   */
  rule: string;
}

/**
 * Validation warning for best practice violations.
 */
export interface ValidationWarning {
  /**
   * Warning code
   */
  code: string;

  /**
   * Human-readable message
   */
  message: string;

  /**
   * Path to problematic code/config
   */
  path?: string;

  /**
   * Recommendation for fixing
   */
  recommendation: string;
}

/**
 * Override declaration in extension manifest.
 * Used when extension wants to override an existing component.
 */
export interface ComponentOverrideDeclaration {
  /**
   * ID of component being overridden
   */
  overridesComponentId: string;

  /**
   * Override component implementation
   */
  component: React.ComponentType<any>;

  /**
   * Which contract this override implements
   */
  implementsContract: string;

  /**
   * Reason for override
   */
  reason: string;

  /**
   * Testing report URL or embedded test data
   */
  testingReport?: string;

  /**
   * Whether this override is scoped to specific sites
   */
  scopedToSites?: string[];

  /**
   * Fallback component if this override fails to load
   */
  fallbackComponent?: React.ComponentType<any>;
}

/**
 * Type guard functions for runtime validation.
 */

/**
 * Check if object implements UIComponentContract.
 */
export function isUIComponentContract(obj: any): obj is UIComponentContract {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string' &&
    Array.isArray(obj.supportedSlots)
  );
}

/**
 * Check if object implements RegisteredWidget.
 */
export function isRegisteredWidget(obj: any): obj is RegisteredWidget {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.extensionId === 'string' &&
    typeof obj.slot === 'string' &&
    typeof obj.component === 'function'
  );
}

/**
 * Check if object implements NavigationMenuItemContract.
 */
export function isNavigationMenuItemContract(
  obj: any
): obj is NavigationMenuItemContract {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.label === 'string' &&
    typeof obj.path === 'string'
  );
}

/**
 * Check if object implements FormFieldContract.
 */
export function isFormFieldContract(obj: any): obj is FormFieldContract {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.fieldType === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.component === 'function' &&
    Array.isArray(obj.supportedValueTypes)
  );
}

/**
 * Check if object implements ComponentValidationReport.
 */
export function isComponentValidationReport(
  obj: any
): obj is ComponentValidationReport {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.valid === 'boolean' &&
    Array.isArray(obj.errors) &&
    Array.isArray(obj.warnings) &&
    typeof obj.componentId === 'string'
  );
}
