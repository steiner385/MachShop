/**
 * Execution Layout Store
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 *
 * Manages state for configurable work instruction execution layouts including
 * layout modes, panel configurations, preferences, and synchronization between
 * instruction display and data collection.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Enums matching database schema
export enum LayoutMode {
  SPLIT_VERTICAL = 'SPLIT_VERTICAL',
  SPLIT_HORIZONTAL = 'SPLIT_HORIZONTAL',
  TABBED = 'TABBED',
  OVERLAY = 'OVERLAY',
  PICTURE_IN_PICTURE = 'PICTURE_IN_PICTURE',
}

export enum PanelPosition {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  CENTER = 'CENTER',
}

// Interface types
export interface UserPreferences {
  layoutMode: LayoutMode;
  splitRatio: number;
  panelPosition: PanelPosition;
  autoAdvanceSteps: boolean;
  showStepTimer: boolean;
  compactMode: boolean;
  useSecondMonitor: boolean;
  secondMonitorPosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface WorkstationConfig {
  workstationId: string;
  screenWidth?: number;
  screenHeight?: number;
  isMultiMonitor: boolean;
  monitorCount: number;
  forcedLayout?: LayoutMode;
  allowUserOverride: boolean;
  isTouchScreen: boolean;
  touchTargetSize: number;
}

export interface StepData {
  stepId: string;
  stepNumber: number;
  title: string;
  content: string;
  estimatedDuration?: number;
  isCritical: boolean;
  requiresSignature: boolean;
  dataEntryFields?: any[];
  isCompleted: boolean;
  collectedData?: Record<string, any>;
}

export interface ExecutionSession {
  workOrderId: string;
  operationNumber: number;
  workInstructionId?: string;
  currentStepNumber: number;
  totalSteps: number;
  steps: StepData[];
  startTime?: Date;
  isActive: boolean;
}

interface ExecutionLayoutState {
  // Layout configuration
  currentLayoutMode: LayoutMode;
  splitRatio: number;
  panelPosition: PanelPosition;

  // Panel visibility and state
  instructionPanelVisible: boolean;
  dataCollectionPanelVisible: boolean;
  instructionPanelCollapsed: boolean;
  dataCollectionPanelCollapsed: boolean;

  // Current execution context
  executionSession: ExecutionSession | null;
  currentStepNumber: number;

  // User preferences and workstation config
  userPreferences: UserPreferences | null;
  workstationConfig: WorkstationConfig | null;

  // UI state
  showLayoutSelector: boolean;
  showPreferenceModal: boolean;
  isLoading: boolean;
  error: string | null;

  // Step timer
  stepStartTime: Date | null;
  stepElapsedTime: number;

  // Keyboard shortcuts enabled
  keyboardShortcutsEnabled: boolean;

  // Multi-monitor support
  secondMonitorWindow: Window | null;
}

interface ExecutionLayoutActions {
  // Layout mode management
  setLayoutMode: (mode: LayoutMode) => void;
  setSplitRatio: (ratio: number) => void;
  setPanelPosition: (position: PanelPosition) => void;

  // Panel control
  togglePanel: (panel: 'instruction' | 'data') => void;
  collapsePanel: (panel: 'instruction' | 'data') => void;
  expandPanel: (panel: 'instruction' | 'data') => void;
  togglePanelCollapse: (panel: 'instruction' | 'data') => void;

  // Step navigation
  navigateToStep: (stepNumber: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  markStepComplete: (stepNumber: number, collectedData?: Record<string, any>) => void;
  markStepIncomplete: (stepNumber: number) => void;

  // Execution session management
  startExecutionSession: (session: Omit<ExecutionSession, 'isActive' | 'startTime'>) => void;
  endExecutionSession: () => void;
  updateStepData: (stepNumber: number, data: Partial<StepData>) => void;

  // Preferences and configuration
  loadUserPreferences: (userId: string, workstationId?: string) => Promise<void>;
  saveUserPreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  loadWorkstationConfig: (workstationId: string) => Promise<void>;
  resetToDefaults: () => void;

  // UI state management
  toggleLayoutSelector: () => void;
  togglePreferenceModal: () => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Step timer
  startStepTimer: () => void;
  stopStepTimer: () => void;
  updateStepTimer: () => void;

  // Keyboard shortcuts
  toggleKeyboardShortcuts: () => void;

  // Multi-monitor support
  openSecondMonitor: () => void;
  closeSecondMonitor: () => void;

  // Auto-advance logic
  checkAutoAdvance: () => void;
}

type ExecutionLayoutStore = ExecutionLayoutState & ExecutionLayoutActions;

const DEFAULT_PREFERENCES: UserPreferences = {
  layoutMode: LayoutMode.SPLIT_VERTICAL,
  splitRatio: 0.6,
  panelPosition: PanelPosition.LEFT,
  autoAdvanceSteps: false,
  showStepTimer: true,
  compactMode: false,
  useSecondMonitor: false,
};

export const useExecutionLayoutStore = create<ExecutionLayoutStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentLayoutMode: LayoutMode.SPLIT_VERTICAL,
        splitRatio: 0.6,
        panelPosition: PanelPosition.LEFT,
        instructionPanelVisible: true,
        dataCollectionPanelVisible: true,
        instructionPanelCollapsed: false,
        dataCollectionPanelCollapsed: false,
        executionSession: null,
        currentStepNumber: 1,
        userPreferences: null,
        workstationConfig: null,
        showLayoutSelector: false,
        showPreferenceModal: false,
        isLoading: false,
        error: null,
        stepStartTime: null,
        stepElapsedTime: 0,
        keyboardShortcutsEnabled: true,
        secondMonitorWindow: null,

        // Layout mode management
        setLayoutMode: (mode: LayoutMode) => {
          set({ currentLayoutMode: mode });

          // Auto-adjust panel visibility based on layout mode
          if (mode === LayoutMode.TABBED) {
            set({
              instructionPanelVisible: true,
              dataCollectionPanelVisible: false
            });
          } else if (mode === LayoutMode.PICTURE_IN_PICTURE) {
            set({
              instructionPanelVisible: false,
              dataCollectionPanelVisible: true
            });
          } else {
            set({
              instructionPanelVisible: true,
              dataCollectionPanelVisible: true
            });
          }
        },

        setSplitRatio: (ratio: number) => {
          // Validate ratio bounds
          const validRatio = Math.max(0.1, Math.min(0.9, ratio));
          set({ splitRatio: validRatio });
        },

        setPanelPosition: (position: PanelPosition) => {
          set({ panelPosition: position });
        },

        // Panel control
        togglePanel: (panel: 'instruction' | 'data') => {
          if (panel === 'instruction') {
            set(state => ({ instructionPanelVisible: !state.instructionPanelVisible }));
          } else {
            set(state => ({ dataCollectionPanelVisible: !state.dataCollectionPanelVisible }));
          }
        },

        collapsePanel: (panel: 'instruction' | 'data') => {
          if (panel === 'instruction') {
            set({ instructionPanelCollapsed: true });
          } else {
            set({ dataCollectionPanelCollapsed: true });
          }
        },

        expandPanel: (panel: 'instruction' | 'data') => {
          if (panel === 'instruction') {
            set({ instructionPanelCollapsed: false });
          } else {
            set({ dataCollectionPanelCollapsed: false });
          }
        },

        togglePanelCollapse: (panel: 'instruction' | 'data') => {
          if (panel === 'instruction') {
            set(state => ({ instructionPanelCollapsed: !state.instructionPanelCollapsed }));
          } else {
            set(state => ({ dataCollectionPanelCollapsed: !state.dataCollectionPanelCollapsed }));
          }
        },

        // Step navigation
        navigateToStep: (stepNumber: number) => {
          const { executionSession } = get();
          if (executionSession && stepNumber >= 1 && stepNumber <= executionSession.totalSteps) {
            set({ currentStepNumber: stepNumber });
            get().startStepTimer();
          }
        },

        goToNextStep: () => {
          const { currentStepNumber, executionSession } = get();
          if (executionSession && currentStepNumber < executionSession.totalSteps) {
            get().navigateToStep(currentStepNumber + 1);
          }
        },

        goToPreviousStep: () => {
          const { currentStepNumber } = get();
          if (currentStepNumber > 1) {
            get().navigateToStep(currentStepNumber - 1);
          }
        },

        markStepComplete: (stepNumber: number, collectedData?: Record<string, any>) => {
          const { executionSession } = get();
          if (executionSession) {
            const updatedSteps = executionSession.steps.map(step =>
              step.stepNumber === stepNumber
                ? { ...step, isCompleted: true, collectedData: collectedData || step.collectedData }
                : step
            );

            set({
              executionSession: {
                ...executionSession,
                steps: updatedSteps
              }
            });

            // Check for auto-advance
            get().checkAutoAdvance();
          }
        },

        markStepIncomplete: (stepNumber: number) => {
          const { executionSession } = get();
          if (executionSession) {
            const updatedSteps = executionSession.steps.map(step =>
              step.stepNumber === stepNumber
                ? { ...step, isCompleted: false }
                : step
            );

            set({
              executionSession: {
                ...executionSession,
                steps: updatedSteps
              }
            });
          }
        },

        // Execution session management
        startExecutionSession: (session: Omit<ExecutionSession, 'isActive' | 'startTime'>) => {
          set({
            executionSession: {
              ...session,
              isActive: true,
              startTime: new Date()
            },
            currentStepNumber: 1
          });

          get().startStepTimer();
        },

        endExecutionSession: () => {
          get().stopStepTimer();
          set({
            executionSession: null,
            currentStepNumber: 1,
            stepStartTime: null,
            stepElapsedTime: 0
          });
        },

        updateStepData: (stepNumber: number, data: Partial<StepData>) => {
          const { executionSession } = get();
          if (executionSession) {
            const updatedSteps = executionSession.steps.map(step =>
              step.stepNumber === stepNumber
                ? { ...step, ...data }
                : step
            );

            set({
              executionSession: {
                ...executionSession,
                steps: updatedSteps
              }
            });
          }
        },

        // Preferences and configuration (placeholder - would integrate with API)
        loadUserPreferences: async (userId: string, workstationId?: string) => {
          try {
            set({ isLoading: true, error: null });

            // TODO: Integrate with UserPreferenceService API
            // For now, load from localStorage or use defaults
            const prefs = DEFAULT_PREFERENCES;

            set({
              userPreferences: prefs,
              currentLayoutMode: prefs.layoutMode,
              splitRatio: prefs.splitRatio,
              panelPosition: prefs.panelPosition,
              isLoading: false
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.message || 'Failed to load user preferences'
            });
          }
        },

        saveUserPreferences: async (preferences: Partial<UserPreferences>) => {
          try {
            set({ isLoading: true, error: null });

            const currentPrefs = get().userPreferences || DEFAULT_PREFERENCES;
            const updatedPrefs = { ...currentPrefs, ...preferences };

            // TODO: Integrate with UserPreferenceService API
            // For now, save to localStorage

            set({
              userPreferences: updatedPrefs,
              isLoading: false
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.message || 'Failed to save user preferences'
            });
          }
        },

        loadWorkstationConfig: async (workstationId: string) => {
          try {
            set({ isLoading: true, error: null });

            // TODO: Integrate with UserPreferenceService API
            // For now, use default config
            const config: WorkstationConfig = {
              workstationId,
              isMultiMonitor: false,
              monitorCount: 1,
              allowUserOverride: true,
              isTouchScreen: false,
              touchTargetSize: 48
            };

            set({
              workstationConfig: config,
              isLoading: false
            });
          } catch (error: any) {
            set({
              isLoading: false,
              error: error.message || 'Failed to load workstation config'
            });
          }
        },

        resetToDefaults: () => {
          set({
            currentLayoutMode: DEFAULT_PREFERENCES.layoutMode,
            splitRatio: DEFAULT_PREFERENCES.splitRatio,
            panelPosition: DEFAULT_PREFERENCES.panelPosition,
            userPreferences: DEFAULT_PREFERENCES
          });
        },

        // UI state management
        toggleLayoutSelector: () => {
          set(state => ({ showLayoutSelector: !state.showLayoutSelector }));
        },

        togglePreferenceModal: () => {
          set(state => ({ showPreferenceModal: !state.showPreferenceModal }));
        },

        setError: (error: string | null) => {
          set({ error });
        },

        clearError: () => {
          set({ error: null });
        },

        // Step timer
        startStepTimer: () => {
          set({
            stepStartTime: new Date(),
            stepElapsedTime: 0
          });
        },

        stopStepTimer: () => {
          set({
            stepStartTime: null,
            stepElapsedTime: 0
          });
        },

        updateStepTimer: () => {
          const { stepStartTime } = get();
          if (stepStartTime) {
            const elapsed = Math.floor((Date.now() - stepStartTime.getTime()) / 1000);
            set({ stepElapsedTime: elapsed });
          }
        },

        // Keyboard shortcuts
        toggleKeyboardShortcuts: () => {
          set(state => ({ keyboardShortcutsEnabled: !state.keyboardShortcutsEnabled }));
        },

        // Multi-monitor support
        openSecondMonitor: () => {
          // TODO: Implement picture-in-picture window
          console.log('Opening second monitor window...');
        },

        closeSecondMonitor: () => {
          const { secondMonitorWindow } = get();
          if (secondMonitorWindow && !secondMonitorWindow.closed) {
            secondMonitorWindow.close();
          }
          set({ secondMonitorWindow: null });
        },

        // Auto-advance logic
        checkAutoAdvance: () => {
          const { userPreferences, currentStepNumber, executionSession } = get();

          if (userPreferences?.autoAdvanceSteps && executionSession) {
            const currentStep = executionSession.steps.find(s => s.stepNumber === currentStepNumber);

            if (currentStep?.isCompleted && currentStepNumber < executionSession.totalSteps) {
              // Auto-advance to next step after a short delay
              setTimeout(() => {
                get().goToNextStep();
              }, 1000);
            }
          }
        },
      }),
      {
        name: 'execution-layout-store',
        // Only persist layout preferences, not session data
        partialize: (state) => ({
          currentLayoutMode: state.currentLayoutMode,
          splitRatio: state.splitRatio,
          panelPosition: state.panelPosition,
          keyboardShortcutsEnabled: state.keyboardShortcutsEnabled,
        }),
      }
    ),
    {
      name: 'execution-layout-store',
    }
  )
);

// Selector hooks for specific state
export const useLayoutConfig = () => {
  return useExecutionLayoutStore((state) => ({
    layoutMode: state.currentLayoutMode,
    splitRatio: state.splitRatio,
    panelPosition: state.panelPosition,
    instructionPanelVisible: state.instructionPanelVisible,
    dataCollectionPanelVisible: state.dataCollectionPanelVisible,
    instructionPanelCollapsed: state.instructionPanelCollapsed,
    dataCollectionPanelCollapsed: state.dataCollectionPanelCollapsed,
  }));
};

export const useExecutionSession = () => {
  return useExecutionLayoutStore((state) => ({
    session: state.executionSession,
    currentStepNumber: state.currentStepNumber,
    currentStep: state.executionSession?.steps.find(s => s.stepNumber === state.currentStepNumber),
    totalSteps: state.executionSession?.totalSteps || 0,
    isActive: state.executionSession?.isActive || false,
  }));
};

export const useStepTimer = () => {
  return useExecutionLayoutStore((state) => ({
    stepStartTime: state.stepStartTime,
    stepElapsedTime: state.stepElapsedTime,
    isRunning: state.stepStartTime !== null,
  }));
};

export const usePreferences = () => {
  return useExecutionLayoutStore((state) => ({
    preferences: state.userPreferences,
    workstationConfig: state.workstationConfig,
    isLoading: state.isLoading,
    error: state.error,
  }));
};