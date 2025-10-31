/**
 * LayoutPreferenceModal Component Tests
 *
 * Tests for the LayoutPreferenceModal component including:
 * - Modal rendering and visibility
 * - Form fields and validation
 * - User interactions
 * - Preference saving functionality
 * - Layout mode selection
 * - Form reset and cancel behavior
 */

import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { LayoutPreferenceModal } from '../LayoutPreferenceModal';
import { LayoutMode, PanelPosition } from '@/store/executionLayoutStore';

// Mock the execution layout store
vi.mock('@/store/executionLayoutStore', () => ({
  LayoutMode: {
    SPLIT_VERTICAL: 'SPLIT_VERTICAL',
    SPLIT_HORIZONTAL: 'SPLIT_HORIZONTAL',
    TABBED: 'TABBED',
    OVERLAY: 'OVERLAY',
    PICTURE_IN_PICTURE: 'PICTURE_IN_PICTURE',
  },
  PanelPosition: {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    TOP: 'TOP',
    BOTTOM: 'BOTTOM',
  },
}));

describe('LayoutPreferenceModal', () => {
  const user = userEvent.setup();
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  const defaultProps = {
    visible: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should render when visible is true', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      expect(screen.getByText('Layout Preferences')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should not render when visible is false', () => {
      renderWithProviders(
        <LayoutPreferenceModal {...defaultProps} visible={false} />
      );

      expect(screen.queryByText('Layout Preferences')).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render all form fields with correct labels', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      expect(screen.getByText('Default Layout Mode')).toBeInTheDocument();
      expect(screen.getByText('Split Ratio')).toBeInTheDocument();
      expect(screen.getByText('Auto-advance Steps')).toBeInTheDocument();
      expect(screen.getByText('Show Step Timer')).toBeInTheDocument();
      expect(screen.getByText('Compact Mode')).toBeInTheDocument();
    });

    it('should render modal footer buttons', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save preferences/i })).toBeInTheDocument();
    });
  });

  describe('Form Initial Values', () => {
    it('should initialize form with default values', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      // Check default layout mode (should be Split Vertical)
      const layoutModeSelect = screen.getByDisplayValue('Split Vertical');
      expect(layoutModeSelect).toBeInTheDocument();

      // Check switches are in their default states
      const autoAdvanceSwitch = screen.getByRole('switch', { name: /auto-advance steps/i });
      expect(autoAdvanceSwitch).not.toBeChecked();

      const showTimerSwitch = screen.getByRole('switch', { name: /show step timer/i });
      expect(showTimerSwitch).toBeChecked();

      const compactModeSwitch = screen.getByRole('switch', { name: /compact mode/i });
      expect(compactModeSwitch).not.toBeChecked();
    });

    it('should initialize split ratio slider with default value', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      // Check that split ratio slider exists and has default value
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('aria-valuenow', '60'); // 0.6 * 100
    });
  });

  describe('Layout Mode Selection', () => {
    it('should display all layout mode options', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const layoutModeSelect = screen.getByDisplayValue('Split Vertical');
      await user.click(layoutModeSelect);

      await waitFor(() => {
        expect(screen.getByText('Split Vertical')).toBeInTheDocument();
        expect(screen.getByText('Split Horizontal')).toBeInTheDocument();
        expect(screen.getByText('Tabbed')).toBeInTheDocument();
        expect(screen.getByText('Overlay')).toBeInTheDocument();
        expect(screen.getByText('Picture-in-Picture')).toBeInTheDocument();
      });
    });

    it('should allow selecting different layout modes', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const layoutModeSelect = screen.getByDisplayValue('Split Vertical');
      await user.click(layoutModeSelect);

      await waitFor(() => {
        expect(screen.getByText('Split Horizontal')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Split Horizontal'));

      // The select should now show the new value
      await waitFor(() => {
        expect(screen.getByDisplayValue('Split Horizontal')).toBeInTheDocument();
      });
    });

    it('should handle Picture-in-Picture mode selection', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const layoutModeSelect = screen.getByDisplayValue('Split Vertical');
      await user.click(layoutModeSelect);

      await waitFor(() => {
        expect(screen.getByText('Picture-in-Picture')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Picture-in-Picture'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Picture-in-Picture')).toBeInTheDocument();
      });
    });

    it('should handle Tabbed mode selection', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const layoutModeSelect = screen.getByDisplayValue('Split Vertical');
      await user.click(layoutModeSelect);

      await waitFor(() => {
        expect(screen.getByText('Tabbed')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Tabbed'));

      await waitFor(() => {
        expect(screen.getByDisplayValue('Tabbed')).toBeInTheDocument();
      });
    });
  });

  describe('Split Ratio Slider', () => {
    it('should allow adjusting split ratio with slider', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuenow', '60');

      // Simulate changing the slider value
      fireEvent.change(slider, { target: { value: '80' } });

      await waitFor(() => {
        expect(slider).toHaveAttribute('aria-valuenow', '80');
      });
    });

    it('should show split ratio marks correctly', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      // Check that slider marks are present in the DOM
      expect(screen.getByText('10%')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
    });

    it('should respect slider min and max values', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const slider = screen.getByRole('slider');
      expect(slider).toHaveAttribute('aria-valuemin', '10');
      expect(slider).toHaveAttribute('aria-valuemax', '90');
    });
  });

  describe('Switch Controls', () => {
    it('should toggle Auto-advance Steps switch', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const autoAdvanceSwitch = screen.getByRole('switch', { name: /auto-advance steps/i });
      expect(autoAdvanceSwitch).not.toBeChecked();

      await user.click(autoAdvanceSwitch);

      await waitFor(() => {
        expect(autoAdvanceSwitch).toBeChecked();
      });

      await user.click(autoAdvanceSwitch);

      await waitFor(() => {
        expect(autoAdvanceSwitch).not.toBeChecked();
      });
    });

    it('should toggle Show Step Timer switch', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const showTimerSwitch = screen.getByRole('switch', { name: /show step timer/i });
      expect(showTimerSwitch).toBeChecked();

      await user.click(showTimerSwitch);

      await waitFor(() => {
        expect(showTimerSwitch).not.toBeChecked();
      });

      await user.click(showTimerSwitch);

      await waitFor(() => {
        expect(showTimerSwitch).toBeChecked();
      });
    });

    it('should toggle Compact Mode switch', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const compactModeSwitch = screen.getByRole('switch', { name: /compact mode/i });
      expect(compactModeSwitch).not.toBeChecked();

      await user.click(compactModeSwitch);

      await waitFor(() => {
        expect(compactModeSwitch).toBeChecked();
      });

      await user.click(compactModeSwitch);

      await waitFor(() => {
        expect(compactModeSwitch).not.toBeChecked();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSave with form values when Save button is clicked', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
        expect(mockOnSave).toHaveBeenCalledWith({
          layoutMode: LayoutMode.SPLIT_VERTICAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: false,
          showStepTimer: true,
          compactMode: false,
        });
      });
    });

    it('should call onSave with modified values', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      // Modify some form values
      const layoutModeSelect = screen.getByDisplayValue('Split Vertical');
      await user.click(layoutModeSelect);
      await user.click(screen.getByText('Split Horizontal'));

      const autoAdvanceSwitch = screen.getByRole('switch', { name: /auto-advance steps/i });
      await user.click(autoAdvanceSwitch);

      const compactModeSwitch = screen.getByRole('switch', { name: /compact mode/i });
      await user.click(compactModeSwitch);

      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          layoutMode: LayoutMode.SPLIT_HORIZONTAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: true,
          showStepTimer: true,
          compactMode: true,
        });
      });
    });

    it('should handle form validation errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock form validation to fail
      const mockValidateFields = vi.fn().mockRejectedValue(new Error('Validation failed'));
      vi.mock('antd', async () => {
        const actual = await vi.importActual('antd');
        return {
          ...actual,
          Form: {
            ...actual.Form,
            useForm: () => [{
              validateFields: mockValidateFields,
              setFieldsValue: vi.fn(),
              resetFields: vi.fn(),
            }],
          },
        };
      });

      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save preferences/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Validation failed:', expect.any(Error));
        expect(mockOnSave).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Modal Actions', () => {
    it('should call onClose when Cancel button is clicked', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when modal is cancelled via X button', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      // Simulate clicking the modal's close button (X)
      const modal = screen.getByRole('dialog');
      fireEvent.keyDown(modal, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Check that form controls have proper labels
      expect(screen.getByLabelText(/default layout mode/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/split ratio/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/auto-advance steps/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show step timer/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/compact mode/i)).toBeInTheDocument();
    });

    it('should be keyboard navigable', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      // Tab through the form elements
      await user.tab();
      expect(screen.getByDisplayValue('Split Vertical')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('slider')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('switch', { name: /auto-advance steps/i })).toHaveFocus();
    });

    it('should handle keyboard interaction on switches', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const autoAdvanceSwitch = screen.getByRole('switch', { name: /auto-advance steps/i });
      autoAdvanceSwitch.focus();

      expect(autoAdvanceSwitch).toHaveFocus();
      expect(autoAdvanceSwitch).not.toBeChecked();

      // Press space to toggle switch
      await user.keyboard(' ');

      await waitFor(() => {
        expect(autoAdvanceSwitch).toBeChecked();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing initial values gracefully', () => {
      // Mock form that returns undefined initial values
      const mockForm = {
        validateFields: vi.fn().mockResolvedValue({}),
        setFieldsValue: vi.fn(),
        resetFields: vi.fn(),
      };

      vi.doMock('antd', async () => {
        const actual = await vi.importActual('antd');
        return {
          ...actual,
          Form: {
            ...actual.Form,
            useForm: () => [mockForm],
          },
        };
      });

      expect(() => {
        renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);
      }).not.toThrow();
    });

    it('should handle rapid save button clicks', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save preferences/i });

      // Click save button multiple times rapidly
      await user.click(saveButton);
      await user.click(saveButton);
      await user.click(saveButton);

      // Should only call onSave once due to form validation
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });

    it('should maintain form state during rapid interactions', async () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const autoAdvanceSwitch = screen.getByRole('switch', { name: /auto-advance steps/i });
      const compactModeSwitch = screen.getByRole('switch', { name: /compact mode/i });

      // Rapidly toggle switches
      await user.click(autoAdvanceSwitch);
      await user.click(compactModeSwitch);
      await user.click(autoAdvanceSwitch);

      // Check final state
      await waitFor(() => {
        expect(autoAdvanceSwitch).not.toBeChecked();
        expect(compactModeSwitch).toBeChecked();
      });
    });
  });

  describe('Modal Configuration', () => {
    it('should have correct modal width', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const modal = screen.getByRole('dialog');
      expect(modal.closest('.ant-modal')).toHaveStyle({ width: '600px' });
    });

    it('should have correct modal title', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      expect(screen.getByText('Layout Preferences')).toBeInTheDocument();
    });

    it('should render with vertical form layout', () => {
      renderWithProviders(<LayoutPreferenceModal {...defaultProps} />);

      const form = screen.getByRole('form');
      expect(form).toHaveClass('ant-form-vertical');
    });
  });
});