import { EventEmitter } from 'events';
import { collaborationApi } from '@/api/collaboration';

export interface CollaborationEvent {
  type: 'comment' | 'annotation' | 'review' | 'notification' | 'activity' | 'conflict' | 'presence';
  action: 'created' | 'updated' | 'deleted' | 'resolved';
  documentType: string;
  documentId: string;
  userId: string;
  userName: string;
  timestamp: string;
  data: any;
}

export interface PresenceInfo {
  userId: string;
  userName: string;
  lastSeen: string;
  isEditing: boolean;
  editingSince?: string;
  cursor?: {
    x: number;
    y: number;
  };
}

/**
 * Real-time Collaboration Service
 * Manages Server-Sent Events for live collaboration updates
 */
class RealTimeCollaborationService extends EventEmitter {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;
  private subscriptions = new Set<string>();
  private presenceUsers = new Map<string, PresenceInfo>();

  /**
   * Connect to the real-time collaboration stream
   */
  connect(): void {
    if (this.eventSource && this.isConnected) {
      return; // Already connected
    }

    this.disconnect(); // Clean up any existing connection

    try {
      this.eventSource = collaborationApi.createEventStream();

      this.eventSource.onopen = () => {
        console.log('Real-time collaboration connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleCollaborationEvent(data);
        } catch (error) {
          console.error('Failed to parse collaboration event:', error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error('Real-time collaboration error:', error);
        this.isConnected = false;
        this.emit('error', error);
        this.handleReconnect();
      };

      // Set up custom event listeners for specific event types
      this.setupCustomEventListeners();

    } catch (error) {
      console.error('Failed to connect to real-time collaboration:', error);
      this.emit('error', error);
      this.handleReconnect();
    }
  }

  /**
   * Disconnect from the real-time collaboration stream
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.presenceUsers.clear();
    this.emit('disconnected');
  }

  /**
   * Subscribe to updates for a specific document
   */
  subscribeToDocument(documentType: string, documentId: string): void {
    const subscriptionKey = `${documentType}:${documentId}`;
    this.subscriptions.add(subscriptionKey);

    // Ensure connection is established
    if (!this.isConnected) {
      this.connect();
    }

    // Send subscription message if EventSource supports it
    // Note: SSE is typically one-way, so we might need to use a separate API call
    this.sendSubscriptionUpdate();
  }

  /**
   * Unsubscribe from updates for a specific document
   */
  unsubscribeFromDocument(documentType: string, documentId: string): void {
    const subscriptionKey = `${documentType}:${documentId}`;
    this.subscriptions.delete(subscriptionKey);
    this.sendSubscriptionUpdate();
  }

  /**
   * Send presence update (currently editing, cursor position, etc.)
   */
  updatePresence(documentType: string, documentId: string, presence: Partial<PresenceInfo>): void {
    if (!this.isConnected) return;

    // Send presence update via API call since SSE is typically one-way
    collaborationApi.updatePresence(documentType, documentId, presence)
      .catch(error => console.error('Failed to update presence:', error));
  }

  /**
   * Get current presence information for a document
   */
  getPresenceUsers(documentType: string, documentId: string): PresenceInfo[] {
    const documentKey = `${documentType}:${documentId}`;
    return Array.from(this.presenceUsers.values())
      .filter(user => user.userName.includes(documentKey)); // This is a simplified filter
  }

  /**
   * Check if the service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    reconnectAttempts: number;
    subscriptions: number;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
    };
  }

  /**
   * Handle incoming collaboration events
   */
  private handleCollaborationEvent(data: any): void {
    const event: CollaborationEvent = {
      type: data.type || 'activity',
      action: data.action || 'created',
      documentType: data.documentType,
      documentId: data.documentId,
      userId: data.userId,
      userName: data.userName,
      timestamp: data.timestamp || new Date().toISOString(),
      data: data.payload || data.data || {},
    };

    // Emit general collaboration event
    this.emit('collaboration-event', event);

    // Emit specific event types
    switch (event.type) {
      case 'comment':
        this.emit('comment-update', event);
        break;
      case 'annotation':
        this.emit('annotation-update', event);
        break;
      case 'review':
        this.emit('review-update', event);
        break;
      case 'notification':
        this.emit('notification-update', event);
        break;
      case 'activity':
        this.emit('activity-update', event);
        break;
      case 'conflict':
        this.emit('conflict-detected', event);
        break;
      case 'presence':
        this.handlePresenceUpdate(event);
        break;
    }

    // Emit document-specific events
    const documentKey = `${event.documentType}:${event.documentId}`;
    this.emit(`document-update:${documentKey}`, event);
  }

  /**
   * Handle presence updates
   */
  private handlePresenceUpdate(event: CollaborationEvent): void {
    const presence: PresenceInfo = {
      userId: event.userId,
      userName: event.userName,
      lastSeen: event.timestamp,
      isEditing: event.data.isEditing || false,
      editingSince: event.data.editingSince,
      cursor: event.data.cursor,
    };

    this.presenceUsers.set(event.userId, presence);
    this.emit('presence-update', {
      documentType: event.documentType,
      documentId: event.documentId,
      presence,
    });
  }

  /**
   * Set up custom event listeners for SSE
   */
  private setupCustomEventListeners(): void {
    if (!this.eventSource) return;

    // Listen for custom event types
    const eventTypes = [
      'comment-created',
      'comment-updated',
      'comment-deleted',
      'annotation-created',
      'annotation-updated',
      'annotation-deleted',
      'review-assigned',
      'review-completed',
      'notification-sent',
      'activity-logged',
      'conflict-detected',
      'presence-updated',
    ];

    eventTypes.forEach(eventType => {
      this.eventSource!.addEventListener(eventType, (event: any) => {
        try {
          const data = JSON.parse(event.data);
          this.handleCollaborationEvent({
            ...data,
            type: eventType.split('-')[0],
            action: eventType.split('-')[1] || 'updated',
          });
        } catch (error) {
          console.error(`Failed to parse ${eventType} event:`, error);
        }
      });
    });
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('max-reconnect-attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  /**
   * Send subscription update (if supported by backend)
   */
  private sendSubscriptionUpdate(): void {
    // Since SSE is typically one-way, we might need to use a separate API call
    // to update subscriptions on the server side
    const subscriptionList = Array.from(this.subscriptions);

    // This would be implemented as a separate API call
    collaborationApi.updateSubscriptions?.(subscriptionList)
      .catch(error => console.error('Failed to update subscriptions:', error));
  }
}

// Export singleton instance
export const realTimeCollaboration = new RealTimeCollaborationService();

// Export service class for testing
export { RealTimeCollaborationService };