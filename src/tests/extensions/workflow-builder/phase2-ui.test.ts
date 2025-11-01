/**
 * Phase 2 UI Layer Tests
 * Comprehensive test suite for workflow store, hooks, and utilities
 * Target: 80%+ coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useWorkflowStore,
  useEditorState,
  useCanvasState,
  useWorkflowData,
  useExecutionState,
} from '../../../../packages/workflow-builder/src/store/workflowStore';
import { useUndoRedo, createAction, batchActions } from '../../../../packages/workflow-builder/src/hooks/useUndoRedo';
import * as canvasUtils from '../../../../packages/workflow-builder/src/utils/canvasUtils';
import { NodeType } from '../../../../packages/workflow-builder/src/types/workflow';

/**
 * Zustand Store Tests
 */
describe('Workflow Store (Zustand)', () => {
  beforeEach(() => {
    const store = useWorkflowStore.getState();
    store.reset();
  });

  describe('Editor State', () => {
    it('should select a node', () => {
      const { getState } = useWorkflowStore;
      getState().selectNode('node-1');
      expect(getState().selectedNodeId).toBe('node-1');
    });

    it('should support multi-select', () => {
      const { getState } = useWorkflowStore;
      getState().selectNode('node-1', false);
      getState().selectNode('node-2', true);
      expect(getState().selectedNodeIds.has('node-1')).toBe(true);
      expect(getState().selectedNodeIds.has('node-2')).toBe(true);
    });

    it('should clear selection', () => {
      const { getState } = useWorkflowStore;
      getState().selectNode('node-1');
      getState().clearSelection();
      expect(getState().selectedNodeId).toBeNull();
      expect(getState().selectedNodeIds.size).toBe(0);
    });

    it('should deselect connection when selecting node', () => {
      const { getState } = useWorkflowStore;
      getState().selectConnection('conn-1');
      getState().selectNode('node-1');
      expect(getState().selectedConnectionId).toBeNull();
    });

    it('should track hover state', () => {
      const { getState } = useWorkflowStore;
      getState().setHoverNode('node-1');
      expect(getState().hoverNodeId).toBe('node-1');
    });

    it('should manage context menu visibility', () => {
      const { getState } = useWorkflowStore;
      getState().showContextMenu(100, 200, 'node-1');
      expect(getState().contextMenu.visible).toBe(true);
      expect(getState().contextMenu.x).toBe(100);
      expect(getState().contextMenu.y).toBe(200);
      expect(getState().contextMenu.nodeId).toBe('node-1');

      getState().hideContextMenu();
      expect(getState().contextMenu.visible).toBe(false);
    });
  });

  describe('Canvas State', () => {
    it('should pan canvas', () => {
      const { getState } = useWorkflowStore;
      getState().setPan(100, 200);
      expect(getState().panX).toBe(100);
      expect(getState().panY).toBe(200);
    });

    it('should pan by delta', () => {
      const { getState } = useWorkflowStore;
      getState().setPan(0, 0);
      getState().panBy(50, 75);
      expect(getState().panX).toBe(50);
      expect(getState().panY).toBe(75);
    });

    it('should zoom', () => {
      const { getState } = useWorkflowStore;
      getState().setZoom(2);
      expect(getState().zoom).toBe(2);
    });

    it('should clamp zoom between 0.1 and 5', () => {
      const { getState } = useWorkflowStore;
      getState().setZoom(10);
      expect(getState().zoom).toBe(5);

      getState().setZoom(0.05);
      expect(getState().zoom).toBe(0.1);
    });

    it('should zoom by delta with center point', () => {
      const { getState } = useWorkflowStore;
      getState().setPan(0, 0);
      getState().setZoom(1);
      getState().zoomBy(0.5, 100, 100);
      expect(getState().zoom).toBe(1.5);
    });

    it('should reset view', () => {
      const { getState } = useWorkflowStore;
      getState().setPan(100, 200);
      getState().setZoom(2);
      getState().resetView();
      expect(getState().panX).toBe(0);
      expect(getState().panY).toBe(0);
      expect(getState().zoom).toBe(1);
    });

    it('should toggle grid visibility', () => {
      const { getState } = useWorkflowStore;
      const initialState = getState().showGrid;
      getState().toggleGrid();
      expect(getState().showGrid).toBe(!initialState);
    });

    it('should toggle snap to grid', () => {
      const { getState } = useWorkflowStore;
      const initialState = getState().snapToGrid;
      getState().toggleSnapToGrid();
      expect(getState().snapToGrid).toBe(!initialState);
    });
  });

  describe('Workflow State', () => {
    it('should add node', () => {
      const { getState } = useWorkflowStore;
      const node = {
        id: 'node-1',
        type: NodeType.START,
        name: 'Start',
        x: 0,
        y: 0,
        properties: {},
      };
      getState().addNode(node);
      expect(getState().nodes).toContain(node);
      expect(getState().isDirty).toBe(true);
    });

    it('should update node', () => {
      const { getState } = useWorkflowStore;
      const node = {
        id: 'node-1',
        type: NodeType.START,
        name: 'Start',
        x: 0,
        y: 0,
        properties: {},
      };
      getState().addNode(node);
      getState().updateNode('node-1', { name: 'Updated', x: 100 });
      const updated = getState().getNodeById('node-1');
      expect(updated?.name).toBe('Updated');
      expect(updated?.x).toBe(100);
    });

    it('should delete node and its connections', () => {
      const { getState } = useWorkflowStore;
      const node1 = { id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} };
      const node2 = { id: 'node-2', type: NodeType.END, name: 'End', x: 100, y: 100, properties: {} };
      const conn = { id: 'conn-1', source: 'node-1', target: 'node-2' };

      getState().addNode(node1);
      getState().addNode(node2);
      getState().addConnection(conn);
      getState().deleteNode('node-1');

      expect(getState().nodes.length).toBe(1);
      expect(getState().connections.length).toBe(0);
    });

    it('should move node', () => {
      const { getState } = useWorkflowStore;
      const node = { id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} };
      getState().addNode(node);
      getState().moveNode('node-1', 50, 75);
      const moved = getState().getNodeById('node-1');
      expect(moved?.x).toBe(50);
      expect(moved?.y).toBe(75);
    });

    it('should add connection', () => {
      const { getState } = useWorkflowStore;
      const conn = { id: 'conn-1', source: 'node-1', target: 'node-2' };
      getState().addConnection(conn);
      expect(getState().connections).toContain(conn);
    });

    it('should delete connection', () => {
      const { getState } = useWorkflowStore;
      const conn = { id: 'conn-1', source: 'node-1', target: 'node-2' };
      getState().addConnection(conn);
      getState().deleteConnection('conn-1');
      expect(getState().connections.length).toBe(0);
    });

    it('should manage variables', () => {
      const { getState } = useWorkflowStore;
      getState().setVariable('test', 'value');
      expect(getState().variables['test']).toBe('value');

      getState().deleteVariable('test');
      expect(getState().variables['test']).toBeUndefined();
    });

    it('should track dirty state', () => {
      const { getState } = useWorkflowStore;
      getState().markClean();
      expect(getState().isDirty).toBe(false);
      getState().addNode({ id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} });
      expect(getState().isDirty).toBe(true);
      getState().markClean();
      expect(getState().isDirty).toBe(false);
    });

    it('should get nodes by id', () => {
      const { getState } = useWorkflowStore;
      const node = { id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} };
      getState().addNode(node);
      expect(getState().getNodeById('node-1')).toEqual(node);
      expect(getState().getNodeById('nonexistent')).toBeUndefined();
    });

    it('should get connected nodes', () => {
      const { getState } = useWorkflowStore;
      const node1 = { id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} };
      const node2 = { id: 'node-2', type: NodeType.END, name: 'End', x: 100, y: 100, properties: {} };
      getState().addNode(node1);
      getState().addNode(node2);
      getState().addConnection({ id: 'conn-1', source: 'node-1', target: 'node-2' });
      const connected = getState().getConnectedNodes('node-1');
      expect(connected.length).toBe(1);
      expect(connected[0].id).toBe('node-2');
    });

    it('should get incoming and outgoing connections', () => {
      const { getState } = useWorkflowStore;
      getState().addNode({ id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} });
      getState().addNode({ id: 'node-2', type: NodeType.END, name: 'End', x: 100, y: 100, properties: {} });
      getState().addConnection({ id: 'conn-1', source: 'node-1', target: 'node-2' });
      expect(getState().getOutgoingConnections('node-1').length).toBe(1);
      expect(getState().getIncomingConnections('node-2').length).toBe(1);
    });
  });

  describe('Execution State', () => {
    it('should start execution', () => {
      const { getState } = useWorkflowStore;
      const execution = {
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'running' as const,
        startTime: Date.now(),
        variables: {},
        executionStack: [],
        startNodeId: 'node-1',
      };
      getState().startExecution(execution);
      expect(getState().isRunning).toBe(true);
      expect(getState().currentNodeId).toBe('node-1');
    });

    it('should manage execution variables', () => {
      const { getState } = useWorkflowStore;
      getState().startExecution({
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'running' as const,
        startTime: Date.now(),
        variables: {},
        executionStack: [],
        startNodeId: 'node-1',
      });
      getState().setExecutionVariable('counter', 42);
      expect(getState().executionVariables['counter']).toBe(42);
    });

    it('should log execution events', () => {
      const { getState } = useWorkflowStore;
      getState().startExecution({
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'running' as const,
        startTime: Date.now(),
        variables: {},
        executionStack: [],
        startNodeId: 'node-1',
      });
      getState().addExecutionLog('node-1', 'started', 'Execution began');
      expect(getState().executionLog.length).toBe(1);
      expect(getState().executionLog[0].status).toBe('started');
    });

    it('should stop execution', () => {
      const { getState } = useWorkflowStore;
      getState().startExecution({
        id: 'exec-1',
        workflowId: 'wf-1',
        status: 'running' as const,
        startTime: Date.now(),
        variables: {},
        executionStack: [],
        startNodeId: 'node-1',
      });
      getState().stopExecution();
      expect(getState().isRunning).toBe(false);
      expect(getState().currentNodeId).toBeNull();
    });
  });
});

