/**
 * Connection Editor Component
 * Phase 2: Visual + Tabular UI
 *
 * Modal for editing routing step dependencies/connections
 * Supports dependency types (FS, SS, FF, SF) and timing offsets
 */

import React, { useEffect } from 'react';
import { Modal, Form, Select, InputNumber, Input, Space, Alert, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Edge } from 'reactflow';

const { Option } = Select;
const { TextArea } = Input;

/**
 * Dependency types (Project Management/ISA-95 standard)
 */
export type DependencyType =
  | 'FINISH_TO_START'   // Most common: Successor starts after predecessor finishes
  | 'START_TO_START'    // Successor starts when predecessor starts
  | 'FINISH_TO_FINISH'  // Successor finishes when predecessor finishes
  | 'START_TO_FINISH';  // Successor finishes when predecessor starts (rare)

/**
 * Connection data structure
 */
export interface ConnectionData {
  dependencyType: DependencyType;
  lagTime?: number;        // Positive = delay, Negative = lead/overlap
  description?: string;
  isOptional?: boolean;
  isCriticalPath?: boolean;
}

interface ConnectionEditorProps {
  visible: boolean;
  connection: Edge | null;
  onSave: (connectionId: string, data: ConnectionData) => void;
  onCancel: () => void;
}

/**
 * Dependency type descriptions
 */
const DEPENDENCY_DESCRIPTIONS: Record<DependencyType, string> = {
  FINISH_TO_START: 'Successor operation starts after predecessor finishes (most common)',
  START_TO_START: 'Successor operation starts at the same time as predecessor',
  FINISH_TO_FINISH: 'Successor operation finishes at the same time as predecessor',
  START_TO_FINISH: 'Successor operation finishes when predecessor starts (rare)',
};

/**
 * Dependency type examples
 */
const DEPENDENCY_EXAMPLES: Record<DependencyType, string> = {
  FINISH_TO_START: 'Example: Complete welding → Start painting',
  START_TO_START: 'Example: Start foundation → Start framing (can overlap)',
  FINISH_TO_FINISH: 'Example: Finish testing → Finish documentation (coordinated)',
  START_TO_FINISH: 'Example: Start new shift → Finish old shift (handoff)',
};

/**
 * Connection Editor Component
 */
