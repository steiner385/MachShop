import { PrismaClient, DocumentEditSession, ConflictResolution, DocumentSubscription, ConflictType, ResolutionStrategy } from '@prisma/client';
import logger from '../lib/logger';
import { createError } from '../lib/errorHandler';
import { EventEmitter } from 'events';

/**
 * TypeScript interfaces for Collaboration Operations
 */
export interface EditSessionInput {
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  sessionData?: any;
  metadata?: any;
}

export interface ConflictInput {
  documentType: string;
  documentId: string;
  conflictType: ConflictType;
  conflictData: any;
  affectedUsers: string[];
  detectedById: string;
  detectedByName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface ConflictResolutionInput {
  conflictId: string;
  resolutionStrategy: ResolutionStrategy;
  resolutionData: any;
  resolvedById: string;
  resolvedByName: string;
  notes?: string;
}

export interface SubscriptionInput {
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  subscriptionTypes: string[];
  preferences?: any;
}

export interface RealTimeEvent {
  type: 'USER_JOINED' | 'USER_LEFT' | 'CONTENT_CHANGED' | 'COMMENT_ADDED' | 'ANNOTATION_ADDED' | 'CONFLICT_DETECTED' | 'CONFLICT_RESOLVED';
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  data?: any;
  timestamp: Date;
}

export interface ActiveSession {
  sessionId: string;
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  startedAt: Date;
  lastActivity: Date;
  isActive: boolean;
  sessionData?: any;
}

export interface DocumentCollaborationState {
  documentType: string;
  documentId: string;
  activeSessions: ActiveSession[];
  activeUsers: Array<{
    userId: string;
    userName: string;
    joinedAt: Date;
    lastActivity: Date;
  }>;
  conflicts: Array<{
    id: string;
    type: ConflictType;
    severity: string;
    detectedAt: Date;
    isResolved: boolean;
  }>;
  subscribers: Array<{
    userId: string;
    userName: string;
    subscriptionTypes: string[];
  }>;
}

/**
 * Collaboration Service - Manages real-time collaboration features
 */
class CollaborationService extends EventEmitter {
  private prisma: PrismaClient;
  private activeSessions: Map<string, ActiveSession>;
  private documentUsers: Map<string, Set<string>>;