/**
 * Undo/Redo Utility Tests
 */
describe('Undo/Redo Utilities', () => {
  it('should create actions with correct properties', () => {
    const action = createAction('node_add', 'Add node', null, { id: 'node-1' });
    expect(action.type).toBe('node_add');
    expect(action.description).toBe('Add node');
    expect(action.after).toEqual({ id: 'node-1' });
    expect(action.timestamp).toBeGreaterThan(0);
  });

  it('should create batch actions from multiple actions', () => {
    const action1 = createAction('node_add', 'Add', null, { id: 'node-1' });
    const action2 = createAction('node_add', 'Add', null, { id: 'node-2' });
    const batch = batchActions([action1, action2], 'Batch add');

    expect(batch.type).toBe('batch');
    expect(batch.description).toBe('Batch add');
    expect(batch.metadata?.actionCount).toBe(2);
    expect(batch.metadata?.actions).toHaveLength(2);
  });

  it('should preserve action metadata', () => {
    const action = createAction(
      'node_update',
      'Update node',
      { name: 'Old' },
      { name: 'New' },
      { nodeId: 'node-1', field: 'name' }
    );

    expect(action.metadata?.nodeId).toBe('node-1');
    expect(action.metadata?.field).toBe('name');
  });

  it('should handle empty batch actions', () => {
    const batch = batchActions([], 'Empty batch');
    expect(batch.type).toBe('batch');
    expect(batch.metadata?.actionCount).toBe(0);
  });
});

