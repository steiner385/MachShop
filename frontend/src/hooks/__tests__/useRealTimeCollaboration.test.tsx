/**
 * Tests for Real-Time Collaboration Hooks
 *
 * Tests the complex real-time collaboration system including:
 * - useRealTimeCollaboration (main hook)
 * - usePresence (document-specific presence)
 * - useConflictDetection (conflict management)
 */

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test-utils/hooks';
import { createMockWebSocketForHook, createMockTimersForHook } from '@/test-utils/hooks';
import { mockAllAPIs } from '@/test-utils/mocks';
import {
  useRealTimeCollaboration,
  usePresence,
  useConflictDetection,
} from '../useRealTimeCollaboration';

// Mock the real-time collaboration service
const mockRealTimeCollaboration = {
  getConnectionStatus: vi.fn().mockReturnValue({
    connected: false,
    connecting: false,
    reconnecting: false,
    error: null,
  }),
  connect: vi.fn(),
  disconnect: vi.fn(),
  subscribeToDocument: vi.fn(),
  unsubscribeFromDocument: vi.fn(),
  updatePresence: vi.fn(),
  getPresenceUsers: vi.fn().mockReturnValue([]),
  on: vi.fn(),
  off: vi.fn(),
};

vi.mock('@/services/realTimeCollaboration', () => ({
  realTimeCollaboration: mockRealTimeCollaboration,
}));

// Mock antd message
const mockMessage = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
};

vi.mock('antd', () => ({
  message: mockMessage,
}));

