/**
 * Draggable Steps Table Component
 * Sprint 4 Enhancements
 *
 * Table with drag-and-drop reordering for routing steps
 */

import React, { useState } from 'react';
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
import { RoutingStep } from '@/types/routing';
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
      render: () => (
        <HolderOutlined style={{ cursor: editable ? 'grab' : 'default', color: editable ? '#999' : '#ccc' }} />
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
      title: 'Process Segment',
      key: 'processSegment',
      width: '25%',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {record.processSegment?.segmentName || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.processSegment?.operationType || ''}
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
        const time = record.setupTimeOverride ?? record.processSegment?.setupTime ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Cycle',
      key: 'cycleTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.cycleTimeOverride ?? record.processSegment?.duration ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Teardown',
      key: 'teardownTime',
      width: 100,
      align: 'right',
      render: (_, record) => {
        const time = record.teardownTimeOverride ?? record.processSegment?.teardownTime ?? 0;
        return formatTime(time);
      },
    },
    {
      title: 'Flags',
      key: 'flags',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          {record.isOptional && <Tag color="blue">Optional</Tag>}
          {record.isQualityInspection && <Tag color="green">QC</Tag>}
          {record.isCriticalPath && <Tag color="red">Critical</Tag>}
        </Space>
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
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Popconfirm
                  title="Delete this step?"
                  description="This action cannot be undone."
                  onConfirm={() => onDelete(record.id)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
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
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="steps-table" direction="vertical">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <Table
              columns={columns}
              dataSource={steps}
              rowKey="id"
              loading={loading || reordering}
              pagination={false}
              scroll={{ x: 1200 }}
              bordered
              components={{
                body: {
                  row: DraggableRow,
                },
              }}
              onRow={(record, index) => ({
                index,
                record,
              })}
              locale={{
                emptyText: 'No steps defined. Click "Add Step" to create the first step.',
              }}
            />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default DraggableStepsTable;