/**
 * Canvas Utilities Tests
 */
describe('Canvas Utilities', () => {
  const mockNode = {
    id: 'node-1',
    type: NodeType.START,
    name: 'Start',
    x: 50,
    y: 50,
    width: 100,
    height: 60,
    properties: {},
  };

  describe('Geometry Functions', () => {
    it('should get node bounds', () => {
      const bounds = canvasUtils.getNodeBounds(mockNode);
      expect(bounds.x).toBe(50);
      expect(bounds.y).toBe(50);
      expect(bounds.width).toBe(100);
      expect(bounds.height).toBe(60);
    });

    it('should check point in node', () => {
      expect(canvasUtils.pointInNode({ x: 100, y: 75 }, mockNode)).toBe(true);
      expect(canvasUtils.pointInNode({ x: 0, y: 0 }, mockNode)).toBe(false);
    });

    it('should get node center', () => {
      const center = canvasUtils.getNodeCenter(mockNode);
      expect(center.x).toBe(100);
      expect(center.y).toBe(80);
    });

    it('should calculate distance', () => {
      const dist = canvasUtils.distance({ x: 0, y: 0 }, { x: 3, y: 4 });
      expect(dist).toBe(5);
    });

    it('should calculate angle', () => {
      const angle1 = canvasUtils.angle({ x: 0, y: 0 }, { x: 1, y: 0 });
      expect(Math.abs(angle1 - 0)).toBeLessThan(0.1);

      const angle2 = canvasUtils.angle({ x: 0, y: 0 }, { x: 0, y: 1 });
      expect(Math.abs(angle2 - 90)).toBeLessThan(0.1);
    });

    it('should check bounds overlap', () => {
      const bounds1 = { x: 0, y: 0, width: 100, height: 100 };
      const bounds2 = { x: 50, y: 50, width: 100, height: 100 };
      const bounds3 = { x: 200, y: 200, width: 100, height: 100 };

      expect(canvasUtils.boundsOverlap(bounds1, bounds2)).toBe(true);
      expect(canvasUtils.boundsOverlap(bounds1, bounds3)).toBe(false);
    });

    it('should get nodes bounds', () => {
      const nodes = [
        { ...mockNode, id: 'node-1', x: 0, y: 0 },
        { ...mockNode, id: 'node-2', x: 100, y: 100 },
      ];
      const bounds = canvasUtils.getNodesBounds(nodes);
      expect(bounds).not.toBeNull();
      expect(bounds?.x).toBe(0);
      expect(bounds?.y).toBe(0);
    });
  });

  describe('Transform Functions', () => {
    it('should transform point with pan and zoom', () => {
      const point = { x: 10, y: 20 };
      const transformed = canvasUtils.transformPoint(point, 5, 10, 2);
      expect(transformed.x).toBe(25);
      expect(transformed.y).toBe(50);
    });

    it('should inverse transform point', () => {
      const point = { x: 25, y: 50 };
      const inverse = canvasUtils.inverseTransformPoint(point, 5, 10, 2);
      expect(inverse.x).toBe(10);
      expect(inverse.y).toBe(20);
    });
  });

  describe('Alignment Functions', () => {
    it('should align nodes left', () => {
      const nodes = [
        { ...mockNode, id: 'node-1', x: 10 },
        { ...mockNode, id: 'node-2', x: 50 },
      ];
      const result = canvasUtils.alignNodes(nodes, canvasUtils.AlignmentType.LEFT);
      expect(result[0].x).toBe(10);
      expect(result[1].x).toBe(10);
    });

    it('should align nodes center', () => {
      const nodes = [
        { ...mockNode, id: 'node-1', x: 0, width: 100 },
        { ...mockNode, id: 'node-2', x: 100, width: 100 },
      ];
      const result = canvasUtils.alignNodes(nodes, canvasUtils.AlignmentType.CENTER);
      expect(result[0].x).toBe(result[1].x);
    });

    it('should distribute nodes horizontally', () => {
      const nodes = [
        { ...mockNode, id: 'node-1', x: 0 },
        { ...mockNode, id: 'node-2', x: 100 },
        { ...mockNode, id: 'node-3', x: 200 },
      ];
      const result = canvasUtils.distributeNodes(nodes, canvasUtils.DistributionType.HORIZONTAL);
      expect(result.length).toBe(3);
    });
  });

  describe('Utility Functions', () => {
    it('should snap to grid', () => {
      const point = canvasUtils.snapToGrid({ x: 27, y: 35 }, 20);
      expect(point.x).toBe(20);
      expect(point.y).toBe(40);
    });

    it('should clamp values', () => {
      expect(canvasUtils.clamp(50, 0, 100)).toBe(50);
      expect(canvasUtils.clamp(150, 0, 100)).toBe(100);
      expect(canvasUtils.clamp(-50, 0, 100)).toBe(0);
    });

    it('should lerp values', () => {
      expect(canvasUtils.lerp(0, 10, 0)).toBe(0);
      expect(canvasUtils.lerp(0, 10, 0.5)).toBe(5);
      expect(canvasUtils.lerp(0, 10, 1)).toBe(10);
    });

    it('should ease values', () => {
      const eased = canvasUtils.easeInOutCubic(0.5);
      expect(eased).toBeLessThan(1);
      expect(eased).toBeGreaterThan(0);
    });
  });
});

