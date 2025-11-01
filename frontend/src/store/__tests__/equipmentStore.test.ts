/**
 * Equipment Store Tests
 * Issue #410: MaterialsStore, EquipmentStore, SchedulingStore tests
 *
 * Comprehensive test suite for EquipmentStore Zustand store
 * Coverage: Equipment, maintenance, OEE, state history, filters, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEquipmentStore } from '../equipmentStore';
import type {
  Equipment,
  MaintenanceRecord,
  EquipmentStateHistory,
  EquipmentStatistics,
  OEEMetrics,
  EquipmentQueryParams,
  MaintenanceQueryParams,
} from '@/types/equipment';

// ============================================
// MOCK DATA
// ============================================

const mockEquipment: Equipment = {
  id: 'eq-1',
  equipmentNumber: 'EQ001',
  equipmentName: 'CNC Machine',
  equipmentType: 'MACHINE',
  status: 'OPERATIONAL',
  siteId: 'site-1',
  areaId: 'area-1',
  workCenterId: 'wc-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMaintenance: MaintenanceRecord = {
  id: 'maint-1',
  equipmentId: 'eq-1',
  maintenanceType: 'PREVENTIVE',
  scheduledDate: new Date(),
  status: 'SCHEDULED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockOEE: OEEMetrics = {
  equipmentId: 'eq-1',
  availability: 0.95,
  performance: 0.92,
  quality: 0.98,
  oee: 0.86,
  period: 'DAILY',
};

const mockStateHistory: EquipmentStateHistory = {
  id: 'hist-1',
  equipmentId: 'eq-1',
  previousState: 'IDLE',
  newState: 'RUNNING',
  changedAt: new Date(),
  changedBy: 'user1',
};

const mockStatistics: EquipmentStatistics = {
  totalEquipment: 50,
  operationalCount: 45,
  downCount: 5,
  averageOEE: 0.85,
  maintenanceOverdue: 3,
};

// ============================================
// MOCK API
// ============================================

const mockEquipmentAPI = {
  equipmentAPI: {
    getAllEquipment: vi.fn(),
    getEquipmentById: vi.fn(),
    getEquipmentByNumber: vi.fn(),
    getEquipmentHierarchy: vi.fn(),
    getChildEquipment: vi.fn(),
    getEquipmentBySite: vi.fn(),
    getEquipmentByArea: vi.fn(),
    getEquipmentByWorkCenter: vi.fn(),
    getEquipmentStatistics: vi.fn(),
  },
  maintenanceAPI: {
    getAllMaintenance: vi.fn(),
    getMaintenanceById: vi.fn(),
    getMaintenanceByEquipment: vi.fn(),
    getScheduledMaintenance: vi.fn(),
    getOverdueMaintenance: vi.fn(),
    getUpcomingMaintenance: vi.fn(),
    createMaintenance: vi.fn(),
    updateMaintenance: vi.fn(),
    completeMaintenance: vi.fn(),
    cancelMaintenance: vi.fn(),
  },
  oeeAPI: {
    getOEEMetrics: vi.fn(),
    getOEEHistory: vi.fn(),
    getOEESummary: vi.fn(),
  },
  equipmentStateAPI: {
    getStateHistory: vi.fn(),
    updateEquipmentState: vi.fn(),
  },
  getEquipmentDashboard: vi.fn(),
  getMaintenanceCalendar: vi.fn(),
};

vi.mock('@/api/equipment', () => ({
  equipmentAPI: mockEquipmentAPI.equipmentAPI,
  maintenanceAPI: mockEquipmentAPI.maintenanceAPI,
  oeeAPI: mockEquipmentAPI.oeeAPI,
  equipmentStateAPI: mockEquipmentAPI.equipmentStateAPI,
  getEquipmentDashboard: mockEquipmentAPI.getEquipmentDashboard,
  getMaintenanceCalendar: mockEquipmentAPI.getMaintenanceCalendar,
}));

// ============================================
// TESTS
// ============================================

describe('EquipmentStore', () => {
  beforeEach(() => {
    useEquipmentStore.setState({
      equipment: [],
      currentEquipment: null,
      equipmentLoading: false,
      equipmentError: null,
      maintenanceRecords: [],
      currentMaintenance: null,
      maintenanceLoading: false,
      maintenanceError: null,
      oeeMetrics: null,
      oeeHistory: [],
      oeeSummary: [],
      oeeLoading: false,
      oeeError: null,
      stateHistory: [],
      stateHistoryLoading: false,
      stateHistoryError: null,
      statistics: null,
      statisticsLoading: false,
      statisticsError: null,
      upcomingMaintenance: [],
      overdueMaintenance: [],
      criticalEquipment: [],
      equipmentFilters: {},
      maintenanceFilters: {},
      searchText: '',
    });
    vi.clearAllMocks();
  });

  // ============================================
  // EQUIPMENT TESTS
  // ============================================

  describe('Equipment Management', () => {
    it('should fetch all equipment successfully', async () => {
      mockEquipmentAPI.equipmentAPI.getAllEquipment.mockResolvedValue({
        success: true,
        data: [mockEquipment],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipment();
      });

      expect(result.current.equipment).toHaveLength(1);
      expect(result.current.equipment[0].equipmentNumber).toBe('EQ001');
      expect(result.current.equipmentLoading).toBe(false);
    });

    it('should fetch equipment by ID', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentById.mockResolvedValue({
        success: true,
        data: mockEquipment,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipmentById('eq-1');
      });

      expect(result.current.currentEquipment).toEqual(mockEquipment);
      expect(result.current.equipmentLoading).toBe(false);
    });

    it('should fetch equipment by number', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentByNumber.mockResolvedValue({
        success: true,
        data: mockEquipment,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipmentByNumber('EQ001');
      });

      expect(result.current.currentEquipment).toEqual(mockEquipment);
    });

    it('should fetch equipment hierarchy', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentHierarchy.mockResolvedValue({
        success: true,
        data: [mockEquipment],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipmentHierarchy('eq-1');
      });

      expect(result.current.equipment).toHaveLength(1);
    });

    it('should fetch child equipment', async () => {
      mockEquipmentAPI.equipmentAPI.getChildEquipment.mockResolvedValue({
        success: true,
        data: [mockEquipment],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchChildEquipment('eq-1');
      });

      expect(result.current.equipment).toHaveLength(1);
    });

    it('should fetch equipment by site', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentBySite.mockResolvedValue({
        success: true,
        data: [mockEquipment],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipmentBySite('site-1');
      });

      expect(result.current.equipment).toHaveLength(1);
    });

    it('should fetch equipment by area', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentByArea.mockResolvedValue({
        success: true,
        data: [mockEquipment],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipmentByArea('area-1');
      });

      expect(result.current.equipment).toHaveLength(1);
    });

    it('should fetch equipment by work center', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentByWorkCenter.mockResolvedValue({
        success: true,
        data: [mockEquipment],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchEquipmentByWorkCenter('wc-1');
      });

      expect(result.current.equipment).toHaveLength(1);
    });

    it('should set and clear equipment filters', () => {
      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.setEquipmentFilters({ status: 'OPERATIONAL' });
      });

      expect(result.current.equipmentFilters.status).toBe('OPERATIONAL');

      act(() => {
        result.current.clearEquipmentFilters();
      });

      expect(result.current.equipmentFilters).toEqual({});
    });
  });

  // ============================================
  // MAINTENANCE TESTS
  // ============================================

  describe('Maintenance Management', () => {
    it('should fetch all maintenance records successfully', async () => {
      mockEquipmentAPI.maintenanceAPI.getAllMaintenance.mockResolvedValue({
        success: true,
        data: [mockMaintenance],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchMaintenance();
      });

      expect(result.current.maintenanceRecords).toHaveLength(1);
      expect(result.current.maintenanceLoading).toBe(false);
    });

    it('should fetch maintenance by ID', async () => {
      mockEquipmentAPI.maintenanceAPI.getMaintenanceById.mockResolvedValue({
        success: true,
        data: mockMaintenance,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchMaintenanceById('maint-1');
      });

      expect(result.current.currentMaintenance).toEqual(mockMaintenance);
    });

    it('should fetch maintenance by equipment', async () => {
      mockEquipmentAPI.maintenanceAPI.getMaintenanceByEquipment.mockResolvedValue({
        success: true,
        data: [mockMaintenance],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchMaintenanceByEquipment('eq-1');
      });

      expect(result.current.maintenanceRecords).toHaveLength(1);
    });

    it('should fetch scheduled maintenance', async () => {
      mockEquipmentAPI.maintenanceAPI.getScheduledMaintenance.mockResolvedValue({
        success: true,
        data: [mockMaintenance],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchScheduledMaintenance();
      });

      expect(result.current.maintenanceRecords).toHaveLength(1);
    });

    it('should fetch overdue maintenance', async () => {
      mockEquipmentAPI.maintenanceAPI.getOverdueMaintenance.mockResolvedValue({
        success: true,
        data: [mockMaintenance],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchOverdueMaintenance();
      });

      expect(result.current.overdueMaintenance).toHaveLength(1);
      expect(result.current.maintenanceLoading).toBe(false);
    });

    it('should fetch upcoming maintenance', async () => {
      mockEquipmentAPI.maintenanceAPI.getUpcomingMaintenance.mockResolvedValue({
        success: true,
        data: [mockMaintenance],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchUpcomingMaintenance(30);
      });

      expect(result.current.upcomingMaintenance).toHaveLength(1);
    });

    it('should create maintenance record', async () => {
      mockEquipmentAPI.maintenanceAPI.createMaintenance.mockResolvedValue({
        success: true,
        data: mockMaintenance,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.createMaintenance({ equipmentId: 'eq-1' });
      });

      expect(result.current.maintenanceRecords).toHaveLength(1);
      expect(result.current.maintenanceLoading).toBe(false);
    });

    it('should update maintenance record', async () => {
      const updated = { ...mockMaintenance, status: 'COMPLETED' as const };
      mockEquipmentAPI.maintenanceAPI.updateMaintenance.mockResolvedValue({
        success: true,
        data: updated,
      });
      const { result } = renderHook(() => useEquipmentStore());

      useEquipmentStore.setState({ maintenanceRecords: [mockMaintenance] });

      await act(async () => {
        await result.current.updateMaintenance('maint-1', { status: 'COMPLETED' });
      });

      expect(result.current.maintenanceRecords[0].status).toBe('COMPLETED');
    });

    it('should complete maintenance record', async () => {
      const completed = { ...mockMaintenance, status: 'COMPLETED' as const };
      mockEquipmentAPI.maintenanceAPI.completeMaintenance.mockResolvedValue({
        success: true,
        data: completed,
      });
      const { result } = renderHook(() => useEquipmentStore());

      useEquipmentStore.setState({ maintenanceRecords: [mockMaintenance] });

      await act(async () => {
        await result.current.completeMaintenance('maint-1', {
          completedDate: new Date().toISOString(),
          performedBy: 'user1',
        });
      });

      expect(result.current.maintenanceRecords[0].status).toBe('COMPLETED');
    });

    it('should cancel maintenance record', async () => {
      const cancelled = { ...mockMaintenance, status: 'CANCELLED' as const };
      mockEquipmentAPI.maintenanceAPI.cancelMaintenance.mockResolvedValue({
        success: true,
        data: cancelled,
      });
      const { result } = renderHook(() => useEquipmentStore());

      useEquipmentStore.setState({ maintenanceRecords: [mockMaintenance] });

      await act(async () => {
        await result.current.cancelMaintenance('maint-1', 'No longer needed');
      });

      expect(result.current.maintenanceRecords[0].status).toBe('CANCELLED');
    });

    it('should set and clear maintenance filters', () => {
      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.setMaintenanceFilters({ maintenanceType: 'PREVENTIVE' });
      });

      expect(result.current.maintenanceFilters.maintenanceType).toBe('PREVENTIVE');

      act(() => {
        result.current.clearMaintenanceFilters();
      });

      expect(result.current.maintenanceFilters).toEqual({});
    });
  });

  // ============================================
  // OEE TESTS
  // ============================================

  describe('OEE Metrics', () => {
    it('should fetch OEE metrics successfully', async () => {
      mockEquipmentAPI.oeeAPI.getOEEMetrics.mockResolvedValue({
        success: true,
        data: mockOEE,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchOEEMetrics('eq-1');
      });

      expect(result.current.oeeMetrics).toEqual(mockOEE);
      expect(result.current.oeeLoading).toBe(false);
    });

    it('should fetch OEE history', async () => {
      mockEquipmentAPI.oeeAPI.getOEEHistory.mockResolvedValue({
        success: true,
        data: [mockOEE],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchOEEHistory('eq-1');
      });

      expect(result.current.oeeHistory).toHaveLength(1);
    });

    it('should fetch OEE summary', async () => {
      const summary = [{ equipmentId: 'eq-1', equipmentNumber: 'EQ001', equipmentName: 'CNC', oee: mockOEE }];
      mockEquipmentAPI.oeeAPI.getOEESummary.mockResolvedValue({
        success: true,
        data: summary,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchOEESummary();
      });

      expect(result.current.oeeSummary).toHaveLength(1);
    });
  });

  // ============================================
  // STATE HISTORY TESTS
  // ============================================

  describe('State History', () => {
    it('should fetch state history successfully', async () => {
      mockEquipmentAPI.equipmentStateAPI.getStateHistory.mockResolvedValue({
        success: true,
        data: [mockStateHistory],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchStateHistory('eq-1');
      });

      expect(result.current.stateHistory).toHaveLength(1);
      expect(result.current.stateHistoryLoading).toBe(false);
    });

    it('should update equipment state', async () => {
      const updated = { ...mockEquipment, status: 'MAINTENANCE' };
      mockEquipmentAPI.equipmentStateAPI.updateEquipmentState.mockResolvedValue({
        success: true,
        data: updated,
      });
      const { result } = renderHook(() => useEquipmentStore());

      useEquipmentStore.setState({ equipment: [mockEquipment] });

      await act(async () => {
        await result.current.updateEquipmentState('eq-1', { newState: 'MAINTENANCE' });
      });

      expect(result.current.currentEquipment?.status).toBe('MAINTENANCE');
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    it('should fetch statistics successfully', async () => {
      mockEquipmentAPI.equipmentAPI.getEquipmentStatistics.mockResolvedValue({
        success: true,
        data: mockStatistics,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchStatistics();
      });

      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.statisticsLoading).toBe(false);
    });
  });

  // ============================================
  // DASHBOARD TESTS
  // ============================================

  describe('Dashboard', () => {
    it('should fetch dashboard data successfully', async () => {
      const dashboardData = {
        statistics: mockStatistics,
        upcomingMaintenance: [mockMaintenance],
        overdueMaintenance: [mockMaintenance],
        criticalEquipment: [mockEquipment],
      };

      mockEquipmentAPI.getEquipmentDashboard.mockResolvedValue({
        success: true,
        data: dashboardData,
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchDashboard();
      });

      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.upcomingMaintenance).toHaveLength(1);
      expect(result.current.overdueMaintenance).toHaveLength(1);
      expect(result.current.criticalEquipment).toHaveLength(1);
    });

    it('should fetch maintenance calendar', async () => {
      mockEquipmentAPI.getMaintenanceCalendar.mockResolvedValue({
        success: true,
        data: [mockMaintenance],
      });
      const { result } = renderHook(() => useEquipmentStore());

      await act(async () => {
        await result.current.fetchMaintenanceCalendar('2024-01-01', '2024-12-31');
      });

      expect(result.current.maintenanceRecords).toHaveLength(1);
    });
  });

  // ============================================
  // SEARCH TESTS
  // ============================================

  describe('Search', () => {
    it('should set search text', () => {
      const { result } = renderHook(() => useEquipmentStore());

      act(() => {
        result.current.setSearchText('CNC');
      });

      expect(result.current.searchText).toBe('CNC');
    });
  });

  // ============================================
  // UTILITY TESTS
  // ============================================

  describe('Utility', () => {
    it('should clear all errors', () => {
      const { result } = renderHook(() => useEquipmentStore());

      useEquipmentStore.setState({
        equipmentError: 'Eq error',
        maintenanceError: 'Maint error',
        oeeError: 'OEE error',
        stateHistoryError: 'State error',
        statisticsError: 'Stats error',
      });

      act(() => {
        result.current.clearErrors();
      });

      expect(result.current.equipmentError).toBeNull();
      expect(result.current.maintenanceError).toBeNull();
      expect(result.current.oeeError).toBeNull();
      expect(result.current.stateHistoryError).toBeNull();
      expect(result.current.statisticsError).toBeNull();
    });

    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useEquipmentStore());

      useEquipmentStore.setState({
        equipment: [mockEquipment],
        maintenanceRecords: [mockMaintenance],
        searchText: 'test',
      });

      expect(result.current.equipment).toHaveLength(1);

      act(() => {
        result.current.reset();
      });

      expect(result.current.equipment).toHaveLength(0);
      expect(result.current.maintenanceRecords).toHaveLength(0);
      expect(result.current.searchText).toBe('');
    });
  });
});
