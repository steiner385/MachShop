import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for Collaboration Operations
 */

// Comment Types
export interface Comment {
  id: string;
  documentType: string;
  documentId: string;
  contextType?: string;
  contextId?: string;
  contextPath?: string;
  commentText: string;
  attachments?: string[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  tags?: string[];
  authorId: string;
  authorName: string;
  mentionedUserIds?: string[];
  parentCommentId?: string;
  isResolved: boolean;
  isPinned: boolean;
  status: 'OPEN' | 'ARCHIVED' | 'FLAGGED';
  createdAt: string;
  updatedAt: string;
  editedAt?: string;
  resolvedAt?: string;
  resolvedById?: string;
  replies?: Comment[];
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  userId: string;
  userName: string;
  reactionType: 'LIKE' | 'DISLIKE' | 'THUMBS_UP' | 'THUMBS_DOWN' | 'HEART' | 'LAUGH' | 'CONFUSED' | 'CELEBRATE';
  createdAt: string;
}

export interface CreateCommentRequest {
  documentType: string;
  documentId: string;
  contextType?: string;
  contextId?: string;
  contextPath?: string;
  commentText: string;
  attachments?: string[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';
  tags?: string[];
  mentionedUserIds?: string[];
}

export interface ReplyCommentRequest {
  parentCommentId: string;
  commentText: string;
  attachments?: string[];
  mentionedUserIds?: string[];
}

// Annotation Types
export interface Annotation {
  id: string;
  documentType: string;
  documentId: string;
  mediaType?: string;
  mediaUrl?: string;
  annotationType: 'ARROW' | 'RECTANGLE' | 'CIRCLE' | 'FREEHAND' | 'TEXT_LABEL' | 'HIGHLIGHT' | 'CALLOUT';
  annotationData: any;
  text?: string;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  timestamp?: number;
  authorId: string;
  authorName: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  commentCount?: number;
}

export interface CreateAnnotationRequest {
  documentType: string;
  documentId: string;
  mediaType?: string;
  mediaUrl?: string;
  annotationType: 'ARROW' | 'RECTANGLE' | 'CIRCLE' | 'FREEHAND' | 'TEXT_LABEL' | 'HIGHLIGHT' | 'CALLOUT';
  annotationData: any;
  text?: string;
  color?: string;
  strokeWidth?: number;
  opacity?: number;
  fontSize?: number;
  timestamp?: number;
}

// Review Types
export interface Review {
  id: string;
  documentType: string;
  documentId: string;
  reviewType: 'TECHNICAL_REVIEW' | 'SAFETY_REVIEW' | 'QUALITY_REVIEW' | 'FINAL_APPROVAL';
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'OVERDUE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  instructions?: string;
  checklist?: ReviewChecklistItem[];
  completedAt?: string;
  outcome?: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
  comments?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ReviewChecklistItem {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  category?: string;
  completed?: boolean;
  notes?: string;
}

export interface AssignReviewRequest {
  documentType: string;
  documentId: string;
  reviewType: 'TECHNICAL_REVIEW' | 'SAFETY_REVIEW' | 'QUALITY_REVIEW' | 'FINAL_APPROVAL';
  assigneeId: string;
  assigneeName: string;
  dueDate?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  instructions?: string;
  checklist?: Omit<ReviewChecklistItem, 'completed' | 'notes'>[];
  customFields?: Record<string, any>;
}

// Notification Types
export interface Notification {
  id: string;
  userId: string;
  type: 'COMMENT_MENTION' | 'COMMENT_REPLY' | 'REVIEW_ASSIGNED' | 'REVIEW_DEADLINE' | 'DOCUMENT_UPDATED' | 'SYSTEM_ANNOUNCEMENT';
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedUserId?: string;
  actionUrl?: string;
  metadata?: any;
  channels: ('IN_APP' | 'EMAIL' | 'SMS' | 'PUSH' | 'SLACK')[];
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  isRead: boolean;
  readAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Activity Types
export interface Activity {
  id: string;
  documentType: string;
  documentId: string;
  activityType: 'DOCUMENT_CREATED' | 'DOCUMENT_UPDATED' | 'DOCUMENT_APPROVED' | 'DOCUMENT_REJECTED' | 'COMMENT_ADDED' | 'ANNOTATION_ADDED' | 'REVIEW_ASSIGNED' | 'REVIEW_COMPLETED' | 'USER_ACCESSED';
  description: string;
  userId: string;
  userName: string;
  details?: any;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: any;
  createdAt: string;
}

// Collaboration Types
export interface CollaborationState {
  documentType: string;
  documentId: string;
  activeSessions: EditSession[];
  activeUsers: Array<{
    userId: string;
    userName: string;
    joinedAt: string;
    lastActivity: string;
  }>;
  conflicts: Array<{
    id: string;
    type: 'CONCURRENT_EDIT' | 'VERSION_MISMATCH' | 'PERMISSION_CONFLICT' | 'DATA_VALIDATION';
    severity: string;
    detectedAt: string;
    isResolved: boolean;
  }>;
  subscribers: Array<{
    userId: string;
    userName: string;
    subscriptionTypes: string[];
  }>;
}

export interface EditSession {
  sessionId: string;
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  startedAt: string;
  lastActivity: string;
  isActive: boolean;
  sessionData?: any;
}

/**
 * Collaboration API client
 */
class CollaborationApi {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Comment API methods
  async createComment(data: CreateCommentRequest): Promise<Comment> {
    const response = await axios.post<Comment>(`${this.baseURL}/comments`, data);
    return response.data;
  }