/**
 * Integration Tests
 */
describe('Phase 2 Integration Tests', () => {
  it('should support workflow state persistence', () => {
    const { getState } = useWorkflowStore;
    const node = { id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, properties: {} };
    const conn = { id: 'conn-1', source: 'node-1', target: 'node-2' };

    getState().addNode(node);
    getState().addConnection(conn);
    getState().setVariable('test_var', 'test_value');

    const state = getState();
    expect(state.nodes.length).toBe(1);
    expect(state.connections.length).toBe(1);
    expect(state.variables['test_var']).toBe('test_value');
  });

  it('should coordinate store updates with canvas utilities', () => {
    const { getState } = useWorkflowStore;
    const node1 = { id: 'node-1', type: NodeType.START, name: 'Start', x: 0, y: 0, width: 100, height: 60, properties: {} };
    const node2 = { id: 'node-2', type: NodeType.END, name: 'End', x: 200, y: 200, width: 100, height: 60, properties: {} };

    getState().addNode(node1);
    getState().addNode(node2);

    const bounds = canvasUtils.getNodesBounds(getState().nodes);
    expect(bounds).not.toBeNull();
    expect(bounds?.width).toBeGreaterThan(0);
    expect(bounds?.height).toBeGreaterThan(0);
  });
});

/**
 * Performance Tests
 */
