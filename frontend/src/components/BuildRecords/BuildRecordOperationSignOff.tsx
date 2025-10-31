import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Card,
  Alert,
  Row,
  Col,
  Select,
  Checkbox,
  message,
  Timeline,
  Tag,
  Descriptions
} from 'antd';
import {
  EditOutlined,
  CheckCircleOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import SignatureCanvas from 'react-signature-canvas';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface BuildRecordOperation {
  id: string;
  operationId: string;
  operation: {
    id: string;
    operationNumber: string;
    description: string;
    workCenter: {
      name: string;
    };
  };
  status: string;
  startedAt?: string;
  completedAt?: string;
  actualTimeMinutes?: number;
  standardTimeMinutes: number;
  operatorId?: string;
  operator?: {
    id: string;
    name: string;
  };
  inspectorId?: string;
  inspector?: {
    id: string;
    name: string;
  };
  notes?: string;
  signatures: BuildRecordSignature[];
}

interface BuildRecordSignature {
  id: string;
  type: string;
  signedAt: string;
  signedBy: string;
  signer: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  operationId?: string;
  comments?: string;
  isValid: boolean;
  signatureData?: string; // Base64 encoded signature image
  ipAddress?: string;
  userAgent?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  certifications?: string[];
}

interface SignOffFormData {
  signatureType: string;
  comments: string;
  certificationConfirmed: boolean;
  qualityChecked: boolean;
  acceptsResponsibility: boolean;
}

interface BuildRecordOperationSignOffProps {
  visible: boolean;
  operation: BuildRecordOperation | null;
  buildRecordId: string;
  currentUser: User;
  onClose: () => void;
  onSignatureComplete: () => void;
}

const BuildRecordOperationSignOff: React.FC<BuildRecordOperationSignOffProps> = ({
  visible,
  operation,
  buildRecordId,
  currentUser,
  onClose,
  onSignatureComplete
}) => {
  const [form] = Form.useForm();
  const signatureRef = useRef<SignatureCanvas>(null);
  const [loading, setLoading] = useState(false);
  const [signatureProvided, setSignatureProvided] = useState(false);
  const [invalidationReason, setInvalidationReason] = useState('');
  const [showInvalidation, setShowInvalidation] = useState(false);

  useEffect(() => {
    if (visible && operation) {
      form.resetFields();
      setSignatureProvided(false);
      setShowInvalidation(false);
      if (signatureRef.current) {
        signatureRef.current.clear();
      }
    }
  }, [visible, operation, form]);

  const getAvailableSignatureTypes = (): string[] => {
    if (!operation || !currentUser) return [];

    const types: string[] = [];
    const existingTypes = operation.signatures.filter(sig => sig.isValid).map(sig => sig.type);

    // Operator signature
    if (currentUser.role === 'OPERATOR' && !existingTypes.includes('OPERATOR')) {
      types.push('OPERATOR');
    }

    // Inspector signature
    if (['INSPECTOR', 'QUALITY_MANAGER'].includes(currentUser.role) && !existingTypes.includes('INSPECTOR')) {
      types.push('INSPECTOR');
    }

    // Engineering signature
    if (['ENGINEER', 'ENGINEERING_MANAGER'].includes(currentUser.role) && !existingTypes.includes('ENGINEER')) {
      types.push('ENGINEER');
    }

    // Quality signature
    if (['QUALITY_MANAGER', 'QUALITY_INSPECTOR'].includes(currentUser.role) && !existingTypes.includes('QUALITY')) {
      types.push('QUALITY');
    }

    // Final approval (management)
    if (['PRODUCTION_MANAGER', 'ENGINEERING_MANAGER', 'QUALITY_MANAGER'].includes(currentUser.role) && !existingTypes.includes('FINAL_APPROVAL')) {
      types.push('FINAL_APPROVAL');
    }

    return types;
  };

  const canInvalidateSignature = (signature: BuildRecordSignature): boolean => {
    // Users can invalidate their own signatures
    if (signature.signedBy === currentUser.id) return true;

    // Managers can invalidate signatures in their domain
    if (currentUser.role === 'QUALITY_MANAGER' && ['QUALITY', 'INSPECTOR'].includes(signature.type)) return true;
    if (currentUser.role === 'ENGINEERING_MANAGER' && signature.type === 'ENGINEER') return true;
    if (currentUser.role === 'PRODUCTION_MANAGER') return true;

    return false;
  };

  const handleSignatureChange = () => {
    if (signatureRef.current) {
      const isEmpty = signatureRef.current.isEmpty();
      setSignatureProvided(!isEmpty);
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureProvided(false);
    }
  };

  const handleSubmit = async (values: SignOffFormData) => {
    if (!operation || !signatureProvided) {
      message.error('Please provide a signature');
      return;
    }

    try {
      setLoading(true);

      const signatureData = signatureRef.current?.toDataURL();

      const payload = {
        buildRecordId,
        operationId: operation.id,
        signatureType: values.signatureType,
        comments: values.comments,
        signatureData,
        metadata: {
          certificationConfirmed: values.certificationConfirmed,
          qualityChecked: values.qualityChecked,
          acceptsResponsibility: values.acceptsResponsibility,
          ipAddress: window.location.hostname,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      };

      const response = await fetch(`/api/build-records/${buildRecordId}/operations/${operation.id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        message.success('Operation signed off successfully');
        onSignatureComplete();
        onClose();
      } else {
        const error = await response.text();
        message.error(`Failed to sign off operation: ${error}`);
      }
    } catch (error) {
      console.error('Error signing off operation:', error);
      message.error('Error submitting signature');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateSignature = async (signatureId: string) => {
    if (!invalidationReason.trim()) {
      message.error('Please provide a reason for invalidation');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`/api/build-records/signatures/${signatureId}/invalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reason: invalidationReason })
      });

      if (response.ok) {
        message.success('Signature invalidated successfully');
        onSignatureComplete();
        setShowInvalidation(false);
        setInvalidationReason('');
      } else {
        message.error('Failed to invalidate signature');
      }
    } catch (error) {
      console.error('Error invalidating signature:', error);
      message.error('Error invalidating signature');
    } finally {
      setLoading(false);
    }
  };

  const getSignatureTypeColor = (type: string): string => {
    const colorMap: { [key: string]: string } = {
      'OPERATOR': 'blue',
      'INSPECTOR': 'green',
      'ENGINEER': 'orange',
      'QUALITY': 'purple',
      'FINAL_APPROVAL': 'red'
    };
    return colorMap[type] || 'default';
  };

  const getSignatureTypeIcon = (type: string) => {
    switch (type) {
      case 'OPERATOR':
        return <UserOutlined />;
      case 'INSPECTOR':
        return <CheckCircleOutlined />;
      case 'ENGINEER':
        return <EditOutlined />;
      case 'QUALITY':
        return <SafetyCertificateOutlined />;
      case 'FINAL_APPROVAL':
        return <ExclamationCircleOutlined />;
      default:
        return <UserOutlined />;
    }
  };

  if (!operation) {
    return null;
  }

  const availableTypes = getAvailableSignatureTypes();

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          Operation Sign-Off: {operation.operation.operationNumber}
        </Space>
      }
      visible={visible}
      onCancel={onClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Operation Information */}
        <Card size="small" style={{ marginBottom: '16px' }}>
          <Descriptions title="Operation Details" size="small" column={2}>
            <Descriptions.Item label="Operation">
              {operation.operation.operationNumber}
            </Descriptions.Item>
            <Descriptions.Item label="Work Center">
              {operation.operation.workCenter.name}
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              {operation.operation.description}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={operation.status === 'COMPLETED' ? 'green' : 'blue'}>
                {operation.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Operator">
              {operation.operator?.name || 'Not assigned'}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* Existing Signatures */}
        {operation.signatures.length > 0 && (
          <Card title="Existing Signatures" size="small" style={{ marginBottom: '16px' }}>
            <Timeline size="small">
              {operation.signatures
                .filter(sig => sig.isValid)
                .sort((a, b) => new Date(a.signedAt).getTime() - new Date(b.signedAt).getTime())
                .map((signature) => (
                  <Timeline.Item
                    key={signature.id}
                    dot={getSignatureTypeIcon(signature.type)}
                  >
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Space direction="vertical" size="small">
                          <Space>
                            <Tag color={getSignatureTypeColor(signature.type)}>
                              {signature.type.replace('_', ' ')}
                            </Tag>
                            <Text strong>{signature.signer.name}</Text>
                          </Space>
                          <Text type="secondary">
                            {dayjs(signature.signedAt).format('MMM DD, YYYY HH:mm')}
                          </Text>
                          {signature.comments && (
                            <Text italic>"{signature.comments}"</Text>
                          )}
                        </Space>
                      </Col>
                      <Col>
                        {canInvalidateSignature(signature) && (
                          <Button
                            size="small"
                            danger
                            onClick={() => setShowInvalidation(true)}
                          >
                            Invalidate
                          </Button>
                        )}
                      </Col>
                    </Row>
                  </Timeline.Item>
                ))}
            </Timeline>
          </Card>
        )}

        {/* Warning for operation status */}
        {operation.status !== 'COMPLETED' && (
          <Alert
            message="Operation Not Completed"
            description="This operation has not been marked as completed. Please ensure all work is finished before signing off."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
        )}

        {/* Sign-off form */}
        {availableTypes.length > 0 ? (
          <Card title="Electronic Signature" size="small">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              initialValues={{
                signatureType: availableTypes[0],
                certificationConfirmed: false,
                qualityChecked: false,
                acceptsResponsibility: false
              }}
            >
              <Form.Item
                name="signatureType"
                label="Signature Type"
                rules={[{ required: true, message: 'Please select signature type' }]}
              >
                <Select>
                  {availableTypes.map(type => (
                    <Option key={type} value={type}>
                      <Space>
                        {getSignatureTypeIcon(type)}
                        {type.replace('_', ' ')}
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="comments"
                label="Comments (Optional)"
              >
                <TextArea
                  rows={3}
                  placeholder="Add any comments or notes about this operation..."
                />
              </Form.Item>

              {/* Signature Canvas */}
              <Form.Item label="Digital Signature" required>
                <div
                  style={{
                    border: '2px dashed #d9d9d9',
                    borderRadius: '6px',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{
                      width: 500,
                      height: 200,
                      className: 'signature-canvas',
                      style: {
                        border: '1px solid #d9d9d9',
                        borderRadius: '4px',
                        backgroundColor: 'white'
                      }
                    }}
                    onEnd={handleSignatureChange}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <Button size="small" onClick={clearSignature}>
                      Clear Signature
                    </Button>
                    <Text type="secondary" style={{ marginLeft: '16px' }}>
                      Please sign above to authorize this operation
                    </Text>
                  </div>
                </div>
              </Form.Item>

              {/* Certification Checkboxes */}
              <Card size="small" style={{ backgroundColor: '#f6ffed', marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Form.Item
                    name="certificationConfirmed"
                    valuePropName="checked"
                    rules={[
                      {
                        validator: (_, value) =>
                          value ? Promise.resolve() : Promise.reject('You must confirm your certification')
                      }
                    ]}
                  >
                    <Checkbox>
                      I confirm that I am certified and authorized to perform this operation type
                    </Checkbox>
                  </Form.Item>

                  <Form.Item
                    name="qualityChecked"
                    valuePropName="checked"
                    rules={[
                      {
                        validator: (_, value) =>
                          value ? Promise.resolve() : Promise.reject('You must confirm quality standards')
                      }
                    ]}
                  >
                    <Checkbox>
                      I confirm that this operation meets all quality standards and specifications
                    </Checkbox>
                  </Form.Item>

                  <Form.Item
                    name="acceptsResponsibility"
                    valuePropName="checked"
                    rules={[
                      {
                        validator: (_, value) =>
                          value ? Promise.resolve() : Promise.reject('You must accept responsibility')
                      }
                    ]}
                  >
                    <Checkbox>
                      I accept full responsibility for the accuracy of this sign-off and understand the regulatory implications
                    </Checkbox>
                  </Form.Item>
                </Space>
              </Card>

              {/* Submit Buttons */}
              <Row justify="end">
                <Space>
                  <Button onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    disabled={!signatureProvided}
                    icon={<CheckCircleOutlined />}
                  >
                    Submit Signature
                  </Button>
                </Space>
              </Row>
            </Form>
          </Card>
        ) : (
          <Alert
            message="No Available Signatures"
            description="You have already signed off on this operation or are not authorized to sign off at this time."
            type="info"
            showIcon
          />
        )}

        {/* Signature Invalidation Modal */}
        <Modal
          title="Invalidate Signature"
          visible={showInvalidation}
          onCancel={() => setShowInvalidation(false)}
          onOk={() => {
            const firstValidSignature = operation.signatures.find(sig => sig.isValid);
            if (firstValidSignature) {
              handleInvalidateSignature(firstValidSignature.id);
            }
          }}
          confirmLoading={loading}
        >
          <Alert
            message="Warning"
            description="Invalidating a signature will require re-approval of this operation."
            type="warning"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Input.TextArea
            rows={4}
            placeholder="Please provide a reason for invalidating this signature..."
            value={invalidationReason}
            onChange={(e) => setInvalidationReason(e.target.value)}
          />
        </Modal>
      </div>
    </Modal>
  );
};

export default BuildRecordOperationSignOff;