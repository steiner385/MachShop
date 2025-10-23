/**
 * Presence Service
 * Sprint 4: Collaborative Routing Features
 *
 * Tracks active users viewing/editing routings
 * Provides real-time presence information for collaborative editing
 */

import { EventEmitter } from 'events';

// ============================================
// TYPES
// ============================================

export interface PresenceRecord {
  userId: string;
  userName: string;
  resourceType: 'routing' | 'routing-step' | 'work-order';
  resourceId: string;
  action: 'viewing' | 'editing';
  lastSeen: Date;
  userAgent?: string;
  ipAddress?: string;
}

export interface PresenceInfo {
  resourceId: string;
  activeUsers: {
    userId: string;
    userName: string;
    action: 'viewing' | 'editing';
    lastSeen: Date;
    duration: number; // seconds
  }[];
  viewerCount: number;
  editorCount: number;
}

// ============================================
// PRESENCE SERVICE
// ============================================

/**
 * In-memory presence tracking service
 *
 * Note: For production with multiple server instances,
 * replace with Redis-based implementation
 */
export class PresenceService extends EventEmitter {
  private presenceMap: Map<string, PresenceRecord[]> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly PRESENCE_TIMEOUT = 60000; // 60 seconds
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  constructor() {
    super();
    this.startCleanupTimer();
  }

  /**
   * Start background cleanup of stale presence records
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupStalePresence();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (for graceful shutdown)
   */
  public stopCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Remove stale presence records (older than PRESENCE_TIMEOUT)
   */
  private cleanupStalePresence(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, records] of this.presenceMap.entries()) {
      const activeRecords = records.filter(record => {
        const age = now.getTime() - record.lastSeen.getTime();
        return age < this.PRESENCE_TIMEOUT;
      });

      if (activeRecords.length !== records.length) {
        const removedCount = records.length - activeRecords.length;
        cleanedCount += removedCount;

        if (activeRecords.length === 0) {
          this.presenceMap.delete(key);
        } else {
          this.presenceMap.set(key, activeRecords);
        }

        // Emit event for presence change
        this.emit('presence-changed', {
          resourceType: records[0]?.resourceType,
          resourceId: records[0]?.resourceId,
          change: 'user-left',
        });
      }
    }

    if (cleanedCount > 0) {
      console.log(`Presence cleanup: removed ${cleanedCount} stale records`);
    }
  }

  /**
   * Generate presence key for a resource
   */
  private getPresenceKey(resourceType: string, resourceId: string): string {
    return `${resourceType}:${resourceId}`;
  }

  /**
   * Update user presence for a resource
   */
  public updatePresence(params: {
    userId: string;
    userName: string;
    resourceType: 'routing' | 'routing-step' | 'work-order';
    resourceId: string;
    action: 'viewing' | 'editing';
    userAgent?: string;
    ipAddress?: string;
  }): void {
    const key = this.getPresenceKey(params.resourceType, params.resourceId);
    const records = this.presenceMap.get(key) || [];

    // Remove existing record for this user
    const filteredRecords = records.filter(r => r.userId !== params.userId);

    // Add new record
    const newRecord: PresenceRecord = {
      userId: params.userId,
      userName: params.userName,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      lastSeen: new Date(),
      userAgent: params.userAgent,
      ipAddress: params.ipAddress,
    };

    filteredRecords.push(newRecord);
    this.presenceMap.set(key, filteredRecords);

    // Emit event for presence change
    this.emit('presence-changed', {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      change: 'user-joined',
      userId: params.userId,
    });
  }

  /**
   * Remove user presence from a resource
   */
  public removePresence(params: {
    userId: string;
    resourceType: 'routing' | 'routing-step' | 'work-order';
    resourceId: string;
  }): void {
    const key = this.getPresenceKey(params.resourceType, params.resourceId);
    const records = this.presenceMap.get(key) || [];

    const filteredRecords = records.filter(r => r.userId !== params.userId);

    if (filteredRecords.length === 0) {
      this.presenceMap.delete(key);
    } else {
      this.presenceMap.set(key, filteredRecords);
    }

    // Emit event for presence change
    this.emit('presence-changed', {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      change: 'user-left',
      userId: params.userId,
    });
  }

  /**
   * Get presence information for a resource
   */
  public getPresence(params: {
    resourceType: 'routing' | 'routing-step' | 'work-order';
    resourceId: string;
  }): PresenceInfo {
    const key = this.getPresenceKey(params.resourceType, params.resourceId);
    const records = this.presenceMap.get(key) || [];

    const now = new Date();
    const activeUsers = records.map(record => ({
      userId: record.userId,
      userName: record.userName,
      action: record.action,
      lastSeen: record.lastSeen,
      duration: Math.floor((now.getTime() - record.lastSeen.getTime()) / 1000),
    }));

    return {
      resourceId: params.resourceId,
      activeUsers,
      viewerCount: activeUsers.filter(u => u.action === 'viewing').length,
      editorCount: activeUsers.filter(u => u.action === 'editing').length,
    };
  }

  /**
   * Get all active presence records (for debugging)
   */
  public getAllPresence(): Map<string, PresenceRecord[]> {
    return new Map(this.presenceMap);
  }

  /**
   * Clear all presence records (for testing)
   */
  public clearAll(): void {
    this.presenceMap.clear();
  }
}

// Singleton instance
export const presenceService = new PresenceService();

export default presenceService;
