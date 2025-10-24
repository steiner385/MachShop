import React, { useState, useEffect } from 'react';
import {
  ParameterGroup,
  getParameterGroupTree,
  createParameterGroup,
  updateParameterGroup,
  deleteParameterGroup,
  moveParameterGroup,
  getGroupParameters,
} from '../../api/parameters';

interface ParameterGroupsTreeProps {
  onSelectGroup?: (group: ParameterGroup) => void;
  onEditGroup?: (group: ParameterGroup) => void;
  selectedGroupId?: string | null;
}

interface GroupFormData {
  groupName: string;
  groupType: ParameterGroup['groupType'];
  parentGroupId: string | null;
  description: string;
  tags: string;
  displayOrder: number;
  icon: string;
  color: string;
}

const GROUP_TYPE_ICONS: Record<ParameterGroup['groupType'], string> = {
  PROCESS: '⚙️',
  QUALITY: '✅',
  MATERIAL: '📦',
  EQUIPMENT: '🏭',
  ENVIRONMENTAL: '🌡️',
  CUSTOM: '📋',
};

const GROUP_TYPE_COLORS: Record<ParameterGroup['groupType'], string> = {
  PROCESS: '#2196F3',
  QUALITY: '#4CAF50',
  MATERIAL: '#FF9800',
  EQUIPMENT: '#9C27B0',
  ENVIRONMENTAL: '#00BCD4',
  CUSTOM: '#607D8B',
};

