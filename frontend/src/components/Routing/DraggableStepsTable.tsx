/**
 * Draggable Steps Table Component
 * Sprint 4 Enhancements
 *
 * Table with drag-and-drop reordering for routing steps
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Tag,
  Tooltip,
  Popconfirm,
  message,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { useComponentShortcuts } from '../../contexts/KeyboardShortcutContext';
import { announceToScreenReader } from '../../utils/ariaUtils';
import {
  RoutingStep,
  STEP_TYPE_LABELS,
  STEP_TYPE_COLORS,
  CONTROL_TYPE_LABELS,
  CONTROL_TYPE_COLORS,
} from '@/types/routing';
import { formatTime } from '@/api/routing';
import type { ColumnsType } from 'antd/es/table';

interface DraggableStepsTableProps {
  steps: RoutingStep[];
  loading: boolean;
  editable: boolean;
  onReorder: (reorderedSteps: RoutingStep[]) => Promise<void>;
  onEdit: (step: RoutingStep) => void;
  onDelete: (stepId: string) => Promise<void>;
}

/**
 * Draggable Steps Table
 *
 * Table component with drag-and-drop functionality for reordering steps
 */
export const DraggableStepsTable: React.FC<DraggableStepsTableProps> = ({
  steps,
  loading,
  editable,
  onReorder,
  onEdit,
  onDelete,
}) => {
  const [reordering, setReordering] = useState(false);
  const [focusedRowIndex, setFocusedRowIndex] = useState(-1);

  // Refs for focus management
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Focus management for table navigation
  const { focusElement } = useFocusManagement({
    containerRef,
    enableFocusTrap: false,
    restoreFocus: false,
  });

  // Keyboard navigation functions
  const navigateTable = useCallback((direction: 'up' | 'down') => {
    if (steps.length === 0) return;

    let newIndex;
    if (direction === 'down') {
      newIndex = focusedRowIndex < steps.length - 1 ? focusedRowIndex + 1 : 0;
    } else {
      newIndex = focusedRowIndex > 0 ? focusedRowIndex - 1 : steps.length - 1;
    }

    setFocusedRowIndex(newIndex);

    // Announce to screen readers
    const step = steps[newIndex];
    if (step) {
      announceToScreenReader(
        `Row ${newIndex + 1} of ${steps.length}: Step ${step.stepNumber}, ${step.operation?.operationName || 'No operation'}`,
        'POLITE'
      );
    }

    // Scroll row into view
    setTimeout(() => {
      const row = tableRef.current?.querySelector(`[data-row-key="${step?.id}"]`) as HTMLElement;
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }, [steps, focusedRowIndex]);

  const moveStepWithKeyboard = useCallback(async (direction: 'up' | 'down') => {
    if (focusedRowIndex < 0 || focusedRowIndex >= steps.length || !editable) {
      return;
    }

    const currentStep = steps[focusedRowIndex];
    const targetIndex = direction === 'up' ? focusedRowIndex - 1 : focusedRowIndex + 1;

    if (targetIndex < 0 || targetIndex >= steps.length) {
      announceToScreenReader('Cannot move step: already at boundary', 'POLITE');
      return;
    }

    // Create reordered array
    const reorderedSteps = [...steps];
    reorderedSteps.splice(focusedRowIndex, 1);
    reorderedSteps.splice(targetIndex, 0, currentStep);

    // Update step numbers based on new order
    const updatedSteps = reorderedSteps.map((step, index) => ({
      ...step,
      stepNumber: (index + 1) * 10,
    }));

    try {
      setReordering(true);
      await onReorder(updatedSteps);
      setFocusedRowIndex(targetIndex);
      announceToScreenReader(
        `Step ${currentStep.stepNumber} moved ${direction}. Now at position ${targetIndex + 1}`,
        'POLITE'
      );
    } catch (error: any) {
      message.error(error.message || 'Failed to reorder steps');
      announceToScreenReader(`Failed to move step: ${error.message}`, 'ASSERTIVE');
    } finally {
      setReordering(false);
    }
  }, [focusedRowIndex, steps, editable, onReorder]);

  const editCurrentStep = useCallback(() => {
    if (focusedRowIndex >= 0 && steps[focusedRowIndex]) {
      const step = steps[focusedRowIndex];
      onEdit(step);
      announceToScreenReader(`Editing step ${step.stepNumber}`, 'POLITE');
    }
  }, [focusedRowIndex, steps, onEdit]);

  const deleteCurrentStep = useCallback(async () => {
    if (focusedRowIndex >= 0 && steps[focusedRowIndex]) {
      const step = steps[focusedRowIndex];
      try {
        await onDelete(step.id);
        announceToScreenReader(`Step ${step.stepNumber} deleted`, 'POLITE');
        // Reset focus to first step or clear if no steps left
        setFocusedRowIndex(steps.length > 1 ? Math.min(focusedRowIndex, steps.length - 2) : -1);
      } catch (error: any) {
        message.error(error.message || 'Failed to delete step');
        announceToScreenReader(`Failed to delete step: ${error.message}`, 'ASSERTIVE');
      }
    }
  }, [focusedRowIndex, steps, onDelete]);

  // Keyboard handler for table navigation
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: true,
    enableArrowNavigation: true,
    enableEscape: false,
    onArrowNavigation: (direction, event) => {
      if (direction === 'up' || direction === 'down') {
        event.preventDefault();
        navigateTable(direction);
      }
    },
    onActivate: (event) => {
      // Enter key to edit current step
      if (event.key === 'Enter' && editable) {
        event.preventDefault();
        editCurrentStep();
      }
    },
  });

  // Register keyboard shortcuts
  useComponentShortcuts('draggable-steps-table', [
    {
      description: 'Move step up',
      keys: 'Alt+Up',
      handler: (event) => {
        if (editable) {
          event.preventDefault();
          moveStepWithKeyboard('up');
        }
      },
      category: 'routing',
      priority: 3,
    },
    {
      description: 'Move step down',
      keys: 'Alt+Down',
      handler: (event) => {
        if (editable) {
          event.preventDefault();
          moveStepWithKeyboard('down');
        }
      },
      category: 'routing',
      priority: 3,
    },
    {
      description: 'Edit focused step',
      keys: 'F2',
      handler: () => {
        if (editable) {
          editCurrentStep();
        }
      },
      category: 'routing',
      priority: 2,
    },
    {
      description: 'Delete focused step',
      keys: 'Delete',
      handler: () => {
        if (editable && focusedRowIndex >= 0) {
          // Show confirmation dialog
          const step = steps[focusedRowIndex];
          if (window.confirm(`Delete step ${step.stepNumber}? This action cannot be undone.`)) {
            deleteCurrentStep();
          }
        }
      },
      category: 'routing',
      priority: 2,
    },
  ]);

  // Reset focused row when steps change
  useEffect(() => {
    setFocusedRowIndex(-1);
  }, [steps]);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    if (result.source.index === result.destination.index) {
      return;
    }

    const reorderedSteps = Array.from(steps);
    const [removed] = reorderedSteps.splice(result.source.index, 1);
    reorderedSteps.splice(result.destination.index, 0, removed);

    // Update step numbers based on new order
    const updatedSteps = reorderedSteps.map((step, index) => ({
      ...step,
      stepNumber: (index + 1) * 10, // Maintain 10-step increments
    }));

    try {
      setReordering(true);
      await onReorder(updatedSteps);
      message.success('Steps reordered successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to reorder steps');
    } finally {
      setReordering(false);
    }
  };

  const columns: ColumnsType<RoutingStep> = [
    {
      title: '',
      key: 'drag',
      width: 40,
      align: 'center',
      render: (_, record) => (
        <HolderOutlined
          style={{ cursor: editable ? 'grab' : 'default', color: editable ? '#999' : '#ccc' }}
          aria-label={editable ? `Drag to reorder step ${record.stepNumber}` : 'Drag handle (disabled)'}
          role="button"
          aria-describedby={editable ? `drag-hint-${record.id}` : undefined}
        />
      ),
    },
    {
      title: 'Step #',
      dataIndex: 'stepNumber',
      key: 'stepNumber',
      width: 80,
      align: 'center',
      sorter: (a, b) => a.stepNumber - b.stepNumber,
    },
    {
      title: 'Type',
      key: 'stepType',
      width: 120,
      render: (_, record) => (
        <Tag color={STEP_TYPE_COLORS[record.stepType]}>
          {STEP_TYPE_LABELS[record.stepType]}
        </Tag>
      ),
    },
    {
      title: 'Operation', // ISA-95: Process Segment
      key: 'operation',
      width: '20%',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.operation?.operationName || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.operation?.operationType || ''}
          </div>
        </div>
      ),
    },
    {
      title: 'Work Center',
      key: 'workCenter',
      width: '15%',
      render: (_, record) => record.workCenter?.name || 'Not Assigned',
    },
    {
      title: 'Setup',
      key: 'setupTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.setupTimeOverride ?? record.operation?.setupTime ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Cycle',
      key: 'cycleTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.cycleTimeOverride ?? record.operation?.duration ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Teardown',
      key: 'teardownTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.teardownTimeOverride ?? record.operation?.teardownTime ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Flags',
      key: 'flags',
      width: 150,
      render: (_, record) => (
        <Space size="small" wrap>
          {record.isOptional && <Tag color="blue">Optional</Tag>}
          {record.isQualityInspection && <Tag color="green">QC</Tag>}
          {record.isCriticalPath && <Tag color="red">Critical</Tag>}
          {record.controlType && (
            <Tag color={CONTROL_TYPE_COLORS[record.controlType]}>
              {CONTROL_TYPE_LABELS[record.controlType]}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Notes',
      key: 'notes',
      width: 200,
      ellipsis: true,
      render: (_, record) => (
        <Tooltip title={record.notes}>
          {record.notes || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {editable && (
            <>
              <Tooltip title={`Edit step ${record.stepNumber}`}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  aria-label={`Edit step ${record.stepNumber}: ${record.operation?.operationName || 'No operation'}`}
                  aria-describedby={`step-${record.id}-description`}
                />
              </Tooltip>
              <Tooltip title={`Delete step ${record.stepNumber}`}>
                <Popconfirm
                  title={`Delete step ${record.stepNumber}?`}
                  description="This action cannot be undone."
                  onConfirm={() => onDelete(record.id)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Delete step ${record.stepNumber}: ${record.operation?.operationName || 'No operation'}`}
                    aria-describedby={`step-${record.id}-description`}
                  />
                </Popconfirm>
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  // Custom row renderer for draggable rows
  const DraggableRow = ({ index, record, children, ...restProps }: any) => {
    if (!editable) {
      // Non-draggable row
      return <tr {...restProps}>{children}</tr>;
    }

    return (
      <Draggable draggableId={record.id} index={index} key={record.id}>
        {(provided, snapshot) => (
          <tr
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            {...restProps}
            style={{
              ...provided.draggableProps.style,
              ...(snapshot.isDragging
                ? {
                    background: '#f0f5ff',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                  }
                : {}),
            }}
          >
            {children}
          </tr>
        )}
      </Draggable>
    );
  };

  return (
    <div
      ref={containerRef}
      {...keyboardProps}
      role="region"
      aria-label="Routing steps table with drag-drop and keyboard navigation"
      aria-describedby="steps-table-instructions"
    >
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="steps-table" direction="vertical">
          {(provided: any) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <Table
                ref={tableRef}
                columns={columns}
                dataSource={steps}
                rowKey="id"
                loading={loading || reordering}
                pagination={false}
                scroll={{ x: 1500 }}
                bordered
                components={{
                  body: {
                    row: DraggableRow,
                  },
                }}
                onRow={(record, index) => ({
                  index,
                  record,
                  'data-step-id': record.id,
                  'aria-selected': index === focusedRowIndex,
                  'aria-describedby': `step-${record.id}-description`,
                  tabIndex: index === focusedRowIndex ? 0 : -1,
                  onClick: () => {
                    setFocusedRowIndex(index || 0);
                  },
                } as any)}
                locale={{
                  emptyText: 'No steps defined. Click "Add Step" to create the first step.',
                }}
                aria-label={`Routing steps table: ${steps.length} steps`}
                aria-describedby="steps-table-instructions"
                rowClassName={(record, index) => {
                  const isFocused = index === focusedRowIndex;
                  return isFocused ? 'ant-table-row-focused' : '';
                }}
              />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Hidden ARIA hints for screen readers */}
      <div id="steps-table-instructions" style={{ display: 'none' }}>
        Navigate routing steps with arrow keys. Use Alt+Up/Alt+Down to reorder steps, Enter or F2 to edit, Delete key to remove.
        Drag and drop is also available for mouse users.
      </div>
      {steps.map((step) => (
        <div key={step.id} style={{ display: 'none' }}>
          <div id={`step-${step.id}-description`}>
            Step {step.stepNumber}: {step.operation?.operationName || 'No operation'},
            {step.workCenter?.name ? ` Work Center: ${step.workCenter.name}` : ' No work center assigned'},
            Setup: {formatTime(step.setupTimeOverride ?? step.operation?.setupTime ?? 0)},
            Cycle: {formatTime(step.cycleTimeOverride ?? step.operation?.duration ?? 0)}
            {step.notes ? `, Notes: ${step.notes}` : ''}
          </div>
          {editable && (
            <div id={`drag-hint-${step.id}`}>
              Use mouse to drag or keyboard shortcuts Alt+Up/Alt+Down to reorder this step.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DraggableStepsTable;
