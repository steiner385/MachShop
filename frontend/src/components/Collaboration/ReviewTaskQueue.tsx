import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  List,
  Button,
  Space,
  Tag,
  Progress,
  Typography,
  Input,
  Checkbox,
  Modal,
  Form,
  Rate,
  Badge,
  Avatar,
  Tooltip,
  Empty,
  message,
  Divider,
  Alert,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  CommentOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import {
  ReviewAssignment,
  ReviewStatus,
  ReviewPriority,
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';
import { useRealTimeCollaboration } from '@/hooks/useRealTimeCollaboration';

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ReviewTaskQueueProps {
  userId: string;
  userName: string;
  mode?: 'personal' | 'team';
  className?: string;
}

interface ReviewCompletionData {
  approved: boolean;
  rating: number;
  notes: string;
  checklistResults: Record<string, boolean>;
}

/**
 * Review Task Queue Component
 * Displays and manages review tasks assigned to the current user or team
 */
export const ReviewTaskQueue: React.FC<ReviewTaskQueueProps> = ({
  userId,
  userName,
  mode = 'personal',
  className,
}) => {
  // State
  const [reviews, setReviews] = useState<ReviewAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeReview, setActiveReview] = useState<ReviewAssignment | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionForm] = Form.useForm();

  // Real-time updates
  const { isConnected } = useRealTimeCollaboration({
    documentType: 'review',
    documentId: 'queue',
    autoConnect: true,
    onReviewUpdate: (event) => {
      if (event.action === 'created' || event.action === 'updated' || event.action === 'deleted') {
        loadReviews();
      }
    },
  });

  // Load reviews for the current user
  const loadReviews = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = {
        assigneeId: mode === 'personal' ? userId : undefined,
        status: ['PENDING', 'IN_PROGRESS'] as ReviewStatus[],
        sortBy: 'deadline',
        sortOrder: 'asc' as const,
      };

      const response = await collaborationApi.getReviews(params);
      setReviews(response.data);
    } catch (error: any) {
      message.error(error.message || 'Failed to load review tasks');
    } finally {
      setIsLoading(false);
    }
  }, [userId, mode]);

  // Initial load
  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  // Start working on a review
  const handleStartReview = useCallback(async (review: ReviewAssignment) => {
    try {
      await collaborationApi.updateReviewStatus(review.id, 'IN_PROGRESS');
      setActiveReview(review);
      message.success('Review started');
      loadReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to start review');
    }
  }, [loadReviews]);

  // Pause a review
  const handlePauseReview = useCallback(async (review: ReviewAssignment) => {
    try {
      await collaborationApi.updateReviewStatus(review.id, 'PENDING');
      setActiveReview(null);
      message.success('Review paused');
      loadReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to pause review');
    }
  }, [loadReviews]);

  // Complete a review
  const handleCompleteReview = useCallback((review: ReviewAssignment) => {
    setActiveReview(review);
    setShowCompletionModal(true);

    // Pre-populate checklist
    if (review.reviewChecklist) {
      const checklistResults = review.reviewChecklist.reduce((acc, item) => {
        acc[item] = false;
        return acc;
      }, {} as Record<string, boolean>);

      completionForm.setFieldsValue({
        checklistResults,
        approved: true,
        rating: 5,
      });
    }
  }, [completionForm]);

  // Submit review completion
  const handleSubmitCompletion = useCallback(async (values: ReviewCompletionData) => {
    if (!activeReview) return;

    try {
      await collaborationApi.completeReview(activeReview.id, {
        approved: values.approved,
        rating: values.rating,
        notes: values.notes,
        checklistResults: values.checklistResults,
      });

      message.success('Review completed successfully');
      setShowCompletionModal(false);
      setActiveReview(null);
      completionForm.resetFields();
      loadReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to complete review');
    }
  }, [activeReview, completionForm, loadReviews]);

  // Reject a review
  const handleRejectReview = useCallback(async () => {
    if (!activeReview) return;

    try {
      const notes = completionForm.getFieldValue('notes');
      if (!notes?.trim()) {
        message.error('Please provide rejection notes');
        return;
      }

      await collaborationApi.completeReview(activeReview.id, {
        approved: false,
        notes: notes.trim(),
        checklistResults: completionForm.getFieldValue('checklistResults') || {},
      });

      message.success('Review rejected with feedback');
      setShowCompletionModal(false);
      setActiveReview(null);
      completionForm.resetFields();
      loadReviews();
    } catch (error: any) {
      message.error(error.message || 'Failed to reject review');
    }
  }, [activeReview, completionForm, loadReviews]);

  // Navigate to document
  const handleViewDocument = useCallback((review: ReviewAssignment) => {
    // This would navigate to the actual document
    message.info(`Opening ${review.documentType} #${review.documentId}`);
  }, []);

  // Priority color mapping
  const priorityColors: Record<ReviewPriority, string> = {
    LOW: '#52c41a',
    MEDIUM: '#faad14',
    HIGH: '#ff4d4f',
    URGENT: '#722ed1',
  };

  // Status color mapping
  const statusColors: Record<ReviewStatus, string> = {
    PENDING: '#faad14',
    IN_PROGRESS: '#1890ff',
    COMPLETED: '#52c41a',
    REJECTED: '#ff4d4f',
    CANCELLED: '#8c8c8c',
  };

  // Get overdue reviews
  const overdueReviews = reviews.filter(review =>
    review.deadline && new Date(review.deadline) < new Date()
  );

  // Get priority reviews
  const priorityReviews = reviews.filter(review =>
    review.priority === 'HIGH' || review.priority === 'URGENT'
  );

  return (
    <div className={className}>
      {/* Alerts */}
      {overdueReviews.length > 0 && (
        <Alert
          message={`You have ${overdueReviews.length} overdue review${overdueReviews.length > 1 ? 's' : ''}`}
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      {priorityReviews.length > 0 && (
        <Alert
          message={`You have ${priorityReviews.length} high priority review${priorityReviews.length > 1 ? 's' : ''}`}
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                Review Queue
              </Title>
              {isConnected && (
                <Badge status="success" text="Live" />
              )}
            </Space>
            <Text type="secondary">
              {reviews.length} pending review{reviews.length !== 1 ? 's' : ''}
            </Text>
          </div>
        }
      >
        {reviews.length === 0 ? (
          <Empty
            description="No pending reviews"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            loading={isLoading}
            dataSource={reviews}
            renderItem={(review) => {
              const isOverdue = review.deadline && new Date(review.deadline) < new Date();
              const isUrgent = review.priority === 'HIGH' || review.priority === 'URGENT';
              const progress = review.progress || 0;

              return (
                <List.Item
                  style={{
                    border: isOverdue ? '1px solid #ff4d4f' : isUrgent ? '1px solid #faad14' : '1px solid #f0f0f0',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    padding: '16px',
                    backgroundColor: isOverdue ? '#fff2f0' : undefined,
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        style={{
                          backgroundColor: priorityColors[review.priority],
                        }}
                        icon={<FileTextOutlined />}
                      />
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <Space>
                            <Text strong>
                              {review.documentTitle || `${review.documentType} #${review.documentId}`}
                            </Text>
                            <Tag color={priorityColors[review.priority]} size="small">
                              {review.priority}
                            </Tag>
                            <Tag color={statusColors[review.status]} size="small">
                              {review.status.replace('_', ' ')}
                            </Tag>
                          </Space>
                          {isOverdue && (
                            <div style={{ marginTop: '4px' }}>
                              <Text type="danger" style={{ fontSize: '12px' }}>
                                <ExclamationCircleOutlined /> Overdue
                              </Text>
                            </div>
                          )}
                        </div>

                        <Space>
                          {review.status === 'PENDING' && (
                            <Button
                              type="primary"
                              size="small"
                              icon={<PlayCircleOutlined />}
                              onClick={() => handleStartReview(review)}
                            >
                              Start
                            </Button>
                          )}

                          {review.status === 'IN_PROGRESS' && (
                            <>
                              <Button
                                size="small"
                                icon={<PauseCircleOutlined />}
                                onClick={() => handlePauseReview(review)}
                              >
                                Pause
                              </Button>
                              <Button
                                type="primary"
                                size="small"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handleCompleteReview(review)}
                              >
                                Complete
                              </Button>
                            </>
                          )}

                          <Button
                            size="small"
                            icon={<FileTextOutlined />}
                            onClick={() => handleViewDocument(review)}
                          >
                            View
                          </Button>
                        </Space>
                      </div>
                    }
                    description={
                      <div>
                        <div style={{ marginBottom: '8px' }}>
                          <Text type="secondary">
                            Assigned by {review.assignerName}
                          </Text>
                          {review.deadline && (
                            <Text type="secondary" style={{ marginLeft: '16px' }}>
                              <CalendarOutlined /> Due {formatDistanceToNow(new Date(review.deadline), { addSuffix: true })}
                            </Text>
                          )}
                        </div>

                        {review.instructions && (
                          <div style={{ marginBottom: '8px' }}>
                            <Text>{review.instructions}</Text>
                          </div>
                        )}

                        {review.reviewChecklist && review.reviewChecklist.length > 0 && (
                          <div style={{ marginBottom: '8px' }}>
                            <Text strong style={{ fontSize: '12px' }}>Checklist items:</Text>
                            <div style={{ marginTop: '4px' }}>
                              {review.reviewChecklist.slice(0, 3).map((item, index) => (
                                <Tag key={index} size="small" style={{ marginBottom: '2px' }}>
                                  {item}
                                </Tag>
                              ))}
                              {review.reviewChecklist.length > 3 && (
                                <Tag size="small">+{review.reviewChecklist.length - 3} more</Tag>
                              )}
                            </div>
                          </div>
                        )}

                        {progress > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <Text strong style={{ fontSize: '12px' }}>Progress:</Text>
                            <Progress
                              percent={Math.round(progress * 100)}
                              size="small"
                              style={{ marginTop: '4px' }}
                            />
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        )}
      </Card>

      {/* Review Completion Modal */}
      <Modal
        title={`Complete Review - ${activeReview?.documentTitle || `${activeReview?.documentType} #${activeReview?.documentId}`}`}
        open={showCompletionModal}
        onCancel={() => {
          setShowCompletionModal(false);
          setActiveReview(null);
          completionForm.resetFields();
        }}
        footer={null}
        width={700}
      >
        {activeReview && (
          <Form
            form={completionForm}
            layout="vertical"
            onFinish={handleSubmitCompletion}
          >
            {/* Review Checklist */}
            {activeReview.reviewChecklist && activeReview.reviewChecklist.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <Title level={5}>Review Checklist</Title>
                <Form.Item name="checklistResults">
                  <Checkbox.Group style={{ width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {activeReview.reviewChecklist.map((item, index) => (
                        <Checkbox key={index} value={item}>
                          {item}
                        </Checkbox>
                      ))}
                    </div>
                  </Checkbox.Group>
                </Form.Item>
              </div>
            )}

            <Divider />

            {/* Overall Assessment */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>Overall Assessment</Title>

              <Form.Item
                name="approved"
                label="Approval Status"
                rules={[{ required: true, message: 'Please select approval status' }]}
              >
                <Checkbox.Group
                  options={[
                    { label: 'Approve', value: true },
                    { label: 'Reject', value: false },
                  ]}
                />
              </Form.Item>

              <Form.Item
                name="rating"
                label="Quality Rating"
                rules={[{ required: true, message: 'Please provide a rating' }]}
              >
                <Rate allowHalf />
              </Form.Item>
            </div>

            {/* Review Notes */}
            <Form.Item
              name="notes"
              label="Review Notes"
              rules={[{ required: true, message: 'Please provide review notes' }]}
            >
              <TextArea
                rows={4}
                placeholder="Provide detailed feedback, suggestions, or reasons for rejection..."
              />
            </Form.Item>

            {/* Action Buttons */}
            <div style={{ textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setActiveReview(null);
                    completionForm.resetFields();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={handleRejectReview}
                >
                  Reject
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => completionForm.submit()}
                >
                  Approve & Complete
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ReviewTaskQueue;