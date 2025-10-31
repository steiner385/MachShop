/**
 * Frontend Component Tests for KitsList Component
 *
 * Comprehensive testing of the KitsList React component including
 * rendering, user interactions, data filtering, and integration with
 * the kit management store and API calls.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, beforeEach, afterEach, it, expect, Mock } from 'vitest';
import { ConfigProvider } from 'antd';

import { KitsList } from '../../../components/Kits/KitsList';
import { useKitStore } from '../../../store/KitStore';
import { useAuthStore } from '../../../store/AuthStore';
import * as kitAPI from '../../../api/kits';

// Mock dependencies
vi.mock('../../../store/KitStore');
vi.mock('../../../store/AuthStore');
vi.mock('../../../api/kits');

const mockedUseKitStore = useKitStore as Mock;
const mockedUseAuthStore = useAuthStore as Mock;
const mockedKitAPI = kitAPI as any;

// Test data
const mockKits = [
  {
    id: 'kit-1',
    kitNumber: 'KIT-001',
    workOrderId: 'wo-1',
    workOrder: {
      workOrderNumber: 'WO-001',
      partNumber: 'ASSEMBLY-001',
      description: 'Engine Assembly Test'
    },
    status: 'PLANNED',
    priority: 'HIGH',
    assemblyStage: 'FINAL_ASSEMBLY',
    stagingLocation: {
      id: 'loc-1',
      name: 'Stage Area A1',
      zone: 'A',
      capacity: 10
    },
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    createdBy: {
      firstName: 'John',
      lastName: 'Planner'
    },
    kitItems: [
      {
        id: 'item-1',
        partNumber: 'PART-001',
        description: 'Test Component 1',
        requiredQuantity: 5,
        availableQuantity: 5,
        status: 'AVAILABLE'
      },
      {
        id: 'item-2',
        partNumber: 'PART-002',
        description: 'Test Component 2',
        requiredQuantity: 3,
        availableQuantity: 2,
        status: 'SHORTAGE'
      }
    ],
    shortageAlerts: [
      {
        id: 'alert-1',
        partNumber: 'PART-002',
        shortfall: 1,
        severity: 'HIGH'
      }
    ]
  },
  {
    id: 'kit-2',
    kitNumber: 'KIT-002',
    workOrderId: 'wo-2',
    workOrder: {
      workOrderNumber: 'WO-002',
      partNumber: 'ASSEMBLY-002',
      description: 'Compressor Assembly Test'
    },
    status: 'STAGING',
    priority: 'NORMAL',
    assemblyStage: 'SUB_ASSEMBLY',
    stagingLocation: {
      id: 'loc-2',
      name: 'Stage Area B2',
      zone: 'B',
      capacity: 8
    },
    createdAt: '2024-01-14T14:00:00Z',
    updatedAt: '2024-01-15T09:15:00Z',
    createdBy: {
      firstName: 'Jane',
      lastName: 'Engineer'
    },
    kitItems: [
      {
        id: 'item-3',
        partNumber: 'PART-003',
        description: 'Test Component 3',
        requiredQuantity: 8,
        availableQuantity: 8,
        status: 'AVAILABLE'
      }
    ],
    shortageAlerts: []
  },
  {
    id: 'kit-3',
    kitNumber: 'KIT-003',
    workOrderId: 'wo-3',
    workOrder: {
      workOrderNumber: 'WO-003',
      partNumber: 'ASSEMBLY-003',
      description: 'Turbine Assembly Test'
    },
    status: 'ISSUED',
    priority: 'LOW',
    assemblyStage: 'FINAL_ASSEMBLY',
    stagingLocation: null,
    createdAt: '2024-01-13T16:30:00Z',
    updatedAt: '2024-01-15T11:45:00Z',
    createdBy: {
      firstName: 'Bob',
      lastName: 'Supervisor'
    },
    kitItems: [
      {
        id: 'item-4',
        partNumber: 'PART-004',
        description: 'Test Component 4',
        requiredQuantity: 12,
        availableQuantity: 12,
        status: 'AVAILABLE'
      }
    ],
    shortageAlerts: []
  }
];

const mockUser = {
  id: 'user-1',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  roles: ['Production Planner', 'Manufacturing Engineer'],
  permissions: ['kits.read', 'kits.write', 'kits.execute']
};

const mockKitStore = {
  kits: mockKits,
  filteredKits: mockKits,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 3,
    totalPages: 1
  },
  filters: {
    status: '',
    priority: '',
    assemblyStage: '',
    workOrderId: '',
    search: ''
  },
  selectedKits: [],
  sortBy: 'createdAt',
  sortOrder: 'desc',
  // Actions
  fetchKits: vi.fn(),
  setFilters: vi.fn(),
  clearFilters: vi.fn(),
  setSorting: vi.fn(),
  selectKit: vi.fn(),
  selectAllKits: vi.fn(),
  clearSelection: vi.fn(),
  updateKitStatus: vi.fn(),
  refreshKits: vi.fn()
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

const renderKitsList = (props = {}) => {
  return render(
    <KitsList {...props} />,
    { wrapper: createWrapper }
  );
};

describe('KitsList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedUseKitStore.mockReturnValue(mockKitStore);
    mockedUseAuthStore.mockReturnValue(mockAuthStore);

    // Mock API calls
    mockedKitAPI.fetchKits = vi.fn().mockResolvedValue({
      kits: mockKits,
      pagination: { page: 1, limit: 20, total: 3, totalPages: 1 }
    });
    mockedKitAPI.updateKitStatus = vi.fn().mockResolvedValue({});
    mockedKitAPI.generateKitQRCode = vi.fn().mockResolvedValue('mock-qr-code-url');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders kit list with all kits displayed', () => {
      renderKitsList();

      expect(screen.getByText('Kit Management')).toBeInTheDocument();
      expect(screen.getByText('KIT-001')).toBeInTheDocument();
      expect(screen.getByText('KIT-002')).toBeInTheDocument();
      expect(screen.getByText('KIT-003')).toBeInTheDocument();
    });

    it('displays kit details correctly', () => {
      renderKitsList();

      // Check first kit details
      expect(screen.getByText('WO-001')).toBeInTheDocument();
      expect(screen.getByText('Engine Assembly Test')).toBeInTheDocument();
      expect(screen.getByText('PLANNED')).toBeInTheDocument();
      expect(screen.getByText('HIGH')).toBeInTheDocument();
      expect(screen.getByText('Stage Area A1')).toBeInTheDocument();
    });

    it('shows shortage alerts for kits with missing materials', () => {
      renderKitsList();

      // Should show shortage alert for KIT-001
      const shortageAlert = screen.getByText(/1 shortage/i);
      expect(shortageAlert).toBeInTheDocument();
    });

    it('displays loading state correctly', () => {
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        loading: true,
        kits: []
      });

      renderKitsList();

      expect(screen.getByTestId('kits-loading')).toBeInTheDocument();
    });

    it('displays error state correctly', () => {
      const errorMessage = 'Failed to load kits';
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        error: errorMessage,
        kits: []
      });

      renderKitsList();

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    it('displays empty state when no kits are available', () => {
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        kits: [],
        filteredKits: []
      });

      renderKitsList();

      expect(screen.getByText(/no kits found/i)).toBeInTheDocument();
    });
  });

  describe('Filtering and Search', () => {
    it('allows filtering by status', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const statusFilter = screen.getByTestId('status-filter');
      await user.click(statusFilter);

      const plannedOption = screen.getByText('Planned');
      await user.click(plannedOption);

      expect(mockKitStore.setFilters).toHaveBeenCalledWith({
        status: 'PLANNED'
      });
    });

    it('allows filtering by priority', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const priorityFilter = screen.getByTestId('priority-filter');
      await user.click(priorityFilter);

      const highOption = screen.getByText('High');
      await user.click(highOption);

      expect(mockKitStore.setFilters).toHaveBeenCalledWith({
        priority: 'HIGH'
      });
    });

    it('allows filtering by assembly stage', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const stageFilter = screen.getByTestId('assembly-stage-filter');
      await user.click(stageFilter);

      const finalAssemblyOption = screen.getByText('Final Assembly');
      await user.click(finalAssemblyOption);

      expect(mockKitStore.setFilters).toHaveBeenCalledWith({
        assemblyStage: 'FINAL_ASSEMBLY'
      });
    });

    it('allows text search across kit numbers and work orders', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const searchInput = screen.getByPlaceholderText(/search kits/i);
      await user.type(searchInput, 'KIT-001');

      // Debounced search should trigger after typing
      await waitFor(() => {
        expect(mockKitStore.setFilters).toHaveBeenCalledWith({
          search: 'KIT-001'
        });
      }, { timeout: 1000 });
    });

    it('allows clearing all filters', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const clearFiltersButton = screen.getByText(/clear filters/i);
      await user.click(clearFiltersButton);

      expect(mockKitStore.clearFilters).toHaveBeenCalled();
    });

    it('shows active filter indicators', () => {
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        filters: {
          status: 'PLANNED',
          priority: 'HIGH',
          assemblyStage: '',
          workOrderId: '',
          search: 'test'
        }
      });

      renderKitsList();

      expect(screen.getByText('Status: Planned')).toBeInTheDocument();
      expect(screen.getByText('Priority: High')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
    });
  });

  describe('Sorting and Pagination', () => {
    it('allows sorting by different columns', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const statusHeader = screen.getByText('Status');
      await user.click(statusHeader);

      expect(mockKitStore.setSorting).toHaveBeenCalledWith('status', 'asc');
    });

    it('toggles sort order when clicking same column', async () => {
      const user = userEvent.setup();
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        sortBy: 'status',
        sortOrder: 'asc'
      });

      renderKitsList();

      const statusHeader = screen.getByText('Status');
      await user.click(statusHeader);

      expect(mockKitStore.setSorting).toHaveBeenCalledWith('status', 'desc');
    });

    it('displays pagination controls when needed', () => {
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        pagination: {
          page: 1,
          limit: 20,
          total: 45,
          totalPages: 3
        }
      });

      renderKitsList();

      expect(screen.getByTestId('pagination')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // Current page
      expect(screen.getByText('3')).toBeInTheDocument(); // Total pages
    });

    it('handles page size changes', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const pageSizeSelect = screen.getByTestId('page-size-select');
      await user.click(pageSizeSelect);

      const size50Option = screen.getByText('50 / page');
      await user.click(size50Option);

      expect(mockKitStore.fetchKits).toHaveBeenCalledWith({
        page: 1,
        limit: 50
      });
    });
  });

  describe('Kit Actions', () => {
    it('allows selecting individual kits', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const firstKitCheckbox = screen.getAllByRole('checkbox')[1]; // Skip header checkbox
      await user.click(firstKitCheckbox);

      expect(mockKitStore.selectKit).toHaveBeenCalledWith('kit-1');
    });

    it('allows selecting all kits', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0]; // Header checkbox
      await user.click(selectAllCheckbox);

      expect(mockKitStore.selectAllKits).toHaveBeenCalled();
    });

    it('shows bulk actions when kits are selected', () => {
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        selectedKits: ['kit-1', 'kit-2']
      });

      renderKitsList();

      expect(screen.getByText('2 kits selected')).toBeInTheDocument();
      expect(screen.getByText(/bulk update status/i)).toBeInTheDocument();
      expect(screen.getByText(/generate qr codes/i)).toBeInTheDocument();
    });

    it('allows updating kit status', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const statusButton = screen.getAllByTestId('kit-status-button')[0];
      await user.click(statusButton);

      const stagingOption = screen.getByText('Move to Staging');
      await user.click(stagingOption);

      expect(mockKitStore.updateKitStatus).toHaveBeenCalledWith('kit-1', 'STAGING');
    });

    it('shows kit details modal when viewing kit', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const viewButton = screen.getAllByTestId('view-kit-button')[0];
      await user.click(viewButton);

      expect(screen.getByTestId('kit-details-modal')).toBeInTheDocument();
      expect(screen.getByText('Kit Details - KIT-001')).toBeInTheDocument();
    });

    it('generates QR codes for selected kits', async () => {
      const user = userEvent.setup();
      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        selectedKits: ['kit-1']
      });

      renderKitsList();

      const generateQRButton = screen.getByText(/generate qr codes/i);
      await user.click(generateQRButton);

      await waitFor(() => {
        expect(mockedKitAPI.generateKitQRCode).toHaveBeenCalledWith('kit-1');
      });
    });

    it('refreshes kit list when refresh button is clicked', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const refreshButton = screen.getByTestId('refresh-button');
      await user.click(refreshButton);

      expect(mockKitStore.refreshKits).toHaveBeenCalled();
    });
  });

  describe('Status Indicators and Visual Elements', () => {
    it('displays correct status badges with appropriate colors', () => {
      renderKitsList();

      const plannedBadge = screen.getByText('PLANNED');
      expect(plannedBadge).toHaveClass('ant-tag-blue');

      const stagingBadge = screen.getByText('STAGING');
      expect(stagingBadge).toHaveClass('ant-tag-orange');

      const issuedBadge = screen.getByText('ISSUED');
      expect(issuedBadge).toHaveClass('ant-tag-green');
    });

    it('displays priority indicators correctly', () => {
      renderKitsList();

      const highPriorityIcon = screen.getByTestId('high-priority-icon');
      expect(highPriorityIcon).toBeInTheDocument();
      expect(highPriorityIcon).toHaveClass('text-red-500');
    });

    it('shows shortage alerts with warning indicators', () => {
      renderKitsList();

      const shortageAlert = screen.getByTestId('shortage-alert-kit-1');
      expect(shortageAlert).toBeInTheDocument();
      expect(shortageAlert).toHaveClass('text-orange-500');
    });

    it('displays progress indicators for kit completion', () => {
      renderKitsList();

      // First kit has 2/3 items available (shortage on one item)
      const progressBar = screen.getByTestId('progress-bar-kit-1');
      expect(progressBar).toBeInTheDocument();

      const progressText = screen.getByText('5/8 Available'); // 5 available out of 8 required
      expect(progressText).toBeInTheDocument();
    });
  });

  describe('Accessibility and User Experience', () => {
    it('has proper ARIA labels and roles', () => {
      renderKitsList();

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getByLabelText(/search kits/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      renderKitsList();

      const searchInput = screen.getByPlaceholderText(/search kits/i);

      // Tab to search input and type
      await user.tab();
      expect(searchInput).toHaveFocus();

      await user.type(searchInput, 'test');
      expect(searchInput).toHaveValue('test');
    });

    it('shows loading indicators during async operations', async () => {
      const user = userEvent.setup();

      // Mock a delayed API call
      const delayedUpdateStatus = vi.fn(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );
      mockKitStore.updateKitStatus = delayedUpdateStatus;

      renderKitsList();

      const statusButton = screen.getAllByTestId('kit-status-button')[0];
      await user.click(statusButton);

      const stagingOption = screen.getByText('Move to Staging');
      await user.click(stagingOption);

      // Should show loading state
      expect(screen.getByTestId('status-update-loading')).toBeInTheDocument();
    });

    it('provides helpful error messages for failed operations', async () => {
      const user = userEvent.setup();

      // Mock a failed API call
      const failedUpdateStatus = vi.fn().mockRejectedValue(
        new Error('Failed to update kit status')
      );
      mockKitStore.updateKitStatus = failedUpdateStatus;

      renderKitsList();

      const statusButton = screen.getAllByTestId('kit-status-button')[0];
      await user.click(statusButton);

      const stagingOption = screen.getByText('Move to Staging');
      await user.click(stagingOption);

      await waitFor(() => {
        expect(screen.getByText(/failed to update kit status/i)).toBeInTheDocument();
      });
    });
  });

  describe('Permission-based Rendering', () => {
    it('hides action buttons when user lacks write permissions', () => {
      mockedUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        hasPermission: vi.fn((permission: string) =>
          permission === 'kits.read' // Only read permission
        )
      });

      renderKitsList();

      expect(screen.queryByTestId('kit-status-button')).not.toBeInTheDocument();
      expect(screen.queryByText(/bulk update/i)).not.toBeInTheDocument();
    });

    it('shows appropriate actions based on user roles', () => {
      mockedUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        hasRole: vi.fn((role: string) =>
          role === 'Production Planner' // Only production planner role
        ),
        hasPermission: vi.fn(() => true)
      });

      renderKitsList();

      expect(screen.getByTestId('kit-status-button')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-actions')).not.toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('updates kit list when store data changes', () => {
      const { rerender } = renderKitsList();

      // Update store with new kit
      const updatedKits = [
        ...mockKits,
        {
          id: 'kit-4',
          kitNumber: 'KIT-004',
          workOrderId: 'wo-4',
          status: 'PLANNED',
          priority: 'NORMAL',
          assemblyStage: 'SUB_ASSEMBLY',
          createdAt: '2024-01-16T09:00:00Z',
          updatedAt: '2024-01-16T09:00:00Z'
        }
      ];

      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        kits: updatedKits,
        filteredKits: updatedKits
      });

      rerender(<KitsList />);

      expect(screen.getByText('KIT-004')).toBeInTheDocument();
    });

    it('reflects status changes in real-time', () => {
      const { rerender } = renderKitsList();

      // Update first kit status
      const updatedKits = mockKits.map(kit =>
        kit.id === 'kit-1'
          ? { ...kit, status: 'STAGING' as const }
          : kit
      );

      mockedUseKitStore.mockReturnValue({
        ...mockKitStore,
        kits: updatedKits,
        filteredKits: updatedKits
      });

      rerender(<KitsList />);

      expect(screen.getByText('STAGING')).toBeInTheDocument();
      expect(screen.queryByText('PLANNED')).not.toBeInTheDocument();
    });
  });
});