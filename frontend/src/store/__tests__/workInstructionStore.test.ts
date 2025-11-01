/**
 * Tests for WorkInstructionStore Zustand Store
 *
 * Tests the work instruction management store including:
 * - List operations with pagination and filtering
 * - CRUD operations (create, read, update, delete, approve)
 * - Step management (add, update, delete, reorder)
 * - Execution mode for tablet view
 * - Error handling and state management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  useWorkInstructionStore,
  useWorkInstructions,
  useCurrentWorkInstruction,
  useExecutionMode,
} from '../workInstructionStore';
import type { WorkInstruction, ListWorkInstructionsParams, CreateWorkInstructionInput, UpdateWorkInstructionInput, CreateStepInput, UpdateStepInput } from '@/api/workInstructions';

// Mock the workInstructionsAPI
const mockWorkInstructionsAPI = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  approve: vi.fn(),
  addStep: vi.fn(),
  updateStep: vi.fn(),
  deleteStep: vi.fn(),
  reorderSteps: vi.fn(),
};

vi.mock('@/api/workInstructions', () => ({
  workInstructionsAPI: mockWorkInstructionsAPI,
}));

// Mock data
const mockWorkInstruction: WorkInstruction = {
  id: 'wi-1',
  title: 'Assembly Process',
  description: 'Step-by-step assembly instructions',
  steps: [
    { id: 'step-1', stepNumber: 1, title: 'Prepare', description: 'Prepare materials' },
    { id: 'step-2', stepNumber: 2, title: 'Assemble', description: 'Assemble parts' },
    { id: 'step-3', stepNumber: 3, title: 'Test', description: 'Test the assembly' },
  ],
  status: 'APPROVED',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockListResponse = {
  workInstructions: [mockWorkInstruction],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
};

describe('WorkInstructionStore', () => {
  beforeEach(() => {
    // Clear the store state before each test
    useWorkInstructionStore.setState({
      workInstructions: [],
      filteredWorkInstructions: [],
      isLoading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      filters: { page: 1, limit: 20, sortBy: 'updatedAt', sortOrder: 'desc' },
      currentWorkInstruction: null,
      isLoadingDetail: false,
      detailError: null,
      executionMode: false,
      currentStepIndex: 0,
      completedSteps: new Set(),
    });

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('List Operations', () => {
    it('should fetch work instructions successfully', async () => {
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.fetchWorkInstructions();
      });

      expect(result.current.workInstructions).toHaveLength(1);
      expect(result.current.workInstructions[0].id).toBe('wi-1');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockWorkInstructionsAPI.list).toHaveBeenCalled();
    });

    it('should handle fetch error gracefully', async () => {
      const error = new Error('Network error');
      mockWorkInstructionsAPI.list.mockRejectedValue(error);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        try {
          await result.current.fetchWorkInstructions();
        } catch (e) {
          // Error is expected
        }
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      mockWorkInstructionsAPI.list.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockListResponse), 100);
          })
      );

      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.fetchWorkInstructions();
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should update filters and reset to page 1', async () => {
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        result.current.setFilters({ sortBy: 'title' });
      });

      expect(result.current.filters.sortBy).toBe('title');
      expect(result.current.filters.page).toBe(1); // Should reset to page 1
      expect(mockWorkInstructionsAPI.list).toHaveBeenCalled();
    });

    it('should clear filters and use defaults', async () => {
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        result.current.setFilters({ sortBy: 'title' });
        result.current.clearFilters();
      });

      expect(result.current.filters.sortBy).toBe('updatedAt');
      expect(result.current.filters.sortOrder).toBe('desc');
      expect(mockWorkInstructionsAPI.list).toHaveBeenCalled();
    });

    it('should change page and fetch new data', async () => {
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        result.current.setPage(2);
      });

      expect(result.current.filters.page).toBe(2);
      expect(mockWorkInstructionsAPI.list).toHaveBeenCalled();
    });
  });

  describe('CRUD Operations', () => {
    it('should fetch work instruction by ID', async () => {
      mockWorkInstructionsAPI.getById.mockResolvedValue(mockWorkInstruction);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.fetchWorkInstructionById('wi-1');
      });

      expect(result.current.currentWorkInstruction).toEqual(mockWorkInstruction);
      expect(result.current.isLoadingDetail).toBe(false);
      expect(result.current.detailError).toBeNull();
    });

    it('should handle fetch by ID error', async () => {
      const error = new Error('Not found');
      mockWorkInstructionsAPI.getById.mockRejectedValue(error);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        try {
          await result.current.fetchWorkInstructionById('invalid-id');
        } catch (e) {
          // Error is expected
        }
      });

      expect(result.current.detailError).toBe('Not found');
      expect(result.current.isLoadingDetail).toBe(false);
    });

    it('should create work instruction successfully', async () => {
      const input: CreateWorkInstructionInput = {
        title: 'New WI',
        description: 'Description',
      };

      mockWorkInstructionsAPI.create.mockResolvedValue(mockWorkInstruction);
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        const created = await result.current.createWorkInstruction(input);
        expect(created).toEqual(mockWorkInstruction);
      });

      expect(result.current.currentWorkInstruction).toEqual(mockWorkInstruction);
      expect(result.current.isLoading).toBe(false);
      expect(mockWorkInstructionsAPI.create).toHaveBeenCalledWith(input);
    });

    it('should handle create error', async () => {
      const input: CreateWorkInstructionInput = {
        title: 'New WI',
        description: 'Description',
      };

      mockWorkInstructionsAPI.create.mockRejectedValue(new Error('Creation failed'));

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        try {
          await result.current.createWorkInstruction(input);
        } catch (e) {
          // Error is expected
        }
      });

      expect(result.current.error).toBe('Creation failed');
      expect(result.current.isLoading).toBe(false);
    });

    it('should update work instruction successfully', async () => {
      const updateData: UpdateWorkInstructionInput = {
        title: 'Updated Title',
      };

      const updatedWI = { ...mockWorkInstruction, title: 'Updated Title' };
      mockWorkInstructionsAPI.update.mockResolvedValue(updatedWI);
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.updateWorkInstruction('wi-1', updateData);
      });

      expect(result.current.currentWorkInstruction?.title).toBe('Updated Title');
      expect(result.current.isLoadingDetail).toBe(false);
      expect(mockWorkInstructionsAPI.update).toHaveBeenCalledWith('wi-1', updateData);
    });

    it('should delete work instruction successfully', async () => {
      mockWorkInstructionsAPI.delete.mockResolvedValue(null);
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      // Set a current work instruction first
      act(() => {
        useWorkInstructionStore.setState({ currentWorkInstruction: mockWorkInstruction });
      });

      await act(async () => {
        await result.current.deleteWorkInstruction('wi-1');
      });

      expect(result.current.currentWorkInstruction).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(mockWorkInstructionsAPI.delete).toHaveBeenCalledWith('wi-1');
    });

    it('should approve work instruction successfully', async () => {
      const approvedWI = { ...mockWorkInstruction, status: 'APPROVED' };
      mockWorkInstructionsAPI.approve.mockResolvedValue(approvedWI);
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.approveWorkInstruction('wi-1');
      });

      expect(result.current.currentWorkInstruction?.status).toBe('APPROVED');
      expect(result.current.isLoadingDetail).toBe(false);
      expect(mockWorkInstructionsAPI.approve).toHaveBeenCalledWith('wi-1');
    });
  });

  describe('Step Operations', () => {
    beforeEach(() => {
      act(() => {
        useWorkInstructionStore.setState({ currentWorkInstruction: mockWorkInstruction });
      });
    });

    it('should add step successfully', async () => {
      const newStep: CreateStepInput = {
        stepNumber: 4,
        title: 'Package',
        description: 'Package the item',
      };

      const updatedWI = {
        ...mockWorkInstruction,
        steps: [
          ...mockWorkInstruction.steps,
          { id: 'step-4', ...newStep },
        ],
      };

      mockWorkInstructionsAPI.addStep.mockResolvedValue(null);
      mockWorkInstructionsAPI.getById.mockResolvedValue(updatedWI);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.addStep('wi-1', newStep);
      });

      expect(result.current.currentWorkInstruction?.steps).toHaveLength(4);
      expect(mockWorkInstructionsAPI.addStep).toHaveBeenCalledWith('wi-1', newStep);
    });

    it('should update step successfully', async () => {
      const updateData: UpdateStepInput = {
        title: 'Updated Step Title',
      };

      const updatedWI = {
        ...mockWorkInstruction,
        steps: [
          { ...mockWorkInstruction.steps[0], title: 'Updated Step Title' },
          ...mockWorkInstruction.steps.slice(1),
        ],
      };

      mockWorkInstructionsAPI.updateStep.mockResolvedValue(null);
      mockWorkInstructionsAPI.getById.mockResolvedValue(updatedWI);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.updateStep('wi-1', 'step-1', updateData);
      });

      expect(result.current.currentWorkInstruction?.steps[0].title).toBe('Updated Step Title');
      expect(mockWorkInstructionsAPI.updateStep).toHaveBeenCalledWith('wi-1', 'step-1', updateData);
    });

    it('should delete step successfully', async () => {
      const updatedWI = {
        ...mockWorkInstruction,
        steps: mockWorkInstruction.steps.slice(1),
      };

      mockWorkInstructionsAPI.deleteStep.mockResolvedValue(null);
      mockWorkInstructionsAPI.getById.mockResolvedValue(updatedWI);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.deleteStep('wi-1', 'step-1');
      });

      expect(result.current.currentWorkInstruction?.steps).toHaveLength(2);
      expect(mockWorkInstructionsAPI.deleteStep).toHaveBeenCalledWith('wi-1', 'step-1');
    });

    it('should reorder steps successfully', async () => {
      const newOrder = [
        { stepId: 'step-3', stepNumber: 1 },
        { stepId: 'step-2', stepNumber: 2 },
        { stepId: 'step-1', stepNumber: 3 },
      ];

      const reorderedWI = {
        ...mockWorkInstruction,
        steps: [
          mockWorkInstruction.steps[2],
          mockWorkInstruction.steps[1],
          mockWorkInstruction.steps[0],
        ],
      };

      mockWorkInstructionsAPI.reorderSteps.mockResolvedValue(null);
      mockWorkInstructionsAPI.getById.mockResolvedValue(reorderedWI);

      const { result } = renderHook(() => useWorkInstructionStore());

      await act(async () => {
        await result.current.reorderSteps('wi-1', newOrder);
      });

      expect(mockWorkInstructionsAPI.reorderSteps).toHaveBeenCalledWith('wi-1', newOrder);
    });

    it('should handle step operation errors', async () => {
      mockWorkInstructionsAPI.addStep.mockRejectedValue(new Error('Step add failed'));

      const { result } = renderHook(() => useWorkInstructionStore());

      const stepData: CreateStepInput = {
        stepNumber: 4,
        title: 'New Step',
        description: 'Description',
      };

      await act(async () => {
        try {
          await result.current.addStep('wi-1', stepData);
        } catch (e) {
          // Error is expected
        }
      });

      expect(result.current.detailError).toBe('Step add failed');
    });
  });

  describe('Execution Mode', () => {
    it('should start execution mode', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
      });

      expect(result.current.executionMode).toBe(true);
      expect(result.current.currentWorkInstruction).toEqual(mockWorkInstruction);
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.completedSteps.size).toBe(0);
    });

    it('should stop execution mode', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.stopExecution();
      });

      expect(result.current.executionMode).toBe(false);
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.completedSteps.size).toBe(0);
    });

    it('should navigate to next step', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.goToNextStep();
      });

      expect(result.current.currentStepIndex).toBe(1);

      act(() => {
        result.current.goToNextStep();
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    it('should not exceed last step when going to next', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        // Go to last step
        result.current.goToStep(2);
        result.current.goToNextStep();
      });

      expect(result.current.currentStepIndex).toBe(2); // Should stay at last step
    });

    it('should navigate to previous step', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.goToStep(2);
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStepIndex).toBe(1);
    });

    it('should not go below first step when going to previous', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.goToPreviousStep();
      });

      expect(result.current.currentStepIndex).toBe(0); // Should stay at first step
    });

    it('should navigate directly to specific step', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.goToStep(2);
      });

      expect(result.current.currentStepIndex).toBe(2);
    });

    it('should clamp step index to valid range', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.goToStep(10); // Out of bounds
      });

      expect(result.current.currentStepIndex).toBe(2); // Last valid index
    });

    it('should mark step as complete', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.markStepComplete(0);
        result.current.markStepComplete(1);
      });

      expect(result.current.completedSteps.has(0)).toBe(true);
      expect(result.current.completedSteps.has(1)).toBe(true);
      expect(result.current.completedSteps.has(2)).toBe(false);
    });

    it('should mark step as incomplete', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      act(() => {
        result.current.startExecution(mockWorkInstruction);
        result.current.markStepComplete(0);
        result.current.markStepIncomplete(0);
      });

      expect(result.current.completedSteps.has(0)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should set and clear error', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

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
      const { result } = renderHook(() => useWorkInstructionStore());

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

  describe('Selector Hooks', () => {
    it('should use work instructions selector', () => {
      mockWorkInstructionsAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useWorkInstructions());

      expect(result.current.workInstructions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should use current work instruction selector', () => {
      const { result } = renderHook(() => useCurrentWorkInstruction());

      expect(result.current.workInstruction).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should use execution mode selector', () => {
      const { result } = renderHook(() => useExecutionMode());

      expect(result.current.executionMode).toBe(false);
      expect(result.current.currentWorkInstruction).toBeNull();
      expect(result.current.currentStepIndex).toBe(0);
      expect(result.current.completedSteps.size).toBe(0);
    });

    it('should provide current step in execution mode selector', () => {
      const { result } = renderHook(() => useExecutionMode());

      act(() => {
        useWorkInstructionStore.setState({
          executionMode: true,
          currentWorkInstruction: mockWorkInstruction,
          currentStepIndex: 1,
        });
      });

      expect(result.current.currentStep).toEqual(mockWorkInstruction.steps[1]);
      expect(result.current.totalSteps).toBe(3);
    });
  });

  describe('State Persistence', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useWorkInstructionStore());

      expect(result.current.workInstructions).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.currentWorkInstruction).toBeNull();
      expect(result.current.executionMode).toBe(false);
    });
  });
});
