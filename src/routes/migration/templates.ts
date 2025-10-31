/**
 * Template Download API Routes for Data Migration (Issue #31)
 * Provides endpoints to download and manage data import templates
 */

import express, { Request, Response } from 'express';
import { templateGeneratorService } from '../../services/migration/TemplateGeneratorService';
import { getAvailableEntityTypes, getTemplateMetadata } from '../../services/migration/TemplateRegistry';
import { asyncHandler, ValidationError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';

const router = express.Router();

/**
 * GET /api/v1/migration/templates
 * List all available templates with metadata
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const templates = templateGeneratorService.listAllTemplates();

    logger.info('Listed all available templates', {
      count: templates.length,
    });

    res.json({
      success: true,
      data: {
        templates,
        total: templates.length,
      },
    });
  })
);

/**
 * GET /api/v1/migration/templates/:entityType/excel
 * Download Excel template for specific entity type
 */
router.get(
  '/:entityType/excel',
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType } = req.params;

    // Validate entity type
    const validTypes = getAvailableEntityTypes();
    if (!validTypes.includes(entityType as any)) {
      throw new ValidationError(
        `Invalid entity type: ${entityType}. Valid types: ${validTypes.join(', ')}`
      );
    }

    const metadata = getTemplateMetadata(entityType as any);
    if (!metadata) {
      throw new ValidationError(`Template not found for entity type: ${entityType}`);
    }

    const buffer = await templateGeneratorService.generateExcelTemplate(entityType as any);
    const filename = `${metadata.entityName.replace(/\s+/g, '_')}_import_template.xlsx`;

    logger.info(`Generated Excel template for entity: ${entityType}`, {
      entityName: metadata.entityName,
      filename,
      bufferSize: buffer.length,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

/**
 * GET /api/v1/migration/templates/:entityType/csv
 * Download CSV template for specific entity type
 */
router.get(
  '/:entityType/csv',
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType } = req.params;

    // Validate entity type
    const validTypes = getAvailableEntityTypes();
    if (!validTypes.includes(entityType as any)) {
      throw new ValidationError(
        `Invalid entity type: ${entityType}. Valid types: ${validTypes.join(', ')}`
      );
    }

    const metadata = getTemplateMetadata(entityType as any);
    if (!metadata) {
      throw new ValidationError(`Template not found for entity type: ${entityType}`);
    }

    const csv = await templateGeneratorService.generateCSVTemplate(entityType as any);
    const filename = `${metadata.entityName.replace(/\s+/g, '_')}_import_template.csv`;

    logger.info(`Generated CSV template for entity: ${entityType}`, {
      entityName: metadata.entityName,
      filename,
    });

    res.setHeader('Content-Type', 'text/csv;charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  })
);

/**
 * GET /api/v1/migration/templates/:entityType/metadata
 * Get template metadata (for preview/documentation)
 */
router.get(
  '/:entityType/metadata',
  asyncHandler(async (req: Request, res: Response) => {
    const { entityType } = req.params;

    const metadata = getTemplateMetadata(entityType as any);
    if (!metadata) {
      throw new ValidationError(`Template not found for entity type: ${entityType}`);
    }

    logger.info(`Retrieved metadata for template: ${entityType}`, {
      entityName: metadata.entityName,
      fieldCount: metadata.fields.length,
    });

    res.json({
      success: true,
      data: metadata,
    });
  })
);

/**
 * POST /api/v1/migration/templates/multi-sheet
 * Generate multi-sheet Excel for related entities
 * Body: { entities: ['PART', 'EQUIPMENT', ...] }
 */
router.post(
  '/multi-sheet',
  asyncHandler(async (req: Request, res: Response) => {
    const { entities } = req.body;

    // Validate input
    if (!Array.isArray(entities) || entities.length === 0) {
      throw new ValidationError('entities must be a non-empty array');
    }

    // Validate all entities exist
    const validTypes = getAvailableEntityTypes();
    for (const entity of entities) {
      if (!validTypes.includes(entity)) {
        throw new ValidationError(`Invalid entity type: ${entity}`);
      }
    }

    const buffer = await templateGeneratorService.generateRelatedEntityTemplate(entities as any[]);
    const filename = `multi_entity_import_template_${Date.now()}.xlsx`;

    logger.info('Generated multi-sheet template', {
      entities,
      entityCount: entities.length,
      bufferSize: buffer.length,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  })
);

/**
 * GET /api/v1/migration/templates/download-all
 * Download all templates as ZIP
 */
router.get(
  '/download-all',
  asyncHandler(async (req: Request, res: Response) => {
    const stream = await templateGeneratorService.generateAllTemplates();
    const filename = `all_templates_${Date.now()}.zip`;

    logger.info('Generated ZIP with all templates', {
      filename,
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    stream.pipe(res);
  })
);

export default router;
