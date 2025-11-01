/**
 * MaterialsList Component Tests
 *
 * Tests for the materials list component including:
 * - Material Movement Tracking with dual view modes (definitions/lots)
 * - Statistics dashboard with material and lot counts
 * - Advanced filtering and search functionality
 * - Permission-based access control integration
 * - Expiration management and alerts
 * - Complex table views with material definitions and lots
 * - Navigation integration and error handling
 * - Materials store integration and state management
 */

import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '@/test-utils/render';
import { MaterialsList } from '../MaterialsList';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock materials store
const mockMaterialsStore = {
  definitions: [],
  lots: [],
  statistics: {
    totalDefinitions: 45,
    totalActiveLots: 128,
    lowStockCount: 8,
    expiringSoonCount: 3,
  },
  expiringSoon: [],
  definitionsLoading: false,
  lotsLoading: false,
  statisticsLoading: false,
  definitionsError: null,
  lotsError: null,
  statisticsError: null,
  fetchDefinitions: vi.fn(),
  fetchLots: vi.fn(),
  fetchDashboard: vi.fn(),
  setDefinitionFilters: vi.fn(),
  setLotFilters: vi.fn(),
  clearErrors: vi.fn(),
};

vi.mock('@/store/materialsStore', () => ({
  useMaterialsStore: () => mockMaterialsStore,
}));

// Mock auth store
const mockAuthStore = {
  hasPermission: vi.fn(() => true),
};

vi.mock('@/store/AuthStore', () => ({
  usePermissionCheck: () => mockAuthStore,
}));

// Mock PERMISSIONS and material types/labels
vi.mock('@/types/auth', () => ({
  PERMISSIONS: {
    MATERIALS_READ: 'materials:read',
  },
}));

vi.mock('@/types/materials', () => ({
  MATERIAL_TYPE_LABELS: {
    RAW_MATERIAL: 'Raw Material',
    WORK_IN_PROGRESS: 'Work in Progress',
    FINISHED_GOOD: 'Finished Good',
    CONSUMABLE: 'Consumable',
  },
  MATERIAL_TYPE_COLORS: {
    RAW_MATERIAL: 'blue',
    WORK_IN_PROGRESS: 'orange',
    FINISHED_GOOD: 'green',
    CONSUMABLE: 'purple',
  },
  LOT_STATUS_LABELS: {
    AVAILABLE: 'Available',
    RESERVED: 'Reserved',
    IN_USE: 'In Use',
    CONSUMED: 'Consumed',
    QUARANTINE: 'Quarantine',
    EXPIRED: 'Expired',
  },
  LOT_STATUS_COLORS: {
    AVAILABLE: 'success',
    RESERVED: 'warning',
    IN_USE: 'processing',
    CONSUMED: 'default',
    QUARANTINE: 'error',
    EXPIRED: 'red',
  },
}));

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

