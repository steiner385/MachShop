/**
 * Extension Compatibility Matrix API Routes
 * Provides REST endpoints for querying and managing extension compatibility
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ExtensionCompatibilityMatrixService } from '../../services/ExtensionCompatibilityMatrixService';
import { CompatibilityContext, CompatibilityError } from '../../types/extensionCompatibility';

export function createCompatibilityRouter(
  service: ExtensionCompatibilityMatrixService
): Router {
  const router = Router();

  /**
   * GET /api/extensions/compatibility
   * Query the compatibility matrix for an extension
   * Query params:
   *   - extensionId: string (required)
   *   - version: string (required)
   *   - mesVersion: string (required)
   */
  router.get(
    '/compatibility',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { extensionId, version, mesVersion } = req.query;

        if (!extensionId || !version || !mesVersion) {
          return res.status(400).json({
            error: 'Missing required parameters: extensionId, version, mesVersion',
          });
        }

        const context: CompatibilityContext = {
          mesVersion: mesVersion as string,
          installedExtensions: req.body.installedExtensions || [],
          platformCapabilities: req.body.platformCapabilities || [],
        };

        const result = await service.checkCompatibility(
          extensionId as string,
          version as string,
          context
        );

        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/extensions/compatibility/check
   * Check compatibility for installing multiple extensions
   * Request body:
   *   - extensionsToInstall: Array<{extensionId, version}>
   *   - mesVersion: string
   *   - platformCapabilities: string[] (optional)
   *   - installedExtensions: InstalledExtensionInfo[] (optional)
   */
  router.post(
    '/compatibility/check',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { extensionsToInstall, mesVersion, platformCapabilities, installedExtensions } = req.body;

        if (!extensionsToInstall || !Array.isArray(extensionsToInstall)) {
          return res.status(400).json({
            error: 'extensionsToInstall must be an array of {extensionId, version} objects',
          });
        }

        if (!mesVersion) {
          return res.status(400).json({
            error: 'mesVersion is required',
          });
        }

        const context: CompatibilityContext = {
          mesVersion,
          installedExtensions: installedExtensions || [],
          platformCapabilities: platformCapabilities || [],
        };

        const result = await service.checkInstallationCompatibility(
          extensionsToInstall,
          context
        );

        res.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * GET /api/extensions/:extensionId/compatibility
   * Get compatibility matrix for a specific extension across all versions
   */
  router.get(
    '/:extensionId/compatibility',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { extensionId } = req.params;

        // This would be implemented with a database query
        // to get all compatibility records for an extension
        res.json({
          extensionId,
          message: 'Endpoint for querying all compatibility records for an extension',
          // TODO: Implement database query to fetch all compatibility records
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/extensions/:extensionId/compatibility/test
   * Run compatibility tests for an extension version
   * Request body:
   *   - version: string
   *   - testSuite: CompatibilityTestSuite
   */
  router.post(
    '/:extensionId/compatibility/test',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { extensionId } = req.params;
        const { version, testSuite } = req.body;

        if (!version) {
          return res.status(400).json({
            error: 'version is required',
          });
        }

        // This would be implemented with actual test execution
        res.json({
          extensionId,
          version,
          message: 'Compatibility test execution endpoint',
          // TODO: Implement test execution logic
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * PUT /api/extensions/:extensionId/compatibility
   * Update compatibility matrix record for an extension
   * Request body: ExtensionCompatibilityRecord
   */
  router.put(
    '/:extensionId/compatibility',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { extensionId } = req.params;
        const record = { ...req.body, extensionId };

        if (!record.extensionVersion) {
          return res.status(400).json({
            error: 'extensionVersion is required',
          });
        }

        if (!record.mesVersionMin) {
          return res.status(400).json({
            error: 'mesVersionMin is required',
          });
        }

        await service.updateCompatibilityRecord(record);

        res.json({
          success: true,
          extensionId,
          message: `Updated compatibility record for ${extensionId}@${record.extensionVersion}`,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * POST /api/extensions/compatibility/matrix
   * Bulk update compatibility matrix records
   * Request body: Array<ExtensionCompatibilityRecord>
   */
  router.post(
    '/compatibility/matrix',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const records = req.body;

        if (!Array.isArray(records)) {
          return res.status(400).json({
            error: 'Request body must be an array of compatibility records',
          });
        }

        const results = [];
        const errors = [];

        for (const record of records) {
          try {
            await service.updateCompatibilityRecord(record);
            results.push({
              success: true,
              extensionId: record.extensionId,
              version: record.extensionVersion,
            });
          } catch (error) {
            errors.push({
              success: false,
              extensionId: record.extensionId,
              version: record.extensionVersion,
              error: (error as Error).message,
            });
          }
        }

        res.json({
          successful: results.length,
          failed: errors.length,
          results,
          errors: errors.length > 0 ? errors : undefined,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  /**
   * Error handling middleware for compatibility routes
   */
  router.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof CompatibilityError) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        conflicts: error.conflicts,
        suggestions: error.suggestions,
      });
    }

    // Generic error handling
    res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  });

  return router;
}