  constructor() {
    super();
    this.prisma = new PrismaClient({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.activeSessions = new Map();
    this.documentUsers = new Map();

    // Log Prisma events
    this.prisma.$on('query', (e) => {
      logger.debug('Prisma Query', { query: e.query, params: e.params, duration: e.duration });
    });

    this.prisma.$on('error', (e) => {
      logger.error('Prisma Error', { error: e.message, target: e.target });
    });

    // Clean up inactive sessions periodically
    setInterval(() => {
      this.cleanupInactiveSessions();
    }, 60000); // Every minute
  }

  /**
   * Start an edit session for a user on a document
   */
  async startEditSession(input: EditSessionInput): Promise<DocumentEditSession> {
    try {
      logger.info('Starting edit session', {
        documentType: input.documentType,
        documentId: input.documentId,
        userId: input.userId
      });

      // End any existing session for this user on this document
      await this.endEditSession(input.documentType, input.documentId, input.userId);

      const session = await this.prisma.documentEditSession.create({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          userId: input.userId,
          userName: input.userName,
          sessionData: input.sessionData,
          metadata: input.metadata,
        }
      });

      // Track in memory for real-time features
      const documentKey = `${input.documentType}:${input.documentId}`;
      const activeSession: ActiveSession = {
        sessionId: session.id,
        documentType: input.documentType,
        documentId: input.documentId,
        userId: input.userId,
        userName: input.userName,
        startedAt: session.startedAt,
        lastActivity: new Date(),
        isActive: true,
        sessionData: input.sessionData
      };

      this.activeSessions.set(session.id, activeSession);

      // Track users per document
      if (!this.documentUsers.has(documentKey)) {
        this.documentUsers.set(documentKey, new Set());
      }
      this.documentUsers.get(documentKey)!.add(input.userId);

      // Emit real-time event
      this.emitRealTimeEvent({
        type: 'USER_JOINED',
        documentType: input.documentType,
        documentId: input.documentId,
        userId: input.userId,
        userName: input.userName,
        timestamp: new Date(),
        data: { sessionId: session.id }
      });

      logger.info('Edit session started successfully', { sessionId: session.id });
      return session;
    } catch (error: any) {
      logger.error('Failed to start edit session', { error: error.message, input });
      throw createError('Failed to start edit session', 'SESSION_START_FAILED', 500, error);
    }
  }

  /**
   * End an edit session
   */
  async endEditSession(documentType: string, documentId: string, userId: string): Promise<void> {
    try {
      logger.info('Ending edit session', { documentType, documentId, userId });

      // Find and update existing session
      const existingSession = await this.prisma.documentEditSession.findFirst({
        where: {
          documentType,
          documentId,
          userId,
          endedAt: null
        }
      });

      if (existingSession) {
        await this.prisma.documentEditSession.update({
          where: { id: existingSession.id },
          data: { endedAt: new Date() }
        });

        // Remove from memory tracking
        this.activeSessions.delete(existingSession.id);

        const documentKey = `${documentType}:${documentId}`;
        if (this.documentUsers.has(documentKey)) {
          this.documentUsers.get(documentKey)!.delete(userId);
          if (this.documentUsers.get(documentKey)!.size === 0) {
            this.documentUsers.delete(documentKey);
          }
        }

        // Emit real-time event
        this.emitRealTimeEvent({
          type: 'USER_LEFT',
          documentType,
          documentId,
          userId,
          userName: existingSession.userName,
          timestamp: new Date(),
          data: { sessionId: existingSession.id }
        });

        logger.info('Edit session ended successfully', { sessionId: existingSession.id });
      }
    } catch (error: any) {
      logger.error('Failed to end edit session', { error: error.message, documentType, documentId, userId });
      throw createError('Failed to end edit session', 'SESSION_END_FAILED', 500, error);
    }
  }

  /**
   * Update session activity (heartbeat)
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.lastActivity = new Date();

        await this.prisma.documentEditSession.update({
          where: { id: sessionId },
          data: { lastActivity: new Date() }
        });
      }
    } catch (error: any) {
      logger.error('Failed to update session activity', { error: error.message, sessionId });
    }
  }

  /**
   * Get active sessions for a document
   */
  async getActiveDocumentSessions(documentType: string, documentId: string): Promise<ActiveSession[]> {
    try {
      const documentKey = `${documentType}:${documentId}`;
      const sessions = Array.from(this.activeSessions.values())
        .filter(session =>
          session.documentType === documentType &&
          session.documentId === documentId &&
          session.isActive
        );

      return sessions;
    } catch (error: any) {
      logger.error('Failed to get active document sessions', { error: error.message, documentType, documentId });
      throw createError('Failed to get active document sessions', 'SESSION_GET_FAILED', 500, error);
    }
  }

  /**
   * Detect and log a conflict
   */
  async detectConflict(input: ConflictInput): Promise<ConflictResolution> {
    try {
      logger.info('Detecting conflict', {
        documentType: input.documentType,
        documentId: input.documentId,
        conflictType: input.conflictType
      });

      const conflict = await this.prisma.conflictResolution.create({
        data: {
          documentType: input.documentType,
          documentId: input.documentId,
          conflictType: input.conflictType,
          conflictData: input.conflictData,
          affectedUsers: input.affectedUsers,
          detectedById: input.detectedById,
          detectedByName: input.detectedByName,
          severity: input.severity,
        }
      });

      // Emit real-time event to affected users
      this.emitRealTimeEvent({
        type: 'CONFLICT_DETECTED',
        documentType: input.documentType,
        documentId: input.documentId,
        userId: input.detectedById,
        userName: input.detectedByName,
        timestamp: new Date(),
        data: {
          conflictId: conflict.id,
          conflictType: input.conflictType,
          severity: input.severity,
          affectedUsers: input.affectedUsers
        }
      });

      logger.info('Conflict detected and logged', { conflictId: conflict.id });
      return conflict;
    } catch (error: any) {
      logger.error('Failed to detect conflict', { error: error.message, input });
      throw createError('Failed to detect conflict', 'CONFLICT_DETECT_FAILED', 500, error);
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(input: ConflictResolutionInput): Promise<ConflictResolution> {
    try {
      logger.info('Resolving conflict', { conflictId: input.conflictId });

      const resolvedConflict = await this.prisma.conflictResolution.update({
        where: { id: input.conflictId },
        data: {
          isResolved: true,
          resolutionStrategy: input.resolutionStrategy,
          resolutionData: input.resolutionData,
          resolvedAt: new Date(),
          resolvedById: input.resolvedById,
          resolvedByName: input.resolvedByName,
          resolutionNotes: input.notes,
        }
      });

      // Emit real-time event
      this.emitRealTimeEvent({
        type: 'CONFLICT_RESOLVED',
        documentType: resolvedConflict.documentType,
        documentId: resolvedConflict.documentId,
        userId: input.resolvedById,
        userName: input.resolvedByName,
        timestamp: new Date(),
        data: {
          conflictId: input.conflictId,
          resolutionStrategy: input.resolutionStrategy,
          affectedUsers: resolvedConflict.affectedUsers
        }
      });

      logger.info('Conflict resolved successfully', { conflictId: input.conflictId });
      return resolvedConflict;
    } catch (error: any) {
      logger.error('Failed to resolve conflict', { error: error.message, input });
      throw createError('Failed to resolve conflict', 'CONFLICT_RESOLVE_FAILED', 500, error);
    }
  }

  /**
   * Subscribe a user to document notifications
   */
  async subscribeToDocument(input: SubscriptionInput): Promise<DocumentSubscription> {
    try {
      logger.info('Creating document subscription', {
        documentType: input.documentType,
        documentId: input.documentId,
        userId: input.userId
      });

      const subscription = await this.prisma.documentSubscription.upsert({
        where: {
          documentType_documentId_userId: {
            documentType: input.documentType,
            documentId: input.documentId,
            userId: input.userId
          }
        },
        create: {
          documentType: input.documentType,
          documentId: input.documentId,
          userId: input.userId,
          userName: input.userName,
          subscriptionTypes: input.subscriptionTypes,
          preferences: input.preferences,
        },
        update: {
          subscriptionTypes: input.subscriptionTypes,
          preferences: input.preferences,
          isActive: true,
        }
      });

      logger.info('Document subscription created/updated', { subscriptionId: subscription.id });
      return subscription;
    } catch (error: any) {
      logger.error('Failed to create document subscription', { error: error.message, input });
      throw createError('Failed to create document subscription', 'SUBSCRIPTION_CREATE_FAILED', 500, error);
    }
  }

  /**
   * Unsubscribe a user from document notifications
   */
  async unsubscribeFromDocument(documentType: string, documentId: string, userId: string): Promise<void> {
    try {
      logger.info('Removing document subscription', { documentType, documentId, userId });

      await this.prisma.documentSubscription.update({
        where: {
          documentType_documentId_userId: {
            documentType,
            documentId,
            userId
          }
        },
        data: { isActive: false }
      });

      logger.info('Document subscription removed', { documentType, documentId, userId });
    } catch (error: any) {
      logger.error('Failed to remove document subscription', { error: error.message, documentType, documentId, userId });
      throw createError('Failed to remove document subscription', 'SUBSCRIPTION_REMOVE_FAILED', 500, error);
    }
  }

  /**
   * Get document subscribers
   */
  async getDocumentSubscribers(documentType: string, documentId: string): Promise<DocumentSubscription[]> {
    try {
      const subscribers = await this.prisma.documentSubscription.findMany({
        where: {
          documentType,
          documentId,
          isActive: true
        }
      });

      return subscribers;
    } catch (error: any) {
      logger.error('Failed to get document subscribers', { error: error.message, documentType, documentId });
      throw createError('Failed to get document subscribers', 'SUBSCRIBERS_GET_FAILED', 500, error);
    }
  }

  /**
   * Get collaboration state for a document
   */
  async getDocumentCollaborationState(documentType: string, documentId: string): Promise<DocumentCollaborationState> {
    try {
      logger.info('Getting document collaboration state', { documentType, documentId });

      // Get active sessions
      const activeSessions = await this.getActiveDocumentSessions(documentType, documentId);

      // Get active users
      const activeUsers = activeSessions.map(session => ({
        userId: session.userId,
        userName: session.userName,
        joinedAt: session.startedAt,
        lastActivity: session.lastActivity
      }));

      // Get unresolved conflicts
      const conflicts = await this.prisma.conflictResolution.findMany({
        where: {
          documentType,
          documentId,
          isResolved: false
        },
        select: {
          id: true,
          conflictType: true,
          severity: true,
          detectedAt: true,
          isResolved: true
        }
      });

      // Get subscribers
      const subscriberData = await this.getDocumentSubscribers(documentType, documentId);
      const subscribers = subscriberData.map(sub => ({
        userId: sub.userId,
        userName: sub.userName,
        subscriptionTypes: sub.subscriptionTypes as string[]
      }));

      const state: DocumentCollaborationState = {
        documentType,
        documentId,
        activeSessions,
        activeUsers,
        conflicts: conflicts.map(c => ({
          id: c.id,
          type: c.conflictType,
          severity: c.severity,
          detectedAt: c.detectedAt,
          isResolved: c.isResolved
        })),
        subscribers
      };

      logger.info('Document collaboration state retrieved', {
        documentType,
        documentId,
        activeUsers: activeUsers.length,
        conflicts: conflicts.length,
        subscribers: subscribers.length
      });

      return state;
    } catch (error: any) {
      logger.error('Failed to get document collaboration state', { error: error.message, documentType, documentId });
      throw createError('Failed to get document collaboration state', 'COLLABORATION_STATE_FAILED', 500, error);
    }
  }

  /**
   * Emit real-time event
   */
  private emitRealTimeEvent(event: RealTimeEvent): void {
    try {
      logger.debug('Emitting real-time event', {
        type: event.type,
        documentType: event.documentType,
        documentId: event.documentId,
        userId: event.userId
      });

      // Emit to all listeners (WebSocket handlers will pick this up)
      this.emit('realtime-event', event);

      // Also emit specific event types for targeted listening
      this.emit(`realtime-${event.type}`, event);
      this.emit(`document-${event.documentType}-${event.documentId}`, event);
    } catch (error: any) {
      logger.error('Failed to emit real-time event', { error: error.message, event });
    }
  }

  /**
   * Handle content change event
   */
  async handleContentChange(documentType: string, documentId: string, userId: string, userName: string, changeData: any): Promise<void> {
    try {
      // Check for conflicts with other active sessions
      const activeSessions = await this.getActiveDocumentSessions(documentType, documentId);
      const otherSessions = activeSessions.filter(session => session.userId !== userId);

      if (otherSessions.length > 0) {
        // Potential conflict - analyze the change
        const conflictDetected = await this.analyzeContentChangeForConflicts(
          documentType,
          documentId,
          changeData,
          userId,
          userName,
          otherSessions
        );

        if (conflictDetected) {
          logger.warn('Content change conflict detected', {
            documentType,
            documentId,
            userId,
            conflictingUsers: otherSessions.map(s => s.userId)
          });
        }
      }

      // Emit real-time event
      this.emitRealTimeEvent({
        type: 'CONTENT_CHANGED',
        documentType,
        documentId,
        userId,
        userName,
        timestamp: new Date(),
        data: changeData
      });
    } catch (error: any) {
      logger.error('Failed to handle content change', { error: error.message, documentType, documentId, userId });
    }
  }

  /**
   * Analyze content changes for potential conflicts
   */
  private async analyzeContentChangeForConflicts(
    documentType: string,
    documentId: string,
    changeData: any,
    userId: string,
    userName: string,
    otherSessions: ActiveSession[]
  ): Promise<boolean> {
    try {
      // Simple conflict detection logic - this can be enhanced based on document type
      const conflictThreshold = 5000; // 5 seconds
      const now = new Date();

      const recentlyActiveUsers = otherSessions.filter(session =>
        (now.getTime() - session.lastActivity.getTime()) < conflictThreshold
      );

      if (recentlyActiveUsers.length > 0) {
        // Detect concurrent editing conflict
        await this.detectConflict({
          documentType,
          documentId,
          conflictType: ConflictType.CONCURRENT_EDIT,
          conflictData: {
            changeData,
            conflictingUsers: recentlyActiveUsers.map(s => ({
              userId: s.userId,
              userName: s.userName,
              lastActivity: s.lastActivity
            }))
          },
          affectedUsers: [userId, ...recentlyActiveUsers.map(s => s.userId)],
          detectedById: userId,
          detectedByName: userName,
          severity: 'MEDIUM'
        });

        return true;
      }

      return false;
    } catch (error: any) {
      logger.error('Failed to analyze content changes for conflicts', { error: error.message });
      return false;
    }
  }

  /**
   * Clean up inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    try {
      const inactivityThreshold = 5 * 60 * 1000; // 5 minutes
      const now = new Date();

      const inactiveSessions = Array.from(this.activeSessions.values())
        .filter(session => (now.getTime() - session.lastActivity.getTime()) > inactivityThreshold);

      for (const session of inactiveSessions) {
        await this.endEditSession(session.documentType, session.documentId, session.userId);
      }

      if (inactiveSessions.length > 0) {
        logger.info('Cleaned up inactive sessions', { count: inactiveSessions.length });
      }
    } catch (error: any) {
      logger.error('Failed to cleanup inactive sessions', { error: error.message });
    }
  }

  /**
   * Get conflict history for a document
   */
  async getDocumentConflictHistory(documentType: string, documentId: string): Promise<ConflictResolution[]> {
    try {
      const conflicts = await this.prisma.conflictResolution.findMany({
        where: { documentType, documentId },
        orderBy: { detectedAt: 'desc' }
      });

      return conflicts;
    } catch (error: any) {
      logger.error('Failed to get document conflict history', { error: error.message, documentType, documentId });
      throw createError('Failed to get document conflict history', 'CONFLICT_HISTORY_FAILED', 500, error);
    }
  }

  /**
   * Get user's collaboration statistics
   */
  async getUserCollaborationStats(userId: string, timeRange?: { start: Date; end: Date }): Promise<{
    totalSessions: number;
    totalSessionTime: number; // in milliseconds
    documentsCollaborated: number;
    conflictsDetected: number;
    conflictsResolved: number;
    subscriptions: number;
  }> {
    try {
      const whereClause: any = { userId };

      if (timeRange) {
        whereClause.startedAt = {
          gte: timeRange.start,
          lte: timeRange.end
        };
      }

      const [sessions, conflicts, resolutions, subscriptions] = await Promise.all([
        this.prisma.documentEditSession.findMany({
          where: whereClause,
          select: {
            startedAt: true,
            endedAt: true,
            documentType: true,
            documentId: true
          }
        }),
        this.prisma.conflictResolution.count({
          where: {
            detectedById: userId,
            ...(timeRange ? { detectedAt: { gte: timeRange.start, lte: timeRange.end } } : {})
          }
        }),
        this.prisma.conflictResolution.count({
          where: {
            resolvedById: userId,
            ...(timeRange ? { resolvedAt: { gte: timeRange.start, lte: timeRange.end } } : {})
          }
        }),
        this.prisma.documentSubscription.count({
          where: { userId, isActive: true }
        })
      ]);

      const totalSessions = sessions.length;
      const totalSessionTime = sessions.reduce((total, session) => {
        if (session.endedAt) {
          return total + (session.endedAt.getTime() - session.startedAt.getTime());
        }
        return total;
      }, 0);

      const uniqueDocuments = new Set(sessions.map(s => `${s.documentType}:${s.documentId}`));
      const documentsCollaborated = uniqueDocuments.size;

      return {
        totalSessions,
        totalSessionTime,
        documentsCollaborated,
        conflictsDetected: conflicts,
        conflictsResolved: resolutions,
        subscriptions
      };
    } catch (error: any) {
      logger.error('Failed to get user collaboration stats', { error: error.message, userId });
      throw createError('Failed to get user collaboration stats', 'COLLABORATION_STATS_FAILED', 500, error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;