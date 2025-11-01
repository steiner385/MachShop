/**
 * CAPA Detail Component (Issue #56)
 * Comprehensive CAPA viewer and editor with lifecycle management
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Space,
  Tabs,
  Divider,
  Collapse,
  Table,
  Modal,
  message,
  Row,
  Col,
  Tag,
  Timeline,
  Empty,
  Spin,
} from 'antd';
import {
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

interface CapaDetailProps {
  capaId: string;
  onClose?: () => void;
  onSave?: (capaId: string) => void;
}

interface CAPA {
  id: string;
  capaNumber: string;
  title: string;
  description: string;
  status: string;
  riskLevel: string;
  ownerId: string;
  owner?: { id: string; firstName?: string; lastName?: string };
  createdById: string;
  plannedDueDate: string;
  actualCompletionDate?: string;
  rootCauseAnalysis?: string;
  estimatedCost?: number;
  actualCost?: number;
  actions: any[];
  verifications: any[];
  stateHistory: any[];
}

const CapaDetail: React.FC<CapaDetailProps> = ({ capaId, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [capa, setCapa] = useState<CAPA | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // Fetch CAPA details
  useEffect(() => {
    const fetchCapa = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/capa/${capaId}`);
        const data = await response.json();

        if (data.success) {
          setCapa(data.data);
          form.setFieldsValue({
            title: data.data.title,
            description: data.data.description,
            riskLevel: data.data.riskLevel,
            plannedDueDate: dayjs(data.data.plannedDueDate),
            rootCauseAnalysis: data.data.rootCauseAnalysis,
            estimatedCost: data.data.estimatedCost,
          });
        }
      } catch (error) {
        console.error('Failed to fetch CAPA:', error);
        message.error('Failed to load CAPA details');
      } finally {
        setLoading(false);
      }
    };

    fetchCapa();
  }, [capaId, form]);

  // Handle save
  const handleSave = async (values: any) => {
    try {
      const response = await fetch(`/api/capa/${capaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description,
          riskLevel: values.riskLevel,
          plannedDueDate: values.plannedDueDate?.toISOString(),
          rootCauseAnalysis: values.rootCauseAnalysis,
          estimatedCost: values.estimatedCost,
        }),
      });

      const data = await response.json();

      if (data.success) {
        message.success('CAPA updated successfully');
        setCapa(data.data);
        setEditing(false);
        onSave?.(capaId);
      }
    } catch (error) {
      console.error('Failed to save CAPA:', error);
      message.error('Failed to save CAPA');
    }
  };

  if (loading || !capa) {
    return <Spin />;
  }

  return (
    <div>
      <Card
        title={`CAPA ${capa.capaNumber}`}
        extra={
          <Space>
            {!editing ? (
              <>
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                >
                  Edit
                </Button>
                <Button icon={<CloseOutlined />} onClick={onClose}>
                  Close
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => form.submit()}
                >
                  Save
                </Button>
                <Button
                  onClick={() => {
                    setEditing(false);
                    form.resetFields();
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <div>
              <strong>Status:</strong>
              <Tag color="blue" style={{ marginLeft: 8 }}>
                {capa.status}
              </Tag>
            </div>
          </Col>
          <Col span={4}>
            <div>
              <strong>Risk Level:</strong>
              <Tag
                color={
                  capa.riskLevel === 'CRITICAL'
                    ? 'red'
                    : capa.riskLevel === 'HIGH'
                    ? 'orange'
                    : 'green'
                }
                style={{ marginLeft: 8 }}
              >
                {capa.riskLevel}
              </Tag>
            </div>
          </Col>
          <Col span={8}>
            <div>
              <strong>Owner:</strong> {capa.owner?.firstName} {capa.owner?.lastName}
            </div>
          </Col>
          <Col span={8}>
            <div>
              <strong>Created:</strong> {dayjs(capa.createdAt || '').format('MM/DD/YYYY')}
            </div>
          </Col>
        </Row>
      </Card>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: 'Overview',
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSave}
                  disabled={!editing}
                >
                  <Form.Item
                    label="Title"
                    name="title"
                    rules={[{ required: true, message: 'Title is required' }]}
                  >
                    <Input placeholder="CAPA title" />
                  </Form.Item>

                  <Form.Item
                    label="Description"
                    name="description"
                    rules={[{ required: true, message: 'Description is required' }]}
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder="CAPA description"
                    />
                  </Form.Item>

                  <Form.Item label="Risk Level" name="riskLevel">
                    <Select
                      options={[
                        { label: 'Low', value: 'LOW' },
                        { label: 'Medium', value: 'MEDIUM' },
                        { label: 'High', value: 'HIGH' },
                        { label: 'Critical', value: 'CRITICAL' },
                      ]}
                    />
                  </Form.Item>

                  <Form.Item label="Root Cause Analysis" name="rootCauseAnalysis">
                    <Input.TextArea
                      rows={4}
                      placeholder="Detailed root cause analysis"
                    />
                  </Form.Item>

                  <Form.Item label="Planned Due Date" name="plannedDueDate">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>

                  <Form.Item label="Estimated Cost" name="estimatedCost">
                    <InputNumber
                      prefix="$"
                      style={{ width: '100%' }}
                      min={0}
                      step={100}
                    />
                  </Form.Item>

                  {capa.actualCost && (
                    <Form.Item label="Actual Cost">
                      <Input
                        value={`$${capa.actualCost}`}
                        disabled
                      />
                    </Form.Item>
                  )}
                </Form>
              </Card>
            ),
          },
          {
            key: 'actions',
            label: `Actions (${capa.actions?.length || 0})`,
            children: (
              <Card
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setActionModalVisible(true)}
                  >
                    Add Action
                  </Button>
                }
              >
                {capa.actions && capa.actions.length > 0 ? (
                  <Collapse
                    items={capa.actions.map((action, idx) => ({
                      key: action.id,
                      label: (
                        <Space>
                          <span>Action {action.actionNumber}</span>
                          <Tag color="blue">{action.actionType}</Tag>
                          <Tag
                            color={
                              action.status === 'COMPLETED'
                                ? 'green'
                                : action.status === 'OVERDUE'
                                ? 'red'
                                : 'orange'
                            }
                          >
                            {action.status}
                          </Tag>
                          <span>{action.description}</span>
                        </Space>
                      ),
                      children: (
                        <div>
                          <p><strong>Owner:</strong> {action.owner?.firstName} {action.owner?.lastName}</p>
                          <p><strong>Due Date:</strong> {dayjs(action.plannedDueDate).format('MM/DD/YYYY')}</p>
                          <p><strong>Progress:</strong> {action.percentComplete}%</p>
                          <p><strong>Estimated Cost:</strong> ${action.estimatedCost || 0}</p>
                          <p><strong>Actual Cost:</strong> ${action.actualCost || 0}</p>
                          {action.notes && (
                            <p><strong>Notes:</strong> {action.notes}</p>
                          )}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Empty description="No actions yet" />
                )}
              </Card>
            ),
          },
          {
            key: 'verification',
            label: `Verifications (${capa.verifications?.length || 0})`,
            children: (
              <Card>
                {capa.verifications && capa.verifications.length > 0 ? (
                  <Collapse
                    items={capa.verifications.map((verification) => ({
                      key: verification.id,
                      label: (
                        <Space>
                          <span>Verification {verification.verificationNumber}</span>
                          <Tag
                            color={
                              verification.result === 'VERIFIED_EFFECTIVE'
                                ? 'green'
                                : 'red'
                            }
                          >
                            {verification.result}
                          </Tag>
                          <span>{dayjs(verification.verificationDate).format('MM/DD/YYYY')}</span>
                        </Space>
                      ),
                      children: (
                        <div>
                          <p><strong>Method:</strong> {verification.verificationMethod}</p>
                          <p><strong>Sample Size:</strong> {verification.sampleSize || 'N/A'}</p>
                          <p><strong>Notes:</strong> {verification.verificationNotes || 'N/A'}</p>
                          {verification.result === 'VERIFIED_INEFFECTIVE' && (
                            <>
                              <p><strong>Root Cause of Failure:</strong> {verification.rootCauseOfFailure}</p>
                              <p><strong>Recommended Actions:</strong> {verification.recommendedActions}</p>
                            </>
                          )}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Empty description="No verifications yet" />
                )}
              </Card>
            ),
          },
          {
            key: 'history',
            label: 'State History',
            children: (
              <Card>
                {capa.stateHistory && capa.stateHistory.length > 0 ? (
                  <Timeline
                    items={capa.stateHistory.map((item) => ({
                      label: dayjs(item.changedAt).format('MM/DD/YYYY HH:mm'),
                      children: (
                        <div>
                          <p>
                            <strong>{item.fromState || 'START'}</strong> → <strong>{item.toState}</strong>
                          </p>
                          {item.changeReason && (
                            <p><em>{item.changeReason}</em></p>
                          )}
                        </div>
                      ),
                    }))}
                  />
                ) : (
                  <Empty description="No history" />
                )}
              </Card>
            ),
          },
        ]}
      />
    </div>
  );
};

export default CapaDetail;
