import React, { ComponentType, useState, useEffect } from 'react';
import { Button, Drawer, Tabs, Badge, FloatButton, Space, message } from 'antd';
import {
  MessageOutlined,
  HighlightOutlined,
  TeamOutlined,
  BellOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';

import { CollaborationPanel } from './CollaborationPanel';
import { NotificationCenter } from './NotificationCenter';
import { ActivityFeed } from './ActivityFeed';
import { ConflictResolution } from './ConflictResolution';
import { ReviewDashboard } from './ReviewDashboard';
import { useAuthStore } from '@/store/AuthStore';

export interface CollaborationConfig {
  documentType: string;
  documentIdKey?: string; // Key to extract document ID from props (default: 'id')
  documentTitleKey?: string; // Key to extract document title from props (default: 'title')
  enableComments?: boolean;
  enableAnnotations?: boolean;
  enableReviews?: boolean;
  enableNotifications?: boolean;
  enableActivityFeed?: boolean;
  enableConflictResolution?: boolean;
  mediaUrlKey?: string; // Key to extract media URL for annotations
  mediaTypeKey?: string; // Key to extract media type for annotations
  defaultTab?: 'comments' | 'annotations' | 'reviews' | 'activity' | 'notifications';
  floatingButton?: boolean; // Show floating action button
  drawerPlacement?: 'right' | 'left' | 'bottom';
  autoOpen?: boolean; // Auto-open collaboration panel
}

export interface WithCollaborationProps {
  collaborationConfig?: Partial<CollaborationConfig>;
}

/**
 * Higher-Order Component for adding collaboration features to existing document pages
 */
export function withCollaboration<P extends object>(
  WrappedComponent: ComponentType<P>,
  defaultConfig: CollaborationConfig
) {
  return function CollaborationEnhancedComponent(
    props: P & WithCollaborationProps
  ) {
    const { collaborationConfig = {}, ...restProps } = props;
    const config = { ...defaultConfig, ...collaborationConfig };

    // Auth state
    const { user } = useAuthStore();

    // Component state
    const [isCollaborationOpen, setIsCollaborationOpen] = useState(config.autoOpen || false);
    const [activeTab, setActiveTab] = useState(config.defaultTab || 'comments');
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    // Extract document information from props
    const documentId = (restProps as any)[config.documentIdKey || 'id'];
    const documentTitle = (restProps as any)[config.documentTitleKey || 'title'] || `${config.documentType} #${documentId}`;
    const mediaUrl = config.mediaUrlKey ? (restProps as any)[config.mediaUrlKey] : undefined;
    const mediaType = config.mediaTypeKey ? (restProps as any)[config.mediaTypeKey] : undefined;

    // Validate required props
    useEffect(() => {
      if (!documentId) {
        console.warn(`withCollaboration: Document ID not found using key '${config.documentIdKey || 'id'}'`);
      }
      if (!user?.id || !user?.name) {
        console.warn('withCollaboration: User information not available');
      }
    }, [documentId, user, config.documentIdKey]);

    // Don't render collaboration features if essential data is missing
    if (!documentId || !user?.id || !user?.name) {
      return <WrappedComponent {...(restProps as P)} />;
    }

    // Build tab items based on enabled features
    const tabItems = [];

    if (config.enableComments || config.enableAnnotations) {
      tabItems.push({
        key: 'collaboration',
        label: (
          <Space>
            <MessageOutlined />
            Collaboration
          </Space>
        ),
        children: (
          <CollaborationPanel
            documentType={config.documentType}
            documentId={documentId}
            documentTitle={documentTitle}
            mediaUrl={mediaUrl}
            mediaType={mediaType}
            currentUserId={user.id}
            currentUserName={user.name}
            enableComments={config.enableComments}
            enableAnnotations={config.enableAnnotations}
            enableRealTime={true}
          />
        ),
      });
    }

    if (config.enableReviews) {
      tabItems.push({
        key: 'reviews',
        label: (
          <Space>
            <TeamOutlined />
            Reviews
          </Space>
        ),
        children: (
          <ReviewDashboard
            currentUserId={user.id}
            currentUserName={user.name}
            mode="all"
            showStats={true}
          />
        ),
      });
    }

    if (config.enableActivityFeed) {
      tabItems.push({
        key: 'activity',
        label: (
          <Space>
            <HistoryOutlined />
            Activity
          </Space>
        ),
        children: (
          <ActivityFeed
            documentType={config.documentType}
            documentId={documentId}
            showStats={true}
          />
        ),
      });
    }

    if (config.enableNotifications) {
      tabItems.push({
        key: 'notifications',
        label: (
          <Space>
            <BellOutlined />
            Notifications
            {unreadNotifications > 0 && (
              <Badge count={unreadNotifications} size="small" />
            )}
          </Space>
        ),
        children: (
          <NotificationCenter
            userId={user.id}
            userName={user.name}
          />
        ),
      });
    }

    return (
      <>
        {/* Original Component */}
        <WrappedComponent {...(restProps as P)} />

        {/* Conflict Resolution Overlay */}
        {config.enableConflictResolution && (
          <div style={{ position: 'fixed', top: '70px', right: '20px', zIndex: 1000 }}>
            <ConflictResolution
              documentType={config.documentType}
              documentId={documentId}
              currentUserId={user.id}
              currentUserName={user.name}
            />
          </div>
        )}

        {/* Floating Action Button */}
        {config.floatingButton && tabItems.length > 0 && (
          <FloatButton.Group
            trigger="hover"
            type="primary"
            style={{ right: 24 }}
            icon={<MessageOutlined />}
            tooltip="Collaboration"
          >
            {config.enableComments && (
              <FloatButton
                icon={<MessageOutlined />}
                tooltip="Comments"
                onClick={() => {
                  setActiveTab('collaboration');
                  setIsCollaborationOpen(true);
                }}
              />
            )}
            {config.enableAnnotations && (
              <FloatButton
                icon={<HighlightOutlined />}
                tooltip="Annotations"
                onClick={() => {
                  setActiveTab('collaboration');
                  setIsCollaborationOpen(true);
                }}
              />
            )}
            {config.enableReviews && (
              <FloatButton
                icon={<TeamOutlined />}
                tooltip="Reviews"
                onClick={() => {
                  setActiveTab('reviews');
                  setIsCollaborationOpen(true);
                }}
              />
            )}
            {config.enableActivityFeed && (
              <FloatButton
                icon={<HistoryOutlined />}
                tooltip="Activity"
                onClick={() => {
                  setActiveTab('activity');
                  setIsCollaborationOpen(true);
                }}
              />
            )}
            {config.enableNotifications && (
              <FloatButton
                icon={<BellOutlined />}
                tooltip="Notifications"
                badge={{ count: unreadNotifications }}
                onClick={() => {
                  setActiveTab('notifications');
                  setIsCollaborationOpen(true);
                }}
              />
            )}
          </FloatButton.Group>
        )}

        {/* Collaboration Drawer */}
        {tabItems.length > 0 && (
          <Drawer
            title={`Collaboration - ${documentTitle}`}
            placement={config.drawerPlacement || 'right'}
            open={isCollaborationOpen}
            onClose={() => setIsCollaborationOpen(false)}
            width={600}
            height="80%"
            styles={{
              body: { padding: '16px' },
            }}
            extra={
              <Space>
                <Button
                  type="text"
                  icon={<MessageOutlined />}
                  onClick={() => {
                    message.info('Collaboration panel can be integrated into your workflow');
                  }}
                  title="Collaboration Help"
                />
              </Space>
            }
          >
            {tabItems.length === 1 ? (
              // Single tab - render content directly
              tabItems[0].children
            ) : (
              // Multiple tabs
              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="small"
              />
            )}
          </Drawer>
        )}
      </>
    );
  };
}

// Predefined configurations for common document types
export const collaborationConfigs = {
  workInstruction: {
    documentType: 'work-instruction',
    enableComments: true,
    enableAnnotations: true,
    enableReviews: true,
    enableActivityFeed: true,
    enableConflictResolution: true,
    floatingButton: true,
    mediaUrlKey: 'mediaUrl',
    mediaTypeKey: 'mediaType',
  } as CollaborationConfig,

  setupSheet: {
    documentType: 'setup-sheet',
    enableComments: true,
    enableAnnotations: true,
    enableReviews: true,
    enableActivityFeed: true,
    enableConflictResolution: true,
    floatingButton: true,
  } as CollaborationConfig,

  inspectionPlan: {
    documentType: 'inspection-plan',
    enableComments: true,
    enableAnnotations: true,
    enableReviews: true,
    enableActivityFeed: true,
    enableConflictResolution: true,
    floatingButton: true,
  } as CollaborationConfig,

  sop: {
    documentType: 'sop',
    enableComments: true,
    enableAnnotations: true,
    enableReviews: true,
    enableActivityFeed: true,
    enableConflictResolution: true,
    floatingButton: true,
  } as CollaborationConfig,

  toolDrawing: {
    documentType: 'tool-drawing',
    enableComments: true,
    enableAnnotations: true,
    enableReviews: true,
    enableActivityFeed: true,
    enableConflictResolution: true,
    floatingButton: true,
    mediaUrlKey: 'drawingUrl',
    mediaTypeKey: 'drawingType',
  } as CollaborationConfig,

  workOrder: {
    documentType: 'work-order',
    enableComments: true,
    enableAnnotations: false,
    enableReviews: true,
    enableActivityFeed: true,
    enableConflictResolution: true,
    floatingButton: true,
    documentTitleKey: 'workOrderNumber',
  } as CollaborationConfig,

  // Generic document configuration
  generic: {
    documentType: 'document',
    enableComments: true,
    enableAnnotations: false,
    enableReviews: false,
    enableActivityFeed: true,
    enableConflictResolution: false,
    floatingButton: true,
  } as CollaborationConfig,
};

// Convenience HOCs for specific document types
export const withWorkInstructionCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.workInstruction);

export const withSetupSheetCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.setupSheet);

export const withInspectionPlanCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.inspectionPlan);

export const withSOPCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.sop);

export const withToolDrawingCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.toolDrawing);

export const withWorkOrderCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.workOrder);

export const withGenericCollaboration = <P extends object>(component: ComponentType<P>) =>
  withCollaboration(component, collaborationConfigs.generic);