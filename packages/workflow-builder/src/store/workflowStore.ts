/**
 * Workflow Editor Store (Zustand)
 * Centralized state management for the workflow canvas editor
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware/devtools';
import { NodeConfig, Connection, Workflow, WorkflowExecution, VariableValue } from '../types/workflow';

/**
 * Editor state - UI-related state
 */
export interface EditorState {
  selectedNodeId: string | null;
  selectedConnectionId: string | null;
  selectedNodeIds: Set<string>;
  hoverNodeId: string | null;
  hoverConnectionId: string | null;
  isDragging: boolean;
  isDrawingConnection: boolean;
  drawingFromPortId: string | null;
  drawingToNodeId: string | null;
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    nodeId?: string;
    connectionId?: string;
  };
}

/**
 * Canvas state - Pan/zoom/viewport state
 */
export interface CanvasState {
  panX: number;
  panY: number;
  zoom: number;
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
}

/**
 * Workflow state - Data state
 */
export interface WorkflowState {
  workflow: Workflow | null;
  nodes: NodeConfig[];
  connections: Connection[];
  variables: Record<string, VariableValue>;
  isDirty: boolean;
  lastSaveTime: number | null;
}

/**
 * Execution state - Runtime state
 */
export interface ExecutionState {
  execution: WorkflowExecution | null;
  isRunning: boolean;
  currentNodeId: string | null;
  executionVariables: Record<string, VariableValue>;
  executionLog: Array<{
    timestamp: number;
    nodeId: string;
    status: string;
    message?: string;
  }>;
}

/**
 * Complete store state
 */
export interface WorkflowStore extends EditorState, CanvasState, WorkflowState, ExecutionState {
  // Editor actions
  selectNode: (nodeId: string | null, multiSelect?: boolean) => void;
  selectConnection: (connectionId: string | null) => void;
  clearSelection: () => void;
  setHoverNode: (nodeId: string | null) => void;
  setHoverConnection: (connectionId: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setDrawingConnection: (
    isDrawing: boolean,
    fromPortId?: string,
    toNodeId?: string
  ) => void;
  showContextMenu: (
    x: number,
    y: number,
    nodeId?: string,
    connectionId?: string
  ) => void;
  hideContextMenu: () => void;

  // Canvas actions
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  zoomBy: (deltaZoom: number, centerX?: number, centerY?: number) => void;
  resetView: () => void;
  setGridSize: (size: number) => void;
  toggleGrid: () => void;
  toggleSnapToGrid: () => void;
  fitToView: (padding?: number) => void;

  // Workflow actions
  setWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (updates: Partial<Workflow>) => void;
  addNode: (node: NodeConfig) => void;
  updateNode: (nodeId: string, updates: Partial<NodeConfig>) => void;
  deleteNode: (nodeId: string) => void;
  moveNode: (nodeId: string, x: number, y: number) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void;
  deleteConnection: (connectionId: string) => void;
  setVariable: (name: string, value: VariableValue) => void;
  deleteVariable: (name: string) => void;
  markDirty: () => void;
  markClean: () => void;
  setLastSaveTime: (time: number) => void;

  // Execution actions
  startExecution: (execution: WorkflowExecution) => void;
  setCurrentNode: (nodeId: string | null) => void;
  setExecutionVariable: (name: string, value: VariableValue) => void;
  addExecutionLog: (
    nodeId: string,
    status: string,
    message?: string
  ) => void;
  stopExecution: () => void;

  // Utility actions
  reset: () => void;
  getNodeById: (nodeId: string) => NodeConfig | undefined;
  getConnectionById: (connectionId: string) => Connection | undefined;
  getConnectedNodes: (nodeId: string) => NodeConfig[];
  getIncomingConnections: (nodeId: string) => Connection[];
  getOutgoingConnections: (nodeId: string) => Connection[];
}

/**
 * Initial state
 */
const initialEditorState: EditorState = {
  selectedNodeId: null,
  selectedConnectionId: null,
  selectedNodeIds: new Set(),
  hoverNodeId: null,
  hoverConnectionId: null,
  isDragging: false,
  isDrawingConnection: false,
  drawingFromPortId: null,
  drawingToNodeId: null,
  contextMenu: {
    visible: false,
    x: 0,
    y: 0,
  },
};

const initialCanvasState: CanvasState = {
  panX: 0,
  panY: 0,
  zoom: 1,
  gridSize: 20,
  showGrid: true,
  snapToGrid: true,
};

const initialWorkflowState: WorkflowState = {
  workflow: null,
  nodes: [],
  connections: [],
  variables: {},
  isDirty: false,
  lastSaveTime: null,
};

const initialExecutionState: ExecutionState = {
  execution: null,
  isRunning: false,
  currentNodeId: null,
  executionVariables: {},
  executionLog: [],
};

/**
 * Create the Zustand store with Immer and Devtools middleware
 */
export const useWorkflowStore = create<WorkflowStore>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      ...initialEditorState,
      ...initialCanvasState,
      ...initialWorkflowState,
      ...initialExecutionState,

