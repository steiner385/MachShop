/**
 * Notification Service
 *
 * Manages in-app and email notifications for NCR workflow events:
 * - Approval request notifications
 * - State transition notifications
 * - Escalation notifications
 * - System notifications
 *
 * Features:
 * - Notification queue management
 * - Persistent notification storage
 * - Mark as read/unread
 * - Notification filtering and search
 * - Real-time notification updates via WebSocket
 */

import { message } from 'antd';

/**
 * Notification Type
 */
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'approval' | 'escalation';

/**
 * Notification Category
 */
export type NotificationCategory =
  | 'APPROVAL_REQUEST'
  | 'STATE_TRANSITION'
  | 'ESCALATION'
  | 'REJECTION'
  | 'SYSTEM'
  | 'QUALITY_ALERT';

/**
 * Notification Interface
 */
export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  description?: string;
  icon?: string;
  action?: {
    label: string;
    url: string;
  };
  relatedData?: {
    ncrId?: string;
    ncrNumber?: string;
    approvalId?: string;
    userId?: string;
  };
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Email Notification Interface
 */
export interface EmailNotification {
  id: string;
  recipientEmail: string;
  subject: string;
  template: string;
  data: Record<string, any>;
  sent: boolean;
  sentAt?: Date;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
}

/**
 * Notification Preference Interface
 */
export interface NotificationPreference {
  userId: string;
  inAppNotifications: boolean;
  emailNotifications: boolean;
  approvalRequests: boolean;
  stateTransitions: boolean;
  escalations: boolean;
  systemAlerts: boolean;
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:MM
    endTime: string; // HH:MM
  };
}

/**
 * Notification Service
 */
class NotificationService {
  private static instance: NotificationService;
  private notifications: Notification[] = [];
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private storageKey = 'ncr_notifications';
  private preferencesKey = 'notification_preferences';

  /**
   * Get singleton instance
   */
  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize service
   */
  constructor() {
    this.loadNotificationsFromStorage();
  }

