/**
 * Routing Palette Component
 * Phase 2: Visual + Tabular UI
 *
 * Provides a drag-and-drop palette of routing step types that can be added to the canvas.
 * Organized by category (Basic, Control Flow, Quality, Material Control, Advanced)
 */

import React, { useState } from 'react';
import { Card, Collapse, Space, Badge, Tooltip, Input } from 'antd';
import {
  ToolOutlined,
  CheckCircleOutlined,
  BranchesOutlined,
  SplitCellsOutlined,
  MergeCellsOutlined,
  CloudUploadOutlined,
  ScissorOutlined,
  LinkOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { StepType } from './VisualRoutingEditor';

const { Panel } = Collapse;

/**
 * Step type definition with metadata
 */
interface StepTypeDefinition {
  type: StepType;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'basic' | 'control' | 'quality' | 'material' | 'advanced';
  tags: string[];
}

/**
 * All available step types with their metadata
 */
const STEP_TYPES: StepTypeDefinition[] = [
  // Basic Operations
  {
    type: 'PROCESS',
    label: 'Process Step',
    description: 'Standard manufacturing operation (machining, assembly, fabrication)',
    icon: <ToolOutlined />,
    color: '#1890ff',
    category: 'basic',
    tags: ['machining', 'assembly', 'fabrication', 'operation'],
  },

  // Quality Operations
  {
    type: 'INSPECTION',
    label: 'Inspection',
    description: 'Quality inspection, verification, or measurement step',
    icon: <CheckCircleOutlined />,
    color: '#722ed1',
    category: 'quality',
    tags: ['quality', 'inspection', 'verification', 'measurement', 'check'],
  },

  // Control Flow
  {
    type: 'DECISION',
    label: 'Decision Point',
    description: 'Branch/decision point with mutually exclusive paths (e.g., pass/fail routing)',
    icon: <BranchesOutlined />,
    color: '#faad14',
    category: 'control',
    tags: ['branch', 'decision', 'exclusive', 'conditional', 'if'],
  },
  {
    type: 'PARALLEL_SPLIT',
    label: 'Parallel Split',
    description: 'Split workflow into parallel operations that can execute simultaneously',
    icon: <SplitCellsOutlined />,
    color: '#722ed1',
    category: 'control',
    tags: ['parallel', 'split', 'concurrent', 'fork'],
  },
  {
    type: 'PARALLEL_JOIN',
    label: 'Parallel Join',
    description: 'Join multiple parallel operations back together (synchronization point)',
    icon: <MergeCellsOutlined />,
    color: '#722ed1',
    category: 'control',
    tags: ['parallel', 'join', 'merge', 'synchronize', 'converge'],
  },

  // Advanced Operations
  {
    type: 'OSP',
    label: 'OSP/Farmout',
    description: 'Outside processing or farmout operation (external vendor work)',
    icon: <CloudUploadOutlined />,
    color: '#eb2f96',
    category: 'advanced',
    tags: ['outside', 'farmout', 'vendor', 'external', 'subcontract'],
  },
  {
    type: 'TELESCOPING',
    label: 'Telescoping',
    description: 'Optional operation that can be skipped based on conditions',
    icon: <EyeOutlined />,
    color: '#597ef7',
    category: 'advanced',
    tags: ['optional', 'conditional', 'telescoping', 'skip'],
  },

  // Material Control
  {
    type: 'LOT_SPLIT',
    label: 'Lot Split',
    description: 'Split a lot into multiple sublots or convert lot control to serial control',
    icon: <ScissorOutlined />,
    color: '#a0d911',
    category: 'material',
    tags: ['lot', 'split', 'divide', 'sublot', 'serial'],
  },
  {
    type: 'LOT_MERGE',
    label: 'Lot Merge',
    description: 'Merge multiple lots/sublots back together',
    icon: <LinkOutlined />,
    color: '#a0d911',
    category: 'material',
    tags: ['lot', 'merge', 'combine', 'consolidate'],
  },
];

/**
 * Category metadata
 */
const CATEGORIES = {
  basic: {
    title: 'Basic Operations',
    description: 'Standard manufacturing operations',
  },
  quality: {
    title: 'Quality Control',
    description: 'Inspection and quality verification',
  },
  control: {
    title: 'Control Flow',
    description: 'Decision points and parallel operations',
  },
  material: {
    title: 'Material Control',
    description: 'Lot control and material flow',
  },
  advanced: {
    title: 'Advanced',
    description: 'Special operations and patterns',
  },
};

interface RoutingPaletteProps {
  onAddStep?: (stepType: StepType) => void;
  collapsed?: boolean;
}

/**
 * Draggable palette item
 */
const PaletteItem: React.FC<{
  stepType: StepTypeDefinition;
  onAdd: (type: StepType) => void;
}> = ({ stepType, onAdd }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', stepType.type);
    event.dataTransfer.effectAllowed = 'copy';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    onAdd(stepType.type);
  };

  return (
    <Tooltip title={stepType.description} placement="right">
      <div
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleClick}
        style={{
          padding: '10px 12px',
          marginBottom: '8px',
          background: isDragging ? '#f0f0f0' : 'white',
          border: `2px solid ${stepType.color}`,
          borderRadius: '6px',
          cursor: isDragging ? 'grabbing' : 'grab',
          transition: 'all 0.2s ease',
          opacity: isDragging ? 0.5 : 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <Space size={8}>
          <span style={{ fontSize: '16px', color: stepType.color }}>
            {stepType.icon}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#262626' }}>
            {stepType.label}
          </span>
        </Space>
      </div>
    </Tooltip>
  );
};

/**
 * Routing Palette Component
 */
export const RoutingPalette: React.FC<RoutingPaletteProps> = ({
  onAddStep,
  collapsed = false,
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeKeys, setActiveKeys] = useState<string[]>(['basic', 'quality', 'control']);

  /**
   * Filter step types by search text
   */
  const filteredStepTypes = searchText
    ? STEP_TYPES.filter(
        (step) =>
          step.label.toLowerCase().includes(searchText.toLowerCase()) ||
          step.description.toLowerCase().includes(searchText.toLowerCase()) ||
          step.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()))
      )
    : STEP_TYPES;

  /**
   * Group step types by category
   */
  const stepTypesByCategory = filteredStepTypes.reduce((acc, step) => {
    if (!acc[step.category]) {
      acc[step.category] = [];
    }
    acc[step.category].push(step);
    return acc;
  }, {} as Record<string, StepTypeDefinition[]>);

  const handleAddStep = (stepType: StepType) => {
    onAddStep?.(stepType);
  };

  if (collapsed) {
    return null;
  }

  return (
    <Card
      title="Step Palette"
      size="small"
      style={{
        width: '280px',
        height: '100%',
        overflow: 'auto',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
      bodyStyle={{ padding: '12px' }}
    >
      {/* Search */}
      <Input
        placeholder="Search step types..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: '12px' }}
        allowClear
      />

      {/* Instructions */}
      <div
        style={{
          fontSize: '12px',
          color: '#8c8c8c',
          marginBottom: '12px',
          padding: '8px',
          background: '#f5f5f5',
          borderRadius: '4px',
        }}
      >
        <strong>Tip:</strong> Drag steps onto the canvas or click to add at a random position.
      </div>

      {/* Step Categories */}
      <Collapse
        activeKey={activeKeys}
        onChange={(keys) => setActiveKeys(keys as string[])}
        bordered={false}
        style={{ background: 'transparent' }}
      >
        {Object.entries(CATEGORIES).map(([category, meta]) => {
          const steps = stepTypesByCategory[category] || [];
          if (steps.length === 0 && searchText) return null;

          return (
            <Panel
              header={
                <Space>
                  <span style={{ fontWeight: 500 }}>{meta.title}</span>
                  <Badge count={steps.length} style={{ backgroundColor: '#52c41a' }} />
                </Space>
              }
              key={category}
              extra={
                <span style={{ fontSize: '11px', color: '#8c8c8c' }}>
                  {meta.description}
                </span>
              }
            >
              <div style={{ paddingTop: '8px' }}>
                {steps.map((stepType) => (
                  <PaletteItem
                    key={stepType.type}
                    stepType={stepType}
                    onAdd={handleAddStep}
                  />
                ))}
                {steps.length === 0 && (
                  <div style={{ color: '#8c8c8c', fontSize: '12px', textAlign: 'center' }}>
                    No steps in this category
                  </div>
                )}
              </div>
            </Panel>
          );
        })}
      </Collapse>

      {/* Statistics */}
      <div
        style={{
          marginTop: '16px',
          padding: '8px',
          background: '#fafafa',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#595959',
        }}
      >
        <div>Total: {filteredStepTypes.length} step types</div>
        {searchText && (
          <div style={{ marginTop: '4px', color: '#1890ff' }}>
            Showing {filteredStepTypes.length} of {STEP_TYPES.length} results
          </div>
        )}
      </div>
    </Card>
  );
};

export default RoutingPalette;
