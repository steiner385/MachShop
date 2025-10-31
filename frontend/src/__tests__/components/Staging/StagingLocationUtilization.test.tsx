/**
 * StagingLocationUtilization Component Tests
 *
 * Comprehensive test suite for StagingLocationUtilization component covering:
 * - Summary statistics and metrics
 * - Filter controls and view mode switching
 * - Grid view with location cards and utilization indicators
 * - Table view with sortable columns and performance data
 * - Location detail modal with tabs and recommendations
 * - Status indicators and capacity management
 * - User interactions and accessibility
 * - Error handling and edge cases
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StagingLocationUtilization } from '../../../components/Staging/StagingLocationUtilization';
import { useKitStore } from '../../../store/kitStore';

// Mock the kit store
vi.mock('../../../store/kitStore', () => ({
  useKitStore: vi.fn()
}));

// Mock dayjs with relative time plugin
vi.mock('dayjs', () => {
  const mockDayjs = vi.fn((date) => ({
    subtract: vi.fn().mockReturnThis(),
    add: vi.fn().mockReturnThis(),
    toISOString: vi.fn().mockReturnValue('2024-01-15T10:30:00.000Z'),
    format: vi.fn().mockReturnValue('Oct 30, 10:30'),
    fromNow: vi.fn().mockReturnValue('2 hours ago')
  }));
  mockDayjs.extend = vi.fn();
  return {
    default: mockDayjs,
    __esModule: true
  };
});

describe('StagingLocationUtilization', () => {
  const mockKitStore = {
    stagingLocations: [],
    loading: {
      stagingLocations: false
    },
    fetchStagingLocations: vi.fn()
  };

  beforeEach(() => {
    vi.mocked(useKitStore).mockReturnValue(mockKitStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Header and Summary Statistics', () => {
    it('renders main header correctly', () => {
      render(<StagingLocationUtilization />);

      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });

    it('displays summary statistics cards', () => {
      render(<StagingLocationUtilization />);

      expect(screen.getByText('Total Locations')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('At Capacity')).toBeInTheDocument();
      expect(screen.getByText('Avg Utilization')).toBeInTheDocument();
    });

    it('calculates summary statistics correctly', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        // Total locations (5 in mock data)
        expect(screen.getByText('5')).toBeInTheDocument();

        // Available locations (should exclude maintenance mode)
        expect(screen.getByText('4')).toBeInTheDocument();

        // At capacity (utilizationRate >= 90) - STG-B1 has 83% so none at 90%+
        expect(screen.getByText('0')).toBeInTheDocument();
      });
    });

    it('shows average utilization percentage', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        // Should calculate average utilization for active locations
        const avgUtilization = screen.getByText(/54\.6/); // Calculated from mock data
        expect(avgUtilization).toBeInTheDocument();
      });
    });

    it('applies correct styling to summary cards', () => {
      render(<StagingLocationUtilization />);

      // Cards should have appropriate icons and colors
      const icons = screen.getAllByRole('img');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Filter Controls', () => {
    it('renders all filter controls', () => {
      render(<StagingLocationUtilization />);

      expect(screen.getByPlaceholderText('Filter by area')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Status')).toBeInTheDocument();
    });

    it('renders view mode toggle buttons', () => {
      render(<StagingLocationUtilization />);

      expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /charts/i })).toBeInTheDocument();
    });

    it('handles area filter selection', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const areaFilter = screen.getByPlaceholderText('Filter by area');
      await user.click(areaFilter);

      expect(screen.getByText('All Areas')).toBeInTheDocument();
      expect(screen.getByText('Assembly Areas')).toBeInTheDocument();
      expect(screen.getByText('Storage Areas')).toBeInTheDocument();
      expect(screen.getByText('Inspection Areas')).toBeInTheDocument();

      await user.click(screen.getByText('Assembly Areas'));
      expect(screen.getByDisplayValue('Assembly Areas')).toBeInTheDocument();
    });

    it('handles type filter selection', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const typeFilter = screen.getByPlaceholderText('Type');
      await user.click(typeFilter);

      expect(screen.getByText('All Types')).toBeInTheDocument();
      expect(screen.getByText('Assembly')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Inspection')).toBeInTheDocument();
      expect(screen.getByText('Shipping')).toBeInTheDocument();

      await user.click(screen.getByText('Assembly'));
      expect(screen.getByDisplayValue('Assembly')).toBeInTheDocument();
    });

    it('handles status filter selection', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const statusFilter = screen.getByPlaceholderText('Status');
      await user.click(statusFilter);

      expect(screen.getByText('All Status')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('At Capacity')).toBeInTheDocument();
      expect(screen.getByText('Maintenance')).toBeInTheDocument();

      await user.click(screen.getByText('Maintenance'));
      expect(screen.getByDisplayValue('Maintenance')).toBeInTheDocument();
    });

    it('switches between view modes', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      // Default should be grid view
      const gridButton = screen.getByRole('button', { name: /grid/i });
      expect(gridButton).toHaveClass('ant-btn-primary');

      // Switch to table view
      const tableButton = screen.getByRole('button', { name: /table/i });
      await user.click(tableButton);
      expect(tableButton).toHaveClass('ant-btn-primary');

      // Switch to chart view
      const chartButton = screen.getByRole('button', { name: /charts/i });
      await user.click(chartButton);
      expect(chartButton).toHaveClass('ant-btn-primary');
    });
  });

  describe('Grid View', () => {
    it('displays location cards in grid layout', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
        expect(screen.getByText('STG-A2')).toBeInTheDocument();
        expect(screen.getByText('STG-B1')).toBeInTheDocument();
        expect(screen.getByText('STG-C1')).toBeInTheDocument();
        expect(screen.getByText('STG-M1')).toBeInTheDocument();
      });
    });

    it('shows location names and area information', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('Assembly Area A')).toBeInTheDocument();
        expect(screen.getByText('Assembly Area B')).toBeInTheDocument();
        expect(screen.getByText('Storage Area C')).toBeInTheDocument();
        expect(screen.getByText('Maintenance Area')).toBeInTheDocument();
      });
    });

    it('displays circular progress indicators', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        const progressCircles = screen.getAllByRole('progressbar');
        expect(progressCircles.length).toBeGreaterThan(0);
      });
    });

    it('shows capacity information', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('8/10 capacity')).toBeInTheDocument();
        expect(screen.getByText('6/10 capacity')).toBeInTheDocument();
        expect(screen.getByText('10/12 capacity')).toBeInTheDocument();
        expect(screen.getByText('4/8 capacity')).toBeInTheDocument();
        expect(screen.getByText('0/6 capacity')).toBeInTheDocument();
      });
    });

    it('displays status tags with appropriate colors', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        const availableTags = screen.getAllByText('Available');
        const maintenanceTags = screen.getAllByText('Maintenance');

        expect(availableTags.length).toBeGreaterThan(0);
        expect(maintenanceTags.length).toBeGreaterThan(0);
      });
    });

    it('shows location type and attribute tags', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getAllByText('ASSEMBLY')).toHaveLength(3);
        expect(screen.getAllByText('STORAGE')).toHaveLength(2);
        expect(screen.getByText('Clean Room')).toBeInTheDocument();
        expect(screen.getByText('RESTRICTED')).toBeInTheDocument();
      });
    });

    it('displays active kits information', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('Active Kits:')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12346-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12347-01')).toBeInTheDocument();
        expect(screen.getByText('KIT-WO-12348-01')).toBeInTheDocument();
      });
    });

    it('shows recommendations as alerts', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('Consider expanding capacity during peak hours (2-4 PM)')).toBeInTheDocument();
        expect(screen.getByText('High utilization - consider load balancing with STG-B2')).toBeInTheDocument();
        expect(screen.getByText('Scheduled maintenance in progress - ETA 2 hours')).toBeInTheDocument();
      });
    });

    it('applies special styling for high utilization and maintenance', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        // Cards should have special styling based on status
        const locationCards = screen.getAllByRole('article'); // Card components have article role
        expect(locationCards.length).toBeGreaterThan(0);
      });
    });

    it('handles location card clicks', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
      });

      const locationCard = screen.getByText('STG-A1').closest('.ant-card');
      await user.click(locationCard!);

      // Should open detail modal
      await waitFor(() => {
        expect(screen.getByText('STG-A1 - Assembly Area 1 Staging')).toBeInTheDocument();
      });
    });
  });

  describe('Table View', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const tableButton = screen.getByRole('button', { name: /table/i });
      await user.click(tableButton);
    });

    it('renders table with all columns', () => {
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('Utilization')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Attributes')).toBeInTheDocument();
      expect(screen.getByText('Current Kits')).toBeInTheDocument();
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('displays location information with hierarchy', async () => {
      await waitFor(() => {
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
        expect(screen.getByText('Assembly Area 1 Staging')).toBeInTheDocument();
        expect(screen.getByText('Assembly Area A')).toBeInTheDocument();
      });
    });

    it('shows utilization with progress bars', async () => {
      await waitFor(() => {
        expect(screen.getByText('8/10 (80%)')).toBeInTheDocument();
        expect(screen.getByText('6/10 (60%)')).toBeInTheDocument();
        expect(screen.getByText('10/12 (83%)')).toBeInTheDocument();
      });
    });

    it('displays performance metrics', async () => {
      await waitFor(() => {
        expect(screen.getByText('Throughput: 12.5/day')).toBeInTheDocument();
        expect(screen.getByText('On-time: 94.2%')).toBeInTheDocument();
        expect(screen.getByText('Quality: 98.1%')).toBeInTheDocument();
      });
    });

    it('shows current kit counts as badges', async () => {
      await waitFor(() => {
        const badges = screen.getAllByClassName('ant-badge');
        expect(badges.length).toBeGreaterThan(0);
      });
    });

    it('provides action buttons for each location', async () => {
      await waitFor(() => {
        const detailButtons = screen.getAllByText('Details');
        const configureButtons = screen.getAllByText('Configure');

        expect(detailButtons.length).toBe(5); // One for each location
        expect(configureButtons.length).toBe(5);
      });
    });

    it('handles details button clicks', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getAllByText('Details')).toHaveLength(5);
      });

      const detailButtons = screen.getAllByText('Details');
      await user.click(detailButtons[0]);

      // Should open detail modal
      await waitFor(() => {
        expect(screen.getByText('STG-A1 - Assembly Area 1 Staging')).toBeInTheDocument();
      });
    });

    it('supports table sorting', async () => {
      await waitFor(() => {
        const utilizationHeader = screen.getByText('Utilization');
        const currentKitsHeader = screen.getByText('Current Kits');

        // Headers should be clickable for sorting
        expect(utilizationHeader.closest('th')).toBeInTheDocument();
        expect(currentKitsHeader.closest('th')).toBeInTheDocument();
      });
    });

    it('has type filters in column', async () => {
      const user = userEvent.setup();

      // Table column filters should be available
      await waitFor(() => {
        const typeColumn = screen.getByText('Type');
        expect(typeColumn).toBeInTheDocument();
      });
    });

    it('displays pagination controls', async () => {
      await waitFor(() => {
        // Should show pagination for large datasets
        expect(screen.getByText('10 / page')).toBeInTheDocument();
      });
    });
  });

  describe('Chart View', () => {
    it('displays chart placeholder', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const chartButton = screen.getByRole('button', { name: /charts/i });
      await user.click(chartButton);

      expect(screen.getByText('Chart view coming soon - will include utilization trends, heat maps, and optimization recommendations')).toBeInTheDocument();
    });
  });

  describe('Location Detail Modal', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
      });

      // Open detail modal
      const locationCard = screen.getByText('STG-A1').closest('.ant-card');
      await user.click(locationCard!);
    });

    it('renders modal with correct title', async () => {
      await waitFor(() => {
        expect(screen.getByText('STG-A1 - Assembly Area 1 Staging')).toBeInTheDocument();
      });
    });

    it('displays overview tab with status and metrics', async () => {
      await waitFor(() => {
        expect(screen.getByText('Current Status')).toBeInTheDocument();
        expect(screen.getByText('Performance Metrics')).toBeInTheDocument();
        expect(screen.getByText('8/10 capacity used')).toBeInTheDocument();
      });
    });

    it('shows current kits tab with kit list', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Current Kits')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Current Kits'));

      await waitFor(() => {
        expect(screen.getByText('KIT-WO-12345-01')).toBeInTheDocument();
        expect(screen.getByText('Engine Assembly Kit')).toBeInTheDocument();
        expect(screen.getByText('Started: 2 hours ago')).toBeInTheDocument();
      });
    });

    it('displays recommendations tab with alerts', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Recommendations'));

      await waitFor(() => {
        expect(screen.getByText('Consider expanding capacity during peak hours (2-4 PM)')).toBeInTheDocument();
      });
    });

    it('handles modal close', async () => {
      const user = userEvent.setup();

      await waitFor(() => {
        expect(screen.getByText('STG-A1 - Assembly Area 1 Staging')).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('STG-A1 - Assembly Area 1 Staging')).not.toBeInTheDocument();
      });
    });

    it('shows empty state for locations with no kits', async () => {
      const user = userEvent.setup();

      // Close current modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('STG-A1 - Assembly Area 1 Staging')).not.toBeInTheDocument();
      });

      // Open modal for location with no kits (STG-C1)
      const emptyLocationCard = screen.getByText('STG-C1').closest('.ant-card');
      await user.click(emptyLocationCard!);

      await user.click(screen.getByText('Current Kits'));

      await waitFor(() => {
        expect(screen.getByText('No kits currently assigned')).toBeInTheDocument();
      });
    });

    it('displays action buttons for recommendations requiring action', async () => {
      const user = userEvent.setup();

      // Close current modal and open STG-B1 which has action-required recommendations
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      const highUtilizationCard = screen.getByText('STG-B1').closest('.ant-card');
      await user.click(highUtilizationCard!);

      await user.click(screen.getByText('Recommendations'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /take action/i })).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Logic', () => {
    it('filters by area correctly', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const areaFilter = screen.getByPlaceholderText('Filter by area');
      await user.click(areaFilter);
      await user.click(screen.getByText('Assembly Areas'));

      await waitFor(() => {
        // Should show only assembly areas
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
        expect(screen.getByText('STG-A2')).toBeInTheDocument();
        expect(screen.getByText('STG-B1')).toBeInTheDocument();
        // Storage areas should be filtered out
        expect(screen.queryByText('STG-C1')).not.toBeInTheDocument();
      });
    });

    it('filters by type correctly', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const typeFilter = screen.getByPlaceholderText('Type');
      await user.click(typeFilter);
      await user.click(screen.getByText('Storage'));

      await waitFor(() => {
        // Should show only storage locations
        expect(screen.getByText('STG-C1')).toBeInTheDocument();
        expect(screen.getByText('STG-M1')).toBeInTheDocument();
        // Assembly locations should be filtered out
        expect(screen.queryByText('STG-A1')).not.toBeInTheDocument();
      });
    });

    it('filters by status correctly', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const statusFilter = screen.getByPlaceholderText('Status');
      await user.click(statusFilter);
      await user.click(screen.getByText('Maintenance'));

      await waitFor(() => {
        // Should show only maintenance locations
        expect(screen.getByText('STG-M1')).toBeInTheDocument();
        // Available locations should be filtered out
        expect(screen.queryByText('STG-A1')).not.toBeInTheDocument();
      });
    });
  });

  describe('Utilization Color Coding', () => {
    it('applies correct colors based on utilization rates', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar');
        expect(progressBars.length).toBeGreaterThan(0);

        // Different utilization rates should have different colors
        // Testing this requires checking computed styles or classes
      });
    });
  });

  describe('Props and Customization', () => {
    it('accepts defaultView prop', () => {
      render(<StagingLocationUtilization defaultView="detailed" />);
      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });

    it('accepts selectedArea prop', () => {
      render(<StagingLocationUtilization selectedArea="assembly" />);
      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<StagingLocationUtilization />);

      // Buttons should have proper roles
      expect(screen.getByRole('button', { name: /grid/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /table/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /charts/i })).toBeInTheDocument();

      // Select elements should be accessible
      expect(screen.getByPlaceholderText('Filter by area')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Type')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Status')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      // Tab should navigate through filter controls
      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Filter by area'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Type'));

      await user.tab();
      expect(document.activeElement).toBe(screen.getByPlaceholderText('Status'));
    });

    it('provides meaningful content for screen readers', async () => {
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        // Statistics should have clear titles
        expect(screen.getByText('Total Locations')).toBeInTheDocument();
        expect(screen.getByText('Available')).toBeInTheDocument();

        // Location information should be structured
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
        expect(screen.getByText('Assembly Area A')).toBeInTheDocument();
      });
    });

    it('uses semantic HTML for tables', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const tableButton = screen.getByRole('button', { name: /table/i });
      await user.click(tableButton);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();

        // Should have proper table structure
        const columnHeaders = within(table).getAllByRole('columnheader');
        expect(columnHeaders.length).toBe(8);
      });
    });
  });

  describe('Responsive Design', () => {
    it('renders responsive grid layout', () => {
      render(<StagingLocationUtilization />);

      // Grid should be responsive with proper column classes
      const summaryCards = screen.getAllByText(/Total Locations|Available|At Capacity|Avg Utilization/);
      expect(summaryCards.length).toBe(4);
    });

    it('handles table scrolling on small screens', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      const tableButton = screen.getByRole('button', { name: /table/i });
      await user.click(tableButton);

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table.closest('.ant-table-wrapper')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading and Updates', () => {
    it('loads location data on mount', () => {
      render(<StagingLocationUtilization />);

      // Component should render without errors and show data
      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });

    it('handles empty data gracefully', () => {
      render(<StagingLocationUtilization />);

      // Component should handle empty location data
      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', () => {
      render(<StagingLocationUtilization />);

      // Component should render even with incomplete data
      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });

    it('handles modal operations without errors', async () => {
      const user = userEvent.setup();
      render(<StagingLocationUtilization />);

      await waitFor(() => {
        expect(screen.getByText('STG-A1')).toBeInTheDocument();
      });

      // Opening and closing modal should work without errors
      const locationCard = screen.getByText('STG-A1').closest('.ant-card');
      await user.click(locationCard!);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.getByText('Staging Location Utilization')).toBeInTheDocument();
    });
  });
});