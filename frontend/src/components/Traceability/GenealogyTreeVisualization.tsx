import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Card, Spin, Alert, Space, Button, InputNumber, Typography, Table, Collapse, Switch } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  TableOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import * as d3 from 'd3';

const { Text } = Typography;
const { Panel } = Collapse;

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

  // Accessibility state
  const [showDataTable, setShowDataTable] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  const [announceText, setAnnounceText] = useState<string>('');

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
      setAnnounceText(`Genealogy tree loaded with ${response.data.nodes.length} components`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load genealogy data');
      setAnnounceText('Failed to load genealogy data');
    } finally {
      setLoading(false);
    }
  };

  // Accessibility helper functions
  const announceToScreenReader = useCallback((message: string) => {
    setAnnounceText(message);
    // Clear after a short delay to allow for re-announcements
    setTimeout(() => setAnnounceText(''), 100);
  }, []);

  const getNodeAccessibleName = useCallback((node: GenealogyNode) => {
    return `${node.partName}, Serial ${node.serialNumber}, Part ${node.partNumber}, Status ${node.status}, Level ${node.level}`;
  }, []);

  const getNodeTypePattern = useCallback((nodeType: string) => {
    // Define patterns for accessibility beyond color
    switch (nodeType) {
      case 'finished': return 'solid-circle';
      case 'wip': return 'diagonal-stripes';
      case 'raw_material': return 'dots';
      case 'purchased': return 'cross-hatch';
      default: return 'solid-circle';
    }
  }, []);

  const handleKeyboardNavigation = useCallback((event: KeyboardEvent, nodeId: string, nodes: any[]) => {
    const currentIndex = nodes.findIndex(n => n.data.id === nodeId);
    let nextIndex = currentIndex;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % nodes.length;
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
        nextIndex = currentIndex - 1 < 0 ? nodes.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = nodes.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        showNodeDetails(nodes[currentIndex].data);
        return;
      default:
        return;
    }

    event.preventDefault();
    const nextNode = nodes[nextIndex];
    setFocusedNodeId(nextNode.data.id);

    // Focus the corresponding SVG element
    const nodeElement = d3.select(`[data-node-id="${nextNode.data.id}"]`);
    if (nodeElement.node()) {
      (nodeElement.node() as any).focus();
      announceToScreenReader(getNodeAccessibleName(nextNode.data));
    }
  }, [announceToScreenReader, getNodeAccessibleName]);

  // Render tree visualization
  useEffect(() => {
    if (!graphData || !svgRef.current) return;

    renderTree(graphData);
  }, [graphData, width, height]);

  const renderTree = (data: GenealogyGraph) => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Add SVG accessibility attributes
    svg
      .attr('role', 'img')
      .attr('aria-label', `Genealogy tree for ${serialNumber} showing ${data.nodes.length} components and their relationships`)
      .attr('tabindex', 0);

    // Add title and description for screen readers
    svg.append('title')
      .text(`Component Genealogy Tree for Serial Number ${serialNumber}`);

    svg.append('desc')
      .text(`Interactive tree diagram showing parent-child relationships between components.
             Contains ${data.nodes.length} nodes across ${data.maxDepth} levels.
             Use arrow keys to navigate between nodes, Enter or Space to view details.`);

    // Define patterns for accessibility beyond color
    const defs = svg.append('defs');

    // Diagonal stripes pattern for WIP items
    defs.append('pattern')
      .attr('id', 'diagonal-stripes')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 4)
      .attr('height', 4)
      .append('path')
      .attr('d', 'M 0,4 l 4,-4 M -1,1 l 2,-2 M 3,5 l 2,-2')
      .attr('stroke', '#faad14')
      .attr('stroke-width', 1);

    // Dots pattern for raw materials
    defs.append('pattern')
      .attr('id', 'dots')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 6)
      .attr('height', 6)
      .append('circle')
      .attr('cx', 3)
      .attr('cy', 3)
      .attr('r', 1)
      .attr('fill', '#52c41a');

    // Cross-hatch pattern for purchased parts
    defs.append('pattern')
      .attr('id', 'cross-hatch')
      .attr('patternUnits', 'userSpaceOnUse')
      .attr('width', 8)
      .attr('height', 8)
      .append('g')
      .selectAll('path')
      .data(['M 0,0 l 8,8', 'M 0,8 l 8,-8'])
      .enter()
      .append('path')
      .attr('d', d => d)
      .attr('stroke', '#722ed1')
      .attr('stroke-width', 1);

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

    // Draw links (edges) with accessibility
    g.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('role', 'presentation')
      .attr('aria-hidden', 'true')
      .attr('d', (d: any) => {
        return `M${d.source.y},${d.source.x}
                C${(d.source.y + d.target.y) / 2},${d.source.x}
                 ${(d.source.y + d.target.y) / 2},${d.target.x}
                 ${d.target.y},${d.target.x}`;
      })
      .attr('fill', 'none')
      .attr('stroke', '#ccc')
      .attr('stroke-width', 2);

    // Draw nodes with full accessibility support
    const nodeDescendants = root.descendants();
    const nodes = g
      .selectAll('.node')
      .data(nodeDescendants)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.y},${d.x})`)
      .attr('role', 'button')
      .attr('tabindex', (d: any, i: number) => i === 0 ? 0 : -1)
      .attr('aria-label', (d: any) => getNodeAccessibleName(d.data))
      .attr('aria-describedby', (d: any) => `node-${d.data.id}-desc`)
      .attr('data-node-id', (d: any) => d.data.id)
      .style('cursor', 'pointer')
      .style('outline', 'none')
      .on('focus', function(event, d: any) {
        setFocusedNodeId(d.data.id);
        d3.select(this).select('circle').attr('r', 12);
        announceToScreenReader(`Focused on ${getNodeAccessibleName(d.data)}`);
      })
      .on('blur', function(event, d: any) {
        d3.select(this).select('circle').attr('r', 8);
      })
      .on('keydown', function(event, d: any) {
        handleKeyboardNavigation(event, d.data.id, nodeDescendants);
      });

    // Node circles with patterns for accessibility
    nodes
      .append('circle')
      .attr('r', 8)
      .attr('fill', (d: any) => {
        const pattern = getNodeTypePattern(d.data.nodeType);
        return pattern === 'solid-circle' ? getNodeColor(d.data.nodeType) : `url(#${pattern})`;
      })
      .attr('stroke', (d: any) => (d.data.id === data.rootNodeId ? '#1890ff' : '#fff'))
      .attr('stroke-width', (d: any) => (d.data.id === data.rootNodeId ? 3 : 2))
      .on('mouseover', function (event, d: any) {
        d3.select(this).attr('r', 12);
        if (!focusedNodeId) {
          announceToScreenReader(`Hovering over ${getNodeAccessibleName(d.data)}`);
        }
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 8);
      });

    // Add hidden descriptions for screen readers
    nodes
      .append('desc')
      .attr('id', (d: any) => `node-${d.data.id}-desc`)
      .text((d: any) => `Node type: ${d.data.nodeType}.
        ${d.data.manufactureDate ? `Manufactured: ${d.data.manufactureDate}. ` : ''}
        ${d.data.lotNumber ? `Lot: ${d.data.lotNumber}. ` : ''}
        Level ${d.data.level} in hierarchy.`);

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

    // Add click handler for mouse users and keyboard users
    nodes.on('click', (_event, d: any) => {
      setSelectedNodeId(d.data.id);
      showNodeDetails(d.data);
      announceToScreenReader(`Selected ${getNodeAccessibleName(d.data)}. Details panel opened.`);
    });

    // Set initial focus on root node
    const rootNode = nodes.filter((d: any) => d.data.id === data.rootNodeId);
    if (rootNode.node()) {
      // Set up focus for keyboard navigation
      setTimeout(() => {
        if (!focusedNodeId) {
          setFocusedNodeId(data.rootNodeId);
        }
      }, 100);
    }

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
    // For now, announce the details to screen readers
    const details = `Node details: ${node.partName}, Serial ${node.serialNumber},
      Part ${node.partNumber}, Status ${node.status}, Type ${node.nodeType}, Level ${node.level}.
      ${node.manufactureDate ? `Manufactured ${node.manufactureDate}. ` : ''}
      ${node.lotNumber ? `Lot number ${node.lotNumber}. ` : ''}`;
    announceToScreenReader(details);
  };

  const handleZoomIn = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, 1.3);
    announceToScreenReader(`Zoomed in. Current zoom level: ${(zoomLevel * 130).toFixed(0)}%`);
  };

  const handleZoomOut = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().call(d3.zoom().scaleBy as any, 0.7);
    announceToScreenReader(`Zoomed out. Current zoom level: ${(zoomLevel * 70).toFixed(0)}%`);
  };

  const handleReset = () => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const initialTransform = d3.zoomIdentity.translate(100, height / 2);
    svg.transition().call(d3.zoom().transform as any, initialTransform);
    announceToScreenReader('View reset to default position and zoom level');
  };

  // Generate data for table view
  const getTableData = useCallback(() => {
    if (!graphData) return [];

    return graphData.nodes.map((node, index) => ({
      key: node.id,
      index: index + 1,
      serialNumber: node.serialNumber,
      partNumber: node.partNumber,
      partName: node.partName,
      partType: node.partType,
      nodeType: node.nodeType,
      status: node.status,
      level: node.level,
      lotNumber: node.lotNumber || 'N/A',
      manufactureDate: node.manufactureDate || 'N/A',
    }));
  }, [graphData]);

  const tableColumns = [
    {
      title: 'Index',
      dataIndex: 'index',
      key: 'index',
      width: 70,
    },
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      sorter: (a: any, b: any) => a.serialNumber.localeCompare(b.serialNumber),
    },
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
      sorter: (a: any, b: any) => a.partNumber.localeCompare(b.partNumber),
    },
    {
      title: 'Part Name',
      dataIndex: 'partName',
      key: 'partName',
      sorter: (a: any, b: any) => a.partName.localeCompare(b.partName),
    },
    {
      title: 'Type',
      dataIndex: 'nodeType',
      key: 'nodeType',
      sorter: (a: any, b: any) => a.nodeType.localeCompare(b.nodeType),
      render: (nodeType: string) => {
        const typeMap: Record<string, string> = {
          finished: 'Finished Product',
          wip: 'Work in Progress',
          raw_material: 'Raw Material',
          purchased: 'Purchased Part',
        };
        return typeMap[nodeType] || nodeType;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      sorter: (a: any, b: any) => a.status.localeCompare(b.status),
    },
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      sorter: (a: any, b: any) => a.level - b.level,
      width: 80,
    },
    {
      title: 'Lot Number',
      dataIndex: 'lotNumber',
      key: 'lotNumber',
    },
    {
      title: 'Manufacture Date',
      dataIndex: 'manufactureDate',
      key: 'manufactureDate',
      sorter: (a: any, b: any) => {
        if (a.manufactureDate === 'N/A') return 1;
        if (b.manufactureDate === 'N/A') return -1;
        return new Date(a.manufactureDate).getTime() - new Date(b.manufactureDate).getTime();
      },
    },
  ];

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="Loading genealogy tree..."><div /></Spin>
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
        <Space wrap>
          <Text type="secondary">Max Depth:</Text>
          <InputNumber
            min={1}
            max={10}
            value={currentDepth}
            onChange={(val) => val && setCurrentDepth(val)}
            style={{ width: 70 }}
            aria-label="Maximum depth level for genealogy tree"
          />
          <Button
            icon={<ZoomInOutlined />}
            onClick={handleZoomIn}
            size="small"
            aria-label="Zoom in on genealogy tree"
          >
            Zoom In
          </Button>
          <Button
            icon={<ZoomOutOutlined />}
            onClick={handleZoomOut}
            size="small"
            aria-label="Zoom out of genealogy tree"
          >
            Zoom Out
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
            size="small"
            aria-label="Reset genealogy tree view to default position"
          >
            Reset View
          </Button>
          <Button
            icon={<TableOutlined />}
            onClick={() => setShowDataTable(!showDataTable)}
            size="small"
            type={showDataTable ? 'primary' : 'default'}
            aria-label={showDataTable ? 'Hide data table view' : 'Show data table view'}
            aria-pressed={showDataTable}
          >
            Table View
          </Button>
          <Button icon={<FullscreenOutlined />} size="small" aria-label="Enter fullscreen mode">
            Fullscreen
          </Button>
        </Space>
      }
    >
      <div style={{ marginBottom: 16 }} role="region" aria-label="Legend for component types">
        <Text strong style={{ marginRight: 16 }}>Legend:</Text>
        <Space wrap>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#1890ff',
                borderRadius: '50%',
                border: '1px solid #ccc',
              }}
              aria-hidden="true"
            />
            <Text type="secondary">Finished Product (Solid Blue Circle)</Text>
          </Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#faad14',
                borderRadius: '50%',
                border: '1px solid #ccc',
                backgroundImage: 'repeating-linear-gradient(45deg, #faad14, #faad14 2px, transparent 2px, transparent 4px)',
              }}
              aria-hidden="true"
            />
            <Text type="secondary">Work in Progress (Orange with Diagonal Stripes)</Text>
          </Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#52c41a',
                borderRadius: '50%',
                border: '1px solid #ccc',
                backgroundImage: 'radial-gradient(circle, #52c41a 1px, transparent 1px)',
                backgroundSize: '4px 4px',
              }}
              aria-hidden="true"
            />
            <Text type="secondary">Raw Material (Green with Dots)</Text>
          </Space>
          <Space>
            <div
              style={{
                width: 16,
                height: 16,
                backgroundColor: '#722ed1',
                borderRadius: '50%',
                border: '1px solid #ccc',
                backgroundImage: 'repeating-linear-gradient(0deg, #722ed1, #722ed1 1px, transparent 1px, transparent 3px), repeating-linear-gradient(90deg, #722ed1, #722ed1 1px, transparent 1px, transparent 3px)',
              }}
              aria-hidden="true"
            />
            <Text type="secondary">Purchased Part (Purple with Cross-hatch)</Text>
          </Space>
        </Space>
      </div>

      <div style={{ marginBottom: 8 }} role="status" aria-live="polite">
        <Text type="secondary">
          Total Nodes: {graphData.nodes.length} | Max Depth: {graphData.maxDepth} | Zoom:{' '}
          {(zoomLevel * 100).toFixed(0)}%
        </Text>
      </div>

      {/* Accessibility instructions */}
      <div style={{ marginBottom: 16, padding: '8px 12px', backgroundColor: '#f6f6f6', borderRadius: 4 }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>Accessibility:</strong> Use Tab to enter the tree, arrow keys to navigate nodes, Enter/Space to view details.
          Toggle Table View for alternative data access.
        </Text>
      </div>

      {/* Live region for screen reader announcements */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          left: '-10000px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
      >
        {announceText}
      </div>

      {/* Data Table View */}
      {showDataTable && (
        <div style={{ marginBottom: 16 }}>
          <Collapse
            defaultActiveKey={['table']}
            size="small"
          >
            <Panel
              header="Genealogy Data Table - Alternative View"
              key="table"
              extra={
                <Text type="secondary">
                  {graphData.nodes.length} components
                </Text>
              }
            >
              <Table
                columns={tableColumns}
                dataSource={getTableData()}
                size="small"
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} components`,
                }}
                scroll={{ x: 1200 }}
                rowSelection={{
                  type: 'radio',
                  selectedRowKeys: selectedNodeId ? [selectedNodeId] : [],
                  onSelect: (record) => {
                    setSelectedNodeId(record.key);
                    const node = graphData.nodes.find(n => n.id === record.key);
                    if (node) {
                      showNodeDetails(node);
                    }
                  },
                }}
                aria-label="Genealogy tree data in table format"
              />
            </Panel>
          </Collapse>
        </div>
      )}

      <div
        style={{ border: '1px solid #d9d9d9', borderRadius: 4, overflow: 'hidden' }}
        role="application"
        aria-label="Interactive genealogy tree visualization"
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          style={{ backgroundColor: '#fafafa' }}
          onKeyDown={(e) => {
            // Handle global keyboard shortcuts
            if (e.key === 'Escape') {
              setFocusedNodeId(null);
              announceToScreenReader('Focus cleared from tree nodes');
            }
          }}
        />
      </div>
    </Card>
  );
};

export default GenealogyTreeVisualization;
