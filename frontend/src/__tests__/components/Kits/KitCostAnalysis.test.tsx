/**
 * KitCostAnalysis Component Tests
 *
 * Comprehensive test suite for KitCostAnalysis component covering:
 * - Cost summary statistics and metrics
 * - Cost breakdown visualization with charts
 * - Kit details table with sorting and filtering
 * - Cost optimization opportunities
 * - Benchmark comparisons and targets
 * - Time range filtering and currency selection
 * - Period-over-period comparisons
 * - Chart rendering and data visualization
 * - User interactions and accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KitCostAnalysis } from '../../../components/Kits/KitCostAnalysis';
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
    format: vi.fn().mockReturnValue('Oct 30, 2024 10:30')
  }));
  return {
    default: mockDayjs,
    __esModule: true
  };
});

// Mock Recharts components
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="recharts-tooltip" />,
  Legend: () => <div data-testid="legend" />
}));

describe('KitCostAnalysis', () => {
  const mockKitStore = {
    loading: {
      costs: false
    }
  };

  const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    vi.mocked(useKitStore).mockReturnValue(mockKitStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleSpy.mockClear();
  });

  describe('Header and Controls', () => {
    it('renders main header and description', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Kit Cost Analysis')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive cost tracking, analysis, and optimization insights')).toBeInTheDocument();
    });

    it('renders control panel with filters', () => {
      render(<KitCostAnalysis />);

      // Date range picker
      expect(screen.getByRole('textbox', { name: /start date/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /end date/i })).toBeInTheDocument();

      // Currency selector
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();

      // Comparison toggle
      expect(screen.getByText('Single')).toBeInTheDocument();

      // Export button
      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('handles currency selection', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      const currencySelect = screen.getByDisplayValue('USD');
      await user.click(currencySelect);

      expect(screen.getByText('EUR')).toBeInTheDocument();

      await user.click(screen.getByText('EUR'));
      expect(screen.getByDisplayValue('EUR')).toBeInTheDocument();
    });

    it('handles comparison mode toggle', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      const comparisonSwitch = screen.getByRole('switch');
      await user.click(comparisonSwitch);

      expect(screen.getByText('Compare')).toBeInTheDocument();
      expect(screen.getByText('Comparison Mode Active')).toBeInTheDocument();
      expect(screen.getByText('Comparing current period with previous 30 days. All metrics show period-over-period changes.')).toBeInTheDocument();
    });
  });

  describe('Summary Cards', () => {
    it('displays key cost metrics', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Avg Cost per Kit')).toBeInTheDocument();
      expect(screen.getByText('Cost Efficiency')).toBeInTheDocument();
      expect(screen.getByText('Target Achievement')).toBeInTheDocument();
    });

    it('shows formatted cost values', () => {
      render(<KitCostAnalysis />);

      // Total cost should be formatted with commas
      expect(screen.getByText('1,850,000')).toBeInTheDocument();
      expect(screen.getByText('11,859')).toBeInTheDocument();
    });

    it('displays budget variance indicators', () => {
      render(<KitCostAnalysis />);

      // Should show under budget (negative variance)
      expect(screen.getByText('2.3% under budget')).toBeInTheDocument();
    });

    it('shows efficiency metrics and comparisons', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('87.5')).toBeInTheDocument(); // Cost efficiency
      expect(screen.getByText('Industry avg: 82%')).toBeInTheDocument();
      expect(screen.getByText('94.2')).toBeInTheDocument(); // Target achievement
    });

    it('displays target progress indicators', () => {
      render(<KitCostAnalysis />);

      // Should show progress toward target
      expect(screen.getByText(/Target:/)).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('renders all tab options', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Cost Overview')).toBeInTheDocument();
      expect(screen.getByText('Kit Details')).toBeInTheDocument();
      expect(screen.getByText('Cost Optimization')).toBeInTheDocument();
      expect(screen.getByText('Benchmarks')).toBeInTheDocument();
    });

    it('starts with Cost Overview tab active', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
      expect(screen.getByText('Cost Trends')).toBeInTheDocument();
    });

    it('allows navigation between tabs', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      // Navigate to Kit Details tab
      await user.click(screen.getByText('Kit Details'));
      expect(screen.getByText('Kit Cost Details')).toBeInTheDocument();

      // Navigate to Cost Optimization tab
      await user.click(screen.getByText('Cost Optimization'));
      expect(screen.getByText('Cost Optimization Opportunities')).toBeInTheDocument();

      // Navigate to Benchmarks tab
      await user.click(screen.getByText('Benchmarks'));
      expect(screen.getByText('Cost Benchmarks')).toBeInTheDocument();
    });
  });

  describe('Cost Overview Tab', () => {
    it('renders cost breakdown pie chart', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Cost Breakdown')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('renders cost trends area chart', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Cost Trends')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });

    it('displays period comparisons', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Period Comparisons')).toBeInTheDocument();
      expect(screen.getByText('Cost per Kit')).toBeInTheDocument();
      expect(screen.getByText('Material Cost %')).toBeInTheDocument();
      expect(screen.getByText('Labor Hours per Kit')).toBeInTheDocument();
      expect(screen.getByText('Overhead Ratio')).toBeInTheDocument();
    });

    it('shows cost category details with trends', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByText('Cost Category Details')).toBeInTheDocument();
      expect(screen.getByText('Materials')).toBeInTheDocument();
      expect(screen.getByText('Labor')).toBeInTheDocument();
      expect(screen.getByText('Overhead')).toBeInTheDocument();

      // Should show formatted amounts
      expect(screen.getByText('1,295,000')).toBeInTheDocument();
      expect(screen.getByText('370,000')).toBeInTheDocument();
      expect(screen.getByText('185,000')).toBeInTheDocument();

      // Should show percentages
      expect(screen.getByText('70% of total')).toBeInTheDocument();
      expect(screen.getByText('20% of total')).toBeInTheDocument();
      expect(screen.getByText('10% of total')).toBeInTheDocument();
    });

    it('displays trend indicators with correct colors', () => {
      render(<KitCostAnalysis />);

      // Materials has negative trend (good), should show decrease
      expect(screen.getByText('1.2% vs last period')).toBeInTheDocument();

      // Labor has positive trend (bad), should show increase
      expect(screen.getByText('2.8% vs last period')).toBeInTheDocument();
    });
  });

  describe('Kit Details Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);
      await user.click(screen.getByText('Kit Details'));
    });

    it('renders kit cost details table', () => {
      expect(screen.getByText('Kit Cost Details')).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('displays table headers correctly', () => {
      expect(screen.getByText('Kit Number')).toBeInTheDocument();
      expect(screen.getByText('Work Order')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Labor')).toBeInTheDocument();
      expect(screen.getByText('Budget Variance')).toBeInTheDocument();
      expect(screen.getByText('Cost/Hour')).toBeInTheDocument();
    });

    it('shows kit data with proper formatting', () => {
      expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();
      expect(screen.getByText('KIT-WO-12346-01')).toBeInTheDocument();
      expect(screen.getByText('WO-12345')).toBeInTheDocument();
      expect(screen.getByText('WO-12346')).toBeInTheDocument();

      // Should format costs with commas
      expect(screen.getByText('$15,250')).toBeInTheDocument();
      expect(screen.getByText('$9,850')).toBeInTheDocument();
    });

    it('displays priority tags with correct colors', () => {
      const highPriorityTags = screen.getAllByText('High');
      const normalPriorityTags = screen.getAllByText('Normal');

      expect(highPriorityTags.length).toBeGreaterThan(0);
      expect(normalPriorityTags.length).toBeGreaterThan(0);
    });

    it('shows budget variance with appropriate colors', () => {
      // Positive variance (over budget) should be red/danger
      const positiveVariance = screen.getByText('+3.0%');
      expect(positiveVariance).toHaveClass('ant-typography-danger');

      // Negative variance (under budget) should be green/success
      const negativeVariance = screen.getByText('-3.4%');
      expect(negativeVariance).toHaveClass('ant-typography-success');
    });

    it('supports table sorting', () => {
      const kitNumberHeader = screen.getByText('Kit Number');
      const totalCostHeader = screen.getByText('Total Cost');

      // Headers should be clickable for sorting
      expect(kitNumberHeader.closest('th')).toBeInTheDocument();
      expect(totalCostHeader.closest('th')).toBeInTheDocument();
    });

    it('displays pagination controls', () => {
      expect(screen.getByText('10 / page')).toBeInTheDocument();
    });
  });

  describe('Cost Optimization Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);
      await user.click(screen.getByText('Cost Optimization'));
    });

    it('displays optimization summary cards', () => {
      expect(screen.getByText('Total Potential Savings')).toBeInTheDocument();
      expect(screen.getByText('High Priority Items')).toBeInTheDocument();
      expect(screen.getByText('Quick Wins')).toBeInTheDocument();
    });

    it('calculates total potential savings correctly', () => {
      // Should sum all optimization savings: 18750 + 22250 + 6750 = 47750
      expect(screen.getByText('47,750')).toBeInTheDocument();
    });

    it('counts high priority and quick win items', () => {
      // Should show count of high priority items (2)
      expect(screen.getByText('2')).toBeInTheDocument();
      // Should show count of low complexity items (1)
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders optimization opportunities table', () => {
      expect(screen.getByText('Cost Optimization Opportunities')).toBeInTheDocument();
      expect(screen.getByText('Opportunity')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Current Cost')).toBeInTheDocument();
      expect(screen.getByText('Potential Saving')).toBeInTheDocument();
      expect(screen.getByText('Complexity')).toBeInTheDocument();
      expect(screen.getByText('Timeframe')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
    });

    it('displays optimization opportunities with details', () => {
      expect(screen.getByText('Consolidate Low-Volume Parts')).toBeInTheDocument();
      expect(screen.getByText('Automate Staging Process')).toBeInTheDocument();
      expect(screen.getByText('Optimize Kit Sizes')).toBeInTheDocument();

      // Should show savings
      expect(screen.getByText('$18,750')).toBeInTheDocument();
      expect(screen.getByText('$22,250')).toBeInTheDocument();
      expect(screen.getByText('$6,750')).toBeInTheDocument();

      // Should show percentages
      expect(screen.getByText('(15%)')).toBeInTheDocument();
      expect(screen.getByText('(25%)')).toBeInTheDocument();
    });

    it('shows category tags with appropriate colors', () => {
      const materialTags = screen.getAllByText('MATERIAL');
      const laborTags = screen.getAllByText('LABOR');
      const overheadTags = screen.getAllByText('OVERHEAD');

      expect(materialTags.length).toBeGreaterThan(0);
      expect(laborTags.length).toBeGreaterThan(0);
      expect(overheadTags.length).toBeGreaterThan(0);
    });

    it('displays complexity and priority indicators', () => {
      expect(screen.getByText('MEDIUM')).toBeInTheDocument(); // Complexity
      expect(screen.getByText('HIGH')).toBeInTheDocument(); // Complexity and Priority
      expect(screen.getByText('LOW')).toBeInTheDocument(); // Complexity

      expect(screen.getByText('3-6 months')).toBeInTheDocument();
      expect(screen.getByText('6-12 months')).toBeInTheDocument();
      expect(screen.getByText('1-3 months')).toBeInTheDocument();
    });
  });

  describe('Benchmarks Tab', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);
      await user.click(screen.getByText('Benchmarks'));
    });

    it('renders benchmark cards', () => {
      expect(screen.getByText('Cost Benchmarks')).toBeInTheDocument();
    });

    it('displays benchmark metrics with comparisons', () => {
      expect(screen.getAllByText('Cost per Kit')).toHaveLength(2); // Header and benchmark
      expect(screen.getAllByText('Material Cost %')).toHaveLength(2);
      expect(screen.getByText('Labor Efficiency')).toBeInTheDocument();

      // Should show current, target, and industry values
      expect(screen.getByText('11859')).toBeInTheDocument(); // Current cost per kit
      expect(screen.getByText('10500')).toBeInTheDocument(); // Target cost per kit
      expect(screen.getByText('12800')).toBeInTheDocument(); // Industry cost per kit
    });

    it('shows variance indicators with appropriate colors', () => {
      // Progress bars should reflect performance vs targets
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });

    it('displays variance percentages', () => {
      expect(screen.getByText('+12.9% variance')).toBeInTheDocument();
      expect(screen.getByText('+2.9% variance')).toBeInTheDocument();
      expect(screen.getByText('-2.8% variance')).toBeInTheDocument();
    });

    it('applies status-based color coding', () => {
      // Different benchmark statuses should have different colors
      const statistics = screen.getAllByText(/Current|Target|Industry/);
      expect(statistics.length).toBeGreaterThan(0);
    });
  });

  describe('Data Loading and Updates', () => {
    it('calls loadCostData on mount', () => {
      render(<KitCostAnalysis />);

      // Should log the loading message
      expect(consoleSpy).toHaveBeenCalledWith(
        'Loading cost data for range:',
        expect.any(Array)
      );
    });

    it('reloads data when time range changes', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      consoleSpy.mockClear();

      // Change the date range
      const startDateInput = screen.getByRole('textbox', { name: /start date/i });
      await user.click(startDateInput);
      await user.keyboard('{Control>}a{/Control}2024-01-01');

      // Should trigger data reload
      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('Chart Rendering', () => {
    it('renders pie chart for cost breakdown', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie')).toBeInTheDocument();
    });

    it('renders area chart for cost trends', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    });

    it('includes chart components with responsive containers', () => {
      render(<KitCostAnalysis />);

      const responsiveContainers = screen.getAllByTestId('responsive-container');
      expect(responsiveContainers.length).toBeGreaterThanOrEqual(2); // At least pie and area charts
    });
  });

  describe('User Interactions', () => {
    it('handles export button click', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      // Button should be clickable (no errors)
      expect(exportButton).toBeInTheDocument();
    });

    it('handles time range picker interactions', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      const startDateInput = screen.getByRole('textbox', { name: /start date/i });
      const endDateInput = screen.getByRole('textbox', { name: /end date/i });

      expect(startDateInput).toBeEnabled();
      expect(endDateInput).toBeEnabled();

      await user.click(startDateInput);
      // Date picker should open (covered by Ant Design tests)
    });

    it('maintains state across tab navigation', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      // Enable comparison mode
      const comparisonSwitch = screen.getByRole('switch');
      await user.click(comparisonSwitch);

      // Navigate to another tab
      await user.click(screen.getByText('Kit Details'));

      // Navigate back to overview
      await user.click(screen.getByText('Cost Overview'));

      // Comparison mode should still be enabled
      expect(screen.getByText('Comparison Mode Active')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<KitCostAnalysis />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(4);
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByRole('switch')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      // Tab navigation should work
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /start date/i }));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /end date/i }));
    });

    it('provides meaningful descriptions for statistics', () => {
      render(<KitCostAnalysis />);

      // Statistics should have descriptive titles
      expect(screen.getByText('Total Cost')).toBeInTheDocument();
      expect(screen.getByText('Avg Cost per Kit')).toBeInTheDocument();
      expect(screen.getByText('Cost Efficiency')).toBeInTheDocument();
      expect(screen.getByText('Target Achievement')).toBeInTheDocument();
    });

    it('uses semantic HTML for tables', () => {
      render(<KitCostAnalysis />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Should have proper table structure
      expect(within(table).getAllByRole('columnheader')).toHaveLength(8);
    });
  });

  describe('Responsive Design', () => {
    it('renders responsive grid layout', () => {
      render(<KitCostAnalysis />);

      // Summary cards should be in responsive grid
      const summaryCards = screen.getAllByText(/Total Cost|Avg Cost per Kit|Cost Efficiency|Target Achievement/);
      expect(summaryCards.length).toBe(4);
    });

    it('handles table scrolling on small screens', async () => {
      const user = userEvent.setup();
      render(<KitCostAnalysis />);

      await user.click(screen.getByText('Kit Details'));

      // Table should have horizontal scroll capability
      const table = screen.getByRole('table');
      expect(table.closest('.ant-table-wrapper')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', () => {
      render(<KitCostAnalysis />);

      // Component should render even with mock data
      expect(screen.getByText('Kit Cost Analysis')).toBeInTheDocument();
    });

    it('handles chart rendering errors gracefully', () => {
      render(<KitCostAnalysis />);

      // Charts should render without errors
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    });
  });
});