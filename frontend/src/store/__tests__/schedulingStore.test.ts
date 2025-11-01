/**
 * Scheduling Store Tests
 * Issue #410: MaterialsStore, EquipmentStore, SchedulingStore tests
 *
 * Comprehensive test suite for SchedulingStore Zustand store
 * Coverage: Schedules, entries, constraints, state management, sequencing, dispatch, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSchedulingStore } from '../schedulingStore';
import type {
  ProductionSchedule,
  ScheduleEntry,
  ScheduleConstraint,
  ScheduleStateHistory,
  ScheduleStatistics,
  FeasibilityResult,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
  TransitionStateRequest,
} from '@/types/scheduling';

// ============================================
// MOCK DATA
// ============================================

const mockSchedule: ProductionSchedule = {
  id: 'sched-1',
  scheduleNumber: 'SCHED001',
  siteId: 'site-1',
  state: 'PLANNED',
  priority: 1,
  isLocked: false,
  isFeasible: true,
  entries: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEntry: ScheduleEntry = {
  id: 'entry-1',
  scheduleId: 'sched-1',
  workOrderId: 'wo-1',
  sequence: 1,
  status: 'SCHEDULED',
  startTime: new Date(),
  endTime: new Date(Date.now() + 3600000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockConstraint: ScheduleConstraint = {
  id: 'constraint-1',
  entryId: 'entry-1',
  constraintType: 'RESOURCE',
  description: 'Missing equipment',
  resolved: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStateHistory: ScheduleStateHistory = {
  id: 'hist-1',
  scheduleId: 'sched-1',
  previousState: 'DRAFT',
  newState: 'PLANNED',
  changedAt: new Date(),
  changedBy: 'user1',
};

const mockStatistics: ScheduleStatistics = {
  totalSchedules: 50,
  plannedSchedules: 30,
  executingSchedules: 15,
  completedSchedules: 5,
  averageOEE: 0.85,
};

const mockFeasibility: FeasibilityResult = {
  scheduleId: 'sched-1',
  isFeasible: true,
  violations: [],
  criticalPath: 3600,
};

// ============================================
// MOCK API
// ============================================

const mockSchedulingAPI = {
  schedulingAPI: {
    getAllSchedules: vi.fn(),
    getScheduleById: vi.fn(),
    getScheduleByNumber: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    deleteSchedule: vi.fn(),
    getSchedulesByState: vi.fn(),
  },
  scheduleEntryAPI: {
    getScheduleEntries: vi.fn(),
    createScheduleEntry: vi.fn(),
    updateScheduleEntry: vi.fn(),
    cancelScheduleEntry: vi.fn(),
    getEntriesReadyForDispatch: vi.fn(),
  },
  constraintAPI: {
    getEntryConstraints: vi.fn(),
    createConstraint: vi.fn(),
    updateConstraint: vi.fn(),
    resolveConstraint: vi.fn(),
    checkConstraintViolation: vi.fn(),
  },
  stateAPI: {
    transitionScheduleState: vi.fn(),
    getScheduleStateHistory: vi.fn(),
  },
  sequencingAPI: {
    applyPrioritySequencing: vi.fn(),
    applyEDDSequencing: vi.fn(),
    checkScheduleFeasibility: vi.fn(),
  },
  dispatchAPI: {
    dispatchScheduleEntry: vi.fn(),
    dispatchAllEntries: vi.fn(),
  },
  statisticsAPI: {
    getStatistics: vi.fn(),
  },
};

vi.mock('@/api/scheduling', () => ({
  schedulingAPI: mockSchedulingAPI.schedulingAPI,
  scheduleEntryAPI: mockSchedulingAPI.scheduleEntryAPI,
  constraintAPI: mockSchedulingAPI.constraintAPI,
  stateAPI: mockSchedulingAPI.stateAPI,
  sequencingAPI: mockSchedulingAPI.sequencingAPI,
  dispatchAPI: mockSchedulingAPI.dispatchAPI,
  statisticsAPI: mockSchedulingAPI.statisticsAPI,
}));

// ============================================
// TESTS
// ============================================

describe('SchedulingStore', () => {
  beforeEach(() => {
    useSchedulingStore.setState({
      schedules: [],
      isLoading: false,
      error: null,
      filters: { search: '', state: null, priority: null, siteId: null, isLocked: null, isFeasible: null },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      currentSchedule: null,
      isLoadingDetail: false,
      detailError: null,
      currentEntries: [],
      isLoadingEntries: false,
      entriesError: null,
      currentConstraints: [],
      isLoadingConstraints: false,
      constraintsError: null,
      stateHistory: [],
      isLoadingHistory: false,
      statistics: null,
      isLoadingStatistics: false,
      feasibilityResult: null,
      isLoadingFeasibility: false,
      dispatchReadyEntries: [],
      isLoadingDispatchReady: false,
    });
    vi.clearAllMocks();
  });

  // ============================================
  // LIST OPERATIONS TESTS
  // ============================================

  describe('List Operations', () => {
    it('should fetch schedules successfully', async () => {
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [mockSchedule],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchSchedules();
      });

      expect(result.current.schedules).toHaveLength(1);
      expect(result.current.schedules[0].scheduleNumber).toBe('SCHED001');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set filters and reset pagination', async () => {
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [mockSchedule],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        result.current.setFilters({ state: 'PLANNED' });
      });

      expect(result.current.filters.state).toBe('PLANNED');
      expect(result.current.pagination.page).toBe(1);
    });

    it('should clear filters and reset pagination', async () => {
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({ filters: { search: 'test', state: 'PLANNED' } });

      await act(async () => {
        result.current.clearFilters();
      });

      expect(result.current.filters.search).toBe('');
      expect(result.current.filters.state).toBeNull();
    });

    it('should set page and fetch new data', async () => {
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [mockSchedule],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        result.current.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
      expect(mockSchedulingAPI.schedulingAPI.getAllSchedules).toHaveBeenCalled();
    });

    it('should refresh schedules with current filters', async () => {
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [mockSchedule],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        result.current.setFilters({ siteId: 'site-1' });
        await result.current.refreshSchedules();
      });

      expect(mockSchedulingAPI.schedulingAPI.getAllSchedules).toHaveBeenCalled();
    });
  });

  // ============================================
  // CRUD OPERATIONS TESTS
  // ============================================

  describe('CRUD Operations', () => {
    it('should fetch schedule by ID successfully', async () => {
      mockSchedulingAPI.schedulingAPI.getScheduleById.mockResolvedValue({
        success: true,
        data: mockSchedule,
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchScheduleById('sched-1');
      });

      expect(result.current.currentSchedule).toEqual(mockSchedule);
      expect(result.current.isLoadingDetail).toBe(false);
    });

    it('should fetch schedule by number', async () => {
      mockSchedulingAPI.schedulingAPI.getScheduleByNumber.mockResolvedValue({
        success: true,
        data: mockSchedule,
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchScheduleByNumber('SCHED001');
      });

      expect(result.current.currentSchedule).toEqual(mockSchedule);
    });

    it('should create schedule successfully', async () => {
      mockSchedulingAPI.schedulingAPI.createSchedule.mockResolvedValue({
        success: true,
        data: mockSchedule,
      });
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [mockSchedule],
      });
      const { result } = renderHook(() => useSchedulingStore());

      const createData: CreateScheduleRequest = {
        siteId: 'site-1',
        priority: 1,
      };

      let created: ProductionSchedule | undefined;
      await act(async () => {
        created = await result.current.createSchedule(createData);
      });

      expect(created).toEqual(mockSchedule);
      expect(result.current.isLoading).toBe(false);
    });

    it('should update schedule successfully', async () => {
      mockSchedulingAPI.schedulingAPI.updateSchedule.mockResolvedValue({
        success: true,
        data: { ...mockSchedule, state: 'EXECUTING' },
      });
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [],
      });
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({ currentSchedule: mockSchedule });

      const updateData: UpdateScheduleRequest = {
        state: 'EXECUTING',
      };

      await act(async () => {
        await result.current.updateSchedule('sched-1', updateData);
      });

      expect(result.current.currentSchedule?.state).toBe('EXECUTING');
    });

    it('should delete schedule successfully', async () => {
      mockSchedulingAPI.schedulingAPI.deleteSchedule.mockResolvedValue(null);
      mockSchedulingAPI.schedulingAPI.getAllSchedules.mockResolvedValue({
        success: true,
        data: [],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.deleteSchedule('sched-1');
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockSchedulingAPI.schedulingAPI.deleteSchedule).toHaveBeenCalledWith('sched-1', false);
    });

    it('should fetch schedules by state', async () => {
      mockSchedulingAPI.schedulingAPI.getSchedulesByState.mockResolvedValue({
        success: true,
        data: [mockSchedule],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchSchedulesByState('PLANNED');
      });

      expect(result.current.schedules).toHaveLength(1);
    });
  });

  // ============================================
  // ENTRY OPERATIONS TESTS
  // ============================================

  describe('Entry Operations', () => {
    it('should fetch schedule entries successfully', async () => {
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchScheduleEntries('sched-1');
      });

      expect(result.current.currentEntries).toHaveLength(1);
      expect(result.current.isLoadingEntries).toBe(false);
    });

    it('should create schedule entry', async () => {
      mockSchedulingAPI.scheduleEntryAPI.createScheduleEntry.mockResolvedValue({
        success: true,
      });
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      mockSchedulingAPI.schedulingAPI.getScheduleById.mockResolvedValue({
        success: true,
        data: mockSchedule,
      });
      const { result } = renderHook(() => useSchedulingStore());

      const entryData: CreateScheduleEntryRequest = {
        workOrderId: 'wo-1',
        sequence: 1,
      };

      await act(async () => {
        await result.current.createScheduleEntry('sched-1', entryData);
      });

      expect(mockSchedulingAPI.scheduleEntryAPI.createScheduleEntry).toHaveBeenCalledWith('sched-1', entryData);
    });

    it('should update schedule entry', async () => {
      mockSchedulingAPI.scheduleEntryAPI.updateScheduleEntry.mockResolvedValue({
        success: true,
      });
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({ currentSchedule: mockSchedule });

      const updateData: UpdateScheduleEntryRequest = {
        status: 'EXECUTING',
      };

      await act(async () => {
        await result.current.updateScheduleEntry('entry-1', updateData);
      });

      expect(result.current.isLoadingEntries).toBe(false);
    });

    it('should cancel schedule entry', async () => {
      mockSchedulingAPI.scheduleEntryAPI.cancelScheduleEntry.mockResolvedValue({
        success: true,
      });
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [],
      });
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({ currentSchedule: mockSchedule });

      await act(async () => {
        await result.current.cancelScheduleEntry('entry-1', 'Machine down', 'user1');
      });

      expect(result.current.isLoadingEntries).toBe(false);
    });

    it('should fetch dispatch ready entries', async () => {
      mockSchedulingAPI.scheduleEntryAPI.getEntriesReadyForDispatch.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchDispatchReadyEntries('site-1');
      });

      expect(result.current.dispatchReadyEntries).toHaveLength(1);
      expect(result.current.isLoadingDispatchReady).toBe(false);
    });
  });

  // ============================================
  // CONSTRAINT OPERATIONS TESTS
  // ============================================

  describe('Constraint Operations', () => {
    it('should fetch entry constraints', async () => {
      mockSchedulingAPI.constraintAPI.getEntryConstraints.mockResolvedValue({
        success: true,
        data: [mockConstraint],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchEntryConstraints('entry-1');
      });

      expect(result.current.currentConstraints).toHaveLength(1);
      expect(result.current.isLoadingConstraints).toBe(false);
    });

    it('should create constraint', async () => {
      mockSchedulingAPI.constraintAPI.createConstraint.mockResolvedValue({
        success: true,
      });
      mockSchedulingAPI.constraintAPI.getEntryConstraints.mockResolvedValue({
        success: true,
        data: [mockConstraint],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.createConstraint('entry-1', { constraintType: 'RESOURCE' });
      });

      expect(result.current.currentConstraints).toHaveLength(1);
    });

    it('should update constraint', async () => {
      mockSchedulingAPI.constraintAPI.updateConstraint.mockResolvedValue({
        success: true,
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.updateConstraint('constraint-1', { description: 'Updated' });
      });

      expect(result.current.isLoadingConstraints).toBe(false);
    });

    it('should resolve constraint', async () => {
      mockSchedulingAPI.constraintAPI.resolveConstraint.mockResolvedValue({
        success: true,
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.resolveConstraint('constraint-1', 'user1', 'Equipment available');
      });

      expect(result.current.isLoadingConstraints).toBe(false);
    });
  });

  // ============================================
  // STATE MANAGEMENT TESTS
  // ============================================

  describe('State Management', () => {
    it('should transition schedule state', async () => {
      mockSchedulingAPI.stateAPI.transitionScheduleState.mockResolvedValue({
        success: true,
      });
      mockSchedulingAPI.schedulingAPI.getScheduleById.mockResolvedValue({
        success: true,
        data: { ...mockSchedule, state: 'EXECUTING' },
      });
      mockSchedulingAPI.stateAPI.getScheduleStateHistory.mockResolvedValue({
        success: true,
        data: [mockStateHistory],
      });
      const { result } = renderHook(() => useSchedulingStore());

      const transitionData: TransitionStateRequest = {
        newState: 'EXECUTING',
        changedBy: 'user1',
      };

      await act(async () => {
        await result.current.transitionScheduleState('sched-1', transitionData);
      });

      expect(result.current.isLoadingDetail).toBe(false);
    });

    it('should fetch state history', async () => {
      mockSchedulingAPI.stateAPI.getScheduleStateHistory.mockResolvedValue({
        success: true,
        data: [mockStateHistory],
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchStateHistory('sched-1');
      });

      expect(result.current.stateHistory).toHaveLength(1);
      expect(result.current.isLoadingHistory).toBe(false);
    });
  });

  // ============================================
  // SEQUENCING TESTS
  // ============================================

  describe('Sequencing Operations', () => {
    it('should apply priority sequencing', async () => {
      mockSchedulingAPI.sequencingAPI.applyPrioritySequencing.mockResolvedValue({
        success: true,
        data: { entriesAffected: 5 },
      });
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      const { result } = renderHook(() => useSchedulingStore());

      const result_promise = await act(async () => {
        return await result.current.applyPrioritySequencing('sched-1');
      });

      expect(result_promise.entriesAffected).toBe(5);
    });

    it('should apply EDD sequencing', async () => {
      mockSchedulingAPI.sequencingAPI.applyEDDSequencing.mockResolvedValue({
        success: true,
        data: { entriesAffected: 3 },
      });
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      const { result } = renderHook(() => useSchedulingStore());

      const result_promise = await act(async () => {
        return await result.current.applyEDDSequencing('sched-1');
      });

      expect(result_promise.entriesAffected).toBe(3);
    });

    it('should check schedule feasibility', async () => {
      mockSchedulingAPI.sequencingAPI.checkScheduleFeasibility.mockResolvedValue({
        success: true,
        data: mockFeasibility,
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.checkScheduleFeasibility('sched-1');
      });

      expect(result.current.feasibilityResult).toEqual(mockFeasibility);
      expect(result.current.isLoadingFeasibility).toBe(false);
    });
  });

  // ============================================
  // DISPATCH TESTS
  // ============================================

  describe('Dispatch Operations', () => {
    it('should dispatch schedule entry', async () => {
      const dispatchResult = { entry: mockEntry, workOrder: { id: 'wo-1' } };
      mockSchedulingAPI.dispatchAPI.dispatchScheduleEntry.mockResolvedValue({
        success: true,
        data: dispatchResult,
      });
      const { result } = renderHook(() => useSchedulingStore());

      const result_promise = await act(async () => {
        return await result.current.dispatchScheduleEntry('entry-1', 'user1');
      });

      expect(result_promise).toEqual(dispatchResult);
    });

    it('should dispatch all entries', async () => {
      mockSchedulingAPI.dispatchAPI.dispatchAllEntries.mockResolvedValue({
        success: true,
        data: { dispatchedCount: 5 },
      });
      mockSchedulingAPI.scheduleEntryAPI.getScheduleEntries.mockResolvedValue({
        success: true,
        data: [mockEntry],
      });
      const { result } = renderHook(() => useSchedulingStore());

      const result_promise = await act(async () => {
        return await result.current.dispatchAllEntries('sched-1', 'user1');
      });

      expect(result_promise.dispatchedCount).toBe(5);
    });
  });

  // ============================================
  // STATISTICS TESTS
  // ============================================

  describe('Statistics', () => {
    it('should fetch statistics successfully', async () => {
      mockSchedulingAPI.statisticsAPI.getStatistics.mockResolvedValue({
        success: true,
        data: mockStatistics,
      });
      const { result } = renderHook(() => useSchedulingStore());

      await act(async () => {
        await result.current.fetchStatistics();
      });

      expect(result.current.statistics).toEqual(mockStatistics);
      expect(result.current.isLoadingStatistics).toBe(false);
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('should set and clear error', () => {
      const { result } = renderHook(() => useSchedulingStore());

      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should set and clear detail error', () => {
      const { result } = renderHook(() => useSchedulingStore());

      act(() => {
        result.current.setDetailError('Detail error');
      });

      expect(result.current.detailError).toBe('Detail error');

      act(() => {
        result.current.clearDetailError();
      });

      expect(result.current.detailError).toBeNull();
    });
  });

  // ============================================
  // STATE CLEARING TESTS
  // ============================================

  describe('State Clearing', () => {
    it('should clear current schedule and related state', () => {
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({
        currentSchedule: mockSchedule,
        currentEntries: [mockEntry],
        currentConstraints: [mockConstraint],
        stateHistory: [mockStateHistory],
        feasibilityResult: mockFeasibility,
      });

      act(() => {
        result.current.clearCurrentSchedule();
      });

      expect(result.current.currentSchedule).toBeNull();
      expect(result.current.currentEntries).toHaveLength(0);
      expect(result.current.currentConstraints).toHaveLength(0);
      expect(result.current.stateHistory).toHaveLength(0);
      expect(result.current.feasibilityResult).toBeNull();
    });

    it('should clear current entries only', () => {
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({
        currentSchedule: mockSchedule,
        currentEntries: [mockEntry],
      });

      act(() => {
        result.current.clearCurrentEntries();
      });

      expect(result.current.currentEntries).toHaveLength(0);
      expect(result.current.currentSchedule).not.toBeNull();
    });

    it('should clear current constraints only', () => {
      const { result } = renderHook(() => useSchedulingStore());

      useSchedulingStore.setState({
        currentConstraints: [mockConstraint],
      });

      act(() => {
        result.current.clearCurrentConstraints();
      });

      expect(result.current.currentConstraints).toHaveLength(0);
    });
  });
});