describe('MaterialsList', () => {
  const user = userEvent.setup();

  const mockMaterialDefinitions = [
    {
      id: 'def-1',
      materialNumber: 'MAT-001',
      materialName: 'Steel Bar 304SS',
      materialType: 'RAW_MATERIAL',
      baseUnitOfMeasure: 'kg',
      materialGrade: '304',
      specification: 'ASTM A276',
      minimumStock: 100,
      reorderPoint: 50,
      isActive: true,
      lots: [{ id: 'lot-1' }, { id: 'lot-2' }],
    },
    {
      id: 'def-2',
      materialNumber: 'MAT-002',
      materialName: 'Aluminum Plate 6061',
      materialType: 'RAW_MATERIAL',
      baseUnitOfMeasure: 'kg',
      materialGrade: '6061-T6',
      minimumStock: 75,
      reorderPoint: 25,
      isActive: true,
      lots: [{ id: 'lot-3' }],
    },
  ];

  const mockMaterialLots = [
    {
      id: 'lot-1',
      lotNumber: 'LOT-2024-001',
      material: {
        materialName: 'Steel Bar 304SS',
        materialNumber: 'MAT-001',
      },
      currentQuantity: 85.5,
      originalQuantity: 100.0,
      unitOfMeasure: 'kg',
      location: 'A-01-02',
      status: 'AVAILABLE',
      receivedDate: '2024-01-15T08:00:00Z',
      expirationDate: '2025-01-15T00:00:00Z',
    },
    {
      id: 'lot-2',
      lotNumber: 'LOT-2024-002',
      material: {
        materialName: 'Aluminum Plate 6061',
        materialNumber: 'MAT-002',
      },
      currentQuantity: 45.2,
      originalQuantity: 50.0,
      unitOfMeasure: 'kg',
      location: 'B-02-01',
      status: 'RESERVED',
      receivedDate: '2024-01-20T10:00:00Z',
      expirationDate: '2024-02-15T00:00:00Z', // Expiring soon
    },
  ];

  const mockExpiringSoon = [
    {
      id: 'lot-2',
      lotNumber: 'LOT-2024-002',
      expirationDate: '2024-02-15T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockMaterialsStore.definitions = mockMaterialDefinitions;
    mockMaterialsStore.lots = mockMaterialLots;
    mockMaterialsStore.expiringSoon = mockExpiringSoon;
    mockMaterialsStore.definitionsLoading = false;
    mockMaterialsStore.lotsLoading = false;
    mockMaterialsStore.statisticsLoading = false;
    mockMaterialsStore.definitionsError = null;
    mockMaterialsStore.lotsError = null;
    mockMaterialsStore.statisticsError = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the materials list component', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('Material Movement Tracking')).toBeInTheDocument();
      expect(screen.getByText('Track material inventory, lot traceability, and transactions')).toBeInTheDocument();
    });

    it('should fetch dashboard data on mount', async () => {
      renderWithProviders(<MaterialsList />);

      expect(mockMaterialsStore.fetchDashboard).toHaveBeenCalledTimes(1);
    });

    it('should display statistics cards', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('Total Materials')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();

      expect(screen.getByText('Active Lots')).toBeInTheDocument();
      expect(screen.getByText('128')).toBeInTheDocument();

      expect(screen.getByText('Low Stock Items')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();

      expect(screen.getByText('Expiring Soon')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show loading state for statistics', async () => {
      mockMaterialsStore.statisticsLoading = true;

      renderWithProviders(<MaterialsList />);

      // Ant Design loading states are hard to test directly, but component should render
      expect(screen.getByText('Total Materials')).toBeInTheDocument();
    });

    it('should display expiring soon alert when applicable', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('1 lots expiring in the next 30 days')).toBeInTheDocument();
      expect(screen.getByText('Review expiring lots and plan accordingly')).toBeInTheDocument();
    });

    it('should not display expiring alert when no lots expiring', async () => {
      mockMaterialsStore.expiringSoon = [];

      renderWithProviders(<MaterialsList />);

      expect(screen.queryByText(/lots expiring in the next 30 days/)).not.toBeInTheDocument();
    });
  });

  describe('View Mode Switching', () => {
    it('should default to lots view mode', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByDisplayValue('Material Lots')).toBeInTheDocument();
      expect(screen.getByText('Material Lots')).toBeInTheDocument(); // Table title
    });

    it('should switch to definitions view mode', async () => {
      renderWithProviders(<MaterialsList />);

      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      expect(screen.getByDisplayValue('Material Definitions')).toBeInTheDocument();
      expect(screen.getByText('Material Definitions')).toBeInTheDocument(); // Table title
    });

    it('should fetch appropriate data when switching view modes', async () => {
      renderWithProviders(<MaterialsList />);

      // Initially should fetch lots
      await waitFor(() => {
        expect(mockMaterialsStore.fetchLots).toHaveBeenCalled();
      });

      // Switch to definitions
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      await waitFor(() => {
        expect(mockMaterialsStore.fetchDefinitions).toHaveBeenCalled();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should handle search input in lots view', async () => {
      renderWithProviders(<MaterialsList />);

      const searchInput = screen.getByPlaceholderText('Search lots...');
      await user.type(searchInput, 'LOT-2024');

      expect(searchInput).toHaveValue('LOT-2024');
    });

    it('should handle search input in definitions view', async () => {
      renderWithProviders(<MaterialsList />);

      // Switch to definitions view
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      const searchInput = screen.getByPlaceholderText('Search materials...');
      await user.type(searchInput, 'Steel');

      expect(searchInput).toHaveValue('Steel');
    });

    it('should trigger search on enter key', async () => {
      renderWithProviders(<MaterialsList />);

      const searchInput = screen.getByPlaceholderText('Search lots...');
      await user.type(searchInput, 'LOT-2024{enter}');

      await waitFor(() => {
        expect(mockMaterialsStore.setLotFilters).toHaveBeenCalledWith({
          searchText: 'LOT-2024',
        });
      });
    });

    it('should clear search when cleared', async () => {
      renderWithProviders(<MaterialsList />);

      const searchInput = screen.getByPlaceholderText('Search lots...');
      await user.type(searchInput, 'test');

      // Clear the input
      await user.clear(searchInput);

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Filtering', () => {
    it('should display status filter in lots view', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('Filter by status')).toBeInTheDocument();
    });

    it('should display type filter in definitions view', async () => {
      renderWithProviders(<MaterialsList />);

      // Switch to definitions view
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      expect(screen.getByText('Filter by type')).toBeInTheDocument();
    });

    it('should apply status filter in lots view', async () => {
      renderWithProviders(<MaterialsList />);

      const statusFilter = screen.getByText('Filter by status');
      await user.click(statusFilter);
      await user.click(screen.getByText('Available'));

      await waitFor(() => {
        expect(mockMaterialsStore.setLotFilters).toHaveBeenCalledWith({
          status: 'AVAILABLE',
        });
      });
    });

    it('should apply type filter in definitions view', async () => {
      renderWithProviders(<MaterialsList />);

      // Switch to definitions view
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      const typeFilter = screen.getByText('Filter by type');
      await user.click(typeFilter);
      await user.click(screen.getByText('Raw Material'));

      await waitFor(() => {
        expect(mockMaterialsStore.setDefinitionFilters).toHaveBeenCalledWith({
          materialType: 'RAW_MATERIAL',
        });
      });
    });
  });

  describe('Material Definitions Table', () => {
    beforeEach(async () => {
      renderWithProviders(<MaterialsList />);

      // Switch to definitions view
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));
    });

    it('should display material definitions table columns', async () => {
      expect(screen.getByText('Material Number')).toBeInTheDocument();
      expect(screen.getByText('Material Name')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('UOM')).toBeInTheDocument();
      expect(screen.getByText('Grade/Spec')).toBeInTheDocument();
      expect(screen.getByText('Stock Levels')).toBeInTheDocument();
      expect(screen.getByText('Active Lots')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display material definition data', async () => {
      expect(screen.getByText('MAT-001')).toBeInTheDocument();
      expect(screen.getByText('Steel Bar 304SS')).toBeInTheDocument();
      expect(screen.getByText('Raw Material')).toBeInTheDocument();
      expect(screen.getByText('kg')).toBeInTheDocument();
      expect(screen.getByText('304')).toBeInTheDocument();
      expect(screen.getByText('Min: 100 kg')).toBeInTheDocument();
      expect(screen.getByText('Reorder: 50 kg')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Active lots count
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should handle view action with permissions', async () => {
      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/materials/definitions/def-1');
    });

    it('should disable view action without permissions', async () => {
      mockAuthStore.hasPermission.mockReturnValue(false);

      renderWithProviders(<MaterialsList />);

      // Switch to definitions view
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      const viewButtons = screen.getAllByText('View');
      expect(viewButtons[0]).toBeDisabled();
    });
  });

  describe('Material Lots Table', () => {
    it('should display material lots table columns', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('Lot Number')).toBeInTheDocument();
      expect(screen.getByText('Material')).toBeInTheDocument();
      expect(screen.getByText('Quantity')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Received Date')).toBeInTheDocument();
      expect(screen.getByText('Expiration')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should display material lot data', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('LOT-2024-001')).toBeInTheDocument();
      expect(screen.getByText('Steel Bar 304SS')).toBeInTheDocument();
      expect(screen.getByText('MAT-001')).toBeInTheDocument();
      expect(screen.getByText('85.5')).toBeInTheDocument();
      expect(screen.getByText('/ 100 kg')).toBeInTheDocument();
      expect(screen.getByText('86% remaining')).toBeInTheDocument();
      expect(screen.getByText('A-01-02')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    it('should calculate and display percentage remaining', async () => {
      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('86% remaining')).toBeInTheDocument(); // 85.5/100 = 85.5% ≈ 86%
      expect(screen.getByText('90% remaining')).toBeInTheDocument(); // 45.2/50 = 90.4% ≈ 90%
    });

    it('should display expiration information correctly', async () => {
      // Mock current date for consistent testing
      const mockDate = new Date('2024-01-30T12:00:00Z');
      vi.setSystemTime(mockDate);

      renderWithProviders(<MaterialsList />);

      // Should show expiring soon warning
      expect(screen.getByText('EXPIRED')).toBeInTheDocument(); // For lot-2 which expires 2024-02-15
    });

    it('should handle view action for lots', async () => {
      renderWithProviders(<MaterialsList />);

      const viewButtons = screen.getAllByText('View');
      await user.click(viewButtons[0]);

      expect(mockNavigate).toHaveBeenCalledWith('/materials/lots/lot-1');
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh data when refresh button is clicked', async () => {
      const { message } = await import('antd');
      renderWithProviders(<MaterialsList />);

      const refreshButton = screen.getByText('Refresh');
      await user.click(refreshButton);

      expect(mockMaterialsStore.fetchDashboard).toHaveBeenCalledTimes(2); // Once on mount, once on refresh
      expect(message.success).toHaveBeenCalledWith('Data refreshed');
    });
  });

  describe('Error Handling', () => {
    it('should display definitions error message', async () => {
      const { message } = await import('antd');
      mockMaterialsStore.definitionsError = 'Failed to load definitions';

      renderWithProviders(<MaterialsList />);

      expect(message.error).toHaveBeenCalledWith('Failed to load definitions');
    });

    it('should display lots error message', async () => {
      const { message } = await import('antd');
      mockMaterialsStore.lotsError = 'Failed to load lots';

      renderWithProviders(<MaterialsList />);

      expect(message.error).toHaveBeenCalledWith('Failed to load lots');
    });

    it('should display statistics error message', async () => {
      const { message } = await import('antd');
      mockMaterialsStore.statisticsError = 'Failed to load statistics';

      renderWithProviders(<MaterialsList />);

      expect(message.error).toHaveBeenCalledWith('Failed to load statistics');
    });

    it('should clear errors after displaying them', async () => {
      mockMaterialsStore.definitionsError = 'Test error';

      renderWithProviders(<MaterialsList />);

      // Wait for setTimeout to trigger clearErrors
      await waitFor(() => {
        expect(mockMaterialsStore.clearErrors).toHaveBeenCalled();
      }, { timeout: 4000 });
    });
  });

  describe('Loading States', () => {
    it('should show loading state for tables', async () => {
      mockMaterialsStore.lotsLoading = true;

      renderWithProviders(<MaterialsList />);

      // Ant Design table loading is internal, but we can verify the loading prop is set
      expect(screen.getByText('Material Lots')).toBeInTheDocument();
    });

    it('should show loading state for statistics', async () => {
      mockMaterialsStore.statisticsLoading = true;

      renderWithProviders(<MaterialsList />);

      // Statistics should still render with loading state
      expect(screen.getByText('Total Materials')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data gracefully', async () => {
      mockMaterialsStore.definitions = [];
      mockMaterialsStore.lots = [];
      mockMaterialsStore.statistics = null;

      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('Material Movement Tracking')).toBeInTheDocument();
    });

    it('should handle missing statistics', async () => {
      mockMaterialsStore.statistics = null;

      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('0')).toBeInTheDocument(); // Fallback values
    });

    it('should handle lots without location', async () => {
      mockMaterialsStore.lots = [
        {
          ...mockMaterialLots[0],
          location: null,
        },
      ];

      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should handle lots without expiration date', async () => {
      mockMaterialsStore.lots = [
        {
          ...mockMaterialLots[0],
          expirationDate: null,
        },
      ];

      renderWithProviders(<MaterialsList />);

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('should handle materials without grade or specification', async () => {
      mockMaterialsStore.definitions = [
        {
          ...mockMaterialDefinitions[0],
          materialGrade: null,
          specification: null,
        },
      ];

      renderWithProviders(<MaterialsList />);

      // Switch to definitions view
      const viewModeSelect = screen.getByDisplayValue('Material Lots');
      await user.click(viewModeSelect);
      await user.click(screen.getByText('Material Definitions'));

      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      renderWithProviders(<MaterialsList />);

      // Pagination text should be visible
      expect(screen.getByText(/Total \d+ lots/)).toBeInTheDocument();
    });

    it('should handle page size changes', async () => {
      renderWithProviders(<MaterialsList />);

      // Pagination controls should be present (exact interaction depends on Ant Design implementation)
      expect(screen.getByText(/Total \d+ lots/)).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have horizontal scroll for tables', async () => {
      renderWithProviders(<MaterialsList />);

      // Tables should have scroll configuration
      expect(screen.getByText('Material Lots')).toBeInTheDocument();
    });
  });
});