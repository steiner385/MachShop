import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ElectronicSignatureService } from '@/services/ElectronicSignatureService';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import {
  createSignatureSchema,
  verifySignatureSchema,
  invalidateSignatureSchema,
  listSignaturesSchema,
} from '@/types/signature';

const router = Router();
const prisma = new PrismaClient();
const signatureService = new ElectronicSignatureService(prisma);

/**
 * POST /api/v1/signatures/sign
 * Create an electronic signature
 *
 * Body: CreateSignatureInput
 * Response: CreateSignatureResponse
 */
router.post('/sign', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = createSignatureSchema.parse({
      ...req.body,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });

    // Create signature
    const result = await signatureService.createSignature(validatedData);

    logger.info('Electronic signature created via API', {
      signatureId: result.id,
      userId: validatedData.userId,
      path: req.path,
    });

    res.status(201).json(result);
  } catch (error: any) {
    logger.error('Error creating electronic signature via API', {
      error: error.message,
      body: req.body,
      path: req.path,
    });

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    res.status(400).json({
      error: error.message || 'Failed to create electronic signature',
    });
  }
});

/**
 * POST /api/v1/signatures/verify
 * Verify an electronic signature
 *
 * Body: VerifySignatureInput
 * Response: VerificationResult
 */
router.post('/verify', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = verifySignatureSchema.parse(req.body);

    // Verify signature
    const result = await signatureService.verifySignature(validatedData);

    logger.info('Electronic signature verified via API', {
      signatureId: validatedData.signatureId,
      isValid: result.isValid,
      path: req.path,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error verifying electronic signature via API', {
      error: error.message,
      body: req.body,
      path: req.path,
    });

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    res.status(400).json({
      error: error.message || 'Failed to verify electronic signature',
    });
  }
});

/**
 * GET /api/v1/signatures/:id
 * Get signature by ID
 *
 * Response: VerifySignatureResponse
 */
router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const signature = await signatureService.getSignatureById(id);

    res.json(signature);
  } catch (error: any) {
    logger.error('Error getting signature by ID via API', {
      error: error.message,
      id: req.params.id,
      path: req.path,
    });

    if (error.message === 'Signature not found') {
      res.status(404).json({
        error: 'Signature not found',
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'Failed to get signature',
    });
  }
});

/**
 * GET /api/v1/signatures
 * List signatures with filtering and pagination
 *
 * Query params: ListSignaturesInput
 * Response: ListSignaturesResponse
 */
router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate query parameters
    const validatedData = listSignaturesSchema.parse(req.query);

    // List signatures
    const result = await signatureService.listSignatures(validatedData);

    logger.info('Signatures listed via API', {
      count: result.signatures.length,
      total: result.pagination.total,
      page: result.pagination.page,
      path: req.path,
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Error listing signatures via API', {
      error: error.message,
      query: req.query,
      path: req.path,
    });

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'Failed to list signatures',
    });
  }
});

/**
 * GET /api/v1/signatures/entity/:entityType/:entityId
 * Get all signatures for a specific entity
 *
 * Response: SignatureAuditTrail[]
 */
router.get('/entity/:entityType/:entityId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params;

    const signatures = await signatureService.getSignaturesForEntity(entityType, entityId);

    logger.info('Signatures retrieved for entity via API', {
      entityType,
      entityId,
      count: signatures.length,
      path: req.path,
    });

    res.json({
      signatures,
      count: signatures.length,
    });
  } catch (error: any) {
    logger.error('Error getting signatures for entity via API', {
      error: error.message,
      params: req.params,
      path: req.path,
    });

    res.status(500).json({
      error: error.message || 'Failed to get signatures for entity',
    });
  }
});

/**
 * POST /api/v1/signatures/:id/invalidate
 * Invalidate an electronic signature
 *
 * Body: { invalidationReason: string }
 * Response: ElectronicSignature
 */
router.post('/:id/invalidate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { invalidationReason } = req.body;

    // Get current user ID from JWT token
    const userId = (req as any).user?.userId || (req as any).user?.id;

    if (!userId) {
      res.status(401).json({
        error: 'User ID not found in token',
      });
      return;
    }

    // Validate invalidation data
    const validatedData = invalidateSignatureSchema.parse({
      signatureId: id,
      invalidatedById: userId,
      invalidationReason,
    });

    // Invalidate signature
    const signature = await signatureService.invalidateSignature(validatedData);

    logger.warn('Electronic signature invalidated via API', {
      signatureId: id,
      invalidatedById: userId,
      reason: invalidationReason,
      path: req.path,
    });

    res.json({
      message: 'Signature invalidated successfully',
      signature,
    });
  } catch (error: any) {
    logger.error('Error invalidating signature via API', {
      error: error.message,
      id: req.params.id,
      path: req.path,
    });

    if (error.name === 'ZodError') {
      res.status(400).json({
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    if (error.message === 'Signature not found') {
      res.status(404).json({
        error: 'Signature not found',
      });
      return;
    }

    if (error.message === 'Signature is already invalidated') {
      res.status(400).json({
        error: 'Signature is already invalidated',
      });
      return;
    }

    res.status(500).json({
      error: error.message || 'Failed to invalidate signature',
    });
  }
});

export default router;
