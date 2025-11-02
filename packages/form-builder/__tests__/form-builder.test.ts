/**
 * Comprehensive Test Suite for Form Builder Core
 * Tests for validation, state management, layout, and field registry
 */

import {
  FieldType,
  ValidationType,
  LayoutType,
  VisibilityOperator,
  FieldConfig,
  FormConfig,
  ValidationRule,
  VisibilityCondition,
} from '../src/types';
import { ValidationEngine } from '../src/validation/ValidationEngine';
import { LayoutEngine } from '../src/layout/LayoutEngine';
import { FieldRegistry } from '../src/components/FieldRegistry';
import { createFormStore } from '../src/state/FormStore';

// ============================================================================
// Validation Engine Tests
// ============================================================================

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine;

  beforeEach(() => {
    validationEngine = new ValidationEngine();
  });

  describe('Required Validation', () => {
    test('should fail when required field is empty', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        required: true,
        validationRules: [{ type: ValidationType.REQUIRED, message: 'Field is required' }],
      };

      const result = await validationEngine.validateField(field, '', {});

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('REQUIRED_VALIDATION_FAILED');
    });

    test('should pass when required field has value', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        required: true,
        validationRules: [{ type: ValidationType.REQUIRED }],
      };

      const result = await validationEngine.validateField(field, 'test value', {});

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should skip validation for null/undefined required field', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        validationRules: [{ type: ValidationType.REQUIRED }],
      };

      const result = await validationEngine.validateField(field, null, {});

      expect(result.isValid).toBe(false);
    });
  });

  describe('String Validation', () => {
    test('should validate min length', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        validationRules: [{ type: ValidationType.MIN_LENGTH, value: 5 }],
      };

      const result1 = await validationEngine.validateField(field, 'ab', {});
      expect(result1.isValid).toBe(false);

      const result2 = await validationEngine.validateField(field, 'abcdef', {});
      expect(result2.isValid).toBe(true);
    });

    test('should validate max length', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        validationRules: [{ type: ValidationType.MAX_LENGTH, value: 5 }],
      };

      const result1 = await validationEngine.validateField(field, 'abcdefgh', {});
      expect(result1.isValid).toBe(false);

      const result2 = await validationEngine.validateField(field, 'abc', {});
      expect(result2.isValid).toBe(true);
    });

    test('should validate pattern', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        validationRules: [{ type: ValidationType.PATTERN, value: '^[A-Z][0-9]{3}$' }],
      };

      const result1 = await validationEngine.validateField(field, 'A123', {});
      expect(result1.isValid).toBe(true);

      const result2 = await validationEngine.validateField(field, 'a123', {});
      expect(result2.isValid).toBe(false);
    });

    test('should validate email format', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.EMAIL,
        name: 'emailField',
        validationRules: [{ type: ValidationType.EMAIL }],
      };

      const result1 = await validationEngine.validateField(field, 'test@example.com', {});
      expect(result1.isValid).toBe(true);

      const result2 = await validationEngine.validateField(field, 'invalid-email', {});
      expect(result2.isValid).toBe(false);
    });

    test('should validate URL format', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.URL,
        name: 'urlField',
        validationRules: [{ type: ValidationType.URL }],
      };

      const result1 = await validationEngine.validateField(
        field,
        'https://example.com',
        {}
      );
      expect(result1.isValid).toBe(true);

      const result2 = await validationEngine.validateField(field, 'not-a-url', {});
      expect(result2.isValid).toBe(false);
    });

    test('should validate phone format', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.PHONE,
        name: 'phoneField',
        validationRules: [{ type: ValidationType.PHONE }],
      };

      const result1 = await validationEngine.validateField(field, '(123) 456-7890', {});
      expect(result1.isValid).toBe(true);

      const result2 = await validationEngine.validateField(field, '123', {});
      expect(result2.isValid).toBe(false);
    });
  });

  describe('Number Validation', () => {
    test('should validate min value', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.NUMBER,
        name: 'numberField',
        validationRules: [{ type: ValidationType.MIN_VALUE, value: 10 }],
      };

      const result1 = await validationEngine.validateField(field, 5, {});
      expect(result1.isValid).toBe(false);

      const result2 = await validationEngine.validateField(field, 15, {});
      expect(result2.isValid).toBe(true);
    });

    test('should validate max value', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.NUMBER,
        name: 'numberField',
        validationRules: [{ type: ValidationType.MAX_VALUE, value: 100 }],
      };

      const result1 = await validationEngine.validateField(field, 150, {});
      expect(result1.isValid).toBe(false);

      const result2 = await validationEngine.validateField(field, 50, {});
      expect(result2.isValid).toBe(true);
    });
  });

  describe('Conditional Validation', () => {
    test('should apply rules only when condition is met', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        conditionalValidations: [
          {
            condition: { fieldId: 'field2', operator: VisibilityOperator.EQUALS, value: true },
            rules: [{ type: ValidationType.REQUIRED }],
          },
        ],
      };

      // Condition not met
      const result1 = await validationEngine.validateField(field, '', { field2: false });
      expect(result1.isValid).toBe(true);

      // Condition met
      const result2 = await validationEngine.validateField(field, '', { field2: true });
      expect(result2.isValid).toBe(false);

      // Condition met with value
      const result3 = await validationEngine.validateField(field, 'value', { field2: true });
      expect(result3.isValid).toBe(true);
    });
  });

  describe('Custom Validation', () => {
    test('should support custom validators', async () => {
      validationEngine.registerCustomValidator('custom_even', async (value) => {
        return typeof value === 'number' && value % 2 === 0;
      });

      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.NUMBER,
        name: 'numberField',
        validationRules: [{ type: ValidationType.CUSTOM, value: 'custom_even' }],
      };

      const result1 = await validationEngine.validateField(field, 4, {});
      expect(result1.isValid).toBe(true);

      const result2 = await validationEngine.validateField(field, 3, {});
      expect(result2.isValid).toBe(false);
    });

    test('should support custom validators returning errors', async () => {
      validationEngine.registerCustomValidator('custom_with_error', async (value, field) => {
        if (value !== 'special') {
          return {
            fieldId: field.id,
            fieldName: field.name || field.id,
            message: 'Value must be "special"',
            code: 'CUSTOM_ERROR',
          };
        }
        return true;
      });

      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        validationRules: [{ type: ValidationType.CUSTOM, value: 'custom_with_error' }],
      };

      const result = await validationEngine.validateField(field, 'wrong', {});
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Value must be "special"');
    });
  });

  describe('Visibility Conditions', () => {
    test('should skip validation for hidden fields', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        hidden: true,
        validationRules: [{ type: ValidationType.REQUIRED }],
      };

      const result = await validationEngine.validateField(field, '', {});
      expect(result.isValid).toBe(true);
    });

    test('should skip validation for disabled fields', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        disabled: true,
        validationRules: [{ type: ValidationType.REQUIRED }],
      };

      const result = await validationEngine.validateField(field, '', {});
      expect(result.isValid).toBe(true);
    });

    test('should skip validation based on visibility condition', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        visibilityCondition: {
          fieldId: 'field2',
          operator: VisibilityOperator.EQUALS,
          value: true,
        },
        validationRules: [{ type: ValidationType.REQUIRED }],
      };

      // Field not visible
      const result1 = await validationEngine.validateField(field, '', { field2: false });
      expect(result1.isValid).toBe(true);

      // Field visible
      const result2 = await validationEngine.validateField(field, '', { field2: true });
      expect(result2.isValid).toBe(false);
    });
  });

  describe('Form Validation', () => {
    test('should validate multiple fields', async () => {
      const field1: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'field1',
        validationRules: [{ type: ValidationType.REQUIRED }],
      };

      const field2: FieldConfig = {
        id: 'field2',
        type: FieldType.EMAIL,
        name: 'field2',
        validationRules: [{ type: ValidationType.EMAIL }],
      };

      const fields = new Map([
        ['field1', field1],
        ['field2', field2],
      ]);

      const results = await validationEngine.validateForm(fields, {
        field1: '',
        field2: 'invalid',
      });

      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(false);
      expect(results[1].isValid).toBe(false);
    });
  });

  describe('Multiple Validation Rules', () => {
    test('should apply multiple rules to single field', async () => {
      const field: FieldConfig = {
        id: 'field1',
        type: FieldType.TEXT,
        name: 'testField',
        validationRules: [
          { type: ValidationType.REQUIRED },
          { type: ValidationType.MIN_LENGTH, value: 5 },
          { type: ValidationType.MAX_LENGTH, value: 20 },
        ],
      };

      const result1 = await validationEngine.validateField(field, '', {});
      expect(result1.errors).toHaveLength(2); // Required + min length

      const result2 = await validationEngine.validateField(field, 'ab', {});
      expect(result2.errors).toHaveLength(1); // Min length

      const result3 = await validationEngine.validateField(field, 'validstring', {});
      expect(result3.isValid).toBe(true);

      const result4 = await validationEngine.validateField(
        field,
        'this is a very long string that exceeds max',
        {}
      );
      expect(result4.errors).toHaveLength(1); // Max length
    });
  });
});

