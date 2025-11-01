/**
 * Routing Store Tests
 * Issue #408: RoutingStore & OperationStore tests
 *
 * Comprehensive test suite for RoutingStore Zustand store
 * Coverage: List operations, CRUD, lifecycle, steps, dependencies, version conflicts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRoutingStore } from '../routingStore';
import { VersionConflictError } from '@/api/routing';
import type {
  Routing,
  RoutingStep,
  PartSiteAvailability,
  RoutingQueryParams,
  CreateRoutingRequest,
  UpdateRoutingRequest,
  CreateRoutingStepRequest,
  UpdateRoutingStepRequest,
  CreateStepDependencyRequest,
  CopyRoutingRequest,
  ApproveRoutingRequest,
  ResequenceStepsRequest,
} from '@/types/routing';

// ============================================
// MOCK DATA
// ============================================

const mockRouting: Routing = {
  id: 'routing-1',
  partId: 'part-1',
  siteId: 'site-1',
  version: 1,
  lifecycleState: 'DRAFT',
  isActive: false,
  isPrimaryRoute: true,
  steps: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRoutingStep: RoutingStep = {
  id: 'step-1',
  routingId: 'routing-1',
  sequence: 1,
  operationCode: 'OP001',
  description: 'Test operation',
  setupTime: 10,
  cycleTime: 20,
  teardownTime: 5,
  workCenterId: 'wc-1',
};

const mockPartSiteAvailability: PartSiteAvailability = {
  id: 'psa-1',
  partId: 'part-1',
  siteId: 'site-1',
  isAvailable: true,
};

const mockListResponse = {
  success: true,
  data: [mockRouting],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

const mockDetailResponse = {
  success: true,
  data: mockRouting,
};

// ============================================
// MOCK API
// ============================================

const mockRoutingAPI = {
  getAllRoutings: vi.fn(),
  getRoutingById: vi.fn(),
  createRouting: vi.fn(),
  updateRouting: vi.fn(),
  deleteRouting: vi.fn(),
  copyRouting: vi.fn(),
  approveRouting: vi.fn(),
  activateRouting: vi.fn(),
  obsoleteRouting: vi.fn(),
  calculateRoutingTiming: vi.fn(),
  validateRouting: vi.fn(),
};

const mockRoutingStepAPI = {
  getRoutingSteps: vi.fn(),
  createRoutingStep: vi.fn(),
  updateRoutingStep: vi.fn(),
  deleteRoutingStep: vi.fn(),
  resequenceSteps: vi.fn(),
};

const mockStepDependencyAPI = {
  createStepDependency: vi.fn(),
  deleteStepDependency: vi.fn(),
};

const mockPartSiteAvailabilityAPI = {
  getPartAvailableSites: vi.fn(),
};

vi.mock('@/api/routing', () => ({
  routingAPI: mockRoutingAPI,
  routingStepAPI: mockRoutingStepAPI,
  stepDependencyAPI: mockStepDependencyAPI,
  partSiteAvailabilityAPI: mockPartSiteAvailabilityAPI,
  VersionConflictError: class VersionConflictError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'VersionConflictError';
    }
  },
}));

// ============================================
// TESTS
// ============================================

describe('RoutingStore', () => {
  beforeEach(() => {
    // Reset store state
    useRoutingStore.setState({
      routings: [],
      isLoading: false,
      error: null,
      filters: {
        search: '',
        siteId: null,
        partId: null,
        lifecycleState: null,
        isActive: null,
        isPrimaryRoute: null,
      },
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      currentRouting: null,
      isLoadingDetail: false,
      detailError: null,
      currentSteps: [],
      isLoadingSteps: false,
      stepsError: null,
      availableSites: [],
      isLoadingAvailability: false,
      routingTiming: null,
      validationResult: null,
      versionConflict: null,
    });

    // Clear all mocks
    vi.clearAllMocks();
  });

  // ============================================
  // LIST OPERATIONS TESTS
  // ============================================

  describe('List Operations', () => {
    it('should fetch routings successfully', async () => {
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.fetchRoutings();
      });

      expect(result.current.routings).toHaveLength(1);
      expect(result.current.routings[0].id).toBe('routing-1');
      expect(result.current.isLoading).toBe(false);
      expect(mockRoutingAPI.getAllRoutings).toHaveBeenCalled();
    });

    it('should handle fetch routing error', async () => {
      const error = new Error('Network error');
      mockRoutingAPI.getAllRoutings.mockRejectedValue(error);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        try {
          await result.current.fetchRoutings();
        } catch {
          // Expected
        }
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });

    it('should set filters and reset pagination', async () => {
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        result.current.setFilters({ siteId: 'site-1', partId: 'part-1' });
      });

      expect(result.current.filters.siteId).toBe('site-1');
      expect(result.current.filters.partId).toBe('part-1');
      expect(result.current.pagination.page).toBe(1);
    });

    it('should clear filters and reset pagination', async () => {
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        result.current.setFilters({ siteId: 'site-1' });
      });

      expect(result.current.filters.siteId).toBe('site-1');

      await act(async () => {
        result.current.clearFilters();
      });

      expect(result.current.filters.siteId).toBeNull();
      expect(result.current.filters.partId).toBeNull();
      expect(result.current.pagination.page).toBe(1);
    });

    it('should set page and fetch new data', async () => {
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        result.current.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
      expect(mockRoutingAPI.getAllRoutings).toHaveBeenCalled();
    });

    it('should refresh routings with current filters', async () => {
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        result.current.setFilters({ siteId: 'site-1' });
        await result.current.refreshRoutings();
      });

      expect(mockRoutingAPI.getAllRoutings).toHaveBeenCalledWith(
        expect.objectContaining({
          siteId: 'site-1',
        })
      );
    });
  });

  // ============================================
  // CRUD OPERATIONS TESTS
  // ============================================

  describe('CRUD Operations', () => {
    it('should fetch routing by ID successfully', async () => {
      mockRoutingAPI.getRoutingById.mockResolvedValue(mockDetailResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.fetchRoutingById('routing-1');
      });

      expect(result.current.currentRouting).toEqual(mockRouting);
      expect(result.current.isLoadingDetail).toBe(false);
      expect(mockRoutingAPI.getRoutingById).toHaveBeenCalledWith('routing-1', true);
    });

    it('should handle fetch routing detail error', async () => {
      const error = new Error('Not found');
      mockRoutingAPI.getRoutingById.mockRejectedValue(error);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        try {
          await result.current.fetchRoutingById('invalid-id');
        } catch {
          // Expected
        }
      });

      expect(result.current.detailError).toBe('Not found');
      expect(result.current.isLoadingDetail).toBe(false);
    });

    it('should create routing successfully', async () => {
      mockRoutingAPI.createRouting.mockResolvedValue(mockDetailResponse);
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      const createData: CreateRoutingRequest = {
        partId: 'part-1',
        siteId: 'site-1',
        isPrimaryRoute: true,
      };

      let createdRouting: Routing | undefined;
      await act(async () => {
        createdRouting = await result.current.createRouting(createData);
      });

      expect(createdRouting).toEqual(mockRouting);
      expect(result.current.isLoading).toBe(false);
      expect(mockRoutingAPI.createRouting).toHaveBeenCalledWith(createData);
    });

    it('should update routing successfully', async () => {
      const updatedRouting = { ...mockRouting, version: 2, lifecycleState: 'APPROVED' as const };
      mockRoutingAPI.updateRouting.mockResolvedValue({
        success: true,
        data: updatedRouting,
      });
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({ currentRouting: mockRouting });

      const updateData: UpdateRoutingRequest = {
        lifecycleState: 'APPROVED',
      };

      await act(async () => {
        await result.current.updateRouting('routing-1', updateData);
      });

      expect(result.current.currentRouting?.version).toBe(2);
      expect(mockRoutingAPI.updateRouting).toHaveBeenCalled();
    });

    it('should handle version conflict during update', async () => {
      const conflictError = new VersionConflictError('Version mismatch');
      mockRoutingAPI.updateRouting.mockRejectedValue(conflictError);
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({ currentRouting: mockRouting });

      const updateData: UpdateRoutingRequest = {
        lifecycleState: 'APPROVED',
      };

      await act(async () => {
        try {
          await result.current.updateRouting('routing-1', updateData);
        } catch {
          // Expected
        }
      });

      expect(result.current.versionConflict).not.toBeNull();
      expect(result.current.versionConflict?.attemptedChanges).toEqual(updateData);
    });

    it('should delete routing successfully', async () => {
      mockRoutingAPI.deleteRouting.mockResolvedValue(null);
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.deleteRouting('routing-1');
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockRoutingAPI.deleteRouting).toHaveBeenCalledWith('routing-1');
    });

    it('should copy routing successfully', async () => {
      mockRoutingAPI.copyRouting.mockResolvedValue(mockDetailResponse);
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      const copyData: CopyRoutingRequest = {
        newPartId: 'part-2',
      };

      let copiedRouting: Routing | undefined;
      await act(async () => {
        copiedRouting = await result.current.copyRouting('routing-1', copyData);
      });

      expect(copiedRouting).toEqual(mockRouting);
      expect(mockRoutingAPI.copyRouting).toHaveBeenCalledWith('routing-1', copyData);
    });
  });

  // ============================================
  // LIFECYCLE OPERATIONS TESTS
  // ============================================

  describe('Lifecycle Operations', () => {
    it('should approve routing successfully', async () => {
      const approvedRouting = { ...mockRouting, lifecycleState: 'APPROVED' as const };
      mockRoutingAPI.approveRouting.mockResolvedValue({
        success: true,
        data: approvedRouting,
      });
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      const approveData: ApproveRoutingRequest = {
        routingId: 'routing-1',
        approverComments: 'Looks good',
      };

      await act(async () => {
        await result.current.approveRouting(approveData);
      });

      expect(result.current.currentRouting?.lifecycleState).toBe('APPROVED');
    });

    it('should activate routing successfully', async () => {
      const activeRouting = { ...mockRouting, isActive: true };
      mockRoutingAPI.activateRouting.mockResolvedValue({
        success: true,
        data: activeRouting,
      });
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.activateRouting('routing-1');
      });

      expect(result.current.currentRouting?.isActive).toBe(true);
    });

    it('should obsolete routing successfully', async () => {
      const obsoleteRouting = { ...mockRouting, lifecycleState: 'OBSOLETE' as const };
      mockRoutingAPI.obsoleteRouting.mockResolvedValue({
        success: true,
        data: obsoleteRouting,
      });
      mockRoutingAPI.getAllRoutings.mockResolvedValue(mockListResponse);
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.obsoleteRouting('routing-1');
      });

      expect(result.current.currentRouting?.lifecycleState).toBe('OBSOLETE');
    });
  });

  // ============================================
  // STEP OPERATIONS TESTS
  // ============================================

  describe('Step Operations', () => {
    it('should fetch routing steps successfully', async () => {
      mockRoutingStepAPI.getRoutingSteps.mockResolvedValue({
        success: true,
        data: [mockRoutingStep],
      });
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.fetchRoutingSteps('routing-1');
      });

      expect(result.current.currentSteps).toHaveLength(1);
      expect(result.current.currentSteps[0].id).toBe('step-1');
      expect(result.current.isLoadingSteps).toBe(false);
    });

    it('should create routing step successfully', async () => {
      mockRoutingStepAPI.createRoutingStep.mockResolvedValue({ success: true });
      mockRoutingStepAPI.getRoutingSteps.mockResolvedValue({
        success: true,
        data: [mockRoutingStep],
      });
      mockRoutingAPI.getRoutingById.mockResolvedValue(mockDetailResponse);
      const { result } = renderHook(() => useRoutingStore());

      const stepData: CreateRoutingStepRequest = {
        sequence: 1,
        operationCode: 'OP001',
        description: 'Test operation',
        setupTime: 10,
        cycleTime: 20,
        teardownTime: 5,
      };

      useRoutingStore.setState({ currentRouting: mockRouting });

      await act(async () => {
        await result.current.createRoutingStep('routing-1', stepData);
      });

      expect(mockRoutingStepAPI.createRoutingStep).toHaveBeenCalledWith('routing-1', stepData);
      expect(result.current.currentSteps).toHaveLength(1);
    });

    it('should update routing step successfully', async () => {
      mockRoutingStepAPI.updateRoutingStep.mockResolvedValue({ success: true });
      mockRoutingStepAPI.getRoutingSteps.mockResolvedValue({
        success: true,
        data: [{ ...mockRoutingStep, description: 'Updated' }],
      });
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({ currentRouting: mockRouting });

      const stepData: UpdateRoutingStepRequest = {
        description: 'Updated',
      };

      await act(async () => {
        await result.current.updateRoutingStep('step-1', stepData);
      });

      expect(mockRoutingStepAPI.updateRoutingStep).toHaveBeenCalledWith('step-1', stepData);
    });

    it('should delete routing step successfully', async () => {
      mockRoutingStepAPI.deleteRoutingStep.mockResolvedValue({ success: true });
      mockRoutingStepAPI.getRoutingSteps.mockResolvedValue({
        success: true,
        data: [],
      });
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({ currentRouting: mockRouting });

      await act(async () => {
        await result.current.deleteRoutingStep('step-1');
      });

      expect(mockRoutingStepAPI.deleteRoutingStep).toHaveBeenCalledWith('step-1');
      expect(result.current.currentSteps).toHaveLength(0);
    });

    it('should resequence steps successfully', async () => {
      const resequencedSteps = [
        { ...mockRoutingStep, sequence: 2 },
        { ...mockRoutingStep, id: 'step-2', sequence: 1 },
      ];
      mockRoutingStepAPI.resequenceSteps.mockResolvedValue({
        success: true,
        data: resequencedSteps,
      });
      const { result } = renderHook(() => useRoutingStore());

      const resequenceData: ResequenceStepsRequest = {
        routingId: 'routing-1',
        stepSequences: [
          { stepId: 'step-2', sequence: 1 },
          { stepId: 'step-1', sequence: 2 },
        ],
      };

      await act(async () => {
        await result.current.resequenceSteps(resequenceData);
      });

      expect(result.current.currentSteps).toHaveLength(2);
      expect(mockRoutingStepAPI.resequenceSteps).toHaveBeenCalledWith(resequenceData);
    });

    it('should handle step operation error', async () => {
      const error = new Error('Step operation failed');
      mockRoutingStepAPI.createRoutingStep.mockRejectedValue(error);
      const { result } = renderHook(() => useRoutingStore());

      const stepData: CreateRoutingStepRequest = {
        sequence: 1,
        operationCode: 'OP001',
        description: 'Test operation',
        setupTime: 10,
        cycleTime: 20,
        teardownTime: 5,
      };

      await act(async () => {
        try {
          await result.current.createRoutingStep('routing-1', stepData);
        } catch {
          // Expected
        }
      });

      expect(result.current.stepsError).toBe('Step operation failed');
      expect(result.current.isLoadingSteps).toBe(false);
    });
  });

  // ============================================
  // DEPENDENCY OPERATIONS TESTS
  // ============================================

  describe('Dependency Operations', () => {
    it('should create step dependency successfully', async () => {
      mockStepDependencyAPI.createStepDependency.mockResolvedValue({ success: true });
      mockRoutingStepAPI.getRoutingSteps.mockResolvedValue({
        success: true,
        data: [mockRoutingStep],
      });
      const { result } = renderHook(() => useRoutingStore());

      const depData: CreateStepDependencyRequest = {
        precedingStepId: 'step-1',
        dependentStepId: 'step-2',
      };

      useRoutingStore.setState({ currentRouting: mockRouting });

      await act(async () => {
        await result.current.createStepDependency(depData);
      });

      expect(mockStepDependencyAPI.createStepDependency).toHaveBeenCalledWith(depData);
    });

    it('should delete step dependency successfully', async () => {
      mockStepDependencyAPI.deleteStepDependency.mockResolvedValue({ success: true });
      mockRoutingStepAPI.getRoutingSteps.mockResolvedValue({
        success: true,
        data: [mockRoutingStep],
      });
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({ currentRouting: mockRouting });

      await act(async () => {
        await result.current.deleteStepDependency('dep-1');
      });

      expect(mockStepDependencyAPI.deleteStepDependency).toHaveBeenCalledWith('dep-1');
    });
  });

  // ============================================
  // PART SITE AVAILABILITY TESTS
  // ============================================

  describe('Part Site Availability', () => {
    it('should fetch part available sites successfully', async () => {
      mockPartSiteAvailabilityAPI.getPartAvailableSites.mockResolvedValue({
        success: true,
        data: [mockPartSiteAvailability],
      });
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.fetchPartAvailableSites('part-1');
      });

      expect(result.current.availableSites).toHaveLength(1);
      expect(result.current.availableSites[0].siteId).toBe('site-1');
      expect(result.current.isLoadingAvailability).toBe(false);
    });
  });

  // ============================================
  // TIMING & VALIDATION TESTS
  // ============================================

  describe('Timing & Validation', () => {
    it('should calculate routing timing successfully', async () => {
      const timingData = {
        totalSetupTime: 10,
        totalCycleTime: 20,
        totalTeardownTime: 5,
        totalTime: 35,
        criticalPathTime: 20,
      };
      mockRoutingAPI.calculateRoutingTiming.mockResolvedValue({
        success: true,
        data: timingData,
      });
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.calculateRoutingTiming('routing-1');
      });

      expect(result.current.routingTiming).toEqual(timingData);
    });

    it('should validate routing successfully', async () => {
      const validationResult = {
        isValid: true,
        errors: [],
      };
      mockRoutingAPI.validateRouting.mockResolvedValue({
        success: true,
        data: validationResult,
      });
      const { result } = renderHook(() => useRoutingStore());

      await act(async () => {
        await result.current.validateRouting('routing-1');
      });

      expect(result.current.validationResult).toEqual(validationResult);
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    it('should set and clear error', () => {
      const { result } = renderHook(() => useRoutingStore());

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
      const { result } = renderHook(() => useRoutingStore());

      act(() => {
        result.current.setDetailError('Detail error');
      });

      expect(result.current.detailError).toBe('Detail error');

      act(() => {
        result.current.clearDetailError();
      });

      expect(result.current.detailError).toBeNull();
    });

    it('should set and clear steps error', () => {
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({ stepsError: 'Steps error' });
      expect(result.current.stepsError).toBe('Steps error');

      useRoutingStore.setState({ stepsError: null });
      expect(result.current.stepsError).toBeNull();
    });
  });

  // ============================================
  // VERSION CONFLICT HANDLING TESTS
  // ============================================

  describe('Version Conflict Handling', () => {
    it('should set version conflict', () => {
      const { result } = renderHook(() => useRoutingStore());
      const conflictError = new VersionConflictError('Version mismatch');
      const attemptedChanges: UpdateRoutingRequest = {
        lifecycleState: 'APPROVED',
      };

      act(() => {
        result.current.setVersionConflict(conflictError, attemptedChanges);
      });

      expect(result.current.versionConflict).not.toBeNull();
      expect(result.current.versionConflict?.attemptedChanges).toEqual(attemptedChanges);
    });

    it('should clear version conflict', () => {
      const { result } = renderHook(() => useRoutingStore());
      const conflictError = new VersionConflictError('Version mismatch');

      act(() => {
        result.current.setVersionConflict(conflictError, {});
      });

      expect(result.current.versionConflict).not.toBeNull();

      act(() => {
        result.current.clearVersionConflict();
      });

      expect(result.current.versionConflict).toBeNull();
    });

    it('should resolve conflict by reloading', async () => {
      mockRoutingAPI.getRoutingById.mockResolvedValue(mockDetailResponse);
      const { result } = renderHook(() => useRoutingStore());

      const conflictError = new VersionConflictError('Version mismatch');
      useRoutingStore.setState({ versionConflict: { error: conflictError, attemptedChanges: {} } });

      await act(async () => {
        await result.current.resolveConflictByReloading('routing-1');
      });

      expect(result.current.versionConflict).toBeNull();
      expect(result.current.currentRouting).toEqual(mockRouting);
    });
  });

  // ============================================
  // STATE CLEARING TESTS
  // ============================================

  describe('State Clearing', () => {
    it('should clear current routing and related state', () => {
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({
        currentRouting: mockRouting,
        currentSteps: [mockRoutingStep],
        routingTiming: {
          totalSetupTime: 10,
          totalCycleTime: 20,
          totalTeardownTime: 5,
          totalTime: 35,
          criticalPathTime: 20,
        },
        validationResult: { isValid: true, errors: [] },
      });

      act(() => {
        result.current.clearCurrentRouting();
      });

      expect(result.current.currentRouting).toBeNull();
      expect(result.current.currentSteps).toHaveLength(0);
      expect(result.current.routingTiming).toBeNull();
      expect(result.current.validationResult).toBeNull();
    });

    it('should clear current steps only', () => {
      const { result } = renderHook(() => useRoutingStore());

      useRoutingStore.setState({
        currentRouting: mockRouting,
        currentSteps: [mockRoutingStep],
      });

      act(() => {
        result.current.clearCurrentSteps();
      });

      expect(result.current.currentSteps).toHaveLength(0);
      expect(result.current.currentRouting).not.toBeNull();
    });
  });
});
