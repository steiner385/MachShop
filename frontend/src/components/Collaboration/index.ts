// Core collaboration components
export { CommentThread } from './CommentThread';
export { AnnotationCanvas } from './AnnotationCanvas';
export { CollaborationPanel } from './CollaborationPanel';

// Review components
export { ReviewDashboard } from './ReviewDashboard';
export { ReviewTaskQueue } from './ReviewTaskQueue';

// Notification and activity components
export { NotificationCenter } from './NotificationCenter';
export { ActivityFeed } from './ActivityFeed';

// Conflict resolution components
export { ConflictResolution } from './ConflictResolution';

// Integration HOC and utilities
export {
  withCollaboration,
  withWorkInstructionCollaboration,
  withSetupSheetCollaboration,
  withInspectionPlanCollaboration,
  withSOPCollaboration,
  withToolDrawingCollaboration,
  withWorkOrderCollaboration,
  withGenericCollaboration,
  collaborationConfigs,
} from './withCollaboration';

// Re-export types for convenience
export type {
  DocumentComment,
  CommentInput,
  CommentReplyInput,
  CommentReaction,
  CommentReactionType,
  DocumentAnnotation,
  AnnotationInput,
  AnnotationType,
  ReviewAssignment,
  ReviewAssignmentInput,
  ReviewStatus,
  ReviewPriority,
  UserNotification,
  NotificationType,
  NotificationPriority,
  DocumentActivity,
  ActivityType,
} from '@/api/collaboration';

// Re-export HOC types
export type {
  CollaborationConfig,
  WithCollaborationProps,
} from './withCollaboration';