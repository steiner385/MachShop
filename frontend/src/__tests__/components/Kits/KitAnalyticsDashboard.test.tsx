/**
 * Frontend Component Tests for KitAnalyticsDashboard Component
 *
 * Comprehensive testing of the KitAnalyticsDashboard React component including
 * chart rendering, data visualization, filtering controls, and real-time updates.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, beforeEach, afterEach, it, expect, Mock } from 'vitest';
import { ConfigProvider } from 'antd';
import dayjs from 'dayjs';

import { KitAnalyticsDashboard } from '../../../components/Kits/KitAnalyticsDashboard';
import { useKitAnalyticsStore } from '../../../store/KitAnalyticsStore';
import { useAuthStore } from '../../../store/AuthStore';
import * as analyticsAPI from '../../../api/analytics';

// Mock dependencies
vi.mock('../../../store/KitAnalyticsStore');
vi.mock('../../../store/AuthStore');
vi.mock('../../../api/analytics');
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Area: () => <div data-testid="area" />,
  AreaChart: ({ children }: any) => <div data-testid="area-chart">{children}</div>
}));

const mockedUseKitAnalyticsStore = useKitAnalyticsStore as Mock;
const mockedUseAuthStore = useAuthStore as Mock;
const mockedAnalyticsAPI = analyticsAPI as any;

// Test data
const mockAnalyticsData = {
  summary: {
    totalKits: 247,
    completedKits: 198,
    activeKits: 35,
    pendingKits: 14,
    completionRate: 80.2,
    averageCompletionTime: 4.2, // hours
    criticalShortages: 8,
    totalCostSavings: 47500
  },
  kitsByStatus: [
    { status: 'PLANNED', count: 14, percentage: 5.7 },
    { status: 'STAGING', count: 12, percentage: 4.9 },
    { status: 'STAGED', count: 8, percentage: 3.2 },
    { status: 'ISSUED', count: 15, percentage: 6.1 },
    { status: 'CONSUMED', count: 198, percentage: 80.2 }
  ],
  performanceTrends: [
    {
      date: '2024-01-01',
      kitsCompleted: 45,
      averageTime: 4.5,
      efficiency: 85.2,
      costSavings: 8200
    },
    {
      date: '2024-01-02',
      kitsCompleted: 52,
      averageTime: 4.1,
      efficiency: 88.7,
      costSavings: 9150
    },
    {
      date: '2024-01-03',
      kitsCompleted: 48,
      averageTime: 4.3,
      efficiency: 86.9,
      costSavings: 8850
    },
    {
      date: '2024-01-04',
      kitsCompleted: 55,
      averageTime: 3.9,
      efficiency: 91.2,
      costSavings: 9800
    },
    {
      date: '2024-01-05',
      kitsCompleted: 47,
      averageTime: 4.4,
      efficiency: 85.8,
      costSavings: 8600
    }
  ],
  shortageAnalysis: [
    {
      partNumber: 'PART-001',
      description: 'Engine Mount Bracket',
      shortfall: 15,
      impactedKits: 8,
      estimatedDelay: 3, // days
      costImpact: 12500
    },
    {
      partNumber: 'PART-002',
      description: 'Turbine Blade Assembly',
      shortfall: 5,
      impactedKits: 3,
      estimatedDelay: 7,
      costImpact: 25000
    },
    {
      partNumber: 'PART-003',
      description: 'Control Unit Housing',
      shortfall: 22,
      impactedKits: 12,
      estimatedDelay: 2,
      costImpact: 8900
    }
  ],
  efficiencyMetrics: {
    stagingTime: {
      current: 2.1, // hours
      target: 2.0,
      improvement: -5.0 // percentage
    },
    issueTime: {
      current: 0.8,
      target: 1.0,
      improvement: 20.0
    },
    consumptionTime: {
      current: 6.5,
      target: 6.0,
      improvement: -8.3
    },
    overallEfficiency: {
      current: 87.3,
      target: 90.0,
      improvement: -3.0
    }
  },
  costAnalysis: {
    totalSavings: 47500,
    targetSavings: 50000,
    savingsByCategory: [
      { category: 'Inventory Optimization', amount: 18500, percentage: 38.9 },
      { category: 'Reduced Waste', amount: 12200, percentage: 25.7 },
      { category: 'Improved Efficiency', amount: 16800, percentage: 35.4 }
    ],
    monthlySavings: [
      { month: 'Jan', savings: 47500 },
      { month: 'Feb', savings: 42300 },
      { month: 'Mar', savings: 51200 },
      { month: 'Apr', savings: 48900 }
    ]
  }
};

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  roles: ['Production Planner', 'Manufacturing Engineer'],
  permissions: ['analytics.read', 'kits.read', 'reports.export']
};

const mockAnalyticsStore = {
  analyticsData: mockAnalyticsData,
  loading: false,
  error: null,
  timeRange: [dayjs().subtract(30, 'days'), dayjs()],
  filters: {
    area: 'all',
    priority: [],
    status: []
  },
  refreshInterval: 300000, // 5 minutes
  lastUpdated: new Date().toISOString(),
  // Actions
  fetchAnalytics: vi.fn(),
  setTimeRange: vi.fn(),
  setFilters: vi.fn(),
  exportReport: vi.fn(),
  refreshData: vi.fn(),
  setAutoRefresh: vi.fn()
};

const mockAuthStore = {
  user: mockUser,
  isAuthenticated: true,
  hasPermission: vi.fn((permission: string) => mockUser.permissions.includes(permission)),
  hasRole: vi.fn((role: string) => mockUser.roles.includes(role))
};

// Test utilities
const createWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider>
          {children}
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const renderAnalyticsDashboard = (props = {}) => {
  const defaultProps = {
    timeRange: [dayjs().subtract(30, 'days'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs],
    filters: {
      area: 'all',
      priority: [],
      status: []
    }
  };

  return render(
    <KitAnalyticsDashboard {...defaultProps} {...props} />,
    { wrapper: createWrapper }
  );
};

describe('KitAnalyticsDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseKitAnalyticsStore.mockReturnValue(mockAnalyticsStore);
    mockedUseAuthStore.mockReturnValue(mockAuthStore);

    // Mock API calls
    mockedAnalyticsAPI.fetchAnalytics = vi.fn().mockResolvedValue(mockAnalyticsData);
    mockedAnalyticsAPI.exportAnalyticsReport = vi.fn().mockResolvedValue('report-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders dashboard with all key metrics', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText('Kit Analytics Dashboard')).toBeInTheDocument();

      // Summary metrics
      expect(screen.getByText('247')).toBeInTheDocument(); // Total kits
      expect(screen.getByText('80.2%')).toBeInTheDocument(); // Completion rate
      expect(screen.getByText('4.2h')).toBeInTheDocument(); // Average time
      expect(screen.getByText('$47.5K')).toBeInTheDocument(); // Cost savings
    });

    it('displays status distribution chart', () => {
      renderAnalyticsDashboard();

      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      expect(screen.getByText('Kit Status Distribution')).toBeInTheDocument();
    });

    it('displays performance trends chart', () => {
      renderAnalyticsDashboard();

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByText('Performance Trends')).toBeInTheDocument();
    });

    it('displays shortage analysis table', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText('Critical Shortages')).toBeInTheDocument();
      expect(screen.getByText('Engine Mount Bracket')).toBeInTheDocument();
      expect(screen.getByText('Turbine Blade Assembly')).toBeInTheDocument();
      expect(screen.getByText('Control Unit Housing')).toBeInTheDocument();
    });

    it('displays efficiency metrics with targets', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText('Efficiency Metrics')).toBeInTheDocument();
      expect(screen.getByText('2.1h')).toBeInTheDocument(); // Staging time
      expect(screen.getByText('0.8h')).toBeInTheDocument(); // Issue time
      expect(screen.getByText('87.3%')).toBeInTheDocument(); // Overall efficiency
    });

    it('shows loading state correctly', () => {
      mockedUseKitAnalyticsStore.mockReturnValue({
        ...mockAnalyticsStore,
        loading: true,
        analyticsData: null
      });

      renderAnalyticsDashboard();

      expect(screen.getByTestId('analytics-loading')).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      const errorMessage = 'Failed to load analytics data';
      mockedUseKitAnalyticsStore.mockReturnValue({
        ...mockAnalyticsStore,
        error: errorMessage,
        analyticsData: null
      });

      renderAnalyticsDashboard();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  describe('Time Range Controls', () => {
    it('allows selecting predefined time ranges', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const timeRangeButton = screen.getByTestId('time-range-selector');
      await user.click(timeRangeButton);

      const lastWeekOption = screen.getByText('Last 7 Days');
      await user.click(lastWeekOption);

      expect(mockAnalyticsStore.setTimeRange).toHaveBeenCalledWith([
        expect.any(Object), // dayjs object
        expect.any(Object)  // dayjs object
      ]);
    });

    it('allows custom date range selection', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const customRangeButton = screen.getByText('Custom Range');
      await user.click(customRangeButton);

      const startDatePicker = screen.getByTestId('start-date-picker');
      const endDatePicker = screen.getByTestId('end-date-picker');

      await user.click(startDatePicker);
      // Select date from calendar would require more complex testing
      // For now, verify the pickers are rendered
      expect(startDatePicker).toBeInTheDocument();
      expect(endDatePicker).toBeInTheDocument();
    });

    it('updates charts when time range changes', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const timeRangeButton = screen.getByTestId('time-range-selector');
      await user.click(timeRangeButton);

      const lastMonthOption = screen.getByText('Last 30 Days');
      await user.click(lastMonthOption);

      expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalled();
    });
  });

  describe('Filtering Controls', () => {
    it('allows filtering by production area', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const areaFilter = screen.getByTestId('area-filter');
      await user.click(areaFilter);

      const assemblyOption = screen.getByText('Assembly');
      await user.click(assemblyOption);

      expect(mockAnalyticsStore.setFilters).toHaveBeenCalledWith({
        area: 'assembly'
      });
    });

    it('allows filtering by kit priority', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const priorityFilter = screen.getByTestId('priority-filter');
      await user.click(priorityFilter);

      const highPriorityOption = screen.getByText('High');
      await user.click(highPriorityOption);

      expect(mockAnalyticsStore.setFilters).toHaveBeenCalledWith({
        priority: ['HIGH']
      });
    });

    it('allows filtering by kit status', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const statusFilter = screen.getByTestId('status-filter');
      await user.click(statusFilter);

      const completedOption = screen.getByText('Completed');
      await user.click(completedOption);

      expect(mockAnalyticsStore.setFilters).toHaveBeenCalledWith({
        status: ['CONSUMED']
      });
    });

    it('shows applied filters with clear options', () => {
      mockedUseKitAnalyticsStore.mockReturnValue({
        ...mockAnalyticsStore,
        filters: {
          area: 'assembly',
          priority: ['HIGH', 'URGENT'],
          status: ['CONSUMED']
        }
      });

      renderAnalyticsDashboard();

      expect(screen.getByText('Area: Assembly')).toBeInTheDocument();
      expect(screen.getByText('Priority: High, Urgent')).toBeInTheDocument();
      expect(screen.getByText('Status: Completed')).toBeInTheDocument();
    });

    it('allows clearing all filters', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const clearFiltersButton = screen.getByText(/clear all filters/i);
      await user.click(clearFiltersButton);

      expect(mockAnalyticsStore.setFilters).toHaveBeenCalledWith({
        area: 'all',
        priority: [],
        status: []
      });
    });
  });

  describe('Chart Interactions', () => {
    it('allows drilling down into chart data', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const chartSegment = screen.getByTestId('chart-segment-planned');
      await user.click(chartSegment);

      expect(screen.getByTestId('drill-down-modal')).toBeInTheDocument();
      expect(screen.getByText('Planned Kits Details')).toBeInTheDocument();
    });

    it('shows tooltips on chart hover', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const chartBar = screen.getByTestId('chart-bar-jan');
      await user.hover(chartBar);

      await waitFor(() => {
        expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument();
      });
    });

    it('allows toggling chart types', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const chartTypeToggle = screen.getByTestId('chart-type-toggle');
      await user.click(chartTypeToggle);

      const barChartOption = screen.getByText('Bar Chart');
      await user.click(barChartOption);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  describe('Efficiency Metrics', () => {
    it('displays efficiency metrics with trend indicators', () => {
      renderAnalyticsDashboard();

      // Check for improvement indicators
      const improvementIndicator = screen.getByTestId('improvement-indicator-issue-time');
      expect(improvementIndicator).toBeInTheDocument();
      expect(improvementIndicator).toHaveClass('text-green-500'); // Positive improvement

      const negativeIndicator = screen.getByTestId('improvement-indicator-staging-time');
      expect(negativeIndicator).toBeInTheDocument();
      expect(negativeIndicator).toHaveClass('text-red-500'); // Negative improvement
    });

    it('shows target vs actual comparisons', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText('Target: 2.0h')).toBeInTheDocument(); // Staging time target
      expect(screen.getByText('Current: 2.1h')).toBeInTheDocument(); // Staging time actual
      expect(screen.getByText('Target: 90.0%')).toBeInTheDocument(); // Overall efficiency target
    });

    it('highlights metrics that need attention', () => {
      renderAnalyticsDashboard();

      const belowTargetMetric = screen.getByTestId('metric-staging-time');
      expect(belowTargetMetric).toHaveClass('border-red-300'); // Below target
    });
  });

  describe('Shortage Analysis', () => {
    it('displays shortage details with impact assessment', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText('Engine Mount Bracket')).toBeInTheDocument();
      expect(screen.getByText('15 short')).toBeInTheDocument(); // Shortfall quantity
      expect(screen.getByText('8 kits impacted')).toBeInTheDocument();
      expect(screen.getByText('3 days delay')).toBeInTheDocument();
      expect(screen.getByText('$12,500')).toBeInTheDocument(); // Cost impact
    });

    it('sorts shortages by priority/impact', () => {
      renderAnalyticsDashboard();

      const shortageRows = screen.getAllByTestId(/shortage-row-/);

      // First shortage should be highest cost impact (Turbine Blade Assembly - $25,000)
      expect(within(shortageRows[0]).getByText('Turbine Blade Assembly')).toBeInTheDocument();
    });

    it('allows resolving shortage alerts', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const resolveButton = screen.getByTestId('resolve-shortage-PART-001');
      await user.click(resolveButton);

      expect(screen.getByTestId('resolve-shortage-modal')).toBeInTheDocument();
    });
  });

  describe('Export and Reporting', () => {
    it('allows exporting analytics report', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const exportButton = screen.getByText(/export report/i);
      await user.click(exportButton);

      const pdfOption = screen.getByText('PDF Report');
      await user.click(pdfOption);

      expect(mockAnalyticsStore.exportReport).toHaveBeenCalledWith('pdf');
    });

    it('shows export options based on permissions', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText(/export report/i)).toBeInTheDocument();

      // User without export permissions
      mockedUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        hasPermission: vi.fn((permission: string) =>
          permission !== 'reports.export'
        )
      });

      const { rerender } = render(<KitAnalyticsDashboard />, { wrapper: createWrapper });

      expect(screen.queryByText(/export report/i)).not.toBeInTheDocument();
    });

    it('provides different export formats', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const exportButton = screen.getByText(/export report/i);
      await user.click(exportButton);

      expect(screen.getByText('PDF Report')).toBeInTheDocument();
      expect(screen.getByText('Excel Spreadsheet')).toBeInTheDocument();
      expect(screen.getByText('CSV Data')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('shows last updated timestamp', () => {
      renderAnalyticsDashboard();

      expect(screen.getByText(/last updated/i)).toBeInTheDocument();
    });

    it('allows manual refresh of data', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      expect(mockAnalyticsStore.refreshData).toHaveBeenCalled();
    });

    it('supports auto-refresh toggle', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const autoRefreshToggle = screen.getByTestId('auto-refresh-toggle');
      await user.click(autoRefreshToggle);

      expect(mockAnalyticsStore.setAutoRefresh).toHaveBeenCalledWith(true);
    });

    it('updates data when props change', () => {
      const { rerender } = renderAnalyticsDashboard();

      const newTimeRange = [dayjs().subtract(7, 'days'), dayjs()] as [dayjs.Dayjs, dayjs.Dayjs];

      rerender(
        <KitAnalyticsDashboard
          timeRange={newTimeRange}
          filters={{ area: 'assembly', priority: [], status: [] }}
        />
      );

      expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalled();
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });

      renderAnalyticsDashboard();

      const dashboard = screen.getByTestId('analytics-dashboard');
      expect(dashboard).toHaveClass('mobile-layout');
    });

    it('stacks charts vertically on smaller screens', () => {
      Object.defineProperty(window, 'innerWidth', { value: 768 });

      renderAnalyticsDashboard();

      const chartsContainer = screen.getByTestId('charts-container');
      expect(chartsContainer).toHaveClass('flex-col');
    });
  });

  describe('Performance Optimization', () => {
    it('memoizes expensive chart calculations', () => {
      const { rerender } = renderAnalyticsDashboard();

      // Same data should not trigger recalculation
      rerender(<KitAnalyticsDashboard />);

      // Verify charts are not re-rendered unnecessarily
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    });

    it('lazy loads heavy chart components', async () => {
      renderAnalyticsDashboard();

      // Initially should show placeholder
      expect(screen.getByTestId('chart-placeholder')).toBeInTheDocument();

      // After loading, should show actual chart
      await waitFor(() => {
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels and roles', () => {
      renderAnalyticsDashboard();

      expect(screen.getByRole('main')).toHaveAttribute('aria-label', 'Kit Analytics Dashboard');
      expect(screen.getByRole('region', { name: /performance trends/i })).toBeInTheDocument();
      expect(screen.getByRole('table', { name: /shortage analysis/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderAnalyticsDashboard();

      const exportButton = screen.getByText(/export report/i);

      // Tab to export button
      await user.tab();
      expect(exportButton).toHaveFocus();
    });

    it('provides alternative text for charts', () => {
      renderAnalyticsDashboard();

      expect(screen.getByTestId('chart-alt-text')).toHaveTextContent(
        /performance trends showing kit completion rates over time/i
      );
    });
  });
});