describe('Real-Time Collaboration Hooks', () => {
  let websocketMock: ReturnType<typeof createMockWebSocketForHook>;
  let timers: ReturnType<typeof createMockTimersForHook>;

  beforeEach(() => {
    vi.clearAllMocks();
    websocketMock = createMockWebSocketForHook();
    timers = createMockTimersForHook();
    mockAllAPIs();

    // Reset connection status
    mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
      connected: false,
      connecting: false,
      reconnecting: false,
      error: null,
    });
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
  });

  describe('useRealTimeCollaboration Hook', () => {
    describe('Basic Functionality', () => {
      it('should initialize with correct default state', () => {
        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
          })
        );

        expect(result.current.connectionStatus.connected).toBe(false);
        expect(result.current.isConnected).toBe(false);
        expect(result.current.presenceUsers).toEqual([]);
      });

      it('should auto-connect when autoConnect is true', () => {
        renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            autoConnect: true,
          })
        );

        expect(mockRealTimeCollaboration.connect).toHaveBeenCalled();
        expect(mockRealTimeCollaboration.subscribeToDocument).toHaveBeenCalledWith(
          'work-order',
          'wo-123'
        );
      });

      it('should not auto-connect when autoConnect is false', () => {
        renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            autoConnect: false,
          })
        );

        expect(mockRealTimeCollaboration.connect).not.toHaveBeenCalled();
        expect(mockRealTimeCollaboration.subscribeToDocument).not.toHaveBeenCalled();
      });
    });

    describe('Event Handling', () => {
      it('should set up event listeners on mount', () => {
        renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
          })
        );

        // Verify event listeners are set up
        expect(mockRealTimeCollaboration.on).toHaveBeenCalledWith(
          'collaboration-event',
          expect.any(Function)
        );
        expect(mockRealTimeCollaboration.on).toHaveBeenCalledWith(
          'presence-update',
          expect.any(Function)
        );
        expect(mockRealTimeCollaboration.on).toHaveBeenCalledWith(
          'connected',
          expect.any(Function)
        );
        expect(mockRealTimeCollaboration.on).toHaveBeenCalledWith(
          'disconnected',
          expect.any(Function)
        );
        expect(mockRealTimeCollaboration.on).toHaveBeenCalledWith(
          'error',
          expect.any(Function)
        );
      });

      it('should handle collaboration events for correct document', () => {
        const onCommentUpdate = vi.fn();
        const onAnnotationUpdate = vi.fn();

        renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            onCommentUpdate,
            onAnnotationUpdate,
          })
        );

        // Get the collaboration event handler
        const collaborationHandler = mockRealTimeCollaboration.on.mock.calls.find(
          call => call[0] === 'collaboration-event'
        )?.[1];

        expect(collaborationHandler).toBeDefined();

        // Simulate a comment event for the correct document
        act(() => {
          collaborationHandler({
            type: 'comment',
            documentType: 'work-order',
            documentId: 'wo-123',
            data: { content: 'Test comment' },
          });
        });

        expect(onCommentUpdate).toHaveBeenCalled();

        // Simulate an annotation event for the correct document
        act(() => {
          collaborationHandler({
            type: 'annotation',
            documentType: 'work-order',
            documentId: 'wo-123',
            data: { annotation: 'Test annotation' },
          });
        });

        expect(onAnnotationUpdate).toHaveBeenCalled();
      });

      it('should ignore events for different documents', () => {
        const onCommentUpdate = vi.fn();

        renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            onCommentUpdate,
          })
        );

        const collaborationHandler = mockRealTimeCollaboration.on.mock.calls.find(
          call => call[0] === 'collaboration-event'
        )?.[1];

        // Simulate event for different document
        act(() => {
          collaborationHandler({
            type: 'comment',
            documentType: 'work-order',
            documentId: 'wo-456', // Different document
            data: { content: 'Test comment' },
          });
        });

        expect(onCommentUpdate).not.toHaveBeenCalled();
      });

      it('should handle connection status changes', () => {
        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
          })
        );

        // Get the connected event handler
        const connectedHandler = mockRealTimeCollaboration.on.mock.calls.find(
          call => call[0] === 'connected'
        )?.[1];

        // Simulate connection
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        act(() => {
          connectedHandler();
        });

        expect(result.current.connectionStatus.connected).toBe(true);
        expect(mockMessage.success).toHaveBeenCalledWith(
          'Connected to real-time collaboration'
        );
      });
    });

    describe('Presence Management', () => {
      it('should update presence when enabled and connected', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            enablePresence: true,
          })
        );

        act(() => {
          result.current.updatePresence({
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: true,
          });
        });

        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledWith(
          'work-order',
          'wo-123',
          {
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: true,
          }
        );
      });

      it('should not update presence when disabled', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            enablePresence: false,
          })
        );

        act(() => {
          result.current.updatePresence({
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: true,
          });
        });

        expect(mockRealTimeCollaboration.updatePresence).not.toHaveBeenCalled();
      });

      it('should not update presence when not connected', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: false,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            enablePresence: true,
          })
        );

        act(() => {
          result.current.updatePresence({
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: true,
          });
        });

        expect(mockRealTimeCollaboration.updatePresence).not.toHaveBeenCalled();
      });
    });

    describe('Manual Controls', () => {
      it('should allow manual connection', () => {
        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            autoConnect: false,
          })
        );

        act(() => {
          result.current.connect();
        });

        expect(mockRealTimeCollaboration.connect).toHaveBeenCalled();
        expect(mockRealTimeCollaboration.subscribeToDocument).toHaveBeenCalledWith(
          'work-order',
          'wo-123'
        );
      });

      it('should allow manual disconnection', () => {
        const { result } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
          })
        );

        act(() => {
          result.current.disconnect();
        });

        expect(mockRealTimeCollaboration.unsubscribeFromDocument).toHaveBeenCalledWith(
          'work-order',
          'wo-123'
        );
        expect(mockRealTimeCollaboration.disconnect).toHaveBeenCalled();
      });
    });

    describe('Cleanup', () => {
      it('should clean up event listeners and unsubscribe on unmount', () => {
        const { unmount } = renderHookWithProviders(() =>
          useRealTimeCollaboration({
            documentType: 'work-order',
            documentId: 'wo-123',
            autoConnect: true,
          })
        );

        unmount();

        expect(mockRealTimeCollaboration.off).toHaveBeenCalled();
        expect(mockRealTimeCollaboration.unsubscribeFromDocument).toHaveBeenCalledWith(
          'work-order',
          'wo-123'
        );
      });
    });
  });

  describe('usePresence Hook (Document-specific)', () => {
    describe('Basic Functionality', () => {
      it('should initialize with correct default state', () => {
        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        expect(result.current.isEditing).toBe(false);
        expect(result.current.cursor).toBeUndefined();
        expect(result.current.presenceUsers).toEqual([]);
      });

      it('should start editing session', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        act(() => {
          result.current.startEditing();
        });

        expect(result.current.isEditing).toBe(true);
        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledWith(
          'work-order',
          'wo-123',
          expect.objectContaining({
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: true,
          })
        );
      });

      it('should stop editing session', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Start editing first
        act(() => {
          result.current.startEditing();
        });

        expect(result.current.isEditing).toBe(true);

        // Stop editing
        act(() => {
          result.current.stopEditing();
        });

        expect(result.current.isEditing).toBe(false);
        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledWith(
          'work-order',
          'wo-123',
          expect.objectContaining({
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: false,
          })
        );
      });
    });

    describe('Cursor Management', () => {
      it('should update cursor position when editing', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Start editing first
        act(() => {
          result.current.startEditing();
        });

        // Update cursor
        act(() => {
          result.current.updateCursor({ x: 100, y: 200 });
        });

        expect(result.current.cursor).toEqual({ x: 100, y: 200 });
        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledWith(
          'work-order',
          'wo-123',
          expect.objectContaining({
            cursor: { x: 100, y: 200 },
          })
        );
      });

      it('should not send cursor updates when not editing', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Update cursor without starting editing
        act(() => {
          result.current.updateCursor({ x: 100, y: 200 });
        });

        expect(result.current.cursor).toEqual({ x: 100, y: 200 });
        // Should not send presence update since not editing
        expect(mockRealTimeCollaboration.updatePresence).not.toHaveBeenCalled();
      });
    });

    describe('Heartbeat Functionality', () => {
      it('should send heartbeat when editing and connected', async () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Start editing
        act(() => {
          result.current.startEditing();
        });

        // Clear previous calls
        mockRealTimeCollaboration.updatePresence.mockClear();

        // Fast-forward time for heartbeat
        act(() => {
          vi.advanceTimersByTime(30000); // 30 seconds
        });

        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledWith(
          'work-order',
          'wo-123',
          expect.objectContaining({
            userId: 'user-1',
            userName: 'John Doe',
            isEditing: true,
          })
        );
      });

      it('should not send heartbeat when not editing', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Clear any setup calls
        mockRealTimeCollaboration.updatePresence.mockClear();

        // Fast-forward time
        act(() => {
          vi.advanceTimersByTime(30000);
        });

        expect(mockRealTimeCollaboration.updatePresence).not.toHaveBeenCalled();
      });
    });

    describe('Throttling', () => {
      it('should throttle presence updates', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Start editing
        act(() => {
          result.current.startEditing();
        });

        // Clear initial calls
        mockRealTimeCollaboration.updatePresence.mockClear();

        // Make multiple rapid calls
        act(() => {
          result.current.updateCursor({ x: 100, y: 200 });
          result.current.updateCursor({ x: 101, y: 201 });
          result.current.updateCursor({ x: 102, y: 202 });
        });

        // Should only call once due to throttling
        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledTimes(1);
      });
    });

    describe('Cleanup', () => {
      it('should stop editing on unmount', () => {
        mockRealTimeCollaboration.getConnectionStatus.mockReturnValue({
          connected: true,
          connecting: false,
          reconnecting: false,
          error: null,
        });

        const { result, unmount } = renderHookWithProviders(() =>
          usePresence('work-order', 'wo-123', 'user-1', 'John Doe')
        );

        // Start editing
        act(() => {
          result.current.startEditing();
        });

        expect(result.current.isEditing).toBe(true);

        // Unmount component
        unmount();

        // Should have called stop editing
        expect(mockRealTimeCollaboration.updatePresence).toHaveBeenCalledWith(
          'work-order',
          'wo-123',
          expect.objectContaining({
            isEditing: false,
          })
        );
      });
    });
  });

  describe('useConflictDetection Hook', () => {
    describe('Basic Functionality', () => {
      it('should initialize with no conflicts', () => {
        const { result } = renderHookWithProviders(() =>
          useConflictDetection('work-order', 'wo-123')
        );

        expect(result.current.conflicts).toEqual([]);
        expect(result.current.hasConflicts).toBe(false);
        expect(result.current.conflictCount).toBe(0);
      });

      it('should handle conflict events', () => {
        const onConflictDetected = vi.fn();

        const { result } = renderHookWithProviders(() =>
          useConflictDetection('work-order', 'wo-123', onConflictDetected)
        );

        // Get the conflict handler from the real-time collaboration hook
        const conflictHandler = mockRealTimeCollaboration.on.mock.calls.find(
          call => call[0] === 'collaboration-event'
        )?.[1];

        // Simulate a conflict event
        const conflictEvent = {
          type: 'conflict',
          documentType: 'work-order',
          documentId: 'wo-123',
          data: {
            id: 'conflict-1',
            message: 'Multiple users editing simultaneously',
          },
        };

        act(() => {
          conflictHandler(conflictEvent);
        });

        expect(result.current.conflicts).toHaveLength(1);
        expect(result.current.hasConflicts).toBe(true);
        expect(result.current.conflictCount).toBe(1);
        expect(onConflictDetected).toHaveBeenCalledWith(conflictEvent);
        expect(mockMessage.warning).toHaveBeenCalledWith({
          content: 'Conflict detected: Multiple users editing simultaneously',
          duration: 5,
        });
      });
    });

    describe('Conflict Management', () => {
      it('should resolve individual conflicts', () => {
        const { result } = renderHookWithProviders(() =>
          useConflictDetection('work-order', 'wo-123')
        );

        // Simulate conflicts
        const conflictHandler = mockRealTimeCollaboration.on.mock.calls.find(
          call => call[0] === 'collaboration-event'
        )?.[1];

        act(() => {
          conflictHandler({
            type: 'conflict',
            documentType: 'work-order',
            documentId: 'wo-123',
            data: { id: 'conflict-1', message: 'Conflict 1' },
          });
          conflictHandler({
            type: 'conflict',
            documentType: 'work-order',
            documentId: 'wo-123',
            data: { id: 'conflict-2', message: 'Conflict 2' },
          });
        });

        expect(result.current.conflictCount).toBe(2);

        // Resolve one conflict
        act(() => {
          result.current.resolveConflict('conflict-1');
        });

        expect(result.current.conflictCount).toBe(1);
        expect(result.current.conflicts[0].data.id).toBe('conflict-2');
      });

      it('should clear all conflicts', () => {
        const { result } = renderHookWithProviders(() =>
          useConflictDetection('work-order', 'wo-123')
        );

        // Simulate conflicts
        const conflictHandler = mockRealTimeCollaboration.on.mock.calls.find(
          call => call[0] === 'collaboration-event'
        )?.[1];

        act(() => {
          conflictHandler({
            type: 'conflict',
            documentType: 'work-order',
            documentId: 'wo-123',
            data: { id: 'conflict-1', message: 'Conflict 1' },
          });
          conflictHandler({
            type: 'conflict',
            documentType: 'work-order',
            documentId: 'wo-123',
            data: { id: 'conflict-2', message: 'Conflict 2' },
          });
        });

        expect(result.current.conflictCount).toBe(2);

        // Clear all conflicts
        act(() => {
          result.current.clearAllConflicts();
        });

        expect(result.current.conflictCount).toBe(0);
        expect(result.current.hasConflicts).toBe(false);
      });
    });
  });
});