/**
 * useReactFlowKeyboard Hook
 * Issue #279: Implement Keyboard Navigation for ReactFlow Components
 *
 * Provides comprehensive keyboard navigation for ReactFlow components
 * Implements WCAG 2.1 Level AA compliant keyboard interaction patterns
 */

import { useCallback, useEffect, useRef } from 'react';
import { Node, Edge, ReactFlowInstance } from 'reactflow';
import { useKeyboardHandler, KEYBOARD_KEYS } from './useKeyboardHandler';
import { useFocusManagement } from './useFocusManagement';
import { ARIA_ROLES, generateAriaLabel, announceToScreenReader } from '../utils/ariaUtils';

export interface ReactFlowKeyboardOptions {
  /** ReactFlow instance reference */
  reactFlowInstance: ReactFlowInstance | null;
  /** Current nodes */
  nodes: Node[];
  /** Current edges */
  edges: Edge[];
  /** Callback when node is selected */
  onNodeSelect?: (nodeId: string) => void;
  /** Callback when edge is selected */
  onEdgeSelect?: (edgeId: string) => void;
  /** Callback for node deletion */
  onNodeDelete?: (nodeId: string) => void;
  /** Callback for edge deletion */
  onEdgeDelete?: (edgeId: string) => void;
  /** Callback for creating new node */
  onNodeCreate?: (position: { x: number; y: number }) => void;
  /** Enable node editing mode */
  enableNodeEdit?: boolean;
  /** Enable connection mode */
  enableConnection?: boolean;
}

export interface ReactFlowKeyboardState {
  /** Currently focused element (node or edge) */
  focusedElement: {
    type: 'node' | 'edge' | 'canvas' | null;
    id: string | null;
  };
  /** Current navigation mode */
  mode: 'navigate' | 'edit' | 'connect';
  /** Selected elements for multi-selection */
  selectedElements: string[];
}

/**
 * ReactFlow-specific keyboard navigation patterns
 */
export const REACTFLOW_KEYBOARD_SHORTCUTS = {
  // Navigation
  FOCUS_NEXT_NODE: KEYBOARD_KEYS.TAB,
  FOCUS_PREVIOUS_NODE: [KEYBOARD_KEYS.TAB, 'Shift'],
  MOVE_UP: KEYBOARD_KEYS.ARROW_UP,
  MOVE_DOWN: KEYBOARD_KEYS.ARROW_DOWN,
  MOVE_LEFT: KEYBOARD_KEYS.ARROW_LEFT,
  MOVE_RIGHT: KEYBOARD_KEYS.ARROW_RIGHT,

  // Selection
  SELECT_ELEMENT: KEYBOARD_KEYS.ENTER,
  SELECT_MULTIPLE: [KEYBOARD_KEYS.SPACE, 'Ctrl'],
  SELECT_ALL: ['a', 'Ctrl'],
  DESELECT_ALL: KEYBOARD_KEYS.ESCAPE,

  // Editing
  DELETE_ELEMENT: ['Delete', 'Backspace'],
  EDIT_NODE: ['F2', KEYBOARD_KEYS.ENTER],

  // Creation
  CREATE_NODE: ['n', 'Ctrl'],
  CONNECT_MODE: ['c', 'Ctrl'],

  // Zoom and Pan
  ZOOM_IN: ['+', 'Ctrl'],
  ZOOM_OUT: ['-', 'Ctrl'],
  ZOOM_FIT: ['0', 'Ctrl'],
  CENTER_VIEW: ['h', 'Ctrl'],
} as const;

/**
 * Hook for comprehensive ReactFlow keyboard navigation
 */