export const ParameterGroupsTree: React.FC<ParameterGroupsTreeProps> = ({
  onSelectGroup,
  onEditGroup,
  selectedGroupId,
}) => {
  const [tree, setTree] = useState<ParameterGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [parentForNewGroup, setParentForNewGroup] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<ParameterGroup | null>(null);
  const [parameterCounts, setParameterCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadTree();
  }, []);

  const loadTree = async () => {
    setLoading(true);
    setError(null);

    try {
      const treeData = await getParameterGroupTree();
      setTree(treeData);

      // Load parameter counts for all groups
      const counts: Record<string, number> = {};
      await Promise.all(
        flattenTree(treeData).map(async (group) => {
          try {
            const params = await getGroupParameters(group.id);
            counts[group.id] = params.length;
          } catch (err) {
            counts[group.id] = 0;
          }
        })
      );
      setParameterCounts(counts);
    } catch (err: any) {
      setError(err.message || 'Failed to load parameter groups');
    } finally {
      setLoading(false);
    }
  };

  const flattenTree = (groups: ParameterGroup[]): ParameterGroup[] => {
    const result: ParameterGroup[] = [];
    for (const group of groups) {
      result.push(group);
      if (group.childGroups) {
        result.push(...flattenTree(group.childGroups));
      }
    }
    return result;
  };

  const toggleExpand = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateGroup = (parentId: string | null = null) => {
    setParentForNewGroup(parentId);
    setEditingGroup(null);
    setShowCreateModal(true);
  };

  const handleEditGroup = (group: ParameterGroup) => {
    setEditingGroup(group);
    setShowCreateModal(true);
  };

  const handleDeleteGroup = async (group: ParameterGroup) => {
    const hasChildren = group.childGroups && group.childGroups.length > 0;
    const confirmMessage = hasChildren
      ? `Delete "${group.groupName}" and all its child groups?`
      : `Delete "${group.groupName}"?`;

    if (!confirm(confirmMessage)) return;

    try {
      await deleteParameterGroup(group.id, hasChildren);
      await loadTree();
    } catch (err: any) {
      setError(err.message || 'Failed to delete group');
    }
  };

  const handleMoveGroup = async (groupId: string, newParentId: string | null) => {
    try {
      await moveParameterGroup(groupId, newParentId);
      await loadTree();
    } catch (err: any) {
      setError(err.message || 'Failed to move group');
    }
  };

  const renderTreeNode = (group: ParameterGroup, level: number = 0) => {
    const isExpanded = expandedGroups.has(group.id);
    const isSelected = selectedGroupId === group.id;
    const hasChildren = group.childGroups && group.childGroups.length > 0;
    const paramCount = parameterCounts[group.id] || 0;

    return (
      <div key={group.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            marginBottom: '4px',
            backgroundColor: isSelected ? '#E3F2FD' : 'transparent',
            borderRadius: '4px',
            border: isSelected ? '2px solid #2196F3' : '1px solid #E0E0E0',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {hasChildren && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(group.id);
              }}
              style={{
                marginRight: '8px',
                fontSize: '12px',
                cursor: 'pointer',
                width: '16px',
                textAlign: 'center',
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          )}

          {!hasChildren && <span style={{ width: '24px' }}></span>}

          <span
            style={{
              marginRight: '8px',
              fontSize: '18px',
            }}
          >
            {GROUP_TYPE_ICONS[group.groupType]}
          </span>

          <div
            style={{ flex: 1 }}
            onClick={() => onSelectGroup?.(group)}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: '14px',
                color: GROUP_TYPE_COLORS[group.groupType],
              }}
            >
              {group.groupName}
            </div>
            {group.description && (
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {group.description}
              </div>
            )}
            <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
              {paramCount} parameter{paramCount !== 1 ? 's' : ''}
              {hasChildren && ` • ${group.childGroups!.length} subgroup${group.childGroups!.length !== 1 ? 's' : ''}`}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCreateGroup(group.id);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#E3F2FD',
                color: '#1976D2',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              title="Add child group"
            >
              ➕
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEditGroup(group);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#FFF3E0',
                color: '#F57C00',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              title="Edit group"
            >
              ✏️
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteGroup(group);
              }}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                backgroundColor: '#FFEBEE',
                color: '#D32F2F',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              title="Delete group"
            >
              🗑️
            </button>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div style={{ marginTop: '4px' }}>
            {group.childGroups!.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div>Loading parameter groups...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}
      >
        <h2>Parameter Groups</h2>
        <button
          onClick={() => handleCreateGroup(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          + Create Root Group
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#FFEBEE',
            color: '#C62828',
            borderRadius: '4px',
            border: '1px solid #EF5350',
          }}
        >
          {error}
        </div>
      )}

      <div>{tree.map((group) => renderTreeNode(group))}</div>

      {showCreateModal && (
        <GroupFormModal
          group={editingGroup}
          parentGroupId={parentForNewGroup}
          onSave={async () => {
            setShowCreateModal(false);
            await loadTree();
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

// Group Form Modal Component
const GroupFormModal: React.FC<{
  group: ParameterGroup | null;
  parentGroupId: string | null;
  onSave: () => void;
  onCancel: () => void;
}> = ({ group, parentGroupId, onSave, onCancel }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    groupName: group?.groupName || '',
    groupType: group?.groupType || 'PROCESS',
    parentGroupId: group?.parentGroupId || parentGroupId,
    description: group?.description || '',
    tags: group?.tags?.join(', ') || '',
    displayOrder: group?.displayOrder || 0,
    icon: group?.icon || '',
    color: group?.color || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        tags: formData.tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t.length > 0),
      };

      if (group) {
        await updateParameterGroup(group.id, payload);
      } else {
        await createParameterGroup(payload as any);
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: '20px' }}>
          {group ? 'Edit Group' : 'Create New Group'}
        </h3>

        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              backgroundColor: '#FFEBEE',
              color: '#C62828',
              borderRadius: '4px',
              border: '1px solid #EF5350',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Group Name *
            </label>
            <input
              type="text"
              required
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Group Type *
            </label>
            <select
              required
              value={formData.groupType}
              onChange={(e) =>
                setFormData({ ...formData, groupType: e.target.value as any })
              }
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            >
              <option value="PROCESS">Process</option>
              <option value="QUALITY">Quality</option>
              <option value="MATERIAL">Material</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="ENVIRONMENTAL">Environmental</option>
              <option value="CUSTOM">Custom</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600 }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., temperature, critical, monitored"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #CCC',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 20px',
                backgroundColor: '#F5F5F5',
                color: '#333',
                border: '1px solid #CCC',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 20px',
                backgroundColor: saving ? '#CCC' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {saving ? 'Saving...' : group ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
