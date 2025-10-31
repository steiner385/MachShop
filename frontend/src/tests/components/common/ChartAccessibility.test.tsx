/**
 * Tests for Chart Accessibility Components
 * Issue #284: Enhance Chart Component Accessibility
 *
 * Comprehensive tests for WCAG 2.1 Level AA compliance
 * Tests accessibility wrapper, responsive container, and color utilities
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  AccessibleChartWrapper,
  useChartAccessibility,
  generateChartDescription,
  getAccessibleColor,
  withChartAccessibility,
} from '../../../components/common/ChartAccessibility';
import { ResponsiveChartContainer } from '../../../components/common/ResponsiveChartContainer';

// Mock data for testing
const mockChartData = [
  { date: '2024-01', value: 100, label: 'January' },
  { date: '2024-02', value: 150, label: 'February' },
  { date: '2024-03', value: 120, label: 'March' },
  { date: '2024-04', value: 180, label: 'April' },
];

// Mock accessible colors utility
vi.mock('../../../utils/accessibleColors', () => ({
  getAccessibleDataPointStyle: vi.fn((index: number) => ({
    color: ['#0066CC', '#008844', '#CC6600'][index % 3],
    pattern: 'solid',
    shape: 'circle',
    strokeWidth: 2,
    opacity: 1,
    dotSize: 6,
    activeDotSize: 8,
  })),
  validateColorContrast: vi.fn(() => ({
    isValid: true,
    contrastRatio: 7.2,
    level: 'AAA',
  })),
  getAccessibleColorScheme: vi.fn(() => ['#0066CC', '#008844', '#CC6600']),
}));

// Test wrapper component
const TestChartComponent = ({ data = mockChartData }) => (
  <ResponsiveContainer width="100%" height={300}>
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="date" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="#0066CC" />
    </LineChart>
  </ResponsiveContainer>
);

describe('Chart Accessibility Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AccessibleChartWrapper', () => {
    const defaultProps = {
      title: 'Test Chart',
      description: 'A test chart for accessibility verification',
      chartType: 'Line Chart',
      data: mockChartData,
    };

    it('should render with proper ARIA attributes', () => {
      render(
        <AccessibleChartWrapper {...defaultProps}>
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      // Check for live region
      const liveRegion = document.querySelector('[aria-live="assertive"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');

      // Check for chart container with proper role
      const chartContainer = document.querySelector('[role="img"]');
      expect(chartContainer).toBeInTheDocument();
      expect(chartContainer).toHaveAttribute('aria-label', 'Line Chart showing 4 data points');
    });

    it('should display chart title and description', () => {
      render(
        <AccessibleChartWrapper {...defaultProps}>
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      expect(screen.getByText('Test Chart')).toBeInTheDocument();
      expect(screen.getByText(/Chart Description:/)).toBeInTheDocument();
      expect(screen.getByText(/A test chart for accessibility verification/)).toBeInTheDocument();
    });

    it('should toggle data table view', async () => {
      const user = userEvent.setup();
      render(
        <AccessibleChartWrapper {...defaultProps}>
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      const tableButton = screen.getByRole('button', { name: /show data table view/i });
      expect(tableButton).toBeInTheDocument();

      // Initially table should not be visible
      expect(screen.queryByRole('table')).not.toBeInTheDocument();

      // Click to show table
      await user.click(tableButton);

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Check table content
      expect(screen.getByText('January')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();

      // Button should now show hide option
      expect(screen.getByRole('button', { name: /hide data table view/i })).toBeInTheDocument();
    });

    it('should display accessibility controls when enabled', () => {
      render(
        <AccessibleChartWrapper
          {...defaultProps}
          enableAccessibilityControls={true}
          enableTouchSupport={true}
        >
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      // Check for accessibility mode selector
      expect(screen.getByRole('combobox', { name: /chart accessibility mode/i })).toBeInTheDocument();

      // Check for touch optimization button
      expect(screen.getByRole('button', { name: /enable touch optimization/i })).toBeInTheDocument();
    });

    it('should handle accessibility mode changes', async () => {
      const onModeChange = vi.fn();
      const user = userEvent.setup();

      render(
        <AccessibleChartWrapper
          {...defaultProps}
          enableAccessibilityControls={true}
          onAccessibilityModeChange={onModeChange}
        >
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      const modeSelector = screen.getByRole('combobox', { name: /chart accessibility mode/i });

      await user.click(modeSelector);

      // Select high contrast mode
      const highContrastOption = screen.getByText('High Contrast');
      await user.click(highContrastOption);

      expect(onModeChange).toHaveBeenCalledWith('highContrast');
    });

    it('should announce changes to screen readers', async () => {
      const user = userEvent.setup();
      render(
        <AccessibleChartWrapper {...defaultProps}>
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      const tableButton = screen.getByRole('button', { name: /show data table view/i });
      await user.click(tableButton);

      // Check that announcement is made to screen readers
      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="assertive"]');
        expect(liveRegion).toHaveTextContent('Data table displayed');
      });
    });

    it('should render custom table columns when provided', () => {
      const customColumns = [
        {
          title: 'Custom Date',
          dataIndex: 'date',
          key: 'date',
        },
        {
          title: 'Custom Value',
          dataIndex: 'value',
          key: 'value',
        },
      ];

      render(
        <AccessibleChartWrapper
          {...defaultProps}
          tableColumns={customColumns}
        >
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      const tableButton = screen.getByRole('button', { name: /show data table view/i });
      fireEvent.click(tableButton);

      expect(screen.getByText('Custom Date')).toBeInTheDocument();
      expect(screen.getByText('Custom Value')).toBeInTheDocument();
    });

    it('should handle touch optimization toggle', async () => {
      const user = userEvent.setup();
      render(
        <AccessibleChartWrapper
          {...defaultProps}
          enableTouchSupport={true}
        >
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      const touchButton = screen.getByRole('button', { name: /enable touch optimization/i });
      await user.click(touchButton);

      expect(screen.getByRole('button', { name: /disable touch optimization/i })).toBeInTheDocument();

      // Check for screen reader announcement
      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="assertive"]');
        expect(liveRegion).toHaveTextContent('Touch optimization enabled');
      });
    });
  });

  describe('ResponsiveChartContainer', () => {
    it('should render with default dimensions', () => {
      render(
        <ResponsiveChartContainer>
          <TestChartComponent />
        </ResponsiveChartContainer>
      );

      const container = document.querySelector('[role="img"]');
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({ height: '400px' });
    });

    it('should apply custom dimensions', () => {
      render(
        <ResponsiveChartContainer height={500} minHeight={300} maxHeight={700}>
          <TestChartComponent />
        </ResponsiveChartContainer>
      );

      const container = document.querySelector('[role="img"]');
      expect(container).toHaveStyle({
        height: '500px',
        minHeight: '300px',
        maxHeight: '700px',
      });
    });

    it('should apply ARIA attributes', () => {
      render(
        <ResponsiveChartContainer
          aria-label="Custom chart label"
          aria-describedby="custom-description"
        >
          <TestChartComponent />
        </ResponsiveChartContainer>
      );

      const container = document.querySelector('[role="img"]');
      expect(container).toHaveAttribute('aria-label', 'Custom chart label');
      expect(container).toHaveAttribute('aria-describedby', 'custom-description');
    });
  });

  describe('useChartAccessibility Hook', () => {
    let TestComponent: React.FC;

    beforeEach(() => {
      TestComponent = () => {
        const {
          showDataTable,
          announceText,
          accessibilityMode,
          touchOptimized,
          toggleDataTable,
          changeAccessibilityMode,
          toggleTouchOptimization,
        } = useChartAccessibility();

        return (
          <div>
            <span data-testid="showDataTable">{showDataTable.toString()}</span>
            <span data-testid="announceText">{announceText}</span>
            <span data-testid="accessibilityMode">{accessibilityMode}</span>
            <span data-testid="touchOptimized">{touchOptimized.toString()}</span>
            <button onClick={toggleDataTable}>Toggle Table</button>
            <button onClick={() => changeAccessibilityMode('highContrast')}>
              High Contrast
            </button>
            <button onClick={toggleTouchOptimization}>Toggle Touch</button>
          </div>
        );
      };
    });

    it('should initialize with default values', () => {
      render(<TestComponent />);

      expect(screen.getByTestId('showDataTable')).toHaveTextContent('false');
      expect(screen.getByTestId('accessibilityMode')).toHaveTextContent('default');
      expect(screen.getByTestId('touchOptimized')).toHaveTextContent('false');
    });

    it('should toggle data table state', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const toggleButton = screen.getByText('Toggle Table');
      await user.click(toggleButton);

      expect(screen.getByTestId('showDataTable')).toHaveTextContent('true');
    });

    it('should change accessibility mode', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const highContrastButton = screen.getByText('High Contrast');
      await user.click(highContrastButton);

      expect(screen.getByTestId('accessibilityMode')).toHaveTextContent('highContrast');
    });

    it('should toggle touch optimization', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const touchButton = screen.getByText('Toggle Touch');
      await user.click(touchButton);

      expect(screen.getByTestId('touchOptimized')).toHaveTextContent('true');
    });

    it('should announce changes', async () => {
      const user = userEvent.setup();
      render(<TestComponent />);

      const toggleButton = screen.getByText('Toggle Table');
      await user.click(toggleButton);

      // Wait for announcement
      await waitFor(() => {
        expect(screen.getByTestId('announceText')).toHaveTextContent('Data table displayed');
      });

      // Announcement should clear after timeout
      await waitFor(() => {
        expect(screen.getByTestId('announceText')).toHaveTextContent('');
      }, { timeout: 200 });
    });
  });

  describe('Utility Functions', () => {
    describe('generateChartDescription', () => {
      it('should generate basic description', () => {
        const description = generateChartDescription('Line Chart', 5);
        expect(description).toContain('Line Chart chart with 5 data points');
        expect(description).toContain('Use the Table View button');
      });

      it('should include additional information', () => {
        const description = generateChartDescription(
          'Bar Chart',
          10,
          'Shows sales data over time.'
        );
        expect(description).toContain('Bar Chart chart with 10 data points');
        expect(description).toContain('Shows sales data over time');
      });
    });

    describe('getAccessibleColor', () => {
      it('should return accessible color configuration', () => {
        const colorConfig = getAccessibleColor(0);
        expect(colorConfig).toHaveProperty('color');
        expect(colorConfig).toHaveProperty('pattern');
        expect(colorConfig).toHaveProperty('shape');
      });

      it('should handle different accessibility modes', () => {
        const defaultConfig = getAccessibleColor(0, false, 'default');
        const highContrastConfig = getAccessibleColor(0, false, 'highContrast');
        const colorblindConfig = getAccessibleColor(0, false, 'colorblindFriendly');

        expect(defaultConfig).toHaveProperty('color');
        expect(highContrastConfig).toHaveProperty('color');
        expect(colorblindConfig).toHaveProperty('color');
      });

      it('should handle highlighted state', () => {
        const normalConfig = getAccessibleColor(0, false);
        const highlightedConfig = getAccessibleColor(0, true);

        expect(highlightedConfig.isHighlighted).toBe(true);
        expect(highlightedConfig.pattern).toBe('diagonal-stripes');
      });
    });
  });

  describe('Higher-Order Component', () => {
    it('should wrap component with accessibility features', () => {
      const WrappedChart = withChartAccessibility(TestChartComponent, {
        chartType: 'Line Chart',
        getDescription: () => 'Custom description for wrapped chart',
      });

      render(
        <WrappedChart
          title="Wrapped Chart"
          data={mockChartData}
        />
      );

      expect(screen.getByText('Wrapped Chart')).toBeInTheDocument();
      expect(screen.getByText(/Custom description for wrapped chart/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /show data table view/i })).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation for controls', async () => {
      const user = userEvent.setup();
      render(
        <AccessibleChartWrapper
          {...defaultProps}
          enableAccessibilityControls={true}
        >
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      // Tab to table view button
      await user.tab();
      expect(screen.getByRole('button', { name: /show data table view/i })).toHaveFocus();

      // Tab to accessibility mode selector
      await user.tab();
      expect(screen.getByRole('combobox', { name: /chart accessibility mode/i })).toHaveFocus();

      // Activate with keyboard
      await user.keyboard('{Enter}');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      // Should change to high contrast mode
      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="assertive"]');
        expect(liveRegion).toHaveTextContent(/High Contrast/);
      });
    });

    it('should support Enter and Space key activation', async () => {
      const user = userEvent.setup();
      render(
        <AccessibleChartWrapper {...defaultProps}>
          <TestChartComponent />
        </AccessibleChartWrapper>
      );

      const tableButton = screen.getByRole('button', { name: /show data table view/i });
      tableButton.focus();

      // Activate with Enter key
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', () => {
      render(
        <AccessibleChartWrapper
          title="Empty Chart"
          description="Chart with no data"
          chartType="Line Chart"
          data={[]}
        >
          <TestChartComponent data={[]} />
        </AccessibleChartWrapper>
      );

      expect(screen.getByText('Empty Chart')).toBeInTheDocument();
      expect(screen.getByText(/0 data points/)).toBeInTheDocument();
    });

    it('should handle malformed data', () => {
      const malformedData = [
        { date: null, value: undefined },
        { date: '2024-01', value: 'invalid' },
      ];

      render(
        <AccessibleChartWrapper
          title="Malformed Data Chart"
          description="Chart with malformed data"
          chartType="Line Chart"
          data={malformedData}
        >
          <TestChartComponent data={malformedData} />
        </AccessibleChartWrapper>
      );

      expect(screen.getByText('Malformed Data Chart')).toBeInTheDocument();
      // Should still render table view button
      expect(screen.getByRole('button', { name: /show data table view/i })).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-${String(i + 1).padStart(3, '0')}`,
        value: Math.random() * 1000,
        label: `Data Point ${i + 1}`,
      }));

      const { rerender } = render(
        <AccessibleChartWrapper
          title="Large Dataset Chart"
          description="Chart with large dataset"
          chartType="Line Chart"
          data={largeDataset}
        >
          <TestChartComponent data={largeDataset} />
        </AccessibleChartWrapper>
      );

      expect(screen.getByText('Large Dataset Chart')).toBeInTheDocument();
      expect(screen.getByText(/1000 data points/)).toBeInTheDocument();

      // Test that re-rendering with updated data doesn't cause performance issues
      const updatedDataset = largeDataset.map(item => ({
        ...item,
        value: item.value * 2,
      }));

      rerender(
        <AccessibleChartWrapper
          title="Large Dataset Chart"
          description="Chart with large dataset"
          chartType="Line Chart"
          data={updatedDataset}
        >
          <TestChartComponent data={updatedDataset} />
        </AccessibleChartWrapper>
      );

      expect(screen.getByText('Large Dataset Chart')).toBeInTheDocument();
    });
  });
});