/**
 * Schedule Detail Component
 * Phase 2: Production Scheduling Dashboard
 *
 * Displays detailed view of a production schedule with entries, timeline, and controls
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Table,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  InputNumber,
  message,
  Popconfirm,
  Tooltip,
  Alert,
  Tabs,
  Timeline as AntTimeline,
  Badge,
  Progress,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  SendOutlined,
  BarChartOutlined,
  SortAscendingOutlined,
} from '@ant-design/icons';
import { useSchedulingStore } from '@/store/schedulingStore';
import { useAuthStore } from '@/store/AuthStore';
import {
  ScheduleEntry,
  SCHEDULE_STATE_COLORS,
  SCHEDULE_STATE_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  CONSTRAINT_TYPE_COLORS,
  CONSTRAINT_TYPE_LABELS,
} from '@/types/scheduling';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

export const ScheduleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isEntryModalVisible, setIsEntryModalVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

  const { user } = useAuthStore();
  const {
    currentSchedule,
    currentEntries,
    stateHistory,
    feasibilityResult,
    isLoadingDetail,
    isLoadingEntries,
    detailError,
    fetchScheduleById,
    fetchScheduleEntries,
    fetchStateHistory,
    createScheduleEntry,
    updateScheduleEntry,
    cancelScheduleEntry,
    transitionScheduleState,
    applyPrioritySequencing,
    applyEDDSequencing,
    checkScheduleFeasibility,
    dispatchScheduleEntry,
    dispatchAllEntries,
  } = useSchedulingStore();

  // Fetch schedule on mount
  useEffect(() => {
    if (id) {
      fetchScheduleById(id);
      fetchScheduleEntries(id);
      fetchStateHistory(id);
      checkScheduleFeasibility(id);
    }
  }, [id]);

  const canEdit = (user?.permissions?.includes('scheduling.write') || false) &&
                  currentSchedule &&
                  !currentSchedule.isLocked &&
                  currentSchedule.state === 'FORECAST';

  const canDispatch = (user?.permissions?.includes('scheduling.write') || false) &&
                      currentSchedule &&
                      (currentSchedule.state === 'RELEASED' || currentSchedule.state === 'DISPATCHED');

  // Handle state transitions
  const handleStateTransition = async (newState: string) => {
    if (!id || !user) return;

    try {
      await transitionScheduleState(id, {
        newState: newState as any,
        changedBy: user.id,
        reason: `Transitioned to ${newState}`,
      });
      message.success(`Schedule transitioned to ${newState}`);
    } catch (error: any) {
      message.error(error.message || 'Failed to transition schedule');
    }
  };

  // Handle sequencing
  const handlePrioritySequencing = async () => {
    if (!id) return;
    try {
      const result = await applyPrioritySequencing(id);
      message.success(`Priority sequencing applied to ${result.entriesAffected} entries`);
    } catch (error: any) {
      message.error(error.message || 'Failed to apply sequencing');
    }
  };

  const handleEDDSequencing = async () => {
    if (!id) return;
    try {
      const result = await applyEDDSequencing(id);
      message.success(`EDD sequencing applied to ${result.entriesAffected} entries`);
    } catch (error: any) {
      message.error(error.message || 'Failed to apply sequencing');
    }
  };

  // Handle dispatch
  const handleDispatchEntry = async (entryId: string) => {
    if (!user) return;
    try {
      await dispatchScheduleEntry(entryId, user.id);
      message.success('Entry dispatched successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to dispatch entry');
    }
  };

  const handleDispatchAll = async () => {
    if (!id || !user) return;
    try {
      const result = await dispatchAllEntries(id, user.id);
      message.success(`Dispatched ${result.dispatchedCount} entries`);
    } catch (error: any) {
      message.error(error.message || 'Failed to dispatch all entries');
    }
  };

  // Handle entry CRUD
  const handleCreateEntry = () => {
    setEditingEntry(null);
    form.resetFields();
    setIsEntryModalVisible(true);
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    form.setFieldsValue({
      ...entry,
      plannedStartDate: dayjs(entry.plannedStartDate),
      plannedEndDate: dayjs(entry.plannedEndDate),
      customerDueDate: entry.customerDueDate ? dayjs(entry.customerDueDate) : undefined,
    });
    setIsEntryModalVisible(true);
  };

  const handleSaveEntry = async () => {
    if (!id) return;

    try {
      const values = await form.validateFields();
      const data = {
        ...values,
        plannedStartDate: values.plannedStartDate.toISOString(),
        plannedEndDate: values.plannedEndDate.toISOString(),
        customerDueDate: values.customerDueDate?.toISOString(),
      };

      if (editingEntry) {
        await updateScheduleEntry(editingEntry.id, data);
        message.success('Entry updated successfully');
      } else {
        await createScheduleEntry(id, data);
        message.success('Entry created successfully');
      }

      setIsEntryModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || 'Failed to save entry');
    }
  };

  const handleCancelEntry = async (entryId: string) => {
    try {
      await cancelScheduleEntry(entryId, 'Cancelled by user', user?.id);
      message.success('Entry cancelled successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to cancel entry');
    }
  };

  // Calculate timeline visualization data
  const getTimelineWidth = (entry: ScheduleEntry): number => {
    if (!currentSchedule) return 0;
    const scheduleStart = new Date(currentSchedule.periodStart).getTime();
    const scheduleEnd = new Date(currentSchedule.periodEnd).getTime();
    const entryStart = new Date(entry.plannedStartDate).getTime();
    const entryEnd = new Date(entry.plannedEndDate).getTime();

    const scheduleDuration = scheduleEnd - scheduleStart;
    const entryDuration = entryEnd - entryStart;

    return (entryDuration / scheduleDuration) * 100;
  };

  const getTimelineOffset = (entry: ScheduleEntry): number => {
    if (!currentSchedule) return 0;
    const scheduleStart = new Date(currentSchedule.periodStart).getTime();
    const scheduleEnd = new Date(currentSchedule.periodEnd).getTime();
    const entryStart = new Date(entry.plannedStartDate).getTime();

    const scheduleDuration = scheduleEnd - scheduleStart;
    const offset = entryStart - scheduleStart;

    return (offset / scheduleDuration) * 100;
  };

  // Entries table columns
  const entryColumns: ColumnsType<ScheduleEntry> = [
    {
      title: 'Entry #',
      dataIndex: 'entryNumber',
      key: 'entryNumber',
      width: 80,
      sorter: (a, b) => a.entryNumber - b.entryNumber,
    },
    {
      title: 'Part',
      key: 'part',
      width: 180,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.partNumber}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.part?.partName || ''}</div>
        </div>
      ),
    },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 120,
      render: (_, record) => (
        <span>
          {record.plannedQuantity} {record.unitOfMeasure}
        </span>
      ),
    },
    {
      title: 'Timeline',
      key: 'timeline',
      width: 250,
      render: (_, record) => {
        const width = getTimelineWidth(record);
        const offset = getTimelineOffset(record);
        const color = PRIORITY_COLORS[record.priority];

        return (
          <div style={{ position: 'relative', height: '24px', background: '#f0f0f0', borderRadius: '4px' }}>
            <div
              style={{
                position: 'absolute',
                left: `${offset}%`,
                width: `${width}%`,
                height: '100%',
                background: color === 'default' ? '#1890ff' : color,
                borderRadius: '4px',
                opacity: record.isDispatched ? 0.5 : 1,
              }}
            >
              <Tooltip title={`${new Date(record.plannedStartDate).toLocaleDateString()} - ${new Date(record.plannedEndDate).toLocaleDateString()}`}>
                <div style={{ width: '100%', height: '100%' }} />
              </Tooltip>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={PRIORITY_COLORS[priority]} icon={priority === 'HOT' ? <ThunderboltOutlined /> : undefined}>
          {PRIORITY_LABELS[priority]}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {record.isDispatched && <Tag color="green">Dispatched</Tag>}
          {record.isCancelled && <Tag color="red">Cancelled</Tag>}
          {!record.isDispatched && !record.isCancelled && <Tag color="blue">Pending</Tag>}
          {record.constraints && record.constraints.length > 0 && (
            <Tag color="orange" icon={<ExclamationCircleOutlined />}>
              {record.constraints.filter(c => c.isViolated).length} Constraints
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          {canEdit && !record.isDispatched && !record.isCancelled && (
            <>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEditEntry(record)}
                />
              </Tooltip>
              <Tooltip title="Cancel">
                <Popconfirm
                  title="Cancel this entry?"
                  onConfirm={() => handleCancelEntry(record.id)}
                >
                  <Button type="text" size="small" danger icon={<CloseCircleOutlined />} />
                </Popconfirm>
              </Tooltip>
            </>
          )}
          {canDispatch && !record.isDispatched && !record.isCancelled && (
            <Tooltip title="Dispatch">
              <Popconfirm
                title="Dispatch this entry to create work order?"
                onConfirm={() => handleDispatchEntry(record.id)}
              >
                <Button type="text" size="small" icon={<SendOutlined />} />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (isLoadingDetail || !currentSchedule) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/production/scheduling')}>
            Back
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            {currentSchedule.scheduleName}
          </Title>
        </Space>
      </div>

      {/* Error Alert */}
      {detailError && (
        <Alert
          message="Error"
          description={detailError}
          type="error"
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Feasibility Alert */}
      {feasibilityResult && !feasibilityResult.isFeasible && (
        <Alert
          message="Schedule Constraints Violated"
          description={
            <ul style={{ marginBottom: 0 }}>
              {feasibilityResult.feasibilityIssues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          }
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Entries"
              value={currentSchedule.totalEntries}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Dispatched"
              value={currentSchedule.dispatchedCount}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending"
              value={currentSchedule.totalEntries - currentSchedule.dispatchedCount}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Progress"
              value={currentSchedule.totalEntries > 0 ? Math.round((currentSchedule.dispatchedCount / currentSchedule.totalEntries) * 100) : 0}
              suffix="%"
              prefix={<Progress type="circle" percent={currentSchedule.totalEntries > 0 ? Math.round((currentSchedule.dispatchedCount / currentSchedule.totalEntries) * 100) : 0} width={50} />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="details">
        <TabPane tab="Details" key="details">
          <Card title="Schedule Information" style={{ marginBottom: '16px' }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Schedule Number">{currentSchedule.scheduleNumber}</Descriptions.Item>
              <Descriptions.Item label="State">
                <Tag color={SCHEDULE_STATE_COLORS[currentSchedule.state]}>
                  {SCHEDULE_STATE_LABELS[currentSchedule.state]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                <Tag color={PRIORITY_COLORS[currentSchedule.priority]}>
                  {PRIORITY_LABELS[currentSchedule.priority]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Site">{currentSchedule.site?.siteName || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Period Start">
                {new Date(currentSchedule.periodStart).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Period End">
                {new Date(currentSchedule.periodEnd).toLocaleDateString()}
              </Descriptions.Item>
              <Descriptions.Item label="Period Type">{currentSchedule.periodType}</Descriptions.Item>
              <Descriptions.Item label="Locked">
                {currentSchedule.isLocked ? (
                  <Tag color="red" icon={<CloseCircleOutlined />}>Yes</Tag>
                ) : (
                  <Tag color="green" icon={<CheckCircleOutlined />}>No</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Feasible">
                {currentSchedule.isFeasible ? (
                  <Tag color="green" icon={<CheckCircleOutlined />}>Yes</Tag>
                ) : (
                  <Tag color="orange" icon={<ExclamationCircleOutlined />}>Has Constraints</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {currentSchedule.description || 'N/A'}
              </Descriptions.Item>
              {currentSchedule.notes && (
                <Descriptions.Item label="Notes" span={2}>{currentSchedule.notes}</Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          {/* State Transition Actions */}
          {canEdit && (
            <Card title="State Transitions" style={{ marginBottom: '16px' }}>
              <Space wrap>
                {currentSchedule.state === 'FORECAST' && (
                  <Button type="primary" onClick={() => handleStateTransition('RELEASED')}>
                    Release Schedule
                  </Button>
                )}
                {currentSchedule.state === 'RELEASED' && (
                  <>
                    <Button onClick={() => handleStateTransition('FORECAST')}>
                      Return to Forecast
                    </Button>
                    <Button type="primary" onClick={() => handleStateTransition('DISPATCHED')}>
                      Mark as Dispatched
                    </Button>
                  </>
                )}
                {currentSchedule.state === 'DISPATCHED' && (
                  <Button type="primary" onClick={() => handleStateTransition('RUNNING')}>
                    Start Running
                  </Button>
                )}
                {currentSchedule.state === 'RUNNING' && (
                  <Button type="primary" onClick={() => handleStateTransition('COMPLETED')}>
                    Mark Completed
                  </Button>
                )}
                {currentSchedule.state === 'COMPLETED' && (
                  <Button onClick={() => handleStateTransition('CLOSED')}>
                    Close Schedule
                  </Button>
                )}
              </Space>
            </Card>
          )}
        </TabPane>

        <TabPane tab="Schedule Entries" key="entries">
          <Card
            title={`Schedule Entries (${currentEntries.length})`}
            extra={
              <Space>
                {canEdit && (
                  <>
                    <Button
                      icon={<SortAscendingOutlined />}
                      onClick={handlePrioritySequencing}
                    >
                      Priority Sequence
                    </Button>
                    <Button
                      icon={<CalendarOutlined />}
                      onClick={handleEDDSequencing}
                    >
                      EDD Sequence
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleCreateEntry}
                    >
                      Add Entry
                    </Button>
                  </>
                )}
                {canDispatch && currentEntries.some(e => !e.isDispatched && !e.isCancelled) && (
                  <Popconfirm
                    title="Dispatch all pending entries?"
                    onConfirm={handleDispatchAll}
                  >
                    <Button type="primary" icon={<SendOutlined />}>
                      Dispatch All
                    </Button>
                  </Popconfirm>
                )}
              </Space>
            }
          >
            <Table
              columns={entryColumns}
              dataSource={currentEntries}
              rowKey="id"
              loading={isLoadingEntries}
              pagination={false}
              scroll={{ x: 1200 }}
              bordered
            />
          </Card>
        </TabPane>

        <TabPane tab="State History" key="history">
          <Card title="State Transition History">
            <AntTimeline>
              {stateHistory.map((history) => (
                <AntTimeline.Item
                  key={history.id}
                  color={SCHEDULE_STATE_COLORS[history.newState]}
                >
                  <div>
                    <strong>{new Date(history.transitionDate).toLocaleString()}</strong>
                    <div>
                      {history.previousState && (
                        <>
                          <Tag color={SCHEDULE_STATE_COLORS[history.previousState]}>
                            {SCHEDULE_STATE_LABELS[history.previousState]}
                          </Tag>
                          →
                        </>
                      )}
                      <Tag color={SCHEDULE_STATE_COLORS[history.newState]}>
                        {SCHEDULE_STATE_LABELS[history.newState]}
                      </Tag>
                    </div>
                    {history.reason && <div style={{ color: '#666' }}>{history.reason}</div>}
                    {history.changedBy && <div style={{ fontSize: '12px', color: '#999' }}>By: {history.changedBy}</div>}
                  </div>
                </AntTimeline.Item>
              ))}
            </AntTimeline>
          </Card>
        </TabPane>
      </Tabs>

      {/* Entry Modal */}
      <Modal
        title={editingEntry ? 'Edit Schedule Entry' : 'Create Schedule Entry'}
        open={isEntryModalVisible}
        onOk={handleSaveEntry}
        onCancel={() => {
          setIsEntryModalVisible(false);
          form.resetFields();
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="partId" label="Part ID" rules={[{ required: true }]}>
            <Input placeholder="Enter part ID" />
          </Form.Item>
          <Form.Item name="partNumber" label="Part Number" rules={[{ required: true }]}>
            <Input placeholder="Enter part number" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Enter description" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="plannedQuantity" label="Quantity" rules={[{ required: true }]}>
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unitOfMeasure" label="Unit" rules={[{ required: true }]}>
                <Input placeholder="EA, LBS, etc." />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="plannedStartDate" label="Start Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="plannedEndDate" label="End Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="priority" label="Priority" initialValue="NORMAL">
            <Select>
              <Option value="LOW">Low</Option>
              <Option value="NORMAL">Normal</Option>
              <Option value="HIGH">High</Option>
              <Option value="URGENT">Urgent</Option>
              <Option value="HOT">Hot</Option>
            </Select>
          </Form.Item>
          <Form.Item name="customerOrder" label="Customer Order">
            <Input placeholder="Enter customer order number" />
          </Form.Item>
          <Form.Item name="customerDueDate" label="Customer Due Date">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ScheduleDetail;
