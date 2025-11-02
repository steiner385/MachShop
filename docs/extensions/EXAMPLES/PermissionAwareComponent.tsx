/**
 * PermissionAwareComponent - Permission-based rendering example
 *
 * This example demonstrates:
 * - Permission checking with usePermissions hook
 * - Graceful degradation when permissions are missing
 * - Role-based feature gating
 * - Permission-aware UI rendering
 * - Multiple permission levels (read, write, delete)
 * - Conditional feature display
 *
 * @example
 * <PermissionAwareComponent
 *   resourceId="123"
 *   resourceType="inventory"
 * />
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Button,
  Space,
  Alert,
  Tooltip,
  Modal,
  Form,
  Input,
  message
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  LockOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { usePermissions } from '@/hooks/usePermissions';
import styles from './PermissionAwareComponent.module.css';

/**
 * Props interface
 */
export interface PermissionAwareComponentProps {
  /** Resource ID to manage */
  resourceId: string;

  /** Type of resource (e.g., 'inventory', 'production', 'quality') */
  resourceType: string;

  /** Callback when resource is updated */
  onUpdate?: (id: string, data: any) => Promise<void>;

  /** Callback when resource is deleted */
  onDelete?: (id: string) => Promise<void>;
}

/**
 * PermissionAwareComponent
 *
 * Demonstrates how to build components that adapt based on user permissions.
 * Features are shown/hidden or enabled/disabled based on permission levels.
 */
export const PermissionAwareComponent: React.FC<PermissionAwareComponentProps> = ({
  resourceId,
  resourceType,
  onUpdate,
  onDelete,
}) => {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermissions();
  const [form] = Form.useForm();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Define permission strings based on resource type
  const readPermission = `${resourceType}:read`;
  const writePermission = `${resourceType}:write`;
  const deletePermission = `${resourceType}:delete`;
  const adminPermission = `${resourceType}:admin`;

  // Check various permission combinations
  const canView = hasPermission(readPermission);
  const canEdit = hasPermission(writePermission);
  const canDelete = hasPermission(deletePermission);
  const isAdmin = hasPermission(adminPermission);

  // Check if user has any write access
  const hasWriteAccess = hasAnyPermission([writePermission, adminPermission]);

  // Check if user has full access (all permissions)
  const hasFullAccess = hasAllPermissions([
    readPermission,
    writePermission,
    deletePermission
  ]);

  /**
   * Handle edit button click
   */
  const handleEdit = useCallback(() => {
    if (!canEdit && !isAdmin) {
      message.warning('You do not have permission to edit this resource');
      return;
    }

    setEditModalVisible(true);
  }, [canEdit, isAdmin]);

  /**
   * Handle form submission
   */
  const handleUpdate = useCallback(async (values: any) => {
    if (!canEdit && !isAdmin) {
      message.error('Insufficient permissions');
      return;
    }

    try {
      setLoading(true);

      if (onUpdate) {
        await onUpdate(resourceId, values);
      }

      message.success('Resource updated successfully');
      setEditModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Update error:', error);
      message.error('Failed to update resource');
    } finally {
      setLoading(false);
    }
  }, [resourceId, canEdit, isAdmin, onUpdate, form]);

  /**
   * Handle delete confirmation
   */
  const handleDelete = useCallback(async () => {
    if (!canDelete && !isAdmin) {
      message.error('Insufficient permissions');
      return;
    }

    try {
      setLoading(true);

      if (onDelete) {
        await onDelete(resourceId);
      }

      message.success('Resource deleted successfully');
      setDeleteModalVisible(false);
    } catch (error) {
      console.error('Delete error:', error);
      message.error('Failed to delete resource');
    } finally {
      setLoading(false);
    }
  }, [resourceId, canDelete, isAdmin, onDelete]);

  // No read permission - show access denied
  if (!canView) {
    return (
      <Card className={styles.container}>
        <Alert
          type="warning"
          message="Access Denied"
          description={
            <>
              <LockOutlined style={{ marginRight: '8px' }} />
              You don't have permission to view this {resourceType} resource.
              Please contact your administrator if you believe this is an error.
            </>
          }
          showIcon
        />
      </Card>
    );
  }

  // Read-only view (has view permission but not edit/delete)
  if (!hasWriteAccess) {
    return (
      <Card
        className={styles.container}
        title={
          <Space>
            <EyeOutlined />
            {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} (Read-Only)
          </Space>
        }
      >
        <Alert
          type="info"
          message="Read-Only Access"
          description="You have view-only access to this resource."
          showIcon
          style={{ marginBottom: '16px' }}
        />

        {/* Resource content here */}
        <div className={styles.content}>
          <p>Resource ID: {resourceId}</p>
          <p>You can view this resource but cannot make changes.</p>
        </div>

        {/* Disabled action buttons with tooltips explaining why */}
        <Space className={styles.actions}>
          <Tooltip title="You need edit permissions to modify this resource">
            <Button
              icon={<EditOutlined />}
              disabled
            >
              Edit
            </Button>
          </Tooltip>

          <Tooltip title="You need delete permissions to remove this resource">
            <Button
              icon={<DeleteOutlined />}
              danger
              disabled
            >
              Delete
            </Button>
          </Tooltip>
        </Space>
      </Card>
    );
  }

  // Full access view (has write/admin permissions)
  return (
    <Card
      className={styles.container}
      title={`${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} Resource`}
      extra={
        hasFullAccess && (
          <Alert
            message="Full Access"
            type="success"
            showIcon
            banner
            style={{ padding: '4px 12px' }}
          />
        )
      }
    >
      {/* Resource content */}
      <div className={styles.content}>
        <p>Resource ID: {resourceId}</p>
        <p>Resource Type: {resourceType}</p>

        {isAdmin && (
          <Alert
            type="info"
            message="Administrator Access"
            description="You have full administrative access to this resource."
            showIcon
            style={{ marginTop: '16px' }}
          />
        )}
      </div>

      {/* Action buttons based on permissions */}
      <Space className={styles.actions} style={{ marginTop: '16px' }}>
        {/* Edit button - shown if user can edit or is admin */}
        {(canEdit || isAdmin) && (
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={handleEdit}
          >
            Edit
          </Button>
        )}

        {/* Delete button - shown if user can delete or is admin */}
        {(canDelete || isAdmin) && (
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => setDeleteModalVisible(true)}
          >
            Delete
          </Button>
        )}

        {/* If no write permissions but has read, show disabled buttons */}
        {!canEdit && !isAdmin && (
          <Tooltip title="Insufficient permissions">
            <Button icon={<EditOutlined />} disabled>
              Edit
            </Button>
          </Tooltip>
        )}
      </Space>

      {/* Edit Modal */}
      <Modal
        title="Edit Resource"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdate}
        >
          <Form.Item
            label="Resource Name"
            name="name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="Enter resource name" />
          </Form.Item>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              rows={4}
              placeholder="Enter description"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
              >
                Save Changes
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Confirm Delete"
        open={deleteModalVisible}
        onOk={handleDelete}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Delete"
        okButtonProps={{ danger: true, loading }}
        cancelText="Cancel"
      >
        <Alert
          type="warning"
          message="Warning"
          description={`Are you sure you want to delete this ${resourceType} resource? This action cannot be undone.`}
          showIcon
        />
      </Modal>
    </Card>
  );
};

PermissionAwareComponent.displayName = 'PermissionAwareComponent';

export default PermissionAwareComponent;