// ============================================================================
// Layout Engine Tests
// ============================================================================

describe('LayoutEngine', () => {
  let layoutEngine: LayoutEngine;

  beforeEach(() => {
    layoutEngine = new LayoutEngine();
  });

  describe('Field Distribution', () => {
    test('should distribute fields to single column', () => {
      const fields = new Map<string, FieldConfig>([
        ['field1', { id: 'field1', type: FieldType.TEXT, name: 'field1' }],
        ['field2', { id: 'field2', type: FieldType.TEXT, name: 'field2', order: 1 }],
        ['field3', { id: 'field3', type: FieldType.TEXT, name: 'field3', order: 2 }],
      ]);

      const layout = { type: LayoutType.SINGLE_COLUMN };
      const grouped = layoutEngine.getFieldsByLayout(fields, layout);

      expect(grouped['column-1']).toHaveLength(3);
      expect(grouped['column-1'][0].id).toBe('field1');
    });

    test('should distribute fields to two columns', () => {
      const fields = new Map<string, FieldConfig>([
        ['field1', { id: 'field1', type: FieldType.TEXT, name: 'field1' }],
        ['field2', { id: 'field2', type: FieldType.TEXT, name: 'field2' }],
        ['field3', { id: 'field3', type: FieldType.TEXT, name: 'field3' }],
      ]);

      const layout = { type: LayoutType.TWO_COLUMN, columns: 2 };
      const grouped = layoutEngine.getFieldsByLayout(fields, layout);

      expect(grouped['column-1']).toHaveLength(2);
      expect(grouped['column-2']).toHaveLength(1);
    });

    test('should organize fields by tabs', () => {
      const fields = new Map<string, FieldConfig>([
        ['field1', { id: 'field1', type: FieldType.TEXT, name: 'field1' }],
        ['field2', { id: 'field2', type: FieldType.TEXT, name: 'field2' }],
        ['field3', { id: 'field3', type: FieldType.TEXT, name: 'field3' }],
      ]);

      const layout = {
        type: LayoutType.TABS,
        tabs: [
          { id: 'tab1', label: 'Tab 1', fieldIds: ['field1', 'field2'] },
          { id: 'tab2', label: 'Tab 2', fieldIds: ['field3'] },
        ],
      };

      const grouped = layoutEngine.getFieldsByLayout(fields, layout);

      expect(grouped['tab-tab1']).toHaveLength(2);
      expect(grouped['tab-tab2']).toHaveLength(1);
    });

    test('should organize fields by accordion', () => {
      const fields = new Map<string, FieldConfig>([
        ['field1', { id: 'field1', type: FieldType.TEXT, name: 'field1' }],
        ['field2', { id: 'field2', type: FieldType.TEXT, name: 'field2' }],
      ]);

      const layout = {
        type: LayoutType.ACCORDION,
        accordions: [{ id: 'acc1', title: 'Section 1', fieldIds: ['field1', 'field2'] }],
      };

      const grouped = layoutEngine.getFieldsByLayout(fields, layout);

      expect(grouped['accordion-acc1']).toHaveLength(2);
    });

    test('should organize fields by wizard steps', () => {
      const fields = new Map<string, FieldConfig>([
        ['field1', { id: 'field1', type: FieldType.TEXT, name: 'field1' }],
        ['field2', { id: 'field2', type: FieldType.TEXT, name: 'field2' }],
      ]);

      const layout = {
        type: LayoutType.WIZARD,
        wizardSteps: [{ id: 'step1', label: 'Step 1', fieldIds: ['field1', 'field2'] }],
      };

      const grouped = layoutEngine.getFieldsByLayout(fields, layout);

      expect(grouped['step-step1']).toHaveLength(2);
    });
  });

  describe('Responsive Layouts', () => {
    test('should get responsive layout for different screen sizes', () => {
      const layout = {
        type: LayoutType.SINGLE_COLUMN,
        responsive: {
          mobile: { type: LayoutType.SINGLE_COLUMN, columns: 1 },
          tablet: { type: LayoutType.TWO_COLUMN, columns: 2 },
          desktop: { type: LayoutType.THREE_COLUMN, columns: 3 },
        },
      };

      const mobile = layoutEngine.getResponsiveLayout(layout, 'mobile');
      expect(mobile.type).toBe(LayoutType.SINGLE_COLUMN);

      const tablet = layoutEngine.getResponsiveLayout(layout, 'tablet');
      expect(tablet.type).toBe(LayoutType.TWO_COLUMN);

      const desktop = layoutEngine.getResponsiveLayout(layout, 'desktop');
      expect(desktop.type).toBe(LayoutType.THREE_COLUMN);
    });
  });

  describe('Layout Validation', () => {
    test('should validate tab configuration', () => {
      const fields = new Map<string, FieldConfig>([
        ['field1', { id: 'field1', type: FieldType.TEXT, name: 'field1' }],
      ]);

      const layout = {
        type: LayoutType.TABS,
        tabs: [
          { id: 'tab1', label: '', fieldIds: [] }, // Missing label and fields
          { id: 'tab2', label: 'Tab 2', fieldIds: ['field2'] }, // Unknown field
        ],
      };

      const errors = layoutEngine.validateLayout(layout, fields);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('CSS Grid Generation', () => {
    test('should generate grid CSS', () => {
      const layout = {
        type: LayoutType.GRID,
        columns: 3,
        gap: '2rem',
        padding: '1rem',
      };

      const css = layoutEngine.getGridCSS(layout);

      expect(css.display).toBe('grid');
      expect(css.gridTemplateColumns).toBe('repeat(3, 1fr)');
      expect(css.gap).toBe('2rem');
      expect(css.padding).toBe('1rem');
    });
  });
});

// ============================================================================
// Field Registry Tests
// ============================================================================

describe('FieldRegistry', () => {
  test('should get all field types', () => {
    const allFields = FieldRegistry.getAll();
    expect(allFields.length).toBeGreaterThan(20);
  });

  test('should get field by type', () => {
    const config = FieldRegistry.getByType(FieldType.TEXT);
    expect(config).toBeDefined();
    expect(config?.label).toBe('Text Input');
  });

  test('should get fields by category', () => {
    const inputFields = FieldRegistry.getByCategory('input');
    expect(inputFields.length).toBeGreaterThan(0);
  });

  test('should get all categories', () => {
    const categories = FieldRegistry.getCategories();
    expect(categories).toContain('input');
    expect(categories).toContain('selection');
    expect(categories).toContain('datetime');
  });

  test('should identify field capabilities', () => {
    expect(FieldRegistry.supportsOptions(FieldType.SELECT)).toBe(true);
    expect(FieldRegistry.supportsOptions(FieldType.TEXT)).toBe(false);

    expect(FieldRegistry.supportsMultiple(FieldType.MULTI_SELECT)).toBe(true);
    expect(FieldRegistry.supportsMultiple(FieldType.SELECT)).toBe(false);

    expect(FieldRegistry.supportsValidation(FieldType.TEXT)).toBe(true);
    expect(FieldRegistry.supportsValidation(FieldType.SECTION)).toBe(false);
  });

  test('should get default field configuration', () => {
    const config = FieldRegistry.getDefaultConfig(FieldType.TEXT, {
      id: 'field1',
      name: 'testField',
    });

    expect(config.id).toBe('field1');
    expect(config.name).toBe('testField');
    expect(config.type).toBe(FieldType.TEXT);
    expect(config.placeholder).toBeDefined();
  });

  test('should support 20+ field types', () => {
    const allFields = FieldRegistry.getAll();
    expect(allFields.length).toBeGreaterThanOrEqual(20);
  });

  test('should throw error for unknown field type', () => {
    expect(() => {
      FieldRegistry.getDefaultConfig('unknown_type' as FieldType);
    }).toThrow();
  });
});

// ============================================================================
// Form Store Tests
// ============================================================================

describe('FormStore', () => {
  test('should initialize with empty form', () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);
    const state = store.getState();

    expect(state.formId).toBe('testForm');
    expect(state.values).toEqual({});
    expect(state.errors).toEqual([]);
    expect(state.isDirty).toBe(false);
  });

  test('should add and retrieve fields', () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);

    const field: FieldConfig = {
      id: 'field1',
      type: FieldType.TEXT,
      name: 'testField',
      defaultValue: 'default',
    };

    store.getState().addField(field);

    const retrievedField = store.getState().getField('field1');
    expect(retrievedField).toBeDefined();
    expect(retrievedField?.name).toBe('testField');
  });

  test('should set field values', () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);

    store.getState().setFieldValue('field1', 'testValue');

    const state = store.getState();
    expect(state.values['field1']).toBe('testValue');
    expect(state.isDirty).toBe(true);
  });

  test('should track touched fields', () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);

    store.getState().setFieldTouched('field1', true);

    const state = store.getState();
    expect(state.touched['field1']).toBe(true);
  });

  test('should reset form', () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);

    const field: FieldConfig = {
      id: 'field1',
      type: FieldType.TEXT,
      name: 'testField',
      defaultValue: 'default',
    };

    store.getState().addField(field);
    store.getState().setFieldValue('field1', 'modified');
    store.getState().setFieldTouched('field1', true);

    store.getState().resetForm();

    const state = store.getState();
    expect(state.values['field1']).toBe('default');
    expect(state.touched['field1']).toBe(false);
    expect(state.isDirty).toBe(false);
  });

  test('should validate form', async () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);

    const field: FieldConfig = {
      id: 'field1',
      type: FieldType.TEXT,
      name: 'testField',
      validationRules: [{ type: ValidationType.REQUIRED }],
    };

    store.getState().addField(field);

    const isValid = await store.getState().validateForm();
    expect(isValid).toBe(false);

    store.getState().setFieldValue('field1', 'value');
    const isValidNow = await store.getState().validateForm();
    expect(isValidNow).toBe(true);
  });

  test('should handle form submission', async () => {
    const validationEngine = new ValidationEngine();
    const store = createFormStore('testForm', validationEngine);

    const field: FieldConfig = {
      id: 'field1',
      type: FieldType.TEXT,
      name: 'testField',
      defaultValue: 'value',
    };

    store.getState().addField(field);

    let submittedData: Record<string, unknown> | null = null;

    await store.getState().submitForm((data) => {
      submittedData = data;
    });

    expect(submittedData).toEqual({ field1: 'value' });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Form Builder Integration', () => {
  test('should create a complete form with validation and layout', async () => {
    const validationEngine = new ValidationEngine();
    const layoutEngine = new LayoutEngine();
    const store = createFormStore('integrationForm', validationEngine);

    // Create fields
    const emailField: FieldConfig = {
      id: 'email',
      type: FieldType.EMAIL,
      name: 'email',
      label: 'Email Address',
      validationRules: [{ type: ValidationType.REQUIRED }, { type: ValidationType.EMAIL }],
    };

    const nameField: FieldConfig = {
      id: 'name',
      type: FieldType.TEXT,
      name: 'name',
      label: 'Full Name',
      validationRules: [
        { type: ValidationType.REQUIRED },
        { type: ValidationType.MIN_LENGTH, value: 3 },
      ],
    };

    // Add fields to store
    store.getState().addField(emailField);
    store.getState().addField(nameField);

    // Set layout
    const layout = { type: LayoutType.TWO_COLUMN, columns: 2 };
    store.getState().setLayout(layout);

    // Get fields by layout
    const fields = store.getState().fields;
    const groupedFields = layoutEngine.getFieldsByLayout(fields, layout);

    expect(Object.keys(groupedFields).length).toBeGreaterThan(0);

    // Validate invalid data
    store.getState().setFieldValue('email', 'invalid-email');
    store.getState().setFieldValue('name', 'ab');

    let isValid = await store.getState().validateForm();
    expect(isValid).toBe(false);

    // Validate valid data
    store.getState().setFieldValue('email', 'test@example.com');
    store.getState().setFieldValue('name', 'John Doe');

    isValid = await store.getState().validateForm();
    expect(isValid).toBe(true);
  });
});
