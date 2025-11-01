/**
 * Node Palette Component
 * Sidebar with categorized node types for drag-and-drop creation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { NodeType } from '../types/workflow';
import { getNodeIcon, getNodeColor, getNodeCategory } from '../utils/nodeUtils';
import './NodePalette.css';

export interface NodePaletteProps {
  onNodeDragStart?: (nodeType: NodeType, event: React.DragEvent) => void;
  isReadOnly?: boolean;
}

interface NodeTypeInfo {
  type: NodeType;
  label: string;
  description?: string;
  category: string;
}

const NODE_TYPES: NodeTypeInfo[] = [
  // Start/End
  { type: NodeType.START, label: 'Start', description: 'Workflow entry point', category: 'start_end' },
  { type: NodeType.END, label: 'End', description: 'Workflow completion', category: 'start_end' },

  // Operations
  { type: NodeType.MATERIAL_CONSUME, label: 'Consume Material', description: 'Use material from inventory', category: 'operations' },
  { type: NodeType.EQUIPMENT_OPERATION, label: 'Equipment Op', description: 'Perform equipment operation', category: 'operations' },
  { type: NodeType.QUALITY_CHECK, label: 'Quality Check', description: 'Quality verification', category: 'operations' },
  { type: NodeType.DATA_TRANSFORMATION, label: 'Transform', description: 'Transform workflow variables', category: 'operations' },
  { type: NodeType.API_CALL, label: 'API Call', description: 'Call external REST API', category: 'operations' },
  { type: NodeType.SUBPROCESS, label: 'Subprocess', description: 'Call nested workflow', category: 'operations' },

  // Decisions
  { type: NodeType.IF_THEN_ELSE, label: 'If/Then/Else', description: 'Conditional branching', category: 'decisions' },
  { type: NodeType.SWITCH, label: 'Switch', description: 'Multi-way branching', category: 'decisions' },
  { type: NodeType.LOOP, label: 'Loop', description: 'Repeat section', category: 'decisions' },
  { type: NodeType.WAIT, label: 'Wait', description: 'Pause execution', category: 'decisions' },
  { type: NodeType.PARALLEL, label: 'Parallel', description: 'Execute multiple paths', category: 'decisions' },

  // Integrations
  { type: NodeType.SALESFORCE_CONNECTOR, label: 'Salesforce', description: 'Salesforce integration', category: 'integrations' },
  { type: NodeType.SAP_CONNECTOR, label: 'SAP', description: 'SAP integration', category: 'integrations' },
  { type: NodeType.NETSUITE_CONNECTOR, label: 'NetSuite', description: 'NetSuite integration', category: 'integrations' },
  { type: NodeType.CUSTOM_API, label: 'Custom API', description: 'Generic REST API', category: 'integrations' },
  { type: NodeType.EVENT_PUBLISHER, label: 'Publish Event', description: 'Publish to event bus', category: 'integrations' },
  { type: NodeType.EVENT_SUBSCRIBER, label: 'Subscribe Event', description: 'Listen for events', category: 'integrations' },

  // Error Handling
  { type: NodeType.ERROR_HANDLER, label: 'Error Handler', description: 'Catch and handle errors', category: 'error_handling' },
  { type: NodeType.RETRY_LOGIC, label: 'Retry', description: 'Automatic retry with backoff', category: 'error_handling' },
  { type: NodeType.FALLBACK_PATH, label: 'Fallback', description: 'Execute alternative on failure', category: 'error_handling' },
  { type: NodeType.NOTIFICATION, label: 'Notification', description: 'Send alerts/notifications', category: 'error_handling' },
];

const CATEGORIES = [
  { id: 'start_end', label: 'Start/End', icon: '◆' },
  { id: 'operations', label: 'Operations', icon: '⚙' },
  { id: 'decisions', label: 'Decisions', icon: '◇' },
  { id: 'integrations', label: 'Integrations', icon: '🔗' },
  { id: 'error_handling', label: 'Error Handling', icon: '⚠' },
];

/**
 * NodePalette - Sidebar with categorized node types
 *
 * Features:
 * - Categorized node types
 * - Search and filter
 * - Favorites
 * - Recently used
 * - Drag-and-drop support
 * - Tooltips and descriptions
 * - Accessible design
 */