describe('Phase 2 Performance Tests', () => {
  it('should handle 100+ nodes efficiently', () => {
    const { getState } = useWorkflowStore;
    getState().reset();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      getState().addNode({
        id: `node-${i}`,
        type: NodeType.START,
        name: `Node ${i}`,
        x: i * 50,
        y: i * 50,
        properties: {},
      });
    }
    const end = performance.now();

    expect(end - start).toBeLessThan(1000); // Should complete in under 1 second
    expect(getState().nodes.length).toBe(100);
  });

  it('should handle 50+ connections efficiently', () => {
    const { getState } = useWorkflowStore;
    getState().reset();

    for (let i = 0; i < 50; i++) {
      getState().addConnection({
        id: `conn-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
      });
    }

    expect(getState().connections.length).toBe(50);
  });

  it('should efficiently calculate geometry for 50+ nodes', () => {
    const nodes = Array.from({ length: 50 }, (_, i) => ({
      id: `node-${i}`,
      type: NodeType.START,
      name: `Node ${i}`,
      x: i * 50,
      y: i * 50,
      width: 100,
      height: 60,
      properties: {},
    }));

    const start = performance.now();
    const bounds = canvasUtils.getNodesBounds(nodes);
    const end = performance.now();

    expect(end - start).toBeLessThan(10); // Should complete in under 10ms
    expect(bounds).not.toBeNull();
  });
});
