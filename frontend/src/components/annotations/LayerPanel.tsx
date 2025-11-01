/**
 * Layer Panel
 * Issue #66 Phase 4: Layer management and selection/editing
 *
 * Provides UI for managing annotation layers
 */

import React, { useState } from 'react';
import { AnnotationLayer } from './types';

interface LayerPanelProps {
  layers: AnnotationLayer[];
  selectedLayerId?: string;
  onSelectLayer: (layerId: string) => void;
  onCreateLayer: (name: string) => void;
  onDeleteLayer: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLocked: (layerId: string) => void;
  onRenameLayer: (layerId: string, newName: string) => void;
  onReorderLayers: (layerId: string, direction: 'up' | 'down') => void;
}

/**
 * Layer panel component
 */
export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onCreateLayer,
  onDeleteLayer,
  onToggleVisibility,
  onToggleLocked,
  onRenameLayer,
  onReorderLayers,
}) => {
  const [newLayerName, setNewLayerName] = useState('');
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateLayer = () => {
    if (newLayerName.trim()) {
      onCreateLayer(newLayerName);
      setNewLayerName('');
    }
  };

  const handleRename = (layerId: string) => {
    if (editingName.trim() && editingLayerId === layerId) {
      onRenameLayer(layerId, editingName);
      setEditingLayerId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
    setEditingName('');
  };

  const sortedLayers = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  return (
    <div
      className="layer-panel"
      style={{
        width: '250px',
        height: '100vh',
        backgroundColor: '#f8f8f8',
        borderRight: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#333',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Layers</h3>
      </div>

      {/* Create new layer */}
      <div style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <input
            type="text"
            value={newLayerName}
            onChange={(e) => setNewLayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateLayer();
            }}
            placeholder="Layer name..."
            style={{
              flex: 1,
              padding: '4px 6px',
              border: '1px solid #ccc',
              borderRadius: '3px',
              fontSize: '12px',
            }}
          />
          <button
            onClick={handleCreateLayer}
            style={{
              padding: '4px 8px',
              backgroundColor: '#4a90e2',
              color: '#fff',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* Layer list */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px' }}>
        {sortedLayers.length === 0 ? (
          <div
            style={{
              padding: '12px',
              textAlign: 'center',
              color: '#999',
              fontSize: '12px',
            }}
          >
            No layers yet
          </div>
        ) : (
          sortedLayers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              isSelected={selectedLayerId === layer.id}
              isEditing={editingLayerId === layer.id}
              editingName={editingName}
              onSelect={() => onSelectLayer(layer.id)}
              onToggleVisibility={() => onToggleVisibility(layer.id)}
              onToggleLocked={() => onToggleLocked(layer.id)}
              onDelete={() => onDeleteLayer(layer.id)}
              onEdit={() => {
                setEditingLayerId(layer.id);
                setEditingName(layer.name);
              }}
              onSaveEdit={() => handleRename(layer.id)}
              onCancelEdit={handleCancelEdit}
              onEditNameChange={(name) => setEditingName(name)}
              onMoveUp={() => onReorderLayers(layer.id, 'up')}
              onMoveDown={() => onReorderLayers(layer.id, 'down')}
              canMoveUp={layer.zIndex < Math.max(...layers.map((l) => l.zIndex))}
              canMoveDown={layer.zIndex > Math.min(...layers.map((l) => l.zIndex))}
            />
          ))
        )}
      </div>

      {/* Info */}
      <div
        style={{
          padding: '8px',
          borderTop: '1px solid #ddd',
          backgroundColor: '#fafafa',
          fontSize: '11px',
          color: '#999',
        }}
      >
        {selectedLayerId && (
          <div>Selected: {layers.find((l) => l.id === selectedLayerId)?.name}</div>
        )}
        <div>Total layers: {layers.length}</div>
      </div>
    </div>
  );
};

interface LayerItemProps {
  layer: AnnotationLayer;
  isSelected: boolean;
  isEditing: boolean;
  editingName: string;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLocked: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/**
 * Individual layer item component
 */
const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  isEditing,
  editingName,
  onSelect,
  onToggleVisibility,
  onToggleLocked,
  onDelete,
  onEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}) => {
  const isDefault = layer.id === 'default';

  return (
    <div
      style={{
        padding: '6px',
        marginBottom: '4px',
        backgroundColor: isSelected ? '#e8f0ff' : '#fff',
        border: `1px solid ${isSelected ? '#4a90e2' : '#e0e0e0'}`,
        borderRadius: '4px',
        cursor: 'pointer',
      }}
      onClick={onSelect}
    >
      {/* Layer name and controls */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {/* Visibility toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          style={{
            width: '20px',
            height: '20px',
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={layer.visible ? 'Hide layer' : 'Show layer'}
        >
          {layer.visible ? '👁️' : '👁️‍🗨️'}
        </button>

        {/* Lock toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleLocked();
          }}
          style={{
            width: '20px',
            height: '20px',
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={layer.locked ? 'Unlock layer' : 'Lock layer'}
        >
          {layer.locked ? '🔒' : '🔓'}
        </button>

        {/* Layer name */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditing ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') onSaveEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '2px 4px',
                border: '1px solid #4a90e2',
                borderRadius: '2px',
                fontSize: '12px',
              }}
            />
          ) : (
            <div
              onDoubleClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              style={{
                padding: '2px 4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 400,
              }}
              title={layer.name}
            >
              {layer.name}
              {isDefault && <span style={{ fontSize: '11px', color: '#999' }}> (default)</span>}
            </div>
          )}
        </div>

        {/* Z-index indicator */}
        <div
          style={{
            fontSize: '11px',
            color: '#999',
            minWidth: '20px',
            textAlign: 'right',
          }}
        >
          z:{layer.zIndex}
        </div>
      </div>

      {/* Edit controls */}
      {isEditing && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSaveEdit();
            }}
            style={{
              flex: 1,
              padding: '3px',
              backgroundColor: '#4a90e2',
              color: '#fff',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Save
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCancelEdit();
            }}
            style={{
              flex: 1,
              padding: '3px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ccc',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Layer actions */}
      {!isEditing && (
        <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            disabled={!canMoveUp}
            style={{
              flex: 1,
              padding: '3px',
              backgroundColor: canMoveUp ? '#f0f0f0' : '#f8f8f8',
              border: '1px solid #ddd',
              borderRadius: '2px',
              cursor: canMoveUp ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              color: canMoveUp ? '#333' : '#ccc',
            }}
            title="Move up"
          >
            ↑
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            disabled={!canMoveDown}
            style={{
              flex: 1,
              padding: '3px',
              backgroundColor: canMoveDown ? '#f0f0f0' : '#f8f8f8',
              border: '1px solid #ddd',
              borderRadius: '2px',
              cursor: canMoveDown ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              color: canMoveDown ? '#333' : '#ccc',
            }}
            title="Move down"
          >
            ↓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            style={{
              flex: 1,
              padding: '3px',
              backgroundColor: '#f0f0f0',
              border: '1px solid #ddd',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '11px',
            }}
            title="Rename"
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isDefault && window.confirm(`Delete layer "${layer.name}"?`)) {
                onDelete();
              }
            }}
            disabled={isDefault}
            style={{
              flex: 1,
              padding: '3px',
              backgroundColor: isDefault ? '#f8f8f8' : '#ffe8e8',
              border: '1px solid #ddd',
              borderRadius: '2px',
              cursor: isDefault ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              color: isDefault ? '#ccc' : '#d32f2f',
            }}
            title={isDefault ? 'Cannot delete default layer' : 'Delete layer'}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default LayerPanel;
