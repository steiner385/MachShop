/**
 * useNodeDrag Hook
 * Handles node dragging, snapping to grid, and collision detection
 */

import { useCallback, useRef } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { NodeConfig } from '../types/workflow';

export interface UseNodeDragOptions {
  enabled?: boolean;
  snapToGrid?: boolean;
  gridSize?: number;
  minX?: number;
  maxX?: number;
  minY?: number;
  maxY?: number;
}

export interface DragState {
  nodeId: string;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  offsetX: number;
  offsetY: number;
}

export const useNodeDrag = (options: UseNodeDragOptions = {}) => {
  const {
    enabled = true,
    snapToGrid: shouldSnapToGrid = true,
    gridSize: defaultGridSize = 20,
  } = options;

  const {
    moveNode,
    setDragging,
    getNodeById,
    snapToGrid,
    gridSize,
  } = useWorkflowStore(state => ({
    moveNode: state.moveNode,
    setDragging: state.setDragging,
    getNodeById: state.getNodeById,
    snapToGrid: state.snapToGrid,
    gridSize: state.gridSize,
  }));

  const dragStateRef = useRef<DragState | null>(null);

  /**
   * Snap position to grid
   */
  const snapPosition = useCallback(
    (x: number, y: number): [number, number] => {
      if (!shouldSnapToGrid || !snapToGrid) {
        return [x, y];
      }

      const size = defaultGridSize;
      const snappedX = Math.round(x / size) * size;
      const snappedY = Math.round(y / size) * size;

      return [snappedX, snappedY];
    },
    [shouldSnapToGrid, snapToGrid, defaultGridSize]
  );

  /**
   * Check if node would collide with other nodes
   */
  const checkCollision = useCallback(
    (nodeId: string, x: number, y: number, width: number, height: number): boolean => {
      // For now, return false (no collision detection)
      // Can be enhanced with AABB (Axis-Aligned Bounding Box) collision later
      return false;
    },
    []
  );

  /**
   * Start dragging a node
   */
  const startDrag = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      if (!enabled) return;

      const node = getNodeById(nodeId);
      if (!node) return;

      const offsetX = clientX - node.x;
      const offsetY = clientY - node.y;

      dragStateRef.current = {
        nodeId,
        startX: node.x,
        startY: node.y,
        currentX: node.x,
        currentY: node.y,
        offsetX,
        offsetY,
      };

      setDragging(true);
    },
    [enabled, getNodeById, setDragging]
  );

  /**
   * Continue dragging
   */
  const continueDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!enabled || !dragStateRef.current) return;

      const { nodeId, offsetX, offsetY } = dragStateRef.current;
      let x = clientX - offsetX;
      let y = clientY - offsetY;

      // Apply grid snapping
      const size = shouldSnapToGrid ? gridSize : 1;
      if (shouldSnapToGrid && snapToGrid) {
        [x, y] = snapPosition(x, y);
      }

      // Update drag state
      dragStateRef.current.currentX = x;
      dragStateRef.current.currentY = y;

      // Move node
      moveNode(nodeId, x, y);
    },
    [enabled, shouldSnapToGrid, gridSize, snapToGrid, snapPosition, moveNode]
  );

  /**
   * End dragging
   */
  const endDrag = useCallback(() => {
    dragStateRef.current = null;
    setDragging(false);
  }, [setDragging]);

  /**
   * Cancel drag and revert to start position
   */
  const cancelDrag = useCallback(() => {
    if (!dragStateRef.current) return;

    const { nodeId, startX, startY } = dragStateRef.current;
    moveNode(nodeId, startX, startY);
    dragStateRef.current = null;
    setDragging(false);
  }, [moveNode, setDragging]);

  /**
   * Get current drag state
   */
  const getDragState = useCallback(() => {
    return dragStateRef.current;
  }, []);

  /**
   * Get drag delta
   */
  const getDragDelta = useCallback((): [number, number] => {
    if (!dragStateRef.current) return [0, 0];

    const { startX, startY, currentX, currentY } = dragStateRef.current;
    return [currentX - startX, currentY - startY];
  }, []);

  /**
   * Check if dragging
   */
  const isDragging = useCallback(() => {
    return dragStateRef.current !== null;
  }, []);

  return {
    startDrag,
    continueDrag,
    endDrag,
    cancelDrag,
    getDragState,
    getDragDelta,
    isDragging,
    snapPosition,
    checkCollision,
  };
};
