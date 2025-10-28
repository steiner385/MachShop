import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Avatar,
  Button,
  Input,
  Space,
  Dropdown,
  Tooltip,
  Tag,
  Typography,
  Divider,
  message,
  Modal,
  Form,
  Badge,
} from 'antd';
import {
  MessageOutlined,
  LikeOutlined,
  LikeFilled,
  HeartOutlined,
  HeartFilled,
  SmileOutlined,
  SmileFilled,
  MoreOutlined,
  EditOutlined,
  DeleteOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow } from 'date-fns';
import {
  DocumentComment,
  CommentInput,
  CommentReplyInput,
  CommentReaction as ICommentReaction,
  CommentReactionType
} from '@/api/collaboration';
import { collaborationApi } from '@/api/collaboration';
import { useRealTimeCollaboration, usePresence } from '@/hooks/useRealTimeCollaboration';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

interface CommentThreadProps {
  documentType: string;
  documentId: string;
  comments: DocumentComment[];
  currentUserId: string;
  currentUserName: string;
  onCommentsChange: () => void;
  className?: string;
  enableRealTime?: boolean;
}

interface CommentItemProps {
  comment: DocumentComment;
  currentUserId: string;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (parentId: string, content: string) => void;
  onReaction: (commentId: string, type: CommentReactionType) => void;
  depth?: number;
  maxDepth?: number;
}

const REACTION_ICONS: Record<CommentReactionType, { icon: React.ComponentType; filledIcon: React.ComponentType }> = {
  LIKE: { icon: LikeOutlined, filledIcon: LikeFilled },
  LOVE: { icon: HeartOutlined, filledIcon: HeartFilled },
  LAUGH: { icon: SmileOutlined, filledIcon: SmileFilled },
};

/**
 * Individual Comment Component
 */