  async replyToComment(data: ReplyCommentRequest): Promise<Comment> {
    const response = await axios.post<Comment>(`${this.baseURL}/comments/reply`, data);
    return response.data;
  }

  async getComments(documentType: string, documentId: string, filters?: {
    status?: string;
    priority?: string;
    authorId?: string;
    contextType?: string;
    isResolved?: boolean;
    isPinned?: boolean;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Comment[]> {
    const response = await axios.get<Comment[]>(`${this.baseURL}/comments/${documentType}/${documentId}`, {
      params: filters
    });
    return response.data;
  }

  async updateComment(commentId: string, updates: {
    commentText?: string;
    attachments?: string[];
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    tags?: string[];
    isPinned?: boolean;
  }): Promise<Comment> {
    const response = await axios.put<Comment>(`${this.baseURL}/comments/${commentId}`, updates);
    return response.data;
  }

  async deleteComment(commentId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/comments/${commentId}`);
  }

  async resolveComment(commentId: string): Promise<Comment> {
    const response = await axios.post<Comment>(`${this.baseURL}/comments/${commentId}/resolve`);
    return response.data;
  }

  async pinComment(commentId: string, isPinned = true): Promise<Comment> {
    const response = await axios.post<Comment>(`${this.baseURL}/comments/${commentId}/pin`, { isPinned });
    return response.data;
  }

  async addReaction(commentId: string, reactionType: string): Promise<void> {
    await axios.post(`${this.baseURL}/comments/${commentId}/reactions`, { reactionType });
  }

  async removeReaction(commentId: string, reactionType: string): Promise<void> {
    await axios.delete(`${this.baseURL}/comments/${commentId}/reactions/${reactionType}`);
  }

  async getCommentStats(documentType: string, documentId: string): Promise<{
    totalComments: number;
    openComments: number;
    resolvedComments: number;
    pinnedComments: number;
  }> {
    const response = await axios.get(`${this.baseURL}/comments/${documentType}/${documentId}/stats`);
    return response.data;
  }

  // Annotation API methods
  async createAnnotation(data: CreateAnnotationRequest): Promise<Annotation> {
    const response = await axios.post<Annotation>(`${this.baseURL}/annotations`, data);
    return response.data;
  }

  async getAnnotations(documentType: string, documentId: string, filters?: {
    mediaType?: string;
    annotationType?: string;
    authorId?: string;
    isResolved?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Annotation[]> {
    const response = await axios.get<Annotation[]>(`${this.baseURL}/annotations/${documentType}/${documentId}`, {
      params: filters
    });
    return response.data;
  }

  async getAnnotationsForMedia(documentType: string, documentId: string, mediaUrl: string): Promise<Annotation[]> {
    const response = await axios.get<Annotation[]>(`${this.baseURL}/annotations/${documentType}/${documentId}/media`, {
      params: { mediaUrl }
    });
    return response.data;
  }

  async updateAnnotation(annotationId: string, updates: {
    annotationData?: any;
    text?: string;
    color?: string;
    strokeWidth?: number;
    opacity?: number;
    fontSize?: number;
    isResolved?: boolean;
  }): Promise<Annotation> {
    const response = await axios.put<Annotation>(`${this.baseURL}/annotations/${annotationId}`, updates);
    return response.data;
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/annotations/${annotationId}`);
  }

  async resolveAnnotation(annotationId: string): Promise<Annotation> {
    const response = await axios.post<Annotation>(`${this.baseURL}/annotations/${annotationId}/resolve`);
    return response.data;
  }

  async exportAnnotations(documentType: string, documentId: string, format: 'JSON' | 'CSV' = 'JSON'): Promise<any> {
    const response = await axios.post(`${this.baseURL}/annotations/${documentType}/${documentId}/export`, { format });
    return response.data;
  }

  async getAnnotationStats(documentType: string, documentId: string): Promise<{
    totalAnnotations: number;
    resolvedAnnotations: number;
    annotationsByType: Record<string, number>;
    annotationsByAuthor: Record<string, number>;
  }> {
    const response = await axios.get(`${this.baseURL}/annotations/${documentType}/${documentId}/stats`);
    return response.data;
  }

  // Review API methods
  async assignReview(data: AssignReviewRequest): Promise<Review> {
    const response = await axios.post<Review>(`${this.baseURL}/reviews/assign`, data);
    return response.data;
  }

  async getReviews(filters?: {
    status?: string;
    reviewType?: string;
    assigneeId?: string;
    assignerId?: string;
    documentType?: string;
    priority?: string;
    overdue?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Review[]> {
    const response = await axios.get<Review[]>(`${this.baseURL}/reviews`, { params: filters });
    return response.data;
  }

  async getReview(reviewId: string): Promise<Review> {
    const response = await axios.get<Review>(`${this.baseURL}/reviews/${reviewId}`);
    return response.data;
  }

  async updateReview(reviewId: string, updates: {
    status?: string;
    priority?: string;
    instructions?: string;
    dueDate?: string;
    customFields?: Record<string, any>;
  }): Promise<Review> {
    const response = await axios.put<Review>(`${this.baseURL}/reviews/${reviewId}`, updates);
    return response.data;
  }

  async completeReview(reviewId: string, data: {
    outcome: 'APPROVED' | 'REJECTED' | 'NEEDS_CHANGES';
    comments?: string;
    checklist?: Array<{
      id: string;
      completed: boolean;
      notes?: string;
    }>;
    attachments?: string[];
    customFields?: Record<string, any>;
  }): Promise<Review> {
    const response = await axios.post<Review>(`${this.baseURL}/reviews/${reviewId}/complete`, data);
    return response.data;
  }

  async startReview(reviewId: string): Promise<Review> {
    const response = await axios.post<Review>(`${this.baseURL}/reviews/${reviewId}/start`);
    return response.data;
  }

  async cancelReview(reviewId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/reviews/${reviewId}`);
  }

  async getReviewProgress(reviewId: string): Promise<{
    completionPercentage: number;
    checklistProgress: number;
    timeSpent: number;
    estimatedTimeRemaining: number;
    activitiesCount: number;
  }> {
    const response = await axios.get(`${this.baseURL}/reviews/${reviewId}/progress`);
    return response.data;
  }

  async getUserReviewDashboard(userId: string): Promise<{
    assignedReviews: Review[];
    overdueReviews: Review[];
    recentlyCompleted: Review[];
    statistics: {
      totalAssigned: number;
      completed: number;
      overdue: number;
      averageCompletionTime: number;
    };
  }> {
    const response = await axios.get(`${this.baseURL}/reviews/user/${userId}/dashboard`);
    return response.data;
  }

  async getDocumentReviews(documentType: string, documentId: string, includeHistory = false): Promise<Review[]> {
    const response = await axios.get<Review[]>(`${this.baseURL}/reviews/document/${documentType}/${documentId}`, {
      params: { includeHistory }
    });
    return response.data;
  }

  // Notification API methods
  async getUserNotifications(userId: string, filters?: {
    types?: string[];
    status?: string[];
    isRead?: boolean;
    priority?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Notification[]> {
    const response = await axios.get<Notification[]>(`${this.baseURL}/notifications/user/${userId}`, {
      params: filters
    });
    return response.data;
  }

  async markNotificationAsRead(notificationId: string): Promise<Notification> {
    const response = await axios.put<Notification>(`${this.baseURL}/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllNotificationsAsRead(userId: string): Promise<{ count: number }> {
    const response = await axios.put(`${this.baseURL}/notifications/user/${userId}/read-all`);
    return response.data;
  }

  async deleteNotification(notificationId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/notifications/${notificationId}`);
  }

  async getNotificationStats(userId: string): Promise<{
    totalNotifications: number;
    unreadNotifications: number;
    notificationsByType: Record<string, number>;
    notificationsByStatus: Record<string, number>;
  }> {
    const response = await axios.get(`${this.baseURL}/notifications/user/${userId}/stats`);
    return response.data;
  }

  // Activity API methods
  async getDocumentActivities(documentType: string, documentId: string, filters?: {
    activityTypes?: string[];
    userId?: string;
    relatedEntityType?: string;
    limit?: number;
    offset?: number;
  }): Promise<Activity[]> {
    const response = await axios.get<Activity[]>(`${this.baseURL}/activities/document/${documentType}/${documentId}`, {
      params: filters
    });
    return response.data;
  }

  async getUserActivities(userId: string, filters?: {
    documentType?: string;
    documentId?: string;
    activityTypes?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Activity[]> {
    const response = await axios.get<Activity[]>(`${this.baseURL}/activities/user/${userId}`, {
      params: filters
    });
    return response.data;
  }

  async getGlobalActivityFeed(filters?: {
    documentType?: string;
    activityTypes?: string[];
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Activity[]> {
    const response = await axios.get<Activity[]>(`${this.baseURL}/activities/feed`, {
      params: filters
    });
    return response.data;
  }

  async getDocumentActivitySummary(documentType: string, documentId: string, timeRange?: {
    startDate: string;
    endDate: string;
  }): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    activitiesByUser: Record<string, number>;
    recentActivities: Activity[];
    mostActiveUsers: Array<{
      userId: string;
      userName: string;
      activityCount: number;
    }>;
  }> {
    const response = await axios.get(`${this.baseURL}/activities/document/${documentType}/${documentId}/summary`, {
      params: timeRange
    });
    return response.data;
  }

  // Collaboration API methods
  async startEditSession(documentType: string, documentId: string, sessionData?: any): Promise<{
    id: string;
    documentType: string;
    documentId: string;
    userId: string;
    userName: string;
    startedAt: string;
    sessionData?: any;
  }> {
    const response = await axios.post(`${this.baseURL}/collaboration/sessions/start`, {
      documentType,
      documentId,
      sessionData
    });
    return response.data;
  }

  async endEditSession(sessionId: string, documentType: string, documentId: string): Promise<void> {
    await axios.post(`${this.baseURL}/collaboration/sessions/${sessionId}/end`, {
      documentType,
      documentId
    });
  }

  async sendSessionHeartbeat(sessionId: string): Promise<void> {
    await axios.post(`${this.baseURL}/collaboration/sessions/${sessionId}/heartbeat`);
  }

  async getDocumentSessions(documentType: string, documentId: string): Promise<EditSession[]> {
    const response = await axios.get<EditSession[]>(`${this.baseURL}/collaboration/sessions/document/${documentType}/${documentId}`);
    return response.data;
  }

  async getCollaborationState(documentType: string, documentId: string): Promise<CollaborationState> {
    const response = await axios.get<CollaborationState>(`${this.baseURL}/collaboration/state/${documentType}/${documentId}`);
    return response.data;
  }

  async subscribeToDocument(documentType: string, documentId: string, subscriptionTypes: string[], preferences?: any): Promise<{
    id: string;
    documentType: string;
    documentId: string;
    userId: string;
    userName: string;
    subscriptionTypes: string[];
    preferences?: any;
  }> {
    const response = await axios.post(`${this.baseURL}/collaboration/subscriptions`, {
      documentType,
      documentId,
      subscriptionTypes,
      preferences
    });
    return response.data;
  }

  async unsubscribeFromDocument(documentType: string, documentId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/collaboration/subscriptions/${documentType}/${documentId}`);
  }

  async getDocumentSubscribers(documentType: string, documentId: string): Promise<Array<{
    id: string;
    userId: string;
    userName: string;
    subscriptionTypes: string[];
    preferences?: any;
  }>> {
    const response = await axios.get(`${this.baseURL}/collaboration/subscriptions/${documentType}/${documentId}`);
    return response.data;
  }

  // Real-time events via Server-Sent Events
  createEventStream(): EventSource {
    return new EventSource(`${this.baseURL}/collaboration/events/stream`);
  }

  // Utility methods
  async logUserAccess(documentType: string, documentId: string): Promise<void> {
    await axios.post(`${this.baseURL}/activities/user-accessed`, {
      documentType,
      documentId
    });
  }

  async extractMentions(commentText: string): Promise<{ mentions: string[] }> {
    const response = await axios.post(`${this.baseURL}/comments/extract-mentions`, {
      commentText
    });
    return response.data;
  }

  async getAnnotationTypes(): Promise<Array<{
    value: string;
    label: string;
    description: string;
  }>> {
    const response = await axios.get(`${this.baseURL}/annotations/types`);
    return response.data;
  }

  async getReviewTypes(): Promise<Array<{
    value: string;
    label: string;
    description: string;
  }>> {
    const response = await axios.get(`${this.baseURL}/reviews/types`);
    return response.data;
  }

  async getNotificationTypes(): Promise<Array<{
    value: string;
    label: string;
    description: string;
  }>> {
    const response = await axios.get(`${this.baseURL}/notifications/types`);
    return response.data;
  }

  async getActivityTypes(): Promise<Array<{
    value: string;
    label: string;
    description: string;
  }>> {
    const response = await axios.get(`${this.baseURL}/activities/types`);
    return response.data;
  }
}

export const collaborationApi = new CollaborationApi();
export default collaborationApi;