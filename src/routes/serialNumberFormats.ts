/**
 * Serial Number Format API Routes (Issue #149)
 * REST API endpoints for configurable serial number format management
 */

import express from 'express';
import { serialNumberFormatConfigService } from '../services/SerialNumberFormatConfigService';
import { serialNumberGeneratorService } from '../services/SerialNumberGeneratorService';
import {
  CreateFormatConfigSchema,
  UpdateFormatConfigSchema,
  AssignFormatToPartSchema,
  GenerateSerialSchema,
  GenerateSerialBatchSchema,
  ValidateSerialSchema,
  ValidatePatternSchema,
  PreviewFormatSchema,
  CheckUniquenessSchema,
  CheckBatchUniquenessSchema,
  ResetCounterSchema,
  ListFormatsQuerySchema,
} from '../schemas/serialNumberFormat';
import { asyncHandler, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { requireSiteAccess } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = express.Router();

// ============================================
// FORMAT CONFIG CRUD ENDPOINTS
// ============================================

/**
 * POST /api/v1/serial-formats
 * Create a new serial format configuration
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const validated = CreateFormatConfigSchema.parse(req.body);

    const config = await serialNumberFormatConfigService.createFormatConfig(validated);

    logger.info(`Created serial format config: ${config.id}`, {
      formatName: config.name,
      siteId: config.siteId,
    });

    res.status(201).json({
      success: true,
      data: config,
    });
  })
);

/**
 * GET /api/v1/serial-formats
 * List format configurations for a site
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = ListFormatsQuerySchema.parse(req.query);

    const configs = await serialNumberFormatConfigService.listFormatConfigs(
      query.siteId,
      {
        isActive: query.isActive,
        search: query.search,
        skip: query.skip,
        take: query.take,
      }
    );

    res.json({
      success: true,
      data: configs,
    });
  })
);

/**
 * GET /api/v1/serial-formats/:id
 * Get a specific format configuration
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const config = await serialNumberFormatConfigService.getFormatConfig(req.params.id);

    res.json({
      success: true,
      data: config,
    });
  })
);

/**
 * PATCH /api/v1/serial-formats/:id
 * Update a format configuration
 */
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const validated = UpdateFormatConfigSchema.parse(req.body);

    const config = await serialNumberFormatConfigService.updateFormatConfig(
      req.params.id,
      validated
    );

    logger.info(`Updated serial format config: ${req.params.id}`);

    res.json({
      success: true,
      data: config,
    });
  })
);

/**
 * DELETE /api/v1/serial-formats/:id
 * Delete a format configuration
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await serialNumberFormatConfigService.deleteFormatConfig(req.params.id);

    logger.info(`Deleted serial format config: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Format configuration deleted successfully',
    });
  })
);

// ============================================
// VALIDATION ENDPOINTS
// ============================================

/**
 * POST /api/v1/serial-formats/:id/validate
 * Validate a pattern syntax
 */
router.post(
  '/:id/validate',
  asyncHandler(async (req, res) => {
    const { pattern } = ValidatePatternSchema.parse(req.body);

    const config = await serialNumberFormatConfigService.getFormatConfig(req.params.id);
    const validation = await serialNumberFormatConfigService.validateFormatPattern(
      pattern || config.patternTemplate
    );

    res.json({
      success: true,
      data: validation,
    });
  })
);

/**
 * POST /api/v1/serial-formats/:id/preview
 * Preview format with example serials
 */
router.post(
  '/:id/preview',
  asyncHandler(async (req, res) => {
    const { count } = PreviewFormatSchema.partial().parse(req.body);

    const config = await serialNumberFormatConfigService.getFormatConfig(req.params.id);
    const preview = await serialNumberGeneratorService.previewFormat(
      config.patternTemplate,
      count
    );

    res.json({
      success: true,
      data: preview,
    });
  })
);

// ============================================
// PART ASSIGNMENT ENDPOINTS
// ============================================

/**
 * POST /api/v1/serial-formats/:id/assign-part
 * Assign format to a part
 */
router.post(
  '/:id/assign-part',
  asyncHandler(async (req, res) => {
    const validated = AssignFormatToPartSchema.parse(req.body);

    const assignment = await serialNumberFormatConfigService.assignFormatToPart(
      validated.partId,
      req.params.id,
      {
        isDefault: validated.isDefault,
        priority: validated.priority,
        effectiveFrom: validated.effectiveFrom,
        effectiveUntil: validated.effectiveUntil,
      }
    );

    logger.info(`Assigned format ${req.params.id} to part ${validated.partId}`);

    res.status(201).json({
      success: true,
      data: assignment,
    });
  })
);

