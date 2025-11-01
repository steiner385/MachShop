/**
 * useUndoRedo Hook
 * Implements undo/redo functionality for workflow editing
 */

import { useCallback, useRef } from 'react';
import { Workflow } from '../types/workflow';

/**
 * Represents a single action that can be undone/redone
 */
export interface UndoRedoAction {
  type: 'node_add' | 'node_delete' | 'node_update' | 'connection_add' | 'connection_delete' | 'connection_update' | 'batch' | 'workflow_update';
  timestamp: number;
  description: string;
  before: any;
  after: any;
  metadata?: Record<string, any>;
}

/**
 * Stack for storing undo/redo history
 */
export interface HistoryState {
  undoStack: UndoRedoAction[];
  redoStack: UndoRedoAction[];
  maxHistorySize: number;
}

export interface UseUndoRedoOptions {
  maxHistorySize?: number;
  onUndo?: (action: UndoRedoAction) => void;
  onRedo?: (action: UndoRedoAction) => void;
}

export const useUndoRedo = (options: UseUndoRedoOptions = {}) => {
  const {
    maxHistorySize = 50,
    onUndo: onUndoCallback,
    onRedo: onRedoCallback,
  } = options;

  const historyRef = useRef<HistoryState>({
    undoStack: [],
    redoStack: [],
    maxHistorySize,
  });

  /**
   * Push action to undo stack
   */
  const pushAction = useCallback(
    (action: UndoRedoAction) => {
      const history = historyRef.current;

      // Add to undo stack
      history.undoStack.push(action);

      // Limit history size
      if (history.undoStack.length > history.maxHistorySize) {
        history.undoStack.shift();
      }

      // Clear redo stack on new action
      history.redoStack = [];
    },
    []
  );

  /**
   * Undo last action
   */
  const undo = useCallback(() => {
    const history = historyRef.current;

    if (history.undoStack.length === 0) {
      return null;
    }

    const action = history.undoStack.pop()!;

    // Move to redo stack
    history.redoStack.push(action);

    // Limit redo stack size
    if (history.redoStack.length > history.maxHistorySize) {
      history.redoStack.shift();
    }

    onUndoCallback?.(action);

    return action;
  }, [maxHistorySize, onUndoCallback]);

  /**
   * Redo last undone action
   */
  const redo = useCallback(() => {
    const history = historyRef.current;

    if (history.redoStack.length === 0) {
      return null;
    }

    const action = history.redoStack.pop()!;

    // Move back to undo stack
    history.undoStack.push(action);

    onRedoCallback?.(action);

    return action;
  }, [onRedoCallback]);

  /**
   * Check if can undo
   */
  const canUndo = useCallback(() => {
    return historyRef.current.undoStack.length > 0;
  }, []);

  /**
   * Check if can redo
   */
  const canRedo = useCallback(() => {
    return historyRef.current.redoStack.length > 0;
  }, []);

  /**
   * Get undo/redo counts
   */
  const getHistoryCounts = useCallback(() => {
    const history = historyRef.current;
    return {
      undoCount: history.undoStack.length,
      redoCount: history.redoStack.length,
    };
  }, []);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    historyRef.current.undoStack = [];
    historyRef.current.redoStack = [];
  }, []);

  /**
   * Get last action
   */
  const getLastAction = useCallback(() => {
    const history = historyRef.current;
    return history.undoStack[history.undoStack.length - 1] || null;
  }, []);

  /**
   * Create batch action from multiple actions
   */
  const createBatchAction = useCallback(
    (
      actions: UndoRedoAction[],
      description: string
    ): UndoRedoAction => {
      return {
        type: 'batch',
        timestamp: Date.now(),
        description,
        before: actions[0]?.before,
        after: actions[actions.length - 1]?.after,
        metadata: {
          actionCount: actions.length,
          actions,
        },
      };
    },
    []
  );

  /**
   * Get history stats
   */
  const getStats = useCallback(() => {
    const history = historyRef.current;
    return {
      totalActions: history.undoStack.length + history.redoStack.length,
      undoStackSize: history.undoStack.length,
      redoStackSize: history.redoStack.length,
      maxHistorySize: history.maxHistorySize,
      memoryUsage: JSON.stringify(history).length,
    };
  }, []);

  return {
    pushAction,
    undo,
    redo,
    canUndo,
    canRedo,
    getHistoryCounts,
    clearHistory,
    getLastAction,
    createBatchAction,
    getStats,
  };
};

/**
 * Helper function to create an undo/redo action
 */
export const createAction = (
  type: UndoRedoAction['type'],
  description: string,
  before: any,
  after: any,
  metadata?: Record<string, any>
): UndoRedoAction => ({
  type,
  timestamp: Date.now(),
  description,
  before,
  after,
  metadata,
});

/**
 * Helper function to batch multiple actions
 */
export const batchActions = (
  actions: UndoRedoAction[],
  description: string
): UndoRedoAction => ({
  type: 'batch',
  timestamp: Date.now(),
  description,
  before: actions[0]?.before,
  after: actions[actions.length - 1]?.after,
  metadata: {
    actionCount: actions.length,
    actions,
  },
});
