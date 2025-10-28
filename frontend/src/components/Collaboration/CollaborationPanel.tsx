import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Card, Spin, message, Empty, Button, Space } from 'antd';
import {
  MessageOutlined,
  EditOutlined,
  ReloadOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { CommentThread } from './CommentThread';
import { AnnotationCanvas } from './AnnotationCanvas';
import {
  DocumentComment,
  DocumentAnnotation,
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';

interface CollaborationPanelProps {
  documentType: string;
  documentId: string;
  documentTitle: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'pdf' | 'video';
  currentUserId: string;
  currentUserName: string;
  className?: string;
  enableComments?: boolean;
  enableAnnotations?: boolean;
  enableRealTime?: boolean;
  defaultActiveTab?: 'comments' | 'annotations';
}

/**
 * Unified Collaboration Panel Component
 * Combines commenting and annotation functionality for documents
 */
export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  documentType,
  documentId,
  documentTitle,
  mediaUrl,
  mediaType,
  currentUserId,
  currentUserName,
  className,
  enableComments = true,
  enableAnnotations = true,
  enableRealTime = true,
  defaultActiveTab = 'comments',
}) => {
  // State
  const [activeTab, setActiveTab] = useState(defaultActiveTab);
  const [comments, setComments] = useState<DocumentComment[]>([]);
  const [annotations, setAnnotations] = useState<DocumentAnnotation[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isLoadingAnnotations, setIsLoadingAnnotations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!enableComments) return;

    setIsLoadingComments(true);
    setError(null);

    try {
      const response = await collaborationApi.getComments(documentType, documentId);
      setComments(response.data);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load comments';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsLoadingComments(false);
    }
  }, [documentType, documentId, enableComments]);

  // Load annotations
  const loadAnnotations = useCallback(async () => {
    if (!enableAnnotations || !mediaUrl) return;

    setIsLoadingAnnotations(true);
    setError(null);

    try {
      const response = await collaborationApi.getAnnotations(documentType, documentId);
      setAnnotations(response.data);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to load annotations';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setIsLoadingAnnotations(false);
    }
  }, [documentType, documentId, enableAnnotations, mediaUrl]);

  // Initial load
  useEffect(() => {
    loadComments();
    loadAnnotations();
  }, [loadComments, loadAnnotations]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (activeTab === 'comments') {
      loadComments();
    } else if (activeTab === 'annotations') {
      loadAnnotations();
    }
  }, [activeTab, loadComments, loadAnnotations]);

  // Handle tab change
  const handleTabChange = (key: string) => {
    setActiveTab(key as 'comments' | 'annotations');
    setError(null);
  };

  // Build tab items
  const tabItems = [];

  if (enableComments) {
    tabItems.push({
      key: 'comments',
      label: (
        <Space>
          <MessageOutlined />
          Comments ({comments.length})
        </Space>
      ),
      children: (
        <div>
          {isLoadingComments ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Empty
                description={error}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={loadComments}>
                  Try Again
                </Button>
              </Empty>
            </div>
          ) : (
            <CommentThread
              documentType={documentType}
              documentId={documentId}
              comments={comments}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              onCommentsChange={loadComments}
              enableRealTime={enableRealTime}
            />
          )}
        </div>
      ),
    });
  }

  if (enableAnnotations && mediaUrl && mediaType) {
    tabItems.push({
      key: 'annotations',
      label: (
        <Space>
          <EditOutlined />
          Annotations ({annotations.length})
        </Space>
      ),
      children: (
        <div>
          {isLoadingAnnotations ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Spin size="large" />
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Empty
                description={error}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={loadAnnotations}>
                  Try Again
                </Button>
              </Empty>
            </div>
          ) : (
            <AnnotationCanvas
              documentType={documentType}
              documentId={documentId}
              mediaUrl={mediaUrl}
              mediaType={mediaType}
              annotations={annotations}
              currentUserId={currentUserId}
              onAnnotationsChange={loadAnnotations}
            />
          )}
        </div>
      ),
    });
  }

  // If no features are enabled, show empty state
  if (tabItems.length === 0) {
    return (
      <Card className={className}>
        <Empty
          description="No collaboration features available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // If only one feature is enabled, render it directly without tabs
  if (tabItems.length === 1) {
    const singleTab = tabItems[0];
    return (
      <Card
        className={className}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{singleTab.label}</span>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              title="Refresh"
            />
          </div>
        }
      >
        {singleTab.children}
      </Card>
    );
  }

  // Render tabs when multiple features are enabled
  return (
    <Card
      className={className}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Collaboration - {documentTitle}</span>
          <Button
            type="text"
            size="small"
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            title="Refresh"
          />
        </div>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
        size="small"
      />
    </Card>
  );
};

export default CollaborationPanel;