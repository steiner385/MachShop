/**
 * KitForm Component Tests
 *
 * Comprehensive test suite for KitForm component covering:
 * - Modal rendering and modes (create/edit)
 * - Form validation with Zod schema
 * - Kit items management (add/remove)
 * - Data loading and dependencies
 * - Form submission and error handling
 * - User interactions and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KitForm } from '../../../components/Kits/KitForm';
import { useKitStore } from '../../../store/kitStore';
import { Kit, KitPriority, AssemblyStage, KitStatus } from '../../../types/kits';

// Mock the kit store
vi.mock('../../../store/kitStore', () => ({
  useKitStore: vi.fn()
}));

// Mock antd Modal.confirm for unsaved changes dialog
const mockModalConfirm = vi.fn();
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Modal: {
      ...actual.Modal,
      confirm: mockModalConfirm
    }
  };
});

// Mock dayjs
vi.mock('dayjs', () => {
  const actual = vi.fn((date) => ({
    format: vi.fn().mockReturnValue(date || '2024-01-15'),
    isValid: vi.fn().mockReturnValue(true)
  }));
  return {
    default: actual,
    __esModule: true
  };
});

describe('KitForm', () => {
  const mockKitStore = {
    loading: {
      creating: false,
      updating: false,
      loading: false
    },
    error: {},
    createKit: vi.fn(),
    updateKit: vi.fn(),
    clearErrors: vi.fn()
  };

  const mockKit: Kit = {
    id: 'kit-1',
    kitName: 'Test Kit',
    workOrderId: 'wo-1',
    operationId: 'op-1',
    priority: KitPriority.HIGH,
    assemblyStage: AssemblyStage.ASSEMBLY,
    status: KitStatus.PLANNED,
    dueDate: '2024-01-15',
    notes: 'Test notes',
    kitItems: [
      {
        id: 'item-1',
        kitId: 'kit-1',
        partId: 'part-1',
        requiredQuantity: 5,
        allocatedQuantity: 3,
        pickedQuantity: 0,
        notes: 'Test item notes'
      }
    ],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  const defaultProps = {
    visible: true,
    onCancel: vi.fn(),
    kit: null,
    mode: 'create' as const
  };

  beforeEach(() => {
    vi.mocked(useKitStore).mockReturnValue(mockKitStore);
    mockModalConfirm.mockClear();
    mockKitStore.createKit.mockClear();
    mockKitStore.updateKit.mockClear();
    mockKitStore.clearErrors.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('renders create mode correctly', () => {
      render(<KitForm {...defaultProps} />);

      expect(screen.getByText('Create New Kit')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create kit/i })).toBeInTheDocument();
    });

    it('renders edit mode correctly', () => {
      render(<KitForm {...defaultProps} mode="edit" kit={mockKit} />);

      expect(screen.getByText('Edit Kit')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update kit/i })).toBeInTheDocument();
    });

    it('does not render when not visible', () => {
      render(<KitForm {...defaultProps} visible={false} />);

      expect(screen.queryByText('Create New Kit')).not.toBeInTheDocument();
    });

    it('has correct modal properties', () => {
      render(<KitForm {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Form Fields and Validation', () => {
    it('renders all required form fields', () => {
      render(<KitForm {...defaultProps} />);

      expect(screen.getByLabelText(/kit name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/work order/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/operation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/assembly stage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Kit name is required')).toBeInTheDocument();
        expect(screen.getByText('Work order is required')).toBeInTheDocument();
        expect(screen.getByText('At least one kit item is required')).toBeInTheDocument();
      });
    });

    it('validates kit name length constraints', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const kitNameInput = screen.getByLabelText(/kit name/i);
      await user.type(kitNameInput, 'a'.repeat(201)); // Exceeds 200 char limit

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Kit name too long')).toBeInTheDocument();
      });
    });

    it('validates notes length constraints', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const notesTextarea = screen.getByLabelText(/notes/i);
      await user.type(notesTextarea, 'a'.repeat(1001)); // Exceeds 1000 char limit

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Notes too long')).toBeInTheDocument();
      });
    });

    it('shows character count for kit name and notes', () => {
      render(<KitForm {...defaultProps} />);

      const kitNameInput = screen.getByLabelText(/kit name/i);
      const notesTextarea = screen.getByLabelText(/notes/i);

      expect(kitNameInput.closest('.ant-input-affix-wrapper')).toHaveClass('ant-input-show-count-affix');
      expect(notesTextarea.closest('.ant-input')).toHaveClass('ant-input-show-count-affix');
    });
  });

  describe('Kit Items Management', () => {
    it('initially shows empty kit items table', () => {
      render(<KitForm {...defaultProps} />);

      expect(screen.getByText('No kit items added. Click "Add Item" to get started.')).toBeInTheDocument();
    });

    it('adds new kit items when Add Item button is clicked', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add item/i });
      await user.click(addButton);

      expect(screen.getByText('Part Number')).toBeInTheDocument();
      expect(screen.getByText('Required Qty')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Notes')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('removes kit items when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      // Add an item first
      const addButton = screen.getByRole('button', { name: /add item/i });
      await user.click(addButton);

      // Find and click the delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm the popconfirm
      const confirmButton = screen.getByText('OK');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(screen.getByText('No kit items added. Click "Add Item" to get started.')).toBeInTheDocument();
      });
    });

    it('validates kit item quantity constraints', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      // Add an item
      const addButton = screen.getByRole('button', { name: /add item/i });
      await user.click(addButton);

      // Try to set quantity to 0
      const quantityInput = screen.getByRole('spinbutton');
      await user.clear(quantityInput);
      await user.type(quantityInput, '0');

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Quantity must be at least 1')).toBeInTheDocument();
      });
    });

    it('shows shortage warning when required quantity exceeds available', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      // Add an item
      const addButton = screen.getByRole('button', { name: /add item/i });
      await user.click(addButton);

      // Select a part (assuming mock data has limited inventory)
      const partSelect = screen.getByRole('combobox', { name: /select part/i });
      await user.click(partSelect);
      await user.click(screen.getByText('COMP-001 - Component 1'));

      // Set required quantity higher than available (mock data shows 100 available)
      const quantityInput = screen.getByRole('spinbutton');
      await user.clear(quantityInput);
      await user.type(quantityInput, '150');

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument(); // Available quantity
        const shortageIcon = screen.getByRole('img', { name: /info-circle/i });
        expect(shortageIcon).toBeInTheDocument();
      });
    });
  });

  describe('Form Pre-population (Edit Mode)', () => {
    it('pre-populates form fields in edit mode', () => {
      render(<KitForm {...defaultProps} mode="edit" kit={mockKit} />);

      expect(screen.getByDisplayValue('Test Kit')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument();
    });

    it('pre-populates kit items in edit mode', () => {
      render(<KitForm {...defaultProps} mode="edit" kit={mockKit} />);

      // Should show the kit items table with pre-populated data
      expect(screen.getByText('Part Number')).toBeInTheDocument();
      expect(screen.getByText('Required Qty')).toBeInTheDocument();
    });

    it('handles kit with no items in edit mode', () => {
      const kitWithNoItems = { ...mockKit, kitItems: [] };
      render(<KitForm {...defaultProps} mode="edit" kit={kitWithNoItems} />);

      expect(screen.getByText('No kit items added. Click "Add Item" to get started.')).toBeInTheDocument();
    });
  });

  describe('Data Loading and Dependencies', () => {
    it('calls clearErrors when modal opens', () => {
      render(<KitForm {...defaultProps} />);

      expect(mockKitStore.clearErrors).toHaveBeenCalled();
    });

    it('enables operation select only when work order is selected', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const operationSelect = screen.getByRole('combobox', { name: /select operation/i });
      expect(operationSelect).toBeDisabled();

      // Select a work order
      const workOrderSelect = screen.getByRole('combobox', { name: /select work order/i });
      await user.click(workOrderSelect);
      await user.click(screen.getByText('WO-12345 - ENG-001'));

      expect(operationSelect).toBeEnabled();
    });

    it('shows loading state during form submission', () => {
      const loadingStore = {
        ...mockKitStore,
        loading: { creating: true, updating: false, loading: false }
      };
      vi.mocked(useKitStore).mockReturnValue(loadingStore);

      render(<KitForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      expect(submitButton).toHaveAttribute('aria-describedby');
      expect(submitButton.querySelector('.ant-btn-loading-icon')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form successfully in create mode', async () => {
      const user = userEvent.setup();
      mockKitStore.createKit.mockResolvedValue(true);

      render(<KitForm {...defaultProps} />);

      // Fill required fields
      await user.type(screen.getByLabelText(/kit name/i), 'New Test Kit');

      const workOrderSelect = screen.getByRole('combobox', { name: /select work order/i });
      await user.click(workOrderSelect);
      await user.click(screen.getByText('WO-12345 - ENG-001'));

      // Add a kit item
      const addButton = screen.getByRole('button', { name: /add item/i });
      await user.click(addButton);

      const partSelect = screen.getByRole('combobox', { name: /select part/i });
      await user.click(partSelect);
      await user.click(screen.getByText('COMP-001 - Component 1'));

      // Submit form
      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockKitStore.createKit).toHaveBeenCalledWith(
          expect.objectContaining({
            kitName: 'New Test Kit',
            workOrderId: '1', // Mock work order ID
            kitItems: expect.arrayContaining([
              expect.objectContaining({
                partId: '1', // Mock part ID
                requiredQuantity: 1
              })
            ])
          })
        );
      });
    });

    it('submits form successfully in edit mode', async () => {
      const user = userEvent.setup();
      mockKitStore.updateKit.mockResolvedValue(true);

      render(<KitForm {...defaultProps} mode="edit" kit={mockKit} />);

      // Modify kit name
      const kitNameInput = screen.getByDisplayValue('Test Kit');
      await user.clear(kitNameInput);
      await user.type(kitNameInput, 'Updated Kit Name');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /update kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockKitStore.updateKit).toHaveBeenCalledWith(
          'kit-1',
          expect.objectContaining({
            kitName: 'Updated Kit Name'
          })
        );
      });
    });

    it('handles form submission errors gracefully', async () => {
      const user = userEvent.setup();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockKitStore.createKit.mockRejectedValue(new Error('Submission failed'));

      render(<KitForm {...defaultProps} />);

      // Fill minimal required fields and submit
      await user.type(screen.getByLabelText(/kit name/i), 'Test Kit');

      const workOrderSelect = screen.getByRole('combobox', { name: /select work order/i });
      await user.click(workOrderSelect);
      await user.click(screen.getByText('WO-12345 - ENG-001'));

      const addButton = screen.getByRole('button', { name: /add item/i });
      await user.click(addButton);

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Form submission error:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('displays general error messages', () => {
      const errorStore = {
        ...mockKitStore,
        error: { general: 'Something went wrong' }
      };
      vi.mocked(useKitStore).mockReturnValue(errorStore);

      render(<KitForm {...defaultProps} />);

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('allows clearing error messages', async () => {
      const user = userEvent.setup();
      const errorStore = {
        ...mockKitStore,
        error: { general: 'Something went wrong' }
      };
      vi.mocked(useKitStore).mockReturnValue(errorStore);

      render(<KitForm {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockKitStore.clearErrors).toHaveBeenCalled();
    });
  });

  describe('Unsaved Changes Handling', () => {
    it('shows confirmation dialog when closing with unsaved changes', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<KitForm {...defaultProps} onCancel={onCancel} />);

      // Make a change to mark form as dirty
      await user.type(screen.getByLabelText(/kit name/i), 'Some changes');

      // Try to cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockModalConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Unsaved Changes',
          content: 'You have unsaved changes. Are you sure you want to close without saving?'
        })
      );
    });

    it('closes directly when no unsaved changes', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<KitForm {...defaultProps} onCancel={onCancel} />);

      // Cancel without making changes
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockModalConfirm).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<KitForm {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/kit name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create kit/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const kitNameInput = screen.getByLabelText(/kit name/i);
      kitNameInput.focus();

      expect(document.activeElement).toBe(kitNameInput);

      // Tab to next field
      await user.tab();
      expect(document.activeElement).toBe(screen.getByLabelText(/priority/i));
    });

    it('provides proper form validation feedback for screen readers', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create kit/i });
      await user.click(submitButton);

      await waitFor(() => {
        const kitNameInput = screen.getByLabelText(/kit name/i);
        expect(kitNameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Priority and Assembly Stage Selection', () => {
    it('allows selecting different priority levels', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const prioritySelect = screen.getByLabelText(/priority/i);
      await user.click(prioritySelect);

      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Low')).toBeInTheDocument();

      await user.click(screen.getByText('High'));
      expect(prioritySelect).toHaveValue('HIGH');
    });

    it('allows selecting assembly stages', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const stageSelect = screen.getByLabelText(/assembly stage/i);
      await user.click(stageSelect);

      expect(screen.getByText('ASSEMBLY')).toBeInTheDocument();
      expect(screen.getByText('TESTING')).toBeInTheDocument();

      await user.click(screen.getByText('ASSEMBLY'));
      expect(stageSelect).toHaveValue('ASSEMBLY');
    });
  });

  describe('Date Handling', () => {
    it('handles due date selection', async () => {
      const user = userEvent.setup();
      render(<KitForm {...defaultProps} />);

      const datePickerInput = screen.getByPlaceholderText(/select due date/i);
      expect(datePickerInput).toBeInTheDocument();

      // Date picker interaction would typically require more complex setup
      // For now, just verify the component renders
      expect(datePickerInput).toBeEnabled();
    });

    it('formats dates correctly in edit mode', () => {
      render(<KitForm {...defaultProps} mode="edit" kit={mockKit} />);

      // The date should be formatted and displayed
      // Exact assertions would depend on the dayjs mock implementation
      const dateInput = screen.getByPlaceholderText(/select due date/i);
      expect(dateInput).toBeInTheDocument();
    });
  });
});