/**
 * ✅ GITHUB ISSUE #54: Hierarchical Cause Code System - Phase 1-2
 * Quality Routes - Cause Code Management
 */

import express from 'express';
import { requireQualityAccess } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { CauseCodeService } from '../services/CauseCodeService';
import { CauseCodeConfigService } from '../services/CauseCodeConfigService';
import { CauseCodeScope, CauseCodeStatus } from '../types/quality';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();
const causeCodeService = new CauseCodeService(prisma);
const configService = new CauseCodeConfigService(prisma);

// ============================================================================
// Cause Code Configuration Endpoints
// ============================================================================

/**
 * @route GET /api/v1/quality/cause-codes/config/global
 * @desc Get global cause code hierarchy configuration
 * @access Private
 */
router.get('/cause-codes/config/global',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const config = await configService.getGlobalConfig(req.query.refresh === 'true');
    res.status(200).json({
      success: true,
      data: config
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/config/site/:siteId
 * @desc Get site-specific cause code hierarchy configuration
 * @access Private
 */
router.get('/cause-codes/config/site/:siteId',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const config = await configService.getSiteConfig(req.params.siteId, req.query.refresh === 'true');
    res.status(200).json({
      success: true,
      data: config
    });
  })
);

/**
 * @route POST /api/v1/quality/cause-codes/config/global
 * @desc Create or update global configuration
 * @access Private
 */
router.post('/cause-codes/config/global',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { numberOfLevels, levelNames } = req.body;
    const userId = (req as any).user?.id || 'system';

    const config = await configService.createGlobalConfig(numberOfLevels, levelNames, userId);
    res.status(201).json({
      success: true,
      data: config,
      message: 'Global configuration created successfully'
    });
  })
);

/**
 * @route POST /api/v1/quality/cause-codes/config/site/:siteId
 * @desc Create site-specific configuration
 * @access Private
 */
router.post('/cause-codes/config/site/:siteId',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { numberOfLevels, levelNames } = req.body;
    const userId = (req as any).user?.id || 'system';

    const config = await configService.createSiteConfig(
      req.params.siteId,
      numberOfLevels,
      levelNames,
      userId
    );
    res.status(201).json({
      success: true,
      data: config,
      message: `Configuration created for site ${req.params.siteId}`
    });
  })
);

/**
 * @route PUT /api/v1/quality/cause-codes/config/:configId
 * @desc Update configuration
 * @access Private
 */
