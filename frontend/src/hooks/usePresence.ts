/**
 * usePresence Hook
 * Sprint 4: Collaborative Routing Features
 *
 * Manages presence tracking for a resource with automatic heartbeat
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { presenceAPI, PresenceInfo, ResourceType, PresenceAction } from '../api/presence';
import { useAuthStore } from '../store/AuthStore';

export interface UsePresenceOptions {
  resourceType: ResourceType;
  resourceId: string;
  action: PresenceAction;
  enabled?: boolean; // Allow disabling presence tracking
  heartbeatInterval?: number; // Default: 30000ms (30s)
  refreshInterval?: number; // Default: 15000ms (15s)
}

export interface UsePresenceReturn {
  presenceInfo: PresenceInfo | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Custom hook for presence tracking
 *
 * Features:
 * - Automatic heartbeat to maintain presence
 * - Periodic refresh to get other users' presence
 * - Cleanup on unmount
 * - Error handling
 *
 * @example
 * const { presenceInfo, isLoading } = usePresence({
 *   resourceType: 'routing',
 *   resourceId: 'routing-123',
 *   action: 'editing',
 * });
 */
export const usePresence = (options: UsePresenceOptions): UsePresenceReturn => {
  const {
    resourceType,
    resourceId,
    action,
    enabled = true,
    heartbeatInterval = 30000, // 30 seconds
    refreshInterval = 15000, // 15 seconds
  } = options;

  const user = useAuthStore((state) => state.user);
  const [presenceInfo, setPresenceInfo] = useState<PresenceInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Send heartbeat to maintain presence
   */
  const sendHeartbeat = useCallback(async () => {
    if (!enabled || !resourceId || !user) return;

    try {
      await presenceAPI.updatePresence({
        resourceType,
        resourceId,
        action,
        userName: user.username || user.name,
      });
    } catch (err: any) {
      console.error('Failed to update presence:', err);
      // Don't set error state for heartbeat failures (non-critical)
    }
  }, [enabled, resourceId, resourceType, action, user]);

  /**
   * Fetch presence information
   */
  const fetchPresence = useCallback(async () => {
    if (!enabled || !resourceId) {
      setPresenceInfo(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await presenceAPI.getPresence({
        resourceType,
        resourceId,
      });

      if (isMountedRef.current) {
        setPresenceInfo(response.data);
        setError(null);
      }
    } catch (err: any) {
      console.error('Failed to fetch presence:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to fetch presence');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, resourceId, resourceType]);

  /**
   * Remove presence on unmount
   */
  const removePresence = useCallback(async () => {
    if (!resourceId || !user) return;

    try {
      await presenceAPI.removePresence({
        resourceType,
        resourceId,
      });
    } catch (err: any) {
      console.error('Failed to remove presence:', err);
      // Don't throw - this is cleanup
    }
  }, [resourceId, resourceType, user]);

  /**
   * Setup presence tracking
   */
  useEffect(() => {
    if (!enabled || !resourceId || !user) {
      setIsLoading(false);
      return;
    }

    // Initial heartbeat and fetch
    sendHeartbeat();
    fetchPresence();

    // Setup heartbeat interval
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, heartbeatInterval);

    // Setup refresh interval
    refreshTimerRef.current = setInterval(() => {
      fetchPresence();
    }, refreshInterval);

    // Cleanup function
    return () => {
      // Clear timers
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
      }
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }

      // Remove presence
      removePresence();
    };
  }, [
    enabled,
    resourceId,
    user,
    sendHeartbeat,
    fetchPresence,
    removePresence,
    heartbeatInterval,
    refreshInterval,
  ]);

  /**
   * Update mounted ref for cleanup
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    presenceInfo,
    isLoading,
    error,
    refresh: fetchPresence,
  };
};

export default usePresence;
