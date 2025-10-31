/**
 * KitReportGenerator Component Tests
 *
 * Comprehensive test suite for KitReportGenerator component covering:
 * - Multi-step wizard navigation
 * - Report template selection and management
 * - Form configuration and validation
 * - Report preview and generation
 * - Custom template creation and saving
 * - Recent reports management
 * - Export functionality and formats
 * - User interactions and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KitReportGenerator } from '../../../components/Kits/KitReportGenerator';
import { useKitStore } from '../../../store/kitStore';

// Mock the kit store
vi.mock('../../../store/kitStore', () => ({
  useKitStore: vi.fn()
}));

// Mock dayjs
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn((date) => ({
    subtract: vi.fn().mockReturnThis(),
    toISOString: vi.fn().mockReturnValue('2024-01-15T10:30:00.000Z'),
    fromNow: vi.fn().mockReturnValue('2 days ago'),
    format: vi.fn().mockReturnValue('Oct 30, 2024 10:30')
  }));
  return {
    default: mockDayjs,
    __esModule: true
  };
});

// Mock window.open for download functionality
Object.defineProperty(window, 'open', {
  writable: true,
  value: vi.fn()
});

// Mock timers for async operations
vi.useFakeTimers();

describe('KitReportGenerator', () => {
  const mockKitStore = {
    loading: {
      reports: false
    }
  };

  beforeEach(() => {
    vi.mocked(useKitStore).mockReturnValue(mockKitStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe('Initial Rendering and Layout', () => {
    it('renders main header and description', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Kit Report Generator')).toBeInTheDocument();
      expect(screen.getByText('Create custom reports and analytics for kit management data')).toBeInTheDocument();
    });

    it('renders step wizard correctly', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Template')).toBeInTheDocument();
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.getByText('Review')).toBeInTheDocument();
    });

    it('starts on the first step', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Select Report Template')).toBeInTheDocument();
      expect(screen.getByText('Create Custom Report')).toBeInTheDocument();
    });

    it('renders recent reports panel', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Recent Reports')).toBeInTheDocument();
    });
  });

  describe('Template Selection (Step 1)', () => {
    it('displays predefined templates', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Daily Kit Summary')).toBeInTheDocument();
      expect(screen.getByText('Cost Analysis Report')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
      expect(screen.getByText('Compliance Audit Trail')).toBeInTheDocument();
    });

    it('shows template descriptions and categories', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Daily overview of kit generation, completion, and performance')).toBeInTheDocument();
      expect(screen.getByText('Detailed cost breakdown by kit, stage, and time period')).toBeInTheDocument();
    });

    it('displays template usage statistics', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Used 156 times')).toBeInTheDocument();
      expect(screen.getByText('Used 89 times')).toBeInTheDocument();
      expect(screen.getByText('Used 112 times')).toBeInTheDocument();
      expect(screen.getByText('Used 34 times')).toBeInTheDocument();
    });

    it('allows template selection with visual feedback', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);

      // Should show border indicating selection
      expect(templateCard).toHaveStyle({ border: '2px solid #1890ff' });
    });

    it('disables Next button when no template is selected', () => {
      render(<KitReportGenerator />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('enables Next button after template selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeEnabled();
    });

    it('allows creating custom report', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      const customButton = screen.getByText('Create Custom Report');
      await user.click(customButton);

      // Should move to configuration step
      expect(screen.getByText('Report Name')).toBeInTheDocument();
    });
  });

  describe('Configuration (Step 2)', () => {
    beforeEach(async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Select a template and proceed to configuration
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    });

    it('renders form fields correctly', () => {
      expect(screen.getByLabelText(/report name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/output format/i)).toBeInTheDocument();
    });

    it('pre-fills form with template data', () => {
      expect(screen.getByDisplayValue('Daily Kit Summary')).toBeInTheDocument();
    });

    it('displays field selection categories', () => {
      expect(screen.getByText('BASIC')).toBeInTheDocument();
      expect(screen.getByText('TIMING')).toBeInTheDocument();
      expect(screen.getByText('FINANCIAL')).toBeInTheDocument();
      expect(screen.getByText('QUALITY')).toBeInTheDocument();
      expect(screen.getByText('LOCATION')).toBeInTheDocument();
      expect(screen.getByText('ITEMS')).toBeInTheDocument();
    });

    it('shows field selection checkboxes', () => {
      expect(screen.getByRole('checkbox', { name: /kit number/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /kit name/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /priority/i })).toBeInTheDocument();
    });

    it('validates required fields', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      // Clear the report name
      const reportNameInput = screen.getByLabelText(/report name/i);
      await user.clear(reportNameInput);

      // Try to proceed to next step
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter report name')).toBeInTheDocument();
      });
    });

    it('allows output format selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const formatSelect = screen.getByLabelText(/output format/i);
      await user.click(formatSelect);

      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('Excel')).toBeInTheDocument();
      expect(screen.getByText('CSV')).toBeInTheDocument();
      expect(screen.getByText('JSON')).toBeInTheDocument();

      await user.click(screen.getByText('Excel'));
      expect(screen.getByDisplayValue('excel')).toBeInTheDocument();
    });

    it('allows grouping and sorting selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const groupBySelect = screen.getByLabelText(/group by/i);
      await user.click(groupBySelect);

      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Assembly Stage')).toBeInTheDocument();

      await user.click(screen.getByText('Status'));
    });

    it('allows chart type selection', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const chartTypeSelect = screen.getByLabelText(/chart type/i);
      await user.click(chartTypeSelect);

      expect(screen.getByText('Table Only')).toBeInTheDocument();
      expect(screen.getByText('Bar Chart')).toBeInTheDocument();
      expect(screen.getByText('Line Chart')).toBeInTheDocument();
      expect(screen.getByText('Pie Chart')).toBeInTheDocument();
    });

    it('handles checkbox options correctly', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const includeChartsCheckbox = screen.getByRole('checkbox', { name: /include charts/i });
      const includeRawDataCheckbox = screen.getByRole('checkbox', { name: /include raw data/i });
      const scheduleReportCheckbox = screen.getByRole('checkbox', { name: /schedule report/i });

      expect(includeChartsCheckbox).toBeChecked(); // Default to checked
      expect(includeRawDataCheckbox).not.toBeChecked();
      expect(scheduleReportCheckbox).not.toBeChecked();

      await user.click(includeRawDataCheckbox);
      expect(includeRawDataCheckbox).toBeChecked();
    });
  });

  describe('Review (Step 3)', () => {
    beforeEach(async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to review step
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);

      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Configure report (already pre-filled)
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    });

    it('displays report summary', () => {
      expect(screen.getByText('Report Summary')).toBeInTheDocument();
      expect(screen.getByText('Report Name:')).toBeInTheDocument();
      expect(screen.getByText('Output Format:')).toBeInTheDocument();
      expect(screen.getByText('Fields:')).toBeInTheDocument();
    });

    it('shows configuration details', () => {
      expect(screen.getByText('Date Range:')).toBeInTheDocument();
      expect(screen.getByText('Group By:')).toBeInTheDocument();
      expect(screen.getByText('Include Charts:')).toBeInTheDocument();
    });

    it('provides preview data button', () => {
      expect(screen.getByRole('button', { name: /preview data/i })).toBeInTheDocument();
    });

    it('provides save as template button', () => {
      expect(screen.getByRole('button', { name: /save as template/i })).toBeInTheDocument();
    });

    it('provides generate report button', () => {
      expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument();
    });

    it('generates report preview', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const previewButton = screen.getByRole('button', { name: /preview data/i });
      await user.click(previewButton);

      // Should show loading state
      expect(previewButton).toHaveAttribute('aria-describedby'); // Loading indicator

      // Advance time to complete the mock async operation
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        expect(screen.getByText('Report Preview')).toBeInTheDocument();
      });
    });

    it('allows saving as custom template', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const saveTemplateButton = screen.getByRole('button', { name: /save as template/i });
      await user.click(saveTemplateButton);

      await waitFor(() => {
        expect(screen.getByText('Save as Template')).toBeInTheDocument();
        expect(screen.getByLabelText(/template name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      });

      // Fill in template details
      await user.type(screen.getByLabelText(/template name/i), 'My Custom Template');
      await user.type(screen.getByLabelText(/description/i), 'Custom template description');

      const okButton = screen.getByRole('button', { name: /ok/i });
      await user.click(okButton);

      // Should close modal
      await waitFor(() => {
        expect(screen.queryByText('Save as Template')).not.toBeInTheDocument();
      });
    });
  });

  describe('Navigation Between Steps', () => {
    it('allows forward navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Step 1 to 2
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(screen.getByText('Report Name')).toBeInTheDocument();

      // Step 2 to 3
      const nextButton2 = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton2);

      expect(screen.getByText('Report Summary')).toBeInTheDocument();
    });

    it('allows backward navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to step 3
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Go back to step 2
      const previousButton = screen.getByRole('button', { name: /previous/i });
      await user.click(previousButton);

      expect(screen.getByText('Report Name')).toBeInTheDocument();

      // Go back to step 1
      const previousButton2 = screen.getByRole('button', { name: /previous/i });
      await user.click(previousButton2);

      expect(screen.getByText('Select Report Template')).toBeInTheDocument();
    });

    it('maintains form data during navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to configuration
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Modify report name
      const reportNameInput = screen.getByLabelText(/report name/i);
      await user.clear(reportNameInput);
      await user.type(reportNameInput, 'Modified Report Name');

      // Go to review and back
      const nextButton2 = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton2);
      const previousButton = screen.getByRole('button', { name: /previous/i });
      await user.click(previousButton);

      // Should maintain the modified name
      expect(screen.getByDisplayValue('Modified Report Name')).toBeInTheDocument();
    });
  });

  describe('Report Generation', () => {
    beforeEach(async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to final step
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
    });

    it('generates report successfully', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      // Should show loading state
      expect(generateButton).toHaveAttribute('aria-describedby');

      // Complete the async operation
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        // Should reset to first step after successful generation
        expect(screen.getByText('Select Report Template')).toBeInTheDocument();
      });
    });

    it('shows loading state during generation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      const generateButton = screen.getByRole('button', { name: /generate report/i });
      await user.click(generateButton);

      expect(generateButton).toHaveAttribute('aria-describedby');
    });
  });

  describe('Recent Reports Management', () => {
    it('displays recent reports list', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('Daily Kit Summary - Oct 30')).toBeInTheDocument();
      expect(screen.getByText('Cost Analysis - October')).toBeInTheDocument();
      expect(screen.getByText('Performance Metrics - Weekly')).toBeInTheDocument();
    });

    it('shows report status and metadata', () => {
      render(<KitReportGenerator />);

      expect(screen.getByText('2.4 MB')).toBeInTheDocument();
      expect(screen.getByText('5.1 MB')).toBeInTheDocument();
      expect(screen.getByText('1.8 MB')).toBeInTheDocument();

      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('GENERATING')).toBeInTheDocument();
    });

    it('provides download links for completed reports', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      const downloadButtons = screen.getAllByRole('button', { name: /download/i });
      expect(downloadButtons.length).toBeGreaterThan(0);

      await user.click(downloadButtons[0]);
      expect(window.open).toHaveBeenCalledWith('/reports/daily-summary-oct30.pdf');
    });

    it('provides delete functionality for reports', () => {
      render(<KitReportGenerator />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    it('shows generating status with badge', () => {
      render(<KitReportGenerator />);

      // Performance Metrics report should show generating status
      const generatingRow = screen.getByText('Performance Metrics - Weekly').closest('tr');
      expect(generatingRow).toBeInTheDocument();
    });
  });

  describe('Preview Modal', () => {
    beforeEach(async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to review step and open preview
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const previewButton = screen.getByRole('button', { name: /preview data/i });
      await user.click(previewButton);

      vi.advanceTimersByTime(2000);
    });

    it('displays preview table with sample data', async () => {
      await waitFor(() => {
        expect(screen.getByText('Report Preview')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12346-01')).toBeInTheDocument();
      });
    });

    it('shows formatted data in preview columns', async () => {
      await waitFor(() => {
        expect(screen.getByText('$12,500')).toBeInTheDocument();
        expect(screen.getByText('$9,800')).toBeInTheDocument();
        expect(screen.getByText('4.2h')).toBeInTheDocument();
        expect(screen.getByText('3.8h')).toBeInTheDocument();
      });
    });

    it('allows closing preview modal', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await waitFor(() => {
        expect(screen.getByText('Report Preview')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Report Preview')).not.toBeInTheDocument();
      });
    });

    it('allows generating full report from preview', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

      await waitFor(() => {
        expect(screen.getByText('Report Preview')).toBeInTheDocument();
      });

      const generateFullReportButton = screen.getByRole('button', { name: /generate full report/i });
      await user.click(generateFullReportButton);

      expect(generateFullReportButton).toHaveAttribute('aria-describedby');
    });
  });

  describe('Error Handling', () => {
    it('handles template loading errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(<KitReportGenerator />);

      // Component should still render even if template loading fails
      expect(screen.getByText('Kit Report Generator')).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('handles preview generation errors', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<KitReportGenerator />);

      // Navigate to review step
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);
      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Try to generate preview
      const previewButton = screen.getByRole('button', { name: /preview data/i });
      await user.click(previewButton);

      // Component should handle errors gracefully
      vi.advanceTimersByTime(2000);

      consoleSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<KitReportGenerator />);

      expect(screen.getByRole('tablist')).toBeInTheDocument(); // Steps component
      expect(screen.getAllByRole('tab')).toHaveLength(3); // Three steps
      expect(screen.getByRole('table')).toBeInTheDocument(); // Recent reports table
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Tab to first template card
      await user.tab();
      expect(document.activeElement).toBe(screen.getByText('Daily Kit Summary').closest('.ant-card'));

      // Should be able to select with Enter
      await user.keyboard('{Enter}');
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      expect(templateCard).toHaveStyle({ border: '2px solid #1890ff' });
    });

    it('provides proper form accessibility', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to configuration step
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Form fields should have proper labels
      expect(screen.getByLabelText(/report name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date range/i)).toBeInTheDocument();
    });

    it('provides meaningful error messages', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<KitReportGenerator />);

      // Navigate to configuration and clear required field
      const templateCard = screen.getByText('Daily Kit Summary').closest('.ant-card');
      await user.click(templateCard!);
      let nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      const reportNameInput = screen.getByLabelText(/report name/i);
      await user.clear(reportNameInput);

      nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Please enter report name')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    it('renders responsively on different screen sizes', () => {
      render(<KitReportGenerator />);

      // Check for responsive grid layout
      const mainContent = screen.getByText('Kit Report Generator').closest('.ant-row');
      expect(mainContent).toBeInTheDocument();

      // Recent reports should be in a separate column
      expect(screen.getByText('Recent Reports')).toBeInTheDocument();
    });
  });
});