# Form Builder Core - Field Types, Validation, and Layout System

**Part of Issue #399a**: Core form building capabilities with field types and validation system.

## Overview

Form Builder Core provides a comprehensive, type-safe framework for building and validating forms in the MachShop MES platform. It includes:

- **20+ Field Types**: Text, number, date, select, checkbox, file upload, and more
- **Validation Engine**: Required, patterns, custom rules, cross-field validation
- **Layout System**: Single/multi-column, tabs, accordion, wizard layouts
- **State Management**: Zustand-based form state with change tracking
- **Field Registry**: Metadata and capabilities for all field types
- **WCAG 2.1 AA Compliance**: Full accessibility support

## Installation

```bash
npm install @machshop/form-builder zustand
```

## Quick Start

### Basic Form Creation

```typescript
import {
  FormConfig,
  FieldType,
  ValidationType,
  LayoutType,
  ValidationEngine,
  FieldRegistry,
  createFormStore,
} from '@machshop/form-builder';

// Create validation engine
const validationEngine = new ValidationEngine();

// Create form store
const store = createFormStore('myForm', validationEngine);
const { addField, setFieldValue, validateForm, submitForm } = store.getState();

// Add fields
const emailField = FieldRegistry.getDefaultConfig(FieldType.EMAIL, {
  id: 'email',
  name: 'email',
  label: 'Email Address',
  validationRules: [
    { type: ValidationType.REQUIRED, message: 'Email is required' },
    { type: ValidationType.EMAIL, message: 'Invalid email format' },
  ],
});

addField(emailField);

// Handle value changes
setFieldValue('email', 'user@example.com');

// Validate
const isValid = await validateForm();

// Submit
await submitForm(async (data) => {
  console.log('Form submitted:', data);
});
```

## Field Types

### Text Fields
- `TEXT` - Single line text
- `EMAIL` - Email with validation
- `PHONE` - Phone number
- `URL` - URL with validation
- `TEXTAREA` - Multi-line text
- `RICH_TEXT` - Rich text editor

### Number Fields
- `NUMBER` - Numeric input
- `SLIDER` - Range slider
- `RATING` - Star rating

### Date/Time Fields
- `DATE` - Date picker
- `TIME` - Time picker
- `DATETIME` - Date and time picker

### Selection Fields
- `SELECT` - Single select dropdown
- `MULTI_SELECT` - Multiple select
- `RADIO` - Radio button group
- `CHECKBOX` - Checkbox(es)
- `TOGGLE` - Toggle switch
- `AUTOCOMPLETE` - Autocomplete input

### Media Fields
- `FILE_UPLOAD` - File upload
- `IMAGE` - Image upload
- `SIGNATURE` - Digital signature
- `COLOR_PICKER` - Color selection

### Layout Fields
- `SECTION` - Collapsible section
- `HEADING` - Text heading
- `DIVIDER` - Visual divider

## Validation

### Built-in Rules

```typescript
validationRules: [
  { type: ValidationType.REQUIRED, message: 'Field required' },
  { type: ValidationType.MIN_LENGTH, value: 3 },
  { type: ValidationType.MAX_LENGTH, value: 100 },
  { type: ValidationType.PATTERN, value: '^[A-Z][0-9]+$' },
  { type: ValidationType.EMAIL },
  { type: ValidationType.URL },
  { type: ValidationType.PHONE },
  { type: ValidationType.MIN_VALUE, value: 10 },
  { type: ValidationType.MAX_VALUE, value: 100 },
];
```

### Custom Validators

```typescript
// Register custom validator
validationEngine.registerCustomValidator('even_number', async (value) => {
  return typeof value === 'number' && value % 2 === 0;
});

// Use in field
const field: FieldConfig = {
  id: 'field1',
  type: FieldType.NUMBER,
  name: 'evenNumber',
  validationRules: [
    { type: ValidationType.CUSTOM, value: 'even_number' }
  ],
};
```

### Conditional Validation

```typescript
const field: FieldConfig = {
  id: 'field1',
  type: FieldType.TEXT,
  name: 'field1',
  conditionalValidations: [
    {
      condition: {
        fieldId: 'checkField',
        operator: VisibilityOperator.IS_TRUE,
        value: true,
      },
      rules: [{ type: ValidationType.REQUIRED }],
    },
  ],
};
```