      // Editor actions
      selectNode: (nodeId: string | null, multiSelect = false) =>
        set(state => {
          if (nodeId === null) {
            state.selectedNodeId = null;
            state.selectedNodeIds.clear();
          } else {
            state.selectedNodeId = nodeId;
            if (multiSelect) {
              state.selectedNodeIds.add(nodeId);
            } else {
              state.selectedNodeIds.clear();
              state.selectedNodeIds.add(nodeId);
            }
          }
          state.selectedConnectionId = null;
        }),

      selectConnection: (connectionId: string | null) =>
        set(state => {
          state.selectedConnectionId = connectionId;
          state.selectedNodeId = null;
          state.selectedNodeIds.clear();
        }),

      clearSelection: () =>
        set(state => {
          state.selectedNodeId = null;
          state.selectedConnectionId = null;
          state.selectedNodeIds.clear();
        }),

      setHoverNode: (nodeId: string | null) =>
        set(state => {
          state.hoverNodeId = nodeId;
        }),

      setHoverConnection: (connectionId: string | null) =>
        set(state => {
          state.hoverConnectionId = connectionId;
        }),

      setDragging: (isDragging: boolean) =>
        set(state => {
          state.isDragging = isDragging;
        }),

      setDrawingConnection: (isDrawing, fromPortId, toNodeId) =>
        set(state => {
          state.isDrawingConnection = isDrawing;
          state.drawingFromPortId = fromPortId || null;
          state.drawingToNodeId = toNodeId || null;
        }),

      showContextMenu: (x, y, nodeId, connectionId) =>
        set(state => {
          state.contextMenu = {
            visible: true,
            x,
            y,
            nodeId,
            connectionId,
          };
        }),

      hideContextMenu: () =>
        set(state => {
          state.contextMenu.visible = false;
        }),

      // Canvas actions
      setPan: (x: number, y: number) =>
        set(state => {
          state.panX = x;
          state.panY = y;
        }),

