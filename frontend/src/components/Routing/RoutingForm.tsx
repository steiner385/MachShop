/**
 * Routing Form Component
 * Phase 2: Visual + Tabular UI
 *
 * Enhanced form for creating and editing routings with support for both
 * visual (ReactFlow) and tabular (form-based) editing modes
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
  Segmented,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ControlOutlined,
  AppstoreOutlined,
  TableOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { Node, Edge } from 'reactflow';
import { useRoutingStore } from '@/store/routingStore';
import { useSite } from '@/contexts/SiteContext';
import {
  CreateRoutingRequest,
  UpdateRoutingRequest,
  RoutingLifecycleState,
} from '@/types/routing';
import { VisualRoutingEditor } from './VisualRoutingEditor';
import { ActiveUsersIndicator } from './ActiveUsersIndicator';
import { RoutingChangedAlert } from './RoutingChangedAlert';
import { VersionConflictModal } from './VersionConflictModal';
import { useRoutingChangeDetection } from '@/hooks/useRoutingChangeDetection';

const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

type EditorMode = 'form' | 'visual';

interface RoutingFormProps {
  mode: 'create' | 'edit';
}

/**
 * Routing Form Component
 *
 * Handles creating and editing routings with validation
 * Supports both form-based (tabular) and visual (ReactFlow) editing modes
 */
export const RoutingForm: React.FC<RoutingFormProps> = ({ mode }) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  // Editor mode state
  const [editorMode, setEditorMode] = useState<EditorMode>('form');

  // Visual routing state
  const [routingNodes, setRoutingNodes] = useState<Node[]>([]);
  const [routingEdges, setRoutingEdges] = useState<Edge[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Collaboration state
  const [showVersionConflict, setShowVersionConflict] = useState(false);
  const [versionConflictError, setVersionConflictError] = useState<any>(null);

  const { currentSite, allSites } = useSite();

  const {
    currentRouting,
    isLoadingDetail,
    detailError,
    fetchRoutingById,
    createRouting,
    updateRouting,
  } = useRoutingStore();

  // Routing change detection for collaboration
  const {
    hasChanges: _hasChanges,
    changeInfo,
    dismissChange,
    checkNow: _checkNow,
  } = useRoutingChangeDetection({
    routingId: id || '',
    currentVersion: currentRouting?.version || '1.0',
    enabled: mode === 'edit' && !!id,
    pollInterval: 10000, // Check every 10 seconds
  });

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

  // Handle visual routing changes
  // const handleNodesChange = (nodes: Node[]) => {
  //   setRoutingNodes(nodes);
  //   setHasUnsavedChanges(true);
  // };

  // const handleEdgesChange = (edges: Edge[]) => {
  //   setRoutingEdges(edges);
  //   setHasUnsavedChanges(true);
  // };

  const handleVisualSave = async (nodes: Node[], edges: Edge[]): Promise<void> => {
    setRoutingNodes(nodes);
    setRoutingEdges(edges);
    setHasUnsavedChanges(false);
    message.success('Visual routing saved');
  };

  // Handle form submission
  const handleSubmit = async (values: any, lifecycleState: RoutingLifecycleState) => {
    try {
      setSubmitting(true);

      const formData: CreateRoutingRequest | UpdateRoutingRequest = {
        ...values,
        lifecycleState,
        // Include visual routing data if available
        visualData: routingNodes.length > 0 ? {
          nodes: routingNodes,
          edges: routingEdges,
        } : undefined,
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

      setHasUnsavedChanges(false);
    } catch (error: any) {
      // Check if this is a version conflict error
      if (error.code === 'VERSION_CONFLICT' || error.message?.includes('version conflict')) {
        setVersionConflictError(error);
        setShowVersionConflict(true);
      } else {
        message.error(error.message || 'Failed to save routing');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle reload after version conflict
  const handleReloadAfterConflict = () => {
    if (id) {
      fetchRoutingById(id);
      setHasUnsavedChanges(false);
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
    <div style={{ padding: '24px', maxWidth: editorMode === 'visual' ? '100%' : '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              Back
            </Button>
          </Space>

          {/* Active Users Indicator (for edit mode) */}
          {mode === 'edit' && id && (
            <ActiveUsersIndicator
              resourceType="routing"
              resourceId={id}
              action="editing"
              enabled={true}
              showDetails={false}
            />
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              <ControlOutlined style={{ marginRight: '8px' }} />
              {mode === 'create' ? 'Create New Routing' : 'Edit Routing'}
            </Title>
            <Text type="secondary">
              {mode === 'create'
                ? 'Define a new manufacturing routing for a part at a specific site'
                : 'Update routing information and settings'}
            </Text>
          </div>

          {/* Editor Mode Toggle */}
          <Space direction="vertical" align="end">
            <Segmented
              value={editorMode}
              onChange={(value) => setEditorMode(value as EditorMode)}
              options={[
                {
                  label: (
                    <Tooltip title="Form-based tabular editor">
                      <Space>
                        <TableOutlined />
                        <span>Form View</span>
                      </Space>
                    </Tooltip>
                  ),
                  value: 'form',
                } as any,
                {
                  label: (
                    <Tooltip title="Visual drag-and-drop editor">
                      <Space>
                        <AppstoreOutlined />
                        <span>Visual Editor</span>
                      </Space>
                    </Tooltip>
                  ),
                  value: 'visual',
                } as any,
              ]}
              size="large"
            />
            {hasUnsavedChanges && (
              <Text type="warning" style={{ fontSize: '12px' }}>
                <InfoCircleOutlined /> Unsaved changes in visual editor
              </Text>
            )}
          </Space>
        </div>
      </div>

      {/* Routing Changed Alert (when another user modifies) */}
      {_hasChanges && changeInfo && (
        <div style={{ marginBottom: '24px' }}>
          <RoutingChangedAlert
            changeInfo={changeInfo}
            onReload={handleReloadAfterConflict}
            onDismiss={dismissChange}
          />
        </div>
      )}

      {/* Version Conflict Modal */}
      {showVersionConflict && versionConflictError && (
        <VersionConflictModal
          visible={showVersionConflict}
          error={versionConflictError}
          localChanges={form.getFieldsValue()}
          onReload={handleReloadAfterConflict}
          onClose={() => setShowVersionConflict(false)}
        />
      )}

      {/* Visual Editor Mode */}
      {editorMode === 'visual' ? (
        <div style={{ height: 'calc(100vh - 200px)' }}>
          <VisualRoutingEditor
            routingId={id}
            onSave={handleVisualSave}
            readOnly={false}
          />
        </div>
      ) : (
        /* Form Editor Mode */
        <>
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
                    ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
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
        {editorMode === 'form' && (
          <Alert
            message="Routing Information"
            description={
              <div>
                <div style={{ marginBottom: '8px' }}>
                  Fill in the basic routing information above, then switch to <strong>Visual Editor</strong> mode to:
                </div>
                <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
                  <li>Add manufacturing steps with drag-and-drop</li>
                  <li>Define step dependencies and connections</li>
                  <li>Configure timing and control flow</li>
                  <li>Use advanced patterns (parallel operations, decision points, telescoping, etc.)</li>
                </ul>
                <div style={{ marginTop: '8px', color: '#8c8c8c', fontSize: '12px' }}>
                  Note: The routing must be in DRAFT or REVIEW state to be edited.
                </div>
              </div>
            }
            type="info"
            showIcon
            style={{ marginTop: '24px' }}
          />
        )}
      </>
      )}
    </div>
  );
};

export default RoutingForm;
