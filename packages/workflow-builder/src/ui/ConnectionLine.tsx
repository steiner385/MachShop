/**
 * Connection Line Component
 * Visualizes connections between workflow nodes
 */

import React, { useMemo } from 'react';
import { Connection, NodeConfig } from '../types/workflow';
import './ConnectionLine.css';

export interface ConnectionLineProps {
  connection: Connection;
  nodes: NodeConfig[];
  selected?: boolean;
  onDelete?: (connectionId: string) => void;
  isReadOnly?: boolean;
}

/**
 * Calculate Bezier curve path between two nodes
 * Creates smooth curved connections
 */
function calculateBezierPath(
  sourceNode: NodeConfig,
  targetNode: NodeConfig
): string {
  const sourceX = sourceNode.x + (sourceNode.width || 100) / 2;
  const sourceY = sourceNode.y + (sourceNode.height || 60);
  const targetX = targetNode.x + (targetNode.width || 100) / 2;
  const targetY = targetNode.y;

  // Calculate control points for smooth curve
  const controlY = (sourceY + targetY) / 2;

  return `M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${targetX} ${controlY}, ${targetX} ${targetY}`;
}

/**
 * Calculate label position (midpoint of curve)
 */
function calculateLabelPosition(
  sourceNode: NodeConfig,
  targetNode: NodeConfig
): { x: number; y: number } {
  const sourceX = sourceNode.x + (sourceNode.width || 100) / 2;
  const sourceY = sourceNode.y + (sourceNode.height || 60);
  const targetX = targetNode.x + (targetNode.width || 100) / 2;
  const targetY = targetNode.y;

  return {
    x: (sourceX + targetX) / 2,
    y: (sourceY + targetY) / 2 - 10,
  };
}

/**
 * ConnectionLine - Visualizes connection between nodes
 *
 * Features:
 * - Smooth Bezier curve paths
 * - Condition labels for decision nodes
 * - Arrow endpoints
 * - Hover highlighting
 * - Click to delete
 * - Selection state
 * - Accessibility support
 */
export const ConnectionLine: React.FC<ConnectionLineProps> = ({
  connection,
  nodes,
  selected = false,
  onDelete,
  isReadOnly = false,
}) => {
  const sourceNode = useMemo(
    () => nodes.find(n => n.id === connection.source),
    [nodes, connection.source]
  );

  const targetNode = useMemo(
    () => nodes.find(n => n.id === connection.target),
    [nodes, connection.target]
  );

  if (!sourceNode || !targetNode) {
    return null;
  }

  const pathData = useMemo(
    () => calculateBezierPath(sourceNode, targetNode),
    [sourceNode, targetNode]
  );

  const labelPos = useMemo(
    () => calculateLabelPosition(sourceNode, targetNode),
    [sourceNode, targetNode]
  );

  const handleDelete = (e: React.MouseEvent) => {
    if (!isReadOnly) {
      e.stopPropagation();
      onDelete?.(connection.id);
    }
  };

  const sourceNodeName = sourceNode.name;
  const targetNodeName = targetNode.name;
  const conditionLabel = connection.condition || connection.label || '';

  return (
    <g
      className={`connection-line ${selected ? 'selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={handleDelete}
      aria-label={`Connection from ${sourceNodeName} to ${targetNodeName}${
        conditionLabel ? ` with condition: ${conditionLabel}` : ''
      }`}
    >
      {/* Connection path */}
      <path
        d={pathData}
        className="connection-path"
        strokeWidth="2"
        fill="none"
        pointerEvents="stroke"
      />

      {/* Arrow marker at target */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="currentColor" />
        </marker>
      </defs>

      {/* Arrow endpoint */}
      <path
        d={pathData}
        className="connection-arrow"
        strokeWidth="2"
        fill="none"
        markerEnd={`url(#arrowhead-${connection.id})`}
      />

      {/* Hover target (wider for easier interaction) */}
      <path
        d={pathData}
        className="connection-hover-target"
        strokeWidth="12"
        fill="none"
        pointerEvents="stroke"
      />

      {/* Condition label */}
      {conditionLabel && (
        <g>
          {/* Label background */}
          <rect
            x={labelPos.x - 30}
            y={labelPos.y - 12}
            width="60"
            height="24"
            rx="4"
            className="connection-label-background"
            pointerEvents="none"
          />

          {/* Label text */}
          <text
            x={labelPos.x}
            y={labelPos.y + 4}
            className="connection-label"
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            {conditionLabel.length > 8
              ? conditionLabel.substring(0, 8) + '...'
              : conditionLabel}
          </text>
        </g>
      )}

      {/* Delete button on hover */}
      {!isReadOnly && selected && (
        <g className="connection-delete-button">
          <circle
            cx={labelPos.x}
            cy={labelPos.y}
            r="6"
            className="delete-button-circle"
            onClick={handleDelete}
            style={{ cursor: 'pointer' }}
          />
          <text
            x={labelPos.x}
            y={labelPos.y + 2}
            className="delete-button-text"
            textAnchor="middle"
            onClick={handleDelete}
            style={{ cursor: 'pointer', fontSize: '10px' }}
          >
            ✕
          </text>
        </g>
      )}
    </g>
  );
};

export default ConnectionLine;
