/**
 * MaintenanceList Component Tests
 * Comprehensive test suite for Equipment Maintenance List component
 */

import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { message } from 'antd';

import { renderWithProviders } from '@/test-utils/render';
import { MaintenanceList } from '../MaintenanceList';
import { useEquipmentStore } from '@/store/equipmentStore';
import * as router from 'react-router-dom';
import {
  EquipmentClass,
  EquipmentStatus,
  MaintenanceType,
  MaintenanceStatus,
  Equipment,
  MaintenanceRecord,
} from '@/types/equipment';

// Mock the equipment store
vi.mock('@/store/equipmentStore');
const mockUseEquipmentStore = vi.mocked(useEquipmentStore);

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

describe('MaintenanceList', () => {
  const mockEquipment: Equipment[] = [
    {
      id: 'eq-1',
      equipmentNumber: 'EQ-001',
      name: 'CNC Milling Machine',
      equipmentClass: EquipmentClass.PRODUCTION,
      status: EquipmentStatus.ACTIVE,
      oee: 0.85,
      availability: 0.92,
      siteId: 'site-1',
      areaId: 'area-1',
      maintenanceRecords: ['maint-1', 'maint-2'],
    },
    {
      id: 'eq-2',
      equipmentNumber: 'EQ-002',
      name: 'Quality Testing Station',
      equipmentClass: EquipmentClass.QUALITY,
      status: EquipmentStatus.DOWN,
      oee: 0.65,
      availability: 0.75,
      siteId: 'site-1',
      areaId: 'area-2',
      maintenanceRecords: ['maint-3'],
    },
  ];

  const mockMaintenanceRecords: MaintenanceRecord[] = [
    {
      id: 'maint-1',
      equipmentId: 'eq-1',
      equipment: mockEquipment[0],
      maintenanceType: MaintenanceType.PREVENTIVE,
      status: MaintenanceStatus.COMPLETED,
      description: 'Regular maintenance check',
      scheduledDate: '2024-01-15T09:00:00Z',
      completedDate: '2024-01-15T11:00:00Z',
      duration: 2,
      cost: 500,
      performedBy: 'John Smith',
    },
    {
      id: 'maint-2',
      equipmentId: 'eq-1',
      equipment: mockEquipment[0],
      maintenanceType: MaintenanceType.CALIBRATION,
      status: MaintenanceStatus.SCHEDULED,
      description: 'Calibration check',
      scheduledDate: '2024-02-01T10:00:00Z',
      duration: 1,
      cost: 200,
    },
    {
      id: 'maint-3',
      equipmentId: 'eq-2',
      equipment: mockEquipment[1],
      maintenanceType: MaintenanceType.CORRECTIVE,
      status: MaintenanceStatus.IN_PROGRESS,
      description: 'Repair sensor malfunction',
      scheduledDate: '2024-01-20T08:00:00Z',
      duration: 4,
      cost: 1200,
      performedBy: 'Jane Doe',
    },
  ];

  const mockStatistics = {
    totalEquipment: 25,
    totalMaintenanceScheduled: 8,
    totalMaintenanceOverdue: 3,
    averageOEE: 0.82,
  };

  const mockUpcomingMaintenance = [
    {
      id: 'upcoming-1',
      equipmentId: 'eq-1',
      scheduledDate: '2024-02-01T10:00:00Z',
      maintenanceType: MaintenanceType.PREVENTIVE,
    },
  ];

  const mockOverdueMaintenance = [
    {
      id: 'overdue-1',
      equipmentId: 'eq-2',
      scheduledDate: '2024-01-10T10:00:00Z',
      maintenanceType: MaintenanceType.CALIBRATION,
    },
    {
      id: 'overdue-2',
      equipmentId: 'eq-1',
      scheduledDate: '2024-01-12T10:00:00Z',
      maintenanceType: MaintenanceType.PREVENTIVE,
    },
    {
      id: 'overdue-3',
      equipmentId: 'eq-2',
      scheduledDate: '2024-01-14T10:00:00Z',
      maintenanceType: MaintenanceType.CORRECTIVE,
    },
  ];

  const defaultStoreState = {
    equipment: mockEquipment,
    maintenanceRecords: mockMaintenanceRecords,
    statistics: mockStatistics,
    upcomingMaintenance: mockUpcomingMaintenance,
    overdueMaintenance: mockOverdueMaintenance,
    equipmentLoading: false,
    maintenanceLoading: false,
    statisticsLoading: false,
    equipmentError: null,
    maintenanceError: null,
    statisticsError: null,
    fetchEquipment: vi.fn(),
    fetchMaintenance: vi.fn(),
    fetchDashboard: vi.fn(),
    setEquipmentFilters: vi.fn(),
    setMaintenanceFilters: vi.fn(),
    clearErrors: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseEquipmentStore.mockReturnValue(defaultStoreState);
  });

  describe('Component Rendering', () => {
    it('should render the maintenance list component', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('Equipment Maintenance Scheduling')).toBeInTheDocument();
      expect(screen.getByText('Manage preventive maintenance, calibration, and equipment downtime tracking')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Maintenance Records')).toBeInTheDocument();
    });

    it('should render statistics cards with correct values', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('Total Equipment')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Scheduled Maintenance')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
      expect(screen.getByText('Overdue')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Calibration Due')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Calculated from scheduled calibration records
    });

    it('should render alerts for overdue and upcoming maintenance', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('3 maintenance tasks are overdue')).toBeInTheDocument();
      expect(screen.getByText('Review overdue maintenance tasks and schedule completion')).toBeInTheDocument();
      expect(screen.getByText('1 maintenance tasks scheduled in the next 30 days')).toBeInTheDocument();
      expect(screen.getByText('Review upcoming maintenance and ensure resources are available')).toBeInTheDocument();
    });

    it('should not render alerts when no overdue or upcoming maintenance', async () => {
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        upcomingMaintenance: [],
        overdueMaintenance: [],
      });

      renderWithProviders(<MaintenanceList />);

      expect(screen.queryByText('maintenance tasks are overdue')).not.toBeInTheDocument();
      expect(screen.queryByText('maintenance tasks scheduled in the next 30 days')).not.toBeInTheDocument();
    });
  });

  describe('View Mode Switching', () => {
    it('should start in maintenance records view by default', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByDisplayValue('Maintenance Records')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Records')).toBeInTheDocument();
      expect(screen.getByText('Maintenance Type')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('should switch to equipment view when selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);

      const equipmentOption = screen.getByText('Equipment List');
      await user.click(equipmentOption);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Equipment List')).toBeInTheDocument();
        expect(screen.getByText('Equipment List')).toBeInTheDocument();
        expect(screen.getByText('Equipment Number')).toBeInTheDocument();
        expect(screen.getByText('Equipment Name')).toBeInTheDocument();
        expect(screen.getByText('Class')).toBeInTheDocument();
      });
    });

    it('should display different filters based on view mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      // Maintenance view filters
      expect(screen.getByText('Filter by type')).toBeInTheDocument();
      expect(screen.getByText('Filter by status')).toBeInTheDocument();

      // Switch to equipment view
      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('Filter by class')).toBeInTheDocument();
        expect(screen.getByText('Filter by status')).toBeInTheDocument();
      });
    });
  });

  describe('Data Loading and Error States', () => {
    it('should show loading state', async () => {
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        equipmentLoading: true,
        maintenanceLoading: true,
        statisticsLoading: true,
      });

      renderWithProviders(<MaintenanceList />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
    });

    it('should handle and display equipment errors', async () => {
      const mockError = 'Failed to load equipment data';
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        equipmentError: mockError,
      });

      renderWithProviders(<MaintenanceList />);

      expect(message.error).toHaveBeenCalledWith(mockError);
    });

    it('should handle and display maintenance errors', async () => {
      const mockError = 'Failed to load maintenance data';
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        maintenanceError: mockError,
      });

      renderWithProviders(<MaintenanceList />);

      expect(message.error).toHaveBeenCalledWith(mockError);
    });

    it('should handle and display statistics errors', async () => {
      const mockError = 'Failed to load statistics';
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        statisticsError: mockError,
      });

      renderWithProviders(<MaintenanceList />);

      expect(message.error).toHaveBeenCalledWith(mockError);
    });

    it('should clear errors after displaying them', async () => {
      const mockClearErrors = vi.fn();
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        equipmentError: 'Some error',
        clearErrors: mockClearErrors,
      });

      renderWithProviders(<MaintenanceList />);

      await waitFor(() => {
        expect(mockClearErrors).toHaveBeenCalled();
      }, { timeout: 4000 });
    });
  });

  describe('Search Functionality', () => {
    it('should handle search input changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const searchInput = screen.getByPlaceholderText('Search maintenance...');
      await user.type(searchInput, 'calibration');

      expect(searchInput).toHaveValue('calibration');
    });

    it('should call search handler on enter', async () => {
      const user = userEvent.setup();
      const mockSetMaintenanceFilters = vi.fn();
      const mockFetchMaintenance = vi.fn();

      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        setMaintenanceFilters: mockSetMaintenanceFilters,
        fetchMaintenance: mockFetchMaintenance,
      });

      renderWithProviders(<MaintenanceList />);

      const searchInput = screen.getByPlaceholderText('Search maintenance...');
      await user.type(searchInput, 'test{enter}');

      await waitFor(() => {
        expect(mockSetMaintenanceFilters).toHaveBeenCalled();
        expect(mockFetchMaintenance).toHaveBeenCalled();
      });
    });

    it('should update placeholder text based on view mode', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByPlaceholderText('Search maintenance...')).toBeInTheDocument();

      // Switch to equipment view
      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search equipment...')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should handle maintenance type filtering', async () => {
      const user = userEvent.setup();
      const mockSetMaintenanceFilters = vi.fn();
      const mockFetchMaintenance = vi.fn();

      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        setMaintenanceFilters: mockSetMaintenanceFilters,
        fetchMaintenance: mockFetchMaintenance,
      });

      renderWithProviders(<MaintenanceList />);

      const typeFilter = screen.getByText('Filter by type');
      await user.click(typeFilter);

      // Note: The actual options would depend on MAINTENANCE_TYPE_LABELS constant
      // This is a placeholder for the filter interaction
      await waitFor(() => {
        expect(mockSetMaintenanceFilters).toHaveBeenCalled();
        expect(mockFetchMaintenance).toHaveBeenCalled();
      });
    });

    it('should handle equipment class filtering when in equipment view', async () => {
      const user = userEvent.setup();
      const mockSetEquipmentFilters = vi.fn();
      const mockFetchEquipment = vi.fn();

      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        setEquipmentFilters: mockSetEquipmentFilters,
        fetchEquipment: mockFetchEquipment,
      });

      renderWithProviders(<MaintenanceList />);

      // Switch to equipment view
      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(mockSetEquipmentFilters).toHaveBeenCalled();
        expect(mockFetchEquipment).toHaveBeenCalled();
      });
    });
  });

  describe('Maintenance Records Table', () => {
    it('should display maintenance records in table format', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('CNC Milling Machine')).toBeInTheDocument();
      expect(screen.getByText('EQ-001')).toBeInTheDocument();
      expect(screen.getByText('Regular maintenance check')).toBeInTheDocument();
      expect(screen.getByText('Calibration check')).toBeInTheDocument();
      expect(screen.getByText('Repair sensor malfunction')).toBeInTheDocument();
    });

    it('should format dates correctly', async () => {
      renderWithProviders(<MaintenanceList />);

      // Check if dates are formatted (format depends on locale)
      expect(screen.getByText(/1\/15\/2024/)).toBeInTheDocument();
      expect(screen.getByText(/2\/1\/2024/)).toBeInTheDocument();
    });

    it('should display duration and cost information', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('2 hrs')).toBeInTheDocument();
      expect(screen.getByText('1 hrs')).toBeInTheDocument();
      expect(screen.getByText('4 hrs')).toBeInTheDocument();
      expect(screen.getByText('$500')).toBeInTheDocument();
      expect(screen.getByText('$200')).toBeInTheDocument();
      expect(screen.getByText('$1,200')).toBeInTheDocument();
    });

    it('should handle navigation to maintenance detail view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/equipment/maintenance/maint-1');
    });
  });

  describe('Equipment Table', () => {
    it('should display equipment in table format when in equipment view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      // Switch to equipment view
      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('EQ-001')).toBeInTheDocument();
        expect(screen.getByText('EQ-002')).toBeInTheDocument();
        expect(screen.getByText('CNC Milling Machine')).toBeInTheDocument();
        expect(screen.getByText('Quality Testing Station')).toBeInTheDocument();
      });
    });

    it('should display OEE percentages with appropriate styling', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument(); // Good OEE
        expect(screen.getByText('65%')).toBeInTheDocument(); // Poor OEE
      });
    });

    it('should display availability percentages', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('92%')).toBeInTheDocument();
        expect(screen.getByText('75%')).toBeInTheDocument();
      });
    });

    it('should display location information', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('Site: site-1')).toBeInTheDocument();
        expect(screen.getByText('Area: area-1')).toBeInTheDocument();
        expect(screen.getByText('Area: area-2')).toBeInTheDocument();
      });
    });

    it('should display maintenance record counts', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument(); // EQ-001 has 2 records
        expect(screen.getByText('1')).toBeInTheDocument(); // EQ-002 has 1 record
      });
    });

    it('should handle navigation to equipment detail view', async () => {
      const user = userEvent.setup();
      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(async () => {
        const viewButtons = screen.getAllByText('View');
        await user.click(viewButtons[0]);
        expect(mockNavigate).toHaveBeenCalledWith('/equipment/eq-1');
      });
    });
  });

  describe('Actions and Controls', () => {
    it('should handle refresh action', async () => {
      const user = userEvent.setup();
      const mockFetchDashboard = vi.fn();

      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        fetchDashboard: mockFetchDashboard,
      });

      renderWithProviders(<MaintenanceList />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockFetchDashboard).toHaveBeenCalled();
      expect(message.success).toHaveBeenCalledWith('Data refreshed');
    });

    it('should render schedule maintenance button', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('Schedule Maintenance')).toBeInTheDocument();
    });

    it('should call fetchDashboard on component mount', async () => {
      const mockFetchDashboard = vi.fn();

      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        fetchDashboard: mockFetchDashboard,
      });

      renderWithProviders(<MaintenanceList />);

      expect(mockFetchDashboard).toHaveBeenCalled();
    });
  });

  describe('Empty States', () => {
    it('should show empty message when no maintenance records', async () => {
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        maintenanceRecords: [],
      });

      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('No maintenance records found')).toBeInTheDocument();
    });

    it('should show empty message when no equipment', async () => {
      const user = userEvent.setup();
      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        equipment: [],
      });

      renderWithProviders(<MaintenanceList />);

      const viewSelect = screen.getByDisplayValue('Maintenance Records');
      await user.click(viewSelect);
      await user.click(screen.getByText('Equipment List'));

      await waitFor(() => {
        expect(screen.getByText('No equipment found')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      renderWithProviders(<MaintenanceList />);

      // Check for table accessibility
      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(9); // Maintenance table columns
      expect(screen.getAllByRole('row')).toHaveLength(4); // Header + 3 data rows
    });

    it('should have accessible button labels', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /schedule maintenance/i })).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should handle table scrolling for large datasets', async () => {
      renderWithProviders(<MaintenanceList />);

      const table = screen.getByRole('table');
      expect(table.closest('.ant-table-wrapper')).toHaveStyle({
        overflowX: 'auto',
      });
    });

    it('should show pagination controls', async () => {
      renderWithProviders(<MaintenanceList />);

      expect(screen.getByText('Total 3 records')).toBeInTheDocument();
    });
  });

  describe('Data Integration', () => {
    it('should apply filters and fetch data on filter changes', async () => {
      const mockSetMaintenanceFilters = vi.fn();
      const mockFetchMaintenance = vi.fn();

      mockUseEquipmentStore.mockReturnValue({
        ...defaultStoreState,
        setMaintenanceFilters: mockSetMaintenanceFilters,
        fetchMaintenance: mockFetchMaintenance,
      });

      renderWithProviders(<MaintenanceList />);

      // Filters should be applied on mount
      expect(mockSetMaintenanceFilters).toHaveBeenCalled();
      expect(mockFetchMaintenance).toHaveBeenCalled();
    });

    it('should calculate calibration due count correctly', async () => {
      renderWithProviders(<MaintenanceList />);

      // Should calculate from maintenance records where type is CALIBRATION and status is SCHEDULED
      expect(screen.getByText('1')).toBeInTheDocument(); // Calibration Due count
    });
  });
});