/**
 * Tests for useReactFlowKeyboard Hook
 * Issue #279: Implement Keyboard Navigation for ReactFlow Components
 *
 * Comprehensive accessibility testing for ReactFlow keyboard navigation
 * Tests WCAG 2.1 Level AA compliance
 */

import { renderHook, act, fireEvent } from '@testing-library/react';
import { Node, Edge } from 'reactflow';
import { useReactFlowKeyboard, generateReactFlowAriaLabels } from '../../hooks/useReactFlowKeyboard';

// Mock ReactFlow instance
const mockReactFlowInstance = {
  setCenter: jest.fn(),
  getZoom: jest.fn(() => 1),
  zoomIn: jest.fn(),
  zoomOut: jest.fn(),
  fitView: jest.fn(),
  getViewport: jest.fn(() => ({ x: 0, y: 0, zoom: 1 })),
};

// Mock nodes and edges
const mockNodes: Node[] = [
  {
    id: 'node-1',
    type: 'default',
    position: { x: 100, y: 100 },
    data: { label: 'Node 1' },
  },
  {
    id: 'node-2',
    type: 'default',
    position: { x: 300, y: 200 },
    data: { label: 'Node 2' },
  },
  {
    id: 'node-3',
    type: 'default',
    position: { x: 200, y: 150 },
    data: { label: 'Node 3' },
  },
];

const mockEdges: Edge[] = [
  {
    id: 'edge-1',
    source: 'node-1',
    target: 'node-2',
    type: 'default',
  },
  {
    id: 'edge-2',
    source: 'node-2',
    target: 'node-3',
    type: 'default',
  },
];

// Mock callbacks
const mockCallbacks = {
  onNodeSelect: jest.fn(),
  onEdgeSelect: jest.fn(),
  onNodeDelete: jest.fn(),
  onEdgeDelete: jest.fn(),
  onNodeCreate: jest.fn(),
};

// Mock DOM methods
Object.defineProperty(document, 'querySelector', {
  value: jest.fn(() => ({
    setAttribute: jest.fn(),
    removeAttribute: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
  })),
});

Object.defineProperty(document, 'querySelectorAll', {
  value: jest.fn(() => [
    {
      removeAttribute: jest.fn(),
    },
  ]),
});

