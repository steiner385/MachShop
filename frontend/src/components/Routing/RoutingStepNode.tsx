/**
 * Routing Step Node Component
 * Phase 2: Visual + Tabular UI
 *
 * Custom ReactFlow node for rendering routing steps with different visual styles
 * based on step type (Process, Inspection, Decision, Parallel, OSP, etc.)
 */

import React, { memo, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge, Tag } from 'antd';
import {
  ToolOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  SplitCellsOutlined,
  MergeCellsOutlined,
  CloudUploadOutlined,
  ScissorOutlined,
  LinkOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { RoutingStepNodeData, StepType } from './VisualRoutingEditor';
import { useKeyboardHandler, KEYBOARD_KEYS } from '@/hooks/useKeyboardHandler';
import { ARIA_ROLES, generateAriaLabel, announceToScreenReader } from '@/utils/ariaUtils';

/**
 * Get icon for step type
 */
const getStepIcon = (stepType: StepType) => {
  switch (stepType) {
    case 'PROCESS':
      return <ToolOutlined />;
    case 'INSPECTION':
      return <CheckCircleOutlined />;
    case 'DECISION':
      return <BranchesOutlined />;
    case 'PARALLEL_SPLIT':
      return <SplitCellsOutlined />;
    case 'PARALLEL_JOIN':
      return <MergeCellsOutlined />;
    case 'OSP':
      return <CloudUploadOutlined />;
    case 'LOT_SPLIT':
      return <ScissorOutlined />;
    case 'LOT_MERGE':
      return <LinkOutlined />;
    case 'TELESCOPING':
      return <EyeOutlined />;
    case 'START':
      return <PlayCircleOutlined />;
    case 'END':
      return <StopOutlined />;
    default:
      return <ToolOutlined />;
  }
};

/**
 * Get color scheme for step type
 */
const getStepColors = (stepType: StepType) => {
  switch (stepType) {
    case 'START':
      return {
        background: '#f6ffed',
        border: '#52c41a',
        color: '#135200',
      };
    case 'END':
      return {
        background: '#fff1f0',
        border: '#f5222d',
        color: '#820014',
      };
    case 'PROCESS':
      return {
        background: '#e6f7ff',
        border: '#1890ff',
        color: '#003a8c',
      };
    case 'INSPECTION':
      return {
        background: '#f9f0ff',
        border: '#722ed1',
        color: '#391085',
      };
    case 'DECISION':
      return {
        background: '#fffbe6',
        border: '#faad14',
        color: '#ad6800',
      };
    case 'PARALLEL_SPLIT':
    case 'PARALLEL_JOIN':
      return {
        background: '#f9f0ff',
        border: '#722ed1',
        color: '#391085',
      };
    case 'OSP':
      return {
        background: '#fff0f6',
        border: '#eb2f96',
        color: '#9e1068',
      };
    case 'LOT_SPLIT':
    case 'LOT_MERGE':
      return {
        background: '#fcffe6',
        border: '#a0d911',
        color: '#5b8c00',
      };
    case 'TELESCOPING':
      return {
        background: '#f0f5ff',
        border: '#597ef7',
        color: '#10239e',
      };
    default:
      return {
        background: '#fafafa',
        border: '#d9d9d9',
        color: '#595959',
      };
  }
};

/**
 * Routing Step Node Component with Keyboard Navigation
 */
export const RoutingStepNode = memo(({ data, selected, id }: NodeProps<RoutingStepNodeData>) => {
  const colors = getStepColors(data.stepType);
  const icon = getStepIcon(data.stepType);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Handle keyboard interactions specific to this node
  const handleNodeActivation = useCallback(() => {
    announceToScreenReader(`Activated ${data.stepType} step: ${data.label}`);
    // Node-specific activation logic can be added here
  }, [data.stepType, data.label]);

  const handleNodeEdit = useCallback(() => {
    announceToScreenReader(`Editing ${data.stepType} step: ${data.label}`);
    // Node editing logic can be added here
  }, [data.stepType, data.label]);

  // Keyboard handlers for node-specific interactions
  const keyboardHandlers = {
    [KEYBOARD_KEYS.ENTER]: (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleNodeActivation();
    },

    [KEYBOARD_KEYS.SPACE]: (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleNodeActivation();
    },

    'F2': (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleNodeEdit();
    },

    [KEYBOARD_KEYS.ESCAPE]: (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      // Blur the node to exit edit mode
      nodeRef.current?.blur();
    },
  };

  // Apply keyboard handlers to this node
  useKeyboardHandler({
    elementRef: nodeRef,
    keyHandlers: keyboardHandlers,
    enableGlobalCapture: false,
  });

  // Generate accessibility attributes
  const ariaLabel = generateAriaLabel(
    `${data.stepType} step: ${data.label}`,
    {
      stepNumber: data.stepNumber,
      type: data.stepType,
      selected: selected ? 'selected' : 'unselected',
    }
  );

  const accessibilityProps = {
    role: ARIA_ROLES.BUTTON,
    'aria-label': ariaLabel,
    'aria-describedby': `node-${id}-description`,
    'aria-selected': selected,
    'tabindex': selected ? 0 : -1,
    'data-keyboard-focusable': 'true',
    'data-node-type': data.stepType,
    'data-node-id': id,
  };

  const nodeStyle: React.CSSProperties = {
    background: colors.background,
    border: `2px solid ${selected ? '#1890ff' : colors.border}`,
    borderRadius: '8px',
    padding: '12px',
    width: '200px',
    minHeight: '100px',
    boxShadow: selected
      ? '0 4px 12px rgba(24, 144, 255, 0.3)'
      : '0 2px 8px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    color: colors.color,
    fontWeight: 500,
    fontSize: '14px',
  };

  const contentStyle: React.CSSProperties = {
    fontSize: '12px',
    color: '#666',
  };

  return (
    <>
      {/* Hidden description for screen readers */}
      <div id={`node-${id}-description`} className="sr-only">
        Step {data.stepNumber}: {data.stepType} operation named {data.label}.
        {data.duration && ` Duration: ${data.duration} minutes.`}
        {data.description && ` Description: ${data.description}`}
        {selected ? ' Currently selected.' : ' Press Enter or Space to select.'}
      </div>

      <div
        ref={nodeRef}
        style={{
          ...nodeStyle,
          // Enhanced focus indicators for keyboard navigation
          outline: selected && nodeRef.current === document.activeElement
            ? '3px solid #1890ff'
            : 'none',
          outlineOffset: '2px',
        }}
        {...accessibilityProps}
      >
      {/* Input Handle */}
      {data.stepType !== 'START' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: colors.border,
            width: 10,
            height: 10,
            top: -5,
          }}
        />
      )}

      {/* Node Header */}
      <div style={headerStyle}>
        <span style={{ fontSize: '16px' }}>{icon}</span>
        <span>Step {data.stepNumber}</span>
      </div>

      {/* Node Content */}
      <div style={contentStyle}>
        <div style={{ fontWeight: 500, color: '#262626', marginBottom: '4px' }}>
          {data.label}
        </div>

        {/* Operation Code */}
        {data.operationCode && (
          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
            Op: {data.operationCode}
          </div>
        )}

        {/* Timing Information */}
        {(data.standardTime || data.setupTime) && (
          <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {data.standardTime && (
              <Tag color="blue" style={{ margin: 0, fontSize: '10px' }}>
                {data.standardTime}m
              </Tag>
            )}
            {data.setupTime && (
              <Tag color="orange" style={{ margin: 0, fontSize: '10px' }}>
                Setup: {data.setupTime}m
              </Tag>
            )}
          </div>
        )}

        {/* Control Type Badge */}
        {data.controlType && (
          <div style={{ marginTop: '4px' }}>
            <Badge
              count={data.controlType === 'SERIAL_CONTROLLED' ? 'SN' : 'LOT'}
              style={{
                backgroundColor: data.controlType === 'SERIAL_CONTROLLED' ? '#722ed1' : '#1890ff',
                fontSize: '9px',
              }}
            />
          </div>
        )}

        {/* Optional Badge */}
        {data.isOptional && (
          <div style={{ marginTop: '4px' }}>
            <Tag color="default" style={{ margin: 0, fontSize: '10px' }}>
              Optional
            </Tag>
          </div>
        )}

        {/* Critical Path Badge */}
        {data.isCriticalPath && (
          <div style={{ marginTop: '4px' }}>
            <Tag color="red" style={{ margin: 0, fontSize: '10px' }}>
              Critical Path
            </Tag>
          </div>
        )}
      </div>

      {/* Output Handle */}
      {data.stepType !== 'END' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: colors.border,
            width: 10,
            height: 10,
            bottom: -5,
          }}
        />
      )}

      {/* Additional handles for parallel split/join */}
      {(data.stepType === 'PARALLEL_SPLIT' || data.stepType === 'PARALLEL_JOIN') && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="right"
            style={{
              background: colors.border,
              width: 8,
              height: 8,
              right: -4,
            }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="left"
            style={{
              background: colors.border,
              width: 8,
              height: 8,
              left: -4,
            }}
          />
        </>
      )}
      </div>
    </>
  );
});

RoutingStepNode.displayName = 'RoutingStepNode';

export default RoutingStepNode;
