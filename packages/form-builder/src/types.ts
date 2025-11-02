/**
 * Type Definitions for Form Builder Core
 * Comprehensive types for field types, validation, and layout system
 */

// ============================================================================
// Field Types
// ============================================================================

/**
 * Base field type enum
 */
export enum FieldType {
  // Text fields
  TEXT = 'text',
  TEXTAREA = 'textarea',
  RICH_TEXT = 'rich_text',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',

  // Number fields
  NUMBER = 'number',
  SLIDER = 'slider',
  RATING = 'rating',

  // Date/Time fields
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',

  // Selection fields
  SELECT = 'select',
  MULTI_SELECT = 'multi_select',
  RADIO = 'radio',
  CHECKBOX = 'checkbox',
  TOGGLE = 'toggle',

  // Complex fields
  FILE_UPLOAD = 'file_upload',
  IMAGE = 'image',
  SIGNATURE = 'signature',
  AUTOCOMPLETE = 'autocomplete',
  COLOR_PICKER = 'color_picker',

  // Layout fields
  SECTION = 'section',
  DIVIDER = 'divider',
  HEADING = 'heading',
}

/**
 * Validation rule type
 */
export enum ValidationType {
  REQUIRED = 'required',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  PATTERN = 'pattern',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',
  MIN_VALUE = 'min_value',
  MAX_VALUE = 'max_value',
  CUSTOM = 'custom',
  CROSS_FIELD = 'cross_field',
  CONDITIONAL = 'conditional',
}

/**
 * Layout type
 */
export enum LayoutType {
  SINGLE_COLUMN = 'single_column',
  TWO_COLUMN = 'two_column',
  THREE_COLUMN = 'three_column',
  TABS = 'tabs',
  ACCORDION = 'accordion',
  WIZARD = 'wizard',
  GRID = 'grid',
}

/**
 * Field visibility condition operator
 */
export enum VisibilityOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  CONTAINS = 'contains',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  IS_TRUE = 'is_true',
  IS_FALSE = 'is_false',
  IN_ARRAY = 'in_array',
  BETWEEN = 'between',
}

// ============================================================================
// Field Configuration
// ============================================================================

/**
 * Option for select/radio/checkbox fields
 */
export interface FieldOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  icon?: string;
}

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: ValidationType;
  value?: unknown; // For min/max, pattern, etc.
  message?: string; // Custom error message
  async?: boolean; // For custom validation
}

/**
 * Cross-field validation rule
 */
export interface CrossFieldValidation {
  type: 'match' | 'conditional' | 'custom';
  fields: string[]; // Field IDs to validate together
  rule: ValidationRule;
  message: string;
}

/**
 * Conditional validation rule
 */
export interface ConditionalValidation {
  condition: VisibilityCondition;
  rules: ValidationRule[];
}

/**
 * Visibility condition for conditional visibility
 */
export interface VisibilityCondition {
  fieldId: string;
  operator: VisibilityOperator;
  value: unknown;
  logicalOperator?: 'AND' | 'OR'; // For multiple conditions
}

/**
 * Field value change handler
 */
export interface FieldChangeHandler {
  onchange?: (value: unknown) => void;
  onBlur?: (value: unknown) => void;
  onFocus?: () => void;
}

/**
 * File upload configuration
 */
export interface FileUploadConfig {
  maxSize?: number; // In bytes
  acceptedTypes?: string[]; // MIME types
  multiple?: boolean;
  maxFiles?: number;
  allowedExtensions?: string[];
}

/**
 * Base field configuration
 */
export interface FieldConfig {
  id: string;
  type: FieldType;
  name: string;
  label?: string;
  placeholder?: string;
  helpText?: string;
  description?: string;

  // Display
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  className?: string;

  // Validation
  validationRules?: ValidationRule[];
  crossFieldValidations?: CrossFieldValidation[];
  conditionalValidations?: ConditionalValidation[];

  // Default/Initial value
  defaultValue?: unknown;

  // Visibility
  visibilityCondition?: VisibilityCondition;

  // Options (for select, radio, checkbox)
  options?: FieldOption[];

  // Specific configurations
  fileUploadConfig?: FileUploadConfig;
  minValue?: number;
  maxValue?: number;
  step?: number;
  pattern?: string;
  rows?: number; // For textarea
  richTextOptions?: Record<string, unknown>; // For rich text editor

  // Autocomplete
  autoCompleteSource?: 'static' | 'dynamic' | 'api';
  autoCompleteUrl?: string;
  autoCompleteOptions?: FieldOption[];

  // Metadata
  order?: number;
  helpLink?: string;
  tooltip?: string;
  icon?: string;

  // Handlers
  onChange?: (value: unknown) => void;
  onBlur?: (value: unknown) => void;
  onFocus?: () => void;

  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
  ariaRequired?: boolean;
}

/**
 * Section field configuration
 */
export interface SectionFieldConfig extends FieldConfig {
  type: FieldType.SECTION;
  title?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  columns?: number;
  children?: string[]; // IDs of child fields
}

/**
 * Heading field configuration
 */
export interface HeadingFieldConfig extends FieldConfig {
  type: FieldType.HEADING;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  text?: string;
}

/**
 * Divider field configuration
 */
export interface DividerFieldConfig extends FieldConfig {
  type: FieldType.DIVIDER;
  variant?: 'solid' | 'dashed' | 'dotted';
  spacing?: 'small' | 'medium' | 'large';
}

// ============================================================================
// Form Layout
// ============================================================================

/**
 * Tab configuration for tabbed layout
 */
export interface TabConfig {
  id: string;
  label: string;
  fieldIds: string[];
  icon?: string;
  disabled?: boolean;
}

/**
 * Accordion item configuration
 */