const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  depth = 0,
  maxDepth = 3,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [replyContent, setReplyContent] = useState('');

  const isOwner = comment.authorId === currentUserId;
  const canReply = depth < maxDepth;

  // Handle edit submission
  const handleEditSubmit = useCallback(async () => {
    if (!editContent.trim()) {
      message.error('Comment content cannot be empty');
      return;
    }

    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
      message.success('Comment updated successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to update comment');
    }
  }, [comment.id, editContent, onEdit]);

  // Handle reply submission
  const handleReplySubmit = useCallback(async () => {
    if (!replyContent.trim()) {
      message.error('Reply content cannot be empty');
      return;
    }

    try {
      await onReply(comment.id, replyContent.trim());
      setReplyContent('');
      setIsReplying(false);
      message.success('Reply added successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to add reply');
    }
  }, [comment.id, replyContent, onReply]);

  // Handle reaction toggle
  const handleReactionToggle = useCallback(async (type: CommentReactionType) => {
    try {
      await onReaction(comment.id, type);
    } catch (error: any) {
      message.error(error.message || 'Failed to update reaction');
    }
  }, [comment.id, onReaction]);

  // Get user's existing reaction
  const getUserReaction = (type: CommentReactionType): ICommentReaction | undefined => {
    return comment.reactions?.find(r => r.userId === currentUserId && r.type === type);
  };

  // Get reaction count by type
  const getReactionCount = (type: CommentReactionType): number => {
    return comment.reactions?.filter(r => r.type === type).length || 0;
  };

  // Actions dropdown menu
  const actionMenuItems = [
    ...(isOwner ? [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => setIsEditing(true),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        danger: true,
        onClick: () => {
          Modal.confirm({
            title: 'Delete Comment',
            content: 'Are you sure you want to delete this comment? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            onOk: () => onDelete(comment.id),
          });
        },
      },
    ] : []),
  ];

  return (
    <div
      className={`comment-item ${depth > 0 ? 'comment-reply' : ''}`}
      style={{
        marginLeft: depth > 0 ? '32px' : '0',
        marginBottom: '16px',
        borderLeft: depth > 0 ? '2px solid #f0f0f0' : 'none',
        paddingLeft: depth > 0 ? '16px' : '0',
      }}
    >
      <Card size="small" bodyStyle={{ padding: '12px 16px' }}>
        {/* Comment Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <Space>
            <Avatar size="small" src={comment.authorAvatar}>
              {comment.authorName?.[0]?.toUpperCase()}
            </Avatar>
            <div>
              <Text strong>{comment.authorName}</Text>
              <div>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  {comment.updatedAt !== comment.createdAt && (
                    <Text type="secondary"> • edited</Text>
                  )}
                </Text>
                {comment.type === 'MENTION' && (
                  <Tag color="blue" size="small" style={{ marginLeft: '8px' }}>
                    Mention
                  </Tag>
                )}
              </div>
            </div>
          </Space>

          {actionMenuItems.length > 0 && (
            <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </div>

        {/* Comment Content */}
        {isEditing ? (
          <div style={{ marginBottom: '12px' }}>
            <TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              autoSize={{ minRows: 2, maxRows: 6 }}
              placeholder="Edit your comment..."
            />
            <div style={{ marginTop: '8px', textAlign: 'right' }}>
              <Space>
                <Button size="small" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button type="primary" size="small" onClick={handleEditSubmit}>
                  Save
                </Button>
              </Space>
            </div>
          </div>
        ) : (
          <Paragraph
            style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}
            ellipsis={{ rows: 10, expandable: true }}
          >
            {comment.content}
          </Paragraph>
        )}

        {/* Comment Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            {/* Reactions */}
            <Space size="small">
              {Object.entries(REACTION_ICONS).map(([type, { icon: Icon, filledIcon: FilledIcon }]) => {
                const userReaction = getUserReaction(type as CommentReactionType);
                const count = getReactionCount(type as CommentReactionType);
                const hasReacted = !!userReaction;

                return (
                  <Tooltip key={type} title={`${type.toLowerCase()}`}>
                    <Button
                      type="text"
                      size="small"
                      icon={hasReacted ? <FilledIcon /> : <Icon />}
                      onClick={() => handleReactionToggle(type as CommentReactionType)}
                      style={{
                        color: hasReacted ? '#1890ff' : undefined,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {count > 0 && <span style={{ fontSize: '12px' }}>{count}</span>}
                    </Button>
                  </Tooltip>
                );
              })}
            </Space>

            {/* Reply Button */}
            {canReply && (
              <Button
                type="text"
                size="small"
                icon={<MessageOutlined />}
                onClick={() => setIsReplying(!isReplying)}
              >
                Reply
              </Button>
            )}
          </Space>

          {/* Reply Count */}
          {comment.replies && comment.replies.length > 0 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </Text>
          )}
        </div>

        {/* Reply Form */}
        {isReplying && (
          <>
            <Divider style={{ margin: '12px 0' }} />
            <div>
              <TextArea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Write a reply..."
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ marginBottom: '8px' }}
              />
              <div style={{ textAlign: 'right' }}>
                <Space>
                  <Button size="small" onClick={() => setIsReplying(false)}>
                    Cancel
                  </Button>
                  <Button type="primary" size="small" onClick={handleReplySubmit}>
                    Reply
                  </Button>
                </Space>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div style={{ marginTop: '8px' }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onEdit={onEdit}
              onDelete={onDelete}
              onReply={onReply}
              onReaction={onReaction}
              depth={depth + 1}
              maxDepth={maxDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main Comment Thread Component
 */
export const CommentThread: React.FC<CommentThreadProps> = ({
  documentType,
  documentId,
  comments,
  currentUserId,
  currentUserName,
  onCommentsChange,
  className,
  enableRealTime = true,
}) => {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time collaboration hooks
  const { isConnected, presenceUsers } = useRealTimeCollaboration({
    documentType,
    documentId,
    autoConnect: enableRealTime,
    onCommentUpdate: (event) => {
      // Refresh comments when real-time updates are received
      if (event.action === 'created' || event.action === 'updated' || event.action === 'deleted') {
        onCommentsChange();
      }
    },
  });

  const { isEditing, startEditing, stopEditing } = usePresence(
    documentType,
    documentId,
    currentUserId,
    currentUserName
  );

  // Handle new comment submission
  const handleCommentSubmit = useCallback(async () => {
    if (!newComment.trim()) {
      message.error('Comment content cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const commentInput: CommentInput = {
        documentType,
        documentId,
        content: newComment.trim(),
        type: 'GENERAL',
      };

      await collaborationApi.createComment(commentInput);
      setNewComment('');
      onCommentsChange();
      message.success('Comment added successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  }, [documentType, documentId, newComment, onCommentsChange]);

  // Handle comment edit
  const handleCommentEdit = useCallback(async (commentId: string, content: string) => {
    await collaborationApi.updateComment(commentId, { content });
    onCommentsChange();
  }, [onCommentsChange]);

  // Handle comment delete
  const handleCommentDelete = useCallback(async (commentId: string) => {
    await collaborationApi.deleteComment(commentId);
    onCommentsChange();
  }, [onCommentsChange]);

  // Handle reply
  const handleReply = useCallback(async (parentId: string, content: string) => {
    const replyInput: CommentReplyInput = {
      parentId,
      content,
    };

    await collaborationApi.replyToComment(replyInput);
    onCommentsChange();
  }, [onCommentsChange]);

  // Handle reaction
  const handleReaction = useCallback(async (commentId: string, type: CommentReactionType) => {
    await collaborationApi.toggleCommentReaction(commentId, type);
    onCommentsChange();
  }, [onCommentsChange]);

  // Get top-level comments (not replies)
  const topLevelComments = comments.filter(comment => !comment.parentId);

  return (
    <div className={className}>
      {/* Comments Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Text strong style={{ fontSize: '16px' }}>
            Comments ({comments.length})
          </Text>

          {/* Real-time connection indicator */}
          {enableRealTime && (
            <Tooltip title={isConnected ? 'Connected to real-time updates' : 'Disconnected from real-time updates'}>
              <Badge
                status={isConnected ? 'success' : 'error'}
                text={
                  <Space size="small">
                    <WifiOutlined />
                    <Text type={isConnected ? 'success' : 'danger'} style={{ fontSize: '12px' }}>
                      {isConnected ? 'Live' : 'Offline'}
                    </Text>
                  </Space>
                }
              />
            </Tooltip>
          )}
        </div>

        {/* Active users indicator */}
        {enableRealTime && presenceUsers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Active users:
            </Text>
            <Avatar.Group maxCount={3} size="small">
              {presenceUsers.map(user => (
                <Tooltip key={user.userId} title={`${user.userName} ${user.isEditing ? '(editing)' : ''}`}>
                  <Avatar size="small">
                    {user.userName?.[0]?.toUpperCase()}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          </div>
        )}
      </div>

      {/* New Comment Form */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <TextArea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onFocus={() => enableRealTime && startEditing()}
          onBlur={() => enableRealTime && stopEditing()}
          placeholder="Add a comment..."
          autoSize={{ minRows: 3, maxRows: 6 }}
          style={{ marginBottom: '12px' }}
        />
        <div style={{ textAlign: 'right' }}>
          <Space>
            {enableRealTime && isEditing && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                <Badge status="processing" text="You are editing..." />
              </Text>
            )}
            <Button
              type="primary"
              onClick={handleCommentSubmit}
              loading={isSubmitting}
              disabled={!newComment.trim()}
            >
              Post Comment
            </Button>
          </Space>
        </div>
      </Card>

      {/* Comments List */}
      <div className="comments-list">
        {topLevelComments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
            <MessageOutlined style={{ fontSize: '24px', marginBottom: '8px' }} />
            <div>No comments yet. Be the first to comment!</div>
          </div>
        ) : (
          topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              onEdit={handleCommentEdit}
              onDelete={handleCommentDelete}
              onReply={handleReply}
              onReaction={handleReaction}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default CommentThread;