      setZoom: (zoom: number) =>
        set(state => {
          state.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      panBy: (deltaX: number, deltaY: number) =>
        set(state => {
          state.panX += deltaX;
          state.panY += deltaY;
        }),

      zoomBy: (deltaZoom: number, centerX = 0, centerY = 0) =>
        set(state => {
          const oldZoom = state.zoom;
          const newZoom = Math.max(0.1, Math.min(5, state.zoom + deltaZoom));

          // Zoom toward center point
          if (centerX !== 0 || centerY !== 0) {
            const zoomRatio = (newZoom - oldZoom) / oldZoom;
            state.panX -= centerX * zoomRatio;
            state.panY -= centerY * zoomRatio;
          }

          state.zoom = newZoom;
        }),

      resetView: () =>
        set(state => {
          state.panX = 0;
          state.panY = 0;
          state.zoom = 1;
        }),

      setGridSize: (size: number) =>
        set(state => {
          state.gridSize = Math.max(5, size);
        }),

      toggleGrid: () =>
        set(state => {
          state.showGrid = !state.showGrid;
        }),

      toggleSnapToGrid: () =>
        set(state => {
          state.snapToGrid = !state.snapToGrid;
        }),

      fitToView: (padding = 50) =>
        set(state => {
          const { nodes } = state;
          if (nodes.length === 0) {
            state.panX = 0;
            state.panY = 0;
            state.zoom = 1;
            return;
          }

          // Calculate bounds
          let minX = nodes[0].x;
          let minY = nodes[0].y;
          let maxX = nodes[0].x + (nodes[0].width || 100);
          let maxY = nodes[0].y + (nodes[0].height || 60);

          for (const node of nodes) {
            minX = Math.min(minX, node.x);
            minY = Math.min(minY, node.y);
            maxX = Math.max(maxX, node.x + (node.width || 100));
            maxY = Math.max(maxY, node.y + (node.height || 60));
          }

          const width = maxX - minX + padding * 2;
          const height = maxY - minY + padding * 2;
          const viewportWidth = 1000; // Assuming typical viewport
          const viewportHeight = 600;

          const scaleX = viewportWidth / width;
          const scaleY = viewportHeight / height;
          const scale = Math.min(scaleX, scaleY, 1);

          state.zoom = scale;
          state.panX = (viewportWidth - width * scale) / 2 - minX * scale + padding;
          state.panY = (viewportHeight - height * scale) / 2 - minY * scale + padding;
        }),

      // Workflow actions
      setWorkflow: (workflow: Workflow) =>
        set(state => {
          state.workflow = workflow;
          state.nodes = workflow.nodes || [];
          state.connections = workflow.connections || [];
          state.variables = workflow.variables || {};
          state.isDirty = false;
        }),

      updateWorkflow: (updates: Partial<Workflow>) =>
        set(state => {
          if (state.workflow) {
            state.workflow = { ...state.workflow, ...updates };
            state.isDirty = true;
          }
        }),

      addNode: (node: NodeConfig) =>
        set(state => {
          state.nodes.push(node);
          state.isDirty = true;
        }),

      updateNode: (nodeId: string, updates: Partial<NodeConfig>) =>
        set(state => {
          const node = state.nodes.find(n => n.id === nodeId);
          if (node) {
            Object.assign(node, updates);
            state.isDirty = true;
          }
        }),

      deleteNode: (nodeId: string) =>
        set(state => {
          state.nodes = state.nodes.filter(n => n.id !== nodeId);
          state.connections = state.connections.filter(
            c => c.source !== nodeId && c.target !== nodeId
          );
          if (state.selectedNodeId === nodeId) {
            state.selectedNodeId = null;
            state.selectedNodeIds.delete(nodeId);
          }
          state.isDirty = true;
        }),

      moveNode: (nodeId: string, x: number, y: number) =>
        set(state => {
          const node = state.nodes.find(n => n.id === nodeId);
          if (node) {
            node.x = x;
            node.y = y;
            state.isDirty = true;
          }
        }),

      addConnection: (connection: Connection) =>
        set(state => {
          state.connections.push(connection);
          state.isDirty = true;
        }),

      updateConnection: (connectionId: string, updates: Partial<Connection>) =>
        set(state => {
          const connection = state.connections.find(c => c.id === connectionId);
          if (connection) {
            Object.assign(connection, updates);
            state.isDirty = true;
          }
        }),

      deleteConnection: (connectionId: string) =>
        set(state => {
          state.connections = state.connections.filter(c => c.id !== connectionId);
          if (state.selectedConnectionId === connectionId) {
            state.selectedConnectionId = null;
          }
          state.isDirty = true;
        }),

      setVariable: (name: string, value: VariableValue) =>
        set(state => {
          state.variables[name] = value;
          state.isDirty = true;
        }),

      deleteVariable: (name: string) =>
        set(state => {
          delete state.variables[name];
          state.isDirty = true;
        }),

      markDirty: () =>
        set(state => {
          state.isDirty = true;
        }),

      markClean: () =>
        set(state => {
          state.isDirty = false;
        }),

      setLastSaveTime: (time: number) =>
        set(state => {
          state.lastSaveTime = time;
        }),

      // Execution actions
      startExecution: (execution: WorkflowExecution) =>
        set(state => {
          state.execution = execution;
          state.isRunning = true;
          state.currentNodeId = execution.startNodeId || null;
          state.executionVariables = { ...execution.variables };
          state.executionLog = [];
        }),

      setCurrentNode: (nodeId: string | null) =>
        set(state => {
          state.currentNodeId = nodeId;
        }),

      setExecutionVariable: (name: string, value: VariableValue) =>
        set(state => {
          state.executionVariables[name] = value;
        }),

      addExecutionLog: (nodeId: string, status: string, message?: string) =>
        set(state => {
          state.executionLog.push({
            timestamp: Date.now(),
            nodeId,
            status,
            message,
          });
        }),

      stopExecution: () =>
        set(state => {
          state.isRunning = false;
          state.currentNodeId = null;
        }),

      // Utility actions
      reset: () =>
        set(() => ({
          ...initialEditorState,
          ...initialCanvasState,
          ...initialWorkflowState,
          ...initialExecutionState,
        })),

      getNodeById: (nodeId: string) => {
        const state = get();
        return state.nodes.find(n => n.id === nodeId);
      },

      getConnectionById: (connectionId: string) => {
        const state = get();
        return state.connections.find(c => c.id === connectionId);
      },

      getConnectedNodes: (nodeId: string) => {
        const state = get();
        const connectionIds = state.connections
          .filter(c => c.source === nodeId || c.target === nodeId)
          .map(c => (c.source === nodeId ? c.target : c.source));
        return state.nodes.filter(n => connectionIds.includes(n.id));
      },

      getIncomingConnections: (nodeId: string) => {
        const state = get();
        return state.connections.filter(c => c.target === nodeId);
      },

      getOutgoingConnections: (nodeId: string) => {
        const state = get();
        return state.connections.filter(c => c.source === nodeId);
      },
    })),
    { name: 'WorkflowStore' }
  )
);

