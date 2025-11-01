/**
 * API Version Management - Admin Routes
 * Endpoints for managing API versions, breaking changes, deprecations, and changelog
 */

import { Router, Request, Response } from 'express';
import { apiVersioningService } from '../services/ApiVersioningService';
import { AppError } from '../middleware/errorHandler';
import { VersionedRequest } from '../types/versioning';

const router = Router();

/**
 * List all API versions
 * GET /api/admin/versions
 */
router.get('/versions', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const versions = await apiVersioningService.listVersions(status as any);

    res.json({
      data: versions,
      meta: {
        count: versions.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get specific version details
 * GET /api/admin/versions/:versionId
 */
router.get('/versions/:versionId', async (req: Request, res: Response, next) => {
  try {
    const version = await apiVersioningService.getVersion(req.params.versionId);

    if (!version) {
      throw new AppError(`Version ${req.params.versionId} not found`, 404, 'VERSION_NOT_FOUND');
    }

    res.json({
      data: version,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new API version
 * POST /api/admin/versions
 */
router.post('/versions', async (req: Request, res: Response, next) => {
  try {
    const { version, semver, releaseDate, status, changelogUrl, migrationGuideUrl } = req.body;

    // Validation
    if (!version || !semver) {
      throw new AppError('version and semver are required', 400, 'INVALID_INPUT');
    }

    const newVersion = await apiVersioningService.createVersion({
      version,
      semver,
      releaseDate: new Date(releaseDate),
      status,
      changelogUrl,
      migrationGuideUrl,
    });

    res.status(201).json({
      data: newVersion,
      message: `Version ${version} created successfully`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Add breaking change to version
 * POST /api/admin/versions/:versionId/breaking-changes
 */
router.post('/versions/:versionId/breaking-changes', async (req: Request, res: Response, next) => {
  try {
    const {
      fromVersion,
      toVersion,
      changeType,
      endpoint,
      field,
      description,
      before,
      after,
      migrationSteps,
      migrationGuideUrl,
      announcedAt,
      effectiveDate,
    } = req.body;

    if (!changeType || !description) {
      throw new AppError('changeType and description are required', 400, 'INVALID_INPUT');
    }

    const breakingChange = await apiVersioningService.addBreakingChange(req.params.versionId, {
      id: '',
      fromVersion: fromVersion || 'v1',
      toVersion: toVersion || 'v2',
      changeType,
      endpoint,
      field,
      description,
      before,
      after,
      migrationSteps,
      migrationGuideUrl,
      announcedAt: new Date(announcedAt || Date.now()),
      effectiveDate: new Date(effectiveDate || Date.now()),
    });

    res.status(201).json({
      data: breakingChange,
      message: 'Breaking change recorded',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Mark feature as deprecated
 * POST /api/admin/deprecations
 */
router.post('/deprecations', async (req: Request, res: Response, next) => {
  try {
    const {
      versionId,
      feature,
      deprecatedAt,
      sunsetDate,
      replacement,
      migrationGuideUrl,
      severity,
      description,
    } = req.body;

    if (!versionId || !feature || !description) {
      throw new AppError('versionId, feature, and description are required', 400, 'INVALID_INPUT');
    }

    await apiVersioningService.deprecateFeature(versionId, {
      id: '',
      version: versionId,
      feature,
      deprecatedAt: new Date(deprecatedAt || Date.now()),
      sunsetDate: new Date(sunsetDate),
      replacement,
      migrationGuideUrl,
      affectedAccounts: 0,
      notificationsSent: 0,
      severity: severity || 'medium',
      description,
    });

    res.status(201).json({
      message: `Feature '${feature}' marked as deprecated. Sunset date: ${sunsetDate}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get version adoption stats
 * GET /api/admin/versions/:versionId/stats
 */
router.get('/versions/:versionId/stats', async (req: Request, res: Response, next) => {
  try {
    const stats = await apiVersioningService.getVersionAdoptionStats(req.params.versionId);

    if (!stats) {
      throw new AppError(`Version ${req.params.versionId} not found`, 404, 'VERSION_NOT_FOUND');
    }

    res.json({
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Publish changelog entry
 * POST /api/admin/changelog
 */
router.post('/changelog', async (req: Request, res: Response, next) => {
  try {
    const {
      version,
      releaseDate,
      category,
      title,
      description,
      endpoint,
      field,
      migrationGuide,
      alternativeFeature,
      severity,
      affectedApiKeys,
    } = req.body;

    if (!version || !category || !title || !description) {
      throw new AppError('version, category, title, and description are required', 400, 'INVALID_INPUT');
    }

    await apiVersioningService.publishChangelogEntry({
      id: '',
      version,
      releaseDate: new Date(releaseDate || Date.now()),
      category: category as any,
      title,
      description,
      endpoint,
      field,
      migrationGuide,
      alternativeFeature,
      severity,
      affectedApiKeys,
    });

    res.status(201).json({
      message: `Changelog entry published for version ${version}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get changelog for version
 * GET /api/admin/changelog/:version
 */
router.get('/changelog/:version', async (req: Request, res: Response, next) => {
  try {
    const { limit = 50 } = req.query;
    const changelog = await apiVersioningService.getChangelog(req.params.version, parseInt(limit as string));

    res.json({
      data: changelog,
      meta: {
        version: req.params.version,
        count: changelog.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Generate compatibility report
 * POST /api/admin/compatibility-reports
 */
router.post('/compatibility-reports', async (req: Request, res: Response, next) => {
  try {
    const { sourceVersion, targetVersion } = req.body;

    if (!sourceVersion || !targetVersion) {
      throw new AppError('sourceVersion and targetVersion are required', 400, 'INVALID_INPUT');
    }

    const report = await apiVersioningService.generateCompatibilityReport(sourceVersion, targetVersion);

    res.json({
      data: report,
      meta: {
        compatible: report.compatible,
        migrationEffort: report.estimatedMigrationEffort,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Mark version as deprecated
 * PUT /api/admin/versions/:versionId/deprecate
 */
router.put('/versions/:versionId/deprecate', async (req: Request, res: Response, next) => {
  try {
    const { sunsetDate } = req.body;

    if (!sunsetDate) {
      throw new AppError('sunsetDate is required', 400, 'INVALID_INPUT');
    }

    const updated = await apiVersioningService.deprecateVersion(req.params.versionId, new Date(sunsetDate));

    res.json({
      data: updated,
      message: `Version deprecated. Sunset scheduled for ${sunsetDate}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get deprecations (active/upcoming)
 * GET /api/admin/deprecations
 */
router.get('/deprecations', async (req: Request, res: Response, next) => {
  try {
    const deprecations = await apiVersioningService.getActiveDeprecations();

    res.json({
      data: deprecations,
      meta: {
        count: deprecations.length,
        upcomingSunsets: deprecations.filter((d) => new Date(d.sunsetDate) > new Date()).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Public endpoint: List supported versions
 * GET /api/versions (no auth required)
 */
router.get('/public/versions', async (req: Request, res: Response, next) => {
  try {
    const versions = await apiVersioningService.listVersions();

    // Filter to public info only
    const publicVersions = versions.map((v) => ({
      version: v.version,
      semver: v.semver,
      releaseDate: v.releaseDate,
      status: v.status,
      sunsetDate: v.sunsetDate,
      changelogUrl: v.changelogUrl,
      migrationGuideUrl: v.migrationGuideUrl,
    }));

    res.json({
      data: publicVersions,
      meta: {
        supportedCount: publicVersions.filter((v) => v.status !== 'SUNSET').length,
        deprecatedCount: publicVersions.filter((v) => v.status === 'DEPRECATED').length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Public endpoint: Get changelog
 * GET /api/changelog (no auth required)
 */
router.get('/public/changelog', async (req: Request, res: Response, next) => {
  try {
    const { version, limit = 100, category } = req.query;

    let changelog: any[] = [];

    if (version) {
      changelog = await apiVersioningService.getChangelog(version as string, parseInt(limit as string));
    }

    if (category) {
      changelog = changelog.filter((e) => e.category === category);
    }

    res.json({
      data: changelog,
      meta: {
        version: version || 'all',
        category: category || 'all',
        count: changelog.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
