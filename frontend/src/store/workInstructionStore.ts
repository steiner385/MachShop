import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  workInstructionsAPI,
  WorkInstruction,
  WorkInstructionStep,
  ListWorkInstructionsParams,
  CreateWorkInstructionInput,
  UpdateWorkInstructionInput,
  CreateStepInput,
  UpdateStepInput,
} from '@/api/workInstructions';

interface WorkInstructionState {
  // List view state
  workInstructions: WorkInstruction[];
  filteredWorkInstructions: WorkInstruction[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ListWorkInstructionsParams;

  // Detail view state
  currentWorkInstruction: WorkInstruction | null;
  isLoadingDetail: boolean;
  detailError: string | null;

  // Execution state (for tablet view)
  executionMode: boolean;
  currentStepIndex: number;
  completedSteps: Set<number>;
}

interface WorkInstructionActions {
  // List operations
  fetchWorkInstructions: (params?: ListWorkInstructionsParams) => Promise<void>;
  setFilters: (filters: Partial<ListWorkInstructionsParams>) => void;
  clearFilters: () => void;
  setPage: (page: number) => void;

  // CRUD operations
  fetchWorkInstructionById: (id: string) => Promise<void>;
  createWorkInstruction: (data: CreateWorkInstructionInput) => Promise<WorkInstruction>;
  updateWorkInstruction: (id: string, data: UpdateWorkInstructionInput) => Promise<void>;
  deleteWorkInstruction: (id: string) => Promise<void>;
  approveWorkInstruction: (id: string) => Promise<void>;

  // Step operations
  addStep: (workInstructionId: string, data: CreateStepInput) => Promise<void>;
  updateStep: (workInstructionId: string, stepId: string, data: UpdateStepInput) => Promise<void>;
  deleteStep: (workInstructionId: string, stepId: string) => Promise<void>;
  reorderSteps: (workInstructionId: string, stepOrders: { stepId: string; stepNumber: number }[]) => Promise<void>;

  // Execution mode (tablet)
  startExecution: (workInstruction: WorkInstruction) => void;
  stopExecution: () => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  goToStep: (stepIndex: number) => void;
  markStepComplete: (stepIndex: number) => void;
  markStepIncomplete: (stepIndex: number) => void;

  // Error handling
  setError: (error: string | null) => void;
  clearError: () => void;
  setDetailError: (error: string | null) => void;
  clearDetailError: () => void;
}

type WorkInstructionStore = WorkInstructionState & WorkInstructionActions;

const DEFAULT_FILTERS: ListWorkInstructionsParams = {
  page: 1,
  limit: 20,
  sortBy: 'updatedAt',
  sortOrder: 'desc',
};

export const useWorkInstructionStore = create<WorkInstructionStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      workInstructions: [],
      filteredWorkInstructions: [],
      isLoading: false,
      error: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      filters: DEFAULT_FILTERS,
      currentWorkInstruction: null,
      isLoadingDetail: false,
      detailError: null,
      executionMode: false,
      currentStepIndex: 0,
      completedSteps: new Set(),

      // List operations
      fetchWorkInstructions: async (params?: ListWorkInstructionsParams) => {
        try {
          set({ isLoading: true, error: null });

          const filters = params || get().filters;
          const response = await workInstructionsAPI.list(filters);

          set({
            workInstructions: response.workInstructions,
            filteredWorkInstructions: response.workInstructions,
            pagination: response.pagination,
            filters,
            isLoading: false,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch work instructions',
          });
          throw error;
        }
      },

      setFilters: (newFilters: Partial<ListWorkInstructionsParams>) => {
        const currentFilters = get().filters;
        const updatedFilters = { ...currentFilters, ...newFilters, page: 1 }; // Reset to page 1 when filters change
        set({ filters: updatedFilters });
        get().fetchWorkInstructions(updatedFilters);
      },

      clearFilters: () => {
        set({ filters: DEFAULT_FILTERS });
        get().fetchWorkInstructions(DEFAULT_FILTERS);
      },

      setPage: (page: number) => {
        const filters = { ...get().filters, page };
        set({ filters });
        get().fetchWorkInstructions(filters);
      },

      // CRUD operations
      fetchWorkInstructionById: async (id: string) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const workInstruction = await workInstructionsAPI.getById(id);

