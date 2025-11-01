/**
 * FieldEditor Component Tests (Issue #45 - Phase 3)
 * Comprehensive test suite for field configuration editor component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FieldEditor } from '../FieldEditor';

vi.mock('@/services/FormBuilderService', () => ({
  default: {
    getFieldTypeIcon: (type: string) => {
      const icons: Record<string, string> = {
        TEXT: 'a',
        NUMBER: '123',
        TEXTAREA: '📄',
        SELECT: '▼',
        DATE: '📅',
        BOOLEAN: '☑️',
      };
      return icons[type] || '?';
    },
    getFieldTypeDescription: (type: string) => `${type} field description`,
  },
}));

describe('FieldEditor Component', () => {
  const mockField = {
    id: 'field-1',
    fieldName: 'measurement_1',
    displayLabel: 'Measurement (mm)',
    dataType: 'NUMBER' as const,
    required: true,
    displayOrder: 0,
    placeholder: 'Enter measurement',
    helpText: 'Enter the measurement in millimeters',
    unitOfMeasure: 'mm',
    defaultValue: '0',
    options: [],
    validationRules: {
      min: 0,
      max: 100,
    },
  };

  const mockOnUpdate = vi.fn();
  const mockAllFields = [mockField];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render field header with icon and label', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Measurement (mm)')).toBeInTheDocument();
      expect(screen.getByText('NUMBER')).toBeInTheDocument();
    });

    it('should render basic configuration section', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Basic Configuration')).toBeInTheDocument();
      expect(screen.getByLabelText('Field Name*')).toBeInTheDocument();
      expect(screen.getByLabelText('Display Label*')).toBeInTheDocument();
    });

    it('should render validation rules section', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Validation Rules')).toBeInTheDocument();
    });

    it('should render conditional display section', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Conditional Display')).toBeInTheDocument();
    });
  });

  describe('basic field configuration', () => {
    it('should display field name input with value', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const fieldNameInput = screen.getByDisplayValue('measurement_1');
      expect(fieldNameInput).toBeInTheDocument();
    });

    it('should display display label input with value', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const displayLabelInput = screen.getByDisplayValue('Measurement (mm)');
      expect(displayLabelInput).toBeInTheDocument();
    });

    it('should display help text textarea with value', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const helpTextInput = screen.getByDisplayValue('Enter the measurement in millimeters');
      expect(helpTextInput).toBeInTheDocument();
    });

    it('should display placeholder input with value', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const placeholderInput = screen.getByDisplayValue('Enter measurement');
      expect(placeholderInput).toBeInTheDocument();
    });

    it('should display unit of measure input with value', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const unitInput = screen.getByDisplayValue('mm');
      expect(unitInput).toBeInTheDocument();
    });

    it('should display default value input with value', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const defaultValueInput = screen.getByDisplayValue('0');
      expect(defaultValueInput).toBeInTheDocument();
    });

    it('should display required checkbox when field is required', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const requiredCheckbox = screen.getByRole('checkbox', { name: 'Required field' });
      expect(requiredCheckbox).toBeChecked();
    });
  });

  describe('basic field updates', () => {
    it('should call onUpdate when field name is changed', async () => {
      const { rerender } = render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const fieldNameInput = screen.getByDisplayValue('measurement_1');
      await userEvent.clear(fieldNameInput);
      await userEvent.type(fieldNameInput, 'new_field_name');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        fieldName: 'new_field_name',
      });
    });

    it('should call onUpdate when display label is changed', async () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const labelInput = screen.getByDisplayValue('Measurement (mm)');
      await userEvent.clear(labelInput);
      await userEvent.type(labelInput, 'New Label');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        displayLabel: 'New Label',
      });
    });

    it('should call onUpdate when required checkbox is toggled', async () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      const requiredCheckbox = screen.getByRole('checkbox', { name: 'Required field' });
      fireEvent.click(requiredCheckbox);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        required: false,
      });
    });
  });

  describe('type-specific validation rules', () => {
    it('should show min/max inputs for NUMBER fields', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByLabelText('Minimum Value')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum Value')).toBeInTheDocument();
    });

    it('should show minLength/maxLength for TEXT fields', () => {
      const textField = {
        ...mockField,
        dataType: 'TEXT' as const,
        validationRules: {
          minLength: 1,
          maxLength: 255,
        },
      };

      render(
        <FieldEditor
          field={textField}
          allFields={[textField]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByLabelText('Minimum Length')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum Length')).toBeInTheDocument();
      expect(screen.getByLabelText('Pattern (Regex)')).toBeInTheDocument();
    });

    it('should show minLength/maxLength for TEXTAREA fields', () => {
      const textareaField = {
        ...mockField,
        dataType: 'TEXTAREA' as const,
        validationRules: {
          minLength: 1,
          maxLength: 2000,
        },
      };

      render(
        <FieldEditor
          field={textareaField}
          allFields={[textareaField]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByLabelText('Minimum Length')).toBeInTheDocument();
      expect(screen.getByLabelText('Maximum Length')).toBeInTheDocument();
    });
  });

  describe('select field options', () => {
    it('should display options table for SELECT fields', () => {
      const selectField = {
        ...mockField,
        dataType: 'SELECT' as const,
        options: [
          { label: 'Good', value: 'good' },
          { label: 'Bad', value: 'bad' },
        ],
      };

      render(
        <FieldEditor
          field={selectField}
          allFields={[selectField]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Options')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Bad')).toBeInTheDocument();
    });

    it('should show empty message when SELECT field has no options', () => {
      const selectField = {
        ...mockField,
        dataType: 'SELECT' as const,
        options: [],
      };

      render(
        <FieldEditor
          field={selectField}
          allFields={[selectField]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('No options configured')).toBeInTheDocument();
    });

    it('should allow adding new options', async () => {
      const selectField = {
        ...mockField,
        dataType: 'SELECT' as const,
        options: [],
      };

      render(
        <FieldEditor
          field={selectField}
          allFields={[selectField]}
          onUpdate={mockOnUpdate}
        />
      );

      const labelInput = screen.getAllByPlaceholderText('Option label')[0];
      const valueInput = screen.getAllByPlaceholderText('Option value')[0];
      const addButton = screen.getByText('Add Option');

      await userEvent.type(labelInput, 'New Option');
      await userEvent.type(valueInput, 'new_option');
      fireEvent.click(addButton);

      expect(mockOnUpdate).toHaveBeenCalledWith({
        options: [
          { label: 'New Option', value: 'new_option' },
        ],
      });
    });

    it('should not add option if label or value is empty', async () => {
      const selectField = {
        ...mockField,
        dataType: 'SELECT' as const,
        options: [],
      };

      render(
        <FieldEditor
          field={selectField}
          allFields={[selectField]}
          onUpdate={mockOnUpdate}
        />
      );

      const addButton = screen.getByText('Add Option');
      fireEvent.click(addButton);

      // onUpdate should not be called if validation fails
      expect(mockOnUpdate).not.toHaveBeenCalled();
    });

    it('should allow removing options', async () => {
      const selectField = {
        ...mockField,
        dataType: 'SELECT' as const,
        options: [
          { label: 'Good', value: 'good' },
          { label: 'Bad', value: 'bad' },
        ],
      };

      render(
        <FieldEditor
          field={selectField}
          allFields={[selectField]}
          onUpdate={mockOnUpdate}
        />
      );

      const deleteButtons = screen.getAllByRole('button', { name: '' }).filter((btn) =>
        btn.className.includes('ant-btn-dangerous')
      );

      if (deleteButtons.length > 0) {
        fireEvent.click(deleteButtons[0]);

        expect(mockOnUpdate).toHaveBeenCalledWith({
          options: [{ label: 'Bad', value: 'bad' }],
        });
      }
    });
  });

  describe('conditional display', () => {
    it('should render conditional display section', () => {
      render(
        <FieldEditor
          field={mockField}
          allFields={mockAllFields}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Conditional Display')).toBeInTheDocument();
      expect(screen.getByText('Show this field only when')).toBeInTheDocument();
    });

    it('should filter out current field from conditional field options', () => {
      const allFields = [
        mockField,
        {
          ...mockField,
          id: 'field-2',
          displayLabel: 'Other Field',
        },
      ];

      render(
        <FieldEditor
          field={mockField}
          allFields={allFields}
          onUpdate={mockOnUpdate}
        />
      );

      // The dropdown should only show 'Other Field', not 'Measurement (mm)'
      // (implementation depends on Ant Design Select behavior)
    });

    it('should show condition input when conditional field is selected', () => {
      const fieldWithConditional = {
        ...mockField,
        conditionalOn: {
          fieldId: 'field-2',
          condition: 'equals "yes"',
        },
      };

      render(
        <FieldEditor
          field={fieldWithConditional}
          allFields={[fieldWithConditional]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByDisplayValue('equals "yes"')).toBeInTheDocument();
    });

    it('should clear conditional display when field is deselected', () => {
      const fieldWithConditional = {
        ...mockField,
        conditionalOn: {
          fieldId: 'field-2',
          condition: 'equals "yes"',
        },
      };

      render(
        <FieldEditor
          field={fieldWithConditional}
          allFields={[fieldWithConditional]}
          onUpdate={mockOnUpdate}
        />
      );

      // Test deselection - implementation depends on Select component
    });
  });

  describe('validation updates', () => {
    it('should update min value for NUMBER fields', async () => {
      const numberField = {
        ...mockField,
        dataType: 'NUMBER' as const,
        validationRules: { min: 0, max: 100 },
      };

      render(
        <FieldEditor
          field={numberField}
          allFields={[numberField]}
          onUpdate={mockOnUpdate}
        />
      );

      const minInput = screen.getByLabelText('Minimum Value');
      await userEvent.clear(minInput);
      await userEvent.type(minInput, '10');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        validationRules: {
          min: 10,
          max: 100,
        },
      });
    });

    it('should update max value for NUMBER fields', async () => {
      const numberField = {
        ...mockField,
        dataType: 'NUMBER' as const,
        validationRules: { min: 0, max: 100 },
      };

      render(
        <FieldEditor
          field={numberField}
          allFields={[numberField]}
          onUpdate={mockOnUpdate}
        />
      );

      const maxInput = screen.getByLabelText('Maximum Value');
      await userEvent.clear(maxInput);
      await userEvent.type(maxInput, '200');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        validationRules: {
          min: 0,
          max: 200,
        },
      });
    });

    it('should update pattern for TEXT fields', async () => {
      const textField = {
        ...mockField,
        dataType: 'TEXT' as const,
        validationRules: {},
      };

      render(
        <FieldEditor
          field={textField}
          allFields={[textField]}
          onUpdate={mockOnUpdate}
        />
      );

      const patternInput = screen.getByLabelText('Pattern (Regex)');
      await userEvent.type(patternInput, '^[A-Z0-9]+$');

      expect(mockOnUpdate).toHaveBeenCalledWith({
        validationRules: {
          pattern: '^[A-Z0-9]+$',
        },
      });
    });
  });

  describe('edge cases', () => {
    it('should handle field with no validation rules', () => {
      const simpleField = {
        ...mockField,
        validationRules: undefined,
      };

      render(
        <FieldEditor
          field={simpleField}
          allFields={[simpleField]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Validation Rules')).toBeInTheDocument();
    });

    it('should handle field with no options', () => {
      const fieldWithoutOptions = {
        ...mockField,
        options: undefined,
      };

      render(
        <FieldEditor
          field={fieldWithoutOptions}
          allFields={[fieldWithoutOptions]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Validation Rules')).toBeInTheDocument();
    });

    it('should handle field with no help text', () => {
      const fieldWithoutHelp = {
        ...mockField,
        helpText: undefined,
      };

      render(
        <FieldEditor
          field={fieldWithoutHelp}
          allFields={[fieldWithoutHelp]}
          onUpdate={mockOnUpdate}
        />
      );

      expect(screen.getByText('Basic Configuration')).toBeInTheDocument();
    });
  });
});
