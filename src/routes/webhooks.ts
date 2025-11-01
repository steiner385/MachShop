/**
 * Webhook Routes
 * Issue #60: Phase 9 - Webhook Support for Real-Time Sync Notifications
 *
 * Routes for managing webhook endpoints, testing, and delivery history
 */

import express, { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import WebhookController from '../controllers/WebhookController';
import { PrismaClient } from '@prisma/client';
import { requireERPAccess } from '../middleware/erpAuth';

const router = express.Router();
const prisma = new PrismaClient();
const webhookController = new WebhookController(prisma);

/**
 * @route POST /api/v1/webhooks/event-types
 * @desc Get available webhook event types
 * @access Private (requires erp:view)
 */
router.get('/event-types',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.getEventTypes(req, res);
  })
);

/**
 * @route GET /api/v1/webhooks/integrations/:integrationId
 * @desc Get webhooks for an integration
 * @access Private (requires erp:view)
 */
router.get('/integrations/:integrationId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.getWebhooks(req, res);
  })
);

/**
 * @route POST /api/v1/webhooks/integrations/:integrationId
 * @desc Create new webhook for an integration
 * @access Private (requires erp:create)
 * @body { url, eventTypes, description?, secret? }
 */
router.post('/integrations/:integrationId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.createWebhook(req, res);
  })
);

/**
 * @route PATCH /api/v1/webhooks/:webhookId
 * @desc Update webhook configuration
 * @access Private (requires erp:update)
 * @body { url?, eventTypes?, description?, isActive? }
 */
router.patch('/:webhookId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.updateWebhook(req, res);
  })
);

/**
 * @route DELETE /api/v1/webhooks/:webhookId
 * @desc Delete webhook endpoint
 * @access Private (requires erp:delete)
 */
router.delete('/:webhookId',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.deleteWebhook(req, res);
  })
);

/**
 * @route POST /api/v1/webhooks/:webhookId/test
 * @desc Test webhook endpoint with a test delivery
 * @access Private (requires erp:sync)
 */
router.post('/:webhookId/test',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.testWebhook(req, res);
  })
);

/**
 * @route GET /api/v1/webhooks/:webhookId/deliveries
 * @desc Get webhook delivery history with pagination
 * @access Private (requires erp:view)
 * @query { limit: number }
 */
router.get('/:webhookId/deliveries',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.getDeliveryHistory(req, res);
  })
);

/**
 * @route GET /api/v1/webhooks/:webhookId/stats
 * @desc Get webhook delivery statistics
 * @access Private (requires erp:view)
 */
router.get('/:webhookId/stats',
  requireERPAccess,
  asyncHandler(async (req: Request, res: Response) => {
    await webhookController.getDeliveryStats(req, res);
  })
);

export default router;
