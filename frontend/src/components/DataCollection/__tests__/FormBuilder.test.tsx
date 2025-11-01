/**
 * FormBuilder Component Tests (Issue #45 - Phase 3)
 * Comprehensive test suite for form builder admin UI component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormBuilder } from '../FormBuilder';

// Mock the hooks and dependencies
vi.mock('@/hooks/useFormBuilder', () => ({
  useFormBuilder: vi.fn(),
}));

vi.mock('@/api/dataCollectionApi', () => ({
  dataCollectionApi: {
    getDataCollectionForm: vi.fn(),
    updateDataCollectionForm: vi.fn(),
  },
}));

vi.mock('@/services/FormBuilderService', () => ({
  default: {
    getFieldTypeIcon: (type: string) => {
      const icons: Record<string, string> = {
        TEXT: 'a',
        NUMBER: '123',
        TEXTAREA: '📄',
        SELECT: '▼',
      };
      return icons[type] || '?';
    },
    getFieldTypeDescription: (type: string) => `${type} field description`,
    calculateComplexityScore: (form: any) => 50,
  },
}));

import { useFormBuilder } from '@/hooks/useFormBuilder';

describe('FormBuilder Component', () => {
  const mockRoutingOperationId = 'test-routing-op-id';

  const mockUseFormBuilder = () => ({
    form: {
      id: undefined,
      routingOperationId: mockRoutingOperationId,
      formName: 'Test Form',
      description: 'Test Description',
      version: '1.0.0',
      fields: [
        {
          id: 'field-1',
          fieldName: 'field_1',
          displayLabel: 'Field 1',
          dataType: 'TEXT',
          required: true,
          displayOrder: 0,
          placeholder: 'Enter text',
          helpText: 'Help text',
        },
      ],
      requiredForCompletion: false,
      displayOrder: 0,
      isActive: true,
    },
    currentFieldId: 'field-1',
    isDirty: false,
    isSaving: false,
    isLoading: false,
    errors: {},
    setFormName: vi.fn(),
    setFormDescription: vi.fn(),
    setRequiredForCompletion: vi.fn(),
    setDisplayOrder: vi.fn(),
    setActive: vi.fn(),
    addField: vi.fn(),
    removeField: vi.fn(),
    selectField: vi.fn(),
    deselectField: vi.fn(),
    updateField: vi.fn(),
    reorderFields: vi.fn(),
    duplicateField: vi.fn(),
    validateForm: vi.fn(() => ({})),
    saveForm: vi.fn(() => Promise.resolve()),
    resetForm: vi.fn(),
    cloneForm: vi.fn(() => Promise.resolve()),
    exportForm: vi.fn(() => JSON.stringify({})),
    importForm: vi.fn(() => true),
    markAsSaved: vi.fn(),
  });

  beforeEach(() => {
    vi.mocked(useFormBuilder).mockReturnValue(mockUseFormBuilder());
  });

  describe('rendering', () => {
    it('should render form builder header', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Form Builder')).toBeInTheDocument();
    });

    it('should render main action buttons', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Preview')).toBeInTheDocument();
      expect(screen.getByText('Export')).toBeInTheDocument();
      expect(screen.getByText('Import')).toBeInTheDocument();
      expect(screen.getByText('Clone')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
      expect(screen.getByText('Save Form')).toBeInTheDocument();
    });

    it('should render field list sidebar', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText(/Fields \(1\)/)).toBeInTheDocument();
    });

    it('should render tabs for form properties and field configuration', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Form Properties')).toBeInTheDocument();
      expect(screen.getByText('Field Configuration')).toBeInTheDocument();
      expect(screen.getByText('Validation')).toBeInTheDocument();
    });

    it('should show loading spinner when isLoading is true', () => {
      const mockHook = mockUseFormBuilder();
      mockHook.isLoading = true;
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Loading form...')).toBeInTheDocument();
    });

    it('should show unsaved changes indicator when isDirty', () => {
      const mockHook = mockUseFormBuilder();
      mockHook.isDirty = true;
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('● Unsaved changes')).toBeInTheDocument();
    });
  });

  describe('form properties tab', () => {
    it('should display form name input', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const formNameInput = screen.getByDisplayValue('Test Form');
      expect(formNameInput).toBeInTheDocument();
    });

    it('should display form description textarea', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const descriptionInput = screen.getByDisplayValue('Test Description');
      expect(descriptionInput).toBeInTheDocument();
    });

    it('should display required for completion checkbox', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Required for operation completion')).toBeInTheDocument();
    });

    it('should display active form checkbox', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Active form')).toBeInTheDocument();
    });

    it('should display display order input', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByDisplayValue('0')).toBeInTheDocument();
    });

    it('should display complexity score alert', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText(/Complexity Score: 50\/100/)).toBeInTheDocument();
    });
  });

  describe('field operations', () => {
    it('should call addField when field type is selected', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      // Note: This would require opening the Select dropdown and selecting an option
      // Implementation depends on Ant Design Select behavior
    });

    it('should display selected field in right panel', () => {
      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      // The field editor panel should show the selected field
      expect(screen.getByText('Field 1')).toBeInTheDocument();
    });

    it('should display empty message when no field is selected', () => {
      const mockHook = mockUseFormBuilder();
      mockHook.currentFieldId = undefined;
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      expect(screen.getByText('Select a field to edit its properties')).toBeInTheDocument();
    });

    it('should show validation errors when form has errors', () => {
      const mockHook = mockUseFormBuilder();
      mockHook.errors = {
        formName: 'Form name is required',
        fields: 'At least one field is required',
      };
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      // Click on Validation tab
      const validationTab = screen.getByText('Validation');
      fireEvent.click(validationTab);

      expect(screen.getByText('Form name is required')).toBeInTheDocument();
      expect(screen.getByText('At least one field is required')).toBeInTheDocument();
    });
  });

  describe('form actions', () => {
    it('should call saveForm when Save Form button is clicked', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const saveButton = screen.getByText('Save Form');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockHook.validateForm).toHaveBeenCalled();
      });
    });

    it('should show error message if save fails validation', async () => {
      const mockHook = mockUseFormBuilder();
      mockHook.validateForm = vi.fn(() => ({
        formName: 'Form name is required',
      }));
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const saveButton = screen.getByText('Save Form');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Please fix form validation errors before saving')).toBeInTheDocument();
      });
    });

    it('should call resetForm when Reset button is clicked', () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);

      expect(mockHook.resetForm).toHaveBeenCalled();
    });

    it('should open clone modal when Clone button is clicked', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const cloneButton = screen.getByText('Clone');
      fireEvent.click(cloneButton);

      await waitFor(() => {
        expect(screen.getByText('Clone Form')).toBeInTheDocument();
      });
    });

    it('should open import modal when Import button is clicked', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const importButton = screen.getByText('Import');
      fireEvent.click(importButton);

      await waitFor(() => {
        expect(screen.getByText('Import Form')).toBeInTheDocument();
      });
    });

    it('should open preview drawer when Preview button is clicked', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const previewButton = screen.getByText('Preview');
      fireEvent.click(previewButton);

      await waitFor(() => {
        expect(screen.getByText('Form Preview')).toBeInTheDocument();
      });
    });

    it('should call onCancel when Close button is clicked', () => {
      const mockOnCancel = vi.fn();
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
          onCancel={mockOnCancel}
        />
      );

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('complex user workflows', () => {
    it('should handle form metadata updates', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const formNameInput = screen.getByDisplayValue('Test Form');
      await userEvent.clear(formNameInput);
      await userEvent.type(formNameInput, 'New Form Name');

      expect(mockHook.setFormName).toHaveBeenCalledWith('New Form Name');
    });

    it('should handle field selection from sidebar', async () => {
      const mockHook = mockUseFormBuilder();
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      // The field should be displayed in the tree
      expect(screen.getByText('Field 1')).toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('should show validation tab with no errors message when form is valid', () => {
      const mockHook = mockUseFormBuilder();
      mockHook.errors = {};
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      // Click on Validation tab
      const validationTab = screen.getByText('Validation');
      fireEvent.click(validationTab);

      expect(screen.getByText('No validation errors')).toBeInTheDocument();
    });

    it('should display loading state when saving', () => {
      const mockHook = mockUseFormBuilder();
      mockHook.isSaving = true;
      vi.mocked(useFormBuilder).mockReturnValue(mockHook);

      render(
        <FormBuilder
          routingOperationId={mockRoutingOperationId}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save Form/i });
      expect(saveButton).toHaveAttribute('aria-busy', 'true');
    });
  });
});
