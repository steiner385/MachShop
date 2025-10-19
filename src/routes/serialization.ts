import express from 'express';
import { z } from 'zod';
import { prisma } from '../lib/database';
import { serializationService } from '../services/SerializationService';
import { requireProductionAccess } from '../middleware/auth';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas
const generateSerialSchema = z.object({
  pattern: z.string().optional(),
  prefix: z.string().optional(),
  sequencePadding: z.number().int().min(1).max(12).optional(),
  sequenceName: z.string().optional(),
  includeCheckDigit: z.boolean().optional(),
  randomLength: z.number().int().min(4).max(16).optional(),
});

const generateBatchSchema = generateSerialSchema.extend({
  count: z.number().int().min(1).max(10000),
});

const createSerializedPartSchema = z.object({
  serialNumber: z.string(),
  partId: z.string().optional(), // Either partId or partNumber must be provided
  partNumber: z.string().optional(),
  workOrderId: z.string().optional(),
  lotNumber: z.string().optional(),
  status: z.string(),
  currentLocation: z.string().optional(),
  manufactureDate: z.string().datetime().optional(),
  shipDate: z.string().datetime().optional(),
  customerInfo: z.string().optional(),
});

const updateStatusSchema = z.object({
  status: z.string(),
  location: z.string().optional(),
});

/**
 * @route POST /api/v1/serialization/generate
 * @desc Generate a new serial number
 * @access Private (Production Access Required)
 */
router.post(
  '/generate',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = generateSerialSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid serial number format', validationResult.error.errors);
    }

    const format = validationResult.data;
    const result = await serializationService.generateSerialNumber(format);

    logger.info('Serial number generated', {
      userId: req.user?.id,
      serialNumber: result.serialNumber,
      sequenceNumber: result.sequenceNumber,
    });

    res.status(201).json(result);
  })
);

/**
 * @route POST /api/v1/serialization/generate-batch
 * @desc Generate multiple serial numbers in batch
 * @access Private (Production Access Required)
 */
router.post(
  '/generate-batch',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = generateBatchSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid batch generation parameters', validationResult.error.errors);
    }

    const { count, ...format } = validationResult.data;
    const results = await serializationService.generateSerialNumberBatch(count, format);

    logger.info('Serial number batch generated', {
      userId: req.user?.id,
      count: results.length,
      firstSerial: results[0]?.serialNumber,
      lastSerial: results[results.length - 1]?.serialNumber,
    });

    res.status(201).json({
      count: results.length,
      serialNumbers: results,
    });
  })
);

/**
 * @route POST /api/v1/serialization/parts
 * @desc Create a new serialized part record
 * @access Private (Production Access Required)
 */
router.post(
  '/parts',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const validationResult = createSerializedPartSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid serialized part data', validationResult.error.errors);
    }

    const data = validationResult.data;

    // Look up partId by partNumber if partNumber is provided instead of partId
    let partId = data.partId;
    if (!partId && data.partNumber) {
      const partRecord = await prisma.part.findUnique({
        where: { partNumber: data.partNumber },
      });

      if (!partRecord) {
        throw new ValidationError(`Part not found with part number: ${data.partNumber}`);
      }

      partId = partRecord.id;
    }

    if (!partId) {
      throw new ValidationError('Either partId or partNumber must be provided');
    }

    const part = await serializationService.createSerializedPart({
      ...data,
      partId,
      manufactureDate: data.manufactureDate ? new Date(data.manufactureDate) : undefined,
      shipDate: data.shipDate ? new Date(data.shipDate) : undefined,
    });

    logger.info('Serialized part created', {
      userId: req.user?.id,
      serialNumber: part.serialNumber,
      partId: part.partId,
    });

    res.status(201).json(part);
  })
);

/**
 * @route GET /api/v1/serialization/parts/:serialNumber
 * @desc Get serialized part by serial number
 * @access Private (Production Access Required)
 */
router.get(
  '/parts/:serialNumber',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;

    const part = await serializationService.getSerializedPart(serialNumber);
    if (!part) {
      return res.status(404).json({ error: 'Serialized part not found' });
    }

    logger.info('Serialized part retrieved', {
      userId: req.user?.id,
      serialNumber: part.serialNumber,
    });

    res.status(200).json(part);
  })
);

/**
 * @route PATCH /api/v1/serialization/parts/:serialNumber/status
 * @desc Update serialized part status
 * @access Private (Production Access Required)
 */
router.patch(
  '/parts/:serialNumber/status',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.params;
    const validationResult = updateStatusSchema.safeParse(req.body);

    if (!validationResult.success) {
      throw new ValidationError('Invalid status update data', validationResult.error.errors);
    }

    const { status, location } = validationResult.data;
    const part = await serializationService.updateSerializedPartStatus(
      serialNumber,
      status,
      location
    );

    logger.info('Serialized part status updated', {
      userId: req.user?.id,
      serialNumber: part.serialNumber,
      newStatus: status,
    });

    res.status(200).json(part);
  })
);

/**
 * @route GET /api/v1/serialization/parts
 * @desc List serialized parts with filtering
 * @access Private (Production Access Required)
 */
router.get(
  '/parts',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const filters = {
      partId: req.query.partId as string | undefined,
      workOrderId: req.query.workOrderId as string | undefined,
      lotNumber: req.query.lotNumber as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
    };

    const result = await serializationService.listSerializedParts(filters);

    logger.info('Serialized parts listed', {
      userId: req.user?.id,
      filters,
      resultCount: result.parts.length,
      total: result.total,
    });

    res.status(200).json(result);
  })
);

/**
 * @route POST /api/v1/serialization/validate
 * @desc Validate a serial number format and check digit
 * @access Private (Production Access Required)
 */
router.post(
  '/validate',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { serialNumber } = req.body;

    if (!serialNumber || typeof serialNumber !== 'string') {
      throw new ValidationError('Serial number is required');
    }

    const isValid = serializationService.validateSerialNumber(serialNumber);

    logger.info('Serial number validated', {
      userId: req.user?.id,
      serialNumber,
      isValid,
    });

    res.status(200).json({ serialNumber, isValid });
  })
);

/**
 * @route POST /api/v1/serialization/sequences/initialize
 * @desc Initialize or reset a sequence
 * @access Private (Admin Only)
 */
router.post(
  '/sequences/initialize',
  requireProductionAccess,
  asyncHandler(async (req, res) => {
    const { sequenceName, startValue } = req.body;

    if (!sequenceName || typeof sequenceName !== 'string') {
      throw new ValidationError('Sequence name is required');
    }

    const start = startValue && typeof startValue === 'number' ? startValue : 1;

    await serializationService.initializeSequence(sequenceName, start);

    logger.info('Sequence initialized', {
      userId: req.user?.id,
      sequenceName,
      startValue: start,
    });

    res.status(200).json({
      message: 'Sequence initialized successfully',
      sequenceName,
      startValue: start,
    });
  })
);

export default router;
