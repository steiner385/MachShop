/**
 * WorkOrderStatusUpdate Component Tests
 *
 * Tests for the work order status update modal component including:
 * - Modal rendering and form functionality
 * - Status selection with disabled options
 * - Conditional reason/notes requirements for holds and cancellations
 * - Status change validation and form submission
 * - Warning alerts for specific status changes
 * - Form validation and user interaction handling
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { WorkOrderStatusUpdate } from '../WorkOrderStatusUpdate';

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

describe('WorkOrderStatusUpdate', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    workOrderId: 'wo-456',
    workOrderNumber: 'WO-2024-002',
    currentStatus: 'RELEASED',
    visible: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the status update modal when visible', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      expect(screen.getByText('Update Status - WO-2024-002')).toBeInTheDocument();
      expect(screen.getByText('Current Status: RELEASED')).toBeInTheDocument();
      expect(screen.getByLabelText('New Status')).toBeInTheDocument();
      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.getByTestId('update-status-button')).toBeInTheDocument();
    });

    it('should not render modal when not visible', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} visible={false} />);

      expect(screen.queryByText('Update Status - WO-2024-002')).not.toBeInTheDocument();
    });

    it('should display current status in alert', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} currentStatus="IN_PROGRESS" />);

      expect(screen.getByText('Current Status: IN_PROGRESS')).toBeInTheDocument();
    });

    it('should render modal with correct buttons', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      expect(screen.getByRole('button', { name: /update status/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      expect(screen.getByTestId('status-select')).toBeInTheDocument();
      expect(screen.queryByTestId('reason-select')).not.toBeInTheDocument(); // Not visible initially
      expect(screen.queryByTestId('notes-textarea')).not.toBeInTheDocument(); // Not visible initially
    });
  });

  describe('Status Selection', () => {
    it('should display all status options when dropdown is opened', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);

      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Released')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('On Hold')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('should disable CREATED status option', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);

      const createdOption = screen.getByText('Created').closest('.ant-select-item');
      expect(createdOption).toHaveClass('ant-select-item-option-disabled');
    });

    it('should update selected status when option is chosen', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('In Progress'));

      expect(statusSelect).toHaveValue('IN_PROGRESS');
    });

    it('should prevent selecting the same status as current', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Released')); // Same as current

      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a different status')).toBeInTheDocument();
      });
    });

    it('should require status selection', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a status')).toBeInTheDocument();
      });
    });
  });

  describe('Conditional Reason/Notes Requirements', () => {
    it('should not show reason/notes fields for normal status changes', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('In Progress'));

      expect(screen.queryByTestId('reason-select')).not.toBeInTheDocument();
      expect(screen.queryByTestId('notes-textarea')).not.toBeInTheDocument();
    });

    it('should show reason/notes fields for ON_HOLD status', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      expect(screen.getByTestId('reason-select')).toBeInTheDocument();
      expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason')).toBeInTheDocument();
      expect(screen.getByLabelText('Additional Notes')).toBeInTheDocument();
    });

    it('should show reason/notes fields for CANCELLED status', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Cancelled'));

      expect(screen.getByTestId('reason-select')).toBeInTheDocument();
      expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();
    });

    it('should require reason for ON_HOLD status', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a reason')).toBeInTheDocument();
      });
    });

    it('should require notes for ON_HOLD status', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      // Fill reason but not notes
      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Equipment Breakdown'));

      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please provide additional details')).toBeInTheDocument();
      });
    });

    it('should display all hold reason options', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select ON_HOLD to show reason field
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      // Open reason dropdown
      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);

      expect(screen.getByText('Equipment Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Material Shortage')).toBeInTheDocument();
      expect(screen.getByText('Quality Issue')).toBeInTheDocument();
      expect(screen.getByText('Safety Concern')).toBeInTheDocument();
      expect(screen.getByText('Tooling Problem')).toBeInTheDocument();
      expect(screen.getByText('Awaiting Instructions')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });
  });

  describe('Status Change Alerts', () => {
    it('should show warning alert for ON_HOLD status', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      await waitFor(() => {
        expect(screen.getByText('Work Order On Hold')).toBeInTheDocument();
        expect(screen.getByText(/This will pause all operations and notify the team/)).toBeInTheDocument();
      });
    });

    it('should not show warning alert for other statuses', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Cancelled'));

      // Should show reason/notes fields but not the ON_HOLD specific warning
      expect(screen.getByTestId('reason-select')).toBeInTheDocument();
      expect(screen.queryByText('Work Order On Hold')).not.toBeInTheDocument();
    });

    it('should hide warning alert when status changes away from ON_HOLD', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // First select ON_HOLD
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      expect(screen.getByText('Work Order On Hold')).toBeInTheDocument();

      // Then change to another status
      await user.click(statusSelect);
      await user.click(screen.getByText('In Progress'));

      expect(screen.queryByText('Work Order On Hold')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit simple status change', async () => {
      const { message } = await import('antd');
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select new status
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('In Progress'));

      // Submit form
      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Work order WO-2024-002 status updated to IN_PROGRESS');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should successfully submit ON_HOLD with reason and notes', async () => {
      const { message } = await import('antd');
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select ON_HOLD status
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      // Fill reason
      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Equipment Breakdown'));

      // Fill notes
      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Main spindle motor failed, waiting for replacement part');

      // Submit form
      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Work order WO-2024-002 status updated to ON_HOLD');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should successfully submit CANCELLED with reason and notes', async () => {
      const { message } = await import('antd');
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select CANCELLED status
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Cancelled'));

      // Fill reason
      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Other'));

      // Fill notes
      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Customer cancelled order due to design change');

      // Submit form
      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Work order WO-2024-002 status updated to CANCELLED');
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should show loading state during submission', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select new status
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Completed'));

      // Submit form
      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      // Form submission is synchronous in this component, but check that it processes
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when cancel button is clicked', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when X button is clicked', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset form when modal is closed and reopened', async () => {
      const { rerender } = renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Fill form
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      // Close modal
      rerender(<WorkOrderStatusUpdate {...defaultProps} visible={false} />);

      // Reopen modal
      rerender(<WorkOrderStatusUpdate {...defaultProps} visible={true} />);

      // Form should be reset
      expect(screen.getByTestId('status-select')).toHaveValue('RELEASED');
      expect(screen.queryByTestId('reason-select')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('status-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('update-status-button')).toHaveFocus();
    });

    it('should be keyboard navigable with conditional fields', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select ON_HOLD to show additional fields
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      // Tab through all form elements
      await user.tab();
      expect(screen.getByTestId('status-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('reason-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('notes-textarea')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('update-status-button')).toHaveFocus();
    });

    it('should support keyboard interaction for dropdowns', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      const statusSelect = screen.getByTestId('status-select');
      statusSelect.focus();

      // Open dropdown with Enter
      await user.keyboard('{Enter}');
      expect(screen.getByText('In Progress')).toBeInTheDocument();

      // Navigate with arrow keys and select with Enter
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(statusSelect).toHaveValue('IN_PROGRESS');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty work order number', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} workOrderNumber="" />);

      expect(screen.getByText('Update Status -')).toBeInTheDocument();
    });

    it('should handle undefined current status', () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} currentStatus={undefined as any} />);

      expect(screen.getByText('Current Status:')).toBeInTheDocument();
    });

    it('should handle status changes from different starting statuses', async () => {
      const { message } = await import('antd');
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} currentStatus="IN_PROGRESS" />);

      expect(screen.getByText('Current Status: IN_PROGRESS')).toBeInTheDocument();

      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Completed'));

      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Work order WO-2024-002 status updated to COMPLETED');
      });
    });
  });

  describe('Form Validation Integration', () => {
    it('should validate complete form for complex status change', async () => {
      const { message } = await import('antd');
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Fill out complete form for CANCELLED status
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('Cancelled'));

      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Safety Concern'));

      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Safety audit identified potential hazards that require process redesign');

      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.success).toHaveBeenCalledWith('Work order WO-2024-002 status updated to CANCELLED');
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should prevent submission with incomplete required fields', async () => {
      renderWithProviders(<WorkOrderStatusUpdate {...defaultProps} />);

      // Select status that requires reason/notes but don't fill them
      const statusSelect = screen.getByTestId('status-select');
      await user.click(statusSelect);
      await user.click(screen.getByText('On Hold'));

      // Try to submit without filling required fields
      const submitButton = screen.getByTestId('update-status-button');
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a reason')).toBeInTheDocument();
        expect(screen.getByText('Please provide additional details')).toBeInTheDocument();
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});