router.put('/cause-codes/config/:configId',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { numberOfLevels, levelNames, isActive } = req.body;
    const userId = (req as any).user?.id || 'system';

    const config = await configService.updateConfig(
      req.params.configId,
      numberOfLevels,
      levelNames,
      isActive,
      userId
    );
    res.status(200).json({
      success: true,
      data: config,
      message: 'Configuration updated successfully'
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/config
 * @desc Get all configurations
 * @access Private
 */
router.get('/cause-codes/config',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const configs = await configService.getAllConfigs();
    res.status(200).json({
      success: true,
      data: configs,
      total: configs.length
    });
  })
);

// ============================================================================
// Cause Code CRUD Endpoints
// ============================================================================

/**
 * @route POST /api/v1/quality/cause-codes
 * @desc Create a new cause code
 * @access Private
 */
router.post('/cause-codes',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const {
      code,
      name,
      level,
      scope,
      parentCauseCodeId,
      siteId,
      description,
      capaRequired,
      notificationRecipients,
      displayOrder,
      effectiveDate
    } = req.body;
    const userId = (req as any).user?.id || 'system';

    const causeCode = await causeCodeService.createCauseCode(
      code,
      name,
      level,
      scope,
      userId,
      parentCauseCodeId,
      siteId,
      description,
      capaRequired,
      notificationRecipients,
      displayOrder,
      effectiveDate
    );

    res.status(201).json({
      success: true,
      data: causeCode,
      message: `Cause code ${code} created successfully`
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/:id
 * @desc Get cause code by ID
 * @access Private
 */
router.get('/cause-codes/:id',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const causeCode = await causeCodeService.getCauseCodeById(req.params.id);

    if (!causeCode) {
      res.status(404).json({
        success: false,
        error: `Cause code ${req.params.id} not found`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: causeCode
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/code/:code
 * @desc Get cause code by code string
 * @access Private
 */
router.get('/cause-codes/code/:code',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { scope = CauseCodeScope.GLOBAL, siteId } = req.query;

    const causeCode = await causeCodeService.getCauseCodeByCode(
      req.params.code,
      scope as CauseCodeScope,
      siteId as string | undefined
    );

    if (!causeCode) {
      res.status(404).json({
        success: false,
        error: `Cause code ${req.params.code} not found`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: causeCode
    });
  })
);

/**
 * @route PUT /api/v1/quality/cause-codes/:id
 * @desc Update cause code
 * @access Private
 */
router.put('/cause-codes/:id',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { changeReason, ...updates } = req.body;
    const userId = (req as any).user?.id || 'system';

    const causeCode = await causeCodeService.updateCauseCode(
      req.params.id,
      updates,
      userId,
      changeReason
    );

    res.status(200).json({
      success: true,
      data: causeCode,
      message: 'Cause code updated successfully'
    });
  })
);

/**
 * @route PUT /api/v1/quality/cause-codes/:id/deprecate
 * @desc Deprecate a cause code
 * @access Private
 */
router.put('/cause-codes/:id/deprecate',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { expirationDate } = req.body;
    const userId = (req as any).user?.id || 'system';

    const causeCode = await causeCodeService.deprecateCauseCode(
      req.params.id,
      userId,
      expirationDate ? new Date(expirationDate) : undefined
    );

    res.status(200).json({
      success: true,
      data: causeCode,
      message: 'Cause code deprecated successfully'
    });
  })
);

/**
 * @route PUT /api/v1/quality/cause-codes/:id/restore
 * @desc Restore a deprecated cause code
 * @access Private
 */
router.put('/cause-codes/:id/restore',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user?.id || 'system';

    const causeCode = await causeCodeService.restoreCauseCode(req.params.id, userId);

    res.status(200).json({
      success: true,
      data: causeCode,
      message: 'Cause code restored successfully'
    });
  })
);

// ============================================================================
// Cause Code Hierarchy Endpoints
// ============================================================================

/**
 * @route GET /api/v1/quality/cause-codes/:id/children
 * @desc Get children of a cause code
 * @access Private
 */
router.get('/cause-codes/:id/children',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const children = await causeCodeService.getChildren(req.params.id);
    res.status(200).json({
      success: true,
      data: children,
      total: children.length
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/hierarchy/path/:id
 * @desc Get hierarchy path (breadcrumb) for a cause code
 * @access Private
 */
router.get('/cause-codes/hierarchy/path/:id',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const path = await causeCodeService.getHierarchyPath(req.params.id);
    const pathString = path.map(c => c.name).join(' > ');

    res.status(200).json({
      success: true,
      data: {
        path,
        pathString
      }
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/tree
 * @desc Get cause code hierarchy as tree structure
 * @access Private
 */
router.get('/cause-codes/tree',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { scope, siteId, expandAll = 'false' } = req.query;

    const tree = await causeCodeService.getCauseCodeTree(
      scope as CauseCodeScope | undefined,
      siteId as string | undefined,
      expandAll === 'true'
    );

    res.status(200).json({
      success: true,
      data: tree,
      total: tree.length
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/level/:level
 * @desc Get cause codes at a specific level
 * @access Private
 */
router.get('/cause-codes/level/:level',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { scope, siteId } = req.query;

    const codes = await causeCodeService.getCauseCodesByLevel(
      parseInt(req.params.level),
      scope as CauseCodeScope | undefined,
      siteId as string | undefined
    );

    res.status(200).json({
      success: true,
      data: codes,
      total: codes.length
    });
  })
);

// ============================================================================
// Cause Code Search & Validation Endpoints
// ============================================================================

/**
 * @route GET /api/v1/quality/cause-codes/search
 * @desc Search cause codes by keyword
 * @access Private
 */
router.get('/cause-codes/search',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { q, scope, siteId } = req.query;

    if (!q) {
      res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
      return;
    }

    const results = await causeCodeService.searchCauseCodes(
      q as string,
      scope as CauseCodeScope | undefined,
      siteId as string | undefined
    );

    res.status(200).json({
      success: true,
      data: results,
      total: results.length
    });
  })
);

/**
 * @route POST /api/v1/quality/cause-codes/validate
 * @desc Validate hierarchy structure
 * @access Private
 */
router.post('/cause-codes/validate',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { scope, siteId } = req.body;

    const validation = await causeCodeService.validateHierarchy(
      scope as CauseCodeScope | undefined,
      siteId as string | undefined
    );

    res.status(200).json({
      success: validation.isValid,
      data: validation
    });
  })
);

/**
 * @route POST /api/v1/quality/cause-codes/bulk-import
 * @desc Bulk import cause codes
 * @access Private
 */
router.post('/cause-codes/bulk-import',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { codes } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!Array.isArray(codes) || codes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'codes array is required and must not be empty'
      });
      return;
    }

    const result = await causeCodeService.bulkImportCauseCodes(codes, userId);

    res.status(200).json({
      success: result.failed.length === 0,
      data: {
        created: result.created,
        failed: result.failed,
        totalCreated: result.created.length,
        totalFailed: result.failed.length
      }
    });
  })
);

