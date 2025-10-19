/**
 * Dependency Graph Component
 * Sprint 4 Enhancements
 *
 * Visual graph showing step dependencies
 */

import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network/standalone';
import { DataSet } from 'vis-data';
import { Card, Empty, Spin, Alert, Button, Space, Typography, Tag } from 'antd';
import {
  NodeIndexOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { RoutingStep, RoutingStepDependency, DependencyType } from '@/types/routing';

const { Text } = Typography;

interface DependencyGraphProps {
  steps: RoutingStep[];
  dependencies: RoutingStepDependency[];
  loading?: boolean;
}

/**
 * Dependency Graph Component
 *
 * Visualizes routing steps and their dependencies as a network graph
 */
export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  steps,
  dependencies,
  loading = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const [graphError, setGraphError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || steps.length === 0) {
      return;
    }

    try {
      // Prepare nodes (steps)
      const nodes = new DataSet(
        steps.map((step) => ({
          id: step.id,
          label: `Step ${step.stepNumber}\n${step.processSegment?.segmentName || 'Unknown'}`,
          title: `${step.processSegment?.segmentName}\n${step.stepInstructions || 'No instructions'}`,
          shape: 'box',
          color: {
            background: step.isCriticalPath
              ? '#ff4d4f'
              : step.isQualityInspection
              ? '#52c41a'
              : step.isOptional
              ? '#1890ff'
              : '#fafafa',
            border: step.isCriticalPath
              ? '#cf1322'
              : step.isQualityInspection
              ? '#389e0d'
              : step.isOptional
              ? '#096dd9'
              : '#d9d9d9',
          },
          font: {
            color: step.isCriticalPath || step.isQualityInspection ? '#fff' : '#000',
            multi: 'html',
          },
          margin: 10,
        }))
      );

      // Prepare edges (dependencies)
      const edges = new DataSet(
        dependencies.map((dep) => ({
          id: dep.id,
          from: dep.prerequisiteStepId,
          to: dep.dependentStepId,
          label: getDependencyLabel(dep.dependencyType),
          arrows: 'to',
          color: {
            color: getDependencyColor(dep.dependencyType),
            highlight: '#1890ff',
          },
          smooth: {
            type: 'cubicBezier',
            roundness: 0.4,
          },
          title: `${getDependencyLabel(dep.dependencyType)}\n${dep.lagTime ? `Lag: ${dep.lagTime}s` : ''}${dep.leadTime ? `Lead: ${dep.leadTime}s` : ''}`,
        }))
      );

      // Network options
      const options = {
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'LR', // Left to Right
            sortMethod: 'directed',
            levelSeparation: 200,
            nodeSpacing: 150,
          },
        },
        physics: {
          enabled: false, // Disable physics for hierarchical layout
        },
        nodes: {
          borderWidth: 2,
          borderWidthSelected: 3,
          chosen: {
            node: (values: any) => {
              values.borderWidth = 4;
              values.shadow = true;
            },
          },
        },
        edges: {
          width: 2,
          chosen: {
            edge: (values: any) => {
              values.width = 4;
            },
          },
        },
        interaction: {
          hover: true,
          zoomView: true,
          dragView: true,
          tooltipDelay: 200,
        },
      };

      // Create network
      const network = new Network(containerRef.current, { nodes, edges }, options);
      networkRef.current = network;

      // Handle events
      network.on('click', (params) => {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const step = steps.find((s) => s.id === nodeId);
          if (step) {
            console.log('Clicked step:', step);
          }
        }
      });

      // Cleanup
      return () => {
        if (networkRef.current) {
          networkRef.current.destroy();
          networkRef.current = null;
        }
      };
    } catch (error: any) {
      console.error('Failed to create dependency graph:', error);
      setGraphError(error.message || 'Failed to render graph');
    }
  }, [steps, dependencies]);

  const getDependencyLabel = (type: DependencyType): string => {
    const labels = {
      FINISH_TO_START: 'FS',
      START_TO_START: 'SS',
      FINISH_TO_FINISH: 'FF',
      START_TO_FINISH: 'SF',
    };
    return labels[type] || type;
  };

  const getDependencyColor = (type: DependencyType): string => {
    const colors = {
      FINISH_TO_START: '#1890ff', // Most common - blue
      START_TO_START: '#52c41a', // Green
      FINISH_TO_FINISH: '#faad14', // Orange
      START_TO_FINISH: '#f5222d', // Red (rare)
    };
    return colors[type] || '#999';
  };

  const handleReset = () => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: {
          duration: 500,
          easingFunction: 'easeInOutQuad',
        },
      });
    }
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    }
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>Loading dependency graph...</div>
        </div>
      </Card>
    );
  }

  if (graphError) {
    return (
      <Card>
        <Alert
          message="Graph Rendering Error"
          description={graphError}
          type="error"
          showIcon
        />
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card>
        <Empty
          image={<NodeIndexOutlined style={{ fontSize: 64, color: '#999' }} />}
          description="No steps to visualize"
        >
          <Text type="secondary">Add routing steps to see the dependency graph</Text>
        </Empty>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <NodeIndexOutlined />
          Dependency Graph
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
            Reset View
          </Button>
          <Button icon={<FullscreenOutlined />} onClick={handleFullscreen} size="small">
            Fullscreen
          </Button>
        </Space>
      }
    >
      {/* Legend */}
      <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
        <Space size="middle" wrap>
          <Text strong>
            <InfoCircleOutlined /> Legend:
          </Text>
          <Tag color="red">Critical Path</Tag>
          <Tag color="green">Quality Inspection</Tag>
          <Tag color="blue">Optional</Tag>
          <Tag color="default">Standard</Tag>
        </Space>
        <div style={{ marginTop: '8px' }}>
          <Space size="middle" wrap>
            <Text type="secondary">Dependencies:</Text>
            <Text>
              <span style={{ color: '#1890ff' }}>●</span> FS (Finish-to-Start)
            </Text>
            <Text>
              <span style={{ color: '#52c41a' }}>●</span> SS (Start-to-Start)
            </Text>
            <Text>
              <span style={{ color: '#faad14' }}>●</span> FF (Finish-to-Finish)
            </Text>
            <Text>
              <span style={{ color: '#f5222d' }}>●</span> SF (Start-to-Finish)
            </Text>
          </Space>
        </div>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        style={{
          height: '600px',
          border: '1px solid #d9d9d9',
          borderRadius: '4px',
          background: '#fff',
        }}
      />

      {/* Info */}
      {dependencies.length === 0 && (
        <Alert
          message="No Dependencies Defined"
          description="This routing has no step dependencies. Steps will execute in sequential order by step number."
          type="info"
          showIcon
          style={{ marginTop: '16px' }}
        />
      )}
    </Card>
  );
};

export default DependencyGraph;