          set({
            currentWorkInstruction: workInstruction,
            isLoadingDetail: false,
          });
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to fetch work instruction',
          });
          throw error;
        }
      },

      createWorkInstruction: async (data: CreateWorkInstructionInput) => {
        try {
          set({ isLoading: true, error: null });

          const workInstruction = await workInstructionsAPI.create(data);

          set({
            currentWorkInstruction: workInstruction,
            isLoading: false,
          });

          // Refresh the list
          await get().fetchWorkInstructions();

          return workInstruction;
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to create work instruction',
          });
          throw error;
        }
      },

      updateWorkInstruction: async (id: string, data: UpdateWorkInstructionInput) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const workInstruction = await workInstructionsAPI.update(id, data);

          set({
            currentWorkInstruction: workInstruction,
            isLoadingDetail: false,
          });

          // Refresh the list
          await get().fetchWorkInstructions();
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to update work instruction',
          });
          throw error;
        }
      },

      deleteWorkInstruction: async (id: string) => {
        try {
          set({ isLoading: true, error: null });

          await workInstructionsAPI.delete(id);

          set({
            currentWorkInstruction: null,
            isLoading: false,
          });

          // Refresh the list
          await get().fetchWorkInstructions();
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.message || 'Failed to delete work instruction',
          });
          throw error;
        }
      },

      approveWorkInstruction: async (id: string) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          const workInstruction = await workInstructionsAPI.approve(id);

          set({
            currentWorkInstruction: workInstruction,
            isLoadingDetail: false,
          });

          // Refresh the list
          await get().fetchWorkInstructions();
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to approve work instruction',
          });
          throw error;
        }
      },

      // Step operations
      addStep: async (workInstructionId: string, data: CreateStepInput) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          await workInstructionsAPI.addStep(workInstructionId, data);

          // Refresh the current work instruction
          await get().fetchWorkInstructionById(workInstructionId);

          set({ isLoadingDetail: false });
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to add step',
          });
          throw error;
        }
      },

      updateStep: async (workInstructionId: string, stepId: string, data: UpdateStepInput) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          await workInstructionsAPI.updateStep(workInstructionId, stepId, data);

          // Refresh the current work instruction
          await get().fetchWorkInstructionById(workInstructionId);

          set({ isLoadingDetail: false });
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to update step',
          });
          throw error;
        }
      },

      deleteStep: async (workInstructionId: string, stepId: string) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          await workInstructionsAPI.deleteStep(workInstructionId, stepId);

          // Refresh the current work instruction
          await get().fetchWorkInstructionById(workInstructionId);

          set({ isLoadingDetail: false });
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to delete step',
          });
          throw error;
        }
      },

      reorderSteps: async (workInstructionId: string, stepOrders: { stepId: string; stepNumber: number }[]) => {
        try {
          set({ isLoadingDetail: true, detailError: null });

          await workInstructionsAPI.reorderSteps(workInstructionId, stepOrders);

          // Refresh the current work instruction
          await get().fetchWorkInstructionById(workInstructionId);

          set({ isLoadingDetail: false });
        } catch (error: any) {
          set({
            isLoadingDetail: false,
            detailError: error.message || 'Failed to reorder steps',
          });
          throw error;
        }
      },

      // Execution mode (tablet)
      startExecution: (workInstruction: WorkInstruction) => {
        set({
          executionMode: true,
          currentWorkInstruction: workInstruction,
          currentStepIndex: 0,
          completedSteps: new Set(),
        });
      },

      stopExecution: () => {
        set({
          executionMode: false,
          currentStepIndex: 0,
          completedSteps: new Set(),
        });
      },

      goToNextStep: () => {
        const { currentWorkInstruction, currentStepIndex } = get();
        if (currentWorkInstruction && currentWorkInstruction.steps) {
          const nextIndex = Math.min(currentStepIndex + 1, currentWorkInstruction.steps.length - 1);
          set({ currentStepIndex: nextIndex });
        }
      },

      goToPreviousStep: () => {
        const { currentStepIndex } = get();
        const previousIndex = Math.max(currentStepIndex - 1, 0);
        set({ currentStepIndex: previousIndex });
      },

      goToStep: (stepIndex: number) => {
        const { currentWorkInstruction } = get();
        if (currentWorkInstruction && currentWorkInstruction.steps) {
          const validIndex = Math.max(0, Math.min(stepIndex, currentWorkInstruction.steps.length - 1));
          set({ currentStepIndex: validIndex });
        }
      },

      markStepComplete: (stepIndex: number) => {
        const { completedSteps } = get();
        const newCompletedSteps = new Set(completedSteps);
        newCompletedSteps.add(stepIndex);
        set({ completedSteps: newCompletedSteps });
      },

      markStepIncomplete: (stepIndex: number) => {
        const { completedSteps } = get();
        const newCompletedSteps = new Set(completedSteps);
        newCompletedSteps.delete(stepIndex);
        set({ completedSteps: newCompletedSteps });
      },

      // Error handling
      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      setDetailError: (error: string | null) => {
        set({ detailError: error });
      },

      clearDetailError: () => {
        set({ detailError: null });
      },
    }),
    {
      name: 'work-instruction-store',
    }
  )
);

// Selector hooks for specific state
export const useWorkInstructions = () => {
  return useWorkInstructionStore((state) => ({
    workInstructions: state.workInstructions,
    isLoading: state.isLoading,
    error: state.error,
    pagination: state.pagination,
  }));
};

export const useCurrentWorkInstruction = () => {
  return useWorkInstructionStore((state) => ({
    workInstruction: state.currentWorkInstruction,
    isLoading: state.isLoadingDetail,
    error: state.detailError,
  }));
};

export const useExecutionMode = () => {
  return useWorkInstructionStore((state) => ({
    executionMode: state.executionMode,
    currentWorkInstruction: state.currentWorkInstruction,
    currentStepIndex: state.currentStepIndex,
    completedSteps: state.completedSteps,
    currentStep: state.currentWorkInstruction?.steps?.[state.currentStepIndex],
    totalSteps: state.currentWorkInstruction?.steps?.length || 0,
  }));
};