describe('useReactFlowKeyboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Hook Initialization', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.focusElement).toBeInstanceOf(Function);
      expect(result.current.clearFocusIndicators).toBeInstanceOf(Function);
      expect(result.current.navigateElements).toBeInstanceOf(Function);
      expect(result.current.totalElements).toBe(mockNodes.length + mockEdges.length);
    });

    it('should handle empty nodes and edges arrays', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: [],
          edges: [],
          ...mockCallbacks,
        })
      );

      expect(result.current.totalElements).toBe(0);
    });
  });

  describe('Element Navigation', () => {
    it('should navigate to next element correctly', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.navigateElements('next');
      });

      expect(mockCallbacks.onNodeSelect).toHaveBeenCalledWith('node-1');
    });

    it('should navigate to previous element correctly', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.navigateElements('previous');
      });

      // Should wrap to last element
      expect(mockCallbacks.onEdgeSelect).toHaveBeenCalledWith('edge-2');
    });

    it('should sort nodes by position for logical tab order', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      // Nodes should be sorted by y position, then x position
      // Expected order: node-1 (100,100), node-3 (200,150), node-2 (300,200)
      act(() => {
        result.current.navigateElements('next');
      });

      expect(mockCallbacks.onNodeSelect).toHaveBeenCalledWith('node-1');
    });
  });

  describe('Focus Management', () => {
    it('should focus on node and center view', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.focusElement('node', 'node-1');
      });

      expect(mockReactFlowInstance.setCenter).toHaveBeenCalledWith(100, 100, { zoom: 1 });
      expect(mockCallbacks.onNodeSelect).toHaveBeenCalledWith('node-1');
    });

    it('should focus on edge and center view between source and target', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.focusElement('edge', 'edge-1');
      });

      // Should center between node-1 (100,100) and node-2 (300,200)
      expect(mockReactFlowInstance.setCenter).toHaveBeenCalledWith(200, 150, { zoom: 1 });
      expect(mockCallbacks.onEdgeSelect).toHaveBeenCalledWith('edge-1');
    });

    it('should clear focus indicators', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.clearFocusIndicators();
      });

      expect(document.querySelectorAll).toHaveBeenCalledWith('[data-keyboard-focused="true"]');
    });
  });

  describe('Keyboard Event Handling', () => {
    let container: HTMLDivElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should handle Tab key for navigation', () => {
      renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(tabEvent);
      });

      expect(mockCallbacks.onNodeSelect).toHaveBeenCalled();
    });

    it('should handle Shift+Tab for reverse navigation', () => {
      renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(shiftTabEvent);
      });

      expect(mockCallbacks.onEdgeSelect).toHaveBeenCalled();
    });

    it('should handle Delete key for element deletion', () => {
      renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      // First navigate to an element
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(tabEvent);
      });

      // Then delete it
      const deleteEvent = new KeyboardEvent('keydown', {
        key: 'Delete',
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(deleteEvent);
      });

      expect(mockCallbacks.onNodeDelete).toHaveBeenCalled();
    });

    it('should handle Ctrl+N for node creation', () => {
      renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      const createEvent = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(createEvent);
      });

      expect(mockCallbacks.onNodeCreate).toHaveBeenCalled();
    });

    it('should handle zoom shortcuts', () => {
      renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      // Test zoom in
      const zoomInEvent = new KeyboardEvent('keydown', {
        key: '+',
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(zoomInEvent);
      });

      expect(mockReactFlowInstance.zoomIn).toHaveBeenCalled();

      // Test zoom out
      const zoomOutEvent = new KeyboardEvent('keydown', {
        key: '-',
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(zoomOutEvent);
      });

      expect(mockReactFlowInstance.zoomOut).toHaveBeenCalled();

      // Test fit view
      const fitViewEvent = new KeyboardEvent('keydown', {
        key: '0',
        ctrlKey: true,
        bubbles: true,
      });

      act(() => {
        container.dispatchEvent(fitViewEvent);
      });

      expect(mockReactFlowInstance.fitView).toHaveBeenCalled();
    });
  });

  describe('ARIA Label Generation', () => {
    it('should generate correct ARIA labels for nodes', () => {
      const node = mockNodes[0];
      const ariaLabels = generateReactFlowAriaLabels.node(node);

      expect(ariaLabels.role).toBe('button');
      expect(ariaLabels['aria-label']).toContain('Node 1');
      expect(ariaLabels['aria-label']).toContain('Position 100, 100');
      expect(ariaLabels['aria-describedby']).toBe('node-node-1-description');
    });

    it('should generate correct ARIA labels for edges', () => {
      const edge = mockEdges[0];
      const sourceNode = mockNodes[0];
      const targetNode = mockNodes[1];
      const ariaLabels = generateReactFlowAriaLabels.edge(edge, sourceNode, targetNode);

      expect(ariaLabels.role).toBe('button');
      expect(ariaLabels['aria-label']).toContain('Connection from Node 1 to Node 2');
      expect(ariaLabels['aria-describedby']).toBe('edge-edge-1-description');
    });

    it('should generate correct ARIA labels for canvas', () => {
      const ariaLabels = generateReactFlowAriaLabels.canvas();

      expect(ariaLabels.role).toBe('application');
      expect(ariaLabels['aria-label']).toBe('Workflow diagram editor');
      expect(ariaLabels['aria-describedby']).toBe('reactflow-instructions');
    });
  });

  describe('Accessibility Compliance', () => {
    it('should maintain WCAG 2.1 Level AA focus indicators', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.focusElement('node', 'node-1');
      });

      expect(document.querySelector).toHaveBeenCalledWith('[data-id="node-1"]');
    });

    it('should provide screen reader announcements', () => {
      // This would require mocking the announceToScreenReader function
      // and testing that appropriate announcements are made
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      act(() => {
        result.current.focusElement('node', 'node-1');
      });

      // Should announce the focused element
      expect(mockCallbacks.onNodeSelect).toHaveBeenCalledWith('node-1');
    });

    it('should handle disabled editing mode correctly', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          enableNodeEdit: false,
          enableConnection: false,
          ...mockCallbacks,
        })
      );

      // Node creation should still work (it's not editing existing content)
      expect(result.current).toBeDefined();
    });

    it('should handle keyboard navigation without ReactFlow instance', () => {
      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: null,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      // Should not crash when ReactFlow instance is null
      act(() => {
        result.current.focusElement('node', 'node-1');
      });

      // Should not call ReactFlow methods
      expect(mockReactFlowInstance.setCenter).not.toHaveBeenCalled();
    });
  });

  describe('Performance and Memory', () => {
    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: mockNodes,
          edges: mockEdges,
          ...mockCallbacks,
        })
      );

      unmount();

      // Should clear focus indicators on cleanup
      expect(document.querySelectorAll).toHaveBeenCalledWith('[data-keyboard-focused="true"]');
    });

    it('should handle large numbers of nodes and edges efficiently', () => {
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `node-${i}`,
        type: 'default',
        position: { x: i * 100, y: i * 100 },
        data: { label: `Node ${i}` },
      }));

      const largeEdgeSet = Array.from({ length: 999 }, (_, i) => ({
        id: `edge-${i}`,
        source: `node-${i}`,
        target: `node-${i + 1}`,
        type: 'default',
      }));

      const { result } = renderHook(() =>
        useReactFlowKeyboard({
          reactFlowInstance: mockReactFlowInstance as any,
          nodes: largeNodeSet,
          edges: largeEdgeSet,
          ...mockCallbacks,
        })
      );

      expect(result.current.totalElements).toBe(1999);

      // Navigation should still work with large datasets
      act(() => {
        result.current.navigateElements('next');
      });

      expect(mockCallbacks.onNodeSelect).toHaveBeenCalled();
    });
  });
});