### Conditional Visibility

```typescript
const field: FieldConfig = {
  id: 'field1',
  type: FieldType.TEXT,
  visibilityCondition: {
    fieldId: 'field2',
    operator: VisibilityOperator.EQUALS,
    value: 'showField1',
  },
};
```

## Layout System

### Single Column

```typescript
const layout: LayoutConfig = {
  type: LayoutType.SINGLE_COLUMN,
};
```

### Multi-Column

```typescript
const layout: LayoutConfig = {
  type: LayoutType.TWO_COLUMN,
  columns: 2,
  gap: '1rem',
};
```

### Tabs

```typescript
const layout: LayoutConfig = {
  type: LayoutType.TABS,
  tabs: [
    { id: 'tab1', label: 'Personal', fieldIds: ['name', 'email'] },
    { id: 'tab2', label: 'Address', fieldIds: ['street', 'city'] },
  ],
};
```

### Accordion

```typescript
const layout: LayoutConfig = {
  type: LayoutType.ACCORDION,
  accordions: [
    {
      id: 'section1',
      title: 'Basic Information',
      fieldIds: ['name', 'email'],
      expanded: true,
    },
  ],
};
```

### Wizard (Multi-step)

```typescript
const layout: LayoutConfig = {
  type: LayoutType.WIZARD,
  wizardSteps: [
    { id: 'step1', label: 'Personal', fieldIds: ['name', 'email'] },
    { id: 'step2', label: 'Address', fieldIds: ['street', 'city'] },
    { id: 'step3', label: 'Confirm', fieldIds: ['review'] },
  ],
};
```

### Responsive Layouts

```typescript
const layout: LayoutConfig = {
  type: LayoutType.TWO_COLUMN,
  responsive: {
    mobile: { type: LayoutType.SINGLE_COLUMN },
    tablet: { type: LayoutType.TWO_COLUMN, columns: 2 },
    desktop: { type: LayoutType.THREE_COLUMN, columns: 3 },
  },
};
```

## State Management

### Store Operations

```typescript
const store = createFormStore('myForm', validationEngine);
const state = store.getState();

// Add field
state.addField(fieldConfig);

// Set value
state.setFieldValue('fieldId', 'value');

// Mark as touched
state.setFieldTouched('fieldId', true);

// Validate single field
await state.validateField('fieldId');

// Validate entire form
const isValid = await state.validateForm();

// Reset form
state.resetForm();

// Reset single field
state.resetField('fieldId');

// Get field config
const field = state.getField('fieldId');

// Submit
await state.submitForm(async (data) => {
  // Handle submission
});
```

### Store State

```typescript
const { values, errors, touched, isDirty, isValid, isSubmitting } = store.getState();
```

## Field Registry

### Get All Field Types

```typescript
const allFields = FieldRegistry.getAll();
// Returns: FieldTypeConfig[] with 20+ fields

allFields.forEach(config => {
  console.log(`${config.label} (${config.category})`);
  // Text Input (input)
  // Email (input)
  // etc.
});
```

### Get Field Capabilities

```typescript
FieldRegistry.supportsOptions(FieldType.SELECT); // true
FieldRegistry.supportsMultiple(FieldType.MULTI_SELECT); // true
FieldRegistry.supportsValidation(FieldType.TEXT); // true
FieldRegistry.supportsValidation(FieldType.SECTION); // false
```

### Get Default Configuration

```typescript
const config = FieldRegistry.getDefaultConfig(FieldType.TEXT, {
  id: 'field1',
  name: 'textField',
  label: 'My Text Field',
});
```

### Get By Category

```typescript
const inputFields = FieldRegistry.getByCategory('input');
const selectionFields = FieldRegistry.getByCategory('selection');
const dateFields = FieldRegistry.getByCategory('datetime');
const mediaFields = FieldRegistry.getByCategory('media');
const layoutFields = FieldRegistry.getByCategory('layout');
```

## Layout Engine

### Get Fields by Layout

```typescript
import { LayoutEngine } from '@machshop/form-builder';

const layoutEngine = new LayoutEngine();
const fields = new Map([
  ['field1', fieldConfig1],
  ['field2', fieldConfig2],
]);

const groupedFields = layoutEngine.getFieldsByLayout(fields, layout);
// Returns: { 'column-1': [field1, field2], ... }
```

