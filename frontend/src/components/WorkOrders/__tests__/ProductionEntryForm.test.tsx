/**
 * ProductionEntryForm Component Tests
 *
 * Tests for the production entry form component including:
 * - Dynamic form behavior based on entry type (complete/scrap/rework)
 * - Complex quantity validation with business rules
 * - Conditional reason code requirements
 * - ISO 10303-224 compliant scrap reason codes
 * - Form submission and error handling
 * - Real-time quantity tracking and validation
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { ProductionEntryForm, ProductionEntryValues } from '../ProductionEntryForm';

// Mock message from antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
    },
  };
});

describe('ProductionEntryForm', () => {
  const user = userEvent.setup();
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    workOrderId: 'wo-123',
    operationNumber: 10,
    orderedQuantity: 100,
    completedQuantity: 20,
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the production entry form', () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      expect(screen.getByTestId('production-entry-form')).toBeInTheDocument();
      expect(screen.getByText('Production Entry')).toBeInTheDocument();
      expect(screen.getByText('Remaining: 80 units | Completed: 20 units')).toBeInTheDocument();
      expect(screen.getByLabelText('Entry Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes')).toBeInTheDocument();
    });

    it('should display correct quantity calculations', () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      expect(screen.getByText('Remaining: 80 units | Completed: 20 units')).toBeInTheDocument();
    });

    it('should render with cancel button when onCancel is provided', () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should render without cancel button when onCancel is not provided', () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} onCancel={undefined} />);

      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument();
    });

    it('should have default entry type of complete', () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const entryTypeSelect = screen.getByTestId('entry-type-select');
      expect(entryTypeSelect).toHaveValue('complete');
    });
  });

  describe('Entry Type Selection', () => {
    it('should display all entry type options', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);

      expect(screen.getByText('Complete (Good Parts)')).toBeInTheDocument();
      expect(screen.getByText('Scrap (Non-Repairable)')).toBeInTheDocument();
      expect(screen.getByText('Rework (Repairable)')).toBeInTheDocument();
    });

    it('should change entry type and reset quantity', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Enter quantity first
      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '10');

      // Change entry type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      // Quantity should be reset
      const newQuantityInput = screen.getByTestId('scrap-quantity-input');
      expect(newQuantityInput).toHaveValue(null);
    });

    it('should update quantity input test id based on entry type', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Default complete type
      expect(screen.getByTestId('complete-quantity-input')).toBeInTheDocument();

      // Change to scrap
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      expect(screen.getByTestId('scrap-quantity-input')).toBeInTheDocument();
      expect(screen.queryByTestId('complete-quantity-input')).not.toBeInTheDocument();
    });

    it('should update submit button text and icon based on entry type', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Default complete type
      expect(screen.getByText('Record Completion')).toBeInTheDocument();

      // Change to scrap
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      expect(screen.getByText('Record Scrap')).toBeInTheDocument();
    });
  });

  describe('Quantity Validation', () => {
    it('should require quantity input', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter quantity')).toBeInTheDocument();
      });
    });

    it('should validate quantity greater than zero', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '0');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Quantity must be greater than zero')).toBeInTheDocument();
      });
    });

    it('should prevent negative quantities', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '-5');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Negative quantities are not allowed')).toBeInTheDocument();
      });
    });

    it('should validate complete quantity against remaining quantity', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '90'); // More than remaining (80)

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Quantity cannot exceed remaining quantity (80)')).toBeInTheDocument();
      });
    });

    it('should validate scrap quantity against completed quantity', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to scrap
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      const quantityInput = screen.getByTestId('scrap-quantity-input');
      await user.type(quantityInput, '25'); // More than completed (20)

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Quantity cannot exceed completed quantity (20)')).toBeInTheDocument();
      });
    });

    it('should validate rework quantity against completed quantity', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to rework
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Rework (Repairable)'));

      const quantityInput = screen.getByTestId('rework-quantity-input');
      await user.type(quantityInput, '25'); // More than completed (20)

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Quantity cannot exceed completed quantity (20)')).toBeInTheDocument();
      });
    });

    it('should set correct max values for quantity input', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Complete type should have max of remaining quantity (80)
      const completeInput = screen.getByTestId('complete-quantity-input');
      expect(completeInput).toHaveAttribute('max', '80');

      // Change to scrap
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      // Scrap type should have max of completed quantity (20)
      const scrapInput = screen.getByTestId('scrap-quantity-input');
      expect(scrapInput).toHaveAttribute('max', '20');
    });
  });

  describe('Scrap Reason Codes', () => {
    beforeEach(async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to scrap type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));
    });

    it('should show scrap reason field for scrap entry type', () => {
      expect(screen.getByLabelText('Scrap Reason Code')).toBeInTheDocument();
      expect(screen.getByTestId('scrap-reason-select')).toBeInTheDocument();
    });

    it('should display all ISO 10303-224 compliant scrap reason codes', async () => {
      const scrapReasonSelect = screen.getByTestId('scrap-reason-select');
      await user.click(scrapReasonSelect);

      expect(screen.getByText('Material Defect')).toBeInTheDocument();
      expect(screen.getByText('Dimension Out of Specification')).toBeInTheDocument();
      expect(screen.getByText('Surface Finish Reject')).toBeInTheDocument();
      expect(screen.getByText('Tool Breakage/Damage')).toBeInTheDocument();
      expect(screen.getByText('Operator Error')).toBeInTheDocument();
      expect(screen.getByText('Machine Malfunction')).toBeInTheDocument();
      expect(screen.getByText('Improper Setup')).toBeInTheDocument();
      expect(screen.getByText('Foreign Object Damage (FOD)')).toBeInTheDocument();
      expect(screen.getByText('Heat Treatment Failure')).toBeInTheDocument();
      expect(screen.getByText('Coating Defect')).toBeInTheDocument();
      expect(screen.getByText('Other (See Notes)')).toBeInTheDocument();
    });

    it('should require scrap reason code selection', async () => {
      const quantityInput = screen.getByTestId('scrap-quantity-input');
      await user.type(quantityInput, '5');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Scrap reason code is required')).toBeInTheDocument();
      });
    });

    it('should allow selecting scrap reason codes', async () => {
      const scrapReasonSelect = screen.getByTestId('scrap-reason-select');
      await user.click(scrapReasonSelect);
      await user.click(screen.getByText('Material Defect'));

      expect(scrapReasonSelect).toHaveValue('MATERIAL_DEFECT');
    });
  });

  describe('Rework Reason Codes', () => {
    beforeEach(async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to rework type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Rework (Repairable)'));
    });

    it('should show rework reason field for rework entry type', () => {
      expect(screen.getByLabelText('Rework Reason Code')).toBeInTheDocument();
      expect(screen.getByTestId('rework-reason-select')).toBeInTheDocument();
    });

    it('should display all rework reason codes', async () => {
      const reworkReasonSelect = screen.getByTestId('rework-reason-select');
      await user.click(reworkReasonSelect);

      expect(screen.getByText('Dimension Undersize (Rework Possible)')).toBeInTheDocument();
      expect(screen.getByText('Burr Removal Required')).toBeInTheDocument();
      expect(screen.getByText('Surface Rework Required')).toBeInTheDocument();
      expect(screen.getByText('Recoating Required')).toBeInTheDocument();
      expect(screen.getByText('Assembly Defect - Rework')).toBeInTheDocument();
      expect(screen.getByText('Other (See Notes)')).toBeInTheDocument();
    });

    it('should require rework reason code selection', async () => {
      const quantityInput = screen.getByTestId('rework-quantity-input');
      await user.type(quantityInput, '5');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rework reason code is required')).toBeInTheDocument();
      });
    });

    it('should allow selecting rework reason codes', async () => {
      const reworkReasonSelect = screen.getByTestId('rework-reason-select');
      await user.click(reworkReasonSelect);
      await user.click(screen.getByText('Burr Removal Required'));

      expect(reworkReasonSelect).toHaveValue('BURR_REMOVAL');
    });
  });

  describe('Notes Field', () => {
    it('should allow entering notes for any entry type', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Additional production notes');

      expect(notesTextarea).toHaveValue('Additional production notes');
    });

    it('should require notes when "Other" scrap reason is selected', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to scrap type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      // Select "Other" reason
      const scrapReasonSelect = screen.getByTestId('scrap-reason-select');
      await user.click(scrapReasonSelect);
      await user.click(screen.getByText('Other (See Notes)'));

      // Fill quantity but not notes
      const quantityInput = screen.getByTestId('scrap-quantity-input');
      await user.type(quantityInput, '5');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Notes are required for "Other" reason code')).toBeInTheDocument();
      });
    });

    it('should not require notes for non-"Other" reason codes', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to scrap type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      // Select non-"Other" reason
      const scrapReasonSelect = screen.getByTestId('scrap-reason-select');
      await user.click(scrapReasonSelect);
      await user.click(screen.getByText('Material Defect'));

      // Fill quantity
      const quantityInput = screen.getByTestId('scrap-quantity-input');
      await user.type(quantityInput, '5');

      // Should be able to submit without notes
      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'scrap',
          quantity: 5,
          scrapReasonCode: 'MATERIAL_DEFECT',
          notes: undefined,
        });
      });
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit complete entry', async () => {
      const { message } = await import('antd');
      mockOnSubmit.mockResolvedValueOnce(undefined);

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '50');

      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Production completed successfully');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'complete',
          quantity: 50,
          notes: 'Production completed successfully',
        });
      });

      expect(message.success).toHaveBeenCalledWith('Completion recorded successfully');
    });

    it('should successfully submit scrap entry with all fields', async () => {
      const { message } = await import('antd');
      mockOnSubmit.mockResolvedValueOnce(undefined);

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to scrap type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      // Fill form
      const quantityInput = screen.getByTestId('scrap-quantity-input');
      await user.type(quantityInput, '3');

      const scrapReasonSelect = screen.getByTestId('scrap-reason-select');
      await user.click(scrapReasonSelect);
      await user.click(screen.getByText('Tool Breakage/Damage'));

      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Drill bit broke during operation');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'scrap',
          quantity: 3,
          scrapReasonCode: 'TOOL_BREAKAGE',
          notes: 'Drill bit broke during operation',
        });
      });

      expect(message.success).toHaveBeenCalledWith('Scrap recorded successfully');
    });

    it('should successfully submit rework entry', async () => {
      const { message } = await import('antd');
      mockOnSubmit.mockResolvedValueOnce(undefined);

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Change to rework type
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Rework (Repairable)'));

      // Fill form
      const quantityInput = screen.getByTestId('rework-quantity-input');
      await user.type(quantityInput, '2');

      const reworkReasonSelect = screen.getByTestId('rework-reason-select');
      await user.click(reworkReasonSelect);
      await user.click(screen.getByText('Surface Rework Required'));

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          type: 'rework',
          quantity: 2,
          reworkReasonCode: 'SURFACE_REWORK',
          notes: undefined,
        });
      });

      expect(message.success).toHaveBeenCalledWith('Rework recorded successfully');
    });

    it('should handle submission error gracefully', async () => {
      const { message } = await import('antd');
      const error = new Error('Submission failed');
      mockOnSubmit.mockRejectedValueOnce(error);

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '10');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to record complete: Submission failed');
      });
    });

    it('should show loading state during submission', async () => {
      let resolveSubmit: (value: any) => void;
      const submitPromise = new Promise((resolve) => {
        resolveSubmit = resolve;
      });
      mockOnSubmit.mockReturnValueOnce(submitPromise);

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '10');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      // Button should show loading state
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      resolveSubmit!(undefined);

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });

    it('should reset form after successful submission', async () => {
      const { message } = await import('antd');
      mockOnSubmit.mockResolvedValueOnce(undefined);

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '10');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalled();
      });

      // Form should be reset
      expect(quantityInput).toHaveValue(null);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const cancelButton = screen.getByTestId('cancel-button');
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero completed quantity', () => {
      renderWithProviders(
        <ProductionEntryForm
          {...defaultProps}
          completedQuantity={0}
        />
      );

      expect(screen.getByText('Remaining: 100 units | Completed: 0 units')).toBeInTheDocument();
    });

    it('should handle equal ordered and completed quantities', () => {
      renderWithProviders(
        <ProductionEntryForm
          {...defaultProps}
          completedQuantity={100}
        />
      );

      expect(screen.getByText('Remaining: 0 units | Completed: 100 units')).toBeInTheDocument();
    });

    it('should handle very large quantities', () => {
      renderWithProviders(
        <ProductionEntryForm
          {...defaultProps}
          orderedQuantity={10000}
          completedQuantity={2500}
        />
      );

      expect(screen.getByText('Remaining: 7500 units | Completed: 2500 units')).toBeInTheDocument();
    });

    it('should handle submission with unknown error', async () => {
      const { message } = await import('antd');
      mockOnSubmit.mockRejectedValueOnce('Unknown error type');

      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const quantityInput = screen.getByTestId('complete-quantity-input');
      await user.type(quantityInput, '10');

      const submitButton = screen.getByTestId('submit-production-entry-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to record complete: Unknown error');
      });
    });
  });

  describe('Dynamic UI Behavior', () => {
    it('should update placeholder text based on entry type', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      // Complete type
      const completeInput = screen.getByTestId('complete-quantity-input');
      expect(completeInput).toHaveAttribute('placeholder', 'Enter quantity (max: 80)');

      // Change to scrap
      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      const scrapInput = screen.getByTestId('scrap-quantity-input');
      expect(scrapInput).toHaveAttribute('placeholder', 'Enter quantity (max: 20)');
    });

    it('should hide reason fields for complete entry type', () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      expect(screen.queryByTestId('scrap-reason-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('rework-reason-select')).not.toBeInTheDocument();
    });

    it('should show only scrap reason field for scrap entry type', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Scrap (Non-Repairable)'));

      expect(screen.getByTestId('scrap-reason-select')).toBeInTheDocument();
      expect(screen.queryByTestId('rework-reason-select')).not.toBeInTheDocument();
    });

    it('should show only rework reason field for rework entry type', async () => {
      renderWithProviders(<ProductionEntryForm {...defaultProps} />);

      const entryTypeSelect = screen.getByTestId('entry-type-select');
      await user.click(entryTypeSelect);
      await user.click(screen.getByText('Rework (Repairable)'));

      expect(screen.getByTestId('rework-reason-select')).toBeInTheDocument();
      expect(screen.queryByTestId('scrap-reason-select')).not.toBeInTheDocument();
    });
  });
});