/**
 * Realtime Event Service
 * Issue #60: Phase 16 - Dashboard & Real-time Visualization
 *
 * Manages WebSocket events for real-time dashboard updates.
 */

import { logger } from '../../../utils/logger';

/**
 * Event types
 */
export enum EventType {
  SYNC_STARTED = 'SYNC_STARTED',
  SYNC_COMPLETED = 'SYNC_COMPLETED',
  SYNC_FAILED = 'SYNC_FAILED',
  CONFLICT_DETECTED = 'CONFLICT_DETECTED',
  CONFLICT_RESOLVED = 'CONFLICT_RESOLVED',
  JOB_QUEUED = 'JOB_QUEUED',
  JOB_STARTED = 'JOB_STARTED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  JOB_FAILED = 'JOB_FAILED',
  ALERT_CREATED = 'ALERT_CREATED',
  ALERT_RESOLVED = 'ALERT_RESOLVED',
  SYSTEM_STATUS_CHANGED = 'SYSTEM_STATUS_CHANGED',
  METRICS_UPDATED = 'METRICS_UPDATED',
}

/**
 * Realtime event
 */
export interface RealtimeEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  source: string; // Service name
  data: Record<string, any>;
  userId?: string;
  integrationId?: string;
}

/**
 * Event subscriber callback
 */
export type EventSubscriber = (event: RealtimeEvent) => void;

/**
 * Realtime Event Service
 */
export class RealtimeEventService {
  private subscribers: Map<string, Set<EventSubscriber>> = new Map();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize = 1000;
  private eventCounter = 0;

  /**
   * Subscribe to events
   */
  subscribe(eventType: EventType | 'ALL', callback: EventSubscriber): string {
    try {
      const key = eventType === 'ALL' ? 'ALL' : eventType;

      if (!this.subscribers.has(key)) {
        this.subscribers.set(key, new Set());
      }

      const subscribers = this.subscribers.get(key)!;
      subscribers.add(callback);

      const subscriberId = `sub-${Date.now()}-${++this.eventCounter}`;

      logger.info('Event subscriber registered', {
        subscriberId,
        eventType: key,
        totalSubscribers: subscribers.size,
      });

      // Return unsubscribe function
      return subscriberId;
    } catch (error) {
      logger.error('Failed to subscribe to events', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Emit an event
   */
  async emit(
    type: EventType,
    source: string,
    data: Record<string, any>,
    options?: {
      userId?: string;
      integrationId?: string;
    }
  ): Promise<RealtimeEvent> {
    try {
      const id = `event-${Date.now()}-${++this.eventCounter}`;

      const event: RealtimeEvent = {
        id,
        type,
        timestamp: new Date(),
        source,
        data,
        userId: options?.userId,
        integrationId: options?.integrationId,
      };

      // Store in history
      this.eventHistory.push(event);
      if (this.eventHistory.length > this.maxHistorySize) {
        this.eventHistory.shift();
      }

      // Notify subscribers
      this.notifySubscribers(event);

      logger.info('Event emitted', {
        eventId: id,
        type,
        source,
      });

      return event;
    } catch (error) {
      logger.error('Failed to emit event', {
        error: error instanceof Error ? error.message : String(error),
        type,
      });
      throw error;
    }
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(event: RealtimeEvent): void {
    try {
      // Notify specific event type subscribers
      const specificSubscribers = this.subscribers.get(event.type);
      if (specificSubscribers) {
        specificSubscribers.forEach((callback) => {
          try {
            callback(event);
          } catch (error) {
            logger.error('Error in event subscriber', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }

      // Notify all event subscribers
      const allSubscribers = this.subscribers.get('ALL');
      if (allSubscribers) {
        allSubscribers.forEach((callback) => {
          try {
            callback(event);
          } catch (error) {
            logger.error('Error in all-events subscriber', {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        });
      }
    } catch (error) {
      logger.error('Failed to notify subscribers', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get event history
   */
  getEventHistory(options?: {
    eventType?: EventType;
    source?: string;
    limit?: number;
    offset?: number;
  }): { events: RealtimeEvent[]; total: number } {
    try {
      let history = [...this.eventHistory];

      if (options?.eventType) {
        history = history.filter((e) => e.type === options.eventType);
      }

      if (options?.source) {
        history = history.filter((e) => e.source === options.source);
      }

      // Sort by timestamp descending
      history.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      const total = history.length;
      const limit = options?.limit || 50;
      const offset = options?.offset || 0;
      const sliced = history.slice(offset, offset + limit);

      return { events: sliced, total };
    } catch (error) {
      logger.error('Failed to get event history', {
        error: error instanceof Error ? error.message : String(error),
      });
      return { events: [], total: 0 };
    }
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySource: Record<string, number>;
    subscriberCount: number;
  } {
    try {
      const eventsByType: Record<string, number> = {};
      const eventsBySource: Record<string, number> = {};

      this.eventHistory.forEach((event) => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
        eventsBySource[event.source] = (eventsBySource[event.source] || 0) + 1;
      });

      const subscriberCount = Array.from(this.subscribers.values()).reduce(
        (sum, set) => sum + set.size,
        0
      );

      return {
        totalEvents: this.eventHistory.length,
        eventsByType,
        eventsBySource,
        subscriberCount,
      };
    } catch (error) {
      logger.error('Failed to get event statistics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalEvents: 0,
        eventsByType: {},
        eventsBySource: {},
        subscriberCount: 0,
      };
    }
  }

  /**
   * Clear event history
   */
  clearEventHistory(): number {
    try {
      const count = this.eventHistory.length;
      this.eventHistory = [];

      logger.info('Event history cleared', {
        count,
      });

      return count;
    } catch (error) {
      logger.error('Failed to clear event history', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default RealtimeEventService;