  /**
   * Load notifications from local storage
   */
  private loadNotificationsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.notifications = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load notifications from storage:', error);
    }
  }

  /**
   * Save notifications to local storage
   */
  private saveNotificationsToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Failed to save notifications to storage:', error);
    }
  }

  /**
   * Get all notifications
   */
  getNotifications(): Notification[] {
    return [...this.notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Get unread notifications count
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(): Notification[] {
    return this.getNotifications().filter((n) => !n.read);
  }

  /**
   * Get notifications by category
   */
  getNotificationsByCategory(category: NotificationCategory): Notification[] {
    return this.getNotifications().filter((n) => n.category === category);
  }

  /**
   * Search notifications
   */
  searchNotifications(query: string): Notification[] {
    const lowerQuery = query.toLowerCase();
    return this.getNotifications().filter(
      (n) =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.message.toLowerCase().includes(lowerQuery) ||
        n.description?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Create approval request notification
   */
  createApprovalNotification(
    approvalId: string,
    ncrNumber: string,
    requestType: string,
    requesterName: string
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'approval',
      category: 'APPROVAL_REQUEST',
      title: 'Approval Request',
      message: `${requesterName} requested approval for ${requestType} on NCR ${ncrNumber}`,
      description: `Please review and approve the ${requestType} for NCR ${ncrNumber}`,
      action: {
        label: 'Review',
        url: `/quality/ncr/${ncrNumber}/approvals`,
      },
      relatedData: {
        ncrNumber,
        approvalId,
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.addNotification(notification);
    message.info(`Approval request received from ${requesterName}`);
  }

  /**
   * Create state transition notification
   */
  createStateTransitionNotification(
    ncrNumber: string,
    fromState: string,
    toState: string,
    changedByName: string
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'info',
      category: 'STATE_TRANSITION',
      title: 'State Transition',
      message: `NCR ${ncrNumber} transitioned from ${fromState} to ${toState}`,
      description: `Changed by ${changedByName}`,
      action: {
        label: 'View Details',
        url: `/quality/ncr/${ncrNumber}`,
      },
      relatedData: {
        ncrNumber,
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.addNotification(notification);
    message.success(`NCR ${ncrNumber} transitioned to ${toState}`);
  }

  /**
   * Create escalation notification
   */
  createEscalationNotification(
    approvalId: string,
    ncrNumber: string,
    hoursOverdue: number
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'error',
      category: 'ESCALATION',
      title: 'Approval Escalated',
      message: `Approval for NCR ${ncrNumber} is ${hoursOverdue} hours overdue`,
      description: 'This approval has been escalated to management',
      action: {
        label: 'Take Action',
        url: `/quality/ncr/${ncrNumber}/approvals`,
      },
      relatedData: {
        ncrNumber,
        approvalId,
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.addNotification(notification);
    message.error(`Approval escalated for NCR ${ncrNumber}`);
  }

  /**
   * Create rejection notification
   */
  createRejectionNotification(
    ncrNumber: string,
    rejectionReason: string,
    rejectedByName: string
  ): void {
    const notification: Notification = {
      id: this.generateId(),
      type: 'warning',
      category: 'REJECTION',
      title: 'Approval Rejected',
      message: `Your approval request for NCR ${ncrNumber} has been rejected`,
      description: `Reason: ${rejectionReason}\nRejected by: ${rejectedByName}`,
      action: {
        label: 'View Details',
        url: `/quality/ncr/${ncrNumber}`,
      },
      relatedData: {
        ncrNumber,
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.addNotification(notification);
    message.warning(`Approval rejected for NCR ${ncrNumber}`);
  }

  /**
   * Create system notification
   */
  createSystemNotification(title: string, message: string, type: NotificationType = 'info'): void {
    const notification: Notification = {
      id: this.generateId(),
      type,
      category: 'SYSTEM',
      title,
      message,
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.addNotification(notification);
  }

  /**
   * Create quality alert notification
   */
  createQualityAlertNotification(ncrNumber: string, severity: string, message: string): void {
    const notification: Notification = {
      id: this.generateId(),
      type: severity === 'HIGH' ? 'error' : 'warning',
      category: 'QUALITY_ALERT',
      title: `Quality Alert - ${severity} Severity`,
      message: `NCR ${ncrNumber}: ${message}`,
      action: {
        label: 'View NCR',
        url: `/quality/ncr/${ncrNumber}`,
      },
      relatedData: {
        ncrNumber,
      },
      read: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.addNotification(notification);
  }

  /**
   * Add notification
   */
  private addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.updatedAt = new Date();
      this.saveNotificationsToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    this.notifications.forEach((n) => {
      n.read = true;
      n.updatedAt = new Date();
    });
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== notificationId);
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notifications = [];
    this.saveNotificationsToStorage();
    this.notifyListeners();
  }

  /**
   * Subscribe to notification changes
   */
  subscribe(listener: (notifications: Notification[]) => void): () => void {
    this.listeners.push(listener);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getNotifications()));
  }

  /**
   * Load notifications from server
   */
  async loadFromServer(userId: string): Promise<Notification[]> {
    try {
      const response = await fetch(`/api/v2/notifications?userId=${userId}`);
      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }
      const data = await response.json();
      this.notifications = data.notifications || [];
      this.saveNotificationsToStorage();
      this.notifyListeners();
      return this.getNotifications();
    } catch (error) {
      console.error('Error loading notifications from server:', error);
      return this.getNotifications();
    }
  }

  /**
   * Setup WebSocket for real-time notifications
   */
  setupWebSocket(userId: string): WebSocket | null {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const ws = new WebSocket(`${protocol}://${window.location.host}/ws/notifications?userId=${userId}`);

      ws.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          this.addNotification(notification);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return ws;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      return null;
    }
  }

  /**
   * Get notification preferences
   */
  getPreferences(userId: string): NotificationPreference {
    try {
      const stored = localStorage.getItem(`${this.preferencesKey}_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }

    // Return default preferences
    return {
      userId,
      inAppNotifications: true,
      emailNotifications: true,
      approvalRequests: true,
      stateTransitions: true,
      escalations: true,
      systemAlerts: true,
    };
  }

  /**
   * Save notification preferences
   */
  savePreferences(preferences: NotificationPreference): void {
    try {
      localStorage.setItem(`${this.preferencesKey}_${preferences.userId}`, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default NotificationService.getInstance();