/**
 * Hook selectors for better performance (prevent unnecessary re-renders)
 */
export const useEditorState = () =>
  useWorkflowStore(state => ({
    selectedNodeId: state.selectedNodeId,
    selectedConnectionId: state.selectedConnectionId,
    selectedNodeIds: state.selectedNodeIds,
    hoverNodeId: state.hoverNodeId,
    hoverConnectionId: state.hoverConnectionId,
    isDragging: state.isDragging,
    isDrawingConnection: state.isDrawingConnection,
    drawingFromPortId: state.drawingFromPortId,
    drawingToNodeId: state.drawingToNodeId,
    contextMenu: state.contextMenu,
  }));

export const useCanvasState = () =>
  useWorkflowStore(state => ({
    panX: state.panX,
    panY: state.panY,
    zoom: state.zoom,
    gridSize: state.gridSize,
    showGrid: state.showGrid,
    snapToGrid: state.snapToGrid,
  }));

export const useWorkflowData = () =>
  useWorkflowStore(state => ({
    workflow: state.workflow,
    nodes: state.nodes,
    connections: state.connections,
    variables: state.variables,
    isDirty: state.isDirty,
    lastSaveTime: state.lastSaveTime,
  }));

export const useExecutionState = () =>
  useWorkflowStore(state => ({
    execution: state.execution,
    isRunning: state.isRunning,
    currentNodeId: state.currentNodeId,
    executionVariables: state.executionVariables,
    executionLog: state.executionLog,
  }));
