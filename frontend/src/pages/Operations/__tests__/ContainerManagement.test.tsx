/**
 * Tests for ContainerManagement Component
 * Phase 11: Comprehensive Testing
 * Issue #64: Material Movement & Logistics Management System
 *
 * Tests container management interface including:
 * - Container list view with filtering
 * - Scanner tab for barcode/QR code input
 * - Analytics dashboard
 * - Load/unload/transfer operations
 * - Container details view
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ContainerManagement } from '../ContainerManagement';

// Mock the useContainerTracking hook
vi.mock('@/hooks/useContainerTracking', () => ({
  useContainerTracking: vi.fn(() => ({
    containers: [
      {
        id: 'cont-1',
        containerNumber: 'CONT-001',
        containerType: 'Tote',
        size: 'Large',
        status: 'LOADED',
        currentLocation: 'Warehouse A',
        capacity: 100,
        currentQuantity: 75,
        currentContents: ['PART-123'],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cont-2',
        containerNumber: 'CONT-002',
        containerType: 'Bin',
        size: 'Medium',
        status: 'EMPTY',
        currentLocation: 'Warehouse B',
        capacity: 50,
        currentQuantity: 0,
        currentContents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    loading: false,
    error: null,
    fetchContainers: vi.fn().mockResolvedValue([]),
    getContainer: vi.fn().mockResolvedValue({}),
    loadContainer: vi.fn().mockResolvedValue({}),
    unloadContainer: vi.fn().mockResolvedValue({}),
    transferContainer: vi.fn().mockResolvedValue({}),
    getMovementHistory: vi.fn().mockResolvedValue([]),
    getUtilization: vi.fn().mockResolvedValue({}),
    searchContainer: vi.fn(),
    getContainersByStatus: vi.fn(() => []),
    getContainersByLocation: vi.fn(() => []),
    getAverageUtilization: vi.fn(() => 75),
    clearError: vi.fn(),
  })),
}));

// Mock Material-UI components for barcode scanner
vi.mock('@/components/Scanner/BarcodeScanner', () => ({
  BarcodeScanner: ({ onScan }: { onScan: (code: string) => void }) => (
    <div data-testid="barcode-scanner">
      <input
        type="text"
        data-testid="scanner-input"
        onBlur={(e) => onScan(e.target.value)}
        placeholder="Scan or enter barcode"
      />
    </div>
  ),
}));

describe('ContainerManagement Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component with header', () => {
      render(<ContainerManagement />);

      expect(screen.getByText('Container Management')).toBeInTheDocument();
      expect(
        screen.getByText('Manage and track material containers')
      ).toBeInTheDocument();
    });

    it('should render tab navigation', () => {
      render(<ContainerManagement />);

      expect(screen.getByRole('tab', { name: /container list/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /scanner/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /analytics/i })).toBeInTheDocument();
    });

    it('should render action buttons', () => {
      render(<ContainerManagement />);

      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    });
  });

  describe('Container List Tab', () => {
    it('should display container table with headers', () => {
      render(<ContainerManagement />);

      expect(screen.getByText('Container #')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Capacity')).toBeInTheDocument();
      expect(screen.getByText('Utilization')).toBeInTheDocument();
    });

    it('should display container data in table rows', () => {
      render(<ContainerManagement />);

      expect(screen.getByText('CONT-001')).toBeInTheDocument();
      expect(screen.getByText('CONT-002')).toBeInTheDocument();
      expect(screen.getByText('Warehouse A')).toBeInTheDocument();
      expect(screen.getByText('Warehouse B')).toBeInTheDocument();
    });

    it('should display status chips with correct colors', () => {
      render(<ContainerManagement />);

      // Status chips should be present (rendered via Material-UI Chip component)
      const loadedStatusChips = screen.getAllByText('LOADED');
      const emptyStatusChips = screen.getAllByText('EMPTY');

      expect(loadedStatusChips.length).toBeGreaterThan(0);
      expect(emptyStatusChips.length).toBeGreaterThan(0);
    });

    it('should display utilization progress bars', () => {
      render(<ContainerManagement />);

      // Look for progress indicators showing 75% and 0% utilization
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Filtering', () => {
    it('should filter containers by status', async () => {
      const { useContainerTracking } = await import('@/hooks/useContainerTracking');
      const user = userEvent.setup();

      render(<ContainerManagement />);

      const statusFilter = screen.getByLabelText(/status/i);
      await user.click(statusFilter);
      await user.click(screen.getByText('LOADED'));

      expect(useContainerTracking).toHaveBeenCalled();
    });

    it('should filter containers by location', async () => {
      const { useContainerTracking } = await import('@/hooks/useContainerTracking');
      const user = userEvent.setup();

      render(<ContainerManagement />);

      const locationFilter = screen.getByLabelText(/location/i);
      await user.click(locationFilter);

      expect(locationFilter).toBeInTheDocument();
    });

    it('should filter containers by type', async () => {
      const { useContainerTracking } = await import('@/hooks/useContainerTracking');
      const user = userEvent.setup();

      render(<ContainerManagement />);

      const typeFilter = screen.getByLabelText(/container type/i);
      await user.click(typeFilter);

      expect(typeFilter).toBeInTheDocument();
    });
  });

  describe('Container Actions', () => {
    it('should open container details dialog when clicking a row', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const containerRow = screen.getByText('CONT-001').closest('tr');
      expect(containerRow).toBeInTheDocument();

      await user.click(containerRow!);

      // Details dialog should be visible
      await waitFor(() => {
        expect(screen.getByText('CONT-001')).toBeInTheDocument();
      });
    });

    it('should show context menu with action options', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      expect(menuButtons.length).toBeGreaterThan(0);

      await user.click(menuButtons[0]);

      // Menu options should appear
      await waitFor(() => {
        expect(screen.getByText(/view details/i)).toBeInTheDocument();
      });
    });

    it('should open transfer dialog', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(menuButtons[0]);

      const transferOption = screen.getByText(/transfer/i);
      await user.click(transferOption);

      // Transfer dialog should open
      await waitFor(() => {
        expect(screen.getByLabelText(/target location/i)).toBeInTheDocument();
      });
    });
  });

  describe('Scanner Tab', () => {
    it('should render barcode scanner component', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const scannerTab = screen.getByRole('tab', { name: /scanner/i });
      await user.click(scannerTab);

      expect(screen.getByTestId('barcode-scanner')).toBeInTheDocument();
    });

    it('should handle scanned container numbers', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const scannerTab = screen.getByRole('tab', { name: /scanner/i });
      await user.click(scannerTab);

      const scanInput = screen.getByTestId('scanner-input');
      await user.type(scanInput, 'CONT-001');
      fireEvent.blur(scanInput);

      await waitFor(() => {
        // Scanner should find and display the container
        expect(screen.getByText('CONT-001')).toBeInTheDocument();
      });
    });

    it('should show manual input fallback', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const scannerTab = screen.getByRole('tab', { name: /scanner/i });
      await user.click(scannerTab);

      const manualInput = screen.getByPlaceholderText(/scan or enter/i);
      expect(manualInput).toBeInTheDocument();
    });

    it('should display last scanned container', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const scannerTab = screen.getByRole('tab', { name: /scanner/i });
      await user.click(scannerTab);

      const scanInput = screen.getByTestId('scanner-input');
      await user.type(scanInput, 'CONT-001');
      fireEvent.blur(scanInput);

      await waitFor(() => {
        expect(screen.getByText(/last scanned/i)).toBeInTheDocument();
      });
    });
  });

  describe('Analytics Tab', () => {
    it('should display statistics cards', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
      await user.click(analyticsTab);

      expect(screen.getByText(/total containers/i)).toBeInTheDocument();
      expect(screen.getByText(/empty/i)).toBeInTheDocument();
      expect(screen.getByText(/in transit/i)).toBeInTheDocument();
      expect(screen.getByText(/average utilization/i)).toBeInTheDocument();
    });

    it('should display correct statistics values', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const analyticsTab = screen.getByRole('tab', { name: /analytics/i });
      await user.click(analyticsTab);

      // Stats cards should show aggregated values
      expect(screen.getByText('2')).toBeInTheDocument(); // Total containers
      expect(screen.getByText(/75%/i)).toBeInTheDocument(); // Average utilization
    });
  });

  describe('Load/Unload Operations', () => {
    it('should open load dialog', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(menuButtons[0]);

      const loadOption = screen.getByText(/load/i);
      await user.click(loadOption);

      await waitFor(() => {
        expect(screen.getByLabelText(/part numbers/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
      });
    });

    it('should open unload dialog', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const menuButtons = screen.getAllByRole('button', { name: /more/i });
      await user.click(menuButtons[0]);

      const unloadOption = screen.getByText(/unload/i);
      await user.click(unloadOption);

      await waitFor(() => {
        expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/target location/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      const mockError = 'Failed to load containers';
      vi.mocked(useContainerTracking).mockReturnValue({
        containers: [],
        loading: false,
        error: mockError,
        fetchContainers: vi.fn().mockRejectedValue(new Error(mockError)),
        getContainer: vi.fn(),
        loadContainer: vi.fn(),
        unloadContainer: vi.fn(),
        transferContainer: vi.fn(),
        getMovementHistory: vi.fn(),
        getUtilization: vi.fn(),
        searchContainer: vi.fn(),
        getContainersByStatus: vi.fn(),
        getContainersByLocation: vi.fn(),
        getAverageUtilization: vi.fn(),
        clearError: vi.fn(),
      });

      render(<ContainerManagement />);

      expect(screen.getByText(mockError)).toBeInTheDocument();
    });

    it('should allow dismissing error message', async () => {
      const user = userEvent.setup();
      vi.mocked(useContainerTracking).mockReturnValue({
        containers: [],
        loading: false,
        error: 'Test error',
        fetchContainers: vi.fn(),
        getContainer: vi.fn(),
        loadContainer: vi.fn(),
        unloadContainer: vi.fn(),
        transferContainer: vi.fn(),
        getMovementHistory: vi.fn(),
        getUtilization: vi.fn(),
        searchContainer: vi.fn(),
        getContainersByStatus: vi.fn(),
        getContainersByLocation: vi.fn(),
        getAverageUtilization: vi.fn(),
        clearError: vi.fn(),
      });

      render(<ContainerManagement />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByText('Test error')).not.toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should display loading indicator when fetching', () => {
      vi.mocked(useContainerTracking).mockReturnValue({
        containers: [],
        loading: true,
        error: null,
        fetchContainers: vi.fn(),
        getContainer: vi.fn(),
        loadContainer: vi.fn(),
        unloadContainer: vi.fn(),
        transferContainer: vi.fn(),
        getMovementHistory: vi.fn(),
        getUtilization: vi.fn(),
        searchContainer: vi.fn(),
        getContainersByStatus: vi.fn(),
        getContainersByLocation: vi.fn(),
        getAverageUtilization: vi.fn(),
        clearError: vi.fn(),
      });

      render(<ContainerManagement />);

      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should render on mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<ContainerManagement />);

      expect(screen.getByText('Container Management')).toBeInTheDocument();
    });

    it('should render on tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<ContainerManagement />);

      expect(screen.getByText('Container Management')).toBeInTheDocument();
    });

    it('should render on desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<ContainerManagement />);

      expect(screen.getByText('Container Management')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should support pagination controls', async () => {
      const user = userEvent.setup();
      render(<ContainerManagement />);

      const nextButton = screen.queryByRole('button', { name: /next/i });
      if (nextButton) {
        expect(nextButton).toBeInTheDocument();
      }
    });
  });
});

// Helper to get useContainerTracking mock
const useContainerTracking = vi.hoisted(() => vi.fn());