/**
 * DELETE /api/v1/serial-formats/:id/unassign-part/:partId
 * Unassign format from a part
 */
router.delete(
  '/:id/unassign-part/:partId',
  asyncHandler(async (req, res) => {
    await serialNumberFormatConfigService.unassignFormatFromPart(
      req.params.partId,
      req.params.id
    );

    logger.info(`Unassigned format ${req.params.id} from part ${req.params.partId}`);

    res.json({
      success: true,
      message: 'Format unassigned from part successfully',
    });
  })
);

/**
 * GET /api/v1/parts/:id/format
 * Get format assigned to a part
 */
router.get(
  '/parts/:id/format',
  asyncHandler(async (req, res) => {
    const format = await serialNumberFormatConfigService.getFormatForPart(req.params.id);

    res.json({
      success: true,
      data: format,
    });
  })
);

// ============================================
// COUNTER & USAGE ENDPOINTS
// ============================================

/**
 * GET /api/v1/serial-formats/:id/usage-stats
 * Get usage statistics for a format
 */
router.get(
  '/:id/usage-stats',
  asyncHandler(async (req, res) => {
    const stats = await serialNumberFormatConfigService.getFormatUsageStats(req.params.id);

    res.json({
      success: true,
      data: stats,
    });
  })
);

/**
 * POST /api/v1/serial-formats/:id/reset-counter
 * Reset sequential counter
 */
router.post(
  '/:id/reset-counter',
  asyncHandler(async (req, res) => {
    await serialNumberFormatConfigService.resetSequentialCounter(req.params.id);

    logger.info(`Reset counter for format: ${req.params.id}`);

    res.json({
      success: true,
      message: 'Sequential counter reset successfully',
    });
  })
);

/**
 * GET /api/v1/serial-formats/:id/counter
 * Get counter status
 */
router.get(
  '/:id/counter',
  asyncHandler(async (req, res) => {
    const status = await serialNumberFormatConfigService.getCounterStatus(req.params.id);

    res.json({
      success: true,
      data: status,
    });
  })
);

// ============================================
// SERIAL GENERATION ENDPOINTS
// ============================================

/**
 * POST /api/v1/serials/generate
 * Generate a single serial number
 */
router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const validated = GenerateSerialSchema.parse(req.body);

    const serial = await serialNumberGeneratorService.generateSerial(
      validated.formatConfigId,
      validated.context
    );

    logger.info(`Generated serial for format: ${validated.formatConfigId}`);

    res.status(201).json({
      success: true,
      data: { serial },
    });
  })
);

/**
 * POST /api/v1/serials/generate-batch
 * Generate batch of serial numbers
 */
router.post(
  '/generate-batch',
  asyncHandler(async (req, res) => {
    const validated = GenerateSerialBatchSchema.parse(req.body);

    const serials = await serialNumberGeneratorService.generateSerialBatch(
      validated.formatConfigId,
      validated.count,
      validated.context
    );

    logger.info(
      `Generated ${validated.count} serials for format: ${validated.formatConfigId}`
    );

    res.status(201).json({
      success: true,
      data: { serials, count: serials.length },
    });
  })
);

/**
 * POST /api/v1/serials/validate
 * Validate a serial against a format
 */
router.post(
  '/validate',
  asyncHandler(async (req, res) => {
    const validated = ValidateSerialSchema.parse(req.body);

    const validation = await serialNumberGeneratorService.validateSerial(
      validated.serial,
      validated.formatConfigId
    );

    res.json({
      success: true,
      data: validation,
    });
  })
);

/**
 * POST /api/v1/serials/check-uniqueness
 * Check if a serial is unique
 */
router.post(
  '/check-uniqueness',
  asyncHandler(async (req, res) => {
    const validated = CheckUniquenessSchema.parse(req.body);

    const isUnique = await serialNumberGeneratorService.checkUniqueness(
      validated.serial,
      validated.scope
    );

    res.json({
      success: true,
      data: { serial: validated.serial, isUnique },
    });
  })
);

/**
 * POST /api/v1/serials/check-batch-uniqueness
 * Check uniqueness for multiple serials
 */
router.post(
  '/check-batch-uniqueness',
  asyncHandler(async (req, res) => {
    const validated = CheckBatchUniquenessSchema.parse(req.body);

    const results = await serialNumberGeneratorService.checkBatchUniqueness(
      validated.serials
    );

    const uniqueCount = Array.from(results.values()).filter(v => v).length;

    res.json({
      success: true,
      data: {
        results: Object.fromEntries(results),
        summary: {
          total: results.size,
          unique: uniqueCount,
          duplicate: results.size - uniqueCount,
        },
      },
    });
  })
);

export default router;
