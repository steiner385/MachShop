/**
 * Oracle EBS Surrogate - Webhook Service
 * Manages webhook subscriptions and event delivery with retry logic
 */

import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { DatabaseService } from './database.service';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export type WebhookEvent =
  | 'WORK_ORDER_CREATED'
  | 'WORK_ORDER_STATUS_CHANGED'
  | 'INVENTORY_TRANSACTION'
  | 'INVENTORY_THRESHOLD_ALERT'
  | 'PO_RECEIPT_RECEIVED'
  | 'EQUIPMENT_DOWNTIME_ALERT';

export interface WebhookSubscription {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  active: boolean;
  retryPolicy: {
    maxAttempts: number;
    backoffSeconds: number;
  };
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  subscriptionId: string;
  eventType: WebhookEvent;
  payload: any;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  attempts: number;
  lastAttempt?: string;
  nextRetry?: string;
  error?: string;
  createdAt: string;
}

export class WebhookService {
  private static instance: WebhookService;
  private db: DatabaseService;
  private processingSubscriptions = new Set<string>();

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.startEventProcessor();
  }

  static getInstance(): WebhookService {
    if (!WebhookService.instance) {
      WebhookService.instance = new WebhookService();
    }
    return WebhookService.instance;
  }

  /**
   * Create webhook subscription
   */
  async createSubscription(
    name: string,
    url: string,
    events: WebhookEvent[],
    maxRetries: number = 3,
    backoffSeconds: number = 60
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    try {
      const id = uuidv4();
      const now = new Date().toISOString();

      await this.db.run(
        `INSERT INTO webhook_subscriptions (
          id, name, url, events, active, max_retries, backoff_seconds, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          name,
          url,
          JSON.stringify(events),
          1, // active
          maxRetries,
          backoffSeconds,
          now
        ]
      );

      logger.info(`Webhook subscription created: ${name} (${id})`);

      return {
        success: true,
        subscriptionId: id
      };
    } catch (error) {
      logger.error('Failed to create webhook subscription', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Publish event to subscribers
   */
  async publishEvent(
    eventType: WebhookEvent,
    payload: any
  ): Promise<{ success: boolean; deliveries: number }> {
    try {
      const subscriptions = await this.db.all(
        `SELECT * FROM webhook_subscriptions WHERE active = 1`
      );

      let deliveries = 0;

      for (const sub of subscriptions) {
        const events = JSON.parse(sub.events || '[]');

        if (events.includes(eventType)) {
          const eventId = uuidv4();
          const now = new Date().toISOString();

          // Create event record
          await this.db.run(
            `INSERT INTO webhook_events (
              id, subscription_id, event_type, payload, status, attempts, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              eventId,
              sub.id,
              eventType,
              JSON.stringify(payload),
              'PENDING',
              0,
              now
            ]
          );

          deliveries++;
          logger.debug(`Event published: ${eventType} to subscription ${sub.id}`);
        }
      }

      logger.info(`Event ${eventType} published to ${deliveries} subscriptions`);

      return {
        success: true,
        deliveries
      };
    } catch (error) {
      logger.error('Failed to publish event', error);
      return {
        success: false,
        deliveries: 0
      };
    }
  }

  /**
   * Process pending webhook deliveries
   */
  private async processPendingEvents(): Promise<void> {
    try {
      const pendingEvents = await this.db.all(
        `SELECT we.*, ws.url, ws.max_retries, ws.backoff_seconds
         FROM webhook_events we
         JOIN webhook_subscriptions ws ON we.subscription_id = ws.id
         WHERE we.status = 'PENDING' OR (we.status = 'FAILED' AND we.next_retry <= datetime('now'))
         ORDER BY we.created_at ASC
         LIMIT 50`
      );

      for (const event of pendingEvents) {
        if (this.processingSubscriptions.has(event.id)) {
          continue; // Already processing this event
        }

        await this.processEvent(event);
      }
    } catch (error) {
      logger.error('Error processing pending events', error);
    }
  }

  /**
   * Process single webhook event
   */
  private async processEvent(event: any): Promise<void> {
    this.processingSubscriptions.add(event.id);

    try {
      const payload = JSON.parse(event.payload);
      const attempts = event.attempts + 1;
      const now = new Date().toISOString();

      try {
        // Send webhook
        const response = await axios.post(event.url, {
          id: event.id,
          eventType: event.event_type,
          timestamp: now,
          data: payload
        }, {
          timeout: 5000,
          headers: {
            'X-Webhook-ID': event.id,
            'X-Webhook-Event': event.event_type
          }
        });

        if (response.status >= 200 && response.status < 300) {
          // Success
          await this.db.run(
            `UPDATE webhook_events SET status = 'DELIVERED', last_attempt = ? WHERE id = ?`,
            [now, event.id]
          );

          logger.info(`Webhook delivered successfully: ${event.id}`);
        } else {
          // Unexpected status
          await this.scheduleRetry(event, attempts, 'Unexpected status code', now);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (attempts >= event.max_retries) {
          // Max retries exceeded
          await this.db.run(
            `UPDATE webhook_events SET status = 'FAILED', error = ?, last_attempt = ? WHERE id = ?`,
            [errorMessage, now, event.id]
          );

          logger.error(`Webhook failed after ${attempts} attempts: ${event.id}`, error);
        } else {
          // Schedule retry
          await this.scheduleRetry(event, attempts, errorMessage, now);
        }
      }
    } finally {
      this.processingSubscriptions.delete(event.id);
    }
  }

  /**
   * Schedule retry for failed webhook
   */
  private async scheduleRetry(
    event: any,
    attempts: number,
    error: string,
    now: string
  ): Promise<void> {
    const backoffSeconds = event.backoff_seconds * Math.pow(2, attempts - 1); // Exponential backoff
    const nextRetry = new Date(Date.now() + backoffSeconds * 1000).toISOString();

    await this.db.run(
      `UPDATE webhook_events SET
       status = 'FAILED',
       attempts = ?,
       error = ?,
       last_attempt = ?,
       next_retry = ?
       WHERE id = ?`,
      [attempts, error, now, nextRetry, event.id]
    );

    logger.warn(
      `Webhook retry scheduled: ${event.id} at ${nextRetry} (attempt ${attempts})`
    );
  }

  /**
   * Get subscription details
   */
  async getSubscription(subscriptionId: string): Promise<WebhookSubscription | null> {
    try {
      const sub = await this.db.get(
        `SELECT * FROM webhook_subscriptions WHERE id = ?`,
        [subscriptionId]
      );

      if (!sub) {
        return null;
      }

      return {
        id: sub.id,
        name: sub.name,
        url: sub.url,
        events: JSON.parse(sub.events || '[]'),
        active: !!sub.active,
        retryPolicy: {
          maxAttempts: sub.max_retries,
          backoffSeconds: sub.backoff_seconds
        },
        createdAt: sub.created_at
      };
    } catch (error) {
      logger.error(`Failed to get subscription ${subscriptionId}`, error);
      return null;
    }
  }

  /**
   * List all subscriptions
   */
  async listSubscriptions(): Promise<WebhookSubscription[]> {
    try {
      const subs = await this.db.all(`SELECT * FROM webhook_subscriptions ORDER BY created_at DESC`);

      return subs.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        url: sub.url,
        events: JSON.parse(sub.events || '[]'),
        active: !!sub.active,
        retryPolicy: {
          maxAttempts: sub.max_retries,
          backoffSeconds: sub.backoff_seconds
        },
        createdAt: sub.created_at
      }));
    } catch (error) {
      logger.error('Failed to list subscriptions', error);
      return [];
    }
  }

  /**
   * Delete subscription
   */
  async deleteSubscription(subscriptionId: string): Promise<{ success: boolean }> {
    try {
      await this.db.run(
        `DELETE FROM webhook_subscriptions WHERE id = ?`,
        [subscriptionId]
      );

      logger.info(`Webhook subscription deleted: ${subscriptionId}`);

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete subscription', error);
      return { success: false };
    }
  }

  /**
   * Get event delivery status
   */
  async getEventStatus(eventId: string): Promise<any | null> {
    try {
      return await this.db.get(
        `SELECT * FROM webhook_events WHERE id = ?`,
        [eventId]
      );
    } catch (error) {
      logger.error(`Failed to get event status for ${eventId}`, error);
      return null;
    }
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(): Promise<{
    totalEvents: number;
    delivered: number;
    failed: number;
    pending: number;
    successRate: number;
  }> {
    try {
      const stats = await this.db.get(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'DELIVERED' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) as pending
         FROM webhook_events`
      );

      const total = stats?.total || 0;
      const delivered = stats?.delivered || 0;

      return {
        totalEvents: total,
        delivered: delivered,
        failed: stats?.failed || 0,
        pending: stats?.pending || 0,
        successRate: total > 0 ? (delivered / total) * 100 : 0
      };
    } catch (error) {
      logger.error('Failed to get delivery statistics', error);
      return {
        totalEvents: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
        successRate: 0
      };
    }
  }

  /**
   * Start background event processor
   */
  private startEventProcessor(): void {
    // Process pending events every 10 seconds
    setInterval(() => {
      this.processPendingEvents();
    }, 10000);

    logger.info('Webhook event processor started');
  }
}
