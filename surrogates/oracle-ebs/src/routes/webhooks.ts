/**
 * Oracle EBS Surrogate - Webhook Routes
 * REST API endpoints for webhook management and testing
 */

import express, { Router, Request, Response } from 'express';
import { WebhookService, WebhookEvent as WebhookEventType } from '../services/webhook.service';
import { Logger } from '../utils/logger';

const router: Router = express.Router();
const logger = Logger.getInstance();
const webhookService = WebhookService.getInstance();

/**
 * POST /webhooks/subscriptions
 * Create webhook subscription
 */
router.post('/subscriptions', async (req: Request, res: Response) => {
  try {
    const { name, url, events, maxRetries, backoffSeconds } = req.body;

    if (!name || !url || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, url, events (array)'
      });
    }

    const result = await webhookService.createSubscription(
      name,
      url,
      events,
      maxRetries || 3,
      backoffSeconds || 60
    );

    res.status(result.success ? 201 : 400).json(result);
  } catch (error) {
    logger.error('Webhook subscription creation error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /webhooks/subscriptions
 * List all webhook subscriptions
 */
router.get('/subscriptions', async (req: Request, res: Response) => {
  try {
    const subscriptions = await webhookService.listSubscriptions();

    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length
    });
  } catch (error) {
    logger.error('Webhook subscriptions list error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /webhooks/subscriptions/:subscriptionId
 * Get webhook subscription details
 */
router.get('/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const subscription = await webhookService.getSubscription(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: `Subscription ${subscriptionId} not found`
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    logger.error('Webhook subscription retrieval error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /webhooks/subscriptions/:subscriptionId
 * Delete webhook subscription
 */
router.delete('/subscriptions/:subscriptionId', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const result = await webhookService.deleteSubscription(subscriptionId);

    res.json(result);
  } catch (error) {
    logger.error('Webhook subscription deletion error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/events/publish
 * Publish webhook event to all subscribers
 */
router.post('/events/publish', async (req: Request, res: Response) => {
  try {
    const { eventType, payload } = req.body;

    if (!eventType || !payload) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: eventType, payload'
      });
    }

    const validEvents: WebhookEventType[] = [
      'WORK_ORDER_CREATED',
      'WORK_ORDER_STATUS_CHANGED',
      'INVENTORY_TRANSACTION',
      'INVENTORY_THRESHOLD_ALERT',
      'PO_RECEIPT_RECEIVED',
      'EQUIPMENT_DOWNTIME_ALERT'
    ];

    if (!validEvents.includes(eventType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid event type. Must be one of: ${validEvents.join(', ')}`
      });
    }

    const result = await webhookService.publishEvent(eventType, payload);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Webhook event publishing error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/events/test
 * Test webhook by publishing sample event
 */
router.post('/events/test', async (req: Request, res: Response) => {
  try {
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'subscriptionId is required'
      });
    }

    const subscription = await webhookService.getSubscription(subscriptionId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: `Subscription ${subscriptionId} not found`
      });
    }

    // Publish test event
    const testEvent = subscription.events[0] || 'WORK_ORDER_CREATED';
    const result = await webhookService.publishEvent(testEvent as any, {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test webhook event'
    });

    res.json({
      success: true,
      data: result,
      message: `Test event ${testEvent} published to subscription ${subscriptionId}`
    });
  } catch (error) {
    logger.error('Webhook test error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /webhooks/events/:eventId
 * Get event delivery status
 */
router.get('/events/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const event = await webhookService.getEventStatus(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: `Event ${eventId} not found`
      });
    }

    res.json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Webhook event status error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /webhooks/stats
 * Get webhook delivery statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await webhookService.getDeliveryStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Webhook stats error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/events/work-order-created
 * Publish work order created event
 */
router.post('/events/work-order-created', async (req: Request, res: Response) => {
  try {
    const { workOrderId, orderNumber, description, status } = req.body;

    const result = await webhookService.publishEvent('WORK_ORDER_CREATED', {
      workOrderId,
      orderNumber,
      description,
      status,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Work order created event error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/events/work-order-status-changed
 * Publish work order status changed event
 */
router.post('/events/work-order-status-changed', async (req: Request, res: Response) => {
  try {
    const { workOrderId, orderNumber, previousStatus, newStatus } = req.body;

    const result = await webhookService.publishEvent('WORK_ORDER_STATUS_CHANGED', {
      workOrderId,
      orderNumber,
      previousStatus,
      newStatus,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Work order status changed event error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/events/inventory-transaction
 * Publish inventory transaction event
 */
router.post('/events/inventory-transaction', async (req: Request, res: Response) => {
  try {
    const { partNumber, transactionType, quantity, balance } = req.body;

    const result = await webhookService.publishEvent('INVENTORY_TRANSACTION', {
      partNumber,
      transactionType,
      quantity,
      balance,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Inventory transaction event error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /webhooks/events/po-receipt-received
 * Publish PO receipt event
 */
router.post('/events/po-receipt-received', async (req: Request, res: Response) => {
  try {
    const { poNumber, receiptNumber, receivedQuantity } = req.body;

    const result = await webhookService.publishEvent('PO_RECEIPT_RECEIVED', {
      poNumber,
      receiptNumber,
      receivedQuantity,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('PO receipt event error', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