export interface AccordionItemConfig {
  id: string;
  title: string;
  fieldIds: string[];
  expanded?: boolean;
  icon?: string;
  disabled?: boolean;
}

/**
 * Wizard step configuration
 */
export interface WizardStepConfig {
  id: string;
  label: string;
  fieldIds: string[];
  optional?: boolean;
  completionCondition?: VisibilityCondition;
}

/**
 * Grid layout configuration
 */
export interface GridLayoutConfig {
  columns?: number;
  gap?: string;
  autoFlow?: 'row' | 'column' | 'dense';
  alignItems?: string;
  justifyItems?: string;
}

/**
 * Layout configuration
 */
export interface LayoutConfig {
  type: LayoutType;
  columns?: number;
  gap?: string;
  padding?: string;
  tabs?: TabConfig[];
  accordions?: AccordionItemConfig[];
  wizardSteps?: WizardStepConfig[];
  gridConfig?: GridLayoutConfig;
  responsive?: {
    mobile?: { type: LayoutType; columns?: number };
    tablet?: { type: LayoutType; columns?: number };
    desktop?: { type: LayoutType; columns?: number };
  };
}

// ============================================================================
// Form Configuration
// ============================================================================

/**
 * Form submission configuration
 */
export interface FormSubmissionConfig {
  onSubmit?: (formData: Record<string, unknown>) => Promise<void> | void;
  onError?: (errors: FormValidationError[]) => void;
  submitButtonLabel?: string;
  cancelButtonLabel?: string;
  showSubmitButton?: boolean;
  showCancelButton?: boolean;
}

/**
 * Form validation error
 */
export interface FormValidationError {
  fieldId: string;
  fieldName: string;
  message: string;
  code: string;
  rule?: ValidationType;
}

/**
 * Form state
 */
export interface FormState {
  formId: string;
  values: Record<string, unknown>;
  errors: FormValidationError[];
  touched: Record<string, boolean>;
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
}

/**
 * Complete form configuration
 */
export interface FormConfig {
  id: string;
  name: string;
  title?: string;
  description?: string;
  version?: string;

  // Structure
  fields: FieldConfig[];
  layout: LayoutConfig;

  // Behavior
  submission: FormSubmissionConfig;
  autoSave?: {
    enabled: boolean;
    intervalMs?: number;
    onAutoSave?: (formData: Record<string, unknown>) => void;
  };

  // Validation
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnSubmit?: boolean;

  // Appearance
  theme?: 'light' | 'dark';
  customCSS?: string;
  customTheme?: Record<string, unknown>;

  // Metadata
  category?: string;
  tags?: string[];
  createdBy?: string;
  createdAt?: Date;
  updatedBy?: string;
  updatedAt?: Date;

  // Multi-site
  siteId?: string;
  siteOverrides?: Record<string, unknown>;

  // Preview
  previewData?: Record<string, unknown>;
}

// ============================================================================
// Form Builder Store State
// ============================================================================

/**
 * Form field store item
 */
export interface FormFieldStoreItem {
  field: FieldConfig;
  errors: FormValidationError[];
  value?: unknown;
  touched?: boolean;
  isDirty?: boolean;
}

/**
 * Form builder store state
 */
export interface FormBuilderStoreState {
  // Form data
  formId: string;
  fields: Map<string, FormFieldStoreItem>;
  layout: LayoutConfig;
  values: Record<string, unknown>;
  errors: FormValidationError[];
  touched: Record<string, boolean>;

  // Form state
  isDirty: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  isLoading: boolean;

  // Actions
  setFormId: (id: string) => void;
  setFieldValue: (fieldId: string, value: unknown) => void;
  setFieldTouched: (fieldId: string, touched: boolean) => void;
  setFieldError: (fieldId: string, errors: FormValidationError[]) => void;
  addField: (field: FieldConfig) => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, config: Partial<FieldConfig>) => void;
  getField: (fieldId: string) => FieldConfig | undefined;
  resetForm: () => void;
  resetField: (fieldId: string) => void;
  setLayout: (layout: LayoutConfig) => void;
  validateField: (fieldId: string) => Promise<FormValidationError[]>;
  validateForm: () => Promise<boolean>;
  submitForm: (onSubmit: (data: Record<string, unknown>) => void) => Promise<void>;
}

// ============================================================================
// Validation Engine
// ============================================================================

/**
 * Custom validator function
 */
export type CustomValidator = (
  value: unknown,
  field: FieldConfig,
  formValues: Record<string, unknown>
) => Promise<boolean | FormValidationError> | boolean | FormValidationError;

/**
 * Validation context
 */
export interface ValidationContext {
  fieldId: string;
  fieldName: string;
  value: unknown;
  formValues: Record<string, unknown>;
  field: FieldConfig;
  rules: ValidationRule[];
  customValidators?: CustomValidator[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  fieldId: string;
  isValid: boolean;
  errors: FormValidationError[];
}

// ============================================================================
// Component Props
// ============================================================================

/**
 * Field component props
 */
export interface FieldComponentProps {
  field: FieldConfig;
  value?: unknown;
  error?: FormValidationError;
  touched?: boolean;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  onFocus: () => void;
}

/**
 * Form component props
 */
export interface FormComponentProps {
  formConfig: FormConfig;
  initialValues?: Record<string, unknown>;
  onSubmit: (formData: Record<string, unknown>) => Promise<void> | void;
  onError?: (errors: FormValidationError[]) => void;
  onChange?: (formData: Record<string, unknown>) => void;
  readOnly?: boolean;
}

/**
 * Form preview props
 */
export interface FormPreviewProps {
  formConfig: FormConfig;
  previewData?: Record<string, unknown>;
  onUpdate?: (fieldId: string, value: unknown) => void;
}
