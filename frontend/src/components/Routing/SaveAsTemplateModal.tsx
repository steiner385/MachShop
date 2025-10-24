/**
 * Save as Template Modal Component
 * Sprint 4: Routing Management UI
 *
 * Modal for saving a routing as a reusable template
 */

import React, { useState } from 'react';
import { Modal, Form, Input, Select, message, Switch } from 'antd';
import { useSite } from '@/contexts/SiteContext';
import { useAuthStore } from '@/store/AuthStore';
import routingTemplateApi, { CreateTemplateRequest } from '@/api/routingTemplates';

const { Option } = Select;
const { TextArea } = Input;

interface SaveAsTemplateModalProps {
  visible: boolean;
  routingId: string;
  routingNumber: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SaveAsTemplateModal: React.FC<SaveAsTemplateModalProps> = ({
  visible,
  routingId,
  routingNumber,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { currentSite } = useSite();
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (!currentSite || !user) {
        message.error('Site or user information not available');
        return;
      }

      setLoading(true);

      const templateData: CreateTemplateRequest = {
        name: values.name,
        description: values.description,
        category: values.category,
        tags: values.tags || [],
        isPublic: values.isPublic || false,
        sourceRoutingId: routingId,
        siteId: currentSite.id,
        createdById: user.id,
      };

      await routingTemplateApi.createTemplate(templateData);

      message.success('Template created successfully!');
      form.resetFields();
      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error('Failed to create template:', error);
      if (error.errorFields) {
        // Validation errors from form
        return;
      }
      message.error(error.message || 'Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title="Save as Template"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Save"
      cancelText="Cancel"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: `${routingNumber} Template`,
          isPublic: false,
        }}
      >
        <Form.Item
          name="name"
          label="Template Name"
          rules={[
            { required: true, message: 'Please enter a template name' },
            { min: 3, message: 'Name must be at least 3 characters' },
          ]}
        >
          <Input placeholder="Enter template name" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { max: 500, message: 'Description must be less than 500 characters' },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Describe this template and when it should be used..."
          />
        </Form.Item>

        <Form.Item
          name="category"
          label="Category"
          rules={[{ required: false }]}
        >
          <Select placeholder="Select a category (optional)">
            <Option value="MACHINING">Machining</Option>
            <Option value="ASSEMBLY">Assembly</Option>
            <Option value="INSPECTION">Inspection</Option>
            <Option value="FINISHING">Finishing</Option>
            <Option value="PACKAGING">Packaging</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="tags"
          label="Tags"
          tooltip="Add tags to make this template easier to find"
        >
          <Select
            mode="tags"
            placeholder="Add tags (press Enter to add)"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="isPublic"
          label="Make Public"
          valuePropName="checked"
          tooltip="Public templates can be used by other sites"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SaveAsTemplateModal;
