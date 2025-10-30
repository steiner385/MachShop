import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PresenceService, PresenceRecord, PresenceInfo } from '../../services/PresenceService';

describe('PresenceService', () => {
  let presenceService: PresenceService;

  beforeEach(() => {
    presenceService = new PresenceService();
    // Clear any existing presence records
    presenceService.clearAll();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Stop cleanup timer to prevent interference with other tests
    presenceService.stopCleanupTimer();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty presence map', () => {
      const newService = new PresenceService();
      const allPresence = newService.getAllPresence();
      expect(allPresence.size).toBe(0);
      newService.stopCleanupTimer();
    });

    it('should start cleanup timer on initialization', () => {
      vi.spyOn(global, 'setInterval');
      const newService = new PresenceService();
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      newService.stopCleanupTimer();
    });
  });

  describe('updatePresence', () => {
    it('should add new user presence successfully', () => {
      const params = {
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const,
        userAgent: 'test-agent',
        ipAddress: '192.168.1.1'
      };

      presenceService.updatePresence(params);

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.activeUsers[0].userId).toBe('user-1');
      expect(presence.activeUsers[0].userName).toBe('John Doe');
      expect(presence.activeUsers[0].action).toBe('viewing');
      expect(presence.viewerCount).toBe(1);
      expect(presence.editorCount).toBe(0);
    });

    it('should update existing user presence', () => {
      const params = {
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      };

      // Add initial presence
      presenceService.updatePresence(params);

      // Update to editing
      presenceService.updatePresence({
        ...params,
        action: 'editing'
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.activeUsers[0].action).toBe('editing');
      expect(presence.viewerCount).toBe(0);
      expect(presence.editorCount).toBe(1);
    });

    it('should handle multiple users on same resource', () => {
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      presenceService.updatePresence({
        userId: 'user-2',
        userName: 'Jane Smith',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'editing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(presence.activeUsers).toHaveLength(2);
      expect(presence.viewerCount).toBe(1);
      expect(presence.editorCount).toBe(1);
    });

    it('should emit presence-changed event when user joins', () => {
      const mockEventHandler = vi.fn();
      presenceService.on('presence-changed', mockEventHandler);

      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      expect(mockEventHandler).toHaveBeenCalledWith({
        resourceType: 'routing',
        resourceId: 'routing-123',
        change: 'user-joined',
        userId: 'user-1'
      });
    });

    it('should handle different resource types', () => {
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'work-order' as const,
        resourceId: 'wo-456',
        action: 'editing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'work-order',
        resourceId: 'wo-456'
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.resourceId).toBe('wo-456');
    });

    it('should handle routing-step resource type', () => {
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing-step' as const,
        resourceId: 'step-789',
        action: 'viewing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing-step',
        resourceId: 'step-789'
      });

      expect(presence.activeUsers).toHaveLength(1);
    });
  });

  describe('removePresence', () => {
    beforeEach(() => {
      // Setup initial presence
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });
    });

    it('should remove user presence successfully', () => {
      presenceService.removePresence({
        userId: 'user-1',
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(presence.activeUsers).toHaveLength(0);
      expect(presence.viewerCount).toBe(0);
      expect(presence.editorCount).toBe(0);
    });

    it('should remove only specific user from multi-user resource', () => {
      presenceService.updatePresence({
        userId: 'user-2',
        userName: 'Jane Smith',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'editing' as const
      });

      presenceService.removePresence({
        userId: 'user-1',
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.activeUsers[0].userId).toBe('user-2');
    });

    it('should emit presence-changed event when user leaves', () => {
      const mockEventHandler = vi.fn();
      presenceService.on('presence-changed', mockEventHandler);

      presenceService.removePresence({
        userId: 'user-1',
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(mockEventHandler).toHaveBeenCalledWith({
        resourceType: 'routing',
        resourceId: 'routing-123',
        change: 'user-left',
        userId: 'user-1'
      });
    });

    it('should handle removing non-existent user gracefully', () => {
      presenceService.removePresence({
        userId: 'non-existent',
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      // Original user should still be there
      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.activeUsers[0].userId).toBe('user-1');
    });

    it('should delete resource key when no users remain', () => {
      presenceService.removePresence({
        userId: 'user-1',
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      const allPresence = presenceService.getAllPresence();
      expect(allPresence.has('routing:routing-123')).toBe(false);
    });
  });

  describe('getPresence', () => {
    it('should return empty presence for non-existent resource', () => {
      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'non-existent'
      });

      expect(presence.resourceId).toBe('non-existent');
      expect(presence.activeUsers).toHaveLength(0);
      expect(presence.viewerCount).toBe(0);
      expect(presence.editorCount).toBe(0);
    });

    it('should calculate duration correctly', () => {
      const startTime = new Date();

      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      // Wait a bit to test duration calculation
      const endTime = new Date();
      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      const expectedDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
      expect(presence.activeUsers[0].duration).toBeGreaterThanOrEqual(expectedDuration);
    });

    it('should count viewers and editors correctly', () => {
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      presenceService.updatePresence({
        userId: 'user-2',
        userName: 'Jane Smith',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      presenceService.updatePresence({
        userId: 'user-3',
        userName: 'Bob Wilson',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'editing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: 'routing-123'
      });

      expect(presence.activeUsers).toHaveLength(3);
      expect(presence.viewerCount).toBe(2);
      expect(presence.editorCount).toBe(1);
    });
  });

  describe('getAllPresence', () => {
    it('should return empty map when no presence records exist', () => {
      const allPresence = presenceService.getAllPresence();
      expect(allPresence.size).toBe(0);
    });

    it('should return all presence records', () => {
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      presenceService.updatePresence({
        userId: 'user-2',
        userName: 'Jane Smith',
        resourceType: 'work-order' as const,
        resourceId: 'wo-456',
        action: 'editing' as const
      });

      const allPresence = presenceService.getAllPresence();
      expect(allPresence.size).toBe(2);
      expect(allPresence.has('routing:routing-123')).toBe(true);
      expect(allPresence.has('work-order:wo-456')).toBe(true);
    });

    it('should return a new Map instance (not reference to internal map)', () => {
      const allPresence1 = presenceService.getAllPresence();
      const allPresence2 = presenceService.getAllPresence();

      expect(allPresence1).not.toBe(allPresence2);
      expect(allPresence1).toEqual(allPresence2);
    });
  });

  describe('clearAll', () => {
    it('should remove all presence records', () => {
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      presenceService.updatePresence({
        userId: 'user-2',
        userName: 'Jane Smith',
        resourceType: 'work-order' as const,
        resourceId: 'wo-456',
        action: 'editing' as const
      });

      presenceService.clearAll();

      const allPresence = presenceService.getAllPresence();
      expect(allPresence.size).toBe(0);
    });
  });

  describe('cleanup functionality', () => {
    it('should start and stop cleanup timer', () => {
      vi.spyOn(global, 'setInterval');
      vi.spyOn(global, 'clearInterval');

      const newService = new PresenceService();
      expect(setInterval).toHaveBeenCalled();

      newService.stopCleanupTimer();
      expect(clearInterval).toHaveBeenCalled();
    });

    it('should handle stopping already stopped timer', () => {
      const newService = new PresenceService();
      newService.stopCleanupTimer();

      // Should not throw when stopping again
      expect(() => newService.stopCleanupTimer()).not.toThrow();
    });

    it('should cleanup stale presence records', async () => {
      // Mock the PRESENCE_TIMEOUT to be very short for testing
      const shortTimeoutService = new PresenceService();

      // Add presence record
      shortTimeoutService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      // Manually set an old timestamp to simulate stale record
      const allPresence = shortTimeoutService.getAllPresence();
      const records = allPresence.get('routing:routing-123');
      if (records && records[0]) {
        records[0].lastSeen = new Date(Date.now() - 70000); // 70 seconds ago
      }

      // Manually trigger cleanup
      const mockEventHandler = vi.fn();
      shortTimeoutService.on('presence-changed', mockEventHandler);

      // Access private method for testing
      (shortTimeoutService as any).cleanupStalePresence();

      // Should emit presence-changed event
      expect(mockEventHandler).toHaveBeenCalledWith({
        resourceType: 'routing',
        resourceId: 'routing-123',
        change: 'user-left'
      });

      shortTimeoutService.stopCleanupTimer();
    });
  });

  describe('private methods', () => {
    it('should generate correct presence keys', () => {
      // Test the private getPresenceKey method indirectly
      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Doe',
        resourceType: 'routing' as const,
        resourceId: 'routing-123',
        action: 'viewing' as const
      });

      const allPresence = presenceService.getAllPresence();
      expect(allPresence.has('routing:routing-123')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values gracefully', () => {
      presenceService.updatePresence({
        userId: '',
        userName: '',
        resourceType: 'routing' as const,
        resourceId: '',
        action: 'viewing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: ''
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.activeUsers[0].userId).toBe('');
      expect(presence.activeUsers[0].userName).toBe('');
    });

    it('should handle special characters in IDs', () => {
      const specialId = 'routing-123-äöü-@#$%';

      presenceService.updatePresence({
        userId: 'user-1',
        userName: 'John Döe',
        resourceType: 'routing' as const,
        resourceId: specialId,
        action: 'viewing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: specialId
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.resourceId).toBe(specialId);
    });

    it('should handle very long user names and IDs', () => {
      const longString = 'a'.repeat(1000);

      presenceService.updatePresence({
        userId: longString,
        userName: longString,
        resourceType: 'routing' as const,
        resourceId: longString,
        action: 'viewing' as const
      });

      const presence = presenceService.getPresence({
        resourceType: 'routing',
        resourceId: longString
      });

      expect(presence.activeUsers).toHaveLength(1);
      expect(presence.activeUsers[0].userId).toBe(longString);
    });
  });
});