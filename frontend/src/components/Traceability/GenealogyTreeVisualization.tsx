import React, { useEffect, useRef, useState } from 'react';
import { Card, Spin, Alert, Space, Button, InputNumber, Typography } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as d3 from 'd3';

const { Text } = Typography;

interface GenealogyNode {
  id: string;
  serialNumber: string;
  partNumber: string;
  partName: string;
  partType: string;
  lotNumber?: string;
  status: string;
  manufactureDate?: string;
  level: number;
  nodeType: 'finished' | 'wip' | 'raw_material' | 'purchased';
}

interface GenealogyEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'contains' | 'used_in';
  assemblyDate?: string;
  assemblyOperator?: string;
}

interface GenealogyGraph {
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
  rootNodeId: string;
  maxDepth: number;
}

interface GenealogyTreeVisualizationProps {
  serialNumber: string;
  maxDepth?: number;
  width?: number;
  height?: number;
}

export const GenealogyTreeVisualization: React.FC<GenealogyTreeVisualizationProps> = ({
  serialNumber,
  maxDepth = 5,
  width = 1200,
  height = 800,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<GenealogyGraph | null>(null);
  const [currentDepth, setCurrentDepth] = useState(maxDepth);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Load genealogy data
  useEffect(() => {
    loadGenealogy();
  }, [serialNumber, currentDepth]);

  const loadGenealogy = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(
        `/api/v1/traceability/genealogy-graph/${serialNumber}?maxDepth=${currentDepth}`
      );
      setGraphData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load genealogy data');
    } finally {
      setLoading(false);
    }
  };

  // Render tree visualization
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    renderTree(graphData);
  }, [graphData, width, height]);

  const renderTree = (data: GenealogyGraph) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Create container group
    const g = svg.append('g').attr('class', 'genealogy-tree');

    // Define zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom as any);

    // Convert graph to hierarchy
    const hierarchy = buildHierarchy(data);
    if (!hierarchy) return;

    // Create tree layout
    const treeLayout = d3.tree<any>().size([height - 100, width - 200]);
    const root = treeLayout(hierarchy);

    // Draw links (edges)
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', (d: any) => {
        return `M${d.source.y},${d.source.x}
                C${(d.source.y + d.target.y) / 2},${d.source.x}
                 ${(d.source.y + d.target.y) / 2},${d.target.x}
                 ${d.target.y},${d.target.x}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    // Draw nodes
    const nodes = g
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`);

    // Node circles
    nodes
      .append('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => getNodeColor(d.data.nodeType))
      .attr('stroke', (d: any) => (d.data.id === data.rootNodeId ? '#1890ff' : '#fff'))
      .attr('stroke-width', (d: any) => (d.data.id === data.rootNodeId ? 3 : 2))
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this).attr('r', 12);
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 8);
      });

    // Node labels
    nodes
      .append('text')
      .attr('dy', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text((d: any) => d.data.serialNumber);

    nodes
      .append('text')
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .style('font-size', '10px')
      .style('fill', '#666')
      .text((d: any) => d.data.partNumber);

    // Add tooltip on click
    nodes.on('click', (_event, d: any) => {
      showNodeDetails(d.data);
    });

    // Center initial view
    const initialTransform = d3.zoomIdentity.translate(100, height / 2);
    svg.call(zoom.transform as any, initialTransform);
  };

  const buildHierarchy = (data: GenealogyGraph): d3.HierarchyNode<any> | null => {
    if (data.nodes.length === 0) return null;

    // Build node map
    const nodeMap = new Map(data.nodes.map((n) => [n.id, { ...n, children: [] as any[] }]));

    // Build parent-child relationships
    data.edges.forEach((edge) => {
      const parent = nodeMap.get(edge.source);
      const child = nodeMap.get(edge.target);

      if (parent && child) {
        parent.children.push(child);
      }
    });

    // Find root node
    const root = nodeMap.get(data.rootNodeId);
    if (!root) return null;

    return d3.hierarchy(root);
  };

  const getNodeColor = (nodeType: string): string => {
    switch (nodeType) {
      case 'finished':
        return '#1890ff'; // Blue
      case 'wip':
        return '#faad14'; // Orange
      case 'raw_material':
        return '#52c41a'; // Green
      case 'purchased':
        return '#722ed1'; // Purple
      default:
        return '#d9d9d9'; // Gray
    }
  };

  const showNodeDetails = (node: GenealogyNode) => {
    // TODO: Show modal with node details
    console.log('Node details:', node);
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, 0.7);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const initialTransform = d3.zoomIdentity.translate(100, height / 2);
    svg.transition().call(d3.zoom().transform as any, initialTransform);
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="Loading genealogy tree..." />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Alert
          message="Error Loading Genealogy"
          description={error}
          type="error"
          showIcon
          action={
            <Button size="small" onClick={loadGenealogy}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card>
        <Alert
          message="No Genealogy Data"
          description="No component relationships found for this serial number."
          type="info"
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card
      title="Genealogy Tree Visualization"
      extra={
        <Space>
          <Text type="secondary">Max Depth:</Text>
          <InputNumber
            min={1}
            max={10}
            value={currentDepth}
            onChange={(val) => val && setCurrentDepth(val)}
            style={{ width: 70 }}
          />
          <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} size="small">
            Zoom In
          </Button>
          <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} size="small">
            Zoom Out
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
            Reset View
          </Button>
          <Button icon={<FullscreenOutlined />} size="small">
            Fullscreen
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#1890ff',
                borderRadius: '50%',
              }}
            />
            <Text type="secondary">Finished Product</Text>
          </Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#faad14',
                borderRadius: '50%',
              }}
            />
            <Text type="secondary">Work in Progress</Text>
          </Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#52c41a',
                borderRadius: '50%',
              }}
            />
            <Text type="secondary">Raw Material</Text>
          </Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#722ed1',
                borderRadius: '50%',
              }}
            />
            <Text type="secondary">Purchased Part</Text>
          </Space>
        </Space>
      </div>

      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">
          Total Nodes: {graphData.nodes.length} | Max Depth: {graphData.maxDepth} | Zoom:{' '}
          {(zoomLevel * 100).toFixed(0)}%
        </Text>
      </div>

      <div style={{ border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}>
        <svg ref={svgRef} width={width} height={height} style={{ backgroundColor: '#fafafa' }} />
      </div>
    </Card>
  );
};

export default GenealogyTreeVisualization;
