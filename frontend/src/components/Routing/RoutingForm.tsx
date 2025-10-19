/**
 * Routing Form Component
 * Sprint 4: Routing Management UI
 *
 * Form for creating and editing routings
 */

import React, { useEffect, useState } from 'react';
import {
  Form,
  Input,
  Button,
  Select,
  Card,
  Space,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Typography,
  Divider,
} from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ControlOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoutingStore } from '@/store/routingStore';
import { useSite } from '@/contexts/SiteContext';
import {
  CreateRoutingRequest,
  UpdateRoutingRequest,
  RoutingLifecycleState,
} from '@/types/routing';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

interface RoutingFormProps {
  mode: 'create' | 'edit';
}

/**
 * Routing Form Component
 *
 * Handles creating and editing routings with validation
 */
export const RoutingForm: React.FC<RoutingFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { currentSite, allSites } = useSite();

  const {
    currentRouting,
    isLoadingDetail,
    detailError,
    fetchRoutingById,
    createRouting,
    updateRouting,
  } = useRoutingStore();

  // Load routing if in edit mode
  useEffect(() => {
    if (mode === 'edit' && id) {
      fetchRoutingById(id);
    }
  }, [mode, id, fetchRoutingById]);

  // Populate form when routing loads
  useEffect(() => {
    if (mode === 'edit' && currentRouting) {
      form.setFieldsValue({
        routingNumber: currentRouting.routingNumber,
        partId: currentRouting.partId,
        siteId: currentRouting.siteId,
        version: currentRouting.version,
        description: currentRouting.description,
        isPrimaryRoute: currentRouting.isPrimaryRoute,
        isActive: currentRouting.isActive,
        effectiveDate: currentRouting.effectiveDate,
        expirationDate: currentRouting.expirationDate,
        notes: currentRouting.notes,
      });
    } else if (mode === 'create') {
      // Set default site to current site
      if (currentSite) {
        form.setFieldValue('siteId', currentSite.id);
      }
      // Set default version
      form.setFieldValue('version', '1.0');
      form.setFieldValue('isPrimaryRoute', true);
      form.setFieldValue('isActive', true);
    }
  }, [mode, currentRouting, currentSite, form]);

  // Handle form submission
  const handleSubmit = async (values: any, lifecycleState: RoutingLifecycleState) => {
    try {
      setSubmitting(true);

      const formData: CreateRoutingRequest | UpdateRoutingRequest = {
        ...values,
        lifecycleState,
      };

      if (mode === 'create') {
        // Create new routing
        const result = await createRouting(formData as CreateRoutingRequest);
        message.success('Routing created successfully');

        // Navigate to detail page if we have the created routing
        if (result && result.id) {
          navigate(`/routings/${result.id}`);
        } else {
          navigate('/routings');
        }
      } else if (mode === 'edit' && id) {
        // Update existing routing
        await updateRouting(id, formData as UpdateRoutingRequest);
        message.success('Routing updated successfully');
        navigate(`/routings/${id}`);
      }
    } catch (error: any) {
      message.error(error.message || 'Failed to save routing');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle save as draft
  const handleSaveDraft = () => {
    form.validateFields().then((values) => {
      handleSubmit(values, RoutingLifecycleState.DRAFT);
    });
  };

  // Handle create and release
  const handleCreateAndRelease = () => {
    form.validateFields().then((values) => {
      handleSubmit(values, RoutingLifecycleState.RELEASED);
    });
  };

  // Handle back button
  const handleBack = () => {
    navigate('/routings');
  };

  // Loading state
  if (mode === 'edit' && isLoadingDetail) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Loading routing...</div>
      </div>
    );
  }

  // Error state
  if (mode === 'edit' && detailError) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Error Loading Routing"
          description={detailError}
          type="error"
          showIcon
        />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          style={{ marginTop: '16px' }}
        >
          Back to List
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
            Back
          </Button>
        </Space>
        <Title level={2} style={{ marginTop: '16px', marginBottom: '8px' }}>
          <ControlOutlined style={{ marginRight: '8px' }} />
          {mode === 'create' ? 'Create New Routing' : 'Edit Routing'}
        </Title>
        <Text type="secondary">
          {mode === 'create'
            ? 'Define a new manufacturing routing for a part at a specific site'
            : 'Update routing information and settings'}
        </Text>
      </div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={() => handleSaveDraft()}
          requiredMark="optional"
        >
          {/* Basic Information Section */}
          <Title level={4}>Basic Information</Title>
          <Divider />

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="routingNumber"
                label="Routing Number"
                rules={[
                  { required: true, message: 'Routing number is required' },
                  { pattern: /^[A-Z0-9-]+$/, message: 'Use uppercase letters, numbers, and hyphens only' },
                ]}
                tooltip="Unique identifier for this routing (e.g., RT-001)"
              >
                <Input placeholder="RT-001" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="version"
                label="Version"
                rules={[{ required: true, message: 'Version is required' }]}
                tooltip="Version number for this routing (e.g., 1.0, 1.1)"
              >
                <Input placeholder="1.0" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="partId"
                label="Part"
                rules={[{ required: true, message: 'Part is required' }]}
                tooltip="Select the part this routing is for"
              >
                <Select
                  showSearch
                  placeholder="Select a part"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {/* TODO: Load parts from API */}
                  <Option value="part-1">Part 001 - Sample Part A</Option>
                  <Option value="part-2">Part 002 - Sample Part B</Option>
                  <Option value="part-3">Part 003 - Sample Part C</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="siteId"
                label="Site"
                rules={[{ required: true, message: 'Site is required' }]}
                tooltip="Select the manufacturing site for this routing"
              >
                <Select placeholder="Select a site">
                  {allSites.map((site) => (
                    <Option key={site.id} value={site.id}>
                      {site.siteName} ({site.siteCode})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            tooltip="Brief description of this routing"
          >
            <TextArea
              rows={3}
              placeholder="Enter a description for this routing"
              maxLength={500}
              showCount
            />
          </Form.Item>

          {/* Settings Section */}
          <Title level={4} style={{ marginTop: '32px' }}>Settings</Title>
          <Divider />

          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="isPrimaryRoute"
                label="Primary Route"
                valuePropName="checked"
                tooltip="Is this the primary/preferred routing for this part?"
              >
                <Select>
                  <Option value={true}>Yes - Primary Route</Option>
                  <Option value={false}>No - Alternate Route</Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} sm={8}>
              <Form.Item
                name="isActive"
                label="Active Status"
                valuePropName="checked"
                tooltip="Is this routing currently active and usable?"
              >
                <Select>
                  <Option value={true}>Active</Option>
                  <Option value={false}>Inactive</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="effectiveDate"
                label="Effective Date"
                tooltip="Date when this routing becomes effective"
              >
                <Input type="date" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="expirationDate"
                label="Expiration Date"
                tooltip="Date when this routing expires (optional)"
              >
                <Input type="date" />
              </Form.Item>
            </Col>
          </Row>

          {/* Notes Section */}
          <Title level={4} style={{ marginTop: '32px' }}>Additional Notes</Title>
          <Divider />

          <Form.Item
            name="notes"
            label="Notes"
            tooltip="Any additional notes or comments"
          >
            <TextArea
              rows={4}
              placeholder="Enter any additional notes"
              maxLength={1000}
              showCount
            />
          </Form.Item>

          {/* Form Actions */}
          <Divider />
          <Form.Item style={{ marginBottom: 0 }}>
            <Space size="middle">
              <Button
                type="default"
                size="large"
                icon={<SaveOutlined />}
                onClick={handleSaveDraft}
                loading={submitting}
              >
                Save as Draft
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleCreateAndRelease}
                loading={submitting}
              >
                {mode === 'create' ? 'Create & Release' : 'Update & Release'}
              </Button>
              <Button size="large" onClick={handleBack} disabled={submitting}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {/* Help Text */}
      <Alert
        message="Routing Information"
        description="After creating the routing, you can add manufacturing steps, define dependencies, and configure timing. The routing must be in DRAFT or REVIEW state to be edited."
        type="info"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default RoutingForm;