export const ConnectionEditor: React.FC<ConnectionEditorProps> = ({
  visible,
  connection,
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm<ConnectionData>();

  /**
   * Initialize form with connection data
   */
  useEffect(() => {
    if (visible && connection) {
      const data = connection.data as ConnectionData | undefined;
      form.setFieldsValue({
        dependencyType: data?.dependencyType || 'FINISH_TO_START',
        lagTime: data?.lagTime || 0,
        description: data?.description || '',
        isOptional: data?.isOptional || false,
        isCriticalPath: data?.isCriticalPath || false,
      });
    }
  }, [visible, connection, form]);

  /**
   * Handle save
   */
  const handleSave = async () => {
    if (!connection) return;

    try {
      const values = await form.validateFields();
      onSave(connection.id, values);
      form.resetFields();
    } catch (error) {
      // Validation failed
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  const selectedType = Form.useWatch('dependencyType', form) || 'FINISH_TO_START';
  const lagTime = Form.useWatch('lagTime', form) || 0;

  return (
    <Modal
      title="Edit Connection Properties"
      open={visible}
      onOk={handleSave}
      onCancel={handleCancel}
      width={600}
      okText="Save"
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          dependencyType: 'FINISH_TO_START',
          lagTime: 0,
          isOptional: false,
          isCriticalPath: false,
        }}
      >
        {/* Connection Info */}
        {connection && (
          <Alert
            message="Connection Details"
            description={
              <div style={{ fontSize: '12px' }}>
                <div>
                  <strong>From:</strong> Step {connection.source}
                </div>
                <div>
                  <strong>To:</strong> Step {connection.target}
                </div>
              </div>
            }
            type="info"
            style={{ marginBottom: '16px' }}
            showIcon
          />
        )}

        {/* Dependency Type */}
        <Form.Item
          label={
            <Space>
              <span>Dependency Type</span>
              <Tooltip title="Defines the relationship between predecessor and successor operations">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          name="dependencyType"
          rules={[{ required: true, message: 'Please select a dependency type' }]}
        >
          <Select size="large">
            <Option value="FINISH_TO_START">
              <strong>Finish-to-Start (FS)</strong> - Most Common
            </Option>
            <Option value="START_TO_START">
              <strong>Start-to-Start (SS)</strong> - Parallel Operations
            </Option>
            <Option value="FINISH_TO_FINISH">
              <strong>Finish-to-Finish (FF)</strong> - Coordinated Completion
            </Option>
            <Option value="START_TO_FINISH">
              <strong>Start-to-Finish (SF)</strong> - Rare/Handoff
            </Option>
          </Select>
        </Form.Item>

        {/* Description for selected type */}
        <Alert
          message={DEPENDENCY_DESCRIPTIONS[selectedType]}
          description={DEPENDENCY_EXAMPLES[selectedType]}
          type="info"
          style={{ marginBottom: '16px', fontSize: '12px' }}
        />

        {/* Lag/Lead Time */}
        <Form.Item
          label={
            <Space>
              <span>Lag/Lead Time (minutes)</span>
              <Tooltip title="Positive = Delay (wait time), Negative = Lead (overlap/advance start)">
                <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
              </Tooltip>
            </Space>
          }
          name="lagTime"
        >
          <InputNumber
            style={{ width: '100%' }}
            min={-9999}
            max={9999}
            step={5}
            placeholder="0 = No delay or lead"
          />
        </Form.Item>

        {/* Lag Time Explanation */}
        {lagTime !== 0 && (
          <Alert
            message={
              lagTime > 0
                ? `⏱️ Lag: ${lagTime} minute delay after predecessor completes`
                : `⚡ Lead: Successor can start ${Math.abs(lagTime)} minutes BEFORE predecessor finishes`
            }
            type={lagTime > 0 ? 'warning' : 'success'}
            style={{ marginBottom: '16px', fontSize: '12px' }}
          />
        )}

        {/* Description/Notes */}
        <Form.Item
          label="Description / Notes"
          name="description"
        >
          <TextArea
            rows={3}
            placeholder="Optional notes about this connection (e.g., 'Wait for paint to dry')"
            maxLength={500}
            showCount
          />
        </Form.Item>

        {/* Advanced Options */}
        <Form.Item
          label="Connection Type"
          style={{ marginBottom: '8px' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item
              name="isOptional"
              valuePropName="checked"
              style={{ marginBottom: '8px' }}
            >
              <label>
                <input type="checkbox" style={{ marginRight: '8px' }} />
                <span>Optional Connection (can be skipped)</span>
              </label>
            </Form.Item>

            <Form.Item
              name="isCriticalPath"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <label>
                <input type="checkbox" style={{ marginRight: '8px' }} />
                <span style={{ color: '#f5222d', fontWeight: 500 }}>
                  Critical Path (must complete on time)
                </span>
              </label>
            </Form.Item>
          </Space>
        </Form.Item>

        {/* Help Text */}
        <Alert
          message="Dependency Type Guide"
          description={
            <div style={{ fontSize: '11px', lineHeight: '1.6' }}>
              <div style={{ marginBottom: '8px' }}>
                <strong>Finish-to-Start (FS):</strong> Most common. Used for sequential operations
                where one must complete before the next begins.
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Start-to-Start (SS):</strong> Used when operations can run in parallel but
                must start together (e.g., assembly line stations).
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Finish-to-Finish (FF):</strong> Operations must finish together
                (e.g., coordinated quality checks).
              </div>
              <div>
                <strong>Start-to-Finish (SF):</strong> Rarely used. Typically for shift handoffs or
                resource transitions.
              </div>
            </div>
          }
          type="info"
          style={{ marginTop: '16px', fontSize: '11px' }}
          showIcon
        />
      </Form>
    </Modal>
  );
};

export default ConnectionEditor;
