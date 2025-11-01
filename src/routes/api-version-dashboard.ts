/**
 * API Version Developer Dashboard
 * Provides real-time version usage stats, deprecation warnings, and migration tracking
 * Accessible via developer portal with API key authentication
 */

import { Router, Request, Response } from 'express';
import { apiVersioningService } from '../services/ApiVersioningService';
import { compatibilityTestingService } from '../services/CompatibilityTestingService';
import { AppError } from '../middleware/errorHandler';
import { VersionedRequest } from '../types/versioning';

const router = Router();

/**
 * Dashboard Overview
 * GET /api/dashboard/versions
 * Shows real-time stats for all API versions
 */
router.get('/versions', async (req: Request, res: Response, next) => {
  try {
    const versions = await apiVersioningService.listVersions();

    const overview = await Promise.all(
      versions.map(async (v) => {
        const stats = await apiVersioningService.getVersionAdoptionStats(v.id);
        const deprecations = await apiVersioningService.getActiveDeprecations();
        const relevantDeprecations = deprecations.filter((d) => {
          const versionObj = versions.find((ver) => ver.id === d.id);
          return versionObj?.version === v.version;
        });

        return {
          version: v.version,
          semver: v.semver,
          status: v.status,
          releaseDate: v.releaseDate,
          sunsetDate: v.sunsetDate,
          stats: {
            totalApiKeys: stats.totalApiKeys,
            totalRequests: stats.totalRequests,
            successRate: stats.successRate,
            lastUsedAt: stats.lastUsedAt,
          },
          deprecations: {
            count: relevantDeprecations.length,
            sunsetDate: relevantDeprecations[0]?.sunsetDate,
            daysUntilSunset:
              relevantDeprecations.length > 0
                ? Math.ceil(
                    (new Date(relevantDeprecations[0].sunsetDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  )
                : null,
          },
          isDeprecated: v.status === 'DEPRECATED',
          migrationUrl: v.migrationGuideUrl,
        };
      }),
    );

    res.json({
      data: {
        timestamp: new Date().toISOString(),
        versions: overview,
      },
      meta: {
        totalVersions: overview.length,
        currentVersions: overview.filter((v) => v.status === 'CURRENT').length,
        deprecatedVersions: overview.filter((v) => v.isDeprecated).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * API Key Version Usage
 * GET /api/dashboard/api-keys/:keyId/usage
 * Shows which API version(s) this key is using
 */
router.get('/api-keys/:keyId/usage', async (req: Request, res: Response, next) => {
  try {
    const { keyId } = req.params;
    const { days = 30 } = req.query;

    // Get usage data for this API key
    const allVersions = await apiVersioningService.listVersions();
    const usageByVersion = await Promise.all(
      allVersions.map(async (v) => {
        // In production, would query actual usage logs for this key
        // For now, return structure
        return {
          version: v.version,
          requestCount: 0, // Would aggregate from capturedApiCall table
          lastUsedAt: null,
          errorRate: 0,
        };
      }),
    );

    const activeVersions = usageByVersion.filter((u) => u.requestCount > 0);
    const deprecatedVersionsInUse = activeVersions.filter((u) => {
      const version = allVersions.find((v) => v.version === u.version);
      return version?.status === 'DEPRECATED';
    });

    res.json({
      data: {
        apiKeyId: keyId,
        timeframe: `last ${days} days`,
        usageByVersion,
        activeVersions: activeVersions.length,
        deprecatedVersionsInUse: deprecatedVersionsInUse.length,
        warnings: this.generateWarnings(deprecatedVersionsInUse, allVersions),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Migration Status
 * GET /api/dashboard/migration-status
 * Shows migration progress from current to target version
 */
router.get('/migration-status', async (req: Request, res: Response, next) => {
  try {
    const { sourceVersion = 'v1', targetVersion = 'v2' } = req.query;

    const report = await compatibilityTestingService.generateDetailedReport(
      sourceVersion as string,
      targetVersion as string,
    );

    res.json({
      data: {
        source: sourceVersion,
        target: targetVersion,
        compatible: report.compatible,
        riskLevel: report.riskAssessment.level,
        riskFactors: report.riskAssessment.factors,
        recommendation: report.riskAssessment.recommendation,
        breakingChanges: {
          count: report.breakingChanges.length,
          items: report.breakingChanges.map((bc) => ({
            type: bc.changeType,
            endpoint: bc.endpoint,
            field: bc.field,
            description: bc.description,
            migrationGuide: bc.migrationGuideUrl,
          })),
        },
        deprecations: {
          count: report.deprecatedFeatures.length,
          items: report.deprecatedFeatures.map((d) => ({
            feature: d.feature,
            sunsetDate: d.sunsetDate,
            replacement: d.replacement,
            severity: d.severity,
          })),
        },
        testResults: {
          testedRequests: report.testResults.testedRequests,
          successfulTests: report.testResults.successfulTests,
          failedTests: report.testResults.failedTests,
          successRate:
            report.testResults.testedRequests > 0
              ? ((report.testResults.successfulTests / report.testResults.testedRequests) * 100).toFixed(1) + '%'
              : 'N/A',
        },
        estimatedEffort: report.estimatedMigrationEffort,
        nextSteps: report.nextSteps,
        adoptionStats: {
          totalApiKeys: report.adoptionStats.totalApiKeys,
          totalRequests: report.adoptionStats.totalRequests,
          weeklyGrowth: report.adoptionStats.weeklyGrowth,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Deprecation Warnings
 * GET /api/dashboard/warnings
 * Shows all active deprecation warnings affecting this API key
 */
router.get('/warnings', async (req: Request, res: Response, next) => {
  try {
    const deprecations = await apiVersioningService.getActiveDeprecations();

    const warnings = deprecations
      .map((d) => {
        const daysUntilSunset = Math.ceil(
          (new Date(d.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        const urgency =
          daysUntilSunset <= 30 ? 'critical' : daysUntilSunset <= 90 ? 'high' : 'medium';

        return {
          id: d.id,
          feature: d.feature,
          severity: d.severity,
          urgency,
          deprecatedAt: d.deprecatedAt,
          sunsetDate: d.sunsetDate,
          daysUntilSunset,
          description: d.description,
          replacement: d.replacement,
          migrationGuide: d.migrationGuideUrl,
          affectedAccounts: d.affectedAccounts,
        };
      })
      .sort((a, b) => a.daysUntilSunset - b.daysUntilSunset);

    const urgentWarnings = warnings.filter((w) => w.urgency === 'critical');

    res.json({
      data: warnings,
      meta: {
        totalWarnings: warnings.length,
        urgentWarnings: urgentWarnings.length,
        nextSunset: warnings.length > 0 ? warnings[0].sunsetDate : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Compatibility Test Results
 * GET /api/dashboard/compatibility-tests
 * Shows detailed compatibility test results
 */
router.get('/compatibility-tests', async (req: Request, res: Response, next) => {
  try {
    const { sourceVersion = 'v1', targetVersion = 'v2' } = req.query;

    const testResults = await compatibilityTestingService.testVersionCompatibility(
      sourceVersion as string,
      targetVersion as string,
      200,
    );

    res.json({
      data: {
        source: sourceVersion,
        target: targetVersion,
        compatible: testResults.compatible,
        stats: {
          totalRequests: testResults.testedRequests,
          successful: testResults.successfulTests,
          failed: testResults.failedTests,
          successRate:
            testResults.testedRequests > 0
              ? ((testResults.successfulTests / testResults.testedRequests) * 100).toFixed(1) + '%'
              : 'N/A',
        },
        issues: testResults.issues.map((issue) => ({
          type: issue.type,
          severity: issue.severity,
          endpoint: issue.endpoint,
          message: issue.message,
          affectedEndpoints: issue.affectedEndpoints,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Version Info Card
 * GET /api/dashboard/versions/:version
 * Detailed info about a specific version
 */
router.get('/versions/:version', async (req: Request, res: Response, next) => {
  try {
    const version = await apiVersioningService.getVersion(req.params.version);

    if (!version) {
      throw new AppError(`Version ${req.params.version} not found`, 404, 'VERSION_NOT_FOUND');
    }

    const stats = await apiVersioningService.getVersionAdoptionStats(version.id);
    const changelog = await apiVersioningService.getChangelog(version.version, 10);

    const daysUntilSunset =
      version.sunsetDate ? Math.ceil((version.sunsetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    res.json({
      data: {
        version: version.version,
        semver: version.semver,
        releaseDate: version.releaseDate,
        status: version.status,
        timeline: {
          releaseDate: version.releaseDate,
          maintenanceUntil: version.maintenanceUntil,
          deprecatedAt: version.deprecatedAt,
          sunsetDate: version.sunsetDate,
          daysUntilSunset,
        },
        adoption: {
          apiKeys: stats.totalApiKeys,
          requests: stats.totalRequests,
          successRate: stats.successRate,
          lastUsedAt: stats.lastUsedAt,
        },
        documentation: {
          changelog: version.changelogUrl,
          migration: version.migrationGuideUrl,
          api: version.documentationUrl,
        },
        recentChanges: changelog.slice(0, 5).map((entry) => ({
          title: entry.title,
          category: entry.category,
          description: entry.description,
          releaseDate: entry.releaseDate,
        })),
        breakingChanges: version.breakingChanges?.length || 0,
        deprecations: version.deprecations?.length || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Changelog Feed
 * GET /api/dashboard/changelog
 * Recent changes across all versions
 */
router.get('/changelog', async (req: Request, res: Response, next) => {
  try {
    const { limit = 50, version } = req.query;

    let changelog: any[] = [];

    if (version) {
      changelog = await apiVersioningService.getChangelog(version as string, parseInt(limit as string));
    } else {
      // Get changelog for all recent versions
      const versions = await apiVersioningService.listVersions();
      for (const v of versions.slice(0, 3)) {
        const entries = await apiVersioningService.getChangelog(v.version, 10);
        changelog.push(...entries);
      }
      changelog = changelog.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());
    }

    res.json({
      data: changelog.slice(0, parseInt(limit as string)),
      meta: {
        totalEntries: changelog.length,
        versions: [...new Set(changelog.map((c) => c.version))],
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Quick Stats
 * GET /api/dashboard/stats
 * Quick overview of all important metrics
 */
router.get('/stats', async (req: Request, res: Response, next) => {
  try {
    const versions = await apiVersioningService.listVersions();
    const deprecations = await apiVersioningService.getActiveDeprecations();

    const stats = {
      timestamp: new Date().toISOString(),
      versions: {
        total: versions.length,
        current: versions.filter((v) => v.status === 'CURRENT').length,
        maintenance: versions.filter((v) => v.status === 'MAINTENANCE').length,
        deprecated: versions.filter((v) => v.status === 'DEPRECATED').length,
        sunset: versions.filter((v) => v.status === 'SUNSET').length,
      },
      deprecations: {
        active: deprecations.length,
        criticalSoon: deprecations.filter(
          (d) => (new Date(d.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30,
        ).length,
        nextSunset: deprecations.length > 0 ? deprecations[0].sunsetDate : null,
      },
      adoption: {
        mostUsedVersion: versions[0]?.version,
        leastUsedVersion: versions[versions.length - 1]?.version,
      },
    };

    res.json({
      data: stats,
    });
  } catch (error) {
    next(error);
  }
});

// Helper to generate warnings
function generateWarnings(deprecatedVersionsInUse: any[], allVersions: any[]): string[] {
  const warnings: string[] = [];

  if (deprecatedVersionsInUse.length > 0) {
    warnings.push(`⚠️ Using ${deprecatedVersionsInUse.length} deprecated API version(s)`);

    deprecatedVersionsInUse.forEach((version) => {
      const versionInfo = allVersions.find((v) => v.version === version.version);
      if (versionInfo?.sunsetDate) {
        const daysUntil = Math.ceil((new Date(versionInfo.sunsetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        warnings.push(`Version ${version.version} sunsets in ${daysUntil} days`);
      }
    });
  }

  return warnings;
}

export default router;
