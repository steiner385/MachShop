/**
 * Workflow Canvas Component
 * Issue #394: Low-Code/No-Code Workflow Builder - Visual Workflow Designer
 * Phase 2: React Visual Canvas UI
 *
 * Main canvas for visually designing and editing workflows
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Workflow, NodeConfig, Connection, NodeType } from '../types/workflow';
import { NodeElement } from './NodeElement';
import { ConnectionLine } from './ConnectionLine';
import { usePan } from '../hooks/usePan';
import { useZoom } from '../hooks/useZoom';
import './WorkflowCanvas.css';

export interface WorkflowCanvasProps {
  workflow: Workflow;
  onNodeSelect?: (nodeId: string) => void;
  onNodeMove?: (nodeId: string, x: number, y: number) => void;
  onConnectionCreate?: (source: string, target: string) => void;
  onConnectionDelete?: (connectionId: string) => void;
  isReadOnly?: boolean;
  gridSize?: number;
  snapToGrid?: boolean;
}

/**
 * WorkflowCanvas - Visual canvas for workflow design
 *
 * Features:
 * - Drag-and-drop nodes
 * - Pan and zoom
 * - Connection drawing
 * - Multi-select
 * - Keyboard shortcuts
 * - Grid and snap-to-grid
 */
export const WorkflowCanvas = React.forwardRef<HTMLDivElement, WorkflowCanvasProps>(
  (
    {
      workflow,
      onNodeSelect,
      onNodeMove,
      onConnectionCreate,
      onConnectionDelete,
      isReadOnly = false,
      gridSize = 20,
      snapToGrid = true,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLDivElement>(ref as any);
    const svgRef = useRef<SVGSVGElement>(null);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [draggedNode, setDraggedNode] = useState<{
      nodeId: string;
      startX: number;
      startY: number;
    } | null>(null);
    const [drawingConnection, setDrawingConnection] = useState<{
      sourceId: string;
      currentX: number;
      currentY: number;
    } | null>(null);
    const [contextMenu, setContextMenu] = useState<{
      x: number;
      y: number;
      nodeId?: string;
    } | null>(null);

    const { pan, handlePanStart, handlePanMove, handlePanEnd } = usePan();
    const { zoom, handleZoomIn, handleZoomOut } = useZoom();

    // Handle node selection
    const handleNodeClick = useCallback(
      (nodeId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setSelectedNodeId(nodeId);
        onNodeSelect?.(nodeId);
      },
      [onNodeSelect]
    );

    // Handle node drag start
    const handleNodeDragStart = useCallback(
      (nodeId: string, x: number, y: number, event: React.MouseEvent) => {
        if (isReadOnly) return;
        event.preventDefault();
        setDraggedNode({
          nodeId,
          startX: x,
          startY: y,
        });
      },
      [isReadOnly]
    );

    // Handle node drag
    const handleNodeDrag = useCallback(
      (x: number, y: number) => {
        if (!draggedNode) return;

        let newX = x;
        let newY = y;

        // Snap to grid
        if (snapToGrid) {
          newX = Math.round(x / gridSize) * gridSize;
          newY = Math.round(y / gridSize) * gridSize;
        }

        // Calculate delta from start
        const deltaX = newX - draggedNode.startX;
        const deltaY = newY - draggedNode.startY;

        const node = workflow.nodes.find(n => n.id === draggedNode.nodeId);
        if (node) {
          onNodeMove?.(draggedNode.nodeId, node.x + deltaX, node.y + deltaY);
        }
      },
      [draggedNode, workflow.nodes, onNodeMove, snapToGrid, gridSize]
    );

    // Handle node drag end
    const handleNodeDragEnd = useCallback(() => {
      setDraggedNode(null);
    }, []);

    // Handle connection drawing
    const handleConnectionDragStart = useCallback(
      (nodeId: string, x: number, y: number, event: React.MouseEvent) => {
        if (isReadOnly) return;
        event.stopPropagation();
        setDrawingConnection({
          sourceId: nodeId,
          currentX: x,
          currentY: y,
        });
      },
      [isReadOnly]
    );

    const handleConnectionDraw = useCallback((x: number, y: number) => {
      if (drawingConnection) {
        setDrawingConnection(prev => ({
          ...prev!,
          currentX: x,
          currentY: y,
        }));
      }
    }, [drawingConnection]);

    const handleConnectionEnd = useCallback(
      (targetNodeId: string) => {
        if (drawingConnection) {
          onConnectionCreate?.(drawingConnection.sourceId, targetNodeId);
          setDrawingConnection(null);
        }
      },
      [drawingConnection, onConnectionCreate]
    );

    // Handle canvas mouse move
    const handleCanvasMouseMove = useCallback(
      (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = (e.clientX - rect.left - pan.x) / zoom;
        const y = (e.clientY - rect.top - pan.y) / zoom;

        if (draggedNode) {
          handleNodeDrag(x, y);
        }

        if (drawingConnection) {
          handleConnectionDraw(x, y);
        }

        handlePanMove(e);
      },
      [pan, zoom, draggedNode, drawingConnection, handleNodeDrag, handleConnectionDraw, handlePanMove]
    );

    // Handle canvas mouse up
    const handleCanvasMouseUp = useCallback(() => {
      handleNodeDragEnd();
      handlePanEnd();
    }, [handleNodeDragEnd, handlePanEnd]);

    // Handle context menu
    const handleCanvasContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setContextMenu({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
      },
      []
    );

    // Handle node context menu
    const handleNodeContextMenu = useCallback(
      (nodeId: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setContextMenu({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            nodeId,
          });
        }
      },
      []
    );

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl/Cmd + Plus: Zoom in
        if ((e.ctrlKey || e.metaKey) && e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        }

        // Ctrl/Cmd + Minus: Zoom out
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        }

        // Delete: Remove selected node
        if (e.key === 'Delete' && selectedNodeId && !isReadOnly) {
          // Emit delete event (to be handled by parent)
          e.preventDefault();
        }

        // Escape: Deselect
        if (e.key === 'Escape') {
          setSelectedNodeId(null);
          setContextMenu(null);
        }

        // Ctrl/Cmd + Z: Undo (to be implemented)
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          // Emit undo event
        }

        // Ctrl/Cmd + Shift + Z: Redo
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
          e.preventDefault();
          // Emit redo event
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNodeId, isReadOnly, handleZoomIn, handleZoomOut]);

    return (
      <div
        ref={canvasRef}
        className="workflow-canvas"
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseDown={handlePanStart}
        onContextMenu={handleCanvasContextMenu}
        role="region"
        aria-label="Workflow canvas"
      >
        {/* Grid background */}
        <div
          className="grid-background"
          style={{
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* SVG for connections */}
        <svg
          ref={svgRef}
          className="connections-layer"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* Existing connections */}
          {workflow.connections.map(conn => (
            <ConnectionLine
              key={conn.id}
              connection={conn}
              nodes={workflow.nodes}
              selected={false}
              onDelete={() => onConnectionDelete?.(conn.id)}
              isReadOnly={isReadOnly}
            />
          ))}

          {/* Currently drawing connection */}
          {drawingConnection && (
            <line
              x1={workflow.nodes.find(n => n.id === drawingConnection.sourceId)?.x || 0}
              y1={workflow.nodes.find(n => n.id === drawingConnection.sourceId)?.y || 0}
              x2={drawingConnection.currentX}
              y2={drawingConnection.currentY}
              className="drawing-connection"
              strokeDasharray="5,5"
            />
          )}
        </svg>

        {/* Nodes */}
        <div className="nodes-layer" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          {workflow.nodes.map(node => (
            <NodeElement
              key={node.id}
              node={node}
              selected={selectedNodeId === node.id}
              onSelect={(e) => handleNodeClick(node.id, e)}
              onDragStart={(x, y, e) => handleNodeDragStart(node.id, x, y, e)}
              onConnectionDragStart={(x, y, e) => handleConnectionDragStart(node.id, x, y, e)}
              onConnectionEnd={(targetId) => handleConnectionEnd(targetId)}
              onContextMenu={(e) => handleNodeContextMenu(node.id, e)}
              isReadOnly={isReadOnly}
              dragging={draggedNode?.nodeId === node.id}
            />
          ))}
        </div>

        {/* Toolbar */}
        <div className="canvas-toolbar" aria-label="Canvas controls">
          <button
            className="toolbar-button"
            onClick={handleZoomIn}
            title="Zoom in (Ctrl+Plus)"
            aria-label="Zoom in"
          >
            +
          </button>
          <span className="zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            className="toolbar-button"
            onClick={handleZoomOut}
            title="Zoom out (Ctrl+Minus)"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {contextMenu.nodeId ? (
              <>
                <button onClick={() => setContextMenu(null)}>Delete Node</button>
                <button onClick={() => setContextMenu(null)}>Duplicate Node</button>
                <hr />
                <button onClick={() => setContextMenu(null)}>Properties</button>
              </>
            ) : (
              <>
                <button onClick={() => setContextMenu(null)}>Add Node</button>
                <button onClick={() => setContextMenu(null)}>Paste</button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

WorkflowCanvas.displayName = 'WorkflowCanvas';

export default WorkflowCanvas;
