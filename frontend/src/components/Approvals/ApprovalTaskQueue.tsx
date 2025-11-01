/**
 * ✅ GITHUB ISSUE #21: Advanced Multi-Stage Approval Workflow Engine
 * Approval Task Queue Component
 *
 * Displays a queue of pending approval tasks for the current user
 * with filtering, sorting, and bulk action capabilities.
 *
 * Features:
 * - Real-time task list with auto-refresh
 * - Advanced filtering by priority, entity type, due date
 * - Sorting by due date, priority, creation date
 * - Bulk approve/reject actions
 * - Task delegation functionality
 * - Progress indicators and overdue alerts
 * - Quick action buttons for common operations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Table,
  Card,
  Tag,
  Button,
  Space,
  Avatar,
  Tooltip,
  Badge,
  Select,
  DatePicker,
  Checkbox,
  message,
  Modal,
  Dropdown,
  Input,
  Alert,
  Spin,
  Empty,
  Progress,
  MenuProps
} from 'antd';
import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { useComponentShortcuts } from '../../contexts/KeyboardShortcutContext';
import { announceToScreenReader } from '../../utils/ariaUtils';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  FilterOutlined,
  SendOutlined,
  UserSwitchOutlined,
  BellOutlined,
  CalendarOutlined,
  MoreOutlined
} from '@ant-design/icons';
import type { ColumnsType, TableRowSelection } from 'antd/es/table';
import { ColumnType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import { RejectModal } from './RejectModal';

dayjs.extend(relativeTime);
dayjs.extend(isToday);

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

/**
 * Approval Task Interface
 */
export interface ApprovalTask {
  id: string;
  assignmentId: string;
  workflowInstanceId: string;
  stageNumber: number;
  stageName: string;
  entityType: string;
  entityId: string;
  taskTitle: string;
  taskDescription?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  createdAt: string;
  dueDate?: string;
  assignedToId: string;
  assignedToName?: string;
  assignedToRole?: string;
  workflowInstance?: {
    id: string;
    entityType: string;
    entityId: string;
    status: string;
    priority: string;
    currentStageNumber?: number;
    deadline?: string;
    progressPercentage: number;
  };
  contextData?: {
    workInstructionTitle?: string;
    workInstructionVersion?: string;
    partId?: string;
    operationId?: string;
    createdBy?: any;
  };
  escalationLevel: number;
  reminderCount: number;
  lastReminderSent?: string;
  isDelegated: boolean;
  delegatedFromId?: string;
  delegationReason?: string;
}

/**
 * Filter Configuration
 */
interface TaskFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  entityType?: string[];
  dueDateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  overdue?: boolean;
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Approval Task Queue Props
 */
interface ApprovalTaskQueueProps {
  /** Auto-refresh interval in seconds (default: 30) */
  refreshInterval?: number;
  /** Maximum number of tasks to display per page */
  pageSize?: number;
  /** Show compact view for embedded usage */
  compact?: boolean;
  /** Additional actions to display */
  extraActions?: React.ReactNode;
}

/**
 * Approval Task Queue Component
 */