### Responsive Layouts

```typescript
const mobileLayout = layoutEngine.getResponsiveLayout(layout, 'mobile');
const tabletLayout = layoutEngine.getResponsiveLayout(layout, 'tablet');
const desktopLayout = layoutEngine.getResponsiveLayout(layout, 'desktop');
```

### Validate Layout

```typescript
const errors = layoutEngine.validateLayout(layout, fields);
if (errors.length > 0) {
  console.error('Layout errors:', errors);
}
```

## Testing

See [TESTING.md](./TESTING.md) for comprehensive test documentation.

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm test -- --coverage
```

### Test Coverage

- **80%+ line coverage**
- **80%+ function coverage**
- **75%+ branch coverage**
- **45+ test cases**
- Full validation engine, layout, state management, and registry tests

## Manufacturing Scenarios

### Work Order Form

```typescript
const workOrderForm: FormConfig = {
  id: 'work-order',
  name: 'workOrder',
  title: 'Work Order',
  fields: [
    FieldRegistry.getDefaultConfig(FieldType.TEXT, {
      id: 'woNumber',
      name: 'woNumber',
      label: 'Work Order #',
      validationRules: [{ type: ValidationType.REQUIRED }],
    }),
    FieldRegistry.getDefaultConfig(FieldType.DATE, {
      id: 'startDate',
      name: 'startDate',
      label: 'Start Date',
      validationRules: [{ type: ValidationType.REQUIRED }],
    }),
    FieldRegistry.getDefaultConfig(FieldType.SELECT, {
      id: 'priority',
      name: 'priority',
      label: 'Priority',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
      validationRules: [{ type: ValidationType.REQUIRED }],
    }),
  ],
  layout: {
    type: LayoutType.SINGLE_COLUMN,
  },
};
```

## Accessibility

All field types and layouts support WCAG 2.1 Level AA compliance:

- Proper ARIA labels and descriptions
- Keyboard navigation support
- Color contrast compliance
- Focus indicators
- Error message associations
- Required field indicators

## API Reference

### FieldRegistry
- `getAll()` - Get all field types
- `getByType(type)` - Get config for specific type
- `getByCategory(category)` - Get fields by category
- `getCategories()` - Get all categories
- `supportsOptions(type)` - Check if type supports options
- `supportsMultiple(type)` - Check if type supports multiple values
- `supportsValidation(type)` - Check if type supports validation
- `getDefaultConfig(type, overrides)` - Get default field config

### ValidationEngine
- `registerCustomValidator(name, validator)` - Register custom validator
- `validateField(field, value, formValues)` - Validate single field
- `validateForm(fields, formValues)` - Validate entire form
- `validateCrossField(fields, formValues)` - Validate cross-field rules

### LayoutEngine
- `getFieldsByLayout(fields, layout)` - Group fields by layout
- `getResponsiveLayout(layout, screenSize)` - Get responsive layout
- `getGridCSS(layout)` - Generate CSS grid properties
- `validateLayout(layout, fields)` - Validate layout config

### FormStore
- `addField(field)` - Add field to form
- `removeField(fieldId)` - Remove field from form
- `updateField(fieldId, config)` - Update field config
- `getField(fieldId)` - Get field config
- `setFieldValue(fieldId, value)` - Set field value
- `setFieldTouched(fieldId, touched)` - Mark field as touched
- `setFieldError(fieldId, errors)` - Set field errors
- `validateField(fieldId)` - Validate single field
- `validateForm()` - Validate entire form
- `resetForm()` - Reset all fields
- `resetField(fieldId)` - Reset single field
- `submitForm(onSubmit)` - Submit form

## Related Issues

- **#399** - Form & UI Builder for Low-Code Customization (Parent)
- **#397** - Component Library (Related)
- **#394** - Workflow Builder (Related)

## Dependencies

- `zustand` - State management (^4.4.0)

## Peer Dependencies

- `react` - ^18.0.0
- `react-dom` - ^18.0.0

## License

MIT

## Support

For issues, questions, or feature requests, please refer to the main project repository or contact the development team.
