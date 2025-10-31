import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  Row,
  Col,
  Typography,
  Divider,
  Steps,
  Alert,
  Upload,
  Tag,
  Table,
  Timeline,
  Descriptions,
  Radio,
  Checkbox,
  DatePicker,
  message,
  Tooltip,
  Progress,
  Badge
} from 'antd';
import {
  ExclamationCircleOutlined,
  FileAddOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  PictureOutlined,
  UploadOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  SafetyOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { Step } = Steps;

interface BuildDeviation {
  id?: string;
  buildRecordId: string;
  operationId?: string;
  operation?: {
    operationNumber: string;
    description: string;
  };
  type: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  impactAssessment?: string;
  status: string;
  detectedAt: string;
  detectedBy: string;
  detector?: {
    name: string;
    role: string;
  };
  assignedTo?: string;
  assignee?: {
    name: string;
    role: string;
  };
  targetResolutionDate?: string;
  actualResolutionDate?: string;
  approvals: DeviationApproval[];
  attachments: DeviationAttachment[];
  comments: DeviationComment[];
  statusHistory: DeviationStatusHistory[];
}

interface DeviationApproval {
  id: string;
  level: string;
  approverRole: string;
  approverId?: string;
  approver?: {
    name: string;
    role: string;
  };
  status: string;
  approvedAt?: string;
  comments?: string;
  required: boolean;
}

interface DeviationAttachment {
  id: string;
  type: string;
  filename: string;
  originalName: string;
  filePath: string;
  uploadedAt: string;
  uploadedBy: string;
  description?: string;
}

interface DeviationComment {
  id: string;
  userId: string;
  user: {
    name: string;
    role: string;
  };
  comment: string;
  createdAt: string;
  isInternal: boolean;
}

interface DeviationStatusHistory {
  id: string;
  status: string;
  changedAt: string;
  changedBy: string;
  changer: {
    name: string;
  };
  reason?: string;
}

interface Operation {
  id: string;
  operationNumber: string;
  description: string;
}

interface User {
  id: string;
  name: string;
  role: string;
}

interface DeviationTrackerProps {
  visible: boolean;
  buildRecordId: string;
  operationId?: string;
  operations: Operation[];
  deviation?: BuildDeviation;
  currentUser: User;
  onClose: () => void;
  onSaved: (deviation: BuildDeviation) => void;
}

const DeviationTracker: React.FC<DeviationTrackerProps> = ({
  visible,
  buildRecordId,
  operationId,
  operations,
  deviation,
  currentUser,
  onClose,
  onSaved
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [attachments, setAttachments] = useState<DeviationAttachment[]>([]);
  const [comments, setComments] = useState<DeviationComment[]>([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    if (visible) {
      if (deviation) {
        form.setFieldsValue({
          ...deviation,
          detectedAt: dayjs(deviation.detectedAt),
          targetResolutionDate: deviation.targetResolutionDate ? dayjs(deviation.targetResolutionDate) : null,
          actualResolutionDate: deviation.actualResolutionDate ? dayjs(deviation.actualResolutionDate) : null
        });
        setAttachments(deviation.attachments || []);
        setComments(deviation.comments || []);

        // Set current step based on status
        switch (deviation.status) {
          case 'REPORTED':
            setCurrentStep(0);
            break;
          case 'INVESTIGATING':
            setCurrentStep(1);
            break;
          case 'PENDING_APPROVAL':
            setCurrentStep(2);
            break;
          case 'APPROVED':
          case 'RESOLVED':
            setCurrentStep(3);
            break;
          default:
            setCurrentStep(0);
        }
      } else {
        form.setFieldsValue({
          buildRecordId,
          operationId,
          type: 'PROCESS',
          severity: 'MEDIUM',
          status: 'REPORTED',
          detectedAt: dayjs(),
          detectedBy: currentUser.id
        });
        setCurrentStep(0);
        setAttachments([]);
        setComments([]);
      }
    }
  }, [visible, deviation, form, buildRecordId, operationId, currentUser]);

  const getSeverityColor = (severity: string): string => {
    const colorMap: { [key: string]: string } = {
      'LOW': 'green',
      'MEDIUM': 'orange',
      'HIGH': 'red',
      'CRITICAL': 'red'
    };
    return colorMap[severity] || 'default';
  };

  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      'REPORTED': 'orange',
      'INVESTIGATING': 'blue',
      'PENDING_APPROVAL': 'purple',
      'APPROVED': 'green',
      'RESOLVED': 'green',
      'REJECTED': 'red'
    };
    return colorMap[status] || 'default';
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const deviationData = {
        ...values,
        detectedAt: values.detectedAt.toISOString(),
        targetResolutionDate: values.targetResolutionDate?.toISOString(),
        actualResolutionDate: values.actualResolutionDate?.toISOString(),
        attachments,
        comments
      };

      const response = await fetch(
        deviation?.id
          ? `/api/build-records/${buildRecordId}/deviations/${deviation.id}`
          : `/api/build-records/${buildRecordId}/deviations`,
        {
          method: deviation?.id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(deviationData)
        }
      );

      if (response.ok) {
        const savedDeviation = await response.json();
        message.success(`Deviation ${deviation?.id ? 'updated' : 'created'} successfully`);
        onSaved(savedDeviation);
        onClose();
      } else {
        message.error('Failed to save deviation');
      }
    } catch (error) {
      console.error('Error saving deviation:', error);
      message.error('Error saving deviation');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'DEVIATION_PHOTO');
    formData.append('description', 'Deviation attachment');

    try {
      const response = await fetch(`/api/build-records/${buildRecordId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (response.ok) {
        const attachment = await response.json();
        setAttachments([...attachments, attachment]);
        message.success('File uploaded successfully');
      } else {
        message.error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      message.error('Error uploading file');
    }

    return false; // Prevent default upload behavior
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/build-records/${buildRecordId}/deviations/${deviation?.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          comment: newComment,
          isInternal: false
        })
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([...comments, comment]);
        setNewComment('');
        message.success('Comment added');
      } else {
        message.error('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      message.error('Error adding comment');
    }
  };

  const approvalColumns = [
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 100,
    },
    {
      title: 'Role',
      dataIndex: 'approverRole',
      key: 'approverRole',
      width: 150,
    },
    {
      title: 'Approver',
      dataIndex: ['approver', 'name'],
      key: 'approver',
      width: 150,
      render: (name: string) => name || 'Not assigned',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status.replace('_', ' ')}
        </Tag>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'approvedAt',
      key: 'approvedAt',
      width: 150,
      render: (date: string) => date ? dayjs(date).format('MMM DD, YYYY') : '--',
    },
    {
      title: 'Comments',
      dataIndex: 'comments',
      key: 'comments',
      ellipsis: true,
    },
  ];

  const attachmentColumns = [
    {
      title: 'File',
      dataIndex: 'originalName',
      key: 'originalName',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => <Tag>{type}</Tag>,
    },
    {
      title: 'Uploaded',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      width: 150,
      render: (date: string) => dayjs(date).format('MMM DD, YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (record: DeviationAttachment) => (
        <Button type="link" size="small" icon={<EyeOutlined />}>
          View
        </Button>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined />
          {deviation?.id ? 'Edit Deviation' : 'Report New Deviation'}
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={1200}
      footer={
        <Row justify="space-between">
          <Col>
            {deviation?.id && (
              <Badge
                count={`${deviation.status.replace('_', ' ')}`}
                style={{ backgroundColor: getStatusColor(deviation.status) }}
              />
            )}
          </Col>
          <Col>
            <Space>
              <Button onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                icon={deviation?.id ? <EditOutlined /> : <FileAddOutlined />}
              >
                {deviation?.id ? 'Update Deviation' : 'Report Deviation'}
              </Button>
            </Space>
          </Col>
        </Row>
      }
    >
      <div style={{ maxHeight: '75vh', overflowY: 'auto' }}>
        {/* Progress Steps */}
        <Steps current={currentStep} style={{ marginBottom: '24px' }}>
          <Step title="Reported" description="Initial report" icon={<ExclamationCircleOutlined />} />
          <Step title="Investigation" description="Root cause analysis" icon={<EditOutlined />} />
          <Step title="Approval" description="Management review" icon={<UserOutlined />} />
          <Step title="Resolution" description="Corrective action" icon={<CheckCircleOutlined />} />
        </Steps>

        <Form form={form} layout="vertical">
          <Row gutter={[24, 0]}>
            {/* Left Column - Basic Information */}
            <Col span={16}>
              <Card title="Deviation Details" size="small">
                <Row gutter={[16, 0]}>
                  <Col span={12}>
                    <Form.Item
                      name="title"
                      label="Deviation Title"
                      rules={[{ required: true, message: 'Please enter deviation title' }]}
                    >
                      <Input placeholder="Brief description of the deviation" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="operationId" label="Associated Operation">
                      <Select placeholder="Select operation (optional)" allowClear>
                        {operations.map(op => (
                          <Option key={op.id} value={op.id}>
                            {op.operationNumber} - {op.description}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={[16, 0]}>
                  <Col span={8}>
                    <Form.Item
                      name="type"
                      label="Deviation Type"
                      rules={[{ required: true, message: 'Please select type' }]}
                    >
                      <Select>
                        <Option value="PROCESS">Process Deviation</Option>
                        <Option value="MATERIAL">Material Deviation</Option>
                        <Option value="DESIGN">Design Deviation</Option>
                        <Option value="TOOLING">Tooling Issue</Option>
                        <Option value="MEASUREMENT">Measurement Issue</Option>
                        <Option value="DOCUMENTATION">Documentation Error</Option>
                        <Option value="OTHER">Other</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="category"
                      label="Category"
                      rules={[{ required: true, message: 'Please select category' }]}
                    >
                      <Select>
                        <Option value="QUALITY">Quality Issue</Option>
                        <Option value="SAFETY">Safety Concern</Option>
                        <Option value="COMPLIANCE">Compliance Issue</Option>
                        <Option value="EFFICIENCY">Efficiency Issue</Option>
                        <Option value="CUSTOMER">Customer Requirement</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="severity"
                      label="Severity"
                      rules={[{ required: true, message: 'Please select severity' }]}
                    >
                      <Select>
                        <Option value="LOW">
                          <Space>
                            <Tag color="green">LOW</Tag>
                            Minor impact
                          </Space>
                        </Option>
                        <Option value="MEDIUM">
                          <Space>
                            <Tag color="orange">MEDIUM</Tag>
                            Moderate impact
                          </Space>
                        </Option>
                        <Option value="HIGH">
                          <Space>
                            <Tag color="red">HIGH</Tag>
                            Significant impact
                          </Space>
                        </Option>
                        <Option value="CRITICAL">
                          <Space>
                            <Tag color="red">CRITICAL</Tag>
                            Critical impact
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="description"
                  label="Detailed Description"
                  rules={[{ required: true, message: 'Please provide detailed description' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Provide a detailed description of the deviation, including what was expected vs what was observed..."
                  />
                </Form.Item>

                <Form.Item name="impactAssessment" label="Impact Assessment">
                  <TextArea
                    rows={3}
                    placeholder="Assess the potential impact on quality, safety, schedule, cost, etc..."
                  />
                </Form.Item>
              </Card>

              {/* Root Cause Analysis */}
              <Card title="Root Cause Analysis" size="small" style={{ marginTop: '16px' }}>
                <Form.Item name="rootCause" label="Root Cause">
                  <TextArea
                    rows={3}
                    placeholder="Identify the fundamental cause of this deviation..."
                  />
                </Form.Item>

                <Form.Item name="correctiveAction" label="Corrective Action">
                  <TextArea
                    rows={3}
                    placeholder="Describe the immediate actions taken to address this deviation..."
                  />
                </Form.Item>

                <Form.Item name="preventiveAction" label="Preventive Action">
                  <TextArea
                    rows={3}
                    placeholder="Describe actions to prevent recurrence of this type of deviation..."
                  />
                </Form.Item>
              </Card>

              {/* Attachments */}
              <Card title="Attachments" size="small" style={{ marginTop: '16px' }}>
                <Upload.Dragger
                  accept="image/*,.pdf,.doc,.docx"
                  multiple
                  showUploadList={false}
                  beforeUpload={handleFileUpload}
                >
                  <p className="ant-upload-drag-icon">
                    <PictureOutlined />
                  </p>
                  <p className="ant-upload-text">
                    Click or drag files to upload
                  </p>
                  <p className="ant-upload-hint">
                    Support photos, PDFs, and documents
                  </p>
                </Upload.Dragger>

                {attachments.length > 0 && (
                  <Table
                    dataSource={attachments}
                    columns={attachmentColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    style={{ marginTop: '16px' }}
                  />
                )}
              </Card>
            </Col>

            {/* Right Column - Status and Tracking */}
            <Col span={8}>
              <Card title="Status Information" size="small">
                <Form.Item name="status" label="Current Status">
                  <Select>
                    <Option value="REPORTED">Reported</Option>
                    <Option value="INVESTIGATING">Investigating</Option>
                    <Option value="PENDING_APPROVAL">Pending Approval</Option>
                    <Option value="APPROVED">Approved</Option>
                    <Option value="RESOLVED">Resolved</Option>
                    <Option value="REJECTED">Rejected</Option>
                  </Select>
                </Form.Item>

                <Form.Item name="detectedAt" label="Detection Date">
                  <DatePicker showTime style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="targetResolutionDate" label="Target Resolution">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="actualResolutionDate" label="Actual Resolution">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item name="assignedTo" label="Assigned To">
                  <Select placeholder="Select assignee" allowClear>
                    <Option value="user1">John Smith (Engineer)</Option>
                    <Option value="user2">Jane Doe (Quality Manager)</Option>
                    <Option value="user3">Bob Johnson (Production Manager)</Option>
                  </Select>
                </Form.Item>
              </Card>

              {/* Approval Workflow */}
              {deviation?.approvals && (
                <Card title="Approval Workflow" size="small" style={{ marginTop: '16px' }}>
                  <Table
                    dataSource={deviation.approvals}
                    columns={approvalColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                  />
                </Card>
              )}

              {/* Comments */}
              <Card title="Comments" size="small" style={{ marginTop: '16px' }}>
                <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '12px' }}>
                  <Timeline size="small">
                    {comments.map((comment) => (
                      <Timeline.Item key={comment.id}>
                        <div>
                          <Text strong>{comment.user.name}</Text>
                          <Text type="secondary"> ({comment.user.role})</Text>
                          <br />
                          <Text>{comment.comment}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {dayjs(comment.createdAt).format('MMM DD, HH:mm')}
                          </Text>
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </div>

                <Space.Compact style={{ width: '100%' }}>
                  <Input
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onPressEnter={addComment}
                  />
                  <Button type="primary" onClick={addComment}>
                    Add
                  </Button>
                </Space.Compact>
              </Card>

              {/* Status History */}
              {deviation?.statusHistory && deviation.statusHistory.length > 0 && (
                <Card title="Status History" size="small" style={{ marginTop: '16px' }}>
                  <Timeline size="small">
                    {deviation.statusHistory
                      .sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                      .map((history) => (
                        <Timeline.Item key={history.id}>
                          <div>
                            <Text strong>{history.status.replace('_', ' ')}</Text>
                            <br />
                            <Text type="secondary">
                              {dayjs(history.changedAt).format('MMM DD, YYYY HH:mm')} by {history.changer.name}
                            </Text>
                            {history.reason && (
                              <>
                                <br />
                                <Text italic>"{history.reason}"</Text>
                              </>
                            )}
                          </div>
                        </Timeline.Item>
                      ))}
                  </Timeline>
                </Card>
              )}
            </Col>
          </Row>
        </Form>
      </div>
    </Modal>
  );
};

export default DeviationTracker;