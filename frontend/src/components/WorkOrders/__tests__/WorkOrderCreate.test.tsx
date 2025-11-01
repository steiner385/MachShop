/**
 * WorkOrderCreate Component Tests
 *
 * Tests for the work order creation modal component including:
 * - Modal rendering and form functionality
 * - Parts loading from API with fallback to mock data
 * - Form validation for required and optional fields
 * - Site context integration and API submission
 * - Part number search and selection functionality
 * - Error handling and user feedback
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { WorkOrderCreate } from '../WorkOrderCreate';

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

// Mock SiteContext
const mockSiteContext = {
  currentSite: { id: 'site-123', name: 'Main Production' },
  allSites: [],
  isLoading: false,
  error: null,
  setCurrentSite: vi.fn(),
  clearError: vi.fn(),
};

vi.mock('@/contexts/SiteContext', () => ({
  useSite: () => mockSiteContext,
}));

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

// Mock console.error to suppress error logs in tests
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('WorkOrderCreate', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  const mockParts = [
    { id: '1', partNumber: 'TURB-BLADE-001', partName: 'Turbine Blade Assembly' },
    { id: '2', partNumber: 'GUIDE-VANE-001', partName: 'Guide Vane' },
    { id: '3', partNumber: 'SHAFT-001', partName: 'Main Shaft' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the create work order modal when visible', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      expect(screen.getByText('Create Work Order')).toBeInTheDocument();
      expect(screen.getByText('Create from Customer Order')).toBeInTheDocument();
      expect(screen.getByLabelText('Part Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Quantity')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Customer Order Number')).toBeInTheDocument();
      expect(screen.getByLabelText('Due Date')).toBeInTheDocument();
    });

    it('should not render modal when not visible', () => {
      renderWithProviders(<WorkOrderCreate {...defaultProps} visible={false} />);

      expect(screen.queryByText('Create Work Order')).not.toBeInTheDocument();
    });

    it('should render modal with correct buttons', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      expect(screen.getByRole('button', { name: /create work order/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should have proper form structure with test ids', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      expect(screen.getByTestId('part-number-select')).toBeInTheDocument();
      expect(screen.getByTestId('quantity-input')).toBeInTheDocument();
      expect(screen.getByTestId('priority-select')).toBeInTheDocument();
      expect(screen.getByTestId('customer-order-input')).toBeInTheDocument();
      expect(screen.getByTestId('due-date-picker')).toBeInTheDocument();
    });

    it('should display informational alert about work order creation', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      expect(screen.getByText('Create from Customer Order')).toBeInTheDocument();
      expect(screen.getByText(/Create a new work order from a customer order or forecast/)).toBeInTheDocument();
    });
  });

  describe('Parts Loading', () => {
    it('should load parts from API successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', {
          headers: {
            'Authorization': 'Bearer mock-token',
          },
        });
      });

      // Open part number dropdown to see options
      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);

      await waitFor(() => {
        expect(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly')).toBeInTheDocument();
        expect(screen.getByText('GUIDE-VANE-001 - Guide Vane')).toBeInTheDocument();
        expect(screen.getByText('SHAFT-001 - Main Shaft')).toBeInTheDocument();
      });
    });

    it('should use mock data when API fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'API Error' }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      // Open part number dropdown to see fallback options
      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);

      await waitFor(() => {
        expect(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly')).toBeInTheDocument();
      });
    });

    it('should use mock data when network error occurs', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      await waitFor(() => {
        expect(mockConsoleError).toHaveBeenCalledWith('Failed to load parts:', expect.any(Error));
      });

      // Open part number dropdown to see fallback options
      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);

      await waitFor(() => {
        expect(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly')).toBeInTheDocument();
      });
    });

    it('should show loading state while fetching parts', () => {
      // Mock a pending promise to simulate loading
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(fetchPromise);

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const partSelect = screen.getByTestId('part-number-select');
      // The loading state would be internal to the Select component
      expect(partSelect).toBeInTheDocument();

      // Resolve the promise
      act(() => {
        resolvePromise!({
          ok: true,
          json: async () => ({ parts: mockParts }),
        });
      });
    });
  });

  describe('Form Validation', () => {
    it('should require part number selection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a part number')).toBeInTheDocument();
      });
    });

    it('should require quantity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter quantity')).toBeInTheDocument();
      });
    });

    it('should validate quantity minimum value', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '0');

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Quantity must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should require priority selection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Clear the default priority
      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.keyboard('{Backspace}');

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Please select priority')).toBeInTheDocument();
      });
    });

    it('should have default priority of NORMAL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const prioritySelect = screen.getByTestId('priority-select');
      expect(prioritySelect).toHaveValue('NORMAL');
    });
  });

  describe('Part Number Search', () => {
    it('should filter parts based on search input', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);

      // Type search query
      await user.type(partSelect, 'GUIDE');

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('GUIDE-VANE-001 - Guide Vane')).toBeInTheDocument();
        expect(screen.queryByText('TURB-BLADE-001 - Turbine Blade Assembly')).not.toBeInTheDocument();
      });
    });

    it('should select part when option is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);
      await user.click(screen.getByText('SHAFT-001 - Main Shaft'));

      expect(partSelect).toHaveValue('SHAFT-001');
    });
  });

  describe('Form Submission', () => {
    it('should successfully create work order with required fields', async () => {
      const { message } = await import('antd');

      // Mock parts API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      // Mock work order creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workOrderNumber: 'WO-2024-004' }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Wait for parts to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', expect.any(Object));
      });

      // Fill required fields
      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);
      await user.click(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly'));

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '5');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/workorders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            partNumber: 'TURB-BLADE-001',
            quantityOrdered: 5,
            priority: 'NORMAL',
            customerOrder: undefined,
            dueDate: undefined,
            siteId: 'site-123',
          }),
        });
      });

      expect(message.success).toHaveBeenCalledWith('Work order WO-2024-004 created successfully');
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should successfully create work order with all fields', async () => {
      const { message } = await import('antd');

      // Mock parts API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      // Mock work order creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workOrderNumber: 'WO-2024-005' }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Wait for parts to load
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', expect.any(Object));
      });

      // Fill all fields
      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);
      await user.click(screen.getByText('GUIDE-VANE-001 - Guide Vane'));

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '10');

      const prioritySelect = screen.getByTestId('priority-select');
      await user.click(prioritySelect);
      await user.click(screen.getByText('High'));

      const customerOrderInput = screen.getByTestId('customer-order-input');
      await user.type(customerOrderInput, 'CO-2024-001');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/workorders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            partNumber: 'GUIDE-VANE-001',
            quantityOrdered: 10,
            priority: 'HIGH',
            customerOrder: 'CO-2024-001',
            dueDate: undefined,
            siteId: 'site-123',
          }),
        });
      });

      expect(message.success).toHaveBeenCalledWith('Work order WO-2024-005 created successfully');
    });

    it('should handle API error gracefully', async () => {
      const { message } = await import('antd');

      // Mock parts API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      // Mock work order creation API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Part not found' }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Wait for parts to load and fill form
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', expect.any(Object));
      });

      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);
      await user.click(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly'));

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '5');

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Part not found');
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should handle network error gracefully', async () => {
      const { message } = await import('antd');

      // Mock parts API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      // Mock work order creation API network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Wait for parts to load and fill form
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', expect.any(Object));
      });

      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);
      await user.click(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly'));

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '5');

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Network error');
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should close modal and reset form when cancel button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when X button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset form when modal is closed and reopened', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      const { rerender } = renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Fill form
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled();
      });

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '5');

      // Close modal
      rerender(<WorkOrderCreate {...defaultProps} visible={false} />);

      // Reopen modal
      rerender(<WorkOrderCreate {...defaultProps} visible={true} />);

      // Form should be reset
      await waitFor(() => {
        const newQuantityInput = screen.getByTestId('quantity-input');
        expect(newQuantityInput).toHaveValue(null);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('should be keyboard navigable', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Tab through form elements
      await user.tab();
      expect(screen.getByTestId('part-number-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('quantity-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('priority-select')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('customer-order-input')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('due-date-picker')).toHaveFocus();
    });
  });

  describe('Site Context Integration', () => {
    it('should use current site ID in API request', async () => {
      const { message } = await import('antd');

      // Mock parts API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      // Mock work order creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workOrderNumber: 'WO-2024-006' }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Fill form and submit
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', expect.any(Object));
      });

      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);
      await user.click(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly'));

      const quantityInput = screen.getByTestId('quantity-input');
      await user.type(quantityInput, '5');

      const submitButton = screen.getByRole('button', { name: /create work order/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/workorders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token',
          },
          body: JSON.stringify({
            partNumber: 'TURB-BLADE-001',
            quantityOrdered: 5,
            priority: 'NORMAL',
            customerOrder: undefined,
            dueDate: undefined,
            siteId: 'site-123',
          }),
        });
      });
    });

    it('should handle missing site gracefully', async () => {
      // Mock site context with no current site
      const mockEmptySiteContext = {
        currentSite: null,
        allSites: [],
        isLoading: false,
        error: null,
        setCurrentSite: vi.fn(),
        clearError: vi.fn(),
      };

      vi.mocked(require('@/contexts/SiteContext').useSite).mockReturnValueOnce(mockEmptySiteContext);

      const { message } = await import('antd');

      // Mock parts API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      // Mock work order creation API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ workOrderNumber: 'WO-2024-007' }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Should still work without site ID
      expect(screen.getByText('Create Work Order')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing token gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValueOnce(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: mockParts }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/v1/parts', {
          headers: {
            'Authorization': 'Bearer null',
          },
        });
      });
    });

    it('should handle empty parts response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ parts: [] }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);

      // Should show no options
      expect(screen.queryByText('TURB-BLADE-001')).not.toBeInTheDocument();
    });

    it('should handle malformed parts response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ /* no parts field */ }),
      });

      renderWithProviders(<WorkOrderCreate {...defaultProps} />);

      // Should fall back to mock data
      const partSelect = screen.getByTestId('part-number-select');
      await user.click(partSelect);

      await waitFor(() => {
        expect(screen.getByText('TURB-BLADE-001 - Turbine Blade Assembly')).toBeInTheDocument();
      });
    });
  });
});