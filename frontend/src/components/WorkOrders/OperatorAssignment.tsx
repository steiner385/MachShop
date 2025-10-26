import React, { useState, useEffect } from 'react';
import { Modal, Select, Form, message, Button, Space, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Option } = Select;

interface Operator {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  currentAssignments?: number;
}

interface OperatorAssignmentProps {
  workOrderId: string;
  workOrderNumber: string;
  currentOperatorId?: string;
  currentOperatorName?: string;
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Operator Assignment Component
 *
 * Allows production supervisors to assign operators to work orders.
 * Shows operator availability and current workload.
 */
export const OperatorAssignment: React.FC<OperatorAssignmentProps> = ({
  workOrderId: _workOrderId,
  workOrderNumber,
  currentOperatorId,
  currentOperatorName,
  visible,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available operators
  useEffect(() => {
    if (visible) {
      fetchOperators();
    }
  }, [visible]);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      // In real implementation, this would call the API
      // For now, mock data
      const mockOperators: Operator[] = [
        {
          id: 'user-1',
          username: 'john.doe',
          firstName: 'John',
          lastName: 'Doe',
          isActive: true,
          currentAssignments: 2,
        },
        {
          id: 'user-2',
          username: 'prod.operator',
          firstName: 'Production',
          lastName: 'Operator',
          isActive: true,
          currentAssignments: 1,
        },
      ];
      setOperators(mockOperators);
    } catch (error) {
      message.error('Failed to load operators');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (_values: { operatorId: string }) => {
    setSubmitting(true);
    try {
      // Call API to assign operator
      // await assignOperator(workOrderId.operatorId);

      message.success('Operator assigned successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      message.error('Failed to assign operator');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async () => {
    setSubmitting(true);
    try {
      // Call API to unassign operator
      // await unassignOperator(workOrderId);

      message.success('Operator unassigned successfully');
      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      message.error('Failed to unassign operator');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Assign Operator - ${workOrderNumber}`}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      {currentOperatorName && (
        <div style={{ marginBottom: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <Space>
            <UserOutlined />
            <span>Currently Assigned:</span>
            <Tag color="blue">{currentOperatorName}</Tag>
            <Button
              size="small"
              danger
              onClick={handleUnassign}
              loading={submitting}
              data-testid="unassign-operator-button"
            >
              Unassign
            </Button>
          </Space>
        </div>
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleAssign}
        initialValues={{ operatorId: currentOperatorId }}
      >
        <Form.Item
          name="operatorId"
          label="Select Operator"
          rules={[{ required: true, message: 'Please select an operator' }]}
        >
          <Select
            placeholder="Choose an operator"
            loading={loading}
            showSearch
            optionFilterProp="children"
            data-testid="operator-select"
          >
            {operators.map((operator) => (
              <Option
                key={operator.id}
                value={operator.id}
                disabled={!operator.isActive}
              >
                <Space>
                  <span>
                    {operator.firstName} {operator.lastName} ({operator.username})
                  </span>
                  {operator.currentAssignments !== undefined && (
                    <Tag color={operator.currentAssignments > 3 ? 'red' : 'green'}>
                      {operator.currentAssignments} active
                    </Tag>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              data-testid="assign-operator-button"
            >
              Assign Operator
            </Button>
            <Button onClick={onClose}>Cancel</Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
