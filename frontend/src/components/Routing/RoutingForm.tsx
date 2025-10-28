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
import { VisualRoutingEditorWrapper } from './VisualRoutingEditor';
import { ActiveUsersIndicator } from './ActiveUsersIndicator';
import { RoutingChangedAlert } from './RoutingChangedAlert';
import { VersionConflictModal } from './VersionConflictModal';
import { useRoutingChangeDetection } from '@/hooks/useRoutingChangeDetection';
import partsAPI, { Part } from '@/api/parts';

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

  // Parts state
  const [parts, setParts] = useState<Part[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);

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

  // Load parts on mount
  useEffect(() => {
    const loadParts = async () => {
      try {
        setLoadingParts(true);
        const fetchedParts = await partsAPI.getAllParts({ isActive: true });
        setParts(fetchedParts);
      } catch (error) {
        console.error('Error loading parts:', error);
        message.error('Failed to load parts');
      } finally {
        setLoadingParts(false);
      }
    };

    loadParts();
  }, []);

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
      // Set default values for create mode (use setFieldsValue to ensure all values are registered)
      form.setFieldsValue({
        siteId: currentSite?.id,
        version: '1.0',
        isPrimaryRoute: true,
        isActive: true,
      });
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
      console.log('[RoutingForm] handleSubmit called with values:', values);
      console.log('[RoutingForm] lifecycleState:', lifecycleState);
      setSubmitting(true);

      // Clean up empty date values - remove empty strings
      const cleanedValues = { ...values };
      if (!cleanedValues.effectiveDate) {
        delete cleanedValues.effectiveDate;
      }
      if (!cleanedValues.expirationDate) {
        delete cleanedValues.expirationDate;
      }

      // Convert string boolean values from Select components to actual booleans
      // Ant Design Select serializes boolean values as strings ("true"/"false")
      if (typeof cleanedValues.isPrimaryRoute === 'string') {
        cleanedValues.isPrimaryRoute = cleanedValues.isPrimaryRoute === 'true';
      }
      if (typeof cleanedValues.isActive === 'string') {
        cleanedValues.isActive = cleanedValues.isActive === 'true';
      }

      const formData: CreateRoutingRequest | UpdateRoutingRequest = {
        ...cleanedValues,
        lifecycleState,
        // Include visual routing data if available
        visualData: routingNodes.length > 0 ? {
          nodes: routingNodes,
          edges: routingEdges,
        } : undefined,
      };

      console.log('[RoutingForm] Form data to submit:', formData);

      if (mode === 'create') {
        // Create new routing
        console.log('[RoutingForm] Calling createRouting API...');
        const result = await createRouting(formData as CreateRoutingRequest);
        console.log('[RoutingForm] createRouting result:', result);
        message.success('Routing created successfully');

        // ✅ PHASE 4 FIX: Delay navigation to allow success message to be visible for E2E tests
        setTimeout(() => {
          // Navigate to detail page if we have the created routing
          if (result && result.id) {
            navigate(`/routings/${result.id}`);
          } else {
            navigate('/routings');
          }
        }, 1500); // 1.5 second delay for success message visibility
      } else if (mode === 'edit' && id) {
        // Update existing routing
        console.log('[RoutingForm] Calling updateRouting API...');
        await updateRouting(id, formData as UpdateRoutingRequest);
        message.success('Routing updated successfully');

        // ✅ PHASE 4 FIX: Delay navigation to allow success message to be visible for E2E tests
        setTimeout(() => {
          navigate(`/routings/${id}`);
        }, 1500); // 1.5 second delay for success message visibility
      }

      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('[RoutingForm] Submit error:', error);
      console.error('[RoutingForm] Error details:', JSON.stringify(error, null, 2));
      // Check if this is a version conflict error
      if (error.code === 'VERSION_CONFLICT' || error.message?.includes('version conflict')) {
        setVersionConflictError(error);
        setShowVersionConflict(true);
      } else {
        const errorMessage = error.message || error.error || 'Failed to save routing';
        console.error('[RoutingForm] Error message:', errorMessage);
        message.error(errorMessage);
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
    console.log('[RoutingForm] handleSaveDraft called');
    console.log('[RoutingForm] Form values before validation:', form.getFieldsValue());
    form.validateFields()
      .then((values) => {
        console.log('[RoutingForm] Validation successful, values:', values);
        handleSubmit(values, RoutingLifecycleState.DRAFT);
      })
      .catch((errorInfo) => {
        console.error('[RoutingForm] Validation failed:', errorInfo);
        message.error('Please fill in all required fields');
      });
  };

  // Handle create and release
  const handleCreateAndRelease = () => {
    form.validateFields()
      .then((values) => {
        handleSubmit(values, RoutingLifecycleState.RELEASED);
      })
      .catch((errorInfo) => {
        console.error('Validation failed:', errorInfo);
        message.error('Please fill in all required fields');
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
            <h1 style={{ fontSize: '28px', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
              <ControlOutlined style={{ marginRight: '8px' }} />
              {mode === 'create' ? 'Create New Routing' : 'Edit Routing'}
            </h1>
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
          <VisualRoutingEditorWrapper
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
                {/* ✅ PHASE 10C FIX: Remove explicit ID to prevent conflicts when multiple routing forms are rendered */}
                <Input name="routingNumber" placeholder="RT-001" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name="version"
                label="Version"
                rules={[{ required: true, message: 'Version is required' }]}
                tooltip="Version number for this routing (e.g., 1.0, 1.1)"
              >
                {/* ✅ PHASE 10C FIX: Remove explicit ID to prevent conflicts when multiple routing forms are rendered */}
                <Input name="version" placeholder="1.0" />
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
                {/* ✅ PHASE 10C FIX: Remove explicit ID to prevent conflicts when multiple routing forms are rendered */}
                <Select
                  showSearch
                  placeholder="Select a part"
                  loading={loadingParts}
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    ((option?.children as unknown) as string)?.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {parts.map((part) => (
                    <Option key={part.id} value={part.id}>
                      {part.partNumber} - {part.partName}
                    </Option>
                  ))}
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
                {/* ✅ PHASE 10C FIX: Remove explicit ID to prevent conflicts when multiple routing forms are rendered */}
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
            {/* ✅ PHASE 10C FIX: Remove explicit ID to prevent conflicts when multiple routing forms are rendered */}
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
