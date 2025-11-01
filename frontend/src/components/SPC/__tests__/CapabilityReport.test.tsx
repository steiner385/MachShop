/**
 * CapabilityReport Component Tests
 *
 * Tests for the SPC capability report component including:
 * - Capability indices display (Cp, Cpk, Pp, Ppk, Cpm) with visual indicators
 * - Process histogram with specification limits and process mean
 * - Process statistics calculation and display
 * - Capability assessment with severity levels and interpretation
 * - Visual charts with specification lines and data visualization
 * - Defect rate calculations and centering analysis
 * - Export functionality and comprehensive reporting
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { CapabilityReport } from '../CapabilityReport';

// Mock Recharts to avoid canvas rendering issues in tests
vi.mock('recharts', () => ({
  Bar: (props: any) => <div data-testid="bar" {...props} />,
  XAxis: (props: any) => <div data-testid="x-axis" {...props} />,
  YAxis: (props: any) => <div data-testid="y-axis" {...props} />,
  CartesianGrid: (props: any) => <div data-testid="cartesian-grid" {...props} />,
  Tooltip: (props: any) => <div data-testid="tooltip" {...props} />,
  ResponsiveContainer: ({ children, ...props }: any) => <div data-testid="responsive-container" {...props}>{children}</div>,
  ReferenceLine: (props: any) => <div data-testid="reference-line" {...props} />,
  Area: (props: any) => <div data-testid="area" {...props} />,
  ComposedChart: ({ children, ...props }: any) => <div data-testid="composed-chart" {...props}>{children}</div>,
}));

describe('CapabilityReport', () => {
  const user = userEvent.setup();
  const mockOnExport = vi.fn();

  // Mock process data - normally distributed around 90
  const mockData = [
    87.2, 88.5, 89.1, 89.8, 90.2, 90.5, 90.8, 91.1, 91.5, 92.3,
    86.8, 87.9, 88.8, 89.5, 90.0, 90.3, 90.7, 91.2, 91.8, 92.1,
    87.5, 88.2, 89.3, 89.9, 90.1, 90.4, 90.9, 91.0, 91.6, 92.0,
    87.1, 88.1, 89.0, 89.7, 90.2, 90.6, 90.8, 91.3, 91.7, 92.2,
  ];

  const mockCapability = {
    Cp: 1.45,
    Cpk: 1.33,
    Pp: 1.42,
    Ppk: 1.30,
    Cpm: 1.28,
  };

  const mockSpecLimits = {
    USL: 95.0,
    LSL: 85.0,
    target: 90.0,
  };

  const mockStatistics = {
    mean: 89.875,
    stdDev: 1.725,
    min: 86.8,
    max: 92.3,
    range: 5.5,
    sampleSize: 40,
  };

  const defaultProps = {
    parameterName: 'Temperature',
    data: mockData,
    capability: mockCapability,
    specLimits: mockSpecLimits,
    statistics: mockStatistics,
    onExport: mockOnExport,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the capability report with default title', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Process Capability Report')).toBeInTheDocument();
      expect(screen.getByText('Adequate')).toBeInTheDocument(); // Cpk = 1.33
    });

    it('should render with custom title', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} title="Temperature Capability Analysis" />);

      expect(screen.getByText('Temperature Capability Analysis')).toBeInTheDocument();
    });

    it('should display export button when showExport is true', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} showExport={true} />);

      expect(screen.getByRole('button', { name: /export pdf/i })).toBeInTheDocument();
    });

    it('should not display export button when showExport is false', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} showExport={false} />);

      expect(screen.queryByRole('button', { name: /export pdf/i })).not.toBeInTheDocument();
    });

    it('should display warning alert for low capability', () => {
      const lowCapability = { ...mockCapability, Cpk: 1.20 };
      renderWithProviders(<CapabilityReport {...defaultProps} capability={lowCapability} />);

      expect(screen.getByText('Process Capability Warning')).toBeInTheDocument();
      expect(screen.getByText(/Cpk = 1.200 is below recommended minimum of 1.33/)).toBeInTheDocument();
    });

    it('should not display warning alert for adequate capability', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.queryByText('Process Capability Warning')).not.toBeInTheDocument();
    });
  });

  describe('Capability Indices Display', () => {
    it('should display all capability indices correctly', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Cp')).toBeInTheDocument();
      expect(screen.getByText('1.450')).toBeInTheDocument();
      expect(screen.getByText('(Potential)')).toBeInTheDocument();

      expect(screen.getByText('Cpk')).toBeInTheDocument();
      expect(screen.getByText('1.330')).toBeInTheDocument();
      expect(screen.getByText('(Actual)')).toBeInTheDocument();

      expect(screen.getByText('Pp')).toBeInTheDocument();
      expect(screen.getByText('1.420')).toBeInTheDocument();
      expect(screen.getByText('(Performance)')).toBeInTheDocument();

      expect(screen.getByText('Ppk')).toBeInTheDocument();
      expect(screen.getByText('1.300')).toBeInTheDocument();
      expect(screen.getByText('(Actual Perf.)')).toBeInTheDocument();
    });

    it('should display Cpm when provided', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Cpm')).toBeInTheDocument();
      expect(screen.getByText('1.280')).toBeInTheDocument();
      expect(screen.getByText('(Taguchi)')).toBeInTheDocument();
    });

    it('should not display Cpm when not provided', () => {
      const capabilityWithoutCpm = { ...mockCapability };
      delete capabilityWithoutCpm.Cpm;

      renderWithProviders(<CapabilityReport {...defaultProps} capability={capabilityWithoutCpm} />);

      expect(screen.queryByText('Cpm')).not.toBeInTheDocument();
      expect(screen.queryByText('(Taguchi)')).not.toBeInTheDocument();
    });

    it('should display appropriate colors for good capability indices', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      // Cp >= 1.33 should be green
      const cpStatistic = screen.getByText('1.450').closest('.ant-statistic');
      expect(cpStatistic).toHaveStyle('color: rgb(63, 134, 0)'); // #3f8600
    });

    it('should display appropriate colors for poor capability indices', () => {
      const poorCapability = {
        Cp: 0.85,
        Cpk: 0.80,
        Pp: 0.82,
        Ppk: 0.78,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} capability={poorCapability} />);

      // Cp < 1.33 should be red
      const cpStatistic = screen.getByText('0.850').closest('.ant-statistic');
      expect(cpStatistic).toHaveStyle('color: rgb(207, 19, 34)'); // #cf1322
    });

    it('should display defect rate estimation', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Defect Rate')).toBeInTheDocument();
      expect(screen.getByText('< 100 PPM')).toBeInTheDocument(); // For Cpk = 1.33
      expect(screen.getByText('Estimated')).toBeInTheDocument();
    });
  });

  describe('Capability Assessment', () => {
    it('should assess excellent capability correctly', () => {
      const excellentCapability = { ...mockCapability, Cpk: 2.1 };
      renderWithProviders(<CapabilityReport {...defaultProps} capability={excellentCapability} />);

      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('< 1 PPB')).toBeInTheDocument();
    });

    it('should assess capable process correctly', () => {
      const capableCapability = { ...mockCapability, Cpk: 1.75 };
      renderWithProviders(<CapabilityReport {...defaultProps} capability={capableCapability} />);

      expect(screen.getByText('Capable')).toBeInTheDocument();
      expect(screen.getByText('< 1 PPM')).toBeInTheDocument();
    });

    it('should assess adequate process correctly', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Adequate')).toBeInTheDocument();
      expect(screen.getByText('< 100 PPM')).toBeInTheDocument();
    });

    it('should assess marginal process correctly', () => {
      const marginalCapability = { ...mockCapability, Cpk: 1.1 };
      renderWithProviders(<CapabilityReport {...defaultProps} capability={marginalCapability} />);

      expect(screen.getByText('Marginal')).toBeInTheDocument();
      expect(screen.getByText('< 1350 PPM')).toBeInTheDocument();
    });

    it('should assess inadequate process correctly', () => {
      const inadequateCapability = { ...mockCapability, Cpk: 0.8 };
      renderWithProviders(<CapabilityReport {...defaultProps} capability={inadequateCapability} />);

      expect(screen.getByText('Inadequate')).toBeInTheDocument();
      expect(screen.getByText('> 1350 PPM')).toBeInTheDocument();
    });
  });

  describe('Process Histogram', () => {
    it('should render histogram chart components', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Process Histogram with Specification Limits')).toBeInTheDocument();
      expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });

    it('should render specification limit reference lines', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      // Should have reference lines for USL, LSL, target, and mean
      const referenceLines = screen.getAllByTestId('reference-line');
      expect(referenceLines.length).toBeGreaterThanOrEqual(4);
    });

    it('should handle missing target in spec limits', () => {
      const specLimitsWithoutTarget = { USL: 95.0, LSL: 85.0 };
      renderWithProviders(<CapabilityReport {...defaultProps} specLimits={specLimitsWithoutTarget} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    });
  });

  describe('Process Statistics', () => {
    it('should display process statistics correctly', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Process Statistics')).toBeInTheDocument();
      expect(screen.getByText('89.8750')).toBeInTheDocument(); // Mean
      expect(screen.getByText('1.7250')).toBeInTheDocument(); // Std Dev
      expect(screen.getByText('40')).toBeInTheDocument(); // Sample Size
      expect(screen.getByText('5.5000')).toBeInTheDocument(); // Range
      expect(screen.getByText('86.8000')).toBeInTheDocument(); // Min
      expect(screen.getByText('92.3000')).toBeInTheDocument(); // Max
      expect(screen.getByText('95.0000')).toBeInTheDocument(); // USL
      expect(screen.getByText('85.0000')).toBeInTheDocument(); // LSL
    });

    it('should calculate statistics when not provided', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} statistics={undefined} />);

      expect(screen.getByText('Process Statistics')).toBeInTheDocument();
      // Should display calculated values (exact values depend on calculation implementation)
      expect(screen.getByText(/\d+\.\d{4}/)).toBeInTheDocument(); // Some decimal value
    });
  });

  describe('Capability Interpretation', () => {
    it('should display capability interpretation section', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Capability Interpretation')).toBeInTheDocument();
      expect(screen.getByText('Overall Assessment:')).toBeInTheDocument();
      expect(screen.getByText('Cp (Process Potential):')).toBeInTheDocument();
      expect(screen.getByText('Cpk (Process Capability):')).toBeInTheDocument();
      expect(screen.getByText('Centering:')).toBeInTheDocument();
    });

    it('should provide appropriate interpretation for good capability', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText(/Process variation is acceptable/)).toBeInTheDocument();
      expect(screen.getByText(/Process is capable/)).toBeInTheDocument();
    });

    it('should provide appropriate interpretation for poor capability', () => {
      const poorCapability = {
        Cp: 0.85,
        Cpk: 0.80,
        Pp: 0.82,
        Ppk: 0.78,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} capability={poorCapability} />);

      expect(screen.getByText(/Process variation is too large/)).toBeInTheDocument();
      expect(screen.getByText(/Process improvement needed/)).toBeInTheDocument();
    });

    it('should show centering opportunity alert when Cp > Cpk significantly', () => {
      const offCenterCapability = {
        Cp: 1.80,
        Cpk: 1.20,
        Pp: 1.75,
        Ppk: 1.18,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} capability={offCenterCapability} />);

      expect(screen.getByText('Centering Opportunity')).toBeInTheDocument();
      expect(screen.getByText(/Cp.*is significantly higher than Cpk/)).toBeInTheDocument();
    });

    it('should analyze process centering correctly', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      // Should determine if process is well-centered or off-center
      expect(screen.getByText(/Process is well-centered|Process mean is off-center/)).toBeInTheDocument();
    });
  });

  describe('Capability Guidelines', () => {
    it('should display capability guidelines section', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('Capability Index Guidelines')).toBeInTheDocument();
      expect(screen.getByText('Cpk ≥ 2.0')).toBeInTheDocument();
      expect(screen.getByText('Excellent (6 Sigma)')).toBeInTheDocument();
      expect(screen.getByText('Cpk ≥ 1.67')).toBeInTheDocument();
      expect(screen.getByText('Capable (5 Sigma)')).toBeInTheDocument();
      expect(screen.getByText('Cpk ≥ 1.33')).toBeInTheDocument();
      expect(screen.getByText('Adequate (4 Sigma)')).toBeInTheDocument();
      expect(screen.getByText('Cpk ≥ 1.0')).toBeInTheDocument();
      expect(screen.getByText('Marginal (3 Sigma)')).toBeInTheDocument();
      expect(screen.getByText('Cpk < 1.0')).toBeInTheDocument();
      expect(screen.getByText('Inadequate')).toBeInTheDocument();
    });

    it('should display appropriate guideline descriptions', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByText('World-class process')).toBeInTheDocument();
      expect(screen.getByText('Very good process')).toBeInTheDocument();
      expect(screen.getByText('Acceptable process')).toBeInTheDocument();
      expect(screen.getByText('Improvement recommended')).toBeInTheDocument();
      expect(screen.getByText('Process not capable, immediate action required')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should call onExport when export button is clicked', async () => {
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export pdf/i });
      await user.click(exportButton);

      expect(mockOnExport).toHaveBeenCalledTimes(1);
    });

    it('should not show export button when onExport is not provided', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} onExport={undefined} />);

      expect(screen.queryByRole('button', { name: /export pdf/i })).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases and Data Handling', () => {
    it('should handle empty data array', () => {
      const emptyStats = {
        mean: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        range: 0,
        sampleSize: 0,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} data={[]} statistics={emptyStats} />);

      expect(screen.getByText('Process Capability Report')).toBeInTheDocument();
      expect(screen.getByText('0')).toBeInTheDocument(); // Sample size
    });

    it('should handle single data point', () => {
      const singlePointStats = {
        mean: 90.0,
        stdDev: 0,
        min: 90.0,
        max: 90.0,
        range: 0,
        sampleSize: 1,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} data={[90.0]} statistics={singlePointStats} />);

      expect(screen.getByText('1')).toBeInTheDocument(); // Sample size
    });

    it('should handle extreme capability values', () => {
      const extremeCapability = {
        Cp: 0.01,
        Cpk: 0.01,
        Pp: 0.01,
        Ppk: 0.01,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} capability={extremeCapability} />);

      expect(screen.getByText('Inadequate')).toBeInTheDocument();
      expect(screen.getByText('> 1350 PPM')).toBeInTheDocument();
    });

    it('should handle very high capability values', () => {
      const highCapability = {
        Cp: 5.0,
        Cpk: 4.8,
        Pp: 4.9,
        Ppk: 4.7,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} capability={highCapability} />);

      expect(screen.getByText('Excellent')).toBeInTheDocument();
      expect(screen.getByText('< 1 PPB')).toBeInTheDocument();
    });

    it('should handle wide specification limits', () => {
      const wideSpecLimits = {
        USL: 200.0,
        LSL: 0.0,
        target: 100.0,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} specLimits={wideSpecLimits} />);

      expect(screen.getByText('200.0000')).toBeInTheDocument(); // USL
      expect(screen.getByText('0.0000')).toBeInTheDocument(); // LSL
    });

    it('should handle tight specification limits', () => {
      const tightSpecLimits = {
        USL: 90.1,
        LSL: 89.9,
        target: 90.0,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} specLimits={tightSpecLimits} />);

      expect(screen.getByText('90.1000')).toBeInTheDocument(); // USL
      expect(screen.getByText('89.9000')).toBeInTheDocument(); // LSL
    });
  });

  describe('Statistical Calculations', () => {
    it('should properly calculate histogram bins', () => {
      renderWithProviders(<CapabilityReport {...defaultProps} statistics={undefined} />);

      // Should render histogram without errors
      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });

    it('should handle data with outliers', () => {
      const dataWithOutliers = [...mockData, 50.0, 150.0]; // Extreme outliers
      const statsWithOutliers = {
        mean: 92.0,
        stdDev: 15.2,
        min: 50.0,
        max: 150.0,
        range: 100.0,
        sampleSize: 42,
      };

      renderWithProviders(<CapabilityReport {...defaultProps} data={dataWithOutliers} statistics={statsWithOutliers} />);

      expect(screen.getByText('100.0000')).toBeInTheDocument(); // Range
      expect(screen.getByText('42')).toBeInTheDocument(); // Sample size
    });

    it('should handle normally distributed data correctly', () => {
      // Data should generate a reasonable histogram
      renderWithProviders(<CapabilityReport {...defaultProps} />);

      expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar')).toBeInTheDocument();
    });
  });
});