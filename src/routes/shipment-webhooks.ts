/**
 * Shipment Webhook Routes
 * Phase 9: Webhook handlers for ERP shipment status updates
 * Issue #64: Material Movement & Logistics Management System
 *
 * Provides webhook endpoints for:
 * - Receiving shipment status updates from ERP systems
 * - Processing tracking updates
 * - Handling delivery confirmations
 * - Processing exceptions and delays
 * - Container receipt notifications
 */

import express from 'express';
import { PrismaClient } from '@prisma/client';
import pino from 'pino';
import { asyncHandler } from '../middleware/errorHandler';
import { ShipmentWebhookHandler } from '../services/movement/ShipmentWebhookHandler';

const logger = pino();

const router = express.Router();
const prisma = new PrismaClient();

// Initialize webhook handler with optional signature verification
const webhookHandler = new ShipmentWebhookHandler(prisma, {
  enableSignatureVerification: process.env.WEBHOOK_VERIFY_SIGNATURES === 'true',
  secretKey: process.env.WEBHOOK_SECRET_KEY,
  allowedSources: ['ERP', 'CARRIER_SYSTEM', 'FULFILLMENT_CENTER'],
  maxAge: 300 // 5 minutes
});

// ========================================
// SHIPMENT STATUS UPDATE WEBHOOKS
// ========================================

/**
 * @route POST /api/webhooks/shipments/status
 * @desc Receive shipment status update from ERP
 * @access Public (webhook endpoint - verify signature in production)
 * @body {Object} Shipment status update payload
 * @returns {Object} Webhook processing result
 *
 * Example payload:
 * {
 *   "erpShipmentNumber": "SHP-2024-001234",
 *   "erpOrderNumber": "ORD-2024-5678",
 *   "status": "SHIPPED",
 *   "statusReason": "Left warehouse",
 *   "estimatedDeliveryDate": "2024-11-05T18:00:00Z",
 *   "trackingNumber": "1Z999AA10123456784",
 *   "carrier": "FedEx",
 *   "containerIds": ["CONT-001", "CONT-002"],
 *   "lastUpdateTime": "2024-11-01T10:30:00Z",
 *   "updateSource": "ERP"
 * }
 */
router.post('/shipments/status',
  asyncHandler(async (req, res) => {
    const {
      erpShipmentNumber,
      erpOrderNumber,
      status,
      statusReason,
      estimatedDeliveryDate,
      actualDeliveryDate,
      trackingNumber,
      carrier,
      containerIds,
      lastUpdateTime,
      updateSource = 'ERP',
      signature
    } = req.body;

    // Validate required fields
    if (!erpShipmentNumber || !status) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: erpShipmentNumber, status'
      });
    }

    // Verify webhook signature if enabled
    if (req.headers['x-webhook-signature']) {
      const isValid = webhookHandler.verifyWebhookSignature(
        JSON.stringify(req.body),
        req.headers['x-webhook-signature'] as string,
        process.env.WEBHOOK_SECRET_KEY || ''
      );

      if (!isValid) {
        logger.warn(`Invalid webhook signature for shipment ${erpShipmentNumber}`);
        return res.status(401).json({
          error: 'INVALID_SIGNATURE',
          message: 'Webhook signature verification failed'
        });
      }
    }

    // Verify source is allowed
    if (!webhookHandler.isAllowedSource(updateSource)) {
      return res.status(403).json({
        error: 'UNAUTHORIZED_SOURCE',
        message: `Source system not allowed: ${updateSource}`
      });
    }

    // Process the shipment status update
    const result = await webhookHandler.handleShipmentStatusUpdate({
      erpShipmentNumber,
      erpOrderNumber,
      status,
      statusReason,
      estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined,
      actualDeliveryDate: actualDeliveryDate ? new Date(actualDeliveryDate) : undefined,
      trackingNumber,
      carrier,
      containerIds,
      lastUpdateTime: lastUpdateTime ? new Date(lastUpdateTime) : undefined,
      updateSource
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  })
);

/**
 * @route POST /api/webhooks/shipments/tracking
 * @desc Receive tracking update from carrier
 * @access Public (webhook endpoint - verify signature in production)
 * @body {Object} Tracking update payload
 * @returns {Object} Webhook processing result
 *
 * Example payload:
 * {
 *   "shipmentId": "ship-uuid-here",
 *   "trackingNumber": "1Z999AA10123456784",
 *   "carrier": "FedEx",
 *   "lastLocation": "Memphis, TN Distribution Center",
 *   "lastUpdateTime": "2024-11-01T14:30:00Z",
 *   "estimatedDeliveryDate": "2024-11-03T17:00:00Z"
 * }
 */
router.post('/shipments/tracking',
  asyncHandler(async (req, res) => {
    const {
      shipmentId,
      trackingNumber,
      carrier,
      lastLocation,
      lastUpdateTime,
      estimatedDeliveryDate
    } = req.body;

    if (!shipmentId || !trackingNumber) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: shipmentId, trackingNumber'
      });
    }

    const result = await webhookHandler.handleTrackingUpdate({
      shipmentId,
      trackingNumber,
      carrier,
      lastLocation,
      lastUpdateTime: lastUpdateTime ? new Date(lastUpdateTime) : new Date(),
      estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : undefined
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  })
);

