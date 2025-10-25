import React, { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedGroup, setDraggedGroup] = useState<ParameterGroup | null>(null);

  // Configure drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

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

  const findGroupById = (groups: ParameterGroup[], id: string): ParameterGroup | null => {
    for (const group of groups) {
      if (group.id === id) return group;
      if (group.childGroups) {
        const found = findGroupById(group.childGroups, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    const group = findGroupById(tree, active.id as string);
    setDraggedGroup(group);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setDraggedGroup(null);

    if (!over || active.id === over.id) {
      return;
    }

    const draggedGroupId = active.id as string;
    const targetGroupId = over.id as string;

    // Prevent dropping a group onto itself or its descendants
    const draggedGroup = findGroupById(tree, draggedGroupId);
    const targetGroup = findGroupById(tree, targetGroupId);

    if (!draggedGroup || !targetGroup) return;

    // Check if target is a descendant of dragged group
    const isDescendant = (parent: ParameterGroup, childId: string): boolean => {
      if (parent.id === childId) return true;
      if (!parent.childGroups) return false;
      return parent.childGroups.some(child => isDescendant(child, childId));
    };

    if (isDescendant(draggedGroup, targetGroupId)) {
      setError('Cannot move a group into its own descendant');
      return;
    }

    // Move the group to be a child of the target group
    await handleMoveGroup(draggedGroupId, targetGroupId);
  };

  // Sortable tree node component
  const SortableTreeNode: React.FC<{
    group: ParameterGroup;
    level: number;
    isExpanded: boolean;
    isSelected: boolean;
    hasChildren: boolean;
    paramCount: number;
  }> = ({ group, level, isExpanded, isSelected, hasChildren, paramCount }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
      isOver,
    } = useSortable({ id: group.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      marginLeft: `${level * 20}px`,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            marginBottom: '4px',
            backgroundColor: isOver
              ? '#FFF9C4'
              : isSelected
              ? '#E3F2FD'
              : 'transparent',
            borderRadius: '4px',
            border: isOver
              ? '2px dashed #FBC02D'
              : isSelected
              ? '2px solid #2196F3'
              : '1px solid #E0E0E0',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isSelected && !isDragging) {
              e.currentTarget.style.backgroundColor = '#F5F5F5';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSelected && !isDragging && !isOver) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {/* Drag handle */}
          <span
            {...listeners}
            style={{
              marginRight: '8px',
              fontSize: '14px',
              cursor: isDragging ? 'grabbing' : 'grab',
              opacity: 0.6,
            }}
            title="Drag to move"
          >
            ⋮⋮
          </span>
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

  const getAllGroupIds = (groups: ParameterGroup[]): string[] => {
    const ids: string[] = [];
    for (const group of groups) {
      ids.push(group.id);
      if (group.childGroups) {
        ids.push(...getAllGroupIds(group.childGroups));
      }
    }
    return ids;
  };

  const renderTreeNode = (group: ParameterGroup, level: number = 0): JSX.Element => {
    const isExpanded = expandedGroups.has(group.id);
    const isSelected = selectedGroupId === group.id;
    const hasChildren = group.childGroups && group.childGroups.length > 0;
    const paramCount = parameterCounts[group.id] || 0;

    return (
      <SortableTreeNode
        key={group.id}
        group={group}
        level={level}
        isExpanded={isExpanded}
        isSelected={isSelected}
        hasChildren={hasChildren}
        paramCount={paramCount}
      />
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={getAllGroupIds(tree)} strategy={verticalListSortingStrategy}>
          <div>{tree.map((group) => renderTreeNode(group))}</div>
        </SortableContext>

        <DragOverlay>
          {draggedGroup && (
            <div
              style={{
                padding: '8px 12px',
                backgroundColor: '#E3F2FD',
                borderRadius: '4px',
                border: '2px solid #2196F3',
                opacity: 0.9,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              <span style={{ fontSize: '18px', marginRight: '8px' }}>
                {GROUP_TYPE_ICONS[draggedGroup.groupType]}
              </span>
              <span style={{ fontWeight: 600 }}>{draggedGroup.groupName}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
