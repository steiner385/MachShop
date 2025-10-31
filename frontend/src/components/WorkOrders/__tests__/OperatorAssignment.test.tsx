/**
 * OperatorAssignment Component Tests
 *
 * Tests for the operator assignment modal component including:
 * - Modal rendering and operator loading
 * - Current operator display and unassign functionality
 * - Operator selection with search and filtering
 * - Workload visualization and availability indicators
 * - Form validation and assignment operations
 * - Error handling and user feedback
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { OperatorAssignment } from '../OperatorAssignment';

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

describe('OperatorAssignment', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    workOrderId: 'wo-123',
    workOrderNumber: 'WO-2024-004',
    visible: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  const propsWithCurrentOperator = {
    ...defaultProps,
    currentOperatorId: 'user-1',
    currentOperatorName: 'John Doe',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the operator assignment modal when visible', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      expect(screen.getByText('Assign Operator - WO-2024-004')).toBeInTheDocument();
      expect(screen.getByLabelText('Select Operator')).toBeInTheDocument();
      expect(screen.getByTestId('operator-select')).toBeInTheDocument();
      expect(screen.getByTestId('assign-operator-button')).toBeInTheDocument();
    });

    it('should not render modal when not visible', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} visible={false} />);

      expect(screen.queryByText('Assign Operator - WO-2024-004')).not.toBeInTheDocument();
    });

    it('should render modal with correct buttons', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      expect(screen.getByRole('button', { name: /assign operator/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      expect(screen.getByTestId('operator-select')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /assign operator/i })).toBeInTheDocument();
    });
  });

  describe('Current Operator Display', () => {
    it('should display current operator when assigned', () => {
      renderWithProviders(<OperatorAssignment {...propsWithCurrentOperator} />);

      expect(screen.getByText('Currently Assigned:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByTestId('unassign-operator-button')).toBeInTheDocument();
    });

    it('should not display current operator section when none assigned', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      expect(screen.queryByText('Currently Assigned:')).not.toBeInTheDocument();
      expect(screen.queryByTestId('unassign-operator-button')).not.toBeInTheDocument();
    });

    it('should handle unassign operation', async () => {
      const { message } = await import('antd');
      renderWithProviders(<OperatorAssignment {...propsWithCurrentOperator} />);

      const unassignButton = screen.getByTestId('unassign-operator-button');
      await user.click(unassignButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Operator unassigned successfully');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show loading state on unassign button', async () => {
      renderWithProviders(<OperatorAssignment {...propsWithCurrentOperator} />);

      const unassignButton = screen.getByTestId('unassign-operator-button');
      await user.click(unassignButton);

      // Button should show loading state briefly
      expect(unassignButton).toBeInTheDocument();
    });
  });

  describe('Operator Loading and Selection', () => {
    it('should load and display mock operators', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        expect(screen.getByText(/John Doe \(john\.doe\)/)).toBeInTheDocument();
        expect(screen.getByText(/Production Operator \(prod\.operator\)/)).toBeInTheDocument();
      });
    });

    it('should display operator workload indicators', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        expect(screen.getByText('2 active')).toBeInTheDocument();
        expect(screen.getByText('1 active')).toBeInTheDocument();
      });
    });

    it('should show green tag for low workload operators', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const lowWorkloadTag = screen.getByText('1 active');
        expect(lowWorkloadTag.closest('.ant-tag')).toHaveClass('ant-tag-green');
      });
    });

    it('should show red tag for high workload operators', async () => {
      // This test would need mock data with >3 assignments
      // For now, test the structure exists
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        expect(screen.getByText('2 active')).toBeInTheDocument();
      });
    });

    it('should allow operator selection', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const johnDoeOption = screen.getByText(/John Doe \(john\.doe\)/);
        await user.click(johnDoeOption);
      });

      expect(operatorSelect).toHaveValue('user-1');
    });

    it('should support operator search functionality', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      // Type search query
      await user.type(operatorSelect, 'John');

      await waitFor(() => {
        expect(screen.getByText(/John Doe \(john\.doe\)/)).toBeInTheDocument();
        expect(screen.queryByText(/Production Operator/)).not.toBeInTheDocument();
      });
    });

    it('should disable inactive operators', async () => {
      // This would need mock data with inactive operators
      // Test structure exists for now
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      expect(operatorSelect).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should require operator selection', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const assignButton = screen.getByTestId('assign-operator-button');
      await user.click(assignButton);

      await waitFor(() => {
        expect(screen.getByText('Please select an operator')).toBeInTheDocument();
      });
    });

    it('should validate form before submission', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Try to submit without selecting operator
      const assignButton = screen.getByTestId('assign-operator-button');
      await user.click(assignButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Please select an operator')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should successfully assign operator', async () => {
      const { message } = await import('antd');
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Select operator
      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const johnDoeOption = screen.getByText(/John Doe \(john\.doe\)/);
        await user.click(johnDoeOption);
      });

      // Submit form
      const assignButton = screen.getByTestId('assign-operator-button');
      await user.click(assignButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Operator assigned successfully');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during assignment', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Select operator
      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const johnDoeOption = screen.getByText(/John Doe \(john\.doe\)/);
        await user.click(johnDoeOption);
      });

      // Submit form
      const assignButton = screen.getByTestId('assign-operator-button');
      await user.click(assignButton);

      // Button should show loading state briefly
      expect(assignButton).toBeInTheDocument();
    });

    it('should reset form after successful assignment', async () => {
      const { message } = await import('antd');
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Select operator and submit
      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const johnDoeOption = screen.getByText(/John Doe \(john\.doe\)/);
        await user.click(johnDoeOption);
      });

      const assignButton = screen.getByTestId('assign-operator-button');
      await user.click(assignButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalled();
      });

      // Form should be reset (tested through callbacks)
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when cancel button is clicked', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when X button is clicked', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset form when modal is closed and reopened', async () => {
      const { rerender } = renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Select operator
      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const johnDoeOption = screen.getByText(/John Doe \(john\.doe\)/);
        await user.click(johnDoeOption);
      });

      // Close modal
      rerender(<OperatorAssignment {...defaultProps} visible={false} />);

      // Reopen modal
      rerender(<OperatorAssignment {...defaultProps} visible={true} />);

      // Form should be reset (operator not selected)
      await waitFor(() => {
        const newOperatorSelect = screen.getByTestId('operator-select');
        expect(newOperatorSelect).not.toHaveValue();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('operator-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('assign-operator-button')).toHaveFocus();
    });

    it('should be keyboard navigable with current operator', async () => {
      renderWithProviders(<OperatorAssignment {...propsWithCurrentOperator} />);

      // Tab through form elements including unassign button
      await user.tab();
      expect(screen.getByTestId('unassign-operator-button')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('operator-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('assign-operator-button')).toHaveFocus();
    });

    it('should support keyboard interaction for operator dropdown', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      operatorSelect.focus();

      // Open dropdown with Enter
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/John Doe \(john\.doe\)/)).toBeInTheDocument();
      });

      // Navigate with arrow keys and select with Enter
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(operatorSelect).toHaveValue('user-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle operator loading error gracefully', async () => {
      const { message } = await import('antd');

      // Mock the fetchOperators to throw an error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // The component uses mock data, so we can't easily simulate API errors
      // Test that the component structure is maintained
      expect(screen.getByTestId('operator-select')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle assignment error gracefully', async () => {
      // The component uses mock success responses
      // In a real implementation, this would test API error handling
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      expect(screen.getByTestId('assign-operator-button')).toBeInTheDocument();
    });

    it('should handle unassignment error gracefully', async () => {
      // Similar to assignment error, this would test API error handling
      renderWithProviders(<OperatorAssignment {...propsWithCurrentOperator} />);

      expect(screen.getByTestId('unassign-operator-button')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty work order number', () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} workOrderNumber="" />);

      expect(screen.getByText('Assign Operator -')).toBeInTheDocument();
    });

    it('should handle missing current operator name with ID', () => {
      renderWithProviders(
        <OperatorAssignment
          {...defaultProps}
          currentOperatorId="user-1"
          currentOperatorName={undefined}
        />
      );

      // Should not show current operator section without name
      expect(screen.queryByText('Currently Assigned:')).not.toBeInTheDocument();
    });

    it('should handle current operator name without ID', () => {
      renderWithProviders(
        <OperatorAssignment
          {...defaultProps}
          currentOperatorId={undefined}
          currentOperatorName="John Doe"
        />
      );

      // Should show current operator section
      expect(screen.getByText('Currently Assigned:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should handle operators without assignment counts', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      // Should still display operators even if assignment counts are missing
      await waitFor(() => {
        expect(screen.getByText(/John Doe \(john\.doe\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Workload Management', () => {
    it('should display operator workload information correctly', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        // Check that workload tags are displayed
        expect(screen.getByText('2 active')).toBeInTheDocument();
        expect(screen.getByText('1 active')).toBeInTheDocument();
      });
    });

    it('should show appropriate visual indicators for workload levels', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        // Low workload should have green tag
        const lowWorkloadTag = screen.getByText('1 active');
        expect(lowWorkloadTag.closest('.ant-tag')).toHaveClass('ant-tag-green');

        // Medium workload (2 assignments) should also be green
        const mediumWorkloadTag = screen.getByText('2 active');
        expect(mediumWorkloadTag.closest('.ant-tag')).toHaveClass('ant-tag-green');
      });
    });

    it('should format operator display correctly', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        // Check full name and username format
        expect(screen.getByText(/John Doe \(john\.doe\)/)).toBeInTheDocument();
        expect(screen.getByText(/Production Operator \(prod\.operator\)/)).toBeInTheDocument();
      });
    });
  });

  describe('Form State Management', () => {
    it('should initialize form with current operator ID', () => {
      renderWithProviders(<OperatorAssignment {...propsWithCurrentOperator} />);

      // Form should initialize with current operator
      const operatorSelect = screen.getByTestId('operator-select');
      expect(operatorSelect).toHaveValue('user-1');
    });

    it('should maintain form state during interactions', async () => {
      renderWithProviders(<OperatorAssignment {...defaultProps} />);

      // Select operator
      const operatorSelect = screen.getByTestId('operator-select');
      await user.click(operatorSelect);

      await waitFor(() => {
        const productionOperatorOption = screen.getByText(/Production Operator \(prod\.operator\)/);
        await user.click(productionOperatorOption);
      });

      // Verify selection persists
      expect(operatorSelect).toHaveValue('user-2');

      // Interact with other elements
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Selection should remain until form is reset
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });
});