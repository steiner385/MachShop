import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';

// Mock Prisma enums
const ConflictType = {
  CONCURRENT_EDIT: 'CONCURRENT_EDIT',
  FIELD_CONFLICT: 'FIELD_CONFLICT',
  VERSION_CONFLICT: 'VERSION_CONFLICT'
} as const;

const ResolutionStrategy = {
  MANUAL_MERGE: 'MANUAL_MERGE',
  AUTO_ACCEPT_LATEST: 'AUTO_ACCEPT_LATEST',
  AUTO_ACCEPT_OLDEST: 'AUTO_ACCEPT_OLDEST'
} as const;

// Mock Prisma Client
const mockPrisma = {
  documentEditSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn()
  },
  conflictResolution: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  },
  documentSubscription: {
    upsert: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn()
  },
  $disconnect: vi.fn(),
  $on: vi.fn()
} as unknown as PrismaClient;

// Mock logger
vi.mock('../../utils/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock PrismaClient constructor
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
  ConflictType: ConflictType,
  ResolutionStrategy: ResolutionStrategy
}));

// Define interfaces for testing
interface EditSessionInput {
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  sessionData?: any;
  metadata?: any;
}

interface ConflictInput {
  documentType: string;
  documentId: string;
  conflictType: any;
  conflictData: any;
  affectedUsers: string[];
  detectedById: string;
  detectedByName: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ConflictResolutionInput {
  conflictId: string;
  resolutionStrategy: any;
  resolutionData: any;
  resolvedById: string;
  resolvedByName: string;
  notes?: string;
}

interface SubscriptionInput {
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  subscriptionTypes: string[];
  preferences?: any;
}

describe('CollaborationService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear the module cache and reimport
    vi.resetModules();

    // Import service after mocks are set up
    const { default: collaborationService } = await import('../../services/CollaborationService');
    service = collaborationService;

    // Replace internal prisma with mock
    (service as any).prisma = mockPrisma;
    (service as any).activeSessions = new Map();
    (service as any).documentUsers = new Map();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateSessionActivity', () => {
    it('should update session activity when session exists in memory', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        sessionId,
        documentType: 'workorder',
        documentId: 'doc-123',
        userId: 'user-123',
        userName: 'Test User',
        startedAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      // Set up in-memory session
      (service as any).activeSessions.set(sessionId, mockSession);

      await service.updateSessionActivity(sessionId);

      expect(mockPrisma.documentEditSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { lastActivity: expect.any(Date) }
      });

      // Check that in-memory session was updated
      const updatedSession = (service as any).activeSessions.get(sessionId);
      expect(updatedSession.lastActivity).toBeInstanceOf(Date);
    });

    it('should not update database when session does not exist in memory', async () => {
      const sessionId = 'nonexistent-session';

      await service.updateSessionActivity(sessionId);

      expect(mockPrisma.documentEditSession.update).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      const sessionId = 'session-123';
      const mockSession = {
        sessionId,
        documentType: 'workorder',
        documentId: 'doc-123',
        userId: 'user-123',
        userName: 'Test User',
        startedAt: new Date(),
        lastActivity: new Date(),
        isActive: true
      };

      (service as any).activeSessions.set(sessionId, mockSession);
      mockPrisma.documentEditSession.update.mockRejectedValue(new Error('Database error'));

      // Should not throw, just log error
      await expect(service.updateSessionActivity(sessionId)).resolves.toBeUndefined();
    });
  });

  describe('getActiveDocumentSessions', () => {
    it('should return active sessions for specific document', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';

      const mockSessions = [
        {
          sessionId: 'session-1',
          documentType,
          documentId,
          userId: 'user-1',
          userName: 'User 1',
          startedAt: new Date(),
          lastActivity: new Date(),
          isActive: true
        },
        {
          sessionId: 'session-2',
          documentType,
          documentId,
          userId: 'user-2',
          userName: 'User 2',
          startedAt: new Date(),
          lastActivity: new Date(),
          isActive: true
        },
        {
          sessionId: 'session-3',
          documentType: 'other',
          documentId: 'other-doc',
          userId: 'user-3',
          userName: 'User 3',
          startedAt: new Date(),
          lastActivity: new Date(),
          isActive: true
        }
      ];

      // Set up in-memory sessions
      mockSessions.forEach(session => {
        (service as any).activeSessions.set(session.sessionId, session);
      });

      const result = await service.getActiveDocumentSessions(documentType, documentId);

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[1].userId).toBe('user-2');
      expect(result.every(s => s.documentType === documentType && s.documentId === documentId)).toBe(true);
    });

    it('should return empty array when no active sessions exist', async () => {
      const result = await service.getActiveDocumentSessions('workorder', 'doc-123');

      expect(result).toEqual([]);
    });

    it('should filter out inactive sessions', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';

      const activeSessions = [
        {
          sessionId: 'active-session',
          documentType,
          documentId,
          userId: 'user-1',
          userName: 'User 1',
          startedAt: new Date(),
          lastActivity: new Date(),
          isActive: true
        },
        {
          sessionId: 'inactive-session',
          documentType,
          documentId,
          userId: 'user-2',
          userName: 'User 2',
          startedAt: new Date(),
          lastActivity: new Date(),
          isActive: false
        }
      ];

      activeSessions.forEach(session => {
        (service as any).activeSessions.set(session.sessionId, session);
      });

      const result = await service.getActiveDocumentSessions(documentType, documentId);

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-1');
    });

    it('should handle errors and throw AppError', async () => {
      // Force an error by making activeSessions.values() throw
      const originalValues = (service as any).activeSessions.values;
      (service as any).activeSessions.values = () => {
        throw new Error('Memory error');
      };

      await expect(service.getActiveDocumentSessions('workorder', 'doc-123'))
        .rejects.toThrow('Failed to get active document sessions');

      // Restore original method
      (service as any).activeSessions.values = originalValues;
    });
  });

  describe('startEditSession', () => {
    const mockInput: EditSessionInput = {
      documentType: 'workorder',
      documentId: 'doc-123',
      userId: 'user-123',
      userName: 'Test User',
      sessionData: { section: 'details' },
      metadata: { version: '1.0' }
    };

    it('should create new edit session successfully', async () => {
      const mockSession = {
        id: 'session-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        startedAt: new Date(),
        endedAt: null,
        sessionData: mockInput.sessionData,
        metadata: mockInput.metadata,
        lastActivity: new Date()
      };

      mockPrisma.documentEditSession.findFirst.mockResolvedValue(null);
      mockPrisma.documentEditSession.create.mockResolvedValue(mockSession);

      const result = await service.startEditSession(mockInput);

      expect(mockPrisma.documentEditSession.create).toHaveBeenCalledWith({
        data: {
          documentType: mockInput.documentType,
          documentId: mockInput.documentId,
          userId: mockInput.userId,
          userName: mockInput.userName,
          sessionData: mockInput.sessionData,
          metadata: mockInput.metadata
        }
      });

      expect(result).toEqual(mockSession);

      // Check in-memory tracking
      const activeSession = (service as any).activeSessions.get(mockSession.id);
      expect(activeSession).toBeDefined();
      expect(activeSession.userId).toBe(mockInput.userId);

      // Check document users tracking
      const documentKey = `${mockInput.documentType}:${mockInput.documentId}`;
      const documentUsers = (service as any).documentUsers.get(documentKey);
      expect(documentUsers.has(mockInput.userId)).toBe(true);
    });

    it('should end existing session before creating new one', async () => {
      const existingSession = {
        id: 'existing-session',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        startedAt: new Date(),
        endedAt: null
      };

      const newSession = {
        id: 'new-session',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        startedAt: new Date(),
        endedAt: null,
        sessionData: mockInput.sessionData,
        metadata: mockInput.metadata
      };

      mockPrisma.documentEditSession.findFirst.mockResolvedValue(existingSession);
      mockPrisma.documentEditSession.update.mockResolvedValue({
        ...existingSession,
        endedAt: new Date()
      });
      mockPrisma.documentEditSession.create.mockResolvedValue(newSession);

      const result = await service.startEditSession(mockInput);

      // Should have ended existing session
      expect(mockPrisma.documentEditSession.update).toHaveBeenCalledWith({
        where: { id: existingSession.id },
        data: { endedAt: expect.any(Date) }
      });

      // Should have created new session
      expect(mockPrisma.documentEditSession.create).toHaveBeenCalled();
      expect(result.id).toBe('new-session');
    });

    it('should emit USER_JOINED event', async () => {
      const mockSession = {
        id: 'session-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        startedAt: new Date(),
        endedAt: null,
        sessionData: mockInput.sessionData,
        metadata: mockInput.metadata
      };

      mockPrisma.documentEditSession.findFirst.mockResolvedValue(null);
      mockPrisma.documentEditSession.create.mockResolvedValue(mockSession);

      const emitSpy = vi.spyOn(service, 'emit');

      await service.startEditSession(mockInput);

      expect(emitSpy).toHaveBeenCalledWith('realtime-event', expect.objectContaining({
        type: 'USER_JOINED',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        data: { sessionId: mockSession.id }
      }));
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.documentEditSession.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(service.startEditSession(mockInput))
        .rejects.toThrow('Failed to start edit session');
    });
  });

  describe('endEditSession', () => {
    it('should end existing edit session successfully', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';
      const userId = 'user-123';

      const existingSession = {
        id: 'session-123',
        documentType,
        documentId,
        userId,
        userName: 'Test User',
        startedAt: new Date(),
        endedAt: null
      };

      mockPrisma.documentEditSession.findFirst.mockResolvedValue(existingSession);
      mockPrisma.documentEditSession.update.mockResolvedValue({
        ...existingSession,
        endedAt: new Date()
      });

      // Set up in-memory state
      (service as any).activeSessions.set(existingSession.id, {
        sessionId: existingSession.id,
        documentType,
        documentId,
        userId,
        userName: 'Test User',
        startedAt: existingSession.startedAt,
        lastActivity: new Date(),
        isActive: true
      });

      const documentKey = `${documentType}:${documentId}`;
      (service as any).documentUsers.set(documentKey, new Set([userId]));

      const emitSpy = vi.spyOn(service, 'emit');

      await service.endEditSession(documentType, documentId, userId);

      expect(mockPrisma.documentEditSession.update).toHaveBeenCalledWith({
        where: { id: existingSession.id },
        data: { endedAt: expect.any(Date) }
      });

      // Check in-memory cleanup
      expect((service as any).activeSessions.has(existingSession.id)).toBe(false);
      expect((service as any).documentUsers.has(documentKey)).toBe(false);

      // Check event emission
      expect(emitSpy).toHaveBeenCalledWith('realtime-event', expect.objectContaining({
        type: 'USER_LEFT',
        documentType,
        documentId,
        userId,
        userName: existingSession.userName
      }));
    });

    it('should handle case when no existing session found', async () => {
      mockPrisma.documentEditSession.findFirst.mockResolvedValue(null);

      // Should not throw error
      await expect(service.endEditSession('workorder', 'doc-123', 'user-123'))
        .resolves.toBeUndefined();

      expect(mockPrisma.documentEditSession.update).not.toHaveBeenCalled();
    });

    it('should preserve document users when other users still active', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';
      const userId1 = 'user-1';
      const userId2 = 'user-2';

      const existingSession = {
        id: 'session-123',
        documentType,
        documentId,
        userId: userId1,
        userName: 'Test User 1',
        startedAt: new Date(),
        endedAt: null
      };

      mockPrisma.documentEditSession.findFirst.mockResolvedValue(existingSession);
      mockPrisma.documentEditSession.update.mockResolvedValue({
        ...existingSession,
        endedAt: new Date()
      });

      // Set up document with multiple users
      const documentKey = `${documentType}:${documentId}`;
      (service as any).documentUsers.set(documentKey, new Set([userId1, userId2]));

      await service.endEditSession(documentType, documentId, userId1);

      // Document should still exist with remaining user
      const documentUsers = (service as any).documentUsers.get(documentKey);
      expect(documentUsers.has(userId1)).toBe(false);
      expect(documentUsers.has(userId2)).toBe(true);
      expect((service as any).documentUsers.has(documentKey)).toBe(true);
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.documentEditSession.findFirst.mockRejectedValue(new Error('Database error'));

      await expect(service.endEditSession('workorder', 'doc-123', 'user-123'))
        .rejects.toThrow('Failed to end edit session');
    });
  });

  describe('detectConflict', () => {
    const mockInput: ConflictInput = {
      documentType: 'workorder',
      documentId: 'doc-123',
      conflictType: ConflictType.CONCURRENT_EDIT,
      conflictData: { field: 'description', oldValue: 'old', newValue: 'new' },
      affectedUsers: ['user-1', 'user-2'],
      detectedById: 'user-1',
      detectedByName: 'Test User 1',
      severity: 'MEDIUM'
    };

    it('should create conflict and emit event', async () => {
      const mockConflict = {
        id: 'conflict-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        conflictType: mockInput.conflictType,
        conflictData: mockInput.conflictData,
        affectedUsers: mockInput.affectedUsers,
        detectedById: mockInput.detectedById,
        detectedByName: mockInput.detectedByName,
        severity: mockInput.severity,
        detectedAt: new Date(),
        isResolved: false
      };

      mockPrisma.conflictResolution.create.mockResolvedValue(mockConflict);

      const emitSpy = vi.spyOn(service, 'emit');

      const result = await service.detectConflict(mockInput);

      expect(mockPrisma.conflictResolution.create).toHaveBeenCalledWith({
        data: {
          documentType: mockInput.documentType,
          documentId: mockInput.documentId,
          conflictType: mockInput.conflictType,
          conflictData: mockInput.conflictData,
          affectedUsers: mockInput.affectedUsers,
          detectedById: mockInput.detectedById,
          detectedByName: mockInput.detectedByName,
          severity: mockInput.severity
        }
      });

      expect(result).toEqual(mockConflict);

      expect(emitSpy).toHaveBeenCalledWith('realtime-event', expect.objectContaining({
        type: 'CONFLICT_DETECTED',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.detectedById,
        userName: mockInput.detectedByName,
        data: expect.objectContaining({
          conflictId: mockConflict.id,
          conflictType: mockInput.conflictType,
          severity: mockInput.severity,
          affectedUsers: mockInput.affectedUsers
        })
      }));
    });

    it('should handle different severity levels', async () => {
      const highSeverityInput = { ...mockInput, severity: 'HIGH' as const };
      const mockConflict = {
        id: 'conflict-123',
        ...highSeverityInput,
        detectedAt: new Date(),
        isResolved: false
      };

      mockPrisma.conflictResolution.create.mockResolvedValue(mockConflict);

      const result = await service.detectConflict(highSeverityInput);

      expect(result.severity).toBe('HIGH');
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.conflictResolution.create.mockRejectedValue(new Error('Database error'));

      await expect(service.detectConflict(mockInput))
        .rejects.toThrow('Failed to detect conflict');
    });
  });

  describe('resolveConflict', () => {
    const mockInput: ConflictResolutionInput = {
      conflictId: 'conflict-123',
      resolutionStrategy: ResolutionStrategy.MANUAL_MERGE,
      resolutionData: { mergedValue: 'merged content' },
      resolvedById: 'user-1',
      resolvedByName: 'Test User 1',
      notes: 'Manually merged conflicting changes'
    };

    it('should resolve conflict and emit event', async () => {
      const mockResolvedConflict = {
        id: mockInput.conflictId,
        documentType: 'workorder',
        documentId: 'doc-123',
        conflictType: ConflictType.CONCURRENT_EDIT,
        conflictData: { field: 'description' },
        affectedUsers: ['user-1', 'user-2'],
        detectedById: 'user-2',
        detectedByName: 'Test User 2',
        severity: 'MEDIUM',
        detectedAt: new Date(),
        isResolved: true,
        resolutionStrategy: mockInput.resolutionStrategy,
        resolutionData: mockInput.resolutionData,
        resolvedAt: new Date(),
        resolvedById: mockInput.resolvedById,
        resolvedByName: mockInput.resolvedByName,
        resolutionNotes: mockInput.notes
      };

      mockPrisma.conflictResolution.update.mockResolvedValue(mockResolvedConflict);

      const emitSpy = vi.spyOn(service, 'emit');

      const result = await service.resolveConflict(mockInput);

      expect(mockPrisma.conflictResolution.update).toHaveBeenCalledWith({
        where: { id: mockInput.conflictId },
        data: {
          isResolved: true,
          resolutionStrategy: mockInput.resolutionStrategy,
          resolutionData: mockInput.resolutionData,
          resolvedAt: expect.any(Date),
          resolvedById: mockInput.resolvedById,
          resolvedByName: mockInput.resolvedByName,
          resolutionNotes: mockInput.notes
        }
      });

      expect(result).toEqual(mockResolvedConflict);

      expect(emitSpy).toHaveBeenCalledWith('realtime-event', expect.objectContaining({
        type: 'CONFLICT_RESOLVED',
        documentType: mockResolvedConflict.documentType,
        documentId: mockResolvedConflict.documentId,
        userId: mockInput.resolvedById,
        userName: mockInput.resolvedByName,
        data: expect.objectContaining({
          conflictId: mockInput.conflictId,
          resolutionStrategy: mockInput.resolutionStrategy,
          affectedUsers: mockResolvedConflict.affectedUsers
        })
      }));
    });

    it('should handle different resolution strategies', async () => {
      const autoResolveInput = {
        ...mockInput,
        resolutionStrategy: ResolutionStrategy.AUTO_ACCEPT_LATEST
      };

      const mockResolvedConflict = {
        id: mockInput.conflictId,
        documentType: 'workorder',
        documentId: 'doc-123',
        conflictType: ConflictType.CONCURRENT_EDIT,
        affectedUsers: ['user-1', 'user-2'],
        isResolved: true,
        resolutionStrategy: ResolutionStrategy.AUTO_ACCEPT_LATEST,
        resolvedById: mockInput.resolvedById,
        resolvedByName: mockInput.resolvedByName
      };

      mockPrisma.conflictResolution.update.mockResolvedValue(mockResolvedConflict);

      const result = await service.resolveConflict(autoResolveInput);

      expect(result.resolutionStrategy).toBe(ResolutionStrategy.AUTO_ACCEPT_LATEST);
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.conflictResolution.update.mockRejectedValue(new Error('Database error'));

      await expect(service.resolveConflict(mockInput))
        .rejects.toThrow('Failed to resolve conflict');
    });
  });

  describe('subscribeToDocument', () => {
    const mockInput: SubscriptionInput = {
      documentType: 'workorder',
      documentId: 'doc-123',
      userId: 'user-123',
      userName: 'Test User',
      subscriptionTypes: ['comments', 'status_changes'],
      preferences: { email: true, push: false }
    };

    it('should create new subscription when none exists', async () => {
      const mockSubscription = {
        id: 'sub-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        subscriptionTypes: mockInput.subscriptionTypes,
        preferences: mockInput.preferences,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.documentSubscription.upsert.mockResolvedValue(mockSubscription);

      const result = await service.subscribeToDocument(mockInput);

      expect(mockPrisma.documentSubscription.upsert).toHaveBeenCalledWith({
        where: {
          documentType_documentId_userId: {
            documentType: mockInput.documentType,
            documentId: mockInput.documentId,
            userId: mockInput.userId
          }
        },
        create: {
          documentType: mockInput.documentType,
          documentId: mockInput.documentId,
          userId: mockInput.userId,
          userName: mockInput.userName,
          subscriptionTypes: mockInput.subscriptionTypes,
          preferences: mockInput.preferences
        },
        update: {
          subscriptionTypes: mockInput.subscriptionTypes,
          preferences: mockInput.preferences,
          isActive: true
        }
      });

      expect(result).toEqual(mockSubscription);
    });

    it('should update existing subscription', async () => {
      const updatedSubscriptionTypes = ['comments', 'status_changes', 'approvals'];
      const updatedInput = {
        ...mockInput,
        subscriptionTypes: updatedSubscriptionTypes
      };

      const mockUpdatedSubscription = {
        id: 'sub-123',
        documentType: mockInput.documentType,
        documentId: mockInput.documentId,
        userId: mockInput.userId,
        userName: mockInput.userName,
        subscriptionTypes: updatedSubscriptionTypes,
        preferences: mockInput.preferences,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.documentSubscription.upsert.mockResolvedValue(mockUpdatedSubscription);

      const result = await service.subscribeToDocument(updatedInput);

      expect(result.subscriptionTypes).toEqual(updatedSubscriptionTypes);
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.documentSubscription.upsert.mockRejectedValue(new Error('Database error'));

      await expect(service.subscribeToDocument(mockInput))
        .rejects.toThrow('Failed to create document subscription');
    });
  });

  describe('unsubscribeFromDocument', () => {
    it('should deactivate subscription', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';
      const userId = 'user-123';

      mockPrisma.documentSubscription.update.mockResolvedValue({
        id: 'sub-123',
        documentType,
        documentId,
        userId,
        isActive: false
      });

      await service.unsubscribeFromDocument(documentType, documentId, userId);

      expect(mockPrisma.documentSubscription.update).toHaveBeenCalledWith({
        where: {
          documentType_documentId_userId: {
            documentType,
            documentId,
            userId
          }
        },
        data: { isActive: false }
      });
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.documentSubscription.update.mockRejectedValue(new Error('Database error'));

      await expect(service.unsubscribeFromDocument('workorder', 'doc-123', 'user-123'))
        .rejects.toThrow('Failed to remove document subscription');
    });
  });

  describe('getDocumentSubscribers', () => {
    it('should return active subscribers for document', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';

      const mockSubscribers = [
        {
          id: 'sub-1',
          documentType,
          documentId,
          userId: 'user-1',
          userName: 'User 1',
          subscriptionTypes: ['comments'],
          isActive: true
        },
        {
          id: 'sub-2',
          documentType,
          documentId,
          userId: 'user-2',
          userName: 'User 2',
          subscriptionTypes: ['status_changes'],
          isActive: true
        }
      ];

      mockPrisma.documentSubscription.findMany.mockResolvedValue(mockSubscribers);

      const result = await service.getDocumentSubscribers(documentType, documentId);

      expect(mockPrisma.documentSubscription.findMany).toHaveBeenCalledWith({
        where: {
          documentType,
          documentId,
          isActive: true
        }
      });

      expect(result).toEqual(mockSubscribers);
    });

    it('should return empty array when no subscribers found', async () => {
      mockPrisma.documentSubscription.findMany.mockResolvedValue([]);

      const result = await service.getDocumentSubscribers('workorder', 'doc-123');

      expect(result).toEqual([]);
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.documentSubscription.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getDocumentSubscribers('workorder', 'doc-123'))
        .rejects.toThrow('Failed to get document subscribers');
    });
  });

  describe('getDocumentConflictHistory', () => {
    it('should return conflicts ordered by detection date', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';

      const mockConflicts = [
        {
          id: 'conflict-2',
          documentType,
          documentId,
          detectedAt: new Date('2024-01-02'),
          isResolved: true
        },
        {
          id: 'conflict-1',
          documentType,
          documentId,
          detectedAt: new Date('2024-01-01'),
          isResolved: false
        }
      ];

      mockPrisma.conflictResolution.findMany.mockResolvedValue(mockConflicts);

      const result = await service.getDocumentConflictHistory(documentType, documentId);

      expect(mockPrisma.conflictResolution.findMany).toHaveBeenCalledWith({
        where: { documentType, documentId },
        orderBy: { detectedAt: 'desc' }
      });

      expect(result).toEqual(mockConflicts);
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.conflictResolution.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getDocumentConflictHistory('workorder', 'doc-123'))
        .rejects.toThrow('Failed to get document conflict history');
    });
  });

  describe('getDocumentCollaborationState', () => {
    it('should return complete collaboration state', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';

      // Mock active sessions in memory
      const mockActiveSessions = [
        {
          sessionId: 'session-1',
          documentType,
          documentId,
          userId: 'user-1',
          userName: 'User 1',
          startedAt: new Date('2024-01-01T10:00:00Z'),
          lastActivity: new Date('2024-01-01T10:30:00Z'),
          isActive: true
        }
      ];

      // Mock conflicts
      const mockConflicts = [
        {
          id: 'conflict-1',
          conflictType: 'CONCURRENT_EDIT',
          severity: 'MEDIUM',
          detectedAt: new Date('2024-01-01T10:15:00Z'),
          isResolved: false
        }
      ];

      // Mock subscribers
      const mockSubscribers = [
        {
          id: 'sub-1',
          userId: 'user-2',
          userName: 'User 2',
          subscriptionTypes: ['comments', 'status_changes'],
          isActive: true
        }
      ];

      // Set up in-memory sessions
      (service as any).activeSessions.set('session-1', mockActiveSessions[0]);

      mockPrisma.conflictResolution.findMany.mockResolvedValue(mockConflicts);
      mockPrisma.documentSubscription.findMany.mockResolvedValue(mockSubscribers);

      const result = await service.getDocumentCollaborationState(documentType, documentId);

      expect(result).toEqual({
        documentType,
        documentId,
        activeSessions: mockActiveSessions,
        activeUsers: [
          {
            userId: 'user-1',
            userName: 'User 1',
            joinedAt: new Date('2024-01-01T10:00:00Z'),
            lastActivity: new Date('2024-01-01T10:30:00Z')
          }
        ],
        conflicts: [
          {
            id: 'conflict-1',
            type: 'CONCURRENT_EDIT',
            severity: 'MEDIUM',
            detectedAt: new Date('2024-01-01T10:15:00Z'),
            isResolved: false
          }
        ],
        subscribers: [
          {
            userId: 'user-2',
            userName: 'User 2',
            subscriptionTypes: ['comments', 'status_changes']
          }
        ]
      });

      // Verify correct database calls
      expect(mockPrisma.conflictResolution.findMany).toHaveBeenCalledWith({
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
    });

    it('should handle empty collaboration state', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-456';

      mockPrisma.conflictResolution.findMany.mockResolvedValue([]);
      mockPrisma.documentSubscription.findMany.mockResolvedValue([]);

      const result = await service.getDocumentCollaborationState(documentType, documentId);

      expect(result).toEqual({
        documentType,
        documentId,
        activeSessions: [],
        activeUsers: [],
        conflicts: [],
        subscribers: []
      });
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.conflictResolution.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getDocumentCollaborationState('workorder', 'doc-123'))
        .rejects.toThrow('Failed to get document collaboration state');
    });
  });

  describe('handleContentChange', () => {
    it('should emit content change event with no conflicts', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';
      const userId = 'user-1';
      const userName = 'User 1';
      const changeData = { field: 'description', newValue: 'Updated content' };

      const emitSpy = vi.spyOn(service, 'emit');

      await service.handleContentChange(documentType, documentId, userId, userName, changeData);

      expect(emitSpy).toHaveBeenCalledWith('realtime-event', expect.objectContaining({
        type: 'CONTENT_CHANGED',
        documentType,
        documentId,
        userId,
        userName,
        data: changeData
      }));
    });

    it('should detect conflict when other users are active', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';
      const userId = 'user-1';
      const userName = 'User 1';
      const changeData = { field: 'description', newValue: 'Updated content' };

      // Mock Date to ensure consistent timing
      const mockNow = new Date('2024-01-01T10:00:00Z');
      const mockTwoSecondsAgo = new Date('2024-01-01T09:59:58Z'); // 2 seconds before mockNow

      vi.useFakeTimers();
      vi.setSystemTime(mockNow);

      // Set up active session for another user (within 5 second threshold)
      const otherSession = {
        sessionId: 'session-2',
        documentType,
        documentId,
        userId: 'user-2',
        userName: 'User 2',
        startedAt: new Date('2024-01-01T09:55:00Z'),
        lastActivity: mockTwoSecondsAgo, // 2 seconds ago (within 5-second threshold)
        isActive: true
      };

      // Set up the current user's session too (so it gets filtered out)
      const currentUserSession = {
        sessionId: 'session-1',
        documentType,
        documentId,
        userId: 'user-1',
        userName: 'User 1',
        startedAt: new Date('2024-01-01T09:55:00Z'),
        lastActivity: mockNow,
        isActive: true
      };

      (service as any).activeSessions.set('session-1', currentUserSession);
      (service as any).activeSessions.set('session-2', otherSession);

      const mockConflict = {
        id: 'conflict-123',
        documentType,
        documentId,
        conflictType: ConflictType.CONCURRENT_EDIT,
        severity: 'MEDIUM',
        detectedAt: new Date(),
        isResolved: false
      };

      mockPrisma.conflictResolution.create.mockResolvedValue(mockConflict);

      const emitSpy = vi.spyOn(service, 'emit');

      await service.handleContentChange(documentType, documentId, userId, userName, changeData);

      // Should create conflict
      expect(mockPrisma.conflictResolution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentType,
          documentId,
          conflictType: ConflictType.CONCURRENT_EDIT,
          severity: 'MEDIUM'
        })
      });

      // Should emit content change event
      expect(emitSpy).toHaveBeenCalledWith('realtime-event', expect.objectContaining({
        type: 'CONTENT_CHANGED'
      }));

      // Clean up fake timers
      vi.useRealTimers();
    });

    it('should not detect conflict when other users are inactive', async () => {
      const documentType = 'workorder';
      const documentId = 'doc-123';
      const userId = 'user-1';
      const userName = 'User 1';
      const changeData = { field: 'description', newValue: 'Updated content' };

      // Set up inactive session (old lastActivity)
      const oldSession = {
        sessionId: 'session-2',
        documentType,
        documentId,
        userId: 'user-2',
        userName: 'User 2',
        startedAt: new Date(),
        lastActivity: new Date(Date.now() - 10000), // 10 seconds ago (outside threshold)
        isActive: true
      };

      (service as any).activeSessions.set('session-2', oldSession);

      await service.handleContentChange(documentType, documentId, userId, userName, changeData);

      // Should not create conflict
      expect(mockPrisma.conflictResolution.create).not.toHaveBeenCalled();
    });
  });

  describe('getUserCollaborationStats', () => {
    const userId = 'user-123';

    it('should calculate user collaboration statistics', async () => {
      const mockSessions = [
        {
          startedAt: new Date('2024-01-01T10:00:00Z'),
          endedAt: new Date('2024-01-01T11:00:00Z'), // 1 hour session
          documentType: 'workorder',
          documentId: 'doc-1'
        },
        {
          startedAt: new Date('2024-01-01T14:00:00Z'),
          endedAt: new Date('2024-01-01T15:30:00Z'), // 1.5 hour session
          documentType: 'workorder',
          documentId: 'doc-2'
        },
        {
          startedAt: new Date('2024-01-01T16:00:00Z'),
          endedAt: null, // Ongoing session - should not count toward time
          documentType: 'workorder',
          documentId: 'doc-1'
        }
      ];

      mockPrisma.documentEditSession.findMany.mockResolvedValue(mockSessions);
      mockPrisma.conflictResolution.count
        .mockResolvedValueOnce(5) // conflicts detected
        .mockResolvedValueOnce(3); // conflicts resolved
      mockPrisma.documentSubscription.count.mockResolvedValue(7);

      const result = await service.getUserCollaborationStats(userId);

      expect(result).toEqual({
        totalSessions: 3,
        totalSessionTime: 9000000, // 2.5 hours in milliseconds
        documentsCollaborated: 2, // doc-1 and doc-2
        conflictsDetected: 5,
        conflictsResolved: 3,
        subscriptions: 7
      });

      // Verify correct queries
      expect(mockPrisma.documentEditSession.findMany).toHaveBeenCalledWith({
        where: { userId },
        select: {
          startedAt: true,
          endedAt: true,
          documentType: true,
          documentId: true
        }
      });
    });

    it('should handle time range filtering', async () => {
      const timeRange = {
        start: new Date('2024-01-01T00:00:00Z'),
        end: new Date('2024-01-31T23:59:59Z')
      };

      mockPrisma.documentEditSession.findMany.mockResolvedValue([]);
      mockPrisma.conflictResolution.count.mockResolvedValue(0);
      mockPrisma.documentSubscription.count.mockResolvedValue(0);

      await service.getUserCollaborationStats(userId, timeRange);

      expect(mockPrisma.documentEditSession.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          startedAt: {
            gte: timeRange.start,
            lte: timeRange.end
          }
        },
        select: {
          startedAt: true,
          endedAt: true,
          documentType: true,
          documentId: true
        }
      });

      expect(mockPrisma.conflictResolution.count).toHaveBeenCalledWith({
        where: {
          detectedById: userId,
          detectedAt: { gte: timeRange.start, lte: timeRange.end }
        }
      });
    });

    it('should handle empty stats', async () => {
      mockPrisma.documentEditSession.findMany.mockResolvedValue([]);
      mockPrisma.conflictResolution.count.mockResolvedValue(0);
      mockPrisma.documentSubscription.count.mockResolvedValue(0);

      const result = await service.getUserCollaborationStats(userId);

      expect(result).toEqual({
        totalSessions: 0,
        totalSessionTime: 0,
        documentsCollaborated: 0,
        conflictsDetected: 0,
        conflictsResolved: 0,
        subscriptions: 0
      });
    });

    it('should handle database errors and throw AppError', async () => {
      mockPrisma.documentEditSession.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getUserCollaborationStats(userId))
        .rejects.toThrow('Failed to get user collaboration stats');
    });
  });

  describe('disconnect', () => {
    it('should disconnect from database', async () => {
      await service.disconnect();

      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });
  });
});