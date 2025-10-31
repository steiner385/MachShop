import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../../styles/reactflow-keyboard.css';
import { listFormulas, extractDependencies, ParameterFormula } from '../../api/parameters';
import { useReactFlowKeyboard, generateReactFlowAriaLabels } from '@/hooks/useReactFlowKeyboard';
import { announceToScreenReader } from '@/utils/ariaUtils';

interface DependencyVisualizerProps {
  formulaId?: string; // Optional: highlight specific formula and its dependencies
}

interface DependencyGraph {
  nodes: Node[];
  edges: Edge[];
  cycles: string[][];
}

const NODE_COLORS = {
  default: '#E3F2FD',
  selected: '#BBDEFB',
  dependency: '#FFE082',
  dependent: '#C5E1A5',
  cycle: '#FFCDD2',
  highlighted: '#2196F3',
};

export const DependencyVisualizer: React.FC<DependencyVisualizerProps> = ({ formulaId }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(formulaId || null);
  const [cycles, setCycles] = useState<string[][]>([]);
  const [showCycles, setShowCycles] = useState(false);

  const reactFlowInstance = useReactFlow();

  // Keyboard navigation callbacks for dependency graph
  const handleNodeSelect = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    announceToScreenReader(`Selected formula: ${nodeId}`);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    // DependencyVisualizer is read-only, so no deletion allowed
    announceToScreenReader('Dependencies are read-only and cannot be deleted');
  }, []);

  const handleEdgeSelect = useCallback((edgeId: string) => {
    // Find the edge to get source and target info
    const edge = edges.find(e => e.id === edgeId);
    if (edge) {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      announceToScreenReader(
        `Selected dependency from ${sourceNode?.data.label || edge.source} to ${targetNode?.data.label || edge.target}`
      );
    }
  }, [edges, nodes]);

  // Initialize keyboard navigation for dependency graph
  const {
    containerRef,
    focusElement,
    clearFocusIndicators,
  } = useReactFlowKeyboard({
    reactFlowInstance,
    nodes,
    edges,
    onNodeSelect: handleNodeSelect,
    onEdgeSelect: handleEdgeSelect,
    onNodeDelete: handleNodeDelete,
    enableNodeEdit: false, // Read-only visualization
    enableConnection: false, // Read-only visualization
  });

  useEffect(() => {
    loadDependencyGraph();
  }, []);

  useEffect(() => {
    if (selectedNode) {
      highlightDependencies(selectedNode);
    } else {
      resetHighlighting();
    }
  }, [selectedNode]);

  const loadDependencyGraph = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all formulas
      const formulas = await listFormulas();

      // Build dependency map
      const dependencyMap = new Map<string, string[]>();

      for (const formula of formulas) {
        try {
          const { dependencies } = await extractDependencies(formula.formulaExpression);
          dependencyMap.set(formula.id, dependencies);
        } catch (err) {
          console.error(`Failed to extract dependencies for formula ${formula.id}:`, err);
          dependencyMap.set(formula.id, []);
        }
      }

      // Create graph
      const graph = buildGraph(formulas, dependencyMap);
      setNodes(graph.nodes);
      setEdges(graph.edges);
      setCycles(graph.cycles);

      if (formulaId) {
        setSelectedNode(formulaId);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load dependency graph');
    } finally {
      setLoading(false);
    }
  };

  const buildGraph = (
    formulas: ParameterFormula[],
    dependencyMap: Map<string, string[]>
  ): DependencyGraph => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const formulaMap = new Map(formulas.map((f) => [f.formulaName, f.id]));

    // Create a map from ID to formula for easy lookup
    const formulaById = new Map(formulas.map((f) => [f.id, f]));

    // Create nodes
    formulas.forEach((formula, index) => {
      nodes.push({
        id: formula.id,
        data: {
          label: (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{formula.formulaName}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {formula.formulaExpression.length > 30
                  ? formula.formulaExpression.substring(0, 30) + '...'
                  : formula.formulaExpression}
              </div>
            </div>
          ),
        },
        position: {
          x: (index % 5) * 250,
          y: Math.floor(index / 5) * 150,
        },
        style: {
          backgroundColor: NODE_COLORS.default,
          border: '2px solid #2196F3',
          borderRadius: '8px',
          padding: '12px',
          minWidth: '180px',
        },
      });
    });

    // Create edges based on dependencies
    dependencyMap.forEach((deps, formulaId) => {
      deps.forEach((dep) => {
        const targetFormulaId = formulaMap.get(dep);
        if (targetFormulaId) {
          edges.push({
            id: `${formulaId}-${targetFormulaId}`,
            source: targetFormulaId,
            target: formulaId,
            type: 'smoothstep',
            animated: false,
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
            },
            style: {
              strokeWidth: 2,
              stroke: '#2196F3',
            },
          });
        }
      });
    });

    // Detect cycles
    const detectedCycles = detectCycles(dependencyMap, formulaById);

    return { nodes, edges, cycles: detectedCycles };
  };

  const detectCycles = (
    dependencyMap: Map<string, string[]>,
    formulaById: Map<string, ParameterFormula>
  ): string[][] => {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (formulaId: string) => {
      visited.add(formulaId);
      recursionStack.add(formulaId);
      currentPath.push(formulaId);

      const deps = dependencyMap.get(formulaId) || [];
      const formula = formulaById.get(formulaId);

      if (formula) {
        for (const dep of deps) {
          // Find the formula ID by name
          const depFormulaId = Array.from(formulaById.values()).find(
            (f) => f.formulaName === dep
          )?.id;

          if (!depFormulaId) continue;

          if (!visited.has(depFormulaId)) {
            dfs(depFormulaId);
          } else if (recursionStack.has(depFormulaId)) {
            // Cycle detected
            const cycleStartIndex = currentPath.indexOf(depFormulaId);
            if (cycleStartIndex !== -1) {
              const cycle = currentPath.slice(cycleStartIndex);
              cycles.push(cycle);
            }
          }
        }
      }

      currentPath.pop();
      recursionStack.delete(formulaId);
    };

    dependencyMap.forEach((_, formulaId) => {
      if (!visited.has(formulaId)) {
        dfs(formulaId);
      }
    });

    return cycles;
  };

  const highlightDependencies = useCallback(
    (nodeId: string) => {
      // Find all dependencies (formulas this formula depends on)
      const dependencies = new Set<string>();
      const dependents = new Set<string>();

      const findDependencies = (id: string) => {
        edges.forEach((edge) => {
          if (edge.target === id && !dependencies.has(edge.source)) {
            dependencies.add(edge.source);
            findDependencies(edge.source);
          }
        });
      };

      const findDependents = (id: string) => {
        edges.forEach((edge) => {
          if (edge.source === id && !dependents.has(edge.target)) {
            dependents.add(edge.target);
            findDependents(edge.target);
          }
        });
      };

      findDependencies(nodeId);
      findDependents(nodeId);

      // Check if node is in a cycle
      const isInCycle = cycles.some((cycle) => cycle.includes(nodeId));

      // Update node colors
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          style: {
            ...node.style,
            backgroundColor:
              node.id === nodeId
                ? NODE_COLORS.highlighted
                : isInCycle && cycles.some((cycle) => cycle.includes(node.id))
                ? NODE_COLORS.cycle
                : dependencies.has(node.id)
                ? NODE_COLORS.dependency
                : dependents.has(node.id)
                ? NODE_COLORS.dependent
                : NODE_COLORS.default,
            borderWidth: node.id === nodeId ? '3px' : '2px',
          },
        }))
      );

      // Update edge colors
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          animated:
            edge.source === nodeId ||
            edge.target === nodeId ||
            dependencies.has(edge.source) ||
            dependents.has(edge.target),
          style: {
            ...edge.style,
            strokeWidth:
              edge.source === nodeId || edge.target === nodeId ? 3 : 2,
            stroke:
              edge.source === nodeId || edge.target === nodeId
                ? '#FF5722'
                : dependencies.has(edge.source) && dependencies.has(edge.target)
                ? '#FFA726'
                : dependents.has(edge.source) && dependents.has(edge.target)
                ? '#66BB6A'
                : '#2196F3',
          },
        }))
      );
    },
    [edges, setNodes, setEdges, cycles]
  );

  const resetHighlighting = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        style: {
          ...node.style,
          backgroundColor: NODE_COLORS.default,
          borderWidth: '2px',
        },
      }))
    );

    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: false,
        style: {
          ...edge.style,
          strokeWidth: 2,
          stroke: '#2196F3',
        },
      }))
    );
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id === selectedNode ? null : node.id);
    },
    [selectedNode]
  );

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading dependency graph...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#FFEBEE',
          color: '#C62828',
          borderRadius: '4px',
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '600px', border: '1px solid #E0E0E0', borderRadius: '8px' }}
      role="application"
      aria-label="Parameter dependency visualization"
      aria-describedby="dependency-instructions"
    >
      {/* Skip to content link for keyboard users */}
      <a href="#dependency-diagram-content" className="reactflow-skip-link">
        Skip to dependency diagram
      </a>

      {/* Screen reader instructions */}
      <div id="dependency-instructions" className="sr-only">
        Parameter dependency diagram. Use Tab to navigate between formulas and connections, arrow keys to move between elements.
        Press Enter to select a formula and highlight its dependencies. This diagram is read-only.
      </div>

      {/* Live region for announcements */}
      <div className="reactflow-announcements" aria-live="polite" aria-atomic="true"></div>

      <ReactFlow
        id="dependency-diagram-content"
        nodes={nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            ...generateReactFlowAriaLabels.node(node),
          },
        }))}
        edges={edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          return {
            ...edge,
            data: {
              ...edge.data,
              ...generateReactFlowAriaLabels.edge(edge, sourceNode, targetNode),
            },
          };
        })}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.id === selectedNode) return NODE_COLORS.highlighted;
            return NODE_COLORS.default;
          }}
        />
        <Panel position="top-left">
          <div
            style={{
              backgroundColor: 'white',
              padding: '12px',
              borderRadius: '6px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontSize: '12px',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Legend</div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: NODE_COLORS.highlighted,
                  marginRight: '8px',
                  border: '1px solid #2196F3',
                }}
              ></div>
              <span>Selected</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: NODE_COLORS.dependency,
                  marginRight: '8px',
                  border: '1px solid #2196F3',
                }}
              ></div>
              <span>Dependencies</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: NODE_COLORS.dependent,
                  marginRight: '8px',
                  border: '1px solid #2196F3',
                }}
              ></div>
              <span>Dependents</span>
            </div>
            {cycles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: NODE_COLORS.cycle,
                    marginRight: '8px',
                    border: '1px solid #F44336',
                  }}
                ></div>
                <span>Circular Dependency</span>
              </div>
            )}
          </div>
        </Panel>
        {cycles.length > 0 && (
          <Panel position="top-right">
            <div
              style={{
                backgroundColor: '#FFEBEE',
                padding: '12px',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                fontSize: '12px',
                maxWidth: '200px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#C62828', marginBottom: '8px' }}>
                ⚠️ {cycles.length} Circular Dependenc{cycles.length > 1 ? 'ies' : 'y'} Detected
              </div>
              <button
                onClick={() => setShowCycles(!showCycles)}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: '#F44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                }}
              >
                {showCycles ? 'Hide' : 'Show'} Details
              </button>
              {showCycles && (
                <div style={{ marginTop: '8px', fontSize: '11px' }}>
                  {cycles.map((cycle, index) => (
                    <div key={index} style={{ marginBottom: '4px' }}>
                      Cycle {index + 1}: {cycle.length} formulas
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
};
