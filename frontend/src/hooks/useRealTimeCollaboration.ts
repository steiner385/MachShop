import { useEffect, useCallback, useState, useRef } from 'react';
import { message } from 'antd';
import {
  realTimeCollaboration,
  CollaborationEvent,
  PresenceInfo,
} from '@/services/realTimeCollaboration';

interface UseRealTimeCollaborationOptions {
  documentType: string;
  documentId: string;
  enablePresence?: boolean;
  autoConnect?: boolean;
  onCommentUpdate?: (event: CollaborationEvent) => void;
  onAnnotationUpdate?: (event: CollaborationEvent) => void;
  onReviewUpdate?: (event: CollaborationEvent) => void;
  onNotificationUpdate?: (event: CollaborationEvent) => void;
  onActivityUpdate?: (event: CollaborationEvent) => void;
  onConflictDetected?: (event: CollaborationEvent) => void;
  onPresenceUpdate?: (presence: PresenceInfo[]) => void;
}

interface ConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  subscriptions: number;
}

/**
 * Hook for managing real-time collaboration features
 */
export const useRealTimeCollaboration = (options: UseRealTimeCollaborationOptions) => {
  const {
    documentType,
    documentId,
    enablePresence = true,
    autoConnect = true,
    onCommentUpdate,
    onAnnotationUpdate,
    onReviewUpdate,
    onNotificationUpdate,
    onActivityUpdate,
    onConflictDetected,
    onPresenceUpdate,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0,
    subscriptions: 0,
  });

  const [presenceUsers, setPresenceUsers] = useState<PresenceInfo[]>([]);
  const eventListenersRef = useRef<Set<string>>(new Set());

  // Update connection status
  const updateConnectionStatus = useCallback(() => {
    setConnectionStatus(realTimeCollaboration.getConnectionStatus());
  }, []);

  // Handle collaboration events
  const handleCollaborationEvent = useCallback((event: CollaborationEvent) => {
    // Only process events for the current document
    if (event.documentType === documentType && event.documentId === documentId) {
      switch (event.type) {
        case 'comment':
          onCommentUpdate?.(event);
          break;
        case 'annotation':
          onAnnotationUpdate?.(event);
          break;
        case 'review':
          onReviewUpdate?.(event);
          break;
        case 'notification':
          onNotificationUpdate?.(event);
          break;
        case 'activity':
          onActivityUpdate?.(event);
          break;
        case 'conflict':
          onConflictDetected?.(event);
          break;
      }
    }
  }, [
    documentType,
    documentId,
    onCommentUpdate,
    onAnnotationUpdate,
    onReviewUpdate,
    onNotificationUpdate,
    onActivityUpdate,
    onConflictDetected,
  ]);

  // Handle presence updates
  const handlePresenceUpdate = useCallback((data: {
    documentType: string;
    documentId: string;
    presence: PresenceInfo;
  }) => {
    if (data.documentType === documentType && data.documentId === documentId) {
      const users = realTimeCollaboration.getPresenceUsers(documentType, documentId);
      setPresenceUsers(users);
      onPresenceUpdate?.(users);
    }
  }, [documentType, documentId, onPresenceUpdate]);

  // Handle connection events
  const handleConnected = useCallback(() => {
    updateConnectionStatus();
    message.success('Connected to real-time collaboration');
  }, [updateConnectionStatus]);

  const handleDisconnected = useCallback(() => {
    updateConnectionStatus();
    message.warning('Disconnected from real-time collaboration');
  }, [updateConnectionStatus]);

  const handleError = useCallback((error: any) => {
    updateConnectionStatus();
    console.error('Real-time collaboration error:', error);
  }, [updateConnectionStatus]);

  const handleReconnecting = useCallback((data: { attempt: number; delay: number }) => {
    updateConnectionStatus();
    message.loading(`Reconnecting... (attempt ${data.attempt})`);
  }, [updateConnectionStatus]);

  const handleMaxReconnectAttempts = useCallback(() => {
    updateConnectionStatus();
    message.error('Failed to maintain real-time connection. Please refresh the page.');
  }, [updateConnectionStatus]);

  // Set up event listeners
  const setupEventListeners = useCallback(() => {
    const listeners = [
      { event: 'collaboration-event', handler: handleCollaborationEvent },
      { event: 'presence-update', handler: handlePresenceUpdate },
      { event: 'connected', handler: handleConnected },
      { event: 'disconnected', handler: handleDisconnected },
      { event: 'error', handler: handleError },
      { event: 'reconnecting', handler: handleReconnecting },
      { event: 'max-reconnect-attempts', handler: handleMaxReconnectAttempts },
    ];

    listeners.forEach(({ event, handler }) => {
      if (!eventListenersRef.current.has(event)) {
        realTimeCollaboration.on(event, handler);
        eventListenersRef.current.add(event);
      }
    });

    return () => {
      listeners.forEach(({ event, handler }) => {
        realTimeCollaboration.off(event, handler);
        eventListenersRef.current.delete(event);
      });
    };
  }, [
    handleCollaborationEvent,
    handlePresenceUpdate,
    handleConnected,
    handleDisconnected,
    handleError,
    handleReconnecting,
    handleMaxReconnectAttempts,
  ]);

  // Initialize real-time collaboration
  useEffect(() => {
    const cleanup = setupEventListeners();

    if (autoConnect) {
      realTimeCollaboration.connect();
      realTimeCollaboration.subscribeToDocument(documentType, documentId);
    }

    updateConnectionStatus();

    return () => {
      cleanup();
      realTimeCollaboration.unsubscribeFromDocument(documentType, documentId);
    };
  }, [documentType, documentId, autoConnect, setupEventListeners, updateConnectionStatus]);

  // Update presence when user is actively editing
  const updatePresence = useCallback(
    (presence: Partial<PresenceInfo>) => {
      if (enablePresence && connectionStatus.connected) {
        realTimeCollaboration.updatePresence(documentType, documentId, presence);
      }
    },
    [documentType, documentId, enablePresence, connectionStatus.connected]
  );

  // Manual connection controls
  const connect = useCallback(() => {
    realTimeCollaboration.connect();
    realTimeCollaboration.subscribeToDocument(documentType, documentId);
  }, [documentType, documentId]);

  const disconnect = useCallback(() => {
    realTimeCollaboration.unsubscribeFromDocument(documentType, documentId);
    realTimeCollaboration.disconnect();
  }, [documentType, documentId]);

  return {
    // Connection status
    connectionStatus,
    isConnected: connectionStatus.connected,

    // Presence information
    presenceUsers,

    // Manual controls
    connect,
    disconnect,
    updatePresence,

    // Utility functions
    refreshConnection: updateConnectionStatus,
  };
};