export const useReactFlowKeyboard = (options: ReactFlowKeyboardOptions) => {
  const {
    reactFlowInstance,
    nodes,
    edges,
    onNodeSelect,
    onEdgeSelect,
    onNodeDelete,
    onEdgeDelete,
    onNodeCreate,
    enableNodeEdit = true,
    enableConnection = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const currentFocusIndex = useRef<number>(0);
  const navigationMode = useRef<'nodes' | 'edges'>('nodes');

  const { announceToScreenReader: announce } = useFocusManagement();

  // Get navigable elements in order
  const getNavigableElements = useCallback(() => {
    const elements = [];

    // Add nodes first (sorted by position for logical tab order)
    const sortedNodes = [...nodes].sort((a, b) => {
      if (Math.abs(a.position.y - b.position.y) < 50) {
        return a.position.x - b.position.x; // Same row, sort by x
      }
      return a.position.y - b.position.y; // Different rows, sort by y
    });

    elements.push(...sortedNodes.map(node => ({ type: 'node' as const, id: node.id, element: node })));
    elements.push(...edges.map(edge => ({ type: 'edge' as const, id: edge.id, element: edge })));

    return elements;
  }, [nodes, edges]);

  // Focus management for ReactFlow elements
  const focusElement = useCallback((elementType: 'node' | 'edge', elementId: string) => {
    if (!reactFlowInstance) return;

    if (elementType === 'node') {
      const node = nodes.find(n => n.id === elementId);
      if (node) {
        // Center the node in view
        reactFlowInstance.setCenter(node.position.x, node.position.y, { zoom: reactFlowInstance.getZoom() });

        // Apply visual focus indicator
        const nodeElement = document.querySelector(`[data-id="${elementId}"]`);
        if (nodeElement) {
          nodeElement.setAttribute('data-keyboard-focused', 'true');
          nodeElement.setAttribute('tabindex', '0');
          (nodeElement as HTMLElement).focus();
        }

        // Announce to screen reader
        announce(`Focused on node: ${node.data?.label || elementId}`);

        onNodeSelect?.(elementId);
      }
    } else if (elementType === 'edge') {
      const edge = edges.find(e => e.id === elementId);
      if (edge) {
        // Center the edge in view
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const centerX = (sourceNode.position.x + targetNode.position.x) / 2;
          const centerY = (sourceNode.position.y + targetNode.position.y) / 2;
          reactFlowInstance.setCenter(centerX, centerY, { zoom: reactFlowInstance.getZoom() });
        }

        // Apply visual focus indicator
        const edgeElement = document.querySelector(`[data-id="${elementId}"]`);
        if (edgeElement) {
          edgeElement.setAttribute('data-keyboard-focused', 'true');
          edgeElement.setAttribute('tabindex', '0');
          (edgeElement as HTMLElement).focus();
        }

        // Announce to screen reader
        announce(`Focused on connection from ${edge.source} to ${edge.target}`);

        onEdgeSelect?.(elementId);
      }
    }
  }, [reactFlowInstance, nodes, edges, onNodeSelect, onEdgeSelect, announce]);

  // Clear all focus indicators
  const clearFocusIndicators = useCallback(() => {
    const focusedElements = document.querySelectorAll('[data-keyboard-focused="true"]');
    focusedElements.forEach(el => {
      el.removeAttribute('data-keyboard-focused');
      el.removeAttribute('tabindex');
    });
  }, []);

  // Navigate to next/previous element
  const navigateElements = useCallback((direction: 'next' | 'previous') => {
    const elements = getNavigableElements();
    if (elements.length === 0) return;

    clearFocusIndicators();

    if (direction === 'next') {
      currentFocusIndex.current = (currentFocusIndex.current + 1) % elements.length;
    } else {
      currentFocusIndex.current = currentFocusIndex.current <= 0
        ? elements.length - 1
        : currentFocusIndex.current - 1;
    }

    const element = elements[currentFocusIndex.current];
    focusElement(element.type, element.id);
  }, [getNavigableElements, clearFocusIndicators, focusElement]);

  // Handle element deletion
  const handleDelete = useCallback(() => {
    const elements = getNavigableElements();
    if (elements.length === 0 || currentFocusIndex.current >= elements.length) return;

    const element = elements[currentFocusIndex.current];

    if (element.type === 'node') {
      onNodeDelete?.(element.id);
      announce(`Deleted node: ${element.id}`);
    } else if (element.type === 'edge') {
      onEdgeDelete?.(element.id);
      announce(`Deleted connection: ${element.id}`);
    }

    // Move focus to next element after deletion
    setTimeout(() => {
      const updatedElements = getNavigableElements();
      if (updatedElements.length > 0) {
        currentFocusIndex.current = Math.min(currentFocusIndex.current, updatedElements.length - 1);
        const nextElement = updatedElements[currentFocusIndex.current];
        focusElement(nextElement.type, nextElement.id);
      }
    }, 100);
  }, [getNavigableElements, onNodeDelete, onEdgeDelete, announce, focusElement]);

  // Handle zoom operations
  const handleZoom = useCallback((action: 'in' | 'out' | 'fit' | 'center') => {
    if (!reactFlowInstance) return;

    switch (action) {
      case 'in':
        reactFlowInstance.zoomIn();
        announce('Zoomed in');
        break;
      case 'out':
        reactFlowInstance.zoomOut();
        announce('Zoomed out');
        break;
      case 'fit':
        reactFlowInstance.fitView();
        announce('Fit view to content');
        break;
      case 'center':
        const elements = getNavigableElements();
        if (elements.length > 0 && currentFocusIndex.current < elements.length) {
          const element = elements[currentFocusIndex.current];
          if (element.type === 'node') {
            const node = nodes.find(n => n.id === element.id);
            if (node) {
              reactFlowInstance.setCenter(node.position.x, node.position.y);
              announce('Centered on focused element');
            }
          }
        }
        break;
    }
  }, [reactFlowInstance, getNavigableElements, nodes, announce]);

  // Handle node creation
  const handleCreateNode = useCallback(() => {
    if (!reactFlowInstance || !onNodeCreate) return;

    // Get viewport center for new node placement
    const viewport = reactFlowInstance.getViewport();
    const zoom = reactFlowInstance.getZoom();
    const bounds = reactFlowInstance.getViewport();

    const position = {
      x: -bounds.x / zoom,
      y: -bounds.y / zoom,
    };

    onNodeCreate(position);
    announce('Created new node');
  }, [reactFlowInstance, onNodeCreate, announce]);

  // Keyboard event handlers
  const keyboardHandlers = {
    // Navigation
    [KEYBOARD_KEYS.TAB]: (event: KeyboardEvent) => {
      event.preventDefault();
      navigateElements(event.shiftKey ? 'previous' : 'next');
    },

    [KEYBOARD_KEYS.ARROW_UP]: (event: KeyboardEvent) => {
      event.preventDefault();
      navigateElements('previous');
    },

    [KEYBOARD_KEYS.ARROW_DOWN]: (event: KeyboardEvent) => {
      event.preventDefault();
      navigateElements('next');
    },

    [KEYBOARD_KEYS.ARROW_LEFT]: (event: KeyboardEvent) => {
      event.preventDefault();
      navigateElements('previous');
    },

    [KEYBOARD_KEYS.ARROW_RIGHT]: (event: KeyboardEvent) => {
      event.preventDefault();
      navigateElements('next');
    },

    // Selection and interaction
    [KEYBOARD_KEYS.ENTER]: (event: KeyboardEvent) => {
      event.preventDefault();
      const elements = getNavigableElements();
      if (elements.length > 0 && currentFocusIndex.current < elements.length) {
        const element = elements[currentFocusIndex.current];
        focusElement(element.type, element.id);
      }
    },

    [KEYBOARD_KEYS.SPACE]: (event: KeyboardEvent) => {
      event.preventDefault();
      // Toggle selection for multi-select
      const elements = getNavigableElements();
      if (elements.length > 0 && currentFocusIndex.current < elements.length) {
        const element = elements[currentFocusIndex.current];
        announce(`Selected ${element.type}: ${element.id}`);
      }
    },

    // Deletion
    'Delete': handleDelete,
    'Backspace': handleDelete,

    // Creation (with Ctrl)
    'n': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleCreateNode();
      }
    },

    // Zoom operations (with Ctrl)
    '+': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleZoom('in');
      }
    },

    '-': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleZoom('out');
      }
    },

    '0': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleZoom('fit');
      }
    },

    'h': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        handleZoom('center');
      }
    },

    // Escape to clear selection
    [KEYBOARD_KEYS.ESCAPE]: (event: KeyboardEvent) => {
      event.preventDefault();
      clearFocusIndicators();
      announce('Cleared selection');
    },

    // Select all elements (Ctrl+A)
    'a': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const elements = getNavigableElements();
        announce(`Selected all ${elements.length} elements`);
        // Could implement multi-selection logic here if needed
      }
    },

    // Home key - focus first element
    'Home': (event: KeyboardEvent) => {
      event.preventDefault();
      const elements = getNavigableElements();
      if (elements.length > 0) {
        clearFocusIndicators();
        currentFocusIndex.current = 0;
        const element = elements[0];
        focusElement(element.type, element.id);
        announce('Focused on first element');
      }
    },

    // End key - focus last element
    'End': (event: KeyboardEvent) => {
      event.preventDefault();
      const elements = getNavigableElements();
      if (elements.length > 0) {
        clearFocusIndicators();
        currentFocusIndex.current = elements.length - 1;
        const element = elements[elements.length - 1];
        focusElement(element.type, element.id);
        announce('Focused on last element');
      }
    },

    // Help shortcut (Ctrl+?)
    '/': (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        announce('Keyboard shortcuts: Tab to navigate, Enter to select, Delete to remove, Ctrl+N to create, Ctrl+Plus/Minus to zoom, Ctrl+0 to fit view, Home/End to jump to first/last element');
      }
    },
  };

  // Apply keyboard handlers
  useKeyboardHandler({
    elementRef: containerRef,
    keyHandlers: keyboardHandlers,
    enableGlobalCapture: true,
  });

  // Initialize focus on first element when component mounts
  useEffect(() => {
    const elements = getNavigableElements();
    if (elements.length > 0) {
      currentFocusIndex.current = 0;
      // Don't auto-focus immediately, wait for user interaction
    }
  }, [getNavigableElements]);

  // Cleanup focus indicators when component unmounts
  useEffect(() => {
    return () => {
      clearFocusIndicators();
    };
  }, [clearFocusIndicators]);

  return {
    containerRef,
    focusElement,
    clearFocusIndicators,
    navigateElements,
    currentFocusIndex: currentFocusIndex.current,
    totalElements: getNavigableElements().length,
  };
};

/**
 * Generate ARIA labels for ReactFlow elements
 */
export const generateReactFlowAriaLabels = {
  node: (node: Node) => ({
    role: ARIA_ROLES.BUTTON,
    'aria-label': generateAriaLabel(`Node ${node.data?.label || node.id}`, {
      type: node.type || 'default',
      position: `Position ${Math.round(node.position.x)}, ${Math.round(node.position.y)}`,
    }),
    'aria-describedby': `node-${node.id}-description`,
  }),

  edge: (edge: Edge, sourceNode?: Node, targetNode?: Node) => ({
    role: ARIA_ROLES.BUTTON,
    'aria-label': generateAriaLabel(
      `Connection from ${sourceNode?.data?.label || edge.source} to ${targetNode?.data?.label || edge.target}`,
      {
        type: edge.type || 'default',
        id: edge.id,
      }
    ),
    'aria-describedby': `edge-${edge.id}-description`,
  }),

  canvas: () => ({
    role: ARIA_ROLES.APPLICATION,
    'aria-label': 'Workflow diagram editor',
    'aria-describedby': 'reactflow-instructions',
  }),
};

export default useReactFlowKeyboard;