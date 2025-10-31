/**
 * SPCConfiguration Component Tests
 *
 * Tests for the SPC configuration wizard component including:
 * - Multi-step wizard navigation and state management
 * - Chart type selection with descriptions and conditional fields
 * - Control limits configuration with different calculation methods
 * - Western Electric Rules selection and sensitivity settings
 * - Process capability configuration and form validation
 * - API integration for saving configurations
 * - Existing configuration editing functionality
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { SPCConfiguration } from '../SPCConfiguration';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

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

describe('SPCConfiguration', () => {
  const user = userEvent.setup();
  const mockOnSaved = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    parameterId: 'param-123',
    parameterName: 'Temperature',
    onSaved: mockOnSaved,
    onCancel: mockOnCancel,
  };

  const mockExistingConfig = {
    chartType: 'X_BAR_R',
    subgroupSize: 5,
    limitsBasedOn: 'HISTORICAL_DATA',
    historicalDataDays: 60,
    USL: 100,
    LSL: 80,
    targetValue: 90,
    enabledRules: [1, 2, 3],
    ruleSensitivity: 'STRICT',
    enableCapability: true,
    confidenceLevel: 0.99,
    isActive: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.post.mockClear();
    mockedAxios.put.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the SPC configuration wizard', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      expect(screen.getByText('Configure SPC for Temperature')).toBeInTheDocument();
      expect(screen.getByText('Chart Type')).toBeInTheDocument();
      expect(screen.getByText('Control Limits')).toBeInTheDocument();
      expect(screen.getByText('Rules & Sensitivity')).toBeInTheDocument();
      expect(screen.getByText('Select Chart Type')).toBeInTheDocument();
    });

    it('should render with edit mode when existing config provided', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={mockExistingConfig} />);

      expect(screen.getByText('Edit SPC for Temperature')).toBeInTheDocument();
    });

    it('should render cancel button when onCancel provided', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should not render cancel button when onCancel not provided', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} onCancel={undefined} />);

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('should use default parameter name when not provided', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} parameterName={undefined} />);

      expect(screen.getByText('Configure SPC for Parameter')).toBeInTheDocument();
    });
  });

  describe('Wizard Navigation', () => {
    it('should start on first step', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      expect(screen.getByText('Select Chart Type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
    });

    it('should navigate to next step', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(screen.getByText('Control Limits Configuration')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).not.toBeDisabled();
    });

    it('should navigate to previous step', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Go to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Go back to step 1
      const previousButton = screen.getByRole('button', { name: /previous/i });
      await user.click(previousButton);

      expect(screen.getByText('Select Chart Type')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();
    });

    it('should show save button on final step', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to final step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton); // Step 2
      await user.click(nextButton); // Step 3

      expect(screen.getByText('Western Electric Rules')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save configuration/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });
  });

  describe('Chart Type Selection', () => {
    it('should display all chart type options', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);

      expect(screen.getByText('X-BAR-R')).toBeInTheDocument();
      expect(screen.getByText('X-BAR-S')).toBeInTheDocument();
      expect(screen.getByText('I-MR')).toBeInTheDocument();
      expect(screen.getByText('P-CHART')).toBeInTheDocument();
      expect(screen.getByText('NP-CHART')).toBeInTheDocument();
      expect(screen.getByText('C-CHART')).toBeInTheDocument();
      expect(screen.getByText('U-CHART')).toBeInTheDocument();
      expect(screen.getByText('EWMA')).toBeInTheDocument();
      expect(screen.getByText('CUSUM')).toBeInTheDocument();
    });

    it('should display chart type descriptions', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);

      expect(screen.getByText(/X-bar and Range chart - For variable data with subgroups/)).toBeInTheDocument();
      expect(screen.getByText(/Individual and Moving Range chart - For individual measurements/)).toBeInTheDocument();
    });

    it('should show subgroup size field for X-bar charts', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('X-BAR-R'));

      expect(screen.getByLabelText('Subgroup Size')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter subgroup size \(typically 2-10\)/)).toBeInTheDocument();
    });

    it('should show subgroup size field for X-bar S charts', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('X-BAR-S'));

      expect(screen.getByLabelText('Subgroup Size')).toBeInTheDocument();
    });

    it('should not show subgroup size field for I-MR charts', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('I-MR'));

      expect(screen.queryByLabelText('Subgroup Size')).not.toBeInTheDocument();
    });

    it('should validate required chart type', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Clear chart type
      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.keyboard('{Escape}'); // Close dropdown without selecting

      // Navigate to final step and try to save
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Please select a chart type')).toBeInTheDocument();
      });
    });

    it('should validate subgroup size for X-bar charts', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Select X-bar R chart
      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('X-BAR-R'));

      // Enter invalid subgroup size
      const subgroupInput = screen.getByLabelText('Subgroup Size');
      await user.type(subgroupInput, '1'); // Below minimum

      // Navigate to final step and try to save
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Subgroup size must be between 2 and 25')).toBeInTheDocument();
      });
    });
  });

  describe('Control Limits Configuration', () => {
    beforeEach(async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    });

    it('should display control limits configuration options', () => {
      expect(screen.getByText('Control Limits Configuration')).toBeInTheDocument();
      expect(screen.getByText('Historical Data')).toBeInTheDocument();
      expect(screen.getByText('Specification Limits')).toBeInTheDocument();
      expect(screen.getByText('Manual Entry')).toBeInTheDocument();
    });

    it('should show historical data period field when historical data selected', async () => {
      const historicalRadio = screen.getByLabelText(/Historical Data/);
      await user.click(historicalRadio);

      expect(screen.getByLabelText('Historical Data Period (days)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('30')).toBeInTheDocument();
    });

    it('should hide historical data period field when other methods selected', async () => {
      const specLimitsRadio = screen.getByLabelText(/Specification Limits/);
      await user.click(specLimitsRadio);

      expect(screen.queryByLabelText('Historical Data Period (days)')).not.toBeInTheDocument();
    });

    it('should display specification limits fields', () => {
      expect(screen.getByLabelText('Upper Spec Limit (USL)')).toBeInTheDocument();
      expect(screen.getByLabelText('Target Value')).toBeInTheDocument();
      expect(screen.getByLabelText('Lower Spec Limit (LSL)')).toBeInTheDocument();
    });

    it('should validate historical data period when required', async () => {
      const historicalRadio = screen.getByLabelText(/Historical Data/);
      await user.click(historicalRadio);

      // Clear the field
      const periodInput = screen.getByLabelText('Historical Data Period (days)');
      await user.clear(periodInput);

      // Navigate to final step and try to save
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter historical data period')).toBeInTheDocument();
      });
    });

    it('should validate specification limit values', async () => {
      const uslInput = screen.getByLabelText('Upper Spec Limit (USL)');
      await user.type(uslInput, '100.5');

      const targetInput = screen.getByLabelText('Target Value');
      await user.type(targetInput, '90.0');

      const lslInput = screen.getByLabelText('Lower Spec Limit (LSL)');
      await user.type(lslInput, '80.5');

      expect(uslInput).toHaveValue(100.5);
      expect(targetInput).toHaveValue(90.0);
      expect(lslInput).toHaveValue(80.5);
    });
  });

  describe('Western Electric Rules Configuration', () => {
    beforeEach(async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to step 3
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);
    });

    it('should display Western Electric Rules section', () => {
      expect(screen.getByText('Western Electric Rules')).toBeInTheDocument();
      expect(screen.getByText('Select which rules to enable for out-of-control detection.')).toBeInTheDocument();
    });

    it('should display all 8 Western Electric rules', () => {
      expect(screen.getByText('Rule 1:')).toBeInTheDocument();
      expect(screen.getByText('One point beyond 3σ')).toBeInTheDocument();
      expect(screen.getByText('Rule 2:')).toBeInTheDocument();
      expect(screen.getByText('9 points on same side')).toBeInTheDocument();
      expect(screen.getByText('Rule 8:')).toBeInTheDocument();
      expect(screen.getByText('8 beyond 1σ either side')).toBeInTheDocument();
    });

    it('should have all rules enabled by default', () => {
      for (let i = 1; i <= 8; i++) {
        const checkbox = screen.getByRole('checkbox', { name: new RegExp(`Rule ${i}:`) });
        expect(checkbox).toBeChecked();
      }
    });

    it('should allow toggling individual rules', async () => {
      const rule1Checkbox = screen.getByRole('checkbox', { name: /Rule 1:/ });
      await user.click(rule1Checkbox);

      expect(rule1Checkbox).not.toBeChecked();

      await user.click(rule1Checkbox);
      expect(rule1Checkbox).toBeChecked();
    });

    it('should display rule severity indicators', () => {
      expect(screen.getByText('(Critical)')).toBeInTheDocument();
      expect(screen.getAllByText('(Warning)')).toHaveLength(5); // Rules 2, 3, 4, 5, 8
    });

    it('should display rule sensitivity options', () => {
      expect(screen.getByLabelText(/Strict/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Normal/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Relaxed/)).toBeInTheDocument();
    });

    it('should have Normal sensitivity selected by default', () => {
      const normalRadio = screen.getByLabelText(/Normal/);
      expect(normalRadio).toBeChecked();
    });

    it('should allow changing sensitivity level', async () => {
      const strictRadio = screen.getByLabelText(/Strict/);
      await user.click(strictRadio);

      expect(strictRadio).toBeChecked();
    });

    it('should display process capability toggle', () => {
      expect(screen.getByText('Process Capability Analysis')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /Process Capability Analysis/ })).toBeInTheDocument();
    });

    it('should have capability analysis enabled by default', () => {
      const capabilitySwitch = screen.getByRole('switch', { name: /Process Capability Analysis/ });
      expect(capabilitySwitch).toBeChecked();
    });

    it('should display confidence level options', () => {
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('99%')).toBeInTheDocument();
    });

    it('should have 95% confidence level selected by default', () => {
      const confidenceSelect = screen.getByRole('combobox', { name: /Confidence Level/ });
      expect(confidenceSelect).toHaveTextContent('95%');
    });

    it('should display activation toggle', () => {
      expect(screen.getByText('Activate Configuration')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: /Activate Configuration/ })).toBeInTheDocument();
    });

    it('should have configuration activated by default', () => {
      const activationSwitch = screen.getByRole('switch', { name: /Activate Configuration/ });
      expect(activationSwitch).toBeChecked();
    });
  });

  describe('Form Submission', () => {
    it('should save new configuration successfully', async () => {
      const { message } = await import('antd');
      mockedAxios.post.mockResolvedValueOnce({ data: { id: 'config-123' } });

      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Select chart type
      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('I-MR'));

      // Navigate to final step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      // Save configuration
      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/spc/configurations', {
          parameterId: 'param-123',
          chartType: 'I_MR',
          subgroupSize: undefined,
          limitsBasedOn: 'HISTORICAL_DATA',
          historicalDataDays: 30,
          USL: undefined,
          LSL: undefined,
          targetValue: undefined,
          enabledRules: [1, 2, 3, 4, 5, 6, 7, 8],
          ruleSensitivity: 'NORMAL',
          enableCapability: true,
          confidenceLevel: 0.95,
          isActive: true,
        });
      });

      expect(message.success).toHaveBeenCalledWith('SPC configuration saved successfully');
      expect(mockOnSaved).toHaveBeenCalledWith({ id: 'config-123' });
    });

    it('should update existing configuration successfully', async () => {
      const { message } = await import('antd');
      mockedAxios.put.mockResolvedValueOnce({ data: { id: 'config-123' } });

      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={mockExistingConfig} />);

      // Navigate to final step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      // Save configuration
      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockedAxios.put).toHaveBeenCalledWith('/api/v1/spc/configurations/param-123', expect.any(Object));
      });

      expect(message.success).toHaveBeenCalledWith('SPC configuration saved successfully');
    });

    it('should handle save errors gracefully', async () => {
      const { message } = await import('antd');
      const error = { response: { data: { error: 'Configuration validation failed' } } };
      mockedAxios.post.mockRejectedValueOnce(error);

      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to final step and save
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Configuration validation failed');
      });
    });

    it('should handle network errors gracefully', async () => {
      const { message } = await import('antd');
      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to final step and save
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Failed to save SPC configuration');
      });
    });

    it('should show loading state during save', async () => {
      let resolvePromise: (value: any) => void;
      const savePromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.post.mockReturnValueOnce(savePromise);

      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to final step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      // Save configuration
      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      // Button should show loading state
      expect(saveButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ data: { id: 'config-123' } });

      await waitFor(() => {
        expect(saveButton).not.toBeDisabled();
      });
    });
  });

  describe('Existing Configuration Loading', () => {
    it('should populate form with existing configuration', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={mockExistingConfig} />);

      // Check chart type is pre-selected
      const chartTypeSelect = screen.getByRole('combobox');
      expect(chartTypeSelect).toHaveValue('X_BAR_R');

      // Check subgroup size is populated
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
    });

    it('should populate control limits settings', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={mockExistingConfig} />);

      // Navigate to step 2
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Check historical data is selected
      const historicalRadio = screen.getByLabelText(/Historical Data/);
      expect(historicalRadio).toBeChecked();

      // Check historical data period
      expect(screen.getByDisplayValue('60')).toBeInTheDocument();

      // Check specification limits
      expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // USL
      expect(screen.getByDisplayValue('90')).toBeInTheDocument(); // Target
      expect(screen.getByDisplayValue('80')).toBeInTheDocument(); // LSL
    });

    it('should populate rules and sensitivity settings', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={mockExistingConfig} />);

      // Navigate to step 3
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      // Check only rules 1, 2, 3 are enabled
      const rule1Checkbox = screen.getByRole('checkbox', { name: /Rule 1:/ });
      const rule2Checkbox = screen.getByRole('checkbox', { name: /Rule 2:/ });
      const rule3Checkbox = screen.getByRole('checkbox', { name: /Rule 3:/ });
      const rule4Checkbox = screen.getByRole('checkbox', { name: /Rule 4:/ });

      expect(rule1Checkbox).toBeChecked();
      expect(rule2Checkbox).toBeChecked();
      expect(rule3Checkbox).toBeChecked();
      expect(rule4Checkbox).not.toBeChecked();

      // Check sensitivity is strict
      const strictRadio = screen.getByLabelText(/Strict/);
      expect(strictRadio).toBeChecked();

      // Check confidence level is 99%
      const confidenceSelect = screen.getByRole('combobox', { name: /Confidence Level/ });
      expect(confidenceSelect).toHaveValue(0.99);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing existing configuration gracefully', () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={undefined} />);

      expect(screen.getByText('Configure SPC for Temperature')).toBeInTheDocument();
    });

    it('should handle partial existing configuration', () => {
      const partialConfig = { chartType: 'P_CHART' };
      renderWithProviders(<SPCConfiguration {...defaultProps} existingConfig={partialConfig} />);

      const chartTypeSelect = screen.getByRole('combobox');
      expect(chartTypeSelect).toHaveValue('P_CHART');
    });

    it('should handle invalid form data gracefully', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Navigate to final step and try to save without filling required fields
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      await user.click(nextButton);

      // Clear activation status (required field)
      const activationSwitch = screen.getByRole('switch', { name: /Activate Configuration/ });
      await user.click(activationSwitch);

      const saveButton = screen.getByRole('button', { name: /save configuration/i });
      await user.click(saveButton);

      // Form should handle validation errors
      expect(saveButton).toBeInTheDocument();
    });
  });

  describe('Chart Type Specific Behavior', () => {
    it('should show appropriate fields for attribute charts', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('P-CHART'));

      // P-chart should not show subgroup size field
      expect(screen.queryByLabelText('Subgroup Size')).not.toBeInTheDocument();
    });

    it('should handle complex chart type configurations', async () => {
      renderWithProviders(<SPCConfiguration {...defaultProps} />);

      // Test EWMA chart type
      const chartTypeSelect = screen.getByRole('combobox');
      await user.click(chartTypeSelect);
      await user.click(screen.getByText('EWMA'));

      // Should display appropriate description
      expect(screen.getByText(/Exponentially Weighted Moving Average - For detecting small shifts/)).toBeInTheDocument();
    });
  });
});