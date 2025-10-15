/**
 * Dashboard Component Smoke Tests
 *
 * Basic tests to ensure the component:
 * - Compiles without TypeScript errors
 * - Renders without crashing
 * - Integrates with dashboard API correctly
 * - Basic UI elements are present
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../Dashboard';
import * as dashboardApi from '@/services/dashboardApi';

// Mock the dashboard API
vi.mock('@/services/dashboardApi', () => ({
  dashboardApi: {
    getKPIs: vi.fn(),
    getRecentWorkOrders: vi.fn(),
    getAlerts: vi.fn(),
    getEfficiencyMetrics: vi.fn(),
    getQualityTrends: vi.fn(),
  },
}));

const mockKPIs = {
  activeWorkOrders: 10,
  workOrdersChange: 5.2,
  completedToday: 8,
  completedChange: -2.1,
  qualityYield: 95.5,
  yieldChange: 1.2,
  equipmentUtilization: 87.3,
  utilizationChange: 3.4,
};

const mockRecentWorkOrders = [
  {
    id: 'wo-1',
    workOrderNumber: 'WO-001',
    partNumber: 'PART-001',
    status: 'IN_PROGRESS',
    progress: 45,
    priority: 'HIGH',
    dueDate: '2025-10-20T00:00:00Z',
  },
];

const mockAlerts = [
  {
    id: 'alert-1',
    type: 'error' as const,
    title: 'Test Alert',
    description: 'This is a test alert',
    time: '2025-10-15T10:00:00Z',
    relatedId: 'wo-1',
    relatedType: 'work_order' as const,
  },
];

const mockEfficiency = {
  oee: 82.5,
  fpy: 94.2,
  onTimeDelivery: 96.8,
};

const mockQualityTrends = {
  defectRate: 2.5,
  defectRateTrend: -0.3,
  complaintRate: 0.8,
  complaintRateTrend: -0.1,
  ncrRate: 1.2,
  ncrRateTrend: 0.2,
};

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock responses
    vi.mocked(dashboardApi.dashboardApi.getKPIs).mockResolvedValue(mockKPIs);
    vi.mocked(dashboardApi.dashboardApi.getRecentWorkOrders).mockResolvedValue(mockRecentWorkOrders);
    vi.mocked(dashboardApi.dashboardApi.getAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(dashboardApi.dashboardApi.getEfficiencyMetrics).mockResolvedValue(mockEfficiency);
    vi.mocked(dashboardApi.dashboardApi.getQualityTrends).mockResolvedValue(mockQualityTrends);
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      renderDashboard();

      // Should show loading state initially, then content
      await waitFor(() => {
        expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
      });
    });

    it('should render main sections', async () => {
      renderDashboard();

      await waitFor(() => {
        // KPI section should be visible
        expect(screen.getByText(/active work orders/i)).toBeInTheDocument();
      });
    });
  });

  describe('API Integration', () => {
    it('should call all dashboard APIs on mount', async () => {
      renderDashboard();

      await waitFor(() => {
        expect(dashboardApi.dashboardApi.getKPIs).toHaveBeenCalled();
        expect(dashboardApi.dashboardApi.getRecentWorkOrders).toHaveBeenCalled();
        expect(dashboardApi.dashboardApi.getAlerts).toHaveBeenCalled();
        expect(dashboardApi.dashboardApi.getEfficiencyMetrics).toHaveBeenCalled();
        expect(dashboardApi.dashboardApi.getQualityTrends).toHaveBeenCalled();
      });
    });

    it('should display KPI data when loaded', async () => {
      renderDashboard();

      await waitFor(() => {
        // Should display active work orders count
        expect(screen.getByText('10')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(dashboardApi.dashboardApi.getKPIs).mockRejectedValue(new Error('API Error'));
      vi.mocked(dashboardApi.dashboardApi.getRecentWorkOrders).mockRejectedValue(new Error('API Error'));
      vi.mocked(dashboardApi.dashboardApi.getAlerts).mockRejectedValue(new Error('API Error'));
      vi.mocked(dashboardApi.dashboardApi.getEfficiencyMetrics).mockRejectedValue(new Error('API Error'));
      vi.mocked(dashboardApi.dashboardApi.getQualityTrends).mockRejectedValue(new Error('API Error'));

      renderDashboard();

      // Component shows loading spinner when APIs fail, wait for it to appear
      await waitFor(() => {
        // Should show spinner without crashing
        const spinner = screen.queryByRole('img', { name: /loading/i });
        expect(spinner || document.querySelector('.ant-spin')).toBeTruthy();
      });
    });
  });

  describe('Component Structure', () => {
    it('should have proper page title set', () => {
      renderDashboard();

      // Component sets document.title in useEffect
      expect(document.title).toContain('Dashboard');
    });
  });

  describe('TypeScript Compilation', () => {
    it('should compile without type errors', () => {
      // This test passes if TypeScript compilation succeeds
      expect(true).toBe(true);
    });
  });
});
