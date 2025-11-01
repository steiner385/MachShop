/**
 * RuleViolationAlert Component Tests
 *
 * Tests for the SPC rule violation alert component including:
 * - Real-time violation alerts and auto-refresh functionality
 * - Severity-based styling and visual indicators (Critical, Warning, Info)
 * - Acknowledgement workflow with resolution tracking
 * - Filtering system with tabs for different violation types
 * - Violation details modal with comprehensive information display
 * - API integration for fetching and acknowledging violations
 * - Summary alerts and badge indicators
 * - Time-based information and empty state handling
 */

import React from 'react';
import { screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { RuleViolationAlert } from '../RuleViolationAlert';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock dayjs to control time-based functionality
vi.mock('dayjs', () => {
  const actual = vi.importActual('dayjs');
  const mockDayjs = vi.fn((date?: any) => {
    if (date) {
      return (actual as any).default(date);
    }
    return (actual as any).default('2024-01-15T12:00:00Z');
  });
  Object.setPrototypeOf(mockDayjs, (actual as any).default);
  Object.assign(mockDayjs, (actual as any).default);
  mockDayjs.extend = vi.fn();
  return { default: mockDayjs };
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

describe('RuleViolationAlert', () => {
  const user = userEvent.setup();

  const mockViolations = [
    {
      id: 'violation-1',
      configurationId: 'config-1',
      ruleNumber: 1,
      ruleName: 'One point beyond 3σ',
      severity: 'CRITICAL',
      value: 12.5,
      timestamp: '2024-01-15T10:00:00Z',
      UCL: 12.0,
      LCL: 8.0,
      centerLine: 10.0,
      deviationSigma: 2.5,
      acknowledged: false,
      createdAt: '2024-01-15T10:00:00Z',
    },
    {
      id: 'violation-2',
      configurationId: 'config-1',
      ruleNumber: 2,
      ruleName: '9 points on same side',
      severity: 'WARNING',
      value: 11.2,
      timestamp: '2024-01-15T11:00:00Z',
      subgroupNumber: 5,
      UCL: 12.0,
      LCL: 8.0,
      centerLine: 10.0,
      acknowledged: false,
      createdAt: '2024-01-15T11:00:00Z',
    },
    {
      id: 'violation-3',
      configurationId: 'config-1',
      ruleNumber: 6,
      ruleName: '4 of 5 beyond 1σ',
      severity: 'INFO',
      value: 10.8,
      timestamp: '2024-01-15T09:00:00Z',
      UCL: 12.0,
      LCL: 8.0,
      centerLine: 10.0,
      acknowledged: true,
      acknowledgedBy: 'john.doe',
      acknowledgedAt: '2024-01-15T09:30:00Z',
      resolution: 'Calibrated equipment and verified process parameters',
      createdAt: '2024-01-15T09:00:00Z',
    },
  ];

  const defaultProps = {
    parameterId: 'param-123',
    parameterName: 'Temperature',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({ data: mockViolations });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render the rule violation alert component', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule Violations - Temperature')).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByText('Unacknowledged')).toBeInTheDocument();
      expect(screen.getByText('Acknowledged')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
    });

    it('should use default parameter name when not provided', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} parameterName={undefined} />);

      await waitFor(() => {
        expect(screen.getByText('Rule Violations - Parameter')).toBeInTheDocument();
      });
    });

    it('should display violation count badge when unacknowledged violations exist', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // 2 unacknowledged violations
      });
    });

    it('should not display badge when no unacknowledged violations', async () => {
      const acknowledgedViolations = mockViolations.map(v => ({ ...v, acknowledged: true }));
      mockedAxios.get.mockResolvedValue({ data: acknowledgedViolations });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule Violations - Temperature')).toBeInTheDocument();
      });

      // Should not show badge for unacknowledged count
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should fetch violations on component mount', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/spc/rule-violations/param-123', {
          params: { acknowledged: undefined },
        });
      });
    });

    it('should respect maxViolations prop', async () => {
      const manyViolations = Array.from({ length: 100 }, (_, i) => ({
        ...mockViolations[0],
        id: `violation-${i}`,
      }));
      mockedAxios.get.mockResolvedValue({ data: manyViolations });

      renderWithProviders(<RuleViolationAlert {...defaultProps} maxViolations={10} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Rule \d+/).length).toBeLessThanOrEqual(10);
      });
    });

    it('should filter acknowledged violations when showAcknowledged is false', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} showAcknowledged={false} />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/v1/spc/rule-violations/param-123', {
          params: { acknowledged: false },
        });
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockedAxios.get.mockRejectedValue(new Error('API Error'));

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching rule violations:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Auto-refresh Functionality', () => {
    it('should auto-refresh when refreshInterval is set', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} refreshInterval={5000} />);

      // Initial call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });

      // Advance time to trigger refresh
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should not auto-refresh when refreshInterval is 0', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} refreshInterval={0} />);

      // Initial call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });

      // Advance time - should not trigger refresh
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should refresh when refresh button is clicked', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      // Initial call
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('Summary Alerts', () => {
    it('should show critical alert when critical violations exist', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1 Critical Violation(s)')).toBeInTheDocument();
        expect(screen.getByText('Immediate action required. Process is out of control.')).toBeInTheDocument();
      });
    });

    it('should show warning alert when only warning violations exist', async () => {
      const warningViolations = mockViolations.filter(v => v.severity === 'WARNING');
      mockedAxios.get.mockResolvedValue({ data: warningViolations });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1 Warning Violation(s)')).toBeInTheDocument();
        expect(screen.getByText('Process showing signs of instability. Investigation recommended.')).toBeInTheDocument();
      });
    });

    it('should not show warning alert when critical violations exist', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('1 Critical Violation(s)')).toBeInTheDocument();
        expect(screen.queryByText('1 Warning Violation(s)')).not.toBeInTheDocument();
      });
    });

    it('should not show alerts when no violations exist', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.queryByText(/Critical Violation\(s\)/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Warning Violation\(s\)/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Tab Filtering', () => {
    it('should start with unacknowledged tab active', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument(); // Critical violation
        expect(screen.getByText('Rule 2')).toBeInTheDocument(); // Warning violation
        expect(screen.queryByText('Rule 6')).not.toBeInTheDocument(); // Acknowledged violation
      });
    });

    it('should filter to acknowledged violations when acknowledged tab is clicked', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgedTab = screen.getByText('Acknowledged');
      await user.click(acknowledgedTab);

      expect(screen.queryByText('Rule 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Rule 2')).not.toBeInTheDocument();
      expect(screen.getByText('Rule 6')).toBeInTheDocument();
    });

    it('should filter to critical violations when critical tab is clicked', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const criticalTab = screen.getByText('Critical');
      await user.click(criticalTab);

      expect(screen.getByText('Rule 1')).toBeInTheDocument(); // Critical violation
      expect(screen.queryByText('Rule 2')).not.toBeInTheDocument(); // Warning violation
    });

    it('should filter to warning violations when warning tab is clicked', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const warningTab = screen.getByText('Warning');
      await user.click(warningTab);

      expect(screen.queryByText('Rule 1')).not.toBeInTheDocument(); // Critical violation
      expect(screen.getByText('Rule 2')).toBeInTheDocument(); // Warning violation
    });

    it('should display tab badges with correct counts', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        // Unacknowledged tab should show 2
        const unacknowledgedBadge = screen.getAllByText('2')[0]; // First occurrence
        expect(unacknowledgedBadge).toBeInTheDocument();

        // Acknowledged tab should show 1
        const acknowledgedBadge = screen.getByText('1');
        expect(acknowledgedBadge).toBeInTheDocument();
      });
    });
  });

  describe('Violation List Display', () => {
    it('should display violation details correctly', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
        expect(screen.getByText('One point beyond 3σ')).toBeInTheDocument();
        expect(screen.getByText('Critical')).toBeInTheDocument();
        expect(screen.getByText('12.500')).toBeInTheDocument(); // Value
        expect(screen.getByText('(UCL: 12.000)')).toBeInTheDocument();
        expect(screen.getByText('(LCL: 8.000)')).toBeInTheDocument();
      });
    });

    it('should display appropriate severity icons and colors', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        const criticalTag = screen.getByText('Critical').closest('.ant-tag');
        expect(criticalTag).toHaveClass('ant-tag-red');

        const warningTag = screen.getByText('Warning').closest('.ant-tag');
        expect(warningTag).toHaveClass('ant-tag-orange');
      });
    });

    it('should show acknowledge button for unacknowledged violations', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        const acknowledgeButtons = screen.getAllByText('Acknowledge');
        expect(acknowledgeButtons).toHaveLength(2); // 2 unacknowledged violations
      });
    });

    it('should show acknowledged tag for acknowledged violations', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      // Switch to acknowledged tab
      const acknowledgedTab = screen.getByText('Acknowledged');
      await user.click(acknowledgedTab);

      expect(screen.getByText('Acknowledged')).toBeInTheDocument();
      expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument(); // No acknowledge button
    });

    it('should display subgroup number when present', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Subgroup #5')).toBeInTheDocument();
      });
    });

    it('should show empty state when no violations match filter', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No violations found')).toBeInTheDocument();
      });
    });
  });

  describe('Violation Details Modal', () => {
    it('should open details modal when Details button is clicked', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const detailsButtons = screen.getAllByText('Details');
      await user.click(detailsButtons[0]);

      expect(screen.getByText('Violation Details - Rule 1')).toBeInTheDocument();
      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('One point beyond 3σ')).toBeInTheDocument();
    });

    it('should display comprehensive violation information in modal', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const detailsButtons = screen.getAllByText('Details');
      await user.click(detailsButtons[0]);

      expect(screen.getByText('Rule Number')).toBeInTheDocument();
      expect(screen.getByText('Severity')).toBeInTheDocument();
      expect(screen.getByText('Rule Name')).toBeInTheDocument();
      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Upper Control Limit (UCL)')).toBeInTheDocument();
      expect(screen.getByText('Lower Control Limit (LCL)')).toBeInTheDocument();
      expect(screen.getByText('Deviation (σ)')).toBeInTheDocument();
    });

    it('should show resolution section for acknowledged violations', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      // Switch to acknowledged tab
      const acknowledgedTab = screen.getByText('Acknowledged');
      await user.click(acknowledgedTab);

      const detailsButton = screen.getByText('Details');
      await user.click(detailsButton);

      expect(screen.getByText('Resolution:')).toBeInTheDocument();
      expect(screen.getByText('Calibrated equipment and verified process parameters')).toBeInTheDocument();
      expect(screen.getByText('Acknowledged by john.doe')).toBeInTheDocument();
    });

    it('should show acknowledgement form for unacknowledged violations', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      expect(screen.getByText('Resolution / Action Taken:')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Describe the corrective action/)).toBeInTheDocument();
      expect(screen.getByText('Acknowledgement Required')).toBeInTheDocument();
    });

    it('should close modal when cancel/close button is clicked', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const detailsButtons = screen.getAllByText('Details');
      await user.click(detailsButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      expect(screen.queryByText('Violation Details - Rule 1')).not.toBeInTheDocument();
    });
  });

  describe('Acknowledgement Workflow', () => {
    it('should require resolution text for acknowledgement', async () => {
      const { message } = await import('antd');
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      const acknowledgeViolationButton = screen.getByText('Acknowledge Violation');
      await user.click(acknowledgeViolationButton);

      expect(message.error).toHaveBeenCalledWith('Please provide a resolution description');
    });

    it('should disable acknowledge button when resolution is empty', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      const acknowledgeViolationButton = screen.getByText('Acknowledge Violation');
      expect(acknowledgeViolationButton).toBeDisabled();
    });

    it('should enable acknowledge button when resolution is provided', async () => {
      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      const resolutionTextarea = screen.getByPlaceholderText(/Describe the corrective action/);
      await user.type(resolutionTextarea, 'Process was recalibrated');

      const acknowledgeViolationButton = screen.getByText('Acknowledge Violation');
      expect(acknowledgeViolationButton).not.toBeDisabled();
    });

    it('should successfully acknowledge violation', async () => {
      const { message } = await import('antd');
      mockedAxios.post.mockResolvedValueOnce({ data: { success: true } });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      const resolutionTextarea = screen.getByPlaceholderText(/Describe the corrective action/);
      await user.type(resolutionTextarea, 'Process was recalibrated and validated');

      const acknowledgeViolationButton = screen.getByText('Acknowledge Violation');
      await user.click(acknowledgeViolationButton);

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/v1/spc/rule-violations/violation-1/acknowledge', {
          resolution: 'Process was recalibrated and validated',
        });
      });

      expect(message.success).toHaveBeenCalledWith('Violation acknowledged successfully');
    });

    it('should handle acknowledgement errors gracefully', async () => {
      const { message } = await import('antd');
      const error = { response: { data: { error: 'Acknowledgement failed' } } };
      mockedAxios.post.mockRejectedValueOnce(error);

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      const resolutionTextarea = screen.getByPlaceholderText(/Describe the corrective action/);
      await user.type(resolutionTextarea, 'Process was recalibrated');

      const acknowledgeViolationButton = screen.getByText('Acknowledge Violation');
      await user.click(acknowledgeViolationButton);

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('Acknowledgement failed');
      });
    });

    it('should show loading state during acknowledgement', async () => {
      let resolvePromise: (value: any) => void;
      const ackPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedAxios.post.mockReturnValueOnce(ackPromise);

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
      });

      const acknowledgeButtons = screen.getAllByText('Acknowledge');
      await user.click(acknowledgeButtons[0]);

      const resolutionTextarea = screen.getByPlaceholderText(/Describe the corrective action/);
      await user.type(resolutionTextarea, 'Process was recalibrated');

      const acknowledgeViolationButton = screen.getByText('Acknowledge Violation');
      await user.click(acknowledgeViolationButton);

      // Button should show loading state
      expect(acknowledgeViolationButton).toBeDisabled();

      // Resolve the promise
      resolvePromise!({ data: { success: true } });

      await waitFor(() => {
        expect(acknowledgeViolationButton).not.toBeDisabled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle violations without optional fields', async () => {
      const minimalViolations = [
        {
          id: 'violation-minimal',
          configurationId: 'config-1',
          ruleNumber: 1,
          ruleName: 'Minimal violation',
          severity: 'WARNING',
          value: 10.5,
          timestamp: '2024-01-15T10:00:00Z',
          acknowledged: false,
          createdAt: '2024-01-15T10:00:00Z',
        },
      ];
      mockedAxios.get.mockResolvedValue({ data: minimalViolations });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Rule 1')).toBeInTheDocument();
        expect(screen.getByText('Minimal violation')).toBeInTheDocument();
        expect(screen.getByText('10.500')).toBeInTheDocument();
      });
    });

    it('should handle zero violations gracefully', async () => {
      mockedAxios.get.mockResolvedValue({ data: [] });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('No violations found')).toBeInTheDocument();
      });
    });

    it('should handle large violation counts correctly', async () => {
      const manyViolations = Array.from({ length: 150 }, (_, i) => ({
        ...mockViolations[0],
        id: `violation-${i}`,
        acknowledged: i % 2 === 0, // Half acknowledged
      }));
      mockedAxios.get.mockResolvedValue({ data: manyViolations });

      renderWithProviders(<RuleViolationAlert {...defaultProps} />);

      await waitFor(() => {
        // Should show 99+ badge for large counts
        expect(screen.getByText('99+')).toBeInTheDocument();
      });
    });
  });
});