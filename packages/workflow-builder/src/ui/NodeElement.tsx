/**
 * Node Element Component
 * Represents a single node in the workflow canvas
 */

import React, { useState } from 'react';
import { NodeConfig, NodeType } from '../types/workflow';
import { getNodeIcon, getNodeColor } from '../utils/nodeUtils';
import './NodeElement.css';

export interface NodeElementProps {
  node: NodeConfig;
  selected?: boolean;
  dragging?: boolean;
  onSelect?: (event: React.MouseEvent) => void;
  onDragStart?: (x: number, y: number, event: React.MouseEvent) => void;
  onConnectionDragStart?: (x: number, y: number, event: React.MouseEvent) => void;
  onConnectionEnd?: (targetNodeId: string) => void;
  onContextMenu?: (event: React.MouseEvent) => void;
  isReadOnly?: boolean;
}

/**
 * NodeElement - Visual representation of a workflow node
 */
export const NodeElement: React.FC<NodeElementProps> = ({
  node,
  selected = false,
  dragging = false,
  onSelect,
  onDragStart,
  onConnectionDragStart,
  onContextMenu,
  isReadOnly = false,
}) => {
  const [showPorts, setShowPorts] = useState(false);
  const icon = getNodeIcon(node.type);
  const color = getNodeColor(node.type);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    onDragStart?.(node.x, node.y, e);
  };

  const handleConnectionPortMouseDown = (e: React.MouseEvent) => {
    if (isReadOnly) return;
    e.stopPropagation();
    // Get position relative to canvas
    const x = node.x + (node.width || 100) / 2;
    const y = node.y + (node.height || 60);
    onConnectionDragStart?.(x, y, e);
  };

  return (
    <div
      className={`node-element ${selected ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
      style={{
        left: `${node.x}px`,
        top: `${node.y}px`,
        width: `${node.width || 100}px`,
        height: `${node.height || 60}px`,
        borderColor: color,
        backgroundColor: color + '15',
      }}
      onClick={onSelect}
      onContextMenu={onContextMenu}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowPorts(true)}
      onMouseLeave={() => setShowPorts(false)}
      role="button"
      tabIndex={0}
      aria-label={`Node: ${node.name}`}
      aria-selected={selected}
    >
      {/* Icon */}
      <div className="node-icon" style={{ color }}>
        {icon}
      </div>

      {/* Name */}
      <div className="node-name" title={node.name}>
        {node.name}
      </div>

      {/* Connection ports */}
      {!isReadOnly && (
        <>
          {/* Input port */}
          <div
            className="node-port port-input"
            title="Connect from another node"
            onMouseDown={handleConnectionPortMouseDown}
            aria-label="Input port"
          />

          {/* Output port */}
          <div
            className="node-port port-output"
            title="Connect to another node"
            onMouseDown={handleConnectionPortMouseDown}
            aria-label="Output port"
          />
        </>
      )}

      {/* Type indicator */}
      <div className="node-type-badge" title={node.type}>
        {node.type.charAt(0).toUpperCase()}
      </div>
    </div>
  );
};

export default NodeElement;