/**
 * Hook for managing user presence in a document
 */
export const usePresence = (
  documentType: string,
  documentId: string,
  userId: string,
  userName: string
) => {
  const [isEditing, setIsEditing] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | undefined>();
  const lastPresenceUpdate = useRef<number>(0);

  const { updatePresence, presenceUsers, isConnected } = useRealTimeCollaboration({
    documentType,
    documentId,
    enablePresence: true,
  });

  // Throttled presence update
  const throttledUpdatePresence = useCallback(
    (presence: Partial<PresenceInfo>) => {
      const now = Date.now();
      if (now - lastPresenceUpdate.current > 1000) { // Throttle to once per second
        updatePresence(presence);
        lastPresenceUpdate.current = now;
      }
    },
    [updatePresence]
  );

  // Start editing session
  const startEditing = useCallback(() => {
    setIsEditing(true);
    throttledUpdatePresence({
      userId,
      userName,
      isEditing: true,
      editingSince: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
  }, [userId, userName, throttledUpdatePresence]);

  // Stop editing session
  const stopEditing = useCallback(() => {
    setIsEditing(false);
    throttledUpdatePresence({
      userId,
      userName,
      isEditing: false,
      lastSeen: new Date().toISOString(),
    });
  }, [userId, userName, throttledUpdatePresence]);

  // Update cursor position
  const updateCursor = useCallback(
    (position: { x: number; y: number }) => {
      setCursor(position);
      if (isEditing) {
        throttledUpdatePresence({
          userId,
          userName,
          cursor: position,
          lastSeen: new Date().toISOString(),
        });
      }
    },
    [userId, userName, isEditing, throttledUpdatePresence]
  );

  // Send periodic heartbeat when editing
  useEffect(() => {
    if (!isEditing || !isConnected) return;

    const heartbeatInterval = setInterval(() => {
      throttledUpdatePresence({
        userId,
        userName,
        isEditing: true,
        lastSeen: new Date().toISOString(),
      });
    }, 30000); // Every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isEditing, isConnected, userId, userName, throttledUpdatePresence]);

  // Stop editing when component unmounts
  useEffect(() => {
    return () => {
      if (isEditing) {
        stopEditing();
      }
    };
  }, [isEditing, stopEditing]);

  return {
    isEditing,
    cursor,
    presenceUsers,
    startEditing,
    stopEditing,
    updateCursor,
  };
};

/**
 * Hook for handling real-time conflicts
 */
export const useConflictDetection = (
  documentType: string,
  documentId: string,
  onConflictDetected?: (conflict: CollaborationEvent) => void
) => {
  const [conflicts, setConflicts] = useState<CollaborationEvent[]>([]);

  const handleConflict = useCallback(
    (event: CollaborationEvent) => {
      setConflicts(prev => [...prev, event]);
      onConflictDetected?.(event);

      // Show conflict notification
      message.warning({
        content: `Conflict detected: ${event.data.message || 'Multiple users editing simultaneously'}`,
        duration: 5,
      });
    },
    [onConflictDetected]
  );

  const { isConnected } = useRealTimeCollaboration({
    documentType,
    documentId,
    onConflictDetected: handleConflict,
  });

  const resolveConflict = useCallback((conflictId: string) => {
    setConflicts(prev => prev.filter(c => c.data.id !== conflictId));
  }, []);

  const clearAllConflicts = useCallback(() => {
    setConflicts([]);
  }, []);

  return {
    conflicts,
    hasConflicts: conflicts.length > 0,
    conflictCount: conflicts.length,
    resolveConflict,
    clearAllConflicts,
    isConnected,
  };
};