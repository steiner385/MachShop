/**
 * Webhook Controller
 * Issue #60: Phase 9 - Webhook Support for Real-Time Sync Notifications
 *
 * Handles webhook registration, management, testing, and delivery.
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import WebhookService, { WebhookEventType } from '../services/erp/webhooks/WebhookService';
import { logger } from '../utils/logger';

/**
 * Webhook Controller
 */
export class WebhookController {
  private prisma: PrismaClient;
  private webhookService: WebhookService;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.webhookService = new WebhookService(this.prisma);
  }

  /**
   * Create webhook endpoint
   */
  async createWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;
      const { url, eventTypes, description, secret } = req.body;

      // Validate required fields
      if (!url || !eventTypes || !Array.isArray(eventTypes)) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Missing required fields: url, eventTypes (array)',
        });
        return;
      }

      if (eventTypes.length === 0) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'At least one event type is required',
        });
        return;
      }

      // Validate event types
      const validEventTypes = Object.values(WebhookEventType);
      const invalidTypes = eventTypes.filter((type: string) => !validEventTypes.includes(type));
      if (invalidTypes.length > 0) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid event types',
          invalidTypes,
        });
        return;
      }

      const webhook = await this.webhookService.registerWebhook({
        url,
        integrationId,
        eventTypes,
        description,
        secret,
      });

      logger.info('Webhook created', {
        webhookId: webhook.id,
        integrationId,
        url,
      });

      res.status(201).json({
        message: 'Webhook registered successfully',
        webhook,
      });
    } catch (error) {
      logger.error('Failed to create webhook', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'WEBHOOK_CREATION_FAILED',
        message: 'Failed to create webhook',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update webhook endpoint
   */
  async updateWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      const updates = req.body;

      // Validate at least one update field
      if (Object.keys(updates).length === 0) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'No fields to update',
        });
        return;
      }

      // Validate event types if provided
      if (updates.eventTypes) {
        if (!Array.isArray(updates.eventTypes)) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'eventTypes must be an array',
          });
          return;
        }

        const validEventTypes = Object.values(WebhookEventType);
        const invalidTypes = updates.eventTypes.filter(
          (type: string) => !validEventTypes.includes(type)
        );
        if (invalidTypes.length > 0) {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid event types',
            invalidTypes,
          });
          return;
        }
      }

      const webhook = await this.webhookService.updateWebhook(webhookId, updates);

      logger.info('Webhook updated', {
        webhookId,
        updates: Object.keys(updates),
      });

      res.json({
        message: 'Webhook updated successfully',
        webhook,
      });
    } catch (error) {
      logger.error('Failed to update webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: req.params.webhookId,
      });

      res.status(500).json({
        error: 'WEBHOOK_UPDATE_FAILED',
        message: 'Failed to update webhook',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Delete webhook endpoint
   */
  async deleteWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      await this.webhookService.deleteWebhook(webhookId);

      logger.info('Webhook deleted', { webhookId });

      res.json({
        message: 'Webhook deleted successfully',
      });
    } catch (error) {
      logger.error('Failed to delete webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: req.params.webhookId,
      });

      res.status(500).json({
        error: 'WEBHOOK_DELETION_FAILED',
        message: 'Failed to delete webhook',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get webhooks for integration
   */
  async getWebhooks(req: Request, res: Response): Promise<void> {
    try {
      const { integrationId } = req.params;

      const webhooks = await this.webhookService.getWebhooks(integrationId);

      res.json({
        webhooks,
        count: webhooks.length,
      });
    } catch (error) {
      logger.error('Failed to get webhooks', {
        error: error instanceof Error ? error.message : String(error),
        integrationId: req.params.integrationId,
      });

      res.status(500).json({
        error: 'WEBHOOK_FETCH_FAILED',
        message: 'Failed to get webhooks',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test webhook endpoint
   */
  async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const success = await this.webhookService.testWebhook(webhookId);

      logger.info('Webhook test completed', {
        webhookId,
        success,
      });

      res.json({
        message: success ? 'Webhook test successful' : 'Webhook test failed',
        success,
      });
    } catch (error) {
      logger.error('Failed to test webhook', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: req.params.webhookId,
      });

      res.status(500).json({
        error: 'WEBHOOK_TEST_FAILED',
        message: 'Failed to test webhook',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get webhook delivery history
   */
  async getDeliveryHistory(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;
      const { limit = 50 } = req.query;

      const deliveries = await this.webhookService.getDeliveryHistory(
        webhookId,
        parseInt(String(limit))
      );

      res.json({
        deliveries,
        count: deliveries.length,
      });
    } catch (error) {
      logger.error('Failed to get delivery history', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: req.params.webhookId,
      });

      res.status(500).json({
        error: 'DELIVERY_HISTORY_FETCH_FAILED',
        message: 'Failed to get delivery history',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get webhook delivery statistics
   */
  async getDeliveryStats(req: Request, res: Response): Promise<void> {
    try {
      const { webhookId } = req.params;

      const stats = await this.webhookService.getDeliveryStats(webhookId);

      res.json({
        stats,
      });
    } catch (error) {
      logger.error('Failed to get delivery stats', {
        error: error instanceof Error ? error.message : String(error),
        webhookId: req.params.webhookId,
      });

      res.status(500).json({
        error: 'DELIVERY_STATS_FETCH_FAILED',
        message: 'Failed to get delivery statistics',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get available webhook event types
   */
  async getEventTypes(req: Request, res: Response): Promise<void> {
    try {
      const eventTypes = Object.values(WebhookEventType);

      res.json({
        eventTypes,
        count: eventTypes.length,
      });
    } catch (error) {
      logger.error('Failed to get event types', {
        error: error instanceof Error ? error.message : String(error),
      });

      res.status(500).json({
        error: 'EVENT_TYPES_FETCH_FAILED',
        message: 'Failed to get event types',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default WebhookController;
