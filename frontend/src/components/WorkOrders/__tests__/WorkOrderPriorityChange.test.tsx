/**
 * WorkOrderPriorityChange Component Tests
 *
 * Tests for the work order priority change modal component including:
 * - Modal rendering and form functionality
 * - Priority selection with validation
 * - Conditional reason requirements for high/urgent priorities
 * - API integration for priority updates
 * - Visual alerts and user feedback
 * - Form validation and submission handling
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { WorkOrderPriorityChange } from '../WorkOrderPriorityChange';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(() => 'mock-token'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

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

describe('WorkOrderPriorityChange', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    workOrderId: 'wo-123',
    workOrderNumber: 'WO-2024-001',
    currentPriority: 'NORMAL',
    visible: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the priority change modal when visible', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      expect(screen.getByText('Change Priority - WO-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Current Priority: NORMAL')).toBeInTheDocument();
      expect(screen.getByLabelText('New Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Reason for Change')).toBeInTheDocument();
      expect(screen.getByLabelText('Additional Notes')).toBeInTheDocument();
    });

    it('should not render modal when not visible', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} visible={false} />);

      expect(screen.queryByText('Change Priority - WO-2024-001')).not.toBeInTheDocument();
    });

    it('should display current priority in alert', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} currentPriority="HIGH" />);

      expect(screen.getByText('Current Priority: HIGH')).toBeInTheDocument();
    });

    it('should render modal with correct buttons', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      expect(screen.getByRole('button', { name: /update priority/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should have proper form structure', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      expect(screen.getByTestId('priority-select')).toBeInTheDocument();
      expect(screen.getByTestId('reason-select')).toBeInTheDocument();
      expect(screen.getByTestId('notes-textarea')).toBeInTheDocument();
    });
  });

  describe('Priority Selection', () => {
    it('should display all priority options when dropdown is opened', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);

      expect(screen.getByText('Low')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
    });

    it('should update selected priority when option is chosen', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      // Priority should be selected
      expect(prioritySelect).toHaveValue('HIGH');
    });

    it('should prevent selecting the same priority as current', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Normal')); // Same as current

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a different priority')).toBeInTheDocument();
      });
    });

    it('should require priority selection', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a priority')).toBeInTheDocument();
      });
    });
  });

  describe('Reason Requirements', () => {
    it('should not require reason for LOW priority', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Low'));

      const reasonSelect = screen.getByTestId('reason-select');
      expect(reasonSelect).toBeDisabled();
    });

    it('should not require reason for NORMAL priority', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} currentPriority="HIGH" />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Normal'));

      const reasonSelect = screen.getByTestId('reason-select');
      expect(reasonSelect).toBeDisabled();
    });

    it('should require reason for HIGH priority', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      const reasonSelect = screen.getByTestId('reason-select');
      expect(reasonSelect).not.toBeDisabled();

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a reason for high/urgent priority')).toBeInTheDocument();
      });
    });

    it('should require reason for URGENT priority', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Urgent'));

      const reasonSelect = screen.getByTestId('reason-select');
      expect(reasonSelect).not.toBeDisabled();

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a reason for high/urgent priority')).toBeInTheDocument();
      });
    });

    it('should display all reason options when reason dropdown is opened', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Select HIGH priority to enable reason field
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      // Open reason dropdown
      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);

      expect(screen.getByText('Customer Request')).toBeInTheDocument();
      expect(screen.getByText('Equipment Availability')).toBeInTheDocument();
      expect(screen.getByText('Material Availability')).toBeInTheDocument();
      expect(screen.getByText('Capacity Balancing')).toBeInTheDocument();
      expect(screen.getByText('Hot Job - Rush Order')).toBeInTheDocument();
      expect(screen.getByText('Delivery Date Change')).toBeInTheDocument();
      expect(screen.getByText('Production Schedule Optimization')).toBeInTheDocument();
      expect(screen.getByText('Other')).toBeInTheDocument();
    });
  });

  describe('Priority Alerts', () => {
    it('should show urgent priority warning for URGENT selection', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Urgent'));

      await waitFor(() => {
        expect(screen.getByText('Urgent Priority - Hot Job')).toBeInTheDocument();
        expect(screen.getByText(/This work order will be expedited and may interrupt current production/)).toBeInTheDocument();
      });
    });

    it('should show high priority info for HIGH selection', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      await waitFor(() => {
        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText(/This work order will be prioritized in the production schedule/)).toBeInTheDocument();
      });
    });

    it('should not show priority alerts for LOW/NORMAL selection', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Low'));

      await waitFor(() => {
        expect(screen.queryByText('High Priority')).not.toBeInTheDocument();
        expect(screen.queryByText('Urgent Priority - Hot Job')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit priority change', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Select new priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      // Select reason
      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Customer Request'));

      // Add notes
      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Urgent customer requirement');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/workorders/wo-123',
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer mock-token',
            },
            body: JSON.stringify({
              priority: 'HIGH',
            }),
          }
        );
      });

      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should handle API error gracefully', async () => {
      const { message } = await import('antd');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Failed to update priority' }),
      });

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Select new priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Low'));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to update priority');
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      const { message } = await import('antd');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Select new priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Low'));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('should show loading state during submission', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(fetchPromise);

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Select new priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Low'));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      // Check loading state
      expect(submitButton).toBeDisabled();

      // Resolve the promise
      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal when cancel button is clicked', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when X button is clicked', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset form when modal is closed and reopened', async () => {
      const { rerender } = renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Fill form
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      // Close modal
      rerender(<WorkOrderPriorityChange {...defaultProps} visible={false} />);

      // Reopen modal
      rerender(<WorkOrderPriorityChange {...defaultProps} visible={true} />);

      // Form should be reset
      expect(screen.getByTestId('priority-select')).toHaveValue('NORMAL');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('priority-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('reason-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('notes-textarea')).toHaveFocus();
    });

    it('should support keyboard interaction for dropdowns', async () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      prioritySelect.focus();

      // Open dropdown with Enter
      await user.keyboard('{Enter}');
      expect(screen.getByText('Low')).toBeInTheDocument();

      // Navigate with arrow keys and select with Enter
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(prioritySelect).toHaveValue('LOW');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing token gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);
      const { message } = await import('antd');

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Select new priority and submit
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Low'));

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/workorders/wo-123',
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer null',
            }),
          })
        );
      });
    });

    it('should handle empty work order number', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} workOrderNumber="" />);

      expect(screen.getByText('Change Priority -')).toBeInTheDocument();
    });

    it('should handle undefined current priority', () => {
      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} currentPriority={undefined as any} />);

      expect(screen.getByText('Current Priority:')).toBeInTheDocument();
    });
  });

  describe('Form Validation Integration', () => {
    it('should validate form with complete HIGH priority data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Fill out complete form for HIGH priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Equipment Availability'));

      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Machine breakdown requires priority adjustment');

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should validate form with complete URGENT priority data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithProviders(<WorkOrderPriorityChange {...defaultProps} />);

      // Fill out complete form for URGENT priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('Urgent'));

      const reasonSelect = screen.getByTestId('reason-select');
      await user.click(reasonSelect);
      await user.click(screen.getByText('Hot Job - Rush Order'));

      const notesTextarea = screen.getByTestId('notes-textarea');
      await user.type(notesTextarea, 'Customer emergency - ship ASAP');

      const submitButton = screen.getByRole('button', { name: /update priority/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });
  });
});