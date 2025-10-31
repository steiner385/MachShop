/**
 * OEEMetricsCard Component Tests
 * Tests for the OEE Dashboard Metrics Card component
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, userEvent } from '@/test-utils/render';
import { OEEMetricsCard } from '../OEEMetricsCard';
import { getOEEDashboard } from '@/api/equipment';
import {
  EquipmentClass,
  EquipmentStatus,
  OEEDashboardData,
} from '@/types/equipment';

// Mock window.getComputedStyle for JSDOM compatibility with Ant Design tables
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock the API module
vi.mock('@/api/equipment', () => ({
  getOEEDashboard: vi.fn(),
}));

const mockGetOEEDashboard = vi.mocked(getOEEDashboard);

// Mock OEE Dashboard Data
const mockOEEDashboardData: OEEDashboardData = {
  summary: {
    totalEquipment: 50,
    equipmentWithOEE: 45,
    averageOEE: 78.5,
    averageAvailability: 85.2,
    averagePerformance: 92.1,
    averageQuality: 95.4,
  },
  distribution: {
    excellent: 12, // ≥ 85%
    good: 18, // 70-85%
    fair: 10, // 50-70%
    poor: 5, // < 50%
    noData: 5,
  },
  topPerformers: [
    {
      id: 'equip-001',
      equipmentNumber: 'CNC-001',
      name: 'CNC Machine Alpha',
      equipmentClass: EquipmentClass.PRODUCTION,
      oee: 94.5,
      availability: 98.2,
      performance: 96.4,
      quality: 99.8,
      status: EquipmentStatus.OPERATIONAL,
    },
    {
      id: 'equip-002',
      equipmentNumber: 'ASSY-105',
      name: 'Assembly Line 5',
      equipmentClass: EquipmentClass.ASSEMBLY,
      oee: 91.2,
      availability: 95.1,
      performance: 95.9,
      quality: 99.2,
      status: EquipmentStatus.IN_USE,
    },
  ],
  bottomPerformers: [
    {
      id: 'equip-048',
      equipmentNumber: 'PRESS-008',
      name: 'Hydraulic Press 8',
      equipmentClass: EquipmentClass.PRODUCTION,
      oee: 42.1,
      availability: 65.4,
      performance: 68.9,
      quality: 93.5,
      status: EquipmentStatus.MAINTENANCE,
    },
    {
      id: 'equip-049',
      equipmentNumber: 'CONV-012',
      name: 'Conveyor Belt 12',
      equipmentClass: EquipmentClass.MATERIAL_HANDLING,
      oee: 38.7,
      availability: 58.2,
      performance: 72.1,
      quality: 92.1,
      status: EquipmentStatus.DOWN,
    },
  ],
  byStatus: {
    [EquipmentStatus.AVAILABLE]: 5,
    [EquipmentStatus.IN_USE]: 15,
    [EquipmentStatus.OPERATIONAL]: 20,
    [EquipmentStatus.MAINTENANCE]: 7,
    [EquipmentStatus.DOWN]: 3,
    [EquipmentStatus.RETIRED]: 0,
  },
  byState: {
    IDLE: 8,
    RUNNING: 25,
    BLOCKED: 2,
    STARVED: 1,
    FAULT: 3,
    MAINTENANCE: 7,
    SETUP: 3,
    EMERGENCY: 1,
  },
};

const mockEmptyDashboardData: OEEDashboardData = {
  summary: {
    totalEquipment: 0,
    equipmentWithOEE: 0,
    averageOEE: 0,
    averageAvailability: 0,
    averagePerformance: 0,
    averageQuality: 0,
  },
  distribution: {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    noData: 0,
  },
  topPerformers: [],
  bottomPerformers: [],
  byStatus: {
    [EquipmentStatus.AVAILABLE]: 0,
    [EquipmentStatus.IN_USE]: 0,
    [EquipmentStatus.OPERATIONAL]: 0,
    [EquipmentStatus.MAINTENANCE]: 0,
    [EquipmentStatus.DOWN]: 0,
    [EquipmentStatus.RETIRED]: 0,
  },
  byState: {
    IDLE: 0,
    RUNNING: 0,
    BLOCKED: 0,
    STARVED: 0,
    FAULT: 0,
    MAINTENANCE: 0,
    SETUP: 0,
    EMERGENCY: 0,
  },
};

describe('OEEMetricsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default successful response
    mockGetOEEDashboard.mockResolvedValue({
      success: true,
      data: mockOEEDashboardData,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the OEE dashboard header with title and controls', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('Overall Equipment Effectiveness (OEE)')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Filter by class')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      });
    });

    it('should display loading state initially', () => {
      // Mock a slow API response
      mockGetOEEDashboard.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      renderWithProviders(<OEEMetricsCard />);

      expect(screen.getByText('Loading OEE metrics...')).toBeInTheDocument();
    });

    it('should render all summary statistics with correct values', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        // Check summary statistics
        expect(screen.getByText('Average OEE')).toBeInTheDocument();
        expect(screen.getByText('78.5')).toBeInTheDocument();
        expect(screen.getByText('Availability')).toBeInTheDocument();
        expect(screen.getByText('85.2')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('92.1')).toBeInTheDocument();
        expect(screen.getByText('Quality')).toBeInTheDocument();
        expect(screen.getByText('95.4')).toBeInTheDocument();
      });
    });

    it('should render OEE distribution statistics', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('OEE Distribution')).toBeInTheDocument();
        expect(screen.getByText('Excellent (≥85%)')).toBeInTheDocument();
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('Good (70-85%)')).toBeInTheDocument();
        expect(screen.getByText('18')).toBeInTheDocument();
        expect(screen.getByText('Fair (50-70%)')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
        expect(screen.getByText('Poor (<50%)')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });

    it('should render equipment summary with total and coverage', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('Equipment Summary')).toBeInTheDocument();
        expect(screen.getByText('Total Equipment')).toBeInTheDocument();
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('With OEE Data')).toBeInTheDocument();
        expect(screen.getByText('45')).toBeInTheDocument();
        expect(screen.getByText('Data Coverage')).toBeInTheDocument();
      });
    });

    it('should render top performers table with equipment data', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('Top Performers')).toBeInTheDocument();
        expect(screen.getByText('CNC-001')).toBeInTheDocument();
        expect(screen.getByText('CNC Machine Alpha')).toBeInTheDocument();
        expect(screen.getByText('ASSY-105')).toBeInTheDocument();
        expect(screen.getByText('Assembly Line 5')).toBeInTheDocument();
      });
    });

    it('should render bottom performers table with equipment data', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('Bottom Performers')).toBeInTheDocument();
        expect(screen.getByText('PRESS-008')).toBeInTheDocument();
        expect(screen.getByText('Hydraulic Press 8')).toBeInTheDocument();
        expect(screen.getByText('CONV-012')).toBeInTheDocument();
        expect(screen.getByText('Conveyor Belt 12')).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should call getOEEDashboard API on component mount', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(mockGetOEEDashboard).toHaveBeenCalledTimes(1);
        expect(mockGetOEEDashboard).toHaveBeenCalledWith({
          limit: 5,
        });
      });
    });

    it('should handle API error gracefully (silent fail)', async () => {
      mockGetOEEDashboard.mockResolvedValue({
        success: false,
        error: 'Failed to load OEE dashboard data',
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'OEE Dashboard data unavailable:',
          'Failed to load OEE dashboard data'
        );
      });

      // Component should not render anything on error (returns null)
      expect(screen.queryByText('Overall Equipment Effectiveness (OEE)')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle empty dashboard data', async () => {
      mockGetOEEDashboard.mockResolvedValue({
        success: true,
        data: mockEmptyDashboardData,
      });

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('Overall Equipment Effectiveness (OEE)')).toBeInTheDocument();
        expect(screen.getByText('No data available')).toBeInTheDocument(); // Empty tables
      });
    });
  });

  describe('User Interactions', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(mockGetOEEDashboard).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await user.click(refreshButton);

      await waitFor(() => {
        expect(mockGetOEEDashboard).toHaveBeenCalledTimes(2);
      });
    });

    it('should filter by equipment class when filter is selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(mockGetOEEDashboard).toHaveBeenCalledTimes(1);
      });

      // Open the select dropdown
      const filterSelect = screen.getByPlaceholderText('Filter by class');
      await user.click(filterSelect);

      // Select Production option
      const productionOption = screen.getByText('Production');
      await user.click(productionOption);

      await waitFor(() => {
        expect(mockGetOEEDashboard).toHaveBeenCalledTimes(2);
        expect(mockGetOEEDashboard).toHaveBeenLastCalledWith({
          equipmentClass: EquipmentClass.PRODUCTION,
          limit: 5,
        });
      });
    });
  });

  describe('OEE Status Calculations', () => {
    it('should apply correct colors for different OEE values', async () => {
      const highOEEData = {
        ...mockOEEDashboardData,
        summary: {
          ...mockOEEDashboardData.summary,
          averageOEE: 87.5, // Excellent (≥85%)
        },
      };

      mockGetOEEDashboard.mockResolvedValue({
        success: true,
        data: highOEEData,
      });

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        const oeeValue = screen.getByText('87.5');
        expect(oeeValue).toHaveStyle({ color: '#52c41a' }); // Green for excellent
      });
    });

    it('should handle null OEE values in equipment tables', async () => {
      const dataWithNullOEE = {
        ...mockOEEDashboardData,
        topPerformers: [
          {
            ...mockOEEDashboardData.topPerformers[0],
            oee: null,
            availability: null,
            performance: null,
            quality: null,
          },
        ],
      };

      mockGetOEEDashboard.mockResolvedValue({
        success: true,
        data: dataWithNullOEE,
      });

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument();
      });
    });
  });

  describe('Equipment Class and Status Display', () => {
    it('should display equipment classes with correct labels', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('Production')).toBeInTheDocument();
        expect(screen.getByText('Assembly')).toBeInTheDocument();
        expect(screen.getByText('Material Handling')).toBeInTheDocument();
      });
    });

    it('should display equipment status', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
        expect(screen.getByText('IN_USE')).toBeInTheDocument();
        expect(screen.getByText('MAINTENANCE')).toBeInTheDocument();
        expect(screen.getByText('DOWN')).toBeInTheDocument();
      });
    });
  });

  describe('Data Coverage and No Data Alert', () => {
    it('should show no data alert when equipment have missing OEE data', async () => {
      const dataWithNoDataAlert = {
        ...mockOEEDashboardData,
        distribution: {
          ...mockOEEDashboardData.distribution,
          noData: 10,
        },
      };

      mockGetOEEDashboard.mockResolvedValue({
        success: true,
        data: dataWithNoDataAlert,
      });

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByText('10 equipment with no OEE data')).toBeInTheDocument();
      });
    });

    it('should not show no data alert when all equipment have OEE data', async () => {
      const dataWithoutNoDataAlert = {
        ...mockOEEDashboardData,
        distribution: {
          ...mockOEEDashboardData.distribution,
          noData: 0,
        },
      };

      mockGetOEEDashboard.mockResolvedValue({
        success: true,
        data: dataWithoutNoDataAlert,
      });

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.queryByText(/equipment with no OEE data/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox')).toBeInTheDocument(); // Filter select
        expect(screen.getAllByRole('table')).toHaveLength(2); // Top and bottom performers
      });
    });

    it('should have proper table headers and structure', async () => {
      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(screen.getByRole('columnheader', { name: 'Equipment' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Class' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'OEE' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero total equipment gracefully', async () => {
      mockGetOEEDashboard.mockResolvedValue({
        success: true,
        data: mockEmptyDashboardData,
      });

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        // Should not crash and should show empty state
        expect(screen.getByText('Overall Equipment Effectiveness (OEE)')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument(); // Total Equipment
      });
    });

    it('should handle API network errors', async () => {
      // Mock network error - component expects response format, so simulate API client behavior
      mockGetOEEDashboard.mockResolvedValue({
        success: false,
        error: 'Network error',
      });

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderWithProviders(<OEEMetricsCard />);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'OEE Dashboard data unavailable:',
          'Network error'
        );
      });

      // Component should not render on error
      expect(screen.queryByText('Overall Equipment Effectiveness (OEE)')).not.toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});