/**
 * @route POST /api/webhooks/shipments/delivered
 * @desc Confirm shipment delivery
 * @access Public (webhook endpoint - verify signature in production)
 * @body {Object} Delivery confirmation payload
 * @returns {Object} Webhook processing result
 *
 * Example payload:
 * {
 *   "shipmentId": "ship-uuid-here",
 *   "containerIds": ["CONT-001", "CONT-002"],
 *   "deliveryTime": "2024-11-03T15:45:00Z",
 *   "receivedBy": "John Doe",
 *   "location": "Warehouse A, Receiving Dock",
 *   "signatureRequired": true,
 *   "comments": "Delivered in good condition"
 * }
 */
router.post('/shipments/delivered',
  asyncHandler(async (req, res) => {
    const {
      shipmentId,
      containerIds,
      deliveryTime,
      receivedBy,
      location,
      signatureRequired,
      comments
    } = req.body;

    if (!shipmentId || !receivedBy || !location) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: shipmentId, receivedBy, location'
      });
    }

    const result = await webhookHandler.handleDeliveryConfirmation({
      shipmentId,
      containerIds: containerIds || [],
      deliveryTime: deliveryTime ? new Date(deliveryTime) : new Date(),
      receivedBy,
      location,
      signatureRequired,
      comments
    });

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  })
);

/**
 * @route POST /api/webhooks/shipments/exception
 * @desc Handle shipment exception or delay
 * @access Public (webhook endpoint - verify signature in production)
 * @body {Object} Exception notification payload
 * @returns {Object} Webhook processing result
 *
 * Example payload:
 * {
 *   "shipmentId": "ship-uuid-here",
 *   "exceptionType": "DELAY",
 *   "reason": "Vehicle breakdown, rerouting to alternate location",
 *   "revisedDeliveryDate": "2024-11-05T18:00:00Z"
 * }
 */
router.post('/shipments/exception',
  asyncHandler(async (req, res) => {
    const {
      shipmentId,
      exceptionType,
      reason,
      revisedDeliveryDate
    } = req.body;

    if (!shipmentId || !exceptionType || !reason) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: shipmentId, exceptionType, reason'
      });
    }

    const result = await webhookHandler.handleShipmentException(
      shipmentId,
      exceptionType,
      reason,
      revisedDeliveryDate ? new Date(revisedDeliveryDate) : undefined
    );

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  })
);

// ========================================
// CONTAINER RECEIPT WEBHOOKS
// ========================================

/**
 * @route POST /api/webhooks/containers/received
 * @desc Confirm container receipt at location
 * @access Public (webhook endpoint - verify signature in production)
 * @body {Object} Container receipt payload
 * @returns {Object} Webhook processing result
 *
 * Example payload:
 * {
 *   "containerId": "CONT-001",
 *   "location": "Warehouse A, Bay 5",
 *   "receivedBy": "Jane Smith",
 *   "receiptTime": "2024-11-01T10:15:00Z"
 * }
 */
router.post('/containers/received',
  asyncHandler(async (req, res) => {
    const {
      containerId,
      location,
      receivedBy,
      receiptTime
    } = req.body;

    if (!containerId || !location || !receivedBy) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: containerId, location, receivedBy'
      });
    }

    const result = await webhookHandler.handleContainerReceipt(
      containerId,
      location,
      receivedBy,
      receiptTime ? new Date(receiptTime) : undefined
    );

    const statusCode = result.success ? 200 : 400;
    return res.status(statusCode).json(result);
  })
);

// ========================================
// WEBHOOK MANAGEMENT ENDPOINTS
// ========================================

/**
 * @route GET /api/webhooks/history
 * @desc Get webhook processing history
 * @access Private
 * @query {string} eventType Filter by event type
 * @query {string} sourceSystem Filter by source system
 * @query {string} fromDate Start date (ISO 8601)
 * @query {string} toDate End date (ISO 8601)
 * @query {number} limit Limit results
 * @query {number} offset Pagination offset
 * @returns {Array} Webhook history entries
 */
router.get('/history',
  asyncHandler(async (req, res) => {
    const { eventType, sourceSystem, fromDate, toDate, limit, offset } = req.query;

    const history = await webhookHandler.getWebhookHistory({
      eventType: eventType as string,
      sourceSystem: sourceSystem as string,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0
    });

    return res.status(200).json({
      data: history,
      count: history.length
    });
  })
);

/**
 * @route GET /api/webhooks/stats
 * @desc Get webhook processing statistics
 * @access Private
 * @query {number} timeRangeHours Time range for statistics (default: 24)
 * @returns {Object} Webhook statistics
 */
router.get('/stats',
  asyncHandler(async (req, res) => {
    const { timeRangeHours } = req.query;

    const stats = await webhookHandler.getWebhookStats(
      timeRangeHours ? parseInt(timeRangeHours as string, 10) : 24
    );

    return res.status(200).json(stats);
  })
);

/**
 * @route GET /api/webhooks/health
 * @desc Check webhook endpoint health
 * @access Public
 * @returns {Object} Health status
 */
router.get('/health',
  asyncHandler(async (req, res) => {
    return res.status(200).json({
      status: 'healthy',
      timestamp: new Date(),
      message: 'Shipment webhook endpoint is operational'
    });
  })
);

export default router;
