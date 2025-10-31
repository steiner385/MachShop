/**
 * ControlChart Component Tests
 *
 * Tests for the SPC control chart component including:
 * - Chart rendering with multiple chart types (X-bar/R, I-MR, P, C, EWMA, CUSUM)
 * - Control limits display and validation (UCL, CL, LCL)
 * - Specification limits handling (USL, LSL, Target)
 * - Sigma zones visualization and calculations
 * - Rule violation detection and highlighting
 * - Interactive tooltips and data point styling
 * - Range chart functionality for X-bar/R charts
 * - Status indicators and violation summaries
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { ControlChart } from '../ControlChart';

// Mock Recharts to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  LineChart: ({ children, ...props }: any) => <div data-testid="line-chart" {...props}>{children}</div>,
  Line: (props: any) => <div data-testid="line" {...props} />,
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
  Legend: (props: any) => <div data-testid="legend" {...props} />,
  ReferenceLine: (props: any) => <div data-testid="reference-line" {...props} />,
  ResponsiveContainer: ({ children, ...props }: any) => <div data-testid="responsive-container" {...props}>{children}</div>,
  Scatter: (props: any) => <div data-testid="scatter" {...props} />,
  ComposedChart: ({ children, ...props }: any) => <div data-testid="composed-chart" {...props}>{children}</div>,
  Area: (props: any) => <div data-testid="area" {...props} />,
}));

describe('ControlChart', () => {
  const user = userEvent.setup();

  // Mock data
  const mockDataPoints = [
    { index: 0, value: 10.2, timestamp: '2024-01-15T08:00:00Z', subgroupNumber: 1 },
    { index: 1, value: 10.5, timestamp: '2024-01-15T09:00:00Z', subgroupNumber: 2 },
    { index: 2, value: 10.8, timestamp: '2024-01-15T10:00:00Z', subgroupNumber: 3 },
    { index: 3, value: 11.2, timestamp: '2024-01-15T11:00:00Z', subgroupNumber: 4 },
    { index: 4, value: 10.1, timestamp: '2024-01-15T12:00:00Z', subgroupNumber: 5 },
  ];

  const mockControlLimits = {
    UCL: 12.0,
    centerLine: 10.5,
    LCL: 9.0,
    rangeUCL: 2.5,
    rangeCL: 1.2,
    rangeLCL: 0.0,
    sigma: 0.5,
  };

  const mockSpecLimits = {
    USL: 12.5,
    LSL: 8.5,
    target: 10.5,
  };

  const mockRangeData = [
    { index: 0, value: 1.1 },
    { index: 1, value: 0.9 },
    { index: 2, value: 1.3 },
    { index: 3, value: 1.5 },
    { index: 4, value: 0.8 },
  ];

  const mockViolations = [
    {
      ruleNumber: 1,
      ruleName: 'Point Beyond Control Limits',
      severity: 'CRITICAL' as const,
      description: 'One or more points fall outside the control limits',
      dataPointIndices: [3],
      values: [11.2],
    },
    {
      ruleNumber: 2,
      ruleName: 'Nine Points in a Row on Same Side',
      severity: 'WARNING' as const,
      description: 'Nine consecutive points on the same side of center line',
      dataPointIndices: [0, 1, 2],
      values: [10.2, 10.5, 10.8],
    },
  ];

  const defaultProps = {
    chartType: 'I_MR' as const,
    data: mockDataPoints,
    limits: mockControlLimits,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the control chart with default title', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('Control Chart')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      renderWithProviders(<ControlChart {...defaultProps} title="Temperature Control Chart" />);

      expect(screen.getByText('Temperature Control Chart')).toBeInTheDocument();
    });

    it('should display control limits in header', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('UCL: 12.000')).toBeInTheDocument();
      expect(screen.getByText('CL: 10.500')).toBeInTheDocument();
      expect(screen.getByText('LCL: 9.000')).toBeInTheDocument();
    });

    it('should render chart with correct chart type', () => {
      renderWithProviders(<ControlChart {...defaultProps} chartType="X_BAR_R" />);

      expect(screen.getByText('Chart Type: X-BAR-R')).toBeInTheDocument();
    });

    it('should display sample count', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('Samples: 5')).toBeInTheDocument();
    });

    it('should display sigma value', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('σ = 0.5000')).toBeInTheDocument();
    });
  });

  describe('Chart Status and Violations', () => {
    it('should show in-control status when no violations', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('IN CONTROL')).toBeInTheDocument();
      expect(screen.queryByText('Violations')).not.toBeInTheDocument();
    });

    it('should show critical status when critical violations exist', () => {
      const criticalViolations = [
        {
          ruleNumber: 1,
          ruleName: 'Point Beyond Control Limits',
          severity: 'CRITICAL' as const,
          description: 'Critical violation detected',
          dataPointIndices: [3],
          values: [11.2],
        },
      ];

      renderWithProviders(<ControlChart {...defaultProps} violations={criticalViolations} />);

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('1 Violations')).toBeInTheDocument();
    });

    it('should show warning status when only warning violations exist', () => {
      const warningViolations = [
        {
          ruleNumber: 2,
          ruleName: 'Warning Pattern',
          severity: 'WARNING' as const,
          description: 'Warning pattern detected',
          dataPointIndices: [0, 1],
          values: [10.2, 10.5],
        },
      ];

      renderWithProviders(<ControlChart {...defaultProps} violations={warningViolations} />);

      expect(screen.getByText('WARNING')).toBeInTheDocument();
    });

    it('should prioritize critical over warning status', () => {
      renderWithProviders(<ControlChart {...defaultProps} violations={mockViolations} />);

      expect(screen.getByText('CRITICAL')).toBeInTheDocument();
      expect(screen.getByText('2 Violations')).toBeInTheDocument();
    });

    it('should display violations summary', () => {
      renderWithProviders(<ControlChart {...defaultProps} violations={mockViolations} />);

      expect(screen.getByText('Rule Violations Detected')).toBeInTheDocument();
      expect(screen.getByText('Rule 1')).toBeInTheDocument();
      expect(screen.getByText('One or more points fall outside the control limits')).toBeInTheDocument();
      expect(screen.getByText('Rule 2')).toBeInTheDocument();
      expect(screen.getByText('Nine consecutive points on the same side of center line')).toBeInTheDocument();
    });

    it('should limit violations display to 5 and show count for more', () => {
      const manyViolations = Array.from({ length: 8 }, (_, i) => ({
        ruleNumber: i + 1,
        ruleName: `Rule ${i + 1}`,
        severity: 'WARNING' as const,
        description: `Violation ${i + 1}`,
        dataPointIndices: [i],
        values: [10 + i],
      }));

      renderWithProviders(<ControlChart {...defaultProps} violations={manyViolations} />);

      expect(screen.getByText('+ 3 more violations')).toBeInTheDocument();
    });
  });

  describe('Specification Limits', () => {
    it('should render specification limits when provided', () => {
      renderWithProviders(<ControlChart {...defaultProps} specLimits={mockSpecLimits} />);

      // Specification limits are rendered as ReferenceLine components
      // We can verify the component structure but not visual rendering
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('should handle partial specification limits', () => {
      const partialSpecLimits = { USL: 12.5, target: 10.5 };
      renderWithProviders(<ControlChart {...defaultProps} specLimits={partialSpecLimits} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('should work without specification limits', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  describe('Sigma Zones', () => {
    it('should render sigma zones when enabled', () => {
      renderWithProviders(<ControlChart {...defaultProps} showSigmaZones={true} />);

      // Sigma zones are rendered as Area and ReferenceLine components
      expect(screen.getAllByTestId('area')).toHaveLength(2); // ±1σ and ±2σ zones
      expect(screen.getAllByTestId('reference-line').length).toBeGreaterThan(0);
    });

    it('should not render sigma zones when disabled', () => {
      renderWithProviders(<ControlChart {...defaultProps} showSigmaZones={false} />);

      // Should still have control limit reference lines but no sigma zone areas
      expect(screen.queryAllByTestId('area')).toHaveLength(0);
    });

    it('should default to showing sigma zones', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      // Default behavior is showSigmaZones={true}
      expect(screen.getAllByTestId('area')).toHaveLength(2);
    });
  });

  describe('Range Chart', () => {
    it('should render range chart when enabled and data provided', () => {
      renderWithProviders(
        <ControlChart
          {...defaultProps}
          chartType="X_BAR_R"
          showRangeChart={true}
          rangeData={mockRangeData}
          limits={{
            ...mockControlLimits,
            rangeUCL: 2.5,
            rangeCL: 1.2,
            rangeLCL: 0.0,
          }}
        />
      );

      expect(screen.getByText('Range Chart')).toBeInTheDocument();
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(2); // Main chart + range chart
    });

    it('should not render range chart when disabled', () => {
      renderWithProviders(
        <ControlChart
          {...defaultProps}
          chartType="X_BAR_R"
          showRangeChart={false}
          rangeData={mockRangeData}
        />
      );

      expect(screen.queryByText('Range Chart')).not.toBeInTheDocument();
      expect(screen.getAllByTestId('responsive-container')).toHaveLength(1); // Only main chart
    });

    it('should not render range chart when data is missing', () => {
      renderWithProviders(
        <ControlChart
          {...defaultProps}
          chartType="X_BAR_R"
          showRangeChart={true}
          rangeData={undefined}
        />
      );

      expect(screen.queryByText('Range Chart')).not.toBeInTheDocument();
    });

    it('should not render range chart when range limits are missing', () => {
      const limitsWithoutRange = { ...mockControlLimits };
      delete limitsWithoutRange.rangeUCL;
      delete limitsWithoutRange.rangeCL;

      renderWithProviders(
        <ControlChart
          {...defaultProps}
          chartType="X_BAR_R"
          showRangeChart={true}
          rangeData={mockRangeData}
          limits={limitsWithoutRange}
        />
      );

      expect(screen.queryByText('Range Chart')).not.toBeInTheDocument();
    });
  });

  describe('Data Point Violations', () => {
    it('should mark data points with violations', () => {
      renderWithProviders(<ControlChart {...defaultProps} violations={mockViolations} />);

      // Verify the component processes violations correctly
      // The actual visual highlighting is handled by the Scatter component
      expect(screen.getByTestId('scatter')).toBeInTheDocument();
    });

    it('should handle data without violations', () => {
      renderWithProviders(<ControlChart {...defaultProps} violations={[]} />);

      expect(screen.getByTestId('scatter')).toBeInTheDocument();
    });

    it('should handle missing violations prop', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByTestId('scatter')).toBeInTheDocument();
    });
  });

  describe('Chart Types', () => {
    const chartTypes = ['X_BAR_R', 'X_BAR_S', 'I_MR', 'P_CHART', 'C_CHART', 'EWMA', 'CUSUM'] as const;

    chartTypes.forEach((chartType) => {
      it(`should render ${chartType} chart type`, () => {
        renderWithProviders(<ControlChart {...defaultProps} chartType={chartType} />);

        expect(screen.getByText(`Chart Type: ${chartType.replace('_', '-')}`)).toBeInTheDocument();
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Custom Height', () => {
    it('should use default height when not specified', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('height', '400');
    });

    it('should use custom height when specified', () => {
      renderWithProviders(<ControlChart {...defaultProps} height={600} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('height', '600');
    });
  });

  describe('Legend and Status Indicators', () => {
    it('should display legend for point colors', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('Critical')).toBeInTheDocument();
    });

    it('should display chart information', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByText('σ = 0.5000')).toBeInTheDocument();
      expect(screen.getByText('Chart Type: I-MR')).toBeInTheDocument();
      expect(screen.getByText('Samples: 5')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data array', () => {
      renderWithProviders(<ControlChart {...defaultProps} data={[]} />);

      expect(screen.getByText('Samples: 0')).toBeInTheDocument();
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      const singlePoint = [{ index: 0, value: 10.5 }];
      renderWithProviders(<ControlChart {...defaultProps} data={singlePoint} />);

      expect(screen.getByText('Samples: 1')).toBeInTheDocument();
    });

    it('should handle large datasets', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        index: i,
        value: 10 + Math.sin(i * 0.1),
      }));

      renderWithProviders(<ControlChart {...defaultProps} data={largeDataset} />);

      expect(screen.getByText('Samples: 1000')).toBeInTheDocument();
    });

    it('should handle extreme values', () => {
      const extremeData = [
        { index: 0, value: -1000 },
        { index: 1, value: 1000 },
      ];

      renderWithProviders(<ControlChart {...defaultProps} data={extremeData} />);

      expect(screen.getByText('Samples: 2')).toBeInTheDocument();
    });

    it('should handle missing timestamps in data', () => {
      const dataWithoutTimestamps = [
        { index: 0, value: 10.2 },
        { index: 1, value: 10.5 },
      ];

      renderWithProviders(<ControlChart {...defaultProps} data={dataWithoutTimestamps} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });

    it('should handle zero sigma value', () => {
      const limitsWithZeroSigma = { ...mockControlLimits, sigma: 0 };
      renderWithProviders(<ControlChart {...defaultProps} limits={limitsWithZeroSigma} />);

      expect(screen.getByText('σ = 0.0000')).toBeInTheDocument();
    });

    it('should handle negative control limits', () => {
      const negativeLimits = {
        UCL: -5,
        centerLine: -10,
        LCL: -15,
        sigma: 2,
      };

      renderWithProviders(<ControlChart {...defaultProps} limits={negativeLimits} />);

      expect(screen.getByText('UCL: -5.000')).toBeInTheDocument();
      expect(screen.getByText('CL: -10.000')).toBeInTheDocument();
      expect(screen.getByText('LCL: -15.000')).toBeInTheDocument();
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render tooltip component', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });

    it('should render custom tooltip in chart', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      // The custom tooltip is passed to the Tooltip component
      // We can verify the Tooltip component is rendered
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render responsive container', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('width', '100%');
    });

    it('should handle different container sizes', () => {
      renderWithProviders(<ControlChart {...defaultProps} height={300} />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toHaveAttribute('height', '300');
    });
  });

  describe('Chart Elements', () => {
    it('should render all required chart elements', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument();
      expect(screen.getByTestId('scatter')).toBeInTheDocument();
    });

    it('should render control limit reference lines', () => {
      renderWithProviders(<ControlChart {...defaultProps} />);

      // Should have at least 3 reference lines for UCL, CL, LCL
      const referenceLines = screen.getAllByTestId('reference-line');
      expect(referenceLines.length).toBeGreaterThanOrEqual(3);
    });

    it('should render additional reference lines for sigma zones', () => {
      renderWithProviders(<ControlChart {...defaultProps} showSigmaZones={true} />);

      // Should have additional reference lines for sigma zones
      const referenceLines = screen.getAllByTestId('reference-line');
      expect(referenceLines.length).toBeGreaterThan(3);
    });
  });
});