// ============================================================================
// Cause Code History & Versioning Endpoints
// ============================================================================

/**
 * @route GET /api/v1/quality/cause-codes/:id/history
 * @desc Get change history for a cause code
 * @access Private
 */
router.get('/cause-codes/:id/history',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const history = await causeCodeService.getCauseCodeHistory(req.params.id);

    res.status(200).json({
      success: true,
      data: history,
      total: history.length
    });
  })
);

/**
 * @route POST /api/v1/quality/cause-codes/:id/restore-version
 * @desc Restore cause code to a previous version
 * @access Private
 */
router.post('/cause-codes/:id/restore-version',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const { targetVersion } = req.body;
    const userId = (req as any).user?.id || 'system';

    if (!targetVersion) {
      res.status(400).json({
        success: false,
        error: 'targetVersion is required'
      });
      return;
    }

    const causeCode = await causeCodeService.restoreToPreviousVersion(
      req.params.id,
      targetVersion,
      userId
    );

    res.status(200).json({
      success: true,
      data: causeCode,
      message: `Cause code restored to version ${targetVersion}`
    });
  })
);

// ============================================================================
// Statistics & Monitoring Endpoints
// ============================================================================

/**
 * @route GET /api/v1/quality/cause-codes/stats
 * @desc Get cause code statistics
 * @access Private
 */
router.get('/cause-codes/stats',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const stats = await causeCodeService.getCauseCodeStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  })
);

/**
 * @route GET /api/v1/quality/cause-codes/config/stats
 * @desc Get configuration statistics
 * @access Private
 */
router.get('/cause-codes/config/stats',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    const stats = await configService.getConfigStats();

    res.status(200).json({
      success: true,
      data: stats
    });
  })
);

// ============================================================================
// Legacy Inspection & NCR Endpoints (Preserved)
// ============================================================================

/**
 * @route GET /api/v1/quality/inspections
 * @desc Get inspections list
 * @access Private
 */
router.get('/inspections',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    // Mock response - matches frontend InspectionListResponse interface
    res.status(200).json({
      inspections: [],
      total: 0,
      page: 1,
      limit: 20
    });
  })
);

/**
 * @route POST /api/v1/quality/inspections
 * @desc Create inspection
 * @access Private
 */
router.post('/inspections',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    // Mock response
    res.status(201).json({
      id: '1',
      message: 'Inspection created successfully'
    });
  })
);

/**
 * @route GET /api/v1/quality/ncrs
 * @desc Get non-conformance reports
 * @access Private
 */
router.get('/ncrs',
  requireQualityAccess,
  asyncHandler(async (req, res) => {
    // Mock response - matches frontend NCRListResponse interface
    res.status(200).json({
      ncrs: [],
      total: 0,
      page: 1,
      limit: 20
    });
  })
);

export default router;