export const ApprovalTaskQueue: React.FC<ApprovalTaskQueueProps> = ({
  refreshInterval = 30,
  pageSize = 20,
  compact = false,
  extraActions
}) => {
  // State management
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [filters, setFilters] = useState<TaskFilters>({
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState<ApprovalTask | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
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
    if (tasks.length === 0) return;

    let newIndex;
    if (direction === 'down') {
      newIndex = focusedRowIndex < tasks.length - 1 ? focusedRowIndex + 1 : 0;
    } else {
      newIndex = focusedRowIndex > 0 ? focusedRowIndex - 1 : tasks.length - 1;
    }

    setFocusedRowIndex(newIndex);

    // Announce to screen readers
    const task = tasks[newIndex];
    if (task) {
      announceToScreenReader(
        `Row ${newIndex + 1} of ${tasks.length}: ${task.taskTitle}, Priority: ${task.priority}, Status: ${task.status}`,
        'POLITE'
      );
    }

    // Scroll row into view
    setTimeout(() => {
      const row = tableRef.current?.querySelector(`[data-row-key="${task?.id}"]`) as HTMLElement;
      if (row) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }, [tasks, focusedRowIndex]);

  const toggleRowSelection = useCallback(() => {
    if (focusedRowIndex >= 0 && tasks[focusedRowIndex]) {
      const task = tasks[focusedRowIndex];
      const isSelected = selectedTasks.includes(task.id);

      if (isSelected) {
        setSelectedTasks(prev => prev.filter(id => id !== task.id));
        announceToScreenReader(`${task.taskTitle} deselected`, 'POLITE');
      } else {
        setSelectedTasks(prev => [...prev, task.id]);
        announceToScreenReader(`${task.taskTitle} selected`, 'POLITE');
      }
    }
  }, [focusedRowIndex, tasks, selectedTasks]);

  const activateCurrentRow = useCallback(() => {
    if (focusedRowIndex >= 0 && tasks[focusedRowIndex]) {
      const task = tasks[focusedRowIndex];
      handleApprove(task);
    }
  }, [focusedRowIndex, tasks, handleApprove]);

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
      // Enter key to approve current task
      if (event.key === 'Enter') {
        event.preventDefault();
        activateCurrentRow();
      }
      // Space key to toggle selection
      if (event.key === ' ') {
        event.preventDefault();
        toggleRowSelection();
      }
    },
  });

  // Register keyboard shortcuts
  useComponentShortcuts('approval-task-queue', [
    {
      description: 'Bulk approve selected tasks',
      keys: 'Ctrl+Enter',
      handler: () => {
        if (selectedTasks.length > 0) {
          handleBulkAction('approve');
        }
      },
      category: 'approval',
      priority: 3,
    },
    {
      description: 'Bulk reject selected tasks',
      keys: 'Ctrl+Shift+Enter',
      handler: () => {
        if (selectedTasks.length > 0) {
          handleBulkAction('reject');
        }
      },
      category: 'approval',
      priority: 3,
    },
    {
      description: 'Select all tasks',
      keys: 'Ctrl+A',
      handler: (event) => {
        event.preventDefault();
        const pendingTasks = tasks.filter(task => task.status === 'PENDING').map(task => task.id);
        setSelectedTasks(pendingTasks);
        announceToScreenReader(`${pendingTasks.length} tasks selected`, 'POLITE');
      },
      category: 'approval',
      priority: 2,
    },
    {
      description: 'Clear selection',
      keys: 'Escape',
      handler: () => {
        setSelectedTasks([]);
        setFocusedRowIndex(-1);
        announceToScreenReader('Selection cleared', 'POLITE');
      },
      category: 'approval',
      priority: 2,
    },
    {
      description: 'Refresh task list',
      keys: 'F5',
      handler: (event) => {
        event.preventDefault();
        loadTasks();
        announceToScreenReader('Task list refreshed', 'POLITE');
      },
      category: 'approval',
      priority: 2,
    },
  ]);

  // Reset focused row when tasks change
  useEffect(() => {
    setFocusedRowIndex(-1);
  }, [tasks]);

  /**
   * Priority color mapping
   */
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'CRITICAL': return 'red';
      case 'HIGH': return 'orange';
      case 'MEDIUM': return 'blue';
      case 'LOW': return 'green';
      default: return 'default';
    }
  };

  /**
   * Entity type color mapping
   */
  const getEntityTypeColor = (entityType: string): string => {
    switch (entityType) {
      case 'WORK_INSTRUCTION': return 'blue';
      case 'FAI_REPORT': return 'green';
      case 'NCR': return 'red';
      case 'WORK_ORDER': return 'purple';
      default: return 'default';
    }
  };

  /**
   * Load approval tasks
   */
  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);

      // Build query parameters from filters
      const queryParams = new URLSearchParams();

      if (filters.search) queryParams.append('search', filters.search);
      if (filters.status?.length) queryParams.append('status', filters.status.join(','));
      if (filters.priority?.length) queryParams.append('priority', filters.priority.join(','));
      if (filters.entityType?.length) queryParams.append('entityType', filters.entityType.join(','));
      if (filters.dueDateRange) {
        queryParams.append('dueDateAfter', filters.dueDateRange[0].toISOString());
        queryParams.append('dueDateBefore', filters.dueDateRange[1].toISOString());
      }
      if (filters.overdue) queryParams.append('overdue', 'true');
      if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
      if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

      queryParams.append('limit', pageSize.toString());

      const response = await fetch(`/api/v1/workflows/tasks?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load approval tasks');
      }

      const data = await response.json();
      setTasks(data.data || []);
    } catch (error: any) {
      message.error(error.message || 'Failed to load approval tasks');
    } finally {
      setLoading(false);
    }
  }, [filters, pageSize]);

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    loadTasks();

    const interval = setInterval(loadTasks, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [loadTasks, refreshInterval]);

  /**
   * Handle single task approval
   */
  const handleApprove = useCallback(async (task: ApprovalTask) => {
    try {
      const response = await fetch(`/api/v1/workflows/tasks/${task.assignmentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments: 'Approved from task queue'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to approve task');
      }

      message.success(`Task "${task.taskTitle}" approved successfully`);
      announceToScreenReader(`Task ${task.taskTitle} approved successfully`, 'POLITE');
      loadTasks();
    } catch (error: any) {
      message.error(error.message || 'Failed to approve task');
      announceToScreenReader(`Failed to approve task: ${error.message}`, 'ASSERTIVE');
    }
  }, [loadTasks]);

  /**
   * Handle single task rejection
   */
  const handleReject = async (reason: string, comments: string) => {
    if (!currentTask) return;

    try {
      const response = await fetch(`/api/v1/workflows/tasks/${currentTask.assignmentId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comments
        })
      });

      if (!response.ok) {
        throw new Error('Failed to reject task');
      }

      message.success(`Task "${currentTask.taskTitle}" rejected successfully`);
      loadTasks();
    } catch (error: any) {
      message.error(error.message || 'Failed to reject task');
      throw error;
    }
  };

  /**
   * Handle bulk actions
   */
  const handleBulkAction = async (action: 'approve' | 'reject') => {
    if (selectedTasks.length === 0) {
      message.warning('Please select tasks to perform bulk action');
      return;
    }

    if (action === 'reject') {
      // For bulk reject, we need to collect comments
      Modal.confirm({
        title: `Reject ${selectedTasks.length} tasks`,
        content: 'Please provide a reason for rejecting these tasks:',
        onOk: async () => {
          // TODO: Implement bulk reject with comments collection
          message.info('Bulk reject functionality coming soon');
        }
      });
      return;
    }

    try {
      setBulkActionLoading(true);

      const response = await fetch('/api/v1/workflows/tasks/bulk-action', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignmentIds: selectedTasks,
          action: action.toUpperCase(),
          comments: `Bulk ${action} from task queue`
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} tasks`);
      }

      const results = await response.json();
      const successCount = results.filter((r: any) => r.success).length;

      message.success(`Successfully ${action}d ${successCount} of ${selectedTasks.length} tasks`);
      setSelectedTasks([]);
      loadTasks();
    } catch (error: any) {
      message.error(error.message || `Failed to ${action} tasks`);
    } finally {
      setBulkActionLoading(false);
    }
  };

  /**
   * Handle task delegation
   */
  const handleDelegate = (task: ApprovalTask) => {
    // TODO: Implement delegation modal
    message.info('Task delegation functionality coming soon');
  };

  /**
   * Check if task is overdue
   */
  const isOverdue = (task: ApprovalTask): boolean => {
    return task.dueDate ? dayjs().isAfter(dayjs(task.dueDate)) : false;
  };

  /**
   * Get due date status
   */
  const getDueDateStatus = (task: ApprovalTask) => {
    if (!task.dueDate) return null;

    const dueDate = dayjs(task.dueDate);
    const now = dayjs();

    if (now.isAfter(dueDate)) {
      return { status: 'overdue', color: 'red', text: 'Overdue' };
    } else if (dueDate.diff(now, 'hours') <= 24) {
      return { status: 'due-soon', color: 'orange', text: 'Due soon' };
    } else if (dueDate.isToday()) {
      return { status: 'due-today', color: 'blue', text: 'Due today' };
    }

    return { status: 'normal', color: 'default', text: dueDate.fromNow() };
  };

  /**
   * Table columns configuration
   */
  const columns: ColumnsType<ApprovalTask> = [
    {
      title: 'Task',
      key: 'task',
      width: compact ? 200 : 300,
      render: (_, task) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            <Tooltip title={task.taskDescription}>
              {task.taskTitle}
            </Tooltip>
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            Stage {task.stageNumber}: {task.stageName}
          </div>
          {task.contextData?.workInstructionTitle && (
            <div style={{ fontSize: 11, color: '#999' }}>
              WI: {task.contextData.workInstructionTitle}
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Type',
      dataIndex: 'entityType',
      width: 100,
      render: (entityType: string) => (
        <Tag color={getEntityTypeColor(entityType)}>
          {entityType.replace('_', ' ')}
        </Tag>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      width: 90,
      sorter: true,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
      )
    },
    {
      title: 'Progress',
      key: 'progress',
      width: 120,
      render: (_, task) => (
        <div>
          <Progress
            percent={task.workflowInstance?.progressPercentage || 0}
            size="small"
            showInfo={false}
            strokeColor={isOverdue(task) ? '#ff4d4f' : '#1890ff'}
          />
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            {task.workflowInstance?.progressPercentage || 0}% complete
          </div>
        </div>
      )
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      width: 120,
      sorter: true,
      render: (dueDate: string, task) => {
        if (!dueDate) return <span style={{ color: '#999' }}>-</span>;

        const dueDateStatus = getDueDateStatus(task);
        return (
          <div>
            <Tag color={dueDateStatus?.color} icon={<ClockCircleOutlined />}>
              {dueDateStatus?.text}
            </Tag>
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
              {dayjs(dueDate).format('MMM D, YYYY')}
            </div>
          </div>
        );
      }
    },
    {
      title: 'Assigned',
      key: 'assigned',
      width: 100,
      render: (_, task) => (
        <div>
          <Avatar size="small" style={{ marginRight: 4 }}>
            {task.assignedToName?.charAt(0) || 'U'}
          </Avatar>
          <span style={{ fontSize: 12 }}>
            {task.assignedToName || 'Unknown'}
          </span>
          {task.isDelegated && (
            <Tooltip title={`Delegated: ${task.delegationReason}`}>
              <UserSwitchOutlined style={{ marginLeft: 4, color: '#1890ff' }} />
            </Tooltip>
          )}
        </div>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: compact ? 150 : 200,
      render: (_, task) => {
        const actionItems: MenuProps['items'] = [
          {
            key: 'approve',
            icon: <CheckCircleOutlined />,
            label: 'Approve',
            onClick: () => handleApprove(task)
          },
          {
            key: 'reject',
            icon: <CloseCircleOutlined />,
            label: 'Reject',
            onClick: () => {
              setCurrentTask(task);
              setRejectModalVisible(true);
            }
          },
          {
            key: 'delegate',
            icon: <SendOutlined />,
            label: 'Delegate',
            onClick: () => handleDelegate(task)
          }
        ];

        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApprove(task)}
              aria-label={`Approve task: ${task.taskTitle}`}
              aria-describedby={`task-${task.id}-description`}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseCircleOutlined />}
              onClick={() => {
                setCurrentTask(task);
                setRejectModalVisible(true);
              }}
              aria-label={`Reject task: ${task.taskTitle}`}
              aria-describedby={`task-${task.id}-description`}
            >
              Reject
            </Button>
            <Dropdown menu={{ items: actionItems }} trigger={['click']}>
              <Button
                size="small"
                icon={<MoreOutlined />}
                aria-label={`More actions for task: ${task.taskTitle}`}
                aria-describedby={`task-${task.id}-description`}
              />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  /**
   * Row selection configuration
   */
  const rowSelection: TableRowSelection<ApprovalTask> = {
    selectedRowKeys: selectedTasks,
    onChange: (selectedRowKeys) => {
      setSelectedTasks(selectedRowKeys as string[]);
    },
    getCheckboxProps: (task) => ({
      disabled: task.status !== 'PENDING'
    })
  };

  /**
   * Filter panel
   */
  const filterPanel = (
    <Space wrap style={{ marginBottom: 16 }}>
      <Search
        placeholder="Search tasks..."
        style={{ width: 200 }}
        value={filters.search}
        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
        onSearch={loadTasks}
        aria-label="Search approval tasks"
        aria-describedby="search-hint"
      />

      <Select
        placeholder="Status"
        style={{ width: 120 }}
        mode="multiple"
        value={filters.status}
        onChange={(status) => setFilters(prev => ({ ...prev, status }))}
        aria-label="Filter by task status"
        aria-describedby="status-filter-hint"
      >
        <Option value="PENDING">Pending</Option>
        <Option value="IN_PROGRESS">In Progress</Option>
        <Option value="OVERDUE">Overdue</Option>
      </Select>

      <Select
        placeholder="Priority"
        style={{ width: 120 }}
        mode="multiple"
        value={filters.priority}
        onChange={(priority) => setFilters(prev => ({ ...prev, priority }))}
        aria-label="Filter by task priority"
        aria-describedby="priority-filter-hint"
      >
        <Option value="CRITICAL">Critical</Option>
        <Option value="HIGH">High</Option>
        <Option value="MEDIUM">Medium</Option>
        <Option value="LOW">Low</Option>
      </Select>

      <Select
        placeholder="Entity Type"
        style={{ width: 150 }}
        mode="multiple"
        value={filters.entityType}
        onChange={(entityType) => setFilters(prev => ({ ...prev, entityType }))}
        aria-label="Filter by entity type"
        aria-describedby="entity-type-filter-hint"
      >
        <Option value="WORK_INSTRUCTION">Work Instruction</Option>
        <Option value="FAI_REPORT">FAI Report</Option>
        <Option value="NCR">NCR</Option>
        <Option value="WORK_ORDER">Work Order</Option>
      </Select>

      <RangePicker
        style={{ width: 250 }}
        value={filters.dueDateRange}
        onChange={(dates) => setFilters(prev => ({
          ...prev,
          dueDateRange: dates ? [dates[0]!, dates[1]!] : undefined
        }))}
        placeholder={['Due date from', 'Due date to']}
        aria-label="Filter by due date range"
        aria-describedby="date-range-filter-hint"
      />

      <Button
        icon={<ReloadOutlined />}
        onClick={loadTasks}
        loading={loading}
        aria-label="Refresh approval task list"
        aria-describedby="refresh-hint"
      >
        Refresh
      </Button>
    </Space>
  );

  /**
   * Summary stats
   */
  const overdueCount = tasks.filter(task => isOverdue(task)).length;
  const dueTodayCount = tasks.filter(task =>
    task.dueDate && dayjs(task.dueDate).isToday()
  ).length;

  return (
    <div
      ref={containerRef}
      {...keyboardProps}
      role="region"
      aria-label="Approval task queue with keyboard navigation"
      aria-describedby="approval-queue-instructions"
    >
      {/* Summary Alert */}
      {(overdueCount > 0 || dueTodayCount > 0) && (
        <Alert
          message="Attention Required"
          description={
            <Space>
              {overdueCount > 0 && (
                <span>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  {overdueCount} overdue task{overdueCount > 1 ? 's' : ''}
                </span>
              )}
              {dueTodayCount > 0 && (
                <span>
                  <CalendarOutlined style={{ color: '#1890ff' }} />
                  {dueTodayCount} due today
                </span>
              )}
            </Space>
          }
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card
        title={
          <Space>
            <BellOutlined />
            <span>Approval Task Queue</span>
            <Badge count={tasks.length} style={{ backgroundColor: '#52c41a' }} />
          </Space>
        }
        extra={
          <Space>
            {extraActions}
            {selectedTasks.length > 0 && (
              <Space>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={bulkActionLoading}
                  onClick={() => handleBulkAction('approve')}
                  aria-label={`Bulk approve ${selectedTasks.length} selected tasks`}
                  aria-describedby="bulk-actions-hint"
                >
                  Approve Selected ({selectedTasks.length})
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={bulkActionLoading}
                  onClick={() => handleBulkAction('reject')}
                  aria-label={`Bulk reject ${selectedTasks.length} selected tasks`}
                  aria-describedby="bulk-actions-hint"
                >
                  Reject Selected
                </Button>
              </Space>
            )}
          </Space>
        }
      >
        {!compact && filterPanel}

        <Table
          ref={tableRef}
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          rowSelection={rowSelection}
          loading={loading}
          pagination={{
            pageSize,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} tasks`
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No approval tasks found"
              />
            )
          }}
          size={compact ? 'small' : 'default'}
          scroll={{ x: 'max-content' }}
          rowClassName={(record, index) => {
            const isSelected = selectedTasks.includes(record.id);
            const isFocused = index === focusedRowIndex;
            return `${isSelected ? 'ant-table-row-selected' : ''} ${isFocused ? 'ant-table-row-focused' : ''}`;
          }}
          onRow={(record, index) => ({
            'data-task-id': record.id,
            'aria-selected': selectedTasks.includes(record.id),
            'aria-describedby': `task-${record.id}-description`,
            tabIndex: index === focusedRowIndex ? 0 : -1,
            onClick: () => {
              setFocusedRowIndex(index || 0);
            },
          })}
          aria-label={`Approval tasks table: ${tasks.length} tasks, ${selectedTasks.length} selected`}
          aria-describedby="table-navigation-hint"
        />
      </Card>

      {/* Reject Modal */}
      <RejectModal
        visible={rejectModalVisible}
        onClose={() => {
          setRejectModalVisible(false);
          setCurrentTask(null);
        }}
        onReject={handleReject}
        title="Task"
        itemIdentifier={currentTask?.taskTitle}
      />

      {/* Hidden ARIA hints for screen readers */}
      <div id="approval-queue-instructions" style={{ display: 'none' }}>
        Navigate tasks with arrow keys, select with Space, approve with Enter. Use Ctrl+Enter for bulk approve, Ctrl+Shift+Enter for bulk reject, Ctrl+A to select all, Escape to clear selection, F5 to refresh.
      </div>
      <div id="search-hint" style={{ display: 'none' }}>
        Search approval tasks by title, stage name, or work instruction.
      </div>
      <div id="status-filter-hint" style={{ display: 'none' }}>
        Filter tasks by their current status: Pending, In Progress, or Overdue.
      </div>
      <div id="priority-filter-hint" style={{ display: 'none' }}>
        Filter tasks by priority level: Critical, High, Medium, or Low.
      </div>
      <div id="entity-type-filter-hint" style={{ display: 'none' }}>
        Filter tasks by the type of entity requiring approval.
      </div>
      <div id="date-range-filter-hint" style={{ display: 'none' }}>
        Filter tasks by their due date range.
      </div>
      <div id="refresh-hint" style={{ display: 'none' }}>
        Refresh the approval task list to get the latest data. Use F5 as keyboard shortcut.
      </div>
      <div id="table-navigation-hint" style={{ display: 'none' }}>
        Use arrow keys to navigate, Space to select, Enter to approve current task.
      </div>
      <div id="bulk-actions-hint" style={{ display: 'none' }}>
        Perform actions on multiple selected tasks. Use Ctrl+Enter for bulk approve, Ctrl+Shift+Enter for bulk reject.
      </div>
    </div>
  );
};

export default ApprovalTaskQueue;