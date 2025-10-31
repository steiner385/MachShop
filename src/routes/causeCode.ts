import express, { Router } from 'express';
import { validateRequest } from '../middleware/validation';
import { requireAuth, requireRole } from '../middleware/auth';
import { errorHandler } from '../middleware/errorHandler';
import CauseCodeService from '../services/CauseCodeService';
import { logger } from '../utils/logger';

const router: Router = express.Router();

/**
 * Cause Code Management Routes (Issue #54)
 * Hierarchical root cause code system for NCR analysis
 */

// ============================================================================
// CAUSE CODE CATEGORIES
// ============================================================================

/**
 * GET /api/v1/cause-codes/categories
 * Get all cause code categories
 */
router.get(
  '/categories',
  requireAuth,
  errorHandler(async (req, res) => {
    const categories = await CauseCodeService.getCategories();
    res.json({
      success: true,
      data: categories,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/cause-codes/categories
 * Create a new cause code category
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/categories',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        code: { type: 'string', required: true },
        name: { type: 'string', required: true },
        description: { type: 'string', required: false },
        parentId: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { code, name, description, parentId } = req.body;
    const userId = req.user?.id || 'system';

    const category = await CauseCodeService.createCategory({
      code,
      name,
      description,
      parentId,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: category,
      message: `Category ${code} created successfully`,
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// CAUSE CODES
// ============================================================================

/**
 * GET /api/v1/cause-codes
 * Get cause code hierarchy
 * Optional query: categoryId
 */
router.get(
  '/',
  requireAuth,
  errorHandler(async (req, res) => {
    const { categoryId } = req.query;

    const hierarchy = await CauseCodeService.getHierarchy(categoryId as string);

    res.json({
      success: true,
      data: hierarchy,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/cause-codes
 * Create a new cause code
 * Required roles: System Administrator, Quality Manager
 */
router.post(
  '/',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        code: { type: 'string', required: true },
        name: { type: 'string', required: true },
        description: { type: 'string', required: false },
        categoryId: { type: 'string', required: true },
        parentId: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { code, name, description, categoryId, parentId } = req.body;
    const userId = req.user?.id || 'system';

    const causeCode = await CauseCodeService.createCauseCode({
      code,
      name,
      description,
      categoryId,
      parentId,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      data: causeCode,
      message: `Cause code ${code} created successfully`,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/cause-codes/:id
 * Get a specific cause code
 */
router.get(
  '/:id',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    const causeCode = await CauseCodeService.getCauseCode(id);
    if (!causeCode) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Cause code ${id} not found` },
        timestamp: new Date(),
      });
    }

    const fullPath = await CauseCodeService.getFullPath(id);

    res.json({
      success: true,
      data: { ...causeCode, fullPath },
      timestamp: new Date(),
    });
  })
);

/**
 * PUT /api/v1/cause-codes/:id
 * Update a cause code
 * Required roles: System Administrator, Quality Manager
 */
router.put(
  '/:id',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      body: {
        name: { type: 'string', required: false },
        description: { type: 'string', required: false },
        enabled: { type: 'boolean', required: false },
        reason: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { name, description, enabled, reason } = req.body;
    const userId = req.user?.id || 'system';

    const updated = await CauseCodeService.updateCauseCode(id, {
      name,
      description,
      enabled,
      reason,
      updatedBy: userId,
    });

    res.json({
      success: true,
      data: updated,
      message: 'Cause code updated successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * DELETE /api/v1/cause-codes/:id
 * Disable a cause code (soft delete)
 * Required roles: System Administrator, Quality Manager
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['System Administrator', 'Quality Manager']),
  validateRequest(
    {
      query: {
        reason: { type: 'string', required: false },
      },
    },
    'json'
  ),
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { reason = 'Disabled by user' } = req.query;
    const userId = req.user?.id || 'system';

    const disabled = await CauseCodeService.disableCauseCode(
      id,
      reason as string,
      userId
    );

    res.json({
      success: true,
      data: disabled,
      message: 'Cause code disabled successfully',
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/cause-codes/:id/history
 * Get change history for a cause code
 */
router.get(
  '/:id/history',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;
    const { limit = '50' } = req.query;

    const history = await CauseCodeService.getHistory(id, parseInt(limit as string));

    res.json({
      success: true,
      data: history,
      timestamp: new Date(),
    });
  })
);

/**
 * POST /api/v1/cause-codes/:id/record-usage
 * Record usage of a cause code (used when assigned to NCR)
 */
router.post(
  '/:id/record-usage',
  requireAuth,
  errorHandler(async (req, res) => {
    const { id } = req.params;

    await CauseCodeService.recordUsage(id);

    res.json({
      success: true,
      message: 'Usage recorded successfully',
      timestamp: new Date(),
    });
  })
);

// ============================================================================
// SEARCH & STATISTICS
// ============================================================================

/**
 * GET /api/v1/cause-codes/search/query
 * Search cause codes by name or code
 */
router.get(
  '/search/:query',
  requireAuth,
  errorHandler(async (req, res) => {
    const { query } = req.params;
    const { limit = '20' } = req.query;

    const results = await CauseCodeService.search(query, parseInt(limit as string));

    res.json({
      success: true,
      data: results,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/cause-codes/statistics
 * Get cause code statistics (most used, recently created, etc.)
 */
router.get(
  '/stats/summary',
  requireAuth,
  errorHandler(async (req, res) => {
    const stats = await CauseCodeService.getStatistics();

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });
  })
);

/**
 * GET /api/v1/cause-codes/category/:categoryId
 * Get all cause codes for a specific category
 */
router.get(
  '/category/:categoryId',
  requireAuth,
  errorHandler(async (req, res) => {
    const { categoryId } = req.params;

    const codes = await CauseCodeService.getCauseCodesByCategory(categoryId);

    res.json({
      success: true,
      data: codes,
      timestamp: new Date(),
    });
  })
);

export default router;