export const NodePalette: React.FC<NodePaletteProps> = ({
  onNodeDragStart,
  isReadOnly = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['start_end', 'operations'])
  );
  const [favorites, setFavorites] = useState<Set<NodeType>>(new Set());
  const [recentlyUsed, setRecentlyUsed] = useState<NodeType[]>([]);

  const filteredNodes = useMemo(() => {
    if (!searchQuery) return NODE_TYPES;

    const query = searchQuery.toLowerCase();
    return NODE_TYPES.filter(
      node =>
        node.label.toLowerCase().includes(query) ||
        node.description?.toLowerCase().includes(query) ||
        node.type.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const nodesByCategory = useMemo(() => {
    const result: Record<string, NodeTypeInfo[]> = {};
    CATEGORIES.forEach(cat => {
      result[cat.id] = filteredNodes.filter(node => node.category === cat.id);
    });
    return result;
  }, [filteredNodes]);

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((nodeType: NodeType) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(nodeType)) {
        next.delete(nodeType);
      } else {
        next.add(nodeType);
      }
      return next;
    });
  }, []);

  const handleNodeDragStart = useCallback(
    (nodeType: NodeType, event: React.DragEvent) => {
      if (!isReadOnly) {
        // Record recently used
        setRecentlyUsed(prev => {
          const filtered = prev.filter(t => t !== nodeType);
          return [nodeType, ...filtered].slice(0, 5);
        });

        // Call parent handler
        onNodeDragStart?.(nodeType, event);
      }
    },
    [isReadOnly, onNodeDragStart]
  );

  return (
    <div className="node-palette" role="region" aria-label="Node palette">
      {/* Header */}
      <div className="palette-header">
        <h2 className="palette-title">Nodes</h2>
      </div>

      {/* Search */}
      <div className="palette-search">
        <input
          type="text"
          className="search-input"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          disabled={isReadOnly}
          aria-label="Search nodes"
        />
        {searchQuery && (
          <button
            className="clear-search"
            onClick={() => setSearchQuery('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Recently Used */}
      {recentlyUsed.length > 0 && (
        <div className="palette-section">
          <h3 className="section-title">Recently Used</h3>
          <div className="nodes-grid">
            {recentlyUsed.map(nodeType => {
              const info = NODE_TYPES.find(n => n.type === nodeType);
              if (!info) return null;

              return (
                <NodeTypeItem
                  key={nodeType}
                  nodeType={info.type}
                  label={info.label}
                  isFavorite={favorites.has(nodeType)}
                  onDragStart={handleNodeDragStart}
                  onFavoriteToggle={toggleFavorite}
                  isReadOnly={isReadOnly}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Favorites */}
      {favorites.size > 0 && (
        <div className="palette-section">
          <h3 className="section-title">Favorites</h3>
          <div className="nodes-grid">
            {Array.from(favorites).map(nodeType => {
              const info = NODE_TYPES.find(n => n.type === nodeType);
              if (!info) return null;

              return (
                <NodeTypeItem
                  key={nodeType}
                  nodeType={info.type}
                  label={info.label}
                  isFavorite={true}
                  onDragStart={handleNodeDragStart}
                  onFavoriteToggle={toggleFavorite}
                  isReadOnly={isReadOnly}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="palette-categories">
        {CATEGORIES.map(category => (
          <div key={category.id} className="category-section">
            {/* Category Header */}
            <button
              className={`category-header ${expandedCategories.has(category.id) ? 'expanded' : ''}`}
              onClick={() => toggleCategory(category.id)}
              aria-expanded={expandedCategories.has(category.id)}
              aria-label={`${category.label} nodes`}
            >
              <span className="category-icon">{category.icon}</span>
              <span className="category-label">{category.label}</span>
              <span className="category-count">
                ({nodesByCategory[category.id].length})
              </span>
              <span className="expand-icon">▼</span>
            </button>

            {/* Category Nodes */}
            {expandedCategories.has(category.id) && (
              <div className="nodes-grid">
                {nodesByCategory[category.id].map(nodeInfo => (
                  <NodeTypeItem
                    key={nodeInfo.type}
                    nodeType={nodeInfo.type}
                    label={nodeInfo.label}
                    description={nodeInfo.description}
                    isFavorite={favorites.has(nodeInfo.type)}
                    onDragStart={handleNodeDragStart}
                    onFavoriteToggle={toggleFavorite}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Individual Node Type Item
 */
interface NodeTypeItemProps {
  nodeType: NodeType;
  label: string;
  description?: string;
  isFavorite?: boolean;
  onDragStart?: (nodeType: NodeType, event: React.DragEvent) => void;
  onFavoriteToggle?: (nodeType: NodeType) => void;
  isReadOnly?: boolean;
}

const NodeTypeItem: React.FC<NodeTypeItemProps> = ({
  nodeType,
  label,
  description,
  isFavorite = false,
  onDragStart,
  onFavoriteToggle,
  isReadOnly = false,
}) => {
  const icon = getNodeIcon(nodeType);
  const color = getNodeColor(nodeType);

  const handleDragStart = (e: React.DragEvent) => {
    if (!isReadOnly) {
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('nodeType', nodeType);
      onDragStart?.(nodeType, e);
    }
  };

  return (
    <div
      className="node-type-item"
      draggable={!isReadOnly}
      onDragStart={handleDragStart}
      title={description || label}
      role="button"
      tabIndex={0}
      aria-label={`${label}${description ? `: ${description}` : ''}`}
    >
      {/* Icon */}
      <div className="item-icon" style={{ color }}>
        {icon}
      </div>

      {/* Label */}
      <div className="item-label">{label}</div>

      {/* Favorite button */}
      {!isReadOnly && (
        <button
          className={`favorite-button ${isFavorite ? 'favorited' : ''}`}
          onClick={e => {
            e.stopPropagation();
            onFavoriteToggle?.(nodeType);
          }}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={`Toggle ${label} favorite`}
        >
          ★
        </button>
      )}
    </div>
  );
};

export default NodePalette;
