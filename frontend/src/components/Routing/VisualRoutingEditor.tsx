/**
 * Visual Routing Editor Component
 * Phase 2: Visual + Tabular UI
 *
 * Provides a ReactFlow-based drag-and-drop canvas for creating and editing
 * manufacturing routings with support for complex routing paradigms
 */

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  Panel,
  ReactFlowProvider,
  NodeTypes,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Button, Space, message, Tooltip } from 'antd';
import {
  SaveOutlined,
  LayoutOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import dagre from 'dagre';
import { RoutingStep, RoutingStepDependency } from '@/types/routing';

// Import custom node types (will create these next)
import { RoutingStepNode } from './RoutingStepNode';

/**
 * Step type definitions for different routing operations
 */
export type StepType =
  | 'PROCESS'           // Standard manufacturing operation
  | 'INSPECTION'        // Quality inspection/verification
  | 'DECISION'          // Branch/decision point (mutually exclusive)
  | 'PARALLEL_SPLIT'    // Split into parallel operations
  | 'PARALLEL_JOIN'     // Join parallel operations back together
  | 'OSP'              // Outside processing/farmout
  | 'LOT_SPLIT'        // Split lot into multiple sublots
  | 'LOT_MERGE'        // Merge multiple lots/sublots
  | 'TELESCOPING'      // Optional/telescoping operation
  | 'START'            // Start node
  | 'END';             // End node

/**
 * Node data structure for routing steps
 */
export interface RoutingStepNodeData {
  label: string;
  stepNumber: string;
  stepType: StepType;
  operationCode?: string;
  workCenterId?: string;
  description?: string;
  standardTime?: number;
  setupTime?: number;
  controlType?: 'LOT_CONTROLLED' | 'SERIAL_CONTROLLED' | 'MIXED';
  isOptional?: boolean;
  isCriticalPath?: boolean;
}

interface VisualRoutingEditorProps {
  routingId?: string;
  steps?: RoutingStep[];
  dependencies?: RoutingStepDependency[];
  onSave?: (nodes: Node[], edges: Edge[]) => Promise<void>;
  readOnly?: boolean;
}

/**
 * Auto-layout function using Dagre
 */
const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 80, nodesep: 60 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 100, // Center the node (width/2)
        y: nodeWithPosition.y - 50,  // Center the node (height/2)
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Visual Routing Editor Component
 */
export const VisualRoutingEditor: React.FC<VisualRoutingEditorProps> = ({
  steps = [],
  dependencies = [],
  onSave,
  readOnly = false,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLayouting, setIsLayouting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Custom node types
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      routingStep: RoutingStepNode,
    }),
    []
  );

  /**
   * Convert routing steps to ReactFlow nodes
   */
  useEffect(() => {
    if (steps.length === 0) {
      // Initialize with start and end nodes for new routing
      const initialNodes: Node[] = [
        {
          id: 'start',
          type: 'routingStep',
          position: { x: 250, y: 50 },
          data: {
            label: 'Start',
            stepNumber: '0',
            stepType: 'START' as StepType,
          },
        },
        {
          id: 'end',
          type: 'routingStep',
          position: { x: 250, y: 400 },
          data: {
            label: 'End',
            stepNumber: '999',
            stepType: 'END' as StepType,
          },
        },
      ];
      setNodes(initialNodes);
      return;
    }

    // Convert existing steps to nodes
    const convertedNodes: Node[] = steps.map((step, index) => ({
      id: step.id,
      type: 'routingStep',
      position: { x: 250, y: 100 + index * 120 }, // Default vertical layout
      data: {
        label: step.operation?.operationName || `Step ${step.stepNumber}`,
        stepNumber: step.stepNumber.toString(),
        stepType: (step.stepType as StepType) || 'PROCESS',
        operationId: step.operationId,
        workCenterId: step.workCenterId,
        description: step.operation?.operationName,
        standardTime: step.standardTime,
        setupTime: step.setupTime,
      } as RoutingStepNodeData,
    }));

    setNodes(convertedNodes);
  }, [steps, setNodes]);

  /**
   * Convert routing dependencies to ReactFlow edges
   */
  useEffect(() => {
    if (dependencies.length === 0) return;

    const convertedEdges: Edge[] = dependencies.map((dep) => ({
      id: dep.id,
      source: dep.prerequisiteStepId,
      target: dep.dependentStepId,
      type: 'default',
      animated: dep.dependencyType === 'START_TO_START',
      label: dep.dependencyType,
      markerEnd: {
        type: MarkerType.ArrowClosed,
      },
      style: {
        strokeWidth: 2,
        stroke: dep.dependencyType === 'FINISH_TO_START' ? '#1890ff' : '#52c41a',
      },
    }));

    setEdges(convertedEdges);
  }, [dependencies, setEdges]);

  /**
   * Handle new connection between nodes
   */
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;

      const newEdge: Edge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        type: 'default',
        source: params.source || '',
        target: params.target || '',
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setHasChanges(true);
    },
    [readOnly, setEdges]
  );

  /**
   * Auto-layout nodes using Dagre algorithm
   */
  const onLayout = useCallback(() => {
    setIsLayouting(true);
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'TB' // Top to Bottom layout
    );
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setIsLayouting(false);
    message.success('Layout applied');
  }, [nodes, edges, setNodes, setEdges]);

  /**
   * Save routing
   */
  const handleSave = async () => {
    if (!onSave) return;

    try {
      await onSave(nodes, edges);
      message.success('Routing saved successfully');
      setHasChanges(false);
    } catch (error: any) {
      message.error(error.message || 'Failed to save routing');
    }
  };

  /**
   * Add new step to canvas
   */
  const handleAddStep = (stepType: StepType) => {
    const newNode: Node = {
      id: `step-${Date.now()}`,
      type: 'routingStep',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: `New ${stepType}`,
        stepNumber: (nodes.length + 1).toString(),
        stepType,
      } as RoutingStepNodeData,
    };

    setNodes((nds) => [...nds, newNode]);
    setHasChanges(true);
  };

  return (
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={readOnly ? undefined : onNodesChange}
        onEdgesChange={readOnly ? undefined : onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as RoutingStepNodeData;
            switch (data.stepType) {
              case 'START':
                return '#52c41a';
              case 'END':
                return '#f5222d';
              case 'DECISION':
                return '#faad14';
              case 'INSPECTION':
                return '#1890ff';
              case 'PARALLEL_SPLIT':
              case 'PARALLEL_JOIN':
                return '#722ed1';
              case 'OSP':
                return '#eb2f96';
              default:
                return '#8c8c8c';
            }
          }}
        />

        {/* Control Panel */}
        {!readOnly && (
          <Panel position="top-right">
            <Space direction="vertical" size="small">
              <Tooltip title="Save Routing">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  disabled={!hasChanges}
                >
                  Save
                </Button>
              </Tooltip>

              <Tooltip title="Auto Layout">
                <Button
                  icon={<LayoutOutlined />}
                  onClick={onLayout}
                  loading={isLayouting}
                >
                  Auto Layout
                </Button>
              </Tooltip>

              <Tooltip title="Add Process Step">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('PROCESS')}
                >
                  Process
                </Button>
              </Tooltip>

              <Tooltip title="Add Inspection Step">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('INSPECTION')}
                >
                  Inspection
                </Button>
              </Tooltip>

              <Tooltip title="Add Decision Point">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('DECISION')}
                >
                  Decision
                </Button>
              </Tooltip>

              <Tooltip title="Add Parallel Split">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('PARALLEL_SPLIT')}
                >
                  Split
                </Button>
              </Tooltip>

              <Tooltip title="Add Parallel Join">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('PARALLEL_JOIN')}
                >
                  Join
                </Button>
              </Tooltip>

              <Tooltip title="Add Outside Processing">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('OSP')}
                >
                  OSP
                </Button>
              </Tooltip>

              <Tooltip title="Add Lot Split">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('LOT_SPLIT')}
                >
                  Lot Split
                </Button>
              </Tooltip>

              <Tooltip title="Add Lot Merge">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('LOT_MERGE')}
                >
                  Lot Merge
                </Button>
              </Tooltip>

              <Tooltip title="Add Telescoping Operation">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => handleAddStep('TELESCOPING')}
                >
                  Telescoping
                </Button>
              </Tooltip>
            </Space>
          </Panel>
        )}

        {/* Status Panel */}
        <Panel position="top-left">
          <div style={{ background: 'white', padding: '12px', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
            <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              Routing Editor {readOnly && '(Read Only)'}
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              Steps: {nodes.length} | Connections: {edges.length}
            </div>
            {hasChanges && (
              <div style={{ fontSize: '12px', color: '#faad14', marginTop: '4px' }}>
                ● Unsaved changes
              </div>
            )}
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};

/**
 * Wrapper component with ReactFlowProvider
 */
export const VisualRoutingEditorWrapper: React.FC<VisualRoutingEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <VisualRoutingEditor {...props} />
    </ReactFlowProvider>
  );
};

export default VisualRoutingEditorWrapper;
