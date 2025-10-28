/**
 * LayoutPreferenceModal (Placeholder)
 *
 * GitHub Issue #19: Configurable Side-by-Side Execution Interface
 */

import React from 'react';
import { Modal, Form, Select, Slider, Switch, Button, Space } from 'antd';
import { LayoutMode, PanelPosition } from '@/store/executionLayoutStore';

interface LayoutPreferenceModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (preferences: any) => void;
}

export const LayoutPreferenceModal: React.FC<LayoutPreferenceModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  const [form] = Form.useForm();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  return (
    <Modal
      title="Layout Preferences"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button key="save" type="primary" onClick={handleSave}>
          Save Preferences
        </Button>,
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          layoutMode: LayoutMode.SPLIT_VERTICAL,
          splitRatio: 0.6,
          panelPosition: PanelPosition.LEFT,
          autoAdvanceSteps: false,
          showStepTimer: true,
          compactMode: false,
        }}
      >
        <Form.Item label="Default Layout Mode" name="layoutMode">
          <Select>
            <Select.Option value={LayoutMode.SPLIT_VERTICAL}>Split Vertical</Select.Option>
            <Select.Option value={LayoutMode.SPLIT_HORIZONTAL}>Split Horizontal</Select.Option>
            <Select.Option value={LayoutMode.TABBED}>Tabbed</Select.Option>
            <Select.Option value={LayoutMode.OVERLAY}>Overlay</Select.Option>
            <Select.Option value={LayoutMode.PICTURE_IN_PICTURE}>Picture-in-Picture</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item label="Split Ratio" name="splitRatio">
          <Slider
            min={0.1}
            max={0.9}
            step={0.1}
            marks={{
              0.1: '10%',
              0.5: '50%',
              0.9: '90%',
            }}
          />
        </Form.Item>

        <Form.Item label="Auto-advance Steps" name="autoAdvanceSteps" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item label="Show Step Timer" name="showStepTimer" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item label="Compact Mode" name="compactMode" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LayoutPreferenceModal;