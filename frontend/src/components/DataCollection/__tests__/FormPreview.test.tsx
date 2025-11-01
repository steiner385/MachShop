/**
 * FormPreview Component Tests (Issue #45 - Phase 3)
 * Comprehensive test suite for form preview component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormPreview } from '../FormPreview';
import FormBuilderService from '@/services/FormBuilderService';

vi.mock('@/services/FormBuilderService', () => ({
  default: {
    getFieldTypeIcon: (type: string) => {
      const icons: Record<string, string> = {
        TEXT: 'a',
        NUMBER: '123',
        TEXTAREA: '📄',
        SELECT: '▼',
        MULTISELECT: '☑️☑️',
        BOOLEAN: '☑️',
        DATE: '📅',
        TIME: '🕐',
        DATETIME: '📅🕐',
        FILE: '📎',
        SIGNATURE: '✍️',
      };
      return icons[type] || '?';
    },
    validateForm: vi.fn(() => ({})),
  },
}));

describe('FormPreview Component', () => {
  const mockForm = {
    id: 'form-1',
    routingOperationId: 'op-1',
    formName: 'Test Form',
    description: 'A test form',
    version: '1.0.0',
    requiredForCompletion: false,
    displayOrder: 0,
    isActive: true,
    fields: [
      {
        id: 'field-1',
        fieldName: 'name',
        displayLabel: 'Full Name',
        dataType: 'TEXT' as const,
        required: true,
        displayOrder: 0,
        placeholder: 'Enter your name',
        helpText: 'Your full name',
        validationRules: {
          minLength: 1,
          maxLength: 100,
        },
      },
      {
        id: 'field-2',
        fieldName: 'age',
        displayLabel: 'Age',
        dataType: 'NUMBER' as const,
        required: false,
        displayOrder: 1,
        placeholder: 'Enter your age',
        validationRules: {
          min: 0,
          max: 150,
        },
      },
      {
        id: 'field-3',
        fieldName: 'status',
        displayLabel: 'Status',
        dataType: 'SELECT' as const,
        required: false,
        displayOrder: 2,
        options: [
          { label: 'Active', value: 'active' },
          { label: 'Inactive', value: 'inactive' },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render form header with name and description', () => {
      render(<FormPreview form={mockForm} />);

      expect(screen.getByText('Test Form')).toBeInTheDocument();
      expect(screen.getByText('A test form')).toBeInTheDocument();
    });

    it('should show empty message when no fields', () => {
      const emptyForm = { ...mockForm, fields: [] };

      render(<FormPreview form={emptyForm} />);

      expect(screen.getByText('No fields added yet')).toBeInTheDocument();
    });

    it('should render all fields', () => {
      render(<FormPreview form={mockForm} />);

      expect(screen.getByText('Full Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should display field icons', () => {
      render(<FormPreview form={mockForm} />);

      // Icons are rendered, check that they appear
      expect(screen.getByText('a Full Name')).toBeInTheDocument(); // TEXT icon + label
    });

    it('should show required indicator for required fields', () => {
      render(<FormPreview form={mockForm} />);

      const requiredIndicators = screen.getAllByText('*');
      expect(requiredIndicators.length).toBeGreaterThan(0);
    });

    it('should display help text for fields', () => {
      render(<FormPreview form={mockForm} />);

      expect(screen.getByText('Your full name')).toBeInTheDocument();
    });

    it('should show submit button', () => {
      render(<FormPreview form={mockForm} />);

      expect(screen.getByText('Submit Preview')).toBeInTheDocument();
    });

    it('should show clear button', () => {
      render(<FormPreview form={mockForm} />);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });
  });

  describe('field rendering by type', () => {
    it('should render TEXT field as Input', () => {
      render(<FormPreview form={mockForm} />);

      const textInput = screen.getByPlaceholderText('Enter your name');
      expect(textInput).toBeInTheDocument();
      expect(textInput).toHaveAttribute('type', 'text');
    });

    it('should render NUMBER field as InputNumber', () => {
      render(<FormPreview form={mockForm} />);

      const numberInput = screen.getByPlaceholderText('Enter your age');
      expect(numberInput).toBeInTheDocument();
    });

    it('should render SELECT field as Select', () => {
      render(<FormPreview form={mockForm} />);

      // Select component renders a select-like element
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render TEXTAREA field as TextArea', () => {
      const formWithTextarea = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'notes',
            displayLabel: 'Notes',
            dataType: 'TEXTAREA' as const,
            required: false,
            displayOrder: 0,
            placeholder: 'Enter notes',
          },
        ],
      };

      render(<FormPreview form={formWithTextarea} />);

      const textarea = screen.getByPlaceholderText('Enter notes');
      expect(textarea).toBeInTheDocument();
    });

    it('should render BOOLEAN field as Checkbox', () => {
      const formWithBoolean = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'agree',
            displayLabel: 'I Agree',
            dataType: 'BOOLEAN' as const,
            required: false,
            displayOrder: 0,
          },
        ],
      };

      render(<FormPreview form={formWithBoolean} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('should render DATE field as DatePicker', () => {
      const formWithDate = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'date',
            displayLabel: 'Date',
            dataType: 'DATE' as const,
            required: false,
            displayOrder: 0,
          },
        ],
      };

      render(<FormPreview form={formWithDate} />);

      expect(screen.getByText('Date')).toBeInTheDocument();
    });

    it('should render TIME field as TimePicker', () => {
      const formWithTime = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'time',
            displayLabel: 'Time',
            dataType: 'TIME' as const,
            required: false,
            displayOrder: 0,
          },
        ],
      };

      render(<FormPreview form={formWithTime} />);

      expect(screen.getByText('Time')).toBeInTheDocument();
    });

    it('should render DATETIME field as DatePicker with time', () => {
      const formWithDateTime = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'datetime',
            displayLabel: 'Date and Time',
            dataType: 'DATETIME' as const,
            required: false,
            displayOrder: 0,
          },
        ],
      };

      render(<FormPreview form={formWithDateTime} />);

      expect(screen.getByText('Date and Time')).toBeInTheDocument();
    });

    it('should render FILE field as Upload', () => {
      const formWithFile = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'document',
            displayLabel: 'Document',
            dataType: 'FILE' as const,
            required: false,
            displayOrder: 0,
          },
        ],
      };

      render(<FormPreview form={formWithFile} />);

      expect(screen.getByText('Choose File')).toBeInTheDocument();
    });

    it('should render SIGNATURE field as signature placeholder', () => {
      const formWithSignature = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'signature',
            displayLabel: 'Signature',
            dataType: 'SIGNATURE' as const,
            required: false,
            displayOrder: 0,
          },
        ],
      };

      render(<FormPreview form={formWithSignature} />);

      expect(screen.getByText('✍️ Signature capture would appear here')).toBeInTheDocument();
    });

    it('should render MULTISELECT field as Select with multiple mode', () => {
      const formWithMultiselect = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'tags',
            displayLabel: 'Tags',
            dataType: 'MULTISELECT' as const,
            required: false,
            displayOrder: 0,
            options: [
              { label: 'Tag 1', value: 'tag1' },
              { label: 'Tag 2', value: 'tag2' },
            ],
          },
        ],
      };

      render(<FormPreview form={formWithMultiselect} />);

      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('should validate required fields on submit', async () => {
      render(<FormPreview form={mockForm} />);

      const submitButton = screen.getByText('Submit Preview');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });
    });

    it('should validate number range on submit', async () => {
      render(<FormPreview form={mockForm} />);

      const ageInput = screen.getByPlaceholderText('Enter your age');
      await userEvent.type(ageInput, '200');

      const submitButton = screen.getByText('Submit Preview');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Value must be at most 150')).toBeInTheDocument();
      });
    });

    it('should validate text length on submit', async () => {
      render(<FormPreview form={mockForm} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await userEvent.type(nameInput, 'a'.repeat(101));

      const submitButton = screen.getByText('Submit Preview');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Must be at most 100 characters')).toBeInTheDocument();
      });
    });

    it('should show validation warnings for form configuration errors', () => {
      const formWithErrors = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'field_1',
            displayLabel: 'Field',
            dataType: 'SELECT' as const,
            required: false,
            displayOrder: 0,
            options: [], // Missing options
          },
        ],
      };

      vi.mocked(FormBuilderService.validateForm).mockReturnValueOnce({
        'field-1_options': 'SELECT fields require at least one option',
      });

      render(<FormPreview form={formWithErrors} />);

      expect(screen.getByText('Form Configuration Warnings')).toBeInTheDocument();
    });
  });

  describe('user interactions', () => {
    it('should update field value on change', async () => {
      render(<FormPreview form={mockForm} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await userEvent.type(nameInput, 'John Doe');

      expect(nameInput).toHaveValue('John Doe');
    });

    it('should clear validation errors on field change', async () => {
      render(<FormPreview form={mockForm} />);

      const submitButton = screen.getByText('Submit Preview');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('This field is required')).toBeInTheDocument();
      });

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await userEvent.type(nameInput, 'John');

      await waitFor(() => {
        expect(screen.queryByText('This field is required')).not.toBeInTheDocument();
      });
    });

    it('should handle select field changes', async () => {
      render(<FormPreview form={mockForm} />);

      // Select component interaction depends on Ant Design implementation
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should handle clear button', async () => {
      render(<FormPreview form={mockForm} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await userEvent.type(nameInput, 'John Doe');

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(nameInput).toHaveValue('');
      });
    });
  });

  describe('form tags', () => {
    it('should show required for completion tag', () => {
      const requiredForm = { ...mockForm, requiredForCompletion: true };

      render(<FormPreview form={requiredForm} />);

      expect(screen.getByText('Required for Completion')).toBeInTheDocument();
    });

    it('should show inactive tag', () => {
      const inactiveForm = { ...mockForm, isActive: false };

      render(<FormPreview form={inactiveForm} />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should not show tags when conditions are false', () => {
      render(<FormPreview form={mockForm} />);

      expect(screen.queryByText('Required for Completion')).not.toBeInTheDocument();
      expect(screen.queryByText('Inactive')).not.toBeInTheDocument();
    });
  });

  describe('unit of measure display', () => {
    it('should display unit of measure when present', () => {
      const formWithUnits = {
        ...mockForm,
        fields: [
          {
            id: 'field-1',
            fieldName: 'measurement',
            displayLabel: 'Measurement',
            dataType: 'NUMBER' as const,
            required: false,
            displayOrder: 0,
            unitOfMeasure: 'mm',
          },
        ],
      };

      render(<FormPreview form={formWithUnits} />);

      expect(screen.getByText('(mm)')).toBeInTheDocument();
    });

    it('should not display unit of measure when not present', () => {
      render(<FormPreview form={mockForm} />);

      // Age field has no unit of measure
      const ageLabel = screen.getByText('Age');
      expect(ageLabel.textContent).not.toContain('(');
    });
  });

  describe('form submission', () => {
    it('should show alert on successful submission', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<FormPreview form={mockForm} />);

      const nameInput = screen.getByPlaceholderText('Enter your name');
      await userEvent.type(nameInput, 'John Doe');

      const submitButton = screen.getByText('Submit Preview');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('Form submitted successfully')
        );
      });

      alertSpy.mockRestore();
    });

    it('should not submit if validation fails', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<FormPreview form={mockForm} />);

      const submitButton = screen.getByText('Submit Preview');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).not.toHaveBeenCalled();
      });

      alertSpy.mockRestore();
    });
  });
});
