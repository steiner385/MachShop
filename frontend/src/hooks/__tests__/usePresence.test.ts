/**
 * Tests for usePresence Hook
 *
 * Tests the simple presence tracking hook that manages user presence
 * with automatic heartbeat functionality, periodic refresh, and cleanup.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders, waitForHookToFinishLoading } from '@/test-utils/hooks';
import { mockAllAPIs } from '@/test-utils/mocks';
import { createMockTimersForHook } from '@/test-utils/hooks';
import { usePresence } from '../usePresence';

// Mock the presence API
const mockPresenceApi = {
  startPresence: vi.fn().mockResolvedValue({ id: 'presence-1' }),
  updatePresence: vi.fn().mockResolvedValue({ id: 'presence-1' }),
  endPresence: vi.fn().mockResolvedValue({}),
  getActivePresence: vi.fn().mockResolvedValue([]),
  refreshPresence: vi.fn().mockResolvedValue({ id: 'presence-1' }),
};

vi.mock('@/api/presence', () => ({
  presenceApi: mockPresenceApi,
}));

describe('usePresence Hook', () => {
  let timers: ReturnType<typeof createMockTimersForHook>;

  beforeEach(() => {
    vi.clearAllMocks();
    timers = createMockTimersForHook();
    mockAllAPIs();
  });

  afterEach(() => {
    timers.cleanup();
    vi.restoreAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'viewing',
        })
      );

      expect(result.current.isActive).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.activeUsers).toEqual([]);
    });

    it('should start presence tracking when enabled', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      expect(mockPresenceApi.startPresence).toHaveBeenCalledWith({
        resourceType: 'work-order',
        resourceId: 'wo-123',
        action: 'editing',
      });
    });

    it('should not start presence when disabled', () => {
      renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'viewing',
          enabled: false,
        })
      );

      expect(mockPresenceApi.startPresence).not.toHaveBeenCalled();
    });
  });

  describe('Heartbeat Functionality', () => {
    it('should send heartbeat at specified intervals', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
          heartbeatInterval: 1000, // 1 second for testing
        })
      );

      // Wait for initial presence to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Fast-forward time to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockPresenceApi.updatePresence).toHaveBeenCalled();
      });
    });

    it('should use default heartbeat interval when not specified', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Fast-forward by default interval (30 seconds)
      act(() => {
        vi.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockPresenceApi.updatePresence).toHaveBeenCalled();
      });
    });

    it('should stop heartbeat when presence is ended', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
          heartbeatInterval: 1000,
        })
      );

      // Wait for presence to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // End presence
      await act(async () => {
        await result.current.endPresence();
      });

      // Clear any pending calls
      mockPresenceApi.updatePresence.mockClear();

      // Fast-forward time - heartbeat should not be called
      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockPresenceApi.updatePresence).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Functionality', () => {
    it('should refresh presence data at specified intervals', async () => {
      const mockActiveUsers = [
        { userId: 'user-1', userName: 'John Doe', action: 'viewing' },
        { userId: 'user-2', userName: 'Jane Smith', action: 'editing' },
      ];

      mockPresenceApi.getActivePresence.mockResolvedValue(mockActiveUsers);

      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'viewing',
          enabled: true,
          refreshInterval: 1000, // 1 second for testing
        })
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Fast-forward to trigger refresh
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.activeUsers).toEqual(mockActiveUsers);
      });

      expect(mockPresenceApi.getActivePresence).toHaveBeenCalledWith(
        'work-order',
        'wo-123'
      );
    });

    it('should handle refresh errors gracefully', async () => {
      const refreshError = new Error('Refresh failed');
      mockPresenceApi.getActivePresence.mockRejectedValue(refreshError);

      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'viewing',
          enabled: true,
          refreshInterval: 1000,
        })
      );

      // Wait for initial presence to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Fast-forward to trigger refresh
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Manual Controls', () => {
    it('should allow manual start of presence', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: false, // Start disabled
        })
      );

      expect(result.current.isActive).toBe(false);

      // Manually start presence
      await act(async () => {
        await result.current.startPresence();
      });

      expect(result.current.isActive).toBe(true);
      expect(mockPresenceApi.startPresence).toHaveBeenCalled();
    });

    it('should allow manual end of presence', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
        })
      );

      // Wait for presence to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Manually end presence
      await act(async () => {
        await result.current.endPresence();
      });

      expect(result.current.isActive).toBe(false);
      expect(mockPresenceApi.endPresence).toHaveBeenCalled();
    });

    it('should allow manual refresh of presence data', async () => {
      const mockActiveUsers = [
        { userId: 'user-1', userName: 'John Doe', action: 'viewing' },
      ];

      mockPresenceApi.getActivePresence.mockResolvedValue(mockActiveUsers);

      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'viewing',
          enabled: true,
        })
      );

      // Manually refresh
      await act(async () => {
        await result.current.refreshPresence();
      });

      expect(result.current.activeUsers).toEqual(mockActiveUsers);
      expect(mockPresenceApi.getActivePresence).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should end presence when component unmounts', async () => {
      const { result, unmount } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
        })
      );

      // Wait for presence to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Unmount component
      unmount();

      expect(mockPresenceApi.endPresence).toHaveBeenCalled();
    });

    it('should clean up timers when component unmounts', async () => {
      const { unmount } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
          heartbeatInterval: 1000,
          refreshInterval: 1000,
        })
      );

      // Give time for timers to be set up
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(timers.getActiveTimersCount()).toBeGreaterThan(0);

      // Unmount component
      unmount();

      // Timers should be cleaned up
      expect(timers.getActiveTimersCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle start presence errors', async () => {
      const startError = new Error('Failed to start presence');
      mockPresenceApi.startPresence.mockRejectedValue(startError);

      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle heartbeat errors gracefully', async () => {
      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
          heartbeatInterval: 1000,
        })
      );

      // Wait for presence to start
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Make heartbeat fail
      const heartbeatError = new Error('Heartbeat failed');
      mockPresenceApi.updatePresence.mockRejectedValue(heartbeatError);

      // Fast-forward to trigger heartbeat
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Should handle error gracefully without crashing
      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('Parameters Change', () => {
    it('should restart presence when resourceId changes', async () => {
      const { result, rerender } = renderHookWithProviders(
        ({ resourceId }) =>
          usePresence({
            resourceType: 'work-order',
            resourceId,
            action: 'editing',
            enabled: true,
          }),
        { initialProps: { resourceId: 'wo-123' } }
      );

      // Wait for initial presence
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      expect(mockPresenceApi.startPresence).toHaveBeenCalledWith({
        resourceType: 'work-order',
        resourceId: 'wo-123',
        action: 'editing',
      });

      // Change resourceId
      rerender({ resourceId: 'wo-456' });

      await waitFor(() => {
        expect(mockPresenceApi.endPresence).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(mockPresenceApi.startPresence).toHaveBeenCalledWith({
          resourceType: 'work-order',
          resourceId: 'wo-456',
          action: 'editing',
        });
      });
    });

    it('should restart presence when action changes', async () => {
      const { result, rerender } = renderHookWithProviders(
        ({ action }) =>
          usePresence({
            resourceType: 'work-order',
            resourceId: 'wo-123',
            action,
            enabled: true,
          }),
        { initialProps: { action: 'viewing' as const } }
      );

      // Wait for initial presence
      await waitFor(() => {
        expect(result.current.isActive).toBe(true);
      });

      // Change action
      rerender({ action: 'editing' as const });

      await waitFor(() => {
        expect(mockPresenceApi.startPresence).toHaveBeenCalledWith({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
        });
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during presence start', async () => {
      // Make start presence take some time
      let resolveStart: (value: any) => void;
      const startPromise = new Promise(resolve => {
        resolveStart = resolve;
      });
      mockPresenceApi.startPresence.mockReturnValue(startPromise);

      const { result } = renderHookWithProviders(() =>
        usePresence({
          resourceType: 'work-order',
          resourceId: 'wo-123',
          action: 'editing',
          enabled: true,
        })
      );

      // Should be loading initially
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isActive).toBe(false);

      // Resolve the promise
      act(() => {
        resolveStart({ id: 'presence-1' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isActive).toBe(true);
      });
    });
  });
});