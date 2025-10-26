/**
 * useRoutingChangeDetection Hook
 * Sprint 4: Collaborative Routing Features
 *
 * Detects when a routing has been modified by another user
 * Polls server periodically to check for version changes
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { routingAPI } from '../api/routing';
import { Routing } from '../types/routing';

export interface RoutingChangeInfo {
  currentVersion: string;
  newVersion: string;
  lastModified: Date;
  modifiedBy?: string;
  routing: Routing;
}

export interface UseRoutingChangeDetectionOptions {
  routingId: string;
  currentVersion: string;
  enabled?: boolean;
  pollInterval?: number; // Default: 30000ms (30s)
  onChangeDetected?: (changeInfo: RoutingChangeInfo) => void;
}

export interface UseRoutingChangeDetectionReturn {
  hasChanges: boolean;
  changeInfo: RoutingChangeInfo | null;
  isChecking: boolean;
  error: string | null;
  checkNow: () => Promise<void>;
  dismissChange: () => void;
  acceptChange: () => void;
}

/**
 * Custom hook for detecting routing changes
 *
 * Features:
 * - Periodic polling to detect version changes
 * - Automatic notification when routing is modified
 * - Provides change details for user decision
 * - Non-blocking error handling
 *
 * @example
 * const { hasChanges, changeInfo, acceptChange } = useRoutingChangeDetection({
 *   routingId: 'routing-123',
 *   currentVersion: '1.0',
 *   onChangeDetected: (info) => {
 *     console.log('Routing was modified by', info.modifiedBy);
 *   },
 * });
 */
export const useRoutingChangeDetection = (
  options: UseRoutingChangeDetectionOptions
): UseRoutingChangeDetectionReturn => {
  const {
    routingId,
    currentVersion,
    enabled = true,
    pollInterval = 30000, // 30 seconds
    onChangeDetected,
  } = options;

  const [hasChanges, setHasChanges] = useState(false);
  const [changeInfo, setChangeInfo] = useState<RoutingChangeInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastVersionRef = useRef<string>(currentVersion);

  /**
   * Check if routing has been modified
   */
  const checkForChanges = useCallback(async () => {
    if (!enabled || !routingId || !currentVersion) {
      return;
    }

    // Don't poll if we already have changes detected
    if (hasChanges) {
      return;
    }

    try {
      setIsChecking(true);
      setError(null);

      // Fetch latest routing from server
      const response = await routingAPI.getRoutingById(routingId);
      const latestRouting = response.data;

      // Check if routing exists and version has changed
      if (!latestRouting) {
        throw new Error('Routing not found');
      }

      if (latestRouting.version !== lastVersionRef.current) {
        const changeInfo: RoutingChangeInfo = {
          currentVersion: lastVersionRef.current,
          newVersion: latestRouting.version,
          lastModified: new Date(latestRouting.updatedAt),
          modifiedBy: latestRouting.createdBy, // Could be enhanced with actual modifier
          routing: latestRouting,
        };

        if (isMountedRef.current) {
          setHasChanges(true);
          setChangeInfo(changeInfo);

          // Call callback if provided
          if (onChangeDetected) {
            onChangeDetected(changeInfo);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to check for routing changes:', err);
      if (isMountedRef.current) {
        setError(err.message || 'Failed to check for changes');
      }
      // Don't show error to user - this is non-critical background polling
    } finally {
      if (isMountedRef.current) {
        setIsChecking(false);
      }
    }
  }, [enabled, routingId, currentVersion, hasChanges, onChangeDetected]);

  /**
   * Manually trigger a change check
   */
  const checkNow = useCallback(async () => {
    await checkForChanges();
  }, [checkForChanges]);

  /**
   * Dismiss the change notification (keep working with current version)
   */
  const dismissChange = useCallback(() => {
    if (changeInfo) {
      // Update the last known version to the new version to avoid re-notification
      lastVersionRef.current = changeInfo.newVersion;
    }
    setHasChanges(false);
    setChangeInfo(null);
    setError(null);
  }, [changeInfo]);

  /**
   * Accept the change (caller should reload the routing)
   */
  const acceptChange = useCallback(() => {
    if (changeInfo) {
      lastVersionRef.current = changeInfo.newVersion;
    }
    setHasChanges(false);
    setChangeInfo(null);
    setError(null);
  }, [changeInfo]);

  /**
   * Update last known version when currentVersion prop changes
   */
  useEffect(() => {
    lastVersionRef.current = currentVersion;
  }, [currentVersion]);

  /**
   * Setup polling for changes
   */
  useEffect(() => {
    if (!enabled || !routingId || !currentVersion) {
      return;
    }

    // Initial check after a short delay
    const initialCheckTimeout = setTimeout(() => {
      checkForChanges();
    }, 5000); // Wait 5 seconds before first check

    // Setup polling interval
    pollTimerRef.current = setInterval(() => {
      checkForChanges();
    }, pollInterval);

    // Cleanup function
    return () => {
      if (initialCheckTimeout) {
        clearTimeout(initialCheckTimeout);
      }
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, [enabled, routingId, currentVersion, pollInterval, checkForChanges]);

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
    hasChanges,
    changeInfo,
    isChecking,
    error,
    checkNow,
    dismissChange,
    acceptChange,
  };
};

export default useRoutingChangeDetection;
